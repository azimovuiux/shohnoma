"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { splitDate, tashkentDate } from "@/lib/display";
import { musicSrc } from "@/lib/music";
import { tr, useLocale, useT, type Locale } from "@/lib/i18n";
import type { InvitationSiteProps } from "@/components/invitation/types";
import { fetchSavedAnswer, loadSavedRsvp, rsvpUrl, saveRsvp, type RsvpStatus } from "@/components/invitation/Rsvp";
import { guestHello, useGuestName } from "../shared/guest";
import { timerUnits } from "@/components/invitation/data";
import { useCountdown, useInView, useScrollProgress, useWide } from "../shared/hooks";
import { Loader, usePreload, useMusic } from "../shared/runtime";
import { calendarWords, coordsFrom, downloadIcs, untilPhrase, type ProgramItem } from "../anor/data";
import { BILET_DEMO, BILET_DEMO_EN, BILET_DEMO_RU, DRESS_TEXT, MSG_NO_ORG, MSG_ORG, MSG_PLAIN, P, SAVE_DATE, SIGN_ORG, type Speaker } from "./data";
import st from "./bilet.module.css";

/* ── Birliklar ──
 * U — joriy `--u`. Bo‘limlarda — kontent ustuni (Figma mobil 390 koordinatalari; laptopda ustun = mobil × 1.2, ya’ni 468px / 1440 —
 * Figma «Kontent ustuni (mobil ×1.2)»). C — laptop kanvasi (1440) birligi: yon bezaklar (ko‘k nurlar, shtrix-kodlar).
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

/* Ranglar (Figma «20 · Bilet — Assets») */
const NAVY = "#050a2e";
const BLUE = "#1f3bff";
const PAPER = "#f4f6ff";
const MUTE = "#6b759e";

/** Server yaratadigan standart taklif matni (php/api/lib/orders.php DEFAULT_MESSAGE) — har qaysi tilda */
const SERVER_DEFAULT = "Aziz mehmonlar! Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.";
const isServerDefault = (m: string) => (["uz", "ru", "en"] as Locale[]).some((l) => tr(l, SERVER_DEFAULT).trim() === m.trim());

function useData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO = lang === "ru" ? BILET_DEMO_RU : lang === "en" ? BILET_DEMO_EN : BILET_DEMO;
  const ex = (data.extra ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof ex[k] === "string" ? (ex[k] as string).trim() : typeof ex[k] === "number" ? String(ex[k]) : "");
  const sd = splitDate(data.date);
  // namunada — Figma’dagi mehmon («Aziz Karimov»); ?g= / ?m= bo‘lsa — o‘sha mehmon
  const guest = useGuestName(demo ? DEMO.guest : "");
  return useMemo(() => {
    const cw = calendarWords(lang);
    const exProgram = Array.isArray(ex.program) ? (ex.program as ProgramItem[]).filter((p) => p?.time && p?.title) : [];
    const exSpeakers = Array.isArray(ex.speakers) ? (ex.speakers as Speaker[]).filter((s) => s && typeof s.name === "string" && s.name.trim()) : [];
    const photos = (data.photos ?? []).filter(Boolean) as string[];
    const date = sd ? new Date(`${sd.iso}T12:00:00Z`) : null;
    // korporativ: personA — tadbir nomi, personB — kompaniya / tashkilotchi (namunadagi nomlar tarjima qilinadi, mijozniki — yo‘q)
    const event = ((demo ? t(data.personA) : data.personA) || "").trim();
    const org = ((demo ? t(data.personB ?? "") : data.personB) || "").trim();
    const code = str("dressCode") || (demo ? DEMO.dressCode : "");
    const dressNote = str("dressNote") || (DRESS_TEXT[code] ? t(DRESS_TEXT[code]) : "");
    const time = sd?.time ?? "";
    const program = (demo ? DEMO.program : exProgram.length ? exProgram : ((data.program ?? []) as ProgramItem[])) as ProgramItem[];
    // spikerlar: 0–6 ta; suratlari — 1…6-suratlar (bo‘lmasa — bosh harflar)
    const speakers = (demo ? DEMO.speakers.map((s, i) => ({ ...s, photo: `${P}/spiker${i + 1}.webp` })) : exSpeakers.slice(0, 6).map((s, i) => ({ name: s.name.trim(), role: (s.role ?? "").trim(), photo: photos[i] || "" })));
    const raw = (demo ? "" : data.message || "").trim();
    const custom =
      raw && !isServerDefault(raw)
        ? raw.replace(/^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Muhtaram mehmonlar!|Hurmatli mehmonlar!|Дорогие гости!|Уважаемые гости!|Dear guests!)\s*/, "").trim()
        : "";
    const message = demo ? DEMO.message : custom || (org && event ? t(MSG_ORG, { org, event }) : event ? t(MSG_NO_ORG, { event }) : t(MSG_PLAIN));
    const venueTitle = ((demo ? t(data.venueName) : data.venueName) || "").trim();
    const address = ((demo ? DEMO.address : data.address) || "").trim();
    const coords = coordsFrom(data.mapUrl);
    const m = date ? date.getUTCMonth() : 0;
    const year = date ? date.getUTCFullYear() : 0;
    const day = date ? date.getUTCDate() : 0;
    // namunada javob muddati — Figma’dagidek sanadan 8 kun oldin («15-yanvar»)
    const deadline = demo && sd ? new Date(Date.UTC(year, m, day - 8)).toISOString().slice(0, 10) : data.rsvpDeadline;
    const wd = date ? cw.weekday[date.getUTCDay()] : "";
    const dd = String(day).padStart(2, "0");
    const mm = String(m + 1).padStart(2, "0");
    const yy = String(year).slice(-2);
    // shahar: manzilning birinchi bo‘lagi (qisqa bo‘lsa)
    const city0 = address.split(",")[0]?.replace(/^(г\.|город)\s*/i, "").replace(/\s+(shahri|sh\.|tumani|viloyati)$/i, "").trim() ?? "";
    const city = demo ? DEMO.city : city0.length <= 18 ? city0 : "";
    const at = time ? t("soat {time}", { time }) : "";
    return {
      event,
      org,
      /** chipta: «Yillik hamkorlar / kechasi 2027» (nomda yil bo‘lmasa — qo‘shiladi) */
      ticketEvent: event ? (date && !/\d{4}/.test(event) ? `${event} ${year}` : event) : "",
      /** «23 · 01 · 2027» */
      dots: sd?.dots ?? "",
      /** «23.01.27» */
      short: date ? `${dd}.${mm}.${yy}` : "",
      /** chipta qoldig‘i: «Toshkent, Hyatt Regency» / «Juma, soat 19:00» */
      place: demo ? DEMO.place : venueTitle,
      wdTime: date ? [wd, at].filter(Boolean).join(", ") : "",
      /** taymer ostida: «23-yanvar, juma · soat 19:00» */
      longDate: date
        ? [lang === "en" ? `${wd}, ${day} ${cw.monthsAfterDay[m]}` : lang === "ru" ? `${day} ${cw.monthsAfterDay[m]}, ${wd.toLowerCase()}` : `${day}-${cw.monthsAfterDay[m]}, ${wd.toLowerCase()}`, at]
            .filter(Boolean)
            .join(" · ")
        : "",
      /** final: «23.01.27 · Toshkent» */
      finalDate: [date ? `${dd}.${mm}.${yy}` : "", city].filter(Boolean).join(" · "),
      hasDate: !!date,
      iso: sd?.iso ?? "",
      time,
      target: data.date ? tashkentDate(data.date).getTime() : null,
      guest,
      demoGuest: demo ? DEMO.guest : "",
      message,
      /** imzo: «Hurmat bilan, / Nova Group jamoasi» (namunada — Figma’dagi yozuv) */
      sign: demo ? t(SIGN_ORG, { org: "Nova Group" }) : org ? t(SIGN_ORG, { org }) : "",
      saveDate: SAVE_DATE[lang] ?? SAVE_DATE.uz,
      venueTitle,
      address,
      hasPlace: !!(venueTitle || address || data.mapUrl),
      mapUrl: data.mapUrl || `https://yandex.uz/maps/?text=${encodeURIComponent([venueTitle, address].filter(Boolean).join(", "))}`,
      taxi: coords
        ? `https://3.redirect.appmetrica.yandex.com/route?end-lat=${coords.lat}&end-lon=${coords.lon}&appmetrica_tracking_id=1178268795219780156`
        : `https://yandex.uz/maps/?rtext=~${encodeURIComponent([address, venueTitle].filter(Boolean).join(", "))}&rtt=taxi`,
      program,
      speakers,
      dressCode: DRESS_TEXT[code] || str("dressCode") ? t(code) : "",
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
 * Sarlavha qatori: bir qatorga sig‘masa kichrayadi; juda uzun bo‘lsa (0.7 dan kichrayadi) — ikki teng qatorga bo‘linadi
 * (har qator shu `lh` balandlikda, kerak bo‘lsa yana kichrayadi). Matn hech qachon kesilmaydi va toshmaydi.
 */
function Lines({
  text,
  base,
  max,
  lh,
  two,
  lh2,
  className,
  style,
}: {
  text: string;
  base: number;
  max: number;
  lh: number;
  /** ikki qatorga bo‘linganda — shrift o‘lchami va qator balandligi (bo‘lmasa — base / lh) */
  two?: number;
  lh2?: number;
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
        <span key={i} className="block" style={{ height: U(split ? (lh2 ?? lh) : lh), lineHeight: U(split ? (lh2 ?? lh) : lh), whiteSpace: "nowrap" }}>
          <Fit base={split ? (two ?? base) : base} max={max} deps={`${r}|${split}`}>
            {r}
          </Fit>
        </span>
      ))}
    </div>
  );
}

