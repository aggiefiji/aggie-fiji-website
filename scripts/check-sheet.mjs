#!/usr/bin/env node
/**
 * GIVING SHEET CONNECTION CHECKER
 * ---------------------------------------------------------------------------
 * Companion to check-calendar.mjs. Verifies the chapter sheet is reachable and
 * that every tab and goal key the site expects actually exists, before you go
 * hunting through the dev server for a fund that renders as "coming soon".
 *
 *   node scripts/check-sheet.mjs
 *
 * Zero dependencies, plain Node with built-in fetch (Node 18+).
 *
 * The tab names and goal keys below mirror src/lib/funds.ts, which is the
 * authoritative registry. If you add a fund there, add it here too.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

/** Mirrors FUNDS in src/lib/funds.ts — label, donations tab, Settings goal key. */
const FUNDS = [
  ["General / wishlist", "Donations", "Goal"],
  ["Tailgate", "Tailgate Donations", "Tailgate Goal"],
  ["Sarraf Scholarship", "Sarraf Donations", "Sarraf Goal"],
  ["Miller Scholarship", "Miller Donations", "Miller Goal"],
  ["Clark Fund", "Clark Donations", "Clark Goal"],
  ["AFSP Philanthropy", "Philanthropy Donations", "Philanthropy Goal"],
];

