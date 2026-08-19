/**
 * ===========================================================================
 * INTEGRATIONS CONFIG — single source of truth for every external service
 * ===========================================================================
 *
 * EVERY third-party integration on this site is switched on or off from this
 * one file. Nothing here points at a live service by default: the site runs,
 * builds, and can be demoed end-to-end with all of these disabled.
 *
 * HOW TO TURN SOMETHING ON
 *   1. Read the TODO block above the integration.
 *   2. Set the matching variable in `.env.local` (see `.env.example`).
 *   3. Test on localhost first. Never point at a live endpoint until the
 *      chapter has explicitly signed off.
 *
 * RULE THAT DOES NOT GET BROKEN
 *   No integration on this site may require a visitor to create an account,
 *   sign up, or log in to view chapter information — especially events. The
 *   previous site's signup wall was its single biggest failure. If an RSVP or
 *   ticketing tool is ever added, it must be additive to details already
 *   visible on the page, never a gate in front of them.
 * ===========================================================================
 */

const env = (key: string): string =>
  (typeof process !== "undefined" && process.env[key]) || "";

/**
 * `stubbed` — not set up yet, and someone still has to.
 * `live`    — configured and running.
 * `declined` — the chapter considered it and said no. NOT a gap, and
 *              deliberately excluded from the dev banner: a checklist that
 *              keeps listing settled questions trains people to ignore it.
 */
export type IntegrationStatus = "stubbed" | "live" | "declined";

/* -------------------------------------------------------------------------
 * 0. GOOGLE SHEETS — giving figures and the chapter wishlist
 * -------------------------------------------------------------------------
 * The only integration currently reading live external data. Configured with
 * GOOGLE_SHEETS_API_KEY and GOOGLE_SHEETS_ID in .env.local — deliberately
 * WITHOUT the NEXT_PUBLIC_ prefix, so the key is server-side only and never
 * ships to the browser.
 *
 * Every page degrades gracefully: if the sheet is unreachable, unconfigured,
 * or rate-limited, giving figures fall back to numbers entered by hand in
 * content/pages/donations.json and the wishlist simply shows an empty state.
 * See src/lib/sheets.ts.
 * ----------------------------------------------------------------------- */
export const sheets = {
  get enabled() {
    return Boolean(process.env.GOOGLE_SHEETS_API_KEY && process.env.GOOGLE_SHEETS_ID);
  },
  status: "stubbed" as IntegrationStatus,
  note: "Chapter Google Sheet not connected — giving figures fall back to manual content.",
};

/* -------------------------------------------------------------------------
 * 0b. GOOGLE CALENDAR — the events list
 * -------------------------------------------------------------------------
 * Events come from a chapter Google Calendar rather than a CMS, because an
 * officer already opens Google Calendar daily and a separate admin login is
 * the thing that goes unmaintained. Configured with GOOGLE_CALENDAR_ID and
 * either GOOGLE_CALENDAR_API_KEY or the existing GOOGLE_SHEETS_API_KEY.
 *
 * TODO: Before this goes live —
 *   1. Create a DEDICATED calendar named "Aggie FIJI Alumni Events" on a
 *      CHAPTER-OWNED Google account. Not a personal one, and not the chapter's
 *      working calendar: everything on it publishes instantly with no review.
 *   2. Access permissions → "Make available to public".
 *   3. Put its calendar ID in .env.local as GOOGLE_CALENDAR_ID.
 *   4. Make sure the API key allows the Calendar API — the key restriction in
 *      .env.local says "Sheets API only", which Calendar requests fail.
 *
 * See CALENDAR-SETUP.md for the officer-facing version, and src/lib/calendar.ts
 * for the publish gate that keeps TBD/TODO events off the site.
 *
 * If it is unreachable the events page says so plainly. There is no JSON
 * fallback: a stale hand-kept list is worse than an honest "we cannot reach the
 * calendar", because an alum who drives to a moved event is worse served than
 * one told to check back.
 * ----------------------------------------------------------------------- */
