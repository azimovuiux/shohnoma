"use client";

import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/playfair-display/400-italic.css";
import "@fontsource/jost/400.css";
import "@fontsource/jost/500.css";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ceremonyLabel } from "@/lib/templates";
import { splitDate, tashkentDate } from "@/lib/display";
import { musicSrc } from "@/lib/music";
import type { InvitationSiteProps } from "@/components/invitation/types";
import { fetchSavedAnswer, loadSavedRsvp, saveRsvp, type RsvpStatus } from "@/components/invitation/Rsvp";
import { useCountdown, useCountUp, useInView, usePointer, useScrollProgress, useWide } from "../shared/hooks";
import { Loader, MusicButton, usePreload, useMusic } from "../shared/runtime";
import { DRESS, MONTHS, MONTHS_LOWER, WEEKDAY, coordsFrom, downloadIcs, type ProgramItem } from "../anor/data";
import { Z, ZUMRAD_DEMO, ogee } from "./data";
import st from "./zumrad.module.css";

const U = (n: number) => `calc(var(--u) * ${n})`;
type V = (m: number, l: number) => string;
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const vars = (o: Record<string, string | number | undefined>) => o as CSSProperties;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const ease = (x: number) => 1 - Math.pow(1 - x, 3);

/* ── Ma’lumot ── */
function useData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const ex = (data.extra ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof ex[k] === "string" ? (ex[k] as string).trim() : "");
  const sd = splitDate(data.date);
  const [guest, setGuest] = useState("");
  useEffect(() => {
    const m = new URLSearchParams(location.search).get("m");
    setGuest(m ? m.slice(0, 80) : demo ? ZUMRAD_DEMO.guest : "");
  }, [demo]);
  return useMemo(() => {
    const exProgram = Array.isArray(ex.program) ? (ex.program as ProgramItem[]).filter((p) => p?.time && p?.title) : [];
    const P = data.photos ?? [];
    const date = sd ? new Date(`${sd.iso}T12:00:00Z`) : null;
    const dress = str("dressCode") || (demo ? ZUMRAD_DEMO.dressCode : "");
    const a = data.personA;
    const b = data.personB;
    return {
      a,
      b,
      names: b ? `${a} & ${b}` : a,
      mono: [a?.[0], b?.[0]].filter(Boolean) as string[],
      kind: `${ceremonyLabel[data.ceremony].replace(/to‘yi$/, "to‘yiga")} taklif`,
      dots: sd?.dots ?? "",
      iso: sd?.iso ?? "",
      time: sd?.time ?? "",
      day: date ? date.getUTCDate() : 0,
      weekday: date ? WEEKDAY[date.getUTCDay()] : "",
      monthYear: date ? `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}` : "",
      target: data.date ? tashkentDate(data.date).getTime() : null,
      guest,
      message: demo ? ZUMRAD_DEMO.message : data.message || "",
      hosts: str("hosts") || (demo ? ZUMRAD_DEMO.hosts : ""),
      venue: data.venueName,
      address: demo ? ZUMRAD_DEMO.address : data.address,
      city: (data.address || "Toshkent").split(/[,.]/)[0].replace(/\s+(sh|shahri|shahar)$/i, "").trim() || "Toshkent",
      mapUrl: data.mapUrl || `https://yandex.uz/maps/?text=${encodeURIComponent([data.venueName, data.address].filter(Boolean).join(", "))}`,
      coords: demo ? { lat: 41.3385, lon: 69.2851 } : coordsFrom(data.mapUrl),
      program: (demo ? ZUMRAD_DEMO.program : exProgram.length ? exProgram : (data.program as ProgramItem[])) as ProgramItem[],
      dress: dress && DRESS[dress] ? { ...DRESS[dress], note: str("dressNote") || DRESS[dress].note } : null,
      storyText: str("storyText") || (demo ? ZUMRAD_DEMO.storyText : ""),
      caption: str("caption") || (demo ? ZUMRAD_DEMO.caption : "Bir umrga"),
      polaroid: P[0] ?? (demo ? `${Z}/foto-polaroid.webp` : `${Z}/foto-qollar.webp`),
      arch: demo ? `${Z}/foto-juftlik.webp` : (P[1] ?? null),
      arch2: demo ? `${Z}/foto-qollar.webp` : (P[2] ?? null),
      rsvpUntil: data.rsvpDeadline ? `${Number(data.rsvpDeadline.slice(8, 10))}-${MONTHS_LOWER[Number(data.rsvpDeadline.slice(5, 7)) - 1]}gacha` : "",
      musicUrl: musicSrc(template, data),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, data, demo, guest]);
}
type D = ReturnType<typeof useData>;

function Sec({ children, className, style, ready, threshold, id }: { children: ReactNode; className?: string; style?: CSSProperties; ready: boolean; threshold?: number; id?: string }) {
  const [ref, inView] = useInView<HTMLElement>(threshold ?? 0.15, ready);
  return (
    <section ref={ref} id={id} className={cx(st.sec, inView && ready && st.in, className)} style={style}>
      {children}
    </section>
  );
}

