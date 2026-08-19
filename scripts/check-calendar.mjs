#!/usr/bin/env node
/**
 * CALENDAR CONNECTION CHECKER
 * ---------------------------------------------------------------------------
 * Run this before starting the dev server. It answers the only question that
 * matters during setup — "is the site going to see my events?" — and tells you
 * exactly which of the four usual mistakes is in the way.
 *
 *   node scripts/check-calendar.mjs
 *
 * No dependencies and no build step: plain Node with built-in fetch (Node 18+).
 * It reads .env.local itself so it behaves the same as the site.
 *
 * NOTE ON DUPLICATION: the publish-gate checks below are a deliberate, minimal
 * mirror of src/lib/calendar.ts, which is the authoritative implementation.
 * This script stays dependency-free on purpose so it works before `npm install`
 * and can't itself be the thing that's broken. If you change the gate rules,
 * change them there first.
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

/* --------------------------------------------------------------- env ----- */

function loadEnvLocal() {
  const env = {};
  let raw;
  try {
    raw = readFileSync(join(root, ".env.local"), "utf8");
  } catch {
    console.log(red("No .env.local found."));
    console.log("Copy .env.example to .env.local and fill in GOOGLE_CALENDAR_ID.\n");
    process.exit(1);
  }
  for (const line of raw.split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return env;
}

const env = loadEnvLocal();
const calendarId = env.GOOGLE_CALENDAR_ID || "";
const apiKey = env.GOOGLE_CALENDAR_API_KEY || env.GOOGLE_SHEETS_API_KEY || "";
const timeZone = env.GOOGLE_CALENDAR_TIMEZONE || "America/Chicago";
const usingSharedKey = !env.GOOGLE_CALENDAR_API_KEY && Boolean(env.GOOGLE_SHEETS_API_KEY);

console.log(bold("\nCalendar connection check\n"));
console.log(`  GOOGLE_CALENDAR_ID       ${calendarId ? green(calendarId) : red("not set")}`);
console.log(
  `  API key                  ${
    apiKey
      ? green(`set (${apiKey.length} chars)`) + (usingSharedKey ? dim(" — reusing the Sheets key") : "")
      : red("not set")
  }`,
);
console.log(`  Time zone                ${timeZone}\n`);

if (!calendarId) {
  console.log(red("Nothing to test until GOOGLE_CALENDAR_ID is set."));
  console.log("Google Calendar → Settings → your calendar → Integrate calendar → Calendar ID.");
  console.log("See CALENDAR-SETUP.md.\n");
  process.exit(1);
}
if (!apiKey) {
  console.log(red("No API key. Set GOOGLE_CALENDAR_API_KEY or GOOGLE_SHEETS_API_KEY.\n"));
  process.exit(1);
}

/* ------------------------------------------------------------- request --- */

const now = new Date();
const timeMin = new Date(now);
timeMin.setMonth(timeMin.getMonth() - 18);
const timeMax = new Date(now);
timeMax.setMonth(timeMax.getMonth() + 18);

const params = new URLSearchParams({
  key: apiKey,
  timeMin: timeMin.toISOString(),
  timeMax: timeMax.toISOString(),
  timeZone,
  singleEvents: "true",
  orderBy: "startTime",
  maxResults: "250",
});

const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
  calendarId,
)}/events?${params}`;

let res;
try {
  res = await fetch(url);
} catch (err) {
  console.log(red("Could not reach googleapis.com at all."));
  console.log(`  ${err.message}`);
  console.log("Check your network, then try again.\n");
  process.exit(1);
}

if (!res.ok) {
  let detail = "";
  try {
    const body = await res.json();
    detail = body?.error?.message || "";
  } catch {
    /* body wasn't JSON — the status code is enough */
  }

  console.log(red(`Google returned HTTP ${res.status}`));
  if (detail) console.log(dim(`  ${detail}\n`));

  if (res.status === 403) {
    console.log(bold("Two things cause a 403. Check both:"));
    console.log("  1. THE KEY. If it's restricted to the Sheets API, Calendar is rejected.");
    console.log("     Google Cloud Console → Credentials → your key → API restrictions →");
    console.log("     add Google Calendar API. Also set Application restrictions to None:");
    console.log("     server-side calls send no Referer header, so a referrer restriction fails.");
    console.log("  2. THE CALENDAR ISN'T PUBLIC. Google Calendar → Settings → your calendar →");
    console.log('     Access permissions → check "Make available to public".');
  } else if (res.status === 404) {
    console.log("Wrong calendar ID. Copy it from Settings → your calendar → Integrate calendar.");
    console.log('It normally ends in "@group.calendar.google.com".');
  } else if (res.status === 400) {
    console.log("Malformed request — most likely a stray quote or space in GOOGLE_CALENDAR_ID.");
  } else if (res.status === 429) {
    console.log("Rate limited. Wait a minute; the site itself caches for 5 minutes.");
  }
  console.log();
  process.exit(1);
}

/* -------------------------------------------------------------- report --- */

const data = await res.json();
const items = data.items ?? [];

console.log(green(`Connected. Google returned ${items.length} event(s) in the 36-month window.\n`));

if (items.length === 0) {
  console.log(yellow("The calendar is reachable but empty."));
  console.log("Add an event, wait a moment, and run this again.");
  console.log(dim("The site would show its normal empty state — not the JSON fallback.\n"));
  process.exit(0);
}

const unfinished = (t) => !t || !t.trim() || /\b(TODO|TBD)\b/i.test(t);
const published = [];
const rejected = [];

for (const item of items) {
  const title = item.summary || "";
  if (item.status === "cancelled") rejected.push([title || "(untitled)", "cancelled"]);
  else if (item.visibility === "private" || item.visibility === "confidential")
    rejected.push([title || "(untitled)", `marked ${item.visibility}`]);
  else if (!title.trim()) rejected.push(["(untitled)", "no title"]);
  else if (unfinished(title)) rejected.push([title, "TBD/TODO in the title"]);
  else if (!(item.start?.date || item.start?.dateTime)) rejected.push([title, "no start date"]);
  else published.push(item);
}

console.log(bold(`Will appear on the site (${published.length}):`));
for (const item of published) {
  const start = item.start.date || item.start.dateTime;
  const date = start.slice(0, 10);
  const time = item.start.dateTime ? ` ${item.start.dateTime.slice(11, 16)}` : dim(" all-day");

  // Google's all-day end date is exclusive, so subtract a day to show the span
  // the way the site does. Timed events ending before 6am count as one night.
  let span = "";
  if (item.end?.date) {
    const d = new Date(`${item.end.date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    const last = d.toISOString().slice(0, 10);
    if (last !== date) span = dim(`  → through ${last}`);
  } else if (item.end?.dateTime) {
    const last = item.end.dateTime.slice(0, 10);
    if (last !== date && Number(item.end.dateTime.slice(11, 13)) >= 6) {
      span = dim(`  → through ${last}`);
    }
  }
  const loc = item.location
    ? unfinished(item.location)
      ? yellow(" · venue omitted (TBD)")
      : ` · ${item.location.slice(0, 40)}`
    : dim(" · no venue");
  console.log(`  ${green("✓")} ${date}${time}  ${item.summary}${loc}${span}`);
}

if (rejected.length > 0) {
  console.log(bold(`\nHidden from visitors (${rejected.length}):`));
  for (const [title, why] of rejected) {
    console.log(`  ${yellow("·")} ${title.slice(0, 50)} ${dim(`— ${why}`)}`);
  }
  console.log(dim("\nThis is the publish gate working. See CALENDAR-SETUP.md for the rules."));
}

console.log(
  bold("\nNext:") + " npm run dev, then open /events. The page shows which source is live.\n",
);
