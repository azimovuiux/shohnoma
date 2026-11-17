/** Sandiq shabloni (zamonaviy o‘zbekona sunnat to‘yi) — namuna matnlar (Figma 433:8146 mobil / 434:8469 laptop) */
import type { ProgramItem } from "../anor/data";

export const P = "/templates/sandiq";

export type SandiqDemo = {
  address: string;
  program: ProgramItem[];
  dressCode: string;
  age: string;
};

/** Namuna — Figma’dagi matnlar (bola ismi, oila, joy nomi — shablon `sample` dan) */
export const SANDIQ_DEMO: SandiqDemo = {
  address: "Toshkent sh., Mirzo Ulug‘bek tumani, Buyuk Ipak yo‘li, 45",
  program: [
    { time: "07:00", title: "Nahor oshi", note: "Erta tongda yaqinlar bilan osh" },
    { time: "15:00", title: "Shahzoda otda", note: "Do‘stlar davrasida ot sayri" },
    { time: "18:00", title: "To‘y bazmi", note: "Karnay-surnay, raqs va dasturxon" },
    { time: "21:30", title: "Mushakbozlik", note: "Bayram yakuni" },
  ],
  dressCode: "Milliy",
  age: "7",
};

export const SANDIQ_DEMO_RU: SandiqDemo = {
  address: "г. Ташкент, Мирзо-Улугбекский район, улица Буюк Ипак Йули, 45",
  program: [
    { time: "07:00", title: "Утренний плов", note: "Плов с близкими ранним утром" },
    { time: "15:00", title: "Шахзода на коне", note: "Конная прогулка с друзьями" },
    { time: "18:00", title: "Праздничный той", note: "Карнай-сурнай, танцы и дастархан" },
    { time: "21:30", title: "Салют", note: "Финал праздника" },
  ],
  dressCode: "Milliy",
  age: "7",
};

export const SANDIQ_DEMO_EN: SandiqDemo = {
  address: "45 Buyuk Ipak Yuli Street, Mirzo Ulugbek District, Tashkent",
  program: [
    { time: "07:00", title: "Morning plov", note: "Plov with our loved ones at dawn" },
    { time: "15:00", title: "The prince rides", note: "A horse ride with friends" },
    { time: "18:00", title: "Celebration party", note: "Karnay-surnay, dancing and a festive table" },
    { time: "21:30", title: "Fireworks", note: "The end of the celebration" },
  ],
  dressCode: "Milliy",
  age: "7",
};

/** Figma’dagi taklif matni (faqat namunada; mijozga — DEFAULT_MESSAGE) */
export const DEMO_MESSAGE =
  "Xonadonimizning kenja shahzodasi — {name}ning sunnat to‘yiga sizni lutfan taklif etamiz. Dasturxonimiz va quvonchimizga sherik bo‘ling.";
/**
 * Taklif matni (mijoz yozmagan yoki standart matn qolgan bo‘lsa) — {name} o‘rniga bola ismi (o‘zbekchada «-ning» bilan).
 * Figma’dagi «kenja shahzodasi» (eng kichik o‘g‘il) har oilaga to‘g‘ri kelmaydi — mijozga shu umumiy matn.
 */
export const DEFAULT_MESSAGE = "O‘g‘limiz {name}ning sunnat to‘yiga sizni lutfan taklif etamiz. Dasturxonimiz va quvonchimizga sherik bo‘ling.";
export const DEFAULT_QUOTE = "Mehmon — atoyi Xudo.";
/** «Bizning shahzoda» bo‘limidagi doimiy qator (Figma) */
export const SHAHZODA_LINE = "Sizni dasturxonimizning to‘rida ko‘rishni istaymiz.";
/** Namunadagi «Bayram kuni» izohi (mijoz ma’lumotida — «Soat {time} da boshlanadi») */
export const DEMO_START = "Soat 07:00 — nahor oshi";

/**
 * Dress-kod (Figma «Sandiq / Dress-kod»: Turi=Milliy / Bayramona) — rasmsiz: bodom, «Dress-kod», ajratgich va bitta izoh.
 * Mijoz `dressNote` yozsa — o‘sha matn.
 */
export const DRESS_TEXT: Record<string, string> = {
  Milliy: "Atlas, adras yoki milliy naqshli kiyimlar bayramimizga yanada ko‘rk beradi.",
  Bayramona: "Bayramona va qulay kiyim — ayniqsa, kichik mehmonlarimiz uchun.",
  Klassik: "Kattalar — klassik kostyum yoki nafis ko‘ylak, bolalar — bayramona va qulay kiyimda.",
  Ixtiyoriy: "Maxsus talab yo‘q — o‘zingizga qulay, bayramona kiyimda keling.",
};
