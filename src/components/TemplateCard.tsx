"use client";

import Link from "@/components/LocalLink";
import { useLocale, useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, Heart, MonitorMobbile, PlayCircle, Tag } from "@/components/icons";
import { GirihPattern } from "./Ornament";
import { useToast } from "./ui";
import type { Template } from "@/lib/templates";
import { ceremonyNames, styleLabel, tplImages } from "@/lib/templates";
import { discountPercent, formatPrice } from "@/lib/format";
import { LaptopFrame, PhoneFrame } from "./mockups/Devices";
import { InvitationScreen } from "./mockups/InvitationScreen";
import { InvitationDesktop } from "./mockups/InvitationDesktop";
import { ScrollShot, useShotActive } from "./mockups/ScrollShot";

const FAV_KEY = "shohnoma:favorites";

/**
 * Sevimlilar (spec §6.13). Kirmagan foydalanuvchi — localStorage;
 * kirgan foydalanuvchi — server (/api/me/favorites). Kirgandan so‘ng localStorage serverga ko‘chiriladi.
 */
let serverFavs: Promise<Set<string> | null> | null = null;
const favListeners = new Set<() => void>();

function readLocal() {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]") as string[]);
  } catch {
    return new Set<string>();
  }
}

function loadServerFavs() {
  serverFavs ??= fetch("/api/me/favorites")
    .then((r) => r.json())
    .then(async (j: { slugs: string[] | null }) => {
      if (!j.slugs) return null;
      const set = new Set(j.slugs);
      const local = [...readLocal()].filter((x) => !set.has(x));
      if (local.length) {
        await fetch("/api/me/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slugs: local }) }).catch(() => undefined);
        local.forEach((x) => set.add(x));
      }
      localStorage.removeItem(FAV_KEY);
      return set;
    })
    .catch(() => null);
  return serverFavs;
}

export function useFavorite(slug: string) {
  const [fav, setFav] = useState(false);
  const toast = useToast();
  const tt = useT();
  useEffect(() => {
    let alive = true;
    const sync = async () => {
      const server = await loadServerFavs();
      if (alive) setFav(server ? server.has(slug) : readLocal().has(slug));
    };
    sync();
    favListeners.add(sync);
    return () => {
      alive = false;
      favListeners.delete(sync);
    };
  }, [slug]);
  const toggle = async () => {
    const next = !fav;
    setFav(next);
    const server = await loadServerFavs();
    if (server) {
      if (next) server.add(slug);
      else server.delete(slug);
      fetch("/api/me/favorites", { method: next ? "POST" : "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }) }).catch(() => undefined);
    } else {
      const list = readLocal();
      if (next) list.add(slug);
      else list.delete(slug);
      try {
        localStorage.setItem(FAV_KEY, JSON.stringify([...list]));
      } catch {}
    }
    favListeners.forEach((f) => f());
    toast(next ? tt("Sevimlilarga qo‘shildi") : tt("Sevimlilardan olib tashlandi"));
  };
  return [fav, toggle] as const;
}

export function isDarkTheme(t: Template) {
  const hex = t.theme.bg[0].replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

/** Kartadagi sahna: girih fonida laptop + telefon (Figma 95:11492: 560×380). Uzun rasm bo‘lsa — ekranlar scroll bo‘ladi */
export function DevicePreview({ t, className = "" }: { t: Template; className?: string }) {
  const shot = useShotActive<HTMLDivElement>();
  const locale = useLocale();
  const im = !t.isLive ? tplImages(t, locale) : undefined;
  const scroll = !!(im?.phoneScroll && im?.laptopScroll && im.phone && im.laptop);
  return (
    <div ref={shot.ref} className={`relative aspect-[560/380] overflow-hidden rounded-[18px] bg-gradient-to-b from-[#efe4d3] to-[#f8f3eb] ${className}`}>
      <GirihPattern id={`girih-${t.slug}`} cell={62} color="#c9a25e" opacity={0.22} className="absolute inset-0" />
      <div className="absolute left-[0.7%] top-[12.6%] w-[89.3%]">
        <LaptopFrame className="w-full">{scroll ? <ScrollShot poster={im!.laptop!} long={im!.laptopScroll!} active={shot.active} warm={shot.warm} /> : <InvitationDesktop t={t} />}</LaptopFrame>
      </div>
      <PhoneFrame dark={isDarkTheme(t)} className="absolute left-[72.1%] top-[21.6%] w-[23.6%]">
        {scroll ? <ScrollShot poster={im!.phone!} long={im!.phoneScroll!} active={shot.active} warm={shot.warm} speed={0.9} /> : <InvitationScreen t={t} />}
      </PhoneFrame>
    </div>
  );
}

export function TemplateCard({ t, onQuickView, reveal, delay = 0 }: { t: Template; onQuickView?: (t: Template) => void; reveal?: boolean; delay?: number }) {
  const [fav, toggleFav] = useFavorite(t.slug);
  const off = discountPercent(t.priceOld, t.price);
  const tt = useT();
  const locale = useLocale();

  return (
    <article
      {...(reveal ? { "data-reveal": "up", style: { ["--d" as string]: `${delay}ms` } as React.CSSProperties } : {})}
      className="group flex flex-col gap-[18px] rounded-[26px] border border-line bg-bg-base p-3.5 pb-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-16px_rgba(38,20,10,0.22)]">
      <div className="relative">
        <DevicePreview t={t} />
        {onQuickView && (
          <button
            type="button"
            onClick={() => onQuickView(t)}
            className="absolute inset-x-0 bottom-4 mx-auto flex w-fit items-center gap-2 rounded-full bg-bg-base/95 px-4 py-2.5 t-nav text-ink opacity-0 shadow-soft transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Eye size={15} /> {tt("Tezkor ko‘rish")}
          </button>
        )}
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {off > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-maroon px-3 py-1.5 text-[12px] font-medium leading-none text-[#e2c48c]">
              <Tag size={13} /> {tt("Aksiya")}&nbsp;&nbsp;−{off}%
            </span>
          )}
          <span className="rounded-full bg-white/90 px-3 py-1.5 text-[12px] leading-none text-ink">{tt(styleLabel[t.style])}</span>
        </div>
        <button
          type="button"
          onClick={toggleFav}
          aria-pressed={fav}
          aria-label={fav ? tt("Sevimlilardan olib tashlash") : tt("Sevimlilarga qo‘shish")}
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
              <Heart size={14} /> {ceremonyNames(t, tt)}
            </span>
            <span className="size-[3px] rounded-full bg-ink-2" />
            <span className="inline-flex items-center gap-1.5">
              <MonitorMobbile size={14} /> {tt("Telefon va laptop")}
            </span>
          </div>
        </div>
        <div className="flex items-baseline gap-2.5">
          <span className="font-serif text-[26px] font-medium leading-[1.2] text-maroon lg:text-[30px]">{formatPrice(t.price, true, locale)}</span>
          {off > 0 && <s className="whitespace-nowrap text-[13px] leading-[1.5] text-ink-2">{formatPrice(t.priceOld, true, locale)}</s>}
        </div>
      </div>

      <div className="flex gap-2.5">
        <Link href={`/namuna/${t.slug}/`} className="btn btn-secondary flex-1 !px-3 !py-3.5">
          <PlayCircle size={16} /> {tt("Jonli ko‘rish")}
        </Link>
        <Link href={`/buyurtma/${t.slug}/marosim/`} className="btn btn-primary flex-1 !px-3 !py-3.5">
          {tt("Tanlash")} <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  );
}
