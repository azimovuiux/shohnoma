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
import {
  DEFAULT_MESSAGE,
  DEFAULT_QUOTE,
  DEMO_MESSAGE,
  DEMO_START,
  DRESS_TEXT,
  P,
  SANDIQ_DEMO,
  SANDIQ_DEMO_EN,
  SANDIQ_DEMO_RU,
  SHAHZODA_LINE,
} from "./data";
import st from "./sandiq.module.css";

/* ── Birliklar ──
 * U — joriy `--u`: bo‘limlarda kontent ustuni (Figma mobil 390 koordinatalari; laptopda ustun = mobil × 1.45, ya’ni 565.5px / 1440).
 * C — laptop kanvasi (1440) birligi: yon chiziqlar, atlas chiziqlari, chok ustidagi lenta va yulduz.
 * Ochilish (yopiq sandiq), hero (ochilgan sandiq) va final — o‘z kanvasi (mobil 390×844, laptop 1440×900); ochilish va hero sahnasi
 * bir ekranga sig‘adi va pastki chetga bog‘lanadi. Hero sahnasi laptopda — mobil × 1.0664 (Figma «Sahna (mobil ×1.07)»). */
const U = (n: number) => `calc(var(--u) * ${+n.toFixed(3)})`;
const C = (n: number) => `calc(100cqw / 1440 * ${+n.toFixed(3)})`;
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const vars = (o: Record<string, string | number | undefined>) => o as CSSProperties;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const pct = (x: number) => `${+(x * 100).toFixed(4)}%`;
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const COL_M = "calc(100cqw / 390)";
const COL_L = "calc(100cqw / 1440 * 1.45)";
const CANVAS_L = "calc(100cqw / 1440)";

