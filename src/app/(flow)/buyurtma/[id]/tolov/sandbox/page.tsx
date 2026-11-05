import { notFound } from "next/navigation";
import { MoneySend } from "@/components/icons";
import { loadFlow } from "../../_lib/load";
import { StatusScreen, InfoCard } from "@/components/order/StatusScreen";
import { Sandbox } from "@/components/order/Sandbox";
import { env } from "@/server/env";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Test to‘lov" };

export default async function SandboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ usul?: string }>;
}) {
  if (!env.paymentsSandbox) notFound();
  const { order } = await loadFlow((await params).id, "other");
  const usul = (await searchParams).usul ?? "payme";
  return (
    <StatusScreen
      kind="progress"
      icon={<MoneySend size={30} />}
      title="Test to‘lov"
      text="Bu sahifa faqat sinov rejimida ko‘rinadi — haqiqiy provayder o‘rniga natijani tanlang."
    >
      <InfoCard rows={[["Buyurtma", `№ ${order.code}`], ["Usul", usul], ["Summa", formatPrice(order.amount)]]} />
      <Sandbox orderId={order.id} provider={usul} />
    </StatusScreen>
  );
}
