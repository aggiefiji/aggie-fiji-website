import "server-only";

/**
 * GOOGLE SHEETS DATA LAYER  (server-side only)
 * ---------------------------------------------------------------------------
 * The chapter tracks giving in a Google Sheet. This module reads it on the
 * SERVER and caches the result, which differs from the draft site in three
 * ways that matter:
 *
 *   1. The API key never reaches the browser. It is read from
 *      GOOGLE_SHEETS_API_KEY (note: no NEXT_PUBLIC_ prefix — that prefix is
 *      what would leak it). Do not rename it.
 *   2. Figures render in the HTML, so they work with JavaScript disabled and
 *      there is no skeleton flash on every page load.
 *   3. Google is called at most once per `REVALIDATE_SECONDS` per fund,
 *      regardless of traffic, so a busy day cannot exhaust the quota.
 *
 * NOTHING HERE THROWS. Every function degrades to null/empty on failure, and
 * callers fall back to figures entered by hand in /content. A Google outage
 * makes numbers stale; it never takes the site down.
 *
 * PRIVACY: the sheet is link-viewable, so it is effectively public. Keep donor
 * names and identifying details OUT of it. Date and Amount only.
 */

import type { DonationEntry, DonorName, FundTotals, WishlistItem } from "@/lib/sheet-types";

// Re-exported so server callers can keep importing types from here.
export type { DonationEntry, DonorName, FundTotals, WishlistItem };

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

/**
 * How long a fetched tab stays cached.
 *
 * THIS IS NOW THE ONLY THING THAT MAKES A FIGURE STALE. The sheet-backed pages
 * set `revalidate = 0`, so each one re-renders on every request; what they
 * render is whatever this cache holds. Sixty seconds is the whole staleness
 * budget, and the Apps Script trigger on the sheet cuts it to zero on an edit.
 *
 * ── WHY THIS CACHE STILL EXISTS AT ALL ──────────────────────────────────────
 * It is not about speed. It is the only thing standing between the chapter and
 * the Google Sheets quota of 300 read requests per minute. One load of the
 * homepage costs roughly eight reads. Uncached, two hundred alumni opening a
 * newsletter link inside a minute would be sixteen hundred reads, Google would
 * start refusing, and every figure on the site would render as $0 — the site
 * lying about the campaign at the exact moment the most people are looking.
 *
 * Cached, the same burst costs eight reads, because they all share one window.
 * That is what this constant buys, and why it should not go to zero.
 *
 * ⚠️ Was 300. Lowering it costs proportionally more quota headroom: the ceiling
 * is roughly 8 × (60 / this value) reads per minute. At 60s that is 8/min
 * against a limit of 300. Do not drop it below about 10 without doing that sum.
 */
export const REVALIDATE_SECONDS = 60;

/*
 * How long a fetched tab stays cached, and why it differs in development.
 *
 * PRODUCTION — 300s. Next.js serves the prebuilt page, and the first request
 * after 5 minutes triggers a background refresh, so figures are at most ~5
 * minutes stale and no deploy is ever needed. That cap also means Google is
 * called once per tab per 5 minutes regardless of traffic, so a busy game day
 * cannot exhaust the quota.
 *
 * DEVELOPMENT — 10s. The Data Cache is written to .next/cache and survives a
 * server restart, which is why killing and restarting the dev server does not
 * pick up a sheet edit and `rm -rf .next` was the only thing that worked. Ten
 * seconds means an edit shows on the next refresh, while still absorbing the
 * burst of requests a hot reload fires. Set it to 0 for no caching at all, at
 * the cost of a Google call per tab per page load.
 */
const DEV = process.env.NODE_ENV !== "production";
const CACHE_SECONDS = DEV ? 10 : REVALIDATE_SECONDS;

/**
 * How long to wait for Google before giving up on a request.
 *
 * ── WHY THIS EXISTS: IT BROKE THE BUILD ─────────────────────────────────────
 * This module promises, at the top of the file, that nothing here throws and
 * that a Google outage makes figures stale rather than taking the site down.
 * That promise had a hole in it: it handled every way a request can *fail* —
 * 400, 403, 404, 429, a thrown network error — and no way for a request to
 * simply never come back.
 *
 * `fetch` has no default timeout. A connection that opens and then stalls does
 * not reject, so the `catch` below never runs, the fallback never fires, and
 * the page render waits forever. During `next build` that hits Next's
 * 60-second static generation limit and the whole build exits non-zero — which
 * is exactly how /donations/donors failed three attempts in a row.
 *
 * Ten seconds is far longer than a healthy Sheets response (typically well
 * under one) and comfortably inside the 60-second budget, so a stalled request
 * now aborts, falls back, and lets the build finish with stale-but-real
 * figures instead of dying.
 */
const FETCH_TIMEOUT_MS = 10_000;

const apiKey = process.env.GOOGLE_SHEETS_API_KEY || "";
const sheetId = process.env.GOOGLE_SHEETS_ID || "";

export const sheetsConfigured = apiKey.length > 0 && sheetId.length > 0;


