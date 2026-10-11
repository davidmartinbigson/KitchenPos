import { getCurrentUser } from "@/lib/auth";
import { en } from "@/lib/i18n";
import { LandingPage } from "@/components/landing/landing-page";

const BASE = "https://prokitchenpos.com";

/**
 * Structured data (Google rich results):
 * - SoftwareApplication for the product itself
 * - FAQPage mirroring the visible FAQ section (must stay in sync!)
 * - Organization for the brand
 * FAQ text intentionally comes from the EN dictionary — the default-rendered
 * language is also English, so markup and visible content match.
 */
const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Kitchen POS",
    url: BASE,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Point of sale (POS) software for restaurants, cafés and cloud kitchens: free QR code menu self-ordering, receipt printing, kitchen display, staff accounts and daily sales reports. Works offline. English & Urdu.",
    featureList:
      "QR code menu, contactless self-ordering, POS billing, receipt printing, kitchen display screen, staff accounts, daily sales analytics, offline PWA, English and Urdu",
    inLanguage: ["en", "ur"],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free to start — affordable monthly plans, no per-order commission",
    },
    areaServed: ["PK", "AE", "GB", "US"],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: en.landing.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Kitchen POS",
    url: BASE,
    logo: `${BASE}/icon.svg`,
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  return (
    <>
      {structuredData.map((data, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
      <LandingPage loggedIn={Boolean(user)} />
    </>
  );
}
