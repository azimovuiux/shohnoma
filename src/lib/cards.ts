/**
 * «Vizitka» dizaynlari reestri, forma sxemasi (CARD_FIELDS) va namuna ma’lumot (CARD_DEMO).
 * scripts/export-cards.mts → php/api/lib/cards.json (server narx va tekshiruvni shu fayldan oladi).
 * Figma: D0wt4iM9V6ym59nF6npes7 — Noir 552:13115 / 559:12639, Lumen 570:12661 / 572:12709.
 */
import type { CardContent, CardDesignSlug, CardLang, CardSocialKind, CardLinkIcon } from "./cardTypes.ts";

export interface CardDesign {
  slug: CardDesignSlug;
  name: string;
  number: number;
  price: number;
  priceOld: number;
  /** Katalog tavsifi (uz/ru/en) */
  description: { uz: string; ru: string; en: string };
  /** Asosiy ranglar (katalog nuqtalari, OG) */
  palette: string[];
  /** Dizayn qorong‘imi (status bar, OG matn rangi) */
  dark: boolean;
  /** Shu dizaynda ishlatiladigan bo‘limlar — forma faqat shularni ko‘rsatadi (ma’lumot baribir saqlanadi) */
  sections: CardSectionKey[];
  /** Nechta rasm kerak: [0] — portret; qolganlari galereya */
  photoSlots: number;
  figma: { mobile: string; laptop: string; assets: string; motion?: string };
  active: boolean;
}

export type CardSectionKey = "directions" | "stats" | "companies" | "socials" | "links" | "leadForm" | "address";

export const CARD_DESIGNS: CardDesign[] = [
  {
    slug: "v-noir",
    name: "Noir",
    number: 1,
    price: 199000,
    priceOld: 249000,
    description: {
      uz: "Qora fon, katta portret va gazeta uslubidagi tipografika. Hamkorlik yo‘nalishlari, raqamlar, kompaniyalar va «kontakt qoldiring» formasi — tadbirkor va rahbarlar uchun.",
      ru: "Тёмный фон, крупный портрет и типографика в журнальном стиле. Направления сотрудничества, цифры, компании и форма «оставьте контакт» — для предпринимателей и руководителей.",
      en: "Dark background, a large portrait and editorial typography. Partnership areas, key numbers, companies and a “leave your contact” form — for entrepreneurs and executives.",
    },
    palette: ["#0E0D0B", "#1A1814", "#C9A36A", "#F2EDE4"],
    dark: true,
    sections: ["directions", "stats", "companies", "leadForm", "address"],
    photoSlots: 2,
    figma: { mobile: "552:13115", laptop: "559:12639", assets: "545:12620" },
    active: true,
  },
  {
    slug: "v-lumen",
    name: "Lumen",
    number: 2,
    price: 199000,
    priceOld: 249000,
    description: {
      uz: "Yorug‘ link sahifa: portret, tezkor tugmalar, ijtimoiy tarmoqlar bentosi va havolalar. Blogerlar, mentorlar va shaxsiy brend uchun.",
      ru: "Светлая link-страница: портрет, быстрые кнопки, бенто соцсетей и ссылки. Для блогеров, менторов и личного бренда.",
      en: "A bright link page: portrait, quick actions, a social bento grid and links. For creators, mentors and personal brands.",
    },
    palette: ["#F6F1EA", "#FFFFFF", "#B4876B", "#2A211C"],
    dark: false,
    sections: ["socials", "links"],
    photoSlots: 4,
    figma: { mobile: "570:12661", laptop: "572:12709", assets: "568:12666", motion: "573:12617" },
    active: true,
  },
];

export const cardDesign = (slug: string): CardDesign | undefined => CARD_DESIGNS.find((d) => d.slug === slug);

