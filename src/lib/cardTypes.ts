/**
 * «Vizitka» (raqamli vizitka) — frontend va PHP (php/api/routes/cards.php) o‘rtasidagi shartnoma.
 * Taklifnoma turlariga (types.ts) tegmaydi: vizitka buyurtmasi `orders` jadvalida `product='vizitka'` bilan,
 * ma’lumoti esa alohida `cards` jadvalida saqlanadi (invitations qatori yo‘q).
 *
 * Ko‘p tilli matn: har bir matnli maydon `Localized<string>` = { uz, ru?, en? }.
 * uz — majburiy (asosiy), ru/en ixtiyoriy; bo‘sh bo‘lsa uz ko‘rsatiladi → `loc(v, lang)`.
 * Ism, telefon, email, URL, raqamlar (stats.value) — tilga bog‘liq emas (oddiy string).
 */
import type { OrderStatus, PayProvider, Payment } from "./types";

export type CardLang = "uz" | "ru" | "en";
export const CARD_LANGS: CardLang[] = ["uz", "ru", "en"];

/** Ko‘p tilli qiymat: uz majburiy, ru/en ixtiyoriy */
export type Localized<T = string> = { uz: T; ru?: T; en?: T };

/** Tanlangan til matni; bo‘sh bo‘lsa — o‘zbekchasi (u ham bo‘lmasa — ""). */
export function loc(v: Localized | string | null | undefined, lang: CardLang): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  const s = v[lang];
  return s && s.trim() ? s : v.uz || "";
}

/** Bo‘sh Localized */
export const emptyLoc = (): Localized => ({ uz: "", ru: "", en: "" });

/** Qaysi tillarda matn bor (karta tepasidagi UZ/RU/EN tugmalari uchun — faqat to‘ldirilgan tillar ko‘rsatiladi) */
export function filledLangs(v: Localized | null | undefined): CardLang[] {
  if (!v) return ["uz"];
  return CARD_LANGS.filter((l) => l === "uz" || !!v[l]?.trim());
}

export type CardDesignSlug = "v-noir" | "v-lumen";
export type CardSocialKind = "instagram" | "telegram" | "linkedin" | "facebook" | "youtube" | "tiktok" | "x" | "whatsapp" | "website";
export type CardLinkIcon = "calendar" | "book" | "globe" | "arrow" | "download" | "pin";
export type CardLeadStatus = "new" | "seen" | "done";

/** «Hamkorlik yo‘nalishlari» (Noir) */
export interface CardDirection {
  title: Localized;
  text: Localized;
}
/** «Raqamlar» — value tilga bog‘liq emas ("$40M+", "15") */
export interface CardStat {
  value: string;
  label: Localized;
}
/** «Kompaniyalar» (Noir) */
export interface CardCompany {
  name: string;
  /** "2009 — hozir · Asoschi" */
  period: Localized;
  text: Localized;
  url?: string;
}
/** Ijtimoiy tarmoq (Lumen bento plitkalari; Noir — kontaktlar ostida ikonka) */
export interface CardSocial {
  kind: CardSocialKind;
  url: string;
  /** "@madina.rahimova" */
  handle?: string;
  /** Plitka sarlavhasi (masalan, YouTube video nomi) */
  title?: Localized;
  /** "48,2K obunachi" */
  note?: Localized;
}
/** Havola tugmasi (Lumen «Havolalar») */
export interface CardLink {
  title: Localized;
  subtitle?: Localized;
  url: string;
  icon?: CardLinkIcon;
}

/** Mijoz kiritadigan barcha ma’lumot (PATCH tanasi shu kalitlar bilan, qisman) */
export interface CardContent {
  /** Ism Familiya — tilga bog‘liq emas */
  fullName: string;
  /** Lavozim: "Asoschi va bosh direktor" (vCard TITLE, OG) */
  position: Localized;
  /** Kompaniya: "Karimov Group" (vCard ORG) */
  company: Localized;
  /** Hero ostidagi qisqa matn (1–2 jumla) */
  bio: Localized;
  /** +998901234567 (server normallashtiradi) */
  phone: string;
  /** WhatsApp raqami (bo‘sh bo‘lsa — phone) */
  whatsapp: string;
  email: string;
  /** "@azizkarimov" (server @ qo‘shadi) */
  telegram: string;
  /** https://… */
  website: string;
  address: Localized;
  /** Xarita havolasi https://… */
  mapUrl: string;
  /** Rasmlar: [0] — portret (vCard PHOTO, OG), qolganlari — dizayn galereyasi. /files/photos/… */
  photos: string[];
  /** Kompaniya logotipi (ixtiyoriy) */
  logo: string | null;
  /** «Siz ham kontakt qoldiring» formasi yoqilganmi (Noir) */
  leadForm: boolean;
  directions: CardDirection[];
  stats: CardStat[];
  companies: CardCompany[];
  socials: CardSocial[];
  links: CardLink[];
}

