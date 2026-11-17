"use client";

import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource/cormorant-garamond/500.css";
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
import { DRESS_TEXT, MSG, MSG_AGE, MSG_HOST, MSG_HOST_AGE, P, SOVGA_DEMO, SOVGA_DEMO_EN, SOVGA_DEMO_RU } from "./data";
import st from "./sovga.module.css";

/* ── Birliklar ──
 * U — joriy `--u`: bo‘limlarda kontent ustuni (Figma mobil 390 koordinatalari; laptopda ustun = mobil × 1.45, ya’ni 565.5px / 1440).
 * C — laptop kanvasi (1440) birligi: yon bezaklar (bantlar, uchqunlar, sharlar, lentalar) va chok ustidagi lenta.
 * Ochilish (sovg‘a qutisi), hero va final — o‘z kanvasi (mobil 390×844, laptop 1440×900); ochilish va hero sahnasi bir ekranga sig‘adi
 * va pastki chetga bog‘lanadi. Hero sahnasi laptopda — mobil × 1.0664 (Figma «Sahna (mobil ×1.07)», chapdan 512.06). */
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

/* ═════════════ Yosh: shar raqamlar va so‘z bilan ═════════════ */
/** «18» → 18 (1…120); bo‘lmasa 0 */
function parseAge(raw: string) {
  const n = Math.round(Number(String(raw).replace(/[^\d.]/g, "")));
  return raw.trim() && Number.isFinite(n) && n >= 1 && n <= 120 ? n : 0;
}
const UZ1 = ["", "bir", "ikki", "uch", "to‘rt", "besh", "olti", "yetti", "sakkiz", "to‘qqiz"];
const UZ10 = ["", "o‘n", "yigirma", "o‘ttiz", "qirq", "ellik", "oltmish", "yetmish", "sakson", "to‘qson"];
const RU1 = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять", "десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать"];
const RU10 = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
const EN1 = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const EN10 = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
/** 18 → «O‘n sakkiz» / «Восемнадцать» / «Eighteen» (1…120) */
function ageWords(lang: Locale, n: number) {
  const below100 = (x: number) => {
    if (lang === "uz") return [UZ10[Math.floor(x / 10)], UZ1[x % 10]].filter(Boolean).join(" ");
    if (x < 20) return lang === "ru" ? RU1[x] : EN1[x];
    const tens = lang === "ru" ? RU10[Math.floor(x / 10)] : EN10[Math.floor(x / 10)];
    const one = lang === "ru" ? RU1[x % 10] : EN1[x % 10];
    return one ? (lang === "ru" ? `${tens} ${one}` : `${tens}-${one}`) : tens;
  };
  const hundred = lang === "uz" ? "yuz" : lang === "ru" ? "сто" : "one hundred";
  const s = n >= 100 ? [hundred, n % 100 ? below100(n % 100) : ""].filter(Boolean).join(lang === "en" ? " and " : " ") : below100(n);
  return s.charAt(0).toLocaleUpperCase(lang) + s.slice(1);
}
/** Ism + jo‘nalish qo‘shimchasi: «Sofiyaga», «Malikka», «Tolibqa» */
const dative = (name: string) => {
  const last = name.slice(-1).toLowerCase();
  return name + (last === "k" ? "ka" : last === "q" ? "qa" : "ga");
};

/** Server yaratadigan standart taklif matni (php/api/lib/orders.php DEFAULT_MESSAGE) — har qaysi tilda */
const SERVER_DEFAULT = "Aziz mehmonlar! Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.";
const isServerDefault = (m: string) => (["uz", "ru", "en"] as Locale[]).some((l) => tr(l, SERVER_DEFAULT).trim() === m.trim());

function useData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO = lang === "ru" ? SOVGA_DEMO_RU : lang === "en" ? SOVGA_DEMO_EN : SOVGA_DEMO;
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
    // taklif qiluvchi (ixtiyoriy, masalan, ota-ona): bo‘lsa — matnlar «biz» nomidan, imzo — shu
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
        ? raw.replace(/^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Muhtaram mehmonlar!|Aziz do‘stlarim!|Дорогие гости!|Dear guests!)\s*/, "").trim()
        : "";
    const message = custom || (we ? (a ? t(age ? MSG_HOST_AGE : MSG_HOST, { name: a, age }) : "") : t(age ? MSG_AGE : MSG, { age }));
    const venueTitle = ((demo ? t(data.venueName) : data.venueName) || "").trim();
    const address = ((demo ? DEMO.address : data.address) || "").trim();
    const m = date ? date.getUTCMonth() : 0;
    const year = date ? date.getUTCFullYear() : 0;
    const day = date ? date.getUTCDate() : 0;
    // namunada javob muddati — Figma’dagidek sanadan 9 kun oldin («10-iyungacha»)
    const deadline = demo && sd ? new Date(Date.UTC(year, m, day - 9)).toISOString().slice(0, 10) : data.rsvpDeadline;
    const wd = date ? cw.weekday[date.getUTCDay()] : "";
    // Figma: hero — portret, «Yangi bob» — tort bilan surat, manzil — restoran (mijozda: 1–3-suratlar; hero surati bo‘lmasa —
    // ravoq ichida sovg‘a qutisi, «Yangi bob» surati bo‘lmasa — bo‘lim chiqmaydi, manzil surati bo‘lmasa — restoran)
    const portrait = demo ? `${P}/portret.webp` : photos[0] || "";
    const chapter = demo ? `${P}/tort.webp` : photos[1] || "";
    const hall = demo ? `${P}/restoran.webp` : photos[2] || `${P}/restoran.webp`;
    return {
      a,
      we,
      /** imzo: taklif qiluvchi yoki yubilyarning o‘zi */
      signer: host || a,
      age,
      digits: age ? String(age).split("") : [],
      /** «Sofiyaning» (ru — «София», en — «Sofiya’s») */
      whose: a ? t("{name}ning", { name: a }) : "",
      /** «18 yoshga to‘ladi» / «отмечает 18-летие» / «turns 18»; yosh bo‘lmasa — «tug‘ilgan kuni» */
      heroSub: age ? t("{n} yoshga to‘ladi", { n: age }) : t("tug‘ilgan kuni"),
      /** «O‘n sakkiz — yangi bob boshlanishi.» */
      chapterLine: age ? t("{words} — yangi bob boshlanishi.", { words: ageWords(lang, age) }) : t("Har bir yil — yangi bob boshlanishi."),
      chapterText: t(we ? "Shu sahifani siz bilan birga ochmoqchimiz." : "Shu sahifani siz bilan birga ochmoqchiman."),
      /** «19 · 06 · 2027» */
      dots: sd?.dots ?? "",
      /** «19 · 06 · 2027 · 19:00» */
      dotsTime: [sd?.dots, time].filter(Boolean).join(" · "),
      day: date ? String(day) : "",
      /** «iyun · shanba» / «июня · суббота» / «June · Saturday» */
      monthDay: date ? `${cw.monthsAfterDay[m]} · ${lang === "en" ? wd : wd.toLocaleLowerCase(lang)}` : "",
      start: time ? t("Soat {time}", { time }) : "",
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
      chapter,
      hall,
      rsvpUntil: untilPhrase(deadline, lang),
      wishPh: a ? (lang === "uz" ? `${dative(a)} tilak…` : t("{name}ga tilak…", { name: a })) : t("Tilagingiz…"),
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
 * har qator `two` o‘lchamida. `letters` — hero: har harf --o bilan navbatma-navbat, markazdan kengayib chiqadi ([boshlanish, tugash]).
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
      {rows.map((r, i) => {
        const chars = Array.from(r);
        const mid = (chars.length - 1) / 2;
        return (
          <span key={i} className="block" style={{ height: unit(h), lineHeight: `${unit(h)}`, fontSize: unit(fs), whiteSpace: "nowrap" }}>
            <Fit base={fs} max={max} unit={unit} deps={`${r}|${fs}`}>
              {letters
                ? chars.map((ch, k) =>
                    /\s/.test(ch) ? (
                      <span key={k}>{" "}</span>
                    ) : (
                      <span key={k} className={st.letter} style={vars({ "--li": +(letters[0] + ((letters[1] - letters[0]) * idx++) / total).toFixed(4), "--lx": +(k - mid).toFixed(2) })}>
                        {ch}
                      </span>
                    ),
                  )
                : r}
            </Fit>
          </span>
        );
      })}
    </div>
  );
}

