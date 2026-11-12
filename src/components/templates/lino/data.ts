/** Lino shabloni — namuna matnlar (Figma 378:7014 mobil / 380:7056 laptop) */
import type { ProgramItem } from "../anor/data";

export const P = "/templates/lino";

export type LinoDemo = {
  /** «Aziz mehmonimiz,» dan keyingi davom (Figma’da kichik harf bilan boshlanadi) */
  message: string;
  venueTitle: string;
  address: string;
  program: ProgramItem[];
  dressCode: string;
};

/** Namuna — Figma’dagi matnlar */
export const LINO_DEMO: LinoDemo = {
  message: "hayotimizdagi eng go‘zal kunni siz bilan baham ko‘rmoqchimiz. Nikoh to‘yimizga tashrif buyurib, quvonchimizga sherik bo‘lishingizni chin dildan so‘raymiz.",
  venueTitle: "«Zaytun bog‘i» restorani",
  address: "Toshkent sh., Qorasuv ko‘chasi, 14",
  program: [
    { time: "17:00", title: "Mehmonlarni kutib olish" },
    { time: "17:40", title: "Nikoh marosimi" },
    { time: "18:30", title: "Kechki ziyofat" },
    { time: "20:30", title: "Birinchi raqs" },
    { time: "21:30", title: "To‘y torti" },
  ],
  dressCode: "Klassik",
};

export const LINO_DEMO_RU: LinoDemo = {
  message: "мы хотим разделить с вами самый прекрасный день нашей жизни. Будем искренне рады, если вы придёте на нашу свадьбу и разделите с нами эту радость.",
  venueTitle: "Ресторан «Зайтун бог»",
  address: "г. Ташкент, ул. Карасу, 14",
  program: [
    { time: "17:00", title: "Встреча гостей" },
    { time: "17:40", title: "Церемония никаха" },
    { time: "18:30", title: "Праздничный ужин" },
    { time: "20:30", title: "Первый танец" },
    { time: "21:30", title: "Свадебный торт" },
  ],
  dressCode: "Klassik",
};

export const LINO_DEMO_EN: LinoDemo = {
  message: "we would love to share the most beautiful day of our lives with you. We warmly invite you to our wedding and hope you will share in our joy.",
  venueTitle: "Zaytun Bog‘i Restaurant",
  address: "14 Qorasuv Street, Tashkent",
  program: [
    { time: "17:00", title: "Guests arrive" },
    { time: "17:40", title: "Nikah ceremony" },
    { time: "18:30", title: "Evening reception" },
    { time: "20:30", title: "First dance" },
    { time: "21:30", title: "Wedding cake" },
  ],
  dressCode: "Klassik",
};

/** Lino dress-kod kartasida sarlavha — Figma «Lino / Dress-kod» (Milliy turi «Milliy» deb yozilgan) */
export const DRESS_TITLE: Record<string, string> = {
  Milliy: "Milliy",
};
