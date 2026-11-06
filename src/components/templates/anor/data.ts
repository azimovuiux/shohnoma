/** Anor shabloni — matnlar, namuna ma’lumotlar va yordamchi funksiyalar */

export const A = "/templates/anor";

export type ProgramItem = { time: string; title: string; note?: string };
export type StoryItem = { year?: string; caption: string };

/** Namuna (Jonli ko‘rish) — Figma’dagi matnlar */
export const ANOR_DEMO = {
  guest: "Dilshod aka va Gulnora opa",
  message: "Ikki qalb va ikki oila bir dasturxon atrofida birlashadigan kunimizda — nikoh to‘yimizda sizni eng aziz mehmonimiz sifatida ko‘rishdan baxtiyormiz.",
  hosts: "Karimovlar va Rahimovlar oilasi",
  address: "Toshkent sh., Yunusobod tumani, Amir Temur ko‘chasi, 108",
  program: [
    { time: "17:00", title: "Kutib olish", note: "Sharbat va jonli musiqa" },
    { time: "17:40", title: "Nikoh marosimi", note: "Fotiha va uzuk almashish" },
    { time: "18:30", title: "Ziyofat", note: "Kechki dasturxon" },
    { time: "20:00", title: "Birinchi raqs", note: "Kelin-kuyov valsi" },
    { time: "21:30", title: "To‘y torti", note: "Shirin lahza" },
    { time: "22:30", title: "Salyut", note: "Kecha yakuni" },
  ] as ProgramItem[],
  dressCode: "Klassik",
  storyText: "Universitet kutubxonasida bir kitobni ikkovimiz ham so‘ragan kundan boshlangan hikoya — endi bir umrlik.",
  story: [
    { year: "2021", caption: "Tanishuv" },
    { year: "2024", caption: "Taklif" },
    { year: "2026", caption: "Nikoh" },
  ] as StoryItem[],
};

export const DRESS: Record<string, { title: string; sub: string; note: string; imgs: { src: string; label: string }[] }> = {
  Klassik: {
    title: "Klassik",
    sub: "Kostyum-shim va marosim ko‘ylagi",
    note: "Erkaklar — kostyum-shim (galstuk ixtiyoriy), ayollar — marosim ko‘ylagi yoki nafis libos.",
    imgs: [
      { src: `${A}/dress-klassik-ayol.webp`, label: "Ayollar" },
      { src: `${A}/dress-klassik-erkak.webp`, label: "Erkaklar" },
    ],
  },
  "Kechki rasmiy": {
    title: "Kechki rasmiy",
    sub: "Smoking va uzun kechki libos",
    note: "Erkaklar — smoking yoki to‘q rangli kostyum va kapalak galstuk, ayollar — uzun kechki libos.",
    imgs: [
      { src: `${A}/dress-kechki-ayol.webp`, label: "Ayollar" },
      { src: `${A}/dress-kechki-erkak.webp`, label: "Erkaklar" },
    ],
  },
  Milliy: {
    title: "Milliy libos",
    sub: "Atlas, adras, chopon va do‘ppi",
    note: "Milliy liboslarimizda keling — atlas yoki adras ko‘ylak, chopon va do‘ppi mamnuniyat bilan kutiladi.",
    imgs: [
      { src: `${A}/dress-milliy-ayol.webp`, label: "Ayollar" },
      { src: `${A}/dress-milliy-erkak.webp`, label: "Erkaklar" },
    ],
  },
  Ixtiyoriy: {
    title: "Ixtiyoriy",
    sub: "O‘zingizga qulay va bayramona",
    note: "Maxsus talab yo‘q — o‘zingizni yaxshi his qiladigan, chiroyli kiyimda keling.",
    imgs: [{ src: `${A}/dress-ixtiyoriy.webp`, label: "Hamma uchun" }],
  },
};

const ICONS: [RegExp, string][] = [
  [/kutib|sharbat|qadah|mehmon/i, "qadahlar"],
  [/nikoh|uzuk|fotiha|marosim|rasmiy/i, "uzuklar"],
  [/ziyofat|dasturxon|osh|kechki|tushlik|nonushta/i, "ziyofat"],
  [/raqs|vals|guldasta|gul/i, "guldasta"],
  [/tort|shirin/i, "tort"],
  [/salyut|yakun|feyerverk|xayr/i, "salyut"],
];
const ORDER = ["qadahlar", "uzuklar", "ziyofat", "guldasta", "tort", "salyut"];

/** Dastur bandiga mos ikonka (kalit so‘z bo‘yicha, topilmasa — tartib bo‘yicha) */
export function programIcon(it: ProgramItem, i: number) {
  const text = `${it.title} ${it.note ?? ""}`;
  const hit = ICONS.find(([re]) => re.test(text));
  return `${A}/i-${hit ? hit[1] : ORDER[i % ORDER.length]}.webp`;
}

export const WEEK = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
export const WEEKDAY = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
export const MONTHS = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
export const MONTHS_LOWER = MONTHS.map((m) => m.toLowerCase());

/** Sana atrofidagi hafta (Du…Ya) */
export function weekOf(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  const dow = (base.getUTCDay() + 6) % 7; // Du = 0
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(base);
    x.setUTCDate(d - dow + i);
    return { day: x.getUTCDate(), current: i === dow };
  });
}

/** Xarita havolasidan koordinatalar (Yandex ll=lon,lat / Google @lat,lng yoki q=lat,lng) */
export function coordsFrom(url: string | null | undefined): { lat: number; lon: number } | null {
  if (!url) return null;
  const ll = url.match(/[?&](?:ll|pt|whatshere%5Bpoint%5D)=(-?\d+\.\d+)(?:%2C|,)(-?\d+\.\d+)/);
  if (ll) return { lon: Number(ll[1]), lat: Number(ll[2]) };
  const g = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || url.match(/[?&](?:q|query|destination)=(-?\d+\.\d+)(?:%2C|,)\s*(-?\d+\.\d+)/);
  if (g) return { lat: Number(g[1]), lon: Number(g[2]) };
  return null;
}

/** .ics — kalendarga qo‘shish */
export function downloadIcs(o: { title: string; startLocal: string; location: string; slug: string }) {
  const start = new Date(`${o.startLocal}:00+05:00`);
  const end = new Date(start.getTime() + 5 * 3600_000);
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Shohnoma//UZ",
    "BEGIN:VEVENT",
    `UID:${o.slug}-${f(start)}@shohnoma.uz`,
    `DTSTAMP:${f(new Date())}`,
    `DTSTART:${f(start)}`,
    `DTEND:${f(end)}`,
    `SUMMARY:${esc(o.title)}`,
    `LOCATION:${esc(o.location)}`,
    `URL:https://shohnoma.uz/${o.slug}/`,
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(o.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  a.download = `${o.slug}.ics`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}
