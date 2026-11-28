"use client";

import Link from "@/components/LocalLink";
import { useLocale, useT } from "@/lib/i18n";
import { ArrowRight, PlayCircle, Tag } from "@/components/icons";
import { discountPercent, formatPrice } from "@/lib/format";
import { CARD_PAGES } from "@/lib/cardTypes";
import type { CardDesign } from "@/lib/cards";
import { CardDevicePreview } from "./shared";

/** Kimlar uchun (katalog kartasidagi qisqa yorliq) */
export const designAudience: Record<string, string> = {
  "v-noir": "Tadbirkor va rahbarlar uchun",
  "v-lumen": "Bloger, mentor va mutaxassislar uchun",
};
/** Dizayn bo‘limlari — qisqa ro‘yxat */
export const designHighlights: Record<string, string[]> = {
  "v-noir": ["Katta portret va ism", "Hamkorlik yo‘nalishlari", "Raqamlar va kompaniyalar", "«Kontakt qoldiring» formasi", "Kontaktlar va manzil"],
  "v-lumen": ["Portret va qisqa tavsif", "Ijtimoiy tarmoqlar plitkalari", "Havolalar ro‘yxati", "Kontakt kartasi", "Pastda suzuvchi «Saqlash» tugmasi"],
};

export function DesignCard({ d, reveal, delay = 0 }: { d: CardDesign; reveal?: boolean; delay?: number }) {
  const t = useT();
  const locale = useLocale();
  const off = discountPercent(d.priceOld, d.price);
  return (
    <article
      {...(reveal ? { "data-reveal": "up", style: { ["--d" as string]: `${delay}ms` } as React.CSSProperties } : {})}
      className="group flex flex-col gap-[18px] rounded-[26px] border border-line bg-bg-base p-3.5 pb-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-16px_rgba(38,20,10,0.22)]"
    >
      <Link href={CARD_PAGES.design(d.slug)} className="relative block" aria-label={t("{name} — batafsil", { name: d.name })}>
        <CardDevicePreview d={d} />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {off > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-maroon px-3 py-1.5 text-[12px] font-medium leading-none text-[#e2c48c]">
              <Tag size={13} /> {t("Aksiya")}&nbsp;&nbsp;−{off}%
            </span>
          )}
          <span className="rounded-full bg-white/90 px-3 py-1.5 text-[12px] leading-none text-ink">{t(d.dark ? "Qorong‘i" : "Yorug‘")}</span>
        </div>
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 px-1.5">
        <div className="flex min-w-0 flex-col gap-2">
          <h3 className="font-serif text-[26px] font-medium leading-[1.2] text-ink lg:text-[32px]">{d.name}</h3>
          <p className="flex items-center gap-2 text-[13px] leading-[1.5] text-ink-2">
            <span className="flex shrink-0 gap-1" aria-hidden>
              {d.palette.slice(0, 3).map((c) => (
                <span key={c} className="size-3 rounded-full ring-1 ring-black/10" style={{ background: c }} />
              ))}
            </span>
            {t(designAudience[d.slug] ?? "")}
          </p>
        </div>
        <div className="flex items-baseline gap-2.5">
          <span className="font-serif text-[26px] font-medium leading-[1.2] text-maroon lg:text-[30px]">{formatPrice(d.price, true, locale)}</span>
          {off > 0 && <s className="whitespace-nowrap text-[13px] leading-[1.5] text-ink-2">{formatPrice(d.priceOld, true, locale)}</s>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Link href={CARD_PAGES.demo(d.slug)} className="btn btn-secondary min-w-[128px] flex-1 !px-3 !py-3.5">
          <PlayCircle size={16} /> {t("Jonli ko‘rish")}
        </Link>
        <Link href={CARD_PAGES.design(d.slug)} className="btn btn-primary min-w-[128px] flex-1 !px-3 !py-3.5">
          {t("Tanlash")} <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  );
}
