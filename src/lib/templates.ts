import { tplImgVersions } from "./tplImgVersions.ts";
import { categoryName, getCategory } from "./categories.ts";
import type { Locale } from "./i18n";
/** Shablonlar ro‘yxati — spec §10.1 (narxlar namuna, [Ochiq]) */

export type Ceremony = "nikoh" | "fotiha" | "sunnat" | "tugilgan-kun";
export type Style = "klassik" | "minimal" | "romantik" | "zamonaviy" | "milliy";

export const ceremonyLabel: Record<Ceremony, string> = {
  nikoh: "Nikoh to‘yi",
  fotiha: "Fotiha to‘yi",
  sunnat: "Sunnat to‘yi",
  "tugilgan-kun": "Tug‘ilgan kun",
};

export const styleLabel: Record<Style, string> = {
  klassik: "Klassik",
  minimal: "Minimal",
  romantik: "Romantik",
  zamonaviy: "Zamonaviy",
  milliy: "Milliy",
};

/** Mokap uchun shablon ko‘rinishi (HTML/CSS bilan chiziladi) */
export interface TemplateTheme {
  /** ekran foni (gradient) */
  bg: [string, string];
  /** asosiy matn rangi */
  ink: string;
  /** urg‘u (oltin / aksent) */
  accent: string;
  /** ikkilamchi matn */
  soft: string;
  /** sarlavha shrifti */
  script: "pinyon" | "cinzel" | "cormorant";
  /** rang nomi (filtr uchun) */
  color: "bordo" | "yashil" | "oltin" | "krem" | "moviy" | "qizil" | "pushti";
}

export type FieldType = "text" | "textarea" | "time" | "date" | "number" | "select";
export interface FieldSpec {
  type: FieldType;
  label: string;
  required?: boolean;
  max?: number;
  placeholder?: string;
  options?: string[];
  hint?: string;
}
export type TemplateField =
  | ({ key: string } & FieldSpec)
  | { key: string; type: "list"; label: string; min: number; max: number; item: Record<string, FieldSpec> };

export interface Template {
  number: number;
  slug: string;
  name: string;
  /** Asosiy marosim (birinchisi) — eski ma'lumotlar bilan moslik uchun */
  ceremony: Ceremony;
  /** Shablon kategoriyalari (katalog filtrlari, admin boshqaradi; bir nechta). Bo‘lmasa — faqat `ceremony` */
  ceremonies?: string[];
  style: Style;
  priceOld: number;
  price: number;
  featured: boolean;
  description: string;
  palette: string[];
  sample: { a: string; b?: string; date: string; venue: string; time: string };
  theme: TemplateTheme;
  /** Dizayn asosi — qaysi tayyor dizayn (hero varianti, bezaklar, musiqa) ishlatiladi. Bo‘sh bo‘lsa — slug */
  base?: string;
  /** Mokap rasmlari (Figma eksport yoki admin yuklagan) */
  images?: {
    phone?: string;
    laptop?: string;
    phoneScroll?: string;
    laptopScroll?: string;
    /** Ruscha sahifalar uchun mokap rasmlari (bo‘lmasa — o‘zbekchasi) */
    phoneRu?: string;
    laptopRu?: string;
    phoneScrollRu?: string;
    laptopScrollRu?: string;
    phoneEn?: string;
    laptopEn?: string;
    phoneScrollEn?: string;
    laptopScrollEn?: string;
  };
  /** Katalogda ko‘rinadimi (admin) */
  active?: boolean;
  /** Mijoz ma’lumotlari bilan to‘ldirilgan nusxa — mokapda rasm emas, jonli chizma */
  isLive?: boolean;
  /** "html" — admin ZIP orqali yuklagan shablon (docs/SHABLON-YORIQNOMA.md) */
  kind?: "html";
  version?: number;
  /** HTML shablonning qo‘shimcha maydonlari (buyurtma formasi shulardan quriladi) */
  fields?: TemplateField[];
  /** HTML shablon: jonli ko‘rinish manzili (buyurtma oqimida — mijoz ma’lumotlari bilan) */
  previewUrl?: string;
  /** Ruscha tavsif (/ru/ sahifalarida) */
  descriptionRu?: string;
  /** Inglizcha tavsif (/en/ sahifalarida) */
  descriptionEn?: string;
  /** Standart fon musiqasi — kutubxonadagi trek ID si (admin tanlaydi) */
  musicId?: string | null;
  /** Server: shablonda musiqa tanlanmagan bo‘lsa — kutubxonadagi birinchi trek */
  musicFallback?: string | null;
}

