# Architecture — how this site is put together

The mental model, the data flow, and the recipes for adding to it. Read this
before writing code. `CLAUDE.md` has the rules you must not break; `DESIGN.md`
has the visual system; this file is the machinery in between.

*Written September 2026, describing the repo as it stands.*

---

## The one-paragraph version

A Next.js App Router site with **no database and no backend of its own**.
Everything a person edits lives in one of three places: **JSON files in
`/content`** (edited through a git-backed CMS at `/admin`), **a Google Sheet**
(every dollar figure), and **a Google Calendar** (every event). The code reads
those three sources on the server, renders HTML, and ships it. Nothing on the
site requires a visitor to run JavaScript to read it, and nothing requires a
developer for a routine update.

That constraint — *a rotating cast of non-technical student officers has to be
able to keep this current* — is the reason behind nearly every decision below.
When a choice looks over-engineered, it is usually buying resilience against a
handover, not performance.

---

## The three data sources

| Source | Holds | Read by | Edited by |
|---|---|---|---|
| `/content/*.json` | Page copy, officers, newsletters, gallery, payment details, socials | `src/lib/content.ts` | Officers, via `/admin` |
| Google Sheet | Every figure, the wishlist, Donor Wall names | `src/lib/sheets.ts` | The treasurer |
| Google Calendar | Every event | `src/lib/calendar.ts` | Any officer |

**They never overlap.** A figure is never in a JSON file except as an emergency
fallback; an event is never in a JSON file at all. If you find yourself adding a
second place to edit the same thing, stop — the source that drifts is the one
nobody watches, and that is the specific failure this structure exists to avoid.

### Why each source is where it is

- **Content is JSON in git** because there is no service to expire, no password
  to lose at handover, and no vendor account. The CMS commits to the repo; the
  repo is the database.
- **Money is a Sheet** because the treasurer is already in a spreadsheet every
  time a gift arrives. Asking them to also update a website is asking for a
  website that is out of date.
- **Events are a Calendar** because update friction is what kills chapter sites.
  An officer already opens Google Calendar daily. A separate admin login for
  events is the thing that goes unmaintained.

---

## Request flow

Every page is a React Server Component. The shape is the same throughout:

```
Route (src/app/**/page.tsx)
  └── calls a resolver in src/lib/
        ├── content.ts   — reads /content JSON off disk at build
        ├── giving.ts    — bridges the Sheet to the pages (sheets.ts under it)
        ├── events.ts    — the single entry point for events (calendar.ts under it)
        └── donors.ts    — the Donor Wall, sheet-first with a JSON fallback
  └── renders components from src/components/
        └── which use primitives from src/components/ui.tsx
```

**Resolvers are the seam.** `giving.ts`, `events.ts` and `donors.ts` each exist
so exactly one place decides "live data or fallback", and no page has to know
which it got. If the chapter ever moves off Google Sheets, `giving.ts` changes
and no page does.

### Server-only is enforced structurally, not by convention

`sheets.ts`, `giving.ts`, `calendar.ts`, `donors.ts` and `events.ts` all start
with `import "server-only"`. That makes it a **build error**, not a code-review
question, if any of them is ever pulled into a client bundle — which would leak
the Google API key.

The types those modules traffic in live separately, in `src/lib/sheet-types.ts`,
because client components (the wishlist, the giving avenues) need the shapes but
must not touch the readers. A `import type` would be erased safely today, but one
future edit dropping the `type` keyword would pull the key into the browser.
Splitting the file makes that mistake impossible rather than merely unlikely.

**If you add a module that touches a credential, mark it `server-only` and put
its types in `sheet-types.ts`.**

---

## Caching, and the one thing everybody gets wrong

This is the most-revisited decision in the project. Read it before changing any
route-segment config.

**Four routes render on every request** — `/`, `/donations`, `/donations/give`,
`/donations/donors`. They each set:

```ts
export const revalidate = 0;
```

