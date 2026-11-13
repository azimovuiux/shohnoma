"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { splitDate, tashkentDate } from "@/lib/display";
import { musicSrc } from "@/lib/music";
import { useLocale, useT } from "@/lib/i18n";
import type { InvitationSiteProps } from "@/components/invitation/types";
import { fetchSavedAnswer, loadSavedRsvp, rsvpUrl, saveRsvp, type RsvpStatus } from "@/components/invitation/Rsvp";
import { useGuestName } from "../shared/guest";
import { timerUnits } from "@/components/invitation/data";
import { useCountdown, useCountUp, useInView, useScrollProgress, useWide } from "../shared/hooks";
import { Loader, usePreload, useMusic } from "../shared/runtime";
import { DRESS, calendarWords, coordsFrom, downloadIcs, untilPhrase, type ProgramItem } from "../anor/data";
import { DRESS_TITLE, KUMUSH_DEMO, KUMUSH_DEMO_EN, KUMUSH_DEMO_RU, P } from "./data";
import st from "./kumush.module.css";

/* ── Birliklar ──
 * U — kontent ustuni (Figma mobil 390 koordinatalari; laptopda ustun = mobil × 1.45, ya’ni 565.5px / 1440).
 * Hero va final — o‘z kanvasi (mobil 390, laptop 1440). Hero sahnasi bir ekranga sig‘adi va pastki chetga bog‘lanadi. */
const U = (n: number) => `calc(var(--u) * ${+n.toFixed(3)})`;
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const vars = (o: Record<string, string | number | undefined>) => o as CSSProperties;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const COL_M = "calc(100cqw / 390)";
const COL_L = "calc(100cqw / 1440 * 1.45)";
const CANVAS_L = "calc(100cqw / 1440)";
/** Shablonning o‘z surati (odamlar yuzisiz — qo‘llar va uzuklar): mijoz surati bo‘lmasa */
const HANDS = `${P}/hands.webp`;

/* ── Ma’lumot (taklifnoma tilida — InvitationSite LocaleProvider’i) ── */
function useData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO = lang === "ru" ? KUMUSH_DEMO_RU : lang === "en" ? KUMUSH_DEMO_EN : KUMUSH_DEMO;
  const ex = (data.extra ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof ex[k] === "string" ? (ex[k] as string).trim() : "");
  const sd = splitDate(data.date);
  const guest = useGuestName();
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
    const message = (demo ? DEMO.message : data.message || "").replace(/^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Дорогие гости!|Dear guests!)\s*/, "").trim();
    const coords = demo ? { lat: 41.3111, lon: 69.2797 } : coordsFrom(data.mapUrl);
    const venueTitle = ((demo ? DEMO.venueTitle : data.venueName) || "").trim();
    const address = ((demo ? DEMO.address : data.address) || "").trim();
    const unq = (s: string) => s.replace(/^["“”«»„]+|["“”«»„]+$/g, "").trim();
    const initial = (s: string) => [...s.trim()][0]?.toUpperCase() ?? "";
    /* Suratlar (PHOTO_SLOTS.kumush): 0 — hero va 1-kadr, 1 — final va 2-kadr, 2 — 3-kadr.
     * Mijoz surati bo‘lmasa: hero/final — shablonning qo‘llar surati (yuzsiz); plyonka — faqat mijoz suratlari (takrorlanadi), yo‘q bo‘lsa bo‘lim yo‘q. */
    const own = (demo ? [`${P}/couple.webp`, `${P}/laugh.webp`, HANDS] : photos.slice(0, 3)) as string[];
    const frames = own.length ? [0, 1, 2].map((i) => own[i % own.length]) : [];
    return {
      a,
      b,
      /** «Jasur & Madina» */
      pairAmp: b ? `${a} & ${b}` : a,
      /** «J  &  M» */
      initials: b ? `${initial(a)}  &  ${initial(b)}` : initial(a),
      dots: sd?.dots ?? "",
      /** «12.09.2026» */
      dotted: sd?.day ?? "",
      iso: sd?.iso ?? "",
      time,
      /** «12 · 09» */
      dayMonth: sd ? `${sd.iso.slice(8, 10)} · ${sd.iso.slice(5, 7)}` : "",
      weekday: date ? cw.weekday[date.getUTCDay()] : "",
      /** «2026 · soat 17:00» */
      yearLine: date ? (time ? t("{y} · soat {time}", { y: String(y), time }) : String(y)) : "",
      hasDate: !!date,
      target: data.date ? tashkentDate(data.date).getTime() : null,
      guest,
      message,
      quote: unq(str("quote") || (demo ? DEMO.quote : "")),
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
      hero: own[0] || HANDS,
      final: own[1] || own[0] || HANDS,
      frames,
      rsvpUntil: untilPhrase(data.rsvpDeadline, lang),
      musicUrl: musicSrc(template, data),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, data, demo, guest, lang, t]);
}
type D = ReturnType<typeof useData>;

