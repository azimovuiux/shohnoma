// Ruscha nusxa — o‘zbekcha sahifaning o‘zi, til konteksti /ru/layout.tsx da
import type { Metadata } from "next";
import { builtinTemplates } from "@/lib/templates";
import Page from "@/app/namuna/[templateSlug]/page";
export { generateStaticParams } from "@/app/namuna/[templateSlug]/page";

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ templateSlug: string }> }): Promise<Metadata> {
  const slug = (await params).templateSlug;
  const t = builtinTemplates.find((x) => x.slug === slug);
  return { title: t ? `${t.name} — живой пример` : "Живой пример", description: t?.descriptionRu ?? t?.description, robots: { index: false } };
}
export default Page;
