"use client";

import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
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
import { DRESS_TEXT, KIND, P, TAQVIM_DEMO, TAQVIM_DEMO_EN, TAQVIM_DEMO_RU, type Speaker, type Tile } from "./data";
import st from "./taqvim.module.css";

/* ── Birliklar ──
 * U — joriy `--u`. Bo‘limlarda — kontent ustuni (Figma mobil 390 koordinatalari; laptopda ustun = mobil × 1.2, ya’ni 468px / 1440 —
 * Figma «Kontent ustuni (mobil ×1.2)»). C — laptop kanvasi (1440) birligi: yon bezaklar (shisha plitkalar).
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

/* Ranglar (Figma «21 · Taqvim — Assets») */
const LIME = "#e4ff3a";
const INK = "#f4f7f6";
const DARK = "#0f1417";
const MUTE = "#8fa3a6";

/** Server yaratadigan standart taklif matni (php/api/lib/orders.php DEFAULT_MESSAGE) — har qaysi tilda */
const SERVER_DEFAULT = "Aziz mehmonlar! Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.";
const isServerDefault = (m: string) => (["uz", "ru", "en"] as Locale[]).some((l) => tr(l, SERVER_DEFAULT).trim() === m.trim());

const DAY_MS = 86400_000;
const isoOf = (d: Date) => d.toISOString().slice(0, 10);

/** Kalendar to‘ridagi qisqa nom: uzun nomdan birinchi so‘z («Ochilish va asosiy nutq» → «Ochilish», «Panel: …» → «Panel») */
function shortLabel(title: string) {
  const s = title.trim();
  const words = s.split(/\s+/);
  if (words.length < 2 || s.length <= 12) return s;
  return words[0].replace(/[:,.;!?–—-]+$/, "");
}
/** Ro‘yxatdan k ta teng taqsimlangan band (5 tadan 2 — 2- va 4-band: Figma’dagidek) */
function picks<T>(items: T[], k: number): T[] {
  if (items.length <= k) return items;
  return Array.from({ length: k }, (_, i) => items[Math.floor(((i + 0.25) * items.length) / k)]);
}

