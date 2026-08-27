# CLAUDE.md — project context for a new session

Rebuild of the Texas A&M Phi Gamma Delta (Alpha Mu Chapter) website, replacing
an unfinished Wix site at **aggiefiji.com**.

**The domain changed in August 2026.** Earlier notes say `tamufiji.info`; the
chapter retired it as an odd address and settled on `aggiefiji.com`, which it
already owned through Wix. Any `tamufiji.info` you find is stale.

Read this first for the rules, then **`HANDOFF.md`** for where things stand and
what to do next. After those: `README.md` (how it works), `SHEET-SETUP.md` (the
giving data), `CALENDAR-SETUP.md` (the events calendar), and `CONTENT-TODO.md`
(what the chapter still owes).

**Last full pass: August 2026.** Everything below describes what is actually in
the repo, not what was once planned.

**The site is LIVE at https://aggiefiji.com.** Changes now reach real alumni and
parents, and officers publish through `/admin` without you. `git pull` before
touching anything local.

---

## Audience and purpose

**Alumni and parents.** Recruitment happens on separate platforms and is
deliberately NOT advertised here — the rush page was built and then removed on
purpose. Do not re-add recruitment content without asking.

The site exists to do two things: get alumni to show up to events, and support
giving. Donations are the chapter's stated priority this year.

## Hard constraints — do not violate these

1. **No signup wall, ever.** No page may require an account, login, or email to
   view chapter information — especially events. The old site did this and it
   was its single worst failure. An RSVP tool may be *additive* to details
   already visible; it may never gate them.
2. **No placeholder text ships to production.** Anything marked `TODO` renders a
   loud amber warning in development and *nothing at all* in production. The old
   site shipped Wix's stock "500 Terry Francois St." address. A thin page is
   acceptable; a fake one is not. Enforced by `isTodo()` and `<Todo>` in
   `src/components/ui.tsx`, and by `looksUnfinished()` in `src/lib/calendar.ts`.
3. **A non-technical officer must be able to update it.** Rotating student
   officers maintain this. Anything requiring a developer for routine updates is
   a design failure, not a convenience issue.
4. **Mobile-first is a launch blocker.** The old site broke below 980px.
5. **Giving is hard-disabled in code** (`giving.enabled = false` in
   `src/integrations.config.ts`). **Decided August 2026: there will be no
   payment processor.** Gifts arrive by Venmo, Zelle, and cheque. The flag stays
   because turning it on should take a deliberate code change and a named person
   on the account, never a stray environment variable.
6. **The site repository must stay public.** Not a preference — Vercel's free
   Hobby plan only deploys commits authored by the Hobby account owner when the
   repo is private, and the CMS commits as whichever officer is logged in. A
   private repo silently breaks publishing for every officer but one, which
   defeats constraint 3. Nothing secret is committed; secrets live in the Vercel
   environment. Changing this needs a Vercel Pro plan alongside it.
7. **The giving sheet is public.** Never add emails, phone numbers, addresses,
   or anything tying a person to a figure. Donation tabs are Date and Amount
   only. **One exception:** a `Donor Wall` tab holding *names and an optional
   group, nothing else* — those names are already published on the physical wall.
   It stays safe only while it has no amounts and is kept alphabetical rather
   than in gift order; `npm run check:sheet` enforces both.

## Architecture decisions, and why

| Decision | Reason |
|---|---|
| Next.js 16 App Router, Tailwind v4 | Active LTS, not Maintenance — this site will go unmaintained for stretches |
| Content as JSON in `/content`, read at build | No database, no service to expire, no password to lose |
| Decap CMS at `/public/admin`, CDN-loaded, **GitHub OAuth** | Git-backed, free, no vendor account. Auth is two routes in this deployment (`src/app/api/auth`, `src/app/api/callback`) — Netlify Identity and Git Gateway are deprecated AND Netlify-only, and this deploys to Vercel |
| Events from a public **Google Calendar** only | Update friction is what kills chapter sites. Officers already open Calendar daily |
| Google Sheets read **server-side** (`src/lib/sheets.ts`) | Keeps the API key private, works with JS off, caps Google calls at one per 5 min regardless of traffic |
| Hand-built CSS/SVG charts, no chart library | One chart doesn't justify 200KB and a dependency to keep patched |
| Dependency-free markdown renderer (`src/lib/markdown.tsx`) | Renders React elements, never raw HTML — a content editor cannot inject script tags |
| `server-only` on `sheets.ts`/`giving.ts`/`calendar.ts`; types split into `sheet-types.ts` | Makes leaking the API key into a client bundle structurally impossible, not merely unlikely |
| `^` version ranges, not exact pins | Exact pins left the project on a Next.js version with a CVSS 10.0 RCE. **One exception: the Decap CDN tag in `public/admin/index.html` is pinned exactly**, because that page holds a GitHub token and unreviewed CDN code must not run beside it |