**The only staleness is a 60-second pool on the Google read itself**
(`REVALIDATE_SECONDS` in `src/lib/sheets.ts`). So a figure is at most a minute
old, and a new tab always re-renders.

### `revalidate = 0` is NOT `dynamic = "force-dynamic"`

They look interchangeable. They are not, and the difference has teeth.

`force-dynamic` also forces `fetchCache: "force-no-store"`. That strips the
cache off roughly **eight Google calls per page load** and scales them with
traffic. Google's limit is **300 sheet reads per minute**. The first newsletter
blast would blow through it, Google would start refusing, and **every figure on
the site would render as $0** — the site denying the campaign exists at the exact
moment the most people are looking at it.

`revalidate = 0` re-renders the page while leaving each `fetch` with its own
`revalidate` intact. **The 60-second pool is a quota guard, not a speed
optimisation. Do not read it as one, and do not remove it.**

`/events` stays on `revalidate = 300` — different source, different quota, and
a calendar changes rarely.

### Known trade-off, not yet addressed

With pages rendering live there is no last-good static page, so a Google outage
now shows **$0 raised** rather than a stale-but-real figure. Bounded to roughly
one visitor per minute by the pool. The fix would be for `sheets.ts` to
distinguish "tab is empty" from "request failed", and hide the figure rather
than report zero.

### The sheet can push, too

`POST /api/revalidate` with an `x-revalidate-secret` **header** (not a query
param — query strings land in access logs, CDN logs, browser history and
`Referer`) clears the sheet caches on demand. A Google Apps Script trigger on
the sheet calls it.

- It calls `revalidateTag("sheets", { expire: 0 })`. **The second argument is
  load-bearing.** Next's *recommended* `"max"` serves stale content while
  refreshing — exactly the behaviour this endpoint exists to escape. It would
  pass typecheck, return `revalidated: true`, and change nothing.
- **Tagging is required.** `revalidatePath` alone clears the rendered page but
  not the cached fetch, so the route re-renders with old sheet data.
- **This is strictly an accelerator.** Delete the trigger and everything still
  works on the 60-second cycle.

> **Current state: not set up.** The live endpoint answers
> `503 — REVALIDATE_SECRET is not set on this deployment`. See `OPERATIONS.md`.

### Every network call is bounded

`fetch` has no default timeout and a stalled connection never rejects, so the
graceful-degradation paths never ran and `next build` died at Next's 60-second
static-generation limit. Both Google readers now use `AbortSignal.timeout(10s)`.

**Bound any new external call the same way.**

---

## Module map

### `src/lib/`

| File | Job |
|---|---|
| `content.ts` | Reads every JSON file in `/content`. Types for all of it. Date formatting helpers. |
| `sheets.ts` | `server-only`. Raw Google Sheets reads, cached. Holds `REVALIDATE_SECONDS`. Nothing here throws — every function degrades to null/empty. |
| `sheet-types.ts` | Shapes only, safe to import from client components. |
| `giving.ts` | `server-only`. The bridge: decides live-sheet vs hand-entered fallback for every figure. |
| `funds.ts` | The fund registry. Each fund → sheet tab, goal key, memo wording. Array order is display order everywhere. |
| `memo.ts` | Builds `"<Prefix> - <Detail>"`. Validates the detail from the URL against real data. |
| `calendar.ts` | `server-only`. Reads the calendar, applies the publish gate (`looksUnfinished`), parses hashtags. |
| `events.ts` | `server-only`. The single entry point every page uses for events. |
| `donors.ts` | `server-only`. Donor Wall: sheet first, JSON fallback. |
| `nav.ts` | Single source for navigation. Header, footer and sitemap all read it. Safe to import from client components. |
| `markdown.tsx` | Dependency-free markdown → React elements. Never raw HTML. Also the TODO gate for body copy. |
| `image-size.ts` | Reads image dimensions from file headers at build time. No dependency. |

### `src/components/`

Layout shell: `SiteHeader`, `SiteFooter`, `DevStatusBanner`, `Analytics`.

