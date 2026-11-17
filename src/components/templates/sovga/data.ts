/** Sovg‘a shabloni (18 yosh tug‘ilgan kun, zamonaviy Yevropa premium) — namuna matnlar (Figma 436:9614 mobil / 437:9580 laptop) */
import type { ProgramItem } from "../anor/data";

export const P = "/templates/sovga";

export type SovgaDemo = {
  address: string;
  program: ProgramItem[];
  dressCode: string;
  age: string;
};

/** Namuna — Figma’dagi matnlar (ism, joy nomi — shablon `sample` dan) */
export const SOVGA_DEMO: SovgaDemo = {
  address: "Toshkent sh., Mirobod tumani, Shahrisabz ko‘chasi, 12",
  program: [
    { time: "19:00", title: "Kutib olish", note: "Limonad va jonli musiqa" },
    { time: "20:00", title: "Kechki ziyofat", note: "Mualliflik menyusi" },
    { time: "21:30", title: "Tort va tilaklar", note: "18 sham — 18 orzu" },
    { time: "22:00", title: "Raqslar", note: "Foto-zona va DJ" },
  ],
  dressCode: "Kokteyl",
  age: "18",
};

export const SOVGA_DEMO_RU: SovgaDemo = {
  address: "г. Ташкент, Мирабадский район, улица Шахрисабз, 12",
  program: [
    { time: "19:00", title: "Встреча гостей", note: "Лимонад и живая музыка" },
    { time: "20:00", title: "Праздничный ужин", note: "Авторское меню" },
    { time: "21:30", title: "Торт и пожелания", note: "18 свечей — 18 желаний" },
    { time: "22:00", title: "Танцы", note: "Фотозона и DJ" },
  ],
  dressCode: "Kokteyl",
  age: "18",
};

export const SOVGA_DEMO_EN: SovgaDemo = {
  address: "12 Shakhrisabz Street, Mirobod District, Tashkent",
  program: [
    { time: "19:00", title: "Welcome", note: "Lemonade and live music" },
    { time: "20:00", title: "Dinner", note: "Signature menu" },
    { time: "21:30", title: "Cake and wishes", note: "18 candles — 18 wishes" },
    { time: "22:00", title: "Dancing", note: "Photo zone and DJ" },
  ],
  dressCode: "Kokteyl",
  age: "18",
};

/**
 * Taklif matni (mijoz yozmagan yoki server standart matni qolgan bo‘lsa). Figma matni — yubilyarning o‘zi nomidan («men»).
 * `host` (taklif qiluvchi, masalan, ota-ona) kiritilgan bo‘lsa — «biz» nomidan va ism bilan.
 */
export const MSG_AGE = "Hayotimdagi eng muhim sanalardan biri — {age} yoshimni siz bilan nishonlamoqchiman. Kechamizga albatta keling: tort, musiqa va eng iliq tilaklar sizni kutmoqda.";
export const MSG = "Hayotimdagi eng muhim sanalardan biri — tug‘ilgan kunimni siz bilan nishonlamoqchiman. Kechamizga albatta keling: tort, musiqa va eng iliq tilaklar sizni kutmoqda.";
export const MSG_HOST_AGE = "{name} {age} yoshga to‘lmoqda — bu quvonchli sanani siz bilan nishonlamoqchimiz. Kechamizga albatta keling: tort, musiqa va eng iliq tilaklar sizni kutmoqda.";
export const MSG_HOST = "{name}ning tug‘ilgan kunini siz bilan nishonlamoqchimiz. Kechamizga albatta keling: tort, musiqa va eng iliq tilaklar sizni kutmoqda.";

/**
 * Dress-kod (Figma «Sovg‘a / Dress-kod»: Turi=Kokteyl) — rasmsiz: uchqun, «Dress-kod», turi (kursiv) va bitta izoh.
 * Mijoz `dressNote` yozsa — o‘sha matn.
 */
export const DRESS_TEXT: Record<string, string> = {
  Kokteyl: "Kokteyl libos — nafis, yengil va bayramona.",
  Bayramona: "Bayramona, yorqin kiyim — kechamizga ko‘tarinki kayfiyat olib keling.",
  Klassik: "Klassik uslub: kostyum yoki nafis ko‘ylak.",
  Ixtiyoriy: "Maxsus talab yo‘q — o‘zingizga qulay, bayramona kiyimda keling.",
};