## Site map

```
Home
Events                      events + newsletters + stay connected
Donations & Philanthropy ▾  How to Give / Donor Wall
Our Chapter              ▾  Gallery
Contact
```

Homepage order: Hero → Events → Donations and Giving → Leadership → Photos.

**There is no `/donations/wishlist`, `/donations/tailgate`, or
`/donations/foundations`.** Those three fund pages were folded into `/donations`
in August 2026 and deleted. That page now carries all three giving avenues:
a three-column summary with per-avenue progress, then the wishlist, the
sponsorship tiers, and the memorial funds in full. Don't recreate them.

`/donations/[slug]` still exists as the extensibility slot — drop a JSON file in
`content/donations/` and it becomes a page plus a nav entry. It currently
generates zero pages, which is correct, not broken. **Keep `RICH_ROUTES` in that
file in step with the folders under `src/app/donations/`**, or a slug builds
twice and ships a generic page nobody sees.

## Conventions

- **Colors and fonts:** one `@theme` block in `src/app/globals.css`. Purple
  `#401457` primary, salmon `#A05050` accent. Fonts are Fraunces + Inter.
- **Navigation:** `src/lib/nav.ts` is the single source. Header, footer, and
  sitemap all read it. Dropdown parents are real pages, and each names itself as
  the first row of its own dropdown via `overviewLabel` — on touch, that row is
  the *only* way to reach the parent page.
- **Integrations:** every external service is switched from
  `src/integrations.config.ts`. `pendingIntegrations` lists only what is
  genuinely unfinished; `declinedIntegrations` records what the chapter
  considered and said no to, so nobody re-litigates it.
- **Funds:** `src/lib/funds.ts` maps each fund to its sheet tab, goal key, and
  memo wording. Single source for totals, the fund boxes, and every memo line.
- **The memo is the accounting.** With no payment processor, the string a donor
  writes on Venmo is the only thing routing their gift. `src/lib/memo.ts` builds
  it as `"<Prefix> - <Detail>"`, Give buttons carry their destination in the
  URL, and the Give page states the answer rather than asking. **The detail from
  the URL is validated against real wishlist rows and real tiers** — echoing it
  raw would let anyone hand a donor a link showing a memo of their choosing,
  which escaping does nothing about.
- **TODO filtering is per block, not per field.** `isTodo()` anchors at the
  start of a string, right for one-line fields and wrong for body copy.
  `Markdown` filters block by block and strips markdown markers first. Single-line
  fields rendered outside `<ContentText>` need `isTodo()` by hand.
- **Events have one source and one entry point.** `getResolvedEvents()` in
  `src/lib/events.ts` reads the calendar. **There is no JSON fallback** — the
  three placeholder event files and `getAllEvents()` were deleted in August 2026.
  A stale hand-kept list is worse than an honest empty state: an alum who drives
  to a moved event is worse served than one told to check back. The page says
  *which* empty it is — "we cannot reach the calendar" vs "nothing scheduled".
  Do not add a second source; the one that drifts is the one nobody watches.
- **The publish gate replaces `isTodo()` for calendar text.** `looksUnfinished()`
  tests for TBD/TODO *anywhere* in a string. TBD in a title hides the event; TBD
  in a location omits the venue; marking an event private in Google hides it.
  Documented in `CALENDAR-SETUP.md` — don't change the rules without updating it.
- **The sheet can push, as well as the site pulling.** `POST /api/revalidate`
  with an `x-revalidate-secret` header clears the sheet caches on demand; a
  Google Apps Script trigger on the sheet calls it. **The Apps Script half lives
  in the sheet, not in this repo** — `SHEET-SETUP.md` has it written out,
  because a `git clone` will not give it to you. It is strictly an accelerator:
  delete the trigger and everything still works on the five-minute cycle.
  **`revalidateTag`'s second argument is load-bearing** — Next's recommended
  `"max"` serves stale content while refreshing, which is the exact behaviour
  the endpoint exists to escape. It passes `{ expire: 0 }`. Don't "fix" that.
- **Sheet figures are cached on TWO independent five-minute clocks**, the
  route's `revalidate` and the `fetch`'s. They do not line up, so worst-case
  staleness is about ten minutes, not five — and because each page has its own
  clock, a rarely-visited page appears to update instantly while a page someone
  has been reloading appears frozen. That asymmetry reads as a bug and is not
  one; it is explained for officers in `SHEET-SETUP.md`. Redeploy to force it.
- **Every network call is bounded.** `fetch` has no default timeout, and a
  stalled connection never rejects, so the graceful-degradation paths never ran
  and `next build` died at Next's 60-second limit. Both Google readers use
  `AbortSignal.timeout(10s)`. Keep any new external call bounded the same way.
