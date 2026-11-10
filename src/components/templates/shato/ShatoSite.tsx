"use client";

import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource/cormorant-garamond/600.css";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { splitDate, tashkentDate } from "@/lib/display";
import { musicSrc } from "@/lib/music";
import { useLocale, useT } from "@/lib/i18n";
import type { InvitationSiteProps } from "@/components/invitation/types";
import { fetchSavedAnswer, loadSavedRsvp, saveRsvp, type RsvpStatus } from "@/components/invitation/Rsvp";
import { timerUnits } from "@/components/invitation/data";
import { useCountdown, useCountUp, useInView, useScrollProgress, useWide } from "../shared/hooks";
import { Loader, MusicButton, usePreload, useMusic } from "../shared/runtime";
import { DRESS, calendarWords, untilPhrase, type ProgramItem } from "../anor/data";
import { P, SHATO_DEMO, SHATO_DEMO_EN, SHATO_DEMO_RU, monthGrid, programIcon, telHref, tgHref } from "./data";
import st from "./shato.module.css";

const U = (n: number) => `calc(var(--u) * ${n})`;
type V = (m: number, l: number) => string;
type Box = [number, number, number, number];
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
  const DEMO = lang === "ru" ? SHATO_DEMO_RU : lang === "en" ? SHATO_DEMO_EN : SHATO_DEMO;
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
    const dz = DRESS[str("dressCode") || (demo ? DEMO.dressCode : "")];
    // namunadagi ismlar tarjima qilinadi (mijoz ma’lumoti — o‘zgarishsiz)
    const a = (demo ? t(data.personA) : data.personA) || "";
    const b = demo && data.personB ? t(data.personB) : data.personB;
    const time = sd?.time ?? "";
    const program = (demo ? DEMO.program : exProgram.length ? exProgram : (data.program as ProgramItem[])) as ProgramItem[];
    const y = date ? date.getUTCFullYear() : 0;
    const m = date ? date.getUTCMonth() : 0;
    const day = date ? date.getUTCDate() : 0;
    const dd = String(day).padStart(2, "0");
    const mm = String(m + 1).padStart(2, "0");
    const weekday = date ? cw.weekday[date.getUTCDay()] : "";
    const ini = (s: string | null | undefined) => ([...(s ?? "").trim()][0] ?? "").toUpperCase();
    const message = (demo ? DEMO.message : data.message || "").replace(/^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Дорогие гости!|Dear guests!)\s*/, "").trim();
    const names = b ? `${a} & ${b}` : a;
    const tel = str("phone") || (demo ? DEMO.phone : "");
    const tg = str("telegram") || (demo ? DEMO.telegram : "");
    return {
      a,
      b,
      names,
      mono: b ? `${ini(a)} & ${ini(b)}` : ini(a),
      dots: sd?.dots ?? "",
      iso: sd?.iso ?? "",
      time,
      hasDate: !!date,
      year: y,
      month: m,
      day,
      monthName: date ? cw.months[m] : "",
      week: cw.week,
      grid: date ? monthGrid(y, m) : [],
      when: date ? (time ? t("{day}, soat {time} da", { day: weekday, time }) : weekday) : "",
      finalLine: [names, date ? `${dd}.${mm}.${y}` : ""].filter(Boolean).join(" · "),
      target: data.date ? tashkentDate(data.date).getTime() : null,
      guest,
      paragraphs: message ? message.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean) : [],
      venueTitle: (demo ? DEMO.venueTitle : data.venueName) || "",
      address: (demo ? DEMO.address : data.address) || "",
      mapUrl: data.mapUrl || `https://yandex.uz/maps/?text=${encodeURIComponent([data.venueName, data.address].filter(Boolean).join(", "))}`,
      program,
      dress: dz ? { ...dz, title: t(dz.title), sub: t(dz.sub), note: str("dressNote") || t(dz.note), imgs: dz.imgs.map((x) => ({ ...x, label: t(x.label) })) } : null,
      photo1: demo ? `${P}/juftlik-piknik.webp` : (photos[0] ?? null),
      photo2: demo ? `${P}/juftlik-yolak.webp` : (photos[1] ?? null),
      quote: str("quote") || (demo ? DEMO.quote : ""),
      gifts: str("gifts") || (demo ? DEMO.gifts : ""),
      flowers: str("flowers") || (demo ? DEMO.flowers : ""),
      contact: str("contact") || (demo ? DEMO.contact : ""),
      tel: tel ? telHref(tel) : null,
      tg: tg ? tgHref(tg) : null,
      rsvpUntil: untilPhrase(data.rsvpDeadline, lang).replace(/(\d) /g, "$1\u00a0").replace(/^(до|by) /, "$1\u00a0"),
      musicUrl: musicSrc(template, data),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, data, demo, guest, lang, t]);
}
type D = ReturnType<typeof useData>;

/** Bo‘lim: ekranga kirganda `in`; scroll jarayoni `--p` (0…1) — gulbarg va qatlam parallaksi uchun */
function Sec({ children, className, style, ready, threshold, id, z, onP }: { children: ReactNode; className?: string; style?: CSSProperties; ready: boolean; threshold?: number; id?: string; z: number; onP?: (p: number, r: DOMRect) => void }) {
  const [ref, inView] = useInView<HTMLElement>(threshold ?? 0.15, ready);
  const cb = useRef(onP);
  cb.current = onP;
  useScrollProgress(
    ref,
    (p, r) => {
      ref.current?.style.setProperty("--p", p.toFixed(4));
      cb.current?.(p, r);
    },
    ready,
  );
  return (
    <section ref={ref} id={id} className={cx(st.sec, inView && ready && st.in, className)} style={{ zIndex: z, ...style }}>
      {children}
    </section>
  );
}

/**
 * Appear: har bir [data-a] element (va so‘z) o‘zi ekranga kirganda `data-in` oladi — butun bo‘lim birdan emas.
 * Yuqorida qolganlar (sahifa o‘rtasidan qayta yuklanganda) darrov ko‘rsatiladi. Keyin qo‘shilgan elementlar ham kuzatiladi.
 */
