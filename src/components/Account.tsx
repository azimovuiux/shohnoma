"use client";

import Link from "@/components/LocalLink";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight2,
  Card,
  CloseCircle,
  Personalcard,
  Heart,
  Sms,
  LogoutCurve,
  MessageQuestion,
  ProfileCircle,
  Receipt2,
  Setting2,
} from "@/components/icons";
import { Modal, confirmDialog } from "@/components/ui";
import { openChat } from "@/components/FloatingContact";
import { formatPhoneDisplay, initials } from "@/lib/display";
import { lpath, useLocale, useLpath, useT } from "@/lib/i18n";

/**
 * Hisob (kabinet) uchun umumiy qismlar: avatar, bo‘limlar ro‘yxati (ikonkalar — desktop menyu bilan bir xil ma’noda),
 * tasdiqlab chiqish va mobil sarlavhadagi hisob tugmasi + pastki oyna (bottom sheet).
 */

export type AccountUser = {
  name: string | null;
  phone: string | null;
  telegramUser: string | null;
  active: number;
  orders: number;
  favorites: number;
  /** Vizitkalar soni (to‘langan + to‘lanmagan) */
  cards: number;
  isAdmin: boolean;
};

/** Kabinet bo‘limlari — barcha menyularda bir xil tartib va ikonka */
export const ACCOUNT_SECTIONS = [
  { href: "/kabinet/", label: "Faol taklifnomalar", short: "Faol", icon: Sms, count: "active" as const },
  { href: "/kabinet/buyurtmalar/", label: "Buyurtmalarim", short: "Buyurtma", icon: Receipt2, count: "orders" as const },
  { href: "/kabinet/vizitkalar/", label: "Vizitkalarim", short: "Vizitka", icon: Personalcard, count: "cards" as const },
  { href: "/kabinet/sevimlilar/", label: "Sevimlilar", short: "Sevimlilar", icon: Heart, count: "favorites" as const },
  { href: "/kabinet/tolovlar/", label: "To‘lovlar", short: "To‘lovlar", icon: Card, count: null },
  { href: "/kabinet/profil/", label: "Profil", short: "Profil", icon: ProfileCircle, count: null },
];

export const samePath = (a: string, b: string) => a.replace(/\/+$/, "") === b.replace(/\/+$/, "");
/** Bo‘lim faolmi: aniq manzil yoki uning ichki sahifalari (Vizitkalarim → /kabinet/v/<id>/) */
export const sectionActive = (path: string, href: string, lp: (h: string) => string) =>
  samePath(path, lp(href)) || (href === "/kabinet/vizitkalar/" && path.startsWith(lp("/kabinet/v/")));

/** Sarlavha: ism bo‘lmasa — telefon (noaniq «Mening kabinetim» o‘rniga) */
export function accountTitle(u: Pick<AccountUser, "name" | "phone" | "telegramUser">, t: (s: string) => string) {
  return u.name || (u.phone ? formatPhoneDisplay(u.phone) : u.telegramUser ? `@${u.telegramUser.replace(/^@/, "")}` : t("Mening kabinetim"));
}
/** Ikkinchi qator: ism bo‘lsa — telefon, aks holda «Shaxsiy kabinet» */
export function accountSubtitle(u: Pick<AccountUser, "name" | "phone" | "telegramUser">, t: (s: string) => string) {
  if (!u.name) return t("Shaxsiy kabinet");
  return u.phone ? formatPhoneDisplay(u.phone) : u.telegramUser ? `@${u.telegramUser.replace(/^@/, "")}` : t("Shaxsiy kabinet");
}

/** Bosh harflar; ism bo‘lmasa — profil ikonkasi (ma’nosiz «S» o‘rniga) */
export function AccountAvatar({ name, size = 44, tone = "maroon", serif = false, className = "" }: { name: string | null; size?: number; tone?: "maroon" | "soft" | "inverse"; serif?: boolean; className?: string }) {
  const tones = {
    maroon: "bg-maroon text-ink-inverse",
    soft: "bg-gold-soft text-maroon",
    inverse: "bg-ink-inverse text-maroon",
  } as const;
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full leading-none ${serif ? "font-serif font-medium" : "font-semibold"} ${tones[tone]} ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * (serif ? 0.45 : 0.36)) }}
    >
      {name?.trim() ? initials(name) : <ProfileCircle size={Math.round(size * 0.56)} />}
    </span>
  );
}

