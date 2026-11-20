/** Bilet shabloni (korporativ tadbir — chipta uslubi: elektr ko‘k, to‘q navy, oq) — namuna matnlar (Figma 578:22587 mobil / 579:22907 laptop) */
import type { ProgramItem } from "../anor/data";

export const P = "/templates/bilet";

export type Speaker = { name: string; role?: string };

export type BiletDemo = {
  /** maxsus mehmon (namunada — Figma’dagi «Aziz Karimov») */
  guest: string;
  address: string;
  /** chipta qoldig‘idagi qisqa joy («Toshkent, Hyatt Regency») va finaldagi shahar */
  place: string;
  city: string;
  message: string;
  program: ProgramItem[];
  speakers: Speaker[];
  dressCode: string;
};

/** Namuna — Figma’dagi matnlar (tadbir nomi, kompaniya, joy nomi, sana — shablon `sample` dan) */
export const BILET_DEMO: BiletDemo = {
  guest: "Aziz Karimov",
  address: "Toshkent, Navoiy ko‘chasi, 1A",
  place: "Toshkent, Hyatt Regency",
  city: "Toshkent",
  message:
    "Nova Group jamoasi sizni yillik hamkorlar kechasiga taklif qiladi. Bir yil davomida birga erishgan natijalarimizni sarhisob qilamiz, eng faol hamkorlarni taqdirlaymiz va 2027-yil rejalarini tanishtiramiz.",
  program: [
    { time: "18:30", title: "Ro‘yxatdan o‘tish", note: "Foye" },
    { time: "19:00", title: "Ochilish so‘zi", note: "Asosiy zal" },
    { time: "19:30", title: "2026-yil natijalari", note: "Asosiy zal" },
    { time: "20:30", title: "Hamkorlarni taqdirlash", note: "Asosiy zal" },
    { time: "21:00", title: "Kechki ziyofat va musiqa", note: "Terrasa" },
  ],
  speakers: [
    { name: "Rustam Aliyev", role: "Nova Group bosh direktori" },
    { name: "Nigora Karimova", role: "Moliya direktori" },
    { name: "Jasur Tursunov", role: "Innovatsiyalar rahbari" },
  ],
  dressCode: "Business casual",
};

export const BILET_DEMO_RU: BiletDemo = {
  guest: "Азиз Каримов",
  address: "г. Ташкент, улица Навои, 1A",
  place: "Ташкент, Hyatt Regency",
  city: "Ташкент",
  message:
    "Команда Nova Group приглашает вас на ежегодный вечер партнёров. Мы подведём итоги года, который прошли вместе, наградим самых активных партнёров и расскажем о планах на 2027 год.",
  program: [
    { time: "18:30", title: "Регистрация", note: "Фойе" },
    { time: "19:00", title: "Вступительное слово", note: "Главный зал" },
    { time: "19:30", title: "Итоги 2026 года", note: "Главный зал" },
    { time: "20:30", title: "Награждение партнёров", note: "Главный зал" },
    { time: "21:00", title: "Ужин и музыка", note: "Терраса" },
  ],
  speakers: [
    { name: "Рустам Алиев", role: "Генеральный директор Nova Group" },
    { name: "Нигора Каримова", role: "Финансовый директор" },
    { name: "Жасур Турсунов", role: "Руководитель по инновациям" },
  ],
  dressCode: "Business casual",
};

export const BILET_DEMO_EN: BiletDemo = {
  guest: "Aziz Karimov",
  address: "1A Navoi Street, Tashkent",
  place: "Tashkent, Hyatt Regency",
  city: "Tashkent",
  message:
    "The Nova Group team invites you to our annual partners’ evening. Together we will look back on the results of the year, award our most active partners and present our plans for 2027.",
  program: [
    { time: "18:30", title: "Registration", note: "Foyer" },
    { time: "19:00", title: "Opening remarks", note: "Main hall" },
    { time: "19:30", title: "2026 results", note: "Main hall" },
    { time: "20:30", title: "Partner awards", note: "Main hall" },
    { time: "21:00", title: "Dinner and music", note: "Terrace" },
  ],
  speakers: [
    { name: "Rustam Aliyev", role: "CEO, Nova Group" },
    { name: "Nigora Karimova", role: "Chief Financial Officer" },
    { name: "Jasur Tursunov", role: "Head of Innovation" },
  ],
  dressCode: "Business casual",
};

/**
 * Taklif matni (mijoz yozmagan yoki server standart matni qolgan bo‘lsa): kompaniya nomidan, tadbir nomi qo‘shtirnoqda —
 * o‘zbekchada qo‘shimcha ismga qo‘shilmaydi («… «Yillik hamkorlar kechasi» tadbiriga»), ruschada nom bosh kelishikda qoladi.
 */
export const MSG_ORG = "{org} jamoasi sizni «{event}» tadbiriga taklif qiladi. Sizni ko‘rishdan mamnun bo‘lamiz.";
export const MSG_NO_ORG = "Sizni «{event}» tadbiriga taklif qilamiz. Sizni ko‘rishdan mamnun bo‘lamiz.";
export const MSG_PLAIN = "Sizni tadbirimizga taklif qilamiz. Sizni ko‘rishdan mamnun bo‘lamiz.";
/** Imzo: «Hurmat bilan, / {org} jamoasi» */
export const SIGN_ORG = "{org} jamoasi";

/**
 * Dress-kod (Figma «Bilet / Dress-kod»: Turi=Business casual | Black tie) — karta: turi (katta) va bitta izoh.
 * Mijoz `dressNote` yozsa — o‘sha matn.
 */
export const DRESS_TEXT: Record<string, string> = {
  "Business casual": "Klassik kostyum yoki business casual. Ko‘k rangli aksent bo‘lsa — ayni muddao.",
  "Black tie": "Kechki kostyum va kechki liboslar.",
  "Smart casual": "Shinam, ammo tartibli kiyim: pidjak, ko‘ylak yoki nafis libos.",
  "Erkin uslub": "Maxsus talab yo‘q — o‘zingizga qulay kiyimda keling.",
};

/**
 * «Sanani saqlang» — chipta sarlavhasi: ikki qator, `*a*` — kursiv gradientli harf (Figma: «S*a*NANI / SAQL*a*NG»).
 * Tarjima lug‘atida emas — har til uchun alohida belgilangan.
 */
export const SAVE_DATE: Record<"uz" | "ru" | "en", [string, string]> = {
  uz: ["S*a*NANI", "SAQL*a*NG"],
  ru: ["СОХР*а*НИТЕ", "Д*а*ТУ"],
  en: ["S*a*VE THE", "D*a*TE"],
};
