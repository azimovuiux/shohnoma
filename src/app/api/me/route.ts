import { eq } from "drizzle-orm";
import { z } from "zod";
import { fail, json } from "@/server/http";
import { getUser } from "@/server/auth";
import { db, users } from "@/server/db";

export async function GET() {
  const u = await getUser();
  return u ? json({ ok: true, user: u }) : fail("Kirilmagan", 401);
}

const patch = z
  .object({
    name: z.string().trim().max(120),
    notifyRsvpTelegram: z.boolean(),
    notifyRsvpSms: z.boolean(),
    notifyDayBefore: z.boolean(),
  })
  .partial();

export async function PATCH(req: Request) {
  const u = await getUser();
  if (!u) return fail("Kirilmagan", 401);
  const p = patch.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("Ma’lumot noto‘g‘ri", 422);
  if (Object.keys(p.data).length) await db.update(users).set(p.data).where(eq(users.id, u.id));
  return json({ ok: true });
}
