"use client";

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
import { ARCHA_DEMO, ARCHA_DEMO_EN, ARCHA_DEMO_RU, DRESS_TEXT, GIFT_NOTE, MSG, P } from "./data";
import st from "./archa.module.css";

/* ── Birliklar ──
 * U — joriy `--u`. Bo‘limlarda — kontent ustuni (Figma mobil 390 koordinatalari; laptopda ustun = mobil × 1.2, ya’ni 468px / 1440 —
 * Figma «Kontent ustuni (mobil ×1.2)»). C — laptop kanvasi (1440) birligi: yon bezaklar (osilgan sharlar, qor, archa shoxi, sovg‘alar).
 * Ochilish (00) — o‘z kanvasi (mobil 390×844, laptop 1440×1013): sahna bir ekranga sig‘adi va pastki chetga bog‘lanadi;
 * laptopda ustun elementlari = mobil koordinata × 1.2 + 486 (Figma bilan aynan). PU — sahifa ustuni birligi. */
const U = (n: number) => `calc(var(--u) * ${+n.toFixed(3)})`;
const PU = (n: number) => `calc(var(--pu) * ${+n.toFixed(3)})`;
const C = (n: number) => `calc(100cqw / 1440 * ${+n.toFixed(3)})`;
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const vars = (o: Record<string, string | number | undefined>) => o as CSSProperties;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const COL_M = "calc(100cqw / 390)";
const COL_L = "calc(100cqw / 1440 * 1.2)";
const CANVAS_L = "calc(100cqw / 1440)";

/* Ranglar (Figma «29 · Archa — Assets») */
const NAVY = "#0C1633";
const RED = "#D92F38";
const INK = "#121729";
const MUTED = "#6B758A";
const SILVER = "#C9D1DE";
/** Dela Gothic One — Figma’dagi «normal» qator balandligi */
const LH_D = 1.448;

type Rang = "qizil" | "kumush" | "muz";
/** Shar SVG nisbati (80 × 98) */
const BALL_K = 98 / 80;

/** Server yaratadigan standart taklif matni (php/api/lib/orders.php DEFAULT_MESSAGE) — har qaysi tilda */
const SERVER_DEFAULT = "Aziz mehmonlar! Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.";
const isServerDefault = (m: string) => (["uz", "ru", "en"] as Locale[]).some((l) => tr(l, SERVER_DEFAULT).trim() === m.trim());
const DAY_MS = 86400_000;
const isoOf = (d: Date) => d.toISOString().slice(0, 10);

/** Kutib olinadigan yil: noyabr–dekabrdagi bazm — keyingi yil («2027»), yanvar–oktyabr — o‘sha yil */
function newYearOf(date: Date | null) {
  const d = date ?? new Date();
  const y = date ? d.getUTCFullYear() : d.getFullYear();
  const m = date ? d.getUTCMonth() : d.getMonth();
  return m >= 10 ? y + 1 : y;
}

