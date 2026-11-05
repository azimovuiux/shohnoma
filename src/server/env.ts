import "server-only";

export const env = {
  siteUrl: (process.env.SITE_URL ?? "https://shohnoma.uz").replace(/\/$/, ""),
  sessionSecret: process.env.SESSION_SECRET ?? "dev-secret-change-me",
  uploadDir: process.env.UPLOAD_DIR ?? "./storage/uploads",
  // SMS (Eskiz.uz)
  eskizEmail: process.env.ESKIZ_EMAIL,
  eskizPassword: process.env.ESKIZ_PASSWORD,
  eskizFrom: process.env.ESKIZ_FROM ?? "4546",
  // Telegram
  tgBotToken: process.env.TELEGRAM_BOT_TOKEN,
  tgBotUsername: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
  tgAdminChat: process.env.TELEGRAM_ADMIN_CHAT_ID,
  // Payme
  paymeMerchantId: process.env.PAYME_MERCHANT_ID,
  paymeKey: process.env.PAYME_KEY,
  paymeTest: process.env.PAYME_TEST === "1",
  // Click
  clickServiceId: process.env.CLICK_SERVICE_ID,
  clickMerchantId: process.env.CLICK_MERCHANT_ID,
  clickMerchantUserId: process.env.CLICK_MERCHANT_USER_ID,
  clickSecretKey: process.env.CLICK_SECRET_KEY,
  // P2P
  p2pCard: process.env.P2P_CARD ?? "8600 3104 7752 9018",
  p2pHolder: process.env.P2P_HOLDER ?? "SHOHNOMA SERVIS",
  p2pBank: process.env.P2P_BANK ?? "UZCARD",
  // Google Pay (ekvayring orqali) — [Ochiq]
  googlePayEnabled: process.env.GOOGLE_PAY_ENABLED === "1",
  /** Dev: to‘lov provayderlari sozlanmagan bo‘lsa, test sahifasi orqali to‘lovni tasdiqlash */
  paymentsSandbox: process.env.PAYMENTS_SANDBOX === "1",
  cronSecret: process.env.CRON_SECRET,
  adminPhones: (process.env.ADMIN_PHONES ?? "").split(",").map((s) => s.trim()).filter(Boolean),
};

export const isProd = process.env.NODE_ENV === "production";
