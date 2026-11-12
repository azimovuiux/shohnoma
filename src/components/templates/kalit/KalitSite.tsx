"use client";

import "@fontsource/cormorant-garamond/300.css";
import "@fontsource/cormorant-garamond/300-italic.css";
import "@fontsource/cormorant-garamond/400.css";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { splitDate, tashkentDate } from "@/lib/display";
import { musicSrc } from "@/lib/music";
import { useLocale, useT } from "@/lib/i18n";
import type { InvitationSiteProps } from "@/components/invitation/types";
import { fetchSavedAnswer, loadSavedRsvp, saveRsvp, type RsvpStatus } from "@/components/invitation/Rsvp";
import { timerUnits } from "@/components/invitation/data";
import { useCountdown, useCountUp, useInView, useScrollProgress, useWide } from "../shared/hooks";
import { Loader, MusicButton, usePreload, useMusic } from "../shared/runtime";
import { DRESS, calendarWords, coordsFrom, untilPhrase, type ProgramItem } from "../anor/data";
import { DRESS_TONE, KALIT_DEMO, KALIT_DEMO_EN, KALIT_DEMO_RU, P } from "./data";
import st from "./kalit.module.css";

/* ── Birliklar ──
 * U — kontent ustuni (Figma mobil 390 koordinatalari; laptopda ustun = mobil × 1.45, ya’ni 565.5px / 1440)
 * Hero va final — o‘z kanvasi (mobil 390×844, laptop 1440×900). */
const U = (n: number) => `calc(var(--u) * ${+n.toFixed(3)})`;
type Box = [number, number, number, number];
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const vars = (o: Record<string, string | number | undefined>) => o as CSSProperties;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const COL_M = "calc(100cqw / 390)";
const COL_L = "calc(100cqw / 1440 * 1.45)";
const CANVAS_L = "calc(100cqw / 1440)";
/** Laptop yon chiziqlari: ustun chetidan 24 kanvas px tashqarida (Figma «Yon chiziq») */
const SIDE = 195 + 24 / 1.45;

/* ── Ma’lumot (taklifnoma tilida — InvitationSite LocaleProvider’i) ── */
function useData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO = lang === "ru" ? KALIT_DEMO_RU : lang === "en" ? KALIT_DEMO_EN : KALIT_DEMO;
  const ex = (data.extra ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof ex[k] === "string" ? (ex[k] as string).trim() : "");
  const sd = splitDate(data.date);
  const [guest, setGuest] = useState("");
  useEffect(() => {
    const m = new URLSearchParams(location.search).get("m");
    setGuest(m ? m.slice(0, 80) : "");
  }, []);
  return useMemo(() => {
    const cw = calendarWords(lang);
    const exProgram = Array.isArray(ex.program) ? (ex.program as ProgramItem[]).filter((p) => p?.time && p?.title) : [];
    const photos = (data.photos ?? []).filter(Boolean);
    const date = sd ? new Date(`${sd.iso}T12:00:00Z`) : null;
    const code = str("dressCode") || (demo ? DEMO.dressCode : "");
    const dz = DRESS[code];
    // namunadagi ismlar tarjima qilinadi (mijoz ma’lumoti — o‘zgarishsiz)
    const a = (demo ? t(data.personA) : data.personA) || "";
    const b = (demo && data.personB ? t(data.personB) : data.personB) || "";
    const time = sd?.time ?? "";
    const program = (demo ? DEMO.program : exProgram.length ? exProgram : (data.program as ProgramItem[])) as ProgramItem[];
    const y = date ? date.getUTCFullYear() : 0;
    const m = date ? date.getUTCMonth() : 0;
    const day = date ? date.getUTCDate() : 0;
    const message = (demo ? DEMO.message : data.message || "").replace(/^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Дорогие гости!|Dear guests!)\s*/, "").trim();
    const coords = demo ? { lat: 41.3111, lon: 69.2797 } : coordsFrom(data.mapUrl);
    const venueTitle = (demo ? DEMO.venueTitle : data.venueName) || "";
    const address = (demo ? DEMO.address : data.address) || "";
    /* Suratlar (PHOTO_SLOTS.kalit): 0 — kalit teshigi ortida, 1 — kelin, 2 — kuyov, 3 — bazm zali, 4 — lahza (qo‘llar) */
    const ph = (demo ? [`${P}/couple.webp`, `${P}/bride.webp`, `${P}/groom.webp`, `${P}/hall.webp`, `${P}/hands.webp`] : [0, 1, 2, 3, 4].map((i) => photos[i])).map((x) => x || null) as (string | null)[];
    const unq = (s: string) => s.replace(/^["“”«»„]+|["“”«»„]+$/g, "").trim();
    const wd = date ? cw.weekday[date.getUTCDay()] : "";
    const initial = (s: string) => [...s.trim()][0]?.toUpperCase() ?? "";
    return {
      a,
      b,
      /** «Jasur va Madina» */
      pair: b ? t("{a} va {b}", { a, b }) : a,
      sign: b ? `— ${initial(a)} & ${initial(b)}` : a ? `— ${a}` : "",
      dots: sd?.dots ?? "",
      day: date ? String(day) : "",
      month: date ? cw.months[m] : "",
      /** «2026 · shanba · 17:00» */
      line: date ? [String(y), lang === "en" ? wd : wd.toLowerCase(), time].filter(Boolean).join(" · ") : "",
      hasDate: !!date,
      target: data.date ? tashkentDate(data.date).getTime() : null,
      guest,
      message,
      venueTitle,
      address,
      mapUrl: data.mapUrl || `https://yandex.uz/maps/?text=${encodeURIComponent([venueTitle, address].filter(Boolean).join(", "))}`,
      taxi: coords
        ? `https://3.redirect.appmetrica.yandex.com/route?end-lat=${coords.lat}&end-lon=${coords.lon}&appmetrica_tracking_id=1178268795219780156`
        : `https://yandex.uz/maps/?rtext=~${encodeURIComponent([address, venueTitle].filter(Boolean).join(", "))}&rtt=taxi`,
      program,
      dress: dz
        ? {
            ...dz,
            title: t(dz.title),
            sub: t(dz.sub),
            tone: t(DRESS_TONE[code] ?? DRESS_TONE.Klassik),
            note: str("dressNote") || t(dz.note),
            imgs: dz.imgs.map((x) => ({ ...x, label: t(x.label) })),
          }
        : null,
      ph,
      /** Kalit teshigi ortidagi surat: mijoz surati bo‘lmasa — bo‘sh kutubxona nuri (shablon rasmi) */
      hero: ph[0] || `${P}/library.webp`,
      quote: unq(str("quote") || (demo ? DEMO.quote : "")),
      rsvpUntil: untilPhrase(data.rsvpDeadline, lang)
        .replace(/(\d) /g, "$1 ")
        .replace(/^(до|by) /, "$1 "),
      musicUrl: musicSrc(template, data),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, data, demo, guest, lang, t]);
}
type D = ReturnType<typeof useData>;

/**
 * Bo‘lim: to‘liq enli fon + markazda kontent ustuni (mobil 390 birlik; laptopda × 1.45).
 * Laptopda ustundan tashqarida — Figma «Yon chiziq» (bo‘lim balandligining o‘rta yarmi).
 */
