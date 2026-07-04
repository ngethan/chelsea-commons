---
target: /
total_score: 25
p0_count: 0
p1_count: 3
timestamp: 2026-07-02T21-06-10Z
slug: src-routes-index-tsx
---
Method: dual-agent (A: ab60991517f7bb317 · B: adf13e0b47017c274). Browser visualization skipped — no browser automation tool exposed; deterministic evidence is CLI detector only.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Scrollbars hidden globally; load-splash has no progress indication |
| 2 | Match System / Real World | 3 | "EVENTS FORM" is system-speak — names an artifact, not an action |
| 3 | User Control and Freedom | 2 | Photo gallery can't be swiped/scrolled — chevrons are the only path; CTA hard-redirects off-site |
| 4 | Consistency and Standards | 2 | One action, three names (EVENTS FORM / "interest form" / /rsvp); wordmark styled 3 ways; `hover:text-black` breaks no-pure-black rule |
| 5 | Error Prevention | 2 | Primary CTA lands on raw Google Form with `edit_requested=true` editor param; no external-link cues |
| 6 | Recognition Rather Than Recall | 3 | Mobile hides every CTA behind the hamburger |
| 7 | Flexibility and Efficiency | 2 | Logo links are moving targets inside a marquee; no skip link; no keyboard path through gallery |
| 8 | Aesthetic and Minimalist Design | 4 | Disciplined paper system; only lapse is the footer aurora |
| 9 | Error Recovery | 2 | Real 404 exists, but zero error boundaries around the WebGL hero |
| 10 | Help and Documentation | 3 | Strong 10-question FAQ; but "follow us" points at a dead placeholder twitter.com link |
| **Total** | | **25/40** | **Acceptable — visual design is strong; losses are interaction plumbing** |

## Anti-Patterns Verdict

**Not slop at first glance — but component-library fingerprints show on inspection.** A designer wouldn't say "AI made this" in five seconds; they might say "magic-ui made parts of this" in five minutes.

**LLM assessment.** Genuine personality: the halftone WebGL hero (SSR-guarded, brand-keyed, with an img fallback) is a real signature; the One Paper Rule is actually held in code (hairline `border-t` rhythm, inverted selection, no section stripes); the copy has a voice ("Not in the intense, mandatory-events way"). No side-stripes, no gradient text, no hero metrics, no 01/02/03 scaffolding. The tells: **the uniform reveal reflex is fully present** — ten-plus instances of the identical `opacity 0→1, y 15→0, 0.3s` whileInView fade on every element of every section; a **shadcn token dump** (chart colors, sidebar palette, full unused `.dark` theme, `--font-sans: Geist` contradicting the actual Neue Montreal body) left in `styles.css`; and stock magic-ui-style flourishes (aurora footer, scroll-velocity marquee).

**Deterministic scan.** 6 findings, all one rule (`design-system-color`), all one line — `Footer.tsx:74`, the aurora gradient's six hex colors (`#2d1f3d #4a1942 #c94c4c #f4a261 #e76f51 #8b5cf6`), none in the design system. Zero false positives. The detector independently corroborates the review's judgment that the footer aurora is the system's one palette violation.

**Visual overlays.** Not available this run — no browser automation tool exposed; evidence is CLI-only.

## Overall Impression

The visual system is real and largely faithfully implemented — this page reads authored, which is rare. What drags it down is interaction plumbing and trust plumbing: a carousel that can't be scrolled, one action wearing three names before dumping users onto an unbranded Google Form, and placeholder content (stock photos with invented dates, a dead twitter.com link, a stray personal resume in `public/`) sitting on exactly the surfaces a diligence-minded sponsor inspects. The single biggest opportunity: fix the credibility surfaces and give the "three doors" real handles.

## What's Working

