# Phi Gamma Delta — Texas A&M University

Chapter website for Texas A&M Phi Gamma Delta (Alpha Mu), replacing the
unfinished Wix site that used to serve this domain.

**Live at https://aggiefiji.com.**

**Audience:** alumni and parents. Recruitment happens on separate platforms and
is deliberately not advertised here.

**The design goal behind every decision here:** a rotating cast of non-technical
student officers has to be able to keep this current. A beautiful site nobody
updates is the failure mode we are replacing.

## Site map

```
Home
Events                      (events + newsletters + stay connected)
Donations & Philanthropy ▾  (How to Give / Donor Wall)
Our Chapter              ▾  Gallery
Contact
```

Dropdown parents are real pages, not just menu headers — clicking "Donations &
Philanthropy" goes to the Giving page. Nothing on this site is reachable *only*
by hovering, and the footer lists every page flat.

## The other docs

| File | What it is for |
|---|---|
| `CLAUDE.md` | The rules — constraints and conventions, for anyone (or anything) writing code here |
| `ARCHITECTURE.md` | How the stack works, and recipes for adding to it |
| `DESIGN.md` | The visual system — colours, type, components, motion |
| `SHEET-SETUP.md` | The giving sheet's structure |
| `CALENDAR-SETUP.md` | The events calendar and its publish rules |
| `OPERATIONS.md` | Live state, open items, hosting, DNS, handover |

---

## For chapter officers — updating the site

**You do not need to know how to code, and you cannot break the site by editing content.**

### Events — use Google Calendar

Events are **not** edited on the website. Add an event to the chapter's public
Google Calendar and it appears within five minutes; delete it and it disappears.
There is no login and no new tool to learn.

**Read [`CALENDAR-SETUP.md`](./CALENDAR-SETUP.md) before adding the first one** —
the calendar is public with no review step, and there are rules about what will
and won't publish (anything with `TBD` in the title stays hidden).

The calendar is the **only** source of events. If it cannot be reached, the page
says so rather than showing an out-of-date list.

### Money — use the Google Sheet

Every dollar figure, the wishlist, and the Donor Wall names come from one sheet.
Goals live in its `Settings` tab, so the treasurer changes a target without
anyone touching the website. **See [`SHEET-SETUP.md`](./SHEET-SETUP.md)**, which
also covers the `Memo Name` column that controls what a donor is told to write.

Figures on the site are at most **about a minute** old.

### Everything else — the admin screen

1. Go to `aggiefiji.com/admin` and click **Login with GitHub**.
2. Pick what you want to change from the left sidebar.
3. Edit it like a form. Hit **Publish**.
4. The site rebuilds itself in about a minute.

You need a GitHub account with access to the site's repository. Whoever holds
the website role grants that, and removes it at handover.

What lives here: officers, newsletters, gallery photos, page copy, chapter
contact details and social handles. Not events (calendar) and not figures
(sheet).

### Things that update themselves

- **Events move from "Upcoming" to "Past" automatically.**
- **Recurring calendar events** appear as individual dates.
- The copyright year, the event count, and the sitemap all update on their own.
- The wishlist sorts itself most expensive first, whatever order the sheet is in.

### The rule that does not get broken

**No page on this site may ever require a visitor to create an account, log in,
or hand over an email address to see chapter information — especially events.**
The old site did this and it was its single biggest failure. An RSVP or ticketing
tool may be *additional* to the details already on the page; it may never be a
gate in front of them.

### What the chapter still owes

See the content section of [`OPERATIONS.md`](./OPERATIONS.md). While the site
runs locally, an amber banner lists what is still unfinished; in production,
unfinished content simply doesn't render.

---

## For developers

### Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

In a second terminal, to use the CMS locally with no login or internet:

```bash
npx decap-server     # then open http://localhost:3000/admin
```

`local_backend: true` in `public/admin/config.yml` only applies on localhost, so
it stays switched on and does not affect production.

**`git pull` first.** The CMS commits to this repo as whichever officer is
logged in, so it changes without you.

