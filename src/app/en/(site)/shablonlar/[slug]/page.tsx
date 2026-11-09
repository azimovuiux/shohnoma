// Inglizcha nusxa — o‘zbekcha sahifaning o‘zi, til konteksti /en/layout.tsx da
import { builtinTemplates } from "@/lib/templates";
import Page from "@/app/(site)/shablonlar/[slug]/page";
export { generateStaticParams } from "@/app/(site)/shablonlar/[slug]/page";

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const t = builtinTemplates.find((x) => x.slug === slug);
  return {
    title: t ? `${t.name} — invitation template` : "Invitation template",
    description: t?.descriptionEn ?? t?.description,
    alternates: { canonical: `/en/shablonlar/${slug}/`, languages: { uz: `/shablonlar/${slug}/`, ru: `/ru/shablonlar/${slug}/`, en: `/en/shablonlar/${slug}/` } },
  };
}
export default Page;
