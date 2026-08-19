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

**THE DOMAIN CHANGED IN AUGUST 2026.** It was `tamufiji.info`; the chapter
retired that and the site goes live on **`aggiefiji.com`**, which is registered
at Wix and currently serves the old Wix site. Every reference in this repo was
updated. If you find `tamufiji.info` anywhere, it is stale — the one surviving
`tamufiji` string is an Instagram handle in a CMS hint, which is unrelated.

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
- `robots.txt` and `sitemap.xml` emit whatever `NEXT_PUBLIC_SITE_URL` is set to.
  **That variable still says `tamufiji.info` in Vercel and must be changed to
  `https://aggiefiji.com`** — see step 7. Until it is, every canonical URL and
  link preview points at a domain the chapter no longer owns.

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

Set and confirmed working, **with one variable now wrong.**
`NEXT_PUBLIC_SITE_URL` was set to `https://tamufiji.info` before the chapter
retired that domain. It must become `https://aggiefiji.com`, and because it is a
`NEXT_PUBLIC_` variable it is baked in at build time — changing it requires a
redeploy, not just a save. Do not submit the sitemap to Google until that is
done and DNS resolves.

Original reference:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://aggiefiji.com` — **not optional.** Left unset, `sitemap.xml`, `robots.txt` and every link preview point at `localhost:3000`. Baked in at build time: changing it needs a redeploy |
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
   Authorization callback URL: `https://aggiefiji.com/api/callback`
2. Put the client ID and secret in Vercel as `GITHUB_OAUTH_ID` /
   `GITHUB_OAUTH_SECRET`.
3. `public/admin/config.yml` already points at `aggiefiji/aggie-fiji-website`.
   **Confirm `base_url` matches the domain you actually deploy on** — it is set
   to `https://aggiefiji.com`, so the login will not work until DNS is cut over,
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

### 5. ✅ Add the Decap integrity hash — DONE

`public/admin/index.html` pins `decap-cms@3.8.4` and now carries the matching
`integrity` hash. Regenerate it whenever the pinned version changes — the
command and the failure mode are both documented in that file.

```bash
curl -sL https://unpkg.com/decap-cms@VERSION/dist/decap-cms.js -o /tmp/decap.js
ls -l /tmp/decap.js
openssl dgst -sha384 -binary /tmp/decap.js | openssl base64 -A; echo
```

Check the size before trusting the hash — the real bundle is around 5 MB, and a
few hundred bytes means you hashed a redirect page. **Note for zsh:** `#`
comments are not enabled in an interactive shell, so do not paste commands with
trailing comments; `~2-3 MB` gets read as a home directory and the line fails.

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

### 7. Point aggiefiji.com at Vercel — DO THIS LAST

The domain is registered at **Wix** and currently serves the old Wix site. The
goal is that `aggiefiji.com` serves THIS site, with the address bar still
reading `aggiefiji.com`.

**Point the DNS; do not use a Wix redirect.** A redirect sends visitors to the
`.vercel.app` address and leaves that showing in the address bar, which is the
opposite of what is wanted. Pointing means Wix answers DNS while Vercel serves
the pages.

**Pointing is also the ONLY option here.** Wix does not allow the nameservers of
a Wix-registered domain to be changed, so the usual "just switch to Vercel's
nameservers" advice does not apply. That is a happy accident: editing individual
records leaves the MX records alone, so chapter email — if it is ever in use —
survives untouched.

**Order matters.** Steps 3 and 4 break the CMS login if they land before DNS
resolves, so do them after step 2 confirms.

1. **Vercel → project → Settings → Domains → Add.** Enter `aggiefiji.com`.
   Vercel will offer to add `www.aggiefiji.com` too — take it, and set the apex
   as primary so `www` redirects to it rather than the reverse. Vercel shows the
   exact records to create; **read them off the dashboard rather than trusting
   any value written down here**, because they are per-project. Older projects
   get `76.76.21.21`; newer ones get an anycast address such as `216.198.79.1`,
   and Vercel verifies against the exact record your card names. Expect an `A`
   record for the apex and a `CNAME` for `www`.
2. **Wix → Domains → the ⋯ icon beside `aggiefiji.com` → Manage DNS Records.**
   Point the root `A` record at Vercel's IP and the `www` `CNAME` at Vercel's
   target, deleting Wix's own A/CNAME values so they cannot conflict. **Leave the
   MX records alone.** If Wix refuses to let you edit the root record, disconnect
   the domain from the Wix site first.

   **Check for a CAA record while you are in there.** A CAA record that does not
   permit Let's Encrypt silently blocks Vercel from issuing the TLS certificate:
   DNS resolves, the domain still reads as invalid, and nothing says why. Either
   delete it or allow `letsencrypt.org`.

   Propagation can take up to 48 hours, though it is usually far quicker.
   Confirm `https://aggiefiji.com` serves this site before going on.
3. **Vercel → Settings → Environment Variables.** Change `NEXT_PUBLIC_SITE_URL`
   to `https://aggiefiji.com`, then **redeploy** — it is baked in at build time,
   so saving alone changes nothing.