const builtin: Template[] = [
  {
    number: 1,
    slug: "anor",
    name: "Anor",
    ceremony: "nikoh",
    ceremonies: ["nikoh", "fotiha"],
    style: "milliy",
    priceOld: 249000,
    price: 199000,
    featured: true,
    description: "Bordo baxmal, muhrlangan maktub va anor bezaklari. Muhr ochilgach — ravoqli muqova, otkritka-manzil, polaroid hikoya va chipta-javob.",
    descriptionRu: "Бордовый бархат, запечатанное письмо и гранатовые узоры. После вскрытия печати — арочная обложка, открытка с адресом, история в полароидах и билет-ответ.",
    descriptionEn: "Burgundy velvet, a sealed letter and pomegranate ornaments. Once the seal is broken — an arched cover, a card with the address, a story in polaroids and a reply ticket.",
    palette: ["#7A1E2C", "#4A0F1A", "#C9A25E", "#F3ECE0"],
    sample: { a: "Azizbek", b: "Sevara", date: "12 · 09 · 2026", venue: "«Navro‘z» saroyi", time: "17:00" },
    theme: { bg: ["#7a1e2c", "#4a0f1a"], ink: "#f3ece0", accent: "#c9a25e", soft: "#e8d3a8", script: "cormorant", color: "bordo" },
    fields: [
      { key: "hosts", type: "text", label: "Mezbonlar", placeholder: "Karimovlar va Rahimovlar oilasi", max: 120, hint: "Taklif matni ostida «Hurmat bilan» deb chiqadi" },
      {
        key: "program",
        type: "list",
        label: "To‘y dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Kutib olish", max: 60 },
          note: { type: "text", label: "Izoh", placeholder: "Sharbat va jonli musiqa", max: 80 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Klassik", "Kechki rasmiy", "Milliy", "Ixtiyoriy"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Erkaklar — kostyum-shim, ayollar — marosim ko‘ylagi", max: 160 },
      { key: "storyText", type: "textarea", label: "Bizning hikoyamiz", placeholder: "Universitet kutubxonasida boshlangan hikoya — endi bir umrlik.", max: 400, hint: "Ixtiyoriy" },
      {
        key: "story",
        type: "list",
        label: "Hikoya lahzalari",
        min: 0,
        max: 3,
        item: {
          year: { type: "text", label: "Yil", placeholder: "2021", max: 12 },
          caption: { type: "text", label: "Lahza", required: true, placeholder: "Tanishuv", max: 40 },
        },
      },
    ],
  },
  {
    number: 2,
    slug: "zumrad",
    name: "Zumrad",
    ceremony: "nikoh",
    ceremonies: ["nikoh", "fotiha"],
    style: "milliy",
    priceOld: 249000,
    price: 199000,
    featured: true,
    description: "Zumrad yashil damask, oltin muhrli konvert va bog‘ manzarasi. Konvert ochilgach — madrasa ravog‘i, parda ortidagi bog‘, ravoqli suratlar va konvert-javob.",
    descriptionRu: "Изумрудный дамаск, конверт с золотой печатью и садовый пейзаж. После открытия конверта — арка медресе, сад за занавесом, фото в арках и конверт-ответ.",
    descriptionEn: "Emerald damask, an envelope with a golden seal and a garden scene. Once the envelope opens — a madrasa arch, a garden behind the curtain, photos in arches and a reply envelope.",
    palette: ["#123C2E", "#0C2A20", "#C6A15B", "#F7F3EA"],
    sample: { a: "Azizbek", b: "Sevara", date: "12 · 09 · 2026", venue: "«Navro‘z» saroyi", time: "17:00" },
    theme: { bg: ["#123c2e", "#0c2a20"], ink: "#f7f3ea", accent: "#c6a15b", soft: "#e2c88e", script: "cormorant", color: "yashil" },
    fields: [
      { key: "hosts", type: "text", label: "Mezbonlar", placeholder: "Karimovlar va Rahimovlar oilasi", max: 120, hint: "Taklif matni ostida «Hurmat bilan» deb chiqadi" },
      {
        key: "program",
        type: "list",
        label: "To‘y dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Kutib olish", max: 60 },
          note: { type: "text", label: "Izoh", placeholder: "Sharbat va jonli musiqa", max: 80 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Klassik", "Kechki rasmiy", "Milliy", "Ixtiyoriy"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Erkaklar — kostyum-shim, ayollar — marosim ko‘ylagi", max: 160 },
      { key: "storyText", type: "textarea", label: "Bizning hikoyamiz", placeholder: "Universitet kutubxonasida boshlangan hikoya — endi bir umrlik.", max: 400, hint: "Ixtiyoriy" },
      { key: "caption", type: "text", label: "Polaroid yozuvi", placeholder: "Bir umrga", max: 24 },
    ],
  },
  {
    number: 3,
    slug: "parvoz",
    name: "Parvoz",
    ceremony: "nikoh",
    ceremonies: ["nikoh", "fotiha"],
    style: "zamonaviy",
    priceOld: 249000,
    price: 199000,
    featured: true,
    description: "Osmon va bulutlar orasidan ochiladigan taklifnoma. Samolyot bulutlar ortiga uchib ketgach — chipta ko‘rinishidagi taklif, illyuminator ortidagi taklif matni, to‘yga qadar sanoq, to‘y dasturi va mehmonlar javobi.",
    descriptionRu: "Приглашение, которое открывается среди неба и облаков. Когда самолёт скрывается за облаками — приглашение в виде билета, текст в иллюминаторе, отсчёт до торжества, программа и ответы гостей.",
    descriptionEn: "An invitation that opens among the sky and clouds. When the plane disappears into the clouds — an invitation in the form of a ticket, text in a porthole, a countdown, the programme and guest replies.",
    palette: ["#1C2B45", "#A8BCD6", "#EFA97E", "#F6F1E8"],
    sample: { a: "Jasur", b: "Madina", date: "12 · 09 · 2026", venue: "Sky Terrace", time: "17:30" },
    theme: { bg: ["#1c2b45", "#17233a"], ink: "#f4e9d8", accent: "#efa97e", soft: "#a8bcd6", script: "cormorant", color: "moviy" },
    fields: [
      {
        key: "program",
        type: "list",
        label: "To‘y dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Kutib olish", max: 60 },
          note: { type: "text", label: "Izoh", placeholder: "Welcome-drink va jonli musiqa", max: 80 },
        },
      },
      { key: "venueNote", type: "text", label: "Manzil izohi", placeholder: "Mehmonlar uchun bepul avtoturargoh mavjud", max: 80, hint: "Ixtiyoriy" },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Klassik", "Kechki rasmiy", "Milliy", "Ixtiyoriy"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Erkaklar — kostyum-shim, ayollar — marosim ko‘ylagi", max: 160 },
      { key: "story1", type: "text", label: "1-surat yozuvi", placeholder: "Uchrashuv · 2021", max: 28 },
      { key: "story2", type: "text", label: "2-surat yozuvi", placeholder: "Unashtiruv · 2025", max: 28 },
      { key: "quote", type: "textarea", label: "Iqtibos", placeholder: "Yo‘l qanchalik uzoq bo‘lmasin, eng go‘zal manzil — bir-birimiz.", max: 160, hint: "Ixtiyoriy" },
    ],
  },
  {
    number: 4,
    slug: "shato",
    name: "Shato",
    ceremony: "nikoh",
    ceremonies: ["nikoh", "fotiha"],
    style: "romantik",
    priceOld: 249000,
    price: 199000,
    featured: true,
    description: "Akvarel bog‘ va oltin darvoza. Darvoza ochilgach — ark ichidagi surat va taklif matni, kalendar va sanoq, qasr ko‘rinishidagi manzil, to‘y dasturi va mehmonlar javobi.",
    descriptionRu: "Акварельный сад и золотые ворота. Когда ворота открываются — фото в арке и текст приглашения, календарь и отсчёт, адрес на фоне замка, программа и ответы гостей.",
    descriptionEn: "A watercolour garden and golden gates. Once the gates open — a photo in an arch with the invitation text, a calendar and countdown, the venue with a château view, the programme and guest replies.",
    palette: ["#7A7D5C", "#DCE7F0", "#B08D57", "#FBF4EC"],
    sample: { a: "Jasur", b: "Madina", date: "12 · 09 · 2026", venue: "Chateau Blanc", time: "16:00" },
    theme: { bg: ["#7a7d5c", "#5f6247"], ink: "#fbf4ec", accent: "#b08d57", soft: "#dce7f0", script: "cormorant", color: "krem" },
    fields: [
      {
        key: "program",
        type: "list",
        label: "To‘y dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Mehmonlar yig‘ilishi", max: 60 },
          note: { type: "text", label: "Izoh", placeholder: "Qadrdonlarimiz bilan uchrashamiz", max: 80 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Klassik", "Kechki rasmiy", "Milliy", "Ixtiyoriy"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Erkaklar — kostyum-shim, ayollar — marosim ko‘ylagi", max: 160 },
      { key: "gifts", type: "textarea", label: "Sovg‘alar haqida", placeholder: "Yoningizda bo‘lishingiz — biz uchun eng katta sovg‘a.", max: 200, hint: "Ixtiyoriy" },
      { key: "flowers", type: "textarea", label: "Gullar haqida", placeholder: "Guldasta o‘rniga iliq tilaklaringizni olib keling.", max: 200, hint: "Ixtiyoriy" },
      { key: "contact", type: "textarea", label: "Aloqa", placeholder: "Savollar bo‘yicha tashkilotchimiz Malikaga murojaat qiling.", max: 200, hint: "Ixtiyoriy" },
      { key: "phone", type: "text", label: "Telefon raqami", placeholder: "+998 90 123 45 67", max: 24, hint: "«Qo‘ng‘iroq» tugmasi uchun" },
      { key: "telegram", type: "text", label: "Telegram", placeholder: "@username", max: 40, hint: "«Telegram» tugmasi uchun" },
      { key: "quote", type: "textarea", label: "Iqtibos", placeholder: "Sevgi — bu bir-biriga emas, balki birga bir tomonga qarash.", max: 160, hint: "Ixtiyoriy" },
    ],
  },
  {
    number: 5,
    slug: "savsan",
    name: "Savsan",
    ceremony: "nikoh",
    ceremonies: ["nikoh", "fotiha"],
    style: "romantik",
    priceOld: 249000,
    price: 199000,
    featured: true,
    description: "Yashil qog‘oz fonda konvert va oq liliyalar. Muhr ochilgach — kolaj ko‘rinishidagi taklif, kalendar va kumush ramkalardagi suratlar, to‘yga qadar sanoq, kun tartibi, manzil va mehmonlar javobi.",
    descriptionRu: "Конверт и белые лилии на зелёной бумаге. Когда печать вскрыта — приглашение в виде коллажа, календарь и фото в серебряных рамках, отсчёт до торжества, программа дня, адрес и ответы гостей.",
    descriptionEn: "An envelope and white lilies on green paper. Once the seal is broken — a collage-style invitation, a calendar and photos in silver frames, a countdown, the day’s schedule, the venue and guest replies.",
    palette: ["#5E7352", "#9BAF8A", "#A8884A", "#F6F2E8"],
    sample: { a: "Jasur", b: "Madina", date: "12 · 09 · 2026", venue: "Gulzor Garden", time: "16:00" },
    theme: { bg: ["#5e7352", "#4e6044"], ink: "#f6f2e8", accent: "#a8884a", soft: "#9baf8a", script: "cormorant", color: "yashil" },
    fields: [
      {
        key: "program",
        type: "list",
        label: "To‘y dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Mehmonlarni kutib olish", max: 60 },
          note: { type: "text", label: "Izoh", placeholder: "Iliq so‘zlar va birinchi suratlar", max: 80 },
        },
      },
      { key: "hall", type: "text", label: "Zal nomi", placeholder: "Bog‘ zali", max: 30, hint: "Ixtiyoriy" },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Klassik", "Kechki rasmiy", "Milliy", "Ixtiyoriy"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Erkaklar — kostyum-shim, ayollar — marosim ko‘ylagi", max: 160 },
      { key: "quote", type: "textarea", label: "Iqtibos", placeholder: "Ikki qalb uchrashganda vaqt she’rga aylanadi, hayot esa abadiy va’daga.", max: 160, hint: "Ixtiyoriy" },
      { key: "caption", type: "text", label: "Yorliq yozuvi", placeholder: "Sevgi — bir umrlik chiroyli sayohat", max: 48, hint: "Ixtiyoriy · «Lahzalar» bo‘limidagi yorliqda" },
    ],
  },
  {
    number: 6,
    slug: "muhr",
    name: "Muhr",
    ceremony: "nikoh",
    ceremonies: ["nikoh", "fotiha"],
    style: "klassik",
    priceOld: 249000,
    price: 199000,
    featured: true,
    description: "Bordo charm konvert va sur‘gich muhr. Sahifani pastga surganingizda muhr yoriladi va konvertning to‘rt qanoti birin-ketin ochiladi — ichidan taklif kartasi chiqadi. Keyin sanoq, kun tartibi, suratlar, manzil, dress-kod va mehmonlar javobi; oxirida konvert yana yopiladi.",
    descriptionRu: "Бордовый кожаный конверт и сургучная печать. Когда вы листаете страницу вниз, печать трескается, и четыре клапана конверта раскрываются один за другим — внутри приглашение. Дальше отсчёт, программа дня, фото, адрес, дресс-код и ответы гостей; в конце конверт снова закрывается.",
    descriptionEn: "A burgundy leather envelope with a wax seal. As you scroll down, the seal cracks and the envelope’s four flaps open one by one to reveal the invitation card. Then a countdown, the day’s schedule, photos, the venue, the dress code and guest replies; at the end the envelope closes again.",
    palette: ["#5E1A27", "#6E1F2E", "#C9A06B", "#F7F1E8"],
    sample: { a: "Jasur", b: "Madina", date: "12 · 09 · 2026", venue: "Grand Palace Hall", time: "17:00" },
    theme: { bg: ["#5e1a27", "#3a0d16"], ink: "#f7f1e8", accent: "#c9a06b", soft: "#e8d9c4", script: "cormorant", color: "bordo" },
    fields: [
      {
        key: "program",
        type: "list",
        label: "To‘y dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Mehmonlarni kutib olish", max: 60 },
          note: { type: "text", label: "Izoh", placeholder: "Welcome-drink va jonli musiqa", max: 80 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Klassik", "Kechki rasmiy", "Milliy", "Ixtiyoriy"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Erkaklar — smoking, ayollar — uzun kechki libos", max: 160 },
      { key: "quote", type: "textarea", label: "Iqtibos", placeholder: "Seni topganim — taqdirning eng chiroyli muhri.", max: 120, hint: "Ixtiyoriy · surat ostida" },
      { key: "caption", type: "text", label: "Yakuniy so‘z", placeholder: "Muhabbat — bir umrga bosilgan muhr.", max: 80, hint: "Ixtiyoriy · «Lahzalar» bo‘limida" },
    ],
  },
  {
    number: 7,
    slug: "kalit",
    name: "Kalit",
    ceremony: "nikoh",
    ceremonies: ["nikoh", "fotiha"],
    style: "klassik",
    priceOld: 249000,
    price: 199000,
    featured: true,
    description: "Qorong‘i xonada kalit teshigidan tushgan nur. Sahifani pastga surganingizda teshik kattalashadi va siz ichkariga — juftlik suratiga kirasiz. Keyin taklif matni, sana va sanoq, kuyov-kelin suratlari, kun tartibi, manzil, dress-kod va mehmonlar javobi; oxirida teshik yana yopiladi.",
    descriptionRu: "Свет из замочной скважины в тёмной комнате. Когда вы листаете страницу вниз, скважина расширяется, и вы попадаете внутрь — к фото пары. Дальше текст приглашения, дата и отсчёт, фото жениха и невесты, программа дня, адрес, дресс-код и ответы гостей; в конце скважина снова закрывается.",
    descriptionEn: "Light falling through a keyhole in a dark room. As you scroll down, the keyhole widens and you step inside — into the couple’s photo. Then the invitation text, the date and a countdown, photos of the bride and groom, the day’s schedule, the venue, the dress code and guest replies; at the end the keyhole closes again.",
    palette: ["#120C08", "#1C140F", "#C8A46A", "#EFE4D2"],
    sample: { a: "Jasur", b: "Madina", date: "12 · 09 · 2026", venue: "Grand Library", time: "17:00" },
    theme: { bg: ["#1c140f", "#120c08"], ink: "#efe4d2", accent: "#c8a46a", soft: "#9c8b78", script: "cormorant", color: "oltin" },
    fields: [
      {
        key: "program",
        type: "list",
        label: "To‘y dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Mehmonlarni kutib olish", max: 40 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Klassik", "Kechki rasmiy", "Milliy", "Ixtiyoriy"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Erkaklar — kostyum-shim (galstuk ixtiyoriy), ayollar — marosim ko‘ylagi yoki nafis libos.", max: 160 },
      { key: "quote", type: "textarea", label: "Iqtibos", placeholder: "Seni birinchi ko‘rganimda vaqt to‘xtadi. Endi esa butun umrim — shu lahza.", max: 120, hint: "Ixtiyoriy · «Lahza» bo‘limida, qo‘llar surati ostida" },
    ],
  },
  {
    number: 8,
    slug: "sayohat",
    name: "Sayohat",
    ceremony: "nikoh",
    ceremonies: ["nikoh", "fotiha"],
    style: "zamonaviy",
    priceOld: 249000,
    price: 199000,
    featured: true,
    description: "Kelin-kuyov skuterda shahar bo‘ylab yo‘lga chiqadi. Sahifani pastga surganingizda shahar yon tomonga suriladi: haykal, teleminora, masjid va to‘yxona oldidan o‘tasiz. Har bekatda bitta karta — taklif matni, sana va sanoq, kun tartibi, dress-kod, manzil va mehmonlar javobi.",
    descriptionRu: "Жених и невеста едут на скутере по городу. Когда вы листаете страницу вниз, город движется в сторону: вы проезжаете памятник, телебашню, мечеть и ресторан. На каждой остановке — одна карточка: текст приглашения, дата и отсчёт, программа дня, дресс-код, адрес и ответы гостей.",
    descriptionEn: "The bride and groom ride a scooter through the city. As you scroll down, the city slides sideways: you pass a monument, the TV tower, a mosque and the wedding hall. Each stop has one card — the invitation text, the date and a countdown, the day’s schedule, the dress code, the venue and guest replies.",
    palette: ["#C7DBF0", "#22324D", "#C46A4E", "#FFFBF4"],
    sample: { a: "Jasur", b: "Madina", date: "12 · 09 · 2026", venue: "«Bahor» to‘yxonasi", time: "17:00" },
    theme: { bg: ["#c7dbf0", "#9fbfe2"], ink: "#22324d", accent: "#c46a4e", soft: "#5d6b80", script: "cormorant", color: "moviy" },
    fields: [
      {
        key: "program",
        type: "list",
        label: "To‘y dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Mehmonlarni kutib olish", max: 40 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Klassik", "Kechki rasmiy", "Milliy", "Ixtiyoriy"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Erkaklar — kostyum-shim (galstuk ixtiyoriy), ayollar — marosim ko‘ylagi yoki nafis libos.", max: 160 },
    ],
  },
  {
    number: 9,
    slug: "lino",
    name: "Lino",
    ceremony: "nikoh",
    ceremonies: ["nikoh", "fotiha"],
    style: "minimal",
    priceOld: 249000,
    price: 199000,
    featured: true,
    description: "Jurnal muqovasi uslubidagi sokin taklifnoma: iliq zig‘ir rang, katta surat va nafis yozuvlar. Sahifani pastga surganingizda surat sekin joyiga tushadi, ismlar pastdan ko‘tariladi, ingichka chiziqlar chiziladi. Keyin taklif matni, sana va sanoq, kun tartibi, manzil, dress-kod va mehmonlar javobi.",
    descriptionRu: "Спокойное приглашение в стиле обложки журнала: тёплый льняной цвет, большое фото и изящные надписи. Когда вы листаете страницу вниз, фото плавно встаёт на место, имена поднимаются снизу, проводятся тонкие линии. Дальше текст приглашения, дата и отсчёт, программа дня, адрес, дресс-код и ответы гостей.",
    descriptionEn: "A calm invitation styled like a magazine cover: warm linen tones, a large photo and elegant lettering. As you scroll down, the photo gently settles into place, the names rise from below and thin lines are drawn. Then the invitation text, the date and a countdown, the day’s schedule, the venue, the dress code and guest replies.",
    palette: ["#EFE8DC", "#2B2620", "#6B6A45", "#CFC5B4"],
    sample: { a: "Jasur", b: "Madina", date: "12 · 09 · 2026", venue: "«Zaytun bog‘i» restorani", time: "17:00" },
    theme: { bg: ["#f7f2e9", "#efe8dc"], ink: "#2b2620", accent: "#6b6a45", soft: "#857c6d", script: "cormorant", color: "krem" },
    fields: [
      {
        key: "program",
        type: "list",
        label: "To‘y dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Mehmonlarni kutib olish", max: 40 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Klassik", "Kechki rasmiy", "Milliy", "Ixtiyoriy"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Erkaklar — kostyum-shim (galstuk ixtiyoriy), ayollar — marosim ko‘ylagi yoki nafis libos.", max: 160 },
    ],
  },
  {
    number: 10,
    slug: "kumush",
    name: "Kumush",
    ceremony: "nikoh",
    ceremonies: ["nikoh", "fotiha"],
    style: "zamonaviy",
    priceOld: 249000,
    price: 199000,
    featured: true,
    description: "Oq-qora plyonka uslubidagi taklifnoma: to‘liq ekranli surat, qora va kumushrang oq bo‘limlar, nafis bosh harflar. Sahifani pastga surganingizda surat sekin yaqinlashadi, ismlar harflari yig‘ilib paydo bo‘ladi, plyonka lentasi suriladi va kadrlar birin-ketin ochiladi. Keyin sana va sanoq, kun tartibi, manzil, dress-kod va mehmonlar javobi.",
    descriptionRu: "Приглашение в стиле чёрно-белой плёнки: фото на весь экран, чёрные и серебристо-белые разделы, изящные заглавные буквы. Когда вы листаете страницу вниз, фото плавно приближается, буквы имён собираются вместе, плёнка прокручивается, а кадры проявляются один за другим. Дальше дата и отсчёт, программа дня, адрес, дресс-код и ответы гостей.",
    descriptionEn: "An invitation in a black-and-white film style: a full-screen photo, black and silver-white sections and elegant capital letters. As you scroll down, the photo slowly settles in, the letters of the names gather together, a film strip slides along and the frames develop one by one. Then the date and a countdown, the day’s schedule, the venue, the dress code and guest replies.",
    palette: ["#161616", "#F2F1EE", "#9A9A9A", "#FFFFFF"],
    sample: { a: "Jasur", b: "Madina", date: "12 · 09 · 2026", venue: "«Opera» banket zali", time: "17:00" },
    theme: { bg: ["#2a2a2a", "#161616"], ink: "#ffffff", accent: "#9a9a9a", soft: "#d4d3cf", script: "cormorant", color: "krem" },
    fields: [
      {
        key: "program",
        type: "list",
        label: "To‘y dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Mehmonlarni kutib olish", max: 40 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Klassik", "Kechki rasmiy", "Milliy", "Ixtiyoriy"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Erkaklar — smoking yoki to‘q rangli kostyum va kapalak galstuk, ayollar — uzun kechki libos.", max: 160 },
      { key: "quote", type: "textarea", label: "Iqtibos", placeholder: "Har bir kadr — biz birga yozgan hikoyaning bir satri.", max: 120, hint: "Ixtiyoriy · «Bizning kadrlar» bo‘limida, plyonka ostida" },
    ],
  },
  {
    number: 11,
    slug: "riviera",
    name: "Riviera",
    ceremony: "nikoh",
    ceremonies: ["nikoh", "fotiha"],
    style: "klassik",
    priceOld: 249000,
    price: 199000,
    featured: true,
    description: "Ko‘l bo‘yidagi villa ruhidagi nafis taklifnoma: shampan rang, qora va oltin, ko‘p bo‘sh joy. Sahifani pastga surganingizda oltin muhr ikkiga bo‘linadi, karta eshikdek ochiladi va ortidan ko‘l bo‘yidagi terrasa surati chiqadi, ismlar harflari yig‘iladi. Keyin taklif matni, suratlar, sana va sanoq, kun tartibi, manzil, dress-kod va mehmonlar javobi.",
    descriptionRu: "Изысканное приглашение в духе виллы у озера: цвет шампанского, чёрный и золото, много воздуха. Когда вы листаете страницу вниз, золотая печать раскалывается надвое, карточка открывается как двери, а за ней появляется фото террасы у озера и собираются буквы имён. Дальше текст приглашения, фото, дата и отсчёт, программа дня, адрес, дресс-код и ответы гостей.",
    descriptionEn: "An elegant invitation in the spirit of a lakeside villa: champagne tones, black and gold, plenty of air. As you scroll down, a gold seal splits in two, the card opens like a pair of doors to reveal a lakeside terrace photo, and the letters of the names gather together. Then the invitation text, photos, the date and a countdown, the day’s schedule, the venue, the dress code and guest replies.",
    palette: ["#FAF7F1", "#121212", "#A8895A", "#EEE6D8"],
    sample: { a: "Rustam", b: "Elina", date: "26 · 09 · 2026", venue: "Villa «Riviera»", time: "18:00" },
    theme: { bg: ["#faf7f1", "#eee6d8"], ink: "#121212", accent: "#a8895a", soft: "#7a736a", script: "cormorant", color: "krem" },
    fields: [
      {
        key: "program",
        type: "list",
        label: "To‘y dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Nikoh marosimi", max: 40 },
          note: { type: "text", label: "Izoh", placeholder: "Terrasada, quyosh botishida", max: 80 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Klassik", "Kechki rasmiy", "Milliy", "Ixtiyoriy"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Erkaklar — smoking yoki to‘q kostyum, ayollar — uzun kechki libos.", max: 160 },
      { key: "quote", type: "textarea", label: "Iqtibos", placeholder: "Sevgi — eng go‘zal safar.", max: 80, hint: "Ixtiyoriy · monogramma ostida; bo‘sh qolsa — «Sevgi — eng go‘zal safar.»" },
    ],
  },
  {
    number: 12,
    slug: "ertak",
    name: "Ertak",
    ceremony: "sunnat",
    ceremonies: ["sunnat"],
    style: "milliy",
    priceOld: 249000,
    price: 199000,
    featured: true,
    description: "Ertak kitobi uslubidagi sunnat to‘yi taklifnomasi: shaftoli va firuza ranglar, qog‘ozdan kesilgandek bulutlar, quyosh va otdagi shohzoda. Sahifani pastga surganingizda kitob muqovasi ochiladi, sahifalar varaqlanadi va ichidan shahar, tepaliklar va otliq shohzoda birin-ketin ko‘tariladi. Keyin taklif matni, o‘g‘lingiz suratlari, sana va sanoq, bayram dasturi, manzil, dress-kod va mehmonlar javobi; oxirida — mushakbozlikli tungi sahna.",
    descriptionRu: "Приглашение на суннат-той в стиле книги сказок: персиковые и бирюзовые цвета, облака, солнце и маленький шахзода на коне, будто вырезанные из бумаги. Когда вы листаете страницу вниз, обложка книги открывается, страницы перелистываются, и из неё одна за другой поднимаются город, холмы и всадник. Дальше текст приглашения, фото сына, дата и отсчёт, программа праздника, адрес, дресс-код и ответы гостей; в конце — ночная сцена с салютом.",
    descriptionEn: "A sunnat celebration invitation in the style of a fairy-tale book: peach and turquoise colours, with clouds, a sun and a little prince on horseback that look cut from paper. As you scroll down, the book cover opens, the pages turn, and a city, hills and the rider rise up one by one. Then the invitation text, photos of your son, the date and a countdown, the day’s programme, the venue, the dress code and guest replies; at the end — a night scene with fireworks.",
    palette: ["#1E5C63", "#F6C99A", "#D9674A", "#E9B44C"],
    sample: { a: "Amirxon", b: "Karimovlar oilasi", date: "15 · 05 · 2027", venue: "«Shohsaroy» to‘yxonasi", time: "07:00" },
    theme: { bg: ["#1e5c63", "#174a50"], ink: "#fbf3e6", accent: "#e9b44c", soft: "#f6c99a", script: "cormorant", color: "moviy" },
    fields: [
      {
        key: "program",
        type: "list",
        label: "Bayram dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Nahor oshi", max: 40 },
          note: { type: "text", label: "Izoh", placeholder: "Erta tongda palov dasturxoni", max: 60 },
        },
      },
      { key: "age", type: "number", label: "O‘g‘lingizning yoshi", placeholder: "7", max: 2, hint: "Ixtiyoriy · «Bizning shohzoda» bo‘limida: «7 yoshda»" },
      { key: "quote", type: "text", label: "Iqtibos", placeholder: "Kichkina yurak — katta orzular.", max: 60, hint: "Ixtiyoriy · «Bizning shohzoda» bo‘limida; bo‘sh qolsa — «Kichkina yurak — katta orzular.»" },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Milliy", "Bayramona", "Klassik", "Ixtiyoriy"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Bolalar milliy do‘ppida, kattalar bayramona libosda kelsa — quvonchimiz ikki barobar.", max: 160 },
    ],
  },
  {
    number: 13,
    slug: "farmon",
    name: "Farmon",
    ceremony: "sunnat",
    ceremonies: ["sunnat"],
    style: "klassik",
    priceOld: 249000,
    price: 199000,
    featured: true,
    description: "Shohona uslubdagi sunnat to‘yi taklifnomasi: zumrad fon, oltin naqshlar va fil suyagi rangidagi farmon varag‘i. Sahifani pastga surganingizda o‘ralgan farmonning muhri sinadi, o‘ram ochilib, ichida o‘g‘lingizning surati va ismi yozilgan «Shohona farmon» ko‘rinadi. Keyin taklif matni, suratlar, sana va sanoq, kun tartibi, manzil, dress-kod va mehmonlar javobi; oxirida — oltin toj va muhr.",
    descriptionRu: "Приглашение на суннат-той в царском стиле: изумрудный фон, золотые узоры и свиток цвета слоновой кости. Когда вы листаете страницу вниз, печать на свёрнутом указе ломается, свиток разворачивается, и появляется «Царский указ» с фото и именем вашего сына. Дальше текст приглашения, фотографии, дата и отсчёт, программа дня, адрес, дресс-код и ответы гостей; в конце — золотая корона и печать.",
    descriptionEn: "A royal-style sunnat celebration invitation: an emerald background, gold ornaments and an ivory scroll. As you scroll down, the seal on the rolled decree breaks, the scroll unrolls and a “Royal decree” appears with your son’s photo and name. Then the invitation text, photos, the date and a countdown, the day’s schedule, the venue, the dress code and guest replies; at the end — a golden crown and a seal.",
    palette: ["#0F3B33", "#0A2A24", "#C8A25A", "#F5EFE3"],
    sample: { a: "Amirxon", b: "Karimovlar xonadoni", date: "15 · 05 · 2027", venue: "«Oqsaroy» saroyi", time: "07:00" },
    theme: { bg: ["#0f3b33", "#0a2a24"], ink: "#f5efe3", accent: "#c8a25a", soft: "#efe4cc", script: "cormorant", color: "yashil" },
    fields: [
      {
        key: "program",
        type: "list",
        label: "Kun tartibi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Nahor oshi", max: 40 },
          note: { type: "text", label: "Izoh", placeholder: "Erta tongda mehmonlar bilan osh", max: 60 },
        },
      },
      { key: "age", type: "number", label: "O‘g‘lingizning yoshi", placeholder: "7", max: 2, hint: "Ixtiyoriy · «Bizning shahzoda» bo‘limida: «7 yoshda»" },
      { key: "quote", type: "text", label: "Iqtibos", placeholder: "Kichik yoshda — katta qadam.", max: 60, hint: "Ixtiyoriy · «Bizning shahzoda» bo‘limida; bo‘sh qolsa — «Kichik yoshda — katta qadam.»" },
      { key: "city", type: "text", label: "Shahar", placeholder: "Toshkent", max: 30, hint: "Ixtiyoriy · farmon varag‘ida sana yonida; bo‘sh qolsa — manzildan olinadi" },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Milliy", "Kechki", "Klassik", "Ixtiyoriy"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Bolalar — milliy to‘n va do‘ppida, kattalar — nafis bayramona libosda.", max: 160 },
    ],
  },
  {
    number: 14,
    slug: "sandiq",
    name: "Sandiq",
    ceremony: "sunnat",
    ceremonies: ["sunnat"],
    style: "milliy",
    priceOld: 249000,
    price: 199000,
    featured: true,
    description: "Zamonaviy o‘zbekona uslubdagi sunnat to‘yi taklifnomasi: anor rang, za’faron va qum ranglari, xon-atlas naqshlari. Sahifani pastga surganingizda yopiq yog‘och sandiqning qopqog‘i ko‘tariladi, ichidan iliq nur taraladi va o‘g‘lingizning surati sandiq ortidan ko‘tariladi. Keyin taklif matni, suratlar, sana va sanoq, kun tartibi, manzil, dress-kod va mehmonlar javobi; oxirida sandiq yana ochiladi.",
    descriptionRu: "Приглашение на суннат-той в современном узбекском стиле: гранатовый, шафрановый и песочный цвета, узоры хан-атласа. Когда вы листаете страницу вниз, крышка закрытого деревянного сундука поднимается, изнутри льётся тёплый свет, а из-за сундука поднимается фото вашего сына. Дальше текст приглашения, фотографии, дата и отсчёт, программа дня, адрес, дресс-код и ответы гостей; в конце сундук открывается снова.",
    descriptionEn: "A sunnat celebration invitation in a modern Uzbek style: pomegranate red, saffron and sand colours with khan-atlas patterns. As you scroll down, the lid of a closed wooden chest lifts, warm light pours out and your son’s photo rises from behind the chest. Then the invitation text, photos, the date and a countdown, the day’s schedule, the venue, the dress code and guest replies; at the end the chest opens once more.",
    palette: ["#7A1E2C", "#E0A23B", "#EFE3D0", "#1F8A8A"],
    sample: { a: "Amirxon", b: "Karimovlar oilasi", date: "15 · 05 · 2027", venue: "«Bog‘ishamol» to‘yxonasi", time: "07:00" },
    theme: { bg: ["#7a1e2c", "#5e1420"], ink: "#faf4ea", accent: "#e0a23b", soft: "#efe3d0", script: "cormorant", color: "bordo" },
    fields: [
      {
        key: "program",
        type: "list",
        label: "Kun tartibi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Nahor oshi", max: 40 },
          note: { type: "text", label: "Izoh", placeholder: "Erta tongda yaqinlar bilan osh", max: 60 },
        },
      },
      { key: "age", type: "number", label: "O‘g‘lingizning yoshi", placeholder: "7", max: 2, hint: "Ixtiyoriy · «Bizning shahzoda» bo‘limida: «Amirxon, 7 yoshda»" },
      { key: "quote", type: "text", label: "Iqtibos", placeholder: "Mehmon — atoyi Xudo.", max: 60, hint: "Ixtiyoriy · «Bizning shahzoda» bo‘limida; bo‘sh qolsa — «Mehmon — atoyi Xudo.»" },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Milliy", "Bayramona", "Klassik", "Ixtiyoriy"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Atlas, adras yoki milliy naqshli kiyimlar bayramimizga yanada ko‘rk beradi.", max: 160 },
    ],
  },
  {
    number: 15,
    slug: "sovga",
    name: "Sovg‘a",
    ceremony: "tugilgan-kun",
    ceremonies: ["tugilgan-kun"],
    style: "zamonaviy",
    priceOld: 249000,
    price: 199000,
    featured: false,
    description: "Tug‘ilgan kun taklifnomasi: pudra-pushti, to‘q gilos va kumush ranglar. Sahifani pastga surganingizda sovg‘a qutisining atlas banti yechiladi, qopqog‘i ochiladi va ichidan yoshingiz raqamlari yozilgan kumush sharlar ko‘tariladi. Keyin surat va ism, taklif matni, sana va sanoq, kecha dasturi, manzil, dress-kod va mehmonlar javobi; oxirida sharlar yana uchib keladi.",
    descriptionRu: "Приглашение на день рождения: пудрово-розовый, вишнёвый и серебристый цвета. Когда вы листаете страницу вниз, атласный бант на подарочной коробке развязывается, крышка открывается, и из коробки поднимаются серебристые шары-цифры с вашим возрастом. Дальше фото и имя, текст приглашения, дата и отсчёт, программа вечера, адрес, дресс-код и ответы гостей; в конце шары прилетают снова.",
    descriptionEn: "A birthday invitation in powder pink, deep cherry and silver. As you scroll down, the satin bow on a gift box comes undone, the lid opens and silver number balloons showing your age rise out of the box. Then the photo and name, the invitation text, the date and a countdown, the evening’s schedule, the venue, the dress code and guest replies; at the end the balloons fly in once more.",
    palette: ["#F6E1E1", "#5B1A2E", "#D99AA3", "#AEB3BC"],
    sample: { a: "Sofiya", date: "19 · 06 · 2027", venue: "«Lumière» restorani", time: "19:00" },
    theme: { bg: ["#f6e1e1", "#edcccf"], ink: "#5b1a2e", accent: "#d99aa3", soft: "#8a7476", script: "cormorant", color: "pushti" },
    fields: [
      { key: "age", type: "number", label: "Nechanchi yosh", placeholder: "18", max: 3, hint: "Ixtiyoriy · raqamlari kumush sharlarda chiqadi; bo‘sh qolsa — sharlar o‘rnida atlas bant" },
      { key: "host", type: "text", label: "Taklif qiluvchi", placeholder: "Karimovlar oilasi", max: 60, hint: "Ixtiyoriy · bo‘sh qolsa — taklif yubilyarning o‘zi nomidan, imzo — uning ismi" },
      {
        key: "program",
        type: "list",
        label: "Kecha dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Kutib olish", max: 40 },
          note: { type: "text", label: "Izoh", placeholder: "Limonad va jonli musiqa", max: 60 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Kokteyl", "Bayramona", "Klassik", "Ixtiyoriy"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Kokteyl libos — nafis, yengil va bayramona.", max: 160 },
    ],
  },
];

