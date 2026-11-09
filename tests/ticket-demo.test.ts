import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { demoModeEnabled } from "@/lib/tickets/demo";

const SUPER_ADMIN = "00000000-0000-4000-8000-000000000001";
const EDITOR = "00000000-0000-4000-8000-000000000002";

const migration = (name: string) => readFileSync(path.join(process.cwd(), "supabase", "migrations", name), "utf8");

let db: PGlite;
let sampleType: string;
let sampleEvent: string;
let realType: string;
let realEvent: string;

async function as<T>(role: string, uid: string | null, sql: string, params: unknown[] = []) {
  await db.exec(`set role ${role}; select set_config('test.uid', '${uid ?? ""}', false);`);
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec("reset role;");
  }
}

async function buySample(quantity = 1) {
  const [order] = await as<{ order_id: string; reference: string; total_minor_units: string; error: string | null }>(
    "service_role",
    null,
    `select * from public.reserve_ticket_order($1, $2, 'Night Owl', 'a@example.com', '', 'ip')`,
    [sampleType, quantity],
  );
  await as("service_role", null, `select * from public.confirm_ticket_payment($1, $2, 'KES', 'DEMO')`, [order.reference, order.total_minor_units]);
  return order;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create schema storage;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text);
    alter table storage.objects enable row level security;
  `);
  for (const m of [
    "20261012124846_init_schema.sql",
    "20261012125946_grant_role_privileges.sql",
    "20261012133137_grant_service_role.sql",
    "20261109120000_event_ticketing.sql",
    "20261109130000_ticketing_demo_mode.sql",
  ]) {
    await db.exec(migration(m));
  }
  for (const [id, role] of [[SUPER_ADMIN, "super_admin"], [EDITOR, "content_editor"]]) {
    await db.query(`insert into auth.users (id) values ($1)`, [id]);
    await db.query(`insert into public.admin_profiles (id, display_name, role) values ($1, $2, $2)`, [id, role]);
  }
  const sample = (await db.query<{ event_id: string; id: string }>(
    `select t.event_id, t.id from public.ticket_types t join public.events e on e.id = t.event_id where e.slug = 'sample-masquerade-night'`,
  )).rows[0];
  sampleType = sample.id;
  sampleEvent = sample.event_id;
  const [real] = (await db.query<{ id: string }>(
    `insert into public.events (slug, title, description, start_at, publication_status) values ('real-night', 'Real', 'x', now() + interval '3 days', 'published') returning id`,
  )).rows;
  realEvent = real.id;
  const [type] = (await db.query<{ id: string }>(
    `insert into public.ticket_types (event_id, name, price_minor_units, quantity_total, sales_status) values ($1, 'G', 200000, 20, 'on_sale') returning id`,
    [realEvent],
  )).rows;
  realType = type.id;
});

describe("demo mode switch", () => {
  it("never turns on in Vercel production, whatever the flag says", () => {
    expect(demoModeEnabled({ TICKET_DEMO_MODE: "true", VERCEL_ENV: "production" })).toBe(false);
  });

  it("is off unless explicitly enabled", () => {
    expect(demoModeEnabled({})).toBe(false);
    expect(demoModeEnabled({ TICKET_DEMO_MODE: "1" })).toBe(false);
    expect(demoModeEnabled({ VERCEL_ENV: "preview" })).toBe(false);
  });

  it("turns on for previews and local runs when enabled", () => {
    expect(demoModeEnabled({ TICKET_DEMO_MODE: "true", VERCEL_ENV: "preview" })).toBe(true);
    expect(demoModeEnabled({ TICKET_DEMO_MODE: "true" })).toBe(true);
  });
});

describe("the sample event stays off the public site", () => {
  it("can't be read by the public", async () => {
    const rows = await as<{ slug: string }>("anon", null, `select slug from public.events`);
    expect(rows.map((r) => r.slug)).toEqual(["real-night"]);
  });

  it("isn't in public availability, but real events still are", async () => {
    const rows = await as<{ event_id: string }>("anon", null, `select * from public.ticket_availability()`);
    expect(rows.map((r) => r.event_id)).toEqual([realEvent]);
    expect(await as("anon", null, `select * from public.ticket_availability($1)`, [sampleEvent])).toEqual([]);
  });

  it("demo availability is server-only", async () => {
    await expect(as("anon", null, `select * from public.demo_ticket_availability()`)).rejects.toThrow(/permission denied/);
    await expect(as("authenticated", SUPER_ADMIN, `select * from public.demo_ticket_availability()`)).rejects.toThrow(/permission denied/);
    const rows = await as<{ event_id: string }>("service_role", null, `select * from public.demo_ticket_availability()`);
    expect(rows.map((r) => r.event_id)).toEqual([sampleEvent]);
  });

  it("is visible to admins", async () => {
    const rows = await as("authenticated", EDITOR, `select id from public.events where id = $1`, [sampleEvent]);
    expect(rows.length).toBe(1);
  });
});

describe("demo data can't affect real sales", () => {
  it("a demo code doesn't work on a real event", async () => {
    const [real] = await as<{ error: string | null }>("service_role", null, `select * from public.quote_ticket_order($1, 1, 'SAMPLE10')`, [realType]);
    expect(real.error).toMatch(/isn't valid/);
    const [sample] = await as<{ error: string | null; total_minor_units: string }>("service_role", null, `select * from public.quote_ticket_order($1, 1, 'SAMPLE10')`, [sampleType]);
    expect(sample.error).toBeNull();
    expect(Number(sample.total_minor_units)).toBe(225000);
  });

  it("a global demo code still can't touch a real event", async () => {
    await db.query(`insert into public.discount_codes (code, kind, amount, is_demo) values ('DEMOALL', 'percent', 50, true)`);
    const [row] = await as<{ error: string | null }>("service_role", null, `select * from public.quote_ticket_order($1, 1, 'DEMOALL')`, [realType]);
    expect(row.error).toMatch(/isn't valid/);
  });

  it("real tickets still can't be deleted, and keep their time window", async () => {
    const [order] = await as<{ order_id: string; reference: string; total_minor_units: string }>(
      "service_role", null, `select * from public.reserve_ticket_order($1, 1, 'n', 'r@example.com', '', 'ip')`, [realType],
    );
    await as("service_role", null, `select * from public.confirm_ticket_payment($1, $2, 'KES', 'tx')`, [order.reference, order.total_minor_units]);
    const { rows: [ticket] } = await db.query<{ id: string; ticket_code: string }>(`select id, ticket_code from public.tickets where order_id = $1`, [order.order_id]);
    await expect(db.query(`delete from public.tickets where id = $1`, [ticket.id])).rejects.toThrow(/cannot be deleted/);
    const [scan] = await as<{ result: string }>("authenticated", EDITOR, `select * from public.admin_check_in_ticket($1, 'scan')`, [ticket.ticket_code]);
    expect(scan.result).toBe("outside_window");
  });
});

describe("the demo flow", () => {
  it("runs end to end: buy, admit, refuse a second scan, whenever the demo happens", async () => {
    const order = await buySample(2);
    const { rows: tickets } = await db.query<{ ticket_code: string }>(`select ticket_code from public.tickets where order_id = $1`, [order.order_id]);
    expect(tickets.length).toBe(2);
    const scan = () => as<{ result: string }>("authenticated", EDITOR, `select * from public.admin_check_in_ticket($1, 'scan')`, [tickets[0].ticket_code]);
    expect((await scan())[0].result).toBe("admitted");
    expect((await scan())[0].result).toBe("already_used");
  });

  it("only a super admin can reset, and reset keeps real data and the sample event", async () => {
    await buySample();
    await expect(as("authenticated", EDITOR, `select public.admin_reset_demo()`)).rejects.toThrow(/Not authorised/);
    await expect(as("anon", null, `select public.admin_reset_demo()`)).rejects.toThrow(/permission denied/);

    const created = (await db.query<{ id: string }>(
      `insert into public.events (slug, title, description, start_at, publication_status, is_demo) values ('made-in-demo', 'T', 'x', now() + interval '1 day', 'published', true) returning id`,
    )).rows[0];
    await db.query(`insert into public.ticket_types (event_id, name, price_minor_units, quantity_total) values ($1, 'G', 200000, 5)`, [created.id]);

    const count = async (sql: string) => (await db.query<{ c: number }>(`select count(*)::int c from ${sql}`)).rows[0].c;
    const realTickets = await count(`public.tickets t join public.events e on e.id = t.event_id where not e.is_demo`);
    expect(realTickets).toBeGreaterThan(0);

    await as("authenticated", SUPER_ADMIN, `select public.admin_reset_demo()`);

    expect(await count(`public.tickets t join public.events e on e.id = t.event_id where e.is_demo`)).toBe(0);
    expect(await count(`public.ticket_orders o join public.events e on e.id = o.event_id where e.is_demo`)).toBe(0);
    expect(await count(`public.events where slug = 'made-in-demo'`)).toBe(0);
    expect(await count(`public.discount_codes where code = 'DEMOALL'`)).toBe(0);
    expect(await count(`public.events where slug = 'sample-masquerade-night'`)).toBe(1);
    expect(await count(`public.discount_codes where code in ('SAMPLE10', 'SAMPLE500')`)).toBe(2);
    expect(await count(`public.tickets t join public.events e on e.id = t.event_id where not e.is_demo`)).toBe(realTickets);
    expect(await count(`public.events where slug = 'real-night'`)).toBe(1);

    const [again] = await as<{ error: string | null }>("service_role", null, `select * from public.reserve_ticket_order($1, 1, 'n', 'a@example.com', '', 'ip')`, [sampleType]);
    expect(again.error).toBeNull();
  });
});
