import "server-only";

import { FUNDS, type Fund } from "@/lib/funds";
import {
  getCumulativeTotals,
  getDonations,
  getFundTotals,
  parseDate,
  sheetsConfigured,
  type FundTotals,
} from "@/lib/sheets";
import { getCampaign, type Campaign } from "@/lib/content";
import type { TimelinePoint } from "@/lib/sheet-types";
import type { ProgressData } from "@/components/FundProgress";

/**
 * The bridge between the Google Sheet and the pages.
 *
 * Every giving figure on the site goes through here, so there is exactly one
 * place that decides "live data or hand-entered fallback". If the chapter ever
 * moves off Google Sheets, this file changes and nothing else does.
 */

/** Cumulative across every fund — the single number on the homepage and hub. */
export async function getGivingSummary(): Promise<ProgressData | null> {
  if (sheetsConfigured) {
    const totals = await getCumulativeTotals(FUNDS);
    if (totals && totals.goal > 0) {
      return {
        label: "All funds combined",
        raised: totals.raised,
        goal: totals.goal,
        donorCount: totals.donorCount,
        asOf: totals.lastGiftDate,
        source: "sheets",
      };
    }
  }

  // Fallback: figures typed into content/pages/donations.json. Keeps the site
  // meaningful if the sheet is unreachable, unconfigured, or rate-limited.
  const campaign: Campaign | null = getCampaign();
  if (!campaign) return null;
  return {
    label: campaign.label,
    raised: campaign.raisedAmount,
    goal: campaign.goalAmount,
    donorCount: campaign.donorCount,
    asOf: campaign.asOf ?? null,
    source: "manual",
  };
}

// Declared in sheet-types.ts so client components can use it — see that file.
export type { TimelinePoint };

/**
 * Every gift across every fund, merged and accumulated into a running total.
 *
 * Why this exists: a percentage-of-goal bar answers "how far to go" and nothing
 * else. Early in a campaign that reads as failure — 3% looks the same whether
 * giving is accelerating or dead. A cumulative curve shows the slope instead,
 * which is the honest and more useful story while a campaign is still opening
 * up. Same underlying rows as the bar, no separate bookkeeping.
 *
 * Gifts on the same day collapse into one point, so a busy day is one step up
 * rather than several stacked at the same x position.
 */
export async function getGivingTimeline(
  fundKeys?: string | string[],
): Promise<TimelinePoint[]> {
  if (!sheetsConfigured) return [];

  /*
   * One key gives that fund's own curve. An ARRAY of keys merges a group — the
   * Philanthropy & Scholarships column on /donations is four funds shown as one
   * line, because a visitor reads that as a single giving avenue even though
   * the treasurer tracks it as four tabs. No argument at all means every fund.
   */
  const keys =
    fundKeys === undefined ? null : Array.isArray(fundKeys) ? fundKeys : [fundKeys];
  const funds = keys ? FUNDS.filter((f) => keys.includes(f.key)) : FUNDS;
  if (funds.length === 0) return [];

  const perFund = await Promise.all(funds.map((f) => getDonations(f.donationsTab)));

  // Normalize to ISO up front — the sheet accepts both YYYY-MM-DD and M/D/YYYY,
  // and sorting raw strings would interleave the two formats incorrectly.
  const byDate = new Map<string, number>();
  for (const entry of perFund.flat()) {
    const parsed = parseDate(entry.date);
    if (!parsed) continue;
    const iso = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(
      parsed.getDate(),
    ).padStart(2, "0")}`;
    byDate.set(iso, (byDate.get(iso) ?? 0) + entry.amount);
  }

  let running = 0;
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => {
      running += amount;
      return { date, total: running };
    });
}

/** True when the manual fallback is still flagged as sample data. */
export function usingPlaceholderFigures(): boolean {
  return !sheetsConfigured && (getCampaign()?.isPlaceholder ?? false);
}

export interface FundWithTotals {
  fund: Fund;
  totals: FundTotals | null;
}

export async function getFundsWithTotals(funds: Fund[]): Promise<FundWithTotals[]> {
  const results = await Promise.all(
    funds.map(async (fund) => ({
      fund,
      totals: await getFundTotals(fund.donationsTab, fund.goalKey, fund.defaultGoal),
    })),
  );
  return results;
}

export async function getSingleFund(key: string): Promise<FundWithTotals | null> {
  const fund = FUNDS.find((f) => f.key === key);
  if (!fund) return null;
  return { fund, totals: await getFundTotals(fund.donationsTab, fund.goalKey, fund.defaultGoal) };
}
