import type { TimelinePoint } from "@/lib/sheet-types";
import { usd } from "@/components/FundProgress";

/**
 * Builds the stepped path for a cumulative curve.
 *
 * Shared by both charts below so the "stepped, not smoothed" decision lives in
 * exactly one place: giving happens in discrete gifts, and a curve between two
 * points implies money arriving on days nothing came in.
 */
function steppedPaths(
  points: TimelinePoint[],
  x: (iso: string) => number,
  y: (total: number) => number,
) {
  const steps: string[] = [`M ${x(points[0].date)} ${y(0)}`];
  let previousTotal = 0;
  for (const point of points) {
    steps.push(`L ${x(point.date)} ${y(previousTotal)}`);
    steps.push(`L ${x(point.date)} ${y(point.total)}`);
    previousTotal = point.total;
  }
  const line = steps.join(" ");
  return { line, area: `${line} L ${x(points[points.length - 1].date)} ${y(0)} Z` };
}

/**
 * The same curve at column size — no card chrome, no axis labels, no headline
 * figure, because the block it sits inside already states the amount raised.
 *
 * Used by the three giving avenues on /donations when the reader switches from
 * "progress to goal" to "giving over time". Kept in this file rather than its
 * own so both charts share `steppedPaths` and cannot drift apart visually.
 */
export function MiniGivingTrend({
  points,
  label,
}: {
  points: TimelinePoint[];
  label: string;
}) {
  // One point is a dot, not a trend — same rule as the full chart.
  if (points.length < 2) {
    return (
      <p className="text-sm text-ink/55">
        Not enough gifts yet to show a trend. The bar view shows the total.
      </p>
    );
  }

  const width = 320;
  const height = 84;
  const pad = 4;
  const first = points[0];
  const last = points[points.length - 1];
  const max = last.total || 1;

  const startMs = new Date(`${first.date}T12:00:00`).getTime();
  const span = Math.max(1, new Date(`${last.date}T12:00:00`).getTime() - startMs);

  const x = (iso: string) =>
    pad + ((new Date(`${iso}T12:00:00`).getTime() - startMs) / span) * (width - pad * 2);
  const y = (total: number) => pad + (height - pad * 2) * (1 - total / max);

  const { line, area } = steppedPaths(points, x, y);
  const short = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${label}: cumulative giving from ${short(first.date)} to ${short(
          last.date,
        )}, reaching ${usd(last.total)}.`}
      >
        <defs>
          <linearGradient id={`mini-${label.replace(/\W/g, "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-salmon-500)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--color-salmon-500)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#mini-${label.replace(/\W/g, "")})`} />
        <path
          d={line}
          fill="none"
          stroke="var(--color-salmon-500)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={x(last.date)} cy={y(last.total)} r="3.5" fill="var(--color-salmon-500)" />
      </svg>
      <div className="mt-1 flex justify-between text-xs text-ink/50">
        <span>{short(first.date)}</span>
        <span>{short(last.date)}</span>
      </div>
    </div>
  );
}

/**
 * Cumulative giving over time, as a hand-built SVG area chart.
 *
 * No charting library, for the same reason there is no Chart.js behind the
 * progress bars: one chart does not justify 200KB and a dependency to keep
 * patched on a site that will go unmaintained for stretches.
 *
 * SCALE: the y-axis tops out at the amount raised, NOT the goal. Scaling to a
 * $95,000 goal would flatten $3,250 of real giving into a line indistinguishable
 * from zero — technically accurate and completely uninformative. The goal
 * belongs on the progress bar beside this; this chart answers a different
 * question, which is whether giving is moving.
 *
 * Rendered server-side as plain SVG, so it works with JavaScript off and ships
 * no client bundle.
 */
export function GivingTrend({
  points,
  label = "Giving so far this year",
}: {
  points: TimelinePoint[];
  label?: string;
}) {
  // One point is a dot, not a trend. Below two, the bar alone tells the story.
  if (points.length < 2) return null;

  const width = 640;
  const height = 220;
  const padding = { top: 16, right: 16, bottom: 28, left: 16 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const first = points[0];
  const last = points[points.length - 1];
  const max = last.total || 1;

  const startMs = new Date(`${first.date}T12:00:00`).getTime();
  const endMs = new Date(`${last.date}T12:00:00`).getTime();
  const span = Math.max(1, endMs - startMs);

  const x = (iso: string) =>
    padding.left + ((new Date(`${iso}T12:00:00`).getTime() - startMs) / span) * plotWidth;
  const y = (total: number) => padding.top + plotHeight - (total / max) * plotHeight;

  // Stepped, not smoothed — see steppedPaths above for the reasoning.
  const { line: linePath, area: areaPath } = steppedPaths(points, x, y);

  const shortDate = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="rounded-sm bg-white p-6 ring-1 ring-purple-900/15 sm:p-8">
      <p className="eyebrow text-salmon-600">{label}</p>
      <p className="mt-2 font-serif text-3xl text-purple-900 sm:text-4xl">{usd(last.total)}</p>
      <p className="mt-1 text-sm text-ink/60">
        across {points.length} day{points.length === 1 ? "" : "s"} with gifts
      </p>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-5 h-auto w-full"
        role="img"
        aria-label={`Cumulative giving from ${shortDate(first.date)} to ${shortDate(
          last.date,
        )}, reaching ${usd(last.total)}.`}
      >
        <defs>
          <linearGradient id="givingFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-salmon-500)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-salmon-500)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Baseline only. Gridlines would imply a precision the underlying
            data does not have — these are gift dates, not a regular series. */}
        <line
          x1={padding.left}
          y1={y(0)}
          x2={width - padding.right}
          y2={y(0)}
          stroke="currentColor"
          className="text-purple-900/15"
          strokeWidth="1"
        />

        <path d={areaPath} fill="url(#givingFill)" />
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-salmon-500)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* The most recent gift, marked. */}
        <circle cx={x(last.date)} cy={y(last.total)} r="4.5" fill="var(--color-salmon-500)" />

        <text
          x={padding.left}
          y={height - 8}
          className="fill-current text-purple-900/55"
          style={{ fontSize: "13px" }}
        >
          {shortDate(first.date)}
        </text>
        <text
          x={width - padding.right}
          y={height - 8}
          textAnchor="end"
          className="fill-current text-purple-900/55"
          style={{ fontSize: "13px" }}
        >
          {shortDate(last.date)}
        </text>
      </svg>
    </div>
  );
}
