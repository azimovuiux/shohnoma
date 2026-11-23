/** Qozon shabloni (sunnat to‘yi munosabati bilan nahorgi osh — terrakota, ko‘mir, za’faron, sut) — namuna matnlar
 * (Figma 616:23914 mobil / 616:24079 laptop; «24 · Qozon — Assets» 616:23853) */
import type { ProgramItem } from "../anor/data";

export const P = "/templates/qozon";

export type QozonDemo = {
  address: string;
  program: ProgramItem[];
  dressCode: string;
  /** mezbonlar — Figma: «Rahimovlar xonadoni» */
  hosts: string;
  /** taklif kim nomidan — Figma: «Nabiramiz …» (bobosi va buvisi) */
  side: string;
};

/** Namuna — Figma’dagi matnlar (bola ismi, joy nomi — shablon `sample` dan) */
export const QOZON_DEMO: QozonDemo = {
  address: "Samarqand, Bog‘ishamol mahallasi, Navoiy ko‘chasi, 48",
  program: [
    { time: "06:00", title: "Mehmonlarni kutib olish" },
    { time: "06:30", title: "Osh tortiladi" },
    { time: "07:00", title: "Duo va tabriklar" },
    { time: "07:30", title: "Choy, suhbat" },
  ],
  dressCode: "Milliy",
  hosts: "Rahimovlar xonadoni",
  side: "Bobosi va buvisi",
};

export const QOZON_DEMO_RU: QozonDemo = {
  address: "г. Самарканд, махалля Богишамол, улица Навои, 48",
  program: [
    { time: "06:00", title: "Встреча гостей" },
    { time: "06:30", title: "Подача плова" },
    { time: "07:00", title: "Дуа и поздравления" },
    { time: "07:30", title: "Чай и беседа" },
  ],
  dressCode: "Milliy",
  hosts: "Rahimovlar xonadoni",
  side: "Bobosi va buvisi",
};

export const QOZON_DEMO_EN: QozonDemo = {
  address: "48 Navoi Street, Bogishamol Mahalla, Samarkand",
  program: [
    { time: "06:00", title: "Welcoming the guests" },
    { time: "06:30", title: "The plov is served" },
    { time: "07:00", title: "Prayer and congratulations" },
    { time: "07:30", title: "Tea and conversation" },
  ],
  dressCode: "Milliy",
  hosts: "Rahimovlar xonadoni",
  side: "Bobosi va buvisi",
};

/**
 * Taklif matni (mijoz yozmagan yoki server standart matni qolgan bo‘lsa) — Figma matni bobosi va buvisi nomidan («Nabiramiz …»).
 * «Ota-onasi» tanlansa (yoki hech narsa tanlanmasa) — «O‘g‘limiz …». Ruscha/inglizchada ism bosh kelishikda qoladi.
 */
export const MSG_SON = "O‘g‘limiz {name}ning sunnat to‘yi munosabati bilan tong sahardagi nahorgi oshga marhamat qiling. Qozonimiz siz bilan to‘kin bo‘ladi.";
export const MSG_GRAND = "Nabiramiz {name}ning sunnat to‘yi munosabati bilan tong sahardagi nahorgi oshga marhamat qiling. Qozonimiz siz bilan to‘kin bo‘ladi.";
/** bola ismi bo‘lmasa */
export const MSG_PLAIN = "Sunnat to‘yi munosabati bilan tong sahardagi nahorgi oshga marhamat qiling. Qozonimiz siz bilan to‘kin bo‘ladi.";
/** Hero’dagi za’faron plitka: «Nabiramiz Alisherning sunnat to‘yi munosabati bilan» */
export const SUB_SON = "O‘g‘limiz {name}ning sunnat to‘yi munosabati bilan";
export const SUB_GRAND = "Nabiramiz {name}ning sunnat to‘yi munosabati bilan";
export const SUB_PLAIN = "Sunnat to‘yi munosabati bilan";

/** «Taklif kim nomidan» tanlovi (templates.ts `side`) */
export const SIDE_GRAND = "Bobosi va buvisi";

/**
 * Dress-kod (Figma «Qozon / Dress-kod»: Turi=Milliy | Erkin) — oq karta: turi (bosh harflarda) va bitta izoh.
 * Mijoz `dressNote` yozsa — o‘sha matn.
 */
export const DRESS_TEXT: Record<string, string> = {
  Milliy: "Chopon, do‘ppi yoki milliy naqshli kiyim — tong dasturxoniga yarashadi.",
  Klassik: "Kostyum yoki tartibli, sokin ranglardagi kiyim.",
  Erkin: "Qulay va tartibli kiyim.",
};
