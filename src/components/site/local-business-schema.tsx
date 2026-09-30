import { boroughs, contact, services } from "@/lib/content";
import { getReviewsSafely } from "@/lib/public/reviews";
import { siteDescription, siteName, siteUrl } from "@/lib/site";

/**
 * The LocalBusiness node, for Google's local and knowledge-panel results.
 *
 * `LimousineService` rather than a bare `LocalBusiness`: it is a subtype of it,
 * so everything that reads `LocalBusiness` still reads this, and a consumer
 * that understands the narrower type learns what the business actually does
 * without parsing prose.
 *
 * Every value here is drawn from `content.ts` or `site.ts` — the same data the
 * pages render. Structured data that disagrees with the visible page is a
 * manual-action risk, not just a wasted tag, so nothing is written twice and
 * nothing is asserted that the site does not also show a visitor.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS DELIBERATELY MISSING, and what it costs
 *
 * `address`, `geo` and `openingHours`. Google's LocalBusiness rich result
 * treats a postal address as required, so **this markup will not earn the map
 * or hours rich result until an address is added.** It still does useful work
 * without one: it names the entity, its phone, its service area and its
 * services, which is what a knowledge panel and a site-name result are built
 * from.
 *
 * They are absent because the business has not confirmed them. `/contact`
 * shows no street address or opening hours for exactly this reason (see the
 * comment on that page), and the phone number is a 914 area code while the
 * service area is New York City — so even the locality cannot be inferred.
 * Inventing one to satisfy a validator would put a false address in front of
 * customers and in Google's index.
 *
 * To complete it, confirm the registered address and opening hours, then add:
 *
 *   address: {
 *     "@type": "PostalAddress",
 *     streetAddress: "…",
 *     addressLocality: "…",
 *     addressRegion: "NY",
 *     postalCode: "…",
 *     addressCountry: "US",
 *   },
 *   openingHoursSpecification: [{
 *     "@type": "OpeningHoursSpecification",
 *     dayOfWeek: ["Monday", …],
 *     opens: "00:00",
 *     closes: "23:59",
 *   }],
 *
 * Once `sameAs` below resolves, Google can associate this site with the
 * business's own Google Business Profile — which is where a confirmed address
 * and opening hours most likely already exist. Copy them from there rather
 * than from memory, and the two sources then agree by construction.
 *
 * `aggregateRating` is also absent, and stays absent for a different reason:
 * it is not that the data is missing — `count` and `average` come back from
 * the same call as `googleProfileUrl` — but that this node is emitted on every
 * public page while the reviews themselves render only on the homepage. Google
 * requires a rating the visitor can see on the page carrying the markup, so
 * publishing it sitewide would be unsupported on eight pages out of nine. If
 * it is ever wanted, it belongs on a node scoped to the pages that show the
 * reviews, and only over real approved ones — `demoReviews` is
 * development-only and must never reach it.
 */
export async function LocalBusinessSchema() {
  // Already cached under the `reviews` tag and fetched by the homepage anyway,
  // so this is a cache read rather than a round trip per page. `Safely` because
  // a brief API outage must not take the markup — or the page — down with it;
  // `sameAs` is simply omitted until the next revalidation picks it up.
  const { googleProfileUrl } = await getReviewsSafely();

  const schema = {
    "@context": "https://schema.org",
    "@type": "LimousineService",
    // A stable node id, so a future WebSite or BreadcrumbList node can point
    // at this business rather than describing a second copy of it.
    "@id": `${siteUrl}/#business`,
    name: siteName,
    description: siteDescription,
    slogan: "Arrive in Style",
    // Trailing slash, matching the homepage's own canonical and its entry in
    // `sitemap.ts`. Same page either way, but three spellings of one URL is
    // three things a consumer has to decide are the same.
    url: `${siteUrl}/`,
    // E.164, derived from the href rather than the display form: `tel:` already
    // holds the diallable spelling, and formatting is not a phone number.
    telephone: contact.phoneHref.replace(/^tel:/, ""),
    email: contact.email,
    // Absolute by requirement — a consumer of this JSON has no page to resolve
    // a relative path against. Next serves these from `src/app/`.
    image: `${siteUrl}/icon.png`,
    logo: `${siteUrl}/icon.png`,
    /**
     * The Google Business Profile, built by the API from `GOOGLE_PLACE_ID`.
     *
     * This is the single highest-value property in the whole node: it is what
     * ties this site to the listing Google already holds — the one with the
     * address, the hours and the star rating on it — so the two stop being two
     * entities that merely share a name.
     *
     * Spread conditionally rather than set to null. `"sameAs": null` is an
     * assertion that the business is the same as nothing, and a validator is
     * entitled to complain; an absent property asserts nothing at all.
     */
    ...(googleProfileUrl ? { sameAs: [googleProfileUrl] } : {}),
    // The one service area the business has confirmed, as five places rather
    // than one sentence, so it is machine-readable at the borough level.
    areaServed: boroughs.map((borough) => ({
      "@type": "City",
      name: borough,
      containedInPlace: {
        "@type": "City",
        name: "New York",
        address: {
          "@type": "PostalAddress",
          addressRegion: "NY",
          addressCountry: "US",
        },
      },
    })),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Chauffeur services",
      itemListElement: services.map((service) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: service.name,
          description: service.description,
          url: `${siteUrl}${service.href}`,
        },
      })),
    },
  };

  return (
    <script
      type="application/ld+json"
      // `<` is escaped rather than emitted raw. Nothing here is customer-typed
      // today, but a JSON string containing `</script>` closes the tag early
      // and the rest of the document becomes markup — the value being ours is
      // a reason it has not happened yet, not a reason it cannot.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
      }}
    />
  );
}
