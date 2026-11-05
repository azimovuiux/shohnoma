import { fail, json } from "@/server/http";
import { getOwnedOrder, isPaidStatus } from "@/server/orders";
import { missingFields } from "@/server/order-update";
import { enabledProviders, startPayment } from "@/server/payments";
import type { PayProvider } from "@/server/db";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const b = await getOwnedOrder((await params).id);
  if (!b) return fail("Buyurtma topilmadi", 404);
  if (isPaidStatus(b.order.status)) return json({ ok: true, url: `/buyurtma/${b.order.id}/tayyor` });
  if (missingFields(b.invitation).length) return fail("Avval marosim ma’lumotlarini to‘ldiring", 422);
  if (!b.invitation.contactPhone) return fail("Telefon raqamingizni kiriting", 422);
  const { provider } = (await req.json().catch(() => ({}))) as { provider?: PayProvider };
  if (!provider || !enabledProviders().includes(provider)) return fail("Bu to‘lov usuli hozircha mavjud emas", 422);
  try {
    return json({ ok: true, ...(await startPayment(b.order.id, provider)) });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
