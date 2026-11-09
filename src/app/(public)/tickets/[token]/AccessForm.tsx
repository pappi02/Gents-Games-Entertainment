"use client";

import { useActionState } from "react";
import { requestAccessCode, verifyAccessCode, type AccessState } from "./actions";

const initial: AccessState = { sent: false, error: null };

export function AccessForm({ token, maskedEmail }: { token: string; maskedEmail: string }) {
  const [requested, request, requesting] = useActionState(requestAccessCode.bind(null, token), initial);
  const [verified, verify, verifying] = useActionState(verifyAccessCode.bind(null, token), initial);
  const sent = requested.sent;
  const error = verified.error ?? requested.error;

  return (
    <div className="stack">
      <p className="muted">
        To protect your tickets, we&apos;ll email a one-time code to <strong>{maskedEmail}</strong>.
      </p>
      {error && (
        <div role="alert" className="form-alert form-alert-error">
          <strong>{error}</strong>
        </div>
      )}
      {sent && (
        <form action={verify} className="form">
          <div className="field">
            <label htmlFor="code" className="field-label">
              6-digit code
            </label>
            <input
              id="code"
              name="code"
              className="input"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
            />
            <p className="field-hint">The code expires in 10 minutes.</p>
          </div>
          <div className="btn-row">
            <button type="submit" className="btn btn-primary" disabled={verifying}>
              {verifying ? "Checking…" : "Open my tickets"}
            </button>
          </div>
        </form>
      )}
      <form action={request}>
        <button type="submit" className={sent ? "btn btn-secondary" : "btn btn-primary"} disabled={requesting}>
          {requesting ? "Sending…" : sent ? "Send a new code" : "Email me a code"}
        </button>
      </form>
    </div>
  );
}
