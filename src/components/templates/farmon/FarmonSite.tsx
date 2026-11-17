"use client";

import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/400-italic.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { splitDate, tashkentDate } from "@/lib/display";
import { musicSrc } from "@/lib/music";
import { tr, useLocale, useT, type Locale } from "@/lib/i18n";
import type { InvitationSiteProps } from "@/components/invitation/types";
import {
  fetchSavedAnswer,
  loadSavedRsvp,
  rsvpUrl,
  saveRsvp,
  type RsvpStatus,
} from "@/components/invitation/Rsvp";
import { guestHello, useGuestName } from "../shared/guest";
import { timerUnits } from "@/components/invitation/data";
import {
  useCountdown,
  useCountUp,
  useInView,
  useScrollProgress,
  useWide,
} from "../shared/hooks";
import { Loader, usePreload, useMusic } from "../shared/runtime";
import { calendarWords, untilPhrase, type ProgramItem } from "../anor/data";
import {
  DEFAULT_MESSAGE,
  DEFAULT_QUOTE,
  DEMO_START,
  DRESS_TEXT,
  FARMON_DEMO,
  FARMON_DEMO_EN,
  FARMON_DEMO_RU,
  P,
  cityFrom,
} from "./data";
import st from "./farmon.module.css";

/* ── Birliklar ──
 * U — joriy `--u`: bo‘limlarda kontent ustuni (Figma mobil 390 koordinatalari; laptopda ustun = mobil × 1.45, ya’ni 565.5px / 1440).
 * C — laptop kanvasi (1440) birligi: yon chiziqlar, yon toj/romb bezaklari, chok rombi.
 * Ochilish (o‘ralgan farmon), hero (ochilgan farmon) va final — o‘z kanvasi (mobil 390×844, laptop 1440×900); ochilish va hero sahnasi
 * bir ekranga sig‘adi va pastki chetga bog‘lanadi. Farmon varag‘i laptopda — mobil × 1.0664 (Figma «Farmon (mobil ×1.07)»): F — varaq birligi. */
const U = (n: number) => `calc(var(--u) * ${+n.toFixed(3)})`;
const F = (n: number) => `calc(var(--fu) * ${+n.toFixed(3)})`;
const C = (n: number) => `calc(100cqw / 1440 * ${+n.toFixed(3)})`;
const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");
const vars = (o: Record<string, string | number | undefined>) =>
  o as CSSProperties;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const COL_M = "calc(100cqw / 390)";
const COL_L = "calc(100cqw / 1440 * 1.45)";
const CANVAS_L = "calc(100cqw / 1440)";

/* ── Ma’lumot (taklifnoma tilida — InvitationSite LocaleProvider’i) ── */
/** Server yaratadigan standart taklif matni (php/api/lib/orders.php DEFAULT_MESSAGE) — har qaysi tilda */
const SERVER_DEFAULT =
  "Aziz mehmonlar! Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.";
const isServerDefault = (m: string) =>
  (["uz", "ru", "en"] as Locale[]).some(
    (l) => tr(l, SERVER_DEFAULT).trim() === m.trim(),
  );
/** «7 yoshda» / «7 лет» / «7 years old» */
function ageText(lang: Locale, raw: string) {
  const n = Math.round(Number(raw));
  if (!raw.trim() || !Number.isFinite(n) || n <= 0 || n > 30) return "";
  if (lang === "ru") {
    const m10 = n % 10;
    const m100 = n % 100;
    const w =
      m10 === 1 && m100 !== 11
        ? "год"
        : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)
          ? "года"
          : "лет";
    return `${n} ${w}`;
  }
  if (lang === "en") return `${n} ${n === 1 ? "year" : "years"} old`;
  return `${n} yoshda`;
}

