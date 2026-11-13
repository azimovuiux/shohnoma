/** Riviera shabloni — namuna matnlar (Figma 391:8428 mobil / 392:8360 laptop) */
import type { ProgramItem } from "../anor/data";

export const P = "/templates/riviera";

export type RivieraDemo = {
  message: string;
  venueTitle: string;
  address: string;
  program: ProgramItem[];
  dressCode: string;
};

/** Namuna — Figma’dagi matnlar */
export const RIVIERA_DEMO: RivieraDemo = {
  message: "Hayotimizdagi eng muhim kunni siz bilan baham ko‘rmoqchimiz. Nikoh to‘yimizga tashrif buyurishingizni chin dildan so‘raymiz.",
  venueTitle: "Villa «Riviera»",
  address: "Toshkent sh., Yunusobod tumani, Bodomzor yo‘li, 7",
  program: [
    { time: "17:00", title: "Kutib olish", note: "Shampan va jonli musiqa" },
    { time: "18:00", title: "Nikoh marosimi", note: "Terrasada, quyosh botishida" },
    { time: "19:30", title: "Kechki ziyofat", note: "Mualliflik menyusi" },
    { time: "22:00", title: "Raqslar", note: "Birinchi raqs va to‘y torti" },
  ],
  dressCode: "Kechki rasmiy",
};

export const RIVIERA_DEMO_RU: RivieraDemo = {
  message: "Мы хотим разделить с вами самый важный день нашей жизни. От всего сердца приглашаем вас на нашу свадьбу.",
  venueTitle: "Вилла «Ривьера»",
  address: "г. Ташкент, Юнусабадский район, Бодомзор йули, 7",
  program: [
    { time: "17:00", title: "Встреча гостей", note: "Шампанское и живая музыка" },
    { time: "18:00", title: "Церемония никаха", note: "На террасе, на закате" },
    { time: "19:30", title: "Праздничный ужин", note: "Авторское меню" },
    { time: "22:00", title: "Танцы", note: "Первый танец и свадебный торт" },
  ],
  dressCode: "Kechki rasmiy",
};

export const RIVIERA_DEMO_EN: RivieraDemo = {
  message: "We would love to share the most important day of our lives with you. We warmly invite you to our wedding.",
  venueTitle: "Villa Riviera",
  address: "7 Bodomzor Road, Yunusabad District, Tashkent",
  program: [
    { time: "17:00", title: "Welcome", note: "Champagne and live music" },
    { time: "18:00", title: "Nikah ceremony", note: "On the terrace, at sunset" },
    { time: "19:30", title: "Dinner", note: "Signature menu" },
    { time: "22:00", title: "Dancing", note: "First dance and wedding cake" },
  ],
  dressCode: "Kechki rasmiy",
};

/**
 * Dress-kod kartasi (Figma «Riviera / Dress-kod»: Turi=Black tie / Kokteyl) — rasmsiz, faqat matn:
 * sarlavha (kursiv, oltin), izoh va qisqa qator. Turlari umumiy ro‘yxatdan (Klassik, Kechki rasmiy, Milliy, Ixtiyoriy).
 */
export const DRESS_TEXT: Record<string, { title: string; note: string }> = {
  "Kechki rasmiy": { title: "Black tie", note: "Erkaklar — smoking yoki to‘q kostyum, ayollar — uzun kechki libos." },
  Klassik: { title: "Klassik", note: "Erkaklar — kostyum-shim, ayollar — nafis kechki yoki marosim ko‘ylagi." },
  Milliy: { title: "Milliy libos", note: "Atlas yoki adras ko‘ylak, chopon va do‘ppi mamnuniyat bilan kutiladi." },
  Ixtiyoriy: { title: "Ixtiyoriy", note: "Maxsus talab yo‘q — o‘zingizga qulay, bayramona kiyimda keling." },
};
