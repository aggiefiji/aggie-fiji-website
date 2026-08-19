import "server-only";

/**
 * GOOGLE CALENDAR DATA LAYER  (server-side only)
 * ---------------------------------------------------------------------------
 * Events are maintained on a chapter Google Calendar rather than in JSON files,
 * because update friction is what kills chapter websites. An officer already
 * opens Google Calendar every day; asking them to log into a separate CMS is
 * the thing that goes unmaintained.
 *
 * Read server-side and cached, exactly like sheets.ts, for the same reasons:
 * the API key never reaches the browser, events render in the HTML so they work
 * with JavaScript off, and Google is called at most once per cache window
 * regardless of traffic.
 *
 * NOTHING HERE THROWS. Failure returns `{ ok: false }`, and the events page
 * then says it cannot reach the calendar rather than claiming nothing is
 * scheduled. A broken sharing setting must never look like an empty term.
 *
 * ── THE CALENDAR MUST BE A DEDICATED PUBLIC ONE ─────────────────────────────
 * NOT the chapter's working calendar. Everything on the calendar this reads is
 * published the moment it is typed, with no review step. Exec meetings, private
 * member events, and half-finished notes do not belong on it.
 *
 * ── THE PUBLISH GATE ────────────────────────────────────────────────────────
 * The JSON pipeline had `isTodo()` to stop placeholder text reaching visitors.
 * A live feed has no review gate, so that check moves here instead:
 *
 *   - an event with TBD or TODO in its title does not publish at all
 *   - an unconfirmed location is omitted, and the event still publishes —
 *     a real date with no venue is thin but true, which is the standard the
 *     rest of this site holds to
 *   - cancelled and private events are skipped, so marking an event private in
 *     Google is a working "hide this from the website" switch
 *   - descriptions are stripped of HTML and cut at the first TBD/TODO
 */

import type { ChapterEvent } from "@/lib/content";

const CALENDAR_BASE = "https://www.googleapis.com/calendar/v3/calendars";

/**
 * Matches sheets.ts — one Google call per 5 minutes regardless of traffic.
 *
 * ⚠️ Changing this is TWO edits. src/app/events/page.tsx also declares
 * `export const revalidate = 300` as a literal, because Next.js reads route
 * segment config statically and rejects an imported constant at build time.
 */
export const CALENDAR_REVALIDATE_SECONDS = 300;

/*
 * 10s in development so a calendar edit shows on the next refresh — the Data
 * Cache lives in .next/cache and survives a restart, so without this the only
 * way to see a change was deleting that directory. See sheets.ts for the full
 * reasoning; production keeps the 5-minute cap.
 */
const CALENDAR_CACHE_SECONDS =
  process.env.NODE_ENV !== "production" ? 10 : CALENDAR_REVALIDATE_SECONDS;

/**
 * How long to wait for Google before falling back to the JSON events.
 *
 * Same hole as sheets.ts had, and the same reasoning: `fetch` has no default
 * timeout, so a connection that stalls rather than fails never rejects, the
 * `{ ok: false }` fallback never fires, and the render hangs until Next's
 * 60-second build limit kills it. This module's promise that a broken calendar
 * makes the list stale rather than blank only holds if the request is bounded.
 *
 * The events page is the highest-traffic route on the site, so this is the one
 * place a hang would hurt most.
 */
const CALENDAR_FETCH_TIMEOUT_MS = 10_000;

/**
 * How far either side of today to read. Past events keep the page from looking
 * abandoned over the summer, so the window reaches backwards as well — but only
 * one year back. A past-events list is evidence the chapter is active, not an
 * archive, and a dinner from two years ago is clutter that makes the recent
 * ones harder to see. Events drop off silently on their first anniversary.
 */
const MONTHS_BACK = 12;
const MONTHS_AHEAD = 18;

/*
 * The Sheets key is reused if a calendar-specific key isn't set, since both
 * hit the same Google project. NOTE THE GOTCHA: .env.local tells you to
 * restrict the key to "Google Sheets API only", and a key restricted that way
 * is rejected for Calendar. Either add Calendar API to the same key's
 * restrictions or issue a second key as GOOGLE_CALENDAR_API_KEY.
 */
const apiKey = process.env.GOOGLE_CALENDAR_API_KEY || process.env.GOOGLE_SHEETS_API_KEY || "";
const calendarId = process.env.GOOGLE_CALENDAR_ID || "";

/** Chapter is in College Station; override only if that ever stops being true. */
const timeZone = process.env.GOOGLE_CALENDAR_TIMEZONE || "America/Chicago";

