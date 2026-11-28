import { CARD_DESIGNS } from "@/lib/cards";
import { langAlternates } from "@/lib/i18n/meta";
import { DesignPage } from "@/components/vizitka/site/DesignPage";

export const dynamicParams = false;

export function generateStaticParams() {
  return CARD_DESIGNS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const d = CARD_DESIGNS.find((x) => x.slug === slug);
  return { title: d ? `${d.name} — raqamli vizitka dizayni` : "Raqamli vizitka", description: d?.description.uz, alternates: langAlternates(`/vizitka/${slug}/`) };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <DesignPage slug={(await params).slug} />;
}
