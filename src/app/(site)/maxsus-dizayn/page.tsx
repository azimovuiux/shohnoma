import { langAlternates } from "@/lib/i18n/meta";
import { BriefForm } from "@/components/brief/BriefForm";

export const metadata = {
  alternates: langAlternates("/maxsus-dizayn/"),
  title: "Maxsus dizayn — o‘zingizga xos taklifnoma",
  description: "Bir necha savolga javob bering — dizaynerimiz g‘oyangizni noldan chizib beradi. Brif bepul, to‘lov faqat eskizni tasdiqlaganingizdan keyin.",
};

export default function CustomDesignPage() {
  return <BriefForm />;
}
