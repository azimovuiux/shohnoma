import { tplImgVersions } from "./tplImgVersions.ts";
/** Shablonlar ro‘yxati — spec §10.1 (narxlar namuna, [Ochiq]) */

export type Ceremony = "nikoh" | "fotiha" | "sunnat" | "tugilgan-kun";
export type Style = "klassik" | "minimal" | "romantik" | "zamonaviy" | "milliy";

export const ceremonyLabel: Record<Ceremony, string> = {
  nikoh: "Nikoh to‘yi",
  fotiha: "Fotiha to‘yi",
  sunnat: "Sunnat to‘yi",
  "tugilgan-kun": "Tug‘ilgan kun",
};

export const styleLabel: Record<Style, string> = {
  klassik: "Klassik",
  minimal: "Minimal",
  romantik: "Romantik",
  zamonaviy: "Zamonaviy",
  milliy: "Milliy",
};

/** Mokap uchun shablon ko‘rinishi (HTML/CSS bilan chiziladi) */
export interface TemplateTheme {
  /** ekran foni (gradient) */
  bg: [string, string];
  /** asosiy matn rangi */
  ink: string;
  /** urg‘u (oltin / aksent) */
  accent: string;
  /** ikkilamchi matn */
  soft: string;
  /** sarlavha shrifti */
  script: "pinyon" | "cinzel" | "cormorant";
  /** rang nomi (filtr uchun) */
  color: "bordo" | "yashil" | "oltin" | "krem" | "moviy" | "qizil" | "pushti";
}

export type FieldType = "text" | "textarea" | "time" | "date" | "number" | "select";
export interface FieldSpec {
  type: FieldType;
  label: string;
  required?: boolean;
  max?: number;
  placeholder?: string;
  options?: string[];
  hint?: string;
}
export type TemplateField =
  | ({ key: string } & FieldSpec)
  | { key: string; type: "list"; label: string; min: number; max: number; item: Record<string, FieldSpec> };

export interface Template {
  number: number;
  slug: string;
  name: string;
  ceremony: Ceremony;
  style: Style;
  priceOld: number;
  price: number;
  featured: boolean;
  description: string;
  palette: string[];
  sample: { a: string; b?: string; date: string; venue: string; time: string };
  theme: TemplateTheme;
  /** Dizayn asosi — qaysi tayyor dizayn (hero varianti, bezaklar, musiqa) ishlatiladi. Bo‘sh bo‘lsa — slug */
  base?: string;
  /** Mokap rasmlari (Figma eksport yoki admin yuklagan) */
  images?: {
    phone?: string;
    laptop?: string;
    phoneScroll?: string;
    laptopScroll?: string;
    /** Ruscha sahifalar uchun mokap rasmlari (bo‘lmasa — o‘zbekchasi) */
    phoneRu?: string;
    laptopRu?: string;
    phoneScrollRu?: string;
    laptopScrollRu?: string;
  };
  /** Katalogda ko‘rinadimi (admin) */
  active?: boolean;
  /** Mijoz ma’lumotlari bilan to‘ldirilgan nusxa — mokapda rasm emas, jonli chizma */
  isLive?: boolean;
  /** "html" — admin ZIP orqali yuklagan shablon (docs/SHABLON-YORIQNOMA.md) */
  kind?: "html";
  version?: number;
  /** HTML shablonning qo‘shimcha maydonlari (buyurtma formasi shulardan quriladi) */
  fields?: TemplateField[];
  /** HTML shablon: jonli ko‘rinish manzili (buyurtma oqimida — mijoz ma’lumotlari bilan) */
  previewUrl?: string;
  /** Ruscha tavsif (/ru/ sahifalarida) */
  descriptionRu?: string;
  /** Standart fon musiqasi — kutubxonadagi trek ID si (admin tanlaydi) */
  musicId?: string | null;
  /** Server: shablonda musiqa tanlanmagan bo‘lsa — kutubxonadagi birinchi trek */
  musicFallback?: string | null;
}

