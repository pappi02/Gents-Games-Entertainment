-- Event ticketing: posters, ticket types, discount codes, orders, signed tickets.
-- See docs/EVENT_TICKETING.md for the full design and threat model.
--
-- The rules that protect money and entry live here rather than in app code, so
-- no app bug or simultaneous request can get around them:
--   * reservations lock the ticket type, so tickets and code uses can't oversell;
--   * tickets are only ever created by confirm_ticket_payment (no table INSERT
--     grant for any role), and a repeated confirmation creates nothing new;
--   * check-in is a single locked transition, so only the first scan admits;
--   * the fields covered by a ticket's signature can't be changed once written.
--
-- Orders and tickets are never exposed to anon. Public writes go through the
-- server, which calls SECURITY DEFINER functions as service_role.

-- ============================================================================
-- 1. events: poster, location, cancellation
-- ============================================================================

alter table public.events
    add column poster_path text,
    add column poster_alt text,
    add column location_note text,
    add column cancelled_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-media', 'event-media', true, 5242880, array['image/webp'])
on conflict (id) do nothing;

create policy event_media_bucket_public_read on storage.objects
    for select using (bucket_id = 'event-media');
create policy event_media_bucket_admin_write on storage.objects
    for insert with check (
        bucket_id = 'event-media'
        and public.current_admin_role() in ('super_admin', 'content_editor')
    );
create policy event_media_bucket_admin_update on storage.objects
    for update using (
        bucket_id = 'event-media'
        and public.current_admin_role() in ('super_admin', 'content_editor')
    );
create policy event_media_bucket_admin_delete on storage.objects
    for delete using (
        bucket_id = 'event-media'
        and public.current_admin_role() in ('super_admin', 'content_editor')
    );

-- ============================================================================
-- 2. ticket_types. One per event in the UI today; the schema already allows
--    several, so real tiers can be added later without a data migration.
-- ============================================================================

create table public.ticket_types (
    id uuid primary key default gen_random_uuid(),
    event_id uuid not null references public.events (id) on delete restrict,
    name text not null check (length(name) between 1 and 80),
    description text,
    price_minor_units bigint not null check (price_minor_units >= 1000),
    currency text not null default 'KES' check (currency = 'KES'),
    quantity_total integer not null check (quantity_total > 0),
    max_per_order integer not null default 10 check (max_per_order between 1 and 50),
    sales_status text not null default 'closed' check (sales_status in ('closed', 'on_sale')),
    sales_start_at timestamptz,
    sales_end_at timestamptz,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (event_id, name),
    check (sales_end_at is null or sales_start_at is null or sales_end_at > sales_start_at)
);

create trigger set_updated_at before update on public.ticket_types
    for each row execute function public.set_updated_at();

-- ============================================================================
-- 3. discount_codes
-- ============================================================================

