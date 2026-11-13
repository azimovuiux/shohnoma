"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { splitDate, tashkentDate } from "@/lib/display";
import { musicSrc } from "@/lib/music";
import { useLocale, useT } from "@/lib/i18n";
import type { InvitationSiteProps } from "@/components/invitation/types";
import { fetchSavedAnswer, loadSavedRsvp, rsvpUrl, saveRsvp, type RsvpStatus } from "@/components/invitation/Rsvp";
import { useGuestName } from "../shared/guest";
import { timerUnits } from "@/components/invitation/data";
import { useCountdown, useCountUp, useInView, useScrollProgress, useWide } from "../shared/hooks";
import { Loader, MusicButton, usePreload, useMusic } from "../shared/runtime";
import { DRESS, calendarWords, coordsFrom, untilPhrase, type ProgramItem } from "../anor/data";
import { P, SAVSAN_DEMO, SAVSAN_DEMO_EN, SAVSAN_DEMO_RU, calWeek, monthGrid, programIcon } from "./data";
import st from "./savsan.module.css";

/* ── Birliklar ──
 * U — kontent ustuni (Figma mobil 390 koordinatalari; laptopda ustun = mobil × 1.45, ya’ni 565.5px / 1440)
 * S — laptop kanvasi koordinatalari (yon bezaklar): S(n) = U(n / 1.45)
 * CX / SX — gorizontal joylashuv bo‘lim markaziga nisbatan (ustun markazda turadi) */
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

/* ── Ma’lumot (taklifnoma tilida — InvitationSite LocaleProvider’i) ── */
function useData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO = lang === "ru" ? SAVSAN_DEMO_RU : lang === "en" ? SAVSAN_DEMO_EN : SAVSAN_DEMO;
  const ex = (data.extra ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof ex[k] === "string" ? (ex[k] as string).trim() : "");
  const sd = splitDate(data.date);
  const guest = useGuestName();
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
    const dd = String(day).padStart(2, "0");
    const mm = String(m + 1).padStart(2, "0");
    const message = (demo ? DEMO.message : data.message || "").replace(/^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Дорогие гости!|Dear guests!)\s*/, "").trim();
    const coords = demo ? { lat: 41.3111, lon: 69.2797 } : coordsFrom(data.mapUrl);
    const venueTitle = (demo ? DEMO.venueTitle : data.venueName) || "";
    const address = (demo ? DEMO.address : data.address) || "";
    // Figma namunasi: 1-ramka — juftlik, 2-ramka — qo‘llar, ark — juftlik, keyin aylanish va kelin
    const ph = demo ? [`${P}/couple.webp`, `${P}/hands.webp`, `${P}/couple.webp`, `${P}/couple-spin.webp`, `${P}/bride.webp`] : [photos[0], photos[1], photos[2] ?? photos[0], photos[3], photos[4]];
    return {
      a,
      b,
      names: b ? `${a} & ${b}` : a,
      dots: sd?.dots ?? "",
      ddmm: date ? `${dd}.${mm}` : "",
      dmy: date ? `${dd}.${mm}.${y}` : "",
      time,
      hasDate: !!date,
      year: y,
      month: m,
      day,
      monthName: date ? cw.months[m] : "",
      week: calWeek(lang),
      weekday: date ? cw.weekday[date.getUTCDay()] : "",
      grid: date ? monthGrid(y, m) : [],
      target: data.date ? tashkentDate(data.date).getTime() : null,
      guest,
      paragraphs: message ? message.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean) : [],
      venueTitle,
      address,
      hall: str("hall") || (demo ? DEMO.hall : ""),
      mapUrl: data.mapUrl || `https://yandex.uz/maps/?text=${encodeURIComponent([venueTitle, address].filter(Boolean).join(", "))}`,
      taxi: coords
        ? `https://3.redirect.appmetrica.yandex.com/route?end-lat=${coords.lat}&end-lon=${coords.lon}&appmetrica_tracking_id=1178268795219780156`
        : `https://yandex.uz/maps/?rtext=~${encodeURIComponent([address, venueTitle].filter(Boolean).join(", "))}&rtt=taxi`,
      program,
      dress: dz ? { ...dz, title: t(dz.title), sub: t(dz.sub), note: str("dressNote") || t(dz.note), imgs: dz.imgs.map((x) => ({ ...x, label: t(x.label) })) } : null,
      ph: ph.map((x) => x || null) as (string | null)[],
      quote: str("quote") || (demo ? DEMO.quote : ""),
      caption: str("caption") || (demo ? DEMO.caption : ""),
      rsvpUntil: untilPhrase(data.rsvpDeadline, lang).replace(/(\d) /g, "$1 ").replace(/^(до|by) /, "$1 "),
      musicUrl: musicSrc(template, data),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, data, demo, guest, lang, t]);
}
type D = ReturnType<typeof useData>;

