import { tplImgVersions } from "./tplImgVersions.ts";
import { categoryName, getCategory } from "./categories.ts";
import type { Locale } from "./i18n";
/** Shablonlar ro‘yxati — spec §10.1 (narxlar namuna, [Ochiq]) */

export type Ceremony = "nikoh" | "fotiha" | "sunnat" | "tugilgan-kun" | "korporativ";
export type Style = "klassik" | "minimal" | "romantik" | "zamonaviy" | "milliy";

export const ceremonyLabel: Record<Ceremony, string> = {
  nikoh: "Nikoh to‘yi",
  fotiha: "Fotiha to‘yi",
  sunnat: "Sunnat to‘yi",
  "tugilgan-kun": "Tug‘ilgan kun",
  korporativ: "Korporativ tadbir",
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

/** url/email/tel/image — vizitka uchun qo‘shilgan (server: tpl_clean_extra) */
export type FieldType = "text" | "textarea" | "time" | "date" | "number" | "select" | "url" | "email" | "tel" | "image";
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
  /** Yangi buyurtmada boshlanish vaqti (standart 18:00; nahorgi osh — 06:00). Server: orders.php MORNING_TEMPLATES */
  defaultTime?: string;
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
  {
    number: 16,
    slug: "malika",
    name: "Malika",
    ceremony: "tugilgan-kun",
    ceremonies: ["tugilgan-kun"],
    style: "romantik",
    priceOld: 249000,
    price: 199000,
    featured: false,
    description: "Tug‘ilgan kun taklifnomasi malika uslubida: pudra-pushti atlas, marvarid va kumush. Sahifani pastga surganingizda yopiq atlas pardalar ikki tomonga ochiladi, marvarid gerb tiara bilan yuqoriga ko‘tariladi va ortidan surat chiqadi, gul barglari to‘kiladi. Keyin taklif matni, kechaning qo‘shig‘i, kalendar va sanoq, kecha dasturi, manzil, dress-kod va mehmonlar javobi.",
    descriptionRu: "Приглашение на день рождения в стиле принцессы: пудрово-розовый атлас, жемчуг и серебро. Когда вы листаете страницу вниз, закрытые атласные шторы раздвигаются, жемчужный герб с тиарой поднимается вверх, за ним появляется фото и падают лепестки. Дальше текст приглашения, песня вечера, календарь и отсчёт, программа вечера, адрес, дресс-код и ответы гостей.",
    descriptionEn: "A birthday invitation in a princess style: powder pink satin, pearls and silver. As you scroll down, the closed satin curtains part, the pearl crest with its tiara rises away, the photo appears behind them and petals fall. Then the invitation text, the song of the evening, a calendar and countdown, the evening’s schedule, the venue, the dress code and guest replies.",
    palette: ["#F3D9DC", "#B76E79", "#8C4A57", "#EDE7EA"],
    sample: { a: "Sabina", date: "24 · 07 · 2027", venue: "«Versal» bal zali", time: "18:00" },
    theme: { bg: ["#f7e4e6", "#efd0d4"], ink: "#8c4a57", accent: "#b76e79", soft: "#8e7479", script: "cormorant", color: "pushti" },
    fields: [
      { key: "age", type: "number", label: "Nechanchi yosh", placeholder: "18", max: 3, hint: "Ixtiyoriy · gerb ichida va surat ostida chiqadi" },
      { key: "host", type: "text", label: "Taklif qiluvchi", placeholder: "Rustam va Dilnoza Karimovlar", max: 60, hint: "Ixtiyoriy · to‘ldirilsa — taklif shu nomdan («biz»), gerb ostida imzo; bo‘sh qolsa — yubilyarning o‘zi nomidan" },
      {
        key: "program",
        type: "list",
        label: "Kecha dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Kutib olish", max: 40 },
          note: { type: "text", label: "Izoh", placeholder: "Mehmonlarni qarshi olish", max: 60 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Malika uslubida", "Kechki libos", "Kokteyl", "Klassik", "Ixtiyoriy"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Kechki va bal libosi — nafis, yengil va bayramona.", max: 160 },
    ],
  },
  {
    number: 17,
    slug: "sham",
    name: "Sham",
    ceremony: "tugilgan-kun",
    ceremonies: ["tugilgan-kun"],
    style: "zamonaviy",
    priceOld: 249000,
    price: 199000,
    featured: false,
    description: "Har qanday yoshga mos tug‘ilgan kun taklifnomasi: bolalikdan yubileygacha. Ranglari — tungi ko‘k, shampan oltin va sut rang. Sahifani pastga surganingizda qorong‘ida yonib turgan sham o‘chadi, tutun ko‘tariladi, konfetti sochiladi va ekran yorishib, katta oltin raqamda yoshingiz chiqadi. Keyin surat va ism, taklif matni, sana va sanoq, kecha dasturi, manzil, dress-kod va mehmonlar javobi; oxirida shamlar birin-ketin yonadi.",
    descriptionRu: "Приглашение на день рождения для любого возраста: от детского праздника до юбилея. Цвета — ночной синий, золото шампань и молочный. Когда вы листаете страницу вниз, свеча в темноте гаснет, поднимается дымок, разлетается конфетти, экран светлеет и появляется ваш возраст большими золотыми цифрами. Дальше фото и имя, текст приглашения, дата и отсчёт, программа вечера, адрес, дресс-код и ответы гостей; в конце свечи загораются одна за другой.",
    descriptionEn: "A birthday invitation for any age, from a child’s party to a big jubilee. The colours are night blue, champagne gold and milk white. As you scroll down, a candle burning in the dark goes out, a wisp of smoke rises, confetti bursts, the screen brightens and your age appears in large gold numbers. Then the photo and name, the invitation text, the date and a countdown, the evening’s schedule, the venue, the dress code and guest replies; at the end the candles light up one by one.",
    palette: ["#1B2030", "#C9A46A", "#E3C891", "#FBF7F0"],
    sample: { a: "Aziz", date: "14 · 08 · 2027", venue: "«Terrassa» restorani", time: "19:00" },
    theme: { bg: ["#2a3150", "#141826"], ink: "#fbf7f0", accent: "#c9a46a", soft: "#e3c891", script: "cormorant", color: "moviy" },
    fields: [
      { key: "age", type: "number", label: "Nechanchi yosh", placeholder: "30", max: 3, hint: "Ixtiyoriy · katta oltin raqam bo‘lib chiqadi; bo‘sh qolsa — raqam o‘rnida ismning birinchi harfi" },
      { key: "host", type: "text", label: "Taklif qiluvchi", placeholder: "Karimovlar oilasi", max: 60, hint: "Ixtiyoriy · to‘ldirilsa — taklif shu nomdan («biz»), imzo — shu; bo‘sh qolsa — yubilyarning o‘zi nomidan" },
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
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Smart casual", "Kechki", "Bayramona", "Klassik", "Ixtiyoriy"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Qulay va bayramona — o‘zingizni erkin his qiladigan kiyim.", max: 160 },
    ],
  },
  {
    number: 18,
    slug: "koinot",
    name: "Koinot",
    ceremony: "tugilgan-kun",
    ceremonies: ["tugilgan-kun"],
    style: "zamonaviy",
    priceOld: 249000,
    price: 199000,
    featured: false,
    description: "O‘g‘il bolaning tug‘ilgan kuni uchun kosmik taklifnoma. Ranglari — tungi ko‘k, to‘q sariq va sut rang. Sahifani pastga surganingizda halqada 3, 2, 1 sanog‘i o‘tadi, raketa tutun ichidan uchib ketadi va ortidan bolangizning surati, ismi va yoshi chiqadi. Keyin taklif matni, sana va sanoq, bayram dasturi, manzil, kiyinish uslubi va mehmonlar javobi; oxirida raketa yana uchib keladi va kosmonavt qo‘l silkitadi.",
    descriptionRu: "Космическое приглашение на день рождения мальчика. Цвета — ночной синий, оранжевый и молочный. Когда вы листаете страницу вниз, на кольце идёт отсчёт 3, 2, 1, ракета улетает из облака дыма, а за ней появляются фото, имя и возраст вашего сына. Дальше текст приглашения, дата и отсчёт, программа праздника, адрес, стиль одежды и ответы гостей; в конце ракета прилетает снова, а космонавт машет рукой.",
    descriptionEn: "A space-themed birthday invitation for a boy. The colours are night blue, orange and milk white. As you scroll down, a ring counts down 3, 2, 1, the rocket lifts off through a cloud of smoke, and your son’s photo, name and age appear after it. Then the invitation text, the date and a countdown, the party schedule, the venue, what to wear and guest replies; at the end the rocket flies in again and an astronaut waves.",
    palette: ["#0E1733", "#FF7A3D", "#6FB7FF", "#FFF4E2"],
    sample: { a: "Samir", date: "12 · 12 · 2027", venue: "«Orbita» bolalar markazi", time: "15:00" },
    theme: { bg: ["#16224a", "#090f24"], ink: "#fff4e2", accent: "#ff7a3d", soft: "#f6e7a8", script: "cormorant", color: "moviy" },
    fields: [
      { key: "age", type: "number", label: "Nechanchi yosh", placeholder: "6", max: 3, hint: "Ixtiyoriy · katta to‘q sariq raqam bo‘lib chiqadi; bo‘sh qolsa — raqam o‘rnida «tug‘ilgan kunini nishonlaydi»" },
      { key: "host", type: "text", label: "Taklif qiluvchi", placeholder: "Aziza va Jasur", max: 60, hint: "Ixtiyoriy · odatda ota-ona: taklif shu nomdan («O‘g‘limiz … taklif qilamiz»), imzo — shu; bo‘sh qolsa — bolaning o‘zi nomidan" },
      {
        key: "program",
        type: "list",
        label: "Bayram dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Mehmonlar kelishi", max: 40 },
          note: { type: "text", label: "Izoh", placeholder: "Fotozona va kosmik bezaklar", max: 60 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Kosmik uslub", "Erkin va qulay", "Bayramona", "Ixtiyoriy"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Kosmonavt kostyumi, yulduzli futbolka yoki ko‘k-to‘q sariq ranglar — ixtiyoriy.", max: 160 },
    ],
  },
  {
    number: 19,
    slug: "marvarid",
    name: "Marvarid",
    ceremony: "tugilgan-kun",
    ceremonies: ["tugilgan-kun"],
    style: "romantik",
    priceOld: 249000,
    price: 199000,
    featured: false,
    description: "Qizlar uchun tug‘ilgan kun taklifnomasi. Ranglari — pudra-pushti, sut rang va gilos-qizil; bezaklari — marvarid shodalar, atlas bantlar va lolalar. Sahifani pastga surganingizda qizil atlas bant yechiladi, lenta ikki tomonga ochiladi, keyin arka ichidagi surat, ism va yosh chiqadi. So‘ng taklif matni, kalendar va sanoq, kecha dasturi, manzil, kiyinish uslubi va mehmonlar javobi; oxirida tortdagi sham yonadi.",
    descriptionRu: "Приглашение на день рождения для девушки. Цвета — пудрово-розовый, молочный и вишнёво-красный; украшения — жемчужные нити, атласные банты и тюльпаны. Когда вы листаете страницу вниз, красный атласный бант развязывается, лента расходится в стороны, а затем появляются фото в арке, имя и возраст. Дальше текст приглашения, календарь и отсчёт, программа вечера, адрес, стиль одежды и ответы гостей; в конце на торте загорается свеча.",
    descriptionEn: "A birthday invitation for a girl. The colours are powder pink, milk white and cherry red, decorated with strings of pearls, satin bows and tulips. As you scroll down, a red satin bow comes untied and the ribbon parts to the sides, then the photo in an arch, the name and the age appear. Then the invitation text, a calendar and countdown, the evening’s schedule, the venue, what to wear and guest replies; at the end the candle on the cake lights up.",
    palette: ["#F6D6DA", "#B5162B", "#FFF8F3", "#2A1A1F"],
    sample: { a: "Mohinur", date: "19 · 12 · 2026", venue: "«Lumière» kafe", time: "18:00" },
    theme: { bg: ["#fbe4e7", "#f6d6da"], ink: "#2a1a1f", accent: "#b5162b", soft: "#9a6f78", script: "cormorant", color: "pushti" },
    fields: [
      { key: "age", type: "number", label: "Nechanchi yosh", placeholder: "20", max: 3, hint: "Ixtiyoriy · katta kursiv raqam bo‘lib chiqadi; bo‘sh qolsa — raqam o‘rnida «tug‘ilgan kunimni nishonlayman»" },
      { key: "host", type: "text", label: "Taklif qiluvchi", placeholder: "Karimovlar oilasi", max: 60, hint: "Ixtiyoriy · to‘ldirilsa — taklif shu nomdan («biz»), imzo — shu; bo‘sh qolsa — bayram egasining o‘zi nomidan" },
      {
        key: "program",
        type: "list",
        label: "Kecha dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Kutib olish", max: 40 },
          note: { type: "text", label: "Izoh", placeholder: "Welcome drink va fotozona", max: 60 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Pushti va oq", "Nafis kechki", "Bayramona", "Ixtiyoriy"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Pushti, oq yoki sut rangidagi liboslar — bantlar bilan bo‘lsa, yanada yaxshi.", max: 160 },
    ],
  },
  {
    number: 20,
    slug: "bilet",
    name: "Bilet",
    ceremony: "korporativ",
    ceremonies: ["korporativ"],
    style: "zamonaviy",
    priceOld: 249000,
    price: 199000,
    featured: false,
    description: "Korporativ tadbir uchun chipta ko‘rinishidagi taklifnoma. Ranglari — elektr ko‘k, to‘q ko‘k va oq. Sahifani pastga surganingizda sahna chiroqlari ostida tirqishdan chipta chiqadi: unda kompaniya nomi, sana va joy. So‘ng mehmonga shaxsiy murojaat, aeroport tablosidek sanoq, kecha dasturi, spikerlar, manzil, dress-kod va ishtirokni tasdiqlash anketasi; oxirida mehmon ismi yozilgan chipta qoldig‘i.",
    descriptionRu: "Приглашение-билет для корпоративного мероприятия. Цвета — электрический синий, тёмно-синий и белый. Когда вы листаете страницу вниз, под светом сцены из щели выезжает билет с названием компании, датой и местом. Дальше — личное обращение к гостю, отсчёт в стиле табло аэропорта, программа вечера, спикеры, адрес, дресс-код и анкета для подтверждения участия; в конце — корешок билета с именем гостя.",
    descriptionEn: "A ticket-style invitation for a corporate event. The colours are electric blue, deep navy and white. As you scroll down, a ticket slides out of a slot under the stage lights, showing the company name, date and venue. Then a personal greeting to the guest, a countdown in the style of an airport departure board, the evening’s schedule, speakers, the venue, the dress code and an RSVP form; at the end, a ticket stub with the guest’s name.",
    palette: ["#1F3BFF", "#050A2E", "#F4F6FF", "#C76BFF"],
    sample: { a: "Yillik hamkorlar kechasi", b: "NOVA GROUP", date: "23 · 01 · 2027", venue: "Hyatt Regency Tashkent Grand Ballroom", time: "19:00" },
    theme: { bg: ["#0b1550", "#050a2e"], ink: "#ffffff", accent: "#1f3bff", soft: "#c3cbff", script: "cinzel", color: "moviy" },
    fields: [
      {
        key: "program",
        type: "list",
        label: "Kecha dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Ochilish so‘zi", max: 40 },
          note: { type: "text", label: "Joyi yoki izoh", placeholder: "Asosiy zal", max: 40 },
        },
      },
      {
        key: "speakers",
        type: "list",
        label: "Spikerlar",
        min: 0,
        max: 6,
        item: {
          name: { type: "text", label: "Ism va familiya", required: true, placeholder: "Rustam Aliyev", max: 40 },
          role: { type: "text", label: "Lavozimi", placeholder: "Bosh direktor", max: 60 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Business casual", "Black tie", "Smart casual", "Erkin uslub"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Klassik kostyum yoki business casual.", max: 160 },
    ],
  },
  {
    number: 21,
    slug: "taqvim",
    name: "Taqvim",
    ceremony: "korporativ",
    ceremonies: ["korporativ"],
    style: "zamonaviy",
    priceOld: 249000,
    price: 199000,
    featured: false,
    description: "Forum, konferensiya yoki bir-ikki kunlik tadbir uchun taklifnoma. Ranglari — to‘q yashil-ko‘kish va lime, bezaklari — shisha plitkalar. Sahifani pastga surganingizda lime rangli sana plitkasi butun ekranga yoyiladi, ostidan kalendar ko‘rinishidagi birinchi ekran chiqadi: unda sessiyalar kun va vaqti bilan. So‘ng mehmonga shaxsiy murojaat, sanoq, kunlarga bo‘lingan dastur, spikerlar, manzil, dress-kod va ishtirokni tasdiqlash anketasi (mehmon qaysi kunlari kelishini belgilaydi).",
    descriptionRu: "Приглашение на форум, конференцию или мероприятие на один-два дня. Цвета — тёмный сине-зелёный и лайм, украшения — стеклянные плитки. Когда вы листаете страницу вниз, лаймовая плитка с датой раскрывается на весь экран, а под ней появляется первый экран в виде календаря с сессиями по дням и времени. Дальше — личное обращение к гостю, отсчёт, программа по дням, спикеры, адрес, дресс-код и анкета для подтверждения участия (гость отмечает, в какие дни придёт).",
    descriptionEn: "An invitation for a forum, conference or one- or two-day event. The colours are deep teal and lime, with glass tiles as decoration. As you scroll down, a lime date tile expands to fill the screen and reveals a calendar-style first screen with the sessions by day and time. Then a personal greeting to the guest, a countdown, the schedule split by day, speakers, the venue, the dress code and an RSVP form where guests mark which days they will attend.",
    palette: ["#E4FF3A", "#0A1214", "#0F1B1E", "#F2F5F4"],
    sample: { a: "Kelajak forumi 2027", b: "Nexa Hub", date: "18 · 02 · 2027", venue: "Nexa Hub", time: "10:00" },
    theme: { bg: ["#13232a", "#0a1214"], ink: "#f4f7f6", accent: "#e4ff3a", soft: "#8fa3a6", script: "cinzel", color: "yashil" },
    fields: [
      { key: "kind", type: "select", label: "Tadbir turi", options: ["forum", "konferensiya", "sammit", "seminar", "ko‘rgazma", "tadbir"], hint: "Birinchi ekrandagi katta so‘z va sanoq sarlavhasi («forumgacha»); tanlanmasa — «forum»" },
      { key: "dateEnd", type: "date", label: "Ikkinchi kun sanasi", hint: "Ixtiyoriy · ikki kunlik tadbir bo‘lsa: sanalar «18–19 fevral» bo‘lib chiqadi, dastur kunlarga bo‘linadi, mehmon anketada kunlarni tanlaydi" },
      {
        key: "program",
        type: "list",
        label: "Dastur — birinchi kun",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Ochilish va asosiy nutq", max: 40 },
          note: { type: "text", label: "Joyi yoki izoh", placeholder: "Katta zal", max: 40 },
        },
      },
      {
        key: "program2",
        type: "list",
        label: "Dastur — ikkinchi kun",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Master-klasslar", max: 40 },
          note: { type: "text", label: "Joyi yoki izoh", placeholder: "Kichik zallar", max: 40 },
        },
      },
      {
        key: "speakers",
        type: "list",
        label: "Spikerlar",
        min: 0,
        max: 6,
        item: {
          name: { type: "text", label: "Ism va familiya", required: true, placeholder: "Sardor Rahimov", max: 40 },
          role: { type: "text", label: "Lavozimi", placeholder: "Nexa Hub asoschisi", max: 60 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Smart casual", "Business", "Black tie", "Erkin uslub"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Qulay, lekin tartibli kiyim: jemper, ko‘ylak yoki blazer.", max: 160 },
    ],
  },
  {
    number: 22,
    slug: "sammit",
    name: "Sammit",
    ceremony: "korporativ",
    ceremonies: ["korporativ"],
    style: "zamonaviy",
    priceOld: 249000,
    price: 199000,
    featured: false,
    description: "Moliya, investitsiya yoki biznes sammiti uchun taklifnoma. Ranglari — qora va to‘q qizil, bezaklari — ingichka to‘r, kumushrang tangalar va xira shisha kataklar. Sahifa ochilganda tanga aylanib tushadi, pastga surganingizda tangalar ikki tomonga uchib ketadi va katta sarlavhali birinchi ekran chiqadi. So‘ng mehmonga shaxsiy murojaat, sanoq, kun dasturi, spikerlar, manzil, dress-kod va ishtirokni tasdiqlash anketasi.",
    descriptionRu: "Приглашение на финансовый, инвестиционный или бизнес-саммит. Цвета — чёрный и тёмно-красный, украшения — тонкая сетка, серебристые монеты и матовые стеклянные ячейки. При открытии страницы монета падает, вращаясь, а когда вы листаете вниз, монеты разлетаются в стороны и появляется первый экран с крупным заголовком. Дальше — личное обращение к гостю, отсчёт, программа дня, спикеры, адрес, дресс-код и анкета для подтверждения участия.",
    descriptionEn: "An invitation for a finance, investment or business summit. The colours are black and deep red, with a fine grid, silver coins and frosted glass cells as decoration. When the page opens, a coin spins down; as you scroll, the coins fly apart and reveal a first screen with a large title. Then a personal greeting to the guest, a countdown, the day’s schedule, speakers, the venue, the dress code and an RSVP form.",
    palette: ["#A80F0D", "#0A0A0A", "#DBDBDE", "#FFFFFF"],
    sample: { a: "Moliya va investitsiya sammiti", b: "Orbis Capital", date: "12 · 03 · 2027", venue: "Hilton Tashkent City", time: "10:00" },
    theme: { bg: ["#3a0807", "#0a0a0a"], ink: "#ffffff", accent: "#e8e8ea", soft: "#b9b9bf", script: "cormorant", color: "qizil" },
    fields: [
      { key: "kind", type: "select", label: "Tadbir turi", options: ["sammit", "forum", "konferensiya", "seminar", "ko‘rgazma", "tadbir"], hint: "Sanoq sarlavhasi («Sammitgacha»); tanlanmasa — «sammit»" },
      {
        key: "facts",
        type: "list",
        label: "Birinchi ekrandagi qisqa faktlar",
        min: 0,
        max: 3,
        item: {
          text: { type: "text", label: "Fakt", required: true, placeholder: "Investorlar bilan uchrashuv", max: 28 },
        },
      },
      {
        key: "program",
        type: "list",
        label: "Dastur",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Ochilish nutqi", max: 40 },
          note: { type: "text", label: "Joyi yoki izoh", placeholder: "Katta zal", max: 30 },
        },
      },
      {
        key: "speakers",
        type: "list",
        label: "Spikerlar",
        min: 0,
        max: 6,
        item: {
          name: { type: "text", label: "Ism va familiya", required: true, placeholder: "Timur Ahmedov", max: 40 },
          role: { type: "text", label: "Lavozimi", placeholder: "Boshqaruvchi hamkor", max: 60 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Black tie", "Business", "Smart casual", "Erkin uslub"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Kechki kostyum, kechki libos.", max: 160 },
    ],
  },
  {
    number: 23,
    slug: "tong",
    defaultTime: "06:00",
    name: "Tong",
    ceremony: "nikoh",
    ceremonies: ["nikoh"],
    style: "milliy",
    priceOld: 249000,
    price: 199000,
    featured: false,
    description: "To‘y munosabati bilan beriladigan nahorgi osh uchun taklifnoma. Ranglari — tungi to‘q ko‘k, binafsha, kahrabo va oltin, bezaklari — oltin girih naqshlari. Sahifani pastga surganingizda tungi osmonda quyosh ufqdan ko‘tariladi, osmon tongga aylanadi va katta «06:00» yozuvli birinchi ekran chiqadi. Keyin taklif matni, «Tong dasturxoni» suratlari, oshgacha sanoq, tong tartibi, manzil, dress-kod va mehmonlar javobi; oxirida quyosh yana ko‘tariladi.",
    descriptionRu: "Приглашение на утренний плов (нахорги ош) по случаю свадьбы. Цвета — ночной тёмно-синий, фиолетовый, янтарный и золото, украшения — золотые узоры гирих. Когда вы листаете страницу вниз, на ночном небе из-за горизонта поднимается солнце, небо светлеет, и появляется первый экран с крупным «06:00». Дальше текст приглашения, фото «утреннего дастархана», отсчёт до плова, порядок утра, адрес, дресс-код и ответы гостей; в конце солнце поднимается снова.",
    descriptionEn: "An invitation to a wedding morning plov (nahorgi osh). The colours are night navy, violet, amber and gold, with gold girih patterns as decoration. As you scroll down, the sun rises over the horizon in the night sky, the sky turns to dawn, and a first screen with a large “06:00” appears. Then the invitation text, photos of the morning table, a countdown to the plov, the morning schedule, the venue, the dress code and guest replies; at the end the sun rises again.",
    palette: ["#1B1F4B", "#5B3A7A", "#F2A65A", "#E9C27A"],
    sample: { a: "Jasur", b: "Madina", date: "12 · 12 · 2027", venue: "«Navro‘z» choyxonasi", time: "06:00" },
    theme: { bg: ["#1b1f4b", "#0d0f29"], ink: "#ffffff", accent: "#e9c27a", soft: "#f2a65a", script: "cormorant", color: "moviy" },
    fields: [
      { key: "hosts", type: "text", label: "Mezbonlar", placeholder: "Karimovlar oilasi", max: 60, hint: "Ochilishda, «Hurmat bilan» imzosida va oxirida chiqadi; bo‘sh qolsa — kuyov va kelin ismlari" },
      { key: "side", type: "select", label: "Taklif kim nomidan", options: ["Kuyov tomoni", "Kelin tomoni"], hint: "Taklif matni: «O‘g‘limiz … va kelinimiz …» yoki «Qizimiz … va kuyovimiz …»; tanlanmasa — kuyov tomoni" },
      {
        key: "program",
        type: "list",
        label: "Tong tartibi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Xatmi Qur’on va duo", max: 40 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Milliy uslub", "Klassik", "Erkin"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Do‘ppi yoki chopon bilan kelsangiz, dasturxon yanada fayzli bo‘ladi.", max: 160 },
    ],
  },
  {
    number: 24,
    slug: "qozon",
    defaultTime: "06:00",
    name: "Qozon",
    ceremony: "sunnat",
    ceremonies: ["sunnat"],
    style: "milliy",
    priceOld: 249000,
    price: 199000,
    featured: false,
    description: "Sunnat to‘yi munosabati bilan beriladigan nahorgi osh uchun taklifnoma. Ranglari — terrakota, ko‘mir, za’faron va oq, yozuvlari yirik va qalin. Sahifani pastga surganingizda qorong‘ida turgan qozonning qopqog‘i ko‘tariladi va qozondan bug‘ chiqadi. Keyin osh vaqti, sana va osh surati tushirilgan plitkalar, taklif matni, tayyorgarlik suratlari, oshgacha sanoq, tong tartibi, manzil, dress-kod va mehmonlar javobi; oxirida yana bug‘ chiqib turgan qozon.",
    descriptionRu: "Приглашение на утренний плов (нахорги ош) по случаю суннат-тоя. Цвета — терракота, угольный, шафран и белый, надписи крупные и жирные. Когда вы листаете страницу вниз, крышка казана, стоящего в темноте, поднимается, и из казана идёт пар. Дальше плитки со временем плова, датой и фото плова, текст приглашения, фото подготовки, отсчёт до плова, порядок утра, адрес, дресс-код и ответы гостей; в конце — снова казан с паром.",
    descriptionEn: "An invitation to a morning plov (nahorgi osh) held for a sunnat celebration. The colours are terracotta, charcoal, saffron and white, with large bold lettering. As you scroll down, the lid of a kazan standing in the dark lifts and steam rises from it. Then tiles with the plov time, the date and a photo of the plov, the invitation text, photos of the preparation, a countdown to the plov, the morning schedule, the venue, the dress code and guest replies; at the end, the steaming kazan once more.",
    palette: ["#B5532E", "#2B2522", "#E3A33B", "#FFFFFF"],
    sample: { a: "Alisher", b: "Rahimovlar xonadoni", date: "21 · 12 · 2026", venue: "Rahimovlar hovlisi", time: "06:30" },
    theme: { bg: ["#b5532e", "#2b2522"], ink: "#ffffff", accent: "#e3a33b", soft: "#f8f2ed", script: "cinzel", color: "qizil" },
    fields: [
      { key: "hosts", type: "text", label: "Mezbonlar", placeholder: "Rahimovlar xonadoni", max: 60, hint: "Ochilishda, «Hurmat bilan» imzosida va oxirida chiqadi; bo‘sh qolsa — ota-ona ismi" },
      { key: "side", type: "select", label: "Taklif kim nomidan", options: ["Ota-onasi", "Bobosi va buvisi"], hint: "Taklif matni: «O‘g‘limiz …» yoki «Nabiramiz …»; tanlanmasa — ota-onasi" },
      {
        key: "program",
        type: "list",
        label: "Tong tartibi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Osh tortiladi", max: 40 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Milliy", "Klassik", "Erkin"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Chopon, do‘ppi yoki milliy naqshli kiyim — tong dasturxoniga yarashadi.", max: 160 },
    ],
  },
  {
    number: 25,
    slug: "lagan",
    defaultTime: "06:00",
    name: "Lagan",
    ceremony: "nikoh",
    ceremonies: ["nikoh"],
    style: "milliy",
    priceOld: 249000,
    price: 199000,
    featured: false,
    description: "To‘y munosabati bilan beriladigan nahorgi osh uchun taklifnoma. Ranglari — kobalt, firuza, oq va oxra, bezaklari — Rishton naqshli lagan va koshin chiziqlar. Ochilishda oq fonda lagan aylanib chiqadi; sahifani pastga surganingizda u ekranni to‘ldirib kattalashadi, fon kobaltga o‘tadi va lagan markazida osh paydo bo‘ladi. Keyin taklif matni, «Dasturxon» suratlari, kichik laganlar ichida oshgacha sanoq, tong tartibi, manzil, dress-kod va mehmonlar javobi; oxirida yana aylanib turgan lagan.",
    descriptionRu: "Приглашение на утренний плов (нахорги ош) по случаю свадьбы. Цвета — кобальт, бирюза, белый и охра, украшения — риштанское блюдо-ляган с узором и полосы изразцов. На первом экране на белом фоне вращается ляган; когда вы листаете вниз, он увеличивается на весь экран, фон становится кобальтовым, а в центре блюда появляется плов. Дальше текст приглашения, фото «Дастархана», отсчёт до плова в маленьких ляганах, порядок утра, адрес, дресс-код и ответы гостей; в конце — снова вращающийся ляган.",
    descriptionEn: "An invitation to a wedding morning plov (nahorgi osh). The colours are cobalt, turquoise, white and ochre, with a patterned Rishton platter (lagan) and tile stripes as decoration. On the first screen the platter spins on a white background; as you scroll down it grows to fill the screen, the background turns cobalt and plov appears in the middle of the platter. Then the invitation text, photos of the table, a countdown to the plov inside small platters, the morning schedule, the venue, the dress code and guest replies; at the end, the spinning platter once more.",
    palette: ["#1E4FA3", "#2BA3B8", "#F7F9FC", "#D9A441"],
    sample: { a: "Sardor", b: "Nilufar", date: "28 · 12 · 2026", venue: "Yo‘ldoshevlar xonadoni", time: "06:00" },
    theme: { bg: ["#1e4fa3", "#13224a"], ink: "#ffffff", accent: "#d9a441", soft: "#e7f4f7", script: "cormorant", color: "moviy" },
    fields: [
      { key: "hosts", type: "text", label: "Mezbonlar", placeholder: "Yo‘ldoshevlar oilasi", max: 60, hint: "Ochilishda, «Hurmat bilan» imzosida va oxirida chiqadi; bo‘sh qolsa — kuyov va kelin ismlari" },
      { key: "side", type: "select", label: "Taklif kim nomidan", options: ["Kuyov tomoni", "Kelin tomoni"], hint: "Taklif matni: «O‘g‘limiz …» yoki «Qizimiz …»; tanlanmasa — kuyov tomoni" },
      {
        key: "program",
        type: "list",
        label: "Tong tartibi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Xatmi Qur’on va duo", max: 40 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Milliy uslub", "Klassik", "Erkin"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Do‘ppi, chopon yoki milliy naqshli kiyim bilan kelsangiz, dasturxon yanada chiroyli bo‘ladi.", max: 160 },
    ],
  },
  {
    number: 26,
    slug: "oltin",
    name: "Oltin",
    ceremony: "tugilgan-kun",
    ceremonies: ["tugilgan-kun"],
    style: "klassik",
    priceOld: 249000,
    price: 199000,
    featured: false,
    description: "Yubiley va tug‘ilgan kun uchun taklifnoma. Ranglari — qora, oltin va oq. Ochilishda qorong‘ida oltin halqa chiziladi va ichida yosh raqami chiqadi; sahifani pastga surganingizda halqa kengayadi, oltin barglar sochiladi. Keyin katta oltin raqam, arka ichidagi surat va ism, taklif matni, «Hayot yo‘li» — muhim yillar, xotira suratlari, sanoq, kecha dasturi, manzil, dress-kod va mehmonlar javobi; oxirida oila surati va yana yaltiragan raqam.",
    descriptionRu: "Приглашение на юбилей и день рождения. Цвета — чёрный, золото и белый. На первом экране в темноте рисуется золотое кольцо, а внутри появляется число лет; когда вы листаете страницу вниз, кольцо расходится, золотые листья разлетаются. Дальше большая золотая цифра, фото в арке и имя, текст приглашения, «Жизненный путь» — важные годы, фото-воспоминания, отсчёт, программа вечера, адрес, дресс-код и ответы гостей; в конце семейное фото и снова сияющая цифра.",
    descriptionEn: "An invitation for a jubilee or birthday. The colours are black, gold and white. On the first screen a gold ring is drawn in the dark and the age appears inside it; as you scroll down, the ring widens and gold leaves scatter. Then a large gold number, the photo in an arch and the name, the invitation text, a “Life story” of key years, memory photos, a countdown, the evening’s schedule, the venue, the dress code and guest replies; at the end a family photo and the number shining again.",
    palette: ["#0B0B0C", "#C7943D", "#FADB8C", "#FFFFFF"],
    sample: { a: "Abdulla Karimov", date: "15 · 03 · 2027", venue: "«Grand Palace» to‘yxonasi", time: "18:00" },
    theme: { bg: ["#1a1714", "#0b0b0c"], ink: "#ffffff", accent: "#d9b066", soft: "#fadb8c", script: "cormorant", color: "oltin" },
    fields: [
      { key: "age", type: "number", label: "Nechanchi yosh", placeholder: "60", max: 3, hint: "Ixtiyoriy · katta oltin raqam bo‘lib chiqadi; bo‘sh qolsa — raqam o‘rnida ismning birinchi harfi" },
      { key: "host", type: "text", label: "Taklif qiluvchi", placeholder: "Karimovlar oilasi", max: 60, hint: "Ixtiyoriy · to‘ldirilsa — taklif shu nomdan («biz»), ochilishda va oxirida chiqadi; bo‘sh qolsa — yubilyarning o‘zi nomidan" },
      { key: "sign", type: "text", label: "Imzo", placeholder: "farzandlari va nabiralari", max: 60, hint: "Ixtiyoriy · taklif matni ostida «Hurmat bilan,» dan keyin; bo‘sh qolsa — taklif qiluvchi yoki yubilyar ismi" },
      {
        key: "life",
        type: "list",
        label: "Hayot yo‘li",
        min: 0,
        max: 6,
        item: {
          year: { type: "text", label: "Yil", required: true, placeholder: "1966", max: 12 },
          text: { type: "text", label: "Voqea", required: true, placeholder: "Samarqandda tavallud topdi", max: 50 },
        },
      },
      { key: "cap1", type: "text", label: "Xotira · 1 izohi", placeholder: "1991 · To‘y kuni", max: 40, hint: "Ixtiyoriy · «Xotiralar» bo‘limidagi 2-surat ostida" },
      { key: "cap2", type: "text", label: "Xotira · 2 izohi", placeholder: "1998 · Farzandlar bilan", max: 40, hint: "Ixtiyoriy · 3-surat ostida" },
      { key: "cap3", type: "text", label: "Xotira · 3 izohi", placeholder: "2024 · Nabiralar davrasida", max: 40, hint: "Ixtiyoriy · 4-surat ostida" },
      {
        key: "program",
        type: "list",
        label: "Kecha dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Mehmonlarni kutib olish", max: 40 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Kechki libos", "Klassik", "Milliy", "Ixtiyoriy"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Erkaklar uchun kostyum, ayollar uchun kechki ko‘ylak. Oltin rangli aksent — ayni muddao.", max: 160 },
    ],
  },
  {
    number: 27,
    slug: "xotira",
    name: "Xotira",
    ceremony: "tugilgan-kun",
    ceremonies: ["tugilgan-kun"],
    style: "minimal",
    priceOld: 249000,
    price: 199000,
    featured: false,
    description: "Yubiley va tug‘ilgan kun uchun suratlarga boy taklifnoma. Ranglari — oq, kulrang, ko‘mir va bordo. Ochilishda eski suratlar birin-ketin stol ustiga tushib, taxlam bo‘ladi va ostida yosh raqami yoziladi; sahifani pastga surganingizda yuqoridagi surat kattalashib, yubilyarning portretiga aylanadi. Keyin ism, taklif matni, «Yillar» — har yilning surati qora-oqdan rangliga o‘tadi, sanoq, kecha dasturi, manzil, dress-kod va mehmonlar javobi; oxirida butun ekranda katta oila surati.",
    descriptionRu: "Приглашение на юбилей и день рождения с большим количеством фотографий. Цвета — белый, серый, графит и бордо. На первом экране старые фотографии одна за другой ложатся стопкой, а под ними пишется число лет; когда вы листаете страницу вниз, верхнее фото увеличивается и превращается в портрет юбиляра. Дальше имя, текст приглашения, «Годы» — фото каждого года из чёрно-белого становится цветным, отсчёт, программа вечера, адрес, дресс-код и ответы гостей; в конце — большое семейное фото на весь экран.",
    descriptionEn: "A photo-rich invitation for a jubilee or birthday. The colours are white, grey, charcoal and burgundy. On the first screen old photos drop one by one into a stack and the age is written beneath them; as you scroll down, the top photo grows and turns into a portrait of the guest of honour. Then the name, the invitation text, “Years” — each year’s photo turns from black-and-white to colour, a countdown, the evening’s schedule, the venue, the dress code and guest replies; at the end a full-screen photo of the whole family.",
    palette: ["#FFFFFF", "#EFEFF1", "#1F1C1C", "#5A1E2A"],
    sample: { a: "Saodat Yusupova", date: "22 · 03 · 2027", venue: "«Bahor» restorani", time: "18:00" },
    theme: { bg: ["#ffffff", "#efeff1"], ink: "#1f1c1c", accent: "#5a1e2a", soft: "#736e6e", script: "cormorant", color: "bordo" },
    fields: [
      { key: "age", type: "number", label: "Nechanchi yosh", placeholder: "70", max: 3, hint: "Ixtiyoriy · katta bordo raqam va muhrlarda chiqadi; bo‘sh qolsa — raqam o‘rnida ismning birinchi harfi" },
      { key: "host", type: "text", label: "Taklif qiluvchi", placeholder: "Yusupovlar oilasi", max: 60, hint: "Ixtiyoriy · to‘ldirilsa — taklif shu nomdan («biz»), oxirida chiqadi; bo‘sh qolsa — yubilyarning o‘zi nomidan" },
      { key: "sign", type: "text", label: "Imzo", placeholder: "farzandlari va nabiralari", max: 60, hint: "Ixtiyoriy · taklif matni ostida «Hurmat bilan,» dan keyin; bo‘sh qolsa — taklif qiluvchi yoki yubilyar ismi" },
      {
        key: "life",
        type: "list",
        label: "Yillar",
        min: 0,
        max: 4,
        item: {
          year: { type: "text", label: "Yil", required: true, placeholder: "1956", max: 12 },
          text: { type: "text", label: "Voqea", required: true, placeholder: "Toshkentda tavallud topdi", max: 50 },
        },
      },
      {
        key: "program",
        type: "list",
        label: "Kecha dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Mehmonlarni kutib olish", max: 40 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Bordo aksent", "Klassik", "Milliy", "Ixtiyoriy"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Bordo yoki to‘q qizil rangli libos, ro‘mol yoki galstuk — umumiy suratlar chiroyli chiqadi.", max: 160 },
    ],
  },
  {
    number: 28,
    slug: "gulshan",
    name: "Gulshan",
    ceremony: "tugilgan-kun",
    ceremonies: ["tugilgan-kun"],
    style: "romantik",
    priceOld: 249000,
    price: 199000,
    featured: false,
    description: "Yubiley va tug‘ilgan kun uchun gulli taklifnoma. Ranglari — zumrad yashil, oq, oltin va pushti gullar. Ochilishda gul to‘dasi ochiladi, ostida oltin halqa chiziladi va ichida yosh raqami chiqadi; sahifani pastga surganingizda halqa kattalashib, ichida yubilyarning portreti doira bo‘lib ochiladi. Keyin katta oltin raqam, ism, taklif matni, «Baxtli lahzalar» suratlari, sanoq, kecha dasturi, manzil, dress-kod va mehmonlar javobi; oxirida yana gul to‘dasi va «Sizni kutamiz!».",
    descriptionRu: "Цветочное приглашение на юбилей и день рождения. Цвета — изумрудно-зелёный, белый, золото и розовые цветы. На первом экране распускается букет, под ним рисуется золотое кольцо с числом лет; когда вы листаете страницу вниз, кольцо увеличивается и внутри кругом открывается портрет юбиляра. Дальше большая золотая цифра, имя, текст приглашения, фото «Счастливые моменты», отсчёт, программа вечера, адрес, дресс-код и ответы гостей; в конце снова букет и «Ждём вас!».",
    descriptionEn: "A floral invitation for a jubilee or birthday. The colours are emerald green, white, gold and pink flowers. On the first screen a bouquet blooms, a gold ring is drawn beneath it with the age inside; as you scroll down, the ring grows and a portrait of the guest of honour opens inside it as a circle. Then a large gold number, the name, the invitation text, “Happy moments” photos, a countdown, the evening’s schedule, the venue, the dress code and guest replies; at the end the bouquet again and “We look forward to seeing you!”.",
    palette: ["#0F4D3A", "#FFFFFF", "#C9A45C", "#E8B4A0"],
    sample: { a: "Malika Ahmedova", date: "05 · 04 · 2027", venue: "«Gulshan» restorani", time: "18:00" },
    theme: { bg: ["#0f4d3a", "#093528"], ink: "#ffffff", accent: "#c9a45c", soft: "#e8b4a0", script: "cormorant", color: "yashil" },
    fields: [
      { key: "age", type: "number", label: "Nechanchi yosh", placeholder: "55", max: 3, hint: "Ixtiyoriy · oltin medalyonda va katta oltin raqam bo‘lib chiqadi; bo‘sh qolsa — raqam o‘rnida ismning birinchi harfi" },
      { key: "host", type: "text", label: "Taklif qiluvchi", placeholder: "Ahmedovlar oilasi", max: 60, hint: "Ixtiyoriy · to‘ldirilsa — taklif shu nomdan («biz»), oxirida chiqadi; bo‘sh qolsa — yubilyarning o‘zi nomidan" },
      { key: "sign", type: "text", label: "Imzo", placeholder: "farzandlari", max: 60, hint: "Ixtiyoriy · taklif matni ostida «Hurmat bilan,» dan keyin; bo‘sh qolsa — taklif qiluvchi yoki yubilyar ismi" },
      {
        key: "program",
        type: "list",
        label: "Kecha dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Mehmonlarni kutib olish", max: 40 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Zumrad va pushti", "Klassik", "Milliy", "Ixtiyoriy"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Yashil yoki pushti rangdagi kechki libos — gullar bilan uyg‘un.", max: 160 },
    ],
  },
  {
    number: 29,
    slug: "archa",
    name: "Archa",
    ceremony: "korporativ",
    ceremonies: ["korporativ"],
    style: "zamonaviy",
    priceOld: 249000,
    price: 199000,
    featured: false,
    description: "Kompaniyaning Yangi yil bazmi uchun taklifnoma. Ranglari — to‘q ko‘k, oq, qizil va kumush, bezaklari — archa sharlari, qor uchqunlari, archa shoxi va sovg‘a qutilari. Sahifa ochilganda sharlar ipda yuqoridan tushib keladi va katta «2027» yozuvi chiqadi; pastga surganingizda sharlar yuqoriga tortib olinadi. Keyin jamoa surati, hamkasblarga murojaat, kun dasturi, «Jamoamiz bilan bir yil» suratlari, bazmgacha sanoq, sovg‘a almashinuvi, manzil, dress-kod va ishtirokni tasdiqlash anketasi; oxirida «Ko‘rishguncha, 2027!».",
    descriptionRu: "Приглашение на новогодний корпоратив компании. Цвета — тёмно-синий, белый, красный и серебро, украшения — ёлочные шары, снежинки, еловая ветка и подарочные коробки. При открытии страницы шары спускаются сверху на нитях и появляется крупная надпись «2027»; когда вы листаете вниз, шары поднимаются обратно. Дальше — фото команды, обращение к коллегам, программа дня, фото «Год вместе с командой», отсчёт до праздника, обмен подарками, адрес, дресс-код и анкета для подтверждения участия; в конце — «До встречи в 2027!».",
    descriptionEn: "An invitation to a company New Year party. The colours are deep navy, white, red and silver, with Christmas baubles, snowflakes, a fir branch and gift boxes as decoration. When the page opens, baubles drop down on their strings and a large “2027” appears; as you scroll down, the baubles are pulled back up. Then a team photo, a greeting to colleagues, the day’s schedule, “A year with our team” photos, a countdown to the party, the gift exchange, the venue, the dress code and an RSVP form; at the end, “See you in 2027!”.",
    palette: ["#0C1633", "#D92F38", "#C9D1DE", "#FFFFFF"],
    sample: { a: "Yangi yil bazmi", b: "Nova Tech", date: "26 · 12 · 2026", venue: "«Oq saroy» banket zali", time: "16:00" },
    theme: { bg: ["#16244d", "#0c1633"], ink: "#ffffff", accent: "#d92f38", soft: "#c9d1de", script: "cinzel", color: "moviy" },
    fields: [
      { key: "tagline", type: "text", label: "Qisqa izoh", placeholder: "Nova Tech jamoasi uchun yil yakunidagi jamoaviy bayram", max: 80, hint: "Ixtiyoriy · jamoa surati ostida; bo‘sh qolsa — «<kompaniya> jamoasi uchun yil yakunidagi jamoaviy bayram»" },
      { key: "sign", type: "text", label: "Imzo", placeholder: "Nova Tech rahbariyati", max: 60, hint: "Ixtiyoriy · taklif matni ostida; bo‘sh qolsa — «<kompaniya> rahbariyati»" },
      {
        key: "program",
        type: "list",
        label: "Kun dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Jamoaviy o‘yinlar", max: 40 },
          note: { type: "text", label: "Izoh", placeholder: "Bo‘limlar o‘rtasida kvest", max: 50 },
        },
      },
      { key: "giftLimit", type: "text", label: "Sovg‘a narxi", placeholder: "200 000 so‘mgacha", max: 30, hint: "Ixtiyoriy · «Sovg‘a almashinuvi» bo‘limi (Secret Santa); narx ham, izoh ham bo‘sh qolsa — bo‘lim chiqmaydi" },
      { key: "giftNote", type: "textarea", label: "Sovg‘a almashinuvi izohi", placeholder: "Har bir ishtirokchi bitta sovg‘a olib keladi. Kimga sovg‘a berishingizni tadbirdan bir hafta oldin bilib olasiz.", max: 200 },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Kumush va qizil", "Smart casual", "Black tie", "Erkin uslub"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Kechki kiyim: kumush yoki qizil rangdagi bitta aksent bilan.", max: 160 },
    ],
  },
  {
    number: 30,
    slug: "qirmiz",
    name: "Qirmiz",
    ceremony: "korporativ",
    ceremonies: ["korporativ"],
    style: "klassik",
    priceOld: 249000,
    price: 199000,
    featured: false,
    description: "Kompaniyaning yil yakuni bazmi uchun taklifnoma. Ranglari — qirmizi qizil, oq va oltin, bezaklari — archa gulchambari, Shchelkunchik o‘yinchog‘i, sovg‘a qutisi va oltin sharlar. Sahifa ochilganda gulchambar yuqoridan tushadi va oq karta chiqadi; pastga surganingizda karta tekislanadi, sana va vaqt ko‘rinadi, bezaklar chetdan kirib keladi. Keyin hamkasblarga murojaat va jamoa surati, kecha dasturi, «Bir yillik lahzalar» suratlari, bazmgacha sanoq, manzil, dress-kod va ishtirokni tasdiqlash anketasi; oxirida «Sizni kutamiz!».",
    descriptionRu: "Приглашение на итоговый вечер года в компании. Цвета — алый, белый и золото, украшения — еловая гирлянда, Щелкунчик, подарочная коробка и золотые шары. При открытии страницы сверху опускается гирлянда и появляется белая карточка; когда вы листаете вниз, карточка выравнивается, появляются дата и время, а украшения входят с краёв. Дальше — обращение к коллегам и фото команды, программа вечера, фото «Моменты года», отсчёт до праздника, адрес, дресс-код и анкета для подтверждения участия; в конце — «Ждём вас!».",
    descriptionEn: "An invitation to a company year-end party. The colours are crimson, white and gold, with a fir garland, a Nutcracker, a gift box and gold baubles as decoration. When the page opens, a garland comes down from the top and a white card appears; as you scroll down, the card straightens, the date and time appear and the decorations come in from the edges. Then a greeting to colleagues with a team photo, the evening’s schedule, “Moments of the year” photos, a countdown to the party, the venue, the dress code and an RSVP form; at the end, “See you there!”.",
    palette: ["#A3141F", "#780D14", "#C9A35C", "#FFFFFF"],
    sample: { a: "Yil yakuni bazmi", b: "Atlas Group", date: "27 · 12 · 2026", venue: "«Oq saroy» banket zali", time: "19:00" },
    theme: { bg: ["#b81a26", "#780d14"], ink: "#ffffff", accent: "#c9a35c", soft: "#f2dfc4", script: "cormorant", color: "qizil" },
    fields: [
      { key: "lead", type: "text", label: "Kartadagi qisqa matn", placeholder: "Bir yil davomida yonma-yon ishlagan jamoamiz bilan yil yakunini birga nishonlaylik.", max: 110, hint: "Ixtiyoriy · birinchi ekrandagi oq kartada, tadbir nomi ostida; bo‘sh qolsa — namunadagi matn" },
      {
        key: "program",
        type: "list",
        label: "Kecha dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Taqdirlash va lotereya", max: 40 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Qizil va oltin", "Klassik", "Smart casual", "Erkin uslub"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Kechki libos: qizil, qora yoki oltin rangdagi aksent bilan.", max: 160 },
    ],
  },
  {
    number: 31,
    slug: "ayoz",
    name: "Ayoz",
    ceremony: "korporativ",
    ceremonies: ["korporativ"],
    style: "zamonaviy",
    priceOld: 249000,
    price: 199000,
    featured: false,
    description: "Kompaniyaning Yangi yil bazmi uchun taklifnoma. Ranglari — binafsha, oq va pushti, bezaklari — yulduzli tungi osmon, qorli tepaliklar, archalar va kompaniya logotipi tushirilgan shisha archa shari. Sahifa ochilganda Ayoz bobo chanasi osmonga uchib kiradi va qor yog‘a boshlaydi; pastga surganingizda chana uzoqlashadi. Keyin hamkasblarga murojaat, sana va vaqt, jamoa surati, kecha dasturi, «Bir yillik lahzalar» suratlari, bazmgacha sanoq, manzil, dress-kod va ishtirokni tasdiqlash anketasi; oxirida shisha shar qorga tushadi.",
    descriptionRu: "Приглашение на новогодний корпоратив компании. Цвета — фиолетовый, белый и розовый, украшения — звёздное ночное небо, снежные холмы, ёлки и стеклянный ёлочный шар с логотипом компании. При открытии страницы в небо влетают сани Деда Мороза и начинает идти снег; когда вы листаете вниз, сани улетают вдаль. Дальше — обращение к коллегам, дата и время, фото команды, программа вечера, фото «Моменты года», отсчёт до праздника, адрес, дресс-код и анкета для подтверждения участия; в конце стеклянный шар опускается в снег.",
    descriptionEn: "An invitation to a company New Year party. The colours are purple, white and pink, with a starry night sky, snowy hills, fir trees and a glass Christmas bauble with the company logo as decoration. When the page opens, Father Frost’s sleigh flies into the sky and snow starts to fall; as you scroll down, the sleigh flies off into the distance. Then a greeting to colleagues, the date and time, a team photo, the evening’s schedule, “Moments of the year” photos, a countdown to the party, the venue, the dress code and an RSVP form; at the end the glass bauble drops into the snow.",
    palette: ["#3B2185", "#241052", "#E0245E", "#F3F0FB"],
    sample: { a: "Yangi yil bazmi", b: "Orion Soft", date: "30 · 12 · 2026", venue: "«Orion Hall» tadbirlar zali", time: "18:30" },
    theme: { bg: ["#5b3fa6", "#241052"], ink: "#ffffff", accent: "#e0245e", soft: "#cfc3ee", script: "cormorant", color: "moviy" },
    fields: [
      { key: "sign", type: "text", label: "Imzo", placeholder: "Orion Soft rahbariyati", max: 60, hint: "Ixtiyoriy · taklif matni ostida; bo‘sh qolsa — «<kompaniya> rahbariyati»" },
      {
        key: "program",
        type: "list",
        label: "Kecha dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Jamoaviy viktorina", max: 40 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Oq va binafsha", "Smart casual", "Black tie", "Erkin uslub"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Kechki kiyim: oq, kumush yoki binafsha rangda.", max: 160 },
    ],
  },
  {
    number: 32,
    slug: "poyezd",
    name: "Poyezd",
    ceremony: "korporativ",
    ceremonies: ["korporativ"],
    style: "klassik",
    priceOld: 249000,
    price: 199000,
    featured: false,
    description: "Kompaniyaning Yangi yil bazmi uchun «qishki ertak» taklifnomasi. Ranglari — tungi ko‘k, oq va oltin, bezaklari — oltin archa, qorli uychalar, osma vagon va o‘yinchoq poyezd. Ochilishda qor sekin yog‘adi, oltin sarlavha ustidan yorug‘lik o‘tadi; pastga surganingizda qishloq qatlamlari har xil tezlikda ko‘tariladi va o‘yinchoq poyezd kirib keladi. Keyin hamkasblarga murojaat, jamoa surati, kecha dasturi, «Bir yillik lahzalar» suratlari, bazmgacha sanoq, manzil, dress-kod va ishtirokni tasdiqlash anketasi; oxirida «Sizni kutamiz!».",
    descriptionRu: "Приглашение «зимняя сказка» на новогодний корпоратив компании. Цвета — ночной синий, белый и золото, украшения — золотая ёлка, заснеженные домики, канатная кабинка и игрушечный поезд. При открытии медленно идёт снег, по золотому заголовку пробегает блик; когда вы листаете вниз, слои деревни поднимаются с разной скоростью и въезжает игрушечный поезд. Дальше — обращение к коллегам, фото команды, программа вечера, фото «Моменты года», отсчёт до праздника, адрес, дресс-код и анкета для подтверждения участия; в конце — «Ждём вас!».",
    descriptionEn: "A “winter fairy tale” invitation to a company New Year party. The colours are night blue, white and gold, with a golden fir tree, snowy cottages, a cable car and a toy train as decoration. When the page opens, snow falls slowly and a gleam runs across the gold title; as you scroll down, the layers of the village rise at different speeds and a toy train rolls in. Then a greeting to colleagues, a team photo, the evening’s schedule, “Moments of the year” photos, a countdown to the party, the venue, the dress code and an RSVP form; at the end, “We look forward to seeing you!”.",
    palette: ["#2B4087", "#172452", "#D9B26B", "#EDF2FC"],
    sample: { a: "Qishki ertak", b: "Lumen Group", date: "28 · 12 · 2026", venue: "«Bog‘i Eram» banket zali", time: "18:00" },
    theme: { bg: ["#2b4087", "#172452"], ink: "#ffffff", accent: "#d9b26b", soft: "#edf2fc", script: "cormorant", color: "moviy" },
    fields: [
      { key: "tagline", type: "text", label: "Qisqa izoh", placeholder: "Lumen Group yil yakuni bazmi", max: 60, hint: "Ixtiyoriy · birinchi ekranda sana ostida; bo‘sh qolsa — «<kompaniya> yil yakuni bazmi»" },
      {
        key: "highlights",
        type: "list",
        label: "Kecha mazmuni",
        min: 0,
        max: 3,
        item: {
          text: { type: "text", label: "Nima bo‘ladi", required: true, placeholder: "Jamoaviy o‘yinlar", max: 22 },
        },
      },
      { key: "sign", type: "text", label: "Imzo", placeholder: "Lumen Group rahbariyati", max: 60, hint: "Ixtiyoriy · taklif matni ostida; bo‘sh qolsa — «<kompaniya> rahbariyati»" },
      {
        key: "program",
        type: "list",
        label: "Kecha dasturi",
        min: 0,
        max: 8,
        item: {
          time: { type: "time", label: "Vaqt", required: true },
          title: { type: "text", label: "Nomi", required: true, placeholder: "Kutib olish va issiq choy", max: 40 },
        },
      },
      { key: "dressCode", type: "select", label: "Dress-kod", options: ["Qishki nafislik", "Issiq sviter", "Smart casual", "Erkin uslub"], hint: "Ixtiyoriy" },
      { key: "dressNote", type: "text", label: "Dress-kod izohi", placeholder: "Oq, kumush yoki oltin rangdagi kechki kiyim.", max: 160 },
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
/** Shablon sahifasidagi imkoniyatlar: tug‘ilgan kun shablonlarida «to‘y» emas — «Bayramga qadar sanoq»; korporativ tadbirda — «Tadbirgacha sanoq», «Tadbir dasturi» */
export const featuresFor = (t: Pick<Template, "ceremony" | "ceremonies">) => {
  const kinds = tplKinds(t);
  if (kinds.every((c) => c === "korporativ"))
    return templateFeatures.map((f) => (f === "To‘yga qadar sanoq" ? "Tadbirgacha sanoq" : f === "Marosim dasturi" ? "Tadbir dasturi" : f));
  return tplCeremonies(t).every((c) => c === "tugilgan-kun") ? templateFeatures.map((f) => (f === "To‘yga qadar sanoq" ? "Bayramga qadar sanoq" : f)) : templateFeatures;
};

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
  /** Bilet (korporativ) — spikerlar suratlari tartib bilan (1-surat — 1-spiker…); surat bo‘lmasa — ism bosh harflari. Zal surati — shablonniki */
  bilet: [
    { title: "Spiker · 1", where: "«Spikerlar» — 1-spiker surati (bo‘lmasa — ism bosh harflari)" },
    { title: "Spiker · 2", where: "«Spikerlar» — 2-spiker surati" },
    { title: "Spiker · 3", where: "«Spikerlar» — 3-spiker surati" },
    { title: "Spiker · 4", where: "«Spikerlar» — 4-spiker surati" },
    { title: "Spiker · 5", where: "«Spikerlar» — 5-spiker surati" },
    { title: "Spiker · 6", where: "«Spikerlar» — 6-spiker surati" },
  ],
  /** Taqvim (korporativ forum) — spikerlar suratlari tartib bilan (1-surat — 1-spiker…); surat bo‘lmasa — ism bosh harflari. Zal va fon suratlari — shablonniki */
  taqvim: [
    { title: "Spiker · 1", where: "«Spikerlar» — 1-spiker surati (bo‘lmasa — ism bosh harflari)" },
    { title: "Spiker · 2", where: "«Spikerlar» — 2-spiker surati" },
    { title: "Spiker · 3", where: "«Spikerlar» — 3-spiker surati" },
    { title: "Spiker · 4", where: "«Spikerlar» — 4-spiker surati" },
    { title: "Spiker · 5", where: "«Spikerlar» — 5-spiker surati" },
    { title: "Spiker · 6", where: "«Spikerlar» — 6-spiker surati" },
  ],
  /** Sammit (korporativ sammit) — spikerlar suratlari tartib bilan (1-surat — 1-spiker…); surat bo‘lmasa — ism bosh harflari. Zal surati — shablonniki */
  sammit: [
    { title: "Spiker · 1", where: "«Spikerlar» — 1-spiker surati (bo‘lmasa — ism bosh harflari)" },
    { title: "Spiker · 2", where: "«Spikerlar» — 2-spiker surati" },
    { title: "Spiker · 3", where: "«Spikerlar» — 3-spiker surati" },
    { title: "Spiker · 4", where: "«Spikerlar» — 4-spiker surati" },
    { title: "Spiker · 5", where: "«Spikerlar» — 5-spiker surati" },
    { title: "Spiker · 6", where: "«Spikerlar» — 6-spiker surati" },
  ],
  /** Tong (nahorgi osh) — bo‘sh slotlar o‘rnida shablonning o‘z suratlari (qozon, sabzi, choy va non, choyxona zali); lagan surati — shablonniki */
  tong: [
    { title: "Surat · 1", where: "«Tong dasturxoni» — katta surat. Bo‘lmasa — olovdagi qozon surati" },
    { title: "Surat · 2", where: "«Tong dasturxoni» — chapdagi kichik surat. Bo‘lmasa — sabzi surati" },
    { title: "Surat · 3", where: "«Tong dasturxoni» — o‘ngdagi kichik surat. Bo‘lmasa — choy va non surati" },
    { title: "Surat · 4", where: "«Manzil» — osh beriladigan joy surati. Bo‘lmasa — choyxona zali surati" },
  ],
  /** Qozon (sunnat to‘yi nahorgi oshi) — bo‘sh slotlar o‘rnida shablonning o‘z suratlari (olovdagi qozon, ziravorlar, guruch, hovli); plitkadagi osh surati — shablonniki */
  qozon: [
    { title: "Surat · 1", where: "«Tayyorgarlik» — katta surat. Bo‘lmasa — olovdagi qozon surati" },
    { title: "Surat · 2", where: "«Tayyorgarlik» — chapdagi kichik surat. Bo‘lmasa — ziravorlar surati" },
    { title: "Surat · 3", where: "«Tayyorgarlik» — o‘ngdagi kichik surat. Bo‘lmasa — qozondagi guruch surati" },
    { title: "Surat · 4", where: "«Manzil» — osh beriladigan joy surati. Bo‘lmasa — hovli surati" },
  ],
  /** Lagan (nikoh to‘yi nahorgi oshi) — bo‘sh slotlar o‘rnida shablonning o‘z suratlari (Rishton sopollari, choynak, non, dasturxon); lagan markazidagi osh surati — shablonniki */
  lagan: [
    { title: "Surat · 1", where: "«Dasturxon» — katta surat. Bo‘lmasa — Rishton sopollari surati" },
    { title: "Surat · 2", where: "«Dasturxon» — chapdagi kichik surat. Bo‘lmasa — choynak va piyola surati" },
    { title: "Surat · 3", where: "«Dasturxon» — o‘ngdagi kichik surat. Bo‘lmasa — non surati" },
    { title: "Surat · 4", where: "«Manzil» — osh beriladigan joy surati. Bo‘lmasa — dasturxon surati" },
  ],
  /** Sovg‘a (tug‘ilgan kun) — bo‘sh slotlar: hero’da ravoq ichida sovg‘a qutisi, «Yangi bob» — chiqmaydi, manzil — restoran surati */
  sovga: [
    { title: "Asosiy surat", where: "Sharlar ostidagi ravoq ichida. Bo‘lmasa — ravoqda sovg‘a qutisi" },
    { title: "Surat · 2", where: "«Yangi bob» — kvadrat surat. Bo‘lmasa — bu bo‘lim chiqmaydi" },
    { title: "Surat · 3", where: "«Manzil» — restoran surati. Bo‘lmasa — shablonning restoran surati" },
  ],
  /** Malika (tug‘ilgan kun) — bo‘sh slotlar: hero’da ramkada gerb va ism harfi, choy stoli bo‘limi — chiqmaydi, manzil — bal zali */
  malika: [
    { title: "Asosiy surat", where: "Ochilishdan keyingi katta portret. Bo‘lmasa — ramkada marvarid gerb va ism harfi" },
    { title: "Surat · 2", where: "Kalendardan keyingi to‘liq enli surat. Bo‘lmasa — bu bo‘lim chiqmaydi" },
    { title: "Surat · 3", where: "«Manzil» — ravoqli surat. Bo‘lmasa — shablonning bal zali surati" },
  ],
  /** Sham (universal tug‘ilgan kun) — bo‘sh slotlar: hero’da ramkada yonib turgan sham, 2- va 3-surat — shablonning tort va terrassa suratlari */
  sham: [
    { title: "Asosiy surat", where: "Katta yosh raqami yonidagi surat. Bo‘lmasa — ramkada yonib turgan sham" },
    { title: "Surat · 2", where: "«Yillar — xotira» bo‘limidagi kvadrat surat. Bo‘lmasa — shablonning tort surati" },
    { title: "Surat · 3", where: "«Manzil» — joy surati. Bo‘lmasa — shablonning terrassa surati" },
  ],
  /** Koinot (o‘g‘il bola tug‘ilgan kuni) — bo‘sh slotlar: hero illyuminatorida kosmonavt, 2-surat — shablonning bayram zali surati */
  koinot: [
    { title: "Asosiy surat", where: "Birinchi ekran — illyuminator (dumaloq oyna) ichidagi surat. Bo‘lmasa — illyuminatorda kosmonavt" },
    { title: "Surat · 2", where: "«Manzil» — bayram joyi surati. Bo‘lmasa — shablonning bayram zali surati" },
  ],
  /** Marvarid (qizlar tug‘ilgan kuni) — bo‘sh slotlar: hero arkasida ismning birinchi harfi, 2-surat — shablonning kafe surati */
  marvarid: [
    { title: "Asosiy surat", where: "Birinchi bo‘lim — arka ichidagi surat. Bo‘lmasa — arkada ismning birinchi harfi" },
    { title: "Surat · 2", where: "«Manzil» — bayram joyi surati. Bo‘lmasa — shablonning kafe surati" },
  ],
  /** Oltin (yubiley) — suratlar ketma-ket: arka, uchta xotira, manzil, final. Bo‘sh slotlar: arkada oltin barglar, «Xotiralar» — bo‘lim
   * yo‘qoladi, manzil — shablonning bayram zali, final — suratsiz */
  oltin: [
    { title: "Asosiy surat", where: "Birinchi bo‘lim — katta raqam ostidagi arka ichida. Bo‘lmasa — arkada oltin barglar" },
    { title: "Xotira · 1", where: "«Xotiralar» — katta surat. Xotira suratlari bo‘lmasa, bo‘lim ko‘rinmaydi" },
    { title: "Xotira · 2", where: "«Xotiralar» — kichik surat" },
    { title: "Xotira · 3", where: "«Xotiralar» — kichik surat" },
    { title: "Surat · 5", where: "«Manzil» — bayram joyi surati. Bo‘lmasa — shablonning bayram zali surati" },
    { title: "Oila surati", where: "Oxirgi bo‘lim — «Sizni kutamiz!» ustida. Bo‘lmasa — suratsiz" },
  ],
  /** Xotira (yubiley) — suratlar ketma-ket: portret, «Yillar» (4 ta, yillar tartibida), manzil, final. Bo‘sh slotlar: portret — kulrang
   * panel, «Yillar» — suratsiz qator (yil va voqea), manzil — shablonning bayram zali, final — suratsiz (muhr bilan) */
  xotira: [
    { title: "Portret", where: "Birinchi bo‘lim — katta raqam ostidagi portret; ochilishda taxlamdagi surat shunga aylanadi. Bo‘lmasa — kulrang panel" },
    { title: "Yillar · 1", where: "«Yillar» — birinchi yil surati (ochilishdagi taxlamda ham). Bo‘lmasa — qator suratsiz" },
    { title: "Yillar · 2", where: "«Yillar» — ikkinchi yil surati" },
    { title: "Yillar · 3", where: "«Yillar» — uchinchi yil surati" },
    { title: "Yillar · 4", where: "«Yillar» — to‘rtinchi yil surati" },
    { title: "Surat · 6", where: "«Manzil» — bayram joyi surati. Bo‘lmasa — shablonning bayram zali surati" },
    { title: "Katta oila", where: "Oxirgi bo‘lim — butun ekranda, «Sizni kutamiz!» ostida. Bo‘lmasa — suratsiz" },
  ],
  /** Gulshan (yubiley) — suratlar: portret (medalyon), «Baxtli lahzalar» (3 ta), manzil. Bo‘sh slotlar: portret — medalyon ichida
   * gul to‘dasi, lahzalar — bo‘lim yo‘qoladi (1 ta — katta, 2 ta — ikkita ark), manzil — shablonning bayram zali */
  gulshan: [
    { title: "Portret", where: "Birinchi bo‘lim — oltin medalyon ichida (ochilishda doira bo‘lib ochiladi). Bo‘lmasa — medalyonda gul to‘dasi" },
    { title: "Lahza · 1", where: "«Baxtli lahzalar» — katta surat. Lahza suratlari bo‘lmasa, bo‘lim ko‘rinmaydi" },
    { title: "Lahza · 2", where: "«Baxtli lahzalar» — kichik surat (ark)" },
    { title: "Lahza · 3", where: "«Baxtli lahzalar» — kichik surat (ark)" },
    { title: "Surat · 5", where: "«Manzil» — bayram joyi surati. Bo‘lmasa — shablonning bayram zali surati" },
  ],
  /** Archa (korporativ Yangi yil bazmi) — suratlar: jamoa surati (hero), «Jamoamiz bilan bir yil» (3 ta), manzil. Bo‘sh slotlar:
   * hero — to‘q ko‘k panelda yil, archa shoxi va sovg‘alar; galereya — bo‘lim yo‘qoladi (1 ta — katta, 2 ta — ikkita tik); manzil — shablonning bazm zali */
  archa: [
    { title: "Jamoa surati", where: "Birinchi bo‘lim — «Yangi yil bazmi» ustidagi katta surat. Bo‘lmasa — to‘q ko‘k panelda yil va archa bezaklari" },
    { title: "Galereya · 1", where: "«Jamoamiz bilan bir yil» — katta surat. Galereya suratlari bo‘lmasa, bo‘lim ko‘rinmaydi" },
    { title: "Galereya · 2", where: "«Jamoamiz bilan bir yil» — kichik tik surat" },
    { title: "Galereya · 3", where: "«Jamoamiz bilan bir yil» — kichik tik surat" },
    { title: "Surat · 5", where: "«Manzil» — bazm joyi surati. Bo‘lmasa — shablonning bazm zali surati" },
  ],
  /** Qirmiz (korporativ yil yakuni bazmi) — suratlar: jamoa surati (bosma rasm), «Bir yillik lahzalar» (3 ta), manzil. Bo‘sh slotlar:
   * jamoa — bosma kartochkada sovg‘a qutisi va yil; lahzalar — bo‘lim yo‘qoladi (1 ta — katta, 2 ta — ikkita kichik); manzil — shablonning bazm zali */
  qirmiz: [
    { title: "Jamoaviy surat", where: "«Hurmatli hamkasblar!» ostidagi bosma rasm. Bo‘lmasa — kartochkada sovg‘a qutisi va yil" },
    { title: "Lahza · 1", where: "«Bir yillik lahzalar» — katta surat. Bu suratlar bo‘lmasa, bo‘lim ko‘rinmaydi" },
    { title: "Lahza · 2", where: "«Bir yillik lahzalar» — kichik surat" },
    { title: "Lahza · 3", where: "«Bir yillik lahzalar» — kichik surat (o‘ngda)" },
    { title: "Surat · 5", where: "«Manzil» — bazm zali surati. Bo‘lmasa — shablonning bazm zali surati" },
  ],
  /** Ayoz (korporativ Yangi yil bazmi) — suratlar (ketma-ket yuklanadi, muhimlari oldinda): jamoa surati (arka), «Bir yillik lahzalar»
   * (3 ta), manzil, logotip (shisha shar ichida). Bo‘sh slotlar: jamoa / lahzalar — bo‘lim yo‘qoladi (1 ta — katta, 2 ta — ikkita ark);
   * manzil — shablonning bazm zali; logotip — kompaniya nomi */
  ayoz: [
    { title: "Jamoa surati", where: "Arka ichidagi katta surat. Bo‘lmasa, bo‘lim ko‘rinmaydi" },
    { title: "Lahza · 1", where: "«Bir yillik lahzalar» — katta surat. Lahza suratlari bo‘lmasa, bo‘lim ko‘rinmaydi" },
    { title: "Lahza · 2", where: "«Bir yillik lahzalar» — kichik surat (ark)" },
    { title: "Lahza · 3", where: "«Bir yillik lahzalar» — kichik surat (ark)" },
    { title: "Surat · 5", where: "«Manzil» — bazm joyi surati. Bo‘lmasa — shablonning bazm zali surati" },
    { title: "Logotip", where: "Shisha shar ichida. Bo‘lmasa — kompaniya nomi" },
  ],
  /** Poyezd (korporativ Yangi yil bazmi, «qishki ertak») — suratlar: jamoa surati (oltin ramkada), «Bir yillik lahzalar» (3 ta), manzil.
   * Bo‘sh slotlar: jamoa / lahzalar — bo‘lim yo‘qoladi (1 ta — katta, 2 ta — ikkita tik); manzil — shablonning bazm zali */
  poyezd: [
    { title: "Jamoa surati", where: "Taklif matnidan keyingi oltin ramkadagi katta surat. Bo‘lmasa, bo‘lim ko‘rinmaydi" },
    { title: "Lahza · 1", where: "«Bir yillik lahzalar» — katta surat. Lahza suratlari bo‘lmasa, bo‘lim ko‘rinmaydi" },
    { title: "Lahza · 2", where: "«Bir yillik lahzalar» — kichik tik surat" },
    { title: "Lahza · 3", where: "«Bir yillik lahzalar» — kichik tik surat" },
    { title: "Surat · 5", where: "«Manzil» — bazm joyi surati. Bo‘lmasa — shablonning bazm zali surati" },
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
