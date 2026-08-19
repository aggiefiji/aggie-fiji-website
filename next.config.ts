import type { NextConfig } from "next";

/**
 * SECURITY HEADERS
 * ---------------------------------------------------------------------------
 * Applied to every route. These are the headers that are safe to set once and
 * forget on a site that will go unmaintained for stretches — none of them
 * depend on the page content, so none of them can silently break a page a year
 * from now when someone adds a section.
 *
 * ── WHY THERE IS NO FULL CONTENT-SECURITY-POLICY ────────────────────────────
 * A script-src CSP worth having needs per-request nonces, which on the App
 * Router means adding middleware that rewrites headers on every request. That
 * is a real amount of machinery, and a CSP that is slightly wrong does not warn
 * anyone — it silently stops a script running, which on this site would mean a
 * blank Giving page or an admin screen that never loads. On a site whose whole
 * design goal is surviving without a developer, a fragile CSP is a worse
 * outcome than no CSP.
 *
 * `frame-ancestors` is the exception and IS set below: it needs no nonce,
 * cannot break rendering, and is the modern replacement for X-Frame-Options.
 * Both are sent, because older browsers only understand the latter.
 *
 * The real exposure this closes is /admin. It holds a GitHub token with write
 * access to the site repo, and without frame protection any page anywhere could
 * embed it invisibly and trick an officer into clicking through it.
 */
const securityHeaders = [
  // Clickjacking. The modern form and the legacy form of the same rule.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },

  // Stops the browser second-guessing a Content-Type and executing, say, an
  // uploaded image as script.
  { key: "X-Content-Type-Options", value: "nosniff" },

  // Send the full URL to ourselves, only the origin cross-site. Keeps
  // /donations/give?fund=…&detail=… out of third-party referrer logs.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // The site asks for none of these. Denying them means an injected script
  // cannot ask on our behalf either.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // All imagery is currently served from /public. Wishlist photos come from
    // arbitrary URLs in the chapter sheet and are deliberately rendered with a
    // plain <img> rather than next/image, so they need no entry here.
    remotePatterns: [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
