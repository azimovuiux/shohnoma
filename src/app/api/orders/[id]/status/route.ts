import { fail, json } from "@/server/http";
import { getOwnedOrder } from "@/server/orders";
import { latestPayment } from "@/server/payments";

type Ctx = { params: Promise<{ id: string }> };

/** 13/20 sahifalari uchun polling */
export async function GET(_req: Request, { params }: Ctx) {
  const b = await getOwnedOrder((await params).id);
  if (!b) return fail("Buyurtma topilmadi", 404);
  const p = await latestPayment(b.order.id);
  return json({
    ok: true,
    status: b.order.status,
    slug: b.invitation.slug,
    payment: p ? { provider: p.provider, status: p.status, note: p.reviewNote } : null,
  });
}