/** Mokap rasmi manzili + versiya (fayl xeshi): rasm yangilansa — brauzer keshidagi eskisi ishlatilmaydi */
const tplImg = (f: string) => `/templates/${f}${tplImgVersions[f] ? `?v=${tplImgVersions[f]}` : ""}`;

/** Kodga kiritilgan asl shablonlar (statik sahifalar shular bilan yig‘iladi) */
export const builtinTemplates: Template[] = builtin.map((t) => ({
  ...t,
  active: true,
  images: {
    phone: tplImg(`${t.slug}-phone.webp`),
    laptop: tplImg(`${t.slug}-laptop.webp`),
    // Kartada scroll bo‘ladigan butun sahifa rasmlari (scripts orqali yoki qo‘lda tayyorlanadi)
    phoneScroll: tplImg(`${t.slug}-phone-long.webp`),
    laptopScroll: tplImg(`${t.slug}-laptop-long.webp`),
    // Ruscha posterlar (fayl bor bo‘lsa)
    ...Object.fromEntries(
      (
        [
          ["phoneRu", "phone"],
          ["laptopRu", "laptop"],
          ["phoneScrollRu", "phone-long"],
          ["laptopScrollRu", "laptop-long"],
        ] as const
      )
        .filter(([, f]) => tplImgVersions[`${t.slug}-ru-${f}.webp`])
        .map(([k, f]) => [k, tplImg(`${t.slug}-ru-${f}.webp`)]),
    ),
    // Inglizcha posterlar (fayl bor bo‘lsa)
    ...Object.fromEntries(
      (
        [
          ["phoneEn", "phone"],
          ["laptopEn", "laptop"],
          ["phoneScrollEn", "phone-long"],
          ["laptopScrollEn", "laptop-long"],
        ] as const
      )
        .filter(([, f]) => tplImgVersions[`${t.slug}-en-${f}.webp`])
        .map(([k, f]) => [k, tplImg(`${t.slug}-en-${f}.webp`)]),
    ),
  },
}));

