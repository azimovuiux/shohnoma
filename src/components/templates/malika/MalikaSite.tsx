"use client";

import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { splitDate, tashkentDate } from "@/lib/display";
import { musicSrc } from "@/lib/music";
import { tr, useLocale, useT, type Locale } from "@/lib/i18n";
import type { InvitationSiteProps } from "@/components/invitation/types";
import { fetchSavedAnswer, loadSavedRsvp, rsvpUrl, saveRsvp, type RsvpStatus } from "@/components/invitation/Rsvp";
import { guestHello, useGuestName } from "../shared/guest";
import { timerUnits } from "@/components/invitation/data";
import { useCountdown, useCountUp, useInView, useScrollProgress, useWide } from "../shared/hooks";
import { Loader, usePreload, useMusic } from "../shared/runtime";
import { calendarWords, untilPhrase, type ProgramItem } from "../anor/data";
import { DRESS_TEXT, MALIKA_DEMO, MALIKA_DEMO_EN, MALIKA_DEMO_RU, P, QUOTE, QUOTE_HOST, programIcon, type IconKey } from "./data";
import st from "./malika.module.css";

/* ── Birliklar ──
 * U — joriy `--u`: bo‘limlarda kontent ustuni (Figma mobil 390 koordinatalari; laptopda ustun = mobil × 1.45, ya’ni 565.5px / 1440).
 * C — laptop kanvasi (1440) birligi: yon bezaklar (gullar, bantlar, pardalar) va chok ustidagi bezaklar.
 * Ochilish (atlas pardalar), hero va final — o‘z kanvasi (mobil 390×844, laptop 1440×900); ochilish va hero sahnasi bir ekranga
 * sig‘adi va pastki chetga bog‘lanadi. Ochilish pardalari — `--cu` (ekranni eni va bo‘yi bo‘yicha to‘liq yopadi). */
const U = (n: number) => `calc(var(--u) * ${+n.toFixed(3)})`;
const C = (n: number) => `calc(100cqw / 1440 * ${+n.toFixed(3)})`;
const CU = (n: number) => `calc(var(--cu) * ${+n.toFixed(3)})`;
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const vars = (o: Record<string, string | number | undefined>) => o as CSSProperties;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const COL_M = "calc(100cqw / 390)";
const COL_L = "calc(100cqw / 1440 * 1.45)";
const CANVAS_L = "calc(100cqw / 1440)";

/* ═════════════ Yosh ═════════════ */
/** «18» → 18 (1…120); bo‘lmasa 0 */
function parseAge(raw: string) {
  const n = Math.round(Number(String(raw).replace(/[^\d.]/g, "")));
  return raw.trim() && Number.isFinite(n) && n >= 1 && n <= 120 ? n : 0;
}
/** «18 yosh» / «18 лет» / «18 years» */
function ageLabel(lang: Locale, n: number) {
  if (lang === "ru") {
    const a = n % 10;
    const b = n % 100;
    return `${n} ${a === 1 && b !== 11 ? "год" : a >= 2 && a <= 4 && (b < 12 || b > 14) ? "года" : "лет"}`;
  }
  if (lang === "en") return `${n} ${n === 1 ? "year" : "years"}`;
  return `${n} yosh`;
}
/** Ism + jo‘nalish qo‘shimchasi: «Sabinaga», «Malikka», «Tolibqa» */
const dative = (name: string) => {
  const last = name.slice(-1).toLowerCase();
  return name + (last === "k" ? "ka" : last === "q" ? "qa" : "ga");
};

/** Server yaratadigan standart taklif matni (php/api/lib/orders.php DEFAULT_MESSAGE) — har qaysi tilda */
const SERVER_DEFAULT = "Aziz mehmonlar! Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.";
const isServerDefault = (m: string) => (["uz", "ru", "en"] as Locale[]).some((l) => tr(l, SERVER_DEFAULT).trim() === m.trim());
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function useData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO = lang === "ru" ? MALIKA_DEMO_RU : lang === "en" ? MALIKA_DEMO_EN : MALIKA_DEMO;
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
    // taklif qiluvchi (ixtiyoriy, masalan, ota-ona): bo‘lsa — matnlar «biz» nomidan, gerb ostida imzo
    const host = str("host");
    const we = !!host;
    const age = parseAge(str("age") || (demo ? DEMO.age : ""));
    const code = str("dressCode") || (demo ? DEMO.dressCode : "");
    const dressNote = str("dressNote") || (DRESS_TEXT[code] ? t(DRESS_TEXT[code]) : "");
    const time = sd?.time ?? "";
    const program = (demo ? DEMO.program : exProgram.length ? exProgram : ((data.program ?? []) as ProgramItem[])) as ProgramItem[];
    const raw = (demo ? "" : data.message || "").trim();
    const custom =
      raw && !isServerDefault(raw)
        ? raw.replace(/^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Muhtaram mehmonlar!|Aziz do‘stlarim!|Дорогие гости!|Dear guests!)\s*/, "").trim()
        : "";
    const venueTitle = ((demo ? t(data.venueName) : data.venueName) || "").trim();
    const address = ((demo ? DEMO.address : data.address) || "").trim();
    const m = date ? date.getUTCMonth() : 0;
    const year = date ? date.getUTCFullYear() : 0;
    const day = date ? date.getUTCDate() : 0;
    // namunada javob muddati — Figma’dagidek sanadan 14 kun oldin («10-iyulgacha»)
    const deadline = demo && sd ? new Date(Date.UTC(year, m, day - 14)).toISOString().slice(0, 10) : data.rsvpDeadline;
    const dow = date ? date.getUTCDay() : 0;
    // Figma: hero — portret, 05 — choy stoli surati, manzil — bal zali (mijozda: 1–3-suratlar; hero surati bo‘lmasa —
    // ramkada gerb va ism harfi, 05 surati bo‘lmasa — bo‘lim chiqmaydi, manzil surati bo‘lmasa — bal zali)
    const portrait = demo ? `${P}/portret.webp` : photos[0] || "";
    const tea = demo ? `${P}/choy.webp` : photos[1] || "";
    const hall = demo ? `${P}/zal.webp` : photos[2] || `${P}/zal.webp`;
    // kalendar: oyning birinchi kuni (Du = 0) va kunlar soni
    const first = date ? (new Date(Date.UTC(year, m, 1)).getUTCDay() + 6) % 7 : 0;
    const days = date ? new Date(Date.UTC(year, m + 1, 0)).getUTCDate() : 0;
    return {
      a,
      we,
      /** gerbdagi monogramma — ismning birinchi harfi */
      mono: a ? Array.from(a)[0].toLocaleUpperCase(lang) : "",
      age,
      ageText: age ? String(age) : "",
      /** «18 yosh» / «18 лет» / «18 years» (hero’da bosh harflar bilan) */
      ageLine: age ? ageLabel(lang, age) : "",
      /** pleyer kartasi: «Sabina — 18» */
      songTitle: [a, age ? String(age) : ""].filter(Boolean).join(" — "),
      quote: custom ? custom : lang === "en" ? `“${t(we ? QUOTE_HOST : QUOTE)}”` : `«${t(we ? QUOTE_HOST : QUOTE)}»`,
      /** gerb ostidagi qator: namunada — Figma («Ota-onam: …»), mijozda — taklif qiluvchi imzosi */
      sign: demo ? t("Ota-onam: {names}", { names: DEMO.parents }) : host ? t("Mehr bilan, {host}", { host }) : "",
      /** «24 · 07 · 2027» */
      dots: sd?.dots ?? "",
      /** «24 · 07 · 2027 · 18:00» */
      dotsTime: [sd?.dots, time].filter(Boolean).join(" · "),
      time,
      hasDate: !!date,
      target: data.date ? tashkentDate(data.date).getTime() : null,
      cal: { month: cw.months[m] ?? "", weekday: cw.weekday[dow] ?? "", year: year ? String(year) : "", day, first, days, week: cw.week },
      /** «24 iyul» / «24 июля» / «24 July» */
      dayMonth: date ? `${day} ${cw.monthsAfterDay[m]}` : "",
      guest,
      venueTitle,
      address,
      hasPlace: !!(venueTitle || address || data.mapUrl),
      mapUrl: data.mapUrl || `https://yandex.uz/maps/?text=${encodeURIComponent([venueTitle, address].filter(Boolean).join(", "))}`,
      program,
      dressCode: DRESS_TEXT[code] || str("dressCode") ? t(code) : "",
      dressNote,
      portrait,
      tea,
      hall,
      rsvpUntil: untilPhrase(deadline, lang),
      wishPh: a ? (lang === "uz" ? `${dative(a)} tilak…` : t("{name}ga tilak…", { name: a })) : t("Tilagingiz…"),
      musicUrl: musicSrc(template, data),
      demo,
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
type Box4 = readonly [number, number, number, number];
/** Rasm qatlami (x, y, w, h) berilgan birlikda; `flip` — gorizontal ko‘zgu (Figma «-scale-y + rotate 180»), `flipY` — vertikal */
function Art({
  src,
  box,
  unit,
  flip,
  flipY,
  a,
  d = 0,
  className,
  center,
}: {
  src: string;
  box: Box4;
  unit: (n: number) => string;
  flip?: boolean;
  flipY?: boolean;
  a?: string;
  d?: number;
  className?: string;
  /** x — ustun markazidan (390 ustunda 195) */
  center?: number;
}) {
  const [x, y, w, h] = box;
  return (
    <div
      aria-hidden
      data-a={a}
      className={cx(st.art, className)}
      style={vars({ left: center != null ? `calc(50% + ${unit(x - center)})` : unit(x), top: unit(y), width: unit(w), height: unit(h), "--d": `${d}s` })}
    >
      <Img src={src} className={cx(flip && st.flip, flipY && st.flipY)} />
    </div>
  );
}

/** Bant ajratgich (Figma «Malika / Bezak · Bant ajratgich», 240×24 vektor) */
function Divider({ className, style, a, d = 0 }: { className?: string; style?: CSSProperties; a?: string; d?: number }) {
  return (
    <div aria-hidden data-a={a} className={cx(st.divider, className)} style={vars({ "--d": `${d}s`, ...(style as Record<string, string>) })}>
      <svg viewBox="0 0 241 24" preserveAspectRatio="none" className={st.svg}>
        <path className={st.dvLine} d="M0.5 12H98.5M142.5 12H240.5" stroke="#D9A0A8" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke" />
        <path
          className={st.dvBow}
          d="M120.5 12C112.5 4 104.5 5 105.5 11C106.5 17 114.5 16 120.5 12ZM120.5 12C128.5 4 136.5 5 135.5 11C134.5 17 126.5 16 120.5 12Z M115.5 22L120.5 12L125.5 22"
          stroke="#B76E79"
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          pathLength={1}
        />
      </svg>
    </div>
  );
}

/** Dastur ikonkalari (Figma «Malika / Ikonka · …», 40×40 vektor) — chiziq bilan chiziladi */
const ICON_PATHS: Record<IconKey | "pin", ReactNode> = {
  toj: (
    <>
      <path d="M6 30L4 12L13 20L20 8L27 20L36 12L34 30H6Z" />
      <path d="M6 34H34" />
    </>
  ),
  ziyofat: (
    <>
      <path d="M13 18V35" />
      <path d="M9 5V13C9 18 17 18 17 13V5" />
      <path d="M27 35V5C33 9 33 19 27 21" />
    </>
  ),
  vals: (
    <>
      <path d="M15 30V9L32 5V26" />
      <circle cx="11" cy="30" r="3.75" />
      <circle cx="28" cy="26" r="3.75" />
    </>
  ),
  tort: (
    <>
      <path d="M7 35H33V23H7V35Z" />
      <path d="M11 23V16H29V23" />
      <path d="M16 16V10M24 16V10" />
      <path d="M16 5C14 7 16 9 16 9C16 9 18 7 16 5ZM24 5C22 7 24 9 24 9C24 9 26 7 24 5Z" strokeWidth={1.2} />
    </>
  ),
  pin: (
    <>
      <path d="M20 36C20 36 8 24 8 16C8 9 13.5 4 20 4C26.5 4 32 9 32 16C32 24 20 36 20 36Z" />
      <circle cx="20" cy="16" r="3.25" />
    </>
  ),
};
function Icon({ k, className, style, a, d = 0, color = "#8C4A57" }: { k: IconKey | "pin"; className?: string; style?: CSSProperties; a?: string; d?: number; color?: string }) {
  return (
    <svg
      aria-hidden
      data-a={a}
      viewBox="0 0 40 40"
      className={cx(st.icon, className)}
      style={vars({ "--d": `${d}s`, ...(style as Record<string, string>) })}
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICON_PATHS[k]}
    </svg>
  );
}

