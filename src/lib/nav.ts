/**
 * SITE NAVIGATION — single source of truth.
 * The header, footer and sitemap all read from here.
 *
 * Structure: two plain links, two dropdowns, plus Home.
 * A parent with `children` is still a real page — clicking the label goes
 * there. The dropdown is additive, never the only way in.
 */
export interface NavItem {
  href: string;
  label: string;
  description?: string;
  children?: NavItem[];
  /**
   * First row of this item's dropdown, linking to the parent page itself.
   *
   * A chevron says "this opens a menu", which reads as "this is not a link" —
   * so a parent page that is genuinely clickable looks like a bare heading.
   * Naming it inside its own menu is the fix: it costs one row, needs no
   * hover, and works on touch where there is no hover at all.
   */
  overviewLabel?: string;
}

/**
 * Order mirrors the homepage — Events, then Donations, then Our Chapter —
 * and puts the highest-traffic page in the most clickable slot after Home.
 * The two dropdowns still sit adjacent, with plain links at either end.
 */
export const baseNav: NavItem[] = [
  {
    href: "/",
    label: "Home",
    description: "Chapter home",
  },
  {
    href: "/events",
    label: "Events",
    description: "Events, newsletters, and staying involved",
  },
  {
    href: "/donations",
    label: "Donations & Philanthropy",
    description: "Support the chapter and our service work",
    overviewLabel: "Giving overview",
    // Children are filled in at runtime from content/donations/*.json —
    // see withDonationPages() below. Add a file, get a dropdown entry.
    children: [],
  },
  {
    href: "/about",
    label: "Our Chapter",
    description: "The officers and photos from chapter life",
    overviewLabel: "About the chapter",
    children: [
      { href: "/gallery", label: "Gallery", description: "Photos from chapter life" },
    ],
  },
  {
    href: "/contact",
    label: "Contact",
    description: "Get in touch with a real person",
  },
];

/**
 * Builds the live nav by hanging donation subpages off the Donations item.
 *
 * This is a plain function rather than a file read so that `nav.ts` stays safe
 * to import from client components. The server layout reads the content and
 * passes the result down.
 */
export function withDonationPages(pages: { slug: string; title: string; summary?: string }[]): NavItem[] {
  return baseNav.map((item) =>
    item.href === "/donations"
      ? {
          ...item,
          children: pages.map((p) => ({
            href: `/donations/${p.slug}`,
            label: p.title,
            description: p.summary,
          })),
        }
      : item,
  );
}

/** Flat list of every top-level and child route, for the footer and sitemap. */
export function flattenNav(nav: NavItem[]): NavItem[] {
  return nav.flatMap((item) => [item, ...(item.children ?? [])]);
}
