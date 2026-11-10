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
  /** Asosiy marosim (birinchisi) — eski ma'lumotlar bilan moslik uchun */
  ceremony: Ceremony;
  /** Shablon mos keladigan barcha marosimlar (bir nechta bo‘lishi mumkin). Bo‘lmasa — faqat `ceremony` */
  ceremonies?: Ceremony[];
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
    phoneEn?: string;
    laptopEn?: string;
    phoneScrollEn?: string;
    laptopScrollEn?: string;
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
  /** Inglizcha tavsif (/en/ sahifalarida) */
  descriptionEn?: string;
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
    ceremonies: ["nikoh", "fotiha"],
    style: "milliy",
    priceOld: 249000,
    price: 199000,
    featured: true,
    description: "Bordo baxmal, muhrlangan maktub va anor bezaklari. Muhr ochilgach — ravoqli muqova, otkritka-manzil, polaroid hikoya va chipta-javob.",
    descriptionRu: "Бордовый бархат, запечатанное письмо и гранатовые узоры. После вскрытия печати — арочная обложка, открытка с адресом, история в полароидах и билет-ответ.",
    descriptionEn: "Burgundy velvet, a sealed letter and pomegranate ornaments. Once the seal is broken — an arched cover, a card with the address, a story in polaroids and a reply ticket.",
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
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Klassik", "Kechki rasmiy", "Milliy", "Ixtiyoriy"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Erkaklar — kostyum-shim, ayollar — marosim ko‘ylagi", max: 160 },
      { key: "storyText", type: "textarea", label: "Bizning hikoyamiz", placeholder: "Universitet kutubxonasida boshlangan hikoya — endi bir umrlik.", max: 400, hint: "Ixtiyoriy" },
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
    ceremonies: ["nikoh", "fotiha"],
    style: "milliy",
    priceOld: 249000,
    price: 199000,
    featured: true,
    description: "Zumrad yashil damask, oltin muhrli konvert va bog‘ manzarasi. Konvert ochilgach — madrasa ravog‘i, parda ortidagi bog‘, ravoqli suratlar va konvert-javob.",
    descriptionRu: "Изумрудный дамаск, конверт с золотой печатью и садовый пейзаж. После открытия конверта — арка медресе, сад за занавесом, фото в арках и конверт-ответ.",
    descriptionEn: "Emerald damask, an envelope with a golden seal and a garden scene. Once the envelope opens — a madrasa arch, a garden behind the curtain, photos in arches and a reply envelope.",
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
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Klassik", "Kechki rasmiy", "Milliy", "Ixtiyoriy"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Erkaklar — kostyum-shim, ayollar — marosim ko‘ylagi", max: 160 },
      { key: "storyText", type: "textarea", label: "Bizning hikoyamiz", placeholder: "Universitet kutubxonasida boshlangan hikoya — endi bir umrlik.", max: 400, hint: "Ixtiyoriy" },
      { key: "caption", type: "text", label: "Polaroid yozuvi", placeholder: "Bir umrga", max: 24 },
    ],
  },
  {
    number: 3,
    slug: "parvoz",
    name: "Parvoz",
    ceremony: "nikoh",
    ceremonies: ["nikoh", "fotiha"],
    style: "zamonaviy",
    priceOld: 249000,
    price: 199000,
    featured: true,
    description: "Osmon va bulutlar orasidan ochiladigan taklifnoma. Samolyot bulutlar ortiga uchib ketgach — chipta ko‘rinishidagi taklif, illyuminator ortidagi taklif matni, to‘yga qadar sanoq, to‘y dasturi va mehmonlar javobi.",
    descriptionRu: "Приглашение, которое открывается среди неба и облаков. Когда самолёт скрывается за облаками — приглашение в виде билета, текст в иллюминаторе, отсчёт до торжества, программа и ответы гостей.",
    descriptionEn: "An invitation that opens among the sky and clouds. When the plane disappears into the clouds — an invitation in the form of a ticket, text in a porthole, a countdown, the programme and guest replies.",
    palette: ["#1C2B45", "#A8BCD6", "#EFA97E", "#F6F1E8"],
    sample: { a: "Jasur", b: "Madina", date: "12 · 09 · 2026", venue: "Sky Terrace", time: "17:30" },
    theme: { bg: ["#1c2b45", "#17233a"], ink: "#f4e9d8", accent: "#efa97e", soft: "#a8bcd6", script: "cormorant", color: "moviy" },
    fields: [
      {
        key: "program",
        type: "list",
        label: "To‘y dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Kutib olish", max: 60 },
          note: { type: "text", label: "Izoh", placeholder: "Welcome-drink va jonli musiqa", max: 80 },
        },
      },
      { key: "venueNote", type: "text", label: "Manzil izohi", placeholder: "Mehmonlar uchun bepul avtoturargoh mavjud", max: 80, hint: "Ixtiyoriy" },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Klassik", "Kechki rasmiy", "Milliy", "Ixtiyoriy"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Erkaklar — kostyum-shim, ayollar — marosim ko‘ylagi", max: 160 },
      { key: "story1", type: "text", label: "1-surat yozuvi", placeholder: "Uchrashuv · 2021", max: 28 },
      { key: "story2", type: "text", label: "2-surat yozuvi", placeholder: "Unashtiruv · 2025", max: 28 },
      { key: "quote", type: "textarea", label: "Iqtibos", placeholder: "Yo‘l qanchalik uzoq bo‘lmasin, eng go‘zal manzil — bir-birimiz.", max: 160, hint: "Ixtiyoriy" },
    ],
  },
  {
    number: 4,
    slug: "shato",
    name: "Shato",
    ceremony: "nikoh",
    ceremonies: ["nikoh", "fotiha"],
    style: "romantik",
    priceOld: 249000,
    price: 199000,
    featured: true,
    description: "Akvarel bog‘ va oltin darvoza. Darvoza ochilgach — ark ichidagi surat va taklif matni, kalendar va sanoq, qasr ko‘rinishidagi manzil, to‘y dasturi va mehmonlar javobi.",
    descriptionRu: "Акварельный сад и золотые ворота. Когда ворота открываются — фото в арке и текст приглашения, календарь и отсчёт, адрес на фоне замка, программа и ответы гостей.",
    descriptionEn: "A watercolour garden and golden gates. Once the gates open — a photo in an arch with the invitation text, a calendar and countdown, the venue with a château view, the programme and guest replies.",
    palette: ["#7A7D5C", "#DCE7F0", "#B08D57", "#FBF4EC"],
    sample: { a: "Jasur", b: "Madina", date: "12 · 09 · 2026", venue: "Chateau Blanc", time: "16:00" },
    theme: { bg: ["#7a7d5c", "#5f6247"], ink: "#fbf4ec", accent: "#b08d57", soft: "#dce7f0", script: "cormorant", color: "krem" },
    fields: [
      {
        key: "program",
        type: "list",
        label: "To‘y dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Mehmonlar yig‘ilishi", max: 60 },
          note: { type: "text", label: "Izoh", placeholder: "Qadrdonlarimiz bilan uchrashamiz", max: 80 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Klassik", "Kechki rasmiy", "Milliy", "Ixtiyoriy"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Erkaklar — kostyum-shim, ayollar — marosim ko‘ylagi", max: 160 },
      { key: "gifts", type: "textarea", label: "Sovg‘alar haqida", placeholder: "Yoningizda bo‘lishingiz — biz uchun eng katta sovg‘a.", max: 200, hint: "Ixtiyoriy" },
      { key: "flowers", type: "textarea", label: "Gullar haqida", placeholder: "Guldasta o‘rniga iliq tilaklaringizni olib keling.", max: 200, hint: "Ixtiyoriy" },
      { key: "contact", type: "textarea", label: "Aloqa", placeholder: "Savollar bo‘yicha tashkilotchimiz Malikaga murojaat qiling.", max: 200, hint: "Ixtiyoriy" },
      { key: "phone", type: "text", label: "Telefon raqami", placeholder: "+998 90 123 45 67", max: 24, hint: "«Qo‘ng‘iroq» tugmasi uchun" },
      { key: "telegram", type: "text", label: "Telegram", placeholder: "@username", max: 40, hint: "«Telegram» tugmasi uchun" },
      { key: "quote", type: "textarea", label: "Iqtibos", placeholder: "Sevgi — bu bir-biriga emas, balki birga bir tomonga qarash.", max: 160, hint: "Ixtiyoriy" },
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
    // Inglizcha posterlar (fayl bor bo‘lsa)
    ...Object.fromEntries(
      (
        [
          ["phoneEn", "phone"],
          ["laptopEn", "laptop"],
          ["phoneScrollEn", "phone-long"],
          ["laptopScrollEn", "laptop-long"],
        ] as const
      )
        .filter(([, f]) => tplImgVersions[`${t.slug}-en-${f}.webp`])
        .map(([k, f]) => [k, tplImg(`${t.slug}-en-${f}.webp`)]),
    ),
  },
}));

