# Design — the visual system

What the site looks like, why, and how to add to it without it drifting. If you
are building a new page or section, read this and reuse what is here before
inventing anything.

*Written September 2026, describing the repo as it stands.*

---

## The idea

Collegiate and warm, not corporate. Deep purple carries the chapter's identity;
a muted salmon does the accent work; everything sits on a warm off-white rather
than pure white. Headings are a serif with real personality (Fraunces), body
copy is a neutral sans (Inter). Generous vertical rhythm, wide measure limits,
and nothing that moves unless the reader has said they don't mind movement.

The audience is **alumni and parents** — so legibility beats density, and the
site should read comfortably to someone holding a phone at arm's length.

---

## Colour

**One `@theme` block in `src/app/globals.css` controls the entire palette.**
Change a colour there and it changes everywhere. Do not hard-code a hex anywhere
else.

### Primary purples

| Token | Hex | Used for |
|---|---|---|
| `--color-purple-950` | `#2a0e3a` | Deepest — hero overlays, dark section grounds, footer |
| `--color-purple-900` | `#401457` | **PRIMARY** — header, buttons, headings |
| `--color-purple-800` | `#3d1d5a` | Hero base (`PageHero`) |
| `--color-purple-600` | `#5b386a` | Footer / muted surfaces |
| `--color-purple-100` | `#ece4f1` | Tinted light surface — the alternating section ground |

### Accent — salmon

Sampled directly from the official Texas A&M FIJI monogram
(`/public/brand/fiji-monogram.png`).

| Token | Hex | Used for |
|---|---|---|
| `--color-salmon-600` | `#8e4444` | Accessible salmon for **text and links on light** |
| `--color-salmon-500` | `#a05050` | The monogram salmon — buttons, rules, accents |
| `--color-salmon-400` | `#c07a74` | Hover, and accents **on dark** |

> **The three salmons are a contrast ladder, not a preference.** `600` is the
> one that passes on a light ground; `400` is the one that passes on a dark one.
> Picking by eye rather than by ground is how contrast regressions get in — an
> eyebrow is `text-salmon-600` on light and `text-salmon-400` on dark, and
> `SectionHead` already switches on its `tone` prop for you.

### Crest-derived

| Token | Hex |
|---|---|
| `--color-crest-royal` | `#232370` |
| `--color-crest-gold` | `#c9a46b` |
| `--color-crest-rose` | `#c0223c` |

Sampled from the official Phi Gamma Delta crest. **Crest-adjacent accents only
— never as large background fields.** They belong to the national badge, not to
this site's palette, and a full-bleed royal blue section would read as a
different organisation.

### Neutrals

| Token | Hex | Used for |
|---|---|---|
| `--color-cream` | `#f7f1f1` | Page ground, and text on dark |
| `--color-ink` | `#241a29` | Body text on light |
| `--color-mauve` | `#917f90` | Secondary text |
| `--color-taupe` | `#aca3a3` | Borders, subtle accents |

The body ground is cream, not white. Secondary text is usually expressed as
`text-ink/80` or `text-cream/80` rather than reaching for `mauve` — opacity
against the current ground keeps a section coherent when its tone changes.

---

## Type

| | Family | Token |
|---|---|---|
| Headings (`h1`–`h4`) | **Fraunces** | `--font-serif` |
| Body, UI, eyebrows | **Inter** | `--font-sans` |

Both are loaded through `next/font` in `src/app/layout.tsx` (self-hosted, no
external request, no layout shift), freely licensed, with real fallback stacks.

Global heading treatment, set once in `globals.css`: weight 600, line-height
1.15, letter-spacing `-0.01em`, and **`text-wrap: balance`** so a two-line
heading breaks evenly. Paragraphs get **`text-wrap: pretty`** to kill orphans.
Body is 1rem at line-height 1.65.

### The scale in practice

| Element | Classes |
|---|---|
| Page title (`PageHero` h1) | `text-4xl sm:text-5xl lg:text-6xl`, `leading-[1.08]`, `max-w-3xl` |
| Section heading (`SectionHead` h2) | `text-3xl sm:text-4xl` |
| Section intro | `text-lg`, `max-w-3xl` |
| Hero intro | `text-lg sm:text-xl`, `max-w-2xl` |
| Body | inherited 1rem |

### The eyebrow

