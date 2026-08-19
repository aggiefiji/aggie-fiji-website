import type { MetadataRoute } from "next";
import { flattenNav, withDonationPages } from "@/lib/nav";
import { getDonationPages } from "@/lib/content";
import { siteUrl } from "@/integrations.config";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const nav = withDonationPages(getDonationPages());

  const pages = flattenNav(nav).map((item) => ({
    url: `${siteUrl}${item.href}`,
    lastModified: now,
    changeFrequency: (item.href === "/events" ? "weekly" : "monthly") as "weekly" | "monthly",
    priority: item.href === "/" ? 1 : 0.7,
  }));

  // No per-officer URLs: those pages were removed with the Leadership route in
  // August 2026. Officers now live on /about, which flattenNav already covers.
  return pages;
}
