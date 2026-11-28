"use client";

/**
 * Vizitka buyurtma oqimi: /vizitka/buyurtma/<id>/{malumot,korib-chiqish,tolov/*,tayyor}.
 * Statik qobiq /vizitka/buyurtma/_/…, haqiqiy id URL'dan; ma’lumot GET /api/cards/:id.
 * Holat bo‘yicha yo‘naltirish: to‘langan → tayyor; ma’lumot yetishmasa → malumot.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "@/components/LocalLink";
import { useLocalRouter } from "@/lib/useLocalRouter";
import { useLpath, useT } from "@/lib/i18n";
import { PageLoading, useApi } from "@/lib/client";
import { isPaidStatus } from "@/lib/types";
import { CARD_API, CARD_PAGES, type CardGetResponse } from "@/lib/cardTypes";
import { cardDesign, type CardDesign } from "@/lib/cards";
import { ArrowLeft } from "@/components/icons";
import { Stepper } from "@/components/order/Stepper";

export type CardStep = "malumot" | "korib-chiqish" | "tolov" | "tayyor" | "other";
export const CARD_STEPS = ["Ma’lumotlar", "Ko‘rib chiqish", "To‘lov"];
const stepNo: Partial<Record<CardStep, 1 | 2 | 3>> = { malumot: 1, "korib-chiqish": 2, tolov: 3 };

export type CardCtx = {
  id: string;
  raw: CardGetResponse;
  design: CardDesign;
  base: string;
  search: URLSearchParams;
  reload: () => Promise<void>;
};

/** /vizitka/buyurtma/<id>/… dagi id */
function orderIdFromPath(): string | null {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const i = parts.indexOf("buyurtma");
  const v = i >= 0 ? parts[i + 1] : undefined;
  return v && v !== "_" ? decodeURIComponent(v) : null;
}

function redirectFor(step: CardStep, r: CardGetResponse): string | null {
  const id = r.order.id;
  const base = CARD_PAGES.order(id);
  const s = r.order.status;
  if (step === "other") return null;
  if (s === "archived") return CARD_PAGES.cabinetList;
  if (isPaidStatus(s)) return step === "tayyor" ? null : CARD_PAGES.ready(id);
  if (step === "tayyor") return `${base}malumot/`;
  if ((step === "korib-chiqish" || step === "tolov") && r.missing.length) return `${base}malumot/`;
  return null;
}

export function CardNotFound() {
  const t = useT();
  const lp = useLpath();
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-[480px] flex-col items-center justify-center gap-4 px-5 py-20 text-center">
      <p className="font-serif text-[34px] font-light text-ink">{t("Buyurtma topilmadi")}</p>
      <p className="t-body-m text-ink-2">{t("Havola eskirgan bo‘lishi mumkin.")}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href={`/kirish/?next=${encodeURIComponent(lp(CARD_PAGES.cabinetList))}`} className="btn btn-primary">
          {t("Kabinetga kirish")}
        </Link>
        <Link href={CARD_PAGES.catalog} className="btn btn-secondary">
          {t("Vizitka dizaynlari")}
        </Link>
      </div>
    </div>
  );
}

export function CardFlowGate({ step, guard, children }: { step: CardStep; guard?: (c: CardCtx) => string | null; children: (c: CardCtx) => ReactNode }) {
  const router = useLocalRouter();
  const t = useT();
  const [id, setId] = useState<string | null | undefined>(undefined);
  const [search, setSearch] = useState<URLSearchParams | null>(null);
  useEffect(() => {
    setId(orderIdFromPath());
    setSearch(new URLSearchParams(window.location.search));
  }, []);
  const { data, error, loading, reload } = useApi<CardGetResponse>(id ? CARD_API.card(id) : null);
  const design = data ? cardDesign(data.card.design) : undefined;

  const ctx = useMemo<CardCtx | null>(() => {
    if (!data || !search || !design) return null;
    return { id: data.order.id, raw: data, design, base: CARD_PAGES.order(data.order.id), search, reload: () => reload(true) };
  }, [data, search, design, reload]);

  const target = ctx ? redirectFor(step, ctx.raw) ?? guard?.(ctx) ?? null : null;
  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  if (id === undefined) return <PageLoading />;
  if (id === null || error?.status === 404 || error?.status === 403 || (data && !design)) return <CardNotFound />;
  if (error)
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-[480px] flex-col items-center justify-center gap-4 px-5 text-center">
        <p className="t-body-m text-ink-2">{t(error.message)}</p>
        <button type="button" className="btn btn-secondary" onClick={() => reload()}>
          {t("Qayta urinish")}
        </button>
      </div>
    );
  if (loading || !ctx || target) return <PageLoading />;
  return <>{children(ctx)}</>;
}

/** Orqaga havola + bosqichlar (3 ta) + sarlavha */
export function CardTop({ back, step, title, sub }: { back?: { href: string; label: string }; step?: CardStep; title: ReactNode; sub?: ReactNode }) {
  const no = step ? stepNo[step] : undefined;
  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-5 pb-2 pt-6 lg:gap-7 lg:px-10 lg:pt-9 xl:px-[120px]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {back ? (
          <Link href={back.href} className="inline-flex w-fit items-center gap-2 t-nav text-ink-2 hover:text-maroon">
            <ArrowLeft size={16} /> {back.label}
          </Link>
        ) : (
          <span />
        )}
        {no && <Stepper current={no} steps={CARD_STEPS} />}
      </div>
      <div className="flex flex-col gap-2.5">
        <h1 className="font-serif text-[34px] font-light leading-[1.04] tracking-[-0.005em] text-ink lg:text-[52px]">{title}</h1>
        {sub && <p className="t-body-m text-ink-2 lg:t-body-l">{sub}</p>}
      </div>
    </div>
  );
}
