import type { Locale } from "@/lib/i18n";

/**
 * Maqolalar (blog). Ommaviy sahifalar serverda (php/article.php) to‘liq HTML bilan yig‘iladi,
 * brauzer esa shu yerdagi turlar bilan xuddi o‘sha ko‘rinishni chizadi. Kategoriyalar — php/api/lib/articles.php bilan bir xil.
 */
export type ArticleLang = "uz" | "ru" | "en";

export type ArticleCard = {
  id: string;
  slug: string;
  lang: ArticleLang;
  title: string;
  excerpt: string;
  category: string | null;
  cover: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  readingMinutes: number | null;
  url: string;
};

export type ArticleTranslation = { id: string; lang: ArticleLang; slug: string; title: string; status: "draft" | "published"; url: string };

export type Article = ArticleCard & {
  html: string;
  toc: { id: string; text: string }[];
  wordCount: number;
  readingMinutes: number;
  seoTitle: string | null;
  seoDescription: string | null;
  description: string;
  status: "draft" | "published";
  translations: ArticleTranslation[];
};

export type ArticleListData = {
  items: ArticleCard[];
  total: number;
  all: number;
  page: number;
  pages: number;
  per: number;
  category: string | null;
  categories: { slug: string; count: number }[];
};

export type ArticlePageData = { article: Article; related: ArticleCard[] };

export const ARTICLE_CATEGORIES: { slug: string; name: Record<ArticleLang, string> }[] = [
  { slug: "maslahatlar", name: { uz: "Maslahatlar", ru: "Советы", en: "Tips" } },
  { slug: "matnlar", name: { uz: "Taklifnoma matnlari", ru: "Тексты приглашений", en: "Invitation wording" } },
  { slug: "tashkilot", name: { uz: "To‘y tashkiloti", ru: "Организация торжества", en: "Event planning" } },
  { slug: "yangiliklar", name: { uz: "Yangiliklar", ru: "Новости", en: "News" } },
];

export function categoryLabel(slug: string | null | undefined, lang: Locale): string | null {
  const c = ARTICLE_CATEGORIES.find((x) => x.slug === slug);
  return c ? c.name[lang] : null;
}

const MONTHS: Record<Locale, string[]> = {
  uz: ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"],
  ru: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};

/** ISO (UTC) → [«16 noyabr 2026», «2026-11-16»] — Toshkent vaqti (server bilan bir xil) */
export function articleDate(iso: string | null | undefined, lang: Locale): [string, string] {
  if (!iso) return ["", ""];
  const ms = new Date(iso).getTime();
  if (isNaN(ms)) return ["", ""];
  const d = new Date(ms + 5 * 3600_000);
  return [`${d.getUTCDate()} ${MONTHS[lang][d.getUTCMonth()]} ${d.getUTCFullYear()}`, d.toISOString().slice(0, 10)];
}

/** /maqolalar/?kategoriya=&sahifa= (til prefiksisiz — LocalLink o‘zi qo‘shadi) */
export function articleListHref(category: string | null, page: number): string {
  const q = new URLSearchParams();
  if (category) q.set("kategoriya", category);
  if (page > 1) q.set("sahifa", String(page));
  const s = q.toString();
  return `/maqolalar/${s ? `?${s}` : ""}`;
}

/** Maqola manzili server tomonidan til prefiksi bilan keladi (/ru/maqolalar/..) — LocalLink uchun prefiksni olib tashlaymiz */
export const bareArticleUrl = (url: string) => url.replace(/^\/(ru|en)(?=\/)/, "");

/** Kirill/o‘zbek lotin → slug (server article_slugify bilan bir xil qoida) */
const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya", ў: "o", қ: "q", ғ: "g", ҳ: "h",
};
export function articleSlugify(s: string, max = 90): string {
  const out = s
    .toLowerCase()
    .replace(/[‘’'`ʻʼ]/g, "")
    .replace(/[а-яёўқғҳ]/g, (ch) => TRANSLIT[ch] ?? "")
    .normalize("NFKD")
    .replace(/\p{Mn}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return out.length > max ? out.slice(0, max).replace(/-+$/, "") : out;
}
