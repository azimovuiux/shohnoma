/** Lagan shabloni (nikoh to‘yi munosabati bilan nahorgi osh — Rishton naqshli lagan: kobalt, firuza, oq, oxra) — namuna matnlar
 * (Figma 618:24204 mobil / 618:24876 laptop; «25 · Lagan — Assets» 618:24102). Ma’lumot modeli Tong/Qozon bilan bir xil
 * (`hosts`, `side`, `program`, `dressCode`, `dressNote`). */
import type { ProgramItem } from "../anor/data";

export const P = "/templates/lagan";

export type LaganDemo = {
  address: string;
  program: ProgramItem[];
  dressCode: string;
  /** mezbonlar — Figma: «Yo‘ldoshevlar oilasi» */
  hosts: string;
  /** Figma matni kelin tomoni nomidan: «Qizimiz Nilufarning …» */
  side: string;
};

/** Namuna — Figma’dagi matnlar (kuyov/kelin ismlari, joy nomi — shablon `sample` dan) */
export const LAGAN_DEMO: LaganDemo = {
  address: "Farg‘ona, Rishton tumani, Mustaqillik ko‘chasi, 21",
  program: [
    { time: "05:45", title: "Mehmonlarni kutib olish" },
    { time: "06:00", title: "Xatmi Qur’on va duo" },
    { time: "06:20", title: "Nahorgi osh" },
    { time: "07:00", title: "Choy va tabriklar" },
  ],
  dressCode: "Milliy uslub",
  hosts: "Yo‘ldoshevlar oilasi",
  side: "Kelin tomoni",
};

export const LAGAN_DEMO_RU: LaganDemo = {
  address: "Ферганская область, Риштанский район, улица Мустакиллик, 21",
  program: [
    { time: "05:45", title: "Встреча гостей" },
    { time: "06:00", title: "Чтение Корана и дуа" },
    { time: "06:20", title: "Утренний плов" },
    { time: "07:00", title: "Чай и поздравления" },
  ],
  dressCode: "Milliy uslub",
  hosts: "Yo‘ldoshevlar oilasi",
  side: "Kelin tomoni",
};

export const LAGAN_DEMO_EN: LaganDemo = {
  address: "21 Mustaqillik Street, Rishton District, Fergana Region",
  program: [
    { time: "05:45", title: "Welcoming the guests" },
    { time: "06:00", title: "Quran recitation and prayer" },
    { time: "06:20", title: "Morning plov" },
    { time: "07:00", title: "Tea and congratulations" },
  ],
  dressCode: "Milliy uslub",
  hosts: "Yo‘ldoshevlar oilasi",
  side: "Kelin tomoni",
};

/**
 * Taklif matni (mijoz yozmagan yoki server standart matni qolgan bo‘lsa) — Figma matni: kelin tomoni nomidan («Qizimiz Nilufarning …»).
 * Kuyov tomoni (tanlanmasa ham — Tong bilan bir xil) — «O‘g‘limiz …». Ruscha/inglizchada ism bosh kelishikda qoladi.
 */
export const MSG_GROOM = "O‘g‘limiz {name}ning {kind} munosabati bilan tong sahardagi nahorgi oshimizga sizni chin dildan taklif qilamiz. Dasturxonimiz siz bilan fayzli bo‘ladi.";
export const MSG_BRIDE = "Qizimiz {name}ning {kind} munosabati bilan tong sahardagi nahorgi oshimizga sizni chin dildan taklif qilamiz. Dasturxonimiz siz bilan fayzli bo‘ladi.";
/** ism yo‘q bo‘lsa */
export const MSG_PLAIN = "{Kind} munosabati bilan tong sahardagi nahorgi oshimizga sizni chin dildan taklif qilamiz. Dasturxonimiz siz bilan fayzli bo‘ladi.";
/** Hero’dagi qator: «Qizimiz Nilufarning nikoh to‘yi munosabati bilan» (Tong bilan bir xil kalitlar) */
export const SUB_GROOM = "O‘g‘limiz {name}ning {kind} munosabati bilan";
export const SUB_BRIDE = "Qizimiz {name}ning {kind} munosabati bilan";
export const SUB_PLAIN = "{Kind} munosabati bilan";

/**
 * Dress-kod (Figma «Lagan / Dress-kod»: Turi=Milliy uslub | Erkin; «Klassik» — Tong’dagi matn) — karta: turi va bitta izoh.
 * Mijoz `dressNote` yozsa — o‘sha matn.
 */
export const DRESS_TEXT: Record<string, string> = {
  "Milliy uslub": "Do‘ppi, chopon yoki milliy naqshli kiyim bilan kelsangiz, dasturxon yanada chiroyli bo‘ladi.",
  Klassik: "Kostyum yoki tartibli, sokin ranglardagi kiyim.",
  Erkin: "Qulay va tartibli kiyim.",
};