/** Gerb (Figma: «Gerb ichi» — krem ellips, «Marvarid gerb», «Tiara»): shimmer — tiara va gerb ustidan yaltiroq o‘tadi */
type CrestGeo = { inner: Box4; gerb: readonly [number, number, number]; tiara: Box4 };
type Pos = (n: number) => string;
function Crest({ g, top, size, place, shine, tiaraClass, children }: { g: CrestGeo; top: Pos; size: Pos; place: Pos; shine?: boolean; tiaraClass?: string; children?: ReactNode }) {
  const [ix, iy, iw, ih] = g.inner;
  const [gx, gy, gs] = g.gerb;
  const [tx, ty, tw, th] = g.tiara;
  return (
    <>
      <span aria-hidden className={st.inner} style={{ left: place(ix), top: top(iy), width: size(iw), height: size(ih) }} />
      <div aria-hidden className={st.art} style={{ left: place(gx), top: top(gy), width: size(gs), height: size(gs) }}>
        <Img src={`${P}/gerb.webp`} eager />
        {shine && <span className={st.shine} style={{ maskImage: `url(${P}/gerb.webp)`, WebkitMaskImage: `url(${P}/gerb.webp)` }} />}
      </div>
      {children}
      <div aria-hidden className={cx(st.art, tiaraClass)} style={{ left: place(tx), top: top(ty), width: size(tw), height: size(th) }}>
        <Img src={`${P}/tiara.webp`} eager />
        {shine && <span className={cx(st.shine, st.shineT)} style={{ maskImage: `url(${P}/tiara.webp)`, WebkitMaskImage: `url(${P}/tiara.webp)` }} />}
      </div>
    </>
  );
}

/** Monogramma (ismning birinchi harfi): avval kontur chizilib yoziladi, keyin to‘ladi */
function Mono({ ch, className, style }: { ch: string; className?: string; style?: CSSProperties }) {
  return (
    <p className={cx(st.cgI, st.mono, className)} style={style} aria-hidden>
      <span className={st.monoIn}>
        <span className={st.monoLine}>{ch}</span>
        <span className={st.monoFill}>{ch}</span>
      </span>
    </p>
  );
}

/* ═════════════ 00 · Ochilish — atlas pardalar (faqat scroll bilan, --o: 0…1) ═════════════
 * Yuklanganda (vaqt bo‘yicha, bosishsiz): gerbdagi monogramma chizilib yoziladi, tiara yuqoridan tushib o‘rnashadi va yaltiraydi,
 * yorug‘lik «nafas oladi». Scroll (sovga/riviera kabi rAF lerp): yozuvlar so‘nadi (0…0.06); pardalar yon tomonlarga tortiladi —
 * tashqi chet atrofida torayib, burmalari yig‘iladi (0.03…0.6); gerb tiara bilan yuqoriga ko‘tarilib ketadi (0.02…0.32).
 * Pardalar ortidan hero ochiladi (01 — sticky, --o bilan). */
