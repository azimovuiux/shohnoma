import { redirect } from "next/navigation";
import { loadFlow } from "../../_lib/load";
import { FlowTop } from "@/components/order/FlowTop";
import { P2PTransfer } from "@/components/order/P2PTransfer";
import { latestPayment } from "@/server/payments";
import { env } from "@/server/env";

export const metadata = { title: "Kartaga o‘tkazma" };

export default async function P2PPage({ params }: { params: Promise<{ id: string }> }) {
  const { order, template, b } = await loadFlow((await params).id, "tolov");
  if (b.order.status === "p2p_review") redirect(`/buyurtma/${order.id}/tolov/p2p/tekshirilmoqda`);
  const last = await latestPayment(order.id);
  const rejected = b.order.status === "p2p_rejected" && last?.provider === "p2p" ? last.reviewNote ?? "Chek ma’lumotlari mos kelmadi" : null;
  return (
    <>
      <FlowTop
        back={{ href: `/buyurtma/${order.id}/tolov`, label: "To‘lov usuliga qaytish" }}
        step={4}
        title="Kartaga o‘tkazma"
        sub="Istalgan bank ilovasidan o‘tkazing va chekni yuboring."
      />
      <P2PTransfer order={order} template={template} card={{ card: env.p2pCard, holder: env.p2pHolder, bank: env.p2pBank }} rejectedNote={rejected} />
    </>
  );
}