/* ═════════════ Bezaklar ═════════════ */
/** Uchqun (Figma «Sovg‘a / Uchqun · kumush / pushti»): to‘rt nurli yulduzcha; kumush — oqdan #AEB3BC ga gradient, pushti — #D99AA3 */
function Spark({ silver, className, style, a, d = 0 }: { silver?: boolean; className?: string; style?: CSSProperties; a?: string | null; d?: number }) {
  const id = silver ? "sovga-silver" : undefined;
  return (
    <div aria-hidden data-a={a ?? undefined} className={cx(st.art, className)} style={vars({ "--d": `${d}s`, ...(style as Record<string, string>) })}>
      <svg viewBox="0 0 20 20" preserveAspectRatio="none" className={st.svg}>
        {silver && (
          <defs>
            <linearGradient id={id} x1="0" y1="10" x2="20" y2="10" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fff" />
              <stop offset="1" stopColor="#AEB3BC" />
            </linearGradient>
          </defs>
        )}
        <path d="M10 0C10.75 6.5 13.5 9.25 20 10C13.5 10.75 10.75 13.5 10 20C9.25 13.5 6.5 10.75 0 10C6.5 9.25 9.25 6.5 10 0Z" fill={silver ? `url(#${id})` : "#D99AA3"} />
      </svg>
    </div>
  );
}

/** Shar raqam (Figma «Sovg‘a / Shar raqam (0–9)», 2:3) — markazi (cx, cy), eni w, burilishi rot */
type Bal = { d: string; cx: number; cy: number; w: number; rot: number };
const balBox = (b: Bal, X: (n: number) => string, Y: (n: number) => string, S: (n: number) => string): CSSProperties => ({
  left: X(b.cx - b.w / 2),
  top: Y(b.cy - b.w * 0.75),
  width: S(b.w),
  height: S(b.w * 1.5),
});
const sharSrc = (d: string) => `${P}/shar-${d}.webp`;

/** Hero sharlari (mobil 390×844 koordinatalari): 2 xona — Figma; 1 va 3 xona — shu uslubda markazda */
function heroBalloons(digits: string[]): Bal[] {
  if (digits.length === 2)
    return [
      { d: digits[0], cx: 116.35, cy: 151.55, w: 150, rot: -6 },
      { d: digits[1], cx: 270.57, cy: 186.92, w: 170, rot: 5 },
    ];
  if (digits.length === 1) return [{ d: digits[0], cx: 195, cy: 160, w: 170, rot: 3 }];
  if (digits.length === 3)
    return [
      { d: digits[0], cx: 82, cy: 160, w: 120, rot: -6 },
      { d: digits[1], cx: 195, cy: 148, w: 124, rot: 2 },
      { d: digits[2], cx: 308, cy: 170, w: 120, rot: 6 },
    ];
  return [];
}
/** Final sharlari (mobil): 2 xona — Figma (o‘ngdagisi ekran chetidan chiqib turadi); 1 va 3 xona — tepada markazda */
function finalBalloons(digits: string[]): Bal[] {
  if (digits.length === 2)
    return [
      { d: digits[0], cx: 81.94, cy: 160.77, w: 120, rot: -8 },
      { d: digits[1], cx: 307.45, cy: 177.3, w: 132, rot: 7 },
    ];
  if (digits.length === 1) return [{ d: digits[0], cx: 195, cy: 160, w: 116, rot: -4 }];
  if (digits.length === 3)
    return [
      { d: digits[0], cx: 74, cy: 165, w: 104, rot: -8 },
      { d: digits[1], cx: 195, cy: 150, w: 108, rot: 2 },
      { d: digits[2], cx: 316, cy: 172, w: 104, rot: 7 },
    ];
  return [];
}
type Slot = { cx: number; cy: number; w: number; rot: number };
/**
 * Laptop yon sharlari (1440 kanvas): chap va o‘ng o‘rin (Figma «Shar 1» / «Shar 8»). 2 xona — har tomonda bittadan;
 * 1 xona — ikki tomonda bir xil raqam; 3 xona — chapda ikkitasi (kichikroq), o‘ngda bittasi (chapdan o‘ngga o‘qiladi).
 */
function sideBalloons(digits: string[], L: Slot, R: Slot): Bal[] {
  if (digits.length === 2) return [{ d: digits[0], ...L }, { d: digits[1], ...R }];
  if (digits.length === 1) return [{ d: digits[0], ...L }, { d: digits[0], ...R }];
  if (digits.length === 3) {
    const w = L.w * 0.74;
    return [
      { d: digits[0], cx: L.cx - w * 0.42, cy: L.cy + 6, w, rot: L.rot - 2 },
      { d: digits[1], cx: L.cx + w * 0.42, cy: L.cy - 10, w, rot: L.rot + 10 },
      { d: digits[2], ...R },
    ];
  }
  return [];
}
const SIDE = {
  gate: { L: { cx: 268.9, cy: 415.4, w: 190, rot: -8 }, R: { cx: 1170.02, cy: 441.62, w: 210, rot: 7 } },
  sana: { L: { cx: 249.9, cy: 450.9, w: 170, rot: -8 }, R: { cx: 1189.4, cy: 474.24, w: 185, rot: 7 } },
  final: { L: { cx: 321.89, cy: 313.08, w: 220, rot: -8 }, R: { cx: 1117.17, cy: 343.28, w: 240, rot: 7 } },
} as const;

/* ═════════════ Sovg‘a qutisi (Figma «Sovg‘a / Qatlam · Sovg‘a qutisi», 1024² rasm ulushida) ═════════════
 * Qopqoq va tana bitta rasmdan clip-path bilan ajratiladi (qopqoqning pastki cheti: chap 104,432 · old burchak 535,590 · o‘ng 917,400).
 * Ochilganda ko‘rinadigan ichki tomon — tana yuqori cheti bo‘yicha to‘rtburchak (chap 116,438 · old 535,590 · o‘ng 907,405 · orqa 488,253). */
const RIM = { l: [116, 438], f: [535, 590], r: [907, 405], b: [488, 253] } as const;
type Box = { x: number; y: number; s: number };
/** Quti og‘zining chiziqlari (sahna koordinatalarida) — shu chiziqdan pastdagi shar qismlari ko‘rinmaydi (quti ichida) */
const rimPt = (b: Box, k: keyof typeof RIM) => [b.x + (b.s * RIM[k][0]) / 1024, b.y + (b.s * RIM[k][1]) / 1024] as const;

/* ═════════════ 00 · Ochilish — pudra fonda sovg‘a qutisi (faqat scroll bilan, --o: 0…1) ═════════════
 * Vaqt chizig‘i (sovga.module.css da): yozuvlar so‘nadi (0…0.1); atlas bant yechilib yuqoriga uchadi (0.02…0.16); qopqoq ko‘tarilib
 * chetga uchadi (0.08…0.3); quti ichidan yorug‘lik (0.12…0.34); kumush uchqunlar chaqnaydi (0.1…0.34); shar raqamlar qutidan suzib
 * chiqib hero joyiga ko‘tariladi (0.15…0.47; laptopda 2 xonali yosh — yon sharlar markazga uchadi); quti pastga tushib ketadi
 * (0.3…0.48); hero foni (0.38…0.52), sharlar hero sharlariga almashadi (0.47 — joyi aynan bir xil). */
