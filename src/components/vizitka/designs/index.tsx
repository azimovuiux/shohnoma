"use client";

/**
 * Vizitka dizaynlari: slug → komponent. Uch rejim:
 *  - CardView — umumiy (CardPublic ichida),
 *  - CardDemo — /vizitka/namuna/<slug>/ (CARD_DEMO, namuna rasmlari, lead forma soxta yuboriladi, .vcf brauzerda),
 *  - CardPreview — buyurtma formasidagi telefon ramkasi (harakatsiz, birinchi kadr).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CardContent, CardDesignSlug, CardLang } from "@/lib/cardTypes";
import { CARD_DEMO } from "@/lib/cards";
import { useLocale } from "@/lib/i18n";
import { NoirCard } from "./noir/NoirCard";
import { LumenCard } from "./lumen/LumenCard";
import { ShareSheet } from "./shared/ShareSheet";
import { downloadVcard } from "./shared/vcard";
import { DEMO_PHOTOS, type CardActions, type CardMode, type CardViewProps } from "./shared/runtime";

export type { CardActions, CardMode, CardViewProps };

const MAP: Record<CardDesignSlug, (p: CardViewProps) => React.ReactElement> = {
  "v-noir": NoirCard,
  "v-lumen": LumenCard,
};

export const isDarkDesign = (d: CardDesignSlug) => d === "v-noir";

export function CardView({ design, ...p }: CardViewProps & { design: CardDesignSlug }) {
  const C = MAP[design] ?? NoirCard;
  return <C {...p} />;
}

/**
 * Figma kadridagi namuna: Noir dizaynida veb-sayt qatori yo‘q (Figma «Kontaktlar»: telefon, email, Telegram, ofis) —
 * namunada ham ko‘rsatilmaydi, bo‘lim balandliklari Figma bilan teng qolsin.
 */
export function demoContent(design: CardDesignSlug): CardContent {
  const c = CARD_DEMO[design];
  return design === "v-noir" ? { ...c, website: "" } : c;
}

/** Sahifa holati: karta tili + QR/ulashish oynasi */
export function useCardChrome(initial: CardLang) {
  const [lang, setLang] = useState<CardLang>(initial);
  const [sheet, setSheet] = useState(false);
  useEffect(() => setLang(initial), [initial]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const closeSheet = useCallback(() => setSheet(false), []);
  return { lang, setLang, sheet, openSheet: () => setSheet(true), closeSheet };
}

/** Ulashish: telefonda tizim menyusi, aks holda QR oynasi */
export function shareOrSheet(title: string, url: string, openSheet: () => void) {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function" && matchMedia("(pointer: coarse)").matches) {
    navigator.share({ title, url }).catch(() => {});
    return;
  }
  openSheet();
}

/** /vizitka/namuna/<slug>/ — jonli namuna (C sahifasi shu komponentni chiqaradi) */
export function CardDemo({ slug, lang: langProp }: { slug: CardDesignSlug; lang?: CardLang }) {
  const locale = useLocale();
  const chrome = useCardChrome(langProp ?? locale);
  const card = useMemo(() => demoContent(slug), [slug]);
  const [url, setUrl] = useState("https://shohnoma.uz/vizitka/");
  useEffect(() => setUrl(window.location.href.split("?")[0]), []);
  const actions: CardActions = {
    save: () => downloadVcard(card, chrome.lang, url),
    share: () => shareOrSheet(card.fullName, url, chrome.openSheet),
    qr: chrome.openSheet,
    lead: () => new Promise((r) => setTimeout(r, 700)),
  };
  return (
    <>
      <CardView design={slug} card={card} lang={chrome.lang} onLang={chrome.setLang} mode="demo" actions={actions} />
      <ShareSheet open={chrome.sheet} onClose={chrome.closeSheet} url={url} name={card.fullName} lang={chrome.lang} dark={isDarkDesign(slug)} />
    </>
  );
}

/**
 * Buyurtma formasidagi jonli ko‘rinish (telefon ramkasi ichida). Ism hali kiritilmagan bo‘lsa — namuna ko‘rsatiladi.
 * Ramka o‘rami `transform` bilan — kartaning fixed panellari ramka ichida qoladi.
 */
export function CardPreview({ design, card, lang, onLang }: { design: CardDesignSlug; card: CardContent; lang: CardLang; onLang: (l: CardLang) => void }) {
  const shown = useMemo(() => (card.fullName.trim() ? card : { ...demoContent(design), photos: DEMO_PHOTOS[design] ?? [] }), [card, design]);
  const noop = () => {};
  return <CardView design={design} card={shown} lang={lang} onLang={onLang} mode="preview" actions={{ save: noop, share: noop, qr: noop }} />;
}
