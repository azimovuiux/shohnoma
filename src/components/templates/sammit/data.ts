/**
 * Sammit shabloni (korporativ — moliya / investitsiya sammiti: qoradan to‘q qizilga gradient, to‘r chiziqlar va uchqunlar,
 * xira shisha kataklar, xrom tangalar va qizil shisha shakl) — namuna matnlar.
 * Figma: «22 · Kumush — Moliya sammiti» (mobil 608:23513, laptop 611:23560, Assets 607:23513). Saytda «Kumush» nomli shablon
 * allaqachon bor — shu sabab bu shablon «Sammit» (slug `sammit`) deb nomlangan.
 */
import type { ProgramItem } from "../anor/data";

export const P = "/templates/sammit";

export type Speaker = { name: string; role?: string };

export type SammitDemo = {
  /** maxsus mehmon (namunada — Figma’dagi «Aziz Karimov») */
  guest: string;
  address: string;
  city: string;
  message: string;
  program: ProgramItem[];
  /** hero’dagi uchta shisha katak (qisqa faktlar) */
  facts: string[];
  speakers: Speaker[];
  dressCode: string;
  dressNote: string;
};

/** Namuna — Figma’dagi matnlar (tadbir nomi, kompaniya, joy nomi, sana — shablon `sample` dan) */
export const SAMMIT_DEMO: SammitDemo = {
  guest: "Aziz Karimov",
  address: "Toshkent, Islom Karimov ko‘chasi, 2",
  city: "Toshkent",
  message:
    "Orbis Capital sizni «Moliya va investitsiya sammiti 2027»ga taklif qiladi. Bir kunda 20 dan ortiq spiker, investorlar bilan yopiq uchrashuvlar va yil bozor sharhi.",
  program: [
    { time: "09:00", title: "Ro‘yxatdan o‘tish", note: "Foye" },
    { time: "10:00", title: "Ochilish nutqi", note: "Katta zal" },
    { time: "11:00", title: "2027 bozor sharhi", note: "Katta zal" },
    { time: "13:30", title: "Investorlar bilan uchrashuv", note: "Yopiq zal" },
    { time: "16:00", title: "Panel: fintech va bank", note: "Katta zal" },
    { time: "19:00", title: "Gala-kechki ziyofat", note: "Terrasa" },
  ],
  facts: ["Investorlar bilan uchrashuv.", "20+ spiker.", "Yopiq networking."],
  speakers: [
    { name: "Timur Ahmedov", role: "Orbis Capital boshqaruvchi hamkori" },
    { name: "Laylo Saidova", role: "Bank kengashi a’zosi" },
    { name: "Rustam Qodirov", role: "Fintech asoschisi" },
  ],
  dressCode: "Black tie",
  dressNote: "Kechki kostyum, kechki libos. Kumush yoki qizil aksent — ayni muddao.",
};

export const SAMMIT_DEMO_RU: SammitDemo = {
  guest: "Азиз Каримов",
  address: "г. Ташкент, улица Ислама Каримова, 2",
  city: "Ташкент",
  message:
    "Orbis Capital приглашает вас на «Финансовый и инвестиционный саммит 2027». За один день — более 20 спикеров, закрытые встречи с инвесторами и обзор рынка за год.",
  program: [
    { time: "09:00", title: "Регистрация", note: "Фойе" },
    { time: "10:00", title: "Вступительное слово", note: "Большой зал" },
    { time: "11:00", title: "Обзор рынка 2027", note: "Большой зал" },
    { time: "13:30", title: "Встреча с инвесторами", note: "Закрытый зал" },
    { time: "16:00", title: "Панель: финтех и банки", note: "Большой зал" },
    { time: "19:00", title: "Гала-ужин", note: "Терраса" },
  ],
  facts: ["Встреча с инвесторами.", "20+ спикеров.", "Закрытый нетворкинг."],
  speakers: [
    { name: "Тимур Ахмедов", role: "Управляющий партнёр Orbis Capital" },
    { name: "Лайло Саидова", role: "Член правления банка" },
    { name: "Рустам Кадыров", role: "Основатель финтех-компании" },
  ],
  dressCode: "Black tie",
  dressNote: "Вечерний костюм, вечернее платье. Серебряный или красный акцент — то, что нужно.",
};

export const SAMMIT_DEMO_EN: SammitDemo = {
  guest: "Aziz Karimov",
  address: "2 Islam Karimov Street, Tashkent",
  city: "Tashkent",
  message:
    "Orbis Capital invites you to the Finance and Investment Summit 2027. One day, more than 20 speakers, closed-door meetings with investors and a review of the year’s market.",
  program: [
    { time: "09:00", title: "Registration", note: "Foyer" },
    { time: "10:00", title: "Opening remarks", note: "Main hall" },
    { time: "11:00", title: "2027 market review", note: "Main hall" },
    { time: "13:30", title: "Meet the investors", note: "Private hall" },
    { time: "16:00", title: "Panel: fintech and banking", note: "Main hall" },
    { time: "19:00", title: "Gala dinner", note: "Terrace" },
  ],
  facts: ["Meet the investors.", "20+ speakers.", "Private networking."],
  speakers: [
    { name: "Timur Akhmedov", role: "Managing partner, Orbis Capital" },
    { name: "Laylo Saidova", role: "Member of a bank board" },
    { name: "Rustam Kadirov", role: "Fintech founder" },
  ],
  dressCode: "Black tie",
  dressNote: "Evening suit or evening dress. A silver or red accent is just right.",
};

/**
 * Dress-kod (Figma «Kumush / Dress-kod»: Turi=Black tie | Business) — shisha karta: turi (Playfair kursiv) va bitta izoh.
 * Mijoz `dressNote` yozsa — o‘sha matn.
 */
export const DRESS_TEXT: Record<string, string> = {
  "Black tie": "Kechki kostyum, kechki libos. Kumush yoki qizil aksent — ayni muddao.",
  Business: "Klassik biznes kostyum.",
  "Smart casual": "Qulay, lekin tartibli kiyim: jemper, ko‘ylak yoki blazer.",
  "Erkin uslub": "Maxsus talab yo‘q — o‘zingizga qulay kiyimda keling.",
};
