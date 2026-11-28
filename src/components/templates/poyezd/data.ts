/**
 * Poyezd shabloni (korporativ Yangi yil bazmi — «qishki ertak qishlog‘i»: tungi ko‘k osmon, oltin archa, o‘yinchoq poyezd, osma vagon,
 * qorli uychalar va qor tepaliklari) — namuna matnlar.
 * Figma: «Shablon 32 · Ertak» (mobil 652:27785, laptop 653:27740, Assets 652:27714). Saytda «Ertak» nomli (sunnat) shablon allaqachon
 * bor — shu sabab bu shablon «Poyezd» (slug `poyezd`) deb nomlangan (chok ustidan o‘tadigan o‘yinchoq poyezd — asosiy bezak).
 * Ma’lumot modeli Bilet/Sammit/Archa’dagidek: `personA` — tadbir nomi, `personB` — kompaniya (tashkilotchi).
 */
export const P = "/templates/poyezd";

export type PoyezdItem = { time: string; title: string };

export type PoyezdDemo = {
  address: string;
  /** «soat 18:00 · Toshkent» qatoridagi shahar */
  city: string;
  program: PoyezdItem[];
  /** taklif matni ostidagi bir qator (Figma «Kecha mazmuni») */
  highlights: string[];
  dressCode: string;
};

/** Namuna — Figma’dagi matnlar (tadbir nomi, kompaniya, joy nomi, sana — shablon `sample` dan) */
export const POYEZD_DEMO: PoyezdDemo = {
  address: "Toshkent, Shayxontohur tumani, Navoiy ko‘chasi, 30",
  city: "Toshkent",
  program: [
    { time: "18:00", title: "Kutib olish va issiq choy" },
    { time: "18:30", title: "Jamoaviy o‘yinlar" },
    { time: "19:30", title: "Bayram kechasi" },
    { time: "20:30", title: "Yil yakunlari va taqdirlash" },
    { time: "21:30", title: "Sovg‘alar va fotosessiya" },
  ],
  highlights: ["Jamoaviy o‘yinlar", "Sovg‘alar", "Bayram kechasi"],
  dressCode: "Qishki nafislik",
};

export const POYEZD_DEMO_RU: PoyezdDemo = {
  address: "г. Ташкент, Шайхантахурский район, ул. Навои, 30",
  city: "Ташкент",
  program: [
    { time: "18:00", title: "Встреча и горячий чай" },
    { time: "18:30", title: "Командные игры" },
    { time: "19:30", title: "Праздничный вечер" },
    { time: "20:30", title: "Итоги года и награждение" },
    { time: "21:30", title: "Подарки и фотосессия" },
  ],
  highlights: ["Командные игры", "Подарки", "Праздничный вечер"],
  dressCode: "Qishki nafislik",
};

export const POYEZD_DEMO_EN: PoyezdDemo = {
  address: "30 Navoi Street, Shaykhontohur district, Tashkent",
  city: "Tashkent",
  program: [
    { time: "18:00", title: "Welcome and hot tea" },
    { time: "18:30", title: "Team games" },
    { time: "19:30", title: "Holiday evening" },
    { time: "20:30", title: "Year in review and awards" },
    { time: "21:30", title: "Gifts and a photo session" },
  ],
  highlights: ["Team games", "Gifts", "Holiday evening"],
  dressCode: "Qishki nafislik",
};

/** Standart taklif matni — Figma’dagi aynan matn (mijoz o‘z matnini yozmasa ham shu chiqadi) */
export const MSG = "Bir yil davomida birga mehnat qilgan jamoamizni yil yakunini qishki ertak muhitida nishonlashga taklif qilamiz.";

/**
 * Dress-kod (Figma «Ertak / Dress-kod»: Turi=Qishki nafislik | Issiq sviter) — oq karta: turi (Old Standard kursiv) va bitta izoh.
 * Mijoz `dressNote` yozsa — o‘sha matn.
 */
export const DRESS_TEXT: Record<string, string> = {
  "Qishki nafislik": "Oq, kumush yoki oltin rangdagi kechki kiyim.",
  "Issiq sviter": "Qulay qishki sviter — bayramona kayfiyat bilan.",
  "Smart casual": "Qulay, lekin tartibli kiyim: jemper, ko‘ylak yoki blazer.",
  "Erkin uslub": "Maxsus talab yo‘q — o‘zingizga qulay kiyimda keling.",
};
