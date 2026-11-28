"use client";

import { useEffect, useState } from "react";
import Link from "@/components/LocalLink";
import { PageLoading, useApi, useRouteParam } from "@/lib/client";
import { useLocale, useT } from "@/lib/i18n";
import { ArrowLeft, ArrowRight, Clock, Copy, DocumentDownload, Edit, ExportSquare, Eye, Link2, Scan, Send2, Share, UserAdd } from "@/components/icons";
import { StatusBadge, api, useCopy, useToast } from "@/components/ui";
import { useSiteUrl } from "@/components/cabinet/data";
import { downloadQr, qrDataUrl } from "@/lib/qr";
import { cardDesign } from "@/lib/cards";
import { CARD_API, CARD_PAGES, loc, type CardGetResponse, type CardLead, type CardLeadStatus, type CardLeadsResponse } from "@/lib/cardTypes";
import { cardStatusView, isCardLive } from "../site/shared";
import { CardThumb } from "./CardsPage";

const box = "flex flex-col gap-4 rounded-card border border-line bg-bg-base p-4 sm:p-5";

function BoxTitle({ icon: Icon, title, sub }: { icon: typeof Eye; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-maroon">
        <Icon size={18} />
      </span>
      <div className="flex min-w-0 flex-col">
        <h2 className="text-[15px] font-semibold leading-[1.35] text-ink">{title}</h2>
        {sub && <p className="t-body-s text-ink-2">{sub}</p>}
      </div>
    </div>
  );
}

/** Toshkent vaqti: 28.11.2026 14:05 */
function tkTime(iso: string) {
  const ms = new Date(iso).getTime();
  if (isNaN(ms)) return "";
  const s = new Date(ms + 5 * 3600_000).toISOString();
  return `${s.slice(8, 10)}.${s.slice(5, 7)}.${s.slice(0, 4)} ${s.slice(11, 16)}`;
}

/** Murojaat kontakti → bosiladigan havola (telefon, email yoki Telegram) */
export function contactHref(v: string): string | null {
  const s = v.trim();
  if (/^\S+@\S+\.\S+$/.test(s)) return `mailto:${s}`;
  if (/^@[A-Za-z0-9_]{4,}$/.test(s)) return `https://t.me/${s.slice(1)}`;
  const digits = s.replace(/[^\d+]/g, "");
  if (digits.replace(/\D/g, "").length >= 7) return `tel:${digits}`;
  return null;
}

const LEAD_STATUS: [CardLeadStatus, string, "pending" | "muted" | "success"][] = [
  ["new", "murojaat::Yangi", "pending"],
  ["seen", "Ko‘rildi", "muted"],
  ["done", "Bog‘lanildi", "success"],
];

