"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { ru as common } from "./ru/common";
import { ru as site } from "./ru/site";
import { ru as order } from "./ru/order";
import { ru as cabinet } from "./ru/cabinet";
import { ru as invite } from "./ru/invite";
import { en as inviteEn } from "./en/invite";
import { en as commonEn } from "./en/common";
import { en as siteEn } from "./en/site";
import { en as orderEn } from "./en/order";
import { en as cabinetEn } from "./en/cabinet";

/**
 * Sayt tillari. O‘zbekcha — asosiy (manzil prefikssiz), ruscha — /ru/... ostida.
 * Tarjima kaliti — o‘zbekcha asl matnning o‘zi: t("Barcha shablonlar") → «Все шаблоны».
 * Lug‘atda topilmasa — o‘zbekcha matn qaytadi (sahifa buzilmaydi).
 * O‘zgaruvchilar: t("{n} ta shablon", { n: 3 }).
 */
export type Locale = "uz" | "ru" | "en";
export const LOCALES: Locale[] = ["uz", "ru", "en"];

const DICT: Record<string, string> = { ...common, ...site, ...order, ...cabinet, ...invite };
const DICT_EN: Record<string, string> = { ...commonEn, ...siteEn, ...orderEn, ...cabinetEn, ...inviteEn };

export function tr(locale: Locale, s: string, vars?: Record<string, string | number>): string {
  let out = locale === "ru" ? (DICT[s] ?? s) : locale === "en" ? (DICT_EN[s] ?? s) : s;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

/** Ichki havolaga til prefiksi: lpath("ru", "/shablonlar/") → "/ru/shablonlar/" */
export function lpath(locale: Locale, href: string): string {
  if (locale === "uz" || !href.startsWith("/") || href.startsWith("//")) return href;
  if (/^\/((ru|en)(\/|$|\?|#)|api\/|files\/|admin(\/|$)|templates\/|images\/|pay\/|_next\/)/.test(href)) return href;
  return href === "/" ? `/${locale}/` : `/${locale}${href.startsWith("/#") ? `/${href.slice(1)}` : href}`;
}

/** Joriy manzildan til (faqat brauzerda — React tashqarisidagi kod uchun) */
export function currentLocale(): Locale {
  if (typeof window === "undefined") return "uz";
  const m = window.location.pathname.match(/^\/(ru|en)(\/|$)/);
  return m ? (m[1] as Locale) : "uz";
}

/** Manzilni boshqa tilga: /ru/shablonlar/ ↔ /shablonlar/ */
export function switchPath(path: string, to: Locale): string {
  const bare = path.replace(/^\/(ru|en)(?=\/|$)/, "") || "/";
  return to === "uz" ? bare : lpath(to, bare);
}

const Ctx = createContext<Locale>("uz");

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}

export const useLocale = () => useContext(Ctx);

export function useT() {
  const locale = useLocale();
  return useCallback((s: string, vars?: Record<string, string | number>) => tr(locale, s, vars), [locale]);
}

/** Joriy tilga mos ichki havola yasovchi */
export function useLpath() {
  const locale = useLocale();
  return useCallback((href: string) => lpath(locale, href), [locale]);
}