/* ═════════════ Bezaklar ═════════════ */
/** Figma «Bilet / Shtrix-kod» (200×30) chiziqlari: [chap %, en %] */
const BARS: readonly (readonly [number, number])[] = [
  [0, 1.25], [3, 1.75], [6.5, 1.75], [9.5, 0.75], [11, 2.5], [14.75, 0.75], [17.25, 1.75], [20.75, 0.75], [22.25, 0.75], [24.25, 0.75], [26.25, 0.75],
  [27.75, 2.5], [32, 1.25], [35, 1.75], [38.5, 0.75], [40, 1.75], [43.5, 0.75], [46, 0.75], [48.5, 2.5], [51.75, 0.75], [53.75, 0.75], [55.25, 0.75],
  [56.75, 0.75], [58.75, 0.75], [60.75, 1.75], [64.25, 0.75], [66.75, 1.75], [69.25, 1.75], [72.75, 0.75], [74.25, 0.75], [76.25, 0.75], [77.75, 0.75],
  [79.25, 0.75], [80.75, 1.25], [82.75, 0.75], [85.25, 1.25], [87.75, 0.75], [89.25, 0.75], [91.75, 1.25], [93.75, 0.75], [95.25, 0.75], [97.75, 0.75],
];
/** Shtrix-kod (SVG): `vertical` — Figma’da −90° burilgan nusxa (chiziqlar gorizontal) */
function Barcode({ color, vertical, style, className }: { color: string; vertical?: boolean; style?: CSSProperties; className?: string }) {
  return (
    <svg aria-hidden viewBox={vertical ? "0 0 1 100" : "0 0 100 1"} preserveAspectRatio="none" className={cx(st.abs, className)} style={style} shapeRendering="crispEdges">
      {BARS.map(([x, w], i) => (vertical ? <rect key={i} x={0} y={100 - x - w} width={1} height={w} fill={color} /> : <rect key={i} x={x} y={0} width={w} height={1} fill={color} />))}
    </svg>
  );
}

