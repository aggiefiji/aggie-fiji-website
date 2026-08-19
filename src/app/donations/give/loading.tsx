import { SkeletonBlock, SkeletonHero, SkeletonText } from "@/components/Skeleton";

/**
 * How to Give is the one genuinely dynamic page — it reads the URL to work out
 * which memo to show, so it is server-rendered on demand and this fallback is
 * the one most likely to actually be seen.
 *
 * Shaped like the real page: masthead, the two steps, then the memo panel and
 * the three payment cards. Matching the layout means nothing jumps when the
 * figures land.
 */
export default function Loading() {
  return (
    <>
      <SkeletonHero />
      <section className="bg-purple-100 py-14 sm:py-20">
        <div className="container-page">
          <SkeletonBlock className="h-3 w-16" />
          <SkeletonBlock className="mt-3 h-8 w-80 max-w-full" />
          <SkeletonText lines={2} className="mt-4 max-w-2xl" />

          <div className="mt-8 rounded-sm bg-white p-6 ring-1 ring-purple-900/15 sm:p-8">
            <SkeletonBlock className="h-11 w-56" />
          </div>

          {/* The memo panel — the thing a donor is actually waiting for. */}
          <div className="mt-14 rounded-sm bg-purple-900 p-6 sm:p-8">
            <div className="motion-safe:animate-pulse h-4 w-28 rounded-sm bg-cream/20" />
            <div className="motion-safe:animate-pulse mt-5 h-9 w-96 max-w-full rounded-sm bg-cream/20" />
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-sm bg-white p-6 ring-1 ring-purple-900/10">
                <SkeletonBlock className="mx-auto h-11 w-11 rounded-full" />
                <SkeletonBlock className="mx-auto mt-4 h-5 w-24" />
                <SkeletonBlock className="mx-auto mt-4 h-40 w-40" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <span className="sr-only" role="status">
        Loading…
      </span>
    </>
  );
}
