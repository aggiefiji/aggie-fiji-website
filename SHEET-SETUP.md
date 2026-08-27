# Chapter giving sheet — structure

Every dollar figure on the website comes from one Google Sheet. This is the
exact structure the site expects. Get this right and nothing on the website
needs editing for the rest of the year.

**Set it up once, then the only maintenance is adding a row per gift.**

---

## The fastest way to build it: upload the template

`FIJI-Giving-TEMPLATE.xlsx` in the project root has all eight tabs pre-named,
the headers in place, and the goal keys filled in. Tab names must match exactly,
and typing eight of them by hand is where this goes wrong.

1. Upload the file to the **chapter account's** Drive.
2. Right-click → **Open with → Google Sheets**, then **File → Save as Google
   Sheets**. That conversion is what preserves the tab names.
3. Delete the example row in each tab — they are marked in grey.
4. Set the real targets in the yellow cells on `Settings`.
5. **Share → Anyone with the link → Viewer.**

Then verify against what the code actually expects:

```bash
npm run check:sheet
```

It reports every fund's tab, gift count, and goal, names any missing tab or
`Settings` row, and warns if a donation tab grows a column that looks like donor
information.

**Current sheet (August 2026):** built this way, on the chapter account, in the
`aggie-fiji-website` Cloud project.

---

## Sheet-level setup, by hand

1. Create the spreadsheet in a **chapter-owned account**, not a personal one —
   otherwise it disappears when that brother graduates.
2. Share → **Anyone with the link → Viewer**. The site reads it, never writes.
3. Copy the ID out of the URL and put it in `.env.local`:
   `https://docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`

> ⚠️ **This sheet is effectively public.** Donation tabs are `Date` and
> `Amount` only — never a name, email, or phone number beside a figure. If the
> chapter needs to track who gave what, keep that in a **separate private
> sheet** the website does not read.
>
> The one exception is the `Donor Wall` tab below, which holds names and nothing
> else. Those names are published on the wall and the website already.

---

## Tabs

Names must match exactly — spelling, spacing, and capitalisation.

### `Settings`

Two columns. Holds every goal, so targets change without touching the website.

Current values, set by the treasurer in August 2026:

| Key | Value | Why |
|---|---|---|
| `Goal` | 75000 | The real ask of parents and alumni this year |
| `Tailgate Goal` | 15000 | Matches the number of names on the sponsor wall in a normal year |
| `Sarraf Goal` | 3000 | Brought in $6.3k last semester; expected to fall as the event recedes |
| `Miller Goal` | 500 | No recorded gifts. Possible retirement at year end |
| `Clark Goal` | 500 | $1.2k last year, but driven by a class that has now graduated |
| `Philanthropy Goal` | 1000 | Best estimate; no history to go on |

Set a goal to what you'd genuinely expect to raise, not what you wish for. The
goal is the denominator on a bar every visitor sees — too high and a healthy
fund reads as neglected.

Values can include `$` and commas — the site strips them.

### Donation tabs

Six tabs, all identical in shape. Headers in row 1, one row per gift.

| Tab name | Fund |
|---|---|
| `Donations` | General / chapter wishlist |
| `Tailgate Donations` | Tailgate sponsorships |
| `Sarraf Donations` | Nikman Sarraf Scholarship |
| `Miller Donations` | Weston A. Miller Scholarship |
| `Clark Donations` | Cameron Clark Fund |
| `Philanthropy Donations` | AFSP philanthropy |

| Date | Amount |
|---|---|
| 2026-09-14 | 250 |
| 9/21/2026 | 1000 |

Both date formats work. Amounts may include `$` and commas.

**A tab that doesn't exist is fine** — that fund shows "tracking coming soon"
instead of a progress bar, and the terminal logs a one-line warning. Nothing
breaks.

### `Donor Wall`

Names recognised at the $500 threshold. Two columns:

| Name | Group |
|---|---|
| The Strey Family | Tailgate Sponsors |
| Willow Brook CC | |

