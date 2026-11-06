"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Konteyner eni ≥ 960 bo‘lsa — laptop maketi (1440 kanvas), aks holda mobil (390 kanvas) */
export function useWide(ref: RefObject<HTMLElement | null>) {
  const [wide, setWide] = useState(false);
  useIso(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWide(el.clientWidth >= 960);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return wide;
}

/** Bo‘lim ekranga kirganda bir marta `in` (kirish animatsiyalari shu bilan boshlanadi) */
export function useInView<T extends HTMLElement>(threshold = 0.18, enabled = true) {
  const ref = useRef<T>(null);
  const [inView, setIn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || inView) return;
    if (typeof IntersectionObserver === "undefined") return setIn(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setIn(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, enabled, inView]);
  return [ref, inView] as const;
}

/**
 * Scroll bilan bog‘langan jarayon: element pastki chetdan kirganda 0, yuqoridan chiqqanda 1.
 * Ichki scroll konteynerlari (telefon mokapi) uchun ham ishlaydi — scroll hodisasi capture bilan tinglanadi.
 */
export function useScrollProgress(ref: RefObject<HTMLElement | null>, onProgress: (p: number, rect: DOMRect) => void, enabled = true) {
  const cb = useRef(onProgress);
  cb.current = onProgress;
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      cb.current(p, r);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    tick();
    document.addEventListener("scroll", on, { capture: true, passive: true });
    window.addEventListener("resize", on);
    return () => {
      document.removeEventListener("scroll", on, { capture: true });
      window.removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, [ref, enabled]);
}

/** To‘yga qadar qolgan vaqt (har soniyada) */
export function useCountdown(target: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const ms = Math.max(0, target - now);
  return {
    d: Math.floor(ms / 86400_000),
    h: Math.floor(ms / 3600_000) % 24,
    m: Math.floor(ms / 60_000) % 60,
    s: Math.floor(ms / 1000) % 60,
  };
}

/** Raqamni 0 dan sanab chiqish (faqat birinchi ko‘rinishda, bir marta; keyin qiymatni to‘g‘ridan-to‘g‘ri beradi) */
export function useCountUp(value: number, run: boolean, ms = 1600) {
  const target = useRef(value);
  target.current = value;
  const [v, setV] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!run || done) return;
    if (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches) return setDone(true);
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setV(Math.round(target.current * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
      else setDone(true);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);
  return { value: done ? value : v, done };
}

/** Sichqoncha parallaksi (faqat laptop): -1…1 */
export function usePointer(enabled: boolean) {
  const [p, setP] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (!enabled || typeof matchMedia === "undefined" || !matchMedia("(pointer: fine)").matches) return;
    let raf = 0;
    let last = { x: 0, y: 0 };
    const on = (e: PointerEvent) => {
      last = { x: (e.clientX / window.innerWidth) * 2 - 1, y: (e.clientY / window.innerHeight) * 2 - 1 };
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          setP(last);
        });
    };
    window.addEventListener("pointermove", on, { passive: true });
    return () => {
      window.removeEventListener("pointermove", on);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);
  return p;
}