/** Joriy tilga mos mokap rasmlari: ruschada *Ru variantlari bo‘lsa — o‘shalar */
export function tplImages(t: Pick<Template, "images">, locale: "uz" | "ru" | "en") {
  const im = t.images;
  if (!im || locale === "uz") return im;
  if (locale === "en")
    return {
      phone: im.phoneEn ?? im.phone,
      laptop: im.laptopEn ?? im.laptop,
      phoneScroll: im.phoneScrollEn ?? im.phoneScroll,
      laptopScroll: im.laptopScrollEn ?? im.laptopScroll,
    };
  return {
    phone: im.phoneRu ?? im.phone,
    laptop: im.laptopRu ?? im.laptop,
    phoneScroll: im.phoneScrollRu ?? im.phoneScroll,
    laptopScroll: im.laptopScrollRu ?? im.laptopScroll,
  };
}
export const builtinSlugs = builtinTemplates.map((t) => t.slug);

declare global {
  interface Window {
    __SHOHNOMA_TEMPLATES__?: Template[];
    /** Bosh sahifadagi shablonlar slug’lari (admin tartibida) */
    __SHOHNOMA_HOME__?: string[];
  }
}

/** Brauzerda — admin boshqaradigan ro‘yxat (/api/templates.js, <head> da yuklanadi); aks holda — asl ro‘yxat */
function loadAll(): Template[] {
  if (typeof window !== "undefined") {
    const w = window.__SHOHNOMA_TEMPLATES__;
    if (Array.isArray(w) && w.length) return w;
  }
  return builtinTemplates;
}
const all: Template[] = loadAll();
const sortByNumber = (a: Template, b: Template) => a.number - b.number;

