/**
 * Shapes of the data read from the chapter Google Sheet.
 *
 * These live in their own module, separate from `sheets.ts`, on purpose:
 * `sheets.ts` is marked `server-only` because it holds the API key, and client
 * components (the wishlist grid) need these types. A type-only import would be
 * erased safely today, but one future edit dropping the `type` keyword would
 * pull the key into the browser bundle. Splitting the types makes that
 * mistake impossible rather than merely unlikely.
 */

export interface DonationEntry {
  date: string;
  amount: number;
}

/**
 * One point on a cumulative giving curve.
 *
 * Declared here rather than in `giving.ts` for the reason at the top of this
 * file: the giving avenues on /donations are a client component, and they
 * render these curves. `giving.ts` is server-only.
 */
export interface TimelinePoint {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** Running total up to and including this date. */
  total: number;
}

export interface WishlistItem {
  name: string;
  category: string;
  description: string;
  cost: string;
  images: string[];
  /**
   * Short label for the memo line, from the sheet's `Memo Name` column.
   *
   * Separate from `name` because the two have different jobs. The name is a
   * shelf label — "Storage car port for the trailer" reads well in a list. The
   * memo is re-typed by hand into a Venmo note, so it wants to be "Car Port".
   * The treasurer writes it, because the treasurer is the one who has to
   * recognise it on a bank statement six weeks later.
   *
   * Falls back to `name` when the column is blank or missing, so the sheet
   * keeps working untouched and the column can be filled in gradually.
   */
  memoName: string;
}

export interface FundTotals {
  raised: number;
  goal: number;
  donorCount: number;
  /** Date of the most recent entry — shown so stale data is visible. */
  lastGiftDate: string | null;
}

/**
 * One name on the Donor Wall.
 *
 * NAMES ONLY. This deliberately has no amount, no date, and no contact field —
 * see the note on `getDonorWall()` in sheets.ts for why that matters given the
 * sheet is link-public.
 */
export interface DonorName {
  name: string;
  group?: string;
}
