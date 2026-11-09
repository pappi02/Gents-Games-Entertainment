# Event Ticketing

Online ticket sales for events: posters, one ticket type per event, discount codes, Paystack payments, signed QR tickets, guarded PDF downloads and door check-in. The owner explicitly requested this, so it overrides the "no online payments" exclusion for **event tickets only**. Games, bookings and membership remain enquiry-only.

## 1. Decisions

| Area | Decision |
|---|---|
| Payments | Paystack hosted checkout: M-Pesa and cards. The business absorbs fees. |
| Email | Resend. Ticket emails carry a private link, not the QR code. |
| Ticket types | One per event in the UI, default name "Gentleman Experience". The schema already allows several. |
| Buyer details | Any name, plus a real email. No phone number, national ID or real name is collected or checked. |
| Discounts | Percent or fixed KES off the order total, one code per order, optionally per event, with dates and a use limit. Can't reduce an order below KES 10. |
| Refunds | Manual. Refund in Paystack, then record it in admin. Terms say non-refundable unless the event is cancelled. |
| Not built | Multiple ticket tiers in the UI, automated WhatsApp/SMS tickets, automatic refunds, free tickets, offline door scanning. |

## 2. Go-live checklist

Sales stay switched off, and the site shows tickets as not on sale, until `PAYSTACK_SECRET_KEY`, the signing keys and `SUPABASE_SERVICE_ROLE_KEY` are all set.

1. **Database migration:** `supabase/migrations/20261109120000_event_ticketing.sql` is already applied to the live project (2026-11-09). Apply it first on any new environment, because the code needs it.
2. **Signing keys:** run `node scripts/generate-ticket-keys.mjs` once per environment and store the output in the host's secret settings. Back up the production values somewhere safe: losing the private key means new tickets can't be signed and issued tickets can't be re-downloaded.
3. **Paystack:** create the account and put the secret key in `PAYSTACK_SECRET_KEY`. Set the webhook URL to `<site>/api/webhooks/paystack`. Confirm with Paystack that M-Pesa is enabled, and what the KES minimum charge is (the code assumes KES 10 is safe).
4. **Resend:** verify a sending domain, then set `EMAIL_PROVIDER_API_KEY` and `EMAIL_FROM_ADDRESS`.
5. **Site URL:** set `NEXT_SITE_URL` to the real public HTTPS address before issuing a single ticket. QR codes contain it, so a wrong value produces tickets that scan to the wrong place.
6. **Test mode, end to end:** with `sk_test_` keys, make a test event and buy a ticket with M-Pesa and with a card. Download the PDF, scan it on a phone signed in as door staff, admit it, and scan it again to see it refused.
7. **Legal:** have the terms and privacy changes reviewed, and ask an accountant about VAT and receipts. Neither has been checked.
8. **Go live:** switch to the `sk_live_` key and make one real low-value purchase.

## 3. How a sale works

1. `/events/[slug]`: the buyer chooses a quantity, name, email and optional code. Availability is read live, uncached.
2. `reserve_ticket_order` locks the ticket type, recalculates the price from the database and holds the tickets for 15 minutes. Holds expire by time alone, so no background job is needed.
3. The buyer pays on Paystack's page. Their browser gets an HttpOnly session cookie for that order.
4. `syncOrderPayment` is the only path to tickets. The webhook, the return page and the admin re-check button all use it, and it always asks Paystack directly, so neither a forged request nor a redirect can mark an order as paid.
5. `confirm_ticket_payment` checks the amount and currency and issues the tickets. Repeats do nothing. A wrong amount, a payment for a cancelled order or event, or a late payment with no tickets left becomes `needs_review`, issues nothing and is shown to staff.
6. The buyer gets a private link by email. Email failure doesn't lose the order: the tickets exist, staff see the failure and can resend.

## 4. Ticket security

**Unique ID:** `GG-XXXX-XXXX-XXXX`, 60 random bits, generated in the database with a unique constraint.

**Signature:** Ed25519 through Node's crypto module, over the ticket's internal ID, ticket ID, event, ticket type, name and issue time.

**QR code:** `https://<site>/verify/1.<keyId>.<ticket ID>.<signature>`. It carries no personal data. Verification rebuilds the signed message from the database record, so a QR code must have a valid signature *and* match a live record. Signatures are never stored, so a database leak yields no working QR codes.

**Downloads:** the emailed link alone reveals nothing. Tickets and PDFs need a session cookie, which the checkout browser already has, or which another device gets with a 6-digit code sent to the buyer's email. Codes expire in 10 minutes, allow 5 tries and are rate-limited. PDFs are generated per request, sent with `no-store`, never kept, and each download is logged.

**Check-in:** `admin_check_in_ticket` locks the ticket row, so only the first of any number of simultaneous scans admits. It also rejects used and cancelled tickets, cancelled events, and any time outside 12 hours before the start to 6 hours after the end. Typed IDs must match the selected event, and the screen says the signature wasn't checked.

