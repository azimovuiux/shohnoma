import type { Metadata } from "next";
import { ArticlesIndexPage } from "@/components/articles/ArticlePages";

/**
 * Maqolalar ro‘yxati — statik qobiq. Apache /maqolalar/ ni php/article.php ga beradi: u shu faylni o‘qib,
 * title/description/canonical/hreflang/OG/JSON-LD va to‘liq ro‘yxat HTML’ini (#sh-ssr) qo‘yadi.
 * Shuning uchun bu yerda SEO teglari ataylab bo‘sh (qobiqda ikki marta chiqmasin).
 */
export const metadata: Metadata = {
  title: "Maqolalar",
  description: null,
  alternates: {},
  openGraph: null,
  twitter: null,
};

export default function Page() {
  return <ArticlesIndexPage />;
}
