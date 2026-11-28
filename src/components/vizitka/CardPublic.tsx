"use client";

/**
 * /v/<slug>/ — ommaviy vizitka. Statik qobiq (/v/_/), haqiqiy slug URL'dan; ma’lumot GET /api/c/<slug> (faqat to‘langan).
 * «Kontaktni saqlash» → /api/c/<slug>/vcard (.vcf), lead forma → POST /api/c/<slug>/lead, QR oynasi — src/lib/qr.ts.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "@/components/LocalLink";
import { CARD_API, type CardLang, type CardPublicResponse } from "@/lib/cardTypes";
import { PageLoading, useApi } from "@/lib/client";
import { tr, useLocale } from "@/lib/i18n";
import { CardView, isDarkDesign, shareOrSheet, useCardChrome } from "./designs";
import { ShareSheet } from "./designs/shared/ShareSheet";
import { downloadUrl } from "./designs/shared/vcard";
import { loc } from "@/lib/cardTypes";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,79}$/;

/** URL'dan slug: /v/<slug>/ yoki /ru/v/<slug>/ */
function useCardSlug() {
  const [s, setS] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    const i = parts.indexOf("v");
    const v = i >= 0 ? decodeURIComponent(parts[i + 1] ?? "") : "";
    setS(v && v !== "_" && SLUG_RE.test(v) ? v : null);
  }, []);
  return s;
}

/** Karta tili: ?til=ru | /ru/v/… | sayt tili */
function initialLang(locale: CardLang): CardLang {
  if (typeof window === "undefined") return locale;
  const q = new URLSearchParams(window.location.search).get("til");
  return q === "uz" || q === "ru" || q === "en" ? q : locale;
}

function NotFound() {
  const lang = useLocale();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg-base px-6 text-center">
      <p className="font-serif text-[34px] font-light leading-tight text-ink">{tr(lang, "Vizitka topilmadi")}</p>
      <p className="t-body-m mt-3 max-w-[360px] text-ink-2">{tr(lang, "Havola eskirgan yoki xato yozilgan bo‘lishi mumkin. Vizitka egasidan havolani qayta so‘rang.")}</p>
      <Link href="/vizitka/" className="btn btn-secondary mt-8">
        Shohnoma.uz
      </Link>
    </main>
  );
}

export function CardPublicPage() {
  const slug = useCardSlug();
  const locale = useLocale();
  const { data, error } = useApi<CardPublicResponse>(slug ? CARD_API.public(slug) : null);
  const [lang0, setLang0] = useState<CardLang>(locale);
  useEffect(() => setLang0(initialLang(locale)), [locale]);
  const chrome = useCardChrome(lang0);
  const card = data?.card;

  useEffect(() => {
    if (!card) return;
    const role = [loc(card.position, chrome.lang), loc(card.company, chrome.lang)].filter(Boolean).join(", ");
    document.title = role ? `${card.fullName} — ${role}` : card.fullName;
    const meta = document.querySelector('meta[name="theme-color"]') ?? document.head.appendChild(Object.assign(document.createElement("meta"), { name: "theme-color" }));
    meta.setAttribute("content", isDarkDesign(card.design) ? "#0b0b0a" : "#f3eee7");
    document.body.style.background = isDarkDesign(card.design) ? "#0b0b0a" : "#f3eee7";
  }, [card, chrome.lang]);

  const url = useMemo(() => card?.url || (typeof window !== "undefined" ? window.location.href.split("?")[0] : ""), [card]);

  if (slug === undefined) return <PageLoading className="min-h-dvh" />;
  if (slug === null || error) return <NotFound />;
  if (!card) return <PageLoading className="min-h-dvh" />;

  return (
    <>
      <CardView
        design={card.design}
        card={card}
        lang={chrome.lang}
        onLang={chrome.setLang}
        mode="public"
        actions={{
          save: () => downloadUrl(`${card.vcardUrl || CARD_API.vcard(card.slug)}?lang=${chrome.lang}`),
          share: () => shareOrSheet(card.fullName, url, chrome.openSheet),
          qr: chrome.openSheet,
          lead: async (req) => {
            // xato matni karta tilida bo‘lishi uchun — HTTP holati bo‘yicha (429 — juda ko‘p urinish)
            const res = await fetch(CARD_API.publicLead(card.slug), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) });
            if (!res.ok) throw new Error(String(res.status));
          },
        }}
      />
      <ShareSheet open={chrome.sheet} onClose={chrome.closeSheet} url={url} name={card.fullName} lang={chrome.lang} dark={isDarkDesign(card.design)} />
    </>
  );
}
