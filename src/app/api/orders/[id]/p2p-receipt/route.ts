import { fail, json } from "@/server/http";
import { getOwnedOrder, isPaidStatus } from "@/server/orders";
import { saveUpload } from "@/server/storage";
import { createP2pPayment } from "@/server/payments";
import { notifyAdmin } from "@/server/telegram";
import { formatPrice } from "@/lib/format";
import { env } from "@/server/env";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const b = await getOwnedOrder((await params).id);
  if (!b) return fail("Buyurtma topilmadi", 404);
  if (isPaidStatus(b.order.status)) return fail("Buyurtma allaqachon to‘langan", 409);
  const fd = await req.formData();
  try {
    const url = await saveUpload(fd.get("file") as File, "receipts");
    await createP2pPayment(b.order.id, b.order.amount, url);
    await notifyAdmin(`🧾 Yangi P2P chek: ${b.order.code} · ${formatPrice(b.order.amount)}\n${env.siteUrl}${url}\nTasdiqlash: ${env.siteUrl}/admin/tolovlar`);
    return json({ ok: true });
  } catch (e) {
    return fail((e as Error).message, 422);
  }
}
