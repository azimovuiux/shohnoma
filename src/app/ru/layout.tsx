import type { Metadata } from "next";
import { LocaleProvider } from "@/lib/i18n";
import { langAlternates } from "@/lib/i18n/meta";

export const metadata: Metadata = {
  title: {
    default: "Shohnoma — королевский сайт-приглашение на ваше торжество",
    template: "%s · Shohnoma",
  },
  description:
    "Выберите готовый дизайн, введите данные и после оплаты получите ссылку на готовый сайт-приглашение для гостей. На никах, фотиху, суннат-той и день рождения.",
  openGraph: { siteName: "Shohnoma", locale: "ru_RU", type: "website" },
  alternates: langAlternates("/", "ru"),
};

/** Ruscha versiya: /ru/... — barcha sahifalar o‘zbekchasi bilan bir xil komponentlar, faqat til konteksti */
export default function RuLayout({ children }: { children: React.ReactNode }) {
  return <LocaleProvider locale="ru">{children}</LocaleProvider>;
}
