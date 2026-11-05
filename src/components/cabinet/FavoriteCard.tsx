"use client";

import Link from "next/link";
import { ArrowRight, Eye, Heart } from "@/components/icons";
import { useFavorite, isDarkTheme } from "@/components/TemplateCard";
import { PhoneFrame } from "@/components/mockups/Devices";
import { InvitationScreen } from "@/components/mockups/InvitationScreen";
import { getTemplate, ceremonyLabel, styleLabel } from "@/lib/templates";
import { discountPercent, formatPrice } from "@/lib/format";

/** 23 — Sevimlilar kartasi (gorizontal) */
export function FavoriteCard({ slug, onChange }: { slug: string; onChange?: () => void }) {
  const t = getTemplate(slug)!;
  const [fav, toggle] = useFavorite(slug);
  const off = discountPercent(t.priceOld, t.price);
  return (
    <article className="flex gap-4 rounded-card border border-line bg-bg-base p-3.5 sm:gap-5">
      <div className="relative flex h-[196px] w-[150px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-[#efe4d3] to-[#f8f3eb]">
        <PhoneFrame dark={isDarkTheme(t)} className="w-[78px]">
          <InvitationScreen t={t} />
        </PhoneFrame>
        <button
          type="button"
          onClick={async () => {
            await toggle();
            onChange?.();
          }}
          aria-pressed={fav}
          aria-label={fav ? "Sevimlilardan olib tashlash" : "Sevimlilarga qo‘shish"}
          className="absolute right-2.5 top-2.5 flex size-8 items-center justify-center rounded-full bg-white/90 text-maroon"
        >
          <Heart size={15} variant={fav ? "Bold" : "Linear"} />
        </button>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 py-1">
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-[24px] font-medium leading-[1.2] text-ink">{t.name}</h2>
          <p className="t-body-s text-ink-2">
            {ceremonyLabel[t.ceremony]} · {styleLabel[t.style]}
          </p>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-[22px] font-medium leading-none text-maroon">{formatPrice(t.price)}</span>
          <s className="t-body-s text-ink-2">{formatPrice(t.priceOld, false)}</s>
          <span className="t-body-s text-ink-2">−{off}%</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/buyurtma/${t.slug}/marosim/`} className="btn btn-primary btn-sm !py-3">
            Tanlash <ArrowRight size={15} />
          </Link>
          <Link href={`/shablonlar/${t.slug}/`} className="btn btn-secondary btn-sm !py-3">
            <Eye size={15} /> Ko‘rish
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Kirgandan keyin localStorage'dagi sevimlilarni serverga ko‘chirish */
export function FavoritesMigrate({ onDone }: { onDone?: () => void }) {
  return (
    <span
      hidden
      ref={(el) => {
        if (!el || typeof window === "undefined") return;
        try {
          const local = JSON.parse(localStorage.getItem("shohnoma:favorites") || "[]") as string[];
          if (!local.length) return;
          localStorage.removeItem("shohnoma:favorites");
          fetch("/api/me/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slugs: local }) }).then(() => onDone?.());
        } catch {}
      }}
    />
  );
}
