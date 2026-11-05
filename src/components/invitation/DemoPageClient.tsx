"use client";

import Link from "next/link";
import { InvitationSite } from "./InvitationSite";
import { demoData } from "./data";
import { useTemplate } from "@/lib/useTemplates";
import { PageLoading, useRouteParam } from "@/lib/client";

/** Shablonning jonli namunasi. slug "_" — admin qo‘shgan shablon (URL'dan o‘qiladi) */
export function DemoPageClient({ slug }: { slug: string }) {
  const fromUrl = useRouteParam("namuna");
  const t = useTemplate(slug === "_" ? fromUrl.value : slug);
  if (!t) {
    if (slug === "_" && !fromUrl.ready) return <PageLoading className="min-h-dvh" />;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-5 text-center">
        <h1 className="font-serif text-[40px] font-light text-ink">Shablon topilmadi</h1>
        <Link href="/shablonlar/" className="btn btn-primary">
          Katalogga qaytish
        </Link>
      </div>
    );
  }
  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-line bg-bg-base/95 px-4 py-2.5 backdrop-blur">
        <span className="t-body-s text-ink-2">
          Namuna: <span className="font-medium text-ink">{t.name}</span>
        </span>
        <Link href={`/buyurtma/${t.slug}/marosim/`} className="btn btn-primary btn-sm !py-2.5">
          Shu shablonni tanlash
        </Link>
      </div>
      <InvitationSite key={t.slug} template={t} data={demoData(t)} mode="demo" />
    </>
  );
}
