import type { Metadata } from "next";
import Image from "next/image";
import { getPage, type SponsorshipTier } from "@/lib/content";
import { getFundsWithTotals, getGivingTimeline, getSingleFund } from "@/lib/giving";
import { foundationFunds } from "@/lib/funds";
import { giveHref, tierMemoDetail } from "@/lib/memo";
import { getCumulativeTotals, getWishlist, sheetsConfigured } from "@/lib/sheets";
import { Markdown } from "@/lib/markdown";
import { PageHero } from "@/components/PageHero";
import { GivingAvenues, type Avenue } from "@/components/GivingAvenues";
import { WishlistList } from "@/components/WishlistList";
import { ProgressBar } from "@/components/FundProgress";
import { ButtonLink, CrestRule, Section, SectionHead, Todo } from "@/components/ui";

/*
 * 300 seconds, matching REVALIDATE_SECONDS in src/lib/sheets.ts.
 *
 * MUST be a literal. Next.js reads route segment config statically at build
 * time, so an imported constant (or any expression) is rejected with "Invalid
 * segment configuration export detected" — it cannot evaluate the import. The
 * duplication is forced by the framework; keep it in step with src/lib/sheets.ts by hand.
 */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Giving",
  description:
    "Support the Alpha Mu Chapter of Phi Gamma Delta at Texas A&M — the chapter wishlist, tailgate sponsorships, and our memorial scholarships and philanthropy.",
};

/**
 * GIVING — one page, three avenues.
 *
 * ── WHY THIS ABSORBED THE THREE FUND PAGES ──────────────────────────────────
 * Giving used to be an overview plus three subpages. A donor deciding where to
 * put their money had to open all four and hold the comparison in their head,
 * and the overview itself opened with three views of one aggregate figure —
 * how the chapter is doing in total, which is a question the chapter asks
 * itself rather than one a visitor arrives with.
 *
 * Now the three avenues sit side by side with their own progress, and each
 * one's detail follows in full below. Nothing is behind a click that used to
 * be on a page of its own.
 *
 * The three fund subpages were deleted in August 2026 once the chapter
 * confirmed nothing was lost. What remains under Donations is this page, How to
 * Give, and the Donor Wall.
 *
 * The anchors below are what the three columns link to. Keep them in step with
 * the `anchor` values in the avenues array.
 */

const CAMPAIGN_BLURB =
  "Give to a specific project, or provide a general donation that supports the entire Chapter Wishlist.";
const TAILGATE_BLURB =
  "Supports the food, drinks, and music at every home game — with recognition on the shirts and the Donor Wall.";
const FOUNDATIONS_BLURB =
  "The memorial scholarships the chapter carries, and the causes it raises for as a brotherhood.";

