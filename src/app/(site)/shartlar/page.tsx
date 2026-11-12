import { langAlternates } from "@/lib/i18n/meta";
import { LegalPage } from "@/components/legal/LegalPage";
import { TermsContent } from "@/components/legal/TermsContent";

export const metadata = { alternates: langAlternates("/shartlar/"), title: "Foydalanish shartlari", description: "Shohnoma taklifnoma saytlari xizmatidan foydalanish shartlari." };

export default function TermsPage() {
  return (
    <LegalPage title="Foydalanish" italic="shartlari" updated="5 noyabr 2026">
      <TermsContent />
    </LegalPage>
  );
}
