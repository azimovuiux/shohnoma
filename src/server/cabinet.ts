import "server-only";
import { notFound } from "next/navigation";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, orders, invitations, payments, guestResponses, favorites, type User } from "./db";
import { invitationStats } from "./invitations";

/** Foydalanuvchining barcha buyurtmalari (taklifnomalari) — 09 */
export async function listUserOrders(userId: string) {
  const rows = await db
    .select({ order: orders, invitation: invitations })
    .from(orders)
    .innerJoin(invitations, eq(invitations.orderId, orders.id))
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
  const ids = rows.map((r) => r.invitation.id);
  const counts = ids.length
    ? await db
        .select({ id: guestResponses.invitationId, status: guestResponses.status, people: sql<number>`SUM(${guestResponses.count})`, n: sql<number>`COUNT(*)` })
        .from(guestResponses)
        .where(inArray(guestResponses.invitationId, ids))
        .groupBy(guestResponses.invitationId, guestResponses.status)
    : [];
  return rows.map((r) => {
    const c = counts.filter((x) => x.id === r.invitation.id);
    const pick = (s: string) => Number(c.find((x) => x.status === s)?.people ?? 0);
    return {
      ...r,
      stats: { coming: pick("coming"), maybe: pick("maybe"), notComing: pick("not_coming"), responses: c.reduce((a, x) => a + Number(x.n), 0) },
    };
  });
}

/** Taklifnoma + buyurtma, egasi tekshiriladi (aks holda 404) */
export async function getUserInvitation(invitationId: string, user: User) {
  const [row] = await db
    .select({ order: orders, invitation: invitations })
    .from(invitations)
    .innerJoin(orders, eq(orders.id, invitations.orderId))
    .where(eq(invitations.id, invitationId))
    .limit(1);
  if (!row || (row.order.userId !== user.id && !user.isAdmin)) notFound();
  const stats = await invitationStats(row.invitation.id);
  return { ...row, stats };
}

/** Panel tanlagichi uchun foydalanuvchining boshqa taklifnomalari */
export async function invitationSwitcherList(userId: string) {
  return db
    .select({ id: invitations.id, personA: invitations.personA, personB: invitations.personB, date: invitations.date, status: orders.status, templateSlug: orders.templateSlug })
    .from(invitations)
    .innerJoin(orders, eq(orders.id, invitations.orderId))
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
}

export async function orderPayments(orderId: string) {
  return db.select().from(payments).where(eq(payments.orderId, orderId)).orderBy(desc(payments.createdAt));
}

/** Profil: to‘lovlar tarixi (barcha buyurtmalar bo‘yicha) */
export async function userPaymentHistory(userId: string) {
  return db
    .select({ order: orders, invitation: invitations, payment: payments })
    .from(orders)
    .innerJoin(invitations, eq(invitations.orderId, orders.id))
    .leftJoin(payments, and(eq(payments.orderId, orders.id), eq(payments.status, "paid")))
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
}

export async function userFavoriteSlugs(userId: string) {
  const rows = await db.select().from(favorites).where(eq(favorites.userId, userId)).orderBy(desc(favorites.createdAt));
  return rows.map((r) => r.templateSlug);
}

export async function cabinetCounts(userId: string) {
  const [[o], [f]] = await Promise.all([
    db.select({ n: sql<number>`COUNT(*)` }).from(orders).where(eq(orders.userId, userId)),
    db.select({ n: sql<number>`COUNT(*)` }).from(favorites).where(eq(favorites.userId, userId)),
  ]);
  return { orders: Number(o.n), favorites: Number(f.n) };
}