A small uppercase label above a heading — `@utility eyebrow` in `globals.css`:
0.75rem, weight 600, `letter-spacing: 0.16em`, uppercase.

It is the one place tight tracking is wrong and wide tracking is right. Use it
for the *category* of a section ("What's coming up", "Chapter life"), never for
a sentence.

### Measure

Nothing long-form runs full width. `max-w-3xl` for headings and intros,
`max-w-2xl` for hero copy, `max-w-md` inside an `EmptyState`. The page container
itself caps at `72rem`.

---

## Layout

```css
@utility container-page {
  width: 100%;
  max-width: 72rem;
  margin-inline: auto;
  padding-inline: var(--spacing-gutter);   /* 1.25rem */
}
```

`Section` wraps everything in `container-page` already — you rarely apply it by
hand.

### Section rhythm

`<Section>` is the unit of vertical structure. Padding is `py-14 sm:py-20`, and
it takes a `tone`:

| `tone` | Ground | Text |
|---|---|---|
| `light` *(default)* | `bg-cream` | `text-ink` |
| `tint` | `bg-purple-100` | `text-ink` |
| `dark` | `bg-purple-950` | `text-cream` |
| `purple` | `bg-purple-900` | `text-cream` |

**Sections alternate `light` and `tint` down a page.** The homepage runs
Hero → Events (`tint`) → Giving (`light`) → Leadership (`tint`) → Photos
(`light`). That alternation is what separates sections — there are no heavy
dividers doing that job, so keep it going rather than stacking two of the same
tone and adding a border.

`padded={false}` exists for a section that supplies its own spacing. Use it
sparingly.

### Page masthead

`PageHero` is the standard top-of-page block: purple-800 ground, the chapter
monogram as a 7%-opacity watermark bleeding off the right edge (hidden below
`sm`, where there is no room), eyebrow, `h1`, a short `CrestRule`, then an
optional intro and children.

**Every top-level page opens with one.** It is what makes an interior page feel
like part of the same site as the homepage.

---

## Components

### `ButtonLink`

Five tones. Shape is fixed: `rounded-sm`, `px-6 py-3`, `text-sm font-semibold
tracking-wide uppercase`, 200ms colour transition.

| Tone | Where |
|---|---|
| `primary` | Purple fill — the default action on a light ground |
| `accent` | Salmon fill — the giving/priority action |
| `outline` | Purple outline on light — secondary action |
| `ghost` | Cream outline on a dark ground |
| `onAccent` | White outline on a salmon ground |

`external` gives it `target="_blank"` and `rel="noopener noreferrer"`, **and an
automatic "Opens in a new tab" tooltip** — that is exactly the thing a label
cannot say without getting too long.

> **Tooltips are deliberately not on every button.** A tooltip repeating the
> label it is attached to is noise, and it teaches people to ignore the ones
> that say something. Add one only where the label can't carry the whole answer.

> ⚠️ **Never put `shrink-0` on a button in a flex row without a mobile escape.**
> This shipped twice. It holds the button at its natural width inside a row
> narrower than that, and instead of clipping or wrapping, the *page* gets wider
> than the phone. It reads as "the layout is off-centre", not as an overflow —
> and a desktop browser never shows it, because there is always room. The
> pattern is full width below `sm`, refusing to shrink only from `sm` up.

### `SectionHead`

`eyebrow` + `h2` + `intro`, with `tone` (`light`/`dark`) and `align`
(`left`/`center`). It handles the salmon-600/salmon-400 swap for you. **Use it
rather than hand-rolling a heading block** — that swap is the thing people get
wrong.

### `CrestRule`

A hairline rule interrupted by a hollow salmon diamond. `aria-hidden`, purely
decorative, inherits `currentColor` for the rule and stays salmon for the
diamond. This is the site's one ornament — it appears under hero titles and
between major blocks, and it is what keeps the design from reading as a generic
template. Use it instead of a plain `<hr>`.

### `EmptyState`

Dashed-border card: serif title, optional short message.

**When to use it, and when to hide instead.** Hiding a section entirely is right
when it promises nothing — the homepage photo strip just disappears. A section
that is a *standing promise*, like the newsletter archive, should say so plainly
rather than vanish: a visitor who came looking for newsletters deserves an
answer, not a missing section.

### `PhotoPlaceholder`

Tinted box with an image glyph and a label. An officer with no headshot shows
this, not a broken image.

### `Todo` / `ContentText`

