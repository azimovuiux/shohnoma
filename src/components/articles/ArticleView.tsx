"use client";

import { useEffect, useState } from "react";
import Link from "@/components/LocalLink";
import { ArrowDown2, ArrowRight, Calendar, Clock, Copy } from "@/components/icons";
import { TelegramIcon } from "@/components/TelegramIcon";
import { useCopy } from "@/components/ui";
import { useLocale, useT } from "@/lib/i18n";
import { articleDate, articleListHref, categoryLabel, type ArticlePageData } from "@/lib/articles";
import { ArticleCardView, Breadcrumbs, pageWrap } from "./parts";

/** Faol mundarija bandi — ekrandagi H2 bo‘yicha */
function useActiveHeading(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (!ids.length) return;
    const els = ids.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    const onScroll = () => {
      let cur: string | null = null;
      for (const el of els) if (el.getBoundingClientRect().top < 140) cur = el.id;
      setActive(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [ids]);
  return active;
}

/** Maqola sahifasi. Belgilash php/article.php dagi bilan bir xil (server HTML → React almashganda sakrash bo‘lmasin) */
export function ArticleView({ data }: { data: ArticlePageData }) {
  const t = useT();
  const locale = useLocale();
  const copy = useCopy();
  const a = data.article;
  const [date, dt] = articleDate(a.publishedAt ?? a.updatedAt, locale);
  const cat = categoryLabel(a.category, locale);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}${a.url}`;
  const tg = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(a.title)}`;
  const tocIds = a.toc.map((x) => x.id);
  const active = useActiveHeading(tocIds);
  const hasToc = a.toc.length > 0;

  return (
    <div className={pageWrap}>
      {a.status !== "published" && <p className="mb-6 rounded-input bg-gold-soft px-4 py-3 t-body-m text-maroon">{t("Qoralama — buni faqat admin ko‘radi")}</p>}
      <Breadcrumbs
        items={[
          [t("Bosh sahifa"), "/"],
          [t("Maqolalar"), "/maqolalar/"],
          [a.title, a.url],
        ]}
      />
      <header className="mx-auto mt-8 max-w-[860px] text-center lg:mt-12">
        {cat && (
          <Link href={articleListHref(a.category, 1)} className="t-annotation text-gold transition-colors hover:text-maroon">
            {cat}
          </Link>
        )}
        <h1 className="mt-4 font-serif text-[38px] font-light leading-[1.06] text-ink sm:text-[48px] lg:text-[64px]">{a.title}</h1>
        {a.excerpt !== "" && <p className="t-body-l mx-auto mt-5 max-w-[680px] text-ink-2">{a.excerpt}</p>}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 t-body-s text-ink-2">
          {date && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={16} />
              <time dateTime={dt}>{date}</time>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Clock size={16} />
            {t("{n} daqiqa o‘qish", { n: a.readingMinutes })}
          </span>
        </div>
      </header>
      {a.cover && (
        <figure className="mx-auto mt-10 max-w-[1200px] overflow-hidden rounded-card bg-bg-soft lg:mt-14">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.cover} alt={a.title} fetchPriority="high" decoding="async" className="aspect-[16/9] w-full object-cover" />
        </figure>
      )}
      <div className={`mx-auto mt-10 grid max-w-[1200px] gap-8 lg:mt-16 lg:gap-16 ${hasToc ? "lg:grid-cols-[240px_minmax(0,780px)]" : "lg:max-w-[760px]"}`}>
        {hasToc && (
          <aside className="min-w-0">
            <div className="lg:sticky lg:top-28">
              <details className="group/toc rounded-panel border border-line bg-bg-soft lg:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 t-title text-ink [&::-webkit-details-marker]:hidden">
                  {t("Mundarija")}
                  <ArrowDown2 size={16} className="transition-transform group-open/toc:rotate-180" />
                </summary>
                <ol className="flex flex-col gap-2.5 px-5 pb-5 t-body-m">
                  {a.toc.map((x) => (
                    <li key={x.id}>
                      <a href={`#${x.id}`} className="text-ink-2 transition-colors hover:text-maroon">
                        {x.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </details>
              <nav aria-label={t("Mundarija")} className="hidden lg:block">
                <p className="t-annotation text-ink-2">{t("Mundarija")}</p>
                <ol className="mt-4 flex flex-col border-l border-line">
                  {a.toc.map((x) => (
                    <li key={x.id}>
                      <a
                        href={`#${x.id}`}
                        aria-current={active === x.id ? "location" : undefined}
                        className={`-ml-px block border-l-2 py-1.5 pl-4 t-body-m transition-colors hover:text-maroon ${
                          active === x.id ? "border-maroon text-maroon" : "border-transparent text-ink-2"
                        }`}
                      >
                        {x.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          </aside>
        )}
        <div className="min-w-0">
          <div className="sh-prose" dangerouslySetInnerHTML={{ __html: a.html }} />
          <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="t-title text-ink">{t("Maqolani ulashing")}</p>
            <div className="flex flex-wrap gap-2.5">
              <a href={tg} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                <TelegramIcon size={16} />
                Telegram
              </a>
              <button type="button" onClick={() => copy(url, t("Havola nusxalandi"))} className="btn btn-secondary btn-sm">
                <Copy size={16} />
                {t("Havolani nusxalash")}
              </button>
            </div>
          </div>
          <section className="mt-12 overflow-hidden rounded-card bg-maroon-deep px-6 py-10 text-ink-inverse sm:px-10 lg:py-12">
            <p className="t-annotation text-[#e2c48c]">Shohnoma</p>
            <h2 className="mt-3 font-serif text-[32px] font-light leading-[1.08] lg:text-[44px]">{t("Taklifnomangizni bugun tayyorlang")}</h2>
            <p className="t-body-l mt-3 max-w-[520px] opacity-80">{t("Tayyor dizaynni tanlang, ma’lumotlaringizni kiriting — havolani mehmonlarga yuborasiz.")}</p>
            <Link href="/shablonlar/" className="btn mt-7 bg-bg-base text-maroon hover:bg-white">
              {t("Shablonlarni ko‘rish")}
              <ArrowRight size={16} />
            </Link>
          </section>
        </div>
      </div>
      {data.related.length > 0 && (
        <section className="mx-auto mt-20 max-w-[1200px] border-t border-line pt-12 lg:mt-28">
          <h2 className="font-serif text-[34px] font-light leading-none text-ink lg:text-[44px]">{t("O‘xshash maqolalar")}</h2>
          <div className="mt-8 grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
            {data.related.map((r) => (
              <ArticleCardView key={r.id} c={r} as="h3" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
