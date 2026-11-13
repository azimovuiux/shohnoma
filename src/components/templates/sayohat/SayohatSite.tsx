"use client";

import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/playfair-display/400.css";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { splitDate, tashkentDate } from "@/lib/display";
import { musicSrc } from "@/lib/music";
import { useLocale, useT } from "@/lib/i18n";
import type { InvitationSiteProps } from "@/components/invitation/types";
import { fetchSavedAnswer, loadSavedRsvp, rsvpUrl, saveRsvp, type RsvpStatus } from "@/components/invitation/Rsvp";
import { useGuestName } from "../shared/guest";
import { timerUnits } from "@/components/invitation/data";
import { useCountdown, useCountUp, useInView, useWide } from "../shared/hooks";
import { Loader, usePreload, useMusic } from "../shared/runtime";
import { DRESS, calendarWords, coordsFrom, downloadIcs, type ProgramItem } from "../anor/data";
import { LANDMARKS, P, ROAD, SAYOHAT_DEMO, SAYOHAT_DEMO_EN, SAYOHAT_DEMO_RU, SCREENS, SKY, SKYLINE, SPEED, STAGE_L, STAGE_M, type ScreenKey, type Stage, type Tile } from "./data";
import st from "./sayohat.module.css";

/* ── Birliklar ──
 * U — kadr birligi (mobil 390×844, laptop 1440×900; Figma koordinatalari). Kadr ekranga to‘liq sig‘adi va pastki chetga bog‘langan.
 * C — karta/matn birligi: mobil Figma o‘lchamlari; laptopda × 1.12 (Figma laptop kartalari mobilning 1.12 nusxasi). */
const U = (n: number) => `calc(var(--u) * ${+n.toFixed(3)})`;
const C = (n: number) => `calc(var(--c) * ${+n.toFixed(3)})`;
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const vars = (o: Record<string, string | number | undefined>) => o as CSSProperties;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/* ── Ma’lumot (taklifnoma tilida — InvitationSite LocaleProvider’i) ── */
function useData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO = lang === "ru" ? SAYOHAT_DEMO_RU : lang === "en" ? SAYOHAT_DEMO_EN : SAYOHAT_DEMO;
  const ex = (data.extra ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof ex[k] === "string" ? (ex[k] as string).trim() : "");
  const sd = splitDate(data.date);
  const guest = useGuestName();
  return useMemo(() => {
    const cw = calendarWords(lang);
    const exProgram = Array.isArray(ex.program) ? (ex.program as ProgramItem[]).filter((p) => p?.time && p?.title) : [];
    const date = sd ? new Date(`${sd.iso}T12:00:00Z`) : null;
    const code = str("dressCode") || (demo ? DEMO.dressCode : "");
    const dz = DRESS[code];
    // namunadagi ismlar tarjima qilinadi (mijoz ma’lumoti — o‘zgarishsiz)
    const a = ((demo ? t(data.personA) : data.personA) || "").trim();
    const b = ((demo && data.personB ? t(data.personB) : data.personB) || "").trim();
    const time = sd?.time ?? "";
    const program = ((demo ? DEMO.program : exProgram.length ? exProgram : (data.program as ProgramItem[])) ?? []).filter((p) => p?.title);
    const y = date ? date.getUTCFullYear() : 0;
    const m = date ? date.getUTCMonth() : 0;
    const day = date ? date.getUTCDate() : 0;
    const message = (demo ? DEMO.message : data.message || "").replace(/^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Дорогие гости!|Dear guests!)\s*/, "").trim();
    const coords = demo ? { lat: 41.3111, lon: 69.2797 } : coordsFrom(data.mapUrl);
    const venueTitle = (demo ? DEMO.venueTitle : data.venueName) || "";
    const address = (demo ? DEMO.address : data.address) || "";
    return {
      a,
      b,
      /** «Jasur & Madina» (Figma) */
      pair: b ? `${a} & ${b}` : a,
      dots: sd?.dots ?? "",
      iso: sd?.iso ?? "",
      time,
      /** «12 sentabr 2026» / «12 сентября 2026» / «12 September 2026» */
      dateLong: date ? `${day} ${cw.monthsAfterDay[m]} ${y}` : "",
      /** «Shanba · soat 17:00» */
      when: date ? [cw.weekday[date.getUTCDay()], time ? t("soat {time}", { time }) : ""].filter(Boolean).join(" · ") : "",
      hasDate: !!date,
      target: data.date ? tashkentDate(data.date).getTime() : null,
      guest,
      message,
      venueTitle,
      address,
      mapUrl: data.mapUrl || `https://yandex.uz/maps/?text=${encodeURIComponent([venueTitle, address].filter(Boolean).join(", "))}`,
      taxi: coords
        ? `https://3.redirect.appmetrica.yandex.com/route?end-lat=${coords.lat}&end-lon=${coords.lon}&appmetrica_tracking_id=1178268795219780156`
        : `https://yandex.uz/maps/?rtext=~${encodeURIComponent([address, venueTitle].filter(Boolean).join(", "))}&rtt=taxi`,
      program,
      dress: dz
        ? {
            ...dz,
            title: t(dz.title),
            sub: t(dz.sub),
            note: str("dressNote") || t(dz.note),
            imgs: dz.imgs.map((x) => ({ ...x, label: t(x.label) })),
          }
        : null,
      musicUrl: musicSrc(template, data),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, data, demo, guest, lang, t]);
}
type D = ReturnType<typeof useData>;

