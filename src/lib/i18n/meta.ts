import type { Metadata } from "next";

/** /ru/ sahifalarining sarlavha va tavsiflari (server — metadata uchun) */
export const RU_TITLES: Record<string, string> = {
  "Buyurtmalarim": "Мои заказы",
  "Profil": "Профиль",
  "Sevimlilar": "Избранное",
  "Mehmonlar javobi": "Ответы гостей",
  "Taklifnoma": "Приглашение",
  "Tahrirlash": "Редактирование",
  "To‘lov va chek": "Оплата и чек",
  "Admin kirish": "Вход для админа",
  "Kirish": "Вход",
  "Kabinetga kirish": "Вход в кабинет",
  "Ko‘rib chiqish": "Проверка",
  "Marosim ma’lumotlari": "Данные о торжестве",
  "Buyurtma": "Заказ",
  "Tafsilotlar": "Детали",
  "Taklifnoma tayyor": "Приглашение готово",
  "To‘lov cheki": "Чек об оплате",
  "To‘lov jarayonida": "Оплата обрабатывается",
  "Kartaga o‘tkazma": "Перевод на карту",
  "Chek tasdiqlandi": "Чек подтверждён",
  "Chek tekshirilmoqda": "Чек проверяется",
  "To‘lov": "Оплата",
  "To‘lovlar": "Платежи",
  "To‘lov qabul qilindi": "Оплата принята",
  "Test to‘lov": "Тестовая оплата",
  "To‘lov o‘tmadi": "Оплата не прошла",
  "Maxfiylik siyosati": "Политика конфиденциальности",
  "Maxsus dizayn — o‘zingizga xos taklifnoma": "Индивидуальный дизайн — приглашение только для вас",
  "Barcha shablonlar": "Все шаблоны",
  "Foydalanish shartlari": "Условия использования",
};
export const RU_DESCRIPTIONS: Record<string, string> = {
  "Shohnoma shaxsiy ma’lumotlarni qanday yig‘adi, saqlaydi va himoya qiladi.": "Как Shohnoma собирает, хранит и защищает персональные данные.",
  "Bir necha savolga javob bering — dizaynerimiz g‘oyangizni noldan chizib beradi. Brif bepul, to‘lov faqat eskizni tasdiqlaganingizdan keyin.":
    "Ответьте на несколько вопросов — наш дизайнер нарисует вашу идею с нуля. Бриф бесплатный, оплата — только после утверждения эскиза.",
  "Tayyor taklifnoma dizaynlari — nikoh, fotiha, sunnat to‘yi va tug‘ilgan kun uchun. Telefon va laptopda birdek chiroyli.":
    "Готовые дизайны приглашений — на никах, фотиху, суннат-той и день рождения. Одинаково красиво на телефоне и ноутбуке.",
  "Shohnoma taklifnoma saytlari xizmatidan foydalanish shartlari.": "Условия использования сервиса сайтов-приглашений Shohnoma.",
};

/** O‘zbekcha metadata → ruscha (sarlavha/tavsif lug‘atdan; topilmasa — o‘zgarmaydi) */
export function ruMeta(m: Metadata | undefined, path: string): Metadata {
  const out: Metadata = { ...(m ?? {}) };
  if (typeof out.title === "string") out.title = RU_TITLES[out.title] ?? out.title;
  // Bosh sahifa: sarlavha to‘liq (shablon «· Shohnoma» qo‘shilmasin)
  if (path === "/" && !out.title) out.title = { absolute: "Shohnoma — королевский сайт-приглашение на ваше торжество" };
  if (typeof out.description === "string") out.description = RU_DESCRIPTIONS[out.description] ?? out.description;
  out.alternates = { canonical: `/ru${path}`, languages: { uz: path, ru: `/ru${path}` } };
  return out;
}
