import { isTodo } from "@/components/ui";

export interface ProgressData {
  label?: string;
  raised: number;
  goal: number;
  donorCount?: number;
  /** ISO date of the most recent gift, or when figures were last updated. */
  asOf?: string | null;
  /** Where the numbers came from — surfaced so stale data is never silent. */
  source?: "sheets" | "manual";
}

export const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const pctOf = (raised: number, goal: number) =>
  goal > 0 ? Math.max(0, Math.min(100, Math.round((raised / goal) * 100))) : 0;

const prettyDate = (iso: string) =>
  new Date(`${iso.includes("T") ? iso : `${iso}T12:00:00`}`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

/* -------------------------------------------------------------- compact */

/** Slim bar for fund cards. No card chrome of its own. */
export function ProgressBar({ raised, goal, tone = "light" }: ProgressData & { tone?: "light" | "dark" }) {
  const pct = pctOf(raised, goal);
  const track = tone === "dark" ? "bg-cream/15" : "bg-purple-900/10";

  return (
    <div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${pct}% of the ${usd(goal)} goal`}
        className={`h-2.5 w-full overflow-hidden rounded-full ${track}`}
      >
        <div className="h-full rounded-full bg-salmon-500" style={{ width: `${pct}%` }} />
      </div>
      <div
        className={`mt-2 flex flex-wrap items-baseline justify-between gap-x-3 text-sm ${
          tone === "dark" ? "text-cream/75" : "text-ink/70"
        }`}
      >
        <span className={`font-semibold ${tone === "dark" ? "text-cream" : "text-purple-900"}`}>
          {usd(raised)}
        </span>
        <span>
          of {usd(goal)} · {pct}%
        </span>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- full */

/** The large headline card used on the homepage and the donations hub. */
export function FundProgress({ label, raised, goal, donorCount, asOf, source }: ProgressData) {
  const pct = pctOf(raised, goal);
  const remaining = Math.max(0, goal - raised);

  return (
    <div className="rounded-sm bg-white p-6 ring-1 ring-purple-900/15 sm:p-8">
      {label && !isTodo(label) ? <p className="eyebrow text-salmon-600">{label}</p> : null}

      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-serif text-4xl text-purple-900 sm:text-5xl">{usd(raised)}</span>
        <span className="text-lg text-ink/60">raised of {usd(goal)} goal</span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${pct}% of the ${usd(goal)} goal`}
        className="mt-5 h-4 w-full overflow-hidden rounded-full bg-purple-900/10"
      >
        <div className="h-full rounded-full bg-salmon-500" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
        <span className="font-semibold text-purple-900">{pct}% of goal</span>
        {remaining > 0 ? (
          <span className="text-ink/60">{usd(remaining)} to go</span>
        ) : (
          <span className="font-semibold text-salmon-600">Goal met — thank you</span>
        )}
      </div>

      {(donorCount ?? 0) > 0 || asOf ? (
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t border-purple-900/10 pt-5 text-sm">
          {(donorCount ?? 0) > 0 ? (
            <div>
              <dt className="eyebrow text-ink/50">Gifts received</dt>
              <dd className="mt-0.5 font-serif text-xl text-purple-900">{donorCount}</dd>
            </div>
          ) : null}
          {asOf ? (
            <div>
              <dt className="eyebrow text-ink/50">
                {source === "sheets" ? "Most recent gift" : "Updated"}
              </dt>
              <dd className="mt-0.5 text-ink/75">{prettyDate(asOf)}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}
