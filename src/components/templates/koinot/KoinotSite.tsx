"use client";

import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
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
import { DRESS_TEXT, KOINOT_DEMO, KOINOT_DEMO_EN, KOINOT_DEMO_RU, MSG, MSG2, MSG_AGE, MSG_HOST, MSG_HOST_AGE, MSG_WE, P, dativeUz } from "./data";
import st from "./koinot.module.css";

/* ── Birliklar ──
 * U — joriy `--u`. Bo‘limlarda — kontent ustuni (Figma mobil 390 koordinatalari; laptopda ustun = mobil × 1.2, ya’ni 468px / 1440 —
 * Figma «Kontent ustuni (mobil ×1.2)»). C — laptop kanvasi (1440) birligi: yon bezaklar (sayyoralar, oy, raketa, yulduzchalar).
 * Ochilish (00) va hero (01) — o‘z kanvasi (mobil 390×844, laptop 1440×1013): sahna bir ekranga sig‘adi va pastki chetga bog‘lanadi;
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

/* Ranglar (Figma «18 · Koinot — Assets») */
const ORANGE = "#FF7A3D";
const BLUE = "#6FB7FF";
const YELLOW = "#F6E7A8";

/* ═════════════ Yosh ═════════════ */
/** «6» → 6 (1…120); bo‘lmasa 0 */
function parseAge(raw: string) {
  const n = Math.round(Number(String(raw).replace(/[^\d.]/g, "")));
  return raw.trim() && Number.isFinite(n) && n >= 1 && n <= 120 ? n : 0;
}
/** Hero’dagi «yoshga / to‘lyapti» birinchi qatori: ruscha «год / года / лет», inglizcha «year / years» (kalit — tarjima lug‘atida) */
function ageKey(n: number, lang: Locale) {
  if (lang === "ru") {
    const a = n % 10;
    const b = n % 100;
    return a === 1 && b !== 11 ? "yoshga|1" : a >= 2 && a <= 4 && (b < 12 || b > 14) ? "yoshga|2" : "yoshga";
  }
  return lang === "en" && n === 1 ? "yoshga|1" : "yoshga";
}

/** Server yaratadigan standart taklif matni (php/api/lib/orders.php DEFAULT_MESSAGE) — har qaysi tilda */
const SERVER_DEFAULT = "Aziz mehmonlar! Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.";
const isServerDefault = (m: string) => (["uz", "ru", "en"] as Locale[]).some((l) => tr(l, SERVER_DEFAULT).trim() === m.trim());

