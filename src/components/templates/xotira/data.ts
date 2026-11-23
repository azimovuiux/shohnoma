/** Xotira shabloni (yubiley va tug‘ilgan kun — oq, sovuq kulrang, ko‘mir, bordo; suratlar taxlami, «Yillar» surat xronologiyasi) —
 * namuna matnlar (Figma 625:26928 mobil / 625:27071 laptop; «27 · Xotira — Assets» 625:26868). Ma’lumot modeli Oltin’dagidek
 * (`age` 1–120, ixtiyoriy `host`, `sign`) + `life` — «Yillar» (yil va voqea; har biriga tartib bo‘yicha surat). */
export const P = "/templates/xotira";

export type LifeItem = { year: string; text: string };
export type XotiraItem = { time: string; title: string };

export type XotiraDemo = {
  address: string;
  program: XotiraItem[];
  dressCode: string;
  age: string;
  /** taklif qiluvchi — Figma: «Yusupovlar oilasi» (final) */
  host: string;
  /** imzo — Figma: «Hurmat bilan, farzandlari va nabiralari» */
  sign: string;
  life: LifeItem[];
};

/** Namuna — Figma’dagi matnlar (ism, joy nomi, sana — shablon `sample` dan) */
export const XOTIRA_DEMO: XotiraDemo = {
  address: "Toshkent, Yunusobod tumani, Amir Temur ko‘chasi, 86",
  program: [
    { time: "18:00", title: "Mehmonlarni kutib olish" },
    { time: "18:30", title: "Xotiralar: video va suratlar" },
    { time: "19:30", title: "Bayram dasturxoni" },
    { time: "21:00", title: "Oilaviy surat va tort" },
  ],
  dressCode: "Bordo aksent",
  age: "70",
  host: "Yusupovlar oilasi",
  sign: "farzandlari va nabiralari",
  life: [
    { year: "1956", text: "Toshkentda tavallud topdi" },
    { year: "1976", text: "Oila qurdi" },
    { year: "1996", text: "Uch farzand, katta oila" },
    { year: "2026", text: "11 nabira davrasida" },
  ],
};

export const XOTIRA_DEMO_RU: XotiraDemo = {
  address: "г. Ташкент, Юнусабадский район, ул. Амира Темура, 86",
  program: [
    { time: "18:00", title: "Встреча гостей" },
    { time: "18:30", title: "Воспоминания: видео и фото" },
    { time: "19:30", title: "Праздничный ужин" },
    { time: "21:00", title: "Семейное фото и торт" },
  ],
  dressCode: "Bordo aksent",
  age: "70",
  host: "Семья Юсуповых",
  sign: "дети и внуки",
  life: [
    { year: "1956", text: "Родилась в Ташкенте" },
    { year: "1976", text: "Создала семью" },
    { year: "1996", text: "Трое детей, большая семья" },
    { year: "2026", text: "В кругу 11 внуков" },
  ],
};

export const XOTIRA_DEMO_EN: XotiraDemo = {
  address: "86 Amir Temur Street, Yunusabad district, Tashkent",
  program: [
    { time: "18:00", title: "Welcoming the guests" },
    { time: "18:30", title: "Memories: video and photos" },
    { time: "19:30", title: "Celebration dinner" },
    { time: "21:00", title: "Family photo and cake" },
  ],
  dressCode: "Bordo aksent",
  age: "70",
  host: "The Yusupov family",
  sign: "her children and grandchildren",
  life: [
    { year: "1956", text: "Born in Tashkent" },
    { year: "1976", text: "Started a family" },
    { year: "1996", text: "Three children, a big family" },
    { year: "2026", text: "With 11 grandchildren" },
  ],
};

/** Namuna: hero ostidagi qator va taklif matni — Figma’dagi aynan matn («Onamiz …») */
export const SUB_DEMO = "Onamizning {age} yillik yubileyi";
export const MSG_DEMO = "Onamiz {name}ning {age} yoshga to‘lishi munosabati bilan oilaviy kechaga taklif qilamiz. Bir umrlik mehr, sabr va duolari uchun unga birgalikda rahmat aytamiz.";

/**
 * Taklif matni (mijoz yozmagan yoki server standart matni qolgan bo‘lsa). Uch holat: `host` bor — «biz» nomidan (ism bilan);
 * `host` bor, ism yo‘q — «biz»; `host` yo‘q — yubilyarning o‘zi nomidan («men»). Yosh: yubiley (20+, 5 ga karrali) / oddiy yosh /
 * kiritilmagan. Ruscha matnlarda ism bosh kelishikda qoladi («{name} празднует …»).
 */
export const MSG = {
  host: {
    jub: "{name}ning {age} yillik yubileyi munosabati bilan oilaviy kechaga taklif qilamiz. Bu quvonchli kunni yaqinlarimiz davrasida birga nishonlaylik.",
    age: "{name}ning {age} yoshga to‘lishi munosabati bilan oilaviy kechaga taklif qilamiz. Bu quvonchli kunni yaqinlarimiz davrasida birga nishonlaylik.",
    none: "{name}ning tug‘ilgan kuni munosabati bilan oilaviy kechaga taklif qilamiz. Bu quvonchli kunni yaqinlarimiz davrasida birga nishonlaylik.",
  },
  we: {
    jub: "{age} yillik yubiley munosabati bilan oilaviy kechaga taklif qilamiz. Bu quvonchli kunni yaqinlarimiz davrasida birga nishonlaylik.",
    age: "{age} yoshga to‘lish munosabati bilan oilaviy kechaga taklif qilamiz. Bu quvonchli kunni yaqinlarimiz davrasida birga nishonlaylik.",
    none: "Tug‘ilgan kun munosabati bilan oilaviy kechaga taklif qilamiz. Bu quvonchli kunni yaqinlarimiz davrasida birga nishonlaylik.",
  },
  me: {
    jub: "{age} yillik yubileyim munosabati bilan oilaviy kechaga taklif qilaman. Bu quvonchli kunni yaqinlarim davrasida birga nishonlashni istayman.",
    age: "{age} yoshga to‘lishim munosabati bilan oilaviy kechaga taklif qilaman. Bu quvonchli kunni yaqinlarim davrasida birga nishonlashni istayman.",
    none: "Tug‘ilgan kunim munosabati bilan oilaviy kechaga taklif qilaman. Bu quvonchli kunni yaqinlarim davrasida birga nishonlashni istayman.",
  },
} as const;

/**
 * Dress-kod (Figma «Xotira / Dress-kod»: Turi=Bordo aksent | Klassik) — oq karta: turi (bordo kursiv) va bitta izoh.
 * Mijoz `dressNote` yozsa — o‘sha matn.
 */
export const DRESS_TEXT: Record<string, string> = {
  "Bordo aksent": "Bordo yoki to‘q qizil rangli libos, ro‘mol yoki galstuk — umumiy suratlar chiroyli chiqadi.",
  Klassik: "Klassik kostyum va nafis ko‘ylak.",
  Milliy: "Milliy liboslar — atlas, adras va chopon kechamizga yarashadi.",
  Ixtiyoriy: "Maxsus talab yo‘q — o‘zingizga qulay, bayramona kiyimda keling.",
};
