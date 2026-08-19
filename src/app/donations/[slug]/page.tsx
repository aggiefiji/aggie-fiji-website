import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDonationPages } from "@/lib/content";
import { Markdown } from "@/lib/markdown";
import { ButtonLink, Section, Todo, isTodo } from "@/components/ui";
import { giving } from "@/integrations.config";

/**
 * DONATION SUBPAGES — the extensible slot.
 *
 * Every file in content/donations/ becomes a page here AND an entry in the
 * "Donations & Philanthropy" nav dropdown, with no routing or nav code to
 * touch. Whatever the chapter's fund structure turns out to be — annual fund,
 * scholarships, memorial gifts, a capital campaign — it is a JSON file each.
 */

/**
 * These two have purpose-built routes — giving instructions and the Donor Wall
 * plaque — which take precedence over this dynamic one. Everything else in
 * content/donations/ still gets a generic page here for free.
 *
 * The wishlist, tailgate and foundations entries were removed in August 2026
 * when those three pages folded into /donations and their content files were
 * deleted with them.
 *
 * KEEP THIS IN STEP WITH THE FOLDERS UNDER src/app/donations/. A slug with its
 * own folder but no entry here gets built twice — once as its real page and
 * once as a generic one from `generateStaticParams` below. Next serves the
 * static route, so the site looks right and the duplicate is invisible in the
 * browser; the only place it shows up is `next build`, which listed
 * /donations/donors under both routes.
 */
const RICH_ROUTES = new Set(["give", "donors"]);

export function generateStaticParams() {
  return getDonationPages()
    .filter((p) => !RICH_ROUTES.has(p.slug))
    .map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sub = getDonationPages().find((p) => p.slug === slug);
  return { title: sub ? sub.title : "Donations" };
}

export default async function DonationSubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sub = getDonationPages().find((p) => p.slug === slug);
  if (!sub || RICH_ROUTES.has(slug)) notFound();

  return (
    <Section>
      <Link
        href="/donations"
        className="text-sm font-semibold uppercase tracking-wide text-salmon-600 underline underline-offset-4"
      >
        ← Donations &amp; Philanthropy
      </Link>

      <div className="mt-8 max-w-3xl">
        <h1 className="text-4xl text-purple-900 sm:text-5xl">{sub.title}</h1>
        {sub.summary && !isTodo(sub.summary) ? (
          <p className="mt-5 text-lg text-ink/80">{sub.summary}</p>
        ) : null}

        <div className="mt-8 text-lg">
          {isTodo(sub.body) ? <Todo label={`Copy needed for ${sub.title}`}>{sub.body}</Todo> : <Markdown>{sub.body}</Markdown>}
        </div>

        {/* A fund may carry its own giving link. Still gated on the global
            kill switch — one place turns all of this on. */}
        {giving.enabled && sub.externalUrl ? (
          <ButtonLink href={sub.externalUrl} tone="accent" external className="mt-10">
            Give to {sub.title}
          </ButtonLink>
        ) : (
          <ButtonLink href="/contact" tone="outline" className="mt-10">
            Contact the chapter to give
          </ButtonLink>
        )}
      </div>
    </Section>
  );
}
