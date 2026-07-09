---
name: Chelsea Commons
description: Warm editorial paper-and-ink system for a NYC builders' community
colors:
  cream: "#f2f1e8"
  surface-cream: "#f7f6ee"
  ink: "#2b2b2b"
  faded-ink: "#6b6a62"
  stone: "#e8e6da"
  hairline: "#dcd9c9"
  sage-ring: "#a3a091"
  signal-red: "#e7000b"
typography:
  display:
    fontFamily: "Playfair Display Variable, Georgia, serif"
    fontWeight: 500
    fontSize: "clamp(2.5rem, 6vw, 4.5rem)"
    lineHeight: 1.1
    letterSpacing: "normal"
  headline:
    fontFamily: "Neue Montreal, Helvetica Neue, sans-serif"
    fontWeight: 500
    fontSize: "1.5rem"
    lineHeight: 1.3
  body:
    fontFamily: "Neue Montreal, Helvetica Neue, sans-serif"
    fontWeight: 400
    fontSize: "1rem"
    lineHeight: 1.6
  label:
    fontFamily: "Neue Montreal, Helvetica Neue, sans-serif"
    fontWeight: 500
    fontSize: "0.875rem"
    letterSpacing: "0.01em"
  mono:
    fontFamily: "Geist Mono, Menlo, monospace"
    fontWeight: 400
    fontSize: "0.875rem"
rounded:
  none: "0px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
spacing:
  gutter-mobile: "24px"
  gutter-desktop: "48px"
  section: "64px"
  stack: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    rounded: "{rounded.none}"
    height: "36px"
    padding: "0 14px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "#2b2b2be6"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    height: "36px"
    padding: "0 14px"
    typography: "{typography.label}"
  button-outline-hover:
    backgroundColor: "{colors.stone}"
  card:
    backgroundColor: "{colors.surface-cream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: Chelsea Commons

## 1. Overview

**Creative North Star: "The Common Room"**

