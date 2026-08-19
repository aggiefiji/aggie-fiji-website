"use client";

import { useState } from "react";
import type { TimelinePoint } from "@/lib/sheet-types";
import { ProgressBar } from "@/components/FundProgress";
import { MiniGivingTrend } from "@/components/GivingTrend";

/**
 * The three giving avenues, side by side, at the top of /donations.
 *
 * ── WHY THIS REPLACED THE COMBINED CHARTS ───────────────────────────────────
 * The page used to open with an all-funds progress bar, an all-funds trend
 * curve, and a composition bar — three views of one aggregate number. That
 * answered "how is the chapter doing overall", which is a question the chapter
 * asks itself. A visitor is asking a different one: what can I give to, and how
 * is that particular thing doing. Three columns answer that directly, and the
 * detail for each follows below.
 *
 * ── PROGRESS vs OVER TIME ───────────────────────────────────────────────────
 * One toggle drives all three, deliberately. Comparing avenues is the whole
 * point of putting them in a row, and per-column toggles would let the reader
 * end up comparing a percentage against a curve without noticing.
 *
 * The two views answer genuinely different questions and neither is redundant:
 * the bar says how far there is to go, the curve says whether money is still
 * arriving. Early in a campaign a bar reads as failure — 4% looks identical
 * whether giving is accelerating or dead — which is exactly when the curve is
 * the honest picture.
 *
 * Rendered from data fetched on the SERVER and passed in, so every figure is in
 * the HTML. With JavaScript off the toggle does nothing and the bars still
 * show; nothing here gates information behind an interaction.
 */

export interface Avenue {
  key: string;
  title: string;
  blurb: string;
  /** Anchor of the matching detail section further down the page. */
  anchor: string;
  /** Null when the sheet has no tab for this avenue yet. */
  totals: { raised: number; goal: number; donorCount: number } | null;
  timeline: TimelinePoint[];
}

type View = "progress" | "trend";

export function GivingAvenues({ avenues }: { avenues: Avenue[] }) {
  const [view, setView] = useState<View>("progress");

  // Nothing to toggle to if no avenue has enough history for a curve.
  const anyTrend = avenues.some((a) => a.timeline.length >= 2);

  return (
    <div className="mt-10">
      {anyTrend ? (
        <div className="mb-6 flex justify-end">
          {/*
            A two-option segmented control rather than a single button that
            swaps its own label. "Show giving over time" on a button gives no
            hint about what is on screen right now; two labelled segments with
            one pressed always show both the current state and the alternative.
          */}
          <div
            role="group"
            aria-label="Chart view"
            className="inline-flex rounded-sm bg-purple-900/8 p-1"
          >
            {(
              [
                ["progress", "Progress to goal"],
                ["trend", "Giving over time"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setView(value)}
                aria-pressed={view === value}
                className={`rounded-sm px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  view === value
                    ? "bg-purple-900 text-cream"
                    : "text-purple-900 hover:bg-purple-900/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <ul className="grid gap-6 md:grid-cols-3">
        {avenues.map((avenue) => (
          <li
            key={avenue.key}
            className="flex flex-col rounded-sm bg-white p-6 ring-1 ring-purple-900/10"
          >
            <h3 className="text-xl text-purple-900">
              <a href={avenue.anchor} className="hover:underline">
                {avenue.title}
              </a>
            </h3>
            {/* flex-1 so the charts line up across columns even when the blurbs
                run to different lengths. */}
            <p className="mt-2 flex-1 text-sm text-ink/75">{avenue.blurb}</p>

            <div className="mt-5 border-t border-purple-900/10 pt-5">
              {avenue.totals ? (
                view === "progress" || avenue.timeline.length < 2 ? (
                  <ProgressBar
                    raised={avenue.totals.raised}
                    goal={avenue.totals.goal}
                  />
                ) : (
                  <MiniGivingTrend points={avenue.timeline} label={avenue.title} />
                )
              ) : (
                /* Deliberately not a $0 bar. An empty track reads as failure,
                   which is not what a fund the treasurer has not set up yet is. */
                <p className="text-sm text-ink/55">
                  Tracking for this fund appears once the chapter sets it up.
                </p>
              )}
            </div>

            <a
              href={avenue.anchor}
              className="mt-5 inline-block text-sm font-semibold text-salmon-600 underline underline-offset-4"
            >
              See what it supports →
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
