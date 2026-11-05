import { eq } from "drizzle-orm";
import { fail, json } from "@/server/http";
import { getUser } from "@/server/auth";
import { db, orders, orderStatuses, type OrderStatus } from "@/server/db";
import { markOrderPaid } from "@/server/orders";

/** Admin: holatni qo‘lda o‘zgartirish (arxivlash, qayta faollashtirish, qo‘lda to‘langan deb belgilash) */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await getUser();
  if (!u?.isAdmin) return fail("Ruxsat yo‘q", 403);
  const id = (await params).id;
  const { status } = (await req.json().catch(() => ({}))) as { status?: OrderStatus };
  if (!status || !orderStatuses.includes(status)) return fail("Holat noto‘g‘ri");
  if (status === "paid" || status === "active") {
    const [o] = await db.select().from(orders).where(eq(orders.id, id));
    if (o && o.status !== "archived" && o.status !== "active" && o.status !== "paid") {
      await markOrderPaid(id, "p2p");
      return json({ ok: true });
    }
  }
  await db.update(orders).set({ status }).where(eq(orders.id, id));
  return json({ ok: true });
}
