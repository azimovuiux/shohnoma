import { fail, json, rateLimited, clientIp } from "@/server/http";
import { getPublicInvitation, rsvpBody } from "@/server/invitations";
import { db, guestResponses } from "@/server/db";
import { newId, newToken } from "@/server/ids";
import { notifyUser } from "@/server/telegram";
import { sendSms } from "@/server/sms";

const label = { coming: "Boraman", maybe: "Hali aniq emas", not_coming: "Kela olmayman" } as const;

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const row = await getPublicInvitation((await params).slug);
  if (!row || row.order.status === "archived") return fail("Taklifnoma topilmadi", 404);
  if (!row.invitation.rsvpEnabled) return fail("Javob qabul qilinmaydi", 409);
  if (rateLimited(`rsvp:${await clientIp()}:${row.invitation.id}`, 10, 60 * 60_000)) return fail("Juda ko‘p urinish", 429);
  const p = rsvpBody.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Ma’lumot noto‘g‘ri", 422);
  if (p.data.website) return json({ ok: true, editToken: newToken(18) });
  const count = p.data.status === "not_coming" ? 1 : p.data.count;
  const editToken = newToken(24);
  await db.insert(guestResponses).values({
    id: newId(),
    invitationId: row.invitation.id,
    name: p.data.name,
    status: p.data.status,
    count,
    wish: p.data.wish || null,
    editToken,
  });
  const text = `💌 ${p.data.name} — ${label[p.data.status]}${p.data.status === "coming" ? `, ${count} kishi` : ""}${p.data.wish ? `\n“${p.data.wish}”` : ""}`;
  const o = row.owner;
  if (o?.notifyRsvpTelegram) await notifyUser(o.telegramId, text);
  if (o?.notifyRsvpSms && o.phone) await sendSms(o.phone, `Shohnoma: ${p.data.name} — ${label[p.data.status]}`).catch(() => false);
  return json({ ok: true, editToken, count });
}
