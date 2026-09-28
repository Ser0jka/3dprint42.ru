import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/roboto-condensed";
import "./globals.css";
import SiteMotion from "./site-motion";
import MetrikaGoals from "./metrika-goals";
import { getSiteSettings } from "./site-settings-store";
import { defaultDescription, siteName, siteUrl } from "./seo";
import StructuredData from "./structured-data";
import CookieConsent from "./cookie-consent";
import { services } from "./site-content";
import { serviceRoutes } from "../site-routes";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "3D-печать на заказ в Кемерово — Центр 3D-печати",
    template: "%s — Центр 3D-печати",
  },
  description: defaultDescription,
  applicationName: siteName,
  appleWebApp: {
    capable: true,
    title: "3D-печать",
    statusBarStyle: "black-translucent",
  },
  keywords: [
    "3D-печать Кемерово",
    "3D-печать на заказ",
    "прототипирование",
    "малые серии",
    "FDM-печать",
    "печать PLA PETG ABS TPU",
  ],
  authors: [{ name: siteName, url: siteUrl }],
  creator: siteName,
  publisher: siteName,
  category: "Аддитивное производство",
  alternates: { canonical: "/" },
  openGraph: {
    title: "3D-печать на заказ в Кемерово — Центр 3D-печати",
    description: defaultDescription,
    url: "/",
    siteName,
    locale: "ru_RU",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Центр 3D-печати — 3D-печать в Кемерово",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "3D-печать на заказ в Кемерово — Центр 3D-печати",
    description: defaultDescription,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    yandex: "6bce6dcbc255948e",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#11110f" },
    { media: "(prefers-color-scheme: light)", color: "#f3f0ea" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { contact } = await getSiteSettings();
  const businessStructuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: siteName,
      inLanguage: "ru-RU",
    },
    {
      "@context": "https://schema.org",
      "@type": ["LocalBusiness", "ProfessionalService"],
      "@id": `${siteUrl}/#business`,
      name: "Центр 3D-печати",
      legalName: "ИП Суровцев Сергей Сергеевич",
      url: siteUrl,
      image: `${siteUrl}/opengraph-image`,
      description: defaultDescription,
      telephone: contact.phoneDisplay,
      taxID: "420543355313",
      identifier: {
        "@type": "PropertyValue",
        name: "ОГРНИП",
        value: "326420500101781",
      },
      priceRange: "от 7 ₽/г",
      address: {
        "@type": "PostalAddress",
        streetAddress: contact.address.replace(/^Кемерово,\s*/i, ""),
        addressLocality: "Кемерово",
        addressRegion: "Кемеровская область — Кузбасс",
        addressCountry: "RU",
      },
      geo: { "@type": "GeoCoordinates", latitude: 55.339722, longitude: 86.103459 },
      hasMap: contact.map,
      areaServed: ["Кемерово", "Кемеровская область — Кузбасс"],
      sameAs: [contact.telegram, contact.vk, contact.max],
      contactPoint: {
        "@type": "ContactPoint",
        telephone: contact.phoneDisplay,
        contactType: "обсуждение и расчёт заказа",
        availableLanguage: "Russian",
      },
      knowsAbout: [
        "3D-печать",
        "FDM-печать",
        "3D-моделирование",
        "реверс-инжиниринг",
        "3D-сканирование",
        "PLA",
        "PETG",
        "ABS",
        "TPU",
      ],
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Услуги Центра 3D-печати",
        itemListElement: services.map((service) => ({
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: service.title,
            description: service.lead,
            url: `${siteUrl}${serviceRoutes[service.id]}`,
            provider: { "@id": `${siteUrl}/#business` },
          },
        })),
      },
    },
  ] as const;
  return (
    <html lang="ru" suppressHydrationWarning data-scroll-behavior="smooth">
      <body>
        <StructuredData data={businessStructuredData} />
        <MetrikaGoals />
        <SiteMotion />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
