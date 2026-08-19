import type { Metadata } from "next";
import { getGallery } from "@/lib/content";
import { PageHero } from "@/components/PageHero";
import { EmptyState, Section, Todo } from "@/components/ui";
import { PhotoGrid } from "@/components/PhotoGrid";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Photos from chapter life at Texas A&M Phi Gamma Delta — candid shots of brothers, events, and service.",
};

/**
 * The candid member photography on the old site was its real strength. Keep it.
 * Do not substitute stock photography here — a slightly imperfect real photo of
 * actual brothers outperforms a polished stock image with every audience this
 * site serves.
 */
export default function GalleryPage() {
  const items = getGallery();
  const withPhotos = items.filter((i) => Boolean(i.image));

  return (
    <>
      <PageHero eyebrow="Chapter life" title="Gallery" />

      <Section tone="tint">
        {/* No section heading. The page h1 already says Gallery, and a second
            heading below it is the same word in smaller type. The photos are
            the content — they do not need announcing. */}
        <PhotoGrid items={items} />

        {withPhotos.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              title="No photos yet"
              message="Chapter photos go up here as they are collected."
            />
            <Todo label="Gallery is empty">
              Drop image files in <code>public/gallery/</code> and add a matching JSON file in{" "}
              <code>content/gallery/</code>. Any shape or size works — the site measures each
              photo and renders it at its own proportions.
            </Todo>
          </div>
        ) : null}
      </Section>
    </>
  );
}
