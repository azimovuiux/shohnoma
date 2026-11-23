/** Oltin shabloni (yubiley va tug‘ilgan kun — qora, oltin gradient, oq; oltin halqa, oltin barglar) — namuna matnlar
 * (Figma 621:25998 mobil / 622:26111 laptop; «26 · Oltin — Assets» 621:25945). Ma’lumot modeli Sham/Marvarid’dagidek
 * (`age` 1–120, ixtiyoriy `host`) + `sign` (imzo), `life` (hayot yo‘li), `cap1…cap3` (xotira suratlari izohi). */
export const P = "/templates/oltin";

export type LifeItem = { year: string; text: string };
export type OltinItem = { time: string; title: string };

export type OltinDemo = {
  address: string;
  program: OltinItem[];
  dressCode: string;
  age: string;
  /** taklif qiluvchi — Figma: «Karimovlar oilasi» (ochilish va final) */
  host: string;
  /** imzo — Figma: «Hurmat bilan, farzandlari va nabiralari» */
  sign: string;
  life: LifeItem[];
  caps: string[];
};

/** Namuna — Figma’dagi matnlar (ism, joy nomi, sana — shablon `sample` dan) */
export const OLTIN_DEMO: OltinDemo = {
  address: "Samarqand, Universitet xiyoboni, 9",
  program: [
    { time: "18:00", title: "Mehmonlarni kutib olish" },
    { time: "18:30", title: "Tabriklar va xotiralar" },
    { time: "19:30", title: "Bayram dasturxoni" },
    { time: "21:00", title: "Tort va oilaviy surat" },
  ],
  dressCode: "Kechki libos",
  age: "60",
  host: "Karimovlar oilasi",
  sign: "farzandlari va nabiralari",
  life: [
    { year: "1966", text: "Samarqandda tavallud topdi" },
    { year: "1991", text: "Oila qurdi" },
    { year: "2026", text: "4 farzand, 9 nabira" },
  ],
  caps: ["1991 · To‘y kuni", "1998 · Farzandlar bilan", "2024 · Nabiralar davrasida"],
};

export const OLTIN_DEMO_RU: OltinDemo = {
  address: "г. Самарканд, Университетский бульвар, 9",
  program: [
    { time: "18:00", title: "Встреча гостей" },
    { time: "18:30", title: "Поздравления и воспоминания" },
    { time: "19:30", title: "Праздничный ужин" },
    { time: "21:00", title: "Торт и семейное фото" },
  ],
  dressCode: "Kechki libos",
  age: "60",
  host: "Семья Каримовых",
  sign: "дети и внуки",
  life: [
    { year: "1966", text: "Родился в Самарканде" },
    { year: "1991", text: "Создал семью" },
    { year: "2026", text: "4 детей, 9 внуков" },
  ],
  caps: ["1991 · День свадьбы", "1998 · С детьми", "2024 · В кругу внуков"],
};

export const OLTIN_DEMO_EN: OltinDemo = {
  address: "9 Universitet Boulevard, Samarkand",
  program: [
    { time: "18:00", title: "Welcoming the guests" },
    { time: "18:30", title: "Toasts and memories" },
    { time: "19:30", title: "Celebration dinner" },
    { time: "21:00", title: "Cake and a family photo" },
  ],
  dressCode: "Kechki libos",
  age: "60",
  host: "The Karimov family",
  sign: "his children and grandchildren",
  life: [
    { year: "1966", text: "Born in Samarkand" },
    { year: "1991", text: "Started a family" },
    { year: "2026", text: "4 children, 9 grandchildren" },
  ],
  caps: ["1991 · Wedding day", "1998 · With the children", "2024 · With the grandchildren"],
};

/** Namuna taklif matni — Figma’dagi aynan matn (farzandlar nomidan, «Otamiz …») */
export const MSG_DEMO = "Otamiz {name}ning {age} yoshlik yubileyi munosabati bilan tashkil etiladigan tantanali kechaga sizni taklif qilamiz. Bu oqshomni yaqinlarimiz davrasida o‘tkazishni istaymiz.";

/**
 * Taklif matni (mijoz yozmagan yoki server standart matni qolgan bo‘lsa). Uch holat: `host` bor — «biz» nomidan (ism bilan);
 * `host` yo‘q — yubilyarning o‘zi nomidan («men»). Yosh: yubiley (20+, 5 ga karrali) / oddiy yosh / kiritilmagan.
 * Ruscha matnlarda ism bosh kelishikda qoladi («{name} празднует …»).
 */
export const MSG = {
  host: {
    jub: "{name}ning {age} yoshlik yubileyi munosabati bilan tashkil etiladigan tantanali kechaga sizni taklif qilamiz. Bu oqshomni yaqinlarimiz davrasida o‘tkazishni istaymiz.",
    age: "{name}ning {age} yoshga to‘lishi munosabati bilan tashkil etiladigan tantanali kechaga sizni taklif qilamiz. Bu oqshomni yaqinlarimiz davrasida o‘tkazishni istaymiz.",
    none: "{name}ning tug‘ilgan kuni munosabati bilan tashkil etiladigan tantanali kechaga sizni taklif qilamiz. Bu oqshomni yaqinlarimiz davrasida o‘tkazishni istaymiz.",
  },
  we: {
    jub: "{age} yoshlik yubiley munosabati bilan tashkil etiladigan tantanali kechaga sizni taklif qilamiz. Bu oqshomni yaqinlarimiz davrasida o‘tkazishni istaymiz.",
    age: "{age} yoshga to‘lish munosabati bilan tashkil etiladigan tantanali kechaga sizni taklif qilamiz. Bu oqshomni yaqinlarimiz davrasida o‘tkazishni istaymiz.",
    none: "Tug‘ilgan kun munosabati bilan tashkil etiladigan tantanali kechaga sizni taklif qilamiz. Bu oqshomni yaqinlarimiz davrasida o‘tkazishni istaymiz.",
  },
  me: {
    jub: "{age} yoshlik yubileyim munosabati bilan tashkil etiladigan tantanali kechaga sizni taklif qilaman. Bu oqshomni yaqinlarim davrasida o‘tkazishni istayman.",
    age: "{age} yoshga to‘lishim munosabati bilan tashkil etiladigan tantanali kechaga sizni taklif qilaman. Bu oqshomni yaqinlarim davrasida o‘tkazishni istayman.",
    none: "Tug‘ilgan kunim munosabati bilan tashkil etiladigan tantanali kechaga sizni taklif qilaman. Bu oqshomni yaqinlarim davrasida o‘tkazishni istayman.",
  },
} as const;

/**
 * Dress-kod (Figma «Oltin / Dress-kod»: Turi=Kechki libos | Klassik) — oltin hoshiyali karta: turi (oltin kursiv) va bitta izoh.
 * Mijoz `dressNote` yozsa — o‘sha matn.
 */
export const DRESS_TEXT: Record<string, string> = {
  "Kechki libos": "Erkaklar uchun kostyum, ayollar uchun kechki ko‘ylak. Oltin rangli aksent — ayni muddao.",
  Klassik: "Klassik kostyum va nafis ko‘ylak.",
  Milliy: "Milliy liboslar — atlas, adras va chopon kechamizga yarashadi.",
  Ixtiyoriy: "Maxsus talab yo‘q — o‘zingizga qulay, bayramona kiyimda keling.",
};
