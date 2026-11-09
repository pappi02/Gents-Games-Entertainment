# Security — The Gents Games & Entertainment

Applies to the public website, admin dashboard, database, media uploads, and enquiry workflow. Cross-reference [ARCHITECTURE_AND_DATA.md](ARCHITECTURE_AND_DATA.md) and [DATABASE.md](DATABASE.md).

## 1. Authentication & Sessions

- Secure password hashing using a maintained algorithm, or delegate to a trusted identity provider.
- Secure, `HttpOnly`, appropriately configured `SameSite` cookies.
- Session expiry, logout invalidation, and session rotation after authentication or privilege changes.
- Rate limits on login and password recovery.
- **No default administrator credentials in production.**

## 2. Authorisation

- Enforce roles and record ownership **on the server** — never in the client only.
- Protect all admin API endpoints, server actions, file operations, and exports.
- Deny unauthorised requests even when endpoints are called manually/directly.
- Prevent privilege escalation via client-supplied role or user IDs.

### Admin Roles Matrix

| Capability | Super admin | Content editor | Enquiry staff |
|---|---|---|---|
| Manage games/categories | ✅ | ✅ | ❌ |
| Edit pricing | ✅ | Optional configurable permission | ❌ |
| Publish events/promotions | ✅ | ✅ (if authorised) | ❌ |
| Ticket sales, discounts, refunds, door check-in | See [EVENT_TICKETING.md](EVENT_TICKETING.md) §6 | See §6 | Door check-in only |
| View/manage enquiries | ✅ | Optional | ✅ |
| Manage administrators | ✅ | ❌ | ❌ |
| View audit logs | ✅ | ❌ | ❌ |
| Change security settings | ✅ | ❌ | ❌ |

**Deny-by-default.** Every sensitive operation is authorised server-side; hiding a UI button is never an access-control mechanism.

## 3. Input & Application Security

- Validate all input using explicit schemas (server-side, always — client-side validation is UX only).
- Use parameterised database operations (no string-concatenated SQL).
- Escape/sanitise rich text before rendering.
- Apply CSRF protections where the auth model requires them.
- Use safe redirects; never expose stack traces to public users.
- Apply sensible content-security and browser-security headers.

## 4. Media Upload Protection

- Allowlist supported formats; validate actual file content (not just extension/MIME header).
- Limit file size and image dimensions.
- Generate storage names server-side — never trust user-supplied filenames.
- Prevent executable uploads and unsafe SVG handling.
- Use access-controlled upload operations; keep private files in non-public storage.
- Strip unnecessary metadata where appropriate.

## 5. Data & Infrastructure

- Least-privilege database credentials.
- Separate development, staging, and production secrets.
- Encrypted transport and provider-supported encryption at rest.
- Tested backups and restoration procedures.
- Dependency vulnerability checks and patch management.
- No sensitive personal data in logs, analytics, or client-side bundles.

## 6. Enquiry Abuse Protection

Layered protection rather than a single CAPTCHA:

- Rate limits per IP or another suitable abuse signal.
- Honeypot or time-based bot checks where appropriate.
- Optional challenge-based verification when abuse warrants it.
- Request-size limits and strict field validation.
- Generic responses that avoid revealing whether private records exist.
- Appropriate retention/deletion procedures for personal information.
- Avoid permanent IP blocking from a single failed request — account for shared networks/mobile carriers.

## 6a. Event Tickets

Ticket forgery, duplication, payment confirmation and download protection, including what they do not stop, are covered in [EVENT_TICKETING.md](EVENT_TICKETING.md) §4–§5.

## 7. Security Verification Checklist (pre-production, minimum)

- [ ] Unauthenticated access attempted on every admin route and API.
- [ ] Attempts to access/modify other administrators' records.
- [ ] Privilege escalation and session-invalidation tests.
- [ ] SQL injection and stored/reflected XSS tests.
- [ ] CSRF tests where applicable.
- [ ] Malicious file uploads and content-type spoofing tests.
- [ ] Rate-limit enforcement verified.
- [ ] Secrets-leakage check in client bundles and logs.
- [ ] Dependency vulnerability scan.
- [ ] Backup restoration and migration recovery test.

**Do not claim the site is "secure" merely because this checklist has been run** — record actual test results and any unresolved risks. See [TESTING.md](TESTING.md) for the broader QA process this feeds into.

## 8. Privacy & Legal Compliance Notes

(Full detail belongs in a legal review; this is an implementation-obligations checklist, not a legal determination.)

- Publish a privacy notice: what's collected, why, retention period, visitor rights.
- Collect only data necessary to respond to enquiries.
- Establish lawful handling under the applicable Kenyan data-protection framework.
- Verify whether ODPC registration is required for this business's circumstances.
- Define retention/deletion procedures for enquiries, admin accounts, logs, backups.
- Disclose third-party providers (email, hosting, analytics, media) where relevant.
- Obtain consent before deploying non-essential tracking technologies, where required.
- Keep promotional claims and photographs authorised and non-misleading.
- Review legal requirements for any future prize competitions, wagering, or age-restricted activities **before** introducing them — real-money gambling/wagering is explicitly out of scope for v1.
