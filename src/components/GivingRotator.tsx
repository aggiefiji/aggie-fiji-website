"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { FundProgress, type ProgressData } from "@/components/FundProgress";

/**
 * The homepage giving figure, cycling through the three giving avenues.
 *
 * ── WHY IT ROTATES ──────────────────────────────────────────────────────────
 * This slot used to show one all-funds-combined bar. That number is dominated
 * by the General fund, so tailgate and philanthropy were invisible on the
 * homepage even though they are two of the three ways to give.
 *
 * ── WHY ALL THREE PANELS ARE ALWAYS RENDERED ────────────────────────────────
 * They are stacked in one grid cell, every panel in the same row and column,
 * with the inactive ones at opacity 0. Two things fall out of that:
 *
 *   1. THE BOX STOPS SNAPPING. The container is as tall as the tallest panel,
 *      always. Swapping one panel for another re-measured the card on every
 *      change — a fund with a "gifts received" row is taller than one without —
 *      and the section jumped, shoving the page under it.
 *   2. THE CHANGE CAN CROSSFADE. Outgoing and incoming overlap for 550ms
 *      instead of one vanishing before the other exists.
 *
 * The cost is three cards' markup instead of one, which is text and a div.
 * Worth it, and it means every figure is in the HTML for search engines and
 * for anyone whose JavaScript never runs.
 *
 * ── AUTO-ADVANCING CONTENT HAS RULES ────────────────────────────────────────
 * WCAG 2.2.2: anything updating automatically for more than five seconds must
 * be pausable. It pauses on hover and on keyboard focus, and
 * prefers-reduced-motion stops the rotation altogether — the dots still work,
 * so nothing becomes unreachable, it just never moves on its own.
 *
 * FIVE SECONDS, not three. A reader takes in a fund name, a figure, a goal and
 * a percentage; three seconds is long enough to notice movement and not long
 * enough to finish reading.
 */

const INTERVAL_MS = 5000;
const FADE_MS = 550;

/*
 * prefers-reduced-motion, read through useSyncExternalStore rather than an
 * effect. matchMedia IS an external store, and this is what the hook is for:
 * it gives a server snapshot (false — no motion preference is knowable during
 * SSR), subscribes on the client, and avoids the extra render an effect that
 * calls setState would cause on every mount.
 */
const REDUCE_MOTION = "(prefers-reduced-motion: reduce)";
const subscribeReduceMotion = (onChange: () => void) => {
  const query = window.matchMedia(REDUCE_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const getReduceMotion = () => window.matchMedia(REDUCE_MOTION).matches;
const getReduceMotionOnServer = () => false;

export interface RotatorPanel {
  key: string;
  /** Shown as the card's eyebrow, e.g. "Fundraising Campaign". */
  label: string;
  data: ProgressData;
}

export function GivingRotator({ panels }: { panels: RotatorPanel[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useSyncExternalStore(
    subscribeReduceMotion,
    getReduceMotion,
    getReduceMotionOnServer,
  );

  const rotating = !paused && !reduceMotion && panels.length > 1;

  useEffect(() => {
    if (!rotating) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % panels.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, [rotating, panels.length]);

  if (panels.length === 0) return null;
  const active = Math.min(index, panels.length - 1);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/*
        aria-live="off" on purpose. This updates on a timer with no user action
        behind it, and announcing every rotation would interrupt a screen reader
        mid-sentence every five seconds. The dots give deliberate access to each
        panel, and that is where an announcement belongs.
      */}
      <div className="grid" aria-live="off">
        {panels.map((panel, i) => (
          <div
            key={panel.key}
            // Same grid cell for every panel — this is what locks the height.
            className="col-start-1 row-start-1 transition-opacity ease-out motion-reduce:transition-none"
            style={{
              opacity: i === active ? 1 : 0,
              transitionDuration: `${FADE_MS}ms`,
              // The hidden panels must not swallow clicks meant for the visible
              // one — they are stacked directly on top of it.
              pointerEvents: i === active ? "auto" : "none",
            }}
            aria-hidden={i !== active}
          >
            <FundProgress {...panel.data} label={panel.label} />
          </div>
        ))}
      </div>

      {panels.length > 1 ? (
        <div className="mt-5 flex items-center justify-center gap-2.5">
          {panels.map((panel, i) => (
            <button
              key={panel.key}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show ${panel.label}`}
              aria-current={i === active}
              className="group h-4 w-12 rounded-full py-1.5"
            >
              {/* The track. Padding above puts it mid-button, so the tap target
                  stays finger-sized while the bar itself stays slim. */}
              <span
                className={`block h-1 w-full overflow-hidden rounded-full transition-colors ${
                  i === active ? "bg-purple-900/20" : "bg-purple-900/15 group-hover:bg-purple-900/30"
                }`}
              >
                {i === active ? (
                  <span
                    /*
                     * Keyed on the active index so React replaces this element
                     * on every change rather than reusing it. A CSS animation
                     * on a reused node does not replay — without the key the
                     * fill runs once and the dots go dead for the rest of the
                     * visit.
                     */
                    key={active}
                    className="block h-full w-full origin-left rounded-full bg-salmon-500"
                    style={
                      rotating
                        ? {
                            animation: `dot-fill ${INTERVAL_MS}ms linear forwards`,
                          }
                        : // Paused or reduced-motion: show the dot as filled
                          // rather than mid-animation, so a frozen bar never
                          // reads as a stalled page.
                          { transform: "scaleX(1)" }
                    }
                  />
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