function Img({ src, className, style, eager }: { src: string; className?: string; style?: CSSProperties; eager?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" draggable={false} loading={eager ? "eager" : "lazy"} decoding="async" className={cx(st.img, className)} style={style} />;
}

/** Uzun ism/matn bir qatorga sig‘masa — shrift kichrayadi (kesilmaydi, toshmaydi). base/max — C birligida */
function Fit({ children, base, max, className, style, deps }: { children: ReactNode; base: number; max: number; className?: string; style?: CSSProperties; deps: unknown }) {
  const ref = useRef<HTMLSpanElement>(null);
  useIso(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      el.style.fontSize = C(base);
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (!px) return;
      const c = px / base;
      const w = el.scrollWidth;
      const k = w > max * c ? (max * c) / w : 1;
      el.style.fontSize = C(+(base * k).toFixed(3));
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

/** Harfma-harf (paydo bo‘lishda) */
function Letters({ text, d0 = 0, step = 0.04 }: { text: string; d0?: number; step?: number }) {
  return (
    <>
      {[...text].map((ch, i) => (
        <span key={i} data-w className={st.ch} style={vars({ "--d": `${(d0 + Math.min(i, 30) * step).toFixed(2)}s` })}>
          {ch}
        </span>
      ))}
    </>
  );
}

/* ═════════════ Panorama — parallaks qatlamlar (Figma 364:5730) ═════════════ */
const tileStyle = (tl: Tile, s: number, dy = 0): CSSProperties => ({
  left: U(tl.x * s),
  top: U((tl.y + dy) * s),
  width: U(tl.w * s),
  height: U(tl.h * s),
});

function Layer({ tiles, s, sx, lref, up = false, eager = false }: { tiles: Tile[]; s: number; sx: number; lref: (el: HTMLDivElement | null) => void; up?: boolean; eager?: boolean }) {
  return (
    <div ref={lref} className={st.layer} style={vars({ left: "var(--fx)", top: "var(--fy)", height: U(844 * s), "--sx": sx })}>
      {tiles.map((tl, i) => (
        <div key={i} className={cx(st.tile, tl.m && st.mirror)} style={tileStyle(tl, s)}>
          <Img src={`${P}/${tl.src}.webp`} eager={eager} />
        </div>
      ))}
      {up &&
        tiles.map((tl, i) => (
          <div key={`u${i}`} className={cx(st.tile, st.skyUp, tl.m && st.mirror)} style={tileStyle(tl, s, -tl.h)} aria-hidden>
            <Img src={`${P}/${tl.src}.webp`} eager={eager} />
          </div>
        ))}
    </div>
  );
}

/* ═════════════ Ekranlar ═════════════ */
/** Karta joyi: markazda, Figma y (laptop × 1.05), eni × k. Uzun ma’lumotda karta juftlik ustidagi chiziqqa sig‘diriladi (masshtab). */
function Slot({ G, y, w, maxBottom, children, kbRef }: { G: Stage; y: number; w: number; maxBottom: number; children: ReactNode; kbRef?: (el: HTMLDivElement | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const top = y * G.ky;
  useIso(() => {
    const el = ref.current;
    const card = el?.firstElementChild as HTMLElement | null;
    if (!el || !card) return;
    const fit = () => {
      const c = el.offsetWidth / w; // px / C birligi
      if (!c) return;
      const allowed = ((maxBottom - top) / G.k) * c;
      const h = card.offsetHeight;
      el.style.setProperty("--fk", h > allowed ? (allowed / h).toFixed(4) : "1");
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(card);
    ro.observe(el);
    return () => ro.disconnect();
  }, [G, top, w, maxBottom]);
  return (
    <div
      ref={(el) => {
        ref.current = el;
        kbRef?.(el);
      }}
      className={st.slot}
      style={{ left: `calc(50% - ${C(w / 2)})`, top: `calc(100% - ${U(G.H - top)})`, width: C(w) }}
    >
      {children}
    </div>
  );
}

/** Bir necha qator ism — hammasi bir xil shriftda (eng uzun qator sig‘adigan o‘lcham), C birligida */
function FitLines({ lines, base, max, lh, className, style }: { lines: string[]; base: number; max: number; lh: number; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null);
  const key = lines.join("\n");
  useIso(() => {
    const el = ref.current;
    if (!el) return;
    const spans = Array.from(el.children) as HTMLElement[];
    const measure = () => {
      el.style.fontSize = C(base);
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (!px) return;
      const c = px / base;
      const w = Math.max(...spans.map((x) => x.scrollWidth));
      const k = w > max * c ? (max * c) / w : 1;
      el.style.fontSize = C(+(base * k).toFixed(3));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (el.parentElement) ro.observe(el.parentElement);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [base, max, key]);
  return (
    <span ref={ref} className={cx("flex flex-col items-center", className)} style={{ lineHeight: lh, ...style }}>
      {lines.map((l, i) => (
        <span key={i} className="inline-block whitespace-nowrap">
          {l}
        </span>
      ))}
    </span>
  );
}

/** Uzun juft ism: mobilda ikki qatorga («Ism &» / «Ism»), laptopda keng bitta qator */
const nameLines = (d: D, wide: boolean, limit: number) => (!wide && d.b && [...d.pair].length > limit ? [`${d.a} &`, d.b] : [d.pair]);

/** 01 · Start — ismlar va sana (haykal oldida); sana ismlar ostidan (Figma oralig‘i: mobil 11.4, laptop 8.2 px) */
function Start({ d, G, wide, ready }: { d: D; G: Stage; wide: boolean; ready: boolean }) {
  const lines = nameLines(d, wide, 22);
  return (
    <div className="absolute inset-x-0 flex flex-col items-center text-center" style={{ top: `calc(100% - ${U(G.H - 110 * G.ky)})`, opacity: ready ? undefined : 0 }}>
      <h1 className={cx(st.cgi, ready && st.namesIn)} style={{ color: "var(--ink)" }}>
        <FitLines lines={lines} base={lines.length > 1 ? 44 : 52} max={wide ? 980 : 366} lh={1.05} />
      </h1>
      {d.dots && (
        <p className={cx(st.mm, ready && st.dateIn)} style={{ marginTop: C(wide ? 7.3 : 11.4), fontSize: C(15), letterSpacing: C(3.6), paddingLeft: C(3.6), lineHeight: 1.22, color: "var(--ink)", whiteSpace: "nowrap" }}>
          {d.dots}
        </p>
      )}
    </div>
  );
}

/** Oddiy karta qobig‘i (Figma «Karta»: p24, gap10, r20) */
function Card({ children, gap = 10, pad = 24, center = true, d0 = 0 }: { children: ReactNode; gap?: number; pad?: number; center?: boolean; d0?: number }) {
  return (
    <div data-a="drop" className={cx(st.card, "flex flex-col", center ? "items-center text-center" : "items-start")} style={vars({ padding: C(pad), gap: C(gap), borderRadius: C(20), "--d": `${d0}s` })}>
      {children}
    </div>
  );
}

function Title({ text, d0 = 0.15, size = 34 }: { text: string; d0?: number; size?: number }) {
  return (
    <p data-a="blur" className={cx(st.cgi, "w-full text-center")} style={vars({ lineHeight: 1.21, color: "var(--ink)", "--d": `${d0}s` })}>
      <Fit base={size} max={282} deps={text}>
        {text}
      </Fit>
    </p>
  );
}

/** 02 · Taklif */
function Taklif({ d, G }: { d: D; G: Stage }) {
  const t = useT();
  const hello = d.guest ? `${t("Hurmatli {guest}", { guest: d.guest })}!` : t("Aziz mehmonimiz!");
  return (
    <Slot G={G} y={70} w={330} maxBottom={G.maxBottom}>
      <Card>
        <Title text={hello} />
        <p data-a="up" className={cx(st.mr, st.clamp12, "w-full")} style={vars({ fontSize: C(16), lineHeight: 1.55, color: "var(--muted)", whiteSpace: "pre-line", "--d": "0.3s" })}>
          {d.message}
        </p>
      </Card>
    </Slot>
  );
}

function Digits({ value, run, len, i }: { value: number; run: boolean; len: number; i: number }) {
  const c = useCountUp(value, run, 1400 + i * 150);
  const digits = String(c.value).padStart(len, "0").split("");
  return (
    <span className={st.digits}>
      {digits.map((dg, k) => (
        <span key={c.done ? `${digits.length - k}-${dg}` : `${digits.length - k}`} className={c.done ? st.digit : undefined}>
          {dg}
        </span>
      ))}
    </span>
  );
}

/** 03 · Sana va taymer (teleminora) */
function Sana({ d, G, slug }: { d: D; G: Stage; slug: string }) {
  const t = useT();
  const lang = useLocale();
  const units = lang === "uz" ? ["kun", "soat", "daq", "son"] : timerUnits(lang);
  const c = useCountdown(d.target);
  const [ref, inView] = useInView<HTMLDivElement>(0.3, true);
  const vals = c ? [c.d, c.h, c.m, c.s] : [0, 0, 0, 0];
  return (
    <Slot G={G} y={60} w={330} maxBottom={G.maxBottom}>
      <Card>
        <p data-a="blur" className={cx(st.cgi, "w-full")} style={vars({ lineHeight: 1.21, color: "var(--ink)", "--d": "0.15s" })}>
          <Fit base={36} max={282} deps={d.dateLong}>
            {d.dateLong}
          </Fit>
        </p>
        {d.when && (
          <p data-a="up" className={cx(st.mm, "w-full")} style={vars({ lineHeight: 1.22, color: "var(--terra)", "--d": "0.3s" })}>
            <Fit base={15} max={282} deps={d.when} style={{ letterSpacing: "0.08em" }}>
              {d.when}
            </Fit>
          </p>
        )}
        <div ref={ref} className="flex items-start" style={{ gap: C(14) }}>
          {vals.map((v, i) => (
            <div key={i} data-a="up" className="flex flex-col items-center" style={vars({ gap: C(2), "--d": `${0.4 + i * 0.08}s`, "--y": 14 })}>
              <span className={st.cgs} style={{ fontSize: C(32), lineHeight: 1.21, color: "var(--ink)" }}>
                <Digits value={v} run={inView} len={i === 0 ? Math.max(2, String(vals[0]).length) : 2} i={i} />
              </span>
              <span className={st.mr} style={{ fontSize: C(12), lineHeight: 1.22, color: "var(--muted)", whiteSpace: "nowrap" }}>
                {units[i]}
              </span>
            </div>
          ))}
        </div>
        <div data-a="up" style={vars({ "--d": "0.7s" })}>
          <button
            type="button"
            className={cx(st.mm, st.pill, st.pillLine)}
            style={{ padding: `${C(11)} ${C(20)}`, fontSize: C(14), borderWidth: C(1) }}
            onClick={() =>
              downloadIcs({
                title: d.b ? t("{names} — to‘y", { names: d.pair }) : t("{name} — taklif", { name: d.a }),
                startLocal: `${d.iso}T${d.time || "17:00"}`,
                location: [d.venueTitle, d.address].filter(Boolean).join(", "),
                slug,
              })
            }
          >
            {t("Kalendarga qo‘shish")}
          </button>
        </div>
      </Card>
    </Slot>
  );
}

/** 04 · Kun tartibi (masjid) */
function Dastur({ d, G }: { d: D; G: Stage }) {
  const t = useT();
  const items = d.program.slice(0, 8);
  return (
    <Slot G={G} y={56} w={330} maxBottom={G.maxBottom}>
      <Card>
        <Title text={t("Kun tartibi")} />
        {items.map((it, i) => (
          <div key={i} data-a="up" className="flex w-full items-center text-left" style={vars({ gap: C(14), "--d": `${0.3 + i * 0.08}s`, "--y": 10 })}>
            <span className={st.ms} style={{ flex: "none", fontSize: C(15), lineHeight: 1.22, color: "var(--terra)", whiteSpace: "nowrap" }}>
              {it.time}
            </span>
            <span className={cx(st.mr, st.clamp2)} style={{ flex: "1 1 0", minWidth: 0, fontSize: C(16), lineHeight: 1.22, color: "var(--ink)" }}>
              {it.title}
            </span>
          </div>
        ))}
      </Card>
    </Slot>
  );
}

/** 05 · Dress-kod (ixtiyoriy) — Figma umumiy «Dress-kod» komponenti (yorliq teshigi bilan) */
function Dress({ d, G }: { d: D; G: Stage }) {
  const t = useT();
  if (!d.dress) return null;
  const x = d.dress;
  const one = x.imgs.length === 1;
  return (
    <Slot G={G} y={36} w={314.64} maxBottom={G.maxBottom}>
      <div data-a="drop" className={cx(st.dress, "flex flex-col items-start")} style={{ padding: `${C(27.6)} ${C(22.08)} ${C(25.76)}`, gap: C(11.04), borderRadius: C(20.24) }}>
        <div data-a="up" className="flex items-center" style={vars({ gap: C(9.2), "--d": "0.2s" })}>
          <svg viewBox="0 0 12.88 12.88" style={{ width: C(12.88), height: C(12.88), flex: "none" }} aria-hidden>
            <circle cx="6.44" cy="6.44" r="5.98" fill="#E4EAF2" stroke="#C8CDD6" strokeWidth="0.92" />
          </svg>
          <p className={st.mono} style={{ fontSize: C(12), letterSpacing: C(1.92), lineHeight: 1.22, color: "#6f7a8c", whiteSpace: "nowrap" }}>
            {t("DRESS-KOD")}
          </p>
        </div>
        <p data-a="blur" className={cx(st.pf, "w-full")} style={vars({ fontSize: C(31.28), lineHeight: 1.1, color: "#1c2b45", overflowWrap: "anywhere", "--d": "0.25s" })}>
          {x.title}
        </p>
        <p data-a="up" className={cx(st.on, "w-full")} style={vars({ fontSize: C(15.64), lineHeight: 1.25, color: "#c9664a", "--d": "0.35s" })}>
          {x.sub}
        </p>
        <div className="flex w-full justify-center" style={{ gap: C(9.2) }}>
          {x.imgs.map((im, i) => (
            <div key={im.src} data-a="up" className="flex flex-col items-center" style={vars({ gap: C(7.36), flex: one ? "none" : "1 1 0", minWidth: 0, "--d": `${0.45 + i * 0.1}s`, "--y": 16 })}>
              <div className="overflow-hidden" style={{ width: C(one ? 200 : 130.64), height: C(150.88), borderRadius: C(14.72), background: "#fff" }}>
                <Img src={im.src} style={one ? { objectFit: "contain" } : undefined} />
              </div>
              <p className={st.mono} style={{ fontSize: C(12), letterSpacing: C(1.5), lineHeight: 1.22, color: "#6f7a8c", whiteSpace: "nowrap" }}>
                {im.label}
              </p>
            </div>
          ))}
        </div>
        <p data-a="up" className={cx(st.on, st.clamp4, "w-full")} style={vars({ fontSize: C(14.72), lineHeight: 1.5, color: "#6f7a8c", "--d": "0.65s" })}>
          {x.note}
        </p>
      </div>
    </Slot>
  );
}

/** 06 · Manzil (to‘yxona) */
function Manzil({ d, G, linkable }: { d: D; G: Stage; linkable: boolean }) {
  const t = useT();
  return (
    <Slot G={G} y={60} w={330} maxBottom={G.maxBottom}>
      <Card>
        <Title text={t("Bazm manzili")} />
        {d.venueTitle && (
          <p data-a="up" className={cx(st.ms, st.clamp2, "w-full")} style={vars({ fontSize: C(17), lineHeight: 1.22, color: "var(--ink)", "--d": "0.3s" })}>
            {d.venueTitle}
          </p>
        )}
        {d.address && (
          <p data-a="up" className={cx(st.mr, st.clamp3, "w-full")} style={vars({ fontSize: C(15), lineHeight: 1.5, color: "var(--muted)", "--d": "0.4s" })}>
            {d.address}
          </p>
        )}
        <div data-a="up" className="flex justify-center" style={vars({ gap: C(10), "--d": "0.5s" })}>
          <a href={linkable ? d.mapUrl : undefined} target="_blank" rel="noopener noreferrer" className={cx(st.mm, st.pill, st.pillFill)} style={{ padding: `${C(11)} ${C(20)}`, fontSize: C(14), borderWidth: C(1) }}>
            {t("Xaritada ochish")}
          </a>
          <a href={linkable ? d.taxi : undefined} target="_blank" rel="noopener noreferrer" className={cx(st.mm, st.pill, st.pillLine)} style={{ padding: `${C(11)} ${C(20)}`, fontSize: C(14), borderWidth: C(1) }}>
            {t("Taksi")}
          </a>
        </div>
      </Card>
    </Slot>
  );
}

/** 07 · Anketa (to‘yxona oldida) */
function Anketa({ d, G, slug, mode, kbRef }: { d: D; G: Stage; slug: string; mode: InvitationSiteProps["mode"]; kbRef: (el: HTMLDivElement | null) => void }) {
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
    (document.activeElement as HTMLElement | null)?.blur?.();
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
  const label = (s: string, d0: number) => (
    <p data-a="up" className={cx(st.mm, st.lbl)} style={vars({ fontSize: C(12), letterSpacing: C(1.44), "--d": `${d0}s`, "--y": 8 })}>
      {s}
    </p>
  );
  return (
    <Slot G={G} y={40} w={342} maxBottom={G.H - 24} kbRef={kbRef}>
      {sent ? (
        <div key="thanks" className={cx(st.card, st.thanks, "flex flex-col items-center text-center")} style={{ padding: `${C(40)} ${C(24)}`, gap: C(14), borderRadius: C(20) }}>
          <p className={st.cgi} style={{ fontSize: C(sent === "not_coming" ? 40 : 32), lineHeight: 1.2, color: "var(--ink)", overflowWrap: "anywhere" }}>
            {sent === "not_coming" ? t("Rahmat!") : t("Rahmat! Joyingiz band qilindi")}
          </p>
          <p className={st.mr} style={{ fontSize: C(15), color: "var(--muted)", lineHeight: 1.5, overflowWrap: "anywhere" }}>
            {sent === "not_coming" ? t("Javobingiz uchun rahmat — sizni duolarimizda eslaymiz.") : t("{name} — {count} kishi. Javobingiz yetkazildi.", { name: name.trim() || t("Javobingiz"), count })}
          </p>
          <button type="button" onClick={() => setSent(null)} className={cx(st.mm, st.pill, st.pillLine)} style={{ padding: `${C(11)} ${C(20)}`, fontSize: C(14), borderWidth: C(1) }}>
            {t("Javobni o‘zgartirish")}
          </button>
        </div>
      ) : (
        <form key="form" data-a="drop" onSubmit={submit} noValidate className={cx(st.card, "flex flex-col items-start")} style={{ padding: C(24), gap: C(12), borderRadius: C(20) }}>
          <p data-a="blur" className={cx(st.cgi, "w-full text-center")} style={vars({ lineHeight: 1.21, color: "var(--ink)", "--d": "0.15s" })}>
            <Fit base={34} max={294} deps={t("Kelasizmi?")}>
              {t("Kelasizmi?")}
            </Fit>
          </p>
          {label(t("ISMINGIZ"), 0.25)}
          <div data-a="up" className="w-full" style={vars({ "--d": "0.3s", "--y": 8 })}>
            <input className={cx(st.mr, st.field)} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={t("Ismingiz")} aria-label={t("Ismingiz")} autoComplete="name" style={{ fontSize: C(15), padding: C(14), borderWidth: C(1), borderRadius: C(12) }} />
          </div>
          <div data-a="up" className="flex w-full" role="radiogroup" aria-label={t("Kelasizmi?")} style={vars({ gap: C(8), "--d": "0.36s", "--y": 8 })}>
            {(
              [
                ["coming", "Albatta kelaman"],
                ["not_coming", "Kela olmayman"],
              ] as const
            ).map(([s, l]) => (
              <button key={s} type="button" role="radio" aria-checked={status === s} onClick={() => setStatus(s)} className={cx(st.mm, st.choice)} style={{ padding: `${C(12)} ${C(6)}`, minHeight: C(43), fontSize: C(14), borderWidth: C(1) }}>
                <span style={{ overflowWrap: "anywhere" }}>{t(l)}</span>
              </button>
            ))}
          </div>
          {status === "coming" && (
            <div data-a="up" className="flex w-full items-center" style={vars({ gap: C(6), "--d": "0.42s", "--y": 8 })}>
              <p className={st.mr} style={{ flex: "1 1 0", minWidth: 0, fontSize: C(14), lineHeight: 1.22, color: "var(--ink)" }}>
                {t("Necha kishi bo‘lasiz?")}
              </p>
              <button type="button" className={cx(st.ms, st.step)} disabled={count <= 1} onClick={() => setCount((c) => Math.max(1, c - 1))} aria-label={t("Kamaytirish")} style={{ width: C(32), height: C(32), fontSize: C(16) }}>
                −
              </button>
              <span className={st.ms} style={{ width: C(32), textAlign: "center", fontSize: C(16), lineHeight: 1.22, color: "var(--ink)" }} aria-live="polite">
                {count}
              </span>
              <button type="button" className={cx(st.ms, st.step)} disabled={count >= 20} onClick={() => setCount((c) => Math.min(20, c + 1))} aria-label={t("Ko‘paytirish")} style={{ width: C(32), height: C(32), fontSize: C(16) }}>
                +
              </button>
            </div>
          )}
          {label(t("TILAKLARINGIZ"), 0.48)}
          <div data-a="up" className="w-full" style={vars({ "--d": "0.52s", "--y": 8 })}>
            <textarea className={cx(st.mr, st.field)} value={wish} onChange={(e) => setWish(e.target.value)} maxLength={500} placeholder={t("Yosh oilaga bir-ikki so‘z…")} aria-label={t("TILAKLARINGIZ")} style={{ fontSize: C(15), padding: C(14), height: C(70), borderWidth: C(1), borderRadius: C(12) }} />
          </div>
          {err && (
            <p className={st.mr} style={{ color: "#b4442a", fontSize: C(14), lineHeight: 1.3 }}>
              {err}
            </p>
          )}
          <div data-a="up" className="w-full" style={vars({ "--d": "0.6s", "--y": 8 })}>
            <button type="submit" disabled={busy} className={cx(st.ms, st.send)} style={{ padding: `${C(15)} ${C(12)}`, fontSize: C(15), opacity: busy ? 0.7 : 1 }}>
              {busy ? t("Yuborilmoqda…") : t("Javobni yuborish")}
            </button>
          </div>
        </form>
      )}
    </Slot>
  );
}

/** 08 · Final — to‘xtadik, sizni kutamiz */
function Final({ d, G, wide }: { d: D; G: Stage; wide: boolean }) {
  const t = useT();
  const title = t("Sizni kutamiz!");
  const Y = (y: number) => `calc(100% - ${U(G.H - y * G.ky)})`;
  // laptopda sarlavha qatori (× 1.12) ismlar qatoriga 3px kirib qoladi (Figma 168) — ismlar sarlavha ostidan boshlanadi
  const namesTop = Math.max(160 * G.ky, 96 * G.ky + 52 * G.k * 1.21 + 0.5);
  return (
    <>
      <h2 className={cx(st.cgi, "absolute inset-x-0 text-center")} style={{ top: Y(96), lineHeight: 1.21, color: "var(--ink)" }}>
        <Fit base={52} max={366} deps={title}>
          <Letters text={title} d0={0.1} />
        </Fit>
      </h2>
      {d.pair && (
        <p data-a="up" className={cx(st.cg, "absolute inset-x-0 flex justify-center text-center")} style={vars({ top: `calc(100% - ${U(G.H - namesTop)})`, lineHeight: 1.21, color: "var(--terra)", "--d": "0.6s", "--y": 10 })}>
          <FitLines lines={nameLines(d, wide, 26)} base={nameLines(d, wide, 26).length > 1 ? 22 : 26} max={wide ? 980 : 366} lh={1.21} />
        </p>
      )}
      <p data-a="up" className={cx(st.mr, "absolute inset-x-0 text-center")} style={vars({ top: Y(806), fontSize: C(12), lineHeight: 1.22, color: "#fffbf4", "--d": "0.9s", "--y": 6 })}>
        <a href="https://shohnoma.uz" style={{ color: "inherit" }}>
          {t("Taklifnoma shohnoma.uz da yaratildi")}
        </a>
      </p>
    </>
  );
}

/* ═════════════ Musiqa tugmasi (Figma 366:6393 — 5 ta to‘lqin) ═════════════ */
const BARS: [number, number][] = [
  [10, 0],
  [18, 0.18],
  [13, 0.36],
  [20, 0.12],
  [9, 0.3],
];
function Music({ m, wide, embedded }: { m: ReturnType<typeof useMusic>; wide: boolean; embedded: boolean }) {
  const t = useT();
  if (!m.available) return null;
  return (
    <button
      type="button"
      onClick={m.toggle}
      aria-label={m.playing ? t("Musiqani o‘chirish") : t("Musiqani yoqish")}
      aria-pressed={m.playing}
      className={cx(st.music, embedded && st.musicEmbedded, m.playing && st.playing)}
      style={{ width: 52, height: 52, right: wide ? 32 : 16, top: wide ? 28 : 16 }}
    >
      {BARS.map(([h, dl], i) => (
        <span key={i} className={st.bar} style={vars({ height: h, "--d": `${dl}s` })} />
      ))}
    </button>
  );
}

/* ═════════════ Sahna: sticky + vertikal scroll → gorizontal siljish ═════════════ */
type StageProps = {
  d: D;
  wide: boolean;
  shown: ScreenKey[];
  still: boolean;
  ready: boolean;
  slug: string;
  mode: InvitationSiteProps["mode"];
  onFinal: () => void;
};

/** Bekatlar orasidagi «to‘xtash» (dwell): segmentning boshida va oxirida panorama bekatda turadi (yumshoq snap) */
const DWELL = 0.16;
const easeIO = (g: number) => (g < 0.5 ? 2 * g * g : 1 - 2 * (1 - g) * (1 - g));

function Scene({ d, wide, shown, still, ready, slug, mode, onFinal }: StageProps) {
  const G = wide ? STAGE_L : STAGE_M;
  const n = shown.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const coupleRef = useRef<HTMLDivElement>(null);
  const bobRef = useRef<HTMLDivElement>(null);
  const layers = useRef<Record<"sky" | "skyline" | "land" | "road", HTMLDivElement | null>>({ sky: null, skyline: null, land: null, road: null });
  const kbSlot = useRef<HTMLDivElement | null>(null);
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const finalRef = useRef(onFinal);
  finalRef.current = onFinal;
  const key = shown.join(",");

  useEffect(() => {
    const stage = stageRef.current;
    const strip = stripRef.current;
    const couple = coupleRef.current;
    if (!stage || !strip || !couple) return;
    const offs = shown.map((k) => G.off[k]);
    const cxs = shown.map((k) => G.cx[k]);
    const O0 = offs[0];
    const L = layers.current;
    const revealed = new Set<number>();
    const reveal = (p: number) => {
      if (!readyRef.current) return;
      const all = p >= n - 1.02;
      Array.from(strip.children).forEach((el, j) => {
        if (revealed.has(j) || !(all || Math.abs(j - p) < 0.75)) return;
        revealed.add(j);
        el.querySelectorAll<HTMLElement>("[data-a],[data-w]").forEach((x) => x.setAttribute("data-in", ""));
      });
    };
    const place = (p: number, bob = 0, tilt = 0) => {
      const i = n > 1 ? Math.min(n - 2, Math.floor(p)) : 0;
      const f = n > 1 ? clamp01(p - i) : 0;
      const off = n > 1 ? offs[i] + (offs[i + 1] - offs[i]) * f : O0;
      strip.style.setProperty("--p", p.toFixed(4));
      L.sky?.style.setProperty("--sx", (O0 + SPEED.sky * (off - O0)).toFixed(2));
      L.skyline?.style.setProperty("--sx", (O0 + SPEED.skyline * (off - O0)).toFixed(2));
      L.land?.style.setProperty("--sx", off.toFixed(2));
      L.road?.style.setProperty("--sx", (O0 + SPEED.road * (off - O0)).toFixed(2));
      // juftlik: kadr birligida x (07 · Anketa’da Figma kadrida yo‘q — o‘ngga haydab chiqib ketadi, finalda chapdan kirib keladi)
      const vw = stage.clientWidth;
      const vh = stage.clientHeight;
      const u = still ? vw / G.W : Math.min(vw / G.W, vh / G.H);
      const x0 = (vw - G.W * u) / 2;
      const a = cxs[i];
      const b = n > 1 ? cxs[i + 1] : a;
      const right = (vw - x0) / u + 12;
      const left = -x0 / u - G.couple.size - 12;
      const xa = a ?? left;
      const xb = b ?? right;
      const xu = a == null && f === 0 ? left : xa + (xb - xa) * f;
      couple.style.transform = `translate3d(${(xu * u).toFixed(1)}px,0,0)`;
      bobRef.current?.style.setProperty("--bob", `${(bob * u).toFixed(2)}px`);
      bobRef.current?.style.setProperty("--tilt", `${tilt.toFixed(2)}deg`);
      return off;
    };
    if (still) {
      place(0);
      return;
    }
    const track = trackRef.current;
    if (!track) return;
    const seg = () => stage.clientHeight || window.innerHeight || 800;
    const raw = () => Math.min(n - 1, Math.max(0, -track.getBoundingClientRect().top / seg()));
    const map = (x: number) => {
      const i = Math.floor(x);
      if (i >= n - 1) return n - 1;
      return i + easeIO(clamp01((x - i - DWELL) / (1 - 2 * DWELL)));
    };
    const stopTop = (k: number) => track.getBoundingClientRect().top + window.scrollY + k * seg();
    const goStop = (k: number) => window.scrollTo({ top: Math.round(stopTop(Math.max(0, Math.min(n - 1, k)))), behavior: "smooth" });

    let target = map(raw());
    let cur = target;
    let raf = 0;
    let lastOff = place(cur);
    let phase = 0;
    let speed = 0;
    let settle = -1;
    let locked = false;
    let lockY = 0;
    let kb = 0;
    let touching = false;
    let idle = 0;
    let dimmed = false;
    reveal(cur);

    const loop = (now: number) => {
      const prev = cur;
      cur += (target - cur) * 0.14;
      if (Math.abs(target - cur) < 0.0006) cur = target;
      const v = cur - prev;
      const sp = Math.min(1, Math.abs(v) * 14);
      if (speed > 0.25 && sp < 0.02 && settle < 0) settle = now;
      speed += (sp - speed) * 0.2;
      // yurganda yo‘l notekisligida yengil silkinish; to‘xtaganda — so‘nuvchi «silkinish»
      let bob = -1.4 * speed * Math.abs(Math.sin(phase));
      let tilt = -Math.max(-1.2, Math.min(1.2, v * 60));
      if (settle >= 0) {
        const dt = now - settle;
        if (dt > 700 || sp > 0.05) settle = -1;
        else {
          bob += 1.6 * Math.exp(-dt / 200) * Math.sin(dt / 48);
          tilt += 0.6 * Math.exp(-dt / 200) * Math.sin(dt / 60);
        }
      }
      const off = place(cur, bob, tilt);
      phase += Math.abs(off - lastOff) * 0.045;
      lastOff = off;
      reveal(cur);
      if (!dimmed && cur > n - 1.4) {
        dimmed = true;
        finalRef.current();
      }
      raf = cur === target && settle < 0 && speed < 0.002 ? 0 : requestAnimationFrame(loop);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const snap = () => {
      if (touching || locked) return;
      const pm = map(raw());
      if (Math.abs(pm - Math.round(pm)) < 0.002) return;
      goStop(Math.round(pm));
    };
    const onScroll = () => {
      if (!locked) target = map(raw());
      kick();
      clearTimeout(idle);
      idle = window.setTimeout(snap, 240);
    };
    const onResize = () => {
      if (!locked) target = map(raw());
      cur = target;
      place(cur);
      kick();
    };

    // Touch: gorizontal swipe → sahifa scroll’i (bitta ekran eni = bitta bekat); qo‘yib yuborilganda — yo‘nalishdagi bekatga
    let sx = 0;
    let sy = 0;
    let sY = 0;
    let sRaw = 0;
    let mode = 0;
    let lx = 0;
    let lt = 0;
    let vx = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touching = true;
      mode = 0;
      sx = lx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      sY = window.scrollY;
      sRaw = raw();
      lt = performance.now();
      vx = 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!touching || e.touches.length !== 1 || locked) return;
      const x = e.touches[0].clientX;
      const dx = x - sx;
      const dy = e.touches[0].clientY - sy;
      if (mode === 0 && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) mode = Math.abs(dx) > Math.abs(dy) * 1.15 ? 1 : 2;
      if (mode !== 1) return;
      const now = performance.now();
      if (now > lt) vx = vx * 0.6 + ((x - lx) / (now - lt)) * 0.4;
      lx = x;
      lt = now;
      window.scrollTo(0, sY - (dx * seg()) / Math.max(1, stage.clientWidth));
    };
    const onTouchEnd = () => {
      if (!touching) return;
      touching = false;
      if (mode !== 1) return;
      const dx = lx - sx;
      const base = Math.round(sRaw);
      let k = Math.round(raw());
      if (dx < -30 || vx < -0.35) k = base + 1;
      else if (dx > 30 || vx > 0.35) k = base - 1;
      goStop(k);
    };
    // Trackpad gorizontal surish → vertikal scroll
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 1) window.scrollBy(0, (e.deltaX * seg()) / Math.max(1, stage.clientWidth));
    };
    const editable = (el: EventTarget | null) => el instanceof HTMLElement && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
    const onKey = (e: KeyboardEvent) => {
      if (editable(e.target) || e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key === "ArrowRight") goStop(Math.floor(map(raw()) + 0.002) + 1);
      else if (e.key === "ArrowLeft") goStop(Math.ceil(map(raw()) - 0.002) - 1);
    };
    // Anketa: klaviatura ochilganda sahna sakramaydi (scroll → siljish vaqtincha qotiriladi), karta klaviatura ustiga ko‘tariladi
    const setKb = (v: number) => {
      kb = v;
      kbSlot.current?.style.setProperty("--kb", `${v.toFixed(0)}px`);
    };
    const fitKb = () => {
      const a = document.activeElement;
      if (!locked || !(a instanceof HTMLElement) || !editable(a)) return;
      const vv = window.visualViewport;
      const top = vv ? vv.offsetTop : 0;
      const h = vv ? vv.height : window.innerHeight;
      const r = a.getBoundingClientRect();
      const b0 = r.bottom - kb;
      const t0 = r.top - kb;
      let next = 0;
      if (b0 > top + h - 16) next = top + h - 16 - b0;
      if (t0 + next < top + 12) next = top + 12 - t0;
      setKb(Math.min(0, next));
    };
    const onFocusIn = (e: FocusEvent) => {
      if (!editable(e.target)) return;
      if (!locked) {
        locked = true;
        lockY = window.scrollY;
        target = cur = Math.round(cur);
        place(cur);
      }
      setTimeout(fitKb, 60);
      setTimeout(fitKb, 420);
    };
    const onFocusOut = () => {
      setTimeout(() => {
        if (!locked || editable(document.activeElement)) return;
        locked = false;
        setKb(0);
        if (Math.abs(window.scrollY - lockY) > 1) window.scrollTo({ top: lockY, behavior: "instant" as ScrollBehavior });
        target = map(raw());
        kick();
      }, 260);
    };
    const prevOsb = document.documentElement.style.overscrollBehaviorX;
    document.documentElement.style.overscrollBehaviorX = "none";
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    window.visualViewport?.addEventListener("resize", fitKb);
    window.visualViewport?.addEventListener("scroll", fitKb);
    stage.addEventListener("touchstart", onTouchStart, { passive: true });
    stage.addEventListener("touchmove", onTouchMove, { passive: true });
    stage.addEventListener("touchend", onTouchEnd, { passive: true });
    stage.addEventListener("touchcancel", onTouchEnd, { passive: true });
    stage.addEventListener("wheel", onWheel, { passive: true });
    stage.addEventListener("focusin", onFocusIn);
    stage.addEventListener("focusout", onFocusOut);
    return () => {
      document.documentElement.style.overscrollBehaviorX = prevOsb;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      window.visualViewport?.removeEventListener("resize", fitKb);
      window.visualViewport?.removeEventListener("scroll", fitKb);
      stage.removeEventListener("touchstart", onTouchStart);
      stage.removeEventListener("touchmove", onTouchMove);
      stage.removeEventListener("touchend", onTouchEnd);
      stage.removeEventListener("touchcancel", onTouchEnd);
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("focusin", onFocusIn);
      stage.removeEventListener("focusout", onFocusOut);
      cancelAnimationFrame(raf);
      clearTimeout(idle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, wide, key]);

  // yuklovchi yopilgach — birinchi ekran ochiladi
  useEffect(() => {
    if (!ready) return;
    const strip = stripRef.current;
    if (!strip) return;
    const p = parseFloat(strip.style.getPropertyValue("--p") || "0");
    Array.from(strip.children).forEach((el, j) => {
      if (still || Math.abs(j - p) < 0.75) el.querySelectorAll<HTMLElement>("[data-a],[data-w]").forEach((x) => x.setAttribute("data-in", ""));
    });
  }, [ready, still, key]);

  const W = G.W;
  const H = G.H;
  const unit = still ? `calc(100cqw / ${W})` : `min(calc(100cqw / ${W}), calc(100svh / ${H}))`;
  const cx0 = G.cx[shown[0]] ?? 0;
  const screens = still ? shown.slice(0, 1) : shown;
  const linkable = mode !== "preview";
  const kbRef = useCallback((el: HTMLDivElement | null) => {
    kbSlot.current = el;
  }, []);
  const stage = (
    <div
      ref={stageRef}
      className={still ? st.still : st.stage}
      style={vars({ "--u": unit, "--c": `calc(var(--u) * ${G.k})`, "--fx": `calc(50% - ${U(W / 2)})`, "--fy": `calc(100% - ${U(H)})`, "--s": G.s, height: still ? U(H) : undefined })}
      aria-label="Sayohat"
    >
      <Layer tiles={SKY} s={G.s} sx={G.off[shown[0]]} up eager lref={(el) => (layers.current.sky = el)} />
      <Layer tiles={SKYLINE} s={G.s} sx={G.off[shown[0]]} eager lref={(el) => (layers.current.skyline = el)} />
      <Layer tiles={LANDMARKS} s={G.s} sx={G.off[shown[0]]} lref={(el) => (layers.current.land = el)} />
      <Layer tiles={ROAD} s={G.s} sx={G.off[shown[0]]} eager lref={(el) => (layers.current.road = el)} />
      {/* Juftlik skuterda — kadrda doim bitta joyda (Figma: mobil x 90 / 30, laptop x 310.8) */}
      <div ref={coupleRef} className={st.couple} style={{ left: `calc(50% - ${U(W / 2)})`, top: `calc(100% - ${U(H - G.couple.y)})`, width: U(G.couple.size), height: U(G.couple.size), transform: `translate3d(${U(cx0)},0,0)` }}>
        <div className={cx(st.coupleArrive)} style={!ready || still ? { animation: "none", transform: ready || still ? undefined : "translate3d(calc(-100cqw - 100%),0,0)" } : undefined}>
          <div ref={bobRef} className={st.coupleIn}>
            <Img src={`${P}/couple.webp`} eager />
          </div>
        </div>
      </div>
      <div ref={stripRef} className={st.strip} style={vars({ "--p": 0 })}>
        {screens.map((k, j) => (
          <section key={k} className={st.screen} style={{ left: `${j * 100}%` }} aria-label={k}>
            {k === "start" ? (
              <Start d={d} G={G} wide={wide} ready={ready || still} />
            ) : k === "taklif" ? (
              <Taklif d={d} G={G} />
            ) : k === "sana" ? (
              <Sana d={d} G={G} slug={slug} />
            ) : k === "dastur" ? (
              <Dastur d={d} G={G} />
            ) : k === "dress" ? (
              <Dress d={d} G={G} />
            ) : k === "manzil" ? (
              <Manzil d={d} G={G} linkable={linkable} />
            ) : k === "anketa" ? (
              <Anketa d={d} G={G} slug={slug} mode={mode} kbRef={kbRef} />
            ) : (
              <Final d={d} G={G} wide={wide} />
            )}
          </section>
        ))}
      </div>
    </div>
  );
  if (still) return stage;
  return (
    <div ref={trackRef} className={st.track} style={{ height: `calc(100svh * ${n})` }} data-stops={n}>
      {stage}
    </div>
  );
}

/* ═════════════ Sahifa ═════════════ */
export function SayohatSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const loaded = usePreload(
    [`${P}/sky.webp`, `${P}/road.webp`, `${P}/couple.webp`, `${P}/statue.webp`, `${P}/trees.webp`, `${P}/skyline.webp`],
    [`${P}/tower.webp`, `${P}/mosque.webp`, `${P}/venue.webp`, ...(d.dress ? d.dress.imgs.map((x) => x.src) : [])],
    withGate,
    wide ? "l" : "m",
  );
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

  // Ixtiyoriy ekranlar bo‘sh bo‘lsa — ekran butunlay olib tashlanadi (scroll uzunligi ham qisqaradi)
  const shown = SCREENS.filter((k) =>
    k === "taklif"
      ? !!d.message
      : k === "sana"
        ? d.hasDate
        : k === "dastur"
          ? d.program.length > 0
          : k === "dress"
            ? !!d.dress
            : k === "manzil"
              ? !!(d.venueTitle || d.address)
              : k === "anketa"
                ? data.rsvpEnabled
                : true,
  );

  return (
    <div ref={root} className={st.root}>
      <Music m={music} wide={wide} embedded={embedded} />
      {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/couple.webp`} />}
      <Scene d={d} wide={wide} shown={shown} still={embedded} ready={withGate ? loaded : true} slug={data.slug} mode={mode} onFinal={onFinal} />
    </div>
  );
}
