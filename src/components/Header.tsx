"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowDown2, Call, CloseCircle, HambergerMenu, Instagram, Whatsapp, TickCircle } from "@/components/icons";
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
    const saved = document.cookie.match(/(?:^|; )lang=(uz|ru)/)?.[1] as Lang | undefined;
    if (saved) setLang(saved);
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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
              {lang === code && <TickCircle size={16} color="var(--color-maroon)" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileMenu({ onClose }: { onClose: () => void }) {
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
    { label: "Maxsus dizayn", href: "/maxsus-dizayn" },
    ...mainNav.slice(3),
  ];

  return (
    <div role="dialog" aria-modal="true" aria-label="Menyu" className="fixed inset-0 z-[60] flex flex-col bg-bg-base lg:hidden">
      <div className="flex h-[69px] items-center justify-between border-b border-line px-5">
        <Logo />
        <button type="button" onClick={onClose} className="icon-btn !h-10 !w-10" aria-label="Yopish">
          <CloseCircle size={20} />
        </button>
      </div>
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
        <Link href="/shablonlar" onClick={onClose} className="btn btn-primary w-full">
          Buyurtma berish
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <a href={site.telegram} className="icon-btn !h-10 !w-10" aria-label="Telegram">
              <TelegramIcon size={18} />
            </a>
            <a href={site.instagram} className="icon-btn !h-10 !w-10" aria-label="Instagram">
              <Instagram size={18} />
            </a>
            <a href={site.whatsapp} className="icon-btn !h-10 !w-10" aria-label="WhatsApp">
              <Whatsapp size={18} />
            </a>
            <a href={site.phoneHref} className="icon-btn !h-10 !w-10" aria-label="Qo‘ng‘iroq">
              <Call size={18} />
            </a>
          </div>
          <span className="t-body-s text-ink-2">{site.workHours}</span>
        </div>
      </div>
    </div>
  );
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg-base/95 backdrop-blur supports-[backdrop-filter]:bg-bg-base/85">
      <div className="mx-auto flex h-[69px] max-w-[1440px] items-center justify-between px-5 lg:h-[87px] lg:px-[120px]">
        <Logo />

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Asosiy">
          {mainNav.map((l) => (
            <Link key={l.href} href={l.href} className="t-nav text-ink transition-colors hover:text-maroon">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2.5 lg:flex">
          <LangSwitcher />
          <a href={site.telegram} className="icon-btn" aria-label="Telegram">
            <TelegramIcon size={18} />
          </a>
          <a href={site.phoneHref} className="icon-btn" aria-label="Qo‘ng‘iroq">
            <Call size={18} />
          </a>
          <Link href="/shablonlar" className="btn btn-primary btn-sm ml-1">
            Buyurtma berish
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <LangSwitcher compact />
          <a href={site.telegram} className="icon-btn !h-10 !w-10" aria-label="Telegram">
            <TelegramIcon size={18} />
          </a>
          <button type="button" onClick={() => setMenuOpen(true)} className="icon-btn !h-10 !w-10" aria-label="Menyuni ochish">
            <HambergerMenu size={20} />
          </button>
        </div>
      </div>
      {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} />}
    </header>
  );
}
