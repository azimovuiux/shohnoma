"use client";

/**
 * Jonli ko‘rinish: vizitka dizaynining o‘zi telefon ramkasida (ichida scroll) va laptop ekranida (birinchi ekran, kichraytirilgan).
 * Ramka o‘rami `transform` bilan — kartaning fixed panellari (Noir pastki panel) ramka ichida qoladi.
 */
import { useDeferredValue, useEffect, useRef, useState } from "react";
import type { CardContent, CardDesignSlug, CardLang } from "@/lib/cardTypes";
import { LaptopFrame, PhoneFrame } from "@/components/mockups/Devices";
import { CardPreview, isDarkDesign } from "@/components/vizitka/designs";

export function PhonePreview({ design, card, lang, onLang, className = "" }: { design: CardDesignSlug; card: CardContent; lang: CardLang; onLang: (l: CardLang) => void; className?: string }) {
  const c = useDeferredValue(card);
  return (
    <PhoneFrame className={className} dark={isDarkDesign(design)}>
      <div className="absolute inset-0" style={{ background: isDarkDesign(design) ? "#0b0b0a" : "#f3eee7" }} />
      {/* ekran: status bar ostidan boshlanadi (haqiqiy telefondagi kabi) */}
      <div className="absolute inset-x-0 bottom-0" style={{ top: "11cqw", transform: "translateZ(0)" }}>
        <div className="vz-scroll absolute inset-0 overflow-y-auto overscroll-contain" style={{ scrollbarWidth: "none" }}>
          <style>{".vz-scroll::-webkit-scrollbar{display:none}"}</style>
          <CardPreview design={design} card={c} lang={lang} onLang={onLang} />
        </div>
      </div>
    </PhoneFrame>
  );
}

/** Laptop: karta 1440 kenglikda chiziladi va ekranga kichraytiriladi (faqat birinchi ekran) */
export function LaptopPreview({ design, card, lang, onLang, className = "" }: { design: CardDesignSlug; card: CardContent; lang: CardLang; onLang: (l: CardLang) => void; className?: string }) {
  const c = useDeferredValue(card);
  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setK(el.clientWidth / 1440));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <LaptopFrame className={className}>
      <div ref={box} className="pointer-events-none absolute inset-0 select-none overflow-hidden" aria-hidden inert>
        {k > 0 && (
          <div style={{ width: 1440, height: 900, transform: `scale(${k})`, transformOrigin: "0 0", overflow: "hidden" }}>
            <CardPreview design={design} card={c} lang={lang} onLang={onLang} />
          </div>
        )}
      </div>
    </LaptopFrame>
  );
}