function useData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO = lang === "ru" ? KOINOT_DEMO_RU : lang === "en" ? KOINOT_DEMO_EN : KOINOT_DEMO;
  const ex = (data.extra ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof ex[k] === "string" ? (ex[k] as string).trim() : typeof ex[k] === "number" ? String(ex[k]) : "");
  const sd = splitDate(data.date);
  const guest = useGuestName();
  return useMemo(() => {
    const cw = calendarWords(lang);
    const exProgram = Array.isArray(ex.program) ? (ex.program as ProgramItem[]).filter((p) => p?.time && p?.title) : [];
    const photos = (data.photos ?? []).filter(Boolean) as string[];
    const date = sd ? new Date(`${sd.iso}T12:00:00Z`) : null;
    // namunadagi ismlar tarjima qilinadi (mijoz ma’lumoti — o‘zgarishsiz)
    const a = ((demo ? t(data.personA) : data.personA) || "").trim();
    // taklif qiluvchi (ixtiyoriy: odatda ota-ona): bo‘lsa — matnlar «biz» nomidan, imzo — shu; bo‘lmasa — bolaning o‘zi nomidan
    const host = demo ? t(DEMO.host) : str("host");
    const we = !!host;
    const age = parseAge(str("age") || (demo ? DEMO.age : ""));
    const code = str("dressCode") || (demo ? DEMO.dressCode : "");
    const dressNote = str("dressNote") || (DRESS_TEXT[code] ? t(DRESS_TEXT[code]) : "");
    const time = sd?.time ?? "";
    const program = (demo ? DEMO.program : exProgram.length ? exProgram : ((data.program ?? []) as ProgramItem[])) as ProgramItem[];
    const raw = (demo ? "" : data.message || "").trim();
    const custom =
      raw && !isServerDefault(raw)
        ? raw.replace(/^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Muhtaram mehmonlar!|Aziz do‘stlarim!|Aziz do‘stlar!|Дорогие гости!|Дорогие друзья!|Dear guests!|Dear friends!)\s*/, "").trim()
        : "";
    const message =
      custom ||
      (we ? (a ? (age ? t(MSG_HOST_AGE, { name: a, age }) : t(MSG_HOST, { name: a })) : t(MSG_WE)) : age ? t(MSG_AGE, { age }) : t(MSG));
    const venueTitle = ((demo ? t(data.venueName) : data.venueName) || "").trim();
    const address = ((demo ? DEMO.address : data.address) || "").trim();
    const coords = coordsFrom(data.mapUrl);
    const m = date ? date.getUTCMonth() : 0;
    const year = date ? date.getUTCFullYear() : 0;
    const day = date ? date.getUTCDate() : 0;
    // namunada javob muddati — Figma’dagidek sanadan 4 kun oldin («10-dekabrgacha»)
    const deadline = demo && sd ? new Date(Date.UTC(year, m, day - 4)).toISOString().slice(0, 10) : data.rsvpDeadline;
    const wd = date ? cw.weekday[date.getUTCDay()] : "";
    // ruscha hafta kuni qator o‘rtasida — kichik harf («12 декабря · воскресенье · 15:00»)
    const wdIn = wd.toLocaleLowerCase(lang);
    // «14-dekabr» / «14 декабря» / «14 December»
    const dayMonth = date ? (lang === "uz" ? `${day}-${cw.monthsAfterDay[m]}` : `${day} ${cw.monthsAfterDay[m]}`) : "";
    // Figma: hero — illyuminatorda bola surati, manzil — bayram zali (mijozda: 1–2-suratlar; hero surati bo‘lmasa —
    // illyuminatorda kosmonavt, 2-surat bo‘lmasa — shablonning bayram zali surati)
    const portrait = demo ? `${P}/portret.webp` : photos[0] || "";
    const hall = demo ? `${P}/zal.webp` : photos[1] || `${P}/zal.webp`;
    return {
      a,
      we,
      host,
      /** imzo: taklif qiluvchi yoki bolaning o‘zi */
      signer: host || a,
      age,
      /** ochilish sarlavhasi: «Samirning / kosmik bayrami»; ism bo‘lmasa — «Kosmik bayram» */
      title: a ? [t("{name}ning", { name: a }), t("kosmik bayrami")] : [t("Kosmik bayram")],
      /** hero: «yoshga / to‘lyapti» (yosh bo‘lsa) */
      ageLines: age ? [t(ageKey(age, lang)), t("to‘lyapti")] : [],
      /** «14-dekabr · Yakshanba · 15:00» */
      heroDate: date ? [dayMonth, lang === "ru" ? wdIn : wd, time].filter(Boolean).join(" · ") : "",
      dayMonth,
      /** «Yakshanba · soat 15:00» */
      wdTime: date ? [wd, time ? t("soat {time}", { time }) : ""].filter(Boolean).join(" · ") : "",
      hasDate: !!date,
      iso: sd?.iso ?? "",
      time,
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
      dressCode: DRESS_TEXT[code] || str("dressCode") ? t(code) : "",
      dressNote,
      portrait,
      hall,
      rsvpUntil: untilPhrase(deadline, lang),
      /** anketa: «Samirga tilaklaringiz» (ruscha — ism kelishiksiz) */
      // ism uzun bo‘lsa (ism + familiya) — faqat birinchi so‘z: «Abdurahmonbekka tilaklaringiz»
      wishLabel: a ? t("{dat} tilaklaringiz", { dat: dativeUz(a.split(/\s+/)[0]), name: a.split(/\s+/)[0] }) : t("Tilaklaringiz"),
      /** final: «Samir va uning oilasi» («biz» bo‘lsa) yoki bolaning ismi */
      finalSub: we ? (a ? t("{name} va uning oilasi", { name: a }) : host) : a,
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
      list = Array.from(el.querySelectorAll<HTMLElement>(SEL)).filter((x) => !x.closest(`.${st.gateWrap}`) && !x.closest(`.${st.openWrap}`));
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

/**
 * Chok ustidagi va yon sayyoralar — skrollda sekin parallaks (`--py`, ±30px) va oy/halqali sayyora yengil aylanadi
 * (`data-px="r"`: `--pr`, ±6°). Faqat `translate`/`rotate` — paydo bo‘lish transformi bilan to‘qnashmaydi.
 */
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
        const k = +(x.dataset.pk || 0.12);
        x.style.setProperty("--py", `${Math.max(-30, Math.min(30, dist * -k)).toFixed(1)}px`);
        if (x.dataset.px === "r") x.style.setProperty("--pr", `${Math.max(-6, Math.min(6, dist * -0.012)).toFixed(2)}deg`);
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

/** Qator (yosh raqami + «yoshga to‘lyapti») ota konteyner eniga sig‘masa — butunlay kichrayadi (markazdan, transform bilan) */
function FitRow({ children, deps, className, style }: { children: ReactNode; deps: unknown; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  useIso(() => {
    const el = ref.current;
    const box = el?.parentElement;
    if (!el || !box) return;
    const measure = () => {
      el.style.scale = "";
      const k = Math.min(1, box.clientWidth / Math.max(1, el.offsetWidth));
      el.style.scale = k < 0.999 ? k.toFixed(4) : "";
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [deps]);
  return (
    <div ref={ref} className={cx("flex items-center", className)} style={{ whiteSpace: "nowrap", flex: "none", ...style }}>
      {children}
    </div>
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
 * Ism (bir qator, sig‘masa kichrayadi); juda uzun bo‘lsa (bir qatorda 0.72 dan kichrayib ketadi) — ikki teng qatorga,
 * har qator `two` o‘lchamida. `letters` — hero: har harf --o bilan navbatma-navbat pastdan ko‘tariladi ([boshlanish, tugash]).
 */
function NameLines({
  text,
  base,
  max,
  lh,
  two,
  twoLh,
  unit = U,
  className,
  style,
  letters,
}: {
  text: string;
  base: number;
  max: number;
  lh: number;
  two: number;
  twoLh: number;
  unit?: (n: number) => string;
  className?: string;
  style?: CSSProperties;
  letters?: [number, number];
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
  const total = Math.max(1, rows.join("").replace(/\s/g, "").length);
  let idx = 0;
  return (
    <div className={className} style={style}>
      <span ref={probe} aria-hidden className="pointer-events-none absolute whitespace-nowrap" style={{ visibility: "hidden", fontSize: unit(base), left: 0, top: 0 }}>
        {text}
      </span>
      {rows.map((r, i) => (
        <span key={i} className="block" style={{ height: unit(h), lineHeight: `${unit(h)}`, fontSize: unit(fs), whiteSpace: "nowrap" }}>
          <Fit base={fs} max={max} unit={unit} deps={`${r}|${fs}`}>
            {letters
              ? Array.from(r).map((ch, k) =>
                  /\s/.test(ch) ? (
                    <span key={k}>{" "}</span>
                  ) : (
                    <span key={k} className={st.letter} style={vars({ "--li": +(letters[0] + ((letters[1] - letters[0]) * idx++) / total).toFixed(4) })}>
                      {ch}
                    </span>
                  ),
                )
              : r}
          </Fit>
        </span>
      ))}
    </div>
  );
}

/* ═════════════ Bezaklar ═════════════ */
type Pos = (n: number) => string;
type Art = "raketa" | "halqali" | "kok" | "oy" | "kosmonavt" | "tutun";

/**
 * Rasm-bezak (Figma «Koinot / Qatlam · …», fonlari kesilgan, Normal blend): tashqi qavat — joy va parallaks (`data-px`),
 * o‘rta — paydo bo‘lish (`data-a`), ichki — suzish (`bob`) yoki burilish (`rot`, Figma’dagi qiya raketa).
 */
function Deco({
  art,
  box,
  unit,
  left,
  top,
  rot = 0,
  a = "pop",
  d = 0,
  px,
  pk,
  bob,
  className,
  innerClass,
  innerKey,
  eager,
  flip,
}: {
  art: Art;
  box: readonly [number, number, number, number];
  unit: Pos;
  left?: Pos;
  top?: Pos;
  rot?: number;
  a?: string;
  d?: number;
  px?: "" | "r";
  pk?: number;
  bob?: number;
  className?: string;
  innerClass?: string;
  innerKey?: number;
  eager?: boolean;
  flip?: boolean;
}) {
  const [x, y, w, h] = box;
  return (
    <div
      aria-hidden
      data-px={px}
      data-pk={pk}
      className={cx(st.art, className)}
      style={{ left: (left ?? unit)(x), top: (top ?? unit)(y), width: unit(w), height: unit(h) }}
    >
      <div data-a={a || undefined} className={st.fill} style={vars({ "--d": `${d}s` })}>
        <div key={innerKey} className={cx(st.fill, bob != null && st.bob, innerClass)} style={bob != null ? vars({ "--bd": `${-bob}s` }) : undefined}>
          <Img src={`${P}/${art}.webp`} eager={eager} style={rot || flip ? { transform: `${flip ? "scaleX(-1) " : ""}rotate(${rot}deg)` } : undefined} />
        </div>
      </div>
    </div>
  );
}

/**
 * Figma’da burilgan raketa: (x, y) — Figma metadata’dagi tugun boshi (burilgan ramkaning chap-yuqori burchagi), `bw` — tashqi
 * to‘rtburchak eni, `rot` — gradus (+ soat mili bo‘yicha, burun o‘ngga). Raketa (2:3) o‘lchami bbox’dan hisoblanadi
 * (w·cos + h·sin = bw); natija — burilmagan raketa qutisi (markaz bbox markazida).
 */
function rocketBox(x: number, y: number, bw: number, rot: number) {
  const r = (Math.abs(rot) * Math.PI) / 180;
  const w = bw / (Math.cos(r) + 1.5 * Math.sin(r));
  const h = w * 1.5;
  const bh = w * Math.sin(r) + h * Math.cos(r);
  const bx = rot > 0 ? x - h * Math.sin(r) : x;
  const by = rot > 0 ? y : y - w * Math.sin(r);
  return [bx + bw / 2 - w / 2, by + bh / 2 - h / 2, w, h] as const;
}

const STAR = "M50 0L60.6 39.4L100 50L60.6 60.6L50 100L39.4 60.6L0 50L39.4 39.4Z";
/** To‘rt qirrali yulduzcha (Figma «Star») */
function Star({ x, y, s, c, unit, left, d = 0, bottom }: { x: number; y: number; s: number; c: string; unit: Pos; left?: Pos; d?: number; bottom?: number }) {
  // `bottom` — bo‘lim balandligi (Figma): yulduzcha bo‘lim pastiga bog‘lanadi (matn uzaysa ham ustiga tushmaydi)
  const v = bottom != null ? { bottom: unit(bottom - y - s) } : { top: unit(y) };
  return (
    <svg aria-hidden viewBox="0 0 100 100" data-a="star" className={st.star} style={vars({ left: (left ?? unit)(x), ...v, width: unit(s), height: unit(s), "--d": `${d}s` })}>
      <path d={STAR} fill={c} />
    </svg>
  );
}

/** Ikki qatlamli yulduz foni (Figma «Koinot / Yulduzlar» 390×420 vektor — ikki yarmi alohida miltillaydi) */
function StarField({ className, style, twinkle }: { className?: string; style?: CSSProperties; twinkle?: boolean }) {
  return (
    <div aria-hidden className={cx(st.sky, className)} style={style}>
      <span className={cx(st.skyA, twinkle && st.twA)} />
      <span className={cx(st.skyB, twinkle && st.twB)} />
    </div>
  );
}

/* ═════════════ 00 · Ochilish — raketa start maydonida (faqat scroll bilan, --o: 0…1) ═════════════
 * Yuklanganda (bosishsiz): yozuvlar sokin chiqadi, yulduzlar ikki qatlamda miltillaydi. Scroll (rAF lerp):
 * halqada 3 → 2 → 1 (har raqam 1.4 → 1, halqa bo‘ylab sut rangli yoy to‘ladi; 0…0.27); halqa va sarlavha ketadi (0.28…0.36);
 * olov yonadi, start nuri kuchayadi, tutun bo‘rtib kengayadi, raketa titraydi (0.2…0.42); raketa ease-in bilan yuqoriga uchadi,
 * ortidan to‘q sariq iz (0.34…0.62); kamera raketa ortidan hero’ga «ko‘tariladi» — start sahnasi pastga ketadi, hero tepadan
 * tushadi (qattiq chok, ikkalasi ham to‘liq ko‘rinadi — «sharpa» yo‘q; yulduzlar 0.35× parallaks; 0.5…0.8). */
const GATE = {
  m: { W: 390, H: 844, S: 1, OX: 0 },
  l: { W: 1440, H: 1013, S: 1.2, OX: 486 },
} as const;
/** soplo (olov chiqadigan joy) — raketa kanvasida y = 238/300 */
const NOZZLE = 238;

function Gate({ d, wide, onStart, still = false }: { d: D; wide: boolean; onStart: () => void; still?: boolean }) {
  const t = useT();
  const wrap = useRef<HTMLDivElement>(null);
  const cb = useRef(onStart);
  cb.current = onStart;
  useEffect(() => {
    const el = wrap.current;
    const host = el?.parentElement;
    if (!el || !host || still) return;
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
      host.style.setProperty("--o", o.toFixed(4));
      // raketa titrashi (x ±2 birlik): olov yonganda boshlanib, uchishda so‘nadi
      const env = seg(o, 0.24, 0.29) * (1 - seg(o, 0.42, 0.48));
      host.style.setProperty("--sk", (Math.sin(o * 420) * 2 * env).toFixed(3));
      el.style.pointerEvents = o > 0.1 ? "none" : "";
      el.style.visibility = o > 0.785 ? "hidden" : "";
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
  // kanvas koordinatalari (faqat laptop yon bezaklari)
  const Xc = (x: number) => `calc(50% + ${U(x - W / 2)})`;
  const Yc = (y: number) => `calc(100% - ${U(H - y)})`;
  const box = (x: number, y: number, w: number, h: number): CSSProperties => ({ left: X(x), top: Y(y), width: Z(w), height: Z(h) });
  const boxC = (x: number, y: number, w: number, h: number): CSSProperties => ({ left: Xc(x), top: Yc(y), width: U(w), height: U(h) });
  const digits = ["3", "2", "1"];
  return (
    <div
      ref={wrap}
      className={cx(st.gateWrap, still && st.still)}
      style={vars(still ? { "--u": pageU, "--o": 0, height: U(H), marginBottom: 0 } : { "--u": `min(${pageU}, calc(100svh / ${H}))` })}
    >
      <div className={st.gate} aria-label={t("Taklifnoma")} style={still ? { position: "relative", height: "100%" } : undefined}>
        <div className={st.gLayer} style={vars({ "--tr": Z(1100) })}>
          <div aria-hidden className={st.gBg} />
          {/* kamera ko‘tarila boshlaganda sahna tepasi hero rangiga (#0e1733) o‘tadi — chokda rang sakrashi yo‘q (statik kadrda ko‘rinmaydi) */}
          <div aria-hidden className={st.gTop} />
          <div aria-hidden className={st.skyBox}>
            <StarField className={st.gStars} twinkle={!still} />
          </div>
          {/* yon bezaklar: mobil — oy; laptop — oy, halqali sayyora va ikki yon tutun */}
          {wide ? (
            <>
              <div aria-hidden className={cx(st.art, st.gIn)} style={vars({ ...boxC(1110, 110, 190, 190), "--gd": "0.3s" })}>
                <Img src={`${P}/oy.webp`} eager />
              </div>
              <div aria-hidden className={cx(st.art, st.gIn)} style={vars({ ...boxC(130, 300, 230, 230), "--gd": "0.4s" })}>
                <Img src={`${P}/halqali.webp`} eager />
              </div>
            </>
          ) : (
            <div aria-hidden className={cx(st.art, st.gIn)} style={vars({ ...box(28, 28, 76, 76), "--gd": "0.3s" })}>
              <Img src={`${P}/oy.webp`} eager />
            </div>
          )}
          {/* start nuri (Figma: ikki to‘q sariq doira 14% / 18%) — olov yonganda kuchayadi */}
          <span aria-hidden className={cx(st.pad, st.pad1)} style={box(105, 520, 180, 180)} />
          <span aria-hidden className={cx(st.pad, st.pad2)} style={box(135, 550, 120, 120)} />
          {/* to‘q sariq iz — soplodan start maydonigacha cho‘ziladi */}
          <span aria-hidden className={st.trail} style={{ left: X(195 - 9), width: Z(18), top: Y(318 + NOZZLE) }} />
          {/* raketa: titraydi, keyin uchadi; soplodan olov */}
          <div aria-hidden className={st.rocket} style={box(95, 318, 200, 300)}>
            <span className={st.flame} style={{ left: Z(100 - 13), top: Z(NOZZLE - 6), width: Z(26), height: Z(70) }}>
              <span className={st.flameIn} />
            </span>
            <Img src={`${P}/raketa.webp`} eager />
          </div>
          {/* uchish tutuni — bo‘rtib kengayadi */}
          {wide && (
            <>
              <div aria-hidden className={cx(st.art, st.smoke, st.smokeL)} style={boxC(-60, 683, 620, 366)}>
                <Img src={`${P}/tutun.webp`} eager />
              </div>
              <div aria-hidden className={cx(st.art, st.smoke, st.smokeR)} style={boxC(880, 683, 620, 366)}>
                <Img src={`${P}/tutun.webp`} eager />
              </div>
            </>
          )}
          <div aria-hidden className={cx(st.art, st.smoke)} style={box(-45, 560, 480, 284)}>
            <Img src={`${P}/tutun.webp`} eager />
          </div>
          {/* sarlavha: «Samirning / kosmik bayrami» */}
          <div className={st.gTitle}>
            <h1 className={cx(st.ub7, st.gIn, "absolute text-center")} style={vars({ left: X(24), width: Z(342), top: Y(92), color: "var(--cream)", "--gd": "0.15s" })}>
              {d.title.map((line, i) => (
                <span key={i} className="block" style={{ height: Z(36), lineHeight: `${Z(36)}`, fontSize: Z(30), whiteSpace: "nowrap" }}>
                  <Fit base={30 * S} max={342 * S} deps={line}>
                    {line}
                  </Fit>
                </span>
              ))}
            </h1>
          </div>
          {/* sanoq halqasi: 3 → 2 → 1 */}
          <div className={st.count} style={box(153, 214, 84, 84)}>
           <div className={cx(st.fill, st.gIn)} style={vars({ "--gd": "0.35s" })}>
            <svg viewBox="0 0 84 84" className={st.svg} aria-hidden>
              <circle cx="42" cy="42" r="40.5" stroke={ORANGE} strokeWidth={3} fill="none" />
              {digits.map((_, i) => (
                <circle key={i} cx="42" cy="42" r="40.5" pathLength={1} className={st.arc} style={vars({ "--i": i })} />
              ))}
            </svg>
            {digits.map((n, i) => (
              <span key={n} className={cx(st.ub9, st.digit)} style={vars({ top: Z(12), height: Z(55), lineHeight: `${Z(55)}`, fontSize: Z(44), "--i": i })}>
                {n}
              </span>
            ))}
           </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════ 01 · Hero — bayram egasi va yosh (ochilish ostida sticky; --o bilan): hero tepadan tushadi (kamera ko‘tariladi),
 * illyuminator 0.85 → 1 (prujina), orbita sekin aylanadi (40 s), yo‘ldosh nuqta orbita bo‘ylab yuradi, ism harfma-harf,
 * yosh raqami pastdan otilib chiqib ozgina sakraydi (overshoot), sana tugmasi. Surat bo‘lmasa — illyuminatorda kosmonavt;
 * yosh bo‘lmasa — raqam o‘rnida «tug‘ilgan kunini nishonlaydi» ═════════════ */
function Hero({ d, wide, still }: { d: D; wide: boolean; still: boolean }) {
  const t = useT();
  const G = wide ? GATE.l : GATE.m;
  const { W, H, S, OX } = G;
  const pageU = wide ? CANVAS_L : COL_M;
  const X = (x: number) => `calc(50% + ${U(OX + S * x - W / 2)})`;
  const Y = (y: number) => `calc(100% - ${U(H - S * y)})`;
  const Z = (n: number) => U(S * n);
  const Xc = (x: number) => `calc(50% + ${U(x - W / 2)})`;
  const Yc = (y: number) => `calc(100% - ${U(H - y)})`;
  const box = (x: number, y: number, w: number, h: number): CSSProperties => ({ left: X(x), top: Y(y), width: Z(w), height: Z(h) });
  const noAge = d.age ? null : split2(t("tug‘ilgan kunini nishonlaydi")) ?? [t("tug‘ilgan kunini nishonlaydi")];
  const [rx, ry, rw, rh] = rocketBox(210, 520, 145.27, 20);
  return (
    <div className={cx(st.hero, still && st.still)} style={vars(still ? { "--u": pageU, height: U(H) } : { "--u": `min(${pageU}, calc(100svh / ${H}))` })}>
      <div className={st.hLayer}>
        <div aria-hidden className={st.hBg} />
        <div aria-hidden className={st.skyBox}>
          <StarField className={st.hStars} twinkle={!still} />
        </div>
        {wide && (
          <>
            <div aria-hidden className={cx(st.art, st.hPlanet)} style={vars({ left: Xc(1130), top: Yc(560), width: U(170), height: U(170), "--pf": 1.4 })}>
              <Img src={`${P}/kok.webp`} eager />
            </div>
            <div aria-hidden className={cx(st.art, st.hPlanet)} style={vars({ left: Xc(rx), top: Yc(ry), width: U(rw), height: U(rh), "--pf": 1.1 })}>
              <div className={cx(st.fill, !still && st.bob)}>
                <Img src={`${P}/raketa.webp`} eager style={{ transform: "rotate(20deg)" }} />
              </div>
            </div>
          </>
        )}
        <div aria-hidden className={cx(st.art, st.hPlanet)} style={vars({ ...box(-54, 40, 190, 190), "--pf": 1 })}>
          <Img src={`${P}/halqali.webp`} eager />
        </div>
        <div aria-hidden className={cx(st.art, st.hPlanet)} style={vars({ ...box(304, 320, 96, 96), "--pf": 1.6 })}>
          <Img src={`${P}/kok.webp`} eager />
        </div>
        {/* orbita (punktir, aylanadi) va yo‘ldosh */}
        <div aria-hidden className={cx(st.art, st.orbit)} style={box(35, 74, 320, 320)}>
          <svg viewBox="0 0 320 320" className={cx(st.svg, st.spin)}>
            <circle cx="160" cy="160" r="159.25" fill="none" stroke="rgba(255,244,226,.35)" strokeWidth={1.5} strokeDasharray="6 8" />
          </svg>
          <div className={cx(st.fill, st.spinDot)}>
            <span className={st.moonDot} style={{ left: Z(330 - 35), top: Z(214 - 74), width: Z(16), height: Z(16) }} />
          </div>
        </div>
        {/* illyuminator: sut rang ramka (8), surat, to‘q sariq halqa */}
        <div className={st.port} style={box(57, 96, 276, 276)}>
          {/* Figma: ramka chizig‘i (8, sut rang) tashqarida — to‘q sariq halqa ostida ingichka sut rang chiziq qoladi */}
          <span aria-hidden className={st.portRim} />
          <div className={st.portIn} style={{ left: Z(8), top: Z(8), width: Z(260), height: Z(260) }}>
            {d.portrait ? (
              <Img src={d.portrait} eager className={st.portImg} style={{ top: Z(-12), height: Z(325) }} />
            ) : (
              <div className={st.portEmpty}>
                <StarField className={st.portStars} />
                <div className={cx(st.fill, !still && st.bob)} style={{ inset: "14%" }}>
                  <Img src={`${P}/kosmonavt.webp`} eager />
                </div>
              </div>
            )}
          </div>
          <svg aria-hidden viewBox="0 0 276 276" className={st.svg}>
            <circle cx="138" cy="138" r="136.5" stroke={ORANGE} strokeWidth={3} fill="none" />
          </svg>
        </div>
        {/* ism (2 qatorga bo‘linsa — yuqoriga, illyuminator tomonga o‘sadi) */}
        {d.a && (
          <h2 className={cx(st.ub9, "absolute text-center")} style={{ left: X(24), width: Z(342), bottom: U(H - S * 494), color: "var(--cream)" }}>
            <NameLines text={d.a} base={60 * S} max={342 * S} lh={74 * S} two={38 * S} twoLh={46 * S} letters={still ? undefined : [0.57, 0.72]} />
          </h2>
        )}
        {/* yosh: katta to‘q sariq raqam + «yoshga / to‘lyapti» */}
        <div className="absolute flex items-center justify-center" style={{ left: X(24), width: Z(342), top: Y(500), height: Z(150) }}>
          {d.age ? (
            <FitRow deps={`${d.age}|${d.ageLines.join("|")}`} style={{ gap: Z(14) }}>
              <span className={cx(st.ub9, st.ageNum)} style={{ fontSize: Z(150), lineHeight: 1, height: Z(150), color: ORANGE }}>
                {d.age}
              </span>
              <span className={cx(st.ub6, st.ageTxt)} style={{ fontSize: Z(28), lineHeight: 1.18, color: "var(--cream)" }}>
                {d.ageLines.map((l, i) => (
                  <span key={i} className="block">
                    {l}
                  </span>
                ))}
              </span>
            </FitRow>
          ) : (
            <FitRow deps={noAge!.join("|")}>
              <span className={cx(st.ub6, st.ageTxt, "text-center")} style={{ fontSize: Z(28), lineHeight: 1.18, color: "var(--cream)" }}>
                {noAge!.map((l, i) => (
                  <span key={i} className="block">
                    {l}
                  </span>
                ))}
              </span>
            </FitRow>
          )}
        </div>
        {/* sana tugmasi */}
        {d.heroDate && (
          <div className={cx(st.pill, "absolute flex justify-center")} style={{ left: X(24), width: Z(342), top: Y(712) }}>
            <span className={cx(st.ms6, st.pillIn)} style={{ height: Z(53), padding: `0 ${Z(22)}`, borderWidth: Z(1.5), borderRadius: Z(40), fontSize: Z(19) }}>
              <Fit base={19 * S} max={290 * S} deps={d.heroDate}>
                {d.heroDate}
              </Fit>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═════════════ Bo‘lim qobig‘i ═════════════ */
type Bg = "cream" | "night";

/** Bo‘lim: to‘liq enli fon + markazda kontent ustuni (mobil 390 birlik; laptopda × 1.2). `outer` — ustundan tashqaridagi bezaklar */
function Sec({ children, z, bg, colStyle, id, outer, sy = 0, className }: { children: ReactNode; z: number; bg: Bg; colStyle?: CSSProperties; id?: string; outer?: ReactNode; sy?: number; className?: string }) {
  return (
    <section id={id} className={cx(st.sec, st[bg], className)} style={vars({ zIndex: z, "--sy": U(sy) })}>
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

/** Sarlavha (Unbounded Bold 30, markazda, 360 da sig‘adi) */
function Title({ text, color = "var(--ink)", d = 0, style }: { text: string; color?: string; d?: number; style?: CSSProperties }) {
  return (
    <p data-a="up" className={cx(st.ub7, "text-center")} style={vars({ height: U(37), fontSize: U(30), lineHeight: `${U(37)}`, color, whiteSpace: "nowrap", "--d": `${d}s`, ...(style as Record<string, string>) })}>
      <Fit base={30} max={342} deps={text}>
        {text}
      </Fit>
    </p>
  );
}

/* ═════════════ 02 · Taklif — murojaat (mehmon ismi bilan), matn, ikkinchi xatboshi, «Hurmat bilan,» va imzo ═════════════ */
function Taklif({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const hello = d.guest ? guestHello(t, "Hurmatli {guest}!", d.guest) : t("Aziz mehmonlar!");
  return (
    <Sec
      z={z}
      bg="cream"
      colStyle={{ paddingTop: U(104), paddingBottom: U(134) }}
      outer={
        <Side wide={wide}>
          <Deco art="halqali" box={[150, 220, 210, 210]} unit={C} px="r" d={0.1} />
          <Deco art="kok" box={[1110, 300, 150, 150]} unit={C} px="" pk={0.2} d={0.2} />
          <Star x={300} y={120} s={18} c={ORANGE} unit={C} d={0.2} />
          <Star x={1180} y={140} s={14} c={BLUE} unit={C} d={0.3} />
          <Star x={260} y={560} s={14} c={BLUE} unit={C} d={0.4} />
          <Star x={1120} y={600} s={20} c={ORANGE} unit={C} d={0.5} />
        </Side>
      }
    >
      {/* chok ustidagi oy (01/02) */}
      <Deco art="oy" box={[230, -70, 140, 140]} unit={U} px="r" className={st.seam} />
      <Star x={40} y={70} s={18} c={ORANGE} unit={U} d={0.1} />
      {/* Figma 330,120 — sarlavha oxiriga tushardi: yuqoriroq, matndan tashqarida */}
      <Star x={346} y={84} s={12} c={BLUE} unit={U} d={0.2} />
      <Star x={60} y={560} s={14} c={BLUE} unit={U} d={0.3} bottom={640} />
      <Star x={316} y={540} s={20} c={ORANGE} unit={U} d={0.4} bottom={640} />
      <div data-a="up" className={cx(st.ub7, "relative text-center")} style={vars({ color: "var(--ink)", "--d": "0.05s" })}>
        <NameLines text={hello} base={30} max={342} lh={37} two={24} twoLh={30} />
      </div>
      <p
        data-a="up"
        className={cx(st.ms, "relative mx-auto text-center")}
        style={vars({ marginTop: U(29), width: U(326), fontSize: U(20), lineHeight: `${U(30)}`, color: "var(--ink)", overflowWrap: "anywhere", whiteSpace: "pre-line", "--d": "0.12s" })}
      >
        {d.message}
      </p>
      <p data-a="up" className={cx(st.ms, "relative mx-auto text-center")} style={vars({ marginTop: U(40), width: U(326), fontSize: U(20), lineHeight: `${U(30)}`, color: "var(--ink)", "--d": "0.2s" })}>
        {t(MSG2)}
      </p>
      {d.signer && (
        <div data-a="up" className={cx(st.ms6, "relative mx-auto text-center")} style={vars({ marginTop: U(30), width: U(326), fontSize: U(20), lineHeight: `${U(28)}`, color: ORANGE, overflowWrap: "anywhere", "--d": "0.28s" })}>
          <p>{t("Hurmat bilan,")}</p>
          <p>{d.signer}</p>
        </div>
      )}
    </Sec>
  );
}

/* ═════════════ 03 · Sana va taymer — sana (to‘q sariq), hafta kuni · vaqt, 4 ta taymer kartasi (flip), kalendar tugmasi ═════════════ */
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

function Sana({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const units = timerUnits(useLocale());
  const c = useCountdown(d.target);
  const [ref, inView] = useInView<HTMLDivElement>(0.3, true);
  if (!d.hasDate || !c) return null;
  const vals = [c.d, c.h, c.m, c.s];
  const [rx, ry, rw, rh] = rocketBox(300, 520, 84.875, -18);
  const [lx, ly, lw, lh] = rocketBox(1130, 180, 154.8, -12);
  return (
    <Sec
      z={z}
      bg="night"
      sy={wide ? 0 : 40}
      colStyle={{ height: U(680) }}
      outer={
        <Side wide={wide}>
          <Deco art="oy" box={[170, 280, 190, 190]} unit={C} px="r" d={0.1} />
          <Deco art="raketa" box={[lx, ly, lw, lh]} unit={C} rot={-12} bob={1.3} px="" pk={0.2} d={0.2} />
        </Side>
      }
    >
      {/* chok ustidagi halqali sayyora (02/03) */}
      <Deco art="halqali" box={[258, -74, 150, 150]} unit={U} px="r" className={st.seam} />
      <div className="absolute inset-x-0" style={{ top: U(112) }}>
        <Title text={t("Bayramgacha")} color="var(--cream)" />
      </div>
      <p data-a="draw" className={cx(st.ub9, "absolute inset-x-0 text-center")} style={vars({ top: U(168), height: U(55), fontSize: U(44), lineHeight: `${U(55)}`, color: ORANGE, whiteSpace: "nowrap", "--d": "0.1s" })}>
        <Fit base={44} max={342} deps={d.dayMonth}>
          {d.dayMonth}
        </Fit>
      </p>
      <p data-a="up" className={cx(st.ms5, "absolute inset-x-0 text-center")} style={vars({ top: U(232), height: U(27), fontSize: U(20), lineHeight: `${U(27)}`, color: "var(--cream)", whiteSpace: "nowrap", "--d": "0.2s" })}>
        <Fit base={20} max={342} deps={d.wdTime}>
          {d.wdTime}
        </Fit>
      </p>
      <div ref={ref}>
        {vals.map((v, i) => (
          <div key={i} data-a="flip" className={cx(st.tbox, "absolute")} style={vars({ left: U(28 + i * 86), top: U(312), width: U(76), height: U(63), borderRadius: U(20), "--d": `${0.1 + i * 0.1}s` })}>
            <p className={cx(st.ub7, "absolute inset-x-0 text-center")} style={{ top: 0, height: U(42), fontSize: U(34), lineHeight: `${U(42)}`, color: "var(--navy)", whiteSpace: "nowrap" }}>
              <Fit base={34} max={70} deps={String(vals[0]).length}>
                <Digits value={v} run={inView} len={i === 0 ? Math.max(2, String(vals[0]).length) : 2} i={i} />
              </Fit>
            </p>
            <p className={cx(st.ms6, "absolute inset-x-0 text-center")} style={{ top: U(44), height: U(19), fontSize: U(14), lineHeight: `${U(19)}`, color: "var(--mute)", whiteSpace: "nowrap" }}>
              <Fit base={14} max={70} deps={units[i]}>
                {units[i]}
              </Fit>
            </p>
          </div>
        ))}
      </div>
      <div data-a="up" className="absolute inset-x-0 flex justify-center" style={vars({ top: U(470), "--d": "0.3s" })}>
        <button
          type="button"
          className={cx(st.ms7, st.btnLine)}
          style={{ minWidth: U(240), height: U(56), padding: `0 ${U(22)}`, fontSize: U(17), borderWidth: U(1.5), borderRadius: U(28) }}
          onClick={() =>
            downloadIcs({
              title: d.a ? t("{name} — tug‘ilgan kun", { name: d.a }) : t("Tug‘ilgan kun"),
              startLocal: `${d.iso}T${d.time || "15:00"}`,
              location: [d.venueTitle, d.address].filter(Boolean).join(", "),
              slug: "koinot",
            })
          }
        >
          {t("Kalendarga qo‘shish")}
        </button>
      </div>
      <Deco art="raketa" box={[rx, ry, rw, rh]} unit={U} rot={-18} bob={0} d={0.35} />
    </Sec>
  );
}

/* ═════════════ 04 · Bayram dasturi — punktir trayektoriya yuqoridan pastga chiziladi, bekatlar navbat bilan «yonadi» ═════════════ */
const DOTS = [ORANGE, BLUE, YELLOW];
function Program({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const items = d.program.slice(0, 8);
  if (!items.length) return null;
  return (
    <Sec
      z={z}
      bg="cream"
      colStyle={{ paddingTop: U(96), paddingBottom: U(82) }}
      outer={
        <Side wide={wide}>
          <Deco art="oy" box={[170, 625, 200, 200]} unit={C} px="r" d={0.1} />
          <Deco art="halqali" box={[1080, 360, 200, 200]} unit={C} px="r" d={0.2} />
          <Star x={320} y={160} s={18} c={ORANGE} unit={C} d={0.2} />
          <Star x={1150} y={220} s={16} c={BLUE} unit={C} d={0.3} />
          <Star x={1100} y={765} s={20} c={ORANGE} unit={C} d={0.4} />
          <Star x={230} y={260} s={12} c={BLUE} unit={C} d={0.5} />
        </Side>
      }
    >
      {/* chok ustidagi ko‘k sayyora (03/04) */}
      <Deco art="kok" box={[20, -56, 104, 104]} unit={U} px="" className={st.seam} />
      <Title text={t("Bayram dasturi")} />
      <div className="relative" style={{ marginTop: U(41) }}>
        {items.map((it, i) => (
          <div key={i} className="relative" style={{ marginTop: i ? U(30) : 0, paddingLeft: U(104), paddingRight: U(24) }}>
            {i < items.length - 1 && <span data-a="line" className={st.route} style={vars({ left: U(71), top: U(15), width: U(2), height: `calc(100% + ${U(30)})`, "--d": `${0.15 + i * 0.15}s` })} />}
            <span data-a="dot" className={st.stop} style={vars({ left: U(60), top: U(2), width: U(26), height: U(26), borderWidth: U(2), background: DOTS[i % 3], "--d": `${0.1 + i * 0.15}s` })} />
            <p data-a="right" className={cx(st.ms7)} style={vars({ height: U(20), fontSize: U(15), lineHeight: `${U(20)}`, color: ORANGE, whiteSpace: "nowrap", "--d": `${0.14 + i * 0.15}s` })}>
              {it.time}
            </p>
            <p data-a="right" className={cx(st.ub7, st.clamp2)} style={vars({ marginTop: U(6), fontSize: U(19), lineHeight: `${U(24)}`, color: "var(--ink)", "--d": `${0.2 + i * 0.15}s` })}>
              {it.title}
            </p>
            {it.note?.trim() && (
              <p data-a="right" className={cx(st.ms, st.clamp2)} style={vars({ marginTop: U(6), fontSize: U(16), lineHeight: `${U(22)}`, color: "var(--mute)", "--d": `${0.26 + i * 0.15}s` })}>
                {it.note}
              </p>
            )}
          </div>
        ))}
      </div>
    </Sec>
  );
}

/* ═════════════ 05 · Manzil — surat (mijozning 2-surati; bo‘lmasa — bayram zali), joy nomi, manzil, xarita va yo‘nalish ═════════════ */
function Venue({ d, z, wide, linkable }: { d: D; z: number; wide: boolean; linkable: boolean }) {
  const t = useT();
  if (!d.hasPlace) return null;
  return (
    <Sec
      z={z}
      bg="night"
      sy={wide ? 0 : 20}
      colStyle={{ paddingTop: U(100), paddingBottom: U(64) }}
      outer={
        <Side wide={wide}>
          <Deco art="halqali" box={[1100, 380, 230, 230]} unit={C} px="r" d={0.1} />
          <Deco art="kok" box={[170, 170, 130, 130]} unit={C} px="" pk={0.2} d={0.2} />
        </Side>
      }
    >
      {/* chok ustidagi kosmonavt (04/05) — suzadi */}
      {/* Figma y −96; 8 birlik pastroq — uzun izohli oxirgi dastur qatori dubulg‘a ostida qolmaydi */}
      <Deco art="kosmonavt" box={[236, -88, 150, 150]} unit={U} bob={0.6} className={st.seam} />
      <Title text={t("Manzil")} color="var(--cream)" />
      <div data-a="zoom" className="relative mx-auto overflow-hidden" style={vars({ marginTop: U(31), width: U(342), height: U(228), borderRadius: U(26), background: "#090f24", "--d": "0.1s" })}>
        <Img src={d.hall} className={st.zoomImg} />
      </div>
      {d.venueTitle && (
        <p data-a="up" className={cx(st.ub6, "mx-auto text-center")} style={vars({ marginTop: U(28), width: U(342), minHeight: U(28), fontSize: U(22), lineHeight: `${U(28)}`, color: "var(--cream)", overflowWrap: "anywhere", "--d": "0.15s" })}>
          {d.venueTitle}
        </p>
      )}
      {d.address && (
        <p data-a="up" className={cx(st.ms, "mx-auto text-center")} style={vars({ marginTop: U(14), width: U(270), minHeight: U(54), fontSize: U(18), lineHeight: `${U(27)}`, color: "var(--cream)", overflowWrap: "anywhere", "--d": "0.22s" })}>
          {d.address}
        </p>
      )}
      <div data-a="up" className="relative mx-auto flex" style={vars({ marginTop: U(40), width: U(342), gap: U(12), "--d": "0.3s" })}>
        <a
          href={linkable ? d.mapUrl : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(st.ms7, st.btnFill)}
          style={{ flex: "1 1 0", minWidth: 0, height: U(56), padding: `0 ${U(10)}`, fontSize: U(17), borderRadius: U(28) }}
        >
          {t("Xaritada ochish")}
        </a>
        <a
          href={linkable ? d.taxi : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(st.ms7, st.btnLine)}
          style={{ flex: "1 1 0", minWidth: 0, height: U(56), padding: `0 ${U(10)}`, fontSize: U(17), borderWidth: U(1.5), borderRadius: U(28) }}
        >
          {t("Yo‘nalish")}
        </a>
      </div>
      {/* Figma 46,594 — «Xaritada ochish» yozuvi ustiga tushardi: tugma ostiga */}
      <Star x={40} y={632} s={14} c={YELLOW} unit={U} d={0.35} bottom={680} />
      <Star x={330} y={630} s={10} c={BLUE} unit={U} d={0.4} bottom={680} />
    </Sec>
  );
}

/* ═════════════ 06 · Dress-kod (ixtiyoriy — o‘chirilsa joy qolmaydi): sut rang karta ═════════════ */
function Dress({ d, z }: { d: D; z: number }) {
  const t = useT();
  if (!d.dressNote && !d.dressCode) return null;
  return (
    <Sec z={z} bg="night" sy={-320} colStyle={{ paddingTop: U(44), paddingBottom: U(55) }}>
      <div data-a="rise" className={cx(st.dressCard, "relative mx-auto flex flex-col items-center text-center")} style={{ width: U(342), padding: `${U(28)} ${U(24)}`, gap: U(12), borderRadius: U(24) }}>
        <p className={st.ms6} style={{ fontSize: U(15), lineHeight: `${U(20)}`, color: ORANGE }}>
          {t("Kiyinish uslubi")}
        </p>
        {d.dressCode && (
          <p className={st.ub7} style={{ height: U(32), fontSize: U(26), lineHeight: `${U(32)}`, color: "var(--ink)", whiteSpace: "nowrap" }}>
            <Fit base={26} max={294} deps={d.dressCode}>
              {d.dressCode}
            </Fit>
          </p>
        )}
        {d.dressNote && (
          <p className={st.ms} style={{ width: "100%", fontSize: U(17), lineHeight: `${U(23)}`, color: "var(--ink)", overflowWrap: "anywhere" }}>
            {d.dressNote}
          </p>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 07 · Anketa — javob («Kelaman» — tugmadan kichik raketa uchib chiqadi; «Kela olmayman» — oy chayqaladi) ═════════════ */
function Rsvp({ d, slug, mode, z, wide }: { d: D; slug: string; mode: InvitationSiteProps["mode"]; z: number; wide: boolean }) {
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
  const [wob, setWob] = useState(0);
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
    <p className={cx(st.ms6, st.lbl)} style={{ marginTop: U(mt), height: U(20), fontSize: U(15), lineHeight: `${U(20)}` }}>
      {s}
    </p>
  );
  const sub = d.rsvpUntil ? t("Iltimos, {date} javob bering", { date: d.rsvpUntil }) : t(d.we ? "Javobingizni kutamiz" : "Javobingizni kutaman");
  const pick = (s: RsvpStatus) => {
    setStatus(s);
    if (s === "coming") setFly((n) => n + 1);
    else setWob((n) => n + 1);
  };
  return (
    <Sec
      z={z}
      bg="cream"
      id="koinot-javob"
      colStyle={{ paddingTop: U(96), paddingBottom: U(64) }}
      outer={
        <Side wide={wide}>
          <Deco art="kok" box={[170, 380, 150, 150]} unit={C} px="" pk={0.2} d={0.1} />
          <Deco art="raketa" box={rocketBox(1110, 460, 146.65, -14)} unit={C} rot={-14} bob={2.1} px="" pk={0.2} d={0.2} />
          <Star x={300} y={180} s={20} c={ORANGE} unit={C} d={0.2} />
          <Star x={1140} y={140} s={14} c={BLUE} unit={C} d={0.3} />
          <Star x={240} y={620} s={14} c={BLUE} unit={C} d={0.4} />
          <Star x={1170} y={700} s={22} c={ORANGE} unit={C} d={0.5} />
          <Star x={1080} y={420} s={12} c={ORANGE} unit={C} d={0.6} />
          <Star x={340} y={900} s={16} c={BLUE} unit={C} d={0.7} />
        </Side>
      }
    >
      {/* chok ustidagi oy (06/07) — «Kela olmayman» bosilsa yengil chayqaladi */}
      <Deco art="oy" box={[28, -58, 110, 110]} unit={U} px="r" className={st.seam} innerClass={wob ? st.wobble : undefined} innerKey={wob} />
      <Star x={330} y={60} s={16} c={ORANGE} unit={U} d={0.1} />
      <Star x={350} y={98} s={10} c={BLUE} unit={U} d={0.2} />
      <h2 data-a="up" className={cx(st.ub7, "mx-auto text-center")} style={vars({ width: U(300), fontSize: U(30), lineHeight: `${U(36)}`, color: "var(--ink)", overflowWrap: "anywhere", "--d": "0.05s" })}>
        {t("Bayramga kelasizmi?")}
      </h2>
      <p data-a="up" className={cx(st.ms, "mx-auto text-center")} style={vars({ marginTop: U(18), width: U(342), minHeight: U(25), fontSize: U(18), lineHeight: `${U(25)}`, color: "var(--mute)", overflowWrap: "anywhere", "--d": "0.12s" })}>
        {sub}
      </p>
      <div
        data-a="rise"
        className={cx(st.card, "relative mx-auto")}
        style={vars({ marginTop: U(25), width: U(342), padding: `${U(26)} ${U(24)} ${U(24)}`, borderRadius: U(28), boxShadow: `0 ${U(12)} ${U(32)} rgba(23,28,51,.08)`, "--d": "0.2s" })}
      >
        {sent ? (
          <div key="thanks" className={cx(st.thanks, "relative flex flex-col items-center text-center")} style={{ padding: `${U(60)} ${U(6)} ${U(40)}`, gap: U(16), minHeight: U(420) }}>
            <div aria-hidden style={{ width: U(110), height: U(110) }}>
              <Img src={`${P}/${sent === "not_coming" ? "oy" : "kosmonavt"}.webp`} className={st.bobSoft} />
            </div>
            <p className={st.ub7} style={{ fontSize: U(sent === "not_coming" ? 26 : 22), lineHeight: 1.3, color: "var(--ink)", overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Rahmat!") : t("Rahmat! Joyingiz band qilindi")}
            </p>
            <p className={st.ms} style={{ fontSize: U(17), color: "var(--mute)", lineHeight: 1.5, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Javobingiz uchun rahmat!") : t("{name} — {count} kishi. Javobingiz yetkazildi.", { name: name.trim() || t("Javobingiz"), count })}
            </p>
            <button type="button" onClick={() => setSent(null)} className={st.ms6} style={{ fontSize: U(16), color: ORANGE, textDecoration: "underline", textUnderlineOffset: 3 }}>
              {t("Javobni o‘zgartirish")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="relative flex flex-col items-stretch">
            {label(t("Ismingiz"), 0)}
            <label className={st.field} style={{ marginTop: U(4), height: U(54), padding: `0 ${U(18)}`, borderRadius: U(16) }}>
              <input
                className={cx(st.ms, st.input)}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder={t("Ism va familiya")}
                aria-label={t("Ismingiz")}
                style={{ fontSize: U(17) }}
              />
            </label>
            {label(t("Kelasizmi?"), 22)}
            <div className="flex w-full" role="radiogroup" aria-label={t("Kelasizmi?")} style={{ marginTop: U(4), gap: U(12) }}>
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
                  className={cx(st.ms7, st.choice)}
                  style={{ padding: `${U(4)} ${U(3)}`, minHeight: U(54), fontSize: U(17), borderWidth: U(1.5), borderRadius: U(27) }}
                >
                  <span style={{ overflowWrap: "anywhere" }}>{t(l)}</span>
                  {s === "coming" && fly > 0 && (
                    <span key={fly} aria-hidden className={st.fly} style={{ width: U(26), height: U(39), marginLeft: U(-13) }}>
                      <Img src={`${P}/raketa.webp`} />
                    </span>
                  )}
                </button>
              ))}
            </div>
            {status === "coming" && (
              <>
                {label(t("Necha kishi bo‘lasiz?"), 22)}
                <div className={cx(st.field, "justify-between")} style={{ marginTop: U(4), height: U(54), padding: `0 ${U(8)}`, borderRadius: U(16) }}>
                  <button type="button" className={cx(st.ub6, st.step)} disabled={count <= 1} onClick={() => setCount((n) => Math.max(1, n - 1))} aria-label={t("Kamaytirish")} style={{ width: U(40), height: U(40), fontSize: U(20), borderWidth: U(1.5) }}>
                    −
                  </button>
                  <span className={st.ub7} style={{ fontSize: U(22), lineHeight: 1.2, color: "var(--ink)" }} aria-live="polite">
                    {count}
                  </span>
                  <button type="button" className={cx(st.ub6, st.step)} disabled={count >= 20} onClick={() => setCount((n) => Math.min(20, n + 1))} aria-label={t("Ko‘paytirish")} style={{ width: U(40), height: U(40), fontSize: U(20), borderWidth: U(1.5) }}>
                    +
                  </button>
                </div>
                <p className={st.ms} style={{ marginTop: U(8), fontSize: U(14), lineHeight: `${U(19)}`, color: "var(--mute)" }}>
                  {t("kattalar va bolalar birga")}
                </p>
              </>
            )}
            {label(d.wishLabel, 25)}
            <label className={st.field} style={{ marginTop: U(4), height: U(120), padding: `${U(16)} ${U(18)}`, borderRadius: U(16), alignItems: "flex-start" }}>
              <textarea
                rows={4}
                className={cx(st.ms, st.input)}
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                maxLength={500}
                placeholder={t("Tilagingizni yozing…")}
                aria-label={d.wishLabel}
                style={{ fontSize: U(17), height: "100%" }}
              />
            </label>
            {err && (
              <p className={st.ms} style={{ marginTop: U(12), color: "#c2410c", fontSize: U(15) }}>
                {err}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className={cx(st.ms7, st.submit)}
              style={{ marginTop: U(20), minHeight: U(56), padding: `${U(10)} ${U(12)}`, fontSize: U(17), borderRadius: U(28), opacity: busy ? 0.7 : 1 }}
            >
              {busy ? t("Yuborilmoqda…") : t("Javobni yuborish")}
            </button>
          </form>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 08 · Final — raketa diagonal uchib keladi, yulduzlar yog‘iladi (3–4 ta «uchar yulduz»), kosmonavt suzadi
 * (scroll bilan: --fc 0 … 1 = Figma kadri; sahifa oxirigacha albatta tugaydi) ═════════════ */
const SHOOT = [
  [300, 40, 0.12],
  [380, 210, 0.3],
  [250, 560, 0.46],
  [360, 640, 0.6],
] as const;
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
  const title = t(d.we ? "Sizni kutamiz!" : "Sizni kutaman!");
  const [rx, ry, rw, rh] = rocketBox(40, 250, 126.972, 28);
  return (
    <section ref={sec} className={cx(st.sec, st.night, st.fin)} style={vars({ zIndex: z })}>
      <Side wide={wide}>
        <Deco art="oy" box={[1040, 613, 360, 360]} unit={C} px="r" d={0.1} />
        <Deco art="halqali" box={[150, 170, 220, 220]} unit={C} px="r" d={0.2} />
      </Side>
      <div ref={ref} className={cx(st.col, st.finalWrap)} style={vars({ width: U(390), height: U(844), ...(still ? { "--fc": 1 } : {}) })}>
        {/* chok ustidagi halqali sayyora (07/08) */}
        <Deco art="halqali" box={[236, -60, 150, 150]} unit={U} px="r" className={st.seam} />
        {!wide && <Deco art="oy" box={[-60, 560, 280, 280]} unit={U} px="r" pk={0.08} d={0.1} />}
        {/* uchar yulduzlar — diagonal o‘tib, so‘nadi (Figma kadrida yo‘q) */}
        {SHOOT.map(([x, y, s0], i) => (
          <span key={i} aria-hidden className={st.shoot} style={vars({ left: U(x), top: U(y), width: U(110), height: U(2), "--s0": s0 })} />
        ))}
        <div aria-hidden className={cx(st.art, st.fRocket)} style={{ left: U(rx), top: U(ry), width: U(rw), height: U(rh) }}>
          <div className={st.fill} style={{ transform: "rotate(28deg)" }}>
            <span className={st.fFlame} style={{ left: U(rw / 2 - 9), top: U(rh * (NOZZLE / 300) - 4), width: U(18), height: U(70) }}>
              <span className={st.flameIn} />
            </span>
            <Img src={`${P}/raketa.webp`} />
          </div>
        </div>
        <Deco art="kosmonavt" box={[150, 150, 210, 210]} unit={U} bob={1.6} innerClass={st.wave} d={0.15} />
        <div className="absolute inset-x-0" style={{ top: U(396) }}>
          <h2 data-a="up" className={cx(st.ub9, "mx-auto text-center")} style={vars({ width: U(300), fontSize: U(36), lineHeight: `${U(40.32)}`, color: "var(--cream)", overflowWrap: "anywhere", "--d": "0.1s" })}>
            {title}
          </h2>
          {d.finalSub && (
            <p data-a="up" className={cx(st.ms5, "mx-auto text-center")} style={vars({ marginTop: U(23.4), width: U(342), fontSize: U(20), lineHeight: `${U(27)}`, color: ORANGE, overflowWrap: "anywhere", "--d": "0.22s" })}>
              {d.finalSub}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ═════════════ Musiqa tugmasi — Figma «Koinot / Musiqa tugmasi»: tungi doira, sut rang halqa, 4 ta to‘q sariq chiziq ritmda;
 * o‘chirilgan — chiziqlar sut rangda, past (4px) ═════════════ */
const BARS = [10, 18, 13, 20];
function KoinotMusic({ m, wide, embedded }: { m: ReturnType<typeof useMusic>; wide: boolean; embedded: boolean }) {
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
type Key = "taklif" | "sana" | "program" | "venue" | "dress" | "rsvp" | "final";

export function KoinotSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const loaded = usePreload(
    [`${P}/raketa.webp`, `${P}/tutun.webp`, `${P}/oy.webp`, `${P}/halqali.webp`, `${P}/kok.webp`, `${P}/yulduzlar-a.svg`, `${P}/yulduzlar-b.svg`, d.portrait || `${P}/kosmonavt.webp`].filter(Boolean) as string[],
    [d.hall, `${P}/kosmonavt.webp`].filter(Boolean) as string[],
    withGate,
    wide ? "l" : "m",
  );
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

  const shown: Key[] = (["taklif", "sana", "program", "venue", "dress", "rsvp", "final"] as Key[]).filter((k) =>
    k === "sana" ? d.hasDate : k === "program" ? d.program.length > 0 : k === "venue" ? d.hasPlace : k === "dress" ? !!(d.dressNote || d.dressCode) : k === "rsvp" ? data.rsvpEnabled : true,
  );
  const z = (k: Key) => 6 + shown.indexOf(k);
  const linkable = mode !== "preview";
  const colU = wide ? COL_L : COL_M;

  return (
    <div ref={root} className={st.root}>
      <div className={st.page} style={vars({ "--u": colU, "--tw": wide ? C(390) : "100cqw", "--th": wide ? C(420) : "calc(100cqw / 390 * 420)" })}>
        <KoinotMusic m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/muhr.webp`} />}
        <div className={cx(st.flow, st.opening)} style={embedded ? vars({ "--o": 1 }) : undefined}>
          {withGate && (loaded ? <Gate d={d} wide={wide} onStart={() => music.play(true)} /> : <div className={st.gateHold} />)}
          {embedded && <Gate d={d} wide={wide} still onStart={() => {}} />}
          <div className={cx(st.openWrap, embedded && st.openStill)} style={{ zIndex: 5 }}>
            <Hero d={d} wide={wide} still={embedded} />
            {withGate && <div className={st.openSpacer} />}
          </div>
          <Taklif d={d} z={z("taklif")} wide={wide} />
          <Sana d={d} z={z("sana")} wide={wide} />
          <Program d={d} z={z("program")} wide={wide} />
          <Venue d={d} z={z("venue")} wide={wide} linkable={linkable} />
          <Dress d={d} z={z("dress")} />
          {data.rsvpEnabled && <Rsvp d={d} slug={data.slug} mode={mode} z={z("rsvp")} wide={wide} />}
          <Final d={d} z={z("final")} wide={wide} still={embedded} onSeen={onFinal} />
        </div>
        <footer className={cx(st.footer, "flex items-start justify-center")} style={{ height: U(120), paddingTop: U(50) }}>
          <p className={cx(st.ms5, "text-center")} style={{ fontSize: U(14), lineHeight: `${U(19)}`, color: "rgba(255,244,226,.6)" }}>
            <a href="https://shohnoma.uz">{t("shohnoma.uz orqali yaratilgan")}</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
