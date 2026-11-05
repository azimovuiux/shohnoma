import Link from "next/link";
import { ArrowRight, Clock } from "@/components/icons";
import { StatusBadge } from "@/components/ui";
import { getTemplate, ceremonyLabel, type Ceremony } from "@/lib/templates";
import { orderStatusView, splitDate } from "@/lib/display";
import type { Invitation, Order } from "@/lib/types";

export const invTitle = (inv: Pick<Invitation, "personA" | "personB">) => [inv.personA, inv.personB].filter(Boolean).join(" & ") || "Yangi taklifnoma";

export function InvitationHeader({ order, invitation: inv, title }: { order: Order; invitation: Invitation; title?: string }) {
  const t = getTemplate(order.templateSlug);
  const d = splitDate(inv.date);
  const paid = order.status === "paid" || order.status === "active";
  const v = orderStatusView[order.status];
  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-[34px] font-light leading-[1.04] tracking-[-0.005em] text-ink lg:text-[44px]">{title ?? invTitle(inv)}</h1>
          <StatusBadge tone={v.tone} dot>
            {paid ? "Faol" : v.label}
          </StatusBadge>
        </div>
        <p className="t-body-m text-ink-2">
          {title ? `${invTitle(inv)} · ` : ""}
          {[t?.name, ceremonyLabel[inv.ceremony as Ceremony], d ? `${d.day}${d.time ? `, ${d.time}` : ""}` : null].filter(Boolean).join(" · ")}
        </p>
      </div>
      {!paid && order.status !== "archived" && (
        <div className="flex flex-col gap-4 rounded-panel p-5 sm:flex-row sm:items-center sm:justify-between" style={{ background: "var(--pending-bg)" }}>
          <p className="flex items-center gap-2.5 t-body-m text-pending">
            <Clock size={18} />
            {order.status === "p2p_review" ? "Chekingiz tekshirilmoqda — tasdiqlangach sayt ochiladi." : "Qoralama · ma’lumotlar saqlangan — to‘lovdan so‘ng sayt ochiladi."}
          </p>
          {order.status === "p2p_review" ? (
            <Link href={`/buyurtma/${order.id}/tolov/p2p/tekshirilmoqda/`} className="btn btn-secondary btn-sm shrink-0 bg-bg-base">
              Holatni ko‘rish
            </Link>
          ) : (
            <Link href={`/buyurtma/${order.id}/tolov/`} className="btn btn-primary btn-sm shrink-0">
              To‘lovni davom ettirish <ArrowRight size={15} />
            </Link>
          )}
        </div>
      )}
      {order.status === "archived" && (
        <div className="rounded-panel p-5 t-body-m text-muted" style={{ background: "var(--muted-bg)" }}>
          Bu taklifnoma arxivlangan — mehmonlar uchun sayt yopiq.
        </div>
      )}
    </>
  );
}
