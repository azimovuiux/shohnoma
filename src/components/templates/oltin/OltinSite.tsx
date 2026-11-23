"use client";

import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/400-italic.css";
import "@fontsource/playfair-display/900.css";
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
import { calendarWords, coordsFrom, downloadIcs, untilPhrase } from "../anor/data";
import { DRESS_TEXT, MSG, MSG_DEMO, OLTIN_DEMO, OLTIN_DEMO_EN, OLTIN_DEMO_RU, P, type LifeItem, type OltinItem } from "./data";
import st from "./oltin.module.css";

/* ── Birliklar ──
 * U — joriy `--u`. Bo‘limlarda — kontent ustuni (Figma mobil 390 koordinatalari; laptopda ustun = mobil × 1.2, ya’ni 468px / 1440 —
 * Figma «Kontent ustuni (mobil ×1.2)»). C — laptop kanvasi (1440) birligi: yon oltin barglar.
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

/* Ranglar (Figma «26 · Oltin — Assets») */
const INK = "#1A1714";
const GOLD_T = "#D9B066";

/* ═════════════ Yosh ═════════════ */
/** «60» → 60 (1…120); bo‘lmasa 0 */
function parseAge(raw: string) {
  const n = Math.round(Number(String(raw).replace(/[^\d.]/g, "")));
  return raw.trim() && Number.isFinite(n) && n >= 1 && n <= 120 ? n : 0;
}
/** Yubiley — 20 dan katta va 5 ga karrali yosh (25, 30, …, 60, 75 …): «yubiley» so‘zi; aks holda — «tug‘ilgan kun» */
const isJubilee = (n: number) => n >= 20 && n % 5 === 0;
/** Inglizcha tartib son: 1st, 2nd, 3rd, 11th, 60th */
function nth(n: number) {
  const b = n % 100;
  const s = b >= 11 && b <= 13 ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
  return `${n}${s}`;
}

/** Server yaratadigan standart taklif matni (php/api/lib/orders.php DEFAULT_MESSAGE) — har qaysi tilda */
const SERVER_DEFAULT = "Aziz mehmonlar! Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.";
const isServerDefault = (m: string) => (["uz", "ru", "en"] as Locale[]).some((l) => tr(l, SERVER_DEFAULT).trim() === m.trim());

