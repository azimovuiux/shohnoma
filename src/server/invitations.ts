import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, invitations, orders, guestResponses, users, type RsvpStatus } from "./db";
import { isPaidStatus } from "./orders";

/** Ommaviy taklifnoma: faqat to‘langan/faol buyurtmalar (spec §8.5) */
export async function getPublicInvitation(slug: string) {
  const [row] = await db
    .select({ invitation: invitations, order: orders, owner: users })
    .from(invitations)
    .innerJoin(orders, eq(orders.id, invitations.orderId))
    .leftJoin(users, eq(users.id, orders.userId))
    .where(eq(invitations.slug, slug))
    .limit(1);
  if (!row) return null;
  if (!isPaidStatus(row.order.status) && row.order.status !== "archived") return null;
  return row;
}

export async function countView(invitationId: string) {
  await db.update(invitations).set({ views: sql`${invitations.views} + 1` }).where(eq(invitations.id, invitationId));
}

export async function invitationStats(invitationId: string) {
  const rows = await db
    .select({ status: guestResponses.status, people: sql<number>`SUM(${guestResponses.count})`, n: sql<number>`COUNT(*)` })
    .from(guestResponses)
    .where(eq(guestResponses.invitationId, invitationId))
    .groupBy(guestResponses.status);
  const by = (s: RsvpStatus) => rows.find((r) => r.status === s);
  const coming = Number(by("coming")?.people ?? 0);
  const maybe = Number(by("maybe")?.people ?? 0);
  const notComing = Number(by("not_coming")?.people ?? 0);
  const responses = rows.reduce((a, r) => a + Number(r.n), 0);
  return { coming, maybe, notComing, total: coming + maybe + notComing, responses };
}

export async function guestList(invitationId: string, opts: { status?: RsvpStatus; q?: string; limit?: number; offset?: number } = {}) {
  const conds = [eq(guestResponses.invitationId, invitationId)];
  if (opts.status) conds.push(eq(guestResponses.status, opts.status));
  if (opts.q) conds.push(sql`${guestResponses.name} LIKE ${"%" + opts.q.replace(/[%_]/g, "") + "%"}`);
  const where = and(...conds);
  const [{ n }] = await db.select({ n: sql<number>`COUNT(*)` }).from(guestResponses).where(where);
  const list = await db
    .select()
    .from(guestResponses)
    .where(where)
    .orderBy(sql`${guestResponses.createdAt} DESC`)
    .limit(opts.limit ?? 8)
    .offset(opts.offset ?? 0);
  return { total: Number(n), list };
}

export const rsvpBody = z.object({
  name: z.string().trim().min(1, "Ismingizni kiriting").max(120),
  status: z.enum(["coming", "maybe", "not_coming"]),
  count: z.number().int().min(1).max(10).default(1),
  wish: z.string().trim().max(1000).optional().nullable(),
  website: z.string().optional(), // honeypot
});