export const calendarConfigured = apiKey.length > 0 && calendarId.length > 0;

/** Distinguishes "the calendar is empty" from "the calendar is unreachable". */
export type CalendarResult = { ok: true; events: ChapterEvent[] } | { ok: false };

/* ------------------------------------------------- Google's response shape */

interface GoogleEventTime {
  /** Present on all-day events: "2026-10-17". */
  date?: string;
  /** Present on timed events: "2026-10-17T18:30:00-05:00". */
  dateTime?: string;
}

interface GoogleEvent {
  id?: string;
  status?: string;
  visibility?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: GoogleEventTime;
  end?: GoogleEventTime;
}

/* ---------------------------------------------------------- the gate + map */

/**
 * True for text an officer hasn't finished. Unlike `isTodo()`, this is not
 * anchored to the start of the string: on a calendar the marker lands wherever
 * it lands ("Fall Dinner — venue TBD"), so anywhere in the text counts.
 */
export function looksUnfinished(text?: string): boolean {
  return !text?.trim() || /\b(TODO|TBD)\b/i.test(text);
}

/** Everything before the first TBD/TODO marker. */
function cutAtMarker(text: string): string {
  const at = text.search(/\b(TODO|TBD)\b/i);
  return (at === -1 ? text : text.slice(0, at)).trim();
}

/**
 * Any hashtag becomes a chip.
 *
 * Deliberately not a fixed vocabulary. Google Calendar has no custom fields, so
 * hashtags in text an officer already types are the only lever available — and
 * a list of four approved words fails silently the moment someone types
 * `#tailgate` or misspells one, leaving a stray `#` in the visible copy with no
 * clue why. Accepting anything means what you type is what you get.
 *
 * Must start with a letter, so "Game #5" keeps its "#5" as ordinary text rather
 * than sprouting a chip. Case is normalized because the chips are uppercased in
 * CSS anyway, and it keeps `#Parents` and `#parents` from becoming two tags.
 */
const TAG_PATTERN = /#([A-Za-z][\w-]*)/g;

function extractTags(text: string): { tags: string[]; cleaned: string } {
  const tags: string[] = [];
  const cleaned = text
    .replace(TAG_PATTERN, (_match, tag: string) => {
      tags.push(tag.toLowerCase());
      return "";
    })
    // Collapse the gap the removed hashtag left behind.
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();

  return { tags, cleaned };
}

/**
 * Google descriptions can contain HTML, because the Calendar UI has a rich
 * text editor. Strip the tags rather than trusting them anywhere near a page:
 * this site's rule is that content never becomes raw HTML.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** "18:30" → "6:30 PM". Deterministic, no Date or locale involved. */
function formatTime(hhmm: string): string | undefined {
  const parts = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!parts) return undefined;
  const hour24 = Number(parts[1]);
  const minute = parts[2];
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${minute} ${suffix}`;
}

/** Shifts an all-day end date back one day — Google's is exclusive. */
function inclusiveEndDate(exclusive: string): string {
  const d = new Date(`${exclusive}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Maps one Google event to a ChapterEvent, or null if the gate rejects it.
 *
 * Dates are read by slicing the response strings rather than constructing Date
 * objects. The request pins `timeZone`, so Google returns wall-clock time in
 * the chapter's zone and the first 10 characters are already the local date.
 * Parsing through Date would reintroduce the off-by-one-day bug this avoids.
 */