Primitives in `ui.tsx`: `ButtonLink`, `Section`, `SectionHead`, `CrestRule`,
`Todo`, `isTodo`, `ContentText`, `EmptyState`, `PhotoPlaceholder`.

Feature components: `EventCard`, `FundProgress`, `GivingAvenues`,
`GivingRotator`, `GivingTrend`, `WishlistList`, `DonorWall`, `GiveMemo`,
`PhotoGrid`, `Lightbox`, `PageHero`, `Reveal`, `Skeleton`, `Tooltip`.

### Routes

Eight content pages:

| Route | Source | Cache |
|---|---|---|
| `/` | Content + Sheet + Calendar | `revalidate = 0` |
| `/events` | Calendar | `revalidate = 300` |
| `/donations` | Content + Sheet | `revalidate = 0` |
| `/donations/give` | Content + Sheet | `revalidate = 0` |
| `/donations/donors` | Sheet → Content | `revalidate = 0` |
| `/about` | Content | static |
| `/gallery` | Content | static |
| `/contact` | Content | static |

Plus `/donations/[slug]` (the extensibility slot — currently generates **zero**
pages, which is correct), `robots.ts`, `sitemap.ts`, `not-found.tsx`, and three
API routes: `/api/auth` and `/api/callback` (GitHub OAuth for the CMS),
`/api/revalidate`.

---

## The TODO gate

No placeholder text may ship. The mechanism has **two halves**, and using the
wrong one is a real bug:

| Function | Where | Behaviour |
|---|---|---|
| `isTodo()` in `ui.tsx` | One-line fields | Anchors at the **start** of the string |
| `Markdown` in `markdown.tsx` | Body copy | Cuts each block at its **first** `TODO`, block by block |
| `looksUnfinished()` in `calendar.ts` | Calendar text | Tests for `TBD`/`TODO` **anywhere** in the string |

**Why three.** `isTodo()` is start-anchored, which is right for a one-line field
and wrong for body copy — officers leave notes mid-field
(`- **Mentor a brother.** TODO: describe the program.`), and a start-anchored
test reads that as finished and ships the note. Calendar text needs the
anywhere-test because an officer types "Alumni Dinner TBD" as a title.

In **development** an amber marker shows what was cut. In **production** it
renders nothing at all. A thin page is acceptable; a fake one is not.

**A single-line field rendered outside `<ContentText>` needs `isTodo()` by
hand.** And a heading whose blocks are all stripped disappears with them.

---

## The memo system

There is no payment processor, by decision. **The string a donor writes on Venmo
is the only thing routing their gift** — so the site treats it as load-bearing.

```
"<Prefix> - <Detail>"

Fundraising Campaign - General
Fundraising Campaign - Car Port      ← a specific wishlist item
Tailgate Sponsorship - $500+         ← a specific tier
Philanthropy - Sarraf Scholarship    ← a specific fund
```

A plain hyphen, not an en dash — this gets re-keyed on a phone keyboard, and a
character people cannot easily type becomes something else.

Every Give button carries its destination in the URL (`giveHref()`), and
`/donations/give` shows the finished memo ready to copy rather than asking the
donor to compose one.

**The detail from the URL is validated against real wishlist rows and real
tiers.** Echoing it raw would let anyone hand a donor a link displaying a memo
of their choosing — rendered in the chapter's own styling, which reads as an
instruction from the chapter. React escapes the text, so this is not a
script-injection risk; it is a **social-engineering** one, which escaping does
nothing about. An unrecognised detail silently falls back to the fund default
rather than erroring, so a donor following a stale link can still give.

---

## Recipes — how to add things

### Add a page under Donations

Drop a JSON file in `content/donations/`. It becomes a page at
`/donations/<slug>` **and** a nav dropdown entry automatically — `nav.ts` hangs
donation subpages off the Donations item at runtime.

> ⚠️ **If you instead build a hand-written route** at
> `src/app/donations/<slug>/`, you must add that slug to **`RICH_ROUTES`** in
> `src/app/donations/[slug]/page.tsx`. Miss it and the slug builds twice — once
> as your real page and once as a generic one — and visitors get whichever won.
> This exact bug shipped once with `donors`.