function useData({
  template,
  data,
  mode,
}: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO =
    lang === "ru"
      ? FARMON_DEMO_RU
      : lang === "en"
        ? FARMON_DEMO_EN
        : FARMON_DEMO;
  const ex = (data.extra ?? {}) as Record<string, unknown>;
  const str = (k: string) =>
    typeof ex[k] === "string"
      ? (ex[k] as string).trim()
      : typeof ex[k] === "number"
        ? String(ex[k])
        : "";
  const sd = splitDate(data.date);
  const guest = useGuestName();
  return useMemo(() => {
    const cw = calendarWords(lang);
    const exProgram = Array.isArray(ex.program)
      ? (ex.program as ProgramItem[]).filter((p) => p?.time && p?.title)
      : [];
    const photos = (data.photos ?? []).filter(Boolean) as string[];
    const date = sd ? new Date(`${sd.iso}T12:00:00Z`) : null;
    const code = str("dressCode") || (demo ? DEMO.dressCode : "");
    const dressNote =
      str("dressNote") || (DRESS_TEXT[code] ? t(DRESS_TEXT[code]) : "");
    // namunadagi ismlar tarjima qilinadi (mijoz ma’lumoti — o‘zgarishsiz)
    const a = ((demo ? t(data.personA) : data.personA) || "").trim();
    // sunnat: personB — ota-ona / xonadon («Karimovlar xonadoni», «Jamshid va Nodira») — imzo sifatida
    const family = (
      (demo && data.personB ? t(data.personB) : data.personB) || ""
    ).trim();
    const time = sd?.time ?? "";
    const program = (
      demo
        ? DEMO.program
        : exProgram.length
          ? exProgram
          : ((data.program ?? []) as ProgramItem[])
    ) as ProgramItem[];
    const raw = (demo ? "" : data.message || "").trim();
    const custom =
      raw && !isServerDefault(raw)
        ? raw
            .replace(
              /^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Muhtaram mehmonlar!|Дорогие гости!|Dear guests!)\s*/,
              "",
            )
            .trim()
        : "";
    const message = custom || (a ? t(DEFAULT_MESSAGE, { name: a }) : "");
    const venueTitle = (
      (demo ? t(data.venueName) : data.venueName) || ""
    ).trim();
    const address = ((demo ? DEMO.address : data.address) || "").trim();
    const city = demo ? DEMO.city : str("city") || cityFrom(address);
    const unq = (s: string) => s.replace(/^["“”«»„]+|["“”«»„]+$/g, "").trim();
    const m = date ? date.getUTCMonth() : 0;
    const year = date ? date.getUTCFullYear() : 0;
    const day = date ? date.getUTCDate() : 0;
    // namunada javob muddati — Figma’dagidek sanadan 2 hafta oldin («1-maygacha»)
    const deadline =
      demo && sd
        ? new Date(Date.UTC(year, m, day - 14)).toISOString().slice(0, 10)
        : data.rsvpDeadline;
    // Figma: hero — portret, «Bizning shahzoda» — otda va do‘ppi, manzil — saroy zali (mijozda: 1–4-suratlar, bo‘lmasa — shablon rasmlari)
    const portrait = demo
      ? `${P}/portret.webp`
      : photos[0] || `${P}/doppi.webp`;
    const big = demo ? `${P}/otda.webp` : photos[1] || "";
    const small = demo ? `${P}/doppi.webp` : photos[2] || `${P}/doppi.webp`;
    const hall = demo ? `${P}/saroy.webp` : photos[3] || `${P}/saroy.webp`;
    return {
      a,
      family,
      /** «Shahzoda Amirxonning» */
      whose: a ? t("Shahzoda {name}ning", { name: a }) : "",
      /** «Shahzoda Amirxon» */
      prince: a ? t("Shahzoda {name}", { name: a }) : "",
      /** «15 · 05 · 2027» */
      dots: sd?.dots ?? "",
      /** «15 · 05 · 2027  ·  TOSHKENT» */
      heroLine: [sd?.dots ?? "", city.toLocaleUpperCase(lang)]
        .filter(Boolean)
        .join("\u00a0\u00a0·\u00a0\u00a0"),
      day: date ? String(day) : "",
      /** «May · Shanba» */
      monthDay: date ? `${cw.months[m]} · ${cw.weekday[date.getUTCDay()]}` : "",
      start: demo
        ? t(DEMO_START)
        : time
          ? t("Soat {time} da boshlanadi", { time })
          : "",
      time,
      hasDate: !!date,
      target: data.date ? tashkentDate(data.date).getTime() : null,
      guest,
      message,
      quote: unq(str("quote")) || t(DEFAULT_QUOTE),
      age: ageText(lang, str("age") || (demo ? DEMO.age : "")),
      venueTitle,
      address,
      hasPlace: !!(venueTitle || address || data.mapUrl),
      mapUrl:
        data.mapUrl ||
        `https://yandex.uz/maps/?text=${encodeURIComponent([venueTitle, address].filter(Boolean).join(", "))}`,
      program,
      dressNote,
      portrait,
      big,
      small,
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
function useReveal(
  root: React.RefObject<HTMLDivElement | null>,
  ready: boolean,
  all: boolean,
) {
  useEffect(() => {
    const el = root.current;
    if (!el || !ready) return;
    const SEL = "[data-a]:not([data-in])";
    if (all) {
      el.querySelectorAll<HTMLElement>(SEL).forEach((x) =>
        x.setAttribute("data-in", ""),
      );
      return;
    }
    let list: HTMLElement[] = [];
    let raf = 0;
    const check = () => {
      raf = 0;
      const line = window.innerHeight * 0.9;
      const atEnd =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 4;
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
      list = Array.from(el.querySelectorAll<HTMLElement>(SEL)).filter(
        (x) => !x.closest(`.${st.gateWrap}`) && !x.closest(`.${st.openWrap}`),
      );
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

function Img({
  src,
  className,
  style,
  eager,
}: {
  src: string;
  className?: string;
  style?: CSSProperties;
  eager?: boolean;
}) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={cx(st.img, className)}
      style={style}
    />
  );
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
    <span
      ref={ref}
      className={cx("inline-block whitespace-nowrap", className)}
      style={style}
    >
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
  return (
    <div className={className} style={style}>
      <span
        ref={probe}
        aria-hidden
        className="pointer-events-none absolute whitespace-nowrap"
        style={{ visibility: "hidden", fontSize: unit(base), left: 0, top: 0 }}
      >
        {text}
      </span>
      {rows.map((r, i) => (
        <span
          key={i}
          className="block"
          style={{
            height: unit(h),
            lineHeight: `${unit(h)}`,
            fontSize: unit(fs),
            whiteSpace: "nowrap",
          }}
        >
          <Fit base={fs} max={max} unit={unit} deps={`${r}|${fs}`}>
            {r}
          </Fit>
        </span>
      ))}
    </div>
  );
}

/** Matn qutiga (eni va bo‘yi) sig‘maguncha shrift bosqichma-bosqich kichrayadi */
function FitBox({
  children,
  base,
  min,
  lh,
  className,
  style,
  deps,
}: {
  children: ReactNode;
  base: number;
  min: number;
  lh: number;
  className?: string;
  style?: CSSProperties;
  deps: unknown;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useIso(() => {
    const el = ref.current;
    const inner = el?.firstElementChild as HTMLElement | null;
    if (!el || !inner) return;
    const over = () =>
      inner.scrollHeight > el.clientHeight + 1 ||
      inner.scrollWidth > el.clientWidth + 1;
    const measure = () => {
      let f = base;
      const set = () => {
        el.style.fontSize = U(f);
        el.style.lineHeight = U((f * lh) / base);
      };
      set();
      while (f > min && over()) {
        f = +(f - 0.5).toFixed(1);
        set();
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [base, min, lh, deps]);
  return (
    <div ref={ref} className={className} style={style}>
      <p style={{ width: "100%", overflowWrap: "anywhere" }}>{children}</p>
    </div>
  );
}

/* ═════════════ Oltin vektor bezaklar (Figma «Farmon / Bezak · …») — chiziladi (stroke-dashoffset), romblar «pop» ═════════════ */
type Orient = "tl" | "tr" | "bl" | "br";
const ORIENT: Record<Orient, string | undefined> = {
  tl: undefined,
  tr: "scaleX(-1)",
  bl: "scaleY(-1)",
  br: "rotate(180deg)",
};

/** Burchak bezagi (72×72 asosida) */
function Corner({
  x,
  y,
  s,
  o,
  unit = U,
  a = "draw",
  d = 0,
  className,
  style,
}: {
  x: number;
  y: number;
  s: number;
  o: Orient;
  unit?: (n: number) => string;
  a?: string | null;
  d?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden
      data-a={a ?? undefined}
      className={cx(st.art, st.draw, className)}
      style={vars({
        left: unit(x),
        top: unit(y),
        width: unit(s),
        height: unit(s),
        "--d": `${d}s`,
        ...(style as Record<string, string>),
      })}
    >
      <svg
        viewBox="0 0 72 72"
        className={st.svg}
        style={{ transform: ORIENT[o] }}
      >
        <path data-s d="M1 71V1H71" pathLength={1} strokeWidth="1.5" />
        <path data-s d="M9 71V9H71" pathLength={1} strokeWidth="0.75" />
        <path
          data-s
          d="M22 9C22 18 18 22 9 22"
          pathLength={1}
          strokeWidth="1"
        />
        <path
          data-s
          d="M34 9C34 26 26 34 9 34"
          pathLength={1}
          strokeWidth="0.75"
        />
        <path data-f d="M9 1L13 5L9 9L5 5L9 1Z" />
      </svg>
    </div>
  );
}
/** To‘rt burchak (quti ichida, chetdan `m` masofada) */
function Corners({
  w,
  h,
  s,
  m,
  unit = U,
  a = "draw",
  d = 0,
}: {
  w: number;
  h: number;
  s: number;
  m: number;
  unit?: (n: number) => string;
  a?: string | null;
  d?: number;
}) {
  return (
    <>
      <Corner x={m} y={m} s={s} o="tl" unit={unit} a={a} d={d} />
      <Corner x={w - m - s} y={m} s={s} o="tr" unit={unit} a={a} d={d + 0.08} />
      <Corner x={m} y={h - m - s} s={s} o="bl" unit={unit} a={a} d={d + 0.16} />
      <Corner
        x={w - m - s}
        y={h - m - s}
        s={s}
        o="br"
        unit={unit}
        a={a}
        d={d + 0.24}
      />
    </>
  );
}

/** Ajratgich (240×20 asosida): chiziqlar markazdan chetga chiziladi, romblar «pop» */
function Divider({
  x,
  y,
  w,
  unit = U,
  a = "draw",
  d = 0,
  className,
  style,
}: {
  x: number;
  y: number;
  w: number;
  unit?: (n: number) => string;
  a?: string | null;
  d?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden
      data-a={a ?? undefined}
      className={cx(st.art, st.draw, className)}
      style={vars({
        left: unit(x),
        top: unit(y),
        width: unit(w),
        height: unit(w / 12),
        "--d": `${d}s`,
        ...(style as Record<string, string>),
      })}
    >
      <svg
        viewBox="0 0 241 20"
        preserveAspectRatio="none"
        className={st.svg}
        style={{ left: "-0.21%", width: "100.42%" }}
      >
        <path data-s d="M96.5 10H0.5" pathLength={1} strokeWidth="1" />
        <path data-s d="M144.5 10H240.5" pathLength={1} strokeWidth="1" />
        <path data-f d="M120.5 1L129.5 10L120.5 19L111.5 10L120.5 1Z" />
        <path
          data-f
          data-k="1"
          d="M104.5 10L108.5 6L112.5 10L108.5 14L104.5 10Z"
        />
        <path
          data-f
          data-k="1"
          d="M128.5 10L132.5 6L136.5 10L132.5 14L128.5 10Z"
        />
      </svg>
    </div>
  );
}

/** Toj belgisi (64×44 asosida; Figma eksporti eni 66 — chetlarida 1.56%) */
function TojMark({
  x,
  y,
  w,
  unit = U,
  a = "draw",
  d = 0,
  className,
  style,
}: {
  x: number;
  y: number;
  w: number;
  unit?: (n: number) => string;
  a?: string | null;
  d?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden
      data-a={a ?? undefined}
      className={cx(st.art, st.draw, className)}
      style={vars({
        left: unit(x),
        top: unit(y),
        width: unit(w),
        height: unit((w * 44) / 64),
        "--d": `${d}s`,
        ...(style as Record<string, string>),
      })}
    >
      <svg
        viewBox="0 0 66 44"
        preserveAspectRatio="none"
        className={st.svg}
        style={{ left: "-1.5625%", width: "103.125%" }}
      >
        <path
          data-s
          d="M7 36L3 10L19 24L33 4L47 24L63 10L59 36H7Z"
          pathLength={1}
          strokeWidth="1.3"
        />
        <path data-s d="M7 42H59" pathLength={1} strokeWidth="1.3" />
        <circle data-f cx="3" cy="10" r="3" />
        <circle data-f cx="33" cy="4" r="3" />
        <circle data-f cx="63" cy="10" r="3" />
      </svg>
    </div>
  );
}

/** Romb belgi (28×28 asosida) */
function Romb({
  x,
  y,
  s,
  unit = U,
  a = "pop",
  d = 0,
  className,
  style,
}: {
  x: number;
  y: number;
  s: number;
  unit?: (n: number) => string;
  a?: string | null;
  d?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden
      data-a={a ?? undefined}
      className={cx(st.art, className)}
      style={vars({
        left: unit(x),
        top: unit(y),
        width: unit(s),
        height: unit(s),
        "--d": `${d}s`,
        ...(style as Record<string, string>),
      })}
    >
      <svg viewBox="0 0 28 28" className={st.svg}>
        <path
          d="M14 1L27 14L14 27L1 14L14 1Z"
          fill="none"
          stroke="#C8A25A"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M14 7L21 14L14 21L7 14L14 7Z" fill="#C8A25A" />
      </svg>
    </div>
  );
}

/** Sakkizburchak ramka (88×88 asosida) */
function Octagon({ spin }: { spin?: boolean }) {
  return (
    <svg
      viewBox="0 0 88 88"
      className={cx(st.svg, spin && st.spin)}
      aria-hidden
    >
      <path
        d="M83.73 60.46L60.46 83.73H27.54L4.27 60.46V27.54L27.54 4.27H60.46L83.73 27.54V60.46Z"
        fill="none"
        stroke="#C8A25A"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M78.18 58.16L58.16 78.18H29.84L9.82 58.16V29.84L29.84 9.82H58.16L78.18 29.84V58.16Z"
        fill="none"
        stroke="#C8A25A"
        strokeWidth="0.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Ravoq (yuqorisi yarim doira) ramka — pastki markazdan ikki tomonga chiziladi. w×h, stroke — birlikda */
function ArchFrame({
  w,
  h,
  sw,
  className,
  style,
  a,
  d,
}: {
  w: number;
  h: number;
  sw: number;
  className?: string;
  style?: CSSProperties;
  a?: string;
  d?: number;
}) {
  const r = w / 2 - sw / 2;
  const k = sw / 2;
  return (
    <div
      aria-hidden
      data-a={a ?? undefined}
      className={cx(st.art, st.draw, className)}
      style={vars({
        ...(style as Record<string, string>),
        "--d": d != null ? `${d}s` : undefined,
      })}
    >
      <svg viewBox={`0 0 ${w} ${h}`} className={st.svg} overflow="visible">
        <path
          data-s
          data-arch
          d={`M${w / 2} ${h - k}H${k}V${w / 2}A${r} ${r} 0 0 1 ${w / 2} ${k}`}
          pathLength={1}
          strokeWidth={sw}
        />
        <path
          data-s
          data-arch
          d={`M${w / 2} ${h - k}H${w - k}V${w / 2}A${r} ${r} 0 0 0 ${w / 2} ${k}`}
          pathLength={1}
          strokeWidth={sw}
        />
      </svg>
    </div>
  );
}
/** To‘rtburchak ramka — yuqori markazdan ikki tomonga chiziladi */
function RectFrame({
  w,
  h,
  sw,
  className,
  style,
  a,
  d,
}: {
  w: number;
  h: number;
  sw: number;
  className?: string;
  style?: CSSProperties;
  a?: string;
  d?: number;
}) {
  const k = sw / 2;
  return (
    <div
      aria-hidden
      data-a={a ?? undefined}
      className={cx(st.art, st.draw, className)}
      style={vars({
        ...(style as Record<string, string>),
        "--d": d != null ? `${d}s` : undefined,
      })}
    >
      <svg viewBox={`0 0 ${w} ${h}`} className={st.svg} overflow="visible">
        <path
          data-s
          d={`M${w / 2} ${k}H${k}V${h - k}H${w / 2}`}
          pathLength={1}
          strokeWidth={sw}
        />
        <path
          data-s
          d={`M${w / 2} ${k}H${w - k}V${h - k}H${w / 2}`}
          pathLength={1}
          strokeWidth={sw}
        />
      </svg>
    </div>
  );
}

/* ═════════════ Bo‘lim va laptop yon bezaklari ═════════════ */
/**
 * Laptop yon bezaklari (1440 kanvas, bo‘lim balandligiga nisbatan): ikki vertikal oltin chiziq (o‘rtada 100 px oraliq),
 * oraliqda toj belgisi + ikki romb («toj») yoki katta romb («romb»). O‘ng tomon — ko‘zgu (Figma x 233 / 1207).
 */
function SideDeco({
  kind,
  unit = C,
  H,
  o,
}: {
  kind: "toj" | "romb";
  unit?: (n: number) => string;
  H?: number;
  o?: boolean;
}) {
  const mid = (dy: number) =>
    H != null ? unit(H / 2 + dy) : `calc(50% + ${unit(dy)})`;
  const len = H != null ? unit(H / 2 - 140) : `calc(50% - ${unit(140)})`;
  const side = (x: number, k: number) => (
    <div key={x} aria-hidden>
      <span
        data-a={o ? undefined : "lineUp"}
        className={cx(st.sideLine, o && st.oLineUp)}
        style={vars({
          left: unit(x),
          top: unit(90),
          height: len,
          width: unit(1),
          "--d": `${0.05 + k * 0.1}s`,
        })}
      />
      <span
        data-a={o ? undefined : "lineDown"}
        className={cx(st.sideLine, o && st.oLineDown)}
        style={vars({
          left: unit(x),
          top: mid(50),
          height: len,
          width: unit(1),
          "--d": `${0.05 + k * 0.1}s`,
        })}
      />
      {kind === "toj" ? (
        <>
          <TojMark
            x={x - 32}
            y={0}
            w={64}
            unit={unit}
            a={o ? null : "draw"}
            d={0.3 + k * 0.1}
            className={o ? st.oFade : undefined}
            style={{ top: mid(-42) }}
          />
          <Romb
            x={x - 10}
            y={0}
            s={20}
            unit={unit}
            a={o ? null : "spin"}
            d={0.45 + k * 0.1}
            className={o ? st.oSpin : undefined}
            style={{ top: mid(-120) }}
          />
          <Romb
            x={x - 10}
            y={0}
            s={20}
            unit={unit}
            a={o ? null : "spin"}
            d={0.55 + k * 0.1}
            className={o ? st.oSpin : undefined}
            style={{ top: mid(40) }}
          />
        </>
      ) : (
        <Romb
          x={x - 15}
          y={0}
          s={30}
          unit={unit}
          a={o ? null : "spin"}
          d={0.35 + k * 0.1}
          className={o ? st.oSpin : undefined}
          style={{ top: mid(-15) }}
        />
      )}
    </div>
  );
  return (
    <div aria-hidden className={st.deco}>
      {side(233, 0)}
      {side(1207, 1)}
    </div>
  );
}

/** Chok rombi — bo‘limlar chegarasida (Figma «Romb · chok ustida»: mobil 26, laptop 30); paydo bo‘lishda yengil aylanadi */
function Seam({ wide }: { wide: boolean }) {
  const s = wide ? 30 : 26;
  const u = wide ? C : U;
  return (
    <div
      aria-hidden
      className={st.seam}
      style={{
        top: u(-s / 2),
        width: u(s),
        height: u(s),
        marginLeft: u(-s / 2),
      }}
    >
      <Romb x={0} y={0} s={s} unit={u} a="spin" />
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
  wide,
  onP,
  className,
  seam = true,
}: {
  children: ReactNode;
  z: number;
  bg: "ivory" | "emerald";
  colStyle?: CSSProperties;
  id?: string;
  deco?: "toj" | "romb";
  wide: boolean;
  onP?: (p: number, r: DOMRect, el: HTMLElement) => void;
  className?: string;
  seam?: boolean;
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
    <section
      ref={ref}
      id={id}
      className={cx(st.sec, st[bg], className)}
      style={{ zIndex: z }}
    >
      {wide && deco && <SideDeco kind={deco} />}
      {seam && <Seam wide={wide} />}
      <div className={st.col} style={{ width: U(390), ...colStyle }}>
        {children}
      </div>
    </section>
  );
}

/** Sarlavha (Playfair Display, markazda, 360 da sig‘adi) */
function Title({
  text,
  top,
  fs = 32,
  h = 43,
  color = "var(--emerald)",
  italic,
  d = 0,
  style,
}: {
  text: string;
  top?: number;
  fs?: number;
  h?: number;
  color?: string;
  italic?: boolean;
  d?: number;
  style?: CSSProperties;
}) {
  return (
    <p
      data-a="up"
      className={cx(
        italic ? st.pfi : st.pf,
        "text-center",
        top != null && "absolute inset-x-0",
      )}
      style={vars({
        top: top != null ? U(top) : undefined,
        height: U(h),
        fontSize: U(fs),
        lineHeight: `${U(h)}`,
        color,
        "--d": `${d}s`,
        ...(style as Record<string, string>),
      })}
    >
      <Fit base={fs} max={366} deps={text}>
        {text}
      </Fit>
    </p>
  );
}

/* ═════════════ 00 · Ochilish — o‘ralgan farmon: toj yorishadi, muhr yorilib tushadi, zar ip sirg‘alib tushadi,
 * o‘ram yuqoriga ko‘tarilib ikki tayoqqa aylanadi; keyin (hero’da) pastki tayoq tushib, varaq yuqoridan pastga ochiladi.
 * Hammasi scroll bilan (--o: 0…1); ochilish sahnasining o‘z foni yo‘q — fon hero’niki (bir xil zumrad), shuning uchun «sharpa» bo‘lmaydi. ═════════════ */
const GATE = {
  m: {
    W: 390,
    H: 844,
    corner: [20, 64] as const,
    crown: [131, 106, 128] as const,
    roll: [10, 286.7768, 370, 246.4464] as const,
    whose: [566, 29, 22, 370] as const,
    big: [598, 56, 42, 370] as const,
    div: [105, 668.5, 180] as const,
    date: [702, 19, 14, 4] as const,
    seam: 26,
  },
  l: {
    W: 1440,
    H: 900,
    corner: [40, 96] as const,
    crown: [630, 90, 180] as const,
    roll: [440, 243.5, 560, 373] as const,
    whose: [636, 40, 30, 1300] as const,
    big: [680, 85, 64, 1300] as const,
    div: [600, 782, 240] as const,
    date: [818, 22, 16, 5] as const,
    seam: 30,
  },
} as const;
/** Farmon varag‘i (Figma mobil 01 hero koordinatalari): laptopda × k, chapdan ox */
const SHEET = {
  m: { ox: 0, k: 1 },
  l: { ox: 512.0616, k: 415.877 / 390 },
} as const;
/** O‘ram rasmidagi o‘ram tanasi (rasm ulushida: chap, yuqori, en, bo‘y) — tayoqlarga aylanishi uchun */
const BODY = [60 / 1536, 340 / 1024, 1415 / 1536, 263 / 1024] as const;

/** O‘ram → tayoqlar: tashuvchi quti (yakunda — yuqori tayoq + uning ostidagi pastki tayoq), boshlanishda o‘ram tanasi ustida */
function carrierGeo(wide: boolean) {
  const g = wide ? GATE.l : GATE.m;
  const { ox, k } = wide ? SHEET.l : SHEET.m;
  const [rx, ry, rw, rh] = g.roll;
  const car = { x: ox + 14 * k, y: 52 * k, w: 362 * k, h: 68 * k };
  const body = {
    x: rx + rw * BODY[0],
    y: ry + rh * BODY[1],
    w: rw * BODY[2],
    h: rh * BODY[3],
  };
  const s0 = body.w / car.w;
  const dx = body.x + body.w / 2 - (car.x + car.w / 2);
  const dy = body.y + body.h / 2 - (car.y + car.h / 2);
  // o‘ram rasmi tashuvchi ichida (boshlanishda asl joyida ko‘rinadi): markaz siljishi va o‘lcham ÷ s0
  const img = {
    w: rw / s0,
    h: rh / s0,
    cx: car.w / 2 + (rx + rw / 2 - (body.x + body.w / 2)) / s0,
    cy: car.h / 2 + (ry + rh / 2 - (body.y + body.h / 2)) / s0,
  };
  return { car, s0, dx, dy, img };
}

function Gate({
  d,
  wide,
  onStart,
  still = false,
}: {
  d: D;
  wide: boolean;
  onStart: () => void;
  still?: boolean;
}) {
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
      const stage =
        (el.firstElementChild as HTMLElement | null)?.offsetHeight ||
        window.innerHeight;
      const D = Math.max(1, r.height - stage);
      target = clamp01(-r.top / D);
    };
    const apply = (o: number) => {
      host.style.setProperty("--o", o.toFixed(4));
      el.style.pointerEvents = o > 0.2 ? "none" : "";
      el.style.visibility = o > 0.3 ? "hidden" : "";
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
  const box = (x: number, y: number, w: number, h: number): CSSProperties => ({
    left: X(x),
    top: Y(y),
    width: U(w),
    height: U(h),
  });
  const [rx, ry, rw, rh] = G.roll;
  const geo = carrierGeo(wide);
  const [cm, cs] = G.corner;
  const [kx, ky, ks] = G.crown;
  const [wT, wH, wF, wMax] = G.whose;
  const [bT, bH, bF, bMax] = G.big;
  const [dT, dH, dF, dLs] = G.date;
  const big = t("sunnat to‘yi");
  // burchaklar — mobil ochilishda (hero’da yo‘q, so‘nadi); laptopda hero’da ham aynan shu joyda — fon bilan birga so‘nadi
  const corners = true;
  return (
    <div
      ref={wrap}
      className={cx(st.gateWrap, still && st.still)}
      style={vars(
        still
          ? { "--u": pageU, "--o": 0, height: U(H), marginBottom: 0 }
          : { "--u": `min(${pageU}, calc(100svh / ${H}))` },
      )}
    >
      <div
        className={st.gate}
        aria-label={t("Taklifnoma")}
        style={still ? { position: "relative", height: "100%" } : undefined}
      >
        <div aria-hidden className={st.gBg} />
        {corners && (
          <div aria-hidden className={cx(st.gCorners, wide && st.gCornersL)}>
            {(
              [
                [cm, cm, "tl"],
                [W - cm - cs, cm, "tr"],
                [cm, H - cm - cs, "bl"],
                [W - cm - cs, H - cm - cs, "br"],
              ] as const
            ).map(([x, y, o], i) => (
              <div
                key={o}
                className={st.gIn}
                style={vars({
                  ...box(x, y, cs, cs),
                  position: "absolute",
                  "--gd": `${0.3 + i * 0.08}s`,
                })}
              >
                <Corner
                  x={0}
                  y={0}
                  s={cs}
                  o={o}
                  a={null}
                  className={st.gDraw}
                />
              </div>
            ))}
          </div>
        )}
        {/* oltin toj: yorishadi (glow), so‘ng yuqoriga ko‘tarilib so‘nadi */}
        <div
          aria-hidden
          className={st.gCrown}
          style={{ ...box(kx, ky, ks, ks), position: "absolute" }}
        >
          <div
            className={cx(st.gIn, st.gCrownIn)}
            style={vars({ "--gd": "0.15s" })}
          >
            <span className={st.glow} />
            <Img src={`${P}/toj.webp`} eager className={st.contain} />
          </div>
        </div>
        {/* o‘ram: tana (tashuvchida — yuqoriga ko‘tarilib tayoqlarga aylanadi), zar ip va muhr — alohida qatlam */}
        <div
          aria-hidden
          className={cx(st.gIn, st.gRollIn)}
          style={vars({ position: "absolute", inset: 0, "--gd": "0.35s" })}
        >
          <div
            className={st.carrier}
            style={vars({
              ...box(geo.car.x, geo.car.y, geo.car.w, geo.car.h),
              position: "absolute",
              "--dx": geo.dx.toFixed(3),
              "--dy": geo.dy.toFixed(3),
              "--s0": geo.s0.toFixed(4),
            })}
          >
            <div
              className={st.rollBody}
              style={{
                position: "absolute",
                left: U(geo.img.cx - geo.img.w / 2),
                top: U(geo.img.cy - geo.img.h / 2),
                width: U(geo.img.w),
                height: U(geo.img.h),
              }}
            >
              <Img src={`${P}/oram-bare.webp`} eager className={st.fill} />
            </div>
          </div>
          <div
            className={st.cord}
            style={{ ...box(rx, ry, rw, rh), position: "absolute" }}
          >
            <Img src={`${P}/oram-ip.webp`} eager className={st.fill} />
          </div>
          <div
            className={st.seal}
            style={{ ...box(rx, ry, rw, rh), position: "absolute" }}
          >
            <div className={cx(st.sealHalf, st.sealL)}>
              <Img src={`${P}/oram-seal.webp`} eager className={st.fill} />
            </div>
            <div className={cx(st.sealHalf, st.sealR)}>
              <Img src={`${P}/oram-seal.webp`} eager className={st.fill} />
            </div>
          </div>
        </div>
        <div className={st.gText}>
          {d.whose && (
            <div
              className={cx(st.pfi, st.gIn, "absolute inset-x-0 text-center")}
              style={vars({
                bottom: U(H - wT - wH),
                color: "var(--gold)",
                "--gd": "0.9s",
              })}
            >
              <NameLines
                text={d.whose}
                base={wF}
                max={wMax}
                lh={wH}
                two={wF * 0.82}
                twoLh={wH * 0.82}
              />
            </div>
          )}
          <h1
            className={cx(st.pf, st.gIn, "absolute inset-x-0 text-center")}
            style={vars({
              top: Y(bT),
              height: U(bH),
              fontSize: U(bF),
              lineHeight: `${U(bH)}`,
              color: "var(--ivory)",
              "--gd": "1s",
            })}
          >
            <Fit base={bF} max={bMax} deps={big}>
              {big}
            </Fit>
          </h1>
          <div
            className={st.gIn}
            style={vars({ position: "absolute", inset: 0, "--gd": "1.1s" })}
          >
            <Divider
              x={0}
              y={0}
              w={G.div[2]}
              a={null}
              className={st.gDraw}
              style={{ left: X(G.div[0]), top: Y(G.div[1]) }}
            />
          </div>
          {d.dots && (
            <p
              className={cx(st.msM, st.gIn, "absolute inset-x-0 text-center")}
              style={vars({
                top: Y(dT),
                height: U(dH),
                fontSize: U(dF),
                lineHeight: `${U(dH)}`,
                color: "var(--gold)",
                whiteSpace: "nowrap",
                "--gd": "1.2s",
              })}
            >
              <span style={{ letterSpacing: U(dLs), paddingLeft: U(dLs) }}>
                {d.dots}
              </span>
            </p>
          )}
        </div>
        {/* 00/01 chokidagi romb (pastki chetda) */}
        <div aria-hidden className={st.gText}>
          <div
            className={st.gIn}
            style={vars({ position: "absolute", inset: 0, "--gd": "1.3s" })}
          >
            <Romb
              x={0}
              y={0}
              s={G.seam}
              a={null}
              style={{ left: X(W / 2 - G.seam / 2), top: Y(H - G.seam / 2) }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════ 01 · Hero — ochilgan farmon (ochilish ostida sticky; --o bilan): o‘ramdan ikki tayoq, pastki tayoq tushadi,
 * pergament yuqoridan pastga ochiladi; «Shohona farmon» siyoh bilan yoziladi, surat 1.08 → 1, oltin ravoq chiziladi, muhr bosiladi ═════════════ */
function Hero({ d, wide, still }: { d: D; wide: boolean; still: boolean }) {
  const t = useT();
  const W = wide ? 1440 : 390;
  const H = wide ? 900 : 844;
  const pageU = wide ? CANVAS_L : COL_M;
  const { k } = wide ? SHEET.l : SHEET.m;
  const X = (x: number) => `calc(50% + ${U(x - W / 2)})`;
  const Y = (y: number) => `calc(100% - ${U(H - y)})`;
  const geo = carrierGeo(wide);
  const sunnat = t("sunnat to‘yi");
  const title = t("Shohona farmon");
  return (
    <div
      className={cx(st.hero, still && st.heroStill)}
      style={vars(
        still
          ? { "--u": pageU, "--fu": `calc(var(--u) * ${k})`, height: U(H) }
          : {
              "--u": `min(${pageU}, calc(100svh / ${H}))`,
              "--fu": `calc(var(--u) * ${k})`,
            },
      )}
    >
      {wide && (
        <div
          aria-hidden
          className={st.hDeco}
          style={{ left: X(0), top: Y(0), width: U(W), height: U(H) }}
        >
          <Corners w={W} h={H} s={96} m={40} a={null} />
          <SideDeco kind="toj" unit={U} H={H} o />
        </div>
      )}
      {/* tashuvchi: yuqori tayoq + pastki tayoq (o‘ram o‘rnidan ko‘tariladi) */}
      <div
        aria-hidden
        className={cx(st.carrier, st.rods)}
        style={vars({
          left: X(geo.car.x),
          top: Y(geo.car.y),
          width: U(geo.car.w),
          height: U(geo.car.h),
          "--dx": geo.dx.toFixed(3),
          "--dy": geo.dy.toFixed(3),
          "--s0": geo.s0.toFixed(4),
        })}
      >
        <div
          className={st.sheetSh}
          style={{ left: F(14), top: F(18), width: F(334), height: F(704) }}
        >
          <div className={st.sheet}>
            <div className={st.parch} />
            <span
              className={st.pBorder}
              style={{
                left: F(14),
                top: F(14),
                width: F(306),
                height: F(676),
                borderWidth: F(1),
              }}
            />
            <span
              className={st.pBorder}
              style={{
                left: F(20),
                top: F(20),
                width: F(294),
                height: F(664),
                borderWidth: F(0.5),
              }}
            />
            <TojMark x={142} y={54.8125} w={50} unit={F} a={null} />
            <p
              className={cx(st.pf, "absolute inset-x-0 text-center")}
              style={{
                top: F(104),
                height: F(43),
                fontSize: F(32),
                lineHeight: `${F(43)}`,
                color: "var(--burg)",
              }}
            >
              <Fit base={32} max={290} unit={F} deps={title} className={st.ink}>
                {title}
              </Fit>
            </p>
            <Divider x={82} y={158.9167} w={170} unit={F} a={null} />
            <div
              className={st.hPhoto}
              style={{
                left: F(55),
                top: F(198),
                width: F(224),
                height: F(304),
                borderRadius: `${F(112)} ${F(112)} 0 0`,
              }}
            >
              <Img
                src={d.portrait}
                eager
                className={st.zoomIn}
                style={{ objectPosition: "50% 30%" }}
              />
            </div>
            <ArchFrame
              w={240}
              h={320}
              sw={1.2}
              className={st.hArch}
              style={{
                left: F(47),
                top: F(190),
                width: F(240),
                height: F(320),
              }}
            />
            {/* ism (uzun bo‘lsa — 2 qator), «sunnat to‘yi», sana · shahar — ketma-ket (Figma: 528 / 572 / 614) */}
            <div
              className="absolute flex flex-col items-stretch text-center"
              style={{ left: F(14), right: F(14), top: F(528) }}
            >
              {d.prince && (
                <NameLines
                  text={d.prince}
                  base={32}
                  max={290}
                  lh={43}
                  two={22}
                  twoLh={27.5}
                  unit={F}
                  className={st.pf}
                  style={{ color: "var(--ink)" }}
                />
              )}
              <p
                className={st.pfi}
                style={{
                  marginTop: F(d.prince ? 1 : 0),
                  height: F(29),
                  fontSize: F(22),
                  lineHeight: `${F(29)}`,
                  color: "var(--burg)",
                }}
              >
                <Fit base={22} max={290} unit={F} deps={sunnat}>
                  {sunnat}
                </Fit>
              </p>
              {d.heroLine && (
                <p
                  className={st.msM}
                  style={{
                    marginTop: F(13),
                    height: F(18),
                    fontSize: F(13),
                    lineHeight: `${F(18)}`,
                    color: "var(--mute)",
                    whiteSpace: "pre",
                  }}
                >
                  <Fit
                    base={13}
                    max={290}
                    unit={F}
                    deps={d.heroLine}
                    style={{ letterSpacing: F(3), paddingLeft: F(3) }}
                  >
                    {d.heroLine}
                  </Fit>
                </p>
              )}
            </div>
          </div>
        </div>
        <div className={st.rodTop}>
          <span
            className={st.rod}
            style={{
              left: 0,
              top: 0,
              width: F(362),
              height: F(34),
              borderRadius: F(17),
            }}
          />
          <span
            className={st.knob}
            style={{ left: F(-10), top: F(7), width: F(20), height: F(20) }}
          />
          <span
            className={st.knob}
            style={{ left: F(352), top: F(7), width: F(20), height: F(20) }}
          />
        </div>
        <div
          className={st.rodBot}
          style={{
            position: "absolute",
            left: 0,
            top: F(34),
            width: F(362),
            height: F(34),
          }}
        >
          <span
            className={st.rod}
            style={{
              left: 0,
              top: 0,
              width: F(362),
              height: F(34),
              borderRadius: F(17),
            }}
          />
          <span
            className={st.knob}
            style={{ left: F(-10), top: F(7), width: F(20), height: F(20) }}
          />
          <span
            className={st.knob}
            style={{ left: F(352), top: F(7), width: F(20), height: F(20) }}
          />
          <div
            className={st.hSeal}
            style={{ left: F(142), top: F(-7), width: F(78), height: F(78) }}
          >
            <Img src={`${P}/muhr.webp`} eager className={st.contain} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════ 02 · Taklif — murojaat, taklif matni, imzo ═════════════ */
function Taklif({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const hello = d.guest
    ? guestHello(t, "Muhtaram {guest}!", d.guest)
    : t("Muhtaram mehmonlar!");
  return (
    <Sec
      z={z}
      bg="ivory"
      wide={wide}
      deco="romb"
      colStyle={{ paddingTop: U(96), paddingBottom: U(92.19) }}
    >
      <Corner x={20} y={20} s={56} o="tl" />
      <Corner x={314} y={20} s={56} o="tr" d={0.08} />
      <Corner
        x={20}
        y={0}
        s={56}
        o="bl"
        d={0.16}
        style={{ top: "auto", bottom: U(20) }}
      />
      <Corner
        x={314}
        y={0}
        s={56}
        o="br"
        d={0.24}
        style={{ top: "auto", bottom: U(20) }}
      />
      <Title text={hello} fs={30} h={40} />
      <div
        className="relative"
        style={{ marginTop: U(16.92), height: U(14.167) }}
      >
        <Divider x={110} y={0} w={170} d={0.15} />
      </div>
      {d.message && (
        <p
          data-a="up"
          className={cx(st.ms, "mx-auto text-center")}
          style={vars({
            marginTop: U(24.92),
            width: U(316),
            fontSize: U(17),
            lineHeight: `${U(28)}`,
            color: "var(--ink)",
            overflowWrap: "anywhere",
            "--d": "0.2s",
          })}
        >
          {d.message}
        </p>
      )}
      {d.family && (
        <>
          <p
            data-a="up"
            className={cx(st.pfi, "text-center")}
            style={vars({
              marginTop: U(d.message ? 86 : 40),
              height: U(24),
              fontSize: U(18),
              lineHeight: `${U(24)}`,
              color: "var(--mute)",
              "--d": "0.1s",
            })}
          >
            {t("Hurmat bilan,")}
          </p>
          <div
            data-a="up"
            className={cx(st.pf, "relative text-center")}
            style={vars({
              marginTop: U(4),
              color: "var(--emerald)",
              "--d": "0.18s",
            })}
          >
            <NameLines
              text={d.family}
              base={26}
              max={330}
              lh={35}
              two={22}
              twoLh={29}
            />
          </div>
        </>
      )}
      <div
        className="relative"
        style={{
          marginTop: U(d.family ? 35.19 : d.message ? 60 : 30),
          height: U(31.625),
        }}
      >
        <TojMark x={172} y={0} w={46} d={0.2} />
      </div>
    </Sec>
  );
}

/* ═════════════ 03 · Bizning shahzoda — ravoqdagi surat, kichik surat, ism, yosh, iqtibos ═════════════ */
function Shahzoda({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  if (!d.big) return null;
  return (
    <Sec
      z={z}
      bg="emerald"
      wide={wide}
      deco="toj"
      colStyle={{ height: U(780) }}
    >
      <Title text={t("Bizning shahzoda")} top={56} color="var(--ivory)" />
      <div
        data-a="fade"
        className={cx(st.photoBox, "absolute overflow-hidden")}
        style={vars({
          left: U(65),
          top: U(130),
          width: U(260),
          height: U(380),
          borderRadius: `${U(130)} ${U(130)} 0 0`,
          "--d": "0.1s",
          "--t": "1.2s",
        })}
      >
        <Img
          src={d.big}
          className={st.zoomImg}
          style={{ objectPosition: "50% 30%" }}
        />
      </div>
      <ArchFrame
        w={276}
        h={396}
        sw={1}
        a="draw"
        d={0.2}
        style={{ left: U(57), top: U(122), width: U(276), height: U(396) }}
      />
      <div
        data-a="rise"
        className="absolute"
        style={vars({
          left: U(206),
          top: U(434),
          width: U(162),
          height: U(162),
          background: "var(--ivory)",
          boxShadow: `0 ${U(8)} ${U(20)} rgba(0,13,8,.4)`,
          "--d": "0.45s",
        })}
      >
        <div
          className="absolute overflow-hidden"
          style={{ left: U(6), top: U(6), width: U(150), height: U(150) }}
        >
          <Img src={d.small} style={{ objectPosition: "50% 40%" }} />
        </div>
      </div>
      <div
        className="absolute"
        style={{ left: U(32), top: U(540), width: U(170) }}
      >
        {d.a && (
          <div
            data-a="up"
            className={cx(st.pf, "relative")}
            style={vars({ color: "var(--ivory)", "--d": "0.3s" })}
          >
            <NameLines
              text={d.a}
              base={32}
              max={170}
              lh={43}
              two={24}
              twoLh={29}
            />
          </div>
        )}
        {d.age && (
          <p
            data-a="up"
            className={st.pfi}
            style={vars({
              marginTop: U(1),
              height: U(27),
              fontSize: U(20),
              lineHeight: `${U(27)}`,
              color: "var(--gold)",
              whiteSpace: "nowrap",
              "--d": "0.4s",
            })}
          >
            {d.age}
          </p>
        )}
      </div>
      <Romb x={184} y={639} s={22} a="spin" d={0.3} />
      {d.quote && (
        <p
          data-a="up"
          className={cx(st.pfi, st.clamp2, "absolute text-center")}
          style={vars({
            left: U(20),
            top: U(676),
            width: U(350),
            fontSize: U(21),
            lineHeight: `${U(28)}`,
            color: "var(--gold)",
            "--d": "0.35s",
          })}
        >
          {d.quote}
        </p>
      )}
    </Sec>
  );
}

/* ═════════════ 04 · Bayram kuni — sakkizburchak ichida kun, sanoq ═════════════ */
/**
 * Raqamlar doim 2 xonali («05»). Sanoq tugagach o‘zgargan raqam yuqoridan sekin tushadi — shaffofliksiz, kesilmasdan:
 * oldingi «0» o‘chib qoladigan bironta kadr yo‘q (pozitsiya bo‘yicha kalit; yangi raqam faqat o‘zgarganda almashadi).
 */
function Digits({
  value,
  run,
  len,
  i,
}: {
  value: number;
  run: boolean;
  len: number;
  i: number;
}) {
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
  const left = t("to‘ygacha qoldi");
  return (
    <Sec z={z} bg="ivory" wide={wide} deco="romb" colStyle={{ height: U(620) }}>
      <Title text={t("Bayram kuni")} top={56} />
      <div
        data-a="pop"
        aria-hidden
        className="absolute"
        style={vars({
          left: U(100),
          top: U(117),
          width: U(190),
          height: U(190),
          "--d": "0.1s",
        })}
      >
        <Octagon spin />
      </div>
      <p
        className={cx(st.pf, "absolute inset-x-0 text-center")}
        style={{
          top: U(146),
          height: U(120),
          fontSize: U(96),
          lineHeight: `${U(120)}`,
          color: "var(--emerald)",
        }}
      >
        <span className={st.mask}>
          <span
            data-a="mask"
            className={st.maskIn}
            style={vars({ "--d": "0.3s" })}
          >
            {d.day}
          </span>
        </span>
      </p>
      <p
        data-a="up"
        className={cx(st.pfi, "absolute inset-x-0 text-center")}
        style={vars({
          top: U(322),
          height: U(29),
          fontSize: U(22),
          lineHeight: `${U(29)}`,
          color: "var(--burg)",
          whiteSpace: "nowrap",
          "--d": "0.45s",
        })}
      >
        {d.monthDay}
      </p>
      {d.start && (
        <p
          data-a="up"
          className={cx(st.ms, "absolute text-center")}
          style={vars({
            left: U(20),
            top: U(360),
            width: U(350),
            height: U(20),
            fontSize: U(15),
            lineHeight: `${U(20)}`,
            color: "var(--mute)",
            "--d": "0.5s",
          })}
        >
          <Fit base={15} max={350} deps={d.start}>
            {d.start}
          </Fit>
        </p>
      )}
      {/* sanoq kuzatuvchisi — taymer qatorini qoplaydi */}
      <div
        ref={ref}
        aria-hidden
        className="pointer-events-none absolute inset-x-0"
        style={{ top: U(415), height: U(100) }}
      />
      {vals.map((v, i) => (
        <div key={i}>
          <div
            data-a="pop"
            className="absolute"
            style={vars({
              left: U(25 + i * 89),
              top: U(415),
              width: U(74),
              height: U(74),
              "--d": `${0.2 + i * 0.1}s`,
            })}
          >
            <Octagon spin />
            <span
              className={cx(st.pf, "absolute inset-x-0 block text-center")}
              style={{
                top: U(19),
                height: U(35),
                fontSize: U(26),
                lineHeight: `${U(35)}`,
                color: "var(--emerald)",
              }}
            >
              <Digits
                value={v}
                run={inView}
                len={i === 0 ? Math.max(2, String(vals[0]).length) : 2}
                i={i}
              />
            </span>
          </div>
          <p
            data-a="up"
            className={cx(st.ms, "absolute text-center")}
            style={vars({
              left: U(22 + i * 89),
              top: U(498),
              width: U(80),
              height: U(18),
              fontSize: U(13),
              lineHeight: `${U(18)}`,
              color: "var(--mute)",
              whiteSpace: "nowrap",
              "--d": `${0.35 + i * 0.1}s`,
            })}
          >
            {units[i]}
          </p>
        </div>
      ))}
      <p
        data-a="up"
        className={cx(st.pfi, "absolute inset-x-0 text-center")}
        style={vars({
          top: U(540),
          height: U(24),
          fontSize: U(18),
          lineHeight: `${U(24)}`,
          color: "var(--mute)",
          "--d": "0.6s",
        })}
      >
        <Fit base={18} max={366} deps={left}>
          {left}
        </Fit>
      </p>
    </Sec>
  );
}

/* ═════════════ 05 · Kun tartibi — oltin chiziq scroll bilan to‘ladi, romblar navbat bilan ═════════════ */
const STEP = 134;
function Program({
  d,
  z,
  wide,
  still,
}: {
  d: D;
  z: number;
  wide: boolean;
  still: boolean;
}) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const items = d.program.slice(0, 8);
  const n = items.length;
  const H = 168 + n * STEP + 56;
  const lineH = n * STEP + 4;
  const onP = useCallback(
    (_p: number, r: DOMRect, el: HTMLElement) => {
      const b = box.current;
      if (!b) return;
      const vh = window.innerHeight || 800;
      const u =
        ((el.lastElementChild as HTMLElement | null)?.offsetWidth || r.width) /
        390;
      // chiziq uchi ekranning 75% balandligida — to‘lgan qism shu chiziqqacha
      const tip = (vh * 0.75 - r.top) / u;
      b.style.setProperty("--dp", seg(tip, 168, 168 + lineH).toFixed(4));
    },
    [lineH],
  );
  if (!n) return null;
  return (
    <Sec
      z={z}
      bg="emerald"
      wide={wide}
      deco="toj"
      colStyle={{ height: U(H) }}
      onP={still ? undefined : onP}
    >
      <Title text={t("Kun tartibi")} top={56} color="var(--ivory)" />
      <Divider x={110} y={110.9167} w={170} d={0.15} />
      <div
        ref={box}
        data-path
        aria-hidden
        className="absolute"
        style={vars({
          left: U(96),
          top: U(168),
          width: U(1),
          height: U(lineH),
          "--dp": still ? 1 : 0,
        })}
      >
        <span className={st.track} />
        <span className={st.fillLine} />
      </div>
      {items.map((it, i) => {
        const y0 = 168 + i * STEP;
        return (
          <div key={i}>
            <Romb x={83} y={y0 + 5} s={26} a="spin" d={0.1} />
            <div
              className="absolute flex flex-col items-start"
              style={{
                left: U(128),
                top: U(y0 + 2),
                width: U(240),
                height: U(STEP - 6),
              }}
            >
              <p
                data-a="right"
                className={st.pf}
                style={vars({
                  height: U(32),
                  fontSize: U(24),
                  lineHeight: `${U(32)}`,
                  color: "var(--gold)",
                  whiteSpace: "nowrap",
                  "--d": "0.12s",
                })}
              >
                {it.time}
              </p>
              <p
                data-a="right"
                className={cx(st.msM, st.clamp2)}
                style={vars({
                  marginTop: U(6),
                  fontSize: U(17),
                  lineHeight: `${U(23)}`,
                  color: "var(--ivory)",
                  maxWidth: "100%",
                  "--d": "0.2s",
                })}
              >
                {it.title}
              </p>
              {it.note?.trim() && (
                <p
                  data-a="right"
                  className={cx(st.ms, st.clamp2)}
                  style={vars({
                    marginTop: U(3),
                    fontSize: U(14),
                    lineHeight: `${U(19)}`,
                    color: "rgba(245,239,227,.7)",
                    maxWidth: "100%",
                    "--d": "0.28s",
                  })}
                >
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

/* ═════════════ 06 · Manzil — saroy surati (oltin ramka), joy nomi, manzil, xarita ═════════════ */
function Venue({
  d,
  z,
  wide,
  linkable,
}: {
  d: D;
  z: number;
  wide: boolean;
  linkable: boolean;
}) {
  const t = useT();
  if (!d.hasPlace) return null;
  return (
    <Sec
      z={z}
      bg="ivory"
      wide={wide}
      deco="romb"
      colStyle={{ paddingTop: U(56), paddingBottom: U(68) }}
    >
      <Title text={t("Manzil")} />
      <div
        className="relative"
        style={{ marginTop: U(11.92), height: U(14.167) }}
      >
        <Divider x={110} y={0} w={170} d={0.15} />
      </div>
      <div className="relative" style={{ marginTop: U(18.92), height: U(236) }}>
        <div
          data-a="fade"
          className="absolute overflow-hidden"
          style={vars({
            left: U(32),
            top: U(8),
            width: U(326),
            height: U(220),
            "--d": "0.1s",
            "--t": "1.2s",
          })}
        >
          <Img src={d.hall} className={st.zoomImg} />
        </div>
        <RectFrame
          w={342}
          h={236}
          sw={1}
          a="draw"
          d={0.2}
          style={{ left: U(24), top: 0, width: U(342), height: U(236) }}
        />
      </div>
      {d.venueTitle && (
        <p
          data-a="up"
          className={cx(st.pf, "mx-auto text-center")}
          style={vars({
            marginTop: U(24),
            width: U(350),
            fontSize: U(28),
            lineHeight: `${U(37)}`,
            color: "var(--ink)",
            overflowWrap: "anywhere",
            "--d": "0.15s",
          })}
        >
          {d.venueTitle}
        </p>
      )}
      {d.address && (
        <p
          data-a="up"
          className={cx(st.ms, "mx-auto text-center")}
          style={vars({
            marginTop: U(d.venueTitle ? 9 : 24),
            width: U(300),
            fontSize: U(16),
            lineHeight: `${U(24)}`,
            color: "var(--mute)",
            overflowWrap: "anywhere",
            "--d": "0.22s",
          })}
        >
          {d.address}
        </p>
      )}
      <div
        data-a="up"
        className="flex justify-center"
        style={vars({ marginTop: U(42), "--d": "0.3s" })}
      >
        <a
          href={linkable ? d.mapUrl : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(st.msM, st.btn)}
          style={{
            minWidth: U(200),
            height: U(52),
            padding: `0 ${U(24)}`,
            fontSize: U(16),
            borderRadius: U(26),
          }}
        >
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
    <Sec
      z={z}
      bg="ivory"
      wide={wide}
      colStyle={{ paddingTop: U(44.13), paddingBottom: U(118) }}
    >
      <div className="relative" style={{ height: U(35.75) }}>
        <TojMark x={169} y={0} w={52} d={0.05} />
      </div>
      <Title text={t("Dress-kod")} d={0.1} style={{ marginTop: U(16.12) }} />
      <div
        className="relative"
        style={{ marginTop: U(14.33), height: U(13.333) }}
      >
        <Divider x={115} y={0} w={160} d={0.2} />
      </div>
      <p
        data-a="up"
        className={cx(st.ms, "mx-auto text-center")}
        style={vars({
          marginTop: U(21.33),
          width: U(300),
          fontSize: U(17),
          lineHeight: `${U(27)}`,
          color: "var(--mute)",
          overflowWrap: "anywhere",
          "--d": "0.25s",
        })}
      >
        {d.dressNote}
      </p>
    </Sec>
  );
}

/* ═════════════ 08 · Anketa — javob (zumrad fon, fil suyagi karta, burchak bezaklari) ═════════════ */
function Rsvp({
  d,
  slug,
  mode,
  z,
  wide,
}: {
  d: D;
  slug: string;
  mode: InvitationSiteProps["mode"];
  z: number;
  wide: boolean;
}) {
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
      const room =
        wrap.clientHeight -
        parseFloat(cs.paddingBottom || "0") -
        parseFloat(cs.paddingTop || "0") -
        parseFloat(cs.borderTopWidth || "0") -
        parseFloat(cs.borderBottomWidth || "0");
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
      if (!res.ok || !j.ok)
        throw new Error(
          t(j.error || "Javob yuborilmadi. Qayta urinib ko‘ring."),
        );
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
    <p
      className={cx(st.msM, st.lbl)}
      style={{ height: U(18), fontSize: U(13), lineHeight: `${U(18)}` }}
    >
      {s}
    </p>
  );
  const sub = d.rsvpUntil
    ? t("Javobingizni {date} kutamiz", { date: d.rsvpUntil })
    : t("Javobingizni kutamiz");
  return (
    <Sec
      z={z}
      bg="emerald"
      wide={wide}
      deco="toj"
      id="farmon-javob"
      colStyle={{ paddingTop: U(56), paddingBottom: U(74) }}
    >
      <Title text={t("Kelasizmi?")} fs={36} h={48} color="var(--ivory)" />
      <p
        data-a="up"
        className={cx(st.ms, "mx-auto text-center")}
        style={vars({
          marginTop: U(6),
          width: U(366),
          fontSize: U(15),
          lineHeight: `${U(20)}`,
          color: "rgba(245,239,227,.8)",
          overflowWrap: "anywhere",
          "--d": "0.12s",
        })}
      >
        {sub}
      </p>
      <div
        data-a="rise"
        className={cx(st.card, "relative mx-auto")}
        style={vars({
          marginTop: U(36),
          width: U(334),
          padding: `${U(34)} ${U(30)} ${U(52)}`,
          boxShadow: `0 ${U(10)} ${U(30)} rgba(0,13,8,.35)`,
          "--d": "0.2s",
        })}
      >
        <Corner x={12} y={12} s={40} o="tl" d={0.5} />
        <Corner x={282} y={12} s={40} o="tr" d={0.58} />
        <Corner
          x={12}
          y={0}
          s={40}
          o="bl"
          d={0.66}
          style={{ top: "auto", bottom: U(12) }}
        />
        <Corner
          x={282}
          y={0}
          s={40}
          o="br"
          d={0.74}
          style={{ top: "auto", bottom: U(12) }}
        />
        {sent ? (
          <div
            key="thanks"
            className={cx(
              st.thanks,
              "relative flex flex-col items-center text-center",
            )}
            style={{
              padding: `${U(40)} ${U(6)} ${U(20)}`,
              gap: U(16),
              minHeight: U(300),
            }}
          >
            <p
              className={st.pf}
              style={{
                fontSize: U(sent === "not_coming" ? 30 : 26),
                lineHeight: 1.25,
                color: "var(--emerald)",
                overflowWrap: "anywhere",
              }}
            >
              {sent === "not_coming"
                ? t("Rahmat!")
                : t("Rahmat! Joyingiz band qilindi")}
            </p>
            <p
              className={st.ms}
              style={{
                fontSize: U(16),
                color: "var(--mute)",
                lineHeight: 1.55,
                overflowWrap: "anywhere",
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
              className={st.msM}
              style={{
                fontSize: U(15),
                color: "var(--emerald)",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              {t("Javobni o‘zgartirish")}
            </button>
          </div>
        ) : (
          <form
            onSubmit={submit}
            noValidate
            className="relative flex flex-col items-stretch"
          >
            {label(t("Ismingiz"))}
            <label
              className={st.field}
              style={{
                marginTop: U(6),
                height: U(48),
                padding: `0 ${U(15)}`,
                borderWidth: U(1),
                borderRadius: U(4),
              }}
            >
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
            <div
              className="flex w-full"
              role="radiogroup"
              aria-label={t("Kelasizmi?")}
              style={{ marginTop: U(18), gap: U(8) }}
            >
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
                  className={cx(
                    st.msM,
                    st.choice,
                    s === "not_coming" && st.choiceNo,
                  )}
                  style={{
                    padding: `${U(6)} ${U(6)}`,
                    minHeight: U(48),
                    fontSize: U(15),
                    borderWidth: U(1),
                    borderRadius: U(24),
                  }}
                >
                  <span style={{ overflowWrap: "anywhere" }}>{t(l)}</span>
                </button>
              ))}
            </div>
            {status === "coming" && (
              <div
                className="flex w-full items-center"
                style={{ marginTop: U(20), gap: U(8), minHeight: U(36) }}
              >
                <p
                  className={st.ms}
                  style={{
                    flex: "1 1 0",
                    minWidth: 0,
                    fontSize: U(15),
                    lineHeight: 1.3,
                    color: "var(--ink)",
                  }}
                >
                  {t("Necha kishi bo‘lasiz?")}
                </p>
                <button
                  type="button"
                  className={cx(st.msM, st.step)}
                  disabled={count <= 1}
                  onClick={() => setCount((c) => Math.max(1, c - 1))}
                  aria-label={t("Kamaytirish")}
                  style={{
                    width: U(32),
                    height: U(36),
                    fontSize: U(18),
                    borderWidth: U(1),
                    borderRadius: U(4),
                  }}
                >
                  −
                </button>
                <span
                  className={st.msM}
                  style={{
                    width: U(32),
                    textAlign: "center",
                    fontSize: U(17),
                    lineHeight: 1.4,
                    color: "var(--emerald)",
                  }}
                  aria-live="polite"
                >
                  {count}
                </span>
                <button
                  type="button"
                  className={cx(st.msM, st.step)}
                  disabled={count >= 20}
                  onClick={() => setCount((c) => Math.min(20, c + 1))}
                  aria-label={t("Ko‘paytirish")}
                  style={{
                    width: U(32),
                    height: U(36),
                    fontSize: U(18),
                    borderWidth: U(1),
                    borderRadius: U(4),
                  }}
                >
                  +
                </button>
              </div>
            )}
            <div style={{ marginTop: U(20) }}>{label(t("Tilaklaringiz"))}</div>
            <label
              className={st.field}
              style={{
                marginTop: U(6),
                height: U(96),
                padding: `${U(12)} ${U(15)}`,
                borderWidth: U(1),
                borderRadius: U(4),
                justifyContent: "flex-start",
                alignItems: "flex-start",
              }}
            >
              <textarea
                ref={wishRef}
                rows={1}
                className={cx(st.ms, st.input)}
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                maxLength={500}
                placeholder={t("Shahzodaga tilak…")}
                aria-label={t("Tilaklaringiz")}
                style={{ fontSize: U(16) }}
              />
            </label>
            {err && (
              <p
                className={st.ms}
                style={{ marginTop: U(12), color: "#a32a37", fontSize: U(14) }}
              >
                {err}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className={cx(st.msM, st.submit)}
              style={{
                marginTop: U(26),
                minHeight: U(54),
                padding: `${U(12)} ${U(12)}`,
                fontSize: U(16),
                borderRadius: U(27),
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? t("Yuborilmoqda…") : t("Javobni yuborish")}
            </button>
          </form>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 09 · Final — toj ko‘tariladi va ustida yaltirash, matnlar, muhr «bosiladi» (scale 1.3 → 1, soya)
 * (scroll bilan: --fc 0 … 1 = Figma kadri; sahifa oxirigacha albatta tugaydi) ═════════════ */
const FIN = {
  m: {
    W: 390,
    H: 844,
    corner: [20, 64],
    crown: [120, 125, 150],
    title: [300, 61, 46],
    text: [50, 372, 290, 17, 27],
    div: [105, 452.5, 180],
    family: [486, 35, 26],
    date: [530, 19, 14, 4],
    seal: [147, 602, 96],
  },
  l: {
    W: 1440,
    H: 900,
    corner: [40, 96],
    crown: [620, 100, 200],
    title: [310, 91, 68],
    text: [490, 410, 460, 20, 30],
    div: [600, 490, 240],
    family: [530, 45, 34],
    date: [588, 22, 16, 5],
    seal: [660, 660, 120],
  },
} as const;
function Final({
  d,
  z,
  wide,
  still,
  onSeen,
}: {
  d: D;
  z: number;
  wide: boolean;
  still: boolean;
  onSeen: () => void;
}) {
  const t = useT();
  const lang = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const sec = useRef<HTMLElement>(null);
  const G = wide ? FIN.l : FIN.m;
  const onP = useCallback(
    (_p: number, r: DOMRect) => {
      const el = ref.current;
      if (!el) return;
      const vh = window.innerHeight || 800;
      // bo‘lim ekranning 70% iga kirganda boshlanadi; muhr ekran pastidan 15% ga kelganda tugaydi — sahifa oxiri undan oldin kelsa, oxirida tugaydi
      const y = window.scrollY;
      const top = r.top + y;
      const sealY = top + (r.height / G.H) * (G.seal[1] + G.seal[2]);
      const max = document.documentElement.scrollHeight - vh;
      const s0 = Math.min(top - vh * 0.7, max - vh * 0.55);
      const s1 = Math.max(s0 + 1, Math.min(sealY - vh * 0.85, max));
      const f = seg(y, s0, s1);
      el.style.setProperty("--fc", f.toFixed(4));
      if (f > 0.5) onSeen();
    },
    [onSeen, G],
  );
  useScrollProgress(sec, onP, !still);
  const { W, H } = G;
  const [cm, cs] = G.corner;
  const [kx, ky, ks] = G.crown;
  const title = t("Sizni kutamiz");
  const [tx, ty, tw, tfs, tlh] = G.text;
  const [sx, sy, ss] = G.seal;
  return (
    <section
      ref={sec}
      className={cx(st.sec, st.emerald, st.secFinal)}
      style={vars({ zIndex: z, "--u": wide ? CANVAS_L : COL_M })}
    >
      <Seam wide={wide} />
      <div
        ref={ref}
        className={cx(st.finalWrap, "relative mx-auto")}
        style={vars({
          width: U(W),
          height: U(H),
          ...(still ? { "--fc": 1 } : {}),
        })}
      >
        <Corners w={W} h={H} s={cs} m={cm} />
        {wide && <SideDeco kind="toj" unit={U} H={H} />}
        <div
          aria-hidden
          className={st.fCrown}
          style={{ left: U(kx), top: U(ky), width: U(ks), height: U(ks) }}
        >
          <Img src={`${P}/toj.webp`} className={st.contain} />
          <span
            className={st.shimmer}
            style={{
              WebkitMaskImage: `url(${P}/toj.webp)`,
              maskImage: `url(${P}/toj.webp)`,
            }}
          />
        </div>
        <h2
          className={cx(st.pfi, st.fIn, "absolute inset-x-0 text-center")}
          style={vars({
            top: U(G.title[0]),
            height: U(G.title[1]),
            fontSize: U(G.title[2]),
            lineHeight: `${U(G.title[1])}`,
            color: "var(--ivory)",
            "--fi": 0,
          })}
        >
          <Fit base={G.title[2]} max={W - 30} deps={title}>
            {title}
          </Fit>
        </h2>
        <FitBox
          base={tfs}
          min={tfs * 0.78}
          lh={tlh}
          deps={lang}
          className={cx(st.ms, st.fIn, "absolute text-center")}
          style={vars({
            left: U(tx),
            top: U(ty),
            width: U(tw),
            height: U(tlh * 2),
            color: "rgba(245,239,227,.85)",
            "--fi": 1,
          })}
        >
          {t("Shahzodamizning bayramini birga, shohona nishonlaylik.")}
        </FitBox>
        <div className={st.fDiv} style={{ position: "absolute", inset: 0 }}>
          <Divider x={G.div[0]} y={G.div[1]} w={G.div[2]} a={null} />
        </div>
        <div className="absolute inset-x-0" style={{ top: U(G.family[0]) }}>
          {d.family && (
            <div
              className={cx(st.pf, st.fIn, "relative text-center")}
              style={vars({ color: "var(--gold)", "--fi": 2 })}
            >
              <NameLines
                text={d.family}
                base={G.family[2]}
                max={W - 40}
                lh={G.family[1]}
                two={G.family[2] * 0.85}
                twoLh={G.family[1] * 0.85}
              />
            </div>
          )}
          {d.dots && (
            <p
              className={cx(st.msM, st.fIn, "text-center")}
              style={vars({
                marginTop: U(
                  d.family ? G.date[0] - G.family[0] - G.family[1] : 0,
                ),
                height: U(G.date[1]),
                fontSize: U(G.date[2]),
                lineHeight: `${U(G.date[1])}`,
                color: "rgba(245,239,227,.8)",
                whiteSpace: "nowrap",
                "--fi": 3,
              })}
            >
              <span
                style={{
                  letterSpacing: U(G.date[3]),
                  paddingLeft: U(G.date[3]),
                }}
              >
                {d.dots}
              </span>
            </p>
          )}
        </div>
        <div
          aria-hidden
          className={st.fSeal}
          style={{ left: U(sx), top: U(sy), width: U(ss), height: U(ss) }}
        >
          <Img src={`${P}/muhr.webp`} className={st.contain} />
        </div>
      </div>
    </section>
  );
}

/* ═════════════ Musiqa tugmasi — Figma «Farmon / Musiqa tugmasi»: zumrad doira, oltin halqa, 3 oltin chiziq ritmda; o‘chirilgan — xira chiziqlar va qiya chiziq ═════════════ */
const BARS: [number, number, number][] = [
  [26, 25, 12],
  [32, 21, 20],
  [38, 24, 14],
];
function FarmonMusic({
  m,
  wide,
  embedded,
}: {
  m: ReturnType<typeof useMusic>;
  wide: boolean;
  embedded: boolean;
}) {
  const t = useT();
  if (!m.available) return null;
  const btn = (
    <button
      type="button"
      onClick={m.toggle}
      aria-label={m.playing ? t("Musiqani o‘chirish") : t("Musiqani yoqish")}
      aria-pressed={m.playing}
      className={cx(
        st.music,
        embedded && st.musicEmbedded,
        m.playing && st.playing,
      )}
      style={{ right: wide ? 24 : 16, top: wide ? 24 : 16 }}
    >
      <svg viewBox="8 5 52 52" width={52} height={52} aria-hidden>
        <circle cx="34" cy="31" r="20.5" fill="none" stroke="#C8A25A" />
        {BARS.map(([x, y, h], i) => (
          <rect
            key={i}
            x={x}
            y={y}
            width={3}
            height={h}
            rx={1.5}
            className={st.bar}
            style={vars({ "--i": i })}
          />
        ))}
        <path d="M24 41L44 21" className={st.strike} />
      </svg>
    </button>
  );
  return embedded ? (
    <div style={{ position: "sticky", top: 0, height: 0, zIndex: 70 }}>
      {btn}
    </div>
  ) : (
    btn
  );
}

/* ═════════════ Sahifa ═════════════ */
type Key =
  | "taklif"
  | "shahzoda"
  | "sana"
  | "program"
  | "venue"
  | "dress"
  | "rsvp"
  | "final";

export function FarmonSite({
  template,
  data,
  mode,
  embedded = false,
}: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const loaded = usePreload(
    [
      `${P}/toj.webp`,
      `${P}/oram-bare.webp`,
      `${P}/oram-ip.webp`,
      `${P}/oram-seal.webp`,
      `${P}/muhr.webp`,
      d.portrait,
    ],
    [d.big, d.small, d.hall].filter(Boolean) as string[],
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

  const shown: Key[] = (
    [
      "taklif",
      "shahzoda",
      "sana",
      "program",
      "venue",
      "dress",
      "rsvp",
      "final",
    ] as Key[]
  ).filter((k) =>
    k === "shahzoda"
      ? !!d.big
      : k === "sana"
        ? d.hasDate
        : k === "program"
          ? d.program.length > 0
          : k === "venue"
            ? d.hasPlace
            : k === "dress"
            ? !!d.dressNote
            : k === "rsvp"
              ? data.rsvpEnabled
              : true,
  );
  const z = (k: Key) => 6 + shown.indexOf(k);
  const linkable = mode !== "preview";
  const colU = wide ? COL_L : COL_M;
  const fu = (n: number) => (wide ? C(n) : U(n));

  return (
    <div ref={root} className={st.root}>
      <div className={st.page} style={vars({ "--u": colU })}>
        <FarmonMusic m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && (
          <Loader done={loaded} seal={`${P}/muhr.webp`} />
        )}
        <div
          className={cx(st.flow, st.opening)}
          style={embedded ? vars({ "--o": 1 }) : undefined}
        >
          {withGate &&
            (loaded ? (
              <Gate d={d} wide={wide} onStart={() => music.play(true)} />
            ) : (
              <div className={st.gateHold} />
            ))}
          {embedded && <Gate d={d} wide={wide} still onStart={() => {}} />}
          <div
            className={cx(st.openWrap, embedded && st.openStill)}
            style={{ zIndex: 5 }}
          >
            <Hero d={d} wide={wide} still={embedded} />
            {withGate && <div className={st.openSpacer} />}
          </div>
          <Taklif d={d} z={z("taklif")} wide={wide} />
          <Shahzoda d={d} z={z("shahzoda")} wide={wide} />
          <Sana d={d} z={z("sana")} wide={wide} />
          <Program d={d} z={z("program")} wide={wide} still={embedded} />
          <Venue d={d} z={z("venue")} wide={wide} linkable={linkable} />
          <Dress d={d} z={z("dress")} wide={wide} />
          {data.rsvpEnabled && (
            <Rsvp
              d={d}
              slug={data.slug}
              mode={mode}
              z={z("rsvp")}
              wide={wide}
            />
          )}
          <Final
            d={d}
            z={z("final")}
            wide={wide}
            still={embedded}
            onSeen={onFinal}
          />
        </div>
        <footer
          className={cx(st.footer, "flex items-start justify-center")}
          style={{ height: fu(120), paddingTop: fu(50) }}
        >
          <p
            className={cx(st.ms, "text-center")}
            style={{
              fontSize: fu(13),
              lineHeight: 18 / 13,
              color: "rgba(245,239,227,.6)",
            }}
          >
            <a href="https://shohnoma.uz">Shohnoma</a> ·{" "}
            {t("elektron taklifnomalar")}
          </p>
        </footer>
      </div>
    </div>
  );
}
