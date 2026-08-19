/**
 * Loading placeholders.
 *
 * ── WHAT THESE ACTUALLY COVER ───────────────────────────────────────────────
 * Be clear-eyed about it: almost every page on this site is prerendered static
 * HTML, so there is no "loading phase" on a first visit — the markup arrives
 * complete. These appear during CLIENT-SIDE navigation, when Next fetches the
 * next route's payload, and on the one genuinely dynamic route
 * (/donations/give, which reads the URL). On a fast connection you will barely
 * see them. On a phone on stadium wifi in College Station, you will.
 *
 * That is the case they are built for, and it is why the shapes mirror the real
 * layout rather than being generic grey bars: a skeleton that matches what
 * lands means nothing jumps when it does.
 *
 * `animate-pulse` is a Tailwind built-in and respects nothing by itself, so the
 * motion is disabled under prefers-reduced-motion via `motion-safe:`.
 */

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`motion-safe:animate-pulse rounded-sm bg-purple-900/10 ${className}`}
    />
  );
}

/** A few lines of body copy. */
export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={i}
          // The last line runs short, the way a real paragraph does.
          className={`h-3.5 ${i === lines - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}

/** The purple masthead every page opens with. */
export function SkeletonHero() {
  return (
    <div className="bg-purple-800">
      <div className="container-page py-12 sm:py-20">
        <div className="motion-safe:animate-pulse h-3 w-40 rounded-sm bg-cream/20" />
        <div className="motion-safe:animate-pulse mt-5 h-11 w-3/4 max-w-2xl rounded-sm bg-cream/20 sm:h-14" />
        <div className="motion-safe:animate-pulse mt-6 h-px w-24 bg-cream/20" />
        <div className="motion-safe:animate-pulse mt-6 h-4 w-full max-w-xl rounded-sm bg-cream/15" />
      </div>
    </div>
  );
}

/** A card-shaped placeholder, for grids of events, funds, officers, photos. */
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-sm bg-white p-6 ring-1 ring-purple-900/10 ${className}`}>
      <SkeletonBlock className="h-3 w-24" />
      <SkeletonBlock className="mt-3 h-5 w-3/4" />
      <SkeletonText lines={2} className="mt-4" />
    </div>
  );
}

/**
 * A whole page's worth: masthead, a heading, and a grid of cards.
 * Used as the default fallback so every route has something rather than a
 * blank screen mid-navigation.
 */
export function SkeletonPage({ cards = 4 }: { cards?: number }) {
  return (
    <>
      <SkeletonHero />
      <section className="bg-cream py-14 sm:py-20">
        <div className="container-page">
          <SkeletonBlock className="h-3 w-32" />
          <SkeletonBlock className="mt-3 h-8 w-72 max-w-full" />
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {Array.from({ length: cards }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </section>
      {/* Screen readers get a single announcement rather than a wall of boxes. */}
      <span className="sr-only" role="status">
        Loading…
      </span>
    </>
  );
}
