import { eq } from "drizzle-orm";
import { fail, json } from "@/server/http";
import { createSession, getUser } from "@/server/auth";
import { verifyTelegramAuth } from "@/server/telegram";
import { db, users } from "@/server/db";
import { newId } from "@/server/ids";

/** Telegram Login Widget ma’lumoti. Kirgan foydalanuvchi uchun — akkauntga Telegram ulash. */
export async function POST(req: Request) {
  const data = (await req.json().catch(() => ({}))) as Record<string, string>;
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)]));
  if (!verifyTelegramAuth(clean)) return fail("Telegram ma’lumotini tasdiqlab bo‘lmadi", 401);
  const tgId = clean.id;
  const tgUser = clean.username ? `@${clean.username}` : null;
  const name = [clean.first_name, clean.last_name].filter(Boolean).join(" ") || null;

  const current = await getUser();
  if (current) {
    await db.update(users).set({ telegramId: tgId, telegramUser: tgUser }).where(eq(users.id, current.id));
    return json({ ok: true, linked: true });
  }
  let [u] = await db.select().from(users).where(eq(users.telegramId, tgId)).limit(1);
  if (!u) {
    const id = newId();
    await db.insert(users).values({ id, telegramId: tgId, telegramUser: tgUser, name });
    [u] = await db.select().from(users).where(eq(users.id, id));
  }
  await createSession(u.id);
  return json({ ok: true });
}
