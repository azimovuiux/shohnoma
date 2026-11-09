"use client";

import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/400-italic.css";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { splitDate, tashkentDate } from "@/lib/display";
import { musicSrc } from "@/lib/music";
import { useLocale, useT } from "@/lib/i18n";
import type { InvitationSiteProps } from "@/components/invitation/types";
import { fetchSavedAnswer, loadSavedRsvp, saveRsvp, type RsvpStatus } from "@/components/invitation/Rsvp";
import { useCountdown, useCountUp, useInView, useScrollProgress, useWide } from "../shared/hooks";
import { Loader, MusicButton, usePreload, useMusic } from "../shared/runtime";
import { DRESS, calendarWords, coordsFrom, downloadIcs, untilPhrase, type ProgramItem } from "../anor/data";
import { P, PARVOZ_DEMO, PARVOZ_DEMO_RU, airCode, minusHour, monShort, wavePath, wavePoint } from "./data";
import st from "./parvoz.module.css";

const U = (n: number) => `calc(var(--u) * ${n})`;
type V = (m: number, l: number) => string;
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const vars = (o: Record<string, string | number | undefined>) => o as CSSProperties;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/* ── Ma’lumot (taklifnoma tilida — InvitationSite LocaleProvider’i) ── */
function useData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO = lang === "ru" ? PARVOZ_DEMO_RU : PARVOZ_DEMO;
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
    const city = (lang === "ru" ? (data.address || "Toshkent").replace(/^\s*г\.\s*/i, "") : data.address || "Toshkent").split(/[,.]/)[0].replace(/\s+(sh|shahri|shahar)$/i, "").trim() || "Toshkent";
    const exProgram = Array.isArray(ex.program) ? (ex.program as ProgramItem[]).filter((p) => p?.time && p?.title) : [];
    const photos = data.photos ?? [];
    const date = sd ? new Date(`${sd.iso}T12:00:00Z`) : null;
    const dz = DRESS[str("dressCode") || (demo ? DEMO.dressCode : "")];
    // namunadagi ismlar va joy nomi tarjima qilinadi (mijoz ma’lumoti — o‘zgarishsiz)
    const a = demo ? t(data.personA) : data.personA;
    const b = demo && data.personB ? t(data.personB) : data.personB;
    const time = sd?.time ?? "";
    const program = (demo ? DEMO.program : exProgram.length ? exProgram : (data.program as ProgramItem[])) as ProgramItem[];
    const first = program[0]?.time ?? "";
    const boarding = first && time && first < time ? first : minusHour(time);
    const dd = date ? String(date.getUTCDate()).padStart(2, "0") : "";
    const mm = date ? String(date.getUTCMonth() + 1).padStart(2, "0") : "";
    const initials = `${[...(a ?? "")][0] ?? ""}${[...(b ?? "")][0] ?? ""}`.toUpperCase();
    const flight = [initials, `${dd}${mm}`].filter(Boolean).join(" ");
    const venue = demo ? t(data.venueName) : data.venueName;
    const message = (demo ? DEMO.message : data.message || "").replace(/^(Aziz mehmonlar!|Qadrli mehmonlar!|Дорогие гости!)\s*/, "");
    const baxt = t("Baxt");
    return {
      a,
      b,
      names: b ? `${a} & ${b}` : a,
      namesVa: b ? t("{a} va {b}", { a, b }) : a,
      codeA: airCode(a),
      codeB: b ? airCode(b) : airCode(baxt),
      nameB: b || baxt,
      flight,
      dots: sd?.dots ?? "",
      dotsShort: date ? `${dd} · ${mm} · ${String(date.getUTCFullYear()).slice(2)}` : "",
      iso: sd?.iso ?? "",
      time,
      boarding,
      ticketDate: date ? `${dd} ${monShort(date.getUTCMonth(), lang)} ${date.getUTCFullYear()}` : "",
      longDate: date ? `${date.getUTCDate()} ${cw.monthsAfterDay[date.getUTCMonth()]} ${date.getUTCFullYear()}, ${cw.weekday[date.getUTCDay()].toLowerCase()}` : "",
      target: data.date ? tashkentDate(data.date).getTime() : null,
      guest,
      message,
      venue,
      venueTitle: demo ? DEMO.venueTitle : data.venueName,
      address: demo ? DEMO.address : data.address,
      venueNote: str("venueNote") || (demo ? DEMO.venueNote : ""),
      city: t(city),
      mapUrl: data.mapUrl || `https://yandex.uz/maps/?text=${encodeURIComponent([data.venueName, data.address].filter(Boolean).join(", "))}`,
      coords: demo ? { lat: 41.3111, lon: 69.2797 } : coordsFrom(data.mapUrl),
      program,
      dress: dz ? { ...dz, title: t(dz.title), sub: t(dz.sub), note: str("dressNote") || t(dz.note), imgs: dz.imgs.map((x) => ({ ...x, label: t(x.label) })) } : null,
      photo1: demo ? `${P}/juftlik-portret.webp` : (photos[0] ?? null),
      photo2: demo ? `${P}/juftlik-trap.webp` : (photos[1] ?? null),
      story1: str("story1") || (demo ? DEMO.story1 : ""),
      story2: str("story2") || (demo ? DEMO.story2 : ""),
      quote: str("quote") || (demo ? DEMO.quote : ""),
      rsvpUntil: untilPhrase(data.rsvpDeadline, lang),
      musicUrl: musicSrc(template, data),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, data, demo, guest, lang, t]);
}
type D = ReturnType<typeof useData>;

function Sec({ children, className, style, ready, threshold, id, z }: { children: ReactNode; className?: string; style?: CSSProperties; ready: boolean; threshold?: number; id?: string; z: number }) {
  const [ref, inView] = useInView<HTMLElement>(threshold ?? 0.15, ready);
  return (
    <section ref={ref} id={id} className={cx(st.sec, inView && ready && st.in, className)} style={{ zIndex: z, ...style }}>
      {children}
    </section>
  );
}

