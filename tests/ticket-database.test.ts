import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

/**
 * Runs the real migrations on a real Postgres engine (PGlite), with Supabase's
 * auth and storage replaced by minimal stand-ins. PGlite has one connection, so
 * requests here run in sequence; true parallel behaviour rests on the row locks
 * in the migration and was exercised separately (docs/EVENT_TICKETING.md §9).
 */

const SUPER_ADMIN = "00000000-0000-4000-8000-000000000001";
const EDITOR = "00000000-0000-4000-8000-000000000002";
const DOOR_STAFF = "00000000-0000-4000-8000-000000000003";

const STANDINS = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key);
  create or replace function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text);
  alter table storage.objects enable row level security;
`;

const migration = (name: string) => readFileSync(path.join(process.cwd(), "supabase", "migrations", name), "utf8");

let db: PGlite;

async function as<T>(role: string, uid: string | null, sql: string, params: unknown[] = []) {
  await db.exec(`set role ${role}; select set_config('test.uid', '${uid ?? ""}', false);`);
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec("reset role;");
  }
}

const service = <T>(sql: string, params?: unknown[]) => as<T>("service_role", null, sql, params);

type Reservation = { order_id: string; reference: string; total_minor_units: string; error: string | null };

let eventId: string;
let typeId: string;

async function makeEvent(quantity = 5, price = 200000) {
  const [event] = (
    await db.query<{ id: string }>(
      `insert into public.events (slug, title, description, start_at, publication_status)
       values ($1, 'Masquerade', 'A night', now() + interval '2 hours', 'published') returning id`,
      [`event-${crypto.randomUUID()}`],
    )
  ).rows;
  const [type] = (
    await db.query<{ id: string }>(
      `insert into public.ticket_types (event_id, name, price_minor_units, quantity_total, sales_status, max_per_order)
       values ($1, 'Gentleman Experience', $2, $3, 'on_sale', 10) returning id`,
      [event.id, price, quantity],
    )
  ).rows;
  return { eventId: event.id, typeId: type.id };
}

async function reserve(type: string, quantity: number, code = "", email = "buyer@example.com") {
  const [row] = await service<Reservation>(
    `select * from public.reserve_ticket_order($1, $2, 'Night Owl', $3, $4, 'iphash')`,
    [type, quantity, email, code],
  );
  return row;
}

async function confirm(reference: string, amount: string | number, currency = "KES", tx = "trx1") {
  const [row] = await service<{ order_id: string; outcome: string }>(
    `select * from public.confirm_ticket_payment($1, $2, $3, $4)`,
    [reference, amount, currency, tx],
  );
  return row;
}

async function buy(type: string, quantity: number, code = "") {
  const reservation = await reserve(type, quantity, code);
  expect(reservation.error).toBeNull();
  await confirm(reservation.reference, reservation.total_minor_units);
  return reservation;
}

async function ticketsFor(orderId: string) {
  return (await db.query<{ id: string; ticket_code: string; status: string }>(
    `select id, ticket_code, status from public.tickets where order_id = $1 order by created_at`,
    [orderId],
  )).rows;
}

async function expireHold(orderId: string) {
  await db.query(`update public.ticket_orders set hold_expires_at = now() - interval '1 minute' where id = $1`, [orderId]);
}

const checkIn = (uid: string, code: string, method = "scan", event: string | null = null) =>
  as<{ result: string }>("authenticated", uid, `select * from public.admin_check_in_ticket($1, $2, $3)`, [code, method, event]);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(STANDINS);
  await db.exec(migration("20261012124846_init_schema.sql"));
  await db.exec(migration("20261012125946_grant_role_privileges.sql"));
  await db.exec(migration("20261012133137_grant_service_role.sql"));
  await db.exec(migration("20261109120000_event_ticketing.sql"));
  for (const [id, role] of [[SUPER_ADMIN, "super_admin"], [EDITOR, "content_editor"], [DOOR_STAFF, "enquiry_staff"]]) {
    await db.query(`insert into auth.users (id) values ($1)`, [id]);
    await db.query(`insert into public.admin_profiles (id, display_name, role) values ($1, $2, $2)`, [id, role]);
  }
});

beforeEach(async () => {
  ({ eventId, typeId } = await makeEvent());
});

describe("selling", () => {
  it("never sells more tickets than exist", async () => {
    expect((await reserve(typeId, 3)).error).toBeNull();
    expect((await reserve(typeId, 3)).error).toMatch(/enough tickets/);
    expect((await reserve(typeId, 2)).error).toBeNull();
    expect((await reserve(typeId, 1)).error).toMatch(/held by other buyers/);
  });

  it("releases an expired hold without any background job", async () => {
    const first = await reserve(typeId, 5);
    expect((await reserve(typeId, 1)).error).toMatch(/held/);
    await expireHold(first.order_id);
    expect((await reserve(typeId, 1)).error).toBeNull();
  });

  it("reports sold out only when everything is really paid for", async () => {
    await buy(typeId, 5);
    const [row] = await service<{ state: string; can_buy: number }>(`select * from public.ticket_availability($1)`, [eventId]);
    expect(row.state).toBe("sold_out");
    expect(row.can_buy).toBe(0);
    expect((await reserve(typeId, 1)).error).toMatch(/sold out/);
  });

  it("refuses sales for draft, cancelled, closed and finished events", async () => {
    const setEvent = (sql: string) => db.query(`update public.events set ${sql} where id = $1`, [eventId]);
    await db.query(`update public.ticket_types set sales_status = 'closed' where id = $1`, [typeId]);
    expect((await reserve(typeId, 1)).error).toMatch(/aren't on sale/);
    await db.query(`update public.ticket_types set sales_status = 'on_sale' where id = $1`, [typeId]);

    await setEvent(`start_at = now() - interval '1 hour'`);
    expect((await reserve(typeId, 1)).error).toMatch(/aren't on sale/);
    await setEvent(`start_at = now() + interval '1 hour', cancelled_at = now()`);
    expect((await reserve(typeId, 1)).error).toMatch(/aren't on sale/);
    await setEvent(`cancelled_at = null, publication_status = 'draft'`);
    expect((await reserve(typeId, 1)).error).toMatch(/aren't on sale/);
  });

  it("refuses bad quantities", async () => {
    expect((await reserve(typeId, 0)).error).toMatch(/valid number/);
    expect((await reserve(typeId, -3)).error).toMatch(/valid number/);
    expect((await reserve(typeId, 11)).error).toMatch(/valid number/);
  });

  it("won't open sales for an unpublished event", async () => {
    await db.query(`update public.ticket_types set sales_status = 'closed' where id = $1`, [typeId]);
    await db.query(`update public.events set publication_status = 'draft' where id = $1`, [eventId]);
    await expect(db.query(`update public.ticket_types set sales_status = 'on_sale' where id = $1`, [typeId])).rejects.toThrow(/Publish the event/);
  });

  it("won't lower the ticket limit below tickets sold", async () => {
    await buy(typeId, 4);
    await expect(db.query(`update public.ticket_types set quantity_total = 3 where id = $1`, [typeId])).rejects.toThrow(/can't be lower/);
  });
});

describe("payment confirmation", () => {
  it("issues exactly one unique ticket per person", async () => {
    const order = await reserve(typeId, 3);
    expect((await ticketsFor(order.order_id)).length).toBe(0); // nothing exists before payment
    expect((await confirm(order.reference, order.total_minor_units)).outcome).toBe("issued");
    const tickets = await ticketsFor(order.order_id);
    expect(tickets.length).toBe(3);
    expect(new Set(tickets.map((t) => t.ticket_code)).size).toBe(3);
    for (const t of tickets) expect(t.ticket_code).toMatch(/^GG-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
  });

  it("creates no extra tickets from repeated notifications", async () => {
    const order = await reserve(typeId, 2);
    expect((await confirm(order.reference, order.total_minor_units)).outcome).toBe("issued");
    expect((await confirm(order.reference, order.total_minor_units)).outcome).toBe("already_paid");
    expect((await confirm(order.reference, order.total_minor_units)).outcome).toBe("already_paid");
    expect((await ticketsFor(order.order_id)).length).toBe(2);
  });

  it.each([
    ["too little", (total: number) => total - 100, "KES"],
    ["too much", (total: number) => total + 100, "KES"],
    ["a different currency", (total: number) => total, "USD"],
  ])("issues nothing when %s is paid", async (_label, amount, currency) => {
    const order = await reserve(typeId, 1);
    expect((await confirm(order.reference, amount(Number(order.total_minor_units)), currency)).outcome).toBe("review");
    expect((await ticketsFor(order.order_id)).length).toBe(0);
  });

  it("honours a late payment when tickets remain, and flags it when none do", async () => {
    const late = await reserve(typeId, 2);
    await expireHold(late.order_id);
    expect((await confirm(late.reference, late.total_minor_units)).outcome).toBe("issued");

    const { typeId: small } = await makeEvent(1);
    const lapsed = await reserve(small, 1);
    await expireHold(lapsed.order_id);
    await buy(small, 1);
    expect((await confirm(lapsed.reference, lapsed.total_minor_units)).outcome).toBe("review");
    expect((await ticketsFor(lapsed.order_id)).length).toBe(0);
  });

  it("flags a payment for a cancelled event", async () => {
    const order = await reserve(typeId, 1);
    await db.query(`update public.events set cancelled_at = now() where id = $1`, [eventId]);
    expect((await confirm(order.reference, order.total_minor_units)).outcome).toBe("review");
  });

  it("ignores an unknown reference", async () => {
    expect((await confirm("GGO-nope", 100)).outcome).toBe("not_found");
  });
});

describe("discount codes", () => {
  const addCode = (code: string, kind: string, amount: number, extra = "", values = "") =>
    db.query(`insert into public.discount_codes (code, kind, amount${extra}) values ($1, $2, $3${values})`, [code, kind, amount]);
  const uniqueCode = () => `T${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;

  it("applies a percentage using whole-cent arithmetic", async () => {
    const code = uniqueCode();
    await addCode(code, "percent", 15);
    const order = await reserve(typeId, 2, code.toLowerCase());
    expect(order.error).toBeNull();
    expect(Number(order.total_minor_units)).toBe(340000); // 4,000.00 less 15%
  });

  it("applies a fixed amount to the order total, not per ticket", async () => {
    const code = uniqueCode();
    await addCode(code, "fixed", 50000);
    expect(Number((await reserve(typeId, 3, code)).total_minor_units)).toBe(550000);
  });

  it("uses the same generic message for every invalid code", async () => {
    const off = uniqueCode();
    const expired = uniqueCode();
    await addCode(off, "percent", 10, ", is_active", ", false");
    await addCode(expired, "percent", 10, ", ends_at", ", now() - interval '1 day'");
    const messages = new Set([
      (await reserve(typeId, 1, "DOESNOTEXIST")).error,
      (await reserve(typeId, 1, off)).error,
      (await reserve(typeId, 1, expired)).error,
    ]);
    expect(messages).toEqual(new Set(["That code isn't valid for this order."]));
  });

  it("can't be used for another event", async () => {
    const code = uniqueCode();
    const other = await makeEvent();
    await db.query(`insert into public.discount_codes (code, kind, amount, event_id) values ($1, 'percent', 10, $2)`, [code, other.eventId]);
    expect((await reserve(typeId, 1, code)).error).toMatch(/isn't valid/);
    expect((await reserve(other.typeId, 1, code)).error).toBeNull();
  });

  it("never exceeds its use limit, and gets a use back when a hold expires", async () => {
    const code = uniqueCode();
    await addCode(code, "percent", 10, ", max_uses", ", 1");
    const first = await reserve(typeId, 1, code);
    expect(first.error).toBeNull();
    expect((await reserve(typeId, 1, code)).error).toMatch(/isn't valid/);
    await expireHold(first.order_id);
    expect((await reserve(typeId, 1, code)).error).toBeNull();
  });

  it("can't make an order free or below the minimum charge", async () => {
    const huge = uniqueCode();
    await addCode(huge, "fixed", 199950);
    expect((await reserve(typeId, 1, huge)).error).toMatch(/isn't valid/);
    await expect(addCode(uniqueCode(), "percent", 100)).rejects.toThrow();
  });

  it("quote and reservation agree on the price", async () => {
    const code = uniqueCode();
    await addCode(code, "percent", 33);
    const [quote] = await service<{ total_minor_units: string; error: string | null }>(
      `select * from public.quote_ticket_order($1, 3, $2)`,
      [typeId, code],
    );
    expect(quote.error).toBeNull();
    expect((await reserve(typeId, 3, code)).total_minor_units).toBe(quote.total_minor_units);
  });
});

describe("door check-in", () => {
  it("admits only the first scan of a ticket", async () => {
    const order = await buy(typeId, 1);
    const [ticket] = await ticketsFor(order.order_id);
    expect((await checkIn(DOOR_STAFF, ticket.ticket_code))[0].result).toBe("admitted");
    expect((await checkIn(DOOR_STAFF, ticket.ticket_code))[0].result).toBe("already_used");
    expect((await checkIn(SUPER_ADMIN, ticket.ticket_code))[0].result).toBe("already_used");
  });

  it("rejects unknown, wrong-event and refunded tickets", async () => {
    const order = await buy(typeId, 2);
    const [first, second] = await ticketsFor(order.order_id);
    expect((await checkIn(DOOR_STAFF, "GG-0000-0000-0000"))[0].result).toBe("not_found");
    const other = await makeEvent();
    expect((await checkIn(DOOR_STAFF, first.ticket_code, "typed", other.eventId))[0].result).toBe("wrong_event");
    await as("authenticated", SUPER_ADMIN, `select public.admin_record_refund($1, 'ref')`, [order.order_id]);
    expect((await checkIn(DOOR_STAFF, second.ticket_code))[0].result).toBe("cancelled");
  });

  it("only admits around the event's own time", async () => {
    const order = await buy(typeId, 2);
    const [early, late] = await ticketsFor(order.order_id);
    await db.query(`update public.events set start_at = now() + interval '3 days' where id = $1`, [eventId]);
    expect((await checkIn(DOOR_STAFF, early.ticket_code))[0].result).toBe("outside_window");
    await db.query(`update public.events set start_at = now() - interval '5 days' where id = $1`, [eventId]);
    expect((await checkIn(DOOR_STAFF, late.ticket_code))[0].result).toBe("outside_window");
  });

  it("rejects a ticket for a cancelled event", async () => {
    const order = await buy(typeId, 1);
    const [ticket] = await ticketsFor(order.order_id);
    await db.query(`update public.events set cancelled_at = now() where id = $1`, [eventId]);
    expect((await checkIn(DOOR_STAFF, ticket.ticket_code))[0].result).toBe("event_cancelled");
  });

  it("replaces a leaked ticket: the old one dies and sold count stays the same", async () => {
    const order = await buy(typeId, 1);
    const [old] = await ticketsFor(order.order_id);
    const [{ code }] = await as<{ code: string }>("authenticated", SUPER_ADMIN, `select public.admin_replace_ticket($1, 'leaked') as code`, [old.id]);
    expect(code).not.toBe(old.ticket_code);
    expect((await checkIn(DOOR_STAFF, old.ticket_code))[0].result).toBe("cancelled");
    expect((await checkIn(DOOR_STAFF, code))[0].result).toBe("admitted");
    const [{ taken }] = (await db.query<{ taken: number }>(`select public.ticket_units_taken($1) as taken`, [typeId])).rows;
    expect(taken).toBe(1);
  });
});

describe("tamper resistance", () => {
  it("won't let signed ticket fields change, even for the database owner", async () => {
    const order = await buy(typeId, 1);
    const [ticket] = await ticketsFor(order.order_id);
    await expect(db.query(`update public.tickets set holder_name = 'Mallory' where id = $1`, [ticket.id])).rejects.toThrow(/Signed ticket fields/);
    await expect(db.query(`update public.tickets set ticket_code = 'GG-0000-0000-0000' where id = $1`, [ticket.id])).rejects.toThrow(/Signed ticket fields/);
    await expect(db.query(`delete from public.tickets where id = $1`, [ticket.id])).rejects.toThrow(/cannot be deleted/);
  });

  it("won't let a used ticket become valid again", async () => {
    const order = await buy(typeId, 1);
    const [ticket] = await ticketsFor(order.order_id);
    await checkIn(DOOR_STAFF, ticket.ticket_code);
    await expect(db.query(`update public.tickets set status = 'valid' where id = $1`, [ticket.id])).rejects.toThrow(/cannot change status/);
  });

  it("won't let order amounts change", async () => {
    const order = await reserve(typeId, 1);
    await expect(db.query(`update public.ticket_orders set total_minor_units = 1, subtotal_minor_units = 1 where id = $1`, [order.order_id])).rejects.toThrow(/cannot be changed/);
  });

  it("rejects a discount snapshot that doesn't add up", async () => {
    await expect(
      db.query(
        `insert into public.ticket_orders (reference, event_id, ticket_type_id, quantity, buyer_name, buyer_email, unit_price_minor_units, subtotal_minor_units, discount_minor_units, total_minor_units, hold_expires_at)
         values ('x', $1, $2, 1, 'a', 'a@b.c', 100, 100, 0, 1, now())`,
        [eventId, typeId],
      ),
    ).rejects.toThrow();
  });
});

describe("access control", () => {
  it("gives the public no direct access to anything", async () => {
    for (const table of ["ticket_orders", "tickets", "discount_codes", "ticket_types", "ticket_access_codes", "ticket_access_log", "ticket_rate_limits"]) {
      await expect(as("anon", null, `select * from public.${table}`)).rejects.toThrow(/permission denied/);
    }
  });

  it("lets the public call only the availability function", async () => {
    await expect(as("anon", null, `select * from public.ticket_availability()`)).resolves.toBeDefined();
    const blocked: [string, unknown[]][] = [
      [`select * from public.reserve_ticket_order($1, 1, 'a', 'a@b.c', '', 'x')`, [typeId]],
      [`select * from public.confirm_ticket_payment('GGO-x', 1, 'KES', 'x')`, []],
      [`select public.new_ticket_code()`, []],
      [`select * from public.quote_ticket_order($1, 1, '')`, [typeId]],
      [`select public.set_ticket_access_code($1, 'x')`, [typeId]],
      [`select public.hit_ticket_rate_limit('x', 1, 1)`, []],
      [`select * from public.admin_check_in_ticket('x', 'scan')`, []],
    ];
    for (const [sql, params] of blocked) await expect(as("anon", null, sql, params)).rejects.toThrow(/permission denied/);
  });

  it("nobody, not even the server's service role, can insert a ticket directly", async () => {
    const order = await reserve(typeId, 1);
    const sql = `insert into public.tickets (ticket_code, order_id, event_id, ticket_type_id, holder_name) values ('GG-AAAA-BBBB-CCCC', $1, $2, $3, 'x')`;
    await expect(service(sql, [order.order_id, eventId, typeId])).rejects.toThrow(/permission denied/);
    await expect(as("authenticated", SUPER_ADMIN, sql, [order.order_id, eventId, typeId])).rejects.toThrow(/permission denied/);
  });

  it("a signed-in admin can't confirm a payment or issue tickets", async () => {
    await expect(as("authenticated", SUPER_ADMIN, `select * from public.confirm_ticket_payment('x', 1, 'KES', 'x')`)).rejects.toThrow(/permission denied/);
  });

  it("door staff can check in but can't read orders, tickets or discount codes", async () => {
    await buy(typeId, 1);
    expect((await as("authenticated", DOOR_STAFF, `select * from public.ticket_orders`)).length).toBe(0);
    expect((await as("authenticated", DOOR_STAFF, `select * from public.tickets`)).length).toBe(0);
    expect((await as("authenticated", DOOR_STAFF, `select * from public.discount_codes`)).length).toBe(0);
    await expect(as("authenticated", DOOR_STAFF, `insert into public.discount_codes (code, kind, amount) values ('STAFF1', 'percent', 90)`)).rejects.toThrow(/row-level security/);
  });

  it("only super admins manage discount codes, refunds and replacements", async () => {
    await expect(as("authenticated", EDITOR, `insert into public.discount_codes (code, kind, amount) values ('EDIT1', 'percent', 90)`)).rejects.toThrow(/row-level security/);
    const order = await buy(typeId, 1);
    const [ticket] = await ticketsFor(order.order_id);
    for (const uid of [EDITOR, DOOR_STAFF]) {
      await expect(as("authenticated", uid, `select public.admin_record_refund($1, 'x')`, [order.order_id])).rejects.toThrow(/Not authorised/);
      await expect(as("authenticated", uid, `select public.admin_replace_ticket($1, 'x')`, [ticket.id])).rejects.toThrow(/Not authorised/);
      await expect(as("authenticated", uid, `select public.admin_update_order_email($1, 'a@b.c')`, [order.order_id])).rejects.toThrow(/Not authorised/);
    }
  });

  it("a signed-in non-admin can't check anyone in", async () => {
    const order = await buy(typeId, 1);
    const [ticket] = await ticketsFor(order.order_id);
    await expect(checkIn("00000000-0000-4000-8000-0000000000ff", ticket.ticket_code)).rejects.toThrow(/Not authorised/);
  });
});

describe("download codes and rate limits", () => {
  it("a code works once, and locks after 5 wrong tries", async () => {
    const order = await reserve(typeId, 1);
    const set = () => service(`select public.set_ticket_access_code($1, 'right')`, [order.order_id]);
    const consume = async (hash: string) =>
      (await service<{ ok: boolean }>(`select public.consume_ticket_access_code($1, $2) as ok`, [order.order_id, hash]))[0].ok;

    await set();
    expect(await consume("wrong")).toBe(false);
    expect(await consume("right")).toBe(true);
    expect(await consume("right")).toBe(false);

    await set();
    for (let i = 0; i < 5; i++) expect(await consume("wrong")).toBe(false);
    expect(await consume("right")).toBe(false);
  });

  it("an expired code doesn't work", async () => {
    const order = await reserve(typeId, 1);
    await service(`select public.set_ticket_access_code($1, 'right', -1)`, [order.order_id]);
    const [{ ok }] = await service<{ ok: boolean }>(`select public.consume_ticket_access_code($1, 'right') as ok`, [order.order_id]);
    expect(ok).toBe(false);
  });

  it("rate limits stop at the limit", async () => {
    const key = `test-${crypto.randomUUID()}`;
    const hit = async () => (await service<{ ok: boolean }>(`select public.hit_ticket_rate_limit($1, 2, 60) as ok`, [key]))[0].ok;
    expect(await hit()).toBe(true);
    expect(await hit()).toBe(true);
    expect(await hit()).toBe(false);
  });
});