function Img({ src, className, style, eager, a }: { src: string; className?: string; style?: CSSProperties; eager?: boolean; a?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" draggable={false} data-a={a} loading={eager ? "eager" : "lazy"} decoding="async" className={cx(st.img, className)} style={style} />;
}

const svgMask = (w: number, h: number, d: string): CSSProperties => {
  const url = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' preserveAspectRatio='none'><path d='${d}'/></svg>`)}")`;
  return { maskImage: url, WebkitMaskImage: url, maskSize: "100% 100%", WebkitMaskSize: "100% 100%", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat" };
};

/** Absolyut joylashgan qatlam (Figma koordinatalari, mobil/laptop) */
function L({ m, l, wide, children, className, style, a, z }: { m: [number, number, number, number]; l?: [number, number, number, number]; wide: boolean; children?: ReactNode; className?: string; style?: CSSProperties; a?: string; z?: number }) {
  const [x, y, w, h] = wide && l ? l : m;
  return (
    <div data-a={a} className={cx("absolute", className)} style={{ left: U(x), top: U(y), width: U(w), height: U(h), zIndex: z, ...style }}>
      {children}
    </div>
  );
}

/* ═════════════ 00 · Muhrlangan maktub (scroll bilan) ═════════════ */
function Gate({ d, wide, onReveal, onStart }: { d: D; wide: boolean; onReveal: () => void; onStart: () => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const ptr = usePointer(wide);
  const v: V = (m, l) => U(wide ? l : m);
  const cb = useRef({ onReveal, onStart });
  cb.current = { onReveal, onStart };
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let raf = 0;
    let cur = 0;
    let target = 0;
    let revealed = false;
    let started = false;
    const read = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      target = clamp01(-r.top / Math.max(1, r.height - vh));
      // Damask pastki cheti ostidagi kolajga yopishib ketadi (H — sahna balandligi, 100svh; lerp’siz — tirqish ochilmaydi)
      const H = (el.firstElementChild as HTMLElement | null)?.offsetHeight || vh;
      const shift = Math.min(H, Math.max(0, 2 * H - r.bottom));
      el.style.setProperty("--gy", `${shift.toFixed(1)}px`);
      el.style.pointerEvents = shift > H * 0.6 ? "none" : "";
    };
    const apply = (p: number) => {
      el.style.setProperty("--s", ease(seg(p, 0.02, 0.2)).toFixed(4)); // muhr yoriladi
      el.style.setProperty("--o", ease(seg(p, 0.08, 0.4)).toFixed(4)); // qopqoq 3D ochiladi
      el.style.setProperty("--t", ease(seg(p, 0.03, 0.24)).toFixed(4)); // ismlar
      el.style.setProperty("--f", Math.sin(Math.PI * seg(p, 0.05, 0.24)).toFixed(4));
      if (!started && p > 0.02) {
        started = true;
        cb.current.onStart();
      }
      if (!revealed && p > 0.38) {
        revealed = true;
        cb.current.onReveal();
      }
    };
    const loop = () => {
      cur += (target - cur) * 0.14;
      if (Math.abs(target - cur) < 0.0005) cur = target;
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

  const rings = wide ? [250, 196, 150] : [214.5, 169, 130];
  const sealSize = wide ? 140 : 109.2;
  const sealY = wide ? 454 : 374;
  let k = 0;
  const nameLines = wide ? [d.names] : d.b ? [d.a, `& ${d.b}`] : [d.a];

  return (
    // Ochilish sahnasi bir ekranga sig‘ishi kerak: katta/past ekranda kenglik va balandlikdan kichigiga moslanadi
    <div ref={wrap} className={st.gateWrap} style={wide ? ({ "--u": "min(calc(100cqw / 1440), calc(100svh / 900))" } as CSSProperties) : undefined}>
      <div className={st.gate} aria-label="Taklifnoma">
        <div className={cx(st.gateBg, st.damask)} />
        {wide ? (
          <div className={cx("absolute", st.damask)} style={{ left: `calc(50% - ${U(450)})`, top: U(180), width: U(900), height: U(600), border: "1.2px solid rgba(198,161,91,.7)", borderRadius: U(10), boxShadow: "0 30px 70px rgba(0,8,5,.6)" }} />
        ) : (
          <div className={st.frameLine} style={{ inset: 14 }} />
        )}
        {/* Konvert burmalari */}
        <svg
          className="absolute"
          style={{ left: wide ? `calc(50% - ${U(450)})` : 0, top: v(0, 180), width: wide ? U(900) : "100%", height: v(321.9, 240), zIndex: 1 }}
          viewBox="0 0 390.85 321.94"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d="M0.43 321.68L195.43 0.96L390.43 321.68" fill="none" stroke="#C6A15B" strokeOpacity={0.28} vectorEffect="non-scaling-stroke" />
        </svg>
        {/* Qopqoq — scroll bilan 3D ochiladi */}
        <div className={st.flapWrap} style={{ left: wide ? `calc(50% - ${U(450)})` : 0, top: v(0, 180), width: wide ? U(900) : "100%", height: v(390, 281) }}>
          <div className={st.flap}>
            {[st.face, cx(st.face, st.faceBack)].map((c, i) => (
              <div key={i} className={c}>
                <div className="absolute" style={{ left: "-7.69%", right: "-7.69%", top: "-4.1%", bottom: "-11.28%", transform: i ? "scaleY(-1)" : undefined }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${Z}/qopqoq-${wide ? "l" : "m"}.webp`} alt="" className="block size-full" style={{ objectFit: "fill" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Muhr */}
        <div className={st.seal} style={{ left: `calc(50% - ${U(rings[0] / 2)})`, top: U(sealY - rings[0] / 2), width: U(rings[0]), height: U(rings[0]), transform: wide ? `translate(${ptr.x * 10}px, ${ptr.y * 8}px)` : undefined, transition: "transform .6s var(--ease)" }} aria-hidden>
          <div className={st.rings}>
            {rings.map((r, i) => (
              <span key={r} className={st.ring} style={{ width: U(r), height: U(r), animationDelay: `${i * 0.5}s` }} />
            ))}
          </div>
          <span className="absolute" style={{ left: "50%", top: "50%", width: U(sealSize), height: U(sealSize), transform: "translate(-50%,-50%)" }}>
            <span className={cx(st.half, st.halfL)}>
              <Img src={`${Z}/muhr.webp`} eager />
            </span>
            <span className={cx(st.half, st.halfR)}>
              <Img src={`${Z}/muhr.webp`} eager />
            </span>
          </span>
          <span className={st.flash} style={{ width: U(260), height: U(260) }} />
        </div>
        {/* Ismlar */}
        <div className={st.gateNames} style={{ top: `min(${v(533, 560)}, calc(100svh - ${v(250, 175)}))`, gap: U(10) }}>
          <h1 className={st.italic} style={{ fontSize: v(80, 96), lineHeight: 0.88 }}>
            {nameLines.map((line, li) => (
              <span key={li} style={{ display: "block" }}>
                {[...line].map((ch, i) => (
                  <span key={i} className={st.char} style={{ animationDelay: `${0.5 + 0.03 * k++}s` }}>
                    {ch}
                  </span>
                ))}
              </span>
            ))}
          </h1>
          <p className={cx(st.serif, st.fadeIn)} style={{ fontSize: v(30, 32), fontWeight: 500, letterSpacing: "0.03em", color: "rgba(247,243,234,.85)", animationDelay: "1s" }}>
            {d.dots}
          </p>
          {d.guest && (
            <p className={st.fadeIn} style={{ fontSize: U(15), color: "rgba(247,243,234,.75)", marginTop: U(6), animationDelay: "1.2s" }}>
              Hurmatli {d.guest}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═════════════ Taymer kataklari ═════════════ */
function Cell({ value, label, run, i, w, h, fs, ls, radius }: { value: number; label: string; run: boolean; i: number; w: string; h: string; fs: string; ls: string; radius: string }) {
  const c = useCountUp(value, run);
  const digits = String(c.value).padStart(2, "0").split("");
  return (
    <div data-a="up" className={st.cell} style={vars({ width: w, height: h, borderRadius: radius, gap: 2, "--d": `${0.5 + i * 0.1}s`, "--y": 24 })}>
      <span className={cx(st.serif, st.digits)} style={{ fontSize: fs, color: "var(--green)", lineHeight: 1.2 }}>
        {digits.map((dg, k) => (
          <span key={c.done ? `${digits.length - k}-${dg}` : `${digits.length - k}`} className={c.done ? st.digit : undefined}>
            {dg}
          </span>
        ))}
      </span>
      <span style={{ fontSize: ls, color: "var(--soft)", fontWeight: 500 }}>{label}</span>
    </div>
  );
}
function TimerRow({ d, run, size }: { d: D; run: boolean; size: { w: number; h: number; fs: number; ls: number; r: number; gap: number } }) {
  const c = useCountdown(d.target);
  if (!c) return null;
  return (
    <div className="flex" style={{ gap: U(size.gap) }}>
      {(
        [
          [c.d, "kun"],
          [c.h, "soat"],
          [c.m, "daqiqa"],
          [c.s, "soniya"],
        ] as const
      ).map(([n, l], i) => (
        <Cell key={l} value={n} label={l} run={run} i={i} w={U(size.w)} h={U(size.h)} fs={U(size.fs)} ls={U(size.ls)} radius={U(size.r)} />
      ))}
    </div>
  );
}

/* ═════════════ 01 · Konvert kolaji ═════════════ */
function Collage({ d, wide, ready }: { d: D; wide: boolean; ready: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [par, setPar] = useState(0.5);
  useScrollProgress(box, (p) => setPar(p), ready);
  const [tref, tIn] = useInView<HTMLDivElement>(0.3, ready);
  const v: V = (m, l) => U(wide ? l : m);
  const k = wide ? 1.5 : 1;
  const sh = (speed: number) => `translateY(${((par - 0.5) * (speed - 1) * -120).toFixed(1)}px)`;
  return (
    <Sec ready={ready} style={{ paddingTop: v(30, 60), paddingBottom: v(110, 165) }}>
      <div ref={box} className="relative" style={{ width: v(390, 1440), height: v(982, 1472) }}>
        {/* ichki qopqoq (ochiq) va konvert orqasi */}
        <L wide={wide} m={[35, 57.6, 320, 213.5]} l={[480, 81.9, 480, 303.3]} a="fade" style={vars({ "--t": "0.8s" })}>
          <Img src={`${Z}/ichki-qopqoq.webp`} className={st.contain} />
        </L>
        <L wide={wide} m={[35, 250, 320, 210]} l={[480, 375, 480, 315]} className={st.damask} a="fade" style={vars({ "--t": "0.8s" })} />
        {/* ipak lenta — chapdan o‘ngga yoyiladi */}
        <L wide={wide} m={[-70, 500, 520, 292.6]} l={[95, 750, 1250, 703.5]} a="wipe" z={1} style={vars({ "--d": "1.4s", "--t": "1.6s", transform: sh(0.7) })}>
          <Img src={`${Z}/lenta.webp`} />
        </L>
        {/* ravoq karta — cho‘ntak ortidan ko‘tariladi */}
        <L wide={wide} m={[75, 60, 240, 330]} l={[540, 90, 360, 495]} a="up" z={2} style={vars({ "--y": 160, "--d": "0.3s", "--t": "1.4s", "--e": "var(--spring)" })}>
          <div className={st.cardArch} style={{ inset: 0 }}>
            <svg viewBox="0 0 240 330" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
              <path d="M0 330V132C0 72 43.2 48 81.6 28.8C105.6 16.8 112.8 9.6 120 0C127.2 9.6 134.4 16.8 158.4 28.8C196.8 48 240 72 240 132V330H0Z" fill="#FFFDF8" />
              <path d="M10 320V134C10 78 50 56 86 38C108 27 115 20 120 12C125 20 132 27 154 38C190 56 230 78 230 134V320H10Z" fill="none" stroke="#C6A15B" strokeOpacity={0.6} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          <div className="absolute inset-x-0 flex flex-col items-center text-center" style={{ top: U(72.6 * k), gap: U(6 * k) }}>
            <p style={{ fontSize: U(15 * k), fontWeight: 500, color: "var(--green)" }}>{d.kind}</p>
            <p className={st.italic} style={{ fontSize: U(48 * k), lineHeight: 0.92, color: "var(--ink)" }}>
              {d.a}
              {d.b && (
                <>
                  <br />& {d.b}
                </>
              )}
            </p>
            <p className={st.serif} style={{ fontSize: U(23 * k), letterSpacing: "0.02em", color: "var(--green)" }}>
              {d.dots}
            </p>
          </div>
        </L>
        {/* old cho‘ntak */}
        <L wide={wide} m={[35, 266.8, 320, 224.2]} l={[480, 379, 480, 318.4]} z={3} a="fade" style={vars({ "--t": "0.6s" })}>
          <div className="absolute" style={{ left: "-5.63%", right: "-5.63%", top: wide ? "-11.31%" : "-10.71%", bottom: wide ? "-5.65%" : "-5.35%" }}>
            <Img src={`${Z}/chontak.webp`} className={st.contain} />
          </div>
        </L>
        <L wide={wide} m={[149, 326, 92, 92]} l={[651, 489, 138, 138]} a="stamp" z={4} style={vars({ "--d": "1.1s", "--t": "0.6s", "--e": "var(--spring)" })}>
          <Img src={`${Z}/muhr.webp`} />
        </L>
        {/* polaroid — o‘ngdan tashlanadi */}
        <L wide={wide} m={[225, 382, 148.4, 184]} l={[1022, 572, 222, 276]} a="fly" z={5} style={vars({ "--fx": 120, "--fr": "18deg", "--d": "0.9s", "--t": "1.3s", "--e": "var(--spring)", transform: sh(1.3) })}>
          <div className={st.polaroid} style={{ rotate: "7deg", padding: `${U(8 * k)} ${U(8 * k)} ${U(26 * k)}` }}>
            <div style={{ width: U(132 * k), height: U(150 * k), overflow: "hidden" }}>
              <Img src={d.polaroid} />
            </div>
          </div>
        </L>
        {/* kalla gul shoxchasi — chapdan o‘sadi */}
        <L wide={wide} m={[-87, 350, 190, 190]} l={[37, 525, 285, 285]} a="grow" z={6} style={vars({ "--gr": "-40deg", "--d": "1.2s", "--t": "1.4s", transformOrigin: "0 100%", transform: sh(1.5) })}>
          <Img src={`${Z}/kalla.webp`} style={{ rotate: "24deg" }} />
        </L>
        {/* taymer */}
        <div ref={tref} className="absolute flex flex-col items-start" style={{ left: v(24, 163.5), top: v(560, 840), gap: v(10, 15), zIndex: 6 }}>
          <p data-a="up" className={cx(st.italic, st.title)} style={vars({ fontSize: v(32, 48), color: "var(--green)", "--d": "0.8s", "--y": 20 })}>
            {d.b ? "To‘yimizgacha" : "Bayramgacha"}
          </p>
          <TimerRow d={d} run={tIn} size={wide ? { w: 60, h: 87, fs: 39, ls: 13, r: 15, gap: 9 } : { w: 40, h: 58, fs: 26, ls: 9.5, r: 10, gap: 6 }} />
        </div>
        {/* imzo */}
        <div data-a="up" className="absolute flex flex-col items-center text-center" style={vars({ left: "50%", translate: "-50% 0", top: v(884, 1326), gap: U(2), "--d": "0.3s", "--y": 30, zIndex: 6 })}>
          <p style={{ fontSize: v(16, 22), fontWeight: 500, color: "#45544d" }}>Muhabbat bilan,</p>
          <p className={cx(st.italic, st.title)} style={{ fontSize: v(36, 54), color: "var(--green)" }}>
            {d.names}
          </p>
        </div>
      </div>
    </Sec>
  );
}

/* ═════════════ 02 · Samarqand bog‘i — qatlamli parallaks sahna ═════════════ */
function Garden({ d, wide, ready, variant = "open", onSeen }: { d: D; wide: boolean; ready: boolean; variant?: "open" | "close"; onSeen?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vals, setVals] = useState({ p: variant === "open" ? 0.3 : 0.6, o: variant === "open" ? 0 : 1 });
  useScrollProgress(
    ref,
    (p) => {
      const o = variant === "open" ? ease(seg(p, 0.12, 0.42)) : 1 - ease(seg(p, 0.35, 0.85));
      setVals((x) => (Math.abs(x.p - p) < 0.002 && Math.abs(x.o - o) < 0.002 ? x : { p, o }));
      if (onSeen && p > 0.45) onSeen();
    },
    ready,
  );
  const ptr = usePointer(wide && ready);
  const { p, o } = vals;
  const ty = (speed: number) => (p - 0.5) * (speed - 1) * -260;
  const px = (n: number) => (wide ? ptr.x * n : 0);
  // bir nechta yonma-yon to‘shak (laptop) alohida kattalashsa — chegaralari ochiladi; faqat mobil (bitta to‘shak)
  const bed = 1 + seg(p, 0.72, 1) * 0.25 * (variant === "open" && !wide ? 1 : 0);
  const H = variant === "open" ? (wide ? 920 : 1040) : wide ? 900 : 880;
  const layer = (style: CSSProperties): CSSProperties => ({ ...style, position: "absolute" });

  // Sarvlar va gullar joylashuvi
  const cypress: [number, number, number, number, boolean][] = wide
    ? variant === "close"
      ? [
          [-88.46, 240, 336.92, 600, false],
          [1191.54, 240, 336.92, 600, true],
        ]
      : [
          [-114, 220, 348, 620, false],
          [84, 320, 292, 520, false],
          [1205.9, 220, 348, 620, true],
          [1064, 320, 292, 520, true],
        ]
    : [
        [-110, 330, 314.5, 560, false],
        [185.5, 330, 314.5, 560, true],
      ];
  const beds: [number, number, number, number, boolean][] = wide
    ? variant === "close"
      ? // gul to‘shagi chetlari shaffof emas — ko‘zgu aksi bilan yonma-yon (ustma-ust emas), chegara ko‘rinmasin
        [
          [-150, 517.32, 680, 382.68, false],
          [530, 517.32, 680, 382.68, true],
          [1210, 517.32, 680, 382.68, false],
        ]
      : [
          [-150, 520.06, 700, 393.94, false],
          [550, 520.06, 700, 393.94, true],
          [1250, 520.06, 700, 393.94, false],
        ]
    : [[-235, variant === "open" ? 550 : 396, 860, 484, false]];
  const madrasa = wide ? (variant === "open" ? [310, 300, 820, 461.5] : [360, 495.32, 720, 405.2]) : variant === "open" ? [-85, 470, 560, 315] : [-105, 430, 600, 338];

  return (
    <section ref={ref} className={st.scene} style={{ height: U(H) }}>
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0" style={{ transform: `translateY(${ty(0.15)}px) scale(1.15)` }}>
          <Img src={`${Z}/osmon.webp`} />
        </div>
      </div>
      {/* madrasa + hovuz aksi */}
      <div className={st.layer} style={layer({ left: U(madrasa[0]), top: U(madrasa[1]), width: U(madrasa[2]), height: U(madrasa[3]), transform: `translate(${px(-10)}px, ${ty(0.4)}px)` })}>
        <Img src={`${Z}/madrasa.webp`} />
      </div>
      {variant === "open" && (
        <div className="absolute inset-x-0 overflow-hidden" style={{ top: U(madrasa[1] + madrasa[3]), bottom: 0, background: "linear-gradient(rgba(64,128,122,.9), #143d30)" }}>
          <div className={st.wave} style={{ position: "absolute", left: U(madrasa[0]), top: 0, width: U(madrasa[2]), height: U(madrasa[3]), opacity: 0.22 }}>
            <Img src={`${Z}/madrasa.webp`} />
          </div>
        </div>
      )}
      {variant === "close" && (
        /* gullar ostida osmon chizig‘i qolmasin — pastga footer rangiga silliq o‘tadi */
        <div className="absolute inset-x-0 bottom-0" style={{ height: U(wide ? 200 : 170), zIndex: 2, background: "linear-gradient(rgba(12,42,32,0), rgba(12,42,32,.85) 55%, #0c2a20)" }} />
      )}
      {(variant === "open" || wide) &&
        cypress.map(([x, y, w, h, flip], i) => (
          <div key={i} className={st.layer} style={layer({ left: U(x), top: U(y), width: U(w), height: U(h), transform: `translate(${px(-16)}px, ${ty(0.6)}px) translateX(${(flip ? 1 : -1) * (1 - o) * 30}px)` })}>
            <Img src={`${Z}/sarv.webp`} className={flip ? st.flipX : undefined} />
          </div>
        ))}
      {beds.map(([x, y, w, h, flip], i) => (
        <div key={i} className={st.layer} style={layer({ left: U(x), top: U(y), width: U(w), height: U(h), transform: `translate(${px(-22)}px, ${ty(1.2)}px) scale(${bed})`, transformOrigin: "50% 100%", zIndex: 3 })}>
          <Img src={`${Z}/gullar.webp`} className={flip ? st.flipX : undefined} />
        </div>
      ))}
      {/* pardalar — markazdan chetga ochiladi (final: yopiladi) */}
      {(() => {
        const cw = variant === "open" ? (wide ? 518.9 : 586.2) : wide ? 507.63 : 496.4;
        const ch = H + 4;
        const lx = variant === "open" ? (wide ? -118.9 : -436.25) : wide ? -77.63 : -331.4;
        const inward = variant === "open" ? (1 - o) * 180 : (1 - o) * (wide ? 110 : 50);
        return (
          <>
            <div className={st.layer} style={layer({ left: U(lx), top: U(-2), width: U(cw), height: U(ch), transform: `translateX(${U(inward)})`, zIndex: 4 })}>
              <Img src={`${Z}/parda.webp`} style={{ objectFit: "fill" }} />
            </div>
            <div className={st.layer} style={layer({ right: U(lx), top: U(-2), width: U(cw), height: U(ch), transform: `translateX(calc(${U(inward)} * -1))`, zIndex: 4 })}>
              <Img src={`${Z}/parda.webp`} className={st.flipX} style={{ objectFit: "fill" }} />
            </div>
          </>
        );
      })()}
      {/* osma gulchambar — tepadan tushadi, yengil tebranadi */}
      {(wide ? (variant === "open" ? [[-60, -152, 820, 461.5], [690, -152, 820, 461.5]] : [[-45, -115.84, 790, 444], [695, -115.84, 790, 444]]) : variant === "open" ? [[-195, -145, 780, 439]] : [[-85, -80, 560, 315]]).map(([x, y, w, h], i) => (
        <div key={i} className={st.layer} style={layer({ left: U(x), top: U(y), width: U(w), height: U(h), transform: `translate(${px(-24)}px, ${ty(1.4) + (variant === "open" ? (1 - o) * -50 : 0)}px)`, zIndex: 5 })}>
          <div className={st.sway} style={{ width: "100%", height: "100%" }}>
            <Img src={`${Z}/gulchambar.webp`} />
          </div>
        </div>
      ))}
      {variant === "open" ? (
        /* oltin ramka: ichida monogramma → ismlar */
        <div className="absolute" style={{ left: `calc(50% - ${U(wide ? 150 : 135)})`, top: U(wide ? 90 : 150), width: U(wide ? 300 : 270), height: U(wide ? 400 : 360), transform: `translate(${px(-8)}px, ${ty(0.9)}px) scale(${0.8 + o * 0.2})`, opacity: 0.2 + o * 0.8, zIndex: 6 }}>
          <div className="absolute" style={{ left: "13%", top: "21%", width: "74%", height: "70%" }}>
            <Img src={`${Z}/oval-baxmal.webp`} className={st.contain} />
          </div>
          <Img src={`${Z}/ramka.webp`} className={cx(st.contain, "absolute inset-0")} />
          <div className={st.monogram} style={{ left: 0, right: 0, top: "38%", color: "var(--gold-2)" }}>
            <span style={{ fontSize: U(wide ? 80 : 72.5), lineHeight: 0.8 }}>{d.mono[0]}</span>
            {d.mono[1] && (
              <>
                <span style={{ fontSize: U(wide ? 33.6 : 31.2), color: "var(--cream)", margin: `${U(-6)} 0` }}>&amp;</span>
                <span style={{ fontSize: U(wide ? 80 : 72.5), lineHeight: 0.8 }}>{d.mono[1]}</span>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="absolute inset-x-0 flex flex-col items-center text-center" style={{ top: U(wide ? 300 : 315.8), gap: U(6), zIndex: 6, textShadow: "0 2px 18px rgba(5,20,15,.55)", opacity: 0.3 + 0.7 * seg(p, 0.2, 0.45), transform: `translateY(${(1 - seg(p, 0.2, 0.45)) * 20}px)` }}>
          <p className={cx(st.italic, st.title)} style={{ fontSize: U(wide ? 80 : 56), color: "var(--cream)" }}>
            Sizni kutamiz
          </p>
          <p className={cx(st.serif, st.title)} style={{ fontSize: U(wide ? 40 : 28), color: "var(--gold-2)" }}>
            {d.names}
          </p>
          <p style={{ fontSize: U(15), fontWeight: 500, color: "rgba(247,243,234,.85)" }}>{[d.dots, d.city].filter(Boolean).join(" · ")}</p>
        </div>
      )}
    </section>
  );
}

/* ═════════════ 03 · Taklif  +  04 · Sana ═════════════ */
function InviteDate({ d, wide, ready }: { d: D; wide: boolean; ready: boolean }) {
  const v: V = (m, l) => U(wide ? l : m);
  const [ref, inView] = useInView<HTMLDivElement>(0.35, ready);
  const day = useCountUp(d.day, inView, 900);
  const invite = (
    <Sec ready={ready} style={{ gap: U(22), paddingTop: U(40), paddingBottom: U(70), paddingInline: wide ? 0 : U(32), width: wide ? U(520) : "100%" }}>
      <p data-a="mask" className={cx(st.italic, st.title)} style={{ fontSize: v(46, 53), color: "var(--green)" }}>
        Qadrli mehmonlar!
      </p>
      {d.message && (
        <p data-a="up" className="text-center" style={vars({ fontSize: U(17), lineHeight: 1.65, "--d": "0.2s", "--y": 20 })}>
          {d.message}
        </p>
      )}
      <div data-a="wipe" style={vars({ width: U(260), height: U(146.3), "--d": "0.4s", "--t": "1.4s" })}>
        <Img src={`${Z}/lenta.webp`} />
      </div>
      {d.hosts && (
        <p data-a="up" className={cx(st.italic, "text-center")} style={vars({ fontSize: v(24, 28), lineHeight: 1.2, color: "var(--green)", "--d": "0.5s", "--y": 20 })}>
          Hurmat bilan,
          <br />
          {d.hosts}
        </p>
      )}
    </Sec>
  );
  const date = (
    <Sec ready={ready} style={{ gap: U(26), paddingTop: U(40), paddingBottom: wide ? U(80) : U(150), paddingInline: wide ? 0 : U(24), width: wide ? U(420) : "100%" }}>
      <p data-a="mask" className={cx(st.italic, st.title)} style={{ fontSize: v(52, 46), color: "var(--green)" }}>
        Saqlab qo‘ying
      </p>
      <div ref={ref} data-a="grow" className="relative" style={vars({ width: U(300), height: U(400), "--gr": "-6deg", "--t": "1.2s", "--e": "var(--spring)" })}>
        <svg className="absolute" style={{ left: U(39), top: U(84), width: U(222), height: U(280) }} viewBox="0 0 222 280" aria-hidden>
          <ellipse cx="111" cy="140" rx="111" ry="140" fill="#FFFDF8" />
        </svg>
        <Img src={`${Z}/ramka.webp`} className={cx(st.contain, "absolute inset-0")} />
        <div className="absolute inset-x-0 flex flex-col items-center text-center" style={{ top: U(160.5) }}>
          <p style={{ fontSize: U(15), fontWeight: 500, color: "var(--soft)", marginBottom: U(-4) }}>{[d.weekday, d.time].filter(Boolean).join(" · ")}</p>
          <p className={st.serif} style={{ fontSize: U(88), fontWeight: 600, lineHeight: 1, color: "var(--green)", marginBottom: U(-4), fontVariantNumeric: "lining-nums proportional-nums" }}>
            {day.value || ""}
          </p>
          <p className={st.italic} style={{ fontSize: U(22), color: "var(--ink)" }}>
            {d.monthYear}
          </p>
        </div>
      </div>
      <TimerRow d={d} run={inView} size={{ w: 74, h: 88, fs: 36, ls: 12, r: 14, gap: 10 }} />
      <button
        type="button"
        data-a="up"
        className={st.btnLine}
        style={vars({ fontSize: U(15), padding: `${U(16)} ${U(24)}`, "--d": "0.8s", "--y": 20 })}
        onClick={() => downloadIcs({ title: d.b ? `${d.names} — to‘y` : `${d.a} — taklif`, startLocal: `${d.iso}T${d.time || "18:00"}`, location: [d.venue, d.address].filter(Boolean).join(", "), slug: (d.a || "toy").toLowerCase() })}
      >
        Kalendarga qo‘shish
      </button>
    </Sec>
  );
  return wide ? (
    <div className="flex w-full items-start justify-center" style={{ gap: U(120), paddingTop: U(60), paddingBottom: U(110) }}>
      {invite}
      {date}
    </div>
  ) : (
    <>
      {invite}
      {date}
    </>
  );
}

/* ═════════════ 05 · Kun dasturi — parda sahnasi ═════════════ */
function Program({ d, wide, ready }: { d: D; wide: boolean; ready: boolean }) {
  const v: V = (m, l) => U(wide ? l : m);
  if (!d.program.length) return null;
  const half = Math.ceil(d.program.length / 2);
  const cols = wide ? [d.program.slice(0, half), d.program.slice(half)] : [d.program];
  return (
    <Sec ready={ready} className={st.damask} style={{ paddingTop: v(150, 200), paddingBottom: v(110, 150), paddingInline: v(44, 0), gap: v(26, 40) }}>
      {/* pardalar chetdan ichkariga, gulchambar tepadan */}
      <div data-a="fly" className="absolute" style={vars({ left: v(-378.25, -152.7), top: U(-2), width: v(440.2, 412.7), height: `calc(100% + ${U(4)})`, "--fx": -60, "--fr": "0deg", "--t": "1.4s", zIndex: 1 })}>
        <Img src={`${Z}/parda.webp`} style={{ objectFit: "fill" }} />
      </div>
      <div data-a="fly" className="absolute" style={vars({ right: v(-378.25, -152.7), top: U(-2), width: v(440.2, 412.7), height: `calc(100% + ${U(4)})`, "--fx": 60, "--fr": "0deg", "--t": "1.4s", zIndex: 1 })}>
        <Img src={`${Z}/parda.webp`} className={st.flipX} style={{ objectFit: "fill" }} />
      </div>
      {(wide ? [[-40, -146.3, 780, 439], [700, -146.3, 780, 439]] : [[-125, -126.3, 640, 360.2]]).map(([x, y, w, h], i) => (
        <div key={i} data-a="drop" className="absolute" style={vars({ left: U(x), top: U(y), width: U(w), height: U(h), "--dy": -70, "--r0": "0deg", "--t": "1.3s", "--e": "var(--spring)", zIndex: 2 })}>
          <div className={st.sway} style={{ width: "100%", height: "100%" }}>
            <Img src={`${Z}/gulchambar.webp`} />
          </div>
        </div>
      ))}
      <p data-a="mask" className={cx(st.italic, st.title)} style={vars({ fontSize: v(52, 64), color: "var(--cream)", "--d": "0.4s", zIndex: 3 })}>
        Kun dasturi
      </p>
      <div className="flex w-full justify-center" style={{ gap: U(80), zIndex: 3 }}>
        {cols.map((col, ci) => (
          <div key={ci} className="flex flex-col" style={{ width: wide ? U(380) : "100%" }}>
            {col.map((it, i) => {
              const n = ci * half + i;
              return (
                <div key={n} className={st.row} style={{ gap: v(18, 22), paddingBlock: v(14, 18), position: "relative" }}>
                  <p data-a="up" className={st.serif} style={vars({ fontSize: v(34, 42), color: "var(--gold-2)", width: v(86, 110), flex: "none", "--d": `${0.5 + n * 0.12}s`, "--y": 0, transform: "translateX(-30px)" })}>
                    {it.time}
                  </p>
                  <div data-a="fade" className="flex min-w-0 flex-col" style={vars({ gap: U(2), "--d": `${0.65 + n * 0.12}s` })}>
                    <p style={{ fontSize: v(16, 18), fontWeight: 600, color: "var(--cream)" }}>{it.title}</p>
                    {it.note && <p style={{ fontSize: v(14, 15), color: "rgba(247,243,234,.7)" }}>{it.note}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Sec>
  );
}

/* ═════════════ 06 · Manzil — deraza ichidagi mini-sahna ═════════════ */
function Venue({ d, wide, ready }: { d: D; wide: boolean; ready: boolean }) {
  const v: V = (m, l) => U(wide ? l : m);
  const ptr = usePointer(wide && ready);
  const box = useRef<HTMLDivElement>(null);
  const [par, setPar] = useState(0.5);
  useScrollProgress(box, (p) => setPar(p), ready && !wide);
  const W = wide ? 420 : 300;
  const H = wide ? 532 : 380;
  const k = W / 300;
  const mx = (n: number) => (wide ? ptr.x * n : (par - 0.5) * n * 1.4);
  const my = (n: number) => (wide ? ptr.y * n * 0.6 : 0);
  const taxi = d.coords ? `https://3.redirect.appmetrica.yandex.com/route?end-lat=${d.coords.lat}&end-lon=${d.coords.lon}&appmetrica_tracking_id=1178268795219780156` : null;
  const win = (
    <div ref={box} data-a="door" className={st.window} style={vars({ width: U(W), height: U(H), flex: "none", "--t": "1s" })}>
      <div className="absolute inset-0 overflow-hidden" style={svgMask(300, 380, ogee(300, 380))}>
        <div data-a="zoom" className="absolute inset-0" style={vars({ "--z": 1.2, "--t": "1.4s" })}>
          <div className="absolute" style={{ inset: -12, transform: `translate(${mx(4)}px, ${my(4)}px)` }}>
            <Img src={`${Z}/osmon.webp`} />
          </div>
          <div className="absolute" style={{ left: U(-60 * k), top: U(140 * k), width: U(420 * k), height: U(236.4 * k), transform: `translate(${mx(10)}px, ${my(10)}px)` }}>
            <Img src={`${Z}/madrasa.webp`} />
          </div>
          <div className="absolute" style={{ left: U(-70 * k), top: U(120 * k), width: U(168.5 * k), height: U(300 * k), transform: `translate(${mx(16)}px, ${my(16)}px)` }}>
            <Img src={`${Z}/sarv.webp`} />
          </div>
          <div className="absolute" style={{ left: U(201.5 * k), top: U(120 * k), width: U(168.5 * k), height: U(300 * k), transform: `translate(${mx(16)}px, ${my(16)}px)` }}>
            <Img src={`${Z}/sarv.webp`} className={st.flipX} />
          </div>
          <div className="absolute" style={{ left: U(-80 * k), top: U(151.1 * k), width: U(460 * k), height: U(258.9 * k), transform: `translate(${mx(22)}px, ${my(22)}px)` }}>
            <Img src={`${Z}/gullar.webp`} />
          </div>
        </div>
      </div>
      <svg className="absolute" style={{ inset: `-2.11% -2.67%`, width: "105.34%", height: "104.22%", overflow: "visible" }} viewBox="0 0 316 396" preserveAspectRatio="none" aria-hidden>
        <path d={ogee(316, 396)} fill="none" stroke="#C6A15B" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
  const btns = (
    <div className="flex w-full" style={{ gap: U(10) }}>
      <a href={d.mapUrl} target="_blank" rel="noopener noreferrer" className={st.btnGreen} style={{ flex: 1, padding: `${U(16)} ${U(20)}`, fontSize: U(15) }}>
        Xaritada ochish
      </a>
      {taxi && (
        <a href={taxi} target="_blank" rel="noopener noreferrer" className={st.btnLine} style={{ flex: 1, padding: `${U(16)} ${U(20)}`, fontSize: U(15) }}>
          Taksi chaqirish
        </a>
      )}
    </div>
  );
  return (
    <Sec ready={ready} style={{ paddingTop: v(90, 140), paddingBottom: v(80, 110), paddingInline: v(24, 0) }}>
      {wide ? (
        <div className="flex items-center" style={{ gap: U(100) }}>
          {win}
          <div className="flex flex-col items-start" style={{ gap: U(22), width: U(460) }}>
            <p data-a="mask" className={st.italic} style={{ fontSize: U(64), color: "var(--green)" }}>
              Manzil
            </p>
            <p data-a="up" className={st.serif} style={vars({ fontSize: U(40), color: "var(--ink)", "--d": "0.3s", "--y": 20 })}>
              {d.venue}
            </p>
            <p data-a="up" style={vars({ fontSize: U(17), lineHeight: 1.6, color: "var(--soft)", "--d": "0.4s", "--y": 20 })}>
              {d.address}
            </p>
            <div data-a="up" className="w-full" style={vars({ "--d": "0.5s", "--y": 20 })}>
              {btns}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex w-full flex-col items-center text-center" style={{ gap: U(22) }}>
          <p data-a="mask" className={cx(st.italic, st.title)} style={{ fontSize: U(52), color: "var(--green)" }}>
            Manzil
          </p>
          {win}
          <p data-a="up" className={st.serif} style={vars({ fontSize: U(32), color: "var(--ink)", "--d": "0.3s", "--y": 20 })}>
            {d.venue}
          </p>
          <p data-a="up" style={vars({ fontSize: U(16), lineHeight: 1.55, color: "var(--soft)", maxWidth: U(320), "--d": "0.4s", "--y": 20 })}>
            {d.address}
          </p>
          <div data-a="up" className="w-full" style={vars({ "--d": "0.5s", "--y": 20 })}>
            {btns}
          </div>
        </div>
      )}
    </Sec>
  );
}

/* ═════════════ 07 · Dress-kod  +  08 · Lahzalar ═════════════ */
function Dress({ d, wide, ready }: { d: D; wide: boolean; ready: boolean }) {
  const v: V = (m, l) => U(wide ? l : m);
  if (!d.dress) return null;
  const x = d.dress;
  const k = wide ? 1.3333 : 1;
  const one = x.imgs.length === 1;
  return (
    <Sec ready={ready} style={{ paddingTop: v(70, 93), paddingBottom: v(80, 107), paddingInline: v(24, 32), gap: v(22, 29.3), width: wide ? U(520) : "100%" }}>
      <p data-a="mask" className={cx(st.italic, st.title)} style={{ fontSize: v(52, 61.3), color: "var(--green)" }}>
        Dress-kod
      </p>
      <div data-a="up" className={cx(st.dressCard, "relative w-full")} style={vars({ borderRadius: U(26 * k), padding: `${U(28 * k)} ${U(20 * k)}`, "--y": 60, "--d": "0.3s" })}>
        <div data-a="grow" className="absolute" style={vars({ right: U(-30 * k), top: U(-80 * k), width: U(150 * k), height: U(150 * k), "--gr": "20deg", "--d": "1s", transformOrigin: "100% 0" })}>
          <Img src={`${Z}/kalla.webp`} style={{ rotate: "-18deg" }} />
        </div>
        <div className="flex flex-col items-center text-center" style={{ width: U(302 * k), gap: U(16.3 * k), margin: "0 auto", fontFamily: "Jost, sans-serif" }}>
          <div className="flex flex-col items-center" style={{ gap: U(3.6 * k) }}>
            <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", color: "#8c1c2c", fontSize: U(27.13 * k), lineHeight: 1.25 }}>{x.title}</p>
            <p style={{ fontWeight: 500, color: "#2a1a17", fontSize: U(13.56 * k) }}>{x.sub}</p>
          </div>
          <div className="flex items-start" style={{ gap: U(16.3 * k) }}>
            {x.imgs.map((im, i) => (
              <div key={im.src} className="flex flex-col items-center" style={{ gap: U(5.4 * k) }}>
                <div className={st.hang} style={vars({ width: U((one ? 180 : 135.6) * k), height: U((one ? 168 : 156) * k), borderRadius: U(12.66 * k), overflow: "hidden", background: "#fff", "--d": `${0.8 + i * 0.12}s`, "--hr": i % 2 ? "-6deg" : "6deg" })}>
                  <Img src={im.src} className={one ? st.contain : undefined} />
                </div>
                <p style={{ color: "#5e5049", fontWeight: 500, fontSize: U(11.75 * k) }}>{im.label}</p>
              </div>
            ))}
          </div>
          <p style={{ color: "#5e5049", fontSize: U(13.56 * k), lineHeight: 1.55 }}>{x.note}</p>
        </div>
      </div>
    </Sec>
  );
}

function Moments({ d, wide, ready }: { d: D; wide: boolean; ready: boolean }) {
  const v: V = (m, l) => U(wide ? l : m);
  const box = useRef<HTMLDivElement>(null);
  const [par, setPar] = useState(0.5);
  useScrollProgress(box, (p) => setPar(p), ready);
  if (!d.arch && !d.storyText) return null;
  const k = wide ? 1.15 : 1;
  const arch = "M0 330V132C0 72 43.2 48 81.6 28.8C105.6 16.8 112.8 9.6 120 0C127.2 9.6 134.4 16.8 158.4 28.8C196.8 48 240 72 240 132V330H0Z";
  return (
    <Sec ready={ready} style={{ paddingTop: v(70, 93), paddingBottom: v(90, 107), paddingInline: v(24, 0), gap: v(24, 30), width: wide ? U(460) : "100%" }}>
      <p data-a="mask" className={cx(st.italic, st.title)} style={{ fontSize: v(52, 61.3), color: "var(--green)" }}>
        Bizning lahzalar
      </p>
      {d.arch && (
        <div ref={box} className="relative" style={{ width: U(342 * k), height: U((d.arch2 ? 470 : 340) * k) }}>
          <div data-a="door" className="absolute" style={vars({ left: 0, top: 0, width: U(240 * k), height: U(330 * k), filter: "drop-shadow(0 20px 20px rgba(13,26,20,.22))", translate: `0 ${(par - 0.5) * 24}px`, "--t": "1s" })}>
            <div className="absolute inset-0 overflow-hidden" style={svgMask(240, 330, arch)}>
              <Img src={d.arch} a="zoom" style={vars({ "--z": 1.2, "--t": "1.6s" })} />
            </div>
            <svg viewBox="0 0 240 330" preserveAspectRatio="none" className="absolute inset-0 size-full" style={{ overflow: "visible" }} aria-hidden>
              <path d={arch} fill="none" stroke="#FFFDF8" strokeWidth={8} vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          {d.arch2 && (
            <>
              <div data-a="fly" className="absolute" style={vars({ left: U(176 * k), top: U(186 * k), "--fx": 140, "--fr": "16deg", "--d": "0.6s", "--t": "1.3s", "--e": "var(--spring)", translate: `0 ${(par - 0.5) * -36}px`, zIndex: 2 })}>
                <div className={st.polaroid} style={{ rotate: "-6deg", padding: `${U(10 * k)} ${U(10 * k)} ${U(14 * k)}`, gap: U(8 * k) }}>
                  <div style={{ width: U(150 * k), height: U(190 * k), overflow: "hidden" }}>
                    <Img src={d.arch2} />
                  </div>
                  <p className={cx(st.italic, st.title)} style={{ fontSize: U(20 * k), color: "var(--green)" }}>
                    {d.caption}
                  </p>
                </div>
              </div>
              <div data-a="stamp" className="absolute" style={vars({ left: U(210 * k), top: U(176 * k), width: U(78 * k), height: U(78 * k), "--d": "1.1s", "--t": "0.6s", "--e": "var(--spring)", zIndex: 3 })}>
                <Img src={`${Z}/muhr.webp`} />
              </div>
            </>
          )}
        </div>
      )}
      {d.storyText && (
        <p data-a="up" className="text-center" style={vars({ fontSize: v(17, 18), lineHeight: 1.6, color: "var(--soft)", maxWidth: U(380), "--d": "0.4s", "--y": 20 })}>
          {d.storyText}
        </p>
      )}
    </Sec>
  );
}

/* ═════════════ 09 · Anketa — konvert ═════════════ */
function Rsvp({ d, wide, ready, slug, mode }: { d: D; wide: boolean; ready: boolean; slug: string; mode: InvitationSiteProps["mode"] }) {
  const v: V = (m, l) => U(wide ? l : m);
  const k = wide ? 1.3 : 1;
  const fs = (n: number) => U(n * k);
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
    if (!name.trim()) return setErr("Ismingizni yozing");
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
      if (!res.ok || !j.ok) throw new Error(j.error || "Javob yuborilmadi. Qayta urinib ko‘ring.");
      const t = token ?? j.editToken!;
      saveRsvp(slug, t, name.trim());
      setToken(t);
      setSent(status);
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sec ready={ready} id="zumrad-javob" className={st.damask} style={{ paddingTop: v(120, 160), paddingBottom: v(110, 140), paddingInline: v(24, 0), gap: v(24, 28) }}>
      <p data-a="mask" className={cx(st.italic, "text-center")} style={{ fontSize: v(50, 64), lineHeight: 0.96, color: "var(--cream)" }}>
        Javobingizni{wide ? " " : <br />}kutamiz
      </p>
      {d.rsvpUntil && (
        <p data-a="fade" style={vars({ fontSize: U(16), color: "rgba(247,243,234,.8)", "--d": "0.3s" })}>
          Iltimos, {d.rsvpUntil} bildiring
        </p>
      )}
      <form onSubmit={submit} noValidate data-a="up" className={cx(st.form, sent && st.sent)} style={vars({ width: fs(342), minHeight: sent ? fs(380) : undefined, padding: `${fs(151)} ${fs(24)} ${fs(30)}`, "--y": 90, "--d": "0.4s", "--t": "1.2s" })}>
        <div className={st.formFlap} style={{ height: fs(95.9) }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${Z}/anketa-qopqoq.webp`} alt="" className="block size-full" style={{ objectFit: "fill", borderRadius: `${fs(10)} ${fs(10)} 0 0` }} />
        </div>
        <div className={cx("absolute", sent && st.stampIn)} key={sent ? "s" : "n"} style={{ left: `calc(50% - ${fs(37)})`, top: fs(51), width: fs(74), height: fs(74) }}>
          <Img src={`${Z}/muhr.webp`} />
        </div>
        {sent && (
          <div className={st.thanks} style={{ top: fs(150), gap: fs(10), paddingInline: fs(24) }}>
            <p className={st.italic} style={{ fontSize: fs(36), color: "var(--green)", lineHeight: 1.1 }}>
              {sent === "not_coming" ? "Rahmat!" : "Rahmat! Sizni kutamiz"}
            </p>
            <p style={{ fontSize: fs(15), color: "var(--soft)", lineHeight: 1.5 }}>
              {sent === "not_coming" ? "Javobingiz uchun rahmat — sizni duolarimizda eslaymiz." : `${name.trim() || "Javobingiz"} — ${count} kishi. Javobingiz yetkazildi.`}
            </p>
            <button type="button" onClick={() => setSent(null)} style={{ color: "var(--green)", fontSize: fs(14), textDecoration: "underline", textUnderlineOffset: 3 }}>
              Javobni o‘zgartirish
            </button>
          </div>
        )}
        <div className={cx(st.formBody, "flex flex-col")} style={{ gap: fs(18) }}>
          <label className="flex flex-col" style={{ gap: fs(6) }}>
            <span style={{ color: "var(--soft)", fontSize: fs(13) }}>Ismingiz</span>
            <input className={st.field} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Dilshod va Gulnora" style={{ fontSize: fs(21), paddingBottom: fs(6) }} />
          </label>
          <div className="flex" role="radiogroup" aria-label="Javob" style={{ gap: fs(8) }}>
            {(
              [
                ["coming", "Albatta kelaman"],
                ["not_coming", "Kela olmayman"],
              ] as const
            ).map(([s, l]) => (
              <button key={s} type="button" role="radio" aria-checked={status === s} onClick={() => setStatus(s)} className={st.choice} style={{ paddingBlock: fs(13), fontSize: fs(14) }}>
                {l}
              </button>
            ))}
          </div>
          {status === "coming" && (
            <div className="flex items-center justify-between" style={{ borderBottom: "1px solid rgba(30,42,36,.22)", paddingBottom: fs(8) }}>
              <span style={{ color: "var(--soft)", fontSize: fs(13) }}>Necha kishi bo‘lasiz?</span>
              <div className="flex items-center" style={{ gap: fs(12) }}>
                <button type="button" className={st.step} disabled={count <= 1} onClick={() => setCount((c) => Math.max(1, c - 1))} aria-label="Kamaytirish" style={{ width: fs(32), height: fs(32), fontSize: fs(18) }}>
                  −
                </button>
                <span className={st.serif} style={{ fontSize: fs(21), minWidth: fs(52), textAlign: "center" }} aria-live="polite">
                  {count} kishi
                </span>
                <button type="button" className={st.step} disabled={count >= 20} onClick={() => setCount((c) => Math.min(20, c + 1))} aria-label="Ko‘paytirish" style={{ width: fs(32), height: fs(32), fontSize: fs(18) }}>
                  +
                </button>
              </div>
            </div>
          )}
          <label className="flex flex-col" style={{ gap: fs(6) }}>
            <span style={{ color: "var(--soft)", fontSize: fs(13) }}>Tilaklaringiz</span>
            <input className={st.field} value={wish} onChange={(e) => setWish(e.target.value)} maxLength={500} placeholder="Baxtingiz abadiy bo‘lsin…" style={{ fontSize: fs(21), paddingBottom: fs(6) }} />
          </label>
          {err && <p style={{ color: "#b3261e", fontSize: fs(14) }}>{err}</p>}
          <button type="submit" disabled={busy} className={st.btnGreen} style={{ paddingBlock: fs(16), fontSize: fs(15), opacity: busy ? 0.7 : 1 }}>
            {busy ? "Yuborilmoqda…" : "Javobni yuborish"}
          </button>
        </div>
      </form>
    </Sec>
  );
}

/* ═════════════ Sahifa ═════════════ */
export function ZumradSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded && mode !== "preview";
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && mode !== "preview");
  const [revealed, setRevealed] = useState(!withGate);
  const ready = revealed;
  const sfx = wide ? "l" : "m";
  const loaded = usePreload(
    [`${Z}/damask.webp`, `${Z}/qopqoq-${sfx}.webp`, `${Z}/muhr.webp`, `${Z}/paper.webp`],
    [`${Z}/ichki-qopqoq.webp`, `${Z}/chontak.webp`, `${Z}/lenta.webp`, d.polaroid, `${Z}/kalla.webp`, `${Z}/osmon.webp`, `${Z}/madrasa.webp`, `${Z}/sarv.webp`, `${Z}/gullar.webp`, `${Z}/parda.webp`, `${Z}/gulchambar.webp`, `${Z}/ramka.webp`, `${Z}/oval-baxmal.webp`, d.arch ?? "", d.arch2 ?? "", ...(d.dress ? d.dress.imgs.map((x) => x.src) : []), `${Z}/anketa-qopqoq.webp`],
    withGate,
    sfx,
  );
  const [loaderGone, setLoaderGone] = useState(!withGate);
  useEffect(() => {
    if (!loaded || loaderGone) return;
    const t = setTimeout(() => setLoaderGone(true), 900);
    return () => clearTimeout(t);
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
  const onFinal = () => {
    if (dimmed.current) return;
    dimmed.current = true;
    music.dim();
  };

  return (
    <div ref={root} className={cx(st.root, wide && st.wide)}>
      <div className={st.page} style={vars({ "--u": wide ? "calc(100cqw / 1440)" : "calc(100cqw / 390)" })}>
        <div className={st.paperBg} />
        <MusicButton m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${Z}/muhr.webp`} />}
        {withGate && (loaded ? <Gate d={d} wide={wide} onReveal={() => setRevealed(true)} onStart={() => music.play(true)} /> : <div style={{ height: "260svh", marginBottom: "-100svh", width: "100%" }} />)}
        <Collage d={d} wide={wide} ready={ready} />
        <Garden d={d} wide={wide} ready={ready} />
        <InviteDate d={d} wide={wide} ready={ready} />
        <Program d={d} wide={wide} ready={ready} />
        <Venue d={d} wide={wide} ready={ready} />
        {wide ? (
          <div className="flex w-full items-start justify-center" style={{ gap: U(110) }}>
            <Dress d={d} wide={wide} ready={ready} />
            <Moments d={d} wide={wide} ready={ready} />
          </div>
        ) : (
          <>
            <Dress d={d} wide={wide} ready={ready} />
            <Moments d={d} wide={wide} ready={ready} />
          </>
        )}
        {data.rsvpEnabled && <Rsvp d={d} wide={wide} ready={ready} slug={data.slug} mode={mode} />}
        <Garden d={d} wide={wide} ready={ready} variant="close" onSeen={onFinal} />
        <footer className={st.footer} style={{ padding: `${U(22)} 0 ${U(28)}`, gap: U(4) }}>
          <a href="https://shohnoma.uz" className={st.italic} style={{ color: "var(--gold-2)", fontSize: U(20) }}>
            Shohnoma
          </a>
          <span style={{ color: "rgba(247,243,234,.6)", fontSize: U(12) }}>shohnoma.uz orqali tayyorlandi</span>
        </footer>
      </div>
    </div>
  );
}