function Img({ src, className, style, eager, a }: { src: string; className?: string; style?: CSSProperties; eager?: boolean; a?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" draggable={false} data-a={a} loading={eager ? "eager" : "lazy"} decoding="async" className={cx(st.img, className)} style={style} />;
}

/** Absolyut joylashgan qatlam (Figma koordinatalari) */
function L({ r, children, className, style, a, z }: { r: [number, number, number, number]; children?: ReactNode; className?: string; style?: CSSProperties; a?: string; z?: number }) {
  const [x, y, w, h] = r;
  return (
    <div data-a={a} className={cx("absolute", className)} style={{ left: U(x), top: U(y), width: U(w), height: U(h), zIndex: z, ...style }}>
      {children}
    </div>
  );
}

/** Figma’dagi burilgan rasm: tashqi quti (x,y,bw,bh) markazida — ichki (w,h) rot° */
function Rot({ box, w, h, rot, children, className, style, a, z }: { box: [number, number, number, number]; w: number; h: number; rot: number; children: ReactNode; className?: string; style?: CSSProperties; a?: string; z?: number }) {
  const [x, y, bw, bh] = box;
  return (
    <div data-a={a} className={cx("absolute flex items-center justify-center", className)} style={{ left: U(x), top: U(y), width: U(bw), height: U(bh), zIndex: z, ...style }}>
      <div className="relative flex-none" style={{ width: U(w), height: U(h), rotate: `${rot}deg` }}>
        {children}
      </div>
    </div>
  );
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

function Words({ text, d0 = 0, step = 0.03 }: { text: string; d0?: number; step?: number }) {
  const parts = text.split(/(\s+)/);
  let k = 0;
  return (
    <>
      {parts.map((w, i) =>
        /^\s+$/.test(w) ? (
          w
        ) : (
          <span key={i} className={st.word} style={vars({ "--d": `${(d0 + step * k++).toFixed(2)}s` })}>
            {w}
          </span>
        ),
      )}
    </>
  );
}

const PlaneIcon = ({ size, color, rot = 90, style }: { size: string; color: string; rot?: number; style?: CSSProperties }) => (
  <svg viewBox="0 0 22 22" width="100%" height="100%" style={{ width: size, height: size, rotate: `${rot}deg`, flex: "none", ...style }} aria-hidden>
    <path
      d="M19.25 14.6667V12.8333L11.9167 8.25V3.20833C11.9167 2.4475 11.3025 1.83333 10.5417 1.83333C9.78083 1.83333 9.16667 2.4475 9.16667 3.20833V8.25L1.83333 12.8333V14.6667L9.16667 12.375V17.4167L7.33333 18.7917V20.1667L10.5417 19.25L13.75 20.1667V18.7917L11.9167 17.4167V12.375L19.25 14.6667Z"
      fill={color}
    />
  </svg>
);

/** Bulut qatlami (Figma «cloudBank» / «cloudsSmall»); flip — gorizontal ko‘zgu */
const Cloud = ({ small, flip, opacity }: { small?: boolean; flip?: boolean; opacity?: number }) => <Img src={`${P}/${small ? "bulutlar" : "bulut"}.webp`} className={flip ? st.flipX : undefined} style={{ opacity }} />;

/* ═════════════ 00 · Osmon sahnasi (scroll bilan) ═════════════ */
function Gate({ d, wide, onReveal, onStart, onGo }: { d: D; wide: boolean; onReveal: () => void; onStart: () => void; onGo: () => void }) {
  const t = useT();
  const wrap = useRef<HTMLDivElement>(null);
  const cb = useRef({ onReveal, onStart });
  cb.current = { onReveal, onStart };
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let raf = 0;
    let cur = 0;
    let target = 0;
    let H = window.innerHeight;
    let revealed = false;
    let started = false;
    const read = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      H = (el.firstElementChild as HTMLElement | null)?.offsetHeight || vh;
      target = Math.min(Math.max(0, -r.top), Math.max(1, r.height - vh));
      // sahna pastki cheti keyingi bo‘limga yopishib ketadi (lerp’siz — tirqish ochilmaydi)
      const shift = Math.min(H, Math.max(0, 2 * H - r.bottom));
      el.style.setProperty("--gy", `${shift.toFixed(1)}px`);
      el.style.pointerEvents = shift > H * 0.6 ? "none" : "";
    };
    const apply = (k: number) => {
      // sahna ichidagi parallaks sticky qismida; keyin sahna butunligicha keyingi bo‘lim bilan birga ketadi
      el.style.setProperty("--k", `${Math.min(k, H * 0.85).toFixed(1)}px`);
      el.style.setProperty("--q", clamp01(k / (H * 0.85)).toFixed(4));
      if (!started && k > 4) {
        started = true;
        cb.current.onStart();
      }
      if (!revealed && k > H * 0.6) {
        revealed = true;
        cb.current.onReveal();
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
  }, []);

  const W = wide ? 1440 : 390;
  // sahna koordinatasi: gorizontal markazdan
  const X = (x: number) => `calc(50% + ${U(x - W / 2)})`;
  const box = (x: number, y: number, w: number, h: number, extra?: CSSProperties): CSSProperties => ({ position: "absolute", left: X(x), top: U(y), width: U(w), height: U(h), ...extra });
  let k = 0;
  const chars = (s: string, d0: number) =>
    [...s].map((ch, i) => (
      <span key={i} className={st.char} style={{ animationDelay: `${(d0 + 0.04 * k++).toFixed(2)}s` }}>
        {ch}
      </span>
    ));
  const far: [number, number, number, number] = wide ? [-30, 20, 1500, 843.75] : [-125, 70, 640, 360];
  const plane = wide ? { b: [576, 300, 794.37, 492.11], w: 760, h: 427.5 } : { b: [-20, 335.39, 438.99, 271.96], w: 420, h: 236.25 };
  // Figma’da bulutlar «screen» bilan chizilgan (cheti ham yorishadi) — normal blendda o‘sha hajm uchun biroz yuqoriroq
  const back: [number, number, number, number] = wide ? [-260, 331, 1900, 1068.75] : [-40, 545, 900, 506.25];
  const front: [number, number, number, number] = wide ? [-500, 407, 2100, 1181.25] : [-330, 585, 1000, 562.5];

  return (
    // Ochilish sahnasi bir ekranga sig‘adi: kenglik va balandlikdan kichigiga moslanadi
    <div ref={wrap} className={st.gateWrap} style={vars({ "--u": wide ? "min(calc(100cqw / 1440), calc(100svh / 900))" : "min(calc(100cqw / 390), calc(100svh / 760))" })}>
      <div className={st.gate} aria-label={t("Taklifnoma")}>
        <div className={st.gSky}>
          <div className={cx("size-full", st.fadeIn)} style={{ animationDuration: "1.6s" }}>
            <Img src={`${P}/osmon.webp`} eager />
          </div>
        </div>
        <div className={cx(st.gl, st.gFar)} style={{ inset: 0 }}>
          <div style={box(...far, { opacity: 0.9 })}>
            <div className={cx("size-full", st.riseBlur)} style={{ animationDelay: "0.2s" }}>
              <Cloud small />
            </div>
          </div>
        </div>
        {/* Ismlar */}
        <div className={cx(st.gl, st.gNames)} style={{ inset: 0 }}>
          <h1 className={cx(st.serif, "absolute text-center")} style={{ left: X(0), width: U(W), top: U(wide ? 128 : 100), color: "var(--navy)", lineHeight: 1 }}>
            {wide ? (
              <Fit base={132} max={1320} deps={d.names}>
                {chars(d.a, 0.6)}
                {d.b && (
                  <>
                    {" "}
                    <span className={cx(st.italic, st.amp)} style={{ color: "var(--terra)", animationDelay: `${(0.6 + 0.04 * k++).toFixed(2)}s` }}>
                      &amp;
                    </span>{" "}
                    {chars(d.b, 0.7)}
                  </>
                )}
              </Fit>
            ) : (
              <>
                <span className="block" style={{ height: U(86), marginTop: d.b ? 0 : U(71) }}>
                  <Fit base={86} max={370} deps={d.a}>
                    {chars(d.a, 0.6)}
                  </Fit>
                </span>
                {d.b && (
                  <>
                    <span className={cx(st.italic, "block")} style={{ fontSize: U(50), height: U(50), marginTop: U(8), color: "var(--terra)" }}>
                      <span className={st.amp} style={{ animationDelay: `${(0.6 + 0.04 * k++).toFixed(2)}s` }}>
                        &amp;
                      </span>
                    </span>
                    <span className="block" style={{ height: U(86), marginTop: U(-2) }}>
                      <Fit base={86} max={370} deps={d.b}>
                        {chars(d.b, 0.75)}
                      </Fit>
                    </span>
                  </>
                )}
              </>
            )}
          </h1>
          <p className={cx(st.mono, st.fadeIn, "absolute text-center")} style={{ left: X(0), width: U(W), top: U(wide ? 290 : 360), fontSize: U(wide ? 18 : 16), letterSpacing: U(wide ? 5.04 : 3.84), color: "rgba(28,43,69,.85)", animationDelay: "1.1s" }}>
            {d.dots}
          </p>
        </div>
        {/* Samolyot — chap pastdan uchib kiradi, keyin suzadi */}
        <div className={cx(st.gl, st.gPlane)} style={{ inset: 0 }}>
          <div style={box(plane.b[0], plane.b[1], plane.b[2], plane.b[3], { display: "flex", alignItems: "center", justifyContent: "center" })}>
            <div className={st.flyIn}>
              <div className={st.float}>
                <div style={{ width: U(plane.w), height: U(plane.h), rotate: "-5deg" }}>
                  <Img src={`${P}/samolyot.webp`} eager />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={cx(st.gl, st.gBack)} style={{ inset: 0 }}>
          <div style={box(...back, { opacity: 0.95 })}>
            <div className={cx("size-full", st.riseIn)} style={{ animationDelay: "0.35s" }}>
              <Cloud flip />
            </div>
          </div>
        </div>
        <div className={cx(st.gl, st.gFront)} style={{ inset: 0 }}>
          {/* old bulut qatlami — bir necha bank ustma-ust (bo‘sh oq maydon qolmasin), ismlar ortida qoladi */}
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={box(front[0] + (i % 2) * (wide ? 260 : 120), front[1] + i * front[3] * 0.5, front[2], front[3])}>
              <div className={cx("size-full", i === 0 && st.riseIn)} style={{ animationDelay: "0.5s" }}>
                <Cloud flip={i % 2 === 1} />
              </div>
            </div>
          ))}
          <div className={st.cloudFloor} style={{ top: U(front[1] + front[3] * 2.05), height: "400%" }} />
        </div>
        {/* Chiptani olish — bosilsa chiptaga silliq scroll (ochilish scroll bilan ham ishlaydi) */}
        <div className={cx(st.gl, st.gBtn)} style={{ inset: 0, pointerEvents: "none" }}>
          <button
            type="button"
            onClick={onGo}
            className={cx(st.btnNavy, st.fadeIn)}
            style={{
              position: "absolute",
              pointerEvents: "auto",
              left: wide ? "50%" : X(90),
              translate: wide ? "-50% 0" : undefined,
              top: U(wide ? 350 : 636),
              gap: U(10),
              padding: wide ? `${U(16)} ${U(26)}` : `${U(14)} ${U(22)}`,
              fontSize: U(wide ? 17 : 16),
              animationDelay: "2s",
            }}
          >
            {t("Chiptani olish")}
            <PlaneIcon size={U(wide ? 20 : 54)} color="var(--peach)" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════ 01 · Bording-pass ═════════════ */
