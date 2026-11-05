import { redirect } from "next/navigation";
import { loadFlow } from "../../_lib/load";
import { Processing } from "@/components/order/Processing";
import { isPaidStatus } from "@/server/orders";
import { latestPayment } from "@/server/payments";
import type { Provider } from "@/components/order/PayChoice";

export const metadata = { title: "To‘lov jarayonida" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> };

export default async function ProcessingPage({ params, searchParams }: Props) {
  const { order, template } = await loadFlow((await params).id, "other");
  const sp = await searchParams;
  const base = `/buyurtma/${order.id}`;
  if (isPaidStatus(order.status as never)) redirect(`${base}/tolov/qabul-qilindi`);
  if (order.status === "payment_failed" && !sp.ochish) redirect(`${base}/tolov/xato`);
  const last = await latestPayment(order.id);
  const usul = (["payme", "click", "google_pay"].includes(sp.usul ?? "") ? sp.usul : last?.provider ?? "payme") as Provider;
  if (usul === "p2p") redirect(`${base}/tolov/p2p`);
  return (
    <Processing
      orderId={order.id}
      provider={usul}
      autoOpen={sp.ochish === "1"}
      code={order.code}
      templateName={template.name}
      amount={order.amount}
    />
  );
}
