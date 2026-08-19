"use client";

import { useEffect, useRef } from "react";

/**
 * Eases its children in as they scroll into view.
 *
 * Every <Section> renders through this, so one component covers the whole site
 * rather than each page opting in and drifting out of step.
 *
 * ── THE RULE THIS CANNOT BREAK ──────────────────────────────────────────────
 * The starting state is invisible, which means a bug here hides the site.
 * Three independent guards, none of which depend on this component running:
 *
 *   1. prefers-reduced-motion is handled in CSS, not here.
 *   2. A <noscript> block in the root layout un-hides everything when
 *      JavaScript is off — the .reveal class is inert without it.
 *   3. If IntersectionObserver is missing, this reveals everything on mount
 *      rather than leaving the page blank.
 *
 * The observer disconnects after firing. A section only animates once: catching
 * it again on the way back up is a distraction, not a delight, on a page
 * someone is scrolling to find a date or an address.
 *
 * `rootMargin` triggers slightly BEFORE the element edge so the motion finishes
 * around the time it is properly on screen, rather than starting as it arrives
 * and finishing halfway up.
 */
export function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // No observer support: show it and stop. Never leave content hidden.
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
}
