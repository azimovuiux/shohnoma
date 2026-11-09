"use client";

import { useEffect, useRef } from "react";
import { FinaleFlowers } from "./Flowers";
import { useT } from "@/lib/i18n";

/**
 * "Gullar ochiladi — yakuniy so‘z" (Figma 132:20870). Tugmalarsiz.
 * CSS scroll-driven animatsiya qo‘llab-quvvatlanmasa (Safari, Firefox) — scroll'dan --p / --pt hisoblanadi.
 */
export function Finale() {
  const ref = useRef<HTMLElement>(null);
  const t = useT();

  useEffect(() => {
    const el = ref.current;
    if (!el || CSS.supports("animation-timeline: view()")) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // entry 0% (bo‘lim tepasi ekran pastida) → cover 50% (bo‘lim markazi ekran markazida)
      const start = vh;
      const end = vh / 2 - r.height / 2;
      const p = Math.min(1, Math.max(0, (start - r.top) / (start - end)));
      const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const pt = Math.min(1, Math.max(0, (p - 0.4) / 0.6));
      el.style.setProperty("--p", ease.toFixed(4));
      el.style.setProperty("--pt", (1 - Math.pow(1 - pt, 2)).toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={ref} className="finale relative h-[546px] overflow-hidden bg-bg-base lg:h-[820px]" aria-labelledby="finale-title">
      <FinaleFlowers />
      <div className="finale-text absolute inset-x-0 top-[330px] mx-auto flex w-[340px] flex-col items-center gap-1 text-center lg:top-[308px] lg:w-[600px]">
        <h2 id="finale-title" className="flex flex-col font-serif font-light">
          <span className="text-[42px] leading-[1.04] tracking-[-0.005em] text-ink lg:text-[72px]">{t("Baxtli kuningiz")}</span>
          <em className="text-[40px] italic leading-none tracking-[-0.01em] text-maroon lg:text-[68px]">{t("shu yerdan boshlanadi")}</em>
        </h2>
        <p className="mt-3 text-[14px] leading-[1.6] text-ink-2 lg:text-[17px]">
          {t("Shablonni tanlang, ma’lumotlarni kiriting — taklifnomangiz bir necha daqiqada tayyor.")}
        </p>
      </div>
    </section>
  );
}
