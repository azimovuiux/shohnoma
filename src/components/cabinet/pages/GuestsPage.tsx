"use client";

import Link from "@/components/LocalLink";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDown, ArrowLeft2, ArrowRight2, CloseCircle, Clock, Eye, TickCircle } from "@/components/icons";
import { StatusBadge } from "@/components/ui";
import { PageLoading, useApi } from "@/lib/client";
import type { Guest, RsvpStatus, Stats } from "@/lib/types";
import { initials, rsvpView } from "@/lib/display";
import { useLocale, useT } from "@/lib/i18n";
import { GuestSearch } from "../GuestSearch";
import { relTime, useInvitationData } from "../data";

type Resp = { ok: boolean; total: number; list: Guest[]; stats: Stats; views: number; wishes: Guest[] };

const PER = 8;
const statuses: RsvpStatus[] = ["coming", "maybe", "not_coming"];
const chipLabel = { coming: "Boraman", maybe: "Aniq emas", not_coming: "Kela olmaydi" } as const;

type SP = { status?: string; q?: string; page?: string; ko?: string };

/** CSV (server o‘zbekcha beradi) — ruscha sarlavha va javob nomlari bilan qayta yozish */
const CSV_RU: Record<string, string> = { Mehmon: "Гость", Kishi: "Кол-во", Javob: "Ответ", Tilak: "Пожелание", Vaqt: "Время" };
const CSV_STATUS_RU: Record<string, string> = { Boraman: "Приду", "Hali aniq emas": "Пока не знаю", "Kela olmayman": "Не смогу прийти" };
function csvToRu(text: string) {
  // Excel UTF-8 ni to‘g‘ri o‘qishi uchun BOM (res.text() uni olib tashlaydi)
  const src = text.replace(/^\uFEFF/, "");
  let out = "\uFEFF";
  let field = "";
  let quoted = false;
  let col = 0;
  let row = 0;
  const flush = () => {
    const plain = !field.startsWith('"');
    if (plain && row === 0 && CSV_RU[field]) field = CSV_RU[field];
    else if (plain && row > 0 && col === 2 && CSV_STATUS_RU[field]) field = CSV_STATUS_RU[field];
    out += field;
    field = "";
  };
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      field += c;
      if (c === '"') {
        if (src[i + 1] === '"') field += src[++i];
        else quoted = false;
      }
    } else if (c === '"') {
      field += c;
      quoted = true;
    } else if (c === ";") {
      flush();
      out += c;
      col++;
    } else if (c === "\r" || c === "\n") {
      flush();
      out += c;
      if (c === "\n" || src[i + 1] !== "\n") {
        row++;
        col = 0;
      }
    } else field += c;
  }
  flush();
  return out;
}

async function downloadCsvRu(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error();
  const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? filename;
  const blob = new Blob([csvToRu(await res.text())], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name.replace(/^mehmonlar-/, "gosti-");
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function GuestsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <GuestsInner />
    </Suspense>
  );
}

