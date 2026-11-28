// Ruscha nusxa — o‘zbekcha sahifaning o‘zi, til konteksti /ru/layout.tsx da
import { langAlternates } from "@/lib/i18n/meta";
import Page from "@/app/(site)/vizitka/page";

export const metadata = {
  alternates: langAlternates("/vizitka/", "ru"),
  title: "Цифровая визитка — личная страница с QR-кодом",
  description: "Имя, должность, телефон, соцсети и компания — по одной ссылке. QR-код, сохранение контакта в одно касание, форма заявки, три языка. Разовая оплата.",
};
export default Page;