function useData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO = lang === "ru" ? OLTIN_DEMO_RU : lang === "en" ? OLTIN_DEMO_EN : OLTIN_DEMO;
  const ex = (data.extra ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof ex[k] === "string" ? (ex[k] as string).trim() : typeof ex[k] === "number" ? String(ex[k]) : "");
  const sd = splitDate(data.date);
  const guest = useGuestName();
  return useMemo(() => {
    const cw = calendarWords(lang);
    const exProgram = Array.isArray(ex.program) ? (ex.program as OltinItem[]).filter((p) => p?.time && p?.title) : [];
    const exLife = Array.isArray(ex.life)
      ? (ex.life as LifeItem[]).map((x) => ({ year: String(x?.year ?? "").trim(), text: String(x?.text ?? "").trim() })).filter((x) => x.year || x.text)
      : [];
    const photos = (data.photos ?? []).filter(Boolean) as string[];
    const date = sd ? new Date(`${sd.iso}T12:00:00Z`) : null;
    // namunadagi ism tarjima qilinadi (mijoz ma’lumoti — o‘zgarishsiz)
    const a = ((demo ? t(data.personA) : data.personA) || "").trim();
    // taklif qiluvchi (ixtiyoriy: masalan, «Karimovlar oilasi»): bo‘lsa — matnlar «biz» nomidan; bo‘lmasa — yubilyarning o‘zi nomidan
    const host = demo ? DEMO.host : str("host");
    const we = !!host;
    const age = parseAge(str("age") || (demo ? DEMO.age : ""));
    const jub = isJubilee(age);
    const kind = jub ? "jub" : age ? "age" : "none";
    const av = { age, nth: age ? nth(age) : "", name: a };
    const mono = a ? Array.from(a)[0].toLocaleUpperCase(lang) : "";
    const code = str("dressCode") || (demo ? DEMO.dressCode : "");
    const dressNote = str("dressNote") || (DRESS_TEXT[code] ? t(DRESS_TEXT[code]) : "");
    const time = sd?.time ?? "";
    const program = (demo ? DEMO.program : exProgram.length ? exProgram : ((data.program ?? []) as OltinItem[])) as OltinItem[];
    const raw = (demo ? "" : data.message || "").trim();
    const custom =
      raw && !isServerDefault(raw)
        ? raw.replace(/^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Muhtaram mehmonlar!|Hurmatli mehmonlar!|Дорогие гости!|Уважаемые гости!|Dear guests!)\s*/, "").trim()
        : "";
    const message = custom || (demo ? t(MSG_DEMO, av) : t(we ? (a ? MSG.host[kind] : MSG.we[kind]) : MSG.me[kind], av));
    const venueTitle = ((demo ? t(data.venueName) : data.venueName) || "").trim();
    const address = ((demo ? DEMO.address : data.address) || "").trim();
    const coords = coordsFrom(data.mapUrl);
    const m = date ? date.getUTCMonth() : 0;
    const year = date ? date.getUTCFullYear() : 0;
    const day = date ? date.getUTCDate() : 0;
    // namunada javob muddati — Figma’dagidek sanadan 10 kun oldin («5-martgacha» — 15-mart uchun)
    const deadline = demo && sd ? new Date(Date.UTC(year, m, day - 10)).toISOString().slice(0, 10) : data.rsvpDeadline;
    const wd = date ? cw.weekday[date.getUTCDay()] : "";
    // «15-mart» / «15 марта» / «15 March»
    const dayMonth = date ? (lang === "uz" ? `${day}-${cw.monthsAfterDay[m]}` : `${day} ${cw.monthsAfterDay[m]}`) : "";
    // hero: «15-mart, dushanba · 18:00» / «15 марта, понедельник · 18:00» / «Monday, 15 March · 18:00»
    const heroDay = date ? (lang === "en" ? `${wd}, ${dayMonth}` : `${dayMonth}, ${wd.toLocaleLowerCase(lang)}`) : "";
    // Suratlar (PHOTO_SLOTS.oltin): 0 — arka (portret), 1–3 — «Xotiralar», 4 — «Manzil», 5 — final (oila).
    // Bo‘sh slot: arka — oltin barglar; xotiralar — bo‘lim yo‘qoladi; manzil — shablonning bayram zali; final — suratsiz kompozitsiya
    const own = demo ? [] : photos;
    const caps = demo ? DEMO.caps : [str("cap1"), str("cap2"), str("cap3")];
    const memSrc = demo ? [`${P}/xotira1.webp`, `${P}/xotira2.webp`, `${P}/xotira3.webp`] : own.slice(1, 4);
    return {
      a,
      we,
      host,
      age,
      jub,
      /** katta oltin raqam: yosh, bo‘lmasa — ismning birinchi harfi */
      big: age ? String(age) : mono,
      /** Playfair raqamlari old-style: 3, 4, 5, 7, 9 pastga tushadi (katta raqam arka/«yubiley» ustiga tushmasin) — bunday yoshda
       * lining raqamlar; Figma’dagi «60» (pastga tushmaydi) — old-style, o‘zgarishsiz */
      lining: /[34579]/.test(age ? String(age) : ""),
      /** «Hurmat bilan,» ostidagi imzo */
      signer: (demo ? DEMO.sign : str("sign")) || host || a,
      /** ochilish va final ostidagi qator: taklif qiluvchi yoki yubilyar */
      family: host || a,
      /** ochilish halqasidagi so‘z: «yubiley» / «tug‘ilgan kun» */
      ringWord: t(jub ? "yubiley" : "oltin::tug‘ilgan kun"),
      /** hero: «60 yillik yubiley» / «7 yoshlik tug‘ilgan kun» / «Tug‘ilgan kun» */
      ageSub: t(jub ? "{age} yillik yubiley" : age ? "{age} yoshlik tug‘ilgan kun" : "Tug‘ilgan kun", av),
      heroDate: [heroDay, time].filter(Boolean).join(" · "),
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
      life: (demo ? DEMO.life : exLife).slice(0, 6),
      memories: memSrc.map((src, i) => ({ src, cap: caps[i] || "" })),
      dressTitle: DRESS_TEXT[code] || str("dressCode") ? t(code) : "",
      dressNote,
      portrait: demo ? `${P}/portret.webp` : own[0] || "",
      hall: own[4] || `${P}/zal.webp`,
      fam: demo ? `${P}/oila.webp` : own[5] || "",
      rsvpUntil: untilPhrase(deadline, lang),
      timerTitle: t(jub ? "Yubileygacha" : "Bayramgacha"),
      calTitle: a ? t("{name} — tug‘ilgan kun", { name: a }) : t("Tug‘ilgan kun"),
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

/** Yon va chok ustidagi oltin barglar — skrollda sekin parallaks (`--py`, ±30px). Faqat `translate`. */
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
        x.style.setProperty("--py", `${Math.max(-30, Math.min(30, dist * -k)).toFixed(1)}px`);
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
 * har qator `two` o‘lchamida. `letters` — har harf alohida span (`--li` — tartib raqami; CSS kechikish beradi).
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
  letters?: boolean;
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
                    <span key={k} className={st.letter} style={vars({ "--li": idx++ })}>
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
/**
 * Oltin barglar (Figma «Oltin / Oltin barglar (vektor)», 160×120): tashqi qavat — joy va parallaks (`data-px`), ichki — paydo bo‘lish
 * (`data-a`). SVG Figma’dagidek qutidan biroz chiqadi (inset −4.49% 0 0 −0.88%).
 */
function Leaves({
  box,
  unit,
  a = "leaf",
  d = 0,
  px,
  pk,
  className,
  flip,
  eager,
}: {
  box: readonly [number, number, number, number];
  unit: Pos;
  a?: string;
  d?: number;
  px?: boolean;
  pk?: number;
  className?: string;
  flip?: boolean;
  eager?: boolean;
}) {
  const [x, y, w, h] = box;
  return (
    <div aria-hidden data-px={px ? "" : undefined} data-pk={pk} className={cx(st.art, className)} style={{ left: unit(x), top: unit(y), width: unit(w), height: unit(h) }}>
      <div data-a={a || undefined} className={st.fill} style={vars({ "--d": `${d}s` })}>
        <LeafImg eager={eager} flip={flip} />
      </div>
    </div>
  );
}
function LeafImg({ eager, flip, className }: { eager?: boolean; flip?: boolean; className?: string }) {
  return (
    <span className={cx(st.leafBox, className)} style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <Img src={`${P}/barglar.svg`} eager={eager} />
    </span>
  );
}

/** Figma «Oltin chiziq» — 1 px oltin gradient chiziq (markazdan chiziladi) */
function GoldLine({ w, mt, d = 0, top, left }: { w: number; mt?: number; d?: number; top?: number; left?: number }) {
  const abs = top != null;
  return (
    <span
      aria-hidden
      data-a="line"
      className={cx(st.goldLine, !abs && "mx-auto")}
      style={vars({ width: U(w), height: U(1), ...(abs ? { position: "absolute", top: U(top), left: U(left ?? 0) } : { marginTop: U(mt ?? 0) }), "--d": `${d}s` })}
    />
  );
}

/* ═════════════ 00 · Ochilish — oltin halqa (faqat scroll bilan, --o: 0…1) ═════════════
 * Yuklanganda (bosishsiz): qorong‘ida oltin halqa soat strelkasi bo‘ylab chiziladi (1.2 s), ichida «60» oltin folga bilan
 * bosilgandek chapdan o‘ngga ochiladi va ustidan yorug‘lik o‘tadi, oltin barglar sekin aylanib tushadi, «yubiley» va oila nomi chiqadi.
 * Scroll (rAF lerp): oila nomi so‘nadi (0…0.1); barglar portlab ikki tomonga sochiladi (0.02…0.57), halqa markazidan oltin
 * bo‘lakchalar otilib chiqadi (0.04…0.8); halqa kengayib ekrandan chiqadi (chiziq ingichka qoladi); «60» va «yubiley» biroz ko‘tarilib
 * kattalashadi (Figma’dagi hero raqami tomon). Ochilish tugagach sahna odatdagidek yuqoriga ketadi — hero (01) xuddi shu qora fonda
 * ostidan chiqadi (chok ko‘rinmaydi, «sharpa» yo‘q: fon har doim to‘liq qora). */
const GATE = {
  m: { W: 390, H: 844, S: 1, OX: 0 },
  l: { W: 1440, H: 1013, S: 1.2, OX: 486 },
} as const;
/** Halqa markazidan otiladigan bo‘lakchalar: deterministik (gidratatsiya mos keladi) */
type Bit = { x: number; y: number; r: number; s: number; d: number; k: 0 | 1 | 2 };
function makeBits(n: number): Bit[] {
  let s = 2606;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  return Array.from({ length: n }, (_, i) => {
    const ang = (i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.5;
    // ba’zilari yaqin qoladi (oxirgi kadrda raqam atrofida sochilib turadi), ko‘pi ekrandan chiqadi
    const dist = i % 3 === 0 ? 150 + rnd() * 90 : 330 + rnd() * 330;
    return { x: Math.cos(ang) * dist, y: Math.sin(ang) * dist * 1.15, r: (rnd() * 2 - 1) * 420, s: 5 + rnd() * 7, d: rnd() * 0.12, k: (i % 3) as 0 | 1 | 2 };
  });
}
const BITS = makeBits(30);

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
  const box = (x: number, y: number, w: number, h: number): CSSProperties => ({ left: X(x), top: Y(y), width: Z(w), height: Z(h) });
  const num = d.big;
  return (
    <div
      ref={wrap}
      className={cx(st.gateWrap, still && st.still)}
      style={vars(still ? { "--u": pageU, "--o": 0, height: U(H) } : { "--u": `min(${pageU}, calc(100svh / ${H}))` })}
    >
      <div className={st.gate} aria-label={t("Taklifnoma")} style={still ? { position: "relative", height: "100%" } : undefined}>
        <div aria-hidden className={st.gBg} />
        {/* halqa markazidan otiladigan oltin bo‘lakchalar (scroll) */}
        {!still && (
          <div aria-hidden className={st.bits} style={{ left: X(195), top: Y(355) }}>
            {BITS.map((b, i) => (
              <span
                key={i}
                className={cx(st.bit, b.k === 1 && st.bitQ, b.k === 2 && st.bitT)}
                style={vars({ width: Z(b.s), height: Z(b.s * (b.k === 1 ? 0.7 : 1)), marginLeft: Z(-b.s / 2), marginTop: Z(-b.s / 2), "--bx": Z(b.x), "--by": Z(b.y), "--br": `${b.r.toFixed(0)}deg`, "--bd": b.d.toFixed(3) })}
              />
            ))}
          </div>
        )}
        {/* oltin halqa — yuklanganda chiziladi, scrollda kengayib ekrandan chiqadi (chiziq ingichka qoladi) */}
        <div aria-hidden className={st.gRing} style={box(60, 220, 270, 270)}>
          <svg viewBox="0 0 270 270" className={st.svg}>
            <defs>
              <linearGradient id="oltinRing" x1="-19.2857" y1="19.2857" x2="173.571" y2="212.143" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FADB8C" />
                <stop offset="0.45" stopColor="#C7943D" />
                <stop offset="0.7" stopColor="#FCE69E" />
                <stop offset="1" stopColor="#A8782B" />
              </linearGradient>
            </defs>
            <circle cx="135" cy="135" r="134.25" pathLength={1} stroke="url(#oltinRing)" />
          </svg>
        </div>
        <div aria-hidden className={cx(st.gRing, st.gRing2)} style={box(60, 220, 270, 270)}>
          <svg viewBox="0 0 270 270" className={st.svg}>
            <circle cx="135" cy="135" r="134.25" pathLength={1} stroke="url(#oltinRing)" />
          </svg>
        </div>
        {/* «60» (yosh; bo‘lmasa — ismning birinchi harfi) va «yubiley» */}
        <div className={st.gNum} style={{ left: X(60), top: Y(260), width: Z(270), height: Z(197), transformOrigin: `50% ${U(S * 95)}` }}>
          {num && (
            <p className={cx(st.pfb, st.foil, "absolute inset-x-0 text-center")} style={{ top: 0, height: Z(140), lineHeight: `${Z(140)}`, whiteSpace: "nowrap" }}>
              <Fit base={140 * S} max={230 * S} deps={num} className={cx(st.gold, st.sweep, d.lining && st.lnum)} style={vars({ "--ga": "152.6deg" })}>
                {num}
              </Fit>
            </p>
          )}
          <p className={cx(st.pfi, st.gIn, "absolute inset-x-0 text-center")} style={vars({ top: Z(160), height: Z(37), fontSize: Z(28), lineHeight: `${Z(37)}`, color: "#fff", whiteSpace: "nowrap", "--gd": "1.3s" })}>
            <Fit base={28 * S} max={196 * S} deps={d.ringWord}>
              {d.ringWord}
            </Fit>
          </p>
        </div>
        {/* oltin barglar — sekin aylanib tushadi; scrollda ikki tomonga sochiladi */}
        <div aria-hidden data-leaf="a" className={cx(st.art, st.gLeaf)} style={vars({ ...box(40, 140, 120, 90), "--lx": Z(-200), "--ly": Z(-170), "--lr": "-50deg" })}>
          <div className={cx(st.fill, st.gLeafIn)} style={vars({ "--gd": "0.3s" })}>
            <LeafImg eager />
          </div>
        </div>
        <div aria-hidden data-leaf="b" className={cx(st.art, st.gLeaf)} style={vars({ ...box(250, 520, 110, 82.5), "--lx": Z(190), "--ly": Z(200), "--lr": "40deg" })}>
          <div className={cx(st.fill, st.gLeafIn)} style={vars({ "--gd": "0.55s" })}>
            <LeafImg eager />
          </div>
        </div>
        {d.family && (
          <p className={cx(st.ms5, st.gFam, "absolute text-center")} style={{ left: X(24), width: Z(342), top: Y(700), height: Z(20), fontSize: Z(15), lineHeight: `${Z(20)}`, color: GOLD_T, whiteSpace: "nowrap" }}>
            <span className={cx(st.gIn, "block")} style={vars({ "--gd": "1.6s" })}>
              <Fit base={15 * S} max={342 * S} deps={d.family}>
                <span style={{ letterSpacing: "0.06em" }}>{d.family}</span>
              </Fit>
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

/* ═════════════ Bo‘lim qobig‘i ═════════════ */
type Bg = "black" | "white";
/** Bo‘lim: to‘liq enli fon + markazda kontent ustuni (mobil 390 birlik; laptopda × 1.2). `outer` — ustundan tashqaridagi bezaklar */
function Sec({ children, z, bg, colStyle, id, outer, className, secRef }: { children: ReactNode; z: number; bg: Bg; colStyle?: CSSProperties; id?: string; outer?: ReactNode; className?: string; secRef?: React.Ref<HTMLElement> }) {
  return (
    <section ref={secRef} id={id} className={cx(st.sec, st[bg], className)} style={{ zIndex: z }}>
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

/** Sarlavha (Playfair Display Italic, markazda, 360 da sig‘adi); `gold` — oltin gradient */
function Title({ text, size = 40, h = 53, color = INK, gold, ga = "171deg", d = 0, style }: { text: string; size?: number; h?: number; color?: string; gold?: boolean; ga?: string; d?: number; style?: CSSProperties }) {
  return (
    <p data-a="up" className={cx(st.pfi, "text-center")} style={vars({ height: U(h), fontSize: U(size), lineHeight: `${U(h)}`, color: gold ? undefined : color, whiteSpace: "nowrap", "--d": `${d}s`, ...(style as Record<string, string>) })}>
      <Fit base={size} max={342} deps={text} className={gold ? st.gold : undefined} style={gold ? vars({ "--ga": ga }) : undefined}>
        {text}
      </Fit>
    </p>
  );
}

/* ═════════════ 01 · Hero — katta oltin «60» (ustidan yorug‘lik chizig‘i o‘tadi, 4 s loop), arka ichidagi portret pastdan maska bilan
 * ochiladi va 1.06 → 1, ism harfma-harf, «60 yillik yubiley», oltin chiziq chiziladi, sana. Surat bo‘lmasa — arkada oltin barglar
 * va nur; yosh bo‘lmasa — raqam o‘rnida ismning birinchi harfi ═════════════ */
function Hero({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  return (
    <Sec
      z={z}
      bg="black"
      className={st.heroSec}
      colStyle={{ paddingTop: U(630), paddingBottom: U(187) }}
      outer={
        <Side wide={wide}>
          <Leaves box={[150, 200, 220, 165]} unit={C} px d={0.3} />
          <Leaves box={[1080, 520, 220, 165]} unit={C} px d={0.45} flip />
        </Side>
      }
    >
      {/* arka: portret (yoki oltin barglar) */}
      <div data-a="mask" className={st.arch} style={vars({ left: U(65), top: U(250), width: U(260), height: U(340), borderRadius: `${U(130)} ${U(130)} 0 0`, "--d": "0.25s" })}>
        {d.portrait ? (
          <Img src={d.portrait} eager className={st.zoomImg} style={{ left: U(-6), width: U(272), maxWidth: "none", position: "absolute" }} />
        ) : (
          <div className={st.archEmpty}>
            <div className={st.art} style={{ left: U(60), top: U(150), width: U(140), height: U(105) }}>
              <LeafImg />
            </div>
          </div>
        )}
      </div>
      {/* katta oltin raqam — arka ustida (Figma qatlam tartibi) */}
      {d.big && (
        <p data-a="num" className={cx(st.pfb, "absolute text-center")} style={vars({ left: 0, top: U(40), width: U(390), height: U(260), lineHeight: `${U(260)}`, whiteSpace: "nowrap", "--d": "0.05s" })}>
          <Fit base={260} max={390} deps={d.big} className={cx(st.gold, st.shim, d.lining && st.lnum)} style={vars({ "--ga": "146.3deg", letterSpacing: "-0.04em" })}>
            {d.big}
          </Fit>
        </p>
      )}
      <Leaves box={[280, 200, 100, 75]} unit={U} px d={0.5} />
      <Leaves box={[10, 520, 90, 67.5]} unit={U} px d={0.6} />
      {/* ism — harflari navbat bilan ko‘tariladi (2 qatorga bo‘linsa — pastga o‘sadi) */}
      {d.a && (
        <h1 data-a="letters" className={cx(st.pf, "relative text-center")} style={{ color: "#fff" }}>
          <NameLines text={d.a} base={38} max={342} lh={42} two={30} twoLh={34} letters />
        </h1>
      )}
      <p data-a="up" className={cx(st.pfi, "relative text-center")} style={vars({ marginTop: U(d.a ? 14 : 0), height: U(32), fontSize: U(24), lineHeight: `${U(32)}`, whiteSpace: "nowrap", "--d": "0.55s" })}>
        <Fit base={24} max={342} deps={d.ageSub} className={st.gold} style={vars({ "--ga": "174.7deg" })}>
          {d.ageSub}
        </Fit>
      </p>
      <GoldLine w={100} mt={28} d={0.7} />
      {d.heroDate && (
        <p data-a="up" className={cx(st.ms5, "relative text-center")} style={vars({ marginTop: U(23), height: U(23), fontSize: U(17), lineHeight: `${U(23)}`, color: "#fff", whiteSpace: "nowrap", "--d": "0.8s" })}>
          <Fit base={17} max={342} deps={d.heroDate}>
            {d.heroDate}
          </Fit>
        </p>
      )}
      {/* chok ustidagi oltin barglar (01/02) — Figma’dagidek hero ichida, taklif (oq) bo‘limi ostida qoladi */}
      <div className={st.art} style={{ left: U(140), bottom: U(-12.5), width: U(110), height: U(82.5) }}>
        <Leaves box={[0, 0, 110, 82.5]} unit={U} px d={0.2} />
      </div>
    </Sec>
  );
}

/* ═════════════ 02 · Taklif — murojaat (mehmon ismi bilan), matn, oltin chiziq, «Hurmat bilan,» va imzo (kursiv) ═════════════ */
function Taklif({ d, z }: { d: D; z: number }) {
  const t = useT();
  const hello = d.guest ? guestHello(t, "Hurmatli {guest}!", d.guest) : t("Aziz mehmonlar!");
  return (
    <Sec z={z} bg="white" colStyle={{ paddingTop: U(100), paddingBottom: U(140) }}>
      <div data-a="up" className={cx(st.pfi, "relative text-center")} style={vars({ color: INK, "--d": "0.05s" })}>
        <NameLines text={hello} base={40} max={342} lh={53} two={30} twoLh={40} />
      </div>
      <p
        data-a="up"
        className={cx(st.ms, "relative mx-auto text-center")}
        style={vars({ marginTop: U(37), width: U(330), minHeight: U(144), fontSize: U(18), lineHeight: `${U(28.8)}`, color: INK, overflowWrap: "anywhere", whiteSpace: "pre-line", "--d": "0.12s" })}
      >
        {d.message}
      </p>
      <GoldLine w={100} mt={105} d={0.2} />
      {d.signer && (
        <div data-a="up" className={cx(st.pfi, "relative mx-auto text-center")} style={vars({ marginTop: U(29), width: U(342), fontSize: U(18), lineHeight: `${U(25.2)}`, color: INK, overflowWrap: "anywhere", "--d": "0.28s" })}>
          <p>{t("Hurmat bilan,")}</p>
          <p>{d.signer}</p>
        </div>
      )}
    </Sec>
  );
}

/* ═════════════ 03 · Hayot yo‘li — oltin vaqt chizig‘i yuqoridan pastga chiziladi, nuqtalar navbat bilan, yillar sanab chiqadi ═════════════ */
/** Yil (4 xonali raqam) — ko‘rinishda 40 yil oldindan sanab chiqadi; raqam bo‘lmasa (masalan, «1990-yillar») — o‘zgarishsiz */
function Year({ text, run }: { text: string; run: boolean }) {
  const n = /^\d{3,4}$/.test(text) ? +text : 0;
  const c = useCountUp(40, run && !!n, 1500);
  return <>{n ? String(n - 40 + c.value) : text}</>;
}
function Life({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const items = d.life;
  const [ref, inView] = useInView<HTMLDivElement>(0.2, true);
  if (!items.length) return null;
  const n = items.length;
  // chiziq: 190 dan oxirgi nuqtagacha + 115 (Figma: 3 ta band — 190…710)
  const lineEnd = 235 + 180 * (n - 1) + 115;
  return (
    <Sec
      z={z}
      bg="black"
      colStyle={{ height: U(lineEnd + 150) }}
      outer={
        <Side wide={wide}>
          <Leaves box={[180, 260, 180, 135]} unit={C} px d={0.2} />
          <Leaves box={[1080, 620, 180, 135]} unit={C} px d={0.35} flip />
        </Side>
      }
    >
      <div className="absolute inset-x-0" style={{ top: U(90) }}>
        <Title text={t("Hayot yo‘li")} gold ga="171.2deg" />
      </div>
      <div ref={ref}>
        <span aria-hidden data-a="draw" className={st.vline} style={vars({ left: U(195), top: U(190), width: U(1), height: U(lineEnd - 190), "--t": `${1.2 + n * 0.3}s`, "--d": "0.1s" })} />
        {items.map((it, i) => {
          const left = i % 2 === 0;
          const y = 180 * i;
          const dl = 0.3 + i * 0.3;
          return (
            <div key={i}>
              <span aria-hidden data-a="dot" className={st.dot} style={vars({ left: U(188), top: U(228 + y), width: U(14), height: U(14), "--d": `${dl}s` })} />
              {it.year && (
                <p
                  data-a={left ? "fromL" : "fromR"}
                  className={cx(st.pfb, "absolute")}
                  style={vars({ left: U(left ? 24 : 215), top: U(200 + y), width: U(150), height: U(46), fontSize: U(46), lineHeight: `${U(46)}`, textAlign: left ? "right" : "left", whiteSpace: "nowrap", "--d": `${dl + 0.05}s` })}
                >
                  <Fit base={46} max={150} deps={it.year} className={st.gold} style={vars({ "--ga": "163deg" })}>
                    <Year text={it.year} run={inView} />
                  </Fit>
                </p>
              )}
              {it.text && (
                <p
                  data-a={left ? "fromL" : "fromR"}
                  className={cx(st.ms, st.clamp3, "absolute")}
                  style={vars({ left: U(left ? 24 : 215), top: U((it.year ? 262 : 222) + y), width: U(150), fontSize: U(16), lineHeight: `${U(22.4)}`, color: "#fff", textAlign: left ? "right" : "left", "--d": `${dl + 0.15}s` })}
                >
                  {it.text}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Sec>
  );
}

/* ═════════════ 04 · Xotiralar — suratlar navbat bilan sepiyadan rangliga o‘tadi; ostida izoh (mijoz suratlari bo‘lmasa — bo‘lim yo‘q) ═════════════ */
function Memories({ d, z }: { d: D; z: number }) {
  const t = useT();
  const list = d.memories;
  if (!list.length) return null;
  // 1 ta — katta; 2 ta — yonma-yon ikkita kichik; 3 ta — Figma: katta va ikkita kichik
  const big = list.length !== 2 ? list[0] : null;
  const small = list.length === 2 ? list : list.slice(1);
  const photo = (p: { src: string }, w: number, h: number, i: number) => (
    <div data-a="memo" className={st.photo} style={vars({ width: U(w), height: U(h), borderRadius: U(6), "--d": `${0.1 + i * 0.18}s` })}>
      <Img src={p.src} className={st.zoomImg} />
      <Img src={p.src} className={cx(st.zoomImg, st.sepia)} />
    </div>
  );
  const cap = (s: string, i: number) =>
    s ? (
      <p data-a="up" className={cx(st.ms5, st.clamp2)} style={vars({ marginTop: U(10), fontSize: U(14), lineHeight: `${U(19)}`, color: "rgba(26,23,20,.75)", "--d": `${0.2 + i * 0.18}s` })}>
        {s}
      </p>
    ) : null;
  return (
    <Sec z={z} bg="white" colStyle={{ paddingTop: U(80), paddingBottom: U(132) }}>
      <Title text={t("Xotiralar")} />
      <div className="relative mx-auto" style={{ marginTop: U(27), width: U(342) }}>
        {big && (
          <div>
            {photo(big, 342, 256, 0)}
            {cap(big.cap, 0)}
          </div>
        )}
        {small.length > 0 && (
          <div className="flex items-start" style={{ marginTop: big ? U(25) : 0, gap: U(10) }}>
            {small.map((p, i) => (
              <div key={i} style={{ width: U(166) }}>
                {photo(p, 166, 210, i + 1)}
                {cap(p.cap, i + 1)}
              </div>
            ))}
          </div>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 05 · Yubileygacha — taymer: raqamlar oltin chiziqlar orasida varaqlanadi; kalendarga qo‘shish ═════════════ */
/**
 * Raqamlar doim 2 xonali («05»). Sanoq tugagach o‘zgargan raqam yuqoridan varaqlanadi (rotateX −70° → 0, shaffofliksiz):
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

function Timer({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const units = timerUnits(useLocale());
  const c = useCountdown(d.target);
  const [ref, inView] = useInView<HTMLDivElement>(0.3, true);
  if (!d.hasDate || !c) return null;
  const vals = [c.d, c.h, c.m, c.s];
  return (
    <Sec
      z={z}
      bg="black"
      colStyle={{ height: U(560) }}
      outer={
        <Side wide={wide}>
          <Leaves box={[190, 160, 180, 135]} unit={C} px d={0.2} />
          <Leaves box={[1060, 300, 180, 135]} unit={C} px d={0.35} flip />
        </Side>
      }
    >
      <GoldLine w={342} top={0} left={24} />
      <div className="absolute inset-x-0" style={{ top: U(90) }}>
        <Title text={d.timerTitle} color="#fff" size={38} h={51} />
      </div>
      <div ref={ref} className="absolute flex" style={{ left: U(25), top: U(190), width: U(340), height: U(100) }}>
        {vals.map((v, i) => (
          <div
            key={i}
            data-a="flip"
            className={cx(st.tcell, i < 3 && st.tcellLine, "flex flex-col items-center justify-center")}
            style={vars({ width: U(85), height: U(100), borderRightWidth: i < 3 ? U(1) : 0, "--d": `${0.1 + i * 0.1}s` })}
          >
            <p className={cx(st.pf, "text-center")} style={{ height: U(53), fontSize: U(40), lineHeight: `${U(53)}`, color: "#fff", whiteSpace: "nowrap" }}>
              <Fit base={40} max={80} deps={String(vals[0]).length}>
                <Digits value={v} run={inView} len={i === 0 ? Math.max(2, String(vals[0]).length) : 2} i={i} />
              </Fit>
            </p>
            <p className={cx(st.ms5, "text-center")} style={{ height: U(18), fontSize: U(13), lineHeight: `${U(18)}`, color: GOLD_T, whiteSpace: "nowrap" }}>
              <Fit base={13} max={80} deps={units[i]}>
                {units[i]}
              </Fit>
            </p>
          </div>
        ))}
      </div>
      <div data-a="up" className="absolute inset-x-0 flex justify-center" style={vars({ top: U(350), "--d": "0.3s" })}>
        <button
          type="button"
          className={cx(st.ms6, st.btnLine)}
          style={{ minWidth: U(250), height: U(56), padding: `0 ${U(20)}`, fontSize: U(15), borderWidth: U(1), borderRadius: U(2) }}
          onClick={() =>
            downloadIcs({
              title: d.calTitle,
              startLocal: `${d.iso}T${d.time || "18:00"}`,
              location: [d.venueTitle, d.address].filter(Boolean).join(", "),
              slug: "oltin",
            })
          }
        >
          {t("Kalendarga qo‘shish")}
        </button>
      </div>
    </Sec>
  );
}

/* ═════════════ 06 · Kecha dasturi — ajratuvchi chiziqlar chiziladi, qatorlar navbat bilan chapdan kiradi ═════════════ */
function Program({ d, z }: { d: D; z: number }) {
  const t = useT();
  const items = d.program.slice(0, 8);
  if (!items.length) return null;
  return (
    <Sec z={z} bg="white" colStyle={{ paddingTop: U(90), paddingBottom: U(76) }}>
      <Title text={t("Kecha dasturi")} size={38} h={51} />
      <div className="relative mx-auto" style={{ marginTop: U(39), width: U(342) }}>
        {items.map((it, i) => (
          <div key={i} className="relative flex" style={{ minHeight: U(96), padding: `${U(24)} 0 ${U(20)}`, gap: U(16) }}>
            <span data-a="rule" className={st.rule} style={vars({ height: U(1), "--d": `${0.1 + i * 0.12}s` })} />
            <p data-a="left" className={cx(st.pf, st.ptime)} style={vars({ width: U(100), height: U(40), fontSize: U(30), lineHeight: `${U(40)}`, color: INK, "--d": `${0.15 + i * 0.12}s` })}>
              <Fit base={30} max={100} deps={it.time}>
                {it.time}
              </Fit>
            </p>
            <p data-a="left" className={cx(st.ms6, st.clamp2, "min-w-0 flex-1 self-start")} style={vars({ marginTop: U(8), fontSize: U(16), lineHeight: `${U(20.8)}`, color: INK, "--d": `${0.2 + i * 0.12}s` })}>
              {it.title}
            </p>
          </div>
        ))}
      </div>
    </Sec>
  );
}

/* ═════════════ 07 · Manzil — surat (mijozning 5-surati; bo‘lmasa — bayram zali), joy nomi, manzil, xarita va yo‘nalish ═════════════ */
function Venue({ d, z, linkable }: { d: D; z: number; linkable: boolean }) {
  const t = useT();
  if (!d.hasPlace) return null;
  const btn = (s: string) => (
    <Fit base={15} max={145} deps={s}>
      <span style={{ letterSpacing: "0.04em" }}>{s}</span>
    </Fit>
  );
  return (
    <Sec z={z} bg="black" colStyle={{ paddingTop: U(90), paddingBottom: U(114) }}>
      <Title text={t("Manzil")} gold size={38} h={51} ga="171.5deg" />
      <div data-a="zoom" className="relative mx-auto overflow-hidden" style={vars({ marginTop: U(25), width: U(342), height: U(228), borderRadius: U(4), background: INK, "--d": "0.1s" })}>
        <Img src={d.hall} className={st.zoomImg} />
      </div>
      {d.venueTitle && (
        <p data-a="up" className={cx(st.pf, "mx-auto text-center")} style={vars({ marginTop: U(26), width: U(342), minHeight: U(35), fontSize: U(26), lineHeight: `${U(35)}`, color: "#fff", overflowWrap: "anywhere", textWrap: "balance", "--d": "0.15s" })}>
          {d.venueTitle}
        </p>
      )}
      {d.address && (
        <p data-a="up" className={cx(st.ms, "mx-auto text-center")} style={vars({ marginTop: U(11), width: U(342), minHeight: U(22), fontSize: U(16), lineHeight: `${U(22)}`, color: "rgba(255,255,255,.8)", overflowWrap: "anywhere", textWrap: "balance", "--d": "0.22s" })}>
          {d.address}
        </p>
      )}
      <div data-a="up" className="relative mx-auto flex" style={vars({ marginTop: U(62), width: U(342), gap: U(12), "--d": "0.3s" })}>
        <a href={linkable ? d.mapUrl : undefined} target="_blank" rel="noopener noreferrer" className={cx(st.ms6, st.btnGold)} style={{ flex: "1 1 0", minWidth: 0, height: U(56), padding: `0 ${U(10)}`, fontSize: U(15), borderRadius: U(2) }}>
          {btn(t("Xaritada ochish"))}
        </a>
        <a href={linkable ? d.taxi : undefined} target="_blank" rel="noopener noreferrer" className={cx(st.ms6, st.btnLine)} style={{ flex: "1 1 0", minWidth: 0, height: U(56), padding: `0 ${U(10)}`, fontSize: U(15), borderWidth: U(1), borderRadius: U(2) }}>
          {btn(t("Yo‘nalish"))}
        </a>
      </div>
    </Sec>
  );
}

/* ═════════════ 08 · Dress-kod (ixtiyoriy — o‘chirilsa joy qolmaydi): oltin hoshiyali karta — turi (oltin kursiv) va izoh ═════════════ */
function Dress({ d, z }: { d: D; z: number }) {
  if (!d.dressNote && !d.dressTitle) return null;
  return (
    <Sec z={z} bg="black" colStyle={{ paddingTop: U(30), paddingBottom: U(75) }}>
      <div data-a="rise" className={cx(st.dressCard, "relative mx-auto flex flex-col items-center text-center")} style={{ width: U(342), padding: `${U(30)} ${U(26)}`, gap: U(10), borderRadius: U(4), borderWidth: U(1) }}>
        {d.dressTitle && (
          <p className={st.pfi} style={{ height: U(45), fontSize: U(34), lineHeight: `${U(45)}`, whiteSpace: "nowrap" }}>
            <Fit base={34} max={288} deps={d.dressTitle} className={st.gold} style={vars({ "--ga": "165.5deg" })}>
              {d.dressTitle}
            </Fit>
          </p>
        )}
        {d.dressNote && (
          <p className={st.ms} style={{ width: "100%", fontSize: U(17), lineHeight: 1.5, color: "#fff", overflowWrap: "anywhere" }}>
            {d.dressNote}
          </p>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 09 · Anketa — javob («Kelaman» bosilsa tugmadan oltin bo‘lakchalar sochiladi) ═════════════ */
const FLY = [
  [-46, 0, 9, -1],
  [-20, 0.06, 7, 1],
  [6, 0.02, 10, -1],
  [30, 0.09, 6, 1],
  [48, 0.04, 8, -1],
  [-8, 0.12, 6, 1],
] as const;
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
  const area = useRef<HTMLTextAreaElement>(null);
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
  // tilak maydoni — Figma’dagidek chiziq ustida bir qator, yozilgan sari yuqoriga o‘sadi (maydon balandligigacha)
  useIso(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    const lh = parseFloat(getComputedStyle(el).lineHeight) || 23;
    const lines = Math.max(1, Math.min(4, Math.round(el.scrollHeight / lh)));
    el.style.height = U(23 * lines);
  }, [wish, sent, wide]);
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
    <p className={cx(st.ms6, st.lbl)} style={{ marginTop: U(mt), height: U(19), fontSize: U(14), lineHeight: `${U(19)}` }}>
      {s}
    </p>
  );
  const sub = d.rsvpUntil ? t("Iltimos, {date} javob bering", { date: d.rsvpUntil }) : t(d.we ? "Javobingizni kutamiz" : "Javobingizni kutaman");
  const pick = (s: RsvpStatus) => {
    setStatus(s);
    if (s === "coming") setFly((n) => n + 1);
  };
  return (
    <Sec z={z} bg="white" id="oltin-javob" colStyle={{ paddingTop: U(100), paddingBottom: U(50) }}>
      {/* chok ustidagi oltin barglar (08/09) */}
      <Leaves box={[140, -40, 110, 82.5]} unit={U} px className={st.seam} />
      <h2 data-a="up" className={cx(st.pfi, "mx-auto text-center")} style={vars({ width: U(342), fontSize: U(40), lineHeight: `${U(53)}`, color: INK, overflowWrap: "anywhere", "--d": "0.05s" })}>
        {t("Kelasizmi?")}
      </h2>
      <p data-a="up" className={cx(st.ms, "mx-auto text-center")} style={vars({ marginTop: U(7), width: U(342), minHeight: U(22), fontSize: U(16), lineHeight: `${U(22)}`, color: "rgba(26,23,20,.7)", overflowWrap: "anywhere", "--d": "0.12s" })}>
        {sub}
      </p>
      <div data-a="rise" className={cx(st.card, "relative mx-auto")} style={vars({ marginTop: U(28), width: U(342), padding: `${U(23)} ${U(21)} ${U(58)}`, borderWidth: U(1), "--d": "0.2s" })}>
        {sent ? (
          <div key="thanks" className={cx(st.thanks, "relative flex flex-col items-center text-center")} style={{ padding: `${U(56)} ${U(6)} ${U(22)}`, gap: U(16), minHeight: U(480) }}>
            <div aria-hidden className="relative" style={{ width: U(140), height: U(105) }}>
              <LeafImg />
            </div>
            <p className={st.pfi} style={{ fontSize: U(sent === "not_coming" ? 34 : 28), lineHeight: 1.25, overflowWrap: "anywhere" }}>
              <span className={st.gold} style={vars({ "--ga": "170deg" })}>
                {sent === "not_coming" ? t("Rahmat!") : t("Rahmat! Joyingiz band qilindi")}
              </span>
            </p>
            <p className={st.ms} style={{ fontSize: U(17), color: "rgba(26,23,20,.7)", lineHeight: 1.5, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Javobingiz uchun rahmat!") : t("{name} — {count} kishi. Javobingiz yetkazildi.", { name: name.trim() || t("Javobingiz"), count })}
            </p>
            <button type="button" onClick={() => setSent(null)} className={st.ms6} style={{ fontSize: U(16), color: INK, textDecoration: "underline", textUnderlineOffset: 3 }}>
              {t("Javobni o‘zgartirish")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="relative flex flex-col items-stretch">
            {label(t("Ismingiz"), 0)}
            <label className={st.field} style={{ marginTop: U(1), height: U(54), paddingBottom: U(9), borderBottomWidth: U(1) }}>
              <input
                className={cx(st.ms, st.input)}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder={t("Ism va familiya")}
                aria-label={t("Ismingiz")}
                style={{ fontSize: U(17), lineHeight: `${U(23)}` }}
              />
            </label>
            {label(t("Kelasizmi?"), 26)}
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
                  className={cx(st.ms6, st.choice)}
                  style={{ flex: "1 1 0", padding: `${U(4)} ${U(4)}`, minHeight: U(54), fontSize: U(15), borderWidth: U(1), borderRadius: U(2) }}
                >
                  <span style={{ overflowWrap: "anywhere", letterSpacing: "0.04em" }}>{t(l)}</span>
                  {s === "coming" &&
                    fly > 0 &&
                    FLY.map(([dx, dl, sz, r], k) => (
                      <span key={`${fly}-${k}`} aria-hidden className={cx(st.fly, k % 2 ? st.bitQ : st.bitT)} style={vars({ width: U(sz), height: U(sz), marginLeft: U(dx - sz / 2), "--fl": `${dl}s`, "--fr": `${r * 160}deg` })} />
                    ))}
                </button>
              ))}
            </div>
            {status === "coming" && (
              <>
                {label(t("Necha kishi bo‘lasiz?"), 22)}
                <div className={cx(st.counter, "justify-between")} style={{ marginTop: U(5), height: U(54), padding: `0 ${U(6)}`, borderWidth: U(1) }}>
                  <button type="button" className={cx(st.ms7, st.step)} disabled={count <= 1} onClick={() => setCount((n) => Math.max(1, n - 1))} aria-label={t("Kamaytirish")} style={{ width: U(40), height: U(40), fontSize: U(22) }}>
                    −
                  </button>
                  <span className={st.pf} style={{ fontSize: U(28), lineHeight: 1.3, color: INK }} aria-live="polite">
                    {count}
                  </span>
                  <button type="button" className={cx(st.ms7, st.step)} disabled={count >= 20} onClick={() => setCount((n) => Math.min(20, n + 1))} aria-label={t("Ko‘paytirish")} style={{ width: U(40), height: U(40), fontSize: U(22) }}>
                    +
                  </button>
                </div>
              </>
            )}
            {label(t("Tabrik va tilaklaringiz"), 24)}
            <label className={cx(st.field, st.fieldArea)} style={{ marginTop: U(1), height: U(130), paddingBottom: U(9), borderBottomWidth: U(1) }}>
              <textarea
                ref={area}
                rows={1}
                className={cx(st.ms, st.input)}
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                maxLength={500}
                placeholder={t("Yozing…")}
                aria-label={t("Tabrik va tilaklaringiz")}
                style={{ fontSize: U(17), lineHeight: `${U(23)}` }}
              />
            </label>
            {err && (
              <p className={st.ms} style={{ marginTop: U(12), color: "#c2410c", fontSize: U(15) }}>
                {err}
              </p>
            )}
            <button type="submit" disabled={busy} className={cx(st.ms6, st.submit)} style={{ marginTop: U(30), minHeight: U(56), padding: `${U(8)} ${U(12)}`, fontSize: U(15), borderRadius: U(2), opacity: busy ? 0.7 : 1 }}>
              <span style={{ letterSpacing: "0.04em" }}>{busy ? t("Yuborilmoqda…") : t("Yuborish")}</span>
            </button>
          </form>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 10 · Final — oila surati sekin kattalashib joyiga tushadi (1.1 → 1), «Sizni kutamiz!», katta «60» ustidan yana
 * yorug‘lik o‘tadi, oltin barglar ko‘tarilib joylashadi (scroll bilan: --fc 0 … 1 = Figma kadri; sahifa oxirigacha albatta tugaydi).
 * Oila surati bo‘lmasa — kompozitsiya surat o‘rnisiz (yuqoriga suriladi) ═════════════ */
function Final({ d, z, wide, still, onSeen }: { d: D; z: number; wide: boolean; still: boolean; onSeen: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const sec = useRef<HTMLElement>(null);
  const onP = useCallback(
    (_p: number, r: DOMRect) => {
      const el = ref.current;
      if (!el) return;
      const vh = window.innerHeight || 800;
      // bo‘lim pasti ekran pastiga yetganda (yoki sahifa oxirida) tugaydi, 0.8 ekran oldin boshlanadi
      const y = window.scrollY;
      const top = r.top + y;
      const max = document.documentElement.scrollHeight - vh;
      const s1 = Math.max(1, Math.min(top + r.height - vh, max));
      const s0 = s1 - vh * 0.8;
      const f = seg(y, s0, s1);
      el.style.setProperty("--fc", f.toFixed(4));
      if (f > 0.5) onSeen();
    },
    [onSeen],
  );
  useScrollProgress(sec, onP, !still);
  const title = t(d.we ? "Sizni kutamiz!" : "Sizni kutaman!");
  // Figma laptop: oila surati balandroq (410×328, y 78 — ustun birligida 342×273.3, y 65), pasti mobil bilan bir xil
  const off = d.fam ? 0 : 280;
  return (
    <section ref={sec} className={cx(st.sec, st.black, st.fin)} style={{ zIndex: z }}>
      <Side wide={wide}>
        <Leaves box={[140, 300 - off * 1.2, 240, 180]} unit={C} px d={0.1} />
        <Leaves box={[1060, 560 - off * 1.2, 240, 180]} unit={C} px d={0.2} flip />
      </Side>
      <div ref={ref} className={cx(st.col, st.finalWrap)} style={vars({ width: U(390), height: U(860 - off), ...(still ? { "--fc": 1 } : {}) })}>
        {d.fam && (
          <div data-a="zoom" className={cx(st.fPhoto, "absolute overflow-hidden")} style={vars({ left: U(24), top: U(wide ? 65 : 110), width: U(342), height: U(wide ? 273.3 : 228), borderRadius: U(4), background: INK, "--d": "0.05s" })}>
            <Img src={d.fam} className={st.fImg} />
          </div>
        )}
        <p data-a="up" className={cx(st.pfi, "absolute inset-x-0 text-center")} style={vars({ top: U(390 - off), height: U(56), fontSize: U(42), lineHeight: `${U(56)}`, whiteSpace: "nowrap", "--d": "0.1s" })}>
          <Fit base={42} max={342} deps={title} className={st.gold} style={vars({ "--ga": "170.7deg" })}>
            {title}
          </Fit>
        </p>
        {d.big && (
          <p data-a="num" className={cx(st.pfb, "absolute inset-x-0 text-center")} style={vars({ top: U(470 - off), height: U(120), lineHeight: `${U(120)}`, whiteSpace: "nowrap", "--d": "0.2s" })}>
            <Fit base={120} max={300} deps={d.big} className={cx(st.gold, st.fSweep, d.lining && st.lnum)} style={vars({ "--ga": "160.7deg" })}>
              {d.big}
            </Fit>
          </p>
        )}
        <div className={cx(st.art, st.fLeaf)} style={vars({ left: U(40), top: U(500 - off), width: U(100), height: U(75), "--fx": -1 })}>
          <LeafImg />
        </div>
        <div className={cx(st.art, st.fLeaf)} style={vars({ left: U(260), top: U(560 - off), width: U(100), height: U(75), "--fx": 1 })}>
          <LeafImg />
        </div>
        {d.family && (
          <p data-a="up" className={cx(st.ms5, "absolute inset-x-0 text-center")} style={vars({ top: U(760 - off), height: U(20), fontSize: U(15), lineHeight: `${U(20)}`, color: GOLD_T, whiteSpace: "nowrap", "--d": "0.3s" })}>
            <Fit base={15} max={342} deps={d.family}>
              <span style={{ letterSpacing: "0.06em" }}>{d.family}</span>
            </Fit>
          </p>
        )}
      </div>
    </section>
  );
}

/* ═════════════ Musiqa tugmasi — Figma «Oltin / Musiqa tugmasi»: qora doira (52), oltin halqa, 4 ta oltin chiziq ritmda;
 * o‘chirilgan — chiziqlar nuqtaga aylanadi («····») ═════════════ */
const BARS = [10, 18, 13, 20];
function OltinMusic({ m, wide, embedded }: { m: ReturnType<typeof useMusic>; wide: boolean; embedded: boolean }) {
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
type Key = "hero" | "taklif" | "life" | "memories" | "timer" | "program" | "venue" | "dress" | "rsvp" | "final";

export function OltinSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const loaded = usePreload([`${P}/barglar.svg`, d.portrait].filter(Boolean), [...d.memories.map((m) => m.src), d.hall, d.fam].filter(Boolean), withGate, wide ? "l" : "m");
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

  const shown: Key[] = (["hero", "taklif", "life", "memories", "timer", "program", "venue", "dress", "rsvp", "final"] as Key[]).filter((k) =>
    k === "life"
      ? d.life.length > 0
      : k === "memories"
        ? d.memories.length > 0
        : k === "timer"
          ? d.hasDate
          : k === "program"
            ? d.program.length > 0
            : k === "venue"
              ? d.hasPlace
              : k === "dress"
                ? !!(d.dressNote || d.dressTitle)
                : k === "rsvp"
                  ? data.rsvpEnabled
                  : true,
  );
  const z = (k: Key) => 6 + shown.indexOf(k);
  const linkable = mode !== "preview";
  const colU = wide ? COL_L : COL_M;

  return (
    <div ref={root} className={st.root}>
      <div className={st.page} style={vars({ "--u": colU })}>
        <OltinMusic m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/muhr.svg`} />}
        <div className={st.flow}>
          {withGate && (loaded ? <Gate d={d} wide={wide} onStart={() => music.play(true)} /> : <div className={st.gateHold} />)}
          {embedded && <Gate d={d} wide={wide} still onStart={() => {}} />}
          <Hero d={d} z={z("hero")} wide={wide} />
          <Taklif d={d} z={z("taklif")} />
          <Life d={d} z={z("life")} wide={wide} />
          <Memories d={d} z={z("memories")} />
          <Timer d={d} z={z("timer")} wide={wide} />
          <Program d={d} z={z("program")} />
          <Venue d={d} z={z("venue")} linkable={linkable} />
          <Dress d={d} z={z("dress")} />
          {data.rsvpEnabled && <Rsvp d={d} slug={data.slug} mode={mode} z={z("rsvp")} wide={wide} />}
          <Final d={d} z={z("final")} wide={wide} still={embedded} onSeen={onFinal} />
        </div>
        <footer className={cx(st.footer, "flex items-start justify-center")} style={{ height: U(120), paddingTop: U(50) }}>
          <p className={cx(st.ms5, "text-center")} style={{ fontSize: U(14), lineHeight: `${U(19)}`, color: "rgba(255,255,255,.5)" }}>
            <a href="https://shohnoma.uz">{t("shohnoma.uz orqali yaratilgan")}</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
