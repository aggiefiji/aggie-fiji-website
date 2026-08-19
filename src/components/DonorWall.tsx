import type { DonorName } from "@/lib/sheet-types";

/**
 * The Donor Wall, rendered as a plaque rather than a list.
 *
 * The page's own copy says "this page is simply that wall, online", so it
 * should look like one: names set in the serif face, centred, on the chapter
 * purple, over the Alpha Mu monogram. A bordered three-column table reads as a
 * database export — accurate, but it turns recognition into an inventory.
 *
 * Alphabetical within each group, and never ordered by amount: the wall does
 * not rank people, and ordering by size of gift would leak the one thing the
 * page deliberately does not publish.
 */
/**
 * Sort key: the name with any leading article removed.
 *
 * Sorting the raw string clusters every "The … Family" under T, so a company
 * name lands miles from the families it should sit beside — "Baker Roofing"
 * would come before "The Adams Family". A reader scanning for a name looks
 * under A, not under T.
 */
const sortKey = (name: string) => name.replace(/^(the|a|an)\s+/i, "").toLowerCase();

export function DonorWall({ donors }: { donors: DonorName[] }) {
  if (donors.length === 0) return null;

  const grouped = donors.some((d) => d.group?.trim());
  const groups = new Map<string, DonorName[]>();
  for (const donor of donors) {
    const key = grouped ? donor.group?.trim() || "Chapter Donors" : "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(donor);
  }

  return (
    <div className="relative overflow-hidden rounded-sm bg-purple-900 px-6 py-12 text-cream sm:px-12 sm:py-16">
      {/* The chapter's own mark, not stock decoration — same watermark the
          page heroes use, so the plaque reads as part of the site. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-center bg-no-repeat opacity-[0.06]"
        style={{
          backgroundImage: "url(/brand/fiji-monogram.png)",
          backgroundSize: "min(70%, 460px) auto",
        }}
      />

      <div className="relative">
        {[...groups.entries()].map(([groupName, entries], i) => (
          <section key={groupName || "all"} className={i > 0 ? "mt-14" : ""}>
            {groupName ? (
              <h2 className="text-center">
                <span className="eyebrow text-salmon-400">{groupName}</span>
              </h2>
            ) : null}

            {/*
              Flex-wrap rather than a grid, purely so the last row centres.
              A grid pins every item to a column track, which leaves a trailing
              one or two names hanging on the left with a hole beside them. With
              flex-wrap + justify-center each line centres independently: a full
              line of three still lines up in columns because the widths are
              fixed, a leftover pair sits centred in the gaps above it, and a
              single leftover name lands dead centre.

              Widths are the column width minus its share of the gap
              (gap-x-10 = 2.5rem), so three-up and two-up both tile exactly.
            */}
            <ul
              className={`flex flex-wrap justify-center gap-x-10 gap-y-5 ${groupName ? "mt-8" : ""}`}
            >
              {[...entries]
                .sort((a, b) => sortKey(a.name).localeCompare(sortKey(b.name)))
                .map((donor) => (
                  <li
                    key={`${groupName}-${donor.name}`}
                    className="w-full text-center font-serif text-lg leading-snug text-cream sm:w-[calc(50%-1.25rem)] sm:text-xl lg:w-[calc(33.333%-1.667rem)]"
                  >
                    {donor.name}
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
