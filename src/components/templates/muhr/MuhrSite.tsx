"use client";

import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/400-italic.css";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { splitDate, tashkentDate } from "@/lib/display";
import { musicSrc } from "@/lib/music";
import { useLocale, useT } from "@/lib/i18n";
import type { InvitationSiteProps } from "@/components/invitation/types";
import { fetchSavedAnswer, loadSavedRsvp, saveRsvp, type RsvpStatus } from "@/components/invitation/Rsvp";
import { timerUnits } from "@/components/invitation/data";
import { useCountdown, useCountUp, useInView, useScrollProgress, useWide } from "../shared/hooks";
import { Loader, MusicButton, usePreload, useMusic } from "../shared/runtime";
import { DRESS, calendarWords, coordsFrom, downloadIcs, untilPhrase, type ProgramItem } from "../anor/data";
import { MUHR_DEMO, MUHR_DEMO_EN, MUHR_DEMO_RU, P } from "./data";
import st from "./muhr.module.css";

/* ── Birliklar ──
 * U — kontent ustuni (Figma mobil 390 koordinatalari; laptopda ustun = mobil × 1.45, ya’ni 565.5px / 1440)
 * S — laptop kanvasi (1440) koordinatalari (yon bezaklar): S(n) = U(n / 1.45)
 * CX / SX — gorizontal joylashuv bo‘lim markaziga nisbatan */
const U = (n: number) => `calc(var(--u) * ${+n.toFixed(3)})`;
const S = (n: number) => U(n / 1.45);
const CX = (x: number) => `calc(50% + ${U(x - 195)})`;
const SX = (x: number) => `calc(50% + ${S(x - 720)})`;
type Box = [number, number, number, number];
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const vars = (o: Record<string, string | number | undefined>) => o as CSSProperties;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const COL_M = "calc(100cqw / 390)";
const COL_L = "calc(100cqw / 1440 * 1.45)";
const CANVAS_L = "calc(100cqw / 1440)";

/* ── Ma’lumot (taklifnoma tilida — InvitationSite LocaleProvider’i) ── */
function useData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO = lang === "ru" ? MUHR_DEMO_RU : lang === "en" ? MUHR_DEMO_EN : MUHR_DEMO;
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
    const dz = DRESS[str("dressCode") || (demo ? DEMO.dressCode : "")];
    // namunadagi ismlar tarjima qilinadi (mijoz ma’lumoti — o‘zgarishsiz)
    const a = (demo ? t(data.personA) : data.personA) || "";
    const b = demo && data.personB ? t(data.personB) : data.personB;
    const time = sd?.time ?? "";
    const program = (demo ? DEMO.program : exProgram.length ? exProgram : (data.program as ProgramItem[])) as ProgramItem[];
    const y = date ? date.getUTCFullYear() : 0;
    const m = date ? date.getUTCMonth() : 0;
    const day = date ? date.getUTCDate() : 0;
    const message = (demo ? DEMO.message : data.message || "").replace(/^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Дорогие гости!|Dear guests!)\s*/, "").trim();
    const coords = demo ? { lat: 41.3111, lon: 69.2797 } : coordsFrom(data.mapUrl);
    const venueTitle = (demo ? DEMO.venueTitle : data.venueName) || "";
    const address = (demo ? DEMO.address : data.address) || "";
    // Figma: portret — juftlik, manzil — zinapoya, lahzalar — qo‘llar va juftlik
    const ph = demo ? [`${P}/couple.webp`, `${P}/stairs.webp`, `${P}/hands.webp`, `${P}/couple.webp`] : [photos[0], photos[1], photos[2], photos[3]];
    const unq = (s: string) => s.replace(/^["“”«»„]+|["“”«»„]+$/g, "").trim();
    return {
      a,
      b,
      names: b ? `${a} & ${b}` : a,
      dots: sd?.dots ?? "",
      dmy: date ? `${String(day).padStart(2, "0")}.${String(m + 1).padStart(2, "0")}.${y}` : "",
      // «Shanba, 12 sentabr 2026»
      long: date ? `${cw.weekday[date.getUTCDay()]}, ${day} ${cw.monthsAfterDay[m]} ${y}` : "",
      iso: sd?.iso ?? "",
      time,
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
            note: str("dressNote") || t(dz.note),
            imgs: dz.imgs.map((x) => ({ ...x, label: t(x.label) })),
          }
        : null,
      ph: ph.map((x) => x || null) as (string | null)[],
      quote: unq(str("quote") || (demo ? DEMO.quote : "")),
      caption: unq(str("caption") || (demo ? DEMO.caption : "")),
      rsvpUntil: untilPhrase(data.rsvpDeadline, lang)
        .replace(/(\d) /g, "$1 ")
        .replace(/^(до|by) /, "$1 "),
      musicUrl: musicSrc(template, data),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, data, demo, guest, lang, t]);
}
type D = ReturnType<typeof useData>;

