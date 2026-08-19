import { FUNDS, type Fund } from "@/lib/funds";

/**
 * MEMO LINES — the string a donor writes on Venmo, Zelle, or a cheque.
 * ---------------------------------------------------------------------------
 * This is the only thing that routes a gift. There is no payment processor, so
 * the memo IS the accounting: the treasurer reads it and assigns the money.
 * A donor who writes nothing, or writes something the treasurer doesn't
 * recognise, becomes a mystery deposit.
 *
 * So the Give page does not ask them to compose one. It carries the memo
 * across from wherever they pressed Give, and shows it ready to copy.
 *
 * ── SHAPE ───────────────────────────────────────────────────────────────────
 *   "<Prefix> - <Detail>"
 *
 *   Fundraising Campaign - General
 *   Fundraising Campaign - Car Port          ← a specific wishlist item
 *   Tailgate Sponsorship - $500+             ← a specific tier
 *   Philanthropy - Sarraf Scholarship        ← a specific fund
 *
 * A plain hyphen, not an en dash: this gets typed into a phone keyboard by
 * people re-keying it, and a character they cannot easily type is a character
 * that turns into something else.
 *
 * ── WHY THE DETAIL IS VALIDATED, NOT TRUSTED ────────────────────────────────
 * The detail arrives in the URL, and a URL is attacker-supplied input. Echoing
 * it straight onto the page would let anyone hand a donor a link that displays
 * whatever memo they chose — "pay to @someone-else" reads as an instruction
 * from the chapter when it is rendered in the chapter's own styling.
 *
 * React escapes the text so this is not a script-injection risk; it is a
 * social-engineering one, which escaping does nothing about. So a detail is
 * only ever used if it matches something the chapter actually published — a
 * real wishlist row, a real tier. Anything else silently falls back to the
 * fund's own default rather than erroring, because a donor who followed a
 * stale link should still be able to give.
 */

const MEMO_SEPARATOR = " - ";

export interface ResolvedMemo {
  /** The exact string the donor should write. */
  memo: string;
  /** Which fund this routes to. */
  fundKey: string;
  /** True when the donor arrived without a valid destination and got the default. */
  isDefault: boolean;
}

function memoFor(fund: Fund, detail?: string): string {
  return `${fund.memoPrefix}${MEMO_SEPARATOR}${detail?.trim() || fund.memoDetail}`;
}

/**
 * The dollar figure out of a tier's label: "$1,000 or more" → "$1000+".
 *
 * The trailing plus carries the "or more" across. Without it the memo reads
 * "$500" against a gift of $800, which looks to the treasurer like a figure
 * that does not match the deposit rather than a tier that does.
 *
 * Commas are dropped because this is re-typed by hand into a phone keyboard,
 * and every character that can be mistyped is one that will be.
 *
 * The plus is only added when the wording actually says a threshold. The tier
 * text is the chapter's to write, and a tier meaning exactly $500 should not
 * silently become "$500+". Anything with no recognisable figure at all falls
 * back to the label as typed rather than producing an empty memo.
 */
export function tierMemoDetail(amount: string): string {
  const figure = /\$[\d,]+/.exec(amount)?.[0];
  if (!figure) return amount.trim();
  const plain = figure.replace(/,/g, "");
  const isThreshold = /\bor more\b|\band up\b|\bor above\b|\+/i.test(amount);
  return isThreshold ? `${plain}+` : plain;
}

/**
 * Turns `?fund=…&detail=…` into a memo, checking the detail against what the
 * chapter has actually published.
 *
 * `validDetails` is the set of details legitimate for the given fund — wishlist
 * memo names for the campaign, tier figures for the tailgate. Callers build it
 * from live data; passing an empty set means "no specific detail is valid for
 * this fund", which is correct for the memorial funds.
 */
export function resolveMemo(
  rawFund: string | undefined,
  rawDetail: string | undefined,
  validDetails: readonly string[],
): ResolvedMemo {
  const fallback = FUNDS.find((f) => f.key === "general") ?? FUNDS[0];
  const fund = FUNDS.find((f) => f.key === rawFund) ?? fallback;

  // Case-insensitive so a link that lost its capitalisation still works, but
  // the CHAPTER'S spelling is what gets rendered — never the visitor's.
  const wanted = rawDetail?.trim().toLowerCase();
  const matched = wanted
    ? validDetails.find((d) => d.trim().toLowerCase() === wanted)
    : undefined;

  const arrivedWithDestination = Boolean(rawFund) && fund.key === rawFund;

  return {
    memo: memoFor(fund, matched),
    fundKey: fund.key,
    isDefault: !arrivedWithDestination && !matched,
  };
}

/** Query string for a Give button. Undefined detail gives the fund default. */
export function giveHref(fundKey: string, detail?: string): string {
  const params = new URLSearchParams({ fund: fundKey });
  if (detail?.trim()) params.set("detail", detail.trim());
  return `/donations/give?${params}`;
}
