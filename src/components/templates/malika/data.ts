/** Malika shabloni (shohona tug‘ilgan kun, 18 yosh: atlas pardalar, marvarid gerb, tiara) — namuna matnlar (Figma 442:9676 mobil / 444:9718 laptop) */
import type { ProgramItem } from "../anor/data";

export const P = "/templates/malika";

export type MalikaDemo = {
  address: string;
  program: ProgramItem[];
  dressCode: string;
  age: string;
  /** Figma: gerb ostidagi «Ota-onam: …» qatori (faqat namunada) */
  parents: string;
};

/** Namuna — Figma’dagi matnlar (ism, joy nomi — shablon `sample` dan) */
export const MALIKA_DEMO: MalikaDemo = {
  address: "Toshkent sh., Yunusobod tumani, Amir Temur shoh ko‘chasi, 107",
  program: [
    { time: "18:00", title: "Kutib olish", note: "Mehmonlarni qarshi olish" },
    { time: "19:00", title: "Kechki ziyofat", note: "Shohona dasturxon" },
    { time: "20:30", title: "Birinchi vals", note: "Ota bilan raqs" },
    { time: "21:30", title: "Tort va tilaklar", note: "18 sham — 18 orzu" },
  ],
  dressCode: "Malika uslubida",
  age: "18",
  parents: "Rustam va Dilnoza Karimovlar",
};

export const MALIKA_DEMO_RU: MalikaDemo = {
  address: "г. Ташкент, Юнусабадский район, проспект Амира Темура, 107",
  program: [
    { time: "18:00", title: "Встреча гостей", note: "Приветствие гостей" },
    { time: "19:00", title: "Праздничный ужин", note: "Королевский стол" },
    { time: "20:30", title: "Первый вальс", note: "Танец с папой" },
    { time: "21:30", title: "Торт и пожелания", note: "18 свечей — 18 желаний" },
  ],
  dressCode: "Malika uslubida",
  age: "18",
  parents: "Рустам и Дилноза Каримовы",
};

export const MALIKA_DEMO_EN: MalikaDemo = {
  address: "107 Amir Temur Avenue, Yunusobod District, Tashkent",
  program: [
    { time: "18:00", title: "Welcome", note: "Greeting the guests" },
    { time: "19:00", title: "Dinner", note: "A royal table" },
    { time: "20:30", title: "First waltz", note: "A dance with Dad" },
    { time: "21:30", title: "Cake and wishes", note: "18 candles — 18 wishes" },
  ],
  dressCode: "Malika uslubida",
  age: "18",
  parents: "Rustam and Dilnoza Karimov",
};

/**
 * Taklif matni (iqtibos; mijoz yozmagan yoki server standart matni qolgan bo‘lsa). Figma matni — yubilyarning o‘zi nomidan («men»).
 * `host` (taklif qiluvchi, masalan, ota-ona) kiritilgan bo‘lsa — «biz» nomidan.
 */
export const QUOTE = "Ba’zi lahzalar yurakda abadiy qoladi. Shu kunni siz bilan birga o‘tkazishni istayman.";
export const QUOTE_HOST = "Ba’zi lahzalar yurakda abadiy qoladi. Shu kunni siz bilan birga o‘tkazishni istaymiz.";

/**
 * Dress-kod (Figma «Malika / Dress-kod»: Turi=Malika) — rasmsiz: bant ajratgich, «DRESS-KOD», turi (kursiv) va bitta izoh.
 * Mijoz `dressNote` yozsa — o‘sha matn.
 */
export const DRESS_TEXT: Record<string, string> = {
  "Malika uslubida": "Kechki va bal libosi — nafis, yengil va bayramona.",
  "Kechki libos": "Kechki libos: uzun ko‘ylak yoki klassik kostyum.",
  Kokteyl: "Kokteyl libos — nafis, yengil va bayramona.",
  Klassik: "Klassik uslub: kostyum yoki nafis ko‘ylak.",
  Ixtiyoriy: "Maxsus talab yo‘q — o‘zingizga qulay, bayramona kiyimda keling.",
};

/** Dastur bandiga mos ikonka (Figma: toj, ziyofat, vals, tort) — kalit so‘z bo‘yicha, topilmasa — tartib bo‘yicha */
export type IconKey = "toj" | "ziyofat" | "vals" | "tort";
const ICONS: [RegExp, IconKey][] = [
  [/kutib|mehmon|qarshi|встреч|гост|welcome|guest/i, "toj"],
  [/ziyofat|dasturxon|kechki|\bosh\b|tushlik|банкет|ужин|застол|стол|dinner|lunch|table|feast/i, "ziyofat"],
  [/vals|raqs|musiqa|dj|вальс|танц|музык|waltz|danc|music/i, "vals"],
  [/tort|sham|shirin|tilak|торт|свеч|сладк|пожелан|cake|candle|dessert|wish/i, "tort"],
];
const ORDER: IconKey[] = ["toj", "ziyofat", "vals", "tort"];
export function programIcon(it: ProgramItem, i: number): IconKey {
  const text = `${it.title} ${it.note ?? ""}`;
  return ICONS.find(([re]) => re.test(text))?.[1] ?? ORDER[i % ORDER.length];
}
