"use client";

import Link from "@/components/LocalLink";
import { useT } from "@/lib/i18n";
import { LogoMark } from "@/components/Logo";
import { Call, Instagram, ShieldTick, Whatsapp } from "@/components/icons";
import { TelegramIcon } from "./TelegramIcon";
import { site } from "@/lib/site";

const columns = [
  {
    title: "Sahifalar",
    links: [
      { label: "Shablonlar", href: "/shablonlar/" },
      { label: "Qanday ishlaydi", href: "/#qanday-ishlaydi" },
      { label: "Imkoniyatlar", href: "/#imkoniyatlar" },
      { label: "Savollar", href: "/#savollar" },
      { label: "Aloqa", href: "/#aloqa" },
    ],
  },
  {
    title: "Marosimlar",
    links: [
      { label: "Nikoh to‘yi", href: "/shablonlar/?marosim=nikoh" },
      { label: "Sunnat to‘yi", href: "/shablonlar/?marosim=sunnat" },
      { label: "Fotiha to‘yi", href: "/shablonlar/?marosim=fotiha" },
      { label: "Tug‘ilgan kun", href: "/shablonlar/?marosim=tugilgan-kun" },
    ],
  },
  {
    title: "Buyurtma",
    links: [
      { label: "Individual brif", href: "/maxsus-dizayn/" },
      { label: "To‘lov usullari", href: "/#qanday-ishlaydi" },
      { label: "Telegram orqali", href: site.telegram },
    ],
  },
];

const socials = [
  { label: "Telegram", href: site.telegram, icon: <TelegramIcon size={17} /> },
  { label: "Instagram", href: site.instagram, icon: <Instagram size={17} /> },
  { label: "WhatsApp", href: site.whatsapp, icon: <Whatsapp size={17} /> },
  { label: "Qo‘ng‘iroq", href: site.phoneHref, icon: <Call size={17} /> },
];

/** To‘liq footer (Figma 75:6312) — maroon-deep fon */
export function Footer() {
  const t = useT();
  return (
    <footer className="overflow-hidden bg-maroon-deep text-ink-inverse">
      <div className="mx-auto max-w-[1440px] px-5 pt-16 lg:px-10 xl:px-[120px] lg:pt-24">
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between">
          <div className="flex flex-col gap-[18px]">
            <Link href="/" className="inline-flex items-center gap-2.5" aria-label={t("Shohnoma — bosh sahifa")}>
              <LogoMark light className="h-11 w-auto" />
            </Link>
            <p className="t-body-s w-[260px] opacity-70">{t("Marosimlar uchun shohona taklifnoma saytlari.")}</p>
            <div className="flex gap-2.5">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={t(s.label)}
                  className="flex size-10 items-center justify-center rounded-full border border-ink-inverse/30 transition-colors hover:bg-white/10"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:gap-[133px]">
            {columns.map((c) => (
              <div key={c.title} className="flex w-[180px] max-w-full flex-col gap-3.5">
                <p className="t-annotation text-[#e2c48c]">{t(c.title)}</p>
                {c.links.map((l) => (
                  <Link key={l.label} href={l.href} className="t-body-m opacity-85 transition-opacity hover:opacity-100">
                    {t(l.label)}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative mx-auto h-[110px] max-w-[1440px] overflow-hidden lg:h-[230px]" aria-hidden>
        <span className="absolute left-3 top-6 select-none whitespace-nowrap font-serif text-[150px] font-light italic leading-none tracking-[-0.01em] text-ink-inverse/10 lg:left-[118px] lg:top-10 lg:text-[330px]">
          Shohnoma
        </span>
      </div>

      <div className="border-t border-ink-inverse/15">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-5 pb-7 pt-6 t-body-s opacity-60 sm:flex-row sm:justify-between lg:px-10 xl:px-[120px]">
          <span>© 2026 Shohnoma</span>
          <span>Payme&nbsp; · &nbsp;Click&nbsp; · &nbsp;Google Pay&nbsp; · &nbsp;P2P</span>
        </div>
      </div>
    </footer>
  );
}

/** Qisqa footer — buyurtma oqimi va kabinet uchun */
export function FooterCompact() {
  const t = useT();
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-5 py-6 t-body-s text-ink-2 lg:flex-row lg:items-center lg:justify-between lg:px-10 xl:px-[120px]">
        <span className="inline-flex items-center gap-2">
          <ShieldTick size={16} color="var(--color-gold)" />
          {t("Ma’lumotlaringiz faqat taklifnoma uchun ishlatiladi")}
        </span>
        <span>© 2026 Shohnoma · Payme · Click · Google Pay · P2P</span>
      </div>
    </footer>
  );
}
