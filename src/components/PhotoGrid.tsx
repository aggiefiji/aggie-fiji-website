import Image from "next/image";
import { galleryAlt, type GalleryItem } from "@/lib/content";
import { isTodo } from "@/components/ui";

/**
 * Chapter photos, at whatever shape they arrived in.
 *
 * Phone photos are portrait, landscape, and square in the same batch. Forcing
 * them into one aspect ratio means every portrait loses its top and bottom —
 * which on a photo of people is usually their heads. So this uses a CSS-column
 * masonry: each photo keeps its own proportions and the columns fill unevenly,
 * the way a pinboard does.
 *
 * `width` and `height` come from getGallery(), which measures the file itself.
 * That does two jobs: the browser reserves the right space before the image
 * loads, so nothing jumps around, and next/image can resize — a 5MB photo
 * straight off a phone gets served at a fraction of that, in a modern format,
 * without anyone having to prepare it first.
 *
 * A photo whose dimensions could not be read falls back to a 4:3 box rather
 * than breaking the layout.
 */
export function PhotoGrid({ items }: { items: GalleryItem[] }) {
  const photos = items.filter((i) => i.image);
  if (photos.length === 0) return null;

  return (
    <div className="columns-2 gap-4 lg:columns-3 [&>*]:mb-4">
      {photos.map((photo) => {
        const caption = isTodo(photo.caption) ? "" : photo.caption;
        const measured = Boolean(photo.width && photo.height);

        return (
          <figure
            key={photo.slug}
            // break-inside stops a photo being split across two columns.
            className="break-inside-avoid overflow-hidden rounded-sm bg-white ring-1 ring-purple-900/10"
          >
            <Image
              src={photo.image!}
              // Never the empty caption — see galleryAlt(). An empty alt would
              // mark a photo of the chapter as decorative.
              alt={galleryAlt(photo)}
              width={photo.width ?? 1200}
              height={photo.height ?? 900}
              sizes="(min-width: 1024px) 33vw, 50vw"
              className={`w-full bg-purple-900/5 ${measured ? "h-auto" : "aspect-4/3 object-cover"}`}
            />
            {caption ? (
              <figcaption className="p-4 text-sm text-ink/80">{caption}</figcaption>
            ) : null}
          </figure>
        );
      })}
    </div>
  );
}
