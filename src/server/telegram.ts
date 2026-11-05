import "server-only";
import { createHash, createHmac } from "node:crypto";
import { env } from "./env";

async function send(chatId: string, text: string) {
  if (!env.tgBotToken) {
    console.info(`[telegram→${chatId}] ${text}`);
    return true;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.tgBotToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: false }),
    });
    return res.ok;
  } catch (e) {
    console.error("[telegram]", e);
    return false;
  }
}

export const notifyAdmin = (text: string) => (env.tgAdminChat ? send(env.tgAdminChat, text) : send("admin", text));
/** Foydalanuvchi botni boshlagan bo‘lsa (Telegram orqali kirgan) unga xabar */
export const notifyUser = (telegramId: string | null | undefined, text: string) =>
  telegramId ? send(telegramId, text) : Promise.resolve(false);

export type TelegramAuth = Record<string, string>;

/** Telegram Login Widget ma’lumotini tekshirish */
export function verifyTelegramAuth(data: TelegramAuth) {
  if (!env.tgBotToken) return false;
  const { hash, ...rest } = data;
  if (!hash) return false;
  const check = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join("\n");
  const secret = createHash("sha256").update(env.tgBotToken).digest();
  const sig = createHmac("sha256", secret).update(check).digest("hex");
  const fresh = Date.now() / 1000 - Number(rest.auth_date ?? 0) < 86400;
  return sig === hash && fresh;
}
