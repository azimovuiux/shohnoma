"use client";

/**
 * Maqolalar bo‘limining umumiy qismlari. DIQQAT: belgilash (teglar va klasslar) php/article.php dagi bilan bir xil —
 * sahifa avval serverda (JS’siz) chiziladi, keyin React xuddi shu ko‘rinishni qayta chizadi; farq bo‘lsa sakrash ko‘rinadi.
 */
import { Fragment, useLayoutEffect, useState } from "react";
import Link from "@/components/LocalLink";
import { ArrowLeft2, ArrowRight2 } from "@/components/icons";
import { useLocale, useT } from "@/lib/i18n";
import { articleDate, articleListHref, bareArticleUrl, categoryLabel, type ArticleCard } from "@/lib/articles";

export const pageWrap = "mx-auto max-w-[1440px] px-5 pb-24 pt-8 lg:px-10 lg:pt-12 xl:px-[120px]";

export function Breadcrumbs({ items }: { items: [string, string][] }) {
  const last = items.length - 1;
  return (
    <nav aria-label="Breadcrumb" className="t-body-s text-ink-2">
      <ol className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map(([label, href], i) =>
          i === last ? (
            <li key={i} aria-current="page" className="min-w-0 max-w-full truncate text-ink">
              {label}
            </li>
          ) : (
            <Fragment key={i}>
              <li>
                <Link href={href} className="transition-colors hover:text-maroon">
                  {label}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
            </Fragment>
          ),
        )}
      </ol>
    </nav>
  );
}

export function ArticleCardView({ c, as: Tag = "h2" }: { c: ArticleCard; as?: "h2" | "h3" }) {
  const locale = useLocale();
  const [date, dt] = articleDate(c.publishedAt, locale);
  const cat = categoryLabel(c.category, locale);
  const href = bareArticleUrl(c.url);
  return (
    <article className="group flex min-w-0 flex-col">
      <Link href={href} tabIndex={-1} aria-hidden="true" className="block overflow-hidden rounded-card bg-bg-soft">
        {c.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.cover}
            alt={c.title}
            loading="lazy"
            decoding="async"
            className="aspect-[16/10] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex aspect-[16/10] w-full items-center justify-center bg-gold-soft">
            <span className="font-serif text-[44px] font-light italic text-maroon/35">Shohnoma</span>
          </div>
        )}
      </Link>
      <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 t-body-s text-ink-2">
        {cat && (
          <>
            <span className="t-annotation text-gold">{cat}</span>
            <span aria-hidden="true">·</span>
          </>
        )}
        <time dateTime={dt}>{date}</time>
      </div>
      <Tag className="mt-2 font-serif text-[26px] font-normal leading-[1.15] text-ink">
        <Link href={href} className="transition-colors hover:text-maroon">
          {c.title}
        </Link>
      </Tag>
      {c.excerpt !== "" && <p className="t-body-m mt-2 line-clamp-3 text-ink-2">{c.excerpt}</p>}
    </article>
  );
}

export function CategoryChip({ label, n, active, href }: { label: string; n: number; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={`inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-full px-4 t-nav transition-colors ${
        active ? "bg-maroon text-ink-inverse" : "bg-bg-soft text-ink hover:bg-[#efe9df]"
      }`}
    >
      {label}
      <span
        aria-hidden="true"
        className={`inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11.5px] font-semibold leading-none tabular-nums transition-colors ${
          active ? "bg-white/20 text-ink-inverse" : "bg-maroon/10 text-maroon"
        }`}
      >
        {n}
      </span>
    </Link>
  );
}

export function Pagination({ category, page, pages }: { category: string | null; page: number; pages: number }) {
  const t = useT();
  if (pages < 2) return null;
  const btn = "inline-flex size-11 items-center justify-center rounded-full border t-nav transition-colors";
  const link = `${btn} border-line text-ink hover:border-maroon hover:text-maroon`;
  return (
    <nav aria-label={t("Sahifalar")} className="mt-14 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link href={articleListHref(category, page - 1)} rel="prev" aria-label={t("Oldingi")} className={link}>
          <ArrowLeft2 size={16} />
        </Link>
      )}
      {Array.from({ length: pages }, (_, i) => i + 1).map((i) =>
        i === page ? (
          <span key={i} aria-current="page" className={`${btn} border-maroon bg-maroon text-ink-inverse`}>
            {i}
          </span>
        ) : (
          <Link key={i} href={articleListHref(category, i)} className={link}>
            {i}
          </Link>
        ),
      )}
      {page < pages && (
        <Link href={articleListHref(category, page + 1)} rel="next" aria-label={t("Keyingi")} className={link}>
          <ArrowRight2 size={16} />
        </Link>
      )}
    </nav>
  );
}

/**
 * Server (php/article.php) #sh-ssr ichiga qo‘ygan HTML va JSON. Faqat birinchi yuklanishda va shu manzil uchun:
 * hydratsiya paytida React shu HTML’ni o‘zgartirmaydi (dangerouslySetInnerHTML qiymati DOM’dagi bilan bir xil).
 */
export type SsrIsland<T> = { kind: "article" | "list"; path: string; query?: { category: string | null; page: number }; data: T };

function readSsr<T>(kind: SsrIsland<T>["kind"]): { html: string; island: SsrIsland<T> | null } {
  if (typeof document === "undefined") return { html: "", island: null };
  const el = document.getElementById("sh-ssr");
  const script = el?.querySelector("#sh-ssr-data");
  if (!el || !script) return { html: "", island: null };
  try {
    const island = JSON.parse(script.textContent || "") as SsrIsland<T>;
    if (island.kind !== kind || island.path !== window.location.pathname) return { html: "", island: null };
    return { html: el.innerHTML, island };
  } catch {
    return { html: "", island: null };
  }
}

export function useSsrBoot<T>(kind: SsrIsland<T>["kind"]) {
  const [boot] = useState(() => readSsr<T>(kind));
  return boot;
}

/** Server HTML joy ushlagichi (statik qobiqda bo‘sh `<div id="sh-ssr"></div>`) */
export function SsrSlot({ html }: { html: string }) {
  return <div id="sh-ssr" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Statik qobiqlarning umumiy sarlavhalari (maqolalar sahifalaridagi metadata.title + « · Shohnoma») */
const SHELL_TITLES = new Set(["Maqolalar", "Статьи", "Articles", "Maqola", "Статья", "Article"].map((t) => `${t} · Shohnoma`));

/**
 * Sahifa sarlavhasi. Server (PHP) to‘g‘ri <title> qo‘yadi, lekin React hydratsiyaning keyingi bosqichida qobiqdagi umumiy
 * sarlavhani qaytarib yozadi — shuning uchun faqat shu umumiy sarlavha qo‘yilganda o‘zimiznikini qayta qo‘yamiz.
 * useLayoutEffect: boshqa sahifaga o‘tilganda kuzatuv yangi sarlavha yozilishidan oldin to‘xtaydi.
 */
export function useDocumentTitle(title: string | null) {
  useLayoutEffect(() => {
    if (!title) return;
    document.title = title;
    const mo = new MutationObserver(() => {
      if (document.title !== title && SHELL_TITLES.has(document.title)) document.title = title;
    });
    mo.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => mo.disconnect();
  }, [title]);
}
