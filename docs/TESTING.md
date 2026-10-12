# Testing — The Gents Games & Entertainment

Covers functional QA, accessibility, performance, and the pre-launch verification process. Cross-reference [SECURITY.md](SECURITY.md) §7 for the security-specific test checklist.

## 1. Accessibility (target: WCAG 2.2 AA)

Treat AA as the acceptance goal; actual conformance is only established through testing, not by following a checklist alone.

- Semantic HTML and logical heading hierarchy.
- Full keyboard navigation and visible focus indicators.
- Sufficient text/interface contrast.
- Accessible labels, instructions, and error messages for forms.
- Correct focus management in dialogs, menus, validation flows.
- Alt text for meaningful images; empty alt text for decorative images.
- **No colour-only indication of facility status.**
- Reduced-motion support (`prefers-reduced-motion`).
- Responsive layouts with text zoom and reflow support.
- Accessible table structures and status announcements.
- No automatic audio playback.
- Touch controls with practical target sizes and spacing.
- Accessible CAPTCHA alternatives where a challenge is used.

**Method:** combine automated tooling with manual keyboard navigation, zoom/reflow checks, and manual screen-reader testing. Automated tools alone cannot establish full conformance.

## 2. Performance Budgets

| Metric | Target |
|---|---|
| Largest Contentful Paint | ≤ 2.5s |
| Interaction to Next Paint | ≤ 200ms |
| Cumulative Layout Shift | ≤ 0.1 |
| Lighthouse performance (representative public pages) | 90+ |

These are diagnostic targets, not guarantees of real-user performance — actual results depend on hosting, device, network, and content. Verify in a production-like environment, not just locally.

Checks to run:
- Image sizing/format audit (responsive, modern formats, no oversized hero assets).
- Lazy-loading verified for below-the-fold images; hero image not deferred.
- Layout-shift audit (reserved media dimensions).
- Admin table/catalogue pagination under realistic data volume.
- Query plan / index check against actual access patterns.

## 3. Security Test Pass

Run the full checklist in [SECURITY.md](SECURITY.md) §7 before production (auth bypass, privilege escalation, injection/XSS, CSRF, malicious uploads, rate limits, secrets leakage, dependency scan, backup restore). Record actual results and any unresolved risks — do not mark "secure" without evidence.

## 4. Functional / Facility-Accuracy Testing

Because facility accuracy is the core product principle (see [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) §2), explicitly test:

- A `draft` game never appears in public catalogue, search, sitemap, or nav.
- A `coming_soon` game never shows an enquire-as-if-available state.
- An `unavailable` game's enquiry action is hidden or clearly explained.
- Publishing/unpublishing/facility-status changes correctly invalidate any cache.
- No price is ever rendered without an active, verified `pricing_options` record.
- Enquiry submission: validates server-side, writes inside a transaction, generates a unique reference, returns acknowledgement only after durable write, and survives a simulated email-provider outage without losing the stored enquiry.
- 404 behaviour for nonexistent games/events; redirects work for changed slugs.

## 5. Cross-Device / Responsive Testing

Test at the three target breakpoints (640px, 768px, 1024px) plus common real devices:

- Mobile: single-column hero, horizontal filters, stacked forms, tappable actions.
- Tablet: two-column cards, flexible nav.
- Desktop: editorial hero, 3–4 column grids, full gallery.

## 6. SEO Verification

- Unique title + meta description per published game/category/event/core page.
- Sitemap contains only canonical, published pages (no drafts, no admin routes).
- `robots.txt` correctly excludes admin routes (noting this is not a security control).
- No indexed duplicate/low-value filtered URL combinations.
- Structured data only emitted when the underlying facts are verified and match visible content.

## 7. Pre-Launch Verification Checklist

- [ ] Brand name, logo, visual identity confirmed.
- [ ] Physical address, directions, contacts, opening hours verified.
- [ ] Full facilities inventory confirmed against actual venue.
- [ ] Planned/unavailable/discontinued activities identified and correctly flagged.
- [ ] Rates and charging units approved per priced activity.
- [ ] Game descriptions, rules, restrictions, imagery approved.
- [ ] Group events/tournaments offering confirmed.
- [ ] Admin accounts, permissions, email, media storage configured.
- [ ] Privacy, terms, and legal requirements reviewed.
- [ ] Security, accessibility, mobile, and production tests completed and recorded.
