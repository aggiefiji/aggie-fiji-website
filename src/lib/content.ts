/**
 * CONTENT LAYER
 * -----------------------------------------------------------------------
 * Every piece of updatable content on this site is a JSON file in /content.
 * Officers edit those files through the CMS at /admin (or directly on GitHub);
 * this module reads them at build time. There is no database and no external
 * content service to go down, expire, or lose a password to.
 *
 * Adding a new event = adding one file to content/events/. Nothing else.
 */

import fs from "node:fs";
import path from "node:path";

import { imageSize } from "@/lib/image-size";

const CONTENT_DIR = path.join(process.cwd(), "content");

/* ----------------------------------- types ----------------------------------- */

export interface SiteSettings {
  chapterName: string;
  chapterShortName: string;
  /** What the chapter calls itself, and what alumni actually search for. */
  chapterNickname: string;
  /** Greek-letter designation, e.g. "Alpha Mu Chapter". */
  chapterDesignation: string;
  university: string;
  foundedChapter: string;
  foundedNational: string;
  tagline: string;
  /**
   * Google Form where alumni update their contact details. Lives here rather
   * than in integrations.config.ts because it is a link an officer replaces,
   * not a service with credentials — a rotating officer must be able to swap
   * it from the CMS without a deploy. Empty hides the button entirely.
   */
  alumniUpdateFormUrl?: string;
  /**
   * Chapter social accounts, as full URLs. Content rather than config: the
   * Instagram account is the one that actually changes hands, and needing a
   * developer and a deploy to update a link is the failure this site exists to
   * fix. Any blank entry is skipped, so the footer never shows a dead icon.
   */
  social?: {
    instagram?: string;
    facebook?: string;
    x?: string;
    linkedin?: string;
    youtube?: string;
  };
  contact: {
    /**
     * One chapter inbox, monitored by the President and the Treasurer.
     *
     * Deliberately not split into per-role addresses. A role-based inbox two
     * officers watch survives the yearly handover; a `treasurer@` alias
     * pointing at whoever currently holds the job goes stale the moment it
     * changes, and stale contact details are how the old site failed.
     */
    email: string;
    phone: string;
    /** Where post goes — the P.O. box, not the Lodge. */
    mailingAddress: string;
    /** The Lodge itself. A place to visit, never an address to post to. */
    lodgeAddress?: string;
    /** TODO markers render a visible warning in dev when true. */
    isPlaceholder: boolean;
  };
}

export interface ChapterEvent {
  slug: string;
  title: string;
  /** ISO date, e.g. "2026-09-12" */
  date: string;
  endDate?: string;
  time?: string;
  location?: string;
  /**
   * Free-form tags shown as chips on the event card. Not a fixed union: a
   * calendar event's tags come from hashtags an officer types, so any word can
   * appear. `audienceLabels` in EventCard gives the four common ones friendlier
   * wording and everything else renders as typed.
   */
  audience: string[];
  summary: string;
  body?: string;
  image?: string;
  /** Optional external link. NEVER a signup/account wall. */
  link?: { label: string; url: string };
  featured?: boolean;
}

/**
 * An officer, as the site shows them: a photo, a name, a position.
 *
 * Bio, major, hometown, grad year and email were removed in August 2026 along
 * with the per-officer pages. Collecting a bio from eight brothers stalls the
 * whole section and almost nobody reads them — a face and a title is what an
 * alum or a parent is actually looking for.
 */
export interface Officer {
  slug: string;
  name: string;
  position: string;
  order: number;
  photo?: string;
  /**
   * Show this officer in the homepage leadership row.
   *
   * A flag rather than a hardcoded list of positions in the page: "Social
   * Chair" is a title the chapter can rename, and a page matching on the
   * string would empty its own row silently the day that happened, with only
   * a developer able to see why. A checkbox in the CMS keeps the choice where
   * the person making it can reach it.
   */
  featured?: boolean;
}

export interface Newsletter {
  slug: string;
  title: string;
  date: string;
  summary?: string;
  file?: string;
}

export interface GalleryItem {
  slug: string;
  caption: string;
  image?: string;
  category?: string;
  order?: number;
  /**
   * Pixel dimensions, measured from the file at build time by getGallery().
   * Present so each photo can render at its real shape instead of being cropped
   * into a fixed box, and so next/image can resize it — phone photos arrive in
   * every proportion and size, and the site handles that rather than asking an
   * officer to.
   */
  width?: number;
  height?: number;
}

