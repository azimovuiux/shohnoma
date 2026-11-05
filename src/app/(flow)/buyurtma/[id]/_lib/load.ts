import "server-only";
import { notFound, redirect } from "next/navigation";
import { getOwnedOrder, isPaidStatus, type OrderBundle } from "@/server/orders";
import { missingFields } from "@/server/order-update";
import { getTemplate, type Template } from "@/lib/templates";
import type { FlowOrder } from "@/components/order/types";

export type Step = "marosim" | "tafsilotlar" | "korib-chiqish" | "tolov";

export function toFlowOrder(b: OrderBundle): FlowOrder {
  const inv = b.invitation;
  const [day = "", time = ""] = (inv.date || "").split("T");
  return {
    id: b.order.id,
    code: b.order.code,
    status: b.order.status,
    amount: b.order.amount,
    templateSlug: b.order.templateSlug,
    invitationId: inv.id,
    slug: inv.slug,
    ceremony: (inv.ceremony === "boshqa" ? "nikoh" : inv.ceremony) as FlowOrder["ceremony"],
    personA: inv.personA,
    personB: inv.personB ?? "",
    day,
    time,
    venueName: inv.venueName,
    address: inv.address,
    mapUrl: inv.mapUrl ?? "",
    message: inv.message ?? "",
    program: inv.program ?? [],
    photos: inv.photos ?? [],
    rsvpEnabled: inv.rsvpEnabled,
    rsvpDeadline: inv.rsvpDeadline,
    musicEnabled: inv.musicEnabled,
    contactPhone: inv.contactPhone ?? "",
    contactTg: inv.contactTg ?? "",
  };
}

/** Buyurtmani yuklash + holatga qarab yo‘naltirish */
export async function loadFlow(id: string, step: Step | "other", opts: { editing?: boolean } = {}) {
  const b = await getOwnedOrder(id);
  if (!b) notFound();
  const template = getTemplate(b.order.templateSlug) as Template;
  if (!template) notFound();
  const s = b.order.status;
  const base = `/buyurtma/${b.order.id}`;

  if (step !== "other") {
    if (s === "archived") redirect("/kabinet");
    if (isPaidStatus(s) && !opts.editing) redirect(`${base}/tayyor`);
    if (s === "p2p_review" && !opts.editing) redirect(`${base}/tolov/p2p/tekshirilmoqda`);
    if (step === "korib-chiqish" || step === "tolov") {
      if (missingFields(b.invitation).length) redirect(`${base}/marosim`);
      if (!b.invitation.contactPhone) redirect(`${base}/tafsilotlar`);
    }
  }
  return { b, template, order: toFlowOrder(b) };
}

export const isEditing = (sp: Record<string, string | string[] | undefined>) => sp.qaytish === "kabinet";
