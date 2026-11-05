"use client";

import type { ReactNode } from "react";
import { Eye } from "@/components/icons";
import { TelegramIcon } from "@/components/TelegramIcon";
import { PhoneFrame } from "@/components/mockups/Devices";
import { InvitationScreen } from "@/components/mockups/InvitationScreen";
import { isDarkTheme } from "@/components/TemplateCard";
import { ceremonyLabel, styleLabel, type Template } from "@/lib/templates";
import { formatPrice } from "@/lib/format";
import { site } from "@/lib/site";

export type SummaryRow = [label: string, value: ReactNode];

/** Buyurtma xulosasi — desktop o‘ng panel (spec §5.10) */
export function OrderSummary({
  template,
  live,
  rows,
  amount,
  action,
  extra,
}: {
  /** Jonli ko‘rinish uchun (liveTemplate bilan) */
  template: Template;
  live: Template;
  rows: SummaryRow[];
  amount: number;
  action: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 rounded-[24px] bg-bg-soft p-6">
      <div className="flex items-center gap-[18px]">
        <PhoneFrame dark={isDarkTheme(template)} className="w-[112px] shrink-0">
          <InvitationScreen t={live} />
        </PhoneFrame>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="t-body-s text-ink-2">Tanlangan shablon</span>
          <span className="font-serif text-[26px] font-medium leading-[1.2] text-ink">{template.name}</span>
          <span className="t-body-s text-ink-2">
            {ceremonyLabel[live.ceremony]} · {styleLabel[template.style]}
          </span>
          <span className="inline-flex items-center gap-1.5 t-body-s text-gold">
            <Eye size={14} /> Ko‘rinish jonli yangilanadi
          </span>
        </div>
      </div>
      <div className="h-px bg-line" />
      <dl className="flex flex-col gap-3">
        {rows.map(([l, v]) => (
          <div key={l} className="flex items-start justify-between gap-4">
            <dt className="t-body-s text-ink-2">{l}</dt>
            <dd className="text-right text-[13px] font-semibold leading-[1.35] text-ink">{v || "—"}</dd>
          </div>
        ))}
      </dl>
      <div className="h-px bg-line" />
      <div className="flex items-center justify-between">
        <span className="t-title text-ink">Jami</span>
        <span className="font-serif text-[28px] font-medium leading-[1.2] text-maroon">{formatPrice(amount)}</span>
      </div>
      {extra}
      {action}
      <HelpLink />
    </div>
  );
}

export function HelpLink() {
  return (
    <a
      href={site.telegram}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 t-body-s text-maroon hover:underline"
    >
      <TelegramIcon size={15} /> Savolingiz bormi? Telegramda yozing
    </a>
  );
}

/** Mobil: tanlangan shablon kartasi (forma tepasida) */
export function MobileTemplateCard({ template, live }: { template: Template; live: Template }) {
  return (
    <div className="flex items-center gap-3.5 rounded-panel bg-bg-soft p-3.5 lg:hidden">
      <PhoneFrame dark={isDarkTheme(template)} className="w-[40px] shrink-0">
        <InvitationScreen t={live} />
      </PhoneFrame>
      <div className="flex flex-col gap-0.5">
        <span className="t-body-s text-ink-2">Tanlangan shablon</span>
        <span className="font-serif text-[24px] font-medium leading-[1.2] text-ink">{template.name}</span>
      </div>
    </div>
  );
}

/** Mobil: pastda yopishqoq panel */
export function MobileBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 flex flex-col gap-2.5 border-t border-line bg-bg-base/95 px-5 pb-[max(14px,env(safe-area-inset-bottom))] pt-3.5 backdrop-blur lg:hidden">
      {children}
      <HelpLink />
    </div>
  );
}