/**
 * A subpage under /donations. Drop a JSON file in content/donations/ and it
 * becomes a page AND a nav dropdown entry automatically — no code change.
 */
export interface PaymentDetails {
  venmoHandle?: string;
  venmoQr?: string;
  zelleName?: string;
  /**
   * Zelle address, shown as a fallback for anyone who can't scan the QR.
   * Stored in content rather than hardcoded because it follows whoever holds
   * the treasurer role — a successor must be able to change it without a
   * developer, and a stale address here means misdirected money.
   */
  zelleEmail?: string;
  zelleQr?: string;
  checkPayableTo?: string;
  checkAddress?: string;
  taxNote?: string;
}

/**
 * One name on the Donor Wall.
 *
 * Names only — never amounts. A wall recognizes people; it does not publish
 * what each of them gave, and neither does this. These names live in content
 * rather than the giving sheet because that sheet is public and must stay
 * anonymous: Date and Amount only, per the chapter's own rule.
 */
export interface DonorEntry {
  name: string;
  /** Optional grouping, e.g. "Tailgate Sponsors". Ungrouped names list flat. */
  group?: string;
}

/**
 * One sponsorship tier — an amount and what it earns.
 *
 * Structured rather than a markdown list. These were bullets inside the old
 * tailgate page's body, which reads fine as prose but cannot be rendered as a
 * row of boxes with a Give button on each. Prose is for describing; anything
 * the page needs to lay out or attach an action to has to be data.
 *
 * Lives on the Giving page's own content (content/pages/donations.json), not on
 * a donation subpage. The tailgate subpage was deleted in August 2026 when the
 * three fund pages folded into /donations, and leaving the tiers behind on a
 * file whose only remaining job was to create a nav entry would have meant a
 * dropdown item pointing at a route that no longer exists.
 */
export interface SponsorshipTier {
  /** As written, e.g. "$500 or more" — a string, so the chapter controls the
   *  wording. Some tiers may not be a simple threshold. */
  amount: string;
  description: string;
}

export interface DonationPage {
  slug: string;
  title: string;
  order?: number;
  summary?: string;
  body?: string;
  /** Optional external giving link for this specific fund. */
  externalUrl?: string;
  /** Only on the "give" page — how the chapter actually accepts money. */
  payment?: PaymentDetails;
  /**
   * Only on the "give" page — the Google Form donors fill in so the treasurer
   * can match a gift to a name. Empty hides the step rather than linking
   * nowhere.
   */
  donationFormUrl?: string;
  /** Only on the "donors" page — the Donor Wall list. */
  donors?: DonorEntry[];
}

/**
 * Fundraising progress shown on the homepage.
 *
 * NOTE: no payment processor is connected (see integrations.config.ts #6), so
 * these numbers are entered by an officer rather than pulled from a live feed.
 * That is deliberate — it means the chart works today and keeps working if the
 * chapter never wires up a processor. If one is added later, only
 * `getCampaign()` needs to change; nothing that renders it does.
 */
export interface Campaign {
  label: string;
  goalAmount: number;
  raisedAmount: number;
  /** Date the figures were last updated — shown so the chart can't quietly go stale. */
  asOf?: string;
  donorCount?: number;
  note?: string;
  /** While true, the chart renders in development only. */
  isPlaceholder?: boolean;
}

export interface PageContent {
  slug: string;
  title: string;
  intro?: string;
  body?: string;
  [key: string]: unknown;
}

/* --------------------------------- readers ----------------------------------- */

function readCollection<T>(folder: string): T[] {
  const dir = path.join(CONTENT_DIR, folder);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      try {
        return { slug: file.replace(/\.json$/, ""), ...JSON.parse(raw) } as T;
      } catch (err) {
        // A malformed file should not take down the whole site — skip it loudly.
        console.error(`[content] Could not parse ${folder}/${file}:`, err);
        return null;
      }
    })
    .filter((x): x is T => x !== null);
}

function readSingle<T>(file: string, fallback: T): T {
  const full = path.join(CONTENT_DIR, file);
  if (!fs.existsSync(full)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(full, "utf8")) as T;
  } catch (err) {
    console.error(`[content] Could not parse ${file}:`, err);
    return fallback;
  }
}

/* ----------------------------------- API ------------------------------------- */

