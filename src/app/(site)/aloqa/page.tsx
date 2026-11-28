import { langAlternates } from "@/lib/i18n/meta";
import { Contact } from "@/components/home/Contact";

export const metadata = {
  alternates: langAlternates("/aloqa/"),
  title: "Aloqa — biz bilan bog‘lanish",
  description: "Telegram, telefon yoki forma orqali yozing — taklifnoma, vizitka yoki to‘lov bo‘yicha savollaringizga tez javob beramiz.",
};

/** Alohida «Aloqa» sahifasi — bosh sahifadagi aloqa bo‘limining o‘zi (kanallar + murojaat formasi) */
export default function ContactPage() {
  return <Contact page />;
}
