"use client";

import Link from "@/components/LocalLink";
import { Receipt2 } from "@/components/icons";
import { StatusBadge } from "@/components/ui";
import { useApi } from "@/lib/client";
import type { Invitation, Order, Payment } from "@/lib/types";
import { getTemplate } from "@/lib/templates";
import { formatPrice } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n";
import { dateTimeTk, invTitle, providerLabel } from "../data";
import { payStatus } from "./PaymentPage";

type Row = { payment: Payment | null; order: Order; invitation: Invitation | null };

/** Kabinet → To‘lovlar: mijozning barcha to‘lovlari (har bir buyurtma bo‘yicha), holati va cheki */
export function PaymentsPage() {
  const t = useT();
  const locale = useLocale();
  const { data, loading, error, reload } = useApi<{ ok: boolean; items: Row[] }>("/api/me/payments");
  const rows = data?.items ?? [];
  const paid = rows.filter((r) => r.payment?.status === "paid");
  const pending = rows.filter((r) => r.payment && ["created", "processing", "review"].includes(r.payment.status));
  const total = paid.reduce((s, r) => s + (r.payment?.amount ?? r.order.amount), 0);

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-serif text-[34px] font-light leading-[1.04] tracking-[-0.005em] text-ink lg:text-[44px]">{t("To‘lovlar")}</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          [t("Jami to‘langan"), formatPrice(total, true, locale)],
          [t("To‘lovlar soni"), String(paid.length)],
          [t("Tekshirilmoqda / kutilmoqda"), String(pending.length)],
        ].map(([l, v]) => (
          <div key={l} className="flex flex-col gap-1.5 rounded-card border border-line bg-bg-base p-5">
            <span className="t-body-s text-ink-2">{l}</span>
            <span className="font-serif text-[26px] font-medium leading-none text-ink">{v}</span>
          </div>
        ))}
      </div>

      <section className="flex flex-col rounded-card border border-line bg-bg-base p-5 lg:p-6">
        {loading && !data ? (
          <p className="t-body-m text-ink-2">{t("Yuklanmoqda…")}</p>
        ) : error && !data ? (
          <div className="flex flex-col items-start gap-3">
            <p className="t-body-m text-danger">{error.message}</p>
            <button type="button" onClick={() => reload()} className="btn btn-secondary btn-sm">
              {t("Qayta urinish")}
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-start gap-3 py-2">
            <p className="t-body-m text-ink-2">{t("Hali to‘lovlar yo‘q.")}</p>
            <Link href="/shablonlar/" className="btn btn-primary btn-sm">
              {t("Shablon tanlash")}
            </Link>
          </div>
        ) : (
          rows.map(({ order, invitation: inv, payment }) => {
            const st = payment ? payStatus[payment.status] : { label: "To‘lanmagan", tone: "pending" as const };
            const tpl = getTemplate(order.templateSlug);
            const isPaid = payment?.status === "paid";
            const receipt = payment?.receiptUrl ?? `/buyurtma/${order.id}/tolov/qabul-qilindi/`;
            const canPay = !isPaid && ["draft", "pending_payment", "payment_failed", "p2p_rejected"].includes(order.status);
            return (
              <div key={`${order.id}-${payment?.id ?? "x"}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line py-4 first:border-t-0 first:pt-0 last:pb-0">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-maroon">
                  <Receipt2 size={18} />
                </span>
                <div className="flex min-w-[180px] flex-1 flex-col gap-0.5">
                  <span className="truncate t-title text-ink">{inv ? invTitle(inv, t) : order.code}</span>
                  <span className="t-body-s text-ink-2">
                    {[order.code, tpl?.name, payment ? t(providerLabel[payment.provider] ?? payment.provider) : null, dateTimeTk(payment?.paidAt ?? payment?.createdAt ?? order.createdAt)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  {payment?.status === "rejected" && payment.reviewNote && (
                    <span className="t-body-s text-danger">
                      {t("Sabab:")} {payment.reviewNote}
                    </span>
                  )}
                </div>
                <span className="font-serif text-[20px] font-medium whitespace-nowrap text-ink">{formatPrice(payment?.amount ?? order.amount, true, locale)}</span>
                <StatusBadge tone={st.tone}>{t(st.label)}</StatusBadge>
                {isPaid ? (
                  <Link href={receipt} target={payment!.receiptUrl ? "_blank" : undefined} className="t-nav text-maroon hover:underline">
                    {t("Chek")}
                  </Link>
                ) : canPay ? (
                  <Link href={`/buyurtma/${order.id}/tolov/`} className="t-nav text-maroon hover:underline">
                    {t("To‘lash")}
                  </Link>
                ) : null}
              </div>
            );
          })
        )}
      </section>
    </>
  );
}
