import { eq } from "drizzle-orm";
import { fail, json } from "@/server/http";
import { getUser } from "@/server/auth";
import { db, briefs } from "@/server/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await getUser();
  if (!u?.isAdmin) return fail("Ruxsat yo‘q", 403);
  const { status } = (await req.json().catch(() => ({}))) as { status?: string };
  if (!["new", "contacted", "in_progress", "done", "rejected"].includes(status ?? "")) return fail("Holat noto‘g‘ri");
  await db.update(briefs).set({ status: status! }).where(eq(briefs.id, (await params).id));
  return json({ ok: true });
}
