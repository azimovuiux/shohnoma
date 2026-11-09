"use client";

import Link from "@/components/LocalLink";
import { isPaidStatus } from "@/lib/types";
import { dateTimeTk, providerLabel, useInvitationData } from "../data";
import { ArrowRight, Receipt2 } from "@/components/icons";
import { StatusBadge, type Tone } from "@/components/ui";
import { InvitationHeader } from "../InvitationHeader";
import { getTemplate } from "@/lib/templates";
import { formatPrice } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n";

export const payStatus: Record<string, { label: string; tone: Tone }> = {
  created: { label: "Yaratildi", tone: "pending" },
  processing: { label: "Jarayonda", tone: "pending" },
  paid: { label: "To‘langan", tone: "success" },
  failed: { label: "O‘tmadi", tone: "danger" },
  cancelled: { label: "Bekor qilingan", tone: "muted" },
  review: { label: "Tekshirilmoqda", tone: "pending" },
  rejected: { label: "Rad etildi", tone: "danger" },
};


export function PaymentPage() {
  const tr = useT();
  const locale = useLocale();
  const { data } = useInvitationData();
  const { order, invitation: inv } = data;
  const list = data.payments ?? [];
  const t = getTemplate(order.templateSlug);
  const paid = isPaidStatus(order.status);

  return (
    <>
      <InvitationHeader order={order} invitation={inv} title={tr("To‘lov va chek")} />
      <section className="grid gap-3 rounded-card bg-bg-soft p-5 sm:grid-cols-4">
        {[
          [tr("Buyurtma"), order.code],
          [tr("Shablon"), t?.name ?? order.templateSlug],
          [tr("Summa"), formatPrice(order.amount, true, locale)],
          [tr("Holat"), paid ? tr("To‘langan") : tr("To‘lanmagan")],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1">
            <span className="t-body-s text-ink-2">{k}</span>
            <span className="font-serif text-[22px] font-medium leading-[1.2] text-ink">{v}</span>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-1 rounded-card border border-line bg-bg-base p-5">
        <p className="pb-2 text-[15px] font-semibold leading-[1.35] text-ink">{tr("To‘lovlar")}</p>
        {list.length === 0 ? (
          <p className="border-t border-line py-4 t-body-m text-ink-2">{tr("Hali to‘lov qilinmagan.")}</p>
        ) : (
          list.map((p) => {
            const s = payStatus[p.status];
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-3 border-t border-line py-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-maroon">
                  <Receipt2 size={18} />
                </span>
                <div className="flex min-w-[150px] flex-1 flex-col">
                  <span className="t-title text-ink">{tr(providerLabel[p.provider] ?? p.provider)}</span>
                  <span className="t-body-s text-ink-2">{dateTimeTk(p.paidAt ?? p.createdAt)}</span>
                  {p.status === "rejected" && p.reviewNote && <span className="t-body-s text-danger">{tr("Sabab:")} {p.reviewNote}</span>}
                </div>
                <span className="font-serif text-[20px] font-medium text-ink">{formatPrice(p.amount, true, locale)}</span>
                <StatusBadge tone={s.tone}>{tr(s.label)}</StatusBadge>
                {p.receiptUrl ? (
                  <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" className="t-nav text-maroon hover:underline">
                    {tr("Chek")}
                  </a>
                ) : p.status === "paid" ? (
                  <Link href={`/buyurtma/${order.id}/tolov/qabul-qilindi/`} className="t-nav text-maroon hover:underline">
                    {tr("Chek")}
                  </Link>
                ) : null}
              </div>
            );
          })
        )}
      </section>

      {!paid && order.status !== "archived" && order.status !== "p2p_review" && (
        <div>
          <Link href={`/buyurtma/${order.id}/tolov/`} className="btn btn-primary">
            {tr("To‘lovni davom ettirish")} <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </>
  );
}
