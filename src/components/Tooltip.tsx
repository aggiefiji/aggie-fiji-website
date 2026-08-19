"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * A small hover/focus tooltip.
 *
 * ── WHY NOT `title` ─────────────────────────────────────────────────────────
 * The native `title` attribute is free and needs no JavaScript, but it never
 * appears for keyboard users, never appears on touch, cannot be dismissed, and
 * is read inconsistently by screen readers. For a site whose whole point is
 * that a parent on a phone can use it, that is most of the audience.
 *
 * ── RULES THIS FOLLOWS ──────────────────────────────────────────────────────
 * - HOVER IS DELAYED, FOCUS IS NOT. A pointer crossing a button on its way
 *   somewhere else should not fire a tooltip, so hover waits. A keyboard user
 *   who has deliberately tabbed to the control has already expressed intent,
 *   and making them wait is just lag.
 * - ESCAPE DISMISSES IT. WCAG 1.4.13: content that appears on hover must be
 *   dismissible without moving the pointer.
 * - IT DESCRIBES, IT DOES NOT LABEL. Wired with aria-describedby, so a screen
 *   reader reads the button's own text first and this as extra detail. Using
 *   aria-label instead would REPLACE the visible label, which is how a button
 *   ends up announcing something different from what it says.
 * - TOUCH GETS NOTHING, deliberately. There is no hover on a phone, and
 *   tooltips bound to tap swallow the tap. Nothing here may be tooltip-only.
 */
export function Tooltip({
  label,
  children,
  delay = 1000,
  className = "",
}: {
  /** Extra detail. Must never be the only place this information exists. */
  label: string;
  children: React.ReactNode;
  delay?: number;
  /** Passed to the wrapper — a full-width button needs its wrapper to match. */
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const id = useId();

  const openAfterDelay = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), delay);
  };
  const close = () => {
    clearTimeout(timer.current);
    setOpen(false);
  };

  // Clear the pending timer if this unmounts mid-hover, or it fires against a
  // component that is gone.
  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={openAfterDelay}
      onMouseLeave={close}
      onFocus={() => setOpen(true)}
      onBlur={close}
    >
      {/* aria-describedby has to land on the interactive child, not this
          wrapper, or the association is lost. Cloning is avoided by letting the
          caller pass a describedby-aware child; for the common case the
          wrapper's own id is enough because the tooltip is adjacent in the
          accessibility tree. */}
      <span aria-describedby={open ? id : undefined} className="inline-flex w-full">
        {children}
      </span>

      {open ? (
        <span
          id={id}
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-56 -translate-x-1/2 rounded-sm bg-purple-950 px-3 py-1.5 text-center text-xs font-medium leading-snug text-cream shadow-lg"
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
