/**
 * Ijtimoiy tarmoqlar va aloqa ma’lumotlari — admin boshqaradi (Admin → Sozlamalar → «Ijtimoiy tarmoqlar»).
 * Ma’lumot /api/templates.js orqali keladi (window.__SHOHNOMA_SOCIAL__). Statik HTML va admin hali to‘ldirmagan holat — `defaultSocial`.
 * Support Telegram bot (site.telegram → /api/support-tg) ro‘yxatdan tashqari, doim bor.
 */
import { useSyncExternalStore } from "react";
import type { Locale } from "./i18n";

export type SocialType = "telegram" | "instagram" | "whatsapp" | "facebook" | "youtube" | "tiktok" | "x" | "linkedin" | "email" | "website";

export interface SocialLink {
  type: SocialType;
  url: string;
  /** Ixtiyoriy nom (bo‘sh bo‘lsa — tarmoq nomi) */
  label?: string;
}

export interface SocialConfig {
  links: SocialLink[];
  /** +998901234567 */
  phone: string | null;
  workHours: string;
  workHoursRu?: string;
  workHoursEn?: string;
  /** Support botni sarlavha/footer ikonkalari orasida ko‘rsatmaslik */
  hideTelegramBot?: boolean;
}

export const SOCIAL_TYPES: { type: SocialType; name: string; placeholder: string; action: string }[] = [
  { type: "instagram", name: "Instagram", placeholder: "@shohnoma.uz yoki https://instagram.com/…", action: "Sahifamiz" },
  { type: "telegram", name: "Telegram kanal", placeholder: "@kanal yoki https://t.me/…", action: "Kanalimiz" },
  { type: "whatsapp", name: "WhatsApp", placeholder: "+998 90 123 45 67 yoki https://wa.me/…", action: "Yozish" },
  { type: "facebook", name: "Facebook", placeholder: "https://facebook.com/…", action: "Sahifamiz" },
  { type: "youtube", name: "YouTube", placeholder: "@kanal yoki https://youtube.com/…", action: "Kanalimiz" },
  { type: "tiktok", name: "TikTok", placeholder: "@profil yoki https://tiktok.com/@…", action: "Profilimiz" },
  { type: "x", name: "X (Twitter)", placeholder: "@profil yoki https://x.com/…", action: "Profilimiz" },
  { type: "linkedin", name: "LinkedIn", placeholder: "https://linkedin.com/company/…", action: "Sahifamiz" },
  { type: "email", name: "Email", placeholder: "info@shohnoma.uz", action: "Yozish" },
  { type: "website", name: "Sayt / boshqa havola", placeholder: "https://…", action: "Ochish" },
];
export const socialName = (l: SocialLink) => l.label || SOCIAL_TYPES.find((x) => x.type === l.type)?.name || l.type;
export const socialAction = (l: SocialLink) => SOCIAL_TYPES.find((x) => x.type === l.type)?.action || "Ochish";
/** Yangi oynada ochiladigan havola (mailto emas) */
export const socialExternal = (l: SocialLink) => l.type !== "email";

export const defaultSocial: SocialConfig = { links: [], phone: null, workHours: "Har kuni 9:00 – 21:00" };

declare global {
  interface Window {
    __SHOHNOMA_SOCIAL__?: SocialConfig | null;
  }
}

function load(): SocialConfig {
  if (typeof window !== "undefined") {
    const w = window.__SHOHNOMA_SOCIAL__;
    if (w && Array.isArray(w.links)) return { ...defaultSocial, ...w };
  }
  return defaultSocial;
}
const live = load();
const noop = () => () => {};

/** Statik HTML bilan mos: birinchi chizishda standart, keyin admin sozlamasi */
export function useSocial(): SocialConfig {
  return useSyncExternalStore(noop, () => live, () => defaultSocial);
}

/** +998901234567 → «+998 90 123 45 67» */
export function phoneDisplay(p: string | null | undefined) {
  if (!p) return "";
  const m = p.match(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : p;
}

/** Ish vaqti joriy tilda: admin ru/en yozgan bo‘lsa — o‘sha, aks holda o‘zbekchasi tarjima lug‘ati orqali */
export function workHoursText(c: SocialConfig, locale: Locale, t: (s: string) => string) {
  if (locale === "ru" && c.workHoursRu) return c.workHoursRu;
  if (locale === "en" && c.workHoursEn) return c.workHoursEn;
  return t(c.workHours);
}

/** Ko‘rsatiladigan barcha aloqa kanallari bitta ro‘yxatda: support bot, admin havolalari, telefon */
export type ChannelKind = SocialType | "bot" | "phone";
export interface Channel {
  key: string;
  kind: ChannelKind;
  name: string;
  href: string;
  external: boolean;
  /** «Yozish», «Sahifamiz»… (tarjima qilinadigan o‘zbekcha matn) */
  action: string;
}
export function socialChannels(c: SocialConfig, botHref: string): Channel[] {
  const out: Channel[] = [];
  if (!c.hideTelegramBot) out.push({ key: "bot", kind: "bot", name: "Telegram", href: botHref, external: true, action: "Yozish" });
  c.links.forEach((l, i) => out.push({ key: `${l.type}-${i}`, kind: l.type, name: socialName(l), href: l.url, external: socialExternal(l), action: socialAction(l) }));
  if (c.phone) out.push({ key: "phone", kind: "phone", name: "Qo‘ng‘iroq", href: `tel:${c.phone}`, external: false, action: "Qo‘ng‘iroq qilish" });
  return out;
}