function useData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO = lang === "ru" ? TAQVIM_DEMO_RU : lang === "en" ? TAQVIM_DEMO_EN : TAQVIM_DEMO;
  const ex = (data.extra ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof ex[k] === "string" ? (ex[k] as string).trim() : typeof ex[k] === "number" ? String(ex[k]) : "");
  const sd = splitDate(data.date);
  // namunada — Figma’dagi mehmon («Aziz Karimov»); ?g= / ?m= bo‘lsa — o‘sha mehmon
  const guest = useGuestName(demo ? DEMO.guest : "");
  return useMemo(() => {
    const cw = calendarWords(lang);
    const listOf = (k: string) => (Array.isArray(ex[k]) ? (ex[k] as ProgramItem[]).filter((p) => p?.time && p?.title) : []);
    const exSpeakers = Array.isArray(ex.speakers) ? (ex.speakers as Speaker[]).filter((s) => s && typeof s.name === "string" && s.name.trim()) : [];
    const photos = (data.photos ?? []).filter(Boolean) as string[];
    const date = sd ? new Date(`${sd.iso}T12:00:00Z`) : null;
    // korporativ: personA — tadbir nomi, personB — kompaniya / tashkilotchi (namunadagi nomlar tarjima qilinadi, mijozniki — yo‘q)
    const event = ((demo ? t(data.personA) : data.personA) || "").trim();
    const org = ((demo ? t(data.personB ?? "") : data.personB) || "").trim();
    const program1 = (demo ? DEMO.program : listOf("program").length ? listOf("program") : ((data.program ?? []) as ProgramItem[])).slice(0, 8);
    let program2 = (demo ? DEMO.program2 : listOf("program2")).slice(0, 8);
    // ikkinchi kun: `dateEnd` (birinchi kundan 1…14 kun keyin); u yo‘q, lekin 2-kun dasturi bor bo‘lsa — ertasi kun
    let end: Date | null = null;
    if (date) {
      const raw = demo ? DEMO.dateEnd : str("dateEnd");
      const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
      const e = m ? new Date(`${m[1]}T12:00:00Z`) : null;
      const gap = e ? Math.round((e.getTime() - date.getTime()) / DAY_MS) : 0;
      if (e && gap >= 1 && gap <= 14) end = e;
      else if (program2.length) end = new Date(date.getTime() + DAY_MS);
    }
    if (!end) program2 = [];
    const days = date ? (end ? [date, end] : [date]) : [];
    const num = (d: Date) => d.getUTCDate();
    const mon = (d: Date) => cw.monthsAfterDay[d.getUTCMonth()];
    const wd = (d: Date) => cw.weekday[d.getUTCDay()];
    const low = (s: string) => s.toLocaleLowerCase(lang === "uz" ? "en" : lang);
    /** «18 fevral» / «18 февраля» / «18 February» (kun tugmalari va anketa) */
    const dayLabel = (d: Date) => `${num(d)} ${mon(d)}`;
    const time = sd?.time ?? "";
    // taymer ostida: «18–19 fevral, payshanba–juma · 10:00»
    let range = "";
    if (date) {
      const [a, b] = [date, end];
      if (lang === "en") {
        range = b
          ? `${wd(a)}–${wd(b)}, ${a.getUTCMonth() === b.getUTCMonth() ? `${num(a)}–${num(b)} ${mon(a)}` : `${num(a)} ${mon(a)} – ${num(b)} ${mon(b)}`}`
          : `${wd(a)}, ${num(a)} ${mon(a)}`;
      } else {
        const dd = b ? (a.getUTCMonth() === b.getUTCMonth() ? `${num(a)}–${num(b)} ${mon(a)}` : `${num(a)} ${mon(a)} – ${num(b)} ${mon(b)}`) : lang === "uz" ? `${num(a)}-${mon(a)}` : `${num(a)} ${mon(a)}`;
        range = `${dd}, ${b ? `${low(wd(a))}–${low(wd(b))}` : low(wd(a))}`;
      }
      if (time) range += ` · ${time}`;
    }
    // hero kalendar to‘ri: 4 plitka (Figma: har kundan ikkitadan); dastur bo‘lmasa — sana plitkalari
    let tiles: Tile[] = demo ? DEMO.tiles : [];
    if (!demo && date) {
      const mk = (items: ProgramItem[], day: number) => items.map((it) => ({ day, label: shortLabel(it.title), time: it.time }));
      if (program1.length || program2.length) tiles = program2.length ? [...mk(picks(program1, 2), 0), ...mk(picks(program2, 2), 1)] : mk(picks(program1, 4), 0);
      else tiles = days.map((d, i) => ({ day: i, label: mon(d), time: i === 0 ? time : "" }));
    }
    const k = KIND[str("kind")] ? str("kind") : "forum";
    const [kindWord, kindUntil] = KIND[k][lang] ?? KIND.forum.uz;
    const raw = (demo ? "" : data.message || "").trim();
    const custom =
      raw && !isServerDefault(raw)
        ? raw.replace(/^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Muhtaram mehmonlar!|Hurmatli mehmonlar!|Дорогие гости!|Уважаемые гости!|Dear guests!)\s*/, "").trim()
        : "";
    const message = demo ? DEMO.message : custom || (org && event ? t(MSG_ORG, { org, event }) : event ? t(MSG_NO_ORG, { event }) : t(MSG_PLAIN));
    const venueTitle = ((demo ? t(data.venueName) : data.venueName) || "").trim();
    const address = ((demo ? DEMO.address : data.address) || "").trim();
    const coords = coordsFrom(data.mapUrl);
    // javob muddati — namunada sanadan 8 kun oldin (Figma: «10-fevralgacha»)
    const deadline = demo && date ? isoOf(new Date(date.getTime() - 8 * DAY_MS)) : data.rsvpDeadline;
    // shahar: manzilning birinchi bo‘lagi (qisqa bo‘lsa)
    const city0 = address.split(",")[0]?.replace(/^(г\.|город)\s*/i, "").replace(/\s+(shahri|sh\.|tumani|viloyati)$/i, "").trim() ?? "";
    const city = demo ? DEMO.city : city0.length <= 18 && !/\d/.test(city0) ? city0 : "";
    const code = str("dressCode") || (demo ? DEMO.dressCode : "");
    const dressNote = demo ? DEMO.dressNote : str("dressNote") || (DRESS_TEXT[code] ? t(DRESS_TEXT[code]) : "");
    const speakers = demo
      ? DEMO.speakers.map((s, i) => ({ ...s, photo: `${P}/spiker${i + 1}.webp` }))
      : exSpeakers.slice(0, 6).map((s, i) => ({ name: s.name.trim(), role: (s.role ?? "").trim(), photo: photos[i] || "" }));
    return {
      event,
      org,
      kindWord: low(kindWord),
      kindUntil: low(kindUntil),
      /** hero sarlavhasidagi oy: «fevral» / «февраль» / «february» */
      month: date ? low(cw.months[date.getUTCMonth()]) : "",
      days: days.map((d) => ({ n: num(d), month: mon(d), label: dayLabel(d), iso: isoOf(d) })),
      range,
      tiles,
      /** hero: «Kelajak forumi 2027 · Toshkent» */
      heroLine: [event, city].filter(Boolean).join(" · "),
      /** final: «Nexa Hub · Toshkent» */
      finalLine: [venueTitle || org, city].filter((x, i, a) => x && a.indexOf(x) === i).join(" · "),
      hasDate: !!date,
      iso: sd?.iso ?? "",
      time,
      target: data.date ? tashkentDate(data.date).getTime() : null,
      guest,
      message,
      /** imzo: «Nexa Hub jamoasi» */
      sign: org ? t(SIGN_ORG, { org }) : "",
      venueTitle,
      address,
      hasPlace: !!(venueTitle || address || data.mapUrl),
      mapUrl: data.mapUrl || `https://yandex.uz/maps/?text=${encodeURIComponent([venueTitle, address].filter(Boolean).join(", "))}`,
      taxi: coords
        ? `https://3.redirect.appmetrica.yandex.com/route?end-lat=${coords.lat}&end-lon=${coords.lon}&appmetrica_tracking_id=1178268795219780156`
        : `https://yandex.uz/maps/?rtext=~${encodeURIComponent([address, venueTitle].filter(Boolean).join(", "))}&rtt=taxi`,
      programs: [program1, program2].filter((p, i) => i === 0 || p.length) as ProgramItem[][],
      speakers,
      dressCode: DRESS_TEXT[code] || str("dressCode") ? low(t(code)) : "",
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

/* ═════════════ Shisha plitka (Figma «Plitka»: oq 8% fon, 14% chegara, backdrop-blur 9) ═════════════ */
function Glass({ style, className, r = 16 }: { style?: CSSProperties; className?: string; r?: number }) {
  return <span aria-hidden className={cx(st.glass, className)} style={{ borderRadius: U(r), ...style }} />;
}

/** Sana plitkasi: katta raqam, qisqa nom va vaqt (Figma «Plitka · 18 Ochilish»: 80×80, 30 / 12 / 12) */
function DayTile({ n, label, time, tone }: { n: number | string; label: string; time?: string; tone: "lime" | "white" | "glass" }) {
  return (
    <span className={cx(st.dayTile, st[tone])} style={{ borderRadius: U(16), gap: U(1) }}>
      <span style={{ fontSize: U(30), lineHeight: 1 }}>{n}</span>
      <span className={st.m5} style={{ maxWidth: U(74), height: U(15), fontSize: U(12), lineHeight: 1.25, whiteSpace: "nowrap" }}>
        <Fit base={12} max={74} deps={label}>
          {label}
        </Fit>
      </span>
      {time && <span style={{ fontSize: U(12), lineHeight: 1.25 }}>{time}</span>}
    </span>
  );
}

/* ═════════════ 00 · Ochilish — lime plitka (faqat scroll bilan, --o: 0…1) ═════════════
 * Yuklanganda (bosishsiz): qorong‘ida to‘rtta shisha plitka navbat bilan paydo bo‘ladi (fade + scale 0.9→1, stagger 0.1 s),
 * o‘rtadagi lime «18 fevral» plitkasi atrofida yengil nur pulsatsiyasi — oxirgi holat = Figma kadri.
 * Scroll (rAF lerp): 0…0.46 — lime plitka ekran bo‘ylab kengayadi (clip-path: plitka → butun ekran, burchaklar to‘g‘rilanadi),
 * sana kattalashib markazga keladi, shisha plitkalar chetga suriladi; lime ekranni to‘liq yopgach qorong‘i qatlam o‘chadi (ko‘rinmaydi);
 * 0.48…1 — lime ekran (sana bilan) yuqoriga «surilib» ketadi va ostidan hero (01) chiqadi — u aynan ekran tepasida turadi
 * (o‘rama keyingi bo‘limni 100svh qoplaydi). Yarim shaffof o‘tish yo‘q — qattiq chegara. */
const GATE = {
  m: { W: 390, H: 844, S: 1, OX: 0 },
  l: { W: 1440, H: 1013, S: 1.2, OX: 486 },
} as const;
const A_END = 0.46;
const B0 = 0.48;
/** kengayish — darrov boshlanadi va sekin to‘liq ekranga yetadi (har kadrda sezilarli o‘zgarish, «o‘lik» oraliq yo‘q) */
const easeOut = (x: number) => 1 - Math.pow(1 - x, 1.35);

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
      el.style.setProperty("--ex", easeOut(seg(o, 0, A_END)).toFixed(4));
      // yuqoriga surilish — tezlashib (ease-in): lime pastki cheti hech qachon hero tepasidan yuqoriga o‘tmaydi
      el.style.setProperty("--w", Math.pow(seg(o, B0, 1), 1.5).toFixed(4));
      el.style.setProperty("--dk", o >= A_END ? "0" : "1");
      el.style.pointerEvents = o > 0.1 ? "none" : "";
      if (!started && o > 0.004) {
        started = true;
        cb.current.onStart();
      }
      if (!hero && o > 0.46) {
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
  // laptop kanvas koordinatalari (lime nur)
  const Xc = (x: number) => `calc(50% + ${U(x - W / 2)})`;
  const Yc = (y: number) => `calc(100% - ${U(H - y)})`;
  const day = d.days[0];
  // lime plitka (Figma: 125, 330, 140×140, r 28) → butun ekran
  const half = 70 * S;
  const clip = `inset(calc((100% - ${U(H - S * 330)}) * (1 - var(--ex))) calc((50% - ${U(half)}) * (1 - var(--ex))) calc(${U(H - S * 470)} * (1 - var(--ex))) calc((50% - ${U(half)}) * (1 - var(--ex))) round calc(${U(28 * S)} * (1 - var(--ex))))`;
  const tiles: [number, number, number, number][] = [
    [60, 230, -1, -1],
    [262, 230, 1, -1],
    [60, 500, -1, 1],
    [262, 500, 1, 1],
  ];
  return (
    <div
      ref={wrap}
      className={cx(st.gateWrap, still && st.still)}
      style={vars(still ? { "--u": pageU, "--o": 0, "--ex": 0, "--w": 0, "--dk": 1, height: U(H) } : { "--u": `min(${pageU}, calc(100svh / ${H}))` })}
    >
      <div className={st.gate} aria-label={t("Taklifnoma")} style={still ? { position: "relative", height: "100%" } : undefined}>
        <div className={st.gDark}>
          {/* lime nur (Figma «Lime nur»: blur 55 li doira, 12%) */}
          <span aria-hidden className={st.gGlow} style={wide ? { left: Xc(370), top: Yc(200), width: U(700), height: U(500), opacity: 2 / 3, filter: `blur(${U(80)})` } : { left: X(45), top: Y(250), width: U(300), height: U(300) }} />
          {tiles.map(([x, y, sx, sy], i) => (
            <span key={i} className={st.gTileMove} style={vars({ left: X(x), top: Y(y), width: Z(68), height: Z(68), "--dx": sx * 120 * S, "--dy": sy * 170 * S })}>
              <Glass className={st.gTile} r={14 * S} style={vars({ inset: 0, "--gd": `${0.1 + i * 0.1}s` })} />
            </span>
          ))}
          {/* lime plitka atrofidagi nur pulsatsiyasi (scroll boshlanishi bilan so‘nadi) */}
          <span aria-hidden className={st.gHalo} style={{ left: X(125), top: Y(330), width: Z(140), height: Z(140), borderRadius: Z(28) }} />
          {(d.org || d.event) && (
            <div className={cx(st.gIn, "text-center")} style={vars({ left: X(24), width: Z(342), top: Y(742), "--gd": "0.55s" })}>
              <div className={st.gText}>
              <p className={cx(st.b7, st.clamp2)} style={{ fontSize: Z(18), lineHeight: 1.366, color: LIME, textWrap: "balance" }}>
                {d.org || d.event}
              </p>
              {d.org && d.event && (
                <p className={st.clamp2} style={{ marginTop: Z(3.4), fontSize: Z(15), lineHeight: 1.366, color: INK, opacity: 0.7, textWrap: "balance" }}>
                  {d.event}
                </p>
              )}
              </div>
            </div>
          )}
        </div>
        {/* lime plitka → butun ekran → yuqoriga surilib ketadi */}
        <div className={st.gLimeIn} style={{ transformOrigin: `50% ${Y(400)}` }}>
          <div className={st.gLime} style={{ clipPath: clip, WebkitClipPath: clip }}>
            {day && (
              <div className={st.gDate} style={{ top: `calc((100% - ${U(H - S * 400)}) * (1 - var(--ex)) + 50% * var(--ex))`, gap: Z(1) }}>
                <span style={{ fontSize: Z(72), lineHeight: 1 }}>{day.n}</span>
                <span className={st.s6} style={{ fontSize: Z(17), lineHeight: 1.25 }}>
                  {day.month}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════ Bo‘lim qobig‘i ═════════════ */
type Bg = "bg0" | "bg1";
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

/** Laptop yon bezaklari: ikki tomonda 3 ustunli shisha plitkalar (1440 kanvas; tashqi ustun — eng yorqin) */
const SIDE_X = [70, 175, 280];
function SideTiles({ wide, rows, op }: { wide: boolean; rows: number[]; op: [number, number, number] }) {
  if (!wide) return null;
  return (
    <div aria-hidden className={st.deco}>
      {rows.flatMap((y, r) =>
        SIDE_X.flatMap((x, i) => [
          <Glass key={`l${r}${i}`} className={st.side} r={19 * 1.2} style={vars({ left: `calc(50% + ${C(x - 720)})`, top: C(y), width: C(96), height: C(96), opacity: op[i], "--gd": `${(r + i) * 0.06}s`, borderRadius: C(19) })} />,
          <Glass key={`r${r}${i}`} className={st.side} r={19 * 1.2} style={vars({ left: `calc(50% + ${C(1344 - x - 720)})`, top: C(y), width: C(96), height: C(96), opacity: op[i], "--gd": `${(r + i) * 0.06}s`, borderRadius: C(19) })} />,
        ]),
      )}
    </div>
  );
}

/** Chok ustidagi shisha plitkalar — bo‘limlarni bog‘laydi (Figma «Plitka · chok ustida»): [x, y, o‘lcham, radius] */
function Seam({ tiles }: { tiles: [number, number, number, number][] }) {
  return (
    <>
      {tiles.map(([x, y, s, r], i) => (
        <span key={i} data-a="seam" className={st.seam} style={vars({ left: U(x), top: U(y), width: U(s), height: U(s), "--d": `${i * 0.12}s` })}>
          <Glass r={r} style={{ inset: 0 }} />
        </span>
      ))}
    </>
  );
}

/** Bo‘lim sarlavhasi (Manrope SemiBold, kichik harflarda, markazda, 360 da sig‘adi) */
function Title({ text, size = 64, d = 0 }: { text: string; size?: number; d?: number }) {
  return (
    <h2 data-a="up" className={cx(st.s6, st.title, "m-0 text-center")} style={vars({ height: U(size), "--d": `${d}s` })}>
      <span className="block" style={{ height: U(size), lineHeight: U(size), whiteSpace: "nowrap" }}>
        <Fit base={size} max={342} deps={text}>
          {text}
        </Fit>
      </span>
    </h2>
  );
}

/* ═════════════ 01 · Hero — kalendar to‘ri: «fevral / forum» pastdan ko‘tariladi, shisha plitkalar diagonal bo‘yicha birin-ketin
 * yig‘iladi (40 ms), tadbir plitkalari ag‘darilib (rotateY 180°→0) sana va sessiyani ko‘rsatadi; zal surati sekin zoom (1.08→1, 8 s);
 * laptopda kursor bilan yengil parallaks ═════════════ */
const GRID_X = [24, 111.333, 198.667, 286];
const GRID_Y = [262, 349.333, 436.667, 524, 611.333];
/** Tadbir plitkalari joyi (ustun, qator) va rangi — Figma: 18 Ochilish (lime), 18 Panellar, 19 Master-klass (oq), 19 Networking (lime) */
const SLOTS: [number, number, boolean][] = [
  [1, 0, true],
  [3, 1, false],
  [0, 2, false],
  [2, 3, true],
];

function Hero({ d, z, wide, on, still }: { d: D; z: number; wide: boolean; on: boolean; still: boolean }) {
  const ptr = usePointer(wide && !still);
  const placed = new Map<string, { tile: Tile; lime: boolean; k: number }>();
  d.tiles.slice(0, 4).forEach((tile, k) => placed.set(`${SLOTS[k][0]}:${SLOTS[k][1]}`, { tile, lime: SLOTS[k][2], k }));
  return (
    <section className={cx(st.sec, st.hero, (on || still) && st.on, still && st.noAnim)} style={vars({ zIndex: z, "--mx": ptr.x.toFixed(3), "--my": ptr.y.toFixed(3) })}>
      <div aria-hidden className={st.fill}>
        <div className={st.heroBg}>
          <Img src={`${P}/fon.webp`} eager />
        </div>
        <span className={st.shade} />
      </div>
      <SideTiles wide={wide} rows={[314, 419, 524, 629, 734]} op={[0.9, 0.68, 0.45]} />
      <div className={st.col} style={{ width: U(390), height: U(890) }}>
        {d.month && (
          <p className={cx(st.mask, "absolute inset-x-0 text-center")} style={{ top: U(70) }}>
            <span className={st.rise} style={vars({ fontSize: U(44), lineHeight: 1, letterSpacing: "-0.03em", color: INK, "--d": "0.1s" })}>
              {d.month}
            </span>
          </p>
        )}
        <h1 className={cx(st.mask, st.s6, "absolute inset-x-0 m-0 text-center")} style={{ top: U(112) }}>
          <span className={st.rise} style={vars({ fontSize: U(112), lineHeight: 1, letterSpacing: "-0.05em", color: INK, "--d": "0.22s" })}>
            <Fit base={112} max={342} deps={d.kindWord}>
              {d.kindWord}
            </Fit>
          </span>
        </h1>
        <div className={st.grid}>
          {GRID_Y.flatMap((y, r) =>
            GRID_X.map((x, c) => {
              const p = placed.get(`${c}:${r}`);
              const di = r + c;
              const day = p ? d.days[p.tile.day] ?? d.days[0] : null;
              return p && day ? (
                <span key={`${c}${r}`} className={st.flip} style={vars({ left: U(x), top: U(y), width: U(80), height: U(80), "--i": di, "--k": p.k })}>
                  <span className={st.flipIn}>
                    <span className={st.face}>
                      <DayTile n={day.n} label={p.tile.label} time={p.tile.time} tone={p.lime ? "lime" : "white"} />
                    </span>
                    <span className={cx(st.face, st.back)}>
                      <Glass style={{ inset: 0 }} />
                    </span>
                  </span>
                </span>
              ) : (
                <span key={`${c}${r}`} className={st.cell} style={vars({ left: U(x), top: U(y), width: U(80), height: U(80), "--i": di })}>
                  <Glass style={{ inset: 0 }} />
                </span>
              );
            }),
          )}
        </div>
        {d.heroLine && (
          <p className={cx(st.m5, st.hIn, st.clamp2, "absolute text-center")} style={vars({ left: U(24), width: U(342), top: U(730), fontSize: U(17), lineHeight: 1.366, color: INK, textWrap: "balance", "--d": "0.9s" })}>
            {d.heroLine}
          </p>
        )}
        {d.org && (
          <p className={cx(st.b7, st.hIn, st.clamp2, "absolute text-center")} style={vars({ left: U(24), width: U(342), top: U(800), fontSize: U(18), lineHeight: 1.366, color: LIME, textWrap: "balance", "--d": "1s" })}>
            {d.org}
          </p>
        )}
      </div>
    </section>
  );
}

/* ═════════════ 02 · Taklif — murojaat (mehmon ismi bilan), matn, imzo ═════════════ */
function Taklif({ d, z }: { d: D; z: number }) {
  const t = useT();
  const hello = d.guest ? guestHello(t, "Hurmatli {guest}!", d.guest) : t("Hurmatli mehmon!");
  // Figma: «Hurmatli / Aziz Karimov!» — murojaat so‘zi alohida qatorda (ruschada murojaat — faqat ism: ism bo‘linmaydi)
  const words = hello.trim().split(/\s+/);
  const l1 = words.length > 2 ? words[0] : "";
  const l2 = words.length > 2 ? words.slice(1).join(" ") : hello;
  return (
    <Sec
      z={z}
      bg="bg1"
      colStyle={{ paddingTop: U(96), paddingBottom: U(147) }}
      outer={
        <div className={st.col} style={{ width: U(390), position: "absolute", left: 0, right: 0, top: 0, height: 0, zIndex: 3 }}>
          <Seam
            tiles={[
              [258, -28, 56, 11],
              [322, -20, 40, 8],
            ]}
          />
        </div>
      }
    >
      <h2 data-a="up" className={cx(st.s6, "m-0 text-center")} style={vars({ color: INK, letterSpacing: "-0.03em", "--d": "0.05s" })}>
        {l1 && (
          <span className="block" style={{ height: U(43.2), lineHeight: U(43.2), whiteSpace: "nowrap" }}>
            <Fit base={40} max={342} deps={l1}>
              {l1}
            </Fit>
          </span>
        )}
        <Lines text={l2} base={40} max={342} lh={43.2} />
      </h2>
      <p data-a="up" className="relative mx-auto text-center" style={vars({ marginTop: U(38), width: U(330), fontSize: U(18), lineHeight: 1.55, color: INK, overflowWrap: "anywhere", whiteSpace: "pre-line", "--d": "0.12s" })}>
        {d.message}
      </p>
      {d.sign && (
        <p data-a="up" className={cx(st.s6, "relative mx-auto text-center")} style={vars({ marginTop: U(82.6), width: U(342), fontSize: U(17), lineHeight: 1.366, color: LIME, overflowWrap: "anywhere", "--d": "0.2s" })}>
          {d.sign}
        </p>
      )}
    </Sec>
  );
}

/* ═════════════ 03 · Taymer — oq plitkalardagi raqamlar pastga varaqlanadi (slide-up 0.3 s); raqamlar doim 2 xonali ═════════════ */
/** Bitta raqam: o‘zgarsa — eskisi yuqoriga chiqib ketadi, yangisi pastdan kiradi (ikkalasi bir vaqtda — bo‘sh kadr yo‘q) */
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

function Taymer({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const units = timerUnits(useLocale());
  const c = useCountdown(d.target);
  if (!d.hasDate || !c) return null;
  const vals = [c.d, c.h, c.m, c.s];
  return (
    <Sec z={z} bg="bg0" colStyle={{ paddingTop: U(90), paddingBottom: U(154) }} outer={<SideTiles wide={wide} rows={[140, 245]} op={[0.55, 0.41, 0.28]} />}>
      <Title text={d.kindUntil} size={60} />
      <div className="relative flex justify-center" style={{ marginTop: U(50), gap: U(10) }}>
        {vals.map((v, i) => (
          <div key={i} data-a="tile" className={st.timer} style={vars({ minWidth: U(78), height: U(96), padding: `0 ${U(6)}`, borderRadius: U(16), gap: U(1), "--d": `${0.05 + i * 0.08}s` })}>
            <span className="flex" style={{ fontSize: U(36), lineHeight: 1 }}>
              {String(v)
                .padStart(2, "0")
                .split("")
                .map((ch, j, a) => (
                  <Digit key={a.length - j} ch={ch} />
                ))}
            </span>
            <span className={st.m5} style={{ fontSize: U(13), lineHeight: 1.25, whiteSpace: "nowrap" }}>
              {units[i]}
            </span>
          </div>
        ))}
      </div>
      {d.range && (
        <p data-a="up" className={cx(st.m5, "text-center")} style={vars({ marginTop: U(34), height: U(23), fontSize: U(17), lineHeight: U(23), color: INK, whiteSpace: "nowrap", "--d": "0.15s" })}>
          <Fit base={17} max={342} deps={d.range}>
            {d.range}
          </Fit>
        </p>
      )}
      <div data-a="up" className="flex justify-center" style={vars({ marginTop: U(37), "--d": "0.25s" })}>
        <button
          type="button"
          className={cx(st.b7, st.btnLime)}
          style={{ minWidth: U(250), maxWidth: U(342), height: U(56), padding: `0 ${U(22)}`, fontSize: U(16), borderRadius: U(18) }}
          onClick={() =>
            downloadIcs({
              title: [d.event, d.org].filter(Boolean).join(" — ") || t("Korporativ tadbir"),
              startLocal: `${d.iso}T${d.time || "10:00"}`,
              location: [d.venueTitle, d.address].filter(Boolean).join(", "),
              slug: "taqvim",
            })
          }
        >
          {t("Kalendarga qo‘shish")}
        </button>
      </div>
    </Sec>
  );
}

/* ═════════════ 04 · Dastur — kun tugmalari (2 kun bo‘lsa): bosilsa ro‘yxat yon tomonga siljib almashadi, qatorlar stagger bilan ═════════════ */
function Session({ it, i, anim }: { it: ProgramItem; i: number; anim: boolean }) {
  return (
    <div data-a={anim ? "row" : undefined} className={cx(st.session, !anim && st.rowIn)} style={vars({ padding: U(18), gap: U(16), borderRadius: U(20), "--d": `${0.05 + i * 0.07}s` })}>
      <p className={st.s6} style={{ flex: "none", width: U(74), fontSize: U(24), lineHeight: 1.366, color: LIME, whiteSpace: "nowrap" }}>
        {it.time}
      </p>
      <div className="min-w-0 flex-1" style={{ display: "flex", flexDirection: "column", gap: U(3) }}>
        <p className={cx(st.s6, st.clamp2)} style={{ fontSize: U(17), lineHeight: 1.3, color: INK }}>
          {it.title}
        </p>
        {it.note?.trim() && (
          <p className={st.clamp2} style={{ fontSize: U(14), lineHeight: 1.366, color: MUTE }}>
            {it.note}
          </p>
        )}
      </div>
    </div>
  );
}

function Program({ d, z }: { d: D; z: number }) {
  const t = useT();
  const [day, setDay] = useState(0);
  const [dir, setDir] = useState(1);
  const [switched, setSwitched] = useState(false);
  const progs = d.programs;
  if (!progs.some((p) => p.length)) return null;
  const two = progs.length > 1 && d.days.length > 1;
  const cur = progs[Math.min(day, progs.length - 1)] ?? [];
  const go = (i: number) => {
    if (i === day) return;
    setDir(i > day ? 1 : -1);
    setDay(i);
    setSwitched(true);
  };
  return (
    <Sec
      z={z}
      bg="bg1"
      colStyle={{ paddingTop: U(90), paddingBottom: U(80) }}
      outer={
        <div className={st.col} style={{ width: U(390), position: "absolute", left: 0, right: 0, top: 0, height: 0, zIndex: 3 }}>
          <Seam
            tiles={[
              [30, -24, 48, 10],
              [86, -32, 64, 13],
            ]}
          />
        </div>
      }
    >
      <Title text={t("Dastur").toLocaleLowerCase()} />
      {two && (
        <div data-a="up" className="relative mx-auto flex justify-center" role="tablist" style={vars({ marginTop: U(42), gap: U(8), "--d": "0.1s" })}>
          {d.days.slice(0, 2).map((x, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={day === i}
              onClick={() => go(i)}
              className={cx(st.b7, st.pill, day === i && st.pillOn)}
              style={{ width: U(140), height: U(48), fontSize: U(16), borderRadius: U(24) }}
            >
              {x.label}
            </button>
          ))}
        </div>
      )}
      <div className="relative mx-auto" style={{ marginTop: U(two ? 26 : 42), width: U(342) }}>
        <div key={day} className={cx("flex flex-col", switched && (dir > 0 ? st.slideL : st.slideR))} style={{ gap: U(10) }}>
          {cur.map((it, i) => (
            <Session key={`${day}-${i}`} it={it} i={i} anim={!switched} />
          ))}
        </div>
      </div>
    </Sec>
  );
}

/* ═════════════ 05 · Spikerlar (ixtiyoriy, 0–6) — kartalar pastdan ko‘tariladi, surat maska bilan ochiladi ═════════════ */
const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => Array.from(w)[0]?.toLocaleUpperCase())
    .join("");

function Speakers({ d, z }: { d: D; z: number }) {
  const t = useT();
  if (!d.speakers.length) return null;
  return (
    <Sec z={z} bg="bg0" colStyle={{ paddingTop: U(90), paddingBottom: U(68) }}>
      <Title text={t("Spikerlar").toLocaleLowerCase()} />
      <div className="relative mx-auto flex flex-col" style={{ marginTop: U(46), width: U(342), gap: U(16) }}>
        {d.speakers.map((s, i) => (
          <div key={i} data-a="rise" className={st.card} style={vars({ minHeight: U(140), padding: `${U(35)} ${U(14)} ${U(14)} ${U(131)}`, borderRadius: U(24), "--d": `${0.05 + i * 0.1}s` })}>
            <div data-a="mask" className={st.photo} style={vars({ left: U(11), top: U(11), width: U(104), height: U(116), borderRadius: U(16), "--d": `${0.25 + i * 0.1}s` })}>
              {s.photo ? (
                <Img src={s.photo} className={st.zoomImg} style={{ height: U(130) }} />
              ) : (
                <span className={cx(st.s6, st.initials)} style={{ fontSize: U(38) }}>
                  {initialsOf(s.name)}
                </span>
              )}
            </div>
            <p className={st.s6} style={{ fontSize: U(21), lineHeight: 1.2, letterSpacing: "-0.02em", color: INK, overflowWrap: "anywhere" }}>
              {s.name}
            </p>
            {s.role && (
              <p style={{ marginTop: U(6), fontSize: U(15), lineHeight: 1.4, color: MUTE, overflowWrap: "anywhere" }}>
                {s.role}
              </p>
            )}
          </div>
        ))}
      </div>
    </Sec>
  );
}

/* ═════════════ 06 · Manzil — zal surati, joy nomi, manzil, xarita va yo‘nalish ═════════════ */
function Venue({ d, z, wide, linkable }: { d: D; z: number; wide: boolean; linkable: boolean }) {
  const t = useT();
  if (!d.hasPlace) return null;
  return (
    <Sec z={z} bg="bg1" colStyle={{ paddingTop: U(90), paddingBottom: U(78) }} outer={<SideTiles wide={wide} rows={[140, 245]} op={[0.55, 0.41, 0.28]} />}>
      <Title text={t("Manzil").toLocaleLowerCase()} />
      <div data-a="zoom" className="relative mx-auto overflow-hidden" style={vars({ marginTop: U(42), width: U(342), height: U(228), borderRadius: U(24), background: "#0a1214", "--d": "0.1s" })}>
        <Img src={d.hall} className={st.zoomImg} />
      </div>
      {d.venueTitle && (
        <p data-a="up" className={cx(st.s6, "mx-auto text-center")} style={vars({ marginTop: U(28), width: U(342), fontSize: U(28), lineHeight: 1.1, letterSpacing: "-0.03em", color: INK, overflowWrap: "anywhere", textWrap: "balance", "--d": "0.15s" })}>
          {d.venueTitle}
        </p>
      )}
      {d.address && (
        <p data-a="up" className="mx-auto text-center" style={vars({ marginTop: U(17.2), width: U(342), fontSize: U(17), lineHeight: 1.5, color: INK, opacity: 0.85, overflowWrap: "anywhere", textWrap: "balance", "--d": "0.22s" })}>
          {d.address}
        </p>
      )}
      <div data-a="up" className="relative mx-auto flex" style={vars({ marginTop: U(35), width: U(342), gap: U(12), "--d": "0.3s" })}>
        <a
          href={linkable ? d.mapUrl : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(st.b7, st.btnLime)}
          style={{ flex: "1 1 0", minWidth: 0, height: U(56), padding: `0 ${U(10)}`, fontSize: U(16), borderRadius: U(18) }}
        >
          {t("Xaritada ochish")}
        </a>
        <a
          href={linkable ? d.taxi : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(st.b7, st.btnGlass)}
          style={{ flex: "1 1 0", minWidth: 0, height: U(56), padding: `0 ${U(10)}`, fontSize: U(16), borderRadius: U(18) }}
        >
          {t("Yo‘nalish")}
        </a>
      </div>
    </Sec>
  );
}

/* ═════════════ 07 · Dress-kod (ixtiyoriy — o‘chirilsa joy qolmaydi): shisha karta, turi (lime) va izoh ═════════════ */
function Dress({ d, z }: { d: D; z: number }) {
  if (!d.dressNote && !d.dressCode) return null;
  return (
    <Sec z={z} bg="bg1" colStyle={{ paddingTop: U(20), paddingBottom: U(84) }}>
      <div data-a="rise" className={cx(st.dress, "relative mx-auto flex flex-col items-center text-center")} style={{ width: U(342), padding: `${U(30)} ${U(26)}`, gap: U(10), borderRadius: U(24) }}>
        {d.dressCode && (
          <p className={st.s6} style={{ height: U(46.4), fontSize: U(34), lineHeight: U(46.4), letterSpacing: "-0.03em", color: LIME, whiteSpace: "nowrap" }}>
            <Fit base={34} max={288} deps={d.dressCode}>
              {d.dressCode}
            </Fit>
          </p>
        )}
        {d.dressNote && (
          <p style={{ width: "100%", fontSize: U(18), lineHeight: 1.5, color: INK, overflowWrap: "anywhere" }}>
            {d.dressNote}
          </p>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 08 · Anketa — «Kelaman» va kun tugmalari lime rangga «to‘ladi»; yuborilganda kichik lime plitka ✓ bilan uchib chiqadi ═════════════ */
const DAYS_RE = /^(?:Kunlar|Дни|Days): ([^\n]*)\n?/;
function Rsvp({ d, slug, mode, z }: { d: D; slug: string; mode: InvitationSiteProps["mode"]; z: number }) {
  const t = useT();
  const live = mode === "live";
  const two = d.days.length > 1;
  const [name, setName] = useState("");
  const [status, setStatus] = useState<RsvpStatus>("coming");
  const [count, setCount] = useState(1);
  const [pick, setPick] = useState<boolean[]>(() => d.days.map(() => true));
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
      const m = (a.wish ?? "").match(DAYS_RE);
      setName(a.name);
      setStatus(a.status === "not_coming" ? "not_coming" : "coming");
      setCount(a.count || 1);
      if (m) setPick(d.days.map((x) => m[1].includes(x.label)));
      setWish((a.wish ?? "").replace(DAYS_RE, ""));
      setSent(a.status);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, slug]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErr(t("Ismingizni yozing"));
    if (status === "coming" && two && !pick.some(Boolean)) return setErr(t("Kamida bitta kunni tanlang"));
    setErr(null);
    const n = status === "coming" ? count : 0;
    const chosen = d.days.filter((_, i) => pick[i]).map((x) => x.label);
    // ikki kunlik tadbir: tanlangan kunlar javob izohining boshida (tashkilotchi kabinetda ko‘radi)
    const note = [status === "coming" && two ? t("Kunlar: {days}", { days: chosen.join(", ") }) : "", wish.trim()].filter(Boolean).join("\n");
    if (!live) return setSent(status);
    setBusy(true);
    try {
      const res = await fetch(rsvpUrl(slug, token), {
        method: token ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), status, count: n, wish: note || null }),
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
    <p className={cx(st.s6, st.lbl)} style={{ marginTop: U(mt), height: U(19), fontSize: U(14), lineHeight: U(19) }}>
      {s}
    </p>
  );
  const sub = d.rsvpUntil ? t("Iltimos, {date} javob bering", { date: d.rsvpUntil }) : t("Javobingizni kutamiz");
  const q = t("Ishtirok etasizmi?").toLocaleLowerCase();
  const qs = split2(q);
  return (
    <Sec
      z={z}
      bg="bg0"
      id="taqvim-javob"
      colStyle={{ paddingTop: U(88), paddingBottom: U(30) }}
      outer={
        <div className={st.col} style={{ width: U(390), position: "absolute", left: 0, right: 0, top: 0, height: 0, zIndex: 3 }}>
          <Seam tiles={[[300, -30, 60, 12]]} />
        </div>
      }
    >
      <h2 data-a="up" className={cx(st.s6, "m-0 text-center")} style={vars({ color: INK, letterSpacing: "-0.05em", "--d": "0.05s" })}>
        {(qs ?? [q]).map((l, i) => (
          <span key={i} className="block" style={{ height: U(52), lineHeight: U(52), whiteSpace: "nowrap" }}>
            <Fit base={52} max={342} deps={l}>
              {l}
            </Fit>
          </span>
        ))}
      </h2>
      <p data-a="up" className="mx-auto text-center" style={vars({ marginTop: U(qs ? 32 : 84), width: U(342), minHeight: U(22), fontSize: U(16), lineHeight: 1.366, color: MUTE, overflowWrap: "anywhere", "--d": "0.12s" })}>
        {sub}
      </p>
      <div data-a="rise" className="relative mx-auto" style={vars({ marginTop: U(24), width: U(342), "--d": "0.2s" })}>
        {sent ? (
          <div key="ok" className={cx(st.card, st.thanks)} style={{ borderRadius: U(28), padding: `${U(34)} ${U(24)} ${U(30)}`, minHeight: U(300) }}>
            <span aria-hidden className={st.okTile} style={{ width: U(72), height: U(72), borderRadius: U(18), fontSize: U(34) }}>
              ✓
            </span>
            <p className={st.s6} style={{ marginTop: U(24), fontSize: U(40), lineHeight: 1.08, letterSpacing: "-0.03em", color: INK }}>
              {t("Rahmat!")}
            </p>
            <p style={{ marginTop: U(12), fontSize: U(17), lineHeight: 1.5, color: INK, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Javobingiz uchun rahmat!") : t("{name} — {count} kishi. Javobingiz yetkazildi.", { name: name.trim() || t("Javobingiz"), count })}
            </p>
            {sent !== "not_coming" && (
              <p style={{ marginTop: U(6), fontSize: U(16), lineHeight: 1.5, color: MUTE }}>
                {t("Sizni kutamiz!")}
              </p>
            )}
            <button type="button" onClick={() => setSent(null)} className={cx(st.b7, st.link)} style={{ marginTop: U(24), fontSize: U(16) }}>
              {t("Javobni o‘zgartirish")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className={cx(st.card, st.formCard, "relative flex flex-col items-stretch")} style={{ padding: `${U(22)} ${U(21)} ${U(24)}`, borderRadius: U(28) }}>
            {label(t("Ismingiz"), 0)}
            <label className={st.field} style={{ marginTop: U(5), height: U(54), padding: `0 ${U(15)}`, borderRadius: U(14) }}>
              <input
                className={cx(st.s6, st.input)}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder={t("Ism va familiya")}
                aria-label={t("Ismingiz")}
                style={{ fontSize: U(17) }}
              />
            </label>
            {label(t("Kelasizmi?"), 22)}
            <div className="flex w-full" role="radiogroup" aria-label={t("Kelasizmi?")} style={{ marginTop: U(5), gap: U(8) }}>
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
                  className={cx(st.b7, st.choice)}
                  style={{ flex: "1 1 0", padding: `${U(4)} ${U(6)}`, minHeight: U(54), fontSize: U(16), borderRadius: U(18) }}
                >
                  <span style={{ overflowWrap: "anywhere" }}>{t(l)}</span>
                </button>
              ))}
            </div>
            {status === "coming" && two && (
              <>
                {label(t("Qaysi kunlari?"), 22)}
                <div className="flex w-full" style={{ marginTop: U(5), gap: U(8) }}>
                  {d.days.map((x, i) => (
                    <button
                      key={i}
                      type="button"
                      role="checkbox"
                      aria-checked={!!pick[i]}
                      onClick={() => setPick((p) => p.map((v, j) => (j === i ? !v : v)))}
                      className={cx(st.b7, st.choice)}
                      style={{ flex: "1 1 0", padding: `${U(4)} ${U(6)}`, minHeight: U(48), fontSize: U(16), borderRadius: U(18) }}
                    >
                      <span style={{ overflowWrap: "anywhere" }}>{x.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            {status === "coming" && (
              <>
                {label(t("Necha kishi bo‘lasiz?"), 22)}
                <div className={cx(st.field, "justify-between")} style={{ marginTop: U(5), height: U(54), padding: `0 ${U(6)}`, borderRadius: U(14) }}>
                  <button type="button" className={cx(st.b7, st.step)} disabled={count <= 1} onClick={() => setCount((n) => Math.max(1, n - 1))} aria-label={t("Kamaytirish")} style={{ width: U(40), height: U(40), fontSize: U(20), borderRadius: U(12) }}>
                    −
                  </button>
                  <span className={st.s6} style={{ fontSize: U(24), lineHeight: 1.366, color: INK }} aria-live="polite">
                    {count}
                  </span>
                  <button type="button" className={cx(st.b7, st.step)} disabled={count >= 20} onClick={() => setCount((n) => Math.min(20, n + 1))} aria-label={t("Ko‘paytirish")} style={{ width: U(40), height: U(40), fontSize: U(20), borderRadius: U(12) }}>
                    +
                  </button>
                </div>
              </>
            )}
            {label(t("Savol yoki tilak"), 24)}
            <label className={st.field} style={{ marginTop: U(5), height: U(130), padding: `${U(15)} ${U(15)}`, borderRadius: U(14), alignItems: "flex-start" }}>
              <textarea
                rows={4}
                className={st.input}
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                maxLength={500}
                placeholder={t("Yozing…")}
                aria-label={t("Savol yoki tilak")}
                style={{ fontSize: U(17), height: "100%" }}
              />
            </label>
            {err && (
              <p style={{ marginTop: U(12), color: "#ff8a7a", fontSize: U(15) }} role="alert">
                {err}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className={cx(st.b7, st.btnLime)}
              style={{ marginTop: U(26), minHeight: U(56), padding: `${U(10)} ${U(12)}`, fontSize: U(16), borderRadius: U(18), opacity: busy ? 0.7 : 1 }}
            >
              {busy ? t("Yuborilmoqda…") : t("Yuborish")}
            </button>
          </form>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 09 · Final — ikki sana plitkasi navbat bilan yonadi
 * (scroll bilan: --fc 0 … 1 = Figma kadri; sahifa oxirigacha albatta tugaydi) ═════════════ */
function Final({ d, z, still, onSeen }: { d: D; z: number; still: boolean; onSeen: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const sec = useRef<HTMLElement>(null);
  const onP = useCallback(
    (_p: number, r: DOMRect) => {
      const el = ref.current;
      if (!el) return;
      const vh = window.innerHeight || 800;
      // bo‘lim pasti ekran pastiga yetganda (yoki sahifa oxirida) tugaydi, 0.7 ekran oldin boshlanadi
      const y = window.scrollY;
      const top = r.top + y;
      const max = document.documentElement.scrollHeight - vh;
      const s1 = Math.max(1, Math.min(top + r.height - vh, max));
      const s0 = s1 - vh * 0.7;
      const f = seg(y, s0, s1);
      el.style.setProperty("--fc", f.toFixed(4));
      if (f > 0.5) onSeen();
    },
    [onSeen],
  );
  useScrollProgress(sec, onP, !still);
  const bye = t("Ko‘rishguncha!").replace(/[!.]+$/, "").toLocaleLowerCase();
  const n = d.days.length;
  // Figma: 18 (lime) va 19 (oq) — markazda, oralig‘i 16
  const x0 = n > 1 ? 107 : 155;
  return (
    <section ref={sec} className={cx(st.sec, st.bg0)} style={{ zIndex: z }}>
      <div aria-hidden className={st.fill}>
        <Img src={`${P}/fon.webp`} />
        <span className={st.shade} />
      </div>
      <div ref={ref} className={cx(st.col, st.finalWrap)} style={vars({ width: U(390), height: U(844), ...(still ? { "--fc": 1 } : {}) })}>
        <h2 className={cx(st.s6, st.mask, st.fTitle, "absolute inset-x-0 m-0 text-center")} style={{ top: U(220) }}>
          <span className="block" style={{ height: U(54), lineHeight: U(54), letterSpacing: "-0.05em", color: INK, whiteSpace: "nowrap" }}>
            <Fit base={54} max={342} deps={bye}>
              {bye}
            </Fit>
          </span>
        </h2>
        {d.days.slice(0, 2).map((x, i) => (
          <span key={i} className={st.fTile} style={vars({ left: U(x0 + i * 96), top: U(330), width: U(80), height: U(80), "--a": 0.25 + i * 0.25 })}>
            <span className={st.fGlass}>
              <Glass style={{ inset: 0 }} />
              <span className={st.fGlassTx}>
                <DayTile n={x.n} label={x.month} tone="glass" />
              </span>
            </span>
            <span className={st.fLit}>
              <DayTile n={x.n} label={x.month} tone={i === 0 ? "lime" : "white"} />
            </span>
          </span>
        ))}
        {d.finalLine && (
          <p className={cx(st.m5, st.fLine, st.clamp2, "absolute text-center")} style={{ left: U(24), width: U(342), top: U(450), fontSize: U(17), lineHeight: 1.366, color: "rgba(244,247,246,.8)", textWrap: "balance" }}>
            {d.finalLine}
          </p>
        )}
      </div>
    </section>
  );
}

/* ═════════════ Musiqa tugmasi — Figma «Taqvim / Musiqa tugmasi»: shisha kvadrat 52 (r 16), 4 ta lime chiziq ritmda; o‘chirilgan — 4px ═════════════ */
const MBARS = [10, 18, 13, 20];
function TaqvimMusic({ m, wide, embedded }: { m: ReturnType<typeof useMusic>; wide: boolean; embedded: boolean }) {
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

export function TaqvimSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const loaded = usePreload([`${P}/fon.webp`], [`${P}/zal.webp`, ...d.speakers.map((s) => s.photo)].filter(Boolean) as string[], withGate, wide ? "l" : "m");
  useReveal(root, loaded, embedded);
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
        ? d.programs.some((p) => p.length)
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
  const linkable = mode !== "preview";
  const colU = wide ? COL_L : COL_M;

  return (
    <div ref={root} className={st.root}>
      <div className={st.page} style={vars({ "--u": colU })}>
        <TaqvimMusic m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/muhr.webp`} />}
        <div className={st.flow}>
          {withGate && (loaded ? <Gate d={d} wide={wide} onStart={() => music.play(true)} onHero={onHero} /> : <div className={st.gateHold} />)}
          {embedded && <Gate d={d} wide={wide} still onStart={() => {}} onHero={() => {}} />}
          <Hero d={d} z={z("hero")} wide={wide} on={heroOn || embedded} still={embedded} />
          <Taklif d={d} z={z("taklif")} />
          <Taymer d={d} z={z("taymer")} wide={wide} />
          <Program d={d} z={z("program")} />
          <Speakers d={d} z={z("speakers")} />
          <Venue d={d} z={z("venue")} wide={wide} linkable={linkable} />
          <Dress d={d} z={z("dress")} />
          {data.rsvpEnabled && <Rsvp d={d} slug={data.slug} mode={mode} z={z("rsvp")} />}
          <Final d={d} z={z("final")} still={embedded} onSeen={onFinal} />
        </div>
        <footer className={cx(st.footer, "flex items-start justify-center")} style={{ height: U(120), paddingTop: U(50) }}>
          <p className={cx(st.m5, "text-center")} style={{ fontSize: U(14), lineHeight: U(19), color: INK, opacity: 0.55 }}>
            <a href="https://shohnoma.uz">{t("shohnoma.uz orqali yaratilgan")}</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
