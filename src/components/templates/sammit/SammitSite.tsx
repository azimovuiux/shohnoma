"use client";

import "@fontsource/playfair-display/400-italic.css";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { splitDate, tashkentDate } from "@/lib/display";
import { musicSrc } from "@/lib/music";
import { tr, useLocale, useT, type Locale } from "@/lib/i18n";
import type { InvitationSiteProps } from "@/components/invitation/types";
import { fetchSavedAnswer, loadSavedRsvp, rsvpUrl, saveRsvp, type RsvpStatus } from "@/components/invitation/Rsvp";
import { guestHello, useGuestName } from "../shared/guest";
import { timerUnits } from "@/components/invitation/data";
import { useCountdown, usePointer, useScrollProgress, useWide } from "../shared/hooks";
import { Loader, usePreload, useMusic } from "../shared/runtime";
import { calendarWords, coordsFrom, downloadIcs, untilPhrase, type ProgramItem } from "../anor/data";
import { MSG_NO_ORG, MSG_ORG, MSG_PLAIN, SIGN_ORG } from "../bilet/data";
import { KIND } from "../taqvim/data";
import { DRESS_TEXT, P, SAMMIT_DEMO, SAMMIT_DEMO_EN, SAMMIT_DEMO_RU, type Speaker } from "./data";
import st from "./sammit.module.css";

/* ── Birliklar ──
 * U — joriy `--u`. Bo‘limlarda — kontent ustuni (Figma mobil 390 koordinatalari; laptopda ustun = mobil × 1.2, ya’ni 468px / 1440 —
 * Figma «Kontent ustuni (mobil ×1.2)»). C — laptop kanvasi (1440) birligi: yon bezaklar (xrom tangalar, qizil shisha, shisha kataklar, uchqunlar).
 * Ochilish (00) — o‘z kanvasi (mobil 390×844, laptop 1440×1013): sahna bir ekranga sig‘adi va pastki chetga bog‘lanadi;
 * laptopda ustun elementlari = mobil koordinata × 1.2 + 486 (Figma bilan aynan).
 * To‘r — 97.5 birlik (laptopda 117 px) katakli, ustun markazidan va bo‘lim tepasidan boshlanadi (Figma «To‘r chiziqlar»). */
const U = (n: number) => `calc(var(--u) * ${+n.toFixed(3)})`;
const C = (n: number) => `calc(100cqw / 1440 * ${+n.toFixed(3)})`;
const CX = (x: number) => `calc(50% + ${C(x - 720)})`;
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const vars = (o: Record<string, string | number | undefined>) => o as CSSProperties;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const COL_M = "calc(100cqw / 390)";
const COL_L = "calc(100cqw / 1440 * 1.2)";
const CANVAS_L = "calc(100cqw / 1440)";

/* Ranglar (Figma «22 · Kumush — Assets»): fon #0a0a0a → #a80f0d, shisha #dbdbde 58%, to‘q matn #141414 */
const INK = "#ffffff";
const DARK = "#141414";

/** Server yaratadigan standart taklif matni (php/api/lib/orders.php DEFAULT_MESSAGE) — har qaysi tilda */
const SERVER_DEFAULT = "Aziz mehmonlar! Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.";
const isServerDefault = (m: string) => (["uz", "ru", "en"] as Locale[]).some((l) => tr(l, SERVER_DEFAULT).trim() === m.trim());

const DAY_MS = 86400_000;
const isoOf = (d: Date) => d.toISOString().slice(0, 10);
const cap = (s: string) => (s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s);
const dot = (s: string) => (/[.!?…]$/.test(s) ? s : `${s}.`);

/**
 * Hero sarlavhasi (Figma: «Moliya» kursiv · «va investitsiya» kichik · «Sammiti.» katta): tadbir nomining birinchi so‘zi — kursiv,
 * oxirgi so‘zi — katta (oxiri yil bo‘lsa — oxirgi ikki so‘z), o‘rtadagilari — kichik matn.
 */