/* ------------------------------------------------------------------ fetch */

async function fetchTab(tab: string): Promise<Record<string, string>[]> {
  if (!sheetsConfigured) return [];

  const url = `${SHEETS_BASE}/${sheetId}/values/${encodeURIComponent(tab)}?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      /*
       * THE TAG IS WHAT MAKES ON-DEMAND REVALIDATION WORK.
       *
       * Two caches sit between the sheet and a visitor: the rendered page, and
       * this fetch response. `revalidatePath` only clears the first. Without
       * this tag, /api/revalidate would faithfully re-render every page and
       * hand each one a Google response up to five minutes old — the endpoint
       * would return `revalidated: true` and change nothing anyone can see,
       * which is the worst kind of working.
       *
       * `revalidateTag("sheets")` clears this entry, so the re-render actually
       * calls Google. Keep the tag on every sheet read.
       */
      next: { revalidate: CACHE_SECONDS, tags: ["sheets"] },
      // Without this, a stalled connection hangs the render forever. See
      // FETCH_TIMEOUT_MS above — this is the line that keeps the build alive.
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      // A missing tab is a NORMAL state, not a failure: it means the chapter
      // hasn't set that fund up yet. Google reports it as 400 "Unable to parse
      // range". Logged as a warning so it doesn't trip Next's error overlay.
      if (res.status === 400) {
        console.warn(
          `[sheets] Tab "${tab}" doesn't exist in the chapter sheet — that fund will show as "not set up yet". ` +
            `Create the tab (columns: Date, Amount) to switch it on.`,
        );
      } else if (res.status === 403) {
        console.error(
          `[sheets] ${tab}: 403 Forbidden. Most likely the API key is restricted to HTTP referrers — ` +
            `server-side calls send no Referer header. In Google Cloud Console set Application ` +
            `restrictions to None and API restrictions to Google Sheets API only.`,
        );
      } else if (res.status === 404) {
        console.error(`[sheets] ${tab}: 404 — check GOOGLE_SHEETS_ID in .env.local.`);
      } else if (res.status === 429) {
        console.error(`[sheets] ${tab}: 429 rate limited — raise REVALIDATE_SECONDS.`);
      } else {
        console.error(`[sheets] ${tab}: HTTP ${res.status}`);
      }
      return [];
    }
    const data = (await res.json()) as { values?: string[][] };
    const rows = data.values ?? [];
    if (rows.length < 2) return [];

    const headers = rows[0].map((h) => h.trim());
    return rows.slice(1).map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = (row[i] || "").trim();
      });
      return obj;
    });
  } catch (err) {
    // AbortSignal.timeout rejects with a TimeoutError; an explicit abort gives
    // AbortError. Both mean "no answer", which needs different wording from a
    // DNS or TLS failure — otherwise the next person debugging a slow build
    // sees "fetch failed" and goes looking for a network fault that isn't there.
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      console.error(
        `[sheets] ${tab}: no response from Google within ${FETCH_TIMEOUT_MS / 1000}s. ` +
          `Using the fallback figures so the page still renders.`,
      );
    } else {
      console.error(`[sheets] ${tab}: fetch failed`, err);
    }
    return [];
  }
}

/* ---------------------------------------------------------------- parsing */

function toNumber(value: string | undefined): number {
  if (!value) return 0;
  return parseFloat(String(value).replace(/[^0-9.]/g, "")) || 0;
}

