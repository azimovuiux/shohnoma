import type { Metadata } from "next";
import { LocaleProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: {
    default: "Shohnoma — королевское сайт-приглашение на вашу свадьбу",
    template: "%s · Shohnoma",
  },
  description:
    "Выберите готовый дизайн, введите данные и после оплаты получите ссылку на готовый сайт-приглашение для гостей. На никах, фотиху, суннат-той и день рождения.",
  openGraph: { siteName: "Shohnoma", locale: "ru_RU", type: "website" },
  alternates: { canonical: "/ru/", languages: { uz: "/", ru: "/ru/" } },
};

/** Ruscha versiya: /ru/... — barcha sahifalar o‘zbekchasi bilan bir xil komponentlar, faqat til konteksti */
export default function RuLayout({ children }: { children: React.ReactNode }) {
  return <LocaleProvider locale="ru">{children}</LocaleProvider>;
}
