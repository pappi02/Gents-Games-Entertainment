# Design System — The Gents Games & Entertainment

## 1. Visual Direction

**A modern gentlemen's recreation club.** Confident, contemporary, built around real recreation, social connection, and friendly competition. The site must read as a credible physical venue — not a casino, a generic gaming portal, or an AI-generated landing page.

**Style keywords:** Bold & refined · Editorial layout · Premium, adult-oriented recreation-club aesthetic.

## 2. Colour Tokens (proposed — validate before implementation)

| Token | Value | Role |
|---|---|---|
| Charcoal | `#141414` | Primary dark background |
| Graphite | `#252525` | Secondary dark surface |
| Accent red | `#B8202E` | Accent only — never a background for long text |
| Warm white | `#F4F1EA` | Light surfaces, primary text on dark |

These are design tokens, not confirmed brand specifications — validate contrast ratios before implementation, and treat red as an accent, not a body-text background.

## 3. Typography & Branding

- Compact wordmark: **The Gents Games & Entertainment.**
- Distinct logo and favicon — separate from the sister brand's identity.
- Restrained pairing: strong display typography for headers + highly readable body text.
- Alternate darker editorial sections with lighter content areas where it improves readability.

## 4. Photography

- Use genuine venue photography as it becomes available.
- Use **clearly labelled placeholders** during development — never present fabricated/stock venue photos as authentic.
- Cinematic photography is fine for featured activities, but the whole site should not read as overly dark.

## 5. Layout Principles

- Strong typography, generous spacing, large real-world photography.
- Responsive game cards and filters that work comfortably on mobile.
- Avoid: excessive gradients, decorative dividers, oversized icons, generic stock-photo grids, cluttered layouts.
- Keep interactions fast, consistent, keyboard-accessible, and comfortable on small screens.
- Animations restrained; **respect `prefers-reduced-motion`** — never rely on animation to convey information.

## 6. Responsive Breakpoints

Use the existing framework's conventions if one is already in place. If starting fresh:

- **640px** — mobile → small tablet
- **768px** — tablet
- **1024px** — desktop

| Viewport | Layout notes |
|---|---|
| Mobile | Single-column hero, horizontal category filters where appropriate, stacked forms, easily tapped actions |
| Tablet | Two-column cards, flexible navigation |
| Desktop | Editorial hero layouts, 3–4 column catalogue grids where space permits, expansive venue gallery |

These are implementation defaults, not a universal standard — fluid sizing between breakpoints.

## 7. Global Navigation

- **Desktop:** Home, Games, Events, The Venue, Groups, Visit Us.
- **Mobile:** compact menu with a clearly visible "Explore Games" action.
- **Footer:** verified contact details, location, opening hours, key page links, privacy/terms links, discreet sister-brand link (The Gents Playhouse).

## 8. Homepage Section Structure

1. **Hero** — "Your Game. Your People. Your Space." Primary CTA: Explore Games. Secondary CTA: Plan Your Visit.
2. **Game Categories** — cards for Cue Sports, Board & Strategy, Table Games, Cards, Video Gaming, Social Entertainment. Only show categories that contain published activities.
3. **Featured Activities** — 3–6 verified activities, each with name, short description, real/placeholder image, facility status, link to detail page.
4. **The Experience** — atmosphere, group experience, equipment, recreation options. No unsupported promises (privacy, luxury, refreshments, exclusivity) unless verified.
5. **Events** — only shown when dates/details/status are confirmed; otherwise hidden or a factual empty state.
6. **Visit & Enquire** — invite enquiries about facilities, prices, group visits; verified contact options and directions.

## 9. Game/Category Card Requirements

- Consistent aspect ratio across activity-card images.
- Clear facility-status indicator — **never colour-only** (accessibility requirement, see [TESTING.md](TESTING.md)).
- Name, short description, status, link to detail page.

## 10. Accessibility-Linked Design Rules

(Full accessibility requirements in [TESTING.md](TESTING.md).)

- Sufficient text/interface contrast at all token combinations.
- Visible keyboard focus indicators.
- No colour-only status indication.
- Accessible touch target sizes and spacing.
- Alt text for meaningful images; empty alt for decorative images.
