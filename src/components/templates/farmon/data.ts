/** Farmon shabloni (shohona sunnat to‘yi) — namuna matnlar (Figma 429:7598 mobil / 430:7750 laptop) */
import type { ProgramItem } from "../anor/data";

export const P = "/templates/farmon";

export type FarmonDemo = {
  address: string;
  city: string;
  program: ProgramItem[];
  dressCode: string;
  age: string;
};

/** Namuna — Figma’dagi matnlar (bola ismi, xonadon, joy nomi — shablon `sample` dan; taklif matni — `DEFAULT_MESSAGE`) */
export const FARMON_DEMO: FarmonDemo = {
  address: "Toshkent sh., Yunusobod tumani, Amir Temur shoh ko‘chasi, 108",
  city: "Toshkent",
  program: [
    {
      time: "07:00",
      title: "Nahor oshi",
      note: "Erta tongda mehmonlar bilan osh",
    },
    { time: "15:00", title: "Shahzoda otda", note: "Oq otda tantanali sayr" },
    {
      time: "18:00",
      title: "Shohona bazm",
      note: "Karnay-surnay, raqs va dasturxon",
    },
    {
      time: "21:30",
      title: "Mushakbozlik",
      note: "Bayram yakuni — osmonda chiroqlar",
    },
  ],
  dressCode: "Milliy",
  age: "7",
};

export const FARMON_DEMO_RU: FarmonDemo = {
  address: "г. Ташкент, Юнусабадский район, проспект Амира Темура, 108",
  city: "Ташкент",
  program: [
    {
      time: "07:00",
      title: "Утренний плов",
      note: "Плов с гостями ранним утром",
    },
    {
      time: "15:00",
      title: "Шахзода на коне",
      note: "Торжественная прогулка на белом коне",
    },
    {
      time: "18:00",
      title: "Царский пир",
      note: "Карнай-сурнай, танцы и дастархан",
    },
    { time: "21:30", title: "Салют", note: "Финал праздника — огни в небе" },
  ],
  dressCode: "Milliy",
  age: "7",
};

export const FARMON_DEMO_EN: FarmonDemo = {
  address: "108 Amir Temur Avenue, Yunusabad District, Tashkent",
  city: "Tashkent",
  program: [
    {
      time: "07:00",
      title: "Morning plov",
      note: "Plov with our guests at dawn",
    },
    {
      time: "15:00",
      title: "The prince rides",
      note: "A ceremonial ride on a white horse",
    },
    {
      time: "18:00",
      title: "Royal feast",
      note: "Karnay-surnay, dancing and a festive table",
    },
    {
      time: "21:30",
      title: "Fireworks",
      note: "The grand finale — lights in the sky",
    },
  ],
  dressCode: "Milliy",
  age: "7",
};

/** Taklif matni (mijoz yozmagan yoki standart matn qolgan bo‘lsa) — {name} o‘rniga bola ismi (o‘zbekchada «-ning» bilan) */
export const DEFAULT_MESSAGE =
  "Xonadonimizning faxri — o‘g‘limiz {name}ning sunnat to‘yi munosabati bilan sizni shohona dasturxonimizga taklif etamiz. Tashrifingiz bayramimizga fayz bag‘ishlaydi.";
export const DEFAULT_QUOTE = "Kichik yoshda — katta qadam.";
/** Namunadagi «Bayram kuni» izohi (mijoz ma’lumotida — «Soat {time} da boshlanadi») */
export const DEMO_START = "Soat 07:00 da nahor oshi bilan boshlanadi";

/**
 * Dress-kod (Figma «Farmon / Dress-kod»: Turi=Milliy shohona / Kechki) — rasmsiz: toj belgisi, «Dress-kod» va bitta izoh.
 * Mijoz `dressNote` yozsa — o‘sha matn.
 */
export const DRESS_TEXT: Record<string, string> = {
  Milliy:
    "Bolalar — milliy to‘n va do‘ppida, kattalar — nafis bayramona libosda.",
  Kechki: "Kechki libos va kostyum — bayram ruhida, to‘q va iliq ranglarda.",
  Klassik:
    "Kattalar — klassik kostyum yoki nafis ko‘ylak, bolalar — bayramona va qulay kiyimda.",
  Ixtiyoriy: "Maxsus talab yo‘q — o‘zingizga qulay, bayramona kiyimda keling.",
};

/** Manzildan shahar nomi: «Toshkent sh., …» → «Toshkent», «г. Ташкент, …» → «Ташкент» (aniqlanmasa — bo‘sh) */
export function cityFrom(address: string): string {
  const first = address.split(",")[0]?.trim() ?? "";
  const m =
    first.match(/^(.+?)\s+(?:sh\.|shahri|shahar|city)$/i) ||
    first.match(/^(?:г\.|город)\s*(.+)$/i);
  if (m) return m[1].trim();
  // inglizcha manzil: shahar oxirida («…, Tashkent»)
  const last = address.split(",").pop()?.trim() ?? "";
  if (/^[A-Z][a-z]+$/.test(last) && address.includes(",")) return last;
  return "";
}
