import { and, eq, isNull, like } from "drizzle-orm";
import { fail, json } from "@/server/http";
import { env } from "@/server/env";
import { db, invitations, orders, users } from "@/server/db";
import { invitationStats } from "@/server/invitations";
import { notifyUser } from "@/server/telegram";

/**
 * To‘yga 1 kun qolganda eslatma (spec §12). Plesk "Scheduled Tasks" orqali har kuni chaqiriladi:
 *   curl -s "https://shohnoma.uz/api/cron/reminders?secret=CRON_SECRET"
 */
export async function GET(req: Request) {
  if (!env.cronSecret || new URL(req.url).searchParams.get("secret") !== env.cronSecret) return fail("Ruxsat yo‘q", 403);
  const tomorrow = new Date(Date.now() + 5 * 3600_000 + 86400_000).toISOString().slice(0, 10);
  const rows = await db
    .select({ inv: invitations, owner: users })
    .from(invitations)
    .innerJoin(orders, eq(orders.id, invitations.orderId))
    .leftJoin(users, eq(users.id, orders.userId))
    .where(and(eq(orders.status, "active"), like(invitations.date, `${tomorrow}%`), isNull(invitations.dayBeforeSentAt)));
  let sent = 0;
  for (const { inv, owner } of rows) {
    if (owner?.notifyDayBefore && owner.telegramId) {
      const s = await invitationStats(inv.id);
      await notifyUser(owner.telegramId, `🎉 Ertaga to‘yingiz! Javoblar: ${s.coming} boraman · ${s.maybe} aniq emas · ${s.notComing} kela olmaydi`);
      sent++;
    }
    await db.update(invitations).set({ dayBeforeSentAt: new Date() }).where(eq(invitations.id, inv.id));
  }
  return json({ ok: true, checked: rows.length, sent });
}