- **Name** is what appears on the website and should match the physical wall.
- **Group** is optional. Leave it blank on every row and the site shows one flat
  alphabetical list; fill it in and the page splits into labelled sections.

> ⚠️ **Name and Group only. Never an amount, date, or email.**
> This sheet is public. These names are already public — they are on a wall at
> every tailgate and on the website — so listing them here exposes nothing new.
> Putting a figure beside one would, instantly and permanently.
>
> Keep this tab **alphabetical**, not in the order gifts arrived. If row 5 here
> lines up with row 5 of a donations tab, the pairing can be reconstructed even
> without an amount column.

`npm run check:sheet` prints every name and fails loudly if an amount-like
column appears.

### `Wishlist`

Drives the wishlist on the Giving page (`/donations`).

| Name | Memo Name | Category | Description | Estimated Cost | Image URL 1 | Image URL 2 | Image URL 3 |
|---|---|---|---|---|---|---|---|
| Storage car port for the trailer | Car Port | Lodge | Replacing the set in the main room. | $1,200 | https://… | | |

- **Name** is the shelf label — write it so it reads well in a list.
- **Memo Name** is the short version a donor writes on Venmo. Pressing *Give*
  next to this row sends them to the Give page with the memo already filled in
  as `Fundraising Campaign - Car Port`. **You are writing what you will later
  read on a bank statement, so keep it short and recognisable.** Leave it blank
  and the full Name is used instead, which still works but makes for a long memo.
- **Estimated Cost** decides the ORDER — the list is sorted most expensive
  first, so the sheet's own row order does not matter. It is also shown exactly
  as typed, so format it how you want it to read. A range like `$200–$400` sorts
  by its lower figure; anything with no number in it sorts to the bottom.
- **Category** is no longer shown on the site. The chips and their filter were
  removed in August 2026. Keep using it to organise the sheet if that helps you
  — just know visitors never see it.
- Image URLs must be **direct links to an image file**. A Google Drive share
  link will not work; the file has to end in `.jpg`/`.png` or be served by an
  image host.

---

## Starting a fresh year

Recommended: **duplicate the sheet, don't clear it.**

1. File → Make a copy → name it `FIJI Giving 2026–27`.
2. In the copy, delete all rows under the headers in every donation tab.
3. Update the goals in `Settings`.
4. Point `GOOGLE_SHEETS_ID` in `.env.local` at the copy.

The previous year survives untouched as an archive, and the structure is
guaranteed to match because it was copied rather than rebuilt.

---

## Where the wiring lives

`src/lib/funds.ts` maps each fund to its tab name and Settings key. If you
rename a tab in the sheet, change it there too — those two must agree.

## Making edits appear instantly (optional)

The five-minute cache below is the fallback. On top of it, the sheet can tell
the site the moment it changes, so a figure updates in seconds instead of
minutes. Worth having when a treasurer logs a gift and shows the page at a
meeting; harmless to skip.

**This is entirely optional.** If the trigger is deleted, the script's owner
graduates, or Apps Script hits a quota, the site quietly falls back to the
five-minute cycle. Nothing breaks.

### One-time setup

**1. Make a secret.** On your own machine:

```bash
openssl rand -hex 32 | pbcopy
```

Never put it in this repo, in a commit, or in a chat message.

**2. Vercel** → Settings → Environment Variables → `REVALIDATE_SECRET`, paste,
all environments. **Not** `NEXT_PUBLIC_` — that prefix ships a value to every
visitor's browser. Redeploy.

**3. The sheet** → Extensions → Apps Script.
   - Project Settings → Script Properties → add `REVALIDATE_SECRET` with the
     same value.
   - Paste this into the editor:

```js
const ENDPOINT = "https://aggiefiji.com/api/revalidate";

function notifySite() {
  // An "on change" trigger fires on nearly every keystroke. Without this,
  // typing one row of gifts would fire dozens of rebuilds.
  const cache = CacheService.getScriptCache();
  if (cache.get("pending")) return;
  cache.put("pending", "1", 30);

  const secret = PropertiesService.getScriptProperties()
    .getProperty("REVALIDATE_SECRET");

  const res = UrlFetchApp.fetch(ENDPOINT, {
    method: "post",
    headers: { "x-revalidate-secret": secret },
    muteHttpExceptions: true,
  });
  console.log(res.getResponseCode(), res.getContentText());
}
```

   - Triggers (the clock icon) → Add trigger → function `notifySite`, source
     **From spreadsheet**, event type **On change**. Approve the permissions
     prompt.

**4. Test it.** Run `notifySite` from the editor. The log should show `200` and
`{"revalidated":true,...}`. A `401` means the two copies of the secret differ.
A `503` means Vercel has not got it, or you have not redeployed since adding it.

### What gets revalidated

`/`, `/donations`, `/donations/give`, `/donations/donors` — every route that
reads the sheet. `/donations/give` is on the list because it checks memo details
against live wishlist rows.

`/events` is not, because it reads the calendar rather than the sheet. The
calendar fetch is tagged too, so a calendar webhook would need no new code.

### Notes for whoever inherits this

- **The script lives in the sheet, not in this repo.** It is the one piece of
  this system that a `git clone` will not give you. If giving figures stop
  updating instantly but still update within five minutes, the trigger is what
  broke — start at Extensions → Apps Script → Triggers.
- **Installable triggers do not fire for edits made by other scripts or by the
  Sheets API** — only by a person editing the sheet. That covers the real case.
- **The endpoint is safe to leave public.** It accepts POST only, takes the
  secret from a header rather than the URL, compares it in constant time, and
  answers a wrong secret with a bare 401.

---

## "I edited the sheet and the site didn't change"

**Wait a minute and reload.** That is almost always the whole answer.

Every page that shows sheet figures is rendered fresh on each visit, so opening
the site in a new tab always re-reads. What it re-reads is a pooled copy of the
sheet that is refreshed **once a minute** — and immediately, if the Apps Script
trigger above is set up.

That one-minute pool is not there for speed. It is the only thing between the
chapter and Google's limit of 300 sheet reads per minute. One homepage load
costs about eight reads; without the pool, a couple of hundred alumni opening a
newsletter link at once would exceed the limit, Google would start refusing, and
**every figure on the site would render as $0** — the site denying the campaign
exists at the moment the most people are looking at it. One minute of staleness
is the price of that not happening.

**If a figure is still wrong after a couple of minutes**, it is not the cache:

1. Run `npm run check:sheet`. It reads the sheet exactly the way the site does
   and names the problem — usually a header that no longer reads `Date` or
   `Amount`, or a gift entered without a date.
2. If that is clean, check the Apps Script trigger: Extensions → Apps Script →
   Executions. A run logging `401` means the two copies of the secret differ; a
   `503` means Vercel does not have `REVALIDATE_SECRET`, or has it but has not
   been redeployed since.
3. Still stuck? Redeploy from Vercel. That clears everything.

**A note on what changed, August 2026.** These pages used to be static files
rebuilt every five minutes, which meant a figure could be up to ten minutes old
and needed loading twice to appear. They now render per request. Events are
still on the old five-minute cycle — the calendar changes rarely and has its own
quota.

---

## Checking it works

With `npm run dev` running, load `/donations`. The terminal prints a line for
any tab it can't read:

| Message | Meaning |
|---|---|
| `Tab "X" doesn't exist` | Normal if that fund isn't set up yet |
| `403 Forbidden` | API key is restricted to HTTP referrers — see `.env.local` |
| `404` | Wrong `GOOGLE_SHEETS_ID` |
| `429` | Rate limited — raise `REVALIDATE_SECONDS` in `src/lib/sheets.ts` |

Figures refresh about every 5 minutes; they are not instant by design.