export function getSiteSettings(): SiteSettings {
  return readSingle<SiteSettings>("site.json", {
    chapterName: "Phi Gamma Delta",
    chapterShortName: "FIJI",
    chapterNickname: "Aggie FIJI",
    chapterDesignation: "Alpha Mu Chapter",
    university: "Texas A&M University",
    foundedChapter: "",
    foundedNational: "1848",
    tagline: "",
    alumniUpdateFormUrl: "",
    social: {},
    contact: {
      email: "",
      phone: "",
      mailingAddress: "",
      lodgeAddress: "",
      isPlaceholder: true,
    },
  });
}

export function getPage(slug: string): PageContent {
  return readSingle<PageContent>(`pages/${slug}.json`, { slug, title: slug });
}

/*
 * getAllEvents() lived here and read content/events/*.json as a fallback for
 * when Google Calendar was unreachable. Both it and those files were deleted in
 * August 2026: the calendar is the only source of events now, and a stale
 * hand-maintained list is worse than an honest "we cannot reach the calendar".
 *
 * Do not reintroduce a second source. Two lists of events drift, and the one
 * that drifts is always the one nobody is looking at.
 */


/** Returns null (so the section hides) unless a real goal has been entered. */
export function getCampaign(): Campaign | null {
  const campaign = getPage("donations").campaign as Campaign | undefined;
  if (!campaign || !campaign.goalAmount || campaign.goalAmount <= 0) return null;
  return campaign;
}

export function getDonationPages(): DonationPage[] {
  return readCollection<DonationPage>("donations").sort(
    (a, b) => (a.order ?? 99) - (b.order ?? 99) || a.title.localeCompare(b.title),
  );
}

export function getOfficers(): Officer[] {
  return readCollection<Officer>("officers").sort(
    (a, b) => (a.order ?? 99) - (b.order ?? 99) || a.name.localeCompare(b.name),
  );
}

export function getNewsletters(): Newsletter[] {
  return readCollection<Newsletter>("newsletters").sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Gallery photos, each measured from the file on disk.
 *
 * The dimensions are read here rather than typed into the JSON because an
 * officer adding a photo should only have to add the photo. Reading the header
 * at build time costs a few hundred bytes per image and means the site copes
 * with whatever shape and size a phone produced.
 *
 * A file that cannot be measured still renders — the caller falls back to a
 * fixed aspect box — so a new or exotic format never blanks the page.
 */
export function getGallery(): GalleryItem[] {
  return readCollection<GalleryItem>("gallery")
    .map((item) => {
      if (!item.image || item.width) return item;
      const size = imageSize(path.join(process.cwd(), "public", item.image));
      return size ? { ...item, width: size.width, height: size.height } : item;
    })
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.slug.localeCompare(b.slug));
}

/* --------------------------------- helpers ----------------------------------- */

export function formatEventDate(event: Pick<ChapterEvent, "date" | "endDate">): string {
  // Noon, so a timezone shift can never move the date onto the previous day.
  const toDate = (iso: string) => new Date(`${iso}T12:00:00`);
  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    toDate(iso).toLocaleDateString("en-US", opts);

  /*
   * A multi-day event leads with its START date on the card badge (that is what
   * someone needs to plan around) and spells out the full span here.
   *
   * The end date is built from getDate()/getFullYear() rather than another
   * toLocaleDateString call. Asking Intl for { day, year } with no month
   * returns "2025 (day: 11)" — it falls back to a descriptive format when the
   * requested fields aren't a recognized date pattern. That produced
   * "October 10–2025 (day: 11)" on every same-month range.
   */
  if (event.endDate && event.endDate !== event.date) {
    const start = toDate(event.date);
    const end = toDate(event.endDate);
    const sameYear = start.getFullYear() === end.getFullYear();
    const sameMonth = sameYear && start.getMonth() === end.getMonth();

    // October 10–11, 2025
    if (sameMonth) {
      return `${fmt(event.date, { month: "long", day: "numeric" })}–${end.getDate()}, ${end.getFullYear()}`;
    }
    // October 31 – November 2, 2025
    if (sameYear) {
      return `${fmt(event.date, { month: "long", day: "numeric" })} – ${fmt(event.endDate, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}`;
    }
    // December 30, 2025 – January 2, 2026 — both years, or the span reads wrong.
    return `${fmt(event.date, { month: "long", day: "numeric", year: "numeric" })} – ${fmt(
      event.endDate,
      { month: "long", day: "numeric", year: "numeric" },
    )}`;
  }
  return fmt(event.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export function eventDateParts(iso: string): { month: string; day: string; year: string } {
  const d = new Date(`${iso}T12:00:00`);
  return {
    month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: String(d.getDate()),
    year: String(d.getFullYear()),
  };
}
