"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Card, Mobile, MoneySend, TickCircle, Wallet, WalletCheck } from "@/components/icons";
import type { Template } from "@/lib/templates";
import { OrderSummary, MobileBar, MobileTemplateCard } from "./OrderSummary";
import { FlowColumns } from "./FlowTop";
import { SectionTitle } from "./fields";
import { liveTemplate, dayTime } from "./live";
import { namesOf } from "./labels";
import type { FlowOrder } from "./types";

export type Provider = "payme" | "click" | "google_pay" | "p2p";

const meta: Record<Provider, { label: string; text: string; icon: React.ReactNode; cta: string }> = {
  payme: { label: "Payme", text: "Payme ilovasi yoki karta orqali", icon: <Wallet size={20} />, cta: "Payme orqali to‘lash" },
  click: { label: "Click", text: "Click ilovasi yoki karta orqali", icon: <Card size={20} />, cta: "Click orqali to‘lash" },
  google_pay: { label: "Google Pay", text: "Telefon hamyoni orqali", icon: <Mobile size={20} />, cta: "Google Pay orqali to‘lash" },
  p2p: { label: "P2P o‘tkazma", text: "Kartadan kartaga o‘tkazish", icon: <MoneySend size={20} />, cta: "Kartaga o‘tkazish" },
};

export const PAY_URL_KEY = (id: string) => `shohnoma:pay:${id}`;

export function PayChoice({ order, template, providers }: { order: FlowOrder; template: Template; providers: Provider[] }) {
  const router = useRouter();
  const [p, setP] = useState<Provider>(providers[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const live = useMemo(() => liveTemplate(template, order), [template, order]);

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: p }),
      });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || "To‘lovni boshlab bo‘lmadi");
      if (p === "p2p" || data.url.startsWith("/")) {
        router.push(data.url);
        return;
      }
      // 20 — "Payme’ga o‘tmoqdasiz" ekrani, keyin provayder sahifasi
      sessionStorage.setItem(PAY_URL_KEY(order.id), data.url);
      router.push(`/buyurtma/${order.id}/tolov/jarayonda?usul=${p}&ochish=1`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const button = (
    <button type="button" onClick={pay} disabled={busy} className="btn btn-primary w-full">
      {busy ? "Kuting…" : meta[p].cta} <ArrowRight size={16} />
    </button>
  );
  const err = error && (
    <p role="alert" className="text-center t-body-s text-danger">
      {error}
    </p>
  );

  return (
    <FlowColumns
      aside={
        <OrderSummary
          template={template}
          live={live}
          amount={order.amount}
          rows={[
            ["Buyurtma", `№ ${order.code}`],
            ["Ismlar", namesOf(order)],
            ["Sana", dayTime(order.day, order.time)],
          ]}
          action={
            <>
              {button}
              {err}
            </>
          }
        />
      }
    >
      <div className="flex flex-col gap-4">
        <MobileTemplateCard template={template} live={live} />
        <SectionTitle>Qanday to‘lamoqchisiz?</SectionTitle>
        <div role="radiogroup" aria-label="To‘lov usuli" className="flex flex-col gap-3">
          {providers.map((k) => {
            const active = p === k;
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setP(k)}
                className={`flex items-center gap-3.5 rounded-xl border px-4 py-4 text-left transition-colors ${
                  active ? "border-maroon bg-bg-soft" : "border-line bg-bg-base hover:bg-bg-soft/60"
                }`}
              >
                <span className={active ? "text-maroon" : "text-ink-2"}>{meta[k].icon}</span>
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="t-title text-ink">{meta[k].label}</span>
                  <span className="t-body-s text-ink-2">{meta[k].text}</span>
                </span>
                {active ? <TickCircle size={20} color="var(--color-maroon)" /> : <span className="size-[18px] rounded-full border border-ink/70" />}
              </button>
            );
          })}
        </div>
        <p className="mt-2 flex items-start gap-2.5 t-body-s text-ink-2">
          <span className="shrink-0 text-gold">
            <WalletCheck size={20} />
          </span>
          To‘lovni tanlangan xizmatda yakunlaysiz. Tasdiqlangach, tayyor taklifnoma havolasini olasiz.
        </p>
      </div>
      <MobileBar>
        {button}
        {err}
      </MobileBar>
    </FlowColumns>
  );
}
