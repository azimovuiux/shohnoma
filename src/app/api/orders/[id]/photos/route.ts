import { eq } from "drizzle-orm";
import { fail, json } from "@/server/http";
import { getOwnedOrder } from "@/server/orders";
import { saveUpload, deleteUpload } from "@/server/storage";
import { db, invitations } from "@/server/db";

type Ctx = { params: Promise<{ id: string }> };
const MAX_PHOTOS = 10;

export async function POST(req: Request, { params }: Ctx) {
  const b = await getOwnedOrder((await params).id);
  if (!b) return fail("Buyurtma topilmadi", 404);
  const photos = b.invitation.photos ?? [];
  if (photos.length >= MAX_PHOTOS) return fail(`Ko‘pi bilan ${MAX_PHOTOS} ta surat`, 422);
  const fd = await req.formData();
  try {
    const url = await saveUpload(fd.get("file") as File, "photos");
    const next = [...photos, url];
    await db.update(invitations).set({ photos: next }).where(eq(invitations.id, b.invitation.id));
    return json({ ok: true, url, photos: next });
  } catch (e) {
    return fail((e as Error).message, 422);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const b = await getOwnedOrder((await params).id);
  if (!b) return fail("Buyurtma topilmadi", 404);
  const { url } = (await req.json().catch(() => ({}))) as { url?: string };
  const next = (b.invitation.photos ?? []).filter((p) => p !== url);
  await db.update(invitations).set({ photos: next }).where(eq(invitations.id, b.invitation.id));
  if (url) await deleteUpload(url);
  return json({ ok: true, photos: next });
}
