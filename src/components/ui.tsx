import Link from "next/link";
import React from "react";
import { Reveal } from "@/components/Reveal";
import { Tooltip } from "@/components/Tooltip";

/* ------------------------------------------------------------------ Button */

type ButtonTone = "primary" | "accent" | "outline" | "ghost" | "onAccent";

const toneClasses: Record<ButtonTone, string> = {
  primary: "bg-purple-900 text-cream hover:bg-purple-950",
  accent: "bg-salmon-500 text-white hover:bg-salmon-600",
  outline: "border-2 border-purple-900 text-purple-900 hover:bg-purple-900 hover:text-cream",
  ghost: "border-2 border-cream/60 text-cream hover:bg-cream hover:text-purple-900",
  onAccent: "border-2 border-white text-white hover:bg-white hover:text-salmon-600",
};

export function ButtonLink({
  href,
  children,
  tone = "primary",
  className = "",
  external = false,
  tooltip,
}: {
  href: string;
  children: React.ReactNode;
  tone?: ButtonTone;
  className?: string;
  external?: boolean;
  /**
   * Extra detail on hover or focus. Deliberately optional and deliberately
   * NOT applied to every button: a tooltip that repeats the label it is
   * attached to is noise, and teaches people to ignore the ones that say
   * something. Use it where the label cannot carry the whole answer.
   *
   * External links get one automatically, because "opens in a new tab" is
   * exactly the thing a label cannot say without getting longer than it should.
   */
  tooltip?: string;
}) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-sm px-6 py-3 text-sm font-semibold tracking-wide uppercase transition-colors duration-200 ${toneClasses[tone]} ${className}`;

  const button = external ? (
    <a href={href} className={classes} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ) : (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );

  const hint = tooltip ?? (external ? "Opens in a new tab" : undefined);
  if (!hint) return button;

  // The wrapper is inline-flex, so a `w-full` button still fills its container.
  return (
    <Tooltip label={hint} className={className.includes("w-full") ? "w-full" : ""}>
      {button}
    </Tooltip>
  );
}

/* ----------------------------------------------------------------- Section */

export function Section({
  children,
  className = "",
  tone = "light",
  id,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "light" | "tint" | "dark" | "purple";
  id?: string;
  padded?: boolean;
}) {
  const tones = {
    light: "bg-cream text-ink",
    tint: "bg-purple-100 text-ink",
    dark: "bg-purple-950 text-cream",
    purple: "bg-purple-900 text-cream",
  } as const;
  /*
   * Every section eases in on scroll, applied here rather than page by page so
   * the whole site behaves the same way and cannot drift. Reveal is a client
   * component, but `children` arrive already rendered from the server, so this
   * costs a small observer and ships no extra page markup to the browser.
   */
  return (
    <section id={id} className={`${tones[tone]} ${padded ? "py-14 sm:py-20" : ""} ${className}`}>
      <Reveal className="container-page">{children}</Reveal>
    </section>
  );
}

/* -------------------------------------------------------------- SectionHead */

export function SectionHead({
  eyebrow,
  title,
  intro,
  tone = "light",
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  tone?: "light" | "dark";
  align?: "left" | "center";
}) {
  const isDark = tone === "dark";
  return (
    <div className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      {eyebrow ? (
        <p className={`eyebrow mb-3 ${isDark ? "text-salmon-400" : "text-salmon-600"}`}>{eyebrow}</p>
      ) : null}
      <h2 className={`text-3xl sm:text-4xl ${isDark ? "text-cream" : "text-purple-900"}`}>{title}</h2>
      {intro ? (
        <p className={`mt-4 text-lg ${isDark ? "text-cream/80" : "text-ink/80"}`}>{intro}</p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ Divider */

export function CrestRule({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} aria-hidden="true">
      <span className="h-px flex-1 bg-current opacity-20" />
      {/* Hollow diamond — plain outline, no fill. */}
      <svg width="14" height="14" viewBox="0 0 14 14" className="text-salmon-500">
        <path
          d="M7 1.5L12.5 7 7 12.5 1.5 7z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="miter"
        />
      </svg>
      <span className="h-px flex-1 bg-current opacity-20" />
    </div>
  );
}

/* --------------------------------------------------------------- TODO badge */

/**
 * Wraps placeholder content so it is impossible to ship by accident.
 * In development it renders a loud amber marker. In production it renders
 * nothing at all — a page with unfinished content shows less, never lorem.
 */
export function Todo({ children, label = "Needs chapter content" }: { children?: React.ReactNode; label?: string }) {
  if (process.env.NODE_ENV === "production") return null;
  return (
    <div className="my-4 rounded-sm border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-semibold uppercase tracking-wide text-xs">⚠ {label}</p>
      {children ? <div className="mt-1">{children}</div> : null}
    </div>
  );
}

/** True when a content string is still an unfilled placeholder. */
export function isTodo(value?: string | null): boolean {
  return !value || /^\s*TODO/i.test(value);
}

/** Renders text only if it is real content; otherwise a dev-only TODO marker. */
export function ContentText({
  value,
  className = "",
  label,
}: {
  value?: string;
  className?: string;
  label?: string;
}) {
  if (isTodo(value)) return <Todo label={label}>{value}</Todo>;
  return <p className={className}>{value}</p>;
}

/* ------------------------------------------------------------- Empty state */

/**
 * Shared "nothing here yet" block.
 *
 * Hiding a section entirely is right when it promises nothing — the homepage
 * photo strip just disappears. But a section that is a standing promise, like
 * the newsletter archive, should say so plainly rather than vanish: a visitor
 * who came looking for newsletters deserves an answer, not a missing section.
 */
export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="rounded-sm border border-dashed border-purple-900/25 bg-white/60 p-8 text-center">
      <p className="font-serif text-xl text-purple-900">{title}</p>
      {message ? <p className="mx-auto mt-2 max-w-md text-sm text-ink/70">{message}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------- Image placeholder */

export function PhotoPlaceholder({
  label = "Chapter photo",
  className = "",
  aspect = "aspect-4/3",
}: {
  label?: string;
  className?: string;
  aspect?: string;
}) {
  return (
    <div
      className={`${aspect} ${className} flex flex-col items-center justify-center gap-2 bg-purple-900/8 text-center ring-1 ring-inset ring-purple-900/10`}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-purple-900/35">
        <path
          d="M3 5h18v14H3z M3 16l5-5 4 4 3-3 6 6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="8.5" cy="9" r="1.5" fill="currentColor" />
      </svg>
      <span className="px-3 text-xs font-medium uppercase tracking-wider text-purple-900/45">{label}</span>
    </div>
  );
}
