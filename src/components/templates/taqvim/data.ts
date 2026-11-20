/**
 * Taqvim shabloni (korporativ — forum / ko‘p kunlik tadbir: qorong‘i yashil-ko‘kish fon, shisha plitkalar, lime urg‘u) —
 * namuna matnlar (Figma 602:23442 mobil / 604:23454 laptop, «21 · Taqvim — Assets» 601:23442).
 */
import type { ProgramItem } from "../anor/data";
import type { Locale } from "@/lib/i18n";

export const P = "/templates/taqvim";

export type Speaker = { name: string; role?: string };
/** Kalendar to‘ridagi tadbir plitkasi: kun (0 — birinchi, 1 — ikkinchi), qisqa nom, vaqt */
export type Tile = { day: number; label: string; time: string };

export type TaqvimDemo = {
  /** maxsus mehmon (namunada — Figma’dagi «Aziz Karimov») */
  guest: string;
  address: string;
  city: string;
  message: string;
  /** ikkinchi kun (Figma: 18–19 fevral) */
  dateEnd: string;
  program: ProgramItem[];
  program2: ProgramItem[];
  /** hero kalendar to‘ridagi 4 plitka (Figma’dagi qisqa nomlar) */
  tiles: Tile[];
  speakers: Speaker[];
  dressCode: string;
  dressNote: string;
};

/** Namuna — Figma’dagi matnlar (tadbir nomi, kompaniya, joy nomi, sana — shablon `sample` dan) */
export const TAQVIM_DEMO: TaqvimDemo = {
  guest: "Aziz Karimov",
  address: "Toshkent, Mirzo Ulug‘bek tumani, Buyuk Ipak Yo‘li ko‘chasi, 15",
  city: "Toshkent",
  message:
    "Nexa Hub sizni «Kelajak forumi 2027»ga taklif qiladi. Ikki kun davomida raqamli iqtisodiyot, startaplar va investitsiyalar bo‘yicha 20 dan ortiq spiker so‘zga chiqadi, amaliy master-klasslar va networking bo‘ladi.",
  dateEnd: "2027-02-19",
  program: [
    { time: "09:00", title: "Ro‘yxatdan o‘tish", note: "Foye" },
    { time: "10:00", title: "Ochilish va asosiy nutq", note: "Katta zal" },
    { time: "11:30", title: "Panel: raqamli iqtisodiyot", note: "Katta zal" },
    { time: "14:00", title: "Panel: startaplar va investitsiya", note: "Katta zal" },
    { time: "16:00", title: "Networking qahva", note: "Foye" },
  ],
  program2: [
    { time: "09:30", title: "Ertalabki qahva", note: "Foye" },
    { time: "10:00", title: "Master-klasslar", note: "Kichik zallar" },
    { time: "13:00", title: "Startaplar taqdimoti", note: "Katta zal" },
    { time: "15:30", title: "Investorlar bilan uchrashuv", note: "Katta zal" },
    { time: "18:00", title: "Networking kechasi", note: "Terrasa" },
  ],
  tiles: [
    { day: 0, label: "Ochilish", time: "10:00" },
    { day: 0, label: "Panellar", time: "14:00" },
    { day: 1, label: "Master-klass", time: "10:00" },
    { day: 1, label: "Networking", time: "18:00" },
  ],
  speakers: [
    { name: "Sardor Rahimov", role: "Nexa Hub asoschisi" },
    { name: "Dilnoza Yusupova", role: "Venchur investor" },
    { name: "Bekzod Aliyev", role: "Mahsulot direktori, fintech" },
  ],
  dressCode: "Smart casual",
  dressNote: "Qulay, lekin tartibli kiyim: jemper, ko‘ylak yoki blazer. Ikki kun davomida ko‘p yuriladi — qulay poyabzal tavsiya qilinadi.",
};

export const TAQVIM_DEMO_RU: TaqvimDemo = {
  guest: "Азиз Каримов",
  address: "г. Ташкент, Мирзо-Улугбекский район, улица Буюк Ипак Йули, 15",
  city: "Ташкент",
  message:
    "Nexa Hub приглашает вас на «Форум будущего 2027». Два дня более 20 спикеров будут говорить о цифровой экономике, стартапах и инвестициях; вас ждут практические мастер-классы и нетворкинг.",
  dateEnd: "2027-02-19",
  program: [
    { time: "09:00", title: "Регистрация", note: "Фойе" },
    { time: "10:00", title: "Открытие и главный доклад", note: "Большой зал" },
    { time: "11:30", title: "Панель: цифровая экономика", note: "Большой зал" },
    { time: "14:00", title: "Панель: стартапы и инвестиции", note: "Большой зал" },
    { time: "16:00", title: "Нетворкинг за кофе", note: "Фойе" },
  ],
  program2: [
    { time: "09:30", title: "Утренний кофе", note: "Фойе" },
    { time: "10:00", title: "Мастер-классы", note: "Малые залы" },
    { time: "13:00", title: "Презентации стартапов", note: "Большой зал" },
    { time: "15:30", title: "Встреча с инвесторами", note: "Большой зал" },
    { time: "18:00", title: "Вечерний нетворкинг", note: "Терраса" },
  ],
  tiles: [
    { day: 0, label: "Открытие", time: "10:00" },
    { day: 0, label: "Панели", time: "14:00" },
    { day: 1, label: "Мастер-класс", time: "10:00" },
    { day: 1, label: "Нетворкинг", time: "18:00" },
  ],
  speakers: [
    { name: "Сардор Рахимов", role: "Основатель Nexa Hub" },
    { name: "Дилноза Юсупова", role: "Венчурный инвестор" },
    { name: "Бекзод Алиев", role: "Директор по продукту, финтех" },
  ],
  dressCode: "Smart casual",
  dressNote: "Удобная, но аккуратная одежда: джемпер, рубашка или блейзер. Два дня много ходьбы — советуем удобную обувь.",
};

