import type { Metadata } from "next";
import { builtinTemplates } from "@/lib/templates";
import { DemoPageClient } from "@/components/invitation/DemoPageClient";

type Props = { params: Promise<{ templateSlug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return [...builtinTemplates.map((t) => ({ templateSlug: t.slug })), { templateSlug: "_" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).templateSlug;
  const t = builtinTemplates.find((x) => x.slug === slug);
  return { title: t ? `${t.name} — jonli namuna` : "Jonli namuna", description: t?.description, robots: { index: false } };
}

export default async function DemoPage({ params }: Props) {
  return <DemoPageClient slug={(await params).templateSlug} />;
}
