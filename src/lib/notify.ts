/**
 * Admin Telegram guruhiga xabar (spec §12).
 * .env: TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID. Sozlanmagan bo‘lsa — faqat server logiga yoziladi.
 */
export async function notifyAdmin(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chat) {
    console.info("[notifyAdmin]", text);
    return true;
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
  });
  return res.ok;
}

/** Oddiy in-memory rate-limit (bitta server jarayoni uchun) */
const hits = new Map<string, number[]>();
export function rateLimited(key: string, max = 5, windowMs = 10 * 60_000) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  return list.length > max;
}