/** Barcha shablonlar (faollari), raqam bo‘yicha */
export const templates: Template[] = all.filter((t) => t.active !== false).sort(sortByNumber);
export const featuredTemplates = templates.filter((t) => t.featured);

/** Bosh sahifada ko‘pi bilan shuncha shablon (admin → Shablonlar → «Bosh sahifa») */
export const HOME_MAX = 10;

/** Bosh sahifa ro‘yxati: admin tanlagan tartib bo‘lsa — o‘sha; aks holda «Bosh sahifada» belgilanganlar raqam tartibida */
export function pickHome(list: Template[], slugs?: string[] | null): Template[] {
  if (Array.isArray(slugs) && slugs.length) {
    const by = new Map(list.map((t) => [t.slug, t]));
    return slugs.map((s) => by.get(s)).filter((t): t is Template => !!t && t.active !== false).slice(0, HOME_MAX);
  }
  return list.filter((t) => t.featured).slice(0, HOME_MAX);
}
/** Statik HTML (server) uchun — kodga kiritilgan ro‘yxatdan */
export const builtinHomeTemplates = pickHome([...builtinTemplates].sort(sortByNumber));
/** Brauzerda — /api/templates.js dagi admin tartibi */
export const homeTemplates = pickHome(templates, typeof window !== "undefined" ? window.__SHOHNOMA_HOME__ : null);

