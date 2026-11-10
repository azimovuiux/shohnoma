/**
 * Shablon kategoriyalari (katalog filtrlari) — admin qo‘shadi, nomlaydi va ikonka tanlaydi.
 * Har bir kategoriya taklifnoma turiga (`kind`) bog‘lanadi: buyurtma formasi (bir yoki ikki ism) shu turdan olinadi.
 * Ro‘yxat /api/templates.js orqali keladi (window.__SHOHNOMA_CATEGORIES__); bo‘lmasa — standart 4 tasi.
 */
import type { Ceremony } from "./templates";
import type { Locale } from "./i18n";

export interface Category {
  slug: string;
  name: string;
  nameRu?: string;
  nameEn?: string;
  /** Ikonka nomi (CATEGORY_ICONS dan) */
  icon: string;
  /** Taklifnoma turi — buyurtma formasi va taklifnoma matni shundan */
  kind: Ceremony;
  /** Standart kategoriya (o‘chirib bo‘lmaydi) */
  builtin?: boolean;
}

export const defaultCategories: Category[] = [
  { slug: "nikoh", name: "Nikoh to‘yi", nameRu: "Никах", nameEn: "Wedding", icon: "Heart", kind: "nikoh", builtin: true },
  { slug: "sunnat", name: "Sunnat to‘yi", nameRu: "Суннат-той", nameEn: "Sunnat celebration", icon: "Crown1", kind: "sunnat", builtin: true },
  { slug: "fotiha", name: "Fotiha to‘yi", nameRu: "Фотиха-той", nameEn: "Engagement (Fotiha)", icon: "Lovely", kind: "fotiha", builtin: true },
  { slug: "tugilgan-kun", name: "Tug‘ilgan kun", nameRu: "День рождения", nameEn: "Birthday", icon: "Cake", kind: "tugilgan-kun", builtin: true },
];

declare global {
  interface Window {
    __SHOHNOMA_CATEGORIES__?: Category[];
  }
}

function load(): Category[] {
  if (typeof window !== "undefined") {
    const w = window.__SHOHNOMA_CATEGORIES__;
    if (Array.isArray(w) && w.length) return w;
  }
  return defaultCategories;
}

/** Joriy kategoriyalar (admin tartibida) */
export const categories: Category[] = load();

export const getCategory = (slug: string) => categories.find((c) => c.slug === slug);

/** Kategoriya nomi joriy tilda */
export function categoryName(c: Category | undefined, locale: Locale): string {
  if (!c) return "";
  if (locale === "ru") return c.nameRu || c.name;
  if (locale === "en") return c.nameEn || c.name;
  return c.name;
}

/** Admin saqlagandan keyin — sahifani yangilamasdan joriy ro‘yxatni almashtirish */
export function setCategories(list: Category[]) {
  categories.splice(0, categories.length, ...list);
  if (typeof window !== "undefined") window.__SHOHNOMA_CATEGORIES__ = list;
}

/** Hydration uchun xavfsiz: serverda — standart ro‘yxat, brauzerda — admin ro‘yxati (useTemplates kabi) */
export function categoriesServerSnapshot(): Category[] {
  return defaultCategories;
}
