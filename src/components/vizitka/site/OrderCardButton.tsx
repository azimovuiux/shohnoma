"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "@/components/icons";
import { useToast } from "@/components/ui";
import { useMe } from "@/lib/client";
import { lpath, useLocale, useT } from "@/lib/i18n";
import { CARD_API, CARD_PAGES, type CardCreateResponse, type CardDesignSlug } from "@/lib/cardTypes";

/** Buyurtma oqimining birinchi bosqichi (agent B: /vizitka/buyurtma/<id>/malumot/) */
export const cardFlowStart = (id: string) => `${CARD_PAGES.order(id)}malumot/`;

/**
 * «Buyurtma berish»: kirmagan bo‘lsa — avval kirish (qaytishda ?buyurtma=1 bilan shu sahifa qoralamani o‘zi yaratadi),
 * so‘ng POST /api/cards → buyurtma oqimining birinchi bosqichiga to‘liq sahifa yuklanishi bilan o‘tadi.
 */
export function OrderCardButton({ design, className = "btn btn-primary w-full", label = "Buyurtma berish", auto = false }: { design: CardDesignSlug; className?: string; label?: string; auto?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const { me, loading } = useMe();
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  const run = async () => {
    if (busy) return;
    if (!me?.user) {
      const next = `${CARD_PAGES.design(design)}?buyurtma=1`;
      window.location.assign(lpath(locale, `/kirish/?next=${encodeURIComponent(next)}`));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(CARD_API.create, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ design }) });
      const data = (await res.json().catch(() => ({}))) as Partial<CardCreateResponse> & { error?: string };
      if (!res.ok || !data.id) throw new Error(data.error || "Buyurtma yaratilmadi");
      window.location.assign(lpath(locale, cardFlowStart(data.id)));
    } catch (e) {
      toast(t((e as Error).message), "error");
      setBusy(false);
    }
  };

  // Kirishdan qaytganda (?buyurtma=1) — qoralama o‘zi yaratiladi
  useEffect(() => {
    if (!auto || started.current || loading || !me?.user) return;
    if (new URLSearchParams(window.location.search).get("buyurtma") !== "1") return;
    started.current = true;
    window.history.replaceState(null, "", window.location.pathname);
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, loading, me]);

  return (
    <button type="button" onClick={run} disabled={busy || (loading && !me)} aria-busy={busy} className={`${className} disabled:opacity-70`}>
      {busy ? (
        <>
          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> {t("Tayyorlanmoqda…")}
        </>
      ) : (
        <>
          {t(label)} <ArrowRight size={16} />
        </>
      )}
    </button>
  );
}
