"use client";

import Link from "@/components/LocalLink";
import { useSearchParams } from "next/navigation";
import { useLocalRouter } from "@/lib/useLocalRouter";
import { useLocale, useT } from "@/lib/i18n";
import { useMemo, useState } from "react";
import { ArrowDown2, ArrowRight, Brush, CloseCircle, Filter, Mobile, SearchNormal1, Card } from "@/components/icons";
import {
  ceremonyLabel,
  hasCeremony,
  tplCeremonies,
  styleLabel,
  type Style,
  type Template,
} from "@/lib/templates";
import { useTemplates } from "@/lib/useTemplates";
import { TemplateCard } from "@/components/TemplateCard";
import { QuickView } from "./QuickView";
import { CountBadge } from "@/components/CountBadge";
import { categoryName, getCategory } from "@/lib/categories";
import { useCategories } from "@/lib/useCategories";
import { CategoryIcon } from "@/lib/categoryIcons";
import { TelegramIcon } from "@/components/TelegramIcon";

type Sort = "new" | "cheap" | "expensive";
const sortLabel: Record<Sort, string> = { new: "Yangilari", cheap: "Arzonroq", expensive: "Qimmatroq" };

const styles = Object.keys(styleLabel) as Style[];

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | "";
  options: { value: T; label: string }[];
  onChange: (v: T | "") => void;
}) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T | "")}
        className="h-[42px] appearance-none rounded-full border border-line bg-bg-base pl-4 pr-9 t-nav text-ink outline-none hover:bg-bg-soft focus-visible:border-maroon"
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ArrowDown2 size={14} className="pointer-events-none absolute right-3.5 text-ink-2" />
    </label>
  );
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-full px-4 t-nav transition-colors ${
        active ? "bg-maroon text-ink-inverse" : "bg-bg-soft text-ink hover:bg-[#efe9df]"
      }`}
    >
      {children}
    </button>
  );
}

function CustomDesignBanner() {
  const t = useT();
  const lc = useLocale();
  return (
    <div className="flex flex-col items-start justify-between gap-6 rounded-card bg-maroon p-8 text-ink-inverse md:col-span-2 lg:col-span-3 lg:flex-row lg:items-center lg:px-12 lg:py-10">
      <div className="flex items-center gap-5">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white/10">
          <Brush size={24} />
        </span>
        <p className="font-serif text-[30px] font-light leading-[1.1] lg:text-[38px]">
          {t("Mos dizayn topilmadimi?")} <em className="italic text-gold-soft">{lc === "ru" ? "Мы создадим его для вас" : lc === "en" ? "we’ll create one" : "yaratib beramiz"}</em>
        </p>
      </div>
      <Link href="/maxsus-dizayn/" className="btn bg-bg-base text-maroon hover:bg-white">
        {t("Brifni to‘ldirish")} <ArrowRight size={16} />
      </Link>
    </div>
  );
}

export function Catalog() {
  const router = useLocalRouter();
  const tt = useT();
  const params = useSearchParams();
  const ceremony = params.get("marosim") ?? "";
  const style = (params.get("uslub") as Style | null) ?? "";
  const sort = ((params.get("sort") as Sort | null) ?? "new") as Sort;
  const [q, setQ] = useState(params.get("q") ?? "");
  const templates = useTemplates();
  const categories = useCategories();
  const locale = useLocale();
  const [quick, setQuick] = useState<Template | null>(null);
  const [sheet, setSheet] = useState(false);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value && !(key === "sort" && value === "new")) next.set(key, value);
    else next.delete(key);
    router.replace(`/shablonlar/${next.toString() ? `?${next}` : ""}`, { scroll: false });
  };

  // Indikator: tanlangan uslub bilan birga shu marosimda nechta shablon bor
  const byCeremony = (c: string) => templates.filter((t) => hasCeremony(t, c) && (!style || t.style === style)).length;

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("uz");
    const list = templates.filter(
      (t) =>
        hasCeremony(t, ceremony) &&
        (!style || t.style === style) &&
        (!needle ||
          t.name.toLocaleLowerCase("uz").includes(needle) ||
          styleLabel[t.style].toLocaleLowerCase("uz").includes(needle) ||
          tplCeremonies(t).some((c) => (["uz", "ru", "en"] as const).some((l) => categoryName(getCategory(c), l).toLocaleLowerCase().includes(needle))) ||
          tt(styleLabel[t.style]).toLocaleLowerCase("ru").includes(needle)),
    );
    if (sort === "cheap") list.sort((a, b) => a.price - b.price);
    else if (sort === "expensive") list.sort((a, b) => b.price - a.price);
    else list.sort((a, b) => b.number - a.number);
    return list;
  }, [templates, ceremony, style, q, sort, tt]);

  const clearAll = () => {
    setQ("");
    router.replace("/shablonlar/", { scroll: false });
  };

  const quickIndex = quick ? filtered.findIndex((t) => t.slug === quick.slug) : -1;

  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-24 pt-8 lg:px-10 xl:px-[120px] lg:pt-12">
      <nav aria-label="Breadcrumb" className="t-body-s text-ink-2">
        <Link href="/" className="hover:text-maroon">
          {tt("Bosh sahifa")}
        </Link>{" "}
        / <span className="text-ink">{tt("Shablonlar")}</span>
      </nav>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-serif text-[42px] font-light leading-[1.04] text-ink lg:text-[64px]">
            {tt("Barcha")} <em className="italic text-maroon">{tt("shablonlar")}</em>
          </h1>
          <p className="t-body-l mt-3 max-w-[520px] text-ink-2">
            {tt("{n} ta tayyor dizayn", { n: templates.length })}
          </p>
        </div>
        <label className="relative flex w-full items-center lg:w-[380px]">
          <SearchNormal1 size={18} className="pointer-events-none absolute left-4 text-ink-2" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onBlur={() => setParam("q", q.trim())}
            placeholder={tt("Shablon nomi yoki uslub bo‘yicha qidirish")}
            className="h-12 w-full rounded-full border border-line bg-bg-base pl-11 pr-4 t-body-m text-ink outline-none placeholder:text-ink-2 focus:border-maroon/55"
          />
        </label>
      </div>

      {/* Filtrlar */}
      <div className="mt-8 flex flex-col gap-4 border-b border-line pb-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="no-scrollbar -mx-5 flex min-w-0 gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
          <Chip active={!ceremony} onClick={() => setParam("marosim", "")}>
            {tt("Barchasi")} <CountBadge n={byCeremony("")} active={!ceremony} />
          </Chip>
          {categories.map((c) => (
            <Chip key={c.slug} active={ceremony === c.slug} onClick={() => setParam("marosim", c.slug)}>
              <span className={ceremony === c.slug ? "" : "text-gold"}>
                <CategoryIcon name={c.icon} />
              </span>
              {categoryName(c, locale)} <CountBadge n={byCeremony(c.slug)} active={ceremony === c.slug} />
            </Chip>
          ))}
        </div>
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <Select label={tt("Uslub")} value={style} options={styles.map((s) => ({ value: s, label: tt(styleLabel[s]) }))} onChange={(v) => setParam("uslub", v)} />
          <Select
            label={tt("Saralash")}
            value={sort}
            options={(Object.keys(sortLabel) as Sort[]).map((s) => ({ value: s, label: `${tt("Saralash")}: ${tt(sortLabel[s])}` }))}
            onChange={(v) => setParam("sort", v || "new")}
          />
        </div>
        <button type="button" onClick={() => setSheet(true)} className="btn btn-secondary btn-sm w-fit lg:hidden">
          <Filter size={16} /> {tt("Filtr")}
        </button>
      </div>

      <p className="t-body-s mt-6 text-ink-2">{tt("{n} ta shablon topildi", { n: filtered.length })}</p>

      {filtered.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 rounded-card bg-bg-soft px-6 py-16 text-center">
          <p className="font-serif text-[32px] font-light text-ink">{tt("Hech narsa topilmadi")}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" onClick={clearAll} className="btn btn-secondary btn-sm">
              {tt("Filtrni tozalash")}
            </button>
            <Link href="/maxsus-dizayn/" className="btn btn-primary btn-sm">
              {tt("Maxsus dizayn")} <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {filtered.slice(0, 6).map((t, i) => (
            <TemplateCard key={t.slug} t={t} onQuickView={setQuick} reveal delay={(i % 3) * 110} />
          ))}
          <CustomDesignBanner />
          {filtered.slice(6).map((t, i) => (
            <TemplateCard key={t.slug} t={t} onQuickView={setQuick} reveal delay={(i % 3) * 110} />
          ))}
        </div>
      )}

      {quick && (
        <QuickView
          t={quick}
          index={quickIndex}
          total={filtered.length}
          onClose={() => setQuick(null)}
          onPrev={() => quickIndex > 0 && setQuick(filtered[quickIndex - 1])}
          onNext={() => quickIndex < filtered.length - 1 && setQuick(filtered[quickIndex + 1])}
        />
      )}

      {sheet && (
        <FilterSheet
          ceremony={ceremony}
          style={style}
          onClose={() => setSheet(false)}
          onApply={(next) => {
            const sp = new URLSearchParams(params.toString());
            (["marosim", "uslub"] as const).forEach((k) => (next[k] ? sp.set(k, next[k]) : sp.delete(k)));
            router.replace(`/shablonlar/${sp.toString() ? `?${sp}` : ""}`, { scroll: false });
            setSheet(false);
          }}
        />
      )}
    </div>
  );
}

function FilterSheet({
  ceremony,
  style,
  onClose,
  onApply,
}: {
  ceremony: string;
  style: Style | "";
  onClose: () => void;
  onApply: (v: { marosim: string; uslub: string }) => void;
}) {
  const templates = useTemplates();
  const tt = useT();
  const locale = useLocale();
  const categories = useCategories();
  const [v, setV] = useState({ marosim: ceremony as string, uslub: style as string });
  const count = templates.filter(
    (t) => hasCeremony(t, v.marosim) && (!v.uslub || t.style === v.uslub),
  ).length;

  const group = (title: string, key: keyof typeof v, items: { value: string; label: string; n?: number }[]) => (
    <div className="flex flex-col gap-3">
      <p className="t-title text-ink">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((i) => (
          <Chip key={i.value} active={v[key] === i.value} onClick={() => setV({ ...v, [key]: v[key] === i.value ? "" : i.value })}>
            {i.label}
            {i.n !== undefined && <CountBadge n={i.n} active={v[key] === i.value} />}
          </Chip>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/40 lg:hidden" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tt("Filtr")}
        className="flex max-h-[85dvh] w-full flex-col gap-6 overflow-y-auto rounded-t-[24px] bg-bg-base px-5 pb-6 pt-3 animate-[sheet-up_.28s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="mx-auto h-1 w-10 rounded-full bg-line" />
        <div className="flex items-center justify-between">
          <p className="font-serif text-[28px] font-light text-ink">{tt("Filtr")}</p>
          <button type="button" onClick={onClose} aria-label={tt("Yopish")} className="text-ink-2">
            <CloseCircle size={22} />
          </button>
        </div>
        {group(tt("Marosim"), "marosim", categories.map((c) => ({ value: c.slug, label: categoryName(c, locale), n: templates.filter((t) => hasCeremony(t, c.slug) && (!v.uslub || t.style === v.uslub)).length })))}
        {group(tt("Uslub"), "uslub", styles.map((s) => ({ value: s, label: tt(styleLabel[s]) })))}
        <div className="flex gap-2.5 pt-2">
          <button type="button" className="btn btn-secondary flex-1" onClick={() => setV({ marosim: "", uslub: "" })}>
            {tt("Tozalash")}
          </button>
          <button type="button" className="btn btn-primary flex-[1.6]" onClick={() => onApply(v)}>
            {tt("{n} ta shablonni ko‘rsatish", { n: count })}
          </button>
        </div>
      </div>
    </div>
  );
}
