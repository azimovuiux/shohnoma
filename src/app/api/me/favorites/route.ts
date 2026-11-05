import { and, eq } from "drizzle-orm";
import { fail, json } from "@/server/http";
import { getUser } from "@/server/auth";
import { db, favorites } from "@/server/db";
import { getTemplate } from "@/lib/templates";

export async function GET() {
  const u = await getUser();
  if (!u) return json({ ok: true, slugs: null });
  const rows = await db.select().from(favorites).where(eq(favorites.userId, u.id));
  return json({ ok: true, slugs: rows.map((r) => r.templateSlug) });
}

/** {slug} qo‘shish yoki {slugs: []} — localStorage'dan ko‘chirish */
export async function POST(req: Request) {
  const u = await getUser();
  if (!u) return fail("Kirilmagan", 401);
  const body = (await req.json().catch(() => ({}))) as { slug?: string; slugs?: string[] };
  const list = [...(body.slugs ?? []), ...(body.slug ? [body.slug] : [])].filter((s) => getTemplate(s));
  for (const s of list) await db.insert(favorites).ignore().values({ userId: u.id, templateSlug: s });
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  const u = await getUser();
  if (!u) return fail("Kirilmagan", 401);
  const { slug } = (await req.json().catch(() => ({}))) as { slug?: string };
  if (slug) await db.delete(favorites).where(and(eq(favorites.userId, u.id), eq(favorites.templateSlug, slug)));
  return json({ ok: true });
}
