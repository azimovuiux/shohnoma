/** Tong shabloni (nikoh to‘yi munosabati bilan nahorgi osh — tong otishi: tungi indigo → binafsha → kahrabo → sut) — namuna matnlar
 * (Figma 614:23737 mobil / 614:23955 laptop; «23 · Tong — Assets» 614:23700) */
import type { ProgramItem } from "../anor/data";

export const P = "/templates/tong";

export type TongDemo = {
  address: string;
  program: ProgramItem[];
  dressCode: string;
  /** mezbonlar — Figma: «Karimovlar oilasi» */
  hosts: string;
};

/** Namuna — Figma’dagi matnlar (kuyov/kelin ismlari, joy nomi — shablon `sample` dan) */
export const TONG_DEMO: TongDemo = {
  address: "Toshkent, Chilonzor tumani, Bunyodkor shoh ko‘chasi, 12",
  program: [
    { time: "05:45", title: "Mehmonlarni kutib olish" },
    { time: "06:00", title: "Xatmi Qur’on va duo" },
    { time: "06:20", title: "Nahorgi osh" },
    { time: "07:00", title: "Choy va suhbat" },
  ],
  dressCode: "Milliy uslub",
  hosts: "Karimovlar oilasi",
};

export const TONG_DEMO_RU: TongDemo = {
  address: "г. Ташкент, Чиланзарский район, проспект Бунёдкор, 12",
  program: [
    { time: "05:45", title: "Встреча гостей" },
    { time: "06:00", title: "Чтение Корана и дуа" },
    { time: "06:20", title: "Утренний плов" },
    { time: "07:00", title: "Чай и беседа" },
  ],
  dressCode: "Milliy uslub",
  hosts: "Karimovlar oilasi",
};

export const TONG_DEMO_EN: TongDemo = {
  address: "12 Bunyodkor Avenue, Chilonzor District, Tashkent",
  program: [
    { time: "05:45", title: "Welcoming the guests" },
    { time: "06:00", title: "Quran recitation and prayer" },
    { time: "06:20", title: "Morning plov" },
    { time: "07:00", title: "Tea and conversation" },
  ],
  dressCode: "Milliy uslub",
  hosts: "Karimovlar oilasi",
};

/**
 * Taklif matni (mijoz yozmagan yoki server standart matni qolgan bo‘lsa) — Figma matni: kuyov tomoni nomidan («O‘g‘limiz … va
 * kelinimiz …»). Kelin tomoni tanlansa — «Qizimiz … va kuyovimiz …». Ruscha/inglizchada ismlar bosh kelishikda qoladi.
 */
export const MSG_GROOM = "O‘g‘limiz {a} va kelinimiz {b}ning {kind} munosabati bilan tong saharda beriladigan nahorgi oshga sizni taklif qilamiz. Dasturxonimizni fayzli qilishingizni kutib qolamiz.";
export const MSG_BRIDE = "Qizimiz {b} va kuyovimiz {a}ning {kind} munosabati bilan tong saharda beriladigan nahorgi oshga sizni taklif qilamiz. Dasturxonimizni fayzli qilishingizni kutib qolamiz.";
/** ismlar to‘liq bo‘lmasa */
export const MSG_PLAIN = "{Kind} munosabati bilan tong saharda beriladigan nahorgi oshga sizni taklif qilamiz. Dasturxonimizni fayzli qilishingizni kutib qolamiz.";
/** Hero’dagi qator: «O‘g‘limiz Jasurning nikoh to‘yi munosabati bilan» */
export const SUB_GROOM = "O‘g‘limiz {name}ning {kind} munosabati bilan";
export const SUB_BRIDE = "Qizimiz {name}ning {kind} munosabati bilan";
export const SUB_PLAIN = "{Kind} munosabati bilan";

/**
 * Dress-kod (Figma «Tong / Dress-kod»: Turi=Milliy uslub | Erkin) — karta: turi va bitta izoh. Mijoz `dressNote` yozsa — o‘sha matn.
 */
export const DRESS_TEXT: Record<string, string> = {
  "Milliy uslub": "Do‘ppi yoki chopon bilan kelsangiz, dasturxon yanada fayzli bo‘ladi.",
  Klassik: "Kostyum yoki tartibli, sokin ranglardagi kiyim.",
  Erkin: "Qulay va tartibli kiyim.",
};
