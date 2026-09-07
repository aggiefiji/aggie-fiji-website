# Operations — running the live site

Everything that is **not** code: what is open, what the chapter owns, what
breaks at a handover, and the procedures worth not re-deriving.

For how the site is built, see `ARCHITECTURE.md` and `DESIGN.md`. This file is
the state of the world around it.

*Verified against the live deployment on 7 September 2026. Every ✅ below was
checked, not assumed.*

---

## Status

**Live at https://aggiefiji.com.** DNS is cut over, the old Wix site is retired,
the Vercel deployment is what visitors get, and officers publish through
`/admin` without a developer. The `.vercel.app` address still works and still
deploys; the custom domain is the one to give people.

`git pull` before editing locally — the CMS commits to this repo as whichever
officer is logged in, so it changes without you.

**Verified working against production:** Google Sheet reads from Vercel's
network, Google Calendar reads, the memo system end to end, the apex serving
with `www` redirecting to it (308), correct `aggiefiji.com` URLs in
`sitemap.xml` and `robots.txt`, and all five security headers (`strict-transport-security`, `x-content-type-options`,
`x-frame-options`, `referrer-policy`, `permissions-policy`).

---

## 🔴 Open — verified

*Checked against production. The two domain items below were fixed on
7 September 2026 — see Resolved.*

### The old Google API key may still be live

The two docs this file replaced disagreed: the old handover note claimed it was
deleted in August, while `CLAUDE.md` listed it as still outstanding.
**Unresolved — treat as live until checked.**

It is in the `fiji-donations` repo's git history permanently, so it stays a
working credential until deleted at the source. The current key is already in
use, so deleting the old one breaks nothing.

**Check:** Google Cloud Console → the `aggie-fiji-website` project →
APIs & Services → Credentials. If a second, older key is listed, delete it.
Deleting an already-deleted key is a no-op, so there is no risk in looking.

---

## ✅ Resolved — 7 September 2026

### `NEXT_PUBLIC_SITE_URL` now reads `https://aggiefiji.com`

**Verified live:** `robots.txt` emits `Sitemap: https://aggiefiji.com/sitemap.xml`
and every `<loc>` in `sitemap.xml` is on `aggiefiji.com`.

It had been left at `https://tamufiji.info` through the domain move, and that
domain now 404s — so the sitemap handed to Google, and every link-preview card,
pointed at a dead address.

> **If this variable is ever changed again, redeploy.** `NEXT_PUBLIC_` values are
> compiled into the build, not read at request time, so saving a new value
> changes nothing until the next deployment.

**Google Search Console** is set up on the chapter account as a URL-prefix
property for `https://aggiefiji.com`, and the sitemap has been submitted.

> ⚠️ **Do not delete `public/googlefaf522cc98014818.html`.** It looks like stray
> junk in `public/`, and it is not — it is what proves to Google that the chapter
> owns this domain. Google re-checks it periodically, so removing it
> un-verifies the property silently, weeks later, and Search Console stops
> reporting. Leave it in place permanently.

URL-prefix rather than the DNS-based Domain property, deliberately: `www` 308s
to the apex, so all traffic consolidates on one hostname and there was no need
to touch the Wix DNS records to set this up.

### `www.aggiefiji.com` redirects to the apex

**Verified live:** `HTTP 308` → `https://aggiefiji.com/`, one hop, apex still
serving 200.

It had been serving its own copy of the site rather than redirecting, so both
hostnames returned identical content. Set in Vercel → Settings → Domains → Edit
on `www.aggiefiji.com` → Redirect to → `aggiefiji.com`.

**308 Permanent, not the 307 default.** A 307 redirects visitors correctly but
leaves search engines treating the two hostnames as separate pages, which is
half of what the redirect exists to fix.

> **There is no "primary domain" switch in Vercel.** Primary is expressed purely
> as which way the redirect runs. Both DNS records are still needed — `www` has
> to resolve before it can redirect.

---

## 🟡 Available but not set up

### Instant sheet updates (`REVALIDATE_SECRET`)

**Confirmed:** `POST /api/revalidate` answers
`503 — REVALIDATE_SECRET is not set on this deployment`.

**Nothing is broken.** Without it the site runs on its 60-second cycle, exactly
as designed. With it, a figure updates the moment the treasurer logs a gift —
worth having if figures get shown at a meeting.