export default async function GivingPage() {
  const page = getPage("donations");
  const foundations = foundationFunds();

  /*
   * Every figure the page needs, in one pass. The sheet layer caches per tab,
   * so the repeated tabs across these calls cost one request each, not one per
   * call — see the note on REVALIDATE_SECONDS in sheets.ts.
   */
  const [
    wishlistItems,
    general,
    tailgate,
    foundationTotals,
    campaignTimeline,
    tailgateTimeline,
    foundationTimeline,
    foundationCards,
  ] = await Promise.all([
    getWishlist(),
    getSingleFund("general"),
    getSingleFund("tailgate"),
    // Philanthropy & Scholarships reads as one avenue to a visitor even though
    // the treasurer tracks it as four separate tabs.
    getCumulativeTotals(foundations),
    getGivingTimeline("general"),
    getGivingTimeline("tailgate"),
    getGivingTimeline(foundations.map((f) => f.key)),
    getFundsWithTotals(foundations),
  ]);

  const avenues: Avenue[] = [
    {
      key: "campaign",
      title: "Fundraising Campaign",
      blurb: CAMPAIGN_BLURB,
      anchor: "#campaign",
      totals: general?.totals ?? null,
      timeline: campaignTimeline,
    },
    {
      key: "tailgate",
      title: "Tailgate Sponsorships",
      blurb: TAILGATE_BLURB,
      anchor: "#tailgate",
      totals: tailgate?.totals ?? null,
      timeline: tailgateTimeline,
    },
    {
      key: "foundations",
      title: "Philanthropy & Scholarships",
      blurb: FOUNDATIONS_BLURB,
      anchor: "#foundations",
      totals: foundationTotals,
      timeline: foundationTimeline,
    },
  ];

  // Sponsorship tiers live on this page's own content file now that the
  // tailgate subpage is gone. See SponsorshipTier in src/lib/content.ts.
  const tiers = (page.tiers as SponsorshipTier[] | undefined) ?? [];

  return (
    <>
      {/* No button in the hero. It pointed at the Give page, which every
          wishlist row, sponsorship tier, and fund below now links to directly —
          an ask above the three avenues invited a reader to act before they had
          seen anything to choose between. */}
      <PageHero
        eyebrow="Give back"
        title={(page.title as string) || "Giving"}
        intro={page.intro as string}
      />

      {/* ------------------------------------------------- THE THREE AVENUES */}
      <Section tone="tint">
        <SectionHead
          eyebrow="Three ways to support the chapter"
          title="Where your gift can go"
          intro="Each area tracks its own goal. Pick the one that matters to you — donations or sponsorships of $500 or more receive recognition on our Donor Wall."
        />

        <GivingAvenues avenues={avenues} />

        {!sheetsConfigured ? (
          <Todo label="Google Sheet not connected">
            Figures come from the chapter sheet. Add <code>GOOGLE_SHEETS_API_KEY</code> and{" "}
            <code>GOOGLE_SHEETS_ID</code> to <code>.env.local</code>.
          </Todo>
        ) : null}
      </Section>

      {/* ------------------------------------------------------- 1. CAMPAIGN */}
      <Section id="campaign">
        <SectionHead
          eyebrow="Fundraising Campaign"
          title="What the chapter is asking for"
          intro="Gifts support individual projects or the entire Chapter Wishlist. The Chapter decides together on which projects come first."
        />

        <div className="mt-8">
          {wishlistItems.length > 0 ? (
            <WishlistList items={wishlistItems} compact />
          ) : (
            <div className="rounded-sm border border-dashed border-purple-900/25 bg-white/60 p-8 text-center">
              <p className="font-serif text-xl text-purple-900">
                {sheetsConfigured ? "No wishlist items right now" : "Wishlist not connected yet"}
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink/70">
                {sheetsConfigured
                  ? "Check back soon — the chapter updates this list as needs come up."
                  : "Add the Google Sheet credentials and the list appears here automatically."}
              </p>
            </div>
          )}
        </div>
      </Section>

      {/* ------------------------------------------------------- 2. TAILGATE */}
      <Section id="tailgate" tone="tint">
        <SectionHead
          eyebrow="Tailgate Sponsorships"
          title="Sponsorship tiers"
          intro="Everyone loves a great tailgate. Tailgate sponsors support all of what we do. They let the chapter test new ideas, keep our tailgates fresh, and improve access for our members, families, alumni, and all our other guests. Every sponsorship in the tiers below receives a free Tailgate T-Shirt upon release."
        />

        {tiers.length > 0 ? (
          <ul className="mt-8 space-y-3">
            {tiers.map((tier) => (
              <li
                key={tier.amount}
                className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-sm bg-white p-5 ring-1 ring-purple-900/10 sm:p-6"
              >
                <span className="shrink-0 font-serif text-2xl text-salmon-600">{tier.amount}</span>
                <p className="min-w-0 flex-1 text-ink/80">{tier.description}</p>
                {/* Carries the tier figure, so the Give page reads
                    "Tailgate Sponsorship - $500" without the donor composing it. */}
                <ButtonLink
                  href={giveHref("tailgate", tierMemoDetail(tier.amount))}
                  tone="accent"
                  className="w-full shrink-0 sm:w-auto"
                >
                  Give
                </ButtonLink>
              </li>
            ))}
          </ul>
        ) : (
          <Todo label="No sponsorship tiers entered">
            Add them under Donation pages → Tailgate → Sponsorship tiers in the admin.
          </Todo>
        )}
      </Section>

      {/* --------------------------------------------------- 3. FOUNDATIONS */}
      <Section id="foundations">
        <SectionHead
          eyebrow="Philanthropy & Scholarships"
          title="The funds the chapter carries"
          intro="All donations are collected by Phi Gamma Delta and passed to the intended recipient. Phi Gamma Delta at Texas A&M is a private fraternal organization and gifts are not tax-deductible."
        />

        <ul className="mt-8 space-y-4">
          {foundationCards.map(({ fund, totals }) => (
            <li
              key={fund.key}
              className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-sm bg-white p-5 ring-1 ring-purple-900/10 sm:flex-nowrap sm:p-6"
            >
              {fund.image ? (
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-sm bg-purple-900/5">
                  <Image
                    src={fund.image}
                    alt={fund.label}
                    fill
                    sizes="80px"
                    // AFSP is a logo on white and must not be cropped; the
                    // memorial photographs are portraits with a measured focal
                    // point. Same split as the fund cards on the old page.
                    className={fund.key === "philanthropy" ? "object-contain p-2" : "object-cover"}
                    style={
                      fund.key === "philanthropy"
                        ? undefined
                        : { objectPosition: fund.imagePosition ?? "center" }
                    }
                  />
                </div>
              ) : null}

              <div className="min-w-0 flex-1">
                {fund.type ? (
                  <span className="inline-block rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-purple-900">
                    {fund.type}
                  </span>
                ) : null}
                <h3 className="mt-2 text-xl text-purple-900">{fund.label}</h3>
                <p className="mt-2 text-sm text-ink/80">{fund.description}</p>
                {totals ? (
                  <div className="mt-4 max-w-sm">
                    <ProgressBar raised={totals.raised} goal={totals.goal} />
                  </div>
                ) : null}
              </div>

              {/* Each memorial fund routes to its own memo, e.g.
                  "Philanthropy - Sarraf Scholarship". */}
              <ButtonLink
                href={giveHref(fund.key)}
                tone="accent"
                className="w-full shrink-0 sm:w-auto"
              >
                Give
              </ButtonLink>
            </li>
          ))}
        </ul>

        {/* The chapter's own words on why it gives, with AFSP's mark. Sits here
            rather than at the top because it explains this avenue, not the page.

            Separated by a rule rather than promoted into its own <Section>: it
            belongs to Philanthropy & Scholarships, and giving it a tinted band
            of its own would read as a fourth giving avenue. */}
        {page.body ? (
          <>
            <CrestRule className="mt-12 text-purple-900" />
            <div className="mt-12 grid gap-10 lg:grid-cols-[1.4fr_0.6fr] lg:items-center">
            <div className="max-w-3xl text-lg">
              <Markdown>{page.body as string}</Markdown>
            </div>

            {/*
              NOT a link to afsp.org. The chapter pools its philanthropy and
              sends one gift in Alpha Mu's name and takes pride in that figure;
              a click-through invites a reader to give directly instead.

              The source file is a 1620x1620 square whose logo occupies only the
              middle 38% of the height. Measured, not guessed: content runs 31%
              to 69%, and a 7:3 box shows 28.6%–71.4%. Cropped in CSS because
              funds.ts still uses the square version above, where `object-contain`
              needs the padding this crops away.
            */}
            <figure className="rounded-sm bg-white p-6 ring-1 ring-purple-900/10 sm:p-8">
              <div className="relative aspect-7/3 w-full">
                <Image
                  src="/donations/afsp.png"
                  alt="American Foundation for Suicide Prevention"
                  fill
                  sizes="(min-width: 1024px) 30vw, 90vw"
                  className="object-cover object-center"
                />
              </div>
              <figcaption className="mt-5 border-t border-purple-900/10 pt-4 text-sm text-ink/70">
                Philanthropy gifts are pooled and sent to AFSP in the chapter&rsquo;s name.
              </figcaption>
            </figure>
            </div>
          </>
        ) : null}
      </Section>

      {/* ------------------------------------------------------------ CLOSE */}
      {/*
        The Donor Wall only.

        A "Ready to give?" panel used to sit here, from when the page was an
        overview that pointed elsewhere to act. Every wishlist row, every
        sponsorship tier, and every fund above now carries its own Give button,
        so a final catch-all ask adds a fourth route to a page that already
        offers one beside each thing a reader might choose. Recognition is the
        one thing above that has no button of its own, so it gets the close.
      */}
      <Section tone="tint">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-sm bg-white p-6 ring-1 ring-purple-900/15 sm:p-8">
          <p className="max-w-xl text-ink/80">
            Behind the numbers, see the list of our recognized donors.
          </p>
          <ButtonLink href="/donations/donors" tone="outline" className="shrink-0">
            See our list of recognized donors
          </ButtonLink>
        </div>
      </Section>
    </>
  );
}
