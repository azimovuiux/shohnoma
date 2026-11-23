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
import { DRESS_TEXT, MSG_GRAND, MSG_PLAIN, MSG_SON, P, QOZON_DEMO, QOZON_DEMO_EN, QOZON_DEMO_RU, SIDE_GRAND, SUB_GRAND, SUB_PLAIN, SUB_SON } from "./data";
import st from "./qozon.module.css";

/* ── Birliklar ──
 * U — joriy `--u`. Bo‘limlarda — kontent ustuni (Figma mobil 390 koordinatalari; laptopda ustun = mobil × 1.2, ya’ni 468px / 1440 —
 * Figma «Kontent ustuni (mobil ×1.2)»). C — laptop kanvasi (1440) birligi: yon bezaklar (guruch donlari, bug‘).
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

/* Ranglar (Figma «24 · Qozon — Assets»): terrakota, ko‘mir, za’faron, sut */
const TERRA = "#B5532E";
const COAL = "#2B2522";
const SAFFRON = "#E3A33B";

/** Server yaratadigan standart taklif matni (php/api/lib/orders.php DEFAULT_MESSAGE) — har qaysi tilda */
const SERVER_DEFAULT = "Aziz mehmonlar! Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.";
const isServerDefault = (m: string) => (["uz", "ru", "en"] as Locale[]).some((l) => tr(l, SERVER_DEFAULT).trim() === m.trim());

