/** Marvarid shabloni (qizlar tug‘ilgan kuni — coquette uslubi: atlas bant, marvarid shoda, lola, yurak tort) — namuna matnlar (Figma 538:12617 mobil / 541:12636 laptop) */
import type { ProgramItem } from "../anor/data";

export const P = "/templates/marvarid";

export type MarvaridDemo = {
  address: string;
  program: ProgramItem[];
  dressCode: string;
  age: string;
};

/** Namuna — Figma’dagi matnlar (ism, joy nomi, sana — shablon `sample` dan) */
export const MARVARID_DEMO: MarvaridDemo = {
  address: "Toshkent, Mirobod tumani, Shota Rustaveli ko‘chasi, 22",
  program: [
    { time: "18:00", title: "Kutib olish", note: "Welcome drink va fotozona" },
    { time: "18:30", title: "Kechki ziyofat", note: "Mazali taomlar va iliq suhbatlar" },
    { time: "19:30", title: "Tort va tilaklar", note: "Shamlarni birga puflaymiz" },
    { time: "20:00", title: "Raqs va o‘yinlar", note: "Sevimli qo‘shiqlar ostida" },
  ],
  dressCode: "Pushti va oq",
  age: "20",
};

export const MARVARID_DEMO_RU: MarvaridDemo = {
  address: "г. Ташкент, Мирабадский район, улица Шота Руставели, 22",
  program: [
    { time: "18:00", title: "Встреча гостей", note: "Welcome drink и фотозона" },
    { time: "18:30", title: "Праздничный ужин", note: "Вкусные блюда и тёплые разговоры" },
    { time: "19:30", title: "Торт и пожелания", note: "Вместе задуваем свечи" },
    { time: "20:00", title: "Танцы и игры", note: "Под любимые песни" },
  ],
  dressCode: "Pushti va oq",
  age: "20",
};

export const MARVARID_DEMO_EN: MarvaridDemo = {
  address: "22 Shota Rustaveli Street, Mirobod District, Tashkent",
  program: [
    { time: "18:00", title: "Welcome", note: "Welcome drinks and a photo corner" },
    { time: "18:30", title: "Dinner", note: "Delicious food and warm conversations" },
    { time: "19:30", title: "Cake and wishes", note: "We blow out the candles together" },
    { time: "20:00", title: "Dancing and games", note: "To our favourite songs" },
  ],
  dressCode: "Pushti va oq",
  age: "20",
};

/**
 * Taklif matni (mijoz yozmagan yoki server standart matni qolgan bo‘lsa). Figma matni — bayram egasining o‘zi nomidan («men»).
 * `host` (taklif qiluvchi, masalan, ota-ona) kiritilgan bo‘lsa — «biz» nomidan (ism bilan). Yoshga bog‘lanmagan.
 */
export const MSG = "Tug‘ilgan kunimni eng yaqin dugonalarim va do‘stlarim bilan nishonlamoqchiman.";
export const MSG_HOST = "{name}ning tug‘ilgan kunini eng yaqin insonlarimiz bilan nishonlamoqchimiz.";
export const MSG_WE = "Tug‘ilgan kunni eng yaqin insonlarimiz bilan nishonlamoqchimiz.";
/** Figma’dagi ikkinchi xatboshi (har doim) */
export const MSG2 = "Shu kechada yonimda bo‘lsangiz, men uchun eng katta sovg‘a bo‘ladi.";
export const MSG2_WE = "Shu kechada yonimizda bo‘lsangiz, biz uchun eng katta sovg‘a bo‘ladi.";

/**
 * Dress-kod (Figma «Marvarid / Dress-kod»: Turi=Pushti va oq | Nafis kechki) — karta: «Kiyinish uslubi», turi (kursiv) va bitta izoh.
 * Mijoz `dressNote` yozsa — o‘sha matn.
 */
export const DRESS_TEXT: Record<string, string> = {
  "Pushti va oq": "Pushti, oq yoki sut rangidagi liboslar — bantlar bilan bo‘lsa, yanada yaxshi.",
  "Nafis kechki": "Nafis kechki libos yoki chiroyli ko‘ylak, qulay poyabzal.",
  Bayramona: "Bayramona, yorqin kiyim — kechamizga ko‘tarinki kayfiyat olib keling.",
  Ixtiyoriy: "Maxsus talab yo‘q — o‘zingizga qulay, bayramona kiyimda keling.",
};
