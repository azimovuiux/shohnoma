import { loadFlow } from "../_lib/load";
import { FlowTop } from "@/components/order/FlowTop";
import { ReviewView } from "@/components/order/ReviewView";

export const metadata = { title: "Ko‘rib chiqish" };

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { order, template } = await loadFlow((await params).id, "korib-chiqish");
  return (
    <>
      <FlowTop
        back={{ href: `/buyurtma/${order.id}/tafsilotlar`, label: "Tafsilotlarga qaytish" }}
        step={3}
        title="Saytingiz shunday ko‘rinadi"
        sub="Laptop va telefonda ko‘rib chiqing — biror narsani o‘zgartirish kerak bo‘lsa, qalamchani bosing."
        subMobile="Biror narsani o‘zgartirish kerak bo‘lsa, qalamchani bosing."
      />
      <ReviewView order={order} template={template} />
    </>
  );
}
