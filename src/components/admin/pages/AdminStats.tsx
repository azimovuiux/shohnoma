"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/lib/client";
import { AdminError, AdminLoading, AdminTitle, StatCard } from "../shared";

type Row = { name: string; visits: number; visitors: number };
type Stats = {
  ok: boolean;
  range: string;
  online: { count: number; list: { path: string; source: string; country: string | null; device: string | null; since: string; pages: number }[] };
  totals: { visitors: number; visits: number; pageviews: number; newVisits: number; avgSec: number; bounce: number; pagesPerVisit: number };
  prev: { visitors: number; visits: number; pageviews: number };
  series: { label: string; visitors: number; visits: number; pages: number }[];
  channels: Row[];
  sources: Row[];
  referrers: Row[];
  campaigns: Row[];
  countries: Row[];
  devices: Row[];
  browsers: Row[];
  os: Row[];
  entries: Row[];
  pages: { name: string; views: number; kind: "site" | "invite" }[];
  kinds: { site: number; invite: number };
};

const RANGES = [
  ["today", "Bugun"],
  ["7d", "7 kun"],
  ["30d", "30 kun"],
  ["90d", "90 kun"],
] as const;

const CHANNEL: Record<string, string> = {
  direct: "To‘g‘ridan-to‘g‘ri / messenjer",
  search: "Qidiruv tizimlari",
  social: "Ijtimoiy tarmoqlar",
  referral: "Boshqa saytlar",
  campaign: "UTM kampaniya",
  ads: "Reklama",
};
const DEVICE: Record<string, string> = { mobile: "Telefon", tablet: "Planshet", desktop: "Kompyuter" };

const COUNTRY: Record<string, string> = {
  UZ: "O‘zbekiston", RU: "Rossiya", KZ: "Qozog‘iston", KG: "Qirg‘iziston", TJ: "Tojikiston", TM: "Turkmaniston", TR: "Turkiya",
  AE: "BAA", KR: "Janubiy Koreya", US: "AQSh", DE: "Germaniya", GB: "Buyuk Britaniya", PL: "Polsha", UA: "Ukraina", AZ: "Ozarbayjon",
  GE: "Gruziya", CN: "Xitoy", JP: "Yaponiya", FR: "Fransiya", IT: "Italiya", ES: "Ispaniya", NL: "Niderlandiya", CA: "Kanada",
  SA: "Saudiya Arabistoni", IN: "Hindiston", LV: "Latviya", LT: "Litva", CZ: "Chexiya", FI: "Finlandiya", SE: "Shvetsiya", IL: "Isroil",
};
const flag = (cc: string) => (/^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "🌐");
const countryName = (cc: string | null) => (cc ? `${flag(cc)} ${COUNTRY[cc] ?? cc}` : "🌐 Aniqlanmagan");

