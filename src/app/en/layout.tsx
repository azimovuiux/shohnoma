import type { Metadata } from "next";
import { LocaleProvider } from "@/lib/i18n";
import { langAlternates } from "@/lib/i18n/meta";

export const metadata: Metadata = {
  title: {
    default: "Shohnoma — elegant invitation websites for your celebration",
    template: "%s · Shohnoma",
  },
  description:
    "Choose a ready-made design, add your details and, after payment, get a link to a finished invitation website for your guests. For weddings, engagements, sunnat celebrations and birthdays.",
  openGraph: { siteName: "Shohnoma", locale: "en_US", type: "website" },
  alternates: langAlternates("/", "en"),
};

/** Inglizcha versiya: /en/... — barcha sahifalar o‘zbekchasi bilan bir xil komponentlar, faqat til konteksti */
export default function EnLayout({ children }: { children: React.ReactNode }) {
  return <LocaleProvider locale="en">{children}</LocaleProvider>;
}
