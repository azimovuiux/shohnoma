"use client";

import Link from "@/components/LocalLink";
import { useLocale, useT } from "@/lib/i18n";
import { useState } from "react";
import { ArrowRight, Gallery } from "@/components/icons";
import { categoryName } from "@/lib/categories";
import { useCategories } from "@/lib/useCategories";
import { CategoryIcon } from "@/lib/categoryIcons";
import { hasCeremony } from "@/lib/templates";
import { CountBadge } from "@/components/CountBadge";
import { useTemplates } from "@/lib/useTemplates";
import { TemplateCard } from "@/components/TemplateCard";
import { SectionTitle } from "./SectionTitle";


export function Showcase() {
  const [ceremony, setCeremony] = useState("");
  const locale = useLocale();
  const categories = useCategories();
  const templates = useTemplates();
  const t = useT();
  const featured = templates.filter((x) => x.featured).slice(0, 10);
  // Bosh sahifada 10 ta; marosim tanlansa — shu marosimning barcha shablonlari
  const list = ceremony ? templates.filter((x) => hasCeremony(x, ceremony)) : featured;
  const count = (c: string) => templates.filter((x) => hasCeremony(x, c)).length;

  return (
    <section id="shablonlar" className="scroll-mt-20 bg-bg-base py-20 lg:py-[120px]">
      <div className="mx-auto max-w-[1440px] px-5 lg:px-10 xl:px-[120px]">
        <div data-reveal="stagger" className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div data-split className="flex flex-col gap-4">
            <SectionTitle plain="Tayyor" italic="dizaynlar" />
          </div>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:max-w-[820px] lg:flex-wrap lg:justify-end lg:overflow-visible lg:px-0 lg:pb-0">
            {[{ value: "", label: t("Barchasi"), icon: "" }, ...categories.map((c) => ({ value: c.slug, label: categoryName(c, locale), icon: c.icon }))].map((c) => {
              const active = ceremony === c.value;
              return (
                <button
                  key={c.value || "all"}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCeremony(c.value)}
                  className={`inline-flex shrink-0 items-center gap-[7px] rounded-full px-4 py-2.5 t-nav transition-colors ${
                    active ? "bg-maroon text-ink-inverse" : "border border-line bg-bg-base text-ink hover:bg-bg-soft"
                  }`}
                >
                  {c.icon && (
                    <span className={active ? "" : "text-gold"}>
                      <CategoryIcon name={c.icon} />
                    </span>
                  )}
                  {c.label}
                  <CountBadge n={count(c.value)} active={active} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-12 grid gap-x-6 gap-y-7 lg:mt-16 lg:grid-cols-2">
          {list.map((tpl, i) => (
            <TemplateCard key={tpl.slug} t={tpl} reveal delay={(i % 2) * 120} />
          ))}
        </div>

        <div data-reveal="up" className="mt-12 flex justify-center lg:mt-16">
          <Link href="/shablonlar/" className="btn border border-line-dark px-7 text-ink hover:bg-bg-soft">
            <Gallery size={16} /> {t("Barcha {n} ta shablon", { n: templates.length })} <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
