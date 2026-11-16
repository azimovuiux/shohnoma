import type { Metadata } from "next";
import { ArticlePage } from "@/components/articles/ArticlePages";

/**
 * Maqola — statik qobiq (faqat "_" → /maqolalar/_/index.html). Apache /maqolalar/<slug>/ ni php/article.php ga beradi:
 * u maqolani DB’dan olib, meta teglar va to‘liq matnni (#sh-ssr) shu qobiqqa qo‘yadi. Yo‘q slug → 404.
 */
export const dynamicParams = false;
export function generateStaticParams() {
  return [{ slug: "_" }];
}

export const metadata: Metadata = {
  title: "Maqola",
  description: null,
  alternates: {},
  openGraph: null,
  twitter: null,
};

export default function Page() {
  return <ArticlePage />;
}
