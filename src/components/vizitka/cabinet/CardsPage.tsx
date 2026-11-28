"use client";

import { useEffect, useState } from "react";
import Link from "@/components/LocalLink";
import { PageLoading, useApi, useMe } from "@/lib/client";
import { useLocale, useT } from "@/lib/i18n";
import { Add, ArrowRight, Chart, Clock, Edit, Eye, Personalcard, Send2, Trash, UserAdd } from "@/components/icons";
import { StatusBadge, api, confirmDialog, useToast } from "@/components/ui";
import { useSiteUrl } from "@/components/cabinet/data";
import { CopyLink } from "@/components/cabinet/LinkActions";
import { cardDesign } from "@/lib/cards";
import { CARD_API, CARD_PAGES, loc, type CardOrder, type MeCardsResponse } from "@/lib/cardTypes";
import type { OrderStatus } from "@/lib/types";
import { cardPortrait, cardStatusView, isCardLive } from "../site/shared";

/** Mijoz o‘chira oladigan holatlar (to‘lanmagan, tekshiruvda emas) */
const DELETABLE: OrderStatus[] = ["draft", "pending_payment", "payment_failed", "p2p_rejected"];

/** Kartadagi kichik ko‘rinish: mijozning portreti yoki dizayn namunasi */
export function CardThumb({ c, className = "" }: { c: Pick<CardOrder, "design" | "photo" | "fullName">; className?: string }) {
  const d = cardDesign(c.design);
  return (
    <span className={`relative block aspect-[3/4] shrink-0 overflow-hidden rounded-[16px] ring-1 ring-line ${className}`} style={{ background: d?.palette[0] ?? "#1b1813" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={c.photo || cardPortrait(c.design)} alt="" className={`size-full object-cover ${c.photo ? "" : "opacity-60 grayscale"}`} />
      {d && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium leading-[1.4] text-white">{d.name}</span>}
    </span>
  );
}

function Counter({ icon: Icon, n, label }: { icon: typeof Eye; n: number; label: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-[10px] bg-bg-soft px-2.5 py-1.5">
      <Icon size={14} className="text-maroon" />
      <span className="t-title text-ink">{n}</span>
      <span className="text-[11px] text-ink-2">{label}</span>
    </span>
  );
}

/** /kabinet/vizitkalar/ — «Vizitkalarim»: to‘langan va to‘lanmagan vizitkalar */
export function CardsPage() {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const siteUrl = useSiteUrl();
  const { reload: reloadMe } = useMe();
  const { data, loading, error, reload } = useApi<MeCardsResponse>(CARD_API.me);
  const [busy, setBusy] = useState<string | null>(null);
  // Menyudagi son eskirib qolmasin
  useEffect(() => {
    if (data) void reloadMe();
  }, [data, reloadMe]);

  if (loading && !data) return <PageLoading />;
  if (error || !data)
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-line px-6 py-12 text-center">
        <p className="t-body-m text-ink-2">{error?.message ?? t("Ma’lumotni yuklab bo‘lmadi")}</p>
        <button type="button" onClick={() => reload()} className="btn btn-secondary btn-sm">
          {t("Qayta urinish")}
        </button>
      </div>
    );

  // Avval faollari, keyin qolganlari (yangisi tepada)
  const list = [...data.cards].sort((a, b) => Number(isCardLive(b.status)) - Number(isCardLive(a.status)) || b.createdAt.localeCompare(a.createdAt));

  const remove = async (c: CardOrder, title: string) => {
    if (!(await confirmDialog({ title: t("Vizitkani o‘chirasizmi?"), text: t("«{name}» vizitkasi butunlay o‘chiriladi. Kiritilgan ma’lumotlar qaytarilmaydi.", { name: title }), ok: t("O‘chirish"), danger: true }))) return;
    setBusy(c.id);
    try {
      await api(`/api/me/orders/${encodeURIComponent(c.id)}`, { method: "DELETE" });
      toast(t("Vizitka o‘chirildi"));
      await reload(true);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-[34px] font-light leading-[1.04] tracking-[-0.005em] text-ink lg:text-[44px]">{t("Vizitkalarim")}</h1>
          <p className="t-body-m text-ink-2">{t("{n} ta vizitka", { n: list.length })}</p>
        </div>
        <Link href={CARD_PAGES.catalog} className="btn btn-primary !py-[13px] !px-[22px]">
          <Add size={16} /> {t("Yangi vizitka")}
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-card border border-line px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-gold-soft text-maroon">
            <Personalcard size={24} />
          </span>
          <p className="font-serif text-[30px] font-light text-ink">{t("Hali vizitka yo‘q")}</p>
          <p className="t-body-m max-w-[440px] text-ink-2">{t("Raqamli vizitka — QR kodli shaxsiy sahifa: kontaktlar, ijtimoiy tarmoqlar va murojaat formasi bitta havolada.")}</p>
          <Link href={CARD_PAGES.catalog} className="btn btn-primary">
            {t("Dizaynni tanlash")} <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        list.map((c) => {
          const d = cardDesign(c.design);
          const live = isCardLive(c.status);
          const view = cardStatusView[c.status];
          const title = c.fullName || t("Yangi vizitka");
          const position = loc(c.position, locale);
          const url = `${siteUrl}${CARD_PAGES.public(c.slug)}`;
          return (
            <article key={c.id} className="flex flex-col gap-5 rounded-card border border-line bg-bg-base p-4 sm:flex-row sm:gap-6 sm:p-5">
              <div className="flex min-w-0 flex-1 gap-4">
                <CardThumb c={c} className="w-[72px] self-start sm:w-[112px]" />
                <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
                  <span className="max-w-full [&>span]:whitespace-normal">
                    <StatusBadge tone={view.tone} dot>
                      {t(view.label)}
                    </StatusBadge>
                  </span>
                  <h2 className="max-w-full break-words font-serif text-[24px] font-medium leading-[1.15] text-ink sm:text-[28px]">{title}</h2>
                  <p className="text-[13px] leading-[1.5] text-ink-2">{[position, d ? t("«{name}» dizayni", { name: d.name }) : null, c.code].filter(Boolean).join(" · ")}</p>
                  {live && (
                    <>
                      <CopyLink url={url} className="max-w-full" />
                      <div className="flex flex-wrap gap-2">
                        <Counter icon={Eye} n={c.views} label={t("ko‘rish")} />
                        <Counter icon={UserAdd} n={c.vcfDownloads} label={t("saqlangan")} />
                        <Counter icon={Send2} n={c.leadsTotal} label={c.leadsNew > 0 ? t("murojaat · {n} yangi", { n: c.leadsNew }) : t("murojaat")} />
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex w-full shrink-0 flex-col gap-2.5 sm:w-[240px]">
                {live ? (
                  <>
                    <Link href={CARD_PAGES.cabinetCard(c.id)} className="btn btn-primary w-full !py-[13px]">
                      <Chart size={16} /> {t("Boshqarish")}
                    </Link>
                    <a href={CARD_PAGES.public(c.slug)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary w-full !py-[13px]">
                      <Eye size={16} /> {t("Vizitkani ochish")}
                    </a>
                  </>
                ) : c.status === "p2p_review" || c.status === "payment_processing" ? (
                  <Link href={CARD_PAGES.cabinetCard(c.id)} className="btn btn-secondary w-full !py-[13px]">
                    <Clock size={16} /> {t("Holatni ko‘rish")}
                  </Link>
                ) : c.status === "archived" ? (
                  <Link href={CARD_PAGES.cabinetCard(c.id)} className="btn btn-secondary w-full !py-[13px]">
                    {t("Ko‘rish")}
                  </Link>
                ) : (
                  <>
                    <Link href={CARD_PAGES.order(c.id)} className="btn btn-primary w-full !py-[13px]">
                      {c.status === "draft" ? t("Davom ettirish") : t("To‘lovni davom ettirish")} <ArrowRight size={16} />
                    </Link>
                    <Link href={CARD_PAGES.cabinetCard(c.id)} className="btn btn-secondary w-full !py-[13px]">
                      <Edit size={16} /> {t("Batafsil")}
                    </Link>
                  </>
                )}
                {DELETABLE.includes(c.status) && (
                  <button
                    type="button"
                    disabled={busy === c.id}
                    onClick={() => remove(c, title)}
                    className="inline-flex items-center justify-center gap-1.5 self-center py-1 t-body-s text-ink-2 transition-colors hover:text-danger disabled:opacity-50"
                  >
                    <Trash size={15} /> {busy === c.id ? t("O‘chirilmoqda…") : t("O‘chirish")}
                  </button>
                )}
              </div>
            </article>
          );
        })
      )}
    </>
  );
}