function Ticket({ d, wide, ready, rsvp, tail, z }: { d: D; wide: boolean; ready: boolean; rsvp: boolean; tail: number; z: number }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const plane = useRef<HTMLDivElement>(null);
  const stub = useRef<HTMLDivElement>(null);
  useScrollProgress(
    box,
    (p) => {
      const f = seg(p, 0.22, 0.5);
      if (plane.current) plane.current.style.transform = `translateX(${U(f * (wide ? 176 : 54))})`;
      const g = rsvp ? seg(p, 0.7, 0.95) : 0;
      if (stub.current) stub.current.style.transform = g ? `translateY(${U(g * 40)}) rotate(${(-6 * g).toFixed(2)}deg)` : "";
    },
    ready,
  );
  const H = (wide ? 820 : 930) + tail;
  const passenger = d.guest || t("Aziz mehmonimiz");
  const lbl = (x: number, y: number, s: string, i: number) => (
    <p data-a="flap" className={st.lbl} style={vars({ position: "absolute", left: U(x), top: U(y), fontSize: U(wide ? 12 : 11), letterSpacing: U(wide ? 1.92 : 1.76), "--d": `${0.5 + i * 0.06}s`, "--t": "0.7s" })}>
      {s}
    </p>
  );
  const val = (x: number, y: number, s: string, i: number, w: number) => (
    <p data-a="flap" className={st.val} style={vars({ position: "absolute", left: U(x), top: U(y), maxWidth: U(w), fontSize: U(wide ? 21 : 19), "--d": `${0.55 + i * 0.06}s`, "--t": "0.7s" })}>
      {s}
    </p>
  );
  const stubBody = (
    <>
      <div className="absolute" style={wide ? { left: U(40), top: U(30), width: U(120), height: U(120) } : { left: U(24), top: U(16), width: U(100), height: U(100) }}>
        <Img src={`${P}/qr.svg`} eager className={st.contain} />
      </div>
      <p className={st.lbl} style={{ position: "absolute", left: U(wide ? 40 : 144), top: U(wide ? 170 : 22), fontSize: U(wide ? 12 : 11), letterSpacing: U(wide ? 1.92 : 1.76) }}>
        CHECK-IN
      </p>
      <p className={cx(st.italic, st.ell)} style={{ position: "absolute", left: U(wide ? 40 : 144), top: U(wide ? 190 : 40), maxWidth: U(wide ? 220 : 170), fontSize: U(wide ? 28 : 24), color: "var(--navy)" }}>
        {rsvp && d.rsvpUntil ? d.rsvpUntil : d.time ? t("soat {time}", { time: d.time }) : d.dots}
      </p>
      <p className={st.clamp2} style={{ position: "absolute", left: U(wide ? 40 : 144), top: U(wide ? 236 : 78), width: U(wide ? 210 : 164), fontSize: U(wide ? 15 : 13), lineHeight: 1.4, color: "var(--grey-2)" }}>
        {rsvp ? t("Javobingizni pastdagi anketada qoldiring") : t("Sizni kutib qolamiz")}
      </p>
    </>
  );
  return (
    <Sec ready={ready} z={z} style={{ height: U(H), background: "#e4eaf2" }}>
      <div ref={box} className="absolute inset-0">
        {/* chok bulutlari — hero ostidan */}
        <L r={wide ? [-300, -560, 2000, 1125] : [-330, -250, 1040, 585]} style={{ pointerEvents: "none" }}>
          <Cloud />
        </L>
        <L r={wide ? [-150, -560, 1800, 1012.5] : [-250, -300, 940, 528.75]} style={{ pointerEvents: "none" }}>
          <Cloud flip />
        </L>
        <div className={cx("absolute", st.ticketWrap)} style={{ left: U(wide ? 200 : 30), top: U(wide ? 260 : 170), width: U(wide ? 1040 : 330), height: U(wide ? 400 : 664) }}>
          <div data-a="slot" className={st.ticket} style={vars({ inset: 0, borderRadius: U(wide ? 26 : 22), "--t": "1.2s", "--d": "0.15s" })}>
            <div className="absolute inset-x-0 top-0" style={{ height: U(wide ? 70 : 66), background: "var(--navy)", borderRadius: `${U(wide ? 26 : 22)} ${U(wide ? 26 : 22)} 0 0` }} />
            <p className={st.mono} style={{ position: "absolute", left: U(wide ? 36 : 24), top: U(wide ? 26 : 25), fontSize: U(wide ? 14 : 13), letterSpacing: U(wide ? 2.8 : 2.34), color: "var(--cream)", whiteSpace: "nowrap" }}>
              {t("BAXT AIRLINES")}
            </p>
            {wide && (
              <p className={st.mono} style={{ position: "absolute", left: U(430), top: U(27), fontSize: U(13), letterSpacing: U(2.08), color: "var(--peach)", whiteSpace: "nowrap" }}>
                {t("BORDING PASS · BIZNES KLASS")}
              </p>
            )}
            <div className="absolute" style={{ left: U(wide ? 980 : 284), top: U(wide ? 23 : 22) }}>
              <PlaneIcon size={U(wide ? 24 : 22)} color="var(--peach)" />
            </div>
            {/* yo‘nalish: JSR ✈ MDN */}
            <p data-a="flap" className={st.serif} style={vars({ position: "absolute", left: U(wide ? 36 : 22), top: U(wide ? 98 : 86), fontSize: U(wide ? 80 : 56), lineHeight: 1.1, whiteSpace: "nowrap", "--d": "0.4s" })}>
              <Fit base={wide ? 80 : 56} max={wide ? 196 : 104} deps={d.codeA}>
                {d.codeA}
              </Fit>
            </p>
            <p data-a="flap" className={cx(st.serif, "text-right")} style={vars({ position: "absolute", right: U(wide ? 330 : 22), top: U(wide ? 98 : 86), fontSize: U(wide ? 80 : 56), lineHeight: 1.1, whiteSpace: "nowrap", "--d": "0.45s" })}>
              <Fit base={wide ? 80 : 56} max={wide ? 196 : 104} deps={d.codeB}>
                {d.codeB}
              </Fit>
            </p>
            <svg className="absolute" style={{ left: U(wide ? 245 : 133), top: U(wide ? 149.25 : 123.25), width: U(wide ? 190 : 64), height: U(1.5), overflow: "visible" }} viewBox={`0 0 ${wide ? 190 : 64} 1.5`} preserveAspectRatio="none" aria-hidden>
              <line x1="0" y1="0.75" x2={wide ? 190 : 64} y2="0.75" stroke="#7A8496" strokeWidth="1.5" strokeDasharray="3.05 4.06" />
            </svg>
            <div ref={plane} className="absolute" style={{ left: U(wide ? 231 : 122), top: U(wide ? 136 : 113), willChange: "transform" }}>
              <PlaneIcon size={U(wide ? 28 : 22)} color="var(--terra)" />
            </div>
            <p className={st.ell} style={{ position: "absolute", left: U(wide ? 40 : 24), top: U(wide ? 196 : 158), maxWidth: U(wide ? 300 : 140), fontSize: U(wide ? 17 : 15), color: "var(--grey-2)" }}>
              {d.a}
            </p>
            <p className={cx(st.ell, "text-right")} style={{ position: "absolute", right: U(wide ? 330 : 22), top: U(wide ? 196 : 158), maxWidth: U(wide ? 300 : 140), fontSize: U(wide ? 17 : 15), color: "var(--grey-2)" }}>
              {d.nameB}
            </p>
            <div className="absolute" style={{ left: U(wide ? 36 : 22), top: U(wide ? 240 : 202), width: U(wide ? 674 : 286), height: 1, background: "#e3e6ec" }} />
            {lbl(wide ? 36 : 24, wide ? 262 : 224, t("YO‘LOVCHI"), 0)}
            <p data-a="flap" className={st.italic} style={vars({ position: "absolute", left: U(wide ? 36 : 24), top: U(wide ? 282 : 244), color: "var(--navy)", "--d": "0.6s" })}>
              <Fit base={wide ? 30 : 28} max={wide ? 330 : 282} deps={passenger}>
                {passenger}
              </Fit>
            </p>
            {wide ? (
              <>
                {lbl(36, 326, t("REYS"), 1)}
                {val(36, 348, d.flight, 1, 150)}
                {lbl(196, 326, t("SANA"), 2)}
                {val(196, 348, d.ticketDate, 2, 180)}
                {lbl(386, 326, t("BORDING"), 3)}
                {val(386, 348, d.boarding, 3, 130)}
                {lbl(526, 326, t("UCHISH"), 4)}
                {val(526, 348, d.time, 4, 180)}
                {lbl(386, 262, "GATE", 5)}
                {val(386, 284, d.venue, 5, 210)}
                {lbl(606, 262, t("O‘RINDIQ"), 6)}
                {val(606, 284, "1A", 6, 100)}
              </>
            ) : (
              <>
                {lbl(24, 300, t("REYS"), 1)}
                {val(24, 320, d.flight, 1, 150)}
                {lbl(182, 300, t("SANA"), 2)}
                {val(182, 320, d.ticketDate, 2, 130)}
                {lbl(24, 368, t("BORDING"), 3)}
                {val(24, 388, d.boarding, 3, 150)}
                {lbl(182, 368, t("UCHISH"), 4)}
                {val(182, 388, d.time, 4, 130)}
                {lbl(24, 436, "GATE", 5)}
                {val(24, 456, d.venue, 5, 150)}
                {lbl(182, 436, t("O‘RINDIQ"), 6)}
                {val(182, 456, "1A", 6, 130)}
              </>
            )}
            {/* perforatsiya va kesiklar */}
            {wide ? (
              <>
                <svg className="absolute" style={{ left: U(751.25), top: U(86), width: U(1.5), height: U(300) }} viewBox="0 0 1.5 300" preserveAspectRatio="none" aria-hidden>
                  <line x1="0.75" y1="0" x2="0.75" y2="300" stroke="#C8CDD6" strokeWidth="1.5" strokeDasharray="4.98 5.98" />
                </svg>
                <span className="absolute rounded-full" style={{ left: U(736), top: U(-16), width: U(32), height: U(32), background: "#e4eaf2" }} />
                <span className="absolute rounded-full" style={{ left: U(736), top: U(384), width: U(32), height: U(32), background: "#e4eaf2" }} />
              </>
            ) : (
              <>
                <svg className="absolute" style={{ left: U(28), top: U(511.25), width: U(274), height: U(1.5) }} viewBox="0 0 274 1.5" preserveAspectRatio="none" aria-hidden>
                  <line x1="0" y1="0.75" x2="274" y2="0.75" stroke="#C8CDD6" strokeWidth="1.5" strokeDasharray="4.98 5.98" />
                </svg>
                <span className="absolute rounded-full" style={{ left: U(-15), top: U(497), width: U(30), height: U(30), background: "#e4eaf2" }} />
                <span className="absolute rounded-full" style={{ left: U(315), top: U(497), width: U(30), height: U(30), background: "#e4eaf2" }} />
              </>
            )}
            {/* qirqim — scroll oxirida perforatsiya bo‘ylab yirtiladi (08 anketada yana paydo bo‘ladi) */}
            <div ref={stub} className={st.stub} style={wide ? { left: U(760), top: U(70), width: U(280), height: U(330) } : { left: 0, top: U(518), width: U(330), height: U(140) }}>
              {stubBody}
            </div>
          </div>
        </div>
      </div>
    </Sec>
  );
}

/* ═════════════ 02 · Illyuminator + taklif matni ═════════════ */
function Porthole({ k, par }: { k: number; par: number }) {
  // mobil koordinatalar (ramka maskasi boshidan), laptop — ×1.2727
  const s = (n: number) => U(n * k);
  return (
    <div className="absolute" style={{ left: 0, top: 0, width: s(302), height: s(400), borderRadius: s(151), overflow: "hidden" }}>
      <div className="absolute overflow-hidden" style={{ left: s(35.25), top: s(75.4), width: s(240), height: s(296), borderRadius: s(60), background: "#a8bcd6" }}>
        <div className="absolute" style={{ left: s(-1), top: s(-76), width: s(250), height: s(444.44) }}>
          <Img src={`${P}/osmon.webp`} />
        </div>
        <div className="absolute" style={{ left: s(-89), top: s(4), width: s(420), height: s(236.25), transform: `translateX(${s((0.5 - par) * 70)})`, willChange: "transform" }}>
          <Cloud small />
        </div>
        <div className="absolute" style={{ left: s(-139), top: s(114), width: s(520), height: s(292.5), transform: `translateX(${s((0.5 - par) * 34)})` }}>
          <Cloud />
        </div>
        <div className="absolute flex items-center justify-center" style={{ left: s(121), top: s(77.72), width: s(93.31), height: s(56.78), transform: `translateX(${s((par - 0.5) * 40)})` }}>
          <div style={{ width: s(90), height: s(50.63), rotate: "-4deg", flex: "none" }}>
            <Img src={`${P}/samolyot.webp`} />
          </div>
        </div>
      </div>
      <div className="absolute" style={{ left: s(-68.75), top: s(-20.6), width: s(440), height: s(440) }}>
        <Img src={`${P}/illyuminator.webp`} />
      </div>
    </div>
  );
}

function Invite({ d, wide, ready, tail, z }: { d: D; wide: boolean; ready: boolean; tail: number; z: number }) {
  const t = useT();
  const v: V = (m, l) => U(wide ? l : m);
  const box = useRef<HTMLDivElement>(null);
  const [par, setPar] = useState(0.5);
  useScrollProgress(box, (p) => setPar((x) => (Math.abs(x - p) < 0.003 ? x : p)), ready);
  const k = wide ? 1.2727 : 1;
  const text = (
    <>
      <p data-a="blur" className={st.italic} style={{ fontSize: v(40, 64), lineHeight: 1.1, color: "var(--navy)" }}>
        {t("Aziz mehmonimiz!")}
      </p>
      {d.message && (
        <p className={wide ? undefined : "text-center"} style={{ fontSize: v(19, 22), lineHeight: wide ? 1.55 : 1.5, color: "var(--navy)", marginTop: v(22, 30), whiteSpace: "pre-line", overflowWrap: "anywhere" }}>
          <Words text={d.message} d0={0.2} step={0.025} />
        </p>
      )}
      <p data-a="blur" className={st.italic} style={vars({ fontSize: v(28, 34), color: "var(--terra)", marginTop: v(d.message ? 54 : 30, d.message ? 78 : 40), overflowWrap: "anywhere", "--d": "0.7s" })}>
        {d.namesVa}
      </p>
    </>
  );
  return (
    <Sec ready={ready} z={z} style={{ background: "#ede6da", minHeight: U((wide ? 780 : 760) + tail), paddingBottom: U((wide ? 120 : 83) + tail) }}>
      <div ref={box} data-a="scale" className="absolute" style={vars({ left: v(43.75, 237.5), top: v(-39.4, -63.8), width: U(302 * k), height: U(400 * k), "--z": 0.92, "--t": "1.2s" })}>
        <Porthole k={k} par={par} />
      </div>
      {wide ? (
        <div style={{ marginLeft: U(780), paddingTop: U(200), width: U(520) }}>{text}</div>
      ) : (
        <div className="flex flex-col items-center text-center" style={{ paddingTop: U(404), paddingInline: U(30) }}>
          {text}
        </div>
      )}
    </Sec>
  );
}

