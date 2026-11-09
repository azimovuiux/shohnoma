"use client";

/**
 * Buyurtma oqimi sahifalari uchun brauzer tomonidagi yuklovchi (statik eksport).
 * Haqiqiy buyurtma id'si URL'dan o‘qiladi (/buyurtma/<id>/... → qobiq /buyurtma/_/...),
 * ma’lumot GET /api/orders/:id dan olinadi va holatga qarab yo‘naltiriladi (avvalgi server `loadFlow` mantig‘i).
 */
import Link from "@/components/LocalLink";
import { useLocalRouter } from "@/lib/useLocalRouter";
import { useLpath, useT } from "@/lib/i18n";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PageLoading, routeParam, useApi } from "@/lib/client";
import type { Invitation, Order, Payment } from "@/lib/types";
import { isPaidStatus } from "@/lib/types";
import { getTemplate, type Template } from "@/lib/templates";
import type { FlowOrder } from "./types";
import { CreateDraft } from "./CreateDraft";

export type Step = "marosim" | "tafsilotlar" | "korib-chiqish" | "tolov" | "other";

export type OrderResponse = { ok: boolean; order: Order; invitation: Invitation; payment: Payment | null; missing: string[] };

export type FlowCtx = {
  order: FlowOrder;
  template: Template;
  raw: OrderResponse;
  editing: boolean;
  search: URLSearchParams;
  base: string;
  reload: () => Promise<void>;
};

export const providerLabel: Record<Payment["provider"], string> = {
  payme: "Payme",
  click: "Click",
  google_pay: "Google Pay",
  p2p: "P2P o‘tkazma",
};

export function toFlowOrder(r: OrderResponse): FlowOrder {
  const inv = r.invitation;
  const [day = "", time = ""] = (inv.date || "").split("T");
  return {
    id: r.order.id,
    code: r.order.code,
    status: r.order.status,
    amount: r.order.amount,
    templateSlug: r.order.templateSlug,
    invitationId: inv.id,
    slug: inv.slug,
    ceremony: ((inv.ceremony as string) === "boshqa" ? "nikoh" : inv.ceremony) as FlowOrder["ceremony"],
    personA: inv.personA ?? "",
    personB: inv.personB ?? "",
    day,
    time,
    venueName: inv.venueName ?? "",
    address: inv.address ?? "",
    mapUrl: inv.mapUrl ?? "",
    message: inv.message ?? "",
    program: inv.program ?? [],
    photos: inv.photos ?? [],
    rsvpEnabled: inv.rsvpEnabled,
    rsvpDeadline: inv.rsvpDeadline,
    musicEnabled: inv.musicEnabled,
    musicTrack: inv.musicTrack ?? null,
    contactPhone: inv.contactPhone ?? "",
    contactTg: inv.contactTg ?? "",
    extra: (inv.extra as Record<string, unknown>) ?? {},
  };
}

/** Holat bo‘yicha qayerga yo‘naltirish kerak (avvalgi server mantiqi) */
function stepRedirect(step: Step, r: OrderResponse, editing: boolean): string | null {
  const s = r.order.status;
  const base = `/buyurtma/${r.order.id}`;
  if (step === "other") return null;
  if (s === "archived") return "/kabinet/";
  if (isPaidStatus(s) && !editing) return `${base}/tayyor/`;
  if (s === "p2p_review" && !editing) return `${base}/tolov/p2p/tekshirilmoqda/`;
  if (step === "tafsilotlar" && !editing && r.missing.length) return `${base}/marosim/`;
  if (step === "korib-chiqish" || step === "tolov") {
    if (r.missing.length) return `${base}/marosim/`;
    if (!r.invitation.contactPhone) return `${base}/tafsilotlar/`;
  }
  return null;
}

export function OrderNotFound() {
  const t = useT();
  const lp = useLpath();
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-[480px] flex-col items-center justify-center gap-4 px-5 py-20 text-center">
      <p className="font-serif text-[34px] font-light text-ink">{t("Buyurtma topilmadi")}</p>
      <p className="t-body-m text-ink-2">
        {t("Havola eskirgan yoki buyurtma boshqa qurilmada ochilgan bo‘lishi mumkin. Kabinetingizga kirib, buyurtmalaringizni ko‘ring.")}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href={`/kirish/?next=${encodeURIComponent(lp("/kabinet/"))}`} className="btn btn-primary">
          {t("Kabinetga kirish")}
        </Link>
        <Link href="/shablonlar/" className="btn btn-secondary">
          {t("Shablonlar")}
        </Link>
      </div>
    </div>
  );
}

function useSearch() {
  const [s, setS] = useState<URLSearchParams | null>(null);
  useEffect(() => setS(new URLSearchParams(window.location.search)), []);
  return s;
}

/**
 * @param guard sahifaga xos qo‘shimcha yo‘naltirish (masalan "tayyor" faqat to‘langanda)
 */
export function FlowGate({
  step,
  guard,
  children,
}: {
  step: Step;
  guard?: (c: FlowCtx) => string | null;
  children: (c: FlowCtx) => ReactNode;
}) {
  const router = useLocalRouter();
  const t = useT();
  const search = useSearch();
  const [id, setId] = useState<string | null | undefined>(undefined);
  useEffect(() => setId(routeParam("buyurtma")), []);

  const draftTemplate = id && step === "marosim" ? getTemplate(id) : undefined;
  const { data, error, loading, reload } = useApi<OrderResponse>(id && !draftTemplate ? `/api/orders/${encodeURIComponent(id)}` : null);

  const ctx = useMemo<FlowCtx | null>(() => {
    if (!data || !search) return null;
    const template = getTemplate(data.order.templateSlug);
    if (!template) return null;
    return {
      order: toFlowOrder(data),
      template,
      raw: data,
      editing: search.get("qaytish") === "kabinet",
      search,
      base: `/buyurtma/${data.order.id}`,
      reload: () => reload(true),
    };
  }, [data, search, reload]);

  const target = ctx ? stepRedirect(step, ctx.raw, ctx.editing) ?? guard?.(ctx) ?? null : null;
  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  if (id === undefined) return <PageLoading />;
  if (draftTemplate) return <CreateDraft templateSlug={draftTemplate.slug} name={draftTemplate.name} />;
  if (id === null || error?.status === 404 || (data && !getTemplate(data.order.templateSlug))) return <OrderNotFound />;
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
