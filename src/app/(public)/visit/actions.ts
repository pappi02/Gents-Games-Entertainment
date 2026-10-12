"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const VALID_TYPES = ["game", "event", "group", "general"];
const VALID_CONTACT_METHODS = ["call", "whatsapp", "either"];

/**
 * Public enquiry submission. Uses the same cookie-aware anon-safe client as
 * every other public read — the actual security boundary is the
 * `submit_enquiry` RPC's design (supabase/migrations/*_submit_enquiry_rpc.sql):
 * it inserts and returns only a reference, never granting SELECT on
 * `enquiries` to anon. Server-side validation here is a first line of
 * defense (clear error messages); the RPC's own NOT NULL/CHECK constraints
 * are the last line, per docs/ARCHITECTURE_AND_DATA.md §9.
 */
export async function submitPublicEnquiry(formData: FormData) {
  const contactName = String(formData.get("contact_name") ?? "").trim();
  const contactPhone = String(formData.get("contact_phone") ?? "").trim() || null;
  const contactEmail = String(formData.get("contact_email") ?? "").trim() || null;
  const preferredContactMethod = String(formData.get("preferred_contact_method") ?? "").trim() || null;
  const enquiryType = String(formData.get("enquiry_type") ?? "general");
  const message = String(formData.get("message") ?? "").trim();
  const relatedGameId = String(formData.get("related_game_id") ?? "").trim() || null;
  const relatedEventId = String(formData.get("related_event_id") ?? "").trim() || null;
  const gameSlug = String(formData.get("game_slug") ?? "").trim();
  const eventSlug = String(formData.get("event_slug") ?? "").trim();
  const partySizeRaw = String(formData.get("party_size") ?? "").trim();
  const partySize = partySizeRaw ? Number(partySizeRaw) : null;

  const redirectBase = "/visit";
  const context = gameSlug
    ? `&game=${encodeURIComponent(gameSlug)}`
    : eventSlug
      ? `&event=${encodeURIComponent(eventSlug)}`
      : "";

  if (!contactName) {
    redirect(`${redirectBase}?error=${encodeURIComponent("Please enter your name.")}${context}`);
  }
  if (!contactPhone && !contactEmail) {
    redirect(`${redirectBase}?error=${encodeURIComponent("Please provide a phone number or email.")}${context}`);
  }
  if (!message) {
    redirect(`${redirectBase}?error=${encodeURIComponent("Please enter a message.")}${context}`);
  }
  if (!VALID_TYPES.includes(enquiryType)) {
    redirect(`${redirectBase}?error=${encodeURIComponent("Invalid enquiry type.")}${context}`);
  }
  if (preferredContactMethod && !VALID_CONTACT_METHODS.includes(preferredContactMethod)) {
    redirect(`${redirectBase}?error=${encodeURIComponent("Invalid contact method.")}${context}`);
  }
  if (partySize !== null && (!Number.isFinite(partySize) || partySize < 1)) {
    redirect(`${redirectBase}?error=${encodeURIComponent("Enter a valid party size.")}${context}`);
  }

  const supabase = await createClient();
  const { data: reference, error } = await supabase.rpc("submit_enquiry", {
    p_contact_name: contactName,
    p_message: message,
    p_enquiry_type: enquiryType,
    p_contact_phone: contactPhone,
    p_contact_email: contactEmail,
    p_preferred_contact_method: preferredContactMethod,
    p_related_game_id: relatedGameId,
    p_related_event_id: relatedEventId,
    p_party_size: partySize,
  });

  if (error) {
    redirect(`${redirectBase}?error=${encodeURIComponent("Something went wrong — please try calling or WhatsApp instead.")}${context}`);
  }

  redirect(`${redirectBase}?submitted=${encodeURIComponent(reference as string)}`);
}
