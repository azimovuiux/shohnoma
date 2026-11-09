// Inglizcha nusxa — o‘zbekcha sahifaning o‘zi, til konteksti /en/layout.tsx da
import type { Metadata } from "next";
import { builtinTemplates } from "@/lib/templates";
import Page from "@/app/namuna/[templateSlug]/page";
export { generateStaticParams } from "@/app/namuna/[templateSlug]/page";

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ templateSlug: string }> }): Promise<Metadata> {
  const slug = (await params).templateSlug;
  const t = builtinTemplates.find((x) => x.slug === slug);
  return { title: t ? `${t.name} — live demo` : "Live demo", description: t?.descriptionEn ?? t?.description, robots: { index: false } };
}
export default Page;
