/** Zumrad shabloni — namuna matnlar (Figma 264:4606 / 267:4653) */
import type { ProgramItem } from "../anor/data";

export const Z = "/templates/zumrad";

export const ZUMRAD_DEMO = {
  guest: "Dilshod aka va Gulnora opa",
  message: "Hayotimizning eng baxtli kunida — nikoh to‘yimizda — sizni yonimizda ko‘rishni chin dildan istaymiz. Bu kunni siz bilan birga nishonlash biz uchun katta quvonch.",
  hosts: "Karimovlar va Rahimovlar oilasi",
  address: "Toshkent sh., Yunusobod tumani, Amir Temur ko‘chasi, 108",
  program: [
    { time: "17:00", title: "Mehmonlarni kutib olish", note: "Sharbat va jonli musiqa" },
    { time: "17:40", title: "Nikoh marosimi", note: "Fotiha va uzuk almashish" },
    { time: "18:30", title: "Ziyofat", note: "Kechki dasturxon" },
    { time: "20:00", title: "Birinchi raqs", note: "Kelin-kuyov valsi" },
    { time: "21:30", title: "To‘y torti", note: "Shirin lahza" },
    { time: "22:30", title: "Salyut", note: "Kecha yakuni" },
  ] as ProgramItem[],
  dressCode: "Klassik",
  storyText: "Universitet kutubxonasida boshlangan tanishuv — endi bir umrlik hikoya.",
  caption: "Bir umrga",
};

/** Namuna — ruscha (taklifnoma tili ruscha bo‘lsa) */
export const ZUMRAD_DEMO_RU: typeof ZUMRAD_DEMO = {
  guest: "Дильшод ака и Гульнора опа",
  message: "В самый счастливый день нашей жизни — на нашем никахе — мы от всего сердца хотим видеть вас рядом. Отпраздновать этот день вместе с вами — большая радость для нас.",
  hosts: "Семьи Каримовых и Рахимовых",
  address: "г. Ташкент, Юнусабадский район, ул. Амира Темура, 108",
  program: [
    { time: "17:00", title: "Встреча гостей", note: "Напитки и живая музыка" },
    { time: "17:40", title: "Церемония никаха", note: "Фотиха и обмен кольцами" },
    { time: "18:30", title: "Банкет", note: "Праздничный ужин" },
    { time: "20:00", title: "Первый танец", note: "Вальс жениха и невесты" },
    { time: "21:30", title: "Свадебный торт", note: "Сладкий момент" },
    { time: "22:30", title: "Салют", note: "Завершение вечера" },
  ],
  dressCode: "Klassik",
  storyText: "Знакомство, начавшееся в университетской библиотеке, — теперь история на всю жизнь.",
  caption: "Навсегда",
};

export const ZUMRAD_DEMO_EN: typeof ZUMRAD_DEMO = {
  guest: "Mr and Mrs Karimov",
  message: "On the happiest day of our lives — our nikah — we would love to have you by our side. Celebrating this day together with you means the world to us.",
  hosts: "The Karimov and Rahimov families",
  address: "108 Amir Temur Street, Yunusabad, Tashkent",
  program: [
    { time: "17:00", title: "Guest arrival", note: "Drinks and live music" },
    { time: "17:40", title: "Nikah ceremony", note: "Fotiha and ring exchange" },
    { time: "18:30", title: "Banquet", note: "Celebration dinner" },
    { time: "20:00", title: "First dance", note: "The couple’s waltz" },
    { time: "21:30", title: "Wedding cake", note: "A sweet moment" },
    { time: "22:30", title: "Fireworks", note: "End of the evening" },
  ],
  dressCode: "Klassik",
  storyText: "A story that began in the university library — now a story for a lifetime.",
  caption: "Forever",
};

/** Onion-ravoq (Figma «Osmon» maskasi, 300×380) — istalgan o‘lchamga */
export function ogee(w: number, h: number, inset = 0) {
  const sx = (w - inset * 2) / 300;
  const x = (n: number) => +(inset + n * sx).toFixed(2);
  const y = (n: number) => +(inset + n * sx).toFixed(2);
  const b = h - inset;
  return `M${x(0)} ${b}V${y(165)}C${x(0)} ${y(90)} ${x(54)} ${y(60)} ${x(102)} ${y(36)}C${x(132)} ${y(21)} ${x(141)} ${y(12)} ${x(150)} ${y(0)}C${x(159)} ${y(12)} ${x(168)} ${y(21)} ${x(198)} ${y(36)}C${x(246)} ${y(60)} ${x(300)} ${y(90)} ${x(300)} ${y(165)}V${b}Z`;
}