function loadEnvLocal() {
  const env = {};
  let raw;
  try {
    raw = readFileSync(join(root, ".env.local"), "utf8");
  } catch {
    console.log(red("\nNo .env.local found. Copy .env.example to .env.local first.\n"));
    process.exit(1);
  }
  for (const line of raw.split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return env;
}

const env = loadEnvLocal();
const sheetId = env.GOOGLE_SHEETS_ID || "";
const apiKey = env.GOOGLE_SHEETS_API_KEY || "";

console.log(bold("\nGiving sheet connection check\n"));
console.log(`  GOOGLE_SHEETS_ID     ${sheetId ? green(sheetId) : red("not set")}`);
console.log(`  GOOGLE_SHEETS_API_KEY ${apiKey ? green(`set (${apiKey.length} chars)`) : red("not set")}\n`);

if (!sheetId || !apiKey) {
  console.log(red("Both are required. See SHEET-SETUP.md.\n"));
  process.exit(1);
}

const BASE = "https://sheets.googleapis.com/v4/spreadsheets";

/** Returns { ok, status, rows } — never throws. */
async function readTab(tab) {
  const url = `${BASE}/${sheetId}/values/${encodeURIComponent(tab)}?key=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { ok: false, status: res.status };
    const data = await res.json();
    return { ok: true, rows: data.values ?? [] };
  } catch (err) {
    return { ok: false, status: 0, message: err.message };
  }
}

/* First call doubles as the connectivity and permissions test. */
const settings = await readTab("Settings");

if (!settings.ok) {
  if (settings.status === 0) {
    console.log(red("Could not reach googleapis.com at all."));
    console.log(`  ${settings.message}\n`);
  } else if (settings.status === 403) {
    console.log(red("403 Forbidden."));
    console.log("  · The key may be restricted to HTTP referrers — server calls send no Referer.");
    console.log("    Cloud Console → Credentials → your key → Application restrictions → None.");
    console.log("  · Or the Google Sheets API isn't enabled on the project.");
    console.log("    APIs & Services → Library → Google Sheets API → Enable.\n");
  } else if (settings.status === 404) {
    console.log(red("404 — wrong GOOGLE_SHEETS_ID."));
    console.log("  It's the part between /d/ and /edit in the sheet URL.\n");
  } else if (settings.status === 400) {
    console.log(red('400 — reachable, but no tab named "Settings".'));
    console.log("  Tab names must match exactly. Upload FIJI-Giving-TEMPLATE.xlsx to get them right.\n");
  } else {
    console.log(red(`HTTP ${settings.status}\n`));
  }
  process.exit(1);
}

console.log(green("Connected to the sheet.\n"));

/* ------------------------------------------------------------- Settings --- */

const goals = {};
for (const row of settings.rows.slice(1)) {
  if (row?.[0]) goals[String(row[0]).trim()] = row[1] ?? "";
}

const money = (v) => Number(String(v).replace(/[^0-9.]/g, "")) || 0;

console.log(bold("Funds"));
let problems = 0;

for (const [label, tab, goalKey] of FUNDS) {
  const res = await readTab(tab);
  const goalRaw = goals[goalKey];
  const goal = money(goalRaw);

  if (!res.ok) {
    // 400 from the Sheets API means the tab doesn't exist. That's a normal
    // "not set up yet" state, not a failure — the fund just hides itself.
    const why = res.status === 400 ? `no "${tab}" tab yet` : `HTTP ${res.status}`;
    console.log(`  ${yellow("·")} ${label.padEnd(22)} ${dim(why)}`);
    problems++;
    continue;
  }

  /*
   * READ BY HEADER NAME, EXACTLY AS THE SITE DOES.
   *
   * This used to take columns A and B by position. That made the check
   * *disagree with production*: src/lib/sheets.ts builds each row from the
   * header row and filters on r["Date"] && r["Amount"], so renaming a header,
   * inserting a column, or leaving a title row above the headers makes the site
   * read nothing while a positional check still totals everything happily.
   *
   * A diagnostic that can report healthy while the live site shows $0 is worse
   * than no diagnostic at all — it sends you looking at the network, the API
   * key, and the cache, none of which are broken.
   */
  const header = (res.rows[0] ?? []).map((h) => String(h ?? "").trim());
  const dateCol = header.findIndex((h) => h.toLowerCase() === "date");
  const amountCol = header.findIndex((h) => h.toLowerCase() === "amount");

  if (dateCol === -1 || amountCol === -1) {
    const missing = [dateCol === -1 && '"Date"', amountCol === -1 && '"Amount"']
      .filter(Boolean)
      .join(" and ");
    console.log(`  ${red("✗")} ${label.padEnd(22)} ${red(`no ${missing} column`)}`);
    console.log(
      `      Row 1 of "${tab}" reads: ${header.length ? header.map((h) => `"${h}"`).join(", ") : dim("(empty)")}`,
    );
    console.log(
      dim("      The site matches these names exactly. Rename row 1 to Date and Amount,"),
    );
    console.log(dim("      and make sure no title row sits above the headers."));
    problems++;
    continue;
  }

  const body = res.rows.slice(1);
  const rows = body.filter((r) => r?.[dateCol] && r?.[amountCol]);
  const raised = rows.reduce((s, r) => s + money(r[amountCol]), 0);
  const pct = goal > 0 ? Math.round((raised / goal) * 100) : 0;

  const goalNote =
    goalRaw === undefined ? red(`no "${goalKey}" row in Settings`) : `goal $${goal.toLocaleString()}`;
  if (goalRaw === undefined) problems++;

  console.log(
    `  ${green("✓")} ${label.padEnd(22)} ${String(rows.length).padStart(3)} gift(s)  ` +
      `$${raised.toLocaleString().padStart(9)}  ${goalNote}${goal > 0 ? dim(` · ${pct}%`) : ""}`,
  );

  /*
   * Rows the SITE will silently ignore. A gift with an amount but no date is
   * the single most likely reason a treasurer says "I added it and the total
   * did not move" — the row is plainly there in the spreadsheet, and invisible
   * to the site.
   */
  const dropped = body.filter(
    (r) => (r?.[dateCol] || r?.[amountCol]) && !(r?.[dateCol] && r?.[amountCol]),
  );
  if (dropped.length > 0) {
    console.log(
      `      ${yellow("!")} ${dropped.length} row(s) ignored — every gift needs BOTH a date and an amount.`,
    );
    for (const r of dropped.slice(0, 5)) {
      const why = !r?.[dateCol] ? "no date" : "no amount";
      console.log(dim(`        · ${why}: ${JSON.stringify(r).slice(0, 70)}`));
    }
    problems++;
  }

  const unparsed = rows.filter((r) => money(r[amountCol]) === 0);
  if (unparsed.length > 0) {
    console.log(
      `      ${yellow("!")} ${unparsed.length} amount(s) read as $0 — check for text, errors, or blanks.`,
    );
    for (const r of unparsed.slice(0, 5)) {
      console.log(dim(`        · ${JSON.stringify(r[amountCol])}`));
    }
    problems++;
  }
}

/* ------------------------------------------------------------- Wishlist --- */

const wishlist = await readTab("Wishlist");
console.log(bold("\nWishlist"));
if (!wishlist.ok) {
  console.log(`  ${yellow("·")} ${dim(wishlist.status === 400 ? "no Wishlist tab yet" : `HTTP ${wishlist.status}`)}`);
} else {
  const dataRows = wishlist.rows.slice(1);
  const items = dataRows.filter((r) => r?.[0]);
  const categories = [...new Set(items.map((r) => (r[1] || "General").trim()))];
  console.log(`  ${green("✓")} ${items.length} item(s), categories: ${categories.join(", ") || dim("none")}`);

  // Named one by one, because "the site is missing rows" is nearly always
  // either a row the API never returned or one dropped for a blank Name.
  // Seeing the actual list settles which in about two seconds.
  items.forEach((r, i) => {
    const imgs = [r[4], r[5], r[6]].filter(Boolean).length;
    console.log(
      `      ${String(i + 1).padStart(2)}. ${(r[0] || "").slice(0, 38).padEnd(38)} ` +
        `${dim((r[1] || "General").slice(0, 18).padEnd(18))} ` +
        `${imgs ? dim(`${imgs} image${imgs === 1 ? "" : "s"}`) : yellow("no image")}`,
    );
  });

  // A row with content but no Name is silently skipped by the site.
  const nameless = dataRows.filter((r) => !r?.[0] && r?.some((c) => String(c).trim()));
  if (nameless.length) {
    console.log(
      `  ${yellow("!")} ${nameless.length} row(s) have content but no Name — the site skips those.`,
    );
  }
  console.log(dim(`      (${dataRows.length} row(s) returned by Google below the header)`));
  const badImages = items.filter((r) =>
    [r[4], r[5], r[6]].some((u) => u && !/\.(jpe?g|png|webp|gif)(\?|$)/i.test(u)),
  );
  if (badImages.length) {
    console.log(
      `  ${yellow("!")} ${badImages.length} item(s) have an image URL that isn't a direct image link.`,
    );
    console.log(dim("      Google Drive share links do not work — the URL must end in .jpg or .png."));
  }
}

