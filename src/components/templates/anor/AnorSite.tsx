"use client";

import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/400-italic.css";
import "@fontsource/jost/400.css";
import "@fontsource/jost/500.css";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ceremonyLabel } from "@/lib/templates";
import { splitDate, tashkentDate } from "@/lib/display";
import { musicSrc } from "@/lib/music";
import { useLocale, useT } from "@/lib/i18n";
import type { InvitationSiteProps } from "@/components/invitation/types";
import { timerUnits } from "@/components/invitation/data";
import { fetchSavedAnswer, loadSavedRsvp, saveRsvp, type RsvpStatus } from "@/components/invitation/Rsvp";
import { useCountdown, useCountUp, useInView, usePointer, useScrollProgress, useWide } from "../shared/hooks";
import { A, ANOR_DEMO, ANOR_DEMO_RU, DRESS, calendarWords, coordsFrom, downloadIcs, programIcon, untilPhrase, weekOf, type ProgramItem, type StoryItem } from "./data";
import st from "./anor.module.css";
import { Loader, MusicButton, usePreload, useMusic } from "../shared/runtime";

/* ── Birliklar: mobil 390, laptop 1440 kanvas ── */
const U = (n: number) => `calc(var(--u) * ${n})`;
type V = (m: number, l: number) => string;
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const vars = (o: Record<string, string | number | undefined>) => o as CSSProperties;

/** Ma’lumotlarni shablon ko‘rinishiga tayyorlash (taklifnoma tilida — InvitationSite LocaleProvider’i) */
function useAnorData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO = lang === "ru" ? ANOR_DEMO_RU : ANOR_DEMO;
  const ex = (data.extra ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof ex[k] === "string" ? (ex[k] as string).trim() : "");
  const sd = splitDate(data.date);
  const [guest, setGuest] = useState("");
  useEffect(() => {
    const m = new URLSearchParams(location.search).get("m");
    setGuest(m ? m.slice(0, 80) : demo ? DEMO.guest : "");
  }, [demo, DEMO.guest]);

  return useMemo(() => {
    const cw = calendarWords(lang);
    const city = (lang === "ru" ? (data.address || "Toshkent").replace(/^\s*г\.\s*/i, "") : data.address || "Toshkent").split(/[,.]/)[0].replace(/\s+(sh|shahri|shahar)$/i, "").trim() || "Toshkent";
    const dz = DRESS[str("dressCode") || (demo ? DEMO.dressCode : "")];
    const exProgram = Array.isArray(ex.program) ? (ex.program as ProgramItem[]).filter((p) => p?.time && p?.title) : [];
    const program: ProgramItem[] = demo ? DEMO.program : exProgram.length ? exProgram : data.program;
    const exStory = Array.isArray(ex.story) ? (ex.story as StoryItem[]).filter((s) => s?.caption) : [];
    const story = demo ? DEMO.story : exStory;
    const P = data.photos ?? [];
    const stock = { couple: `${A}/foto-juftlik.webp`, meet: `${A}/foto-tanishuv.webp`, hands: `${A}/foto-taklif.webp`, venue: `${A}/foto-toyxona.webp` };
    const storyPhotos = demo ? [stock.meet, stock.hands, stock.couple] : P.slice(1, 4);
    const date = sd ? new Date(`${sd.iso}T12:00:00Z`) : null;
    return {
      // namunadagi ismlar va joy nomi tarjima qilinadi (mijoz ma’lumoti — o‘zgarishsiz)
      a: demo ? t(data.personA) : data.personA,
      b: demo && data.personB ? t(data.personB) : data.personB,
      kind: t(`${ceremonyLabel[data.ceremony]} taklifnomasi`),
      dots: sd?.dots ?? "",
      iso: sd?.iso ?? "",
      time: sd?.time ?? "",
      weekday: date ? cw.weekday[date.getUTCDay()] : "",
      month: date ? `${cw.months[date.getUTCMonth()]}${lang === "ru" ? "" : ","} ${date.getUTCFullYear()}` : "",
      week: sd ? weekOf(sd.iso) : [],
      weekNames: cw.week,
      target: data.date ? tashkentDate(data.date).getTime() : null,
      guest,
      message: demo ? DEMO.message : data.message || "",
      hosts: str("hosts") || (demo ? DEMO.hosts : ""),
      venue: demo ? t(data.venueName) : data.venueName,
      address: data.address && data.address !== "Toshkent shahri" ? data.address : demo ? DEMO.address : data.address,
      city: t(city),
      mapUrl: data.mapUrl || `https://yandex.uz/maps/?text=${encodeURIComponent([data.venueName, data.address].filter(Boolean).join(", "))}`,
      coords: coordsFrom(data.mapUrl),
      program,
      dress: dz ? { ...dz, title: t(dz.title), sub: t(dz.sub), note: str("dressNote") || t(dz.note), imgs: dz.imgs.map((x) => ({ ...x, label: t(x.label) })) } : null,
      storyText: str("storyText") || (demo ? DEMO.storyText : ""),
      story,
      storyPhotos,
      cover: P[0] ?? (demo ? stock.couple : stock.hands),
      coverRight: P[1] ?? (demo ? stock.meet : stock.venue),
      venuePhoto: stock.venue,
      final: P.length > 1 ? P[P.length - 1] : demo ? stock.hands : (P[0] ?? stock.hands),
      rsvpUntil: untilPhrase(data.rsvpDeadline, lang),
      musicUrl: musicSrc(template, data),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, data, demo, guest, lang, t]);
}
type D = ReturnType<typeof useAnorData>;

/* ── Umumiy bo‘lim o‘rami: ko‘rinishga kirganda `.in` ── */
function Sec({ children, className, style, ready, tear, threshold }: { children: ReactNode; className?: string; style?: CSSProperties; ready: boolean; tear?: boolean; threshold?: number }) {
  const [ref, inView] = useInView<HTMLElement>(threshold ?? 0.16, ready);
  return (
    <section ref={ref} className={cx(st.sec, tear && st.tear, inView && ready && st.in, className)} style={style}>
      {children}
    </section>
  );
}

