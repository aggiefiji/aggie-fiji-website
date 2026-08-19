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

## Status — DEPLOYED

**Live at https://aggie-fiji-website.vercel.app** (August 2026). DNS has not been
cut over from Wix yet.

`npm run build`, `npm run lint` and `npm run typecheck` all pass. Twelve routes
build. Repo: `github.com/aggiefiji/aggie-fiji-website` (public — see constraint 6
in `CLAUDE.md` before changing that).

**Verified working against the live deployment**, not just locally:

- Google Sheet reads from Vercel's network — real figures, twelve wishlist items.
- Google Calendar reads — ten real upcoming events.
- The memo system end to end: `?fund=general&detail=Car+Port` →
  "Fundraising Campaign - Car Port"; a tier → "Tailgate Sponsorship - $500+";
  `?fund=sarraf` → "Philanthropy - Sarraf Scholarship". An unrecognised detail
  falls back to the default instead of echoing, as designed.
- All five security headers present on the production response.
- `robots.txt` and `sitemap.xml` emit `tamufiji.info` URLs, so
  `NEXT_PUBLIC_SITE_URL` is set correctly.

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

### 1. ✅ Version control — DONE

`github.com/aggiefiji/aggie-fiji-website`, owned by the chapter organisation,
public. Pushed August 2026.

**Owned by a chapter GitHub Organisation, not a personal account** — the same
reasoning that moved the Google assets to `fijitamu@gmail.com` in August 2026.
A repo on a graduating officer's account is a dependency the chapter loses.

**The repo is PUBLIC, and must stay that way.** Vercel's free Hobby plan only
deploys commits authored by the Hobby account owner when a repo is private, and
Decap commits as whichever officer is logged in. Private would mean every
officer except one hits Publish and watches the site never change, with no error
anywhere. Nothing secret is committed — verified across all 120 files — and the
real secrets live in the Vercel environment, not the repo.

```bash
git init
git add -A
git status          # CONFIRM .env.local IS NOT LISTED before committing
git commit -m "Chapter website rebuild"
git branch -M main
git remote add origin https://github.com/aggiefiji/aggie-fiji-website.git
git push -u origin main
```

`.gitignore` already excludes `.env*` (with `!.env.example`), `node_modules/`,
`.next/`, and `*.tsbuildinfo`. **Check `git status` before the first commit
anyway** — a committed API key is in the history forever, which is exactly how
the old key ended up unrevokable.

### 2. ✅ Vercel environment — DONE (one to revisit)

Set and confirmed working. **`NEXT_PUBLIC_SITE_URL` is currently
`https://tamufiji.info`, which is not yet serving this site** — that is correct
for the final state but means the sitemap advertises URLs that still resolve to
Wix. Do not submit the sitemap to Google until DNS is cut over.

Original reference:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://tamufiji.info` — **not optional.** Left unset, `sitemap.xml`, `robots.txt` and every link preview point at `localhost:3000` |
| `GOOGLE_SHEETS_ID`, `GOOGLE_SHEETS_API_KEY` | From `.env.local` |
| `GOOGLE_CALENDAR_ID` | From `.env.local` |
| `GITHUB_OAUTH_ID`, `GITHUB_OAUTH_SECRET` | From step 3 |
| `NEXT_PUBLIC_ANALYTICS_PROVIDER` | `vercel`, then enable Web Analytics in the project |

`.env.local` is for local development only and never deploys.

### 3. ✅ CMS login — DONE, and verified by an actual publish

An officer logged in at `/admin`, edited a gallery caption, and the change
committed to the repo and deployed. The whole chain works.

**Two things about this were non-obvious and cost time. Read them before
standing up a replacement app.**

**The OAuth app is owned by the `aggiefiji` ORGANISATION, not a personal
account.** Do it that way if it is ever re-created. An app owned by a personal
account works, but the CMS then depends on that account continuing to exist —
the same handover trap the repo and the Google assets were moved away from. It
also avoids the next problem entirely, because an org-owned app is not
"third-party" to its own org.

**If the app IS personal, the org will block it, and the error will not tell you
how to fix it.** You get:

> `API_ERROR: Although you appear to have the correct authorization
> credentials, the 'aggiefiji' organization has enabled OAuth App access
> restrictions...`

The login succeeds; only the *write* fails. The fix is an owner granting the app
access at **profile picture → Organizations → `aggiefiji` → Settings →
Third-party Access → OAuth app policy → Review → Grant access**. Note that
GitHub only queues a pending request when a *member* tries to authorise — an
*owner's* attempt can be refused without ever appearing in that list, so it may
look as though there is nothing to approve. **Leave the restriction switched
on** and approve the single app; it is doing its job.

**A third thing that looked like a missing file but was not.** `/admin` (no
trailing slash) made Decap resolve `config.yml` against `/`, so it requested
`/config.yml` and reported `Failed to load config.yml (404)`. `public/admin/index.html`
now names the path absolutely via `<link rel="cms-config-url">`, which takes the
trailing slash out of the equation. Do not remove that tag.

<details>
<summary>Original setup steps, for re-creating the app</summary>

1. GitHub → Settings → Developer settings → **OAuth Apps** → New.
   Authorization callback URL: `https://tamufiji.info/api/callback`
2. Put the client ID and secret in Vercel as `GITHUB_OAUTH_ID` /
   `GITHUB_OAUTH_SECRET`.
3. `public/admin/config.yml` already points at `aggiefiji/aggie-fiji-website`.
   **Confirm `base_url` matches the domain you actually deploy on** — it is set
   to `https://tamufiji.info`, so the login will not work until DNS is cut over,
   or until it is temporarily changed to the `.vercel.app` URL.
4. Give the two or three officers who actually edit the site **write access to
   the repo**. That is the entire permission model — removing them at handover
   removes their access.
5. Set `GITHUB_OAUTH_SCOPE=public_repo` in Vercel. The default `repo` scope
   also covers private repositories, so without this the token an officer
   carries could reach their own private repos.

Then visit `/admin`, click Login with GitHub, and publish a trivial change to
confirm the round trip.

Note GitHub renamed the field: what the docs call the *Authorization callback
URL* now appears as **Redirect URI**. Leave "Allow wildcard matching" and
"Enable Device Flow" unchecked. "Expire user access tokens" can stay checked —
officer tokens then last about 8 hours, and Decap simply asks them to log in
again, which is the right trade for a token with write access.

</details>

**Because the repo now changes without you**, `git pull` before editing locally
or you will eventually conflict with an officer's publish.

### 4. ✅ Delete the old Google API key — DONE

Deleted in Cloud Console, August 2026. It was in the `fiji-donations` repo's git
history permanently and stayed a working credential until then. The new key was
already in use, so nothing broke.

### 5. Add the Decap integrity hash

`public/admin/index.html` pins `decap-cms@3.8.4` but has no `integrity`
attribute yet. Generate and paste it:

```bash
curl -s https://unpkg.com/decap-cms@3.8.4/dist/decap-cms.js \
  | openssl dgst -sha384 -binary | openssl base64 -A
```

### 6. Test on a real phone — first pass done, keep doing it

Mobile was the old site's other failure. Production hides all dev-only markers,
so `npm run preview` looks different from `npm run dev`.

**The first phone pass found three things, all fixed August 2026:**

- **Two pages scrolled sideways.** `shrink-0` on a button — and on a pair of
  buttons — held them at their natural width inside a flex row that had less
  than that. Nothing clipped or wrapped; the *page* got wider than the phone,
  which reads as "the layout is off-centre" rather than as an overflow. Both now
  go full width below `sm` and only refuse to shrink from `sm` up.
  **`shrink-0` on anything containing an uppercase button label is the pattern
  to check first** if this recurs — a desktop browser never shows it, because
  there is always room.
- **Zelle had no address to type.** The QR code covers scanning from a banking
  app, but a donor adding the chapter as a recipient by hand had nothing to
  enter. `payment.zelleEmail` now renders beside the account name. See the entry
  in `CONTENT-TODO.md` — it is currently a personal address and needs re-pointing
  at every handover.
- **A button label was longer than the card holding it** on `/donations`,
  shortened to "See our recognized donors".

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
