/** Sham shabloni (universal tug‘ilgan kun — istalgan yosh va jins: sham, konfetti, katta yosh raqami) — namuna matnlar (Figma 446:9967 mobil / 448:10189 laptop) */
import type { ProgramItem } from "../anor/data";

export const P = "/templates/sham";

export type ShamDemo = {
  address: string;
  program: ProgramItem[];
  dressCode: string;
  age: string;
};

/** Namuna — Figma’dagi matnlar (ism, joy nomi — shablon `sample` dan) */
export const SHAM_DEMO: ShamDemo = {
  address: "Toshkent sh., Mirobod tumani, Nukus ko‘chasi, 3",
  program: [
    { time: "19:00", title: "Kutib olish", note: "Limonad va jonli musiqa" },
    { time: "20:00", title: "Kechki ziyofat", note: "Mazali taomlar va suhbat" },
    { time: "21:00", title: "Tort va sham", note: "Tilak tilash payti" },
    { time: "22:00", title: "Raqs va o‘yinlar", note: "Kechaning eng quvnoq qismi" },
  ],
  dressCode: "Smart casual",
  age: "30",
};

export const SHAM_DEMO_RU: ShamDemo = {
  address: "г. Ташкент, Мирабадский район, улица Нукус, 3",
  program: [
    { time: "19:00", title: "Встреча гостей", note: "Лимонад и живая музыка" },
    { time: "20:00", title: "Праздничный ужин", note: "Вкусные блюда и беседа" },
    { time: "21:00", title: "Торт и свечи", note: "Время загадывать желания" },
    { time: "22:00", title: "Танцы и игры", note: "Самая весёлая часть вечера" },
  ],
  dressCode: "Smart casual",
  age: "30",
};

export const SHAM_DEMO_EN: ShamDemo = {
  address: "3 Nukus Street, Mirobod District, Tashkent",
  program: [
    { time: "19:00", title: "Welcome", note: "Lemonade and live music" },
    { time: "20:00", title: "Dinner", note: "Good food and conversation" },
    { time: "21:00", title: "Cake and candles", note: "Time to make a wish" },
    { time: "22:00", title: "Dancing and games", note: "The most fun part of the night" },
  ],
  dressCode: "Smart casual",
  age: "30",
};

/**
 * Taklif matni (mijoz yozmagan yoki server standart matni qolgan bo‘lsa). Figma matni — yubilyarning o‘zi nomidan («men»).
 * `host` (taklif qiluvchi, masalan, ota-ona yoki farzandlar) kiritilgan bo‘lsa — «biz» nomidan (ism bilan).
 * Yoshga bog‘lanmagan — bola, o‘smir, kattalar va yubiley uchun bir xil mos keladi.
 */
export const MSG = "Yana bir yil — yana bir sahifa. Shu quvonchli kunni eng yaqin insonlarim bilan nishonlamoqchiman. Kechamizga marhamat!";
export const MSG_WE = "Yana bir yil — yana bir sahifa. Shu quvonchli kunni eng yaqin insonlarimiz bilan nishonlamoqchimiz. Kechamizga marhamat!";
export const MSG_HOST = "Yana bir yil — yana bir sahifa. {name}ning tug‘ilgan kunini eng yaqin insonlarimiz bilan nishonlamoqchimiz. Kechamizga marhamat!";

/**
 * Dress-kod (Figma «Sham / Dress-kod»: Turi=Smart casual | Kechki) — rasmsiz: konfetti, «Dress-kod», turi (kursiv) va bitta izoh.
 * Mijoz `dressNote` yozsa — o‘sha matn.
 */
export const DRESS_TEXT: Record<string, string> = {
  "Smart casual": "Qulay va bayramona — o‘zingizni erkin his qiladigan kiyim.",
  Kechki: "Kechki libos va kostyum — oqshom ruhida.",
  Bayramona: "Bayramona, yorqin kiyim — kechamizga ko‘tarinki kayfiyat olib keling.",
  Klassik: "Klassik uslub: kostyum yoki nafis ko‘ylak.",
  Ixtiyoriy: "Maxsus talab yo‘q — o‘zingizga qulay, bayramona kiyimda keling.",
};
