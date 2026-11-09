/** Parvoz shabloni — namuna matnlar va yordamchilar (Figma 282:4717 mobil / 290:4795 laptop) */
import type { Locale } from "@/lib/i18n";
import type { ProgramItem } from "../anor/data";

export const P = "/templates/parvoz";

export const PARVOZ_DEMO = {
  guest: "",
  message: "Hayotimizdagi eng muhim parvozga — nikoh to‘yimizga sizni taklif qilamiz. Shu kuni yonimizda bo‘lishingizni chin dildan istaymiz.",
  venueTitle: "Sky Terrace restorani",
  address: "Toshkent sh., Amir Temur ko‘chasi, 107 — 21-qavat",
  venueNote: "Mehmonlar uchun bepul avtoturargoh mavjud",
  program: [
    { time: "16:30", title: "Kutib olish", note: "Welcome-drink, jonli musiqa va birinchi suratlar" },
    { time: "17:30", title: "Nikoh marosimi", note: "Eng muhim lahzaga guvoh bo‘ling" },
    { time: "18:30", title: "To‘y bazmi", note: "Kechki ziyofat, raqs va iliq tilaklar" },
    { time: "21:00", title: "To‘y torti", note: "Shirin lahza va birgalikdagi qadah" },
    { time: "22:30", title: "Salyut", note: "Kechani osmonda birga yakunlaymiz" },
  ] as ProgramItem[],
  dressCode: "Klassik",
  story1: "Uchrashuv · 2021",
  story2: "Unashtiruv · 2025",
  quote: "Yo‘l qanchalik uzoq bo‘lmasin, eng go‘zal manzil — bir-birimiz.",
};

/** Namuna — ruscha (taklifnoma tili ruscha bo‘lsa) */
export const PARVOZ_DEMO_RU: typeof PARVOZ_DEMO = {
  guest: "",
  message: "Приглашаем вас в самый важный полёт нашей жизни — на наш никах. Мы от всего сердца хотим, чтобы в этот день вы были рядом.",
  venueTitle: "Ресторан Sky Terrace",
  address: "г. Ташкент, ул. Амира Темура, 107 — 21-й этаж",
  venueNote: "Для гостей есть бесплатная парковка",
  program: [
    { time: "16:30", title: "Встреча гостей", note: "Welcome-drink, живая музыка и первые фото" },
    { time: "17:30", title: "Церемония никаха", note: "Станьте свидетелями самого важного момента" },
    { time: "18:30", title: "Свадебный банкет", note: "Ужин, танцы и тёплые пожелания" },
    { time: "21:00", title: "Свадебный торт", note: "Сладкий момент и общий тост" },
    { time: "22:30", title: "Салют", note: "Завершим вечер вместе в небе" },
  ],
  dressCode: "Klassik",
  story1: "Знакомство · 2021",
  story2: "Помолвка · 2025",
  quote: "Как бы ни был долог путь, самое прекрасное место назначения — друг в друге.",
};

export const PARVOZ_DEMO_EN: typeof PARVOZ_DEMO = {
  guest: "",
  message: "We invite you on the most important flight of our lives — our nikah. We would love to have you with us on this day.",
  venueTitle: "Sky Terrace Restaurant",
  address: "107 Amir Temur Street, 21st floor, Tashkent",
  venueNote: "Free parking for guests",
  program: [
    { time: "16:30", title: "Guest arrival", note: "Welcome drinks, live music and first photos" },
    { time: "17:30", title: "Nikah ceremony", note: "Witness the most important moment" },
    { time: "18:30", title: "Wedding banquet", note: "Dinner, dancing and warm wishes" },
    { time: "21:00", title: "Wedding cake", note: "A sweet moment and a toast together" },
    { time: "22:30", title: "Fireworks", note: "We end the evening together under the sky" },
  ],
  dressCode: "Klassik",
  story1: "First met · 2021",
  story2: "Engagement · 2025",
  quote: "However long the journey, the most beautiful destination is each other.",
};

const MON = ["YAN", "FEV", "MAR", "APR", "MAY", "IYN", "IYL", "AVG", "SEN", "OKT", "NOY", "DEK"];
const MON_RU = ["ЯНВ", "ФЕВ", "МАР", "АПР", "МАЙ", "ИЮН", "ИЮЛ", "АВГ", "СЕН", "ОКТ", "НОЯ", "ДЕК"];
/** Chipta uchun qisqa oy: «SEN» / «СЕН» */
const MON_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
export const monShort = (m: number, lang: Locale) => (lang === "ru" ? MON_RU : lang === "en" ? MON_EN : MON)[m] ?? "";

const VOWELS = /[aeiouyаеёиоуыэюяўу]/i;
/** Aeroport kodi uslubida 3 harf: Jasur → JSR, Madina → MDN (birinchi harf + undoshlar) */
export function airCode(name: string | null | undefined) {
  const letters = [...(name ?? "").toUpperCase().replace(/[^\p{L}]/gu, "")];
  if (!letters.length) return "";
  const out = [letters[0]];
  for (const ch of letters.slice(1)) if (out.length < 3 && !VOWELS.test(ch)) out.push(ch);
  for (const ch of letters.slice(1)) if (out.length < 3 && VOWELS.test(ch)) out.push(ch);
  return out.slice(0, 3).join("");
}

/** "17:30" → "16:30" (bording — uchishdan bir soat oldin) */
export function minusHour(time: string) {
  const m = time.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "";
  const h = (Number(m[1]) + 23) % 24;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

/** Yo‘l chizig‘i: bekatlar orasida yarim to‘lqin (Figma — amplituda 16.5, galma-gal chap/o‘ng) */
export function wavePath(stops: number[], center: number, amp: number, lead: number, vertical: boolean) {
  if (!stops.length) return "";
  const pt = (a: number, b: number) => (vertical ? `${b.toFixed(1)} ${a.toFixed(1)}` : `${a.toFixed(1)} ${b.toFixed(1)}`);
  const first = stops[0] - lead;
  let d = `M${pt(first, center)}`;
  const seg = (a: number, b: number, dir: number) => {
    const k = (b - a) * 0.3642; // yarim sinus uchun Bezier yaqinlashuvi
    const peak = center + (amp * dir * 4) / 3;
    d += ` C${pt(a + k, peak)} ${pt(b - k, peak)} ${pt(b, center)}`;
  };
  seg(first, stops[0], 1);
  for (let i = 0; i < stops.length - 1; i++) seg(stops[i], stops[i + 1], i % 2 ? 1 : -1);
  return d;
}

/** wavePath bilan bir xil egri ustidagi nuqta va yo‘nalish (samolyot uchun) */
export function wavePoint(stops: number[], center: number, amp: number, lead: number, t: number) {
  const pts = [stops[0] - lead, ...stops];
  const total = pts[pts.length - 1] - pts[0];
  const a = pts[0] + total * Math.min(1, Math.max(0, t));
  let i = 0;
  while (i < pts.length - 2 && a > pts[i + 1]) i++;
  const s0 = pts[i];
  const s1 = pts[i + 1];
  const dir = i === 0 ? 1 : (i - 1) % 2 ? 1 : -1;
  const u = (a - s0) / Math.max(1, s1 - s0);
  const off = amp * dir * Math.sin(Math.PI * u);
  const slope = (amp * dir * Math.PI * Math.cos(Math.PI * u)) / Math.max(1, s1 - s0);
  return { along: a, off: center + off, angle: (Math.atan(slope) * 180) / Math.PI };
}
