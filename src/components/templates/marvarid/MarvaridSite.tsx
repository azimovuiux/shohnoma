"use client";

import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/playfair-display/400-italic.css";
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
import { calendarWords, coordsFrom, downloadIcs, untilPhrase, type ProgramItem } from "../anor/data";
import { dativeUz } from "../koinot/data";
import { DRESS_TEXT, MARVARID_DEMO, MARVARID_DEMO_EN, MARVARID_DEMO_RU, MSG, MSG2, MSG2_WE, MSG_HOST, MSG_WE, P } from "./data";
import st from "./marvarid.module.css";

/* ── Birliklar ──
 * U — joriy `--u`. Bo‘limlarda — kontent ustuni (Figma mobil 390 koordinatalari; laptopda ustun = mobil × 1.2, ya’ni 468px / 1440 —
 * Figma «Kontent ustuni (mobil ×1.2)»). C — laptop kanvasi (1440) birligi: yon bezaklar (lola, bant, marvarid shoda, yurakchalar).
 * Ochilish (00) — o‘z kanvasi (mobil 390×844, laptop 1440×1013): sahna bir ekranga sig‘adi va pastki chetga bog‘lanadi;
 * laptopda ustun elementlari = mobil koordinata × 1.2 + 486 (Figma bilan aynan). */
const U = (n: number) => `calc(var(--u) * ${+n.toFixed(3)})`;
const C = (n: number) => `calc(100cqw / 1440 * ${+n.toFixed(3)})`;
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const vars = (o: Record<string, string | number | undefined>) => o as CSSProperties;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const COL_M = "calc(100cqw / 390)";
const COL_L = "calc(100cqw / 1440 * 1.2)";
const CANVAS_L = "calc(100cqw / 1440)";

/* Ranglar (Figma «19 · Marvarid — Assets») */
const RED = "#B5162B";
const CREAM = "#FFF8F3";

/* ═════════════ Yosh ═════════════ */
/** «20» → 20 (1…120); bo‘lmasa 0 */
function parseAge(raw: string) {
  const n = Math.round(Number(String(raw).replace(/[^\d.]/g, "")));
  return raw.trim() && Number.isFinite(n) && n >= 1 && n <= 120 ? n : 0;
}
/** Hero’dagi «yoshga / to‘lyapman» birinchi qatori: ruscha «год / года / лет», inglizcha «year / years» (kalit — tarjima lug‘atida) */
function ageKey(n: number, lang: Locale) {
  if (lang === "ru") {
    const a = n % 10;
    const b = n % 100;
    return a === 1 && b !== 11 ? "yoshga|1" : a >= 2 && a <= 4 && (b < 12 || b > 14) ? "yoshga|2" : "yoshga";
  }
  return lang === "en" && n === 1 ? "yoshga|1" : "yoshga";
}

/** Server yaratadigan standart taklif matni (php/api/lib/orders.php DEFAULT_MESSAGE) — har qaysi tilda */
const SERVER_DEFAULT = "Aziz mehmonlar! Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.";
const isServerDefault = (m: string) => (["uz", "ru", "en"] as Locale[]).some((l) => tr(l, SERVER_DEFAULT).trim() === m.trim());

