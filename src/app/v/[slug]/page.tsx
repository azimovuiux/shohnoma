import type { Metadata } from "next";
import { CardPublicPage } from "@/components/vizitka/CardPublic";

/**
 * Ommaviy vizitka — statik qobiq (faqat "_" → /v/_/index.html).
 * Apache /v/<slug>/ so‘rovlarini php/card.php ga beradi: u shu qobiqqa OG meta qo‘shib qaytaradi (to‘lanmagan → 404).
 * Ma’lumot brauzerda GET /api/c/<slug> dan olinadi.
 */
export const dynamicParams = false;
export function generateStaticParams() {
  return [{ slug: "_" }];
}

export const metadata: Metadata = {
  title: { absolute: "Vizitka — Shohnoma" },
  robots: { index: false, follow: false },
};

export default function CardPage() {
  return <CardPublicPage />;
}
