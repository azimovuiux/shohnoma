/**
 * Ayoz shabloni (korporativ Yangi yil bazmi — binafsha sehrli tun: yulduzlar, Ayoz bobo chanasi, qorli tepaliklar va archalar,
 * shisha shar ichida kompaniya logotipi) — namuna matnlar.
 * Figma: «Shablon 31 · Ayoz» (mobil 649:27671, laptop 650:27636, Assets 649:27606, Motion 650:27937, Nazorat 650:27943).
 * Ma’lumot modeli Bilet/Sammit’dagidek: `personA` — tadbir nomi, `personB` — kompaniya; dastur, imzo, dress-kod — `extra`.
 */
import type { ProgramItem } from "../anor/data";

export const P = "/templates/ayoz";

export type AyozDemo = {
  address: string;
  city: string;
  program: ProgramItem[];
  dressCode: string;
};

/** Namuna — Figma’dagi matnlar (tadbir nomi, kompaniya, joy nomi, sana — shablon `sample` dan) */
export const AYOZ_DEMO: AyozDemo = {
  address: "Toshkent, Mirzo Ulug‘bek tumani, Buyuk Ipak yo‘li, 15",
  city: "Toshkent",
  program: [
    { time: "18:30", title: "Mehmonlarni kutib olish" },
    { time: "19:00", title: "Ayoz bobo va Qorqiz tabrigi" },
    { time: "19:30", title: "Bayram dasturxoni" },
    { time: "20:30", title: "Jamoaviy viktorina" },
    { time: "21:30", title: "Sovg‘alar va raqs" },
  ],
  dressCode: "Oq va binafsha",
};

export const AYOZ_DEMO_RU: AyozDemo = {
  address: "г. Ташкент, Мирзо-Улугбекский район, ул. Буюк Ипак Йули, 15",
  city: "Ташкент",
  program: [
    { time: "18:30", title: "Встреча гостей" },
    { time: "19:00", title: "Поздравление Деда Мороза и Снегурочки" },
    { time: "19:30", title: "Праздничный ужин" },
    { time: "20:30", title: "Командная викторина" },
    { time: "21:30", title: "Подарки и танцы" },
  ],
  dressCode: "Oq va binafsha",
};

export const AYOZ_DEMO_EN: AyozDemo = {
  address: "15 Buyuk Ipak Yuli Street, Mirzo Ulugbek district, Tashkent",
  city: "Tashkent",
  program: [
    { time: "18:30", title: "Welcoming the guests" },
    { time: "19:00", title: "Greetings from Father Frost and the Snow Maiden" },
    { time: "19:30", title: "Holiday dinner" },
    { time: "20:30", title: "Team quiz" },
    { time: "21:30", title: "Gifts and dancing" },
  ],
  dressCode: "Oq va binafsha",
};

/**
 * Taklif matni (mijoz yozmagan yoki server standart matni qolgan bo‘lsa) — Figma’dagi matn. Yil — bazm kunidan keyingi yangi yil
 * (dekabr oxiridagi bazm → keyingi yil); sana bo‘lmasa — «yangi yilni».
 */
export const MSG_YEAR =
  "Yil davomida birga ishlagan, qiyinchiliklarni yengib, yutuqlarga erishgan jamoamiz bilan {year}-yilni sehrli kechada kutib olaylik.";
export const MSG_NOYEAR =
  "Yil davomida birga ishlagan, qiyinchiliklarni yengib, yutuqlarga erishgan jamoamiz bilan yangi yilni sehrli kechada kutib olaylik.";

/**
 * Dress-kod (Figma «Ayoz / Dress-kod»: Turi=Oq va binafsha | Smart casual) — oq karta: turi (Yeseva) va bitta izoh.
 * Mijoz `dressNote` yozsa — o‘sha matn. Black tie / Erkin uslub — boshqa korporativ shablonlardagi matnlar.
 */
export const DRESS_TEXT: Record<string, string> = {
  "Oq va binafsha": "Kechki kiyim: oq, kumush yoki binafsha rangda.",
  "Smart casual": "Qulay, lekin bayramona kiyim.",
  "Black tie": "Kechki kostyum va kechki liboslar.",
  "Erkin uslub": "Maxsus talab yo‘q — o‘zingizga qulay kiyimda keling.",
};
