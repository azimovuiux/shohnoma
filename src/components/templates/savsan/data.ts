/** Savsan shabloni — namuna matnlar va yordamchilar (Figma 315:5016 mobil / 329:5198 laptop) */
import type { Locale } from "@/lib/i18n";
import type { ProgramItem } from "../anor/data";

export const P = "/templates/savsan";

export type SavsanDemo = {
  message: string;
  venueTitle: string;
  address: string;
  hall: string;
  program: ProgramItem[];
  dressCode: string;
  quote: string;
  caption: string;
};

/** Namuna — Figma’dagi matnlar */
export const SAVSAN_DEMO: SavsanDemo = {
  message: "Ikki qalb bir bo‘lganda hayot yangi sahifa ochadi. Shu go‘zal kunimizda yonimizda bo‘lishingizni chin dildan istaymiz.",
  venueTitle: "Gulzor Garden restorani",
  address: "Toshkent sh., Bog‘ko‘cha, 7",
  hall: "Bog‘ zali",
  program: [
    { time: "16:00", title: "Mehmonlarni kutib olish", note: "Iliq so‘zlar va birinchi suratlar" },
    { time: "17:00", title: "Nikoh marosimi", note: "Hikoyamizning eng muhim sahifasi" },
    { time: "18:00", title: "To‘y bazmi", note: "Kechki ziyofat, raqs va tilaklar" },
    { time: "21:00", title: "To‘y torti", note: "Kunning eng shirin lahzasi" },
  ],
  dressCode: "Klassik",
  quote: "Ikki qalb uchrashganda vaqt she’rga aylanadi, hayot esa abadiy va’daga.",
  caption: "Sevgi — bir umrlik chiroyli sayohat",
};

export const SAVSAN_DEMO_RU: SavsanDemo = {
  message: "Когда два сердца становятся одним, жизнь открывает новую страницу. Мы от всей души хотим, чтобы в этот прекрасный день вы были рядом.",
  venueTitle: "Ресторан Gulzor Garden",
  address: "г. Ташкент, ул. Богкуча, 7",
  hall: "Садовый зал",
  program: [
    { time: "16:00", title: "Встреча гостей", note: "Тёплые слова и первые фото" },
    { time: "17:00", title: "Церемония никаха", note: "Самая важная страница нашей истории" },
    { time: "18:00", title: "Свадебный банкет", note: "Ужин, танцы и пожелания" },
    { time: "21:00", title: "Свадебный торт", note: "Самый сладкий момент дня" },
  ],
  dressCode: "Klassik",
  quote: "Когда встречаются два сердца, время становится стихами, а жизнь — вечным обещанием.",
  caption: "Любовь — путешествие длиною в жизнь",
};

export const SAVSAN_DEMO_EN: SavsanDemo = {
  message: "When two hearts become one, life turns a new page. We sincerely hope you will be with us on this beautiful day.",
  venueTitle: "Gulzor Garden Restaurant",
  address: "7 Bogkucha Street, Tashkent",
  hall: "Garden Hall",
  program: [
    { time: "16:00", title: "Guests arrive", note: "Warm words and first photos" },
    { time: "17:00", title: "Nikah ceremony", note: "The most important page of our story" },
    { time: "18:00", title: "Wedding banquet", note: "Dinner, dancing and wishes" },
    { time: "21:00", title: "Wedding cake", note: "The sweetest moment of the day" },
  ],
  dressCode: "Klassik",
  quote: "When two hearts meet, time turns into poetry and life into an eternal promise.",
  caption: "Love is a beautiful lifelong journey",
};

/** Kalendar kartasidagi hafta kunlari (Figma: D S Ch P J Sh Y) */
export const calWeek = (lang: Locale) =>
  lang === "ru" ? ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] : lang === "en" ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] : ["D", "S", "Ch", "P", "J", "Sh", "Y"];

const ICONS: [RegExp, string][] = [
  [/tort|shirin|торт|сладк|десерт|cake|dessert/i, "cake"],
  [/nikoh|uzuk|fotiha|marosim|rasmiy|никах|кольц|фотиха|церемон|регистрац|nikah|ceremony|ring|vow/i, "rings"],
  [/bazm|ziyofat|raqs|musiqa|kecha|dasturxon|банкет|ужин|танц|музык|праздн|banquet|dinner|party|celebrat|danc|music/i, "music"],
  [/kutib|yig‘il|yig'il|mehmon|sharbat|qadah|встреч|сбор|гост|напит|бокал|фуршет|arriv|drink|welcome|guest/i, "glasses"],
];
const ORDER = ["glasses", "rings", "music", "cake"];

/** Dastur bandiga mos chiziqli ikonka (kalit so‘z bo‘yicha, topilmasa — tartib bo‘yicha) */
export function programIcon(it: ProgramItem, i: number) {
  const text = `${it.title} ${it.note ?? ""}`;
  const hit = ICONS.find(([re]) => re.test(text));
  return `${P}/i-${hit ? hit[1] : ORDER[i % ORDER.length]}.svg`;
}

/** Oy taqvimi: Du-dan boshlanadigan haftalar, bo‘sh kataklar — null */
export function monthGrid(y: number, m: number) {
  const first = new Date(Date.UTC(y, m, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}