function GuestsInner() {
  const t = useT();
  const locale = useLocale();
  const params = useSearchParams();
  const sp: SP = { status: params.get("status") ?? undefined, q: params.get("q") ?? undefined, page: params.get("page") ?? undefined, ko: params.get("ko") ?? undefined };
  const { data: bundle } = useInvitationData();
  const inv = bundle.invitation;

  const status = statuses.includes(sp.status as RsvpStatus) ? (sp.status as RsvpStatus) : undefined;
  const q = (sp.q ?? "").trim().slice(0, 60) || undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const ko = Math.min(200, Math.max(PER, Number(sp.ko) || PER));

  const qs = (pg: number, per: number) => {
    const n = new URLSearchParams({ page: String(pg), per: String(per) });
    if (status) n.set("status", status);
    if (q) n.set("q", q);
    return `/api/invitations/${encodeURIComponent(inv.id)}/responses?${n}`;
  };
  const deskApi = useApi<Resp>(qs(page, PER));
  const mobApi = useApi<Resp>(qs(1, ko));
  const desk = deskApi.data ?? { total: 0, list: [] as Guest[], stats: bundle.stats, views: inv.views, wishes: [] as Guest[] };
  const mob = mobApi.data ?? { total: 0, list: [] as Guest[] };
  const stats = desk.stats ?? bundle.stats;
  const wishes = desk.wishes ?? [];
  const views = desk.views ?? inv.views;
  const pages = Math.max(1, Math.ceil(desk.total / PER));

  const href = (patch: Partial<SP>) => {
    const n = new URLSearchParams();
    const merged = { status, q, page: String(page), ...patch };
    Object.entries(merged).forEach(([k, v]) => v && !(k === "page" && v === "1") && n.set(k, String(v)));
    return `?${n}`;
  };

  const cards = [
    { icon: <Eye size={16} />, label: t("Taklifnomani ochdi"), value: String(views), color: "text-gold" },
    { icon: <TickCircle size={16} />, label: t("Boraman"), value: t("{n} kishi", { n: stats.coming }), color: "text-success" },
    { icon: <Clock size={16} />, label: t("Aniq emas"), value: String(stats.maybe), color: "text-gold" },
    { icon: <CloseCircle size={16} />, label: t("Kela olmaydi"), value: String(stats.notComing), color: "text-muted" },
  ];
  const chips: { key?: RsvpStatus; label: string; n: number }[] = [
    { label: t("Barchasi"), n: stats.total },
    ...statuses.map((s) => ({ key: s, label: t(chipLabel[s]), n: s === "coming" ? stats.coming : s === "maybe" ? stats.maybe : stats.notComing })),
  ];
  const statusText = (s: RsvpStatus) => t(s === "maybe" ? "Hali aniq emas" : rsvpView[s].label);
  const from = desk.total ? (page - 1) * PER + 1 : 0;
  const to = Math.min(desk.total, page * PER);

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-[34px] font-light leading-[1.04] tracking-[-0.005em] text-ink lg:text-[44px]">{t("Mehmonlar javobi")}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((s) => (
          <div key={s.label} className="flex flex-col gap-2.5 rounded-card bg-bg-soft p-4 lg:p-5">
            <span className="flex items-center gap-2 t-body-s text-ink-2">
              <span className={s.color}>{s.icon}</span> {s.label}
            </span>
            <span className="font-serif text-[26px] font-medium leading-[1.2] text-ink lg:text-[30px]">{s.value}</span>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-4 rounded-card border border-line bg-bg-base p-4 lg:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
            {chips.map((c) => {
              const active = c.key === status;
              return (
                <Link
                  key={c.label}
                  href={href({ status: c.key, page: "1", ko: undefined })}
                  scroll={false}
                  aria-current={active ? "true" : undefined}
                  className={`inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-full px-4 t-nav transition-colors ${active ? "bg-maroon text-ink-inverse" : "bg-bg-soft text-ink hover:bg-gold-soft"}`}
                >
                  {c.label} <span className="text-[12px] opacity-70">{c.n}</span>
                </Link>
              );
            })}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Suspense>
              <GuestSearch />
            </Suspense>
            <a
              href={`/api/invitations/${inv.id}/guests`}
              onClick={
                locale === "ru"
                  ? (e) => {
                      e.preventDefault();
                      const url = e.currentTarget.href;
                      downloadCsvRu(url, `gosti-${inv.slug}.csv`).catch(() => (window.location.href = url));
                    }
                  : undefined
              }
              className="btn btn-secondary btn-sm shrink-0 !py-3"
            >
              <ArrowDown size={16} /> {t("Ro‘yxatni yuklab olish")}
            </a>
          </div>
        </div>

        {deskApi.loading && !deskApi.data ? (
          <p className="border-t border-line py-8 text-center t-body-m text-ink-2">{t("Yuklanmoqda…")}</p>
        ) : desk.total === 0 ? (
          <p className="border-t border-line py-8 text-center t-body-m text-ink-2">{q || status ? t("Hech narsa topilmadi") : t("Hali javoblar yo‘q")}</p>
        ) : (
          <>
            {/* Desktop jadval */}
            <div className="hidden lg:block">
              <table className="w-full table-fixed text-left">
                <thead>
                  <tr className="border-y border-line t-annotation text-ink-2">
                    <th className="w-[26%] py-3 font-medium">{t("Mehmon")}</th>
                    <th className="w-[9%] py-3 font-medium">{t("Kishi")}</th>
                    <th className="w-[19%] py-3 font-medium">{t("Javob")}</th>
                    <th className="py-3 font-medium">{t("Tilak")}</th>
                    <th className="w-[13%] py-3 text-right font-medium">{t("Vaqt")}</th>
                  </tr>
                </thead>
                <tbody>
                  {desk.list.map((g) => (
                    <tr key={g.id} className="border-b border-line align-middle">
                      <td className="py-3">
                        <span className="flex items-center gap-3">
                          <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-gold-soft text-[12px] font-semibold text-maroon">{initials(g.name)}</span>
                          <span className="truncate text-[13px] font-semibold text-ink">{g.name}</span>
                        </span>
                      </td>
                      <td className="py-3 t-body-m text-ink">{g.status === "not_coming" ? "—" : g.count}</td>
                      <td className="py-3">
                        <StatusBadge tone={rsvpView[g.status].tone}>{statusText(g.status)}</StatusBadge>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="line-clamp-2 font-serif text-[16px] italic leading-[1.35] text-ink">{g.wish || <span className="not-italic text-ink-2">—</span>}</span>
                      </td>
                      <td className="py-3 text-right t-body-s text-ink-2">{relTime(locale, g.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between pt-4">
                <span className="t-body-s text-ink-2">
                  {t("{total} ta javobdan {from}–{to} ko‘rsatilmoqda", { total: desk.total, from, to })}
                </span>
                {pages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <Link aria-label={t("Oldingi")} aria-disabled={page <= 1} href={href({ page: String(page - 1) })} scroll={false} className={`icon-btn !size-9 ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}>
                      <ArrowLeft2 size={15} />
                    </Link>
                    {Array.from({ length: pages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1)
                      .map((p, i, arr) => (
                        <span key={p} className="flex items-center gap-1.5">
                          {i > 0 && p - arr[i - 1] > 1 && <span className="t-body-s text-ink-2">…</span>}
                          <Link
                            href={href({ page: String(p) })}
                            scroll={false}
                            aria-current={p === page ? "page" : undefined}
                            className={`flex size-9 items-center justify-center rounded-full t-nav ${p === page ? "bg-maroon text-ink-inverse" : "text-ink hover:bg-bg-soft"}`}
                          >
                            {p}
                          </Link>
                        </span>
                      ))}
                    <Link aria-label={t("Keyingi")} aria-disabled={page >= pages} href={href({ page: String(page + 1) })} scroll={false} className={`icon-btn !size-9 ${page >= pages ? "pointer-events-none opacity-40" : ""}`}>
                      <ArrowRight2 size={15} />
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Mobil kartalar */}
            <div className="flex flex-col gap-2.5 lg:hidden">
              {mob.list.map((g) => (
                <div key={g.id} className="flex flex-col gap-2.5 rounded-2xl bg-bg-soft p-3.5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-bg-base text-[12px] font-semibold text-maroon">{initials(g.name)}</span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[13px] font-semibold text-ink">{g.name}</span>
                      <span className="text-[11px] text-ink-2">{relTime(locale, g.createdAt)}</span>
                    </span>
                    <StatusBadge tone={rsvpView[g.status].tone}>{g.status === "coming" ? t("{n} kishi", { n: g.count }) : statusText(g.status)}</StatusBadge>
                  </div>
                  {g.wish && <p className="font-serif text-[16px] italic leading-[1.35] text-ink">“{g.wish}”</p>}
                </div>
              ))}
              {mob.total > mob.list.length && (
                <Link href={href({ ko: String(ko + PER), page: undefined })} scroll={false} className="btn btn-secondary w-full">
                  {t("Yana ko‘rsatish")} ({mob.total - mob.list.length})
                </Link>
              )}
            </div>
          </>
        )}
      </section>

      {wishes.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-serif text-[30px] font-light leading-[1.1] text-ink">
            {locale === "ru" ? (
              <>
                Пожелания <em className="italic text-maroon">гостей</em>
              </>
            ) : (
              <>
                Mehmonlar <em className="italic text-maroon">tilaklari</em>
              </>
            )}
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            {wishes.map((w) => (
              <figure key={w.id} className="flex flex-col gap-3 rounded-card bg-bg-soft p-5">
                <span className="font-serif text-[56px] leading-[0.6] text-gold" aria-hidden>
                  “
                </span>
                <blockquote className="font-serif text-[18px] italic leading-[1.4] text-ink">{w.wish}</blockquote>
                <figcaption className="t-body-s text-ink-2">— {w.name}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
