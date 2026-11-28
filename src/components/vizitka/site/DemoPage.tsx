"use client";

import { useEffect, useState } from "react";
import Link from "@/components/LocalLink";
import { useT } from "@/lib/i18n";
import { ArrowLeft } from "@/components/icons";
import { cardDesign } from "@/lib/cards";
import { CARD_PAGES } from "@/lib/cardTypes";
import { OrderCardButton } from "./OrderCardButton";
import { CardDemo } from "@/components/vizitka/designs";

/** /vizitka/namuna/<slug>/ — dizaynning to‘liq jonli namunasi. ?embed=1 — katalog iframe’i uchun (yuqori panel yo‘q) */
export function DemoPage({ slug }: { slug: string }) {
  const t = useT();
  const d = cardDesign(slug);
  const [embed, setEmbed] = useState<boolean | null>(null);
  useEffect(() => setEmbed(new URLSearchParams(window.location.search).get("embed") === "1"), []);

  if (!d) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-5 text-center">
        <h1 className="font-serif text-[40px] font-light text-ink">{t("Dizayn topilmadi")}</h1>
        <Link href={CARD_PAGES.catalog} className="btn btn-primary">
          {t("Barcha dizaynlar")}
        </Link>
      </div>
    );
  }

  return (
    <>
      {embed === false && (
        <div data-demo-bar className="relative z-[70] flex h-[52px] items-center gap-2 bg-bg-ink px-3 text-ink-inverse sm:px-5">
          <Link href={CARD_PAGES.design(d.slug)} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-white/10" aria-label={t("Orqaga")}>
            <ArrowLeft size={18} />
          </Link>
          <span className="min-w-0 flex-1 truncate t-body-s opacity-80">
            {t("Namuna")} · <span className="font-semibold opacity-100">{d.name}</span>
          </span>
          <OrderCardButton design={d.slug} className="btn btn-sm shrink-0 !h-9 bg-ink-inverse !px-4 text-ink hover:bg-white" />
        </div>
      )}
      <CardDemo slug={d.slug} />
    </>
  );
}
