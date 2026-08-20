import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getGallery, getOfficers, getPage } from "@/lib/content";
import { PageHero } from "@/components/PageHero";
import { ButtonLink, EmptyState, Section, SectionHead, Todo, isTodo } from "@/components/ui";
import { PhotoGrid } from "@/components/PhotoGrid";
import { LightboxGallery, LightboxTrigger, type LightboxImage } from "@/components/Lightbox";

export const metadata: Metadata = {
  title: "Our Chapter",
  description:
    "The officers of the Alpha Mu Chapter of Phi Gamma Delta at Texas A&M, and photos from chapter life.",
};

/**
 * OUR CHAPTER — a hub, not an essay.
 *
 * This page used to carry the five values, a timeline, and a chapter history.
 * All three were removed in August 2026: the values were the national
 * definitions rather than anything true of Alpha Mu, the timeline had one real
 * entry (1848) out of four, and the history had gone unwritten for months. A
 * page that cannot be filled should not exist — the site's own rule is that a
 * thin page is acceptable and a fake one is not, and three empty sections were
 * heading that way.
 *
 * What replaced them is what the chapter actually has: the officers, and the
 * photos. Both preview here and link to their own pages, mirroring the
 * Donations hub. The dropdown parent needs to be a real page anyway — on touch
 * it is the only way to reach this route.
 */
export default function AboutPage() {
  const page = getPage("about");

  // Officers whose names are still placeholders are dropped in production, the
  // same rule the events list uses. Six "TODO: Full Name" cards would be worse
  // than none.
  const isDev = process.env.NODE_ENV !== "production";
  const officers = getOfficers().filter((o) => isDev || !isTodo(o.name));
  const photos = getGallery().filter((g) => g.image).slice(0, 6);

  /*
   * Only officers who actually have a headshot go in the lightbox, and each
   * card looks up its position in THIS array rather than its position in the
   * grid. Ben Powell has no photo yet; indexing by grid position would make
   * every officer after him open somebody else's face.
   */
  const withPhoto = officers.filter((o) => o.photo);
  const officerImages: LightboxImage[] = withPhoto.map((o) => ({
    src: o.photo!,
    alt: `${isTodo(o.name) ? "Officer" : o.name}, ${o.position}`,
    width: 800,
    height: 800,
    title: isTodo(o.name) ? undefined : o.name,
    subtitle: o.position,
  }));

  return (
    <>
      <PageHero
        eyebrow="Alpha Mu"
        // isTodo(), not `||` — see the note on the Giving page. A title of
        // "TODO: …" is truthy and would otherwise reach visitors.
        title={isTodo(page.title as string) ? "Our Chapter" : (page.title as string)}
        intro={page.intro as string}
      />

      {/* ------------------------------------------------------ LEADERSHIP */}
      <Section tone="tint">
        <SectionHead eyebrow="Officers" title="Chapter leadership" />

        {/*
          Photo and name only. There is no per-officer page and no bio: getting
          eight brothers to write one is a chore that stalls the whole section,
          and almost nobody reads them. A face and a title is what an alum or a
          parent actually wants from this list.
        */}
        {officers.length > 0 ? (
          <LightboxGallery images={officerImages}>
            <ul className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {officers.map((officer) => {
                const photoIndex = withPhoto.indexOf(officer);

                return (
                  <li
                    key={officer.slug}
                    className="overflow-hidden rounded-sm bg-white ring-1 ring-purple-900/10"
                  >
                    {officer.photo ? (
                      <LightboxTrigger index={photoIndex} image={officerImages[photoIndex]}>
                        <Image
                          src={officer.photo}
                          alt={officerImages[photoIndex].alt}
                          width={400}
                          height={400}
                          className="aspect-square w-full bg-purple-900/5 object-cover transition-transform duration-200 group-hover:scale-[1.04] motion-reduce:transform-none"
                        />
                      </LightboxTrigger>
                    ) : (
                      // No photo, no link. A card that opens an empty overlay is
                      // worse than one that plainly has nothing to show.
                      <div className="aspect-square w-full bg-purple-900/8" />
                    )}
                    <div className="p-4">
                      <p className="eyebrow text-salmon-600">{officer.position}</p>
                      <p className="mt-1 font-serif text-lg leading-tight text-purple-900">
                        {isTodo(officer.name) ? "Name pending" : officer.name}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </LightboxGallery>
        ) : (
          <div className="mt-10">
            <EmptyState
              title="Officers are being updated"
              message="The chapter elects new officers each year; the current list goes up as soon as it is set."
            />
          </div>
        )}

        {officers.some((o) => isTodo(o.name)) ? (
          <Todo label="Officer names are placeholders">
            Fill in <code>content/officers/*.json</code>, or use Leadership in the admin. An
            officer without a real name is hidden from visitors entirely.
          </Todo>
        ) : null}
      </Section>

      {/* ---------------------------------------------------------- PHOTOS */}
      <Section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHead eyebrow="Chapter life" title="Photos" />
          <Link
            href="/gallery"
            className="text-sm font-semibold uppercase tracking-wide text-salmon-600 underline underline-offset-4"
          >
            Full gallery →
          </Link>
        </div>

        <div className="mt-10">
          <PhotoGrid items={photos} />
        </div>

        {photos.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              title="Photos are on the way"
              message="Chapter photos go up here as they are collected."
            />
          </div>
        ) : null}
      </Section>

      {/* --------------------------------------------------------- CONTACT */}
      {/* The page shows who the officers are but gives no way to reach them —
          without this it ends on a photo grid rather than finishing. */}
      <Section tone="tint">
        <div className="rounded-sm bg-purple-900 p-7 text-cream sm:flex sm:items-center sm:justify-between sm:gap-8">
          {/* Deliberately makes no promise about who is reachable. Only the
              President and Treasurer publish an address, so "every officer
              above is reachable" would have been an offer the site cannot
              keep. The Contact page says who to write to. */}
          <h2 className="font-serif text-2xl">Need to reach the leadership?</h2>
          <ButtonLink href="/contact" tone="accent" className="mt-6 shrink-0 sm:mt-0">
            See our contact page
          </ButtonLink>
        </div>
      </Section>
    </>
  );
}
