# Handoff — August 2026

Where the rebuild stands and what to do next. Read `CLAUDE.md` first for the
constraints and conventions; this file is the state of play.

---

## Read these in order

1. **`CLAUDE.md`** — hard constraints, architecture, conventions, open questions.
2. **`CONTENT-TODO.md`** — what the chapter still owes.
3. **`SHEET-SETUP.md`** and **`CALENDAR-SETUP.md`** — the two Google
   integrations, written for an officer rather than a developer.
4. **`README.md`** — stack, how to run it, deploy notes.

---

## Status

`npm run build`, `npm run lint` and `npm run typecheck` all pass. Twelve routes
build. Both Google integrations are live on the chapter account
(`fijitamu@gmail.com`, Cloud project `aggie-fiji-website`, one API key allowed
for Sheets + Calendar).

| Page | Route | State |
|---|---|---|
| Home | `/` | Complete. Events, rotating giving figures, leadership, photos. |
| Events | `/events` | Complete. Calendar-driven, no fallback. |
| Giving | `/donations` | Complete. All three avenues on one page. |
| How to Give | `/donations/give` | Complete. Two steps, memo carried from the Give button pressed. |
| Donor Wall | `/donations/donors` | Built. **Needs names.** |
| Our Chapter | `/about` | Complete. **One headshot missing.** |
| Gallery | `/gallery` | Complete. Five photos, no captions. |
| Contact | `/contact` | Complete. |

---

## 🔴 Do these before launch — in this order

### 1. Put the project under version control

**There is no git repository.** Not an unpushed one — none. Nothing else in this
list can happen until there is, because Vercel deploys from a repo and the CMS
login commits to one.

```bash
git init
git add -A
git status          # CONFIRM .env.local IS NOT LISTED before committing
git commit -m "Chapter website rebuild"
git branch -M main
git remote add origin https://github.com/OWNER/REPO.git
git push -u origin main
```

`.gitignore` already excludes `.env*` (with `!.env.example`), `node_modules/`,
`.next/`, and `*.tsbuildinfo`. **Check `git status` before the first commit
anyway** — a committed API key is in the history forever, which is exactly how
the old key ended up unrevokable.

### 2. Set the environment variables in Vercel

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://tamufiji.info` — **not optional.** Left unset, `sitemap.xml`, `robots.txt` and every link preview point at `localhost:3000` |
| `GOOGLE_SHEETS_ID`, `GOOGLE_SHEETS_API_KEY` | From `.env.local` |
| `GOOGLE_CALENDAR_ID` | From `.env.local` |
| `GITHUB_OAUTH_ID`, `GITHUB_OAUTH_SECRET` | From step 3 |
| `NEXT_PUBLIC_ANALYTICS_PROVIDER` | `vercel`, then enable Web Analytics in the project |

`.env.local` is for local development only and never deploys.

### 3. Stand up the CMS login

1. GitHub → Settings → Developer settings → **OAuth Apps** → New.
   Authorization callback URL: `https://tamufiji.info/api/callback`
2. Put the client ID and secret in Vercel as `GITHUB_OAUTH_ID` /
   `GITHUB_OAUTH_SECRET`.
3. In `public/admin/config.yml`, replace `repo: CHANGE-ME/aggie-fiji-website`
   with the real `OWNER/REPO`, and confirm `base_url` matches the live domain.
4. Give the two or three officers who actually edit the site **write access to
   the repo**. That is the entire permission model — removing them at handover
   removes their access.
5. If the repo is **public**, set `GITHUB_OAUTH_SCOPE=public_repo` in Vercel.
   The default `repo` scope also covers private repositories, so the token an
   officer carries can otherwise touch their own private repos.

Then visit `/admin`, click Login with GitHub, and publish a trivial change to
confirm the round trip.

### 4. Delete the old Google API key

In Cloud Console. It is in the `fiji-donations` repo's git history permanently
and remains a working credential until deleted. The new key is already in use.

### 5. Add the Decap integrity hash

`public/admin/index.html` pins `decap-cms@3.8.4` but has no `integrity`
attribute yet. Generate and paste it:

```bash
curl -s https://unpkg.com/decap-cms@3.8.4/dist/decap-cms.js \
  | openssl dgst -sha384 -binary | openssl base64 -A
```

### 6. Test on a real phone, and run `npm run preview`

Mobile was the old site's other failure. Production hides all dev-only markers,
so `preview` looks different from `dev`.

### 7. Confirm the chapter email spelling

The site uses `fijitamu@gmail.com`; it was once given as `fiijitamu@gmail.com`.
A wrong contact address is precisely how the old site failed.

---

## What changed in the August 2026 pass

**Giving was rebuilt end to end.** The three fund pages folded into `/donations`
— three columns with per-avenue progress and a progress/over-time toggle, then
the wishlist, the tailgate tiers, and the memorial funds in full, each row with
its own Give button. The wishlist became a list sorted most-expensive-first
(category chips and their filter removed). `/donations/give` went from three
steps to two, and the memo is now carried in the URL from whichever Give button
was pressed, validated against real sheet rows and real tiers.

**Events lost their JSON fallback.** The calendar is the only source. The empty
state distinguishes "we cannot reach the calendar" from "nothing scheduled".

**The CMS got a working login** (GitHub OAuth, two routes in this deployment)
after Netlify Identity and Git Gateway turned out to be both deprecated and
Netlify-only.

**Analytics chosen:** Vercel Web Analytics. No cookie banner, free at this
scale, one-month reporting window on the Hobby plan.

**Newsletter distribution and a payment processor were both declined** by the
chapter and moved out of the pending list into `declinedIntegrations`.

**Social handles moved** from code into `content/site.json`, editable in the CMS.

**Polish:** scroll reveals site-wide, skeleton loaders, tooltips on buttons where
the label can't carry the whole answer, a rotating homepage giving figure.

### Bugs found and fixed

- **Unbounded `fetch` killed the build.** `sheets.ts` promised to degrade
  gracefully but only handled requests that *fail*, not requests that never
  return. A stalled connection hung the render until Next's 60-second static
  generation limit and exited non-zero. Both Google readers are now bounded.
- **`npm run lint` had never run.** `eslint.config.mjs` wrapped
  `eslint-config-next` in `FlatCompat`, but v16 ships flat configs natively — so
  ESLint tried to validate a flat config against the eslintrc schema, hit a
  circular reference, and exited non-zero having checked nothing. Once fixed it
  immediately caught a real bug: the mobile drawer closed via `setState` in an
  effect, so the new page painted with the drawer still over it for one frame.
- **`/donations/donors` was built twice**, once as itself and once as a generic
  page from `[slug]`, because `donors` was missing from `RICH_ROUTES`.
- **A `nanoid` advisory** in the PostCSS chain, cleared by `npm audit fix`.

---

## Still open

- **Gallery images ship `alt=""`** because all five captions are empty, and the
  CMS marks caption required — so an officer cannot re-save a photo without
  inventing one. Needs either real captions or a schema change.
- **`page.title` on `/donations` and `/about`** still uses `(page.title as
  string) || "…"` rather than an `isTodo()` guard. Two one-line fixes; every
  other instance of that leak is closed.
- **No script CSP.** Deliberate — see the reasoning in `next.config.ts`. The
  other security headers are set.
- **CMS `donations` collection is broader than its two remaining files.** It
  still offers payment, donors and tier fields on every entry.
