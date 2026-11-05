import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@/components/icons";
import { getTemplate, templates } from "@/lib/templates";
import { TemplateDetail } from "@/components/catalog/TemplateDetail";
import { TemplateCard } from "@/components/TemplateCard";

export function generateStaticParams() {
  return templates.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const t = getTemplate((await params).slug);
  return t ? { title: `${t.name} — taklifnoma shabloni`, description: t.description } : {};
}

export default async function TemplatePage({ params }: { params: Promise<{ slug: string }> }) {
  const t = getTemplate((await params).slug);
  if (!t) notFound();
  const similar = templates
    .filter((x) => x.slug !== t.slug)
    .sort((a, b) => Number(b.ceremony === t.ceremony) - Number(a.ceremony === t.ceremony) || Number(b.style === t.style) - Number(a.style === t.style))
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-24 pt-8 lg:px-[120px] lg:pt-10">
      <Link href="/shablonlar" className="inline-flex items-center gap-2 t-nav text-ink-2 hover:text-maroon">
        <ArrowLeft size={16} /> Katalogga qaytish
      </Link>
      <TemplateDetail t={t} />
      <section className="mt-24">
        <h2 className="t-display-section text-[34px] lg:text-[52px]">
          O‘xshash <em className="italic text-maroon">shablonlar</em>
        </h2>
        <div className="mt-10 grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {similar.map((s) => (
            <TemplateCard key={s.slug} t={s} />
          ))}
        </div>
      </section>
    </div>
  );
}