/** Bo‘lim: scroll jarayoni `--p` (0…1) — parallaks uchun */
function Sec({ children, className, style, ready, id, z, onP }: { children: ReactNode; className?: string; style?: CSSProperties; ready: boolean; id?: string; z: number; onP?: (p: number, r: DOMRect) => void }) {
  const ref = useRef<HTMLElement>(null);
  const cb = useRef(onP);
  cb.current = onP;
  useScrollProgress(
    ref,
    (p, r) => {
      ref.current?.style.setProperty("--p", p.toFixed(4));
      cb.current?.(p, r);
    },
    ready,
  );
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
function Deco({ c, rot = 0, flip, z, a, d, sp, src, children, style, rstyle, className, contain }: { c: Box; rot?: number; flip?: boolean; z?: number; a?: string; d?: number; sp?: number; src?: string; children?: ReactNode; style?: CSSProperties; rstyle?: CSSProperties; className?: string; contain?: boolean }) {
  const [x, y, w, h] = c;
  return (
    <div className={cx(st.abs, sp != null && st.px, className)} style={vars({ left: CX(x - w / 2), top: U(y - h / 2), width: U(w), height: U(h), zIndex: z, "--sp": sp, ...(style as Record<string, string>) })}>
      <div data-a={a} className="relative size-full" style={vars({ "--d": d != null ? `${d}s` : undefined, ...(rstyle as Record<string, string>) })}>
        <div className="relative size-full" style={{ transform: rot || flip ? `rotate(${rot}deg)${flip ? " scaleX(-1)" : ""}` : undefined }}>
          {children ?? (src ? <Img src={src} contain={contain} /> : null)}
        </div>
      </div>
    </div>
  );
}
/** Figma qutisi (chap, yuqori, en, bo‘y) → markaz */
const box = (l: number, t: number, w: number, h: number, dy = 0): Box => [l + w / 2, t + h / 2 - dy, w, h];

/** Gulbarg/barg (Figma «Gulbarg (tushadi)»): sprite bo‘laklari a…f */
function Petal({ c, rot, k, z = 12, d = 0.3, sp = 40 }: { c: Box; rot: number; k: string; z?: number; d?: number; sp?: number }) {
  return <Deco c={c} rot={rot} z={z} a="petal" d={d} sp={sp} src={`${P}/gulbarg-${k}.webp`} contain />;
}

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
/** Simmetrik juft (chap + o‘ng) */
function Sides({ src, l, rx, z }: { src: string; l: Box; rx: number; z?: number }) {
  return (
    <>
      <Side src={src} r={l} a="slideL" z={z} />
      <Side src={src} r={[rx, l[1], l[2], l[3]]} flip a="slideR" d={0.3} z={z} />
    </>
  );
}

/** Kumush ramka ichidagi surat (ramka teshigi ≈ 20…80%) */
function Framed({ src, c, rot, z, a = "spring", d = 0 }: { src: string; c: [number, number, number]; rot: number; z?: number; a?: string; d?: number }) {
  const [x, y, s] = c;
  return (
    <Deco c={[x, y, s, s]} rot={rot} z={z} a={a} d={d}>
      <div className="absolute overflow-hidden" style={{ left: "18.5%", top: "18.5%", width: "63%", height: "62%", background: "#c9cfbd" }}>
        <Img src={src} a="zoom" />
      </div>
      <div className="absolute inset-0">
        <Img src={`${P}/frame.webp`} />
      </div>
    </Deco>
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
      // so‘zlar bo‘linmaydi; eng uzun so‘z va hamma qatorlar sig‘maguncha shrift kichrayadi (eng kichigida — bo‘linadi)
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

function Words({ text, d0 = 0, step = 0.04 }: { text: string; d0?: number; step?: number }) {
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

/** Qog‘oz karta foni (radiuslar: tl/tr, bl/br) */
const paperR = (top: number, bot: number) => `${U(top)} ${U(top)} ${U(bot)} ${U(bot)}`;

/* ═════════════ 00 · Konvert — scroll bilan ochiladi ═════════════ */
/** Ismlar harfma-harf (scroll jarayoni --o bo‘yicha) */
function Letters({ text, s0, step = 0.012 }: { text: string; s0: number; step?: number }) {
  return (
    <>
      {[...text].map((ch, i) => (
        <span key={i} className={st.ch} style={vars({ "--s0": +(s0 + i * step).toFixed(3) })}>
          {ch}
        </span>
      ))}
    </>
  );
}

/**
 * Kartadagi ism (56px qator). Uzun, bo‘shliqli ism (13+ harf) — ikki qatorga bo‘linadi (har biri o‘z eniga sig‘adi),
 * aks holda bitta qator kichrayadi (Fit).
 */
function HeroName({ text, top, max, s0, step }: { text: string; top: number; max: number; s0: number; step: number }) {
  const chars = [...text];
  const sp = text.trim().includes(" ") && chars.length > 13;
  if (!sp)
    return (
      <span className="absolute inset-x-0 flex justify-center" style={{ top: U(top), height: U(56) }}>
        <Fit base={56} max={max} deps={text}>
          <Letters text={text} s0={s0} step={step} />
        </Fit>
      </span>
    );
  // o‘rtaga eng yaqin bo‘shliqdan bo‘lish
  const mid = text.length / 2;
  let cut = -1;
  for (let i = 0; i < text.length; i++) if (text[i] === " " && (cut < 0 || Math.abs(i - mid) < Math.abs(cut - mid))) cut = i;
  const l1 = text.slice(0, cut).trim();
  const l2 = text.slice(cut + 1).trim();
  return (
    <span className="absolute inset-x-0 flex flex-col items-center justify-center" style={{ top: U(top - 6), height: U(68), lineHeight: 1.02 }}>
      <Fit base={34} max={max} deps={l1}>
        <Letters text={l1} s0={s0} step={step} />
      </Fit>
      <Fit base={34} max={max} deps={l2}>
        <Letters text={l2} s0={s0 + [...l1].length * step} step={step} />
      </Fit>
    </span>
  );
}

/** still — mokap ichida (embedded): scroll’siz, ochilgan holat (Figma kadri) */
function Gate({ d, wide, onReveal, onStart, still = false }: { d: D; wide: boolean; onReveal: () => void; onStart: () => void; still?: boolean }) {
  const t = useT();
  const wrap = useRef<HTMLDivElement>(null);
  const cb = useRef({ onReveal, onStart });
  cb.current = { onReveal, onStart };
  useEffect(() => {
    const el = wrap.current;
    if (!el || still) return;
    let raf = 0;
    let cur = 0;
    let target = 0;
    let H = window.innerHeight;
    let revealed = false;
    let started = false;
    const read = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      H = (el.firstElementChild as HTMLElement | null)?.offsetHeight || vh;
      target = Math.min(Math.max(0, -r.top), Math.max(1, r.height - vh));
      // sahna pastki cheti keyingi bo‘limga yopishib ketadi (lerp’siz — tirqish ochilmaydi)
      const shift = Math.min(H, Math.max(0, 2 * H - r.bottom));
      el.style.setProperty("--gy", `${shift.toFixed(1)}px`);
      el.style.pointerEvents = shift > H * 0.6 ? "none" : "";
    };
    const apply = (k: number) => {
      // ochilish 0 … 0.45 ekran scroll’da tugaydi (muhr → qopqoq → karta), keyin sahna keyingi bo‘lim bilan chiqib ketadi
      const o = clamp01(k / (H * 0.45));
      el.style.setProperty("--o", o.toFixed(4));
      if (!started && k > 4) {
        started = true;
        cb.current.onStart();
      }
      if (!revealed && o > 0.85) {
        revealed = true;
        cb.current.onReveal();
      }
    };
    const loop = () => {
      cur += (target - cur) * 0.12;
      if (Math.abs(target - cur) < 0.4) cur = target;
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

  const W = 390;
  const HH = 860; // Figma «00 Hero» (mobil 860; laptop 1247 = 860 × 1.45)
  const colU = wide ? "calc(100cqw / 1440 * 1.45)" : "calc(100cqw / 390)";
  // sahna koordinatasi: gorizontal markazdan, vertikal — pastki chetdan
  const Y = (y: number) => `calc(100% - ${U(HH - y)})`;
  const YS = (y: number) => `calc(100% - ${S(HH * 1.45 - y)})`;
  const at = (r: Box, extra?: CSSProperties): CSSProperties => ({ position: "absolute", left: CX(r[0]), top: Y(r[1]), width: U(r[2]), height: U(r[3]), ...extra });
  const atC = (c: Box, rot = 0): CSSProperties => ({ position: "absolute", left: CX(c[0] - c[2] / 2), top: Y(c[1] - c[3] / 2), width: U(c[2]), height: U(c[3]), rotate: rot ? `${rot}deg` : undefined });
  const atS = (r: Box): CSSProperties => ({ position: "absolute", left: SX(r[0]), top: YS(r[1]), width: S(r[2]), height: S(r[3]) });
  // keyingi bo‘lim foni bilan bir xil o‘lchamdagi tayl (sahifa birligida)
  const PU = (n: number) => `calc(${colU} * ${n})`;
  const bgSize = wide ? `${PU(357.517)} ${PU(635.586)}` : `${PU(388.8)} ${PU(691.2)}`;
  const flap: Box = [40, 493.45, 315, 179];
  const card: Box = [47, 96, 296, 470];
  const single = !d.b;
  const nameMax = 250;
  const n1Top = single ? 171 : 118;
  // harflar: kartaning ko‘tarilishi oxirida
  const s1 = 0.7;
  const la = [...d.a].length;
  // hamma harf o‘=0.9 gacha boshlanadi (uzun ismlarda qadam kichrayadi)
  const step = Math.min(0.012, 0.18 / Math.max(1, la + [...(d.b ?? "")].length));
  const petals: [Box, number, string][] = [
    [box(20.44, 60, 52.473, 52.886), 30, "a"],
    [box(326, 308.15, 46.933, 46.748), -40, "b"],
    [box(60, 289.74, 36.893, 34.169), -20, "c"],
    [box(288.5, 770, 50.14, 53.283), 15, "d"],
  ];
  const pSize: Record<string, [number, number]> = { a: [38, 39.129], b: [34, 32.496], c: [30, 25.443], d: [40, 44.444] };

  return (
    <div
      ref={wrap}
      className={cx(st.gateWrap, still && st.still)}
      style={vars(still ? { "--u": colU, "--o": 1, height: U(HH), marginBottom: 0 } : { "--u": `min(${colU}, calc(100svh / ${HH}))` })}
    >
      <div className={st.gate} aria-label={t("Taklifnoma")} style={still ? { position: "relative", height: "100%", transform: "none" } : undefined}>
        <div className={cx(st.gBg, st.fadeIn)} style={{ backgroundSize: bgSize }} />
        {/* Laptop: yon liliya shoxlari (orqada) */}
        {wide && (
          <div className={cx(st.gl, st.gSide)}>
            <div style={atS([93, 150.6, 280, 496.879])}>
              <div className={cx("size-full", st.slideInL)} style={{ animationDelay: "0.3s" }}>
                <Img src={`${P}/lily-stem.webp`} eager />
              </div>
            </div>
            <div style={atS([1067, 150.6, 280, 496.879])}>
              <div className={cx("size-full", st.slideInR)} style={{ animationDelay: "0.35s" }}>
                <Img src={`${P}/lily-stem.webp`} eager className={st.flipX} />
              </div>
            </div>
          </div>
        )}
        {/* Qopqoq — ochilgach karta orqasida */}
        <div className={cx(st.gl, st.gEnv)} style={{ zIndex: 1 }}>
          <div className={cx(st.flap, st.flapBack)} style={at(flap)}>
            <Img src={`${P}/flap.webp`} eager className={st.fill} />
          </div>
        </div>
        {/* Liliya shoxi karta ortidan o‘sib chiqadi */}
        <div className={st.gl} style={{ zIndex: 2 }}>
          <div style={atC(box(224.95, 80, 185.586, 284.47).slice(0, 2).concat([150, 266.185]) as Box)}>
            <div className={cx("size-full", st.gStem)}>
              <Img src={`${P}/lily-stem.webp`} eager />
            </div>
          </div>
        </div>
        {/* Ark karta — konvert ichidan ko‘tariladi (konvert tepasidan pastda ko‘rinmaydi) */}
        <div className={cx(st.gl, st.gCard)} style={{ zIndex: 3 }}>
          <div className={st.pocket} style={{ bottom: U(HH - 600) }}>
            <div className={st.card} style={{ left: CX(card[0]), top: `calc(100% - ${U(600 - card[1])})`, width: U(card[2]), height: U(card[3]) }}>
              <div className={cx("absolute inset-0", st.paper, st.dshadow)} style={{ borderRadius: paperR(148, 8) }} />
              <div className="absolute" style={{ left: U(12), top: U(12), width: U(272), height: U(446), border: `${U(1)} solid rgba(168,136,74,.55)`, borderRadius: paperR(136, 4) }} />
              <h1 className={cx(st.prata, "absolute inset-x-0 text-center")} style={{ top: 0, height: "100%", color: "var(--ink)", lineHeight: 1 }}>
                <HeroName text={d.a} top={n1Top} max={nameMax} s0={s1} step={step} />
                {d.b && (
                  <>
                    <span className={cx(st.lora, "absolute inset-x-0 block")} style={{ top: U(178), fontSize: U(40), color: "var(--gold)" }}>
                      <Letters text="&" s0={s1 + la * step} />
                    </span>
                    <HeroName text={d.b} top={224} max={nameMax} s0={s1 + (la + 1) * step} step={step} />
                  </>
                )}
              </h1>
              {d.dots && (
                <p className={cx(st.sansM, "absolute inset-x-0 text-center")} style={{ top: U(single ? 260 : 312), fontSize: U(15), letterSpacing: U(3), color: "var(--sage)", lineHeight: 1.22, whiteSpace: "nowrap" }}>
                  <Letters text={d.dots} s0={0.86} step={0.004} />
                </p>
              )}
            </div>
          </div>
        </div>
        {/* Konvert tanasi */}
        <div className={cx(st.gl, st.gEnv)} style={{ zIndex: 4 }}>
          <div style={at([3, 470, 384, 288])}>
            <div className={cx("size-full", st.riseIn)} style={{ animationDelay: "0.1s" }}>
              <Img src={`${P}/envelope.webp`} eager />
            </div>
          </div>
          {/* yopiq qopqoq (old) */}
          <div className={cx(st.flap, st.flapFront)} style={at(flap)}>
            <div className={cx("size-full", st.riseIn)} style={{ animationDelay: "0.1s" }}>
              <Img src={`${P}/flap.webp`} eager className={st.fill} />
            </div>
          </div>
          {/* Oltin muhr — bosiladi va konvert ustida qoladi (Figma) */}
          <div className={st.seal} style={at([156, 560, 78, 78])}>
            <div className={cx("absolute inset-0", st.riseIn)} style={{ animationDelay: "0.1s" }}>
              <span className={st.sealRing} aria-hidden />
              <div className={cx(st.sealHalf, st.sealL)}>
                <Img src={`${P}/seal.webp`} eager />
              </div>
              <div className={cx(st.sealHalf, st.sealR)}>
                <Img src={`${P}/seal.webp`} eager />
              </div>
            </div>
          </div>
        </div>
        {/* Atlas bant va pochta markasi — karta chiqqach */}
        <div className={st.gl} style={{ zIndex: 6 }}>
          <div style={atC(box(-21.03, 420, 145.466, 145.466).slice(0, 2).concat([120, 120]) as Box, 14)}>
            <div className={cx("size-full", st.gBow)}>
              <Img src={`${P}/bow.webp`} eager />
            </div>
          </div>
          <div style={atC(box(288, 70.86, 96.106, 96.106).slice(0, 2).concat([84, 84]) as Box, -9)}>
            <div className={cx("size-full", st.gStamp)}>
              <Img src={`${P}/stamp.webp`} eager />
            </div>
          </div>
        </div>
        {/* Burchak liliyalar — yon tomondan suriladi (mobil: old; laptop: yon tomonlarda) */}
        <div className={cx(st.gl, st.gLily)} style={{ zIndex: 7 }}>
          {wide ? (
            <>
              <div style={atS([40, 857, 360, 360])}>
                <div className={cx("size-full", st.slideInL)} style={{ animationDelay: "0.4s" }}>
                  <Img src={`${P}/lily-corner.webp`} eager />
                </div>
              </div>
              <div style={atS([1040, 857, 360, 360])}>
                <div className={cx("size-full", st.slideInR)} style={{ animationDelay: "0.45s" }}>
                  <Img src={`${P}/lily-corner.webp`} eager className={st.flipX} />
                </div>
              </div>
            </>
          ) : (
            <div style={at([-46, 600, 230, 230])}>
              <div className={cx("size-full", st.slideInL)} style={{ animationDelay: "0.4s" }}>
                <Img src={`${P}/lily-corner.webp`} eager />
              </div>
            </div>
          )}
        </div>
        <div className={cx(st.gl, st.gLily)} style={{ zIndex: 8 }}>
          {petals.map(([c, r, k], i) => (
            <div key={k} style={atC([c[0], c[1], pSize[k][0], pSize[k][1]], r)}>
              <div className={cx("size-full", st.dropIn)} style={{ animationDelay: `${0.9 + i * 0.18}s` }}>
                <Img src={`${P}/gulbarg-${k}.webp`} eager contain />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═════════════ 01 · Taklif — kolaj ═════════════ */
function Calendar({ d }: { d: D }) {
  const col = (i: number) => U(23 + 22 * i - 11);
  return (
    <div className={cx("absolute inset-0", st.paper)} style={{ borderRadius: U(10) }}>
      <p className={cx(st.lora, "absolute inset-x-0 text-center")} style={{ top: U(16), fontSize: U(19), lineHeight: 1.28, color: "var(--ink)", whiteSpace: "nowrap" }}>
        {d.monthName} {d.year}
      </p>
      {d.week.map((w, i) => (
        <span key={i} className={cx(st.sansB, "absolute text-center")} style={{ left: col(i), top: U(50), width: U(22), fontSize: U(9), lineHeight: 1.22, color: "var(--muted)" }}>
          {w}
        </span>
      ))}
      {d.grid.map((row, r) =>
        row.map((n, c) => {
          if (!n) return null;
          const on = n === d.day;
          const top = 71 + 22 * r;
          return (
            <span key={`${r}-${c}`}>
              {on && (
                <svg data-a="ring" className={cx(st.dayRing, "absolute")} viewBox="0 0 22 22" style={vars({ left: U(23 + 22 * c - 11), top: U(top - 5), width: U(22), height: U(22), "--d": "0.7s", overflow: "visible" })} aria-hidden>
                  <circle cx="11" cy="11" r="10" transform="rotate(-90 11 11)" />
                </svg>
              )}
              <span
                data-a="pop"
                className={cx(on ? st.sansB : st.sansM, "absolute text-center")}
                style={vars({ left: col(c), top: U(top), width: U(22), fontSize: U(10), lineHeight: 1.22, color: on ? "var(--paper)" : "var(--ink)", opacity: !on && c >= 5 ? 0.55 : undefined, "--d": `${(0.3 + (r + c) * 0.025).toFixed(3)}s` })}
              >
                {n}
              </span>
            </span>
          );
        }),
      )}
    </div>
  );
}

function Invite({ d, wide, z }: { d: D; wide: boolean; z: number }) {
  const t = useT();
  const R0 = 308.28; // karta (aylantirilmagan) pastki cheti — kolajning qolgan qismi shundan o‘lchanadi
  const f1 = d.ph[0];
  const f2 = d.ph[1];
  const restH = f1 || f2 ? 672.275 : 400;
  const ry = (y: number) => y - R0;
  const va = t("va");
  return (
    <Sec ready z={z} style={{ paddingTop: U(64.28) }}>
      {wide && <Sides src={`${P}/lily-stem.webp`} l={[113, 497.95, 240, 425.896]} rx={1087} />}
      <Deco c={box(290.26, 40, 79.061, 79.061).slice(0, 2).concat([70, 70]) as Box} rot={8} z={9} a="stick" d={1} src={`${P}/stamp.webp`} />
      <div data-a="place" className={cx("relative", st.paper)} style={vars({ marginLeft: CX(30.52), width: U(330), rotate: "1.5deg", borderRadius: U(6), padding: `${U(30)} ${U(28)}`, boxShadow: `0 ${U(14)} ${U(30)} ${U(-6)} rgba(31,41,26,.14)`, zIndex: 3, "--rr": "-3deg" })}>
        <p className={cx(st.prata, "text-center")} style={{ fontSize: U(30), lineHeight: 1.15, color: "var(--ink)", overflowWrap: "anywhere" }}>
          {d.guest ? t("Hurmatli {guest}", { guest: d.guest }) : t("Aziz mehmonlarimiz!")}
        </p>
        {d.paragraphs.map((p, i) => (
          <p key={i} className={cx(st.sans, "text-center")} style={{ fontSize: U(16), lineHeight: 1.6, color: "var(--muted)", marginTop: U(12), whiteSpace: "pre-line", overflowWrap: "anywhere" }}>
            {p}
          </p>
        ))}
      </div>
      <div className="relative" style={{ height: U(restH) }}>
        <Deco c={[205, ry(330.15), 110, 195.202]} z={1} a="grow" d={0.5} sp={-30} src={`${P}/lily-stem.webp`} />
        {(f1 || f2) && <Deco c={box(229.43, ry(532.77), 170, 170)} flip z={2} a="slideR" d={0.3} sp={-36} src={`${P}/lily-corner.webp`} />}
        {d.hasDate && (
          <Deco c={[98.69, ry(472.83), 176, 206]} rot={5} z={4} a="place" d={0.15} rstyle={vars({ "--rr": "-17deg" })} className={st.dshadow}>
            <Calendar d={d} />
          </Deco>
        )}
        <Deco c={[302.72, ry(430.88), 176, 176]} rot={-6} z={5} a="spin" d={0.3} src={`${P}/doily.webp`} />
        <Deco c={[302.72, ry(430.9), 128, 116]} z={6} a="fade" d={0.9}>
          <FitBox base={24} min={11} deps={d.names} className={cx(st.loraM, "flex size-full items-center justify-center text-center")} style={{ lineHeight: 1.2, color: "var(--ink)", overflowWrap: "anywhere" }}>
            {d.a}
            {d.b && (
              <>
                <br />
                {va}
                <br />
                {d.b}
              </>
            )}
          </FitBox>
        </Deco>
        {f1 && <Framed src={f1} c={[142.48, ry(733.3), 289.55]} rot={4} z={7} d={0.1} />}
        {f2 && <Framed src={f2} c={[256.13, ry(917.35), 262.978]} rot={-7} z={8} d={0.3} />}
        <Petal c={[42, ry(344.6), 36, 26.922]} rot={-25} k="e" />
        {(f1 || f2) && <Petal c={[357.1, ry(575.95), 28, 23.747]} rot={20} k="f" d={0.5} />}
        {(f1 || f2) && <Petal c={[194.17, ry(928.41), 34, 37.778]} rot={-30} k="d" d={0.6} />}
      </div>
    </Sec>
  );
}

/* ═════════════ 02 · Taymer — tishli yorliqlar va iqtibos ═════════════ */
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

function Timer({ d, wide, z }: { d: D; wide: boolean; z: number }) {
  const t = useT();
  const units = timerUnits(useLocale());
  const c = useCountdown(d.target);
  const [ref, inView] = useInView<HTMLDivElement>(0.3, true);
  const title = t("To‘yimizgacha");
  const timer = d.hasDate && c;
  if (!timer && !d.quote) return null;
  const tags: [Box, number, number, number, number][] = [
    // markaz, burilish, matn markazi x, raqam tepasi
    [[101.81, 215.58, 158, 158], 5, 109, 172, 0],
    [[290.58, 201.81, 158, 158], -5, 284, 172, 1],
    [[115.58, 377.81, 158, 158], -5, 109, 348, 2],
    [[276.81, 391.58, 158, 158], 5, 284, 348, 3],
  ];
  const vals = c ? [c.d, c.h, c.m, c.s] : [0, 0, 0, 0];
  return (
    <Sec ready z={z}>
      {wide && <Sides src={`${P}/lily-stem.webp`} l={[113, 306.88, 240, 425.896]} rx={1087} />}
      {timer ? (
        <div ref={ref} className="relative" style={{ height: U(510) }}>
          <p data-a="blur" className={cx(st.prata, "absolute inset-x-0 text-center")} style={{ top: U(60), lineHeight: 1.35, color: "var(--paper)", zIndex: 3 }}>
            {/* o‘ngdagi gulbarg va 01-bo‘lim ramkasi bilan to‘qnashmasin */}
            <Fit base={38} max={276} deps={title}>
              {title}
            </Fit>
          </p>
          <Deco c={[205, 217.6, 110, 195.202]} z={1} a="grow" d={0.6} sp={-30} src={`${P}/lily-stem.webp`} />
          {tags.map(([cc, rot, tx, ty, i]) => (
            <div key={i}>
              <Deco c={cc} rot={rot} z={2} a="spin" d={0.1 + i * 0.12} rstyle={vars({ "--rr": `${rot > 0 ? -30 : 30}deg` })} src={`${P}/doily.webp`} />
              <div data-a="num" className={cx(st.prata, "absolute text-center")} style={vars({ left: CX(tx - 79), top: U(ty), width: U(158), height: U(62), fontSize: U(46), lineHeight: 1.348, color: "var(--ink)", zIndex: 3, "--d": `${0.35 + i * 0.12}s` })}>
                <Digits value={vals[i]} run={inView} len={i === 0 ? Math.max(2, String(vals[0]).length) : 2} i={i} />
              </div>
              <p data-a="fade" className={cx(st.lora, "absolute text-center")} style={vars({ left: CX(tx - 79), top: U(ty + 58), width: U(158), fontSize: U(18), lineHeight: 1.28, color: "var(--muted)", whiteSpace: "nowrap", zIndex: 3, "--d": `${0.55 + i * 0.12}s` })}>
                {units[i]}
              </p>
            </div>
          ))}
          <Petal c={[353.25, 101.26, 36, 37.069]} rot={-20} k="a" />
          <Petal c={[32.03, 490.62, 32, 30.584]} rot={25} k="b" d={0.5} />
        </div>
      ) : (
        <div style={{ height: U(90) }} />
      )}
      {d.quote && (
        <div data-a="rise" className={cx(st.ribbon, "relative")} style={vars({ marginLeft: CX(30), width: U(330), borderRadius: U(40), padding: `${U(20)} ${U(26)}`, zIndex: 3, "--y": 40 })}>
          <p className={cx(st.lora, "text-center")} style={{ fontSize: U(18), lineHeight: 1.4, color: "var(--paper)", overflowWrap: "anywhere" }}>
            <Words text={d.quote} d0={0.3} step={0.04} />
          </p>
        </div>
      )}
      <div className="relative" style={{ height: U(d.quote ? 90 : 50) }}>
        {d.quote && <Petal c={[197.05, 13.09, 26, 22.051]} rot={-40} k="c" d={0.4} />}
      </div>
    </Sec>
  );
}

/* ═════════════ 03 · Kun tartibi — ark panel ═════════════ */
function Program({ d, wide, z }: { d: D; wide: boolean; z: number }) {
  const t = useT();
  const items = d.program.slice(0, 8);
  const n = items.length;
  if (!n) return null;
  const title = t("Kun tartibi");
  const gap = U(6);
  return (
    <Sec ready z={z} style={{ paddingTop: U(80), paddingBottom: U(70) }}>
      {wide && <Sides src={`${P}/lily-stem.webp`} l={[113, 670.83, 240, 425.896]} rx={1087} />}
      <Deco c={[30, 226.47, 120, 212.948]} z={3} a="grow" d={0.4} sp={-30} src={`${P}/lily-stem.webp`} />
      <Petal c={[354.77, 210.52, 36, 40]} rot={-25} k="d" />
      {n >= 3 && <Petal c={[20.19, 577.28, 28, 23.747]} rot={30} k="f" d={0.5} />}
      <div data-a="rise" className="relative" style={vars({ marginLeft: CX(30), width: U(330), zIndex: 2, "--y": 90, "--t": "1.3s" })}>
        <div className={cx("absolute inset-0", st.paper, st.shadow)} style={{ borderRadius: paperR(165, 10) }} />
        {/* liliya burchagi: qog‘oz ustida, matn ostida (matn hech qachon rasm ostida qolmaydi — rang qog‘ozdan ajraladi) */}
        {n >= 3 && (
          <div className="absolute" style={{ left: U(192), bottom: U(110), width: U(220), height: U(220), zIndex: 1, pointerEvents: "none" }}>
            <div data-a="slideR" className="size-full" style={vars({ "--d": "0.5s" })}>
              <Img src={`${P}/lily-corner.webp`} className={st.flipX} />
            </div>
          </div>
        )}
        <div className="relative flex flex-col items-center text-center" style={{ padding: `${U(110)} ${U(30)} ${U(60)}`, gap, zIndex: 2 }}>
          <p data-a="blur" className={st.prata} style={{ fontSize: U(34), lineHeight: 1.1, color: "var(--ink)", width: "100%" }}>
            <Fit base={34} max={270} deps={title}>
              {title}
            </Fit>
          </p>
          <div style={{ height: U(22) }} />
          {items.map((it, i) => (
            <div key={i} className="flex w-full flex-col items-center" style={{ gap }}>
              {i > 0 && (
                <>
                  <div style={{ height: U(10) }} />
                  <span data-a="lineY" style={vars({ width: U(1), height: U(36), background: "rgba(168,136,74,.5)", "--d": "0.1s" })} />
                  <div style={{ height: U(14) }} />
                </>
              )}
              <span data-a="draw" style={vars({ width: U(34), height: U(34), "--d": "0.15s" })}>
                <Img src={programIcon(it, i)} contain />
              </span>
              <p data-a="num" className={st.prata} style={vars({ fontSize: U(30), lineHeight: 1.36, color: "var(--sage)", "--d": "0.25s" })}>
                {it.time}
              </p>
              <p data-a="blur" className={cx(st.lora, st.clamp2)} style={vars({ fontSize: U(22), lineHeight: 1.3, color: "var(--ink)", width: "100%", "--d": "0.35s" })}>
                {it.title}
              </p>
              {it.note ? (
                <p data-a="up" className={cx(st.sans, st.clamp2)} style={vars({ fontSize: U(15), lineHeight: 1.5, color: "var(--muted)", width: "100%", "--y": 14, "--d": "0.45s" })}>
                  {it.note}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </Sec>
  );
}

/* ═════════════ 04 · Bazm manzili — konvertdan liliyalar ═════════════ */
function Venue({ d, wide, z, linkable }: { d: D; wide: boolean; z: number; linkable: boolean }) {
  const t = useT();
  const info = [
    d.hasDate && ["cal", d.weekday.toUpperCase(), d.dmy],
    d.time && ["clock", t("VAQT"), d.time],
    d.hall && ["pin", t("ZAL"), d.hall],
  ].filter(Boolean) as [string, string, string][];
  const B = 667; // karta pastki cheti (Figma) — liliyalar va tugmalar shundan o‘lchanadi
  const rb = (y: number) => y - B;
  return (
    <Sec ready z={z} style={{ paddingTop: U(60), paddingBottom: U(216) }}>
      {wide && <Sides src={`${P}/lilies.webp`} l={[68, 516.42, 330, 247.5]} rx={1042} />}
      <Deco c={box(300, 57.84, 81.092, 81.092).slice(0, 2).concat([70, 70]) as Box} rot={-10} z={6} a="stick" d={0.9} src={`${P}/stamp.webp`} />
      <Petal c={[28.45, 314.81, 26, 22.051]} rot={20} k="c" />
      <div className="relative">
        <div data-a="rise" className={cx("relative flex flex-col items-center text-center", st.paper, st.shadow)} style={vars({ marginLeft: CX(35), width: U(320), borderRadius: paperR(160, 8), padding: `${U(100)} ${U(30)} ${U(300)}`, gap: U(10), zIndex: 2, "--y": 90 })}>
          <p data-a="blur" className={st.prata} style={{ fontSize: U(34), lineHeight: 1.1, color: "var(--ink)", width: "100%" }}>
            <Fit base={34} max={260} deps={t("Bazm manzili")}>
              {t("Bazm manzili")}
            </Fit>
          </p>
          {d.venueTitle && (
            <p data-a="up" className={cx(st.lora, st.clamp3)} style={vars({ fontSize: U(22), lineHeight: 1.28, color: "var(--sage)", width: "100%", "--y": 16, "--d": "0.15s" })}>
              {d.venueTitle}
            </p>
          )}
          {d.address && (
            <p data-a="up" className={st.sans} style={vars({ fontSize: U(16), lineHeight: 1.5, color: "var(--muted)", width: "100%", overflowWrap: "anywhere", "--y": 16, "--d": "0.22s" })}>
              {d.address}
            </p>
          )}
          {info.length > 0 && (
            <>
              <div style={{ height: U(10) }} />
              <div className="flex items-start justify-center" style={{ gap: U(24), width: "100%" }}>
                {info.map(([ic, lb, v], i) => (
                  <div key={ic} data-a="up" className="flex flex-col items-center" style={vars({ gap: U(4), minWidth: 0, maxWidth: U(i === 2 ? 96 : 110), "--y": 14, "--d": `${0.3 + i * 0.08}s` })}>
                    <span style={{ width: U(28), height: U(28) }}>
                      <Img src={`${P}/i-${ic}.svg`} contain />
                    </span>
                    <span className={st.sansB} style={{ fontSize: U(10), letterSpacing: U(1.4), lineHeight: 1.22, color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {lb}
                    </span>
                    <span className={cx(st.prata, ic === "pin" && st.clamp2)} style={{ fontSize: U(15), lineHeight: 1.35, color: "var(--ink)", whiteSpace: ic === "pin" ? undefined : "nowrap" }}>
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        {/* karta pastidan: konvertdan liliyalar va tugmalar */}
        <div className="absolute inset-x-0" style={{ top: "100%", height: 0, zIndex: 3 }}>
          <Deco c={box(-5, rb(376.83), 400, 300)} z={1} a="burst" d={0.2} src={`${P}/lilies.webp`} />
          <Petal c={[351.08, rb(562.51), 34, 25.426]} rot={-30} k="e" d={0.6} />
          <a href={linkable ? d.mapUrl : undefined} target="_blank" rel="noopener noreferrer" aria-label={t("Xaritada ochish")}>
            <Deco c={[114.15, rb(714.4), 190, 190]} rot={4} z={4} a="spring" d={0.5} className={st.hov}>
              <div className={cx("absolute", st.paper)} style={{ left: "14.07%", top: "14.07%", width: "71.86%", height: "71.86%" }} />
              <div className={cx(st.lora, "absolute inset-0 flex items-center justify-center text-center")} style={{ fontSize: U(19), lineHeight: 1.2, color: "var(--ink)", padding: `0 ${U(37)}` }}>
                <span className={st.clamp3}>{t("Xaritada ochish")}</span>
              </div>
              <div className="absolute inset-0">
                <Img src={`${P}/frame.webp`} />
              </div>
            </Deco>
          </a>
          <a href={linkable ? d.taxi : undefined} target="_blank" rel="noopener noreferrer" aria-label={t("Taksi chaqirish")}>
            <Deco c={[298.71, rb(700.83), 150, 150]} z={4} a="spring" d={0.65} className={st.hov}>
              <div className="absolute inset-0" style={{ rotate: "-8deg" }}>
                <Img src={`${P}/doily.webp`} />
              </div>
              <div className={cx(st.lora, "absolute inset-0 flex items-center justify-center text-center")} style={{ fontSize: U(20), lineHeight: 1.2, color: "var(--ink)", padding: `0 ${U(14)}` }}>
                <span className={st.clamp3} style={{ maxWidth: U(118) }}>
                  {t("Taksi chaqirish")}
                </span>
              </div>
            </Deco>
          </a>
        </div>
      </div>
    </Sec>
  );
}

/* ═════════════ 05 · Dress-kod (ixtiyoriy) ═════════════ */
function Dress({ d, wide, z }: { d: D; wide: boolean; z: number }) {
  const t = useT();
  if (!d.dress) return null;
  const x = d.dress;
  const one = x.imgs.length === 1;
  return (
    <Sec ready z={z} style={{ paddingTop: U(170), paddingBottom: U(90) }}>
      {wide && <Sides src={`${P}/lily-stem.webp`} l={[103, 289.13, 260, 461.387]} rx={1077} />}
      <p data-a="blur" className={cx(st.prata, "absolute inset-x-0 text-center")} style={{ top: U(60), lineHeight: 1.35, color: "var(--paper)" }}>
        <Fit base={40} max={360} deps={t("Dress-kod")}>
          {t("Dress-kod")}
        </Fit>
      </p>
      <p data-a="up" className={cx(st.sans, st.clamp2, "absolute text-center")} style={vars({ left: CX(30), top: U(118), width: U(330), fontSize: U(16), lineHeight: 1.22, color: "var(--paper)", opacity: 0.9, "--y": 14, "--d": "0.15s" })}>
        {t("Ushbu kunning go‘zalligini birga yaratamiz")}
      </p>
      <Deco c={box(300, 99.16, 155.155, 230.551).slice(0, 2).concat([120, 212.948]) as Box} rot={-10} z={4} a="grow" d={0.6} sp={-30} src={`${P}/lily-stem.webp`} />
      <div data-a="rise" className={cx(st.dressCard, "relative flex flex-col items-center text-center")} style={vars({ marginLeft: CX(24), width: U(342), padding: `${U(74)} ${U(24)} ${U(28)}`, gap: U(12), borderRadius: paperR(171, 28), zIndex: 2, "--y": 80 })}>
        <div className={cx("absolute inset-0", st.paper)} style={{ borderRadius: "inherit", zIndex: -1 }} />
        <p className={st.prata} style={{ fontSize: U(34), lineHeight: 1.1, color: "var(--ink)", width: "100%", overflowWrap: "anywhere" }}>
          {x.title}
        </p>
        <p className={st.sans} style={{ fontSize: U(16), lineHeight: 1.22, color: "var(--sage)", width: "100%" }}>
          {x.sub}
        </p>
        <div className="flex w-full justify-center" style={{ gap: U(10) }}>
          {x.imgs.map((im, i) => (
            <div key={im.src} className="flex flex-col items-center" style={{ gap: U(8), flex: one ? "none" : "1 1 0", width: one ? U(294) : undefined, minWidth: 0 }}>
              <div data-a="up" className="overflow-hidden" style={vars({ width: U(one ? 230 : 142), height: U(one ? 265 : 164), borderRadius: one ? paperR(115, 14) : paperR(71, 14), background: "#fff", "--y": 24, "--d": `${0.35 + i * 0.12}s` })}>
                <Img src={im.src} />
              </div>
              <p className={st.sansM} style={{ fontSize: U(13), letterSpacing: U(1.56), lineHeight: 1.22, color: "var(--muted)", whiteSpace: "nowrap" }}>
                {im.label}
              </p>
            </div>
          ))}
        </div>
        <p className={st.sans} style={{ fontSize: U(16), lineHeight: 1.5, color: "var(--muted)", width: "100%", overflowWrap: "anywhere" }}>
          {x.note}
        </p>
      </div>
    </Sec>
  );
}

/* ═════════════ 06 · Lahzalar — ark surat va yorliq ═════════════ */
function Moments({ d, wide, z }: { d: D; wide: boolean; z: number }) {
  const arch = d.ph[2];
  const spin = d.ph[3];
  const bride = d.ph[4];
  if (!arch && !d.caption) return null;
  const frames = !!(spin || bride);
  // suratsiz (faqat yorliq yozuvi) — ixcham kompozitsiya, yorliq bo‘lim markazida
  const dy = arch ? 0 : 340;
  const H = arch ? (frames ? 880 : 730) : 380;
  return (
    <Sec ready z={z} style={{ height: U(H) }}>
      {wide && <Sides src={`${P}/lily-stem.webp`} l={[113, 425.05, 240, 425.896]} rx={1087} />}
      {arch && (
        <>
          <div data-a="rise" className={cx("absolute", st.paper)} style={vars({ left: CX(35), top: U(50), width: U(320), height: U(420), borderRadius: paperR(160, 10), boxShadow: `0 ${U(14)} ${U(30)} ${U(-6)} rgba(31,41,26,.18)`, zIndex: 1, "--y": 80 })} />
          <div data-a="arch" className="absolute overflow-hidden" style={vars({ left: CX(45), top: U(60), width: U(300), height: U(400), borderRadius: paperR(150, 6), zIndex: 2, background: "#c9cfbd", "--d": "0.3s" })}>
            <Img src={arch} a="zoom" />
          </div>
          <Deco c={box(-40, 310, 200, 200)} z={3} a="slideL" d={0.5} sp={-30} src={`${P}/lily-corner.webp`} />
        </>
      )}
      <Deco c={[265.45, 513.75 - dy, 210, 210]} rot={5} z={4} a="spin" d={0.3} rstyle={vars({ "--rr": "-25deg" })} src={`${P}/doily.webp`} />
      {d.caption && (
        <Deco c={[262, 506 - dy, 140, 108]} z={5}>
          <FitBox base={21} min={14} deps={d.caption} className={cx(st.loraM, "flex size-full items-center justify-center text-center")} style={{ lineHeight: 1.25, color: "var(--ink)", overflowWrap: "anywhere" }}>
            <Words text={d.caption} d0={0.8} step={0.06} />
          </FitBox>
        </Deco>
      )}
      {spin && <Framed src={spin} c={[120.18, 642.93, 210]} rot={5} z={6} d={0.2} />}
      {bride && <Framed src={bride} c={[290.15, 744.83, 170]} rot={-6} z={7} d={0.4} />}
      <Deco c={[336.4, 591.58 - dy, 110, 165]} rot={-12} z={8} a="spin" d={0.7} rstyle={vars({ "--rr": "-8deg", transformOrigin: "40% 5%" })} src={`${P}/tag.webp`} />
      {d.ddmm && (
        <Deco c={[343.6, 617.26 - dy, 90, 30]} z={9} a="fade" d={1.1}>
          <p className={cx(st.loraM, "size-full text-center")} style={{ rotate: "78.57deg", fontSize: U(22), lineHeight: 1.28, color: "var(--ink)", whiteSpace: "nowrap" }}>
            {d.ddmm}
          </p>
        </Deco>
      )}
      {arch && <Deco c={box(-36, H - 100, 170, 170)} z={10} a="slideL" d={0.3} sp={-30} src={`${P}/lily-corner.webp`} />}
      {arch && <Petal c={[352.85, 45.57, 34, 32.496]} rot={-30} k="b" />}
      {arch && <Petal c={[38.81, 579.64, 30, 30.891]} rot={20} k="a" d={0.5} />}
    </Sec>
  );
}

/* ═════════════ 07 · Anketa — javob ═════════════ */
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
  const [rain, setRain] = useState(0);
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
      setRain((x) => x + 1);
      return setSent(status);
    }
    setBusy(true);
    try {
      const res = await fetch(rsvpUrl(slug, token), {
        method: token ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), status, count: status === "coming" ? count : 0, wish: wish.trim() || null }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; editToken?: string };
      if (!res.ok || !j.ok) throw new Error(t(j.error || "Javob yuborilmadi. Qayta urinib ko‘ring."));
      const tk = token ?? j.editToken!;
      saveRsvp(slug, tk, name.trim());
      setToken(tk);
      setRain((x) => x + 1);
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
    <Sec ready z={z} id="savsan-javob" style={{ paddingTop: U(110), paddingBottom: U(213), minHeight: U(1032) }}>
      {wide && <Sides src={`${P}/lily-stem.webp`} l={[113, 535.25, 240, 425.896]} rx={1087} />}
      <Deco c={[195, 114, 96, 96]} z={4} a="press" d={0.6}>
        <div key={rain} className={cx("size-full", rain > 0 && st.restamp)}>
          <Img src={`${P}/seal.webp`} />
        </div>
      </Deco>
      <Deco c={box(296, 59.98, 81.32, 81.32).slice(0, 2).concat([72, 72]) as Box} rot={-8} z={4} a="stick" d={1} src={`${P}/stamp.webp`} />
      <Petal c={[27.42, 224.3, 34, 37.778]} rot={25} k="d" />
      <Petal c={[362.77, 503.05, 26, 22.051]} rot={-30} k="c" d={0.5} />
      <div className="relative">
        <form onSubmit={submit} noValidate data-a="rise" className={cx("relative flex flex-col items-start", st.paper, st.shadow)} style={vars({ marginLeft: CX(24), width: U(342), borderRadius: U(10), padding: `${U(74)} ${U(28)} ${U(28)}`, gap, zIndex: 2, "--y": 80 })}>
          {rain > 0 && (
            <div key={rain} className="pointer-events-none absolute inset-0 overflow-hidden" style={{ borderRadius: "inherit" }} aria-hidden>
              {Array.from({ length: 12 }, (_, i) => (
                <span key={i} className={st.rain} style={vars({ left: `${(i * 37 + 7) % 92}%`, width: U(26), height: U(26), "--d": `${(i % 6) * 0.12}s`, "--r": `${(i * 47) % 360}deg` })}>
                  <Img src={`${P}/gulbarg-${"abcdef"[i % 6]}.webp`} contain eager />
                </span>
              ))}
            </div>
          )}
          <p className={cx(st.prata, "w-full text-center")} style={{ fontSize: U(38), lineHeight: 1.355, color: "var(--ink)", overflowWrap: "anywhere" }}>
            {sent ? (sent === "not_coming" ? t("Rahmat!") : t("Rahmat! Sizni kutamiz")) : t("Kelasizmi?")}
          </p>
          {sent ? (
            <div className={cx(st.thanks, "flex w-full flex-col items-center text-center")} style={{ gap: U(16), paddingTop: U(8), paddingBottom: U(12) }}>
              <p className={st.sans} style={{ fontSize: U(16), color: "var(--muted)", lineHeight: 1.5 }}>
                {sent === "not_coming" ? t("Javobingiz uchun rahmat — sizni duolarimizda eslaymiz.") : t("{name} — {count} kishi. Javobingiz yetkazildi.", { name: name.trim() || t("Javobingiz"), count })}
              </p>
              <button type="button" onClick={() => setSent(null)} className={st.sans} style={{ color: "var(--sage)", fontSize: U(15), textDecoration: "underline", textUnderlineOffset: 3 }}>
                {t("Javobni o‘zgartirish")}
              </button>
            </div>
          ) : (
            <>
              <p className={cx(st.sans, "w-full text-center")} style={{ fontSize: U(15), lineHeight: 1.5, color: "var(--muted)" }}>
                {d.rsvpUntil ? t("Iltimos, javobingizni {date} qoldiring", { date: d.rsvpUntil }) : t("Iltimos, javobingizni qoldiring")}
              </p>
              <div style={{ height: U(6) }} />
              <label className="flex w-full flex-col" style={{ gap }}>
                {label(t("ISM-FAMILIYA"))}
                <input className={st.field} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={t("Ismingiz")} style={{ fontSize: U(16), padding: U(16), borderRadius: U(10) }} />
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
                  <button key={s} type="button" role="radio" aria-checked={status === s} onClick={() => setStatus(s)} className={st.choice} style={{ padding: `${U(15)} ${U(6)}`, minHeight: U(49), fontSize: U(14) }}>
                    <span style={{ overflowWrap: "anywhere" }}>{t(l)}</span>
                  </button>
                ))}
              </div>
              {status === "coming" && (
                <>
                  <div style={{ height: U(2) }} />
                  <div className="flex w-full items-center" style={{ gap: U(6) }}>
                    <p className={st.sans} style={{ flex: "1 1 0", minWidth: 0, fontSize: U(14), lineHeight: 1.22, color: "var(--ink)" }}>
                      {t("Necha kishi bo‘lasiz?")}
                    </p>
                    <button type="button" className={st.step} disabled={count <= 1} onClick={() => setCount((c) => Math.max(1, c - 1))} aria-label={t("Kamaytirish")} style={{ width: U(32), height: U(32), fontSize: U(20) }}>
                      −
                    </button>
                    <span className={st.sansM} style={{ width: U(32), textAlign: "center", fontSize: U(18), color: "var(--ink)" }} aria-live="polite">
                      {count}
                    </span>
                    <button type="button" className={st.step} disabled={count >= 20} onClick={() => setCount((c) => Math.min(20, c + 1))} aria-label={t("Ko‘paytirish")} style={{ width: U(32), height: U(32), fontSize: U(20) }}>
                      +
                    </button>
                  </div>
                </>
              )}
              <div style={{ height: U(2) }} />
              <label className="flex w-full flex-col" style={{ gap }}>
                {label(t("TILAKLARINGIZ"))}
                <textarea className={st.field} value={wish} onChange={(e) => setWish(e.target.value)} maxLength={500} placeholder={t("Yosh oilaga bir-ikki so‘z…")} style={{ fontSize: U(16), padding: U(16), borderRadius: U(10), height: U(92) }} />
              </label>
              {err && (
                <p className={st.sans} style={{ color: "#b3261e", fontSize: U(14) }}>
                  {err}
                </p>
              )}
              <div style={{ height: U(8) }} />
              <button type="submit" disabled={busy} className={st.btnSage} style={{ padding: U(18), fontSize: U(16), opacity: busy ? 0.7 : 1 }}>
                {busy ? t("Yuborilmoqda…") : t("Javobni yuborish")}
              </button>
            </>
          )}
        </form>
        <div className="absolute inset-x-0" style={{ top: "100%", height: 0, zIndex: 3 }}>
          <Deco c={box(236, 3, 190, 190)} flip z={1} a="slideR" d={0.3} sp={-30} src={`${P}/lily-corner.webp`} />
        </div>
      </div>
    </Sec>
  );
}

/* ═════════════ 08 · Final — konvert yopiladi ═════════════ */
function Final({ d, wide, z, onSeen }: { d: D; wide: boolean; z: number; onSeen: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const onP = useCallback(
    (_p: number, r: DOMRect) => {
      const el = ref.current;
      if (!el) return;
      const vh = window.innerHeight || 800;
      // konvert markazi ekranning 88% → 52% balandligiga kelguncha qopqoq yopiladi, so‘ng muhr bosiladi
      const u = r.height / 770;
      const e = r.top + u * 444;
      const f = seg(vh * 0.88 - e, 0, vh * 0.3);
      const k = f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2;
      el.style.setProperty("--fc", (1 - k).toFixed(4));
      el.style.setProperty("--sm", seg(vh * 0.88 - e, vh * 0.3, vh * 0.38).toFixed(4));
      if (f > 0.5) onSeen();
    },
    [onSeen],
  );
  let k = 0;
  const title = t("Sizni kutamiz!");
  const flap: Box = [40, 323.45, 315, 179];
  const at = (b: Box, extra?: CSSProperties): CSSProperties => ({ left: CX(b[0]), top: U(b[1]), width: U(b[2]), height: U(b[3]), ...extra });
  return (
    <Sec ready z={z} onP={onP} style={{ height: U(770) }}>
      <div ref={ref} className={cx(st.finalWrap, "absolute inset-0")}>
        {wide && (
          <>
            <Sides src={`${P}/lily-stem.webp`} l={[103, 104.26, 260, 461.387]} rx={1077} />
            <Sides src={`${P}/lily-corner.webp`} l={[40, 686.5, 400, 400]} rx={1000} z={6} />
          </>
        )}
        <h2 className={cx(st.prata, "absolute inset-x-0 text-center")} style={{ top: U(90), lineHeight: 1.348, zIndex: 3, color: "var(--paper)" }}>
          <Fit base={46} max={370} deps={title}>
            {[...title].map((ch, i) => (
              <span key={i} data-w className={st.word} style={vars({ "--d": `${(0.2 + 0.04 * k++).toFixed(2)}s` })}>
                {ch}
              </span>
            ))}
          </Fit>
        </h2>
        {d.names && (
          <p data-a="up" className={cx(st.lora, "absolute inset-x-0 text-center")} style={vars({ top: U(156), lineHeight: 1.28, zIndex: 3, color: "var(--paper)", opacity: 0.92, "--d": "0.7s", "--y": 16 })}>
            <Fit base={26} max={360} deps={d.names}>
              {d.names}
            </Fit>
          </p>
        )}
        <Deco c={box(177.28, 190, 229.007, 330.429).slice(0, 2).concat([170, 301.676]) as Box} rot={12} z={1} a="grow" d={0.3} src={`${P}/lily-stem.webp`} />
        <div className={cx(st.finalFlap, st.finalFlapBack)} style={at(flap, { zIndex: 1 })}>
          <Img src={`${P}/flap.webp`} className={st.fill} />
        </div>
        <div data-a="rise" className="absolute" style={vars({ ...at([3, 300, 384, 288]), zIndex: 2, "--y": 50 })}>
          <Img src={`${P}/envelope.webp`} />
        </div>
        <div className={cx(st.finalFlap, st.finalFlapFront)} style={at(flap, { zIndex: 3 })}>
          <Img src={`${P}/flap.webp`} className={st.fill} />
        </div>
        <div className={st.finalFlapSeal} style={at([152, 413, 86, 86], { zIndex: 4 })}>
          <Img src={`${P}/seal.webp`} />
        </div>
        {/* Figma -50; 36px chapga — «12 · 09 · 2026» sanasi ustiga g‘uncha tushmasin */}
        {!wide && <Deco c={box(-86, 520, 230, 230)} z={6} a="slideL" d={0.3} src={`${P}/lily-corner.webp`} />}
        <Deco c={[325.3, 502.73, 130, 130]} rot={-10} z={5} a="up" d={0.6} src={`${P}/bow.webp`} />
        <Deco c={[69.15, 551.47, 96, 144]} rot={14} z={7} a="spin" d={0.8} rstyle={vars({ "--rr": "-10deg", transformOrigin: "50% 5%" })} src={`${P}/tag.webp`} />
        <Deco c={[65, 578.02, 90, 26]} z={8} a="fade" d={1.2}>
          <p className={cx(st.loraM, "size-full text-center")} style={{ rotate: "-77.54deg", lineHeight: 1.28, color: "var(--ink)", whiteSpace: "nowrap" }}>
            <Fit base={18} max={84} deps={t("Rahmat")}>
              {t("Rahmat")}
            </Fit>
          </p>
        </Deco>
        {d.dots && (
          <p data-a="fade" className={cx(st.sansM, "absolute inset-x-0 text-center")} style={vars({ top: U(690), fontSize: U(15), letterSpacing: U(3), lineHeight: 1.22, color: "var(--paper)", zIndex: 8, "--d": "0.9s" })}>
            {d.dots}
          </p>
        )}
        <Petal c={[354.15, 259.2, 36, 37.069]} rot={-25} k="a" />
        <Petal c={[38.37, 279.51, 34, 25.426]} rot={30} k="e" d={0.4} />
        <Petal c={[214.72, 248.6, 26, 22.051]} rot={-10} k="c" d={0.5} />
        <Petal c={[320.71, 601.34, 30, 28.673]} rot={-40} k="b" d={0.7} />
      </div>
    </Sec>
  );
}

/* ═════════════ Sahifa ═════════════ */
type Key = "invite" | "timer" | "program" | "venue" | "dress" | "moments" | "rsvp" | "final";

export function SavsanSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const [revealed, setRevealed] = useState(!withGate);
  const loaded = usePreload(
    [`${P}/bg.webp`, `${P}/envelope.webp`, `${P}/flap.webp`, `${P}/seal.webp`, `${P}/paper.webp`, `${P}/lily-corner.webp`, `${P}/lily-stem.webp`],
    [`${P}/bow.webp`, `${P}/stamp.webp`, `${P}/doily.webp`, `${P}/frame.webp`, ...d.ph.filter(Boolean).map(String), `${P}/lilies.webp`, `${P}/tag.webp`, ...(d.dress ? d.dress.imgs.map((x) => x.src) : [])],
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
  // Laptop: yon bezaklar uchun kursor parallaksi (±12px) — React holatisiz, CSS o‘zgaruvchilari bilan
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

  const shown: Key[] = (["invite", "timer", "program", "venue", "dress", "moments", "rsvp", "final"] as Key[]).filter((k) =>
    k === "timer" ? d.hasDate || !!d.quote : k === "program" ? d.program.length > 0 : k === "dress" ? !!d.dress : k === "moments" ? !!(d.ph[2] || d.caption) : k === "rsvp" ? data.rsvpEnabled : true,
  );
  const z = (k: Key) => 6 + shown.indexOf(k);
  const linkable = mode !== "preview";
  const colU = wide ? "calc(100cqw / 1440 * 1.45)" : "calc(100cqw / 390)";
  const bgSize = wide ? `calc(var(--u) * 357.517) calc(var(--u) * 635.586)` : `calc(var(--u) * 388.8) calc(var(--u) * 691.2)`;

  return (
    <div ref={root} className={st.root}>
      <div className={st.page} style={vars({ "--u": colU })}>
        <MusicButton m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/seal.webp`} />}
        {withGate && (loaded ? <Gate d={d} wide={wide} onReveal={() => setRevealed(true)} onStart={() => music.play(true)} /> : <div style={{ height: "250svh", marginBottom: "-100svh", width: "100%" }} />)}
        {embedded && <Gate d={d} wide={wide} still onReveal={() => {}} onStart={() => {}} />}
        <div className={st.flow} style={{ backgroundSize: bgSize }}>
          <Invite d={d} wide={wide} z={z("invite")} />
          {shown.includes("timer") && <Timer d={d} wide={wide} z={z("timer")} />}
          <Program d={d} wide={wide} z={z("program")} />
          <Venue d={d} wide={wide} z={z("venue")} linkable={linkable} />
          <Dress d={d} wide={wide} z={z("dress")} />
          <Moments d={d} wide={wide} z={z("moments")} />
          {data.rsvpEnabled && <Rsvp d={d} wide={wide} slug={data.slug} mode={mode} z={z("rsvp")} />}
          <Final d={d} wide={wide} z={z("final")} onSeen={onFinal} />
        </div>
        <footer className={cx(st.footer, "flex flex-col items-center")} style={{ height: wide ? S(150) : U(150), paddingTop: wide ? S(44) : U(44), gap: wide ? S(7) : U(7) }}>
          <a href="https://shohnoma.uz" className={st.prata} style={{ fontSize: wide ? S(26) : U(26), lineHeight: 1.35 }}>
            Shohnoma
          </a>
          <span className={st.sans} style={{ fontSize: wide ? S(13) : U(13), lineHeight: 1.22, opacity: 0.7 }}>
            {t("Taklifnoma shohnoma.uz da yaratildi")}
          </span>
        </footer>
      </div>
    </div>
  );
}