export const calendar = {
  get enabled() {
    return Boolean(
      process.env.GOOGLE_CALENDAR_ID &&
        (process.env.GOOGLE_CALENDAR_API_KEY || process.env.GOOGLE_SHEETS_API_KEY),
    );
  },
  status: "stubbed" as IntegrationStatus,
  note: "Chapter Google Calendar not connected — the events page shows an empty state.",
};

/* -------------------------------------------------------------------------
 * 1. CONTACT FORM — REMOVED, NOT PENDING
 * -------------------------------------------------------------------------
 * There is no contact form and no provider to choose. With no endpoint set the
 * old form validated, showed a success message, and sent nothing — a visitor
 * would be told their message went through and never be heard from again.
 *
 * The Contact page publishes the chapter inbox as a mailto link instead. That
 * cannot silently fail, needs no vendor, and leaves no account for a future
 * officer to inherit. If the chapter ever wants a real form, add a provider
 * here and build it deliberately.
 * ----------------------------------------------------------------------- */

/* -------------------------------------------------------------------------
 * 2. NEWSLETTER DELIVERY — DECIDED: NONE
 * -------------------------------------------------------------------------
 * The chapter distributes its newsletter separately and does not want an email
 * list here (confirmed August 2026). This is a decision, not a gap: the site
 * hosts the PDFs as an archive and that is the finished state.
 *
 * Do not add a signup box, a provider, or a "subscribe" prompt without asking.
 * There is no officer issuing mail from this site, so a signup form would
 * collect addresses nobody reads.
 * ----------------------------------------------------------------------- */
export const newsletter = {
  signupEnabled: false,
  status: "declined" as IntegrationStatus,
  note: "Distributed separately by the chapter. The site hosts the archive only.",
};

/* -------------------------------------------------------------------------
 * 3. SOCIAL SHARE — REMOVED
 * -------------------------------------------------------------------------
 * The share buttons were removed from the Events page at the chapter's request
 * (alumni do not use them), and this URL builder went with them.
 * ----------------------------------------------------------------------- */

/* -------------------------------------------------------------------------
 * 4. SOCIAL FOLLOW LINKS — MOVED TO CONTENT
 * -------------------------------------------------------------------------
 * The handles now live in content/site.json under `social`, editable in the
 * CMS beside the contact details.
 *
 * They were here, in code, which meant the one account a chapter actually
 * changes hands — Instagram — needed a developer and a deploy to update. A URL
 * an officer replaces is content, not configuration; only things with
 * credentials belong in this file.
 *
 * Any handle left blank is skipped, so the footer never shows a dead icon.
 * ----------------------------------------------------------------------- */

/* -------------------------------------------------------------------------
 * 5. ANALYTICS
 * -------------------------------------------------------------------------
 * CHOSEN: "vercel" (August 2026). The site is hosted on Vercel, so this needs
 * no second vendor and no account for an officer to inherit. No cookies and no
 * stored identifiers, so no consent banner. 50,000 events/month on the free
 * plan, which this site will not come close to.
 *
 * TO SWITCH IT ON: set NEXT_PUBLIC_ANALYTICS_PROVIDER=vercel in the Vercel
 * project's environment variables, and enable Web Analytics in the dashboard
 * (Project → Analytics). No ID is needed — the platform injects it. It is a
 * NEXT_PUBLIC_ variable, so it is baked in at build time — setting it on an
 * existing deployment does nothing until a redeploy.
 *
 * THE SAME VARIABLE ALSO SWITCHES ON SPEED INSIGHTS (real-user page-speed
 * measurement), enabled separately in the dashboard under Project → Speed
 * Insights. One switch for both, deliberately — see src/components/Analytics.tsx.
 *
 * "plausible" and "ga4" still work and both need NEXT_PUBLIC_ANALYTICS_ID.
 * Plausible is the one to reach for if year-over-year comparison matters:
 * Vercel's free tier only keeps a one-month reporting window.
 *
 * No script is injected while the provider is empty.
 * ----------------------------------------------------------------------- */
