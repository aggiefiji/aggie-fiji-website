"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { NavItem } from "@/lib/nav";

/**
 * Dropdowns open on hover or keyboard focus, and close the instant the pointer
 * leaves the item — mouse-out wins over focus, so a menu opened by clicking the
 * parent still vanishes as soon as you move away. There is no transition on the
 * close, and the menu is unmounted rather than hidden, so nothing lingers.
 *
 * A parent label is always a real link to a real page, so the dropdown is never
 * the only way to reach anything.
 */
export function SiteHeader({ nav }: { nav: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  /*
   * Close both menus whenever the route changes.
   *
   * Compared during render rather than in an effect, and the difference is
   * visible rather than academic. An effect runs AFTER the browser has painted,
   * so the new page appears for one frame with the mobile drawer still covering
   * it, and a second render then closes it — a flash on exactly the slow phones
   * this site is built for. Adjusting state during render makes React discard
   * the in-progress render and redo it before painting, so the drawer is never
   * shown open over the new page.
   *
   * This is React's documented pattern for resetting state when a prop changes,
   * and it is what `react-hooks/set-state-in-effect` is pointing at. Closing
   * the menu in each link's onClick would also satisfy the rule but would miss
   * browser back and forward, which do not go through those handlers.
   */
  const [renderedPath, setRenderedPath] = useState(pathname);
  if (renderedPath !== pathname) {
    setRenderedPath(pathname);
    setOpen(false);
    setOpenMenu(null);
  }

  // Escape closes an open dropdown from anywhere.
  useEffect(() => {
    if (!openMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openMenu]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const isBranchActive = (item: NavItem) =>
    isActive(item.href) || (item.children ?? []).some((c) => isActive(c.href));

  return (
    <header className="sticky top-0 z-50 bg-purple-900 text-cream shadow-lg shadow-purple-950/20">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-cream focus:px-4 focus:py-2 focus:text-purple-900"
      >
        Skip to content
      </a>

      <div className="container-page flex items-center justify-between gap-4 py-3">
        <Link href="/" className="flex items-center gap-3" aria-label="Texas A&M Phi Gamma Delta — home">
          <Image
            src="/brand/fiji-crest-512.png"
            alt=""
            width={512}
            height={512}
            priority
            className="h-11 w-auto sm:h-12"
          />
          <span className="leading-tight">
            <span className="block font-serif text-base font-semibold sm:text-lg">Phi Gamma Delta</span>
            <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-cream/70 sm:text-[11px]">
              Texas A&amp;M University
            </span>
          </span>
        </Link>

        {/* ---------------------------------------------------- Desktop nav */}
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {nav.map((item) => {
              const hasChildren = (item.children?.length ?? 0) > 0;
              const menuOpen = hasChildren && openMenu === item.href;
              return (
                <li
                  key={item.href}
                  className="group/nav relative"
                  // Pointer leaving the item closes it unconditionally — even if
                  // a link inside still holds focus from a click.
                  onMouseEnter={hasChildren ? () => setOpenMenu(item.href) : undefined}
                  onMouseLeave={hasChildren ? () => setOpenMenu(null) : undefined}
                  onFocus={hasChildren ? () => setOpenMenu(item.href) : undefined}
                  onBlur={
                    hasChildren
                      ? (e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                            setOpenMenu(null);
                          }
                        }
                      : undefined
                  }
                >
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    aria-expanded={hasChildren ? menuOpen : undefined}
                    className={`flex items-center gap-1.5 rounded-sm px-3 py-2 text-[13px] font-medium tracking-wide transition-colors ${
                      isBranchActive(item)
                        ? "bg-cream/12 text-cream"
                        : "text-cream/80 hover:bg-cream/10 hover:text-cream"
                    }`}
                  >
                    {/* Underlines on hover so the label reads as a link. The
                        chevron sits outside the span — underlining an arrow
                        looks like a rendering bug. */}
                    <span className={hasChildren ? "underline-offset-4 group-hover/nav:underline" : ""}>
                      {item.label}
                    </span>
                    {hasChildren ? (
                      <svg
                        width="9"
                        height="6"
                        viewBox="0 0 10 6"
                        aria-hidden="true"
                        className={`opacity-60 ${menuOpen ? "rotate-180" : ""}`}
                      >
                        <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    ) : null}
                  </Link>

                  {menuOpen ? (
                    <ul className="absolute left-0 top-full z-50 w-60 rounded-sm bg-purple-950 py-2 shadow-xl ring-1 ring-cream/10">
                      {/* The parent page, named inside its own menu. Without
                          this, a dropdown parent looks like a bare heading and
                          the page behind it goes unvisited — and on a touch
                          screen, where the first tap opens the menu, it is the
                          only way in. */}
                      {item.overviewLabel ? (
                        <li className="mb-1 border-b border-cream/10 pb-1">
                          <Link
                            href={item.href}
                            aria-current={isActive(item.href) ? "page" : undefined}
                            className={`block px-4 py-2.5 text-[13px] font-semibold transition-colors hover:bg-cream/10 ${
                              isActive(item.href) ? "text-salmon-400" : "text-cream hover:text-cream"
                            }`}
                          >
                            {item.overviewLabel}
                          </Link>
                        </li>
                      ) : null}

                      {item.children!.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            aria-current={isActive(child.href) ? "page" : undefined}
                            className={`block px-4 py-2.5 text-[13px] transition-colors hover:bg-cream/10 ${
                              isActive(child.href) ? "text-salmon-400" : "text-cream/85 hover:text-cream"
                            }`}
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ------------------------------------------------- Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="-mr-2 flex items-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold uppercase tracking-wide text-cream lg:hidden"
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? (
              <>
                <path d="M5 5l14 14" />
                <path d="M19 5L5 19" />
              </>
            ) : (
              <>
                <path d="M3 6h18" />
                <path d="M3 12h18" />
                <path d="M3 18h18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* ------------------------------------------------- Mobile drawer */}
      {/* Sub-pages render as an indented list rather than a collapsing
          accordion — fewer taps, nothing hidden behind a second interaction. */}
      <div id="mobile-nav" hidden={!open} className="border-t border-cream/15 bg-purple-950 lg:hidden">
        <nav aria-label="Main (mobile)" className="container-page max-h-[75vh] overflow-y-auto py-2">
          <ul className="divide-y divide-cream/10">
            {nav.map((item) => (
              <li key={item.href} className="py-3.5">
                <Link href={item.href} aria-current={isActive(item.href) ? "page" : undefined}>
                  <span
                    className={`font-serif text-lg ${isActive(item.href) ? "text-salmon-400" : "text-cream"}`}
                  >
                    {item.label}
                  </span>
                  {item.description ? (
                    <span className="mt-0.5 block text-sm text-cream/60">{item.description}</span>
                  ) : null}
                </Link>

                {item.children?.length ? (
                  <ul className="mt-3 space-y-2 border-l-2 border-salmon-500/40 pl-4">
                    {item.children.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          aria-current={isActive(child.href) ? "page" : undefined}
                          className={`block text-base ${
                            isActive(child.href) ? "text-salmon-400" : "text-cream/80"
                          }`}
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
