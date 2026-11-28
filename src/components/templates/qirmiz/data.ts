/**
 * Qirmiz shabloni (korporativ yil yakuni bazmi — qirmizi qizil #a3141f, oq qog‘oz karta, oltin #c9a35c; gulchambar, Shchelkunchik,
 * sovg‘a qutisi, oltin sharlar va padub shoxi) — namuna matnlar. Figma: «Qirmiz — korporativ yil yakuni bazmi» (mobil 646:27553,
 * laptop 647:27508, «30 · Qirmiz — Assets» 646:27482). Ma’lumot modeli Bilet/Sammit’dagidek: `personA` — tadbir nomi,
 * `personB` — kompaniya (tashkilotchi).
 */
export const P = "/templates/qirmiz";

export type QirmizItem = { time: string; title: string };

export type QirmizDemo = {
  address: string;
  /** birinchi ekrandagi kartada vaqt ostidagi shahar */
  city: string;
  /** tadbir nomi va joy nomi (namunada — tarjimasi bilan) */
  event: string;
  venue: string;
  program: QirmizItem[];
  dressCode: string;
};

/** Namuna — Figma’dagi matnlar (tadbir nomi, kompaniya, joy nomi, sana — shablon `sample` dan) */
export const QIRMIZ_DEMO: QirmizDemo = {
  address: "Toshkent, Yunusobod tumani, Amir Temur ko‘chasi, 107",
  city: "Toshkent",
  event: "Yil yakuni bazmi",
  venue: "«Oq saroy» banket zali",
  program: [
    { time: "19:00", title: "Kutib olish" },
    { time: "19:30", title: "Rahbariyat tabrigi" },
    { time: "20:00", title: "Bayram dasturxoni" },
    { time: "21:00", title: "Taqdirlash va lotereya" },
    { time: "22:00", title: "Raqs va sovg‘alar" },
  ],
  dressCode: "Qizil va oltin",
};

export const QIRMIZ_DEMO_RU: QirmizDemo = {
  address: "г. Ташкент, Юнусабадский район, ул. Амира Темура, 107",
  city: "Ташкент",
  event: "Вечер итогов года",
  venue: "Банкетный зал «Ок сарай»",
  program: [
    { time: "19:00", title: "Встреча гостей" },
    { time: "19:30", title: "Поздравление руководства" },
    { time: "20:00", title: "Праздничный ужин" },
    { time: "21:00", title: "Награждение и лотерея" },
    { time: "22:00", title: "Танцы и подарки" },
  ],
  dressCode: "Qizil va oltin",
};

export const QIRMIZ_DEMO_EN: QirmizDemo = {
  address: "107 Amir Temur Street, Yunusabad district, Tashkent",
  city: "Tashkent",
  event: "Year-end party",
  venue: "Oq Saroy banquet hall",
  program: [
    { time: "19:00", title: "Welcome" },
    { time: "19:30", title: "Words from the management" },
    { time: "20:00", title: "Festive dinner" },
    { time: "21:00", title: "Awards and raffle" },
    { time: "22:00", title: "Dancing and gifts" },
  ],
  dressCode: "Qizil va oltin",
};

/** Birinchi ekran kartasidagi qisqa matn (Figma) — mijoz `lead` yozmasa */
export const LEAD = "qirmiz::Bir yil davomida yonma-yon ishlagan jamoamiz bilan yil yakunini birga nishonlaylik.";
/** Karta ostidagi qator (Figma) */
export const CLOSE = "qirmiz::Sizning ishtirokingiz bu kechani to‘liq qiladi.";
/** Hamkasblarga murojaat matni (Figma’dagi aynan matn) — mijoz o‘z matnini yozmasa; {year} — kutib olinadigan yil */
export const MSG = "qirmiz::Bu yil birga katta natijalarga erishdik. Har biringizga mehnatingiz uchun rahmat! Yangi {year}-yilni bayramona kayfiyatda birga kutib olaylik.";
/** Sana bo‘lmasa — yilsiz */
export const MSG_NO_YEAR = "qirmiz::Bu yil birga katta natijalarga erishdik. Har biringizga mehnatingiz uchun rahmat! Yangi yilni bayramona kayfiyatda birga kutib olaylik.";

/**
 * Dress-kod (Figma «Qirmiz / Dress-kod»: Turi=Qizil va oltin | Klassik) — oq karta: turi (Oranienbaum) va bitta izoh.
 * Mijoz `dressNote` yozsa — o‘sha matn. Smart casual / Erkin uslub — boshqa korporativ shablonlardagidek.
 */
export const DRESS_TEXT: Record<string, string> = {
  "Qizil va oltin": "qirmiz::Kechki libos: qizil, qora yoki oltin rangdagi aksent bilan.",
  Klassik: "qirmiz::Klassik kostyum va kechki ko‘ylak.",
  "Smart casual": "qirmiz::Qulay, lekin bayramona kiyim.",
  "Erkin uslub": "qirmiz::Maxsus talab yo‘q — o‘zingizga qulay, bayramona kiyimda keling.",
};
