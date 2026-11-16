"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "@/components/LocalLink";
import { ArrowRight } from "@/components/icons";
import { PageLoading, apiGet, routeParam, ApiError } from "@/lib/client";
import { lpath, useLocale, useT } from "@/lib/i18n";
import { ARTICLE_CATEGORIES, categoryLabel, articleListHref, type ArticleListData, type ArticlePageData } from "@/lib/articles";
import { ArticleView } from "./ArticleView";
import { ArticleCardView, Breadcrumbs, CategoryChip, Pagination, SsrSlot, pageWrap, useDocumentTitle, useSsrBoot } from "./parts";

/* ── Ro‘yxat ── */

type ListQuery = { category: string | null; page: number };

function parseQuery(search: string): ListQuery {
  const sp = new URLSearchParams(search);
  const c = sp.get("kategoriya");
  const p = Number(sp.get("sahifa") || 1);
  return { category: ARTICLE_CATEGORIES.some((x) => x.slug === c) ? c : null, page: Number.isInteger(p) && p > 0 ? p : 1 };
}

/** useSearchParams faqat shu yerda (Suspense ichida) — server HTML joy ushlagichi statik qobiqda qolsin */
function SearchWatcher({ onChange }: { onChange: (s: string) => void }) {
  const s = useSearchParams().toString();
  useEffect(() => onChange(s), [s, onChange]);
  return null;
}

export function ArticleList({ data, busy = false }: { data: ArticleListData; busy?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const cat = data.category;
  return (
    <div className={pageWrap}>
      <Breadcrumbs
        items={[
          [t("Bosh sahifa"), "/"],
          [t("Maqolalar"), "/maqolalar/"],
        ]}
      />
      <div className="mt-6 max-w-[760px]">
        <h1 className="font-serif text-[42px] font-light leading-[1.04] text-ink lg:text-[64px]">
          {t("Foydali")} <em className="italic text-maroon">{t("maqolalar")}</em>
        </h1>
        <p className="t-body-l mt-3 text-ink-2">{t("To‘y tayyorgarligi, taklifnoma matnlari va mehmonlar bilan ishlash bo‘yicha foydali maslahatlar.")}</p>
      </div>
      {data.categories.length > 0 && (
        <div className="no-scrollbar -mx-5 mt-8 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
          <CategoryChip label={t("Barchasi")} n={data.all} active={!cat} href={articleListHref(null, 1)} />
          {data.categories.map((c) => (
            <CategoryChip key={c.slug} label={categoryLabel(c.slug, locale) ?? c.slug} n={c.count} active={cat === c.slug} href={articleListHref(c.slug, 1)} />
          ))}
        </div>
      )}
      {data.items.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-card bg-bg-soft px-6 py-16 text-center">
          <p className="font-serif text-[32px] font-light text-ink">{t("Hozircha maqola yo‘q")}</p>
          <p className="t-body-m text-ink-2">{t("Tez orada foydali maqolalar qo‘shamiz.")}</p>
          <Link href="/shablonlar/" className="btn btn-primary btn-sm mt-3">
            {t("Shablonlarni ko‘rish")}
            <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <>
          <div className={`mt-8 grid gap-x-6 gap-y-12 border-t border-line pt-10 transition-opacity md:grid-cols-2 lg:grid-cols-3 ${busy ? "opacity-50" : ""}`}>
            {data.items.map((c) => (
              <ArticleCardView key={c.id} c={c} />
            ))}
          </div>
          <Pagination category={cat} page={data.page} pages={data.pages} />
        </>
      )}
    </div>
  );
}

