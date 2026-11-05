"use client";

import { useEffect, useRef, useState } from "react";

/**
 * HTML shablonning jonli ko‘rinishi: sahifa `baseWidth` kenglikda chiziladi va konteynerga masshtablanadi.
 * src o‘zgarsa — `delay` ms kutib qayta yuklanadi (yozish paytida har harfda yuklanmasligi uchun).
 */
export function HtmlFrame({ src, baseWidth = 390, delay = 1200, interactive = false }: { src: string; baseWidth?: number; delay?: number; interactive?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [h, setH] = useState(0);
  const [cur, setCur] = useState(src);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (src === cur) return;
    const t = window.setTimeout(() => setCur(src), delay);
    return () => window.clearTimeout(t);
  }, [src, cur, delay]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      setScale(el.clientWidth / baseWidth);
      setH(el.clientHeight);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    // Katalogda ko‘p kartalar bo‘lishi mumkin — faqat ko‘rinish maydoniga yaqinlashganda yuklaymiz
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && (setVisible(true), io.disconnect()), { rootMargin: "300px" });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, [baseWidth]);

  return (
    <div ref={box} className="relative size-full overflow-hidden bg-white">
      {visible && scale > 0 && (
        <iframe
          src={cur}
          title="Taklifnoma ko‘rinishi"
          loading="lazy"
          tabIndex={interactive ? 0 : -1}
          className={`absolute left-0 top-0 origin-top-left border-0 ${interactive ? "" : "pointer-events-none"}`}
          style={{ width: baseWidth, height: h / scale, transform: `scale(${scale})` }}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      )}
    </div>
  );
}
