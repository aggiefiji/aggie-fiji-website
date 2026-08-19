import type { Metadata } from "next";
import { getNewsletters, getPage, getSiteSettings } from "@/lib/content";
import { getResolvedEvents } from "@/lib/events";
import { Markdown } from "@/lib/markdown";
import { PageHero } from "@/components/PageHero";
import { EventCard, EmptyEvents, MoreEvents } from "@/components/EventCard";
import { ButtonLink, EmptyState, Section, SectionHead, Todo, isTodo } from "@/components/ui";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Upcoming events, newsletters, and how to stay in touch with the Alpha Mu Chapter of Phi Gamma Delta at Texas A&M University.",
};

/**
 * ALUMNI HOME — events, newsletters, and staying involved, on one page.
 *
 * THE ONE RULE: nothing here is ever placed behind a login, an account, an
 * email capture, or an RSVP requirement. The previous site made visitors
 * create an account to see the events list; that was its worst failure. Any
 * future RSVP tool must be additive to information already visible.
 */
/*
 * Matches the calendar cache window — the page is only as fresh as the feed.
 * 300 seconds, matching CALENDAR_REVALIDATE_SECONDS in src/lib/calendar.ts.
 *
 * MUST be a literal. Next.js reads route segment config statically at build
 * time, so an imported constant (or any expression) is rejected with "Invalid
 * segment configuration export detected" — it cannot evaluate the import. The
 * duplication is forced by the framework; keep it in step with src/lib/calendar.ts by hand.
 */
export const revalidate = 300;

