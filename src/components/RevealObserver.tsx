"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** [data-reveal] elementlarni ekranga kirganda ko‘rsatadi. Sahifa almashganda qayta kuzatadi. */
export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0 },
    );
    const scan = () => {
      document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)").forEach((el) => {
        if (reduce) el.classList.add("is-in");
        else io.observe(el);
      });
    };
    scan();
    // Ma’lumot keyin yuklanadigan sahifalar uchun (client-side fetch)
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);
  return null;
}

/** Bolalarga ketma-ket kechikish: stagger(i) → { "--d": "i*step ms" } */
export const stagger = (i: number, step = 90, base = 0) => ({ ["--d" as string]: `${base + i * step}ms` }) as React.CSSProperties;
