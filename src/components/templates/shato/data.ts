/** Shato shabloni — namuna matnlar va yordamchilar (Figma 299:4873 mobil / 303:4942 laptop) */
import type { ProgramItem } from "../anor/data";

export const P = "/templates/shato";

export type ShatoDemo = {
  message: string;
  venueTitle: string;
  address: string;
  program: ProgramItem[];
  dressCode: string;
  gifts: string;
  flowers: string;
  contact: string;
  phone: string;
  telegram: string;
  quote: string;
};

export const SHATO_DEMO: ShatoDemo = {
  message:
    "Yaqinda hayotimizni butunlay o‘zgartiradigan kun keladi — biz oila bo‘lamiz. Bu go‘zal lahzani siz bilan birga baham ko‘rishni juda istaymiz.\n\nKulgu, quchoqlar va qadahlar bilan to‘la bu kunni yillar o‘tib ham iliq eslaydigan xotiraga aylantiraylik.",
  venueTitle: "Chateau Blanc restorani",
  address: "Toshkent sh., Bog‘ishamol ko‘chasi, 12",
  program: [
    { time: "16:00", title: "Mehmonlar yig‘ilishi", note: "Qadrdonlarimiz bilan uchrashamiz" },
    { time: "17:00", title: "Nikoh marosimi", note: "Oilaviy hikoyamizning boshlanishi" },
    { time: "18:00", title: "Bazm", note: "Muhabbatimizni birga nishonlaymiz" },
    { time: "21:00", title: "To‘y torti", note: "Kunning eng shirin lahzasi" },
  ],
  dressCode: "Klassik",
  gifts: "Yoningizda bo‘lishingiz — biz uchun eng katta sovg‘a. Agar xohlasangiz, oilaviy orzuimizga hissa qo‘shishingiz mumkin.",
  flowers: "Guldasta o‘rniga iliq tilaklaringizni olib keling — ular bilan birga yangi hayot sayohatiga chiqamiz.",
  contact: "To‘y kuni barcha savollar bo‘yicha tashkilotchimiz Malikaga murojaat qilishingiz mumkin.",
  phone: "+998 90 123 45 67",
  telegram: "shohnoma_uz",
  quote: "Sevgi — bu bir-biriga emas, balki birga bir tomonga qarash.",
};

/** Namuna — ruscha */
export const SHATO_DEMO_RU: ShatoDemo = {
  message:
    "Скоро наступит день, который изменит нашу жизнь, — мы станем семьёй. Нам очень хочется разделить этот прекрасный момент с вами.\n\nДавайте превратим этот день, полный смеха, объятий и бокалов, в воспоминание, которое будет согревать спустя годы.",
  venueTitle: "Ресторан Chateau Blanc",
  address: "г. Ташкент, ул. Богишамол, 12",
  program: [
    { time: "16:00", title: "Сбор гостей", note: "Встречаемся с самыми близкими" },
    { time: "17:00", title: "Церемония никаха", note: "Начало нашей семейной истории" },
    { time: "18:00", title: "Банкет", note: "Вместе празднуем нашу любовь" },
    { time: "21:00", title: "Свадебный торт", note: "Самый сладкий момент дня" },
  ],
  dressCode: "Klassik",
  gifts: "Ваше присутствие — самый большой подарок для нас. Если захотите, можете внести вклад в нашу семейную мечту.",
  flowers: "Вместо букетов принесите тёплые пожелания — с ними мы отправимся в новую жизнь.",
  contact: "В день свадьбы по всем вопросам можно обращаться к нашему организатору Малике.",
  phone: "+998 90 123 45 67",
  telegram: "shohnoma_uz",
  quote: "Любить — это не смотреть друг на друга, а смотреть вместе в одном направлении.",
};

export const SHATO_DEMO_EN: ShatoDemo = {
  message:
    "Soon comes the day that will change our lives — we are becoming a family. We would love to share this beautiful moment with you.\n\nLet’s make this day of laughter, hugs and raised glasses a memory we will warmly recall for years to come.",
  venueTitle: "Chateau Blanc Restaurant",
  address: "12 Bogishamol Street, Tashkent",
  program: [
    { time: "16:00", title: "Guests arrive", note: "Meeting our dearest people" },
    { time: "17:00", title: "Nikah ceremony", note: "The start of our family story" },
    { time: "18:00", title: "Celebration", note: "Celebrating our love together" },
    { time: "21:00", title: "Wedding cake", note: "The sweetest moment of the day" },
  ],
  dressCode: "Klassik",
  gifts: "Your presence is the greatest gift to us. If you wish, you can contribute to our family dream.",
  flowers: "Instead of flowers, bring your warm wishes — we will carry them into our new life.",
  contact: "On the wedding day, please contact our organiser Malika with any questions.",
  phone: "+998 90 123 45 67",
  telegram: "shohnoma_uz",
  quote: "Love is not looking at each other, but looking together in the same direction.",
};

const ICONS: [RegExp, string][] = [
  [/kutib|yig‘il|yig'il|mehmon|sharbat|qadah|welcome|встреч|сбор|гост|напит|бокал|фуршет|arriv|drink|welcome/i, "qadahlar"],
  [/nikoh|uzuk|fotiha|marosim|rasmiy|никах|кольц|фотиха|церемон|регистрац|nikah|ceremony|ring|vow/i, "uzuklar"],
  [/tort|shirin|торт|сладк|десерт|cake|dessert/i, "tort"],
  [/bazm|ziyofat|dasturxon|osh|kechki|tushlik|nonushta|raqs|банкет|ужин|застол|плов|обед|танц|праздн|banquet|dinner|party|celebrat|dance|feast/i, "dasturxon"],
];
const ORDER = ["qadahlar", "uzuklar", "dasturxon", "tort"];

/** Dastur bandiga mos akvarel ikonka (kalit so‘z bo‘yicha, topilmasa — tartib bo‘yicha) */
export function programIcon(it: ProgramItem, i: number) {
  const text = `${it.title} ${it.note ?? ""}`;
  const hit = ICONS.find(([re]) => re.test(text));
  return `${P}/i-${hit ? hit[1] : ORDER[i % ORDER.length]}.webp`;
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

/** Telefon → tel: havola; Telegram → t.me havola (@username, t.me/... yoki telefon) */
export const telHref = (s: string) => {
  const d = s.replace(/[^\d+]/g, "");
  return d.replace(/\D/g, "").length >= 7 ? `tel:${d}` : null;
};
export const tgHref = (s: string) => {
  const v = s.trim();
  if (!v) return null;
  const m = v.match(/(?:t\.me\/|telegram\.me\/)([\w+]+)/i);
  if (m) return `https://t.me/${m[1]}`;
  if (/^@?[a-z][\w]{3,}$/i.test(v)) return `https://t.me/${v.replace(/^@/, "")}`;
  const d = v.replace(/\D/g, "");
  if (d.length >= 9) return `https://t.me/+${d}`;
  return null;
};
