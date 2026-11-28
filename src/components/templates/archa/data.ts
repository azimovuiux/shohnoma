/**
 * Archa shabloni (korporativ Yangi yil bazmi — to‘q ko‘k #0c1633, oq, qizil #d92f38 va kumush; osilgan shar, qor uchqunlari, archa
 * shoxi va sovg‘a qutilari) — namuna matnlar. Figma: «Archa — korporativ Yangi yil bazmi» (mobil 641:27145, laptop 642:27189,
 * «29 · Archa — Assets» 641:27067). Ma’lumot modeli Bilet/Sammit’dagidek: `personA` — tadbir nomi, `personB` — kompaniya.
 */
import type { ProgramItem } from "../anor/data";

export const P = "/templates/archa";

export type ArchaDemo = {
  address: string;
  program: ProgramItem[];
  giftLimit: string;
  dressCode: string;
};

/** Namuna — Figma’dagi matnlar (tadbir nomi, kompaniya, joy nomi, sana — shablon `sample` dan) */
export const ARCHA_DEMO: ArchaDemo = {
  address: "Toshkent, Yunusobod tumani, Amir Temur ko‘chasi, 107",
  program: [
    { time: "16:00", title: "Kutib olish", note: "Issiq ichimliklar va yengil gazaklar" },
    { time: "16:30", title: "Jamoaviy o‘yinlar", note: "Bo‘limlar o‘rtasida kvest" },
    { time: "18:00", title: "Taqdirlash", note: "Yilning eng yaxshi xodimlari" },
    { time: "19:00", title: "Bayram kechasi", note: "Kechki ovqat, musiqa va raqs" },
    { time: "21:00", title: "Sovg‘a almashinuvi", note: "Secret Santa" },
  ],
  giftLimit: "200 000 so‘mgacha",
  dressCode: "Kumush va qizil",
};

export const ARCHA_DEMO_RU: ArchaDemo = {
  address: "г. Ташкент, Юнусабадский район, ул. Амира Темура, 107",
  program: [
    { time: "16:00", title: "Встреча гостей", note: "Горячие напитки и лёгкие закуски" },
    { time: "16:30", title: "Командные игры", note: "Квест между отделами" },
    { time: "18:00", title: "Награждение", note: "Лучшие сотрудники года" },
    { time: "19:00", title: "Праздничный вечер", note: "Ужин, музыка и танцы" },
    { time: "21:00", title: "Обмен подарками", note: "Тайный Санта" },
  ],
  giftLimit: "до 200 000 сумов",
  dressCode: "Kumush va qizil",
};

export const ARCHA_DEMO_EN: ArchaDemo = {
  address: "107 Amir Temur Street, Yunusabad district, Tashkent",
  program: [
    { time: "16:00", title: "Welcome", note: "Hot drinks and light snacks" },
    { time: "16:30", title: "Team games", note: "A quest between departments" },
    { time: "18:00", title: "Awards", note: "The best employees of the year" },
    { time: "19:00", title: "Party night", note: "Dinner, music and dancing" },
    { time: "21:00", title: "Gift exchange", note: "Secret Santa" },
  ],
  giftLimit: "up to 200,000 sum",
  dressCode: "Kumush va qizil",
};

/** Taklif matni (Figma’dagi aynan matn) — mijoz o‘z matnini yozmasa ham shu chiqadi; {year} — kutib olinadigan yil */
export const MSG = "Bu yil birga ko‘p ishni uddaladik. Shu yutuqlarni nishonlash va {year}-yilni birga kutib olish uchun sizni jamoaviy bayram kechamizga taklif qilamiz.";
/** Sovg‘a almashinuvi izohi (Figma) — mijoz `giftNote` yozmasa */
export const GIFT_NOTE = "Har bir ishtirokchi bitta sovg‘a olib keladi. Kimga sovg‘a berishingizni tadbirdan bir hafta oldin bilib olasiz.";

/**
 * Dress-kod (Figma «Archa / Dress-kod»: Turi=Kumush va qizil | Smart casual) — oq karta: turi (qizil, Dela Gothic One) va bitta izoh.
 * Mijoz `dressNote` yozsa — o‘sha matn. Black tie / Erkin uslub — boshqa korporativ shablonlardagi matnlar.
 */
export const DRESS_TEXT: Record<string, string> = {
  "Kumush va qizil": "Kechki kiyim: kumush yoki qizil rangdagi bitta aksent bilan.",
  "Smart casual": "Qulay, lekin bayramona kiyim.",
  "Black tie": "Kechki kostyum, kechki libos.",
  "Erkin uslub": "Maxsus talab yo‘q — o‘zingizga qulay, bayramona kiyimda keling.",
};
