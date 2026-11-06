"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown2,
  Call,
  CloseCircle,
  HambergerMenu,
  Instagram,
  Whatsapp,
  TickCircle,
  Receipt2,
  Heart,
  ProfileCircle,
  MessageQuestion,
  LogoutCurve,
  Setting2,
} from "@/components/icons";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/client";

export type HeaderUser = {
  name: string | null;
  phone: string | null;
  telegramUser: string | null;
  orders: number;
  favorites: number;
  isAdmin: boolean;
} | null;
import { formatPhoneDisplay, initials } from "@/lib/display";
import { Logo } from "./Logo";
import { TelegramIcon } from "./TelegramIcon";
import { FlagRU, FlagUZ } from "./Flag";
import { mainNav, site } from "@/lib/site";

type Lang = "uz" | "ru";

function LangSwitcher({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("uz");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = document.cookie.match(/(?:^|; )lang=(uz|ru)/)?.[1] as
      | Lang
      | undefined;
    if (saved) setLang(saved);
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const choose = (l: Lang) => {
    setLang(l);
    setOpen(false);
    document.cookie = `lang=${l}; path=/; max-age=31536000`;
    // [Ochiq] ruscha tarjima keyingi bosqichda (next-intl) ulanadi
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Tilni tanlash"
        className={`inline-flex items-center gap-1.5 rounded-full border border-line t-nav text-ink hover:bg-bg-soft ${
          compact ? "h-10 px-2.5" : "h-[42px] px-3"
        }`}
      >
        {lang === "uz" ? <FlagUZ /> : <FlagRU />}
        <span>{lang.toUpperCase()}</span>
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

function MobileMenu({
  onClose,
  user,
  onLogout,
}: {
  onClose: () => void;
  user: HeaderUser;
  onLogout: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const links = [
    ...mainNav.slice(0, 3),
    { label: "Maxsus dizayn", href: "/maxsus-dizayn/" },
    ...mainNav.slice(3),
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menyu"
      className="fixed inset-0 z-[60] flex flex-col bg-bg-base lg:hidden"
    >
      <div className="flex h-[69px] items-center justify-between border-b border-line px-5">
        <Logo />
        <button
          type="button"
          onClick={onClose}
          className="icon-btn !h-10 !w-10"
          aria-label="Yopish"
        >
          <CloseCircle size={20} />
        </button>
      </div>
      {user && (
        <div className="mx-5 mt-5 flex flex-col gap-4 rounded-panel bg-bg-soft p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-gold-soft font-semibold text-maroon">
              {initials(user.name ?? "S")}
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate t-title text-ink">
                {user.name || "Mening kabinetim"}
              </span>
              <span className="t-body-s text-ink-2">
                {user.phone
                  ? formatPhoneDisplay(user.phone)
                  : user.telegramUser}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["/kabinet/", "Buyurtmalar", user.orders],
              ["/kabinet/sevimlilar/", "Sevimlilar", user.favorites],
              ["/kabinet/profil/", "Profil", null],
            ].map(([href, label, n]) => (
              <Link
                key={href as string}
                href={href as string}
                onClick={onClose}
                className="flex flex-col items-center gap-0.5 rounded-xl bg-bg-base px-2 py-2.5 t-body-s text-ink"
              >
                <span className="font-serif text-[20px] font-medium leading-none text-maroon">
                  {n ?? "·"}
                </span>
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-5 pt-6">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={onClose}
            className="border-b border-line py-4 font-serif text-[34px] font-light leading-none text-ink"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="flex flex-col gap-5 px-5 pb-8 pt-6">
        {user ? (
          <button
            type="button"
            onClick={onLogout}
            className="t-nav text-ink-2 hover:text-maroon"
          >
            Akkauntdan chiqish
          </button>
        ) : (
          <Link
            href="/kirish/"
            onClick={onClose}
            className="btn btn-primary w-full"
          >
            <ProfileCircle size={18} /> Kirish
          </Link>
        )}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <a
              href={site.telegram}
              className="icon-btn !h-10 !w-10"
              aria-label="Telegram"
            >
              <TelegramIcon size={18} />
            </a>
            <a
              href={site.instagram}
              className="icon-btn !h-10 !w-10"
              aria-label="Instagram"
            >
              <Instagram size={18} />
            </a>
            <a
              href={site.whatsapp}
              className="icon-btn !h-10 !w-10"
              aria-label="WhatsApp"
            >
              <Whatsapp size={18} />
            </a>
            <a
              href={site.phoneHref}
              className="icon-btn !h-10 !w-10"
              aria-label="Qo‘ng‘iroq"
            >
              <Call size={18} />
            </a>
          </div>
          <span className="t-body-s text-ink-2">{site.workHours}</span>
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
        <span className="flex size-6 items-center justify-center rounded-full bg-ink-inverse text-[11px] font-semibold text-maroon">
          {initials(user.name ?? "S")}
        </span>
        Kabinet
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 rounded-2xl border border-line bg-bg-base p-1.5 shadow-menu"
        >
          <div className="px-3 pb-2.5 pt-2">
            <p className="truncate t-title text-ink">
              {user.name || "Mening kabinetim"}
            </p>
            <p className="t-body-s text-ink-2">
              {user.phone ? formatPhoneDisplay(user.phone) : user.telegramUser}
            </p>
          </div>
          <Link
            role="menuitem"
            href="/kabinet/"
            className={item}
            onClick={() => setOpen(false)}
          >
            <Receipt2 size={18} /> <span className="flex-1">Buyurtmalarim</span>{" "}
            <span className="t-body-s text-ink-2">{user.orders}</span>
          </Link>
          <Link
            role="menuitem"
            href="/kabinet/sevimlilar/"
            className={item}
            onClick={() => setOpen(false)}
          >
            <Heart size={18} /> <span className="flex-1">Sevimlilar</span>{" "}
            <span className="t-body-s text-ink-2">{user.favorites}</span>
          </Link>
          <Link
            role="menuitem"
            href="/kabinet/profil/"
            className={item}
            onClick={() => setOpen(false)}
          >
            <ProfileCircle size={18} /> Profil
          </Link>
          {user.isAdmin && (
            <Link
              role="menuitem"
              href="/admin/"
              className={item}
              onClick={() => setOpen(false)}
            >
              <Setting2 size={18} /> Admin panel
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
            <MessageQuestion size={18} /> Yordam
          </a>
          <button
            role="menuitem"
            type="button"
            onClick={onLogout}
            className={`${item} w-full text-left`}
          >
            <LogoutCurve size={18} /> Chiqish
          </button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const router = useRouter();
  const { me, reload, loading: meLoading } = useMe();
  const user: HeaderUser = me?.user
    ? {
        name: me.user.name,
        phone: me.user.phone,
        telegramUser: me.user.telegramUser,
        orders: me.counts.orders,
        favorites: me.counts.favorites,
        isAdmin: me.user.isAdmin,
      }
    : null;
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    await reload();
    setMenuOpen(false);
    router.push("/");
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const { compact, hidden } = useScrollHeader();

  return (
    <>
      {/* Header fixed: balandligi o‘zgarganda sahifa siljimaydi (joy ushlagich) */}
      <div aria-hidden className="h-[69px] lg:h-[87px]" />
      <header
        className={`fixed inset-x-0 top-0 z-40 border-b border-line bg-bg-base/[0.97] will-change-transform transition-[transform,box-shadow] duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          compact ? "shadow-[0_8px_24px_-18px_rgba(38,20,10,0.35)]" : ""
        } ${hidden && !menuOpen ? "-translate-y-[calc(100%+2px)]" : "translate-y-0"}`}
      >
        <div
          className={`mx-auto flex max-w-[1440px] items-center justify-between px-5 transition-[height] duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:px-10 xl:px-[120px] ${
            compact ? "h-[55px] lg:h-[70px]" : "h-[69px] lg:h-[87px]"
          }`}
        >
          <Logo />

          <nav
            className="hidden items-center gap-6 lg:flex xl:gap-8"
            aria-label="Asosiy"
          >
            {mainNav.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="t-nav text-ink transition-colors hover:text-maroon"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2.5 lg:flex">
            <LangSwitcher />
            <a href={site.telegram} className="icon-btn" aria-label="Telegram">
              <TelegramIcon size={18} />
            </a>
            <a
              href={site.phoneHref}
              className="icon-btn max-xl:!hidden"
              aria-label="Qo‘ng‘iroq"
            >
              <Call size={18} />
            </a>
            {user ? (
              <AccountMenu user={user} onLogout={logout} />
            ) : meLoading && !me ? (
              <span className="ml-1 h-9 w-[104px]" aria-hidden />
            ) : (
              <Link href="/kirish/" className="btn btn-primary btn-sm ml-1">
                <ProfileCircle size={18} /> Kirish
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <LangSwitcher compact />
            <a
              href={site.telegram}
              className="icon-btn !h-10 !w-10"
              aria-label="Telegram"
            >
              <TelegramIcon size={18} />
            </a>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="icon-btn !h-10 !w-10"
              aria-label="Menyuni ochish"
            >
              <HambergerMenu size={20} />
            </button>
          </div>
        </div>
      </header>
      {menuOpen && (
        <MobileMenu
          onClose={() => setMenuOpen(false)}
          user={user}
          onLogout={logout}
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
