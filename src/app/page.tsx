import Image from "next/image";
import Link from "next/link";
import { galleryAlt, getGallery, getOfficers, getPage, getSiteSettings } from "@/lib/content";
import { getResolvedEvents } from "@/lib/events";
import { getGivingSummary, getSingleFund, usingPlaceholderFigures } from "@/lib/giving";
import { foundationFunds } from "@/lib/funds";
import { getCumulativeTotals } from "@/lib/sheets";
import { EventCard, EmptyEvents } from "@/components/EventCard";
import { GivingRotator, type RotatorPanel } from "@/components/GivingRotator";
import {
  ButtonLink,
  CrestRule,
  PhotoPlaceholder,
  Section,
  SectionHead,
  Todo,
  isTodo,
} from "@/components/ui";

/**
 * HOMEPAGE — everything at a glance, nothing repeated.
 *
 * Order: Hero → Events → Donations → About → Photos.
 * Events lead because they are what bring alumni back; donations follow
 * immediately, so giving is still the first thing below the fold.
 *
 * Deliberately NOT here: the five-values strip (belongs on About) and the pair
 * of large CTA panels that duplicated the hero buttons. This page should be
 * scannable in one screen-and-a-bit, not a long scroll that says the same
 * thing three times.
 */
/*
 * 300 seconds, matching REVALIDATE_SECONDS in src/lib/sheets.ts.
 *
 * MUST be a literal. Next.js reads route segment config statically at build
 * time, so an imported constant (or any expression) is rejected with "Invalid
 * segment configuration export detected" — it cannot evaluate the import. The
 * duplication is forced by the framework; keep it in step with src/lib/sheets.ts by hand.
 */
export const revalidate = 300;

