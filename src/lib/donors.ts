import "server-only";

/**
 * DONOR WALL RESOLVER — one entry point, two sources.
 *
 * Same shape as the events resolver: the sheet is the intended source because
 * the treasurer is already in it every time a gift arrives, and the JSON file
 * in content/donations/donors.json is the fallback when the sheet has no
 * `Donor Wall` tab or cannot be read.
 *
 * The sheet wins whenever it returns names. An empty-but-present tab falls back
 * to JSON rather than blanking the wall, which is the opposite of the events
 * rule — and deliberately so. A quiet events calendar is real information ("no
 * events scheduled"); an empty donor wall is almost always a tab someone hasn't
 * filled in yet, and silently erasing people who have already given is far
 * worse than showing a slightly stale list.
 */

import { getDonationPages, type DonorEntry } from "@/lib/content";
import { getDonorWall, sheetsConfigured } from "@/lib/sheets";
import type { DonorName } from "@/lib/sheet-types";

export type DonorSource = "sheet" | "content";

export interface ResolvedDonors {
  donors: DonorName[];
  source: DonorSource;
}

export async function getResolvedDonors(): Promise<ResolvedDonors> {
  if (sheetsConfigured) {
    const fromSheet = await getDonorWall();
    if (fromSheet.length > 0) return { donors: fromSheet, source: "sheet" };
  }

  const page = getDonationPages().find((p) => p.slug === "donors");
  const fromContent: DonorName[] = (page?.donors ?? []).map((d: DonorEntry) => ({
    name: d.name,
    group: d.group,
  }));

  return { donors: fromContent, source: "content" };
}
