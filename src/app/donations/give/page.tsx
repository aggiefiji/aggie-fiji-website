import type { Metadata } from "next";
import Image from "next/image";
import { getDonationPages, getPage, type SponsorshipTier } from "@/lib/content";
import { getWishlist } from "@/lib/sheets";
import { resolveMemo, tierMemoDetail } from "@/lib/memo";
import { Markdown } from "@/lib/markdown";
import { PageHero } from "@/components/PageHero";
import { GiveMemo } from "@/components/GiveMemo";
import { ButtonLink, Section, SectionHead, isTodo } from "@/components/ui";

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

export const metadata: Metadata = {
  title: "How to Give",
  description:
    "Give to the Alpha Mu Chapter of Phi Gamma Delta at Texas A&M by Venmo, Zelle, or check by mail.",
};

/**
 * HOW TO GIVE — two steps.
 *
 * ── WHY IT WAS REBUILT ──────────────────────────────────────────────────────
 * This was three steps, and the first was a table of every fund asking the
 * donor to look up their own memo line. That is the chapter's filing system
 * presented as a task: the donor had already said what they wanted to support
 * by pressing Give, and was then asked to say it again in the chapter's
 * vocabulary. People who guess wrong become mystery deposits.
 *
 * Now the Give buttons carry their destination in the URL and this page just
 * states the answer. Two steps: tell us who you are, then send it.
 *
 * Step order is deliberate. The form is first because it is the step donors
 * skip — once the money has left, the job feels done, and a gift with no name
 * attached is the one the treasurer cannot thank or spell correctly on the
 * Donor Wall.
 */
