import { and, desc, eq, inArray } from "drizzle-orm";
import { db, payments, orders, invitations, users } from "@/server/db";
import { AdminTitle, Empty, fmtDateTime } from "@/components/admin/shared";
import { P2pActions } from "@/components/admin/P2pActions";
import { StatusBadge } from "@/components/ui";
import { ExportSquare } from "@/components/icons";
import { formatPrice } from "@/lib/format";
import { formatPhoneDisplay } from "@/lib/display";
import { getTemplate } from "@/lib/templates";
import { env } from "@/server/env";

function Receipt({ url }: { url: string | null }) {
  if (!url) return <div className="flex aspect-[3/4] items-center justify-center rounded-xl bg-bg-soft t-body-s text-ink-2">Chek yo‘q</div>;
  if (url.endsWith(".pdf"))
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-xl bg-bg-soft t-body-m text-maroon">
        PDF chek <ExportSquare size={16} />
      </a>
    );
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-line bg-bg-soft" title="To‘liq o‘lchamda ochish">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="To‘lov cheki" className="aspect-[3/4] w-full object-contain" />
    </a>
  );
}

export default async function AdminPayments() {
  const select = db
    .select({ payment: payments, order: orders, inv: invitations, owner: users })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .innerJoin(invitations, eq(invitations.orderId, orders.id))
    .leftJoin(users, eq(users.id, orders.userId));
  const [pending, processed] = await Promise.all([
    select.where(and(eq(payments.provider, "p2p"), eq(payments.status, "review"))).orderBy(payments.createdAt),
    db
      .select({ payment: payments, order: orders })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .where(and(eq(payments.provider, "p2p"), inArray(payments.status, ["paid", "rejected"])))
      .orderBy(desc(payments.createdAt))
      .limit(30),
  ]);

  return (
    <>
      <AdminTitle
        title="P2P cheklar"
        sub={
          <>
            Karta: <b className="font-semibold text-ink">{env.p2pCard}</b> · {env.p2pHolder} · {env.p2pBank}. Izohdagi buyurtma kodi va summani tekshiring.
          </>
        }
      />
      {pending.length === 0 ? (
        <Empty>Tekshiriladigan chek yo‘q</Empty>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {pending.map(({ payment, order, inv, owner }) => {
            const phone = owner?.phone ?? inv.contactPhone;
            return (
              <li key={payment.id} className="flex flex-col gap-4 rounded-panel border border-line bg-bg-base p-4">
                <Receipt url={payment.receiptUrl} />
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="t-title text-ink">{order.code}</span>
                    <span className="font-serif text-[24px] font-medium text-maroon">{formatPrice(payment.amount)}</span>
                  </div>
                  <span className="t-body-s text-ink-2">
                    Izohda bo‘lishi kerak: <b className="font-semibold text-ink">{order.code}</b>
                  </span>
                  <span className="t-body-s text-ink-2">
                    {[inv.personA, inv.personB].filter(Boolean).join(" & ")} · {getTemplate(order.templateSlug)?.name}
                  </span>
                  <span className="t-body-s text-ink-2">
                    {phone ? formatPhoneDisplay(phone) : owner?.telegramUser ?? "—"} · yuborildi {fmtDateTime(payment.createdAt)}
                  </span>
                </div>
                <P2pActions paymentId={payment.id} code={order.code} />
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mt-12 font-serif text-[26px] font-light text-ink">Ko‘rib chiqilganlar</h2>
      {processed.length === 0 ? (
        <p className="mt-3 t-body-m text-ink-2">Hozircha yo‘q</p>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-panel border border-line">
          {processed.map(({ payment, order }) => (
            <li key={payment.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
              <span className="w-24 t-title text-ink">{order.code}</span>
              {payment.status === "paid" ? <StatusBadge tone="success">Tasdiqlangan</StatusBadge> : <StatusBadge tone="danger">Rad etilgan</StatusBadge>}
              <span className="min-w-0 flex-1 truncate t-body-s text-ink-2">{payment.reviewNote ?? ""}</span>
              {payment.receiptUrl && (
                <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer" className="t-body-s text-maroon hover:underline">
                  Chek
                </a>
              )}
              <span className="w-28 text-right t-body-m text-ink">{formatPrice(payment.amount)}</span>
              <span className="w-32 text-right t-body-s text-ink-2">{fmtDateTime(payment.paidAt ?? payment.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
