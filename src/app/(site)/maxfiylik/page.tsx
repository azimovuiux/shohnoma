import { langAlternates } from "@/lib/i18n/meta";
import { LegalPage } from "@/components/legal/LegalPage";
import { PrivacyContent } from "@/components/legal/PrivacyContent";

export const metadata = { alternates: langAlternates("/maxfiylik/"), title: "Maxfiylik siyosati", description: "Shohnoma shaxsiy ma’lumotlarni qanday yig‘adi, saqlaydi va himoya qiladi." };

export default function PrivacyPage() {
  return (
    <LegalPage title="Maxfiylik" italic="siyosati" updated="5 noyabr 2026">
      <PrivacyContent />
    </LegalPage>
  );
}
