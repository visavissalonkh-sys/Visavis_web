# Visavis — Design System & Art Direction

**Status:** Approved 2026-09-27, with the 8 amendments below folded into the sections they affect. Phase 1 in progress.
**Scope:** public pages only — `/`, `/services`, `/services/[category]`, `/masters`, `/masters/[slug]`, `/locations`, `/reviews`. Booking wizard, auth, account, master/admin dashboards are untouched.
**Supersedes:** the cream/dark alternating palette and hover-panel treatment built earlier this session on the homepage sections. This is a clean creative reset for the public site, not an addition on top of it.

---

## 1. Concept

**Vis-à-vis — face to face.**

The salon's own name already contains the idea, so I'm not inventing a new one — I'm sharpening the one that's there and rejecting the alternative I considered (see below). Three mirrored relationships run through the whole site: the client and her master, sitting face to face; a woman and her reflection; the salon itself, a space built for the moment you meet your best version. Every section either stages a literal face-off (two masters, two locations, two lines of a headline) or asks the page to behave like a mirror (a reflection under the hero title, a line that draws itself down the center like a mirror's edge). The signature motion — a beam of light sliding across glass — is the one thing a mirror does that a photograph can't: it responds to you being there.

I considered a second idea — "the pause between steps," built around the quiet, held moments in a beauty routine (the towel settling, the chair turning, the exhale before a color reveal) — and rejected it. It's a nicer *mood* than "vis-à-vis," but it doesn't generate a *rule*. Mirror-and-light gives me a concrete answer for every section's composition (what faces what) and for the one motion signature (what the light does and why); "the pause" would have given me only a tone, and tone without a rule is exactly how the last three passes ended up as effects without an idea.

**How it shows up per section** (detailed in §6, summarized here so the concept reads as one throughline, not a slogan):

| Section | The face-off |
|---|---|
| Hero | Two halves of one headline, mirrored across a center line; the line's own reflection underneath |
| Manifesto | The reader and the text — words resolve at the reader's own scroll speed, not the page's |
| Services | The cursor and the service — the row you're closest to is the one that answers |
| Masters | Portrait and quote, pinned, facing each other; the *transition* between masters is a literal mirror-fold |
| Process | Client and process — four steps she watches unfold, not four cards she scans |
| Reviews | One voice at a time, given the whole screen — because you don't take a real compliment in a crowd |
| Locations | Two branches, split by a mirror line, genuinely symmetrical because they're genuinely equal offers |
| Final CTA | The invitation itself — no device, no complexity, just "we're waiting for you" |
| Footer | The name, said once, at full size — the wordmark *is* the mirror's frame |

---

## 2. Art direction

**Mood:** an editorial spread, not a product page. The reference points, in words:

- **Pacing & white space** — a *Vogue Italia* fashion spread: one image, one line of text, a lot of nothing, repeat. Never two competing focal points on one screen.
- **Light** — *Byredo* campaign photography: light as the subject, not the backdrop. Soft, directional, slightly warm. Never a hard specular "shine" effect — always a *glint*, something that could plausibly be a reflection off glass or a mirror's silvering.
- **Restraint** — *Aesop* retail and packaging: expensive because of what's *absent*. No badges, no countdown urgency, no stacked social proof. The gold accent behaves like Aesop's own brand color does in a store — present in exactly one or two places per room, never as wallpaper.
- **Typography as architecture** — large Cormorant Garamond used the way a museum wall label uses serif capitals: sparingly, at a size where the letterforms themselves are the decoration. Inter does all the work of being legible so Cormorant never has to.

**What this explicitly rules out** (the impeccable/craft-floor list, restated for this project): no eyebrow labels in caps, no decorative numbering, no oversized soft-shadow cards, no arrow-suffixed links, no hero stat-counter templates, no bento grids, no gradient-mesh blobs, no glassmorphism, no marquee/ticker text, no "AI-generated" bounce-in-from-everywhere entrances.

---

## 3. Design tokens

### 3.1 Color — two alternating themes, one accent

```css
/* Night — dark sections */
--night:        #0d0a08;   /* base */
--night-2:      #16120e;   /* raised surfaces (cards, inputs) */
--ink-light:    #f6f1e7;   /* primary text */
--ink-light-2:  #b9ae9c;   /* secondary text */

/* Morning — light sections */
--morning:      #f4eee4;   /* base */
--morning-2:    #ebe3d5;   /* raised surfaces */
--ink-dark:     #1a1510;   /* primary text */
--ink-dark-2:   #6b5d4b;   /* secondary text */

/* Accent — used sparingly, theme-aware */
--gold:         #b3a17c;   /* on night */
--gold-deep:    #83693a;   /* on morning — measured 4.54:1, see §5 for the failed #8b6f3e attempt */
--glint:        rgba(255, 248, 232, 0.9); /* the light-on-glass motion, not a static color */
```

**Rule:** gold covers ≤5% of any viewport — a hairline, a single word, a dot, never a fill. This is a hard constraint I'll check in the self-critique after every section, not a suggestion.

**Relationship to the existing token set:** `src/app/globals.css` currently defines `--color-bg`, `--color-accent`, and the cream tokens I added earlier this session (`--color-cream*`, `--color-on-cream*`). Phase 1 replaces these with the Night/Morning pair above under new `--color-*` names so the rest of the (untouched) app — booking wizard, account, admin — keeps working off the old tokens without a global rename forcing changes there too. Public-page components will read the new tokens exclusively.

### 3.2 Typography

- **Display — Cormorant Garamond.** Never below 28px. This is the one rule I'd fight hardest to keep: the moment Cormorant appears at body-text sizes, it stops being architecture and starts being a "fancy font" — which is the single fastest way to look like a template.
- **Text — Inter.** Everything functional: nav, buttons, form labels, prices, captions.
- **Scale (fluid, `clamp()`):** `12 / 14 / 16 / 20 / 28 / 44 / 72 / 120 / 200px`
- **Display headings:** `letter-spacing: -0.02em`, `line-height: 0.95–1.05`.
- **Italic Cormorant** is a tool for emphasis, not decoration — at most one italic passage per screen (the brief for this is already written into each section in §6, so it's not left to improvisation later).
- **No uppercase eyebrow labels**, ever. Uppercase is allowed only for small functional tags (a photo credit, a booking step number) and at most once per section.

### 3.3 Grid

- **Desktop:** 12 columns, 5vw margins, 24px gutter.
- **Mobile:** 4 columns, 20px margins.
- **Composition bias: asymmetric.** Heading on columns 1–7, image on 8–12 bleeding off the right edge. Symmetry is reserved for places where it *is* the content — Masters' portrait/quote pair, Locations' two branches — because a "vis-à-vis" that's symmetrical everywhere stops meaning anything.

### 3.4 Motion tokens

```css
--dur-micro:   180ms;   /* hover, focus */
--dur-ui:      320ms;   /* open/close, toggle */
--dur-reveal:  900ms;   /* section entrances */
--dur-hero:    1600ms;  /* hero intro sequence */

--ease-out:    cubic-bezier(0.16, 1, 0.3, 1);     /* things arriving */
--ease-inout:  cubic-bezier(0.65, 0, 0.35, 1);    /* things transitioning */
--ease-glint:  cubic-bezier(0.25, 0.1, 0.25, 1);  /* the light sweep */
```

**Rules, kept as a checklist against every animation I write, not as prose to skim:**
1. Only `transform` and `opacity` animate. Nothing else, ever — this is also what makes the 60fps mobile budget realistic.
2. Every animation has a one-sentence "why" in a code comment next to it. If I can't write the sentence, I delete the animation.
3. Scroll-triggered reveals fire once (`once: true` / toggleActions that don't reverse on scroll-back) — nothing re-plays or flickers as you scroll up and down past it.
4. `prefers-reduced-motion: reduce` collapses *everything* — hero sequence, pins, glint, transitions — to a plain 200ms fade. No exceptions, no "reduced but still kind of animated."

---

## 4. Signature interaction — "Glint" (Відблиск)

**The one thing.** A thin diagonal beam of light — `transparent → var(--glint) → transparent`, blended with `mix-blend-mode: soft-light` (`overlay` as a fallback where soft-light reads too harsh on Night) — sweeps once across a surface, the way a reflection moves across glass when you or the light shifts.

**Where it fires, and why each one earns its place:**
- **Hero headline, on load** — once, as part of the intro sequence: the "mirror" is being turned toward the light for the first time.
- **Master portrait, on hover** — the moment you look closer at someone, per the concept.
- **"Записатися" button, idle** — a single slow sweep every 8 seconds, barely-there. Not a loop that fights for attention; a sign of life on the one object we want a hand to eventually rest on. The loop pauses on `document.visibilitychange` (no point animating a backgrounded tab) and is skipped entirely under `prefers-reduced-motion` (not just slowed down — off).

Nowhere else. If I catch myself reaching for glint as a generic "make this feel premium" hover on a fourth thing, that's the effects-without-an-idea failure mode again — I'll flag it in that section's self-critique instead of shipping it.

**Implementation plan:**
- **Default / everywhere:** a CSS-only version — a pseudo-element with a `linear-gradient` mask, animated via GSAP tweening a custom property (`--glint-pos`) that drives `background-position` or a `transform: translateX()` on the pseudo-element. Cheap, GPU-friendly, works identically on the hero, portraits, and the button with one small reusable component (`<Glint trigger="load" | "hover" | "idle" />`).
- **Hero-only stretch goal:** if the CSS version feels flat once it's actually on screen, I'll prototype a WebGL version with `ogl` (chosen over three.js specifically for bundle size) *behind a CSS fallback that ships regardless* — never a WebGL-or-nothing hero. I will not build this speculatively; I'll decide after the CSS version is live and I can judge it against the real page, and I'll say plainly in that section's self-critique whether the upgrade was worth the complexity.
- This one component fully replaces the old `MagneticButton` and `CustomCursor` — they do not come back in any form.

---

## 5. Page as a story

Order and per-section direction (full detail in §6): **Hero (Night) → Manifesto (Morning) → Services Index (Night) → Masters (Morning) → Process (Night) → Reviews (Morning) → Locations (Night) → Final CTA (Morning) → Footer (Night).**

The Night/Morning alternation is itself the pacing device — a reader moves through a literal day-cycle from "meeting yourself" (night, hero) to "leaving inspired" (final CTA, morning) and back to a quiet close (night, footer).

**Transition mechanism — revised per round-1 review, then simplified further during Phase 1 build.** Animating `background-color` on `body` (my original plan) breaks the project's own motion rule (§3.4 — only `transform`/`opacity` animate) and, worse, guarantees a scroll position exists where the background is some interpolated night/morning blend while text still expects one endpoint's contrast ratio.

My first correction (still a valid approach, just not the one shipped) was two fixed layers crossfaded via scroll-triggered `opacity`. While building it, a plainer solution turned out to be strictly better and is what's actually implemented:

- **`<SectionTheme theme="night" | "morning">`** (`src/components/vv/SectionTheme.tsx`) — every section owns a genuinely solid `background` and fixed text color for its theme. Never interpolated, never scroll-scrubbed.
- **`<ThemeSeam from="night" to="morning" />`** (same file) — the seam between two sections is a **static CSS `linear-gradient`** between the two theme colors, not an animated/JS-driven crossfade at all. Nothing here animates — it's one paint operation, so it satisfies §3.4's "only transform/opacity" rule even more directly than a `ScrollTrigger`-driven opacity fade would have (there's simply nothing to time or get out of sync). It reads identically to the "dawn, not a seam" goal at every scroll position, with zero JS and zero risk of a mid-scroll frame landing anywhere but one of the two solid endpoints.
- Used in page assembly as a plain sibling between two `<SectionTheme>` blocks, e.g. `<SectionTheme theme="night">...</SectionTheme><ThemeSeam from="night" to="morning" /><SectionTheme theme="morning">...</SectionTheme>`.

**Real contrast numbers** (computed via the WCAG relative-luminance formula, not estimated):

| Pair | Ratio | AA normal text (4.5:1) | AA large text / UI (3:1) |
|---|---|---|---|
| `--ink-light` (#f6f1e7) on `--night` (#0d0a08) | **17.53:1** | ✅ | ✅ |
| `--ink-light-2` (#b9ae9c) on `--night` | **9.02:1** | ✅ | ✅ |
| `--ink-dark` (#1a1510) on `--morning` (#f4eee4) | **15.70:1** | ✅ | ✅ |
| `--ink-dark-2` (#6b5d4b) on `--morning` | **5.53:1** | ✅ | ✅ |
| `--gold` (#b3a17c) on `--night` | **7.81:1** | ✅ | ✅ |
| `--gold-deep` (#8b6f3e) on `--morning` | **4.10:1** | ❌ | ✅ |
| `--ink-light` on `--night-2` (#16120e, card surface) | **16.55:1** | ✅ | ✅ |
| `--ink-dark` on `--morning-2` (#ebe3d5, card surface) | **14.22:1** | ✅ | ✅ |

**One real failure found and fixed:** the original `--gold-deep` only reached 4.10:1 on Morning — fine for large/UI text but not safe for any gold-deep *body* text. Darkened it to **`#83693a`**, which measures **4.54:1** and is visually indistinguishable from the original. Token updated in §3.1. Since these transitions happen in text-free seam strips as designed above, no scroll position ever presents interpolated/out-of-spec contrast — the numbers above are the only contrast states that exist.

#### 5.1 Conversion over cinema (round-1 correction)

Two pinned scroll sections (Masters *and* Process) was one too many — a site that pins the scroll twice starts asking for patience instead of asking for a booking. **Masters keeps its pin** (§6.4) because the fold-transition *is* the concept made physical; Process loses its pin (§6.5) and becomes a plain grid/list with a simple entrance, because four sequential steps don't need scroll-jacking to read clearly — they need to be scannable.

Two more conversion-first rules, site-wide:
- **The header's "Записатися" button is visible on every section, at all times** — not themed to Night/Morning, not hidden on scroll. The header keeps its own fixed, theme-independent background (as it already does today) specifically so this button's contrast never depends on which section happens to be behind it.
- **Every place a specific master is named gets its own direct booking link to that master** (`?master={slug}`), not a generic "book now" that dumps the visitor back at step one of the wizard.

**Header/Footer scope (resolved, round-1 follow-up):** both are shared across the whole site via root layout, so the redesign changes them globally — but with two behavioral carve-outs, decided via `usePathname()` in the components themselves rather than a route-group split, since only *behavior* differs, not access/security:
- **Header:** the "Записатися" CTA is hidden on `/booking/*` only (a second CTA mid-booking is noise, not help). `/account`, `/master`, `/admin` keep the button — only its visual style changes with the rest of the redesign.
- **Footer:** genuinely two variants of one component. The full §6.9 treatment (wordmark, etc.) renders only on the public pages (`/`, `/services*`, `/masters*`, `/locations*`, `/reviews*`); everywhere else (`/booking`, `/account`, `/master`, `/admin`) gets a one-line compact footer — small wordmark, both phone numbers, copyright. Verified live (with minted test sessions for admin/master/client roles) that the compact footer renders correctly on all four non-public areas and that `/booking`'s existing sticky mobile CTA bar (built earlier this session) has nothing to conflict with, since the compact footer is a normal one-line block, not another fixed element.

---

## 6. Section-by-section

### 6.1 Hero — "Vis-à-vis" (Night)
Full 100svh. Headline in two mirrored halves either side of a vertical center line: **"Краса,"** (weight 300) on the left, **"доведена до досконалості"** (italic) on the right. Beneath the line, a faint reflection of the headline — `scaleY(-1)`, `opacity: 0.06`, masked with a downward gradient so it fades into the floor rather than cutting off. This *is* the mirror; it needs no label saying so.

**Intro sequence** (`--dur-hero`, one continuous timeline, plays once): mirror-line draws top-to-bottom (600ms) → each half of the headline slides in from the center line outward, split by word (`split-type`, 60ms stagger) → Glint sweeps once across the assembled headline → CTA button and the "Сумська · Павлове Поле" caption fade in.

One button: **"Записатися."** Nothing else competes for attention on this screen — no subheading paragraph (there's a whole section for that next), no stat counters, no scroll-cue gimmick beyond what the reflection already implies.

**Mobile (≤390px and up to the `sm` breakpoint) — not a squeezed split.** The side-by-side mirror doesn't survive a 390px column; stacking it top-to-bottom instead keeps the same idea (a line, two halves, a reflection) in a shape that actually fits:

- **"Краса,"** on its own line, then a **horizontal** mirror-line (draws left-to-right instead of top-to-bottom), then **"доведена до досконалості"** on the line below it.
- The reflection moves to sit under the *bottom* line only (not both) — `scaleY(-1)`, same opacity/mask treatment as desktop, so it's still legibly "the mirror," not a repeated headline.
- The reflected duplicate is `aria-hidden="true"` — it's a visual echo of text a screen reader has already announced once; announcing it twice would be noise, not signal.
- Intro sequence order becomes: line draws (600ms, now horizontal) → top half fades/slides down into place → bottom half slides up into place → Glint sweep → CTA/caption. Same total duration budget as desktop, same `--dur-hero`.

### 6.2 Manifesto (Morning)
A single large paragraph (Cormorant, 44–72px fluid), 3–4 sentences, no card, no icon, no heading above it — just the text, centered, with enormous margin. Words resolve from `opacity: 0.15` to `1` scrubbed directly to scroll position (not time-based), so the reader's own pace *is* the animation's clock.

Copy (Ukrainian, written for this brief — no "your beauty is our priority" filler):

> *Ми не змінюємо, хто ви. Ми прибираємо все зайве між вами і тим, якою ви вже є в кращий свій день. Тому в Visavis завжди двоє: ви — і майстер, що бачить саме вас, не чергу за вами. Прийти сюди — це на годину зупинити час і подивитись собі в очі.*

*(Approved as a working draft, not final brand copy — will ship with a `// TODO: погодити з замовником` comment directly above it in the component so it's impossible to lose track of before launch.)*

### 6.3 Services — Index, not cards (Night)
A full-width typographic list of the five directions (Волосся, Нігті, Косметологія, Перманентний макіяж, Масаж) — name in large Cormorant on the left, `від {price} ₴` and a service count on the right, 1px hairlines between rows. No thumbnails, no icons, no category tags.

**Desktop hover:** the hovered row shifts 24px right; every other row dims to 30% opacity. Click expands the row in place (GSAP height 0→auto, matching the pattern already proven in this codebase's mobile accordion) to reveal that direction's services with prices.
**Mobile:** identical list and expand behavior; no cursor, so no follow effect to begin with.

**Photo dependency (round-1 correction):** an `<ArtSlot>` with no `src` is a warm empty rectangle — fine sitting still in a fixed layout slot, but actively looks like a rendering bug when it's *flying around the screen chasing a cursor with nothing in it*. So the cursor-follow slot only mounts once a direction has at least one `photoUrls[0]` to show; with no photo yet, the interaction is exactly the row-shift + dim, nothing more, and that's a complete, non-broken-looking interaction on its own. The moment a category's services gain a photo, the follow-slot appears automatically — this is a data check (`photoUrls.length > 0`), not a flag anyone has to remember to flip.

*Self-note going in: this is the section most likely to accidentally become "just a nice list" without visibly encoding vis-à-vis. The honest answer is that its concept anchor is thinner than the others — its job is pacing (a quiet, confident beat after the loud hero) and the payoff is the cursor-follow itself acting as a tiny face-off between visitor and service. I'll say plainly in that section's self-critique whether that's enough or whether it needs a stronger idea once it's actually built.*

### 6.4 Masters — "Vis-à-vis" (Morning) — the one section that keeps a pin
Pinned section, one master per screen — **the only pin left on the site** (round-1: conversion over cinema, see §5.1). Composition: portrait (3:4, large) on one side, their own quote about the work on the other — two things facing each other, the most literal statement of the concept anywhere on the site.

**Pin budget:** capped at **100vh of scroll distance per master**, not a lingering, indeterminate hold — with 4–5 real masters that's a firm, predictable ~4–5 viewport-heights total, not an open-ended scroll-jack.

**Per-master photo placeholder (round-1 correction) — not a generic `<ArtSlot>`.** A flat empty rectangle gives the mirror-fold transition nothing worth folding. Instead, with no `avatarUrl`: the slot shows that master's **initials in Cormorant at 200px**, `color: var(--ink-dark-2)`, `opacity: 0.15`, plus the small corner caption. Barely-there giant type reads as an intentional monogram mark, not a missing image — and it gives the fold transition real content to collapse and unfold. The moment `avatarUrl` exists, the slot swaps to the real photo with the shared treatment (§7.2), same as every other `<ArtSlot>` — this is the one section where the empty state isn't the generic `<ArtSlot>` default, so it's built as a variant (`<ArtSlot kind="portrait" initials="..." />`) rather than a special case bolted on top.

**Glint on hover fires only when a real photo is present.** Sweeping light across flat placeholder color+type would read as a glitch, not a detail — so the hover listener itself is conditional on `avatarUrl`, not just visually suppressed.

**Transition between masters** (the concept-driven part, not decoration): the current portrait collapses toward a center mirror-line (`clip-path: inset()` closing from both edges toward the middle), the next portrait unfolds *from* that same line outward — works identically whether the portrait is a real photo or the initials placeholder, since it's animating the slot's clip-path, not the image itself.

**Per-master CTA:** each pinned master gets their own **"Записатися до [ім'я]"** button (→ `/booking?master={slug}`) — a direct booking path from the exact moment someone's decided they like this specific master, not a click-through to a generic page first.

**Robustness against real data, not just happy-path names** (round-1: the "INFINITE MANAGER" test record must never break this layout) — verified locally against a seeded master with that exact name and no bio:
- **Long/all-caps names:** the name sits in a `clamp()`-sized Cormorant slot with `overflow-wrap: break-word` and no fixed single-line height assumption — "INFINITE MANAGER" wraps to two lines cleanly instead of overflowing its column or forcing a horizontal scrollbar.
- **No bio/quote:** the quote side never renders an empty italic block. Fallback order: real bio/quote → specialty list only (name + the services they're linked to) → if genuinely nothing at all (no bio, no specialties), the quote side shows just their rating or is omitted, but the portrait side and the per-master CTA always render regardless.

**Mobile:** no pin (per Phase 5's `matchMedia` rule) — horizontal scroll-snap between masters, same fold transition, simplified to a shorter duration.

### 6.5 How we work (Night)
**Round-1 correction: no pin here** (the only pin on the site is Masters, §6.4 — conversion over cinema, §5.1). Four steps — Консультація → Процедура → Догляд → Повернення — as a **4-column grid on desktop**, one sentence and one `<ArtSlot>` per column, simple scroll-triggered fade-up entrance (`--dur-reveal`, once). **Mobile:** the same four steps as a vertical list, same simple entrance, no pin, no horizontal scroll mechanic to reduce to in the first place.

### 6.6 Reviews (Morning)
One quote at a time, full-screen quiet — Cormorant italic 44px, centered, generous margin on every side. Switching between reviews: the current quote dissolves *with* a Glint sweep across it as it fades (the light "clears" it away), the next resolves in. Pulled live from the DB exactly as today; **if there are zero published reviews, the section doesn't render at all** — no placeholder quotes, ever.

### 6.7 Locations (Night)
Two branches, face to face, split by a single vertical mirror-line — the most literally symmetrical section on the site, because for once symmetry is true to the content (both branches are genuinely the same standard of service). Each side: an `<ArtSlot>`, address (linked to Google Maps, as already shipped this session), hours, phone (`tel:`, ditto).

Custom line-art SVG map of Kharkiv replaces the old four-dot "blueprint" corners — 1px strokes in `--ink-light-2`, two location dots in `--gold`. This is a real illustration asset I'll build as inline SVG (simplified river + two ring-road arcs + two dots, not a literal street-accurate map), not a photo and not a Maps embed.

### 6.8 Final CTA (Morning)
Large **"Чекаємо на вас"**, one button, one phone number. No card, no border, no background treatment beyond the Morning base — the quietest screen on the site, deliberately, right before the equally quiet footer.

### 6.9 Footer (Night)
Full-width **VISAVIS** wordmark sized to truly fill the width at every breakpoint (measured with `ResizeObserver` or a fluid `clamp()` tuned against real container widths, not guessed), its lower half cropped by the viewport edge — the wordmark *as* a mirror's frame, cut off exactly the way a reflection is cut off by where the glass ends. Three columns of small functional links beneath, as today.

---

## 7. Photo direction

### 7.1 `<ArtSlot>` — what a slot looks like with no photo yet

Every image position on the site is a real component, not a gray box: correct aspect ratio for its spot, a warm tonal fill (`--night-2` or `--morning-2` depending on theme), a faint SVG `feTurbulence` grain (~4% opacity) so it reads as a considered material rather than an empty state, and a small corner caption in Inter (e.g. *"Фото: інтер'єр, Сумська"*) so the client can see exactly what shot belongs in that exact spot when we're reviewing together.

```tsx
<ArtSlot ratio="3:4" caption="Портрет: майстер, студійний фон" src={master.photoUrl} />
```
When `src` is present, it renders `next/image` with the identical color treatment (§7.2) applied via CSS filter, so a slot and a filled photo never look like two different design systems.

### 7.2 Treatment for real photos
A single shared CSS filter recipe — slight warmth (`sepia` pushed very lightly + `hue-rotate` correction), a touch of lifted-shadow lowered contrast, and the same ~4% grain overlay as the empty slots. Applied uniformly so photos shot at different times, by different people, still read as one campaign.

### 7.3 Shot list
Delivered as a separate `PHOTO_SHOTLIST.md` once DESIGN.md is approved — no need to write the shot list for a direction that might still change.

---

## 8. Technical plan (Phase 5, restated as commitments, not just constraints)

- Add `lenis` and `split-type` via npm (not yet installed — will do in Phase 1). `gsap` + `ScrollTrigger` are already in place from earlier work this session.
- **Lenis: desktop only** (round-1 correction) — instantiated inside `gsap.matchMedia()`'s desktop branch exclusively. Touch devices get native scroll with zero Lenis involvement, not a touch-tuned Lenis config; smooth-scroll libraries fighting the browser's own touch/momentum scrolling is a common source of janky mobile scroll, and native scroll is both simpler and correct here.
- `lenis.on('scroll', ScrollTrigger.update)` wiring in a single root-level provider (desktop-only instance, per above) so every section's ScrollTrigger stays in sync with smooth-scroll, not fighting it.
- Every animated component: `gsap.context()` scoped to a ref, reverted in the `useEffect` cleanup — the existing pattern already used in `hero.tsx`/`featured-masters.tsx` this session, extended rather than reinvented.
- Every pin: wrapped in `gsap.matchMedia()` with an explicit mobile branch that has no pin at all, not just a shorter one.
- Every overlay: `pointer-events: none` as the resting state, flipped synchronously (not in an animation callback) — this is the exact bug class already found and fixed twice this session (`PageLoadTransition`, `MobileNav`), so it's now a standing rule, not a hope.
- Fonts stay on `next/font` exactly as configured today.

**Quality bar — I will check these, not assume them, before calling any section done:**
- Lighthouse mobile ≥ 90 Performance / ≥ 95 Accessibility / CLS = 0 — run for real via Lighthouse CI or Chrome DevTools against the local build, numbers reported honestly including if they miss.
- A DevTools Performance recording during scroll, checked for long tasks > 50ms.
- Contrast ≥ 4.5:1 checked on real token pairs on both themes (I'll compute the actual ratios, not eyeball them).
- Every interactive element ≥ 44×44px on mobile — same measurement method (`getBoundingClientRect` in a real browser) used for the mobile pass earlier this session, not a visual guess.
- Full keyboard pass, visible focus ring on everything.
- `prefers-reduced-motion` verified with the media feature actually toggled in DevTools, not assumed from reading the code.

---

## 9. Process from here

1. **This document — you're reading it. Nothing else is built. Waiting for your go-ahead before any code.**
2. Design tokens + `ArtSlot`, `Glint`, `MirrorLine`, `SectionTheme` primitives → screenshot → local commit (not pushed).
3. Sections in the §6 order, one at a time. After each: desktop (1440px) + narrowest-available mobile viewport screenshots, the self-critique checklist below answered honestly (including "this didn't work, here's what I'd do instead" where true), local commit.
4. `PHOTO_SHOTLIST.md`.
5. Final pass: Lighthouse, 60fps scroll check, reduced-motion, keyboard nav.
6. **Nothing gets pushed or deployed at any point without your explicit confirmation — everything through this whole process runs against the local dev build only**, per your instruction.

### Self-critique checklist (answered after every section, not skipped)
- Does this visibly *carry* vis-à-vis, or is it just a nice section?
- If I remove one element, does it get better? If yes, I remove it before showing you.
- Does anything here look like a Framer/Webflow template pattern? Name it specifically if so.
- Is gold ≤5% of the screen?
- Does every animation have a one-sentence "why"?
- Does mobile feel like its own design, or a squeezed desktop?
