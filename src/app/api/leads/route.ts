import { fail, json, rateLimited, clientIp } from "@/server/http";
import { notifyAdmin } from "@/server/telegram";
import { normalizePhone } from "@/server/auth";
import { db, leads } from "@/server/db";
import { newId } from "@/server/ids";
import { ceremonyLabel, type Ceremony } from "@/lib/templates";

const via: Record<string, string> = { telegram: "Telegram", call: "Qo‘ng‘iroq", whatsapp: "WhatsApp", sms: "SMS" };

/** Bosh sahifa — "Xabar qoldiring" */
export async function POST(req: Request) {
  if (rateLimited(`lead:${await clientIp()}`)) return fail("Juda ko‘p urinish", 429);
  const body = (await req.json().catch(() => null)) as Record<string, string> | null;
  if (!body) return fail("Ma’lumot yo‘q");
  if (body.website) return json({ ok: true }); // honeypot
  const name = String(body.name ?? "").trim().slice(0, 120);
  const phone = normalizePhone(String(body.phone ?? ""));
  if (!name || !phone) return fail("Ism va telefonni to‘liq kiriting", 422);
  const message = String(body.message ?? "").trim().slice(0, 2000);
  const replyVia = via[body.replyVia] ? body.replyVia : "telegram";
  await db.insert(leads).values({ id: newId(), name, phone, ceremony: body.ceremony || null, message, replyVia });
  await notifyAdmin(
    `📩 Yangi xabar (sayt)\n👤 ${name}\n📞 ${phone}\n🎉 ${ceremonyLabel[body.ceremony as Ceremony] ?? "—"}\n💬 ${message || "—"}\n↩️ Javob: ${via[replyVia]}`,
  );
  return json({ ok: true });
}
