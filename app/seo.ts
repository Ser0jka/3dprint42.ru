import type { Metadata } from "next";

export const siteUrl = "https://3dprint42.ru";
export const siteName = "Центр 3D-печати";
export const defaultDescription =
  "3D-печать на заказ в Кемерово: функциональные детали, прототипы и малые серии из PLA, PETG, ABS и TPU. Оценка по модели, эскизу или образцу.";

type SeoOptions = {
  title: string;
  description: string;
  path: string;
  keywords?: readonly string[];
  noIndex?: boolean;
};

export function createMetadata({
  title,
  description,
  path,
  keywords,
  noIndex = false,
}: SeoOptions): Metadata {
  const canonicalPath = path || "/";

  return {
    title,
    description,
    keywords: keywords ? [...keywords] : undefined,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      siteName,
      locale: "ru_RU",
      type: "website",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: `${siteName} — 3D-печать в Кемерово`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
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
  };
}
