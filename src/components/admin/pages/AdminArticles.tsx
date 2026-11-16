"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/client";
import { StatusBadge, api, confirmDialog, useToast } from "@/components/ui";
import { Add, Edit, ExportSquare, SearchNormal1, Trash } from "@/components/icons";
import { categoryLabel, type ArticleLang } from "@/lib/articles";
import { AdminError, AdminLoading, AdminTitle, Empty, fmtDateTime } from "../shared";

export type AdminArticleRow = {
  id: string;
  slug: string;
  lang: ArticleLang;
  groupId: string;
  title: string;
  excerpt: string;
  category: string | null;
  cover: string | null;
  seoTitle: string;
  seoDescription: string;
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  wordCount: number;
  url: string;
  translations: { id: string; lang: ArticleLang; status: "draft" | "published" }[];
};

export const LANG_LABEL: Record<ArticleLang, string> = { uz: "O‘zbekcha", ru: "Ruscha", en: "Inglizcha" };

export function LangTag({ lang, muted = false, title }: { lang: ArticleLang; muted?: boolean; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex h-6 min-w-8 items-center justify-center rounded-full px-2 text-[11px] font-semibold uppercase tracking-wide ${
        muted ? "border border-dashed border-line text-ink-2" : "bg-gold-soft text-maroon"
      }`}
    >
      {lang}
    </span>
  );
}

const chip = (active: boolean) =>
  `inline-flex h-9 shrink-0 items-center rounded-full px-3.5 t-nav transition-colors ${active ? "bg-maroon text-ink-inverse" : "bg-bg-soft text-ink hover:bg-[#efe9df]"}`;

export function AdminArticles() {
  const { data, loading, error, reload } = useApi<{ ok: boolean; items: AdminArticleRow[] }>("/api/admin/articles");
  const toast = useToast();
  const [lang, setLang] = useState<"" | ArticleLang>("");
  const [status, setStatus] = useState<"" | "draft" | "published">("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const items = useMemo(() => data?.items ?? [], [data]);
  const list = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase();
    return items.filter(
      (a) => (!lang || a.lang === lang) && (!status || a.status === status) && (!needle || a.title.toLocaleLowerCase().includes(needle) || a.slug.includes(needle)),
    );
  }, [items, lang, status, q]);

  if (loading && !data) return <AdminLoading />;
  if (!data) return <AdminError message={error?.message} onRetry={() => reload()} />;

  const published = items.filter((a) => a.status === "published").length;

  const remove = async (a: AdminArticleRow) => {
    if (!(await confirmDialog({ title: `«${a.title}» maqolasini o‘chirasizmi?`, text: "Maqola saytdan va ro‘yxatdan butunlay o‘chadi. Tarjimalari qoladi.", ok: "O‘chirish", danger: true })))
      return;
    setBusy(a.id);
    try {
      await api(`/api/admin/articles/${a.id}`, { method: "DELETE" });
      toast("Maqola o‘chirildi");
      await reload(true);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };

  const setPublished = async (a: AdminArticleRow, pub: boolean) => {
    setBusy(a.id);
    try {
      await api(`/api/admin/articles/${a.id}`, { method: "PATCH", json: { status: pub ? "published" : "draft" } });
      toast(pub ? "Maqola nashr qilindi" : "Maqola qoralamaga qaytarildi");
      await reload(true);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <AdminTitle
        title="Maqolalar"
        sub={`${published} ta nashr etilgan, jami ${items.length} ta. Nashr etilgan maqola saytda va sitemap’da darhol ko‘rinadi.`}
        right={
          <Link href="/admin/maqolalar/tahrir/" className="btn btn-primary btn-sm w-fit">
            <Add size={16} /> Yangi maqola
          </Link>
        }
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:px-0">
          {(["", "uz", "ru", "en"] as const).map((l) => (
            <button key={l || "all"} type="button" onClick={() => setLang(l)} className={chip(lang === l)}>
              {l ? l.toUpperCase() : "Barcha tillar"}
            </button>
          ))}
          <span className="mx-1 w-px shrink-0 bg-line" aria-hidden />
          {(
            [
              ["", "Barchasi"],
              ["published", "Nashr etilgan"],
              ["draft", "Qoralama"],
            ] as const
          ).map(([s, label]) => (
            <button key={s || "all"} type="button" onClick={() => setStatus(s)} className={chip(status === s)}>
              {label}
            </button>
          ))}
        </div>
        <label className="relative flex w-full items-center lg:w-[300px]">
          <SearchNormal1 size={17} className="pointer-events-none absolute left-3.5 text-ink-2" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Sarlavha yoki manzil bo‘yicha"
            className="h-10 w-full rounded-full border border-line bg-bg-base pl-10 pr-4 t-body-m text-ink outline-none placeholder:text-ink-2 focus:border-maroon/55"
          />
        </label>
      </div>

      {list.length === 0 ? (
        <Empty>{items.length ? "Bu filtr bo‘yicha maqola yo‘q" : "Hali maqola yo‘q — «Yangi maqola» tugmasi bilan boshlang"}</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((a) => {
            const others = a.translations.filter((x) => x.id !== a.id);
            return (
              <li key={a.id} className="flex flex-col gap-4 rounded-panel border border-line bg-bg-base p-4 sm:flex-row sm:items-center">
                <Link href={`/admin/maqolalar/tahrir/?id=${a.id}`} className="block w-full shrink-0 overflow-hidden rounded-xl bg-bg-soft sm:w-[132px]">
                  {a.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.cover} alt="" className="aspect-[16/10] w-full object-cover" />
                  ) : (
                    <span className="flex aspect-[16/10] w-full items-center justify-center bg-gold-soft font-serif text-[20px] italic text-maroon/40">Shohnoma</span>
                  )}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={a.status === "published" ? "success" : "muted"} dot>
                      {a.status === "published" ? "Nashr etilgan" : "Qoralama"}
                    </StatusBadge>
                    <LangTag lang={a.lang} title={LANG_LABEL[a.lang]} />
                    {others.map((o) => (
                      <Link key={o.id} href={`/admin/maqolalar/tahrir/?id=${o.id}`} title={`${LANG_LABEL[o.lang]} tarjimasi (${o.status === "published" ? "nashr etilgan" : "qoralama"})`}>
                        <LangTag lang={o.lang} muted />
                      </Link>
                    ))}
                    {a.category && <span className="t-body-s text-ink-2">· {categoryLabel(a.category, "uz")}</span>}
                  </div>
                  <Link href={`/admin/maqolalar/tahrir/?id=${a.id}`} className="font-serif text-[22px] leading-tight text-ink hover:text-maroon">
                    {a.title}
                  </Link>
                  <p className="truncate t-body-s text-ink-2">
                    {a.url} · {a.wordCount} so‘z · {a.status === "published" ? `nashr: ${fmtDateTime(a.publishedAt)}` : `o‘zgartirildi: ${fmtDateTime(a.updatedAt)}`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={busy === a.id}
                    onClick={() => setPublished(a, a.status !== "published")}
                    className="btn btn-secondary btn-sm !px-3.5 !py-2.5"
                  >
                    {a.status === "published" ? "Qoralamaga" : "Nashr qilish"}
                  </button>
                  <Link href={`/admin/maqolalar/tahrir/?id=${a.id}`} className="icon-btn !h-9 !w-9" aria-label="Tahrirlash">
                    <Edit size={16} />
                  </Link>
                  <a
                    href={a.status === "published" ? a.url : `${a.url}?preview=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="icon-btn !h-9 !w-9"
                    aria-label={a.status === "published" ? "Saytda ko‘rish" : "Oldindan ko‘rish"}
                    title={a.status === "published" ? "Saytda ko‘rish" : "Oldindan ko‘rish"}
                  >
                    <ExportSquare size={16} />
                  </a>
                  <button type="button" onClick={() => remove(a)} disabled={busy === a.id} className="icon-btn !h-9 !w-9 text-danger" aria-label="O‘chirish">
                    <Trash size={16} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
