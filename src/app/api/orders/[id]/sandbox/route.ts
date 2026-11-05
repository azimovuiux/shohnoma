import { eq } from "drizzle-orm";
import { fail, json } from "@/server/http";
import { getOwnedOrder, markOrderPaid } from "@/server/orders";
import { db, orders, payments, type PayProvider } from "@/server/db";
import { newId } from "@/server/ids";
import { env } from "@/server/env";

type Ctx = { params: Promise<{ id: string }> };

/** Faqat PAYMENTS_SANDBOX=1 bo‘lganda — haqiqiy provayderlarsiz to‘liq oqimni sinash */
export async function POST(req: Request, { params }: Ctx) {
  if (!env.paymentsSandbox) return fail("Not found", 404);
  const b = await getOwnedOrder((await params).id);
  if (!b) return fail("Buyurtma topilmadi", 404);
  const { result, provider } = (await req.json().catch(() => ({}))) as { result?: string; provider?: PayProvider };
  const pid = newId();
  await db.insert(payments).values({ id: pid, orderId: b.order.id, provider: provider ?? "payme", amount: b.order.amount, status: "processing", externalId: `sandbox-${pid}` });
  if (result === "success") {
    await markOrderPaid(b.order.id, provider ?? "payme", pid);
    return json({ ok: true, url: `/buyurtma/${b.order.id}/tolov/qabul-qilindi` });
  }
  await db.update(payments).set({ status: "failed" }).where(eq(payments.id, pid));
  await db.update(orders).set({ status: "payment_failed" }).where(eq(orders.id, b.order.id));
  return json({ ok: true, url: `/buyurtma/${b.order.id}/tolov/xato` });
}