const GATE = {
  m: {
    W: 390,
    H: 844,
    cur: { x: -167.74, xr: -16.18, w: 573.92, h: 860.88 },
    light: [15, 220, 360, 360] as Box4,
    light2: [-5, 510, 400, 180] as Box4,
    crest: { inner: [113, 294, 164, 196], gerb: [65, 270, 260], tiara: [110, 205.33, 170, 113.333] } as CrestGeo,
    mono: [318, 100, 96] as const,
    age: [420, 29, 24, 6] as const,
    name: [556, 68, 56] as const,
    sub: [624, 27, 22] as const,
    date: [668, 18, 13, 5] as const,
    max: 366,
  },
  l: {
    W: 1440,
    H: 900,
    cur: { x: -729.7, xr: 39.7, w: 2130, h: 3195 },
    light: [420, 120, 600, 600] as Box4,
    light2: [400, 550, 640, 220] as Box4,
    crest: { inner: [620, 280, 200, 240], gerb: [560, 250, 320], tiara: [615, 162, 210, 140] } as CrestGeo,
    mono: [300, 124, 120] as const,
    age: [436, 36, 30, 8] as const,
    name: [610, 87, 72] as const,
    sub: [696, 34, 28] as const,
    date: [752, 20, 15, 6] as const,
    max: 1100,
  },
} as const;

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
      el.style.pointerEvents = o > 0.1 ? "none" : "";
      el.style.visibility = o > 0.64 ? "hidden" : "";
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
  const { W, H } = G;
  const pageU = wide ? CANVAS_L : COL_M;
  const X = (x: number) => `calc(50% + ${U(x - W / 2)})`;
  const Y = (y: number) => `calc(100% - ${U(H - y)})`;
  const [mT, mH, mF] = G.mono;
  const [aT, aH, aF, aLs] = G.age;
  const [nT, nH, nF] = G.name;
  const [sT, sH, sF] = G.sub;
  const [dT, dH, dF, dLs] = G.date;
  const sub = t("tug‘ilgan kun kechasi");
  const box = (b: Box4) => ({ left: X(b[0]), top: Y(b[1]), width: U(b[2]), height: U(b[3]) });
  // pardalar: eni bo‘yicha sahifa birligida (`--cu` — ekranni to‘liq yopadi); mobilda bog‘ich nuqtasi gerb ostida (Figma y≈479)
  const c = G.cur;
  const curTop = wide ? CU(-70) : `calc(100% - ${U(H - 479)} - ${CU(487.6)})`;
  const curL = { left: `calc(50% + ${CU(c.x - W / 2)})`, top: curTop, width: CU(c.w), height: CU(c.h) };
  const curR = { left: `calc(50% + ${CU(c.xr - W / 2)})`, top: curTop, width: CU(c.w), height: CU(c.h) };
  return (
    <div
      ref={wrap}
      className={cx(st.gateWrap, still && st.still)}
      style={vars(still ? { "--u": pageU, "--cu": pageU, "--o": 0, height: U(H), marginBottom: 0 } : { "--u": `min(${pageU}, calc(100svh / ${H}))`, "--cu": `max(${pageU}, calc(100svh / ${H}))` })}
    >
      <div className={st.gate} aria-label={t("Taklifnoma")} style={still ? { position: "relative", height: "100%" } : undefined}>
        <div aria-hidden className={st.gBg} />
        <div aria-hidden className={cx(st.gCur, st.gCurL)} style={curL}>
          <Img src={`${P}/parda.webp`} eager />
        </div>
        <div aria-hidden className={cx(st.gCur, st.gCurR)} style={curR}>
          <Img src={`${P}/parda.webp`} eager className={st.flip} />
        </div>
        <div aria-hidden className={st.gLights}>
          <span className={cx(st.light, st.breath)} style={box(G.light)} />
          <span className={cx(st.light, st.breath)} style={box(G.light2)} />
        </div>
        {/* gerb, tiara, monogramma va yosh — pardalar ochilganda yuqoriga ko‘tarilib ketadi */}
        <div className={st.gCrest}>
          <div className={cx(st.gIn)} style={vars({ position: "absolute", inset: 0, "--gd": "0.1s" })}>
            <Crest g={G.crest} top={Y} size={U} place={X} shine tiaraClass={st.gTiara}>
              {d.mono && <Mono ch={d.mono} className="absolute inset-x-0 text-center" style={{ top: Y(mT), height: U(mH), fontSize: U(mF), lineHeight: `${U(mH)}`, color: "var(--mauve)" }} />}
              {d.ageText && (
                <p className={cx(st.cgS, st.gAge, "absolute inset-x-0 text-center")} style={{ top: Y(aT), height: U(aH), fontSize: U(aF), lineHeight: `${U(aH)}`, color: "var(--deep)" }}>
                  <span style={{ letterSpacing: U(aLs), paddingLeft: U(aLs) }}>{d.ageText}</span>
                </p>
              )}
            </Crest>
          </div>
        </div>
        <div className={st.gText}>
          {d.a && (
            <div className={cx(st.cgI, st.gIn, "absolute inset-x-0 text-center")} style={vars({ bottom: U(H - nT - nH), color: "var(--mauve)", "--gd": "0.5s" })}>
              <NameLines text={d.a} base={nF} max={G.max} lh={nH} two={nF * 0.72} twoLh={nH * 0.72} />
            </div>
          )}
          <p className={cx(st.cgI, st.gIn, "absolute inset-x-0 text-center")} style={vars({ top: Y(sT), height: U(sH), fontSize: U(sF), lineHeight: `${U(sH)}`, color: "var(--ink)", "--gd": "0.65s" })}>
            <Fit base={sF} max={G.max} deps={sub}>
              {sub}
            </Fit>
          </p>
          {d.dots && (
            <p className={cx(st.msM, st.gIn, "absolute inset-x-0 text-center")} style={vars({ top: Y(dT), height: U(dH), fontSize: U(dF), lineHeight: `${U(dH)}`, color: "var(--mauve)", whiteSpace: "nowrap", "--gd": "0.8s" })}>
              <span style={{ letterSpacing: U(dLs), paddingLeft: U(dLs) }}>{d.dots}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═════════════ 01 · Hero — malika portreti (ochilish ostida sticky; --o bilan):
 * surat 1.12 → 1 (zoom-out), gul barglari yuqoridan to‘kiladi (scroll bilan; o = 1 da hammasi ekrandan chiqqan), ism harflari
 * birin-ketin ko‘tariladi, «18 YOSH»; laptopda yon pardalar (bog‘langan) chetdan kirib keladi ═════════════ */
const HERO = {
  m: { W: 390, H: 844, name: [34, 92, 76] as const, sub: [19, 16, 8] as const, photoTop: 176, max: 366 },
  // laptop: ism yon pardalar orasiga sig‘adi (matn rasm ustiga tushmaydi)
  l: { W: 1440, H: 900, name: [24, 121, 100] as const, sub: [22, 18, 10] as const, photo: [420, 210, 600, 690] as Box4, max: 880 },
} as const;
/** Barglar: x (%), boshlanish, davomiylik (--o), o‘lcham, aylanish, chayqalish */
const PETALS: [number, number, number, number, number, number][] = [
  [8, 0.1, 0.5, 20, 220, 18],
  [22, 0.16, 0.56, 15, -260, 22],
  [37, 0.08, 0.6, 24, 180, 14],
  [51, 0.2, 0.52, 17, -200, 26],
  [66, 0.12, 0.58, 22, 240, 16],
  [81, 0.18, 0.5, 16, -220, 20],
  [93, 0.1, 0.62, 19, 200, 12],
  [14, 0.3, 0.55, 13, 260, 24],
  [44, 0.34, 0.5, 18, -240, 18],
  [72, 0.28, 0.6, 14, 210, 22],
  [58, 0.4, 0.52, 21, -180, 16],
  [29, 0.42, 0.5, 16, 230, 20],
  [87, 0.38, 0.56, 18, -250, 14],
  [4, 0.44, 0.5, 15, 190, 18],
  [33, 0.5, 0.46, 17, -210, 16],
  [62, 0.54, 0.44, 14, 230, 20],
];
function Petal() {
  return (
    <svg viewBox="0 0 20 24" className={st.svg} aria-hidden>
      <path d="M10 0C16 4 20 11 17 18C15 22 12 24 10 24C8 24 5 22 3 18C0 11 4 4 10 0Z" fill="url(#malika-petal)" />
      <path d="M10 3C10 9 10.5 15 10 21" stroke="#c98a95" strokeOpacity={0.35} strokeWidth={0.6} fill="none" />
    </svg>
  );
}

function Hero({ d, wide, still }: { d: D; wide: boolean; still: boolean }) {
  const G = wide ? HERO.l : HERO.m;
  const { W, H } = G;
  const pageU = wide ? CANVAS_L : COL_M;
  const X = (x: number) => `calc(50% + ${U(x - W / 2)})`;
  const Y = (y: number) => `calc(100% - ${U(H - y)})`;
  const [nT, nH, nF] = G.name;
  const [sH, sF, sLs] = G.sub;
  const pc = (n: number) => `${n}%`;
  const photo = d.portrait ? (
    <Img src={d.portrait} eager className={st.hImg} style={{ objectPosition: wide ? "50% 0%" : "50% 30%" }} />
  ) : (
    // surat yo‘q — ramkada gerb, tiara va ism harfi (ochilishdagidek)
    <div className={st.hNoPhoto}>
      <div className={st.hNoCrest}>
        <Crest g={{ inner: [18.46, 9.23, 63.08, 75.38], gerb: [0, 0, 100], tiara: [17.31, -24.87, 65.38, 43.59] }} top={pc} size={pc} place={pc}>
          {d.mono && <Mono ch={d.mono} className="absolute inset-x-0 text-center" style={{ top: "18.5%", height: "38.5%", fontSize: wide ? U(100) : U(86), lineHeight: wide ? U(104) : U(90), color: "var(--mauve)" }} />}
        </Crest>
      </div>
    </div>
  );
  return (
    <div className={cx(st.hero, still && st.heroStill)} style={vars(still ? { "--u": pageU, height: U(H) } : { "--u": `min(${pageU}, calc(100svh / ${H}))` })}>
      <div aria-hidden className={st.hBg} />
      {"photo" in G ? (
        <div className={st.hArch} style={{ left: X(G.photo[0]), top: Y(G.photo[1]), width: U(G.photo[2]), height: U(G.photo[3]), borderRadius: `${U(G.photo[2] / 2)} ${U(G.photo[2] / 2)} 0 0` }}>
          {photo}
        </div>
      ) : (
        // mobil: surat ekran enida (Figma — to‘liq enli kadr)
        <div className={st.hFull} style={{ top: Y(G.photoTop) }}>
          {photo}
        </div>
      )}
      {wide && (
        <>
          <div aria-hidden className={cx(st.hCur, st.hCurL)} style={{ left: X(-192.28), top: Y(-9), width: U(612), height: U(918) }}>
            <Img src={`${P}/parda.webp`} eager />
          </div>
          <div aria-hidden className={cx(st.hCur, st.hCurR)} style={{ left: X(1020.28), top: Y(-9), width: U(612), height: U(918) }}>
            <Img src={`${P}/parda.webp`} eager className={st.flip} />
          </div>
        </>
      )}
      {/* ism (2 qatorga bo‘linsa — pastga o‘sadi, surat ustiga tushmaydi) va «18 YOSH» */}
      <div className="absolute inset-x-0" style={{ top: Y(nT) }}>
        {d.a && (
          <h1 className={cx(st.cgI, "relative mx-auto text-center")} style={{ width: U(W), color: "var(--mauve)" }}>
            <NameLines text={d.a} base={nF} max={G.max} lh={nH} two={nF * 0.62} twoLh={nH * 0.62} letters={still ? undefined : [0.34, 0.74]} />
          </h1>
        )}
        {d.ageLine && (
          <p className={cx(st.cgS, st.hSub, "relative text-center")} style={{ height: U(sH), fontSize: U(sF), lineHeight: `${U(sH)}`, color: "var(--deep)", whiteSpace: "nowrap", textTransform: "uppercase" }}>
            <span style={{ letterSpacing: U(sLs), paddingLeft: U(sLs) }}>{d.ageLine}</span>
          </p>
        )}
      </div>
      {!still && (
        <div aria-hidden className={st.petals}>
          {PETALS.map(([x, b0, bd, s, rot, sway], i) => (
            <div key={i} className={st.petalLayer} style={vars({ "--p0": b0, "--pd": bd })}>
              <div className={st.petal} style={vars({ left: `${x}%`, width: U(s), height: U(s * 1.2), "--rot": rot, "--sw": sway })}>
                <Petal />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═════════════ Bo‘lim qobig‘i ═════════════ */
type Bg = "cream" | "blush";

/** Bo‘lim: to‘liq enli fon + markazda kontent ustuni (mobil 390 birlik; laptopda × 1.45). `outer` — ustundan tashqaridagi bezaklar */
function Sec({ children, z, bg, colStyle, id, outer, className }: { children: ReactNode; z: number; bg: Bg; colStyle?: CSSProperties; id?: string; outer?: ReactNode; className?: string }) {
  return (
    <section id={id} className={cx(st.sec, st[bg], className)} style={{ zIndex: z }}>
      {outer}
      <div className={st.col} style={{ width: U(390), ...colStyle }}>
        {children}
      </div>
    </section>
  );
}

/** Laptop yon bezaklari (1440 kanvas): chap va o‘ng — simmetrik (Figma: chapdagisi ko‘zgu yoki o‘ngdagisi ko‘zgu) */
function Sides({ wide, src, y, w, h, flipLeft, a = "grow" }: { wide: boolean; src: string; y: number; w: number; h: number; flipLeft: boolean; a?: string }) {
  if (!wide) return null;
  return (
    <div aria-hidden className={st.deco}>
      <Art src={src} box={[103, y, w, h]} unit={C} flip={flipLeft} a={a} d={0.15} className={flipLeft ? st.oR : st.oL} />
      <Art src={src} box={[1077, y, w, h]} unit={C} flip={!flipLeft} a={a} d={0.25} className={flipLeft ? st.oL : st.oR} />
    </div>
  );
}

/** Sarlavha (Cormorant kursiv, markazda, 360 da sig‘adi) */
function Title({ text, fs, h, color = "var(--mauve)", d = 0, style }: { text: string; fs: number; h: number; color?: string; d?: number; style?: CSSProperties }) {
  return (
    <p data-a="up" className={cx(st.cgI, "text-center")} style={vars({ height: U(h), fontSize: U(fs), lineHeight: `${U(h)}`, color, whiteSpace: "nowrap", "--d": `${d}s`, ...(style as Record<string, string>) })}>
      <Fit base={fs} max={366} deps={text}>
        {text}
      </Fit>
    </p>
  );
}

/* ═════════════ 02 · Taklif — (mehmon murojaati), iqtibos, ism, gerbda yosh, imzo ═════════════ */
function Taklif({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const hello = d.guest ? guestHello(t, "Hurmatli {guest}!", d.guest) : "";
  return (
    <Sec
      z={z}
      bg="cream"
      colStyle={{ paddingTop: U(hello ? 176 : 150), paddingBottom: U(140) }}
      outer={
        // chok ustidagi atlas bant (01/02): hero suratining pastiga kirib turadi
        <Art
          src={`${P}/bant.webp`}
          box={wide ? [510, -128, 420, 280] : [45, -90, 300, 200]}
          unit={wide ? C : U}
          center={wide ? undefined : 195}
          a="drop"
          className={st.seam}
        />
      }
    >
      <Art src={`${P}/gul.webp`} box={[-13, 17, 150, 150]} unit={U} flip a="grow" d={0.1} className={cx(st.oL, st.inCol)} />
      <div aria-hidden data-a="grow" className={cx(st.art, st.oR)} style={vars({ left: U(263), bottom: U(7), width: U(130), height: U(130), "--d": "0.2s" })}>
        <Img src={`${P}/gul.webp`} className={st.flipY} />
      </div>
      {hello && (
        <div data-a="up" className={cx(st.cgI, "relative text-center")} style={vars({ marginBottom: U(14), color: "var(--mauve)", "--d": "0.05s" })}>
          <NameLines text={hello} base={30} max={340} lh={38} two={26} twoLh={32} />
        </div>
      )}
      <p
        data-a="up"
        className={cx(st.cgI, "relative mx-auto text-center")}
        style={vars({ width: U(300), minHeight: U(93), fontSize: U(23), lineHeight: `${U(31)}`, color: "var(--mauve)", overflowWrap: "anywhere", whiteSpace: "pre-line", "--d": "0.1s" })}
      >
        {d.quote}
      </p>
      {d.a && (
        <div data-a="up" className={cx(st.cgI, st.glowName, "relative text-center")} style={vars({ marginTop: U(53), color: "var(--deep)", "--d": "0.2s" })}>
          <NameLines text={d.a} base={60} max={366} lh={73} two={46} twoLh={56} />
        </div>
      )}
      {/* kichik gerb: tiara, marvarid ramka, ichida yosh (yosh bo‘lmasa — ism harfi) */}
      <div data-a="crest" className="relative" style={vars({ marginTop: U(d.a ? -18.33 : 53), height: U(195.33), "--d": "0.3s" })}>
        <Crest g={{ inner: [145, 51.33, 100, 120], gerb: [115, 35.33, 160], tiara: [145, 0, 100, 66.667] }} top={U} size={U} place={U} shine>
          <p className={cx(d.ageText ? st.cgM : st.cgI, "absolute inset-x-0 text-center")} style={{ top: U(85.33), height: U(56), fontSize: U(46), lineHeight: `${U(56)}`, color: "var(--mauve)" }}>
            {d.ageText || d.mono}
          </p>
        </Crest>
      </div>
      <p data-a="up" className={cx(st.ms, st.clamp2, "relative mx-auto text-center")} style={vars({ marginTop: U(-6), width: U(300), minHeight: U(20), fontSize: U(15), lineHeight: `${U(20)}`, color: "var(--mute)", "--d": "0.4s" })}>
        {d.sign}
      </p>
    </Sec>
  );
}

/* ═════════════ 03 · Mening qo‘shig‘im — pleyer kartasi (taklifnoma musiqasi; play tugmasi musiqani yoqadi/o‘chiradi) ═════════════ */
function Song({ d, z, wide, music, still }: { d: D; z: number; wide: boolean; music: ReturnType<typeof useMusic>; still: boolean }) {
  const t = useT();
  const [time, setTime] = useState<{ cur: number; dur: number } | null>(null);
  const [ref, inView] = useInView<HTMLDivElement>(0.2, !still && !!d.musicUrl);
  // davomiylik: musiqa hali yoqilmagan bo‘lsa — faqat metama’lumot yuklanadi
  useEffect(() => {
    if (!inView || !d.musicUrl || time) return;
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => Number.isFinite(a.duration) && setTime((x) => x ?? { cur: 0, dur: a.duration });
    a.src = d.musicUrl;
    return () => {
      a.onloadedmetadata = null;
      a.src = "";
    };
  }, [inView, d.musicUrl, time]);
  useEffect(() => {
    if (!music.playing) return;
    const tick = () => {
      const a = music.el();
      if (a && Number.isFinite(a.duration) && a.duration > 0) setTime({ cur: a.currentTime, dur: a.duration });
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [music.playing, music]);
  // namuna (yoki hali ma’lumot yo‘q): Figma holati — 1:12 / 3:45
  const figma = d.demo || still;
  const cur = time ? time.cur : figma ? 72 : 0;
  const dur = time ? time.dur : figma ? 225 : 0;
  const f = dur ? clamp01(cur / dur) : 0;
  const seek = (dx: number | null) => {
    const a = music.el();
    if (!a) return;
    a.currentTime = dx == null ? 0 : Math.min(Math.max(0, a.currentTime + dx), Math.max(0, (a.duration || 0) - 1));
    if (Number.isFinite(a.duration)) setTime({ cur: a.currentTime, dur: a.duration });
  };
  return (
    <Sec
      z={z}
      bg="blush"
      colStyle={{ height: U(440) }}
      outer={<Sides wide={wide} src={`${P}/bant.webp`} y={232.33} w={260} h={173.333} flipLeft={false} a="pop" />}
    >
      <div className="absolute inset-x-0" style={{ top: U(52) }}>
        <Title text={t("Mening qo‘shig‘im")} fs={34} h={41} />
      </div>
      <div ref={ref} data-a="rise" className={cx(st.card, "absolute overflow-hidden")} style={vars({ left: U(32), top: U(120), width: U(326), height: U(240), borderRadius: U(24), boxShadow: `0 ${U(10)} ${U(30)} rgba(115,46,64,.15)`, "--d": "0.1s" })}>
        <p className={cx(st.cgS, "absolute inset-x-0 text-center")} style={{ top: U(28), height: U(27), fontSize: U(22), lineHeight: `${U(27)}`, color: "var(--ink)", whiteSpace: "nowrap" }}>
          <Fit base={22} max={290} deps={d.songTitle}>
            {d.songTitle}
          </Fit>
        </p>
        <p className={cx(st.ms, "absolute inset-x-0 text-center")} style={{ top: U(60), height: U(19), fontSize: U(14), lineHeight: `${U(19)}`, color: "var(--mute)", whiteSpace: "nowrap" }}>
          {t("Kechaning qo‘shig‘i")}
        </p>
        <span aria-hidden className={st.track} style={{ left: U(24), top: U(108), width: U(278), height: U(3), borderRadius: U(2) }}>
          <span className={cx(st.trackFill, music.playing && st.live)} style={vars({ "--f": f.toFixed(4) })} />
        </span>
        <span aria-hidden className={cx(st.knob, music.playing && st.live)} style={vars({ left: U(24 - 7), top: U(102.5), width: U(14), height: U(14), "--f": f.toFixed(4), "--tw": U(278) })} />
        <p className={cx(st.ms, "absolute")} style={{ left: U(24), top: U(122), height: U(18), fontSize: U(13), lineHeight: `${U(18)}`, color: "var(--mute)" }}>
          {fmtTime(cur)}
        </p>
        <p className={cx(st.ms, "absolute text-right")} style={{ right: U(24), top: U(122), height: U(18), fontSize: U(13), lineHeight: `${U(18)}`, color: "var(--mute)" }}>
          {dur ? fmtTime(dur) : ""}
        </p>
        {/* pleyer tugmalari (Figma «Malika / Ikonka · Pleyer», 220×48): orqaga — boshidan, oldinga — +15 s, play — musiqa */}
        <div className="absolute" style={{ left: U(53), top: U(158), width: U(220), height: U(48) }}>
          <svg viewBox="0 0 220 48" className={st.svg} aria-hidden fill="none" stroke="#B76E79" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 18V30M22 18L12 24L22 30V18Z" strokeWidth={1.5} />
            <path d="M48 20H56L66 30H74M48 30H56L66 20H74" strokeWidth={1.2} />
            <path d="M146 22C146 16 160 16 166 16H170M166 20L170 16L166 12M172 26C172 32 158 32 152 32H148M152 36L148 32L152 28" strokeWidth={1.2} />
            <path d="M212 18V30M198 18L208 24L198 30V18Z" strokeWidth={1.5} />
          </svg>
          <button type="button" className={st.pBtn} style={{ left: U(0), top: U(8), width: U(32), height: U(32) }} onClick={() => seek(null)} aria-label={t("Boshidan")} disabled={!music.available} />
          <button type="button" className={st.pBtn} style={{ left: U(188), top: U(8), width: U(32), height: U(32) }} onClick={() => seek(15)} aria-label={t("Oldinga")} disabled={!music.available} />
          <button
            type="button"
            onClick={music.toggle}
            disabled={!music.available}
            aria-label={music.playing ? t("Musiqani o‘chirish") : t("Musiqani yoqish")}
            aria-pressed={music.playing}
            className={cx(st.play, music.playing && st.playing)}
            style={{ left: U(88), top: U(2), width: U(44), height: U(44) }}
          >
            <svg viewBox="88 2 44 44" className={st.svg} aria-hidden>
              <path className={st.playIco} d="M104 15V33L119 24L104 15Z" fill="#FFF9F7" />
              <path className={st.pauseIco} d="M103 16H107.5V32H103ZM112.5 16H117V32H112.5Z" fill="#FFF9F7" />
            </svg>
          </button>
        </div>
      </div>
    </Sec>
  );
}

/* ═════════════ 04 · Sana — oy, hafta kuni · KUN · yil, «Muhim kun», kalendar (sana yurak ichida), sanoq ═════════════ */
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

const CELL = 310 / 7;
function Sana({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const units = timerUnits(useLocale());
  const c = useCountdown(d.target);
  const [ref, inView] = useInView<HTMLDivElement>(0.3, true);
  if (!d.hasDate || !c) return null;
  const k = d.cal;
  const rows = Math.ceil((k.first + k.days) / 7);
  const ex = (rows - 5) * 40;
  const vals = [c.d, c.h, c.m, c.s];
  const left = t("Bayramgacha qoldi");
  const muhim = t("Muhim kun");
  const cells = Array.from({ length: k.days }, (_, i) => {
    const pos = k.first + i;
    return { n: i + 1, col: pos % 7, row: Math.floor(pos / 7) };
  });
  return (
    <Sec z={z} bg="cream" colStyle={{ height: U(760 + ex) }} outer={<Sides wide={wide} src={`${P}/gul.webp`} y={421} w={260} h={260} flipLeft />}>
      <p data-a="up" className={cx(st.cgS, "absolute inset-x-0 text-center")} style={vars({ top: U(48), height: U(22), fontSize: U(18), lineHeight: `${U(22)}`, color: "var(--deep)", textTransform: "uppercase", whiteSpace: "nowrap" })}>
        <span style={{ letterSpacing: U(6), paddingLeft: U(6) }}>{k.month}</span>
      </p>
      <span data-a="rule" className={cx(st.rule, "absolute")} style={{ left: U(40), top: U(96), width: U(310), height: U(1) }} />
      <span data-a="rule" className={cx(st.rule, "absolute")} style={vars({ left: U(40), top: U(176), width: U(310), height: U(1), "--d": "0.1s" })} />
      <p data-a="up" className={cx(st.ms, "absolute")} style={vars({ left: U(40), top: U(126), width: U(110), height: U(20), fontSize: U(15), lineHeight: `${U(20)}`, color: "var(--mute)", whiteSpace: "nowrap", "--d": "0.15s" })}>
        <Fit base={15} max={110} deps={k.weekday}>
          {k.weekday}
        </Fit>
      </p>
      <p data-a="up" className={cx(st.cgI, "absolute inset-x-0 text-center")} style={vars({ top: U(98), height: U(76), fontSize: U(64), lineHeight: `${U(76)}`, color: "var(--mauve)", "--d": "0.2s" })}>
        {k.day}
      </p>
      <p data-a="up" className={cx(st.ms, "absolute text-right")} style={vars({ right: U(40), top: U(126), width: U(100), height: U(20), fontSize: U(15), lineHeight: `${U(20)}`, color: "var(--mute)", "--d": "0.15s" })}>
        {k.year}
      </p>
      <div className="absolute inset-x-0" style={{ top: U(200) }}>
        <Title text={muhim} fs={32} h={39} d={0.1} />
      </div>
      {k.week.map((w, i) => (
        <p key={w} data-a="up" className={cx(st.msM, "absolute text-center")} style={vars({ left: U(40 + i * CELL), top: U(260), width: U(CELL), height: U(18), fontSize: U(13), lineHeight: `${U(18)}`, color: "var(--mute)", "--d": `${0.05 + i * 0.03}s` })}>
          {w}
        </p>
      ))}
      {cells.map(({ n, col, row }) =>
        n === k.day ? (
          <div key={n} className="absolute" style={{ left: U(40 + col * CELL), top: U(296 + row * 40), width: U(CELL), height: U(22) }}>
            <svg aria-hidden data-a="heart" viewBox="0 0 46 41.818" className={st.heart} style={vars({ left: U(-0.857), top: U(-9.909), width: U(46), height: U(41.818), "--d": `${0.2 + (row + col) * 0.035}s` })}>
              <path
                d="M23 38.6818C9.40909 29.2727 2.09091 20.9091 5.22727 12.5455C8.36364 5.22727 17.7727 5.22727 23 12.5455C28.2273 5.22727 37.6364 5.22727 40.7727 12.5455C43.9091 20.9091 36.5909 29.2727 23 38.6818Z"
                stroke="#B76E79"
                strokeWidth={1.46}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                pathLength={1}
              />
            </svg>
            <p data-a="up" className={cx(st.cgS, "absolute inset-x-0 text-center")} style={vars({ top: 0, height: U(19), fontSize: U(16), lineHeight: `${U(19)}`, color: "var(--mauve)", "--d": `${0.15 + (row + col) * 0.035}s` })}>
              {n}
            </p>
          </div>
        ) : (
          <p key={n} data-a="up" className={cx(st.ms, "absolute text-center")} style={vars({ left: U(40 + col * CELL), top: U(296 + row * 40), width: U(CELL), height: U(22), fontSize: U(16), lineHeight: `${U(22)}`, color: "var(--ink)", "--d": `${0.15 + (row + col) * 0.035}s` })}>
            {n}
          </p>
        ),
      )}
      <div className="absolute inset-x-0" style={{ top: U(526 + ex) }}>
        <Title text={left} fs={26} h={31} />
      </div>
      {/* sanoq (Figma: «254 : 06 : 42 : 18» bitta qator, markazda; birliklar — to‘rt teng ustunda) */}
      <div ref={ref} className={cx(st.cgS, "absolute inset-x-0 text-center")} style={{ top: U(566 + ex), height: U(54), fontSize: U(44), lineHeight: `${U(54)}`, color: "var(--deep)", whiteSpace: "nowrap" }}>
        <Fit base={44} max={340} deps={String(vals[0]).length}>
          {vals.map((v, i) => (
            <Fragment key={i}>
              {i > 0 && (
                <span data-a="up" aria-hidden className={st.tcell} style={vars({ "--d": `${0.15 + i * 0.1}s` })}>
                  {"\u00a0:\u00a0"}
                </span>
              )}
              <span data-a="flip" className={st.tcell} style={vars({ "--d": `${0.1 + i * 0.1}s` })}>
                <Digits value={v} run={inView} len={i === 0 ? Math.max(2, String(vals[0]).length) : 2} i={i} />
              </span>
            </Fragment>
          ))}
        </Fit>
      </div>
      {units.map((u, i) => (
        <p key={i} data-a="up" className={cx(st.ms, "absolute text-center")} style={vars({ left: U(40 + i * 77.5), top: U(630 + ex), width: U(77.5), height: U(18), fontSize: U(13), lineHeight: `${U(18)}`, color: "var(--mute)", whiteSpace: "nowrap", "--d": `${0.2 + i * 0.08}s` })}>
          {u}
        </p>
      ))}
      <Divider a="draw" d={0.2} style={{ position: "absolute", left: U(85), top: U(679 + ex), width: U(220), height: U(22) }} />
    </Sec>
  );
}

/* ═════════════ 05 · Surat — choy stoli (mijozning 2-surati; bo‘lmasa bo‘lim chiqmaydi) ═════════════ */
function Photo({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  if (!d.tea) return null;
  return (
    <Sec
      z={z}
      bg="blush"
      colStyle={{ height: U(560) }}
      outer={
        <>
          {/* chok ustidagi gullar (04/05) — oldingi bo‘lim pastiga kiradi */}
          {wide ? (
            <>
              <Art src={`${P}/gul.webp`} box={[20, -110, 240, 240]} unit={C} flip a="grow" className={cx(st.seam, st.oR)} />
              <Art src={`${P}/gul.webp`} box={[1180, -110, 240, 240]} unit={C} a="grow" d={0.1} className={cx(st.seam, st.oL)} />
            </>
          ) : (
            <Art src={`${P}/gul.webp`} box={[-15, -75, 170, 170]} unit={U} center={195} flip a="grow" className={cx(st.seam, st.oR)} />
          )}
          {wide && (
            <div aria-hidden className={cx(st.deco, st.clip)}>
              <div data-a="slideL" className={st.art} style={vars({ left: C(-80.99), top: C(-8.12), width: C(552.16), height: C(828.24), "--d": "0.1s" })}>
                <Img src={`${P}/parda.webp`} />
              </div>
              <div data-a="slideR" className={st.art} style={vars({ left: C(968.83), top: C(-8.12), width: C(552.16), height: C(828.24), "--d": "0.1s" })}>
                <Img src={`${P}/parda.webp`} className={st.flip} />
              </div>
            </div>
          )}
        </>
      }
    >
      <div data-a="zoom" className="absolute inset-0 overflow-hidden" style={{ background: "#c7aca0" }}>
        <Img src={d.tea} className={st.zoomImg} style={{ objectPosition: "50% 40%" }} />
      </div>
    </Sec>
  );
}

/* ═════════════ 06 · Kecha dasturi — ravoq kartasi, ikonkalar chiziladi; pastida atlas bant ═════════════ */
function Program({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const items = d.program.slice(0, 8);
  if (!items.length) return null;
  const title = t("Kecha dasturi");
  const lines = split2(title) ?? [title];
  return (
    <Sec
      z={z}
      bg="cream"
      colStyle={{ paddingTop: U(56), paddingBottom: U(64) }}
      outer={
        <>
          {/* chok ustidagi gullar (05/06) — surat bo‘limi pastiga kiradi (mobil; surat bo‘limi bo‘lmasa — chiqmaydi) */}
          {!wide && d.tea && <Art src={`${P}/gul.webp`} box={[235, -91, 170, 170]} unit={U} center={195} flipY a="grow" d={0.1} className={cx(st.seam, st.oL)} />}
          <Sides wide={wide} src={`${P}/gul.webp`} y={431.15} w={260} h={260} flipLeft />
        </>
      }
    >
      <div className="relative">
        <div data-a="rise" className={st.arch} style={vars({ marginLeft: U(32), width: U(326), padding: `${U(220)} ${U(20)} ${U(40)} 0`, borderRadius: `${U(163)} ${U(163)} 0 0`, boxShadow: `0 ${U(10)} ${U(30)} rgba(115,46,64,.12)` })}>
          <div className="absolute inset-x-0" style={{ top: U(96) }}>
            {lines.map((l, i) => (
              <p key={i} data-a="up" className={cx(st.cgI, "text-center")} style={vars({ height: U(40), fontSize: U(40), lineHeight: `${U(40)}`, color: "var(--mauve)", whiteSpace: "nowrap", "--d": `${0.15 + i * 0.08}s` })}>
                <Fit base={40} max={280} deps={l}>
                  {l}
                </Fit>
              </p>
            ))}
          </div>
          {items.map((it, i) => (
            <div key={i} className="relative" style={{ paddingLeft: U(100), minHeight: U(120) }}>
              <Icon k={programIcon(it, i)} a="draw" d={0.1} style={{ position: "absolute", left: U(42), top: U(10), width: U(40), height: U(40) }} />
              <p data-a="right" className={cx(st.cgS)} style={vars({ height: U(19), fontSize: U(16), lineHeight: `${U(19)}`, letterSpacing: U(2), color: "var(--deep)", whiteSpace: "nowrap", "--d": "0.1s" })}>
                {it.time}
              </p>
              <p data-a="right" className={cx(st.cgI, st.clamp2)} style={vars({ marginTop: U(3), fontSize: U(26), lineHeight: `${U(31)}`, color: "var(--mauve)", "--d": "0.18s" })}>
                {it.title}
              </p>
              {it.note?.trim() && (
                <p data-a="right" className={cx(st.ms, st.clamp2)} style={vars({ marginTop: U(3), fontSize: U(14), lineHeight: `${U(19)}`, color: "var(--mute)", paddingBottom: U(20), "--d": "0.26s" })}>
                  {it.note}
                </p>
              )}
            </div>
          ))}
        </div>
        <div aria-hidden data-a="pop" className={cx(st.art, st.progBow)} style={vars({ left: U(85), top: `calc(100% - ${U(69.333)})`, width: U(220), height: U(146.667), "--d": "0.2s" })}>
          <Img src={`${P}/bant.webp`} />
        </div>
      </div>
    </Sec>
  );
}

/* ═════════════ 07 · Manzil — ravoqli bal zali surati, joy nomi, sana | vaqt, manzil, xarita ═════════════ */
function Venue({ d, z, wide, linkable }: { d: D; z: number; wide: boolean; linkable: boolean }) {
  const t = useT();
  if (!d.hasPlace) return null;
  return (
    <Sec z={z} bg="blush" colStyle={{ paddingTop: U(64), paddingBottom: U(108) }} outer={<Sides wide={wide} src={`${P}/bant.webp`} y={435.33} w={260} h={173.333} flipLeft={false} a="pop" />}>
      <div data-a="zoom" className="relative mx-auto overflow-hidden" style={{ width: U(300), height: U(250), borderRadius: `${U(150)} ${U(150)} 0 0`, background: "#d9c3bd" }}>
        <Img src={d.hall} className={st.zoomImg} />
      </div>
      {d.venueTitle && (
        <p data-a="up" className={cx(st.cgS, "mx-auto text-center")} style={vars({ marginTop: U(26), width: U(366), minHeight: U(36), fontSize: U(30), lineHeight: `${U(36)}`, color: "var(--ink)", overflowWrap: "anywhere", "--d": "0.1s" })}>
          {d.venueTitle}
        </p>
      )}
      {d.dayMonth && (
        <div className="relative" style={{ marginTop: U(18), height: U(48) }}>
          {d.time ? (
            <>
              <p data-a="up" className={cx(st.cgI, "absolute text-right")} style={vars({ right: U(210), top: U(6), width: U(170), height: U(34), fontSize: U(28), lineHeight: `${U(34)}`, color: "var(--mauve)", whiteSpace: "nowrap", "--d": "0.15s" })}>
                {d.dayMonth}
              </p>
              <span data-a="vrule" className={cx(st.vrule, "absolute")} style={vars({ left: U(194.5), top: 0, width: U(1), height: U(48), "--d": "0.2s" })} />
              <p data-a="up" className={cx(st.cgI, "absolute")} style={vars({ left: U(210), top: U(6), width: U(140), height: U(34), fontSize: U(28), lineHeight: `${U(34)}`, color: "var(--mauve)", whiteSpace: "nowrap", "--d": "0.25s" })}>
                {d.time}
              </p>
            </>
          ) : (
            <p data-a="up" className={cx(st.cgI, "absolute inset-x-0 text-center")} style={vars({ top: U(6), height: U(34), fontSize: U(28), lineHeight: `${U(34)}`, color: "var(--mauve)", "--d": "0.15s" })}>
              {d.dayMonth}
            </p>
          )}
        </div>
      )}
      {d.address && (
        <p data-a="up" className={cx(st.ms, "mx-auto text-center")} style={vars({ marginTop: U(24), width: U(300), minHeight: U(46), fontSize: U(15), lineHeight: `${U(23)}`, color: "var(--mute)", overflowWrap: "anywhere", "--d": "0.3s" })}>
          {d.address}
        </p>
      )}
      <div data-a="up" className="flex justify-center" style={vars({ marginTop: U(48), "--d": "0.35s" })}>
        <a
          href={linkable ? d.mapUrl : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(st.msM, st.btn)}
          style={{ minWidth: U(220), height: U(52), padding: `0 ${U(28)}`, gap: U(6), fontSize: U(15), borderRadius: U(26), borderWidth: U(1) }}
        >
          <Icon k="pin" color="#B76E79" style={{ width: U(24), height: U(24), flex: "none" }} />
          {t("Xaritada ochish")}
        </a>
      </div>
    </Sec>
  );
}

/* ═════════════ 08 · Dress-kod (ixtiyoriy — o‘chirilsa joy qolmaydi) ═════════════ */
function Dress({ d, z }: { d: D; z: number }) {
  const t = useT();
  if (!d.dressNote && !d.dressCode) return null;
  const title = t("Dress-kod");
  return (
    <Sec z={z} bg="cream" colStyle={{ paddingTop: U(56), paddingBottom: U(126) }}>
      <Divider a="draw" style={{ marginLeft: U(75), width: U(240), height: U(24) }} />
      <p data-a="up" className={cx(st.cgS, "text-center")} style={vars({ marginTop: U(20), height: U(36), fontSize: U(30), lineHeight: `${U(36)}`, color: "var(--mauve)", textTransform: "uppercase", whiteSpace: "nowrap", "--d": "0.08s" })}>
        <Fit base={30} max={360} deps={title}>
          <span style={{ letterSpacing: U(4), paddingLeft: U(4) }}>{title}</span>
        </Fit>
      </p>
      {d.dressCode && (
        <p data-a="up" className={cx(st.cgI, "text-center")} style={vars({ marginTop: U(14), height: U(31), fontSize: U(26), lineHeight: `${U(31)}`, color: "var(--deep)", whiteSpace: "nowrap", "--d": "0.16s" })}>
          <Fit base={26} max={360} deps={d.dressCode}>
            {d.dressCode}
          </Fit>
        </p>
      )}
      {d.dressNote && (
        <p data-a="up" className={cx(st.ms, "mx-auto text-center")} style={vars({ marginTop: U(19), width: U(300), minHeight: U(54), fontSize: U(17), lineHeight: `${U(27)}`, color: "var(--mute)", overflowWrap: "anywhere", "--d": "0.24s" })}>
          {d.dressNote}
        </p>
      )}
    </Sec>
  );
}

/* ═════════════ 09 · Anketa — javob (blush fon, krem karta) ═════════════ */
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
  // tilak maydoni ichida o‘sadi (maydon balandligi o‘zgarmaydi)
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
    <p className={cx(st.msM, st.lbl)} style={{ height: U(18), fontSize: U(13), lineHeight: `${U(18)}` }}>
      {s}
    </p>
  );
  const sub = d.rsvpUntil
    ? t(d.we ? "Javobingizni {date} kutamiz" : "Javobingizni {date} kutaman", { date: d.rsvpUntil })
    : t(d.we ? "Javobingizni kutamiz" : "Javobingizni kutaman");
  return (
    <Sec z={z} bg="blush" id="malika-javob" colStyle={{ paddingTop: U(56), paddingBottom: U(84) }} outer={<Sides wide={wide} src={`${P}/gul.webp`} y={435.5} w={260} h={260} flipLeft />}>
      <Title text={t("Kelasizmi?")} fs={46} h={56} />
      <p
        data-a="up"
        className={cx(st.ms, "mx-auto text-center")}
        style={vars({ marginTop: U(6), width: U(366), minHeight: U(20), fontSize: U(15), lineHeight: `${U(20)}`, color: "var(--mute)", overflowWrap: "anywhere", "--d": "0.12s" })}
      >
        {sub}
      </p>
      <div
        data-a="rise"
        className={cx(st.card, "relative mx-auto overflow-hidden")}
        style={vars({ marginTop: U(38), width: U(334), padding: `${U(23)} ${U(30)} ${U(34)}`, borderRadius: U(28), boxShadow: `0 ${U(12)} ${U(30)} rgba(115,46,64,.15)`, "--d": "0.2s" })}
      >
        <Divider style={{ marginLeft: U(47), width: U(180), height: U(18) }} />
        {sent ? (
          <div key="thanks" className={cx(st.thanks, "relative flex flex-col items-center text-center")} style={{ padding: `${U(40)} ${U(6)} ${U(10)}`, gap: U(16), minHeight: U(370) }}>
            <p className={st.cgI} style={{ fontSize: U(sent === "not_coming" ? 36 : 32), lineHeight: 1.2, color: "var(--mauve)", overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Rahmat!") : t("Rahmat! Joyingiz band qilindi")}
            </p>
            <p className={st.ms} style={{ fontSize: U(16), color: "var(--mute)", lineHeight: 1.55, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Javobingiz uchun rahmat!") : t("{name} — {count} kishi. Javobingiz yetkazildi.", { name: name.trim() || t("Javobingiz"), count })}
            </p>
            <button type="button" onClick={() => setSent(null)} className={st.msM} style={{ fontSize: U(15), color: "var(--mauve)", textDecoration: "underline", textUnderlineOffset: 3 }}>
              {t("Javobni o‘zgartirish")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="relative flex flex-col items-stretch" style={{ marginTop: U(21) }}>
            {label(t("Ismingiz"))}
            <label className={st.field} style={{ marginTop: U(6), height: U(50), padding: `0 ${U(19)}`, borderRadius: U(25), borderWidth: U(1) }}>
              <input
                className={cx(st.ms, st.input)}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder={t("Ism va familiya")}
                aria-label={t("Ismingiz")}
                style={{ fontSize: U(16) }}
              />
            </label>
            <div className="flex w-full" role="radiogroup" aria-label={t("Kelasizmi?")} style={{ marginTop: U(18), gap: U(8) }}>
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
                  className={cx(st.msM, st.choice)}
                  style={{ padding: `${U(6)} ${U(6)}`, minHeight: U(48), fontSize: U(15), borderWidth: U(1), borderRadius: U(24) }}
                >
                  <span style={{ overflowWrap: "anywhere" }}>{t(l)}</span>
                </button>
              ))}
            </div>
            {status === "coming" && (
              <div className="flex w-full items-center" style={{ marginTop: U(20), gap: U(8), minHeight: U(36) }}>
                <p className={st.ms} style={{ flex: "1 1 0", minWidth: 0, fontSize: U(15), lineHeight: 1.3, color: "var(--ink)" }}>
                  {t("Necha kishi bo‘lasiz?")}
                </p>
                <button
                  type="button"
                  className={cx(st.msM, st.step)}
                  disabled={count <= 1}
                  onClick={() => setCount((c) => Math.max(1, c - 1))}
                  aria-label={t("Kamaytirish")}
                  style={{ width: U(32), height: U(36), fontSize: U(18), borderRadius: U(18) }}
                >
                  −
                </button>
                <span className={st.msM} style={{ width: U(32), textAlign: "center", fontSize: U(18), lineHeight: 1.4, color: "var(--mauve)" }} aria-live="polite">
                  {count}
                </span>
                <button
                  type="button"
                  className={cx(st.msM, st.step)}
                  disabled={count >= 20}
                  onClick={() => setCount((c) => Math.min(20, c + 1))}
                  aria-label={t("Ko‘paytirish")}
                  style={{ width: U(32), height: U(36), fontSize: U(18), borderRadius: U(18) }}
                >
                  +
                </button>
              </div>
            )}
            <div style={{ marginTop: U(20) }}>{label(t("Tilaklaringiz"))}</div>
            <label className={st.field} style={{ marginTop: U(6), height: U(104), padding: `${U(15)} ${U(19)}`, borderRadius: U(22), borderWidth: U(1), justifyContent: "flex-start", alignItems: "flex-start" }}>
              <textarea
                ref={wishRef}
                rows={1}
                className={cx(st.ms, st.input)}
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                maxLength={500}
                placeholder={d.wishPh}
                aria-label={t("Tilaklaringiz")}
                style={{ fontSize: U(16) }}
              />
            </label>
            {err && (
              <p className={st.ms} style={{ marginTop: U(12), color: "#a32a37", fontSize: U(14) }}>
                {err}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className={cx(st.msM, st.submit)}
              style={{ marginTop: U(24), minHeight: U(56), padding: `${U(12)} ${U(12)}`, fontSize: U(16), borderRadius: U(28), opacity: busy ? 0.7 : 1 }}
            >
              {busy ? t("Yuborilmoqda…") : t("Javobni yuborish")}
            </button>
          </form>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 10 · Final — pardalar yana sekin yopilishga intiladi (laptopda ko‘rinadi), tiara tushib o‘rnashadi, gerb va tiara
 * yaltiraydi (scroll bilan: --fc 0 … 1 = Figma kadri; sahifa oxirigacha albatta tugaydi) ═════════════ */
const FIN = {
  m: {
    W: 390,
    H: 844,
    cur: [-477.92, 294, -8.44, 573.92, 860.88] as const,
    light: [-25, 200, 440, 440] as Box4,
    crest: { inner: [135, 190, 120, 144], gerb: [100, 173, 190], tiara: [135, 126, 120, 80] } as CrestGeo,
    mono: [216, 76, 70] as const,
    title: [408, 61, 50] as const,
    text: [65, 476, 260, 17, 26] as const,
    rule: [105, 539, 180, 18] as Box4,
    name: [572, 58, 48] as const,
    date: [640, 18, 13, 4] as const,
    bow: [75, -74, 240, 160] as Box4,
    max: 366,
  },
  l: {
    W: 1440,
    H: 900,
    cur: [-142.28, 970.28, -9, 612, 918] as const,
    light: [380, 90, 680, 680] as Box4,
    crest: { inner: [646, 162, 148, 176], gerb: [600, 138, 240], tiara: [645, 78, 150, 100] } as CrestGeo,
    mono: [196, 96, 90] as const,
    title: [420, 87, 72] as const,
    text: [470, 516, 500, 20, 27] as const,
    rule: [600, 568, 240, 24] as Box4,
    name: [606, 78, 64] as const,
    date: [694, 20, 15, 5] as const,
    bow: [550, -105.333, 340, 226.667] as Box4,
    max: 820, // yon pardalar orasida
  },
} as const;
function Final({ d, z, wide, still, onSeen }: { d: D; z: number; wide: boolean; still: boolean; onSeen: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const sec = useRef<HTMLElement>(null);
  const G = wide ? FIN.l : FIN.m;
  const onP = useCallback(
    (_p: number, r: DOMRect) => {
      const el = ref.current;
      if (!el) return;
      const vh = window.innerHeight || 800;
      // sahna ekranning 80% iga kirganda boshlanadi va 0.6 ekran skrollda tugaydi — sahifa oxiri undan oldin kelsa, oxirida tugaydi
      const y = window.scrollY;
      const top = r.top + y;
      const max = document.documentElement.scrollHeight - vh;
      const s0 = Math.min(top - vh * 0.8, max - 1);
      const s1 = Math.max(s0 + 1, Math.min(s0 + vh * 0.6, max));
      const f = seg(y, s0, s1);
      el.style.setProperty("--fc", f.toFixed(4));
      if (f > 0.5) onSeen();
    },
    [onSeen],
  );
  useScrollProgress(sec, onP, !still);
  const { W, H } = G;
  const title = t(d.we ? "Sizni kutamiz!" : "Sizni kutaman!");
  const [tx, ty, tw, tfs, tlh] = G.text;
  const [cl, cr, ct, cw, ch] = G.cur;
  const [rx, ry, rw, rh] = G.rule;
  return (
    <section ref={sec} className={cx(st.sec, st.fin)} style={vars({ zIndex: z, "--u": wide ? CANVAS_L : COL_M })}>
      <Art src={`${P}/bant.webp`} box={G.bow} unit={U} center={W / 2} a="drop" className={st.seam} />
      <div ref={ref} className={cx(st.finalWrap, "relative mx-auto")} style={vars({ width: U(W), height: U(H), "--fw": W * 0.1, ...(still ? { "--fc": 1 } : {}) })}>
        <div aria-hidden className={cx(st.fCur, st.fCurL)} style={{ left: U(cl), top: U(ct), width: U(cw), height: U(ch) }}>
          <Img src={`${P}/parda.webp`} />
        </div>
        <div aria-hidden className={cx(st.fCur, st.fCurR)} style={{ left: U(cr), top: U(ct), width: U(cw), height: U(ch) }}>
          <Img src={`${P}/parda.webp`} className={st.flip} />
        </div>
        <span aria-hidden className={cx(st.light, st.fLight)} style={{ left: U(G.light[0]), top: U(G.light[1]), width: U(G.light[2]), height: U(G.light[3]) }} />
        <div data-a="crest" className={st.fCrest} style={vars({ "--d": "0.05s" })}>
          <Crest g={G.crest} top={U} size={U} place={U} shine tiaraClass={st.fTiara}>
            {d.mono && <p className={cx(st.cgI, "absolute inset-x-0 text-center")} style={{ top: U(G.mono[0]), height: U(G.mono[1]), fontSize: U(G.mono[2]), lineHeight: `${U(G.mono[1])}`, color: "var(--mauve)" }}>{d.mono}</p>}
          </Crest>
        </div>
        <h2 data-a="up" className={cx(st.cgI, "absolute inset-x-0 text-center")} style={vars({ top: U(G.title[0]), height: U(G.title[1]), fontSize: U(G.title[2]), lineHeight: `${U(G.title[1])}`, color: "var(--mauve)", whiteSpace: "nowrap", "--d": "0.15s" })}>
          <Fit base={G.title[2]} max={G.max} deps={title}>
            {title}
          </Fit>
        </h2>
        <div data-a="up" className={cx(st.ms, "absolute text-center")} style={vars({ left: U(tx), top: U(ty), width: U(tw), color: "var(--ink)", "--d": "0.25s" })}>
          <NameLines text={t("Bu kecha sizsiz to‘liq bo‘lmaydi.")} base={tfs} max={Math.min(G.max, tw)} lh={tlh} two={tfs * 0.94} twoLh={tlh * 0.94} />
        </div>
        <Divider a="draw" d={0.3} style={{ position: "absolute", left: U(rx), top: U(ry), width: U(rw), height: U(rh) }} />
        <div className="absolute inset-x-0" style={{ top: U(G.name[0]) }}>
          {d.a && (
            <div data-a="up" className={cx(st.cgI, "relative text-center")} style={vars({ color: "var(--deep)", "--d": "0.35s" })}>
              <NameLines text={d.a} base={G.name[2]} max={G.max} lh={G.name[1]} two={G.name[2] * 0.8} twoLh={G.name[1] * 0.8} />
            </div>
          )}
          {d.dotsTime && (
            <p
              data-a="up"
              className={cx(st.msM, "text-center")}
              style={vars({
                marginTop: U(d.a ? G.date[0] - G.name[0] - G.name[1] : 0),
                height: U(G.date[1]),
                fontSize: U(G.date[2]),
                lineHeight: `${U(G.date[1])}`,
                color: "var(--mute)",
                whiteSpace: "nowrap",
                "--d": "0.45s",
              })}
            >
              <span style={{ letterSpacing: U(G.date[3]), paddingLeft: U(G.date[3]) }}>{d.dotsTime}</span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ═════════════ Musiqa tugmasi — Figma «Malika / Musiqa tugmasi»: krem doira, pushti halqa, 3 chiziq ritmda; o‘chirilgan — xira, qiya chiziq ═════════════ */
const BARS: [number, number, number][] = [
  [28, 27, 12],
  [34, 23, 20],
  [40, 26, 14],
];
function MalikaMusic({ m, wide, embedded }: { m: ReturnType<typeof useMusic>; wide: boolean; embedded: boolean }) {
  const t = useT();
  if (!m.available) return null;
  const btn = (
    <button
      type="button"
      onClick={m.toggle}
      aria-label={m.playing ? t("Musiqani o‘chirish") : t("Musiqani yoqish")}
      aria-pressed={m.playing}
      className={cx(st.music, embedded && st.musicEmbedded, m.playing && st.playing)}
      style={{ right: wide ? 24 : 16, top: wide ? 24 : 16 }}
    >
      <svg viewBox="10 7 52 52" width={52} height={52} aria-hidden>
        <circle cx="36" cy="33" r="20.5" fill="none" stroke="#D9A0A8" />
        {BARS.map(([x, y, h], i) => (
          <rect key={i} x={x} y={y} width={3} height={h} rx={1.5} className={st.bar} style={vars({ "--i": i })} />
        ))}
        <path d="M26 43L46 23" className={st.strike} />
      </svg>
    </button>
  );
  return embedded ? <div style={{ position: "sticky", top: 0, height: 0, zIndex: 70 }}>{btn}</div> : btn;
}

/* ═════════════ Sahifa ═════════════ */
type Key = "taklif" | "song" | "sana" | "photo" | "program" | "venue" | "dress" | "rsvp" | "final";

export function MalikaSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const loaded = usePreload(
    [`${P}/parda.webp`, `${P}/gerb.webp`, `${P}/tiara.webp`, d.portrait].filter(Boolean) as string[],
    [`${P}/bant.webp`, `${P}/gul.webp`, d.tea, d.hall].filter(Boolean) as string[],
    withGate,
    wide ? "l" : "m",
  );
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

  const hasSong = !!d.musicUrl && data.musicEnabled;
  const shown: Key[] = (["taklif", "song", "sana", "photo", "program", "venue", "dress", "rsvp", "final"] as Key[]).filter((k) =>
    k === "song"
      ? hasSong
      : k === "sana"
        ? d.hasDate
        : k === "photo"
          ? !!d.tea
          : k === "program"
            ? d.program.length > 0
            : k === "venue"
              ? d.hasPlace
              : k === "dress"
                ? !!(d.dressNote || d.dressCode)
                : k === "rsvp"
                  ? data.rsvpEnabled
                  : true,
  );
  // dastur pastidagi atlas bant keyingi bo‘lim ustiga ~13 birlik chiqadi — dastur bo‘limi qo‘shnisidan yuqorida chiziladi
  const z = (k: Key) => 6 + shown.indexOf(k) + (k === "program" ? 12 : 0);
  const linkable = mode !== "preview";
  const colU = wide ? COL_L : COL_M;
  const fu = (n: number) => (wide ? C(n) : U(n));

  return (
    <div ref={root} className={st.root}>
      <svg aria-hidden width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="malika-petal" x1="10" y1="0" x2="10" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fbe3e6" />
            <stop offset="1" stopColor="#e3a9b2" />
          </linearGradient>
        </defs>
      </svg>
      <div className={st.page} style={vars({ "--u": colU })}>
        <MalikaMusic m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/gerb.webp`} />}
        <div className={cx(st.flow, st.opening)} style={embedded ? vars({ "--o": 1 }) : undefined}>
          {withGate && (loaded ? <Gate d={d} wide={wide} onStart={() => music.play(true)} /> : <div className={st.gateHold} />)}
          {embedded && <Gate d={d} wide={wide} still onStart={() => {}} />}
          <div className={cx(st.openWrap, embedded && st.openStill)} style={{ zIndex: 5 }}>
            <Hero d={d} wide={wide} still={embedded} />
            {withGate && <div className={st.openSpacer} />}
          </div>
          <Taklif d={d} z={z("taklif")} wide={wide} />
          {hasSong && <Song d={d} z={z("song")} wide={wide} music={music} still={embedded} />}
          <Sana d={d} z={z("sana")} wide={wide} />
          <Photo d={d} z={z("photo")} wide={wide} />
          <Program d={d} z={z("program")} wide={wide} />
          <Venue d={d} z={z("venue")} wide={wide} linkable={linkable} />
          <Dress d={d} z={z("dress")} />
          {data.rsvpEnabled && <Rsvp d={d} slug={data.slug} mode={mode} z={z("rsvp")} wide={wide} />}
          <Final d={d} z={z("final")} wide={wide} still={embedded} onSeen={onFinal} />
        </div>
        <footer className={cx(st.footer, "flex items-start justify-center")} style={{ height: fu(120), paddingTop: fu(50) }}>
          <p className={cx(st.ms, "text-center")} style={{ fontSize: fu(13), lineHeight: 18 / 13, color: "rgba(243,217,220,.8)" }}>
            <a href="https://shohnoma.uz">Shohnoma</a> · {t("elektron taklifnomalar")}
          </p>
        </footer>
      </div>
    </div>
  );
}