create table public.discount_codes (
    id uuid primary key default gen_random_uuid(),
    code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,32}$'),
    kind text not null check (kind in ('percent', 'fixed')),
    -- percent: whole percent 1-99. fixed: minor units off the order total.
    amount integer not null check (amount > 0),
    event_id uuid references public.events (id) on delete restrict,
    starts_at timestamptz,
    ends_at timestamptz,
    max_uses integer check (max_uses is null or max_uses > 0),
    is_active boolean not null default true,
    note text,
    created_by uuid references public.admin_profiles (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (kind <> 'percent' or amount between 1 and 99),
    check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create trigger set_updated_at before update on public.discount_codes
    for each row execute function public.set_updated_at();

-- ============================================================================
-- 4. ticket_orders
-- ============================================================================

create table public.ticket_orders (
    id uuid primary key default gen_random_uuid(),
    reference text not null unique,
    event_id uuid not null references public.events (id) on delete restrict,
    ticket_type_id uuid not null references public.ticket_types (id) on delete restrict,
    quantity integer not null check (quantity > 0),
    -- Any name the buyer chooses; it is a label, never verified.
    buyer_name text not null check (length(buyer_name) between 1 and 80),
    buyer_email text not null check (length(buyer_email) between 3 and 254),
    unit_price_minor_units bigint not null check (unit_price_minor_units >= 0),
    subtotal_minor_units bigint not null check (subtotal_minor_units >= 0),
    discount_minor_units bigint not null default 0 check (discount_minor_units >= 0),
    total_minor_units bigint not null check (total_minor_units > 0),
    currency text not null default 'KES',
    discount_code_id uuid references public.discount_codes (id) on delete restrict,
    discount_code text,
    status text not null default 'pending'
        check (status in ('pending', 'paid', 'cancelled', 'needs_review', 'refunded')),
    review_reason text,
    hold_expires_at timestamptz not null,
    provider_transaction_id text,
    amount_paid_minor_units bigint,
    paid_at timestamptz,
    email_sent_at timestamptz,
    email_error text,
    refunded_at timestamptz,
    refund_note text,
    ip_hash text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (subtotal_minor_units - discount_minor_units = total_minor_units)
);

create index ticket_orders_event_idx on public.ticket_orders (event_id, status, created_at desc);
create index ticket_orders_type_status_idx on public.ticket_orders (ticket_type_id, status);
create index ticket_orders_discount_idx on public.ticket_orders (discount_code_id, status);

create trigger set_updated_at before update on public.ticket_orders
    for each row execute function public.set_updated_at();

-- ============================================================================
-- 5. tickets
-- ============================================================================

create table public.tickets (
    id uuid primary key default gen_random_uuid(),
    -- System-generated, random, never sequential, never reused.
    ticket_code text not null unique check (ticket_code ~ '^GG-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$'),
    order_id uuid not null references public.ticket_orders (id) on delete restrict,
    event_id uuid not null references public.events (id) on delete restrict,
    ticket_type_id uuid not null references public.ticket_types (id) on delete restrict,
    holder_name text not null,
    issued_at timestamptz not null default now(),
    status text not null default 'valid' check (status in ('valid', 'used', 'cancelled')),
    checked_in_at timestamptz,
    checked_in_by uuid references public.admin_profiles (id),
    checked_in_method text check (checked_in_method in ('scan', 'typed')),
    cancelled_at timestamptz,
    cancel_reason text,
    replaced_by uuid references public.tickets (id),
    created_at timestamptz not null default now()
);

create index tickets_order_idx on public.tickets (order_id);
create index tickets_event_status_idx on public.tickets (event_id, status);

-- ============================================================================
-- 6. Support tables: one-time download codes, rate limits, access log
-- ============================================================================

create table public.ticket_access_codes (
    order_id uuid primary key references public.ticket_orders (id) on delete cascade,
    code_hash text not null,
    expires_at timestamptz not null,
    attempts integer not null default 0
);

create table public.ticket_rate_limits (
    key text primary key,
    window_ends_at timestamptz not null,
    hits integer not null
);

create table public.ticket_access_log (
    id uuid primary key default gen_random_uuid(),
    order_id uuid references public.ticket_orders (id) on delete cascade,
    ticket_id uuid references public.tickets (id) on delete cascade,
    action text not null,
    actor_id uuid references public.admin_profiles (id),
    ip_hash text,
    detail text,
    created_at timestamptz not null default now()
);

create index ticket_access_log_order_idx on public.ticket_access_log (order_id, created_at desc);

-- ============================================================================
-- 7. Immutability guards
-- ============================================================================

create or replace function public.guard_ticket_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if tg_op = 'DELETE' then
        raise exception 'Tickets cannot be deleted.';
    end if;
    if new.ticket_code is distinct from old.ticket_code
        or new.order_id is distinct from old.order_id
        or new.event_id is distinct from old.event_id
        or new.ticket_type_id is distinct from old.ticket_type_id
        or new.holder_name is distinct from old.holder_name
        or new.issued_at is distinct from old.issued_at then
        raise exception 'Signed ticket fields cannot be changed.';
    end if;
    if old.status <> 'valid' and new.status is distinct from old.status then
        raise exception 'A used or cancelled ticket cannot change status.';
    end if;
    return new;
end;
$$;

create trigger guard_ticket_immutable before update or delete on public.tickets
    for each row execute function public.guard_ticket_immutable();

create or replace function public.guard_order_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if new.event_id is distinct from old.event_id
        or new.ticket_type_id is distinct from old.ticket_type_id
        or new.quantity is distinct from old.quantity
        or new.buyer_name is distinct from old.buyer_name
        or new.unit_price_minor_units is distinct from old.unit_price_minor_units
        or new.subtotal_minor_units is distinct from old.subtotal_minor_units
        or new.discount_minor_units is distinct from old.discount_minor_units
        or new.total_minor_units is distinct from old.total_minor_units
        or new.discount_code_id is distinct from old.discount_code_id
        or new.reference is distinct from old.reference then
        raise exception 'Order amounts and details cannot be changed.';
    end if;
    return new;
end;
$$;

create trigger guard_order_immutable before update on public.ticket_orders
    for each row execute function public.guard_order_immutable();

-- ============================================================================
-- 8. Internal helpers
-- ============================================================================

-- Tickets paid for, plus those inside an unexpired checkout hold. Holds expire
-- by time alone, so no background job is needed to release them.
create or replace function public.ticket_units_taken(p_ticket_type_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
    select coalesce(sum(quantity), 0)::integer
    from public.ticket_orders
    where ticket_type_id = p_ticket_type_id
      and (status = 'paid' or (status = 'pending' and hold_expires_at > now()));
$$;

create or replace function public.discount_uses_taken(p_code_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
    select count(*)::integer
    from public.ticket_orders
    where discount_code_id = p_code_id
      and (status = 'paid' or (status = 'pending' and hold_expires_at > now()));
$$;

-- 60 random bits from gen_random_uuid(), skipping the UUID's fixed version and
-- variant bytes, in Crockford base32 (no I, L, O or U, so a code can be typed).
create or replace function public.new_ticket_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
    v_alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    v_positions constant int[] := array[0, 1, 2, 3, 4, 5, 7, 9, 10, 11, 12, 13];
    v_bytes bytea;
    v_chars text;
    v_code text;
    v_position int;
begin
    loop
        v_bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
        v_chars := '';
        foreach v_position in array v_positions loop
            v_chars := v_chars || substr(v_alphabet, (get_byte(v_bytes, v_position) % 32) + 1, 1);
        end loop;
        v_code := 'GG-' || substr(v_chars, 1, 4) || '-' || substr(v_chars, 5, 4) || '-' || substr(v_chars, 9, 4);
        exit when not exists (select 1 from public.tickets where ticket_code = v_code);
    end loop;
    return v_code;
end;
$$;

-- Same reason for every failure, so a guesser can't tell whether a code exists.
create or replace function public.evaluate_discount(
    p_code text,
    p_event_id uuid,
    p_subtotal bigint,
    p_lock boolean,
    out discount_code_id uuid,
    out normalized_code text,
    out discount_minor_units bigint,
    out error text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_generic constant text := 'That code isn''t valid for this order.';
    v_minimum_charge constant bigint := 1000;
    v_row public.discount_codes;
    v_amount bigint;
begin
    discount_minor_units := 0;
    normalized_code := upper(trim(coalesce(p_code, '')));
    if normalized_code = '' then
        normalized_code := null;
        return;
    end if;

    if p_lock then
        select * into v_row from public.discount_codes c where c.code = normalized_code for update;
    else
        select * into v_row from public.discount_codes c where c.code = normalized_code;
    end if;

    if not found
        or not v_row.is_active
        or (v_row.event_id is not null and v_row.event_id <> p_event_id)
        or (v_row.starts_at is not null and v_row.starts_at > now())
        or (v_row.ends_at is not null and v_row.ends_at <= now())
        or (v_row.max_uses is not null and public.discount_uses_taken(v_row.id) >= v_row.max_uses) then
        error := v_generic;
        return;
    end if;

    if v_row.kind = 'percent' then
        v_amount := (p_subtotal * v_row.amount) / 100; -- integer division, rounds in the buyer's disfavour by under a cent
    else
        v_amount := v_row.amount;
    end if;

    -- A code can't reduce an order to free or below what the provider can charge.
    if p_subtotal - v_amount < v_minimum_charge then
        error := v_generic;
        return;
    end if;

    discount_code_id := v_row.id;
    discount_minor_units := v_amount;
end;
$$;

create or replace function public.ticket_sale_state(
    p_type public.ticket_types,
    p_event public.events
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_paid integer;
begin
    if p_event.publication_status <> 'published' then return 'closed'; end if;
    if p_event.cancelled_at is not null then return 'cancelled'; end if;
    if now() >= coalesce(p_event.end_at, p_event.start_at) then return 'ended'; end if;
    if p_type.sales_status <> 'on_sale' then return 'closed'; end if;
    if p_type.sales_start_at is not null and now() < p_type.sales_start_at then return 'not_started'; end if;
    if p_type.sales_end_at is not null and now() >= p_type.sales_end_at then return 'sales_ended'; end if;
    if public.ticket_units_taken(p_type.id) >= p_type.quantity_total then
        select coalesce(sum(quantity), 0)::integer into v_paid
        from public.ticket_orders
        where ticket_type_id = p_type.id and status = 'paid';
        return case when v_paid >= p_type.quantity_total then 'sold_out' else 'all_held' end;
    end if;
    return 'on_sale';
end;
$$;

-- ============================================================================
-- 9. Public availability (safe for anon: no counts beyond the buyable maximum)
-- ============================================================================

create or replace function public.ticket_availability(p_event_id uuid default null)
returns table (
    event_id uuid,
    ticket_type_id uuid,
    name text,
    description text,
    price_minor_units bigint,
    currency text,
    state text,
    can_buy integer
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        e.id,
        t.id,
        t.name,
        t.description,
        t.price_minor_units,
        t.currency,
        public.ticket_sale_state(t, e),
        case when public.ticket_sale_state(t, e) = 'on_sale'
            then least(t.max_per_order, t.quantity_total - public.ticket_units_taken(t.id))
            else 0
        end
    from public.ticket_types t
    join public.events e on e.id = t.event_id
    where e.publication_status = 'published'
      and (p_event_id is null or e.id = p_event_id)
    order by t.sort_order, t.created_at;
$$;

-- ============================================================================
-- 10. Quote and reserve
-- ============================================================================

create or replace function public.quote_ticket_order(
    p_ticket_type_id uuid,
    p_quantity integer,
    p_code text
)
returns table (
    error text,
    unit_price_minor_units bigint,
    subtotal_minor_units bigint,
    discount_minor_units bigint,
    total_minor_units bigint,
    currency text,
    discount_code text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_type public.ticket_types;
    v_discount record;
    v_subtotal bigint;
begin
    select * into v_type from public.ticket_types t where t.id = p_ticket_type_id;
    if not found or p_quantity is null or p_quantity < 1 or p_quantity > v_type.max_per_order then
        return query select 'Please choose a valid number of tickets.'::text, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 'KES'::text, null::text;
        return;
    end if;

    v_subtotal := v_type.price_minor_units * p_quantity;
    select * into v_discount from public.evaluate_discount(p_code, v_type.event_id, v_subtotal, false);

    return query select
        v_discount.error,
        v_type.price_minor_units,
        v_subtotal,
        coalesce(v_discount.discount_minor_units, 0),
        v_subtotal - coalesce(v_discount.discount_minor_units, 0),
        v_type.currency,
        case when v_discount.discount_code_id is null then null else v_discount.normalized_code end;
end;
$$;

create or replace function public.reserve_ticket_order(
    p_ticket_type_id uuid,
    p_quantity integer,
    p_buyer_name text,
    p_buyer_email text,
    p_code text,
    p_ip_hash text,
    p_hold_minutes integer default 15
)
returns table (
    order_id uuid,
    reference text,
    total_minor_units bigint,
    currency text,
    error text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_type public.ticket_types;
    v_event public.events;
    v_state text;
    v_discount record;
    v_subtotal bigint;
    v_order public.ticket_orders;
begin
    -- The ticket type lock serialises every reservation for it. Lock order is
    -- always type, then discount code, so two checkouts can't deadlock.
    select * into v_type from public.ticket_types t where t.id = p_ticket_type_id for update;
    if not found then
        return query select null::uuid, null::text, null::bigint, null::text, 'These tickets aren''t available.'::text;
        return;
    end if;
    select * into v_event from public.events e where e.id = v_type.event_id;

    v_state := public.ticket_sale_state(v_type, v_event);
    if v_state <> 'on_sale' then
        return query select null::uuid, null::text, null::bigint, null::text,
            case v_state
                when 'sold_out' then 'Sorry, this event has just sold out.'
                when 'all_held' then 'All remaining tickets are being held by other buyers. Please try again in a few minutes.'
                else 'Tickets aren''t on sale for this event right now.'
            end::text;
        return;
    end if;

    if p_quantity is null or p_quantity < 1 or p_quantity > v_type.max_per_order then
        return query select null::uuid, null::text, null::bigint, null::text, 'Please choose a valid number of tickets.'::text;
        return;
    end if;
    if public.ticket_units_taken(v_type.id) + p_quantity > v_type.quantity_total then
        return query select null::uuid, null::text, null::bigint, null::text, 'There aren''t enough tickets left for that quantity.'::text;
        return;
    end if;

    v_subtotal := v_type.price_minor_units * p_quantity;
    select * into v_discount from public.evaluate_discount(p_code, v_type.event_id, v_subtotal, true);
    if v_discount.error is not null then
        return query select null::uuid, null::text, null::bigint, null::text, v_discount.error;
        return;
    end if;

    insert into public.ticket_orders (
        reference, event_id, ticket_type_id, quantity, buyer_name, buyer_email,
        unit_price_minor_units, subtotal_minor_units, discount_minor_units, total_minor_units,
        currency, discount_code_id, discount_code, hold_expires_at, ip_hash
    ) values (
        'GGO-' || replace(gen_random_uuid()::text, '-', ''),
        v_type.event_id, v_type.id, p_quantity, p_buyer_name, lower(p_buyer_email),
        v_type.price_minor_units, v_subtotal, v_discount.discount_minor_units,
        v_subtotal - v_discount.discount_minor_units,
        v_type.currency, v_discount.discount_code_id,
        case when v_discount.discount_code_id is null then null else v_discount.normalized_code end,
        now() + make_interval(mins => p_hold_minutes), p_ip_hash
    )
    returning * into v_order;

    return query select v_order.id, v_order.reference, v_order.total_minor_units, v_order.currency, null::text;
end;
$$;

-- Releases a hold when the payment page couldn't be created.
create or replace function public.release_ticket_order(p_order_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
    update public.ticket_orders set status = 'cancelled'
    where id = p_order_id and status = 'pending';
$$;

-- ============================================================================
-- 11. Payment confirmation: the only way tickets are ever created
-- ============================================================================

create or replace function public.confirm_ticket_payment(
    p_reference text,
    p_amount_minor_units bigint,
    p_currency text,
    p_provider_transaction_id text
)
returns table (order_id uuid, outcome text)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_order public.ticket_orders;
    v_type public.ticket_types;
    v_event public.events;
    v_reason text;
    v_taken integer;
begin
    select * into v_order from public.ticket_orders o where o.reference = p_reference for update;
    if not found then
        return query select null::uuid, 'not_found'::text;
        return;
    end if;

    -- A repeated confirmation changes nothing and creates no extra tickets.
    if v_order.status = 'paid' then
        return query select v_order.id, 'already_paid'::text;
        return;
    end if;
    if v_order.status = 'needs_review' then
        return query select v_order.id, 'review'::text;
        return;
    end if;
    if v_order.status = 'refunded' then
        return query select v_order.id, 'refunded'::text;
        return;
    end if;

    select * into v_type from public.ticket_types t where t.id = v_order.ticket_type_id for update;
    select * into v_event from public.events e where e.id = v_order.event_id;

    if p_amount_minor_units is distinct from v_order.total_minor_units
        or p_currency is distinct from v_order.currency then
        v_reason := 'Amount paid does not match the order total.';
    elsif v_order.status = 'cancelled' then
        v_reason := 'Payment arrived for a cancelled order.';
    elsif v_event.cancelled_at is not null then
        v_reason := 'Payment arrived after the event was cancelled.';
    elsif v_order.hold_expires_at <= now() then
        -- The hold lapsed, so this order is not in ticket_units_taken.
        v_taken := public.ticket_units_taken(v_type.id);
        if v_taken + v_order.quantity > v_type.quantity_total then
            v_reason := 'Payment arrived after the hold expired and no tickets were left.';
        end if;
    end if;

    if v_reason is not null then
        update public.ticket_orders
        set status = 'needs_review',
            review_reason = v_reason,
            provider_transaction_id = p_provider_transaction_id,
            amount_paid_minor_units = p_amount_minor_units,
            paid_at = now()
        where id = v_order.id;
        insert into public.audit_logs (action, entity_type, entity_id, summary)
        values ('ticket_order.needs_review', 'ticket_order', v_order.id, v_reason);
        return query select v_order.id, 'review'::text;
        return;
    end if;

    update public.ticket_orders
    set status = 'paid',
        provider_transaction_id = p_provider_transaction_id,
        amount_paid_minor_units = p_amount_minor_units,
        paid_at = now()
    where id = v_order.id;

    insert into public.tickets (ticket_code, order_id, event_id, ticket_type_id, holder_name)
    select public.new_ticket_code(), v_order.id, v_order.event_id, v_order.ticket_type_id, v_order.buyer_name
    from generate_series(1, v_order.quantity);

    insert into public.audit_logs (action, entity_type, entity_id, summary)
    values ('ticket_order.paid', 'ticket_order', v_order.id,
            v_order.quantity || ' ticket(s) issued for ' || v_order.reference);

    return query select v_order.id, 'issued'::text;
end;
$$;

-- ============================================================================
-- 12. Download access codes, email status, rate limits, access log
-- ============================================================================

create or replace function public.set_ticket_access_code(p_order_id uuid, p_code_hash text, p_minutes integer default 10)
returns void
language sql
security definer
set search_path = ''
as $$
    insert into public.ticket_access_codes (order_id, code_hash, expires_at, attempts)
    values (p_order_id, p_code_hash, now() + make_interval(mins => p_minutes), 0)
    on conflict (order_id) do update
    set code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0;
$$;

create or replace function public.consume_ticket_access_code(p_order_id uuid, p_code_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_row public.ticket_access_codes;
begin
    select * into v_row from public.ticket_access_codes c where c.order_id = p_order_id for update;
    if not found or v_row.expires_at <= now() or v_row.attempts >= 5 then
        return false;
    end if;
    if v_row.code_hash = p_code_hash then
        delete from public.ticket_access_codes where order_id = p_order_id;
        return true;
    end if;
    update public.ticket_access_codes set attempts = attempts + 1 where order_id = p_order_id;
    return false;
end;
$$;

create or replace function public.record_ticket_email(p_order_id uuid, p_error text)
returns void
language sql
security definer
set search_path = ''
as $$
    update public.ticket_orders
    set email_sent_at = case when p_error is null then now() else email_sent_at end,
        email_error = p_error
    where id = p_order_id;
$$;

create or replace function public.hit_ticket_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_hits integer;
begin
    insert into public.ticket_rate_limits as r (key, window_ends_at, hits)
    values (p_key, now() + make_interval(secs => p_window_seconds), 1)
    on conflict (key) do update
    set hits = case when r.window_ends_at <= now() then 1 else r.hits + 1 end,
        window_ends_at = case when r.window_ends_at <= now() then excluded.window_ends_at else r.window_ends_at end
    returning hits into v_hits;

    if random() < 0.01 then
        delete from public.ticket_rate_limits where window_ends_at <= now();
    end if;

    return v_hits <= p_limit;
end;
$$;

create or replace function public.log_ticket_access(
    p_order_id uuid,
    p_ticket_id uuid,
    p_action text,
    p_ip_hash text,
    p_detail text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
    insert into public.ticket_access_log (order_id, ticket_id, action, ip_hash, detail)
    values (p_order_id, p_ticket_id, p_action, p_ip_hash, p_detail);
$$;

-- ============================================================================
-- 13. Staff operations. Each checks the caller's role itself and writes its own
--     audit row; there are deliberately no table UPDATE grants for these fields.
-- ============================================================================

create or replace function public.admin_check_in_ticket(
    p_ticket_code text,
    p_method text,
    p_event_id uuid default null
)
returns table (
    result text,
    ticket_code text,
    holder_name text,
    event_title text,
    checked_in_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_ticket public.tickets;
    v_event public.events;
    v_result text;
begin
    if public.current_admin_role() is null then
        raise exception 'Not authorised.' using errcode = '42501';
    end if;
    if p_method not in ('scan', 'typed') then
        raise exception 'Invalid check-in method.';
    end if;

    -- The row lock is what guarantees only the first of two simultaneous scans wins.
    select * into v_ticket from public.tickets t where t.ticket_code = p_ticket_code for update;
    if not found then
        return query select 'not_found'::text, p_ticket_code, null::text, null::text, null::timestamptz;
        return;
    end if;
    select * into v_event from public.events e where e.id = v_ticket.event_id;

    if v_ticket.status = 'used' then
        v_result := 'already_used';
    elsif v_ticket.status = 'cancelled' then
        v_result := 'cancelled';
    elsif p_event_id is not null and p_event_id <> v_ticket.event_id then
        v_result := 'wrong_event';
    elsif v_event.cancelled_at is not null then
        v_result := 'event_cancelled';
    elsif now() < v_event.start_at - interval '12 hours'
        or now() > coalesce(v_event.end_at, v_event.start_at + interval '12 hours') + interval '6 hours' then
        v_result := 'outside_window';
    else
        update public.tickets t
        set status = 'used',
            checked_in_at = now(),
            checked_in_by = auth.uid(),
            checked_in_method = p_method
        where t.id = v_ticket.id
        returning * into v_ticket;
        v_result := 'admitted';
    end if;

    insert into public.ticket_access_log (order_id, ticket_id, action, actor_id, detail)
    values (v_ticket.order_id, v_ticket.id, 'check_in', auth.uid(), v_result || ' (' || p_method || ')');

    return query select v_result, v_ticket.ticket_code, v_ticket.holder_name, v_event.title, v_ticket.checked_in_at;
end;
$$;

create or replace function public.admin_door_stats(p_event_id uuid)
returns table (total integer, admitted integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
    if public.current_admin_role() is null then
        raise exception 'Not authorised.' using errcode = '42501';
    end if;
    return query
    select
        count(*) filter (where t.status in ('valid', 'used'))::integer,
        count(*) filter (where t.status = 'used')::integer
    from public.tickets t
    where t.event_id = p_event_id;
end;
$$;

-- Cancels a leaked ticket and issues a new one with a new ID and QR code.
create or replace function public.admin_replace_ticket(p_ticket_id uuid, p_reason text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_old public.tickets;
    v_new_id uuid;
    v_new_code text;
begin
    if public.current_admin_role() is distinct from 'super_admin' then
        raise exception 'Not authorised.' using errcode = '42501';
    end if;
    select * into v_old from public.tickets t where t.id = p_ticket_id for update;
    if not found or v_old.status <> 'valid' then
        raise exception 'Only a valid, unused ticket can be replaced.';
    end if;

    insert into public.tickets (ticket_code, order_id, event_id, ticket_type_id, holder_name)
    values (public.new_ticket_code(), v_old.order_id, v_old.event_id, v_old.ticket_type_id, v_old.holder_name)
    returning id, ticket_code into v_new_id, v_new_code;

    update public.tickets
    set status = 'cancelled', cancelled_at = now(), cancel_reason = p_reason, replaced_by = v_new_id
    where id = v_old.id;

    insert into public.ticket_access_log (order_id, ticket_id, action, actor_id, detail)
    values (v_old.order_id, v_old.id, 'replaced', auth.uid(), p_reason);
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, summary)
    values (auth.uid(), 'ticket.replaced', 'ticket', v_old.id, v_old.ticket_code || ' replaced by ' || v_new_code);

    return v_new_code;
end;
$$;

-- Records a refund already made in the provider's dashboard. It moves no money.
create or replace function public.admin_record_refund(p_order_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_order public.ticket_orders;
begin
    if public.current_admin_role() is distinct from 'super_admin' then
        raise exception 'Not authorised.' using errcode = '42501';
    end if;
    select * into v_order from public.ticket_orders o where o.id = p_order_id for update;
    if not found or v_order.status not in ('paid', 'needs_review') then
        raise exception 'Only a paid order can be marked as refunded.';
    end if;

    update public.ticket_orders
    set status = 'refunded', refunded_at = now(), refund_note = p_note
    where id = p_order_id;

    update public.tickets
    set status = 'cancelled', cancelled_at = now(), cancel_reason = 'Order refunded'
    where order_id = p_order_id and status = 'valid';

    insert into public.audit_logs (actor_id, action, entity_type, entity_id, summary)
    values (auth.uid(), 'ticket_order.refunded', 'ticket_order', p_order_id, v_order.reference);
end;
$$;

-- Fixes a mistyped buyer address, since tickets and download codes go there.
create or replace function public.admin_update_order_email(p_order_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    if public.current_admin_role() is distinct from 'super_admin' then
        raise exception 'Not authorised.' using errcode = '42501';
    end if;
    update public.ticket_orders set buyer_email = lower(p_email) where id = p_order_id;
    if not found then
        raise exception 'Order not found.';
    end if;
    delete from public.ticket_access_codes where order_id = p_order_id;
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, summary)
    values (auth.uid(), 'ticket_order.email_changed', 'ticket_order', p_order_id, 'Buyer email corrected');
end;
$$;

-- Ticket limit can't drop below what's sold or held, and sales need a published event.
create or replace function public.guard_ticket_type()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if tg_op = 'UPDATE' and new.quantity_total < public.ticket_units_taken(new.id) then
        raise exception 'The ticket limit can''t be lower than the tickets already sold or held.';
    end if;
    if new.sales_status = 'on_sale' and not exists (
        select 1 from public.events e
        where e.id = new.event_id and e.publication_status = 'published' and e.cancelled_at is null
    ) then
        raise exception 'Publish the event before opening ticket sales.';
    end if;
    return new;
end;
$$;

create trigger guard_ticket_type before insert or update on public.ticket_types
    for each row execute function public.guard_ticket_type();

-- ============================================================================
-- 14. Row-Level Security. Deny by default.
-- ============================================================================

alter table public.ticket_types enable row level security;
alter table public.discount_codes enable row level security;
alter table public.ticket_orders enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_access_codes enable row level security;
alter table public.ticket_rate_limits enable row level security;
alter table public.ticket_access_log enable row level security;

create policy ticket_types_admin_all on public.ticket_types
    for all using (public.current_admin_role() in ('super_admin', 'content_editor'))
    with check (public.current_admin_role() in ('super_admin', 'content_editor'));

-- Discounts directly affect revenue, so they are super_admin only.
create policy discount_codes_super_admin_all on public.discount_codes
    for all using (public.current_admin_role() = 'super_admin')
    with check (public.current_admin_role() = 'super_admin');

create policy ticket_orders_admin_select on public.ticket_orders
    for select using (public.current_admin_role() in ('super_admin', 'content_editor'));

create policy tickets_admin_select on public.tickets
    for select using (public.current_admin_role() in ('super_admin', 'content_editor'));

create policy ticket_access_log_super_admin_select on public.ticket_access_log
    for select using (public.current_admin_role() = 'super_admin');

-- ============================================================================
-- 15. Grants. Explicit revokes first, because Supabase's default privileges may
--     grant new objects to these roles.
-- ============================================================================

revoke all on
    public.ticket_types, public.discount_codes, public.ticket_orders, public.tickets,
    public.ticket_access_codes, public.ticket_rate_limits, public.ticket_access_log
from anon, authenticated, service_role;

grant select, insert, update on public.ticket_types to authenticated;
grant select, insert, update on public.discount_codes to authenticated;
grant select on public.ticket_orders, public.tickets, public.ticket_access_log to authenticated;

-- The server's service role reads through these and changes state only via the
-- functions above. Nothing, including it, can INSERT a ticket directly.
grant select on public.ticket_types, public.ticket_orders, public.tickets to service_role;

revoke execute on function
    public.guard_ticket_immutable(),
    public.guard_order_immutable(),
    public.guard_ticket_type(),
    public.ticket_units_taken(uuid),
    public.discount_uses_taken(uuid),
    public.new_ticket_code(),
    public.evaluate_discount(text, uuid, bigint, boolean),
    public.ticket_sale_state(public.ticket_types, public.events),
    public.ticket_availability(uuid),
    public.quote_ticket_order(uuid, integer, text),
    public.reserve_ticket_order(uuid, integer, text, text, text, text, integer),
    public.release_ticket_order(uuid),
    public.confirm_ticket_payment(text, bigint, text, text),
    public.set_ticket_access_code(uuid, text, integer),
    public.consume_ticket_access_code(uuid, text),
    public.record_ticket_email(uuid, text),
    public.hit_ticket_rate_limit(text, integer, integer),
    public.log_ticket_access(uuid, uuid, text, text, text),
    public.admin_check_in_ticket(text, text, uuid),
    public.admin_door_stats(uuid),
    public.admin_replace_ticket(uuid, text),
    public.admin_record_refund(uuid, text),
    public.admin_update_order_email(uuid, text)
from public, anon, authenticated, service_role;

grant execute on function public.ticket_availability(uuid) to anon, authenticated, service_role;

grant execute on function
    public.quote_ticket_order(uuid, integer, text),
    public.reserve_ticket_order(uuid, integer, text, text, text, text, integer),
    public.release_ticket_order(uuid),
    public.confirm_ticket_payment(text, bigint, text, text),
    public.set_ticket_access_code(uuid, text, integer),
    public.consume_ticket_access_code(uuid, text),
    public.record_ticket_email(uuid, text),
    public.hit_ticket_rate_limit(text, integer, integer),
    public.log_ticket_access(uuid, uuid, text, text, text)
to service_role;

-- Each of these checks the caller's role itself.
grant execute on function
    public.admin_check_in_ticket(text, text, uuid),
    public.admin_door_stats(uuid),
    public.admin_replace_ticket(uuid, text),
    public.admin_record_refund(uuid, text),
    public.admin_update_order_email(uuid, text)
to authenticated;
