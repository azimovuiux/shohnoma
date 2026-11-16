"use client";

import Link from "@/components/LocalLink";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown2, ArrowLeft, ArrowRight2, Card, CloseCircle, Edit, Eye, Grid2, Profile2User } from "@/components/icons";
import { Modal } from "@/components/ui";
import { InvitationScreen } from "@/components/mockups/InvitationScreen";
import { invitationTemplate } from "./InvitationThumb";
import { splitDate } from "@/lib/display";
import { useLpath, useT } from "@/lib/i18n";

type Item = { id: string; personA: string; personB: string | null; date: string; venueName: string; status: string; templateSlug: string };

const statusShort = (s: string) => (s === "active" || s === "paid" ? "Faol" : s === "archived" ? "Arxiv" : "Qoralama");

function Mini({ it }: { it: Item }) {
  const t = invitationTemplate(it.templateSlug, it);
  return (
    <span className="relative h-[60px] w-10 shrink-0 overflow-hidden rounded-lg bg-gold-soft" style={t ? { background: t.theme.bg[0] } : undefined}>
      {t && (
        <span className="absolute inset-x-0 top-0 h-[87px]">
          <InvitationScreen t={t} />
        </span>
      )}
    </span>
  );
}

const names = (it: Item) => [it.personA, it.personB].filter(Boolean).join(" & ");

