import { langAlternates } from "@/lib/i18n/meta";
import { VizitkaLanding } from "@/components/vizitka/site/VizitkaLanding";

export const metadata = {
  alternates: langAlternates("/vizitka/"),
  title: "Raqamli vizitka — QR kodli shaxsiy sahifa",
  description: "Ism, lavozim, telefon, ijtimoiy tarmoqlar va kompaniyangiz — bitta havolada. QR kod, kontaktni bir bosishda saqlash, murojaat formasi, uch til. Bir martalik to‘lov.",
};

export default function VizitkaPage() {
  return <VizitkaLanding />;
}