/** Egasi ko‘radigan to‘liq vizitka (GET/PATCH /api/cards/:id) */
export interface CardData extends CardContent {
  id: string;
  /** = API dagi :id (buyurtma id si) */
  orderId: string;
  /** To‘lovgacha "qoralama-…"; to‘lovda ismdan yasaladi; to‘lovdan so‘ng egasi o‘zgartira oladi */
  slug: string;
  design: CardDesignSlug;
  views: number;
  vcfDownloads: number;
  leadsTotal: number;
  leadsNew: number;
  createdAt: string;
  updatedAt: string;
}

/** Ommaviy sahifa (/v/<slug>/) uchun — GET /api/c/:slug. Faqat to‘langan vizitka. */
export interface CardPublic extends CardContent {
  slug: string;
  design: CardDesignSlug;
  /** To‘liq manzil: https://shohnoma.uz/v/<slug>/ */
  url: string;
  /** .vcf yuklab olish manzili (/api/c/<slug>/vcard) */
  vcardUrl: string;
}

/** Buyurtma (orders qatori, vizitka) */
export interface CardOrderInfo {
  id: string;
  code: string;
  status: OrderStatus;
  amount: number;
  promoCode: string | null;
  promoDiscount: number;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Kabinet ro‘yxati qatori (GET /api/me/cards) va admin ro‘yxati asosi */
export interface CardOrder {
  /** buyurtma id si (= /api/cards/:id) */
  id: string;
  code: string;
  status: OrderStatus;
  amount: number;
  design: CardDesignSlug;
  slug: string;
  fullName: string;
  position: Localized;
  photo: string | null;
  views: number;
  vcfDownloads: number;
  leadsTotal: number;
  leadsNew: number;
  paidAt: string | null;
  createdAt: string;
}

/** Admin ro‘yxati qatori (GET /api/admin/cards) */
export interface AdminCardRow extends CardOrder {
  userId: string | null;
  ownerName: string | null;
  ownerPhone: string | null;
  phone: string;
  promoCode: string | null;
  income: number;
}

/** Vizitkadan kelgan murojaat (lead forma) */
export interface CardLead {
  id: string;
  name: string;
  company: string | null;
  contact: string;
  purpose: string | null;
  message: string | null;
  status: CardLeadStatus;
  createdAt: string;
}

/* ───────────── So‘rov / javob shakllari ───────────── */

export interface CardCreateRequest {
  design: CardDesignSlug;
}
export interface CardCreateResponse {
  ok: true;
  id: string;
}

export interface CardGetResponse {
  ok: true;
  order: CardOrderInfo;
  card: CardData;
  payment: Payment | null;
  /** To‘lovdan oldin to‘ldirilishi shart maydonlar: "fullName", "phone", "position", "directions.0.title" … */
  missing: string[];
}

/**
 * PATCH /api/cards/:id — CardContent ning istalgan qismi.
 * `_draft: true` — qoralama: noto‘g‘ri maydon butun so‘rovni yiqitmaydi, `skipped` ga tushadi, chala ro‘yxat qatorlari saqlanadi.
 * `_draft` siz — qat’iy tekshiruv (422 + error matni).
 * `design` — faqat to‘lovgacha; `slug` — faqat to‘lovdan keyin.
 * photos/logo — faqat yuklash endpointi bergan /files/photos/… manzillar (tartibni o‘zgartirish / o‘chirish uchun).
 */
export type CardPatchRequest = Partial<CardContent> & { _draft?: boolean; design?: CardDesignSlug; slug?: string };
export interface CardPatchResponse {
  ok: true;
  card: CardData;
  /** faqat _draft rejimida: saqlanmagan kalitlar */
  skipped?: string[];
  missing: string[];
}

/** POST /api/cards/:id/photos — multipart: file, slot? (shu o‘rindagi rasm almashtiriladi), kind? "photo" | "logo" */
export interface CardPhotoResponse {
  ok: true;
  url: string;
  photos: string[];
  logo: string | null;
}

export interface CardPayRequest {
  provider: PayProvider;
}
export interface CardPayResponse {
  ok: true;
  /** To‘lov sahifasi (Rahmat) yoki to‘langan bo‘lsa — CARD_PAGES.ready(id) */
  url: string;
}
export interface CardStatusResponse {
  ok: true;
  status: OrderStatus;
  slug: string;
  payment: { provider: PayProvider; status: Payment["status"]; note: string | null } | null;
}
export interface CardPromoResponse {
  ok: true;
  amount: number;
  promoCode?: string;
  promoDiscount?: number;
}

export interface CardPublicResponse {
  ok: true;
  card: CardPublic;
}

/** POST /api/c/:slug/lead. `website` — honeypot (bo‘sh qoldiriladi, yashirin input). */
export interface CardLeadRequest {
  name: string;
  company?: string;
  contact: string;
  purpose?: string;
  message?: string;
  website?: string;
}

export interface CardLeadsResponse {
  ok: true;
  leads: CardLead[];
}
export interface MeCardsResponse {
  ok: true;
  cards: CardOrder[];
}
export interface AdminCardsResponse {
  ok: true;
  cards: AdminCardRow[];
  total: number;
  page: number;
  pages: number;
}
export interface AdminCardResponse {
  ok: true;
  order: CardOrderInfo & { userId: string | null; income: number };
  card: CardData;
  owner: { id: string; name: string | null; phone: string | null; telegramUser: string | null } | null;
  payments: Payment[];
  leads: CardLead[];
}

/* ───────────── API yo‘llari ───────────── */

const e = encodeURIComponent;
export const CARD_API = {
  /** POST {design} → {id} */
  create: "/api/cards",
  /** GET → CardGetResponse; PATCH → CardPatchResponse */
  card: (id: string) => `/api/cards/${e(id)}`,
  /** POST (multipart) / DELETE {url} */
  photos: (id: string) => `/api/cards/${e(id)}/photos`,
  /** POST {code} / DELETE */
  promo: (id: string) => `/api/cards/${e(id)}/promo`,
  /** POST {provider} → {url} */
  pay: (id: string) => `/api/cards/${e(id)}/pay`,
  /** GET → CardStatusResponse */
  status: (id: string) => `/api/cards/${e(id)}/status`,
  /** POST {provider, result: "success"|"fail"} — faqat PAYMENTS_SANDBOX=1 */
  sandbox: (id: string) => `/api/cards/${e(id)}/sandbox`,
  /** GET → CardLeadsResponse */
  leads: (id: string) => `/api/cards/${e(id)}/leads`,
  /** PATCH {status} */
  lead: (id: string, leadId: string) => `/api/cards/${e(id)}/leads/${e(leadId)}`,
  /** GET (ommaviy) → CardPublicResponse; ko‘rishlar soni +1 (`?nocount=1` — sanamaydi) */
  public: (slug: string) => `/api/c/${e(slug)}`,
  /** GET (ommaviy) → text/vcard (.vcf) */
  vcard: (slug: string) => `/api/c/${e(slug)}/vcard`,
  /** POST (ommaviy) CardLeadRequest → {ok} */
  publicLead: (slug: string) => `/api/c/${e(slug)}/lead`,
  /** GET → MeCardsResponse */
  me: "/api/me/cards",
  /** GET ?q=&status=&page= → AdminCardsResponse */
  admin: "/api/admin/cards",
  /** GET → AdminCardResponse */
  adminCard: (id: string) => `/api/admin/cards/${e(id)}`,
} as const;

/* ───────────── Sahifa manzillari (server ham shularni ishlatadi: to‘lovdan qaytish, SMS, Telegram) ───────────── */

export const CARD_PAGES = {
  catalog: "/vizitka/",
  design: (slug: string) => `/vizitka/${slug}/`,
  demo: (slug: string) => `/vizitka/namuna/${slug}/`,
  /** Buyurtma oqimi qobig‘i: /vizitka/buyurtma/_/… (.htaccess) */
  order: (id: string) => `/vizitka/buyurtma/${id}/`,
  payProcessing: (id: string) => `/vizitka/buyurtma/${id}/tolov/jarayonda/`,
  paySuccess: (id: string) => `/vizitka/buyurtma/${id}/tolov/qabul-qilindi/`,
  payFail: (id: string) => `/vizitka/buyurtma/${id}/tolov/xato/`,
  ready: (id: string) => `/vizitka/buyurtma/${id}/tayyor/`,
  cabinetList: "/kabinet/vizitkalar/",
  /** Kabinet qobig‘i: /kabinet/v/_/… (.htaccess) */
  cabinetCard: (id: string) => `/kabinet/v/${id}/`,
  admin: "/admin/vizitkalar/",
  /** Ommaviy vizitka */
  public: (slug: string) => `/v/${slug}/`,
} as const;
