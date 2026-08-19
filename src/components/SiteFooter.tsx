import Image from "next/image";
import Link from "next/link";
import { flattenNav, withDonationPages } from "@/lib/nav";
import { getDonationPages, getSiteSettings } from "@/lib/content";
import { isTodo } from "@/components/ui";

/** Display order, and the only keys the footer will render. */
const socialLabels: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X",
  linkedin: "LinkedIn",
  youtube: "YouTube",
};

export function SiteFooter() {
  const site = getSiteSettings();
  const year = new Date().getFullYear();
  const nav = withDonationPages(getDonationPages());

  /*
   * Only the accounts the chapter has actually given us, in the fixed order
   * above rather than JSON key order — so adding one later cannot reshuffle the
   * row. An officer clearing a field removes the icon; the site never links to
   * a dead profile.
   */
  const socials = Object.keys(socialLabels)
    .map((key) => [key, (site.social?.[key as keyof typeof site.social] ?? "").trim()] as const)
    .filter(([, url]) => url.length > 0 && !isTodo(url));

  /*
   * The Lodge, in full — street, city, state, zip. Read from site.json rather
   * than typed in here: if the Lodge ever moves, an officer changes it in one
   * place and every surface follows.
   *
   * This is the Lodge, never the P.O. box. The mailing address is where cheques
   * go and it lives on the Contact page under its own label; putting the two
   * side by side in a footer is how a donor posts a cheque to a house.
   */
  const lodgeAddress =
    site.contact.lodgeAddress && !isTodo(site.contact.lodgeAddress)
      ? site.contact.lodgeAddress.trim()
      : "";

  // The nickname is what alumni call the chapter, so it names the inbox too.
  const inboxLabel = !isTodo(site.chapterNickname)
    ? `${site.chapterNickname} Inbox`
    : "Chapter Inbox";

  return (
    <footer className="bg-purple-950 text-cream">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Image
            src="/brand/fiji-monogram.png"
            alt="Texas A&M Phi Gamma Delta monogram"
            width={628}
            height={442}
            className="h-14 w-auto"
          />
          <p className="mt-4 max-w-xs font-serif text-lg text-cream/90">
            {site.tagline || "Not for College Days Alone."}
          </p>
          <p className="mt-2 text-sm text-cream/60">
            {site.chapterName} · {site.university}
          </p>

          {/* Handles live in content/site.json → social, editable in the CMS.
              Nothing renders until real URLs are added. */}
          {socials.length > 0 ? (
            <ul className="mt-5 flex flex-wrap gap-3 text-sm">
              {socials.map(([key, url]) => (
                <li key={key}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-sm border border-cream/30 px-3 py-1.5 hover:bg-cream hover:text-purple-950"
                  >
                    {socialLabels[key] ?? key}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Full site map — every page, including dropdown children, in one
            flat list. Nothing on this site is reachable only via a hover. */}
        <nav aria-label="Footer">
          <h2 className="eyebrow text-salmon-400">Explore</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {flattenNav(nav).map((item) => (
              <li key={item.href} className={item.href.split("/").length > 2 ? "pl-4" : ""}>
                <Link href={item.href} className="text-cream/75 hover:text-cream hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="eyebrow text-salmon-400">Get in touch</h2>
          {/* One inbox, listed once. This block used to print the same address
              twice, labelled "Alumni" and "General", which implied two
              destinations the chapter does not have. */}
          <ul className="mt-4 space-y-2 text-sm text-cream/75">
            {!isTodo(site.contact.email) ? (
              <li>
                {inboxLabel}:{" "}
                <a className="underline hover:text-cream" href={`mailto:${site.contact.email}`}>
                  {site.contact.email}
                </a>
              </li>
            ) : null}
            {/* whitespace-pre-line keeps the line break stored in site.json, so
                the address reads as an address rather than one long run-on. */}
            {lodgeAddress ? <li className="whitespace-pre-line">{lodgeAddress}</li> : null}
            <li>
              <Link href="/contact" className="underline hover:text-cream">
                Contact Page
              </Link>
            </li>
          </ul>

          <h2 className="eyebrow mt-8 text-salmon-400">Phi Gamma Delta</h2>
          <ul className="mt-4 space-y-2 text-sm text-cream/75">
            <li>
              <a
                href="https://phigam.org"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-cream"
              >
                International Fraternity
              </a>
            </li>
          </ul>
          {/* 1848 is hardcoded, deliberately. There were `foundedChapter`
              and `foundedNational` fields in site.json and the CMS that
              rendered nowhere at all — an officer could fill in the chapter's
              founding year and watch nothing change anywhere on the site. Both
              were deleted in August 2026 rather than wired up: the chapter was
              asked and chose not to publish a founding year, and the national
              date has not moved since 1848. If a founding year is ever wanted,
              add the field AND the markup in the same change. */}
          <p className="mt-5 text-xs leading-relaxed text-cream/50">
            Founded 1848 at Jefferson College. This site is maintained by the active chapter and is
            not an official publication of Texas A&amp;M University.
          </p>
        </div>
      </div>

      <div className="border-t border-cream/10">
        {/* The /admin URL used to be printed on the right here. It is an
            officer tool sitting on a page read by alumni and parents, and
            publishing it draws attention to the one screen holding a token with
            write access to the site repo. Officers are told where it is in the
            README and at handover — the people who need it already know. */}
        <div className="container-page py-5 text-xs text-cream/50">
          <p>
            © {year} {site.chapterName} · {site.university}
          </p>
        </div>
      </div>
    </footer>
  );
}
