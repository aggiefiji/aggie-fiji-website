import Script from "next/script";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { analytics } from "@/integrations.config";

/**
 * Site analytics — off unless a provider is named.
 *
 * Nothing is loaded when `analytics.provider` is empty, so local development
 * never sends a request to a third party and a deploy without the variable set
 * ships no tracking at all.
 *
 * VERCEL is the chosen provider (August 2026). The site is hosted there, so it
 * needs no extra account, no DNS, and no second vendor for an officer to
 * inherit. It sets no cookies and stores no identifiers, which means no consent
 * banner — worth having on a page that is mostly parents and alumni. The Hobby
 * plan includes 50,000 events a month, which this site will not approach.
 *
 * ITS ONE REAL LIMIT: the Hobby plan keeps a ONE MONTH reporting window. That
 * answers "did the newsletter drive traffic" and cannot answer "did this giving
 * season beat last year". If year-over-year ever matters, Plausible keeps full
 * history for about $9/month and drops in below with no other change.
 *
 * The GA4 and Plausible branches are kept because switching provider should be
 * an environment variable, not a rewrite.
 */
export function Analytics() {
  if (!analytics.enabled) return null;

  /*
   * Vercel's own component rather than a bare script tag: navigation here is
   * client-side through next/link, and the component hooks the router so a move
   * from /events to /donations registers as a page view. A plain script tag
   * would report the first page of a visit and miss the rest.
   */
  if (analytics.provider === "vercel") {
    return <VercelAnalytics />;
  }

  if (analytics.provider === "plausible") {
    return (
      <Script
        defer
        data-domain={analytics.id}
        src="https://plausible.io/js/script.js"
        strategy="afterInteractive"
      />
    );
  }

  if (analytics.provider === "ga4") {
    return (
      <>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${analytics.id}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${analytics.id}');`}
        </Script>
      </>
    );
  }

  return null;
}
