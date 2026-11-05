"use client";

import Link from "next/link";
import { ArrowLeft } from "@/components/icons";
import { TemplateDetail } from "./TemplateDetail";
import { TemplateCard } from "@/components/TemplateCard";
import { useTemplate, useTemplates } from "@/lib/useTemplates";
import { PageLoading, useRouteParam } from "@/lib/client";

/** Shablon sahifasi. slug "_" — admin qo‘shgan shablon: haqiqiy slug URL'dan o‘qiladi */
export function TemplatePageClient({ slug }: { slug: string }) {
  const fromUrl = useRouteParam("shablonlar");
  const real = slug === "_" ? fromUrl.value : slug;
  const t = useTemplate(real);
  const all = useTemplates();

  if (!t) {
    if (slug === "_" && !fromUrl.ready) return <PageLoading className="min-h-[60vh]" />;
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-[640px] flex-col items-center justify-center gap-5 px-5 text-center">
        <h1 className="font-serif text-[40px] font-light text-ink">Shablon topilmadi</h1>
        <Link href="/shablonlar/" className="btn btn-primary">
          Katalogga qaytish
        </Link>
      </div>
    );
  }

  const similar = all
    .filter((x) => x.slug !== t.slug)
    .sort((a, b) => Number(b.ceremony === t.ceremony) - Number(a.ceremony === t.ceremony) || Number(b.style === t.style) - Number(a.style === t.style))
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-24 pt-8 lg:px-[120px] lg:pt-10">
      <Link href="/shablonlar/" className="inline-flex items-center gap-2 t-nav text-ink-2 hover:text-maroon">
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