export default async function GivePage({
  searchParams,
}: {
  searchParams: Promise<{ fund?: string; detail?: string }>;
}) {
  const params = await searchParams;
  const page = getDonationPages().find((p) => p.slug === "give");
  const pay = page?.payment;
  const formUrl = page?.donationFormUrl;

  /*
   * Everything the chapter has actually published that a memo detail may refer
   * to. The URL is untrusted input — see the note in src/lib/memo.ts — so a
   * detail is only honoured if it appears here.
   */
  const [wishlist] = await Promise.all([getWishlist()]);
  const tiers = (getPage("donations").tiers as SponsorshipTier[] | undefined) ?? [];

  const validDetails =
    params.fund === "tailgate"
      ? tiers.map((t) => tierMemoDetail(t.amount))
      : wishlist.map((w) => w.memoName);

  const resolved = resolveMemo(params.fund, params.detail, validDetails);

  return (
    <>
      <PageHero eyebrow="Make a gift" title={page?.title || "How to Give"} intro={page?.summary} />

      <Section tone="tint">
        {page?.body ? (
          <div className="mb-10 max-w-3xl text-lg">
            <Markdown>{page.body}</Markdown>
          </div>
        ) : null}

        {/* ---------------------------------------------------- STEP 1: FORM */}
        {/* Hidden entirely if no URL is set rather than linking nowhere — and
            if it is hidden, the numbering below has to move up with it. */}
        {formUrl && !isTodo(formUrl) ? (
          <>
            <SectionHead
              eyebrow="Step 1"
              title="Tell us who the gift is from"
              intro="A short form with your name and contact details. It is how the treasurer knows who to thank, and how your name is spelled on the Donor Wall."
            />
            <div className="mt-8 rounded-sm bg-white p-6 ring-1 ring-purple-900/15 sm:p-8">
              <ButtonLink href={formUrl} tone="accent" external>
                Open the donation form
              </ButtonLink>
              <p className="mt-4 text-sm text-ink/60">
                Opens in a new tab. Come back here when you are done.
              </p>
            </div>
          </>
        ) : null}

        {/* ---------------------------------------------------- STEP 2: SEND */}
        <div className={formUrl && !isTodo(formUrl) ? "mt-14" : ""}>
          <SectionHead
            eyebrow={formUrl && !isTodo(formUrl) ? "Step 2" : "How to send it"}
            title="Send your gift"
            intro="All three platforms below reach the same chapter account. The memo is what tells the treasurer which fund your gift belongs to. The site defaults to the General Fund. You can donate to a particular item by selecting it on the Giving Overview page."
          />

          <div className="mt-8">
            <GiveMemo resolved={resolved} />
          </div>

          <ul className="mt-6 grid gap-5 md:grid-cols-3">
            {/* Venmo */}
            <li className="flex flex-col rounded-sm bg-white p-6 text-center ring-1 ring-purple-900/10">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-purple-100 font-serif text-xl text-purple-900">
                V
              </span>
              <h3 className="mt-4 text-xl text-purple-900">Venmo</h3>
              {pay?.venmoQr ? (
                <Image
                  src={pay.venmoQr}
                  alt="Venmo QR code for the chapter account"
                  width={660}
                  height={657}
                  className="mx-auto mt-4 h-auto w-40 rounded-sm"
                />
              ) : null}
              <p className="mt-4 flex-1 text-sm text-ink/75">
                Scan the code, or search for{" "}
                <strong className="text-purple-900">
                  {pay?.venmoHandle || "the chapter account"}
                </strong>
                .
              </p>
            </li>

            {/* Zelle */}
            <li className="flex flex-col rounded-sm bg-white p-6 text-center ring-1 ring-purple-900/10">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-purple-100 font-serif text-xl text-purple-900">
                Z
              </span>
              <h3 className="mt-4 text-xl text-purple-900">Zelle</h3>
              {pay?.zelleQr ? (
                <Image
                  src={pay.zelleQr}
                  alt="Zelle QR code for the chapter account"
                  width={420}
                  height={539}
                  className="mx-auto mt-4 h-auto w-40 rounded-sm"
                />
              ) : null}
              {/* break-words because the address is the one string here long
                  enough to push this column wider than a phone. */}
              <p className="mt-4 flex-1 text-sm break-words text-ink/75">
                Scan from your banking app to send to{" "}
                <strong className="text-purple-900">{pay?.zelleName || "the chapter account"}</strong>
                {pay?.zelleEmail && !isTodo(pay.zelleEmail) ? (
                  <>
                    {" "}
                    (registered at the email:{" "}
                    <strong className="text-purple-900">{pay.zelleEmail}</strong>)
                  </>
                ) : null}
                .
              </p>
            </li>

            {/* Check */}
            <li className="flex flex-col rounded-sm bg-white p-6 text-center ring-1 ring-purple-900/10">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-purple-100 font-serif text-xl text-purple-900">
                ✉
              </span>
              <h3 className="mt-4 text-xl text-purple-900">Check by mail</h3>
              <div className="mt-4 flex-1 space-y-4 text-sm">
                <div>
                  <p className="eyebrow text-ink/50">Payable to</p>
                  <p className="mt-1 text-ink">{pay?.checkPayableTo}</p>
                </div>
                <div>
                  <p className="eyebrow text-ink/50">Mail to</p>
                  <p className="mt-1 whitespace-pre-line text-ink">{pay?.checkAddress}</p>
                </div>
              </div>
            </li>
          </ul>
        </div>

        {pay?.taxNote && !isTodo(pay.taxNote) ? (
          <p className="mx-auto mt-12 max-w-xl border-t border-purple-900/15 pt-6 text-center text-sm text-ink/60">
            {pay.taxNote}
          </p>
        ) : null}
      </Section>

      <Section>
        <div className="flex flex-wrap items-center justify-between gap-6">
          <SectionHead
            eyebrow="Not sure where to give?"
            title="See what each fund supports"
            intro="Every fund tracks its own goal and progress."
          />
          {/* shrink-0 here held this pair at their combined natural width —
              wider than a phone — so the whole page scrolled sideways and read
              as off-centre. They stack full width below sm and only refuse to
              shrink from sm up, where there is room for them. */}
          <div className="flex w-full flex-wrap gap-3 sm:w-auto sm:shrink-0">
            <ButtonLink href="/donations" tone="outline" className="w-full sm:w-auto">
              All giving options
            </ButtonLink>
            <ButtonLink href="/contact" tone="outline" className="w-full sm:w-auto">
              Ask the treasurer
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