/** Slug bo‘yicha (nofaol shablonlar ham — eski buyurtmalar uchun) */
export function getTemplate(slug: string) {
  return all.find((t) => t.slug === slug);
}

/** Dizayn asosi slug'i (hero varianti, bezak rasmlari, musiqa) */
export const designSlug = (t: Pick<Template, "slug" | "base">) => t.base || t.slug;

/** Jonli ro‘yxat (hooklar uchun, src/lib/useTemplates.ts) */
export const allTemplates = all;

export const colorLabel: Record<TemplateTheme["color"], string> = {
  bordo: "Bordo",
  yashil: "Yashil",
  oltin: "Oltin",
  krem: "Krem",
  moviy: "Moviy",
  qizil: "Qizil",
  pushti: "Pushti",
};

/** Har bir taklifnomada bor imkoniyatlar (spec §6.1/8) */
export const templateFeatures = [
  "To‘yga qadar sanoq",
  "Fotogalereya",
  "Marosim dasturi",
  "Fon musiqasi",
  "Manzil va xarita",
  "Mehmonlar javobi",
];

/** Har bir dizaynda suratlar qayerga tushadi (buyurtma formasida joy-joy ko‘rsatiladi) */
export const PHOTO_SLOTS: Record<string, { title: string; where: string }[]> = {
  anor: [
    { title: "Asosiy surat", where: "Muqovada, ravoq ichida" },
    { title: "Hikoya · 1", where: "«Bizning hikoyamiz» polaroidi" },
    { title: "Hikoya · 2", where: "«Bizning hikoyamiz» polaroidi" },
    { title: "Hikoya · 3", where: "«Bizning hikoyamiz» polaroidi" },
  ],
  zumrad: [
    { title: "Asosiy surat", where: "Ochilishdagi polaroid" },
    { title: "Lahza · 1", where: "«Bizning lahzalar» ravog‘i" },
    { title: "Lahza · 2", where: "«Bizning lahzalar» polaroidi" },
  ],
  parvoz: [
    { title: "Surat · 1", where: "«Lahzalar» — katta polaroid" },
    { title: "Surat · 2", where: "«Lahzalar» — kichik polaroid" },
  ],
  shato: [
    { title: "Asosiy surat", where: "Taklif matni ustida, ark ichida" },
    { title: "Surat · 2", where: "Iqtibos yonida, ark ichida" },
  ],
  savsan: [
    { title: "Asosiy surat", where: "Kolajdagi katta kumush ramka" },
    { title: "Surat · 2", where: "Kolajdagi kichik kumush ramka" },
    { title: "Surat · 3", where: "«Lahzalar» ravog‘i (bo‘lmasa — asosiy surat)" },
    { title: "Surat · 4", where: "«Lahzalar» — katta kumush ramka" },
    { title: "Surat · 5", where: "«Lahzalar» — kichik kumush ramka" },
  ],
  muhr: [
    { title: "Asosiy surat", where: "Passe-partout ark ichida" },
    { title: "Surat · 2", where: "«Bazm manzili» ramkasi" },
    { title: "Surat · 3", where: "«Lahzalar» — birinchi ramka" },
    { title: "Surat · 4", where: "«Lahzalar» — ikkinchi ramka" },
  ],
  kalit: [
    { title: "Asosiy surat", where: "Kalit teshigi ortida (boshida va oxirida)" },
    { title: "Surat · 2", where: "Kelin portreti — eshik tirqishi va «Ikki hikoya»" },
    { title: "Surat · 3", where: "Kuyov portreti — «Ikki hikoya»" },
    { title: "Surat · 4", where: "Bazm zali — ark deraza ichida" },
    { title: "Surat · 5", where: "«Lahza» — nur ostidagi surat" },
  ],
  /** Sayohat — suratsiz dizayn (juftlik, shahar va bekatlar — shablonning o‘z rasmlari) */
  sayohat: [],
  /** Kumush — oq-qora: mijoz suratlari ham oq-qora ko‘rinadi */
  kumush: [
    { title: "Asosiy surat", where: "Birinchi ekranda (to‘liq ekran, oq-qora) va plyonkadagi 1-kadrda" },
    { title: "Surat · 2", where: "Yakuniy ekranda va plyonkadagi 2-kadrda" },
    { title: "Surat · 3", where: "Plyonkadagi 3-kadrda (qo‘llar, uzuklar…)" },
  ],
  /** Riviera — hero: shablonning Komo ko‘li terrasasi surati; mijoz suratlari «Kadrlar» va «Manzil» bo‘limlarida */
  riviera: [
    { title: "Asosiy surat", where: "«Kadrlar» — katta portret (oq-qora). Bo‘lmasa — bo‘lim chiqmaydi" },
    { title: "Surat · 2", where: "«Kadrlar» — kichik kvadrat ramka (bo‘lmasa — shampan surati)" },
    { title: "Surat · 3", where: "«Manzil» bo‘limida (bo‘lmasa — kechki terrasa surati)" },
  ],
  lino: [
    { title: "Asosiy surat", where: "Jurnal muqovasida (bo‘lmasa — guldasta surati)" },
    { title: "Surat · 2", where: "Taklif matni yonida — detal surat (guldasta, uzuklar…)" },
    { title: "Surat · 3", where: "«Bazm manzili» bo‘limida (bo‘lmasa — suratsiz)" },
  ],
  /** Ertak (sunnat) — sahnalar shablonning o‘z rasmlari; mijoz suratlari «Bizning shohzoda» bo‘limida */
  ertak: [
    { title: "Asosiy surat", where: "«Bizning shohzoda» — ark ichidagi katta surat. Bo‘lmasa — bo‘lim chiqmaydi" },
    { title: "Surat · 2", where: "«Bizning shohzoda» — doira ichidagi kichik surat" },
  ],
  /** Farmon (sunnat) — bo‘sh slotlar o‘rnida shablonning o‘z rasmlari (do‘ppi, saroy zali) */
  farmon: [
    { title: "Asosiy surat", where: "Farmon varag‘idagi ravoq ichida. Bo‘lmasa — do‘ppi surati" },
    { title: "Surat · 2", where: "«Bizning shahzoda» — ravoqdagi katta surat. Bo‘lmasa — bo‘lim chiqmaydi" },
    { title: "Surat · 3", where: "«Bizning shahzoda» — kichik kvadrat surat. Bo‘lmasa — do‘ppi surati" },
    { title: "Surat · 4", where: "«Manzil» — oltin ramkadagi surat. Bo‘lmasa — saroy zali surati" },
  ],
  /** Sandiq (sunnat) — bo‘sh slotlar o‘rnida shablonning o‘z rasmlari (non ushlagan qo‘llar, ayvon) */
  sandiq: [
    { title: "Asosiy surat", where: "Ochilgan sandiq ortidagi ravoq ichida. Bo‘lmasa — non ushlagan qo‘llar surati" },
    { title: "Surat · 2", where: "«Bizning shahzoda» — doira ichidagi surat. Bo‘lmasa — non ushlagan qo‘llar (asosiy surat ham bo‘lmasa — bo‘lim chiqmaydi)" },
    { title: "Surat · 3", where: "«Manzil» — to‘yxona surati. Bo‘lmasa — ayvon surati" },
  ],
  /** Sovg‘a (tug‘ilgan kun) — bo‘sh slotlar: hero’da ravoq ichida sovg‘a qutisi, «Yangi bob» — chiqmaydi, manzil — restoran surati */
  sovga: [
    { title: "Asosiy surat", where: "Sharlar ostidagi ravoq ichida. Bo‘lmasa — ravoqda sovg‘a qutisi" },
    { title: "Surat · 2", where: "«Yangi bob» — kvadrat surat. Bo‘lmasa — bu bo‘lim chiqmaydi" },
    { title: "Surat · 3", where: "«Manzil» — restoran surati. Bo‘lmasa — shablonning restoran surati" },
  ],
};
export const photoSlots = (t: Pick<Template, "slug" | "base">) =>
  PHOTO_SLOTS[designSlug(t)] ?? Array.from({ length: 6 }, (_, i) => ({ title: `Surat · ${i + 1}`, where: "Fotogalereya" }));