/** Accepts YYYY-MM-DD or M/D/YYYY, matching what the sheet already contains. */
export function parseDate(str: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(`${str}T12:00:00`);
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(str);
  if (us) return new Date(Number(us[3]), Number(us[1]) - 1, Number(us[2]), 12);
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* -------------------------------------------------------------- accessors */

/** The Settings tab: a Key/Value sheet holding each fund's goal. */
export async function getSettings(): Promise<Record<string, string>> {
  const rows = await fetchTab("Settings");
  const out: Record<string, string> = {};
  rows.forEach((r) => {
    if (r["Key"]) out[r["Key"].trim()] = r["Value"] ?? "";
  });
  return out;
}

export async function getDonations(tab: string): Promise<DonationEntry[]> {
  const rows = await fetchTab(tab);
  return rows
    .filter((r) => r["Date"] && r["Amount"])
    .map((r) => ({ date: r["Date"], amount: toNumber(r["Amount"]) }))
    .filter((d) => d.amount > 0)
    .sort((a, b) => (parseDate(a.date)?.getTime() ?? 0) - (parseDate(b.date)?.getTime() ?? 0));
}

/**
 * Totals for one fund. `goalKey` is the row in the Settings tab, so the
 * chapter can change a goal in the sheet without a deploy. `defaultGoal` is
 * only used if that row is missing.
 */
export async function getFundTotals(
  donationsTab: string,
  goalKey: string,
  defaultGoal = 0,
): Promise<FundTotals | null> {
  if (!sheetsConfigured) return null;

  const [entries, settings] = await Promise.all([getDonations(donationsTab), getSettings()]);

  const goalFromSheet = toNumber(settings[goalKey]);
  const goal = goalFromSheet > 0 ? goalFromSheet : defaultGoal;
  if (goal <= 0 && entries.length === 0) return null;

  return {
    raised: entries.reduce((sum, e) => sum + e.amount, 0),
    goal,
    donorCount: entries.length,
    lastGiftDate: entries.length ? entries[entries.length - 1].date : null,
  };
}

/** Combined total across every fund — the single number the homepage shows. */
export async function getCumulativeTotals(
  funds: { donationsTab: string; goalKey: string; defaultGoal?: number }[],
): Promise<FundTotals | null> {
  if (!sheetsConfigured) return null;

  const results = await Promise.all(
    funds.map((f) => getFundTotals(f.donationsTab, f.goalKey, f.defaultGoal ?? 0)),
  );
  const present = results.filter((r): r is FundTotals => r !== null);
  if (present.length === 0) return null;

  const dates = present
    .map((r) => r.lastGiftDate)
    .filter((d): d is string => Boolean(d))
    .sort((a, b) => (parseDate(a)?.getTime() ?? 0) - (parseDate(b)?.getTime() ?? 0));

  return {
    raised: present.reduce((s, r) => s + r.raised, 0),
    goal: present.reduce((s, r) => s + r.goal, 0),
    donorCount: present.reduce((s, r) => s + r.donorCount, 0),
    lastGiftDate: dates.length ? dates[dates.length - 1] : null,
  };
}

/**
 * Sort weight for a wishlist item: the FIRST number in its cost string.
 *
 * The column is free text an officer types, so it arrives as "$1,200",
 * "$450", "$50 each", or a range like "$200–$400". Taking the first number
 * rather than stripping every non-digit matters: strip-everything turns
 * "$200–$400" into 200400 and floats a mid-priced item to the top of the list.
 * On a range this reads the low end, which is the honest figure to rank by.
 *
 * Anything with no number at all — blank, "TBD", "varies" — weighs 0 and
 * therefore sorts to the bottom, which is where an unpriced item belongs when
 * the whole list is ordered by cost.
 */
function costValue(cost: string): number {
  const match = /\d[\d,]*(\.\d+)?/.exec(cost || "");
  return match ? parseFloat(match[0].replace(/,/g, "")) || 0 : 0;
}

/**
 * The Wishlist tab, ordered most expensive first.
 *
 * Sorted HERE rather than in the component so every surface that shows the
 * wishlist agrees, and so the ordering cannot drift if another page renders it
 * later. The sheet's own row order is deliberately ignored: it reflects
 * whenever the treasurer happened to add a row, which is not an order a reader
 * benefits from. Ties fall back to the name so the list is stable between
 * builds instead of shuffling when two items cost the same.
 */
export async function getWishlist(): Promise<WishlistItem[]> {
  const rows = await fetchTab("Wishlist");
  return rows
    .filter((r) => r["Name"])
    .map((r) => ({
      name: r["Name"],
      // Still read, and still used as part of the React key, but no longer
      // shown: the category chips and their filter bar were removed in August
      // 2026 after readers found them noise. Kept in the sheet because it is
      // useful to the treasurer for organising rows.
      category: r["Category"] || "General",
      description: r["Description"] || "",
      cost: r["Estimated Cost"] || "",
      images: [r["Image URL 1"], r["Image URL 2"], r["Image URL 3"]].filter(Boolean),
      // Falls back to the name, so adding the column is optional and the site
      // behaves sensibly for rows the treasurer has not got to yet.
      memoName: (r["Memo Name"] || r["Name"]).trim(),
    }))
    .sort((a, b) => costValue(b.cost) - costValue(a.cost) || a.name.localeCompare(b.name));
}

/**
 * The `Donor Wall` tab: names recognised at the $500 threshold.
 *
 * ── WHY THIS IS ALLOWED IN A PUBLIC SHEET, AND WHAT WOULD BREAK IT ──────────
 * The chapter's rule is that this spreadsheet holds Date and Amount only,
 * because it is link-public and tying a person to a figure would expose what
 * each of them gave. This tab is the one safe exception: these names are
 * *already* public by design — they are painted on a wall at every tailgate and
 * listed on the website — so the tab adds no information the chapter has not
 * chosen to publish.
 *
 * The exception holds ONLY while this tab has no amounts. Two rules keep it
 * safe, and both are checked by `npm run check:sheet`:
 *
 *   1. Columns are Name and Group. Never an amount, date, email, or phone.
 *   2. Row order must NOT mirror a donations tab. Name in row 3 here beside
 *      an amount in row 3 there re-creates exactly the link this avoids.
 *      Keeping this tab alphabetical is the simplest way to guarantee it.
 */
export async function getDonorWall(): Promise<DonorName[]> {
  const rows = await fetchTab("Donor Wall");
  return rows
    .filter((r) => r["Name"]?.trim())
    .map((r) => ({
      name: r["Name"].trim(),
      group: r["Group"]?.trim() || undefined,
    }));
}
