"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { splitDate, tashkentDate } from "@/lib/display";
import { musicSrc } from "@/lib/music";
import { tr, useLocale, useT, type Locale } from "@/lib/i18n";
import type { InvitationSiteProps } from "@/components/invitation/types";
import { fetchSavedAnswer, loadSavedRsvp, rsvpUrl, saveRsvp, type RsvpStatus } from "@/components/invitation/Rsvp";
import { useGuestName } from "../shared/guest";
import { timerUnits } from "@/components/invitation/data";
import { useCountdown, useCountUp, useInView, useScrollProgress, useWide } from "../shared/hooks";
import { Loader, usePreload, useMusic } from "../shared/runtime";
import { MONTHS_EN, MONTHS_LOWER, MONTHS_RU_GEN, calendarWords, untilPhrase, type ProgramItem } from "../anor/data";
import { DEFAULT_MESSAGE, DEFAULT_QUOTE, DRESS_TEXT, ERTAK_DEMO, ERTAK_DEMO_EN, ERTAK_DEMO_RU, ICONS, P, iconFor } from "./data";
import st from "./ertak.module.css";

/* ── Birliklar ──
 * U — joriy `--u` (bo‘limlarda — kontent ustuni: Figma mobil 390 koordinatalari; laptopda ustun = mobil × 1.45, ya’ni 565.5px / 1440).
 * C — laptop kanvasi (1440) birligi: yon bezaklar (fonuslar, bulutlar, quyoshlar, yulduzlar, bayroqchalar) shu koordinatalarda.
 * Ochilish (kitob), hero va final — o‘z kanvasi (mobil 390×844, laptop 1440×900); ochilish va hero sahnasi bir ekranga sig‘adi
 * va pastki chetga bog‘lanadi. Kitob laptopda — mobil × 1.12 (Figma «Kitob (mobil ×1.12)»): B — kitob birligi. */
const U = (n: number) => `calc(var(--u) * ${+n.toFixed(3)})`;
const B = (n: number) => `calc(var(--bu) * ${+n.toFixed(3)})`;
const C = (n: number) => `calc(100cqw / 1440 * ${+n.toFixed(3)})`;
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const vars = (o: Record<string, string | number | undefined>) => o as CSSProperties;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const COL_M = "calc(100cqw / 390)";
const COL_L = "calc(100cqw / 1440 * 1.45)";
const CANVAS_L = "calc(100cqw / 1440)";

/** Vektor bezaklarning soya chegarasi (Figma eksportidagi inset: yuqori, o‘ng, past, chap — quti o‘lchamiga nisbatan) */
type Ins = [number, number, number, number];
const INS = {
  cloud: [0, 0.0074, 0.1333, 0.0273] as Ins,
  sun: [0.0364, 0.0545, 0.0727, 0.0545] as Ins,
  star: [0.025, 0.0518, 0.0342, 0.0518] as Ins,
  moon: [0, 0.0625, 0.065, 0] as Ins,
  ribbon: [0.0029, 0.3333, 0.0145, 0.3333] as Ins,
  none: [0, 0, 0, 0] as Ins,
  miniHill: [0.1568, 0.04, 0.0713, 0.04] as Ins,
  miniFront: [0.3235, 0.04, 0.1471, 0.04] as Ins,
};
/** To‘liq enli tepaliklar: [rasm, inset] — mobil va laptop shakli alohida */
const HILLS = {
  m: {
    orqa: [`${P}/tep-orqa-m.svg`, [0.0591, 0.0359, 0.0328, 0.0359]],
    orta: [`${P}/tep-orta-m.svg`, [0.0858, 0.0359, 0.0477, 0.0359]],
    old: [`${P}/tep-old-m.svg`, [0.165, 0.0359, 0.0917, 0.0359]],
    tunOrqa: [`${P}/tun-orqa-m.svg`, [0.1373, 0.0359, 0.0763, 0.0359]],
    tunOld: [`${P}/tun-old-m.svg`, [0.2226, 0.0359, 0.1237, 0.0359]],
  },
  l: {
    orqa: [`${P}/tep-orqa-l.svg`, [0.0556, 0.0097, 0.0309, 0.0097]],
    orta: [`${P}/tep-orta-l.svg`, [0.0816, 0.0097, 0.0453, 0.0097]],
    old: [`${P}/tep-old-l.svg`, [0.1525, 0.0097, 0.0847, 0.0097]],
    tunOrqa: [`${P}/tun-orqa-l.svg`, [0.1197, 0.0097, 0.0665, 0.0097]],
    tunOld: [`${P}/tun-old-l.svg`, [0.2097, 0.0097, 0.1165, 0.0097]],
  },
} as const satisfies Record<"m" | "l", Record<string, readonly [string, Ins]>>;

/* ── Ma’lumot (taklifnoma tilida — InvitationSite LocaleProvider’i) ── */
/** Server yaratadigan standart taklif matni (php/api/lib/orders.php DEFAULT_MESSAGE) — har qaysi tilda */
const SERVER_DEFAULT = "Aziz mehmonlar! Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.";
const isServerDefault = (m: string) => (["uz", "ru", "en"] as Locale[]).some((l) => tr(l, SERVER_DEFAULT).trim() === m.trim());
/** «Amirxonning» / «Амирхон» / «Amirkhon’s» */
const possessive = (lang: Locale, name: string) => (lang === "uz" ? `${name}ning` : lang === "en" ? `${name}’s` : name);
/** «7 yoshda» / «7 лет» / «7 years old» */
function ageText(lang: Locale, raw: string) {
  const n = Math.round(Number(raw));
  if (!raw.trim() || !Number.isFinite(n) || n <= 0 || n > 30) return "";
  if (lang === "ru") {
    const m10 = n % 10;
    const m100 = n % 100;
    const w = m10 === 1 && m100 !== 11 ? "год" : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? "года" : "лет";
    return `${n} ${w}`;
  }
  if (lang === "en") return `${n} ${n === 1 ? "year" : "years"} old`;
  return `${n} yoshda`;
}