/* ------------------------------------------------------------ donor wall --- */

const wall = await readTab("Donor Wall");
console.log(bold("\nDonor Wall"));
if (!wall.ok) {
  console.log(
    `  ${yellow("·")} ${dim(wall.status === 400 ? "no Donor Wall tab yet — the site falls back to donors.json" : `HTTP ${wall.status}`)}`,
  );
} else {
  const headers = (wall.rows[0] || []).map((h) => String(h).trim());
  const names = wall.rows.slice(1).filter((r) => r?.[0]?.trim());
  console.log(`  ${green("✓")} ${names.length} name(s)`);
  names.forEach((r, i) =>
    console.log(`      ${String(i + 1).padStart(2)}. ${(r[0] || "").slice(0, 40).padEnd(40)} ${dim((r[1] || "").slice(0, 22))}`),
  );

  // The whole reason names are allowed in a public sheet is that this tab has
  // no figures in it. If that stops being true, say so loudly.
  const banned = headers.filter((h) => /amount|total|gift|\$|date|email|phone|address/i.test(h));
  if (banned.length) {
    console.log(red(bold("\n  ⚠ THIS BREAKS THE RULE THAT MAKES THIS TAB SAFE")));
    console.log(`    Columns found: ${banned.join(", ")}`);
    console.log("    This sheet is public. A name beside an amount publishes what that person");
    console.log("    gave. Keep this tab to Name and Group only, and move anything else out.");
  }
}

/* -------------------------------------------------------------- privacy --- */

// The sheet is link-viewable, so a column that looks like PII is worth shouting
// about. Cheap check, high value: this is the one mistake that can't be undone.
const suspicious = [];
for (const [, tab] of FUNDS) {
  const res = await readTab(tab);
  if (!res.ok || !res.rows.length) continue;
  const headers = (res.rows[0] || []).map((h) => String(h).toLowerCase());
  const flagged = headers.filter((h) =>
    /name|email|phone|address|donor|contact/.test(h),
  );
  if (flagged.length) suspicious.push([tab, flagged]);
}

if (suspicious.length) {
  console.log(red(bold("\n⚠ PRIVACY")));
  console.log("  This sheet is public to anyone with the link. These columns look identifying:");
  for (const [tab, cols] of suspicious) console.log(`    ${tab}: ${cols.join(", ")}`);
  console.log("  Move that data to a separate private sheet. Date and Amount only here.");
}

console.log(
  problems === 0
    ? green(bold("\nEverything the site expects is present.\n"))
    : yellow(`\n${problems} thing(s) above need attention. Funds without a tab hide themselves.\n`),
);
