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

/** `from` — desktop sarlavhada shu kenglikdan boshlab ko‘rinadi (tor laptopda menyu sig‘ishi uchun; burger menyuda hammasi bor) */
export const mainNav: { label: string; href: string; from?: "xl" | "1440" }[] = [
  { label: "Shablonlar", href: "/shablonlar/" },
  { label: "Vizitka", href: "/vizitka/" },
  { label: "Qanday ishlaydi", href: "/#qanday-ishlaydi" },
  { label: "Imkoniyatlar", href: "/#imkoniyatlar", from: "1440" },
  { label: "Savollar", href: "/#savollar" },
  { label: "Maqolalar", href: "/maqolalar/" },
  { label: "Aloqa", href: "/#aloqa", from: "xl" },
];