- **There is no Leadership page** and no per-officer routes. Officers are photo +
  name + position on `/about`, with a four-across names-only row on the homepage
  driven by a `featured` checkbox in the CMS — not by matching position strings,
  which would empty itself the day someone renames "Social Chair".
- **A heading with no surviving content disappears with it.** `Markdown` drops a
  heading when every block beneath it is stripped by the TODO gate.
- **A row that links nowhere doesn't render.** Newsletters without a PDF are
  filtered out in production. Watch for the same shape elsewhere.
- **Tax treatment — answered.** Gifts are NOT tax-deductible; the chapter is a
  private fraternal organization. Confirmed August 2026.
- **Memorial funds — get this right.** The chapter supports AFSP because men's
  mental health is under-taken-seriously; that reason stands alone. **Nikman
  Sarraf died in an accident, not a suicide** — his scholarship honours his love
  for the chapter, basketball, and his smile, and must never be folded into the
  mental-health framing. Claude wrongly inferred that link once; don't repeat it.
  State only what the chapter has confirmed, and never attribute a cause of death
  the chapter has not published itself.
- **One chapter inbox, no contact form.** `fijitamu@gmail.com` — one `i`,
  confirmed August 2026 against a `fiijitamu@` typo in an early note. Read by the
  President and the Treasurer, published as a mailto. A role inbox survives the
  yearly handover; a personal one does not. The old form showed a success message
  while sending nothing.
- **A field nothing renders comes out of the CMS too.** When a section is
  removed, delete its content fields as well. A field that renders nowhere is
  worse than no field, because it wastes someone's afternoon. The Events
  collection was removed from the CMS for exactly this reason when the JSON
  events went.
- **Photos expand, and the trigger is a link.** Officer headshots, gallery
  photos, and the homepage strip open in an overlay
  (`src/components/Lightbox.tsx`). Three grids, one implementation — a fourth
  photo grid should use it too rather than growing its own. The thing you click
  is an `<a href>` pointing at the image file, not a button — so with JavaScript
  off a click still opens the photo, and cmd-click still opens a new tab. That is
  the same rule as the `<noscript>` reveal below: **a visitor who never runs our
  JavaScript must still get the content, not a dead control.** The overlay keeps
  Tab inside itself and hands focus back to the photo it was opened from.
- **A lightbox index is not a grid index.** The officer grid shows officers with
  no headshot; the overlay only holds ones with a photo. Each card looks up its
  position in the photo array, never its position in the grid — index by grid
  position and every officer after the photo-less one opens somebody else's face.
- **Motion has an off switch.** The scroll reveals, the giving rotator, and the
  skeleton pulses all respect `prefers-reduced-motion`. The reveal starts at
  `opacity: 0`, so a `<noscript>` block in the root layout un-hides everything
  when JavaScript is off — **a visitor who never runs our JavaScript must still
  read every word.**
- **Comments explain *why*, not *what*.** Several record decisions. Preserve them.

## Current state

**See `HANDOFF.md`** for the pre-launch checklist and what changed last.

Eleven routes, all content-complete except material only the chapter can supply
(see `CONTENT-TODO.md`). `npm run build`, `npm run lint`, and `npm run typecheck`
all pass. Both Google integrations are live on the chapter account.

**Claude cannot run the build or reach Google.** The sandbox has no npm registry
and no `googleapis.com`. `tsc --noEmit` and `eslint` can be run against the
user's machine through the file bridge; `next build` cannot, because the
installed SWC binary is macOS-only. Every Google call and every build has to be
run by a person.

**Sections removed at the chapter's request** — don't reinstate without asking.
Share buttons, hero anchor buttons and Get Involved on Events; per-issue
newsletter summaries and the signup blurb; the five values, timeline and chapter
history on Our Chapter; per-officer bios and the Leadership page; the crest
section; the contact form; the three fund pages; the wishlist category chips and
their filter; the homepage chapter-intro paragraph.

## Open questions — do not guess at these

1. **Goal amounts, per fund.** The $75,000 General goal is real. The foundation
   and philanthropy goals are guesses the chapter thinks are too high. Goals live
   in the sheet's `Settings` tab — a treasurer edit, not a deploy.
2. **Tailgate fund.** Separate for now while recognition tiers settle. May be
   pooled into General later — `src/lib/funds.ts` has the instructions.
3. **Miller and Clark funds may be retired at year end.** If either is, remove it
   from `FUNDS` and add a redirect; historical sheet rows stay put.
4. **Old Google API key not yet deleted.** It is in the `fiji-donations` repo's
   git history permanently and stays a working credential until deleted in Cloud
   Console.
5. **Unconfirmed with the chapter:** colour palette against official brand
   guidelines, the Fraunces + Inter pairing, social handles, newsletter
   distribution mechanics.