function useData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO = lang === "ru" ? ARCHA_DEMO_RU : lang === "en" ? ARCHA_DEMO_EN : ARCHA_DEMO;
  const ex = (data.extra ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof ex[k] === "string" ? (ex[k] as string).trim() : typeof ex[k] === "number" ? String(ex[k]) : "");
  const sd = splitDate(data.date);
  const guest = useGuestName();
  return useMemo(() => {
    const cw = calendarWords(lang);
    const exProgram = Array.isArray(ex.program) ? (ex.program as ProgramItem[]).filter((p) => p?.time && p?.title) : [];
    const raw = (data.photos ?? []) as (string | null | undefined)[];
    const date = sd ? new Date(`${sd.iso}T12:00:00Z`) : null;
    // korporativ: personA — tadbir nomi, personB — kompaniya (namunadagi nomlar tarjima qilinadi, mijozniki — yo‘q)
    const event = ((demo ? t(data.personA) : data.personA) || "").trim();
    const org = ((demo ? t(data.personB ?? "") : data.personB) || "").trim();
    const year = newYearOf(date);
    const time = sd?.time ?? "";
    const m = date ? date.getUTCMonth() : 0;
    const day = date ? date.getUTCDate() : 0;
    const wd = date ? cw.weekday[date.getUTCDay()] : "";
    // «26-dekabr» / «26 декабря» / «26 December»
    const dayMonth = date ? (lang === "uz" ? `${day}-${cw.monthsAfterDay[m]}` : `${day} ${cw.monthsAfterDay[m]}`) : "";
    // hero: «26-dekabr, shanba · 16:00» / «26 декабря, суббота · 16:00» / «Saturday, 26 December · 16:00»
    const heroDay = date ? (lang === "en" ? `${wd}, ${dayMonth}` : `${dayMonth}, ${wd.toLocaleLowerCase(lang)}`) : "";
    const program = (demo ? DEMO.program : exProgram.length ? exProgram : ((data.program ?? []) as ProgramItem[])).slice(0, 8);
    const msgRaw = (demo ? "" : data.message || "").trim();
    const custom =
      msgRaw && !isServerDefault(msgRaw)
        ? msgRaw.replace(/^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Muhtaram mehmonlar!|Hurmatli mehmonlar!|Hurmatli hamkasblar!|Qadrli hamkasblar!|Aziz hamkasblar!|Hurmatli hamkorlar!|Дорогие гости!|Уважаемые гости!|Дорогие коллеги!|Уважаемые коллеги!|Dear guests!|Dear colleagues!)\s*/, "").trim()
        : "";
    const venueTitle = ((demo ? t(data.venueName) : data.venueName) || "").trim();
    const address = ((demo ? DEMO.address : data.address) || "").trim();
    const coords = coordsFrom(data.mapUrl);
    // javob muddati — namunada sanadan 6 kun oldin (Figma: «20-dekabrgacha» — 26-dekabr uchun)
    const deadline = demo && date ? isoOf(new Date(date.getTime() - 6 * DAY_MS)) : data.rsvpDeadline;
    const code = str("dressCode") || (demo ? DEMO.dressCode : "");
    const dressNote = str("dressNote") || (DRESS_TEXT[code] ? t(DRESS_TEXT[code]) : "");
    const giftLimit = demo ? DEMO.giftLimit : str("giftLimit");
    const giftNote = str("giftNote") || (demo || giftLimit ? t(GIFT_NOTE) : "");
    // Suratlar (PHOTO_SLOTS.archa): 0 — jamoa surati (hero), 1–3 — «Jamoamiz bilan bir yil», 4 — «Manzil».
    // Bo‘sh slot: hero — to‘q ko‘k panelda yil, archa shoxi va sovg‘alar; galereya — bo‘lim yo‘qoladi; manzil — shablonning bazm zali
    const slot = (i: number) => (demo ? "" : (raw[i] as string) || "");
    const gallery = demo ? [`${P}/galereya1.webp`, `${P}/galereya2.webp`, `${P}/galereya3.webp`] : [slot(1), slot(2), slot(3)].filter(Boolean);
    return {
      event,
      org,
      year,
      /** «Nova Tech jamoasi» (ochilish va final) */
      team: org ? t("{org} jamoasi", { org }) : "",
      heroLine: [heroDay, time].filter(Boolean).join(" · "),
      tagline: str("tagline") || (org ? t("{org} jamoasi uchun yil yakunidagi jamoaviy bayram", { org }) : t("Yil yakunidagi jamoaviy bayram")),
      message: custom || t(MSG, { year }),
      sign: str("sign") || (org ? t("{org} rahbariyati", { org }) : ""),
      dateLine: [dayMonth, time ? t("soat {time}", { time }) : ""].filter(Boolean).join(" · "),
      time,
      hasDate: !!date,
      iso: sd?.iso ?? "",
      target: data.date ? tashkentDate(data.date).getTime() : null,
      guest,
      venueTitle,
      address,
      hasPlace: !!(venueTitle || address || data.mapUrl),
      mapUrl: data.mapUrl || (coords ? `https://yandex.uz/maps/?pt=${coords.lon},${coords.lat}&z=16` : `https://yandex.uz/maps/?text=${encodeURIComponent([venueTitle, address].filter(Boolean).join(", "))}`),
      taxi: coords
        ? `https://3.redirect.appmetrica.yandex.com/route?end-lat=${coords.lat}&end-lon=${coords.lon}&appmetrica_tracking_id=1178268795219780156`
        : `https://yandex.uz/maps/?rtext=~${encodeURIComponent([address, venueTitle].filter(Boolean).join(", "))}&rtt=taxi`,
      program,
      gallery,
      giftLimit,
      giftNote,
      dressTitle: DRESS_TEXT[code] || str("dressCode") ? t(code) : "",
      dressNote,
      photo: demo ? `${P}/jamoa.webp` : slot(0),
      hall: slot(4) || `${P}/zal.webp`,
      rsvpUntil: untilPhrase(deadline, lang),
      calTitle: [event || t("Yangi yil bazmi"), org].filter(Boolean).join(" — "),
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

/** Yon bezaklar parallaksi (Figma Motion 7 — 0.8x): `data-px` — ekran markazidan masofaga qarab ±`data-pm` px (faqat translate) */
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
        if (r.bottom < -300 || r.top > vh + 300) return;
        const dist = r.top + r.height / 2 - vh / 2;
        const k = +(x.dataset.pk || 0.08);
        const mx = +(x.dataset.pm || 28);
        x.style.setProperty("--py", `${Math.max(-mx, Math.min(mx, dist * -k)).toFixed(1)}px`);
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

/** Uzun matn bir qatorga sig‘masa — shrift kichrayadi (kesilmaydi, toshmaydi) */
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

/**
 * Qutiga (w × h) sig‘adigan ko‘p qatorli sarlavha: odatdagidek qatorlarga bo‘linadi (Figma: «Yangi yil / bazmi»), qutiga
 * sig‘masa — shrift kichrayadi (base → min). Matn qutining o‘rtasida (bir qatorli matn ham joyni o‘zgartirmaydi); `auto` — quti
 * balandligi matnga teng (h — eng ko‘pi).
 */
function FitBox({ text, base, min, w, h, lh, auto, className, style }: { text: string; base: number; min: number; w: number; h: number; lh: number; auto?: boolean; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null);
  useIso(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      let size = base;
      el.style.fontSize = U(size);
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (!px) return;
      const u = px / base;
      for (let i = 0; i < 40 && size > min && (el.scrollHeight > h * u + 1 || el.scrollWidth > w * u + 1); i++) {
        size = Math.max(min, size * 0.94);
        el.style.fontSize = U(+size.toFixed(2));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (el.parentElement) ro.observe(el.parentElement);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [text, base, min, w, h]);
  return (
    <span className={cx("mx-auto flex items-center justify-center text-center", className)} style={{ width: U(w), height: auto ? undefined : U(h), ...style }}>
      <span ref={ref} className="block" style={{ width: "100%", maxHeight: U(h), lineHeight: lh, overflowWrap: "anywhere" }}>
        {text}
      </span>
    </span>
  );
}

/* ═════════════ Bezaklar (Figma «Archa / Shar (vektor)», «Qor uchqun», «Qatlam · Archa shoxi», «Qatlam · Sovg‘a qutilari») ═════════════ */

/**
 * Osilgan shar: quti yuqori cheti — ip boshi (y = `top`), ip uzunligi `thread`, shar (eni `w`) ip oxiridan 2 birlik yuqorida boshlanadi
 * (Figma: ip 0…150, shar 148…). Quti pastida 30 birlik zaxira — prujina oshib ketganda ham shar kesilmaydi.
 */
function Ball({
  rang,
  x,
  top,
  thread,
  w,
  unit = U,
  tw = 1.5,
  a = "drop",
  d = 0,
  className,
  style,
}: {
  rang: Rang;
  x: number;
  top: number;
  thread: number;
  w: number;
  unit?: (n: number) => string;
  tw?: number;
  a?: string;
  d?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const h = w * BALL_K;
  return (
    <div
      aria-hidden
      data-a={a || undefined}
      className={cx(st.ball, className)}
      style={vars({ left: unit(x), top: unit(top), width: unit(w), height: unit(thread - 2 + h + 30), "--d": `${d}s`, ...(style as Record<string, string>) })}
    >
      <BallBody rang={rang} h={h} tw={tw} unit={unit} />
    </div>
  );
}
function BallBody({ rang, h, tw, unit, extra = 40, pad = 30 }: { rang: Rang; h: number; tw: number; unit: (n: number) => string; extra?: number; pad?: number }) {
  return (
    <div className={st.ballIn} style={{ top: unit(-extra), bottom: unit(pad) }}>
      <span className={st.thread} style={{ width: unit(tw) }} />
      <span className={st.ballImg} style={{ height: unit(h), marginTop: unit(-2) }}>
        <Img src={`${P}/shar-${rang}.svg`} eager />
      </span>
    </div>
  );
}

/** Qor uchquni (oq, 55%) — yonib chiqadi, yengil parallaks */
function Snow({ x, y, s, unit = U, d = 0 }: { x: number; y: number; s: number; unit?: (n: number) => string; d?: number }) {
  return (
    <div aria-hidden data-a="snow" className={st.deco} style={vars({ left: unit(x), top: unit(y), width: unit(s), height: unit(s), "--d": `${d}s` })}>
      <div className={st.px} data-px="" data-pk="0.05" data-pm="18">
        <Img src={`${P}/qor.svg`} className={st.snowImg} />
      </div>
    </div>
  );
}

/**
 * Rasm bezagi (archa shoxi / sovg‘a qutilari). Burilgan bo‘lsa — Figma qutisining markazi (cx, cy) va burilmagan o‘lcham (w × h),
 * `rot` — soat mili bo‘yicha (CSS). Burilmagan — chap yuqori burchak (x, y).
 */
function Pic({
  kind,
  x,
  y,
  w,
  h,
  rot = 0,
  center,
  unit = U,
  a,
  d = 0,
  px,
  className,
  style,
}: {
  kind: "shox" | "sovga";
  x: number;
  y: number;
  w: number;
  h: number;
  rot?: number;
  center?: boolean;
  unit?: (n: number) => string;
  a?: string;
  d?: number;
  px?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const left = center ? x - w / 2 : x;
  const top = center ? y - h / 2 : y;
  return (
    <div aria-hidden data-a={a} className={cx(st.deco, className)} style={vars({ left: unit(left), top: unit(top), width: unit(w), height: unit(h), "--d": `${d}s`, ...(style as Record<string, string>) })}>
      <div className={st.px} {...(px ? { "data-px": "", "data-pk": "0.08", "data-pm": "28" } : {})}>
        <div className={st.rot} style={{ transform: rot ? `rotate(${rot}deg)` : undefined }}>
          <Img src={`${P}/${kind}.webp`} />
        </div>
      </div>
    </div>
  );
}

/** Laptop yon bezaklari (1440 kanvas, bo‘lim tepasidan) */
function Side({ wide, children }: { wide: boolean; children: ReactNode }) {
  if (!wide) return null;
  return (
    <div aria-hidden className={st.side}>
      {children}
    </div>
  );
}

/* ═════════════ 00 · Ochilish — sharlar tushadi (faqat scroll bilan, --o: 0…1) ═════════════
 * Yuklanganda (bosishsiz; Figma «Motion — 29 · Archa», 1): uchta shar ipda yuqoridan tushib keladi (prujina, 150 ms navbat) va
 * to‘xtaydi — tebranmaydi; «2027» harflari pastdan navbatma-navbat ko‘tariladi, tadbir nomi va jamoa chiqadi, qor uchqunlari yonadi,
 * fonda juda yengil qor yog‘adi (loop; reduced-motion — yo‘q). Oxirgi holat = Figma 00 kadri.
 * Scroll (rAF lerp, 0.8 ekran): sharlar turli tezlikda ipda yuqoriga tortib olinadi (0…1), qor uchqunlari turli tezlikda pastga tushadi,
 * «2027» harflari to‘lqin bo‘lib (har biri o‘z tezligida) ko‘tariladi, nom va jamoa yuqoriga suriladi. So‘ng sahna odatdagidek yuqoriga ketadi va ostidan hero (01)
 * chiqadi: hero’dagi shar ipining yuqori qismi (Figma: −150…0) sahna pastida sahifa birligida chiziladi — chok aynan ulanadi.
 * Hech narsa yarim shaffof fon orqasidan ko‘rinmaydi («sharpa» yo‘q). */
const GATE = {
  m: { W: 390, H: 844, S: 1, OX: 0 },
  l: { W: 1440, H: 1013, S: 1.2, OX: 486 },
} as const;
/** [rang, x, ip uzunligi, eni, tortib olish oynasi a…b, kechikish] — ustun koordinatalari */
const G_BALLS: [Rang, number, number, number, number, number, number][] = [
  ["qizil", 47, 150, 62, 0, 0.8, 0.2],
  ["kumush", 147, 230, 96, 0.16, 1, 0.35],
  ["muz", 283, 110, 58, 0.06, 0.88, 0.5],
];
/** laptop yon sharlari — kanvas koordinatalari (Figma 00 «Yon bezak · osilgan shar») */
const G_SIDE_BALLS: [Rang, number, number, number, number, number, number][] = [
  ["qizil", 152, 320, 96, 0.1, 0.92, 0.28],
  ["muz", 295, 190, 70, 0, 0.78, 0.42],
  ["kumush", 1062, 260, 116, 0.06, 0.86, 0.32],
  ["qizil", 1224, 150, 72, 0.18, 1, 0.46],
];
/** [x, y, o‘lcham, scroll tezligi] — scrollda pastga tushadi (matn ustidan o‘tmaydigan tezlikda) */
const G_SNOW: [number, number, number, number][] = [
  [30, 90, 18, 1],
  [330, 140, 22, 1.2],
  [60, 560, 14, 0.8],
  [320, 600, 20, 0.7],
  [180, 760, 16, 0.5],
  [250, 70, 12, 0.9],
  [20, 330, 12, 0.25],
];
const G_SIDE_SNOW: [number, number, number, number][] = [
  [90, 560, 24, 0.8],
  [400, 700, 18, 1.1],
  [1050, 600, 26, 0.7],
  [1330, 420, 18, 1],
  [150, 860, 16, 0.6],
  [1240, 880, 20, 0.5],
];
/** yog‘ayotgan qor zarralari: [chap %, o‘lcham px, davomiylik s, kechikish s, yon siljish px] */
const FALL: [number, number, number, number, number][] = [
  [4, 3, 15, -2, 14],
  [11, 2, 19, -9, -10],
  [19, 4, 13, -5, 8],
  [27, 2, 17, -12, 12],
  [35, 3, 21, -3, -14],
  [43, 2, 14, -8, 6],
  [51, 4, 18, -14, -8],
  [59, 2, 16, -1, 16],
  [66, 3, 20, -10, -12],
  [73, 2, 13, -6, 10],
  [80, 4, 17, -13, -6],
  [87, 2, 15, -4, 12],
  [94, 3, 19, -11, -10],
  [8, 2, 22, -16, 6],
  [48, 2, 23, -18, -6],
  [90, 2, 21, -7, 8],
];

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
  // ustun koordinatalari (mobil 390) → sahna; laptopda × 1.2 + 486. XC/YC — kanvas koordinatalari (laptop yon bezaklari)
  const X = (x: number) => `calc(50% + ${U(OX + S * x - W / 2)})`;
  const Y = (y: number) => `calc(100% - ${U(H - S * y)})`;
  const Z = (n: number) => U(S * n);
  const XC = (x: number) => `calc(50% + ${U(x - W / 2)})`;
  const YC = (y: number) => `calc(100% - ${U(H - y)})`;
  const year = String(d.year);
  // shar: quti — sahna tepasidan (baland ekranda ip ham tepagacha davom etadi) shar ostigacha (+30 zaxira)
  const ball = (b: (typeof G_BALLS)[number], i: number, canvas: boolean) => {
    const [rang, x, th, w, a0, a1, dl] = b;
    const k = canvas ? 1 : S;
    const h = w * BALL_K;
    const yy = canvas ? YC : Y;
    return (
      <div
        key={`${canvas ? "c" : "b"}${i}`}
        aria-hidden
        className={cx(st.ball, st.gBall)}
        style={vars({ left: canvas ? XC(x) : X(x), top: 0, width: U(k * w), height: `calc(${yy(th - 2 + h)} + ${U(30 * k)})`, "--a": a0, "--b": a1, "--gd": `${dl}s` })}
      >
        <BallBody rang={rang} h={k * h} tw={k * 1.5} unit={U} extra={0} pad={30 * k} />
      </div>
    );
  };
  return (
    <div ref={wrap} className={cx(st.gateWrap, still && st.still)} style={vars(still ? { "--u": pageU, "--o": 0, height: U(H), marginBottom: 0 } : { "--u": `min(${pageU}, calc(100svh / ${H}))` })}>
      <div className={st.gate} aria-label={t("Taklifnoma")} style={still ? { position: "relative", height: "100%" } : undefined}>
        <div aria-hidden className={st.fall}>
          {FALL.map(([l, s, du, dl, fx], i) => (
            <span key={i} className={st.flake} style={vars({ left: `${l}%`, width: s, height: s, "--fd": `${du}s`, "--fdl": `${dl}s`, "--fx": `${fx}px` })} />
          ))}
        </div>
        {G_SNOW.map(([x, y, s, k], i) => (
          <div key={`s${i}`} aria-hidden className={cx(st.deco, st.gSnow)} style={vars({ left: X(x), top: Y(y), width: Z(s), height: Z(s), "--k": k, "--gd": `${0.3 + i * 0.12}s` })}>
            <Img src={`${P}/qor.svg`} className={st.snowImg} eager />
          </div>
        ))}
        {wide &&
          G_SIDE_SNOW.map(([x, y, s, k], i) => (
            <div key={`c${i}`} aria-hidden className={cx(st.deco, st.gSnow)} style={vars({ left: XC(x), top: YC(y), width: U(s), height: U(s), "--k": k, "--gd": `${0.4 + i * 0.12}s` })}>
              <Img src={`${P}/qor.svg`} className={st.snowImg} eager />
            </div>
          ))}
        {wide && G_SIDE_BALLS.map((b, i) => ball(b, i, true))}
        {G_BALLS.map((b, i) => ball(b, i, false))}
        {/* «2027» (Dela Gothic One 104, oq) */}
        <div className={st.gIn} style={{ left: X(22), top: Y(410), width: Z(346), height: Z(151) }}>
          <p className={cx(st.dg, st.gYear)} style={{ height: "100%", fontSize: Z(104), lineHeight: `${Z(151)}`, color: "#fff" }}>
            {Array.from(year).map((ch, i) => (
              <span key={i} className={st.gLetterW} style={vars({ "--lk": [1, 3, 0, 2][i % 4] })}>
                <span className={st.gYearClip}>
                  <span className={st.gLetter} style={vars({ "--gd": `${0.75 + i * 0.09}s` })}>
                    {ch}
                  </span>
                </span>
              </span>
            ))}
          </p>
        </div>
        {/* tadbir nomi (Onest SemiBold 26) va jamoa (Onest Medium 18, kumush) */}
        <div className={cx(st.gIn, st.gText)} style={{ left: X(24), top: Y(590), width: Z(342) }}>
          {d.event && (
            <p className={cx(st.o6, st.gInA, "text-center")} style={vars({ fontSize: Z(26), lineHeight: `${Z(33)}`, color: "#fff", "--gd": "1.15s" })}>
              <GateTitle text={d.event} S={S} />
            </p>
          )}
          {d.team && (
            <div className={cx(st.o5, st.gInA)} style={vars({ marginTop: Z(d.event ? 9 : 0), color: SILVER, "--gd": "1.3s" })}>
              <FitBox text={d.team} base={18 * S} min={14 * S} w={342 * S} h={46 * S} lh={23 / 18} auto />
            </div>
          )}
        </div>
        {/* hero (01) chok sharining ipi: Figma −150…0 — sahna pastida, sahifa ustuni birligida (hero bilan aynan ulanadi) */}
        <span aria-hidden className="absolute" style={{ left: `calc(50% + ${PU(319.25 - 195)})`, top: `calc(100% - ${PU(150)})`, width: PU(1.5), height: PU(150), background: "var(--thread)" }} />
      </div>
    </div>
  );
}
/** Ochilishdagi tadbir nomi: bir qatorga sig‘masa (0.75 dan kichrayib ketsa) — ikki qator (kerak bo‘lsa kichrayadi) */
function GateTitle({ text, S }: { text: string; S: number }) {
  const probe = useRef<HTMLSpanElement>(null);
  const [two, setTwo] = useState(false);
  useIso(() => {
    const el = probe.current;
    if (!el) return;
    const measure = () => {
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (!px) return;
      setTwo(((px / (26 * S)) * 342 * S) / Math.max(1, el.offsetWidth) < 0.75 && /\s/.test(text.trim()));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (el.parentElement) ro.observe(el.parentElement);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [text, S]);
  return (
    <>
      <span ref={probe} aria-hidden className="pointer-events-none absolute whitespace-nowrap" style={{ visibility: "hidden", fontSize: U(26 * S), left: 0, top: 0 }}>
        {text}
      </span>
      {two ? (
        // ikki qator — 250 birlik enida (o‘ngdagi qor uchquniga tegmaydi), sig‘masa kichrayadi
        <FitBox text={text} base={22 * S} min={14 * S} w={250 * S} h={56 * S} lh={28 / 22} auto />
      ) : (
        <Fit base={26 * S} max={342 * S} deps={text}>
          {text}
        </Fit>
      )}
    </>
  );
}

/* ═════════════ Bo‘lim qobig‘i ═════════════ */
type Bg = "white" | "navy" | "red";
/** Bo‘lim: to‘liq enli fon + markazda kontent ustuni (mobil 390 birlik; laptopda × 1.2). `outer` — ustundan tashqaridagi (laptop kanvasi)
 * bezaklar; `seam` — ustun koordinatalaridagi, oldingi bo‘limga kirib turadigan bezaklar; `tail` — keyingi bo‘lim chok bezagi uchun joy */
function Sec({
  children,
  z,
  bg,
  colStyle,
  id,
  outer,
  seam,
  className,
  secRef,
  style,
  tail = 0,
}: {
  children: ReactNode;
  z: number;
  bg: Bg;
  colStyle?: CSSProperties;
  id?: string;
  outer?: ReactNode;
  seam?: ReactNode;
  className?: string;
  secRef?: React.Ref<HTMLElement>;
  style?: CSSProperties;
  tail?: number;
}) {
  return (
    <section ref={secRef} id={id} className={cx(st.sec, st[bg], className)} style={{ zIndex: z, ...style }}>
      {outer}
      {seam && (
        <div className={st.seamLayer} style={{ width: U(390) }}>
          {seam}
        </div>
      )}
      <div className={st.col} style={{ width: U(390), ...colStyle }}>
        {children}
      </div>
      {tail > 0 && <div aria-hidden style={{ height: U(tail) }} />}
    </section>
  );
}

/** Bo‘lim sarlavhasi (Dela Gothic One, markazda, bir qator — 360 da sig‘adi) */
function Title({ text, size = 36, color = NAVY, d = 0, style }: { text: string; size?: number; color?: string; d?: number; style?: CSSProperties }) {
  const h = Math.round(size * LH_D);
  return (
    <h2
      data-a="up"
      className={cx(st.dg, "m-0 text-center")}
      style={vars({ height: U(h), fontSize: U(size), lineHeight: `${U(h)}`, color, whiteSpace: "nowrap", "--d": `${d}s`, ...(style as Record<string, string>) })}
    >
      <Fit base={size} max={342} deps={text}>
        {text}
      </Fit>
    </h2>
  );
}

/* ═════════════ 01 · Hero — jamoa surati (0.92 → 1), «Yangi yil bazmi», sana, qisqa izoh; chok ustida qizil shar ═════════════
 * Laptop: chapda archa shoxi (−10°), o‘ngda sovg‘a qutilari */
function Hero({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  return (
    <Sec
      z={z}
      bg="white"
      colStyle={{ paddingTop: U(90), paddingBottom: U(196) }}
      seam={<Ball rang="qizil" x={285} top={0} thread={40} w={70} d={0.1} />}
      outer={
        <Side wide={wide}>
          <Pic kind="shox" x={240} y={760} w={420} h={280} rot={-10} center unit={C} a="shox" px />
          <Pic kind="sovga" x={1050} y={670} w={300} h={300} unit={C} a="bounce" d={0.15} px />
        </Side>
      }
    >
      <div data-a="photo" className={cx(st.photo, "mx-auto")} style={{ width: U(342), height: U(430), borderRadius: U(28) }}>
        {d.photo ? (
          <Img src={d.photo} eager className={st.photoImg} />
        ) : (
          // surat yo‘q — to‘q ko‘k panelda archa shoxi, yil va sovg‘alar (shablonning o‘z bezaklari)
          <div className={st.ph}>
            <Pic kind="shox" x={56} y={46} w={230} h={153} />
            <p className={cx(st.dg, st.phYear)} style={{ top: U(178), height: U(110), fontSize: U(76), lineHeight: `${U(110)}` }}>
              {d.year}
            </p>
            <Pic kind="sovga" x={81} y={250} w={180} h={180} />
          </div>
        )}
      </div>
      <div data-a="up" className={st.dg} style={vars({ marginTop: U(50), color: NAVY, "--d": "0.1s" })}>
        <FitBox text={d.event || " "} base={48} min={26} w={342} h={100.8} lh={1.05} />
      </div>
      {d.heroLine && (
        <p data-a="up" className={cx(st.o6, "text-center")} style={vars({ marginTop: U(39.2), height: U(24), fontSize: U(19), lineHeight: `${U(24)}`, color: RED, whiteSpace: "nowrap", "--d": "0.18s" })}>
          <Fit base={19} max={342} deps={d.heroLine}>
            {d.heroLine}
          </Fit>
        </p>
      )}
      {d.tagline && (
        <p
          data-a="up"
          className={cx(st.o4, st.clamp3, "mx-auto text-center")}
          style={vars({ marginTop: U(18), width: U(310), minHeight: U(52), fontSize: U(17), lineHeight: `${U(25.5)}`, color: MUTED, "--d": "0.26s" })}
        >
          {d.tagline}
        </p>
      )}
    </Sec>
  );
}

/* ═════════════ 02 · Taklif — murojaat (maxsus mehmon ismi bilan), taklif matni, imzo («Nova Tech rahbariyati») ═════════════ */
function Taklif({ d, z, wide, tail }: { d: D; z: number; wide: boolean; tail: number }) {
  const t = useT();
  const hello = d.guest ? guestHello(t, "Hurmatli {guest}!", d.guest) : t("Hurmatli hamkasblar!");
  return (
    <Sec
      z={z}
      bg="navy"
      tail={tail}
      colStyle={{ paddingTop: U(110), paddingBottom: U(247) }}
      outer={
        <Side wide={wide}>
          <Snow x={140} y={140} s={26} unit={C} />
          <Snow x={300} y={520} s={18} unit={C} d={0.1} />
          <Snow x={1100} y={180} s={22} unit={C} d={0.15} />
          <Snow x={1300} y={600} s={26} unit={C} d={0.2} />
          <Pic kind="shox" x={1210} y={420} w={400} h={266.7} rot={12} center unit={C} a="shox" d={0.1} px />
        </Side>
      }
    >
      <Snow x={34} y={60} s={16} />
      <Snow x={330} y={110} s={20} d={0.1} />
      <Snow x={300} y={560} s={14} d={0.2} />
      <h2 data-a="up" className={cx(st.dg, "relative m-0")} style={vars({ color: "#fff", "--d": "0.05s" })}>
        {/* eni 270 — o‘ngdagi qor uchquni (330, 110) ga uzun ism ham tegmaydi (Figma: «hamkasblar!» 266) */}
        <FitBox text={hello} base={36} min={20} w={270} h={80} lh={1.1} />
      </h2>
      <p
        data-a="up"
        className={cx(st.o4, "relative mx-auto text-center")}
        style={vars({
          marginTop: U(50),
          width: U(330),
          minHeight: U(116),
          fontSize: U(18),
          lineHeight: `${U(28.8)}`,
          color: "rgba(255,255,255,.9)",
          overflowWrap: "anywhere",
          whiteSpace: "pre-line",
          "--d": "0.12s",
        })}
      >
        {d.message}
      </p>
      {d.sign && (
        <p
          data-a="up"
          className={cx(st.o6, "relative mx-auto text-center")}
          style={vars({ marginTop: U(94), width: U(342), minHeight: U(23), fontSize: U(18), lineHeight: `${U(23)}`, color: SILVER, overflowWrap: "anywhere", "--d": "0.2s" })}
        >
          {d.sign}
        </p>
      )}
    </Sec>
  );
}

/* ═════════════ 03 · Kun dasturi — vertikal chiziq scroll bilan pastga chiziladi; nuqta yetib kelganda qator chapdan kiradi ═════════════
 * Chok ustida sovg‘a qutilari (sakrab chiqadi). Laptop: chapda sovg‘alar, o‘ngda archa shoxi (+10°) */
function Program({ d, z, wide, still, tail }: { d: D; z: number; wide: boolean; still: boolean; tail: number }) {
  const t = useT();
  const items = d.program;
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const rows = Array.from(el.querySelectorAll<HTMLElement>("[data-row]"));
    const line = el.querySelector<HTMLElement>("[data-line]");
    if (!rows.length || !line) return;
    const size = () => {
      const last = rows[rows.length - 1];
      line.style.height = `${Math.max(0, last.offsetTop)}px`;
    };
    const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still || reduce) {
      size();
      rows.forEach((r) => r.setAttribute("data-in", ""));
      el.style.setProperty("--lp", "1");
      const ro = new ResizeObserver(size);
      ro.observe(el);
      return () => ro.disconnect();
    }
    let raf = 0;
    const tick = () => {
      raf = 0;
      size();
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const dot = line.offsetTop;
      const L = Math.max(1, rows[rows.length - 1].offsetTop);
      const atEnd = window.scrollY + vh >= document.documentElement.scrollHeight - 4;
      // chiziq uchi — ekranning 82% balandligida
      const reach = vh * 0.82 - r.top - dot;
      el.style.setProperty("--lp", (atEnd ? 1 : clamp01(reach / L)).toFixed(4));
      rows.forEach((row) => {
        if (atEnd || row.offsetTop <= reach + 1) row.setAttribute("data-in", "");
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
  }, [still, items.length]);
  if (!items.length) return null;
  return (
    <Sec
      z={z}
      bg="white"
      tail={tail}
      colStyle={{ paddingTop: U(140), paddingBottom: U(100) }}
      seam={<Pic kind="sovga" x={110} y={-85} w={170} h={170} a="bounce" />}
      outer={
        <Side wide={wide}>
          <Pic kind="sovga" x={90} y={490} w={300} h={300} unit={C} a="bounce" px />
          <Pic kind="shox" x={1200} y={300} w={400} h={266.7} rot={10} center unit={C} a="shox" d={0.1} px />
        </Side>
      }
    >
      <Title text={t("Kun dasturi")} />
      <div ref={list} className={st.pList} style={{ marginTop: U(30) }}>
        <span data-line="" aria-hidden className={st.pLine} style={{ left: U(59), top: U(14), width: U(2) }} />
        {items.map((it, i) => (
          <div key={i} data-row="" className={st.pRow} style={{ paddingLeft: U(92), paddingRight: U(28), paddingBottom: i < items.length - 1 ? U(42) : 0 }}>
            <span aria-hidden className={st.pDot} style={{ left: U(50), top: U(4), width: U(20), height: U(20), border: `${U(4)} solid #fff`, background: i % 2 ? NAVY : RED }} />
            <div className={st.pText} style={vars({ transitionDelay: "0.05s" })}>
              <p className={cx(st.dg, st.ptime)} style={{ height: U(34), fontSize: U(24), lineHeight: `${U(35)}` }}>
                <Fit base={24} max={270} deps={it.time}>
                  {it.time}
                </Fit>
              </p>
              <p className={cx(st.o6, st.clamp2)} style={{ fontSize: U(19), lineHeight: `${U(24)}`, color: INK }}>
                {it.title}
              </p>
              {it.note && (
                <p className={cx(st.o4, st.clamp2)} style={{ marginTop: U(4), fontSize: U(16), lineHeight: `${U(20)}`, color: MUTED }}>
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

/* ═════════════ 04 · Jamoamiz bilan bir yil — galereya: suratlar pastdan 40px ko‘tarilib maska bilan ochiladi (120 ms stagger).
 * Suratlar bo‘lmasa — bo‘lim yo‘qoladi; 1 ta — katta; 2 ta — ikkita tik; 3 ta — Figma ═════════════ */
function Gallery({ d, z, wide, tail }: { d: D; z: number; wide: boolean; tail: number }) {
  const t = useT();
  const list = d.gallery;
  if (!list.length) return null;
  const big = list.length !== 2 ? list[0] : null;
  const small = list.length === 2 ? list : list.slice(1);
  const photo = (src: string, w: number, h: number, i: number, tall?: boolean) => (
    <div data-a="gal" className={st.gal} style={vars({ width: U(w), height: U(h), borderRadius: U(24), "--d": `${0.08 + i * 0.12}s` })}>
      <Img src={src} className={cx(st.galImg, tall && st.galImgW)} />
    </div>
  );
  return (
    <Sec
      z={z}
      bg="navy"
      tail={tail}
      colStyle={{ paddingTop: U(110), paddingBottom: U(122) }}
      seam={<Ball rang="kumush" x={42} top={-90} thread={140} w={56} />}
      outer={
        <Side wide={wide}>
          <Ball rang="qizil" x={198} top={0} thread={240} w={84} unit={C} d={0.05} />
          <Ball rang="muz" x={1142} top={0} thread={340} w={96} unit={C} d={0.2} />
          <Snow x={110} y={600} s={24} unit={C} />
          <Snow x={1280} y={760} s={20} unit={C} d={0.1} />
          <Snow x={360} y={860} s={16} unit={C} d={0.2} />
        </Side>
      }
    >
      <Snow x={330} y={60} s={18} />
      <Snow x={24} y={770} s={14} d={0.1} />
      <Snow x={340} y={790} s={20} d={0.2} />
      <h2 data-a="up" className={cx(st.dg, "relative m-0")} style={vars({ color: "#fff", "--d": "0.05s" })}>
        <FitBox text={t("Jamoamiz bilan bir yil")} base={34} min={22} w={342} h={74.8} lh={1.1} />
      </h2>
      <div className="relative mx-auto" style={{ marginTop: U(45.2), width: U(342) }}>
        {big && photo(big, 342, 256, 0)}
        {small.length > 0 && (
          <div className="flex" style={{ marginTop: big ? U(16) : 0, gap: U(10) }}>
            {small.map((s, i) => (
              <div key={i}>{photo(s, 166, 236, i + 1, true)}</div>
            ))}
          </div>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 05 · Bazmgacha — taymer: plitkalar varaqlanib chiqadi, raqamlar har soniyada almashadi; kalendarga qo‘shish ═════════════ */
/**
 * Raqamlar doim 2 xonali («06»). Sanoq tugagach o‘zgargan raqam yuqoridan varaqlanadi (rotateX −70° → 0, shaffofliksiz):
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

function Timer({ d, z, wide, tail }: { d: D; z: number; wide: boolean; tail: number }) {
  const t = useT();
  const units = timerUnits(useLocale());
  const c = useCountdown(d.target);
  const [ref, inView] = useInView<HTMLDivElement>(0.3, true);
  if (!d.hasDate || !c) return null;
  const vals = [c.d, c.h, c.m, c.s];
  return (
    <Sec
      z={z}
      bg="white"
      tail={tail}
      colStyle={{ height: U(600) }}
      outer={
        <Side wide={wide}>
          <Pic kind="shox" x={220} y={320.2} w={380} h={253.3} rot={-8} center unit={C} a="shox" px />
        </Side>
      }
    >
      <div className="absolute inset-x-0" style={{ top: U(100) }}>
        <Title text={t("Bazmgacha")} />
      </div>
      <div ref={ref} className="absolute flex" style={{ left: U(24), top: U(180), width: U(339), height: U(96), gap: U(9) }}>
        {vals.map((v, i) => (
          <div key={i} data-a="flip" className={st.tile} style={vars({ width: U(78), height: U(96), borderRadius: U(20), background: i === 0 ? RED : NAVY, "--d": `${0.1 + i * 0.12}s` })}>
            <p className={cx(st.dg, "absolute inset-x-0 text-center")} style={{ top: U(18), height: U(43), fontSize: U(30), lineHeight: `${U(43)}`, whiteSpace: "nowrap" }}>
              <Fit base={30} max={66} deps={String(vals[0]).length}>
                <Digits value={v} run={inView} len={i === 0 ? Math.max(2, String(vals[0]).length) : 2} i={i} />
              </Fit>
            </p>
            <p className={cx(st.o5, "absolute inset-x-0 text-center")} style={{ top: U(64), height: U(17), fontSize: U(13), lineHeight: `${U(17)}`, color: "rgba(255,255,255,.75)", whiteSpace: "nowrap" }}>
              <Fit base={13} max={70} deps={units[i]}>
                {units[i]}
              </Fit>
            </p>
          </div>
        ))}
      </div>
      {d.dateLine && (
        <p data-a="up" className={cx(st.o6, "absolute inset-x-0 text-center")} style={vars({ top: U(316), height: U(23), fontSize: U(18), lineHeight: `${U(23)}`, color: INK, whiteSpace: "nowrap", "--d": "0.25s" })}>
          <Fit base={18} max={342} deps={d.dateLine}>
            {d.dateLine}
          </Fit>
        </p>
      )}
      <div data-a="up" className="absolute inset-x-0 flex justify-center" style={vars({ top: U(366), "--d": "0.35s" })}>
        <button
          type="button"
          className={cx(st.o7, st.btn, st.btnNavy)}
          style={{ minWidth: U(250), maxWidth: U(342), height: U(56), padding: `0 ${U(22)}`, fontSize: U(16), borderRadius: U(28), border: 0 }}
          onClick={() =>
            downloadIcs({
              title: d.calTitle,
              startLocal: `${d.iso}T${d.time || "18:00"}`,
              location: [d.venueTitle, d.address].filter(Boolean).join(", "),
              slug: "archa",
            })
          }
        >
          <Fit base={16} max={298} deps={t("Kalendarga qo‘shish")}>
            {t("Kalendarga qo‘shish")}
          </Fit>
        </button>
      </div>
    </Sec>
  );
}

/* ═════════════ 06 · Sovg‘a almashinuvi (ixtiyoriy) — izoh va narx kartasi (scale-in); chok ustida muz rang shar.
 * Laptop: chapda sovg‘a qutilari (sakrab chiqadi), o‘ngda kumush shar ═════════════ */
function Gift({ d, z, wide, tail }: { d: D; z: number; wide: boolean; tail: number }) {
  const t = useT();
  if (!d.giftLimit && !d.giftNote) return null;
  return (
    <Sec
      z={z}
      bg="red"
      tail={tail}
      colStyle={{ paddingTop: U(110), paddingBottom: U(150) }}
      seam={<Ball rang="muz" x={290} top={-130} thread={180} w={60} />}
      outer={
        <Side wide={wide}>
          <Pic kind="sovga" x={70} y={360} w={320} h={320} unit={C} a="bounce" px />
          <Ball rang="kumush" x={1166} top={0} thread={230} w={88} unit={C} d={0.15} />
        </Side>
      }
    >
      <h2 data-a="up" className={cx(st.dg, "relative m-0")} style={vars({ color: "#fff", "--d": "0.05s" })}>
        <FitBox text={t("Sovg‘a almashinuvi")} base={36} min={22} w={342} h={80} lh={1.1} />
      </h2>
      {d.giftNote && (
        <p
          data-a="up"
          className={cx(st.o4, "relative mx-auto text-center")}
          style={vars({ marginTop: U(50), width: U(330), minHeight: U(87), fontSize: U(18), lineHeight: `${U(28.8)}`, color: "#fff", overflowWrap: "anywhere", whiteSpace: "pre-line", "--d": "0.12s" })}
        >
          {d.giftNote}
        </p>
      )}
      {d.giftLimit && (
        <div
          data-a="scale"
          className={cx(st.giftCard, "relative mx-auto flex flex-col items-center text-center")}
          style={vars({ marginTop: U(d.giftNote ? 73 : 50), width: U(342), minHeight: U(150), padding: `${U(36)} ${U(23)} ${U(45)}`, borderRadius: U(28), "--d": "0.2s" })}
        >
          <p className={st.o5} style={{ height: U(20), fontSize: U(16), lineHeight: `${U(20)}`, color: MUTED, whiteSpace: "nowrap" }}>
            <Fit base={16} max={296} deps={t("Sovg‘a narxi")}>
              {t("Sovg‘a narxi")}
            </Fit>
          </p>
          <div className={st.dg} style={{ marginTop: U(14), color: RED }}>
            <FitBox text={d.giftLimit} base={24} min={17} w={296} h={70} lh={35 / 24} auto />
          </div>
        </div>
      )}
    </Sec>
  );
}

/* ═════════════ 07 · Manzil — bazm zali surati (mijozning 5-surati; bo‘lmasa — shablonniki), joy nomi, manzil, xarita va yo‘nalish ═════════════ */
function Venue({ d, z, wide, linkable, tail }: { d: D; z: number; wide: boolean; linkable: boolean; tail: number }) {
  const t = useT();
  if (!d.hasPlace) return null;
  const btn = (s: string) => (
    <Fit base={16} max={140} deps={s}>
      {s}
    </Fit>
  );
  return (
    <Sec
      z={z}
      bg="navy"
      tail={tail}
      colStyle={{ paddingTop: U(130), paddingBottom: U(104) }}
      seam={<Pic kind="shox" x={80} y={-76.5} w={230} h={153} a="shox" />}
      outer={
        <Side wide={wide}>
          <Snow x={150} y={200} s={24} unit={C} />
          <Snow x={1260} y={240} s={22} unit={C} d={0.1} />
          <Snow x={1120} y={780} s={18} unit={C} d={0.2} />
          <Pic kind="shox" x={1210} y={620} w={400} h={266.7} rot={12} center unit={C} a="shox" d={0.1} px />
        </Side>
      }
    >
      <Title text={t("Manzil")} color="#fff" />
      <div data-a="zoom" className="relative mx-auto overflow-hidden" style={vars({ marginTop: U(24), width: U(342), height: U(228), borderRadius: U(24), background: "#070e24", "--d": "0.1s" })}>
        <Img src={d.hall} className={st.zoomImg} />
      </div>
      {d.venueTitle && (
        <p
          data-a="up"
          className={cx(st.o6, "mx-auto text-center")}
          style={vars({ marginTop: U(28), width: U(342), minHeight: U(31), fontSize: U(24), lineHeight: `${U(31)}`, color: "#fff", overflowWrap: "anywhere", textWrap: "balance", "--d": "0.15s" })}
        >
          {d.venueTitle}
        </p>
      )}
      {d.address && (
        <p
          data-a="up"
          className={cx(st.o4, "mx-auto text-center")}
          style={vars({ marginTop: U(13), width: U(330), minHeight: U(48), fontSize: U(16), lineHeight: `${U(24)}`, color: "rgba(255,255,255,.8)", overflowWrap: "anywhere", "--d": "0.22s" })}
        >
          {d.address}
        </p>
      )}
      <div data-a="up" className="relative mx-auto flex" style={vars({ marginTop: U(46), width: U(342), gap: U(12), "--d": "0.3s" })}>
        <a
          href={linkable ? d.mapUrl : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(st.o7, st.btn, st.btnWhite)}
          style={{ flex: "1 1 0", minWidth: 0, height: U(56), padding: `0 ${U(10)}`, fontSize: U(16), borderRadius: U(28) }}
        >
          {btn(t("Xaritada ochish"))}
        </a>
        <a
          href={linkable ? d.taxi : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(st.o7, st.btn, st.btnLine)}
          style={{ flex: "1 1 0", minWidth: 0, height: U(56), padding: `0 ${U(10)}`, fontSize: U(16), borderWidth: U(1.4), borderRadius: U(28) }}
        >
          {btn(t("Yo‘nalish"))}
        </a>
      </div>
    </Sec>
  );
}

/* ═════════════ 08 · Dress-kod (ixtiyoriy — o‘chirilsa joy qolmaydi): oq karta — turi (qizil, Dela Gothic One) va izoh ═════════════ */
function Dress({ d, z, tail }: { d: D; z: number; tail: number }) {
  if (!d.dressNote && !d.dressTitle) return null;
  return (
    <Sec z={z} bg="navy" tail={tail} colStyle={{ paddingTop: U(30), paddingBottom: U(91) }}>
      <div
        data-a="rise"
        className={cx(st.dressCard, "relative mx-auto flex flex-col items-center justify-center text-center")}
        style={{ width: U(342), minHeight: U(169), padding: `${U(32)} ${U(30)}`, gap: U(12), borderRadius: U(28) }}
      >
        {d.dressTitle && (
          <p className={st.dg} style={{ height: U(41), fontSize: U(28), lineHeight: `${U(41)}`, color: RED, whiteSpace: "nowrap" }}>
            <Fit base={28} max={282} deps={d.dressTitle}>
              {d.dressTitle}
            </Fit>
          </p>
        )}
        {d.dressNote && (
          <p className={st.o4} style={{ width: "100%", fontSize: U(17), lineHeight: 1.5, color: INK, overflowWrap: "anywhere" }}>
            {d.dressNote}
          </p>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 09 · Anketa — javob (Kelaman / Kela olmayman; kela olmasa — soni so‘ralmaydi, count 0) ═════════════ */
function Rsvp({ d, slug, mode, z, wide }: { d: D; slug: string; mode: InvitationSiteProps["mode"]; z: number; wide: boolean }) {
  const t = useT();
  const live = mode === "live";
  const [name, setName] = useState("");
  const [status, setStatus] = useState<RsvpStatus>("coming");
  const [count, setCount] = useState(1);
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
    <p className={cx(st.o6, st.lbl)} style={{ marginTop: U(mt), height: U(18), fontSize: U(14), lineHeight: `${U(18)}` }}>
      {s}
    </p>
  );
  const sub = d.rsvpUntil ? t("Iltimos, {date} javob bering", { date: d.rsvpUntil }) : t("Javobingizni kutamiz");
  return (
    <Sec
      z={z}
      bg="white"
      id="archa-javob"
      colStyle={{ paddingTop: U(110), paddingBottom: U(70) }}
      seam={<Ball rang="qizil" x={43} top={-40} thread={60} w={62} />}
      outer={
        <Side wide={wide}>
          <Ball rang="muz" x={1177} top={0} thread={280} w={86} unit={C} d={0.1} />
        </Side>
      }
    >
      <h2 data-a="up" className={cx(st.dg, "mx-auto text-center")} style={vars({ width: U(342), minHeight: U(55), fontSize: U(38), lineHeight: `${U(55)}`, color: NAVY, overflowWrap: "anywhere", "--d": "0.05s" })}>
        {t("Kelasizmi?")}
      </h2>
      <p data-a="up" className={cx(st.o4, "mx-auto text-center")} style={vars({ marginTop: U(5), width: U(342), minHeight: U(20), fontSize: U(16), lineHeight: `${U(20)}`, color: MUTED, overflowWrap: "anywhere", "--d": "0.12s" })}>
        {sub}
      </p>
      <div data-a="rise" className={cx(st.card, "relative mx-auto")} style={vars({ marginTop: U(30), width: U(342), padding: `${U(24)} ${U(22)} ${U(62)}`, borderRadius: U(28), "--d": "0.2s" })}>
        {sent ? (
          <div key="thanks" className={cx(st.thanks, "relative flex flex-col items-center text-center")} style={{ padding: `${U(30)} ${U(6)} ${U(10)}`, gap: U(16), minHeight: U(480) }}>
            <div className="relative" style={{ width: U(76), height: U(93) }}>
              <Img src={`${P}/shar-qizil.svg`} className={st.thanksBall} />
            </div>
            <p className={st.dg} style={{ fontSize: U(sent === "not_coming" ? 30 : 24), lineHeight: 1.3, color: NAVY, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Rahmat!") : t("Rahmat! Joyingiz band qilindi")}
            </p>
            <p className={st.o4} style={{ fontSize: U(17), color: MUTED, lineHeight: 1.5, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Javobingiz uchun rahmat!") : t("{name} — {count} kishi. Javobingiz yetkazildi.", { name: name.trim() || t("Javobingiz"), count })}
            </p>
            <button type="button" onClick={() => setSent(null)} className={st.o6} style={{ fontSize: U(16), color: NAVY, textDecoration: "underline", textUnderlineOffset: 3 }}>
              {t("Javobni o‘zgartirish")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="relative flex flex-col items-stretch">
            {label(t("Ismingiz"), 0)}
            <label className={st.field} style={{ marginTop: U(6), height: U(54), padding: `0 ${U(16)}`, borderRadius: U(16) }}>
              <input
                className={cx(st.o4, st.input)}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder={t("Ism va familiya")}
                aria-label={t("Ismingiz")}
                style={{ fontSize: U(17), lineHeight: `${U(22)}` }}
              />
            </label>
            {label(t("Kelasizmi?"), 22)}
            <div className="flex w-full" role="radiogroup" aria-label={t("Kelasizmi?")} style={{ marginTop: U(6), gap: U(8) }}>
              {(
                [
                  ["coming", "Kelaman"],
                  ["not_coming", "Kela olmayman"],
                ] as const
              ).map(([s, l]) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={status === s}
                  onClick={() => setStatus(s)}
                  className={cx(st.o7, st.choice)}
                  style={{ flex: "1 1 0", padding: `${U(4)} ${U(6)}`, minHeight: U(54), fontSize: U(16), borderWidth: U(1.4), borderRadius: U(27) }}
                >
                  <span style={{ overflowWrap: "anywhere" }}>{t(l)}</span>
                </button>
              ))}
            </div>
            {status === "coming" && (
              <>
                {label(t("Necha kishi bo‘lasiz?"), 22)}
                <div className={cx(st.counter, "justify-between")} style={{ marginTop: U(6), height: U(54), padding: `0 ${U(8)}`, borderRadius: U(27) }}>
                  <button
                    type="button"
                    className={cx(st.o7, st.step)}
                    disabled={count <= 1}
                    onClick={() => setCount((n) => Math.max(1, n - 1))}
                    aria-label={t("Kamaytirish")}
                    style={{ width: U(40), height: U(40), fontSize: U(22) }}
                  >
                    −
                  </button>
                  <span className={st.dg} style={{ fontSize: U(24), lineHeight: `${U(35)}`, color: INK }} aria-live="polite">
                    {count}
                  </span>
                  <button
                    type="button"
                    className={cx(st.o7, st.step)}
                    disabled={count >= 20}
                    onClick={() => setCount((n) => Math.min(20, n + 1))}
                    aria-label={t("Ko‘paytirish")}
                    style={{ width: U(40), height: U(40), fontSize: U(22) }}
                  >
                    +
                  </button>
                </div>
              </>
            )}
            {label(t("Tilaklaringiz"), 24)}
            <label className={st.field} style={{ marginTop: U(6), height: U(130), padding: U(16), borderRadius: U(16), alignItems: "stretch" }}>
              <textarea
                className={cx(st.o4, st.input)}
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                maxLength={500}
                placeholder={t("Yozing…")}
                aria-label={t("Tilaklaringiz")}
                style={{ fontSize: U(17), lineHeight: `${U(22)}`, height: "100%" }}
              />
            </label>
            {err && (
              <p className={st.o4} style={{ marginTop: U(12), color: "#c2410c", fontSize: U(15) }}>
                {err}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className={cx(st.o7, st.submit)}
              style={{ marginTop: U(32), minHeight: U(56), padding: `${U(8)} ${U(12)}`, fontSize: U(16), borderRadius: U(28), border: 0, opacity: busy ? 0.7 : 1 }}
            >
              {busy ? t("Yuborilmoqda…") : t("Yuborish")}
            </button>
          </form>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 10 · Final — sharlar yana ipda tushadi, «Ko‘rishguncha,», «2027!» qizil rangda yonib chiqadi, jamoa, archa shoxi
 * (scroll bilan: --fc 0 … 1 = Figma kadri; sahifa oxirigacha albatta tugaydi) ═════════════ */
function Final({ d, z, wide, still, onSeen }: { d: D; z: number; wide: boolean; still: boolean; onSeen: () => void }) {
  const t = useT();
  const ref = useRef<HTMLElement>(null);
  const onP = useCallback(
    (_p: number, r: DOMRect) => {
      const el = ref.current;
      if (!el) return;
      const vh = window.innerHeight || 800;
      // bo‘lim pasti ekran pastiga yetganda (yoki sahifa oxirida) tugaydi, 0.9 ekran oldin boshlanadi
      const y = window.scrollY;
      const top = r.top + y;
      const max = document.documentElement.scrollHeight - vh;
      const s1 = Math.max(1, Math.min(top + r.height - vh, max));
      const s0 = s1 - vh * 0.9;
      const f = seg(y, s0, s1);
      el.style.setProperty("--fc", f.toFixed(4));
      if (f > 0.5) onSeen();
    },
    [onSeen],
  );
  useScrollProgress(ref, onP, !still);
  const title = t("Ko‘rishguncha,");
  const year = `${d.year}!`;
  const fb = (a: number, b: number) => vars({ "--a": a, "--b": b });
  return (
    <Sec
      secRef={ref}
      z={z}
      bg="navy"
      className={st.finalWrap}
      style={still ? vars({ "--fc": 1 }) : undefined}
      colStyle={{ height: U(860) }}
      seam={
        <>
          <Ball rang="kumush" x={55} top={-60} thread={160} w={70} a="" className={st.fBall} style={fb(0, 0.42)} />
          <Ball rang="qizil" x={258} top={-60} thread={130} w={84} a="" className={st.fBall} style={fb(0.08, 0.5)} />
        </>
      }
      outer={
        <Side wide={wide}>
          <Ball rang="qizil" x={178} top={0} thread={340} w={104} unit={C} a="" className={st.fBall} style={fb(0.04, 0.48)} />
          <Ball rang="kumush" x={1153} top={0} thread={240} w={94} unit={C} a="" className={st.fBall} style={fb(0.12, 0.55)} />
          <Snow x={120} y={640} s={24} unit={C} />
          <Snow x={1300} y={700} s={22} unit={C} d={0.1} />
          <Snow x={1080} y={420} s={16} unit={C} d={0.2} />
        </Side>
      }
    >
      <Snow x={40} y={420} s={16} />
      <Snow x={330} y={380} s={22} d={0.1} />
      <Snow x={180} y={80} s={14} d={0.15} />
      <Snow x={60} y={760} s={18} d={0.2} />
      <Snow x={310} y={720} s={14} d={0.25} />
      <p className={cx(st.dg, st.fUp, "absolute inset-x-0 text-center")} style={vars({ top: U(330), height: U(55), fontSize: U(38), lineHeight: `${U(55)}`, color: "#fff", whiteSpace: "nowrap", "--fk": 0 })}>
        <Fit base={38} max={342} deps={title}>
          {title}
        </Fit>
      </p>
      <p className={cx(st.dg, st.fYear, "absolute inset-x-0 text-center")} style={{ top: U(390), height: U(133), fontSize: U(92), lineHeight: `${U(133)}`, whiteSpace: "nowrap" }}>
        <span className="relative inline-block">
          <span aria-hidden className={st.fYearDim}>
            {year}
          </span>
          <span className={st.fYearRed}>{year}</span>
          <span style={{ visibility: "hidden" }}>{year}</span>
        </span>
      </p>
      {d.team && (
        <div className={cx(st.o5, st.fUp, "absolute inset-x-0")} style={vars({ top: U(560), color: SILVER, "--fk": 2 })}>
          <FitBox text={d.team} base={18} min={14} w={342} h={46} lh={23 / 18} auto />
        </div>
      )}
      <Pic kind="shox" x={65} y={653.5} w={260} h={173} className={st.fUp} style={vars({ "--fk": 3 })} />
    </Sec>
  );
}

/* ═════════════ Musiqa tugmasi — Figma «Archa / Musiqa tugmasi (fixed)»: oq doira 52, 4 ta chiziq (to‘q ko‘k, qizil) beatga mos;
 * o‘chirilgan — chiziqlar kalta (4 px) ═════════════ */
const BARS = [10, 18, 13, 20];
function ArchaMusic({ m, wide, embedded }: { m: ReturnType<typeof useMusic>; wide: boolean; embedded: boolean }) {
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
type Key = "hero" | "taklif" | "program" | "gallery" | "timer" | "gift" | "venue" | "dress" | "rsvp" | "final";
/** Chok bezaklari: bo‘lim tepasidan oldingi bo‘limga qancha kiradi va Figma’dagi qo‘shnisi (OVER/ROOM) */
const SEAM_DEPTH: Partial<Record<Key, { depth: number; prev: Key }>> = {
  program: { depth: 85, prev: "taklif" },
  gallery: { depth: 90, prev: "program" },
  gift: { depth: 130, prev: "timer" },
  venue: { depth: 77, prev: "gift" },
  rsvp: { depth: 40, prev: "dress" },
  final: { depth: 60, prev: "rsvp" },
};

export function ArchaSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const loaded = usePreload(
    [`${P}/shar-qizil.svg`, `${P}/shar-kumush.svg`, `${P}/shar-muz.svg`, `${P}/qor.svg`],
    [d.photo, `${P}/shox.webp`, `${P}/sovga.webp`, ...d.gallery, d.hall].filter(Boolean),
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

  const shown: Key[] = (["hero", "taklif", "program", "gallery", "timer", "gift", "venue", "dress", "rsvp", "final"] as Key[]).filter((k) =>
    k === "program"
      ? d.program.length > 0
      : k === "gallery"
        ? d.gallery.length > 0
        : k === "timer"
          ? d.hasDate
          : k === "gift"
            ? !!(d.giftLimit || d.giftNote)
            : k === "venue"
              ? d.hasPlace
              : k === "dress"
                ? !!(d.dressNote || d.dressTitle)
                : k === "rsvp"
                  ? data.rsvpEnabled
                  : true,
  );
  const z = (k: Key) => 6 + shown.indexOf(k);
  /** Keyingi bo‘lim chok bezagi ostida matn qolmasin: Figma qo‘shnisi bo‘lmagan oldingi bo‘lim pastiga joy (tail) */
  const tail = (k: Key) => {
    const next = shown[shown.indexOf(k) + 1];
    const s = next ? SEAM_DEPTH[next] : undefined;
    return s && s.prev !== k ? s.depth : 0;
  };
  const linkable = mode !== "preview";
  const colU = wide ? COL_L : COL_M;

  return (
    <div ref={root} className={st.root}>
      <div className={st.page} style={vars({ "--u": colU, "--pu": colU })}>
        <ArchaMusic m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/shar-qizil.svg`} />}
        <div className={st.flow}>
          {withGate && (loaded ? <Gate d={d} wide={wide} onStart={() => music.play(true)} /> : <div className={st.gateHold} />)}
          {embedded && <Gate d={d} wide={wide} still onStart={() => {}} />}
          <Hero d={d} z={z("hero")} wide={wide} />
          <Taklif d={d} z={z("taklif")} wide={wide} tail={tail("taklif")} />
          <Program d={d} z={z("program")} wide={wide} still={embedded} tail={tail("program")} />
          <Gallery d={d} z={z("gallery")} wide={wide} tail={tail("gallery")} />
          <Timer d={d} z={z("timer")} wide={wide} tail={tail("timer")} />
          <Gift d={d} z={z("gift")} wide={wide} tail={tail("gift")} />
          <Venue d={d} z={z("venue")} wide={wide} linkable={linkable} tail={tail("venue")} />
          <Dress d={d} z={z("dress")} tail={tail("dress")} />
          {data.rsvpEnabled && <Rsvp d={d} slug={data.slug} mode={mode} z={z("rsvp")} wide={wide} />}
          <Final d={d} z={z("final")} wide={wide} still={embedded} onSeen={onFinal} />
        </div>
        <footer className={cx(st.footer, "flex items-start justify-center")} style={{ height: U(120), paddingTop: U(50) }}>
          <p className={cx(st.o5, "text-center")} style={{ fontSize: U(14), lineHeight: `${U(18)}`, color: "rgba(255,255,255,.5)" }}>
            <a href="https://shohnoma.uz">{t("shohnoma.uz orqali yaratilgan")}</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