const nf = (n: number) => n.toLocaleString("ru-RU").replace(/ /g, " ");
function duration(s: number) {
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return `${m} daq ${s % 60} s`;
}
function delta(cur: number, prev: number) {
  if (!prev) return cur ? "oldingi davrda ma’lumot yo‘q" : "—";
  const d = Math.round(((cur - prev) / prev) * 100);
  return `${d >= 0 ? "▲" : "▼"} ${Math.abs(d)}% oldingi davrga nisbatan`;
}
function ago(utc: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(utc.replace(" ", "T") + "Z").getTime()) / 1000));
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} daq`;
}
const MONTHS = ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"];
const dayLabel = (l: string) => (/^\d{4}-\d{2}-\d{2}$/.test(l) ? `${Number(l.slice(8))}-${MONTHS[Number(l.slice(5, 7)) - 1]}` : l);

/** Kunlik/soatlik tashrif buyuruvchilar — bitta qator, ustunli grafik, hover’da aniq son */
function SeriesChart({ data }: { data: Stats["series"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.visitors));
  const nice = (() => {
    const p = Math.pow(10, Math.floor(Math.log10(max)));
    const m = max / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
  })();
  const ticks = [0, nice / 2, nice];
  const step = Math.max(1, Math.ceil(data.length / 10));
  const h = hover !== null ? data[hover] : null;
  return (
    <div className="relative">
      <div className="flex h-[220px] gap-3">
        {/* o‘q */}
        <div className="flex w-8 flex-col-reverse justify-between pb-6 text-right t-body-s text-ink-2">
          {ticks.map((t) => (
            <span key={t} className="leading-none">{nf(t)}</span>
          ))}
        </div>
        <div className="relative flex-1">
          {/* to‘r chiziqlari */}
          <div className="pointer-events-none absolute inset-x-0 bottom-6 top-0 flex flex-col justify-between">
            {ticks.map((t) => (
              <span key={t} className="h-px bg-line" />
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-6 top-0 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
            {data.map((d, i) => (
              <div
                key={d.label}
                className="group relative flex h-full flex-1 cursor-default items-end justify-center"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                tabIndex={0}
                aria-label={`${dayLabel(d.label)}: ${d.visitors} tashrif buyuruvchi`}
              >
                <span
                  className={`w-full max-w-[28px] rounded-t-[4px] transition-colors ${hover === i ? "bg-maroon" : "bg-maroon/70"}`}
                  style={{ height: `${(d.visitors / nice) * 100}%`, minHeight: d.visitors ? 3 : 0 }}
                />
              </div>
            ))}
          </div>
          {/* sana yorliqlari */}
          <div className="absolute inset-x-0 bottom-0 flex gap-[2px]">
            {data.map((d, i) => (
              <span key={d.label} className="flex-1 truncate text-center text-[11px] leading-4 text-ink-2">
                {i % step === 0 ? dayLabel(d.label) : ""}
              </span>
            ))}
          </div>
          {h && hover !== null && (
            <div
              className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[10px] border border-line bg-bg-base px-3 py-2 shadow-soft"
              style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}
            >
              <p className="t-body-s font-semibold text-ink">{dayLabel(h.label)}</p>
              <p className="t-body-s text-ink-2">
                {nf(h.visitors)} kishi · {nf(h.visits)} tashrif · {nf(h.pages)} sahifa
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Reyting ro‘yxati: nom, gorizontal chiziq, son va ulush */
function RankList({ title, rows, label = (n: string) => n || "—", unit = "tashrif", empty = "Hali ma’lumot yo‘q", valueKey = "visits" }: {
  title: string;
  rows: { name: string; [k: string]: string | number }[];
  label?: (n: string) => string;
  unit?: string;
  empty?: string;
  valueKey?: string;
}) {
  const total = rows.reduce((s, r) => s + Number(r[valueKey] || 0), 0);
  const max = Math.max(1, ...rows.map((r) => Number(r[valueKey] || 0)));
  return (
    <section className="flex flex-col gap-3 rounded-panel border border-line bg-bg-base p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="t-title text-ink">{title}</h3>
        <span className="t-body-s text-ink-2">{unit}</span>
      </div>
      {rows.length === 0 ? (
        <p className="py-6 text-center t-body-s text-ink-2">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => {
            const v = Number(r[valueKey] || 0);
            return (
              <li key={r.name} className="group relative" title={`${label(r.name)}: ${nf(v)} ${unit} (${total ? Math.round((v / total) * 100) : 0}%)`}>
                <span className="absolute inset-y-0 left-0 rounded-[6px] bg-maroon/10 transition-colors group-hover:bg-maroon/20" style={{ width: `${(v / max) * 100}%` }} />
                <span className="relative flex items-center justify-between gap-3 px-2.5 py-1.5">
                  <span className="min-w-0 truncate t-body-s text-ink">{label(r.name)}</span>
                  <span className="shrink-0 t-body-s tabular-nums text-ink">
                    {nf(v)} <span className="text-ink-2">· {total ? Math.round((v / total) * 100) : 0}%</span>
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function AdminStats() {
  const [range, setRange] = useState<string>("7d");
  const { data, loading, error, reload } = useApi<Stats>(`/api/admin/stats?range=${range}`);
  // «Hozir onlayn» — har 15 soniyada jim yangilanadi
  useEffect(() => {
    const t = window.setInterval(() => reload(true), 15000);
    return () => window.clearInterval(t);
  }, [reload]);

  const tabs = (
    <div className="inline-flex rounded-full border border-line bg-bg-base p-1" role="tablist" aria-label="Davr">
      {RANGES.map(([k, l]) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={range === k}
          onClick={() => setRange(k)}
          className={`h-9 rounded-full px-4 text-[14px] font-medium transition-colors ${range === k ? "bg-maroon text-ink-inverse" : "text-ink hover:bg-bg-soft"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );

  if (loading && !data) return <AdminLoading />;
  if (!data) return <AdminError message={error?.message} onRetry={() => reload()} />;
  const t = data.totals;
  const onlinePages = Object.entries(
    data.online.list.reduce<Record<string, number>>((m, o) => ((m[o.path] = (m[o.path] ?? 0) + 1), m), {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <AdminTitle title="Statistika" sub="Saytga kirganlar, manbalar va davlatlar (Toshkent vaqti bilan)" right={tabs} />

      {/* Hozir onlayn */}
      <section className="mb-6 flex flex-col gap-4 rounded-panel border border-line bg-bg-soft p-5 lg:flex-row lg:items-start">
        <div className="flex shrink-0 items-center gap-4 lg:w-[240px]">
          <span className="relative flex size-3">
            {data.online.count > 0 && <span className="absolute inset-0 animate-ping rounded-full bg-success/50" />}
            <span className={`relative size-3 rounded-full ${data.online.count > 0 ? "bg-success" : "bg-ink-2/40"}`} />
          </span>
          <div className="flex flex-col">
            <span className="t-body-s text-ink-2">Hozir saytda</span>
            <span className="font-serif text-[40px] font-medium leading-none text-ink">{nf(data.online.count)}</span>
            <span className="t-body-s text-ink-2">kishi · 15 s da yangilanadi</span>
          </div>
        </div>
        {data.online.list.length > 0 ? (
          <div className="grid min-w-0 flex-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <ul className="flex flex-col gap-1.5">
              <li className="t-body-s font-semibold text-ink">Qaysi sahifada</li>
              {onlinePages.slice(0, 6).map(([p, n]) => (
                <li key={p} className="flex justify-between gap-3 t-body-s">
                  <span className="truncate text-ink">{p}</span>
                  <span className="shrink-0 tabular-nums text-ink-2">{n}</span>
                </li>
              ))}
            </ul>
            <ul className="flex flex-col gap-1.5">
              <li className="t-body-s font-semibold text-ink">So‘nggi faol mehmonlar</li>
              {data.online.list.slice(0, 6).map((o, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-x-3 t-body-s text-ink-2">
                  <span className="text-ink">
                    {countryName(o.country)} · {DEVICE[o.device ?? ""] ?? "—"}
                  </span>
                  <span>
                    {o.source} · {o.pages} sahifa · {ago(o.since)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="t-body-m text-ink-2 lg:self-center">Hozir saytda hech kim yo‘q.</p>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tashrif buyuruvchilar" value={nf(t.visitors)} hint={delta(t.visitors, data.prev.visitors)} />
        <StatCard label="Tashriflar (sessiyalar)" value={nf(t.visits)} hint={`${nf(t.newVisits)} tasi birinchi marta`} />
        <StatCard label="Sahifa ko‘rishlar" value={nf(t.pageviews)} hint={`${t.pagesPerVisit} sahifa / tashrif`} />
        <StatCard label="O‘rtacha vaqt" value={duration(t.avgSec)} hint={`${t.bounce}% bitta sahifada chiqib ketgan`} />
      </div>

      <section className="mt-6 rounded-panel border border-line bg-bg-base p-5">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="t-title text-ink">Tashrif buyuruvchilar — {range === "today" ? "soatlar bo‘yicha" : "kunlar bo‘yicha"}</h3>
          <span className="t-body-s text-ink-2">
            Sayt: {nf(data.kinds.site)} · Taklifnomalar (mehmonlar): {nf(data.kinds.invite)} sahifa ko‘rish
          </span>
        </div>
        <SeriesChart data={data.series} />
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <RankList title="Qayerdan keldi" rows={data.channels} label={(n) => CHANNEL[n] ?? n} />
        <RankList title="Manba (resurs)" rows={data.sources} />
        <RankList title="Davlatlar" rows={data.countries} label={(n) => countryName(n || null)} />
        <RankList title="Havola bergan saytlar" rows={data.referrers} empty="Tashqi saytdan o‘tish yo‘q" />
        <RankList title="UTM kampaniyalar" rows={data.campaigns} empty="utm_campaign belgili havola orqali kirish yo‘q" />
        <RankList title="Qurilmalar" rows={data.devices} label={(n) => DEVICE[n] ?? n} />
        <RankList title="Brauzerlar" rows={data.browsers} />
        <RankList title="Operatsion tizim" rows={data.os} />
        <RankList title="Kirish sahifalari" rows={data.entries} />
      </div>
      <div className="mt-4">
        <RankList
          title="Eng ko‘p ochilgan sahifalar"
          rows={data.pages.map((p) => ({ name: p.name, views: p.views }))}
          label={(n) => (data.pages.find((p) => p.name === n)?.kind === "invite" ? `${n} — taklifnoma` : n)}
          valueKey="views"
          unit="ko‘rish"
        />
      </div>
      <p className="mt-6 t-body-s text-ink-2">
        Telegram va WhatsApp ichidan ochilgan havolalar ko‘pincha «To‘g‘ridan-to‘g‘ri» bo‘lib ko‘rinadi (messenjerlar manbani yubormaydi). Aniq kuzatish uchun
        reklama havolalariga <code className="rounded bg-bg-soft px-1">?utm_source=instagram&amp;utm_campaign=kuz</code> kabi belgi qo‘shing.
      </p>
    </>
  );
}