/** Chiqish: tasdiqlash oynasi → sessiya o‘chadi → bosh sahifaga (to‘liq yangilanish — holat tozalanadi) */
export function useLogout() {
  const t = useT();
  const locale = useLocale();
  return useCallback(async () => {
    const ok = await confirmDialog({
      title: t("Akkauntdan chiqasizmi?"),
      text: t("Buyurtmalaringiz va taklifnomalaringiz saqlanib qoladi — istalgan payt qayta kirishingiz mumkin."),
      ok: t("Chiqish"),
      danger: true,
    });
    if (!ok) return false;
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* tarmoq xatosida ham bosh sahifaga — cookie server tomonda tozalanadi */
    }
    window.location.assign(lpath(locale, "/"));
    return true;
  }, [t, locale]);
}

/** Aniq «Chiqish» tugmasi — qizil kontur, ikonka bilan */
export function LogoutButton({ onClick, label = "Akkauntdan chiqish", className = "" }: { onClick: () => void; label?: string; className?: string }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      className={`btn min-h-12 border border-decline/35 !py-3.5 text-decline hover:!bg-[var(--decline-bg)] ${className}`}
    >
      <LogoutCurve size={18} /> {t(label)}
    </button>
  );
}

/** Mobil sarlavhadagi hisob tugmasi (avatar) — bosilganda hisob menyusi pastdan chiqadi */
export function MobileAccountButton({ user }: { user: AccountUser }) {
  const t = useT();
  const lp = useLpath();
  const path = usePathname();
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const close = useCallback(() => setOpen(false), []);
  // Sahifa almashsa — oyna yopiladi
  useEffect(() => setOpen(false), [path]);

  const row = "flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-3 text-left t-body-m text-ink transition-colors active:bg-bg-soft";
  const ico = "flex size-9 shrink-0 items-center justify-center rounded-full";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("Hisob menyusi")}
        className="flex size-10 items-center justify-center rounded-full ring-1 ring-maroon/15 ring-offset-2 ring-offset-bg-base max-[374px]:size-9"
      >
        <AccountAvatar name={user.name} size={40} />
      </button>
      {mounted &&
        createPortal(
          <Modal open={open} onClose={close} label={t("Hisob menyusi")} className="pb-[max(16px,env(safe-area-inset-bottom))]">
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden />
            <div className="flex items-center gap-3 px-5 pb-3 pt-3">
              <AccountAvatar name={user.name} size={48} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate t-title text-ink">{accountTitle(user, t)}</span>
                <span className="truncate t-body-s text-ink-2">{accountSubtitle(user, t)}</span>
              </div>
              <button type="button" onClick={close} className="icon-btn !h-11 !w-11 shrink-0" aria-label={t("Yopish")}>
                <CloseCircle size={20} />
              </button>
            </div>
            <nav className="flex flex-col gap-0.5 px-2" aria-label={t("Kabinet")}>
              {ACCOUNT_SECTIONS.map((s) => {
                const Icon = s.icon;
                const active = sectionActive(path, s.href, lp);
                return (
                  <Link
                    key={s.href}
                    href={s.href}
                    onClick={close}
                    aria-current={active ? "page" : undefined}
                    className={`${row} ${active ? "bg-bg-soft text-maroon" : ""}`}
                  >
                    <span className={`${ico} ${active ? "bg-bg-base text-maroon" : "bg-bg-soft text-maroon"}`}>
                      <Icon size={19} />
                    </span>
                    <span className="flex-1 font-medium">{t(s.label)}</span>
                    {s.count && (
                      <span className="rounded-full bg-bg-soft px-2.5 py-0.5 text-[12px] leading-[1.5] text-ink-2">{user[s.count]}</span>
                    )}
                    <ArrowRight2 size={16} className="text-ink-2" />
                  </Link>
                );
              })}
              {user.isAdmin && (
                <Link href="/admin/" onClick={close} className={row}>
                  <span className={`${ico} bg-bg-soft text-maroon`}>
                    <Setting2 size={19} />
                  </span>
                  <span className="flex-1 font-medium">{t("Admin panel")}</span>
                  <ArrowRight2 size={16} className="text-ink-2" />
                </Link>
              )}
              <span className="mx-3 my-1.5 h-px bg-line" aria-hidden />
              <button
                type="button"
                onClick={() => {
                  close();
                  openChat();
                }}
                className={row}
              >
                <span className={`${ico} bg-bg-soft text-maroon`}>
                  <MessageQuestion size={19} />
                </span>
                <span className="flex-1 font-medium">{t("Yordam")}</span>
                <span className="t-body-s text-ink-2">{t("Chat")}</span>
              </button>
            </nav>
            <div className="px-5 pb-2 pt-3">
              <LogoutButton
                className="w-full"
                onClick={() => {
                  // Sheet yopiladi, so‘ng tasdiqlash oynasi (ikki oyna ustma-ust tushmasin)
                  close();
                  logout();
                }}
              />
            </div>
          </Modal>,
          document.body,
        )}
    </>
  );
}