export const analytics = {
  provider: env("NEXT_PUBLIC_ANALYTICS_PROVIDER") as "" | "vercel" | "ga4" | "plausible",
  id: env("NEXT_PUBLIC_ANALYTICS_ID"),
  get enabled() {
    // Vercel supplies its own identifiers at the platform level; the others
    // are inert without a site ID, so requiring one would ship a dead script.
    if (this.provider === "vercel") return true;
    return this.provider.length > 0 && this.id.length > 0;
  },
  status: "stubbed" as IntegrationStatus,
  note: "No analytics script is loaded. Set NEXT_PUBLIC_ANALYTICS_PROVIDER=vercel to switch on.",
};

/* -------------------------------------------------------------------------
 * 6. GIVING / DONATIONS  ← TOUCHES REAL MONEY
 * -------------------------------------------------------------------------
 * TODO: DO NOT WIRE THIS UP DURING THE REBUILD.
 *
 * The Donations page renders an explanatory panel and a disabled button until
 * this is deliberately enabled by the chapter, with a named person accountable
 * for the account. Options when that day comes:
 *   - Phi Gamma Delta Educational Foundation (tax-deductible, national)
 *   - Texas A&M Foundation chapter fund
 *   - Stripe Payment Link / Givebutter (chapter-controlled, NOT deductible)
 *
 * This single switch also gates the per-fund giving links on donation
 * subpages, so there is exactly one place to turn giving on.
 *
 * Setting NEXT_PUBLIC_GIVING_URL alone is not enough — `enabled` is also
 * hard-coded false so this cannot go live by accident from an env var.
 *
 * DECIDED, AUGUST 2026: the chapter is NOT taking a payment processor. Gifts
 * arrive by Venmo, Zelle, and cheque, and the Give page explains all three.
 * That is the finished design, not a stopgap — so this no longer counts as a
 * pending integration. It stays hard-disabled because the day someone revisits
 * it, it should take a deliberate code change and a named person on the
 * account, not a stray environment variable.
 * ----------------------------------------------------------------------- */
export const giving = {
  enabled: false, // ← deliberate hard stop. Requires a code change to enable.
  url: env("NEXT_PUBLIC_GIVING_URL"),
  status: "declined" as IntegrationStatus,
  note: "By decision: gifts come via Venmo, Zelle, and cheque. No processor.",
};

/* ------------------------------------------------------------------------- */

export const siteUrl = env("NEXT_PUBLIC_SITE_URL") || "http://localhost:3000";

/**
 * Everything genuinely unfinished — powers the dev-only status banner.
 *
 * Newsletter distribution, giving, and the contact form are NOT here. The
 * chapter considered each and said no, and a checklist that keeps reporting
 * settled questions as outstanding work is a checklist people stop reading.
 * Social handles are content now (content/site.json), so they show up in the
 * CMS as empty fields rather than as a developer's TODO.
 *
 * Add to this list only when something is genuinely waiting on a person.
 */
export const pendingIntegrations = [
  { name: "Google Sheet (giving & wishlist)", enabled: sheets.enabled, note: sheets.note },
  { name: "Google Calendar (events)", enabled: calendar.enabled, note: calendar.note },
  { name: "Analytics", enabled: analytics.enabled, note: analytics.note },
].filter((i) => !i.enabled);

/**
 * Settled questions, kept visible in code so the next person does not
 * re-litigate them from scratch. Nothing renders these — they are the record.
 */
export const declinedIntegrations = [
  { name: "Contact form", note: "Removed. The chapter publishes one inbox as a mailto." },
  { name: "Newsletter distribution", note: newsletter.note },
  { name: "Giving / payment processor", note: giving.note },
];
