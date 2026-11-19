/**
 * Doimiy sayt ma’lumotlari. Telefon, ish vaqti va ijtimoiy tarmoqlar — admin boshqaradi
 * (Admin → Sozlamalar → «Ijtimoiy tarmoqlar va aloqa»; src/lib/social.ts → useSocial()).
 */
export const site = {
  name: "Shohnoma",
  domain: "shohnoma.uz",
  /** Support Telegram bot: /api/support-tg → admin sozlamalaridagi bot (t.me/<bot>?start=support) */
  telegram: "/api/support-tg",
  telegramHandle: "Telegram bot",
};

export const mainNav = [
  { label: "Shablonlar", href: "/shablonlar/" },
  { label: "Qanday ishlaydi", href: "/#qanday-ishlaydi" },
  { label: "Imkoniyatlar", href: "/#imkoniyatlar" },
  { label: "Savollar", href: "/#savollar" },
  { label: "Maqolalar", href: "/maqolalar/" },
  { label: "Aloqa", href: "/#aloqa" },
];
