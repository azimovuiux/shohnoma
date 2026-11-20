"use client";

import Link from "@/components/LocalLink";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown2,
  ArrowRight2,
  Call,
  CloseCircle,
  HambergerMenu,
  TickCircle,
  Receipt2,
  Sms,
  Card,
  Heart,
  ProfileCircle,
  MessageQuestion,
  LogoutCurve,
  Setting2,
} from "@/components/icons";
import { useMe } from "@/lib/client";
import { switchPath, useLocale, useT } from "@/lib/i18n";

import { ACCOUNT_SECTIONS, AccountAvatar, LogoutButton, MobileAccountButton, accountSubtitle, accountTitle, useLogout, type AccountUser } from "./Account";
import { openChat } from "./FloatingContact";

export type HeaderUser = AccountUser | null;
import { Logo } from "./Logo";
import { TelegramIcon } from "./TelegramIcon";
import { SocialIcon } from "./SocialIcon";
import { phoneDisplay, socialChannels, useSocial, workHoursText } from "@/lib/social";
import { FlagGB, FlagRU, FlagUZ } from "./Flag";
import { mainNav, site } from "@/lib/site";
import { NotificationBellDesktop, NotificationBellMobile, NotificationToasts, useNotifications } from "./Notifications";

type Lang = "uz" | "ru" | "en";

