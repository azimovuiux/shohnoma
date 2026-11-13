"use client";

import { useMemo, useState } from "react";
import { useLocalRouter } from "@/lib/useLocalRouter";
import { useLocale, useT } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { api } from "@/components/ui";
import { ArrowRight, Card, Mobile, MoneySend, TickCircle, Wallet, WalletCheck } from "@/components/icons";
import type { Template } from "@/lib/templates";
import { OrderSummary, MobileBar, MobileTemplateCard } from "./OrderSummary";
import { FlowColumns, MobileActions, StepNav } from "./FlowTop";
import { SectionTitle } from "./fields";
import { liveTemplate, dayTime } from "./live";
import { namesOf } from "./labels";
import type { FlowOrder } from "./types";

export type Provider = "payme" | "click" | "google_pay" | "p2p";

const meta: Record<Provider, { label: string; text: string; icon: React.ReactNode; cta: string; logo?: string }> = {
  payme: { label: "Payme", text: "Payme ilovasi yoki karta orqali", icon: <Wallet size={20} />, cta: "Payme orqali to‘lash", logo: "/pay/payme.svg" },
  click: { label: "Click", text: "Click ilovasi yoki karta orqali", icon: <Card size={20} />, cta: "Click orqali to‘lash", logo: "/pay/click.svg" },
  google_pay: { label: "Google Pay", text: "Telefon hamyoni orqali", icon: <Mobile size={20} />, cta: "Google Pay orqali to‘lash" },
  p2p: { label: "Bank kartasi orqali", text: "Uzcard yoki Humo kartadan o‘tkazma", icon: <MoneySend size={20} />, cta: "Karta orqali to‘lash" },
};

export const PAY_URL_KEY = (id: string) => `shohnoma:pay:${id}`;

export function PayChoice({ order, template, providers, soon = [] }: { order: FlowOrder; template: Template; providers: Provider[]; soon?: Provider[] }) {
  const router = useLocalRouter();
  const t = useT();
  const [p, setP] = useState<Provider | null>(providers[0] ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const live = useMemo(() => liveTemplate(template, order), [template, order]);
  const [promo, setPromo] = useState({ amount: order.amount, code: order.promoCode ?? null, discount: order.promoDiscount ?? 0 });
  const locale = useLocale();

  const pay = async () => {
    if (!p) return;
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
      router.push(`/buyurtma/${order.id}/tolov/jarayonda/?usul=${p}&ochish=1`);
    } catch (e) {
      setError(t((e as Error).message));
      setBusy(false);
    }
  };

  const button = (
    <button type="button" onClick={pay} disabled={busy || !p} className="btn btn-primary w-full disabled:opacity-50">
      {busy ? t("Kuting…") : p ? t(meta[p].cta) : t("To‘lov usuli tez kunda ishga tushadi")} {p && <ArrowRight size={16} />}
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
          order={order}
          amount={promo.amount}
          rows={[
            ["Buyurtma", `№ ${order.code}`],
            ["Ismlar", namesOf(order)],
            ["Sana", dayTime(order.day, order.time)],
            ...(promo.code ? ([[t("Promokod {code}", { code: promo.code }), `−${formatPrice(promo.discount, true, locale)}`]] as [string, string][]) : []),
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
        <MobileTemplateCard template={template} live={live} order={order} />
        <SectionTitle>{t("Qanday to‘lamoqchisiz?")}</SectionTitle>
        <div role="radiogroup" aria-label={t("To‘lov usuli")} className="flex flex-col gap-3">
          {[...providers, ...soon.filter((k) => !providers.includes(k))].map((k) => {
            const off = !providers.includes(k);
            const active = !off && p === k;
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={active}
                aria-disabled={off || undefined}
                disabled={off}
                onClick={() => setP(k)}
                className={`flex items-center gap-3.5 rounded-xl border px-4 py-4 text-left transition-colors ${
                  off ? "cursor-not-allowed border-line bg-bg-base" : active ? "border-maroon bg-bg-soft" : "border-line bg-bg-base hover:bg-bg-soft/60"
                }`}
              >
                {!meta[k].logo && <span className={off ? "text-ink-2/50" : active ? "text-maroon" : "text-ink-2"}>{meta[k].icon}</span>}
                <span className={`flex flex-1 flex-col gap-0.5 ${off ? "opacity-45 grayscale" : ""}`}>
                  {meta[k].logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={meta[k].logo} alt={meta[k].label} width={86} height={22} className="h-[22px] w-auto self-start" />
                  ) : (
                    <span className="t-title text-ink">{t(meta[k].label)}</span>
                  )}
                  <span className="t-body-s text-ink-2">{t(meta[k].text)}</span>
                </span>
                {off ? (
                  <span className="shrink-0 rounded-full bg-bg-soft px-2.5 py-1 t-body-s font-medium text-ink-2">{t("Tez kunda")}</span>
                ) : active ? (
                  <TickCircle size={20} color="var(--color-maroon)" />
                ) : (
                  <span className="size-[18px] rounded-full border border-ink/70" />
                )}
              </button>
            );
          })}
        </div>
        <PromoBox orderId={order.id} state={promo} onChange={setPromo} />
      </div>
      <StepNav back={`/buyurtma/${order.id}/korib-chiqish/`}>{button}</StepNav>

      <MobileBar>
        <MobileActions back={`/buyurtma/${order.id}/korib-chiqish/`}>{button}</MobileActions>
        {err}
      </MobileBar>
    </FlowColumns>
  );
}

type PromoState = { amount: number; code: string | null; discount: number };

/** Promokod: kiritish → narxdan chegirma; qo‘llangan bo‘lsa — olib tashlash */
function PromoBox({ orderId, state, onChange }: { orderId: string; state: PromoState; onChange: (s: PromoState) => void }) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const apply = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ amount: number; promoCode: string; promoDiscount: number }>(`/api/orders/${orderId}/promo`, { method: "POST", json: { code } });
      onChange({ amount: r.amount, code: r.promoCode, discount: r.promoDiscount });
      setCode("");
      setOpen(false);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      const r = await api<{ amount: number }>(`/api/orders/${orderId}/promo`, { method: "DELETE" });
      onChange({ amount: r.amount, code: null, discount: 0 });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (state.code)
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-success/40 bg-success/5 px-4 py-3">
        <span className="flex items-center gap-2 t-body-m text-ink">
          <TickCircle size={18} color="var(--color-success)" />
          {t("Promokod {code} qo‘llandi: −{sum}", { code: state.code, sum: formatPrice(state.discount, true, locale) })}
        </span>
        <button type="button" disabled={busy} onClick={remove} className="t-body-s text-ink-2 hover:text-maroon">
          {t("Olib tashlash")}
        </button>
      </div>
    );
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="w-fit t-body-m font-medium text-maroon hover:underline">
        {t("Promokodingiz bormi?")}
      </button>
    );
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.trim()) void apply();
      }}
    >
      <div className="flex gap-2">
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40))}
          placeholder={t("Promokod")}
          aria-label={t("Promokod")}
          autoComplete="off"
          className="h-[52px] min-w-0 flex-1 rounded-xl border border-line bg-bg-base px-4 font-mono text-[16px] tracking-[0.06em] text-ink outline-none focus:border-maroon"
        />
        <button type="submit" disabled={busy || !code.trim()} className="btn btn-secondary !h-[52px] shrink-0">
          {busy ? t("Kuting…") : t("Qo‘llash")}
        </button>
      </div>
      {err && (
        <p role="alert" className="t-body-s text-danger">
          {t(err)}
        </p>
      )}
    </form>
  );
}
