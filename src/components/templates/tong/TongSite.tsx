"use client";

import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { inviteNames, splitDate, tashkentDate } from "@/lib/display";
import { musicSrc } from "@/lib/music";
import { tr, useLocale, useT, type Locale } from "@/lib/i18n";
import type { InvitationSiteProps } from "@/components/invitation/types";
import { fetchSavedAnswer, loadSavedRsvp, rsvpUrl, saveRsvp, type RsvpStatus } from "@/components/invitation/Rsvp";
import { guestHello, useGuestName } from "../shared/guest";
import { timerUnits } from "@/components/invitation/data";
import { useCountdown, useCountUp, useInView, useScrollProgress, useWide } from "../shared/hooks";
import { Loader, usePreload, useMusic } from "../shared/runtime";
import { calendarWords, coordsFrom, downloadIcs, untilPhrase, type ProgramItem } from "../anor/data";
import { DRESS_TEXT, MSG_BRIDE, MSG_GROOM, MSG_PLAIN, P, SUB_BRIDE, SUB_GROOM, SUB_PLAIN, TONG_DEMO, TONG_DEMO_EN, TONG_DEMO_RU } from "./data";
import { FINAL_L, FINAL_M, GATE_L, GATE_M, HERO_L, HERO_M, type Star } from "./stars";
import st from "./tong.module.css";

/* ── Birliklar ──
 * U — joriy `--u`. Bo‘limlarda — kontent ustuni (Figma mobil 390 koordinatalari; laptopda ustun = mobil × 1.2, ya’ni 468px / 1440 —
 * Figma «Kontent ustuni (mobil ×1.2)»). C — laptop kanvasi (1440) birligi: yon girih naqshlari va yulduzlar.
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

/* Ranglar (Figma «23 · Tong — Assets») */
const GOLD = "#E9C27A";
const PLUM = "#5B3A7A";
const NAVY = "#1B1F4B";
const INK = "#262133";

/** Server yaratadigan standart taklif matni (php/api/lib/orders.php DEFAULT_MESSAGE) — har qaysi tilda */
const SERVER_DEFAULT = "Aziz mehmonlar! Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.";
const isServerDefault = (m: string) => (["uz", "ru", "en"] as Locale[]).some((l) => tr(l, SERVER_DEFAULT).trim() === m.trim());

