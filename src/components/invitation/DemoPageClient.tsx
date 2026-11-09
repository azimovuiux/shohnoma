"use client";

import Link from "@/components/LocalLink";
import { useT } from "@/lib/i18n";
import { ArrowLeft, ArrowRight } from "@/components/icons";
import { useLocalRouter } from "@/lib/useLocalRouter";
import { InvitationSite } from "./InvitationSite";
import { demoData } from "./data";
import { useTemplate } from "@/lib/useTemplates";
import { PageLoading, useApi, useRouteParam } from "@/lib/client";
import { useEffect, useMemo, useState } from "react";
import { getTemplate } from "@/lib/templates";
import { toFlowOrder, type OrderResponse } from "@/components/order/FlowGate";
import { toInvitationData } from "@/components/order/toInvitationData";

/** Buyurtma ko‘rinishi (?buyurtma=<id>): mijozning o‘z ma’lumotlari bilan haqiqiy sayt — yangi tabda, tugmalarsiz */
function OrderPreview({ id }: { id: string }) {
  const tt = useT();
  const { data, error } = useApi<OrderResponse>(`/api/orders/${encodeURIComponent(id)}`);
  const t = data ? getTemplate(data.order.templateSlug) : undefined;
  const inv = useMemo(() => (data ? toInvitationData(toFlowOrder(data)) : null), [data]);
  if (error || (data && !t))
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-5 text-center">
        <h1 className="font-cormorant text-[40px] font-light text-ink">{tt("Buyurtma topilmadi")}</h1>
      </div>
    );
  if (!data || !t || !inv) return <PageLoading className="min-h-dvh" />;
  return t.kind === "html" ? (
    <iframe src={`/api/orders/${encodeURIComponent(id)}/preview`} title={t.name} className="block h-dvh w-full border-0" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
  ) : (
    <InvitationSite key={t.slug} template={t} data={inv} mode="preview" />
  );
}

/** Shablonning jonli namunasi. slug "_" — admin qo‘shgan shablon (URL'dan o‘qiladi) */
export function DemoPageClient({ slug }: { slug: string }) {
  const fromUrl = useRouteParam("namuna");
  const router = useLocalRouter();
  const tt = useT();
  const t = useTemplate(slug === "_" ? fromUrl.value : slug);
  const [orderId, setOrderId] = useState<string | null | undefined>(undefined);
  useEffect(() => setOrderId(new URLSearchParams(location.search).get("buyurtma")), []);
  if (orderId === undefined) return <PageLoading className="min-h-dvh" />;
  if (orderId) return <OrderPreview id={orderId} />;
  if (!t) {
    if (slug === "_" && !fromUrl.ready) return <PageLoading className="min-h-dvh" />;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-5 text-center">
        <h1 className="font-cormorant text-[40px] font-light text-ink">{tt("Shablon topilmadi")}</h1>
        <Link href="/shablonlar/" className="btn btn-primary">
          {tt("Katalogga qaytish")}
        </Link>
      </div>
    );
  }
  return (
    <>
      {t.kind === "html" ? (
        <iframe
          src={`/api/tpl/${t.slug}/preview?v=${t.version ?? 1}`}
          title={`${t.name} — namuna`}
          className="block h-dvh w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      ) : (
        <InvitationSite key={t.slug} template={t} data={demoData(t)} mode="demo" />
      )}
      {/* Sayt elementi: pastda o‘rtada — shablonni tanlab buyurtmaga o‘tish */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex items-center justify-center gap-2.5 px-4 pb-[max(18px,env(safe-area-inset-bottom))]">
        {/* Saytga qaytish: saytdan kelgan bo‘lsa — orqaga, aks holda katalogga */}
        <button
          type="button"
          aria-label={tt("Saytga qaytish")}
          onClick={() => {
            const fromSite = typeof document !== "undefined" && document.referrer.startsWith(location.origin) && history.length > 1;
            if (fromSite) router.back();
            else router.push("/shablonlar/");
          }}
          className="pointer-events-auto flex size-[52px] shrink-0 items-center justify-center rounded-full bg-bg-base/95 text-maroon shadow-[0_14px_40px_-12px_rgba(38,10,18,0.55)] ring-1 ring-black/5 backdrop-blur transition-transform hover:-translate-x-0.5"
        >
          <ArrowLeft size={20} />
        </button>
        <Link
          href={`/buyurtma/${t.slug}/marosim/`}
          className="btn btn-primary pointer-events-auto !h-[52px] !rounded-full !px-7 shadow-[0_14px_40px_-12px_rgba(38,10,18,0.55)] ring-1 ring-white/25"
        >
          {tt("Shu shablonni ishlatish")} <ArrowRight size={16} />
        </Link>
      </div>
    </>
  );
}