export default async function HomePage() {
  const page = getPage("home");
  const site = getSiteSettings();
  // Same resolver the events page uses, so the two can never disagree.
  // Four, not two: the row is two-up on desktop, so two events filled a
  // single line and read as "barely anything on". Four fills the block.
  const resolvedEvents = await getResolvedEvents();
  const events = resolvedEvents.upcoming.slice(0, 4);
  const eventsDegraded = resolvedEvents.degraded;
  const summary = await getGivingSummary();

  /*
   * Each giving avenue's own figures, for the rotating panel below. The old
   * single "all funds combined" bar was dominated by the General fund, which
   * made two of the three ways to give invisible on the homepage.
   */
  const foundations = foundationFunds();
  const [campaignFund, tailgateFund, foundationTotals] = await Promise.all([
    getSingleFund("general"),
    getSingleFund("tailgate"),
    getCumulativeTotals(foundations),
  ]);
  const photos = getGallery().filter((g) => g.image).slice(0, 4);

  const isDev = process.env.NODE_ENV !== "production";

  /*
   * Whoever the chapter has flagged, in the officer list's own order — so the
   * row reads President first rather than in whatever sequence the files
   * happen to sit in. Placeholder names drop in production, the same rule
   * /about applies, so an unfilled officer is never shown as "Name pending"
   * on the front page.
   */
  const featuredOfficers = getOfficers().filter(
    (o) => o.featured && (isDev || !isTodo(o.name)),
  );
  // Sample figures are visible while building, never in production.
  const placeholderFigures = usingPlaceholderFigures();
  const showCampaign = summary && (!placeholderFigures || isDev);

  /*
   * Only avenues the sheet actually has figures for. A fund the treasurer has
   * not set up yet is left out rather than rotating to an empty $0 bar, which
   * reads as failure rather than as "not started".
   */
  const rotatorPanels: RotatorPanel[] = [
    campaignFund?.totals && {
      key: "campaign",
      label: "Fundraising Campaign",
      data: { ...campaignFund.totals, asOf: campaignFund.totals.lastGiftDate, source: "sheets" },
    },
    tailgateFund?.totals && {
      key: "tailgate",
      label: "Tailgate Sponsorships",
      data: { ...tailgateFund.totals, asOf: tailgateFund.totals.lastGiftDate, source: "sheets" },
    },
    foundationTotals && {
      key: "foundations",
      label: "Philanthropy & Scholarships",
      data: { ...foundationTotals, asOf: foundationTotals.lastGiftDate, source: "sheets" },
    },
  ].filter(Boolean) as RotatorPanel[];
  const showPhotos = photos.length > 0 || isDev;

  // These two render directly rather than through <ContentText>, so they need
  // the placeholder check applied by hand. The headline falls back to a real
  // default (the page must never be headless); the subhead simply drops.
  const rawHeadline = page.heroHeadline as string | undefined;
  const heroHeadline = isTodo(rawHeadline) ? "Not for College Days Alone" : rawHeadline!;
  const rawSubhead = page.heroSubhead as string | undefined;
  const heroSubhead = isTodo(rawSubhead) ? "" : rawSubhead!;

  /*
   * The eyebrow is the hero's identity slot — the h1 is the national motto,
   * shared by every Phi Gamma Delta chapter, so it cannot say which chapter
   * this is. Nickname leads because "Aggie FIJI" is what the chapter calls
   * itself and what an alum types into a search box; the Greek designation
   * follows for anyone who wants the formal name. Falls back to the fraternity
   * name if an officer clears both fields, so the line is never just "at
   * Texas A&M University".
   */
  const eyebrowName = [site.chapterNickname, site.chapterDesignation]
    .filter((part) => !isTodo(part))
    .join(" · ");
  const heroEyebrow = eyebrowName
    ? `${eyebrowName} at ${site.university}`
    : `${site.chapterName} · ${site.university}`;

  return (
    <>
      {/* ------------------------------------------------------------ HERO */}
      <section className="relative overflow-hidden bg-purple-800 text-cream">
        {/* Alpha Mu monogram, centered behind the hero as a watermark.
            Sized in vw/px rather than bg-contain so it stays centered and
            proportional instead of stretching to the container edges. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-center bg-no-repeat opacity-[0.09]"
          style={{
            backgroundImage: "url(/brand/fiji-monogram.png)",
            backgroundSize: "min(85%, 620px) auto",
          }}
        />
        <div className="container-page relative grid items-center gap-10 py-16 sm:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:py-28">
          <div>
            <p className="eyebrow text-salmon-400">{heroEyebrow}</p>
            <h1 className="mt-4 text-[2.6rem] leading-[1.05] sm:text-6xl lg:text-[4.25rem]">
              {heroHeadline}
            </h1>
            <CrestRule className="mt-7 max-w-32 text-cream" />
            {heroSubhead ? (
              <p className="mt-7 max-w-xl text-lg text-cream/85 sm:text-xl">{heroSubhead}</p>
            ) : null}

            {/*
              Events leads — it is what brings people back repeatedly.
              Donations follows in the outline style, and the giving section
              sits directly below the fold.
            */}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <ButtonLink href="/events" tone="accent" className="sm:min-w-56">
                Events
              </ButtonLink>
              <ButtonLink href="/donations" tone="ghost" className="sm:min-w-56">
                Donations &amp; philanthropy
              </ButtonLink>
            </div>
          </div>

          <div className="hidden justify-self-center lg:block">
            <Image
              src="/brand/fiji-crest-512.png"
              alt="The Phi Gamma Delta coat of arms"
              width={512}
              height={512}
              priority
              className="h-auto w-64 drop-shadow-2xl xl:w-72"
            />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- EVENTS */}
      <Section tone="tint">
        <div className="flex flex-wrap items-end justify-between gap-4">
          {/* No subtitle. The section is self-explanatory, and the line that
              used to sit here advertised the absence of a signup wall — which
              only reads as a selling point to whoever built the old site. */}
          <SectionHead eyebrow="What's coming up" title="Upcoming events" />
          <Link
            href="/events"
            className="text-sm font-semibold uppercase tracking-wide text-salmon-600 underline underline-offset-4"
          >
            See More Events →
          </Link>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {events.length > 0 ? (
            events.map((event) => <EventCard key={event.slug} event={event} />)
          ) : (
            <div className="md:col-span-2">
              {/* Same two-empties distinction as the events page — see there. */}
              {eventsDegraded ? (
                <EmptyEvents
                  title="We cannot reach the calendar right now"
                  message="This is a problem on our end, not an empty schedule. Try again shortly, or reach out and someone from the chapter will tell you what is next."
                />
              ) : (
                <EmptyEvents message="Check back soon, or reach out and someone from the chapter will tell you what's next." />
              )}
            </div>
          )}
        </div>
      </Section>

      {/* ------------------------------------------------------- DONATIONS */}
      <Section>
        {/* No corner link here. "See our giving options" sits in the panel
            below, is more prominent, and goes to the same place — two links to
            /donations six inches apart was one too many. */}
        <SectionHead
          eyebrow="This year's priority"
          title="Donations and Giving"
          intro="The chapter wishlist, tailgate sponsorships, and our memorial funds — each tracked live against its own goal."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          {showCampaign && rotatorPanels.length > 0 ? (
            <GivingRotator panels={rotatorPanels} />
          ) : (
            <Todo label="Giving figures needed">
              Connect the chapter Google Sheet (<code>GOOGLE_SHEETS_API_KEY</code> and{" "}
              <code>GOOGLE_SHEETS_ID</code> in <code>.env.local</code>), or enter fallback figures
              in <code>content/pages/donations.json</code>. This section stays hidden in production
              until one of the two is real.
            </Todo>
          )}

          {/* Stretches to match the figures card beside it rather than sitting
              at its own content height — `self-start` left the two panels
              visibly mismatched. flex-col + mt-auto pins the button to the
              bottom edge so the extra height opens up as breathing room
              instead of a gap under the text. */}
          <aside className="flex flex-col rounded-sm bg-purple-900 p-7 text-cream">
            <h3 className="font-serif text-2xl">Every gift counts</h3>
            {/* flex-1 on the copy absorbs the extra height, so the button keeps
                its own spacing instead of floating away from the text. Same
                pattern as the fund cards on /donations. */}
            <p className="mt-3 flex-1 text-cream/80">
              Gifts fund scholarships, chapter projects, and the tailgates you know and love.
            </p>
            <ButtonLink href="/donations" tone="accent" className="mt-6 w-full">
              See our giving options
            </ButtonLink>
          </aside>
        </div>

        {placeholderFigures && isDev ? (
          <Todo label="Placeholder figures">
            The Google Sheet is not connected, so these are sample numbers from{" "}
            <code>content/pages/donations.json</code>. Connect the sheet, or set{" "}
            <code>campaign.isPlaceholder</code> to <code>false</code>. This section does not render
            in production until you do.
          </Todo>
        ) : null}
      </Section>

      {/* ----------------------------------------------------------- ABOUT */}
      {/*
        Leadership, not an essay.

        This section used to be a chapter-history paragraph, half of which was
        still an unwritten TODO. Replaced with the officers a visitor is most
        likely to be looking for — which is also the one thing on this page
        that answers "who do I actually talk to".

        Names and positions only, no headshots: /about carries the photo grid,
        and six of the eight officers still have no photo, so a portrait row
        here would be mostly grey boxes. Type alone looks finished today and
        does not need revisiting when the headshots arrive.

        Hidden entirely if nobody is flagged, rather than leaving a bare
        heading — the same rule Markdown applies to an empty section.
      */}
      {featuredOfficers.length > 0 ? (
        <Section tone="tint">
          <SectionHead eyebrow="Who we are" title="Chapter leadership" />

          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredOfficers.map((officer) => (
              <li
                key={officer.slug}
                className="rounded-sm bg-white p-6 ring-1 ring-purple-900/10"
              >
                <p className="eyebrow text-salmon-600">{officer.position}</p>
                <p className="mt-2 font-serif text-xl leading-tight text-purple-900">
                  {officer.name}
                </p>
              </li>
            ))}
          </ul>

          {/* Centred beneath the row rather than tucked in the corner — the
              four cards above are a preview, and this is the thing to press
              once you have read them. */}
          <div className="mt-10 flex justify-center">
            <ButtonLink href="/about" tone="outline">
              See all the officers
            </ButtonLink>
          </div>
        </Section>
      ) : null}

      {/* ---------------------------------------------------------- PHOTOS */}
      {/* Pulled straight from the Gallery content — no separate list to keep
          in sync. Hidden entirely in production until real photos exist. */}
      {showPhotos ? (
        <Section>
          <SectionHead eyebrow="Chapter life" title="Recent photos" />

          <ul className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {photos.length > 0
              ? photos.map((photo) => (
                  <li key={photo.slug} className="overflow-hidden rounded-sm">
                    <Image
                      src={photo.image!}
                      alt={galleryAlt(photo)}
                      width={600}
                      height={450}
                      className="aspect-4/3 w-full object-cover"
                    />
                  </li>
                ))
              : [0, 1, 2, 3].map((i) => (
                  <li key={i} className="overflow-hidden rounded-sm">
                    <PhotoPlaceholder label="Photo slot" />
                  </li>
                ))}
          </ul>

          <div className="mt-10 flex justify-center">
            <ButtonLink href="/gallery" tone="outline">
              View the full gallery
            </ButtonLink>
          </div>

          {photos.length === 0 ? (
            <Todo label="No photos yet">
              This strip pulls the first four photos from the Gallery automatically. It is hidden in
              production until real photos are uploaded.
            </Todo>
          ) : null}
        </Section>
      ) : null}
    </>
  );
}