/* ───────────── Forma sxemasi ─────────────
 * Server (lib/cards.php) shu sxema bo‘yicha tekshiradi: turi, majburiyligi, uzunligi, ro‘yxat soni.
 * localized: true — qiymat { uz, ru?, en? }; required bo‘lsa faqat uz majburiy.
 * label/hint/placeholder — o‘zbekcha (UI t() bilan tarjima qiladi).
 */
export type CardFieldType = "text" | "textarea" | "tel" | "email" | "url" | "image" | "toggle" | "select";
export interface CardFieldSpec {
  type: CardFieldType;
  label: string;
  localized?: boolean;
  required?: boolean;
  max?: number;
  placeholder?: string;
  hint?: string;
  options?: string[];
}
export type CardField =
  | ({ key: keyof CardContent; section?: CardSectionKey } & CardFieldSpec)
  | { key: keyof CardContent; type: "list"; label: string; section: CardSectionKey; min: number; max: number; item: Record<string, CardFieldSpec>; hint?: string };

export const SOCIAL_KINDS: CardSocialKind[] = ["instagram", "telegram", "linkedin", "facebook", "youtube", "tiktok", "x", "whatsapp", "website"];
export const LINK_ICONS: CardLinkIcon[] = ["arrow", "calendar", "book", "globe", "download", "pin"];

export const CARD_FIELDS: CardField[] = [
  { key: "fullName", type: "text", label: "Ism va familiya", required: true, max: 80, placeholder: "Aziz Karimov" },
  { key: "position", type: "text", label: "Lavozim", localized: true, required: true, max: 120, placeholder: "Asoschi va bosh direktor" },
  { key: "company", type: "text", label: "Kompaniya", localized: true, max: 120, placeholder: "Karimov Group" },
  { key: "bio", type: "textarea", label: "Qisqa tavsif", localized: true, max: 300, placeholder: "Qurilish, logistika va investitsiyalar.", hint: "Ism ostida chiqadi — 1–2 jumla" },
  { key: "phone", type: "tel", label: "Telefon", required: true, placeholder: "+998 90 123 45 67" },
  { key: "whatsapp", type: "tel", label: "WhatsApp", placeholder: "+998 90 123 45 67", hint: "Bo‘sh bo‘lsa — telefon raqami" },
  { key: "email", type: "email", label: "Email", max: 120, placeholder: "aziz@karimovgroup.uz" },
  { key: "telegram", type: "text", label: "Telegram", max: 64, placeholder: "@azizkarimov" },
  { key: "website", type: "url", label: "Veb-sayt", max: 500, placeholder: "https://karimovgroup.uz" },
  { key: "address", type: "text", label: "Manzil", localized: true, max: 200, section: "address", placeholder: "Toshkent, Amir Temur shoh ko‘chasi, 15" },
  { key: "mapUrl", type: "url", label: "Xarita havolasi", max: 500, section: "address", placeholder: "https://yandex.uz/maps/…" },
  { key: "photos", type: "image", label: "Rasmlar", hint: "Birinchisi — portret (kontakt kartada ham chiqadi)" },
  { key: "logo", type: "image", label: "Logotip" },
  { key: "leadForm", type: "toggle", label: "«Kontakt qoldiring» formasi", section: "leadForm", hint: "Mehmonlar ism va raqamini qoldiradi — sizga Telegram orqali keladi" },
  {
    key: "directions",
    type: "list",
    label: "Hamkorlik yo‘nalishlari",
    section: "directions",
    min: 0,
    max: 6,
    item: {
      title: { type: "text", label: "Yo‘nalish", localized: true, required: true, max: 60, placeholder: "Investitsiya" },
      text: { type: "textarea", label: "Izoh", localized: true, max: 160, placeholder: "Qurilish va agro loyihalarga sheriklik" },
    },
  },
  {
    key: "stats",
    type: "list",
    label: "Raqamlar",
    section: "stats",
    min: 0,
    max: 6,
    item: {
      value: { type: "text", label: "Raqam", required: true, max: 12, placeholder: "$40M+" },
      label: { type: "text", label: "Izoh", localized: true, required: true, max: 48, placeholder: "amalga oshirilgan loyihalar" },
    },
  },
  {
    key: "companies",
    type: "list",
    label: "Kompaniyalar",
    section: "companies",
    min: 0,
    max: 6,
    item: {
      name: { type: "text", label: "Nomi", required: true, max: 60, placeholder: "Karimov Group" },
      period: { type: "text", label: "Davr va rol", localized: true, max: 60, placeholder: "2009 — hozir · Asoschi" },
      text: { type: "textarea", label: "Tavsif", localized: true, max: 240 },
      url: { type: "url", label: "Sayt", max: 500 },
    },
  },
  {
    key: "socials",
    type: "list",
    label: "Ijtimoiy tarmoqlar",
    section: "socials",
    min: 0,
    max: 10,
    item: {
      kind: { type: "select", label: "Tarmoq", required: true, options: SOCIAL_KINDS },
      url: { type: "url", label: "Havola", required: true, max: 500, placeholder: "https://instagram.com/…" },
      handle: { type: "text", label: "Nik", max: 60, placeholder: "@madina.rahimova" },
      title: { type: "text", label: "Sarlavha", localized: true, max: 120, hint: "Masalan, YouTube video nomi" },
      note: { type: "text", label: "Izoh", localized: true, max: 60, placeholder: "48,2K obunachi" },
    },
  },
  {
    key: "links",
    type: "list",
    label: "Havolalar",
    section: "links",
    min: 0,
    max: 10,
    item: {
      title: { type: "text", label: "Sarlavha", localized: true, required: true, max: 80, placeholder: "Konsultatsiyaga yozilish" },
      subtitle: { type: "text", label: "Izoh", localized: true, max: 120, placeholder: "45 daqiqalik onlayn uchrashuv" },
      url: { type: "url", label: "Havola", required: true, max: 500 },
      icon: { type: "select", label: "Belgi", options: LINK_ICONS },
    },
  },
];

