import { eq } from "drizzle-orm";
import { fail, json } from "@/server/http";
import { getOwnedOrder } from "@/server/orders";
import { applyInvitationPatch } from "@/server/order-update";
import { db, orders } from "@/server/db";
import { getTemplate } from "@/lib/templates";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const b = await getOwnedOrder((await params).id);
  if (!b) return fail("Buyurtma topilmadi", 404);
  return json({ ok: true, order: b.order, invitation: b.invitation });
}

/** 02/03 ma’lumotlarini saqlash (avtosaqlash) va to‘lovdan keyingi tahrirlash */
export async function PATCH(req: Request, { params }: Ctx) {
  const b = await getOwnedOrder((await params).id);
  if (!b) return fail("Buyurtma topilmadi", 404);
  if (b.order.status === "archived") return fail("Taklifnoma arxivlangan", 409);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return fail("Ma’lumot yo‘q");

  // Shablonni almashtirish — faqat to‘lovdan oldin
  if (typeof body.templateSlug === "string") {
    const t = getTemplate(body.templateSlug);
    if (!t) return fail("Shablon topilmadi", 404);
    if (b.order.status === "paid" || b.order.status === "active") return fail("To‘lovdan so‘ng shablonni almashtirib bo‘lmaydi", 409);
    await db.update(orders).set({ templateSlug: t.slug, amount: t.price }).where(eq(orders.id, b.order.id));
    delete body.templateSlug;
  }
  const r = await applyInvitationPatch(b, body);
  return r.ok ? json(r) : fail(r.error, 422);
}