function useData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO = lang === "ru" ? QOZON_DEMO_RU : lang === "en" ? QOZON_DEMO_EN : QOZON_DEMO;
  const ex = (data.extra ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof ex[k] === "string" ? (ex[k] as string).trim() : typeof ex[k] === "number" ? String(ex[k]) : "");
  const sd = splitDate(data.date);
  const guest = useGuestName();
  return useMemo(() => {
    const cw = calendarWords(lang);
    const exProgram = Array.isArray(ex.program) ? (ex.program as ProgramItem[]).filter((p) => p?.time && p?.title) : [];
    const photos = (data.photos ?? []).filter(Boolean) as string[];
    const date = sd ? new Date(`${sd.iso}T12:00:00Z`) : null;
    // namunadagi ismlar tarjima qilinadi (mijoz ma’lumoti — o‘zgarishsiz); sunnat: A — bola, B — ota-ona / oila (imzo)
    const a = ((demo ? t(data.personA) : data.personA) || "").trim();
    const parents = ((demo && data.personB ? t(data.personB) : data.personB) || "").trim();
    const hosts = demo ? t(DEMO.hosts) : str("hosts");
    // taklif kim nomidan: bobosi va buvisi («Nabiramiz …», Figma) yoki ota-onasi («O‘g‘limiz …», tanlanmasa ham)
    const grand = (demo ? DEMO.side : str("side")) === SIDE_GRAND;
    const time = sd?.time ?? "";
    const program = (demo ? DEMO.program : exProgram.length ? exProgram : ((data.program ?? []) as ProgramItem[])) as ProgramItem[];
    const raw = (demo ? "" : data.message || "").trim();
    const custom =
      raw && !isServerDefault(raw)
        ? raw.replace(/^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Muhtaram mehmonlar!|Assalomu alaykum!|Дорогие гости!|Dear guests!)\s*/, "").trim()
        : "";
    // matnlarda — faqat ism (familiyasiz): «Nabiramiz Alisherning …»
    const name = a.split(/\s+/)[0] || "";
    const message = custom || (name ? t(grand ? MSG_GRAND : MSG_SON, { name }) : t(MSG_PLAIN));
    const sub = name ? t(grand ? SUB_GRAND : SUB_SON, { name }) : t(SUB_PLAIN);
    const code = str("dressCode") || (demo ? DEMO.dressCode : "");
    const dressNote = str("dressNote") || (DRESS_TEXT[code] ? t(DRESS_TEXT[code]) : "");
    const venueTitle = ((demo ? t(data.venueName) : data.venueName) || "").trim();
    const address = ((demo ? DEMO.address : data.address) || "").trim();
    const coords = coordsFrom(data.mapUrl);
    const m = date ? date.getUTCMonth() : 0;
    const year = date ? date.getUTCFullYear() : 0;
    const day = date ? date.getUTCDate() : 0;
    // namunada javob muddati — Figma’dagidek sanadan 3 kun oldin («18-dekabrgacha» — 21-dekabr uchun)
    const deadline = demo && sd ? new Date(Date.UTC(year, m, day - 3)).toISOString().slice(0, 10) : data.rsvpDeadline;
    const wd = date ? cw.weekday[date.getUTCDay()] : "";
    // «21-dekabr» / «21 декабря» / «21 December»
    const dayMonth = date ? (lang === "uz" ? `${day}-${cw.monthsAfterDay[m]}` : `${day} ${cw.monthsAfterDay[m]}`) : "";
    // timer ostidagi qator: «21-dekabr, shanba · soat 06:30» / «Monday, 21 December · 06:30»
    const longDay = date ? (lang === "en" ? `${wd}, ${dayMonth}` : `${dayMonth}, ${wd.toLocaleLowerCase(lang)}`) : "";
    // mijoz suratlari: 1–3 — «Tayyorgarlik», 4 — «Manzil»; bo‘sh slot o‘rnida shablonning surati
    const own = demo ? [] : photos;
    return {
      a,
      /** ochilish, «Hurmat bilan» imzosi va final: mezbonlar, bo‘lmasa — ota-ona */
      signer: hosts || parents,
      sub,
      time,
      /** sana plitkasi: katta kun raqami va «dekabr, / shanba» */
      day: date ? String(day) : "",
      monthWord: date ? cw.monthsAfterDay[m] : "",
      weekday: date ? (lang === "en" ? wd : wd.toLocaleLowerCase(lang)) : "",
      /** «21-dekabr, shanba · soat 06:30» */
      oshLine: [longDay, time ? t("soat {time}", { time }) : ""].filter(Boolean).join(" · "),
      hasDate: !!date,
      iso: sd?.iso ?? "",
      target: data.date ? tashkentDate(data.date).getTime() : null,
      guest,
      message,
      venueTitle,
      address,
      hasPlace: !!(venueTitle || address || data.mapUrl),
      mapUrl: data.mapUrl || `https://yandex.uz/maps/?text=${encodeURIComponent([venueTitle, address].filter(Boolean).join(", "))}`,
      taxi: coords
        ? `https://3.redirect.appmetrica.yandex.com/route?end-lat=${coords.lat}&end-lon=${coords.lon}&appmetrica_tracking_id=1178268795219780156`
        : `https://yandex.uz/maps/?rtext=~${encodeURIComponent([address, venueTitle].filter(Boolean).join(", "))}&rtt=taxi`,
      program,
      dressTitle: DRESS_TEXT[code] || str("dressCode") ? t(code) : "",
      dressNote,
      gallery: [own[0] || `${P}/olov.webp`, own[1] || `${P}/ziravor.webp`, own[2] || `${P}/guruch.webp`],
      hall: own[3] || `${P}/hovli.webp`,
      rsvpUntil: untilPhrase(deadline, lang),
      calTitle: name ? t("{names} — nahorgi osh", { names: name }) : t("Nahorgi osh"),
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

/** Guruch donlari va yon bug‘lar — skrollda parallaks bilan sochiladi (`--py`, ±40px; Figma: 0.3–0.7×). Faqat `translate` */
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
        const k = +(x.dataset.pk || 0.3) * 0.25;
        x.style.setProperty("--py", `${Math.max(-40, Math.min(40, dist * -k)).toFixed(1)}px`);
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

/** Bir qator (sig‘masa kichrayadi); juda uzun bo‘lsa (0.72 dan kichrayib ketadi) — ikki teng qatorga, har qator `two` o‘lchamida */
function NameLines({ text, base, max, lh, two, twoLh, unit = U, className, style }: { text: string; base: number; max: number; lh: number; two: number; twoLh: number; unit?: (n: number) => string; className?: string; style?: CSSProperties }) {
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
    <div className={cx("relative", className)} style={style}>
      <span ref={probe} aria-hidden className="pointer-events-none absolute whitespace-nowrap" style={{ visibility: "hidden", fontSize: unit(base), left: 0, top: 0 }}>
        {text}
      </span>
      {rows.map((r, i) => (
        <span key={i} className="block" style={{ height: unit(h), lineHeight: `${unit(h)}`, fontSize: unit(fs), whiteSpace: "nowrap" }}>
          <Fit base={fs} max={max} unit={unit} deps={`${r}|${fs}`}>
            {r}
          </Fit>
        </span>
      ))}
    </div>
  );
}

/* ═════════════ Bezaklar ═════════════ */
type Pos = (n: number) => string;
type Box = readonly [number, number, number, number];

/** Guruch donlari (Figma «Qozon / Guruch donlari», 120×60; svg tepasi 4.33% yuqoriroq). `px` — skroll parallaksi */
function Grains({ box, unit, px, pk, d = 0, className }: { box: Box; unit: Pos; px?: boolean; pk?: number; d?: number; className?: string }) {
  const [x, y, w, h] = box;
  const k = h / 60;
  return (
    <div aria-hidden data-px={px ? "" : undefined} data-pk={pk} className={cx(st.art, className)} style={{ left: unit(x), top: unit(y - 2.6 * k), width: unit(w), height: unit(62.6 * k) }}>
      <div data-a="scatter" className={st.fill} style={vars({ "--d": `${d}s` })}>
        <Img src={`${P}/guruch.svg`} />
      </div>
    </div>
  );
}

/** Bug‘ (Figma «Qozon / Bug‘ (vektor)», 200×260; svg balandligi 117% — blur uchun). `loop` — sekin ko‘tarilib turadi (3 s) */
function Steam({ box, unit, px, pk, d = 0, loop, className, reveal = true }: { box: Box; unit: Pos; px?: boolean; pk?: number; d?: number; loop: boolean; className?: string; reveal?: boolean }) {
  const [x, y, w, h] = box;
  const k = h / 260;
  return (
    <div aria-hidden data-px={px ? "" : undefined} data-pk={pk} className={cx(st.art, className)} style={{ left: unit(x), top: unit(y - 22 * k), width: unit(w), height: unit(304 * k) }}>
      <div data-a={reveal ? "steam" : undefined} className={st.fill} style={vars({ "--d": `${d}s` })}>
        <div className={cx(st.fill, loop && st.puff)}>
          <Img src={`${P}/bug.svg`} eager />
        </div>
      </div>
    </div>
  );
}

/* ═════════════ 00 · Ochilish — qorong‘ida qozon (faqat scroll bilan, --o: 0…1) ═════════════
 * Yuklanganda (bosishsiz): qopqoq ustidan ingichka bug‘ sekin ko‘tarilib turadi, sarlavha sokin chiqadi.
 * Scroll (rAF lerp): qopqoq yuqoriga ko‘tarilib chetga suriladi (y −120, rotate −8°), qozondan bug‘ buluti ko‘tarilib
 * kattalashadi (scale 1→3) va ekranni oq tuman bilan qoplaydi; tuman tarqalganda sahna odatdagidek yuqoriga ketadi va
 * hero (01) ostidan chiqadi (Figma tartibi: 00 ostida 01; qattiq chok, chok ustida guruch donlari — sahifa birligida). */
const GATE = {
  m: { W: 390, H: 844, S: 1, OX: 0 },
  l: { W: 1440, H: 1013, S: 1.2, OX: 486 },
} as const;

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
  const colU = wide ? COL_L : COL_M;
  const pageU = wide ? "calc(100cqw / 1440)" : COL_M;
  // ustun koordinatalari (mobil 390) → sahna; laptopda × 1.2 + 486
  const X = (x: number) => `calc(50% + ${U(OX + S * x - W / 2)})`;
  const Y = (y: number) => `calc(100% - ${U(H - S * y)})`;
  const Z = (n: number) => U(S * n);
  // chok ustidagi guruch donlari — hero (01) ustunidagi joyi bilan aynan (sahifa birligida, sahna pastki chetidan)
  const PU = (n: number) => `calc(${colU} * ${+n.toFixed(3)})`;
  return (
    <div
      ref={wrap}
      className={cx(st.gateWrap, still && st.still)}
      style={vars(still ? { "--u": pageU, "--o": 0, "--s": S, height: U(H) } : { "--u": `min(${pageU}, calc(100svh / ${H}))`, "--s": S })}
    >
      <div className={st.gate} aria-label={t("Taklifnoma")} style={still ? { position: "relative", height: "100%" } : undefined}>
        <h1 className={cx(st.ub7, st.gIn, st.upper, "absolute text-center")} style={vars({ left: X(24), width: Z(342), top: Y(96), height: Z(42), lineHeight: `${Z(42)}`, fontSize: Z(34), color: "#fff", whiteSpace: "nowrap", "--gd": "0.2s" })}>
          <Fit base={34 * S} max={342 * S} deps={t("Nahorgi osh")}>
            {t("Nahorgi osh")}
          </Fit>
        </h1>
        {d.signer && (
          <p className={cx(st.go5, st.gIn, "absolute text-center")} style={vars({ left: X(24), width: Z(342), top: Y(146), fontSize: Z(16), lineHeight: `${Z(19)}`, color: SAFFRON, overflowWrap: "anywhere", "--gd": "0.4s" })}>
            {d.signer}
          </p>
        )}
        {/* bug‘ buluti — qopqoq ochilganda ko‘tarilib kattalashadi (orqasida kontent yo‘q, «sharpa» bo‘lmaydi) */}
        <div className={st.gSteam} style={{ left: X(95), top: Y(250 - 22), width: Z(200), height: Z(304) }}>
          <div className={cx(st.fill, !still && st.puff)}>
            <Img src={`${P}/bug.svg`} eager />
          </div>
        </div>
        <div className={st.gQozon} style={{ left: X(5), top: Y(520), width: Z(380), height: Z(313) }}>
          <Img src={`${P}/qozon.webp`} eager />
        </div>
        <div className={st.gLid} style={{ left: X(45), top: Y(440), width: Z(300), height: Z(158) }}>
          <Img src={`${P}/qopqoq.webp`} eager />
        </div>
        <span aria-hidden className={st.gHaze} />
        <div aria-hidden className={st.art} style={{ left: `calc(50% + ${PU(260 - 195)})`, top: `calc(100% - ${PU(32.6)})`, width: PU(120), height: PU(62.6) }}>
          <Img src={`${P}/guruch.svg`} eager />
        </div>
      </div>
    </div>
  );
}

