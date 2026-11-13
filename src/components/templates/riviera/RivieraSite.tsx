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
import { Loader, usePreload, useMusic } from "../shared/runtime";
import { DRESS, calendarWords, untilPhrase, type ProgramItem } from "../anor/data";
import { DRESS_TEXT, P, RIVIERA_DEMO, RIVIERA_DEMO_EN, RIVIERA_DEMO_RU } from "./data";
import st from "./riviera.module.css";

/* ── Birliklar ──
 * U — joriy `--u` (bo‘limlarda — kontent ustuni: Figma mobil 390 koordinatalari; laptopda ustun = mobil × 1.45, ya’ni 565.5px / 1440).
 * C — laptop kanvasi (1440) birligi: yon bezaklar (atirgullar, monogrammalar, oltin chiziqlar) shu koordinatalarda.
 * Ochilish (darvoza), hero va final — o‘z kanvasi (mobil 390, laptop 1440); ochilish va hero sahnasi bir ekranga sig‘adi va pastki chetga bog‘lanadi. */
const U = (n: number) => `calc(var(--u) * ${+n.toFixed(3)})`;
const C = (n: number) => `calc(100cqw / 1440 * ${+n.toFixed(3)})`;
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
  const DEMO = lang === "ru" ? RIVIERA_DEMO_RU : lang === "en" ? RIVIERA_DEMO_EN : RIVIERA_DEMO;
  const ex = (data.extra ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof ex[k] === "string" ? (ex[k] as string).trim() : "");
  const sd = splitDate(data.date);
  const guest = useGuestName();
  return useMemo(() => {
    const cw = calendarWords(lang);
    const exProgram = Array.isArray(ex.program) ? (ex.program as ProgramItem[]).filter((p) => p?.time && p?.title) : [];
    const photos = (data.photos ?? []).filter(Boolean);
    const date = sd ? new Date(`${sd.iso}T12:00:00Z`) : null;
    const code = str("dressCode") || (demo ? DEMO.dressCode : "");
    const dz = DRESS[code];
    const dt = DRESS_TEXT[code];
    // namunadagi ismlar tarjima qilinadi (mijoz ma’lumoti — o‘zgarishsiz)
    const a = ((demo ? t(data.personA) : data.personA) || "").trim();
    const b = ((demo && data.personB ? t(data.personB) : data.personB) || "").trim();
    const time = sd?.time ?? "";
    const program = (demo ? DEMO.program : exProgram.length ? exProgram : ((data.program ?? []) as ProgramItem[])) as ProgramItem[];
    const message = (demo ? DEMO.message : data.message || "").replace(/^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Дорогие гости!|Dear guests!)\s*/, "").trim();
    const venueTitle = ((demo ? DEMO.venueTitle : data.venueName) || "").trim();
    const address = ((demo ? DEMO.address : data.address) || "").trim();
    const unq = (s: string) => s.replace(/^["“”«»„]+|["“”«»„]+$/g, "").trim();
    const initial = (s: string) => [...s.trim()][0]?.toUpperCase() ?? "";
    /* Suratlar (PHOTO_SLOTS.riviera): 0 — «Kadrlar» katta portreti (oq-qora), 1 — kichik kvadrat ramka (bo‘lmasa — shampan natyurmorti),
     * 2 — manzil surati (bo‘lmasa — shablonning kechki terrasa surati). Hero — shablonning Komo ko‘li terrasasi surati (yuzlarsiz).
     * Mijoz surati bo‘lmasa «Kadrlar» bo‘limi chiqmaydi (namunadagi portret — modellar). */
    const own = demo ? [`${P}/portrait.webp`, `${P}/champagne.webp`] : photos;
    const quote = unq(str("quote")) || t("Sevgi — eng go‘zal safar.");
    return {
      a,
      b,
      /** «Rustam & Elina» */
      pairAmp: b ? `${a} & ${b}` : a,
      ia: initial(a),
      ib: b ? initial(b) : "",
      /** «26 · 09 · 2026» */
      dots: sd?.dots ?? "",
      iso: sd?.iso ?? "",
      time,
      day: sd ? String(Number(sd.iso.slice(8, 10))) : "",
      monthYear: date ? `${cw.months[date.getUTCMonth()]} ${date.getUTCFullYear()}` : "",
      weekday: date ? cw.weekday[date.getUTCDay()] : "",
      hasDate: !!date,
      target: data.date ? tashkentDate(data.date).getTime() : null,
      guest,
      message,
      quote,
      venueTitle,
      address,
      mapUrl: data.mapUrl || `https://yandex.uz/maps/?text=${encodeURIComponent([venueTitle, address].filter(Boolean).join(", "))}`,
      program,
      dress:
        dz && dt
          ? {
              title: t(dt.title),
              note: str("dressNote") || t(dt.note),
              sub: t(dz.sub),
            }
          : null,
      hero: `${P}/hero.webp`,
      portrait: (own[0] as string | undefined) ?? "",
      portraitOwn: !demo && !!own[0],
      square: (own[1] as string | undefined) || `${P}/champagne.webp`,
      venuePhoto: (demo ? "" : (photos[2] as string | undefined)) || `${P}/venue.webp`,
      rsvpUntil: untilPhrase(data.rsvpDeadline, lang),
      musicUrl: musicSrc(template, data),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, data, demo, guest, lang, t]);
}
type D = ReturnType<typeof useData>;

/**
 * Appear: har bir [data-a] element o‘zi ekranga kirganda `data-in` oladi — butun bo‘lim birdan emas.
 * Yuqorida qolganlar darrov ko‘rsatiladi; sahifa oxirida qolganlarning hammasi ochiladi.
 */
