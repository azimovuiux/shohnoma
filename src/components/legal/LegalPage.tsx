"use client";

import Link from "@/components/LocalLink";
import type { ReactNode } from "react";
import { ArrowLeft, InfoCircle } from "@/components/icons";
import { site } from "@/lib/site";
import { useT } from "@/lib/i18n";

export function LegalPage({ title, italic, updated, children }: { title: string; italic: string; updated: string; children: ReactNode }) {
  const t = useT();
  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-24 pt-8 lg:px-10 xl:px-[120px] lg:pt-10">
      <Link href="/" className="inline-flex items-center gap-2 t-nav text-ink-2 hover:text-maroon">
        <ArrowLeft size={16} /> {t("Bosh sahifa")}
      </Link>
      <article className="mx-auto mt-8 max-w-[760px]">
        <h1 className="flex flex-col font-serif font-light [overflow-wrap:anywhere] hyphens-auto">
          <span className="text-[34px] leading-[1.04] text-ink sm:text-[38px] lg:text-[52px]">{t(title)}</span>
          <em className="text-[36px] italic leading-none text-maroon sm:text-[42px] lg:text-[64px]">{t(italic)}</em>
        </h1>
        <p className="mt-4 t-body-s text-ink-2">{t("Oxirgi yangilanish: {date}", { date: t(updated) })}</p>
        <div className="legal mt-10 flex flex-col gap-8 t-body-l text-ink-2 [&_h2]:font-serif [&_h2]:text-[28px] [&_h2]:font-light [&_h2]:leading-[1.1] [&_h2]:text-ink [&_li]:pl-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_section]:flex [&_section]:flex-col [&_section]:gap-3 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
          {children}
        </div>
        <div className="mt-12 rounded-panel bg-bg-soft p-6 t-body-m text-ink-2">
          {t("Savollar bo‘yicha:")}{" "}
          <a href={site.telegram} target="_blank" rel="noopener noreferrer" className="text-maroon hover:underline">
            {site.telegramHandle}
          </a>{" "}
          ·{" "}
          <a href={site.phoneHref} className="text-maroon hover:underline">
            {site.phone}
          </a>
        </div>
      </article>
    </div>
  );
}