const builtin: Template[] = [
  {
    number: 1,
    slug: "anor",
    name: "Anor",
    ceremony: "nikoh",
    style: "milliy",
    priceOld: 249000,
    price: 199000,
    featured: true,
    description: "Bordo baxmal, muhrlangan maktub va anor bezaklari. Muhr ochilgach — ravoqli muqova, otkritka-manzil, polaroid hikoya va chipta-javob.",
    descriptionRu: "Бордовый бархат, запечатанное письмо и гранатовые узоры. После вскрытия печати — арочная обложка, открытка с адресом, история в полароидах и билет-ответ.",
    palette: ["#7A1E2C", "#4A0F1A", "#C9A25E", "#F3ECE0"],
    sample: { a: "Azizbek", b: "Sevara", date: "12 · 09 · 2026", venue: "«Navro‘z» saroyi", time: "17:00" },
    theme: { bg: ["#7a1e2c", "#4a0f1a"], ink: "#f3ece0", accent: "#c9a25e", soft: "#e8d3a8", script: "cormorant", color: "bordo" },
    fields: [
      { key: "hosts", type: "text", label: "Mezbonlar", placeholder: "Karimovlar va Rahimovlar oilasi", max: 120, hint: "Taklif matni ostida «Hurmat bilan» deb chiqadi" },
      {
        key: "program",
        type: "list",
        label: "To‘y dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Kutib olish", max: 60 },
          note: { type: "text", label: "Izoh", placeholder: "Sharbat va jonli musiqa", max: 80 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Klassik", "Kechki rasmiy", "Milliy", "Ixtiyoriy"], hint: "Tanlanmasa — bo‘lim ko‘rinmaydi" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Erkaklar — kostyum-shim, ayollar — marosim ko‘ylagi", max: 160 },
      { key: "storyText", type: "textarea", label: "Bizning hikoyamiz", placeholder: "Universitet kutubxonasida boshlangan hikoya — endi bir umrlik.", max: 400, hint: "Bo‘sh qolsa — hikoya bo‘limi ko‘rinmaydi. Suratlar: 2–4-suratlar polaroid bo‘lib chiqadi" },
      {
        key: "story",
        type: "list",
        label: "Hikoya lahzalari",
        min: 0,
        max: 3,
        item: {
          year: { type: "text", label: "Yil", placeholder: "2021", max: 12 },
          caption: { type: "text", label: "Lahza", required: true, placeholder: "Tanishuv", max: 40 },
        },
      },
    ],
  },
  {
    number: 2,
    slug: "zumrad",
    name: "Zumrad",
    ceremony: "nikoh",
    style: "milliy",
    priceOld: 249000,
    price: 199000,
    featured: true,
    description: "Zumrad yashil damask, oltin muhrli konvert va bog‘ manzarasi. Konvert ochilgach — madrasa ravog‘i, parda ortidagi bog‘, ravoqli suratlar va konvert-javob.",
    descriptionRu: "Изумрудный дамаск, конверт с золотой печатью и садовый пейзаж. После открытия конверта — арка медресе, сад за занавесом, фото в арках и конверт-ответ.",
    palette: ["#123C2E", "#0C2A20", "#C6A15B", "#F7F3EA"],
    sample: { a: "Azizbek", b: "Sevara", date: "12 · 09 · 2026", venue: "«Navro‘z» saroyi", time: "17:00" },
    theme: { bg: ["#123c2e", "#0c2a20"], ink: "#f7f3ea", accent: "#c6a15b", soft: "#e2c88e", script: "cormorant", color: "yashil" },
    fields: [
      { key: "hosts", type: "text", label: "Mezbonlar", placeholder: "Karimovlar va Rahimovlar oilasi", max: 120, hint: "Taklif matni ostida «Hurmat bilan» deb chiqadi" },
      {
        key: "program",
        type: "list",
        label: "To‘y dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Kutib olish", max: 60 },
          note: { type: "text", label: "Izoh", placeholder: "Sharbat va jonli musiqa", max: 80 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Klassik", "Kechki rasmiy", "Milliy", "Ixtiyoriy"], hint: "Tanlanmasa — bo‘lim ko‘rinmaydi" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Erkaklar — kostyum-shim, ayollar — marosim ko‘ylagi", max: 160 },
      { key: "storyText", type: "textarea", label: "Bizning hikoyamiz", placeholder: "Universitet kutubxonasida boshlangan hikoya — endi bir umrlik.", max: 400, hint: "Bo‘sh qolsa — matn chiqmaydi" },
      { key: "caption", type: "text", label: "Polaroid yozuvi", placeholder: "Bir umrga", max: 24, hint: "1-surat polaroid bo‘lib chiqadi, 2–3-suratlar — ravoq ichida" },
    ],
  },
];

