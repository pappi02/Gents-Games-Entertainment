-- Demo mode for presenting ticketing. See docs/EVENT_TICKETING.md §10.
--
-- There is only one database, so demo data lives beside real data and is fenced
-- off here, not just in the app:
--   * RLS hides demo events from the public, including any already-deployed code;
--   * the public availability function never returns them;
--   * demo discount codes can't apply to a real event;
--   * only demo tickets can be deleted, and only demo data is ever reset.

alter table public.events add column is_demo boolean not null default false;
alter table public.discount_codes add column is_demo boolean not null default false;

drop policy events_public_select on public.events;
create policy events_public_select on public.events
    for select using (publication_status = 'published' and not is_demo);

-- Public availability: identical to before, but never includes a demo event.
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
      and not e.is_demo
      and (p_event_id is null or e.id = p_event_id)
    order by t.sort_order, t.created_at;
$$;

-- Demo availability: server only, and only used when demo mode is switched on.
create or replace function public.demo_ticket_availability(p_event_id uuid default null)
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
      and e.is_demo
      and (p_event_id is null or e.id = p_event_id)
    order by t.sort_order, t.created_at;
$$;

-- A demo code only ever discounts a demo event.
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
        or (v_row.is_demo and not exists (select 1 from public.events e where e.id = p_event_id and e.is_demo))
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

-- Demo tickets can be scanned whenever the demo happens; real tickets keep the time window.
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
    elsif not v_event.is_demo and (
        now() < v_event.start_at - interval '12 hours'
        or now() > coalesce(v_event.end_at, v_event.start_at + interval '12 hours') + interval '6 hours'
    ) then
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

-- Real tickets still can't be deleted. Demo tickets can, so the demo can be reset.
create or replace function public.guard_ticket_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if tg_op = 'DELETE' then
        if exists (select 1 from public.events e where e.id = old.event_id and e.is_demo) then
            return old;
        end if;
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

-- Clears demo orders and anything created during a demo, keeping the sample event.
-- Touches only rows flagged is_demo.
create or replace function public.admin_reset_demo()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    if public.current_admin_role() is distinct from 'super_admin' then
        raise exception 'Not authorised.' using errcode = '42501';
    end if;

    delete from public.tickets t using public.events e where t.event_id = e.id and e.is_demo;
    delete from public.ticket_orders o using public.events e where o.event_id = e.id and e.is_demo;
    delete from public.discount_codes c
        where c.is_demo and c.code not in ('SAMPLE10', 'SAMPLE500');
    delete from public.discount_codes c
        using public.events e
        where c.event_id = e.id and e.is_demo and e.slug <> 'sample-masquerade-night';
    delete from public.ticket_types t
        using public.events e
        where t.event_id = e.id and e.is_demo and e.slug <> 'sample-masquerade-night';
    delete from public.events e where e.is_demo and e.slug <> 'sample-masquerade-night';

    update public.events set cancelled_at = null, publication_status = 'published', start_at = now() + interval '30 days'
    where is_demo and slug = 'sample-masquerade-night';
    update public.ticket_types t set sales_status = 'on_sale', quantity_total = 50, price_minor_units = 250000
    from public.events e
    where t.event_id = e.id and e.slug = 'sample-masquerade-night' and e.is_demo;

    insert into public.audit_logs (actor_id, action, entity_type, summary)
    values (auth.uid(), 'demo.reset', 'event', 'Demo data cleared');
end;
$$;

revoke execute on function
    public.demo_ticket_availability(uuid),
    public.admin_reset_demo()
from public, anon, authenticated, service_role;
grant execute on function public.demo_ticket_availability(uuid) to service_role;
grant execute on function public.admin_reset_demo() to authenticated;

-- The sample event. Hidden from the public by the policy above.
with sample as (
    insert into public.events (
        slug, title, description, start_at, end_at, location_note, poster_path, poster_alt,
        publication_status, is_demo
    ) values (
        'sample-masquerade-night',
        'SAMPLE: Masquerade Night',
        E'This is a sample event for demonstrating ticket sales. It is not a real event, no real money is charged, and sample tickets are not valid for entry.\n\nImagine an evening of masks, live music and dancing. Choose your tickets, try a discount code, pay with the simulated checkout, then download your PDF ticket and scan its QR code.',
        now() + interval '30 days',
        now() + interval '30 days 5 hours',
        'Sample venue (demo only)',
        '/demo/sample-masquerade-poster.webp',
        'Sample poster for Masquerade Night, showing a red and white mask on a dark background, marked as a sample.',
        'published',
        true
    )
    returning id
),
sample_type as (
    insert into public.ticket_types (event_id, name, description, price_minor_units, quantity_total, sales_status, max_per_order)
    select id, 'Gentleman Experience', 'Sample ticket: one admission to this demonstration event.', 250000, 50, 'on_sale', 10
    from sample
    returning id
)
insert into public.discount_codes (code, kind, amount, event_id, note, is_demo)
select v.code, v.kind, v.amount, sample.id, 'Sample code for the demo', true
from sample
cross join (values ('SAMPLE10', 'percent', 10), ('SAMPLE500', 'fixed', 50000)) as v (code, kind, amount);
