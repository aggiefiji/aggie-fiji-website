import type { Metadata } from "next";
import { getDonationPages } from "@/lib/content";
import { getResolvedDonors } from "@/lib/donors";
import { DonorWall } from "@/components/DonorWall";
import { Markdown } from "@/lib/markdown";
import { PageHero } from "@/components/PageHero";
import { ButtonLink, EmptyState, Section, Todo } from "@/components/ui";

export const metadata: Metadata = {
  title: "Donor Wall",
  description:
    "The families and individuals recognized on the Alpha Mu Chapter Donor Wall for gifts of $500 or more.",
};

/**
 * THE DONOR WALL, ONLINE.
 *
 * Names come from the `Donor Wall` tab of the chapter sheet, falling back to
 * content/donations/donors.json — see src/lib/donors.ts. That tab holds names
 * and nothing else: the sheet is link-public, so an amount beside a name would
 * publish what each person gave. See getDonorWall() in sheets.ts for the rules
 * that keep the exception safe.
 *
 * No amounts are shown here either. A wall lists who gave, not what they gave.
 */
/*
 * ZERO — RENDER THIS PAGE ON EVERY REQUEST.
 *
 * It was 300, which made the page a static file rebuilt at most every five
 * minutes. That is the correct default for most sites and the wrong one here:
 * the treasurer's whole job on this page is publishing a number that just
 * changed, and being told "wait five minutes, then load it twice" is not an
 * answer anyone accepts.
 *
 * `revalidate = 0` is NOT `dynamic = "force-dynamic"`. force-dynamic also sets
 * fetchCache to force-no-store, which would strip the cache off every Google
 * call — roughly eight per page load, scaling with traffic, straight through
 * the Sheets quota of 300 requests a minute the first time a newsletter goes
 * out. `revalidate = 0` re-renders the page every request while explicitly
 * LEAVING fetches that set their own positive revalidate alone. The page is
 * always fresh; the sheet reads are still pooled. Do not "simplify" this to
 * force-dynamic.
 *
 * How fresh the figures are is therefore set by REVALIDATE_SECONDS in
 * src/lib/sheets.ts (60s), or immediately when the sheet's Apps Script trigger
 * calls /api/revalidate.
 *
 * MUST be a literal. Next.js reads route segment config statically at build
 * time, so an imported constant is rejected with "Invalid segment
 * configuration export detected" — it cannot evaluate the import.
 */
export const revalidate = 0;

export default async function DonorsPage() {
  const page = getDonationPages().find((p) => p.slug === "donors");
  const { donors, source } = await getResolvedDonors();

  return (
    <>
      <PageHero
        eyebrow="Thank you"
        title={page?.title || "Donor Wall"}
        intro={page?.summary}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/donations/give" tone="accent">
            Give to the chapter
          </ButtonLink>
          <ButtonLink href="/donations" tone="ghost">
            All giving options
          </ButtonLink>
        </div>
      </PageHero>

      <Section>
        {page?.body ? (
          <div className="max-w-3xl text-lg">
            <Markdown>{page.body}</Markdown>
          </div>
        ) : null}

        {donors.length > 0 ? (
          <div className="mt-10">
            <DonorWall donors={donors} />
          </div>
        ) : (
          <div className="mt-10">
            <EmptyState
              title="The wall is being updated"
              message="Names are added as gifts are received and confirmed."
            />
          </div>
        )}

        {/* Which source is live matters when a name is missing: the treasurer
            needs to know whether to edit the sheet or the JSON fallback. */}
        {process.env.NODE_ENV !== "production" ? (
          <p className="mt-8 text-xs uppercase tracking-wide text-ink/45">
            Dev only · names from{" "}
            {source === "sheet" ? "the Donor Wall sheet tab" : "content/donations/donors.json"}
          </p>
        ) : null}

        {donors.length === 0 ? (
          <Todo label="No donor names yet">
            Add a <code>Donor Wall</code> tab to the chapter sheet with columns{" "}
            <code>Name</code> and <code>Group</code> — names only, never amounts. Without that tab
            the page falls back to <code>content/donations/donors.json</code>. Leave{" "}
            <code>Group</code> blank until the chapter decides how to separate tailgate sponsors
            from campaign donors; blank renders one flat list.
          </Todo>
        ) : null}
      </Section>
    </>
  );
}
