"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { apiGet } from "@/lib/client";
import { Field, Input, Textarea, StatusBadge, api, confirmDialog, useToast } from "@/components/ui";
import { ArrowLeft, DocumentUpload, ExportSquare, TickCircle, Trash, Warning2 } from "@/components/icons";
import { ARTICLE_CATEGORIES, articleSlugify, type ArticleLang, type ArticleTranslation } from "@/lib/articles";
import { AdminError, AdminLoading, AdminTitle, fmtDateTime } from "../shared";
import { RichEditor } from "../RichEditor";
import { LANG_LABEL, LangTag, type AdminArticleRow } from "./AdminArticles";

type Form = {
  title: string;
  slug: string;
  lang: ArticleLang;
  excerpt: string;
  category: string;
  cover: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
};
type Loaded = AdminArticleRow & { body: string };

const LANGS: ArticleLang[] = ["uz", "ru", "en"];
const selectClass = "h-12 w-full rounded-input border border-line bg-bg-base px-4 t-body-m text-ink outline-none transition-colors focus:border-maroon/55";
const blank = (lang: ArticleLang = "uz"): Form => ({ title: "", slug: "", lang, excerpt: "", category: "", cover: "", body: "", seoTitle: "", seoDescription: "" });
const fromArticle = (a: Loaded): Form => ({
  title: a.title,
  slug: a.slug,
  lang: a.lang,
  excerpt: a.excerpt,
  category: a.category ?? "",
  cover: a.cover ?? "",
  body: a.body,
  seoTitle: a.seoTitle,
  seoDescription: a.seoDescription,
});
const plain = (html: string) =>
  html
    .replace(/<(br|\/p|\/h[2-4]|\/li|\/blockquote)>/g, " $&")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
const snippet = (s: string, max = 160) => (s.length <= max ? s : `${s.slice(0, max - 1).replace(/\s+\S*$/, "")}…`);

