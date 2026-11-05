import { loadFlow } from "../_lib/load";
import { FlowTop } from "@/components/order/FlowTop";
import { PayChoice } from "@/components/order/PayChoice";
import { enabledProviders } from "@/server/payments";

export const metadata = { title: "To‘lov" };

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { order, template } = await loadFlow((await params).id, "tolov");
  return (
    <>
      <FlowTop
        back={{ href: `/buyurtma/${order.id}/korib-chiqish`, label: "Tekshiruvga qaytish" }}
        step={4}
        title="So‘nggi qadam"
        sub="Qulay to‘lov usulini tanlang."
      />
      <PayChoice order={order} template={template} providers={enabledProviders()} />
    </>
  );
}
