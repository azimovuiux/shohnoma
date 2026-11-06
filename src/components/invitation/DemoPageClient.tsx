"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "@/components/icons";
import { useRouter } from "next/navigation";
import { InvitationSite } from "./InvitationSite";
import { demoData } from "./data";
import { useTemplate } from "@/lib/useTemplates";
import { PageLoading, useRouteParam } from "@/lib/client";

/** Shablonning jonli namunasi. slug "_" — admin qo‘shgan shablon (URL'dan o‘qiladi) */
export function DemoPageClient({ slug }: { slug: string }) {
  const fromUrl = useRouteParam("namuna");
  const router = useRouter();
  const t = useTemplate(slug === "_" ? fromUrl.value : slug);
  if (!t) {
    if (slug === "_" && !fromUrl.ready) return <PageLoading className="min-h-dvh" />;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-5 text-center">
        <h1 className="font-cormorant text-[40px] font-light text-ink">Shablon topilmadi</h1>
        <Link href="/shablonlar/" className="btn btn-primary">
          Katalogga qaytish
        </Link>
      </div>
    );
  }
  return (
    <>
      {t.kind === "html" ? (
        <iframe
          src={`/api/tpl/${t.slug}/preview?v=${t.version ?? 1}`}
          title={`${t.name} — namuna`}
          className="block h-dvh w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      ) : (
        <InvitationSite key={t.slug} template={t} data={demoData(t)} mode="demo" />
      )}
      {/* Sayt elementi: pastda o‘rtada — shablonni tanlab buyurtmaga o‘tish */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex items-center justify-center gap-2.5 px-4 pb-[max(18px,env(safe-area-inset-bottom))]">
        {/* Saytga qaytish: saytdan kelgan bo‘lsa — orqaga, aks holda katalogga */}
        <button
          type="button"
          aria-label="Saytga qaytish"
          onClick={() => {
            const fromSite = typeof document !== "undefined" && document.referrer.startsWith(location.origin) && history.length > 1;
            if (fromSite) router.back();
            else router.push("/shablonlar/");
          }}
          className="pointer-events-auto flex size-[52px] shrink-0 items-center justify-center rounded-full bg-bg-base/95 text-maroon shadow-[0_14px_40px_-12px_rgba(38,10,18,0.55)] ring-1 ring-black/5 backdrop-blur transition-transform hover:-translate-x-0.5"
        >
          <ArrowLeft size={20} />
        </button>
        <Link
          href={`/buyurtma/${t.slug}/marosim/`}
          className="btn btn-primary pointer-events-auto !h-[52px] !rounded-full !px-7 shadow-[0_14px_40px_-12px_rgba(38,10,18,0.55)] ring-1 ring-white/25"
        >
          Shu shablonni ishlatish <ArrowRight size={16} />
        </Link>
      </div>
    </>
  );
}
