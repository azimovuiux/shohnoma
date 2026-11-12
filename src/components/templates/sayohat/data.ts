/** Sayohat shabloni — namuna matnlar va sahna o‘lchamlari (Figma 366:5726 mobil / 366:6507 laptop, panorama 364:5730) */
import type { ProgramItem } from "../anor/data";

export const P = "/templates/sayohat";

export type SayohatDemo = {
  message: string;
  venueTitle: string;
  address: string;
  program: ProgramItem[];
  dressCode: string;
};

/** Namuna — Figma’dagi matnlar */
export const SAYOHAT_DEMO: SayohatDemo = {
  message: "Hayotimizning eng go‘zal sayohatini boshlayapmiz. Shu yo‘lda — nikoh to‘yimizda — yonimizda bo‘lishingizni chin dildan istaymiz.",
  venueTitle: "«Bahor» to‘yxonasi",
  address: "Toshkent sh., Amir Temur ko‘chasi, 108",
  program: [
    { time: "17:00", title: "Mehmonlarni kutib olish" },
    { time: "17:40", title: "Nikoh marosimi" },
    { time: "18:30", title: "Bazm va raqs" },
    { time: "21:00", title: "To‘y torti" },
  ],
  dressCode: "Klassik",
};

export const SAYOHAT_DEMO_RU: SayohatDemo = {
  message: "Мы начинаем самое прекрасное путешествие в нашей жизни. От всего сердца хотим, чтобы на этом пути — на нашей свадьбе — вы были рядом.",
  venueTitle: "Ресторан «Бахор»",
  address: "г. Ташкент, ул. Амира Темура, 108",
  program: [
    { time: "17:00", title: "Встреча гостей" },
    { time: "17:40", title: "Церемония никаха" },
    { time: "18:30", title: "Банкет и танцы" },
    { time: "21:00", title: "Свадебный торт" },
  ],
  dressCode: "Klassik",
};

export const SAYOHAT_DEMO_EN: SayohatDemo = {
  message: "We are setting off on the most beautiful journey of our lives. We sincerely hope you will be by our side along the way — at our wedding.",
  venueTitle: "Bahor Wedding Hall",
  address: "108 Amir Temur Street, Tashkent",
  program: [
    { time: "17:00", title: "Guest arrival" },
    { time: "17:40", title: "Nikah ceremony" },
    { time: "18:30", title: "Dinner and dancing" },
    { time: "21:00", title: "Wedding cake" },
  ],
  dressCode: "Klassik",
};

/* ── Sahna ──
 * Har ekran — bitta kadr (mobil 390×844, laptop 1440×900). Panorama (5310×844) ekranlar bo‘yicha chapga suriladi:
 * `off` — kadr chap chetidagi panorama koordinatasi, kadr birligida (Figma «Panorama» instance x qiymatining manfiysi).
 * Laptop panoramasi 900/844 marta kattalashtirilgan (s); off — laptop kadr birligida.
 * `cx` — juftlik (skuter) chap cheti; null — Figma kadrida juftlik yo‘q (07 · Anketa). */
export type ScreenKey = "start" | "taklif" | "sana" | "dastur" | "dress" | "manzil" | "anketa" | "final";
export const SCREENS: ScreenKey[] = ["start", "taklif", "sana", "dastur", "dress", "manzil", "anketa", "final"];

export type Stage = {
  W: number;
  H: number;
  /** panorama birligi → kadr birligi */
  s: number;
  off: Record<ScreenKey, number>;
  cx: Record<ScreenKey, number | null>;
  couple: { y: number; size: number };
  /** karta: markaz x, vertikal masshtab (laptop y = mobil y × 1.05), o‘lcham masshtabi (laptop × 1.12) */
  k: number;
  ky: number;
  /** karta pastki chegarasi (juftlik ustidagi bo‘sh joy) — uzun ma’lumotda karta shu chiziqqa sig‘diriladi */
  maxBottom: number;
};

