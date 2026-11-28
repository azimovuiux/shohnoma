/**
 * Vizitka sahifasidagi interfeys yorliqlari (mijoz matni emas). Kalit — o‘zbekcha matn.
 * Karta tili sayt tilidan mustaqil (kartadagi UZ/RU/EN tugmasi), shuning uchun alohida lug‘at.
 */
import type { CardLang } from "@/lib/cardTypes";

const RU: Record<string, string> = {
  "Qanday birga ishlashimiz mumkin": "Как мы можем работать вместе",
  Kompaniyalar: "Компании",
  Kontaktlar: "Контакты",
  "Siz ham kontakt qoldiring": "Оставьте свой контакт",
  "Ma’lumotlaringiz to‘g‘ridan-to‘g‘ri menga keladi. 24 soat ichida o‘zim bog‘lanaman.": "Ваши данные придут напрямую мне. Я свяжусь с вами в течение 24 часов.",
  Ismingiz: "Ваше имя",
  "Kompaniya va lavozim": "Компания и должность",
  "Telefon yoki email": "Телефон или email",
  Investitsiya: "Инвестиции",
  Hamkorlik: "Сотрудничество",
  Boshqa: "Другое",
  Yuborish: "Отправить",
  "Yuborilmoqda…": "Отправляем…",
  "Rahmat! Ma’lumotlaringiz yuborildi.": "Спасибо! Ваши данные отправлены.",
  "Tez orada bog‘lanaman.": "Скоро свяжусь с вами.",
  "Yana yuborish": "Отправить ещё",
  "Ism va telefon yoki emailni kiriting": "Укажите имя и телефон или email",
  "Yuborib bo‘lmadi. Qayta urinib ko‘ring.": "Не удалось отправить. Попробуйте ещё раз.",
  "Juda ko‘p urinish. Birozdan so‘ng qayta yuboring.": "Слишком много попыток. Попробуйте чуть позже.",
  "Kontaktni saqlash": "Сохранить контакт",
  Saqlash: "Сохранить",
  Saqlandi: "Сохранено",
  "Telefonga saqlash": "Сохранить в телефон",
  "Kontaktimni saqlang": "Сохраните мой контакт",
  "Telefon, email va ijtimoiy tarmoqlar bitta kontakt kartada saqlanadi.": "Телефон, email и соцсети сохранятся в одной карточке контакта.",
  "Ijtimoiy tarmoqlar": "Соцсети",
  Havolalar: "Ссылки",
  "Qo‘ng‘iroq": "Позвонить",
  Email: "Email",
  WhatsApp: "WhatsApp",
  Obuna: "Подписаться",
  "QR kod": "QR-код",
  Ulashish: "Поделиться",
  "Nusxa olindi": "Скопировано",
  "Havolani nusxalash": "Копировать ссылку",
  "Havola nusxalandi": "Ссылка скопирована",
  "PNG yuklab olish": "Скачать PNG",
  "SVG yuklab olish": "Скачать SVG",
  "Kamerani QR kodga qarating — vizitka telefonda ochiladi.": "Наведите камеру на QR-код — визитка откроется на телефоне.",
  Yopish: "Закрыть",
  Ofis: "Офис",
  "Til": "Язык",
  "Ochish": "Открыть",
  "Yopish::acc": "Свернуть",  "Ismingizni kiriting": "Укажите ваше имя",
  "Telefon yoki email kiriting": "Укажите телефон или email",
  "Telefon raqam, email yoki Telegram nomini kiriting": "Укажите номер телефона, email или ник в Telegram",
  "Matn juda uzun — qisqartiring.": "Текст слишком длинный — сократите его.",
  "Bu vizitkada murojaat formasi o‘chirilgan.": "Форма обращения на этой визитке отключена.",
  "Vizitka topilmadi": "Визитка не найдена",
};

