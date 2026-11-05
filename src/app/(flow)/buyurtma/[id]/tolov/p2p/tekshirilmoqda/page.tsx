import { redirect } from "next/navigation";
import { loadFlow } from "../../../_lib/load";
import { P2PChecking } from "@/components/order/P2PChecking";
import { isPaidStatus } from "@/server/orders";
import { latestPayment } from "@/server/payments";
import { getUser } from "@/server/auth";
import { formatPrice } from "@/lib/format";
import { tashkentStamp } from "@/components/order/time";

export const metadata = { title: "Chek tekshirilmoqda" };

export default async function CheckingPage({ params }: { params: Promise<{ id: string }> }) {
  const { order, template, b } = await loadFlow((await params).id, "other");
  const base = `/buyurtma/${order.id}`;
  if (isPaidStatus(b.order.status)) redirect(`${base}/tolov/p2p/tasdiqlandi`);
  if (b.order.status !== "p2p_review" && b.order.status !== "p2p_rejected") redirect(`${base}/tolov`);
  const p = await latestPayment(order.id);
  const user = await getUser();
  return (
    <P2PChecking
      orderId={order.id}
      sentAt={tashkentStamp(p?.createdAt)}
      line={`№ ${order.code} · ${template.name}`}
      amount={formatPrice(order.amount)}
      loggedIn={!!user}
    />
  );
}
