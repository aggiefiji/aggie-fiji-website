/**
 * FUND REGISTRY — the canonical list of things people can give to.
 * ---------------------------------------------------------------------------
 * Each fund maps to a tab in the chapter's Google Sheet and a goal row in the
 * Settings tab. Goals live in the sheet, NOT here, so the treasurer can change
 * a target without a deploy — `defaultGoal` is only a fallback if the Settings
 * row is missing.
 *
 * `memoPrefix` + `memoDetail` compose the text a donor writes on Venmo/Zelle/a
 * cheque so the treasurer knows which fund it belongs to — see src/lib/memo.ts
 * for how they are joined and how a more specific detail (a wishlist item, a
 * sponsorship tier) replaces the default. This file is the single place that
 * wording is defined.
 *
 * TAILGATE: currently its own fund while the chapter works out recognition
 * tiers. If it is later pooled into General, change `donationsTab` and
 * `goalKey` here to match General and add a redirect — no other file needs to
 * change, and historical sheet rows stay where they are.
 */

export type FundGroup = "chapter" | "foundation";

export interface Fund {
  key: string;
  label: string;
  group: FundGroup;
  /** Badge shown on the foundations cards. */
  type?: string;
  description?: string;
  image?: string;
  /** How the image should be cropped — some of these are portraits. */
  imagePosition?: string;
  donationsTab: string;
  goalKey: string;
  defaultGoal: number;
  /**
   * First half of the memo line, before the dash. Groups gifts the way a donor
   * thinks about them, not the way the sheet tabs are organised.
   */
  memoPrefix: string;
  /**
   * Second half, used when the donor did not pick anything more specific.
   * Kept SHORT — this gets re-typed into a phone keyboard, and a memo nobody
   * finishes typing is a memo the treasurer cannot read.
   */
  memoDetail: string;
}

/*
 * ORDER MATTERS. This array is the display order everywhere — the foundations
 * grid and the Give page picker both read it straight through.
 *
 * The four memorial/philanthropy funds are sequenced so the two with the most
 * to say lead: Sarraf and AFSP fill the first row, Clark follows, and Miller
 * sits last. Miller's card is the thinnest — the chapter knows least about him
 * — and a short card in the opening position reads as a gap rather than as
 * brevity. Don't re-sort this alphabetically.
 */
export const FUNDS: Fund[] = [
  {
    key: "general",
    label: "General Donations",
    group: "chapter",
    donationsTab: "Donations",
    goalKey: "Goal",
    defaultGoal: 75000,
    memoPrefix: "Fundraising Campaign",
    memoDetail: "General",
  },
  {
    key: "tailgate",
    label: "Tailgate Sponsorship",
    group: "chapter",
    donationsTab: "Tailgate Donations",
    goalKey: "Tailgate Goal",
    defaultGoal: 15000,
    memoPrefix: "Tailgate Sponsorship",
    memoDetail: "General",
  },
  {
    key: "sarraf",
    label: "Nikman Sarraf Scholarship",
    group: "foundation",
    type: "Scholarship",
    description:
      "Named for a brother remembered for his love of this chapter, his love of basketball, and his smile. Gifts rebuilt the chapter court as the Nikman Sarraf Court and now support a scholarship for students who bring those same things to campus.",
    image: "/donations/nikman-sarraf.jpg",
    // Face sits ~45% down a 4024x6048 frame. Measured, not guessed.
    imagePosition: "center 45%",
    donationsTab: "Sarraf Donations",
    goalKey: "Sarraf Goal",
    defaultGoal: 3000,
    memoPrefix: "Philanthropy",
    memoDetail: "Sarraf Scholarship",
  },
  {
    key: "philanthropy",
    label: "Suicide Prevention & Awareness",
    group: "foundation",
    type: "Philanthropy",
    description:
      "FIJI is committed to supporting suicide prevention and mental health awareness. The chapter collects donations and contributes as a unified voice to the American Foundation for Suicide Prevention.",
    image: "/donations/afsp.png",
    imagePosition: "center",
    donationsTab: "Philanthropy Donations",
    goalKey: "Philanthropy Goal",
    defaultGoal: 1000,
    memoPrefix: "Philanthropy",
    memoDetail: "AFSP",
  },
  {
    key: "clark",
    label: "Cameron Clark Fund",
    group: "foundation",
    type: "Memorial Fund",
    description:
      "Started by family friends of Cameron's, who asked that gifts go toward the Ballinger Lodge projects he loved watching come together. The fund continues to pay for improvements there.",
    image: "/donations/cameron-clark.jpg",
    imagePosition: "center 42%",
    donationsTab: "Clark Donations",
    goalKey: "Clark Goal",
    defaultGoal: 500,
    memoPrefix: "Philanthropy",
    memoDetail: "Clark Fund",
  },
  {
    key: "miller",
    label: "Weston A. Miller Scholarship",
    group: "foundation",
    type: "Scholarship",
    description:
      "A scholarship the chapter carries in memory of Weston A. Miller, awarded to students who reflect the values of Phi Gamma Delta.",
    image: "/donations/weston-miller.jpg",
    imagePosition: "center 33%",
    donationsTab: "Miller Donations",
    goalKey: "Miller Goal",
    defaultGoal: 500,
    memoPrefix: "Philanthropy",
    memoDetail: "Miller Scholarship",
  },
];

export const foundationFunds = () => FUNDS.filter((f) => f.group === "foundation");
