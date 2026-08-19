import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { DevStatusBanner } from "@/components/DevStatusBanner";
import { Analytics } from "@/components/Analytics";
import { siteUrl } from "@/integrations.config";
import { getDonationPages } from "@/lib/content";
import { withDonationPages } from "@/lib/nav";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

/*
 * "Aggie FIJI" leads the title because it is the search term — an alum looking
 * for this chapter types the nickname, not "Phi Gamma Delta Texas A&M". The
 * formal name follows in the same string so the page still reads correctly in
 * a browser tab, a shared link, and search results.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Aggie FIJI · Phi Gamma Delta at Texas A&M University",
    template: "%s · Aggie FIJI",
  },
  description:
    "Aggie FIJI — the Alpha Mu Chapter of Phi Gamma Delta at Texas A&M University. Alumni events, chapter news, philanthropy, and ways to give back.",
  openGraph: {
    type: "website",
    siteName: "Aggie FIJI · Phi Gamma Delta at Texas A&M",
    title: "Aggie FIJI · Phi Gamma Delta at Texas A&M University",
    description:
      "Friendship, knowledge, service, morality, and excellence in College Station. Alumni events, newsletters, and giving.",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#401457",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Nav is built on the server so the Donations dropdown can be driven by
  // content files without making nav.ts server-only.
  const nav = withDonationPages(getDonationPages());

  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <head>
        {/*
          The scroll-reveal animation starts every section at opacity 0 and
          relies on JavaScript to bring it back. With JavaScript off that would
          be an entirely blank site — the worst possible failure for a page
          whose whole job is publishing chapter information.

          This un-hides everything before the first paint when scripting is
          disabled. It has to live in <head> as real markup rather than in a
          stylesheet, because the stylesheet cannot know whether JS will run.
        */}
        <noscript
          dangerouslySetInnerHTML={{
            __html: `<style>.reveal{opacity:1!important;transform:none!important;transition:none!important}</style>`,
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <DevStatusBanner />
        <SiteHeader nav={nav} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
