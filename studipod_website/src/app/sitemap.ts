import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/**
 * Only indexable pages are listed. The legal routes are placeholders marked
 * noindex until approved content is published.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${siteConfig.url}/`,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
