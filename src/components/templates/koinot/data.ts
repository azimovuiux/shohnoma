/** Koinot shabloni (o‘g‘il bola tug‘ilgan kuni — koinot mavzusi: raketa, sayyoralar, kosmonavt) — namuna matnlar (Figma 526:18911 mobil / 530:12622 laptop) */
import type { ProgramItem } from "../anor/data";

export const P = "/templates/koinot";

export type KoinotDemo = {
  address: string;
  program: ProgramItem[];
  dressCode: string;
  age: string;
  /** taklif qiluvchi (ota-ona) — Figma: «Hurmat bilan, Aziza va Jasur» */
  host: string;
};

/** Namuna — Figma’dagi matnlar (bola ismi, joy nomi — shablon `sample` dan) */
export const KOINOT_DEMO: KoinotDemo = {
  address: "Toshkent, Yunusobod tumani, Amir Temur ko‘chasi, 108",
  program: [
    { time: "15:00", title: "Mehmonlar kelishi", note: "Fotozona va kosmik bezaklar" },
    { time: "15:30", title: "O‘yinlar va animator", note: "Kosmonavt bilan quvnoq musobaqalar" },
    { time: "16:30", title: "Bayram dasturxoni", note: "Bolalar va kattalar uchun mazali taomlar" },
    { time: "17:00", title: "Tort va shamlar", note: "Hammamiz birga «Tug‘ilgan kuning bilan!» kuylaymiz" },
    { time: "17:30", title: "Sovg‘alar", note: "Har bir kichik mehmonga esdalik sovg‘a" },
  ],
  dressCode: "Kosmik uslub",
  age: "6",
  host: "Aziza va Jasur",
};

export const KOINOT_DEMO_RU: KoinotDemo = {
  address: "г. Ташкент, Юнусабадский район, улица Амира Темура, 108",
  program: [
    { time: "15:00", title: "Встреча гостей", note: "Фотозона и космический декор" },
    { time: "15:30", title: "Игры и аниматор", note: "Весёлые конкурсы с космонавтом" },
    { time: "16:30", title: "Праздничный стол", note: "Вкусные угощения для детей и взрослых" },
    { time: "17:00", title: "Торт и свечи", note: "Все вместе поём «С днём рождения!»" },
    { time: "17:30", title: "Подарки", note: "Памятный подарок каждому маленькому гостю" },
  ],
  dressCode: "Kosmik uslub",
  age: "6",
  host: "Aziza va Jasur",
};

export const KOINOT_DEMO_EN: KoinotDemo = {
  address: "108 Amir Temur Street, Yunusobod District, Tashkent",
  program: [
    { time: "15:00", title: "Guests arrive", note: "Photo zone and space decorations" },
    { time: "15:30", title: "Games and entertainer", note: "Fun contests with an astronaut" },
    { time: "16:30", title: "Party table", note: "Tasty food for kids and grown-ups" },
    { time: "17:00", title: "Cake and candles", note: "We all sing “Happy Birthday!” together" },
    { time: "17:30", title: "Gifts", note: "A keepsake gift for every little guest" },
  ],
  dressCode: "Kosmik uslub",
  age: "6",
  host: "Aziza va Jasur",
};

/**
 * Taklif matni (mijoz yozmagan yoki server standart matni qolgan bo‘lsa). Figma matni — ota-ona nomidan («biz», `host`).
 * `host` bo‘sh bo‘lsa — bolaning o‘zi nomidan («men»). Yosh kiritilmasa — yoshsiz variant.
 */
export const MSG_HOST_AGE = "O‘g‘limiz {name}ning {age} yoshlik tug‘ilgan kuniga bag‘ishlangan kosmik bayramga sizni va farzandlaringizni taklif qilamiz.";
export const MSG_HOST = "O‘g‘limiz {name}ning tug‘ilgan kuniga bag‘ishlangan kosmik bayramga sizni va farzandlaringizni taklif qilamiz.";
export const MSG_WE = "Tug‘ilgan kunga bag‘ishlangan kosmik bayramimizga sizni va farzandlaringizni taklif qilamiz.";
export const MSG_AGE = "{age} yoshlik tug‘ilgan kunimga bag‘ishlangan kosmik bayramga sizni va farzandlaringizni taklif qilaman!";
export const MSG = "Tug‘ilgan kunimga bag‘ishlangan kosmik bayramga sizni va farzandlaringizni taklif qilaman!";
/** Figma’dagi ikkinchi xatboshi (har doim) */
export const MSG2 = "O‘yinlar, sovg‘alar va shirin tort — barchasi siz bilan yanada quvnoq bo‘ladi!";

/**
 * Dress-kod (Figma «Koinot / Dress-kod»: Turi=Kosmik uslub | Erkin va qulay) — karta: «Kiyinish uslubi», turi va bitta izoh.
 * Mijoz `dressNote` yozsa — o‘sha matn.
 */
export const DRESS_TEXT: Record<string, string> = {
  "Kosmik uslub": "Kosmonavt kostyumi, yulduzli futbolka yoki ko‘k-to‘q sariq ranglar — ixtiyoriy.",
  "Erkin va qulay": "Bolalar o‘ynab yugurishi uchun yengil, qulay kiyim tavsiya qilamiz.",
  Bayramona: "Bayramona, yorqin kiyim — kechamizga ko‘tarinki kayfiyat olib keling.",
  Ixtiyoriy: "Maxsus talab yo‘q — o‘zingizga qulay, bayramona kiyimda keling.",
};

/** O‘zbekcha jo‘nalish kelishigi: Samir → Samirga, Oybek → Oybekka; q → -qa, g‘ → -qqa (Tog‘ → Toqqa), k/g → -ka */
export function dativeUz(name: string) {
  const n = name.trim();
  if (!n) return "";
  const last = n.slice(-1).toLowerCase();
  // kirill yozuvidagi ism (o‘zbek kirill): -га / -ка / -қа
  if (/[Ѐ-ӿ]/.test(n)) return `${n}${last === "к" || last === "г" ? "ка" : last === "қ" || last === "ғ" ? "қа" : "га"}`;
  if (/g[‘'ʻ`’]$/i.test(n)) return `${n.slice(0, -2)}qqa`;
  if (last === "q") return `${n}qa`;
  if (last === "k" || last === "g") return `${n}ka`;
  return `${n}ga`;
}
