"use client";

import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { splitDate, tashkentDate } from "@/lib/display";
import { musicSrc } from "@/lib/music";
import { tr, useLocale, useT, type Locale } from "@/lib/i18n";
import type { InvitationSiteProps } from "@/components/invitation/types";
import { fetchSavedAnswer, loadSavedRsvp, rsvpUrl, saveRsvp, type RsvpStatus } from "@/components/invitation/Rsvp";
import { guestHello, useGuestName } from "../shared/guest";
import { timerUnits } from "@/components/invitation/data";
import { useCountdown, useCountUp, useInView, useScrollProgress, useWide } from "../shared/hooks";
import { Loader, usePreload, useMusic } from "../shared/runtime";
import { calendarWords, untilPhrase, type ProgramItem } from "../anor/data";
import { DRESS_TEXT, MSG, MSG_HOST, MSG_WE, P, SHAM_DEMO, SHAM_DEMO_EN, SHAM_DEMO_RU } from "./data";
import st from "./sham.module.css";

/* ── Birliklar ──
 * U — joriy `--u`: bo‘limlarda kontent ustuni (Figma mobil 390 koordinatalari; laptopda ustun = mobil × 1.45, ya’ni 565.5px / 1440).
 * C — laptop kanvasi (1440) birligi: yon bezaklar (konfetti, shamlar, nur) va chok ustidagi konfetti.
 * Ochilish (sham), hero va final — o‘z kanvasi (mobil 390×844, laptop 1440×900); ochilish va hero sahnasi bir ekranga sig‘adi va
 * pastki chetga bog‘lanadi. */
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

/* ═════════════ Yosh ═════════════ */
/** «30» → 30 (1…120); bo‘lmasa 0 */
function parseAge(raw: string) {
  const n = Math.round(Number(String(raw).replace(/[^\d.]/g, "")));
  return raw.trim() && Number.isFinite(n) && n >= 1 && n <= 120 ? n : 0;
}

/** Server yaratadigan standart taklif matni (php/api/lib/orders.php DEFAULT_MESSAGE) — har qaysi tilda */
const SERVER_DEFAULT = "Aziz mehmonlar! Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.";
const isServerDefault = (m: string) => (["uz", "ru", "en"] as Locale[]).some((l) => tr(l, SERVER_DEFAULT).trim() === m.trim());

