import Script from "next/script";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
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
 * SPEED INSIGHTS rides along with the "vercel" branch rather than getting a
 * switch of its own. It is the same vendor, the same free tier, and the same
 * answer to "should this site be measured at all" — a second variable would only
 * create a state where one is on and the other is off for no reason anybody
 * later could reconstruct. It measures what real visitors experience, which
 * matters here because mobile is constraint 4 and mobile is how the old site
 * failed.
 *
 * ITS LIMIT IS TIGHTER THAN WEB ANALYTICS': a 7-day reporting window on Hobby,
 * and 10,000 events a month, after which recording pauses until the next day.
 * This site will not approach the cap. If it ever does, the package takes a
 * `sampleRate` prop rather than needing to be removed.
 *
 * The GA4 and Plausible branches are kept because switching provider should be
 * an environment variable, not a rewrite. Neither carries Speed Insights —
 * it is a Vercel product and only works on a Vercel deployment.
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
    return (
      <>
        <VercelAnalytics />
        <SpeedInsights />
      </>
    );
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
