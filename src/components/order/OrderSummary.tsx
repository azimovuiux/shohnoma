"use client";

import type { ReactNode } from "react";
import { LiveDevices } from "./LiveDevices";
import type { FlowOrder } from "./types";
import { Eye } from "@/components/icons";
import { TelegramIcon } from "@/components/TelegramIcon";
import { ceremonyLabel, styleLabel, type Template } from "@/lib/templates";
import { formatPrice } from "@/lib/format";
import { site } from "@/lib/site";
import { useLocale, useT } from "@/lib/i18n";

export type SummaryRow = [label: string, value: ReactNode];

/** Buyurtma xulosasi — desktop o‘ng panel (spec §5.10) */
export function OrderSummary({
  template,
  live,
  order,
  rows,
  amount,
  action,
  extra,
}: {
  /** Jonli ko‘rinish uchun (liveTemplate bilan) */
  template: Template;
  live: Template;
  /** Formaning joriy holati — mokapda shablon shu ma’lumotlar bilan chiziladi */
  order?: FlowOrder;
  rows: SummaryRow[];
  amount: number;
  action: ReactNode;
  extra?: ReactNode;
}) {
  const t = useT();
  const locale = useLocale();
  return (
    <div className="flex flex-col gap-5 rounded-[24px] bg-bg-soft p-6">
      <LiveDevices template={template} live={live} order={order} />
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="t-body-s text-ink-2">{t("Tanlangan shablon")}</span>
          <span className="font-serif text-[26px] font-medium leading-[1.2] text-ink">{template.name}</span>
          <span className="t-body-s text-ink-2">
            {t(ceremonyLabel[live.ceremony])} · {t(styleLabel[template.style])}
          </span>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 pb-0.5 t-body-s text-gold">
          <Eye size={14} /> {t("Jonli ko‘rinish")}
        </span>
      </div>
      <div className="h-px bg-line" />
      <dl className="flex flex-col gap-3">
        {rows.map(([l, v]) => (
          <div key={l} className="flex items-start justify-between gap-4">
            <dt className="t-body-s text-ink-2">{t(l)}</dt>
            <dd className="text-right text-[13px] font-semibold leading-[1.35] text-ink">{v || "—"}</dd>
          </div>
        ))}
      </dl>
      <div className="h-px bg-line" />
      <div className="flex items-center justify-between">
        <span className="t-title text-ink">{t("Jami")}</span>
        <span className="font-serif text-[28px] font-medium leading-[1.2] text-maroon">{formatPrice(amount, true, locale)}</span>
      </div>
      {extra}
      {action}
      <HelpLink />
    </div>
  );
}

export function HelpLink() {
  const t = useT();
  return (
    <a
      href={site.telegram}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 t-body-s text-maroon hover:underline"
    >
      <TelegramIcon size={15} /> {t("Savolingiz bormi? Telegramda yozing")}
    </a>
  );
}

/** Mobil: tanlangan shablon kartasi (forma tepasida) — jonli laptop + telefon mokapi bilan */
export function MobileTemplateCard({ template, live, order }: { template: Template; live: Template; order?: FlowOrder }) {
  const t = useT();
  return (
    <div className="flex flex-col gap-3 rounded-panel bg-bg-soft p-3.5 lg:hidden">
      <LiveDevices template={template} live={live} order={order} />
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex flex-col gap-0.5">
          <span className="t-body-s text-ink-2">{t("Tanlangan shablon")}</span>
          <span className="font-serif text-[24px] font-medium leading-[1.2] text-ink">{template.name}</span>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 t-body-s text-gold">
          <Eye size={14} /> {t("Jonli")}
        </span>
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