/* ═════════════ 03 · Jo‘nash tablosi — taymer ═════════════ */
function Tile({ ch, flip, w, h, fs }: { ch: string; flip: boolean; w: string; h: string; fs: string }) {
  return (
    <div className={st.tile} style={{ width: w, height: h, fontSize: fs }}>
      <span key={flip ? ch : "s"} className={flip ? st.flip : undefined}>
        {ch}
      </span>
    </div>
  );
}
function Group({ value, label, run, len, wide, i }: { value: number; label: string; run: boolean; len: number; wide: boolean; i: number }) {
  const c = useCountUp(value, run, 1400 + i * 150);
  const digits = String(c.value).padStart(len, "0").slice(-len).split("");
  const w = U(wide ? 62.1 : 46);
  const h = U(wide ? 89.1 : 66);
  return (
    <div data-a="up" className="flex flex-col items-center" style={vars({ gap: U(wide ? 16 : 12), "--d": `${0.3 + i * 0.08}s`, "--y": 20 })}>
      <div className="flex" style={{ gap: U(wide ? 6 : 5) }}>
        {digits.map((dg, j) => (
          <Tile key={j} ch={dg} flip={c.done} w={w} h={h} fs={U(wide ? 54 : 40)} />
        ))}
      </div>
      <p className={st.mono} style={{ fontSize: U(wide ? 13 : 12), letterSpacing: U(wide ? 2.86 : 2.4), color: "rgba(244,233,216,.6)", textTransform: "uppercase" }}>
        {label}
      </p>
    </div>
  );
}
function Board({ d, wide, ready, tail, z }: { d: D; wide: boolean; ready: boolean; tail: number; z: number }) {
  const t = useT();
  const lang = useLocale();
  const v: V = (m, l) => U(wide ? l : m);
  const [ref, inView] = useInView<HTMLDivElement>(0.3, ready);
  const c = useCountdown(d.target);
  const labels = lang === "ru" ? ["дней", "часов", "минут", "секунд"] : ["kun", "soat", "daqiqa", "soniya"];
  const daysLen = c ? Math.max(2, String(c.d).length) : 2;
  const groups = c ? ([c.d, c.h, c.m, c.s] as const) : null;
  const run = inView;
  const row = (idx: number[]) => (
    <div className="flex justify-center" style={{ gap: U(wide ? 56 : 28) }}>
      {idx.map((i) => (
        <Group key={i} value={groups![i]} label={labels[i]} run={run} len={i === 0 ? daysLen : 2} wide={wide} i={i} />
      ))}
    </div>
  );
  const ticker = [d.flight, `${d.city.toUpperCase()} → ${t("BAXT")}`, t("O‘Z VAQTIDA"), `GATE: ${(d.venue || "").toUpperCase()}`].filter(Boolean).join("  ·  ");
  const H = (wide ? 700 : 660) + tail;
  return (
    <Sec ready={ready} z={z} style={{ height: U(H), background: "var(--navy-2)", color: "var(--cream)" }}>
      {/* bulut qirrasi (chok) */}
      <svg className="absolute" style={{ left: v(-10, -20), top: U(-62), width: v(470, 1580), height: v(80, 84) }} viewBox={wide ? "0 0 1580 84" : "0 0 470 80"} preserveAspectRatio="none" aria-hidden>
        <path d={wide ? EDGE_L : EDGE_M} fill="#17233A" />
      </svg>
      <p data-a="blur" className={cx(st.italic, "absolute inset-x-0 text-center")} style={{ top: v(62, 70), fontSize: v(42, 56) }}>
        {t("Uchishgacha")}
      </p>
      <div ref={ref} className="absolute inset-x-0 flex flex-col items-center" style={{ top: v(148, 180), gap: U(22) }}>
        {groups && (wide ? row([0, 1, 2, 3]) : (
          <>
            {row([0, 1])}
            {row([2, 3])}
          </>
        ))}
      </div>
      {/* yugurik satr */}
      <div className="absolute overflow-hidden" style={{ left: 0, right: 0, top: v(392, 360), height: v(40, 44), borderBlock: "1px solid rgba(239,169,126,.45)" }}>
        <div className={st.marquee} style={{ paddingTop: v(10, 12) }}>
          {[0, 1].map((n) => (
            <p key={n} className={st.mono} aria-hidden={n === 1} style={{ fontSize: v(13, 14), letterSpacing: v(1.3, 1.68), color: "var(--peach)", whiteSpace: "pre", paddingRight: U(18) }}>
              {`${ticker}  ·  ${ticker}  ·  ${ticker}  ·  `}
            </p>
          ))}
        </div>
      </div>
      <p data-a="up" className={cx(st.serif, "absolute inset-x-0 text-center")} style={vars({ top: v(462, 446), "--y": 20 })}>
        <Fit base={wide ? 40 : 30} max={wide ? 1200 : 360} deps={d.longDate}>
          {d.longDate}
        </Fit>
      </p>
      <p data-a="up" className="absolute inset-x-0 text-center" style={vars({ top: v(510, 506), fontSize: v(17, 19), opacity: 0.72, whiteSpace: "pre", "--y": 20, "--d": "0.1s" })}>
        {[d.boarding && `${t("Bording")} ${d.boarding}`, d.time && `${t("Uchish")} ${d.time}`].filter(Boolean).join("  ·  ")}
      </p>
      <div data-a="up" className="absolute inset-x-0 flex justify-center" style={vars({ top: v(560, 564), "--y": 20, "--d": "0.2s" })}>
        <button
          type="button"
          className={st.btnLine}
          style={{ padding: wide ? `${U(16)} ${U(26)}` : `${U(14)} ${U(22)}`, fontSize: v(16, 17), color: "var(--cream)" }}
          onClick={() => downloadIcs({ title: d.b ? t("{names} — to‘y", { names: d.names }) : t("{name} — taklif", { name: d.a }), startLocal: `${d.iso}T${d.time || "18:00"}`, location: [d.venue, d.address].filter(Boolean).join(", "), slug: (d.a || "toy").toLowerCase() })}
        >
          {t("Kalendarga qo‘shish")}
        </button>
      </div>
    </Sec>
  );
}
const EDGE_M =
  "M420 0C437.673 0 452 14.3269 452 32C452 32.6718 451.976 33.3385 451.936 34H470V80H0V34H6.52832C9.36223 18.084 23.2697 6 40 6C49.8788 6 58.7715 10.215 64.9834 16.9424C69.8387 6.91514 80.1117 0 92 0C103.658 0 113.762 6.65006 118.728 16.3633C125.227 9.9553 134.152 6 144 6C155.885 6 166.422 11.7608 172.979 20.6406C176.21 8.74697 187.083 0 200 0C211.404 0 221.214 6.81801 225.58 16.5996C231.814 8.91339 241.333 4 252 4C263.693 4 274.006 9.90336 280.125 18.8916C284.54 7.82251 295.356 0 308 0C319.692 0 329.82 6.68948 334.771 16.4492C341.372 8.82375 351.123 4 362 4C373.862 4 384.382 9.73774 390.94 18.5879C396.013 7.61458 407.117 0 420 0Z";
const EDGE_L =
  "M1466 0C1480.69 0 1492.92 10.5619 1495.5 24.5068C1501.29 12.3793 1513.66 4 1528 4C1546.53 4 1561.79 18.0003 1563.78 36H1580V82H1416.2C1412.37 83.2965 1408.27 84 1404 84C1399.73 84 1395.63 83.2965 1391.8 82H1106.2C1102.37 83.2965 1098.27 84 1094 84C1089.73 84 1085.63 83.2965 1081.8 82H796.196C792.368 83.2965 788.266 84 784 84C779.734 84 775.632 83.2965 771.804 82H486.196C482.368 83.2965 478.266 84 474 84C469.734 84 465.632 83.2965 461.804 82H176.196C172.368 83.2965 168.266 84 164 84C159.734 84 155.632 83.2965 151.804 82H0V36H6.52832C9.36223 20.084 23.2697 8 40 8C56.7303 8 70.6378 20.084 73.4717 36H74.2852C74.0983 34.6935 74 33.3582 74 32C74 16.536 86.536 4 102 4C116.547 4 128.501 15.0931 129.868 29.2812C136.054 16.6773 149.013 8 164 8C177.621 8 189.566 15.1682 196.274 25.9365C198.258 11.29 210.81 0 226 0C240.692 0 252.915 10.5619 255.496 24.5068C261.287 12.3793 273.665 4 288 4C302.46 4 314.927 12.5265 320.652 24.8252C326.556 14.7595 337.488 8 350 8C366.73 8 380.638 20.084 383.472 36H384.285C384.098 34.6935 384 33.3582 384 32C384 16.536 396.536 4 412 4C426.547 4 438.501 15.0931 439.868 29.2812C446.054 16.6773 459.013 8 474 8C487.621 8 499.566 15.1682 506.274 25.9365C508.258 11.29 520.81 0 536 0C550.692 0 562.915 10.5619 565.496 24.5068C571.287 12.3793 583.665 4 598 4C612.46 4 624.927 12.5265 630.652 24.8252C636.556 14.7595 647.488 8 660 8C676.73 8 690.638 20.084 693.472 36H694.285C694.098 34.6935 694 33.3582 694 32C694 16.536 706.536 4 722 4C736.547 4 748.501 15.0931 749.868 29.2812C756.054 16.6773 769.013 8 784 8C797.621 8 809.566 15.1682 816.274 25.9365C818.258 11.29 830.81 0 846 0C860.692 0 872.915 10.5619 875.496 24.5068C881.287 12.3793 893.665 4 908 4C922.46 4 934.927 12.5265 940.652 24.8252C946.556 14.7595 957.488 8 970 8C986.73 8 1000.64 20.084 1003.47 36H1004.29C1004.1 34.6935 1004 33.3582 1004 32C1004 16.536 1016.54 4 1032 4C1046.55 4 1058.5 15.0931 1059.87 29.2812C1066.05 16.6773 1079.01 8 1094 8C1107.62 8 1119.57 15.1682 1126.27 25.9365C1128.26 11.29 1140.81 0 1156 0C1170.69 0 1182.92 10.5619 1185.5 24.5068C1191.29 12.3793 1203.66 4 1218 4C1232.46 4 1244.93 12.5265 1250.65 24.8252C1256.56 14.7595 1267.49 8 1280 8C1296.73 8 1310.64 20.084 1313.47 36H1314.29C1314.1 34.6935 1314 33.3582 1314 32C1314 16.536 1326.54 4 1342 4C1356.55 4 1368.5 15.0931 1369.87 29.2812C1376.05 16.6773 1389.01 8 1404 8C1417.62 8 1429.57 15.1682 1436.27 25.9365C1438.26 11.29 1450.81 0 1466 0Z";