/** Baxmal fon — yirtiq chekkali rasm (bo‘lim qutisidan biroz chiqadi) */
function Velvet({ name, wide, inset }: { name: string; wide: boolean; inset: [number, number] }) {
  return (
    <div className={st.velvet} style={{ top: `${-inset[0]}%`, bottom: `${-inset[1]}%`, left: wide ? "-0.86%" : "-3.13%", right: wide ? "-0.86%" : "-3.13%" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${A}/v-${name}-${wide ? "l" : "m"}.webp`} alt="" decoding="async" />
    </div>
  );
}

function Img({ src, className, style, eager, a }: { src: string; className?: string; style?: CSSProperties; eager?: boolean; a?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" draggable={false} data-a={a} loading={eager ? "eager" : "lazy"} decoding="async" className={cx(st.img, className)} style={style} />;
}

/** SVG shakl → CSS mask (o‘lchamga cho‘ziladi; Safari’da ham barqaror) */
const svgMask = (w: number, h: number, d: string): CSSProperties => {
  const url = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' preserveAspectRatio='none'><path d='${d}'/></svg>`)}")`;
  return { maskImage: url, WebkitMaskImage: url, maskSize: "100% 100%", WebkitMaskSize: "100% 100%", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat" };
};

const ARCH = (w: number, h: number, inset = 0) => {
  const W = w - inset * 2;
  const k = W / 310;
  const x0 = inset;
  const y0 = inset;
  const mid = x0 + W / 2;
  return `M${x0} ${h - inset}V${y0 + 192.2 * k}C${x0} ${y0 + 80.6 * k} ${x0 + 74.4 * k} ${y0 + 21.7 * k} ${mid} ${y0}C${x0 + 235.6 * k} ${y0 + 21.7 * k} ${x0 + W} ${y0 + 80.6 * k} ${x0 + W} ${y0 + 192.2 * k}V${h - inset}Z`;
};
/** Foto ravoq maskasi (Figma "Oq hoshiya" shakli, 270×340 nisbatda) */
const PHOTO_ARCH = (w: number, h: number) => {
  const k = w / 270;
  return `M0 ${h}V${167.4 * k}C0 ${70.2 * k} ${64.8 * k} ${18.9 * k} ${w / 2} 0C${205.2 * k} ${18.9 * k} ${w} ${70.2 * k} ${w} ${167.4 * k}V${h}Z`;
};

function PhotoArch({ src, w, h, border, left, top, z, style, zoom = 1.25 }: { src: string; w: number; h: number; border: string; left: string; top: string; z?: number; style?: CSSProperties; zoom?: number }) {
  const d = PHOTO_ARCH(w, h);
  return (
    <div className={st.photoArch} style={{ left, top, width: U(w), height: U(h), zIndex: z, ...style }}>
      <div className="absolute inset-0 overflow-hidden" style={svgMask(w, h, d)}>
        <Img src={src} eager a="zoom" style={vars({ "--z": zoom, "--t": "1.6s" })} />
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={st.frame} aria-hidden>
        <path d={d} fill="none" stroke={border} strokeWidth={7} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

/* ═════════════ 00 · Ochilish (scroll bilan) ═════════════ */
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const ease = (x: number) => 1 - Math.pow(1 - x, 3);

/**
 * Hech qanday bosish yo‘q — sahna scrollga bog‘langan (sticky, ~1.5 ekran):
 * muhr yoriladi → qo‘llar konvert bilan pastga suzib ketadi → baxmal yirtiq chekka bo‘ylab
 * yuqoridan pastga yirtilib, ostidagi muqova ochiladi. Orqaga scroll — hammasi teskari qaytadi.
 */
function Gate({ d, wide, onReveal, onStart }: { d: D; wide: boolean; onReveal: () => void; onStart: () => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const ptr = usePointer(wide);
  const t = useT();
  const lines = t("Sizga|maktub bor").split("|");
  const title = wide ? [lines.join(" ")] : lines;
  let k = 0;
  const v: V = (m, l) => U(wide ? l : m);
  const hw = wide ? 600 : 500;
  const hh = wide ? 800 : 666.667;
  const ring = wide ? [260, 204, 156] : [210, 166, 126];
  // Konvert (qo‘llar balandligining ~12% i) sarlavha bloki ostida qolishi uchun balandlik chegarasi
  const textBottom = wide ? 230 : 300;
  const handsH = `min(${U(hh)}, calc((100svh - ${U(textBottom)} + ${U(wide ? 86 : 62)}) / 0.88))`;
  const handsW = `calc(${handsH} * ${hw / hh})`;
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
      const range = Math.max(1, r.height - vh);
      target = clamp01(-r.top / range);
      // Sahna ostidagi muqova bilan baxmal pastki cheti bir chiziqda (H — sahna balandligi, 100svh):
      // muqova tepasi = r.bottom - H, baxmal pastki cheti = H - shift  →  shift = 2H - r.bottom
      // (lerp’siz — tez scroll’da ham orada tirqish ochilmaydi)
      const H = (el.firstElementChild as HTMLElement | null)?.offsetHeight || vh;
      const shift = Math.min(H, Math.max(0, 2 * H - r.bottom));
      el.style.setProperty("--gy", `${shift.toFixed(1)}px`);
      // yirtiq chekka faqat baxmal surila boshlaganda paydo bo‘ladi (birinchi ekranda pastki chet tekis)
      el.style.setProperty("--j", Math.min(1, shift / 40).toFixed(3));
      el.style.pointerEvents = shift > H * 0.6 ? "none" : "";
    };
    const apply = (p: number) => {
      const sp = ease(seg(p, 0.04, 0.3)); // muhr yoriladi
      const hp = ease(seg(p, 0.06, 0.6)); // qo‘llar pastga suziladi
      const tp = ease(seg(p, 0.03, 0.34)); // sarlavha yuqoriga eriydi
      const fp = Math.sin(Math.PI * seg(p, 0.12, 0.42)); // oltin yorqinlik
      el.style.setProperty("--s", sp.toFixed(4));
      el.style.setProperty("--h", hp.toFixed(4));
      el.style.setProperty("--t", tp.toFixed(4));
      el.style.setProperty("--f", fp.toFixed(4));
      if (!started && p > 0.02) {
        started = true;
        cb.current.onStart();
      }
      if (!revealed && p > 0.36) {
        revealed = true;
        cb.current.onReveal();
      }
    };
    // Scroll qiymatiga yumshoq yaqinlashish — telefonda ham silliq (Lenis ustidan qo‘shimcha lerp)
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

  return (
    // Ochilish sahnasi bir ekranga sig‘ishi kerak: katta/past ekranda kenglik va balandlikdan kichigiga moslanadi
    <div ref={wrap} className={st.gateWrap} style={wide ? ({ "--u": "min(calc(100cqw / 1440), calc(100svh / 900))" } as CSSProperties) : undefined}>
      <div className={st.gate} aria-label={t("Taklifnoma")}>
        <div className={st.gateBg} />
        <div className={st.cornerL} style={{ left: v(-40, -50), top: v(-40, -50), width: v(170, 380), height: v(170, 380) }}>
          <div className={st.gateCorner} style={vars({ width: "100%", height: "100%", "--cx": "-60px", "--cr": "-8deg" })}>
            <Img src={`${A}/gulchambar.webp`} eager />
          </div>
        </div>
        <div className={st.cornerR} style={{ right: v(-40, -50), top: v(-40, -50), width: v(170, 380), height: v(170, 380) }}>
          <div className={st.gateCorner} style={vars({ width: "100%", height: "100%", "--cx": "60px", "--cr": "8deg", animationDelay: "0.15s" })}>
            <Img src={`${A}/gulchambar.webp`} eager style={{ transform: "scaleX(-1)" }} />
          </div>
        </div>

        <div className={st.gateText}>
          <h1 className={cx(st.gateTitle, st.italic)} style={{ marginTop: v(84, 90), fontSize: v(66, 76) }}>
            {title.map((line, li) => (
              <span key={li} style={{ display: "block" }}>
                {[...line].map((ch, i) => (
                  <span key={i} className={st.char} style={{ animationDelay: `${0.2 + 0.03 * k++}s` }}>
                    {ch}
                  </span>
                ))}
              </span>
            ))}
          </h1>
          <p className={st.gateSub} style={{ marginTop: v(18, 14), fontSize: U(18), maxWidth: v(340, 900) }}>
            {d.guest ? t("Hurmatli {guest},", { guest: d.guest }) : t("Aziz mehmon,")}
            {wide ? " " : <br />}
            {t("ushbu maktub siz uchun")}
          </p>
        </div>

        {/* Past ekranda (masalan 360×640) qo‘llar kichrayadi — konvert sarlavha va matnni yopmasin */}
        <div className={st.handsMove} style={{ width: handsW, height: handsH, left: `calc(50% - ${handsW} / 2)`, bottom: v(-62, -86) }}>
          <div className={st.hands}>
            <Img src={`${A}/qollar.webp`} eager />
            <div
              className="absolute"
              aria-hidden
              style={{ left: `calc(49.4% - ${U(ring[2] / 2)})`, top: `calc(28% - ${U(ring[2] / 2)})`, width: U(ring[2]), height: U(ring[2]), transform: wide ? `translate(${ptr.x * 10}px, ${ptr.y * 8}px)` : undefined, transition: "transform .6s var(--ease)" }}
            >
              <div className={st.rings}>
                {ring.map((r, i) => (
                  <span key={r} className={st.ring} style={{ width: U(r), height: U(r), animationDelay: `${i * 0.5}s` }} />
                ))}
              </div>
              <span className="absolute" style={{ left: "50%", top: "50%", width: v(64, 78), height: v(64, 78), transform: "translate(-50%,-50%)" }}>
                <span className={cx(st.sealHalf, st.sealL)}>
                  <Img src={`${A}/muhr.webp`} eager />
                </span>
                <span className={cx(st.sealHalf, st.sealR)}>
                  <Img src={`${A}/muhr.webp`} eager />
                </span>
              </span>
            </div>
          </div>
          <span className={st.flash} style={{ left: "49.4%", top: "28%", width: U(260), height: U(260) }} />
        </div>
      </div>
    </div>
  );
}

/* ═════════════ 01 · Muqova ═════════════ */
function Cover({ d, wide, ready }: { d: D; wide: boolean; ready: boolean }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [par, setPar] = useState(0);
  useScrollProgress(ref, (p) => setPar(p), ready);
  const ptr = usePointer(wide && ready);
  const v: V = (m, l) => U(wide ? l : m);
  const archW = wide ? 440 : 310;
  const archH = wide ? 640 : 440;
  const names = (
    <div className="absolute flex flex-col items-center text-center" style={{ left: "50%", transform: "translateX(-50%)", top: v(88, 220), gap: v(6, 8), width: v(300, 440), zIndex: 3 }}>
      <p className={st.italic} data-a="fade" style={vars({ color: "var(--maroon)", fontSize: v(17, 22), "--d": "0.4s" })}>
        {d.kind}
      </p>
      <div className="flex flex-col items-center" style={{ lineHeight: 1.2 }}>
        <span data-a="mask" className={st.serif} style={vars({ fontSize: v(56, 84), letterSpacing: "-0.015em", marginBottom: v(-10, -14), "--d": "0.5s", "--t": "1s" })}>
          {d.a}
        </span>
        {d.b && (
          <>
            <span data-a="pop" className={st.italic} style={vars({ color: "var(--gold)", fontSize: v(41, 52), marginBottom: v(-10, -14), "--d": "0.8s", "--t": "1s" })}>
              &amp;
            </span>
            <span data-a="mask" className={st.italic} style={vars({ color: "var(--maroon)", fontSize: v(56, 84), letterSpacing: "-0.015em", "--d": "1s", "--t": "1s" })}>
              {d.b}
            </span>
          </>
        )}
      </div>
      <span data-a="fade" style={vars({ width: v(56, 70), height: 1, background: "var(--gold)", "--d": "1.2s" })} />
      <p className={st.serif} data-a="up" style={vars({ fontSize: v(22, 28), letterSpacing: "0.04em", "--d": "1.25s", "--y": 16 })}>
        {d.dots}
      </p>
      <p data-a="up" style={vars({ color: "var(--soft)", fontSize: v(15, 16), "--d": "1.35s", "--y": 16 })}>
        {[d.weekday, d.time && t("soat {time}", { time: d.time })].filter(Boolean).join(", ")}
        {d.city ? ` · ${d.city}` : ""}
      </p>
    </div>
  );
  const archSvg = (
    <svg className="absolute" style={{ left: v(40, 500), top: v(10, 20), width: U(archW), height: U(archH), overflow: "visible", zIndex: 2 }} viewBox={`0 0 ${archW} ${archH}`} aria-hidden>
      <path d={ARCH(archW, archH)} pathLength={1} className={st.archLine} />
      <path d={ARCH(archW, archH, 9)} className={st.archDots} />
      <path d={`M${archW / 2 - 7} 12L${archW / 2} 0L${archW / 2 + 7} 12L${archW / 2} 24Z`} className={st.archGem} transform={`translate(0 -12)`} />
    </svg>
  );
  return (
    <Sec ready={ready} style={{ paddingTop: v(40, 80), paddingBottom: v(60, 100) }}>
      <div ref={ref} className="relative" style={{ width: v(390, 1440), height: v(810, 700) }}>
        {archSvg}
        {names}
        {wide ? (
          <>
            <PhotoArch
              src={d.cover}
              w={330}
              h={470}
              border="#FFFDF8"
              left={U(110)}
              top={U(140)}
              style={{ transform: `translate(${ptr.x * -18}px, ${ptr.y * -12 + (par - 0.5) * -40}px)` }}
            />
            <PhotoArch
              src={d.coverRight}
              w={330}
              h={470}
              border="#FFFDF8"
              left={U(1000)}
              top={U(140)}
              style={{ transform: `translate(${ptr.x * -18}px, ${ptr.y * -12 + (par - 0.5) * -40}px)` }}
            />
          </>
        ) : (
          <div data-a="up" className="absolute" style={vars({ left: U(60), top: U(430), width: U(270), height: U(340), "--y": 80, "--d": "0.3s", "--t": "1.4s", zIndex: 3 })}>
            <PhotoArch src={d.cover} w={270} h={340} border="#FFFDF8" left="0" top="0" style={{ transform: `translateY(${(par - 0.5) * -40}px)` }} />
          </div>
        )}
        {/* Oltin bant — ustidan tushadi */}
        <div data-a="drop" className="absolute" style={vars({ left: v(130, 640), top: v(380, 590), width: v(130, 160), height: v(97.5, 120), zIndex: 4, "--d": "1.1s", "--t": "1.3s", "--e": "var(--spring)" })}>
          <div className={st.sway} style={{ width: "100%", height: "100%" }}>
            <Img src={`${A}/bant.webp`} />
          </div>
        </div>
        {/* Gulchambarlar — burchakdan o‘sib chiqadi */}
        <div data-a="grow" className="absolute" style={vars({ left: v(-16, 395), top: v(-44, -30), width: v(160, 230), height: v(160, 230), transformOrigin: "0 0", zIndex: 4, "--t": "1.4s", "--d": "0.6s", translate: wide ? `${ptr.x * 8}px ${ptr.y * 8}px` : undefined })}>
          <Img src={`${A}/gulchambar.webp`} />
        </div>
        <div
          data-a="grow"
          className="absolute"
          style={vars({ left: v(226, 825), top: v(660, 530), width: v(150, 220), height: v(150, 220), transformOrigin: "100% 100%", zIndex: 4, "--t": "1.4s", "--d": "0.9s" })}
        >
          <Img src={`${A}/gulchambar.webp`} style={{ transform: "rotate(180deg)" }} />
        </div>
      </div>
    </Sec>
  );
}

/* ═════════════ 02 · Taklif va sana ═════════════ */
function Invite({ d, wide, ready }: { d: D; wide: boolean; ready: boolean }) {
  const t = useT();
  const v: V = (m, l) => U(wide ? l : m);
  return (
    <Sec ready={ready} style={{ paddingTop: v(70, 110), paddingBottom: v(90, 110), paddingInline: v(24, 0) }}>
      <div
        data-a="blur"
        className={cx(st.card, "relative flex flex-col items-center text-center")}
        style={{ width: v(342, 720), borderRadius: v(28, 32), gap: v(18, 22), padding: `${v(142, 150)} ${v(26, 64)} ${v(36, 48)}` }}
      >
        <div data-a="drop" className="absolute" style={vars({ left: `calc(50% - ${v(135, 190)})`, top: v(-67, -111), width: v(270, 380), height: v(202.5, 285), "--d": "0.35s", "--t": "1.2s", "--e": "var(--spring)", "--r0": "0deg" })}>
          <Img src={`${A}/shox.webp`} />
        </div>
        <p data-a="mask" className={cx(st.italic, st.title)} style={vars({ color: "var(--maroon)", fontSize: v(36, 48), lineHeight: 1.25, "--d": "0.3s" })}>
          {t("Qadrli mehmonlar!")}
        </p>
        {d.message && (
          <p data-a="up" style={vars({ fontSize: v(17, 19), lineHeight: 1.6, "--d": "0.4s", "--y": 20 })}>
            {d.message}
          </p>
        )}
        {d.hosts && (
          <p data-a="up" className={st.italic} style={vars({ color: "var(--soft)", fontSize: v(18, 19), lineHeight: 1.4, "--d": "0.48s", "--y": 20 })}>
            {t("Hurmat bilan,")}
            {wide ? " " : <br />}
            {d.hosts}
          </p>
        )}
        <span data-a="fade" style={vars({ width: v(240, 420), height: 1, background: "rgba(184,146,90,.5)", "--d": "0.55s" })} />
        {d.month && (
          <p data-a="up" className={st.serif} style={vars({ fontSize: v(22, 28), "--d": "0.6s", "--y": 16 })}>
            {d.month}
          </p>
        )}
        <div className="flex w-full justify-between">
          {d.week.map((w, i) => (
            <div key={i} className={st.day} data-a="up" style={vars({ gap: v(8, 10), "--d": `${0.65 + i * 0.08}s`, "--y": 14 })}>
              <span style={{ color: "var(--soft)", fontSize: U(14) }}>{d.weekNames[i]}</span>
              <span className="relative flex items-center justify-center" style={{ width: v(40, 52), height: v(38, 48) }}>
                {w.current && (
                  <svg viewBox="0 0 40 38" className={cx(st.heart, "absolute inset-0 size-full")} style={vars({ "--d": `${0.65 + i * 0.08 + 0.2}s` })} aria-hidden>
                    <path d="M20 35.36C7.27 26.27 0 19 0 10.82 0 4.45 4.55.82 10 .82c4.55 0 8.18 2.73 10 6.36C21.82 3.55 25.45.82 30 .82c5.45 0 10 3.63 10 10 0 8.18-7.27 15.45-20 24.54Z" fill="#8C1C2C" />
                  </svg>
                )}
                <span className={cx("relative", w.current ? st.italic : st.serif)} style={{ fontSize: w.current ? v(17, 22) : v(18, 22), color: w.current ? "var(--cream)" : "var(--ink)", marginTop: w.current ? v(-4, -6) : 0 }}>
                  {w.day}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </Sec>
  );
}

/* ═════════════ 03 · Taymer ═════════════ */
function TimerCell({ value, label, wide, run, i }: { value: number; label: string; wide: boolean; run: boolean; i: number }) {
  const v: V = (m, l) => U(wide ? l : m);
  const c = useCountUp(value, run);
  const digits = String(c.value).padStart(2, "0").split("");
  return (
    <div data-a="up" className={st.timerCell} style={vars({ width: v(76, 140), height: v(96, 160), borderRadius: v(16, 22), gap: v(2, 4), "--d": `${0.5 + i * 0.1}s`, "--y": 30 })}>
      <span className={cx(st.serif, st.digits)} style={{ fontSize: v(38, 64), color: "var(--cream)", lineHeight: 1.3 }}>
        {digits.map((dg, k) => (
          // Faqat o‘zgargan raqam yangilanadi — ohista pastdan siljib keladi (sanash tugagach)
          <span key={c.done ? `${digits.length - k}-${dg}` : `${digits.length - k}`} className={c.done ? st.digit : undefined}>
            {dg}
          </span>
        ))}
      </span>
      <span style={{ color: "var(--gold-2)", fontSize: v(14, 15) }}>{label}</span>
    </div>
  );
}

function Timer({ d, wide, ready }: { d: D; wide: boolean; ready: boolean }) {
  const t = useT();
  const units = timerUnits(useLocale());
  const v: V = (m, l) => U(wide ? l : m);
  const c = useCountdown(d.target);
  const [ref, inView] = useInView<HTMLDivElement>(0.3, ready);
  if (!c) return null;
  return (
    <Sec ready={ready} tear style={{ paddingBlock: v(110, 130), paddingInline: v(24, 0), gap: v(28, 36) }}>
      <Velvet name="taymer" wide={wide} inset={wide ? [1.33, 2.61] : [1.71, 3.38]} />
      <div data-a="drop" className="absolute" style={vars({ left: `calc(50% - ${v(70, 90)})`, top: v(-34, -44), width: v(140, 180), height: v(105, 135), zIndex: 3, "--d": "0.6s", "--t": "1.2s", "--e": "var(--spring)" })}>
        <div className={st.sway} style={{ width: "100%", height: "100%" }}>
          <Img src={`${A}/bant.webp`} />
        </div>
      </div>
      {wide && (
        <>
          <div data-a="grow" className="absolute" style={vars({ left: U(-60), bottom: U(-120), width: U(300), height: U(300), transform: "rotate(90deg)", "--d": "0.5s" })}>
            <Img src={`${A}/gulchambar.webp`} />
          </div>
          <div data-a="grow" className="absolute" style={vars({ right: U(-60), top: U(-110), width: U(300), height: U(300), transform: "rotate(-90deg)", "--d": "0.6s" })}>
            <Img src={`${A}/gulchambar.webp`} />
          </div>
        </>
      )}
      <p data-a="mask" className={cx(st.italic, st.title)} style={vars({ color: "var(--cream)", fontSize: v(39, 52), lineHeight: 1.3, "--d": "0.4s" })}>
        {d.b ? t("To‘yimizgacha qoldi") : t("Bayramgacha qoldi")}
      </p>
      <div ref={ref} className="flex" style={{ gap: v(10, 20) }}>
        {(
          [
            [c.d, units[0]],
            [c.h, units[1]],
            [c.m, units[2]],
            [c.s, units[3]],
          ] as const
        ).map(([n, l], i) => (
          <TimerCell key={i} value={n} label={l} wide={wide} run={inView} i={i} />
        ))}
      </div>
      <button
        type="button"
        data-a="up"
        className={st.ghostBtn}
        style={vars({ padding: `${v(16, 18)} ${v(24, 30)}`, fontSize: v(17, 16), "--d": "0.9s", "--y": 20 })}
        onClick={() => downloadIcs({ title: d.b ? t("{names} — to‘y", { names: `${d.a} & ${d.b}` }) : `${d.a} — ${d.kind}`, startLocal: `${d.iso}T${d.time || "18:00"}`, location: [d.venue, d.address].filter(Boolean).join(", "), slug: d.a.toLowerCase() })}
      >
        {t("Kalendarga qo‘shish")}
      </button>
    </Sec>
  );
}

/* ═════════════ 04 · Manzil ═════════════ */
function Venue({ d, wide, ready }: { d: D; wide: boolean; ready: boolean }) {
  const t = useT();
  const v: V = (m, l) => U(wide ? l : m);
  const taxi = d.coords ? `https://3.redirect.appmetrica.yandex.com/route?end-lat=${d.coords.lat}&end-lon=${d.coords.lon}&appmetrica_tracking_id=1178268795219780156` : null;
  const card = (
    <div className="relative shrink-0" style={{ width: v(342, 540), height: v(300, 470) }}>
      <div data-a="drop" className="absolute" style={vars({ left: v(16, 18), top: v(20, 40), "--r0": "-12deg", "--t": "1.3s", "--e": "var(--spring)" })}>
        <div className={st.postcard} style={{ transform: "rotate(3deg)", padding: `${v(10, 14)} ${v(10, 14)} ${v(40, 56)}` }}>
          <div className="overflow-hidden" style={{ width: v(280, 460), height: v(200, 320) }}>
            <Img src={d.venuePhoto} a="zoom" style={vars({ "--z": 1.15, "--t": "1.6s" })} />
          </div>
        </div>
      </div>
      <div data-a="stamp" className="absolute" style={vars({ left: v(260, 422), top: v(-8, -12), width: v(82, 120), height: v(109.3, 160), rotate: "-9deg", "--d": "0.5s", "--t": "0.7s", "--e": "var(--spring)" })}>
        <Img src={`${A}/marka.webp`} />
      </div>
      <div data-a="stamp" className="absolute" style={vars({ left: v(6, 0), top: v(214, 340), width: v(74, 110), height: v(74, 110), "--d": "0.85s", "--t": "0.6s", "--e": "var(--spring)" })}>
        <span className={st.ripple} style={vars({ "--d": "0.85s" })} />
        <Img src={`${A}/muhr.webp`} />
      </div>
    </div>
  );
  const btns = (
    <div className="flex w-full" style={{ gap: v(10, 12), maxWidth: wide ? undefined : U(342) }}>
      <a href={d.mapUrl} target="_blank" rel="noopener noreferrer" className={st.btnMaroon} style={{ flex: wide ? undefined : 1, padding: `${v(16, 18)} ${v(18, 30)}`, fontSize: v(17, 16) }}>
        {t("Xaritada ochish")}
      </a>
      {taxi && (
        <a href={taxi} target="_blank" rel="noopener noreferrer" className={st.btnLine} style={{ flex: wide ? undefined : 1, padding: `${v(16, 18)} ${v(18, 30)}`, fontSize: v(17, 16) }}>
          {t("Taksi chaqirish")}
        </a>
      )}
    </div>
  );
  return (
    <Sec ready={ready} style={{ paddingTop: v(80, 120), paddingBottom: v(90, 120), paddingInline: v(24, 0) }}>
      {wide ? (
        <div className="flex items-center" style={{ gap: U(90) }}>
          {card}
          <div className="flex flex-col items-start" style={{ gap: U(20), width: U(440) }}>
            <p data-a="mask" className={cx(st.italic, st.title)} style={{ color: "var(--maroon)", fontSize: U(60), lineHeight: 1.25 }}>
              {t("Manzil")}
            </p>
            <p data-a="up" className={st.serif} style={vars({ fontSize: U(36), "--d": "0.3s", "--y": 20 })}>
              {d.venue}
            </p>
            <p data-a="up" style={vars({ color: "var(--soft)", fontSize: U(18), lineHeight: 1.65, "--d": "0.4s", "--y": 20 })}>
              {d.address}
            </p>
            <div data-a="up" style={vars({ "--d": "0.5s", "--y": 20 })}>
              {btns}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center" style={{ gap: U(22) }}>
          <p data-a="mask" className={cx(st.italic, st.title)} style={{ color: "var(--maroon)", fontSize: U(48), lineHeight: 1.25 }}>
            {t("Manzil")}
          </p>
          {card}
          <p data-a="up" className={st.serif} style={vars({ fontSize: U(28), "--d": "0.3s", "--y": 20 })}>
            {d.venue}
          </p>
          <p data-a="up" style={vars({ color: "var(--soft)", fontSize: U(17), lineHeight: 1.55, maxWidth: U(320), "--d": "0.4s", "--y": 20 })}>
            {d.address}
          </p>
          <div data-a="up" className="w-full" style={vars({ "--d": "0.5s", "--y": 20, display: "flex", justifyContent: "center" })}>
            {btns}
          </div>
        </div>
      )}
    </Sec>
  );
}

/* ═════════════ 05 · Dastur ═════════════ */
function Program({ d, wide, ready }: { d: D; wide: boolean; ready: boolean }) {
  const t = useT();
  const lang = useLocale();
  const v: V = (m, l) => U(wide ? l : m);
  const n = d.program.length;
  const box = useRef<HTMLDivElement>(null);
  const path = useRef<SVGPathElement>(null);
  const runner = useRef<HTMLDivElement>(null);
  const reveal = useRef<SVGPathElement>(null);
  const [reached, setReached] = useState(-1);
  const mid = useId().replace(/:/g, "");

  // Geometriya (Figma: mobil — 132px qadam, nishon 96; laptop — 200px qadam, nishon 108)
  const step = wide ? Math.min(200, 1200 / Math.max(n, 1)) : 132;
  const W = wide ? step * n : 390;
  const H = wide ? (n === 1 ? 300 : 460) : n * 132; // bitta bandda pastki qator yo‘q — bo‘sh joy qolmasin
  const pts = d.program.map((_, i) =>
    wide ? { x: step / 2 + i * step, y: i % 2 ? 275 : 185 } : { x: i % 2 ? 120 : 270, y: 66 + i * 132 },
  );
  const dPath = useMemo(() => {
    if (!pts.length) return "";
    const s = wide ? { x: 0, y: 230 } : { x: 195, y: 0 };
    const e = wide ? { x: W, y: 230 } : { x: 195, y: H };
    const all = [s, ...pts, e];
    let p = `M${s.x} ${s.y}`;
    for (let i = 1; i < all.length; i++) {
      const a = all[i - 1];
      const b = all[i];
      p += wide ? `C${(a.x + b.x) / 2} ${a.y} ${(a.x + b.x) / 2} ${b.y} ${b.x} ${b.y}` : `C${a.x} ${(a.y + b.y) / 2} ${b.x} ${(a.y + b.y) / 2} ${b.x} ${b.y}`;
    }
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wide, n, W, H]);

  useScrollProgress(
    box,
    (_, r) => {
      const vh = window.innerHeight || 800;
      // Chiziq ekran o‘rtasiga yetganda chiziladi (scroll bilan 1:1)
      const prog = wide ? Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.25))) : Math.min(1, Math.max(0, (vh * 0.7 - r.top) / r.height));
      const el = path.current;
      if (!el) return;
      const len = el.getTotalLength();
      if (reveal.current) reveal.current.style.strokeDashoffset = String(len * (1 - prog));
      const pt = el.getPointAtLength(len * prog);
      if (runner.current) {
        runner.current.style.left = `${(pt.x / W) * 100}%`;
        runner.current.style.top = `${(pt.y / H) * 100}%`;
        runner.current.style.transform = "translate(-50%, -50%)";
        runner.current.style.opacity = prog > 0.01 && prog < 0.995 ? "1" : "0";
      }
      // Nishon chiziq yetganda yonadi
      let k = -1;
      pts.forEach((p, i) => {
        const frac = wide ? p.x / W : p.y / H;
        if (prog >= frac - 0.04) k = i;
      });
      setReached((x) => (k > x ? k : x));
    },
    ready,
  );

  if (!n) return null;
  const badge = wide ? 108 : 96;
  return (
    <Sec ready={ready} style={{ paddingTop: v(70, 60), paddingBottom: v(90, 120), gap: v(30, 50) }}>
      <p data-a="mask" className={cx(st.italic, st.title)} style={{ color: "var(--maroon)", fontSize: v(48, 60), lineHeight: 1.25 }}>
        {/* ruscha — qisqa sarlavha (nowrap: «Программа торжества» mobilga sig‘maydi) */}
        {lang === "ru" ? t("Kun dasturi") : t("To‘y dasturi")}
      </p>
      <div ref={box} className="relative" style={{ width: U(W), height: U(H) }}>
        <svg className="absolute inset-0 size-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ overflow: "visible" }} aria-hidden>
          <defs>
            <mask id={`wm${mid}`} maskUnits="userSpaceOnUse" x={-20} y={-20} width={W + 40} height={H + 40}>
              <path ref={reveal} d={dPath} fill="none" stroke="#fff" strokeWidth={8} style={{ strokeDasharray: 99999, strokeDashoffset: 99999 }} />
            </mask>
          </defs>
          <path ref={path} d={dPath} className={st.wavePath} mask={`url(#wm${mid})`} />
        </svg>
        <div ref={runner} className={st.runner} style={{ width: v(22, 24), height: v(20, 22), opacity: 0, zIndex: 3 }} aria-hidden>
          <svg viewBox="0 0 40 38" className="size-full">
            <path d="M20 35.36C7.27 26.27 0 19 0 10.82 0 4.45 4.55.82 10 .82c4.55 0 8.18 2.73 10 6.36C21.82 3.55 25.45.82 30 .82c5.45 0 10 3.63 10 10 0 8.18-7.27 15.45-20 24.54Z" fill="#8C1C2C" />
          </svg>
        </div>
        {d.program.map((it, i) => {
          const p = pts[i];
          const on = reached >= i;
          const right = i % 2 === 0; // mobil: nishon o‘ngda, matn chapda
          const textStyle: CSSProperties = wide
            ? { left: U(p.x), ...(i % 2 ? { top: U(349) } : { bottom: U(H - 124) }), width: U(Math.min(step - 14, 210)), transform: "translateX(-50%)", alignItems: "center", textAlign: "center" }
            : right
              ? { right: U(390 - 214), top: U(p.y - 46), width: U(188), alignItems: "flex-end", textAlign: "right" }
              : { left: U(214), top: U(p.y - 46), width: U(160), alignItems: "flex-start", textAlign: "left" };
          return (
            <div key={i}>
              <div className={cx(st.badge, on && st.on)} style={{ left: U(p.x - badge / 2), top: U(p.y - badge / 2), width: U(badge), height: U(badge), zIndex: 2 }}>
                <Img src={programIcon(it, i)} className={st.contain} style={{ position: "absolute", inset: U(wide ? 8 : 7), width: "auto", height: "auto", objectPosition: "bottom" }} />
              </div>
              <div className={cx(st.event, on && st.on)} style={vars({ ...textStyle, gap: U(2), "--x": wide ? 0 : right ? -40 : 40, transitionDelay: "0.15s" } as Record<string, string | number>)}>
                <span className={st.italic} style={{ color: "var(--maroon)", fontSize: v(39, 36), lineHeight: 1.25 }}>
                  {it.time}
                </span>
                <span className={st.clamp2} style={{ fontWeight: 500, fontSize: U(17), lineHeight: 1.3 }}>{it.title}</span>
                {it.note && <span className={st.clamp2} style={{ color: "var(--soft)", fontSize: U(14), lineHeight: 1.3 }}>{it.note}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </Sec>
  );
}

/* ═════════════ 06 · Dress-kod (ixtiyoriy) ═════════════ */
function Dress({ d, wide, ready }: { d: D; wide: boolean; ready: boolean }) {
  const t = useT();
  const v: V = (m, l) => U(wide ? l : m);
  if (!d.dress) return null;
  const x = d.dress;
  const k = wide ? 1.7222 : 1; // laptop kartasi mobilnikidan 1.72 baravar katta (Figma)
  const one = x.imgs.length === 1;
  return (
    <Sec ready={ready} tear style={{ paddingBlock: v(110, 130), paddingInline: v(24, 0), gap: v(22, 30) }}>
      <Velvet name="dress" wide={wide} inset={wide ? [0.85, 1.66] : [1.23, 2.39]} />
      {wide && (
        <>
          <div data-a="grow" className="absolute" style={vars({ left: U(-40), top: U(20), width: U(300), height: U(300), transformOrigin: "0 0", "--d": "0.5s" })}>
            <Img src={`${A}/gulchambar.webp`} />
          </div>
          <div data-a="grow" className="absolute" style={vars({ right: U(-40), top: U(20), width: U(300), height: U(300), transformOrigin: "100% 0", "--d": "0.6s" })}>
            <Img src={`${A}/gulchambar.webp`} style={{ transform: "scaleX(-1)" }} />
          </div>
        </>
      )}
      <p data-a="mask" className={cx(st.italic, st.title)} style={vars({ color: "var(--cream)", fontSize: v(48, 60), lineHeight: 1.25, "--d": "0.4s" })}>
        {t("Dress-kod")}
      </p>
      <div data-a="up" className={st.whiteCard} style={vars({ width: wide ? undefined : "100%", borderRadius: v(28, 32), padding: `${v(30, 44)} ${v(20, 60)}`, "--y": 80, "--t": "1.2s", "--d": "0.5s" })}>
        <div className="flex flex-col items-center text-center" style={{ width: U(302 * k), gap: U(16.3 * k), margin: "0 auto" }}>
          <div className="flex flex-col items-center" style={{ gap: U(3.6 * k) }}>
            <p className={st.italic} style={{ color: "var(--maroon)", fontSize: U(27.13 * k), lineHeight: 1.25 }}>
              {x.title}
            </p>
            <p style={{ fontWeight: 500, fontSize: U(13.56 * k) }}>{x.sub}</p>
          </div>
          <div className="flex items-start" style={{ gap: U(16.3 * k) }}>
            {x.imgs.map((im, i) => (
              <div key={im.src} className="flex flex-col items-center" style={{ gap: U(5.4 * k) }}>
                <div className={st.hang} style={vars({ width: U((one ? 180 : 135.6) * k), height: U((one ? 168 : 156) * k), borderRadius: U(12.66 * k), overflow: "hidden", background: "#fff", "--d": `${0.9 + i * 0.12}s`, "--hr": i % 2 ? "-6deg" : "6deg" })}>
                  <Img src={im.src} className={one ? st.contain : undefined} />
                </div>
                <p style={{ color: "var(--soft)", fontWeight: 500, fontSize: U(11.75 * k) }}>{im.label}</p>
              </div>
            ))}
          </div>
          <p style={{ color: "var(--soft)", fontSize: U(13.56 * k), lineHeight: 1.55 }}>{x.note}</p>
        </div>
      </div>
    </Sec>
  );
}

/* ═════════════ 07 · Hikoyamiz (ixtiyoriy) ═════════════ */
function Story({ d, wide, ready }: { d: D; wide: boolean; ready: boolean }) {
  const t = useT();
  const v: V = (m, l) => U(wide ? l : m);
  const box = useRef<HTMLDivElement>(null);
  const [par, setPar] = useState(0.5);
  useScrollProgress(box, (p) => setPar(p), ready);
  const photos = d.storyPhotos.slice(0, 3);
  if (!photos.length && !d.storyText) return null;
  const cap = (i: number) => {
    const s = d.story[i];
    return s ? [s.year, s.caption].filter(Boolean).join(" · ") : "";
  };
  // Figma joylashuvi: mobil — 2 yuqorida, 1 pastda; laptop — uchtasi qatorda (o‘rtadagi — eng katta)
  const slots = wide
    ? [
        { left: 0, top: 30, w: 280, h: 330, r: 5, speed: 0.6, fx: -260, fr: -20 },
        { left: 400, top: -8, w: 300, h: 350, r: -1.5, speed: 0.9, fx: 0, fr: 12 },
        { left: 770, top: 13, w: 280, h: 330, r: -5, speed: 1.2, fx: 260, fr: 20 },
      ]
    : [
        { left: -4, top: 6, w: 150, h: 180, r: -6, speed: 0.6, fx: -200, fr: -20 },
        { left: 158, top: 0, w: 150, h: 180, r: 5, speed: 0.9, fx: 200, fr: 18 },
        { left: 70, top: 292, w: 200, h: 230, r: -2, speed: 1.2, fx: 0, fr: 10 },
      ];
  // Figma tartibi: laptopda o‘rtada "Nikoh" (3-surat), mobilda pastda — 3-surat
  const order = wide ? [0, 2, 1] : [0, 1, 2];
  const used = order.filter((i) => photos[i]);
  const boxH = wide ? 440 : photos.length > 2 ? 600 : photos.length ? 270 : 0;
  return (
    <Sec ready={ready} style={{ paddingTop: v(80, 120), paddingBottom: v(80, 110), paddingInline: v(24, 0), gap: v(20, 40) }}>
      <p data-a="mask" className={cx(st.italic, st.title)} style={{ color: "var(--maroon)", fontSize: v(44, 60), lineHeight: 1.25 }}>
        {t("Bizning hikoyamiz")}
      </p>
      {photos.length > 0 && (
        <div ref={box} className="relative" style={{ width: v(342, 1100), height: U(boxH) }}>
          {used.map((pi, si) => {
            const s = slots[wide ? si : pi];
            const shift = (par - 0.5) * -60 * s.speed;
            return (
              <div
                key={pi}
                data-a="fly"
                className="absolute"
                style={vars({ left: U(s.left), top: U(s.top), "--fx": s.fx, "--fy": -180, "--fr": `${s.fr}deg`, "--d": `${0.25 + si * 0.2}s`, "--t": "1.3s", "--e": "var(--spring)", translate: `0 ${shift}px` })}
              >
                <div className={st.polaroid} style={{ rotate: `${s.r}deg`, padding: `${v(10, 14)} ${v(10, 14)} ${v(14, 18)}`, gap: v(10, 12) }}>
                  <div style={{ width: U(s.w), height: U(s.h), overflow: "hidden" }}>
                    <Img src={photos[pi]} />
                  </div>
                  {cap(pi) && (
                    <p className={st.italic} style={{ fontSize: v(17, 20), whiteSpace: "nowrap" }}>
                      {cap(pi)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {photos.length > 2 && (
            <div data-a="stamp" className="absolute" style={vars({ left: v(236, 660), top: v(292, -18), width: v(64, 80), height: v(64, 80), "--d": "1.1s", "--t": "0.6s", "--e": "var(--spring)", zIndex: 3 })}>
              <span className={st.ripple} style={vars({ "--d": "1.1s" })} />
              <Img src={`${A}/muhr.webp`} />
            </div>
          )}
        </div>
      )}
      {d.storyText && (
        <p data-a="up" className="text-center" style={vars({ color: "var(--soft)", fontSize: v(17, 19), lineHeight: 1.6, maxWidth: v(342, 620), "--d": "0.5s", "--y": 20 })}>
          {d.storyText}
        </p>
      )}
    </Sec>
  );
}

/* ═════════════ 08 · Javob — chipta ═════════════ */
function Rsvp({ d, wide, ready, slug, mode }: { d: D; wide: boolean; ready: boolean; slug: string; mode: InvitationSiteProps["mode"] }) {
  const v: V = (m, l) => U(wide ? l : m);
  const k = wide ? 1.45 : 1; // laptop chiptasi 1.45 baravar (Figma 495.9 / 342)
  const t = useT();
  const ruLang = useLocale() === "ru";
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

  const fs = (n: number) => U(n * k);
  return (
    <Sec ready={ready} tear style={{ paddingBlock: v(110, 130), paddingInline: v(24, 0), gap: v(22, 30) }}>
      <Velvet name="javob" wide={wide} inset={wide ? [0.77, 1.5] : [1.09, 2.14]} />
      <div className="flex flex-col items-center text-center" style={{ gap: v(10, 14) }}>
        <p data-a="mask" className={cx(st.italic, st.title)} style={vars({ color: "var(--cream)", fontSize: v(ruLang ? 34 : 39, 56), lineHeight: 1.25, "--d": "0.4s" })}>
          {t("Javobingizni kutamiz")}
        </p>
        {d.rsvpUntil && (
          <p data-a="fade" style={vars({ color: "rgba(251,246,238,.8)", fontSize: v(17, 18), "--d": "0.6s" })}>
            {t("Iltimos, {date} bildiring", { date: d.rsvpUntil })}
          </p>
        )}
      </div>
      <form
        onSubmit={submit}
        noValidate
        data-a="up"
        className={cx(st.ticket, sent && st.sent)}
        style={vars({ width: fs(342), marginTop: v(18, 40), "--y": 120, "--t": "1.4s", "--e": "var(--spring)", "--d": "0.5s" })}
      >
        <div data-a="drop" className="absolute" style={vars({ right: fs(-36), top: fs(-80), width: fs(120), height: fs(90), zIndex: 3, rotate: "-14deg", "--d": "1.1s", "--e": "var(--spring)" })}>
          <div className={st.sway} style={{ width: "100%", height: "100%" }}>
            <Img src={`${A}/bant.webp`} />
          </div>
        </div>
        <div className={st.ticketTop} style={{ padding: `${fs(34)} ${fs(26)} ${fs(26)}` }}>
          {sent ? (
            <div className={cx(st.thanks, "flex flex-col items-center text-center")} style={{ gap: fs(10), paddingBlock: fs(26) }}>
              <div className={st.stampIn} style={{ width: fs(76), height: fs(76) }}>
                <Img src={`${A}/muhr.webp`} />
              </div>
              <p className={st.italic} style={{ color: "var(--maroon)", fontSize: fs(34), lineHeight: 1.2 }}>
                {sent === "not_coming" ? t("Rahmat!") : t("Rahmat! Sizni kutamiz")}
              </p>
              <p style={{ color: "var(--soft)", fontSize: fs(15), lineHeight: 1.5 }}>
                {sent === "not_coming"
                  ? t("Javobingiz uchun rahmat — sizni duolarimizda eslaymiz.")
                  : t(d.b ? "{name} — {count} kishi. Javobingiz kelin-kuyovga yetkazildi." : "{name} — {count} kishi. Javobingiz egasiga yetkazildi.", { name: name.trim() || t("Javobingiz"), count })}
              </p>
              <button type="button" onClick={() => setSent(null)} style={{ color: "var(--maroon)", fontSize: fs(14), textDecoration: "underline", textUnderlineOffset: 3, marginTop: fs(4) }}>
                {t("Javobni o‘zgartirish")}
              </button>
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: fs(18) }}>
              <label className="flex flex-col" style={{ gap: fs(6) }}>
                <span style={{ color: "var(--soft)", fontSize: fs(14) }}>{t("Ismingiz")}</span>
                <input className={st.field} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={t("Dilshod va Gulnora")} style={{ fontSize: fs(19), paddingBottom: fs(6) }} />
              </label>
              <div className="flex" role="radiogroup" aria-label={t("Javob")} style={{ gap: fs(8) }}>
                {(
                  [
                    ["coming", "Albatta kelaman"],
                    ["not_coming", "Kela olmayman"],
                  ] as const
                ).map(([s, l]) => (
                  <button key={s} type="button" role="radio" aria-checked={status === s} onClick={() => setStatus(s)} className={st.choice} style={{ paddingBlock: fs(13), fontSize: fs(15) }}>
                    {t(l)}
                  </button>
                ))}
              </div>
              {status === "coming" && (
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: fs(17) }}>{t("Necha kishi bo‘lasiz?")}</span>
                  <div className="flex items-center" style={{ gap: fs(14) }}>
                    <button type="button" className={st.step} disabled={count <= 1} onClick={() => setCount((c) => Math.max(1, c - 1))} aria-label={t("Kamaytirish")} style={{ width: fs(36), height: fs(36), fontSize: fs(20) }}>
                      −
                    </button>
                    <span className={st.serif} style={{ color: "var(--maroon)", fontSize: fs(20), minWidth: fs(16), textAlign: "center" }} aria-live="polite">
                      {count}
                    </span>
                    <button type="button" className={st.step} disabled={count >= 20} onClick={() => setCount((c) => Math.min(20, c + 1))} aria-label={t("Ko‘paytirish")} style={{ width: fs(36), height: fs(36), fontSize: fs(20) }}>
                      +
                    </button>
                  </div>
                </div>
              )}
              <label className="flex flex-col" style={{ gap: fs(6) }}>
                <span style={{ color: "var(--soft)", fontSize: fs(14) }}>{t("Tilaklaringiz")}</span>
                <input className={st.field} value={wish} onChange={(e) => setWish(e.target.value)} maxLength={500} placeholder={t("Baxtingiz abadiy bo‘lsin…")} style={{ fontSize: fs(19), paddingBottom: fs(6) }} />
              </label>
              {err && <p style={{ color: "#b3261e", fontSize: fs(14) }}>{err}</p>}
            </div>
          )}
          <span className={st.perf} />
        </div>
        <div className={st.ticketBottom} style={{ padding: `${fs(18)} ${fs(26)} ${fs(30)}` }}>
          <button type="submit" disabled={busy} className={cx(st.btnMaroon, "w-full")} style={{ paddingBlock: fs(17), fontSize: fs(17), opacity: busy ? 0.7 : 1 }}>
            {busy ? t("Yuborilmoqda…") : t("Javobni yuborish")}
          </button>
        </div>
      </form>
    </Sec>
  );
}

/* ═════════════ 09 · Final ═════════════ */
const SEEDS = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2 + (i % 3) * 0.3;
  const r = 70 + (i % 4) * 26;
  return { sx: `${Math.cos(a) * r}px`, sy: `${Math.sin(a) * r - 30}px`, sr: `${(i % 2 ? 1 : -1) * (90 + i * 20)}deg`, s: 6 + (i % 3) * 2, d: `${1.2 + (i % 5) * 0.04}s` };
});

function Final({ d, wide, ready, onSeen }: { d: D; wide: boolean; ready: boolean; onSeen: () => void }) {
  const t = useT();
  const v: V = (m, l) => U(wide ? l : m);
  const k = wide ? 1.45 : 1;
  const [ref, inView] = useInView<HTMLDivElement>(0.4, ready);
  useEffect(() => {
    if (inView) onSeen();
  }, [inView, onSeen]);
  const fs = (n: number) => U(n * k);
  return (
    <Sec ready={ready} tear style={{ paddingTop: v(110, 150), paddingBottom: v(80, 110), paddingInline: v(24, 0), gap: v(16, 18) }}>
      <Velvet name="final" wide={wide} inset={wide ? [0.79, 1.55] : [1.12, 2.15]} />
      <div ref={ref} className="relative" style={{ width: fs(342), height: fs(400) }}>
        <div data-a="door" className="absolute" style={vars({ left: fs(46), top: fs(20), width: fs(250), height: fs(330), "--d": "0.3s" })}>
          <div className="absolute inset-0 overflow-hidden" style={svgMask(250, 330, "M0 330V155C0 65 60 17.5 125 0C190 17.5 250 65 250 155V330H0Z")}>
            <Img src={d.final} a="zoom" style={vars({ "--z": 1.3, "--t": "1.6s", "--d": "0.3s" })} />
          </div>
        </div>
        <svg viewBox="0 0 270 350" preserveAspectRatio="none" className="absolute" style={{ left: fs(36), top: fs(10), width: fs(270), height: fs(350), overflow: "visible" }} aria-hidden>
          <path d="M0 350V167.4C0 70.2 64.8 18.9 135 0C205.2 18.9 270 70.2 270 167.4V350H0Z" fill="none" stroke="#E3C68E" vectorEffect="non-scaling-stroke" pathLength={1} className={st.archLine} style={{ fill: "none" }} />
        </svg>
        <div data-a="grow" className="absolute" style={vars({ left: fs(-44), top: fs(-50), width: fs(150), height: fs(150), transformOrigin: "0 0", "--d": "0.7s", "--t": "1.4s" })}>
          <Img src={`${A}/gulchambar.webp`} />
        </div>
        <div data-a="grow" className="absolute" style={vars({ left: fs(236), top: fs(-50), width: fs(150), height: fs(150), transformOrigin: "100% 0", "--d": "0.8s", "--t": "1.4s" })}>
          <Img src={`${A}/gulchambar.webp`} style={{ transform: "scaleX(-1)" }} />
        </div>
        <div data-a="stamp" className="absolute" style={vars({ left: fs(131), top: fs(306), width: fs(80), height: fs(80), "--d": "1.1s", "--t": "0.6s", "--e": "var(--spring)", zIndex: 3 })}>
          <span className={st.ripple} style={vars({ "--d": "1.1s" })} />
          <Img src={`${A}/muhr.webp`} />
          {SEEDS.map((s, i) => (
            <span key={i} className={st.seed} style={vars({ left: "50%", top: "50%", width: s.s, height: s.s * 1.25, "--sx": s.sx, "--sy": s.sy, "--sr": s.sr, "--d": s.d })} />
          ))}
        </div>
      </div>
      <p data-a="wipe" className={cx(st.italic, st.title)} style={vars({ color: "var(--cream)", fontSize: v(46, 72), lineHeight: 1.25, "--d": "1.3s" })}>
        {t("Sizni kutamiz")}
      </p>
      <p data-a="up" className={st.serif} style={vars({ color: "var(--gold-2)", fontSize: v(26, 36), "--d": "1.6s", "--y": 16 })}>
        {d.b ? `${d.a} & ${d.b}` : d.a}
      </p>
      <p data-a="up" style={vars({ color: "rgba(251,246,238,.7)", fontSize: v(15, 16), "--d": "1.7s", "--y": 16 })}>
        {[d.dots, d.city].filter(Boolean).join(" · ")}
      </p>
    </Sec>
  );
}

/* ═════════════ Sahifa ═════════════ */
export function AnorSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useAnorData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const [revealed, setRevealed] = useState(!withGate);
  const ready = revealed;
  const sfx = wide ? "l" : "m";
  const loaded = usePreload(
    [`${A}/v-ochilish-${sfx}.webp`, `${A}/qollar.webp`, `${A}/muhr.webp`, `${A}/gulchambar.webp`, `${A}/paper.webp`],
    [
      d.cover,
      wide ? d.coverRight : "",
      `${A}/bant.webp`,
      `${A}/shox.webp`,
      `${A}/v-taymer-${sfx}.webp`,
      d.venuePhoto,
      `${A}/marka.webp`,
      ...d.program.map((it, i) => programIcon(it, i)),
      ...(d.dress ? [`${A}/v-dress-${sfx}.webp`, ...d.dress.imgs.map((x) => x.src)] : []),
      ...d.storyPhotos,
      `${A}/v-javob-${sfx}.webp`,
      `${A}/v-final-${sfx}.webp`,
      d.final,
    ],
    withGate,
    sfx,
  );
  const [loaderGone, setLoaderGone] = useState(!withGate);
  useEffect(() => {
    if (!loaded || loaderGone) return;
    const t = setTimeout(() => setLoaderGone(true), 900);
    return () => clearTimeout(t);
  }, [loaded, loaderGone]);
  // Yuklanguncha sahifa surilmaydi
  useEffect(() => {
    if (loaded || !withGate) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [loaded, withGate]);

  // Brauzer musiqani faqat foydalanuvchi teginishidan keyin chaladi — birinchi teginish/tugma bosilishida yoqamiz
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

  return (
    <div ref={root} className={cx(st.root, wide && st.wide)}>
      <div className={st.page} style={vars({ "--u": wide ? "calc(100cqw / 1440)" : "calc(100cqw / 390)" })}>
        <div className={st.paperBg} />
        <MusicButton m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${A}/muhr.webp`} />}
        {withGate && (loaded ? <Gate d={d} wide={wide} onReveal={() => setRevealed(true)} onStart={() => music.play(true)} /> : <div style={{ height: "250svh", marginBottom: "-100svh", width: "100%" }} />)}
        <Cover d={d} wide={wide} ready={ready} />
        <Invite d={d} wide={wide} ready={ready} />
        <Timer d={d} wide={wide} ready={ready} />
        <Venue d={d} wide={wide} ready={ready} />
        <Program d={d} wide={wide} ready={ready} />
        <Dress d={d} wide={wide} ready={ready} />
        <Story d={d} wide={wide} ready={ready} />
        {data.rsvpEnabled && <Rsvp d={d} wide={wide} ready={ready} slug={data.slug} mode={mode} />}
        <Final d={d} wide={wide} ready={ready} onSeen={music.dim} />
        <footer className={st.footer} style={{ padding: `${U(wide ? 26 : 22)} 0 ${U(wide ? 32 : 28)}`, gap: U(4) }}>
          <a href="https://shohnoma.uz" className={st.italic} style={{ color: "var(--gold-2)", fontSize: U(wide ? 20 : 18) }}>
            Shohnoma
          </a>
          <span style={{ color: "rgba(251,246,238,.6)", fontSize: U(wide ? 13 : 14) }}>{t("shohnoma.uz orqali tayyorlandi")}</span>
        </footer>
      </div>
    </div>
  );
}
