/** Gulshan shabloni (yubiley va tug‘ilgan kun — zumrad yashil, oq, oltin, pushti gullar; gul to‘dasi, medalyon portret) — namuna
 * matnlar (Figma 626:27026 mobil / 629:27067 laptop; «28 · Gulshan — Assets» 626:26970). Ma’lumot modeli Oltin/Xotira’dagidek
 * (`age` 1–120, ixtiyoriy `host`, `sign`, `program`, `dressCode`) — standart taklif matnlari ham ulardagidek (MSG — xotira/data). */
export const P = "/templates/gulshan";

export type GulshanItem = { time: string; title: string };

export type GulshanDemo = {
  address: string;
  program: GulshanItem[];
  dressCode: string;
  age: string;
  /** taklif qiluvchi — Figma: «Ahmedovlar oilasi» (final) */
  host: string;
  /** imzo — Figma: «Hurmat bilan, farzandlari» */
  sign: string;
};

/** Namuna — Figma’dagi matnlar (ism, joy nomi, sana — shablon `sample` dan) */
export const GULSHAN_DEMO: GulshanDemo = {
  address: "Toshkent, Mirobod tumani, Taras Shevchenko ko‘chasi, 30",
  program: [
    { time: "18:00", title: "Mehmonlarni kutib olish" },
    { time: "18:30", title: "Tabriklar va gullar" },
    { time: "19:30", title: "Bayram dasturxoni" },
    { time: "21:00", title: "Raqs va tort" },
  ],
  dressCode: "Zumrad va pushti",
  age: "55",
  host: "Ahmedovlar oilasi",
  sign: "farzandlari",
};

export const GULSHAN_DEMO_RU: GulshanDemo = {
  address: "г. Ташкент, Мирабадский район, ул. Тараса Шевченко, 30",
  program: [
    { time: "18:00", title: "Встреча гостей" },
    { time: "18:30", title: "Поздравления и цветы" },
    { time: "19:30", title: "Праздничный ужин" },
    { time: "21:00", title: "Танцы и торт" },
  ],
  dressCode: "Zumrad va pushti",
  age: "55",
  host: "Семья Ахмедовых",
  sign: "дети",
};

export const GULSHAN_DEMO_EN: GulshanDemo = {
  address: "30 Taras Shevchenko Street, Mirabad district, Tashkent",
  program: [
    { time: "18:00", title: "Welcoming the guests" },
    { time: "18:30", title: "Wishes and flowers" },
    { time: "19:30", title: "Celebration dinner" },
    { time: "21:00", title: "Dancing and cake" },
  ],
  dressCode: "Zumrad va pushti",
  age: "55",
  host: "The Ahmedov family",
  sign: "her children",
};

/** Namuna: taklif matni — Figma’dagi aynan matn («Onamiz …») */
export const MSG_DEMO =
  "Onamiz {name}ning {age} yoshga to‘lishi munosabati bilan tashkil etiladigan yubiley kechasiga taklif qilamiz. Uning mehri gullab turgan bog‘ kabi — bu kunni birga nishonlaylik.";

/**
 * Dress-kod (Figma «Gulshan / Dress-kod»: Turi=Zumrad va pushti | Klassik) — oq «tabletka» karta: turi (yashil kursiv) va bitta izoh.
 * Mijoz `dressNote` yozsa — o‘sha matn. Milliy / Ixtiyoriy — boshqa yubiley shablonlaridagi matnlar.
 */
export const DRESS_TEXT: Record<string, string> = {
  "Zumrad va pushti": "Yashil yoki pushti rangdagi kechki libos — gullar bilan uyg‘un.",
  Klassik: "Klassik kostyum va nafis ko‘ylak.",
  Milliy: "Milliy liboslar — atlas, adras va chopon kechamizga yarashadi.",
  Ixtiyoriy: "Maxsus talab yo‘q — o‘zingizga qulay, bayramona kiyimda keling.",
};
