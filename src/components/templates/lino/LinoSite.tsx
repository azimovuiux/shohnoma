"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { splitDate, tashkentDate } from "@/lib/display";
import { musicSrc } from "@/lib/music";
import { useLocale, useT } from "@/lib/i18n";
import type { InvitationSiteProps } from "@/components/invitation/types";
import { fetchSavedAnswer, loadSavedRsvp, saveRsvp, type RsvpStatus } from "@/components/invitation/Rsvp";
import { timerUnits } from "@/components/invitation/data";
import { useCountdown, useCountUp, useInView, useScrollProgress, useWide } from "../shared/hooks";
import { Loader, usePreload, useMusic } from "../shared/runtime";
import { DRESS, calendarWords, coordsFrom, downloadIcs, untilPhrase, type ProgramItem } from "../anor/data";
import { DRESS_TITLE, LINO_DEMO, LINO_DEMO_EN, LINO_DEMO_RU, P } from "./data";
import st from "./lino.module.css";

/* ── Birliklar ──
 * U — kontent ustuni (Figma mobil 390 koordinatalari; laptopda ustun = mobil × 1.45, ya’ni 565.5px / 1440).
 * Hero — o‘z kanvasi (mobil 390×844, laptop 1440×900), sahna bir ekranga sig‘adi va pastki chetga bog‘lanadi. */
const U = (n: number) => `calc(var(--u) * ${+n.toFixed(3)})`;
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const vars = (o: Record<string, string | number | undefined>) => o as CSSProperties;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const COL_M = "calc(100cqw / 390)";
const COL_L = "calc(100cqw / 1440 * 1.45)";
const CANVAS_L = "calc(100cqw / 1440)";

/** Manzildan shahar nomi (birinchi raqamsiz, ko‘cha/tuman bo‘lmagan qism): «Toshkent sh., Qorasuv ko‘chasi, 14» → «Toshkent» */
const STREET = /ko[‘'`ʻ’]?cha|tuman|mahalla|massiv|kvartal|\bmavze|улиц|\bул\b|район|проспект|переул|\bstreet\b|\bst\b|avenue|\bave\b|district|\broad\b/i;
function cityOf(address: string) {
  for (const raw of address.split(",")) {
    const s = raw
      .replace(/^\s*(г\.|город)\s*/i, "")
      .replace(/\s+(sh\.?|shahri|shahar|city)\s*$/i, "")
      .replace(/[.]+$/, "")
      .trim();
    if (s && !/\d/.test(s) && !STREET.test(s) && [...s].length <= 24) return s;
  }
  return "";
}

/* ── Ma’lumot (taklifnoma tilida — InvitationSite LocaleProvider’i) ── */
function useData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO = lang === "ru" ? LINO_DEMO_RU : lang === "en" ? LINO_DEMO_EN : LINO_DEMO;
  const ex = (data.extra ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof ex[k] === "string" ? (ex[k] as string).trim() : "");
  const sd = splitDate(data.date);
  const [guest, setGuest] = useState("");
  useEffect(() => {
    const m = new URLSearchParams(location.search).get("m");
    setGuest(m ? m.slice(0, 80) : "");
  }, []);
  return useMemo(() => {
    const cw = calendarWords(lang);
    const exProgram = Array.isArray(ex.program) ? (ex.program as ProgramItem[]).filter((p) => p?.time && p?.title) : [];
    const photos = (data.photos ?? []).filter(Boolean);
    const date = sd ? new Date(`${sd.iso}T12:00:00Z`) : null;
    const code = str("dressCode") || (demo ? DEMO.dressCode : "");
    const dz = DRESS[code];
    // namunadagi ismlar tarjima qilinadi (mijoz ma’lumoti — o‘zgarishsiz)
    const a = ((demo ? t(data.personA) : data.personA) || "").trim();
    const b = ((demo && data.personB ? t(data.personB) : data.personB) || "").trim();
    const time = sd?.time ?? "";
    const program = (demo ? DEMO.program : exProgram.length ? exProgram : (data.program as ProgramItem[])) as ProgramItem[];
    const y = date ? date.getUTCFullYear() : 0;
    const m = date ? date.getUTCMonth() : 0;
    const day = date ? date.getUTCDate() : 0;
    const message = (demo ? DEMO.message : data.message || "").replace(/^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Дорогие гости!|Dear guests!)\s*/, "").trim();
    const coords = demo ? { lat: 41.3111, lon: 69.2797 } : coordsFrom(data.mapUrl);
    const venueTitle = ((demo ? DEMO.venueTitle : data.venueName) || "").trim();
    const address = ((demo ? DEMO.address : data.address) || "").trim();
    const city = demo ? t("Toshkent") : cityOf(address);
    /* Suratlar (PHOTO_SLOTS.lino): 0 — muqova, 1 — taklif yonidagi detal surat, 2 — bazm manzili.
     * Mijoz surati bo‘lmasa: muqova va detal — shablonning guldasta surati (odamsiz); manzil surati — faqat mijozniki. */
    const ph = (demo ? [`${P}/couple.webp`, `${P}/bouquet.webp`, `${P}/venue.webp`] : [0, 1, 2].map((i) => photos[i])).map((x) => x || null) as (string | null)[];
    const wd = date ? cw.weekday[date.getUTCDay()] : "";
    return {
      a,
      b,
      /** «Jasur va Madina» */
      pairVa: b ? t("{a} va {b}", { a, b }) : a,
      /** «Jasur & Madina» */
      pairAmp: b ? `${a} & ${b}` : a,
      dots: sd?.dots ?? "",
      iso: sd?.iso ?? "",
      time,
      day,
      /** «12 sentabr 2026 · Toshkent» */
      cover: date ? [`${day} ${cw.monthsAfterDay[m]} ${y}`, city].filter(Boolean).join(" · ") : city,
      /** «Sentabr 2026 · Shanba · 17:00» */
      line: date ? [`${cw.months[m]} ${y}`, wd, time].filter(Boolean).join(" · ") : "",
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
            title: t(DRESS_TITLE[code] ?? dz.title),
            sub: t(dz.sub),
            note: str("dressNote") || t(dz.note),
            imgs: dz.imgs.map((x) => ({ ...x, label: t(x.label) })),
          }
        : null,
      hero: ph[0] || `${P}/bouquet.webp`,
      detail: ph[1] || (ph[0] ? `${P}/bouquet.webp` : null),
      venuePhoto: ph[2],
      rsvpUntil: untilPhrase(data.rsvpDeadline, lang),
      musicUrl: musicSrc(template, data),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, data, demo, guest, lang, t]);
}
type D = ReturnType<typeof useData>;

