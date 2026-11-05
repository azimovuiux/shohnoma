import { getTemplate } from "@/lib/templates";
import { loadFlow, isEditing } from "../_lib/load";
import { FlowTop } from "@/components/order/FlowTop";
import { MarosimForm } from "@/components/order/MarosimForm";
import { CreateDraft } from "@/components/order/CreateDraft";

export const metadata = { title: "Marosim ma’lumotlari" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function MarosimPage({ params, searchParams }: Props) {
  const { id } = await params;
  const t = getTemplate(id);
  if (t) return <CreateDraft templateSlug={t.slug} name={t.name} />;

  const editing = isEditing(await searchParams);
  const { order, template } = await loadFlow(id, "marosim", { editing });
  return (
    <>
      <FlowTop
        back={editing ? { href: `/kabinet/t/${order.invitationId}`, label: "Taklifnomaga qaytish" } : { href: `/shablonlar/${template.slug}`, label: "Shablonga qaytish" }}
        step={editing ? undefined : 1}
        title={editing ? "Ma’lumotlarni tahrirlash" : "Baxtli kuningiz"}
        sub="Ismlar, sana va manzilni kiriting — o‘ng tomonda taklifnoma qanday chiqishini ko‘rasiz."
        subMobile="Ismlar, sana va manzilni kiriting."
      />
      <MarosimForm order={order} template={template} editing={editing} />
    </>
  );
}