/** Bo‘lim: to‘liq enli fon (qora yoki kumushrang oq) + markazda kontent ustuni (mobil 390 birlik; laptopda × 1.45) */
function Sec({
  children,
  z,
  dark,
  colStyle,
  id,
  onP,
}: {
  children: ReactNode;
  z: number;
  dark?: boolean;
  colStyle?: CSSProperties;
  id?: string;
  onP?: (p: number, r: DOMRect, el: HTMLElement) => void;
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
    <section ref={ref} id={id} className={cx(st.sec, dark && st.dark)} style={{ zIndex: z }}>
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

function Img({ src, className, style, eager }: { src: string; className?: string; style?: CSSProperties; eager?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" draggable={false} loading={eager ? "eager" : "lazy"} decoding="async" className={cx(st.img, className)} style={style} />;
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
      // offsetWidth — maket eni (harflarning transform holati ta’sir qilmaydi; scrollWidth animatsiya paytida kattaroq chiqadi)
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

/** Uzun, bo‘shliqli ism — ikki teng qatorga; qisqasi — bitta qator */
const splitName = (text: string, limit = 12): string[] => {
  const s = text.trim();
  if (!s) return [];
  if (!s.includes(" ") || [...s].length <= limit) return [s];
  const mid = s.length / 2;
  let cut = -1;
  for (let i = 0; i < s.length; i++) if (s[i] === " " && (cut < 0 || Math.abs(i - mid) < Math.abs(cut - mid))) cut = i;
  return [s.slice(0, cut).trim(), s.slice(cut + 1).trim()];
};

/**
 * Harflar (Motion: «harflari kengayib … paydo bo‘ladi»): har harf o‘z joyidan ±0.22em uzoqda (letter-spacing 0.4em ga teng)
 * va shaffof boshlanadi, keyin 0.18em oralig‘iga yig‘iladi. Faqat transform/opacity. Bo‘shliq —   (inline-block’da yo‘qolmasin).
 */
function Letters({ text, d0 = 0 }: { text: string; d0?: number }) {
  const ch = [...text];
  const c = (ch.length - 1) / 2;
  return (
    <>
      {ch.map((x, i) => (
        <span key={i} aria-hidden className={st.ch} style={vars({ "--x": (i - c).toFixed(2), "--d": `${(d0 + Math.abs(i - c) * 0.03).toFixed(2)}s` })}>
          {x === " " ? " " : x}
        </span>
      ))}
    </>
  );
}

/** So‘zma-so‘z (Motion: «Taklif qora fonda so‘zma-so‘z») — umumiy davomiylik cheklangan */
function Words({ text, d0 = 0 }: { text: string; d0?: number }) {
  const parts = text.split(/(\s+)/);
  const n = parts.filter((w) => w && !/^\s+$/.test(w)).length;
  const step = Math.min(0.07, 1.8 / Math.max(1, n));
  let k = 0;
  return (
    <>
      {parts.map((w, i) =>
        !w ? null : /^\s+$/.test(w) ? (
          w.includes("\n") ? <br key={i} /> : " "
        ) : (
          <span key={i} className={st.w} style={vars({ "--d": `${(d0 + step * k++).toFixed(2)}s` })}>
            {w}
          </span>
        ),
      )}
    </>
  );
}

/** Bo‘lim sarlavhasi (Figma: Forum, katta harf, keng oraliq) — harflar yig‘ilib paydo bo‘ladi */
function Title({ text, top, size = 30, h = 33, track = 0.18, light }: { text: string; top?: number; size?: number; h?: number; track?: number; light?: boolean }) {
  return (
    <p
      data-a="track"
      aria-label={text}
      className={cx(st.fo, st.up, top != null && "absolute inset-x-0", "text-center")}
      style={{ top: top != null ? U(top) : undefined, height: U(h), lineHeight: `${h / size}`, color: light ? "#fff" : "var(--ink)" }}
    >
      <Fit base={size} max={366} deps={text} style={{ letterSpacing: `${track}em`, paddingLeft: `${track}em` }}>
        <Letters text={text} />
      </Fit>
    </p>
  );
}

/* ═════════════ 00 · Hero — oq-qora surat: scroll bilan 1.1 → 1 (sekin zoom), ismlar harflari yig‘ilib paydo bo‘ladi ═════════════ */
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
      // surat 1.1 → 1: sahnaning 0.6 ekranlik scrolli davomida (sticky 0.3 ekran + keyingi bo‘lim bilan birga 0.3 ekran)
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
  // sahna koordinatasi: vertikal — pastki chetdan (baland ekranda surat tepaga cho‘ziladi)
  const Y = (y: number) => `calc(100% - ${U(H - y)})`;
  const names: { text: string; fs: number; lh: number; amp?: boolean }[] = (() => {
    if (wide) {
      // laptop: bitta qator «JASUR  &  MADINA» (72, Figma); juda uzun bo‘lsa — ikki qator
      if (!d.b) return [{ text: d.a, fs: 72, lh: 79 }];
      const one = `${d.a}  &  ${d.b}`;
      return [...one].length <= 26 ? [{ text: one, fs: 72, lh: 79 }] : [{ text: `${d.a}  &`, fs: 64, lh: 72 }, { text: d.b, fs: 64, lh: 72 }];
    }
    // mobil: ism · & · ism (46 / 26 / 46, Figma). Uzun, bo‘shliqli ism — ikki qatorga, shrift kichrayadi
    const A = splitName(d.a, 11);
    const B = d.b ? splitName(d.b, 11) : [];
    const many = A.length + B.length > 2;
    const fs = many ? 38 : 46;
    return [...A.map((x) => ({ text: x, fs, lh: fs })), ...(d.b ? [{ text: "&", fs: 26, lh: 26, amp: true }] : []), ...B.map((x) => ({ text: x, fs, lh: fs }))];
  })();
  const track = (x: { amp?: boolean }) => (x.amp ? 0 : 0.18);
  // mobil: birinchi qator keng bo‘lsa (≥ 7 harf) — musiqa tugmasi (o‘ng yuqori, 16…68) ostiga tushmasin, blok 12 birlik pastroq
  const wideFirst = [...(names[0]?.text ?? "")].length > 6;
  const nameTop = wideFirst ? `max(${Y(74)}, 76px)` : Y(62);
  return (
    <div
      ref={wrap}
      className={cx(st.gateWrap, still && st.still)}
      style={vars(still ? { "--u": pageU, "--o": 1, "--gy": "0px", height: U(H), marginBottom: 0 } : { "--u": `min(${pageU}, calc(100svh / ${H}))` })}
    >
      <div className={st.gate} aria-label={t("Taklifnoma")} style={still ? { position: "relative", height: "100%" } : undefined}>
        {/* Surat: to‘liq ekran (Figma «Surat (to‘liq ekran, sekin zoom 1.1→1)») */}
        <div className={st.gPhoto}>
          <div className={st.gPhotoIn}>
            <Img src={d.hero} eager className={st.gImg} style={{ objectPosition: wide ? "50% 42%" : "50% 50%" }} />
          </div>
        </div>
        <span aria-hidden className={cx(st.shTop, "absolute inset-x-0 top-0")} style={{ height: Y(wide ? 300 : 260) }} />
        <span aria-hidden className={cx(st.shBot, "absolute inset-x-0 bottom-0")} style={{ height: U(wide ? 340 : 300) }} />
        <h1 className={cx(st.fo, st.up, st.gNames, "absolute inset-x-0 flex flex-col items-center text-center")} style={{ top: wide ? Y(90) : nameTop }} aria-label={d.pairAmp}>
          {names.map((x, i) => (
            <span
              key={i}
              className="block"
              style={{ height: U(x.lh), lineHeight: `${x.lh / x.fs}`, marginTop: U(x.amp ? 8 : names[i - 1]?.amp ? 4 : 0) }}
            >
              <Fit base={x.fs} max={wide ? 1320 : 366} deps={x.text} style={{ letterSpacing: `${track(x)}em`, paddingLeft: `${track(x)}em` }}>
                <Letters text={x.text} d0={0.6 + i * 0.12} />
              </Fit>
            </span>
          ))}
        </h1>
        {!wide && <span aria-hidden className={cx(st.gLine, "absolute")} style={{ left: `calc(50% - ${U(0.5)})`, top: Y(700), width: U(1), height: U(40) }} />}
        {d.dots && (
          <p className={cx(st.mr, st.gDate, "absolute inset-x-0 text-center")} style={{ top: Y(wide ? 820 : 760), height: U(wide ? 20 : 17), lineHeight: 1.22, color: "#fff" }}>
            <Fit base={wide ? 16 : 14} max={366} deps={d.dots} style={{ letterSpacing: "0.4em", paddingLeft: "0.4em" }}>
              {d.dots}
            </Fit>
          </p>
        )}
      </div>
    </div>
  );
}

/* ═════════════ 01 · Taklif — qora fonda, so‘zma-so‘z ═════════════ */
function Taklif({ d, z }: { d: D; z: number }) {
  const t = useT();
  return (
    <Sec z={z} dark colStyle={{ paddingTop: U(90), paddingBottom: U(96) }}>
      <Title text={t("Taklifnoma")} size={34} h={38} track={0.2} light />
      {d.guest && (
        <p data-a="up" className={cx(st.ml, "mx-auto text-center")} style={vars({ marginTop: U(32), width: U(310), fontSize: U(17), lineHeight: 1.4, color: "var(--grey)", overflowWrap: "anywhere", "--d": "0.1s" })}>
          {t("Hurmatli {guest}", { guest: d.guest })},
        </p>
      )}
      {d.message && (
        <p data-a="words" className={cx(st.ml, "mx-auto text-center")} style={{ marginTop: U(d.guest ? 12 : 42), width: U(310), fontSize: U(19), lineHeight: 1.7, color: "#fff", overflowWrap: "anywhere" }}>
          <Words text={d.message} d0={0.15} />
        </p>
      )}
      {d.initials && (
        <p data-a="up" className={cx(st.fo, "text-center")} style={vars({ marginTop: U(d.message ? 101 : 60), height: U(24), fontSize: U(22), lineHeight: 1.1, letterSpacing: "0.3em", paddingLeft: "0.3em", color: "var(--grey)", whiteSpace: "pre", "--d": "0.3s" })}>
          {d.initials}
        </p>
      )}
    </Sec>
  );
}

/* ═════════════ 02 · Kadrlar — plyonka lentasi: scroll bilan gorizontal suriladi, kadrlar ketma-ket «ochiladi» (exposure 0 → 1) ═════════════ */
/* Figma: lenta 560×330, 4° burilgan, markazi (187.81, 334.13). Chapda — tasma boshi (LEAD, ko‘rinmas joyda): surilganda lenta uchi ko‘rinmasin. */
const LEAD = 208;
const SLIDE = 170;
const FILM = { cx: 187.81, cy: 334.13, w: 560, h: 330 };
function Kadrlar({ d, z, still }: { d: D; z: number; still: boolean }) {
  const t = useT();
  const film = useRef<HTMLDivElement>(null);
  const onP = useCallback((_p: number, r: DOMRect, el: HTMLElement) => {
    const f = film.current;
    if (!f) return;
    const vh = window.innerHeight || 800;
    const u = ((el.firstElementChild as HTMLElement | null)?.offsetWidth || r.width) / 390;
    // lenta yuqori cheti ekran pastiga kirganda 0; markazi ekran o‘rtasiga kelganda 1 (keyin Figma holatida qoladi)
    const c = r.top + FILM.cy * u;
    const k = seg(vh + 184 * u - c, 0, vh * 0.5 + 184 * u);
    f.style.setProperty("--k", k.toFixed(4));
  }, []);
  if (!d.frames.length) return null;
  const holes = Array.from({ length: (LEAD + FILM.w - 8) / 26 + 1 }, (_, j) => 8 + 26 * j).filter((x) => x + 14 <= LEAD + FILM.w);
  return (
    <Sec z={z} onP={still ? undefined : onP} colStyle={{ paddingTop: U(d.quote ? 560 : 600), paddingBottom: U(d.quote ? 140 : 0), minHeight: U(d.quote ? 760 : 620) }}>
      <Title text={t("Bizning kadrlar")} top={70} />
      <div ref={film} className={cx(st.filmWrap, "absolute inset-0")} style={still ? vars({ "--k": 1 }) : undefined}>
        <div
          className={st.film}
          style={{
            left: U(FILM.cx - FILM.w / 2 - LEAD),
            top: U(FILM.cy - FILM.h / 2),
            width: U(LEAD + FILM.w),
            height: U(FILM.h),
            transformOrigin: `${U(LEAD + FILM.w / 2)} ${U(FILM.h / 2)}`,
            ["--slide" as string]: U(SLIDE),
          }}
        >
          {holes.map((x) => (
            <span key={x} className={st.hole}>
              <span style={{ left: U(x), top: U(10), width: U(14), height: U(14), borderRadius: U(3) }} />
              <span style={{ left: U(x), top: U(306), width: U(14), height: U(14), borderRadius: U(3) }} />
            </span>
          ))}
          {d.frames.map((src, i) => (
            <div key={i}>
              <div className={st.frame} style={vars({ left: U(LEAD + 14 + 180 * i), top: U(40), width: U(170), height: U(250), "--e": `clamp(0, (var(--k) - ${0.12 + i * 0.24}) / 0.28, 1)` })}>
                <Img src={src} className={st.frameImg} />
                <span aria-hidden className={st.flash} />
              </div>
              <span className={cx(st.mr, st.frameNo)} style={{ left: U(LEAD + 14 + 180 * i), top: U(294), fontSize: U(10), lineHeight: 1.22 }}>
                {12 + i}A
              </span>
            </div>
          ))}
        </div>
      </div>
      {d.quote && (
        <p data-a="words" className={cx(st.fo, "mx-auto text-center")} style={{ width: U(310), fontSize: U(22), lineHeight: 1.35, overflowWrap: "anywhere" }}>
          <Words text={`“${d.quote}”`} d0={0.1} />
        </p>
      )}
    </Sec>
  );
}

/* ═════════════ 03 · Sana va taymer ═════════════ */
/**
 * Raqamlar doim 2 xonali («05»). Sanoq tugagach o‘zgargan raqam yuqoridan sekin tushadi — shaffofliksiz, kesilmasdan:
 * oldingi «0» o‘chib qoladigan bironta kadr yo‘q (pozitsiya bo‘yicha kalit; yangi raqam faqat o‘zgarganda almashadi).
 */
function Digits({ value, run, len, i }: { value: number; run: boolean; len: number; i: number }) {
  const c = useCountUp(value, run, 1400 + i * 150);
  const digits = String(c.value).padStart(len, "0").split("");
  // sanoq tugagach (keyingi kadrdan) — faqat o‘zgargan raqam «tick» oladi
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

function Sana({ d, z, slug }: { d: D; z: number; slug: string }) {
  const t = useT();
  const units = timerUnits(useLocale());
  const c = useCountdown(d.target);
  const [ref, inView] = useInView<HTMLDivElement>(0.3, true);
  if (!d.hasDate || !c) return null;
  const vals = [c.d, c.h, c.m, c.s];
  return (
    <Sec z={z} colStyle={{ height: U(620) }}>
      <span data-a="line" aria-hidden className="absolute" style={{ left: U(40), top: U(60), width: U(310), height: U(1), background: "var(--rule)" }} />
      {d.weekday && (
        <p data-a="up" className={cx(st.ml, st.up, "absolute inset-x-0 text-center")} style={vars({ top: U(100), height: U(18), lineHeight: 1.22, color: "var(--muted)", "--d": "0.05s" })}>
          <Fit base={15} max={366} deps={d.weekday} style={{ letterSpacing: "0.3em", paddingLeft: "0.3em" }}>
            {d.weekday}
          </Fit>
        </p>
      )}
      <p className={cx(st.fo, "absolute inset-x-0 text-center")} style={{ top: U(130), height: U(96), fontSize: U(96), lineHeight: 1 }}>
        <span className={st.mask}>
          <span data-a="mask" className={st.maskIn} style={vars({ "--d": "0.12s" })}>
            {d.dayMonth}
          </span>
        </span>
      </p>
      {d.yearLine && (
        <p data-a="up" className={cx(st.ml, "absolute inset-x-0 text-center")} style={vars({ top: U(240), height: U(20), lineHeight: 1.22, color: "var(--muted)", "--d": "0.3s" })}>
          <Fit base={16} max={366} deps={d.yearLine} style={{ letterSpacing: "0.1em", paddingLeft: "0.1em" }}>
            {d.yearLine}
          </Fit>
        </p>
      )}
      {/* sanoq kuzatuvchisi — taymer qatorini qoplaydi (bo‘sh/nol balandlikli emas) */}
      <div ref={ref} aria-hidden className="pointer-events-none absolute inset-x-0" style={{ top: U(330), height: U(65) }} />
      <div>
        {vals.map((v, i) => (
          <div key={i}>
            <div data-a="up" className={cx(st.fo, "absolute text-center")} style={vars({ left: U(35 + i * 80), top: U(330), width: U(80), height: U(44), fontSize: U(40), lineHeight: 1.1, "--d": `${0.35 + i * 0.08}s` })}>
              <Digits value={v} run={inView} len={i === 0 ? Math.max(2, String(vals[0]).length) : 2} i={i} />
            </div>
            <p data-a="up" className={cx(st.ml, st.up, "absolute text-center")} style={vars({ left: U(35 + i * 80), top: U(380), width: U(80), height: U(15), fontSize: U(12), letterSpacing: "0.14em", paddingLeft: "0.14em", lineHeight: 1.22, color: "var(--muted)", whiteSpace: "nowrap", "--d": `${0.42 + i * 0.08}s` })}>
              {units[i]}
            </p>
            {i > 0 && <span data-a="lineY" aria-hidden className="absolute" style={vars({ left: U(35 + i * 80), top: U(336), width: U(1), height: U(50), background: "var(--rule)", "--d": `${0.45 + i * 0.08}s` })} />}
          </div>
        ))}
      </div>
      <div data-a="up" className="absolute inset-x-0 flex justify-center" style={vars({ top: U(460), "--d": "0.55s" })}>
        <button
          type="button"
          className={cx(st.mm, st.up, st.btn, st.btnLine)}
          style={{ height: U(46), padding: `0 ${U(28)}`, fontSize: U(13), letterSpacing: "0.14em", borderWidth: U(1) }}
          onClick={() =>
            downloadIcs({
              title: d.b ? t("{names} — to‘y", { names: d.pairAmp }) : t("{name} — taklif", { name: d.a }),
              startLocal: `${d.iso}T${d.time || "17:00"}`,
              location: [d.venueTitle, d.address].filter(Boolean).join(", "),
              slug,
            })
          }
        >
          <span style={{ paddingLeft: "0.14em" }}>{t("Kalendarga qo‘shish")}</span>
        </button>
      </div>
    </Sec>
  );
}

/* ═════════════ 04 · Kun tartibi ═════════════ */
function Program({ d, z }: { d: D; z: number }) {
  const t = useT();
  const items = d.program.slice(0, 8);
  if (!items.length) return null;
  return (
    <Sec z={z} colStyle={{ paddingTop: U(60), paddingBottom: U(114) }}>
      <Title text={t("Kun tartibi")} />
      <div style={{ marginTop: U(57) }}>
        {items.map((it, i) => (
          <div key={i} className="flex flex-col items-center text-center">
            <p data-a="up" className={st.fo} style={vars({ height: U(29), fontSize: U(26), lineHeight: 1.115, whiteSpace: "nowrap", "--d": "0.05s" })}>
              {it.time}
            </p>
            <p data-a="up" className={cx(st.ml, st.clamp2)} style={vars({ marginTop: U(7), width: U(310), fontSize: U(16), lineHeight: 1.25, color: "var(--muted)", "--d": "0.12s" })}>
              {it.title}
            </p>
            {i < items.length - 1 && <span data-a="line" aria-hidden style={vars({ display: "block", marginTop: U(24), marginBottom: U(19), width: U(24), height: U(1), background: "rgba(22,22,22,0.4)", transformOrigin: "50% 50%", "--d": "0.2s" })} />}
          </div>
        ))}
      </div>
    </Sec>
  );
}

/* ═════════════ 05 · Manzil (qora fon) ═════════════ */
function Venue({ d, z, linkable }: { d: D; z: number; linkable: boolean }) {
  const t = useT();
  return (
    <Sec z={z} dark colStyle={{ paddingTop: U(80), paddingBottom: U(84) }}>
      <Title text={t("Manzil")} light />
      {d.venueTitle && (
        <p data-a="up" className={cx(st.fo, "mx-auto text-center")} style={vars({ marginTop: U(47), width: U(350), fontSize: U(30), lineHeight: 1.1, color: "#fff", overflowWrap: "anywhere", "--d": "0.1s" })}>
          {d.venueTitle}
        </p>
      )}
      {d.address && (
        <p data-a="up" className={cx(st.ml, "mx-auto text-center")} style={vars({ marginTop: U(d.venueTitle ? 17 : 47), width: U(310), fontSize: U(16), lineHeight: 1.5, color: "var(--grey)", overflowWrap: "anywhere", "--d": "0.18s" })}>
          {d.address}
        </p>
      )}
      <div data-a="up" className="flex flex-wrap justify-center" style={vars({ marginTop: U(86), gap: U(10), "--d": "0.26s" })}>
        <a href={linkable ? d.mapUrl : undefined} target="_blank" rel="noopener noreferrer" className={cx(st.mm, st.up, st.btn, st.btnWhite)} style={{ height: U(46), padding: `0 ${U(30)}`, fontSize: U(13), letterSpacing: "0.14em", borderWidth: U(1) }}>
          <span style={{ paddingLeft: "0.14em" }}>{t("Xarita")}</span>
        </a>
        <a href={linkable ? d.taxi : undefined} target="_blank" rel="noopener noreferrer" className={cx(st.mm, st.up, st.btn, st.btnGhost)} style={{ height: U(46), padding: `0 ${U(30)}`, fontSize: U(13), letterSpacing: "0.14em", borderWidth: U(1) }}>
          <span style={{ paddingLeft: "0.14em" }}>{t("Taksi")}</span>
        </a>
      </div>
    </Sec>
  );
}

/* ═════════════ 06 · Dress-kod (ixtiyoriy) ═════════════ */
function Dress({ d, z }: { d: D; z: number }) {
  const t = useT();
  if (!d.dress) return null;
  const x = d.dress;
  const one = x.imgs.length === 1;
  return (
    <Sec z={z} colStyle={{ paddingTop: U(50), paddingBottom: U(60) }}>
      <Title text={t("Dress-kod")} />
      <div data-a="rise" className={cx(st.dressCard, "relative mx-auto flex flex-col items-center text-center")} style={vars({ marginTop: U(37), width: U(342), padding: `${U(74)} ${U(24)} ${U(28)}`, gap: U(12), borderWidth: U(1), "--d": "0.1s" })}>
        <p className={cx(st.fo, st.up)} style={{ fontSize: U(30), lineHeight: 1.1, letterSpacing: "0.12em", width: "100%", overflowWrap: "anywhere" }}>
          {x.title}
        </p>
        <p className={st.mr} style={{ fontSize: U(16), lineHeight: 1.22, width: "100%" }}>
          {x.sub}
        </p>
        <div className="flex w-full justify-center" style={{ gap: U(10) }}>
          {x.imgs.map((im, i) => (
            <div key={im.src} className="flex flex-col items-center" style={{ gap: U(8), flex: one ? "none" : "1 1 0", width: one ? U(294) : undefined, minWidth: 0 }}>
              <div data-a="up" className="overflow-hidden" style={vars({ width: U(one ? 230 : 142), height: U(one ? 265 : 164), background: "#fff", "--y": 18, "--d": `${0.3 + i * 0.12}s` })}>
                <Img src={im.src} />
              </div>
              <p className={st.mm} style={{ fontSize: U(13), letterSpacing: "0.12em", lineHeight: 1.22, whiteSpace: "nowrap" }}>
                {im.label}
              </p>
            </div>
          ))}
        </div>
        <p className={st.mr} style={{ fontSize: U(16), lineHeight: 1.5, width: "100%", overflowWrap: "anywhere" }}>
          {x.note}
        </p>
      </div>
    </Sec>
  );
}

/* ═════════════ 07 · Anketa — javob ═════════════ */
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
    <p className={cx(st.mm, st.lbl)} style={{ height: U(13), fontSize: U(11), letterSpacing: "0.16em" }}>
      {s}
    </p>
  );
  const sub = d.rsvpUntil ? t("Javobingizni {date} kutamiz", { date: d.rsvpUntil }) : t("Javobingizni kutamiz");
  return (
    <Sec z={z} id="kumush-javob" colStyle={{ paddingTop: U(60), paddingBottom: U(90) }}>
      <Title text={t("Kelasizmi?")} size={34} h={38} />
      <p data-a="up" className={cx(st.ml, "mx-auto text-center")} style={vars({ marginTop: U(16), width: U(350), fontSize: U(15), lineHeight: 1.22, color: "var(--muted)", overflowWrap: "anywhere", "--d": "0.12s" })}>
        {sub}
      </p>
      <div data-a="rise" className={cx(st.card, "relative mx-auto")} style={vars({ marginTop: U(38), width: U(326), padding: U(24), "--d": "0.2s" })}>
        {sent ? (
          <div key="thanks" className={cx(st.thanks, "flex flex-col items-center text-center")} style={{ padding: `${U(36)} 0 ${U(28)}`, gap: U(16) }}>
            <p className={cx(st.fo, st.up)} style={{ fontSize: U(sent === "not_coming" ? 32 : 26), lineHeight: 1.2, letterSpacing: "0.1em", overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Rahmat!") : t("Rahmat! Joyingiz band qilindi")}
            </p>
            <p className={st.ml} style={{ fontSize: U(15), color: "var(--muted)", lineHeight: 1.5, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Javobingiz uchun rahmat — sizni duolarimizda eslaymiz.") : t("{name} — {count} kishi. Javobingiz yetkazildi.", { name: name.trim() || t("Javobingiz"), count })}
            </p>
            <button type="button" onClick={() => setSent(null)} className={st.mm} style={{ fontSize: U(13), textDecoration: "underline", textUnderlineOffset: 3 }}>
              {t("Javobni o‘zgartirish")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col items-start" style={{ gap: U(14) }}>
            {label(t("ISMINGIZ"))}
            <label className={st.fieldWrap} style={{ height: U(46), paddingBottom: U(10), borderBottomWidth: U(1) }}>
              <input className={cx(st.ml, st.field)} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={t("Ismingiz")} aria-label={t("Ismingiz")} style={{ fontSize: U(16) }} />
            </label>
            <div className="flex w-full" role="radiogroup" aria-label={t("Kelasizmi?")} style={{ gap: U(8) }}>
              {(
                [
                  ["coming", "Albatta kelaman"],
                  ["not_coming", "Kela olmayman"],
                ] as const
              ).map(([s, l]) => (
                <button key={s} type="button" role="radio" aria-checked={status === s} onClick={() => setStatus(s)} className={cx(st.mm, st.choice)} style={{ padding: `${U(14)} ${U(6)}`, minHeight: U(46), fontSize: U(13), borderWidth: U(1) }}>
                  <span style={{ overflowWrap: "anywhere" }}>{t(l)}</span>
                </button>
              ))}
            </div>
            {status === "coming" && (
              <div className="flex w-full items-center" style={{ gap: U(6), minHeight: U(32) }}>
                <p className={st.mr} style={{ flex: "1 1 0", minWidth: 0, fontSize: U(14), lineHeight: 1.22 }}>
                  {t("Necha kishi bo‘lasiz?")}
                </p>
                <button type="button" className={cx(st.ml, st.step)} disabled={count <= 1} onClick={() => setCount((c) => Math.max(1, c - 1))} aria-label={t("Kamaytirish")} style={{ width: U(32), height: U(32), fontSize: U(18), borderWidth: U(1) }}>
                  −
                </button>
                <span className={st.fo} style={{ width: U(32), textAlign: "center", fontSize: U(22), lineHeight: 1.1 }} aria-live="polite">
                  {count}
                </span>
                <button type="button" className={cx(st.ml, st.step)} disabled={count >= 20} onClick={() => setCount((c) => Math.min(20, c + 1))} aria-label={t("Ko‘paytirish")} style={{ width: U(32), height: U(32), fontSize: U(18), borderWidth: U(1) }}>
                  +
                </button>
              </div>
            )}
            {label(t("TILAKLARINGIZ"))}
            <label className={st.fieldWrap} style={{ height: U(70), paddingBottom: U(10), borderBottomWidth: U(1) }}>
              <textarea ref={wishRef} rows={1} className={cx(st.ml, st.field)} value={wish} onChange={(e) => setWish(e.target.value)} maxLength={500} placeholder={t("Yosh oilaga bir-ikki so‘z…")} aria-label={t("TILAKLARINGIZ")} style={{ fontSize: U(16) }} />
            </label>
            {err && (
              <p className={st.mr} style={{ color: "#a4442f", fontSize: U(13) }}>
                {err}
              </p>
            )}
            <button type="submit" disabled={busy} className={cx(st.mm, st.up, st.btnInk)} style={{ minHeight: U(48), padding: `${U(14)} ${U(12)}`, fontSize: U(13), letterSpacing: "0.14em", opacity: busy ? 0.7 : 1 }}>
              <span style={{ paddingLeft: "0.14em" }}>{busy ? t("Yuborilmoqda…") : t("Javobni yuborish")}</span>
            </button>
          </form>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 08 · Final — kulayotgan juftlik to‘liq ekranda; scroll bilan (--fc: 0 … 1 = Figma kadri), sahifa oxirigacha albatta tugaydi ═════════════ */
const FIN = {
  m: { H: 844, sh: 484, title: 660, tfs: 44, th: 49, line: 730, lfs: 14, ltr: 0.16, lh: 17 },
  l: { H: 900, sh: 500, title: 700, tfs: 72, th: 79, line: 800, lfs: 16, ltr: 0.16, lh: 20 },
};
function Final({ d, z, wide, still, onSeen }: { d: D; z: number; wide: boolean; still: boolean; onSeen: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const sec = useRef<HTMLElement>(null);
  const F = wide ? FIN.l : FIN.m;
  const onP = useCallback(
    (_p: number, r: DOMRect) => {
      const el = ref.current;
      if (!el) return;
      const vh = window.innerHeight || 800;
      // sarlavha ekran pastidan 30% balandlikkacha ko‘tarilguncha; sahifa oxiri undan oldin kelsa — oxirida tugaydi
      const y = window.scrollY;
      const c = r.top + y + (r.height / F.H) * F.title;
      const max = document.documentElement.scrollHeight - vh;
      const s0 = Math.min(c - vh, max - vh * 0.45);
      const s1 = Math.max(s0 + 1, Math.min(c - vh * 0.7, max));
      const f = seg(y, s0, s1);
      el.style.setProperty("--fc", f.toFixed(4));
      if (f > 0.5) onSeen();
    },
    [onSeen, F],
  );
  useScrollProgress(sec, onP, !still);
  const title = t("Sizni kutamiz");
  // Figma: bitta qator «Jasur & Madina · 12.09.2026»; uzun ismlar — ism(lar) va sana alohida qatorlarda (shrift mayda bo‘lib ketmasin)
  const one = [d.pairAmp, d.dotted].filter(Boolean).join(" · ");
  const lines = [...one].length <= 34 ? [one] : [...(d.b && [...d.pairAmp].length > 30 ? [`${d.a} &`, d.b] : [d.pairAmp]), d.dotted].filter(Boolean);
  return (
    <section ref={sec} className={cx(st.sec, st.dark)} style={vars({ zIndex: z, "--u": wide ? CANVAS_L : COL_M })}>
      <div ref={ref} className={cx(st.finalWrap, "relative")} style={vars({ height: U(F.H), ...(still ? { "--fc": 1 } : {}) })}>
        <div className={st.fPhoto}>
          <Img src={d.final} className={st.fImg} style={{ objectPosition: wide ? "50% 30%" : "50% 50%" }} />
        </div>
        <span aria-hidden className={cx(st.shBot, "absolute inset-x-0")} style={{ top: U(F.sh), height: U(F.H - F.sh) }} />
        <h2 className={cx(st.fo, st.up, st.fTitle, "absolute inset-x-0 text-center")} style={{ top: U(F.title), height: U(F.th), lineHeight: `${F.th / F.tfs}`, color: "#fff" }} aria-label={title}>
          <Fit base={F.tfs} max={wide ? 1320 : 366} deps={title} style={{ letterSpacing: "0.14em", paddingLeft: "0.14em" }}>
            <Letters text={title} />
          </Fit>
        </h2>
        {lines.map((l, i) => (
          <p key={i} className={cx(wide ? st.mr : st.ml, st.fLine, "absolute inset-x-0 text-center")} style={{ top: U(F.line + i * (F.lh + 4)), height: U(F.lh), lineHeight: 1.22, color: "#fff" }}>
            <Fit base={F.lfs} max={wide ? 1320 : 366} deps={l} style={{ letterSpacing: `${F.ltr}em`, paddingLeft: `${F.ltr}em` }}>
              {l}
            </Fit>
          </p>
        ))}
      </div>
    </section>
  );
}

/* ═════════════ Musiqa tugmasi — Figma «Kumush / Musiqa tugmasi»: qora doira, oq ekvalayzer chiziqlari ═════════════ */
const BARS: [number, number, number][] = [
  [16, 20, 10],
  [20.5, 16, 18],
  [25, 18.5, 13],
  [29.5, 15, 20],
  [34, 20.5, 9],
];
function KumushMusic({ m, wide, embedded }: { m: ReturnType<typeof useMusic>; wide: boolean; embedded: boolean }) {
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
type Key = "taklif" | "kadrlar" | "sana" | "program" | "venue" | "dress" | "rsvp" | "final";

export function KumushSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const loaded = usePreload([d.hero], [...d.frames, d.final, ...(d.dress ? d.dress.imgs.map((x) => x.src) : [])].filter(Boolean) as string[], withGate, wide ? "l" : "m");
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

  const shown: Key[] = (["taklif", "kadrlar", "sana", "program", "venue", "dress", "rsvp", "final"] as Key[]).filter((k) =>
    k === "kadrlar" ? d.frames.length > 0 : k === "sana" ? d.hasDate : k === "program" ? d.program.length > 0 : k === "dress" ? !!d.dress : k === "rsvp" ? data.rsvpEnabled : true,
  );
  const z = (k: Key) => 6 + shown.indexOf(k);
  const linkable = mode !== "preview";
  const colU = wide ? COL_L : COL_M;
  const fu = (n: number) => (wide ? `calc(100cqw / 1440 * ${n})` : U(n));

  return (
    <div ref={root} className={st.root}>
      <div className={st.page} style={vars({ "--u": colU })}>
        <KumushMusic m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={d.hero} />}
        <div className={st.flow}>
          {withGate && (loaded ? <Gate d={d} wide={wide} onStart={() => music.play(true)} /> : <div className={st.gateHold} />)}
          {embedded && <Gate d={d} wide={wide} still onStart={() => {}} />}
          <Taklif d={d} z={z("taklif")} />
          <Kadrlar d={d} z={z("kadrlar")} still={embedded} />
          <Sana d={d} z={z("sana")} slug={data.slug} />
          <Program d={d} z={z("program")} />
          <Venue d={d} z={z("venue")} linkable={linkable} />
          <Dress d={d} z={z("dress")} />
          {data.rsvpEnabled && <Rsvp d={d} slug={data.slug} mode={mode} z={z("rsvp")} />}
          <Final d={d} z={z("final")} wide={wide} still={embedded} onSeen={onFinal} />
        </div>
        <footer className={cx(st.footer, "flex flex-col items-center")} style={{ height: fu(120), paddingTop: fu(34) }}>
          <a href="https://shohnoma.uz" className={cx(st.fo, st.up)} style={{ height: fu(24), fontSize: fu(22), lineHeight: 1.1, letterSpacing: "0.2em", paddingLeft: "0.2em" }}>
            Shohnoma
          </a>
          <span className={st.ml} style={{ marginTop: fu(14), fontSize: fu(12), lineHeight: 1.22, color: "var(--grey)" }}>
            {t("Taklifnoma shohnoma.uz da yaratildi")}
          </span>
        </footer>
      </div>
    </div>
  );
}