**Database guards:** nothing can `INSERT` a ticket except `confirm_ticket_payment` and `admin_replace_ticket`, including the service role. Triggers stop the signed ticket fields and order amounts changing, stop used or cancelled tickets changing status, and stop tickets being deleted.

## 5. What this does not stop

- **A copy used first.** A PDF or screenshot can always be copied. With no ID check, whoever presents a valid ticket first gets in, and the real holder is refused. A leak reported before use can be fixed with cancel-and-reissue.
- **Resale.** Passing on the PDF works by design.
- **Control of the buyer's email.** Whoever has it can request a download code.
- **Theft of the signing key.** It could sign tokens, but they would still need to match a real ticket record to pass. See §7.
- **A super admin or anyone with database owner access.** Actions are logged, but this is detective rather than preventive: the database owner can disable triggers.
- **Bots holding tickets from many addresses.** Rate limits, the per-order cap and the 15-minute hold reduce this but don't eliminate it. Add a challenge such as Turnstile if abuse appears.

The PDF's printed signature block can be imitated, so it isn't the check. **The scan is the check**, and door staff must always scan or type the ID rather than glance at a ticket. Check-in needs internet access: an offline scanner couldn't prevent the same ticket being used at two doors, so have a backup connection.

The signature is a security feature. Whether it meets any legal definition of an electronic signature in Kenya hasn't been checked, and tickets don't depend on that.

## 6. Roles

| Capability | Super admin | Content editor | Enquiry staff |
|---|---|---|---|
| Create events, posters, ticket details, open/close sales, cancel | ✅ | ✅ | ❌ |
| See orders, buyers, revenue; export CSV; resend email; re-check payment | ✅ | ✅ | ❌ |
| Create and manage discount codes | ✅ | ❌ | ❌ |
| Record refunds, reissue tickets, correct a buyer's email | ✅ | ❌ | ❌ |
| Door check-in | ✅ | ✅ | ✅ |

## 7. Operations

**Scanning at the door:** sign in to the admin on a phone once. The phone camera's QR link opens `/verify/...`, which shows staff the name and an **Admit guest** button. The public sees the same page without the button and with the name masked. `/admin/check-in` has running counts and typed entry.

**Rotating the signing key** (do this if the key may have leaked):
1. Add the old key's public half to `TICKET_SIGNING_RETIRED_PUBLIC_KEYS` as `oldId:base64`, so issued tickets keep working. The generator printed this line; if it wasn't kept, derive it from the old private key. **If the key leaked, leave it out instead**, and reissue tickets for upcoming events: already-downloaded QR codes then stop working.
2. Run the generator with a new ID, such as `k2`, and set the new `TICKET_SIGNING_KEY_ID` and `TICKET_SIGNING_PRIVATE_KEY`. Keep `TICKET_ACCESS_SECRET` unless it leaked too, because changing it breaks links already emailed.

**A buyer paid but has no tickets:** look for **Needs review** on the event's Sales page. Either refund in Paystack and record it, or for a pending order use **Re-check payment**.

**Cancelling an event** stops sales and door admission and marks it cancelled publicly. It doesn't email buyers or move money: export the CSV, contact buyers, refund in Paystack and record each refund.

**Rate limit rows** in `ticket_rate_limits` clean themselves up.

## 8. Known limits

- Resend's free plan allows 100 emails a day. Ticket and code emails share it, so a busy launch may need a paid plan.
- The order page shows up to 1,000 orders per event.
- Partial refunds aren't modelled: recording a refund covers the whole order.
- Poster uploads are capped at 4 MB to stay under the host's request limit.
- Retention periods for ticket data still need deciding (docs/SECURITY.md §8).

## 9. Test evidence

`npm test` runs in CI: signature forgery and tampering, access tokens, the webhook signature, money and time parsing, CSV formula injection, PDF generation, and the real migrations on PGlite (sales limits, discounts, payment confirmation, check-in, tamper guards and role permissions).

PGlite has a single connection, so parallel behaviour was tested separately, once, on a temporary multi-connection PostgreSQL server (2026-11-09), using the same migration:

| Scenario | Result |
|---|---|
| 200 simultaneous buyers, 50 tickets | 50 reserved, 50 tickets issued |
| 120 simultaneous mixed-quantity orders, 37 tickets | 37 held |
| 100 simultaneous buyers, code limited to 10 uses | 10 used |
| The same payment notification 50 times at once | Issued once, 3 of 3 tickets |
| The same ticket scanned 30 times at once | 1 admitted, 29 refused |
| 20,000 generated ticket IDs | All unique |

The migration was applied to the live project on 2026-11-09. On that database, the public API was refused access to orders, tickets, discount codes and internal functions. Poster storage accepted WebP, rejected SVG and refused public uploads. A full sale with a discount, payment confirmation and double scan as a real admin passed inside a transaction that was rolled back.

**Not yet tested:** a real Paystack payment, real email delivery, a real phone scanning a printed ticket, and the admin screens and checkout clicked through by a person with real data. These need the accounts in §2.
