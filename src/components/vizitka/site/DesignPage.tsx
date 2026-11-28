"use client";

import { useState } from "react";
import Link from "@/components/LocalLink";
import { lpath, useLocale, useT } from "@/lib/i18n";
import { ArrowLeft, Eye, Messages, TickCircle } from "@/components/icons";
import { discountPercent, formatPrice } from "@/lib/format";
import { site } from "@/lib/site";
import { CARD_DESIGNS, cardDesign } from "@/lib/cards";
import { CARD_PAGES } from "@/lib/cardTypes";
import { DeviceToggle } from "@/components/catalog/QuickView";
import { LaptopFrame, PhoneFrame } from "@/components/mockups/Devices";
import { HtmlFrame } from "@/components/mockups/HtmlFrame";
import { OrderCardButton } from "./OrderCardButton";
import { DesignCard, designAudience, designHighlights } from "./DesignCard";

/** Har bir vizitkada bor imkoniyatlar */
const common = ["QR kod", "Kontaktni saqlash (.vcf)", "UZ / RU / EN", "Ko‘rishlar statistikasi", "Telefon va kompyuter", "Istalgan payt tahrirlash"];

/** /vizitka/<slug>/ — dizayn sahifasi: jonli ko‘rinish, tavsif, narx va «Buyurtma berish» */
export function DesignPage({ slug }: { slug: string }) {
  const d = cardDesign(slug);
  const t = useT();
  const locale = useLocale();
  const [device, setDevice] = useState<"laptop" | "phone">("phone");

  if (!d) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-[640px] flex-col items-center justify-center gap-5 px-5 text-center">
        <h1 className="font-serif text-[40px] font-light text-ink">{t("Dizayn topilmadi")}</h1>
        <Link href={CARD_PAGES.catalog} className="btn btn-primary">
          {t("Barcha dizaynlar")}
        </Link>
      </div>
    );
  }

  const off = discountPercent(d.priceOld, d.price);
  const demo = `${lpath(locale, CARD_PAGES.demo(d.slug))}?embed=1`;
  const others = CARD_DESIGNS.filter((x) => x.active && x.slug !== d.slug);

  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-24 pt-8 lg:px-10 xl:px-[120px] lg:pt-10">
      <Link href={CARD_PAGES.catalog} className="inline-flex items-center gap-2 t-nav text-ink-2 hover:text-maroon">
        <ArrowLeft size={16} /> {t("Raqamli vizitka")}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-14">
        <div className="flex min-w-0 flex-col items-center gap-6 rounded-card bg-bg-soft p-5 lg:p-10">
          <div className="flex w-full items-center justify-between gap-3">
            <DeviceToggle value={device} onChange={setDevice} />
            <span className="hidden t-body-s text-ink-2 sm:inline">{t("Namuna jonli — aylantirib ko‘ring")}</span>
          </div>
          <div className={`flex w-full flex-1 items-center justify-center lg:min-h-[600px] ${device === "laptop" ? "min-h-[200px] sm:min-h-[380px]" : "min-h-[480px]"}`}>
            {device === "laptop" ? (
              <LaptopFrame className="w-full">
                <HtmlFrame src={demo} baseWidth={1440} delay={0} interactive />
              </LaptopFrame>
            ) : (
              <PhoneFrame dark={d.dark} className="w-full max-w-[280px] lg:max-w-[300px]">
                <div className="absolute inset-0 pt-[12cqw]" style={{ background: d.palette[0] }}>
                  <HtmlFrame src={demo} baseWidth={390} delay={0} interactive />
                </div>
              </PhoneFrame>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-7 lg:pt-4">
          <div className="flex flex-col gap-3">
            <span className="t-nav text-gold">{t("Vizitka dizayni")} · {String(d.number).padStart(2, "0")}</span>
            <h1 className="font-serif text-[44px] font-light leading-none text-ink lg:text-[60px]">{d.name}</h1>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-bg-soft px-2.5 py-1 t-body-s text-ink">{t(designAudience[d.slug] ?? "")}</span>
              <span className="rounded-full bg-bg-soft px-2.5 py-1 t-body-s text-ink">{t(d.dark ? "Qorong‘i" : "Yorug‘")}</span>
              <span className="rounded-full bg-bg-soft px-2.5 py-1 t-body-s text-ink">{t("Telefon va kompyuter")}</span>
            </div>
          </div>
          <p className="t-body-l text-ink-2">{d.description[locale] || d.description.uz}</p>

          <div className="flex flex-col gap-3">
            <p className="t-title text-ink">{t("Sahifada nimalar bor")}</p>
            <ul className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
              {[...(designHighlights[d.slug] ?? []), ...common].map((f) => (
                <li key={f} className="flex items-center gap-2 t-body-m text-ink">
                  <TickCircle size={16} color="var(--color-gold)" className="shrink-0" /> {t(f)}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-1 rounded-panel border border-line p-5">
            <span className="t-body-s text-ink-2">{t("Narxi · bir martalik to‘lov")}</span>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-serif text-[34px] font-medium leading-none text-maroon">{formatPrice(d.price, true, locale)}</span>
              {off > 0 && (
                <>
                  <s className="t-body-m text-ink-2">{formatPrice(d.priceOld, false, locale)}</s>
                  <span className="rounded-full bg-maroon px-2 py-0.5 t-body-s text-ink-inverse">−{off}%</span>
                </>
              )}
            </div>
            <span className="t-body-s text-ink-2">{t("Oylik to‘lov yo‘q — vizitka muddatsiz ishlaydi")}</span>
          </div>

          <div className="flex flex-col gap-2.5">
            <OrderCardButton design={d.slug} auto />
            <div className="flex flex-wrap gap-2.5">
              <Link href={CARD_PAGES.demo(d.slug)} className="btn btn-secondary btn-sm min-w-[136px] flex-1">
                <Eye size={15} /> {t("Jonli demo")}
              </Link>
              <a href={site.telegram} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm min-w-[136px] flex-1">
                <Messages size={15} /> {t("Savol berish")}
              </a>
            </div>
          </div>
        </div>
      </div>

      {others.length > 0 && (
        <section className="mt-24">
          <h2 className="t-display-section text-[34px] lg:text-[52px]">
            {t("vizitka::Boshqa")} <em className="italic text-maroon">{t("vizitka::dizayn")}</em>
          </h2>
          <div className="mt-10 grid gap-x-6 gap-y-12 md:grid-cols-2">
            {others.map((x) => (
              <DesignCard key={x.slug} d={x} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
