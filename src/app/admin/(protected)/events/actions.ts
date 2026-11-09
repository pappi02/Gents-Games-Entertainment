"use server";

import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin/session";
import { demoModeEnabled } from "@/lib/tickets/demo";
import { kesToMinorUnits, nairobiInputToUtc, slugify } from "@/lib/tickets/format";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

const EDITORS = ["super_admin", "content_editor"] as const;
const POSTER_TYPES = ["image/jpeg", "image/png", "image/webp"];
// Under Vercel's 4.5 MB function request limit, so uploads fail here with a clear message.
const POSTER_MAX_BYTES = 4 * 1024 * 1024;

function back(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function refresh(eventId?: string) {
  revalidatePath("/admin/events");
  if (eventId) revalidatePath(`/admin/events/${eventId}/edit`);
  updateTag("events");
}

async function uniqueSlug(supabase: Awaited<ReturnType<typeof createClient>>, title: string) {
  const base = slugify(title) || "event";
  const { data } = await supabase.from("events").select("id").eq("slug", base).maybeSingle();
  return data ? `${base}-${crypto.randomUUID().slice(0, 6)}` : base;
}

/**
 * Creates or updates an event, its poster and its ticket type. New events start
 * as drafts with sales closed: going public and opening sales are separate steps.
 * A published slug is kept when the title changes, so existing links keep working.
 */
export async function saveEvent(eventId: string | null, formData: FormData) {
  const profile = await requireRole([...EDITORS]);
  const formPath = eventId ? `/admin/events/${eventId}/edit` : "/admin/events/new";
  const text = (name: string) => String(formData.get(name) ?? "").trim();

  const title = text("title");
  const description = text("description");
  const startAt = nairobiInputToUtc(text("start_at"));
  const endRaw = text("end_at");
  const endAt = endRaw ? nairobiInputToUtc(endRaw) : null;

  if (!title || !description || !startAt) back(formPath, "Title, description and start time are required.");
  if (endRaw && !endAt) back(formPath, "The end time isn't valid.");
  if (endAt && endAt < startAt) back(formPath, "The event can't end before it starts.");

  // Ticket details are all-or-nothing. With none, the event stays enquiry-only.
  const ticketName = text("ticket_name");
  const priceRaw = text("ticket_price");
  const quantityRaw = text("ticket_quantity");
  const wantsTickets = Boolean(priceRaw || quantityRaw);
  const price = priceRaw ? kesToMinorUnits(priceRaw) : null;
  const quantity = quantityRaw ? Number(quantityRaw) : null;
  const maxPerOrder = Number(text("ticket_max_per_order") || 10);
  const salesStartRaw = text("ticket_sales_start");
  const salesEndRaw = text("ticket_sales_end");
  const salesStart = salesStartRaw ? nairobiInputToUtc(salesStartRaw) : null;
  const salesEnd = salesEndRaw ? nairobiInputToUtc(salesEndRaw) : null;

  if (wantsTickets) {
    if (!ticketName) back(formPath, "Give the ticket a name.");
    if (price === null || price < 1000) back(formPath, "Enter a ticket price of at least KES 10.");
    if (!Number.isInteger(quantity) || quantity === null || quantity < 1) back(formPath, "Enter how many tickets are available.");
    if (!Number.isInteger(maxPerOrder) || maxPerOrder < 1 || maxPerOrder > 50) back(formPath, "Tickets per order must be 1 to 50.");
    if ((salesStartRaw && !salesStart) || (salesEndRaw && !salesEnd)) back(formPath, "A sales date isn't valid.");
    if (salesStart && salesEnd && salesEnd <= salesStart) back(formPath, "Sales must end after they start.");
  }

  // Validate the poster before anything is written.
  const poster = formData.get("poster") as File | null;
  let posterBytes: Buffer | null = null;
  if (poster && poster.size > 0) {
    if (!POSTER_TYPES.includes(poster.type)) back(formPath, "The poster must be a JPEG, PNG or WebP image.");
    if (poster.size > POSTER_MAX_BYTES) back(formPath, "The poster is too large (max 4 MB).");
    // Re-encoding strips metadata such as phone GPS and rejects files that aren't really images.
    try {
      posterBytes = await sharp(Buffer.from(await poster.arrayBuffer()))
        .rotate()
        .resize({ width: 1400, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      back(formPath, "That file isn't a readable image.");
    }
  }

  const supabase = await createClient();
  const fields = {
    title,
    description,
    start_at: startAt,
    end_at: endAt,
    location_note: text("location_note") || null,
    registration_instructions: text("registration_instructions") || null,
    poster_alt: text("poster_alt") || null,
  };

  let id = eventId;
  if (id) {
    const { error } = await supabase.from("events").update(fields).eq("id", id);
    if (error) back(formPath, error.message);
  } else {
    const { data, error } = await supabase
      .from("events")
      .insert({ ...fields, slug: await uniqueSlug(supabase, title), created_by: profile.id, is_demo: demoModeEnabled() })
      .select("id")
      .single();
    if (error || !data) back(formPath, error?.message ?? "Couldn't create the event.");
    id = data.id as string;
  }
  const editPath = `/admin/events/${id}/edit`;

  if (posterBytes) {
    const storagePath = `${id}/${crypto.randomUUID()}.webp`;
    const { error: uploadError } = await supabase.storage.from("event-media").upload(storagePath, posterBytes, {
      contentType: "image/webp",
      cacheControl: "31536000",
    });
    if (uploadError) back(editPath, `Event saved, but the poster failed: ${uploadError.message}`);

    const { data: existing } = await supabase.from("events").select("poster_path").eq("id", id).single();
    const { error: linkError } = await supabase.from("events").update({ poster_path: storagePath }).eq("id", id);
    if (linkError) back(editPath, linkError.message);
    if (existing?.poster_path) await supabase.storage.from("event-media").remove([existing.poster_path]);
  }

  if (wantsTickets) {
    const ticketFields = {
      name: ticketName,
      description: text("ticket_description") || null,
      price_minor_units: price,
      quantity_total: quantity,
      max_per_order: maxPerOrder,
      sales_start_at: salesStart,
      sales_end_at: salesEnd,
    };
    const { data: existingType } = await supabase.from("ticket_types").select("id").eq("event_id", id).maybeSingle();
    const { error } = existingType
      ? await supabase.from("ticket_types").update(ticketFields).eq("id", existingType.id)
      : await supabase.from("ticket_types").insert({ ...ticketFields, event_id: id });
    if (error) back(editPath, error.message);
  }

  await supabase.from("audit_logs").insert({
    actor_id: profile.id,
    action: eventId ? "event.updated" : "event.created",
    entity_type: "event",
    entity_id: id,
    summary: title,
  });

  refresh(id!);
  redirect("/admin/events");
}

/** Clears sample orders and anything created during a demo. Real data is untouched. */
export async function resetDemoData() {
  await requireRole(["super_admin"]);
  if (!demoModeEnabled()) redirect("/admin/events");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_reset_demo");
  if (error) back("/admin/events", error.message);
  refresh();
}

export async function updateEventStatus(eventId: string, status: "draft" | "published" | "archived") {
  const profile = await requireRole([...EDITORS]);
  const supabase = await createClient();
  const { error } = await supabase.from("events").update({ publication_status: status }).eq("id", eventId);
  if (error) back("/admin/events", error.message);

  // Taking an event off the site also stops its sales.
  if (status !== "published") {
    await supabase.from("ticket_types").update({ sales_status: "closed" }).eq("event_id", eventId);
  }
  await supabase.from("audit_logs").insert({
    actor_id: profile.id,
    action: `event.${status}`,
    entity_type: "event",
    entity_id: eventId,
  });
  refresh(eventId);
}

export async function setTicketSales(eventId: string, salesStatus: "on_sale" | "closed") {
  const profile = await requireRole([...EDITORS]);
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("ticket_types")
    .update({ sales_status: salesStatus }, { count: "exact" })
    .eq("event_id", eventId);
  if (error) back("/admin/events", error.message);
  if (!count) back("/admin/events", "Add ticket details to this event first.");

  await supabase.from("audit_logs").insert({
    actor_id: profile.id,
    action: salesStatus === "on_sale" ? "ticket_sales.opened" : "ticket_sales.closed",
    entity_type: "event",
    entity_id: eventId,
  });
  refresh(eventId);
}

/**
 * Stops sales and tells the public. Existing tickets stop admitting at the door.
 * It moves no money: refunds are made in Paystack, then recorded per order.
 */
export async function cancelEvent(eventId: string) {
  const profile = await requireRole([...EDITORS]);
  const supabase = await createClient();
  await supabase.from("ticket_types").update({ sales_status: "closed" }).eq("event_id", eventId);
  const { error } = await supabase.from("events").update({ cancelled_at: new Date().toISOString() }).eq("id", eventId);
  if (error) back("/admin/events", error.message);

  await supabase.from("audit_logs").insert({
    actor_id: profile.id,
    action: "event.cancelled",
    entity_type: "event",
    entity_id: eventId,
  });
  refresh(eventId);
}
