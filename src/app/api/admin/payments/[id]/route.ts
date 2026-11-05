import { eq } from "drizzle-orm";
import { fail, json } from "@/server/http";
import { getUser } from "@/server/auth";
import { db, payments, orders, users, invitations } from "@/server/db";
import { markOrderPaid } from "@/server/orders";
import { sendSms } from "@/server/sms";
import { notifyUser } from "@/server/telegram";

/** P2P chekni tasdiqlash / rad etish */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getUser();
  if (!admin?.isAdmin) return fail("Ruxsat yo‘q", 403);
  const { action, note } = (await req.json().catch(() => ({}))) as { action?: "approve" | "reject"; note?: string };
  const [p] = await db.select().from(payments).where(eq(payments.id, (await params).id));
  if (!p || p.provider !== "p2p") return fail("To‘lov topilmadi", 404);
  if (p.status !== "review") return fail("Bu chek allaqachon ko‘rib chiqilgan", 409);
  if (action === "approve") {
    await db.update(payments).set({ reviewedBy: admin.id }).where(eq(payments.id, p.id));
    await markOrderPaid(p.orderId, "p2p", p.id);
    return json({ ok: true });
  }
  if (action === "reject") {
    const reason = (note ?? "").trim().slice(0, 300) || "Chek ma’lumotlari mos kelmadi";
    await db.update(payments).set({ status: "rejected", reviewNote: reason, reviewedBy: admin.id }).where(eq(payments.id, p.id));
    await db.update(orders).set({ status: "p2p_rejected" }).where(eq(orders.id, p.orderId));
    const [row] = await db
      .select({ order: orders, owner: users, inv: invitations })
      .from(orders)
      .leftJoin(users, eq(users.id, orders.userId))
      .innerJoin(invitations, eq(invitations.orderId, orders.id))
      .where(eq(orders.id, p.orderId));
    const phone = row?.owner?.phone ?? row?.inv.contactPhone;
    const text = `Shohnoma: ${row?.order.code} bo‘yicha chek qabul qilinmadi: ${reason}`;
    if (phone) await sendSms(phone, text).catch(() => false);
    await notifyUser(row?.owner?.telegramId, text);
    return json({ ok: true });
  }
  return fail("Noma’lum amal");
}