export function LeadItem({ lead, onStatus, busy }: { lead: CardLead; onStatus?: (s: CardLeadStatus) => void; busy?: boolean }) {
  const t = useT();
  const href = contactHref(lead.contact);
  const st = LEAD_STATUS.find((x) => x[0] === lead.status) ?? LEAD_STATUS[0];
  return (
    <li className={`flex flex-col gap-2.5 rounded-[16px] border p-4 ${lead.status === "new" ? "border-gold/40 bg-gold-soft/30" : "border-line"}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="break-words t-title text-ink">{lead.name}</span>
          {lead.company && <span className="break-words t-body-s text-ink-2">{lead.company}</span>}
        </div>
        <StatusBadge tone={st[2]}>{t(st[1])}</StatusBadge>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 t-body-s text-ink-2">
        {href ? (
          <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="break-all font-medium text-maroon hover:underline">
            {lead.contact}
          </a>
        ) : (
          <span className="break-all font-medium text-ink">{lead.contact}</span>
        )}
        {lead.purpose && <span className="rounded-full bg-bg-soft px-2 py-0.5 text-ink">{lead.purpose}</span>}
        <span>{tkTime(lead.createdAt)}</span>
      </div>
      {lead.message && <p className="whitespace-pre-line break-words t-body-m text-ink">{lead.message}</p>}
      {onStatus && (
        <div className="flex flex-wrap gap-1.5">
          {LEAD_STATUS.filter((x) => x[0] !== lead.status).map(([s, label]) => (
            <button key={s} type="button" disabled={busy} onClick={() => onStatus(s)} className="rounded-full border border-line px-3 py-1.5 t-body-s text-ink transition-colors hover:border-maroon hover:text-maroon disabled:opacity-50">
              {t(label)}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

function QrBox({ url, name }: { url: string; name: string }) {
  const t = useT();
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void qrDataUrl(url, 640).then((u) => alive && setSrc(u));
    return () => {
      alive = false;
    };
  }, [url]);
  return (
    <section className={box}>
      <BoxTitle icon={Scan} title={t("QR kod")} sub={t("Qog‘oz vizitka, stol tablichkasi yoki slayd uchun")} />
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <span className="block size-[168px] shrink-0 overflow-hidden rounded-[14px] border border-line bg-white p-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {src && <img src={src} alt={t("QR kod")} className="size-full" />}
        </span>
        <div className="flex w-full flex-col gap-2.5 sm:w-auto">
          <button type="button" onClick={() => downloadQr(url, "png", `${name}-qr`)} className="btn btn-primary w-full !py-3 sm:w-[200px]">
            <DocumentDownload size={16} /> {t("PNG yuklab olish")}
          </button>
          <button type="button" onClick={() => downloadQr(url, "svg", `${name}-qr`)} className="btn btn-secondary w-full !py-3 sm:w-[200px]">
            <DocumentDownload size={16} /> {t("SVG (chop etish uchun)")}
          </button>
        </div>
      </div>
    </section>
  );
}

function SlugBox({ id, slug, host, onSaved }: { id: string; slug: string; host: string; onSaved: () => void }) {
  const t = useT();
  const toast = useToast();
  const [value, setValue] = useState(slug);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setValue(slug), [slug]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(CARD_API.card(id), { method: "PATCH", json: { slug: value.trim().toLowerCase() } });
      toast(t("Havola saqlandi"));
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={save} className={box}>
      <BoxTitle icon={Link2} title={t("Havola manzili")} sub={t("O‘zgartirsangiz, eski havola va QR kod ishlamay qoladi")} />
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <label className="flex h-12 min-w-0 flex-1 items-center rounded-input border border-line bg-bg-base pl-4 focus-within:border-maroon/55">
          <span className="shrink-0 t-body-m text-ink-2">{host}/v/</span>
          <input value={value} onChange={(e) => setValue(e.target.value.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 80))} aria-label={t("Havola manzili")} className="h-full min-w-0 flex-1 bg-transparent pr-3 t-body-m text-ink outline-none" />
        </label>
        <button type="submit" disabled={busy || !value.trim() || value === slug} className="btn btn-secondary !py-3 disabled:opacity-50">
          {busy ? t("Saqlanmoqda…") : t("Saqlash")}
        </button>
      </div>
      {error && <p className="t-body-s text-danger">{error}</p>}
    </form>
  );
}

/** /kabinet/v/<id>/ — vizitkani boshqarish: havola, QR, .vcf, sanoqlar, murojaatlar */
export function CardManagePage() {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const copy = useCopy();
  const siteUrl = useSiteUrl();
  const { value: id, ready } = useRouteParam("v");
  const { data, error, reload } = useApi<CardGetResponse>(id ? CARD_API.card(id) : null);
  const live = !!data && isCardLive(data.order.status);
  const leads = useApi<CardLeadsResponse>(id && live ? CARD_API.leads(id) : null);
  const [leadBusy, setLeadBusy] = useState<string | null>(null);

  if (!ready || (id && !data && !error)) return <PageLoading />;
  if (!id || error || !data)
    return (
      <div className="flex flex-col items-center gap-4 rounded-card border border-line px-6 py-14 text-center">
        <p className="font-serif text-[30px] font-light text-ink">{t("Vizitka topilmadi")}</p>
        <p className="t-body-m text-ink-2">{error?.message}</p>
        <Link href={CARD_PAGES.cabinetList} className="btn btn-primary">
          {t("Vizitkalarim")}
        </Link>
      </div>
    );

  const { order, card } = data;
  const d = cardDesign(card.design);
  const view = cardStatusView[order.status];
  const url = `${siteUrl}${CARD_PAGES.public(card.slug)}`;
  const host = siteUrl.replace(/^https?:\/\//, "");
  const position = loc(card.position, locale);
  const fileName = card.slug || "vizitka";
  const list = leads.data?.leads ?? [];

  const setLead = async (lead: CardLead, status: CardLeadStatus) => {
    setLeadBusy(lead.id);
    try {
      await api(CARD_API.lead(order.id, lead.id), { method: "PATCH", json: { status } });
      await Promise.all([leads.reload(true), reload(true)]);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLeadBusy(null);
    }
  };

  const share = async () => {
    const title = [card.fullName, position].filter(Boolean).join(" — ");
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        return;
      }
    }
    void copy(url, t("Havola nusxalandi"));
  };

  return (
    <>
      <Link href={CARD_PAGES.cabinetList} className="inline-flex w-fit items-center gap-2 t-nav text-ink-2 hover:text-maroon">
        <ArrowLeft size={16} /> {t("Vizitkalarim")}
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <CardThumb c={{ design: card.design, photo: card.photos[0] ?? null, fullName: card.fullName }} className="w-[76px] self-start sm:w-[92px]" />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
          <span className="max-w-full [&>span]:whitespace-normal">
            <StatusBadge tone={view.tone} dot>
              {t(view.label)}
            </StatusBadge>
          </span>
          <h1 className="max-w-full break-words font-serif text-[32px] font-light leading-[1.05] text-ink lg:text-[42px]">{card.fullName || t("Yangi vizitka")}</h1>
          <p className="t-body-m text-ink-2">{[position, d ? t("«{name}» dizayni", { name: d.name }) : null, order.code].filter(Boolean).join(" · ")}</p>
        </div>
        <Link href={`${CARD_PAGES.order(order.id)}malumot/?qaytish=kabinet`} className="btn btn-secondary shrink-0 !py-3">
          <Edit size={16} /> {t("Tahrirlash")}
        </Link>
      </header>

      {!live ? (
        <section className={`${box} items-start`}>
          <BoxTitle
            icon={Clock}
            title={order.status === "p2p_review" || order.status === "payment_processing" ? t("To‘lov tekshirilmoqda") : t("Vizitka hali faol emas")}
            sub={order.status === "archived" ? undefined : t("To‘lovdan so‘ng havola, QR kod va statistika shu yerda chiqadi.")}
          />
          {order.status !== "archived" && order.status !== "p2p_review" && order.status !== "payment_processing" && (
            <Link href={CARD_PAGES.order(order.id)} className="btn btn-primary">
              {order.status === "draft" ? t("Davom ettirish") : t("To‘lovni davom ettirish")} <ArrowRight size={16} />
            </Link>
          )}
        </section>
      ) : (
        <>
          <section className={box}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <BoxTitle icon={Link2} title={t("Vizitka havolasi")} />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => copy(url, t("Havola nusxalandi"))} className="btn btn-secondary btn-sm">
                  <Copy size={15} /> {t("Nusxalash")}
                </button>
                <button type="button" onClick={share} className="btn btn-secondary btn-sm">
                  <Share size={15} /> {t("Ulashish")}
                </button>
                <a href={CARD_PAGES.public(card.slug)} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                  <ExportSquare size={15} /> {t("Ochish")}
                </a>
              </div>
            </div>
            <p className="break-all rounded-[12px] bg-bg-soft px-4 py-3 t-body-m font-medium text-maroon">{url.replace(/^https?:\/\//, "")}</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                [Eye, card.views, "ko‘rish"],
                [UserAdd, card.vcfDownloads, "kontakt saqlandi"],
                [Send2, card.leadsTotal, "murojaat"],
              ].map(([Icon, n, label]) => {
                const I = Icon as typeof Eye;
                return (
                  <div key={label as string} className="flex min-w-0 flex-col gap-1 rounded-[14px] bg-bg-soft p-3">
                    <I size={16} className="text-maroon" />
                    <span className="font-serif text-[26px] font-medium leading-none text-ink">{n as number}</span>
                    <span className="text-[11px] leading-[1.3] text-ink-2">{t(label as string)}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-2">
            <QrBox url={url} name={fileName} />
            <section className={box}>
              <BoxTitle icon={UserAdd} title={t("Kontakt fayli (.vcf)")} sub={t("Vizitkadagi «Kontaktni saqlash» tugmasi shu faylni beradi")} />
              <p className="t-body-m text-ink-2">{t("Faylni telefoningizda ochib tekshiring: ism, lavozim, telefon, email va surat kontaktlarga to‘g‘ri tushishi kerak.")}</p>
              <a href={CARD_API.vcard(card.slug)} className="btn btn-secondary w-full !py-3 sm:w-fit" download>
                <DocumentDownload size={16} /> {t(".vcf faylni yuklab olish")}
              </a>
            </section>
          </div>

          <SlugBox id={order.id} slug={card.slug} host={host} onSaved={() => reload(true)} />

          <section className={box}>
            <BoxTitle icon={Send2} title={t("Murojaatlar")} sub={card.leadsNew > 0 ? t("{n} ta yangi", { n: card.leadsNew }) : t("Vizitkadagi forma orqali kelgan xabarlar")} />
            {leads.loading && !leads.data ? (
              <PageLoading className="!min-h-[120px]" />
            ) : list.length === 0 ? (
              <p className="rounded-[14px] border border-dashed border-line px-4 py-8 text-center t-body-m text-ink-2">
                {d && !d.sections.includes("leadForm") ? t("Bu dizaynda murojaat formasi yo‘q.") : !card.leadForm ? t("Murojaat formasi o‘chirilgan — uni «Tahrirlash» bo‘limida yoqishingiz mumkin.") : t("Hali murojaat yo‘q. Kimdir vizitkangizdagi formani to‘ldirsa — shu yerda ko‘rinadi.")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {list.map((l) => (
                  <LeadItem key={l.id} lead={l} busy={leadBusy === l.id} onStatus={(s) => setLead(l, s)} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
