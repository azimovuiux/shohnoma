// Ruscha nusxa — o‘zbekcha sahifaning o‘zi, til konteksti /ru/layout.tsx da
import { CARD_DESIGNS } from "@/lib/cards";
import { langAlternates } from "@/lib/i18n/meta";
import Page from "@/app/(site)/vizitka/[slug]/page";
export { generateStaticParams } from "@/app/(site)/vizitka/[slug]/page";

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const d = CARD_DESIGNS.find((x) => x.slug === slug);
  return { title: d ? `${d.name} — цифровая визитка` : "Цифровая визитка", description: d?.description.ru, alternates: langAlternates(`/vizitka/${slug}/`, "ru") };
}
export default Page;