function useData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO = lang === "ru" ? ERTAK_DEMO_RU : lang === "en" ? ERTAK_DEMO_EN : ERTAK_DEMO;
  const ex = (data.extra ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof ex[k] === "string" ? (ex[k] as string).trim() : typeof ex[k] === "number" ? String(ex[k]) : "");
  const sd = splitDate(data.date);
  const guest = useGuestName();
  return useMemo(() => {
    const cw = calendarWords(lang);
    const exProgram = Array.isArray(ex.program) ? (ex.program as ProgramItem[]).filter((p) => p?.time && p?.title) : [];
    const photos = (data.photos ?? []).filter(Boolean);
    const date = sd ? new Date(`${sd.iso}T12:00:00Z`) : null;
    const code = str("dressCode") || (demo ? DEMO.dressCode : "");
    const dressNote = str("dressNote") || (DRESS_TEXT[code] ? t(DRESS_TEXT[code]) : "");
    // namunadagi ismlar tarjima qilinadi (mijoz ma’lumoti — o‘zgarishsiz)
    const a = ((demo ? t(data.personA) : data.personA) || "").trim();
    // sunnat: personB — ota-ona («Jamshid va Nodira» / «Karimovlar oilasi») — imzo sifatida
    const family = ((demo && data.personB ? t(data.personB) : data.personB) || "").trim();
    const time = sd?.time ?? "";
    const program = (demo ? DEMO.program : exProgram.length ? exProgram : ((data.program ?? []) as ProgramItem[])) as ProgramItem[];
    const raw = (demo ? "" : data.message || "").trim();
    const custom = raw && !isServerDefault(raw) ? raw.replace(/^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Дорогие гости!|Dear guests!)\s*/, "").trim() : "";
    const message = custom || (a ? t(DEFAULT_MESSAGE, { name: a }) : "");
    const venueTitle = ((demo ? t(data.venueName) : data.venueName) || "").trim();
    const address = ((demo ? DEMO.address : data.address) || "").trim();
    const unq = (s: string) => s.replace(/^["“”«»„]+|["“”«»„]+$/g, "").trim();
    const m = date ? date.getUTCMonth() : 0;
    const year = date ? date.getUTCFullYear() : 0;
    const day = date ? date.getUTCDate() : 0;
    // namunada javob muddati — Figma’dagidek sanadan 2 hafta oldin («1-maygacha»)
    const deadline = demo && sd ? new Date(Date.UTC(year, m, day - 14)).toISOString().slice(0, 10) : data.rsvpDeadline;
    const own = demo ? [`${P}/portret.webp`, `${P}/otcha.webp`] : photos;
    return {
      a,
      family,
      /** «Amirxonning» */
      whose: a ? possessive(lang, a) : "",
      /** «15 · 05 · 2027» */
      dots: sd?.dots ?? "",
      /** «15 · MAY · 2027» / «15 · МАЯ · 2027» */
      heroDate: date ? `${day} · ${(lang === "ru" ? MONTHS_RU_GEN[m] : lang === "en" ? MONTHS_EN[m] : MONTHS_LOWER[m]).toLocaleUpperCase(lang)} · ${year}` : "",
      day: date ? String(day) : "",
      /** «may · 2027» */
      monthYear: date ? `${(lang === "ru" ? cw.months[m] : lang === "en" ? MONTHS_EN[m] : MONTHS_LOWER[m]).toLocaleLowerCase(lang)} · ${year}` : "",
      weekday: date ? cw.weekday[date.getUTCDay()] : "",
      time,
      hasDate: !!date,
      target: data.date ? tashkentDate(data.date).getTime() : null,
      guest,
      message,
      quote: unq(str("quote")) || t(DEFAULT_QUOTE),
      age: ageText(lang, str("age") || (demo ? DEMO.age : "")),
      venueTitle,
      address,
      mapUrl: data.mapUrl || `https://yandex.uz/maps/?text=${encodeURIComponent([venueTitle, address].filter(Boolean).join(", "))}`,
      program,
      dressNote,
      portrait: (own[0] as string | undefined) ?? "",
      second: (own[1] as string | undefined) ?? "",
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

function Img({ src, className, style, eager }: { src: string; className?: string; style?: CSSProperties; eager?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" draggable={false} loading={eager ? "eager" : "lazy"} decoding="async" className={cx(st.img, className)} style={style} />;
}

/**
 * Bezak (Figma quti: x, y, w, h — `unit` birligida) — soya chegarasi (inset) bilan; `flip` — gorizontal ko‘zgu.
 * Tashqi qutiga reveal/parallaks transformi, ichki rasmga — ko‘zgu.
 */
function Art({
  src,
  box,
  ins = INS.none,
  flip,
  unit = U,
  className,
  style,
  a,
  d,
  eager,
  fit,
  inner,
}: {
  src: string;
  box: [number, number, number, number];
  ins?: Ins;
  flip?: boolean;
  unit?: (n: number) => string;
  className?: string;
  style?: CSSProperties;
  a?: string;
  d?: number;
  eager?: boolean;
  fit?: "cover" | "contain";
  inner?: string;
}) {
  const [x, y, w, h] = box;
  const [t, r, b, l] = flip ? [ins[0], ins[3], ins[2], ins[1]] : ins;
  return (
    <div
      aria-hidden
      data-a={a}
      className={cx(st.art, className)}
      style={{ left: unit(x - l * w), top: unit(y - t * h), width: unit(w * (1 + l + r)), height: unit(h * (1 + t + b)), ...(d != null ? vars({ "--d": `${d}s` }) : {}), ...style }}
    >
      <Img src={src} eager={eager} className={inner} style={{ objectFit: fit ?? "fill", ...(flip ? { transform: "scaleX(-1)" } : {}) }} />
    </div>
  );
}

/** Uzun ism/matn bir qatorga sig‘masa — shrift kichrayadi (kesilmaydi, toshmaydi) */
function Fit({ children, base, max, className, style, deps, unit = U }: { children: ReactNode; base: number; max: number; className?: string; style?: CSSProperties; deps: unknown; unit?: (n: number) => string }) {
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
 * har qator `two` o‘lchamida (kichrayishi mumkin). `lh` — qator balandligi (birlikda, bir qatorli holat uchun).
 */
function NameLines({ text, base, max, lh, two, twoLh, unit = U, className, style, lineStyle }: { text: string; base: number; max: number; lh: number; two: number; twoLh: number; unit?: (n: number) => string; className?: string; style?: CSSProperties; lineStyle?: CSSProperties }) {
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
  return (
    <div className={className} style={style}>
      <span ref={probe} aria-hidden className="pointer-events-none absolute whitespace-nowrap" style={{ visibility: "hidden", fontSize: unit(base), left: 0, top: 0 }}>
        {text}
      </span>
      {rows.map((r, i) => (
        <span key={i} className="block" style={{ height: unit(h), lineHeight: `${unit(h)}`, fontSize: unit(fs), whiteSpace: "nowrap", ...lineStyle }}>
          <Fit base={fs} max={max} unit={unit} deps={`${r}|${fs}`}>
            {r}
          </Fit>
        </span>
      ))}
    </div>
  );
}

/** Kartondan kesilgan yulduzcha (Figma «Ertak / Yulduz (qog‘oz)») */
const Star = ({ x, y, s, unit = U, a = "star", d = 0, className }: { x: number; y: number; s: number; unit?: (n: number) => string; a?: string; d?: number; className?: string }) => (
  <Art src={`${P}/yulduz.svg`} box={[x, y, s, s]} ins={INS.star} unit={unit} a={a} d={d} className={className} />
);

/** Bo‘lim: to‘liq enli fon + markazda kontent ustuni (mobil 390 birlik; laptopda × 1.45). `deco` — laptop yon bezaklari (1440 kanvas) */
function Sec({
  children,
  z,
  bg,
  colStyle,
  id,
  deco,
  wide,
  onP,
  className,
  secRef,
}: {
  children: ReactNode;
  z: number;
  bg: "paper" | "peach" | "teal" | "coral";
  colStyle?: CSSProperties;
  id?: string;
  deco?: ReactNode;
  wide: boolean;
  onP?: (p: number, r: DOMRect, el: HTMLElement) => void;
  className?: string;
  secRef?: React.RefObject<HTMLElement | null>;
}) {
  const own = useRef<HTMLElement>(null);
  const ref = secRef ?? own;
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
      {wide && deco}
      <div className={st.col} style={{ width: U(390), ...colStyle }}>
        {children}
      </div>
    </section>
  );
}

/** Sarlavha (Yeseva One, markazda, 360 da sig‘adi) */
function Title({ text, top, fs = 32, h = 37, color, wide, className, style }: { text: string; top?: number; fs?: number; h?: number; color?: string; wide?: boolean; className?: string; style?: CSSProperties }) {
  return (
    <p data-a="up" className={cx(st.ye, "text-center", top != null && "absolute inset-x-0", className)} style={{ top: top != null ? U(top) : undefined, height: U(h), fontSize: U(fs), lineHeight: `${U(h)}`, color, ...style }}>
      <Fit base={fs} max={wide ? 380 : 366} deps={text}>
        {text}
      </Fit>
    </p>
  );
}

/* ═════════════ 00 · Ochilish — ertak kitobi: kitob yaqinlashadi, muqova umurtqa atrofida ochiladi, sahifalar varaqlanadi,
 * so‘nggi sahifa ortidagi sahna «oyna»dan ko‘rinadi va oyna ekranni to‘ldirguncha kattalashadi (scroll bilan; shaffoflik yo‘q) ═════════════ */
const GATE = {
  m: { W: 390, H: 844, bx: 0, by: 0, k: 1 },
  l: { W: 1440, H: 900, bx: 501.6, by: -22.64, k: 1.12 },
} as const;
/** Sahifalar (oyna) — kitob koordinatalarida */
const HOLE = { x: 48, y: 128, w: 306, h: 600, r: 12 };
const LEAVES = 3;
/* Vaqt chizig‘i (o: 0…1) — CSS bilan bir xil (ertak.module.css) */
const T = { cover: [0.04, 0.3], leaf: [0.22, 0.06, 0.16], zoom: [0.5, 0.42] } as const;
const smoother = (k: number) => k * k * k * (k * (k * 6 - 15) + 10);
const coverAngle = (o: number) => smoother(seg(o, T.cover[0], T.cover[0] + T.cover[1])) * 170;
const leafAngle = (o: number, i: number) => smoother(seg(o, T.leaf[0] + i * T.leaf[1], T.leaf[0] + i * T.leaf[1] + T.leaf[2])) * (168 - i * 2);

/** Muqova old yuzi: umurtqa, oltin ramkalar, oyna (mini sahna), «Shohzoda» / ism / «sunnat to‘yi» / yulduzlar / sana */
function Cover({ d }: { d: D }) {
  const t = useT();
  return (
    <>
      <span aria-hidden className={st.spine} style={{ width: B(22) }} />
      <span aria-hidden className={st.cFrame} style={{ left: B(36), top: B(20), width: B(256), height: B(560), borderWidth: B(1.2), borderRadius: B(6) }} />
      <span aria-hidden className={st.cFrame} style={{ left: B(44), top: B(28), width: B(240), height: B(544), borderWidth: B(0.6), borderRadius: B(4) }} />
      <div aria-hidden className={st.mini} style={{ left: B(62), top: B(70), width: B(200), height: B(240), borderRadius: `${B(100)} ${B(100)} 0 0` }}>
        <Art src={`${P}/quyosh.svg`} box={[112, 24, 72, 72]} ins={INS.sun} unit={B} eager />
        <Art src={`${P}/shahar.webp`} box={[-30, 70, 260, 173.47]} unit={B} eager fit="cover" />
        <Art src={`${P}/mini-tep.svg`} box={[0, 169.83, 200, 70.17]} ins={INS.miniHill} unit={B} eager />
        <Art src={`${P}/otliq.webp`} box={[38, 104, 124, 124]} unit={B} eager fit="cover" />
        <Art src={`${P}/mini-old.svg`} box={[0, 206, 200, 34]} ins={INS.miniFront} unit={B} eager />
      </div>
      <span aria-hidden className={st.cFrame} style={{ left: B(56), top: B(64), width: B(212), height: B(252), borderWidth: B(1.5), borderRadius: `${B(106)} ${B(106)} 0 0` }} />
      <div className={st.cText}>
        <p className={cx(st.ye, st.cIn, "absolute text-center")} style={{ left: B(22), top: B(340), width: B(288), height: B(42), fontSize: B(36), lineHeight: `${B(42)}`, color: "var(--gold)" }}>
          <Fit base={36} max={232} unit={B} deps="sh">
            {t("Shohzoda")}
          </Fit>
        </p>
        <h1 className={cx(st.ye, st.cIn, "absolute flex flex-col justify-center text-center")} style={vars({ left: B(22), top: B(379), width: B(288), height: B(56), color: "var(--paper)", "--cd": "0.55s" })}>
          <NameLines text={d.a} base={36} max={200} lh={42} two={23} twoLh={27} unit={B} />
        </h1>
        <p className={cx(st.ns, st.cIn, "absolute text-center")} style={vars({ left: B(22), top: B(452), width: B(288), height: B(23), fontSize: B(17), lineHeight: `${B(23)}`, color: "rgba(251,243,230,.85)", "--cd": "0.7s" })}>
          <Fit base={17} max={232} unit={B} deps="st" style={{ letterSpacing: B(3), paddingLeft: B(3) }}>
            {t("sunnat to‘yi")}
          </Fit>
        </p>
        <span className={cx(st.cIn, "absolute inset-0")} style={vars({ "--cd": "0.8s" })} aria-hidden>
          <Art src={`${P}/yulduz.svg`} box={[124, 494, 18, 18]} ins={INS.star} unit={B} eager />
          <Art src={`${P}/yulduz.svg`} box={[166, 488, 30, 30]} ins={INS.star} unit={B} eager />
          <Art src={`${P}/yulduz.svg`} box={[208, 494, 18, 18]} ins={INS.star} unit={B} eager />
        </span>
        {d.dots && (
          <p className={cx(st.nb, st.cIn, "absolute text-center")} style={vars({ left: B(22), top: B(538), width: B(288), height: B(20), fontSize: B(15), lineHeight: `${B(20)}`, color: "var(--gold)", whiteSpace: "nowrap", "--cd": "0.9s" })}>
            <span style={{ letterSpacing: B(3), paddingLeft: B(3) }}>{d.dots}</span>
          </p>
        )}
      </div>
    </>
  );
}

function Gate({ d, wide, onStart, still = false }: { d: D; wide: boolean; onStart: () => void; still?: boolean }) {
  const t = useT();
  const wrap = useRef<HTMLDivElement>(null);
  const cover = useRef<HTMLDivElement>(null);
  const leaves = useRef<(HTMLDivElement | null)[]>([]);
  const cb = useRef(onStart);
  cb.current = onStart;
  const G = wide ? GATE.l : GATE.m;
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
    /** Oyna ekranni to‘liq qoplashi uchun yakuniy kattalashtirish (kitob 1.08 ga yaqinlashgan holatdan) */
    const fitZoom = () => {
      const stage = el.firstElementChild as HTMLElement | null;
      const sw = stage?.clientWidth || window.innerWidth;
      const sh = stage?.clientHeight || window.innerHeight;
      const u = Math.min(sw / G.W, sh / G.H);
      const cxp = sw / 2 + u * (G.bx + G.k * (HOLE.x + HOLE.w / 2) - G.W / 2);
      const cyp = sh - u * (G.H - (G.by + G.k * (HOLE.y + HOLE.h / 2)));
      const w = u * G.k * HOLE.w * 1.08;
      const h = u * G.k * HOLE.h * 1.08;
      const z = Math.max((2 * Math.max(cxp, sw - cxp)) / w, (2 * Math.max(cyp, sh - cyp)) / h) * 1.12;
      host.style.setProperty("--zk", z.toFixed(3));
    };
    const apply = (o: number) => {
      host.style.setProperty("--o", o.toFixed(4));
      // 90° dan o‘tgan varaq/muqova chap tomondagi uyumga o‘tadi (oxirgi o‘girilgani — eng ustida)
      const c = cover.current;
      if (c) c.style.zIndex = coverAngle(o) > 90 ? "1" : "8";
      leaves.current.forEach((lf, i) => {
        if (lf) lf.style.zIndex = leafAngle(o, i) > 90 ? String(2 + i) : String(7 - i);
      });
      el.style.pointerEvents = o > 0.5 ? "none" : "";
      el.style.visibility = o > 0.94 ? "hidden" : "";
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
      fitZoom();
      on();
    };
    fitZoom();
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

  const { W, H, bx, by, k } = G;
  const pageU = wide ? CANVAS_L : COL_M;
  const X = (x: number) => `calc(50% + ${U(x - W / 2)})`;
  const Y = (y: number) => `calc(100% - ${U(H - y)})`;
  const ox = bx + k * (HOLE.x + HOLE.w / 2);
  const oy = by + k * (HOLE.y + HOLE.h / 2);
  const rect = (x: number, y: number, w: number, h: number, r?: number): CSSProperties => ({ left: B(x), top: B(y), width: B(w), height: B(h), borderRadius: r != null ? B(r) : undefined });
  return (
    <div ref={wrap} className={cx(st.gateWrap, still && st.still)} style={vars(still ? { "--u": pageU, "--o": 0, height: U(H), marginBottom: 0 } : { "--u": `min(${pageU}, calc(100svh / ${H}))` })}>
      <div className={st.gate} aria-label={t("Taklifnoma")} style={still ? { position: "relative", height: "100%" } : undefined}>
        <div className={st.zoom} style={{ transformOrigin: `${X(ox)} ${Y(oy)}` }}>
          <div
            className={st.book}
            style={vars({ "--bu": `calc(var(--u) * ${k})`, left: X(bx), top: Y(by), width: B(390), height: B(844), transformOrigin: `${B(HOLE.x + HOLE.w / 2)} ${B(HOLE.y + HOLE.h / 2)}`, perspective: B(1400) })}
          >
            {/* fon — oyna (sahifalar o‘rni) atrofidagi ulkan soya: oyna ortida hero sahnasi */}
            <span aria-hidden className={st.hole} style={rect(HOLE.x, HOLE.y, HOLE.w, HOLE.h, HOLE.r)} />
            <span aria-hidden className={st.pagesSh} style={rect(HOLE.x, HOLE.y, HOLE.w, HOLE.h, HOLE.r)} />
            <span aria-hidden className={st.edge} style={rect(52, 132, 306, 600, 12)} />
            {Array.from({ length: LEAVES }, (_, i) => (
              <div
                key={i}
                ref={(n) => {
                  leaves.current[i] = n;
                }}
                aria-hidden
                className={st.leaf}
                style={vars({ ...rect(HOLE.x, HOLE.y, HOLE.w, HOLE.h), "--i": i, zIndex: 7 - i })}
              >
                <div className={st.leafFace} style={{ borderRadius: B(HOLE.r) }}>
                  <span className={st.leafFrame} style={{ inset: `${B(22)} ${B(26)} ${B(26)} ${B(22)}`, borderWidth: B(1), borderRadius: B(6) }} />
                  <span className={cx(st.leafFrame, st.leafFrame2)} style={{ inset: `${B(30)} ${B(34)} ${B(34)} ${B(30)}`, borderWidth: B(0.6), borderRadius: B(4) }} />
                </div>
                <div className={cx(st.leafFace, st.leafBack)} style={{ borderRadius: B(HOLE.r) }}>
                  <span className={st.leafFrame} style={{ inset: `${B(22)} ${B(22)} ${B(26)} ${B(26)}`, borderWidth: B(1), borderRadius: B(6) }} />
                  <span className={cx(st.leafFrame, st.leafFrame2)} style={{ inset: `${B(30)} ${B(30)} ${B(34)} ${B(34)}`, borderWidth: B(0.6), borderRadius: B(4) }} />
                </div>
              </div>
            ))}
            <div ref={cover} className={st.cover} style={vars({ ...rect(36, 120, 310, 600), zIndex: 8 })}>
              <div className={st.cFace} style={{ borderRadius: B(14) }}>
                <Cover d={d} />
              </div>
              <div aria-hidden className={cx(st.cFace, st.cBack)} style={{ borderRadius: B(14) }}>
                <span className={st.cBackPaper} style={{ inset: B(10), borderRadius: B(8) }} />
              </div>
              {/* xatcho‘p lentasi — muqova bilan birga ochiladi */}
              <Art src={`${P}/lenta.svg`} box={[282, -12, 18, 690]} ins={INS.ribbon} unit={B} eager className={st.ribbon} />
            </div>
          </div>
          {wide && (
            <div aria-hidden className={st.gDeco}>
              <Art src={`${P}/fonuslar.webp`} box={[138, 0, 190, 285]} unit={U} eager fit="cover" className={st.gDrop} style={{ left: X(138), top: 0 }} />
              <Art src={`${P}/fonuslar.webp`} box={[1112, 0, 190, 285]} unit={U} eager fit="cover" flip className={st.gDrop} style={{ left: X(1112), top: 0 }} />
              {(
                [
                  [120, 640, 30],
                  [300, 720, 20],
                  [1290, 640, 30],
                  [1120, 720, 20],
                  [200, 520, 16],
                  [1230, 520, 16],
                ] as const
              ).map(([x, y, s], i) => (
                <Art key={i} src={`${P}/yulduz.svg`} box={[x, y, s, s]} ins={INS.star} unit={U} eager className={st.gStar} style={vars({ left: `calc(${X(x)} - ${U(s * INS.star[3])})`, top: `calc(${Y(y)} - ${U(s * INS.star[0])})`, "--d": `${0.6 + i * 0.08}s` })} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═════════════ 01 · Hero — ochilgan sahna (pop-up): qatlamlar pastdan navbat bilan tik turadi; keyin parallaks ═════════════ */
type Layer = { src: string; box: [number, number, number, number]; ins?: Ins; flip?: boolean; pk: number; f: number; cls?: string; edge?: "l" | "r"; fit?: "cover" };
const HERO_M: Layer[] = [
  { src: `${P}/quyosh.svg`, box: [236, 196, 150, 150], ins: INS.sun, pk: 6, f: 0.7 },
  { src: `${P}/bulut.svg`, box: [-40, 268, 200, 81.818], ins: INS.cloud, pk: 4, f: 0.7 },
  { src: `${P}/bulut.svg`, box: [250, 330, 160, 65.455], ins: INS.cloud, pk: 5, f: 0.7 },
  { src: `${P}/bulut-k.svg`, box: [150, 250, 110, 45], ins: INS.cloud, pk: 4.5, f: 0.7 },
  // planshetda (kanvas ekrandan tor) yon tomonlar bo‘sh qolmasin — siluet nusxalari (telefonda kadrdan tashqarida)
  { src: `${P}/shahar.webp`, box: [-405, 372, 440, 293.563], flip: true, pk: 2.4, f: 0.5, fit: "cover" },
  { src: `${P}/shahar.webp`, box: [355, 372, 440, 293.563], flip: true, pk: 2.4, f: 0.5, fit: "cover" },
  { src: `${P}/shahar.webp`, box: [-25, 350, 440, 293.563], pk: 2, f: 0.5, fit: "cover" },
];
const HERO_L: Layer[] = [
  { src: `${P}/quyosh.svg`, box: [1060, 150, 240, 240], ins: INS.sun, pk: 6, f: 0.7 },
  { src: `${P}/bulut.svg`, box: [60, 250, 240, 98.182], ins: INS.cloud, pk: 4, f: 0.7 },
  { src: `${P}/bulut.svg`, box: [330, 320, 170, 69.545], ins: INS.cloud, pk: 4.6, f: 0.7 },
  { src: `${P}/bulut.svg`, box: [880, 300, 200, 81.818], ins: INS.cloud, flip: true, pk: 5, f: 0.7 },
  { src: `${P}/bulut.svg`, box: [1180, 380, 200, 81.818], ins: INS.cloud, flip: true, pk: 5.4, f: 0.7 },
  { src: `${P}/bulut.svg`, box: [560, 240, 130, 53.182], ins: INS.cloud, pk: 4.3, f: 0.7 },
  { src: `${P}/shahar.webp`, box: [-120, 330, 620, 413.656], pk: 2, f: 0.5, edge: "l", fit: "cover" },
  { src: `${P}/shahar.webp`, box: [940, 330, 620, 413.656], flip: true, pk: 2.3, f: 0.5, edge: "r", fit: "cover" },
  { src: `${P}/shahar.webp`, box: [420, 300, 600, 400.313], pk: 2.6, f: 0.5, fit: "cover" },
];
const HERO_HILLS = {
  m: { orqa: [539.57, 304.43], orta: [634.17, 209.83], old: [734.9, 109.1], horse: [70, 402, 250] },
  l: { orqa: [576.38, 323.62], orta: [679.42, 220.58], old: [781.94, 118.06], horse: [560, 390, 330] },
} as const;
const HERO_TEXT = {
  m: { name: [84, 32, 28, 370], big: [120, 64, 54, 370], date: [196, 20, 15, 4] },
  l: { name: [70, 46, 40, 1300], big: [118, 96, 84, 1300], date: [232, 25, 18, 5] },
} as const;

function Hero({ d, wide, still }: { d: D; wide: boolean; still: boolean }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const W = wide ? 1440 : 390;
  const H = wide ? 900 : 844;
  const pageU = wide ? CANVAS_L : COL_M;
  const X = (x: number) => `calc(50% + ${U(x - W / 2)})`;
  const Y = (y: number) => `calc(100% - ${U(H - y)})`;
  // ochilgandan keyin parallaks: bulutlar/quyosh 0.3x, siluet 0.5x, ot 0.8x, old tepalik 1x (sahifa bilan)
  useEffect(() => {
    const el = ref.current;
    if (!el || still) return;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const top = el.getBoundingClientRect().top;
      el.style.setProperty("--hs", `${Math.max(0, -top).toFixed(1)}px`);
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
  }, [still]);
  const hills = wide ? HILLS.l : HILLS.m;
  const hh = wide ? HERO_HILLS.l : HERO_HILLS.m;
  const tx = wide ? HERO_TEXT.l : HERO_TEXT.m;
  const hill = (k: "orqa" | "orta" | "old", pk: number, f: number) => {
    const [src, ins] = hills[k];
    const [y, h] = hh[k];
    return (
      <div aria-hidden className={st.pop} style={vars({ left: 0, right: 0, top: Y(y), height: U(h), "--pk": pk, "--f": f })}>
        <div className={st.hillImg} style={{ top: `${-ins[0] * 100}%`, right: `${-ins[1] * 100}%`, bottom: `${-ins[2] * 100}%`, left: `${-ins[3] * 100}%` }}>
          <Img src={src} eager />
        </div>
      </div>
    );
  };
  const layer = (L: Layer, i: number) => {
    const [x, y, w, h] = L.box;
    const ins = L.ins ?? INS.none;
    const [it, ir, ib, il] = L.flip ? [ins[0], ins[3], ins[2], ins[1]] : ins;
    const pos: CSSProperties =
      L.edge === "l"
        ? { left: U(x - il * w) }
        : L.edge === "r"
          ? { right: U(W - (x + w) - ir * w) }
          : { left: `calc(${X(x)} - ${U(il * w)})` };
    return (
      <div key={i} aria-hidden className={st.pop} style={vars({ ...pos, top: `calc(${Y(y)} - ${U(it * h)})`, width: U(w * (1 + il + ir)), height: U(h * (1 + it + ib)), "--pk": L.pk, "--f": L.f })}>
        <Img src={L.src} eager style={{ objectFit: L.fit ?? "fill", ...(L.flip ? { transform: "scaleX(-1)" } : {}) }} />
      </div>
    );
  };
  const [hx, hy, hs] = hh.horse;
  const [nT, nH, nF, nMax] = tx.name;
  const [bT, bH, bF, bMax] = tx.big;
  const [dT, dH, dF, dLs] = tx.date;
  const big = t("sunnat to‘yi");
  return (
    <div ref={ref} className={cx(st.hero, still && st.heroStill)} style={vars(still ? { "--u": pageU, height: U(H), "--hs": "0px" } : { "--u": `min(${pageU}, calc(100svh / ${H}))` })}>
      <div aria-hidden className={st.hSky} style={{ height: U(H) }} />
      {(wide ? HERO_L : HERO_M).map(layer)}
      {hill("orqa", 1, 0.2)}
      <div aria-hidden className={st.pop} style={vars({ left: `calc(${X(hx)})`, top: Y(hy), width: U(hs), height: U(hs), "--pk": 3, "--f": 0.2 })}>
        <div className={st.sway}>
          <Img src={`${P}/otliq.webp`} eager />
        </div>
      </div>
      {hill("orta", 0.5, 0.1)}
      {hill("old", 0, 0)}
      {/* bayroqchalar — chok ustida (00/01); laptopda butun en bo‘ylab */}
      <div aria-hidden className={st.flags}>
        {(wide ? [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6] : [0]).map((n) => (
          <Art key={n} src={`${P}/gulchambar.svg`} box={[(wide ? 20 : 15) + n * 360, -8, 360, 70]} unit={U} eager style={{ left: X((wide ? 20 : 15) + n * 360) }} />
        ))}
      </div>
      <div className={st.hText}>
        {d.whose && (
          <div className={cx(st.ye, st.ht, "absolute inset-x-0 text-center")} style={vars({ bottom: U(H - nT - nH), color: "var(--coral)", "--ti": 0 })}>
            <NameLines text={d.whose} base={nF} max={nMax} lh={nH} two={nF * 0.8} twoLh={nH * 0.8} />
          </div>
        )}
        <h2 className={cx(st.ye, st.ht, "absolute inset-x-0 text-center")} style={vars({ top: Y(bT), height: U(bH), fontSize: U(bF), lineHeight: `${U(bH)}`, color: "var(--ink)", "--ti": 1 })}>
          <Fit base={bF} max={bMax} deps={big}>
            {big}
          </Fit>
        </h2>
        {d.heroDate && (
          <p className={cx(st.nb, st.ht, "absolute inset-x-0 text-center")} style={vars({ top: Y(dT), height: U(dH), fontSize: U(dF), lineHeight: `${U(dH)}`, color: "var(--teal)", whiteSpace: "nowrap", "--ti": 2 })}>
            <span style={{ letterSpacing: U(dLs), paddingLeft: U(dLs) }}>{d.heroDate}</span>
          </p>
        )}
      </div>
    </div>
  );
}

/* ═════════════ 02 · Taklif — salom, taklif matni, imzo ═════════════ */
function Taklif({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const hello2 = d.guest ? t("hurmatli {guest}!", { guest: d.guest }) : t("qadrli mehmonlar!");
  const lantern = (x: number, flip: boolean) => (
    <Art src={`${P}/fonuslar.webp`} box={[x, 0, 170, 255]} unit={C} a="drop" d={0.1} fit="cover" flip={flip} />
  );
  return (
    <Sec z={z} bg="paper" wide={wide} className={st.secTaklif} deco={<>{lantern(148, false)}{lantern(1122, true)}</>} colStyle={{ paddingTop: U(120), paddingBottom: U(d.family ? 102 : 96) }}>
      {/* mobil: fonuslar 01/02 chokida (Figma y = −76) */}
      {!wide && <Art src={`${P}/fonuslar.webp`} box={[282, -76, 100, 150]} a="drop" d={0.15} fit="cover" />}
      <Title text={t("Assalomu alaykum,")} fs={30} h={35} />
      <p data-a="up" className={cx(st.ye, "text-center")} style={vars({ marginTop: U(5), height: U(35), fontSize: U(30), lineHeight: `${U(35)}`, color: "var(--coral)", "--d": "0.12s" })}>
        <Fit base={30} max={366} deps={hello2}>
          {hello2}
        </Fit>
      </p>
      {d.message && (
        <p data-a="up" className={cx(st.nr, "mx-auto text-center")} style={vars({ marginTop: U(31), width: U(318), fontSize: U(17), lineHeight: `${U(27)}`, color: "var(--ink)", overflowWrap: "anywhere", "--d": "0.2s" })}>
          {d.message}
        </p>
      )}
      <div className="relative mx-auto" style={{ marginTop: U(d.message ? 49 : 40), width: U(390), height: U(24) }}>
        <Star x={157} y={8} s={16} d={0.15} />
        <Star x={183} y={0} s={24} d={0.25} />
        <Star x={217} y={8} s={16} d={0.35} />
      </div>
      {d.family && (
        <>
          <p data-a="up" className={cx(st.nr, "text-center")} style={vars({ marginTop: U(28), height: U(22), fontSize: U(16), lineHeight: `${U(22)}`, color: "var(--mute)", "--d": "0.1s" })}>
            {t("Hurmat bilan,")}
          </p>
          <div data-a="up" className={cx(st.ye, "relative text-center")} style={vars({ marginTop: U(4), color: "var(--teal)", "--d": "0.18s" })}>
            <NameLines text={d.family} base={26} max={366} lh={30} two={24} twoLh={29} />
          </div>
        </>
      )}
      <Art src={`${P}/bulut.svg`} box={[-30, 0, 150, 61.364]} ins={INS.cloud} a="cloudL" d={0.1} style={{ top: "auto", bottom: U(-1.364 - 61.364 * INS.cloud[2]) }} />
      <Art src={`${P}/bulut.svg`} box={[280, 0, 140, 57.273]} ins={INS.cloud} flip a="cloudR" d={0.2} style={{ top: "auto", bottom: U(14.727 - 57.273 * INS.cloud[2]) }} />
    </Sec>
  );
}

/* ═════════════ 03 · Bizning shohzoda — qog‘oz qatlamlar birin-ketin, surat, ism, yosh ═════════════ */
function Shohzoda({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  if (!d.portrait) return null;
  const deco = (
    <>
      <Art src={`${P}/bulut.svg`} box={[90, 375.55, 260, 106.364]} ins={INS.cloud} unit={C} a="cloudL" d={0.1} />
      <Art src={`${P}/bulut.svg`} box={[1090, 375.55, 260, 106.364]} ins={INS.cloud} unit={C} a="cloudR" d={0.1} flip />
      <Star x={180} y={665.26} s={30} unit={C} d={0.3} />
      <Star x={1230} y={665.26} s={30} unit={C} d={0.35} />
      <Star x={290} y={804.75} s={18} unit={C} d={0.45} />
      <Star x={1130} y={804.75} s={18} unit={C} d={0.5} />
    </>
  );
  return (
    <Sec z={z} bg="peach" wide={wide} deco={deco} colStyle={{ height: U(740) }}>
      <Title text={t("Bizning shohzoda")} top={56} />
      <div data-a="layer" aria-hidden className={cx(st.arch, "absolute")} style={vars({ left: U(60), top: U(124), width: U(250), height: U(380), borderRadius: `${U(125)} ${U(125)} 0 0`, background: "var(--coral)", boxShadow: `0 ${U(6)} ${U(16)} rgba(77,46,26,.2)`, "--d": "0s" })} />
      <div data-a="layer" aria-hidden className={cx(st.arch, "absolute")} style={vars({ left: U(72), top: U(136), width: U(226), height: U(356), borderRadius: `${U(113)} ${U(113)} 0 0`, background: "var(--turq)", boxShadow: `0 ${U(4)} ${U(10)} rgba(77,46,26,.2)`, "--d": "0.14s" })} />
      <div data-a="layer" className="absolute overflow-hidden" style={vars({ left: U(82), top: U(146), width: U(206), height: U(336), borderRadius: `${U(103)} ${U(103)} 0 0`, background: "#e8e0d3", "--d": "0.28s" })}>
        <Img src={d.portrait} style={{ objectPosition: "50% 30%" }} />
      </div>
      {d.second && (
        <>
          <div data-a="pop" aria-hidden className="absolute rounded-full" style={vars({ left: U(214), top: U(400), width: U(172), height: U(172), background: "var(--paper)", boxShadow: `0 ${U(6)} ${U(14)} rgba(77,46,26,.22)`, "--d": "0.45s" })} />
          <div data-a="pop" className="absolute overflow-hidden rounded-full" style={vars({ left: U(222), top: U(408), width: U(156), height: U(156), background: "#e8e0d3", "--d": "0.55s" })}>
            <Img src={d.second} style={{ objectPosition: "50% 35%" }} />
          </div>
        </>
      )}
      <Star x={26} y={150} s={26} d={0.35} />
      <Star x={334} y={128} s={20} d={0.45} />
      <Star x={30} y={420} s={18} d={0.55} />
      <div className="absolute" style={{ left: U(36), top: U(526) }}>
        {d.a && (
          <div data-a="up" className={cx(st.ye, "relative")} style={vars({ color: "var(--ink)", "--d": "0.3s" })}>
            <NameLines text={d.a} base={30} max={d.second ? 176 : 318} lh={35} two={23} twoLh={27} />
          </div>
        )}
        {d.age && (
          <p data-a="up" className={st.ns} style={vars({ marginTop: U(7), height: U(23), fontSize: U(17), lineHeight: `${U(23)}`, color: "var(--coral)", whiteSpace: "nowrap", "--d": "0.4s" })}>
            {d.age}
          </p>
        )}
      </div>
      {d.quote && (
        <p data-a="up" className={cx(st.lo, st.clamp2, "absolute text-center")} style={vars({ left: U(35), top: U(640), width: U(320), fontSize: U(20), lineHeight: `${U(26)}`, color: "var(--teal)", "--d": "0.2s" })}>
          {d.quote}
        </p>
      )}
    </Sec>
  );
}

/* ═════════════ 04 · Bayram kuni — quyosh-sana, sanoq doiralari ═════════════ */
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
  const sun = (x: number, flip: boolean) => (
    <div data-a="sunPop" aria-hidden className={st.sideSun} style={vars({ left: C(x), top: C(345), width: C(180), height: C(180), "--d": "0.15s" })}>
      <SunRings s={C(180 / 150)} flip={flip} />
    </div>
  );
  const when = [d.weekday, d.time ? t("soat {time} dan", { time: d.time }) : ""].filter(Boolean).join(" · ");
  return (
    <Sec z={z} bg="paper" wide={wide} deco={<>{sun(143, false)}{sun(1117, true)}</>} colStyle={{ height: U(600) }} className={st.secSana}>
      {/* bulut — 03/04 chokida (Figma: mobil y = −42; laptop — kanvasda) */}
      {wide ? null : <Art src={`${P}/bulut.svg`} box={[-50, -42, 180, 73.636]} ins={INS.cloud} a="cloudL" d={0.05} />}
      <Title text={t("Bayram kuni")} top={60} />
      <div data-a="sunPop" aria-hidden className="absolute" style={vars({ left: U(95), top: U(118), width: U(200), height: U(200), "--d": "0.1s" })}>
        <SunRings s={U(200 / 150)} />
      </div>
      <p className={cx(st.ye, "absolute inset-x-0 text-center")} style={{ top: U(176), height: U(76), fontSize: U(64), lineHeight: `${U(76)}`, color: "var(--ink)" }}>
        <span className={st.mask}>
          <span data-a="mask" className={st.maskIn} style={vars({ "--d": "0.35s" })}>
            {d.day}
          </span>
        </span>
      </p>
      <p data-a="up" className={cx(st.nb, "absolute inset-x-0 text-center")} style={vars({ top: U(252), height: U(20), fontSize: U(15), lineHeight: `${U(20)}`, color: "var(--coral)", whiteSpace: "nowrap", "--d": "0.5s" })}>
        <span style={{ letterSpacing: U(2), paddingLeft: U(2) }}>{d.monthYear}</span>
      </p>
      {when && (
        <p data-a="up" className={cx(st.ns, "absolute inset-x-0 text-center")} style={vars({ top: U(340), height: U(23), fontSize: U(17), lineHeight: `${U(23)}`, color: "var(--teal)", "--d": "0.2s" })}>
          <Fit base={17} max={366} deps={when}>
            {when}
          </Fit>
        </p>
      )}
      {/* sanoq kuzatuvchisi — taymer qatorini qoplaydi */}
      <div ref={ref} aria-hidden className="pointer-events-none absolute inset-x-0" style={{ top: U(386), height: U(100) }} />
      {vals.map((v, i) => (
        <div key={i}>
          <div data-a="bounce" className={cx(st.tCircle, "absolute flex items-center justify-center")} style={vars({ left: U(26 + i * 89), top: U(386), width: U(72), height: U(72), "--d": `${0.25 + i * 0.1}s` })}>
            <span className={cx(st.ye, "block text-center")} style={{ fontSize: U(28), lineHeight: `${U(32)}`, height: U(32), color: "var(--paper)" }}>
              <Digits value={v} run={inView} len={i === 0 ? Math.max(2, String(vals[0]).length) : 2} i={i} />
            </span>
          </div>
          <p data-a="up" className={cx(st.ns, "absolute text-center")} style={vars({ left: U(22 + i * 89), top: U(468), width: U(80), height: U(19), fontSize: U(14), lineHeight: `${U(19)}`, color: "var(--mute)", whiteSpace: "nowrap", "--d": `${0.4 + i * 0.1}s` })}>
            {units[i]}
          </p>
        </div>
      ))}
      <p data-a="up" className={cx(st.lo, "absolute inset-x-0 text-center")} style={vars({ top: U(516), height: U(23), fontSize: U(18), lineHeight: `${U(23)}`, color: "var(--mute)", "--d": "0.6s" })}>
        <Fit base={18} max={366} deps={t("bayramgacha qoldi")}>
          {t("bayramgacha qoldi")}
        </Fit>
      </p>
    </Sec>
  );
}

/** Quyosh (uch halqa, qog‘oz soyasi) — halqalar navbat bilan ochiladi va sekin «nafas oladi» */
function SunRings({ s, flip }: { s: string; flip?: boolean }) {
  return (
    <div className={st.sun} style={vars({ "--s": s, ...(flip ? { transform: "scaleX(-1)" } : {}) })}>
      {/* Figma «Quyosh»: r 73.6 / 55.9 / 38.2 (166.4 lik ramkada, markaz 83.2, 80.5) → 150 lik qutiga */}
      <span className={cx(st.ring, st.r1)} />
      <span className={cx(st.ring, st.r2)} />
      <span className={cx(st.ring, st.r3)} />
    </div>
  );
}

/* ═════════════ 05 · Bayram yo‘li — punktir yo‘l scroll bilan chiziladi, bekatlar navbat bilan «pop» ═════════════ */
const STEP = 180;
/** Yo‘l: tepadan markazdan chiqadi, belgilar markazidan ilon izi bo‘lib o‘tadi, pastda markazga qaytadi (Figma «Yo‘l (punktir)») */
function roadPath(n: number) {
  const H = STEP * n + 180;
  const pts: [number, number][] = [[195, 120], ...Array.from({ length: n }, (_, i) => [i % 2 ? 290 : 100, 210 + i * STEP] as [number, number]), [195, H]];
  let dpath = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const k = (y1 - y0) * 0.55;
    dpath += ` C${x0} ${y0 + (i === 1 ? k * 0.2 : k)} ${x1} ${y1 - (i === pts.length - 1 ? k * 0.2 : k)} ${x1} ${y1}`;
  }
  return { d: dpath, H };
}

function Program({ d, z, wide, still }: { d: D; z: number; wide: boolean; still: boolean }) {
  const t = useT();
  const mid = useId().replace(/:/g, "");
  const box = useRef<HTMLDivElement>(null);
  const items = d.program.slice(0, 8);
  const n = items.length;
  const road = useMemo(() => roadPath(n), [n]);
  const onP = useCallback(
    (_p: number, r: DOMRect, el: HTMLElement) => {
      const b = box.current;
      if (!b) return;
      const vh = window.innerHeight || 800;
      const u = ((el.lastElementChild as HTMLElement | null)?.offsetWidth || r.width) / 390;
      // yo‘l uchi ekranning 80% balandligida — chizilgan qism shu chiziqqacha
      const tip = (vh * 0.8 - r.top) / u;
      b.style.setProperty("--dp", seg(tip, 120, road.H).toFixed(4));
    },
    [road.H],
  );
  if (!n) return null;
  const deco = (
    <>
      {(
        [
          [200, 261, 28],
          [1212, 261, 28],
          [260, 587.25, 18],
          [1162, 587.25, 18],
          [190, 913.5, 24],
          [1226, 913.5, 24],
          [250, 1148.4, 16],
          [1174, 1148.4, 16],
        ] as const
      ).map(([x, y, s], i) => (
        <Star key={i} x={x} y={y} s={s} unit={C} d={0.1 + (i % 2) * 0.1} />
      ))}
    </>
  );
  return (
    <Sec z={z} bg="teal" wide={wide} deco={deco} colStyle={{ height: U(road.H) }} onP={still ? undefined : onP}>
      <Title text={t("Bayram yo‘li")} top={56} color="var(--paper)" />
      <div ref={box} data-path aria-hidden className="absolute inset-0" style={vars({ "--dp": still ? 1 : 0 })}>
        <svg className={st.road} viewBox={`0 0 390 ${road.H}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
          <defs>
            <mask id={`rd${mid}`} maskUnits="userSpaceOnUse" x="0" y="0" width="390" height={road.H}>
              <path d={road.d} fill="none" stroke="#fff" strokeWidth="8" pathLength={1} className={st.roadMask} />
            </mask>
          </defs>
          <path d={road.d} fill="none" stroke="var(--paper)" strokeWidth="2" strokeLinecap="round" strokeDasharray="1.8 8.6" mask={`url(#rd${mid})`} />
        </svg>
      </div>
      {items.map((it, i) => {
        const right = i % 2 === 1;
        const y0 = 152 + i * STEP;
        const ic = ICONS[iconFor(it, i)];
        const cxp = right ? 232 : 42;
        return (
          <div key={i}>
            <div data-a="pop" className={cx(st.stop, "absolute")} style={vars({ left: U(cxp), top: U(y0), width: U(116), height: U(116), "--d": "0.05s" })}>
              <div className="absolute" style={{ left: U(58 - ic.w / 2), top: U(58 - ic.h / 2), width: U(ic.w), height: U(ic.h) }}>
                <Img src={ic.src} style={{ objectFit: "contain" }} />
              </div>
            </div>
            <div className={cx("absolute flex flex-col", right ? "items-end text-right" : "items-start text-left")} style={{ left: U(right ? 28 : 178), top: U(y0 + 8), width: U(184) }}>
              <p data-a="up" className={st.ye} style={vars({ height: U(30), fontSize: U(26), lineHeight: `${U(30)}`, color: "var(--gold)", whiteSpace: "nowrap", "--d": "0.15s" })}>
                {it.time}
              </p>
              <p data-a="up" className={cx(st.nb, st.clamp2)} style={vars({ marginTop: U(8), fontSize: U(18), lineHeight: `${U(25)}`, color: "var(--paper)", maxWidth: "100%", "--d": "0.22s" })}>
                {it.title}
              </p>
              {it.note?.trim() && (
                <p data-a="up" className={cx(st.nr, st.clamp2)} style={vars({ marginTop: U(3), fontSize: U(15), lineHeight: `${U(21)}`, color: "rgba(251,243,230,.8)", maxWidth: "100%", "--d": "0.3s" })}>
                  {it.note}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </Sec>
  );
}

/* ═════════════ 06 · Manzil — to‘yxona quyosh oldida, qog‘oz yer ═════════════ */
function Venue({ d, z, wide, linkable }: { d: D; z: number; wide: boolean; linkable: boolean }) {
  const t = useT();
  const deco = (
    <>
      <Art src={`${P}/bulut.svg`} box={[100, 287.1, 250, 102.273]} ins={INS.cloud} unit={C} a="cloudL" d={0.1} />
      <Art src={`${P}/bulut.svg`} box={[1090, 287.1, 250, 102.273]} ins={INS.cloud} unit={C} a="cloudR" d={0.1} flip />
    </>
  );
  return (
    <Sec z={z} bg="paper" wide={wide} deco={deco} colStyle={{ paddingTop: U(56), paddingBottom: U(48) }}>
      <Title text={t("Manzil")} />
      <div className="relative" style={{ height: U(339) }}>
        <div data-a="sunPop" aria-hidden className="absolute rounded-full" style={vars({ left: U(63), top: U(37), width: U(264), height: U(264), background: "var(--peach)", boxShadow: `0 ${U(4)} ${U(14)} rgba(77,46,26,.12)`, "--d": "0.05s" })} />
        <div data-a="ground" aria-hidden className="absolute" style={vars({ left: U(40), top: U(267), width: U(310), height: U(44), borderRadius: U(22), background: "var(--turq)", boxShadow: `0 ${U(-3)} ${U(10)} rgba(77,46,26,.2)`, "--d": "0.2s" })} />
        <Art src={`${P}/toyxona.webp`} box={[75, 31, 240, 240]} a="popUp" d={0.32} fit="contain" />
      </div>
      {d.venueTitle && (
        <p data-a="up" className={cx(st.ye, "mx-auto text-center")} style={vars({ width: U(366), fontSize: U(26), lineHeight: `${U(30)}`, color: "var(--ink)", overflowWrap: "anywhere", "--d": "0.15s" })}>
          {d.venueTitle}
        </p>
      )}
      {d.address && (
        <p data-a="up" className={cx(st.nr, "mx-auto text-center")} style={vars({ marginTop: U(d.venueTitle ? 14 : 0), width: U(300), fontSize: U(16), lineHeight: `${U(24)}`, color: "var(--mute)", overflowWrap: "anywhere", "--d": "0.22s" })}>
          {d.address}
        </p>
      )}
      <div data-a="up" className="flex justify-center" style={vars({ marginTop: U(36), "--d": "0.3s" })}>
        <a href={linkable ? d.mapUrl : undefined} target="_blank" rel="noopener noreferrer" className={cx(st.nb, st.btn)} style={{ minWidth: U(200), height: U(52), padding: `0 ${U(24)}`, fontSize: U(16), borderRadius: U(26), boxShadow: `0 ${U(4)} ${U(10)} rgba(77,46,26,.2)` }}>
          {t("Xaritada ochish")}
        </a>
      </div>
    </Sec>
  );
}

/* ═════════════ 07 · Dress-kod (ixtiyoriy — o‘chirilsa joy qolmaydi) ═════════════ */
function Dress({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  if (!d.dressNote) return null;
  return (
    <Sec z={z} bg="paper" wide={wide} colStyle={{ paddingTop: U(100), paddingBottom: U(88) }}>
      <Star x={139} y={53} s={22} d={0.1} />
      <Star x={180} y={41} s={30} d={0.2} />
      <Star x={229} y={53} s={22} d={0.3} />
      <Title text={t("Dress-kod")} />
      <p data-a="up" className={cx(st.nr, "mx-auto text-center")} style={vars({ marginTop: U(23), width: U(310), fontSize: U(18), lineHeight: `${U(28)}`, color: "var(--mute)", overflowWrap: "anywhere", "--d": "0.15s" })}>
        {d.dressNote}
      </p>
    </Sec>
  );
}

/* ═════════════ 08 · Anketa — javob (marjon fon, qog‘oz karta) ═════════════ */
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
      const room = wrap.clientHeight - parseFloat(cs.paddingBottom || "0") - parseFloat(cs.paddingTop || "0") - parseFloat(cs.borderTopWidth || "0") - parseFloat(cs.borderBottomWidth || "0");
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
    <p className={cx(st.nb, st.lbl)} style={{ height: U(19), fontSize: U(14), lineHeight: `${U(19)}` }}>
      {s}
    </p>
  );
  const sub = d.rsvpUntil ? t("Javobingizni {date} kutamiz", { date: d.rsvpUntil }) : t("Javobingizni kutamiz");
  const deco = (
    <>
      {[20, 380, 740, 1100].map((x) => (
        <Art key={x} src={`${P}/gulchambar.svg`} box={[x, -6, 360, 70]} unit={C} a="drop" d={0.05 + x / 4000} />
      ))}
      <Art src={`${P}/bulut.svg`} box={[113, 469.8, 240, 98.182]} ins={INS.cloud} unit={C} a="cloudL" d={0.1} />
      <Art src={`${P}/bulut.svg`} box={[1087, 469.8, 240, 98.182]} ins={INS.cloud} unit={C} a="cloudR" d={0.1} flip />
    </>
  );
  return (
    <Sec z={z} bg="coral" wide={wide} deco={deco} className={st.secRsvp} id="ertak-javob" colStyle={{ paddingTop: U(56), paddingBottom: U(88) }}>
      <Title text={t("Kelasizmi?")} fs={36} h={42} color="var(--paper)" />
      <p data-a="up" className={cx(st.ns, "mx-auto text-center")} style={vars({ marginTop: U(10), width: U(366), fontSize: U(16), lineHeight: `${U(22)}`, color: "rgba(251,243,230,.9)", overflowWrap: "anywhere", "--d": "0.12s" })}>
        {sub}
      </p>
      <div data-a="rise" className="relative mx-auto" style={vars({ marginTop: U(32), width: U(330), "--d": "0.2s" })}>
        <span aria-hidden className="absolute" style={{ left: U(12), top: U(14), right: 0, bottom: U(-12), borderRadius: U(20), background: "var(--turq)" }} />
        <div className={cx(st.card, "relative")} style={{ padding: `${U(26)} ${U(26)} ${U(34)}`, borderRadius: U(20), boxShadow: `0 ${U(8)} ${U(20)} rgba(77,46,26,.25)` }}>
          {sent ? (
            <div key="thanks" className={cx(st.thanks, "flex flex-col items-center text-center")} style={{ padding: `${U(30)} 0 ${U(10)}`, gap: U(16) }}>
              <p className={st.ye} style={{ fontSize: U(sent === "not_coming" ? 30 : 26), lineHeight: 1.25, color: "var(--teal)", overflowWrap: "anywhere" }}>
                {sent === "not_coming" ? t("Rahmat!") : t("Rahmat! Joyingiz band qilindi")}
              </p>
              <p className={st.nr} style={{ fontSize: U(16), color: "var(--mute)", lineHeight: 1.55, overflowWrap: "anywhere" }}>
                {sent === "not_coming" ? t("Javobingiz uchun rahmat — sizni duolarimizda eslaymiz.") : t("{name} — {count} kishi. Javobingiz yetkazildi.", { name: name.trim() || t("Javobingiz"), count })}
              </p>
              <button type="button" onClick={() => setSent(null)} className={st.nb} style={{ fontSize: U(15), color: "var(--teal)", textDecoration: "underline", textUnderlineOffset: 3 }}>
                {t("Javobni o‘zgartirish")}
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="flex flex-col items-stretch">
              {label(t("Ismingiz"))}
              <label className={st.field} style={{ marginTop: U(5), height: U(48), padding: `0 ${U(14)}`, borderWidth: U(1.5), borderRadius: U(14) }}>
                <input className={cx(st.nr, st.input)} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={t("Ism va familiya")} aria-label={t("Ismingiz")} style={{ fontSize: U(16) }} />
              </label>
              <div className="flex w-full" role="radiogroup" aria-label={t("Kelasizmi?")} style={{ marginTop: U(18), gap: U(8) }}>
                {(
                  [
                    ["coming", "Albatta kelaman"],
                    ["not_coming", "Kela olmayman"],
                  ] as const
                ).map(([s, l]) => (
                  <button key={s} type="button" role="radio" aria-checked={status === s} onClick={() => setStatus(s)} className={cx(st.nb, st.choice)} style={{ padding: `${U(8)} ${U(6)}`, minHeight: U(48), fontSize: U(15), borderWidth: U(1.5), borderRadius: U(24) }}>
                    <span style={{ overflowWrap: "anywhere" }}>{t(l)}</span>
                  </button>
                ))}
              </div>
              {status === "coming" && (
                <div className="flex w-full items-center" style={{ marginTop: U(20), gap: U(6), minHeight: U(36) }}>
                  <p className={st.ns} style={{ flex: "1 1 0", minWidth: 0, fontSize: U(16), lineHeight: 1.3, color: "var(--ink)" }}>
                    {t("Necha kishi bo‘lasiz?")}
                  </p>
                  <button type="button" className={cx(st.nb, st.step)} disabled={count <= 1} onClick={() => setCount((c) => Math.max(1, c - 1))} aria-label={t("Kamaytirish")} style={{ width: U(34), height: U(36), fontSize: U(19), borderWidth: U(1.5), borderRadius: U(18) }}>
                    −
                  </button>
                  <span className={st.nb} style={{ width: U(34), textAlign: "center", fontSize: U(19), lineHeight: 1.4, color: "var(--teal)" }} aria-live="polite">
                    {count}
                  </span>
                  <button type="button" className={cx(st.nb, st.step)} disabled={count >= 20} onClick={() => setCount((c) => Math.min(20, c + 1))} aria-label={t("Ko‘paytirish")} style={{ width: U(34), height: U(36), fontSize: U(19), borderWidth: U(1.5), borderRadius: U(18) }}>
                    +
                  </button>
                </div>
              )}
              <div style={{ marginTop: U(20) }}>{label(t("Tilaklaringiz"))}</div>
              <label className={st.field} style={{ marginTop: U(5), height: U(92), padding: `${U(11)} ${U(14)}`, borderWidth: U(1.5), borderRadius: U(14), justifyContent: "flex-start", alignItems: "flex-start" }}>
                <textarea ref={wishRef} rows={1} className={cx(st.nr, st.input)} value={wish} onChange={(e) => setWish(e.target.value)} maxLength={500} placeholder={t("Shohzodaga tilak…")} aria-label={t("Tilaklaringiz")} style={{ fontSize: U(16) }} />
              </label>
              {err && (
                <p className={st.nr} style={{ marginTop: U(12), color: "#b03a22", fontSize: U(14) }}>
                  {err}
                </p>
              )}
              <button type="submit" disabled={busy} className={cx(st.nb, st.submit)} style={{ marginTop: U(26), minHeight: U(54), padding: `${U(12)} ${U(12)}`, fontSize: U(17), borderRadius: U(27), opacity: busy ? 0.7 : 1 }}>
                {busy ? t("Yuborilmoqda…") : t("Javobni yuborish")}
              </button>
            </form>
          )}
        </div>
      </div>
    </Sec>
  );
}

/* ═════════════ 09 · Final — kun tunga aylanadi, mushaklar portlab ochiladi, yulduzlar miltillaydi
 * (scroll bilan: --fc 0 … 1 = Figma kadri; sahifa oxirigacha albatta tugaydi) ═════════════ */
const FIN = {
  m: {
    H: 844,
    fw: [[30, 30, 330, 220, false, 0]] as [number, number, number, number, boolean, number][],
    moon: [300, 246, 64],
    stars: [
      [40, 300, 16],
      [90, 250, 12],
      [24, 250, 14],
      [340, 446, 12],
      [60, 440, 14],
      [40, -14, 26],
      [330, -10, 20],
    ],
    title: [330, 51, 44],
    text: [50, 394, 290, 17, 26],
    family: [468, 30, 26],
    date: [510, 20, 15, 3],
    cities: [[-25, 540, 440, 293.563, false, ""]] as [number, number, number, number, boolean, "" | "l" | "r"][],
    orqa: [712.89, 131.11],
    horse: [220, 622, 140],
    old: [763.15, 80.85],
  },
  l: {
    H: 900,
    fw: [
      [60, 40, 420, 280, false, 0],
      [960, 40, 420, 280, true, 0.12],
    ] as [number, number, number, number, boolean, number][],
    moon: [680, 40, 80],
    stars: [
      [560, 170, 16],
      [860, 150, 18],
      [520, 330, 14],
      [900, 320, 14],
      [420, 420, 12],
      [1010, 430, 12],
      [300, -14, 28],
      [1112, -14, 28],
    ],
    title: [170, 74, 64],
    text: [460, 262, 520, 20, 30],
    family: [322, 37, 32],
    date: [374, 22, 16, 4],
    cities: [
      [-120, 520, 620, 413.656, false, "l"],
      [420, 500, 600, 400.313, false, ""],
      [940, 520, 620, 413.656, true, "r"],
    ] as [number, number, number, number, boolean, "" | "l" | "r"][],
    orqa: [749.58, 150.42],
    horse: [1020, 610, 190],
    old: [814.17, 85.83],
  },
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
      // bo‘lim ekranning 70% iga kirganda boshlanadi; sarlavha ekran tepasidan 40% ga kelganda tugaydi — sahifa oxiri undan oldin kelsa, oxirida tugaydi
      const y = window.scrollY;
      const top = r.top + y;
      const c = top + (r.height / F.H) * F.title[0];
      const max = document.documentElement.scrollHeight - vh;
      const s0 = Math.min(top - vh * 0.7, max - vh * 0.55);
      const s1 = Math.max(s0 + 1, Math.min(c - vh * 0.4, max));
      const f = seg(y, s0, s1);
      el.style.setProperty("--fc", f.toFixed(4));
      if (f > 0.5) onSeen();
    },
    [onSeen, F],
  );
  useScrollProgress(sec, onP, !still);
  const W = wide ? 1440 : 390;
  const hills = wide ? HILLS.l : HILLS.m;
  const hill = (k: "tunOrqa" | "tunOld", y: number, h: number) => {
    const [src, ins] = hills[k];
    return (
      <div aria-hidden className="absolute inset-x-0" style={{ top: U(y), height: U(h) }}>
        <div className={st.hillImg} style={{ top: `${-ins[0] * 100}%`, right: `${-ins[1] * 100}%`, bottom: `${-ins[2] * 100}%`, left: `${-ins[3] * 100}%` }}>
          <Img src={src} />
        </div>
      </div>
    );
  };
  const title = t("Sizni kutamiz!");
  const [tx, ty, tw, tfs, tlh] = F.text;
  return (
    <section ref={sec} className={cx(st.sec, st.night, st.secFinal)} style={vars({ zIndex: z, "--u": wide ? CANVAS_L : COL_M })}>
      <div ref={ref} className={cx(st.finalWrap, "relative")} style={vars({ height: U(F.H), ...(still ? { "--fc": 1 } : {}) })}>
        <div aria-hidden className={st.fSkyBox}>
          <div className={st.fSky} />
        </div>
        {F.fw.map(([x, y, w, h, flip, dl], i) => (
          <div key={i} aria-hidden className={st.fBoom} style={vars({ left: U(x), top: U(y), width: U(w), height: U(h), "--fd": dl })}>
            <Img src={`${P}/mushak.webp`} style={flip ? { transform: "scaleX(-1)" } : undefined} />
          </div>
        ))}
        <Art src={`${P}/oy.svg`} box={[F.moon[0], F.moon[1], F.moon[2], F.moon[2]]} ins={INS.moon} className={st.fMoon} />
        {F.stars.map(([x, y, s], i) => (
          <Art key={i} src={`${P}/yulduz.svg`} box={[x, y, s, s]} ins={INS.star} className={st.fStar} style={vars({ "--si": i })} />
        ))}
        <h2 className={cx(st.ye, st.fIn, "absolute inset-x-0 text-center")} style={vars({ top: U(F.title[0]), height: U(F.title[1]), fontSize: U(F.title[2]), lineHeight: `${U(F.title[1])}`, color: "var(--paper)", "--fi": 0 })}>
          <Fit base={F.title[2]} max={W - 30} deps={title}>
            {title}
          </Fit>
        </h2>
        <p className={cx(st.nr, st.fIn, "absolute text-center")} style={vars({ left: U(tx), top: U(ty), width: U(tw), fontSize: U(tfs), lineHeight: `${U(tlh)}`, color: "rgba(251,243,230,.88)", "--fi": 1 })}>
          {t("Shohzodamizning bayramini birga nishonlaylik.")}
        </p>
        <div className="absolute inset-x-0" style={{ top: U(F.family[0]) }}>
          {d.family && (
            <div className={cx(st.ye, st.fIn, "relative text-center")} style={vars({ color: "var(--gold)", "--fi": 2 })}>
              <NameLines text={d.family} base={F.family[2]} max={W - 30} lh={F.family[1]} two={F.family[2] * 0.85} twoLh={F.family[1] * 0.85} />
            </div>
          )}
          {d.dots && (
            <p className={cx(st.nb, st.fIn, "text-center")} style={vars({ marginTop: U(d.family ? F.date[0] - F.family[0] - F.family[1] : 0), height: U(F.date[1]), fontSize: U(F.date[2]), lineHeight: `${U(F.date[1])}`, color: "rgba(251,243,230,.8)", whiteSpace: "nowrap", "--fi": 3 })}>
              <span style={{ letterSpacing: U(F.date[3]), paddingLeft: U(F.date[3]) }}>{d.dots}</span>
            </p>
          )}
        </div>
        {F.cities.map(([x, y, w, h, flip, edge], i) => (
          <div key={i} aria-hidden className={st.fCity} style={{ ...(edge === "r" ? { right: U(W - x - w) } : { left: U(x) }), top: U(y), width: U(w), height: U(h) }}>
            <Img src={`${P}/shahar.webp`} style={{ objectFit: "cover", ...(flip ? { transform: "scaleX(-1)" } : {}) }} />
          </div>
        ))}
        {hill("tunOrqa", F.orqa[0], F.orqa[1])}
        <div aria-hidden className={st.fHorse} style={{ left: U(F.horse[0]), top: U(F.horse[1]), width: U(F.horse[2]), height: U(F.horse[2]) }}>
          <div className={st.sway}>
            <Img src={`${P}/otliq.webp`} style={{ transform: "scaleX(-1)" }} />
          </div>
        </div>
        {hill("tunOld", F.old[0], F.old[1])}
      </div>
    </section>
  );
}

/* ═════════════ Musiqa tugmasi — Figma «Ertak / Musiqa tugmasi»: krem doira, oltin halqa, 3 marjon chiziq ritmda; o‘chirilgan — xira chiziqlar va marjon qiya chiziq ═════════════ */
const BARS: [number, number, number][] = [
  [26, 25, 12],
  [32, 21, 20],
  [38, 24, 14],
];
function ErtakMusic({ m, wide, embedded }: { m: ReturnType<typeof useMusic>; wide: boolean; embedded: boolean }) {
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
      <svg viewBox="8 5 52 52" width={52} height={52} aria-hidden>
        <circle cx="34" cy="31" r="20.5" fill="none" stroke="#E9B44C" />
        {BARS.map(([x, y, h], i) => (
          <rect key={i} x={x} y={y} width={4} height={h} rx={2} className={st.bar} style={vars({ "--i": i })} />
        ))}
        <path d="M24 41L44 21" className={st.strike} />
      </svg>
    </button>
  );
  return embedded ? <div style={{ position: "sticky", top: 0, height: 0, zIndex: 70 }}>{btn}</div> : btn;
}

/* ═════════════ Sahifa ═════════════ */
type Key = "taklif" | "shohzoda" | "sana" | "program" | "venue" | "dress" | "rsvp" | "final";

export function ErtakSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const loaded = usePreload(
    [`${P}/otliq.webp`, `${P}/shahar.webp`, `${P}/quyosh.svg`, `${P}/lenta.svg`, `${P}/mini-tep.svg`, `${P}/mini-old.svg`, `${P}/yulduz.svg`, ...(wide ? [`${P}/fonuslar.webp`] : [])],
    [`${P}/bulut.svg`, `${P}/gulchambar.svg`, `${P}/fonuslar.webp`, d.portrait, d.second, `${P}/toyxona.webp`, `${P}/qozon.webp`, `${P}/karnay.webp`, `${P}/mushak.webp`, `${P}/oy.svg`].filter(Boolean) as string[],
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

  const dimmed = useRef(false);
  const onFinal = useCallback(() => {
    if (dimmed.current) return;
    dimmed.current = true;
    music.dim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown: Key[] = (["taklif", "shohzoda", "sana", "program", "venue", "dress", "rsvp", "final"] as Key[]).filter((k) =>
    k === "shohzoda" ? !!d.portrait : k === "sana" ? d.hasDate : k === "program" ? d.program.length > 0 : k === "dress" ? !!d.dressNote : k === "rsvp" ? data.rsvpEnabled : true,
  );
  const z = (k: Key) => 6 + shown.indexOf(k);
  const linkable = mode !== "preview";
  const colU = wide ? COL_L : COL_M;
  const fu = (n: number) => (wide ? C(n) : U(n));

  return (
    <div ref={root} className={st.root}>
      <div className={st.page} style={vars({ "--u": colU })}>
        <ErtakMusic m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/otliq.webp`} />}
        <div className={cx(st.flow, st.opening)} style={embedded ? vars({ "--o": 1 }) : undefined}>
          {withGate && (loaded ? <Gate d={d} wide={wide} onStart={() => music.play(true)} /> : <div className={st.gateHold} />)}
          {embedded && <Gate d={d} wide={wide} still onStart={() => {}} />}
          <div className={cx(st.openWrap, embedded && st.openStill)} style={{ zIndex: 5 }}>
            <Hero d={d} wide={wide} still={embedded} />
            {withGate && <div className={st.openSpacer} />}
          </div>
          <Taklif d={d} z={z("taklif")} wide={wide} />
          <Shohzoda d={d} z={z("shohzoda")} wide={wide} />
          {/* bulut — 03/04 chokida (laptop: kanvas birligida, ikkala yonda) */}
          {wide && shown.includes("sana") && (
            <div aria-hidden className={st.seamDeco} style={{ zIndex: z("sana") + 1 }}>
              <Art src={`${P}/bulut.svg`} box={[-40, -50, 240, 98.182]} ins={INS.cloud} unit={C} a="cloudL" d={0.05} />
              <Art src={`${P}/bulut.svg`} box={[1240, -50, 240, 98.182]} ins={INS.cloud} unit={C} a="cloudR" d={0.05} flip />
            </div>
          )}
          <Sana d={d} z={z("sana")} wide={wide} />
          <Program d={d} z={z("program")} wide={wide} still={embedded} />
          <Venue d={d} z={z("venue")} wide={wide} linkable={linkable} />
          <Dress d={d} z={z("dress")} wide={wide} />
          {data.rsvpEnabled && <Rsvp d={d} slug={data.slug} mode={mode} z={z("rsvp")} wide={wide} />}
          <Final d={d} z={z("final")} wide={wide} still={embedded} onSeen={onFinal} />
        </div>
        <footer className={cx(st.footer, "flex items-start justify-center")} style={{ height: fu(120), paddingTop: fu(50) }}>
          <p className={cx(st.nr, "text-center")} style={{ fontSize: fu(14), lineHeight: 19 / 14, color: "rgba(251,243,230,.6)" }}>
            <a href="https://shohnoma.uz">Shohnoma</a> · {t("elektron taklifnomalar")}
          </p>
        </footer>
      </div>
    </div>
  );
}