export function ArticlesIndexPage() {
  const t = useT();
  const locale = useLocale();
  const boot = useSsrBoot<ArticleListData>("list");
  const [data, setData] = useState<ArticleListData | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const first = useRef(true);
  const seq = useRef(0);

  const onSearch = useCallback(
    (search: string) => {
      const q = parseQuery(search);
      const useBoot = first.current && boot.island?.query && boot.island.query.category === q.category && boot.island.query.page === q.page;
      first.current = false;
      if (useBoot) {
        setData(boot.island!.data);
        return;
      }
      const n = ++seq.current;
      setBusy(true);
      const sp = new URLSearchParams({ lang: locale, page: String(q.page) });
      if (q.category) sp.set("category", q.category);
      apiGet<ArticleListData & { ok: boolean }>(`/api/articles?${sp}`)
        .then((d) => n === seq.current && (setData(d), setFailed(false)))
        .catch(() => n === seq.current && setFailed(true))
        .finally(() => n === seq.current && setBusy(false));
    },
    [boot, locale],
  );

  let title: string | null = null;
  if (data) {
    const name = categoryLabel(data.category, locale);
    title = name ? t("{c} — maqolalar", { c: name }) : t("Maqolalar — to‘y va taklifnoma bo‘yicha maslahatlar");
    if (data.page > 1) title += ` — ${t("{n}-sahifa", { n: data.page })}`;
    title += " · Shohnoma";
  }
  useDocumentTitle(title);

  return (
    <>
      <Suspense fallback={null}>
        <SearchWatcher onChange={onSearch} />
      </Suspense>
      {data ? (
        <ArticleList data={data} busy={busy} />
      ) : (
        <>
          <SsrSlot html={boot.html} />
          {!boot.html && (failed ? <LoadFailed /> : busy ? <PageLoading /> : null)}
        </>
      )}
    </>
  );
}

function LoadFailed() {
  const t = useT();
  return (
    <div className={pageWrap}>
      <div className="flex flex-col items-center gap-4 rounded-card bg-bg-soft px-6 py-16 text-center">
        <p className="t-body-l text-ink-2">{t("Ma’lumotni yuklab bo‘lmadi")}</p>
        <button type="button" onClick={() => window.location.reload()} className="btn btn-secondary btn-sm">
          {t("Qayta urinish")}
        </button>
      </div>
    </div>
  );
}

/* ── Maqola ── */

function ArticleNotFound() {
  const t = useT();
  return (
    <div className={pageWrap}>
      <div className="mx-auto flex min-h-[50vh] max-w-[640px] flex-col items-center justify-center gap-5 text-center">
        <span className="font-serif text-[88px] font-light italic leading-none text-maroon">404</span>
        <h1 className="font-serif text-[34px] font-light leading-[1.05] text-ink lg:text-[48px]">{t("Maqola topilmadi")}</h1>
        <Link href="/maqolalar/" className="btn btn-primary">
          {t("Barcha maqolalar")} <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

/** Maqoladan maqolaga brauzerda o‘tilganda (bir xil "_" qobiq) komponent qaytadan boshlansin */
export function ArticlePage() {
  return <ArticlePageInner key={usePathname()} />;
}

function ArticlePageInner() {
  const locale = useLocale();
  const router = useRouter();
  const boot = useSsrBoot<ArticlePageData>("article");
  const [data, setData] = useState<ArticlePageData | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "notfound" | "error">("idle");

  useEffect(() => {
    if (boot.island?.data) {
      setData(boot.island.data);
      return;
    }
    const slug = routeParam("maqolalar");
    if (!slug) {
      setStatus("notfound");
      return;
    }
    setStatus("loading");
    const preview = new URLSearchParams(window.location.search).get("preview") === "1";
    apiGet<ArticlePageData & { ok: boolean }>(`/api/articles/${encodeURIComponent(slug)}${preview ? "?preview=1" : ""}`)
      .then((d) => {
        // Boshqa tildagi maqola (masalan /ru/maqolalar/<uz-slug>/) — shu tildagi tarjimaga yoki ro‘yxatga
        if (d.article.lang !== locale && !preview) {
          const tr = d.article.translations.find((x) => x.lang === locale);
          router.replace(tr ? tr.url : lpath(locale, "/maqolalar/"));
          return;
        }
        setData({ article: d.article, related: d.related });
        setStatus("idle");
      })
      .catch((e) => setStatus(e instanceof ApiError && e.status === 404 ? "notfound" : "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useDocumentTitle(data ? data.article.seoTitle || `${data.article.title} · Shohnoma` : null);

  if (data) return <ArticleView data={data} />;
  if (status === "notfound") return <ArticleNotFound />;
  return (
    <>
      <SsrSlot html={boot.html} />
      {!boot.html && (status === "error" ? <LoadFailed /> : status === "loading" ? <PageLoading /> : null)}
    </>
  );
}
