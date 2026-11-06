"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Qurilma ekranida sayt ko‘rinishi: avval poster (birinchi ekran), faollashganda — butun sahifaning
 * uzun rasmi CSS transform bilan silliq pastga suriladi (GPU, iframe yo‘q — katalog qotmaydi).
 * Uzun rasm faqat birinchi faollashuvda yuklanadi va keshda qoladi.
 */
export function ScrollShot({ poster, long, active, warm, speed = 1 }: { poster: string; long: string; active: boolean; warm?: boolean; speed?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [want, setWant] = useState(false); // uzun rasm yuklansinmi
  const [ready, setReady] = useState(false);
  const [dist, setDist] = useState(0); // surish masofasi (px)
  const [dur, setDur] = useState(20);

  useEffect(() => {
    if (active || warm) setWant(true);
  }, [active, warm]);

  const measure = (img: HTMLImageElement) => {
    const el = box.current;
    if (!el || !img.naturalWidth) return;
    const h = (img.naturalHeight / img.naturalWidth) * el.clientWidth;
    const d = Math.max(0, h - el.clientHeight);
    setDist(d);
    // ~1 ekran / 2.2 s — o‘qilarli, shoshilmagan tezlik
    setDur(Math.max(8, (d / Math.max(1, el.clientHeight)) * 2.2 / speed));
    setReady(true);
  };

  useEffect(() => {
    const el = box.current;
    if (!el || !ready) return;
    const ro = new ResizeObserver(() => {
      const img = el.querySelector<HTMLImageElement>("img[data-long]");
      if (img) measure(img);
    });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const run = active && ready && dist > 0;
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={poster} alt="" className="absolute inset-0 size-full object-cover object-top" draggable={false} />
      {want && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          data-long
          src={long}
          alt=""
          decoding="async"
          draggable={false}
          onLoad={(e) => measure(e.currentTarget)}
          className="absolute left-0 top-0 block w-full max-w-none will-change-transform"
          style={{
            opacity: ready ? 1 : 0,
            transform: run ? undefined : "translateY(0)",
            animation: run ? `shotScroll ${dur}s cubic-bezier(0.45,0,0.55,1) 0s infinite` : undefined,
            transition: run ? "opacity .4s" : "transform 0.9s cubic-bezier(0.22,1,0.36,1), opacity .4s",
            ["--shot" as string]: `${-dist}px`,
          }}
        />
      )}
    </div>
  );
}

/**
 * Kartani faollashtirish: kompyuterda — sichqoncha 3 s turganda; telefonda — karta ekran o‘rtasida 3 s turganda.
 * Bir vaqtda faqat bitta karta harakatlanadi.
 */
let current: ((on: boolean) => void) | null = null;
export function useShotActive<T extends HTMLElement>(delay = 3000) {
  const ref = useRef<T>(null);
  const [active, setActive] = useState(false);
  const [warm, setWarm] = useState(false); // oldindan yuklashni boshlash
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const set = (on: boolean) => {
      setActive(on);
      if (on) {
        if (current && current !== set) current(false);
        current = set;
      } else if (current === set) current = null;
    };
    const start = () => {
      setWarm(true);
      clearTimeout(timer);
      timer = setTimeout(() => set(true), delay);
    };
    const stop = () => {
      clearTimeout(timer);
      set(false);
    };
    const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const hover = typeof matchMedia !== "undefined" && matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (hover) {
      const target = (el.closest("article") as HTMLElement | null) ?? el;
      target.addEventListener("pointerenter", start);
      target.addEventListener("pointerleave", stop);
      return () => {
        clearTimeout(timer);
        target.removeEventListener("pointerenter", start);
        target.removeEventListener("pointerleave", stop);
        if (current === set) current = null;
      };
    }
    // Telefon: ekranning o‘rta qismiga (markaziy 30%) kirgan karta
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { rootMargin: "-35% 0px -35% 0px" });
    io.observe(el);
    return () => {
      clearTimeout(timer);
      io.disconnect();
      if (current === set) current = null;
    };
  }, [delay]);
  return { ref, active, warm };
}
