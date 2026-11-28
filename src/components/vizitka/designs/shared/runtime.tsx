"use client";

/**
 * Vizitka dizaynlari uchun umumiy: props turi, appear (har element alohida), Fit (bir qatorga sig‘dirish),
 * raqam sanash, telefon/havola formatlari, namuna rasmlari va kichik toast.
 */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import type { CardContent, CardLang, CardLeadRequest } from "@/lib/cardTypes";

const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** public — /v/<slug>/; demo — /vizitka/namuna/<slug>/; preview — buyurtma formasidagi telefon ramkasi (harakatsiz) */
export type CardMode = "public" | "demo" | "preview";

export interface CardActions {
  /** .vcf yuklab olish (Kontaktni saqlash) */
  save: () => void;
  /** QR oynasi / ulashish */
  share: () => void;
  qr: () => void;
  /** Lead forma (bo‘lmasa — forma faqat ko‘rinish uchun) */
  lead?: (req: CardLeadRequest) => Promise<void>;
}

export interface CardViewProps {
  card: CardContent;
  lang: CardLang;
  onLang: (l: CardLang) => void;
  mode: CardMode;
  actions: CardActions;
}

/** Namuna rasmlari (public/vizitka/<dizayn>/) — faqat demo rejimida, mijoz rasmi yo‘q bo‘lsa */
export const DEMO_PHOTOS: Record<string, string[]> = {
  "v-noir": ["/vizitka/noir/portret.webp", "/vizitka/noir/ofis.webp"],
  // [0] portret, [1..3] Instagram postlari (daftar, sahna, ofis); YouTube muqovasi — [2]
  "v-lumen": ["/vizitka/lumen/portret.webp", "/vizitka/lumen/post-1.webp", "/vizitka/lumen/sahna.webp", "/vizitka/lumen/post-2.webp"],
};
export const DEMO_BOOK = "/vizitka/lumen/kitob.webp";

export function photoOf(card: CardContent, i: number, design: string, mode: CardMode): string {
  const own = card.photos?.[i];
  if (own) return own;
  if (mode === "demo" && !card.photos?.length) return DEMO_PHOTOS[design]?.[i] ?? "";
  return "";
}

export const U = (n: number) => `calc(var(--u) * ${+n.toFixed(3)})`;

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

/**
 * Ism qatorlari (hero): «Aziz Karimov» → ["Aziz", "Karimov"]; bitta so‘z → [so‘z].
 * Uzun qo‘sh familiya defisdan bo‘linadi (ko‘pi bilan 3 qator), shrift haddan tashqari kichraymasin:
 * «Abdulazizxon Muhammadqodirov-Toshkentiy» → ["Abdulazizxon", "Muhammadqodirov-", "Toshkentiy"].
 */
export function splitName(full: string): string[] {
  const s = full.trim().replace(/\s+/g, " ");
  if (!s) return [];
  const words = s.split(" ");
  if (words.length === 1) return words;
  const lines = [words[0], words.slice(1).join(" ")];
  const last = lines[1];
  if (last.length > 14 && /\S-\S/.test(last)) {
    const i = last.indexOf("-", 3);
    if (i > 0) return [lines[0], last.slice(0, i + 1), last.slice(i + 1)];
  }
  if (words.length > 2 && last.length > 14) return [words[0], words[1], words.slice(2).join(" ")];
  return lines;
}

/** Monogramma: «Aziz Karimov» → «AK» */
export function initials(full: string): string {
  const p = full.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toLocaleUpperCase() || "•";
}

/** +998901234567 → «+998 90 123 45 67» */
export function fmtPhone(p: string): string {
  const d = (p || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("998")) return `+998 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`;
  return p;
}
export const telHref = (p: string) => `tel:+${(p || "").replace(/\D/g, "")}`;
export const waHref = (p: string) => `https://wa.me/${(p || "").replace(/\D/g, "")}`;
export const tgHandle = (t: string) => {
  const s = (t || "").trim().replace(/^https?:\/\/(t\.me|telegram\.me)\//i, "").replace(/^@/, "");
  return s ? `@${s}` : "";
};
export const tgHref = (t: string) => `https://t.me/${tgHandle(t).slice(1)}`;
export const mapHref = (address: string, mapUrl: string) => mapUrl || (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "");
export const hostOf = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
};

/** Har bir [data-a] element o‘zi ekranga kirganda data-in oladi; sahifa oxirida qolganlari ochiladi. `all` — darrov hammasi. */
export function useReveal(root: RefObject<HTMLElement | null>, all: boolean, deps: unknown) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const SEL = "[data-a]:not([data-in])";
    if (all) {
      el.querySelectorAll<HTMLElement>(SEL).forEach((x) => x.setAttribute("data-in", ""));
      const mo = new MutationObserver(() => el.querySelectorAll<HTMLElement>(SEL).forEach((x) => x.setAttribute("data-in", "")));
      mo.observe(el, { childList: true, subtree: true });
      return () => mo.disconnect();
    }
    let list: HTMLElement[] = [];
    let raf = 0;
    const check = () => {
      raf = 0;
      const line = window.innerHeight * 0.92;
      const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
      list = list.filter((x) => {
        const r = x.getBoundingClientRect();
        if (atEnd || r.top < line) {
          x.setAttribute("data-in", "");
          return false;
        }
        return true;
      });
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    const scan = () => {
      list = Array.from(el.querySelectorAll<HTMLElement>(SEL));
      on();
    };
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(el, { childList: true, subtree: true });
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      mo.disconnect();
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, all, deps]);
}

/** Konteyner eni ≥ 960 — laptop maketi (1440), aks holda mobil (390) */
export function useWide(ref: RefObject<HTMLElement | null>) {
  return useCanvas(ref).wide;
}