Setup, and the Apps Script itself, is written out in `SHEET-SETUP.md`. **The
script half lives in the sheet, not in this repo** — a `git clone` will not give
it to you.

*Diagnostic for later:* if figures stop updating instantly but still update
within a minute, the trigger broke, not the site.

---

## 🟡 Content the chapter still owes

Nothing here needs code. Unfilled items render **nothing** in production and an
amber marker in development, so none of this can ship as placeholder text — but
a page with less on it still looks thin.

- [ ] **Gallery captions.** All five are empty. This is the accessibility one:
      an empty caption means the image ships `alt=""`, and since photos expand,
      the caption is the only thing the overlay can put under the picture.
- [ ] **Summer 2026 newsletter PDF.** The issue is listed with `file: ""`, so it
      is hidden from visitors entirely — a row that links nowhere doesn't render.
      Drop the PDF in `public/newsletters/` and point the JSON at it, or delete
      the entry.
- [ ] **Social handles.** `content/site.json` → `social`, editable in the CMS
      under Chapter info. All five are blank. Any blank one is skipped, so the
      footer never shows a dead icon.
- [ ] **Zelle → the chapter inbox.** The Give page currently publishes
      `slatonstrey@gmail.com`, a **personal** address, against the one-role-inbox
      rule the rest of the site follows. A stale address here does not fail
      loudly — it quietly routes gifts to a graduate. Best fix: register the
      chapter's Zelle to `fijitamu@gmail.com` and put that here instead.
- [ ] **Donor Wall names.** The page is built and shows its "being updated"
      state. Either add a `Donor Wall` tab to the sheet (`Name` + `Group`,
      **never amounts**) or fill `content/donations/donors.json`. The sheet wins
      whenever it returns names.