/** @param navigate o‘tishni o‘zi bajaradi (masalan buyurtma oqimida — avval qoralamani saqlab) */
/** @param tight juda tor ekranda (<390px) faqat bayroq — sarlavhada hisob tugmasiga joy qolsin */
export function LangSwitcher({ compact = false, tight = false, navigate }: { compact?: boolean; tight?: boolean; navigate?: (href: string) => void }) {
  const [open, setOpen] = useState(false);
  const lang = useLocale();
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Til almashganda — o‘sha sahifaning boshqa tildagi manziliga (/ru/... ↔ /...)
  const choose = (l: Lang) => {
    setOpen(false);
    document.cookie = `lang=${l}; path=/; max-age=31536000`;
    if (l === lang) return;
    const href = switchPath(window.location.pathname, l) + window.location.search + window.location.hash;
    if (navigate) navigate(href);
    else window.location.href = href;
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("Tilni tanlash")}
        className={`inline-flex items-center gap-1.5 rounded-full border border-line t-nav text-ink hover:bg-bg-soft ${
          compact ? "h-10 px-2.5" : "h-[42px] px-3"
        } ${tight ? "max-[389px]:w-10 max-[389px]:justify-center max-[389px]:px-0" : ""}`}
      >
        {lang === "uz" ? <FlagUZ /> : lang === "ru" ? <FlagRU /> : <FlagGB />}
        <span className={tight ? "max-[389px]:sr-only" : ""}>{lang.toUpperCase()}</span>
        {!compact && <ArrowDown2 size={14} />}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-48 rounded-2xl border border-line bg-bg-base p-1.5 shadow-menu"
        >
          {(
            [
              ["uz", "O‘zbekcha", <FlagUZ key="uz" />],
              ["ru", "Русский", <FlagRU key="ru" />],
              ["en", "English", <FlagGB key="en" />],
            ] as const
          ).map(([code, label, flag]) => (
            <button
              key={code}
              role="menuitem"
              type="button"
              onClick={() => choose(code)}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left t-body-m text-ink hover:bg-bg-soft"
            >
              {flag}
              <span className="flex-1">{label}</span>
              {lang === code && (
                <TickCircle size={16} color="var(--color-maroon)" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Ish sahifalari (buyurtma, kabinet, kirish) uchun navigatsiya — landing bo‘limlari emas */
const appNav = [
  { label: "Bosh sahifa", href: "/" },
  { label: "Shablonlar", href: "/shablonlar/" },
];

function MobileMenu({
  onClose,
  user,
  onLogout,
  app = false,
}: {
  onClose: () => void;
  user: HeaderUser;
  onLogout: () => void;
  app?: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const social = useSocial();
  const channels = socialChannels(social, site.telegram);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const links = app ? appNav : [
    ...mainNav.slice(0, 3),
    { label: "Maxsus dizayn", href: "/maxsus-dizayn/" },
    ...mainNav.slice(3),
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("Menyu")}
      className="fixed inset-0 z-[60] flex flex-col bg-bg-base lg:hidden"
    >
      <div className="flex h-[69px] items-center justify-between border-b border-line px-5">
        <Logo />
        <button
          type="button"
          onClick={onClose}
          className="icon-btn !h-10 !w-10"
          aria-label={t("Yopish")}
        >
          <CloseCircle size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain">
      {user && (
        <div className="mx-5 mt-5 flex flex-col gap-3 rounded-panel bg-bg-soft p-3">
          <Link href="/kabinet/" onClick={onClose} className="flex items-center gap-3 rounded-2xl p-1.5">
            <AccountAvatar name={user.name} size={44} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate t-title text-ink">{accountTitle(user, t)}</span>
              <span className="truncate t-body-s text-ink-2">{accountSubtitle(user, t)}</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 t-nav text-maroon">
              {t("Kabinet")} <ArrowRight2 size={14} />
            </span>
          </Link>
          <div className="grid grid-cols-2 gap-2">
            {ACCOUNT_SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  onClick={onClose}
                  className="flex min-h-12 min-w-0 items-center gap-2.5 rounded-xl bg-bg-base px-3 py-2 t-body-s font-medium text-ink"
                >
                  <Icon size={19} className="shrink-0 text-maroon" />
                  <span className="min-w-0 flex-1 truncate">{t(s.short)}</span>
                  {s.count && <span className="shrink-0 text-[12px] font-normal text-ink-2">{user[s.count]}</span>}
                </Link>
              );
            })}
            {user.isAdmin && (
              <Link
                href="/admin/"
                onClick={onClose}
                className="col-span-2 flex min-h-12 items-center gap-2.5 rounded-xl bg-bg-base px-3 py-2 t-body-s font-medium text-ink"
              >
                <Setting2 size={19} className="shrink-0 text-maroon" />
                <span className="flex-1">{t("Admin panel")}</span>
              </Link>
            )}
          </div>
        </div>
      )}
      <nav className="flex flex-col gap-1 px-5 pt-4" aria-label={t("Asosiy")}>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={onClose}
            className="border-b border-line py-4 font-serif text-[34px] font-light leading-none text-ink"
          >
            {t(l.label)}
          </Link>
        ))}
        {app && (
          // Ish sahifalarida suzuvchi chat tugmasi mobilda yo‘q — yordam shu yerdan
          <button
            type="button"
            onClick={() => {
              onClose();
              openChat();
            }}
            className="flex items-center justify-between border-b border-line py-4 text-left font-serif text-[34px] font-light leading-none text-ink"
          >
            {t("Yordam")}
            <MessageQuestion size={24} className="text-maroon" />
          </button>
        )}
      </nav>
      </div>
      <div className="flex flex-col gap-5 border-t border-line px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-4">
        {user ? (
          <LogoutButton onClick={onLogout} className="w-full" />
        ) : (
          <Link
            href="/kirish/"
            onClick={onClose}
            className="btn btn-primary w-full"
          >
            <ProfileCircle size={18} /> {t("Kirish")}
          </Link>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {channels.map((c) => (
              <a
                key={c.key}
                href={c.href}
                target={c.external ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="icon-btn !h-10 !w-10"
                aria-label={t(c.name)}
              >
                <SocialIcon type={c.kind} size={18} />
              </a>
            ))}
          </div>
          <span className="t-body-s text-ink-2">{workHoursText(social, locale, t)}</span>
        </div>
      </div>
    </div>
  );
}

function AccountMenu({
  user,
  onLogout,
}: {
  user: NonNullable<HeaderUser>;
  onLogout: () => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) =>
      ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  const item =
    "flex items-center gap-3 rounded-xl px-3 py-2.5 t-body-m text-ink hover:bg-bg-soft";
  return (
    <div ref={ref} className="relative ml-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="btn btn-primary btn-sm !py-[9px] !pl-[9px]"
      >
        <AccountAvatar name={user.name} size={24} tone="inverse" />
        {t("Kabinet")}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 rounded-2xl border border-line bg-bg-base p-1.5 shadow-menu"
        >
          <div className="px-3 pb-2.5 pt-2">
            <p className="truncate t-title text-ink">{accountTitle(user, t)}</p>
            <p className="truncate t-body-s text-ink-2">{accountSubtitle(user, t)}</p>
          </div>
          <Link
            role="menuitem"
            href="/kabinet/"
            className={item}
            onClick={() => setOpen(false)}
          >
            <Sms size={18} /> <span className="flex-1">{t("Faol taklifnomalar")}</span>{" "}
            <span className="t-body-s text-ink-2">{user.active}</span>
          </Link>
          <Link
            role="menuitem"
            href="/kabinet/buyurtmalar/"
            className={item}
            onClick={() => setOpen(false)}
          >
            <Receipt2 size={18} /> <span className="flex-1">{t("Buyurtmalarim")}</span>{" "}
            <span className="t-body-s text-ink-2">{user.orders}</span>
          </Link>
          <Link
            role="menuitem"
            href="/kabinet/sevimlilar/"
            className={item}
            onClick={() => setOpen(false)}
          >
            <Heart size={18} /> <span className="flex-1">{t("Sevimlilar")}</span>{" "}
            <span className="t-body-s text-ink-2">{user.favorites}</span>
          </Link>
          <Link
            role="menuitem"
            href="/kabinet/tolovlar/"
            className={item}
            onClick={() => setOpen(false)}
          >
            <Card size={18} /> {t("To‘lovlar")}
          </Link>
          <Link
            role="menuitem"
            href="/kabinet/profil/"
            className={item}
            onClick={() => setOpen(false)}
          >
            <ProfileCircle size={18} /> {t("Profil")}
          </Link>
          {user.isAdmin && (
            <Link
              role="menuitem"
              href="/admin/"
              className={item}
              onClick={() => setOpen(false)}
            >
              <Setting2 size={18} /> {t("Admin panel")}
            </Link>
          )}
          <div className="my-1 h-px bg-line" />
          <a
            role="menuitem"
            href={site.telegram}
            target="_blank"
            rel="noopener noreferrer"
            className={item}
          >
            <MessageQuestion size={18} /> {t("Yordam")}
          </a>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className={`${item} w-full text-left !text-decline hover:!bg-[var(--decline-bg)]`}
          >
            <LogoutCurve size={18} /> {t("Chiqish")}
          </button>
        </div>
      )}
    </div>
  );
}

export function Header({ variant = "site" }: { variant?: "site" | "app" }) {
  const app = variant === "app";
  const t = useT();
  const social = useSocial();
  const { me, loading: meLoading } = useMe();
  const user: HeaderUser = me?.user
    ? {
        name: me.user.name,
        phone: me.user.phone,
        telegramUser: me.user.telegramUser,
        active: me.counts.active,
        orders: me.counts.orders,
        favorites: me.counts.favorites,
        isAdmin: me.user.isAdmin,
      }
    : null;
  // Tasdiqlash oynasi bilan; sessiya o‘chgach bosh sahifaga to‘liq yangilanadi
  const logout = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);
  const { compact, hidden } = useScrollHeader();
  // Saytdagi bildirishnomalar (taklifnoma egasi): yangi javoblar, maxsus mehmon ochishi, to‘lov holati
  const notif = useNotifications(me?.user?.id ?? null);

  return (
    <>
      {/* Header fixed: balandligi o‘zgarganda sahifa siljimaydi (joy ushlagich) */}
      <div aria-hidden className="h-[69px] lg:h-[87px]" />
      <header
        className={`fixed inset-x-0 top-0 z-40 border-b border-line bg-bg-base/[0.97] will-change-transform transition-[transform,box-shadow] duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          compact ? "shadow-[0_8px_24px_-18px_rgba(38,20,10,0.35)]" : ""
        } ${hidden && !menuOpen && !notif.open ? "-translate-y-[calc(100%+2px)]" : "translate-y-0"}`}
      >
        <div
          className={`mx-auto flex max-w-[1440px] items-center justify-between px-5 max-[374px]:px-3 transition-[height] duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:px-10 xl:px-[120px] ${
            compact ? "h-[55px] lg:h-[70px]" : "h-[69px] lg:h-[87px]"
          }`}
        >
          <Logo />

          {!app && (
          <nav
            className="hidden items-center gap-6 lg:flex xl:gap-8"
            aria-label={t("Asosiy")}
          >
            {mainNav.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="t-nav text-ink transition-colors hover:text-maroon"
              >
                {t(l.label)}
              </Link>
            ))}
          </nav>
          )}

          <div className="hidden items-center gap-2.5 lg:flex">
            <LangSwitcher />
            <a href={site.telegram} target="_blank" rel="noopener noreferrer" className="icon-btn" aria-label="Telegram">
              <TelegramIcon size={18} />
            </a>
            {social.phone && (
              <a href={`tel:${social.phone}`} className="icon-btn max-xl:!hidden" aria-label={t("Qo‘ng‘iroq")} title={phoneDisplay(social.phone)}>
                <Call size={18} />
              </a>
            )}
            {user && <NotificationBellDesktop s={notif} />}
            {user ? (
              <AccountMenu user={user} onLogout={logout} />
            ) : meLoading && !me ? (
              <span className="ml-1 h-9 w-[104px]" aria-hidden />
            ) : (
              <Link href="/kirish/" className="btn btn-primary btn-sm ml-1">
                <ProfileCircle size={18} /> {t("Kirish")}
              </Link>
            )}
          </div>

          <div className={`flex items-center lg:hidden max-[374px]:!gap-1 max-[374px]:[&_.icon-btn]:!h-9 max-[374px]:[&_.icon-btn]:!w-9 ${user ? "gap-1.5" : "gap-2"}`}>
            <LangSwitcher compact tight={!!user} />
            {/* Kirgan foydalanuvchida Telegram o‘rnida hisob tugmasi (Telegram/yordam — burger va hisob menyusida) */}
            {!user && !(meLoading && !me) && (
              <a
                href={site.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="icon-btn !h-10 !w-10"
                aria-label="Telegram"
              >
                <TelegramIcon size={18} />
              </a>
            )}
            {meLoading && !me && <span className="size-10" aria-hidden />}
            {user && <NotificationBellMobile s={notif} />}
            {user && <MobileAccountButton user={user} />}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="icon-btn !h-10 !w-10"
              aria-label={t("Menyuni ochish")}
            >
              <HambergerMenu size={20} />
            </button>
          </div>
        </div>
      </header>
      {user && <NotificationToasts s={notif} />}
      {menuOpen && (
        <MobileMenu
          onClose={() => setMenuOpen(false)}
          user={user}
          onLogout={logout}
          app={app}
        />
      )}
    </>
  );
}

/**
 * Scroll holati: tepadan chiqqach header 20% pastroq (compact);
 * pastga scrollda yashirinadi, biroz tepaga scroll qilinganda qaytadi.
 */
function useScrollHeader() {
  const [state, setState] = useState({ compact: false, hidden: false });
  useEffect(() => {
    let lastY = window.scrollY;
    let upFrom = lastY; // tepaga harakat boshlangan nuqta
    let hidden = false;
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = Math.max(0, window.scrollY);
      if (y < 140) hidden = false;
      else if (y > lastY + 2) hidden = true;
      else if (y < lastY && upFrom - y > 48) hidden = false;
      if (y >= lastY) upFrom = y;
      lastY = y;
      const compact = y > 24;
      setState((p) => (p.compact === compact && p.hidden === hidden ? p : { compact, hidden }));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return state;
}