/**
 * Kanvas: laptop (eni ≥ 960 → 1440) yoki mobil (390) va `--u` piksel qiymati.
 * `--u` JS bilan beriladi (cqw fixed elementlarda — pastki panel, suzuvchi tugma — ishonchsiz), CSS’da zaxira `100cqw / W`.
 */
export function useCanvas(ref: RefObject<HTMLElement | null>) {
  const [w, setW] = useState(0);
  useIso(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  const wide = w >= 960;
  const unit = w ? `${(w / (wide ? 1440 : 390)).toFixed(5)}px` : undefined;
  return { wide, unit, w };
}

export const reducedMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Bir qatorli matn (ism) konteyneriga sig‘masa — shrift kichrayadi (kesilmaydi, toshmaydi).
 * `base` — Figma o‘lchami (--u birligida), `max` — ruxsat etilgan eni (--u birligida).
 */
export function Fit({ children, base, max, className, style, deps, as = "span" }: { children: ReactNode; base: number; max: number; className?: string; style?: CSSProperties; deps: unknown; as?: "span" | "p" | "h1" | "div" }) {
  const ref = useRef<HTMLElement>(null);
  useIso(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      el.style.fontSize = U(base);
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (!px) return;
      const u = px / base;
      const w = el.scrollWidth;
      const k = w > max * u ? (max * u) / w : 1;
      el.style.fontSize = U(+(base * k).toFixed(3));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (el.parentElement) ro.observe(el.parentElement);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [base, max, deps]);
  const Tag = as as "span";
  return (
    <Tag ref={ref as RefObject<HTMLSpanElement>} className={className} style={{ display: "block", whiteSpace: "nowrap", width: "max-content", maxWidth: "none", ...style }}>
      {children}
    </Tag>
  );
}

/**
 * Bir nechta qatorni bitta umumiy koeffitsiyent bilan sig‘dirish (ism 2 qatorda: «Aziz / Karimov»).
 * Har qator `[data-fit-line]`; eng uzuni `max` ga sig‘adigan qilib hammasi teng kichrayadi.
 */
export function useFitLines(ref: RefObject<HTMLElement | null>, base: number, max: number, deps: unknown) {
  useIso(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      el.style.fontSize = U(base);
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (!px) return;
      const u = px / base;
      const lines = Array.from(el.querySelectorAll<HTMLElement>("[data-fit-line]"));
      const w = Math.max(0, ...lines.map((l) => l.scrollWidth));
      const k = w > max * u ? (max * u) / w : 1;
      el.style.fontSize = U(+(base * k).toFixed(3));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (el.parentElement) ro.observe(el.parentElement);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [ref, base, max, deps]);
}

/**
 * Ota element eniga sig‘dirish (raqamlar katagi): `final` — yakuniy matn (sanash paytida ham shu bo‘yicha o‘lchanadi),
 * sig‘masa shrift `base` dan kichrayadi.
 */
export function FitCell({ base, final, className, children }: { base: number; final: ReactNode; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  useIso(() => {
    const el = ref.current;
    const pr = probe.current;
    const par = el?.parentElement;
    if (!el || !pr || !par) return;
    const measure = () => {
      el.style.fontSize = U(base);
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (!px) return;
      const cs = getComputedStyle(par);
      const avail = par.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const w = pr.scrollWidth;
      const k = w > avail && avail > 0 ? avail / w : 1;
      el.style.fontSize = U(+(base * k).toFixed(3));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(par);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [base, final]);
  return (
    <span ref={ref} className={className} style={{ position: "relative", display: "inline-block", whiteSpace: "nowrap" }}>
      {children}
      <span ref={probe} aria-hidden style={{ position: "absolute", left: 0, top: 0, visibility: "hidden", whiteSpace: "nowrap", pointerEvents: "none" }}>
        {final}
      </span>
    </span>
  );
}

/** Qiymatdagi birinchi raqamni 0 dan sanab chiqadi: «$40M+» → $0M+ … $40M+, «48,2K obunachi» → 0,0K … 48,2K */
export function CountText({ text, run, still, ms = 1600, render }: { text: string; run: boolean; still?: boolean; ms?: number; render?: (s: string) => ReactNode }) {
  const m = text.match(/^(\D*?)(\d+(?:[.,\s]\d+)*)(.*)$/s);
  const has = !!m;
  const [k, setK] = useState(has && !still ? 0 : 1);
  useEffect(() => {
    if (!has || !run || still) return;
    if (reducedMotion()) return setK(1);
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setK(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      setK(1);
    };
  }, [run, has, ms, still]);
  let out = text;
  if (m && k < 1 && !still) {
    const raw = m[2];
    const sep = raw.match(/[.,](\d+)$/);
    const dec = sep ? sep[1].length : 0;
    const groups = /\s/.test(raw);
    const num = parseFloat(raw.replace(/\s/g, "").replace(",", "."));
    const cur = num * k;
    let s = dec ? cur.toFixed(dec) : String(Math.round(cur));
    if (sep && sep[0][0] === ",") s = s.replace(".", ",");
    if (groups) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    out = m[1] + s + m[3];
  }
  return <>{render ? render(out) : out}</>;
}

/** Kichik bildirishnoma («Nusxa olindi») — 1.8 s */
export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = (m: string) => {
    setMsg(m);
    clearTimeout(t.current);
    t.current = setTimeout(() => setMsg(null), 1800);
  };
  useEffect(() => () => clearTimeout(t.current), []);
  return { msg, show };
}

export async function copyText(s: string) {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    const ta = Object.assign(document.createElement("textarea"), { value: s });
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

/** Mobil qurilma (giroskop effekti va tel: havolalari uchun) */
export const isTouch = () => typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
