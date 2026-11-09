"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { LaptopFrame, PhoneFrame } from "@/components/mockups/Devices";
import { InvitationDesktop } from "@/components/mockups/InvitationDesktop";
import { InvitationScreen } from "@/components/mockups/InvitationScreen";
import { HtmlFrame } from "@/components/mockups/HtmlFrame";
import { InvitationSite } from "@/components/invitation/InvitationSite";
import { GirihPattern } from "@/components/Ornament";
import { isDarkTheme } from "@/components/TemplateCard";
import type { Template } from "@/lib/templates";
import { hasCustomDesign } from "./live";
import { CloseCircle, Eye, Mobile, Monitor } from "@/components/icons";
import { useT } from "@/lib/i18n";
import { toInvitationData } from "./toInvitationData";
import type { FlowOrder } from "./types";

/**
 * Haqiqiy sayt berilgan kenglikda (1440 yoki 390) chiziladi va qurilma ekraniga kichraytiriladi.
 * Scroll yo‘q — faqat birinchi ekran; forma o‘zgarsa darrov yangilanadi.
 */
function ScaledSite({ template, order, width, height }: { template: Template; order: FlowOrder; width: number; height: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setK(el.clientWidth / width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  const data = useMemo(() => toInvitationData(order), [order]);
  return (
    <div ref={box} className="pointer-events-none absolute inset-0 select-none overflow-hidden" aria-hidden inert>
      {k > 0 && (
        <div className="overflow-hidden" style={{ width, height, transform: `scale(${k})`, transformOrigin: "0 0" }}>
          <InvitationSite template={template} data={data} mode="preview" embedded />
        </div>
      )}
    </div>
  );
}

/** Buyurtma panelidagi laptop + telefon mokapi: tanlangan shablon mijoz ma’lumotlari bilan jonli */
export function LiveDevices({ template, live, order }: { template: Template; live: Template; order?: FlowOrder }) {
  // Yozish paytida sayt har harfda qayta chizilmasin — kechiktirilgan qiymat
  const o = useDeferredValue(order);
  const custom = !!o && hasCustomDesign(template);
  const html = template.kind === "html" && !!live.previewUrl;
  return (
    <div className="relative aspect-[560/380] overflow-hidden rounded-[18px] bg-gradient-to-b from-[#efe4d3] to-[#f8f3eb]">
      <GirihPattern id={`girih-live-${template.slug}`} cell={62} color="#c9a25e" opacity={0.22} className="absolute inset-0" />
      <div className="absolute left-[0.7%] top-[12.6%] w-[89.3%]">
        <LaptopFrame className="w-full">
          {custom ? (
            <ScaledSite template={template} order={o!} width={1440} height={900} />
          ) : html ? (
            <HtmlFrame src={live.previewUrl!} baseWidth={1440} delay={0} />
          ) : (
            <InvitationDesktop t={live} />
          )}
        </LaptopFrame>
      </div>
      <PhoneFrame dark={isDarkTheme(template)} className="absolute left-[72.1%] top-[21.6%] w-[23.6%]">
        {custom ? (
          <ScaledSite template={template} order={o!} width={390} height={815} />
        ) : html ? (
          <HtmlFrame src={live.previewUrl!} delay={0} />
        ) : (
          <InvitationScreen t={live} />
        )}
      </PhoneFrame>
    </div>
  );
}

/* ───────── To‘liq jonli ko‘rinish (modal): telefon yoki laptop, ichida scroll ───────── */

function FullSite({ template, order, width }: { template: Template; order: FlowOrder; width: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0);
  const [h, setH] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setK(el.clientWidth / width);
      setH(el.clientHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  const data = useMemo(() => toInvitationData(order), [order]);
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden">
      {k > 0 && (
        <div
          className="overflow-y-auto overscroll-contain [scrollbar-width:none]"
          style={{ width, height: h / k, transform: `scale(${k})`, transformOrigin: "0 0" }}
          tabIndex={0}
          aria-label="Taklifnoma — pastga suring"
        >
          <InvitationSite template={template} data={data} mode="preview" embedded />
        </div>
      )}
    </div>
  );
}

export function LivePreviewModal({ open, onClose, template, live, order }: { open: boolean; onClose: () => void; template: Template; live?: Template; order: FlowOrder }) {
  const t = useT();
  const [device, setDevice] = useState<"phone" | "laptop">("phone");
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  const html = template.kind === "html";
  const previewUrl = live?.previewUrl ?? (order.id ? `/api/orders/${order.id}/preview` : "");
  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#1d1a17]/95 animate-[fade-in_.2s]" role="dialog" aria-modal="true" aria-label={t("Jonli ko‘rinish")}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-ink-inverse sm:px-6">
        <div className="inline-flex rounded-full bg-white/10 p-1" role="tablist">
          {(
            [
              ["phone", t("Telefon"), <Mobile key="p" size={16} />],
              ["laptop", t("Laptop"), <Monitor key="l" size={16} />],
            ] as const
          ).map(([k, l, icon]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={device === k}
              onClick={() => setDevice(k)}
              className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-[14px] font-medium transition-colors ${device === k ? "bg-white text-ink" : "text-white/80 hover:text-white"}`}
            >
              {icon} {l}
            </button>
          ))}
        </div>
        <p className="hidden t-body-s text-white/70 md:block">{t("Mehmonlar taklifnomani aynan shunday ko‘radi — pastga suring")}</p>
        <button type="button" onClick={onClose} aria-label={t("Yopish")} className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
          <CloseCircle size={20} />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-4 sm:px-6 sm:pb-6">
        {device === "phone" ? (
          <div className="relative h-full max-h-[820px] w-auto" style={{ aspectRatio: "300 / 627" }}>
            <PhoneFrame dark={isDarkTheme(template)} className="h-full w-full">
              {html ? <HtmlFrame src={previewUrl} interactive delay={0} /> : <FullSite template={template} order={order} width={390} />}
            </PhoneFrame>
          </div>
        ) : (
          <div className="relative h-full w-full max-w-[1400px] overflow-hidden rounded-[14px] border-[6px] border-[#1d1d1f] bg-white">
            {html ? <HtmlFrame src={previewUrl} baseWidth={1440} interactive delay={0} /> : <FullSite template={template} order={order} width={1440} />}
          </div>
        )}
      </div>
    </div>
  );
}

/** «Jonli ko‘rinish» tugmasi — kiritilgan ma’lumotlar bilan to‘liq saytni ochadi */
export function LivePreviewButton({ template, live, order, className = "", label }: { template: Template; live?: Template; order?: FlowOrder; className?: string; label?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  if (!order) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <Eye size={16} /> {label ?? t("Jonli ko‘rinish")}
      </button>
      <LivePreviewModal open={open} onClose={() => setOpen(false)} template={template} live={live} order={order} />
    </>
  );
}