export default async function AlumniEventsPage() {
  const page = getPage("events");
  const site = getSiteSettings();
  const { upcoming, past, source, degraded } = await getResolvedEvents();

  /*
   * A newsletter row with no PDF links nowhere, so in production an issue
   * appears only once its file exists. Development still lists every entry, so
   * an officer can see what is queued up and what is missing. This closes a
   * real leak: the row used to fall back to the literal string "Newsletter
   * (title pending)" and the <Todo> beside it renders nothing in production —
   * so visitors got a placeholder title on a dead row.
   */
  const isDev = process.env.NODE_ENV !== "production";
  const newsletters = getNewsletters().filter((item) => item.file || isDev);

  /*
   * Guarded by hand because it renders outside <ContentText>. The fallback
   * deliberately avoids the national motto — that is the homepage h1, and
   * repeating it here was the redundancy this subtitle was rewritten to fix.
   */
  const rawIntro = page.intro as string | undefined;
  const pageIntro = isTodo(rawIntro)
    ? "Upcoming events, newsletters, and how to stay in touch with the chapter."
    : rawIntro!;

  /*
   * A busy semester can put a dozen things on the calendar, and a wall of cards
   * buries the next one. Six is roughly a screen on desktop and keeps whatever
   * is soonest at the top.
   *
   * The overflow uses <details>, not a client component with state. Every event
   * is in the HTML either way — the button only reveals it — so this works with
   * JavaScript off, ships no client bundle, and is keyboard accessible for free.
   * It also keeps hard constraint #1 honest: nothing is fetched on demand, so
   * details are never withheld behind an interaction.
   */
  const VISIBLE_EVENTS = 6;
  const visibleUpcoming = upcoming.slice(0, VISIBLE_EVENTS);
  const hiddenUpcoming = upcoming.slice(VISIBLE_EVENTS);

  // Past is already limited to one year by the resolver — this is only about
  // how much of that year is on screen before you ask for more.
  const visiblePast = past.slice(0, VISIBLE_EVENTS);
  const hiddenPast = past.slice(VISIBLE_EVENTS);

  return (
    <>
      <PageHero
        eyebrow="Graduate Brothers and Families"
        title="Events"
        intro={pageIntro}
      />

      {/* --------------------------------------------------------- UPCOMING */}
      <Section id="upcoming" tone="tint">
        <SectionHead
          eyebrow={upcoming.length > 0 ? `${upcoming.length} coming up` : "Calendar"}
          title="Upcoming events"
        />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {upcoming.length > 0 ? (
            visibleUpcoming.map((event) => <EventCard key={event.slug} event={event} />)
          ) : (
            <div className="md:col-span-2">
              {/*
                Two different empties, and a visitor deserves to know which.
                `degraded` means the calendar is configured but could not be
                read — telling someone "nothing is scheduled" in that case is a
                statement the site cannot actually make.
              */}
              {degraded ? (
                <EmptyEvents
                  title="We cannot reach the calendar right now"
                  message="This is a problem on our end, not an empty schedule. Try again shortly, or contact the chapter and someone will tell you what is coming up."
                />
              ) : (
                <EmptyEvents
                  title="No events to showcase right now"
                  message="Between semesters the calendar goes quiet. Alumni dinners and other gatherings are posted here as soon as they are scheduled."
                />
              )}
            </div>
          )}
        </div>

        <MoreEvents events={hiddenUpcoming} />

        {/* Which source is live is invisible to visitors by design, but an
            officer debugging a missing event needs to know immediately. */}
        {isDev ? (
          <p className="mt-8 text-xs uppercase tracking-wide text-ink/45">
            Dev only · events from{" "}
            {source === "calendar"
              ? "the chapter Google Calendar"
              : "nothing — the calendar is not configured"}
          </p>
        ) : null}

        {degraded ? (
          <Todo label="Calendar unreachable">
            The calendar is configured but could not be read. There is no JSON fallback any more, so
            visitors are seeing the cannot-reach message above. Check that the calendar is still
            shared publicly and that the API key allows the Calendar API. See{" "}
            <code>CALENDAR-SETUP.md</code>.
          </Todo>
        ) : null}
      </Section>

      {/* ------------------------------------------------------ NEWSLETTERS */}
      <Section id="newsletters">
        <SectionHead
          eyebrow="Chapter news"
          title="Newsletters"
        />

        {newsletters.length > 0 ? (
        <ul className="mt-10 divide-y divide-purple-900/12 border-y border-purple-900/12">
          {newsletters.map((item) => {
            const monthYear = new Date(`${item.date}T12:00:00`).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            });
            // An untitled issue is labelled by its date — real information —
            // rather than a "title pending" placeholder standing in for one.
            const titled = !isTodo(item.title);

            return (
            <li key={item.slug} className="flex flex-wrap items-center justify-between gap-4 py-5">
              <div className="min-w-0">
                {titled ? <p className="eyebrow text-salmon-600">{monthYear}</p> : null}
                <h3 className={`text-xl text-purple-900 ${titled ? "mt-1" : ""}`}>
                  {titled ? item.title : monthYear}
                </h3>
                {/* No per-issue summary. A row is a date, a title, and a link —
                    anyone deciding whether to open a newsletter is served better
                    by a scannable list than by a paragraph under every entry. */}
              </div>
              {item.file ? (
                <a
                  href={item.file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-sm border-2 border-purple-900 px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-purple-900 hover:bg-purple-900 hover:text-cream"
                >
                  Read PDF
                </a>
              ) : (
                <Todo label="PDF not uploaded">
                  Upload the newsletter PDF through the admin screen, or drop it in{" "}
                  <code>public/newsletters/</code>. This issue is hidden from visitors until you do.
                </Todo>
              )}
            </li>
            );
          })}
        </ul>
        ) : null}

        {/* The archive stays visible and says so, rather than disappearing —
            an alum who came looking for newsletters gets an answer either way. */}
        {newsletters.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              title="No letters in the archive right now"
              message="Issues appear here as soon as they are uploaded."
            />
          </div>
        ) : null}

        {newsletters.length === 0 && isDev ? (
          <Todo label="No newsletters with a PDF">
            Add issues in <code>content/newsletters/</code> and drop the PDFs in{" "}
            <code>public/newsletters/</code>. Visitors see the empty-archive message above until at
            least one issue has a file.
          </Todo>
        ) : null}

        {/*
          No "email us to subscribe" note: there is no officer issuing the
          newsletter, so it promised a service nobody was on the other end of.
          The archive is passive on purpose. If the chapter ever appoints an
          editor and picks a mailing tool, that is integrations #2 —
          `newsletter.signupEnabled` in src/integrations.config.ts.
        */}
      </Section>

      {/* --------------------------------------------------- STAY INVOLVED */}
      <Section tone="tint">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="text-lg">
            <Markdown>{page.body as string}</Markdown>

            {/*
              The form is additive, never a gate — every event detail on this
              page is readable without it. Rendered only when the URL is set, so
              an officer clearing the field removes the button rather than
              leaving a link to nowhere.
            */}
            {site.alumniUpdateFormUrl && !isTodo(site.alumniUpdateFormUrl) ? (
              <ButtonLink href={site.alumniUpdateFormUrl} tone="outline" external className="mt-6">
                Update or send your contact info
              </ButtonLink>
            ) : null}
          </div>

          <aside className="self-start rounded-sm bg-purple-900 p-7 text-cream">
            <p className="eyebrow text-salmon-400">Give back</p>
            <h2 className="mt-2 font-serif text-2xl">Support the chapter</h2>
            <p className="mt-3 text-cream/80">
              Fundraising, scholarships, sponsorships, chapter operations, and our philanthropic work.
            </p>
            <ButtonLink href="/donations" tone="accent" className="mt-6 w-full">
              Donations &amp; Philanthropy
            </ButtonLink>
            <ButtonLink href="/contact" tone="ghost" className="mt-3 w-full">
              Contact the chapter
            </ButtonLink>
          </aside>
        </div>
      </Section>

      {/* ------------------------------------------------------------- PAST */}
      {past.length > 0 ? (
        <Section>
          <SectionHead
            eyebrow="Recently"
            title="Past events"
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visiblePast.map((event) => (
              <EventCard key={event.slug} event={event} past />
            ))}
          </div>

          <MoreEvents events={hiddenPast} past />
        </Section>
      ) : null}
    </>
  );
}
