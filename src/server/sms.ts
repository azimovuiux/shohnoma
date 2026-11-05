import "server-only";
import { env } from "./env";

let eskizToken: { token: string; at: number } | null = null;

async function eskizAuth() {
  if (eskizToken && Date.now() - eskizToken.at < 25 * 24 * 3600_000) return eskizToken.token;
  const fd = new FormData();
  fd.set("email", env.eskizEmail!);
  fd.set("password", env.eskizPassword!);
  const res = await fetch("https://notify.eskiz.uz/api/auth/login", { method: "POST", body: fd });
  const j = (await res.json()) as { data?: { token?: string } };
  if (!j.data?.token) throw new Error("Eskiz auth xatosi");
  eskizToken = { token: j.data.token, at: Date.now() };
  return eskizToken.token;
}

/** SMS yuborish. Eskiz sozlanmagan bo‘lsa — server logiga yoziladi (dev). */
export async function sendSms(phone: string, text: string) {
  if (!env.eskizEmail || !env.eskizPassword) {
    console.info(`[sms→${phone}] ${text}`);
    return true;
  }
  const token = await eskizAuth();
  const fd = new FormData();
  fd.set("mobile_phone", phone.replace(/^\+/, ""));
  fd.set("message", text);
  fd.set("from", env.eskizFrom);
  const res = await fetch("https://notify.eskiz.uz/api/message/sms/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (res.status === 401) eskizToken = null;
  return res.ok;
}