**Done, for the record:** chapter contact details; all eight officer names; all
eight officer headshots (Ben Powell's landed 23 August); the `Memo Name` column.

### Ongoing, not blockers

- **Keep the calendar current** — this is the entire events system.
- **Keep the wishlist current** — sheet `Wishlist` tab, sorts itself.
- **Fund goals.** The $75,000 General goal is real. The foundation and
  philanthropy goals are guesses the chapter thinks are too high. They live in
  the sheet's `Settings` tab — a treasurer edit, not a deploy.
- **Decide on Miller and Clark.** Both may be retired at year end. Miller has no
  recorded gifts; Clark was driven by a class that has graduated. If either
  goes: remove it from `FUNDS` and add a redirect. Historical sheet rows stay.
- **Tailgate fund.** Separate for now while recognition tiers settle. May be
  pooled into General later — `src/lib/funds.ts` has the instructions.

### Settled — do not re-open

Recorded so nobody re-litigates them. Removed at the chapter's request or by
decision: the contact form (it showed success and sent nothing); online card
payments; newsletter signup and distribution; per-officer bios and the
Leadership page; the five values, the timeline and the chapter history; the
crest section; share buttons; the three separate fund pages; wishlist category
chips and their filter; the homepage chapter-intro paragraph; the chapter
founding year (`foundedChapter` / `foundedNational` were deleted, not filled —
they sat in the CMS asking to be completed while rendering on no page at all);
the DFW Alumni Dinner as a content task (it is a calendar entry now).

**Tax treatment is answered:** gifts are **not** tax-deductible — the chapter is
a private fraternal organization. Confirmed August 2026.

**The chapter inbox is `fijitamu@gmail.com`** — one `i`. The double-`i` spelling
in an early note was a typo. Confirmed by the treasurer. Don't "correct" it back.

---

## What the chapter pays for

**Slimmed down in 2026. Only one line item remains.**

| Item | Renews | Status |
|---|---|---|
| **Domain `aggiefiji.com`** (at Wix) | 27 Jul 2027 | **Keep.** The only one that still does anything — it is the name, and the DNS control that points it at Vercel. |
| Everything else at Wix | — | Cancelled or lapsed. Premium plan, business email, `tamufiji.info`. |

Vercel's Hobby plan hosts the site, connects the custom domain, shows no ads and
runs the analytics — free at this scale.

### The last handover dependency

Keeping the domain at Wix means the chapter depends on **whoever owns that Wix
account** for DNS. That is the same trap the repo, the Google assets and the
OAuth app were all moved out of. **At the July 2027 renewal, transferring the
domain to a registrar under `fijitamu@gmail.com` would close it.**

### Unresolved: somebody owns an Emma account on this domain

The `e2ma-k*._domainkey` CNAME records point at `e2ma.net` (Emma, an email
marketing platform) and are DKIM keys. Nobody has identified whose account they
belong to. Find out before the next handover.

---

## Analytics

**Vercel Web Analytics, plus Speed Insights.** No cookies, no consent banner,
free at this scale. Both ride on the single
`NEXT_PUBLIC_ANALYTICS_PROVIDER=vercel` variable, and **each must also be
enabled in its own dashboard tab**.

Reporting windows on Hobby are short and differ: **one month** for Web
Analytics, **seven days** for Speed Insights. Plausible is the one to reach for
if year-over-year comparison ever matters.

Historical Wix figures stopped growing at the cutover and cannot be imported.

---

## Procedures worth not re-deriving

### The CMS login (GitHub OAuth)

Working and verified by an actual publish. Two things about it were non-obvious
and cost real time — read these before standing up a replacement app.

**The OAuth app is owned by the `aggiefiji` ORGANISATION, not a personal
account.** Do it that way if it is ever re-created. A personal app works, but the
CMS then depends on that account continuing to exist — the same handover trap —
and it walks straight into the next problem, because an org-owned app is not
"third-party" to its own org.

**If the app IS personal, the org will block it, and the error will not tell you
how to fix it.** The login *succeeds*; only the **write** fails, with:

> `API_ERROR: Although you appear to have the correct authorization
> credentials, the 'aggiefiji' organization has enabled OAuth App access
> restrictions...`

Fix: an owner grants the app access at profile picture → Organizations →
`aggiefiji` → Settings → Third-party Access → OAuth app policy → Review → Grant
access. **Note GitHub only queues a pending request when a *member* tries to
authorise** — an *owner's* attempt can be refused without ever appearing in that
list, so it may look as though there is nothing to approve. **Leave the
restriction switched on** and approve the single app; it is doing its job.

**A third thing that looked like a missing file but was not.** `/admin` with no
trailing slash made Decap resolve `config.yml` against `/`, so it requested
`/config.yml` and reported `Failed to load config.yml (404)`.
`public/admin/index.html` now names the path absolutely via
`<link rel="cms-config-url">`. **Do not remove that tag.**

<details>
<summary>Re-creating the OAuth app from scratch</summary>

1. GitHub → Settings → Developer settings → **OAuth Apps** → New.
   Authorization callback URL: `https://aggiefiji.com/api/callback`
   (GitHub renamed this field — it now appears as **Redirect URI**). Leave
   "Allow wildcard matching" and "Enable Device Flow" unchecked. "Expire user
   access tokens" can stay checked: officer tokens then last about 8 hours and
   Decap simply asks them to log in again, which is the right trade for a token
   with write access.
2. Put the client ID and secret in Vercel as `GITHUB_OAUTH_ID` /
   `GITHUB_OAUTH_SECRET`.
3. `public/admin/config.yml` points at `aggiefiji/aggie-fiji-website`, with
   `base_url: https://aggiefiji.com`. **`base_url` and the app's Redirect URI
   must agree** — if they disagree, the login popup hangs on "Completing
   sign-in" with nothing in the console, because a `postMessage` to the wrong
   origin is dropped silently. The popup swaps in an explanation after ten
   seconds; the long version is in `src/app/api/callback/route.ts`.
4. Give the two or three officers who actually edit the site **write access to
   the repo**. That is the entire permission model — removing them at handover
   removes their access.
5. Set `GITHUB_OAUTH_SCOPE=public_repo` in Vercel. The default `repo` scope also
   covers private repositories, so without this an officer's token could reach
   their own private repos.

Then visit `/admin`, log in, and publish a trivial change to confirm the round
trip.

</details>

### Vercel environment variables

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://aggiefiji.com` — **not optional.** Unset, everything points at `localhost:3000`. Baked in at build time, so a change needs a redeploy |
| `GOOGLE_SHEETS_ID`, `GOOGLE_SHEETS_API_KEY` | From `.env.local` |
| `GOOGLE_CALENDAR_ID` | From `.env.local` |
| `GITHUB_OAUTH_ID`, `GITHUB_OAUTH_SECRET` | From the OAuth app |
| `GITHUB_OAUTH_SCOPE` | `public_repo` |
| `NEXT_PUBLIC_ANALYTICS_PROVIDER` | `vercel` |
| `REVALIDATE_SECRET` | Optional. Not currently set |

`.env.local` is local development only and never deploys. **Nothing secret is
committed** — verified across the repo, and `.gitignore` excludes `.env*` with
an `!.env.example` exception.

### Moving the domain (repeat this if it ever moves again)

**What was done in August 2026:** Wix's three apex `A` records —
`185.230.63.107`, `.186`, `.171`, its shared-hosting pool — were replaced with
Vercel's single Anycast address, `www` was pointed at Vercel's CNAME target, and
the Emma DKIM records were left alone.

**Four traps, each of which cost time:**

1. **Wix hands out three A records for one apex; Vercel needs one.** Round-robin
   across shared hosts versus a single Anycast address. **Every Wix IP has to
   go.** Leaving even one sends roughly one visitor in three to a dead host —
   intermittently, and looking fine from whichever machine cached the right
   answer. It reports as "the site works sometimes", the worst bug to be handed.
2. **Do not touch the `e2ma-k*._domainkey` CNAMEs, the MX records, or the TXT
   records.** Deleting DKIM keys breaks nothing visible — it quietly moves
   chapter email into spam folders weeks later.
3. **Check for a CAA record.** One that doesn't permit Let's Encrypt silently
   blocks Vercel from issuing the TLS certificate: DNS resolves, the domain
   still reads as invalid, and nothing says why. Delete it or allow
   `letsencrypt.org`.
4. **Point the DNS; do not use a Wix redirect.** A redirect sends visitors to
   the `.vercel.app` address and leaves *that* in the address bar, which is the
   opposite of what is wanted.

**Pointing is also the only option here.** Wix does not allow the nameservers of
a Wix-registered domain to be changed. Happy accident: editing individual
records leaves MX alone, so chapter email survives untouched.

**Read the exact records off the Vercel dashboard rather than trusting any value
written down here** — they are per-project. Older projects get `76.76.21.21`;
newer ones get an anycast address such as `216.198.79.1`, and Vercel verifies
against the exact record your card names.

**Order matters.** Change `NEXT_PUBLIC_SITE_URL` and the CMS `base_url` *after*
DNS resolves, or the CMS login breaks in the gap.

### Regenerating the Decap integrity hash

`public/admin/index.html` pins `decap-cms@3.8.4` **exactly** — that page holds a
GitHub token, so unreviewed CDN code must not run beside it. This is the one
pinned dependency in the project; everything else uses `^` ranges on purpose.

Regenerate the hash whenever the pinned version changes:

```bash
curl -sL https://unpkg.com/decap-cms@VERSION/dist/decap-cms.js -o /tmp/decap.js
ls -l /tmp/decap.js
openssl dgst -sha384 -binary /tmp/decap.js | openssl base64 -A; echo
```

**Check the size before trusting the hash** — the real bundle is around 5 MB, and
a few hundred bytes means you hashed a redirect page.

*zsh note:* `#` comments are not enabled in an interactive shell, so do not paste
commands with trailing comments — `~2-3 MB` gets read as a home directory and
the line fails.

### Keeping it patched

Once a semester, whoever holds the website role:

```bash
npm install
npm audit          # should report 0 vulnerabilities
npm run build      # confirm it still builds
```

If `npm audit` reports something, run `npm audit fix`. **Avoid
`npm audit fix --force`** — it is allowed to jump major versions, which is how a
project ends up off its LTS line with a broken build.

### Testing on a real phone

Mobile was the old site's other failure. **Production hides all dev-only
markers, so `npm run preview` looks different from `npm run dev`.** Test the
preview build.

The first phone pass found three things, all fixed: two pages scrolling sideways
(`shrink-0` on buttons — see `DESIGN.md`), Zelle having no typeable address
beside its QR code, and a button label longer than its card.

---

## Known limitations, accepted

- **No script CSP.** Deliberate — the reasoning is in `next.config.ts`. The
  other five security headers are set and verified live.
- **A Google outage shows $0** rather than a stale-but-real figure, because
  sheet-backed pages render live and there is no last-good static page. Bounded
  to roughly one visitor per minute. See `ARCHITECTURE.md`.
- **The CMS `donations` collection is broader than its two remaining files** —
  it still offers payment, donors and tier fields on every entry.
- **The repo must stay public.** Vercel Hobby only deploys the owner's commits
  on a private repo, and the CMS commits as whichever officer is logged in.
  Private would mean every officer except one hits Publish and watches the site
  never change, with no error anywhere. Changing this needs a Vercel Pro plan
  alongside it.
