import { fail, json, rateLimited, clientIp } from "@/server/http";
import { createDraftOrder } from "@/server/orders";
import { getTemplate } from "@/lib/templates";

export async function POST(req: Request) {
  const { templateSlug } = (await req.json().catch(() => ({}))) as { templateSlug?: string };
  if (!templateSlug || !getTemplate(templateSlug)) return fail("Shablon topilmadi", 404);
  if (rateLimited(`order:${await clientIp()}`, 20, 60 * 60_000)) return fail("Juda ko‘p urinish", 429);
  const id = await createDraftOrder(templateSlug);
  return json({ ok: true, id });
}
