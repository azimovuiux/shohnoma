"use client";

import Link from "@/components/LocalLink";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowDown2, ArrowLeft, Edit, Eye, Grid2, Profile2User, Receipt2 } from "@/components/icons";
import { InvitationScreen } from "@/components/mockups/InvitationScreen";
import { invitationTemplate } from "./InvitationThumb";
import { splitDate } from "@/lib/display";
import { useLpath, useT } from "@/lib/i18n";

type Item = { id: string; personA: string; personB: string | null; date: string; venueName: string; status: string; templateSlug: string };

const statusShort = (s: string) => (s === "active" || s === "paid" ? "Faol" : s === "archived" ? "Arxiv" : "Qoralama");

function Mini({ it }: { it: Item }) {
  const t = invitationTemplate(it.templateSlug, it);
  return (
    <span className="relative h-[60px] w-10 shrink-0 overflow-hidden rounded-lg" style={{ background: t?.theme.bg[0] }}>
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
    { href: `${base}/tahrirlash/`, label: "Tahrirlash", short: "Tahrirlash", icon: Edit, n: null },
    { href: `${base}/tolov/`, label: "To‘lov va chek", short: "To‘lov", icon: Receipt2, n: null },
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

      {/* Mobil */}
      <div className="flex flex-col gap-4 lg:hidden">
        <Link href="/kabinet/" className="flex items-center gap-2 t-nav text-ink-2">
          <ArrowLeft size={16} /> {t("Barcha taklifnomalar")}
        </Link>
        <nav className="no-scrollbar -mx-5 flex overflow-x-auto border-b border-line px-5" aria-label={t("Taklifnoma")}>
          {tabs.map((tab) => {
            const active = same(path, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`-mb-px shrink-0 border-b-2 px-3 pb-3 pt-1 t-nav ${active ? "border-maroon text-maroon" : "border-transparent text-ink-2"}`}
              >
                {t(tab.short)}
                {tab.n !== null ? ` (${tab.n})` : ""}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