/** Rasm cheklovlari (server bilan bir xil) */
export const CARD_LIMITS = { photos: 6, leadName: 80, leadCompany: 120, leadContact: 120, leadPurpose: 40, leadMessage: 1000 } as const;

/** Bo‘sh vizitka (yangi buyurtma) */
export function emptyCardContent(): CardContent {
  return {
    fullName: "",
    position: { uz: "" },
    company: { uz: "" },
    bio: { uz: "" },
    phone: "",
    whatsapp: "",
    email: "",
    telegram: "",
    website: "",
    address: { uz: "" },
    mapUrl: "",
    photos: [],
    logo: null,
    leadForm: true,
    directions: [],
    stats: [],
    companies: [],
    socials: [],
    links: [],
  };
}

/* ───────────── Namuna ma’lumot (Figma matnlari; ru/en — tarjima) ───────────── */

const noir: CardContent = {
  fullName: "Aziz Karimov",
  position: { uz: "Asoschi va bosh direktor", ru: "Основатель и генеральный директор", en: "Founder & CEO" },
  company: { uz: "Karimov Group", ru: "Karimov Group", en: "Karimov Group" },
  bio: {
    uz: "Asoschi va bosh direktor, Karimov Group. Qurilish, logistika va investitsiyalar.",
    ru: "Основатель и генеральный директор Karimov Group. Строительство, логистика и инвестиции.",
    en: "Founder & CEO of Karimov Group. Construction, logistics and investments.",
  },
  phone: "+998901234567",
  whatsapp: "",
  email: "aziz@karimovgroup.uz",
  telegram: "@azizkarimov",
  website: "https://karimovgroup.uz",
  address: {
    uz: "Toshkent, Amir Temur shoh ko‘chasi, 15",
    ru: "Ташкент, проспект Амира Темура, 15",
    en: "15 Amir Temur Avenue, Tashkent",
  },
  mapUrl: "",
  photos: [],
  logo: null,
  leadForm: true,
  directions: [
    {
      title: { uz: "Investitsiya", ru: "Инвестиции", en: "Investment" },
      text: {
        uz: "Qurilish va agro loyihalarga sheriklik, $500K dan boshlab",
        ru: "Партнёрство в строительных и агропроектах, от $500K",
        en: "Partnership in construction and agro projects, from $500K",
      },
    },
    {
      title: { uz: "Qurilish loyihalari", ru: "Строительные проекты", en: "Construction projects" },
      text: {
        uz: "Turar-joy va tijorat obyektlari: loyihadan topshirishgacha",
        ru: "Жилые и коммерческие объекты: от проекта до сдачи",
        en: "Residential and commercial buildings: from design to handover",
      },
    },
    {
      title: { uz: "Xalqaro logistika", ru: "Международная логистика", en: "International logistics" },
      text: {
        uz: "Markaziy Osiyo — Yevropa yo‘nalishida yuk tashish",
        ru: "Грузоперевозки по направлению Центральная Азия — Европа",
        en: "Freight between Central Asia and Europe",
      },
    },
  ],
  stats: [
    { value: "15", label: { uz: "yil boshqaruv tajribasi", ru: "лет управленческого опыта", en: "years of leadership" } },
    { value: "$40M+", label: { uz: "amalga oshirilgan loyihalar", ru: "реализованных проектов", en: "in completed projects" } },
    { value: "120+", label: { uz: "doimiy hamkor", ru: "постоянных партнёров", en: "long-term partners" } },
    { value: "4", label: { uz: "davlatda faoliyat", ru: "страны присутствия", en: "countries of operation" } },
  ],
  companies: [
    {
      name: "Karimov Group",
      period: { uz: "2009 — hozir · Asoschi", ru: "2009 — н. в. · Основатель", en: "2009 — present · Founder" },
      text: {
        uz: "Toshkent va Samarqandda 40 dan ortiq turar-joy va tijorat obyektini qurgan bosh pudratchi.",
        ru: "Генеральный подрядчик, построивший более 40 жилых и коммерческих объектов в Ташкенте и Самарканде.",
        en: "General contractor behind 40+ residential and commercial buildings in Tashkent and Samarkand.",
      },
    },
    {
      name: "Silk Logistics",
      period: { uz: "2014 — hozir · Hammuassis", ru: "2014 — н. в. · Сооснователь", en: "2014 — present · Co-founder" },
      text: {
        uz: "Markaziy Osiyo va Yevropa o‘rtasida yuk tashish va ombor xizmatlari.",
        ru: "Грузоперевозки и складские услуги между Центральной Азией и Европой.",
        en: "Freight and warehousing between Central Asia and Europe.",
      },
    },
    {
      name: "Agro Invest",
      period: { uz: "2019 — hozir · Investor", ru: "2019 — н. в. · Инвестор", en: "2019 — present · Investor" },
      text: {
        uz: "Intensiv bog‘lar va issiqxona loyihalariga investitsiyalar.",
        ru: "Инвестиции в интенсивные сады и тепличные проекты.",
        en: "Investments in intensive orchards and greenhouse projects.",
      },
    },
  ],
  socials: [
    { kind: "linkedin", url: "https://linkedin.com/in/azizkarimov", handle: "Aziz Karimov" },
    { kind: "telegram", url: "https://t.me/azizkarimov", handle: "@azizkarimov" },
  ],
  links: [],
};

