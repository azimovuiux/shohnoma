/** Muhr shabloni — namuna matnlar (Figma 334:5224 mobil / 338:5258 laptop) */
import type { ProgramItem } from "../anor/data";

export const P = "/templates/muhr";

export type MuhrDemo = {
  message: string;
  venueTitle: string;
  address: string;
  program: ProgramItem[];
  dressCode: string;
  /** 04 · Portret ostidagi iqtibos */
  quote: string;
  /** 07 · Lahzalar ostidagi yozuv */
  caption: string;
};

/** Namuna — Figma’dagi matnlar */
export const MUHR_DEMO: MuhrDemo = {
  message: "Hayotimizning eng muhim kunida — nikoh to‘yimizda — sizni yonimizda ko‘rishni chin dildan istaymiz.",
  venueTitle: "Grand Palace Hall",
  address: "Toshkent sh., Shota Rustaveli ko‘chasi, 15",
  program: [
    {
      time: "16:30",
      title: "Mehmonlarni kutib olish",
      note: "Welcome-drink va jonli musiqa",
    },
    {
      time: "17:00",
      title: "Nikoh marosimi",
      note: "Eng muhim lahzaga guvoh bo‘ling",
    },
    {
      time: "18:00",
      title: "Kechki ziyofat",
      note: "Ziyofat, raqs va iliq tilaklar",
    },
    { time: "21:00", title: "To‘y torti", note: "Kunning eng shirin lahzasi" },
  ],
  dressCode: "Kechki rasmiy",
  quote: "Seni topganim — taqdirning eng chiroyli muhri.",
  caption: "Muhabbat — bir umrga bosilgan muhr.",
};

export const MUHR_DEMO_RU: MuhrDemo = {
  message: "В самый важный день нашей жизни — в день нашей свадьбы — мы от всей души хотим видеть вас рядом.",
  venueTitle: "Grand Palace Hall",
  address: "г. Ташкент, ул. Шота Руставели, 15",
  program: [
    {
      time: "16:30",
      title: "Встреча гостей",
      note: "Welcome-drink и живая музыка",
    },
    {
      time: "17:00",
      title: "Церемония никаха",
      note: "Станьте свидетелями главного момента",
    },
    {
      time: "18:00",
      title: "Праздничный ужин",
      note: "Угощения, танцы и тёплые пожелания",
    },
    {
      time: "21:00",
      title: "Свадебный торт",
      note: "Самый сладкий момент дня",
    },
  ],
  dressCode: "Kechki rasmiy",
  quote: "Найти тебя — самая красивая печать судьбы.",
  caption: "Любовь — печать, поставленная на всю жизнь.",
};

export const MUHR_DEMO_EN: MuhrDemo = {
  message: "On the most important day of our lives — our wedding day — we sincerely hope to see you by our side.",
  venueTitle: "Grand Palace Hall",
  address: "15 Shota Rustaveli Street, Tashkent",
  program: [
    {
      time: "16:30",
      title: "Guests arrive",
      note: "Welcome drinks and live music",
    },
    {
      time: "17:00",
      title: "Nikah ceremony",
      note: "Witness the most important moment",
    },
    {
      time: "18:00",
      title: "Evening reception",
      note: "Dinner, dancing and warm wishes",
    },
    {
      time: "21:00",
      title: "Wedding cake",
      note: "The sweetest moment of the day",
    },
  ],
  dressCode: "Kechki rasmiy",
  quote: "Finding you is fate’s most beautiful seal.",
  caption: "Love is a seal pressed for a lifetime.",
};