/* ── Ma’lumot (taklifnoma tilida — InvitationSite LocaleProvider’i) ── */
/** Server yaratadigan standart taklif matni (php/api/lib/orders.php DEFAULT_MESSAGE) — har qaysi tilda */
const SERVER_DEFAULT = "Aziz mehmonlar! Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.";
const isServerDefault = (m: string) => (["uz", "ru", "en"] as Locale[]).some((l) => tr(l, SERVER_DEFAULT).trim() === m.trim());
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
  const DEMO = lang === "ru" ? SANDIQ_DEMO_RU : lang === "en" ? SANDIQ_DEMO_EN : SANDIQ_DEMO;
  const ex = (data.extra ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof ex[k] === "string" ? (ex[k] as string).trim() : typeof ex[k] === "number" ? String(ex[k]) : "");
  const sd = splitDate(data.date);
  const guest = useGuestName();
  return useMemo(() => {
    const cw = calendarWords(lang);
    const exProgram = Array.isArray(ex.program) ? (ex.program as ProgramItem[]).filter((p) => p?.time && p?.title) : [];
    const photos = (data.photos ?? []).filter(Boolean) as string[];
    const date = sd ? new Date(`${sd.iso}T12:00:00Z`) : null;
    const code = str("dressCode") || (demo ? DEMO.dressCode : "");
    const dressNote = str("dressNote") || (DRESS_TEXT[code] ? t(DRESS_TEXT[code]) : "");
    // namunadagi ismlar tarjima qilinadi (mijoz ma’lumoti — o‘zgarishsiz)
    const a = ((demo ? t(data.personA) : data.personA) || "").trim();
    // sunnat: personB — ota-ona / oila («Karimovlar oilasi», «Jamshid va Nodira») — imzo sifatida
    const family = ((demo && data.personB ? t(data.personB) : data.personB) || "").trim();
    const time = sd?.time ?? "";
    const program = (demo ? DEMO.program : exProgram.length ? exProgram : ((data.program ?? []) as ProgramItem[])) as ProgramItem[];
    const raw = (demo ? "" : data.message || "").trim();
    const custom =
      raw && !isServerDefault(raw)
        ? raw.replace(/^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Muhtaram mehmonlar!|Дорогие гости!|Dear guests!)\s*/, "").trim()
        : "";
    const message = custom || (a ? t(demo ? DEMO_MESSAGE : DEFAULT_MESSAGE, { name: a }) : "");
    const venueTitle = ((demo ? t(data.venueName) : data.venueName) || "").trim();
    const address = ((demo ? DEMO.address : data.address) || "").trim();
    const unq = (s: string) => s.replace(/^["“”«»„]+|["“”«»„]+$/g, "").trim();
    const m = date ? date.getUTCMonth() : 0;
    const year = date ? date.getUTCFullYear() : 0;
    const day = date ? date.getUTCDate() : 0;
    // namunada javob muddati — Figma’dagidek sanadan 2 hafta oldin («1-maygacha»)
    const deadline = demo && sd ? new Date(Date.UTC(year, m, day - 14)).toISOString().slice(0, 10) : data.rsvpDeadline;
    const wd = date ? cw.weekday[date.getUTCDay()] : "";
    // Figma: hero — shahzoda portreti, «Bizning shahzoda» — non bilan, manzil — ayvon (mijozda: 1–3-suratlar, bo‘lmasa — shablon rasmlari)
    const portrait = demo ? `${P}/portret.webp` : photos[0] || `${P}/non.webp`;
    const circle = demo ? `${P}/non.webp` : photos[1] || (photos[0] ? `${P}/non.webp` : "");
    const hall = demo ? `${P}/ayvon.webp` : photos[2] || `${P}/ayvon.webp`;
    const age = ageText(lang, str("age") || (demo ? DEMO.age : ""));
    return {
      a,
      family,
      /** «Amirxonning» (ru — «Амирхон», en — «Amirxon’s») */
      whose: a ? t("{name}ning", { name: a }) : "",
      /** «Karimovlar oilasi taklif etadi» */
      invites: family ? t("{family} taklif etadi", { family }) : "",
      /** «15 · 05 · 2027» */
      dots: sd?.dots ?? "",
      /** «sunnat to‘yi  ·  15.05.2027» */
      heroLine: [t("sunnat to‘yi"), sd?.day ?? ""].filter(Boolean).join("  ·  "),
      day: date ? String(day) : "",
      /** «may · shanba» / «мая · суббота» / «May · Saturday» */
      monthDay: date ? `${cw.monthsAfterDay[m]} · ${lang === "en" ? wd : wd.toLocaleLowerCase(lang)}` : "",
      start: demo ? t(DEMO_START) : time ? t("Soat {time} da boshlanadi", { time }) : "",
      hasDate: !!date,
      target: data.date ? tashkentDate(data.date).getTime() : null,
      guest,
      message,
      /** «Amirxon, 7 yoshda» */
      nameAge: [a, age].filter(Boolean).join(", "),
      quote: unq(str("quote")) || t(DEFAULT_QUOTE),
      venueTitle,
      address,
      hasPlace: !!(venueTitle || address || data.mapUrl),
      mapUrl: data.mapUrl || `https://yandex.uz/maps/?text=${encodeURIComponent([venueTitle, address].filter(Boolean).join(", "))}`,
      program,
      dressNote,
      portrait,
      circle,
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
 * har qator `two` o‘lchamida. `letters` — hero: har harf --o bilan navbatma-navbat chiqadi ([boshlanish, tugash]).
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
                    <span key={k}>{" "}</span>
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

/* ═════════════ Tekis vektor naqshlar (Figma «Sandiq / Naqsh · …») ═════════════ */
/** Bodom (40×56) */
function Bodom({ className, style, a, d = 0 }: { className?: string; style?: CSSProperties; a?: string | null; d?: number }) {
  return (
    <div aria-hidden data-a={a ?? undefined} className={cx(st.art, className)} style={vars({ "--d": `${d}s`, ...(style as Record<string, string>) })}>
      <svg viewBox="0 0 40 56" preserveAspectRatio="none" className={st.svg}>
        <path d="M20 55C4 55 1 32 12 21C20 13 26 9 23 1C34 9 40 23 38 36C36 48 30 55 20 55Z" fill="#E0A23B" />
        <path d="M20 47C11 47 9 34 16 27C21 22 25 19 25 14C31 20 33 28 32 35C31 42 27 47 20 47Z" fill="#FAF4EA" />
        <circle cx="21" cy="36" r="4" fill="#9E2F3A" />
      </svg>
    </div>
  );
}
/** Girih yulduzi (44×44) */
function Girih({ className, style, a, d = 0 }: { className?: string; style?: CSSProperties; a?: string | null; d?: number }) {
  return (
    <div aria-hidden data-a={a ?? undefined} className={cx(st.art, className)} style={vars({ "--d": `${d}s`, ...(style as Record<string, string>) })}>
      <svg viewBox="0 0 44 44" preserveAspectRatio="none" className={st.svg}>
        <path
          d="M22 1L27.36 9.07L36.85 7.15L34.93 16.64L43 22L34.93 27.36L36.85 36.85L27.36 34.93L22 43L16.64 34.93L7.15 36.85L9.07 27.36L1 22L9.07 16.64L7.15 7.15L16.64 9.07L22 1Z"
          fill="none"
          stroke="#E0A23B"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M22 14L23.72 17.84L27.66 16.34L26.16 20.28L30 22L26.16 23.72L27.66 27.66L23.72 26.16L22 30L20.28 26.16L16.34 27.66L17.84 23.72L14 22L17.84 20.28L16.34 16.34L20.28 17.84L22 14Z" fill="#9E2F3A" />
      </svg>
    </div>
  );
}
/** Ajratgich (220×24; Figma eksporti eni 221.2 — chetlarida 0.27%): chiziqlar markazdan chetga chiziladi, bodom va nuqtalar «pop» */
function Ajratgich({ x, y, w, unit = U, a = "draw", d = 0, className, style }: { x: number; y: number; w: number; unit?: (n: number) => string; a?: string | null; d?: number; className?: string; style?: CSSProperties }) {
  return (
    <div
      aria-hidden
      data-a={a ?? undefined}
      className={cx(st.art, st.draw, className)}
      style={vars({ left: unit(x), top: unit(y), width: unit(w), height: unit((w * 24) / 220), "--d": `${d}s`, ...(style as Record<string, string>) })}
    >
      <svg viewBox="0 0 221.2 24" preserveAspectRatio="none" className={st.svg} style={{ left: "-0.27%", width: "100.54%" }}>
        <path data-s d="M88.6 12H0.6" pathLength={1} strokeWidth="1.2" />
        <path data-s d="M132.6 12H220.6" pathLength={1} strokeWidth="1.2" />
        <g data-f>
          <path d="M110.6 23.34C103.88 23.34 102.62 13.68 107.24 9.06C110.6 5.7 113.12 4.02 111.86 0.66C116.48 4.02 119 9.9 118.16 15.36C117.32 20.4 114.8 23.34 110.6 23.34Z" fill="#E0A23B" />
          <path d="M110.6 19.98C106.82 19.98 105.98 14.52 108.92 11.58C111.02 9.48 112.7 8.22 112.7 6.12C115.22 8.64 116.06 12 115.64 14.94C115.22 17.88 113.54 19.98 110.6 19.98Z" fill="#FAF4EA" />
          <circle cx="111.02" cy="15.36" r="1.68" fill="#9E2F3A" />
        </g>
        <circle data-f data-k="1" cx="96.6" cy="12" r="2" fill="#E0A23B" />
        <circle data-f data-k="1" cx="124.6" cy="12" r="2" fill="#E0A23B" />
      </svg>
    </div>
  );
}
/** Xon-atlas chizig‘i (vertikal, eni w; naqsh takrori `tile`) — Figma eksporti eni 64/60, chetlarida 3.33% */
const atlasBox = (w: number, unit: (n: number) => string): CSSProperties => ({ width: unit((w * 64) / 60), marginLeft: unit((-w * 2) / 60) });
const atlasBg = (tile: number, unit: (n: number) => string): CSSProperties => ({
  backgroundImage: `url(${P}/atlas.svg)`,
  backgroundRepeat: "repeat-y",
  backgroundSize: `100% ${unit(tile)}`,
});
const atlasStyle = (w: number, tile: number, unit: (n: number) => string): CSSProperties => ({ ...atlasBox(w, unit), ...atlasBg(tile, unit) });

/* ═════════════ Sandiq: yopiq rasm (qopqoq + tana, qopqoq 3D ko‘tariladi) → nur chaqnaydi → ochiq rasm ═════════════ */
type Box = { x: number; y: number; s: number };
/** Rasm ulushida: yopiq sandiq tanasi (markaz, pastki cheti, eni) va ochiq sandiq tanasi + ichidagi nur markazi */
const CL = { cx: 512.5 / 1024, bot: 840 / 1024, w: 945 / 1024 };
const OP = { cx: 502.5 / 1024, bot: 949 / 1024, w: 811 / 1024, gx: 540 / 1024, gy: 470 / 1024 };
/** Ochiq rasm — yopiq sandiq tanasi o‘rnida (almashganda sakramaydi) */
const openFrom = (c: Box): Box => {
  const s = (c.s * CL.w) / OP.w;
  return { x: c.x + c.s * CL.cx - s * OP.cx, y: c.y + c.s * CL.bot - s * OP.bot, s };
};
const closedFrom = (o: Box): Box => {
  const s = (o.s * OP.w) / CL.w;
  return { x: o.x + o.s * OP.cx - s * CL.cx, y: o.y + o.s * OP.bot - s * CL.bot, s };
};

/**
 * `target` — ochiq sandiqning oxirgi joyi; `start` — ochiq rasm paydo bo‘ladigan joy; `closed` — yopiq sandiq.
 * Harakat (start → target) CSS’da: --cm (0…1), --dx/--dy/--s0. `place` — sahna koordinatalaridan uslub.
 */
function Chest({ target, start, closed, place, className }: { target: Box; start: Box; closed: Box; place: (b: Box) => CSSProperties; className: string }) {
  const rel = (b: Box): CSSProperties => ({
    left: pct((b.x - start.x) / start.s),
    top: pct((b.y - start.y) / start.s),
    width: pct(b.s / start.s),
    height: pct(b.s / start.s),
  });
  return (
    <div
      aria-hidden
      className={cx(st.chest, className)}
      style={vars({
        ...(place(target) as Record<string, string>),
        "--dx": +(start.x - target.x).toFixed(3),
        "--dy": +(start.y - target.y).toFixed(3),
        "--s0": +(start.s / target.s).toFixed(4),
      })}
    >
      <div className={st.cShut} style={rel(closed)}>
        <div className={st.cShake}>
          <Img src={`${P}/sandiq-yopiq.webp`} eager className={st.cBody} />
          <span className={st.cSlit} />
          <Img src={`${P}/sandiq-yopiq.webp`} eager className={st.cLid} />
        </div>
      </div>
      <Img src={`${P}/sandiq-ochiq.webp`} eager className={st.cOpen} />
      <span className={st.cFlash} style={{ left: pct(OP.gx), top: pct(OP.gy) }} />
    </div>
  );
}

/** Iliq nur (Figma «Iliq nur»: #F6C66A 75% → 0) */
function Glow({ style, className, children }: { style: CSSProperties; className?: string; children?: ReactNode }) {
  return (
    <div aria-hidden className={cx(st.glowBox, className)} style={style}>
      <span className={st.glow} />
      {children}
    </div>
  );
}

/* ═════════════ 00 · Ochilish — anor rang fonda yopiq sandiq (faqat scroll bilan, --o: 0…1):
 * yozuvlar so‘nadi, atlas chiziqlari yon tomonlarga tarqaladi, sandiq yengil silkinadi, qopqoq (qulf bilan) ko‘tarilib ichidan nur sizadi,
 * nur chaqnab yopiq rasm ochiq rasmga almashadi va iliq nur doira bo‘lib ekranni to‘ldiradi (hero shu doira ichida ko‘rinadi).
 * Ochilish foni — hero orqa foni bilan bir xil (anor rang); scroll boshlanishi bilan yo‘qoladi, shuning uchun «sharpa» bo‘lmaydi. ═════════════ */
const GATE = {
  m: {
    W: 390,
    H: 844,
    stripes: [
      [14, 36, 288, -1],
      [340, 36, 288, 1],
    ] as [number, number, number, number][],
    whose: [112, 29, 26, 284] as const,
    big: [146, 54, 48, 284] as const,
    div: [110, 216.7273, 170] as const,
    glow: [25, 270, 340] as const,
    chest: { x: 45, y: 300, s: 300 } as Box,
    date: [640, 20, 15, 4] as const,
    fam: [676, 21, 19, 284] as const,
  },
  l: {
    W: 1440,
    H: 900,
    stripes: [
      [40, 48, 384, -1],
      [124, 27, 216, -1],
      [1289, 27, 216, 1],
      [1352, 48, 384, 1],
    ] as [number, number, number, number][],
    whose: [90, 38, 34, 1100] as const,
    big: [132, 81, 72, 1100] as const,
    div: [600, 236.9091, 240] as const,
    glow: [480, 260, 480] as const,
    chest: { x: 510, y: 290, s: 420 } as Box,
    date: [740, 22, 16, 5] as const,
    fam: [780, 25, 22, 1100] as const,
  },
} as const;
/** Hero (Figma mobil 01 koordinatalari; laptopda × k, chapdan ox) */
const SAHNA = { m: { ox: 0, k: 1 }, l: { ox: 512.0616, k: 415.877 / 390 } } as const;
const HERO = {
  name: [40, 63, 56] as const,
  sub: [110, 22, 20] as const,
  glow: [-35, 100, 460] as const,
  frame: [62, 146, 266, 356] as const,
  photo: [70, 154, 250, 340] as const,
  chest: { x: 20, y: 465, s: 350 } as Box,
  stars: [
    [23, 185, 30],
    [340, 228, 24],
  ] as const,
};
const heroChest = (wide: boolean): Box => {
  const { ox, k } = wide ? SAHNA.l : SAHNA.m;
  return { x: ox + HERO.chest.x * k, y: HERO.chest.y * k, s: HERO.chest.s * k };
};
/** Ravoq kesiladigan chiziq — ochiq sandiq oyoqlari ustida (rasm ulushi) */
const CUT = 900 / 1024;
/** Doiraviy ochilish markazi — ochiq sandiq ichidagi nur (sahna koordinatalarida) */
const wipeCenter = (wide: boolean) => {
  const o = openFrom((wide ? GATE.l : GATE.m).chest);
  return { x: o.x + o.s * OP.gx, y: o.y + o.s * OP.gy };
};

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
      el.style.pointerEvents = o > 0.15 ? "none" : "";
      el.style.visibility = o > 0.7 ? "hidden" : "";
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
  const place = (b: Box): CSSProperties => ({ left: X(b.x), top: Y(b.y), width: U(b.s), height: U(b.s) });
  const [wT, wH, wF, wMax] = G.whose;
  const [bT, bH, bF, bMax] = G.big;
  const [dT, dH, dF, dLs] = G.date;
  const [fT, fH, fF, fMax] = G.fam;
  const [gx, gy, gs] = G.glow;
  const big = t("sunnat to‘yi");
  const start = openFrom(G.chest);
  // atlas chiziqlari: sahna balandligidan oshib turadi (baland ekranda tepada ham naqsh), naqsh qadami Figma kadri bilan bir xil
  const over = 4;
  return (
    <div
      ref={wrap}
      className={cx(st.gateWrap, still && st.still)}
      style={vars(still ? { "--u": pageU, "--o": 0, height: U(H), marginBottom: 0 } : { "--u": `min(${pageU}, calc(100svh / ${H}))` })}
    >
      <div className={st.gate} aria-label={t("Taklifnoma")} style={still ? { position: "relative", height: "100%" } : undefined}>
        <div aria-hidden className={st.gBg} />
        {G.stripes.map(([x, w, tile, side], i) => (
          <div
            key={i}
            aria-hidden
            className={st.gStripe}
            style={vars({
              left: X(x),
              top: `calc(100% - ${U(H + tile * over)})`,
              height: U(H + tile * over),
              "--side": side,
              "--sx": +(side < 0 ? W / 2 - x - w - 12 : x - W / 2 - 12).toFixed(2),
              ...(atlasBox(w, U) as Record<string, string>),
            })}
          >
            <span className={st.gIn} style={vars({ position: "absolute", inset: 0, "--gd": `${0.15 + (i % 2) * 0.12}s`, ...(atlasBg(tile, U) as Record<string, string>) })} />
          </div>
        ))}
        <Glow className={st.gGlow} style={{ left: X(gx), top: Y(gy), width: U(gs), height: U(gs) }} />
        <div className={st.gText}>
          {d.whose && (
            <div className={cx(st.phI, st.gIn, "absolute inset-x-0 text-center")} style={vars({ bottom: U(H - wT - wH), color: "var(--saf)", "--gd": "0.5s" })}>
              <NameLines text={d.whose} base={wF} max={wMax} lh={wH} two={wF * 0.8} twoLh={wH * 0.8} />
            </div>
          )}
          <h1 className={cx(st.phB, st.gIn, "absolute inset-x-0 text-center")} style={vars({ top: Y(bT), height: U(bH), fontSize: U(bF), lineHeight: `${U(bH)}`, color: "var(--cream)", "--gd": "0.6s" })}>
            <Fit base={bF} max={bMax} deps={big}>
              {big}
            </Fit>
          </h1>
          <div className={st.gIn} style={vars({ position: "absolute", inset: 0, "--gd": "0.75s" })}>
            <Ajratgich x={0} y={0} w={G.div[2]} a={null} className={st.gDraw} style={{ left: X(G.div[0]), top: Y(G.div[1]) }} />
          </div>
          {d.dots && (
            <p className={cx(st.msM, st.gIn, "absolute inset-x-0 text-center")} style={vars({ top: Y(dT), height: U(dH), fontSize: U(dF), lineHeight: `${U(dH)}`, color: "var(--cream)", whiteSpace: "nowrap", "--gd": "0.9s" })}>
              <span style={{ letterSpacing: U(dLs), paddingLeft: U(dLs) }}>{d.dots}</span>
            </p>
          )}
          {d.invites && (
            <div className={cx(st.phI, st.gIn, "absolute inset-x-0 text-center")} style={vars({ top: Y(fT), color: "rgba(250,244,234,.85)", "--gd": "1s" })}>
              <NameLines text={d.invites} base={fF} max={fMax} lh={fH} two={fF * 0.9} twoLh={fH * 0.95} />
            </div>
          )}
        </div>
        <div className={st.gIn} style={vars({ position: "absolute", inset: 0, "--gd": "0.25s" })}>
          <Chest target={heroChest(wide)} start={start} closed={G.chest} place={place} className={st.gChest} />
        </div>
      </div>
    </div>
  );
}

/* ═════════════ 01 · Hero — ochilgan sandiq (ochilish ostida sticky; --o bilan): iliq nur doirasi kengayib hero’ni ochadi,
 * sandiq pastga tushadi, shahzoda surati sandiq ortidan ko‘tariladi, ism harfma-harf yoziladi ═════════════ */
function Hero({ d, wide, still }: { d: D; wide: boolean; still: boolean }) {
  const W = wide ? 1440 : 390;
  const H = wide ? 900 : 844;
  const pageU = wide ? CANVAS_L : COL_M;
  const { ox, k } = wide ? SAHNA.l : SAHNA.m;
  const X = (x: number) => `calc(50% + ${U(x - W / 2)})`;
  const Y = (y: number) => `calc(100% - ${U(H - y)})`;
  const hx = (x: number) => X(ox + x * k);
  const hy = (y: number) => Y(y * k);
  const hs = (s: number) => U(s * k);
  const [nT, nH, nF] = HERO.name;
  const [sT, sH, sF] = HERO.sub;
  const [glx, gly, gls] = HERO.glow;
  const [fx, fy, fw, fh] = HERO.frame;
  const [px, py, pw, ph] = HERO.photo;
  const c = heroChest(wide);
  const wc = wipeCenter(wide);
  const cs = openFrom((wide ? GATE.l : GATE.m).chest);
  return (
    <div
      className={cx(st.hero, still && st.heroStill)}
      style={vars(still ? { "--u": pageU, height: U(H) } : { "--u": `min(${pageU}, calc(100svh / ${H}))` })}
    >
      <div aria-hidden className={st.hBack} />
      <div aria-hidden className={st.hHalo} style={{ left: X(wc.x), top: Y(wc.y) }} />
      <div className={st.hFront} style={vars({ "--wx": X(wc.x), "--wy": Y(wc.y) })}>
        {wide && (
          <>
            <Glow className={st.hWide} style={{ left: X(160), top: Y(-140), width: U(1120), height: U(1120) }} />
            <div aria-hidden className={cx(st.hLenta, st.hLentaL)} style={{ left: X(-130), top: Y(573.5), width: U(560), height: U(373) }}>
              <Img src={`${P}/lenta.webp`} eager />
            </div>
            <div aria-hidden className={cx(st.hLenta, st.hLentaR)} style={{ left: X(1010), top: Y(573.5), width: U(560), height: U(373) }}>
              <Img src={`${P}/lenta.webp`} eager className={st.flip} />
            </div>
            {(
              [
                [143, 203, 34],
                [1263, 203, 34],
                [289, 319, 22],
                [1129, 319, 22],
              ] as const
            ).map(([x, y, s], i) => (
              <Girih key={i} a={null} className={st.hStar} style={vars({ left: X(x), top: Y(y), width: U(s), height: U(s), "--sd": i * 0.03 })} />
            ))}
          </>
        )}
        <Glow className={st.hGlow} style={{ left: hx(glx), top: hy(gly), width: hs(gls), height: hs(gls) }} />
        {/* ramka va surat — sandiq ortidan yuqoriga ko‘tariladi (sandiq ustida chiziladi) */}
        <div aria-hidden className={st.hArch} style={vars({ "--H": H, "--cb0": +(cs.y + cs.s * CUT).toFixed(2), "--cb1": +(c.y + c.s * CUT).toFixed(2) })}>
          <span className={st.hFrame} style={{ left: hx(fx), top: hy(fy), width: hs(fw), height: hs(fh), borderWidth: hs(2), borderRadius: `${hs(fw / 2)} ${hs(fw / 2)} 0 0` }} />
          <div className={st.hPhoto} style={{ left: hx(px), top: hy(py), width: hs(pw), height: hs(ph), borderRadius: `${hs(pw / 2)} ${hs(pw / 2)} 0 0` }}>
            <Img src={d.portrait} eager style={{ objectPosition: "50% 30%" }} />
          </div>
        </div>
        <div aria-hidden className={st.hChest} style={{ left: X(c.x), top: Y(c.y), width: U(c.s), height: U(c.s) }}>
          <Img src={`${P}/sandiq-ochiq.webp`} eager />
        </div>
        {HERO.stars.map(([x, y, s], i) => (
          <Girih key={i} a={null} className={st.hStar} style={vars({ left: hx(x), top: hy(y), width: hs(s), height: hs(s), "--sd": 0.06 + i * 0.04 })} />
        ))}
        {/* blok pastki chetga bog‘langan: ism 2 qatorga bo‘linsa — yuqoriga o‘sadi (ravoqqa tegmaydi) */}
        <div className="absolute inset-x-0" style={{ bottom: U(H - (sT + sH) * k) }}>
          {d.a && (
            <h2 className={cx(st.phB, "relative mx-auto text-center")} style={{ width: hs(390), color: "var(--pom)" }}>
              <NameLines text={d.a} base={nF} max={366} lh={nH} two={nF * 0.66} twoLh={nH * 0.66} unit={hs} letters={[0.46, 0.86]} />
            </h2>
          )}
          <p
            className={cx(st.phI, st.hSub, "relative mx-auto text-center")}
            style={{ width: hs(390), marginTop: hs(d.a ? sT - nT - nH : 0), height: hs(sH), fontSize: hs(sF), lineHeight: `${hs(sH)}`, color: "var(--wal)", whiteSpace: "pre" }}
          >
            <Fit base={sF} max={366} unit={hs} deps={d.heroLine}>
              {d.heroLine}
            </Fit>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═════════════ Bo‘lim qobig‘i ═════════════ */
type Bg = "cream" | "sand" | "grad" | "wal";
/** Laptop yon bezaklari (1440 kanvas): oltin chiziqlar + o‘rtada bodom/girih, yoki ikki xon-atlas chizig‘i */
function SideDeco({ kind }: { kind: "bodom" | "girih" | "atlas" }) {
  if (kind === "atlas")
    return (
      <div aria-hidden className={st.deco}>
        {[215, 1189].map((x, i) => (
          <div key={x} data-a="fade" className={st.sideAtlas} style={vars({ left: C(x), top: C(60), bottom: C(60), "--d": `${0.1 + i * 0.1}s`, "--t": "1.4s", ...(atlasStyle(36, 288, C) as Record<string, string>) })} />
        ))}
      </div>
    );
  const [bw, bh] = kind === "bodom" ? [40.8, 57.12] : [43.2, 43.2];
  const gap = kind === "bodom" ? 68 : 72;
  return (
    <div aria-hidden className={st.deco}>
      {[233, 1207].map((x) => (
        <div key={x}>
          <span data-a="lineUp" className={st.sideLine} style={{ left: C(x), top: C(90), width: C(1), height: `calc(50% - ${C(90 + gap / 2)})` }} />
          <span data-a="lineDown" className={st.sideLine} style={{ left: C(x), bottom: C(90), width: C(1), height: `calc(50% - ${C(90 + gap / 2)})` }} />
          {kind === "bodom" ? (
            <Bodom a="pop" d={0.4} style={{ left: C(x + 0.5 - bw / 2), top: `calc(50% - ${C(bh / 2)})`, width: C(bw), height: C(bh) }} />
          ) : (
            <Girih a="spin" d={0.4} style={{ left: C(x + 0.5 - bw / 2), top: `calc(50% - ${C(bh / 2)})`, width: C(bw), height: C(bh) }} />
          )}
        </div>
      ))}
    </div>
  );
}

/** Bo‘lim: to‘liq enli fon + markazda kontent ustuni (mobil 390 birlik; laptopda × 1.45). `outer` — ustundan tashqaridagi bezaklar */
function Sec({
  children,
  z,
  bg,
  colStyle,
  id,
  deco,
  wide,
  onP,
  outer,
}: {
  children: ReactNode;
  z: number;
  bg: Bg;
  colStyle?: CSSProperties;
  id?: string;
  deco?: "bodom" | "girih" | "atlas";
  wide: boolean;
  onP?: (p: number, r: DOMRect, el: HTMLElement) => void;
  outer?: ReactNode;
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
    <section ref={ref} id={id} className={cx(st.sec, st[bg])} style={{ zIndex: z }}>
      {wide && deco && <SideDeco kind={deco} />}
      {outer}
      <div className={st.col} style={{ width: U(390), ...colStyle }}>
        {children}
      </div>
    </section>
  );
}

/** Sarlavha (Philosopher Bold, markazda, 360 da sig‘adi) */
function Title({ text, top, fs = 32, h = 36, color = "var(--pom)", d = 0, style }: { text: string; top?: number; fs?: number; h?: number; color?: string; d?: number; style?: CSSProperties }) {
  return (
    <p
      data-a="up"
      className={cx(st.phB, "text-center", top != null && "absolute inset-x-0")}
      style={vars({ top: top != null ? U(top) : undefined, height: U(h), fontSize: U(fs), lineHeight: `${U(h)}`, color, "--d": `${d}s`, ...(style as Record<string, string>) })}
    >
      <Fit base={fs} max={366} deps={text}>
        {text}
      </Fit>
    </p>
  );
}

/** Chok ustidagi atlas lenta (Figma «Atlas lenta · chok ustida»): bo‘lim tepasidan yuqoriga chiqadi; sahifa birligida */
function SeamLenta({ wide, top, flip }: { wide: boolean; top: [number, number]; flip?: boolean }) {
  const u = wide ? C : U;
  const [x, y, w, h] = wide ? [400, top[1], 640, 426.2857] : [-20, top[0], 430, 286.4107];
  return (
    <div aria-hidden data-a="wave" className={cx(st.seamLenta, flip && st.waveR)} style={vars({ left: wide ? u(x) : `calc(50% + ${u(x - 195)})`, top: u(y), width: u(w), height: u(h) })}>
      <Img src={`${P}/lenta.webp`} className={flip ? st.flip : undefined} />
    </div>
  );
}

/* ═════════════ 02 · Taklif — murojaat, taklif matni, imzo ═════════════ */
function Taklif({ d, z, wide, tail }: { d: D; z: number; wide: boolean; tail: number }) {
  const t = useT();
  const hello = d.guest ? guestHello(t, "Hurmatli {guest}!", d.guest) : t("Aziz mehmonlar!");
  return (
    <Sec
      z={z}
      bg="cream"
      wide={wide}
      deco="bodom"
      colStyle={{ paddingTop: U(120), paddingBottom: U(85.8 + tail) }}
      outer={<SeamLenta wide={wide} top={[-137.2054, -207.1428]} />}
    >
      <div data-a="up" className={cx(st.phB, "relative text-center")} style={{ color: "var(--pom)" }}>
        <NameLines text={hello} base={34} max={366} lh={38} two={28} twoLh={33} />
      </div>
      <div className="relative" style={{ marginTop: U(14.7273), height: U(18.5455) }}>
        <Ajratgich x={110} y={0} w={170} d={0.15} />
      </div>
      {d.message && (
        <p
          data-a="up"
          className={cx(st.ms, "mx-auto text-center")}
          style={vars({ marginTop: U(20.7273), width: U(316), minHeight: U(112), fontSize: U(17), lineHeight: `${U(28)}`, color: "var(--ink)", overflowWrap: "anywhere", "--d": "0.2s" })}
        >
          {d.message}
        </p>
      )}
      {d.family && (
        <>
          <p data-a="up" className={cx(st.phI, "text-center")} style={vars({ marginTop: U(d.message ? 76 : 40), height: U(20), fontSize: U(18), lineHeight: `${U(20)}`, color: "var(--mute)", "--d": "0.1s" })}>
            {t("Hurmat bilan,")}
          </p>
          <div data-a="up" className={cx(st.phB, "relative text-center")} style={vars({ marginTop: U(8), color: "var(--pom)", "--d": "0.18s" })}>
            <NameLines text={d.family} base={28} max={340} lh={31} two={24} twoLh={28} />
          </div>
        </>
      )}
      <div className="relative" style={{ marginTop: U(d.family ? 38.8 : d.message ? 60 : 30), height: U(36.4) }}>
        <Bodom a="pop" d={0.25} style={{ left: U(182), top: 0, width: U(26), height: U(36.4) }} />
      </div>
    </Sec>
  );
}

/* ═════════════ 03 · Bizning shahzoda — za’faron halqadagi surat, ism va yosh, iqtibos ═════════════ */
function Shahzoda({ d, z, wide, tail }: { d: D; z: number; wide: boolean; tail: number }) {
  const t = useT();
  if (!d.circle) return null;
  return (
    <Sec z={z} bg="grad" wide={wide} deco="atlas" colStyle={{ paddingTop: U(60), paddingBottom: U(72 + tail) }}>
      <Title text={t("Bizning shahzoda")} color="var(--cream)" />
      <div className="relative" style={{ marginTop: U(44), height: U(300) }}>
        <svg aria-hidden data-a="ring" viewBox="0 0 300 300" className={cx(st.art, st.ring)} style={{ left: U(45), top: 0, width: U(300), height: U(300) }}>
          <circle cx="150" cy="150" r="149.25" fill="none" stroke="#E0A23B" strokeWidth="1.5" pathLength={1} />
        </svg>
        <div data-a="zoom" className={cx(st.circle, "absolute overflow-hidden")} style={vars({ left: U(55), top: U(10), width: U(280), height: U(280), "--d": "0.15s" })}>
          <Img src={d.circle} className={st.zoomImg} />
        </div>
        <Girih a="spin" d={0.5} style={{ left: U(38), top: U(16), width: U(28), height: U(28) }} />
        <Girih a="spin" d={0.6} style={{ left: U(326), top: U(258), width: U(24), height: U(24) }} />
      </div>
      {d.nameAge && (
        <div data-a="up" className={cx(st.phB, "relative text-center")} style={vars({ marginTop: U(30), color: "var(--cream)", "--d": "0.2s" })}>
          <NameLines text={d.nameAge} base={28} max={350} lh={31} two={24} twoLh={28} />
        </div>
      )}
      <div className="relative" style={{ marginTop: U(d.nameAge ? 20.8182 : 30), height: U(16.3636) }}>
        <Ajratgich x={120} y={0} w={150} d={0.25} />
      </div>
      {d.quote && (
        <p data-a="up" className={cx(st.phI, st.clamp2, "mx-auto text-center")} style={vars({ marginTop: U(21.8182), width: U(366), fontSize: U(22), lineHeight: `${U(25)}`, color: "var(--saf)", "--d": "0.3s" })}>
          {d.quote}
        </p>
      )}
      <p data-a="up" className={cx(st.ms, "mx-auto text-center")} style={vars({ marginTop: U(15), width: U(300), fontSize: U(16), lineHeight: `${U(24)}`, color: "rgba(250,244,234,.8)", "--d": "0.38s" })}>
        {t(SHAHZODA_LINE)}
      </p>
    </Sec>
  );
}

/* ═════════════ 04 · Bayram kuni — rishton lagan ichida kun, sanoq kartalari (flip) ═════════════ */
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

function Sana({ d, z, wide, tail }: { d: D; z: number; wide: boolean; tail: number }) {
  const t = useT();
  const units = timerUnits(useLocale());
  const c = useCountdown(d.target);
  const [ref, inView] = useInView<HTMLDivElement>(0.3, true);
  if (!d.hasDate || !c) return null;
  const vals = [c.d, c.h, c.m, c.s];
  const left = t("to‘ygacha qoldi");
  return (
    <Sec z={z} bg="sand" wide={wide} deco="girih" colStyle={{ height: U(640 + tail) }}>
      <Title text={t("Bayram kuni")} top={56} />
      <div data-a="lagan" aria-hidden className="absolute" style={vars({ left: U(55), top: U(122), width: U(280), height: U(280), "--d": "0.1s" })}>
        <Img src={`${P}/lagan.webp`} />
      </div>
      <p className={cx(st.phB, "absolute inset-x-0 text-center")} style={{ top: U(186), height: U(100), fontSize: U(88), lineHeight: `${U(100)}`, color: "var(--pom)" }}>
        <span className={st.mask}>
          <span data-a="mask" className={st.maskIn} style={vars({ "--d": "0.45s" })}>
            {d.day}
          </span>
        </span>
      </p>
      <p data-a="up" className={cx(st.phI, "absolute inset-x-0 text-center")} style={vars({ top: U(288), height: U(25), fontSize: U(22), lineHeight: `${U(25)}`, color: "var(--wal)", whiteSpace: "nowrap", "--d": "0.6s" })}>
        <Fit base={22} max={176} deps={d.monthDay}>
          {d.monthDay}
        </Fit>
      </p>
      {d.start && (
        <p data-a="up" className={cx(st.msM, "absolute text-center")} style={vars({ left: U(20), top: U(430), width: U(350), height: U(22), fontSize: U(16), lineHeight: `${U(22)}`, color: "var(--wal)", "--d": "0.15s" })}>
          <Fit base={16} max={350} deps={d.start}>
            {d.start}
          </Fit>
        </p>
      )}
      {/* sanoq kuzatuvchisi — taymer qatorini qoplaydi */}
      <div ref={ref} aria-hidden className="pointer-events-none absolute inset-x-0" style={{ top: U(476), height: U(86) }} />
      <div className={st.flipRow} style={{ position: "absolute", left: 0, top: U(476), width: "100%", height: U(86) }}>
        {vals.map((v, i) => (
          <div
            key={i}
            data-a="flip"
            className={cx(st.timer, "absolute text-center")}
            style={vars({ left: U(27 + i * 87), top: 0, width: U(75), height: U(86), borderWidth: U(1), borderRadius: U(14), "--d": `${0.2 + i * 0.1}s` })}
          >
            <span className={cx(st.phB, "absolute inset-x-0 block")} style={{ top: U(13), height: U(34), fontSize: U(30), lineHeight: `${U(34)}`, color: "var(--pom)" }}>
              <Digits value={v} run={inView} len={i === 0 ? Math.max(2, String(vals[0]).length) : 2} i={i} />
            </span>
            <span className={cx(st.ms, "absolute inset-x-0 block")} style={{ top: U(55), height: U(18), fontSize: U(13), lineHeight: `${U(18)}`, color: "var(--mute)", whiteSpace: "nowrap" }}>
              {units[i]}
            </span>
          </div>
        ))}
      </div>
      <p data-a="up" className={cx(st.phI, "absolute inset-x-0 text-center")} style={vars({ top: U(584), height: U(20), fontSize: U(18), lineHeight: `${U(20)}`, color: "var(--mute)", "--d": "0.6s" })}>
        <Fit base={18} max={366} deps={left}>
          {left}
        </Fit>
      </p>
    </Sec>
  );
}

/* ═════════════ 05 · Kun tartibi — bodomlar navbat bilan yonadi ═════════════ */
function Program({ d, z, wide, tail }: { d: D; z: number; wide: boolean; tail: number }) {
  const t = useT();
  const items = d.program.slice(0, 8);
  if (!items.length) return null;
  return (
    <Sec
      z={z}
      bg="wal"
      wide={wide}
      deco="bodom"
      colStyle={{ paddingTop: U(56), paddingBottom: U(90 + tail) }}
      outer={
        <Girih
          a="spin"
          d={0.1}
          className={st.seamStar}
          style={wide ? { left: C(700), top: C(-20), width: C(40), height: C(40) } : { left: `calc(50% - ${U(15)})`, top: U(-15), width: U(30), height: U(30) }}
        />
      }
    >
      <Title text={t("Kun tartibi")} color="var(--cream)" />
      <div className="relative" style={{ marginTop: U(16.7273), height: U(18.5455) }}>
        <Ajratgich x={110} y={0} w={170} d={0.15} />
      </div>
      <div style={{ marginTop: U(40.7273) }}>
        {items.map((it, i) => (
          <div key={i} className="relative" style={{ paddingLeft: U(96), paddingRight: U(32) }}>
            <Bodom a="lit" d={0.1} style={{ left: U(42), top: U(7.6), width: U(32), height: U(44.8) }} />
            <div style={{ minHeight: U(84) }}>
              <p data-a="right" className={st.phB} style={vars({ height: U(29), fontSize: U(26), lineHeight: `${U(29)}`, color: "var(--saf)", whiteSpace: "nowrap", "--d": "0.12s" })}>
                {it.time}
              </p>
              <p data-a="right" className={cx(st.msM, st.clamp2)} style={vars({ marginTop: U(9), fontSize: U(18), lineHeight: `${U(25)}`, color: "var(--cream)", "--d": "0.2s" })}>
                {it.title}
              </p>
              {it.note?.trim() && (
                <p data-a="right" className={cx(st.ms, st.clamp2)} style={vars({ marginTop: U(1), fontSize: U(15), lineHeight: `${U(20)}`, color: "rgba(250,244,234,.7)", "--d": "0.28s" })}>
                  {it.note}
                </p>
              )}
            </div>
            {i < items.length - 1 && <span data-a="rule" className={st.rule} style={{ marginTop: U(26), marginBottom: U(35), width: U(262), height: U(1) }} />}
          </div>
        ))}
      </div>
    </Sec>
  );
}

/* ═════════════ 06 · Manzil — ayvon surati, joy nomi, manzil, xarita ═════════════ */
function Venue({ d, z, wide, linkable, tail }: { d: D; z: number; wide: boolean; linkable: boolean; tail: number }) {
  const t = useT();
  if (!d.hasPlace) return null;
  return (
    <Sec z={z} bg="cream" wide={wide} deco="girih" colStyle={{ paddingTop: U(56), paddingBottom: U(68 + tail) }}>
      <Title text={t("Manzil")} />
      <div className="relative" style={{ marginTop: U(16.7273), height: U(18.5455) }}>
        <Ajratgich x={110} y={0} w={170} d={0.15} />
      </div>
      <div data-a="zoom" className="relative mx-auto overflow-hidden" style={vars({ marginTop: U(20.7273), width: U(326), height: U(226), borderRadius: U(18), background: "var(--sand)", "--d": "0.1s" })}>
        <Img src={d.hall} className={st.zoomImg} />
      </div>
      {d.venueTitle && (
        <p data-a="up" className={cx(st.phB, "mx-auto text-center")} style={vars({ marginTop: U(26), width: U(366), fontSize: U(28), lineHeight: `${U(31)}`, color: "var(--ink)", overflowWrap: "anywhere", "--d": "0.15s" })}>
          {d.venueTitle}
        </p>
      )}
      {d.address && (
        <p data-a="up" className={cx(st.ms, "mx-auto text-center")} style={vars({ marginTop: U(d.venueTitle ? 15 : 26), width: U(300), fontSize: U(16), lineHeight: `${U(24)}`, color: "var(--mute)", overflowWrap: "anywhere", "--d": "0.22s" })}>
          {d.address}
        </p>
      )}
      <div data-a="up" className="flex justify-center" style={vars({ marginTop: U(46), "--d": "0.3s" })}>
        <a
          href={linkable ? d.mapUrl : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(st.msM, st.btn)}
          style={{ minWidth: U(200), height: U(52), padding: `0 ${U(24)}`, fontSize: U(16), borderRadius: U(26) }}
        >
          {t("Xaritada ochish")}
        </a>
      </div>
    </Sec>
  );
}

/* ═════════════ 07 · Dress-kod (ixtiyoriy — o‘chirilsa joy qolmaydi) ═════════════ */
function Dress({ d, z, wide, tail }: { d: D; z: number; wide: boolean; tail: number }) {
  const t = useT();
  if (!d.dressNote) return null;
  return (
    <Sec z={z} bg="cream" wide={wide} colStyle={{ paddingTop: U(41), paddingBottom: U(120 + tail) }}>
      <div className="relative" style={{ height: U(42) }}>
        <Bodom a="pop" d={0.05} style={{ left: U(180), top: 0, width: U(30), height: U(42) }} />
      </div>
      <Title text={t("Dress-kod")} d={0.1} style={{ marginTop: U(13) }} />
      <div className="relative" style={{ marginTop: U(16.7273), height: U(18.5455) }}>
        <Ajratgich x={110} y={0} w={170} d={0.2} />
      </div>
      <p data-a="up" className={cx(st.ms, "mx-auto text-center")} style={vars({ marginTop: U(18.7273), width: U(300), fontSize: U(17), lineHeight: `${U(27)}`, color: "var(--mute)", overflowWrap: "anywhere", "--d": "0.25s" })}>
        {d.dressNote}
      </p>
    </Sec>
  );
}

/* ═════════════ 08 · Anketa — javob (anor rang fon, krem karta, karta boshida atlas chizig‘i) ═════════════ */
function Rsvp({ d, slug, mode, z, wide, tail }: { d: D; slug: string; mode: InvitationSiteProps["mode"]; z: number; wide: boolean; tail: number }) {
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
  const sub = d.rsvpUntil ? t("Javobingizni {date} kutamiz", { date: d.rsvpUntil }) : t("Javobingizni kutamiz");
  return (
    <Sec z={z} bg="grad" wide={wide} deco="atlas" id="sandiq-javob" colStyle={{ paddingTop: U(56), paddingBottom: U(68 + tail) }}>
      <Title text={t("Kelasizmi?")} fs={36} h={40} color="var(--cream)" />
      <p
        data-a="up"
        className={cx(st.ms, "mx-auto text-center")}
        style={vars({ marginTop: U(14), width: U(366), fontSize: U(15), lineHeight: `${U(20)}`, color: "rgba(250,244,234,.8)", overflowWrap: "anywhere", "--d": "0.12s" })}
      >
        {sub}
      </p>
      <div
        data-a="rise"
        className={cx(st.card, "relative mx-auto overflow-hidden")}
        style={vars({ marginTop: U(36), width: U(334), padding: `${U(48)} ${U(30)} ${U(44)}`, borderRadius: U(20), boxShadow: `0 ${U(10)} ${U(30)} rgba(51,13,8,.3)`, "--d": "0.2s" })}
      >
        <div aria-hidden className={st.cardStripe} style={{ height: U(24), backgroundImage: `url(${P}/atlas-h.svg)`, backgroundSize: `${U(192)} ${U(25.6)}`, backgroundPosition: `0 ${U(-0.8)}` }} />
        {sent ? (
          <div key="thanks" className={cx(st.thanks, "relative flex flex-col items-center text-center")} style={{ padding: `${U(30)} ${U(6)} ${U(10)}`, gap: U(16), minHeight: U(300) }}>
            <p className={st.phB} style={{ fontSize: U(sent === "not_coming" ? 30 : 26), lineHeight: 1.25, color: "var(--pom)", overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Rahmat!") : t("Rahmat! Joyingiz band qilindi")}
            </p>
            <p className={st.ms} style={{ fontSize: U(16), color: "var(--mute)", lineHeight: 1.55, overflowWrap: "anywhere" }}>
              {sent === "not_coming"
                ? t("Javobingiz uchun rahmat — sizni duolarimizda eslaymiz.")
                : t("{name} — {count} kishi. Javobingiz yetkazildi.", { name: name.trim() || t("Javobingiz"), count })}
            </p>
            <button type="button" onClick={() => setSent(null)} className={st.msM} style={{ fontSize: U(15), color: "var(--pom)", textDecoration: "underline", textUnderlineOffset: 3 }}>
              {t("Javobni o‘zgartirish")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="relative flex flex-col items-stretch">
            {label(t("Ismingiz"))}
            <label className={st.field} style={{ marginTop: U(6), height: U(48), padding: `0 ${U(14.8)}`, borderWidth: U(1.2), borderRadius: U(12) }}>
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
            <div className="flex w-full" role="radiogroup" aria-label={t("Kelasizmi?")} style={{ marginTop: U(18), gap: U(8) }}>
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
                  style={{ padding: `${U(6)} ${U(6)}`, minHeight: U(48), fontSize: U(15), borderWidth: U(1.2), borderRadius: U(24) }}
                >
                  <span style={{ overflowWrap: "anywhere" }}>{t(l)}</span>
                </button>
              ))}
            </div>
            {status === "coming" && (
              <div className="flex w-full items-center" style={{ marginTop: U(20), gap: U(8), minHeight: U(36) }}>
                <p className={st.ms} style={{ flex: "1 1 0", minWidth: 0, fontSize: U(15), lineHeight: 1.3, color: "var(--ink)" }}>
                  {t("Necha kishi bo‘lasiz?")}
                </p>
                <button
                  type="button"
                  className={cx(st.msM, st.step)}
                  disabled={count <= 1}
                  onClick={() => setCount((c) => Math.max(1, c - 1))}
                  aria-label={t("Kamaytirish")}
                  style={{ width: U(32), height: U(36), fontSize: U(18), borderWidth: U(1.2), borderRadius: U(18) }}
                >
                  −
                </button>
                <span className={st.msM} style={{ width: U(32), textAlign: "center", fontSize: U(18), lineHeight: 1.4, color: "var(--pom)" }} aria-live="polite">
                  {count}
                </span>
                <button
                  type="button"
                  className={cx(st.msM, st.step)}
                  disabled={count >= 20}
                  onClick={() => setCount((c) => Math.min(20, c + 1))}
                  aria-label={t("Ko‘paytirish")}
                  style={{ width: U(32), height: U(36), fontSize: U(18), borderWidth: U(1.2), borderRadius: U(18) }}
                >
                  +
                </button>
              </div>
            )}
            <div style={{ marginTop: U(20) }}>{label(t("Tilaklaringiz"))}</div>
            <label
              className={st.field}
              style={{ marginTop: U(6), height: U(96), padding: `${U(11.8)} ${U(14.8)}`, borderWidth: U(1.2), borderRadius: U(12), justifyContent: "flex-start", alignItems: "flex-start" }}
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
              <p className={st.ms} style={{ marginTop: U(12), color: "#a32a37", fontSize: U(14) }}>
                {err}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className={cx(st.msM, st.submit)}
              style={{ marginTop: U(26), minHeight: U(54), padding: `${U(12)} ${U(12)}`, fontSize: U(16), borderRadius: U(27), opacity: busy ? 0.7 : 1 }}
            >
              {busy ? t("Yuborilmoqda…") : t("Javobni yuborish")}
            </button>
          </form>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 09 · Final — sandiq yana ochiladi (scroll bilan: --fc 0 … 1 = Figma kadri; sahifa oxirigacha albatta tugaydi),
 * nur yuqoriga ko‘tariladi ═════════════ */
const FIN = {
  m: {
    W: 390,
    H: 844,
    stripes: [
      [14, 36, 288],
      [340, 36, 288],
    ] as [number, number, number][],
    bodom: [178, 96.2, 34, 47.6] as const,
    title: [160, 49, 44],
    text: [30, 228, 330, 21, 24],
    /** matnlar eni — atlas chiziqlari orasida (14+36 … 340) */
    max: 288,
    div: [110, 282.7273, 170],
    family: [318, 31, 28],
    date: [362, 19, 14, 4],
    glow: [15, 420, 360],
    chest: { x: 50, y: 455, s: 290 } as Box,
  },
  l: {
    W: 1440,
    H: 900,
    stripes: [
      [40, 48, 384],
      [124, 27, 216],
      [1289, 27, 216],
      [1352, 48, 384],
    ] as [number, number, number][],
    bodom: [700, 68, 40, 56] as const,
    title: [140, 72, 64],
    text: [420, 236, 600, 28, 31],
    max: 1100,
    div: [600, 292.9091, 240],
    family: [334, 40, 36],
    date: [390, 22, 16, 5],
    glow: [480, 410, 480],
    chest: { x: 530, y: 460, s: 380 } as Box,
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
      // sandiq butunlay ko‘ringanda boshlanadi (tepasi ekranning 85% idan yuqorida, pastki cheti ekran ichida) va 0.45 ekran skrollda
      // tugaydi — sahifa oxiri undan oldin kelsa, oxirida tugaydi (ochilish doim ko‘z oldida)
      const y = window.scrollY;
      const top = r.top + y;
      const u = r.height / G.H;
      const cb = G.chest;
      const shut = closedFrom(cb);
      const chestTop = top + u * (shut.y + shut.s * (209 / 1024));
      const chestBot = top + u * (cb.y + cb.s * OP.bot);
      const max = document.documentElement.scrollHeight - vh;
      const s0 = Math.min(Math.max(chestTop - vh * 0.85, chestBot - vh), max - 1);
      const s1 = Math.max(s0 + 1, Math.min(s0 + vh * 0.45, max));
      const f = seg(y, s0, s1);
      el.style.setProperty("--fc", f.toFixed(4));
      if (f > 0.5) onSeen();
    },
    [onSeen, G],
  );
  useScrollProgress(sec, onP, !still);
  const { W, H } = G;
  const title = t("Sizni kutamiz!");
  const [tx, ty, tw, tfs, tlh] = G.text;
  const [gx, gy, gs] = G.glow;
  const place = (b: Box): CSSProperties => ({ left: U(b.x), top: U(b.y), width: U(b.s), height: U(b.s) });
  return (
    <section ref={sec} className={cx(st.sec, st.grad)} style={vars({ zIndex: z, "--u": wide ? CANVAS_L : COL_M })}>
      <SeamLenta wide={wide} top={[-139.2056, -209.1431]} flip />
      <div ref={ref} className={cx(st.finalWrap, "relative mx-auto")} style={vars({ width: U(W), height: U(H), ...(still ? { "--fc": 1 } : {}) })}>
        {G.stripes.map(([x, w, tile], i) => (
          <div key={i} aria-hidden data-a="fade" className={st.fStripe} style={vars({ left: U(x), top: 0, height: U(H), "--d": `${(i % 2) * 0.12}s`, "--t": "1.4s", ...(atlasStyle(w, tile, U) as Record<string, string>) })} />
        ))}
        <Bodom a="pop" d={0.05} style={{ left: U(G.bodom[0]), top: U(G.bodom[1]), width: U(G.bodom[2]), height: U(G.bodom[3]) }} />
        <h2 data-a="up" className={cx(st.phB, "absolute inset-x-0 text-center")} style={vars({ top: U(G.title[0]), height: U(G.title[1]), fontSize: U(G.title[2]), lineHeight: `${U(G.title[1])}`, color: "var(--cream)", "--d": "0.1s" })}>
          <Fit base={G.title[2]} max={G.max} deps={title}>
            {title}
          </Fit>
        </h2>
        <div data-a="up" className={cx(st.phI, "absolute text-center")} style={vars({ left: U(tx), top: U(ty), width: U(tw), color: "var(--saf)", "--d": "0.2s" })}>
          <NameLines text={t("Dasturxonimiz sizsiz to‘kis emas.")} base={tfs} max={Math.min(G.max, tw)} lh={tlh} two={tfs * 0.9} twoLh={tlh * 0.92} />
        </div>
        <Ajratgich x={G.div[0]} y={G.div[1]} w={G.div[2]} d={0.3} />
        <div className="absolute inset-x-0" style={{ top: U(G.family[0]) }}>
          {d.family && (
            <div data-a="up" className={cx(st.phB, "relative text-center")} style={vars({ color: "var(--cream)", "--d": "0.35s" })}>
              <NameLines text={d.family} base={G.family[2]} max={G.max} lh={G.family[1]} two={G.family[2] * 0.85} twoLh={G.family[1] * 0.85} />
            </div>
          )}
          {d.dots && (
            <p
              data-a="up"
              className={cx(st.msM, "text-center")}
              style={vars({
                marginTop: U(d.family ? G.date[0] - G.family[0] - G.family[1] : 0),
                height: U(G.date[1]),
                fontSize: U(G.date[2]),
                lineHeight: `${U(G.date[1])}`,
                color: "rgba(250,244,234,.8)",
                whiteSpace: "nowrap",
                "--d": "0.45s",
              })}
            >
              <span style={{ letterSpacing: U(G.date[3]), paddingLeft: U(G.date[3]) }}>{d.dots}</span>
            </p>
          )}
        </div>
        <Glow className={st.fGlow} style={{ left: U(gx), top: U(gy), width: U(gs), height: U(gs) }}>
          <span className={st.beam} />
        </Glow>
        <Chest target={G.chest} start={G.chest} closed={closedFrom(G.chest)} place={place} className={st.fChest} />
      </div>
    </section>
  );
}

/* ═════════════ Musiqa tugmasi — Figma «Sandiq / Musiqa tugmasi»: anor rang doira, za’faron halqa, 3 chiziq ritmda; o‘chirilgan — xira chiziqlar va qiya chiziq ═════════════ */
const BARS: [number, number, number][] = [
  [26, 25, 12],
  [32, 21, 20],
  [38, 24, 14],
];
function SandiqMusic({ m, wide, embedded }: { m: ReturnType<typeof useMusic>; wide: boolean; embedded: boolean }) {
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
        <circle cx="34" cy="31" r="20.5" fill="none" stroke="#E0A23B" />
        {BARS.map(([x, y, h], i) => (
          <rect key={i} x={x} y={y} width={3} height={h} rx={1.5} className={st.bar} style={vars({ "--i": i })} />
        ))}
        <path d="M24 41L44 21" className={st.strike} />
      </svg>
    </button>
  );
  return embedded ? <div style={{ position: "sticky", top: 0, height: 0, zIndex: 70 }}>{btn}</div> : btn;
}

/* ═════════════ Sahifa ═════════════ */
type Key = "taklif" | "shahzoda" | "sana" | "program" | "venue" | "dress" | "rsvp" | "final";
/**
 * Finaldagi atlas lenta oldingi bo‘lim pastiga ~84 birlik kirib turadi (Figma 08/09). Har bo‘limning pastki bo‘sh joyi (matn/tugmagacha)
 * yetmasa — o‘sha bo‘limga qo‘shimcha pastki joy (tail) beriladi: ixtiyoriy bo‘lim o‘chirilganda ham lenta matn ustiga tushmaydi.
 */
const OVER = 94;
const ROOM: Record<Exclude<Key, "final">, number> = { taklif: 85.8, shahzoda: 72, sana: 36, program: 90, venue: 68, dress: 120, rsvp: 110 };

export function SandiqSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const loaded = usePreload(
    [`${P}/sandiq-yopiq.webp`, `${P}/sandiq-ochiq.webp`, `${P}/atlas.svg`, d.portrait],
    [`${P}/lenta.webp`, `${P}/lagan.webp`, `${P}/atlas-h.svg`, d.circle, d.hall].filter(Boolean) as string[],
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

  const shown: Key[] = (["taklif", "shahzoda", "sana", "program", "venue", "dress", "rsvp", "final"] as Key[]).filter((k) =>
    k === "shahzoda"
      ? !!d.circle
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
  const lastK = shown[shown.length - 2] as Exclude<Key, "final">;
  const tail = (k: Exclude<Key, "final">) => (k === lastK ? Math.max(0, OVER - ROOM[k]) : 0);
  const linkable = mode !== "preview";
  const colU = wide ? COL_L : COL_M;
  const fu = (n: number) => (wide ? C(n) : U(n));

  return (
    <div ref={root} className={st.root}>
      <div className={st.page} style={vars({ "--u": colU })}>
        <SandiqMusic m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/non.webp`} />}
        <div className={cx(st.flow, st.opening)} style={embedded ? vars({ "--o": 1 }) : undefined}>
          {withGate && (loaded ? <Gate d={d} wide={wide} onStart={() => music.play(true)} /> : <div className={st.gateHold} />)}
          {embedded && <Gate d={d} wide={wide} still onStart={() => {}} />}
          <div className={cx(st.openWrap, embedded && st.openStill)} style={{ zIndex: 5 }}>
            <Hero d={d} wide={wide} still={embedded} />
            {withGate && <div className={st.openSpacer} />}
          </div>
          <Taklif d={d} z={z("taklif")} wide={wide} tail={tail("taklif")} />
          <Shahzoda d={d} z={z("shahzoda")} wide={wide} tail={tail("shahzoda")} />
          <Sana d={d} z={z("sana")} wide={wide} tail={tail("sana")} />
          <Program d={d} z={z("program")} wide={wide} tail={tail("program")} />
          <Venue d={d} z={z("venue")} wide={wide} linkable={linkable} tail={tail("venue")} />
          <Dress d={d} z={z("dress")} wide={wide} tail={tail("dress")} />
          {data.rsvpEnabled && <Rsvp d={d} slug={data.slug} mode={mode} z={z("rsvp")} wide={wide} tail={tail("rsvp")} />}
          <Final d={d} z={z("final")} wide={wide} still={embedded} onSeen={onFinal} />
        </div>
        <footer className={cx(st.footer, "flex items-start justify-center")} style={{ height: fu(120), paddingTop: fu(50) }}>
          <p className={cx(st.ms, "text-center")} style={{ fontSize: fu(13), lineHeight: 18 / 13, color: "rgba(250,244,234,.6)" }}>
            <a href="https://shohnoma.uz">Shohnoma</a> · {t("elektron taklifnomalar")}
          </p>
        </footer>
      </div>
    </div>
  );
}
