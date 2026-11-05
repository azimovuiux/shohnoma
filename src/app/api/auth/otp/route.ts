import { fail, json, rateLimited, clientIp } from "@/server/http";
import { normalizePhone, sendOtp } from "@/server/auth";

export async function POST(req: Request) {
  const { phone } = (await req.json().catch(() => ({}))) as { phone?: string };
  const p = normalizePhone(phone ?? "");
  if (!p) return fail("Telefon raqam to‘liq emas", 422);
  if (rateLimited(`otp:${await clientIp()}`, 8, 60 * 60_000)) return fail("Juda ko‘p urinish. Keyinroq qayta urinib ko‘ring.", 429);
  const r = await sendOtp(p);
  return r.ok ? json({ ok: true, phone: p, devCode: r.devCode }) : json(r, 429);
}