export function toChapterEvent(item: GoogleEvent): ChapterEvent | null {
  if (item.status === "cancelled") return null;
  /*
   * Belt and braces. Verified August 2026: when a public calendar is read with
   * an API key, Google omits private events from the feed entirely rather than
   * returning them flagged — so this branch does not fire in the live setup.
   * It stays because the guarantee should not depend on Google's filtering, and
   * because an OAuth-authenticated read (a future automation, say) DOES see
   * them and would otherwise publish them.
   */
  if (item.visibility === "private" || item.visibility === "confidential") return null;

  // An unfinished title means the event isn't ready to be announced at all.
  if (looksUnfinished(item.summary)) return null;

  const startRaw = item.start?.date || item.start?.dateTime;
  if (!startRaw) return null;
  const date = startRaw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const allDay = Boolean(item.start?.date);
  const time = item.start?.dateTime ? formatTime(item.start.dateTime.slice(11, 16)) : undefined;

  let endDate: string | undefined;
  if (allDay && item.end?.date) {
    const inclusive = inclusiveEndDate(item.end.date);
    if (inclusive !== date) endDate = inclusive;
  } else if (item.end?.dateTime) {
    const end = item.end.dateTime.slice(0, 10);
    const endHour = Number(item.end.dateTime.slice(11, 13));
    /*
     * A formal that starts at 8pm and ends at 1am is one night out, not a
     * two-day event — but on the calendar its end date is tomorrow. Anything
     * finishing before 6am is treated as part of the evening it began, so the
     * card reads "April 11" instead of "April 11–12".
     */
    if (end !== date && endHour >= 6) endDate = end;
  }

  // A venue that isn't confirmed is left off; the event still publishes.
  const location =
    item.location && !looksUnfinished(item.location) ? item.location.trim() : undefined;

  /*
   * Hashtags are read from the title AND the description, because an officer
   * will reasonably put one in either. Both are stripped of the tags before
   * display. Tags are collected before the TBD/TODO cut, so one sitting after a
   * note still registers.
   */
  const fromTitle = extractTags(item.summary!.trim());
  const fromDescription = extractTags(item.description ? stripHtml(item.description) : "");
  const audience = [...new Set([...fromTitle.tags, ...fromDescription.tags])];

  // A title that was nothing but hashtags keeps its original text — better a
  // visible "#alumni" than an event with no name at all.
  const title = fromTitle.cleaned || item.summary!.trim();
  const summary = cutAtMarker(fromDescription.cleaned);

  return {
    slug: item.id || `${date}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title,
    date,
    ...(endDate ? { endDate } : {}),
    ...(time ? { time } : {}),
    ...(location ? { location } : {}),
    audience,
    summary,
  };
}

/* ------------------------------------------------------------------ fetch */

function isoWindow(): { timeMin: string; timeMax: string } {
  const now = new Date();
  const min = new Date(now);
  min.setMonth(min.getMonth() - MONTHS_BACK);
  const max = new Date(now);
  max.setMonth(max.getMonth() + MONTHS_AHEAD);
  return { timeMin: min.toISOString(), timeMax: max.toISOString() };
}

/**
 * Every published event in the window, soonest first. Callers split it into
 * upcoming and past themselves, so this is one cached request rather than two.
 */
export async function getCalendarEvents(): Promise<CalendarResult> {
  if (!calendarConfigured) return { ok: false };

  const { timeMin, timeMax } = isoWindow();
  const params = new URLSearchParams({
    key: apiKey,
    timeMin,
    timeMax,
    timeZone,
    // Expands recurring events into individual dates — without this a weekly
    // event would appear once, as its rule rather than its next occurrence.
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const url = `${CALENDAR_BASE}/${encodeURIComponent(calendarId)}/events?${params}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: CALENDAR_CACHE_SECONDS },
      // Bounded, so a stalled Google cannot hang the build. See above.
      signal: AbortSignal.timeout(CALENDAR_FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      if (res.status === 403) {
        console.error(
          "[calendar] 403 Forbidden. Two likely causes: the API key is restricted to the " +
            "Sheets API only (add Google Calendar API, or set GOOGLE_CALENDAR_API_KEY to a " +
            "second key), or the calendar is not public. In Google Calendar: Settings → the " +
            'calendar → Access permissions → "Make available to public".',
        );
      } else if (res.status === 404) {
        console.error("[calendar] 404 — check GOOGLE_CALENDAR_ID in .env.local.");
      } else if (res.status === 429) {
        console.error("[calendar] 429 rate limited — raise CALENDAR_REVALIDATE_SECONDS.");
      } else {
        console.error(`[calendar] HTTP ${res.status}`);
      }
      return { ok: false };
    }

    const data = (await res.json()) as { items?: GoogleEvent[] };
    const items = data.items ?? [];

    const events = items
      .map(toChapterEvent)
      .filter((e): e is ChapterEvent => e !== null)
      .sort((a, b) => a.date.localeCompare(b.date));

    const rejected = items.length - events.length;
    if (rejected > 0 && process.env.NODE_ENV !== "production") {
      console.warn(
        `[calendar] ${rejected} of ${items.length} event(s) not published — cancelled, marked ` +
          "private, or still have TBD/TODO in the title.",
      );
    }

    return { ok: true, events };
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      console.error(
        `[calendar] no response from Google within ${CALENDAR_FETCH_TIMEOUT_MS / 1000}s. ` +
          `The events page will show its cannot-reach state.`,
      );
    } else {
      console.error("[calendar] fetch failed", err);
    }
    return { ok: false };
  }
}