### Checks

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run build        # the one that catches route-segment-config errors
npm run preview      # build + start — production behaviour, dev markers hidden
npm run check:sheet      # verifies every tab and goal key the site expects
npm run check:calendar   # verifies the calendar is readable and public
```

The two `check:` scripts are zero-dependency diagnostics that name the cause of a
failure instead of leaving you guessing. Run them before assuming the site is
broken. `check:sheet` reads **by header name**, matching the site — it used to
read columns by position, so it could report healthy while the site read nothing.

**Test the preview build on a phone, not the dev build.** Production hides all
dev-only markers, so the two look different.

### Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router), TypeScript, React 19 | Full design control, no runtime to babysit |
| Styling | Tailwind CSS v4, tokens in `src/app/globals.css` | One `@theme` block controls the whole palette |
| Content | JSON files in `/content`, read at build time | No database, no service to expire |
| Events | Chapter Google Calendar, read server-side | Officers already live in Google Calendar |
| Money | Chapter Google Sheet, read server-side, 60s pool | The treasurer is already in it |
| Admin | Decap CMS (`/public/admin`), GitHub OAuth | Git-backed, free, no vendor account |
| Analytics | Vercel Web Analytics + Speed Insights | No cookies, no consent banner, free at this scale |
| Fonts | Fraunces + Inter via `next/font` | Freely licensed, self-hosted |
| Hosting | Vercel (Hobby) | Free at this scale; the repo must stay public — see below |

### Layout

```
content/            ← everything an officer edits
  site.json           chapter info, socials, contact details
  pages/*.json        page copy (incl. tailgate tiers on donations.json)
  donations/*.json    How to Give + Donor Wall
  officers/*.json     one file per officer
  newsletters/*.json  one file per issue
  gallery/*.json      one file per photo
public/
  admin/              Decap CMS admin screen
  brand/              crest, monogram, favicon source
  officers/           headshots placed by hand
  uploads/            headshots uploaded through the CMS
src/
  integrations.config.ts   every external service, switched from one place
  lib/                     content, sheets, calendar, funds, memo, markdown, nav
  components/              layout shell, UI primitives, charts, lightbox
  app/                     one folder per route + the OAuth and revalidate routes
scripts/                 zero-dependency check:sheet / check:calendar
```

There is no `content/events/` — events come from the calendar.

**Full module map, data flow and how-to-add recipes:
[`ARCHITECTURE.md`](./ARCHITECTURE.md).**

### Giving, and why the memo matters

There is no payment processor, by decision. The string a donor writes on Venmo,
Zelle, or a cheque is the only thing that routes their gift, so the site treats
it as load-bearing: every Give button carries its destination in the URL, and
`/donations/give` shows the finished memo ready to copy rather than asking the
donor to compose one. `src/lib/memo.ts` builds it; the detail from the URL is
validated against real sheet rows and real tiers before it is ever displayed.

### Deploying

The site is already deployed. Pushes to `main` deploy automatically, whether they
come from you or from an officer hitting Publish in the CMS.

To stand it up again from scratch:

1. Import the repo in Vercel. Build command `npm run build`, framework Next.js.
2. **Set `NEXT_PUBLIC_SITE_URL` and the Google + GitHub OAuth variables** in the
   Vercel project. Without the first, your sitemap and link previews point at
   `localhost:3000`. It is baked in at build time, so changing it needs a
   redeploy, not just a save.
3. Add the domain and point DNS.

> **⚠️ Do not make the repository private.** Vercel's free Hobby plan will then
> only deploy commits authored by the account owner, and the CMS commits as
> whichever officer is logged in. Everyone else would hit Publish, see their
> commit reach GitHub, and watch the live site never update — silently. If the
> chapter ever needs a private repo, it needs a Vercel Pro plan with it.

The full variable table, the DNS procedure and its traps, and the OAuth setup are
in [`OPERATIONS.md`](./OPERATIONS.md).

### Keeping it patched

Dependency versions use `^` ranges on purpose, so a plain `npm install` picks up
security patches. **Once a semester, whoever holds the website role should run:**

```bash
npm install
npm audit          # should report 0 vulnerabilities
npm run build      # confirm it still builds
```

If `npm audit` reports something, run `npm audit fix` first. Avoid
`npm audit fix --force` — it is allowed to jump major versions, which is how a
project ends up off its LTS line with a broken build.

**The one pinned dependency** is the Decap CMS tag in `public/admin/index.html`.
That page holds a GitHub token, so it must not run whatever a CDN serves that
day. Bump it deliberately and regenerate its integrity hash — the command is in
`OPERATIONS.md` and in that file's own comments.
