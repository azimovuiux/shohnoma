import Link from "next/link";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db, orders, payments, briefs, leads, invitations } from "@/server/db";
import { AdminTitle, StatCard, fmtDateTime } from "@/components/admin/shared";
import { StatusBadge } from "@/components/ui";
import { formatPrice } from "@/lib/format";
import { orderStatusView } from "@/lib/display";
import { getTemplate } from "@/lib/templates";
import { ArrowRight } from "@/components/icons";

/** Toshkent (UTC+5) bo‘yicha kun/oy boshlanishi → UTC Date */
function tashkentStart(kind: "day" | "month") {
  const t = new Date(Date.now() + 5 * 3600_000);
  const y = t.getUTCFullYear();
  const m = t.getUTCMonth();
  const d = kind === "day" ? t.getUTCDate() : 1;
  return new Date(Date.UTC(y, m, d) - 5 * 3600_000);
}

export default async function AdminDashboard() {
  const today = tashkentStart("day");
  const month = tashkentStart("month");
  const [[todayOrders], [todayPaid], [monthPaid], [p2p], [newBriefs], [newLeads], [activeInv], recent] = await Promise.all([
    db.select({ n: sql<number>`COUNT(*)` }).from(orders).where(gte(orders.createdAt, today)),
    db.select({ n: sql<number>`COUNT(*)` }).from(orders).where(gte(orders.paidAt, today)),
    db.select({ n: sql<number>`COUNT(*)`, sum: sql<number>`COALESCE(SUM(${orders.amount}), 0)` }).from(orders).where(gte(orders.paidAt, month)),
    db.select({ n: sql<number>`COUNT(*)` }).from(payments).where(and(eq(payments.provider, "p2p"), eq(payments.status, "review"))),
    db.select({ n: sql<number>`COUNT(*)` }).from(briefs).where(eq(briefs.status, "new")),
    db.select({ n: sql<number>`COUNT(*)` }).from(leads).where(eq(leads.status, "new")),
    db.select({ n: sql<number>`COUNT(*)` }).from(orders).where(inArray(orders.status, ["paid", "active"])),
    db
      .select({ order: orders, inv: invitations })
      .from(orders)
      .innerJoin(invitations, eq(invitations.orderId, orders.id))
      .orderBy(desc(orders.createdAt))
      .limit(8),
  ]);

  return (
    <>
      <AdminTitle title="Umumiy" sub="Bugungi holat va oylik tushum (Toshkent vaqti bilan)" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Bugun yangi buyurtmalar" value={Number(todayOrders.n)} hint={`${Number(todayPaid.n)} tasi to‘langan`} />
        <StatCard label="Shu oy tushum" value={formatPrice(Number(monthPaid.sum))} hint={`${Number(monthPaid.n)} ta to‘lov`} tone="success" />
        <StatCard label="Faol taklifnomalar" value={Number(activeInv.n)} />
        <StatCard label="Tekshiriladigan P2P cheklar" value={Number(p2p.n)} tone={Number(p2p.n) ? "pending" : "ink"} hint={<Link href="/admin/tolovlar" className="text-maroon hover:underline">Ko‘rish →</Link>} />
        <StatCard label="Yangi briflar" value={Number(newBriefs.n)} hint={<Link href="/admin/briflar" className="text-maroon hover:underline">Ko‘rish →</Link>} />
        <StatCard label="Yangi xabarlar" value={Number(newLeads.n)} hint={<Link href="/admin/xabarlar" className="text-maroon hover:underline">Ko‘rish →</Link>} />
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-serif text-[26px] font-light text-ink">So‘nggi buyurtmalar</h2>
        <Link href="/admin/buyurtmalar" className="inline-flex items-center gap-1.5 t-nav text-maroon">
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
