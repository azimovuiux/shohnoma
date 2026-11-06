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
