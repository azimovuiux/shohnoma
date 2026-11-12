/** Kalit shabloni — namuna matnlar (Figma 357:5593 mobil / 360:5619 laptop) */
import type { ProgramItem } from "../anor/data";

export const P = "/templates/kalit";

export type KalitDemo = {
  /** «Aziz mehmonimiz,» dan keyingi davom (Figma’da kichik harf bilan boshlanadi) */
  message: string;
  venueTitle: string;
  address: string;
  program: ProgramItem[];
  dressCode: string;
  /** 07 · Lahza — nur ostidagi qo‘llar ostidagi iqtibos */
  quote: string;
};

/** Namuna — Figma’dagi matnlar */
export const KALIT_DEMO: KalitDemo = {
  message: "hayotimizning eng yorug‘ kunida — nikoh to‘yimizda — sizni yonimizda ko‘rishni istaymiz. Bu kun bizning sevgi hikoyamizning yangi, eng go‘zal sahifasi bo‘ladi.",
  venueTitle: "«Grand Library» zali",
  address: "Toshkent sh., Mustaqillik ko‘chasi, 21",
  program: [
    { time: "17:00", title: "Mehmonlarni kutib olish" },
    { time: "17:40", title: "Nikoh marosimi" },
    { time: "18:30", title: "Kechki ziyofat" },
    { time: "20:00", title: "Birinchi raqs" },
    { time: "21:30", title: "To‘y torti" },
    { time: "22:30", title: "Salyut" },
  ],
  dressCode: "Klassik",
  quote: "Seni birinchi ko‘rganimda vaqt to‘xtadi.\nEndi esa butun umrim — shu lahza.",
};

export const KALIT_DEMO_RU: KalitDemo = {
  message: "в самый светлый день нашей жизни — в день нашей свадьбы — мы хотим видеть вас рядом. Этот день станет новой, самой красивой страницей нашей истории любви.",
  venueTitle: "Зал «Grand Library»",
  address: "г. Ташкент, ул. Мустакиллик, 21",
  program: [
    { time: "17:00", title: "Встреча гостей" },
    { time: "17:40", title: "Церемония никаха" },
    { time: "18:30", title: "Праздничный ужин" },
    { time: "20:00", title: "Первый танец" },
    { time: "21:30", title: "Свадебный торт" },
    { time: "22:30", title: "Салют" },
  ],
  dressCode: "Klassik",
  quote: "Когда я впервые увидел тебя, время остановилось.\nТеперь вся моя жизнь — этот миг.",
};

export const KALIT_DEMO_EN: KalitDemo = {
  message: "on the brightest day of our lives — our wedding day — we would love to have you by our side. This day will be a new and most beautiful page of our love story.",
  venueTitle: "The Grand Library Hall",
  address: "21 Mustaqillik Street, Tashkent",
  program: [
    { time: "17:00", title: "Guests arrive" },
    { time: "17:40", title: "Nikah ceremony" },
    { time: "18:30", title: "Evening reception" },
    { time: "20:00", title: "First dance" },
    { time: "21:30", title: "Wedding cake" },
    { time: "22:30", title: "Fireworks" },
  ],
  dressCode: "Klassik",
  quote: "When I first saw you, time stood still.\nNow my whole life is that moment.",
};

/** Dress-kod ostidagi bir qator (Figma: «Kechaning ohangi — klassika»); kalit — DB’dagi dress-kod qiymati */
export const DRESS_TONE: Record<string, string> = {
  Klassik: "Kechaning ohangi — klassika",
  "Kechki rasmiy": "Kechaning ohangi — kechki rasmiy uslub",
  Milliy: "Kechaning ohangi — milliy libos",
  Ixtiyoriy: "Kechaning ohangi — erkin uslub",
};