const EN: Record<string, string> = {
  "Qanday birga ishlashimiz mumkin": "How we can work together",
  Kompaniyalar: "Companies",
  Kontaktlar: "Contacts",
  "Siz ham kontakt qoldiring": "Leave your contact",
  "Ma’lumotlaringiz to‘g‘ridan-to‘g‘ri menga keladi. 24 soat ichida o‘zim bog‘lanaman.": "Your details come straight to me. I’ll get back to you within 24 hours.",
  Ismingiz: "Your name",
  "Kompaniya va lavozim": "Company and position",
  "Telefon yoki email": "Phone or email",
  Investitsiya: "Investment",
  Hamkorlik: "Partnership",
  Boshqa: "Other",
  Yuborish: "Send",
  "Yuborilmoqda…": "Sending…",
  "Rahmat! Ma’lumotlaringiz yuborildi.": "Thank you! Your details have been sent.",
  "Tez orada bog‘lanaman.": "I’ll be in touch soon.",
  "Yana yuborish": "Send another",
  "Ism va telefon yoki emailni kiriting": "Enter your name and phone or email",
  "Yuborib bo‘lmadi. Qayta urinib ko‘ring.": "Couldn’t send. Please try again.",
  "Juda ko‘p urinish. Birozdan so‘ng qayta yuboring.": "Too many attempts. Please try again a bit later.",
  "Kontaktni saqlash": "Save contact",
  Saqlash: "Save",
  Saqlandi: "Saved",
  "Telefonga saqlash": "Save to phone",
  "Kontaktimni saqlang": "Save my contact",
  "Telefon, email va ijtimoiy tarmoqlar bitta kontakt kartada saqlanadi.": "Phone, email and social links are saved in a single contact card.",
  "Ijtimoiy tarmoqlar": "Social media",
  Havolalar: "Links",
  "Qo‘ng‘iroq": "Call",
  Email: "Email",
  WhatsApp: "WhatsApp",
  Obuna: "Follow",
  "QR kod": "QR code",
  Ulashish: "Share",
  "Nusxa olindi": "Copied",
  "Havolani nusxalash": "Copy link",
  "Havola nusxalandi": "Link copied",
  "PNG yuklab olish": "Download PNG",
  "SVG yuklab olish": "Download SVG",
  "Kamerani QR kodga qarating — vizitka telefonda ochiladi.": "Point a camera at the QR code — the card opens on the phone.",
  Yopish: "Close",
  Ofis: "Office",
  Til: "Language",
  Ochish: "Expand",
  "Yopish::acc": "Collapse",  "Ismingizni kiriting": "Enter your name",
  "Telefon yoki email kiriting": "Enter a phone or email",
  "Telefon raqam, email yoki Telegram nomini kiriting": "Enter a phone number, email or Telegram username",
  "Matn juda uzun — qisqartiring.": "The text is too long — please shorten it.",
  "Bu vizitkada murojaat formasi o‘chirilgan.": "The contact form is turned off on this card.",
  "Vizitka topilmadi": "Card not found",
};

/** Karta yorlig‘i: ct("Kontaktni saqlash", "ru") → «Сохранить контакт» */
export function ct(s: string, lang: CardLang): string {
  const plain = s.includes("::") ? s.slice(s.indexOf("::") + 2) : s;
  if (lang === "ru") return RU[s] ?? plain;
  if (lang === "en") return EN[s] ?? plain;
  return plain;
}

/**
 * Lead forma: server javobi (HTTP holati + o‘zbekcha xato matni) → karta yorlig‘i kaliti (ct() bilan karta tilida chiqadi).
 * Karta tili sayt (URL) tilidan farq qilishi mumkin, shuning uchun server matni to‘g‘ridan-to‘g‘ri ko‘rsatilmaydi.
 */
export const LEAD_ERROR_KEYS = [
  "Juda ko‘p urinish. Birozdan so‘ng qayta yuboring.",
  "Bu vizitkada murojaat formasi o‘chirilgan.",
  "Vizitka topilmadi",
  "Matn juda uzun — qisqartiring.",
  "Ismingizni kiriting",
  "Telefon raqam, email yoki Telegram nomini kiriting",
  "Telefon yoki email kiriting",
  "Yuborib bo‘lmadi. Qayta urinib ko‘ring.",
];
export function leadErrorKey(status: number, serverMsg = ""): string {
  if (status === 429) return "Juda ko‘p urinish. Birozdan so‘ng qayta yuboring.";
  if (status === 409) return "Bu vizitkada murojaat formasi o‘chirilgan.";
  if (status === 404) return "Vizitka topilmadi";
  if (status === 422) {
    if (/juda uzun/i.test(serverMsg)) return "Matn juda uzun — qisqartiring.";
    if (/^Ismingizni/.test(serverMsg)) return "Ismingizni kiriting";
    if (/Telegram/.test(serverMsg)) return "Telefon raqam, email yoki Telegram nomini kiriting";
    if (/^Telefon yoki email/.test(serverMsg)) return "Telefon yoki email kiriting";
  }
  return "Yuborib bo‘lmadi. Qayta urinib ko‘ring.";
}

export const LANG_LABEL: Record<CardLang, string> = { uz: "UZ", ru: "RU", en: "EN" };