function useReveal(root: React.RefObject<HTMLDivElement | null>, ready: boolean, all: boolean) {
  useEffect(() => {
    const el = root.current;
    if (!el || !ready) return;
    const SEL = "[data-a]:not([data-in])";
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
      list = Array.from(el.querySelectorAll<HTMLElement>(SEL)).filter((x) => !x.closest(`.${st.gateWrap}`) && !x.closest(`.${st.openWrap}`));
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

function Img({ src, className, style, eager }: { src: string; className?: string; style?: CSSProperties; eager?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" draggable={false} loading={eager ? "eager" : "lazy"} decoding="async" className={cx(st.img, className)} style={style} />;
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
      // offsetWidth — maket eni (harflarning transform holati ta’sir qilmaydi)
      const w = el.offsetWidth;
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

/** Ko‘p qatorli matn o‘z qutisiga (balandlik) sig‘masa — shrift kichrayadi (iqtibos: 2 qator) */
function FitBox({ children, base, h, className, style, deps, reveal }: { children: ReactNode; base: number; h: number; className?: string; style?: CSSProperties; deps: unknown; reveal?: boolean }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useIso(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      let k = 1;
      el.style.fontSize = U(base);
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (!px) return;
      // qatorlar soni (scrollHeight emas — kursiv harflarning chiqib turgan qismi ham hisoblanib ketadi)
      const lineH = parseFloat(getComputedStyle(el).lineHeight) / px || 1.25;
      const maxLines = Math.max(1, Math.round(h / (base * lineH)));
      const lines = () => {
        const rg = document.createRange();
        rg.selectNodeContents(el);
        return new Set([...rg.getClientRects()].filter((r) => r.width > 0.5).map((r) => Math.round(r.top))).size;
      };
      while (lines() > maxLines && k > 0.55) {
        k -= 0.05;
        el.style.fontSize = U(+(base * k).toFixed(3));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (el.parentElement) ro.observe(el.parentElement);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [base, h, deps]);
  return (
    <p ref={ref} data-a={reveal ? "up" : undefined} className={className} style={{ ...style, height: U(h), overflow: "hidden" }}>
      {children}
    </p>
  );
}

/** Uzun, bo‘shliqli ism — ikki teng qatorga; qisqasi — bitta qator */
const splitName = (text: string, limit = 12): string[] => {
  const s = text.trim();
  if (!s) return [];
  if (!s.includes(" ") || [...s].length <= limit) return [s];
  const mid = s.length / 2;
  let cut = -1;
  for (let i = 0; i < s.length; i++) if (s[i] === " " && (cut < 0 || Math.abs(i - mid) < Math.abs(cut - mid))) cut = i;
  return [s.slice(0, cut).trim(), s.slice(cut + 1).trim()];
};

/** «Ism & Ism» — bir qatorga sig‘masa (juda kichrayib ketmasin) ikki qatorga: «A &» / «B» */
const pairLines = (d: { a: string; b: string; pairAmp: string }, limit: number) => ([...d.pairAmp].length <= limit ? [d.pairAmp] : d.b ? [`${d.a} &`, d.b] : [d.a]);

/** Harflar: har harf markazdan (i − c) × 0.3em uzoqda boshlanadi (letter-spacing 0.3em → 0). Faqat transform/opacity. */
function Letters({ text }: { text: string }) {
  const ch = [...text];
  const c = (ch.length - 1) / 2;
  // uzun qatorda yoyilish cheklanadi — chetki harflar ekrandan chiqib ketmasin
  const f = Math.min(1, 2.5 / Math.max(1, c));
  return (
    <>
      {ch.map((x, i) => (
        <span key={i} aria-hidden className={st.ch} style={vars({ "--x": ((i - c) * f).toFixed(2) })}>
          {x === " " ? " " : x}
        </span>
      ))}
    </>
  );
}

/* Ism ustuni (Figma: ism · & · ism; qatorlar qutilari bir-biriga kirib turadi). Uzun ism — ikki qatorga, shrift 0.8. */
type NameSpec = { fs: number; h: number; amp: number; ampH: number; g1: number; g2: number; max: number; limit: number };
function NameStack({ d, s, letters, className, style, after }: { d: D; s: NameSpec; letters?: boolean; className?: string; style?: CSSProperties; after?: ReactNode }) {
  const A = splitName(d.a, s.limit);
  const B = d.b ? splitName(d.b, s.limit) : [];
  const k = A.length + B.length > 2 ? 0.8 : 1;
  const rows: { text: string; amp?: boolean; mt: number }[] = [
    ...A.map((x, i) => ({ text: x, mt: i ? -s.h * k * 0.22 : 0 })),
    ...(d.b ? [{ text: "&", amp: true, mt: -s.g1 }] : []),
    ...B.map((x, i) => ({ text: x, mt: i ? -s.h * k * 0.22 : -s.g2 })),
  ];
  return (
    <div className={cx("flex flex-col items-center text-center", className)} style={style}>
      <h1 className="contents" aria-label={d.pairAmp}>
      {rows.map((r, i) => (
        <span
          key={i}
          aria-hidden
          className={cx("block", r.amp ? cx(st.bi, st.amp) : st.bd)}
          style={{ fontSize: U(r.amp ? s.amp : s.fs * k), height: U(r.amp ? s.ampH : s.h * k), lineHeight: `${r.amp ? s.ampH / s.amp : s.h / s.fs}`, marginTop: U(r.mt), position: "relative" }}
        >
          <Fit base={r.amp ? s.amp : s.fs * k} max={s.max} deps={r.text}>
            {letters ? <Letters text={r.text} /> : r.text}
          </Fit>
        </span>
      ))}
      </h1>
      {after}
    </div>
  );
}

/** Monogramma (Figma «Riviera / Monogramma R·E», 120 kanvas): ikki oltin halqa va kursiv bosh harflar. `draw` — halqalar chiziladi */
function Mono({ d, size, unit, className, style, draw }: { d: D; size: number; unit: string; className?: string; style?: CSSProperties; draw?: "reveal" | "final" }) {
  const k = size / 120;
  const q = (n: number) => `calc(${unit} * ${+(n * k).toFixed(3)})`;
  return (
    <div className={cx(st.mono, draw === "final" && st.monoFinal, className)} style={{ width: q(120), height: q(120), ...style }} data-a={draw === "reveal" ? "mono" : undefined} aria-hidden>
      <svg viewBox="0 0 120 120" className={st.monoSvg}>
        <circle cx="60" cy="60" r="58.5" fill="none" stroke="var(--gold)" strokeWidth="1" pathLength={1} className={st.ring} />
        <circle cx="60" cy="60" r="52.75" fill="none" stroke="var(--gold)" strokeWidth="0.5" pathLength={1} className={cx(st.ring, st.ring2)} />
      </svg>
      {d.ib ? (
        <>
          <span className={cx(st.bi, st.monoL)} style={{ left: q(22), top: q(24), width: q(44), fontSize: q(48), lineHeight: 1.52 }}>
            {d.ia}
          </span>
          <span className={cx(st.bi, st.monoL, st.monoL2)} style={{ left: q(56), top: q(42), width: q(44), fontSize: q(44), lineHeight: 1.52 }}>
            {d.ib}
          </span>
        </>
      ) : (
        <span className={cx(st.bi, st.monoL)} style={{ inset: 0, display: "flex", alignItems: "center", justifyContent: "center", paddingRight: q(4), fontSize: q(54), lineHeight: 1 }}>
          {d.ia}
        </span>
      )}
    </div>
  );
}

/** Bo‘lim: to‘liq enli fon + markazda kontent ustuni (mobil 390 birlik; laptopda × 1.45). `deco` — laptop yon bezaklari (1440 kanvas) */
function Sec({
  children,
  z,
  bg,
  colStyle,
  id,
  deco,
  lines,
  wide,
  onP,
  className,
}: {
  children: ReactNode;
  z: number;
  bg: "paper" | "champ" | "black";
  colStyle?: CSSProperties;
  id?: string;
  deco?: ReactNode;
  lines?: boolean;
  wide: boolean;
  onP?: (p: number, r: DOMRect, el: HTMLElement) => void;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const cb = useRef(onP);
  cb.current = onP;
  useScrollProgress(
    ref,
    (p, r) => {
      if (!ref.current) return;
      cb.current?.(p, r, ref.current);
    },
    !!onP,
  );
  return (
    <section ref={ref} id={id} className={cx(st.sec, st[bg], className)} style={{ zIndex: z }}>
      {wide && lines && (
        <>
          {[229, 237, 1203, 1211].map((x, i) => (
            <span key={x} data-a="lineY" aria-hidden className={st.sideLine} style={vars({ left: C(x), top: C(90), bottom: C(90), "--d": `${0.1 + (i % 2) * 0.12}s` })} />
          ))}
        </>
      )}
      {wide && deco}
      <div className={st.col} style={{ width: U(390), ...colStyle }}>
        {children}
      </div>
    </section>
  );
}

/* ═════════════ 00 · Ochilish — «darvoza-karta»: muhr titraydi, ikkiga bo‘linib tushadi; qanotlar eshikdek ochiladi (scroll) ═════════════ */
const GATE = {
  m: { W: 390, H: 844, f1: 18, f2: 24, seal: [129, 386, 132], names: { bottom: 343 }, date: { top: 584, h: 22, fs: 15, ls: 5 }, foot: { top: 742, h: 19, fs: 13 } },
  l: { W: 1440, H: 900, f1: 36, f2: 46, seal: [632, 382, 176], names: { bottom: 324 }, date: { top: 640, h: 25, fs: 17, ls: 6 }, foot: { top: 790, h: 20, fs: 14 } },
} as const;
const GATE_NAMES: NameSpec = { fs: 44, h: 67, amp: 34, ampH: 52, g1: 13, g2: 8, max: 336, limit: 12 };

/** Qanotdagi bosma (ismlar, sana, pastki qator) — ikkala qanotda bir xil, har qanot o‘z yarmini ko‘rsatadi (qog‘ozga bosilgandek, eshik bilan aylanadi) */
function GatePrint({ d, wide, foot }: { d: D; wide: boolean; foot: string }) {
  const G = wide ? GATE.l : GATE.m;
  const Y = (y: number) => `calc(100% - ${U(G.H - y)})`;
  return (
    <div className={st.gIntro}>
      {wide ? (
        <h1 className={cx(st.bd, "absolute inset-x-0 flex flex-col items-center text-center")} style={{ bottom: U(G.H - G.names.bottom) }} aria-label={d.pairAmp}>
          {(d.b ? ([...d.pairAmp].length <= 30 ? [`${d.a}  &  ${d.b}`] : [`${d.a}  &`, d.b]) : [d.a]).map((l, i, all) => (
            <span key={i} aria-hidden className="block" style={{ height: U(all.length > 1 ? 88 : 104), fontSize: U(all.length > 1 ? 58 : 68), lineHeight: all.length > 1 ? 88 / 58 : 104 / 68 }}>
              <Fit base={all.length > 1 ? 58 : 68} max={1240} deps={l} style={{ whiteSpace: "pre" }}>
                {l}
              </Fit>
            </span>
          ))}
        </h1>
      ) : (
        <NameStack d={d} s={GATE_NAMES} className="absolute inset-x-0" style={{ bottom: U(G.H - G.names.bottom) }} />
      )}
      {d.dots && (
        <p className={cx(st.jr, "absolute inset-x-0 text-center")} style={{ top: Y(G.date.top), height: U(G.date.h), fontSize: U(G.date.fs), lineHeight: G.date.h / G.date.fs, whiteSpace: "nowrap" }}>
          <span style={{ letterSpacing: U(G.date.ls), paddingLeft: U(G.date.ls) }}>{d.dots}</span>
        </p>
      )}
      {foot && (
        <p className={cx(st.jr, "absolute inset-x-0 text-center")} style={{ top: Y(G.foot.top), height: U(G.foot.h), fontSize: U(G.foot.fs), lineHeight: G.foot.h / G.foot.fs, color: "var(--mute)" }}>
          <Fit base={G.foot.fs} max={wide ? 1200 : 330} deps={foot}>
            {foot}
          </Fit>
        </p>
      )}
    </div>
  );
}

function Gate({ d, wide, onStart, still = false }: { d: D; wide: boolean; onStart: () => void; still?: boolean }) {
  const t = useT();
  const wrap = useRef<HTMLDivElement>(null);
  const cb = useRef(onStart);
  cb.current = onStart;
  useEffect(() => {
    const el = wrap.current;
    const host = el?.parentElement;
    if (!el || !host || still) return;
    let raf = 0;
    let cur = 0;
    let target = 0;
    let started = false;
    const read = () => {
      const r = el.getBoundingClientRect();
      const stage = (el.firstElementChild as HTMLElement | null)?.offsetHeight || window.innerHeight;
      const D = Math.max(1, r.height - stage);
      target = clamp01(-r.top / D);
    };
    const apply = (o: number) => {
      host.style.setProperty("--o", o.toFixed(4));
      // muhr bosilganda yengil titraydi (o 0 … 0.05)
      const env = o < 0.05 ? Math.sin((o / 0.05) * Math.PI) : 0;
      host.style.setProperty("--sh", (Math.sin(o * 380) * 3.2 * env).toFixed(3));
      el.style.pointerEvents = o > 0.6 ? "none" : "";
      el.style.visibility = o > 0.62 ? "hidden" : "";
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

  const G = wide ? GATE.l : GATE.m;
  const { W, H } = G;
  const pageU = wide ? CANVAS_L : COL_M;
  const X = (x: number) => `calc(50% + ${U(x - W / 2)})`;
  const Y = (y: number) => `calc(100% - ${U(H - y)})`;
  const [sx, sy, ss] = G.seal;
  // Figma’dagi «Muhrni bosing — …» ko‘rsatmasi o‘rniga (bosish yo‘q): shaxsiy murojaat yoki «Taklifnoma»
  const foot = d.guest ? t("Hurmatli {guest}", { guest: d.guest }) : t("Taklifnoma");
  const frame = (side: "l" | "r") => (
    <>
      <span aria-hidden className={st.frame} style={side === "l" ? { top: U(G.f1), bottom: U(G.f1), left: U(G.f1), right: 0, borderRightWidth: 0 } : { top: U(G.f1), bottom: U(G.f1), right: U(G.f1), left: 0, borderLeftWidth: 0 }} />
      <span
        aria-hidden
        className={cx(st.frame, st.frame2)}
        style={side === "l" ? { top: U(G.f2), bottom: U(G.f2), left: U(G.f2), right: 0, borderRightWidth: 0 } : { top: U(G.f2), bottom: U(G.f2), right: U(G.f2), left: 0, borderLeftWidth: 0 }}
      />
    </>
  );
  return (
    <div ref={wrap} className={cx(st.gateWrap, still && st.still)} style={vars(still ? { "--u": pageU, "--o": 0, height: U(H), marginBottom: 0 } : { "--u": `min(${pageU}, calc(100svh / ${H}))` })}>
      <div className={st.gate} aria-label={t("Taklifnoma")} style={still ? { position: "relative", height: "100%" } : undefined}>
        <div className={st.doors} style={{ perspective: U(1200) }}>
          <div className={cx(st.wing, st.wl)}>
            <div className={st.face}>
              {frame("l")}
              <div className={st.print} style={{ left: 0 }}>
                <GatePrint d={d} wide={wide} foot={foot} />
              </div>
              <span aria-hidden className={st.shade} />
            </div>
            <div className={cx(st.face, st.back)} />
          </div>
          <div className={cx(st.wing, st.wr)}>
            <div className={st.face} style={{ boxShadow: wide ? "-6px 0 20px rgba(0,0,0,0.12)" : "-4px 0 14px rgba(0,0,0,0.12)" }}>
              {frame("r")}
              <div className={st.print} style={{ left: "-100%" }} aria-hidden>
                <GatePrint d={d} wide={wide} foot={foot} />
              </div>
              <span aria-hidden className={st.seam} />
              <span aria-hidden className={st.shade} />
            </div>
            <div className={cx(st.face, st.back)} />
          </div>
        </div>
        {/* Oltin muhr — qanotlar chokida; scroll boshida titraydi, ikkiga bo‘linib pastga tushadi */}
        <div className={st.seal} style={{ left: X(sx), top: Y(sy), width: U(ss), height: U(ss) }}>
          <div className={cx("absolute inset-0", st.sealIn)}>
            <div className={cx(st.sealHalf, st.sealL)}>
              <Img src={`${P}/seal.webp`} eager />
            </div>
            <div className={cx(st.sealHalf, st.sealR)}>
              <Img src={`${P}/seal.webp`} eager />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════ 01 · Hero — villa terrasasi: eshiklar ortidan 1.12 → 1 zoom-out, ismlar harflari 0.3em → 0 torayib paydo bo‘ladi ═════════════ */
const HERO = { m: { W: 390, H: 844 }, l: { W: 1440, H: 900 } };
const HERO_NAMES_M: NameSpec = { fs: 52, h: 79, amp: 34, ampH: 52, g1: 19, g2: 8, max: 360, limit: 12 };
const HERO_NAMES_L: NameSpec = { fs: 100, h: 153, amp: 64, ampH: 98, g1: 33, g2: 28, max: 640, limit: 12 };

function Hero({ d, wide, still }: { d: D; wide: boolean; still: boolean }) {
  const { H } = wide ? HERO.l : HERO.m;
  const pageU = wide ? CANVAS_L : COL_M;
  const Y = (y: number) => `calc(100% - ${U(H - y)})`;
  // «26 · 09 · 2026   ·   VILLA «RIVIERA»» — uzun bo‘lsa sana va manzil ikki qatorga
  const venueUp = d.venueTitle.toLocaleUpperCase();
  const oneLine = [d.dots, venueUp].filter(Boolean).join("   ·   ");
  const infoLines = [...oneLine].length <= 38 ? [oneLine] : [d.dots, venueUp].filter(Boolean);
  const info = (fs: number, h: number, ls: number, max: number) =>
    infoLines.filter(Boolean).map((l, i) =>
      i ? (
        // ikkinchi qator (uzun manzil nomi) — kichraymaydi, eng ko‘pi 2 qatorga o‘raladi
        <span key={i} className={cx(st.jm, st.hInfo, st.clamp2, "mx-auto")} style={{ marginTop: U(4), width: U(max - 20), fontSize: U(fs), lineHeight: h / fs, letterSpacing: `${ls / fs}em` }}>
          {l}
        </span>
      ) : (
        <span key={i} className={cx(st.jm, st.hInfo, "block")} style={{ height: U(h), fontSize: U(fs), lineHeight: h / fs }}>
          <Fit base={fs} max={max} deps={l} style={{ whiteSpace: "pre", letterSpacing: `${ls / fs}em`, paddingLeft: `${ls / fs}em` }}>
            {l}
          </Fit>
        </span>
      ),
    );
  return (
    <div className={cx(st.hero, still && st.heroStill)} style={vars({ ...(still ? { "--u": pageU, height: U(H) } : { "--u": `min(${pageU}, calc(100svh / ${H}))` }), "--hn0": wide ? 0.34 : 0.42 })}>
      {wide ? (
        <>
          <div className={st.hPanel} />
          <div className={st.hPhoto} style={{ left: "50%" }}>
            <Img src={d.hero} eager className={st.hImg} style={{ objectPosition: "50% 60%" }} />
          </div>
          <NameStack
            d={d}
            s={HERO_NAMES_L}
            letters
            className={cx(st.hNames, "absolute")}
            style={{ left: 0, width: "50%", top: Y(250) }}
            after={
              <>
                <span data-hd aria-hidden className={cx(st.hLine, "block")} style={{ marginTop: U(17), width: U(40), height: 1 }} />
                <span className="block" style={{ marginTop: U(29) }}>
                  {info(14, 20, 4, 620)}
                </span>
              </>
            }
          />
        </>
      ) : (
        <>
          <div className={st.hPhoto} style={{ left: 0 }}>
            <Img src={d.hero} eager className={st.hImg} style={{ objectPosition: "50% 50%" }} />
          </div>
          <NameStack d={d} s={HERO_NAMES_M} letters className={cx(st.hNames, "absolute inset-x-0")} style={{ top: Y(92) }} after={<span className="block" style={{ marginTop: U(7) }}>{info(13, 19, 3, 366)}</span>} />
        </>
      )}
    </div>
  );
}

/* ═════════════ 02 · Taklif — monogramma, iqtibos, matn, ismlar ═════════════ */
function Taklif({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const q = d.quote.includes("\n") ? d.quote : d.quote.replace(/^(.{3,40}?)\s+([—–-])\s+/, "$1 $2\n");
  const rose = (x: number, flip: boolean) => (
    <div data-a={flip ? "roseR" : "roseL"} aria-hidden className={st.sideRose} style={vars({ left: C(x), top: C(335.09), width: C(300), height: C(199.82), "--d": "0.15s" })}>
      <Img src={`${P}/rose.webp`} style={flip ? { transform: "scaleX(-1)" } : undefined} />
    </div>
  );
  return (
    <Sec z={z} bg="paper" wide={wide} colStyle={{ paddingTop: U(56), paddingBottom: U(89) }} deco={<>{rose(83, false)}{rose(1057, true)}</>}>
      <Mono d={d} size={96} unit="var(--u)" draw="reveal" className="mx-auto" />
      <FitBox
        base={32}
        h={80}
        deps={q}
        reveal
        className={cx(st.bi, "mx-auto text-center")}
        style={vars({ marginTop: U(20), width: U(320), lineHeight: 1.25, whiteSpace: "pre-line", overflowWrap: "anywhere", "--d": "0.1s" })}
      >
        {q}
      </FitBox>
      {d.message && (
        <p data-a="up" className={cx(st.jr, "mx-auto text-center")} style={vars({ marginTop: U(38), width: U(300), fontSize: U(15), lineHeight: 25 / 15, color: "var(--mute)", overflowWrap: "anywhere", "--d": "0.15s" })}>
          {d.message}
        </p>
      )}
      <span data-a="line" aria-hidden className="mx-auto block" style={vars({ marginTop: U(d.message ? 65 : 40), width: U(40), height: U(1), background: "var(--gold)", "--d": "0.1s" })} />
      {pairLines(d, 30).map((l, i) => (
        <p key={i} data-a="up" className={cx(st.bd, "text-center")} style={vars({ marginTop: U(i ? -4 : 23), height: U(34), fontSize: U(22), lineHeight: 34 / 22, "--d": "0.15s" })}>
          <Fit base={22} max={350} deps={l}>
            {l}
          </Fit>
        </p>
      ))}
      <p data-a="up" className={cx(st.bi, "text-center")} style={vars({ marginTop: U(2), height: U(21), fontSize: U(14), lineHeight: 21 / 14, color: "var(--mute)", "--d": "0.22s" })}>
        {d.b ? t("va ularning oilalari") : t("va oilasi")}
      </p>
    </Sec>
  );
}

/** «Kichik / lahzalar — / katta baxt.» — uch qator bir xil o‘lchamda; eng uzun qator 134 birlikka sig‘masa hammasi birga kichrayadi */
function Caption({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useIso(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      el.style.fontSize = U(21);
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (!px) return;
      const w = Math.max(...Array.from(el.querySelectorAll<HTMLElement>("[data-w]")).map((x) => x.offsetWidth));
      const max = (px / 21) * 134;
      el.style.fontSize = U(+(21 * Math.min(1, max / Math.max(1, w))).toFixed(3));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (el.parentElement) ro.observe(el.parentElement);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [lines.join("|")]);
  return (
    <div ref={ref} className="absolute" style={{ left: U(32), top: U(516), width: U(138), fontSize: U(21) }}>
      {lines.map((l, i) => (
        <p key={i} data-a="up" className={st.bi} style={vars({ height: U(28), lineHeight: `${U(28)}`, whiteSpace: "nowrap", color: i === 2 ? "var(--gold)" : "var(--black)", "--d": `${0.25 + i * 0.1}s` })}>
          <span data-w className="inline-block">
            {l}
          </span>
        </p>
      ))}
    </div>
  );
}

/* ═════════════ 03 · Kadrlar — jurnal sahifasi: oq-qora portret kulrangdan to‘liq kontrastga, shampan surati 20px parallaks ═════════════ */
function Kadrlar({ d, z, wide, still }: { d: D; z: number; wide: boolean; still: boolean }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const onP = useCallback((_p: number, r: DOMRect, el: HTMLElement) => {
    const b = box.current;
    if (!b) return;
    const vh = window.innerHeight || 800;
    const u = ((el.lastElementChild as HTMLElement | null)?.offsetWidth || r.width) / 390;
    // portret markazi ekran pastidan 55% balandlikkacha ko‘tarilguncha — kulrangdan to‘liq kontrastga
    const pc = r.top + (64 + 215) * u;
    b.style.setProperty("--pc", seg(vh - pc, 0, vh * 0.45).toFixed(4));
    // shampan ramkasi: markazi ekran o‘rtasida — Figma joyida; ±10 birlik (jami 20px) parallaks
    const sc = r.top + 536 * u;
    const k = Math.max(-1, Math.min(1, (sc - vh / 2) / (vh / 2 + 200 * u)));
    b.style.setProperty("--py", `${(k * 10 * u).toFixed(2)}px`);
  }, []);
  if (!d.portrait) return null;
  const caption = [t("Kichik"), t("lahzalar —"), t("katta baxt.")];
  return (
    <Sec z={z} bg="champ" wide={wide} lines onP={still ? undefined : onP} colStyle={{ height: U(740) }}>
      <div ref={box} data-pc className="absolute inset-0" style={vars({ "--pc": still ? 1 : 0, "--py": "0px" })}>
        <div data-a="rise" className={cx(st.portrait, "absolute overflow-hidden")} style={vars({ left: U(32), top: U(64), width: U(326), height: U(430), "--d": "0s" })}>
          <Img src={d.portrait} className={st.portraitImg} style={{ objectPosition: "50% 20%" }} />
        </div>
        <div className={cx(st.sq, "absolute")} style={{ left: U(170), top: U(438), width: U(196), height: U(196) }}>
          <div data-a="rise" className="absolute inset-0" style={vars({ background: "var(--champ)", "--d": "0.2s" })}>
            <div className="absolute overflow-hidden" style={{ left: U(8), top: U(8), width: U(180), height: U(180) }}>
              <Img src={d.square} />
            </div>
          </div>
        </div>
        <Caption lines={caption} />
        {/* Figma’dagi «I» sahifa raqami — bezak raqami (qoidaga zid), olib tashlandi; ingichka chiziq qoldi */}
        <span data-a="lineL" aria-hidden className="absolute" style={vars({ left: U(32), top: U(650), width: U(120), height: U(1), background: "var(--light)", "--d": "0.5s" })} />
      </div>
    </Sec>
  );
}

/* ═════════════ 04 · Sana va taymer (qora fon) ═════════════ */
/**
 * Raqamlar doim 2 xonali («05»). Sanoq tugagach o‘zgargan raqam yuqoridan sekin tushadi — shaffofliksiz, kesilmasdan:
 * oldingi «0» o‘chib qoladigan bironta kadr yo‘q (pozitsiya bo‘yicha kalit; yangi raqam faqat o‘zgarganda almashadi).
 */
function Digits({ value, run, len, i }: { value: number; run: boolean; len: number; i: number }) {
  const c = useCountUp(value, run, 1400 + i * 150);
  const digits = String(c.value).padStart(len, "0").split("");
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (!c.done) return;
    const id = requestAnimationFrame(() => setLive(true));
    return () => cancelAnimationFrame(id);
  }, [c.done]);
  return (
    <span className={st.digits}>
      {digits.map((dg, k) => (
        <span key={digits.length - k} className={st.slot}>
          <span key={dg} className={live ? st.tick : undefined}>
            {dg}
          </span>
        </span>
      ))}
    </span>
  );
}

function Sana({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const units = timerUnits(useLocale());
  const c = useCountdown(d.target);
  const [ref, inView] = useInView<HTMLDivElement>(0.3, true);
  if (!d.hasDate || !c) return null;
  const vals = [c.d, c.h, c.m, c.s];
  return (
    <Sec z={z} bg="black" wide={wide} lines colStyle={{ height: U(660) }}>
      {d.weekday && (
        <p data-a="up" className={cx(st.bi, "absolute inset-x-0 text-center")} style={vars({ top: U(64), height: U(23), fontSize: U(15), lineHeight: 23 / 15, color: "var(--light)", "--d": "0.05s" })}>
          {d.weekday}
        </p>
      )}
      <p className={cx(st.bd, "absolute inset-x-0 text-center")} style={{ top: U(90), height: U(170), fontSize: U(140), lineHeight: 170 / 140, color: "var(--champ)" }}>
        <span className={st.mask}>
          <span data-a="mask" className={st.maskIn} style={vars({ "--d": "0.12s" })}>
            {d.day}
          </span>
        </span>
      </p>
      <p data-a="up" className={cx(st.bi, "absolute inset-x-0 text-center")} style={vars({ top: U(268), height: U(40), fontSize: U(26), lineHeight: 40 / 26, color: "var(--gold)", "--d": "0.3s" })}>
        <Fit base={26} max={366} deps={d.monthYear}>
          {d.monthYear}
        </Fit>
      </p>
      {d.time && (
        <p data-a="up" className={cx(st.jr, "absolute inset-x-0 text-center")} style={vars({ top: U(312), height: U(20), fontSize: U(14), lineHeight: 20 / 14, color: "var(--light)", whiteSpace: "nowrap", "--d": "0.38s" })}>
          <span style={{ letterSpacing: U(2), paddingLeft: U(2) }}>{t("Soat {time} da", { time: d.time })}</span>
        </p>
      )}
      <span data-a="lineL" aria-hidden className="absolute" style={vars({ left: U(32), top: U(372), width: U(326), height: U(1), background: "var(--gold50)", "--d": "0.2s" })} />
      {/* sanoq kuzatuvchisi — taymer qatorini qoplaydi */}
      <div ref={ref} aria-hidden className="pointer-events-none absolute inset-x-0" style={{ top: U(404), height: U(86) }} />
      {vals.map((v, i) => (
        <div key={i}>
          <div data-a="up" className={cx(st.bd, "absolute text-center")} style={vars({ left: U(32 + i * 81.5), top: U(410), width: U(81.5), height: U(55), fontSize: U(36), lineHeight: 55 / 36, color: "var(--champ)", "--d": `${0.35 + i * 0.08}s` })}>
            <Digits value={v} run={inView} len={i === 0 ? Math.max(2, String(vals[0]).length) : 2} i={i} />
          </div>
          <p data-a="up" className={cx(st.jr, "absolute text-center")} style={vars({ left: U(32 + i * 81.5), top: U(464), width: U(81.5), height: U(19), fontSize: U(13), lineHeight: 19 / 13, color: "var(--light)", whiteSpace: "nowrap", "--d": `${0.42 + i * 0.08}s` })}>
            {units[i]}
          </p>
          {i > 0 && <span data-a="lineY" aria-hidden className="absolute" style={vars({ left: U(32 + i * 81.5), top: U(404), width: U(1), height: U(86), background: "var(--gold50)", "--d": `${0.45 + i * 0.08}s` })} />}
        </div>
      ))}
      <span data-a="lineL" aria-hidden className="absolute" style={vars({ left: U(32), top: U(522), width: U(326), height: U(1), background: "var(--gold50)", "--d": "0.5s" })} />
      <p data-a="up" className={cx(st.bi, "absolute inset-x-0 text-center")} style={vars({ top: U(552), height: U(27), fontSize: U(18), lineHeight: 27 / 18, color: "var(--light)", "--d": "0.6s" })}>
        <Fit base={18} max={366} deps={t("to‘yimizgacha qoldi")}>
          {d.b ? t("to‘yimizgacha qoldi") : t("bayramgacha qoldi")}
        </Fit>
      </p>
    </Sec>
  );
}

/* ═════════════ 05 · Kun tartibi — qatorlar navbat bilan ═════════════ */
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
function Program({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const items = d.program.slice(0, 8);
  if (!items.length) return null;
  const deco = (
    <>
      <Mono d={d} size={120} unit="calc(100cqw / 1440)" draw="reveal" style={{ position: "absolute", left: C(173), top: C(462) }} />
      <Mono d={d} size={120} unit="calc(100cqw / 1440)" draw="reveal" style={{ position: "absolute", left: C(1147), top: C(462) }} />
    </>
  );
  return (
    <Sec z={z} bg="paper" wide={wide} deco={deco} colStyle={{ paddingTop: U(60), paddingBottom: U(95) }}>
      <p data-a="up" className={cx(st.bd, "text-center")} style={{ height: U(49), fontSize: U(32), lineHeight: 49 / 32 }}>
        <Fit base={32} max={366} deps={t("Kechaning tartibi")}>
          {t("Kechaning tartibi")}
        </Fit>
      </p>
      <span data-a="line" aria-hidden className="mx-auto block" style={vars({ marginTop: U(9), width: U(40), height: U(1), background: "var(--gold)", "--d": "0.1s" })} />
      <div style={{ marginTop: U(37), paddingLeft: U(32), paddingRight: U(32) }}>
        {items.map((it, i) => (
          <div key={i} style={{ marginTop: i ? U(35) : 0 }}>
            <div className="flex items-start">
              <p data-a="up" className={cx(st.bi, "flex-none")} style={vars({ width: U(52), marginTop: U(2), height: U(31), fontSize: U(20), lineHeight: 31 / 20, color: "var(--gold)", "--d": "0.05s" })}>
                {ROMAN[i]}
              </p>
              <div className="min-w-0 flex-1">
                <div className="flex items-start" style={{ gap: U(12) }}>
                  <p data-a="up" className={cx(st.bd, st.clamp2, "min-w-0 flex-1")} style={vars({ fontSize: U(23), lineHeight: 35 / 23, "--d": "0.1s" })}>
                    {it.title}
                  </p>
                  <p data-a="up" className={cx(st.jm, "flex-none text-right")} style={vars({ marginTop: U(6), height: U(22), fontSize: U(15), lineHeight: 22 / 15, whiteSpace: "nowrap", "--d": "0.16s" })}>
                    {it.time}
                  </p>
                </div>
                {it.note?.trim() && (
                  <p data-a="up" className={cx(st.jr, st.clamp2)} style={vars({ marginTop: U(3), fontSize: U(14), lineHeight: 20 / 14, color: "var(--mute)", "--d": "0.2s" })}>
                    {it.note}
                  </p>
                )}
              </div>
            </div>
            <span data-a="lineL" aria-hidden className="block" style={vars({ marginTop: U(32), height: U(1), background: "var(--rule)", "--d": "0.25s" })} />
          </div>
        ))}
      </div>
    </Sec>
  );
}

/* ═════════════ 06 · Manzil ═════════════ */
function Venue({ d, z, wide, linkable }: { d: D; z: number; wide: boolean; linkable: boolean }) {
  const t = useT();
  return (
    <Sec z={z} bg="champ" wide={wide} lines colStyle={{ paddingTop: U(56), paddingBottom: U(90) }}>
      <p data-a="up" className={cx(st.bd, "text-center")} style={{ height: U(49), fontSize: U(32), lineHeight: 49 / 32 }}>
        <Fit base={32} max={366} deps={t("Manzil")}>
          {t("Manzil")}
        </Fit>
      </p>
      <div data-a="rise" className="relative mx-auto overflow-hidden" style={vars({ marginTop: U(19), width: U(326), height: U(230), "--d": "0.1s" })}>
        <Img src={d.venuePhoto} className={st.venueImg} />
      </div>
      {d.venueTitle && (
        <p data-a="up" className={cx(st.bd, "mx-auto text-center")} style={vars({ marginTop: U(30), width: U(350), fontSize: U(26), lineHeight: 40 / 26, overflowWrap: "anywhere", "--d": "0.15s" })}>
          {d.venueTitle}
        </p>
      )}
      {d.address && (
        <p data-a="up" className={cx(st.jr, "mx-auto text-center")} style={vars({ marginTop: U(d.venueTitle ? 4 : 30), width: U(300), fontSize: U(15), lineHeight: 23 / 15, color: "var(--mute)", overflowWrap: "anywhere", "--d": "0.22s" })}>
          {d.address}
        </p>
      )}
      <div data-a="up" className="flex justify-center" style={vars({ marginTop: U(26), "--d": "0.3s" })}>
        <a href={linkable ? d.mapUrl : undefined} target="_blank" rel="noopener noreferrer" className={cx(st.jm, st.pill, st.pillInk)} style={{ minWidth: U(190), height: U(50), padding: `0 ${U(24)}`, fontSize: U(15), borderRadius: U(25) }}>
          {t("Xaritada ochish")}
        </a>
      </div>
    </Sec>
  );
}

/* ═════════════ 07 · Dress-kod (ixtiyoriy — o‘chirilsa joy qolmaydi) ═════════════ */
function Dress({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  if (!d.dress) return null;
  const x = d.dress;
  return (
    <Sec z={z} bg="paper" wide={wide} colStyle={{ paddingTop: U(72), paddingBottom: U(35) }}>
      <p data-a="up" className={cx(st.bd, "text-center")} style={{ height: U(52), fontSize: U(34), lineHeight: 52 / 34 }}>
        <Fit base={34} max={366} deps={t("Dress-kod")}>
          {t("Dress-kod")}
        </Fit>
      </p>
      <p data-a="up" className={cx(st.bi, "text-center")} style={vars({ height: U(36), fontSize: U(24), lineHeight: 36 / 24, color: "var(--gold)", "--d": "0.1s" })}>
        <Fit base={24} max={366} deps={x.title}>
          {x.title}
        </Fit>
      </p>
      <span data-a="line" aria-hidden className="mx-auto block" style={vars({ marginTop: U(10), width: U(40), height: U(1), background: "var(--gold)", "--d": "0.15s" })} />
      <p data-a="up" className={cx(st.jr, "mx-auto text-center")} style={vars({ marginTop: U(25), width: U(300), fontSize: U(15), lineHeight: 25 / 15, color: "var(--mute)", overflowWrap: "anywhere", "--d": "0.2s" })}>
        {x.note}
      </p>
      <span data-a="line" aria-hidden className="mx-auto block" style={vars({ marginTop: U(60), width: U(80), height: U(1), background: "var(--light)", "--d": "0.25s" })} />
      <p data-a="up" className={cx(st.jr, "mx-auto text-center")} style={vars({ marginTop: U(19), width: U(350), fontSize: U(13), lineHeight: 19 / 13, color: "var(--mute)", overflowWrap: "anywhere", "--d": "0.3s" })}>
        {x.sub}
      </p>
    </Sec>
  );
}

/* ═════════════ 08 · Anketa — javob (qora fon, shampan karta) ═════════════ */
function Rsvp({ d, slug, mode, z, wide }: { d: D; slug: string; mode: InvitationSiteProps["mode"]; z: number; wide: boolean }) {
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
  const wishRef = useRef<HTMLTextAreaElement>(null);
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
  // tilak maydoni pastdan yuqoriga o‘sadi (maydon balandligi o‘zgarmaydi)
  useEffect(() => {
    const el = wishRef.current;
    const wrap = el?.parentElement;
    if (!el || !wrap) return;
    const fit = () => {
      el.style.height = "";
      const cs = getComputedStyle(wrap);
      const room = wrap.clientHeight - parseFloat(cs.paddingBottom || "0") - parseFloat(cs.paddingTop || "0");
      el.style.height = `${Math.min(el.scrollHeight, Math.max(0, room))}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [wish, sent]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErr(t("Ismingizni yozing"));
    setErr(null);
    if (!live) return setSent(status);
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
      setSent(status);
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const label = (s: string) => (
    <p className={cx(st.jm, st.lbl)} style={{ height: U(19), fontSize: U(13), lineHeight: 19 / 13 }}>
      {s}
    </p>
  );
  const sub = d.rsvpUntil ? t("Javobingizni {date} kutamiz", { date: d.rsvpUntil }) : t("Javobingizni kutamiz");
  return (
    <Sec z={z} bg="black" wide={wide} lines id="riviera-javob" colStyle={{ paddingTop: U(60), paddingBottom: U(76) }}>
      <p data-a="up" className={cx(st.bd, "text-center")} style={{ height: U(55), fontSize: U(36), lineHeight: 55 / 36, color: "var(--champ)" }}>
        <Fit base={36} max={366} deps={t("Kelasizmi?")}>
          {t("Kelasizmi?")}
        </Fit>
      </p>
      <p data-a="up" className={cx(st.jr, "mx-auto text-center")} style={vars({ marginTop: U(-1), width: U(350), fontSize: U(14), lineHeight: 20 / 14, color: "var(--light)", overflowWrap: "anywhere", "--d": "0.12s" })}>
        {sub}
      </p>
      <div data-a="rise" className={cx(st.card, "relative mx-auto")} style={vars({ marginTop: U(34), width: U(326), padding: `${U(25)} ${U(23)} ${U(23)}`, borderWidth: U(1), "--d": "0.2s" })}>
        {sent ? (
          <div key="thanks" className={cx(st.thanks, "flex flex-col items-center text-center")} style={{ padding: `${U(40)} 0 ${U(34)}`, gap: U(16) }}>
            <p className={st.bi} style={{ fontSize: U(sent === "not_coming" ? 32 : 28), lineHeight: 1.3, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Rahmat!") : t("Rahmat! Joyingiz band qilindi")}
            </p>
            <p className={st.jr} style={{ fontSize: U(15), color: "var(--mute)", lineHeight: 1.6, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Javobingiz uchun rahmat — sizni duolarimizda eslaymiz.") : t("{name} — {count} kishi. Javobingiz yetkazildi.", { name: name.trim() || t("Javobingiz"), count })}
            </p>
            <button type="button" onClick={() => setSent(null)} className={st.jm} style={{ fontSize: U(14), textDecoration: "underline", textUnderlineOffset: 3 }}>
              {t("Javobni o‘zgartirish")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col items-stretch">
            {label(t("Ismingiz"))}
            <label className={st.fieldWrap} style={{ marginTop: U(3), height: U(44), paddingBottom: U(9), borderBottomWidth: U(1) }}>
              <input className={cx(st.jr, st.field)} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={t("Ism va familiya")} aria-label={t("Ismingiz")} style={{ fontSize: U(16) }} />
            </label>
            <div className="flex w-full" role="radiogroup" aria-label={t("Kelasizmi?")} style={{ marginTop: U(22), gap: U(8) }}>
              {(
                [
                  ["coming", "Albatta kelaman"],
                  ["not_coming", "Kela olmayman"],
                ] as const
              ).map(([s, l]) => (
                <button key={s} type="button" role="radio" aria-checked={status === s} onClick={() => setStatus(s)} className={cx(st.jm, st.choice)} style={{ padding: `${U(10)} ${U(8)}`, minHeight: U(46), fontSize: U(15), borderWidth: U(1), borderRadius: U(23) }}>
                  <span style={{ overflowWrap: "anywhere" }}>{t(l)}</span>
                </button>
              ))}
            </div>
            {status === "coming" && (
              <div className="flex w-full items-center" style={{ marginTop: U(20), gap: U(8), minHeight: U(34) }}>
                <p className={st.jr} style={{ flex: "1 1 0", minWidth: 0, fontSize: U(15), lineHeight: 1.3 }}>
                  {t("Necha kishi bo‘lasiz?")}
                </p>
                <button type="button" className={cx(st.jm, st.step)} disabled={count <= 1} onClick={() => setCount((c) => Math.max(1, c - 1))} aria-label={t("Kamaytirish")} style={{ width: U(32), height: U(34), fontSize: U(20), borderWidth: U(1) }}>
                  −
                </button>
                <span className={st.bd} style={{ width: U(32), textAlign: "center", fontSize: U(20), lineHeight: 1.5 }} aria-live="polite">
                  {count}
                </span>
                <button type="button" className={cx(st.jm, st.step)} disabled={count >= 20} onClick={() => setCount((c) => Math.min(20, c + 1))} aria-label={t("Ko‘paytirish")} style={{ width: U(32), height: U(34), fontSize: U(20), borderWidth: U(1) }}>
                  +
                </button>
              </div>
            )}
            <div style={{ marginTop: U(22) }}>{label(t("Tilaklaringiz"))}</div>
            <label className={st.fieldWrap} style={{ marginTop: U(3), height: U(80), paddingTop: U(12), paddingBottom: U(9), borderBottomWidth: U(1), justifyContent: "flex-start" }}>
              <textarea ref={wishRef} rows={1} className={cx(st.jr, st.field)} value={wish} onChange={(e) => setWish(e.target.value)} maxLength={500} placeholder={t("Yosh oilaga bir-ikki so‘z…")} aria-label={t("Tilaklaringiz")} style={{ fontSize: U(16) }} />
            </label>
            {err && (
              <p className={st.jr} style={{ marginTop: U(12), color: "#a4442f", fontSize: U(13) }}>
                {err}
              </p>
            )}
            <button type="submit" disabled={busy} className={cx(st.jm, st.pill, st.pillInk)} style={{ marginTop: U(24), minHeight: U(50), padding: `${U(12)} ${U(12)}`, fontSize: U(15), borderRadius: U(25), opacity: busy ? 0.7 : 1 }}>
              {busy ? t("Yuborilmoqda…") : t("Javobni yuborish")}
            </button>
          </form>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 09 · Final — atirgullar yon tomondan kirib keladi, monogramma chiziladi; scroll bilan (--fc 0 … 1 = Figma kadri), sahifa oxirigacha albatta tugaydi ═════════════ */
const FIN = {
  m: { H: 844, title: 310, tfs: 44, th: 67, text: [55, 380, 280, 15, 25], line: [175, 468, 40], names: [494, 24, 37], date: [536, 13, 19, 4], mono: [159, 620, 72] },
  l: { H: 900, title: 410, tfs: 64, th: 98, text: [500, 514, 440, 18, 30], line: [690, 610, 60], names: [638, 32, 49], date: [694, 14, 20, 5], mono: [665, 265, 110] },
};
function Final({ d, z, wide, still, onSeen }: { d: D; z: number; wide: boolean; still: boolean; onSeen: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const sec = useRef<HTMLElement>(null);
  const F = wide ? FIN.l : FIN.m;
  const onP = useCallback(
    (_p: number, r: DOMRect) => {
      const el = ref.current;
      if (!el) return;
      const vh = window.innerHeight || 800;
      // bo‘lim ekranning 70% iga kirganda boshlanadi; sarlavha ekran tepasidan 45% ga kelganda tugaydi — sahifa oxiri undan oldin kelsa, oxirida tugaydi
      const y = window.scrollY;
      const top = r.top + y;
      const c = top + (r.height / F.H) * F.title;
      const max = document.documentElement.scrollHeight - vh;
      const s0 = Math.min(top - vh * 0.7, max - vh * 0.5);
      const s1 = Math.max(s0 + 1, Math.min(c - vh * 0.45, max));
      const f = seg(y, s0, s1);
      el.style.setProperty("--fc", f.toFixed(4));
      if (f > 0.5) onSeen();
    },
    [onSeen, F],
  );
  useScrollProgress(sec, onP, !still);
  const title = t("Sizni kutamiz");
  const W = wide ? 1440 : 390;
  const [tx, ty, tw, tfs, tlh] = F.text;
  // uzun ismlar — ikki qator; sana shuncha pastga suriladi (monogrammagacha joy bor)
  const names = pairLines(d, wide ? 60 : 30);
  const extra = (names.length - 1) * (F.names[2] - 4);
  return (
    <section ref={sec} className={cx(st.sec, st.paper)} style={vars({ zIndex: z, "--u": wide ? CANVAS_L : COL_M })}>
      <div ref={ref} className={cx(st.finalWrap, "relative")} style={vars({ height: U(F.H), ...(still ? { "--fc": 1 } : {}) })}>
        {wide ? (
          <>
            <div aria-hidden className={cx(st.fRose, st.fRoseL)} style={{ left: U(73), top: U(343.43), width: U(320), height: U(213.14) }}>
              <Img src={`${P}/rose.webp`} />
            </div>
            <div aria-hidden className={cx(st.fRose, st.fRoseR)} style={{ left: U(1047), top: U(343.43), width: U(320), height: U(213.14) }}>
              <Img src={`${P}/rose.webp`} style={{ transform: "scaleX(-1)" }} />
            </div>
          </>
        ) : (
          <div aria-hidden className={cx(st.fRose, st.fRoseL)} style={{ left: U(45), top: U(70.09), width: U(300), height: U(199.82) }}>
            <Img src={`${P}/rose.webp`} />
          </div>
        )}
        <Mono d={d} size={F.mono[2]} unit="var(--u)" draw="final" style={{ position: "absolute", left: U(F.mono[0]), top: U(F.mono[1]) }} />
        <h2 className={cx(st.bi, st.fTitle, "absolute inset-x-0 text-center")} style={{ top: U(F.title), height: U(F.th), fontSize: U(F.tfs), lineHeight: F.th / F.tfs }}>
          <Fit base={F.tfs} max={W - 40} deps={title}>
            {title}
          </Fit>
        </h2>
        <p className={cx(st.jr, st.fText, "absolute text-center")} style={{ left: U(tx), top: U(ty), width: U(tw), fontSize: U(tfs), lineHeight: tlh / tfs, color: "var(--mute)" }}>
          {t("Shu oqshomni biz bilan birga o‘tkazishingiz — eng qimmatli sovg‘a.")}
        </p>
        <span aria-hidden className={cx(st.fLine, "absolute")} style={{ left: U(F.line[0]), top: U(F.line[1]), width: U(F.line[2]), height: 1, background: "var(--gold)" }} />
        {names.map((l, i) => (
          <p key={i} className={cx(st.bd, st.fNames, "absolute inset-x-0 text-center")} style={{ top: U(F.names[0] + i * (F.names[2] - 4)), height: U(F.names[2]), fontSize: U(F.names[1]), lineHeight: F.names[2] / F.names[1] }}>
            <Fit base={F.names[1]} max={W - 40} deps={l}>
              {l}
            </Fit>
          </p>
        ))}
        {d.dots && (
          <p className={cx(st.jm, st.fDate, "absolute inset-x-0 text-center")} style={{ top: U(F.date[0] + extra), height: U(F.date[2]), fontSize: U(F.date[1]), lineHeight: F.date[2] / F.date[1], color: "var(--mute)", whiteSpace: "nowrap" }}>
            <span style={{ letterSpacing: U(F.date[3]), paddingLeft: U(F.date[3]) }}>{d.dots}</span>
          </p>
        )}
      </div>
    </section>
  );
}

/* ═════════════ Musiqa tugmasi — Figma «Riviera / Musiqa tugmasi»: shampan doira, qora chegara, 3 chiziq ritmda; o‘chirilgan — xira chiziqlar, oltin qiya chiziq ═════════════ */
const BARS: [number, number, number][] = [
  [19, 19, 14],
  [25, 15, 22],
  [31, 21, 10],
];
function RivieraMusic({ m, wide, embedded }: { m: ReturnType<typeof useMusic>; wide: boolean; embedded: boolean }) {
  const t = useT();
  if (!m.available) return null;
  const btn = (
    <button
      type="button"
      onClick={m.toggle}
      aria-label={m.playing ? t("Musiqani o‘chirish") : t("Musiqani yoqish")}
      aria-pressed={m.playing}
      className={cx(st.music, embedded && st.musicEmbedded, m.playing && st.playing)}
      style={{ right: wide ? 24 : 16, top: wide ? 24 : 16 }}
    >
      <svg viewBox="0 0 52 52" width={52} height={52} aria-hidden>
        <circle cx="26" cy="26" r="25" fill="#FAF7F1" stroke="#121212" />
        {BARS.map(([x, y, h], i) => (
          <rect key={i} x={x} y={y} width={2} height={h} className={st.bar} style={vars({ "--i": i })} />
        ))}
        <path d="M16 36L36 16" className={st.strike} />
      </svg>
    </button>
  );
  return embedded ? <div style={{ position: "sticky", top: 0, height: 0, zIndex: 70 }}>{btn}</div> : btn;
}

/* ═════════════ Sahifa ═════════════ */
type Key = "taklif" | "kadrlar" | "sana" | "program" | "venue" | "dress" | "rsvp" | "final";

export function RivieraSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const loaded = usePreload([d.hero, `${P}/seal.webp`], [d.portrait, d.square, d.venuePhoto, `${P}/rose.webp`].filter(Boolean) as string[], withGate, wide ? "l" : "m");
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

  const dimmed = useRef(false);
  const onFinal = useCallback(() => {
    if (dimmed.current) return;
    dimmed.current = true;
    music.dim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown: Key[] = (["taklif", "kadrlar", "sana", "program", "venue", "dress", "rsvp", "final"] as Key[]).filter((k) =>
    k === "kadrlar" ? !!d.portrait : k === "sana" ? d.hasDate : k === "program" ? d.program.length > 0 : k === "dress" ? !!d.dress : k === "rsvp" ? data.rsvpEnabled : true,
  );
  const z = (k: Key) => 6 + shown.indexOf(k);
  const linkable = mode !== "preview";
  const colU = wide ? COL_L : COL_M;
  const fu = (n: number) => (wide ? C(n) : U(n));

  return (
    <div ref={root} className={st.root}>
      <div className={st.page} style={vars({ "--u": colU })}>
        <RivieraMusic m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/seal.webp`} />}
        <div className={cx(st.flow, st.opening)} style={embedded ? vars({ "--o": 1 }) : undefined}>
          {withGate && (loaded ? <Gate d={d} wide={wide} onStart={() => music.play(true)} /> : <div className={st.gateHold} />)}
          {embedded && <Gate d={d} wide={wide} still onStart={() => {}} />}
          <div className={cx(st.openWrap, embedded && st.openStill)} style={{ zIndex: 5 }}>
            <Hero d={d} wide={wide} still={embedded} />
            {withGate && <div className={st.openSpacer} />}
          </div>
          <Taklif d={d} z={z("taklif")} wide={wide} />
          <Kadrlar d={d} z={z("kadrlar")} wide={wide} still={embedded} />
          <Sana d={d} z={z("sana")} wide={wide} />
          <Program d={d} z={z("program")} wide={wide} />
          <Venue d={d} z={z("venue")} wide={wide} linkable={linkable} />
          <Dress d={d} z={z("dress")} wide={wide} />
          {data.rsvpEnabled && <Rsvp d={d} slug={data.slug} mode={mode} z={z("rsvp")} wide={wide} />}
          <Final d={d} z={z("final")} wide={wide} still={embedded} onSeen={onFinal} />
        </div>
        <footer className={cx(st.footer, "flex items-start justify-center")} style={{ height: fu(120), paddingTop: fu(50) }}>
          <p className={cx(st.jr, "text-center")} style={{ fontSize: fu(13), lineHeight: 19 / 13, color: "var(--light)" }}>
            <a href="https://shohnoma.uz">Shohnoma</a> · {t("elektron taklifnomalar")}
          </p>
        </footer>
      </div>
    </div>
  );
}