function useData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO = lang === "ru" ? MARVARID_DEMO_RU : lang === "en" ? MARVARID_DEMO_EN : MARVARID_DEMO;
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
    // taklif qiluvchi (ixtiyoriy: masalan, ota-ona): bo‘lsa — matnlar «biz» nomidan, imzo — shu; bo‘lmasa — bayram egasining o‘zi nomidan
    const host = demo ? "" : str("host");
    const we = !!host;
    const age = parseAge(str("age") || (demo ? DEMO.age : ""));
    const code = str("dressCode") || (demo ? DEMO.dressCode : "");
    const dressNote = str("dressNote") || (DRESS_TEXT[code] ? t(DRESS_TEXT[code]) : "");
    const time = sd?.time ?? "";
    const program = (demo ? DEMO.program : exProgram.length ? exProgram : ((data.program ?? []) as ProgramItem[])) as ProgramItem[];
    const raw = (demo ? "" : data.message || "").trim();
    const custom =
      raw && !isServerDefault(raw)
        ? raw.replace(/^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Muhtaram mehmonlar!|Aziz do‘stlarim!|Aziz do‘stlar!|Azizlarim!|Дорогие гости!|Дорогие друзья!|Мои дорогие!|Dear guests!|Dear friends!|My dears!)\s*/, "").trim()
        : "";
    const message = custom || (we ? (a ? t(MSG_HOST, { name: a }) : t(MSG_WE)) : t(MSG));
    const venueTitle = ((demo ? t(data.venueName) : data.venueName) || "").trim();
    const address = ((demo ? DEMO.address : data.address) || "").trim();
    const coords = coordsFrom(data.mapUrl);
    const m = date ? date.getUTCMonth() : 0;
    const year = date ? date.getUTCFullYear() : 0;
    const day = date ? date.getUTCDate() : 0;
    // namunada javob muddati — Figma’dagidek sanadan 4 kun oldin («15-dekabrgacha»)
    const deadline = demo && sd ? new Date(Date.UTC(year, m, day - 4)).toISOString().slice(0, 10) : data.rsvpDeadline;
    const wd = date ? cw.weekday[date.getUTCDay()] : "";
    // kalendar: oyning birinchi kuni (Du = 0) va kunlar soni
    const first = date ? (new Date(Date.UTC(year, m, 1)).getUTCDay() + 6) % 7 : 0;
    const days = date ? new Date(Date.UTC(year, m + 1, 0)).getUTCDate() : 0;
    // Figma: hero — arkada bayram egasi surati, manzil — kafe zali (mijozda: 1–2-suratlar; hero surati bo‘lmasa —
    // arkada ismning birinchi harfi, 2-surat bo‘lmasa — shablonning kafe surati)
    const portrait = demo ? `${P}/portret.webp` : photos[0] || "";
    const hall = demo ? `${P}/joy.webp` : photos[1] || `${P}/joy.webp`;
    return {
      a,
      we,
      host,
      /** imzo: taklif qiluvchi yoki bayram egasining o‘zi */
      signer: host || a,
      age,
      mono: a ? Array.from(a)[0].toLocaleUpperCase(lang) : "",
      /** ochilish sarlavhasi: ism; ism bo‘lmasa — «Tug‘ilgan kun» */
      title: a || t("Tug‘ilgan kun"),
      /** hero: «yoshga / to‘lyapman» («biz» bo‘lsa — «to‘lyapti») */
      ageLines: age ? [t(ageKey(age, lang)), t(we ? "to‘lyapti" : "to‘lyapman")] : [],
      /** «19 · 12 · 2026» */
      dots: sd?.dots ?? "",
      /** «Dekabr 2026» */
      monthYear: date ? `${cw.months[m]} ${year}` : "",
      cal: { day, first, days, week: cw.week },
      /** «Shanba · soat 18:00» */
      wdTime: date ? [wd, time ? t("soat {time}", { time }) : ""].filter(Boolean).join(" · ") : "",
      hasDate: !!date,
      iso: sd?.iso ?? "",
      time,
      target: data.date ? tashkentDate(data.date).getTime() : null,
      guest,
      message,
      msg2: t(we ? MSG2_WE : MSG2),
      venueTitle,
      address,
      hasPlace: !!(venueTitle || address || data.mapUrl),
      mapUrl: data.mapUrl || `https://yandex.uz/maps/?text=${encodeURIComponent([venueTitle, address].filter(Boolean).join(", "))}`,
      taxi: coords
        ? `https://3.redirect.appmetrica.yandex.com/route?end-lat=${coords.lat}&end-lon=${coords.lon}&appmetrica_tracking_id=1178268795219780156`
        : `https://yandex.uz/maps/?rtext=~${encodeURIComponent([address, venueTitle].filter(Boolean).join(", "))}&rtt=taxi`,
      program,
      dressCode: DRESS_TEXT[code] || str("dressCode") ? t(code) : "",
      dressNote,
      portrait,
      hall,
      rsvpUntil: untilPhrase(deadline, lang),
      /** anketa: «Mohinurga tilaklaringiz» (ruscha/inglizcha — ism kelishiksiz); uzun ism — faqat birinchi so‘z */
      wishLabel: a ? t("{dat} tilaklaringiz", { dat: dativeUz(a.split(/\s+/)[0]), name: a.split(/\s+/)[0] }) : t("Tilaklaringiz"),
      /** final ostidagi imzo: taklif qiluvchi yoki bayram egasi */
      finalSub: host || a,
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

/**
 * Chok ustidagi va yon bezaklar (lola, bant, marvarid shoda) — skrollda sekin parallaks (`--py`, ±30px).
 * Faqat `translate` — paydo bo‘lish transformi bilan to‘qnashmaydi. Osilgan bezaklar tebranmaydi (qoida §3).
 */
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
        const k = +(x.dataset.pk || 0.1);
        x.style.setProperty("--py", `${Math.max(-30, Math.min(30, dist * -k)).toFixed(1)}px`);
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

/** Qator (yosh raqami + «yoshga to‘lyapman») ota konteyner eniga sig‘masa — butunlay kichrayadi (markazdan, transform bilan) */
function FitRow({ children, deps, className, style }: { children: ReactNode; deps: unknown; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  useIso(() => {
    const el = ref.current;
    const box = el?.parentElement;
    if (!el || !box) return;
    const measure = () => {
      el.style.scale = "";
      const k = Math.min(1, box.clientWidth / Math.max(1, el.offsetWidth));
      el.style.scale = k < 0.999 ? k.toFixed(4) : "";
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [deps]);
  return (
    <div ref={ref} className={cx("flex items-center", className)} style={{ whiteSpace: "nowrap", flex: "none", ...style }}>
      {children}
    </div>
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
 * har qator `two` o‘lchamida. `letters` — har harf alohida span (`--li` — tartib raqami; CSS kechikish beradi).
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
  letters?: boolean;
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
                    <span key={k} className={st.letter} style={vars({ "--li": idx++ })}>
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
type Pos = (n: number) => string;
type Art = "bant" | "shoda" | "lola" | "tort";
type Box = readonly [number, number, number, number];

/**
 * Figma’da burilgan instansiya: (bx, by, bw, bh) — get_design_context dagi tashqi (burilgan) quti, (iw, ih) — burilmagan rasm o‘lchami.
 * Natija — markazi tashqi quti markazida bo‘lgan burilmagan quti (CSS `rotate` markaz atrofida).
 */
const rb = (bx: number, by: number, bw: number, bh: number, iw: number, ih: number): Box => [bx + bw / 2 - iw / 2, by + bh / 2 - ih / 2, iw, ih];

/**
 * Rasm-bezak (Figma «Marvarid / Qatlam · …», fonlari kesilgan, Normal blend): tashqi qavat — joy va parallaks (`data-px`),
 * o‘rta — paydo bo‘lish (`data-a`), ichki — burilish (Figma’dagi qiya lola/bant). Marvarid shoda — yaltiroq (`shine`) o‘tadi.
 */
function Deco({
  art,
  box,
  unit,
  left,
  top,
  rot = 0,
  a = "pop",
  d = 0,
  px,
  pk,
  className,
  eager,
}: {
  art: Art;
  box: Box;
  unit: Pos;
  left?: Pos;
  top?: Pos;
  rot?: number;
  a?: string;
  d?: number;
  px?: boolean;
  pk?: number;
  className?: string;
  eager?: boolean;
}) {
  const [x, y, w, h] = box;
  return (
    <div aria-hidden data-px={px ? "" : undefined} data-pk={pk} className={cx(st.art, className)} style={{ left: (left ?? unit)(x), top: (top ?? unit)(y), width: unit(w), height: unit(h) }}>
      <div data-a={a || undefined} className={st.fill} style={vars({ "--d": `${d}s` })}>
        <div className={st.fill} style={rot ? { transform: `rotate(${rot}deg)` } : undefined}>
          <Img src={`${P}/${art}.webp`} eager={eager} />
          {art === "shoda" && <span className={st.shine} />}
        </div>
      </div>
    </div>
  );
}

/** Figma’dagi «♡» belgisi (Playfair’da yo‘q — Figma zaxira shriftdagi ingichka yurakcha): x, y — matn qutisi boshi, fs — shrift o‘lchami */
const HEART = "M50 104 L9 48 C-2 32 5 8 27 7 C38 6 46 13 50 23 C54 13 62 6 73 7 C95 8 102 32 91 48 Z";
function Heart({ x, y, fs, c = RED, unit, left, bottom, d = 0, float = true }: { x: number; y: number; fs: number; c?: string; unit: Pos; left?: Pos; bottom?: number; d?: number; float?: boolean }) {
  // `bottom` — bo‘lim balandligi (Figma): yurakcha bo‘lim pastiga bog‘lanadi (matn uzaysa ham ustiga tushmaydi)
  const v = bottom != null ? { bottom: unit(bottom - y - fs * 1.05) } : { top: unit(y + fs * 0.35) };
  return (
    <span aria-hidden data-a="heart" className={st.heart} style={vars({ left: (left ?? unit)(x + fs * 0.05), ...v, width: unit(fs * 0.63), height: unit(fs * 0.7), "--d": `${d}s` })}>
      <svg viewBox="0 0 100 111" className={cx(st.svg, float && st.float)} style={float ? vars({ "--fd": `${-((x + y) % 5)}s` }) : undefined}>
        <path d={HEART} fill="none" stroke={c} strokeWidth={7.5} strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/* ═════════════ 00 · Ochilish — atlas lenta va bant (faqat scroll bilan, --o: 0…1) ═════════════
 * Yuklanganda (bosishsiz): marvarid shoda tepadan tushib o‘rnashadi, ism va sana sokin chiqadi, bant ozgina kattalashib joylashadi.
 * Scroll (rAF lerp): bantning ikki uchi pastga sirg‘alib tushadi (0.02…0.24); tugun kichrayib yo‘qoladi (0.12…0.34), undan yurakchalar
 * uchib chiqadi; atlas lenta o‘rtadan ikki bo‘lakka bo‘linib chap va o‘ngga tortiladi (0.22…1, ease-in-out), lenta bo‘ylab yaltiroq
 * yuguradi. Ochilish tugagach sahna odatdagidek yuqoriga ketadi va hero (01) ostidan chiqadi (qattiq chok — «sharpa» yo‘q). */
const GATE = {
  m: { W: 390, H: 844, S: 1, OX: 0 },
  l: { W: 1440, H: 1013, S: 1.2, OX: 486 },
} as const;
/** Tugun markazidan uchib chiqadigan yurakchalar: [dx, dy, o‘lcham, kechikish] (ustun birligida) */
const BURST = [
  [-150, -40, 30, 0],
  [140, -62, 24, 0.03],
  [-96, -84, 22, 0.05],
  [104, -18, 28, 0.02],
  [-64, 50, 20, 0.07],
  [62, 62, 22, 0.04],
] as const;

function Gate({ d, wide, onStart, still = false }: { d: D; wide: boolean; onStart: () => void; still?: boolean }) {
  const t = useT();
  const wrap = useRef<HTMLDivElement>(null);
  const cb = useRef(onStart);
  cb.current = onStart;
  useEffect(() => {
    const el = wrap.current;
    if (!el || still) return;
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
      el.style.setProperty("--o", o.toFixed(4));
      el.style.pointerEvents = o > 0.1 ? "none" : "";
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
  const { W, H, S, OX } = G;
  const pageU = wide ? CANVAS_L : COL_M;
  // ustun koordinatalari (mobil 390) → sahna; laptopda × 1.2 + 486
  const X = (x: number) => `calc(50% + ${U(OX + S * x - W / 2)})`;
  const Y = (y: number) => `calc(100% - ${U(H - S * y)})`;
  const Z = (n: number) => U(S * n);
  const Xc = (x: number) => `calc(50% + ${U(x - W / 2)})`;
  const box = (x: number, y: number, w: number, h: number): CSSProperties => ({ left: X(x), top: Y(y), width: Z(w), height: Z(h) });
  // marvarid shodalar ekran tepasidan osilib turadi (baland ekranda ham tepaga bog‘langan)
  const hang = (x: number, y: number, w: number, h: number, c = false): CSSProperties => ({ left: c ? Xc(x) : X(x), top: c ? U(y) : Z(y), width: c ? U(w) : Z(w), height: c ? U(h) : Z(h) });
  // bant tuguni markazi (rasmda 512, 250 / 1024)
  const kx = 75 + 240 * 0.5;
  const ky = 364 + 240 * (250 / 1024);
  return (
    <div
      ref={wrap}
      className={cx(st.gateWrap, still && st.still)}
      style={vars(still ? { "--u": pageU, "--o": 0, height: U(H) } : { "--u": `min(${pageU}, calc(100svh / ${H}))` })}
    >
      <div className={st.gate} aria-label={t("Taklifnoma")} style={still ? { position: "relative", height: "100%" } : undefined}>
        <div aria-hidden className={st.gBg} />
        {/* marvarid shodalar (laptop: chap, o‘ng — kanvasda; markaziy — ustunda) */}
        {wide && (
          <>
            <div aria-hidden className={cx(st.art, st.gHang)} style={vars({ ...hang(90, 20, 480, 320, true), "--gd": "0.15s" })}>
              <Img src={`${P}/shoda.webp`} eager />
              <span className={st.shine} />
            </div>
            <div aria-hidden className={cx(st.art, st.gHang)} style={vars({ ...hang(870, 20, 480, 320, true), "--gd": "0.25s" })}>
              <Img src={`${P}/shoda.webp`} eager />
              <span className={st.shine} />
            </div>
          </>
        )}
        <div aria-hidden className={cx(st.art, st.gHang)} style={vars({ ...hang(-15, 0, 420, 280), "--gd": "0s" })}>
          <Img src={`${P}/shoda.webp`} eager />
          <span className={st.shine} />
        </div>
        {/* ism va «tug‘ilgan kun kechasi» (uzun ism — 2 qatorga, pastga o‘sadi) */}
        <div className={cx(st.gIn, "absolute text-center")} style={vars({ left: X(24), width: Z(342), top: Y(226), "--gd": "0.2s" })}>
          <h1 className={st.pf} style={{ color: RED }}>
            <NameLines text={d.title} base={58 * S} max={342 * S} lh={64 * S} two={40 * S} twoLh={44 * S} />
          </h1>
          <p className={st.ms5} style={{ marginTop: Z(8), height: Z(26), fontSize: Z(19), lineHeight: `${Z(26)}`, color: "var(--ink)", whiteSpace: "nowrap" }}>
            <Fit base={19 * S} max={342 * S} deps={t("tug‘ilgan kun kechasi")}>
              {t("tug‘ilgan kun kechasi")}
            </Fit>
          </p>
        </div>
        {/* atlas lenta — butun kenglik; ikki yarmi chap va o‘ngga tortiladi */}
        <div aria-hidden className={st.ribbon} style={{ top: Y(450), height: Z(58) }}>
          <span className={cx(st.half, st.halfL)}>
            <span className={st.sheen} />
          </span>
          <span className={cx(st.half, st.halfR)}>
            <span className={st.sheen} />
          </span>
        </div>
        {/* yurakchalar — tugundan uchib chiqadi */}
        {BURST.map(([dx, dy, s, dl], i) => (
          <span key={i} aria-hidden className={st.burst} style={vars({ left: X(kx - s * 0.32), top: Y(ky - s * 0.35), width: Z(s * 0.63), height: Z(s * 0.7), "--bx": Z(dx), "--by": Z(dy), "--bd": dl })}>
            <svg viewBox="0 0 100 111" className={st.svg}>
              <path d={HEART} fill={i % 2 ? "none" : RED} stroke={RED} strokeWidth={7.5} strokeLinejoin="round" />
            </svg>
          </span>
        ))}
        {/* atlas bant: uchlari (chap, o‘ng) va tugun — alohida qatlamlar (bir rasm, clip-path) */}
        <div aria-hidden className={cx(st.art, st.gIn, st.gBow)} style={vars({ ...box(75, 364, 240, 240), "--gd": "0.1s" })}>
          <div className={cx(st.fill, st.tail, st.tailL)}>
            <Img src={`${P}/bant.webp`} eager />
          </div>
          <div className={cx(st.fill, st.tail, st.tailR)}>
            <Img src={`${P}/bant.webp`} eager />
          </div>
          <div className={cx(st.fill, st.knot)}>
            <Img src={`${P}/bant.webp`} eager />
          </div>
        </div>
        {/* sana: «19 · 12 · 2026» */}
        {d.dots && (
          <p className={cx(st.ms6, st.gIn, "absolute text-center")} style={vars({ left: X(24), width: Z(342), top: Y(680), height: Z(27), fontSize: Z(20), lineHeight: `${Z(27)}`, color: RED, whiteSpace: "nowrap", "--gd": "0.35s" })}>
            {d.dots}
          </p>
        )}
      </div>
    </div>
  );
}

/* ═════════════ Bo‘lim qobig‘i ═════════════ */
type Bg = "cream" | "pink" | "red";

/** Bo‘lim: to‘liq enli fon + markazda kontent ustuni (mobil 390 birlik; laptopda × 1.2). `outer` — ustundan tashqaridagi bezaklar */
function Sec({
  children,
  z,
  bg,
  colStyle,
  id,
  outer,
  className,
  secRef,
}: {
  children: ReactNode;
  z: number;
  bg: Bg;
  colStyle?: CSSProperties;
  id?: string;
  outer?: ReactNode;
  className?: string;
  secRef?: React.Ref<HTMLElement>;
}) {
  return (
    <section ref={secRef} id={id} className={cx(st.sec, st[bg], className)} style={{ zIndex: z }}>
      {outer}
      <div className={st.col} style={{ width: U(390), ...colStyle }}>
        {children}
      </div>
    </section>
  );
}

/** Laptop yon bezaklari (1440 kanvas, bo‘lim tepasidan) */
function Side({ wide, children }: { wide: boolean; children: ReactNode }) {
  if (!wide) return null;
  return (
    <div aria-hidden className={st.deco}>
      {children}
    </div>
  );
}

/** Sarlavha (Playfair Display Italic, markazda, 360 da sig‘adi) */
function Title({ text, size = 40, h = 53, color = RED, d = 0 }: { text: string; size?: number; h?: number; color?: string; d?: number }) {
  return (
    <p data-a="up" className={cx(st.pf, "text-center")} style={vars({ height: U(h), fontSize: U(size), lineHeight: `${U(h)}`, color, whiteSpace: "nowrap", "--d": `${d}s` })}>
      <Fit base={size} max={342} deps={text}>
        {text}
      </Fit>
    </p>
  );
}

/* ═════════════ 01 · Hero — bayram egasi: arka ichida surat (1.08 → 1), arka chizig‘i yuqoridan pastga chiziladi, kichik bant tepadan
 * tushib «osiladi» (prujina), ism harflari pastdan ko‘tariladi, yosh raqami pastdan chiqadi. Surat bo‘lmasa — arkada ismning birinchi
 * harfi; yosh bo‘lmasa — raqam o‘rnida «tug‘ilgan kunimni nishonlayman» ═════════════ */
/** Arka chizig‘i (316×426, tepasi yarim doira r=158, past burchaklar r=30) — ikki yarmi tepadan pastga chiziladi */
const ARCH_L = "M158 0.6 A157.4 157.4 0 0 0 0.6 158 L0.6 396 A29.4 29.4 0 0 0 30 425.4 L158 425.4";
const ARCH_R = "M158 0.6 A157.4 157.4 0 0 1 315.4 158 L315.4 396 A29.4 29.4 0 0 1 286 425.4 L158 425.4";
function Hero({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const noAge = d.age ? null : (split2(t(d.we ? "tug‘ilgan kunini nishonlaydi" : "tug‘ilgan kunimni nishonlayman")) ?? [t("tug‘ilgan kunimni nishonlayman")]);
  return (
    <Sec
      z={z}
      bg="cream"
      className={st.heroSec}
      colStyle={{ paddingTop: U(546), paddingBottom: U(168) }}
      outer={
        <Side wide={wide}>
          <Deco art="lola" box={rb(137.91, 330, 288.45, 337.12, 240, 300)} rot={10} unit={C} px d={0.2} />
          <Deco art="lola" box={rb(1010, 338.32, 288.45, 337.12, 240, 300)} rot={-10} unit={C} px d={0.3} />
          <Heart x={300} y={160} fs={40} unit={C} d={0.3} />
          <Heart x={1120} y={200} fs={32} unit={C} d={0.4} />
        </Side>
      }
    >
      {/* arka: surat (yoki ism harfi) va chiziq */}
      <div data-a="zoom" className={st.arch} style={vars({ left: U(45), top: U(96), width: U(300), height: U(410), borderRadius: `${U(150)} ${U(150)} ${U(24)} ${U(24)}`, "--d": "0.05s" })}>
        {d.portrait ? (
          <Img src={d.portrait} eager className={st.zoomImg} />
        ) : (
          <div className={st.archEmpty}>
            <span className={st.pf} style={{ fontSize: U(220), lineHeight: 1, color: RED, paddingRight: U(18) }}>
              {d.mono || "♡"}
            </span>
          </div>
        )}
      </div>
      <svg aria-hidden data-a="arch" viewBox="0 0 316 426" className={st.archLine} style={vars({ left: U(37), top: U(88), width: U(316), height: U(426), "--d": "0.15s" })}>
        <path d={ARCH_L} pathLength={1} />
        <path d={ARCH_R} pathLength={1} />
      </svg>
      <div aria-hidden data-a="drop" className={st.art} style={vars({ left: U(140), top: U(40), width: U(110), height: U(110), "--d": "0.5s" })}>
        <Img src={`${P}/bant.webp`} eager />
      </div>
      {/* ism — harflari navbat bilan ko‘tariladi (2 qatorga bo‘linsa — pastga o‘sadi) */}
      {d.a && (
        <h2 data-a="letters" className={cx(st.pf, "relative text-center")} style={{ color: RED }}>
          <NameLines text={d.a} base={64} max={342} lh={70} two={44} twoLh={50} letters />
        </h2>
      )}
      {/* yosh: katta raqam + «yoshga / to‘lyapman» */}
      <div data-a="age" className="relative flex items-center justify-center" style={vars({ marginTop: U(d.a ? 20 : 90), height: U(96), "--d": "0.55s" })}>
        {d.age ? (
          <FitRow deps={`${d.age}|${d.ageLines.join("|")}`} style={{ gap: U(14) }}>
            <span className={cx(st.pf, st.ageNum)} style={{ fontSize: U(96), lineHeight: 1, color: "var(--ink)" }}>
              {d.age}
            </span>
            <span className={st.ms6} style={{ fontSize: U(21), lineHeight: 1.25, color: "var(--ink)" }}>
              {d.ageLines.map((l, i) => (
                <span key={i} className="block">
                  {l}
                </span>
              ))}
            </span>
          </FitRow>
        ) : (
          <FitRow deps={noAge!.join("|")}>
            <span className={cx(st.ms6, "text-center")} style={{ fontSize: U(21), lineHeight: 1.25, color: "var(--ink)" }}>
              {noAge!.map((l, i) => (
                <span key={i} className="block">
                  {l}
                </span>
              ))}
            </span>
          </FitRow>
        )}
      </div>
      <Heart x={64} y={790} fs={30} unit={U} d={0.6} bottom={900} />
      <Heart x={300} y={770} fs={22} unit={U} d={0.7} bottom={900} />
    </Sec>
  );
}

/* ═════════════ 02 · Taklif — murojaat (mehmon ismi bilan), matn, ikkinchi xatboshi va imzo (kursiv) ═════════════ */
function Taklif({ d, z, wide, tail }: { d: D; z: number; wide: boolean; tail: number }) {
  const t = useT();
  const hello = d.guest ? guestHello(t, "Hurmatli {guest}!", d.guest) : t(d.we ? "Aziz do‘stlar!" : "Azizlarim!");
  return (
    <Sec
      z={z}
      bg="pink"
      colStyle={{ paddingTop: U(96), paddingBottom: U(180 + tail) }}
      outer={
        <Side wide={wide}>
          <Deco art="bant" box={rb(170.5, 240, 225.35, 225.35, 190, 190)} rot={12} unit={C} px d={0.1} />
          <Deco art="bant" box={rb(1040, 260.5, 225.35, 225.35, 190, 190)} rot={-12} unit={C} px d={0.2} />
        </Side>
      }
    >
      {/* chok ustidagi lola guldasta (01/02) */}
      <Deco art="lola" box={rb(-17.05, -150, 167.65, 198.29, 144, 180)} rot={8} unit={U} px className={st.seam} />
      <div data-a="up" className={cx(st.pf, "relative text-center")} style={vars({ color: RED, "--d": "0.05s" })}>
        <NameLines text={hello} base={42} max={342} lh={56} two={30} twoLh={40} />
      </div>
      <p
        data-a="up"
        className={cx(st.ms, "relative mx-auto text-center")}
        style={vars({ marginTop: U(20), width: U(326), fontSize: U(20), lineHeight: `${U(30)}`, color: "var(--ink)", overflowWrap: "anywhere", whiteSpace: "pre-line", "--d": "0.12s" })}
      >
        {d.message}
      </p>
      <p data-a="up" className={cx(st.ms, "relative mx-auto text-center")} style={vars({ marginTop: U(38), width: U(326), fontSize: U(20), lineHeight: `${U(30)}`, color: "var(--ink)", "--d": "0.2s" })}>
        {d.msg2}
      </p>
      {d.signer && (
        <p data-a="up" className={cx(st.pf, "relative mx-auto text-center")} style={vars({ marginTop: U(60), width: U(326), fontSize: U(30), lineHeight: `${U(40)}`, color: RED, overflowWrap: "anywhere", "--d": "0.28s" })}>
          {d.signer}
        </p>
      )}
      <Heart x={48} y={520} fs={24} unit={U} d={0.3} bottom={640 + tail} />
      <Heart x={310} y={540} fs={30} unit={U} d={0.4} bottom={640 + tail} />
    </Sec>
  );
}

/* ═════════════ 03 · Sana — oy kalendari (kunlar navbat bilan chiqadi, bayram kuni atrofida doira chiziladi, yurakcha «uradi»),
 * hafta kuni · vaqt, 4 ta taymer kapsulasi (raqamlar yumshoq almashadi), kalendarga qo‘shish ═════════════ */
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
  const { first, days, day, week } = d.cal;
  const rows = Math.ceil((first + days) / 7);
  const extra = (rows - 5) * 44;
  const cell = (i: number) => ({ col: (first + i) % 7, row: Math.floor((first + i) / 7) });
  const sel = cell(day - 1);
  return (
    <Sec
      z={z}
      bg="red"
      colStyle={{ height: U(800 + extra + tail) }}
      outer={
        <Side wide={wide}>
          <Deco art="shoda" box={[40, 300, 380, 253]} unit={C} px d={0.1} />
          <Deco art="shoda" box={[1020, 360, 380, 253]} unit={C} px d={0.2} />
        </Side>
      }
    >
      {/* chok ustidagi bant (02/03) */}
      <Deco art="bant" box={[125, -80, 140, 140]} unit={U} px className={st.seam} />
      <div className="absolute inset-x-0" style={{ top: U(96) }}>
        <Title text={t("Bayram kuni")} color={CREAM} />
      </div>
      <p data-a="up" className={cx(st.ms6, "absolute inset-x-0 text-center")} style={vars({ top: U(158), height: U(25), fontSize: U(18), lineHeight: `${U(25)}`, color: CREAM, "--d": "0.08s" })}>
        {d.monthYear}
      </p>
      {week.map((w, i) => (
        <p key={w} data-a="day" className={cx(st.ms6, "absolute text-center")} style={vars({ left: U(34 + i * 46), width: U(46), top: U(200), height: U(19), fontSize: U(14), lineHeight: `${U(19)}`, color: "rgba(255,248,243,.7)", "--d": `${0.1 + i * 0.015}s` })}>
          {w}
        </p>
      ))}
      {/* bayram kuni: sut rang doira (atrofida chiziladigan halqa) va yurakcha */}
      <span aria-hidden data-a="ring" className={st.dayRing} style={vars({ left: U(34 + sel.col * 46 + 3), top: U(232 + sel.row * 44 - 9), width: U(40), height: U(40), "--d": `${0.25 + days * 0.015}s` })}>
        <svg viewBox="0 0 40 40" className={st.svg}>
          <circle cx="20" cy="20" r="10.1" pathLength={1} />
        </svg>
      </span>
      {Array.from({ length: days }, (_, i) => {
        const p = cell(i);
        const on = i + 1 === day;
        return (
          <p
            key={i}
            data-a="day"
            className={cx(on ? st.ms7 : st.ms5, "absolute text-center")}
            style={vars({ left: U(34 + p.col * 46), width: U(46), top: U(232 + p.row * 44), height: U(23), fontSize: U(17), lineHeight: `${U(23)}`, color: on ? RED : CREAM, "--d": `${0.16 + i * 0.015}s` })}
          >
            {i + 1}
          </p>
        );
      })}
      {/* Figma: doiraning o‘ng-yuqorisida; birinchi qatorda — hafta kunlari ustiga tushmasin, biroz pastroq */}
      <span aria-hidden data-a="beat" className={st.dayHeart} style={vars({ left: U(34 + sel.col * 46 + (sel.row ? 30 : 39) + 16 * 0.05), top: U(232 + sel.row * 44 - (sel.row ? 20 : 12) + 16 * 0.35), width: U(16 * 0.63), height: U(16 * 0.7), "--d": `${0.6 + days * 0.015}s` })}>
        <svg viewBox="0 0 100 111" className={st.svg}>
          <path d={HEART} fill="none" stroke={CREAM} strokeWidth={9} strokeLinejoin="round" />
        </svg>
      </span>
      <p data-a="up" className={cx(st.ms6, "absolute inset-x-0 text-center")} style={vars({ top: U(500 + extra), height: U(27), fontSize: U(20), lineHeight: `${U(27)}`, color: CREAM, whiteSpace: "nowrap", "--d": "0.1s" })}>
        <Fit base={20} max={342} deps={d.wdTime}>
          {d.wdTime}
        </Fit>
      </p>
      <div ref={ref}>
        {vals.map((v, i) => (
          <div key={i} data-a="flip" className={cx(st.tbox, "absolute")} style={vars({ left: U(28 + i * 86), top: U(560 + extra), width: U(76), height: U(96), borderRadius: U(38), borderWidth: U(1.2), "--d": `${0.1 + i * 0.1}s` })}>
            <p className={cx(st.pf, "absolute inset-x-0 text-center")} style={{ top: U(17.5), height: U(43), fontSize: U(32), lineHeight: `${U(43)}`, color: CREAM, whiteSpace: "nowrap" }}>
              <Fit base={32} max={70} deps={String(vals[0]).length}>
                <Digits value={v} run={inView} len={i === 0 ? Math.max(2, String(vals[0]).length) : 2} i={i} />
              </Fit>
            </p>
            <p className={cx(st.ms6, "absolute inset-x-0 text-center")} style={{ top: U(60.5), height: U(18), fontSize: U(13), lineHeight: `${U(18)}`, color: CREAM, whiteSpace: "nowrap" }}>
              <Fit base={13} max={68} deps={units[i]}>
                {units[i]}
              </Fit>
            </p>
          </div>
        ))}
      </div>
      <div data-a="up" className="absolute inset-x-0 flex justify-center" style={vars({ top: U(690 + extra), "--d": "0.3s" })}>
        <button
          type="button"
          className={cx(st.ms7, st.btnLine)}
          style={{ minWidth: U(240), height: U(56), padding: `0 ${U(22)}`, fontSize: U(17), borderWidth: U(1.5), borderRadius: U(28) }}
          onClick={() =>
            downloadIcs({
              title: d.a ? t("{name} — tug‘ilgan kun", { name: d.a }) : t("Tug‘ilgan kun"),
              startLocal: `${d.iso}T${d.time || "18:00"}`,
              location: [d.venueTitle, d.address].filter(Boolean).join(", "),
              slug: "marvarid",
            })
          }
        >
          {t("Kalendarga qo‘shish")}
        </button>
      </div>
    </Sec>
  );
}

/* ═════════════ 04 · Kecha dasturi — qatorlar chapdan siljib kiradi, ajratuvchi chiziqlar chiziladi ═════════════ */
function Program({ d, z, wide, tail }: { d: D; z: number; wide: boolean; tail: number }) {
  const t = useT();
  const items = d.program.slice(0, 8);
  if (!items.length) return null;
  return (
    <Sec
      z={z}
      bg="cream"
      colStyle={{ paddingTop: U(190), paddingBottom: U(90 + tail) }}
      outer={
        <Side wide={wide}>
          <Deco art="lola" box={rb(161.73, 416, 256.13, 302.94, 220, 275)} rot={8} unit={C} px d={0.1} />
          <Deco art="bant" box={rb(1040, 228.74, 208.52, 208.52, 180, 180)} rot={-10} unit={C} px d={0.2} />
          <Heart x={1100} y={616} fs={36} unit={C} d={0.3} />
          <Heart x={280} y={240} fs={30} unit={C} d={0.4} />
        </Side>
      }
    >
      {/* chok ustidagi marvarid shoda (03/04) */}
      <Deco art="shoda" box={[15, -70, 360, 240]} unit={U} px className={st.seam} a="hang" />
      <Title text={t("Kecha dasturi")} />
      <div className="relative mx-auto" style={{ marginTop: U(19), width: U(326) }}>
        {items.map((it, i) => (
          <div key={i} className="relative flex" style={{ padding: `${U(18)} 0 ${U(19)}`, gap: U(20) }}>
            <span data-a="line" className={st.rule} style={vars({ height: U(1), "--d": `${0.2 + i * 0.12}s` })} />
            <p data-a="left" className={cx(st.pf, st.ptime)} style={vars({ width: U(84), height: U(35), fontSize: U(26), lineHeight: `${U(35)}`, color: RED, "--d": `${0.1 + i * 0.12}s` })}>
              <Fit base={26} max={84} deps={it.time}>
                {it.time}
              </Fit>
            </p>
            <div className="min-w-0 flex-1" style={{ display: "flex", flexDirection: "column", gap: U(4) }}>
              <p data-a="left" className={cx(st.ms7, st.clamp2)} style={vars({ fontSize: U(19), lineHeight: `${U(26)}`, color: "var(--ink)", "--d": `${0.14 + i * 0.12}s` })}>
                {it.title}
              </p>
              {it.note?.trim() && (
                <p data-a="left" className={cx(st.ms, st.clamp2)} style={vars({ fontSize: U(16), lineHeight: `${U(22)}`, color: "var(--mute)", "--d": `${0.18 + i * 0.12}s` })}>
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

/* ═════════════ 05 · Manzil — surat (mijozning 2-surati; bo‘lmasa — kafe zali), joy nomi (kursiv), manzil, xarita va yo‘nalish ═════════════ */
function Venue({ d, z, wide, linkable, tail }: { d: D; z: number; wide: boolean; linkable: boolean; tail: number }) {
  const t = useT();
  if (!d.hasPlace) return null;
  return (
    <Sec
      z={z}
      bg="pink"
      colStyle={{ paddingTop: U(96), paddingBottom: U(90 + tail) }}
      outer={
        <Side wide={wide}>
          <Deco art="bant" box={rb(168.74, 330, 208.52, 208.52, 180, 180)} rot={10} unit={C} px d={0.1} />
          <Deco art="lola" box={rb(1030, 249.38, 256.13, 302.94, 220, 275)} rot={-8} unit={C} px d={0.2} />
        </Side>
      }
    >
      <Title text={t("Manzil")} />
      <div data-a="zoom" className="relative mx-auto overflow-hidden" style={vars({ marginTop: U(17), width: U(342), height: U(236), borderRadius: U(24), background: CREAM, "--d": "0.1s" })}>
        <Img src={d.hall} className={st.zoomImg} />
      </div>
      {d.venueTitle && (
        <p data-a="up" className={cx(st.pf, "mx-auto text-center")} style={vars({ marginTop: U(28), width: U(342), minHeight: U(40), fontSize: U(30), lineHeight: `${U(40)}`, color: "var(--ink)", overflowWrap: "anywhere", "--d": "0.15s" })}>
          {d.venueTitle}
        </p>
      )}
      {d.address && (
        <p data-a="up" className={cx(st.ms, "mx-auto text-center")} style={vars({ marginTop: U(10), width: U(342), minHeight: U(54), fontSize: U(18), lineHeight: `${U(27)}`, color: "var(--ink)", overflowWrap: "anywhere", textWrap: "balance", "--d": "0.22s" })}>
          {d.address}
        </p>
      )}
      <div data-a="up" className="relative mx-auto flex" style={vars({ marginTop: U(40), width: U(342), gap: U(12), "--d": "0.3s" })}>
        <a
          href={linkable ? d.mapUrl : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(st.ms7, st.btnFill)}
          style={{ flex: "1 1 0", minWidth: 0, height: U(56), padding: `0 ${U(10)}`, fontSize: U(17), borderRadius: U(28) }}
        >
          {t("Xaritada ochish")}
        </a>
        <a
          href={linkable ? d.taxi : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(st.ms7, st.btnRed)}
          style={{ flex: "1 1 0", minWidth: 0, height: U(56), padding: `0 ${U(10)}`, fontSize: U(17), borderWidth: U(1.5), borderRadius: U(28) }}
        >
          {t("Yo‘nalish")}
        </a>
      </div>
    </Sec>
  );
}

/* ═════════════ 06 · Dress-kod (ixtiyoriy — o‘chirilsa joy qolmaydi): sut rang karta, qizil hoshiya ═════════════ */
function Dress({ d, z, tail }: { d: D; z: number; tail: number }) {
  const t = useT();
  if (!d.dressNote && !d.dressCode) return null;
  return (
    <Sec z={z} bg="pink" colStyle={{ paddingTop: U(20), paddingBottom: U(113 + tail) }}>
      <div data-a="rise" className={cx(st.dressCard, "relative mx-auto flex flex-col items-center text-center")} style={{ width: U(342), padding: U(32), gap: U(10), borderRadius: U(48), borderWidth: U(1) }}>
        <p className={st.ms6} style={{ fontSize: U(15), lineHeight: `${U(20)}`, color: RED }}>
          {t("Kiyinish uslubi")}
        </p>
        {d.dressCode && (
          <p className={st.pf} style={{ height: U(43), fontSize: U(32), lineHeight: `${U(43)}`, color: "var(--ink)", whiteSpace: "nowrap" }}>
            <Fit base={32} max={276} deps={d.dressCode}>
              {d.dressCode}
            </Fit>
          </p>
        )}
        {d.dressNote && (
          <p className={st.ms} style={{ width: "100%", fontSize: U(17), lineHeight: 1.5, color: "var(--ink)", overflowWrap: "anywhere" }}>
            {d.dressNote}
          </p>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 07 · Anketa — javob («Albatta kelaman» — tugmadan kichik yurakchalar uchib chiqadi) ═════════════ */
const FLY = [
  [-34, 0, 14],
  [0, 0.08, 18],
  [30, 0.04, 12],
  [-12, 0.14, 10],
  [18, 0.18, 14],
] as const;
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
  const [fly, setFly] = useState(0);
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
  const label = (s: string, mt: number) => (
    <p className={cx(st.ms6, st.lbl)} style={{ marginTop: U(mt), height: U(20), fontSize: U(15), lineHeight: `${U(20)}` }}>
      {s}
    </p>
  );
  const sub = d.rsvpUntil ? t("Iltimos, {date} javob bering", { date: d.rsvpUntil }) : t(d.we ? "Javobingizni kutamiz" : "Javobingizni kutaman");
  const pick = (s: RsvpStatus) => {
    setStatus(s);
    if (s === "coming") setFly((n) => n + 1);
  };
  return (
    <Sec
      z={z}
      bg="cream"
      id="marvarid-javob"
      colStyle={{ paddingTop: U(96), paddingBottom: U(96) }}
      outer={
        <Side wide={wide}>
          <Deco art="bant" box={rb(177.01, 420, 220.107, 220.107, 190, 190)} rot={10} unit={C} px d={0.1} />
          <Deco art="shoda" box={[990, 560, 390, 260]} unit={C} px d={0.2} />
          <Heart x={1120} y={200} fs={36} unit={C} d={0.3} />
          <Heart x={290} y={220} fs={28} unit={C} d={0.4} />
        </Side>
      }
    >
      {/* chok ustidagi lola guldasta (06/07) */}
      <Deco art="lola" box={rb(268, -135.59, 130.39, 154.22, 112, 140)} rot={-8} unit={U} px className={st.seam} />
      <h2 data-a="up" className={cx(st.pf, "mx-auto text-center")} style={vars({ width: U(342), fontSize: U(44), lineHeight: `${U(59)}`, color: RED, overflowWrap: "anywhere", "--d": "0.05s" })}>
        {t("Kelasizmi?")}
      </h2>
      <p data-a="up" className={cx(st.ms, "mx-auto text-center")} style={vars({ marginTop: U(9), width: U(342), minHeight: U(25), fontSize: U(18), lineHeight: `${U(25)}`, color: "var(--mute)", overflowWrap: "anywhere", "--d": "0.12s" })}>
        {sub}
      </p>
      <div data-a="rise" className={cx(st.card, "relative mx-auto")} style={vars({ marginTop: U(25), width: U(342), padding: `${U(25)} ${U(23)} ${U(37)}`, borderRadius: U(28), borderWidth: U(1), "--d": "0.2s" })}>
        {sent ? (
          <div key="thanks" className={cx(st.thanks, "relative flex flex-col items-center text-center")} style={{ padding: `${U(56)} ${U(6)} ${U(30)}`, gap: U(16), minHeight: U(420) }}>
            <div aria-hidden style={{ width: U(120), height: U(120) }}>
              <Img src={`${P}/${sent === "not_coming" ? "lola" : "bant"}.webp`} className={st.float} />
            </div>
            <p className={st.pf} style={{ fontSize: U(sent === "not_coming" ? 34 : 28), lineHeight: 1.25, color: RED, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Rahmat!") : t("Rahmat! Joyingiz band qilindi")}
            </p>
            <p className={st.ms} style={{ fontSize: U(17), color: "var(--mute)", lineHeight: 1.5, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Javobingiz uchun rahmat!") : t("{name} — {count} kishi. Javobingiz yetkazildi.", { name: name.trim() || t("Javobingiz"), count })}
            </p>
            <button type="button" onClick={() => setSent(null)} className={st.ms6} style={{ fontSize: U(16), color: RED, textDecoration: "underline", textUnderlineOffset: 3 }}>
              {t("Javobni o‘zgartirish")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="relative flex flex-col items-stretch">
            {label(t("Ismingiz"), 0)}
            <label className={st.field} style={{ marginTop: U(4), height: U(54), padding: `0 ${U(17)}`, borderRadius: U(16), borderWidth: U(1) }}>
              <input
                className={cx(st.ms, st.input)}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder={t("Ism va familiya")}
                aria-label={t("Ismingiz")}
                style={{ fontSize: U(17) }}
              />
            </label>
            {label(t("Kelasizmi?"), 22)}
            <div className="flex w-full" role="radiogroup" aria-label={t("Kelasizmi?")} style={{ marginTop: U(4), gap: U(8) }}>
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
                  onClick={() => pick(s)}
                  className={cx(st.ms7, st.choice)}
                  style={{ flex: s === "coming" ? "145 1 0" : "141 1 0", padding: `${U(4)} ${U(4)}`, minHeight: U(54), fontSize: U(17), borderWidth: U(1.5), borderRadius: U(27) }}
                >
                  <span style={{ overflowWrap: "anywhere" }}>{t(l)}</span>
                  {s === "coming" &&
                    fly > 0 &&
                    FLY.map(([dx, dl, sz], k) => (
                      <span key={`${fly}-${k}`} aria-hidden className={st.fly} style={vars({ width: U(sz * 0.63), height: U(sz * 0.7), marginLeft: U(dx - sz * 0.32), "--fl": `${dl}s` })}>
                        <svg viewBox="0 0 100 111" className={st.svg}>
                          <path d={HEART} fill={k % 2 ? CREAM : RED} stroke={RED} strokeWidth={7.5} strokeLinejoin="round" />
                        </svg>
                      </span>
                    ))}
                </button>
              ))}
            </div>
            {status === "coming" && (
              <>
                {label(t("Necha kishi bo‘lasiz?"), 22)}
                <div className={cx(st.field, "justify-between")} style={{ marginTop: U(4), height: U(54), padding: `0 ${U(6)}`, borderRadius: U(16), borderWidth: U(1) }}>
                  <button type="button" className={cx(st.ms7, st.step)} disabled={count <= 1} onClick={() => setCount((n) => Math.max(1, n - 1))} aria-label={t("Kamaytirish")} style={{ width: U(40), height: U(40), fontSize: U(20), borderWidth: U(1) }}>
                    −
                  </button>
                  <span className={st.pf} style={{ fontSize: U(26), lineHeight: 1.3, color: "var(--ink)" }} aria-live="polite">
                    {count}
                  </span>
                  <button type="button" className={cx(st.ms7, st.step)} disabled={count >= 20} onClick={() => setCount((n) => Math.min(20, n + 1))} aria-label={t("Ko‘paytirish")} style={{ width: U(40), height: U(40), fontSize: U(20), borderWidth: U(1) }}>
                    +
                  </button>
                </div>
              </>
            )}
            {label(d.wishLabel, 26)}
            <label className={st.field} style={{ marginTop: U(4), height: U(130), padding: `${U(15)} ${U(17)}`, borderRadius: U(16), borderWidth: U(1), alignItems: "flex-start" }}>
              <textarea
                rows={4}
                className={cx(st.ms, st.input)}
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                maxLength={500}
                placeholder={t("Tilagingizni yozing…")}
                aria-label={d.wishLabel}
                style={{ fontSize: U(17), height: "100%" }}
              />
            </label>
            {err && (
              <p className={st.ms} style={{ marginTop: U(12), color: "#c2410c", fontSize: U(15) }}>
                {err}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className={cx(st.ms7, st.submit)}
              style={{ marginTop: U(32), minHeight: U(56), padding: `${U(10)} ${U(12)}`, fontSize: U(17), borderRadius: U(28), opacity: busy ? 0.7 : 1 }}
            >
              {busy ? t("Yuborilmoqda…") : t("Javobni yuborish")}
            </button>
          </form>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 08 · Final — tortdagi sham yonadi (olov tebranadi), pastdan marvarid shoda ko‘tariladi, bantchalar va yurakchalar mayin
 * yog‘iladi (scroll bilan: --fc 0 … 1 = Figma kadri; sahifa oxirigacha albatta tugaydi) ═════════════ */
/** Yog‘iladigan bezaklar: [x, kechikish (fc), o‘lcham, tur 0 — yurakcha, 1 — bantcha] — fc = 1 da hammasi ekrandan chiqib bo‘lgan */
const FALL = [
  [40, 0.0, 22, 1],
  [300, 0.06, 18, 0],
  [150, 0.12, 14, 0],
  [340, 0.16, 26, 1],
  [90, 0.22, 16, 0],
  [250, 0.26, 20, 1],
  [20, 0.32, 14, 0],
  [200, 0.36, 12, 0],
] as const;
function Final({ d, z, wide, still, onSeen }: { d: D; z: number; wide: boolean; still: boolean; onSeen: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const sec = useRef<HTMLElement>(null);
  const onP = useCallback(
    (_p: number, r: DOMRect) => {
      const el = ref.current;
      if (!el) return;
      const vh = window.innerHeight || 800;
      // bo‘lim pasti ekran pastiga yetganda (yoki sahifa oxirida) tugaydi, 0.75 ekran oldin boshlanadi — marvarid shoda ko‘z oldida ko‘tariladi
      const y = window.scrollY;
      const top = r.top + y;
      const max = document.documentElement.scrollHeight - vh;
      const s1 = Math.max(1, Math.min(top + r.height - vh, max));
      const s0 = s1 - vh * 0.75;
      const f = seg(y, s0, s1);
      el.style.setProperty("--fc", f.toFixed(4));
      if (f > 0.5) onSeen();
    },
    [onSeen],
  );
  useScrollProgress(sec, onP, !still);
  const title = t(d.we ? "Sizni kutamiz!" : "Sizni kutaman!");
  // tort 280×280 (55, 130); sham piligi rasmda (509, 158) / 1024
  const fx = 55 + 280 * (509 / 1024);
  const fy = 130 + 280 * (160 / 1024);
  return (
    <section ref={sec} className={cx(st.sec, st.pink, st.fin)} style={{ zIndex: z }}>
      <Side wide={wide}>
        <Deco art="lola" box={rb(115.82, 280, 300.38, 350.67, 249.6, 312)} rot={10} unit={C} px d={0.1} />
        <Deco art="lola" box={rb(1020, 276.59, 300.38, 350.67, 249.6, 312)} rot={-10} unit={C} px d={0.2} />
      </Side>
      <div ref={ref} className={cx(st.col, st.finalWrap)} style={vars({ width: U(390), height: U(844), ...(still ? { "--fc": 1 } : {}) })}>
        {/* chok ustidagi bant (07/08) */}
        <Deco art="bant" box={rb(-0.57, -70, 150.6, 150.6, 130, 130)} rot={10} unit={U} px className={st.seam} />
        {/* yog‘iladigan yurakchalar va bantchalar (Figma kadrida yo‘q — fc = 1 da ekrandan chiqqan) */}
        {FALL.map(([x, s0, sz, kind], i) => (
          <span key={i} aria-hidden className={st.fall} style={vars({ left: U(x), top: U(-40), width: U(sz), height: U(sz), "--s0": s0, "--fr": `${i % 2 ? -1 : 1}` })}>
            {kind ? (
              <Img src={`${P}/bant.webp`} />
            ) : (
              <svg viewBox="0 0 100 111" className={st.svg}>
                <path d={HEART} fill="none" stroke={RED} strokeWidth={8} strokeLinejoin="round" />
              </svg>
            )}
          </span>
        ))}
        <Deco art="tort" box={[55, 130, 280, 280]} unit={U} d={0.1} />
        {/* sham olovi — scroll bilan yonadi va tebranadi */}
        <span aria-hidden className={st.fFlame} style={{ left: U(fx - 5), top: U(fy - 13.5), width: U(10), height: U(14) }}>
          <span className={st.fGlow} />
          <span className={st.flameIn} />
        </span>
        <div className="absolute inset-x-0 flex flex-col items-center justify-end" style={{ top: U(380), height: U(174) }}>
          <h2 data-a="up" className={cx(st.pf, "mx-auto text-center")} style={vars({ width: U(342), fontSize: U(54), lineHeight: 1.05, color: RED, overflowWrap: "anywhere", "--d": "0.1s" })}>
            {title}
          </h2>
        </div>
        {d.finalSub && (
          <p data-a="up" className={cx(st.ms6, st.clamp2, "absolute inset-x-0 mx-auto text-center")} style={vars({ top: U(580), width: U(342), fontSize: U(22), lineHeight: `${U(30)}`, color: "var(--ink)", "--d": "0.22s" })}>
            {d.finalSub}
          </p>
        )}
        {/* marvarid shoda — pastdan ko‘tariladi */}
        <div aria-hidden className={cx(st.art, st.fPearl)} style={{ left: U(15), top: U(640), width: U(360), height: U(200) }}>
          <Img src={`${P}/shoda.webp`} />
          <span className={st.shine} />
        </div>
      </div>
    </section>
  );
}

/* ═════════════ Musiqa tugmasi — Figma «Marvarid / Musiqa tugmasi»: qizil doira, 4 ta sut rang chiziq ritmda;
 * o‘chirilgan — chiziqlar past (4px) ═════════════ */
const BARS = [10, 18, 13, 20];
function MarvaridMusic({ m, wide, embedded }: { m: ReturnType<typeof useMusic>; wide: boolean; embedded: boolean }) {
  const t = useT();
  if (!m.available) return null;
  const btn = (
    <button
      type="button"
      onClick={m.toggle}
      aria-label={m.playing ? t("Musiqani o‘chirish") : t("Musiqani yoqish")}
      aria-pressed={m.playing}
      className={cx(st.music, embedded && st.musicEmbedded, m.playing && st.playing)}
      style={{ right: wide ? 24 : 16, top: wide ? 28 : 24 }}
    >
      {BARS.map((h, i) => (
        <span key={i} className={st.bar} style={vars({ "--h": `${h}px`, "--i": i })} />
      ))}
    </button>
  );
  return embedded ? <div style={{ position: "sticky", top: 0, height: 0, zIndex: 70 }}>{btn}</div> : btn;
}

/* ═════════════ Sahifa ═════════════ */
type Key = "hero" | "taklif" | "sana" | "program" | "venue" | "dress" | "rsvp" | "final";
/**
 * Chok ustidagi bezaklar oldingi bo‘lim pastiga kirib turadi (OVER, birlik: mobil 390). Oldingi bo‘limning pastki bo‘sh joyi (ROOM —
 * oxirgi matn/tugmagacha) yetmasa — unga qo‘shimcha pastki joy (tail): ixtiyoriy bo‘lim o‘chirilganda bezak matn ustiga tushmaydi.
 * Dastur shodasi sana tugmasi yonidan o‘tadi (Figma 03/04 — shodaning faqat uchlari tugma chetidan tashqarida) — bu juftlik istisno.
 */
const OVER: Partial<Record<Key, number>> = { taklif: 150, sana: 80, program: 70, rsvp: 140, final: 74 };
const ROOM: Record<Exclude<Key, "final">, number> = { hero: 168, taklif: 180, sana: 54, program: 90, venue: 90, dress: 145, rsvp: 96 };

export function MarvaridSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const loaded = usePreload(
    [`${P}/shoda.webp`, `${P}/bant.webp`, d.portrait].filter(Boolean) as string[],
    [`${P}/lola.webp`, `${P}/tort.webp`, d.hall].filter(Boolean) as string[],
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

  const shown: Key[] = (["hero", "taklif", "sana", "program", "venue", "dress", "rsvp", "final"] as Key[]).filter((k) =>
    k === "sana" ? d.hasDate : k === "program" ? d.program.length > 0 : k === "venue" ? d.hasPlace : k === "dress" ? !!(d.dressNote || d.dressCode) : k === "rsvp" ? data.rsvpEnabled : true,
  );
  const z = (k: Key) => 6 + shown.indexOf(k);
  const tail = (k: Exclude<Key, "final">) => {
    const next = shown[shown.indexOf(k) + 1];
    if (!next || (k === "sana" && next === "program")) return 0;
    return Math.max(0, (OVER[next] ?? 0) - ROOM[k]);
  };
  const linkable = mode !== "preview";
  const colU = wide ? COL_L : COL_M;

  return (
    <div ref={root} className={st.root}>
      <div className={st.page} style={vars({ "--u": colU })}>
        <MarvaridMusic m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/muhr.webp`} />}
        <div className={st.flow}>
          {withGate && (loaded ? <Gate d={d} wide={wide} onStart={() => music.play(true)} /> : <div className={st.gateHold} />)}
          {embedded && <Gate d={d} wide={wide} still onStart={() => {}} />}
          <Hero d={d} z={z("hero")} wide={wide} />
          <Taklif d={d} z={z("taklif")} wide={wide} tail={tail("taklif")} />
          <Sana d={d} z={z("sana")} wide={wide} tail={tail("sana")} />
          <Program d={d} z={z("program")} wide={wide} tail={tail("program")} />
          <Venue d={d} z={z("venue")} wide={wide} linkable={linkable} tail={tail("venue")} />
          <Dress d={d} z={z("dress")} tail={tail("dress")} />
          {data.rsvpEnabled && <Rsvp d={d} slug={data.slug} mode={mode} z={z("rsvp")} wide={wide} />}
          <Final d={d} z={z("final")} wide={wide} still={embedded} onSeen={onFinal} />
        </div>
        <footer className={cx(st.footer, "flex items-start justify-center")} style={{ height: U(120), paddingTop: U(50) }}>
          <p className={cx(st.ms5, "text-center")} style={{ fontSize: U(14), lineHeight: `${U(19)}`, color: "rgba(255,248,243,.75)" }}>
            <a href="https://shohnoma.uz">{t("shohnoma.uz orqali yaratilgan")}</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
