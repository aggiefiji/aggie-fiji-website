import "server-only";

/**
 * EVENTS RESOLVER — decides where the events list comes from.
 * ---------------------------------------------------------------------------
 * Two sources exist, and this module is the only place that chooses between
 * them, so no page has to know which is live:
 *
 *   1. The chapter Google Calendar (src/lib/calendar.ts) — the intended source.
 *   2. Nothing. There is no second source — see getResolvedEvents() below.
 *
 * WHY A FALLBACK AT ALL. Events are the most-visited content on this site and
 * a live feed has failure modes a file does not: someone flips the calendar to
 * private, the API key gets restricted, a Google outage. The rule is that the
 * page degrades to a stale list rather than an empty one — an alum seeing last
 * month's dinner learns the chapter is active; an alum seeing nothing concludes
 * the site is dead, which is the impression this rebuild exists to fix.
 *
 * The fallback fires ONLY on failure, never on an empty-but-healthy calendar.
 * That distinction is why calendar.ts returns `{ ok: false }` instead of `[]`:
 * a quiet summer should show the real empty state, not resurrect old JSON.
 *
 * THE PLACEHOLDER GATE APPLIES TO BOTH SOURCES. calendar.ts refuses to publish
 * an event with TBD/TODO in the title; the same rule is applied to JSON events
 * here. Without it a placeholder file renders its title as a heading in
 * production, because EventCard is handed a title and shows it.
 */

import type { ChapterEvent } from "@/lib/content";
import { getCalendarEvents, calendarConfigured, looksUnfinished } from "@/lib/calendar";

export type EventsSource = "calendar" | "content";

/**
 * How far back past events are shown. The calendar layer already stops reading
 * at 12 months, but the rule is enforced here too so it applies to the JSON
 * fallback as well — otherwise a stale file from two years ago would reappear
 * the moment the calendar had a bad day.
 */
const PAST_WINDOW_MONTHS = 12;

export interface ResolvedEvents {
  upcoming: ChapterEvent[];
  past: ChapterEvent[];
  source: EventsSource;
  /** True when the calendar is configured but could not be read. */
  degraded: boolean;
}

/**
 * An event nobody has finished writing does not render, in either source.
 * Development keeps them visible so an officer can see what needs work — the
 * same split `<Todo>` uses everywhere else on the site.
 */
function publishable(event: ChapterEvent): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return !looksUnfinished(event.title);
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isPast(event: ChapterEvent, today: Date): boolean {
  return new Date(`${event.endDate || event.date}T23:59:59`) < today;
}

/**
 * The single entry point for every page that shows events.
 *
 * Neither list is capped here — callers slice for display (the homepage shows
 * two upcoming; the events page shows six of each behind a "see more"). Past
 * events ARE cut off at one year, because that is a rule about what belongs on
 * the site rather than a presentation choice.
 */
export async function getResolvedEvents(): Promise<ResolvedEvents> {
  let events: ChapterEvent[] | null = null;
  let source: EventsSource = "content";
  let degraded = false;

  if (calendarConfigured) {
    const result = await getCalendarEvents();
    if (result.ok) {
      events = result.events;
      source = "calendar";
    } else {
      /*
       * Configured but unreadable. There is no longer a JSON fallback to drop
       * to — the three placeholder event files were deleted in August 2026
       * because a stale hand-written list is worse than an honest empty state:
       * an alum who drives to an event that moved is worse served than one who
       * is told the calendar could not be read and to check back.
       *
       * `degraded` is what lets the page say WHICH empty it is — "we cannot
       * reach the calendar" rather than "nothing is scheduled".
       */
      degraded = true;
      console.error(
        "[events] Calendar unreachable. The events page will show its cannot-reach state. " +
          "Check the calendar's public sharing setting and the API key restrictions.",
      );
    }
  }

  if (events === null) events = [];

  const publishedEvents = events.filter(publishable);
  const today = startOfToday();

  // Anything that finished more than a year ago drops off, whichever source it
  // came from. Measured against the event's own start date.
  const cutoff = new Date(today);
  cutoff.setMonth(cutoff.getMonth() - PAST_WINDOW_MONTHS);

  return {
    upcoming: publishedEvents.filter((e) => !isPast(e, today)),
    // Most recent first, so the section leads with what just happened.
    past: publishedEvents
      .filter((e) => isPast(e, today) && new Date(`${e.date}T12:00:00`) >= cutoff)
      .reverse(),
    source,
    degraded,
  };
}
