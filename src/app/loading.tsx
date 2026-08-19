import { SkeletonPage } from "@/components/Skeleton";

/**
 * Default loading state for every route.
 *
 * Next uses this as the Suspense fallback while a route segment resolves. Most
 * of this site is prerendered static HTML, so on a first visit there is nothing
 * to wait for — this shows during client-side navigation on a slow connection,
 * which on a phone at a tailgate is a real condition rather than a theoretical
 * one. A route with its own loading.tsx overrides this.
 */
export default function Loading() {
  return <SkeletonPage />;
}
