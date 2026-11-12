// Inglizcha nusxa — o‘zbekcha sahifaning o‘zi, til konteksti /en/layout.tsx da
import { builtinTemplates } from "@/lib/templates";
import { langAlternates } from "@/lib/i18n/meta";
import Page from "@/app/(site)/shablonlar/[slug]/page";
export { generateStaticParams } from "@/app/(site)/shablonlar/[slug]/page";

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const t = builtinTemplates.find((x) => x.slug === slug);
  return {
    title: t ? `${t.name} — invitation template` : "Invitation template",
    description: t?.descriptionEn ?? t?.description,
    alternates: langAlternates(`/shablonlar/${slug}/`, "en"),
  };
}
export default Page;