function Card({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-panel border border-line bg-bg-base p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-[22px] font-light text-ink">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Counter({ n, max, soft }: { n: number; max: number; soft?: number }) {
  const over = n > max;
  const warn = soft !== undefined && n > 0 && n < soft;
  return <span className={`tabular-nums ${over ? "text-decline" : warn ? "text-pending" : "text-ink-2"}`}>{n} / {max}</span>;
}

/** ?id= / ?tarjima= o‘zgarganda (masalan, «+ Yaratish» yoki tarjimaga o‘tish) forma qaytadan boshlanadi */
export function AdminArticleEdit() {
  const sp = useSearchParams();
  return <ArticleEditor key={sp.toString()} />;
}

function ArticleEditor() {
  const sp = useSearchParams();
  const id = sp.get("id");
  const sourceId = sp.get("tarjima");
  const sourceLang = (LANGS.includes(sp.get("til") as ArticleLang) ? sp.get("til") : null) as ArticleLang | null;
  const router = useRouter();
  const toast = useToast();

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [translations, setTranslations] = useState<ArticleTranslation[]>([]);
  const [f, setF] = useState<Form | null>(id ? null : blank(sourceLang ?? "uz"));
  const [saved, setSaved] = useState<string>(JSON.stringify(id ? null : blank(sourceLang ?? "uz")));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!id);
  const [slugState, setSlugState] = useState<{ slug: string; available: boolean; valid: boolean } | null>(null);
  const [all, setAll] = useState<AdminArticleRow[] | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);

  // Yuklash: mavjud maqola yoki «tarjima yaratish» (asl maqoladan kategoriya va muqova olinadi)
  useEffect(() => {
    if (id) {
      apiGet<{ article: Loaded; translations: ArticleTranslation[] }>(`/api/admin/articles/${id}`)
        .then((r) => {
          setLoaded(r.article);
          setTranslations(r.translations);
          const form = fromArticle(r.article);
          setF(form);
          setSaved(JSON.stringify(form));
          setSlugTouched(true);
        })
        .catch((e) => setLoadError((e as Error).message));
    } else if (sourceId) {
      apiGet<{ article: Loaded; translations: ArticleTranslation[] }>(`/api/admin/articles/${sourceId}`)
        .then((r) => {
          setTranslations(r.translations);
          setF((p) => (p ? { ...p, category: r.article.category ?? "", cover: r.article.cover ?? "" } : p));
        })
        .catch(() => toast("Asl maqola topilmadi", "error"));
    }
    apiGet<{ items: AdminArticleRow[] }>("/api/admin/articles")
      .then((r) => setAll(r.items))
      .catch(() => setAll([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, sourceId]);

  const dirty = !!f && JSON.stringify(f) !== saved;
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  // Manzil bandligini tekshirish (yozish to‘xtagach)
  const slug = f?.slug ?? "";
  useEffect(() => {
    if (!slug) {
      setSlugState(null);
      return;
    }
    const tm = window.setTimeout(() => {
      apiGet<{ slug: string; available: boolean; valid: boolean }>(`/api/admin/articles-slug?slug=${encodeURIComponent(slug)}${id ? `&id=${id}` : ""}`)
        .then(setSlugState)
        .catch(() => setSlugState(null));
    }, 350);
    return () => window.clearTimeout(tm);
  }, [slug, id]);

  const bodyText = useMemo(() => plain(f?.body ?? ""), [f?.body]);
  const words = bodyText ? bodyText.split(" ").length : 0;

  if (loadError) return <AdminError message={loadError} onRetry={() => location.reload()} />;
  if (!f) return <AdminLoading />;

  const set = (patch: Partial<Form>) => setF((p) => (p ? { ...p, ...patch } : p));
  const status = loaded?.status ?? "draft";
  const isPublished = status === "published";
  const effTitle = f.seoTitle.trim() || `${f.title.trim() || "Sarlavha"} · Shohnoma`;
  const effDesc = f.seoDescription.trim() || f.excerpt.trim() || snippet(bodyText);
  const pathPrefix = `${f.lang === "uz" ? "" : `/${f.lang}`}/maqolalar/`;

  const save = async (nextStatus?: "draft" | "published") => {
    if (!f.title.trim()) {
      toast("Sarlavhani kiriting", "error");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...f, slug: f.slug.trim() };
      if (nextStatus) payload.status = nextStatus;
      let r: { article: Loaded; translations: ArticleTranslation[] };
      if (loaded) {
        r = await api(`/api/admin/articles/${loaded.id}`, { method: "PATCH", json: payload });
      } else {
        if (sourceId) payload.translationOf = sourceId;
        r = await api(`/api/admin/articles`, { method: "POST", json: payload });
      }
      setLoaded(r.article);
      setTranslations(r.translations);
      const form = fromArticle(r.article);
      setF(form);
      setSaved(JSON.stringify(form));
      setSlugTouched(true);
      toast(nextStatus === "published" && !isPublished ? "Maqola nashr qilindi" : nextStatus === "draft" && isPublished ? "Maqola qoralamaga qaytarildi" : "Saqlandi");
      if (!loaded) router.replace(`/admin/maqolalar/tahrir/?id=${r.article.id}`);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!loaded) return;
    if (!(await confirmDialog({ title: `«${loaded.title}» maqolasini o‘chirasizmi?`, text: "Maqola saytdan butunlay o‘chadi. Buni qaytarib bo‘lmaydi.", ok: "O‘chirish", danger: true }))) return;
    try {
      await api(`/api/admin/articles/${loaded.id}`, { method: "DELETE" });
      setSaved(JSON.stringify(f));
      toast("Maqola o‘chirildi");
      router.push("/admin/maqolalar/");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const uploadCover = async (file: File) => {
    setCoverBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api<{ url: string }>("/api/admin/articles-image", { method: "POST", body: fd });
      set({ cover: r.url });
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setCoverBusy(false);
      if (coverRef.current) coverRef.current.value = "";
    }
  };

  /** Boshqa maqolani shu maqolaning tarjimasi sifatida bog‘lash (u shu guruhga o‘tadi) */
  const linkExisting = async (otherId: string) => {
    if (!loaded || !otherId) return;
    try {
      await api(`/api/admin/articles/${otherId}`, { method: "PATCH", json: { translationOf: loaded.id } });
      const r = await apiGet<{ translations: ArticleTranslation[] }>(`/api/admin/articles/${loaded.id}`);
      setTranslations(r.translations);
      toast("Tarjima bog‘landi");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };
  const unlink = async () => {
    if (!loaded) return;
    if (!(await confirmDialog({ title: "Maqolani tarjimalar guruhidan ajratasizmi?", text: "Maqolalar o‘chmaydi, faqat bir-biriga bog‘liq bo‘lmaydi (hreflang).", ok: "Ajratish" }))) return;
    try {
      const r = await api<{ article: Loaded; translations: ArticleTranslation[] }>(`/api/admin/articles/${loaded.id}`, { method: "PATCH", json: { unlink: true } });
      setTranslations(r.translations);
      setLoaded(r.article);
      toast("Guruhdan ajratildi");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const groupId = loaded?.groupId;
  const slugMsg =
    !f.slug.trim() ? (
      <span>Bo‘sh qoldirsangiz — sarlavhadan avtomatik yasaladi.</span>
    ) : slugState && slugState.slug === f.slug ? (
      !slugState.valid ? (
        <span className="text-decline">Faqat lotin harflari, raqamlar va «-» (kamida 2 belgi).</span>
      ) : slugState.available ? (
        <span className="inline-flex items-center gap-1 text-success">
          <TickCircle size={14} /> Manzil bo‘sh
        </span>
      ) : (
        <span className="text-decline">Bu manzil boshqa maqolada ishlatilgan</span>
      )
    ) : (
      <span>Tekshirilmoqda…</span>
    );

  const actions = (
    <>
      <button type="button" onClick={() => save()} disabled={saving} className="btn btn-secondary btn-sm flex-1 !px-4">
        {saving ? "Saqlanmoqda…" : "Saqlash"}
      </button>
      {isPublished ? (
        <button type="button" onClick={() => save("draft")} disabled={saving} className="btn btn-secondary btn-sm flex-1 !px-4">
          Qoralamaga qaytarish
        </button>
      ) : (
        <button type="button" onClick={() => save("published")} disabled={saving} className="btn btn-primary btn-sm flex-1 !px-4">
          Nashr qilish
        </button>
      )}
    </>
  );

  return (
    <div className="pb-24 lg:pb-0">
      <Link href="/admin/maqolalar/" className="mb-4 inline-flex items-center gap-1.5 t-nav text-ink-2 hover:text-maroon">
        <ArrowLeft size={15} /> Maqolalar
      </Link>
      <AdminTitle
        title={loaded ? "Maqolani tahrirlash" : sourceId ? `Tarjima: ${LANG_LABEL[f.lang].toLowerCase()} versiya` : "Yangi maqola"}
        sub={
          loaded ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              <StatusBadge tone={isPublished ? "success" : "muted"} dot>
                {isPublished ? "Nashr etilgan" : "Qoralama"}
              </StatusBadge>
              <span>
                {isPublished ? `Nashr: ${fmtDateTime(loaded.publishedAt)}` : `Yaratildi: ${fmtDateTime(loaded.createdAt)}`} · O‘zgartirildi: {fmtDateTime(loaded.updatedAt)}
              </span>
              {dirty && <span className="text-pending">· saqlanmagan o‘zgarishlar bor</span>}
            </span>
          ) : (
            "Qoralama sifatida saqlanadi — tayyor bo‘lgach «Nashr qilish» ni bosing."
          )
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Asosiy ustun */}
        <div className="flex min-w-0 flex-col gap-5">
          <Field label="Sarlavha (H1)" required>
            <Input
              value={f.title}
              maxLength={200}
              onChange={(e) => {
                const title = e.target.value;
                set(slugTouched ? { title } : { title, slug: articleSlugify(title) });
              }}
              placeholder="Masalan: Elektron taklifnoma nima va u nimasi bilan qulay"
              className="!h-14 font-serif !text-[22px]"
            />
          </Field>
          <Field label={<span className="flex justify-between gap-3">Qisqa tavsif — ro‘yxatda va sarlavha ostida chiqadi <Counter n={f.excerpt.length} max={300} /></span>}>
            <Textarea value={f.excerpt} maxLength={400} onChange={(e) => set({ excerpt: e.target.value })} className="!min-h-20" placeholder="1–2 jumla: maqola nima haqida" />
          </Field>
          <div className="flex flex-col gap-[7px]">
            <span className="flex justify-between gap-3 t-body-s text-ink-2">
              Matn <span>{words} so‘z · ~{Math.max(1, Math.round(words / 200))} daqiqa o‘qish</span>
            </span>
            <RichEditor value={f.body} onChange={(body) => set({ body })} imageAlt={f.title} />
            <span className="t-body-s text-ink-2">H2 sarlavhalar mundarijaga tushadi. Matn saqlanganda xavfsiz holatga keltiriladi (skriptlar, uslublar olib tashlanadi).</span>
          </div>
        </div>

        {/* Yon panel */}
        <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-[112px] lg:max-h-[calc(100dvh-130px)] lg:overflow-y-auto lg:pb-2">
          <Card title="Holat">
            <div className="hidden gap-2 lg:flex">{actions}</div>
            <div className="flex flex-wrap gap-2">
              {loaded && (
                <a
                  href={isPublished ? loaded.url : `${loaded.url}?preview=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 t-nav text-maroon hover:underline"
                >
                  <ExportSquare size={15} /> {isPublished ? "Saytda ko‘rish" : "Oldindan ko‘rish"}
                </a>
              )}
              {loaded && (
                <button type="button" onClick={remove} className="ml-auto inline-flex items-center gap-1.5 t-nav text-decline hover:underline">
                  <Trash size={15} /> O‘chirish
                </button>
              )}
            </div>
            {loaded && isPublished && dirty && <p className="t-body-s text-pending">O‘zgarishlar saytda «Saqlash» bosilgandan keyin ko‘rinadi.</p>}
          </Card>

          <Card title="Til va manzil">
            <Field label="Til" group>
              <div className="flex rounded-full bg-bg-soft p-1" role="radiogroup">
                {LANGS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    role="radio"
                    aria-checked={f.lang === l}
                    onClick={() => set({ lang: l })}
                    className={`flex h-9 flex-1 items-center justify-center rounded-full t-nav transition-colors ${f.lang === l ? "bg-bg-base text-maroon shadow-soft" : "text-ink-2"}`}
                  >
                    {LANG_LABEL[l]}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Manzil (slug)" hint={slugMsg}>
              <div className="flex items-center overflow-hidden rounded-input border border-line focus-within:border-maroon/55">
                <span className="shrink-0 bg-bg-soft px-3 py-3.5 t-body-s text-ink-2">{pathPrefix}</span>
                <input
                  value={f.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-{2,}/g, "-") });
                  }}
                  onBlur={() => set({ slug: articleSlugify(f.slug, 100) })}
                  className="h-12 min-w-0 flex-1 bg-bg-base px-3 t-body-m text-ink outline-none"
                  placeholder="elektron-taklifnoma"
                  aria-label="Manzil"
                />
              </div>
            </Field>
            {isPublished && loaded && f.slug !== loaded.slug && (
              <p className="flex gap-2 rounded-input bg-gold-soft p-3 t-body-s text-maroon">
                <Warning2 size={16} className="mt-0.5 shrink-0" /> Nashr etilgan maqola manzili o‘zgarsa, eski havola ishlamay qoladi (Google’da ham).
              </p>
            )}
          </Card>

          <Card title="Tarjimalar">
            <p className="t-body-s text-ink-2">Bir maqolaning o‘zbekcha, ruscha va inglizcha versiyalari bog‘lanadi — Google har bir tilga to‘g‘ri sahifani ko‘rsatadi (hreflang).</p>
            <ul className="flex flex-col gap-2">
              {LANGS.map((l) => {
                const tr = translations.find((x) => x.lang === l);
                const self = l === f.lang && (!loaded || tr?.id === loaded.id || !tr);
                if (self)
                  return (
                    <li key={l} className="flex items-center gap-2.5 rounded-xl bg-bg-soft px-3 py-2.5">
                      <LangTag lang={l} />
                      <span className="min-w-0 flex-1 truncate t-body-s text-ink">Shu maqola</span>
                    </li>
                  );
                if (tr)
                  return (
                    <li key={l} className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-2.5">
                      <LangTag lang={l} />
                      <Link href={`/admin/maqolalar/tahrir/?id=${tr.id}`} className="min-w-0 flex-1 truncate t-body-s text-ink hover:text-maroon">
                        {tr.title}
                      </Link>
                      <span className={`t-body-s ${tr.status === "published" ? "text-success" : "text-ink-2"}`}>{tr.status === "published" ? "nashrda" : "qoralama"}</span>
                    </li>
                  );
                const candidates = (all ?? []).filter((a) => a.lang === l && a.groupId !== groupId);
                return (
                  <li key={l} className="flex flex-col gap-2 rounded-xl border border-dashed border-line px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <LangTag lang={l} muted />
                      <span className="flex-1 t-body-s text-ink-2">{LANG_LABEL[l]} versiya yo‘q</span>
                      {loaded && (
                        <Link href={`/admin/maqolalar/tahrir/?tarjima=${loaded.id}&til=${l}`} className="t-nav text-maroon hover:underline">
                          + Yaratish
                        </Link>
                      )}
                    </div>
                    {loaded && candidates.length > 0 && (
                      <select className={`${selectClass} !h-10 t-body-s`} value="" onChange={(e) => linkExisting(e.target.value)} aria-label={`Mavjud ${LANG_LABEL[l].toLowerCase()} maqolani bog‘lash`}>
                        <option value="">Mavjud maqolani bog‘lash…</option>
                        {candidates.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </li>
                );
              })}
            </ul>
            {!loaded && <p className="t-body-s text-ink-2">Tarjima qo‘shish uchun avval maqolani saqlang.</p>}
            {loaded && translations.length > 1 && (
              <button type="button" onClick={unlink} className="w-fit t-nav text-ink-2 hover:text-decline">
                Shu maqolani guruhdan ajratish
              </button>
            )}
          </Card>

          <Card title="Kategoriya va muqova">
            <Field label="Kategoriya">
              <select className={selectClass} value={f.category} onChange={(e) => set({ category: e.target.value })}>
                <option value="">Kategoriyasiz</option>
                {ARTICLE_CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name.uz}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex flex-col gap-2">
              <span className="t-body-s text-ink-2">Muqova rasmi (16:9 yoki 16:10, kamida 1200 px eni) — ijtimoiy tarmoqlarda ham shu chiqadi</span>
              <div className="overflow-hidden rounded-xl border border-line bg-bg-soft">
                {f.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.cover} alt="" className="aspect-[16/9] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[16/9] w-full items-center justify-center t-body-s text-ink-2">Rasm yo‘q</div>
                )}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => coverRef.current?.click()} disabled={coverBusy} className="btn btn-secondary btn-sm flex-1 !px-4 !py-2.5">
                  <DocumentUpload size={15} /> {coverBusy ? "Yuklanmoqda…" : f.cover ? "Almashtirish" : "Yuklash"}
                </button>
                {f.cover && (
                  <button type="button" onClick={() => set({ cover: "" })} className="icon-btn !h-10 !w-10 text-danger" aria-label="Muqovani olib tashlash">
                    <Trash size={15} />
                  </button>
                )}
              </div>
              <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
            </div>
          </Card>

          <Card title="SEO">
            <Field label={<span className="flex justify-between gap-3">SEO sarlavha (title) <Counter n={f.seoTitle.length} max={60} /></span>} hint="Bo‘sh bo‘lsa: «Sarlavha · Shohnoma». Tavsiya: 50–60 belgi.">
              <Input value={f.seoTitle} maxLength={160} onChange={(e) => set({ seoTitle: e.target.value })} placeholder={`${f.title || "Sarlavha"} · Shohnoma`} />
            </Field>
            <Field
              label={<span className="flex justify-between gap-3">SEO tavsif (meta description) <Counter n={f.seoDescription.length} max={160} soft={70} /></span>}
              hint="Bo‘sh bo‘lsa: qisqa tavsif yoki matn boshi. Tavsiya: 120–160 belgi."
            >
              <Textarea value={f.seoDescription} maxLength={320} onChange={(e) => set({ seoDescription: e.target.value })} className="!min-h-24" />
            </Field>
            <div className="flex flex-col gap-1 rounded-xl border border-line bg-white p-4" aria-label="Google natijasi ko‘rinishi">
              <span className="t-annotation !tracking-normal !normal-case text-ink-2">Google’da taxminan shunday ko‘rinadi</span>
              <span className="mt-1.5 truncate text-[12.5px] text-[#4d5156]">
                shohnoma.uz › {f.lang !== "uz" ? `${f.lang} › ` : ""}maqolalar › {f.slug || "…"}
              </span>
              <span className="line-clamp-2 text-[19px] leading-snug text-[#1a0dab]">{snippet(effTitle, 62)}</span>
              <span className="line-clamp-3 text-[13.5px] leading-snug text-[#4d5156]">{effDesc ? snippet(effDesc, 160) : "Tavsif yo‘q"}</span>
            </div>
          </Card>
        </aside>
      </div>

      {/* Mobil: amallar pastda doim ko‘rinadi */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-line bg-bg-base/95 px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">{actions}</div>
    </div>
  );
}