function Sec({
  children,
  wide,
  z,
  style,
  colStyle,
  id,
  onP,
  className,
}: {
  children: ReactNode;
  wide: boolean;
  z: number;
  style?: CSSProperties;
  colStyle?: CSSProperties;
  id?: string;
  onP?: (p: number, r: DOMRect, el: HTMLElement) => void;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const cb = useRef(onP);
  cb.current = onP;
  useScrollProgress(ref, (p, r) => {
    if (!ref.current) return;
    ref.current.style.setProperty("--p", p.toFixed(4));
    cb.current?.(p, r, ref.current);
  });
  return (
    <section ref={ref} id={id} className={cx(st.sec, className)} style={{ zIndex: z, ...style }}>
      {wide && (
        <>
          <span data-a="lineY" className={st.sideLine} style={{ left: `calc(50% - ${U(SIDE)})` }} />
          <span data-a="lineY" className={st.sideLine} style={vars({ left: `calc(50% + ${U(SIDE)})`, "--d": "0.15s" })} />
        </>
      )}
      <div className={st.col} style={{ width: U(390), ...colStyle }}>
        {children}
      </div>
    </section>
  );
}

/**
 * Appear: har bir [data-a] element (va so‘z) o‘zi ekranga kirganda `data-in` oladi — butun bo‘lim birdan emas.
 * Yuqorida qolganlar darrov ko‘rsatiladi; sahifa oxirida qolganlarning hammasi ochiladi.
 */
function useReveal(root: React.RefObject<HTMLDivElement | null>, ready: boolean, all: boolean) {
  useEffect(() => {
    const el = root.current;
    if (!el || !ready) return;
    const SEL = "[data-a]:not([data-in]),[data-w]:not([data-in])";
    if (all) {
      el.querySelectorAll<HTMLElement>(SEL).forEach((x) => x.setAttribute("data-in", ""));
      return;
    }
    let list: HTMLElement[] = [];
    let raf = 0;
    const check = () => {
      raf = 0;
      const line = window.innerHeight * 0.9;
      const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
      list = list.filter((x) => {
        const r = x.getBoundingClientRect();
        if (atEnd || r.top < line || r.bottom < 0) {
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
      list = Array.from(el.querySelectorAll<HTMLElement>(SEL)).filter((x) => !x.closest(`.${st.gateWrap}`));
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
  }, [root, ready, all]);
}

function Img({ src, className, style, eager, a }: { src: string; className?: string; style?: CSSProperties; eager?: boolean; a?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" draggable={false} data-a={a} loading={eager ? "eager" : "lazy"} decoding="async" className={cx(st.img, className)} style={style} />;
}

/** Figma qutisi → absolute joylashuv (ustun yoki kanvas birligida) */
const at = (b: Box, extra?: CSSProperties): CSSProperties => ({
  position: "absolute",
  left: U(b[0]),
  top: U(b[1]),
  width: U(b[2]),
  height: U(b[3]),
  ...extra,
});

/** Uzun ism/matn bir qatorga sig‘masa — shrift kichrayadi (kesilmaydi, toshmaydi) */
function Fit({ children, base, max, className, style, deps }: { children: ReactNode; base: number; max: number; className?: string; style?: CSSProperties; deps: unknown }) {
  const ref = useRef<HTMLSpanElement>(null);
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
  return (
    <span ref={ref} className={cx("inline-block whitespace-nowrap", className)} style={style}>
      {children}
    </span>
  );
}

/** Uzun, bo‘shliqli ism — ikki teng qatorga (har biri Fit bilan); qisqasi — bitta qator */
const splitName = (text: string, limit = 12): string[] => {
  const t = text.trim();
  if (!t.includes(" ") || [...t].length <= limit) return [t];
  const mid = t.length / 2;
  let cut = -1;
  for (let i = 0; i < t.length; i++) if (t[i] === " " && (cut < 0 || Math.abs(i - mid) < Math.abs(cut - mid))) cut = i;
  return [t.slice(0, cut).trim(), t.slice(cut + 1).trim()];
};

/** So‘zma-so‘z ochilish (`\n` — qator oxiri) */
function Words({ text, d0 = 0, step = 0.05 }: { text: string; d0?: number; step?: number }) {
  const parts = text.split(/(\s+)/);
  let k = 0;
  return (
    <>
      {parts.map((w, i) =>
        /^\s+$/.test(w) ? (
          w.includes("\n") ? <br key={i} /> : w
        ) : (
          <span key={i} data-w className={st.word} style={vars({ "--d": `${Math.min(2.4, d0 + step * k++).toFixed(2)}s` })}>
            {w}
          </span>
        ),
      )}
    </>
  );
}

/** Harfma-harf (kirishda) */
function Letters({ text, d0 = 0, step = 0.05 }: { text: string; d0?: number; step?: number }) {
  return (
    <>
      {[...text].map((ch, i) => (
        <span key={i} data-w className={st.ch} style={vars({ "--d": `${(d0 + i * step).toFixed(2)}s` })}>
          {ch}
        </span>
      ))}
    </>
  );
}

/** Qorong‘ulik qatlami: butun maydon to‘q, ichida teshik (kalit / ark / nur doirasi); Figma’dagi yumshoq chet (blur) bilan */
function Dark({ box, view, d, sd, className, style }: { box: Box; view: [number, number]; d: string; sd: number; className?: string; style?: CSSProperties }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={cx(st.dark, className)} viewBox={`0 0 ${view[0]} ${view[1]}`} preserveAspectRatio="none" aria-hidden style={{ ...at(box), ...style }}>
      <defs>
        <filter id={`b${id}`} x="0" y="0" width={view[0]} height={view[1]} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={sd} />
        </filter>
      </defs>
      <path d={d} fillRule="evenodd" clipRule="evenodd" fill="#120C08" filter={`url(#b${id})`} />
    </svg>
  );
}

/** Oltin kontur (Figma: #C8A46A, 55%, 1px); `draw` — chizilib paydo bo‘ladi */
function Gold({ box, view, d, className, style, a, delay = 0, dur = 1.6 }: { box: Box; view: [number, number]; d: string; className?: string; style?: CSSProperties; a?: string; delay?: number; dur?: number }) {
  return (
    <svg className={cx(st.gold, className)} viewBox={`0 0 ${view[0]} ${view[1]}`} aria-hidden data-a={a} style={vars({ ...at(box), "--d": `${delay}s`, "--t": `${dur}s`, ...(style as Record<string, string>) })}>
      <path d={d} fill="none" stroke="#C8A46A" strokeOpacity={0.55} strokeWidth={1} pathLength={1} className={st.goldPath} />
    </svg>
  );
}

/* ═════════════ 00 · Kalit teshigi — scroll bilan teshik kattalashadi, tomoshabin «ichkariga kiradi» ═════════════ */
const HERO = {
  m: {
    W: 390,
    H: 844,
    photo: [26.114, 119, 337.771, 600] as Box,
    dark: {
      box: [-127, -127, 644, 1098] as Box,
      view: [644, 1098] as [number, number],
      sd: 3.5,
      d: "M7 7H637V1091H7V7ZM379.6 548.8L422.8 750.4H221.2L264.4 548.8C248.281 536.711 236.374 519.856 230.367 500.624C224.359 481.392 224.555 460.757 230.926 441.642C237.298 422.527 249.522 405.902 265.868 394.121C282.213 382.34 301.851 376 322 376C342.149 376 361.787 382.34 378.132 394.121C394.478 405.902 406.702 422.527 413.074 441.642C419.445 460.757 419.641 481.392 413.633 500.624C407.626 519.856 395.719 536.711 379.6 548.8Z",
    },
    gold: {
      box: [78.882, 228.5, 232.237, 430] as Box,
      view: [232.237, 430] as [number, number],
      d: "M182.118 198.5L231.618 429.5H0.618494L50.1185 198.5C31.6488 184.648 18.0058 165.335 11.122 143.298C4.23819 121.262 4.46256 97.6173 11.7633 75.7149C19.0641 53.8126 33.0712 34.7626 51.8004 21.2634C70.5296 7.76412 93.0314 0.5 116.118 0.5C139.206 0.5 161.707 7.76412 180.437 21.2634C199.166 34.7626 213.173 53.8126 220.474 75.7149C227.774 97.6173 227.999 121.262 221.115 143.298C214.231 165.335 200.588 184.648 182.118 198.5Z",
    },
    /** teshik markazi — kattalashish nuqtasi */
    c: [195, 436] as [number, number],
    /** surat masshtabi ≥ k × teshik masshtabi (teshik hech qachon surat chetidan chiqmaydi) */
    k: 0.7,
  },
  l: {
    W: 1440,
    H: 900,
    photo: [499.21, -41.4, 416.585, 740] as Box,
    dark: {
      box: [-127, -127, 1694, 1154] as Box,
      view: [1694, 1154] as [number, number],
      sd: 3.5,
      d: "M7 7H1687V1147H7V7ZM931 469L994 763H700L763 469C739.493 451.37 722.129 426.79 713.368 398.743C704.607 370.696 704.892 340.604 714.184 312.728C723.476 284.852 741.303 260.607 765.141 243.426C788.978 226.245 817.616 217 847 217C876.384 217 905.022 226.245 928.859 243.426C952.697 260.607 970.524 284.852 979.816 312.728C989.108 340.604 989.393 370.696 980.632 398.743C971.871 426.79 954.507 451.37 931 469Z",
    },
    gold: {
      box: [553.482, 63.5, 333.037, 617.2] as Box,
      view: [333.037, 617.2] as [number, number],
      d: "M261.319 284.9L332.419 616.7H0.618494L71.7185 284.9C45.1894 265.003 25.5931 237.264 15.7054 205.61C5.81774 173.957 6.13998 139.996 16.6266 108.536C27.1131 77.0763 47.2323 49.7136 74.1343 30.3237C101.036 10.9339 133.357 0.5 166.519 0.5C199.68 0.5 232.001 10.9339 258.903 30.3237C285.805 49.7136 305.924 77.0763 316.41 108.536C326.897 139.996 327.219 173.957 317.332 205.61C307.444 237.264 287.848 265.003 261.319 284.9Z",
    },
    c: [720, 363] as [number, number],
    k: 0.85,
  },
};
/** Teshik masshtabi (Motion 00: 1 → 14): ekran nisbatiga qarab hisoblanadi — o = 1 da teshik ekranni endigina to‘liq qoplaydi */
const holeScale = (o: number, end: number) => Math.pow(end, Math.pow(o, 1.3));
/** transform-origin: nuqta (x, y) — quti ichida foizda */
const origin = (b: Box, c: [number, number]) => `${(((c[0] - b[0]) / b[2]) * 100).toFixed(3)}% ${(((c[1] - b[1]) / b[3]) * 100).toFixed(3)}%`;

function Gate({ d, wide, onStart, still = false }: { d: D; wide: boolean; onStart: () => void; still?: boolean }) {
  const t = useT();
  const wrap = useRef<HTMLDivElement>(null);
  const cb = useRef(onStart);
  cb.current = onStart;
  const G = wide ? HERO.l : HERO.m;
  useEffect(() => {
    const el = wrap.current;
    if (!el || still) return;
    const stage = el.firstElementChild as HTMLElement | null;
    const photo = stage?.querySelector<HTMLElement>(`.${st.gPhoto}`) ?? null;
    let raf = 0;
    let cur = 0;
    let target = 0;
    let started = false;
    // oxirgi masshtablar (ekran nisbatiga qarab): surat — butun ekranni qoplaguncha, teshik — ekran chetlari teshik ichida qolguncha
    let pe = 1.5;
    let se = 4;
    const hole = stage?.querySelector<SVGPathElement>(`.${st.gDark} path`) ?? null;
    const measure = () => {
      if (!stage || !photo) return;
      const sw = stage.clientWidth;
      const sh = stage.clientHeight;
      const l = photo.offsetLeft;
      const tp = photo.offsetTop;
      const w = photo.offsetWidth;
      const h = photo.offsetHeight;
      if (!w || !h) return;
      const ox = l + ((G.c[0] - G.photo[0]) / G.photo[2]) * w;
      const oy = tp + ((G.c[1] - G.photo[1]) / G.photo[3]) * h;
      const pv = Math.max(oy / (oy - tp), (sh - oy) / (tp + h - oy));
      const pf = Math.max(pv, ox / (ox - l), (sw - ox) / (l + w - ox));
      // keng ekranda portret surat enini to‘ldirsa yuzlar kesiladi — bo‘yiga to‘ldiriladi, yon chetlari qorong‘ulikka yumshoq o‘tadi
      const tall = pf / pv > 1.35;
      el.toggleAttribute("data-tall", tall);
      pe = Math.max(1, 1.02 * (tall ? pv : pf));
      // teshik: ekran chetidagi nuqtalar (6% tashqarida) teshik ichida bo‘ladigan eng kichik masshtab
      const u = w / G.photo[2];
      const fx = sw / 2 - (G.W / 2) * u;
      const fy = sh - G.H * u;
      const pts: [number, number][] = [];
      for (let i = 0; i <= 8; i++) {
        const a = -0.06 + (1.12 * i) / 8;
        pts.push([a * sw, -0.06 * sh], [a * sw, 1.06 * sh], [-0.06 * sw, a * sh], [1.06 * sw, a * sh]);
      }
      const inside = (s: number) =>
        !!hole &&
        pts.every(([px, py]) => {
          const x = G.c[0] + ((px - fx) / u - G.c[0]) / s - G.dark.box[0];
          const y = G.c[1] + ((py - fy) / u - G.c[1]) / s - G.dark.box[1];
          if (x < 0 || y < 0 || x > G.dark.view[0] || y > G.dark.view[1]) return false;
          try {
            return !hole.isPointInFill(new DOMPoint(x, y));
          } catch {
            return false;
          }
        });
      let lo = 1;
      let hi = 40;
      if (!inside(hi)) se = 14;
      else {
        for (let i = 0; i < 22; i++) {
          const m = (lo + hi) / 2;
          if (inside(m)) hi = m;
          else lo = m;
        }
        se = Math.max(1.5, hi);
      }
    };
    const read = () => {
      const r = el.getBoundingClientRect();
      const s = stage?.offsetHeight || window.innerHeight;
      const D = Math.max(1, r.height - 2 * s);
      target = clamp01(-r.top / D);
    };
    const apply = (o: number) => {
      const sh = holeScale(o, se);
      // surat hech qachon teshikdan kichik emas (k × teshik) va o = 1 da ekranni to‘liq qoplaydi
      const sp = Math.min(pe, Math.max(1, G.k * sh, 1 + ((pe - 1) * (sh - 1)) / Math.max(0.01, se - 1)));
      el.style.setProperty("--o", o.toFixed(4));
      el.style.setProperty("--sh", sh.toFixed(4));
      el.style.setProperty("--sp", sp.toFixed(4));
      if (!started && o > 0.004) {
        started = true;
        cb.current();
      }
    };
    const loop = () => {
      cur += (target - cur) * 0.12;
      if (Math.abs(target - cur) < 0.0008) cur = target;
      apply(cur);
      raf = cur === target ? 0 : requestAnimationFrame(loop);
    };
    const on = () => {
      read();
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onResize = () => {
      measure();
      apply(cur);
      on();
    };
    measure();
    read();
    cur = target;
    apply(cur);
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, [still, G]);

  const { W, H } = G;
  const pageU = wide ? CANVAS_L : COL_M;
  // sahna koordinatasi: gorizontal markazdan, vertikal — pastki chetdan (baland ekranda tepada fon ko‘payadi)
  const X = (x: number) => `calc(50% + ${U(x - W / 2)})`;
  const Y = (y: number) => `calc(100% - ${U(H - y)})`;
  const place = (b: Box, extra?: CSSProperties): CSSProperties => ({
    position: "absolute",
    left: X(b[0]),
    top: Y(b[1]),
    width: U(b[2]),
    height: U(b[3]),
    ...extra,
  });
  const line = t("Bir eshik ochildi — va butun dunyo shu nurga sig‘di.");
  const cut = line.indexOf(" — ");
  const lines = !wide && cut > 0 ? [line.slice(0, cut + 2), line.slice(cut + 3)] : [line];
  return (
    <div
      ref={wrap}
      className={cx(st.gateWrap, still && st.still)}
      style={vars(still ? { "--u": pageU, "--o": 0, "--sh": 1, "--sp": 1, height: U(H), marginBottom: 0 } : { "--u": `min(${pageU}, calc(100svh / ${H}))` })}
    >
      <div className={st.gate} aria-label={t("Taklifnoma")} style={still ? { position: "relative", height: "100%" } : undefined}>
        {/* Surat — kalit teshigi ortida; scrollda kattalashadi (teshikdan «ichkariga kirish») */}
        <div className={st.gPhoto} style={place(G.photo, { transformOrigin: origin(G.photo, G.c) })}>
          <div className={st.gPhotoIn}>
            <Img src={d.hero} eager className={wide ? st.gPar : undefined} />
          </div>
        </div>
        <Dark box={[0, 0, 0, 0]} view={G.dark.view} d={G.dark.d} sd={G.dark.sd} className={st.gDark} style={place(G.dark.box, { transformOrigin: origin(G.dark.box, G.c) })} />
        <div className={st.gGold} style={place(G.gold.box, { transformOrigin: origin(G.gold.box, G.c) })}>
          <Gold box={[0, 0, 0, 0]} view={G.gold.view} d={G.gold.d} className={st.goldIntro} style={{ left: 0, top: 0, width: "100%", height: "100%" }} />
        </div>
        <div className={st.gText}>
          {wide ? (
            <h1 className={cx(st.cg, st.gNames, "absolute inset-0")}>
              {[d.a, d.b].map((n, i) => {
                if (!n) return null;
                const ls = splitName(n);
                const fs = ls.length > 1 ? 80 : 104;
                return (
                  <span key={i} className={cx("absolute flex flex-col", i ? "items-start text-left" : "items-end text-right")} style={{ left: X(i ? 900 : 120), top: Y(382 - (ls.length * fs) / 2), width: U(420), lineHeight: 1, color: "var(--ink)" }}>
                    {ls.map((l, k) => (
                      <span key={k} className="block" style={{ height: U(fs) }}>
                        <Fit base={fs} max={420} deps={l}>
                          {l}
                        </Fit>
                      </span>
                    ))}
                  </span>
                );
              })}
            </h1>
          ) : (
            <h1 className={cx(st.cg, st.gNames, "absolute inset-x-0 text-center")} style={{ top: Y(d.b ? 64 : 110), lineHeight: 1, color: "var(--ink)" }}>
              <span className="block" style={{ height: U(58) }}>
                <Fit base={58} max={360} deps={d.a}>
                  {d.a}
                </Fit>
              </span>
              {d.b && (
                <>
                  <span className={cx(st.cgi, "block")} style={{ marginTop: U(2), height: U(28), fontSize: U(28), color: "var(--gold)" }}>
                    {t("va")}
                  </span>
                  <span className="block" style={{ marginTop: U(4), height: U(58) }}>
                    <Fit base={58} max={360} deps={d.b}>
                      {d.b}
                    </Fit>
                  </span>
                </>
              )}
            </h1>
          )}
          <p
            className={cx(st.cgi, st.gLine, "absolute text-center")}
            style={{
              left: wide ? X(0) : X(30),
              width: U(wide ? 1440 : 330),
              top: Y(wide ? 780 : 680),
              fontSize: U(wide ? 28 : 22),
              lineHeight: wide ? 1.211 : 1.25,
              color: "var(--ink)",
            }}
          >
            {lines.map((l, i) => (
              <span key={i} className="block">
                {l}
              </span>
            ))}
          </p>
          {d.dots && (
            <p
              className={cx(st.mr, st.gDate, "absolute inset-x-0 text-center")}
              style={{
                top: Y(wide ? 830 : 770),
                fontSize: U(wide ? 14 : 13),
                letterSpacing: U(wide ? 5.6 : 5.2),
                lineHeight: 1.22,
                color: "var(--gold)",
                whiteSpace: "nowrap",
              }}
            >
              {d.dots}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═════════════ 01 · Nur — kutubxona, taklif matni ═════════════ */
/** Nur ichida suzayotgan chang zarralari (Motion 01: canvas, 40 ta) — faqat bo‘lim ko‘rinib turganda */
function Dust({ still }: { still: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || still) return;
    if (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let vis = false;
    let w = 0;
    let h = 0;
    const N = 40;
    // nur ustuni: chap yuqoridagi derazadan pastga-o‘ngga (Figma kutubxona surati), 390×900 kanvasda
    const beam = (y: number) => 30 + (y / 900) * 190;
    const ps = Array.from({ length: N }, () => {
      const y = Math.random() * 820 + 40;
      return { x: beam(y) + (Math.random() - 0.5) * 150, y, r: 0.6 + Math.random() * 1.6, a: 0.25 + Math.random() * 0.55, vx: (Math.random() - 0.5) * 0.08, vy: -0.05 - Math.random() * 0.12, ph: Math.random() * 6.28 };
    });
    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform((dpr * w) / 390, 0, 0, (dpr * h) / 900, 0, 0);
    };
    const tick = (tm: number) => {
      raf = 0;
      if (!vis) return;
      ctx.clearRect(0, 0, 390, 900);
      for (const p of ps) {
        p.x += p.vx + Math.sin(tm / 2400 + p.ph) * 0.05;
        p.y += p.vy;
        if (p.y < 30) {
          p.y = 860;
          p.x = beam(p.y) + (Math.random() - 0.5) * 150;
        }
        const inBeam = 1 - Math.min(1, Math.abs(p.x - beam(p.y)) / 90);
        const tw = 0.6 + 0.4 * Math.sin(tm / 900 + p.ph);
        ctx.beginPath();
        ctx.fillStyle = `rgba(239,228,210,${(p.a * tw * (0.25 + 0.75 * inBeam)).toFixed(3)})`;
        ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => {
      vis = e.isIntersecting;
      if (vis && !raf) raf = requestAnimationFrame(tick);
    });
    io.observe(cv);
    return () => {
      ro.disconnect();
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [still]);
  return <canvas ref={ref} className={st.dust} aria-hidden />;
}

function Nur({ d, wide, z, still }: { d: D; wide: boolean; z: number; still: boolean }) {
  const t = useT();
  const hello = d.guest ? `${t("Hurmatli {guest}", { guest: d.guest })},` : t("Aziz mehmonimiz,");
  return (
    <Sec wide={wide} z={z} className={st.nur} colStyle={{ minHeight: U(900), paddingTop: U(670), paddingBottom: U(81.5) }}>
      <div className="absolute" style={at([0, 0, 390, 900], { overflow: "hidden" })}>
        <Img src={`${P}/library.webp`} a="zoomOut" style={at([-58.329, 0, 506.657, 900])} />
        {/* Figma «Soya (o‘qilishi uchun)» */}
        <div className={st.nurShade} />
        {/* nur ustuni yorqinlashadi (Motion 01: soya 0.6 → 0) */}
        <div data-a="light" className={st.nurDim} />
        <Dust still={still} />
      </div>
      <p className={cx(st.cgi, "absolute inset-x-0 text-center")} style={{ top: U(80), lineHeight: 1.21, color: "var(--ink)" }}>
        <span data-a="blur" className="inline-block">
          <Fit base={34} max={360} deps={hello}>
            {hello}
          </Fit>
        </span>
      </p>
      {d.message && (
        <p className={cx(st.ml, "relative mx-auto text-center")} style={{ width: U(310), fontSize: U(18), lineHeight: 1.65, color: "var(--ink)", overflowWrap: "anywhere", whiteSpace: "pre-line" }}>
          <Words text={d.message} d0={0.1} step={0.04} />
        </p>
      )}
    </Sec>
  );
}

/* ═════════════ 02 · Sana — eshik tirqishi ═════════════ */
function Digits({ value, run, len, i }: { value: number; run: boolean; len: number; i: number }) {
  const c = useCountUp(value, run, 1400 + i * 150);
  const digits = String(c.value).padStart(len, "0").split("");
  return (
    <span className={st.digits}>
      {digits.map((dg, k) => (
        <span key={c.done ? `${digits.length - k}-${dg}` : `${digits.length - k}`} className={c.done ? st.digit : undefined}>
          {dg}
        </span>
      ))}
    </span>
  );
}

function Sana({ d, wide, z }: { d: D; wide: boolean; z: number }) {
  const units = timerUnits(useLocale());
  const c = useCountdown(d.target);
  const [ref, inView] = useInView<HTMLDivElement>(0.3, true);
  const onP = useCallback((_p: number, r: DOMRect, el: HTMLElement) => {
    // tirqish eni 2 → 150: bo‘lim ekranga kirgandan to markazga kelguncha (scroll-linked)
    const vh = window.innerHeight || 800;
    el.style.setProperty("--v", seg(vh - r.top, vh * 0.25, vh * 0.25 + Math.min(vh, r.height) * 0.75).toFixed(4));
  }, []);
  if (!d.hasDate || !c) return null;
  const vals = [c.d, c.h, c.m, c.s];
  const photo = d.ph[1] || d.ph[0] || `${P}/library.webp`;
  return (
    <Sec wide={wide} z={z} onP={onP} colStyle={{ height: U(900) }}>
      <p data-a="fade" className={cx(st.mm, "absolute inset-x-0 text-center")} style={vars({ top: U(96), fontSize: U(13), letterSpacing: U(7.8), lineHeight: 1.22, color: "var(--gold)", textTransform: "uppercase", whiteSpace: "nowrap", paddingLeft: U(7.8) })}>
        {d.month}
      </p>
      {/* Tirqish (Figma: 150×520, r=75) — eni scrollda 2 → 150 kengayadi, ichida kelin */}
      <div data-v className={st.slit} style={at([120, 150, 150, 520], { borderRadius: U(75) })}>
        <Img src={photo} a="zoom" style={at([-108, 0, 390, 520])} />
      </div>
      <p className={cx(st.cg, "absolute inset-x-0 text-center")} style={{ top: U(290), lineHeight: 1, color: "var(--ink)" }}>
        <span data-a="mask" className={cx(st.bigDay, "inline-block")} style={vars({ fontSize: U(150), "--d": "0.2s" })}>
          {d.day}
        </span>
      </p>
      {d.line && (
        <p data-a="up" className={cx(st.cgi, "absolute inset-x-0 text-center")} style={vars({ top: U(700), lineHeight: 1.21, color: "var(--ink)", "--y": 14, "--d": "0.1s" })}>
          <Fit base={24} max={370} deps={d.line}>
            {d.line}
          </Fit>
        </p>
      )}
      <div ref={ref} className="absolute inset-x-0" style={{ top: U(760), height: U(60) }}>
        {vals.map((v, i) => (
          <div key={i}>
            <div data-a="num" className={cx(st.cg, "absolute text-center")} style={vars({ left: U(35 + i * 80), top: 0, width: U(80), fontSize: U(34), lineHeight: 1.21, color: "var(--ink)", "--d": `${0.15 + i * 0.1}s` })}>
              <Digits value={v} run={inView} len={i === 0 ? Math.max(2, String(vals[0]).length) : 2} i={i} />
            </div>
            <p data-a="fade" className={cx(st.ml, "absolute text-center")} style={vars({ left: U(35 + i * 80), top: U(42), width: U(80), fontSize: U(12), letterSpacing: U(1.2), lineHeight: 1.22, color: "var(--muted)", whiteSpace: "nowrap", "--d": `${0.35 + i * 0.1}s` })}>
              {units[i]}
            </p>
            {i > 0 && <span data-a="lineY" className="absolute" style={vars({ left: U(35 + i * 80), top: U(8), width: U(1), height: U(40), background: "rgba(200,164,106,.35)", "--d": `${0.3 + i * 0.1}s` })} />}
          </div>
        ))}
      </div>
    </Sec>
  );
}

/* ═════════════ 03 · Ikki yuz — kuyov va kelin ═════════════ */
function Capsule({ src, x, y, dir, d0, name, ny }: { src: string; x: number; y: number; dir: 1 | -1; d0: number; name: string; ny: number }) {
  return (
    <div className={st.cap} style={vars({ "--dir": dir })}>
      <div className="absolute" style={at([x - 8, y - 8, 166, 456])}>
        <div data-a="rise" className="absolute overflow-hidden" style={vars({ left: U(8), top: U(8), width: U(150), height: U(440), borderRadius: U(75), "--y": 40, "--d": `${d0}s` })}>
          <Img src={src} a="zoom" style={at([-90, 0, 330, 440])} />
        </div>
        <svg viewBox="0 0 166 456" className="absolute inset-0 size-full overflow-visible" aria-hidden data-a="draw" style={vars({ "--d": `${d0 + 0.3}s`, "--t": "1.8s" })}>
          <rect x="0.5" y="0.5" width="165" height="455" rx="82.5" fill="none" stroke="rgba(200,164,106,.6)" strokeWidth={1} pathLength={1} className={st.goldPath} />
        </svg>
      </div>
      <p data-a="up" className={cx(st.cg, "absolute flex flex-col items-center text-center")} style={vars({ left: U(x - 10), top: U(ny), width: U(170), lineHeight: 1.21, color: "var(--ink)", "--y": 14, "--d": `${d0 + 0.3}s` })}>
        {splitName(name, 10).map((l, k, all) => (
          <Fit key={k} base={all.length > 1 ? 26 : 30} max={168} deps={l}>
            {l}
          </Fit>
        ))}
      </p>
    </div>
  );
}

function Couple({ d, wide, z }: { d: D; wide: boolean; z: number }) {
  const t = useT();
  const onP = useCallback((_p: number, r: DOMRect, el: HTMLElement) => {
    // kapsulalar qarama-qarshi yo‘nalishda suriladi va Figma holatida to‘xtaydi
    const vh = window.innerHeight || 800;
    el.style.setProperty("--v", seg(vh - r.top, 0, vh * 0.5 + r.height * 0.3).toFixed(4));
  }, []);
  const groom = d.ph[2];
  const bride = d.ph[1];
  if (!d.b || !groom || !bride) return null;
  const title = t("Ikki hikoya — bitta yo‘l");
  return (
    <Sec wide={wide} z={z} onP={onP} colStyle={{ height: U(820) }}>
      <div data-v className="absolute inset-0">
        <p data-a="blur" className={cx(st.cgi, "absolute inset-x-0 text-center")} style={{ top: U(70), lineHeight: 1.21, color: "var(--ink)" }}>
          <Fit base={32} max={370} deps={title}>
            {title}
          </Fit>
        </p>
        <Capsule src={groom} x={36} y={160} dir={1} d0={0.1} name={d.a} ny={630} />
        <Capsule src={bride} x={204} y={220} dir={-1} d0={0.25} name={d.b} ny={690} />
      </div>
    </Sec>
  );
}

/* ═════════════ 04 · Kun tartibi — film titrlari ═════════════ */
function Program({ d, wide, z }: { d: D; wide: boolean; z: number }) {
  const t = useT();
  const items = d.program.slice(0, 8);
  const onP = useCallback((_p: number, _r: DOMRect, el: HTMLElement) => {
    // har satr ekran markaziga kelganda to‘liq yorqin, chetlarda xira (0.25)
    const vh = window.innerHeight || 800;
    el.querySelectorAll<HTMLElement>("[data-f]").forEach((row) => {
      const r = row.getBoundingClientRect();
      const k = Math.abs(r.top + r.height / 2 - vh / 2) / (vh * 0.42);
      row.style.setProperty("--f", (1 - clamp01((k - 0.25) / 0.75)).toFixed(3));
    });
  }, []);
  if (!items.length) return null;
  const title = t("Kun tartibi");
  return (
    <Sec wide={wide} z={z} onP={onP} colStyle={{ paddingTop: U(190), paddingBottom: U(100) }}>
      <p data-a="blur" className={cx(st.cgi, "absolute inset-x-0 text-center")} style={{ top: U(80), lineHeight: 1.21, color: "var(--ink)" }}>
        <Fit base={40} max={370} deps={title}>
          {title}
        </Fit>
      </p>
      {items.map((it, i) => (
        <div key={i} data-f className={cx(st.credit, "flex flex-col items-center text-center")}>
          <p data-a="up" className={st.mr} style={vars({ fontSize: U(13), letterSpacing: U(5.2), paddingLeft: U(5.2), lineHeight: 1.22, color: "var(--gold)", whiteSpace: "nowrap", "--y": 18 })}>
            {it.time}
          </p>
          <p data-a="up" className={cx(st.cg, st.clamp3)} style={vars({ marginTop: U(8), width: U(370), fontSize: U(30), lineHeight: 1.21, color: "var(--ink)", "--y": 18, "--d": "0.08s" })}>
            {it.title}
          </p>
          {i < items.length - 1 && <span data-a="lineY" style={vars({ marginTop: U(16), marginBottom: U(10), width: U(1), height: U(24), background: "rgba(200,164,106,.4)", flex: "none", "--d": "0.2s" })} />}
        </div>
      ))}
    </Sec>
  );
}

/* ═════════════ 05 · Bazm manzili — ark deraza ═════════════ */
const ARCH = {
  dark: {
    box: [-125, -119.511, 640, 1136.021] as Box,
    view: [640, 1136.02] as [number, number],
    sd: 2.5,
    d: "M5 5H635V1131.02H5V5ZM180 692.064V405.787C180 370.355 194.75 336.375 221.005 311.321C247.26 286.267 282.87 272.191 320 272.191C357.13 272.191 392.74 286.267 418.995 311.321C445.25 336.375 460 370.355 460 405.787V692.064H180Z",
  },
  gold: {
    box: [44.5, 142.638, 301, 439.957] as Box,
    view: [301, 439.957] as [number, number],
    d: "M0.5 439.457V143.638C0.5 105.676 16.3035 69.2679 44.434 42.4242C72.5644 15.5806 110.718 0.5 150.5 0.5C190.282 0.5 228.436 15.5806 256.566 42.4242C284.696 69.2679 300.5 105.676 300.5 143.638V439.457H0.5Z",
  },
};

function Venue({ d, wide, z, linkable }: { d: D; wide: boolean; z: number; linkable: boolean }) {
  const t = useT();
  const photo = d.ph[3];
  const title = t("Bazm manzili");
  return (
    <Sec wide={wide} z={z} colStyle={{ paddingTop: U(photo ? 640 : 160), paddingBottom: U(90) }}>
      <p data-a="blur" className={cx(st.cgi, "absolute inset-x-0 text-center")} style={{ top: U(70), lineHeight: 1.21, color: "var(--ink)", zIndex: 3 }}>
        <Fit base={40} max={370} deps={title}>
          {title}
        </Fit>
      </p>
      {photo && (
        <>
          {/* deraza qorong‘ulikdan pastdan yuqoriga ochiladi, ichidagi zal 1.2 → 1 yaqinlashadi */}
          <div data-a="window" className="absolute" style={at([0, 140, 390, 450], { overflow: "hidden" })}>
            <Img src={photo} a="zoomIn" style={at([-147.41, 20, 658.927, 440])} />
          </div>
          <Dark box={ARCH.dark.box} view={ARCH.dark.view} d={ARCH.dark.d} sd={ARCH.dark.sd} />
          <Gold box={ARCH.gold.box} view={ARCH.gold.view} d={ARCH.gold.d} a="draw" delay={0.3} dur={2} />
        </>
      )}
      <div className="relative flex flex-col items-center text-center" style={{ zIndex: 3 }}>
        {d.venueTitle && (
          <p data-a="up" className={st.cg} style={vars({ width: U(370), fontSize: U([...d.venueTitle].length > 26 ? 26 : 32), lineHeight: 1.21, color: "var(--ink)", overflowWrap: "anywhere", "--y": 16, "--d": "0.1s" })}>
            {d.venueTitle}
          </p>
        )}
        {d.address && (
          <p data-a="up" className={st.ml} style={vars({ marginTop: U(11), width: U(330), fontSize: U(16), lineHeight: 1.5, color: "var(--muted)", overflowWrap: "anywhere", "--y": 14, "--d": "0.2s" })}>
            {d.address}
          </p>
        )}
        <div data-a="up" className="flex justify-center" style={vars({ marginTop: U(46), gap: U(10), "--y": 14, "--d": "0.3s" })}>
          <a href={linkable ? d.mapUrl : undefined} target="_blank" rel="noopener noreferrer" className={cx(st.mm, st.pill, st.pillFill)} style={{ padding: `${U(14)} ${U(24)}`, fontSize: U(14), letterSpacing: U(0.84) }}>
            {t("Xaritada ochish")}
          </a>
          <a href={linkable ? d.taxi : undefined} target="_blank" rel="noopener noreferrer" className={cx(st.mm, st.pill, st.pillLine)} style={{ padding: `${U(14)} ${U(24)}`, fontSize: U(14), letterSpacing: U(0.84) }}>
            {t("Taksi")}
          </a>
        </div>
      </div>
    </Sec>
  );
}

/* ═════════════ 06 · Dress-kod (ixtiyoriy) — qorong‘i ark karta ═════════════ */
function Dress({ d, wide, z }: { d: D; wide: boolean; z: number }) {
  const t = useT();
  if (!d.dress) return null;
  const x = d.dress;
  const one = x.imgs.length === 1;
  const title = t("Dress-kod");
  const r = `${U(171)} ${U(171)} ${U(28)} ${U(28)}`;
  return (
    <Sec wide={wide} z={z} colStyle={{ paddingTop: U(170), paddingBottom: U(90) }}>
      <p data-a="blur" className={cx(st.cgi, "absolute inset-x-0 text-center")} style={{ top: U(60), lineHeight: 1.21, color: "var(--ink)" }}>
        <Fit base={40} max={370} deps={title}>
          {title}
        </Fit>
      </p>
      <p data-a="up" className={cx(st.ml, "absolute inset-x-0 text-center")} style={vars({ top: U(118), lineHeight: 1.22, color: "var(--muted)", "--y": 10, "--d": "0.15s" })}>
        <Fit base={15} max={370} deps={x.tone}>
          {x.tone}
        </Fit>
      </p>
      <div data-a="rise" className="relative mx-auto" style={vars({ width: U(342), "--y": 70 })}>
        <div className={st.dressCard} style={{ borderRadius: r }} />
        {/* oltin chegara tepadan pastga chiziladi */}
        <div data-a="edge" className={st.dressEdge} style={vars({ borderRadius: r, borderWidth: U(1), "--d": "0.3s" })} />
        <div className="relative flex flex-col items-center text-center" style={{ padding: `${U(75)} ${U(25)} ${U(29)}`, gap: U(12) }}>
          <p className={st.cgi} style={{ fontSize: U(40), lineHeight: 1.1, color: "var(--ink)", width: "100%", overflowWrap: "anywhere" }}>
            {x.title}
          </p>
          <p className={st.mr} style={{ fontSize: U(16), lineHeight: 1.22, color: "var(--gold)", width: "100%" }}>
            {x.sub}
          </p>
          <div className="flex w-full justify-center" style={{ gap: U(10) }}>
            {x.imgs.map((im, i) => (
              <div key={im.src} className="flex flex-col items-center" style={{ gap: U(8), flex: one ? "none" : "1 1 0", width: one ? U(294) : undefined, minWidth: 0 }}>
                <div
                  data-a="up"
                  className="overflow-hidden"
                  style={vars({
                    width: U(one ? 230 : 142),
                    height: U(one ? 265 : 164),
                    borderRadius: one ? `${U(115)} ${U(115)} ${U(14)} ${U(14)}` : `${U(71)} ${U(71)} ${U(14)} ${U(14)}`,
                    background: "#fff",
                    "--y": 24,
                    "--d": `${0.35 + i * 0.12}s`,
                  })}
                >
                  <Img src={im.src} />
                </div>
                <p className={st.mm} style={{ fontSize: U(13), letterSpacing: U(1.56), lineHeight: 1.22, color: "var(--gold)", whiteSpace: "nowrap" }}>
                  {im.label}
                </p>
              </div>
            ))}
          </div>
          <p className={st.mr} style={{ fontSize: U(16), lineHeight: 1.5, color: "var(--gold)", width: "100%", overflowWrap: "anywhere" }}>
            {x.note}
          </p>
        </div>
      </div>
    </Sec>
  );
}

/* ═════════════ 07 · Lahza — nur ostidagi qo‘llar ═════════════ */
const HANDS = {
  box: [-160, -160, 710, 1080] as Box,
  view: [710, 1080] as [number, number],
  sd: 20,
  d: "M40 40H670V1040H40V40ZM185 440C185 479.782 202.911 517.936 234.792 546.066C266.673 574.196 309.913 590 355 590C400.087 590 443.327 574.196 475.208 546.066C507.089 517.936 525 479.782 525 440C525 400.218 507.089 362.064 475.208 333.934C443.327 305.803 400.087 290 355 290C309.913 290 266.673 305.803 234.792 333.934C202.911 362.064 185 400.218 185 440Z",
};

function Moment({ d, wide, z, still }: { d: D; wide: boolean; z: number; still: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const photo = d.ph[4];
  // nur doirasi: laptopda kursor, telefonda qurilma qiyshayishi bilan siljiydi («qo‘l chirog‘i»)
  useEffect(() => {
    const el = ref.current;
    if (!el || still || !photo) return;
    let raf = 0;
    let x = 0;
    let y = 0;
    const put = () => {
      raf = 0;
      el.style.setProperty("--tx", x.toFixed(3));
      el.style.setProperty("--ty", y.toFixed(3));
    };
    const q = () => {
      if (!raf) raf = requestAnimationFrame(put);
    };
    const onMove = (e: PointerEvent) => {
      x = (e.clientX / window.innerWidth) * 2 - 1;
      y = (e.clientY / window.innerHeight) * 2 - 1;
      q();
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      x = Math.max(-1, Math.min(1, e.gamma / 25));
      y = Math.max(-1, Math.min(1, (e.beta - 45) / 25));
      q();
    };
    const fine = typeof matchMedia !== "undefined" && matchMedia("(pointer: fine)").matches;
    if (fine) window.addEventListener("pointermove", onMove, { passive: true });
    else window.addEventListener("deviceorientation", onTilt);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("deviceorientation", onTilt);
      cancelAnimationFrame(raf);
    };
  }, [still, photo]);
  if (!photo && !d.quote) return null;
  return (
    <Sec wide={wide} z={z} colStyle={{ paddingTop: U(photo ? 500 : 120), paddingBottom: U(124) }}>
      {photo && (
        <div ref={ref} className="absolute" style={at([0, 0, 390, 640], { overflow: "hidden" })}>
          <Img src={photo} a="fade" style={vars({ ...at([-45.071, 120, 479.219, 320]), "--t": "1.6s" })} />
          <div className={st.torch}>
            <Dark box={HANDS.box} view={HANDS.view} d={HANDS.d} sd={HANDS.sd} />
          </div>
        </div>
      )}
      {d.quote && (
        <div className="relative mx-auto" style={{ width: U(330) }}>
          <p className={cx(st.cgi, st.clamp5, "text-center")} style={{ fontSize: U(24), lineHeight: 1.35, color: "var(--ink)" }}>
            <Words text={`“${d.quote}”`} d0={0.15} step={0.06} />
          </p>
        </div>
      )}
      {d.sign && (
        <p data-a="fade" className={cx(st.ml, "relative text-center")} style={vars({ marginTop: U(d.quote ? 24 : 0), fontSize: U(13), letterSpacing: U(3.9), lineHeight: 1.22, color: "var(--gold)", whiteSpace: "nowrap", "--d": "0.6s" })}>
          {d.sign}
        </p>
      )}
    </Sec>
  );
}

/* ═════════════ 08 · Anketa — javob ═════════════ */
function Rsvp({ d, wide, slug, mode, z }: { d: D; wide: boolean; slug: string; mode: InvitationSiteProps["mode"]; z: number }) {
  const t = useT();
  const live = mode === "live";
  const [name, setName] = useState("");
  const [status, setStatus] = useState<RsvpStatus>("coming");
  const [count, setCount] = useState(2);
  const [wish, setWish] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState<null | RsvpStatus>(null);
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    if (d.guest && !name) setName(d.guest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.guest]);
  useEffect(() => {
    if (!live) return;
    const s = loadSavedRsvp(slug);
    if (!s) return;
    setToken(s.token);
    fetchSavedAnswer(slug, s.token).then((a) => {
      if (!a) return;
      setName(a.name);
      setStatus(a.status === "not_coming" ? "not_coming" : "coming");
      setCount(a.count || 1);
      setWish(a.wish);
      setSent(a.status);
    });
  }, [live, slug]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErr(t("Ismingizni yozing"));
    setErr(null);
    if (!live) return setSent(status);
    setBusy(true);
    try {
      const res = await fetch(token ? `/api/i/${slug}/rsvp/${token}` : `/api/i/${slug}/rsvp`, {
        method: token ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), status, count: status === "coming" ? count : 0, wish: wish.trim() || null }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; editToken?: string };
      if (!res.ok || !j.ok) throw new Error(t(j.error || "Javob yuborilmadi. Qayta urinib ko‘ring."));
      const tk = token ?? j.editToken!;
      saveRsvp(slug, tk, name.trim());
      setToken(tk);
      setSent(status);
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const label = (s: string) => (
    <p className={cx(st.mr, st.lbl)} style={{ fontSize: U(12), letterSpacing: U(1.92) }}>
      {s}
    </p>
  );
  const title = t("Javobingizni kutamiz");
  const sub = d.rsvpUntil ? t("Iltimos, {date} bildiring", { date: d.rsvpUntil }) : t("Iltimos, javobingizni qoldiring");
  return (
    <Sec wide={wide} z={z} id="kalit-javob" colStyle={{ paddingTop: U(170), paddingBottom: U(100) }}>
      <p data-a="blur" className={cx(st.cgi, "absolute inset-x-0 text-center")} style={{ top: U(60), lineHeight: 1.21, color: "var(--ink)" }}>
        <Fit base={38} max={370} deps={title}>
          {title}
        </Fit>
      </p>
      <p data-a="up" className={cx(st.ml, "absolute inset-x-0 text-center")} style={vars({ top: U(114), lineHeight: 1.22, color: "var(--muted)", "--y": 10, "--d": "0.15s" })}>
        <Fit base={15} max={370} deps={sub}>
          {sub}
        </Fit>
      </p>
      <div data-a="rise" className="relative mx-auto" style={vars({ width: U(342), "--y": 60 })}>
        <div className={st.formBg} style={{ borderRadius: U(4) }} />
        <div data-a="edge" className={st.formEdge} style={vars({ borderRadius: U(4), borderWidth: U(1), "--d": "0.3s" })} />
        {sent ? (
          <div key="thanks" className={cx(st.thanks, "relative flex flex-col items-center text-center")} style={{ padding: `${U(56)} ${U(28)} ${U(48)}`, gap: U(16) }}>
            <span className={st.glow} aria-hidden />
            <p className={cx(st.cgi, "relative")} style={{ fontSize: U(sent === "not_coming" ? 44 : 34), lineHeight: 1.2, color: "var(--ink)", overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Rahmat!") : t("Rahmat! Joyingiz band qilindi")}
            </p>
            <p className={cx(st.ml, "relative")} style={{ fontSize: U(15), color: "var(--muted)", lineHeight: 1.5, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Javobingiz uchun rahmat — sizni duolarimizda eslaymiz.") : t("{name} — {count} kishi. Javobingiz yetkazildi.", { name: name.trim() || t("Javobingiz"), count })}
            </p>
            <button type="button" onClick={() => setSent(null)} className={cx(st.mr, "relative")} style={{ color: "var(--gold)", fontSize: U(14), textDecoration: "underline", textUnderlineOffset: 3 }}>
              {t("Javobni o‘zgartirish")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="relative flex flex-col items-start" style={{ padding: `${U(33)} ${U(29)}`, gap: U(14) }}>
            {label(t("ISMINGIZ"))}
            <label className={st.fieldWrap} style={{ height: U(40) }}>
              <input className={cx(st.cgi, st.field)} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={t("Ismingiz…")} aria-label={t("Ismingiz")} style={{ fontSize: U(22) }} />
            </label>
            <div className="flex w-full" role="radiogroup" aria-label={t("Kelasizmi?")} style={{ gap: U(8) }}>
              {(
                [
                  ["coming", "Albatta kelaman"],
                  ["not_coming", "Kela olmayman"],
                ] as const
              ).map(([s, l]) => (
                <button key={s} type="button" role="radio" aria-checked={status === s} onClick={() => setStatus(s)} className={cx(st.mm, st.choice)} style={{ padding: `${U(14)} ${U(6)}`, minHeight: U(47), fontSize: U(14), borderWidth: U(1) }}>
                  <span style={{ overflowWrap: "anywhere" }}>{t(l)}</span>
                </button>
              ))}
            </div>
            {status === "coming" && (
              <div className="flex w-full items-center" style={{ gap: U(6) }}>
                <p className={st.ml} style={{ flex: "1 1 0", minWidth: 0, fontSize: U(14), lineHeight: 1.22, color: "var(--ink)" }}>
                  {t("Necha kishi bo‘lasiz?")}
                </p>
                <button type="button" className={cx(st.ml, st.step)} disabled={count <= 1} onClick={() => setCount((c) => Math.max(1, c - 1))} aria-label={t("Kamaytirish")} style={{ width: U(32), height: U(32), fontSize: U(18), borderWidth: U(1) }}>
                  −
                </button>
                <span className={st.cg4} style={{ width: U(32), textAlign: "center", fontSize: U(22), lineHeight: 1.21, color: "var(--ink)" }} aria-live="polite">
                  {count}
                </span>
                <button type="button" className={cx(st.ml, st.step)} disabled={count >= 20} onClick={() => setCount((c) => Math.min(20, c + 1))} aria-label={t("Ko‘paytirish")} style={{ width: U(32), height: U(32), fontSize: U(18), borderWidth: U(1) }}>
                  +
                </button>
              </div>
            )}
            {label(t("TILAKLARINGIZ"))}
            <label className={st.fieldWrap} style={{ height: U(64) }}>
              <textarea className={cx(st.cgi, st.field)} value={wish} onChange={(e) => setWish(e.target.value)} maxLength={500} placeholder={t("Yosh oilaga bir-ikki so‘z…")} aria-label={t("TILAKLARINGIZ")} style={{ fontSize: U(22), height: "100%" }} />
            </label>
            {err && (
              <p className={st.mr} style={{ color: "#e08a7a", fontSize: U(14) }}>
                {err}
              </p>
            )}
            <button type="submit" disabled={busy} className={cx(st.mm, st.btnGold)} style={{ padding: `${U(16)} ${U(12)}`, fontSize: U(15), letterSpacing: U(0.9), opacity: busy ? 0.7 : 1 }}>
              {busy ? t("Yuborilmoqda…") : t("Javobni yuborish")}
            </button>
          </form>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 09 · Final — kalit teshigi yopiladi, kalit suzib keladi ═════════════ */
const FINAL = {
  m: {
    W: 390,
    H: 844,
    photo: [102.113, 176.2, 185.774, 330] as Box,
    dark: {
      box: [-125, -125, 640, 1094] as Box,
      view: [640, 1094] as [number, number],
      sd: 2.5,
      d: "M5 5H635V1089H5V5ZM351.2 466.6L374.6 575.8H265.4L288.8 466.6C280.069 460.052 273.619 450.922 270.365 440.505C267.111 430.087 267.217 418.91 270.668 408.556C274.12 398.202 280.741 389.197 289.595 382.815C298.449 376.434 309.086 373 320 373C330.914 373 341.551 376.434 350.405 382.815C359.259 389.197 365.88 398.202 369.332 408.556C372.783 418.91 372.889 430.087 369.635 440.505C366.381 450.922 359.931 460.052 351.2 466.6Z",
    },
    gold: {
      box: [131.382, 239.5, 127.237, 235] as Box,
      view: [127.237, 235] as [number, number],
      d: "M99.6185 108.5L126.618 234.5H0.618494L27.6185 108.5C17.5441 100.944 10.1025 90.4102 6.34768 78.39C2.59287 66.3699 2.71525 53.4731 6.69749 41.5263C10.6797 29.5796 18.32 19.1887 28.5359 11.8255C38.7518 4.46224 51.0255 0.5 63.6185 0.5C76.2114 0.5 88.4852 4.46224 98.7011 11.8255C108.917 19.1887 116.557 29.5796 120.539 41.5263C124.522 53.4731 124.644 66.3699 120.889 78.39C117.134 90.4102 109.693 100.944 99.6185 108.5Z",
    },
    c: [195, 352] as [number, number],
    /** yopilish masshtabi nuqtasi — kontur tepasi (teshik pastga, kalit tomon o‘sadi; ustidagi ismlarga tegmaydi) */
    o: [195, 240] as [number, number],
    key: [67.31, 560, 223.321, 171.861] as Box,
    keyIn: [200, 133.189] as [number, number],
    title: { top: 90, fs: 50 },
    names: { top: 150, fs: 24 },
    date: { top: 760, fs: 13, ls: 5.2 },
  },
  l: {
    W: 1440,
    H: 900,
    photo: [588.72, 126.6, 247.699, 440] as Box,
    dark: {
      box: [-125, -125, 1690, 1150] as Box,
      view: [1690, 1150] as [number, number],
      sd: 2.5,
      d: "M5 5H1685V1145H5V5ZM887 471L918.5 618H771.5L803 471C791.247 462.185 782.565 449.895 778.184 435.872C773.803 421.848 773.946 406.802 778.592 392.864C783.238 378.926 792.152 366.803 804.07 358.213C815.989 349.623 830.308 345 845 345C859.692 345 874.011 349.623 885.93 358.213C897.848 366.803 906.762 378.926 911.408 392.864C916.054 406.802 916.197 421.848 911.816 435.872C907.435 449.895 898.753 462.185 887 471Z",
    },
    gold: {
      box: [635.382, 201.5, 169.237, 313] as Box,
      view: [169.237, 313] as [number, number],
      d: "M132.618 144.5L168.618 312.5H0.618494L36.6185 144.5C23.186 134.426 13.2638 120.38 8.25741 104.353C3.251 88.3265 3.41419 71.1307 8.72384 55.2018C14.0335 39.2728 24.2205 25.4183 37.8417 15.6006C51.4629 5.783 67.8279 0.5 84.6185 0.5C101.409 0.5 117.774 5.783 131.395 15.6006C145.017 25.4183 155.203 39.2728 160.513 55.2018C165.823 71.1307 165.986 88.3265 160.98 104.353C155.973 120.38 146.051 134.426 132.618 144.5Z",
    },
    c: [720, 357] as [number, number],
    o: [720, 202] as [number, number],
    key: [554, 580, 290.317, 223.419] as Box,
    keyIn: [260, 173.145] as [number, number],
    title: { top: 70, fs: 80 },
    names: { top: 160, fs: 30 },
    date: { top: 820, fs: 14, ls: 5.6 },
  },
};

function Final({ d, wide, z, onSeen }: { d: D; wide: boolean; z: number; onSeen: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const G = wide ? FINAL.l : FINAL.m;
  const { W, H } = G;
  const onP = useCallback(
    (_p: number, r: DOMRect) => {
      const el = ref.current;
      if (!el) return;
      const vh = window.innerHeight || 800;
      // teshik markazi ekran pastidan 45% balandligigacha ko‘tarilguncha yopiladi; sahifa oxiri undan oldin kelsa — oxirida tugaydi
      const y = window.scrollY;
      const c = r.top + y + (r.height / H) * G.c[1];
      const max = document.documentElement.scrollHeight - vh;
      const s0 = Math.min(c - vh, max - vh * 0.35);
      const s1 = Math.max(s0 + 1, Math.min(c - vh * 0.45, max));
      const f = seg(y, s0, s1);
      el.style.setProperty("--fc", f.toFixed(4));
      if (f > 0.5) onSeen();
    },
    [onSeen, H, G],
  );
  const X = (x: number) => `calc(50% + ${U(x - W / 2)})`;
  const place = (b: Box, extra?: CSSProperties): CSSProperties => ({ position: "absolute", left: X(b[0]), top: U(b[1]), width: U(b[2]), height: U(b[3]), ...extra });
  const title = t("Sizni kutamiz");
  const [kx, ky, kw, kh] = G.key;
  return (
    <Sec wide={false} z={z} onP={onP} style={vars({ height: U(H), "--u": wide ? CANVAS_L : COL_M })} colStyle={{ width: "100%", height: "100%" }}>
      <div ref={ref} className={cx(st.finalWrap, "absolute inset-0")}>
        <div className={st.fPhoto} style={place(G.photo, { transformOrigin: origin(G.photo, G.o) })}>
          <Img src={d.hero} />
        </div>
        <Dark box={[0, 0, 0, 0]} view={G.dark.view} d={G.dark.d} sd={G.dark.sd} className={st.fDark} style={place(G.dark.box, { transformOrigin: origin(G.dark.box, G.o) })} />
        <div className={st.fGold} style={place(G.gold.box, { transformOrigin: origin(G.gold.box, G.o) })}>
          <Gold box={[0, 0, 0, 0]} view={G.gold.view} d={G.gold.d} style={{ left: 0, top: 0, width: "100%", height: "100%" }} />
        </div>
        <h2 className={cx(st.cg, "absolute inset-x-0 text-center")} style={{ top: U(G.title.top), lineHeight: 1.21, color: "var(--ink)", zIndex: 3 }}>
          <Fit base={G.title.fs} max={W - 30} deps={title}>
            <Letters text={title} d0={0.1} step={0.04} />
          </Fit>
        </h2>
        {d.pair && (
          <p data-a="up" className={cx(st.cgi, "absolute inset-x-0 flex flex-col items-center text-center")} style={vars({ top: U(G.names.top), lineHeight: 1.21, color: "var(--gold)", zIndex: 3, "--d": "0.5s", "--y": 12 })}>
            {(d.b && [...d.pair].length > (wide ? 60 : 24) ? [`${d.a} ${t("va")}`, d.b] : [d.pair]).map((l, k, all) => (
              <Fit key={k} base={all.length > 1 ? G.names.fs * 0.92 : G.names.fs} max={W - 30} deps={l}>
                {l}
              </Fit>
            ))}
          </p>
        )}
        {/* Mis kalit — pastdan suzib kelib, 90° burilib Figma holatiga o‘tiradi */}
        <div className={st.fKey} style={place([kx, ky, kw, kh])}>
          <div className="absolute" style={{ left: "50%", top: "50%", width: U(G.keyIn[0]), height: U(G.keyIn[1]), transform: "translate(-50%, -50%) rotate(12deg)" }}>
            <Img src={`${P}/key.webp`} />
          </div>
        </div>
        {d.dots && (
          <p data-a="fade" className={cx(st.mr, "absolute inset-x-0 text-center")} style={vars({ top: U(G.date.top), fontSize: U(G.date.fs), letterSpacing: U(G.date.ls), paddingLeft: U(G.date.ls), lineHeight: 1.22, color: "var(--gold)", whiteSpace: "nowrap", zIndex: 3, "--d": "0.4s" })}>
            {d.dots}
          </p>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ Sahifa ═════════════ */
type Key = "nur" | "sana" | "couple" | "program" | "venue" | "dress" | "moment" | "rsvp" | "final";

export function KalitSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const loaded = usePreload(
    [d.hero, `${P}/library.webp`],
    [`${P}/key.webp`, ...d.ph.filter(Boolean).map(String), ...(d.dress ? d.dress.imgs.map((x) => x.src) : [])],
    withGate,
    wide ? "l" : "m",
  );
  useReveal(root, loaded, embedded);
  const [loaderGone, setLoaderGone] = useState(!withGate);
  useEffect(() => {
    if (!loaded || loaderGone) return;
    const tm = setTimeout(() => setLoaderGone(true), 900);
    return () => clearTimeout(tm);
  }, [loaded, loaderGone]);
  useEffect(() => {
    if (loaded || !withGate) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [loaded, withGate]);
  // Musiqa birinchi teginishda (brauzer scroll orqali yoqishga ruxsat bermaydi)
  useEffect(() => {
    if (!withGate) return;
    const go = () => {
      music.play(true);
      off();
    };
    const off = () => {
      window.removeEventListener("pointerup", go);
      window.removeEventListener("keydown", go);
    };
    window.addEventListener("pointerup", go, { passive: true });
    window.addEventListener("keydown", go);
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withGate, d.musicUrl]);
  // Laptop: kalit teshigi ortidagi surat kursor bilan ±16px siljiydi (Motion 00) — React holatisiz
  useEffect(() => {
    const el = root.current;
    if (!el || !wide || embedded || typeof matchMedia === "undefined" || !matchMedia("(pointer: fine)").matches) return;
    let raf = 0;
    let x = 0;
    let y = 0;
    const on = (e: PointerEvent) => {
      x = (e.clientX / window.innerWidth) * 2 - 1;
      y = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          el.style.setProperty("--mx", x.toFixed(3));
          el.style.setProperty("--my", y.toFixed(3));
        });
    };
    window.addEventListener("pointermove", on, { passive: true });
    return () => {
      window.removeEventListener("pointermove", on);
      cancelAnimationFrame(raf);
    };
  }, [wide, embedded]);

  const dimmed = useRef(false);
  const onFinal = useCallback(() => {
    if (dimmed.current) return;
    dimmed.current = true;
    music.dim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown: Key[] = (["nur", "sana", "couple", "program", "venue", "dress", "moment", "rsvp", "final"] as Key[]).filter((k) =>
    k === "sana"
      ? d.hasDate
      : k === "couple"
        ? !!(d.b && d.ph[1] && d.ph[2])
        : k === "program"
          ? d.program.length > 0
          : k === "dress"
            ? !!d.dress
            : k === "moment"
              ? !!(d.ph[4] || d.quote)
              : k === "rsvp"
                ? data.rsvpEnabled
                : true,
  );
  const z = (k: Key) => 6 + shown.indexOf(k);
  const linkable = mode !== "preview";
  const colU = wide ? COL_L : COL_M;
  const fu = (n: number) => (wide ? `calc(100cqw / 1440 * ${n})` : U(n));

  return (
    <div ref={root} className={st.root}>
      <div className={st.page} style={vars({ "--u": colU })}>
        <MusicButton m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/keyhole.svg`} />}
        <div className={st.flow}>
          {withGate && (loaded ? <Gate d={d} wide={wide} onStart={() => music.play(true)} /> : <div className={st.gateHold} />)}
          {embedded && <Gate d={d} wide={wide} still onStart={() => {}} />}
          <Nur d={d} wide={wide} z={z("nur")} still={embedded} />
          <Sana d={d} wide={wide} z={z("sana")} />
          <Couple d={d} wide={wide} z={z("couple")} />
          <Program d={d} wide={wide} z={z("program")} />
          <Venue d={d} wide={wide} z={z("venue")} linkable={linkable} />
          <Dress d={d} wide={wide} z={z("dress")} />
          <Moment d={d} wide={wide} z={z("moment")} still={embedded} />
          {data.rsvpEnabled && <Rsvp d={d} wide={wide} slug={data.slug} mode={mode} z={z("rsvp")} />}
          <Final d={d} wide={wide} z={z("final")} onSeen={onFinal} />
        </div>
        <footer className={cx(st.footer, "flex flex-col items-center")} style={{ height: fu(140), paddingTop: fu(40), gap: fu(11) }}>
          <a href="https://shohnoma.uz" className={st.cg} style={{ fontSize: fu(26), lineHeight: 1.21 }}>
            Shohnoma
          </a>
          <span className={st.ml} style={{ fontSize: fu(13), lineHeight: 1.22, color: "var(--muted)" }}>
            {t("Taklifnoma shohnoma.uz da yaratildi")}
          </span>
        </footer>
      </div>
    </div>
  );
}