/** Taklifnoma ichidagi panel (spec §5.11 (2)) — kabinet menyusi bu yerda ko‘rinmaydi */
export function InvitationNav({ current, others, responses, siteUrl, paid }: { current: Item; others: Item[]; responses: number; siteUrl: string; paid: boolean }) {
  const t = useT();
  const lp = useLpath();
  const title = (it: Item) => names(it) || t("Yangi taklifnoma");
  const path = usePathname();
  const base = `/kabinet/t/${current.id}`;
  const same = (a: string, b: string) => a.replace(/\/+$/, "") === lp(b).replace(/\/+$/, "");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const tabs = [
    { href: `${base}/`, label: "Umumiy", short: "Umumiy", icon: Grid2, n: null },
    { href: `${base}/mehmonlar/`, label: "Mehmonlar javobi", short: "Mehmonlar", icon: Profile2User, n: responses },
    { href: `${base}/tahrirlash/`, label: "Tahrirlash", short: "tab::Tahrirlash", icon: Edit, n: null },
    { href: `${base}/tolov/`, label: "To‘lov va chek", short: "To‘lov", icon: Card, n: null },
  ];
  const d = splitDate(current.date);
  const row = "flex w-full items-center gap-3 rounded-xl px-3 py-[11px] text-[13px] font-medium leading-none transition-colors";

  return (
    <>
      <aside className="hidden w-[264px] shrink-0 flex-col gap-1.5 self-start rounded-card bg-bg-soft px-4 py-5 lg:flex">
        <Link href="/kabinet/" className="flex items-center gap-2 pb-2.5 pl-1 t-nav text-ink-2 hover:text-maroon">
          <ArrowLeft size={16} /> {t("Barcha taklifnomalar")}
        </Link>
        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => others.length && setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="listbox"
            className="flex w-full items-center gap-3 rounded-2xl border border-line-dark/12 bg-bg-base py-2.5 pl-2.5 pr-3 text-left"
          >
            <Mini it={current} />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate font-serif text-[19px] font-medium leading-[1.2] text-ink">{title(current)}</span>
              <span className="flex items-center gap-1.5 text-[11px] leading-[1.5] text-ink-2">
                <span className={`size-1.5 rounded-full ${paid ? "bg-success" : "bg-pending"}`} />
                {t(statusShort(current.status))}
                {d ? ` · ${d.day}` : ""}
              </span>
            </span>
            {others.length > 0 && <ArrowDown2 size={16} className={`text-ink-2 transition-transform ${open ? "rotate-180" : ""}`} />}
          </button>
          {open && (
            <div role="listbox" className="absolute inset-x-0 top-[calc(100%+6px)] z-20 flex flex-col gap-1 rounded-2xl border border-line bg-bg-base p-1.5 shadow-menu">
              {others.map((o) => (
                <Link key={o.id} href={`/kabinet/t/${o.id}/`} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-bg-soft">
                  <Mini it={o} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-serif text-[17px] font-medium text-ink">{title(o)}</span>
                    <span className="text-[11px] text-ink-2">
                      {t(statusShort(o.status))}
                      {splitDate(o.date) ? ` · ${splitDate(o.date)!.day}` : ""}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
        <span className="h-2.5" />
        {tabs.map((tab) => {
          const active = same(path, tab.href);
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined} className={`${row} ${active ? "bg-bg-base text-maroon shadow-soft" : "text-ink hover:bg-bg-base/60"}`}>
              <Icon size={18} />
              <span className="flex-1">{t(tab.label)}</span>
              {tab.n !== null && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-normal leading-[1.5] ${active ? "bg-maroon/10 text-maroon" : "bg-bg-base text-ink-2"}`}>{tab.n}</span>
              )}
            </Link>
          );
        })}
        <span className="h-3.5" />
        {paid && (
          <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary w-full !py-3">
            <Eye size={16} /> {t("Saytni ochish")}
          </a>
        )}
      </aside>

      {/* Mobil: orqaga + taklifnomalar orasida almashish (pastki oyna) + ikonkali 4 bo‘lim */}
      <div className="flex flex-col gap-3 lg:hidden">
        <div className="flex items-center justify-between gap-2">
          <Link href="/kabinet/" className="-ml-1 flex min-h-11 items-center gap-2 px-1 t-nav text-ink-2">
            <ArrowLeft size={16} /> {t("Barcha taklifnomalar")}
          </Link>
          {others.length > 0 && <MobileSwitcher current={current} others={others} paid={paid} title={title} />}
        </div>
        <nav className="grid grid-cols-4 gap-0.5 rounded-[20px] bg-bg-soft p-1" aria-label={t("Taklifnoma")}>
          {tabs.map((tab) => {
            const active = same(path, tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-2 text-[12px] tracking-[-0.01em] max-[374px]:text-[11.5px] font-medium leading-[1.15] transition-colors ${active ? "bg-bg-base text-maroon shadow-soft" : "text-ink-2 active:bg-bg-base/60"}`}
              >
                <span className="relative">
                  <Icon size={21} variant={active ? "Bold" : "Linear"} />
                  {tab.n !== null && tab.n > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-maroon px-1 text-[10px] font-semibold leading-none text-ink-inverse">
                      {tab.n}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate">{t(tab.short)}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}

/** Mobil: joriy taklifnoma tugmasi → pastdan ro‘yxat (boshqa taklifnomaga o‘tish) */
function MobileSwitcher({ current, others, paid, title }: { current: Item; others: Item[]; paid: boolean; title: (it: Item) => string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-line bg-bg-base px-3.5 t-nav text-ink"
      >
        {t("Almashtirish")} <ArrowDown2 size={14} />
      </button>
      {mounted &&
        createPortal(
          <Modal open={open} onClose={close} label={t("Taklifnomani tanlang")} className="pb-[max(16px,env(safe-area-inset-bottom))]">
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden />
            <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-3">
              <p className="font-serif text-[26px] font-light leading-[1.1] text-ink">{t("Taklifnomani tanlang")}</p>
              <button type="button" onClick={close} className="icon-btn !h-11 !w-11 shrink-0" aria-label={t("Yopish")}>
                <CloseCircle size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-1 px-3 pb-2">
              {[current, ...others].map((o) => {
                const isCur = o.id === current.id;
                const d = splitDate(o.date);
                return (
                  <Link
                    key={o.id}
                    href={`/kabinet/t/${o.id}/`}
                    onClick={close}
                    aria-current={isCur ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-2xl p-2 ${isCur ? "bg-bg-soft" : "active:bg-bg-soft"}`}
                  >
                    <Mini it={o} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-serif text-[19px] font-medium leading-[1.2] text-ink">{title(o)}</span>
                      <span className="flex items-center gap-1.5 text-[12px] leading-[1.4] text-ink-2">
                        {isCur && <span className={`size-1.5 rounded-full ${paid ? "bg-success" : "bg-pending"}`} />}
                        {t(statusShort(o.status))}
                        {d ? ` · ${d.day}` : ""}
                        {isCur ? ` · ${t("hozir ochiq")}` : ""}
                      </span>
                    </span>
                    {!isCur && <ArrowRight2 size={16} className="shrink-0 text-ink-2" />}
                  </Link>
                );
              })}
            </div>
          </Modal>,
          document.body,
        )}
    </>
  );
}
