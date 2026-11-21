import { siteConfig } from "@/config/site";

/**
 * Organization + WebSite structured data (schema.org JSON-LD).
 * Only facts that are true for the brand today; no ratings, reviews or offers.
 * `<` is escaped so the JSON can never terminate the script element.
 */
export function StructuredData({ nonce }: { nonce?: string }) {
  const sameAs = [siteConfig.links.instagram, siteConfig.links.linkedin].filter(
    (link): link is string => Boolean(link),
  );

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteConfig.url}/#organization`,
        name: siteConfig.legalName,
        alternateName: siteConfig.name,
        url: siteConfig.url,
        logo: `${siteConfig.url}/logo/studipod-logo.png`,
        slogan: siteConfig.tagline,
        email: siteConfig.links.contactEmail,
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: siteConfig.links.contactEmail,
          availableLanguage: "en-GB",
        },
        ...(sameAs.length > 0 ? { sameAs } : {}),
      },
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        url: siteConfig.url,
        name: siteConfig.name,
        description: siteConfig.description,
        inLanguage: "en-GB",
        publisher: { "@id": `${siteConfig.url}/#organization` },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      // Static, server-generated JSON from site config — not user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
