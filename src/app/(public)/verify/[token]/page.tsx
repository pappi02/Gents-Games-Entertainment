import type { Metadata } from "next";
import { getAdminProfile } from "@/lib/admin/session";
import { formatEventDate } from "@/lib/public/format";
import { clientIpHash, loadVerifiedTicket, maskName, withinRateLimit } from "@/lib/tickets/server";
import { DemoBanner } from "../../_components/DemoBanner";
import { Icon } from "../../_components/Icon";
import { PageTransition } from "../../_components/PageTransition";
import { admitScannedTicket } from "./actions";

export const instant = false;

export const metadata: Metadata = {
  title: "Verify ticket",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const RESULT_MESSAGE: Record<string, string> = {
  admitted: "Admitted. Let this guest in.",
  already_used: "Do not admit. This ticket has already been used.",
  cancelled: "Do not admit. This ticket has been cancelled.",
  event_cancelled: "Do not admit. This event was cancelled.",
  outside_window: "Do not admit. This ticket isn't valid at this time. Check the event date.",
  wrong_event: "Do not admit. This ticket is for a different event.",
  error: "Check-in failed. Nothing was recorded. Try again.",
};

function Result({ tone, title, children }: { tone: "ok" | "bad" | "warn"; title: string; children?: React.ReactNode }) {
  return (
    <div className={`verify-result verify-result-${tone}`} role="status">
      <Icon name={tone === "ok" ? "check" : "info"} />
      <div>
        <h1 className="heading-sm">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export default async function VerifyTicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ result?: string }>;
}) {
  const { token } = await params;
  const { result } = await searchParams;
  const profile = await getAdminProfile();

  // Door staff scan constantly from one connection, so only the public is limited.
  if (!profile && !(await withinRateLimit(`verify:${await clientIpHash()}`, 60, 300))) {
    return (
      <PageTransition>
        <main className="section theme-light">
          <div className="container container-narrow">
            <Result tone="warn" title="Too many checks">
              <p>Please wait a few minutes and try again.</p>
            </Result>
          </div>
        </main>
      </PageTransition>
    );
  }

  const verified = await loadVerifiedTicket(decodeURIComponent(token));

  if (!verified) {
    return (
      <PageTransition>
        <main className="section theme-light">
          <div className="container container-narrow">
            <Result tone="bad" title="Not a genuine ticket">
              <p>This QR code wasn&apos;t issued by The Gents Games &amp; Entertainment, or it has been altered. Do not admit.</p>
            </Result>
          </div>
        </main>
      </PageTransition>
    );
  }

  const { ticket, event, ticketTypeName } = verified;
  const when = formatEventDate(event.start_at, event.timezone);
  const usedAt = ticket.checked_in_at ? formatEventDate(ticket.checked_in_at, event.timezone) : null;
  const message = result ? RESULT_MESSAGE[result] : null;

  const summary = (
    <dl className="fact-list">
      <div>
        <dt>Event</dt>
        <dd>{event.title}</dd>
      </div>
      <div>
        <dt>Date</dt>
        <dd>
          {when.full}, {when.time}
        </dd>
      </div>
      <div>
        <dt>Ticket</dt>
        <dd>{ticketTypeName}</dd>
      </div>
      <div>
        <dt>Ticket ID</dt>
        <dd>{ticket.ticket_code}</dd>
      </div>
      <div>
        <dt>Name</dt>
        <dd>{profile ? ticket.holder_name : maskName(ticket.holder_name)}</dd>
      </div>
    </dl>
  );

  const status =
    ticket.status === "cancelled" ? (
      <Result tone="bad" title="Cancelled ticket">
        <p>This ticket was issued by us but is no longer valid.</p>
      </Result>
    ) : ticket.status === "used" ? (
      <Result tone="warn" title="Genuine ticket, already used">
        <p>Scanned at the door on {usedAt ? `${usedAt.full}, ${usedAt.time}` : "an earlier date"}. It can&apos;t be used again.</p>
      </Result>
    ) : event.cancelled_at ? (
      <Result tone="bad" title="Event cancelled">
        <p>This ticket is genuine, but its event was cancelled.</p>
      </Result>
    ) : (
      <Result tone="ok" title="Genuine ticket, valid">
        <p>The signature is verified and this ticket hasn&apos;t been used.</p>
      </Result>
    );

  return (
    <PageTransition>
      <main className="section theme-light">
        <div className="container container-narrow stack-lg">
          {event.is_demo && <DemoBanner />}
          {profile && message && (
            <p className={`verify-outcome ${result === "admitted" ? "verify-outcome-ok" : "verify-outcome-bad"}`} role="alert">
              {message}
            </p>
          )}
          {status}
          {summary}
          {profile && ticket.status === "valid" && !event.cancelled_at && (
            <form action={admitScannedTicket.bind(null, decodeURIComponent(token))}>
              <button type="submit" className="btn btn-primary verify-admit">
                Admit guest
              </button>
            </form>
          )}
          {!profile && (
            <p className="subtle">
              Only the first scan by our door staff admits a guest, so this check doesn&apos;t guarantee a ticket will still
              be unused at the door.
            </p>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
