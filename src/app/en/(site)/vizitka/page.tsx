// Inglizcha nusxa — o‘zbekcha sahifaning o‘zi, til konteksti /en/layout.tsx da
import { langAlternates } from "@/lib/i18n/meta";
import Page from "@/app/(site)/vizitka/page";

export const metadata = {
  alternates: langAlternates("/vizitka/", "en"),
  title: "Digital business card — a personal page with a QR code",
  description: "Your name, title, phone, social media and company in one link. QR code, one-tap contact saving, a contact form and three languages. One-time payment.",
};
export default Page;
