import { RedirectToLogin } from "./redirect";

export const metadata = { title: "Kirish", robots: { index: false } };

/** Eski SMS-kod sahifasi — endi mijozlar faqat Telegram bot orqali kiradi */
export default function CodePage() {
  return <RedirectToLogin />;
}
