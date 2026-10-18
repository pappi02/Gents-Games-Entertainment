"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitPublicEnquiry, type EnquiryField, type EnquiryState } from "./actions";

const initialState: EnquiryState = { error: null, fieldErrors: {}, values: {} };

type Props = {
  enquiryType: "game" | "event" | "group" | "general" | "membership";
  hidden: Record<string, string>;
  messageHint: string;
  showPartySize: boolean;
};

export function EnquiryForm({ enquiryType, hidden, messageHint, showPartySize }: Props) {
  const [state, formAction, pending] = useActionState(submitPublicEnquiry, initialState);
  const alertRef = useRef<HTMLDivElement>(null);

  // Move focus to the error summary so keyboard and screen-reader users
  // land on what needs fixing.
  useEffect(() => {
    if (state.error) alertRef.current?.focus();
  }, [state]);

  const v = state.values;
  const err = (f: EnquiryField) => state.fieldErrors[f];
  const describedBy = (f: EnquiryField, hint?: string) =>
    [hint, err(f) ? `${f}-error` : null].filter(Boolean).join(" ") || undefined;

  return (
    <form action={formAction} className="form" noValidate>
      {state.error && (
        <div ref={alertRef} tabIndex={-1} role="alert" className="form-alert form-alert-error">
          <strong>{state.error}</strong>
          {Object.keys(state.fieldErrors).length > 0 && (
            <ul>
              {Object.entries(state.fieldErrors).map(([field, message]) => (
                <li key={field}>
                  <a href={`#${field}`} className="text-link">
                    {message}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <input type="hidden" name="enquiry_type" value={enquiryType} />

      <Field id="contact_name" label="Your name" error={err("contact_name")}>
        <input
          id="contact_name"
          name="contact_name"
          className="input"
          autoComplete="name"
          required
          maxLength={120}
          defaultValue={v.contact_name}
          aria-invalid={err("contact_name") ? true : undefined}
          aria-describedby={describedBy("contact_name")}
        />
      </Field>

      <div className="form-row">
        <Field id="contact_phone" label="Phone" hint="We'll use this to call or WhatsApp you back." error={err("contact_phone")}>
          <input
            id="contact_phone"
            name="contact_phone"
            type="tel"
            className="input"
            autoComplete="tel"
            inputMode="tel"
            placeholder="+254 7XX XXX XXX"
            defaultValue={v.contact_phone}
            aria-invalid={err("contact_phone") ? true : undefined}
            aria-describedby={describedBy("contact_phone", "contact_phone-hint")}
          />
        </Field>
        <Field id="contact_email" label="Email" optional hint="Optional if you've given a phone number." error={err("contact_email")}>
          <input
            id="contact_email"
            name="contact_email"
            type="email"
            className="input"
            autoComplete="email"
            defaultValue={v.contact_email}
            aria-invalid={err("contact_email") ? true : undefined}
            aria-describedby={describedBy("contact_email", "contact_email-hint")}
          />
        </Field>
      </div>

      <div className="form-row">
        <Field id="preferred_contact_method" label="Preferred contact method">
          <select
            id="preferred_contact_method"
            name="preferred_contact_method"
            className="input"
            defaultValue={v.preferred_contact_method ?? "either"}
          >
            <option value="either">No preference</option>
            <option value="call">Phone call</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </Field>
        {showPartySize && (
          <Field id="party_size" label="Number of people" optional error={err("party_size")}>
            <input
              id="party_size"
              name="party_size"
              type="number"
              inputMode="numeric"
              min={1}
              className="input"
              defaultValue={v.party_size}
              aria-invalid={err("party_size") ? true : undefined}
              aria-describedby={describedBy("party_size")}
            />
          </Field>
        )}
      </div>

      <Field id="message" label="Your message" hint={messageHint} error={err("message")}>
        <textarea
          id="message"
          name="message"
          className="input"
          rows={5}
          required
          maxLength={2000}
          defaultValue={v.message}
          aria-invalid={err("message") ? true : undefined}
          aria-describedby={describedBy("message", "message-hint")}
        />
      </Field>

      <div className="field-checkbox">
        <label htmlFor="age_confirm">
          <input
            id="age_confirm"
            name="age_confirm"
            type="checkbox"
            required
            aria-invalid={err("age_confirm") ? true : undefined}
            aria-describedby={err("age_confirm") ? "age_confirm-error" : undefined}
          />
          <span>I confirm I am 18 years of age or older. This is an 18+ venue.</span>
        </label>
        {err("age_confirm") && (
          <p id="age_confirm-error" className="field-error">
            {err("age_confirm")}
          </p>
        )}
      </div>

      <div className="btn-row form-actions">
        <button type="submit" className="btn btn-primary" disabled={pending} aria-disabled={pending}>
          {pending && <span className="spinner" aria-hidden="true" />}
          {pending ? "Sending…" : "Send enquiry"}
        </button>
        <p className="subtle">An enquiry isn&apos;t a booking — the team will reply to confirm.</p>
      </div>
      <p className="visually-hidden" aria-live="polite">
        {pending ? "Sending your enquiry" : ""}
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  optional = false,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label} {optional && <span className="optional">(optional)</span>}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