const lumen: CardContent = {
  fullName: "Madina Rahimova",
  position: { uz: "Asoschi", ru: "Основатель", en: "Founder" },
  company: { uz: "Lumen Consulting", ru: "Lumen Consulting", en: "Lumen Consulting" },
  bio: {
    uz: "Lumen Consulting asoschisi. Ayol rahbarlar uchun biznes strategiya va mentorlik.",
    ru: "Основатель Lumen Consulting. Бизнес-стратегия и менторство для женщин-руководителей.",
    en: "Founder of Lumen Consulting. Business strategy and mentoring for women leaders.",
  },
  phone: "+998907654321",
  whatsapp: "+998907654321",
  email: "madina@lumenconsulting.uz",
  telegram: "@madinarahimova",
  website: "https://lumenconsulting.uz",
  address: { uz: "" },
  mapUrl: "",
  photos: [],
  logo: null,
  leadForm: false,
  directions: [],
  stats: [],
  companies: [],
  socials: [
    {
      kind: "instagram",
      url: "https://instagram.com/madina.rahimova",
      handle: "@madina.rahimova",
      note: { uz: "48,2K obunachi", ru: "48,2K подписчиков", en: "48.2K followers" },
    },
    {
      kind: "linkedin",
      url: "https://linkedin.com/in/madinarahimova",
      handle: "LinkedIn",
      note: { uz: "3 400+ aloqa · Lumen Consulting asoschisi", ru: "3 400+ контактов · основатель Lumen Consulting", en: "3,400+ connections · Founder of Lumen Consulting" },
    },
    {
      kind: "telegram",
      url: "https://t.me/lumenconsulting",
      handle: "Telegram kanal",
      title: { uz: "Telegram kanal", ru: "Telegram-канал", en: "Telegram channel" },
      note: { uz: "12K a’zo · haftalik biznes eslatmalar", ru: "12K участников · еженедельные бизнес-заметки", en: "12K members · weekly business notes" },
    },
    {
      kind: "youtube",
      url: "https://youtube.com/@madinarahimova",
      title: {
        uz: "Ayol rahbar: qaror qabul qilishning 5 qoidasi",
        ru: "Женщина-руководитель: 5 правил принятия решений",
        en: "Women in leadership: 5 rules of decision-making",
      },
      note: { uz: "YouTube · 24K obunachi", ru: "YouTube · 24K подписчиков", en: "YouTube · 24K subscribers" },
    },
    { kind: "facebook", url: "https://facebook.com/madinarahimova", handle: "Facebook" },
    { kind: "tiktok", url: "https://tiktok.com/@madinarahimova", handle: "TikTok" },
  ],
  links: [
    {
      title: { uz: "Konsultatsiyaga yozilish", ru: "Записаться на консультацию", en: "Book a consultation" },
      subtitle: { uz: "45 daqiqalik onlayn uchrashuv", ru: "Онлайн-встреча на 45 минут", en: "45-minute online meeting" },
      url: "https://lumenconsulting.uz/konsultatsiya",
      icon: "calendar",
    },
    {
      title: { uz: "«Ayol va biznes» kitobi", ru: "Книга «Женщина и бизнес»", en: "“Women and Business” book" },
      subtitle: { uz: "Buyurtma berish", ru: "Заказать", en: "Order now" },
      url: "https://lumenconsulting.uz/kitob",
      icon: "book",
    },
    {
      title: { uz: "Lumen Consulting", ru: "Lumen Consulting", en: "Lumen Consulting" },
      subtitle: { uz: "lumenconsulting.uz", ru: "lumenconsulting.uz", en: "lumenconsulting.uz" },
      url: "https://lumenconsulting.uz",
      icon: "globe",
    },
  ],
};

/**
 * Namuna (katalog, /vizitka/namuna/<slug>/, buyurtma formasi boshlang‘ich preview).
 * Rasmlar B tomonidan public/vizitka/… ga qo‘yiladi — bu yerda bo‘sh (dizayn o‘z namunaviy rasmini ishlatadi).
 */
export const CARD_DEMO: Record<CardDesignSlug, CardContent> = { "v-noir": noir, "v-lumen": lumen };

/** Interfeys tillari (UZ/RU/EN almashtirgich) */
export const CARD_UI_LANGS: CardLang[] = ["uz", "ru", "en"];

/** Server uchun eksport (scripts/export-cards.mts) */
export const cardsExport = { designs: CARD_DESIGNS, fields: CARD_FIELDS, limits: CARD_LIMITS };
