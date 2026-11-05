"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, Heart, MonitorMobbile, PlayCircle, Tag } from "@/components/icons";
import { GirihPattern } from "./Ornament";
import type { Template } from "@/lib/templates";
import { ceremonyLabel, styleLabel } from "@/lib/templates";
import { discountPercent, formatPrice } from "@/lib/format";
import { LaptopFrame, PhoneFrame } from "./mockups/Devices";
import { InvitationScreen } from "./mockups/InvitationScreen";
import { InvitationDesktop } from "./mockups/InvitationDesktop";

const FAV_KEY = "shohnoma:favorites";

/** Sevimlilar — kirmagan foydalanuvchi uchun localStorage (spec §6.13 tavsiya) */
export function useFavorite(slug: string) {
  const [fav, setFav] = useState(false);
  useEffect(() => {
    try {
      setFav((JSON.parse(localStorage.getItem(FAV_KEY) || "[]") as string[]).includes(slug));
    } catch {}
  }, [slug]);
  const toggle = () => {
    try {
      const list = new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]") as string[]);
      if (list.has(slug)) list.delete(slug);
      else list.add(slug);
      localStorage.setItem(FAV_KEY, JSON.stringify([...list]));
      setFav(list.has(slug));
    } catch {}
  };
  return [fav, toggle] as const;
}

export function isDarkTheme(t: Template) {
  const hex = t.theme.bg[0].replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

/** Kartadagi sahna: girih fonida laptop + telefon (Figma 95:11492: 560×380) */
export function DevicePreview({ t, className = "" }: { t: Template; className?: string }) {
  return (
    <div className={`relative aspect-[560/380] overflow-hidden rounded-[18px] bg-gradient-to-b from-[#efe4d3] to-[#f8f3eb] ${className}`}>
      <GirihPattern id={`girih-${t.slug}`} cell={62} color="#c9a25e" opacity={0.22} className="absolute inset-0" />
      <div className="absolute left-[0.7%] top-[12.6%] w-[89.3%]">
        <LaptopFrame className="w-full">
          <InvitationDesktop t={t} />
        </LaptopFrame>
      </div>
      <PhoneFrame dark={isDarkTheme(t)} className="absolute left-[72.1%] top-[21.6%] w-[23.6%]">
        <InvitationScreen t={t} />
      </PhoneFrame>
    </div>
  );
}

export function TemplateCard({ t, onQuickView }: { t: Template; onQuickView?: (t: Template) => void }) {
  const [fav, toggleFav] = useFavorite(t.slug);
  const off = discountPercent(t.priceOld, t.price);

  return (
    <article className="group flex flex-col gap-[18px] rounded-[26px] border border-line bg-bg-base p-3.5 pb-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-16px_rgba(38,20,10,0.22)]">
      <div className="relative">
        <DevicePreview t={t} />
        {onQuickView && (
          <button
            type="button"
            onClick={() => onQuickView(t)}
            className="absolute inset-x-0 bottom-4 mx-auto flex w-fit items-center gap-2 rounded-full bg-bg-base/95 px-4 py-2.5 t-nav text-ink opacity-0 shadow-soft transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Eye size={15} /> Tezkor ko‘rish
          </button>
        )}
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-maroon px-3 py-1.5 text-[12px] font-medium leading-none text-[#e2c48c]">
            <Tag size={13} /> Aksiya&nbsp;&nbsp;−{off}%
          </span>
          <span className="rounded-full bg-white/90 px-3 py-1.5 text-[12px] leading-none text-ink">{styleLabel[t.style]}</span>
        </div>
        <button
          type="button"
          onClick={toggleFav}
          aria-pressed={fav}
          aria-label={fav ? "Sevimlilardan olib tashlash" : "Sevimlilarga qo‘shish"}
          className={`absolute right-3.5 top-3.5 flex size-9 items-center justify-center rounded-full bg-white/90 transition-transform hover:scale-105 ${fav ? "text-maroon" : "text-ink"}`}
        >
          <Heart size={16} variant={fav ? "Bold" : "Linear"} />
        </button>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 px-1.5">
        <div className="flex min-w-0 flex-col gap-2">
          <h3 className="font-serif text-[26px] font-medium leading-[1.2] text-ink lg:text-[32px]">{t.name}</h3>
          <div className="flex flex-wrap items-center gap-2.5 text-[13px] leading-[1.5] text-ink-2">
            <span className="inline-flex items-center gap-1.5">
              <Heart size={14} /> {ceremonyLabel[t.ceremony]}
            </span>
            <span className="size-[3px] rounded-full bg-ink-2" />
            <span className="inline-flex items-center gap-1.5">
              <MonitorMobbile size={14} /> Telefon va laptop
            </span>
            <span className="size-[3px] rounded-full bg-ink-2" />
            <span className="flex" aria-label="Ranglar">
              {t.palette.slice(0, 3).map((c, i) => (
                <span key={c} className="size-3.5 rounded-full ring-2 ring-bg-base" style={{ background: c, marginLeft: i ? -4 : 0 }} />
              ))}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <s className="text-[13px] leading-[1.5] text-ink-2">{formatPrice(t.priceOld)}</s>
          <span className="font-serif text-[26px] font-medium leading-[1.2] text-maroon lg:text-[30px]">{formatPrice(t.price)}</span>
        </div>
      </div>

      <div className="flex gap-2.5">
        <Link href={`/shablonlar/${t.slug}`} className="btn btn-secondary flex-1 !px-3 !py-3.5">
          <PlayCircle size={16} /> Jonli ko‘rish
        </Link>
        <Link href={`/buyurtma/${t.slug}/marosim`} className="btn btn-primary flex-1 !px-3 !py-3.5">
          Tanlash <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  );
}