function useReveal(root: React.RefObject<HTMLDivElement | null>, ready: boolean, all: boolean) {
  useEffect(() => {
    const el = root.current;
    if (!el || !ready) return;
    const SEL = "[data-a]:not([data-in]),[data-w]:not([data-in])";
    if (all) {
      el.querySelectorAll<HTMLElement>(SEL).forEach((x) => x.setAttribute("data-in", ""));
      return;
    }
    // Scroll bo‘yicha joylashuv tekshiruvi (IntersectionObserver ota elementning kesilishi tufayli chetdagi bezaklarni o‘tkazib yuborardi)
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
      list = Array.from(el.querySelectorAll<HTMLElement>(SEL));
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

function Img({ src, className, style, eager, a, contain }: { src: string; className?: string; style?: CSSProperties; eager?: boolean; a?: string; contain?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" draggable={false} data-a={a} loading={eager ? "eager" : "lazy"} decoding="async" className={cx(st.img, contain && st.contain, className)} style={style} />;
}

/** Absolyut joylashgan qatlam (Figma koordinatalari); flip — gorizontal ko‘zgu */
function L({ r, children, className, style, a, z, flip }: { r: Box; children?: ReactNode; className?: string; style?: CSSProperties; a?: string; z?: number; flip?: boolean }) {
  const [x, y, w, h] = r;
  return (
    <div data-a={a} className={cx("absolute", className)} style={{ left: U(x), top: U(y), width: U(w), height: U(h), zIndex: z, pointerEvents: "none", ...style }}>
      {flip ? <div className={cx("size-full", st.flipX)}>{children}</div> : children}
    </div>
  );
}
const Pic = ({ src, r, flip, z, a, style, className }: { src: string; r: Box; flip?: boolean; z?: number; a?: string; style?: CSSProperties; className?: string }) => (
  <L r={r} flip={flip} z={z} a={a} style={style} className={className}>
    <Img src={src} />
  </L>
);

/** Gulbarg: markaz (cx, cy), eni w, burchak rot; scroll bilan sekin suriladi (tebranmaydi) */
function Petal({ c, k, sp = 50, spin = 40, z = 3, bottom }: { c: [number, number, number, number]; k: number; sp?: number; spin?: number; z?: number; bottom?: boolean }) {
  const [x, y, w, rot] = c;
  return (
    <div
      className={st.petal}
      aria-hidden
      style={vars({ left: U(x - w / 2), [bottom ? "bottom" : "top"]: U(bottom ? -y - w / 2 : y - w / 2), width: U(w), height: U(w), zIndex: z, "--r": `${rot}deg`, "--sp": sp, "--spin": spin })}
    >
      <Img src={`${P}/gulbarg-${k}.webp`} contain />
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
          <span key={i} data-w className={st.word} style={vars({ "--d": `${(d0 + step * k++).toFixed(2)}s` })}>
            {w}
          </span>
        ),
      )}
    </>
  );
}

/* ═════════════ 00 · Bog‘ darvozasi (scroll bilan) ═════════════ */
/** Darvoza tabaqasi rasmi (tabaqa.webp — kesilgan) Figma’dagi to‘liq rasm qutisidan */
const doorContent = (b: Box, flip: boolean): Box => [b[0] + b[2] * (flip ? 0.2662 : 0.2546), b[1] + b[3] * 0.01693, b[2] * 0.4792, b[3] * 0.9577];
/** Yopiq tabaqalar — ramka ichida (Figma «09 Final» nisbatlari) */
const doorClosed = (f: Box, right: boolean): Box => [f[0] + f[2] * (right ? 0.5 : 0.20625), f[1] + f[3] * 0.19336, f[2] * 0.29375, f[3] * 0.7945];

/** still — mokap ichida (embedded): scroll’siz, birinchi kadr (ochiq darvoza) */
function Gate({ d, wide, onReveal, onStart, still = false }: { d: D; wide: boolean; onReveal: () => void; onStart: () => void; still?: boolean }) {
  const t = useT();
  const wrap = useRef<HTMLDivElement>(null);
  const cb = useRef({ onReveal, onStart });
  cb.current = { onReveal, onStart };
  useEffect(() => {
    const el = wrap.current;
    if (!el || still) return;
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
      el.style.setProperty("--k", `${Math.min(k, H * 0.6).toFixed(1)}px`);
      el.style.setProperty("--q", clamp01(k / (H * 0.6)).toFixed(4));
      if (!started && k > 4) {
        started = true;
        cb.current.onStart();
      }
      if (!revealed && k > H * 0.35) {
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
  }, [still]);

  const W = wide ? 1440 : 390;
  // sahna koordinatasi: gorizontal markazdan
  const X = (x: number) => `calc(50% + ${U(x - W / 2)})`;
  const box = (r: Box, extra?: CSSProperties): CSSProperties => ({ position: "absolute", left: X(r[0]), top: U(r[1]), width: U(r[2]), height: U(r[3]), ...extra });
  const frame: Box = wide ? [460, 40, 520, 924.44] : [-7, 110, 404, 718.22];
  const doors: Box[] = wide
    ? [
        [380, 170, 120, 780],
        [940, 170, 120, 780],
      ]
    : [
        [-10, 212, 92, 600],
        [308, 212, 92, 600],
      ];
  const garland: Box = wide ? [400, -20, 640, 360] : [-15, 44, 420, 236.25];
  const roseL: Box = wide ? [170, 380, 360, 640] : [-78, 470, 236, 419.56];
  const roseR: Box = wide ? [910, 360, 360, 640] : [232, 450, 236, 419.56];
  const petals: [number, number, number, number][] = wide
    ? [
        [318, 232.4, 56, 20],
        [1153.3, 254.5, 48, -25],
        [1114.4, 722.3, 60, -10],
        [270.3, 748.9, 50, 35],
      ]
    : [
        [66.8, 294.6, 46, 20],
        [345.7, 312.1, 40, -25],
        [329.8, 659.3, 52, -10],
        [39.1, 725.4, 44, 35],
      ];
  const nameBase = wide ? 96 : 70;
  const nameMax = wide ? 290 : 200;
  // ismlar bloki: Figma — 1-ism, «&», 2-ism; bitta ism bo‘lsa — blok markazida
  const nTop = wide ? 330 : 338;
  const ampTop = wide ? 426 : 410;
  const n2Top = wide ? 476 : 450;
  const dateTop = wide ? 612 : 552;
  const single = !d.b;
  const n1Top = single ? (nTop + n2Top) / 2 : nTop;

  return (
    <div
      ref={wrap}
      className={cx(st.gateWrap, still && st.still)}
      style={vars(still ? { "--u": `calc(100cqw / ${W})`, height: U(wide ? 900 : 815), marginBottom: 0 } : { "--u": wide ? "min(calc(100cqw / 1440), calc(100svh / 1020))" : "min(calc(100cqw / 390), calc(100svh / 890))" })}
    >
      <div className={st.gate} aria-label={t("Taklifnoma")} style={still ? { position: "relative", height: "100%", transform: "none" } : undefined}>
        <div className={st.gSky}>
          <div className={cx("size-full", st.fadeIn)} style={{ animationDuration: "1.4s" }}>
            <Img src={`${P}/osmon.webp`} eager />
          </div>
        </div>
        {wide && (
          <>
            <div className={cx(st.gl, st.gTreeL)}>
              <div style={box([-90, 230, 400, 711.11])}>
                <div className={cx("size-full", st.riseIn)} style={{ animationDelay: "0.25s" }}>
                  <Img src={`${P}/daraxt.webp`} eager />
                </div>
              </div>
            </div>
            <div className={cx(st.gl, st.gTreeR)}>
              <div style={box([1150, 260, 380, 675.56])}>
                <div className={cx("size-full", st.riseIn)} style={{ animationDelay: "0.3s" }}>
                  <Img src={`${P}/daraxt.webp`} eager className={st.flipX} />
                </div>
              </div>
            </div>
          </>
        )}
        {/* Darvoza ramkasi — kamera ichiga kiradi (scale 1→1.8, opacity →0) */}
        <div className={cx(st.gl, st.gZoom)} style={{ transformOrigin: `50% ${U(wide ? 470 : 420)}` }}>
          <div style={box(frame)}>
            <div className={cx("size-full", st.fadeIn)} style={{ animationDuration: "1s" }}>
              <Img src={`${P}/darvoza.webp`} eager />
            </div>
          </div>
        </div>
        {/* Ismlar — chuqurlikdan chiqadi */}
        <div className={cx(st.gl, st.gNames)}>
          <h1 className={cx(st.serifI, "absolute text-center")} style={{ left: X(0), width: U(W), top: 0, height: "100%", color: "var(--ink)", lineHeight: 1 }}>
            <span className={cx("absolute inset-x-0 flex items-center justify-center", st.nameIn)} style={{ top: U(n1Top), height: U(nameBase), animationDelay: "1.2s" }}>
              <Fit base={nameBase} max={nameMax} deps={d.a}>
                {d.a}
              </Fit>
            </span>
            {d.b && (
              <>
                <span className={cx("absolute inset-x-0 block", st.ampIn)} style={{ top: U(ampTop), fontSize: U(wide ? 52 : 40), color: "var(--gold)", animationDelay: "1.45s" }}>
                  &amp;
                </span>
                <span className={cx("absolute inset-x-0 flex items-center justify-center", st.nameIn)} style={{ top: U(n2Top), height: U(nameBase), animationDelay: "1.35s" }}>
                  <Fit base={nameBase} max={nameMax} deps={d.b}>
                    {d.b}
                  </Fit>
                </span>
              </>
            )}
          </h1>
          {d.dots && (
            <p className={cx(st.sansM, st.fadeIn, "absolute text-center")} style={{ left: X(0), width: U(W), top: U(single ? dateTop - 20 : dateTop), fontSize: U(wide ? 17 : 15), letterSpacing: U(wide ? 4.08 : 3.3), color: "var(--ink)", animationDelay: "1.7s", whiteSpace: "nowrap" }}>
              {d.dots}
            </p>
          )}
        </div>
        {/* Tabaqalar (3D ochiladi) + girlyanda — ramka bilan birga kattalashadi */}
        <div className={cx(st.gl, st.gZoom)} style={{ transformOrigin: `50% ${U(wide ? 470 : 420)}` }}>
          {doors.map((b, i) => {
            const o = doorContent(b, i === 1);
            const c = doorClosed(frame, i === 1);
            return (
              <div
                key={i}
                className={st.door}
                style={vars({
                  ...box(o),
                  "--c": `translate(${U(c[0] - o[0])}, ${U(c[1] - o[1])}) scale(${(c[2] / o[2]).toFixed(4)}, ${(c[3] / o[3]).toFixed(4)})`,
                })}
              >
                <Img src={`${P}/tabaqa.webp`} eager className={i === 1 ? st.flipX : undefined} style={{ objectFit: "fill" }} />
              </div>
            );
          })}
          <div style={box(garland)}>
            <div className={cx("size-full", st.dropIn)} style={{ animationDelay: "0.15s" }}>
              <Img src={`${P}/girlyanda.webp`} eager />
            </div>
          </div>
        </div>
        {/* Atirgullar — yon tomonga suriladi */}
        <div className={cx(st.gl, st.gRoseL)}>
          <div style={box(roseL)}>
            <div className={cx("size-full", st.riseIn)} style={{ animationDelay: "0.45s" }}>
              <Img src={`${P}/atirgul.webp`} eager />
            </div>
          </div>
        </div>
        <div className={cx(st.gl, st.gRoseR)}>
          <div style={box(roseR)}>
            <div className={cx("size-full", st.riseIn)} style={{ animationDelay: "0.5s" }}>
              <Img src={`${P}/atirgul.webp`} eager className={st.flipX} />
            </div>
          </div>
        </div>
        <div className={cx(st.gl, st.gPetals)}>
          {petals.map(([x, y, w, r], i) => (
            <div key={i} className={st.fadeIn} style={{ ...box([x - w / 2, y - w / 2, w, w]), animationDelay: `${1.6 + i * 0.15}s` }}>
              <div className="size-full" style={{ rotate: `${r}deg` }}>
                <Img src={`${P}/gulbarg-${[1, 2, 3, 4][i]}.webp`} eager contain />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═════════════ 01 · Xush kelibsiz — ark ichidagi surat ═════════════ */
function ArchPhoto({ src, w, h, r, br, line, lineR, lineBr, pad }: { src: string; w: number; h: number; r: number; br: number; line?: boolean; lineR: number; lineBr: number; pad: number }) {
  return (
    <div className="relative" style={{ width: U(w + pad * 2), height: U(h + pad * 2), flex: "none" }}>
      {line && <div data-a="line" className={st.archLine} style={{ inset: 0, borderRadius: `${U(lineR)} ${U(lineR)} ${U(lineBr)} ${U(lineBr)}` }} />}
      <div data-a="arch" className="absolute overflow-hidden" style={{ left: U(pad), top: U(pad), width: U(w), height: U(h), borderRadius: `${U(r)} ${U(r)} ${U(br)} ${U(br)}`, background: "#efe3d6" }}>
        <Img src={src} a="zoom" />
      </div>
    </div>
  );
}

function Welcome({ d, wide, ready, tail, z }: { d: D; wide: boolean; ready: boolean; tail: number; z: number }) {
  const t = useT();
  const text = (center: boolean) => (
    <>
      <p data-a="blur" className={st.serifI} style={{ fontSize: U(wide ? 64 : 42), lineHeight: 1.05, color: "var(--ink)", overflowWrap: "anywhere" }}>
        {d.guest ? t("Hurmatli {guest}", { guest: d.guest }) : t("Aziz yaqinlarimiz!")}
      </p>
      {d.paragraphs.map((p, i) => (
        <p
          key={i}
          data-a="up"
          style={vars({ fontSize: U(wide ? 20 : 17), lineHeight: wide ? 1.6 : 1.55, color: "var(--ink)", marginTop: U(i === 0 ? (wide ? 33 : 58) : wide ? 34 : 20), whiteSpace: "pre-line", overflowWrap: "anywhere", "--y": 20, "--d": `${0.25 + i * 0.08}s`, maxWidth: center ? undefined : U(470) })}
        >
          {p}
        </p>
      ))}
      <p data-a="glow" className={st.serifI} style={vars({ fontSize: U(wide ? 44 : 36), color: "var(--gold)", marginTop: U(d.paragraphs.length ? (wide ? 24 : 36) : 28), whiteSpace: "nowrap", "--d": "0.6s" })}>
        {d.mono}
      </p>
    </>
  );
  const petals = wide ? (
    <>
      <Petal c={[734.8, 184.3, 56, -30]} k={5} />
      <Petal c={[1258.4, 662.6, 44, 10]} k={1} sp={30} />
    </>
  ) : (
    <>
      <Petal c={[331.1, 143.8, 50, -30]} k={5} z={4} />
      <Petal c={[45.9, 639.5, 38, 10]} k={1} z={4} sp={30} />
    </>
  );
  return (
    <Sec ready={ready} z={z} style={{ background: "var(--cream)", paddingBottom: U((wide ? 120 : 50) + tail), minHeight: wide ? U(882.67 + tail) : undefined }}>
      <Pic src={`${P}/butalar.webp`} r={wide ? [-180, -330, 1800, 771.43] : [-125, -150, 640, 274.29]} z={1} />
      {petals}
      {wide ? (
        d.photo1 ? (
          <div className="relative flex items-center" style={{ paddingTop: U(144), paddingLeft: U(184), zIndex: 2 }}>
            <ArchPhoto src={d.photo1} w={440} h={586.67} r={252.08} br={11.46} line lineR={236} lineBr={16} pad={16} />
            <div style={{ marginLeft: U(104), width: U(500), marginTop: U(36) }}>{text(false)}</div>
          </div>
        ) : (
          <div className="relative flex flex-col items-center text-center" style={{ paddingTop: U(200), width: U(760), marginInline: "auto", zIndex: 2 }}>
            {text(true)}
          </div>
        )
      ) : (
        <div data-a="rise" className={cx(st.card, "relative flex flex-col items-center text-center")} style={vars({ marginLeft: U(24), marginTop: U(110), width: U(342), borderRadius: U(171), padding: `${U(d.photo1 ? 20 : 104)} ${U(20)} ${U(77)}`, zIndex: 2, "--y": 80 })}>
          {d.photo1 && (
            <div style={{ marginBottom: U(27) }}>
              <ArchPhoto src={d.photo1} w={300} h={400} r={117.19} br={4.69} lineR={0} lineBr={0} pad={0} />
            </div>
          )}
          <div className="flex flex-col items-center" style={{ width: U(282) }}>
            {text(true)}
          </div>
        </div>
      )}
    </Sec>
  );
}

/* ═════════════ 02 · Sana — kalendar va taymer ═════════════ */
function Digits({ value, run, len, i, fs }: { value: number; run: boolean; len: number; i: number; fs: string }) {
  const c = useCountUp(value, run, 1400 + i * 150);
  const digits = String(c.value).padStart(len, "0").split("");
  return (
    <span className={cx(st.serif, st.digits)} style={{ fontSize: fs, lineHeight: 1, color: "var(--ink)" }}>
      {digits.map((dg, k) => (
        <span key={c.done ? `${digits.length - k}-${dg}` : `${digits.length - k}`} className={c.done ? st.digit : undefined}>
          {dg}
        </span>
      ))}
    </span>
  );
}

function Timer({ d, wide, run }: { d: D; wide: boolean; run: boolean }) {
  const units = timerUnits(useLocale());
  const c = useCountdown(d.target);
  if (!c) return null;
  const cols = wide ? 130 : 84;
  return (
    <div className="flex justify-center">
      {([c.d, c.h, c.m, c.s] as const).map((n, i) => (
        <div key={i} data-a="up" className="flex flex-col items-center" style={vars({ width: U(cols), "--y": 20, "--d": `${0.2 + i * 0.08}s` })}>
          <Digits value={n} run={run} len={i === 0 ? Math.max(2, String(c.d).length) : 2} i={i} fs={U(wide ? 72 : 46)} />
          <span className={st.sans} style={{ fontSize: U(wide ? 16 : 14), color: "var(--muted)", marginTop: U(wide ? 10 : 8), whiteSpace: "nowrap" }}>
            {units[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

function DateSec({ d, wide, ready, tail, z }: { d: D; wide: boolean; ready: boolean; tail: number; z: number }) {
  const t = useT();
  const [ref, inView] = useInView<HTMLDivElement>(0.3, ready);
  if (!d.hasDate) return null;
  const cw = wide ? 64 : 46;
  const rowH = wide ? 54 : 48;
  const fsDay = wide ? 24 : 21;
  const circle = wide ? 48 : 42;
  const k = circle / 48;
  const cal = (
    <div className="flex flex-col items-center">
      <p data-a="blur" className={cx(st.serifI, "text-center")} style={{ fontSize: U(wide ? 72 : 54), lineHeight: 1, color: "var(--ink)", whiteSpace: "nowrap" }}>
        {d.monthName}
      </p>
      <p data-a="fade" className={st.sansM} style={vars({ fontSize: U(wide ? 16 : 15), letterSpacing: U(wide ? 4.8 : 4.5), color: "var(--muted)", marginTop: U(wide ? 10 : 8), "--d": "0.15s" })}>
        {d.year}
      </p>
      <div className="flex" style={{ marginTop: U(wide ? 38 : 36) }}>
        {d.week.map((w, i) => (
          <span key={i} data-a="fade" className={cx(st.sansM, "text-center")} style={vars({ width: U(cw), fontSize: U(wide ? 14 : 13), color: "var(--muted)", "--d": `${0.2 + i * 0.02}s` })}>
            {w}
          </span>
        ))}
      </div>
      <div style={{ marginTop: U(wide ? 12.5 : 8.5) }}>
        {d.grid.map((row, r) => (
          <div key={r} className="flex">
            {row.map((n, c) => {
              const on = n === d.day;
              return (
                <span key={c} className="relative flex items-center justify-center" style={{ width: U(cw), height: U(rowH) }}>
                  {n && on && (
                    <>
                      <span data-a="ring" className={st.dayRing} style={vars({ width: U(circle), height: U(circle), "--d": "0.9s" })} />
                      <span data-a="land" className="absolute" style={vars({ left: `calc(50% + ${U(21.6 * k - 13 * k)})`, top: `calc(50% - ${U(18.5 * k + 15 * k)})`, width: U(26 * k), height: U(30 * k), zIndex: 2, "--d": "1.3s" })}>
                        <span className="block size-full" style={{ rotate: "-20deg" }}>
                          <Img src={`${P}/gulbarg-2.webp`} contain />
                        </span>
                      </span>
                    </>
                  )}
                  {n && (
                    <span
                      data-a="pop"
                      className={on ? st.serifB : st.serif}
                      style={vars({ position: "relative", zIndex: 1, fontSize: U(fsDay), lineHeight: 1, color: on ? "var(--cream)" : "var(--ink)", opacity: !on && c >= 5 ? 0.6 : undefined, "--d": `${(0.25 + (r + c) * 0.03).toFixed(2)}s` })}
                    >
                      {n}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
  const whenLine = d.when && (
    <p data-a="up" className={cx(st.serifI, "text-center")} style={vars({ fontSize: U(wide ? 34 : 26), color: "var(--ink)", lineHeight: 1.2, "--y": 20, "--d": "0.5s", overflowWrap: "anywhere" })}>
      {d.when}
    </p>
  );
  return (
    <Sec ready={ready} z={z} style={{ background: "var(--blush)", paddingBottom: U((wide ? 110 : 99) + tail), minHeight: wide ? U(760 + tail) : undefined }}>
      <Pic src={`${P}/girlyanda.webp`} r={wide ? [400, -180, 640, 360] : [-25, -128, 440, 247.5]} z={3} a="sway" />
      {wide ? (
        <div className="relative flex" style={{ paddingTop: U(200) }}>
          <div style={{ marginLeft: U(160), width: U(480) }}>{cal}</div>
          <div data-a="lineY" className="absolute" style={{ left: U(720), top: U(250), width: 1, height: U(360), background: "rgba(176,141,87,.5)" }} />
          <div ref={ref} className="flex flex-col items-center" style={{ marginLeft: U(150), width: U(510), paddingTop: U(130), gap: U(59) }}>
            <Timer d={d} wide run={inView} />
            {whenLine}
          </div>
        </div>
      ) : (
        <div className="relative flex flex-col items-center" style={{ paddingTop: U(120) }}>
          {cal}
          <div data-a="lineX" style={{ width: U(240), height: 1, background: "rgba(176,141,87,.55)", marginTop: U(47.5) }} />
          <div ref={ref} style={{ marginTop: U(25) }}>
            <Timer d={d} wide={false} run={inView} />
          </div>
          <div style={{ marginTop: U(45), paddingInline: U(24) }}>{whenLine}</div>
        </div>
      )}
    </Sec>
  );
}

/* ═════════════ 03 · Bazm manzili — qasr sahnasi (parallaks) ═════════════ */
function Venue({ d, wide, ready, tail, z, linkable }: { d: D; wide: boolean; ready: boolean; tail: number; z: number; linkable: boolean }) {
  const t = useT();
  const v: V = (m, l) => U(wide ? l : m);
  const sky = useRef<HTMLDivElement>(null);
  const tl = useRef<HTMLDivElement>(null);
  const tr = useRef<HTMLDivElement>(null);
  const ch = useRef<HTMLDivElement>(null);
  const onP = useCallback(
    (p: number) => {
      // chuqur qatlamlar sekinroq: osmon 0.2x · daraxt 0.45x · qasr 0.6x · butalar 0.9x
      const f = seg(p, 0.12, 0.5);
      const e = 1 - Math.pow(1 - f, 3);
      const y = (k: number) => U(+((p - 0.5) * k).toFixed(2));
      if (sky.current) sky.current.style.transform = `translate3d(0, ${y(wide ? 160 : 120)}, 0)`;
      if (tl.current) tl.current.style.transform = `translate3d(${U(+((1 - e) * 60).toFixed(2))}, ${y(70)}, 0)`;
      if (tr.current) tr.current.style.transform = `translate3d(${U(+((e - 1) * 60).toFixed(2))}, ${y(70)}, 0)`;
      if (ch.current) ch.current.style.transform = `translate3d(0, ${y(45)}, 0) scale(${(1.08 - 0.08 * e).toFixed(4)})`;
    },
    [wide],
  );
  const scene = wide
    ? { tl: [40, 0, 400, 711.11] as Box, tr: [1030, 20, 380, 675.56] as Box, ch: [220, 80, 1000, 562.5] as Box, hedge: [-160, 260, 1760, 754.29] as Box, h: 640 }
    : { tl: [-118, 0, 250, 444.44] as Box, tr: [268, 30, 230, 408.89] as Box, ch: [-85, 138, 560, 315] as Box, hedge: [-195, 266, 780, 334.29] as Box, h: 580 };
  return (
    <Sec ready={ready} z={z} onP={onP} style={{ background: "#dce7f0", paddingBottom: U(tail), overflow: "hidden" }}>
      <div ref={sky} className="absolute" style={{ left: wide ? 0 : U(-52), right: wide ? 0 : U(-52), top: U(-110), bottom: U(-110), pointerEvents: "none" }}>
        <Img src={`${P}/osmon.webp`} />
      </div>
      <div className="relative flex flex-col items-center text-center" style={{ paddingTop: U(96), paddingInline: v(30, 200), zIndex: 3 }}>
        <p data-a="blur" className={st.serifI} style={{ fontSize: v(52, 72), lineHeight: 1, color: "var(--ink)" }}>
          {t("Bazm manzili")}
        </p>
        {wide ? (
          <p data-a="up" className={st.sans} style={vars({ fontSize: U(20), lineHeight: 1.45, marginTop: U(22), color: "var(--ink)", overflowWrap: "anywhere", "--y": 20, "--d": "0.15s" })}>
            {[d.venueTitle, d.address].filter(Boolean).join(" · ")}
          </p>
        ) : (
          <>
            {d.venueTitle && (
              <p data-a="up" className={st.serifB} style={vars({ fontSize: U(24), lineHeight: 1.2, marginTop: U(18), color: "var(--ink)", overflowWrap: "anywhere", "--y": 20, "--d": "0.15s" })}>
                {d.venueTitle}
              </p>
            )}
            {d.address && (
              <p data-a="up" className={st.sans} style={vars({ fontSize: U(17), lineHeight: 1.45, marginTop: U(7), color: "var(--ink)", overflowWrap: "anywhere", "--y": 20, "--d": "0.22s" })}>
                {d.address}
              </p>
            )}
          </>
        )}
        <div data-a="up" className="flex flex-wrap justify-center" style={vars({ gap: U(10), marginTop: v(19, 17), "--y": 20, "--d": "0.3s" })}>
          <a href={linkable ? d.mapUrl : undefined} target="_blank" rel="noopener noreferrer" className={st.btnLine} style={{ padding: wide ? `${U(14)} ${U(26)}` : `${U(13)} ${U(24)}`, fontSize: v(16, 17) }}>
            {t("Xaritada ochish")}
            <span aria-hidden style={{ marginLeft: U(8) }}>
              →
            </span>
          </a>
        </div>
      </div>
      {/* qasr sahnasi — matn ostidan boshlanadi (matn uzun bo‘lsa sahna pastga suriladi) */}
      <div className="relative" style={{ height: U(scene.h), marginTop: v(7, 14) }}>
        <div ref={tl} className="absolute inset-0" style={{ pointerEvents: "none", willChange: "transform" }}>
          <Pic src={`${P}/daraxt.webp`} r={scene.tl} />
        </div>
        <div ref={tr} className="absolute inset-0" style={{ pointerEvents: "none", willChange: "transform" }}>
          <Pic src={`${P}/daraxt.webp`} r={scene.tr} flip />
        </div>
        <div ref={ch} className="absolute inset-0" style={{ pointerEvents: "none", willChange: "transform", transformOrigin: "50% 75%" }}>
          <Pic src={`${P}/qasr.webp`} r={scene.ch} />
        </div>
        <Pic src={`${P}/butalar.webp`} r={scene.hedge} />
        {wide ? (
          <>
            <Petal c={[255.2, 56.6, 50, 25]} k={4} />
            <Petal c={[1213.8, 137.9, 56, -15]} k={3} />
          </>
        ) : (
          <>
            <Petal c={[52.1, 51.3, 40, 25]} k={4} />
            <Petal c={[347.8, 134.7, 46, -15]} k={3} />
          </>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 04 · To‘y dasturi ═════════════ */
function Stop({ it, i, wide, last, petal }: { it: ProgramItem; i: number; wide: boolean; last: boolean; petal?: [number, number, number, number] }) {
  const icon = programIcon(it, i);
  if (wide)
    return (
      <div className="relative flex flex-col items-center text-center" style={{ width: U(260) }}>
        <div data-a="paint" style={vars({ width: U(180), height: U(180), "--d": `${0.15 + i * 0.12}s` })}>
          <Img src={icon} contain />
        </div>
        <span data-a="drop" className={st.dotGold} style={vars({ width: U(9), height: U(9), marginTop: U(-4.5), "--d": `${0.5 + i * 0.12}s` })} />
        <p data-a="up" className={cx(st.serifI, st.clamp2)} style={vars({ fontSize: U(36), lineHeight: 1, color: "var(--ink)", marginTop: U(25.5), width: U(236), paddingBottom: "0.08em", "--y": 20, "--d": `${0.3 + i * 0.12}s` })}>
          {it.title}
        </p>
        <p data-a="flip" className={st.serifB} style={vars({ fontSize: U(30), color: "var(--gold)", marginTop: U(10), lineHeight: 1.2, "--d": `${0.45 + i * 0.12}s` })}>
          {it.time}
        </p>
        {it.note && (
          <p data-a="up" className={cx(st.sans, st.clamp2)} style={vars({ fontSize: U(17), lineHeight: 1.45, color: "var(--muted)", marginTop: U(8), width: U(236), "--y": 16, "--d": `${0.5 + i * 0.12}s` })}>
            {it.note}
          </p>
        )}
      </div>
    );
  return (
    <div className="flex flex-col items-center text-center" style={{ width: "100%" }}>
      <div data-a="paint" style={{ width: U(128), height: U(128) }}>
        <Img src={icon} contain />
      </div>
      <p data-a="up" className={cx(st.serifI, st.clamp2)} style={vars({ fontSize: U(36), lineHeight: 1, color: "var(--ink)", marginTop: U(8), width: U(340), paddingBottom: "0.08em", "--y": 20, "--d": "0.1s" })}>
        {it.title}
      </p>
      <p data-a="flip" className={st.serifB} style={vars({ fontSize: U(28), color: "var(--gold)", marginTop: U(8), lineHeight: 1.2, "--d": "0.2s" })}>
        {it.time}
      </p>
      {it.note && (
        <p data-a="up" className={cx(st.sans, st.clamp2)} style={vars({ fontSize: U(17), lineHeight: 1.25, color: "var(--muted)", marginTop: U(6), width: U(310), "--y": 16, "--d": "0.25s" })}>
          {it.note}
        </p>
      )}
      {!last && (
        <div className="relative flex w-full flex-col items-center">
          <span data-a="lineY" style={vars({ width: 1, height: U(46), marginTop: U(20), background: "rgba(176,141,87,.55)", "--d": "0.35s" })} />
          <span data-a="drop" className={st.dotGold} style={vars({ width: U(7), height: U(7), marginTop: U(2), marginBottom: U(3), "--d": "0.75s" })} />
          {/* gulbarg — bog‘lovchi chiziq yonida (matnga tegmaydi) */}
          {petal && <Petal c={[petal[1], 50, petal[2], petal[3]]} k={petal[0]} sp={24} />}
        </div>
      )}
    </div>
  );
}

/** Har bir band o‘zi ekranga kirganda ochiladi (mobil — uzun ro‘yxat) */
function Reveal({ children, ready, className, style }: { children: ReactNode; ready: boolean; className?: string; style?: CSSProperties }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.25, ready);
  return (
    <div ref={ref} className={cx(st.sec, inView && ready && st.in, className)} style={style}>
      {children}
    </div>
  );
}

function Program({ d, wide, ready, tail, z }: { d: D; wide: boolean; ready: boolean; tail: number; z: number }) {
  const t = useT();
  const items = d.program.slice(0, 8);
  const n = items.length;
  if (!n) return null;
  const rows: ProgramItem[][] = wide ? (n <= 4 ? [items] : [items.slice(0, Math.ceil(n / 2)), items.slice(Math.ceil(n / 2))]) : [];
  const title = t("Kun dasturi");
  return (
    <Sec ready={ready} z={z} style={{ background: "var(--cream)", paddingBottom: U((wide ? 160 : 118) + tail), minHeight: wide ? U(800 + tail) : undefined }}>
      <Pic src={`${P}/butalar.webp`} r={wide ? [-30, -396, 1500, 642.86] : [-155, -170, 700, 300]} flip z={3} />
      {wide ? (
        <>
          <Petal c={[169.9, 409.2, 50, -20]} k={5} />
          <Petal c={[1299.5, 307.5, 44, 30]} k={1} />
        </>
      ) : null}
      <p data-a="blur" className={cx(st.serifI, "relative text-center")} style={{ paddingTop: U(150), lineHeight: 1, color: "var(--ink)", zIndex: 2 }}>
        <Fit base={wide ? 72 : 54} max={wide ? 1100 : 350} deps={title}>
          {title}
        </Fit>
      </p>
      {wide ? (
        <div className="relative flex flex-col items-center" style={{ marginTop: U(48), gap: U(56), zIndex: 2 }}>
          {rows.map((row, ri) => (
            <div key={ri} className="relative flex justify-center">
              <span data-a="lineX" className="absolute" style={vars({ left: U(130 - 60), right: U(130 - 60), top: U(180), height: 1, background: "rgba(176,141,87,.5)", "--d": `${0.1 + ri * 0.2}s` })} />
              {row.map((it, i) => (
                <Stop key={i} it={it} i={ri * rows[0].length + i} wide last={false} />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="relative flex flex-col items-center" style={{ marginTop: U(46), zIndex: 2 }}>
          {items.map((it, i) => (
            <Reveal key={i} ready={ready} className="w-full">
              <Stop it={it} i={i} wide={false} last={i === n - 1} petal={i === 0 ? [5, 345, 42, -20] : i === 2 ? [1, 45, 36, 30] : undefined} />
            </Reveal>
          ))}
        </div>
      )}
    </Sec>
  );
}

/* ═════════════ 05 · Tafsilotlar — zaytun ark ═════════════ */
function Details({ d, wide, ready, tail, z, linkable }: { d: D; wide: boolean; ready: boolean; tail: number; z: number; linkable: boolean }) {
  const t = useT();
  const lang = useLocale();
  const v: V = (m, l) => U(wide ? l : m);
  const blocks = [
    ["Sovg‘alar", d.gifts],
    ["Gullar", d.flowers],
    ["Aloqa", d.contact],
  ].filter(([, s]) => s) as [string, string][];
  const btns = d.tel || d.tg;
  if (!blocks.length && !btns) return null;
  return (
    <Sec ready={ready} z={z} style={{ background: "#dce7f0", paddingBottom: U((wide ? 190 : 150) + tail), overflow: "clip" }}>
      <div className="absolute inset-0" style={{ pointerEvents: "none" }}>
        <div className="absolute" style={{ left: wide ? 0 : U(-158), right: wide ? 0 : U(-158), top: 0, bottom: 0 }}>
          <Img src={`${P}/osmon.webp`} />
        </div>
      </div>
      {wide && (
        <>
          <Pic src={`${P}/atirgul.webp`} r={[60, 500, 300, 533.33]} a="grow" z={2} />
          <Pic src={`${P}/atirgul.webp`} r={[1080, 460, 300, 533.33]} flip a="grow" z={2} />
        </>
      )}
      <div className="relative" style={{ marginLeft: v(28, 420), paddingTop: v(140, 150), width: v(334, 600), zIndex: 3 }}>
        <div data-a="rise" className={cx(st.olive, "relative flex flex-col items-center justify-center text-center")} style={vars({ minHeight: v(640, 700), borderRadius: v(167, 300), padding: wide ? `${U(150)} ${U(60)} ${U(150)}` : `${U(110)} ${U(40)} ${U(120)}`, gap: v(14, 16), "--y": 80, "--t": "1.2s" })}>
          <p className={st.serifI} style={{ fontSize: v(42, 52), lineHeight: 1, color: "var(--cream)", width: v(230, 480) }}>
            {t("Tafsilotlar va tilaklar")}
          </p>
          {blocks.map(([h, s], i) => (
            <div key={h} data-a="up" className="flex flex-col items-center" style={vars({ gap: v(14, 16), marginTop: v(10, 8), "--y": 24, "--d": `${0.3 + i * 0.12}s` })}>
              <p className={st.serifI} style={{ fontSize: v(32, 36), lineHeight: 1.2, color: "#f3e2c9" }}>
                {t(h)}
              </p>
              <p className={st.sans} style={{ fontSize: v(16, 18), lineHeight: 1.55, color: "var(--cream)", opacity: 0.92, overflowWrap: "anywhere", whiteSpace: "pre-line" }}>
                {s}
              </p>
            </div>
          ))}
          {btns && (
            <div data-a="up" className="flex flex-wrap justify-center" style={vars({ gap: v(10, 12), marginTop: blocks.length ? 0 : v(10, 8), "--y": 20, "--d": "0.65s" })}>
              {d.tel && (
                <a href={linkable ? d.tel : undefined} className={st.btnCream} style={{ padding: wide ? `${U(14)} ${U(25)}` : `${U(12)} ${U(20)}`, fontSize: v(15, 16) }}>
                  {t(lang === "uz" ? "Qo‘ng‘iroq" : "Qo‘ng‘iroq qilish")}
                </a>
              )}
              {d.tg && (
                <a href={linkable ? d.tg : undefined} target="_blank" rel="noopener noreferrer" className={st.btnCream} style={{ padding: wide ? `${U(14)} ${U(25)}` : `${U(12)} ${U(20)}`, fontSize: v(15, 16) }}>
                  Telegram
                </a>
              )}
            </div>
          )}
        </div>
        {/* yuqori va pastki girlyanda — ark tepasi va pastida */}
        <L r={wide ? [-60, 30, 720, 405] : [-43, 40, 420, 236.25]} a="drop" z={4} style={vars({ "--dy": -40 })}>
          <Img src={`${P}/girlyanda.webp`} />
        </L>
        <div className="absolute" style={{ left: v(-33, -40), bottom: U(wide ? -120 : -80), width: v(400, 680), height: v(225, 382.5), zIndex: 4, pointerEvents: "none" }}>
          <div data-a="rise" className="size-full" style={vars({ rotate: "180deg", "--y": -30, "--d": "0.4s" })}>
            <Img src={`${P}/girlyanda.webp`} />
          </div>
        </div>
        {!wide && <Petal c={[328.6, 214.5, 40, -20]} k={2} z={5} />}
        {!wide && <Petal c={[8.3, -40, 44, 15]} k={1} z={5} bottom />}
      </div>
    </Sec>
  );
}

/* ═════════════ 06 · Dress-kod (ixtiyoriy) ═════════════ */
function Dress({ d, wide, ready, tail, z }: { d: D; wide: boolean; ready: boolean; tail: number; z: number }) {
  const t = useT();
  if (!d.dress) return null;
  const x = d.dress;
  const k = wide ? 1.25 : 1;
  const s = (n: number) => U(n * k);
  const one = x.imgs.length === 1;
  return (
    <Sec ready={ready} z={z} style={{ background: "var(--blush)", paddingBottom: U((wide ? 130 : 110) + tail) }}>
      {wide ? (
        <>
          <Pic src={`${P}/atirgul.webp`} r={[150, 230, 280, 497.78]} a="grow" />
          <Pic src={`${P}/atirgul.webp`} r={[1010, 210, 280, 497.78]} flip a="grow" />
        </>
      ) : (
        <Petal c={[354.4, 142.3, 40, -30]} k={4} />
      )}
      <p data-a="blur" className={cx(st.serifI, "text-center")} style={{ paddingTop: U(wide ? 110 : 96), fontSize: U(wide ? 72 : 54), lineHeight: 1, color: "var(--ink)" }}>
        {t("Dress-kod")}
      </p>
      <div className="relative flex justify-center" style={{ marginTop: U(wide ? 48 : 34) }}>
        <div data-a="archOpen" className={cx(st.dressCard, "relative flex flex-col items-center text-center")} style={vars({ width: s(342), padding: `${s(74)} ${s(24)} ${s(28)}`, gap: s(12), borderRadius: `${s(171)} ${s(171)} ${s(28)} ${s(28)}`, "--d": "0.15s" })}>
          <p className={st.serifI} style={{ fontSize: s(40), lineHeight: 1.1, color: "var(--ink)" }}>
            {x.title}
          </p>
          <p className={st.sans} style={{ fontSize: s(17), color: "var(--gold)", lineHeight: 1.3 }}>
            {x.sub}
          </p>
          <div className="flex w-full justify-center" style={{ gap: s(10) }}>
            {x.imgs.map((im) => (
              <div key={im.src} className="flex flex-col items-center" style={{ gap: s(8), flex: one ? "none" : "1 1 0", minWidth: 0 }}>
                <div className="overflow-hidden" style={{ width: s(one ? 200 : 142), height: s(164), borderRadius: `${s(71)} ${s(71)} ${s(14)} ${s(14)}`, background: "#fff" }}>
                  <Img src={im.src} className={one ? st.contain : undefined} />
                </div>
                <p className={st.sansM} style={{ fontSize: s(13), letterSpacing: s(1.56), color: "var(--muted)", whiteSpace: "nowrap" }}>
                  {im.label}
                </p>
              </div>
            ))}
          </div>
          <p className={st.sans} style={{ fontSize: s(16), lineHeight: 1.5, color: "var(--muted)", overflowWrap: "anywhere" }}>
            {x.note}
          </p>
        </div>
      </div>
    </Sec>
  );
}

/* ═════════════ 07 · Lahzalar — ark surat + iqtibos ═════════════ */
function Moments({ d, wide, ready, tail, z }: { d: D; wide: boolean; ready: boolean; tail: number; z: number }) {
  const ph = d.photo2;
  if (!ph && !d.quote) return null;
  const quote = d.quote && (
    <p className={st.serifI} style={{ fontSize: U(wide ? 52 : 32), lineHeight: 1.2, color: "var(--ink)", overflowWrap: "anywhere" }}>
      <Words text={d.quote} d0={0.5} step={0.05} />
    </p>
  );
  if (wide)
    return (
      <Sec ready={ready} z={z} style={{ background: "var(--cream)", paddingBottom: U(120 + tail), minHeight: ph ? U(862.67 + tail) : undefined }}>
        <Petal c={ph ? [735.5, 230.4, 50, 20] : [230, 260, 50, 20]} k={3} />
        <Petal c={ph ? [1267.7, 632.1, 40, -25] : [1210, 420, 40, -25]} k={2} />
        {ph ? (
          <>
            <Pic src={`${P}/atirgul.webp`} r={[80, 306.67, 260, 462.22]} a="grow" z={3} />
            <div className="relative flex items-center" style={{ paddingTop: U(124), paddingLeft: U(214) }}>
              <ArchPhoto src={ph} w={440} h={586.67} r={252.08} br={11.46} line lineR={236} lineBr={16} pad={16} />
              {d.quote && (
                <div style={{ marginLeft: U(94), width: U(480) }}>
                  {quote}
                  <p data-a="glow" className={st.serifI} style={vars({ fontSize: U(40), color: "var(--gold)", marginTop: U(40), "--d": "1s" })}>
                    {d.mono}
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center text-center" style={{ paddingTop: U(160), width: U(800), marginInline: "auto" }}>
            {quote}
            <p data-a="glow" className={st.serifI} style={vars({ fontSize: U(40), color: "var(--gold)", marginTop: U(40), "--d": "1s" })}>
              {d.mono}
            </p>
          </div>
        )}
      </Sec>
    );
  return (
    <Sec ready={ready} z={z} style={{ background: "var(--cream)", paddingBottom: U((d.quote ? 72 : 110) + tail) }}>
      <Pic src={`${P}/atirgul.webp`} r={[-96, -120, 220, 391.11]} z={1} a="grow" />
      {ph && (
        <>
          <Pic src={`${P}/atirgul.webp`} r={[280, 250, 190, 337.78]} flip z={3} a="grow" />
          <div className="relative" style={{ paddingTop: U(100), paddingLeft: U(35), zIndex: 2 }}>
            <ArchPhoto src={ph} w={300} h={400} r={117.19} br={6.25} line lineR={160} lineBr={12} pad={10} />
          </div>
        </>
      )}
      {d.quote && (
        <div className="relative text-center" style={{ marginTop: U(ph ? 54 : 0), paddingTop: U(ph ? 0 : 150), paddingInline: U(ph ? 30 : 56), zIndex: 2 }}>
          {ph && <Petal c={[23.7, -32, 40, 20]} k={3} />}
          {quote}
        </div>
      )}
    </Sec>
  );
}

/* ═════════════ 08 · Anketa — javob ═════════════ */
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
  const [rain, setRain] = useState(0);
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
    if (!live) {
      setRain((x) => x + 1);
      return setSent(status);
    }
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
      setRain((x) => x + 1);
      setSent(status);
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const label = (s: string) => (
    <p className={st.lbl} style={{ fontSize: U(13), letterSpacing: U(1.56) }}>
      {s}
    </p>
  );
  const pad = wide ? U(19) : U(16);
  return (
    <Sec ready={ready} z={z} id="shato-javob" style={{ background: "var(--blush)", paddingBottom: U((wide ? 240 : 230) + tail) }}>
      <Pic src={`${P}/butalar.webp`} r={wide ? [-180, -330, 1800, 771.43] : [-125, -150, 640, 274.29]} z={1} />
      {wide && (
        <>
          <Pic src={`${P}/atirgul.webp`} r={[110, 500, 300, 533.33]} a="grow" z={1} />
          <Pic src={`${P}/atirgul.webp`} r={[1030, 460, 300, 533.33]} flip a="grow" z={1} />
        </>
      )}
      <div className="relative" style={{ marginLeft: v(24, 430), paddingTop: v(150, 200), width: v(342, 580), zIndex: 2 }}>
        <form onSubmit={submit} noValidate data-a="rise" className={cx(st.formCard, "relative")} style={vars({ borderRadius: `${v(171, 290)} ${v(171, 290)} ${v(28, 32)} ${v(28, 32)}`, padding: wide ? `${U(151)} ${U(49)} ${U(49)}` : `${U(96)} ${U(28)} ${U(28)}`, "--y": 80, "--t": "1.2s" })}>
          {rain > 0 && (
            <div key={rain} className="pointer-events-none absolute inset-0 overflow-hidden" style={{ borderRadius: "inherit" }} aria-hidden>
              {Array.from({ length: 12 }, (_, i) => (
                <span key={i} className={st.rain} style={vars({ left: `${(i * 37 + 7) % 92}%`, width: U(wide ? 34 : 28), height: U(wide ? 34 : 28), "--d": `${(i % 6) * 0.12}s`, "--r": `${(i * 47) % 360}deg` })}>
                  <Img src={`${P}/gulbarg-${(i % 5) + 1}.webp`} contain eager />
                </span>
              ))}
            </div>
          )}
          <p className={cx(st.serifI, "text-center")} style={{ fontSize: v(46, 60), lineHeight: 1.05, color: "var(--ink)", overflowWrap: "anywhere", marginBottom: v(10, 12) }}>
            {sent ? (sent === "not_coming" ? t("Rahmat!") : t("Rahmat! Sizni kutamiz")) : t("Kelasizmi?")}
          </p>
          {sent ? (
            <div className={cx(st.thanks, "flex flex-col items-center text-center")} style={{ gap: U(16), paddingTop: U(16), paddingBottom: U(wide ? 24 : 12) }}>
              <p className={st.sans} style={{ fontSize: v(16, 18), color: "var(--muted)", lineHeight: 1.5 }}>
                {sent === "not_coming" ? t("Javobingiz uchun rahmat — sizni duolarimizda eslaymiz.") : t("{name} — {count} kishi. Javobingiz yetkazildi.", { name: name.trim() || t("Javobingiz"), count })}
              </p>
              <button type="button" onClick={() => setSent(null)} className={st.sans} style={{ color: "var(--olive)", fontSize: v(15, 16), textDecoration: "underline", textUnderlineOffset: 3 }}>
                {t("Javobni o‘zgartirish")}
              </button>
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: v(12, 14) }}>
              <p className={cx(st.sans, "text-center")} style={{ fontSize: v(16, 18), lineHeight: 1.45, color: "var(--muted)", marginBottom: U(6) }}>
                {d.rsvpUntil ? t("Iltimos, javobingizni {date} qoldiring", { date: d.rsvpUntil }) : t("Iltimos, javobingizni qoldiring")}
              </p>
              <label className="flex flex-col" style={{ gap: v(12, 14) }}>
                {label(t("ISM-FAMILIYA"))}
                <input className={st.field} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={t("Ismingiz")} style={{ fontSize: U(17), padding: pad, borderRadius: U(14) }} />
              </label>
              <div style={{ height: U(2) }} />
              {label(t("JAVOBINGIZ"))}
              <div className="flex" role="radiogroup" aria-label={t("Kelasizmi?")} style={{ gap: U(8) }}>
                {(
                  [
                    ["coming", "Albatta kelaman"],
                    ["not_coming", "Kela olmayman"],
                  ] as const
                ).map(([s, l]) => (
                  <button key={s} type="button" role="radio" aria-checked={status === s} onClick={() => setStatus(s)} className={st.choice} style={{ padding: `${v(10, 12)} ${U(8)}`, minHeight: v(51, 55), fontSize: v(14, 15) }}>
                    <span style={{ overflowWrap: "anywhere" }}>{t(l)}</span>
                  </button>
                ))}
              </div>
              {status === "coming" && (
                <div className="flex items-center" style={{ gap: U(6), marginTop: U(2) }}>
                  <p className={st.sans} style={{ flex: "1 1 0", minWidth: 0, fontSize: v(14, 15), color: "var(--ink)" }}>
                    {t("Necha kishi bo‘lasiz?")}
                  </p>
                  <button type="button" className={st.step} disabled={count <= 1} onClick={() => setCount((c) => Math.max(1, c - 1))} aria-label={t("Kamaytirish")} style={{ width: U(32), height: U(32), fontSize: U(21) }}>
                    −
                  </button>
                  <span className={st.sansM} style={{ width: U(32), textAlign: "center", fontSize: U(19), color: "var(--ink)" }} aria-live="polite">
                    {count}
                  </span>
                  <button type="button" className={st.step} disabled={count >= 20} onClick={() => setCount((c) => Math.min(20, c + 1))} aria-label={t("Ko‘paytirish")} style={{ width: U(32), height: U(32), fontSize: U(21) }}>
                    +
                  </button>
                </div>
              )}
              <div style={{ height: U(4) }} />
              <label className="flex flex-col" style={{ gap: v(12, 14) }}>
                {label(t("Tilaklaringiz"))}
                <textarea className={st.field} value={wish} onChange={(e) => setWish(e.target.value)} maxLength={500} placeholder={t("Yosh oilaga bir-ikki so‘z…")} style={{ fontSize: U(17), padding: pad, borderRadius: U(14), height: v(96, 100) }} />
              </label>
              {err && (
                <p className={st.sans} style={{ color: "#b3261e", fontSize: U(14) }}>
                  {err}
                </p>
              )}
              <button type="submit" disabled={busy} className={st.btnOlive} style={{ marginTop: U(8), padding: v(18, 20), fontSize: v(17, 18), opacity: busy ? 0.7 : 1 }}>
                {busy ? t("Yuborilmoqda…") : t("Javobni yuborish")}
              </button>
            </div>
          )}
        </form>
        <L r={wide ? [-20, 100, 620, 348.75] : [-9, 80, 360, 202.5]} a="drop" z={3} style={vars({ "--dy": -60, "--d": "0.35s" })}>
          <Img src={`${P}/girlyanda.webp`} />
        </L>
      </div>
    </Sec>
  );
}

/* ═════════════ 09 · Final — darvoza yopiladi ═════════════ */
function Final({ d, wide, ready, z, onSeen }: { d: D; wide: boolean; ready: boolean; z: number; onSeen: () => void }) {
  const t = useT();
  const v: V = (m, l) => U(wide ? l : m);
  const dl = useRef<HTMLDivElement>(null);
  const dr = useRef<HTMLDivElement>(null);
  const onP = useCallback(
    (p: number) => {
      // tabaqalar sekin yopiladi: rotateY ∓82° → 0
      const f = seg(p, 0.25, 0.62);
      const e = f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2;
      const a = (82 * (1 - e)).toFixed(2);
      if (dl.current) dl.current.style.transform = `perspective(1400px) rotateY(${a}deg)`;
      if (dr.current) dr.current.style.transform = `perspective(1400px) rotateY(-${a}deg)`;
      if (p > 0.45) onSeen();
    },
    [onSeen],
  );
  let k = 0;
  const title = t("Sizni kutamiz!");
  const frame: Box = wide ? [510, 300, 420, 746.67] : [35, 250, 320, 568.89];
  const c0 = doorClosed(frame, false);
  const c1 = doorClosed(frame, true);
  return (
    <Sec ready={ready} z={z} onP={onP} style={{ height: v(960, 1120), background: "#dce7f0" }}>
      <div className="absolute inset-0 overflow-hidden" style={{ pointerEvents: "none" }}>
        <div className="absolute" style={wide ? { inset: 0 } : { left: U(-75), top: 0, width: U(540), height: "100%" }}>
          <Img src={`${P}/osmon.webp`} />
        </div>
      </div>
      <Pic src={`${P}/girlyanda.webp`} r={wide ? [340, -200, 760, 427.5] : [-25, -130, 440, 247.5]} z={2} />
      <h2 className={cx(st.serifI, "absolute inset-x-0 text-center")} style={{ top: v(110, 120), lineHeight: 1, zIndex: 3, color: "var(--ink)" }}>
        <Fit base={wide ? 88 : 58} max={wide ? 1200 : 360} deps={title}>
          {[...title].map((ch, i) => (
            <span key={i} data-w className={st.word} style={vars({ "--d": `${(0.2 + 0.04 * k++).toFixed(2)}s` })}>
              {ch}
            </span>
          ))}
        </Fit>
      </h2>
      <p data-a="up" className={cx(st.serifB, "absolute inset-x-0 text-center")} style={vars({ top: v(184, 226), color: "var(--gold)", zIndex: 3, "--d": "0.7s", "--y": 20 })}>
        <Fit base={wide ? 28 : 22} max={wide ? 1200 : 360} deps={d.finalLine}>
          {d.finalLine}
        </Fit>
      </p>
      <Pic src={`${P}/darvoza.webp`} r={frame} z={2} />
      <div ref={dl} className={cx("absolute", st.finalDoor)} style={{ left: U(c0[0]), top: U(c0[1]), width: U(c0[2]), height: U(c0[3]), zIndex: 2, transformOrigin: "0 50%", transform: "perspective(1400px) rotateY(82deg)", willChange: "transform" }}>
        <Img src={`${P}/tabaqa.webp`} style={{ objectFit: "fill" }} />
      </div>
      <div ref={dr} className={cx("absolute", st.finalDoor)} style={{ left: U(c1[0]), top: U(c1[1]), width: U(c1[2]), height: U(c1[3]), zIndex: 2, transformOrigin: "100% 50%", transform: "perspective(1400px) rotateY(-82deg)", willChange: "transform" }}>
        <Img src={`${P}/tabaqa.webp`} className={st.flipX} style={{ objectFit: "fill" }} />
      </div>
      <Pic src={`${P}/atirgul.webp`} r={wide ? [330, 520, 320, 568.89] : [-80, 560, 220, 391.11]} z={4} a="grow" />
      <Pic src={`${P}/atirgul.webp`} r={wide ? [790, 500, 320, 568.89] : [250, 540, 220, 391.11]} flip z={4} a="grow" />
      {wide ? (
        <>
          <Petal c={[268.4, 408.4, 54, 20]} k={5} />
          <Petal c={[1178.9, 425.3, 48, -25]} k={4} />
        </>
      ) : (
        <>
          <Petal c={[55, 323.1, 44, 20]} k={5} />
          <Petal c={[344.1, 334.4, 40, -25]} k={4} />
        </>
      )}
    </Sec>
  );
}

/* ═════════════ Sahifa ═════════════ */
type Key = "welcome" | "date" | "venue" | "program" | "details" | "dress" | "moments" | "rsvp" | "final";
/** Keyingi bo‘limning yuqoriga chiqib turadigan bezagi (mobil, laptop) — matn ustiga tushmasin */
const OVER: Record<Key, [number, number]> = {
  welcome: [0, 0],
  date: [118, 165],
  venue: [0, 0],
  program: [80, 200],
  details: [0, 0],
  dress: [0, 0],
  moments: [118, 0],
  rsvp: [68, 95],
  final: [120, 180],
};
/** Har bo‘lim ostidagi bo‘sh joy (Figma bo‘yicha) — keyingi bo‘lim bezagi shundan katta bo‘lsa, bo‘lim cho‘ziladi */
const ROOM: Record<Key, [number, number]> = {
  welcome: [127, 120],
  date: [99, 110],
  venue: [300, 380],
  program: [118, 160],
  details: [150, 190],
  dress: [110, 130],
  moments: [72, 120],
  rsvp: [230, 240],
  final: [0, 0],
};

export function ShatoSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const [revealed, setRevealed] = useState(!withGate);
  const ready = revealed;
  const loaded = usePreload(
    [`${P}/osmon.webp`, `${P}/darvoza.webp`, `${P}/tabaqa.webp`, `${P}/girlyanda.webp`, `${P}/atirgul.webp`, ...(wide ? [`${P}/daraxt.webp`] : [])],
    [`${P}/butalar.webp`, d.photo1 ?? "", `${P}/qasr.webp`, `${P}/daraxt.webp`, `${P}/i-qadahlar.webp`, `${P}/i-uzuklar.webp`, `${P}/i-dasturxon.webp`, `${P}/i-tort.webp`, ...(d.dress ? d.dress.imgs.map((x) => x.src) : []), d.photo2 ?? ""],
    withGate,
    wide ? "l" : "m",
  );
  useReveal(root, ready, embedded);
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

  const shown: Key[] = (["welcome", "date", "venue", "program", "details", "dress", "moments", "rsvp", "final"] as Key[]).filter((k) =>
    k === "date"
      ? d.hasDate
      : k === "program"
        ? d.program.length > 0
        : k === "details"
          ? !!(d.gifts || d.flowers || d.contact || d.tel || d.tg)
          : k === "dress"
            ? !!d.dress
            : k === "moments"
              ? !!(d.photo2 || d.quote)
              : k === "rsvp"
                ? data.rsvpEnabled
                : true,
  );
  const wi = wide ? 1 : 0;
  const tail = (k: Key) => {
    const i = shown.indexOf(k);
    const next = shown[i + 1];
    if (!next) return 0;
    return Math.max(0, OVER[next][wi] - ROOM[k][wi]);
  };
  const z = (k: Key) => 6 + shown.indexOf(k);
  const linkable = mode !== "preview";

  return (
    <div ref={root} className={cx(st.root, wide && st.wide)}>
      <div className={st.page} style={vars({ "--u": wide ? "calc(100cqw / 1440)" : "calc(100cqw / 390)" })}>
        <MusicButton m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/belgi.svg`} />}
        {withGate && (loaded ? <Gate d={d} wide={wide} onReveal={() => setRevealed(true)} onStart={() => music.play(true)} /> : <div style={{ height: "230svh", marginBottom: "-100svh", width: "100%" }} />)}
        {embedded && <Gate d={d} wide={wide} still onReveal={() => {}} onStart={() => {}} />}
        <Welcome d={d} wide={wide} ready={ready} tail={tail("welcome")} z={z("welcome")} />
        <DateSec d={d} wide={wide} ready={ready} tail={tail("date")} z={z("date")} />
        <Venue d={d} wide={wide} ready={ready} tail={tail("venue")} z={z("venue")} linkable={linkable} />
        <Program d={d} wide={wide} ready={ready} tail={tail("program")} z={z("program")} />
        <Details d={d} wide={wide} ready={ready} tail={tail("details")} z={z("details")} linkable={linkable} />
        <Dress d={d} wide={wide} ready={ready} tail={tail("dress")} z={z("dress")} />
        <Moments d={d} wide={wide} ready={ready} tail={tail("moments")} z={z("moments")} />
        {data.rsvpEnabled && <Rsvp d={d} wide={wide} ready={ready} slug={data.slug} mode={mode} tail={tail("rsvp")} z={z("rsvp")} />}
        <Final d={d} wide={wide} ready={ready} z={z("final")} onSeen={onFinal} />
        <footer className={st.footer} style={{ height: U(wide ? 160 : 170), paddingTop: U(wide ? 42 : 50), gap: U(wide ? 10 : 10) }}>
          <a href="https://shohnoma.uz" className={st.serifI} style={{ fontSize: U(wide ? 32 : 30), lineHeight: 1.2 }}>
            Shohnoma
          </a>
          <span className={st.sans} style={{ fontSize: U(wide ? 15 : 14), opacity: 0.75 }}>
            {t("Taklifnoma shohnoma.uz da yaratildi")}
          </span>
        </footer>
      </div>
    </div>
  );
}