/** Mokap rasmi manzili + versiya (fayl xeshi): rasm yangilansa — brauzer keshidagi eskisi ishlatilmaydi */
const tplImg = (f: string) => `/templates/${f}${tplImgVersions[f] ? `?v=${tplImgVersions[f]}` : ""}`;

/** Kodga kiritilgan asl shablonlar (statik sahifalar shular bilan yig‘iladi) */
export const builtinTemplates: Template[] = builtin.map((t) => ({
  ...t,
  active: true,
  images: {
    phone: tplImg(`${t.slug}-phone.webp`),
    laptop: tplImg(`${t.slug}-laptop.webp`),
    // Kartada scroll bo‘ladigan butun sahifa rasmlari (scripts orqali yoki qo‘lda tayyorlanadi)
    phoneScroll: tplImg(`${t.slug}-phone-long.webp`),
    laptopScroll: tplImg(`${t.slug}-laptop-long.webp`),
    // Ruscha posterlar (fayl bor bo‘lsa)
    ...Object.fromEntries(
      (
        [
          ["phoneRu", "phone"],
          ["laptopRu", "laptop"],
          ["phoneScrollRu", "phone-long"],
          ["laptopScrollRu", "laptop-long"],
        ] as const
      )
        .filter(([, f]) => tplImgVersions[`${t.slug}-ru-${f}.webp`])
        .map(([k, f]) => [k, tplImg(`${t.slug}-ru-${f}.webp`)]),
    ),
  },
}));

/** Joriy tilga mos mokap rasmlari: ruschada *Ru variantlari bo‘lsa — o‘shalar */
export function tplImages(t: Pick<Template, "images">, locale: "uz" | "ru") {
  const im = t.images;
  if (!im || locale !== "ru") return im;
  return {
    phone: im.phoneRu ?? im.phone,
    laptop: im.laptopRu ?? im.laptop,
    phoneScroll: im.phoneScrollRu ?? im.phoneScroll,
    laptopScroll: im.laptopScrollRu ?? im.laptopScroll,
  };
}
export const builtinSlugs = builtinTemplates.map((t) => t.slug);

declare global {
  interface Window {
    __SHOHNOMA_TEMPLATES__?: Template[];
  }
}

/** Brauzerda — admin boshqaradigan ro‘yxat (/api/templates.js, <head> da yuklanadi); aks holda — asl ro‘yxat */
function loadAll(): Template[] {
  if (typeof window !== "undefined") {
    const w = window.__SHOHNOMA_TEMPLATES__;
    if (Array.isArray(w) && w.length) return w;
  }
  return builtinTemplates;
}
const all: Template[] = loadAll();
const sortByNumber = (a: Template, b: Template) => a.number - b.number;

/** Barcha shablonlar (faollari), raqam bo‘yicha */
export const templates: Template[] = all.filter((t) => t.active !== false).sort(sortByNumber);
export const featuredTemplates = templates.filter((t) => t.featured);

/** Slug bo‘yicha (nofaol shablonlar ham — eski buyurtmalar uchun) */
export function getTemplate(slug: string) {
  return all.find((t) => t.slug === slug);
}

/** Dizayn asosi slug'i (hero varianti, bezak rasmlari, musiqa) */
export const designSlug = (t: Pick<Template, "slug" | "base">) => t.base || t.slug;

/** Jonli ro‘yxat (hooklar uchun, src/lib/useTemplates.ts) */
export const allTemplates = all;

export const colorLabel: Record<TemplateTheme["color"], string> = {
  bordo: "Bordo",
  yashil: "Yashil",
  oltin: "Oltin",
  krem: "Krem",
  moviy: "Moviy",
  qizil: "Qizil",
  pushti: "Pushti",
};

/** Har bir taklifnomada bor imkoniyatlar (spec §6.1/8) */
export const templateFeatures = [
  "To‘yga qadar sanoq",
  "Fotogalereya",
  "Marosim dasturi",
  "Fon musiqasi",
  "Manzil va xarita",
  "Mehmonlar javobi",
];
