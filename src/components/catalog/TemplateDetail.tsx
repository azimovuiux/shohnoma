"use client";

import Link from "@/components/LocalLink";
import { useLocale, useT } from "@/lib/i18n";
import { useState } from "react";
import { ArrowRight, Eye, Heart, Messages, TickCircle } from "@/components/icons";
import type { Template } from "@/lib/templates";
import { ceremonyLabel, styleLabel, templateFeatures, tplCeremonies, type Ceremony } from "@/lib/templates";
import { categoryName, getCategory } from "@/lib/categories";
import { CategoryIcon } from "@/lib/categoryIcons";
import { discountPercent, formatPrice } from "@/lib/format";
import { DeviceToggle, TemplatePreviewStage } from "./QuickView";
import { useFavorite } from "@/components/TemplateCard";
import { site } from "@/lib/site";

export function TemplateDetail({ t }: { t: Template }) {
  const [device, setDevice] = useState<"laptop" | "phone">("laptop");
  const [fav, toggleFav] = useFavorite(t.slug);
  const off = discountPercent(t.priceOld, t.price);
  const tt = useT();
  const locale = useLocale();

  return (
    <div className="mt-6 grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-14">
      <div className="flex flex-col items-center gap-6 rounded-card bg-bg-soft p-5 lg:p-10">
        <div className="flex w-full items-center justify-between">
          <DeviceToggle value={device} onChange={setDevice} />
          <button type="button" onClick={toggleFav} aria-pressed={fav} aria-label={fav ? tt("Sevimlilardan olib tashlash") : tt("Sevimlilarga qo‘shish")} className="icon-btn bg-bg-base text-maroon">
            <Heart size={18} variant={fav ? "Bold" : "Linear"} />
          </button>
        </div>
        <div className={`flex w-full flex-1 items-center justify-center lg:min-h-[560px] ${device === "laptop" ? "min-h-[220px] sm:min-h-[380px]" : "min-h-[420px]"}`}>
          <TemplatePreviewStage t={t} device={device} large />
        </div>
      </div>

      <div className="flex flex-col gap-7 lg:pt-4">
        <div className="flex flex-col gap-3">
          <h1 className="font-serif text-[44px] font-light leading-none text-ink lg:text-[60px]">{t.name}</h1>
          <div className="flex flex-wrap gap-1.5">
            {tplCeremonies(t).map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5 rounded-full bg-bg-soft px-2.5 py-1 t-body-s text-ink">
                <span className="text-gold">
                  <CategoryIcon name={getCategory(c)?.icon} size={14} />
                </span>
                {categoryName(getCategory(c), locale) || tt(ceremonyLabel[c as Ceremony] ?? c)}
              </span>
            ))}
            <span className="rounded-full bg-bg-soft px-2.5 py-1 t-body-s text-ink">{tt(styleLabel[t.style])}</span>
            <span className="rounded-full bg-bg-soft px-2.5 py-1 t-body-s text-ink">{tt("Telefon va laptop")}</span>
          </div>
        </div>
        <p className="t-body-l text-ink-2">{(locale === "ru" && t.descriptionRu) || (locale === "en" && t.descriptionEn) || t.description}</p>

        <div className="flex flex-col gap-3">
          <p className="t-title text-ink">{tt("Saytda nimalar bor")}</p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {templateFeatures.map((f) => (
              <li key={f} className="flex items-center gap-2 t-body-m text-ink">
                <TickCircle size={16} color="var(--color-gold)" /> {tt(f)}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-1 rounded-panel border border-line p-5">
          <span className="t-body-s text-ink-2">{tt("Narxi")}</span>
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-[34px] font-medium leading-none text-maroon">{formatPrice(t.price, true, locale)}</span>
            {off > 0 && (
              <>
                <s className="t-body-m text-ink-2">{formatPrice(t.priceOld, false, locale)}</s>
                <span className="rounded-full bg-maroon px-2 py-0.5 t-body-s text-ink-inverse">−{off}%</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <Link href={`/buyurtma/${t.slug}/marosim/`} className="btn btn-primary w-full">
            {tt("Shu shablonni tanlash")} <ArrowRight size={16} />
          </Link>
          <div className="flex gap-2.5">
            <Link href={`/namuna/${t.slug}/`} className="btn btn-secondary btn-sm flex-1">
              <Eye size={15} /> {tt("Jonli demo")}
            </Link>
            <a href={site.telegram} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm flex-1">
              <Messages size={15} /> {tt("Savol berish")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