const GATE = {
  m: {
    W: 390,
    H: 844,
    whose: [120, 39, 32, 366] as const,
    big: [160, 47, 40, 366] as const,
    box: { x: 45, y: 330, s: 300 } as Box,
    bow: { x: 100, y: 363, s: 190 } as Box,
    sparks: [
      [49, 289, 22],
      [317, 265, 30],
      [291, 601, 18],
      [67, 607, 26],
      [343, 413, 14],
      [36, 442, 16],
    ] as [number, number, number][],
    date: [700, 20, 15, 5] as const,
  },
  l: {
    W: 1440,
    H: 900,
    whose: [96, 48, 40, 1100] as const,
    big: [146, 66, 56, 1100] as const,
    box: { x: 520, y: 320, s: 400 } as Box,
    bow: { x: 602.3, y: 375, s: 250 } as Box,
    sparks: [
      [467, 317, 26],
      [943, 283, 34],
      [510, 690, 20],
      [907, 677, 26],
      [392, 492, 16],
      [1031, 511, 18],
    ] as [number, number, number][],
    date: [780, 23, 17, 6] as const,
  },
} as const;
/** Hero (Figma mobil 01 koordinatalari; laptopda × k, chapdan ox) */
const SAHNA = { m: { ox: 0, k: 1 }, l: { ox: 512.0616, k: 415.877 / 390 } } as const;
const HERO = {
  name: [668, 66, 56] as const,
  sub: [742, 29, 24] as const,
  date: [786, 18, 13, 4] as const,
  photo: [55, 270, 280, 380] as const,
  /** yosh kiritilmagan bo‘lsa — sharlar o‘rnida atlas bant (ochilishdagi bant shu yerga uchib keladi) */
  bow: { x: 115, y: 92, s: 160 } as Box,
  sparks: [
    [29, 309, 22],
    [337, 347, 26],
    [22, 592, 16],
    [347, 601, 18],
  ] as [number, number, number][],
};
const stageOf = (wide: boolean) => (wide ? SAHNA.l : SAHNA.m);
const heroBal = (digits: string[], wide: boolean): Bal[] => {
  const { ox, k } = stageOf(wide);
  return heroBalloons(digits).map((b) => ({ ...b, cx: ox + b.cx * k, cy: b.cy * k, w: b.w * k }));
};
const heroBow = (wide: boolean): Box => {
  const { ox, k } = stageOf(wide);
  return { x: ox + HERO.bow.x * k, y: HERO.bow.y * k, s: HERO.bow.s * k };
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
  const big = t("tug‘ilgan kuni");
  const box = G.box;
  // laptop, 2 xonali yosh — Figma’dagi yon sharlar hero joyiga uchadi; qolgan hollarda sharlar quti ichidan chiqadi
  const fromSides = wide && d.digits.length === 2;
  const ends = heroBal(d.digits, wide);
  const starts: Bal[] = fromSides
    ? sideBalloons(d.digits, SIDE.gate.L, SIDE.gate.R)
    : ends.map((b, i) => {
        // quti og‘zi ostida, kichraygan holda (og‘iz chizig‘idan pastda — ko‘rinmaydi)
        const s0 = 0.42;
        const spread = (i - (ends.length - 1) / 2) * box.s * 0.2;
        const front = rimPt(box, "f")[1];
        return { ...b, cx: box.x + box.s / 2 + spread, cy: front + 8 + (b.w * 1.5 * s0) / 2, w: b.w * s0, rot: 0 };
      });
  const [lx, ly] = rimPt(box, "l");
  const [fx, fy] = rimPt(box, "f");
  const [rx, ry] = rimPt(box, "r");
  const rel = (p: number, q: number) => `${+(((p - q) / box.s) * 100).toFixed(3)}%`;
  const bowEnd = heroBow(wide);
  const noAge = !d.digits.length;
  const balloons = ends.map((e, i) => {
    const s = starts[i];
    return (
      <div
        key={i}
        aria-hidden
        className={st.gBal}
        style={vars({
          ...(balBox(e, X, Y, U) as Record<string, string>),
          "--dx": +(s.cx - e.cx).toFixed(2),
          "--dy": +(s.cy - e.cy).toFixed(2),
          "--s0": +(s.w / e.w).toFixed(4),
          "--r0": s.rot,
          "--r1": e.rot,
          "--b0": fromSides ? 0.1 + i * 0.03 : 0.15 + i * 0.03,
          "--bd": fromSides ? 0.32 : 0.29,
        })}
      >
        <Img src={sharSrc(e.d)} eager />
      </div>
    );
  });
  // laptop, 1 yoki 3 xonali yosh: yon o‘rinlarda ham shar raqamlar (Figma 00 kabi) — ochilganda yuqoriga uchib ketadi
  const drift = wide && !fromSides && d.digits.length ? sideBalloons(d.digits, SIDE.gate.L, SIDE.gate.R) : [];
  return (
    <div
      ref={wrap}
      className={cx(st.gateWrap, still && st.still)}
      style={vars(still ? { "--u": pageU, "--o": 0, height: U(H), marginBottom: 0 } : { "--u": `min(${pageU}, calc(100svh / ${H}))` })}
    >
      <div className={st.gate} aria-label={t("Taklifnoma")} style={still ? { position: "relative", height: "100%" } : undefined}>
        <div aria-hidden className={st.gBg} />
        <div className={st.gText}>
          {d.whose && (
            <div className={cx(st.cgI, st.gIn, "absolute inset-x-0 text-center")} style={vars({ bottom: U(H - wT - wH), color: "var(--berry)", "--gd": "0.4s" })}>
              <NameLines text={d.whose} base={wF} max={wMax} lh={wH} two={wF * 0.85} twoLh={wH * 0.85} />
            </div>
          )}
          <h1 className={cx(st.tn, st.gIn, "absolute inset-x-0 text-center")} style={vars({ top: Y(bT), height: U(bH), fontSize: U(bF), lineHeight: `${U(bH)}`, color: "var(--ink)", "--gd": "0.5s" })}>
            <Fit base={bF} max={bMax} deps={big}>
              {big}
            </Fit>
          </h1>
          {d.dots && (
            <p className={cx(st.msM, st.gIn, "absolute inset-x-0 text-center")} style={vars({ top: Y(dT), height: U(dH), fontSize: U(dF), lineHeight: `${U(dH)}`, color: "var(--berry)", whiteSpace: "nowrap", "--gd": "0.8s" })}>
              <span style={{ letterSpacing: U(dLs), paddingLeft: U(dLs) }}>{d.dots}</span>
            </p>
          )}
        </div>
        {G.sparks.map(([x, y, s], i) => (
          <div key={i} className={cx(st.gIn, st.gPop)} style={vars({ position: "absolute", left: X(x), top: Y(y), width: U(s), height: U(s), "--gd": `${0.6 + i * 0.08}s` })}>
            <Spark silver className={st.gSpark} style={vars({ inset: 0, "--sd": +(i * 0.025).toFixed(3) })} />
          </div>
        ))}
        {drift.map((b, i) => (
          <div key={i} aria-hidden className={st.gIn} style={vars({ position: "absolute", inset: 0, "--gd": "0.35s" })}>
            <div className={st.gDrift} style={vars({ ...(balBox(b, X, Y, U) as Record<string, string>), rotate: `${b.rot}deg`, "--dd": +(i * 0.03).toFixed(2), "--dside": b.cx < W / 2 ? -1 : 1 })}>
              <Img src={sharSrc(b.d)} eager />
            </div>
          </div>
        ))}
        <div className={st.gIn} style={vars({ position: "absolute", inset: 0, "--gd": "0.35s" })}>
          {/* quti orqasi: ichki tomon va undan taraladigan yorug‘lik (quti bilan birga pastga tushadi) */}
          <div aria-hidden className={st.gBoxMove} style={place(box)}>
            <svg viewBox="0 0 1024 1024" className={st.gInside} aria-hidden>
              <defs>
                <linearGradient id="sovga-inside" x1="488" y1="253" x2="535" y2="590" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#9c6b70" />
                  <stop offset="1" stopColor="#d9aeb0" />
                </linearGradient>
              </defs>
              <path d={`M${RIM.l.join(" ")}L${RIM.b.join(" ")}L${RIM.r.join(" ")}L${RIM.f.join(" ")}Z`} fill="url(#sovga-inside)" />
            </svg>
            <span className={st.gLight} style={{ left: rel(box.x + (box.s * 512) / 1024, box.x), top: rel(box.y + (box.s * 420) / 1024, box.y) }} />
          </div>
          {/* shar raqamlar: quti og‘zi chizig‘idan pastda ko‘rinmaydi (laptopdagi yon sharlar — kesilmaydi) */}
          {fromSides ? (
            balloons
          ) : (
            <div
              aria-hidden
              className={st.gClip}
              style={{
                clipPath: `polygon(-50% -200%, 150% -200%, 150% ${Y(ry)}, ${X(rx)} ${Y(ry)}, ${X(fx)} ${Y(fy)}, ${X(lx)} ${Y(ly)}, -50% ${Y(ly)})`,
              }}
            >
              {balloons}
            </div>
          )}
          {/* quti tanasi va qopqog‘i */}
          <div aria-hidden className={st.gBoxMove} style={place(box)}>
            <Img src={`${P}/quti.webp`} eager className={st.qBody} />
            <Img src={`${P}/quti.webp`} eager className={st.qLid} />
          </div>
          {/* atlas bant: yechilib yuqoriga uchadi (yosh bo‘lmasa — hero’dagi joyiga qo‘nadi) */}
          <div
            aria-hidden
            className={cx(st.gBow, noAge && st.gBowLand)}
            style={vars({
              ...(place(noAge ? bowEnd : G.bow) as Record<string, string>),
              "--dx": +(G.bow.x + G.bow.s / 2 - (bowEnd.x + bowEnd.s / 2)).toFixed(2),
              "--dy": +(G.bow.y + G.bow.s / 2 - (bowEnd.y + bowEnd.s / 2)).toFixed(2),
              "--s0": +(G.bow.s / bowEnd.s).toFixed(4),
            })}
          >
            <Img src={`${P}/bant.webp`} eager />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════ 01 · Hero — «18» sharlari, portret, ism (ochilish ostida sticky; --o bilan):
 * fon pudradan krem-pushti gradientga o‘tadi, portret pastdan ko‘tariladi, ism harflari markazdan kengayib chiqadi ═════════════ */
function Hero({ d, wide, still }: { d: D; wide: boolean; still: boolean }) {
  const W = wide ? 1440 : 390;
  const H = wide ? 900 : 844;
  const pageU = wide ? CANVAS_L : COL_M;
  const { ox, k } = stageOf(wide);
  const X = (x: number) => `calc(50% + ${U(x - W / 2)})`;
  const Y = (y: number) => `calc(100% - ${U(H - y)})`;
  const hx = (x: number) => X(ox + x * k);
  const hy = (y: number) => Y(y * k);
  const hs = (s: number) => U(s * k);
  const [nT, nH, nF] = HERO.name;
  const [sT, sH, sF] = HERO.sub;
  const [dT, dH, dF, dLs] = HERO.date;
  const [px, py, pw, ph] = HERO.photo;
  const bals = heroBal(d.digits, wide);
  const bow = heroBow(wide);
  return (
    <div className={cx(st.hero, still && st.heroStill)} style={vars(still ? { "--u": pageU, height: U(H) } : { "--u": `min(${pageU}, calc(100svh / ${H}))` })}>
      <div aria-hidden className={st.hBack} />
      <div aria-hidden className={st.hBg} />
      {wide && (
        <>
          <div aria-hidden className={cx(st.hLenta, st.hLentaL)} style={{ left: X(-90), top: Y(466.5), width: U(520), height: U(347) }}>
            <Img src={`${P}/lenta.webp`} eager />
          </div>
          <div aria-hidden className={cx(st.hLenta, st.hLentaR)} style={{ left: X(1010), top: Y(466.5), width: U(520), height: U(347) }}>
            <Img src={`${P}/lenta.webp`} eager className={st.flip} />
          </div>
          {(
            [
              [185, 185, 30],
              [1225, 185, 30],
              [311, 321, 18],
              [1111, 321, 18],
            ] as const
          ).map(([x, y, s], i) => (
            <Spark key={i} silver className={st.hSpark} style={vars({ left: X(x), top: Y(y), width: U(s), height: U(s), "--sd": +(0.02 + i * 0.03).toFixed(3) })} />
          ))}
        </>
      )}
      {bals.map((b, i) => (
        <div key={i} aria-hidden className={st.hBal} style={vars({ ...(balBox(b, X, Y, U) as Record<string, string>), rotate: `${b.rot}deg` })}>
          <Img src={sharSrc(b.d)} eager />
        </div>
      ))}
      {!d.digits.length && (
        <div aria-hidden className={st.hBal} style={{ left: X(bow.x), top: Y(bow.y), width: U(bow.s), height: U(bow.s) }}>
          <Img src={`${P}/bant.webp`} eager />
        </div>
      )}
      {/* portret — stadion shaklida, pastdan ko‘tariladi (surat bo‘lmasa — pudra fonda sovg‘a qutisi) */}
      <div className={st.hPhoto} style={vars({ left: hx(px), top: hy(py), width: hs(pw), height: hs(ph), borderRadius: hs(pw / 2), "--rise": +((H - py * k) / 1).toFixed(2) })}>
        {d.portrait ? <Img src={d.portrait} eager style={{ objectPosition: "50% 22%" }} /> : <Img src={`${P}/quti.webp`} eager className={st.hBoxImg} />}
      </div>
      {HERO.sparks.map(([x, y, s], i) => (
        <Spark key={i} silver className={st.hSpark} style={vars({ left: hx(x), top: hy(y), width: hs(s), height: hs(s), "--sd": +(0.04 + i * 0.03).toFixed(3) })} />
      ))}
      {/* blok pastki chetga bog‘langan: ism 2 qatorga bo‘linsa — yuqoriga o‘sadi */}
      <div className="absolute inset-x-0" style={{ bottom: U(H - (dT + dH) * k) }}>
        {d.a && (
          <h2 className={cx(st.tn, "relative mx-auto text-center")} style={{ width: hs(390), color: "var(--berry)" }}>
            <NameLines text={d.a} base={nF} max={366} lh={nH} two={nF * 0.66} twoLh={nH * 0.66} unit={hs} letters={[0.54, 0.8]} />
          </h2>
        )}
        <p
          className={cx(st.cgI, st.hSub, "relative mx-auto text-center")}
          style={{ width: hs(390), marginTop: hs(d.a ? sT - nT - nH : 0), height: hs(sH), fontSize: hs(sF), lineHeight: `${hs(sH)}`, color: "var(--ink)", whiteSpace: "pre" }}
        >
          <Fit base={sF} max={366} unit={hs} deps={d.heroSub}>
            {d.heroSub}
          </Fit>
        </p>
        {d.dots && (
          <p
            className={cx(st.msM, st.hDate, "relative mx-auto text-center")}
            style={{ width: hs(390), marginTop: hs(dT - sT - sH), height: hs(dH), fontSize: hs(dF), lineHeight: `${hs(dH)}`, color: "var(--mute)", whiteSpace: "nowrap" }}
          >
            <span style={{ letterSpacing: hs(dLs), paddingLeft: hs(dLs) }}>{d.dots}</span>
          </p>
        )}
      </div>
    </div>
  );
}

/* ═════════════ Bo‘lim qobig‘i ═════════════ */
type Bg = "cream" | "blush" | "berry";

/** Bo‘lim: to‘liq enli fon + markazda kontent ustuni (mobil 390 birlik; laptopda × 1.45). `outer` — ustundan tashqaridagi bezaklar */
function Sec({ children, z, bg, colStyle, id, outer }: { children: ReactNode; z: number; bg: Bg; colStyle?: CSSProperties; id?: string; outer?: ReactNode }) {
  return (
    <section id={id} className={cx(st.sec, st[bg])} style={{ zIndex: z }}>
      {outer}
      <div className={st.col} style={{ width: U(390), ...colStyle }}>
        {children}
      </div>
    </section>
  );
}

/** Laptop yon uchqunlari (1440 kanvas) */
function SideSparks({ wide, list, silver }: { wide: boolean; list: [number, number, number][]; silver?: boolean }) {
  if (!wide) return null;
  return (
    <div aria-hidden className={st.deco}>
      {list.map(([x, y, s], i) => (
        <Spark key={i} silver={silver} a="spin" d={0.2 + (i % 2) * 0.1 + Math.floor(i / 2) * 0.15} style={{ left: C(x), top: C(y), width: C(s), height: C(s) }} />
      ))}
    </div>
  );
}

/** Sarlavha (Tenor Sans, markazda, 360 da sig‘adi) */
function Title({ text, top, fs = 32, h = 37, color = "var(--ink)", d = 0, style }: { text: string; top?: number; fs?: number; h?: number; color?: string; d?: number; style?: CSSProperties }) {
  return (
    <p
      data-a="up"
      className={cx(st.tn, "text-center", top != null && "absolute inset-x-0")}
      style={vars({ top: top != null ? U(top) : undefined, height: U(h), fontSize: U(fs), lineHeight: `${U(h)}`, color, "--d": `${d}s`, ...(style as Record<string, string>) })}
    >
      <Fit base={fs} max={366} deps={text}>
        {text}
      </Fit>
    </p>
  );
}

/** Chok ustidagi atlas lenta (Figma «Atlas lenta · chok ustida»): bo‘lim tepasidan yuqoriga chiqadi; laptopda sahifa birligida */
function SeamLenta({ wide, flip }: { wide: boolean; flip?: boolean }) {
  const [x, y, w, h] = wide ? [400, -209.5385, 640, 427.0769] : [-25, -142.8077, 440, 293.6154];
  const u = wide ? C : U;
  return (
    <div aria-hidden data-a="wave" className={cx(st.seamLenta, flip && st.waveR)} style={vars({ left: wide ? u(x) : `calc(50% + ${u(x - 195)})`, top: u(y), width: u(w), height: u(h) })}>
      <Img src={`${P}/lenta.webp`} className={flip ? st.flip : undefined} />
    </div>
  );
}

/* ═════════════ 02 · Taklif — murojaat, taklif matni, imzo ═════════════ */
function Taklif({ d, z, wide, tail }: { d: D; z: number; wide: boolean; tail: number }) {
  const t = useT();
  const hello = d.guest ? guestHello(t, "Hurmatli {guest}!", d.guest) : t("Aziz do‘stlarim!");
  return (
    <Sec
      z={z}
      bg="cream"
      colStyle={{ paddingTop: U(82), paddingBottom: U(116 + tail) }}
      outer={
        <>
          <SeamLenta wide={wide} />
          {wide && (
            <div aria-hidden className={st.deco}>
              <div data-a="pop" className={st.art} style={vars({ left: C(133), top: C(335), width: C(200), height: C(200), "--d": "0.2s" })}>
                <Img src={`${P}/bant.webp`} />
              </div>
              <div data-a="pop" className={st.art} style={vars({ left: C(1107), top: C(335), width: C(200), height: C(200), "--d": "0.3s" })}>
                <Img src={`${P}/bant.webp`} className={st.flip} />
              </div>
            </div>
          )}
        </>
      }
    >
      <div className="relative" style={{ height: U(28) }}>
        <Spark a="spin" style={{ left: U(181), top: 0, width: U(28), height: U(28) }} />
      </div>
      <div data-a="up" className={cx(st.tn, "relative text-center")} style={vars({ marginTop: U(20), color: "var(--ink)", "--d": "0.08s" })}>
        <NameLines text={hello} base={32} max={366} lh={37} two={27} twoLh={32} />
      </div>
      {d.message && (
        <p
          data-a="up"
          className={cx(st.ms, "mx-auto text-center")}
          style={vars({ marginTop: U(29), width: U(318), minHeight: U(140), fontSize: U(17), lineHeight: `${U(28)}`, color: "var(--ink)", overflowWrap: "anywhere", "--d": "0.18s" })}
        >
          {d.message}
        </p>
      )}
      {d.signer && (
        <>
          <span data-a="rule" className={st.ruleC} style={vars({ marginTop: U(d.message ? 54 : 36), width: U(40), height: U(1), "--d": "0.1s" })} />
          <p data-a="up" className={cx(st.cgI, "text-center")} style={vars({ marginTop: U(21), height: U(22), fontSize: U(18), lineHeight: `${U(22)}`, color: "var(--mute)", "--d": "0.16s" })}>
            {t("Mehr bilan,")}
          </p>
          <div data-a="up" className={cx(st.cgI, "relative text-center")} style={vars({ marginTop: U(2), color: "var(--berry)", "--d": "0.24s" })}>
            <NameLines text={d.signer} base={40} max={340} lh={48} two={32} twoLh={38} />
          </div>
        </>
      )}
    </Sec>
  );
}

/* ═════════════ 03 · Yangi bob — tort bilan surat, yosh so‘z bilan ═════════════ */
function Bob({ d, z, wide, tail }: { d: D; z: number; wide: boolean; tail: number }) {
  const t = useT();
  if (!d.chapter) return null;
  return (
    <Sec
      z={z}
      bg="berry"
      colStyle={{ paddingTop: U(60), paddingBottom: U(102 + tail) }}
      outer={
        <SideSparks
          wide={wide}
          silver
          list={[
            [216, 313.6, 34],
            [1190, 313.6, 34],
            [270, 673.24, 20],
            [1150, 673.24, 20],
          ]}
        />
      }
    >
      <Title text={t("Yangi bob")} color="var(--cream)" />
      <div className="relative" style={{ marginTop: U(83), height: U(300) }}>
        <div data-a="zoom" className="absolute overflow-hidden" style={vars({ left: U(45), top: 0, width: U(300), height: U(300), borderRadius: U(24), background: "#c9b7ad", "--d": "0.1s" })}>
          <Img src={d.chapter} className={st.zoomImg} />
        </div>
        <Spark silver a="spin" d={0.5} style={{ left: U(329), top: U(-7), width: U(26), height: U(26) }} />
        <Spark silver a="spin" d={0.62} style={{ left: U(42), top: U(280), width: U(20), height: U(20) }} />
      </div>
      <p data-a="up" className={cx(st.cgI, "mx-auto text-center")} style={vars({ marginTop: U(50), width: U(310), minHeight: U(64), fontSize: U(26), lineHeight: `${U(32)}`, color: "var(--blush)", "--d": "0.15s" })}>
        {d.chapterLine}
      </p>
      <p data-a="up" className={cx(st.ms, "mx-auto text-center")} style={vars({ marginTop: U(16), width: U(300), fontSize: U(16), lineHeight: `${U(24)}`, color: "rgba(246,225,225,.8)", "--d": "0.25s" })}>
        {d.chapterText}
      </p>
    </Sec>
  );
}

/* ═════════════ 04 · Bayram kuni — kun (chiziqlab yoziladi), oy · hafta kuni, soat, sanoq kapsulalari (flip) ═════════════ */
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
  const left = t("bayramgacha qoldi");
  const sides = sideBalloons(d.digits, SIDE.sana.L, SIDE.sana.R);
  return (
    <Sec
      z={z}
      bg="blush"
      colStyle={{ height: U(640 + tail) }}
      outer={
        <>
          {/* chokdagi pushti uchqunlar (Figma: 03/04 chegarasida) */}
          {wide
            ? [
                [505, -15, 30],
                [905, -15, 30],
              ].map(([x, y, s], i) => <Spark key={i} a="spin" d={0.1 + i * 0.1} className={st.seamSpark} style={{ left: C(x), top: C(y), width: C(s), height: C(s) }} />)
            : [
                [47, -13, 26],
                [320, -4, 20],
              ].map(([x, y, s], i) => <Spark key={i} a="spin" d={0.1 + i * 0.1} className={st.seamSpark} style={{ left: `calc(50% + ${U(x - 195)})`, top: U(y), width: U(s), height: U(s) }} />)}
          {wide && (
            <div aria-hidden className={st.deco}>
              {sides.map((b, i) => (
                <div key={i} data-a="float" className={st.art} style={vars({ ...(balBox(b, C, C, C) as Record<string, string>), rotate: `${b.rot}deg`, "--d": `${0.15 + i * 0.12}s` })}>
                  <Img src={sharSrc(b.d)} />
                </div>
              ))}
            </div>
          )}
        </>
      }
    >
      <Title text={t("Bayram kuni")} top={56} fs={30} h={35} />
      <svg aria-hidden data-a="ink" className={cx(st.art, st.dayNum)} viewBox="0 0 390 170" style={vars({ left: 0, top: U(100), width: U(390), height: U(170), "--d": "0.2s" })}>
        <text x="195" y="132.8" textAnchor="middle" fontSize="150">
          {d.day}
        </text>
      </svg>
      <p data-a="up" className={cx(st.cgI, "absolute inset-x-0 text-center")} style={vars({ top: U(280), height: U(31), fontSize: U(26), lineHeight: `${U(31)}`, color: "var(--ink)", whiteSpace: "nowrap", "--d": "0.5s" })}>
        <Fit base={26} max={366} deps={d.monthDay}>
          {d.monthDay}
        </Fit>
      </p>
      {d.start && (
        <p data-a="up" className={cx(st.msM, "absolute inset-x-0 text-center")} style={vars({ top: U(324), height: U(22), fontSize: U(16), lineHeight: `${U(22)}`, color: "var(--mute)", whiteSpace: "nowrap", "--d": "0.6s" })}>
          <span style={{ letterSpacing: U(2) }}>{d.start}</span>
        </p>
      )}
      {/* sanoq kuzatuvchisi — taymer qatorini qoplaydi */}
      <div ref={ref} aria-hidden className="pointer-events-none absolute inset-x-0" style={{ top: U(384), height: U(100) }} />
      <div className={st.flipRow} style={{ position: "absolute", left: 0, top: U(384), width: "100%", height: U(100) }}>
        {vals.map((v, i) => (
          <div key={i} data-a="flip" className={cx(st.capsule, "absolute text-center")} style={vars({ left: U(27 + i * 87), top: 0, width: U(75), height: U(100), borderRadius: U(38), "--d": `${0.15 + i * 0.1}s` })}>
            <span className={cx(st.tn, "absolute inset-x-0 block")} style={{ top: U(24), height: U(33), fontSize: U(28), lineHeight: `${U(33)}`, color: "var(--berry)" }}>
              <Digits value={v} run={inView} len={i === 0 ? Math.max(2, String(vals[0]).length) : 2} i={i} />
            </span>
            <span className={cx(st.ms, "absolute inset-x-0 block")} style={{ top: U(64), height: U(18), fontSize: U(13), lineHeight: `${U(18)}`, color: "var(--mute)", whiteSpace: "nowrap" }}>
              {units[i]}
            </span>
          </div>
        ))}
      </div>
      <p data-a="up" className={cx(st.cgI, "absolute inset-x-0 text-center")} style={vars({ top: U(512), height: U(24), fontSize: U(20), lineHeight: `${U(24)}`, color: "var(--mute)", "--d": "0.5s" })}>
        <Fit base={20} max={366} deps={left}>
          {left}
        </Fit>
      </p>
    </Sec>
  );
}

/* ═════════════ 05 · Kecha dasturi — qatorlar navbat bilan, uchqunlar aylanib chiqadi ═════════════ */
function Program({ d, z, wide, tail }: { d: D; z: number; wide: boolean; tail: number }) {
  const t = useT();
  const items = d.program.slice(0, 8);
  if (!items.length) return null;
  return (
    <Sec
      z={z}
      bg="cream"
      colStyle={{ paddingTop: U(56), paddingBottom: U(132 + tail) }}
      outer={
        <SideSparks
          wide={wide}
          list={[
            [218, 350.4, 30],
            [1192, 350.4, 30],
            [251, 669.6, 18],
            [1171, 669.6, 18],
          ]}
        />
      }
    >
      <Title text={t("Kecha dasturi")} />
      <div style={{ marginTop: U(57) }}>
        {items.map((it, i) => (
          <div key={i} className="relative" style={{ paddingLeft: U(166), paddingRight: U(28) }}>
            <Spark a="spin" d={0.05} style={{ left: U(35), top: U(11), width: U(18), height: U(18) }} />
            <p data-a="right" className={cx(st.tn, "absolute")} style={vars({ left: U(70), top: U(4), width: U(92), height: U(26), fontSize: U(22), lineHeight: `${U(26)}`, color: "var(--berry)", whiteSpace: "nowrap", "--d": "0.1s" })}>
              {it.time}
            </p>
            <div style={{ minHeight: U(48) }}>
              <p data-a="right" className={cx(st.msM, st.clamp2)} style={vars({ fontSize: U(18), lineHeight: `${U(25)}`, color: "var(--ink)", "--d": "0.18s" })}>
                {it.title}
              </p>
              {it.note?.trim() && (
                <p data-a="right" className={cx(st.ms, st.clamp2)} style={vars({ marginTop: U(3), fontSize: U(15), lineHeight: `${U(20)}`, color: "var(--mute)", "--d": "0.26s" })}>
                  {it.note}
                </p>
              )}
            </div>
            {i < items.length - 1 && <span data-a="rule" className={st.rule} style={{ marginLeft: U(-134), marginTop: U(40), marginBottom: U(41), width: U(326), height: U(1) }} />}
          </div>
        ))}
      </div>
    </Sec>
  );
}

/* ═════════════ 06 · Manzil — restoran surati, joy nomi, manzil, xarita ═════════════ */
function Venue({ d, z, wide, linkable, tail }: { d: D; z: number; wide: boolean; linkable: boolean; tail: number }) {
  const t = useT();
  if (!d.hasPlace) return null;
  return (
    <Sec
      z={z}
      bg="blush"
      colStyle={{ paddingTop: U(56), paddingBottom: U(72 + tail) }}
      outer={
        wide && (
          <div aria-hidden className={st.deco}>
            <div data-a="wave" className={st.art} style={vars({ left: C(-60), top: C(502.79), width: C(440), height: C(293.6154), "--d": "0.15s" })}>
              <Img src={`${P}/lenta.webp`} />
            </div>
            <div data-a="wave" className={cx(st.art, st.waveR)} style={vars({ left: C(1060), top: C(502.79), width: C(440), height: C(293.6154), "--d": "0.25s" })}>
              <Img src={`${P}/lenta.webp`} className={st.flip} />
            </div>
          </div>
        )
      }
    >
      <Title text={t("Manzil")} />
      <div data-a="zoom" className="relative mx-auto overflow-hidden" style={vars({ marginTop: U(31), width: U(326), height: U(226), borderRadius: U(20), background: "#d9c3bd", "--d": "0.1s" })}>
        <Img src={d.hall} className={st.zoomImg} />
      </div>
      {d.venueTitle && (
        <p data-a="up" className={cx(st.tn, "mx-auto text-center")} style={vars({ marginTop: U(28), width: U(366), fontSize: U(26), lineHeight: `${U(30)}`, color: "var(--ink)", overflowWrap: "anywhere", "--d": "0.15s" })}>
          {d.venueTitle}
        </p>
      )}
      {d.address && (
        <p data-a="up" className={cx(st.ms, "mx-auto text-center")} style={vars({ marginTop: U(d.venueTitle ? 12 : 28), width: U(300), fontSize: U(16), lineHeight: `${U(24)}`, color: "var(--mute)", overflowWrap: "anywhere", "--d": "0.22s" })}>
          {d.address}
        </p>
      )}
      <div data-a="up" className="flex justify-center" style={vars({ marginTop: U(48), "--d": "0.3s" })}>
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
function Dress({ d, z, tail }: { d: D; z: number; tail: number }) {
  const t = useT();
  if (!d.dressNote && !d.dressCode) return null;
  return (
    <Sec z={z} bg="cream" colStyle={{ paddingTop: U(47), paddingBottom: U(116 + tail) }}>
      <div className="relative" style={{ height: U(26) }}>
        <Spark a="spin" style={{ left: U(182), top: 0, width: U(26), height: U(26) }} />
      </div>
      <Title text={t("Dress-kod")} d={0.08} style={{ marginTop: U(19) }} />
      {d.dressCode && (
        <p data-a="up" className={cx(st.cgI, "text-center")} style={vars({ marginTop: U(11), height: U(29), fontSize: U(24), lineHeight: `${U(29)}`, color: "var(--berry)", "--d": "0.16s" })}>
          {d.dressCode}
        </p>
      )}
      {d.dressNote && (
        <p data-a="up" className={cx(st.ms, "mx-auto text-center")} style={vars({ marginTop: U(21), width: U(300), fontSize: U(17), lineHeight: `${U(27)}`, color: "var(--mute)", overflowWrap: "anywhere", "--d": "0.24s" })}>
          {d.dressNote}
        </p>
      )}
    </Sec>
  );
}

/* ═════════════ 08 · Anketa — javob (berry fon, krem karta) ═════════════ */
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
    <Sec
      z={z}
      bg="berry"
      id="sovga-javob"
      colStyle={{ paddingTop: U(56), paddingBottom: U(74 + tail) }}
      outer={
        <SideSparks
          wide={wide}
          silver
          list={[
            [216, 304.9, 34],
            [1190, 304.9, 34],
            [259, 740.1, 22],
            [1159, 740.1, 22],
          ]}
        />
      }
    >
      <Title text={t("Kelasizmi?")} fs={36} h={42} color="var(--cream)" />
      <p
        data-a="up"
        className={cx(st.ms, "mx-auto text-center")}
        style={vars({ marginTop: U(12), width: U(366), minHeight: U(20), fontSize: U(15), lineHeight: `${U(20)}`, color: "rgba(246,225,225,.85)", overflowWrap: "anywhere", "--d": "0.12s" })}
      >
        {sub}
      </p>
      <div
        data-a="rise"
        className={cx(st.card, "relative mx-auto overflow-hidden")}
        style={vars({ marginTop: U(36), width: U(334), padding: `${U(30)} ${U(30)} ${U(50)}`, borderRadius: U(28), boxShadow: `0 ${U(12)} ${U(30)} rgba(77,13,26,.3)`, "--d": "0.2s" })}
      >
        {sent ? (
          <div key="thanks" className={cx(st.thanks, "relative flex flex-col items-center text-center")} style={{ padding: `${U(40)} ${U(6)} ${U(10)}`, gap: U(16), minHeight: U(360) }}>
            <Spark a={null} style={{ position: "relative", width: U(28), height: U(28) }} />
            <p className={st.tn} style={{ fontSize: U(sent === "not_coming" ? 30 : 26), lineHeight: 1.25, color: "var(--berry)", overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Rahmat!") : t("Rahmat! Joyingiz band qilindi")}
            </p>
            <p className={st.ms} style={{ fontSize: U(16), color: "var(--mute)", lineHeight: 1.55, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Javobingiz uchun rahmat!") : t("{name} — {count} kishi. Javobingiz yetkazildi.", { name: name.trim() || t("Javobingiz"), count })}
            </p>
            <button type="button" onClick={() => setSent(null)} className={st.msM} style={{ fontSize: U(15), color: "var(--berry)", textDecoration: "underline", textUnderlineOffset: 3 }}>
              {t("Javobni o‘zgartirish")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="relative flex flex-col items-stretch">
            {label(t("Ismingiz"))}
            <label className={st.field} style={{ marginTop: U(6), height: U(50), padding: `0 ${U(20)}`, borderRadius: U(25) }}>
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
                  style={{ padding: `${U(6)} ${U(6)}`, minHeight: U(48), fontSize: U(15), borderWidth: U(1), borderRadius: U(24) }}
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
                  style={{ width: U(32), height: U(36), fontSize: U(18), borderRadius: U(18) }}
                >
                  −
                </button>
                <span className={st.msM} style={{ width: U(32), textAlign: "center", fontSize: U(18), lineHeight: 1.4, color: "var(--berry)" }} aria-live="polite">
                  {count}
                </span>
                <button
                  type="button"
                  className={cx(st.msM, st.step)}
                  disabled={count >= 20}
                  onClick={() => setCount((c) => Math.min(20, c + 1))}
                  aria-label={t("Ko‘paytirish")}
                  style={{ width: U(32), height: U(36), fontSize: U(18), borderRadius: U(18) }}
                >
                  +
                </button>
              </div>
            )}
            <div style={{ marginTop: U(20) }}>{label(t("Tilaklaringiz"))}</div>
            <label className={st.field} style={{ marginTop: U(6), height: U(100), padding: `${U(14)} ${U(20)}`, borderRadius: U(22), justifyContent: "flex-start", alignItems: "flex-start" }}>
              <textarea
                ref={wishRef}
                rows={1}
                className={cx(st.ms, st.input)}
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                maxLength={500}
                placeholder={d.wishPh}
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
              style={{ marginTop: U(24), minHeight: U(56), padding: `${U(12)} ${U(12)}`, fontSize: U(16), borderRadius: U(28), opacity: busy ? 0.7 : 1 }}
            >
              {busy ? t("Yuborilmoqda…") : t("Javobni yuborish")}
            </button>
          </form>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 09 · Final — sharlar ikki tomondan kirib keladi, bant yana bog‘lanadi
 * (scroll bilan: --fc 0 … 1 = Figma kadri; sahifa oxirigacha albatta tugaydi) ═════════════ */
const FIN = {
  m: {
    W: 390,
    H: 844,
    bow: { x: 120, y: 275, s: 150 } as Box,
    title: [450, 49, 42] as const,
    text: [45, 512, 300, 22, 27] as const,
    max: 366,
    rule: [175, 570, 40] as const,
    name: [590, 53, 44] as const,
    date: [652, 18, 13, 4] as const,
    box: { x: 120, y: 685, s: 150 } as Box,
    sparks: [
      [50, 410, 20],
      [328, 418, 24],
      [83, 693, 14],
      [60, 720, 20],
      [310, 738, 24],
    ] as [number, number, number][],
  },
  l: {
    W: 1440,
    H: 900,
    bow: { x: 620, y: 100, s: 200 } as Box,
    title: [330, 75, 64] as const,
    text: [420, 420, 600, 30, 36] as const,
    max: 1100,
    rule: [690, 490, 60] as const,
    name: [510, 73, 60] as const,
    date: [596, 20, 15, 5] as const,
    box: { x: 630, y: 670, s: 180 } as Box,
    sparks: [
      [469, 609, 22],
      [947, 607, 26],
      [552, 772, 16],
      [871, 771, 18],
    ] as [number, number, number][],
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
      // sahna ekranning 80% iga kirganda boshlanadi va 0.5 ekran skrollda tugaydi — sahifa oxiri undan oldin kelsa, oxirida tugaydi
      const y = window.scrollY;
      const top = r.top + y;
      const max = document.documentElement.scrollHeight - vh;
      const s0 = Math.min(top - vh * 0.8, max - 1);
      const s1 = Math.max(s0 + 1, Math.min(s0 + vh * 0.5, max));
      const f = seg(y, s0, s1);
      el.style.setProperty("--fc", f.toFixed(4));
      if (f > 0.5) onSeen();
    },
    [onSeen],
  );
  useScrollProgress(sec, onP, !still);
  const { W, H } = G;
  const title = t(d.we ? "Sizni kutamiz!" : "Sizni kutaman!");
  const [tx, ty, tw, tfs, tlh] = G.text;
  const bals = wide ? sideBalloons(d.digits, SIDE.final.L, SIDE.final.R) : finalBalloons(d.digits);
  const Ux = (x: number) => U(x);
  return (
    <section ref={sec} className={cx(st.sec, st.fin)} style={vars({ zIndex: z, "--u": wide ? CANVAS_L : COL_M })}>
      <SeamLenta wide={wide} flip />
      <div ref={ref} className={cx(st.finalWrap, "relative mx-auto")} style={vars({ width: U(W), height: U(H), ...(still ? { "--fc": 1 } : {}) })}>
        {bals.map((b, i) => {
          const fromLeft = b.cx < W / 2;
          return (
            <div
              key={i}
              aria-hidden
              className={st.fBal}
              style={vars({
                ...(balBox(b, Ux, Ux, Ux) as Record<string, string>),
                "--r1": b.rot,
                "--side": fromLeft ? -1 : 1,
                "--off": +((fromLeft ? b.cx : W - b.cx) + b.w * 0.05).toFixed(1),
                "--fb": +(i * 0.06).toFixed(2),
              })}
            >
              <Img src={sharSrc(b.d)} />
            </div>
          );
        })}
        <div aria-hidden className={st.fBow} style={{ left: U(G.bow.x), top: U(G.bow.y), width: U(G.bow.s), height: U(G.bow.s) }}>
          <Img src={`${P}/bant.webp`} />
        </div>
        <h2 data-a="up" className={cx(st.tn, "absolute inset-x-0 text-center")} style={vars({ top: U(G.title[0]), height: U(G.title[1]), fontSize: U(G.title[2]), lineHeight: `${U(G.title[1])}`, color: "var(--berry)", "--d": "0.1s" })}>
          <Fit base={G.title[2]} max={G.max} deps={title}>
            {title}
          </Fit>
        </h2>
        <div data-a="up" className={cx(st.cgI, "absolute text-center")} style={vars({ left: U(tx), top: U(ty), width: U(tw), color: "var(--ink)", "--d": "0.2s" })}>
          <NameLines text={t("Bu kecha sizsiz to‘liq bo‘lmaydi.")} base={tfs} max={Math.min(G.max, tw)} lh={tlh} two={tfs * 0.92} twoLh={tlh * 0.92} />
        </div>
        <span data-a="rule" className={cx(st.ruleC, "absolute")} style={vars({ left: U(G.rule[0]), top: U(G.rule[1]), width: U(G.rule[2]), height: U(1), "--d": "0.3s" })} />
        <div className="absolute inset-x-0" style={{ top: U(G.name[0]) }}>
          {d.a && (
            <div data-a="up" className={cx(st.cgI, "relative text-center")} style={vars({ color: "var(--berry)", "--d": "0.35s" })}>
              <NameLines text={d.a} base={G.name[2]} max={G.max} lh={G.name[1]} two={G.name[2] * 0.8} twoLh={G.name[1] * 0.8} />
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
                color: "var(--mute)",
                whiteSpace: "nowrap",
                "--d": "0.45s",
              })}
            >
              <span style={{ letterSpacing: U(G.date[3]), paddingLeft: U(G.date[3]) }}>{d.dotsTime}</span>
            </p>
          )}
        </div>
        <div data-a="rise" className={st.art} style={vars({ left: U(G.box.x), top: U(G.box.y), width: U(G.box.s), height: U(G.box.s), "--d": "0.5s" })}>
          <Img src={`${P}/quti.webp`} />
        </div>
        {G.sparks.map(([x, y, s], i) => (
          <Spark key={i} silver a="spin" d={0.4 + i * 0.1} style={{ left: U(x), top: U(y), width: U(s), height: U(s) }} />
        ))}
      </div>
    </section>
  );
}

/* ═════════════ Musiqa tugmasi — Figma «Sovg‘a / Musiqa tugmasi»: berry doira, 3 pushti chiziq ritmda; o‘chirilgan — xira chiziqlar va qiya chiziq ═════════════ */
const BARS: [number, number, number][] = [
  [26, 25, 12],
  [32, 21, 20],
  [38, 24, 14],
];
function SovgaMusic({ m, wide, embedded }: { m: ReturnType<typeof useMusic>; wide: boolean; embedded: boolean }) {
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
type Key = "taklif" | "bob" | "sana" | "program" | "venue" | "dress" | "rsvp" | "final";
/**
 * Finaldagi atlas lenta oldingi bo‘lim pastiga ~60 birlik kirib turadi (Figma 08/09). Har bo‘limning pastki bo‘sh joyi (matn/tugmagacha)
 * yetmasa — o‘sha bo‘limga qo‘shimcha pastki joy (tail) beriladi: ixtiyoriy bo‘lim o‘chirilganda ham lenta matn ustiga tushmaydi.
 */
const OVER = 70;
const ROOM: Record<Exclude<Key, "final">, number> = { taklif: 116, bob: 102, sana: 104, program: 132, venue: 72, dress: 116, rsvp: 74 };

export function SovgaSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const loaded = usePreload(
    [`${P}/quti.webp`, `${P}/bant.webp`, ...d.digits.map(sharSrc), d.portrait].filter(Boolean) as string[],
    [`${P}/lenta.webp`, d.chapter, d.hall].filter(Boolean) as string[],
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

  const shown: Key[] = (["taklif", "bob", "sana", "program", "venue", "dress", "rsvp", "final"] as Key[]).filter((k) =>
    k === "bob"
      ? !!d.chapter
      : k === "sana"
        ? d.hasDate
        : k === "program"
          ? d.program.length > 0
          : k === "venue"
            ? d.hasPlace
            : k === "dress"
              ? !!(d.dressNote || d.dressCode)
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
        <SovgaMusic m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/quti.webp`} />}
        <div className={cx(st.flow, st.opening)} style={embedded ? vars({ "--o": 1 }) : undefined}>
          {withGate && (loaded ? <Gate d={d} wide={wide} onStart={() => music.play(true)} /> : <div className={st.gateHold} />)}
          {embedded && <Gate d={d} wide={wide} still onStart={() => {}} />}
          <div className={cx(st.openWrap, embedded && st.openStill)} style={{ zIndex: 5 }}>
            <Hero d={d} wide={wide} still={embedded} />
            {withGate && <div className={st.openSpacer} />}
          </div>
          <Taklif d={d} z={z("taklif")} wide={wide} tail={tail("taklif")} />
          <Bob d={d} z={z("bob")} wide={wide} tail={tail("bob")} />
          <Sana d={d} z={z("sana")} wide={wide} tail={tail("sana")} />
          <Program d={d} z={z("program")} wide={wide} tail={tail("program")} />
          <Venue d={d} z={z("venue")} wide={wide} linkable={linkable} tail={tail("venue")} />
          <Dress d={d} z={z("dress")} tail={tail("dress")} />
          {data.rsvpEnabled && <Rsvp d={d} slug={data.slug} mode={mode} z={z("rsvp")} wide={wide} tail={tail("rsvp")} />}
          <Final d={d} z={z("final")} wide={wide} still={embedded} onSeen={onFinal} />
        </div>
        <footer className={cx(st.footer, "flex items-start justify-center")} style={{ height: fu(120), paddingTop: fu(50) }}>
          <p className={cx(st.ms, "text-center")} style={{ fontSize: fu(13), lineHeight: 18 / 13, color: "rgba(246,225,225,.7)" }}>
            <a href="https://shohnoma.uz">Shohnoma</a> · {t("elektron taklifnomalar")}
          </p>
        </footer>
      </div>
    </div>
  );
}