function heroTitle(ev: string): { a: string; mid: string; b: string } {
  // harf yoki raqamsiz bo‘laklar (emoji, «—») oldingi so‘zga qo‘shiladi
  const w: string[] = [];
  for (const x of ev.trim().split(/\s+/).filter(Boolean)) {
    if (w.length && !/[\p{L}\p{N}]/u.test(x)) w[w.length - 1] += ` ${x}`;
    else w.push(x);
  }
  const end = (s: string) => (/[\p{L}\p{N}»”")]$/u.test(s) ? dot(s) : s);
  if (!w.length) return { a: "", mid: "", b: "" };
  if (w.length === 1) return { a: "", mid: "", b: end(cap(w[0])) };
  if (w.length === 2) return { a: cap(w[0]), mid: "", b: end(cap(w[1])) };
  const lastN = /^\d{2,4}$/.test(w[w.length - 1]) ? 2 : 1;
  const mid = w.slice(1, w.length - lastN).join(" ");
  // o‘rtasi uzun bo‘lsa — kichik matn emas, katta sarlavhaga qo‘shiladi (u bir necha qatorga bo‘linadi)
  if (mid.length > 24) return { a: cap(w[0]), mid: "", b: end(cap(w.slice(1).join(" "))) };
  return { a: cap(w[0]), mid, b: end(cap(w.slice(w.length - lastN).join(" "))) };
}

/**
 * Qutiga sig‘adigan matn: odatdagidek qatorlarga bo‘linadi, sig‘masa — shrift kichrayadi (base → min).
 * Bitta qatorga sig‘sa — Fit kabi bir qator (Figma: «Sammiti.»).
 */
function FitBox({ text, base, min, w, h, lh, className, style }: { text: string; base: number; min: number; w: number; h: number; lh: number; className?: string; style?: CSSProperties }) {
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
    <span ref={ref} className={cx("block", className)} style={{ width: U(w), maxHeight: U(h), lineHeight: lh, overflowWrap: "anywhere", ...style }}>
      {text}
    </span>
  );
}

function useData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO = lang === "ru" ? SAMMIT_DEMO_RU : lang === "en" ? SAMMIT_DEMO_EN : SAMMIT_DEMO;
  const ex = (data.extra ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof ex[k] === "string" ? (ex[k] as string).trim() : typeof ex[k] === "number" ? String(ex[k]) : "");
  const sd = splitDate(data.date);
  // namunada — Figma’dagi mehmon («Aziz Karimov»); ?g= / ?m= bo‘lsa — o‘sha mehmon
  const guest = useGuestName(demo ? DEMO.guest : "");
  return useMemo(() => {
    const cw = calendarWords(lang);
    const listOf = (k: string) => (Array.isArray(ex[k]) ? (ex[k] as ProgramItem[]).filter((p) => p?.time && p?.title) : []);
    const exSpeakers = Array.isArray(ex.speakers) ? (ex.speakers as Speaker[]).filter((s) => s && typeof s.name === "string" && s.name.trim()) : [];
    const exFacts = Array.isArray(ex.facts)
      ? (ex.facts as { text?: unknown }[]).map((f) => (typeof f?.text === "string" ? f.text.trim() : "")).filter(Boolean)
      : [];
    const photos = (data.photos ?? []).filter(Boolean) as string[];
    const date = sd ? new Date(`${sd.iso}T12:00:00Z`) : null;
    // korporativ: personA — tadbir nomi, personB — kompaniya / tashkilotchi (namunadagi nomlar tarjima qilinadi, mijozniki — yo‘q)
    const event = ((demo ? t(data.personA) : data.personA) || "").trim();
    const org = ((demo ? t(data.personB ?? "") : data.personB) || "").trim();
    const program = (demo ? DEMO.program : listOf("program").length ? listOf("program") : ((data.program ?? []) as ProgramItem[])).slice(0, 8);
    const num = (d: Date) => d.getUTCDate();
    const mon = (d: Date) => cw.monthsAfterDay[d.getUTCMonth()];
    const wd = (d: Date) => cw.weekday[d.getUTCDay()];
    const low = (s: string) => s.toLocaleLowerCase(lang === "uz" ? "en" : lang);
    /** «12 mart» / «12 марта» / «12 March» (shisha kataklar — Figma’dagidek) */
    const dayLabel = date ? `${num(date)} ${mon(date)}` : "";
    /** jumla ichida: «12-mart» / «12 марта» / «12 March» */
    const dayLong = date ? (lang === "uz" ? `${num(date)}-${mon(date)}` : dayLabel) : "";
    const time = sd?.time ?? "";
    // taymer ostida: «12-mart, payshanba · 10:00»
    let when = "";
    if (date) {
      when = lang === "en" ? `${wd(date)}, ${num(date)} ${mon(date)}` : `${dayLong}, ${low(wd(date))}`;
      if (time) when += ` · ${time}`;
    }
    const k = KIND[str("kind")] ? str("kind") : "sammit";
    const kindUntil = cap((KIND[k][lang] ?? KIND.sammit.uz)[1]);
    const raw = (demo ? "" : data.message || "").trim();
    const custom =
      raw && !isServerDefault(raw)
        ? raw.replace(/^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Muhtaram mehmonlar!|Hurmatli mehmonlar!|Дорогие гости!|Уважаемые гости!|Dear guests!)\s*/, "").trim()
        : "";
    const message = demo ? DEMO.message : custom || (org && event ? t(MSG_ORG, { org, event }) : event ? t(MSG_NO_ORG, { event }) : t(MSG_PLAIN));
    const venueTitle = ((demo ? t(data.venueName) : data.venueName) || "").trim();
    const address = ((demo ? DEMO.address : data.address) || "").trim();
    const coords = coordsFrom(data.mapUrl);
    // javob muddati — namunada sanadan 11 kun oldin (Figma: «1-martgacha»)
    const deadline = demo && date ? isoOf(new Date(date.getTime() - 11 * DAY_MS)) : data.rsvpDeadline;
    // shahar: manzilning birinchi bo‘lagi (qisqa bo‘lsa)
    const city0 = address.split(",")[0]?.replace(/^(г\.|город)\s*/i, "").replace(/\s+(shahri|sh\.|tumani|viloyati)$/i, "").trim() ?? "";
    const city = demo ? DEMO.city : city0.length <= 18 && !/\d/.test(city0) ? city0 : "";
    const code = str("dressCode") || (demo ? DEMO.dressCode : "");
    const dressNote = demo ? DEMO.dressNote : str("dressNote") || (DRESS_TEXT[code] ? t(DRESS_TEXT[code]) : "");
    const speakers = demo
      ? DEMO.speakers.map((s, i) => ({ ...s, photo: `${P}/spiker${i + 1}.webp` }))
      : exSpeakers.slice(0, 6).map((s, i) => ({ name: s.name.trim(), role: (s.role ?? "").trim(), photo: photos[i] || "" }));
    // hero kataklari: tor (97.5) katakka eng qisqa fakt, qolganlari tartib bilan keng kataklarga
    const facts = (demo ? DEMO.facts : exFacts).slice(0, 3);
    const cells: string[] = ["", "", ""];
    if (facts.length) {
      const order = facts.map((_, i) => i).sort((a, b) => facts[a].length - facts[b].length);
      const narrow = facts.length === 3 ? order[0] : -1;
      const rest = facts.map((_, i) => i).filter((i) => i !== narrow);
      if (narrow >= 0) cells[1] = facts[narrow];
      cells[0] = facts[rest[0]] ?? "";
      cells[2] = facts[rest[1]] ?? "";
    }
    return {
      event,
      org,
      title: heroTitle(event),
      kindUntil,
      dayLabel,
      /** hero kulrang katagi: «12 mart, Toshkent.» */
      dayCity: date ? (city ? `${dayLabel}, ${city}.` : `${dayLabel}.`) : city ? `${city}.` : "",
      /** final: «12-mart, Toshkent» */
      finalLine: [dayLong, city].filter(Boolean).join(", "),
      when,
      cells,
      hasDate: !!date,
      iso: sd?.iso ?? "",
      time,
      target: data.date ? tashkentDate(data.date).getTime() : null,
      guest,
      message,
      /** imzo: «Orbis Capital jamoasi» */
      sign: org ? t(SIGN_ORG, { org }) : "",
      venueTitle,
      address,
      hasPlace: !!(venueTitle || address || data.mapUrl),
      mapUrl: data.mapUrl || (coords ? `https://yandex.uz/maps/?pt=${coords.lon},${coords.lat}&z=16` : `https://yandex.uz/maps/?text=${encodeURIComponent([venueTitle, address].filter(Boolean).join(", "))}`),
      program,
      speakers,
      dressCode: DRESS_TEXT[code] || code ? t(code) : "",
      dressNote,
      hall: `${P}/zal.webp`,
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
 * Chok ustidagi tangalar scroll bilan aylanib o‘tadi: [data-sc] elementga `--sp` (−1 … 1, ekran markazida 0 = Figma holati).
 */
function useSeamSpin(root: React.RefObject<HTMLDivElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = root.current;
    if (!el || !enabled) return;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const vh = window.innerHeight || 800;
      el.querySelectorAll<HTMLElement>("[data-sc]").forEach((x) => {
        const r = x.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) return;
        const p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / vh));
        x.style.setProperty("--sp", p.toFixed(3));
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
 * Sarlavha qatori: bir qatorga sig‘masa kichrayadi; juda uzun bo‘lsa (0.7 dan kichrayadi) — ikki teng qatorga bo‘linadi.
 * Matn hech qachon kesilmaydi va toshmaydi.
 */
function Lines({ text, base, max, lh, className, style }: { text: string; base: number; max: number; lh: number; className?: string; style?: CSSProperties }) {
  const probe = useRef<HTMLSpanElement>(null);
  const [split, setSplit] = useState(false);
  useIso(() => {
    const el = probe.current;
    if (!el) return;
    const measure = () => {
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (!px) return;
      const k = ((px / base) * max) / Math.max(1, el.offsetWidth);
      setSplit(k < 0.7 && !!split2(text));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (el.parentElement) ro.observe(el.parentElement);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [text, base, max]);
  const rows = split ? split2(text)! : [text];
  return (
    <div className={cx("relative", className)} style={style}>
      <span ref={probe} aria-hidden className="pointer-events-none absolute whitespace-nowrap" style={{ visibility: "hidden", fontSize: U(base), left: 0, top: 0 }}>
        {text}
      </span>
      {rows.map((r, i) => (
        <span key={i} className="block" style={{ height: U(lh), lineHeight: U(lh), whiteSpace: "nowrap" }}>
          <Fit base={base} max={max} deps={`${r}|${split}`}>
            {r}
          </Fit>
        </span>
      ))}
    </div>
  );
}

/* ═════════════ Bezaklar ═════════════ */
type ObjK = "old" | "yon" | "red";
const SRC: Record<ObjK, string> = { old: `${P}/tanga.webp`, yon: `${P}/tanga-yon.webp`, red: `${P}/shisha.webp` };

/**
 * Figma instansi: (x, y) — burilgan nuqta (chap-yuqori burchak), w — o‘lcham, rot — Figma burchagi (soat miliga teskari, °).
 * Tashqi qobiq — Figma’dagi joy va burilish; ichki qatlam — harakat (markaz atrofida).
 */
function Obj({
  k,
  left,
  top,
  size,
  rot = 0,
  className,
  inner,
  style,
  innerStyle,
  a,
  sc,
  shine,
  eager,
}: {
  k: ObjK;
  left: string;
  top: string;
  size: string;
  rot?: number;
  className?: string;
  inner?: string;
  style?: CSSProperties;
  innerStyle?: CSSProperties;
  a?: string;
  sc?: boolean;
  shine?: boolean;
  eager?: boolean;
}) {
  return (
    <span
      aria-hidden
      data-a={a}
      data-sc={sc ? "" : undefined}
      className={cx(st.obj, className)}
      style={{ left, top, width: size, height: size, transform: rot ? `rotate(${-rot}deg)` : undefined, ...style }}
    >
      <span className={cx(st.objIn, inner)} style={innerStyle}>
        <Img src={SRC[k]} eager={eager} />
        {shine && <span className={st.shine} style={vars({ WebkitMaskImage: `url(${SRC[k]})`, maskImage: `url(${SRC[k]})` })} />}
      </span>
    </span>
  );
}
/** Ustun koordinatalarida (mobil 390) */
const ObjU = (p: { k: ObjK; x: number; y: number; w: number; rot?: number } & Omit<Parameters<typeof Obj>[0], "left" | "top" | "size">) => (
  <Obj {...p} left={U(p.x)} top={U(p.y)} size={U(p.w)} />
);
/** Laptop kanvasi koordinatalarida (1440) */
const ObjC = (p: { k: ObjK; x: number; y: number; w: number; rot?: number } & Omit<Parameters<typeof Obj>[0], "left" | "top" | "size">) => (
  <Obj {...p} left={CX(p.x)} top={C(p.y)} size={C(p.w)} />
);

/** Uchqun (Figma «Kumush / Uchqun»: 16 px yulduzcha, oq nur bilan) */
function Spark({ left, top, size, d = 0, a = "spark", className }: { left: string; top: string; size: string; d?: number; a?: string; className?: string }) {
  return (
    <span aria-hidden data-a={a || undefined} className={cx(st.spark, className)} style={vars({ left, top, width: size, height: size, "--d": `${d}s` })}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${P}/uchqun.svg`} alt="" draggable={false} className={st.sparkImg} />
    </span>
  );
}

/** Laptop yon uchqunlari (Figma: har bo‘limda bir xil 4 nuqta, bo‘limga sig‘ganlari) */
const SIDE_SPARKS: [number, number][] = [
  [125.5, 224.5],
  [1178.5, 341.5],
  [242.5, 575.5],
  [1295.5, 692.5],
];
function SideSparks({ wide, h }: { wide: boolean; h: number }) {
  if (!wide) return null;
  return (
    <>
      {SIDE_SPARKS.filter(([, y]) => y + 19 <= h * 1.2).map(([x, y], i) => (
        <Spark key={i} left={CX(x)} top={C(y)} size={C(19)} d={0.1 + i * 0.12} />
      ))}
    </>
  );
}

/** Shisha katak (Figma «Katak · glass»: #dbdbde 58%, backdrop-blur 15) */
function Glass({ style, className, a, d = 0, children }: { style?: CSSProperties; className?: string; a?: string; d?: number; children?: ReactNode }) {
  return (
    <span data-a={a} className={cx(st.glass, className)} style={vars({ "--d": `${d}s`, ...style })}>
      {children}
    </span>
  );
}

/** O‘q (Figma «O‘q»: 40×14, 1.6 chiziq) */
function Arrow({ color = INK, style }: { color?: string; style?: CSSProperties }) {
  return (
    <svg aria-hidden className={st.arrow} viewBox="0 0 40 14" fill="none" style={{ width: U(40), height: U(14), flex: "none", ...style }}>
      <path d="M0 7H38M32 13L38 7L32 1" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ═════════════ 00 · Ochilish — xrom tanga (faqat scroll bilan, --o: 0…1) ═════════════
 * Yuklanganda (bosishsiz): to‘r chiziqlari markazdan chetga chiziladi (0.8 s), uchqunlar birin-ketin yonadi, xrom tanga yuqoridan
 * aylanib tushadi (rotateY 720° → 0, 1.4 s) va to‘rga o‘rnashadi, «12 mart» shisha katagi chapdan siljib keladi — oxirgi holat = Figma kadri.
 * Scroll (rAF lerp): 0…0.6 — tangalar ikki tomonga uchib ketadi (asosiy tanga — o‘ngga-yuqoriga aylanib, qizil shisha — chapga-pastga;
 * laptopda yon tanga — chapga, yon qizil shisha — o‘ngga); 0.3…1 — sahna (qizil pastki cheti bilan) yuqoriga surilib ketadi va ostidan
 * hero (01) chiqadi — o‘rama oxirida u aynan ekran tepasida turadi. Yarim shaffof o‘tish yo‘q — qattiq chegara. */
const GATE = {
  m: { W: 390, H: 844, S: 1, OX: 0 },
  l: { W: 1440, H: 1013, S: 1.2, OX: 486 },
} as const;
const easeOut = (x: number) => 1 - Math.pow(1 - x, 1.6);

function Gate({ d, wide, onStart, onHero, still = false }: { d: D; wide: boolean; onStart: () => void; onHero: () => void; still?: boolean }) {
  const t = useT();
  const wrap = useRef<HTMLDivElement>(null);
  const cb = useRef({ onStart, onHero });
  cb.current = { onStart, onHero };
  useEffect(() => {
    const el = wrap.current;
    if (!el || still) return;
    let raf = 0;
    let cur = 0;
    let target = 0;
    let started = false;
    let hero = false;
    const read = () => {
      const r = el.getBoundingClientRect();
      const stage = (el.firstElementChild as HTMLElement | null)?.offsetHeight || window.innerHeight;
      const D = Math.max(1, r.height - stage);
      target = clamp01(-r.top / D);
    };
    const apply = (o: number) => {
      el.style.setProperty("--o", o.toFixed(4));
      el.style.setProperty("--ex", easeOut(seg(o, 0, 0.6)).toFixed(4));
      el.style.setProperty("--w", Math.pow(seg(o, 0.3, 1), 1.35).toFixed(4));
      el.style.pointerEvents = o > 0.1 ? "none" : "";
      if (!started && o > 0.004) {
        started = true;
        cb.current.onStart();
      }
      if (!hero && o > 0.26) {
        hero = true;
        cb.current.onHero();
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
  // laptop kanvas koordinatalari
  const Xc = (x: number) => `calc(50% + ${U(x - W / 2)})`;
  const Yc = (y: number) => `calc(100% - ${U(H - y)})`;
  const cell = 97.5;
  // to‘r: ustun markazidan ikki tomonga va pastdan yuqoriga (baland ekranda tepada ham davom etadi)
  const vLines = Array.from({ length: 21 }, (_, i) => i - 10);
  const hLines = Array.from({ length: 20 }, (_, i) => 8 - i);
  const sparks: [number, number][] = [
    [89.5, 187],
    [284.5, 187],
    [187, 577],
  ];
  return (
    <div
      ref={wrap}
      className={cx(st.gateWrap, still && st.still)}
      style={vars(still ? { "--u": pageU, "--o": 0, "--ex": 0, "--w": 0, height: U(H) } : { "--u": `min(${pageU}, calc(100svh / ${H}))` })}
    >
      <div className={st.gate} aria-label={t("Taklifnoma")} style={still ? { position: "relative", height: "100%" } : undefined}>
        <div className={st.gSlide}>
          {/* fon: qoradan to‘q qizilga (Figma 00: #0a0a0a 0–45%, #a80f0d 100%) — pastki chetga bog‘langan */}
          <div className={st.gBg} style={{ background: `linear-gradient(0deg, #a80f0d 0, #0a0a0a ${U(H * 0.55)}, #0a0a0a 100%)` }} />
          {/* to‘r chiziqlari — markazdan chetga chiziladi */}
          <div aria-hidden className={st.gGrid}>
            {vLines.map((k) => (
              <span key={`v${k}`} className={st.gV} style={vars({ left: `calc(50% + ${U(S * cell * k)})`, "--gd": `${Math.abs(k) * 0.05}s` })} />
            ))}
            {hLines.map((k) => (
              <span key={`h${k}`} className={st.gH} style={vars({ top: Y(cell * k), "--gd": `${Math.abs(k - 4) * 0.05}s` })} />
            ))}
          </div>
          {sparks.map(([x, y], i) => (
            <Spark key={i} a="" className={st.gSpark} left={X(x)} top={Y(y)} size={Z(16)} d={0.5 + i * 0.22} />
          ))}
          {wide &&
            SIDE_SPARKS.map(([x, y], i) => <Spark key={`c${i}`} a="" className={st.gSpark} left={Xc(x)} top={Yc(y)} size={U(19)} d={0.6 + i * 0.18} />)}
          {d.org && (
            <p className={cx(st.s6, st.gIn)} style={vars({ left: X(24), top: Y(40), width: Z(280), height: Z(24), fontSize: Z(18), lineHeight: Z(24), color: INK, whiteSpace: "nowrap", "--gd": "0.3s" })}>
              <Fit base={18 * S} max={280 * S} deps={d.org}>
                {d.org}
              </Fit>
            </p>
          )}
          {/* laptop: yon xrom tanga (chapda) va qizil shisha (o‘ngda) — Figma kanvas koordinatalari */}
          {wide && (
            <>
              <Obj k="yon" left={Xc(110)} top={Yc(260)} size={U(300)} rot={24} className={st.gDrop} inner={st.gFlyL} style={vars({ "--gd": "0.2s" })} eager />
              <Obj k="red" left={Xc(1080)} top={Yc(520)} size={U(280)} className={st.gRise} inner={st.gFlyR} style={vars({ "--gd": "0.45s" })} eager />
            </>
          )}
          {/* asosiy xrom tanga: yuqoridan aylanib tushadi; scroll bilan o‘ngga-yuqoriga uchib ketadi */}
          <Obj k="old" left={X(60)} top={Y(190)} size={Z(280)} rot={-12} className={st.gCoinWrap} inner={st.gCoin} eager />
          {/* «12 mart» shisha katagi — chapdan siljib keladi */}
          <span className={cx(st.glass, st.gCell)} style={{ left: X(97.5), top: Y(487.5), width: Z(195), height: Z(97.5) }}>
            {d.dayLabel && (
              <span className={st.gCellTx} style={{ fontSize: Z(45.6), lineHeight: 1 }}>
                <Fit base={45.6 * S} max={171 * S} deps={d.dayLabel}>
                  {d.dayLabel}
                </Fit>
              </span>
            )}
          </span>
          {d.event && (
            <p className={cx(st.m5, st.gIn, st.clamp2, "text-center")} style={vars({ left: X(24), top: Y(620), width: Z(342), fontSize: Z(15), lineHeight: 1.22, color: "rgba(255,255,255,.8)", textWrap: "balance", "--gd": "1.1s" })}>
              {d.event}
            </p>
          )}
          <Obj k="red" left={X(-50)} top={Y(680)} size={Z(200)} className={st.gRise} inner={st.gFlyL} style={vars({ "--gd": "0.7s" })} eager />
        </div>
      </div>
    </div>
  );
}

/* ═════════════ Bo‘lim qobig‘i ═════════════ */
/** Bo‘lim: to‘liq enli fon (qora yoki qoradan qizilga gradient), to‘r, markazda kontent ustuni (mobil 390 birlik; laptopda × 1.2).
 * `outer` — ustundan tashqaridagi (laptop kanvasi) bezaklar; `seam` — ustun koordinatalaridagi, oldingi bo‘limga kirib turadigan bezaklar */
function Sec({
  children,
  z,
  stop,
  colStyle,
  id,
  outer,
  seam,
  className,
  secRef,
  tail = 0,
  secStyle,
}: {
  children: ReactNode;
  z: number;
  /** oldingi bo‘limning chok tangasi uchun pastdagi qo‘shimcha joy (ustun birligi) */
  tail?: number;
  secStyle?: CSSProperties;
  /** gradient: qora shu foizgacha, keyin #a80f0d gacha; yo‘q — tekis qora */
  stop?: number;
  colStyle?: CSSProperties;
  id?: string;
  outer?: ReactNode;
  seam?: ReactNode;
  className?: string;
  secRef?: React.Ref<HTMLElement>;
}) {
  return (
    <section
      ref={secRef}
      id={id}
      className={cx(st.sec, className)}
      style={{ zIndex: z, background: stop != null ? `linear-gradient(180deg, #0a0a0a 0%, #0a0a0a ${stop}%, #a80f0d 100%)` : "#0a0a0a", ...secStyle }}
    >
      <span aria-hidden className={st.grid} />
      {outer && (
        <div aria-hidden className={st.deco}>
          {outer}
        </div>
      )}
      {seam && (
        <div className={st.col} style={{ width: U(390), position: "absolute", left: 0, right: 0, top: 0, height: 0, zIndex: 3 }}>
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

/** Ustundagi uchqunlar ([x, y] — Figma 16 px yulduzcha chap-yuqori burchagi) */
function Sparks({ list }: { list: [number, number][] }) {
  return (
    <>
      {list.map(([x, y], i) => (
        <Spark key={i} left={U(x)} top={U(y)} size={U(16)} d={0.15 + i * 0.12} />
      ))}
    </>
  );
}

/** Bo‘lim sarlavhasi (Figma: Montserrat 64, chapda, oxirida nuqta: «Dastur.») */
function Title({ text, top = 27.5 }: { text: string; top?: number }) {
  return (
    <h2 data-a="up" className={cx(st.title, "m-0")} style={{ position: "absolute", left: U(24), top: U(top), height: U(64), lineHeight: U(64), whiteSpace: "nowrap" }}>
      <Fit base={64} max={342} deps={text}>
        {text}
      </Fit>
    </h2>
  );
}
const titleOf = (s: string) => dot(cap(s.replace(/[!.:]+$/, "")));

/* ═════════════ 01 · Hero — sarlavha va shisha kataklar ═════════════
 * «Moliya» kursiv harflari maska bilan ochiladi, «Sammiti.» pastdan ko‘tariladi; shisha kataklar navbat bilan paydo bo‘ladi
 * (fade + blur 0 → 15, stagger 0.12 s); tangalar sekin suzadi, laptopda kursor bilan 3D aylanadi va xrom yuzasida yorug‘lik dog‘i siljiydi. */
const CELLS: [number, number, number][] = [
  [0, 390, 195],
  [292.5, 390, 97.5],
  [97.5, 585, 195],
];

function Hero({ d, z, wide, on, still, rsvp }: { d: D; z: number; wide: boolean; on: boolean; still: boolean; rsvp: boolean }) {
  const t = useT();
  const ptr = usePointer(wide && !still);
  const T = d.title;
  return (
    <section
      className={cx(st.sec, st.hero, (on || still) && st.on, still && st.noAnim)}
      style={vars({ zIndex: z, background: "linear-gradient(180deg, #0a0a0a 0%, #0a0a0a 50%, #a80f0d 100%)", "--mx": ptr.x.toFixed(3), "--my": ptr.y.toFixed(3) })}
    >
      <span aria-hidden className={st.grid} />
      {wide && (
        <div aria-hidden className={st.deco}>
          {SIDE_SPARKS.map(([x, y], i) => (
            <span key={i} className={st.hSpark} style={vars({ "--i": i })}>
              <Spark a="" left={CX(x)} top={C(y)} size={C(19)} />
            </span>
          ))}
          <ObjC k="yon" x={60} y={430} w={320} rot={-20} className={st.hObj} inner={cx(st.float, st.tilt)} innerStyle={vars({ "--fd": "-2s" })} style={vars({ "--i": 1 })} />
          <ObjC k="old" x={1060} y={300} w={300} rot={16} className={st.hObj} inner={cx(st.float, st.tilt)} innerStyle={vars({ "--fd": "-4s" })} style={vars({ "--i": 2 })} shine />
          <span className={cx(st.glass, st.hCell)} style={vars({ left: CX(252), top: C(585), width: C(117), height: C(117), "--i": 3 })} />
          <span className={cx(st.glass, st.hCell)} style={vars({ left: CX(1071), top: C(351), width: C(117), height: C(117), "--i": 1 })} />
          <ObjC k="red" x={1160} y={936} w={240} className={st.hObj} inner={st.float} innerStyle={vars({ "--fd": "-1s" })} style={vars({ "--i": 4 })} />
        </div>
      )}
      <div className={st.col} style={{ width: U(390), height: U(975) }}>
        {(
          [
            [89.5, 89.5],
            [187, 89.5],
            [284.5, 89.5],
            [89.5, 382],
            [284.5, 382],
            [187, 674.5],
          ] as [number, number][]
        ).map(([x, y], i) => (
          <span key={i} className={st.hSpark} style={vars({ "--i": i })}>
            <Spark a="" left={U(x)} top={U(y)} size={U(16)} />
          </span>
        ))}
        {/* kulrang katak: «12 mart, Toshkent.» */}
        <span className={cx(st.greyCell, st.hCell)} style={vars({ left: U(97.5), top: 0, width: U(97.5), height: U(97.5), padding: `0 ${U(10)} 0 ${U(14)}`, "--i": 0 })}>
          {d.dayCity && (
            <span className={cx(st.m5, st.clamp3)} style={{ fontSize: U(14), lineHeight: 1.25, color: INK }}>
              {d.dayCity}
            </span>
          )}
        </span>
        {T.a && (
          <p className={cx(st.pf, st.hMask)} style={{ position: "absolute", left: U(22), top: U(107.5), height: U(66), lineHeight: U(66), whiteSpace: "nowrap", letterSpacing: "-0.02em" }}>
            <Fit base={66} max={T.mid ? 214 : 346} deps={T.a}>
              {T.a}
            </Fit>
          </p>
        )}
        {T.mid && (
          <div className={st.hIn} style={vars({ position: "absolute", left: U(244), top: U(133.5), width: U(124), color: INK, "--d": "0.55s" })}>
            <Lines text={T.mid} base={17} max={122} lh={21.25} />
          </div>
        )}
        {T.b && (
          <h1 className={cx(st.hRise, "m-0")} style={{ position: "absolute", left: U(22), top: U(193.5), paddingBottom: U(8) }}>
            <span className={st.hRiseIn} style={{ display: "block", letterSpacing: "-0.04em" }}>
              <FitBox text={T.b} base={72} min={26} w={346} h={140} lh={1.02} />
            </span>
          </h1>
        )}
        <ObjU k="yon" x={-70} y={370} w={250} rot={18} className={st.hObj} inner={cx(st.float, st.tilt)} innerStyle={vars({ "--fd": "-3s" })} style={vars({ "--i": 1 })} />
        <ObjU k="old" x={140} y={410} w={240} rot={-8} className={st.hObj} inner={cx(st.float, st.tilt)} innerStyle={vars({ "--fd": "-1.5s" })} style={vars({ "--i": 2 })} shine={wide} />
        {CELLS.map(([x, y, w], i) => (
          <span
            key={i}
            className={cx(st.glass, st.hCell, st.cellTx)}
            style={vars({ left: U(x), top: U(y), width: U(w), height: U(97.5), padding: `0 ${U(10)} 0 ${U(14)}`, "--i": 3 + i })}
          >
            {d.cells[i] && (
              <span className={cx(st.m5, st.clamp3)} style={{ fontSize: U(14), lineHeight: 1.25, color: DARK }}>
                {d.cells[i]}
              </span>
            )}
          </span>
        ))}
        <ObjU k="red" x={-40} y={682.5} w={190} className={st.hObj} inner={st.float} innerStyle={vars({ "--fd": "-5s" })} style={vars({ "--i": 5 })} />
        {rsvp && (
          <a
            href="#sammit-javob"
            className={cx(st.m5, st.pill, st.pillGlass, st.hIn)}
            style={vars({ position: "absolute", right: U(24), top: U(802), minWidth: U(246), height: U(54), padding: `0 ${U(25)} 0 ${U(23)}`, gap: U(19), fontSize: U(16), borderRadius: U(27), "--d": "1.2s" })}
            onClick={(e) => {
              const el = document.getElementById("sammit-javob");
              if (!el) return;
              e.preventDefault();
              el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <span>{t("sammit::Ro‘yxatdan o‘tish")}</span>
            <Arrow />
          </a>
        )}
      </div>
    </section>
  );
}

/* ═════════════ 02 · Taklif — murojaat (mehmon ismi bilan), matn, imzo ═════════════ */
function Taklif({ d, z, wide, tail }: { d: D; z: number; wide: boolean; tail: number }) {
  const t = useT();
  const plain = t("Hurmatli mehmon!");
  const hello = d.guest ? guestHello(t, "Hurmatli {guest}!", d.guest) : plain;
  // Figma: «Hurmatli» (kursiv) / «Aziz Karimov!» — murojaat so‘zi alohida qatorda (ruschada murojaat — faqat ism: ism bo‘linmaydi)
  const w0 = plain.trim().split(/\s+/)[0];
  const words = hello.trim().split(/\s+/);
  const splitIt = words.length > 1 && words[0] === w0;
  const l1 = splitIt ? words[0] : "";
  const l2 = splitIt ? words.slice(1).join(" ") : hello;
  return (
    <Sec
      z={z}
      tail={tail}
      colStyle={{ paddingTop: U(115.5), paddingBottom: U(143.5) }}
      outer={<SideSparks wide={wide} h={700} />}
      seam={<ObjU k="yon" x={262} y={-80} w={150} rot={24} a="seam" sc inner={st.seamIn} />}
    >
      <Sparks
        list={[
          [284.5, 89.5],
          [89.5, 577],
        ]}
      />
      <h2 className="relative m-0" style={{ marginLeft: U(24), width: U(342), color: INK }}>
        {l1 && (
          <span data-a="up" className={cx(st.pf, "block")} style={{ height: U(68), lineHeight: U(68), whiteSpace: "nowrap" }}>
            <Fit base={56} max={342} deps={l1}>
              {l1}
            </Fit>
          </span>
        )}
        <span data-a="up" className="block" style={vars({ letterSpacing: "-0.03em", "--d": "0.1s" })}>
          <Lines text={l2} base={38} max={342} lh={41.8} />
        </span>
      </h2>
      <p data-a="up" className="relative" style={vars({ marginTop: U(77.2), marginLeft: U(24), width: U(342), fontSize: U(17), lineHeight: 1.6, color: "rgba(255,255,255,.85)", overflowWrap: "anywhere", whiteSpace: "pre-line", "--d": "0.15s" })}>
        {d.message}
      </p>
      {d.sign && (
        <p data-a="up" className={cx(st.pf, "relative")} style={vars({ marginTop: U(116.2), marginLeft: U(24), width: U(342), fontSize: U(22), lineHeight: U(29), color: INK, overflowWrap: "anywhere", "--d": "0.2s" })}>
          {d.sign}
        </p>
      )}
    </Sec>
  );
}

/* ═════════════ 03 · Taymer — shisha kataklardagi raqamlar pastga varaqlanadi (0.35 s); raqamlar doim 2 xonali ═════════════ */
/** Bitta raqam: o‘zgarsa — eskisi pastga chiqib ketadi, yangisi yuqoridan kiradi (ikkalasi bir vaqtda — bo‘sh kadr yo‘q) */
function Digit({ ch }: { ch: string }) {
  const [cur, setCur] = useState(ch);
  const [prev, setPrev] = useState<string | null>(null);
  const [k, setK] = useState(0);
  useEffect(() => {
    if (ch === cur) return;
    setPrev(cur);
    setCur(ch);
    setK((x) => x + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ch]);
  return (
    <span className={st.digit}>
      <span aria-hidden style={{ visibility: "hidden" }}>
        {cur}
      </span>
      {prev !== null && k > 0 && (
        <span key={`o${k}`} className={cx(st.dg, st.dgOut)}>
          {prev}
        </span>
      )}
      <span key={`n${k}`} className={cx(st.dg, k > 0 && st.dgIn)}>
        {cur}
      </span>
    </span>
  );
}

function Taymer({ d, z, wide, slug, tail }: { d: D; z: number; wide: boolean; slug: string; tail: number }) {
  const t = useT();
  const units = timerUnits(useLocale());
  const c = useCountdown(d.target);
  if (!d.hasDate || !c) return null;
  const vals = [c.d, c.h, c.m, c.s];
  return (
    <Sec
      z={z}
      stop={20}
      tail={tail}
      colStyle={{ height: U(527.5) }}
      outer={
        wide && (
          <>
            <SideSparks wide={wide} h={527.5} />
            <Glass a="cell" d={0.05} style={{ left: CX(369), top: C(234), width: C(117), height: C(117) }} />
            <Glass a="cell" d={0.45} style={{ left: CX(954), top: C(234), width: C(117), height: C(117) }} />
          </>
        )
      }
    >
      <Sparks
        list={[
          [89.5, 187],
          [187, 187],
          [284.5, 187],
        ]}
      />
      <h2 data-a="up" className={cx(st.pf, "m-0")} style={{ position: "absolute", left: U(24), top: U(37.5), height: U(75), lineHeight: U(75), color: INK, whiteSpace: "nowrap" }}>
        <Fit base={56} max={342} deps={d.kindUntil}>
          {d.kindUntil}
        </Fit>
      </h2>
      {vals.map((v, i) => (
        <Glass key={i} a="cell" d={0.1 + i * 0.12} className={st.timer} style={{ left: U(97.5 * i), top: U(195), width: U(97.5), height: U(97.5) }}>
          <span className={cx(st.m5, "flex")} style={{ position: "absolute", left: U(14), top: U(20), fontSize: U(30), lineHeight: U(37), color: DARK }}>
            {String(v)
              .padStart(2, "0")
              .split("")
              .map((ch, j, a) => (
                <Digit key={a.length - j} ch={ch} />
              ))}
          </span>
          <span style={{ position: "absolute", left: U(14), top: U(62), maxWidth: U(80), fontSize: U(13), lineHeight: U(16), color: DARK, whiteSpace: "nowrap" }}>
            <Fit base={13} max={76} deps={units[i]}>
              {units[i]}
            </Fit>
          </span>
        </Glass>
      ))}
      {d.when && (
        <p data-a="up" className={st.m5} style={vars({ position: "absolute", left: U(24), top: U(312.5), height: U(21), fontSize: U(17), lineHeight: U(21), color: INK, whiteSpace: "nowrap", "--d": "0.2s" })}>
          <Fit base={17} max={342} deps={d.when}>
            {d.when}
          </Fit>
        </p>
      )}
      <div data-a="up" style={vars({ position: "absolute", left: U(24), top: U(394), "--d": "0.3s" })}>
        <button
          type="button"
          className={cx(st.m5, st.pill, st.pillGlass)}
          style={{ minWidth: U(273), maxWidth: U(342), height: U(54), padding: `0 ${U(25)} 0 ${U(23)}`, gap: U(20), fontSize: U(16), borderRadius: U(27) }}
          onClick={() =>
            downloadIcs({
              title: [d.event, d.org].filter(Boolean).join(" — ") || t("Korporativ tadbir"),
              startLocal: `${d.iso}T${d.time || "10:00"}`,
              location: [d.venueTitle, d.address].filter(Boolean).join(", "),
              slug,
            })
          }
        >
          <span>{t("Kalendarga qo‘shish")}</span>
          <Arrow />
        </button>
      </div>
    </Sec>
  );
}

/* ═════════════ 04 · Dastur — har qator to‘r katagida (97.5); qatorlar to‘r chizig‘i bo‘ylab chapdan «chiziladi» ═════════════ */
function Program({ d, z, wide, beforeSeam, tail }: { d: D; z: number; wide: boolean; beforeSeam: boolean; tail: number }) {
  const t = useT();
  const n = d.program.length;
  if (!n) return null;
  return (
    <Sec z={z} tail={tail} colStyle={{ paddingTop: U(195), paddingBottom: U(40) }} outer={<SideSparks wide={wide} h={820} />}>
      <Sparks
        list={[
          [89.5, 187],
          [89.5, 195 + n * 97.5 - 8],
        ]}
      />
      <Title text={titleOf(t("Dastur"))} />
      {d.program.map((it, i) => (
        <div key={i} data-a="row" className={st.row} style={vars({ height: U(97.5), "--d": `${0.05 + i * 0.08}s` })}>
          <p className={st.pf} style={{ position: "absolute", left: U(18), top: U(28), width: U(92), fontSize: U(30), lineHeight: U(40), color: INK, whiteSpace: "nowrap" }}>
            <Fit base={30} max={90} deps={it.time}>
              {it.time}
            </Fit>
          </p>
          <div className={st.rowTx} style={{ left: U(111.5), width: U(262), gap: U(4) }}>
            <p className={cx(st.m5, st.clamp2)} style={{ fontSize: U(17), lineHeight: 1.25, color: INK }}>
              {it.title}
            </p>
            {it.note?.trim() && (
              <p className={st.clamp1} style={{ maxWidth: U(i === n - 1 && beforeSeam ? 160 : 262), fontSize: U(14), lineHeight: U(17), color: "rgba(255,255,255,.6)" }}>
                {it.note}
              </p>
            )}
          </div>
        </div>
      ))}
    </Sec>
  );
}

/* ═════════════ 05 · Spikerlar (ixtiyoriy, 0–6) — surat katagi (195) pastdan maska bilan ochiladi, ism va lavozim yonida ═════════════ */
const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => Array.from(w)[0]?.toLocaleUpperCase())
    .join("");

function Speakers({ d, z, wide, tail }: { d: D; z: number; wide: boolean; tail: number }) {
  const t = useT();
  if (!d.speakers.length) return null;
  const n = d.speakers.length;
  return (
    <Sec
      z={z}
      stop={55}
      tail={tail}
      colStyle={{ paddingTop: U(195), paddingBottom: U(40) }}
      outer={
        wide && (
          <>
            <SideSparks wide={wide} h={195 + n * 195 + 40} />
            <ObjC k="old" x={120} y={351} w={260} rot={-14} a="obj" inner={st.float} innerStyle={vars({ "--fd": "-2s" })} />
          </>
        )
      }
      seam={<ObjU k="old" x={282} y={-104} w={130} rot={-20} a="seam" sc inner={st.seamIn} />}
    >
      <Title text={titleOf(t("Spikerlar"))} />
      {d.speakers.map((s, i) => (
        <div key={i} className="relative" style={{ height: U(195) }}>
          <div data-a="mask" className={st.photo} style={vars({ left: 0, top: 0, width: U(195), height: U(195), "--d": `${0.05 + i * 0.1}s` })}>
            {s.photo ? (
              <Img src={s.photo} className={st.zoomImg} style={{ position: "absolute", left: 0, top: U(-10), height: U(243.75) }} />
            ) : (
              <span className={cx(st.pf, st.initials)} style={{ fontSize: U(64) }}>
                {initialsOf(s.name)}
              </span>
            )}
          </div>
          <span aria-hidden style={{ position: "absolute", left: U(187), top: U(-8), width: U(16), height: U(16), zIndex: 2 }}>
            <Spark left="0" top="0" size={U(16)} d={0.2 + i * 0.1} />
          </span>
          <div data-a="up" className={st.spkTx} style={vars({ left: U(211), width: U(165), gap: U(8), "--d": `${0.15 + i * 0.1}s` })}>
            <p className={cx(st.pf, st.clamp4)} style={{ fontSize: U(24), lineHeight: 1.1, color: INK, overflowWrap: "anywhere" }}>
              {s.name}
            </p>
            {s.role && (
              <p className={st.clamp3} style={{ fontSize: U(14), lineHeight: 1.35, color: "rgba(255,255,255,.75)", overflowWrap: "anywhere" }}>
                {s.role}
              </p>
            )}
          </div>
        </div>
      ))}
    </Sec>
  );
}

/* ═════════════ 06 · Manzil — zal surati (to‘r bo‘ylab), joy nomi, manzil, «Xaritada ochish» ═════════════ */
function Venue({ d, z, wide, linkable, tail }: { d: D; z: number; wide: boolean; linkable: boolean; tail: number }) {
  const t = useT();
  if (!d.hasPlace) return null;
  return (
    <Sec z={z} tail={tail} colStyle={{ paddingTop: U(97.5), paddingBottom: U(121) }} outer={<SideSparks wide={wide} h={702.5} />}>
      <Title text={titleOf(t("Manzil"))} />
      <div data-a="zoom" className="relative overflow-hidden" style={vars({ height: U(292.5), background: "#2e2e2e", "--d": "0.1s" })}>
        <Img src={d.hall} className={st.zoomImg} style={{ position: "absolute", left: U(-25), top: 0, width: U(440) }} />
      </div>
      <Sparks
        list={[
          [187, 89.5],
          [187, 382],
        ]}
      />
      {d.venueTitle && (
        <p data-a="up" className={cx(st.pf, "relative")} style={vars({ marginTop: U(20), marginLeft: U(24), width: U(342), fontSize: U(30), lineHeight: U(40), color: INK, overflowWrap: "anywhere", "--d": "0.15s" })}>
          {d.venueTitle}
        </p>
      )}
      {d.address && (
        <p data-a="up" className="relative" style={vars({ marginTop: U(10), marginLeft: U(24), width: U(342), fontSize: U(16), lineHeight: U(20), color: "rgba(255,255,255,.8)", overflowWrap: "anywhere", "--d": "0.22s" })}>
          {d.address}
        </p>
      )}
      <div data-a="up" className="relative" style={vars({ marginTop: U(47.5), marginLeft: U(24), "--d": "0.3s" })}>
        <a
          href={linkable ? d.mapUrl : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(st.m5, st.pill, st.pillWhite)}
          style={{ minWidth: U(250), maxWidth: U(342), height: U(54), padding: `0 ${U(24)}`, gap: U(20), fontSize: U(16), borderRadius: U(27) }}
        >
          <span>{t("Xaritada ochish")}</span>
          <Arrow color={DARK} />
        </a>
      </div>
    </Sec>
  );
}

/* ═════════════ 07 · Dress-kod (ixtiyoriy — o‘chirilsa joy qolmaydi): shisha karta, turi (Playfair kursiv) va izoh ═════════════ */
function Dress({ d, z, wide, tail }: { d: D; z: number; wide: boolean; tail: number }) {
  if (!d.dressNote && !d.dressCode) return null;
  return (
    <Sec z={z} tail={tail} colStyle={{ paddingTop: U(40), paddingBottom: U(51.5) }} outer={<SideSparks wide={wide} h={292.5} />}>
      <div data-a="rise" className={cx(st.glass, st.dress)} style={{ marginLeft: U(24), width: U(342), padding: `${U(30)} ${U(26)}`, gap: U(10), borderRadius: U(6) }}>
        {d.dressCode && (
          <p className={st.pf} style={{ height: U(53), fontSize: U(40), lineHeight: U(53), color: DARK, whiteSpace: "nowrap" }}>
            <Fit base={40} max={290} deps={d.dressCode}>
              {d.dressCode}
            </Fit>
          </p>
        )}
        {d.dressNote && (
          <p style={{ width: "100%", fontSize: U(17), lineHeight: 1.5, color: DARK, overflowWrap: "anywhere" }}>
            {d.dressNote}
          </p>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 08 · Anketa — shisha karta; yuborilganda kichik xrom tanga aylanib ✓ ga aylanadi ═════════════ */
function Rsvp({ d, slug, mode, z, wide }: { d: D; slug: string; mode: InvitationSiteProps["mode"]; z: number; wide: boolean }) {
  const t = useT();
  const live = mode === "live";
  const [name, setName] = useState("");
  const [status, setStatus] = useState<RsvpStatus>("coming");
  // namunada — Figma’dagidek «2»
  const [count, setCount] = useState(mode === "demo" ? 2 : 1);
  const [wish, setWish] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState<null | RsvpStatus>(null);
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    // maxsus mehmon ismi «Hurmatli …» bilan yozilgan bo‘lsa — maydonga faqat ism
    if (d.guest && !name) setName(d.guest.replace(/^\s*(hurmatli|muhtaram|qadrli|уважаемая|уважаемый|уважаемые|дорогая|дорогой|dear)\s+/i, ""));
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
      setWish(a.wish ?? "");
      setSent(a.status);
    });
  }, [live, slug]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErr(t("Ismingizni yozing"));
    setErr(null);
    const n = status === "coming" ? count : 0;
    if (!live) return setSent(status);
    setBusy(true);
    try {
      const res = await fetch(rsvpUrl(slug, token), {
        method: token ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), status, count: n, wish: wish.trim() || null }),
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
    <p className={cx(st.s6, st.lbl)} style={{ marginTop: U(mt), height: U(17), fontSize: U(14), lineHeight: U(17) }}>
      {s}
    </p>
  );
  const sub = d.rsvpUntil ? t("Iltimos, {date} javob bering", { date: d.rsvpUntil }) : t("Javobingizni kutamiz");
  return (
    <Sec
      z={z}
      stop={25}
      id="sammit-javob"
      colStyle={{ paddingTop: U(67.5), paddingBottom: U(80) }}
      outer={
        wide && (
          <>
            <SideSparks wide={wide} h={975} />
            <ObjC k="yon" x={1080} y={351} w={280} rot={20} a="obj" inner={st.float} innerStyle={vars({ "--fd": "-3s" })} />
            <ObjC k="red" x={90} y={702} w={260} a="obj" inner={st.float} innerStyle={vars({ "--fd": "-1s" })} />
          </>
        )
      }
    >
      <Sparks
        list={[
          [89.5, 187],
          [284.5, 869.5],
        ]}
      />
      <h2 className="relative m-0" style={{ marginLeft: U(24), width: U(342), color: INK }}>
        <span data-a="up" className={cx(st.pf, "block")} style={{ height: U(58), lineHeight: U(58), whiteSpace: "nowrap" }}>
          <Fit base={46} max={342} deps={t("Ishtirokingizni")}>
            {t("Ishtirokingizni")}
          </Fit>
        </span>
        <span data-a="up" className="block" style={vars({ height: U(44), lineHeight: U(44), letterSpacing: "-0.03em", whiteSpace: "nowrap", "--d": "0.1s" })}>
          <Fit base={40} max={342} deps={t("tasdiqlang")}>
            {dot(t("tasdiqlang"))}
          </Fit>
        </span>
      </h2>
      <p data-a="up" className="relative" style={vars({ marginTop: U(37.5), marginLeft: U(24), width: U(342), minHeight: U(18), fontSize: U(15), lineHeight: U(18), color: "rgba(255,255,255,.75)", overflowWrap: "anywhere", "--d": "0.15s" })}>
        {sub}
      </p>
      <div data-a="rise" className="relative" style={vars({ marginTop: U(30), marginLeft: U(24), width: U(342), "--d": "0.2s" })}>
        {sent ? (
          <div key="ok" className={cx(st.glass, st.card, st.thanks)} style={{ borderRadius: U(8), padding: `${U(48)} ${U(22)} ${U(40)}`, minHeight: U(640) }}>
            <span aria-hidden className={st.okWrap} style={{ width: U(84), height: U(84) }}>
              <span className={st.okCoin}>
                <Img src={SRC.old} eager />
              </span>
              <span className={st.okTick} style={{ fontSize: U(36) }}>
                ✓
              </span>
            </span>
            <p className={st.pf} style={{ marginTop: U(28), fontSize: U(46), lineHeight: 1.15, color: DARK }}>
              {t("Rahmat!")}
            </p>
            <p style={{ marginTop: U(14), fontSize: U(17), lineHeight: 1.5, color: DARK, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Javobingiz uchun rahmat!") : t("{name} — {count} kishi. Javobingiz yetkazildi.", { name: name.trim() || t("Javobingiz"), count })}
            </p>
            {sent !== "not_coming" && (
              <p style={{ marginTop: U(6), fontSize: U(16), lineHeight: 1.5, color: "rgba(20,20,20,.7)" }}>
                {t("Sizni kutamiz!")}
              </p>
            )}
            <button type="button" onClick={() => setSent(null)} className={cx(st.m5, st.link)} style={{ marginTop: U(28), fontSize: U(16) }}>
              {t("Javobni o‘zgartirish")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className={cx(st.glass, st.card, "relative flex flex-col items-stretch")} style={{ padding: `${U(24)} ${U(22)} ${U(56)}`, borderRadius: U(8), minHeight: U(640) }}>
            {label(t("Ismingiz"), 0)}
            <label className={st.field} style={{ marginTop: U(7), height: U(52), padding: `0 ${U(16)}`, borderRadius: U(6) }}>
              <input
                className={cx(st.m5, st.input)}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder={t("Ism va familiya")}
                aria-label={t("Ismingiz")}
                style={{ fontSize: U(16) }}
              />
            </label>
            {label(t("Kelasizmi?"), 22)}
            <div className="flex w-full" role="radiogroup" aria-label={t("Kelasizmi?")} style={{ marginTop: U(7), gap: U(8) }}>
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
                  className={cx(st.m5, st.choice)}
                  style={{ flex: "1 1 0", padding: `${U(4)} ${U(8)}`, minHeight: U(52), fontSize: U(15), borderRadius: U(26) }}
                >
                  <span style={{ overflowWrap: "anywhere" }}>{t(l)}</span>
                </button>
              ))}
            </div>
            {status === "coming" && (
              <>
                {label(t("Necha kishi bo‘lasiz?"), 22)}
                <div className={cx(st.field, "justify-between")} style={{ marginTop: U(7), height: U(52), padding: `0 ${U(6)}`, borderRadius: U(26) }}>
                  <button type="button" className={cx(st.m5, st.step)} disabled={count <= 1} onClick={() => setCount((n) => Math.max(1, n - 1))} aria-label={t("Kamaytirish")} style={{ width: U(40), height: U(40), fontSize: U(22) }}>
                    −
                  </button>
                  <span className={st.pf} style={{ fontSize: U(28), lineHeight: 1.3, color: DARK }} aria-live="polite">
                    {count}
                  </span>
                  <button type="button" className={cx(st.m5, st.step)} disabled={count >= 20} onClick={() => setCount((n) => Math.min(20, n + 1))} aria-label={t("Ko‘paytirish")} style={{ width: U(40), height: U(40), fontSize: U(22) }}>
                    +
                  </button>
                </div>
              </>
            )}
            {label(t("Savol yoki tilak"), 22)}
            <label className={st.field} style={{ marginTop: U(7), height: U(130), padding: `${U(15)} ${U(16)}`, borderRadius: U(6), alignItems: "flex-start" }}>
              <textarea
                rows={4}
                className={st.input}
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                maxLength={500}
                placeholder={t("Yozing…")}
                aria-label={t("Savol yoki tilak")}
                style={{ fontSize: U(16), height: "100%" }}
              />
            </label>
            {err && (
              <p style={{ marginTop: U(12), color: "#8a0b09", fontSize: U(15) }} role="alert">
                {err}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className={cx(st.m5, st.pill, st.pillDark)}
              style={{ width: "100%", marginTop: U(28), minHeight: U(54), padding: `${U(8)} ${U(24)}`, gap: U(16), fontSize: U(16), borderRadius: U(27), opacity: busy ? 0.7 : 1, justifyContent: "space-between" }}
            >
              <span>{busy ? t("Yuborilmoqda…") : t("Yuborish")}</span>
              <Arrow />
            </button>
          </form>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 09 · Final — ikki tanga ikki tomondan kelib to‘qnashadi va yengil uchqun chiqaradi
 * (scroll bilan: --fc 0 … 1 = Figma kadri; sahifa oxirigacha albatta tugaydi) ═════════════ */
function Final({ d, z, wide, still, onSeen }: { d: D; z: number; wide: boolean; still: boolean; onSeen: () => void }) {
  const t = useT();
  const sec = useRef<HTMLElement>(null);
  const onP = useCallback(
    (_p: number, r: DOMRect) => {
      const el = sec.current;
      if (!el) return;
      const vh = window.innerHeight || 800;
      // bo‘lim pasti ekran pastiga yetganda (yoki sahifa oxirida) tugaydi, 0.75 ekran oldin boshlanadi
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
  const bye = dot(t("Ko‘rishguncha!").replace(/[!.]+$/, ""));
  return (
    <Sec
      z={z}
      stop={40}
      secRef={sec}
      className={st.finalWrap}
      secStyle={still ? vars({ "--fc": 1 }) : undefined}
      colStyle={{ height: U(844) }}
      outer={
        wide && (
          <>
            <SideSparks wide={wide} h={844} />
            <span className={st.fSideL}>
              <ObjC k="old" x={90} y={234} w={280} rot={-10} />
            </span>
            <span className={st.fSideR}>
              <ObjC k="yon" x={1090} y={351} w={300} rot={18} />
            </span>
          </>
        )
      }
      seam={<ObjU k="old" x={250} y={-90} w={170} rot={14} a="seam" sc inner={st.seamIn} />}
    >
      <div className="absolute inset-0">
        <Sparks
          list={[
            [89.5, 284.5],
            [284.5, 284.5],
          ]}
        />
        <h2 className={cx(st.fMask, "m-0")} style={{ position: "absolute", left: U(22), top: U(137.5), height: U(66), whiteSpace: "nowrap" }}>
          <span className={st.fTitle} style={{ display: "block", height: U(52.5), lineHeight: U(52.5), letterSpacing: "-0.04em", color: INK }}>
            <Fit base={50} max={346} deps={bye}>
              {bye}
            </Fit>
          </span>
        </h2>
        {d.finalLine && (
          <p className={cx(st.pf, st.fLine)} style={{ position: "absolute", left: U(24), top: U(199.5), width: U(342), height: U(40), fontSize: U(30), lineHeight: U(40), color: INK, whiteSpace: "nowrap" }}>
            <Fit base={30} max={342} deps={d.finalLine}>
              {d.finalLine}
            </Fit>
          </p>
        )}
        <span className={st.fCoinL}>
          <ObjU k="yon" x={40} y={390} w={230} rot={-30} />
        </span>
        <span className={st.fCoinR}>
          <ObjU k="old" x={190} y={487.5} w={200} rot={10} />
        </span>
        {/* to‘qnashuv uchquni (Figma: ikki tanga orasidagi uchqun) */}
        <span className={st.fSpark} style={{ left: U(187), top: U(577), width: U(16), height: U(16) }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${P}/uchqun.svg`} alt="" draggable={false} className={st.sparkImg} />
          <span className={st.fBurst} />
        </span>
        <span className={st.fRed}>
          <ObjU k="red" x={-40} y={605} w={180} />
        </span>
        {d.org && (
          <p className={cx(st.s6, st.fOrg)} style={{ position: "absolute", right: U(24), top: U(780), maxWidth: U(260), height: U(24), fontSize: U(18), lineHeight: U(24), color: INK, whiteSpace: "nowrap", textAlign: "right" }}>
            <Fit base={18} max={260} deps={d.org}>
              {d.org}
            </Fit>
          </p>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ Musiqa tugmasi — Figma «Kumush / Musiqa tugmasi»: shisha doira 52, 4 ta qora chiziq ritmda; o‘chirilgan — 4 px ═════════════ */
const MBARS = [10, 18, 13, 20];
function SammitMusic({ m, wide, embedded }: { m: ReturnType<typeof useMusic>; wide: boolean; embedded: boolean }) {
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
      {MBARS.map((h, i) => (
        <span key={i} className={st.bar} style={vars({ "--h": `${h}px`, "--i": i })} />
      ))}
    </button>
  );
  return embedded ? <div style={{ position: "sticky", top: 0, height: 0, zIndex: 70 }}>{btn}</div> : btn;
}

/* ═════════════ Sahifa ═════════════ */
type Key = "hero" | "taklif" | "taymer" | "program" | "speakers" | "venue" | "dress" | "rsvp" | "final";
/** Chok ustidagi tanga oldingi bo‘limga kirib turadigan chuqurlik (ustun birligi) — Figma qo‘shnisi bo‘lmasa, oldingi bo‘lim pastiga joy qo‘shiladi */
const SEAM_DEPTH: Partial<Record<Key, { prev: Key; depth: number }>> = {
  speakers: { prev: "program", depth: 110 },
  final: { prev: "rsvp", depth: 135 },
};

export function SammitSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const loaded = usePreload(
    [`${P}/tanga.webp`, `${P}/shisha.webp`, `${P}/tanga-yon.webp`],
    [`${P}/zal.webp`, `${P}/uchqun.svg`, ...d.speakers.map((s) => s.photo)].filter(Boolean) as string[],
    withGate,
    wide ? "l" : "m",
  );
  useReveal(root, loaded, embedded);
  useSeamSpin(root, loaded && !embedded);
  const [loaderGone, setLoaderGone] = useState(!withGate);
  const [heroOn, setHeroOn] = useState(false);
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
  const onHero = useCallback(() => setHeroOn(true), []);

  const shown: Key[] = (["hero", "taklif", "taymer", "program", "speakers", "venue", "dress", "rsvp", "final"] as Key[]).filter((k) =>
    k === "taymer"
      ? d.hasDate
      : k === "program"
        ? d.program.length > 0
        : k === "speakers"
          ? d.speakers.length > 0
          : k === "venue"
            ? d.hasPlace
            : k === "dress"
              ? !!(d.dressNote || d.dressCode)
              : k === "rsvp"
                ? data.rsvpEnabled
                : true,
  );
  const z = (k: Key) => 6 + shown.indexOf(k);
  /** Keyingi bo‘lim chok tangasi ostida matn qolmasin: Figma qo‘shnisi bo‘lmagan oldingi bo‘lim pastiga joy (tail) */
  const tail = (k: Key) => {
    const next = shown[shown.indexOf(k) + 1];
    const s = next ? SEAM_DEPTH[next] : undefined;
    return s && s.prev !== k ? s.depth : 0;
  };
  const linkable = mode !== "preview";
  const colU = wide ? COL_L : COL_M;
  const nextOf = (k: Key) => shown[shown.indexOf(k) + 1];

  return (
    <div ref={root} className={st.root}>
      <div className={st.page} style={vars({ "--u": colU })}>
        <SammitMusic m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/tanga.webp`} />}
        <div className={st.flow}>
          {withGate && (loaded ? <Gate d={d} wide={wide} onStart={() => music.play(true)} onHero={onHero} /> : <div className={st.gateHold} />)}
          {embedded && <Gate d={d} wide={wide} still onStart={() => {}} onHero={() => {}} />}
          <Hero d={d} z={z("hero")} wide={wide} on={heroOn || embedded} still={embedded} rsvp={data.rsvpEnabled} />
          <Taklif d={d} z={z("taklif")} wide={wide} tail={tail("taklif")} />
          <Taymer d={d} z={z("taymer")} wide={wide} slug={data.slug} tail={tail("taymer")} />
          <Program d={d} z={z("program")} wide={wide} beforeSeam={nextOf("program") === "speakers"} tail={tail("program")} />
          <Speakers d={d} z={z("speakers")} wide={wide} tail={tail("speakers")} />
          <Venue d={d} z={z("venue")} wide={wide} linkable={linkable} tail={tail("venue")} />
          <Dress d={d} z={z("dress")} wide={wide} tail={tail("dress")} />
          {data.rsvpEnabled && <Rsvp d={d} slug={data.slug} mode={mode} z={z("rsvp")} wide={wide} />}
          <Final d={d} z={z("final")} wide={wide} still={embedded} onSeen={onFinal} />
        </div>
        <footer className={cx(st.footer, "flex items-start justify-center")} style={{ height: U(120), paddingTop: U(50) }}>
          <p className={cx(st.m5, "text-center")} style={{ fontSize: U(14), lineHeight: U(17), color: INK, opacity: 0.5 }}>
            <a href="https://shohnoma.uz">{t("shohnoma.uz orqali yaratilgan")}</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
