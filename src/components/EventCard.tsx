import Image from "next/image";
import { eventDateParts, formatEventDate, type ChapterEvent } from "@/lib/content";
import { isTodo } from "@/components/ui";

const audienceLabels: Record<string, string> = {
  everyone: "Open to all",
  parents: "Parents & families",
  alumni: "Alumni",
  members: "Members",
};

/**
 * NOTE: an event card never hides details behind a link, a login, or an RSVP.
 * Everything a visitor needs — what, when, where — is visible on the page.
 */
export function EventCard({ event, past = false }: { event: ChapterEvent; past?: boolean }) {
  const { month, day, year } = eventDateParts(event.date);

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-sm bg-white ring-1 ring-purple-900/10 ${
        past ? "opacity-80" : ""
      }`}
    >
      <div className="flex gap-4 p-5 sm:p-6">
        {/* Date block */}
        <div className="shrink-0 rounded-sm bg-purple-900 px-3 py-2 text-center text-cream">
          <span className="block text-[11px] font-semibold tracking-[0.14em]">{month}</span>
          <span className="block font-serif text-2xl leading-none">{day}</span>
          <span className="block text-[10px] text-cream/60">{year}</span>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-xl text-purple-900">{event.title}</h3>
          <p className="mt-1 text-sm text-ink/60">
            {formatEventDate(event)}
            {event.time && !isTodo(event.time) ? ` · ${event.time}` : ""}
          </p>
          {event.location && !isTodo(event.location) ? (
            <p className="text-sm text-ink/60">{event.location}</p>
          ) : null}

          {event.audience?.length ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {event.audience.map((a) => (
                <li
                  key={a}
                  className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-purple-900"
                >
                  {audienceLabels[a] ?? a}
                </li>
              ))}
            </ul>
          ) : null}

          {/* Guarded like time and location above. A placeholder event used to
              render its TODO summary straight to visitors — the resolver now
              drops unfinished events, and this is the second line of defence
              for one that has a real title but an unwritten summary. */}
          {event.summary && !isTodo(event.summary) ? (
            <p className="mt-3 text-[15px] text-ink/85">{event.summary}</p>
          ) : null}

          {event.link?.url ? (
            <a
              href={event.link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm font-semibold text-salmon-600 underline underline-offset-4"
            >
              {event.link.label || "More details"}
            </a>
          ) : null}
        </div>
      </div>

      {event.image ? (
        <Image
          src={event.image}
          alt=""
          width={800}
          height={450}
          className="h-44 w-full object-cover"
        />
      ) : null}
    </article>
  );
}

/**
 * The overflow of an events list, behind a "see more" button.
 *
 * A <details> element rather than a client component with state: every event is
 * in the HTML either way, so this works with JavaScript off, ships no client
 * bundle, and gets keyboard and screen-reader support for free. It also keeps
 * the no-gating rule honest — the button reveals markup that is already on the
 * page, it never fetches details on demand.
 *
 * Renders nothing when there is no overflow, so callers can pass the tail of a
 * list without checking first.
 */
export function MoreEvents({ events, past = false }: { events: ChapterEvent[]; past?: boolean }) {
  if (events.length === 0) return null;

  return (
    <details className="group mt-5">
      <summary className="inline-flex cursor-pointer list-none items-center justify-center rounded-sm border-2 border-purple-900 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-purple-900 transition-colors duration-200 hover:bg-purple-900 hover:text-cream [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">
          See {events.length} more{past ? " past" : ""} event{events.length === 1 ? "" : "s"}
        </span>
        <span className="hidden group-open:inline">Show fewer</span>
      </summary>

      <div className={`mt-5 grid gap-5 md:grid-cols-2 ${past ? "lg:grid-cols-3" : ""}`}>
        {events.map((event) => (
          <EventCard key={event.slug} event={event} past={past} />
        ))}
      </div>
    </details>
  );
}

/**
 * The events empty state.
 *
 * The heading is a prop rather than hardcoded because there is more than one
 * way for this list to be empty, and they are not the same message. "Nothing is
 * scheduled" is a claim about the chapter; "we cannot reach the calendar" is a
 * claim about the site. Saying the first when the second is true tells an alum
 * there is nothing on when there may well be.
 */
export function EmptyEvents({
  title = "Nothing on the calendar right now",
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <div className="rounded-sm border border-dashed border-purple-900/25 bg-white/60 p-8 text-center">
      <p className="font-serif text-xl text-purple-900">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink/70">{message}</p>
    </div>
  );
}