/* ═════════════ 04 · Parvoz rejasi — yo‘l chizig‘i ═════════════ */
function Program({ d, wide, ready, tail, z }: { d: D; wide: boolean; ready: boolean; tail: number; z: number }) {
  const t = useT();
  const v: V = (m, l) => U(wide ? l : m);
  const list = useRef<HTMLDivElement>(null);
  const dots = useRef<(HTMLDivElement | null)[]>([]);
  const clip = useRef<SVGRectElement>(null);
  const plane = useRef<HTMLDivElement>(null);
  const items = d.program.slice(0, 8);
  const n = items.length;
  const [on, setOn] = useState(0);
  // mobil: bekatlar o‘lchab olinadi (matn uzunligi har xil); laptop: teng oraliq
  const [stopsM, setStopsM] = useState<number[]>([]);
  const [listH, setListH] = useState(0);
  useIso(() => {
    if (wide || !list.current) return;
    const el = list.current;
    const measure = () => {
      const u = el.clientWidth / 390;
      if (!u) return;
      const top = el.getBoundingClientRect().top;
      setStopsM(dots.current.slice(0, n).map((x) => (x ? (x.getBoundingClientRect().top - top) / u : 0)));
      setListH(el.offsetHeight / u);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [wide, n, d.program]);
  const sp = n <= 5 ? 260 : 1040 / Math.max(1, n - 1);
  const stopsL = Array.from({ length: n }, (_, i) => 720 - ((n - 1) * sp) / 2 + i * sp);
  const stops = wide ? stopsL : stopsM;
  const lead = wide ? 100 : 50;
  const amp = wide ? 25.5 : 16.5;
  const center = wide ? 380 : 52;
  const path = stops.length === n && n ? wavePath(stops, center, amp, lead, !wide) : "";
  const onRef = useRef(0);
  onRef.current = on;
  const maxF = useRef(0);
  useScrollProgress(
    list,
    (p, r) => {
      if (!stops.length) return;
      const u = r.width / (wide ? 1440 : 390);
      const vh = window.innerHeight;
      let f: number;
      if (wide) f = seg(p, 0.3, 0.62);
      else {
        // samolyot ekranning ~62% balandligida yuradi
        const y = (0.62 * vh - r.top) / u;
        f = clamp01((y - (stops[0] - lead)) / (stops[n - 1] - stops[0] + lead));
      }
      // bir marta chiziladi: orqaga scroll qilinsa yo‘l o‘chmaydi
      f = Math.max(f, maxF.current);
      maxF.current = f;
      const pt = wavePoint(stops, center, amp, lead, f);
      const span = stops[n - 1] - (stops[0] - lead);
      if (clip.current) {
        clip.current.setAttribute(wide ? "width" : "height", String(Math.max(0, pt.along)));
      }
      if (plane.current) {
        plane.current.style.transform = wide ? `translate(${U(pt.along)}, ${U(pt.off)}) translate(-50%, -50%) rotate(${90 + pt.angle * 0.8}deg)` : `translate(${U(pt.off)}, ${U(pt.along)}) translate(-50%, -50%) rotate(${180 - pt.angle * 0.8}deg)`;
        plane.current.style.opacity = f >= 0.995 ? "0" : "1";
      }
      const reached = stops.filter((s) => pt.along >= s - 2).length;
      if (span > 0 && reached !== onRef.current) setOn(reached);
    },
    ready && n > 0,
  );
  if (!n) return null;
  const H = wide ? 820 + tail : undefined;
  return (
    <Sec ready={ready} z={z} style={{ background: "#eaf0f6", height: H ? U(H) : undefined, paddingBottom: wide ? undefined : U(160 + tail) }}>
      <L r={wide ? [20, -330, 1400, 787.5] : [-110, -190, 600, 337.5]} style={{ pointerEvents: "none" }}>
        <Cloud small />
      </L>
      <p data-a="blur" className={cx(st.serif, "text-center")} style={{ position: wide ? "absolute" : "relative", left: 0, right: 0, top: wide ? U(150) : undefined, paddingTop: wide ? 0 : U(120), fontSize: v(46, 64), lineHeight: wide ? 1.33 : 1.33 }}>
        {t("Parvoz rejasi")}
      </p>
      {wide ? (
        <div ref={list} className="absolute inset-x-0" style={{ top: 0, height: U(700) }}>
          <svg className="absolute" style={{ left: 0, top: 0, width: U(1440), height: U(500) }} viewBox="0 0 1440 500" aria-hidden>
            <defs>
              <clipPath id="parvoz-clip-l">
                <rect ref={clip} x="0" y="0" width="0" height="500" />
              </clipPath>
            </defs>
            <path d={path} fill="none" stroke="#1C2B45" strokeOpacity={0.45} strokeWidth={2} strokeLinecap="round" strokeDasharray="3.05 4.06" clipPath="url(#parvoz-clip-l)" />
          </svg>
          {items.map((it, i) => {
            const last = i === n - 1;
            const x = stopsL[i];
            const cw = Math.min(230, sp - 24);
            const small = n > 5;
            return (
              <div key={i}>
                {last ? (
                  <div className={cx(st.heart, on > i && st.heartOn)} style={{ left: U(x), top: U(380), width: U(42), height: U(42) }}>
                    <Heart />
                  </div>
                ) : (
                  <div className={cx(st.dot, on > i && st.dotOn)} style={{ left: U(x), top: U(380), width: U(24), height: U(24) }} />
                )}
                <div className={cx(st.stop, on <= i && st.stopOffY, "absolute flex flex-col items-center text-center")} style={{ left: U(x - cw / 2), top: U(426), width: U(cw) }}>
                  <p className={st.mono} style={{ fontSize: U(17), letterSpacing: U(1.02), color: "var(--terra)" }}>
                    {it.time}
                  </p>
                  <p className={cx(st.serif, st.clamp2)} style={{ fontSize: U(small ? 26 : 32), lineHeight: 1.1, marginTop: U(6), minHeight: U(small ? 57 : 70) }}>
                    {it.title}
                  </p>
                  {it.note && (
                    <p className={st.clamp3} style={{ fontSize: U(small ? 15 : 17), lineHeight: 1.45, color: "var(--grey)", marginTop: U(6), width: U(Math.min(220, cw - 10)) }}>
                      {it.note}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={plane} className="absolute" style={{ left: 0, top: 0, width: U(34), height: U(34), transform: `translate(${U(stopsL[0] - lead + 6)}, ${U(380)}) translate(-50%, -50%) rotate(90deg)`, willChange: "transform" }}>
            <PlaneIcon size={U(34)} color="var(--navy)" rot={0} />
          </div>
        </div>
      ) : (
        <div ref={list} className="relative" style={{ marginTop: U(35) }}>
          {path && (
            <svg className="absolute" style={{ left: 0, top: 0, width: U(390), height: U(listH) }} viewBox={`0 0 390 ${listH}`} aria-hidden>
              <defs>
                <clipPath id="parvoz-clip-m">
                  <rect ref={clip} x="0" y="0" width="390" height="0" />
                </clipPath>
              </defs>
              <path d={path} fill="none" stroke="#1C2B45" strokeOpacity={0.45} strokeWidth={2} strokeLinecap="round" strokeDasharray="3.05 4.06" clipPath="url(#parvoz-clip-m)" />
            </svg>
          )}
          {items.map((it, i) => {
            const last = i === n - 1;
            return (
              <div key={i} className="relative" style={{ minHeight: last ? undefined : U(180), paddingLeft: U(96), paddingRight: U(26), paddingBottom: last ? 0 : U(24) }}>
                <div
                  ref={(el) => {
                    dots.current[i] = el;
                  }}
                  className="absolute"
                  style={{ left: U(52), top: U(last ? 37 : 34), width: 0, height: 0 }}
                />
                {last ? (
                  <div className={cx(st.heart, on > i && st.heartOn)} style={{ left: U(52), top: U(37), width: U(34), height: U(34) }}>
                    <Heart />
                  </div>
                ) : (
                  <div className={cx(st.dot, on > i && st.dotOn)} style={{ left: U(52), top: U(34), width: U(20), height: U(20) }} />
                )}
                <div className={cx(st.stop, on <= i && st.stopOff)}>
                  <p className={st.mono} style={{ fontSize: U(16), letterSpacing: U(0.96), color: "var(--terra)", lineHeight: 1.3 }}>
                    {it.time}
                  </p>
                  <p className={cx(st.serif, st.clamp2)} style={{ fontSize: U(30), lineHeight: 1.1, marginTop: U(1) }}>
                    {it.title}
                  </p>
                  {it.note && (
                    <p className={st.clamp2} style={{ fontSize: U(17), lineHeight: 1.45, color: "var(--grey)", marginTop: U(9) }}>
                      {it.note}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={plane} className="absolute" style={{ left: 0, top: 0, width: U(30), height: U(30), transform: `translate(${U(52)}, ${U((stops[0] ?? 34) - lead + 3)}) translate(-50%, -50%) rotate(180deg)`, willChange: "transform" }}>
            <PlaneIcon size={U(30)} color="var(--navy)" rot={0} />
          </div>
        </div>
      )}
    </Sec>
  );
}
const Heart = () => (
  <svg viewBox="0 0 34 34" width="100%" height="100%" aria-hidden>
    <path d="M17 30.2458L14.9458 28.3758C7.65 21.76 2.83333 17.3967 2.83333 12.0417C2.83333 7.67833 6.26167 4.25 10.625 4.25C13.09 4.25 15.4558 5.3975 17 7.21083C18.5442 5.3975 20.91 4.25 23.375 4.25C27.7383 4.25 31.1667 7.67833 31.1667 12.0417C31.1667 17.3967 26.35 21.76 19.0542 28.39L17 30.2458Z" fill="#EFA97E" />
  </svg>
);

/* ═════════════ 05 · Qo‘nish joyi — manzil ═════════════ */
function Venue({ d, wide, ready, tail, z, linkable }: { d: D; wide: boolean; ready: boolean; tail: number; z: number; linkable: boolean }) {
  const t = useT();
  const v: V = (m, l) => U(wide ? l : m);
  const box = useRef<HTMLDivElement>(null);
  const [par, setPar] = useState(0.5);
  useScrollProgress(box, (p) => setPar((x) => (Math.abs(x - p) < 0.003 ? x : p)), ready);
  const taxi = d.coords ? `https://3.redirect.appmetrica.yandex.com/route?end-lat=${d.coords.lat}&end-lon=${d.coords.lon}&appmetrica_tracking_id=1178268795219780156` : null;
  const gate = `GATE · ${(d.venue || "").toUpperCase()}`;
  const card = (
    <div data-a="up" className={cx(st.card, "relative flex flex-col items-start")} style={vars({ width: v(318, 500), padding: v(26, 34), gap: v(10, 12), borderRadius: v(22, 24), "--y": 60, "--d": "0.35s", zIndex: 2 })}>
      <p className={cx(st.mono, st.ell)} style={{ maxWidth: "100%", fontSize: v(12, 13), letterSpacing: v(1.92, 2.08), color: "var(--grey)" }}>
        {gate}
      </p>
      <p className={st.serif} style={{ fontSize: v(32, 40), lineHeight: 1.1, overflowWrap: "anywhere" }}>
        {d.venueTitle}
      </p>
      {d.address && (
        <p style={{ fontSize: v(17, 19), lineHeight: wide ? 1.5 : 1.45, color: "var(--grey)", overflowWrap: "anywhere" }}>
          {d.address}
        </p>
      )}
      <div className="flex flex-wrap" style={{ gap: v(10, 12) }}>
        <a href={linkable ? d.mapUrl : undefined} target="_blank" rel="noopener noreferrer" className={st.btnNavy} style={{ padding: wide ? `${U(16)} ${U(26)}` : `${U(14)} ${U(22)}`, fontSize: v(16, 17) }}>
          {t("Xaritada ochish")}
        </a>
        {taxi && (
          <a href={linkable ? taxi : undefined} target="_blank" rel="noopener noreferrer" className={st.btnLine} style={{ padding: wide ? `${U(16)} ${U(26)}` : `${U(14)} ${U(22)}`, fontSize: v(16, 17), color: "var(--navy)" }}>
            {t("Taksi")}
          </a>
        )}
      </div>
      {wide && d.venueNote && <p style={{ fontSize: U(16), color: "var(--grey)", overflowWrap: "anywhere" }}>{d.venueNote}</p>}
    </div>
  );
  const bouquet = (
    <Rot a="land" box={wide ? [553.47, -150, 379.54, 379.54] : [156.18, -146, 272.79, 272.79]} w={wide ? 320 : 230} h={wide ? 320 : 230} rot={12} z={3} style={vars({ "--d": "0.2s", "--t": "1.2s", transform: `translateY(${(par * -36).toFixed(1)}px)`, pointerEvents: "none" })}>
      <Img src={`${P}/guldasta.webp`} />
    </Rot>
  );
  return (
    <Sec ready={ready} z={z} style={{ background: "#f6f1e8", minHeight: wide ? U(820 + tail) : undefined, paddingBottom: wide ? U(110 + tail) : U(145 + tail) }}>
      <div ref={box} className="absolute inset-0" style={{ pointerEvents: "none" }} />
      {bouquet}
      {wide ? (
        <div className="relative" style={{ paddingTop: U(150) }}>
          <div className="absolute overflow-hidden" style={{ left: U(150), top: U(170), width: U(700), height: U(525), borderRadius: U(35.5) }}>
            <Img src={`${P}/manzil.webp`} a="zoom" style={vars({ "--z": 1.15, "--t": "1.6s" })} />
          </div>
          <div className="relative flex flex-col items-end" style={{ marginRight: U(150) }}>
            <p data-a="blur" className={cx(st.serif, "text-right")} style={{ lineHeight: 1.33, width: U(500) }}>
              <Fit base={64} max={420} deps={t("Qo‘nish joyi")}>
                {t("Qo‘nish joyi")}
              </Fit>
            </p>
            <div style={{ marginTop: U(65) }}>{card}</div>
          </div>
        </div>
      ) : (
        <div className="relative flex flex-col items-center" style={{ paddingTop: U(110) }}>
          <p data-a="blur" className={cx(st.serif, "text-center")} style={{ fontSize: U(46), lineHeight: 1.33 }}>
            {t("Qo‘nish joyi")}
          </p>
          <div className="relative overflow-hidden" style={{ width: U(350), height: U(262.5), marginTop: U(24), borderRadius: U(15) }}>
            <Img src={`${P}/manzil.webp`} a="zoom" style={vars({ "--z": 1.15, "--t": "1.6s" })} />
          </div>
          <div style={{ marginTop: U(-48.5) }}>{card}</div>
          {d.venueNote && (
            <p data-a="fade" className="text-center" style={vars({ fontSize: U(16), color: "var(--grey)", marginTop: U(34), paddingInline: U(24), "--d": "0.5s" })}>
              {d.venueNote}
            </p>
          )}
        </div>
      )}
    </Sec>
  );
}

/* ═════════════ 06 · Dress-kod (ixtiyoriy) ═════════════ */
function Dress({ d, wide, ready, tail, z }: { d: D; wide: boolean; ready: boolean; tail: number; z: number }) {
  const t = useT();
  if (!d.dress) return null;
  const x = d.dress;
  const k = wide ? 1.12 : 1;
  const s = (n: number) => U(n * k);
  const one = x.imgs.length === 1;
  const card = (
    <div data-a="up" className={cx(st.dressCard, "relative flex flex-col items-start")} style={vars({ width: s(342), padding: `${s(30)} ${s(24)} ${s(28)}`, gap: s(12), borderRadius: s(22), "--y": 60, "--d": "0.3s" })}>
      <div className="flex items-center" style={{ gap: s(10) }}>
        <span className="rounded-full" style={{ width: s(14), height: s(14), background: "#e4eaf2", border: "1px solid #c8cdd6" }} />
        <p className={st.mono} style={{ fontSize: s(12), letterSpacing: s(1.92), color: "var(--grey)", whiteSpace: "nowrap" }}>
          {t("BAGAJ · DRESS-KOD")}
        </p>
      </div>
      <p className={st.serif} style={{ fontSize: s(34), lineHeight: 1.1 }}>
        {x.title}
      </p>
      <p style={{ fontSize: s(17), color: "var(--terra)" }}>{x.sub}</p>
      <div className="flex w-full justify-center" style={{ gap: s(10) }}>
        {x.imgs.map((im) => (
          <div key={im.src} className="flex flex-col items-center" style={{ gap: s(8), flex: one ? "none" : "1 1 0", minWidth: 0 }}>
            <div className="overflow-hidden" style={{ width: s(one ? 200 : 142), height: s(164), borderRadius: s(16), background: "#fff" }}>
              <Img src={im.src} className={one ? st.contain : undefined} />
            </div>
            <p className={st.mono} style={{ fontSize: s(12), letterSpacing: s(1.68), color: "var(--grey)", whiteSpace: "nowrap" }}>
              {im.label}
            </p>
          </div>
        ))}
      </div>
      <p style={{ fontSize: s(16), lineHeight: 1.5, color: "var(--grey)", overflowWrap: "anywhere" }}>{x.note}</p>
    </div>
  );
  return (
    <Sec ready={ready} z={z} style={{ background: "#e4eaf2", paddingBottom: U((wide ? 260 : 226) + tail), minHeight: wide ? U(984 + tail) : undefined }}>
      <Rot a="land" box={wide ? [250, 261.65, 476.67, 476.67] : [-36, -135.16, 211.74, 211.74]} w={wide ? 440 : 190} h={wide ? 440 : 190} rot={wide ? -5 : -7} z={2} style={vars({ "--d": "0.25s", "--t": "1.1s", pointerEvents: "none" })}>
        <Img src={`${P}/chamadon.webp`} />
      </Rot>
      <p data-a="blur" className={cx(st.serif, "text-center")} style={{ paddingTop: U(wide ? 120 : 110), fontSize: U(wide ? 64 : 46), lineHeight: 1.33 }}>
        {t("Dress-kod")}
      </p>
      <div className="relative" style={wide ? { marginLeft: U(760), marginTop: U(25) } : { marginLeft: U(24), marginTop: U(25) }}>
        {card}
      </div>
    </Sec>
  );
}

/* ═════════════ 07 · Lahzalar — osmondagi suratlar ═════════════ */
function Polaroid({ src, cap, w, h, pad, wide }: { src: string; cap: string; w: number; h: number; pad: [number, number, number]; wide: boolean }) {
  return (
    <div className={st.polaroid} style={{ padding: `${U(pad[0])} ${U(pad[1])} ${U(pad[2])}`, gap: U(wide ? 12 : 10), borderRadius: U(wide ? 8 : 6) }}>
      <div className="overflow-hidden" style={{ width: U(w), height: U(h), background: "#dfe5ee" }}>
        <Img src={src} />
      </div>
      <p className={cx(st.mono, st.ell)} style={{ width: U(w), minHeight: "1.3em", fontSize: U(wide ? 13 : 12), letterSpacing: U(wide ? 1.56 : 1.44), color: "var(--grey)", textTransform: "uppercase" }}>
        {cap}
      </p>
    </div>
  );
}
function Moments({ d, wide, ready, tail, z }: { d: D; wide: boolean; ready: boolean; tail: number; z: number }) {
  const v: V = (m, l) => U(wide ? l : m);
  const box = useRef<HTMLDivElement>(null);
  const [par, setPar] = useState(0.5);
  useScrollProgress(box, (p) => setPar((x) => (Math.abs(x - p) < 0.003 ? x : p)), ready);
  const p1 = d.photo1 || d.photo2;
  const p2 = d.photo1 && d.photo2 ? d.photo2 : null;
  if (!p1 && !d.quote) return null;
  const one = !!p1 && !p2;
  // rasmlar maydoni balandligi (matn shu ostidan oqadi)
  const area = p1 ? (wide ? 0 : 782) : wide ? 0 : 340;
  const stamp = (
    <Rot a="stamp" box={wide ? (p1 ? [960, 178.87, 206.08, 206.08] : [617, 178.87, 206.08, 206.08]) : p1 ? [30, 568.55, 157.59, 157.59] : [116.2, 150, 157.59, 157.59]} w={wide ? 170 : 130} h={wide ? 170 : 130} rot={-14} z={4} style={vars({ "--d": "1s", "--r0": "-14deg" })}>
      <div className={st.stamp} style={{ inset: 0, opacity: 0.9 }}>
        <p className={st.mono} style={{ fontSize: v(17.33, 22.67), letterSpacing: v(1.04, 1.36), whiteSpace: "nowrap" }}>
          {d.flight}
        </p>
        <p className={st.italic} style={{ fontSize: v(14.73, 19.27), whiteSpace: "nowrap" }}>
          {d.dotsShort}
        </p>
      </div>
    </Rot>
  );
  return (
    <Sec ready={ready} z={z} className={st.clipB} style={{ background: "#a8bcd6", minHeight: U((wide ? (p1 ? 960 : 0) : 0) + tail), paddingBottom: U((wide ? 90 : 80) + tail) }}>
      <div ref={box} className="absolute inset-0 overflow-hidden">
        <div className="absolute" style={wide ? { inset: 0 } : { left: U(-70), top: 0, width: U(530), height: "100%" }}>
          <Img src={`${P}/osmon.webp`} />
        </div>
      </div>
      <L r={wide ? [-300, -430, 2000, 1125] : [-330, -250, 1040, 585]} style={{ pointerEvents: "none" }} z={1}>
        <Cloud />
      </L>
      <L r={wide ? [-150, -430, 1800, 1012.5] : [-250, -300, 940, 528.75]} style={{ pointerEvents: "none" }} z={1}>
        <Cloud flip />
      </L>
      {p1 && (
        <Rot
          a="drop"
          box={wide ? (one ? [300, 200, 451.01, 601.01] : [129.98, 200, 451.01, 601.01]) : one ? [45, 150, 300.49, 407.5] : [6.84, 150, 300.49, 407.5]}
          w={wide ? 412 : 274}
          h={wide ? 584.67 : 383.33}
          rot={4}
          z={2}
          style={vars({ "--dy": -120, "--r0": "-4deg", "--t": "1.3s", "--d": "0.2s", translate: `0 ${((par - 0.5) * -30).toFixed(1)}px` })}
        >
          <Polaroid src={p1} cap={d.story1} w={wide ? 380 : 250} h={wide ? 506.67 : 333.33} pad={wide ? [16, 16, 22] : [12, 12, 18]} wide={wide} />
        </Rot>
      )}
      {p2 && (
        <Rot
          a="drop"
          box={wide ? [560, 258.45, 404.81, 536.62] : [166, 394.44, 246.82, 335.3]}
          w={wide ? 362 : 220}
          h={wide ? 515.33 : 311.33}
          rot={-5}
          z={3}
          style={vars({ "--dy": -120, "--r0": "5deg", "--t": "1.3s", "--d": "0.45s", translate: `0 ${((par - 0.5) * -60).toFixed(1)}px` })}
        >
          <Polaroid src={p2} cap={d.story2} w={wide ? 330 : 196} h={wide ? 440 : 261.33} pad={wide ? [16, 16, 22] : [12, 12, 18]} wide={wide} />
        </Rot>
      )}
      {stamp}
      {d.quote && (
        <p className={cx(st.italic, (!wide || !p1) && "text-center")} style={wide ? (p1 ? { position: "absolute", left: U(1010), top: U(470), width: U(330), fontSize: U(40), lineHeight: 1.25, zIndex: 4, overflowWrap: "anywhere" } : { position: "relative", zIndex: 4, paddingTop: U(430), width: U(700), marginInline: "auto", fontSize: U(40), lineHeight: 1.25, overflowWrap: "anywhere" }) : { position: "relative", zIndex: 4, paddingTop: U(area), marginInline: U(32), fontSize: U(27), lineHeight: 1.3, overflowWrap: "anywhere" }}>
          <Words text={d.quote} d0={0.6} step={0.05} />
        </p>
      )}
      {!d.quote && !wide && <div style={{ height: U(area) }} />}
    </Sec>
  );
}

/* ═════════════ 08 · Ro‘yxatdan o‘tish — check-in anketa ═════════════ */
function Rsvp({ d, wide, ready, slug, mode, tail, z }: { d: D; wide: boolean; ready: boolean; slug: string; mode: InvitationSiteProps["mode"]; tail: number; z: number }) {
  const v: V = (m, l) => U(wide ? l : m);
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
    setFly((x) => x + 1);
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
    <p className={st.lbl} style={{ fontSize: U(12), letterSpacing: U(1.92), color: "var(--grey)", marginTop: U(4) }}>
      {s}
    </p>
  );
  const pad = wide ? U(18) : U(16);
  const stub = (
    <Rot a="drop" box={wide ? [185.37, -70, 342.83, 173.73] : [37.25, -64, 301.16, 151.64]} w={wide ? 330 : 290} h={wide ? 140 : 122} rot={6} z={3} style={vars({ "--dy": -160, "--r0": "-6deg", "--t": "1.2s", "--e": "var(--spring)" })}>
      <div className="absolute inset-0" style={{ background: "var(--paper)", borderRadius: v(18, 20), filter: "drop-shadow(0 14px 15px rgba(28,43,69,.18))" }}>
        {!wide && (
          <svg className="absolute" style={{ left: U(20), top: 0, width: U(250), height: U(2) }} viewBox="0 0 250 2" preserveAspectRatio="none" aria-hidden>
            <line x1="0" y1="1" x2="250" y2="1" stroke="#C8CDD6" strokeWidth="1.5" strokeDasharray="4.98 5.98" />
          </svg>
        )}
        <div className="absolute" style={{ left: v(18, 20), top: v(16, 20), width: v(88, 100), height: v(88, 100) }}>
          <Img src={`${P}/qr.svg`} className={st.contain} />
        </div>
        <p className={st.lbl} style={{ position: "absolute", left: v(126, 140), top: v(26, 30), fontSize: v(11, 12), letterSpacing: v(1.54, 1.68), color: "var(--grey)" }}>
          CHECK-IN · {d.flight}
        </p>
        <p className={cx(st.italic, st.nowrap)} style={{ position: "absolute", left: v(126, 140), top: v(46, 52), fontSize: v(22, 25), color: "var(--navy)" }}>
          {t("Sizning joyingiz")}
        </p>
        <p className={st.lbl} style={{ position: "absolute", left: v(126, 140), top: v(82, 94), fontSize: v(12, 13), letterSpacing: v(1.68, 1.82), color: "var(--terra)" }}>
          {t("O‘RINDIQ")} 1A
        </p>
        {sent && sent !== "not_coming" && (
          <div className={st.approved} style={{ left: v(150, 168), top: v(12, 16), padding: `${U(4)} ${U(8)}`, fontSize: v(12, 13), rotate: "-12deg" }}>
            {t("TASDIQLANDI")}
          </div>
        )}
      </div>
    </Rot>
  );
  const intro = (
    <>
      {wide ? (
        <p data-a="blur" className={st.serif} style={{ fontSize: U(64), lineHeight: 1.05, overflowWrap: "anywhere" }}>
          {t("Ro‘yxatdan o‘tish")}
        </p>
      ) : (
        <p data-a="blur" className={cx(st.serif, "text-center")} style={{ lineHeight: 1.33 }}>
          <Fit base={44} max={366} deps={t("Ro‘yxatdan o‘tish")}>
            {t("Ro‘yxatdan o‘tish")}
          </Fit>
        </p>
      )}
      <p data-a="fade" className={!wide ? "text-center" : undefined} style={vars({ fontSize: v(17, 20), lineHeight: wide ? 1.55 : 1.45, color: "var(--grey)", marginTop: wide ? U(26) : 0, maxWidth: wide ? undefined : U(310), "--d": "0.2s" })}>
        {d.rsvpUntil ? t("Iltimos, javobingizni {date} qoldiring", { date: d.rsvpUntil }) : t("Iltimos, javobingizni qoldiring")}
        {wide && <> {t("Chiptangizni tasdiqlaganingizdan so‘ng joyingiz band qilinadi.")}</>}
      </p>
    </>
  );
  const form = (
    <form onSubmit={submit} noValidate data-a="up" className={cx(st.card, "relative")} style={vars({ width: v(342, 560), padding: v(24, 34), borderRadius: v(22, 24), "--y": 60, "--d": "0.3s" })}>
      {sent ? (
        <div className={cx(st.thanks, "flex flex-col items-center text-center")} style={{ gap: U(14), paddingBlock: U(wide ? 60 : 40) }}>
          <div style={{ width: v(54, 64), height: v(54, 64), borderRadius: "50%", background: "#e4eaf2", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PlaneIcon size={v(28, 32)} color="var(--navy)" rot={45} />
          </div>
          <p className={st.serif} style={{ fontSize: v(32, 40), lineHeight: 1.15 }}>
            {sent === "not_coming" ? t("Rahmat!") : t("Rahmat! Sizni kutamiz")}
          </p>
          <p style={{ fontSize: v(16, 18), color: "var(--grey)", lineHeight: 1.5 }}>
            {sent === "not_coming" ? t("Javobingiz uchun rahmat — sizni duolarimizda eslaymiz.") : t("{name} — {count} kishi. Javobingiz yetkazildi.", { name: name.trim() || t("Javobingiz"), count })}
          </p>
          <button type="button" onClick={() => setSent(null)} style={{ color: "var(--navy)", fontSize: v(15, 16), textDecoration: "underline", textUnderlineOffset: 3 }}>
            {t("Javobni o‘zgartirish")}
          </button>
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: U(12) }}>
          <label className="flex flex-col" style={{ gap: U(12) }}>
            {label(t("ISM-FAMILIYA"))}
            <input className={st.field} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={t("Ismingizni yozing")} style={{ fontSize: U(17), padding: pad, borderRadius: U(14) }} />
          </label>
          {label(t("KELASIZMI?"))}
          <div className="flex" role="radiogroup" aria-label={t("Kelasizmi?")} style={{ gap: v(10, 12) }}>
            {(
              [
                ["coming", "Albatta kelaman"],
                ["not_coming", "Kela olmayman"],
              ] as const
            ).map(([s, l]) => (
              <button key={s} type="button" role="radio" aria-checked={status === s} onClick={() => setStatus(s)} className={st.choice} style={{ padding: `${wide ? U(18) : U(14)} ${U(8)}`, minHeight: v(52, 58), borderRadius: U(14), fontSize: v(16, 17), lineHeight: 1.2, gap: U(6) }}>
                {s === "coming" && status === s && (
                  <svg viewBox="0 0 16 16" style={{ width: v(14, 16), height: v(14, 16), flex: "none" }} aria-hidden>
                    <path className={st.check} d="M2.5 8.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                <span style={{ overflowWrap: "anywhere" }}>{t(l)}</span>
              </button>
            ))}
          </div>
          {status === "coming" && (
            <>
              {label(t("NECHA KISHI BO‘LASIZ?"))}
              <div className="flex items-center justify-between" style={{ background: "#fff", border: "1.2px solid var(--line)", borderRadius: U(14), padding: U(6) }}>
                <button type="button" className={st.step} disabled={count <= 1} onClick={() => setCount((c) => Math.max(1, c - 1))} aria-label={t("Kamaytirish")} style={{ width: v(44, 46), height: v(44, 46), borderRadius: U(10), fontSize: v(22, 20) }}>
                  −
                </button>
                <span style={{ fontSize: v(19, 20), fontWeight: 600 }} aria-live="polite">
                  {count}
                </span>
                <button type="button" className={st.step} disabled={count >= 20} onClick={() => setCount((c) => Math.min(20, c + 1))} aria-label={t("Ko‘paytirish")} style={{ width: v(44, 46), height: v(44, 46), borderRadius: U(10), fontSize: v(22, 20) }}>
                  +
                </button>
              </div>
            </>
          )}
          <label className="flex flex-col" style={{ gap: U(12) }}>
            {label(t("TILAKLARINGIZ (IXTIYORIY)"))}
            <textarea className={st.field} value={wish} onChange={(e) => setWish(e.target.value)} maxLength={500} placeholder={t("Kelin-kuyovga bir-ikki so‘z…")} style={{ fontSize: U(17), padding: pad, borderRadius: U(14), height: v(96, 100) }} />
          </label>
          {err && <p style={{ color: "#b3261e", fontSize: U(14) }}>{err}</p>}
          <button type="submit" disabled={busy} className={st.btnPeach} style={{ marginTop: U(6), padding: v(18, 20), fontSize: v(17, 18), gap: U(10), opacity: busy ? 0.7 : 1 }}>
            {busy ? t("Yuborilmoqda…") : t("Chiptani tasdiqlash")}
            <span key={fly} className={fly ? st.planeOut : undefined} style={{ display: "inline-flex" }}>
              <PlaneIcon size={U(20)} color="var(--navy)" />
            </span>
          </button>
        </div>
      )}
    </form>
  );
  return (
    <Sec ready={ready} z={z} id="parvoz-javob" style={{ background: "#f6f1e8", paddingBottom: U((wide ? 240 : 230) + tail), minHeight: wide ? U(1058 + tail) : undefined }}>
      {stub}
      {wide ? (
        <div className="relative flex items-start" style={{ paddingTop: U(140), paddingLeft: U(200) }}>
          <div style={{ width: U(480), marginTop: U(100), marginRight: U(20) }}>{intro}</div>
          {form}
        </div>
      ) : (
        <div className="relative flex flex-col items-center" style={{ paddingTop: U(128), paddingInline: U(24) }}>
          <div className="flex flex-col items-center" style={{ width: U(370), minHeight: U(122) }}>
            {intro}
          </div>
          {form}
        </div>
      )}
    </Sec>
  );
}

/* ═════════════ 09 · Final — samolyot uzoqlashadi ═════════════ */
function Final({ d, wide, ready, z, onSeen }: { d: D; wide: boolean; ready: boolean; z: number; onSeen: () => void }) {
  const t = useT();
  const v: V = (m, l) => U(wide ? l : m);
  const box = useRef<HTMLDivElement>(null);
  const pl = useRef<HTMLDivElement>(null);
  useScrollProgress(
    box,
    (p) => {
      const f = seg(p, 0.3, 0.85);
      if (pl.current) pl.current.style.transform = `translate(${U(f * 200)}, ${U(f * -120)}) scale(${(1 - f * 0.6).toFixed(3)})`;
      if (p > 0.45) onSeen();
    },
    ready,
  );
  let k = 0;
  const title = t("Sizni kutamiz!");
  return (
    <Sec ready={ready} z={z} className={st.clipB} style={{ height: v(860, 900), background: "#a8bcd6" }}>
      <div ref={box} className="absolute inset-0 overflow-hidden">
        <div className="absolute" style={wide ? { inset: 0 } : { left: U(-47), top: 0, width: U(484), height: "100%" }}>
          <Img src={`${P}/osmon.webp`} />
        </div>
      </div>
      <L r={wide ? [-300, -430, 2000, 1125] : [-330, -250, 1040, 585]} style={{ pointerEvents: "none" }} z={1}>
        <Cloud />
      </L>
      <L r={wide ? [-150, -430, 1800, 1012.5] : [-250, -300, 940, 528.75]} style={{ pointerEvents: "none" }} z={1}>
        <Cloud flip />
      </L>
      <div ref={pl} className="absolute" style={{ left: v(200, 980), top: v(157.01, 121.38), width: v(205.67, 303.1), height: v(138.24, 203.73), zIndex: 2, transformOrigin: "50% 50%", willChange: "transform" }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div style={{ width: v(190, 280), height: v(106.88, 157.5), rotate: "-10deg", flex: "none" }}>
            <Img src={`${P}/samolyot.webp`} />
          </div>
        </div>
      </div>
      <h2 className={cx(st.serif, "absolute inset-x-0 text-center")} style={{ top: v(340, 290), lineHeight: wide ? 1 : 1.05, zIndex: 3 }}>
        <Fit base={wide ? 104 : 56} max={wide ? 1300 : 370} deps={title}>
          {[...title].map((ch, i) => (
            <span key={i} className={st.word} style={vars({ "--d": `${(0.2 + 0.04 * k++).toFixed(2)}s` })}>
              {ch}
            </span>
          ))}
        </Fit>
      </h2>
      <p data-a="up" className={cx(st.italic, "absolute inset-x-0 text-center")} style={vars({ top: v(414, 410), color: "var(--terra)", zIndex: 3, "--d": "0.7s", "--y": 20 })}>
        <Fit base={wide ? 40 : 30} max={wide ? 1200 : 360} deps={d.names}>
          {d.names}
        </Fit>
      </p>
      <p data-a="fade" className={cx(st.mono, "absolute inset-x-0 text-center")} style={vars({ top: v(466, 476), fontSize: v(15, 17), letterSpacing: v(3.6, 4.42), color: "rgba(28,43,69,.85)", zIndex: 3, "--d": "0.9s" })}>
        {d.dots}
      </p>
      <div className="absolute" style={{ left: v(90, 605), top: v(520, 520), width: v(210, 230), height: v(280, 306.67), zIndex: 2 }}>
        <div className={cx(st.clink, "absolute inset-0")}>
          <Img src={`${P}/shampan.webp`} />
          <div className={st.shine} style={{ maskImage: `url(${P}/shampan.webp)`, WebkitMaskImage: `url(${P}/shampan.webp)` }} />
        </div>
      </div>
      <L r={wide ? [-330, 640, 2100, 1181.25] : [-310, 640, 1000, 562.5]} style={{ pointerEvents: "none" }} z={4}>
        <Cloud />
      </L>
    </Sec>
  );
}

/* ═════════════ Sahifa ═════════════ */
type Key = "ticket" | "invite" | "board" | "program" | "venue" | "dress" | "moments" | "rsvp" | "final";
/** Keyingi bo‘limning yuqoriga chiqib turadigan bezagi (mobil, laptop) — matn ustiga tushmasin */
const OVER: Record<Key, [number, number]> = {
  ticket: [0, 0],
  invite: [60, 90],
  board: [62, 62],
  program: [50, 80], // mayda bulutlar — Figma’da yon tomonlarda, tugma/matnga tegmaydi
  venue: [146, 175],
  dress: [135, 0],
  moments: [140, 230],
  rsvp: [64, 70],
  final: [140, 230],
};
/** Har bo‘lim ostidagi bo‘sh joy (Figma bo‘yicha) — keyingi bo‘lim bezagi shundan katta bo‘lsa, bo‘lim cho‘ziladi */
const ROOM: Record<Key, [number, number]> = {
  ticket: [96, 160],
  invite: [83, 120],
  board: [50, 80],
  program: [160, 220],
  venue: [145, 110],
  dress: [226, 260],
  moments: [80, 90],
  rsvp: [230, 240],
  final: [0, 0],
};

export function ParvozSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded && mode !== "preview";
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && mode !== "preview");
  const [revealed, setRevealed] = useState(!withGate);
  const ready = revealed;
  const loaded = usePreload(
    [`${P}/osmon.webp`, `${P}/bulut.webp`, `${P}/bulutlar.webp`, `${P}/samolyot.webp`],
    [`${P}/qr.svg`, `${P}/illyuminator.webp`, `${P}/guldasta.webp`, `${P}/manzil.webp`, `${P}/chamadon.webp`, d.photo1 ?? "", d.photo2 ?? "", ...(d.dress ? d.dress.imgs.map((x) => x.src) : []), `${P}/shampan.webp`],
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
  const ticketRef = useRef<HTMLDivElement>(null);
  const goTicket = () => {
    music.play();
    const el = ticketRef.current;
    if (!el) return;
    const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: reduce ? "auto" : "smooth" });
  };

  // ko‘rinadigan bo‘limlar ketma-ketligi — har biri keyingisining bezagi uchun joy qoldiradi
  const shown: Key[] = (["ticket", "invite", "board", "program", "venue", "dress", "moments", "rsvp", "final"] as Key[]).filter((k) =>
    k === "program" ? d.program.length > 0 : k === "dress" ? !!d.dress : k === "moments" ? !!(d.photo1 || d.photo2 || d.quote) : k === "rsvp" ? data.rsvpEnabled : true,
  );
  const wi = wide ? 1 : 0;
  const tail = (k: Key) => {
    const i = shown.indexOf(k);
    const next = shown[i + 1];
    if (!next) return 0;
    return Math.max(0, OVER[next][wi] - ROOM[k][wi]);
  };
  const z = (k: Key) => 6 + shown.indexOf(k);

  return (
    <div ref={root} className={cx(st.root, wide && st.wide)}>
      <div className={st.page} style={vars({ "--u": wide ? "calc(100cqw / 1440)" : "calc(100cqw / 390)" })}>
        <MusicButton m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/belgi.svg`} />}
        {withGate && (loaded ? <Gate d={d} wide={wide} onReveal={() => setRevealed(true)} onStart={() => music.play(true)} onGo={goTicket} /> : <div style={{ height: "285svh", marginBottom: "-100svh", width: "100%" }} />)}
        {!withGate && <h1 className="sr-only">{d.names}</h1>}
        <div ref={ticketRef} className="w-full" style={{ position: "relative", zIndex: z("ticket") }}>
          <Ticket d={d} wide={wide} ready={ready} rsvp={data.rsvpEnabled} tail={tail("ticket")} z={z("ticket")} />
        </div>
        <Invite d={d} wide={wide} ready={ready} tail={tail("invite")} z={z("invite")} />
        <Board d={d} wide={wide} ready={ready} tail={tail("board")} z={z("board")} />
        <Program d={d} wide={wide} ready={ready} tail={tail("program")} z={z("program")} />
        <Venue d={d} wide={wide} ready={ready} tail={tail("venue")} z={z("venue")} linkable={mode !== "preview"} />
        <Dress d={d} wide={wide} ready={ready} tail={tail("dress")} z={z("dress")} />
        <Moments d={d} wide={wide} ready={ready} tail={tail("moments")} z={z("moments")} />
        {data.rsvpEnabled && <Rsvp d={d} wide={wide} ready={ready} slug={data.slug} mode={mode} tail={tail("rsvp")} z={z("rsvp")} />}
        <Final d={d} wide={wide} ready={ready} z={z("final")} onSeen={onFinal} />
        <footer className={st.footer} style={{ height: U(wide ? 160 : 170), paddingTop: U(wide ? 44 : 52), gap: U(wide ? 9 : 9) }}>
          <a href="https://shohnoma.uz" className={st.serif} style={{ fontSize: U(wide ? 28 : 26) }}>
            Shohnoma
          </a>
          <span style={{ fontSize: U(wide ? 15 : 14), opacity: 0.6 }}>{t("Taklifnoma shohnoma.uz da yaratildi")}</span>
        </footer>
      </div>
    </div>
  );
}
