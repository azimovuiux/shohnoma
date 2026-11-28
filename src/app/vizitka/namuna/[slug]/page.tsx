import type { Metadata } from "next";
import { CARD_DESIGNS } from "@/lib/cards";
import { DemoPage } from "@/components/vizitka/site/DemoPage";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return CARD_DESIGNS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug;
  const d = CARD_DESIGNS.find((x) => x.slug === slug);
  return { title: d ? `${d.name} — vizitka namunasi` : "Vizitka namunasi", description: d?.description.uz, robots: { index: false } };
}

export default async function Page({ params }: Props) {
  return <DemoPage slug={(await params).slug} />;
}