/** Shablon kategoriyalari (slug, kamida bittasi; o‘chirilgan kategoriyalar tashlab ketiladi) */
export function tplCeremonies(t: Pick<Template, "ceremony" | "ceremonies">): string[] {
  const list = (t.ceremonies ?? []).filter((c) => !!getCategory(c));
  return list.length ? Array.from(new Set(list)) : [t.ceremony];
}
/** Shablon shu kategoriyadami */
export function hasCeremony(t: Pick<Template, "ceremony" | "ceremonies">, c: string): boolean {
  return !c || tplCeremonies(t).includes(c);
}
/** Shablon qo‘llaydigan taklifnoma turlari (buyurtma formasidagi «Marosim turi») */
export function tplKinds(t: Pick<Template, "ceremony" | "ceremonies">): Ceremony[] {
  const kinds = tplCeremonies(t).map((c) => getCategory(c)?.kind ?? (c in ceremonyLabel ? (c as Ceremony) : null)).filter((k): k is Ceremony => !!k);
  return kinds.length ? Array.from(new Set(kinds)) : [t.ceremony];
}
/** Kategoriyalar nomi: «Nikoh to‘yi, Fotiha to‘yi» */
export function ceremonyNames(t: Pick<Template, "ceremony" | "ceremonies">, locale: Locale = "uz"): string {
  return tplCeremonies(t)
    .map((c) => categoryName(getCategory(c), locale) || ceremonyLabel[c as Ceremony] || c)
    .join(", ");
}