1. **The system is implemented, not just specced.** One cream field, hairline section rhythm, square uppercase buttons vs. rounded imagery, inverted selection, AA-passing muted text (#6b6a62 on #f2f1e8 ≈ 4.8:1).
2. **The halftone hero is a real brand asset with real engineering** — lazy module load, img fallback, capped pixel count.
3. **The marquee is performance-literate** — IntersectionObserver + visibilitychange pauses, ResizeObserver-derived copy count.

## Priority Issues

- **[P1] The event photo gallery cannot be scrolled by users.** `EventPhotos.tsx:110` uses `overflow-hidden`; swipe and wheel do nothing; the only path through six photos is two ~41px chevrons in dead thumb territory. On mobile it reads as broken. **Fix:** `overflow-x-auto` + scroll-snap, keep mask and chevrons as secondary, bump buttons ≥44px. **Suggested command:** /impeccable adapt
- **[P1] One action, three names, and the primary CTA is a raw Google Form.** "EVENTS FORM" (nav), "interest form" (hero), `/rsvp` (route) all lead to a Google Form still carrying `edit_requested=true` (`rsvp.tsx:6`). Highest-emphasis button on the site describes an artifact, then bounces users off-brand with no bridge. **Fix:** one name everywhere ("RSVP" / "Get invited"), strip the editor param, add one sentence of bridge copy. **Suggested command:** /impeccable clarify
- **[P1] Placeholder content on the credibility surfaces.** Three of six "Past events" photos are stock/house shots with fabricated dates (`EventPhotos.tsx:6-34`, the TODO admits it); footer + JSON-LD `sameAs` link to bare `https://twitter.com`; `public/Ethan_Ng_Resume.pdf` is publicly served. Lands hardest on sponsors doing diligence. **Fix:** cut to real photos, fix or remove the Twitter link, delete the resume. **Suggested command:** /impeccable harden
- **[P2] No sponsor/partner door exists.** PRODUCT.md promises three doors; the page builds one and a half. The logo strip says "Our members work at" (employer proof, not a partnership invitation); sponsors' only move is reverse-engineering the footer email. **Fix:** one quiet line under the logo strip — "Host or sponsor an event with us → hey@chelseacommons.co". **Suggested command:** /impeccable clarify
- **[P2] Reduced motion is promised but not delivered.** No `MotionConfig reducedMotion="user"` anywhere; under PRM the marquee merely stops accelerating (`scroll-based-velocity.tsx:152` sets multiplier to 1) and scrolls forever. **Fix:** wrap the app in MotionConfig; render the marquee static under PRM. **Suggested command:** /impeccable audit
- **[P3] System violations bundle:** footer aurora's six undocumented saturated colors (detector-confirmed, `Footer.tsx:74`) vs. the "Signal Red only" rule; `hover:text-black` (`index.tsx:188`); globally hidden scrollbars; load-splash with no timeout cap (`__root.tsx:157`); unused dark/sidebar/chart tokens inviting drift. **Suggested command:** /impeccable polish

## Persona Red Flags

**Jordan (first-timer):** "EVENTS FORM" and "EVENTS" side by side — can't tell which gets them to a party; the filled button teleports to docs.google.com with zero Chelsea Commons branding (phishing-grade wrong turn); the cohort answer lives inside a collapsed accordion in a 10-item wall.

**Casey (distracted mobile):** zero visible CTA on mobile except a 32px hamburger (under 44px minimum) and one underlined text link; can't swipe the gallery at all; pays for WebGL shader + 352KB hero JPEG + two rAF marquees + a splash that blocks paint until `window.load`; mobile menu has no scroll lock, no focus trap, no `aria-expanded`.

**Riley (stress tester):** no error boundary around the lazy WebGL hero — a shader crash takes the homepage with it; a broken event photo renders as a bare stone rectangle with a floating date; if `window.load` never fires the splash never fades (no timeout). Credit: the dual-accordion shared-state is handled correctly.

**Sponsor/partner (project persona):** stock photos with invented dates on "Past events" is the fastest way to make diligence doubt everything; dead twitter.com link + stray personal resume read as "unfinished operation"; strong logo wall but no named humans anywhere despite "people are the proof," and no path labeled for them.

## Minor Observations

- Hero fallback `alt=""` on the page's primary photograph (`halftone-hero-image.tsx:25`) — deserves a real description.
- FAQ answers set at `text-sm` while DESIGN.md specifies 1rem body — the longest prose on the page is below system body size.
- Footer wordmark is Playfair roman (brand signature is italic) and `select-none` opts the biggest text out of the signature inverted selection.
- `min-h-[600px]` magic number papering over accordion layout shift (`index.tsx:95`).
- Nav's fixed-background-inside-clipPath trick is fragile; plain `bg-background` would do.
- `hosts` avatar in events.json is the favicon — visible on the events page.
- JSON-LD `sameAs: ["https://twitter.com"]` tells Google the org's profile is Twitter's homepage.

## Questions to Consider

1. Why does a house tour open with the rules sheet? The FAQ — the least sensory section — sits directly under the hero, ahead of every photo and logo. If "people are the proof," why does the proof come after the paperwork?
2. If a sponsor landed here with a budget tomorrow, what would they click? Is the absence of an answer a copy problem or an information-architecture problem?
3. The footer aurora is the page's most emotionally charged moment — and it's illegal under your own design system. Should the footer be reined in, or is the "one saturated color" rule stricter than the brand's actual heart?