/** Bo‘lim: to‘liq enli fon + markazda kontent ustuni (mobil 390 birlik; laptopda × 1.45) */
function Sec({
  children,
  z,
  style,
  colStyle,
  id,
  onP,
  className,
}: {
  children: ReactNode;
  z: number;
  style?: CSSProperties;
  colStyle?: CSSProperties;
  id?: string;
  onP?: (p: number, r: DOMRect, el: HTMLElement) => void;
  className?: string;
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
    <section ref={ref} id={id} className={cx(st.sec, className)} style={{ zIndex: z, ...style }}>
      <div className={st.col} style={{ width: U(390), ...colStyle }}>
        {children}
      </div>
    </section>
  );
}

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

function Img({ src, className, style, eager, a }: { src: string; className?: string; style?: CSSProperties; eager?: boolean; a?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" draggable={false} data-a={a} loading={eager ? "eager" : "lazy"} decoding="async" className={cx(st.img, className)} style={style} />;
}

/** Uzun ism/matn bir qatorga sig‘masa — shrift kichrayadi (kesilmaydi, toshmaydi) */
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
      const w = el.scrollWidth;
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

/** Uzun, bo‘shliqli ism — ikki teng qatorga (har biri Fit bilan); qisqasi — bitta qator */
const splitName = (text: string, limit = 12): string[] => {
  const t = text.trim();
  if (!t) return [];
  if (!t.includes(" ") || [...t].length <= limit) return [t];
  const mid = t.length / 2;
  let cut = -1;
  for (let i = 0; i < t.length; i++) if (t[i] === " " && (cut < 0 || Math.abs(i - mid) < Math.abs(cut - mid))) cut = i;
  return [t.slice(0, cut).trim(), t.slice(cut + 1).trim()];
};

/** Mask bilan ko‘tarilish: matn pastdan, ko‘rinmas chiziq ortidan chiqadi (joylashuvi o‘zgarmaydi) */
function Mask({ children, d = 0, className, style, a = "mask" }: { children: ReactNode; d?: number; className?: string; style?: CSSProperties; a?: string }) {
  return (
    <span className={cx(st.mask, className)} style={style}>
      <span data-a={a} className={st.maskIn} style={vars({ "--d": `${d}s` })}>
        {children}
      </span>
    </span>
  );
}

/** Ingichka chiziq (chapdan o‘ngga chiziladi) */
function Line({ top, left = 32, w = 326, d = 0, color = "#cfc5b4", style }: { top?: number; left?: number; w?: number; d?: number; color?: string; style?: CSSProperties }) {
  return (
    <span
      data-a="line"
      aria-hidden
      className={st.line}
      style={vars({ ...(top != null ? { position: "absolute", top: U(top), left: U(left) } : { position: "relative", marginLeft: U(left) }), width: U(w), height: U(1), background: color, "--d": `${d}s`, ...(style as Record<string, string>) })}
    />
  );
}

/* ═════════════ 00 · Muqova — scroll bilan: surat 1.08 → 1, keyin sekin parallaks (0.85x) ═════════════ */
const HERO = {
  m: { W: 390, H: 844 },
  l: { W: 1440, H: 900 },
};

function Gate({ d, wide, onStart, still = false }: { d: D; wide: boolean; onStart: () => void; still?: boolean }) {
  const t = useT();
  const wrap = useRef<HTMLDivElement>(null);
  const cb = useRef(onStart);
  cb.current = onStart;
  const { W, H } = wide ? HERO.l : HERO.m;
  useEffect(() => {
    const el = wrap.current;
    if (!el || still) return;
    let raf = 0;
    let cur = 0;
    let target = 0;
    let SH = window.innerHeight;
    let started = false;
    const read = () => {
      const r = el.getBoundingClientRect();
      SH = (el.firstElementChild as HTMLElement | null)?.offsetHeight || window.innerHeight;
      target = Math.max(0, -r.top);
      // sahna pastki cheti keyingi bo‘limga yopishib ketadi (lerp’siz — tirqish ochilmaydi)
      const shift = Math.min(SH, Math.max(0, 2 * SH - r.bottom));
      el.style.setProperty("--gy", `${shift.toFixed(1)}px`);
      el.style.pointerEvents = shift > SH * 0.6 ? "none" : "";
    };
    const apply = (k: number) => {
      // surat 1.08 → 1: sahnaning 0.6 ekranlik scrolli davomida (sticky 0.3 ekran + keyingi bo‘lim bilan birga 0.3 ekran)
      el.style.setProperty("--o", clamp01(k / (SH * 0.6)).toFixed(4));
      if (!started && k > 4) {
        started = true;
        cb.current();
      }
    };
    const loop = () => {
      cur += (target - cur) * 0.14;
      if (Math.abs(target - cur) < 0.4) cur = target;
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

  const pageU = wide ? CANVAS_L : COL_M;
  // sahna koordinatasi: gorizontal markazdan, vertikal — pastki chetdan (baland ekranda surat tepaga cho‘ziladi)
  const X = (x: number) => `calc(50% + ${U(x - W / 2)})`;
  const Y = (y: number) => `calc(100% - ${U(H - y)})`;
  /* Ismlar: Figma — 2 qator (64 / laptop 120, qator oralig‘i 1). Uzun ism (bo‘shliqli) — ikki qatorga bo‘linadi, shrift kichrayadi;
   * blok pastki cheti Figma’dagi joyida (mobil 702, laptop 540) qoladi — chiziq va sana ustiga tushmaydi. */
  const lines = [...splitName(d.a, wide ? 14 : 11), ...(d.b ? splitName(d.b, wide ? 14 : 11).map((l, k) => (k ? l : `& ${l}`)) : [])];
  const one = !d.b;
  const fs = lines.length > 2 ? (wide ? 72 : 34) : wide ? 120 : 64;
  const lh = lines.length > 2 ? (wide ? 76 : 38) : fs;
  const bottom = one ? (wide ? 480 : 686) : wide ? 540 : 702;
  const nameTop = bottom - lines.length * lh;
  const mask = (h: number): CSSProperties => ({ height: U(h + h * 0.36), padding: `${U(h * 0.14)} 0 ${U(h * 0.22)}`, margin: `calc(${U(h * 0.14)} * -1) 0 calc(${U(h * 0.22)} * -1)` });
  const nameSpans = (max: number) =>
    lines.map((n, i) => (
      <span key={i} className={st.gMask} style={mask(lh)}>
        <span className={st.gRise} style={vars({ "--d": `${0.45 + i * 0.12}s` })}>
          <Fit base={fs} max={max} deps={n}>
            {n}
          </Fit>
        </span>
      </span>
    ));
  return (
    <div
      ref={wrap}
      className={cx(st.gateWrap, still && st.still)}
      style={vars(still ? { "--u": pageU, "--o": 1, "--gy": "0px", height: U(H), marginBottom: 0 } : { "--u": `min(${pageU}, calc(100svh / ${H}))` })}
    >
      <div className={st.gate} aria-label={t("Taklifnoma")} style={still ? { position: "relative", height: "100%" } : undefined}>
        {/* Surat: mobil — tepada to‘liq enli, laptop — chap yarim (Figma «Surat … scrollda 1.08→1») */}
        <div className={st.gPhoto} style={wide ? { left: 0, top: 0, bottom: 0, width: X(760) } : { left: 0, right: 0, top: 0, height: Y(540) }}>
          <div className={st.gPhotoIn}>
            <Img src={d.hero} eager className={st.gImg} />
          </div>
        </div>
        {wide ? (
          <>
            <h1 className={cx(st.gl, st.gNames, "absolute flex flex-col items-start")} style={{ left: X(800), top: Y(nameTop), width: U(600), lineHeight: lh / fs }}>
              {nameSpans(600)}
            </h1>
            <span className={cx(st.gLine, "absolute")} style={{ left: X(806), top: Y(bottom + 40), width: U(60), height: U(1) }} />
            {d.cover && (
              <p className={cx(st.om, st.gDate, "absolute")} style={{ left: X(806), top: Y(bottom + 66), width: U(600), fontSize: U(17), letterSpacing: U(1.36), lineHeight: 1.25, color: "var(--muted)" }}>
                <Fit base={17} max={600} deps={d.cover}>
                  {d.cover}
                </Fit>
              </p>
            )}
          </>
        ) : (
          <>
            <h1 className={cx(st.gl, st.gNames, "absolute inset-x-0 flex flex-col items-center text-center")} style={{ top: Y(nameTop), lineHeight: lh / fs }}>
              {nameSpans(366)}
            </h1>
            <span className={cx(st.gLine, "absolute")} style={{ left: X(175), top: Y(bottom + 32), width: U(40), height: U(1) }} />
            {d.cover && (
              <p className={cx(st.om, st.gDate, "absolute inset-x-0 text-center")} style={{ top: Y(bottom + 52), fontSize: U(14), letterSpacing: U(1.12), lineHeight: 1.25, color: "var(--muted)" }}>
                <Fit base={14} max={366} deps={d.cover}>
                  {d.cover}
                </Fit>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ═════════════ 01 · Taklif ═════════════ */
function Taklif({ d, z }: { d: D; z: number }) {
  const t = useT();
  const hello = d.guest ? `${t("Hurmatli {guest}", { guest: d.guest })},` : t("Aziz mehmonimiz,");
  // imzo surat chapidagi tor ustunga (106) sig‘sa — Figma’dagidek yonida; aks holda (uzun ism) — surat ostida
  const words = d.pairVa.split(/\s+/);
  const side = Math.max(0, ...words.map((w) => [...w].length)) <= 9 && words.length <= 4;
  return (
    <Sec z={z} colStyle={{ paddingTop: U(80), paddingBottom: U(48), paddingLeft: U(32), paddingRight: U(32) }}>
      <p className={st.gl} style={{ height: U(36), lineHeight: 1.2 }}>
        <Mask>
          <Fit base={30} max={326} deps={hello}>
            {hello}
          </Fit>
        </Mask>
      </p>
      {d.message && (
        <p data-a="up" className={st.or} style={vars({ marginTop: U(18), fontSize: U(18), lineHeight: 1.65, overflowWrap: "anywhere", whiteSpace: "pre-line", "--d": "0.12s" })}>
          {d.message}
        </p>
      )}
      {/* Detal surat (guldasta) matndan keyin 0.2s kechikib chiqadi; imzo — chap pastda (uzun ismlar — surat ostida, to‘liq enda) */}
      <div className="relative" style={{ marginTop: U(d.detail ? 56 : 40), minHeight: d.detail ? U(272) : undefined }}>
        {d.detail && (
          <div data-a="photo" className={cx(st.ph, "absolute")} style={vars({ left: U(118), top: 0, width: U(208), height: U(260), "--d": "0.2s" })}>
            <Img src={d.detail} />
          </div>
        )}
        {d.pairVa && (
          <p data-a="up" className={st.gl} style={vars({ paddingTop: d.detail ? U(side ? 220 : 280) : 0, width: U(d.detail && side ? 106 : 326), fontSize: U(22), lineHeight: 1.2, color: "var(--olive)", overflowWrap: "anywhere", "--d": "0.35s" })}>
            {d.pairVa}
          </p>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 02 · Sana va taymer ═════════════ */
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

/** Katta kun raqami — 1 dan sanaladi (Motion: «12 raqami 1 dan sanaladi») */
function BigDay({ day, run }: { day: number; run: boolean }) {
  const c = useCountUp(Math.max(0, day - 1), run, 1500);
  return <>{c.value + 1}</>;
}

function Sana({ d, z, slug }: { d: D; z: number; slug: string }) {
  const t = useT();
  const units = timerUnits(useLocale());
  const c = useCountdown(d.target);
  const [ref, inView] = useInView<HTMLDivElement>(0.3, true);
  if (!d.hasDate || !c) return null;
  const vals = [c.d, c.h, c.m, c.s];
  return (
    <Sec z={z} colStyle={{ height: U(640) }}>
      <Line top={40} />
      <div ref={ref} className={cx(st.gl, "absolute inset-x-0 text-center")} style={{ top: U(70), height: U(180), fontSize: U(180), lineHeight: 1 }}>
        <Mask d={0.1}>
          <BigDay day={d.day} run={inView} />
        </Mask>
      </div>
      {d.line && (
        <p data-a="up" className={cx(st.om, "absolute inset-x-0 text-center")} style={vars({ top: U(270), lineHeight: 1.25, color: "var(--muted)", "--d": "0.25s" })}>
          <Fit base={15} max={366} deps={d.line} style={{ letterSpacing: "0.06em" }}>
            {d.line}
          </Fit>
        </p>
      )}
      {vals.map((v, i) => (
        <div key={i}>
          <div data-a="up" className={cx(st.gl, "absolute text-center")} style={vars({ left: U(32 + i * 82), top: U(350), width: U(80), fontSize: U(36), lineHeight: 1.2, "--d": `${0.3 + i * 0.08}s` })}>
            <Digits value={v} run={inView} len={i === 0 ? Math.max(2, String(vals[0]).length) : 2} i={i} />
          </div>
          <p data-a="up" className={cx(st.or, "absolute text-center")} style={vars({ left: U(32 + i * 82), top: U(398), width: U(80), fontSize: U(13), lineHeight: 1.25, color: "var(--muted)", whiteSpace: "nowrap", "--d": `${0.38 + i * 0.08}s` })}>
            {units[i]}
          </p>
          {i > 0 && <span data-a="lineY" aria-hidden className="absolute" style={vars({ left: U(31 + i * 82), top: U(354), width: U(1), height: U(48), background: "var(--rule)", "--d": `${0.4 + i * 0.08}s` })} />}
        </div>
      ))}
      <div data-a="up" className="absolute inset-x-0 flex justify-center" style={vars({ top: U(470), "--d": "0.5s" })}>
        <button
          type="button"
          className={cx(st.om, st.pill, st.pillLine)}
          style={{ padding: `${U(14)} ${U(26)}`, fontSize: U(15), borderWidth: U(1) }}
          onClick={() =>
            downloadIcs({
              title: d.b ? t("{names} — to‘y", { names: d.pairAmp }) : t("{name} — taklif", { name: d.a }),
              startLocal: `${d.iso}T${d.time || "17:00"}`,
              location: [d.venueTitle, d.address].filter(Boolean).join(", "),
              slug,
            })
          }
        >
          {t("Kalendarga qo‘shish")}
        </button>
      </div>
      <Line top={600} d={0.2} />
    </Sec>
  );
}

/** Bo‘lim sarlavhasi (Figma: Gloock 38, chapda) */
function Title({ text, top }: { text: string; top: number }) {
  return (
    <p className={cx(st.gl, "absolute")} style={{ left: U(32), top: U(top), width: U(326), height: U(46), lineHeight: 1.21 }}>
      <Mask>
        <Fit base={38} max={326} deps={text}>
          {text}
        </Fit>
      </Mask>
    </p>
  );
}

/* ═════════════ 03 · Kun tartibi ═════════════ */
function Program({ d, z }: { d: D; z: number }) {
  const t = useT();
  const items = d.program.slice(0, 8);
  if (!items.length) return null;
  return (
    <Sec z={z} colStyle={{ paddingTop: U(150), paddingBottom: U(69) }}>
      <Title text={t("Kun tartibi")} top={60} />
      <Line />
      {items.map((it, i) => (
        <div key={i}>
          <div className="flex" style={{ minHeight: U(95), paddingTop: U(23), paddingBottom: U(14), paddingLeft: U(32), paddingRight: U(32) }}>
            <p data-a="up" className={st.om} style={vars({ flex: "none", width: U(88), paddingTop: U(6), fontSize: U(15), lineHeight: 1.25, color: "var(--olive)", whiteSpace: "nowrap", "--d": "0.05s" })}>
              {it.time}
            </p>
            <p data-a="up" className={cx(st.gl, st.clamp3)} style={vars({ flex: "1 1 0", minWidth: 0, fontSize: U(24), lineHeight: 1.2, "--d": "0.12s" })}>
              {it.title}
            </p>
          </div>
          <Line d={0.1} />
        </div>
      ))}
    </Sec>
  );
}

/* ═════════════ 04 · Bazm manzili ═════════════ */
function Venue({ d, z, linkable }: { d: D; z: number; linkable: boolean }) {
  const t = useT();
  const photo = d.venuePhoto;
  return (
    <Sec z={z} colStyle={{ paddingTop: U(photo ? 400 : 136), paddingBottom: U(51), paddingLeft: U(32), paddingRight: U(32) }}>
      <Title text={t("Bazm manzili")} top={60} />
      {photo && (
        <div data-a="clip" className={cx(st.ph, "absolute")} style={{ left: U(32), top: U(130), width: U(326), height: U(240) }}>
          <Img src={photo} className={st.clipImg} />
        </div>
      )}
      {d.venueTitle && (
        <p data-a="up" className={st.gl} style={vars({ fontSize: U(26), lineHeight: 1.2, overflowWrap: "anywhere", "--d": "0.1s" })}>
          {d.venueTitle}
        </p>
      )}
      {d.address && (
        <p data-a="up" className={st.or} style={vars({ marginTop: U(d.venueTitle ? 13 : 0), fontSize: U(16), lineHeight: 1.5, color: "var(--muted)", overflowWrap: "anywhere", "--d": "0.18s" })}>
          {d.address}
        </p>
      )}
      <div data-a="up" className="flex flex-wrap" style={vars({ marginTop: U(32), gap: U(10), "--d": "0.26s" })}>
        <a href={linkable ? d.mapUrl : undefined} target="_blank" rel="noopener noreferrer" className={cx(st.om, st.pill, st.pillFill)} style={{ padding: `${U(14)} ${U(24)}`, fontSize: U(15), borderWidth: U(1) }}>
          {t("Xaritada ochish")}
        </a>
        <a href={linkable ? d.taxi : undefined} target="_blank" rel="noopener noreferrer" className={cx(st.om, st.pill, st.pillLine)} style={{ padding: `${U(14)} ${U(24)}`, fontSize: U(15), borderWidth: U(1) }}>
          {t("Taksi")}
        </a>
      </div>
    </Sec>
  );
}

/* ═════════════ 05 · Dress-kod (ixtiyoriy) ═════════════ */
function Dress({ d, z }: { d: D; z: number }) {
  const t = useT();
  if (!d.dress) return null;
  const x = d.dress;
  const one = x.imgs.length === 1;
  return (
    <Sec z={z} colStyle={{ paddingTop: U(110), paddingBottom: U(60) }}>
      <Title text={t("Dress-kod")} top={40} />
      <div data-a="rise" className={cx(st.dressCard, "relative mx-auto flex flex-col items-center text-center")} style={vars({ width: U(342), padding: `${U(74)} ${U(24)} ${U(28)}`, gap: U(12), borderWidth: U(1), borderRadius: U(2), "--d": "0.1s" })}>
        <p className={st.gl} style={{ fontSize: U(34), lineHeight: 1.1, width: "100%", overflowWrap: "anywhere" }}>
          {x.title}
        </p>
        <p className={st.mr} style={{ fontSize: U(16), lineHeight: 1.22, color: "var(--olive)", width: "100%" }}>
          {x.sub}
        </p>
        <div className="flex w-full justify-center" style={{ gap: U(10) }}>
          {x.imgs.map((im, i) => (
            <div key={im.src} className="flex flex-col items-center" style={{ gap: U(8), flex: one ? "none" : "1 1 0", width: one ? U(294) : undefined, minWidth: 0 }}>
              <div data-a="up" className="overflow-hidden" style={vars({ width: U(one ? 230 : 142), height: U(one ? 265 : 164), borderRadius: U(12), background: "#fff", "--y": 18, "--d": `${0.3 + i * 0.12}s` })}>
                <Img src={im.src} />
              </div>
              <p className={st.mm} style={{ fontSize: U(13), letterSpacing: U(1.56), lineHeight: 1.22, color: "var(--olive)", whiteSpace: "nowrap" }}>
                {im.label}
              </p>
            </div>
          ))}
        </div>
        <p className={st.mr} style={{ fontSize: U(16), lineHeight: 1.5, color: "var(--olive)", width: "100%", overflowWrap: "anywhere" }}>
          {x.note}
        </p>
      </div>
    </Sec>
  );
}

/* ═════════════ 06 · Anketa — javob ═════════════ */
function Rsvp({ d, slug, mode, z }: { d: D; slug: string; mode: InvitationSiteProps["mode"]; z: number }) {
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
  // tilak maydoni pastdan yuqoriga o‘sadi (maydon balandligi o‘zgarmaydi)
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
      const res = await fetch(token ? `/api/i/${slug}/rsvp/${token}` : `/api/i/${slug}/rsvp`, {
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
    <p className={cx(st.om, st.lbl)} style={{ fontSize: U(12), letterSpacing: U(1.68) }}>
      {s}
    </p>
  );
  const sub = `${d.rsvpUntil ? t("Iltimos, javobingizni {date} qoldiring", { date: d.rsvpUntil }) : t("Iltimos, javobingizni qoldiring")}.`;
  return (
    <Sec z={z} id="lino-javob" colStyle={{ paddingTop: U(112), paddingBottom: U(90), paddingLeft: U(32), paddingRight: U(32) }}>
      <Title text={t("Kelasizmi?")} top={60} />
      <p data-a="up" className={st.or} style={vars({ fontSize: U(16), lineHeight: 1.25, color: "var(--muted)", overflowWrap: "anywhere", "--d": "0.12s" })}>
        {sub}
      </p>
      <div data-a="up" className="relative" style={vars({ marginTop: U(18), "--d": "0.2s" })}>
        {sent ? (
          <div key="thanks" className={cx(st.thanks, "flex flex-col items-center text-center")} style={{ padding: `${U(48)} 0 ${U(40)}`, gap: U(16), borderTop: `${U(1)} solid var(--rule)`, borderBottom: `${U(1)} solid var(--rule)` }}>
            <p className={st.gl} style={{ fontSize: U(sent === "not_coming" ? 40 : 32), lineHeight: 1.2, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Rahmat!") : t("Rahmat! Joyingiz band qilindi")}
            </p>
            <p className={st.or} style={{ fontSize: U(15), color: "var(--muted)", lineHeight: 1.5, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Javobingiz uchun rahmat — sizni duolarimizda eslaymiz.") : t("{name} — {count} kishi. Javobingiz yetkazildi.", { name: name.trim() || t("Javobingiz"), count })}
            </p>
            <button type="button" onClick={() => setSent(null)} className={st.om} style={{ color: "var(--olive)", fontSize: U(14), textDecoration: "underline", textUnderlineOffset: 3 }}>
              {t("Javobni o‘zgartirish")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col items-start" style={{ gap: U(14) }}>
            {label(t("ISMINGIZ"))}
            <label className={st.fieldWrap} style={{ height: U(46), paddingBottom: U(10), borderBottomWidth: U(1) }}>
              <input className={cx(st.gl, st.field)} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={t("Ismingiz")} aria-label={t("Ismingiz")} style={{ fontSize: U(20) }} />
            </label>
            <div className="flex w-full" role="radiogroup" aria-label={t("Kelasizmi?")} style={{ gap: U(8) }}>
              {(
                [
                  ["coming", "Albatta kelaman"],
                  ["not_coming", "Kela olmayman"],
                ] as const
              ).map(([s, l]) => (
                <button key={s} type="button" role="radio" aria-checked={status === s} onClick={() => setStatus(s)} className={cx(st.om, st.choice)} style={{ padding: `${U(14)} ${U(6)}`, minHeight: U(48), fontSize: U(14), borderWidth: U(1) }}>
                  <span style={{ overflowWrap: "anywhere" }}>{t(l)}</span>
                </button>
              ))}
            </div>
            {status === "coming" && (
              <div className="flex w-full items-center" style={{ gap: U(6) }}>
                <p className={st.or} style={{ flex: "1 1 0", minWidth: 0, fontSize: U(15), lineHeight: 1.25 }}>
                  {t("Necha kishi bo‘lasiz?")}
                </p>
                <button type="button" className={cx(st.or, st.step)} disabled={count <= 1} onClick={() => setCount((c) => Math.max(1, c - 1))} aria-label={t("Kamaytirish")} style={{ width: U(34), height: U(34), fontSize: U(18), borderWidth: U(1) }}>
                  −
                </button>
                <span className={st.gl} style={{ width: U(34), textAlign: "center", fontSize: U(20), lineHeight: 1.2 }} aria-live="polite">
                  {count}
                </span>
                <button type="button" className={cx(st.or, st.step)} disabled={count >= 20} onClick={() => setCount((c) => Math.min(20, c + 1))} aria-label={t("Ko‘paytirish")} style={{ width: U(34), height: U(34), fontSize: U(18), borderWidth: U(1) }}>
                  +
                </button>
              </div>
            )}
            {label(t("TILAKLARINGIZ"))}
            <label className={st.fieldWrap} style={{ height: U(70), paddingBottom: U(10), borderBottomWidth: U(1) }}>
              <textarea ref={wishRef} rows={1} className={cx(st.gl, st.field)} value={wish} onChange={(e) => setWish(e.target.value)} maxLength={500} placeholder={t("Yosh oilaga bir-ikki so‘z…")} aria-label={t("TILAKLARINGIZ")} style={{ fontSize: U(20) }} />
            </label>
            {err && (
              <p className={st.or} style={{ color: "#a4442f", fontSize: U(14) }}>
                {err}
              </p>
            )}
            <button type="submit" disabled={busy} className={cx(st.om, st.btnOlive)} style={{ padding: `${U(16)} ${U(12)}`, fontSize: U(15), opacity: busy ? 0.7 : 1 }}>
              {busy ? t("Yuborilmoqda…") : t("Javobni yuborish")}
            </button>
          </form>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 07 · Final — scroll bilan (--fc: 0 … 1 = Figma kadri), sahifa oxirigacha albatta tugaydi ═════════════ */
function Final({ d, z, still, onSeen }: { d: D; z: number; still: boolean; onSeen: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const onP = useCallback(
    (_p: number, r: DOMRect) => {
      const el = ref.current;
      if (!el) return;
      const vh = window.innerHeight || 800;
      // sarlavha ekran pastidan 45% balandlikkacha ko‘tarilguncha; sahifa oxiri undan oldin kelsa — oxirida tugaydi
      const y = window.scrollY;
      const c = r.top + y + (r.height / 440) * 177;
      const max = document.documentElement.scrollHeight - vh;
      const s0 = Math.min(c - vh, max - vh * 0.35);
      const s1 = Math.max(s0 + 1, Math.min(c - vh * 0.45, max));
      const f = seg(y, s0, s1);
      el.style.setProperty("--fc", f.toFixed(4));
      if (f > 0.5) onSeen();
    },
    [onSeen],
  );
  const title = t("Sizni kutamiz");
  // uzun ismlar — ikki qatorga («A &» / «B»), har biri Fit bilan
  const pairLines = d.b && [...d.pairAmp].length > 26 ? [`${d.a} &`, d.b] : [d.pairAmp];
  return (
    <Sec z={z} onP={still ? undefined : onP} colStyle={{ height: U(440) }}>
      <div ref={ref} className={cx(st.finalWrap, "absolute inset-0")} style={still ? vars({ "--fc": 1 }) : undefined}>
        <span aria-hidden className={cx(st.fLine, "absolute")} style={{ left: U(32), top: U(40), width: U(326), height: U(1) }} />
        <h2 className={cx(st.gl, st.fTitle, "absolute inset-x-0 text-center")} style={{ top: U(150), height: U(55), lineHeight: 1.05 }}>
          <span className={st.fMask}>
            <span className={st.fRise}>
              <Fit base={52} max={366} deps={title}>
                {title}
              </Fit>
            </span>
          </span>
        </h2>
        {d.pairAmp && (
          <p className={cx(st.gl, st.fNames, "absolute inset-x-0 flex flex-col items-center text-center")} style={{ top: U(230), lineHeight: 1.2, color: "var(--olive)" }}>
            {pairLines.map((l, k) => (
              <Fit key={k} base={24} max={366} deps={l}>
                {l}
              </Fit>
            ))}
          </p>
        )}
        {d.dots && (
          <p className={cx(st.om, st.fDate, "absolute inset-x-0 text-center")} style={{ top: U(290 + (pairLines.length - 1) * 29), fontSize: U(14), letterSpacing: U(3.36), paddingLeft: U(3.36), lineHeight: 1.25, color: "var(--muted)", whiteSpace: "nowrap" }}>
            {d.dots}
          </p>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ Musiqa tugmasi — Figma «Lino / Musiqa tugmasi»: zig‘ir doira, ekvalayzer chiziqlari ═════════════ */
const BARS: [number, number, number][] = [
  [16, 20, 10],
  [20.5, 16, 18],
  [25, 18.5, 13],
  [29.5, 15, 20],
  [34, 20.5, 9],
];
function LinoMusic({ m, wide, embedded }: { m: ReturnType<typeof useMusic>; wide: boolean; embedded: boolean }) {
  const t = useT();
  if (!m.available) return null;
  const btn = (
    <button
      type="button"
      onClick={m.toggle}
      aria-label={m.playing ? t("Musiqani o‘chirish") : t("Musiqani yoqish")}
      aria-pressed={m.playing}
      className={cx(st.music, embedded && st.musicEmbedded, m.playing && st.playing)}
      style={{ right: wide ? 32 : 16, top: wide ? 28 : 16 }}
    >
      <svg viewBox="0 0 52 52" width={52} height={52} aria-hidden>
        {BARS.map(([x, y, h], i) => (
          <rect key={i} x={x} y={y} width={2} height={h} rx={1} className={st.bar} style={vars({ "--i": i })} />
        ))}
        <path d="M15 37L37 15" className={st.strike} />
      </svg>
    </button>
  );
  return embedded ? <div style={{ position: "sticky", top: 0, height: 0, zIndex: 70 }}>{btn}</div> : btn;
}

/* ═════════════ Sahifa ═════════════ */
type Key = "taklif" | "sana" | "program" | "venue" | "dress" | "rsvp" | "final";

export function LinoSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const loaded = usePreload([d.hero], [d.detail, d.venuePhoto, ...(d.dress ? d.dress.imgs.map((x) => x.src) : [])].filter(Boolean) as string[], withGate, wide ? "l" : "m");
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

  const shown: Key[] = (["taklif", "sana", "program", "venue", "dress", "rsvp", "final"] as Key[]).filter((k) =>
    k === "sana" ? d.hasDate : k === "program" ? d.program.length > 0 : k === "dress" ? !!d.dress : k === "rsvp" ? data.rsvpEnabled : true,
  );
  const z = (k: Key) => 6 + shown.indexOf(k);
  const linkable = mode !== "preview";
  const colU = wide ? COL_L : COL_M;
  const fu = (n: number) => (wide ? `calc(100cqw / 1440 * ${n})` : U(n));

  return (
    <div ref={root} className={st.root}>
      <div className={st.page} style={vars({ "--u": colU })}>
        <LinoMusic m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/bouquet.webp`} />}
        <div className={st.flow}>
          {withGate && (loaded ? <Gate d={d} wide={wide} onStart={() => music.play(true)} /> : <div className={st.gateHold} />)}
          {embedded && <Gate d={d} wide={wide} still onStart={() => {}} />}
          <Taklif d={d} z={z("taklif")} />
          <Sana d={d} z={z("sana")} slug={data.slug} />
          <Program d={d} z={z("program")} />
          <Venue d={d} z={z("venue")} linkable={linkable} />
          <Dress d={d} z={z("dress")} />
          {data.rsvpEnabled && <Rsvp d={d} slug={data.slug} mode={mode} z={z("rsvp")} />}
          <Final d={d} z={z("final")} still={embedded} onSeen={onFinal} />
        </div>
        <footer className={cx(st.footer, "flex flex-col items-center")} style={{ height: fu(130), paddingTop: fu(38), gap: fu(12) }}>
          <a href="https://shohnoma.uz" className={st.gl} style={{ fontSize: fu(22), lineHeight: 1.2 }}>
            Shohnoma
          </a>
          <span className={st.or} style={{ fontSize: fu(13), lineHeight: 1.25 }}>
            {t("Taklifnoma shohnoma.uz da yaratildi")}
          </span>
        </footer>
      </div>
    </div>
  );
}