4. **Two changes that must land together:** set `base_url` in
   `public/admin/config.yml` to `https://aggiefiji.com`, and add
   `https://aggiefiji.com/api/callback` as a Redirect URI on the GitHub OAuth
   app. If they disagree, the login popup hangs on "Completing sign-in" with
   nothing in the console — a `postMessage` to the wrong origin is dropped
   silently. The popup now swaps in an explanation after ten seconds; the long
   version is in `src/app/api/callback/route.ts`.
5. **Verify:** log in at `/admin` and publish a trivial change. Then check
   `aggiefiji.com/sitemap.xml` emits `aggiefiji.com` URLs, and submit it to
   Google.

**Wix analytics stops collecting the moment this cuts over.** Once DNS points at
Vercel, Wix no longer serves a single request on this domain, so it has nothing
left to measure. Historical Wix figures stay viewable in the Wix dashboard, but
they will not grow, and they cannot be imported into Vercel. Vercel Web
Analytics takes over from the cutover date — **export anything from Wix worth
keeping before you switch**, because the two data sets will never join up.

### 8. ✅ Confirm the chapter email spelling — DONE

`fijitamu@gmail.com`, one `i`. Confirmed by the treasurer, August 2026. The
double-`i` spelling in an early note was a typo.

---

## What the chapter pays for — and what it should stop paying for

Reviewed August 2026 from the Wix billing screen. **Every item below is a
separate subscription.** Cancelling one does not cancel the others, which is the
whole reason this is safe to unpick.

| Subscription | Renews | Keep it? |
|---|---|---|
| **Domain `aggiefiji.com`** | 27 Jul 2027 | **YES — this is the only one that matters.** It is the name and the DNS control that points it at Vercel. |
| Premium plan (Business) | 7 Aug 2027 | **No.** Turn off auto-renew after cutover. |
| Domain `tamufiji.info` | 3 Nov 2028 | Auto-renew already off. Owned until then — see below. |
| 2 business email users `@aggiefiji.com` | 23 Nov 2026 | Auto-renew already off. **Check before it lapses — see below.** |

### Why the Premium plan can go

A Wix Premium plan buys one thing: the right to serve a **Wix** site on your own
domain, plus the hosting behind it. Without it a Wix site can only live at a
`wix.com/...` URL with Wix's ads on it.

Once DNS points at Vercel there is no Wix site, so there is nothing left for that
plan to do. Vercel's Hobby plan hosts the site, connects the custom domain, shows
no ads, and runs the analytics — all free at this scale. The Business tier
specifically is the one you buy to **accept online payments**, and the chapter
decided against a payment processor entirely (see constraint 5 in `CLAUDE.md`).

**Turn off auto-renew rather than cancelling.** The plan is paid through Aug 2027
either way — Wix's 14-day refund covers first-time purchases, not renewals — so
cancelling early buys nothing and removes the old Wix site as a fallback while
DNS settles.

### ⚠️ The business email lapses 23 November 2026

Two `@aggiefiji.com` mailboxes, auto-renew off. **Confirm nobody is using them
before that date.** The site publishes `fijitamu@gmail.com` and nothing points at
an `@aggiefiji.com` address, so this is probably dead weight — but email fails
silently, and once mailboxes are released the contents are not coming back.

**If they ARE in use, the MX records must survive the DNS change.** Use the
pointing method in step 7 (edit the A and CNAME records at Wix) and MX is left
alone. Switching to Vercel's nameservers would require recreating every record by
hand, and mail breaks in the gap.

### tamufiji.info is still owned until 3 November 2028

Auto-renew is off, but the registration is paid through then. Free while it
lasts: point it at `aggiefiji.com` as a **redirect** so anything printed with the
old address still lands. A redirect is right here and wrong for the main domain —
see step 7 for why.

### The last handover dependency

Keeping the domain at Wix means the chapter depends on **whoever owns that Wix
account** for DNS. That is the same trap that moved the repo, the Google assets,
and the OAuth app onto chapter-owned accounts. At the July 2027 renewal, moving
the domain to a registrar under `fijitamu@gmail.com` would close the last one.

---

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

**Analytics chosen:** Vercel Web Analytics, plus Speed Insights alongside it.
No cookie banner, free at this scale. Reporting windows on Hobby are short and
differ: one month for Web Analytics, **seven days** for Speed Insights. Both ride
on the single `NEXT_PUBLIC_ANALYTICS_PROVIDER=vercel` variable, and each must
also be enabled in its own dashboard tab.

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

- **Gallery images ship `alt=""`** because all five captions are empty. The CMS
  no longer marks caption required, so this is now purely a content task — see
  `CONTENT-TODO.md`.
- **No script CSP.** Deliberate — see the reasoning in `next.config.ts`. The
  other security headers are set.
- **CMS `donations` collection is broader than its two remaining files.** It
  still offers payment, donors and tier fields on every entry.
