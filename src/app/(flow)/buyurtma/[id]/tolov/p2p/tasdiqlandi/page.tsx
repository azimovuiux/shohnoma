import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "@/components/icons";
import { loadFlow } from "../../../_lib/load";
import { StatusScreen, Timeline, OrderLine } from "@/components/order/StatusScreen";
import { isPaidStatus } from "@/server/orders";
import { latestPayment, providerLabel } from "@/server/payments";
import { getUser } from "@/server/auth";
import { formatPrice } from "@/lib/format";
import { tashkentStamp } from "@/components/order/time";
import { env } from "@/server/env";

export const metadata = { title: "Chek tasdiqlandi" };

export default async function ApprovedPage({ params }: { params: Promise<{ id: string }> }) {
  const { order, template, b } = await loadFlow((await params).id, "other");
  const base = `/buyurtma/${order.id}`;
  if (!isPaidStatus(b.order.status)) redirect(`${base}/tolov/p2p/tekshirilmoqda`);
  const p = await latestPayment(order.id);
  const user = await getUser();
  const host = env.siteUrl.replace(/^https?:\/\//, "");
  return (
    <StatusScreen
      kind="success"
      title="Chekingiz tasdiqlandi"
      text="O‘tkazmangiz qabul qilindi. Taklifnomangiz ishga tushdi, havola SMS orqali ham yuborildi."
    >
      <Timeline
        items={[
          { title: "Chek yuborildi", sub: tashkentStamp(p?.createdAt), state: "done" },
          { title: "To‘lov tasdiqlandi", sub: tashkentStamp(p?.paidAt ?? b.order.paidAt), state: "done" },
          { title: "Taklifnoma ishga tushdi", sub: `${host}/${order.slug}`, state: "done" },
        ]}
      />
      <OrderLine left={`№ ${order.code} · ${p ? providerLabel[p.provider] : template.name}`} amount={formatPrice(order.amount)} />
      <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
        <Link href={`${base}/tayyor`} className="btn btn-primary">
          Taklifnomamni ko‘rish <ArrowRight size={16} />
        </Link>
        <Link href={user ? "/kabinet" : "/kirish?next=%2Fkabinet"} className="btn btn-secondary">
          Buyurtmalarimga o‘tish
        </Link>
      </div>
    </StatusScreen>
  );
}
