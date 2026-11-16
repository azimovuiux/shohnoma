/** Ertak shabloni (sunnat to‘yi) — namuna matnlar (Figma 424:7316 mobil / 426:7350 laptop) */
import type { ProgramItem } from "../anor/data";

export const P = "/templates/ertak";

export type ErtakDemo = {
  address: string;
  program: ProgramItem[];
  dressCode: string;
  age: string;
};

/** Namuna — Figma’dagi matnlar (bola ismi, ota-ona, joy nomi — shablon `sample` dan; taklif matni — `defaultMessage`) */
export const ERTAK_DEMO: ErtakDemo = {
  address: "Toshkent sh., Chilonzor tumani, Bunyodkor shoh ko‘chasi, 21",
  program: [
    { time: "07:00", title: "Nahor oshi", note: "Erta tongda palov dasturxoni" },
    { time: "16:00", title: "Shohzoda otda", note: "Do‘stlar bilan ot sayri" },
    { time: "18:00", title: "To‘y bazmi", note: "Karnay-surnay, raqs va kurash" },
    { time: "21:30", title: "Mushakbozlik", note: "Osmonda chiroqlar bayrami" },
  ],
  dressCode: "Milliy",
  age: "7",
};

export const ERTAK_DEMO_RU: ErtakDemo = {
  address: "г. Ташкент, Чиланзарский район, проспект Бунёдкор, 21",
  program: [
    { time: "07:00", title: "Утренний плов", note: "Праздничный плов на рассвете" },
    { time: "16:00", title: "Шахзода на коне", note: "Конная прогулка с друзьями" },
    { time: "18:00", title: "Праздничный той", note: "Карнай-сурнай, танцы и кураш" },
    { time: "21:30", title: "Салют", note: "Праздник огней в небе" },
  ],
  dressCode: "Milliy",
  age: "7",
};

export const ERTAK_DEMO_EN: ErtakDemo = {
  address: "21 Bunyodkor Avenue, Chilanzar District, Tashkent",
  program: [
    { time: "07:00", title: "Morning plov", note: "A festive plov table at dawn" },
    { time: "16:00", title: "The prince rides", note: "A horse ride with friends" },
    { time: "18:00", title: "Celebration party", note: "Karnay-surnay, dancing and kurash" },
    { time: "21:30", title: "Fireworks", note: "A festival of lights in the sky" },
  ],
  dressCode: "Milliy",
  age: "7",
};

/** Taklif matni (mijoz yozmagan yoki standart matn qolgan bo‘lsa) — {name} o‘rniga bola ismi (o‘zbekchada «-ning» bilan) */
export const DEFAULT_MESSAGE = "O‘g‘limiz {name}ning sunnat to‘yi munosabati bilan sizni bayram dasturxonimizga taklif etamiz. Bu quvonchli kunni yaqinlarimiz davrasida nishonlashni istaymiz.";
export const DEFAULT_QUOTE = "Kichkina yurak — katta orzular.";

/**
 * Dress-kod (Figma «Ertak / Dress-kod»: Turi=Milliy / Bayramona) — rasmsiz: «Dress-kod» sarlavhasi va bitta izoh.
 * Mijoz `dressNote` yozsa — o‘sha matn.
 */
export const DRESS_TEXT: Record<string, string> = {
  Milliy: "Shohzodaga hamroh bo‘lib, bolalar milliy do‘ppida, kattalar bayramona libosda kelsa — quvonchimiz ikki barobar.",
  Bayramona: "Yorqin va bayramona kiyim — bolalar uchun qulay, kattalar uchun nafis libos.",
  Klassik: "Kattalar — klassik kostyum yoki nafis ko‘ylak, bolalar — bayramona va qulay kiyimda.",
  Ixtiyoriy: "Maxsus talab yo‘q — o‘zingizga qulay, bayramona kiyimda keling.",
};

/** Kun tartibi belgilari (Figma: qozon, shohzoda otda, karnay va doira, mushakbozlik) */
export type IconKey = "qozon" | "otliq" | "karnay" | "mushak";
export const ICONS: Record<IconKey, { src: string; w: number; h: number }> = {
  qozon: { src: `${P}/qozon.webp`, w: 92, h: 92 },
  otliq: { src: `${P}/otliq.webp`, w: 92, h: 92 },
  karnay: { src: `${P}/karnay.webp`, w: 92, h: 92 },
  mushak: { src: `${P}/mushak.webp`, w: 110, h: 73.333 },
};
const ICON_RULES: [IconKey, RegExp][] = [
  ["mushak", /mushak|salyut|feyerverk|chiroq|салют|фейерверк|огн|firework|light/i],
  ["qozon", /osh\b|osh |palov|nahor|dasturxon|taom|nonushta|плов|ош\b|завтрак|угощ|дастархан|ужин|обед|plov|pilaf|breakfast|lunch|dinner|feast|meal/i],
  ["otliq", /\bot\b|otda|ot sayr|ot ustida|kutib|shohzoda|лошад|кон[еяь]|верх|встреч|шахзод|horse|ride|welcome|prince/i],
  ["karnay", /bazm|raqs|karnay|surnay|musiqa|kurash|tabrik|o‘yin|tantana|банкет|танц|музык|карнай|кураш|поздрав|праздн|party|danc|music|toast|celebrat/i],
];
const ORDER: IconKey[] = ["qozon", "otliq", "karnay", "mushak"];

/** Band nomiga qarab belgi; topilmasa — Figma tartibida navbat bilan */
export function iconFor(it: ProgramItem, i: number): IconKey {
  const s = `${it.title} ${it.note ?? ""}`;
  for (const [k, re] of ICON_RULES) if (re.test(s)) return k;
  return ORDER[i % ORDER.length];
}
