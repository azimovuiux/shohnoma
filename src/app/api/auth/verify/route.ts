import { fail, json } from "@/server/http";
import { createSession, findOrCreateUserByPhone, normalizePhone, verifyOtp } from "@/server/auth";

export async function POST(req: Request) {
  const { phone, code } = (await req.json().catch(() => ({}))) as { phone?: string; code?: string };
  const p = normalizePhone(phone ?? "");
  if (!p || !/^\d{6}$/.test(code ?? "")) return fail("Kodni to‘liq kiriting", 422);
  const r = await verifyOtp(p, code!);
  if (!r.ok) return fail(r.error, 401);
  const user = await findOrCreateUserByPhone(p);
  await createSession(user.id);
  return json({ ok: true });
}
