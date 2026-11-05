"use client";

import Link from "next/link";
import { useApi } from "@/lib/client";
import type { Invitation, Order } from "@/lib/types";
import { AdminError, AdminLoading, AdminTitle, StatCard, fmtDateTime } from "../shared";
import { StatusBadge } from "@/components/ui";
import { formatPrice } from "@/lib/format";
import { orderStatusView } from "@/lib/display";
import { getTemplate } from "@/lib/templates";
import { ArrowRight } from "@/components/icons";

type Dash = {
  ok: boolean;
  todayOrders: number;
  todayPaid: number;
  monthRevenue: number;
  monthPaidCount: number;
  activeInvitations: number;
  pendingP2p: number;
  newBriefs: number;
  newLeads: number;
  recent: { order: Order; invitation: Invitation }[];
};

export function AdminDashboard() {
  const { data, loading, error, reload } = useApi<Dash>("/api/admin/dashboard");
  if (loading && !data) return <AdminLoading />;
  if (!data) return <AdminError message={error?.message} onRetry={() => reload()} />;
  const recent = data.recent.map((r) => ({ order: r.order, inv: r.invitation }));
  return (
    <>
      <AdminTitle title="Umumiy" sub="Bugungi holat va oylik tushum (Toshkent vaqti bilan)" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Bugun yangi buyurtmalar" value={data.todayOrders} hint={`${data.todayPaid} tasi to‘langan`} />
        <StatCard label="Shu oy tushum" value={formatPrice(data.monthRevenue)} hint={`${data.monthPaidCount} ta to‘lov`} tone="success" />
        <StatCard label="Faol taklifnomalar" value={data.activeInvitations} />
        <StatCard label="Tekshiriladigan P2P cheklar" value={data.pendingP2p} tone={data.pendingP2p ? "pending" : "ink"} hint={<Link href="/admin/tolovlar/" className="text-maroon hover:underline">Ko‘rish →</Link>} />
        <StatCard label="Yangi briflar" value={data.newBriefs} hint={<Link href="/admin/briflar/" className="text-maroon hover:underline">Ko‘rish →</Link>} />
        <StatCard label="Yangi xabarlar" value={data.newLeads} hint={<Link href="/admin/xabarlar/" className="text-maroon hover:underline">Ko‘rish →</Link>} />
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-serif text-[26px] font-light text-ink">So‘nggi buyurtmalar</h2>
        <Link href="/admin/buyurtmalar/" className="inline-flex items-center gap-1.5 t-nav text-maroon">
          Barchasi <ArrowRight size={15} />
        </Link>
      </div>
      <ul className="mt-4 divide-y divide-line rounded-panel border border-line">
        {recent.length === 0 && <li className="px-5 py-8 text-center t-body-m text-ink-2">Hali buyurtma yo‘q</li>}
        {recent.map(({ order, inv }) => {
          const v = orderStatusView[order.status];
          return (
            <li key={order.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5">
              <span className="w-24 t-title text-ink">{order.code}</span>
              <span className="min-w-0 flex-1 truncate t-body-m text-ink">
                {[inv.personA, inv.personB].filter(Boolean).join(" & ") || "—"} · <span className="text-ink-2">{getTemplate(order.templateSlug)?.name}</span>
              </span>
              <StatusBadge tone={v.tone}>{v.label}</StatusBadge>
              <span className="w-28 text-right t-body-m text-ink">{formatPrice(order.amount)}</span>
              <span className="w-32 text-right t-body-s text-ink-2">{fmtDateTime(order.createdAt)}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