export const TAQVIM_DEMO_EN: TaqvimDemo = {
  guest: "Aziz Karimov",
  address: "15 Buyuk Ipak Yo‘li Street, Mirzo Ulugbek district, Tashkent",
  city: "Tashkent",
  message:
    "Nexa Hub invites you to the Future Forum 2027. Over two days, more than 20 speakers will talk about the digital economy, startups and investment, with hands-on master classes and networking.",
  dateEnd: "2027-02-19",
  program: [
    { time: "09:00", title: "Registration", note: "Foyer" },
    { time: "10:00", title: "Opening and keynote", note: "Main hall" },
    { time: "11:30", title: "Panel: digital economy", note: "Main hall" },
    { time: "14:00", title: "Panel: startups and investment", note: "Main hall" },
    { time: "16:00", title: "Networking coffee", note: "Foyer" },
  ],
  program2: [
    { time: "09:30", title: "Morning coffee", note: "Foyer" },
    { time: "10:00", title: "Master classes", note: "Small halls" },
    { time: "13:00", title: "Startup pitches", note: "Main hall" },
    { time: "15:30", title: "Meet the investors", note: "Main hall" },
    { time: "18:00", title: "Evening networking", note: "Terrace" },
  ],
  tiles: [
    { day: 0, label: "Opening", time: "10:00" },
    { day: 0, label: "Panels", time: "14:00" },
    { day: 1, label: "Master class", time: "10:00" },
    { day: 1, label: "Networking", time: "18:00" },
  ],
  speakers: [
    { name: "Sardor Rakhimov", role: "Founder, Nexa Hub" },
    { name: "Dilnoza Yusupova", role: "Venture investor" },
    { name: "Bekzod Aliyev", role: "Product director, fintech" },
  ],
  dressCode: "Smart casual",
  dressNote: "Comfortable but neat: a jumper, shirt or blazer. You will be on your feet for two days, so comfortable shoes are a good idea.",
};

/**
 * Tadbir turi — birinchi ekrandagi katta so‘z (Figma: «fevral / forum») va sanoq sarlavhasi («forumgacha»).
 * Kalit — buyurtma formasidagi tanlov (o‘zbekcha); har tilda o‘z shakli. Tanlanmasa — «forum».
 */
export const KIND: Record<string, Record<Locale, [string, string]>> = {
  forum: { uz: ["forum", "forumgacha"], ru: ["форум", "до форума"], en: ["forum", "until the forum"] },
  konferensiya: { uz: ["konferensiya", "konferensiyagacha"], ru: ["конференция", "до конференции"], en: ["conference", "until the conference"] },
  sammit: { uz: ["sammit", "sammitgacha"], ru: ["саммит", "до саммита"], en: ["summit", "until the summit"] },
  seminar: { uz: ["seminar", "seminargacha"], ru: ["семинар", "до семинара"], en: ["seminar", "until the seminar"] },
  "ko‘rgazma": { uz: ["ko‘rgazma", "ko‘rgazmagacha"], ru: ["выставка", "до выставки"], en: ["expo", "until the expo"] },
  tadbir: { uz: ["tadbir", "tadbirgacha"], ru: ["событие", "до события"], en: ["event", "until the event"] },
};

/**
 * Dress-kod (Figma «Taqvim / Dress-kod»: Turi=Smart casual | Business) — karta: turi (kichik harflarda, lime) va bitta izoh.
 * Mijoz `dressNote` yozsa — o‘sha matn.
 */
export const DRESS_TEXT: Record<string, string> = {
  "Smart casual": "Qulay, lekin tartibli kiyim: jemper, ko‘ylak yoki blazer.",
  Business: "Klassik kostyum yoki biznes uslubidagi kiyim.",
  "Black tie": "Kechki kostyum va kechki liboslar.",
  "Erkin uslub": "Maxsus talab yo‘q — o‘zingizga qulay kiyimda keling.",
};
