import { builtinTemplates } from "@/lib/templates";
import { TemplatePageClient } from "@/components/catalog/TemplatePageClient";

export const dynamicParams = false;

/** Asl shablonlar statik; admin qo‘shganlari "_" qobiq orqali (Apache yo‘naltiradi) */
export function generateStaticParams() {
  return [...builtinTemplates.map((t) => ({ slug: t.slug })), { slug: "_" }];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const t = builtinTemplates.find((x) => x.slug === slug);
  return t ? { title: `${t.name} — taklifnoma shabloni`, description: t.description } : { title: "Taklifnoma shabloni" };
}

export default async function TemplatePage({ params }: { params: Promise<{ slug: string }> }) {
  return <TemplatePageClient slug={(await params).slug} />;
}
