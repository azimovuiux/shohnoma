/** Kumush shabloni — namuna matnlar (Figma 379:7034 mobil / 380:7167 laptop) */
import type { ProgramItem } from "../anor/data";

export const P = "/templates/kumush";

export type KumushDemo = {
  message: string;
  quote: string;
  venueTitle: string;
  address: string;
  program: ProgramItem[];
  dressCode: string;
};

/** Namuna — Figma’dagi matnlar */
export const KUMUSH_DEMO: KumushDemo = {
  message: "Ikki taqdir bir yo‘lga birlashadigan kunda — nikoh to‘yimizda — sizni yonimizda ko‘rishdan baxtiyor bo‘lamiz.",
  quote: "Har bir kadr — biz birga yozgan hikoyaning bir satri.",
  venueTitle: "«Opera» banket zali",
  address: "Toshkent sh., Shota Rustaveli ko‘chasi, 3",
  program: [
    { time: "17:00", title: "Mehmonlarni kutib olish" },
    { time: "17:40", title: "Nikoh marosimi" },
    { time: "18:30", title: "Kechki ziyofat" },
    { time: "20:30", title: "Birinchi raqs" },
    { time: "21:30", title: "To‘y torti" },
  ],
  dressCode: "Kechki rasmiy",
};

export const KUMUSH_DEMO_RU: KumushDemo = {
  message: "В день, когда две судьбы соединяются в одну, — на нашей свадьбе — мы будем счастливы видеть вас рядом.",
  quote: "Каждый кадр — строчка истории, которую мы пишем вместе.",
  venueTitle: "Банкетный зал «Опера»",
  address: "г. Ташкент, ул. Шота Руставели, 3",
  program: [
    { time: "17:00", title: "Встреча гостей" },
    { time: "17:40", title: "Церемония никаха" },
    { time: "18:30", title: "Праздничный ужин" },
    { time: "20:30", title: "Первый танец" },
    { time: "21:30", title: "Свадебный торт" },
  ],
  dressCode: "Kechki rasmiy",
};

export const KUMUSH_DEMO_EN: KumushDemo = {
  message: "On the day two lives become one — at our wedding — we would be so happy to have you with us.",
  quote: "Every frame is a line of the story we are writing together.",
  venueTitle: "Opera Banquet Hall",
  address: "3 Shota Rustaveli Street, Tashkent",
  program: [
    { time: "17:00", title: "Guests arrive" },
    { time: "17:40", title: "Nikah ceremony" },
    { time: "18:30", title: "Evening reception" },
    { time: "20:30", title: "First dance" },
    { time: "21:30", title: "Wedding cake" },
  ],
  dressCode: "Kechki rasmiy",
};

/** Kumush dress-kod kartasida sarlavha — Figma «Kumush / Dress-kod» (Milliy turi «Milliy» deb yozilgan) */
export const DRESS_TITLE: Record<string, string> = {
  Milliy: "Milliy",
};
