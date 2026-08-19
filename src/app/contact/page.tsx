import type { Metadata } from "next";
import { getPage, getSiteSettings } from "@/lib/content";
import { PageHero } from "@/components/PageHero";
import { Section, SectionHead, Todo, isTodo } from "@/components/ui";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact the Alpha Mu Chapter of Phi Gamma Delta at Texas A&M — one chapter inbox, monitored by the President and Treasurer.",
};

/**
 * NOTHING ON THIS PAGE MAY SHIP AS PLACEHOLDER TEXT.
 *
 * The old site shipped Wix's stock "500 Terry Francois St." address and a stock
 * phone number, which is how a visitor learns a chapter does not maintain its
 * own site. Every value here is checked with isTodo(): real values render,
 * unfilled ones show a dev-only warning and nothing at all in production. A
 * missing phone number is fine. A fake one is not.
 *
 * NO CONTACT FORM, DELIBERATELY. There was one, and with no delivery provider
 * configured it validated, showed a success message, and sent nothing — a
 * visitor would write in, be told it went through, and never be heard from. A
 * mailto link cannot fail that way: it opens the sender's own mail app, so they
 * can see for themselves that the message left. It also needs no vendor, no
 * spam handling, and no account for a future officer to inherit.
 */
export default function ContactPage() {
  const page = getPage("contact");
  const site = getSiteSettings();

  const email = site.contact.email;
  const hasEmail = !isTodo(email) && Boolean(email);

  return (
    <>
      <PageHero
        eyebrow="Get in touch"
        title={isTodo(page.title as string) ? "Contact" : (page.title as string)}
        intro={page.intro as string}
      />

      <Section tone="tint">
        {hasEmail ? (
          <div className="rounded-sm bg-purple-900 p-7 text-cream sm:p-10">
            <p className="eyebrow text-salmon-400">Chapter inbox</p>
            <a
              href={`mailto:${email}`}
              className="mt-3 block break-words font-serif text-3xl underline decoration-salmon-400 decoration-2 underline-offset-8 sm:text-4xl"
            >
              {email}
            </a>
            {/*
              Says who reads it. Someone with a giving question needs to know it
              reaches the Treasurer without hunting for a second address — which
              is why there isn't one.
            */}
            <p className="mt-6 max-w-xl text-cream/80">
              The President and the Treasurer both monitor this inbox, so questions about events,
              giving, or anything else all reach the right person here.
            </p>
          </div>
        ) : (
          <Todo label="Launch blocker — no chapter email">
            Add the address in <code>content/site.json</code> → <code>contact.email</code>. This is
            the single most important thing to fix before the site goes live; the old site failed
            here.
          </Todo>
        )}
      </Section>

      <Section>
        <SectionHead eyebrow="Where we are" title="Addresses" />

        {/*
          The Lodge leads because it is the one people look for — an alum back
          for a game wants the address to drive to. The labels carry the
          distinction on their own: "The Lodge" is a place, "Mailing address"
          is where post goes, so neither needs a sentence explaining it.
        */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {site.contact.lodgeAddress && !isTodo(site.contact.lodgeAddress) ? (
            <div className="rounded-sm bg-white p-6 ring-1 ring-purple-900/10 sm:p-8">
              <p className="eyebrow text-salmon-600">The Lodge</p>
              <p className="mt-3 whitespace-pre-line text-ink">{site.contact.lodgeAddress}</p>
            </div>
          ) : null}

          {!isTodo(site.contact.mailingAddress) ? (
            <div className="rounded-sm bg-white p-6 ring-1 ring-purple-900/10 sm:p-8">
              <p className="eyebrow text-salmon-600">Mailing address</p>
              <p className="mt-3 whitespace-pre-line text-ink">{site.contact.mailingAddress}</p>
            </div>
          ) : (
            <Todo label="Mailing address needed">
              Add it in <code>content/site.json</code>. Nothing renders here until then — an empty
              spot beats a stock address.
            </Todo>
          )}
        </div>

        {!isTodo(site.contact.phone) && site.contact.phone ? (
          <p className="mt-8 text-ink">
            <span className="eyebrow text-ink/50">Phone</span>{" "}
            <a href={`tel:${site.contact.phone.replace(/[^\d+]/g, "")}`} className="underline">
              {site.contact.phone}
            </a>
          </p>
        ) : null}
      </Section>
    </>
  );
}