/** Joriy tilga mos mokap rasmlari: ruschada *Ru variantlari bo‘lsa — o‘shalar */
export function tplImages(t: Pick<Template, "images">, locale: "uz" | "ru" | "en") {
  const im = t.images;
  if (!im || locale === "uz") return im;
  if (locale === "en")
    return {
      phone: im.phoneEn ?? im.phone,
      laptop: im.laptopEn ?? im.laptop,
      phoneScroll: im.phoneScrollEn ?? im.phoneScroll,
      laptopScroll: im.laptopScrollEn ?? im.laptopScroll,
    };
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

/** Har bir dizaynda suratlar qayerga tushadi (buyurtma formasida joy-joy ko‘rsatiladi) */
export const PHOTO_SLOTS: Record<string, { title: string; where: string }[]> = {
  anor: [
    { title: "Asosiy surat", where: "Muqovada, ravoq ichida" },
    { title: "Hikoya · 1", where: "«Bizning hikoyamiz» polaroidi" },
    { title: "Hikoya · 2", where: "«Bizning hikoyamiz» polaroidi" },
    { title: "Hikoya · 3", where: "«Bizning hikoyamiz» polaroidi" },
  ],
  zumrad: [
    { title: "Asosiy surat", where: "Ochilishdagi polaroid" },
    { title: "Lahza · 1", where: "«Bizning lahzalar» ravog‘i" },
    { title: "Lahza · 2", where: "«Bizning lahzalar» polaroidi" },
  ],
  parvoz: [
    { title: "Surat · 1", where: "«Lahzalar» — katta polaroid" },
    { title: "Surat · 2", where: "«Lahzalar» — kichik polaroid" },
  ],
  shato: [
    { title: "Asosiy surat", where: "Taklif matni ustida, ark ichida" },
    { title: "Surat · 2", where: "Iqtibos yonida, ark ichida" },
  ],
};
export const photoSlots = (t: Pick<Template, "slug" | "base">) =>
  PHOTO_SLOTS[designSlug(t)] ?? Array.from({ length: 6 }, (_, i) => ({ title: `Surat · ${i + 1}`, where: "Fotogalereya" }));

/** Shablonning barcha marosimlari (kamida bittasi) */
export function tplCeremonies(t: Pick<Template, "ceremony" | "ceremonies">): Ceremony[] {
  const list = (t.ceremonies ?? []).filter((c) => c in ceremonyLabel);
  return list.length ? Array.from(new Set(list)) : [t.ceremony];
}
/** Shablon shu marosimga mosmi */
export function hasCeremony(t: Pick<Template, "ceremony" | "ceremonies">, c: Ceremony | ""): boolean {
  return !c || tplCeremonies(t).includes(c);
}
/** Marosimlar nomi: «Nikoh to‘yi, Fotiha to‘yi» */
export function ceremonyNames(t: Pick<Template, "ceremony" | "ceremonies">, tr: (s: string) => string = (s) => s): string {
  return tplCeremonies(t)
    .map((c) => tr(ceremonyLabel[c]))
    .join(", ");
}
