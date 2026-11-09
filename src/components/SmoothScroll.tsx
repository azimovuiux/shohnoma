"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

/**
 * Silliq (inersiyali) scroll — Lenis. Native scroll ustida ishlaydi, shuning uchun
 * sticky header, IntersectionObserver va scroll-driven animatsiyalar o‘zgarishsiz ishlaydi.
 * Modal/menyu ochilganda (body overflow: hidden) to‘xtaydi; ichki scroll bloklari va
 * dialoglar ichida g‘ildirak native qoladi.
 */
export function SmoothScroll() {
  const admin = (usePathname() ?? "").startsWith("/admin");
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Admin panelda silliq scroll kerak emas — formalar, sticky panel va ichki scroll native ishlasin
    if (admin) return;

    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.09,
      wheelMultiplier: 1,
      anchors: { offset: -96 },
      prevent: (node) =>
        !!node.closest?.('[role="dialog"], .overflow-y-auto, .overflow-auto, textarea, select'),
    });

    // body overflow hidden bo‘lsa (modal, mobil menyu) — scrollni to‘xtatamiz
    const sync = () => (document.body.style.overflow === "hidden" ? lenis.stop() : lenis.start());
    const mo = new MutationObserver(sync);
    mo.observe(document.body, { attributes: true, attributeFilter: ["style"] });

    return () => {
      mo.disconnect();
      lenis.destroy();
    };
  }, [admin]);
  return null;
}