/** «Sanani saqlang»: `*a*` — kursiv gradientli harf */
function Marked({ text }: { text: string }) {
  const parts = text.split("*");
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <span key={i} className={st.ga}>
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/**
 * Perforatsiya — bo‘lim tepasida (chok ustida): oldingi bo‘lim rangidagi doirachalar shu bo‘limga «teshik» bo‘lib tushadi
 * (Figma: 01/02, 04/05, 07/08 choklari). Oldingi bo‘lim rangi bir xil bo‘lsa — chizilmaydi. Mobil: 14 / 22; laptop: kanvasda 16 / 26.2.
 */
function Perf({ color, wide }: { color: string | null; wide: boolean }) {
  if (!color) return null;
  const [d, gap, x0] = wide ? [16, 26.2, 8] : [14, 22, 6];
  const unit = wide ? C : U;
  return (
    <span
      aria-hidden
      className={st.perf}
      style={{
        top: unit(-d / 2),
        height: unit(d),
        backgroundImage: `radial-gradient(circle closest-side, ${color} 96%, transparent 100%)`,
        backgroundSize: `${unit(gap)} ${unit(d)}`,
        backgroundPosition: `${unit(x0 - (gap - d) / 2)} 0`,
      }}
    />
  );
}

/** Ko‘k nur (Figma: blur 45 li doira): x, y, o‘lcham — berilgan birlikda */
function Glow({ x, y, size, unit, a = 0.55 }: { x: number; y: number; size: number; unit: (n: number) => string; a?: number }) {
  const pad = size * 0.25;
  return <span aria-hidden className={st.glow} style={vars({ left: unit(x - pad), top: unit(y - pad), width: unit(size + pad * 2), height: unit(size + pad * 2), "--ga": a })} />;
}

/* ═════════════ Chipta (Figma «Bilet / Chipta» 342×554) ═════════════
 * Yuqori qism — sut rang: shtrix-kod, «Sanani saqlang» (gradientli kursiv «a»), kompaniya | tadbir nomi.
 * Pastki qism (yirtiladi) — ko‘k gradient: katta sana, joy, hafta kuni va vaqt, vertikal shtrix-kod. Chok — teshiklar va yon kesiklar. */
function Ticket({ d, scan, stubRef, shim }: { d: D; scan?: boolean; stubRef?: React.Ref<HTMLDivElement>; shim?: boolean }) {
  return (
    <div className={cx(st.ticket, shim && st.shim)} style={{ width: U(342), height: U(554) }}>
      <div className={st.tTop} style={{ width: U(342), height: U(334), borderRadius: `${U(26)} ${U(26)} ${U(6)} ${U(6)}` }}>
        <Barcode color={NAVY} style={{ left: U(96), top: U(26), width: U(150), height: U(24) }} />
        {scan && <span aria-hidden className={st.gScan} style={{ top: U(24) }} />}
        <p className={cx(st.xc, "absolute inset-x-0 text-center")} style={{ top: U(70), color: BLUE, letterSpacing: "-0.02em" }}>
          {d.saveDate.map((l, i) => (
            <span key={i} className="block" style={{ height: U(84.8), lineHeight: U(84.8), whiteSpace: "nowrap" }}>
              <Fit base={106} max={330} deps={l}>
                <Marked text={l} />
              </Fit>
            </span>
          ))}
        </p>
        {/* kompaniya | tadbir nomi */}
        <div className="absolute inset-x-0 flex items-center justify-center" style={{ top: U(260), height: U(46), gap: U(14), padding: `0 ${U(16)}` }}>
          {d.org && (
            <span className={st.xc} style={{ color: NAVY, flex: "none", maxWidth: U(d.ticketEvent ? 170 : 300) }}>
              <Lines text={d.org} base={28} max={d.ticketEvent ? 170 : 300} lh={34} two={24} lh2={25} />
            </span>
          )}
          {d.org && d.ticketEvent && <span aria-hidden className={st.tDiv} style={{ width: 1, height: U(30), background: "rgba(5,10,46,.3)", flex: "none" }} />}
          {d.ticketEvent && (
            <span className={cx(st.ss6, st.clamp2)} style={{ fontSize: U(15), lineHeight: 1.15, color: NAVY, maxWidth: U(d.org ? 120 : 300), textAlign: d.org ? "left" : "center", textWrap: "balance" }}>
              {d.ticketEvent}
            </span>
          )}
        </div>
      </div>
      <div ref={stubRef} className={st.tStub} style={{ top: U(334), width: U(342), height: U(220), borderRadius: `${U(6)} ${U(6)} ${U(26)} ${U(26)}` }}>
        {d.short && (
          <p className={cx(st.xc, "absolute")} style={{ left: U(24), top: U(30), fontSize: U(88), lineHeight: 0.9, color: "#fff", whiteSpace: "nowrap" }}>
            {d.short}
          </p>
        )}
        <div className={cx(st.ss6, "absolute")} style={{ left: U(24), top: U(134), width: U(258), fontSize: U(16), lineHeight: 1.4, color: "#fff" }}>
          {d.place && <span className={st.one}>{d.place}</span>}
          {d.wdTime && <span className={st.one}>{d.wdTime}</span>}
        </div>
        <Barcode color="#fff" vertical style={{ left: U(294), top: U(46), width: U(26), height: U(130) }} />
      </div>
      {/* chok: teshiklar va yon kesiklar */}
      {Array.from({ length: 15 }, (_, i) => (
        <span key={i} aria-hidden className={st.hole} style={{ left: U(14 + i * 22), top: U(329), width: U(10), height: U(10) }} />
      ))}
      <span aria-hidden className={st.hole} style={{ left: U(-12), top: U(322), width: U(24), height: U(24) }} />
      <span aria-hidden className={st.hole} style={{ left: U(330), top: U(322), width: U(24), height: U(24) }} />
    </div>
  );
}

/* ═════════════ 00 · Ochilish — chipta tirqishdan chiqadi (faqat scroll bilan, --o: 0…1) ═════════════
 * Yuklanganda (bosishsiz): sahna nurining uch ustuni navbat bilan yonadi (stagger 0.2 s), chipta tirqishdan ikki-uch turtki bilan
 * «chop etiladi» (y +330 → 0), tirqish chizig‘i porlaydi, shtrix-kod ustidan skaner o‘tadi — oxirgi holat = Figma kadri.
 * Scroll (rAF lerp): 0…0.42 — chipta uch turtki bilan to‘liq chiqadi (sarlavha yuqoriga suriladi), tirqish porlaydi;
 * 0.30…0.90 — chipta uzilib, kattalashib tomoshabin tomon (yuqoriga) uchib ketadi (aynan ekran tepasidan chiqib bo‘ladi);
 * 0.42…1 — sana markazga ko‘tariladi va kattalashadi, sahna nurlari kuchayadi (bo‘sh to‘xtash oralig‘i yo‘q).
 * Ochilish tugagach sahna odatdagidek yuqoriga ketadi va hero (01) ostidan chiqadi (qattiq chok — «sharpa» yo‘q). */
const GATE = {
  m: { W: 390, H: 844, S: 1, OX: 0 },
  l: { W: 1440, H: 1013, S: 1.2, OX: 486 },
} as const;
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
/** Chop etish — uch turtki: tezlik uch marta ko‘tarilib-pasayadi, lekin hech qachon nolga tushmaydi (scrollda to‘xtab qolgan kadr yo‘q) */
function pushes(p: number) {
  if (p >= 1) return 1;
  return p - (0.8 * Math.sin(6 * Math.PI * p)) / (6 * Math.PI);
}
const smooth = (x: number) => x * x * (3 - 2 * x);

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
      const p1 = seg(o, 0, 0.42);
      el.style.setProperty("--o", o.toFixed(4));
      el.style.setProperty("--tp", pushes(p1).toFixed(4));
      el.style.setProperty("--tf", smooth(seg(o, 0.3, 0.9)).toFixed(4));
      el.style.setProperty("--df", seg(o, 0.42, 1).toFixed(4));
      el.style.setProperty("--sg", Math.sin(Math.PI * p1).toFixed(4));
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
  // laptop kanvas koordinatalari (yon shtrix-kodlar)
  const Xc = (x: number) => `calc(50% + ${U(x - W / 2)})`;
  const Yc = (y: number) => `calc(100% - ${U(H - y)})`;
  const title = d.org || d.event;
  const sub = d.org ? d.event : "";
  return (
    <div
      ref={wrap}
      className={cx(st.gateWrap, still && st.still)}
      style={vars(still ? { "--u": pageU, "--s": S, "--o": 0, height: U(H) } : { "--u": `min(${pageU}, calc(100svh / ${H}))`, "--s": S })}
    >
      <div className={st.gate} aria-label={t("Taklifnoma")} style={still ? { position: "relative", height: "100%" } : undefined}>
        {/* sahna nuri — uch ustun navbat bilan yonadi; chipta uchib ketgach nurlar kuchayadi */}
        {[0, 1, 2].map((i) => (
          <div key={i} aria-hidden className={st.gBeam} style={vars({ clipPath: `inset(0 ${i === 2 ? 0 : 100 - (i + 1) * 33.34}% 0 ${i * 33.33}%)`, "--bd": `${0.05 + i * 0.2}s` })}>
            <Img src={`${P}/fon.webp`} eager />
          </div>
        ))}
        <span aria-hidden className={st.gBoost} />
        {wide && (
          <>
            <Barcode color="#fff" vertical className={st.gIn} style={vars({ left: Xc(170), top: Yc(303.9), width: U(40), height: U(300), opacity: 0.22, "--gd": "0.6s" })} />
            <Barcode color="#fff" vertical className={st.gIn} style={vars({ left: Xc(1230), top: Yc(303.9), width: U(40), height: U(300), opacity: 0.22, "--gd": "0.7s" })} />
          </>
        )}
        {/* kompaniya va tadbir nomi — chipta chiqishi bilan yuqoriga suriladi */}
        {title && (
          <div className={cx(st.gIn, "text-center")} style={vars({ left: X(24), width: Z(342), top: Y(96), "--gd": "0.25s" })}>
            <div className={st.gTitle}>
              {/* uzun nom — ikki qatorga (chiptagacha joy yetadi) */}
              <h1 className={cx(st.xc, "m-0")} style={{ color: "#fff" }}>
                <Lines text={title} base={34 * S} max={342 * S} lh={41 * S} two={30 * S} lh2={33 * S} />
              </h1>
              {sub && (
                <p className={cx(st.ss5, st.clamp2)} style={{ marginTop: Z(1), fontSize: Z(18), lineHeight: Z(22), color: "rgba(255,255,255,.75)", textWrap: "balance" }}>
                  {sub}
                </p>
              )}
            </div>
          </div>
        )}
        {/* chipta — tirqish ostidan chiqadi (scroll: to‘liq chiqadi va uchib ketadi) */}
        <div className={st.gFly} style={{ left: X(24), top: Y(262), width: Z(342), height: Z(554) }}>
          <div className={st.gPrint}>
            {/* chipta ustun birligida chiziladi (laptopda × 1.2) */}
            <div style={{ width: U(342), height: U(554), transform: S === 1 ? undefined : `scale(${S})`, transformOrigin: "0 0" }}>
              <Ticket d={d} scan={!still} />
            </div>
          </div>
        </div>
        {/* tirqish va ko‘k chiziq */}
        <div aria-hidden className={st.gSlot} style={{ top: Y(604), bottom: 0 }} />
        <div aria-hidden className={st.gLine} style={{ left: X(12), top: Y(600), width: Z(366), height: Z(6), borderRadius: Z(3) }} />
        {/* sana: «23 · 01 · 2027» */}
        {d.dots && (
          <div className={cx(st.gIn, "text-center")} style={vars({ left: X(24), width: Z(342), top: Y(700), "--gd": "0.4s" })}>
            <p className={cx(st.xc8, st.gDate)} style={{ height: Z(26), fontSize: Z(22), lineHeight: Z(26), letterSpacing: "0.06em", color: "#fff", whiteSpace: "nowrap" }}>
              {d.dots}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═════════════ Bo‘lim qobig‘i ═════════════ */
type Bg = "bgNavy" | "bgBlue" | "bgPaper";
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

/** Bo‘lim sarlavhasi (Sofia Sans Extra Condensed Black, katta harflar, markazda, 360 da sig‘adi) */
function Title({ text, color, size = 60, lh = 54, d = 0 }: { text: string; color: string; size?: number; lh?: number; d?: number }) {
  return (
    <h2 data-a="up" className={cx(st.xc, st.up, "m-0 text-center")} style={vars({ color, "--d": `${d}s` })}>
      <Lines text={text.toLocaleUpperCase()} base={size} max={342} lh={lh} />
    </h2>
  );
}

/* ═════════════ 01 · Hero — chipta: yengil suzadi, «a» harflarida yaltiroq; skrollda pastki qismi perforatsiya bo‘ylab yirtiladi ═════════════ */
function Hero({ d, z, wide, still }: { d: D; z: number; wide: boolean; still: boolean }) {
  const sec = useRef<HTMLElement>(null);
  const stub = useRef<HTMLDivElement>(null);
  const onP = useCallback((_p: number, r: DOMRect) => {
    const el = stub.current;
    if (!el) return;
    // bo‘lim balandligining 18% i ekran tepasidan o‘tgach pastki qism yirtila boshlaydi (24% scroll davomida)
    const k = seg(-r.top / Math.max(1, r.height), 0.18, 0.42);
    el.style.setProperty("--tear", easeOut(k).toFixed(4));
  }, []);
  useScrollProgress(sec, onP, !still);
  return (
    <Sec
      z={z}
      bg="bgNavy"
      className={st.heroSec}
      secRef={sec}
      colStyle={{ height: U(800) }}
      outer={
        wide ? (
          <Side wide>
            <Glow x={120} y={192} size={520} unit={C} />
            <Glow x={820} y={432} size={520} unit={C} a={0.42} />
          </Side>
        ) : (
          <div aria-hidden className={st.deco}>
            <Glow x={-80} y={120} size={360} unit={U} />
            <Glow x={140} y={420} size={340} unit={U} a={0.42} />
          </div>
        )
      }
    >
      <div data-a="rise" className="absolute" style={vars({ left: U(24), top: U(110), "--d": "0.05s" })}>
        <div className={st.float}>
          <Ticket d={d} stubRef={stub} shim />
        </div>
      </div>
    </Sec>
  );
}

/* ═════════════ 02 · Taklif — murojaat (mehmon ismi bilan), matn, imzo, shtrix-kod ═════════════ */
function Taklif({ d, z, wide, perf }: { d: D; z: number; wide: boolean; perf: string | null }) {
  const t = useT();
  const hello = d.guest ? guestHello(t, "Hurmatli {guest}!", d.guest) : t("Hurmatli mehmon!");
  // Figma: «HURMATLI / AZIZ KARIMOV!» — birinchi so‘z alohida qatorda
  const words = hello.trim().split(/\s+/);
  const l1 = words.length > 1 ? words[0] : "";
  const l2 = words.length > 1 ? words.slice(1).join(" ") : hello;
  return (
    <Sec z={z} bg="bgPaper" colStyle={{ paddingTop: U(92), paddingBottom: U(66) }} outer={<Perf color={perf} wide={wide} />}>
      <h2 data-a="up" className={cx(st.xc, "m-0 text-center")} style={vars({ color: BLUE, "--d": "0.05s" })}>
        {l1 && (
          <span className="block" style={{ height: U(45.76), lineHeight: U(45.76), whiteSpace: "nowrap" }}>
            <Fit base={52} max={342} deps={l1}>
              {l1.toLocaleUpperCase()}
            </Fit>
          </span>
        )}
        <Lines text={l2.toLocaleUpperCase()} base={52} max={342} lh={45.76} />
      </h2>
      <p data-a="up" className={cx(st.ss, "relative mx-auto text-center")} style={vars({ marginTop: U(38), width: U(334), fontSize: U(19), lineHeight: 1.55, color: NAVY, overflowWrap: "anywhere", whiteSpace: "pre-line", "--d": "0.12s" })}>
        {d.message}
      </p>
      {d.sign && (
        <p data-a="up" className={cx(st.ss6, "relative mx-auto text-center")} style={vars({ marginTop: U(74), width: U(334), fontSize: U(18), lineHeight: 1.45, color: BLUE, overflowWrap: "anywhere", "--d": "0.2s" })}>
          <span className="block">{t("Hurmat bilan,")}</span>
          <span className="block">{d.sign}</span>
        </p>
      )}
      <div data-a="up" className="relative mx-auto" style={vars({ marginTop: U(48), width: U(150), height: U(24), "--d": "0.28s" })}>
        <Barcode color={NAVY} style={{ inset: 0, width: "100%", height: "100%" }} />
      </div>
    </Sec>
  );
}

/* ═════════════ 03 · Taymer — split-flap tablo: har raqam aeroport tablosidek varaqlanadi (flip 0.25 s, ketma-ket) ═════════════ */
/**
 * Bitta katak: raqam o‘zgarsa — yuqori yarmi pastga ag‘dariladi, ostidan yangi raqamning pastki yarmi ochiladi.
 * Hech qaysi kadrda raqam yo‘qolmaydi (statik yarimlar doim eski yoki yangi raqamni ko‘rsatadi); raqamlar doim 2 xonali.
 */
function Flap({ ch, w, h, fs }: { ch: string; w: number; h: number; fs: number }) {
  const [cur, setCur] = useState(ch);
  const [prev, setPrev] = useState(ch);
  const [k, setK] = useState(0);
  useEffect(() => {
    if (ch === cur) return;
    setPrev(cur);
    setCur(ch);
    setK((x) => x + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ch]);
  const glyph = (c: string) => (
    <span className={cx(st.xc, st.glyph)} style={{ fontSize: U(fs) }}>
      {c}
    </span>
  );
  return (
    <span className={st.flap} style={{ width: U(w), height: U(h), borderRadius: U(7) }}>
      <span className={cx(st.half, st.halfT)}>{glyph(cur)}</span>
      <span className={cx(st.half, st.halfB)}>{glyph(k ? prev : cur)}</span>
      {k > 0 && (
        <>
          <span key={`t${k}`} className={cx(st.half, st.halfT, st.flipT)}>
            {glyph(prev)}
          </span>
          <span key={`b${k}`} className={cx(st.half, st.halfB, st.flipB)}>
            {glyph(cur)}
          </span>
        </>
      )}
      <span aria-hidden className={st.seam} style={{ top: U(h / 2 - 0.75), height: U(1.5) }} />
    </span>
  );
}

/** Guruh raqamlari: birinchi ko‘rinishda «00» dan ketma-ket (har katak 0.09 s kechikib) to‘g‘ri qiymatga varaqlanadi */
function FlapGroup({ value, len, run, i0 }: { value: number; len: number; run: boolean; i0: number }) {
  const digits = String(value).padStart(len, "0").split("");
  const [armed, setArmed] = useState<boolean[]>(() => digits.map(() => false));
  useEffect(() => {
    if (!run) return;
    const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ids = digits.map((_, k) => setTimeout(() => setArmed((a) => a.map((x, j) => (j === k ? true : x))), reduce ? 0 : 250 + (i0 + k) * 90));
    return () => ids.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);
  return (
    <span className="flex" style={{ gap: U(3) }}>
      {digits.map((c, k) => (
        <Flap key={digits.length - k} ch={armed[k] ?? true ? c : "0"} w={37} h={62} fs={48} />
      ))}
    </span>
  );
}

function Taymer({ d, z }: { d: D; z: number }) {
  const t = useT();
  const units = timerUnits(useLocale());
  const c = useCountdown(d.target);
  const [ref, inView] = useInView<HTMLDivElement>(0.3, true);
  if (!d.hasDate || !c) return null;
  const vals = [c.d, c.h, c.m, c.s];
  const dl = Math.max(2, String(c.d).length);
  return (
    <Sec z={z} bg="bgBlue" colStyle={{ paddingTop: U(96), paddingBottom: U(84) }}>
      <Title text={t("Boshlanishiga")} color="#fff" />
      <div ref={ref} className="relative flex justify-center" style={{ marginTop: U(60), gap: U(10) }}>
        {vals.map((v, i) => (
          <div key={i} data-a="flip" className="flex flex-col items-center" style={vars({ gap: U(8), "--d": `${0.05 + i * 0.08}s` })}>
            <FlapGroup value={v} len={i === 0 ? dl : 2} run={inView} i0={i * 2} />
            <span className={st.ss6} style={{ height: U(17), fontSize: U(14), lineHeight: U(17), color: "rgba(255,255,255,.8)", whiteSpace: "nowrap" }}>
              {units[i]}
            </span>
          </div>
        ))}
      </div>
      <p data-a="up" className={cx(st.ss6, "text-center")} style={vars({ marginTop: U(43), height: U(24), fontSize: U(20), lineHeight: U(24), color: "#fff", whiteSpace: "nowrap", "--d": "0.15s" })}>
        <Fit base={20} max={342} deps={d.longDate}>
          {d.longDate}
        </Fit>
      </p>
      <div data-a="up" className="flex justify-center" style={vars({ marginTop: U(36), "--d": "0.25s" })}>
        <button
          type="button"
          className={cx(st.ss7, st.btnW)}
          style={{ minWidth: U(250), maxWidth: U(342), height: U(56), padding: `0 ${U(22)}`, fontSize: U(17), borderRadius: U(28) }}
          onClick={() =>
            downloadIcs({
              title: [d.org, d.event].filter(Boolean).join(" — ") || t("Korporativ tadbir"),
              startLocal: `${d.iso}T${d.time || "19:00"}`,
              location: [d.venueTitle, d.address].filter(Boolean).join(", "),
              slug: "bilet",
            })
          }
        >
          {t("Kalendarga qo‘shish")}
        </button>
      </div>
    </Sec>
  );
}

/* ═════════════ 04 · Dastur — qatorlar tablo kabi navbat bilan chiqadi: har harf tasodifiy belgilardan to‘g‘ri harfga «aylanadi» (0.6 s) ═════════════ */
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
/** Tablo harflari: ko‘rinishga kirganda 0.6 s ichida tasodifiy belgilardan asl matnga; joy o‘zgarmaydi (asl matn joyni egallaydi) */
function Scramble({ text, run, className, style, delay = 0 }: { text: string; run: boolean; className?: string; style?: CSSProperties; delay?: number }) {
  const [out, setOut] = useState<string | null>(null);
  useEffect(() => {
    if (!run) return;
    if (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const chars = Array.from(text);
    let raf = 0;
    let t0 = 0;
    const step = (now: number) => {
      if (!t0) t0 = now;
      const k = (now - t0 - delay * 1000) / 600;
      if (k >= 1) return setOut(null);
      if (k < 0) {
        setOut(chars.map((ch) => (/\s/.test(ch) ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join(""));
      } else {
        const done = Math.floor(k * chars.length);
        setOut(chars.map((ch, i) => (i < done || /\s|[:.,–—-]/.test(ch) ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join(""));
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [run, text, delay]);
  return (
    <span className={cx("relative block", className)} style={style}>
      <span style={{ visibility: out === null ? "visible" : "hidden" }}>{text}</span>
      {out !== null && (
        <span aria-hidden className="absolute inset-0 overflow-hidden" style={{ whiteSpace: "inherit" }}>
          {out}
        </span>
      )}
    </span>
  );
}

function ProgramRow({ it, i }: { it: ProgramItem; i: number }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.4, true);
  return (
    <div ref={ref} data-a="row" className={cx(st.row, "relative flex")} style={vars({ minHeight: U(88), padding: `${U(20)} ${U(18)} ${U(24)}`, borderRadius: U(16), "--d": `${0.05 + i * 0.08}s` })}>
      <Scramble
        text={it.time}
        run={inView}
        delay={i * 0.08}
        className={st.xc}
        style={{ flex: "none", width: U(100), height: U(44), fontSize: U(40), lineHeight: U(48), color: BLUE, whiteSpace: "nowrap" }}
      />
      <div className="min-w-0 flex-1">
        <Scramble text={it.title} run={inView} delay={i * 0.08 + 0.05} className={cx(st.ss7, st.clamp2)} style={{ fontSize: U(18), lineHeight: U(22), color: "#fff" }} />
        {it.note?.trim() && (
          <p className={cx(st.ss, st.clamp2)} style={{ marginTop: U(4), fontSize: U(15), lineHeight: U(18), color: "rgba(255,255,255,.6)" }}>
            {it.note}
          </p>
        )}
      </div>
    </div>
  );
}

function Program({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const items = d.program.slice(0, 8);
  if (!items.length) return null;
  return (
    <Sec
      z={z}
      bg="bgNavy"
      colStyle={{ paddingTop: U(92), paddingBottom: U(76) }}
      outer={
        <Side wide={wide}>
          <Glow x={120} y={187.2} size={520} unit={C} />
          <Glow x={820} y={421.2} size={520} unit={C} a={0.42} />
        </Side>
      }
    >
      <Title text={t("bilet::Kecha dasturi")} color="#fff" />
      <div className="relative mx-auto flex flex-col" style={{ marginTop: U(54), width: U(342), gap: U(16) }}>
        {items.map((it, i) => (
          <ProgramRow key={i} it={it} i={i} />
        ))}
      </div>
    </Sec>
  );
}

/* ═════════════ 05 · Spikerlar (ixtiyoriy, 0–6) — suratlar pastdan maska bilan ochiladi ═════════════ */
const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => Array.from(w)[0]?.toLocaleUpperCase())
    .join("");

function Speakers({ d, z, wide, perf }: { d: D; z: number; wide: boolean; perf: string | null }) {
  const t = useT();
  if (!d.speakers.length) return null;
  return (
    <Sec z={z} bg="bgPaper" colStyle={{ paddingTop: U(92), paddingBottom: U(80) }} outer={<Perf color={perf} wide={wide} />}>
      <Title text={t("Spikerlar")} color={BLUE} />
      <div className="relative mx-auto flex flex-col" style={{ marginTop: U(50), width: U(342), gap: U(20) }}>
        {d.speakers.map((s, i) => (
          <div key={i} className="flex" style={{ minHeight: U(148), gap: U(16) }}>
            <div data-a="mask" className={st.photo} style={vars({ width: U(124), height: U(148), borderRadius: U(18), "--d": `${0.05 + i * 0.1}s` })}>
              {s.photo ? (
                <Img src={s.photo} className={st.zoomImg} />
              ) : (
                <span className={cx(st.xc, st.initials)} style={{ fontSize: U(52) }}>
                  {initialsOf(s.name)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1" style={{ paddingTop: U(38) }}>
              <p data-a="up" className={cx(st.xc, st.up)} style={vars({ fontSize: U(34), lineHeight: 0.92, color: NAVY, overflowWrap: "anywhere", "--d": `${0.12 + i * 0.1}s` })}>
                {s.name}
              </p>
              {s.role && (
                <p data-a="up" className={st.ss} style={vars({ marginTop: U(6), fontSize: U(16), lineHeight: 1.4, color: MUTE, overflowWrap: "anywhere", "--d": `${0.18 + i * 0.1}s` })}>
                  {s.role}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Sec>
  );
}

/* ═════════════ 06 · Manzil — zal surati, joy nomi, manzil, xarita va yo‘nalish ═════════════ */
function Venue({ d, z, linkable }: { d: D; z: number; linkable: boolean }) {
  const t = useT();
  if (!d.hasPlace) return null;
  return (
    <Sec z={z} bg="bgBlue" colStyle={{ paddingTop: U(92), paddingBottom: U(104) }}>
      <Title text={t("Manzil")} color="#fff" />
      <div data-a="zoom" className="relative mx-auto overflow-hidden" style={vars({ marginTop: U(34), width: U(342), height: U(228), borderRadius: U(22), background: NAVY, "--d": "0.1s" })}>
        <Img src={d.hall} className={st.zoomImg} />
      </div>
      {d.venueTitle && (
        <p data-a="up" className={cx(st.xc, "mx-auto text-center")} style={vars({ marginTop: U(26), width: U(342), fontSize: U(30), lineHeight: 1, color: "#fff", overflowWrap: "anywhere", textWrap: "balance", "--d": "0.15s" })}>
          {d.venueTitle}
        </p>
      )}
      {d.address && (
        <p data-a="up" className={cx(st.ss, "mx-auto text-center")} style={vars({ marginTop: U(20), width: U(342), fontSize: U(18), lineHeight: 1.45, color: "rgba(255,255,255,.85)", overflowWrap: "anywhere", textWrap: "balance", "--d": "0.22s" })}>
          {d.address}
        </p>
      )}
      <div data-a="up" className="relative mx-auto flex" style={vars({ marginTop: U(40), width: U(342), gap: U(12), "--d": "0.3s" })}>
        <a
          href={linkable ? d.mapUrl : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(st.ss7, st.btnW)}
          style={{ flex: "1 1 0", minWidth: 0, height: U(56), padding: `0 ${U(10)}`, fontSize: U(17), borderRadius: U(28) }}
        >
          {t("Xaritada ochish")}
        </a>
        <a
          href={linkable ? d.taxi : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(st.ss7, st.btnL)}
          style={{ flex: "1 1 0", minWidth: 0, height: U(56), padding: `0 ${U(10)}`, fontSize: U(17), borderWidth: U(1.5), borderRadius: U(28) }}
        >
          {t("Yo‘nalish")}
        </a>
      </div>
    </Sec>
  );
}

/* ═════════════ 07 · Dress-kod (ixtiyoriy — o‘chirilsa joy qolmaydi): oq karta, turi va izoh ═════════════ */
function Dress({ d, z }: { d: D; z: number }) {
  if (!d.dressNote && !d.dressCode) return null;
  return (
    <Sec z={z} bg="bgBlue" colStyle={{ paddingTop: U(20), paddingBottom: U(81) }}>
      <div data-a="rise" className="relative mx-auto flex flex-col items-center text-center" style={{ width: U(342), padding: `${U(30)} ${U(26)}`, gap: U(10), borderRadius: U(24), background: PAPER }}>
        {d.dressCode && (
          <p className={cx(st.xc, st.up)} style={{ height: U(48), fontSize: U(40), lineHeight: U(48), color: BLUE, whiteSpace: "nowrap" }}>
            <Fit base={40} max={290} deps={d.dressCode}>
              {d.dressCode}
            </Fit>
          </p>
        )}
        {d.dressNote && (
          <p className={st.ss} style={{ width: "100%", fontSize: U(18), lineHeight: 1.5, color: NAVY, overflowWrap: "anywhere" }}>
            {d.dressNote}
          </p>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 08 · Anketa — ishtirokni tasdiqlash («Tasdiqlash» — karta chiptaga aylanadi; «Kela olmayman» — count 0) ═════════════ */
type Sent = { name: string; status: RsvpStatus; count: number };
function Rsvp({ d, slug, mode, z, wide, perf, onSent }: { d: D; slug: string; mode: InvitationSiteProps["mode"]; z: number; wide: boolean; perf: string | null; onSent: (s: Sent | null) => void }) {
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
  const cb = useRef(onSent);
  cb.current = onSent;
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
      const stt: RsvpStatus = a.status === "not_coming" ? "not_coming" : "coming";
      setName(a.name);
      setStatus(stt);
      setCount(a.count || 1);
      setWish(a.wish);
      setSent(a.status);
      cb.current({ name: a.name, status: a.status, count: a.count || 0 });
    });
  }, [live, slug]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErr(t("Ismingizni yozing"));
    setErr(null);
    const n = status === "coming" ? count : 0;
    if (!live) {
      setSent(status);
      return cb.current({ name: name.trim(), status, count: n });
    }
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
      cb.current({ name: name.trim(), status, count: n });
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const label = (s: string, mt: number) => (
    <p className={cx(st.ss6, st.lbl)} style={{ marginTop: U(mt), height: U(18), fontSize: U(15), lineHeight: U(18) }}>
      {s}
    </p>
  );
  const sub = d.rsvpUntil ? t("Iltimos, {date} javob bering", { date: d.rsvpUntil }) : t("Javobingizni kutamiz");
  return (
    <Sec z={z} bg="bgPaper" id="bilet-javob" colStyle={{ paddingTop: U(92), paddingBottom: U(30) }} outer={<Perf color={perf} wide={wide} />}>
      <h2 data-a="up" className={cx(st.xc, "m-0 text-center")} style={vars({ color: BLUE, "--d": "0.05s" })}>
        <Lines text={t("Ishtirokingizni").toLocaleUpperCase()} base={52} max={342} lh={45.76} />
        <Lines text={t("tasdiqlang").toLocaleUpperCase()} base={52} max={342} lh={45.76} />
      </h2>
      <p data-a="up" className={cx(st.ss, "mx-auto text-center")} style={vars({ marginTop: U(22), width: U(342), minHeight: U(20), fontSize: U(17), lineHeight: U(20), color: MUTE, overflowWrap: "anywhere", "--d": "0.12s" })}>
        {sub}
      </p>
      <div data-a="rise" className="relative mx-auto" style={vars({ marginTop: U(24), width: U(342), "--d": "0.2s" })}>
        {sent ? (
          <div key="pass" className={st.pass} style={{ borderRadius: U(24), padding: `${U(30)} ${U(24)} ${U(28)}`, minHeight: U(300) }}>
            {/* chipta: tepada teshiklar, o‘ngda vertikal shtrix-kod */}
            {Array.from({ length: 15 }, (_, i) => (
              <span key={i} aria-hidden className={st.hole} style={{ left: U(14 + i * 22), top: U(-5), width: U(10), height: U(10), background: PAPER }} />
            ))}
            <Barcode color="#fff" vertical style={{ right: U(22), top: U(34), width: U(24), height: U(120) }} />
            <p className={cx(st.xc, st.up)} style={{ paddingRight: U(56), fontSize: U(52), lineHeight: 0.95 }}>
              {t("Rahmat!")}
            </p>
            <p className={st.ss6} style={{ marginTop: U(14), paddingRight: U(56), fontSize: U(18), lineHeight: 1.4, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Javobingiz uchun rahmat!") : t("{name} — {count} kishi. Javobingiz yetkazildi.", { name: name.trim() || t("Javobingiz"), count })}
            </p>
            {sent !== "not_coming" && (
              <p className={st.ss} style={{ marginTop: U(10), paddingRight: U(56), fontSize: U(16), lineHeight: 1.4, color: "rgba(255,255,255,.75)" }}>
                {t("Chiptangiz quyida — tadbirda ko‘rishguncha!")}
              </p>
            )}
            <button type="button" onClick={() => setSent(null)} className={cx(st.ss7, st.link)} style={{ marginTop: U(24), fontSize: U(16) }}>
              {t("Javobni o‘zgartirish")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className={cx(st.card, "relative flex flex-col items-stretch")} style={{ padding: `${U(22)} ${U(20)} ${U(34)}`, borderRadius: U(24), borderWidth: 1 }}>
            {label(t("Ismingiz"), 0)}
            <label className={st.field} style={{ marginTop: U(6), height: U(54), padding: `0 ${U(16)}`, borderRadius: U(14) }}>
              <input
                className={cx(st.ss6, st.input)}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder={t("Ism va familiya")}
                aria-label={t("Ismingiz")}
                style={{ fontSize: U(17) }}
              />
            </label>
            {label(t("Kelasizmi?"), 22)}
            <div className="flex w-full" role="radiogroup" aria-label={t("Kelasizmi?")} style={{ marginTop: U(6), gap: U(8) }}>
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
                  className={cx(st.ss7, st.choice)}
                  style={{ flex: "1 1 0", padding: `${U(4)} ${U(6)}`, minHeight: U(54), fontSize: U(17), borderWidth: U(1.5), borderRadius: U(27) }}
                >
                  <span style={{ overflowWrap: "anywhere" }}>{t(l)}</span>
                </button>
              ))}
            </div>
            {status === "coming" && (
              <>
                {label(t("Necha kishi bo‘lasiz?"), 22)}
                <div className={cx(st.field, "justify-between")} style={{ marginTop: U(6), height: U(54), padding: `0 ${U(7)} 0 ${U(8)}`, borderRadius: U(14) }}>
                  <button type="button" className={cx(st.ss7, st.step)} disabled={count <= 1} onClick={() => setCount((n) => Math.max(1, n - 1))} aria-label={t("Kamaytirish")} style={{ width: U(40), height: U(40), fontSize: U(20) }}>
                    −
                  </button>
                  <span className={st.xc} style={{ fontSize: U(30), lineHeight: 1.2, color: NAVY }} aria-live="polite">
                    {count}
                  </span>
                  <button type="button" className={cx(st.ss7, st.step)} disabled={count >= 20} onClick={() => setCount((n) => Math.min(20, n + 1))} aria-label={t("Ko‘paytirish")} style={{ width: U(40), height: U(40), fontSize: U(20) }}>
                    +
                  </button>
                </div>
              </>
            )}
            {label(t("Tilak yoki savolingiz"), 24)}
            <label className={st.field} style={{ marginTop: U(6), height: U(130), padding: `${U(16)} ${U(16)}`, borderRadius: U(14), alignItems: "flex-start" }}>
              <textarea
                rows={4}
                className={cx(st.ss, st.input)}
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                maxLength={500}
                placeholder={t("Yozing…")}
                aria-label={t("Tilak yoki savolingiz")}
                style={{ fontSize: U(17), height: "100%" }}
              />
            </label>
            {err && (
              <p className={st.ss} style={{ marginTop: U(12), color: "#c2410c", fontSize: U(15) }}>
                {err}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className={cx(st.ss7, st.submit)}
              style={{ marginTop: U(30), minHeight: U(56), padding: `${U(10)} ${U(12)}`, fontSize: U(17), borderRadius: U(28), opacity: busy ? 0.7 : 1 }}
            >
              {busy ? t("Yuborilmoqda…") : t("Tasdiqlash")}
            </button>
          </form>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 09 · Final — chipta qoldig‘i pastdan ko‘tariladi, ko‘k nurlar ritmda pulsatsiya qiladi
 * (scroll bilan: --fc 0 … 1 = Figma kadri; sahifa oxirigacha albatta tugaydi) ═════════════ */
function Final({ d, z, wide, still, onSeen, sent }: { d: D; z: number; wide: boolean; still: boolean; onSeen: () => void; sent: Sent | null }) {
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
  // chipta qoldig‘i: kompaniya, tadbir nomi va mehmon (javob berilgan bo‘lsa — kishi soni bilan)
  const who = sent
    ? sent.status === "not_coming"
      ? sent.name
      : t("{name} · {n} kishi", { name: sent.name, n: sent.count })
    : d.demoGuest && d.guest === d.demoGuest
      ? t("{name} · {n} kishi", { name: d.guest, n: 2 })
      : d.guest;
  const head = d.org || d.event;
  const line1 = d.org ? d.event : "";
  return (
    <section ref={sec} className={cx(st.sec, st.bgNavy)} style={{ zIndex: z }}>
      <div aria-hidden className={st.fill}>
        <Img src={`${P}/fon.webp`} />
        <span className={st.pulse} />
      </div>
      <Side wide={wide}>
        <Barcode color="#fff" vertical style={{ left: `calc(50% + ${C(170 - 720)})`, top: C(303.9), width: C(40), height: C(300), opacity: 0.22 }} />
        <Barcode color="#fff" vertical style={{ left: `calc(50% + ${C(1230 - 720)})`, top: C(303.9), width: C(40), height: C(300), opacity: 0.22 }} />
      </Side>
      <div ref={ref} className={cx(st.col, st.finalWrap)} style={vars({ width: U(390), height: U(844), ...(still ? { "--fc": 1 } : {}) })}>
        <h2 data-a="up" className={cx(st.xc, st.up, "absolute inset-x-0 m-0 text-center")} style={vars({ top: U(230), height: U(50), fontSize: U(58), lineHeight: U(50), color: "#fff", whiteSpace: "nowrap", "--d": "0.1s" })}>
          <Fit base={58} max={342} deps={t("Ko‘rishguncha!")}>
            {t("Ko‘rishguncha!")}
          </Fit>
        </h2>
        {d.finalDate && (
          <p data-a="up" className={cx(st.ss6, "absolute inset-x-0 text-center")} style={vars({ top: U(370), height: U(24), fontSize: U(20), lineHeight: U(24), color: "rgba(255,255,255,.8)", whiteSpace: "nowrap", "--d": "0.2s" })}>
            {d.finalDate}
          </p>
        )}
        {/* chipta qoldig‘i (yirtilgan qism) */}
        <div className={cx(st.fStub, "absolute")} style={{ left: U(45), top: U(470), width: U(300), minHeight: U(150), padding: `${U(22)} ${U(54)} ${U(24)} ${U(24)}`, borderRadius: U(22), background: "linear-gradient(90deg, #0e1f9e 0%, #1f3bff 100%)" }}>
          {Array.from({ length: 13 }, (_, i) => (
            <span key={i} aria-hidden className={st.hole} style={{ left: U(10 + i * 22), top: U(-5), width: U(10), height: U(10) }} />
          ))}
          {head && (
            <div className={st.xc} style={{ color: "#fff" }}>
              <Lines text={head} base={44} max={222} lh={53} two={32} lh2={36} />
            </div>
          )}
          <div className={st.ss6} style={{ marginTop: U(9), width: U(222), fontSize: U(15), lineHeight: 1.4, color: "#fff" }}>
            {line1 && <span className={st.one}>{line1}</span>}
            {who && <span className={st.one}>{who}</span>}
          </div>
          <Barcode color="#fff" vertical style={{ left: U(262), top: U(25), width: U(22), height: U(100) }} />
        </div>
      </div>
    </section>
  );
}

/* ═════════════ Musiqa tugmasi — Figma «Bilet / Musiqa tugmasi»: ko‘k doira, 4 ta oq chiziq ritmda; o‘chirilgan — chiziqlar past (4px) ═════════════ */
const MBARS = [10, 18, 13, 20];
function BiletMusic({ m, wide, embedded }: { m: ReturnType<typeof useMusic>; wide: boolean; embedded: boolean }) {
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

export function BiletSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const loaded = usePreload([`${P}/fon.webp`], [`${P}/zal.webp`, ...d.speakers.map((s) => s.photo)].filter(Boolean) as string[], withGate, wide ? "l" : "m");
  useReveal(root, loaded, embedded);
  const [loaderGone, setLoaderGone] = useState(!withGate);
  const [sent, setSent] = useState<Sent | null>(null);
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
  /** Perforatsiya rangi: oldingi bo‘lim foni (o‘zi bilan bir xil bo‘lsa — yo‘q) */
  const BG: Record<Key, string> = { hero: NAVY, taklif: PAPER, taymer: BLUE, program: NAVY, speakers: PAPER, venue: BLUE, dress: BLUE, rsvp: PAPER, final: NAVY };
  const perf = (k: Key) => {
    const prev = shown[shown.indexOf(k) - 1];
    return prev && BG[prev] !== BG[k] ? BG[prev] : null;
  };
  const linkable = mode !== "preview";
  const colU = wide ? COL_L : COL_M;

  return (
    <div ref={root} className={st.root}>
      <div className={st.page} style={vars({ "--u": colU })}>
        <BiletMusic m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/muhr.webp`} />}
        <div className={st.flow}>
          {withGate && (loaded ? <Gate d={d} wide={wide} onStart={() => music.play(true)} /> : <div className={st.gateHold} />)}
          {embedded && <Gate d={d} wide={wide} still onStart={() => {}} />}
          <Hero d={d} z={z("hero")} wide={wide} still={embedded} />
          <Taklif d={d} z={z("taklif")} wide={wide} perf={perf("taklif")} />
          <Taymer d={d} z={z("taymer")} />
          <Program d={d} z={z("program")} wide={wide} />
          <Speakers d={d} z={z("speakers")} wide={wide} perf={perf("speakers")} />
          <Venue d={d} z={z("venue")} linkable={linkable} />
          <Dress d={d} z={z("dress")} />
          {data.rsvpEnabled && <Rsvp d={d} slug={data.slug} mode={mode} z={z("rsvp")} wide={wide} perf={perf("rsvp")} onSent={setSent} />}
          <Final d={d} z={z("final")} wide={wide} still={embedded} onSeen={onFinal} sent={sent} />
        </div>
        <footer className={cx(st.footer, "flex items-start justify-center")} style={{ height: U(120), paddingTop: U(50) }}>
          <p className={cx(st.ss5, "text-center")} style={{ fontSize: U(14), lineHeight: U(17), color: "rgba(255,255,255,.6)" }}>
            <a href="https://shohnoma.uz">{t("shohnoma.uz orqali yaratilgan")}</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
