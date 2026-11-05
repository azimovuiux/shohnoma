"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Cake, Crown1, Gallery, Heart, Lovely } from "@/components/icons";
import { type Ceremony } from "@/lib/templates";
import { useTemplates } from "@/lib/useTemplates";
import { TemplateCard } from "@/components/TemplateCard";
import { SectionTitle } from "./SectionTitle";

/** Figma'dagi tartib (2 ustun × 5 qator) */
const order = [
  "bordo-maktub",
  "oltin-ravoq",
  "baxt-reysi",
  "yashil-muhr",
  "qizil-atirgul",
  "oltin-darvoza",
  "sharq-oqshomi",
  "moviy-abr",
  "lola-bog",
  "zaytun-maktub",
];

const chips: { value: Ceremony | ""; label: string; icon?: React.ReactNode }[] = [
  { value: "", label: "Barchasi" },
  { value: "nikoh", label: "Nikoh to‘yi", icon: <Heart size={15} /> },
  { value: "sunnat", label: "Sunnat to‘yi", icon: <Crown1 size={15} /> },
  { value: "fotiha", label: "Fotiha to‘yi", icon: <Lovely size={15} /> },
  { value: "tugilgan-kun", label: "Tug‘ilgan kun", icon: <Cake size={15} /> },
];

export function Showcase() {
  const [ceremony, setCeremony] = useState<Ceremony | "">("");
  const templates = useTemplates();
  const rank = (slug: string) => (order.indexOf(slug) + 1 || 999);
  const featured = templates
    .filter((t) => t.featured)
    .sort((a, b) => rank(a.slug) - rank(b.slug) || a.number - b.number)
    .slice(0, 10);
  // Bosh sahifada 10 ta; marosim tanlansa — shu marosimning barcha shablonlari
  const list = ceremony ? templates.filter((t) => t.ceremony === ceremony) : featured;

  return (
    <section id="shablonlar" className="scroll-mt-20 bg-bg-base py-20 lg:py-[120px]">
      <div className="mx-auto max-w-[1440px] px-5 lg:px-[120px]">
        <div data-reveal="stagger" className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div data-split className="flex flex-col gap-4">
            <SectionTitle plain="Tayyor" italic="dizaynlar" />
            <p className="t-body-m max-w-[440px] text-ink-2">
              Eng sevimli 10 ta dizayn — har biri telefon va laptopda chiroyli ochiladi. Hozir aksiya narxlarida.
            </p>
          </div>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:px-0 lg:pb-0">
            {chips.map((c) => {
              const active = ceremony === c.value;
              return (
                <button
                  key={c.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCeremony(c.value)}
                  className={`inline-flex shrink-0 items-center gap-[7px] rounded-full px-4 py-2.5 t-nav transition-colors ${
                    active ? "bg-maroon text-ink-inverse" : "border border-line bg-bg-base text-ink hover:bg-bg-soft"
                  }`}
                >
                  {c.icon && <span className={active ? "" : "text-gold"}>{c.icon}</span>}
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-12 grid gap-x-6 gap-y-7 lg:mt-16 lg:grid-cols-2">
          {list.map((t, i) => (
            <TemplateCard key={t.slug} t={t} reveal delay={(i % 2) * 120} />
          ))}
        </div>

        <div data-reveal="up" className="mt-12 flex justify-center lg:mt-16">
          <Link href="/shablonlar/" className="btn border border-line-dark px-7 text-ink hover:bg-bg-soft">
            <Gallery size={16} /> Barcha {templates.length} ta shablon <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
