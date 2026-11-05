import { redirect } from "next/navigation";
import { loadFlow } from "../../_lib/load";
import { isPaidStatus } from "@/server/orders";
import { latestPayment, providerLabel } from "@/server/payments";
import { formatPrice } from "@/lib/format";
import { tashkentStamp } from "@/components/order/time";
import { namesOf } from "@/components/order/labels";
import { Star8 } from "@/components/Ornament";
import { PrintButton } from "@/components/order/PrintButton";

export const metadata = { title: "To‘lov cheki" };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { order, template, b } = await loadFlow((await params).id, "other");
  if (!isPaidStatus(b.order.status)) redirect(`/buyurtma/${order.id}/tolov`);
  const p = await latestPayment(order.id);
  const rows: [string, string][] = [
    ["Buyurtma", `№ ${order.code}`],
    ["Xizmat", `Taklifnoma sayti — «${template.name}»`],
    ["Taklifnoma", namesOf(order)],
    ["To‘lov usuli", p ? providerLabel[p.provider] : "—"],
    ["Sana", tashkentStamp(b.order.paidAt ?? p?.paidAt, "full")],
    ["Tranzaksiya", p?.externalId ?? p?.id ?? "—"],
  ];
  return (
    <section className="mx-auto max-w-[560px] px-5 py-12 print:py-0">
      <div className="rounded-panel border border-line bg-bg-base p-8 print:border-0">
        <div className="flex items-center gap-2">
          <Star8 size={18} />
          <span className="t-logo">Shohnoma</span>
        </div>
        <h1 className="mt-6 font-serif text-[32px] font-light text-ink">To‘lov cheki</h1>
        <dl className="mt-6 divide-y divide-line">
          {rows.map(([l, v]) => (
            <div key={l} className="flex justify-between gap-4 py-3">
              <dt className="t-body-s text-ink-2">{l}</dt>
              <dd className="text-right text-[13px] font-semibold text-ink">{v}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between py-4">
            <dt className="t-title text-ink">Jami to‘langan</dt>
            <dd className="font-serif text-[28px] font-medium text-maroon">{formatPrice(p?.amount ?? order.amount)}</dd>
          </div>
        </dl>
        <p className="mt-4 t-body-s text-ink-2">shohnoma.uz · {order.slug ? `shohnoma.uz/${order.slug}` : ""}</p>
      </div>
      <div className="mt-6 flex justify-center print:hidden">
        <PrintButton />
      </div>
    </section>
  );
}
