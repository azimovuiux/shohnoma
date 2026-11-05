"use client";

import Link from "next/link";
import { isPaidStatus } from "@/lib/types";
import { dateTimeTk, providerLabel, useInvitationData } from "../data";
import { ArrowRight, Receipt2 } from "@/components/icons";
import { StatusBadge, type Tone } from "@/components/ui";
import { InvitationHeader } from "../InvitationHeader";
import { getTemplate } from "@/lib/templates";
import { formatPrice } from "@/lib/format";

const payStatus: Record<string, { label: string; tone: Tone }> = {
  created: { label: "Yaratildi", tone: "pending" },
  processing: { label: "Jarayonda", tone: "pending" },
  paid: { label: "To‘langan", tone: "success" },
  failed: { label: "O‘tmadi", tone: "danger" },
  cancelled: { label: "Bekor qilingan", tone: "muted" },
  review: { label: "Tekshirilmoqda", tone: "pending" },
  rejected: { label: "Rad etildi", tone: "danger" },
};


export function PaymentPage() {
  const { data } = useInvitationData();
  const { order, invitation: inv } = data;
  const list = data.payments ?? [];
  const t = getTemplate(order.templateSlug);
  const paid = isPaidStatus(order.status);

  return (
    <>
      <InvitationHeader order={order} invitation={inv} title="To‘lov va chek" />
      <section className="grid gap-3 rounded-card bg-bg-soft p-5 sm:grid-cols-4">
        {[
          ["Buyurtma", order.code],
          ["Shablon", t?.name ?? order.templateSlug],
          ["Summa", formatPrice(order.amount)],
          ["Holat", paid ? "To‘langan" : "To‘lanmagan"],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1">
            <span className="t-body-s text-ink-2">{k}</span>
            <span className="font-serif text-[22px] font-medium leading-[1.2] text-ink">{v}</span>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-1 rounded-card border border-line bg-bg-base p-5">
        <p className="pb-2 text-[15px] font-semibold leading-[1.35] text-ink">To‘lovlar</p>
        {list.length === 0 ? (
          <p className="border-t border-line py-4 t-body-m text-ink-2">Hali to‘lov qilinmagan.</p>
        ) : (
          list.map((p) => {
            const s = payStatus[p.status];
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-3 border-t border-line py-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-maroon">
                  <Receipt2 size={18} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="t-title text-ink">{providerLabel[p.provider]}</span>
                  <span className="t-body-s text-ink-2">{dateTimeTk(p.paidAt ?? p.createdAt)}</span>
                  {p.status === "rejected" && p.reviewNote && <span className="t-body-s text-danger">Sabab: {p.reviewNote}</span>}
                </div>
                <span className="font-serif text-[20px] font-medium text-ink">{formatPrice(p.amount)}</span>
                <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
                {p.receiptUrl ? (
                  <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" className="t-nav text-maroon hover:underline">
                    Chek
                  </a>
                ) : p.status === "paid" ? (
                  <Link href={`/buyurtma/${order.id}/tolov/qabul-qilindi/`} className="t-nav text-maroon hover:underline">
                    Chek
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
            To‘lovni davom ettirish <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </>
  );
}
