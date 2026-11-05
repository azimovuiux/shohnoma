import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDown, ArrowRight } from "@/components/icons";
import { loadFlow } from "../../_lib/load";
import { StatusScreen, InfoCard } from "@/components/order/StatusScreen";
import { isPaidStatus } from "@/server/orders";
import { latestPayment, providerLabel } from "@/server/payments";
import { formatPrice } from "@/lib/format";
import { tashkentStamp } from "@/components/order/time";

export const metadata = { title: "To‘lov qabul qilindi" };

export default async function PaidPage({ params }: { params: Promise<{ id: string }> }) {
  const { order, b } = await loadFlow((await params).id, "other");
  const base = `/buyurtma/${order.id}`;
  if (!isPaidStatus(b.order.status)) redirect(`${base}/tolov/jarayonda`);
  const p = await latestPayment(order.id);
  return (
    <StatusScreen kind="success" title="To‘lov qabul qilindi" text="Rahmat! Taklifnomangiz ishga tushdi — havola va QR kod tayyor.">
      <InfoCard
        rows={[
          ["To‘langan summa", <span key="s" className="font-serif text-[22px] font-medium text-maroon">{formatPrice(order.amount)}</span>],
          ["Usul", p ? providerLabel[p.provider] : "—"],
          ["Buyurtma", `№ ${order.code}`],
          ["Sana", tashkentStamp(b.order.paidAt ?? p?.paidAt ?? new Date(), "full")],
        ]}
      />
      <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
        <Link href={`${base}/tayyor`} className="btn btn-primary">
          Taklifnomamni ko‘rish <ArrowRight size={16} />
        </Link>
        <Link href={`${base}/tolov/chek`} className="btn btn-secondary">
          <ArrowDown size={16} /> Chekni yuklab olish
        </Link>
      </div>
    </StatusScreen>
  );
}
