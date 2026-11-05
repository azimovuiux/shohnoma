import { redirect } from "next/navigation";
import { loadFlow } from "../_lib/load";
import { ReadyView } from "@/components/order/ReadyView";
import { isPaidStatus } from "@/server/orders";
import { latestPayment, providerLabel } from "@/server/payments";
import { getUser } from "@/server/auth";
import { env } from "@/server/env";

export const metadata = { title: "Taklifnoma tayyor" };

export default async function ReadyPage({ params }: { params: Promise<{ id: string }> }) {
  const { order, template, b } = await loadFlow((await params).id, "other");
  const base = `/buyurtma/${order.id}`;
  if (!isPaidStatus(b.order.status)) {
    if (b.order.status === "p2p_review") redirect(`${base}/tolov/p2p/tekshirilmoqda`);
    if (b.order.status === "archived") redirect("/kabinet");
    redirect(`${base}/marosim`);
  }
  const [p, user] = await Promise.all([latestPayment(order.id), getUser()]);
  return (
    <ReadyView
      order={order}
      template={template}
      url={`${env.siteUrl}/${order.slug}`}
      providerName={p ? providerLabel[p.provider] : "To‘langan"}
      loggedIn={!!user}
    />
  );
}
