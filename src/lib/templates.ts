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
}

const nikohSample = { a: "Jasur", b: "Madina", date: "12 · 09 · 2026", venue: "Oqsaroy to‘yxonasi", time: "18:00" };

export const templates: Template[] = [
  {
    number: 1,
    slug: "bordo-maktub",
    name: "Bordo maktub",
    ceremony: "nikoh",
    style: "klassik",
    priceOld: 199000,
    price: 149000,
    featured: true,
    description: "To‘q bordo fonda oltin naqshli konvert — muhr ochilib, taklif matni chiqadi. Klassik va tantanali.",
    palette: ["#6B2436", "#4B1220", "#D9B97A", "#F5EDE0"],
    sample: nikohSample,
    theme: { bg: ["#7a2335", "#4b1220"], ink: "#f3e7d3", accent: "#d9b97a", soft: "#e8d3a8", script: "pinyon", color: "bordo" },
  },
  {
    number: 2,
    slug: "yashil-muhr",
    name: "Yashil muhr",
    ceremony: "fotiha",
    style: "minimal",
    priceOld: 179000,
    price: 139000,
    featured: true,
    description: "Krem qog‘oz, to‘q yashil muhr va nozik serif yozuvlar. Sokin va oddiy.",
    palette: ["#2F4A3A", "#F4EFE4", "#B49A62"],
    sample: { a: "Sardor", b: "Nilufar", date: "04 · 10 · 2026", venue: "Bog‘i Eram", time: "16:00" },
    theme: { bg: ["#f6f1e6", "#ece3d1"], ink: "#2f4a3a", accent: "#b49a62", soft: "#5f6f61", script: "cormorant", color: "yashil" },
  },
  {
    number: 3,
    slug: "oltin-ravoq",
    name: "Oltin ravoq",
    ceremony: "nikoh",
    style: "romantik",
    priceOld: 249000,
    price: 189000,
    featured: true,
    description: "Oltin ravoq ichida ismlar, atirgullar bilan bezatilgan. Nafis va romantik.",
    palette: ["#FAF4EA", "#F1E3D0", "#9A7444", "#E9B8A8"],
    sample: { a: "Bekzod", b: "Malika", date: "27 · 08 · 2026", venue: "Navro‘z saroyi", time: "17:00" },
    theme: { bg: ["#faf4ea", "#f1e3d0"], ink: "#7a5a33", accent: "#9a7444", soft: "#8a6538", script: "pinyon", color: "oltin" },
  },
  {
    number: 4,
    slug: "baxt-reysi",
    name: "Baxt reysi",
    ceremony: "nikoh",
    style: "zamonaviy",
    priceOld: 229000,
    price: 179000,
    featured: true,
    description: "Samolyot chiptasi uslubida: “baxt reysi” — sana, yo‘nalish va o‘rindiq. Zamonaviy va quvnoq.",
    palette: ["#1E3A5F", "#F7F3EC", "#C9A25E"],
    sample: { a: "Aziz", b: "Shahnoza", date: "19 · 09 · 2026", venue: "Hyatt Regency", time: "18:30" },
    theme: { bg: ["#f7f3ec", "#e9e2d4"], ink: "#1e3a5f", accent: "#c9a25e", soft: "#5a6b80", script: "cinzel", color: "moviy" },
  },
  {
    number: 5,
    slug: "zaytun-maktub",
    name: "Zaytun maktub",
    ceremony: "nikoh",
    style: "minimal",
    priceOld: 169000,
    price: 129000,
    featured: true,
    description: "Zaytun novdalari va oddiy maktub kompozitsiyasi. Tinch, tabiiy ranglar.",
    palette: ["#6E7550", "#F3EFE3", "#A69467"],
    sample: { a: "Doston", b: "Gulnoza", date: "10 · 10 · 2026", venue: "Zarafshon to‘yxonasi", time: "17:30" },
    theme: { bg: ["#f3efe3", "#e6e1cf"], ink: "#4d5536", accent: "#a69467", soft: "#6e7550", script: "cormorant", color: "yashil" },
  },
  {
    number: 6,
    slug: "qirolicha",
    name: "Qirolicha",
    ceremony: "tugilgan-kun",
    style: "zamonaviy",
    priceOld: 159000,
    price: 119000,
    featured: false,
    description: "Toj va pushti-oltin ranglar bilan tug‘ilgan kun taklifnomasi.",
    palette: ["#E8C4C4", "#FFF7F3", "#B8875A"],
    sample: { a: "Sevara", date: "15 · 11 · 2026", venue: "Plov Center", time: "19:00" },
    theme: { bg: ["#fff7f3", "#f4dcd6"], ink: "#7b3f4a", accent: "#b8875a", soft: "#9c6b6b", script: "pinyon", color: "pushti" },
  },
  {
    number: 7,
    slug: "moviy-abr",
    name: "Moviy abr",
    ceremony: "sunnat",
    style: "milliy",
    priceOld: 189000,
    price: 149000,
    featured: true,
    description: "Moviy abr bezaklari va milliy naqshlar. Sunnat to‘yi uchun yorqin va tantanali.",
    palette: ["#1F4E79", "#F4F1EA", "#C9A25E"],
    sample: { a: "Muhammadali", date: "20 · 09 · 2026", venue: "Oq oltin to‘yxonasi", time: "11:00" },
    theme: { bg: ["#1f4e79", "#14324f"], ink: "#f4f1ea", accent: "#c9a25e", soft: "#cfdbe8", script: "cinzel", color: "moviy" },
  },
  {
    number: 8,
    slug: "sharq-oqshomi",
    name: "Sharq oqshomi",
    ceremony: "sunnat",
    style: "milliy",
    priceOld: 219000,
    price: 169000,
    featured: true,
    description: "Sharqona oqshom: to‘q ko‘k fon, oltin chiroqlar va girih naqshi.",
    palette: ["#1B2340", "#C9A25E", "#F5EDE0"],
    sample: { a: "Abdulloh", date: "03 · 10 · 2026", venue: "Shohona to‘yxonasi", time: "10:00" },
    theme: { bg: ["#232c4f", "#141a33"], ink: "#f5ede0", accent: "#c9a25e", soft: "#c9cde0", script: "cinzel", color: "moviy" },
  },
  {
    number: 9,
    slug: "qizil-atirgul",
    name: "Qizil atirgul",
    ceremony: "nikoh",
    style: "klassik",
    priceOld: 199000,
    price: 159000,
    featured: true,
    description: "Qizil atirgullar va krem fon. Klassik nikoh taklifnomasi.",
    palette: ["#9E1B32", "#FBF5EE", "#C9A25E"],
    sample: { a: "Javohir", b: "Dilfuza", date: "25 · 09 · 2026", venue: "Grand Saroy", time: "18:00" },
    theme: { bg: ["#fbf5ee", "#f2e4d8"], ink: "#9e1b32", accent: "#c9a25e", soft: "#8a5a5a", script: "pinyon", color: "qizil" },
  },
  {
    number: 10,
    slug: "oltin-darvoza",
    name: "Oltin darvoza",
    ceremony: "nikoh",
    style: "klassik",
    priceOld: 249000,
    price: 199000,
    featured: true,
    description: "Qora-oltin darvoza ochilib, ichkarida ismlar paydo bo‘ladi. Hashamatli.",
    palette: ["#1B1813", "#C9A25E", "#F5EDE0"],
    sample: { a: "Shohruh", b: "Zarina", date: "08 · 10 · 2026", venue: "Versal to‘yxonasi", time: "18:00" },
    theme: { bg: ["#24201a", "#120f0b"], ink: "#f5ede0", accent: "#c9a25e", soft: "#d8c9a8", script: "cinzel", color: "oltin" },
  },
  {
    number: 11,
    slug: "lola-bog",
    name: "Lola bog‘",
    ceremony: "fotiha",
    style: "romantik",
    priceOld: 179000,
    price: 139000,
    featured: true,
    description: "Bahoriy lolalar va pastel ranglar. Fotiha to‘yi uchun yengil va nozik.",
    palette: ["#D97A7A", "#FFF8F2", "#8BA27A"],
    sample: { a: "Ulug‘bek", b: "Mohinur", date: "18 · 10 · 2026", venue: "Lola bog‘i", time: "15:00" },
    theme: { bg: ["#fff8f2", "#f7e3dc"], ink: "#a2484e", accent: "#8ba27a", soft: "#9a6a6a", script: "pinyon", color: "pushti" },
  },
  {
    number: 12,
    slug: "bahor-bogi",
    name: "Bahor bog‘i",
    ceremony: "nikoh",
    style: "romantik",
    priceOld: 169000,
    price: 129000,
    featured: false,
    description: "Gullagan bahor bog‘i, yashil-pushti ranglar. Yengil va quvnoq.",
    palette: ["#A7C4A0", "#FFF9F4", "#E3A6B4"],
    sample: { a: "Farrux", b: "Kamola", date: "30 · 09 · 2026", venue: "Bahor to‘yxonasi", time: "17:00" },
    theme: { bg: ["#fff9f4", "#e9f0e3"], ink: "#4f6a4a", accent: "#e3a6b4", soft: "#6f8a6a", script: "pinyon", color: "yashil" },
  },
];

export const featuredTemplates = templates.filter((t) => t.featured);

export function getTemplate(slug: string) {
  return templates.find((t) => t.slug === slug);
}

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
