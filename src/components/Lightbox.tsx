"use client";

import Image from "next/image";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

/**
 * EXPANDING A PHOTO — the officer grid and the gallery share this.
 *
 * Reviewed by alumni in August 2026: the thumbnails are small, and there was no
 * way to look at one properly. Headshots are the worst case — a 400px square in
 * a four-across grid is a face you cannot quite recognise, which defeats the
 * point of publishing it.
 *
 * ── WHY A CONTEXT AND NOT ONE BIG CLIENT COMPONENT ──────────────────────────
 * The two grids look nothing alike: one is a CSS-column masonry keeping every
 * photo's own proportions, the other a fixed square grid with a name and a
 * position under each card. Folding both into one client component would mean a
 * `layout` prop and two branches of markup in a file that is meant to be about
 * opening an overlay.
 *
 * More importantly, `content.ts` imports `node:fs` — so anything that reads
 * gallery items or officers has to stay on the server. Keeping the layouts in
 * server components and passing only plain `LightboxImage` objects across the
 * boundary means the alt text, the captions and the measured dimensions are all
 * computed where the content lives, and this file never learns what a
 * GalleryItem is.
 *
 * ── IT DEGRADES TO SOMETHING USEFUL ─────────────────────────────────────────
 * The trigger is a real `<a href>` pointing at the image file, not a button.
 * With JavaScript off, clicking a photo opens that photo — which is exactly
 * what the reader wanted. Cmd/ctrl/shift-click and middle-click are left alone
 * so "open in new tab" keeps working. A button would have been a dead control
 * for anyone without our JavaScript, on a site whose rule is that such a
 * visitor must still get everything.
 */

export interface LightboxImage {
  src: string;
  /** Never empty — see galleryAlt(). An empty alt marks a photo decorative. */
  alt: string;
  width?: number;
  height?: number;
  /** Headline in the overlay: an officer's name, or a photo caption. */
  title?: string;
  /** Secondary line: an officer's position. */
  subtitle?: string;
}

interface LightboxContext {
  open: (index: number) => void;
}

const Ctx = createContext<LightboxContext | null>(null);

/* ------------------------------------------------------------------ trigger */

export function LightboxTrigger({
  index,
  image,
  className = "",
  children,
}: {
  index: number;
  image: LightboxImage;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = useContext(Ctx);

  return (
    <a
      href={image.src}
      // The link's accessible name. Without this a screen reader announces the
      // image's alt text alone, which describes the photo but not that
      // following the link enlarges it.
      aria-label={`Expand photo: ${image.title || image.alt}`}
      className={`group block cursor-zoom-in ${className}`}
      onClick={(e) => {
        // Leave the browser's own shortcuts alone: a modified click means the
        // reader asked for a new tab, and hijacking it is worse than useless.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        if (!ctx) return; // No provider — fall through to the plain href.
        e.preventDefault();
        ctx.open(index);
      }}
    >
      {children}
    </a>
  );
}

/* ------------------------------------------------------------------ gallery */

/**
 * Wraps a grid. `children` arrive already rendered from the server, so this
 * costs one state hook and ships no extra markup for the grid itself.
 */
export function LightboxGallery({
  images,
  children,
}: {
  images: LightboxImage[];
  children: React.ReactNode;
}) {
  const [index, setIndex] = useState<number | null>(null);

  // Where focus was before the overlay opened, so it can be handed back. A
  // reader who tabbed to a photo and pressed Enter should not be returned to
  // the top of the document when they close it.
  const returnFocusTo = useRef<HTMLElement | null>(null);

  const open = useCallback((i: number) => {
    returnFocusTo.current = document.activeElement as HTMLElement | null;
    setIndex(i);
  }, []);

  const close = useCallback(() => {
    setIndex(null);
    returnFocusTo.current?.focus?.();
  }, []);

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      {index !== null && images[index] ? (
        <Overlay images={images} index={index} onIndex={setIndex} onClose={close} />
      ) : null}
    </Ctx.Provider>
  );
}

/* ------------------------------------------------------------------ overlay */

function Overlay({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: LightboxImage[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const image = images[index];
  const many = images.length > 1;

  const step = useCallback(
    (delta: number) => onIndex((index + delta + images.length) % images.length),
    [index, images.length, onIndex],
  );

  useEffect(() => {
    closeButton.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key === "ArrowRight" && many) return step(1);
      if (e.key === "ArrowLeft" && many) return step(-1);

      /*
       * Keep Tab inside the overlay. Without this, tabbing walks off into the
       * page behind — which is still there, still focusable, and now invisible
       * behind the backdrop. There are only ever three or four controls here,
       * so a wrap-around is enough; no need for a general focus-trap library.
       */
      if (e.key !== "Tab" || !panel.current) return;
      const focusable = panel.current.querySelectorAll<HTMLElement>("button, [href]");
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    // Stops the page scrolling underneath the overlay on touch.
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [many, onClose, step]);

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-purple-950/85 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={image.title || image.alt}
      onClick={onClose}
    >
      <div
        ref={panel}
        className="flex max-h-full w-full max-w-4xl flex-col items-center gap-4"
        // The backdrop closes on click; the panel must not, or every click on
        // the photo itself dismisses the thing the reader just opened.
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={image.src}
          alt={image.alt}
          width={image.width ?? 1200}
          height={image.height ?? 900}
          sizes="(min-width: 1024px) 60vw, 90vw"
          className="max-h-[68vh] w-auto max-w-full rounded-sm bg-purple-900/20 object-contain"
          priority
        />

        {image.title || image.subtitle ? (
          <div className="text-center">
            {image.subtitle ? (
              <p className="eyebrow text-salmon-400">{image.subtitle}</p>
            ) : null}
            {image.title ? (
              <p className="mt-1 font-serif text-xl text-cream">{image.title}</p>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          {many ? (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous photo"
                className="rounded-sm border-2 border-cream/50 px-4 py-2 text-cream transition-colors hover:bg-cream hover:text-purple-900"
              >
                ←
              </button>
              {/* aria-live so a screen reader hears the position change when the
                  arrow keys move between photos. */}
              <span aria-live="polite" className="text-sm text-cream/70">
                {index + 1} of {images.length}
              </span>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next photo"
                className="rounded-sm border-2 border-cream/50 px-4 py-2 text-cream transition-colors hover:bg-cream hover:text-purple-900"
              >
                →
              </button>
            </>
          ) : null}

          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            className="rounded-sm border-2 border-cream/50 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-cream transition-colors hover:bg-cream hover:text-purple-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
