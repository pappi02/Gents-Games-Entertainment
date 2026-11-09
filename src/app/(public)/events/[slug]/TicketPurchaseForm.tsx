"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { formatMoney } from "@/lib/public/format";
import { quoteTickets, startTicketCheckout, type CheckoutField, type CheckoutState, type Quote } from "./actions";

const initialState: CheckoutState = { error: null, fieldErrors: {} };

type Props = {
  slug: string;
  ticketTypeId: string;
  ticketName: string;
  unitPrice: number;
  currency: string;
  maxQuantity: number;
  isDemo?: boolean;
};

export function TicketPurchaseForm({ slug, ticketTypeId, ticketName, unitPrice, currency, maxQuantity, isDemo = false }: Props) {
  const [state, formAction, pending] = useActionState(startTicketCheckout, initialState);
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [checking, startChecking] = useTransition();
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.error) alertRef.current?.focus();
  }, [state]);

  const subtotal = unitPrice * quantity;
  const applied = quote && !quote.error && quote.code ? quote : null;
  const total = applied ? applied.total : subtotal;
  const err = (field: CheckoutField) => state.fieldErrors[field];

  function applyCode(forQuantity = quantity, forCode = code) {
    if (!forCode.trim()) {
      setQuote(null);
      return;
    }
    startChecking(async () => setQuote(await quoteTickets(ticketTypeId, forQuantity, forCode.trim())));
  }

  return (
    <form action={formAction} className="form" noValidate>
      {state.error && (
        <div ref={alertRef} tabIndex={-1} role="alert" className="form-alert form-alert-error">
          <strong>{state.error}</strong>
        </div>
      )}

      <input type="hidden" name="ticket_type_id" value={ticketTypeId} />
      <input type="hidden" name="slug" value={slug} />
      <div className="visually-hidden" aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="field">
        <label htmlFor="quantity" className="field-label">
          {ticketName} tickets
        </label>
        <select
          id="quantity"
          name="quantity"
          className="input"
          value={quantity}
          onChange={(e) => {
            const next = Number(e.target.value);
            setQuantity(next);
            // The discount can depend on the total, so check it again.
            if (quote?.code) applyCode(next, quote.code);
          }}
          aria-invalid={err("quantity") ? true : undefined}
        >
          {Array.from({ length: maxQuantity }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        {err("quantity") && <p className="field-error">{err("quantity")}</p>}
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="buyer_name" className="field-label">
            Name for your tickets
          </label>
          <input
            id="buyer_name"
            name="buyer_name"
            className="input"
            maxLength={80}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={err("buyer_name") ? true : undefined}
            aria-describedby={`buyer_name-hint${err("buyer_name") ? " buyer_name-error" : ""}`}
          />
          <p id="buyer_name-hint" className="field-hint">
            Any name you like. It doesn&apos;t need to match an ID.
          </p>
          {err("buyer_name") && (
            <p id="buyer_name-error" className="field-error">
              {err("buyer_name")}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="buyer_email" className="field-label">
            Email
          </label>
          <input
            id="buyer_email"
            name="buyer_email"
            type="email"
            className="input"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={err("buyer_email") ? true : undefined}
            aria-describedby={`buyer_email-hint${err("buyer_email") ? " buyer_email-error" : ""}`}
          />
          <p id="buyer_email-hint" className="field-hint">
            Must be real. Your tickets are sent here.
          </p>
          {err("buyer_email") && (
            <p id="buyer_email-error" className="field-error">
              {err("buyer_email")}
            </p>
          )}
        </div>
      </div>

      <div className="field">
        <label htmlFor="discount_code" className="field-label">
          Discount code <span className="optional">(optional)</span>
        </label>
        <div className="discount-row">
          <input
            id="discount_code"
            name="discount_code"
            className="input"
            maxLength={32}
            autoComplete="off"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setQuote(null);
            }}
          />
          <button type="button" className="btn btn-secondary" disabled={checking || !code.trim()} onClick={() => applyCode()}>
            {checking ? "Checking…" : "Apply"}
          </button>
        </div>
        <p className="visually-hidden" aria-live="polite">
          {applied ? `Discount applied. New total ${formatMoney(applied.total, currency)}.` : quote?.error ?? ""}
        </p>
        {quote?.error && <p className="field-error">{quote.error}</p>}
        {applied && <p className="field-hint">Code {applied.code} applied.</p>}
      </div>

      <dl className="ticket-summary">
        <div>
          <dt>
            {quantity} × {formatMoney(unitPrice, currency)}
          </dt>
          <dd>{formatMoney(subtotal, currency)}</dd>
        </div>
        {applied && (
          <div>
            <dt>Discount ({applied.code})</dt>
            <dd>−{formatMoney(applied.discount, currency)}</dd>
          </div>
        )}
        <div className="ticket-summary-total">
          <dt>Total</dt>
          <dd>{formatMoney(total, currency)}</dd>
        </div>
      </dl>

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
          <span>
            I confirm I am 18 or older and accept the{" "}
            <Link href="/terms#tickets" className="text-link">
              ticket terms
            </Link>
            .
          </span>
        </label>
        {err("age_confirm") && (
          <p id="age_confirm-error" className="field-error">
            {err("age_confirm")}
          </p>
        )}
      </div>

      <div className="btn-row form-actions">
        <button type="submit" className="btn btn-primary" disabled={pending || checking} aria-disabled={pending || checking}>
          {pending && <span className="spinner" aria-hidden="true" />}
          {pending ? "Holding your tickets…" : "Continue to payment"}
        </button>
        <p className="subtle">
          {isDemo
            ? "Sample event: the next step is a simulated payment and no money moves."
            : "Pay securely with M-Pesa or card on Paystack. Tickets are held for 15 minutes."}
        </p>
      </div>
      <p className="visually-hidden" aria-live="polite">
        {pending ? "Holding your tickets" : ""}
      </p>
    </form>
  );
}
