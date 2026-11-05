import { redirect } from "next/navigation";
import { missingFields } from "@/server/order-update";
import { loadFlow, isEditing } from "../_lib/load";
import { FlowTop } from "@/components/order/FlowTop";
import { TafsilotlarForm } from "@/components/order/TafsilotlarForm";

export const metadata = { title: "Tafsilotlar" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function TafsilotlarPage({ params, searchParams }: Props) {
  const editing = isEditing(await searchParams);
  const { order, template, b } = await loadFlow((await params).id, "tafsilotlar", { editing });
  if (!editing && missingFields(b.invitation).length) redirect(`/buyurtma/${order.id}/marosim`);
  return (
    <>
      <FlowTop
        back={
          editing
            ? { href: `/kabinet/t/${order.invitationId}`, label: "Taklifnomaga qaytish" }
            : { href: `/buyurtma/${order.id}/marosim`, label: "Ma’lumotlarga qaytish" }
        }
        step={editing ? undefined : 2}
        title={editing ? "Tafsilotlarni tahrirlash" : "Sizga xos tafsilotlar"}
        sub="Taklifnomani shaxsiylashtiring va bog‘lanish ma’lumotlarini qoldiring."
      />
      <TafsilotlarForm order={order} template={template} editing={editing} />
    </>
  );
}