function useData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO = lang === "ru" ? TONG_DEMO_RU : lang === "en" ? TONG_DEMO_EN : TONG_DEMO;
  const ex = (data.extra ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof ex[k] === "string" ? (ex[k] as string).trim() : typeof ex[k] === "number" ? String(ex[k]) : "");
  const sd = splitDate(data.date);
  const guest = useGuestName();
  return useMemo(() => {
    const cw = calendarWords(lang);
    const exProgram = Array.isArray(ex.program) ? (ex.program as ProgramItem[]).filter((p) => p?.time && p?.title) : [];
    const photos = (data.photos ?? []).filter(Boolean) as string[];
    const date = sd ? new Date(`${sd.iso}T12:00:00Z`) : null;
    // namunadagi ismlar tarjima qilinadi (mijoz ma’lumoti — o‘zgarishsiz); A — kuyov, B — kelin
    const a = ((demo ? t(data.personA) : data.personA) || "").trim();
    const b = ((demo ? t(data.personB || "") : data.personB) || "").trim();
    const hosts = demo ? t(DEMO.hosts) : str("hosts");
    // marosim: nikoh (asosiy) yoki fotiha — matndagi «nikoh to‘yi» / «fotiha to‘yi»
    const kind = t(data.ceremony === "fotiha" ? "tong::fotiha to‘yi" : "tong::nikoh to‘yi");
    const Kind = kind.charAt(0).toLocaleUpperCase(lang) + kind.slice(1);
    // taklif kim nomidan: kuyov tomoni (Figma) yoki kelin tomoni
    const bride = str("side") === "Kelin tomoni";
    const names = inviteNames(a, b, "nikoh");
    const time = sd?.time ?? "";
    const program = (demo ? DEMO.program : exProgram.length ? exProgram : ((data.program ?? []) as ProgramItem[])) as ProgramItem[];
    const raw = (demo ? "" : data.message || "").trim();
    const custom =
      raw && !isServerDefault(raw)
        ? raw.replace(/^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Muhtaram mehmonlar!|Assalomu alaykum!|Дорогие гости!|Dear guests!)\s*/, "").trim()
        : "";
    // matnlarda — faqat ism (familiyasiz): «O‘g‘limiz Abdurahmonbek va kelinimiz Gulchehraxonning …»
    const first = (s: string) => s.split(/\s+/)[0] || "";
    const a1 = first(a);
    const b1 = first(b);
    const message = custom || (a1 && b1 ? t(bride ? MSG_BRIDE : MSG_GROOM, { a: a1, b: b1, kind }) : t(MSG_PLAIN, { kind, Kind }));
    const subName = bride ? b1 : a1;
    const sub = subName ? t(bride ? SUB_BRIDE : SUB_GROOM, { name: subName, kind }) : t(SUB_PLAIN, { kind, Kind });
    const code = str("dressCode") || (demo ? DEMO.dressCode : "");
    const dressNote = str("dressNote") || (DRESS_TEXT[code] ? t(DRESS_TEXT[code]) : "");
    const venueTitle = ((demo ? t(data.venueName) : data.venueName) || "").trim();
    const address = ((demo ? DEMO.address : data.address) || "").trim();
    const coords = coordsFrom(data.mapUrl);
    const m = date ? date.getUTCMonth() : 0;
    const year = date ? date.getUTCFullYear() : 0;
    const day = date ? date.getUTCDate() : 0;
    // namunada javob muddati — Figma’dagidek sanadan 4 kun oldin («10-dekabrgacha» — 14-dekabr uchun)
    const deadline = demo && sd ? new Date(Date.UTC(year, m, day - 4)).toISOString().slice(0, 10) : data.rsvpDeadline;
    const wd = date ? cw.weekday[date.getUTCDay()] : "";
    // «14-dekabr» / «14 декабря» / «14 December»
    const dayMonth = date ? (lang === "uz" ? `${day}-${cw.monthsAfterDay[m]}` : `${day} ${cw.monthsAfterDay[m]}`) : "";
    // hero: «14-dekabr, yakshanba» / «14 декабря, воскресенье» / «Sunday, 14 December»
    const heroDate = date ? (lang === "en" ? `${wd}, ${dayMonth}` : `${dayMonth}, ${wd.toLocaleLowerCase(lang)}`) : "";
    // mijoz suratlari: 1–3 — «Tong dasturxoni», 4 — «Manzil»; bo‘sh slot o‘rnida shablonning surati
    const own = demo ? [] : photos;
    return {
      a,
      b,
      names,
      hosts,
      /** ochilish va final ostidagi qator: mezbonlar, bo‘lmasa — kuyov va kelin */
      signer: hosts || names,
      sub,
      time,
      heroDate,
      /** «14-dekabr · soat 06:00» */
      oshLine: [dayMonth, time ? t("soat {time}", { time }) : ""].filter(Boolean).join(" · "),
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
      gallery: [own[0] || `${P}/qozon.webp`, own[1] || `${P}/sabzi.webp`, own[2] || `${P}/choy.webp`],
      hall: own[3] || `${P}/zal.webp`,
      rsvpUntil: untilPhrase(deadline, lang),
      calTitle: names ? t("{names} — nahorgi osh", { names }) : t("Nahorgi osh"),
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

/** Girih naqshlari — skrollda sekin parallaks (`--py`, ±40px; Figma: 0.4×). Faqat `translate` — paydo bo‘lish va aylanish bilan to‘qnashmaydi */
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
        const k = +(x.dataset.pk || 0.1);
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

/**
 * Girih naqshi (Figma «Tong / Naqsh (girih)», oltin chiziqlar): tashqi qavat — joy, shaffoflik va parallaks (`data-px`),
 * o‘rta — paydo bo‘lish (`data-a`), ichki — sekin aylanish (60 s / aylanish).
 */
function Naqsh({ box, unit, op = 1, d = 0, px, pk, className, still }: { box: readonly [number, number, number, number]; unit: Pos; op?: number; d?: number; px?: boolean; pk?: number; className?: string; still?: boolean }) {
  const [x, y, w, h] = box;
  return (
    <div aria-hidden data-px={px ? "" : undefined} data-pk={pk} className={cx(st.art, className)} style={{ left: unit(x), top: unit(y), width: unit(w), height: unit(h), opacity: op }}>
      <div data-a="pop" className={st.fill} style={vars({ "--d": `${d}s` })}>
        <div className={cx(st.fill, !still && st.spin)}>
          <Img src={`${P}/naqsh.svg`} />
        </div>
      </div>
    </div>
  );
}

/**
 * Yulduzlar (Figma ellipslari): chap — bo‘lim enining foizida (keng ekranda ham butun fon bo‘ylab), tepa — `top(y)`.
 * Ikki guruh turli tezlikda miltillaydi.
 */
function Stars({ list, W, top, size, twinkle, className, style }: { list: readonly Star[]; W: number; top: Pos; size: Pos; twinkle: boolean; className?: string; style?: CSSProperties }) {
  return (
    <div aria-hidden className={cx(st.stars, className)} style={style}>
      {list.map(([x, y, s, o], i) => (
        <span
          key={i}
          className={cx(st.star, twinkle && (i % 3 === 0 ? st.twA : i % 3 === 1 ? st.twB : undefined))}
          style={{ left: `${((x / W) * 100).toFixed(3)}%`, top: top(y), width: size(s), height: size(s), opacity: o }}
        />
      ))}
    </div>
  );
}

/** Quyosh (Figma: doira, #FFE09E → #F2A65A) va uning nuri (blur doira 35% — nur.svg, quyosh qutisidan 1.556 barobar katta) */
function Sun({ box, unit, left = unit, top = unit, nurClass, sunClass, className, style }: { box: readonly [number, number, number]; unit: Pos; left?: Pos; top?: Pos; nurClass?: string; sunClass?: string; className?: string; style?: CSSProperties }) {
  const [x, y, s] = box;
  // Figma: nur qutisi = quyosh × 1.8; nur.svg (blur) = nur qutisi × 1.5556 (inset −27.78%)
  const n = s * 1.8 * 1.5556;
  return (
    <div aria-hidden className={cx(st.art, className)} style={{ left: left(x + s / 2), top: top(y + s / 2), width: 0, height: 0, ...style }}>
      <div className={cx(st.nur, nurClass)} style={{ left: unit(-n / 2), top: unit(-n / 2), width: unit(n), height: unit(n) }}>
        <Img src={`${P}/nur.svg`} eager />
      </div>
      <span className={cx(st.sun, sunClass)} style={{ left: unit(-s / 2), top: unit(-s / 2), width: unit(s), height: unit(s) }} />
    </div>
  );
}

/* ═════════════ 00 · Ochilish — tun, ufq (faqat scroll bilan, --o: 0…1) ═════════════
 * Yuklanganda (bosishsiz): yulduzlar miltillaydi, ufq chizig‘i markazdan ikki tomonga oltin rangda chiziladi, quyosh ufq ortidan
 * sekin ko‘tarilib Figma holatiga keladi (y +120 → 0, 2.2 s), sarlavha sokin chiqadi.
 * Scroll (rAF lerp): quyosh ufqdan ko‘tariladi va kattalashadi, nuri kengayadi; osmon tundan tongga o‘tadi (fon qatlami — orqasida
 * kontent yo‘q, «sharpa» bo‘lmaydi), yulduzlar so‘nadi, ufq yorishadi. Ochilish tugagach sahna odatdagidek yuqoriga ketadi va hero (01)
 * ostidan chiqadi (Figma tartibi: 00 ostida 01; qattiq chok). */
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
  const pageU = wide ? CANVAS_L : COL_M;
  // ustun koordinatalari (mobil 390) → sahna; laptopda × 1.2 + 486
  const X = (x: number) => `calc(50% + ${U(OX + S * x - W / 2)})`;
  const Y = (y: number) => `calc(100% - ${U(H - S * y)})`;
  const Z = (n: number) => U(S * n);
  // kanvas koordinatasi (yulduzlar) — pastki chetga bog‘langan
  const Yc = (y: number) => `calc(100% - ${U(H - y)})`;
  return (
    <div
      ref={wrap}
      className={cx(st.gateWrap, still && st.still)}
      style={vars(still ? { "--u": pageU, "--o": 0, height: U(H) } : { "--u": `min(${pageU}, calc(100svh / ${H}))` })}
    >
      <div className={st.gate} aria-label={t("Taklifnoma")} style={still ? { position: "relative", height: "100%" } : undefined}>
        <div aria-hidden className={st.gBg} />
        {/* tong osmoni — faqat ufqdan yuqorida (fon qatlami) */}
        <div aria-hidden className={st.gDawn} style={{ height: Y(560) }} />
        <Stars list={wide ? GATE_L : GATE_M} W={W} top={Yc} size={U} twinkle={!still} className={st.gStars} />
        {/* quyosh: yuklanganda ufq ortidan chiqadi (gRise), scroll bilan yana ko‘tariladi (gSun) */}
        <div className={st.gSun} style={vars({ "--rise": Z(-176) })}>
          <div className={st.gRise} style={vars({ "--from": Z(120) })}>
            <Sun box={[135, 520, 120]} unit={Z} left={X} top={Y} nurClass={st.gNur} />
          </div>
        </div>
        {/* ufq: oltin chiziq va yorug‘lik */}
        <span aria-hidden className={st.gGlow} style={{ top: Y(560 - 40), height: Z(80) }} />
        <span aria-hidden className={st.gLine} style={{ top: Y(560), height: Z(1) }} />
        {/* yer — quyoshni yashiradi */}
        <div aria-hidden className={st.gGround} style={{ top: Y(561) }} />
        <h1 className={cx(st.fo, st.gIn, "absolute text-center")} style={vars({ left: X(24), width: Z(342), top: Y(620), height: Z(46), lineHeight: `${Z(46)}`, fontSize: Z(46), color: "#fff", whiteSpace: "nowrap", "--gd": "0.25s" })}>
          <Fit base={46 * S} max={342 * S} deps={t("Nahorgi osh")}>
            {t("Nahorgi osh")}
          </Fit>
        </h1>
        {d.signer && (
          <p className={cx(st.mr5, st.gIn, "absolute text-center")} style={vars({ left: X(24), width: Z(342), top: Y(690), fontSize: Z(16), lineHeight: `${Z(22)}`, color: GOLD, overflowWrap: "anywhere", "--gd": "0.45s" })}>
            {d.signer}
          </p>
        )}
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

/** Sarlavha (Forum 38, markazda, 360 da sig‘adi) */
function Title({ text, color = PLUM, d = 0, size = 38, h = 42, style }: { text: string; color?: string; d?: number; size?: number; h?: number; style?: CSSProperties }) {
  return (
    <p data-a="up" className={cx(st.fo, "text-center")} style={vars({ height: U(h), fontSize: U(size), lineHeight: `${U(h)}`, color, whiteSpace: "nowrap", "--d": `${d}s`, ...(style as Record<string, string>) })}>
      <Fit base={size} max={342} deps={text}>
        {text}
      </Fit>
    </p>
  );
}

/* ═════════════ 01 · Hero — tong otdi: «06:00» raqamlari birin-ketin yorishadi, quyosh nuri «nafas oladi» (1 ↔ 1.06, 4 s),
 * girih naqshlari sekin aylanadi (60 s) va skrollda parallaks; quyosh pastdan ko‘tarilib chiqadi ═════════════ */
function Hero({ d, z, wide, still }: { d: D; z: number; wide: boolean; still: boolean }) {
  const t = useT();
  const chars = Array.from(d.time);
  return (
    <Sec
      z={z}
      bg="heroBg"
      colStyle={{ height: U(900) }}
      outer={
        <>
          <Stars list={wide ? HERO_L : HERO_M} W={wide ? 1440 : 390} top={wide ? C : U} size={wide ? C : U} twinkle={!still} />
          <Side wide={wide}>
            <Naqsh box={[150, 260, 200, 200]} unit={C} op={0.45} px pk={0.12} d={0.2} still={still} />
            <Naqsh box={[1090, 420, 200, 200]} unit={C} op={0.45} px pk={0.12} d={0.3} still={still} />
          </Side>
        </>
      }
    >
      <div data-a="sun" className={st.fill} style={vars({ "--d": "0.1s" })}>
        <Sun box={[95, 400, 200]} unit={U} nurClass={!still ? st.breath : undefined} />
      </div>
      <Naqsh box={[-50, 470, 140, 140]} unit={U} op={0.5} px pk={0.1} d={0.35} still={still} />
      <Naqsh box={[300, 540, 120, 120]} unit={U} op={0.5} px pk={0.1} d={0.45} still={still} />
      {d.time && (
        <p className={cx(st.fo, "absolute text-center")} style={{ left: U(24), width: U(342), top: U(170), height: U(120), fontSize: U(120), lineHeight: `${U(120)}`, letterSpacing: "-0.02em", color: "#fff", whiteSpace: "nowrap" }}>
          <Fit base={120} max={342} deps={d.time}>
            {chars.map((ch, i) => (
              <span key={i} data-a="lit" className={st.lit} style={vars({ "--d": `${0.15 + i * 0.16}s` })}>
                {ch}
              </span>
            ))}
          </Fit>
        </p>
      )}
      <div className="absolute" style={{ left: U(24), width: U(342), top: U(320) }}>
        <Title text={t("Nahorgi osh")} color="#fff" size={40} h={40} d={0.9} />
      </div>
      {d.heroDate && (
        <p data-a="up" className={cx(st.mr6, "absolute text-center")} style={vars({ left: U(24), width: U(342), top: U(720), height: U(27), fontSize: U(20), lineHeight: `${U(27)}`, color: NAVY, whiteSpace: "nowrap", "--d": "0.2s" })}>
          <Fit base={20} max={342} deps={d.heroDate}>
            {d.heroDate}
          </Fit>
        </p>
      )}
      <p data-a="up" className={cx(st.mr, st.clamp3, "absolute text-center")} style={vars({ left: U(24), width: U(342), top: U(756), fontSize: U(16), lineHeight: `${U(22.4)}`, color: NAVY, "--d": "0.3s" })}>
        {d.sub}
      </p>
    </Sec>
  );
}

/* ═════════════ 02 · Taklif — «Assalomu alaykum, aziz mehmon!» (maxsus mehmon bo‘lsa — uning ismi), matn, «Hurmat bilan,» va imzo ═════════════ */
function Taklif({ d, z, wide, still }: { d: D; z: number; wide: boolean; still: boolean }) {
  const t = useT();
  const hello2 = d.guest ? guestHello(t, "Hurmatli {guest}!", d.guest) : t("aziz mehmon!");
  return (
    <Sec
      z={z}
      bg="white"
      colStyle={{ paddingTop: U(110), paddingBottom: U(117.8) }}
      outer={
        <Side wide={wide}>
          <Naqsh box={[190, 200, 160, 160]} unit={C} op={0.35} px pk={0.12} d={0.1} still={still} />
          <Naqsh box={[1090, 300, 160, 160]} unit={C} op={0.35} px pk={0.12} d={0.2} still={still} />
        </Side>
      }
    >
      {/* chok ustidagi naqsh (01/02) */}
      <Naqsh box={[135, -60, 120, 120]} unit={U} className={st.seam} still={still} />
      <div data-a="up" className={cx(st.fo, "relative text-center")} style={vars({ color: PLUM, "--d": "0.05s" })}>
        <NameLines text={t("Assalomu alaykum,")} base={36} max={342} lh={41.4} two={30} twoLh={34.5} />
        <NameLines text={hello2} base={36} max={342} lh={41.4} two={28} twoLh={33} />
      </div>
      <p
        data-a="up"
        className={cx(st.mr, "relative mx-auto text-center")}
        style={vars({ marginTop: U(47.2), width: U(330), fontSize: U(18), lineHeight: `${U(28.8)}`, color: INK, overflowWrap: "anywhere", whiteSpace: "pre-line", "--d": "0.12s" })}
      >
        {d.message}
      </p>
      {d.signer && (
        <div data-a="up" className={cx(st.mr6, "relative mx-auto text-center")} style={vars({ marginTop: U(86), width: U(342), fontSize: U(18), lineHeight: `${U(26.1)}`, color: PLUM, overflowWrap: "anywhere", "--d": "0.2s" })}>
          <p>{t("Hurmat bilan,")}</p>
          <p>{d.signer}</p>
        </div>
      )}
    </Sec>
  );
}

/* ═════════════ 03 · Tong dasturxoni — galereya (katta surat va ikkita kichik; mijoz suratlari, bo‘lmasa — shablonniki) ═════════════ */
function Gallery({ d, z }: { d: D; z: number }) {
  const t = useT();
  const boxes = [
    [24, 170, 342, 256],
    [24, 436, 166, 236],
    [200, 436, 166, 236],
  ] as const;
  return (
    <Sec z={z} bg="white" colStyle={{ height: U(760) }}>
      <div className="absolute inset-x-0" style={{ top: U(90) }}>
        <Title text={t("Tong dasturxoni")} />
      </div>
      {boxes.map(([x, y, w, h], i) => (
        <div key={i} data-a="zoom" className={cx(st.photo, "absolute")} style={vars({ left: U(x), top: U(y), width: U(w), height: U(h), borderRadius: U(20), "--d": `${0.1 + i * 0.14}s` })}>
          <Img src={d.gallery[i]} className={st.zoomImg} />
        </div>
      ))}
    </Sec>
  );
}

/* ═════════════ 04 · Osh va taymer — lagan surati oltin halqa ichida sekin aylanadi (40 s), taymer raqamlari yumshoq varaqlanadi ═════════════ */
/**
 * Raqamlar doim 2 xonali («05»). Sanoq tugagach o‘zgargan raqam yuqoridan sekin tushadi — shaffofliksiz, kesilmasdan:
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

function Osh({ d, z, still }: { d: D; z: number; still: boolean }) {
  const t = useT();
  const units = timerUnits(useLocale());
  const c = useCountdown(d.target);
  const [ref, inView] = useInView<HTMLDivElement>(0.3, true);
  if (!d.hasDate || !c) return null;
  const vals = [c.d, c.h, c.m, c.s];
  return (
    <Sec z={z} bg="navy" colStyle={{ height: U(820) }}>
      <div data-a="zoom" className={cx(st.lagan, "absolute")} style={vars({ left: U(45), top: U(70), width: U(300), height: U(300), "--d": "0.05s" })}>
        <div className={cx(st.fill, !still && st.spinSlow)}>
          <Img src={`${P}/osh.webp`} className={st.cover} />
        </div>
      </div>
      <svg aria-hidden viewBox="0 0 320 320" data-a="ring" className={cx(st.ring, "absolute")} style={vars({ left: U(35), top: U(60), width: U(320), height: U(320), "--d": "0.2s" })}>
        <circle cx="160" cy="160" r="159.4" fill="none" stroke={GOLD} strokeWidth={1.2} pathLength={1} />
      </svg>
      <div className="absolute inset-x-0" style={{ top: U(420) }}>
        <Title text={t("Oshgacha qoldi")} color="#fff" size={34} h={38} d={0.1} />
      </div>
      <div ref={ref}>
        {vals.map((v, i) => (
          <div key={i} data-a="flip" className={cx(st.tbox, "absolute")} style={vars({ left: U(28 + i * 86), top: U(490), width: U(76), height: U(92), borderRadius: U(18), "--d": `${0.15 + i * 0.1}s` })}>
            <p className={cx(st.fo, "absolute inset-x-0 text-center")} style={{ top: U(17), height: U(40), fontSize: U(36), lineHeight: `${U(40)}`, color: "#fff", whiteSpace: "nowrap" }}>
              <Fit base={36} max={70} deps={String(vals[0]).length}>
                <Digits value={v} run={inView} len={i === 0 ? Math.max(2, String(vals[0]).length) : 2} i={i} />
              </Fit>
            </p>
            <p className={cx(st.mr5, "absolute inset-x-0 text-center")} style={{ top: U(57), height: U(18), fontSize: U(13), lineHeight: `${U(18)}`, color: GOLD, whiteSpace: "nowrap" }}>
              <Fit base={13} max={70} deps={units[i]}>
                {units[i]}
              </Fit>
            </p>
          </div>
        ))}
      </div>
      {d.oshLine && (
        <p data-a="up" className={cx(st.mr6, "absolute inset-x-0 text-center")} style={vars({ top: U(610), height: U(23), fontSize: U(17), lineHeight: `${U(23)}`, color: "#fff", whiteSpace: "nowrap", "--d": "0.25s" })}>
          <Fit base={17} max={342} deps={d.oshLine}>
            {d.oshLine}
          </Fit>
        </p>
      )}
      <div data-a="up" className="absolute inset-x-0 flex justify-center" style={vars({ top: U(660), "--d": "0.32s" })}>
        <button
          type="button"
          className={cx(st.mr7, st.btnGold)}
          style={{ minWidth: U(250), height: U(56), padding: `0 ${U(24)}`, fontSize: U(16), borderRadius: U(28) }}
          onClick={() =>
            downloadIcs({
              title: d.calTitle,
              startLocal: `${d.iso}T${d.time || "06:00"}`,
              location: [d.venueTitle, d.address].filter(Boolean).join(", "),
              slug: "tong",
            })
          }
        >
          {t("Kalendarga qo‘shish")}
        </button>
      </div>
    </Sec>
  );
}

/* ═════════════ 05 · Tong tartibi — qatorlar chapdan siljib kiradi (stagger 0.12 s) ═════════════ */
function Program({ d, z, wide, still }: { d: D; z: number; wide: boolean; still: boolean }) {
  const t = useT();
  const items = d.program.slice(0, 8);
  if (!items.length) return null;
  return (
    <Sec
      z={z}
      bg="white"
      colStyle={{ paddingTop: U(90), paddingBottom: U(92) }}
      outer={
        <Side wide={wide}>
          <Naqsh box={[200, 240, 180, 180]} unit={C} op={0.4} px pk={0.12} d={0.1} still={still} />
          <Naqsh box={[1060, 360, 180, 180]} unit={C} op={0.4} px pk={0.12} d={0.2} still={still} />
        </Side>
      }
    >
      <Title text={t("Tong tartibi")} />
      <div className="relative mx-auto flex flex-col" style={{ marginTop: U(48), width: U(342), gap: U(16) }}>
        {items.map((it, i) => (
          <div key={i} data-a="left" className={cx(st.row, "flex items-center")} style={vars({ minHeight: U(80), borderRadius: U(20), padding: `${U(10)} ${U(16)} ${U(10)} ${U(21)}`, "--d": `${0.08 + i * 0.12}s` })}>
            <p className={cx(st.fo, "shrink-0")} style={{ width: U(98), fontSize: U(30), lineHeight: `${U(35)}`, color: PLUM, whiteSpace: "nowrap" }}>
              {it.time}
            </p>
            <p className={cx(st.mr6, st.clamp2)} style={{ minWidth: 0, flex: "1 1 auto", fontSize: U(17), lineHeight: `${U(23)}`, color: INK }}>
              {it.title}
            </p>
          </div>
        ))}
      </div>
    </Sec>
  );
}

/* ═════════════ 06 · Manzil — surat (mijozning 4-surati; bo‘lmasa — choyxona zali), joy nomi, manzil, xarita va yo‘nalish ═════════════ */
function Venue({ d, z, linkable }: { d: D; z: number; linkable: boolean }) {
  const t = useT();
  if (!d.hasPlace) return null;
  return (
    <Sec z={z} bg="venue" colStyle={{ paddingTop: U(90), paddingBottom: U(104) }}>
      <Title text={t("Manzil")} />
      <div data-a="zoom" className={cx(st.photo, "relative mx-auto")} style={vars({ marginTop: U(34), width: U(342), height: U(228), borderRadius: U(24), background: PLUM, "--d": "0.1s" })}>
        <Img src={d.hall} className={st.zoomImg} />
      </div>
      {d.venueTitle && (
        <p data-a="up" className={cx(st.fo, "mx-auto text-center")} style={vars({ marginTop: U(26), width: U(342), minHeight: U(29), fontSize: U(26), lineHeight: `${U(29)}`, color: INK, overflowWrap: "anywhere", "--d": "0.15s" })}>
          {d.venueTitle}
        </p>
      )}
      {d.address && (
        <p data-a="up" className={cx(st.mr, "mx-auto text-center")} style={vars({ marginTop: U(17), width: U(330), minHeight: U(48), fontSize: U(16), lineHeight: `${U(24)}`, color: INK, overflowWrap: "anywhere", "--d": "0.22s" })}>
          {d.address}
        </p>
      )}
      <div data-a="up" className="relative mx-auto flex" style={vars({ marginTop: U(46), width: U(342), gap: U(12), "--d": "0.3s" })}>
        <a href={linkable ? d.mapUrl : undefined} target="_blank" rel="noopener noreferrer" className={cx(st.mr7, st.btnNavy)} style={{ flex: "1 1 0", minWidth: 0, height: U(56), padding: `0 ${U(8)}`, fontSize: U(16), borderRadius: U(28) }}>
          {t("Xaritada ochish")}
        </a>
        <a href={linkable ? d.taxi : undefined} target="_blank" rel="noopener noreferrer" className={cx(st.mr7, st.btnLine)} style={{ flex: "1 1 0", minWidth: 0, height: U(56), padding: `0 ${U(8)}`, fontSize: U(16), borderWidth: U(1.2), borderRadius: U(28) }}>
          {t("Yo‘nalish")}
        </a>
      </div>
    </Sec>
  );
}

/* ═════════════ 07 · Dress-kod (ixtiyoriy — o‘chirilsa joy qolmaydi): oq karta — turi va izoh ═════════════ */
function Dress({ d, z }: { d: D; z: number }) {
  if (!d.dressNote && !d.dressTitle) return null;
  return (
    <Sec z={z} bg="peach" colStyle={{ paddingTop: U(30), paddingBottom: U(114) }}>
      <div data-a="rise" className={cx(st.card, "relative mx-auto flex flex-col items-center text-center")} style={{ width: U(342), padding: `${U(28)} ${U(26)}`, gap: U(10), borderRadius: U(24) }}>
        {d.dressTitle && (
          <p className={st.fo} style={{ height: U(39), fontSize: U(34), lineHeight: `${U(39)}`, color: PLUM, whiteSpace: "nowrap" }}>
            <Fit base={34} max={290} deps={d.dressTitle}>
              {d.dressTitle}
            </Fit>
          </p>
        )}
        {d.dressNote && (
          <p className={st.mr} style={{ width: "100%", fontSize: U(17), lineHeight: `${U(25.5)}`, color: INK, overflowWrap: "anywhere" }}>
            {d.dressNote}
          </p>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 08 · Anketa — fon kahraboridan tunga o‘tadi; «Kelaman» bosilsa kichik quyosh chiqib yorishadi ═════════════ */
function Rsvp({ d, slug, mode, z, still }: { d: D; slug: string; mode: InvitationSiteProps["mode"]; z: number; still: boolean }) {
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
  const [rise, setRise] = useState(0);
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
    <p className={cx(st.mr6, st.lbl)} style={{ marginTop: U(mt), height: U(19), fontSize: U(14), lineHeight: `${U(19)}` }}>
      {s}
    </p>
  );
  const sub = d.rsvpUntil ? t("Iltimos, {date} javob bering", { date: d.rsvpUntil }) : t("Javobingizni kutamiz");
  const pick = (s: RsvpStatus) => {
    setStatus(s);
    if (s === "coming") setRise((n) => n + 1);
  };
  return (
    <Sec z={z} bg="dusk" id="tong-javob" colStyle={{ paddingTop: U(100), paddingBottom: U(70) }}>
      {/* chok ustidagi naqsh (07/08) */}
      <Naqsh box={[135, -60, 120, 120]} unit={U} className={st.seam} still={still} />
      <h2 data-a="up" className={cx(st.fo, "mx-auto text-center")} style={vars({ width: U(342), fontSize: U(40), lineHeight: `${U(44)}`, color: "#fff", overflowWrap: "anywhere", "--d": "0.05s" })}>
        {t("Kelasizmi?")}
      </h2>
      <p data-a="up" className={cx(st.mr, "mx-auto text-center")} style={vars({ marginTop: U(14), width: U(342), minHeight: U(22), fontSize: U(16), lineHeight: `${U(22)}`, color: "rgba(255,255,255,.8)", overflowWrap: "anywhere", "--d": "0.12s" })}>
        {sub}
      </p>
      <div data-a="rise" className={cx(st.card, "relative mx-auto")} style={vars({ marginTop: U(30), width: U(342), padding: `${U(24)} ${U(22)} ${U(58)}`, borderRadius: U(26), "--d": "0.2s" })}>
        {sent ? (
          <div key="thanks" className={cx(st.thanks, "relative flex flex-col items-center text-center")} style={{ padding: `${U(56)} ${U(6)} ${U(10)}`, gap: U(16), minHeight: U(480) }}>
            <div aria-hidden className="relative" style={{ width: U(110), height: U(110) }}>
              <Sun box={[25, sent === "not_coming" ? 40 : 25, 60]} unit={U} nurClass={!still ? st.breath : undefined} className={sent === "not_coming" ? st.sunLow : undefined} />
            </div>
            <p className={st.fo} style={{ fontSize: U(sent === "not_coming" ? 32 : 28), lineHeight: 1.2, color: PLUM, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Rahmat!") : t("Rahmat! Joyingiz band qilindi")}
            </p>
            <p className={st.mr} style={{ fontSize: U(17), color: INK, lineHeight: 1.5, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Javobingiz uchun rahmat!") : t("{name} — {count} kishi. Javobingiz yetkazildi.", { name: name.trim() || t("Javobingiz"), count })}
            </p>
            <button type="button" onClick={() => setSent(null)} className={st.mr6} style={{ fontSize: U(16), color: PLUM, textDecoration: "underline", textUnderlineOffset: 3 }}>
              {t("Javobni o‘zgartirish")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="relative flex flex-col items-stretch">
            {label(t("Ismingiz"), 0)}
            <label className={st.field} style={{ marginTop: U(5), height: U(54), padding: `0 ${U(15)}`, borderRadius: U(14) }}>
              <input className={cx(st.mr, st.input)} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={t("Ism va familiya")} aria-label={t("Ismingiz")} style={{ fontSize: U(17) }} />
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
                  onClick={() => pick(s)}
                  className={cx(st.mr7, st.choice)}
                  style={{ padding: `${U(4)} ${U(4)}`, minHeight: U(54), fontSize: U(16), borderWidth: U(1.2), borderRadius: U(27) }}
                >
                  <span style={{ overflowWrap: "anywhere" }}>{t(l)}</span>
                  {s === "coming" && rise > 0 && (
                    <span key={rise} aria-hidden className={st.miniSun} style={{ width: U(26), height: U(26), marginLeft: U(-13) }}>
                      <span className={st.miniGlow} />
                    </span>
                  )}
                </button>
              ))}
            </div>
            {status === "coming" && (
              <>
                {label(t("Necha kishi bo‘lasiz?"), 22)}
                <div className={cx(st.field, "justify-between")} style={{ marginTop: U(5), height: U(54), padding: `0 ${U(6)}`, borderRadius: U(27) }}>
                  <button type="button" className={cx(st.mr7, st.step)} disabled={count <= 1} onClick={() => setCount((n) => Math.max(1, n - 1))} aria-label={t("Kamaytirish")} style={{ width: U(42), height: U(42), fontSize: U(22) }}>
                    −
                  </button>
                  <span className={st.fo} style={{ fontSize: U(28), lineHeight: 1.1, color: INK }} aria-live="polite">
                    {count}
                  </span>
                  <button type="button" className={cx(st.mr7, st.step)} disabled={count >= 20} onClick={() => setCount((n) => Math.min(20, n + 1))} aria-label={t("Ko‘paytirish")} style={{ width: U(42), height: U(42), fontSize: U(22) }}>
                    +
                  </button>
                </div>
              </>
            )}
            {label(t("Tilaklaringiz"), 24)}
            <label className={st.field} style={{ marginTop: U(5), height: U(130), padding: `${U(15)} ${U(15)}`, borderRadius: U(14), alignItems: "flex-start" }}>
              <textarea rows={4} className={cx(st.mr, st.input)} value={wish} onChange={(e) => setWish(e.target.value)} maxLength={500} placeholder={t("Yozing…")} aria-label={t("Tilaklaringiz")} style={{ fontSize: U(17), height: "100%" }} />
            </label>
            {err && (
              <p className={st.mr} style={{ marginTop: U(12), color: "#b42318", fontSize: U(15) }}>
                {err}
              </p>
            )}
            <button type="submit" disabled={busy} className={cx(st.mr7, st.submit)} style={{ marginTop: U(26), minHeight: U(56), padding: `${U(10)} ${U(12)}`, fontSize: U(16), borderRadius: U(28), opacity: busy ? 0.7 : 1 }}>
              {busy ? t("Yuborilmoqda…") : t("Yuborish")}
            </button>
          </form>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 09 · Final — quyosh yana ko‘tariladi va sahifa yorishadi (scroll bilan: --fc 0 … 1 = Figma kadri;
 * sahifa oxirigacha albatta tugaydi) ═════════════ */
function Final({ d, z, wide, still, onSeen }: { d: D; z: number; wide: boolean; still: boolean; onSeen: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const sec = useRef<HTMLElement>(null);
  const onP = useCallback(
    (_p: number, r: DOMRect) => {
      const el = ref.current;
      if (!el) return;
      const vh = window.innerHeight || 800;
      // sahna ekranning 80% iga kirganda boshlanadi va 0.7 ekran skrollda tugaydi — sahifa oxiri undan oldin kelsa, oxirida tugaydi
      const y = window.scrollY;
      const top = r.top + y;
      const max = document.documentElement.scrollHeight - vh;
      const s0 = Math.min(top - vh * 0.8, max - 1);
      const s1 = Math.max(s0 + 1, Math.min(s0 + vh * 0.7, max));
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
      bg="navy"
      secRef={sec}
      className={st.fin}
      colStyle={{ height: U(780) }}
      outer={
        <>
          <Stars list={wide ? FINAL_L : FINAL_M} W={wide ? 1440 : 390} top={wide ? C : U} size={wide ? C : U} twinkle={!still} />
          <Side wide={wide}>
            <Naqsh box={[180, 300, 180, 180]} unit={C} op={0.5} px pk={0.12} d={0.1} still={still} />
            <Naqsh box={[1080, 420, 180, 180]} unit={C} op={0.5} px pk={0.12} d={0.2} still={still} />
          </Side>
        </>
      }
    >
      <div ref={ref} className={cx(st.fill, st.finalWrap)} style={vars(still ? { "--fc": 1 } : {})}>
        {/* «sahifa yorishadi» — quyosh ko‘tarilayotganda tong nuri (oxirgi kadrda yo‘q) */}
        <span aria-hidden className={st.fLight} />
        <Sun box={[135, 330, 120]} unit={U} className={st.fSun} nurClass={st.fNur} />
      </div>
      <h2 data-a="up" className={cx(st.fo, "absolute text-center")} style={vars({ left: U(24), width: U(342), top: U(110), fontSize: U(46), lineHeight: `${U(48.3)}`, color: "#fff", overflowWrap: "anywhere", textWrap: "balance", "--d": "0.1s" })}>
        {t("Tongda ko‘rishguncha!")}
      </h2>
      <Naqsh box={[135, 560, 120, 120]} unit={U} op={0.9} d={0.2} still={still} />
      {d.signer && (
        <p data-a="up" className={cx(st.mr5, "absolute text-center")} style={vars({ left: U(24), width: U(342), top: U(700), fontSize: U(16), lineHeight: `${U(22)}`, color: GOLD, overflowWrap: "anywhere", "--d": "0.3s" })}>
          {d.signer}
        </p>
      )}
    </Sec>
  );
}

/* ═════════════ Musiqa tugmasi — Figma «Tong / Musiqa tugmasi»: shisha doira, oltin halqa, 4 ta oltin chiziq ritmda;
 * o‘chirilgan — chiziqlar past (4px) ═════════════ */
const BARS = [10, 18, 13, 20];
function TongMusic({ m, wide, embedded }: { m: ReturnType<typeof useMusic>; wide: boolean; embedded: boolean }) {
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
type Key = "hero" | "taklif" | "gallery" | "osh" | "program" | "venue" | "dress" | "rsvp" | "final";

export function TongSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const loaded = usePreload([`${P}/nur.svg`, `${P}/naqsh.svg`], [...d.gallery, `${P}/osh.webp`, d.hall], withGate, wide ? "l" : "m");
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

  const shown: Key[] = (["hero", "taklif", "gallery", "osh", "program", "venue", "dress", "rsvp", "final"] as Key[]).filter((k) =>
    k === "osh" ? d.hasDate : k === "program" ? d.program.length > 0 : k === "venue" ? d.hasPlace : k === "dress" ? !!(d.dressNote || d.dressTitle) : k === "rsvp" ? data.rsvpEnabled : true,
  );
  const z = (k: Key) => 6 + shown.indexOf(k);
  const linkable = mode !== "preview";
  const colU = wide ? COL_L : COL_M;

  return (
    <div ref={root} className={st.root}>
      <div className={st.page} style={vars({ "--u": colU })}>
        <TongMusic m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/naqsh.svg`} />}
        <div className={st.flow}>
          {withGate && (loaded ? <Gate d={d} wide={wide} onStart={() => music.play(true)} /> : <div className={st.gateHold} />)}
          {embedded && <Gate d={d} wide={wide} still onStart={() => {}} />}
          <Hero d={d} z={z("hero")} wide={wide} still={embedded} />
          <Taklif d={d} z={z("taklif")} wide={wide} still={embedded} />
          <Gallery d={d} z={z("gallery")} />
          <Osh d={d} z={z("osh")} still={embedded} />
          <Program d={d} z={z("program")} wide={wide} still={embedded} />
          <Venue d={d} z={z("venue")} linkable={linkable} />
          <Dress d={d} z={z("dress")} />
          {data.rsvpEnabled && <Rsvp d={d} slug={data.slug} mode={mode} z={z("rsvp")} still={embedded} />}
          <Final d={d} z={z("final")} wide={wide} still={embedded} onSeen={onFinal} />
        </div>
        <footer className={cx(st.footer, "flex items-start justify-center")} style={{ height: U(120), paddingTop: U(50) }}>
          <p className={cx(st.mr5, "text-center")} style={{ fontSize: U(14), lineHeight: `${U(19)}`, color: "rgba(255,255,255,.55)" }}>
            <a href="https://shohnoma.uz">{t("shohnoma.uz orqali yaratilgan")}</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
