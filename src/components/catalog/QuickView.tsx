"use client";

import Link from "@/components/LocalLink";
import { useLocale, useT } from "@/lib/i18n";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CloseCircle, Eye, Messages, Mobile, Monitor, TickCircle } from "@/components/icons";
import type { Template } from "@/lib/templates";
import { ceremonyLabel, styleLabel, templateFeatures, tplCeremonies, type Ceremony } from "@/lib/templates";
import { categoryName, getCategory } from "@/lib/categories";
import { CategoryIcon } from "@/lib/categoryIcons";
import { discountPercent, formatPrice } from "@/lib/format";
import { LaptopFrame, PhoneFrame } from "@/components/mockups/Devices";
import { InvitationScreen } from "@/components/mockups/InvitationScreen";
import { InvitationDesktop } from "@/components/mockups/InvitationDesktop";
import { isDarkTheme } from "@/components/TemplateCard";
import { site } from "@/lib/site";

export function DeviceToggle({ value, onChange }: { value: "laptop" | "phone"; onChange: (v: "laptop" | "phone") => void }) {
  const tt = useT();
  return (
    <div className="inline-flex rounded-full bg-bg-soft p-1" role="tablist" aria-label={tt("Ko‘rinish")}>
      {(
        [
          ["laptop", "Laptop", <Monitor key="m" size={15} />],
          ["phone", "Telefon", <Mobile key="p" size={15} />],
        ] as const
      ).map(([k, label, icon]) => (
        <button
          key={k}
          role="tab"
          type="button"
          aria-selected={value === k}
          onClick={() => onChange(k)}
          className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 t-nav transition-colors ${
            value === k ? "bg-bg-base text-maroon shadow-soft" : "text-ink-2"
          }`}
        >
          {icon} {tt(label)}
        </button>
      ))}
    </div>
  );
}

export function TemplatePreviewStage({ t, device, large = false }: { t: Template; device: "laptop" | "phone"; large?: boolean }) {
  return device === "laptop" ? (
    <LaptopFrame className={large ? "w-full" : "w-full max-w-[620px]"}>
      <InvitationDesktop t={t} />
    </LaptopFrame>
  ) : (
    <PhoneFrame dark={isDarkTheme(t)} className={large ? "w-[300px]" : "w-[240px]"}>
      <InvitationScreen t={t} />
    </PhoneFrame>
  );
}

export function QuickView({
  t,
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: {
  t: Template;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const [device, setDevice] = useState<"laptop" | "phone">("laptop");
  const dialog = useRef<HTMLDivElement>(null);
  const off = discountPercent(t.priceOld, t.price);
  const tt = useT();
  const locale = useLocale();

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "Tab" && dialog.current) {
        const f = dialog.current.querySelectorAll<HTMLElement>("a[href],button:not([disabled])");
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus();
    };
  }, [onClose, onPrev, onNext]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 animate-[fade-in_.2s] lg:items-center lg:p-8" onClick={onClose}>
      <div
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={tt("{name} — tezkor ko‘rish", { name: t.name })}
        onClick={(e) => e.stopPropagation()}
        className="grid max-h-[92dvh] w-full max-w-[1180px] overflow-y-auto rounded-t-[24px] bg-bg-base outline-none animate-[sheet-up_.28s_ease-out] lg:grid-cols-[1.45fr_1fr] lg:rounded-[24px] lg:animate-none"
      >
        <div className="flex flex-col items-center gap-5 bg-bg-soft p-5 lg:p-8">
          <div className="flex w-full items-center justify-between">
            <DeviceToggle value={device} onChange={setDevice} />
            <div className="flex items-center gap-2 t-body-s text-ink-2">
              <button type="button" onClick={onPrev} disabled={index <= 0} className="icon-btn !size-9 bg-bg-base disabled:opacity-40" aria-label={tt("Oldingi")}>
                <ArrowLeft size={16} />
              </button>
              {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              <button type="button" onClick={onNext} disabled={index >= total - 1} className="icon-btn !size-9 bg-bg-base disabled:opacity-40" aria-label={tt("Keyingi")}>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
          <Link href={`/shablonlar/${t.slug}/?view=${device}`} className="flex flex-1 items-center justify-center py-4" aria-label={tt("Kattalashtirish")}>
            <TemplatePreviewStage t={t} device={device} />
          </Link>
        </div>

        <div className="relative flex flex-col gap-6 p-6 lg:p-9">
          <button type="button" onClick={onClose} aria-label={tt("Yopish")} className="absolute right-5 top-5 text-ink-2 hover:text-ink">
            <CloseCircle size={24} />
          </button>
          <div className="flex flex-col gap-2 pr-8">
            <h2 className="font-serif text-[38px] font-light leading-none text-ink">{t.name}</h2>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {tplCeremonies(t).map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 rounded-full bg-bg-soft px-2.5 py-1 t-body-s text-ink">
                  <span className="text-gold">
                    <CategoryIcon name={getCategory(c)?.icon} size={14} />
                  </span>
                  {categoryName(getCategory(c), locale) || tt(ceremonyLabel[c as Ceremony] ?? c)}
                </span>
              ))}
              <span className="rounded-full bg-bg-soft px-2.5 py-1 t-body-s text-ink">{tt(styleLabel[t.style])}</span>
              {off > 0 && <span className="rounded-full bg-maroon px-2.5 py-1 t-body-s text-ink-inverse">{tt("Aksiya")} −{off}%</span>}
            </div>
          </div>
          <p className="t-body-m text-ink-2">{(locale === "ru" && t.descriptionRu) || (locale === "en" && t.descriptionEn) || t.description}</p>

          <div className="flex flex-col gap-2.5">
            <p className="t-title text-ink">{tt("Saytda nimalar bor")}</p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
              {templateFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2 t-body-s text-ink">
                  <TickCircle size={15} color="var(--color-gold)" /> {tt(f)}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-baseline gap-3 border-t border-line pt-5">
            <span className="font-serif text-[30px] font-medium leading-none text-maroon">{formatPrice(t.price, true, locale)}</span>
            {off > 0 && <s className="t-body-m text-ink-2">{formatPrice(t.priceOld, false, locale)}</s>}
          </div>

          <div className="flex flex-col gap-2.5">
            <Link href={`/buyurtma/${t.slug}/marosim/`} className="btn btn-primary w-full">
              {tt("Shu shablonni tanlash")} <ArrowRight size={16} />
            </Link>
            <div className="flex gap-2.5">
              <Link href={`/namuna/${t.slug}/`} className="btn btn-secondary btn-sm flex-1">
                <Eye size={15} /> {tt("Jonli demo")}
              </Link>
              <a href={site.telegram} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm flex-1">
                <Messages size={15} /> {tt("Savol berish")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