### Add a top-level page

1. Create `src/app/<name>/page.tsx`.
2. Add it to `baseNav` in `src/lib/nav.ts` — header, footer and sitemap all
   read from there, so that one edit covers all three.
3. If it is a dropdown parent, give it `overviewLabel`. On touch there is no
   hover, so that first row is the **only** way to reach the parent page.

### Add a fund

1. Add an entry to `FUNDS` in `src/lib/funds.ts` — `donationsTab`, `goalKey`,
   `defaultGoal`, `memoPrefix`, `memoDetail`.
2. Create the matching tab in the sheet, and the goal row in `Settings`.
   `SHEET-SETUP.md` has the exact shapes.
3. Run `npm run check:sheet` to confirm the site and the sheet agree.

**Array order is display order** everywhere — the foundations grid and the Give
page picker both read it straight through. Don't re-sort it alphabetically; the
current order is deliberate (see the comment in the file).

**A tab that doesn't exist is fine** — that fund shows "tracking coming soon"
instead of a progress bar, and the terminal logs one warning. Nothing breaks.

### Add a content type the CMS can edit

1. Add the type and a `get*()` reader in `src/lib/content.ts`.
2. Add a collection to `public/admin/config.yml`.
3. Render it.

**And when you remove a section, delete its CMS fields too.** A field that
renders nowhere is worse than no field — it sits in the admin screen asking to
be filled in and wastes somebody's afternoon. The Events collection was removed
for exactly this reason when the JSON events went, and the founding-year fields
were deleted rather than filled.

### Add a photo grid

Use `Lightbox.tsx`. Three grids already share it — the officer grid, the
gallery, and the homepage strip — and a fourth should too rather than growing
its own.

> ⚠️ **A lightbox index is not a grid index.** The officer grid shows officers
> with no headshot; the overlay only holds ones *with* a photo. Each card must
> look up its position in the **photo array**, never its position in the grid.
> Index by grid position and every officer after the photo-less one opens
> somebody else's face.

The trigger is a real `<a href>` pointing at the image file, not a button — so
with JavaScript off a click still opens the photo, and cmd-click still opens a
new tab.

### Add an external integration

Everything with a credential goes through `src/integrations.config.ts` — one
file, one switch each. Add it to `pendingIntegrations` **only** if it is
genuinely waiting on a person; add it to `declinedIntegrations` if the chapter
considered it and said no, so nobody re-litigates it later.

**A URL an officer replaces is content, not configuration.** Social handles used
to live in this file, which meant the one account that actually changes hands —
Instagram — needed a developer and a deploy. They moved to `content/site.json`.
Only things with credentials belong in the config file.

---

## Things that will bite you

- **`fetch` with no timeout.** Killed the build once. Bound every external call.
- **`shrink-0` on anything holding an uppercase button label.** Held buttons at
  their natural width inside a narrower flex row, and the *page* got wider than
  the phone. It reads as "the layout is off-centre" rather than as an overflow,
  and a desktop browser never shows it because there is always room.
- **`RICH_ROUTES` drift.** See the recipe above.
- **Lightbox indices.** See the recipe above.
- **Client/server boundary on sheet types.** Import shapes from
  `sheet-types.ts`, never from `sheets.ts`.
- **`revalidateTag`'s second argument.** `{ expire: 0 }`, not `"max"`.
- **Comments explain *why*, not *what*.** Several record decisions that cost
  real time to learn. Preserve them.

---

## What Claude cannot do here

The sandbox has no npm registry and no `googleapis.com`.

- `tsc --noEmit` and `eslint` **can** be run against your machine through the
  file bridge.
- `next build` **cannot** — the installed SWC binary is macOS-only.
- Every Google call and every build has to be run by a person.

Plan on `npm run typecheck` and `npm run lint` being checkable in-session, and
`npm run build` being something you run.