function useData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO = lang === "ru" ? SHAM_DEMO_RU : lang === "en" ? SHAM_DEMO_EN : SHAM_DEMO;
  const ex = (data.extra ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof ex[k] === "string" ? (ex[k] as string).trim() : typeof ex[k] === "number" ? String(ex[k]) : "");
  const sd = splitDate(data.date);
  const guest = useGuestName();
  return useMemo(() => {
    const cw = calendarWords(lang);
    const exProgram = Array.isArray(ex.program) ? (ex.program as ProgramItem[]).filter((p) => p?.time && p?.title) : [];
    const photos = (data.photos ?? []).filter(Boolean) as string[];
    const date = sd ? new Date(`${sd.iso}T12:00:00Z`) : null;
    // namunadagi ismlar tarjima qilinadi (mijoz ma’lumoti — o‘zgarishsiz)
    const a = ((demo ? t(data.personA) : data.personA) || "").trim();
    // taklif qiluvchi (ixtiyoriy: ota-ona, farzandlar, oila): bo‘lsa — matnlar «biz» nomidan, imzo — shu
    const host = str("host");
    const we = !!host;
    const age = parseAge(str("age") || (demo ? DEMO.age : ""));
    const code = str("dressCode") || (demo ? DEMO.dressCode : "");
    const dressNote = str("dressNote") || (DRESS_TEXT[code] ? t(DRESS_TEXT[code]) : "");
    const time = sd?.time ?? "";
    const program = (demo ? DEMO.program : exProgram.length ? exProgram : ((data.program ?? []) as ProgramItem[])) as ProgramItem[];
    const raw = (demo ? "" : data.message || "").trim();
    const custom =
      raw && !isServerDefault(raw)
        ? raw.replace(/^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Muhtaram mehmonlar!|Aziz do‘stlarim!|Aziz do‘stlar!|Дорогие гости!|Дорогие друзья!|Dear guests!|Dear friends!)\s*/, "").trim()
        : "";
    const message = custom || (we ? (a ? t(MSG_HOST, { name: a }) : t(MSG_WE)) : t(MSG));
    const venueTitle = ((demo ? t(data.venueName) : data.venueName) || "").trim();
    const address = ((demo ? DEMO.address : data.address) || "").trim();
    const m = date ? date.getUTCMonth() : 0;
    const year = date ? date.getUTCFullYear() : 0;
    const day = date ? date.getUTCDate() : 0;
    // namunada javob muddati — Figma’dagidek sanadan 13 kun oldin («1-avgustgacha»)
    const deadline = demo && sd ? new Date(Date.UTC(year, m, day - 13)).toISOString().slice(0, 10) : data.rsvpDeadline;
    const wd = date ? cw.weekday[date.getUTCDay()] : "";
    // Figma: hero — portret, «Yillar — xotira» — tort surati, manzil — terrassa (mijozda: 1–3-suratlar; hero surati bo‘lmasa —
    // ramkada yonib turgan sham, 2- va 3-surat bo‘lmasa — shablonning tort va terrassa suratlari: har qaysi yoshga mos)
    const portrait = demo ? `${P}/portret.webp` : photos[0] || "";
    const cake = demo ? `${P}/tort.webp` : photos[1] || `${P}/tort.webp`;
    const hall = demo ? `${P}/terrassa.webp` : photos[2] || `${P}/terrassa.webp`;
    return {
      a,
      we,
      /** imzo: taklif qiluvchi yoki yubilyarning o‘zi */
      signer: host || a,
      age,
      /** hero’dagi katta raqam: yosh; yosh bo‘lmasa — ismning birinchi harfi */
      big: age ? String(age) : a ? Array.from(a)[0].toLocaleUpperCase(lang) : "",
      /** ochilish: «30 yoshga to‘ladi» / «отмечает 30-летие» / «turns 30»; yosh bo‘lmasa — «tug‘ilgan kunini nishonlaydi» */
      soon: age ? t("{n} yoshga to‘ladi", { n: age }) : t("tug‘ilgan kunini nishonlaydi"),
      /** ochilish pastidagi qator: «Aziz  ·  14.08.2027» */
      tag: [a, sd?.day ?? ""].filter(Boolean).join("\u00a0\u00a0·\u00a0\u00a0"),
      /** «14 · 08 · 2027» */
      dots: sd?.dots ?? "",
      /** «14 · 08 · 2027 · 19:00» */
      dotsTime: [sd?.dots, time].filter(Boolean).join(" · "),
      day: date ? String(day) : "",
      /** «avgust · shanba · 19:00» / «августа · суббота · 19:00» / «August · Saturday · 19:00» */
      monthLine: date ? [cw.monthsAfterDay[m], lang === "en" ? wd : wd.toLocaleLowerCase(lang), time].filter(Boolean).join(" · ") : "",
      hasDate: !!date,
      target: data.date ? tashkentDate(data.date).getTime() : null,
      guest,
      message,
      venueTitle,
      address,
      hasPlace: !!(venueTitle || address || data.mapUrl),
      mapUrl: data.mapUrl || `https://yandex.uz/maps/?text=${encodeURIComponent([venueTitle, address].filter(Boolean).join(", "))}`,
      program,
      dressCode: DRESS_TEXT[code] || str("dressCode") ? t(code) : "",
      dressNote,
      portrait,
      cake,
      hall,
      rsvpUntil: untilPhrase(deadline, lang),
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

/** Chok ustidagi konfetti — sekin parallaks (0.15× skroll; ±36px bilan cheklangan): `--py` */
function useParallax(root: React.RefObject<HTMLDivElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = root.current;
    if (!el || !enabled) return;
    if (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const vh = window.innerHeight || 800;
      el.querySelectorAll<HTMLElement>("[data-px]").forEach((x) => {
        const r = x.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const dist = r.top + r.height / 2 - vh / 2;
        x.style.setProperty("--py", `${Math.max(-36, Math.min(36, dist * -0.15)).toFixed(1)}px`);
      });
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, [root, enabled]);
}

function Img({ src, className, style, eager }: { src: string; className?: string; style?: CSSProperties; eager?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" draggable={false} loading={eager ? "eager" : "lazy"} decoding="async" className={cx(st.img, className)} style={style} />;
}

/** Uzun ism/matn bir qatorga sig‘masa — shrift kichrayadi (kesilmaydi, toshmaydi) */
function Fit({
  children,
  base,
  max,
  className,
  style,
  deps,
  unit = U,
}: {
  children: ReactNode;
  base: number;
  max: number;
  className?: string;
  style?: CSSProperties;
  deps: unknown;
  unit?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useIso(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      el.style.fontSize = unit(base);
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (!px) return;
      const u = px / base;
      const w = el.offsetWidth;
      const k = w > max * u ? (max * u) / w : 1;
      el.style.fontSize = unit(+(base * k).toFixed(3));
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

/** Matnni 2 qatorga eng teng bo‘lish (bo‘sh joy bo‘yicha) */
function split2(text: string): [string, string] | null {
  const w = text.trim().split(/\s+/);
  if (w.length < 2) return null;
  let best: [string, string] | null = null;
  let bw = Infinity;
  for (let i = 1; i < w.length; i++) {
    const a = w.slice(0, i).join(" ");
    const b = w.slice(i).join(" ");
    const m = Math.max(a.length, b.length);
    if (m < bw) {
      bw = m;
      best = [a, b];
    }
  }
  return best;
}

/**
 * Ism (bir qator, sig‘masa kichrayadi); juda uzun bo‘lsa (bir qatorda 0.72 dan kichrayib ketadi) — ikki teng qatorga,
 * har qator `two` o‘lchamida. `letters` — hero: har harf --o bilan navbatma-navbat pastdan ko‘tariladi ([boshlanish, tugash]).
 */
function NameLines({
  text,
  base,
  max,
  lh,
  two,
  twoLh,
  unit = U,
  className,
  style,
  letters,
}: {
  text: string;
  base: number;
  max: number;
  lh: number;
  two: number;
  twoLh: number;
  unit?: (n: number) => string;
  className?: string;
  style?: CSSProperties;
  letters?: [number, number];
}) {
  const probe = useRef<HTMLSpanElement>(null);
  const [split, setSplit] = useState(false);
  useIso(() => {
    const el = probe.current;
    if (!el) return;
    const measure = () => {
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (!px) return;
      const k = ((px / base) * max) / Math.max(1, el.offsetWidth);
      setSplit(k < 0.72 && !!split2(text));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (el.parentElement) ro.observe(el.parentElement);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [text, base, max]);
  const rows = split ? split2(text)! : [text];
  const fs = split ? two : base;
  const h = split ? twoLh : lh;
  const total = Math.max(1, rows.join("").replace(/\s/g, "").length);
  let idx = 0;
  return (
    <div className={className} style={style}>
      <span ref={probe} aria-hidden className="pointer-events-none absolute whitespace-nowrap" style={{ visibility: "hidden", fontSize: unit(base), left: 0, top: 0 }}>
        {text}
      </span>
      {rows.map((r, i) => (
        <span key={i} className="block" style={{ height: unit(h), lineHeight: `${unit(h)}`, fontSize: unit(fs), whiteSpace: "nowrap" }}>
          <Fit base={fs} max={max} unit={unit} deps={`${r}|${fs}`}>
            {letters
              ? Array.from(r).map((ch, k) =>
                  /\s/.test(ch) ? (
                    <span key={k}>{" "}</span>
                  ) : (
                    <span key={k} className={st.letter} style={vars({ "--li": +(letters[0] + ((letters[1] - letters[0]) * idx++) / total).toFixed(4) })}>
                      {ch}
                    </span>
                  ),
                )
              : r}
          </Fit>
        </span>
      ))}
    </div>
  );
}

/* ═════════════ Bezaklar ═════════════ */
type Box4 = readonly [number, number, number, number];
type Pos = (n: number) => string;

/** Konfetti (Figma «Sham / Konfetti», 360×220 vektor); `flip` — gorizontal ko‘zgu (Figma «-scale-y + rotate 180») */
function Confetti({ box, left, top, unit, flip, a = "burst", d = 0, className, px }: { box: Box4; left?: Pos; top?: Pos; unit: Pos; flip?: boolean; a?: string; d?: number; className?: string; px?: boolean }) {
  const [x, y, w, h] = box;
  return (
    <div
      aria-hidden
      data-a={a}
      data-px={px ? "" : undefined}
      className={cx(st.art, st.conf, className)}
      style={vars({ left: (left ?? unit)(x), top: (top ?? unit)(y), width: unit(w), height: unit(h), "--d": `${d}s` })}
    >
      <Img src={`${P}/konfetti.svg`} className={flip ? st.flip : undefined} />
    </div>
  );
}

/** Sham nuri (Figma ellips: #F5C978 55% → 0) */
function Glow({ box, left, top, unit, className, style }: { box: Box4; left?: Pos; top?: Pos; unit: Pos; className?: string; style?: CSSProperties }) {
  const [x, y, w, h] = box;
  return <span aria-hidden className={cx(st.glow, className)} style={{ left: (left ?? unit)(x), top: (top ?? unit)(y), width: unit(w), height: unit(h), ...style }} />;
}

/**
 * Sham (Figma «Sham / Qatlam · Sham», 200×300 kanvas): oltin tana (o‘chgan pilik bilan) + alohida olov qatlami.
 * Olov doim yengil tebranadi (scaleY 0.95↔1.05, tartibsiz qadamlar) — `flame` sinfi bilan scroll holati (o‘chish / yonish) beriladi.
 */
function Candle({ box, left, top, unit, flameClass, style, k = 0, eager }: { box: Box4; left?: Pos; top?: Pos; unit: Pos; flameClass?: string; style?: CSSProperties; k?: number; eager?: boolean }) {
  const [x, y, w, h] = box;
  return (
    <div aria-hidden className={st.candle} style={{ left: (left ?? unit)(x), top: (top ?? unit)(y), width: unit(w), height: unit(h), ...style }}>
      <Img src={`${P}/sham.webp`} eager={eager} />
      <div className={cx(st.flame, flameClass)}>
        <div className={st.flick} style={vars({ "--fk": `${(1.7 + (k % 3) * 0.23).toFixed(2)}s`, "--fkd": `${(-k * 0.37).toFixed(2)}s` })}>
          <Img src={`${P}/olov.webp`} eager={eager} />
        </div>
      </div>
    </div>
  );
}

/* ═════════════ 00 · Ochilish — yonib turgan sham (faqat scroll bilan, --o: 0…1) ═════════════
 * Yuklanganda (bosishsiz): yozuvlar sokin chiqadi, olov tebranadi, nur «nafas oladi». Scroll (rAF lerp):
 * yozuvlar so‘nadi (0…0.06); olov puflangandek egilib o‘chadi (0…0.07), pilik cho‘g‘i so‘nadi, ingichka tutun yuqoriga buraladi
 * (0.03…0.33); ekran qisqa qorong‘ilashadi (0.05…0.1); pilik nuqtasidan konfetti radial portlaydi va fizika bilan tushadi
 * (0.05…0.63); fon sham bilan birga tungi ko‘kdan sutga «yoyiladi» — pilikdan qattiq chegarali doira (0.1…0.36; doira ichida
 * hero to‘liq ko‘rinadi — fon orqali «sharpa» yo‘q), chegarasida oltin to‘lqin halqasi. */
const GATE = {
  m: { W: 390, H: 844, glow: [5, 130, 380, 380] as Box4, l1: [104, 31, 24] as const, l2: [142, 35, 28] as const, candle: [110, 342.5, 170, 255] as Box4, tag: [700, 19, 14, 4] as const, max: 366, n: 72, spread: 900 },
  l: { W: 1440, H: 900, glow: [440, 60, 560, 560] as Box4, l1: [96, 38, 30] as const, l2: [144, 55, 44] as const, candle: [610, 335, 220, 330] as Box4, tag: [790, 20, 15, 5] as const, max: 1200, n: 100, spread: 1500 },
} as const;
/** pilik nuqtasi — sham kanvasida (1024×1536) x 0.5, y 245/1536 */
const WICK = 245 / 1536;
const COLORS = ["#C9A46A", "#E3C891", "#9FB3A2", "#C7795A", "#FBF7F0", "#C9A46A", "#E3C891"];
type Piece = { vx: number; vy: number; g: number; ox: number; oy: number; t0: number; rot: number; kind: 0 | 1 | 2; w: number; h: number; c: string };
/** Deterministik konfetti bo‘laklari (gidratatsiya mos keladi) */
function makePieces(n: number, spread: number): Piece[] {
  let s = 1777;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  return Array.from({ length: n }, (_, i) => {
    // yuqori yarim doira bo‘ylab (−165°…−15°) tasodifiy yo‘nalish va tezlik — radial portlash
    const ang = (-165 + rnd() * 150) * (Math.PI / 180);
    const v = spread * (0.45 + rnd() * 0.75);
    const vy = Math.min(-260, Math.sin(ang) * v * 1.25);
    const kind = (i % 9 === 4 ? 2 : rnd() < 0.42 ? 1 : 0) as 0 | 1 | 2;
    return {
      vx: Math.cos(ang) * v,
      vy,
      g: Math.max(1900, 620 - vy + rnd() * 240),
      /** boshlang‘ich siljish (pilik atrofida, bo‘laklar bitta nuqtada to‘planib «shar» bo‘lib ko‘rinmasin) */
      ox: (rnd() * 2 - 1) * 14,
      oy: (rnd() * 2 - 1) * 10,
      t0: rnd() * 0.08,
      rot: (rnd() * 2 - 1) * 900,
      kind,
      w: kind === 2 ? 30 : kind === 1 ? 6 + rnd() * 6 : 5 + rnd() * 3,
      h: kind === 2 ? 12 : kind === 1 ? 6 + rnd() * 6 : 11 + rnd() * 7,
      c: COLORS[Math.floor(rnd() * COLORS.length)],
    };
  });
}
const PIECES = { m: makePieces(GATE.m.n, GATE.m.spread), l: makePieces(GATE.l.n, GATE.l.spread) };

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
      el.style.pointerEvents = o > 0.1 ? "none" : "";
      el.style.visibility = o > 0.9 ? "hidden" : "";
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
  const [l1T, l1H, l1F] = G.l1;
  const [l2T, l2H, l2F] = G.l2;
  const [tgT, tgH, tgF, tgLs] = G.tag;
  const [, cy, cw, ch] = G.candle;
  const wickY = cy + ch * WICK;
  const pieces = wide ? PIECES.l : PIECES.m;
  return (
    <div
      ref={wrap}
      className={cx(st.gateWrap, still && st.still)}
      style={vars({
        ...(still ? { "--u": pageU, "--o": 0, height: U(H), marginBottom: 0 } : { "--u": `min(${pageU}, calc(100svh / ${H}))` }),
        "--wy": Y(wickY),
      })}
    >
      <div className={st.gate} aria-label={t("Taklifnoma")} style={still ? { position: "relative", height: "100%" } : undefined}>
        {/* fon (tungi ko‘k), sham nuri va qorong‘ilashish — radial «yoyilish» bilan birga olinadi */}
        <div aria-hidden className={st.gBack}>
          <div className={st.gBg} />
          <Glow box={G.glow} left={X} top={Y} unit={U} className={st.gGlow} />
          {/* sham ham fon bilan birga: «yoyilish» doirasi pilikdan boshlab uni yorug‘likka eritadi */}
          <Candle box={G.candle} left={X} top={Y} unit={U} flameClass={st.gFlame} eager />
          <span aria-hidden className={st.ember} style={{ left: X(W / 2 - 3), top: Y(wickY - 1), width: U(6), height: U(6) }} />
          <div className={st.gDark} />
        </div>
        <span aria-hidden className={st.gRing} />
        {/* tutun — pilikdan yuqoriga buraladi */}
        <svg aria-hidden viewBox="0 0 60 200" className={st.smoke} style={{ left: X(W / 2 - cw * 0.3), top: Y(wickY - cw * 2), width: U(cw * 0.6), height: U(cw * 2) }} fill="none" strokeLinecap="round">
          <path d="M30 200C30 186 24 178 27 166C30 152 40 146 37 130C34 114 22 108 26 90C30 74 42 66 38 46C35 30 28 18 31 2" pathLength={1} strokeWidth={1.6} />
          <path d="M30 200C31 188 36 180 33 168C30 156 21 150 24 136C27 122 37 114 34 98C31 84 23 76 27 60" pathLength={1} strokeWidth={1.1} />
          <path d="M30 200C29 190 33 182 31 172C29 162 25 156 28 144C31 134 35 126 33 114" pathLength={1} strokeWidth={0.9} />
        </svg>
        <div className={st.gText}>
          <p className={cx(st.lora, st.gIn, "absolute inset-x-0 text-center")} style={vars({ top: Y(l1T), height: U(l1H), fontSize: U(l1F), lineHeight: `${U(l1H)}`, color: "var(--goldL)", whiteSpace: "nowrap", "--gd": "0.15s" })}>
            <Fit base={l1F} max={G.max} deps={t("Yaqinda kimdir")}>
              {t("Yaqinda kimdir")}
            </Fit>
          </p>
          <p className={cx(st.ub, st.gIn, "absolute inset-x-0 text-center")} style={vars({ top: Y(l2T), height: U(l2H), fontSize: U(l2F), lineHeight: `${U(l2H)}`, color: "var(--cream)", whiteSpace: "nowrap", "--gd": "0.35s" })}>
            <Fit base={l2F} max={G.max} deps={d.soon}>
              {d.soon}
            </Fit>
          </p>
          {d.tag && (
            <p className={cx(st.msM, st.gIn, "absolute inset-x-0 text-center")} style={vars({ top: Y(tgT), height: U(tgH), fontSize: U(tgF), lineHeight: `${U(tgH)}`, color: "var(--goldL)", whiteSpace: "pre", "--gd": "0.6s" })}>
              <Fit base={tgF} max={G.max} deps={d.tag}>
                <span style={{ letterSpacing: `${+(tgLs / tgF).toFixed(4)}em`, paddingLeft: `${+(tgLs / tgF).toFixed(4)}em` }}>{d.tag}</span>
              </Fit>
            </p>
          )}
        </div>
        {/* konfetti portlashi — pilik nuqtasidan */}
        {!still && (
          <div aria-hidden className={st.burst} style={{ left: X(W / 2), top: Y(wickY) }}>
            {pieces.map((p, i) => (
              <span
                key={i}
                className={cx(st.bit, p.kind === 1 && st.bitDot, p.kind === 2 && st.bitWave)}
                style={vars({ width: U(p.w), height: U(p.h), marginLeft: U(-p.w / 2), marginTop: U(-p.h / 2), background: p.kind === 2 ? undefined : p.c, color: p.c, "--vx": p.vx.toFixed(1), "--vy": p.vy.toFixed(1), "--ox": p.ox.toFixed(1), "--oy": p.oy.toFixed(1), "--g": p.g.toFixed(1), "--t0": p.t0.toFixed(3), "--rot": p.rot.toFixed(0) })}
              >
                {p.kind === 2 && (
                  <svg viewBox="0 0 30 12" className={st.svg}>
                    <path d="M1 7C6 2 9 11 15 6C18 3 21 7 21 7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" fill="none" />
                  </svg>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═════════════ 01 · Hero — katta yosh raqami (ochilish ostida sticky; --o bilan):
 * raqam pastdan ko‘tariladi va oltin gradient bo‘ylab yaltiroq o‘tadi, surat 1.06 → 1, ism harfma-harf, konfetti to‘dalari
 * «portlab» joyiga tushadi. Yosh kiritilmasa — raqam o‘rnida ismning birinchi harfi; surat bo‘lmasa — ramkada yonib turgan sham ═════════════ */
const HERO = {
  m: {
    W: 390,
    H: 844,
    num: [0, 10, 390, 248, 200] as const,
    numMax: 368,
    photo: [65, 250, 260, 350, 28] as const,
    conf: [
      [-30, 22.78, 220, 134.444, 0],
      [220, 78.89, 200, 122.222, 1],
    ] as const,
    text: [195, 390] as const,
    name: [628, 72, 56] as const,
    sub: [706, 20, 15, 1] as const,
    date: [744, 20, 16] as const,
    max: 366,
  },
  l: {
    W: 1440,
    H: 900,
    num: [80, 160, 640, 372, 300] as const,
    numMax: 620,
    photo: [800, 110, 520, 680, 32] as const,
    conf: [
      [90, 11.67, 420, 256.667, 0],
      [930, 651.67, 420, 256.667, 1],
    ] as const,
    text: [400, 640] as const,
    name: [540, 92, 72] as const,
    sub: [640, 23, 17, 0] as const,
    date: [684, 25, 20] as const,
    max: 620,
  },
} as const;

function Hero({ d, wide, still }: { d: D; wide: boolean; still: boolean }) {
  const t = useT();
  const G = wide ? HERO.l : HERO.m;
  const { W, H } = G;
  const pageU = wide ? CANVAS_L : COL_M;
  const X = (x: number) => `calc(50% + ${U(x - W / 2)})`;
  const Y = (y: number) => `calc(100% - ${U(H - y)})`;
  const [nx, ny, nw, nh, nf] = G.num;
  const [px, py, pw, ph, pr] = G.photo;
  const [tc, tw] = G.text;
  const [nT, nH, nF] = G.name;
  const [sT, sH, sF, sLs] = G.sub;
  const [dT, dH, dF] = G.date;
  const sub = t("tug‘ilgan kun kechasiga taklif");
  return (
    <div className={cx(st.hero, still && st.heroStill)} style={vars(still ? { "--u": pageU, height: U(H) } : { "--u": `min(${pageU}, calc(100svh / ${H}))` })}>
      <div aria-hidden className={st.hBg} />
      {G.conf.map(([x, y, w, h, f], i) => (
        <div key={i} aria-hidden className={cx(st.art, st.hConf)} style={{ left: X(x), top: Y(y), width: U(w), height: U(h) }}>
          <Img src={`${P}/konfetti.svg`} eager className={f ? st.flip : undefined} />
        </div>
      ))}
      {d.big && (
        <p className={cx(st.ub, st.hNum, "absolute text-center")} style={{ left: X(nx), top: Y(ny), width: U(nw), height: U(nh), lineHeight: `${U(nh)}`, whiteSpace: "nowrap" }}>
          <Fit base={nf} max={d.age ? G.numMax : nw} deps={d.big} className={st.gold}>
            {d.big}
          </Fit>
        </p>
      )}
      <div className={st.hPhoto} style={{ left: X(px), top: Y(py), width: U(pw), height: U(ph), borderRadius: U(pr), boxShadow: `0 ${U(14)} ${U(wide ? 36 : 30)} rgba(13,15,26,.2)` }}>
        {d.portrait ? (
          <Img src={d.portrait} eager className={st.hImg} style={{ objectPosition: "50% 30%" }} />
        ) : (
          // surat yo‘q — ramkada tungi fon, nur va yonib turgan sham (ochilishdagidek)
          <div className={st.hNoPhoto}>
            <Glow box={[pw * 0.5 - pw * 0.55, ph * 0.3 + pw * 0.57 * WICK - pw * 0.55, pw * 1.1, pw * 1.1]} unit={U} className={st.breath} />
            <Candle box={[pw * 0.31, ph * 0.3, pw * 0.38, pw * 0.57]} unit={U} k={2} eager />
          </div>
        )}
      </div>
      {/* ism (2 qatorga bo‘linsa — yuqoriga, surat/raqam tomonga o‘sadi: sana pastdagi chok konfettisiga tushmaydi), taklif turi va sana */}
      <div className="absolute" style={{ left: X(tc - tw / 2), bottom: U(H - (d.dots ? dT + dH : sT + sH)), width: U(tw) }}>
        {d.a && (
          <h1 className={cx(st.lora, "relative text-center")} style={{ color: "var(--night)" }}>
            <NameLines text={d.a} base={nF} max={G.max} lh={nH} two={nF * 0.62} twoLh={nH * 0.62} letters={still ? undefined : [0.36, 0.72]} />
          </h1>
        )}
        <p className={cx(st.ms, st.hSub, "relative text-center")} style={{ marginTop: U(d.a ? sT - nT - nH : 0), height: U(sH), fontSize: U(sF), lineHeight: `${U(sH)}`, color: "var(--mute)", whiteSpace: "nowrap" }}>
          <Fit base={sF} max={G.max} deps={sub}>
            <span style={{ letterSpacing: `${+(sLs / sF).toFixed(4)}em` }}>{sub}</span>
          </Fit>
        </p>
        {d.dots && (
          <p className={cx(st.ub, st.hSub, st.hDate, "relative text-center")} style={{ marginTop: U(dT - sT - sH), height: U(dH), fontSize: U(dF), lineHeight: `${U(dH)}`, color: "var(--gold)", whiteSpace: "nowrap" }}>
            {d.dots}
          </p>
        )}
      </div>
    </div>
  );
}

/* ═════════════ Bo‘lim qobig‘i ═════════════ */
type Bg = "cream" | "sand" | "night";

/** Bo‘lim: to‘liq enli fon + markazda kontent ustuni (mobil 390 birlik; laptopda × 1.45). `outer` — ustundan tashqaridagi bezaklar */
function Sec({ children, z, bg, colStyle, id, outer, className }: { children: ReactNode; z: number; bg: Bg; colStyle?: CSSProperties; id?: string; outer?: ReactNode; className?: string }) {
  return (
    <section id={id} className={cx(st.sec, st[bg], className)} style={{ zIndex: z }}>
      {outer}
      <div className={st.col} style={{ width: U(390), ...colStyle }}>
        {children}
      </div>
    </section>
  );
}

/**
 * Chok ustidagi konfetti (Figma «Konfetti · chok ustida»): mobil — ustun birligida, laptop — kanvas birligida; sekin parallaks.
 * `lift` — Figma’da bo‘laklar sarlavha ustiga tushgan joyda (04/05 — «Kecha dasturi») konfetti yuqoriroq: matn ochiq qoladi.
 */
function Seam({ wide, flip, lift = 0 }: { wide: boolean; flip?: boolean; lift?: number }) {
  return wide ? (
    <Confetti box={[490, -140.556 - lift * 1.6, 460, 281.111]} unit={C} flip={flip} className={st.seam} px />
  ) : (
    <Confetti box={[45, -91.667 - lift, 300, 183.333]} left={(x) => `calc(50% + ${U(x - 195)})`} unit={U} flip={flip} className={st.seam} px />
  );
}

/** Laptop yon konfettisi (1440 kanvas): chap — Figma holatida, o‘ng — ko‘zgu */
function SideConfetti({ wide, x, y, w, h }: { wide: boolean; x: number; y: number; w: number; h: number }) {
  if (!wide) return null;
  return (
    <div aria-hidden className={st.deco}>
      <Confetti box={[x, y, w, h]} unit={C} d={0.1} />
      <Confetti box={[1440 - x - w, y, w, h]} unit={C} flip d={0.2} />
    </div>
  );
}

/** Laptop yon shamlari (yonib turadi, olov tebranadi) va ular ortidagi nur */
function SideCandles({ wide, glowY, x, y, w, h }: { wide: boolean; glowY: number; x: number; y: number; w: number; h: number }) {
  if (!wide) return null;
  return (
    <div aria-hidden className={st.deco}>
      <div data-a="light" className={st.deco} style={vars({ "--d": "0.1s" })}>
        <Glow box={[93, glowY, 280, 280]} unit={C} className={st.breath} />
        <Glow box={[1067, glowY, 280, 280]} unit={C} className={st.breath} style={{ animationDelay: "-2s" }} />
      </div>
      <div data-a="rise" className={st.deco} style={vars({ "--d": "0.15s" })}>
        <Candle box={[x, y, w, h]} unit={C} k={1} />
        <Candle box={[1440 - x - w, y, w, h]} unit={C} k={4} />
      </div>
    </div>
  );
}

/** Sarlavha (Unbounded, markazda, 360 da sig‘adi) */
function Title({ text, fs, h, color = "var(--night)", d = 0, style }: { text: string; fs: number; h: number; color?: string; d?: number; style?: CSSProperties }) {
  return (
    <p data-a="up" className={cx(st.ub, "text-center")} style={vars({ height: U(h), fontSize: U(fs), lineHeight: `${U(h)}`, color, whiteSpace: "nowrap", "--d": `${d}s`, ...(style as Record<string, string>) })}>
      <Fit base={fs} max={366} deps={text}>
        {text}
      </Fit>
    </p>
  );
}

/* ═════════════ 02 · Taklif — murojaat (mehmon ismi bilan), matn, «Hurmat bilan,» va imzo ═════════════ */
function Taklif({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const hello = d.guest ? guestHello(t, "Hurmatli {guest}!", d.guest) : t("Aziz do‘stlar!");
  return (
    <Sec
      z={z}
      bg="night"
      colStyle={{ paddingTop: U(110), paddingBottom: U(144) }}
      outer={
        <>
          <Seam wide={wide} />
          <SideCandles wide={wide} glowY={249.5} x={188} y={382} w={90} h={135} />
        </>
      }
    >
      <div data-a="up" className={cx(st.ub, "relative text-center")} style={vars({ color: "var(--cream)", "--d": "0.05s" })}>
        <NameLines text={hello} base={28} max={350} lh={35} two={22} twoLh={30} />
      </div>
      <p
        data-a="up"
        className={cx(st.ms, "relative mx-auto text-center")}
        style={vars({ marginTop: U(31), width: U(318), minHeight: U(112), fontSize: U(17), lineHeight: `${U(28)}`, color: "rgba(251,247,240,.88)", overflowWrap: "anywhere", whiteSpace: "pre-line", "--d": "0.12s" })}
      >
        {d.message}
      </p>
      <span data-a="rule" className={cx(st.rule, "relative mx-auto block")} style={vars({ marginTop: U(80), width: U(40), height: U(1), "--d": "0.2s" })} />
      {d.signer && (
        <>
          <p data-a="up" className={cx(st.lora, "relative text-center")} style={vars({ marginTop: U(23), height: U(23), fontSize: U(18), lineHeight: `${U(23)}`, color: "rgba(227,200,145,.8)", "--d": "0.26s" })}>
            {t("Hurmat bilan,")}
          </p>
          <div data-a="up" className={cx(st.lora, "relative text-center")} style={vars({ marginTop: U(5), color: "var(--goldL)", "--d": "0.34s" })}>
            <NameLines text={d.signer} base={44} max={350} lh={56} two={34} twoLh={44} />
          </div>
        </>
      )}
    </Sec>
  );
}

/* ═════════════ 03 · Tort — kvadrat surat (mijozning 2-surati; bo‘lmasa — shablonning tort surati), ikki qator kursiv va izoh ═════════════ */
function Tort({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  return (
    <Sec z={z} bg="cream" colStyle={{ paddingTop: U(72), paddingBottom: U(122) }} outer={<SideConfetti wide={wide} x={73} y={409.722} w={320} h={195.556} />}>
      <div data-a="zoom" className="relative mx-auto overflow-hidden" style={{ width: U(326), height: U(326), borderRadius: U(28), background: "#1b2a40" }}>
        <Img src={d.cake} className={st.zoomImg} />
      </div>
      <div className="relative" style={{ marginTop: U(34) }}>
        <p data-a="up" className={cx(st.lora, "text-center")} style={vars({ height: U(33), fontSize: U(26), lineHeight: `${U(33)}`, color: "var(--night)", whiteSpace: "nowrap", "--d": "0.1s" })}>
          <Fit base={26} max={366} deps={t("Yillar — xotira,")}>
            {t("Yillar — xotira,")}
          </Fit>
        </p>
        <p data-a="up" className={cx(st.lora, "text-center")} style={vars({ marginTop: U(3), height: U(33), fontSize: U(26), lineHeight: `${U(33)}`, color: "var(--gold)", whiteSpace: "nowrap", "--d": "0.2s" })}>
          <Fit base={26} max={366} deps={t("do‘stlar — boylik.")}>
            {t("do‘stlar — boylik.")}
          </Fit>
        </p>
      </div>
      <p data-a="up" className={cx(st.ms, "relative mx-auto text-center")} style={vars({ marginTop: U(29), width: U(300), minHeight: U(48), fontSize: U(16), lineHeight: `${U(24)}`, color: "var(--mute)", "--d": "0.3s" })}>
        {t("Har bir sham — bitta orzu. Uni birga tilaylik.")}
      </p>
    </Sec>
  );
}

/* ═════════════ 04 · Sana va taymer — katta kun (oltin gradient), oy · hafta kuni · vaqt, 4 ta taymer kartasi ═════════════ */
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
    <Sec z={z} bg="sand" colStyle={{ height: U(640) }} outer={<SideConfetti wide={wide} x={83} y={279.533} w={300} h={183.333} />}>
      <div className="absolute inset-x-0" style={{ top: U(56) }}>
        <Title text={t("Bayram kuni")} fs={24} h={30} />
      </div>
      <p data-a="draw" className={cx(st.ub, st.bigDay, "absolute inset-x-0 text-center")} style={vars({ top: U(96), height: U(160), fontSize: U(140), lineHeight: `${U(160)}`, "--d": "0.1s" })}>
        <span className={st.gold}>{d.day}</span>
      </p>
      <p data-a="up" className={cx(st.lora, "absolute inset-x-0 text-center")} style={vars({ top: U(272), height: U(28), fontSize: U(22), lineHeight: `${U(28)}`, color: "var(--night)", whiteSpace: "nowrap", "--d": "0.2s" })}>
        <Fit base={22} max={366} deps={d.monthLine}>
          {d.monthLine}
        </Fit>
      </p>
      <div ref={ref}>
        {vals.map((v, i) => (
          <div key={i} data-a="flip" className={cx(st.tbox, "absolute")} style={vars({ left: U(27 + i * 87), top: U(340), width: U(75), height: U(96), borderRadius: U(18), "--d": `${0.1 + i * 0.1}s` })}>
            <p className={cx(st.ub, "absolute inset-x-0 text-center")} style={{ top: U(20), height: U(27), fontSize: U(22), lineHeight: `${U(27)}`, color: "var(--goldL)", whiteSpace: "nowrap" }}>
              <Fit base={22} max={68} deps={String(vals[0]).length}>
                <Digits value={v} run={inView} len={i === 0 ? Math.max(2, String(vals[0]).length) : 2} i={i} />
              </Fit>
            </p>
            <p className={cx(st.ms, "absolute inset-x-0 text-center")} style={{ top: U(60), height: U(18), fontSize: U(13), lineHeight: `${U(18)}`, color: "rgba(251,247,240,.75)", whiteSpace: "nowrap" }}>
              <Fit base={13} max={70} deps={units[i]}>
                {units[i]}
              </Fit>
            </p>
          </div>
        ))}
      </div>
      <p data-a="up" className={cx(st.lora, "absolute inset-x-0 text-center")} style={vars({ top: U(462), height: U(23), fontSize: U(18), lineHeight: `${U(23)}`, color: "var(--mute)", whiteSpace: "nowrap", "--d": "0.3s" })}>
        <Fit base={18} max={366} deps={t("bayramgacha qoldi")}>
          {t("bayramgacha qoldi")}
        </Fit>
      </p>
      <Confetti box={[65, 480.556, 260, 158.889]} unit={U} d={0.35} />
    </Sec>
  );
}

/* ═════════════ 05 · Kecha dasturi — tungi fon, vaqt (oltin) | nom va izoh, oltin chiziqlar; qatorlar navbat bilan ═════════════ */
function Program({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const items = d.program.slice(0, 8);
  if (!items.length) return null;
  return (
    <Sec
      z={z}
      bg="night"
      colStyle={{ paddingTop: U(56), paddingBottom: U(98) }}
      outer={
        <>
          <Seam wide={wide} flip lift={40} />
          <SideCandles wide={wide} glowY={351} x={183} y={476} w={100} h={150} />
        </>
      }
    >
      <Title text={t("Kecha dasturi")} fs={26} h={32} color="var(--cream)" />
      <div style={{ marginTop: U(60) }}>
        {items.map((it, i) => (
          <div key={i}>
            {i > 0 && <span data-a="rule" className={cx(st.ruleSoft, "block")} style={vars({ marginLeft: U(32), width: U(326), height: U(1), marginBottom: U(45), "--d": "0.05s" })} />}
            <div className="relative" style={{ minHeight: U(94), paddingLeft: U(150), paddingRight: U(32), paddingBottom: U(22) }}>
              <p data-a="right" className={cx(st.ub, "absolute")} style={vars({ left: U(32), top: U(2), width: U(118), height: U(27), fontSize: U(22), lineHeight: `${U(27)}`, color: "var(--goldL)", whiteSpace: "nowrap", "--d": "0.08s" })}>
                <Fit base={22} max={112} deps={it.time}>
                  {it.time}
                </Fit>
              </p>
              <p data-a="right" className={cx(st.msM, st.clamp2)} style={vars({ fontSize: U(18), lineHeight: `${U(25)}`, color: "var(--cream)", "--d": "0.16s" })}>
                {it.title}
              </p>
              {it.note?.trim() && (
                <p data-a="right" className={cx(st.ms, st.clamp2)} style={vars({ marginTop: U(3), fontSize: U(15), lineHeight: `${U(21)}`, color: "rgba(251,247,240,.7)", "--d": "0.24s" })}>
                  {it.note}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Sec>
  );
}

/* ═════════════ 06 · Manzil — surat (mijozning 3-surati; bo‘lmasa — terrassa), joy nomi, manzil, xarita tugmasi ═════════════ */
function Venue({ d, z, wide, linkable }: { d: D; z: number; wide: boolean; linkable: boolean }) {
  const t = useT();
  if (!d.hasPlace) return null;
  return (
    <Sec z={z} bg="cream" colStyle={{ paddingTop: U(56), paddingBottom: U(88) }} outer={<SideConfetti wide={wide} x={83} y={338.983} w={300} h={183.333} />}>
      <Title text={t("Manzil")} fs={26} h={32} />
      <div data-a="zoom" className="relative mx-auto overflow-hidden" style={vars({ marginTop: U(32), width: U(326), height: U(226), borderRadius: U(24), background: "#2a3150", "--d": "0.1s" })}>
        <Img src={d.hall} className={st.zoomImg} />
      </div>
      {d.venueTitle && (
        <p data-a="up" className={cx(st.ub, "mx-auto text-center")} style={vars({ marginTop: U(34), width: U(350), minHeight: U(25), fontSize: U(20), lineHeight: `${U(25)}`, color: "var(--night)", overflowWrap: "anywhere", "--d": "0.15s" })}>
          {d.venueTitle}
        </p>
      )}
      {d.address && (
        <p data-a="up" className={cx(st.ms, "mx-auto text-center")} style={vars({ marginTop: U(15), width: U(300), minHeight: U(48), fontSize: U(16), lineHeight: `${U(24)}`, color: "var(--mute)", overflowWrap: "anywhere", "--d": "0.22s" })}>
          {d.address}
        </p>
      )}
      <div data-a="up" className="flex justify-center" style={vars({ marginTop: U(52), "--d": "0.3s" })}>
        <a
          href={linkable ? d.mapUrl : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(st.msM, st.btn)}
          style={{ minWidth: U(200), height: U(52), padding: `0 ${U(26)}`, fontSize: U(16), borderRadius: U(26) }}
        >
          {t("Xaritada ochish")}
        </a>
      </div>
    </Sec>
  );
}

/* ═════════════ 07 · Dress-kod (ixtiyoriy — o‘chirilsa joy qolmaydi) ═════════════ */
function Dress({ d, z }: { d: D; z: number }) {
  const t = useT();
  if (!d.dressNote && !d.dressCode) return null;
  return (
    <Sec z={z} bg="cream" colStyle={{ paddingTop: U(110), paddingBottom: U(100) }}>
      <Confetti box={[115, 11.111, 160, 97.778]} unit={U} />
      <Title text={t("Dress-kod")} fs={26} h={33} d={0.08} />
      {d.dressCode && (
        <p data-a="up" className={cx(st.lora, "text-center")} style={vars({ marginTop: U(13), height: U(31), fontSize: U(24), lineHeight: `${U(31)}`, color: "var(--gold)", whiteSpace: "nowrap", "--d": "0.16s" })}>
          <Fit base={24} max={360} deps={d.dressCode}>
            {d.dressCode}
          </Fit>
        </p>
      )}
      {d.dressNote && (
        <p data-a="up" className={cx(st.ms, "mx-auto text-center")} style={vars({ marginTop: U(19), width: U(300), minHeight: U(54), fontSize: U(17), lineHeight: `${U(27)}`, color: "var(--mute)", overflowWrap: "anywhere", "--d": "0.24s" })}>
          {d.dressNote}
        </p>
      )}
    </Sec>
  );
}

/* ═════════════ 08 · Anketa — javob (qum fon, sut rangli karta) ═════════════ */
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
  // tilak maydoni ichida o‘sadi (maydon balandligi o‘zgarmaydi)
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
    <p className={cx(st.msM, st.lbl)} style={{ height: U(18), fontSize: U(13), lineHeight: `${U(18)}` }}>
      {s}
    </p>
  );
  const sub = d.rsvpUntil
    ? t(d.we ? "Javobingizni {date} kutamiz" : "Javobingizni {date} kutaman", { date: d.rsvpUntil })
    : t(d.we ? "Javobingizni kutamiz" : "Javobingizni kutaman");
  return (
    <Sec z={z} bg="sand" id="sham-javob" colStyle={{ paddingTop: U(56), paddingBottom: U(70) }} outer={<SideConfetti wide={wide} x={73} y={438.722} w={320} h={195.556} />}>
      <Title text={t("Kelasizmi?")} fs={30} h={37} />
      <p
        data-a="up"
        className={cx(st.ms, "mx-auto text-center")}
        style={vars({ marginTop: U(15), width: U(366), minHeight: U(20), fontSize: U(15), lineHeight: `${U(20)}`, color: "var(--mute)", overflowWrap: "anywhere", "--d": "0.12s" })}
      >
        {sub}
      </p>
      <div
        data-a="rise"
        className={cx(st.card, "relative mx-auto overflow-hidden")}
        style={vars({ marginTop: U(32), width: U(334), padding: `${U(32)} ${U(30)} ${U(50)}`, borderRadius: U(28), boxShadow: `0 ${U(12)} ${U(30)} rgba(13,15,26,.12)`, "--d": "0.2s" })}
      >
        {sent ? (
          <div key="thanks" className={cx(st.thanks, "relative flex flex-col items-center text-center")} style={{ padding: `${U(60)} ${U(6)} ${U(10)}`, gap: U(16), minHeight: U(428) }}>
            <p className={st.ub} style={{ fontSize: U(sent === "not_coming" ? 26 : 22), lineHeight: 1.3, color: "var(--night)", overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Rahmat!") : t("Rahmat! Joyingiz band qilindi")}
            </p>
            <p className={st.ms} style={{ fontSize: U(16), color: "var(--mute)", lineHeight: 1.55, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Javobingiz uchun rahmat!") : t("{name} — {count} kishi. Javobingiz yetkazildi.", { name: name.trim() || t("Javobingiz"), count })}
            </p>
            <button type="button" onClick={() => setSent(null)} className={st.msM} style={{ fontSize: U(15), color: "var(--gold)", textDecoration: "underline", textUnderlineOffset: 3 }}>
              {t("Javobni o‘zgartirish")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="relative flex flex-col items-stretch">
            {label(t("Ismingiz"))}
            <label className={st.field} style={{ marginTop: U(6), height: U(50), padding: `0 ${U(18)}`, borderRadius: U(14) }}>
              <input
                className={cx(st.ms, st.input)}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder={t("Ism va familiya")}
                aria-label={t("Ismingiz")}
                style={{ fontSize: U(16) }}
              />
            </label>
            <div className="flex w-full" role="radiogroup" aria-label={t("Kelasizmi?")} style={{ marginTop: U(20), gap: U(8) }}>
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
                  className={cx(st.msM, st.choice)}
                  style={{ padding: `${U(6)} ${U(6)}`, minHeight: U(48), fontSize: U(15), borderWidth: U(1), borderRadius: U(24) }}
                >
                  <span style={{ overflowWrap: "anywhere" }}>{t(l)}</span>
                </button>
              ))}
            </div>
            {status === "coming" && (
              <div className="flex w-full items-center" style={{ marginTop: U(20), gap: U(8), minHeight: U(36) }}>
                <p className={st.ms} style={{ flex: "1 1 0", minWidth: 0, fontSize: U(15), lineHeight: 1.3, color: "var(--night)" }}>
                  {t("Necha kishi bo‘lasiz?")}
                </p>
                <button
                  type="button"
                  className={cx(st.msM, st.step)}
                  disabled={count <= 1}
                  onClick={() => setCount((c) => Math.max(1, c - 1))}
                  aria-label={t("Kamaytirish")}
                  style={{ width: U(32), height: U(36), fontSize: U(18), borderRadius: U(12) }}
                >
                  −
                </button>
                <span className={st.msM} style={{ width: U(32), textAlign: "center", fontSize: U(18), lineHeight: 1.4, color: "var(--night)" }} aria-live="polite">
                  {count}
                </span>
                <button
                  type="button"
                  className={cx(st.msM, st.step)}
                  disabled={count >= 20}
                  onClick={() => setCount((c) => Math.min(20, c + 1))}
                  aria-label={t("Ko‘paytirish")}
                  style={{ width: U(32), height: U(36), fontSize: U(18), borderRadius: U(12) }}
                >
                  +
                </button>
              </div>
            )}
            <div style={{ marginTop: U(20) }}>{label(t("Tilaklaringiz"))}</div>
            <label className={st.field} style={{ marginTop: U(6), height: U(104), padding: `${U(16)} ${U(18)}`, borderRadius: U(14), justifyContent: "flex-start", alignItems: "flex-start" }}>
              <textarea
                ref={wishRef}
                rows={1}
                className={cx(st.ms, st.input)}
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                maxLength={500}
                placeholder={t("Tabrik va tilaklar…")}
                aria-label={t("Tilaklaringiz")}
                style={{ fontSize: U(16) }}
              />
            </label>
            {err && (
              <p className={st.ms} style={{ marginTop: U(12), color: "#a8432a", fontSize: U(14) }}>
                {err}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className={cx(st.msM, st.submit)}
              style={{ marginTop: U(26), minHeight: U(56), padding: `${U(12)} ${U(12)}`, fontSize: U(16), borderRadius: U(28), opacity: busy ? 0.7 : 1 }}
            >
              {busy ? t("Yuborilmoqda…") : t("Javobni yuborish")}
            </button>
          </form>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 09 · Final — shamlar birin-ketin yonadi, nur kuchayadi, konfetti yana yog‘iladi
 * (scroll bilan: --fc 0 … 1 = Figma kadri; sahifa oxirigacha albatta tugaydi) ═════════════ */
const FIN = {
  m: {
    W: 390,
    H: 844,
    glow: [-5, 100, 400, 400] as Box4,
    candles: [
      [60, 225, 100, 150],
      [133, 179, 124, 186],
      [230, 225, 100, 150],
    ] as Box4[],
    conf: [
      [-20, 42.78, 220, 134.444, 0],
      [200, 58.89, 200, 122.222, 1],
    ] as const,
    title: [470, 40, 32] as const,
    text: [45, 524, 300, 26, 20] as const,
    rule: [175, 580, 40] as const,
    name: [600, 61, 48] as const,
    date: [676, 18, 13, 4] as const,
    max: 366,
  },
  l: {
    W: 1440,
    H: 900,
    glow: [400, -20, 640, 640] as Box4,
    candles: [
      [465, 217.5, 110, 165],
      [555, 182.5, 130, 195],
      [645, 147.5, 150, 225],
      [755, 182.5, 130, 195],
      [865, 217.5, 110, 165],
    ] as Box4[],
    conf: [
      [120, 11.67, 420, 256.667, 0],
      [900, 11.67, 420, 256.667, 1],
    ] as const,
    title: [520, 64, 52] as const,
    text: [420, 600, 600, 36, 28] as const,
    rule: [690, 670, 60] as const,
    name: [690, 82, 64] as const,
    date: [790, 20, 15, 5] as const,
    max: 1200,
  },
} as const;
function Final({ d, z, wide, still, onSeen }: { d: D; z: number; wide: boolean; still: boolean; onSeen: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const sec = useRef<HTMLElement>(null);
  const G = wide ? FIN.l : FIN.m;
  const onP = useCallback(
    (_p: number, r: DOMRect) => {
      const el = ref.current;
      if (!el) return;
      const vh = window.innerHeight || 800;
      // sahna ekranning 80% iga kirganda boshlanadi va 0.6 ekran skrollda tugaydi — sahifa oxiri undan oldin kelsa, oxirida tugaydi
      const y = window.scrollY;
      const top = r.top + y;
      const max = document.documentElement.scrollHeight - vh;
      const s0 = Math.min(top - vh * 0.8, max - 1);
      const s1 = Math.max(s0 + 1, Math.min(s0 + vh * 0.6, max));
      const f = seg(y, s0, s1);
      el.style.setProperty("--fc", f.toFixed(4));
      if (f > 0.5) onSeen();
    },
    [onSeen],
  );
  useScrollProgress(sec, onP, !still);
  const { W, H } = G;
  const title = t(d.we ? "Sizni kutamiz!" : "Sizni kutaman!");
  const [tx, ty, tw, th, tfs] = G.text;
  const [rx, ry, rw] = G.rule;
  const n = G.candles.length;
  return (
    <section ref={sec} className={cx(st.sec, st.fin)} style={vars({ zIndex: z, "--u": wide ? CANVAS_L : COL_M })}>
      <div className="relative mx-auto" style={{ width: U(W), height: 0 }}>
        {/* chok ustidagi konfetti (08/09) — oldingi bo‘lim pastiga kiradi */}
        <Confetti box={wide ? [490, -140.556, 460, 281.111] : [45, -91.667, 300, 183.333]} unit={U} className={st.seam} px />
      </div>
      <div ref={ref} className={cx(st.finalWrap, "relative mx-auto")} style={vars({ width: U(W), height: U(H), ...(still ? { "--fc": 1 } : {}) })}>
        <Glow box={G.glow} unit={U} className={st.fGlow} />
        {G.candles.map((b, i) => (
          <Candle key={i} box={b} unit={U} k={i} flameClass={st.fFlame} style={vars({ "--t0": +(0.08 + (i * 0.48) / Math.max(1, n - 1)).toFixed(3) })} />
        ))}
        {G.conf.map(([x, y, w, h, f], i) => (
          <div key={i} aria-hidden className={cx(st.art, st.fConf)} style={vars({ left: U(x), top: U(y), width: U(w), height: U(h), "--cd0": i ? 0.62 : 0.55 })}>
            <Img src={`${P}/konfetti.svg`} className={f ? st.flip : undefined} />
          </div>
        ))}
        <h2 data-a="up" className={cx(st.ub, "absolute inset-x-0 text-center")} style={vars({ top: U(G.title[0]), height: U(G.title[1]), fontSize: U(G.title[2]), lineHeight: `${U(G.title[1])}`, color: "var(--cream)", whiteSpace: "nowrap", "--d": "0.1s" })}>
          <Fit base={G.title[2]} max={G.max} deps={title}>
            {title}
          </Fit>
        </h2>
        <div data-a="up" className={cx(st.lora, "absolute text-center")} style={vars({ left: U(tx), top: U(ty), width: U(tw), color: "var(--goldL)", "--d": "0.2s" })}>
          <NameLines text={t("Shamlarni birga puflaymiz.")} base={tfs} max={tw} lh={th} two={tfs * 0.9} twoLh={th * 0.9} />
        </div>
        <span data-a="rule" className={cx(st.rule, "absolute")} style={vars({ left: U(rx), top: U(ry), width: U(rw), height: U(1), "--d": "0.28s" })} />
        <div className="absolute inset-x-0" style={{ top: U(G.name[0]) }}>
          {d.a && (
            <div data-a="up" className={cx(st.lora, "relative text-center")} style={vars({ color: "var(--goldL)", "--d": "0.34s" })}>
              <NameLines text={d.a} base={G.name[2]} max={G.max} lh={G.name[1]} two={G.name[2] * 0.75} twoLh={G.name[1] * 0.75} />
            </div>
          )}
          {d.dotsTime && (
            <p
              data-a="up"
              className={cx(st.msM, "text-center")}
              style={vars({
                marginTop: U(d.a ? G.date[0] - G.name[0] - G.name[1] : 0),
                height: U(G.date[1]),
                fontSize: U(G.date[2]),
                lineHeight: `${U(G.date[1])}`,
                color: "rgba(251,247,240,.75)",
                whiteSpace: "nowrap",
                "--d": "0.42s",
              })}
            >
              <Fit base={G.date[2]} max={G.max} deps={d.dotsTime}>
                <span style={{ letterSpacing: `${+(G.date[3] / G.date[2]).toFixed(4)}em`, paddingLeft: `${+(G.date[3] / G.date[2]).toFixed(4)}em` }}>{d.dotsTime}</span>
              </Fit>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ═════════════ Musiqa tugmasi — Figma «Sham / Musiqa tugmasi»: tungi doira, oltin halqa, 3 oltin chiziq ritmda; o‘chirilgan — xira, terrakota qiya chiziq ═════════════ */
const BARS: [number, number, number][] = [
  [18, 20, 12],
  [24, 16, 20],
  [30, 19, 14],
];
function ShamMusic({ m, wide, embedded }: { m: ReturnType<typeof useMusic>; wide: boolean; embedded: boolean }) {
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
        <circle cx="26" cy="26" r="25.5" fill="#1B2030" stroke="#C9A46A" />
        {BARS.map(([x, y, h], i) => (
          <rect key={i} x={x} y={y} width={3} height={h} rx={1.5} className={st.bar} style={vars({ "--i": i })} />
        ))}
        <path d="M16 36L36 16" className={st.strike} />
      </svg>
    </button>
  );
  return embedded ? <div style={{ position: "sticky", top: 0, height: 0, zIndex: 70 }}>{btn}</div> : btn;
}

/* ═════════════ Sahifa ═════════════ */
type Key = "taklif" | "tort" | "sana" | "program" | "venue" | "dress" | "rsvp" | "final";

export function ShamSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const loaded = usePreload(
    [`${P}/sham.webp`, `${P}/olov.webp`, `${P}/konfetti.svg`, d.portrait].filter(Boolean) as string[],
    [d.cake, d.hall].filter(Boolean) as string[],
    withGate,
    wide ? "l" : "m",
  );
  useReveal(root, loaded, embedded);
  useParallax(root, loaded && !embedded);
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

  const shown: Key[] = (["taklif", "tort", "sana", "program", "venue", "dress", "rsvp", "final"] as Key[]).filter((k) =>
    k === "sana" ? d.hasDate : k === "program" ? d.program.length > 0 : k === "venue" ? d.hasPlace : k === "dress" ? !!(d.dressNote || d.dressCode) : k === "rsvp" ? data.rsvpEnabled : true,
  );
  const z = (k: Key) => 6 + shown.indexOf(k);
  const linkable = mode !== "preview";
  const colU = wide ? COL_L : COL_M;
  const fu = (n: number) => (wide ? C(n) : U(n));

  return (
    <div ref={root} className={st.root}>
      <div className={st.page} style={vars({ "--u": colU })}>
        <ShamMusic m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/muhr.webp`} />}
        <div className={cx(st.flow, st.opening)} style={embedded ? vars({ "--o": 1 }) : undefined}>
          {withGate && (loaded ? <Gate d={d} wide={wide} onStart={() => music.play(true)} /> : <div className={st.gateHold} />)}
          {embedded && <Gate d={d} wide={wide} still onStart={() => {}} />}
          <div className={cx(st.openWrap, embedded && st.openStill)} style={{ zIndex: 5 }}>
            <Hero d={d} wide={wide} still={embedded} />
            {withGate && <div className={st.openSpacer} />}
          </div>
          <Taklif d={d} z={z("taklif")} wide={wide} />
          <Tort d={d} z={z("tort")} wide={wide} />
          <Sana d={d} z={z("sana")} wide={wide} />
          <Program d={d} z={z("program")} wide={wide} />
          <Venue d={d} z={z("venue")} wide={wide} linkable={linkable} />
          <Dress d={d} z={z("dress")} />
          {data.rsvpEnabled && <Rsvp d={d} slug={data.slug} mode={mode} z={z("rsvp")} wide={wide} />}
          <Final d={d} z={z("final")} wide={wide} still={embedded} onSeen={onFinal} />
        </div>
        <footer className={cx(st.footer, "flex items-start justify-center")} style={{ height: fu(120), paddingTop: fu(50) }}>
          <p className={cx(st.ms, "text-center")} style={{ fontSize: fu(13), lineHeight: 18 / 13, color: "rgba(251,247,240,.6)" }}>
            <a href="https://shohnoma.uz">Shohnoma</a> · {t("elektron taklifnomalar")}
          </p>
        </footer>
      </div>
    </div>
  );
}
