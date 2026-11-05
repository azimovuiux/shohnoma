import { NextResponse } from "next/server";
import { notifyAdmin, rateLimited } from "@/lib/notify";
import { ceremonyLabel, type Ceremony } from "@/lib/templates";

const via: Record<string, string> = { telegram: "Telegram", call: "Qo‘ng‘iroq", whatsapp: "WhatsApp", sms: "SMS" };

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(`lead:${ip}`)) return NextResponse.json({ error: "too_many" }, { status: 429 });

  const body = (await req.json().catch(() => null)) as Record<string, string> | null;
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (body.website) return NextResponse.json({ ok: true }); // honeypot

  const name = String(body.name ?? "").trim().slice(0, 80);
  const phone = String(body.phone ?? "").replace(/[^\d+]/g, "");
  if (!name || !/^\+998\d{9}$/.test(phone)) return NextResponse.json({ error: "invalid" }, { status: 422 });

  const ceremony = ceremonyLabel[body.ceremony as Ceremony] ?? "—";
  const message = String(body.message ?? "").trim().slice(0, 2000);
  const ok = await notifyAdmin(
    `📩 Yangi xabar (sayt)\n👤 ${name}\n📞 ${phone}\n🎉 ${ceremony}\n💬 ${message || "—"}\n↩️ Javob: ${via[body.replyVia] ?? "—"}`,
  );
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "notify_failed" }, { status: 502 });
}