export const STAGE_M: Stage = {
  W: 390,
  H: 844,
  s: 1,
  off: { start: 1260, taklif: 1880, sana: 2500, dastur: 3120, dress: 3740, manzil: 4360, anketa: 4400, final: 4450 },
  cx: { start: 90, taklif: 90, sana: 90, dastur: 90, dress: 90, manzil: 30, anketa: null, final: 30 },
  couple: { y: 506, size: 210 },
  k: 1,
  ky: 1,
  maxBottom: 494,
};

export const STAGE_L: Stage = {
  W: 1440,
  H: 900,
  s: 900 / 844,
  off: { start: 658.74, taklif: 1319.878, sana: 1981.015, dastur: 2642.153, dress: 3303.29, manzil: 3964.427, anketa: 3964.427, final: 3964.427 },
  cx: { start: 310.8, taklif: 310.8, sana: 310.8, dastur: 310.8, dress: 310.8, manzil: 310.8, anketa: null, final: 310.8 },
  couple: { y: 550, size: 300 },
  k: 1.12,
  ky: 1.05,
  maxBottom: 538,
};

/* ── Panorama qatlamlari (Figma 364:5730, panorama birligida) ──
 * Ko‘zgu (`m`) — Figma’da gorizontal aylantirilgan nusxa. Takrorlanuvchi qatlamlar (osmon, uzoq shahar, yo‘l) Figma qadami bilan
 * ikki tomonga davom ettiriladi — keng/baland ekranda ham bo‘sh joy qolmaydi (390/1440 kadrlar ichida Figma bilan aynan bir xil). */
export type Tile = { src: string; x: number; y: number; w: number; h: number; m?: boolean };

const repeat = (src: string, x0: number, y: number, w: number, h: number, step: number, from: number, to: number, mirrorFirst: boolean): Tile[] => {
  const out: Tile[] = [];
  for (let i = Math.floor((from - x0) / step); x0 + i * step < to; i++) out.push({ src, x: x0 + i * step, y, w, h, m: (Math.abs(i) % 2 === 1) !== mirrorFirst });
  return out;
};

/** L0 · Osmon (0.1x): 1500.444 eni, navbatma-navbat ko‘zgu (x = 680 — oddiy) */
export const SKY: Tile[] = repeat("sky", 680, 0, 1500.444, 844, 1498.444, -4200, 9800, false);
/** L1 · Uzoq shahar (0.3x): 443.746 eni, y = 400 (x = 680 — oddiy) */
export const SKYLINE: Tile[] = repeat("skyline", 680, 400, 443.746, 190, 441.746, -2400, 8400, false);
/** L3 · Yo‘l (1.25x): 900 × 300, y = 550 (x = 680 — oddiy) */
export const ROAD: Tile[] = repeat("road", 680, 550, 900, 300, 898, -3000, 10200, false);

/** L2 · Bekatlar va chinorlar (1x) — Figma tartibida (pastdan yuqoriga) */
export const LANDMARKS: Tile[] = [
  { src: "trees", x: 1875, y: 351.355, w: 400, h: 225.407 },
  { src: "trees", x: 3735, y: 351.355, w: 400, h: 225.407 },
  { src: "trees", x: 1695, y: 406.016, w: 300, h: 169.055, m: true },
  { src: "trees", x: 2235, y: 406.016, w: 300, h: 169.055 },
  { src: "trees", x: 2935, y: 406.016, w: 300, h: 169.055, m: true },
  { src: "trees", x: 3475, y: 406.016, w: 300, h: 169.055 },
  { src: "trees", x: 4175, y: 406.016, w: 300, h: 169.055, m: true },
  { src: "trees", x: 855, y: 406.016, w: 300, h: 169.055 },
  { src: "statue", x: 1290, y: 249.9, w: 330, h: 330 },
  { src: "tower", x: 2595, y: 224.695, w: 200, h: 355.985 },
  { src: "mosque", x: 3135, y: 220.8, w: 360, h: 360 },
  { src: "venue", x: 4400, y: 201.4, w: 380, h: 380 },
  { src: "trees", x: 140, y: 406.016, w: 300, h: 169.055 },
];

/** Parallaks tezliklari (Motion — Sayohat): osmon 0.1x · uzoq shahar 0.3x · bekatlar 1x · yo‘l 1.25x */
export const SPEED = { sky: 0.1, skyline: 0.3, land: 1, road: 1.25 };
