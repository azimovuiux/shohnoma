import "server-only";
import { eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getUser, SESSION_COOKIE } from "./auth";
import { db, orders, favorites } from "./db";

export type HeaderUser = { name: string | null; phone: string | null; telegramUser: string | null; orders: number; favorites: number; isAdmin: boolean } | null;

/** Header va mobil menyu uchun (spec §5.1, 25) */
export async function getHeaderUser(): Promise<HeaderUser> {
  // cookies() — sahifani dinamik qiladi (try/catch tashqarisida bo‘lishi shart)
  const jar = await cookies();
  if (!jar.get(SESSION_COOKIE)) return null;
  let u;
  try {
    u = await getUser();
  } catch (e) {
    console.error("[header] db", e);
    return null;
  }
  if (!u) return null;
  const [[o], [f]] = await Promise.all([
    db.select({ n: sql<number>`COUNT(*)` }).from(orders).where(eq(orders.userId, u.id)),
    db.select({ n: sql<number>`COUNT(*)` }).from(favorites).where(eq(favorites.userId, u.id)),
  ]);
  return { name: u.name, phone: u.phone, telegramUser: u.telegramUser, orders: Number(o.n), favorites: Number(f.n), isAdmin: u.isAdmin };
}
