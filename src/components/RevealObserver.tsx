"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * [data-reveal] bloklarni ekranga kirganda ko‘rsatadi.
 * - Bir vaqtda ko‘ringan bloklar bir kadrda ochiladi (rAF), kechikish faqat --d orqali.
 * - Animatsiya tugagach `is-done` — clip-path/transform olib tashlanadi (soyalar kesilmaydi).
 * - Yangi qo‘shilgan elementlar (API'dan keyin) MutationObserver bilan, rAF orqali tejamkor kuzatiladi.
 */
export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const items = (el: Element) => el.querySelectorAll<HTMLElement>(":scope > :not([data-split]), :scope > [data-split] > *");
    const done = (el: Element) => {
      const d = parseFloat(getComputedStyle(el).getPropertyValue("--d")) || 0;
      const kind = el.getAttribute("data-reveal");
      const n = kind === "stagger" ? items(el).length : 1;
      let extra = 0;
      if (kind === "group")
        el.querySelectorAll<HTMLElement>("[data-ri]").forEach((c) => (extra = Math.max(extra, parseFloat(c.style.getPropertyValue("--rd")) || 0)));
      window.setTimeout(() => el.classList.add("is-done"), d + (n - 1) * 140 + extra + 1900);
    };
    const io = new IntersectionObserver(
      (entries) => {
        const show = entries.filter((e) => e.isIntersecting).map((e) => e.target);
        if (!show.length) return;
        requestAnimationFrame(() =>
          show.forEach((el) => {
            el.classList.add("is-in");
            io.unobserve(el);
            done(el);
          }),
        );
      },
      { rootMargin: "0px 0px -15% 0px", threshold: 0 },
    );
    const seen = new WeakSet<Element>();
    const scan = () => {
      document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)").forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        if (el.dataset.reveal === "stagger") items(el).forEach((c, i) => c.style.setProperty("--i", String(i)));
        if (reduce) el.classList.add("is-in", "is-done");
        else io.observe(el);
      });
    };
    scan();
    let raf = 0;
    const mo = new MutationObserver((muts) => {
      if (raf || !muts.some((m) => m.addedNodes.length)) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        scan();
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [pathname]);
  return null;
}