The system is a shared living room in a Chelsea brownstone rendered as a website: warm paper walls, dark ink, photographs pinned up, partner logos drifting past like conversation. Everything sits on one continuous cream surface (#f2f1e8) with soft charcoal ink (#2b2b2b) — no pure white, no pure black — so the whole site reads as a single printed object rather than a stack of app screens. The serif italic wordmark against square, uppercase sans buttons gives it the collegiate-editorial tension of young people borrowing old forms and making them their own.

The system explicitly rejects SaaS startup-landing mechanics (hero metrics, feature grids, gradient CTAs), hacker-house terminal aesthetics (neon-on-dark, hustle energy), and sterile luxury-beige minimalism. Warmth is carried by photography (halftone hero treatments, candid event photos) and voice — the cream field is the paper it's printed on, not the personality itself.

**Key Characteristics:**
- One continuous cream paper surface; depth from hairline borders, not shadows
- Serif italic reserved for identity moments; workhorse grotesque (Neue Montreal) everywhere else
- Square-cornered, uppercase-labeled buttons; rounded corners reserved for imagery and cards
- Photography-led: halftone treatments, candid event photos, marquee logo strips
- Quiet, brief motion: 0.3s fades, infinite marquees, blur-recede hover states

## 2. Colors

A two-voice palette — warm paper and dark ink — with a band of tinted neutrals between them; the only saturated color on the site is reserved for destructive/error states.

### Primary
- **Ink** (#2b2b2b): The workhorse. All body text, headings, the wordmark, primary button fill, and inverted text selection. A soft charcoal, never pure black, so type sits *in* the paper rather than on it.

### Neutral
- **Cream** (#f2f1e8): The body background of every page, including the `<html>` element itself. This is the paper the whole site is printed on.
- **Surface Cream** (#f7f6ee): Cards and popovers — a half-step lighter than the page, read as a sheet laid on the desk.
- **Stone** (#e8e6da): Secondary/muted fills and hover washes (outline-button hover, ghost hover).
- **Faded Ink** (#6b6a62): Muted supporting text. Passes AA on Cream for body sizes; do not lighten it further.
- **Hairline** (#dcd9c9): All borders, dividers, and input strokes. The structural line-work of the whole system.
- **Sage Ring** (#a3a091): Focus rings only.

### Tertiary
- **Signal Red** (#e7000b, canonically `oklch(0.577 0.245 27.325)`): Destructive actions and error states only. The single saturated *UI* color in the system; its rarity is the point.
- **The Ember** (footer-only gradient: #2d1f3d → #4a1942 → #c94c4c → #f4a261 → #e76f51 → #8b5cf6): The warm glow rising behind the footer wordmark — heavily blurred (20px), 70% opacity, masked to the bottom 60%, under a grain overlay. These six colors exist *only* inside this one effect.

### Named Rules
**The Ember Rule.** The footer's aurora gradient is the site's single sanctioned burst of saturated color — the fire at the end of the evening. It appears once, in the footer send-off, always blurred and masked, never as sharp-edged UI color. Do not reuse its hues for buttons, links, backgrounds, or accents anywhere else; everywhere outside the footer, Signal Red remains the only saturated color.

**The One Paper Rule.** Every page shares the same cream field — no alternating white/gray section stripes, no dark-mode sections dropped into the scroll. Section rhythm comes from hairline top-borders and spacing, never background changes.

**The Inverted Selection Rule.** Text selection flips the palette (ink background, cream text). It's a signature micro-detail; keep it.

## 3. Typography

**Display Font:** Playfair Display Variable (with Georgia fallback)
**Body Font:** Neue Montreal (with Helvetica Neue / system sans fallback)
**Label/Mono Font:** Geist Mono (code and technical fragments only)

**Character:** A high-contrast literary serif played against a cool Canadian grotesque — the editorial pairing of a magazine masthead over newsprint. Playfair appears *sparingly and usually in italic* (the wordmark, select display moments); Neue Montreal does everything else in four weights (300/400/500/700, with true italics).

### Hierarchy
- **Display** (Playfair 500 italic, clamp(2.5rem, 6vw, 4.5rem), 1.1): Identity moments — the wordmark and hero headlines. If serif appears more than once or twice per viewport, it's overused.
- **Headline** (Neue Montreal 500, 1.5rem, 1.3): Section headings ("FAQ", page titles).
- **Body** (Neue Montreal 400, 1rem, 1.6): Prose, FAQ answers, descriptions. Cap at 65–75ch.
- **Label** (Neue Montreal 500, 0.875rem, +0.01em): Buttons and nav items, set in UPPERCASE as literal copy ("EVENTS FORM", "ABOUT"). Uppercase is reserved for these short wayfinding labels.
- **Mono** (Geist Mono 400, 0.875rem): Inline code and technical fragments in writing posts only. Never decorative.

### Named Rules
**The Rare Serif Rule.** Playfair is the brand's signature, and signatures appear once. Wordmark, hero, maybe a pull-quote — everything else is Neue Montreal.

**The Uppercase-Is-Wayfinding Rule.** All-caps is only for short navigational labels (nav links, buttons). Never for headings or body copy.

## 4. Elevation

Flat by default. Depth is conveyed by hairline borders (#dcd9c9), the half-step between Cream and Surface Cream, and masked fades on scrollable regions — not by shadows. A soft ambient shadow vocabulary exists in the tokens but is used sparingly, mainly for floating surfaces (dialogs, popovers, toasts).

### Shadow Vocabulary
- **Ambient rest** (`box-shadow: 0px 4px 12px -2px hsl(0 0% 0% / 0.1)`): The 2xs/xs step; barely-there lift for small floating elements.
- **Floating surface** (`box-shadow: 0px 4px 12px -2px hsl(0 0% 0% / 0.2), 0px 4px 6px -3px hsl(0 0% 0% / 0.2)`): The lg step; dialogs and popovers.

### Named Rules
**The Border-First Rule.** If you're reaching for a shadow to separate two static regions, use a hairline border instead. Shadows are for things that float above the paper, and paper rarely floats.

## 5. Components

### Buttons
- **Shape:** Square — sharp corners (0px radius, explicitly `rounded-none`). This is deliberate and load-bearing against the soft palette.
- **Primary:** Ink fill (#2b2b2b), Cream text, 36px height, 14px horizontal padding, uppercase label copy, 500 weight, 0.875rem.
- **Hover / Focus:** Primary fades to 90% ink opacity; focus shows a 1px Sage ring (`ring-1`, #a3a091). Transitions on all properties.
- **Outline:** Transparent fill, Hairline border (#dcd9c9), Ink text; hover washes with Stone (#e8e6da). The default nav-bar button.
- **Sizes:** xs (24px) / sm (32px) / default (36px) / lg (40px) / xl (48px), plus square icon sizes.

### Cards / Containers
- **Corner Style:** Gently rounded (10px, `--radius`) — cards and imagery may round; buttons may not.
- **Background:** Surface Cream (#f7f6ee) on the Cream page.
- **Shadow Strategy:** None at rest; hairline border instead (see Elevation).
- **Internal Padding:** 24px.

### Inputs / Fields
- **Style:** Hairline stroke (#dcd9c9), transparent or Surface Cream fill.
- **Focus:** Sage ring (#a3a091) at 50% opacity, 1px.
- **Error:** Signal Red border and ring at reduced opacity (`aria-invalid` driven).

### Navigation
- **Style:** Sticky top bar on the Cream field, serif-italic wordmark "CHELSEA COMMONS" left, outline + primary buttons right. Page gutters: 24px mobile / 48px desktop.
- **Mobile:** Hamburger (three 24px ink bars animating to an X) opening a full-screen Cream overlay with 2.25rem centered links; hover shifts to Faded Ink.
- **Links (in prose):** Ink text with underline-on-hover, 300ms color transition. Opt out with `.no-underline`.

### Accordion (FAQ)
- Hairline-divided rows, single-open behavior, Neue Montreal 500 questions with body-weight answers in a two-column grid on desktop.

### Halftone Hero Image (signature component)
- Event/hero photography passed through a halftone dot treatment — the print-shop gesture that keys the whole editorial identity. Prefer it for large hero imagery over raw photos.

### Logo Strip (signature component)
- Partner/brand logos in an infinite CSS marquee (`translateX(0 → -50%)`, 20s linear). Duplicate the content once for the seamless loop; pause or stop under `prefers-reduced-motion`.

### Polaroid Reel (signature component)
- Event photos as prints pinned to a board: Surface Cream frames (square image, deep bottom margin), hairline borders, `shadow-sm`, alternating ±1.25–2.5° tilts with small vertical nudges, a Stone tape tab at top, and a lowercase mono caption (`event — date`) in the bottom margin. No hover effects — the prints just sit there, pinned. Still a horizontal snap scroller. The closing frame is an empty polaroid that doesn't have a caption.

### The Connection Plate (easter egg)
- Michelangelo's Creation of Adam hands (public domain crop, `/assets/creation-of-adam.jpg`) through the halftone shader, living on the 404 page above "Nothing at this address" — two hands not quite connecting. No caption, no joke copy — the image carries it. The site's single art-history gesture; do not add siblings or promote it to a main surface.

### The Paper Grain
- A fixed full-viewport grain overlay (`body::after`, `/grain.avif` tiled at 200px, opacity 0.05, `--z-grain` above everything, `pointer-events: none`) so the cream field reads as paper stock rather than a flat hex value. Ink and imagery sit "under" it, like print. Tune only the opacity; never animate it.

## 6. Do's and Don'ts

### Do:
- **Do** keep every page on the single Cream field (#f2f1e8) — section rhythm comes from hairline top-borders (`border-t`, #dcd9c9) and 64px vertical padding.
- **Do** keep buttons square (0px radius) with uppercase 0.875rem labels; keep cards and imagery gently rounded (10px). The contrast is the system.
- **Do** reserve Playfair italic for identity moments (wordmark, hero) and let Neue Montreal carry everything else.
- **Do** lead with photography — halftone hero treatments, candid event photos, real partner logos. People are the proof.
- **Do** keep motion brief and quiet: 0.3s ease fades with ~15px rise, triggered once per element; marquees linear and slow.
- **Do** provide `prefers-reduced-motion` alternatives for every animation (marquee, aurora, scroll reveals, velocity text).

### Don't:
- **Don't** import SaaS startup-landing mechanics — hero metrics, feature grids, gradient CTAs, "Join 10,000+ builders" counters (PRODUCT.md anti-reference).
- **Don't** drift toward hacker-house tropes — terminal aesthetics, neon-on-dark, monospace-as-personality (PRODUCT.md anti-reference). Geist Mono is for code, not costume.
- **Don't** let the palette go sterile-luxury-beige — if a section has no photograph, no person, and no voice, the cream field alone will read as an empty template (PRODUCT.md anti-reference).
- **Don't** use pure white (#ffffff) or pure black (#000000) anywhere; the palette's warmth lives in the offsets.
- **Don't** round button corners or add colored side-stripe borders to cards, callouts, or list items.
- **Don't** lighten Faded Ink (#6b6a62) or set body copy in it at sizes below 1rem — it's the AA floor, not a starting point.
- **Don't** introduce new saturated colors; Signal Red is the only saturated UI color ("destructive"), and The Ember gradient lives only in the footer (see The Ember Rule).
