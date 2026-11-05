import { and, eq } from "drizzle-orm";
import { fail, json } from "@/server/http";
import { getPublicInvitation, rsvpBody } from "@/server/invitations";
import { db, guestResponses } from "@/server/db";

type Ctx = { params: Promise<{ slug: string; token: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { slug, token } = await params;
  const row = await getPublicInvitation(slug);
  if (!row) return fail("Topilmadi", 404);
  const [g] = await db.select().from(guestResponses).where(and(eq(guestResponses.editToken, token), eq(guestResponses.invitationId, row.invitation.id)));
  return g ? json({ ok: true, response: { name: g.name, status: g.status, count: g.count, wish: g.wish } }) : fail("Topilmadi", 404);
}

/** "Javobni o‘zgartirish" — qurilmada saqlangan token bilan */
export async function PATCH(req: Request, { params }: Ctx) {
  const { slug, token } = await params;
  const row = await getPublicInvitation(slug);
  if (!row || row.order.status === "archived") return fail("Topilmadi", 404);
  const p = rsvpBody.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Ma’lumot noto‘g‘ri", 422);
  const res = await db
    .update(guestResponses)
    .set({ name: p.data.name, status: p.data.status, count: p.data.status === "not_coming" ? 1 : p.data.count, wish: p.data.wish || null })
    .where(and(eq(guestResponses.editToken, token), eq(guestResponses.invitationId, row.invitation.id)));
  return res[0].affectedRows ? json({ ok: true }) : fail("Topilmadi", 404);
}