Amber left-bordered block **in development**, nothing at all **in production**.
See the TODO gate in `ARCHITECTURE.md` — the design half is just: unfinished
content shows less, never lorem, and never a broken-looking box in front of a
visitor.

### `Lightbox`

Photos expand — officer headshots, gallery photos, the homepage strip. Three
grids, **one implementation**; a fourth should use it too.

- The trigger is a real `<a href>` to the image file, not a button, so a click
  works with JavaScript off and cmd-click opens a new tab.
- Arrow-key navigation, a counter, Escape to close.
- Focus is trapped inside the overlay and handed **back to the photo it was
  opened from** on close.
- The caption is the only thing the overlay can put under a picture — which is
  why empty captions cost more than they look like they do.

### `Skeleton`

Loading placeholders, pulsing. Read the header comment before reaching for one —
most pages here are server-rendered HTML with no loading phase at all, so a
skeleton in the wrong place is decoration for a state that never happens.

---

## Motion

Everything that moves is opt-out, and the off switch is honoured in three
independent places.

**Scroll reveal.** `.reveal` starts at `opacity: 0` / `translateY(14px)` and
transitions over 600ms on `cubic-bezier(0.22, 1, 0.36, 1)`. Applied by
`<Reveal>`, which **every `<Section>` renders through** — so it covers the whole
site from one place and cannot drift page to page.

**The three guards, all required:**

1. `prefers-reduced-motion: reduce` shows everything immediately, no transition.
   Globally, `*` animation and transition durations collapse to `0.01ms`.
2. A `<noscript>` block **in the root layout's `<head>`** un-hides everything
   before first paint when JavaScript is off. It has to be real markup in the
   head, not a stylesheet rule — a stylesheet cannot know whether JS will run.
3. The observer reveals and then **stops observing**, so an element cannot get
   stuck invisible if it re-enters the viewport during a fast scroll.

> **This is the rule the whole site is built on: a visitor who never runs our
> JavaScript must still read every word.** Content is never hidden without a way
> back. If you add an animation that starts from hidden, it needs all three
> guards or it does not ship.

**The giving rotator** fills the active dot over the rotation interval, so the
change is something the reader sees coming rather than something that happens to
them. It uses `scaleX` rather than `width` — transform is composited, so it
cannot cause layout work once per frame for the life of the page. Hovering pauses
via `animation-play-state: paused`, which freezes the fill mid-way instead of
snapping it back.

---

## Accessibility floor

Non-negotiable, and cheap to keep:

- **Focus is always visible:** `:focus-visible` gets a 3px salmon outline with
  3px offset, site-wide. Never remove it from a control.
- **Mobile-first is a launch blocker.** The old site broke below 980px. `body`
  carries `overflow-x: hidden` as a backstop, but that is a net, not a licence —
  test real widths.
- **`scroll-margin-top: 6rem` on every `[id]`** so the sticky header doesn't
  swallow anchor targets.
- **Alt text comes from captions.** An empty gallery caption means `alt=""`.
  `galleryAlt()` in `content.ts` derives it.
- **Colour is never the only signal.**
- **The overlay traps Tab and restores focus.**

---

## Images

- Everything goes through `next/image`. `image-size.ts` reads real dimensions
  from file headers at build time, so photos render at their true aspect ratio
  and a portrait is not cropped into a landscape box.
- Gallery is a **CSS-column masonry** keeping each photo's own proportions.
  Officers are a **fixed square grid**. The homepage strip crops to **4:3** —
  which is why its thumbnails are the middle of each photo, and why expanding
  gains the most there.
- Gallery files are `.avif`; officer headshots are `.jpg`, roughly 800×800,
  under 300KB.
- CMS uploads land in `public/uploads/`; hand-placed officer photos live in
  `public/officers/`. **Both work** — the JSON path is what matters.

---

## Adding something new — the checklist

1. Does a primitive in `ui.tsx` already do it? Use that.
2. Is it a section? `<Section tone=...>` + `<SectionHead>`, alternating tone
   from the section above it.
3. New colour? Add a token to the `@theme` block. Never a bare hex.
4. Text on a coloured ground? Check which salmon and which neutral that ground
   needs.
5. Does it move? Three guards, or it doesn't ship.
6. Does it hold a photo? `Lightbox`, indexed by the photo array.
7. Buttons in a flex row? Full width below `sm`.
8. Look at it on a real phone.
