// Inglizcha nusxa — o‘zbekcha sahifaning o‘zi, til konteksti /en/layout.tsx da
import type { Metadata } from "next";
import { CARD_DESIGNS } from "@/lib/cards";
import Page from "@/app/vizitka/namuna/[slug]/page";
export { generateStaticParams } from "@/app/vizitka/namuna/[slug]/page";

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug;
  const d = CARD_DESIGNS.find((x) => x.slug === slug);
  return { title: d ? `${d.name} — business card demo` : "Business card demo", description: d?.description.en, robots: { index: false } };
}
export default Page;
