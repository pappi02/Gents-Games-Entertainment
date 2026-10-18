"use server";

import { createClient } from "@/lib/supabase/server";
import { getMembershipTierBySlug } from "@/lib/public/queries";
import { redirect } from "next/navigation";

const VALID_TYPES = ["game", "event", "group", "general", "membership"];
const VALID_CONTACT_METHODS = ["call", "whatsapp", "either"];
const TOPICS: Record<string, string> = { events: "Upcoming events" };

export type EnquiryField = "contact_name" | "contact_phone" | "contact_email" | "message" | "party_size" | "age_confirm";

export type EnquiryState = {
  error: string | null;
  fieldErrors: Partial<Record<EnquiryField, string>>;
  values: Record<string, string>;
};

/**
 * Public enquiry submission, used via useActionState so a validation error
 * keeps what the visitor typed and points at the field to fix. Uses the
 * same cookie-aware anon-safe client as every other public read — the
 * actual security boundary is the `submit_enquiry` RPC's design
 * (supabase/migrations/*_submit_enquiry_rpc.sql): it inserts and returns
 * only a reference, never granting SELECT on `enquiries` to anon.
 * Server-side validation here is a first line of defense (clear error
 * messages); the RPC's own NOT NULL/CHECK constraints are the last line,
 * per docs/ARCHITECTURE_AND_DATA.md §9.
 */
export async function submitPublicEnquiry(_prev: EnquiryState, formData: FormData): Promise<EnquiryState> {
  const text = (name: string) => String(formData.get(name) ?? "").trim();

  const contactName = text("contact_name");
  const contactPhone = text("contact_phone") || null;
  const contactEmail = text("contact_email") || null;
  const preferredContactMethod = text("preferred_contact_method") || null;
  const enquiryType = text("enquiry_type") || "general";
  const rawMessage = text("message");
  const relatedGameId = text("related_game_id") || null;
  const relatedEventId = text("related_event_id") || null;
  const topic = TOPICS[text("topic")] ?? null;
  const membershipTierSlug = enquiryType === "membership" ? text("membership_tier") : "";
  const partySizeRaw = text("party_size");
  const partySize = partySizeRaw ? Number(partySizeRaw) : null;
  const ageConfirmed = formData.get("age_confirm") === "on";

  const values = {
    contact_name: contactName,
    contact_phone: contactPhone ?? "",
    contact_email: contactEmail ?? "",
    preferred_contact_method: preferredContactMethod ?? "either",
    message: rawMessage,
    party_size: partySizeRaw,
  };

  const fieldErrors: EnquiryState["fieldErrors"] = {};
  if (!contactName) fieldErrors.contact_name = "Please enter your name.";
  if (contactName.length > 120) fieldErrors.contact_name = "Please keep your name under 120 characters.";
  if (!contactPhone && !contactEmail) fieldErrors.contact_phone = "Please give a phone number or an email address.";
  if (contactPhone && !/^[+\d][\d\s()-]{6,19}$/.test(contactPhone))
    fieldErrors.contact_phone = "Enter a valid phone number, e.g. +254 7XX XXX XXX.";
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))
    fieldErrors.contact_email = "Enter a valid email address.";
  if (!rawMessage) fieldErrors.message = "Please enter a message.";
  if (rawMessage.length > 2000) fieldErrors.message = "Please keep your message under 2,000 characters.";
  if (partySize !== null && (!Number.isInteger(partySize) || partySize < 1 || partySize > 500))
    fieldErrors.party_size = "Enter the number of people as a whole number.";
  if (!ageConfirmed) fieldErrors.age_confirm = "Please confirm you're 18 or over — this is an 18+ venue.";

  if (!VALID_TYPES.includes(enquiryType) || (preferredContactMethod && !VALID_CONTACT_METHODS.includes(preferredContactMethod))) {
    return { error: "Something about this form was invalid — please reload the page and try again.", fieldErrors, values };
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Please check the highlighted fields.", fieldErrors, values };
  }

  // The tier is resolved server-side from published tiers, so a tampered
  // hidden field can't put an arbitrary label in front of staff.
  const tier = membershipTierSlug ? await getMembershipTierBySlug(membershipTierSlug) : null;
  const prefix = tier
    ? `[Membership: ${tier.name}]`
    : enquiryType === "membership"
      ? "[Membership]"
      : topic
        ? `[Topic: ${topic}]`
        : null;
  const message = prefix ? `${prefix}\n${rawMessage}` : rawMessage;

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
    return {
      error: "We couldn't send your enquiry just now. Please try again, or call or WhatsApp us instead.",
      fieldErrors: {},
      values,
    };
  }

  redirect(`/visit?submitted=${encodeURIComponent(reference as string)}#enquiry`);
}