/* ═════════════ Bo‘lim qobig‘i ═════════════ */
/** Bo‘lim: to‘liq enli fon + markazda kontent ustuni (mobil 390 birlik; laptopda × 1.2). `outer` — ustundan tashqaridagi bezaklar */
function Sec({ children, z, bg, colStyle, id, outer, className, secRef }: { children: ReactNode; z: number; bg: string; colStyle?: CSSProperties; id?: string; outer?: ReactNode; className?: string; secRef?: React.Ref<HTMLElement> }) {
  return (
    <section ref={secRef} id={id} className={cx(st.sec, st[bg], className)} style={vars({ zIndex: z })}>
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

/** Bo‘lim sarlavhasi (Unbounded Black, bosh harflarda; 360 da sig‘adi) */
function Title({ text, color, size, lh, d = 0, center, ls = -0.03 }: { text: string; color: string; size: number; lh: number; d?: number; center?: boolean; ls?: number }) {
  return (
    <p data-a="up" className={cx(st.ub9, st.upper, center && "text-center")} style={vars({ height: U(lh), fontSize: U(size), lineHeight: `${U(lh)}`, letterSpacing: `${ls}em`, color, whiteSpace: "nowrap", "--d": `${d}s` })}>
      <Fit base={size} max={342} deps={text}>
        {text}
      </Fit>
    </p>
  );
}

/* ═════════════ 01 · Hero — «NAHORGI OSH» qatorma-qator pastdan chiqadi (mask, stagger 0.08 s), plitkalar bento tartibida «tushadi»
 * (y 30→0 + scale 0.96→1, spring), osh surati (laganning o‘zi) sekin aylanadi, guruch donlari skrollda parallaks bilan sochiladi ═════════════ */
function Hero({ d, z, wide, still }: { d: D; z: number; wide: boolean; still: boolean }) {
  const t = useT();
  const title = t("Nahorgi osh");
  const lines = split2(title) ?? [title];
  return (
    <Sec
      z={z}
      bg="terra"
      colStyle={{ height: U(900) }}
      outer={
        <Side wide={wide}>
          <Grains box={[150, 300, 200, 100]} unit={C} px pk={0.5} d={0.3} />
          <Grains box={[1100, 620, 200, 100]} unit={C} px pk={0.7} d={0.4} />
        </Side>
      }
    >
      {/* chok ustidagi guruch donlari (00/01) — ochilish sahnasida ham aynan shu joyda chiziladi */}
      <div aria-hidden className={cx(st.art, st.seam)} style={{ left: U(260), top: U(-32.6), width: U(120), height: U(62.6) }}>
        <Img src={`${P}/guruch.svg`} eager />
      </div>
      <h2 className={cx(st.ub9, st.upper, "absolute flex flex-col")} style={{ left: U(22), width: U(346), top: U(70), fontSize: U(58), letterSpacing: "-0.03em", color: "#fff" }}>
        {lines.map((l, i) => (
          <span key={i} className={st.mask} style={{ height: U(53.36), lineHeight: `${U(53.36)}` }}>
            <span data-a="mask" className="block" style={vars({ "--d": `${0.1 + i * 0.08}s` })}>
              <Fit base={58} max={346} deps={l}>
                {l}
              </Fit>
            </span>
          </span>
        ))}
      </h2>
      {/* Plitka · vaqt */}
      <div data-a="tile" className={cx(st.tile, "absolute")} style={vars({ left: U(24), top: U(250), width: U(166), height: U(166), borderRadius: U(22), background: "#fff", "--d": "0.15s" })}>
        {d.time && (
          <p className={cx(st.ub7, "absolute")} style={{ left: U(18), top: U(28), height: U(40), fontSize: U(32), lineHeight: `${U(40)}`, color: TERRA, whiteSpace: "nowrap" }}>
            <Fit base={32} max={130} deps={d.time}>
              {d.time}
            </Fit>
          </p>
        )}
        <p className={cx(st.go5, "absolute")} style={{ left: U(18), top: U(84), width: U(130), fontSize: U(15), lineHeight: `${U(18)}`, color: COAL, overflowWrap: "anywhere" }}>
          {t("tong sahar")}
        </p>
      </div>
      {/* Plitka · sana */}
      {d.hasDate && (
        <div data-a="tile" className={cx(st.tile, "absolute")} style={vars({ left: U(200), top: U(250), width: U(166), height: U(166), borderRadius: U(22), background: COAL, "--d": "0.23s" })}>
          <p className={cx(st.ub7, "absolute")} style={{ left: U(18), top: U(22), height: U(64), fontSize: U(52), lineHeight: `${U(64)}`, color: SAFFRON, whiteSpace: "nowrap" }}>
            {d.day}
          </p>
          <div className={cx(st.go5, "absolute")} style={{ left: U(18), top: U(92), width: U(130), fontSize: U(15), lineHeight: 1.35, color: "#fff", overflowWrap: "anywhere" }}>
            <p>{d.monthWord},</p>
            <p>{d.weekday}</p>
          </div>
        </div>
      )}
      {/* Plitka · osh surati — lagan sekin aylanadi (fon joyida qoladi; oxirgi/statik kadr = Figma) */}
      <div data-a="tile" className={cx(st.tile, st.photo, "absolute")} style={vars({ left: U(24), top: U(426), width: U(342), height: U(240), borderRadius: U(26), background: COAL, "--d": "0.31s" })}>
        <Img src={`${P}/osh.webp`} className={st.cover} style={{ position: "absolute", left: 0, top: U(-51), width: U(342), height: U(342) }} />
        <div className={cx(st.plate, !still && st.spin)} style={{ left: U(171 - 144), top: U(112 - 144), width: U(288), height: U(288) }}>
          <Img src={`${P}/osh.webp`} className={st.cover} style={{ position: "absolute", left: U(-27), top: U(-19), width: U(342), height: U(342) }} />
        </div>
      </div>
      {/* Plitka · sabab */}
      <div data-a="tile" className={cx(st.tile, "absolute flex items-center")} style={vars({ left: U(24), top: U(676), width: U(342), height: U(120), borderRadius: U(22), background: SAFFRON, padding: `0 ${U(22)}`, "--d": "0.39s" })}>
        <p className={cx(st.go6, st.clamp3)} style={{ width: "100%", fontSize: U(18), lineHeight: 1.4, color: COAL }}>
          {d.sub}
        </p>
      </div>
    </Sec>
  );
}

/* ═════════════ 02 · Taklif — «Assalomu alaykum!» (maxsus mehmon bo‘lsa — «Assalomu alaykum, / Hurmatli …!»), matn, «Hurmat bilan,» va imzo ═════════════ */
function Taklif({ d, z, still }: { d: D; z: number; still: boolean }) {
  const t = useT();
  const hello = d.guest ? guestHello(t, "Hurmatli {guest}!", d.guest) : "";
  return (
    <Sec z={z} bg="white" colStyle={{ paddingTop: U(96), paddingBottom: U(170.7) }}>
      {/* chok ustidagi bug‘ (01/02) */}
      <Steam box={[250, -120, 120, 156]} unit={U} loop={!still} className={st.seam} d={0.1} />
      <div data-a="up" className={cx(st.ub7, "relative mx-auto")} style={vars({ width: U(342), color: TERRA, letterSpacing: "-0.02em", "--d": "0.05s" })}>
        {hello ? (
          <>
            <NameLines text={t("Assalomu alaykum,")} base={28} max={342} lh={32.2} two={24} twoLh={28} />
            <NameLines text={hello} base={28} max={342} lh={32.2} two={22} twoLh={26} />
          </>
        ) : (
          <NameLines text={t("Assalomu alaykum!")} base={28} max={342} lh={32.2} two={24} twoLh={28} />
        )}
      </div>
      <p data-a="up" className={cx(st.go4, "relative mx-auto")} style={vars({ marginTop: U(41.8), width: U(342), fontSize: U(19), lineHeight: 1.6, color: COAL, overflowWrap: "anywhere", whiteSpace: "pre-line", "--d": "0.12s" })}>
        {d.message}
      </p>
      {d.signer && (
        <div data-a="up" className={cx(st.go6, "relative mx-auto")} style={vars({ marginTop: U(108.4), width: U(342), fontSize: U(17), lineHeight: 1.45, color: TERRA, overflowWrap: "anywhere", "--d": "0.2s" })}>
          <p>{t("Hurmat bilan,")}</p>
          <p>{d.signer}</p>
        </div>
      )}
    </Sec>
  );
}

/* ═════════════ 03 · Tayyorgarlik — galereya (katta surat va ikkita kichik; mijoz suratlari, bo‘lmasa — shablonniki) ═════════════ */
function Gallery({ d, z }: { d: D; z: number }) {
  const t = useT();
  const boxes = [
    [24, 170, 342, 256],
    [24, 436, 166, 236],
    [200, 436, 166, 236],
  ] as const;
  return (
    <Sec z={z} bg="terra" colStyle={{ height: U(760) }}>
      <div className="absolute" style={{ left: U(24), width: U(342), top: U(90) }}>
        <Title text={t("Tayyorgarlik")} color="#fff" size={32} lh={40} center ls={0} />
      </div>
      {boxes.map(([x, y, w, h], i) => (
        <div key={i} data-a="zoom" className={cx(st.photo, "absolute")} style={vars({ left: U(x), top: U(y), width: U(w), height: U(h), borderRadius: U(22), background: "rgba(255,255,255,.12)", "--d": `${0.1 + i * 0.14}s` })}>
          <Img src={d.gallery[i]} className={st.zoomImg} />
        </div>
      ))}
    </Sec>
  );
}

/* ═════════════ 04 · Oshgacha — taymer: raqamlar terrakota plitkalarda yuqoriga varaqlanadi ═════════════ */
/**
 * Raqamlar doim 2 xonali («05»). Sanoq tugagach o‘zgargan raqam pastdan yuqoriga sekin chiqadi — shaffofliksiz, kesilmasdan:
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

function Timer({ d, z, wide, still }: { d: D; z: number; wide: boolean; still: boolean }) {
  const t = useT();
  const units = timerUnits(useLocale());
  const c = useCountdown(d.target);
  const [ref, inView] = useInView<HTMLDivElement>(0.3, true);
  if (!d.hasDate || !c) return null;
  const vals = [c.d, c.h, c.m, c.s];
  return (
    <Sec
      z={z}
      bg="coal"
      colStyle={{ height: U(600) }}
      outer={
        <Side wide={wide}>
          <Steam box={[180, 120, 220, 286]} unit={C} px pk={0.3} loop={!still} d={0.2} />
          <Steam box={[1060, 160, 220, 286]} unit={C} px pk={0.4} loop={!still} d={0.3} />
        </Side>
      }
    >
      <div className="absolute" style={{ left: U(24), width: U(342), top: U(90) }}>
        <Title text={t("Oshgacha")} color="#fff" size={40} lh={40} />
      </div>
      <div ref={ref}>
        {vals.map((v, i) => (
          <div key={i} data-a="flip" className={cx(st.tbox, "absolute")} style={vars({ left: U(24 + i * 87), top: U(190), width: U(78), height: U(96), borderRadius: U(18), "--d": `${0.12 + i * 0.1}s` })}>
            <p className={cx(st.ub7, "absolute inset-x-0 text-center")} style={{ top: U(18), height: U(37), fontSize: U(30), lineHeight: `${U(37)}`, color: "#fff", whiteSpace: "nowrap" }}>
              <Fit base={30} max={70} deps={String(vals[0]).length}>
                <Digits value={v} run={inView} len={i === 0 ? Math.max(2, String(vals[0]).length) : 2} i={i} />
              </Fit>
            </p>
            <p className={cx(st.go5, "absolute inset-x-0 text-center")} style={{ top: U(62), height: U(16), fontSize: U(13), lineHeight: `${U(16)}`, color: "#fff", whiteSpace: "nowrap" }}>
              <Fit base={13} max={72} deps={units[i]}>
                {units[i]}
              </Fit>
            </p>
          </div>
        ))}
      </div>
      {d.oshLine && (
        <p data-a="up" className={cx(st.go5, "absolute")} style={vars({ left: U(24), width: U(342), top: U(320), height: U(21), fontSize: U(17), lineHeight: `${U(21)}`, color: "#fff", whiteSpace: "nowrap", "--d": "0.25s" })}>
          <Fit base={17} max={342} deps={d.oshLine}>
            {d.oshLine}
          </Fit>
        </p>
      )}
      <div data-a="up" className="absolute flex" style={vars({ left: U(24), top: U(370), "--d": "0.32s" })}>
        <button
          type="button"
          className={cx(st.go6, st.btn, st.btnSaffron)}
          style={{ minWidth: U(250), height: U(56), padding: `0 ${U(22)}`, fontSize: U(16), borderRadius: U(16) }}
          onClick={() =>
            downloadIcs({
              title: d.calTitle,
              startLocal: `${d.iso}T${d.time || "06:30"}`,
              location: [d.venueTitle, d.address].filter(Boolean).join(", "),
              slug: "qozon",
            })
          }
        >
          {t("Kalendarga qo‘shish")}
        </button>
      </div>
      <Grains box={[30, 520, 120, 60]} unit={U} px pk={0.4} d={0.2} />
    </Sec>
  );
}

/* ═════════════ 05 · Tong tartibi — ajratuvchi chiziqlar chapdan chiziladi, vaqtlar sanab chiqadi ═════════════ */
/** «06:30» — 00:00 dan sanab chiqadi (ko‘ringanda bir marta); boshqa ko‘rinishdagi vaqt matni o‘zgarishsiz */
function TimeCount({ text, run, i }: { text: string; run: boolean; i: number }) {
  const m = text.match(/^(\d{1,2}):(\d{2})$/);
  const total = m ? +m[1] * 60 + +m[2] : 0;
  const c = useCountUp(total, run && !!m, 1100 + i * 120);
  if (!m) return <>{text}</>;
  const v = c.done ? total : c.value;
  return <>{`${String(Math.floor(v / 60)).padStart(m[1].length, "0")}:${String(v % 60).padStart(2, "0")}`}</>;
}

function Program({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const items = d.program.slice(0, 8);
  const [ref, inView] = useInView<HTMLDivElement>(0.2, true);
  if (!items.length) return null;
  return (
    <Sec
      z={z}
      bg="white"
      colStyle={{ paddingTop: U(90), paddingBottom: U(50) }}
      outer={
        <Side wide={wide}>
          <Grains box={[170, 260, 180, 90]} unit={C} px pk={0.5} d={0.2} />
          <Grains box={[1110, 520, 180, 90]} unit={C} px pk={0.6} d={0.3} />
        </Side>
      }
    >
      <div className="relative mx-auto" style={{ width: U(342) }}>
        <Title text={t("Tong tartibi")} color={TERRA} size={30} lh={30} />
      </div>
      <div ref={ref} className="relative mx-auto" style={{ marginTop: U(50), width: U(342) }}>
        {items.map((it, i) => (
          <div key={i} className="relative">
            <span aria-hidden data-a="line" className={st.rule} style={vars({ height: U(1.5), "--d": `${0.05 + i * 0.12}s` })} />
            <div data-a="up" className="flex items-center" style={vars({ minHeight: U(98.5), paddingTop: U(4), paddingBottom: U(18), "--d": `${0.15 + i * 0.12}s` })}>
              <p className={cx(st.ub7, "shrink-0")} style={{ width: U(126), fontSize: U(28), lineHeight: `${U(35)}`, color: TERRA, whiteSpace: "nowrap" }}>
                <Fit base={28} max={118} deps={it.time}>
                  <TimeCount text={it.time} run={inView} i={i} />
                </Fit>
              </p>
              <p className={cx(st.go6, st.clamp2)} style={{ minWidth: 0, flex: "1 1 auto", fontSize: U(17), lineHeight: 1.3, color: COAL }}>
                {it.title}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Sec>
  );
}

/* ═════════════ 06 · Manzil — surat (mijozning 4-surati; bo‘lmasa — hovli), joy nomi, manzil, xarita va yo‘nalish ═════════════ */
function Venue({ d, z, linkable }: { d: D; z: number; linkable: boolean }) {
  const t = useT();
  if (!d.hasPlace) return null;
  return (
    <Sec z={z} bg="terra" colStyle={{ paddingTop: U(90), paddingBottom: U(94) }}>
      <div className="relative mx-auto" style={{ width: U(342) }}>
        <Title text={t("Manzil")} color="#fff" size={40} lh={40} />
      </div>
      <div data-a="zoom" className={cx(st.photo, "relative mx-auto")} style={vars({ marginTop: U(40), width: U(342), height: U(228), borderRadius: U(24), background: COAL, "--d": "0.1s" })}>
        <Img src={d.hall} className={st.zoomImg} />
      </div>
      {d.venueTitle && (
        <p data-a="up" className={cx(st.ub7, "mx-auto")} style={vars({ marginTop: U(22), width: U(342), fontSize: U(22), lineHeight: 1.2, color: "#fff", overflowWrap: "anywhere", "--d": "0.15s" })}>
          {d.venueTitle}
        </p>
      )}
      {d.address && (
        <p data-a="up" className={cx(st.go4, "mx-auto")} style={vars({ marginTop: U(15.6), width: U(342), minHeight: U(48), fontSize: U(16), lineHeight: 1.5, color: "#fff", overflowWrap: "anywhere", "--d": "0.22s" })}>
          {d.address}
        </p>
      )}
      <div data-a="up" className="relative mx-auto flex" style={vars({ marginTop: U(40), width: U(342), gap: U(12), "--d": "0.3s" })}>
        <a href={linkable ? d.mapUrl : undefined} target="_blank" rel="noopener noreferrer" className={cx(st.go6, st.btn, st.btnWhite)} style={{ flex: "1 1 0", minWidth: 0, height: U(56), padding: `0 ${U(8)}`, fontSize: U(16), borderRadius: U(16) }}>
          {t("Xaritada ochish")}
        </a>
        <a href={linkable ? d.taxi : undefined} target="_blank" rel="noopener noreferrer" className={cx(st.go6, st.btn, st.btnLine)} style={{ flex: "1 1 0", minWidth: 0, height: U(56), padding: `0 ${U(8)}`, fontSize: U(16), borderWidth: U(1.5), borderRadius: U(16) }}>
          {t("Yo‘nalish")}
        </a>
      </div>
    </Sec>
  );
}

/* ═════════════ 07 · Dress-kod (ixtiyoriy — o‘chirilsa joy qolmaydi): oq karta — turi (bosh harflarda) va izoh ═════════════ */
function Dress({ d, z }: { d: D; z: number }) {
  if (!d.dressNote && !d.dressTitle) return null;
  return (
    <Sec z={z} bg="terra" colStyle={{ paddingTop: U(30), paddingBottom: U(94) }}>
      <div data-a="rise" className={cx(st.card, "relative mx-auto flex flex-col items-start")} style={{ width: U(342), padding: `${U(28)} ${U(26)}`, gap: U(10), borderRadius: U(20) }}>
        {d.dressTitle && (
          <p className={cx(st.ub7, st.upper)} style={{ height: U(32), fontSize: U(26), lineHeight: `${U(32)}`, color: TERRA, whiteSpace: "nowrap" }}>
            <Fit base={26} max={290} deps={d.dressTitle}>
              {d.dressTitle}
            </Fit>
          </p>
        )}
        {d.dressNote && (
          <p className={st.go4} style={{ width: "100%", fontSize: U(17), lineHeight: 1.5, color: COAL, overflowWrap: "anywhere" }}>
            {d.dressNote}
          </p>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 08 · Anketa — «Kelaman» bosilsa tugmadan guruch donlari sachraydi ═════════════ */
const SPLASH = [
  [-46, -40, -35],
  [-30, -62, 20],
  [-8, -70, -60],
  [14, -66, 45],
  [34, -54, -20],
  [50, -34, 70],
  [-56, -14, 50],
  [58, -10, -45],
  [-20, -48, 80],
  [24, -40, -75],
] as const;

function Rsvp({ d, slug, mode, z }: { d: D; slug: string; mode: InvitationSiteProps["mode"]; z: number }) {
  const t = useT();
  const live = mode === "live";
  const [name, setName] = useState("");
  const [status, setStatus] = useState<RsvpStatus>("coming");
  const [count, setCount] = useState(3);
  const [wish, setWish] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState<null | RsvpStatus>(null);
  const [token, setToken] = useState<string | null>(null);
  const [splash, setSplash] = useState(0);
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
    <p className={cx(st.go6, st.lbl)} style={{ marginTop: U(mt), height: U(17), fontSize: U(14), lineHeight: `${U(17)}` }}>
      {s}
    </p>
  );
  const sub = d.rsvpUntil ? t("Iltimos, {date} javob bering", { date: d.rsvpUntil }) : t("Javobingizni kutamiz");
  const pick = (s: RsvpStatus) => {
    setStatus(s);
    if (s === "coming") setSplash((n) => n + 1);
  };
  return (
    <Sec z={z} bg="white" id="qozon-javob" colStyle={{ paddingTop: U(90), paddingBottom: U(60) }}>
      {/* chok ustidagi guruch donlari (07/08) */}
      <Grains box={[250, -30, 120, 60]} unit={U} className={st.seam} d={0.1} />
      <div className="relative mx-auto" style={{ width: U(342) }}>
        <h2 data-a="up" className={cx(st.ub9, st.upper)} style={vars({ fontSize: U(40), lineHeight: 1, letterSpacing: "-0.03em", color: TERRA, overflowWrap: "anywhere", "--d": "0.05s" })}>
          {t("Kelasizmi?")}
        </h2>
        <p data-a="up" className={st.go4} style={vars({ marginTop: U(18), minHeight: U(19), fontSize: U(16), lineHeight: 1.2, color: COAL, overflowWrap: "anywhere", "--d": "0.12s" })}>
          {sub}
        </p>
      </div>
      <div data-a="rise" className={cx(st.card, "relative mx-auto")} style={vars({ marginTop: U(33), width: U(342), padding: `${U(24)} ${U(22)} ${U(58)}`, borderRadius: U(26), "--d": "0.2s" })}>
        {sent ? (
          <div key="thanks" className={cx(st.thanks, "relative flex flex-col items-center text-center")} style={{ padding: `${U(40)} ${U(6)} ${U(10)}`, gap: U(16), minHeight: U(480) }}>
            <div aria-hidden className="relative shrink-0" style={{ width: U(180), height: U(178) }}>
              <Img src={`${P}/qozon.webp`} style={{ position: "absolute", left: 0, top: U(30), width: U(180), height: U(148) }} />
              {sent === "coming" && <Img src={`${P}/guruch.svg`} style={{ position: "absolute", left: U(60), top: 0, width: U(90), height: U(47) }} />}
            </div>
            <p className={st.ub7} style={{ fontSize: U(sent === "not_coming" ? 26 : 22), lineHeight: 1.25, color: TERRA, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Rahmat!") : t("Rahmat! Joyingiz band qilindi")}
            </p>
            <p className={st.go4} style={{ fontSize: U(17), color: COAL, lineHeight: 1.5, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Javobingiz uchun rahmat!") : t("{name} — {count} kishi. Javobingiz yetkazildi.", { name: name.trim() || t("Javobingiz"), count })}
            </p>
            <button type="button" onClick={() => setSent(null)} className={st.go6} style={{ fontSize: U(16), color: TERRA, textDecoration: "underline", textUnderlineOffset: 3 }}>
              {t("Javobni o‘zgartirish")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="relative flex flex-col items-stretch">
            {label(t("Ismingiz"), 0)}
            <label className={st.field} style={{ marginTop: U(7), height: U(54), padding: `0 ${U(16)}`, borderRadius: U(14) }}>
              <input className={cx(st.go4, st.input)} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={t("Ism va familiya")} aria-label={t("Ismingiz")} style={{ fontSize: U(17) }} />
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
                  onClick={() => pick(s)}
                  className={cx(st.go6, st.choice)}
                  style={{ padding: `${U(4)} ${U(6)}`, minHeight: U(54), fontSize: U(16), borderWidth: U(1.5), borderRadius: U(16) }}
                >
                  <span style={{ overflowWrap: "anywhere" }}>{t(l)}</span>
                  {s === "coming" && splash > 0 && (
                    <span key={splash} aria-hidden className={st.splash}>
                      {SPLASH.map(([x, y, r], k) => (
                        <span key={k} className={st.grain} style={vars({ "--x": U(x), "--y": U(y), "--r": `${r}deg`, width: U(11), height: U(4), background: k % 3 === 0 ? SAFFRON : "#fff" })} />
                      ))}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {status === "coming" && (
              <>
                {label(t("Necha kishi bo‘lasiz?"), 22)}
                <div className={cx(st.field, "justify-between")} style={{ marginTop: U(7), height: U(54), padding: `0 ${U(6)}`, borderRadius: U(14) }}>
                  <button type="button" className={cx(st.go6, st.step)} disabled={count <= 1} onClick={() => setCount((n) => Math.max(1, n - 1))} aria-label={t("Kamaytirish")} style={{ width: U(42), height: U(42), fontSize: U(22) }}>
                    −
                  </button>
                  <span className={st.ub7} style={{ fontSize: U(26), lineHeight: 1.2, color: COAL }} aria-live="polite">
                    {count}
                  </span>
                  <button type="button" className={cx(st.go6, st.step)} disabled={count >= 20} onClick={() => setCount((n) => Math.min(20, n + 1))} aria-label={t("Ko‘paytirish")} style={{ width: U(42), height: U(42), fontSize: U(22) }}>
                    +
                  </button>
                </div>
              </>
            )}
            {label(t("Tilaklaringiz"), 24)}
            <label className={st.field} style={{ marginTop: U(7), height: U(130), padding: `${U(16)} ${U(16)}`, borderRadius: U(14), alignItems: "flex-start" }}>
              <textarea rows={4} className={cx(st.go4, st.input)} value={wish} onChange={(e) => setWish(e.target.value)} maxLength={500} placeholder={t("Yozing…")} aria-label={t("Tilaklaringiz")} style={{ fontSize: U(17), height: "100%" }} />
            </label>
            {err && (
              <p className={st.go4} style={{ marginTop: U(12), color: "#b42318", fontSize: U(15) }}>
                {err}
              </p>
            )}
            <button type="submit" disabled={busy} className={cx(st.go6, st.submit)} style={{ marginTop: U(26), minHeight: U(56), padding: `${U(10)} ${U(12)}`, fontSize: U(16), borderRadius: U(16), opacity: busy ? 0.7 : 1 }}>
              {busy ? t("Yuborilmoqda…") : t("Yuborish")}
            </button>
          </form>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 09 · Final — «SIZNI KUTAMIZ!», qozon pastdan ko‘tariladi, ustidan bug‘ ko‘tarilib turadi (loop 3 s)
 * (scroll bilan: --fc 0 … 1 = Figma kadri; sahifa oxirigacha albatta tugaydi) ═════════════ */
function Final({ d, z, wide, still, onSeen }: { d: D; z: number; wide: boolean; still: boolean; onSeen: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const sec = useRef<HTMLElement>(null);
  const title = t("Sizni kutamiz!");
  const lines = split2(title) ?? [title];
  const onP = useCallback(
    (_p: number, r: DOMRect) => {
      const el = ref.current;
      if (!el) return;
      const vh = window.innerHeight || 800;
      // qozon (Figma joyida) ekranning pastki chetiga kirganda boshlanadi va 0.55 ekran skrollda tugaydi — harakat ko‘rinib turadi;
      // sahifa oxiri undan oldin kelsa, oxirida tugaydi
      const y = window.scrollY;
      const q = el.querySelector<HTMLElement>(`.${st.fQozon}`);
      const top = r.top + y + (q?.offsetTop ?? 0);
      const max = document.documentElement.scrollHeight - vh;
      const s0 = Math.min(top - vh * 0.95, max - 1);
      const s1 = Math.max(s0 + 1, Math.min(s0 + vh * 0.55, max));
      const f = seg(y, s0, s1);
      el.style.setProperty("--fc", f.toFixed(4));
      if (f > 0.5) onSeen();
    },
    [onSeen],
  );
  useScrollProgress(sec, onP, !still);
  return (
    <Sec
      z={z}
      bg="coal"
      secRef={sec}
      colStyle={{ height: U(820) }}
      outer={
        <Side wide={wide}>
          <Steam box={[170, 260, 240, 312]} unit={C} px pk={0.3} loop={!still} d={0.2} />
          <Steam box={[1040, 320, 240, 312]} unit={C} px pk={0.4} loop={!still} d={0.3} />
        </Side>
      }
    >
      <h2 className={cx(st.ub9, st.upper, "absolute flex flex-col")} style={{ left: U(22), width: U(346), top: U(90), fontSize: U(56), letterSpacing: "-0.03em", color: "#fff" }}>
        {lines.map((l, i) => (
          <span key={i} className={st.mask} style={{ height: U(51.52), lineHeight: `${U(51.52)}` }}>
            <span data-a="mask" className="block" style={vars({ "--d": `${0.1 + i * 0.08}s` })}>
              <Fit base={56} max={346} deps={l}>
                {l}
              </Fit>
            </span>
          </span>
        ))}
      </h2>
      {/* qozon va bug‘ — Figma’dagidan 50 yuqoriroq: «Rahimovlar xonadoni» qozon rasmi ustiga tushmasin */}
      <div ref={ref} className={cx(st.fill, st.finalWrap)} style={vars(still ? { "--fc": 1 } : {})}>
        <div className={st.fSteam} style={{ left: U(95), top: U(250 - 22), width: U(200), height: U(304) }}>
          <div className={cx(st.fill, !still && st.puff)}>
            <Img src={`${P}/bug.svg`} />
          </div>
        </div>
        <div className={st.fQozon} style={{ left: U(5), top: U(450), width: U(380), height: U(313) }}>
          <Img src={`${P}/qozon.webp`} />
        </div>
      </div>
      {d.signer && (
        <p data-a="up" className={cx(st.go5, "absolute text-center")} style={vars({ left: U(24), width: U(342), top: U(770), fontSize: U(16), lineHeight: `${U(19)}`, color: SAFFRON, overflowWrap: "anywhere", "--d": "0.3s" })}>
          {d.signer}
        </p>
      )}
    </Sec>
  );
}

/* ═════════════ Musiqa tugmasi — Figma «Qozon / Musiqa tugmasi»: za’faron kvadrat (52, r14), 4 ta ko‘mir chiziq ritmda;
 * o‘chirilgan — chiziqlar past (4px) ═════════════ */
const BARS = [10, 18, 13, 20];
function QozonMusic({ m, wide, embedded }: { m: ReturnType<typeof useMusic>; wide: boolean; embedded: boolean }) {
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
type Key = "hero" | "taklif" | "gallery" | "timer" | "program" | "venue" | "dress" | "rsvp" | "final";

export function QozonSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const loaded = usePreload([`${P}/qozon.webp`, `${P}/qopqoq.webp`, `${P}/bug.svg`, `${P}/guruch.svg`], [`${P}/osh.webp`, ...d.gallery, d.hall], withGate, wide ? "l" : "m");
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

  const shown: Key[] = (["hero", "taklif", "gallery", "timer", "program", "venue", "dress", "rsvp", "final"] as Key[]).filter((k) =>
    k === "timer" ? d.hasDate : k === "program" ? d.program.length > 0 : k === "venue" ? d.hasPlace : k === "dress" ? !!(d.dressNote || d.dressTitle) : k === "rsvp" ? data.rsvpEnabled : true,
  );
  const z = (k: Key) => 6 + shown.indexOf(k);
  const linkable = mode !== "preview";
  const colU = wide ? COL_L : COL_M;

  return (
    <div ref={root} className={st.root}>
      <div className={st.page} style={vars({ "--u": colU })}>
        <QozonMusic m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/osh.webp`} />}
        <div className={st.flow}>
          {withGate && (loaded ? <Gate d={d} wide={wide} onStart={() => music.play(true)} /> : <div className={st.gateHold} />)}
          {embedded && <Gate d={d} wide={wide} still onStart={() => {}} />}
          <Hero d={d} z={z("hero")} wide={wide} still={embedded} />
          <Taklif d={d} z={z("taklif")} still={embedded} />
          <Gallery d={d} z={z("gallery")} />
          <Timer d={d} z={z("timer")} wide={wide} still={embedded} />
          <Program d={d} z={z("program")} wide={wide} />
          <Venue d={d} z={z("venue")} linkable={linkable} />
          <Dress d={d} z={z("dress")} />
          {data.rsvpEnabled && <Rsvp d={d} slug={data.slug} mode={mode} z={z("rsvp")} />}
          <Final d={d} z={z("final")} wide={wide} still={embedded} onSeen={onFinal} />
        </div>
        <footer className={cx(st.footer, "flex items-start justify-center")} style={{ height: U(120), paddingTop: U(50) }}>
          <p className={cx(st.go5, "text-center")} style={{ fontSize: U(14), lineHeight: `${U(17)}`, color: "rgba(255,255,255,.5)" }}>
            <a href="https://shohnoma.uz">{t("shohnoma.uz orqali yaratilgan")}</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
