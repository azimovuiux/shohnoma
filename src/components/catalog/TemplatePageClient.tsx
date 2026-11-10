"use client";

import Link from "@/components/LocalLink";
import { useT } from "@/lib/i18n";
import { ArrowLeft } from "@/components/icons";
import { TemplateDetail } from "./TemplateDetail";
import { TemplateCard } from "@/components/TemplateCard";
import { useTemplate, useTemplates } from "@/lib/useTemplates";
import { PageLoading, useRouteParam } from "@/lib/client";
import { tplCeremonies, type Template } from "@/lib/templates";

/** Shablon sahifasi. slug "_" — admin qo‘shgan shablon: haqiqiy slug URL'dan o‘qiladi */
export function TemplatePageClient({ slug }: { slug: string }) {
  const fromUrl = useRouteParam("shablonlar");
  const real = slug === "_" ? fromUrl.value : slug;
  const t = useTemplate(real);
  const all = useTemplates();
  const tt = useT();

  if (!t) {
    if (slug === "_" && !fromUrl.ready) return <PageLoading className="min-h-[60vh]" />;
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-[640px] flex-col items-center justify-center gap-5 px-5 text-center">
        <h1 className="font-serif text-[40px] font-light text-ink">{tt("Shablon topilmadi")}</h1>
        <Link href="/shablonlar/" className="btn btn-primary">
          {tt("Katalogga qaytish")}
        </Link>
      </div>
    );
  }

  const mine = tplCeremonies(t);
  const shared = (x: Template) => tplCeremonies(x).filter((c) => mine.includes(c)).length;
  const similar = all
    .filter((x) => x.slug !== t.slug)
    .sort((a, b) => shared(b) - shared(a) || Number(b.style === t.style) - Number(a.style === t.style))
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-24 pt-8 lg:px-10 xl:px-[120px] lg:pt-10">
      <Link href="/shablonlar/" className="inline-flex items-center gap-2 t-nav text-ink-2 hover:text-maroon">
        <ArrowLeft size={16} /> {tt("Katalogga qaytish")}
      </Link>
      <TemplateDetail t={t} />
      <section className="mt-24">
        <h2 className="t-display-section text-[34px] lg:text-[52px]">
          {tt("O‘xshash")} <em className="italic text-maroon">{tt("shablonlar")}</em>
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
