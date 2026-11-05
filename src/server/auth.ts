import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db, users, sessions, otpCodes, orders, type User } from "./db";
import { newId, newToken, randomCode, sha256, safeEqual } from "./ids";
import { sendSms } from "./sms";
import { env, isProd } from "./env";

export const SESSION_COOKIE = "sh_session";
export const GUEST_COOKIE = "sh_guest";
const SESSION_DAYS = 60;

export function normalizePhone(raw: string) {
  const d = raw.replace(/\D/g, "");
  const n = d.length === 9 ? `998${d}` : d;
  return /^998\d{9}$/.test(n) ? `+${n}` : null;
}

export function formatPhone(p: string | null | undefined) {
  if (!p) return "";
  const d = p.replace(/\D/g, "").replace(/^998/, "");
  return `+998 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
}

/* ── Sessiya ── */

export async function createSession(userId: string) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.insert(sessions).values({ id: sha256(token), userId, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: isProd, path: "/", expires: expiresAt });
  // Kirmasdan yaratilgan qoralamalarni akkauntga bog‘lash
  const guest = jar.get(GUEST_COOKIE)?.value;
  if (guest) {
    await db.update(orders).set({ userId }).where(and(eq(orders.guestToken, guest), isNull(orders.userId)));
  }
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

export async function getUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const u = rows[0]?.user ?? null;
  if (u && !u.isAdmin && u.phone && env.adminPhones.includes(u.phone)) {
    await db.update(users).set({ isAdmin: true }).where(eq(users.id, u.id));
    u.isAdmin = true;
  }
  return u;
}

export async function requireUser(next = "/kabinet") {
  const u = await getUser();
  if (!u) redirect(`/kirish?next=${encodeURIComponent(next)}`);
  return u;
}

export async function requireAdmin() {
  const u = await requireUser("/admin");
  if (!u.isAdmin) redirect("/");
  return u;
}

/** Kirmagan foydalanuvchi uchun brauzer tokeni (qoralama buyurtmalar) */
export async function getGuestToken(create = false) {
  const jar = await cookies();
  let t = jar.get(GUEST_COOKIE)?.value;
  if (!t && create) {
    t = newToken(24);
    jar.set(GUEST_COOKIE, t, { httpOnly: true, sameSite: "lax", secure: isProd, path: "/", maxAge: 90 * 86400 });
  }
  return t ?? null;
}

export async function findOrCreateUserByPhone(phone: string, name?: string | null) {
  const [u] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (u) return u;
  const id = newId();
  await db.insert(users).values({ id, phone, name: name ?? null, isAdmin: env.adminPhones.includes(phone) });
  const [created] = await db.select().from(users).where(eq(users.id, id));
  return created;
}

/* ── SMS kod (spec §6.9: 1 daqiqada 1 SMS, 5 daqiqa amal qiladi, 5 xato → 15 daqiqa blok) ── */

export type OtpResult = { ok: true; devCode?: string } | { ok: false; error: string; retryIn?: number };

export async function sendOtp(phone: string): Promise<OtpResult> {
  const [last] = await db.select().from(otpCodes).where(eq(otpCodes.phone, phone)).orderBy(desc(otpCodes.createdAt)).limit(1);
  if (last) {
    if (last.attempts >= 5 && Date.now() - last.createdAt.getTime() < 15 * 60_000)
      return { ok: false, error: "Ko‘p marta xato kiritildi. 15 daqiqadan so‘ng urinib ko‘ring." };
    const since = Date.now() - last.createdAt.getTime();
    if (since < 60_000) return { ok: false, error: "Kodni qayta so‘rashdan oldin biroz kuting.", retryIn: Math.ceil((60_000 - since) / 1000) };
  }
  const code = randomCode(6);
  await db.insert(otpCodes).values({
    id: newId(),
    phone,
    codeHash: sha256(`${phone}:${code}:${env.sessionSecret}`),
    expiresAt: new Date(Date.now() + 5 * 60_000),
  });
  const sent = await sendSms(phone, `Shohnoma: kirish kodi ${code}. Kodni hech kimga bermang.`);
  if (!sent) return { ok: false, error: "SMS yuborilmadi. Birozdan so‘ng urinib ko‘ring." };
  const devCode = !env.eskizEmail && !isProd ? code : undefined;
  return { ok: true, devCode };
}

export async function verifyOtp(phone: string, code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const [row] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), isNull(otpCodes.usedAt)))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  if (!row || row.expiresAt < new Date()) return { ok: false, error: "Kod eskirgan. Yangi kod so‘rang." };
  if (row.attempts >= 5) return { ok: false, error: "Ko‘p marta xato kiritildi. 15 daqiqadan so‘ng urinib ko‘ring." };
  if (!safeEqual(row.codeHash, sha256(`${phone}:${code}:${env.sessionSecret}`))) {
    await db.update(otpCodes).set({ attempts: row.attempts + 1 }).where(eq(otpCodes.id, row.id));
    return { ok: false, error: "Kod noto‘g‘ri" };
  }
  await db.update(otpCodes).set({ usedAt: new Date() }).where(eq(otpCodes.id, row.id));
  return { ok: true };
}