/** Bo‘lim: scroll jarayoni `--p` (0…1) — parallaks uchun */
function Sec({ children, className, style, id, z, onP }: { children: ReactNode; className?: string; style?: CSSProperties; id?: string; z: number; onP?: (p: number, r: DOMRect) => void }) {
  const ref = useRef<HTMLElement>(null);
  const cb = useRef(onP);
  cb.current = onP;
  useScrollProgress(ref, (p, r) => {
    ref.current?.style.setProperty("--p", p.toFixed(4));
    cb.current?.(p, r);
  });
  return (
    <section ref={ref} id={id} className={cx(st.sec, className)} style={{ zIndex: z, ...style }}>
      {children}
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

function Img({ src, className, style, eager, a, contain }: { src: string; className?: string; style?: CSSProperties; eager?: boolean; a?: string; contain?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" draggable={false} data-a={a} loading={eager ? "eager" : "lazy"} decoding="async" className={cx(st.img, contain && st.contain, className)} style={style} />;
}

/**
 * Bezak: markaz (cx, cy) va o‘lcham (w, h) — kontent ustuni koordinatalarida (Figma mobil).
 * Uch qavat: joylashuv + parallaks (--sp) → reveal (data-a) → burilish/ko‘zgu.
 */
function Deco({
  c,
  rot = 0,
  flip,
  z,
  a,
  d,
  sp,
  src,
  children,
  style,
  rstyle,
  className,
  contain,
}: {
  c: Box;
  rot?: number;
  flip?: boolean;
  z?: number;
  a?: string;
  d?: number;
  sp?: number;
  src?: string;
  children?: ReactNode;
  style?: CSSProperties;
  rstyle?: CSSProperties;
  className?: string;
  contain?: boolean;
}) {
  const [x, y, w, h] = c;
  return (
    <div
      className={cx(st.abs, sp != null && st.px, className)}
      style={vars({
        left: CX(x - w / 2),
        top: U(y - h / 2),
        width: U(w),
        height: U(h),
        zIndex: z,
        "--sp": sp,
        ...(style as Record<string, string>),
      })}
    >
      <div
        data-a={a}
        className="relative size-full"
        style={vars({
          "--d": d != null ? `${d}s` : undefined,
          ...(rstyle as Record<string, string>),
        })}
      >
        <div
          className="relative size-full"
          style={{
            transform: rot || flip ? `rotate(${rot}deg)${flip ? " scaleX(-1)" : ""}` : undefined,
          }}
        >
          {children ?? (src ? <Img src={src} contain={contain} /> : null)}
        </div>
      </div>
    </div>
  );
}
/** Figma qutisi (chap, yuqori, en, bo‘y) → markaz */
const box = (l: number, t: number, w: number, h: number): Box => [l + w / 2, t + h / 2, w, h];

/** Laptop yon bezagi (laptop kanvas koordinatalari); o‘ng tomondagisi — ko‘zgu */
function Side({ src, r, flip, a = "fade", d = 0.2, z = 0 }: { src: string; r: Box; flip?: boolean; a?: string; d?: number; z?: number }) {
  const [x, y, w, h] = r;
  return (
    <div className={st.side} style={{ left: SX(x), top: S(y), width: S(w), height: S(h), zIndex: z }}>
      <div data-a={a} className="size-full" style={vars({ "--d": `${d}s`, "--t": "1.6s" })}>
        <Img src={src} className={flip ? st.flipX : undefined} />
      </div>
    </div>
  );
}
/** Simmetrik juft (chap + o‘ng ko‘zgu) */
function Sides({ src, l, rx, flip = true, a }: { src: string; l: Box; rx: number; flip?: boolean; a?: [string, string] }) {
  return (
    <>
      <Side src={src} r={l} a={a?.[0] ?? "slideL"} />
      <Side src={src} r={[rx, l[1], l[2], l[3]]} flip={flip} a={a?.[1] ?? "slideR"} d={0.3} />
    </>
  );
}

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

/** Matn qutiga (eni va bo‘yi) sig‘maguncha shrift bosqichma-bosqich kichrayadi */
function FitBox({ children, base, min, className, style, deps }: { children: ReactNode; base: number; min: number; className?: string; style?: CSSProperties; deps: unknown }) {
  const ref = useRef<HTMLDivElement>(null);
  useIso(() => {
    const el = ref.current;
    const inner = el?.firstElementChild as HTMLElement | null;
    if (!el || !inner) return;
    const over = () => inner.scrollHeight > el.clientHeight + 1 || inner.scrollWidth > el.clientWidth + 1;
    const measure = () => {
      let f = base;
      inner.style.overflowWrap = "normal";
      el.style.fontSize = U(f);
      while (f > min && over()) {
        f = +(f - 0.5).toFixed(1);
        el.style.fontSize = U(f);
      }
      if (over()) inner.style.overflowWrap = "anywhere";
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [base, min, deps]);
  return (
    <div ref={ref} className={className} style={style}>
      <p style={{ width: "100%" }}>{children}</p>
    </div>
  );
}

function Words({ text, d0 = 0, step = 0.05 }: { text: string; d0?: number; step?: number }) {
  const parts = text.split(/(\s+)/);
  let k = 0;
  return (
    <>
      {parts.map((w, i) =>
        /^\s+$/.test(w) ? (
          w
        ) : (
          <span key={i} data-w className={st.word} style={vars({ "--d": `${(d0 + step * k++).toFixed(2)}s` })}>
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

/**
 * Tikuv chizig‘i: shtrixli chiziq igna izidek «tikiladi» (niqob bo‘ylab stroke-dashoffset).
 * shape: "rect" — element o‘lchamidagi to‘rtburchak (rx), yoki tayyor path (viewBox bilan).
 */
function Stitch({
  shape,
  rx = 0,
  d,
  view,
  w = 1.2,
  a = "stitch",
  delay = 0,
  dur = 1.6,
  className,
  style,
}: {
  shape: "rect" | "path";
  rx?: number | string;
  d?: string;
  view?: string;
  w?: number;
  a?: string;
  delay?: number;
  dur?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const id = useId().replace(/:/g, "");
  const sw = shape === "rect" ? `calc(var(--u) * ${w})` : w;
  const dash = shape === "rect" ? `calc(var(--u) * 5) calc(var(--u) * 4)` : "5 4";
  const geo = (extra: Record<string, unknown>) => (shape === "rect" ? <rect x="0" y="0" width="100%" height="100%" rx={rx} fill="none" {...extra} /> : <path d={d} fill="none" {...extra} />);
  return (
    <svg
      data-a={a}
      className={cx(st.stitch, className)}
      viewBox={view}
      preserveAspectRatio={view ? "none" : undefined}
      aria-hidden
      style={vars({
        "--d": `${delay}s`,
        "--t": `${dur}s`,
        ...(style as Record<string, string>),
      })}
    >
      <defs>
        <mask id={`m${id}`} maskUnits="userSpaceOnUse" x="-10%" y="-10%" width="120%" height="120%" style={{ maskType: "luminance" }}>
          {geo({
            stroke: "#fff",
            pathLength: 1,
            className: st.stitchMask,
            style: { strokeWidth: shape === "rect" ? `calc(var(--u) * 6)` : 6 },
          })}
        </mask>
      </defs>
      {geo({
        stroke: "rgba(201,160,107,.8)",
        mask: `url(#m${id})`,
        style: { strokeWidth: sw, strokeDasharray: dash },
      })}
    </svg>
  );
}

/* ═════════════ 00 · Charm konvert — scroll bilan 4 qanot ochiladi ═════════════ */
type Flap = {
  k: "l" | "r" | "t" | "b";
  box: Box;
  img: Box;
  pts: [number, number][];
};
const HERO = {
  m: {
    W: 390,
    H: 844,
    src: (k: string) => `${P}/flap-${k}.webp`,
    flaps: [
      {
        k: "l",
        box: [0, 0, 215, 844],
        img: [-26, -16.04, 267, 896],
        pts: [
          [12.56, 26.24],
          [196.56, 430.24],
          [12.56, 818.24],
        ],
      },
      {
        k: "r",
        box: [175, 0, 215, 844],
        img: [149, -16.04, 267, 896],
        pts: [
          [377.44, 26.24],
          [193.44, 430.24],
          [377.44, 818.24],
        ],
      },
      {
        k: "b",
        box: [0, 370, 390, 474],
        img: [-26, 354, 442, 526],
        pts: [
          [20.56, 833.62],
          [195.56, 393.62],
          [370.56, 833.62],
        ],
      },
      {
        k: "t",
        box: [0, 0, 390, 490],
        img: [-26, -16, 442, 542],
        pts: [
          [18.58, 12.2],
          [195.58, 466.2],
          [372.58, 12.2],
        ],
      },
    ] as Flap[],
    seal: [120, 370, 150] as [number, number, number],
    names: { top: 650, fs: 34, max: 360 },
    date: { top: 700, fs: 14, ls: 3.64 },
    persp: 1400,
  },
  l: {
    W: 1440,
    H: 900,
    src: (k: string) => `${P}/lflap-${k}.webp`,
    flaps: [
      {
        k: "l",
        box: [0, 0, 760, 900],
        img: [-30, -18, 820, 960],
        pts: [
          [16.32, 28.54],
          [724.32, 460.54],
          [16.32, 872.54],
        ],
      },
      {
        k: "r",
        box: [680, 0, 760, 900],
        img: [650, -18, 820, 960],
        pts: [
          [1423.68, 28.54],
          [715.68, 460.54],
          [1423.68, 872.54],
        ],
      },
      {
        k: "b",
        box: [0, 400, 1440, 500],
        img: [-30, 382, 1500, 560],
        pts: [
          [30.31, 886.77],
          [720.31, 424.77],
          [1410.31, 886.77],
        ],
      },
      {
        k: "t",
        box: [0, 0, 1440, 520],
        img: [-30, -18, 1500, 580],
        pts: [
          [30.32, 14.57],
          [720.32, 494.57],
          [1410.32, 14.57],
        ],
      },
    ] as Flap[],
    seal: [625, 370, 190] as [number, number, number],
    names: { top: 690, fs: 54, max: 1100 },
    date: { top: 768, fs: 16, ls: 4.48 },
    persp: 2000,
  },
};
/** Ochilish tartibi (Motion 00): tepa → chap → o‘ng → past; [boshlanish, davomiylik] — `--o` (0…1) ulushida */
const OPEN: Record<Flap["k"], [number, number]> = {
  t: [0.08, 0.3],
  l: [0.24, 0.3],
  r: [0.36, 0.3],
  b: [0.48, 0.3],
};

/** Qanot tikuvi: shtrixli chiziq yuklanganda igna izidek tikiladi (niqob bo‘ylab stroke-dashoffset) */
function FlapStitch({ f }: { f: Flap }) {
  const id = useId().replace(/:/g, "");
  const pts = f.pts.map((p) => p.join(",")).join(" ");
  return (
    <svg className={st.flapStitch} viewBox={`${f.box[0]} ${f.box[1]} ${f.box[2]} ${f.box[3]}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <mask id={`q${id}`} maskUnits="userSpaceOnUse" x={f.box[0] - 10} y={f.box[1] - 10} width={f.box[2] + 20} height={f.box[3] + 20}>
          <polyline points={pts} pathLength={1} fill="none" stroke="#fff" strokeWidth={6} className={st.stitchIntro} />
        </mask>
      </defs>
      <polyline points={pts} fill="none" stroke="#C9A06B" strokeOpacity={0.75} strokeWidth={1.2} strokeDasharray="6 5" mask={`url(#q${id})`} />
    </svg>
  );
}

/** Ochilish sahnasi: konvert pastki chetga bog‘langan (baland ekranda tepada charm fon ko‘payadi) */
function Gate({ d, wide, onReveal, onStart, still = false }: { d: D; wide: boolean; onReveal: () => void; onStart: () => void; still?: boolean }) {
  const t = useT();
  const wrap = useRef<HTMLDivElement>(null);
  const cb = useRef({ onReveal, onStart });
  cb.current = { onReveal, onStart };
  useEffect(() => {
    const el = wrap.current;
    const host = el?.parentElement;
    if (!el || !host || still) return;
    let raf = 0;
    let cur = 0;
    let target = 0;
    let revealed = false;
    let started = false;
    const read = () => {
      const r = el.getBoundingClientRect();
      const stage = (el.firstElementChild as HTMLElement | null)?.offsetHeight || window.innerHeight;
      const D = Math.max(1, r.height - stage);
      target = clamp01(-r.top / D);
    };
    const apply = (o: number) => {
      host.style.setProperty("--o", o.toFixed(4));
      el.style.pointerEvents = o > 0.9 ? "none" : "";
      if (!started && o > 0.004) {
        started = true;
        cb.current.onStart();
      }
      if (!revealed && o > 0.45) {
        revealed = true;
        cb.current.onReveal();
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
    read();
    cur = target;
    apply(cur);
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, [still]);

  const G = wide ? HERO.l : HERO.m;
  const { W, H } = G;
  const pageU = wide ? CANVAS_L : COL_M;
  // sahna koordinatasi: gorizontal markazdan, vertikal — pastki chetdan
  const X = (x: number) => `calc(50% + ${U(x - W / 2)})`;
  const Y = (y: number) => `calc(100% - ${U(H - y)})`;
  const at = (r: Box, extra?: CSSProperties): CSSProperties => ({
    position: "absolute",
    left: X(r[0]),
    top: Y(r[1]),
    width: U(r[2]),
    height: U(r[3]),
    ...extra,
  });
  const [sx, sy, ss] = G.seal;
  // uzun ismlar bitta qatorda juda kichrayib ketmasin — uch qatorga (A / & / B), pastki chegara Figma qatorida qoladi
  const stack = !!d.b && [...d.names].length > (wide ? 40 : 22);
  return (
    <div ref={wrap} className={cx(st.gateWrap, still && st.still)} style={vars(still ? { "--u": pageU, "--o": 0, height: U(H), marginBottom: 0 } : { "--u": `min(${pageU}, calc(100svh / ${H}))` })}>
      <div className={st.gate} aria-label={t("Taklifnoma")} style={still ? { position: "relative", height: "100%" } : undefined}>
        <div className={st.gBg} />
        <div className={st.scene} style={{ perspective: U(G.persp) }}>
          {G.flaps.map((f) => (
            <div key={f.k} className={cx(st.flap, st[`f${f.k}`])} style={at(f.box, vars({ "--s0": OPEN[f.k][0], "--dur": OPEN[f.k][1] }))}>
              <div className={st.flapIn}>
                <Img
                  src={G.src(f.k)}
                  eager
                  className={st.fill}
                  style={{
                    position: "absolute",
                    left: U(f.img[0] - f.box[0]),
                    top: U(f.img[1] - f.box[1]),
                    width: U(f.img[2]),
                    height: U(f.img[3]),
                  }}
                />
                <FlapStitch f={f} />
              </div>
            </div>
          ))}
        </div>
        {/* Sur‘gich muhr — Figma’dagidek konvert markazida; ochilishda ikkiga yoriladi va tushadi (Motion 00) */}
        <div className={st.seal} style={at([sx, sy, ss, ss])}>
          <div className={cx("absolute inset-0", st.sealDrop)}>
            <span className={st.sealWave} aria-hidden />
            <div className={cx(st.sealHalf, st.sealL)}>
              <Img src={`${P}/seal.webp`} eager />
            </div>
            <div className={cx(st.sealHalf, st.sealR)}>
              <Img src={`${P}/seal.webp`} eager />
            </div>
          </div>
        </div>
        <div className={st.gText}>
          {stack ? (
            <h1
              className={cx(st.pf, "absolute inset-x-0 flex flex-col items-center text-center")}
              style={{ top: Y(G.names.top + G.names.fs * 1.333 - 3 * G.names.fs * 1.08), lineHeight: 1.08, color: "var(--paper)" }}
            >
              {[d.a, "&", d.b ?? ""].map((x, i) => (
                <Fit
                  key={i}
                  base={G.names.fs * (i === 1 ? 0.8 : 0.92)}
                  max={G.names.max}
                  deps={x}
                  className={i === 1 ? st.pfi : undefined}
                  style={{ height: U(G.names.fs * 1.08), color: i === 1 ? "var(--gold)" : undefined }}
                >
                  {x}
                </Fit>
              ))}
            </h1>
          ) : (
            <h1 className={cx(st.pf, "absolute inset-x-0 text-center")} style={{ top: Y(G.names.top), lineHeight: 1.333, color: "var(--paper)" }}>
              <Fit base={G.names.fs} max={G.names.max} deps={d.names}>
                {d.names}
              </Fit>
            </h1>
          )}
          {d.dots && (
            <p
              className={cx(st.msM, "absolute inset-x-0 text-center")}
              style={{
                top: Y(G.date.top),
                fontSize: U(G.date.fs),
                letterSpacing: U(G.date.ls),
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

/* ═════════════ 01 · Ochilgan konvert — taklif kartasi ═════════════ */
/** Kartadagi ism (58px). Uzun, bo‘shliqli ism — ikki qatorga bo‘linadi, aks holda bitta qator kichrayadi (Fit) */
function CardName({ text, d0 }: { text: string; d0: number }) {
  const chars = [...text];
  const step = Math.min(0.05, 0.6 / Math.max(1, chars.length));
  if (!(text.trim().includes(" ") && chars.length > 12))
    return (
      <p className={cx(st.pf, "flex w-full items-center justify-center text-center")} style={{ height: U(58), lineHeight: 1, color: "var(--ink)" }}>
        <Fit base={58} max={262} deps={text}>
          <Letters text={text} d0={d0} step={step} />
        </Fit>
      </p>
    );
  const mid = text.length / 2;
  let cut = -1;
  for (let i = 0; i < text.length; i++) if (text[i] === " " && (cut < 0 || Math.abs(i - mid) < Math.abs(cut - mid))) cut = i;
  const l1 = text.slice(0, cut).trim();
  const l2 = text.slice(cut + 1).trim();
  return (
    <p className={cx(st.pf, "flex w-full flex-col items-center text-center")} style={{ lineHeight: 1, color: "var(--ink)" }}>
      <Fit base={40} max={262} deps={l1}>
        <Letters text={l1} d0={d0} step={step} />
      </Fit>
      <Fit base={40} max={262} deps={l2}>
        <Letters text={l2} d0={d0 + [...l1].length * step} step={step} />
      </Fit>
    </p>
  );
}

function Invite({ d, wide, z }: { d: D; wide: boolean; z: number }) {
  const t = useT();
  const gap = U(14);
  const sp = <div style={{ height: U(6), flex: "none" }} />;
  return (
    <Sec z={z} className={st.invite} style={{ paddingTop: U(110), paddingBottom: U(120), minHeight: U(845) }}>
      {wide && <Sides src={`${P}/roses.webp`} l={[93, 472.63, 280, 280]} rx={1067} />}
      {/* Ochilgan qanot tepa (orqaga buklangan) */}
      <div className={cx(st.abs, st.openFlap)} style={{ left: CX(60), top: 0, width: U(270), height: U(91.12) }}>
        <Img
          src={`${P}/flap-open.webp`}
          eager
          className={st.fill}
          style={{
            position: "absolute",
            left: U(-26),
            top: U(-16.01),
            width: U(322),
            height: U(143.08),
          }}
        />
      </div>
      <div className={cx("relative", st.invCard)} style={{ marginLeft: CX(30), width: U(330), zIndex: 2 }}>
        <div
          className={cx("relative flex flex-col items-center text-center", st.paper)}
          style={{
            padding: `${U(74)} ${U(34)} ${U(60)}`,
            gap,
            borderRadius: U(4),
            filter: `drop-shadow(0 ${U(20)} ${U(22)} rgba(31,5,13,.4))`,
          }}
        >
          <Stitch
            shape="rect"
            rx={2}
            className="absolute"
            style={{
              left: U(10),
              top: U(10),
              width: `calc(100% - ${U(20)})`,
              height: `calc(100% - ${U(20)})`,
            }}
            delay={0.4}
          />
          <p
            data-a="fade"
            className={st.msM}
            style={vars({
              fontSize: U(12),
              letterSpacing: U(3.36),
              lineHeight: 1.22,
              color: "var(--wine)",
              width: "100%",
              overflowWrap: "anywhere",
              "--d": "0.1s",
            })}
          >
            {d.guest ? t("Hurmatli {guest}", { guest: d.guest }) : t("Sizni taklif qilamiz")}
          </p>
          <CardName text={d.a} d0={0.2} />
          {d.b && (
            <>
              <p
                data-a="draw"
                className={cx(st.pfi, "w-full text-center")}
                style={vars({
                  fontSize: U(38),
                  lineHeight: 1,
                  color: "var(--gold)",
                  "--d": "0.55s",
                })}
              >
                &amp;
              </p>
              <CardName text={d.b} d0={0.65} />
            </>
          )}
          {sp}
          <span
            data-a="lineX"
            style={vars({
              width: U(60),
              height: U(1),
              background: "var(--gold)",
              flex: "none",
              "--d": "0.8s",
            })}
          />
          {sp}
          {d.message && (
            <p
              data-a="up"
              className={st.ms}
              style={vars({
                fontSize: U(16),
                lineHeight: 1.6,
                color: "var(--muted)",
                width: "100%",
                whiteSpace: "pre-line",
                overflowWrap: "anywhere",
                "--y": 14,
                "--d": "0.9s",
              })}
            >
              {d.message}
            </p>
          )}
          {(d.long || d.time) && sp}
          {d.long && (
            <p
              data-a="up"
              className={cx(st.pfi, "flex w-full items-center justify-center")}
              style={vars({
                height: U(32),
                lineHeight: 1.333,
                color: "var(--wine)",
                "--y": 14,
                "--d": "1s",
              })}
            >
              <Fit base={24} max={262} deps={d.long}>
                {d.long}
              </Fit>
            </p>
          )}
          {d.time && (
            <p
              data-a="up"
              className={st.msM}
              style={vars({
                fontSize: U(14),
                letterSpacing: U(2.52),
                lineHeight: 1.22,
                color: "var(--muted)",
                width: "100%",
                "--y": 10,
                "--d": "1.1s",
              })}
            >
              {t("soat {time}", { time: d.time })}
            </p>
          )}
        </div>
        {/* Bordo bant — karta burchagida (Figma); tebranmaydi */}
        <div className="absolute inset-x-0" style={{ top: "100%", height: 0, zIndex: 3 }}>
          <Deco c={[299.58, 9.06, 140, 140]} rot={8} a="drop" d={0.4} src={`${P}/bow.webp`} />
        </div>
      </div>
      {/* Oq to‘r — karta tepasida, yuqoridan «tushadi» */}
      <div
        className={cx(st.abs, st.lace)}
        style={{
          left: CX(15),
          top: U(-18.54),
          width: U(360),
          height: U(154.54),
          zIndex: 4,
        }}
      >
        <Img src={`${P}/lace.webp`} eager />
      </div>
    </Sec>
  );
}

/* ═════════════ 02 · Taymer — tikilgan charm yorliq ═════════════ */
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

function Timer({ d, wide, z, slug }: { d: D; wide: boolean; z: number; slug: string }) {
  const t = useT();
  const units = timerUnits(useLocale());
  const c = useCountdown(d.target);
  const [ref, inView] = useInView<HTMLDivElement>(0.3, true);
  if (!d.hasDate || !c) return null;
  const vals = [c.d, c.h, c.m, c.s];
  const cells: [number, number][] = [
    [95, 110],
    [235, 110],
    [95, 202],
    [235, 202],
  ];
  const title = t("To‘yimizgacha");
  return (
    <Sec z={z} style={{ height: U(560) }}>
      {wide && <Sides src={`${P}/roses.webp`} l={[83, 256, 300, 300]} rx={1057} />}
      <div
        ref={ref}
        data-a="spin"
        className="absolute"
        style={vars({
          left: CX(30),
          top: U(80),
          width: U(330),
          height: U(330),
          zIndex: 1,
          "--rr": "-20deg",
        })}
      >
        <div
          className={cx("absolute inset-0", st.leather)}
          style={{
            borderRadius: "50%",
            filter: `drop-shadow(0 ${U(20)} ${U(22)} rgba(31,5,13,.45))`,
          }}
        />
        <Stitch shape="path" view="0 0 306 306" d="M153 0.6 A152.4 152.4 0 1 1 152.99 0.6 Z" className="absolute" style={{ left: U(12), top: U(12), width: U(306), height: U(306) }} delay={0.5} />
        <p className={cx(st.pfi, "absolute inset-x-0 text-center")} style={{ top: U(62), lineHeight: 1.333, color: "var(--gold)" }}>
          <Fit base={24} max={250} deps={title}>
            {title}
          </Fit>
        </p>
        <span
          data-a="lineY"
          className="absolute"
          style={vars({
            left: U(165),
            top: U(112),
            width: U(1),
            height: U(150),
            background: "rgba(201,160,107,.5)",
            "--d": "0.6s",
          })}
        />
        <span
          data-a="lineX"
          className="absolute"
          style={vars({
            left: U(55),
            top: U(196),
            width: U(220),
            height: U(1),
            background: "rgba(201,160,107,.5)",
            "--d": "0.7s",
          })}
        />
        {cells.map(([x, y], i) => (
          <div key={i}>
            <div
              data-a="num"
              className={cx(st.pf, "absolute text-center")}
              style={vars({
                left: U(x - 60),
                top: U(y),
                width: U(120),
                fontSize: U(44),
                lineHeight: 1,
                color: "var(--paper)",
                "--d": `${0.4 + i * 0.1}s`,
              })}
            >
              <Digits value={vals[i]} run={inView} len={i === 0 ? Math.max(2, String(vals[0]).length) : 2} i={i} />
            </div>
            <p
              data-a="fade"
              className={cx(st.ms, "absolute text-center")}
              style={vars({
                left: U(x - 60),
                top: U(y + 50),
                width: U(120),
                fontSize: U(12),
                letterSpacing: U(1.44),
                lineHeight: 1.22,
                color: "var(--paper)",
                opacity: 0.7,
                whiteSpace: "nowrap",
                "--d": `${0.6 + i * 0.1}s`,
              })}
            >
              {units[i]}
            </p>
          </div>
        ))}
      </div>
      <Deco c={[195, 408, 96, 96]} z={2} a="drip" d={1} src={`${P}/seal.webp`} />
      <div data-a="up" className="absolute inset-x-0 flex justify-center" style={vars({ top: U(482), zIndex: 2, "--y": 12, "--d": "0.3s" })}>
        <button
          type="button"
          className={cx(st.msM, st.calBtn)}
          style={{
            fontSize: U(15),
            letterSpacing: U(1.5),
            lineHeight: 1.22,
            padding: `${U(8)} ${U(12)}`,
          }}
          onClick={() =>
            downloadIcs({
              title: d.b ? t("{names} — to‘y", { names: d.names }) : t("{name} — taklif", { name: d.a }),
              startLocal: `${d.iso}T${d.time || "17:00"}`,
              location: [d.venueTitle, d.address].filter(Boolean).join(", "),
              slug,
            })
          }
        >
          {t("Kalendarga qo‘shish")}
          <span aria-hidden style={{ whiteSpace: "pre" }}>
            {"  →"}
          </span>
        </button>
      </div>
    </Sec>
  );
}

/* ═════════════ 03 · Kun tartibi — tikilgan yo‘l ═════════════ */
function Program({ d, wide, z }: { d: D; wide: boolean; z: number }) {
  const t = useT();
  const items = d.program.slice(0, 8);
  const ref = useRef<HTMLDivElement>(null);
  const onP = useCallback((_p: number, r: DOMRect) => {
    const el = ref.current;
    if (!el) return;
    // yo‘l ekranning 85% chizig‘igacha tikiladi
    const lr = el.getBoundingClientRect();
    el.style.setProperty("--ln", seg(window.innerHeight * 0.85 - lr.top, 0, lr.height).toFixed(4));
    void r;
  }, []);
  if (!items.length) return null;
  const title = t("Kun tartibi");
  return (
    <Sec z={z} onP={onP} style={{ paddingTop: U(150), paddingBottom: U(130) }}>
      {wide && <Side src={`${P}/glasses.webp`} r={[1077, 566, 260, 260]} a="slideR" />}
      <p data-a="blur" className={cx(st.pfi, "absolute inset-x-0 text-center")} style={{ top: U(40), lineHeight: 1.333, color: "var(--paper)" }}>
        <Fit base={46} max={370} deps={title}>
          {title}
        </Fit>
      </p>
      <div className="relative">
        {/* Tikuv yo‘li — scroll bilan tikiladi, igna nuqtasi uchida */}
        <div ref={ref} className={st.route} style={{ left: CX(70 - 0.7), top: 0, bottom: U(40), width: U(1.4) }}>
          <span className={st.needle} style={{ width: U(5), height: U(5) }} />
        </div>
        {items.map((it, i) => (
          <div
            key={i}
            className="relative"
            style={{
              minHeight: U(170),
              paddingTop: U(6),
              paddingBottom: U(24),
              paddingLeft: CX(104),
              paddingRight: CX(390 - 364),
            }}
          >
            <span
              data-a="dropDot"
              className="absolute"
              style={vars({
                left: CX(61),
                top: U(16),
                width: U(18),
                height: U(18),
                "--d": "0.05s",
              })}
            >
              <svg viewBox="0 0 18 18" className="size-full" aria-hidden>
                <circle cx="9" cy="9" r="8.25" fill="#6E1F2E" stroke="#C9A06B" strokeWidth="1.5" />
              </svg>
            </span>
            <p
              data-a="right"
              className={st.pf}
              style={vars({
                fontSize: U(30),
                lineHeight: 1.333,
                color: "var(--gold)",
                whiteSpace: "nowrap",
                "--d": "0.12s",
              })}
            >
              {it.time}
            </p>
            <p
              data-a="right"
              className={cx(st.pfi, st.clamp2)}
              style={vars({
                marginTop: U(2),
                fontSize: U(24),
                lineHeight: 1.333,
                color: "var(--paper)",
                "--d": "0.2s",
              })}
            >
              {it.title}
            </p>
            {it.note ? (
              <p
                data-a="right"
                className={cx(st.ms, st.clamp2)}
                style={vars({
                  marginTop: U(6),
                  fontSize: U(15),
                  lineHeight: 1.5,
                  color: "var(--paper)",
                  opacity: 0.72,
                  width: U(250),
                  maxWidth: "100%",
                  "--d": "0.28s",
                })}
              >
                {it.note}
              </p>
            ) : null}
          </div>
        ))}
      </div>
      <Deco c={[289.23, 0, 220, 220]} rot={10} z={3} a="slideR" d={0.2} sp={-30} src={`${P}/roses.webp`} style={{ top: "auto", bottom: U(52.57 - 110) }} />
    </Sec>
  );
}

/* ═════════════ 04 · Portret — passe-partout ark ═════════════ */
function Portrait({ d, wide, z }: { d: D; wide: boolean; z: number }) {
  const photo = d.ph[0];
  if (!photo && !d.quote) return null;
  const top = photo ? 568.67 : 60;
  const H = photo ? (d.quote ? 750.667 : 540) : 260;
  return (
    <Sec z={z} style={{ height: U(H) }}>
      {wide && <Sides src={`${P}/bow.webp`} l={[123, 434.23, 220, 220]} rx={1097} />}
      {photo && (
        <>
          <Stitch
            shape="path"
            view="0 0 344 442.667"
            d="M8 442.067 H336 A7.4 7.4 0 0 0 343.4 434.667 V172 A171.4 171.4 0 0 0 0.6 172 V434.667 A7.4 7.4 0 0 0 8 442.067 Z"
            className="absolute"
            style={{
              left: CX(23),
              top: U(48),
              width: U(344),
              height: U(442.667),
            }}
            delay={0.3}
            dur={1.8}
          />
          <div
            data-a="arch"
            className={cx("absolute", st.paper)}
            style={vars({
              left: CX(35),
              top: U(60),
              width: U(320),
              height: U(418.667),
              borderRadius: `${U(160)} ${U(160)} ${U(6)} ${U(6)}`,
              filter: `drop-shadow(0 ${U(20)} ${U(22)} rgba(31,5,13,.45))`,
              zIndex: 1,
            })}
          >
            <div
              className="absolute overflow-hidden"
              style={{
                left: U(12),
                top: U(12),
                width: U(296),
                height: U(394.667),
                borderRadius: `${U(148)} ${U(148)} ${U(2)} ${U(2)}`,
                background: "#3a1a20",
              }}
            >
              <Img src={photo} a="zoom" />
            </div>
          </div>
          <Deco c={[35.475, 430.815, 170, 170]} rot={12} z={2} a="slideL" d={0.4} sp={-30} src={`${P}/roses.webp`} />
        </>
      )}
      {d.quote && (
        <div className="absolute" style={{ left: CX(40), top: U(top), width: U(310), height: U(170), zIndex: 3 }}>
          <FitBox base={26} min={17} deps={d.quote} className={cx(st.pfi, "size-full text-center")} style={{ lineHeight: 1.3, color: "var(--paper)" }}>
            <Words text={`“${d.quote}”`} d0={0.2} />
          </FitBox>
        </div>
      )}
    </Sec>
  );
}

/* ═════════════ 05 · Bazm manzili — zinapoya va karta ═════════════ */
function Venue({ d, wide, z, linkable }: { d: D; wide: boolean; z: number; linkable: boolean }) {
  const t = useT();
  const photo = d.ph[1];
  const title = t("Bazm manzili");
  return (
    <Sec z={z} style={{ paddingTop: U(photo ? 462 : 150), paddingBottom: U(111.7) }}>
      {wide && <Sides src={`${P}/roses.webp`} l={[93, 429.85, 280, 280]} rx={1067} />}
      <p data-a="blur" className={cx(st.pfi, "absolute inset-x-0 text-center")} style={{ top: U(40), lineHeight: 1.333, color: "var(--paper)" }}>
        <Fit base={46} max={370} deps={title}>
          {title}
        </Fit>
      </p>
      {photo && (
        <Deco c={[188.07, 331.12, 300, 392]} rot={2} z={1} a="place" rstyle={vars({ "--rr": "6deg" })}>
          <div
            className={cx("absolute inset-0", st.paper)}
            style={{
              borderRadius: U(10),
              filter: `drop-shadow(0 ${U(20)} ${U(22)} rgba(31,5,13,.45))`,
            }}
          />
          <div
            className="absolute overflow-hidden"
            style={{
              left: U(12),
              top: U(12),
              width: U(276),
              height: U(368),
              borderRadius: U(4),
              background: "#3a1a20",
            }}
          >
            <Img src={photo} a="zoom" />
          </div>
        </Deco>
      )}
      <div className="relative" style={{ zIndex: 2 }}>
        <div
          data-a="rise"
          className={cx("relative flex flex-col items-center text-center", st.paper)}
          style={vars({
            marginLeft: CX(35),
            width: U(320),
            padding: U(30),
            gap: U(10),
            borderRadius: U(4),
            boxShadow: `0 ${U(20)} ${U(44)} ${U(-8)} rgba(31,5,13,.4)`,
            "--y": 60,
            "--d": "0.25s",
          })}
        >
          {d.venueTitle && (
            <p
              className={cx(st.pf, st.clamp3)}
              style={{
                fontSize: U([...d.venueTitle].length > 30 ? 24 : 30),
                lineHeight: 1.333,
                color: "var(--ink)",
                width: "100%",
              }}
            >
              {d.venueTitle}
            </p>
          )}
          {d.address && (
            <p
              className={cx(st.ms, st.clamp3)}
              style={{
                fontSize: U(16),
                lineHeight: 1.5,
                color: "var(--muted)",
                width: "100%",
              }}
            >
              {d.address}
            </p>
          )}
          <div className="flex justify-center" style={{ gap: U(10), maxWidth: "100%" }}>
            <a href={linkable ? d.mapUrl : undefined} target="_blank" rel="noopener noreferrer" className={cx(st.msM, st.pill, st.pillFill)} style={{ padding: `${U(13)} ${U(24)}`, fontSize: U(15) }}>
              {t("Xarita")}
            </a>
            <a
              href={linkable ? d.taxi : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className={cx(st.msM, st.pill, st.pillLine)}
              style={{
                padding: `${U(12)} ${U(23)}`,
                fontSize: U(15),
                borderWidth: U(1),
              }}
            >
              {t("Taksi")}
            </a>
          </div>
        </div>
        <Deco c={[330, -36 + 40, 80, 80]} z={3} a="press" d={0.7} src={`${P}/seal.webp`} />
      </div>
    </Sec>
  );
}

/* ═════════════ 06 · Dress-kod (ixtiyoriy) ═════════════ */
function Dress({ d, wide, z }: { d: D; wide: boolean; z: number }) {
  const t = useT();
  if (!d.dress) return null;
  const x = d.dress;
  const one = x.imgs.length === 1;
  const title = t("Dress-kod");
  return (
    <Sec z={z} style={{ paddingTop: U(160), paddingBottom: U(102.1) }}>
      {wide && <Sides src={`${P}/bow.webp`} l={[133, 419.83, 200, 200]} rx={1107} />}
      <p data-a="blur" className={cx(st.pfi, "absolute inset-x-0 text-center")} style={{ top: U(40), lineHeight: 1.333, color: "var(--paper)" }}>
        <Fit base={46} max={370} deps={title}>
          {title}
        </Fit>
      </p>
      <p
        data-a="up"
        className={cx(st.ms, st.clamp2, "absolute text-center")}
        style={vars({
          left: CX(30),
          top: U(106),
          width: U(330),
          fontSize: U(16),
          lineHeight: 1.22,
          color: "var(--paper)",
          opacity: 0.8,
          "--y": 12,
          "--d": "0.15s",
        })}
      >
        {t("Kechaning nafisligini birga yaratamiz")}
      </p>
      <Deco c={[339.5, 178.67, 120, 120]} rot={-10} z={4} a="drop" d={0.6} src={`${P}/bow.webp`} />
      <div
        data-a="rise"
        className={cx(st.dressCard, "relative flex flex-col items-center text-center")}
        style={vars({
          marginLeft: CX(24),
          width: U(342),
          padding: `${U(74)} ${U(24)} ${U(28)}`,
          gap: U(12),
          borderRadius: `${U(171)} ${U(171)} ${U(28)} ${U(28)}`,
          borderWidth: U(1),
          zIndex: 2,
          "--y": 80,
        })}
      >
        <div className={cx("absolute inset-0", st.paper)} style={{ borderRadius: "inherit", zIndex: -1 }} />
        <p
          className={st.pfi}
          style={{
            fontSize: U(34),
            lineHeight: 1.1,
            color: "var(--ink)",
            width: "100%",
            overflowWrap: "anywhere",
          }}
        >
          {x.title}
        </p>
        <p
          className={st.ms}
          style={{
            fontSize: U(16),
            lineHeight: 1.22,
            color: "var(--wine)",
            width: "100%",
          }}
        >
          {x.sub}
        </p>
        <div className="flex w-full justify-center" style={{ gap: U(10) }}>
          {x.imgs.map((im, i) => (
            <div
              key={im.src}
              className="flex flex-col items-center"
              style={{
                gap: U(8),
                flex: one ? "none" : "1 1 0",
                width: one ? U(294) : undefined,
                minWidth: 0,
              }}
            >
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
              <p
                className={st.msM}
                style={{
                  fontSize: U(13),
                  letterSpacing: U(1.56),
                  lineHeight: 1.22,
                  color: "var(--wine)",
                  whiteSpace: "nowrap",
                }}
              >
                {im.label}
              </p>
            </div>
          ))}
        </div>
        <p
          className={st.ms}
          style={{
            fontSize: U(16),
            lineHeight: 1.5,
            color: "var(--wine)",
            width: "100%",
            overflowWrap: "anywhere",
          }}
        >
          {x.note}
        </p>
      </div>
    </Sec>
  );
}

/* ═════════════ 07 · Lahzalar — ikki surat ═════════════ */
function Framed({ src, c, rot, w, h, z, d }: { src: string; c: [number, number]; rot: number; w: number; h: number; z: number; d: number }) {
  return (
    <Deco c={[c[0], c[1], w, h]} rot={rot} z={z} a="fall" d={d} rstyle={vars({ "--rr": `${rot > 0 ? 10 : -12}deg` })}>
      <div
        className={cx("absolute inset-0", st.paper)}
        style={{
          borderRadius: U(10),
          filter: `drop-shadow(0 ${U(20)} ${U(22)} rgba(31,5,13,.45))`,
        }}
      />
      <div
        className="absolute overflow-hidden"
        style={{
          left: U(12),
          top: U(12),
          width: U(w - 24),
          height: U(h - 24),
          borderRadius: U(4),
          background: "#3a1a20",
        }}
      >
        <Img src={src} a="zoom" />
      </div>
    </Deco>
  );
}

function Moments({ d, wide, z }: { d: D; wide: boolean; z: number }) {
  const p1 = d.ph[2];
  const p2 = d.ph[3];
  if (!p1 && !p2 && !d.caption) return null;
  const photos = !!(p1 || p2);
  // suratsiz — faqat to‘r va yozuv; yozuvsiz — to‘rdan keyin bo‘sh joy qolmaydi
  const dy = photos ? 0 : 555.33;
  const H = photos ? (d.caption ? 956.46 : 838.46) : 401.13;
  return (
    <Sec z={z} style={{ height: U(H) }}>
      {wide && (
        <>
          <Side src={`${P}/seal.webp`} r={[148, 608.43, 170, 170]} a="drip" />
          <Side src={`${P}/seal.webp`} r={[1122, 608.43, 170, 170]} a="drip" d={0.35} />
        </>
      )}
      {p1 && <Framed src={p1} c={[130.7, 182.74]} rot={4} w={230} h={230} z={1} d={0.1} />}
      {p2 && <Framed src={p2} c={[281.33, 443.92]} rot={-5} w={190} h={245.333} z={2} d={0.3} />}
      <div
        data-a="clipX"
        className="absolute"
        style={vars({
          left: CX(5),
          top: U(615.33 - dy),
          width: U(380),
          height: U(163.127),
          zIndex: 3,
          "--d": "0.2s",
        })}
      >
        <Img src={`${P}/lace.webp`} />
      </div>
      {d.caption && (
        <div
          className="absolute"
          style={{
            left: CX(40),
            top: U(808.46 - dy),
            width: U(310),
            height: U(110),
            zIndex: 4,
          }}
        >
          <FitBox base={26} min={17} deps={d.caption} className={cx(st.pfi, "size-full text-center")} style={{ lineHeight: 1.3, color: "var(--paper)" }}>
            <Words text={d.caption} d0={0.2} />
          </FitBox>
        </div>
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
  const [stamp, setStamp] = useState(0);
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
    if (!live) {
      setStamp((x) => x + 1);
      return setSent(status);
    }
    setBusy(true);
    try {
      const res = await fetch(token ? `/api/i/${slug}/rsvp/${token}` : `/api/i/${slug}/rsvp`, {
        method: token ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          status,
          count: status === "coming" ? count : 0,
          wish: wish.trim() || null,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        editToken?: string;
      };
      if (!res.ok || !j.ok) throw new Error(t(j.error || "Javob yuborilmadi. Qayta urinib ko‘ring."));
      const tk = token ?? j.editToken!;
      saveRsvp(slug, tk, name.trim());
      setToken(tk);
      setStamp((x) => x + 1);
      setSent(status);
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const label = (s: string) => (
    <p className={st.lbl} style={{ fontSize: U(11), letterSpacing: U(1.54) }}>
      {s}
    </p>
  );
  const gap = U(12);
  return (
    <Sec z={z} id="muhr-javob" style={{ paddingTop: U(100), paddingBottom: U(184), minHeight: U(1007) }}>
      {wide && <Sides src={`${P}/roses.webp`} l={[93, 590.08, 280, 280]} rx={1067} />}
      <div className="relative">
        <form
          onSubmit={submit}
          noValidate
          data-a="rise"
          className={cx("relative flex flex-col items-start overflow-hidden", st.paper)}
          style={vars({
            marginLeft: CX(24),
            width: U(342),
            borderRadius: U(4),
            padding: `${U(84)} ${U(28)} ${U(28)}`,
            gap,
            boxShadow: `0 ${U(20)} ${U(44)} ${U(-8)} rgba(31,5,13,.4)`,
            zIndex: 2,
            "--y": 80,
          })}
        >
          <p
            className={cx(st.pfi, "w-full text-center")}
            style={{
              fontSize: U(sent ? 34 : 42),
              lineHeight: sent ? 1.2 : 1.333,
              color: "var(--ink)",
              overflowWrap: "anywhere",
            }}
          >
            {sent ? (sent === "not_coming" ? t("Rahmat!") : t("Rahmat! Joyingiz band qilindi")) : t("Kelasizmi?")}
          </p>
          {sent ? (
            <div className={cx(st.thanks, "flex w-full flex-col items-center text-center")} style={{ gap: U(16), paddingTop: U(8), paddingBottom: U(12) }}>
              <p
                className={st.ms}
                style={{
                  fontSize: U(16),
                  color: "var(--muted)",
                  lineHeight: 1.5,
                }}
              >
                {sent === "not_coming"
                  ? t("Javobingiz uchun rahmat — sizni duolarimizda eslaymiz.")
                  : t("{name} — {count} kishi. Javobingiz yetkazildi.", {
                      name: name.trim() || t("Javobingiz"),
                      count,
                    })}
              </p>
              <button
                type="button"
                onClick={() => setSent(null)}
                className={st.ms}
                style={{
                  color: "var(--wine)",
                  fontSize: U(15),
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
              >
                {t("Javobni o‘zgartirish")}
              </button>
            </div>
          ) : (
            <>
              <p
                className={cx(st.ms, "w-full text-center")}
                style={{
                  fontSize: U(15),
                  lineHeight: 1.5,
                  color: "var(--muted)",
                }}
              >
                {d.rsvpUntil
                  ? t("Iltimos, javobingizni {date} qoldiring", {
                      date: d.rsvpUntil,
                    })
                  : t("Iltimos, javobingizni qoldiring")}
              </p>
              <div style={{ height: U(6) }} />
              <label className="flex w-full flex-col" style={{ gap }}>
                {label(t("ISM-FAMILIYA"))}
                <input
                  className={st.field}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  placeholder={t("Ismingiz")}
                  style={{
                    fontSize: U(16),
                    padding: U(16),
                    borderRadius: U(6),
                  }}
                />
              </label>
              <div style={{ height: U(2) }} />
              {label(t("JAVOBINGIZ"))}
              <div className="flex w-full" role="radiogroup" aria-label={t("Kelasizmi?")} style={{ gap: U(8) }}>
                {(
                  [
                    ["coming", "Albatta kelaman"],
                    ["not_coming", "Kela olmayman"],
                  ] as const
                ).map(([s, l]) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={status === s}
                    onClick={() => setStatus(s)}
                    className={st.choice}
                    style={{
                      padding: `${U(15)} ${U(6)}`,
                      minHeight: U(49),
                      fontSize: U(14),
                    }}
                  >
                    <span style={{ overflowWrap: "anywhere" }}>{t(l)}</span>
                  </button>
                ))}
              </div>
              {status === "coming" && (
                <>
                  <div style={{ height: U(2) }} />
                  <div className="flex w-full items-center" style={{ gap: U(6) }}>
                    <p
                      className={st.ms}
                      style={{
                        flex: "1 1 0",
                        minWidth: 0,
                        fontSize: U(14),
                        lineHeight: 1.22,
                        color: "var(--ink)",
                      }}
                    >
                      {t("Necha kishi bo‘lasiz?")}
                    </p>
                    <button
                      type="button"
                      className={st.step}
                      disabled={count <= 1}
                      onClick={() => setCount((c) => Math.max(1, c - 1))}
                      aria-label={t("Kamaytirish")}
                      style={{ width: U(32), height: U(32), fontSize: U(20) }}
                    >
                      −
                    </button>
                    <span
                      className={st.msM}
                      style={{
                        width: U(32),
                        textAlign: "center",
                        fontSize: U(18),
                        color: "var(--ink)",
                      }}
                      aria-live="polite"
                    >
                      {count}
                    </span>
                    <button
                      type="button"
                      className={st.step}
                      disabled={count >= 20}
                      onClick={() => setCount((c) => Math.min(20, c + 1))}
                      aria-label={t("Ko‘paytirish")}
                      style={{ width: U(32), height: U(32), fontSize: U(20) }}
                    >
                      +
                    </button>
                  </div>
                </>
              )}
              <div style={{ height: U(2) }} />
              <label className="flex w-full flex-col" style={{ gap }}>
                {label(t("TILAKLARINGIZ"))}
                <textarea
                  className={st.field}
                  value={wish}
                  onChange={(e) => setWish(e.target.value)}
                  maxLength={500}
                  placeholder={t("Yosh oilaga bir-ikki so‘z…")}
                  style={{
                    fontSize: U(16),
                    padding: U(16),
                    borderRadius: U(6),
                    height: U(92),
                  }}
                />
              </label>
              {err && (
                <p className={st.ms} style={{ color: "#b3261e", fontSize: U(14) }}>
                  {err}
                </p>
              )}
              <div style={{ height: U(8) }} />
              <button
                type="submit"
                disabled={busy}
                className={st.btnWine}
                style={{
                  padding: U(18),
                  fontSize: U(16),
                  opacity: busy ? 0.7 : 1,
                }}
              >
                {busy ? t("Yuborilmoqda…") : t("Muhr bilan tasdiqlash")}
              </button>
            </>
          )}
        </form>
        {/* Sur‘gich — karta tepasida; javob yuborilganda qayta «tomib» bosiladi */}
        <Deco c={[195, -46 + 50, 100, 100]} z={4} a="press" d={0.5}>
          <div key={stamp} className={cx("size-full", stamp > 0 && st.restamp)}>
            <Img src={`${P}/seal.webp`} />
          </div>
        </Deco>
      </div>
    </Sec>
  );
}

/* ═════════════ 09 · Final — konvert yopiladi, muhr bosiladi ═════════════ */
const FINAL = {
  m: {
    W: 390,
    H: 844,
    src: (k: string) => `${P}/cflap-${k}.webp`,
    flaps: [
      { k: "l", box: [0, 200, 180, 644], img: [-26, 184.03, 232, 696] },
      { k: "r", box: [210, 200, 180, 644], img: [184, 184.03, 232, 696] },
      { k: "b", box: [0, 520, 390, 324], img: [-26, 504, 442, 376] },
      { k: "t", box: [0, 200, 390, 400], img: [-26, 184, 442, 452] },
    ] as Omit<Flap, "pts">[],
    seal: [130, 500.87, 130] as [number, number, number],
    title: { top: 60, fs: 50 },
    names: { top: 130, fs: 24 },
    persp: 1400,
  },
  l: {
    W: 1440,
    H: 900,
    src: (k: string) => `${P}/lcflap-${k}.webp`,
    flaps: [
      { k: "l", box: [0, 220, 760, 680], img: [-30, 202, 820, 740] },
      { k: "r", box: [680, 220, 760, 680], img: [650, 202, 820, 740] },
      { k: "b", box: [0, 560, 1440, 340], img: [-30, 542, 1500, 400] },
      { k: "t", box: [0, 220, 1440, 430], img: [-30, 202, 1500, 490] },
    ] as Omit<Flap, "pts">[],
    seal: [635, 565, 170] as [number, number, number],
    title: { top: 50, fs: 80 },
    names: { top: 150, fs: 28 },
    persp: 2000,
  },
};
/** Yopilish tartibi (Motion 09): past → o‘ng → chap → tepa; [boshlanish, davomiylik] — `--fc` ulushida */
const CLOSE: Record<Flap["k"], [number, number]> = {
  b: [0, 0.34],
  r: [0.18, 0.34],
  l: [0.36, 0.34],
  t: [0.54, 0.34],
};

function Final({ d, wide, z, onSeen }: { d: D; wide: boolean; z: number; onSeen: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const G = wide ? FINAL.l : FINAL.m;
  const { W, H } = G;
  const center = G.seal[1] + G.seal[2] / 2;
  const onP = useCallback(
    (_p: number, r: DOMRect) => {
      const el = ref.current;
      if (!el) return;
      const vh = window.innerHeight || 800;
      // muhr markazi ekran pastidan (100%) 45% balandligigacha ko‘tarilguncha qanotlar yopiladi, so‘ng muhr bosiladi;
      // sahifa oxiri undan oldin kelsa — yopilish sahifa oxirida tugaydi (sakrashsiz)
      const y = window.scrollY;
      const c = r.top + y + (r.height / H) * center;
      const max = document.documentElement.scrollHeight - vh;
      const s0 = Math.min(c - vh, max - vh * 0.3);
      const s1 = Math.max(s0 + 1, Math.min(c - vh * 0.45, max));
      const f = seg(y, s0, s1);
      el.style.setProperty("--fc", f.toFixed(4));
      if (f > 0.5) onSeen();
    },
    [onSeen, H, center],
  );
  const X = (x: number) => `calc(50% + ${U(x - W / 2)})`;
  const at = (b: Box, extra?: CSSProperties): CSSProperties => ({
    position: "absolute",
    left: X(b[0]),
    top: U(b[1]),
    width: U(b[2]),
    height: U(b[3]),
    ...extra,
  });
  const title = t("Sizni kutamiz!");
  const sub = wide ? [d.names, d.dmy].filter(Boolean).join(" · ") : d.names;
  const [sx, sy, ss] = G.seal;
  return (
    <Sec z={z} onP={onP} style={vars({ height: U(H), "--u": wide ? CANVAS_L : COL_M })}>
      <div ref={ref} className={cx(st.finalWrap, "absolute inset-0")}>
        <h2
          className={cx(st.pfi, "absolute inset-x-0 text-center")}
          style={{
            top: U(G.title.top),
            lineHeight: 1.333,
            zIndex: 3,
            color: "var(--paper)",
          }}
        >
          <Fit base={G.title.fs} max={W - 20} deps={title}>
            <Letters text={title} d0={0.1} step={0.04} />
          </Fit>
        </h2>
        {sub && (
          <div
            data-a="up"
            className={cx(st.pf, "absolute inset-x-0 text-center")}
            style={vars({
              top: U(G.names.top),
              lineHeight: 1.333,
              zIndex: 3,
              color: "var(--gold)",
              "--d": "0.6s",
              "--y": 14,
            })}
          >
            <FitBox base={G.names.fs} min={G.names.fs * 0.6} deps={sub} className="mx-auto" style={{ width: U(W - 30), height: U(G.names.fs * 1.333 * (wide ? 1 : 2)), lineHeight: 1.333 }}>
              {sub}
            </FitBox>
          </div>
        )}
        <div className={st.scene} style={{ perspective: U(G.persp) }}>
          {G.flaps.map((f) => (
            <div key={f.k} className={cx(st.finalFlap, st[`c${f.k}`])} style={at(f.box as Box, vars({ "--s0": CLOSE[f.k][0], "--dur": CLOSE[f.k][1] }))}>
              <Img
                src={G.src(f.k)}
                className={st.fill}
                style={{
                  position: "absolute",
                  left: U(f.img[0] - f.box[0]),
                  top: U(f.img[1] - f.box[1]),
                  width: U(f.img[2]),
                  height: U(f.img[3]),
                }}
              />
            </div>
          ))}
        </div>
        <div className={st.finalFlapSeal} style={at([sx, sy, ss, ss], { zIndex: 4 })}>
          <Img src={`${P}/seal.webp`} />
        </div>
        {!wide && d.dots && (
          <p
            data-a="fade"
            className={cx(st.msM, "absolute inset-x-0 text-center")}
            style={vars({
              top: U(760),
              fontSize: U(14),
              letterSpacing: U(3.64),
              lineHeight: 1.22,
              color: "var(--gold)",
              zIndex: 8,
              whiteSpace: "nowrap",
              "--d": "0.4s",
            })}
          >
            {d.dots}
          </p>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ Sahifa ═════════════ */
type Key = "timer" | "program" | "portrait" | "venue" | "dress" | "moments" | "rsvp" | "final";

export function MuhrSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const [revealed, setRevealed] = useState(!withGate);
  const k = wide ? "lflap" : "flap";
  const loaded = usePreload(
    [`${P}/bg.webp`, `${P}/${k}-l.webp`, `${P}/${k}-r.webp`, `${P}/${k}-t.webp`, `${P}/${k}-b.webp`, `${P}/seal.webp`],
    [
      `${P}/paper.webp`,
      `${P}/lace.webp`,
      `${P}/flap-open.webp`,
      `${P}/bow.webp`,
      `${P}/bg-dark.webp`,
      `${P}/roses.webp`,
      ...d.ph.filter(Boolean).map(String),
      ...(d.dress ? d.dress.imgs.map((x) => x.src) : []),
      ...["l", "r", "t", "b"].map((s) => `${P}/${wide ? "lcflap" : "cflap"}-${s}.webp`),
    ],
    withGate,
    wide ? "l" : "m",
  );
  useReveal(root, revealed, embedded);
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
  // Laptop: yon bezaklar uchun kursor parallaksi (±10px) — React holatisiz, CSS o‘zgaruvchilari bilan
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

  const shown: Key[] = (["timer", "program", "portrait", "venue", "dress", "moments", "rsvp", "final"] as Key[]).filter((k) =>
    k === "timer"
      ? d.hasDate
      : k === "program"
        ? d.program.length > 0
        : k === "portrait"
          ? !!(d.ph[0] || d.quote)
          : k === "dress"
            ? !!d.dress
            : k === "moments"
              ? !!(d.ph[2] || d.ph[3] || d.caption)
              : k === "rsvp"
                ? data.rsvpEnabled
                : true,
  );
  const z = (k: Key) => 7 + shown.indexOf(k);
  const linkable = mode !== "preview";
  const colU = wide ? COL_L : COL_M;
  // Figma: charm tayli mobil 864×1536 (390 kanvasda), laptop × 1.833 (1440 kanvasda)
  const bgSize = wide ? `calc(100cqw / 1440 * 3168) calc(100cqw / 1440 * 5632)` : `calc(100cqw / 390 * 1728) calc(100cqw / 390 * 3072)`;

  return (
    <div ref={root} className={st.root}>
      <div className={st.page} style={vars({ "--u": colU, "--bgs": bgSize })}>
        <MusicButton m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/seal.webp`} />}
        <div className={cx(st.flow, st.opening)} style={embedded ? vars({ "--o": 1 }) : undefined}>
          {withGate && (loaded ? <Gate d={d} wide={wide} onReveal={() => setRevealed(true)} onStart={() => music.play(true)} /> : <div className={st.gateHold} />)}
          {embedded && <Gate d={d} wide={wide} still onReveal={() => {}} onStart={() => {}} />}
          <div className={cx(st.openWrap, embedded && st.openStill)}>
            <Invite d={d} wide={wide} z={6} />
            {withGate && <div className={st.openSpacer} />}
          </div>
          {shown.includes("timer") && <Timer d={d} wide={wide} z={z("timer")} slug={data.slug} />}
          <Program d={d} wide={wide} z={z("program")} />
          <Portrait d={d} wide={wide} z={z("portrait")} />
          <Venue d={d} wide={wide} z={z("venue")} linkable={linkable} />
          <Dress d={d} wide={wide} z={z("dress")} />
          <Moments d={d} wide={wide} z={z("moments")} />
          {data.rsvpEnabled && <Rsvp d={d} wide={wide} slug={data.slug} mode={mode} z={z("rsvp")} />}
          <Final d={d} wide={wide} z={z("final")} onSeen={onFinal} />
        </div>
        <footer
          className={cx(st.footer, "flex flex-col items-center")}
          style={{
            height: wide ? S(150) : U(150),
            paddingTop: wide ? S(44) : U(44),
            gap: wide ? S(7) : U(7),
          }}
        >
          <a href="https://shohnoma.uz" className={st.pf} style={{ fontSize: wide ? S(26) : U(26), lineHeight: 1.333 }}>
            Shohnoma
          </a>
          <span
            className={st.ms}
            style={{
              fontSize: wide ? S(13) : U(13),
              lineHeight: 1.22,
              opacity: 0.65,
            }}
          >
            {t("Taklifnoma shohnoma.uz da yaratildi")}
          </span>
        </footer>
      </div>
    </div>
  );
}
