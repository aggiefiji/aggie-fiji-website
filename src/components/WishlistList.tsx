"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { WishlistItem } from "@/lib/sheet-types";
import { giveHref } from "@/lib/memo";

/**
 * The chapter wishlist, as a list of rows.
 *
 * ── WHY ROWS AND NOT CARDS ──────────────────────────────────────────────────
 * This was a card grid. Reviewed by a parent in August 2026 who came to the
 * page looking specifically for the wishlist, and cards put three items on a
 * screen where rows put eight or nine. Someone deciding what to fund wants to
 * compare the whole list, and a grid makes them scroll to do it. The row keeps
 * the three things that drive that decision on one line — what it is, what it
 * costs, and how to act — and pushes the long description behind "Read more"
 * rather than truncating it into every card.
 *
 * The items are fetched on the SERVER and passed in as props; this component
 * only opens the detail dialog, so every row is in the HTML and the page reads
 * fine with JavaScript disabled — "Read more" stops working, and the Give link
 * still does, because it is a real link carrying its destination in the URL.
 */

/** Compact row buttons. The site's ButtonLink is sized for page-level calls to
 *  action and is far too tall to sit inside a list row. */
const ROW_BUTTON =
  "rounded-sm border-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors duration-200";

export function WishlistList({
  items,
  /**
   * Drops the thumbnail and tightens the rows. Used on /donations, where the
   * wishlist is one of three giving avenues sharing the page and has to stay
   * scannable rather than dominate it. The wishlist's own page keeps the
   * roomier rows, thumbnails included.
   */
  compact = false,
}: {
  items: WishlistItem[];
  compact?: boolean;
}) {
  const [active, setActive] = useState<WishlistItem | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [active]);

  function open(item: WishlistItem) {
    setActive(item);
    setImageIndex(0);
  }

  return (
    <>
      {/*
        No category chips and no filter bar. Readers found them noise on a list
        this short — a filter earns its place when scanning is genuinely hard,
        and eight or nine rows ordered by price is not that. The ordering is the
        organisation now; see getWishlist() in sheets.ts, which sorts most
        expensive first so the sheet's own row order never reaches the page.
      */}
      <ul className="mt-8 space-y-3">
        {items.map((item) => {
          /*
           * "Read more" only appears when there is actually more: a row with no
           * description and a single image opens a dialog showing what the row
           * already said. A button that does nothing useful teaches people the
           * buttons here are not worth pressing.
           */
          const hasDetail = Boolean(item.description) || item.images.length > 1;

          return (
            <li
              key={`${item.category}-${item.name}`}
              className={`rounded-sm bg-white ring-1 ring-purple-900/10 transition-shadow hover:shadow-md ${
                compact ? "p-3 sm:p-4" : "p-4 sm:p-5"
              }`}
            >
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                {compact ? null : item.images[0] ? (
                  // Images come from arbitrary URLs typed into the chapter's
                  // sheet, so next/image optimisation is deliberately skipped.
                  // referrerPolicy stops the visitor's current page URL being
                  // handed to whatever host an officer pasted in.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.images[0]}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-14 w-14 shrink-0 rounded-sm bg-purple-900/5 object-cover sm:h-16 sm:w-16"
                  />
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded-sm bg-purple-900/8 sm:h-16 sm:w-16" />
                )}

                <div className="min-w-0 flex-1">
                  <h3 className={compact ? "text-base text-purple-900" : "text-lg text-purple-900"}>
                    {item.name}
                  </h3>
                </div>

                {item.cost ? (
                  <span
                    className={`shrink-0 font-serif text-salmon-600 ${
                      compact ? "text-lg" : "text-xl"
                    }`}
                  >
                    {item.cost}
                  </span>
                ) : null}

                {/* Full width on phones so the buttons drop to their own line
                    rather than crushing the name into two characters. */}
                <div className="flex w-full shrink-0 gap-2 sm:w-auto">
                  {hasDetail ? (
                    <button
                      type="button"
                      onClick={() => open(item)}
                      aria-haspopup="dialog"
                      className={`${ROW_BUTTON} flex-1 border-purple-900 text-purple-900 hover:bg-purple-900 hover:text-cream sm:flex-none`}
                    >
                      Read more
                    </button>
                  ) : null}
                  {/*
                    A real link, not a handler — it works with JavaScript off,
                    and it opens in the same tab because giving is a step in
                    this journey rather than a detour. It carries this item's
                    memo name, so the Give page shows "Fundraising Campaign -
                    Car Port" already filled in rather than asking the donor to
                    compose it.
                  */}
                  <Link
                    href={giveHref("general", item.memoName)}
                    className={`${ROW_BUTTON} flex-1 border-salmon-500 bg-salmon-500 text-center text-white hover:border-salmon-600 hover:bg-salmon-600 sm:flex-none`}
                  >
                    Give
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* ------------------------------------------------------------ dialog */}
      {active ? (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-purple-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={active.name}
          onClick={() => setActive(null)}
        >
          <div
            className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-sm bg-cream"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              {active.images[imageIndex] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={active.images[imageIndex]}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="max-h-80 w-full bg-purple-900/5 object-contain"
                />
              ) : null}

              <button
                type="button"
                onClick={() => setActive(null)}
                aria-label="Close"
                className="absolute right-3 top-3 rounded-full bg-purple-950/80 px-3 py-1.5 text-sm font-semibold text-cream hover:bg-purple-950"
              >
                ✕
              </button>

              {active.images.length > 1 ? (
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
                  {active.images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setImageIndex(i)}
                      aria-label={`Photo ${i + 1}`}
                      aria-current={i === imageIndex}
                      className={`h-2.5 w-2.5 rounded-full ${
                        i === imageIndex ? "bg-salmon-500" : "bg-cream/70"
                      }`}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            <div className="p-6 sm:p-8">
              {/* Category chip removed here too, so the detail view and the row
                  it opened from describe an item the same way. */}
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="font-serif text-2xl text-purple-900">{active.name}</h2>
                {active.cost ? (
                  <span className="shrink-0 font-serif text-2xl text-salmon-600">{active.cost}</span>
                ) : null}
              </div>
              {active.description ? (
                <p className="mt-3 text-ink/80">{active.description}</p>
              ) : null}

              {/* The dialog is a dead end without this — someone who read the
                  detail and decided to fund it should not have to close the
                  overlay and find the row again. */}
              <Link
                href={giveHref("general", active.memoName)}
                className={`${ROW_BUTTON} mt-6 inline-block border-salmon-500 bg-salmon-500 text-white hover:border-salmon-600 hover:bg-salmon-600`}
              >
                Give to this
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
