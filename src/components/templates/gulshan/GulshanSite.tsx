"use client";

import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource/cormorant-garamond/600.css";
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
import { calendarWords, coordsFrom, downloadIcs, untilPhrase } from "../anor/data";
import { MSG } from "../xotira/data";
import { DRESS_TEXT, GULSHAN_DEMO, GULSHAN_DEMO_EN, GULSHAN_DEMO_RU, MSG_DEMO, P, type GulshanItem } from "./data";
import st from "./gulshan.module.css";

/* ── Birliklar ──
 * U — joriy `--u`. Bo‘limlarda — kontent ustuni (Figma mobil 390 koordinatalari; laptopda ustun = mobil × 1.2, ya’ni 468px / 1440 —
 * Figma «Kontent ustuni (mobil ×1.2)»). C — laptop kanvasi (1440) birligi: yon bezaklar (gul to‘dasi, gul shoxi).
 * Ochilish (00) — o‘z kanvasi (mobil 390×844, laptop 1440×1013): sahna bir ekranga sig‘adi va pastki chetga bog‘lanadi;
 * laptopda ustun elementlari = mobil koordinata × 1.2 + 486 (Figma bilan aynan). PU — sahifa ustuni birligi (sahnadagi hero nusxasi). */
const U = (n: number) => `calc(var(--u) * ${+n.toFixed(3)})`;
const PU = (n: number) => `calc(var(--pu) * ${+n.toFixed(3)})`;
const C = (n: number) => `calc(100cqw / 1440 * ${+n.toFixed(3)})`;
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const vars = (o: Record<string, string | number | undefined>) => o as CSSProperties;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const COL_M = "calc(100cqw / 390)";
const COL_L = "calc(100cqw / 1440 * 1.2)";
const CANVAS_L = "calc(100cqw / 1440)";

/* Ranglar (Figma «28 · Gulshan — Assets») */
const GREEN = "#0F4D3A";
const GOLD = "#C9A45C";
const BLUSH = "#E8B4A0";
const INK = "#17211C";
const MUTED = "#6B7873";

/* ═════════════ Yosh ═════════════ */
/** «55» → 55 (1…120); bo‘lmasa 0 */
function parseAge(raw: string) {
  const n = Math.round(Number(String(raw).replace(/[^\d.]/g, "")));
  return raw.trim() && Number.isFinite(n) && n >= 1 && n <= 120 ? n : 0;
}
/** Yubiley — 20 dan katta va 5 ga karrali yosh (25, 30, …, 55, 60 …): «yubiley» so‘zi; aks holda — «tug‘ilgan kun» */
const isJubilee = (n: number) => n >= 20 && n % 5 === 0;

/** Server yaratadigan standart taklif matni (php/api/lib/orders.php DEFAULT_MESSAGE) — har qaysi tilda */
const SERVER_DEFAULT = "Aziz mehmonlar! Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.";
const isServerDefault = (m: string) => (["uz", "ru", "en"] as Locale[]).some((l) => tr(l, SERVER_DEFAULT).trim() === m.trim());

function useData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO = lang === "ru" ? GULSHAN_DEMO_RU : lang === "en" ? GULSHAN_DEMO_EN : GULSHAN_DEMO;
  const ex = (data.extra ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof ex[k] === "string" ? (ex[k] as string).trim() : typeof ex[k] === "number" ? String(ex[k]) : "");
  const sd = splitDate(data.date);
  const guest = useGuestName();
  return useMemo(() => {
    const cw = calendarWords(lang);
    const exProgram = Array.isArray(ex.program) ? (ex.program as GulshanItem[]).filter((p) => p?.time && p?.title) : [];
    const raw = (data.photos ?? []) as (string | null | undefined)[];
    const date = sd ? new Date(`${sd.iso}T12:00:00Z`) : null;
    // namunadagi ism tarjima qilinadi (mijoz ma’lumoti — o‘zgarishsiz)
    const a = ((demo ? t(data.personA) : data.personA) || "").trim();
    // taklif qiluvchi (ixtiyoriy: masalan, «Ahmedovlar oilasi»): bo‘lsa — matnlar «biz» nomidan; bo‘lmasa — yubilyarning o‘zi nomidan
    const host = demo ? DEMO.host : str("host");
    const we = !!host;
    const age = parseAge(str("age") || (demo ? DEMO.age : ""));
    const jub = isJubilee(age);
    const kind = jub ? "jub" : age ? "age" : "none";
    const av = { age, name: a };
    const mono = a ? Array.from(a)[0].toLocaleUpperCase(lang) : "";
    const code = str("dressCode") || (demo ? DEMO.dressCode : "");
    const dressNote = str("dressNote") || (DRESS_TEXT[code] ? t(DRESS_TEXT[code]) : "");
    const time = sd?.time ?? "";
    const program = (demo ? DEMO.program : exProgram.length ? exProgram : ((data.program ?? []) as GulshanItem[])) as GulshanItem[];
    const msgRaw = (demo ? "" : data.message || "").trim();
    const custom =
      msgRaw && !isServerDefault(msgRaw)
        ? msgRaw.replace(/^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Muhtaram mehmonlar!|Hurmatli mehmonlar!|Дорогие гости!|Уважаемые гости!|Dear guests!)\s*/, "").trim()
        : "";
    const message = custom || (demo ? t(MSG_DEMO, av) : t(we ? (a ? MSG.host[kind] : MSG.we[kind]) : MSG.me[kind], av));
    const venueTitle = ((demo ? t(data.venueName) : data.venueName) || "").trim();
    const address = ((demo ? DEMO.address : data.address) || "").trim();
    const coords = coordsFrom(data.mapUrl);
    const m = date ? date.getUTCMonth() : 0;
    const year = date ? date.getUTCFullYear() : 0;
    const day = date ? date.getUTCDate() : 0;
    // namunada javob muddati — Figma’dagidek sanadan 8 kun oldin («28-martgacha» — 5-aprel uchun)
    const deadline = demo && sd ? new Date(Date.UTC(year, m, day - 8)).toISOString().slice(0, 10) : data.rsvpDeadline;
    const wd = date ? cw.weekday[date.getUTCDay()] : "";
    // «5-aprel» / «5 апреля» / «5 April»
    const dayMonth = date ? (lang === "uz" ? `${day}-${cw.monthsAfterDay[m]}` : `${day} ${cw.monthsAfterDay[m]}`) : "";
    // hero: «5-aprel, dushanba · 18:00» / «5 апреля, понедельник · 18:00» / «Monday, 5 April · 18:00»
    const heroDay = date ? (lang === "en" ? `${wd}, ${dayMonth}` : `${dayMonth}, ${wd.toLocaleLowerCase(lang)}`) : "";
    // Suratlar (PHOTO_SLOTS.gulshan): 0 — medalyon portret, 1–3 — «Baxtli lahzalar», 4 — «Manzil».
    // Bo‘sh slot: portret — medalyon ichida gul to‘dasi; lahzalar — bo‘lim yo‘qoladi; manzil — shablonning bayram zali
    const slot = (i: number) => (demo ? "" : (raw[i] as string) || "");
    const gallery = demo ? [`${P}/lahza1.webp`, `${P}/lahza2.webp`, `${P}/lahza3.webp`] : [slot(1), slot(2), slot(3)].filter(Boolean);
    return {
      a,
      we,
      host,
      age,
      jub,
      /** katta oltin raqam: yosh, bo‘lmasa — ismning birinchi harfi */
      big: age ? String(age) : mono,
      /** ochilishda medalyon ichidagi raqam ostidagi so‘z */
      gateWord: t(jub ? "gulshan::yubiley" : "gulshan::tug‘ilgan kun"),
      /** hero: «55 yillik yubiley» / «7 yoshlik tug‘ilgan kun» / «Tug‘ilgan kun» */
      ageSub: t(jub ? "{age} yillik yubiley" : age ? "{age} yoshlik tug‘ilgan kun" : "Tug‘ilgan kun", av),
      heroLine: [heroDay, time].filter(Boolean).join(" · "),
      time,
      dateLine: [dayMonth, time ? t("soat {time}", { time }) : ""].filter(Boolean).join(" · "),
      /** «Hurmat bilan,» ostidagi imzo */
      signer: (demo ? DEMO.sign : str("sign")) || host || a,
      /** final ostidagi qator: taklif qiluvchi yoki yubilyar */
      family: host || a,
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
      gallery,
      dressTitle: DRESS_TEXT[code] || str("dressCode") ? t(code) : "",
      dressNote,
      portrait: demo ? `${P}/portret.webp` : slot(0) || "",
      hall: slot(4) || `${P}/zal.webp`,
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

/**
 * Scroll bilan bog‘liq bezaklar (faqat `translate` / `rotate`):
 * `data-px` — yon bezaklar parallaksi (ekran markazidan masofaga qarab, ±`data-pm` px);
 * `data-pz` — hero gul shoxlari 0.85x tezlikda (bo‘lim tepasi ekran tepasida bo‘lganda 0 — ochilish sahnasi bilan chok yo‘q);
 * `data-pr` — chok ustidagi gullar scroll bilan ±10° aylanadi.
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
      el.querySelectorAll<HTMLElement>("[data-px],[data-pz],[data-pr]").forEach((x) => {
        const r = x.getBoundingClientRect();
        if (r.bottom < -300 || r.top > vh + 300) return;
        if (x.dataset.pz != null) {
          const top = x.closest("section")?.getBoundingClientRect().top ?? 0;
          x.style.setProperty("--py", `${Math.min(140, Math.max(0, -top) * 0.15).toFixed(1)}px`);
          return;
        }
        const dist = r.top + r.height / 2 - vh / 2;
        if (x.dataset.pr != null) {
          const k = Math.max(-1, Math.min(1, dist / vh));
          x.style.setProperty("--pr", `${(k * 10).toFixed(2)}deg`);
          return;
        }
        const k = +(x.dataset.pk || 0.06);
        const mx = +(x.dataset.pm || 24);
        x.style.setProperty("--py", `${Math.max(-mx, Math.min(mx, dist * -k)).toFixed(1)}px`);
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
 * har qator `two` o‘lchamida. `letters` — har harf alohida span (`--li` — tartib raqami; ochilishda harfma-harf chiqadi).
 */
function NameLines({
  text,
  base,
  max,
  lh,
  two,
  twoLh,
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
    <div className={className} style={{ textAlign: "center", ...style }}>
      <span ref={probe} aria-hidden className="pointer-events-none absolute whitespace-nowrap" style={{ visibility: "hidden", fontSize: U(base), left: 0, top: 0 }}>
        {text}
      </span>
      {rows.map((r, i) => (
        <span
          key={i}
          className="block"
          style={{
            height: U(h),
            lineHeight: `${U(h)}`,
            fontSize: U(fs),
            whiteSpace: "nowrap",
          }}
        >
          <Fit base={fs} max={max} deps={`${r}|${fs}`}>
            {letters
              ? Array.from(r).map((ch, k) =>
                  /\s/.test(ch) ? (
                    <span key={k}> </span>
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

/* ═════════════ Bezaklar (Figma «Gulshan / Qatlam · Gul to‘dasi (katta)» va «Gul shoxi»; fonlari kesilgan, Normal blend) ═════════════
 * Figma o‘lchami va burilishi aynan: (x, y) — burilmagan qutining chap yuqori burchagi, `rot` — Figma burilishi (soat millariga qarshi,
 * markaz — shu burchak). `a` — paydo bo‘lish turi, `px` — parallaks turi. */
type DecoP = {
  kind: "gul" | "shox";
  x: number;
  y: number;
  w: number;
  h?: number;
  rot?: number;
  op?: number;
  unit?: (n: number) => string;
  a?: string;
  d?: number;
  px?: "px" | "pz" | "pr";
  className?: string;
  eager?: boolean;
};
function Deco({ kind, x, y, w, h, rot = 0, op = 1, unit = U, a, d = 0, px, className, eager }: DecoP) {
  const pxAttr = px === "px" ? { "data-px": "", "data-pk": "0.05", "data-pm": "22" } : px === "pz" ? { "data-pz": "" } : px === "pr" ? { "data-pr": "" } : {};
  return (
    <div
      aria-hidden
      data-a={a}
      className={cx(st.deco, className)}
      style={vars({ left: unit(x), top: unit(y), width: unit(w), height: unit(h ?? w), "--d": `${d}s` })}
    >
      <div className={cx(st.decoMove, px === "pr" && st.decoSpin)} {...pxAttr}>
        <div className={st.decoRot} style={{ transform: rot ? `rotate(${-rot}deg)` : undefined, opacity: op === 1 ? undefined : op }}>
          <Img src={`${P}/${kind}.webp`} eager={eager} />
        </div>
      </div>
    </div>
  );
}

/** Laptop yon bezaklari (1440 kanvas, bo‘lim tepasidan) */
function Side({ wide, children }: { wide: boolean; children: ReactNode }) {
  if (!wide) return null;
  return (
    <div aria-hidden className={st.sideLayer}>
      {children}
    </div>
  );
}

/** Oltin medalyon halqasi (1.2) va ichki punktir halqa (0.75, 60%, 2.2/3.6) — Figma o‘lchamida (viewBox = `size`); `ringOuter`
 * pathLength=1 — chizilish (stroke-dashoffset) CSS’da */
function Rings({ size, inner, className, style }: { size: number; inner: number; className?: string; style?: CSSProperties }) {
  const c = size / 2;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={cx(st.svg, className)} style={style} aria-hidden>
      <circle className={st.ringOuter} cx={c} cy={c} r={c - 0.6} pathLength={1} />
      <circle className={st.ringInner} cx={c} cy={c} r={inner / 2 - 0.375} />
    </svg>
  );
}

/* ═════════════ Hero tarkibi — bo‘limda va ochilish sahnasida (nusxa) bir xil chiziladi ═════════════
 * Figma 01: portret medalyoni (halqa 320 — 35,70; punktir 304; surat doirasi 280 — 55,90), katta «55» (130, oltin, 430),
 * ism (Cormorant Medium 40, 590), «55 yillik yubiley» (pushti kursiv, 642), oltin chiziq (80 — 700), sana va vaqt (724).
 * `copy` — ochilish sahnasidagi nusxa: medalyon va «55» o‘rnida sahnaning o‘zgaruvchan elementlari turadi. */
function Portrait({ d, eager }: { d: D; eager?: boolean }) {
  return (
    <div className={st.pCircle}>
      {d.portrait ? (
        <Img src={d.portrait} eager={eager} className={st.pImg} />
      ) : (
        <div className={st.pEmpty}>
          <Img src={`${P}/gul.webp`} eager={eager} className={st.pGul} />
        </div>
      )}
    </div>
  );
}
function HeroBody({ d, copy }: { d: D; copy?: boolean }) {
  return (
    <>
      {!copy && (
        <>
          <div className="absolute" style={{ left: U(35), top: U(70), width: U(320), height: U(320) }}>
            <Rings size={320} inner={304} />
            <div className="absolute" style={{ left: U(20), top: U(20), width: U(280), height: U(280) }}>
              <Portrait d={d} eager />
            </div>
          </div>
          {d.big && (
            <p className={cx(st.cg6, st.bigNum, "absolute inset-x-0 text-center")} style={{ top: U(430), height: U(130), fontSize: U(130), color: GOLD }}>
              {d.big}
            </p>
          )}
        </>
      )}
      <Deco kind="shox" x={-81.11} y={310.14} w={180} h={222} rot={12} px={copy ? undefined : "pz"} className={copy ? st.cDeco : undefined} eager />
      <Deco kind="shox" x={454.59} y={224.89} w={150} h={185} rot={-168} px={copy ? undefined : "pz"} className={copy ? st.cDeco : undefined} eager />
      <div className="relative mx-auto" style={{ width: U(342) }}>
        {d.a && (
          <h1 className={cx(st.cg5, st.cName, "relative")} style={{ color: "#fff" }}>
            <NameLines text={d.a} base={40} max={342} lh={44} two={32} twoLh={38} letters />
          </h1>
        )}
        <p
          className={cx(st.cgi, st.cSub, "relative text-center")}
          style={{
            marginTop: U(d.a ? 8 : 0),
            height: U(29),
            fontSize: U(24),
            lineHeight: `${U(29)}`,
            color: BLUSH,
            whiteSpace: "nowrap",
          }}
        >
          <Fit base={24} max={342} deps={d.ageSub}>
            {d.ageSub}
          </Fit>
        </p>
        <span aria-hidden className={cx(st.hRule, st.cRule)} style={{ marginTop: U(29), marginLeft: U(131), width: U(80), height: U(1) }} />
        {d.heroLine && (
          <p
            className={cx(st.m5, st.cDate, "relative text-center")}
            style={{
              marginTop: U(23),
              height: U(23),
              fontSize: U(17),
              lineHeight: `${U(23)}`,
              color: "#fff",
              whiteSpace: "nowrap",
            }}
          >
            <Fit base={17} max={342} deps={d.heroLine}>
              {d.heroLine}
            </Fit>
          </p>
        )}
      </div>
    </>
  );
}
/** Laptop: hero yon bezaklari (Figma 01 — chapda gul to‘dasi, o‘ngda gul shoxi −15°) */
function HeroSide({ copy }: { copy?: boolean }) {
  return (
    <>
      <Deco kind="gul" x={100} y={500} w={280} op={0.9} unit={C} px={copy ? undefined : "pz"} className={copy ? st.cDeco : undefined} />
      <Deco kind="shox" x={1122.39} y={155.98} w={240} h={296} rot={-15} op={0.9} unit={C} px={copy ? undefined : "pz"} className={copy ? st.cDeco : undefined} />
    </>
  );
}

/* ═════════════ 00 · Ochilish — gul ochiladi (faqat scroll bilan, --o: 0…1) ═════════════
 * Yuklanganda (bosishsiz): gul to‘dasi 0.6 → 1 kattalashib, 8° burilib ochiladi (1.2 s), keyin oltin medalyon halqasi chiziladi,
 * «55» va «yubiley» pastdan chiqadi (Figma «Motion — 28 · Gulshan», 1).
 * Scroll (rAF lerp): gul to‘dasi yuqoriga ko‘tarilib ketadi (0…0.5), laptopda yon shoxlar ikki tomonga chiqib ketadi (0…0.5);
 * «yubiley» so‘nadi (0…0.15); medalyon kattalashib hero portret medalyoni joyiga ko‘tariladi (0.05…0.65), ichki punktir halqa avval
 * yo‘qoladi va oxirida qayta chiziladi; portret doira maska bilan markazdan ochiladi (0.35…0.78); «55» kattalashib medalyon ostidagi
 * o‘rniga tushadi (0.1…0.7); ism harfma-harf, pushti qator, oltin chiziq, sana va hero bezaklari chiqadi (0.6…1).
 * o = 1 da sahna hero (01) bilan aynan bir xil — sahna yashiriladi va ostidagi hero davom etadi (chok ham, «sharpa» ham yo‘q:
 * fon doim bir xil yashil, hech narsa yarim shaffof fon orqasidan ko‘rinmaydi). */
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
    let hidden = false;
    const read = () => {
      const r = el.getBoundingClientRect();
      const stage = (el.firstElementChild as HTMLElement | null)?.offsetHeight || window.innerHeight;
      const D = Math.max(1, r.height - stage);
      target = clamp01(-r.top / D);
    };
    const apply = (o: number) => {
      el.style.setProperty("--o", o.toFixed(4));
      el.style.pointerEvents = o > 0.1 ? "none" : "";
      // oxirgi kadr = hero: sahna yashiriladi, ostidagi hero (aynan shu joyda) ko‘rinadi
      const h = o >= 0.999;
      if (h !== hidden) {
        hidden = h;
        el.style.visibility = h ? "hidden" : "";
      }
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
  // ustun koordinatalari (mobil 390) → sahna; laptopda × 1.2 + 486. XC/YC — kanvas koordinatalari (laptop yon bezaklari)
  const X = (x: number) => `calc(50% + ${U(OX + S * x - W / 2)})`;
  const Y = (y: number) => `calc(100% - ${U(H - S * y)})`;
  const Z = (n: number) => U(S * n);
  const XC = (x: number) => `calc(50% + ${U(x - W / 2)})`;
  const YC = (y: number) => `calc(100% - ${U(H - y)})`;
  return (
    <div ref={wrap} className={cx(st.gateWrap, still && st.still)} style={vars(still ? { "--u": pageU, "--o": 0, height: U(H), marginBottom: 0 } : { "--u": `min(${pageU}, calc(100svh / ${H}))` })}>
      <div className={st.gate} aria-label={t("Taklifnoma")} style={still ? { position: "relative", height: "100%" } : undefined}>
        {/* hero nusxasi (sahifa ustuni birligida, tepaga bog‘langan): ism, qator, chiziq, sana, bezaklar — oxirida chiqadi.
            Hero ostidan keyingi bo‘lim (oq fon, chok ustidagi gul) — baland ekranlarda ham almashuv chocksiz */}
        {!still && (
          <div aria-hidden className={st.copy}>
            {wide && (
              <div className="absolute inset-0" style={{ left: 0, right: 0 }}>
                <HeroSide copy />
              </div>
            )}
            <div className="absolute" style={{ width: PU(390), left: `calc(50% - ${PU(195)})`, top: 0, height: "100%" }}>
              <div className="relative" style={vars({ "--u": "var(--pu)", paddingTop: U(590) })}>
                <HeroBody d={d} copy />
              </div>
              <div className={st.cNext} style={vars({ "--u": "var(--pu)", top: U(960) })} />
              <div className={st.cNextGul} style={vars({ "--u": "var(--pu)", left: U(125), top: U(890), width: U(140), height: U(140) })}>
                <Img src={`${P}/gul.webp`} />
              </div>
            </div>
          </div>
        )}
        {/* laptop: yon gul shoxlari (Figma 00: ±10°, kanvas 84,285 va 1099.8,379.9) — scrollda ikki tomonga chiqib ketadi */}
        {wide && (
          <>
            <div className={st.gSide} style={vars({ left: XC(84.19), top: YC(285.01), width: U(260), height: U(320), "--sx": -1 })}>
              <Deco kind="shox" x={0} y={0} w={260} h={320} rot={10} op={0.9} eager />
            </div>
            <div className={st.gSide} style={vars({ left: XC(1099.76), top: YC(379.86), width: U(260), height: U(320), "--sx": 1 })}>
              <Deco kind="shox" x={0} y={0} w={260} h={320} rot={-10} op={0.9} eager />
            </div>
          </>
        )}
        {/* gul to‘dasi: yuklanganda ochiladi, scrollda yuqoriga ko‘tarilib ketadi */}
        <div className={st.gGul} style={{ left: X(35), top: Y(170), width: Z(320), height: Z(320) }}>
          <div className={st.gGulIn}>
            <Img src={`${P}/gul.webp`} eager />
          </div>
        </div>
        {/* medalyon → hero portret medalyoni (joyi va o‘lchami: sahna birligidan sahifa birligiga) */}
        <div
          className={st.morph}
          style={vars({
            "--ax": X(195),
            "--ay": Y(620),
            "--ad": Z(200),
            "--bx": "50%",
            "--by": PU(230),
            "--bd": PU(320),
          })}
        >
          <svg viewBox="0 0 100 100" className={cx(st.svg, st.mRing)} aria-hidden>
            <circle cx="50" cy="50" r="49.75" pathLength={1} />
          </svg>
          <svg viewBox="0 0 200 200" className={cx(st.svg, st.mInnerA)} aria-hidden>
            <circle cx="100" cy="100" r="91.6" />
          </svg>
          <svg viewBox="0 0 320 320" className={cx(st.svg, st.mInnerB)} aria-hidden>
            <circle cx="160" cy="160" r="151.6" />
          </svg>
          <div className={st.mPhoto}>
            <Portrait d={d} eager />
          </div>
        </div>
        {/* «55» — medalyon ichida; scrollda kattalashib hero’dagi o‘rniga (medalyon ostida) tushadi */}
        {d.big && (
          <p
            className={cx(st.cg6, st.gNum)}
            style={vars({
              "--n0x": X(195),
              "--n0y": Y(600),
              "--n0f": Z(80),
              "--n1x": "50%",
              "--n1y": PU(495),
              "--n1f": PU(130),
              color: GOLD,
            })}
          >
            <span className={st.gNumIn}>{d.big}</span>
          </p>
        )}
        <p
          className={cx(st.cgi, st.gWord, "absolute text-center")}
          style={{
            left: X(95),
            width: Z(200),
            top: Y(650),
            height: Z(27),
            fontSize: Z(22),
            lineHeight: `${Z(27)}`,
            color: "#fff",
            whiteSpace: "nowrap",
          }}
        >
          <span className={cx(st.gIn, "block")} style={vars({ "--gd": "1.75s" })}>
            <Fit base={22 * S} max={170 * S} deps={d.gateWord}>
              {d.gateWord}
            </Fit>
          </span>
        </p>
      </div>
    </div>
  );
}
/* ═════════════ Bo‘lim qobig‘i ═════════════ */
type Bg = "white" | "green";
/** Bo‘lim: to‘liq enli fon + markazda kontent ustuni (mobil 390 birlik; laptopda × 1.2). `outer` — ustundan tashqaridagi bezaklar */
function Sec({
  children,
  z,
  bg,
  colStyle,
  id,
  outer,
  className,
  secRef,
  style,
}: {
  children: ReactNode;
  z: number;
  bg: Bg;
  colStyle?: CSSProperties;
  id?: string;
  outer?: ReactNode;
  className?: string;
  secRef?: React.Ref<HTMLElement>;
  style?: CSSProperties;
}) {
  return (
    <section ref={secRef} id={id} className={cx(st.sec, st[bg], className)} style={{ zIndex: z, ...style }}>
      {outer}
      <div className={st.col} style={{ width: U(390), ...colStyle }}>
        {children}
      </div>
    </section>
  );
}

/** Sarlavha (Cormorant Medium Italic, markazda, 360 da sig‘adi) */
function Title({ text, size = 40, h = 48, color = GREEN, d = 0, style }: { text: string; size?: number; h?: number; color?: string; d?: number; style?: CSSProperties }) {
  return (
    <p
      data-a="up"
      className={cx(st.cgi, "text-center")}
      style={vars({
        height: U(h),
        fontSize: U(size),
        lineHeight: `${U(h)}`,
        color,
        whiteSpace: "nowrap",
        "--d": `${d}s`,
        ...(style as Record<string, string>),
      })}
    >
      <Fit base={size} max={342} deps={text}>
        {text}
      </Fit>
    </p>
  );
}

/** Chok ustidagi gul to‘dasi — bo‘lim tepasida (yarmi oldingi bo‘lim ustida), scroll bilan ±10° aylanadi */
function Seam({ x, y, s }: { x: number; y: number; s: number }) {
  return <Deco kind="gul" x={x} y={y} w={s} a="bloom" px="pr" className={st.seam} />;
}

/* ═════════════ 01 · Hero — portret medalyoni, katta «55», ism, «… yillik yubiley», sana. Ochilish sahnasi shu holatga keladi —
 * bo‘limning o‘zi harakatsiz (sahna yashirilganda aynan shu ko‘rinadi); gul shoxlari 0.85x parallaks ═════════════ */
function Hero({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  return (
    <Sec
      z={z}
      bg="green"
      colStyle={{ paddingTop: U(590), paddingBottom: U(213) }}
      outer={
        <Side wide={wide}>
          <HeroSide />
        </Side>
      }
    >
      <HeroBody d={d} />
    </Sec>
  );
}

/* ═════════════ 02 · Taklif — murojaat (mehmon ismi bilan), matn, «Hurmat bilan,» va imzo (yashil kursiv) ═════════════ */
function Taklif({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const hello = d.guest ? guestHello(t, "Hurmatli {guest}!", d.guest) : t("Aziz mehmonlar!");
  return (
    <Sec
      z={z}
      bg="white"
      colStyle={{ paddingTop: U(120), paddingBottom: U(145) }}
      outer={
        <Side wide={wide}>
          <Deco kind="shox" x={122.28} y={301.62} w={220} h={270} rot={8} op={0.9} unit={C} a="bloom" px="px" />
          <Deco kind="shox" x={1099.86} y={291} w={220} h={270} rot={-8} op={0.9} unit={C} a="bloom" d={0.1} px="px" />
        </Side>
      }
    >
      <Seam x={125} y={-70} s={140} />
      <div data-a="up" className={cx(st.cgi, "relative text-center")} style={vars({ color: GREEN, "--d": "0.05s" })}>
        <NameLines text={hello} base={42} max={342} lh={51} two={32} twoLh={40} />
      </div>
      <p
        data-a="up"
        className={cx(st.m4, "relative mx-auto text-center")}
        style={vars({
          marginTop: U(29),
          width: U(330),
          minHeight: U(145),
          fontSize: U(18),
          lineHeight: `${U(28.8)}`,
          color: INK,
          overflowWrap: "anywhere",
          whiteSpace: "pre-line",
          "--d": "0.12s",
        })}
      >
        {d.message}
      </p>
      {d.signer && (
        <div
          data-a="up"
          className={cx(st.cgi, "relative mx-auto text-center")}
          style={vars({
            marginTop: U(115),
            width: U(342),
            fontSize: U(22),
            lineHeight: `${U(27.5)}`,
            color: GREEN,
            overflowWrap: "anywhere",
            "--d": "0.22s",
          })}
        >
          <p>{t("Hurmat bilan,")}</p>
          <p>{d.signer}</p>
        </div>
      )}
    </Sec>
  );
}

/* ═════════════ 03 · Baxtli lahzalar — galereya: har surat pastdan 40px ko‘tariladi, ichki maska yuqoridan pastga ochiladi
 * (120 ms stagger). Suratlar bo‘lmasa — bo‘lim yo‘qoladi; 1 ta — katta; 2 ta — ikkita ark; 3 ta — Figma ═════════════ */
function Gallery({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const list = d.gallery;
  if (!list.length) return null;
  const big = list.length !== 2 ? list[0] : null;
  const small = list.length === 2 ? list : list.slice(1);
  const photo = (src: string, w: number, h: number, r: number, i: number, wide2?: boolean) => (
    <div data-a="gal" className={st.gal} style={vars({ width: U(w), height: U(h), borderRadius: U(r), "--d": `${0.08 + i * 0.12}s` })}>
      <Img src={src} className={cx(st.galImg, wide2 && st.galImgW)} />
    </div>
  );
  return (
    <Sec
      z={z}
      bg="white"
      colStyle={{ paddingTop: U(40), paddingBottom: U(152) }}
      outer={
        <Side wide={wide}>
          <Deco kind="gul" x={100} y={570} w={260} op={0.9} unit={C} a="bloom" px="px" />
          <Deco kind="gul" x={1080} y={130} w={260} op={0.9} unit={C} a="bloom" d={0.1} px="px" />
        </Side>
      }
    >
      <Title text={t("Baxtli lahzalar")} size={42} h={51} />
      <div className="relative mx-auto" style={{ marginTop: U(29), width: U(342) }}>
        {big && photo(big, 342, 256, 170, 0)}
        {small.length > 0 && (
          <div className="flex" style={{ marginTop: big ? U(16) : 0, gap: U(10) }}>
            {small.map((s, i) => (
              <div key={i}>{photo(s, 166, 236, 83, i + 1, true)}</div>
            ))}
          </div>
        )}
        {/* gul shoxi (Figma: 300,560 — galereya pastidan 68 yuqorida, 20°) */}
        <div className="absolute inset-x-0 bottom-0" style={{ height: 0 }}>
          <Deco kind="shox" x={276} y={-68} w={110} h={136} rot={20} a="bloom" d={0.45} />
        </div>
      </div>
    </Sec>
  );
}

/* ═════════════ 04 · Yubileygacha — taymer: oltin halqalar navbat bilan chiziladi, raqamlar varaqlanadi; kalendarga qo‘shish ═════════════ */
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

function Timer({ d, z }: { d: D; z: number }) {
  const t = useT();
  const units = timerUnits(useLocale());
  const c = useCountdown(d.target);
  const [ref, inView] = useInView<HTMLDivElement>(0.3, true);
  if (!d.hasDate || !c) return null;
  const vals = [c.d, c.h, c.m, c.s];
  return (
    <Sec z={z} bg="green" colStyle={{ height: U(580) }}>
      <Seam x={145} y={-50} s={100} />
      <div className="absolute inset-x-0" style={{ top: U(100) }}>
        <Title text={d.timerTitle} color="#fff" />
      </div>
      <div ref={ref} className="absolute flex" style={{ left: U(24), top: U(190), width: U(339), height: U(78), gap: U(9) }}>
        {vals.map((v, i) => (
          <div key={i} data-a="ring" className="relative" style={vars({ width: U(78), height: U(78), "--d": `${0.1 + i * 0.15}s` })}>
            <svg viewBox="0 0 78 78" className={cx(st.svg, st.tRing)} aria-hidden>
              <circle cx="39" cy="39" r="38.4" pathLength={1} />
            </svg>
            <p
              className={cx(st.cg6, st.tNum, "absolute inset-x-0 text-center")}
              style={vars({
                top: U(14),
                height: U(36),
                fontSize: U(30),
                lineHeight: `${U(36)}`,
                color: "#fff",
                whiteSpace: "nowrap",
                "--d": `${0.3 + i * 0.15}s`,
              })}
            >
              <Fit base={30} max={66} deps={String(vals[0]).length}>
                <Digits value={v} run={inView} len={i === 0 ? Math.max(2, String(vals[0]).length) : 2} i={i} />
              </Fit>
            </p>
            <p
              className={cx(st.m5, st.tNum, "absolute inset-x-0 text-center")}
              style={vars({
                top: U(50),
                height: U(18),
                fontSize: U(13),
                lineHeight: `${U(18)}`,
                color: BLUSH,
                whiteSpace: "nowrap",
                "--d": `${0.35 + i * 0.15}s`,
              })}
            >
              <Fit base={13} max={64} deps={units[i]}>
                {units[i]}
              </Fit>
            </p>
          </div>
        ))}
      </div>
      {d.dateLine && (
        <p
          data-a="up"
          className={cx(st.m5, "absolute inset-x-0 text-center")}
          style={vars({
            top: U(310),
            height: U(23),
            fontSize: U(17),
            lineHeight: `${U(23)}`,
            color: "#fff",
            whiteSpace: "nowrap",
            "--d": "0.25s",
          })}
        >
          <Fit base={17} max={342} deps={d.dateLine}>
            {d.dateLine}
          </Fit>
        </p>
      )}
      <div data-a="up" className="absolute inset-x-0 flex justify-center" style={vars({ top: U(360), "--d": "0.35s" })}>
        <button
          type="button"
          className={cx(st.m7, st.btnWhite)}
          style={{
            minWidth: U(250),
            maxWidth: U(342),
            height: U(56),
            padding: `0 ${U(22)}`,
            fontSize: U(16),
            borderRadius: U(28),
          }}
          onClick={() =>
            downloadIcs({
              title: d.calTitle,
              startLocal: `${d.iso}T${d.time || "18:00"}`,
              location: [d.venueTitle, d.address].filter(Boolean).join(", "),
              slug: "gulshan",
            })
          }
        >
          <Fit base={16} max={298} deps={t("Kalendarga qo‘shish")}>
            {t("Kalendarga qo‘shish")}
          </Fit>
        </button>
      </div>
    </Sec>
  );
}

/* ═════════════ 05 · Kecha dasturi — «tabletka» qatorlar navbat bilan chapdan kiradi (stagger 100 ms) ═════════════ */
function Program({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const items = d.program.slice(0, 8);
  if (!items.length) return null;
  return (
    <Sec
      z={z}
      bg="white"
      colStyle={{ paddingTop: U(90), paddingBottom: U(76) }}
      outer={
        <Side wide={wide}>
          <Deco kind="shox" x={112.28} y={261.62} w={220} h={270} rot={8} op={0.9} unit={C} a="bloom" px="px" />
          <Deco kind="shox" x={1109.86} y={251} w={220} h={270} rot={-8} op={0.9} unit={C} a="bloom" d={0.1} px="px" />
        </Side>
      }
    >
      <Title text={t("Kecha dasturi")} />
      <div className="relative mx-auto flex flex-col" style={{ marginTop: U(38), width: U(342), gap: U(16) }}>
        {items.map((it, i) => (
          <div
            key={i}
            data-a="left"
            className={cx(st.pRow, "relative flex items-start")}
            style={vars({
              minHeight: U(80),
              padding: `${U(22)} ${U(22)} ${U(22)} ${U(25)}`,
              borderWidth: U(1),
              borderRadius: U(40),
              "--d": `${0.1 + i * 0.1}s`,
            })}
          >
            <p
              className={cx(st.cg6, st.ptime)}
              style={{
                width: U(94),
                height: U(34),
                fontSize: U(28),
                lineHeight: `${U(34)}`,
                color: GREEN,
              }}
            >
              <Fit base={28} max={86} deps={it.time}>
                {it.time}
              </Fit>
            </p>
            <p
              className={cx(st.m5, st.clamp2, "min-w-0 flex-1 self-start")}
              style={{
                marginTop: U(6),
                fontSize: U(16),
                lineHeight: `${U(22)}`,
                color: INK,
              }}
            >
              {it.title}
            </p>
          </div>
        ))}
      </div>
    </Sec>
  );
}

/* ═════════════ 06 · Manzil — surat (mijozning 5-surati; bo‘lmasa — bayram zali) sekin 1.05 → 1, joy nomi, manzil, xarita va yo‘nalish ═════════════ */
function Venue({ d, z, linkable }: { d: D; z: number; linkable: boolean }) {
  const t = useT();
  if (!d.hasPlace) return null;
  const btn = (s: string) => (
    <Fit base={16} max={140} deps={s}>
      {s}
    </Fit>
  );
  return (
    <Sec z={z} bg="green" colStyle={{ paddingTop: U(90), paddingBottom: U(104) }}>
      <Title text={t("Manzil")} color="#fff" />
      <div
        data-a="zoom"
        className="relative mx-auto overflow-hidden"
        style={vars({
          marginTop: U(28),
          width: U(342),
          height: U(228),
          borderRadius: U(24),
          background: "#093528",
          "--d": "0.1s",
        })}
      >
        <Img src={d.hall} className={st.zoomImg} />
      </div>
      {d.venueTitle && (
        <p
          data-a="up"
          className={cx(st.cg5, "mx-auto text-center")}
          style={vars({
            marginTop: U(26),
            width: U(342),
            minHeight: U(36),
            fontSize: U(30),
            lineHeight: `${U(36)}`,
            color: "#fff",
            overflowWrap: "anywhere",
            textWrap: "balance",
            "--d": "0.15s",
          })}
        >
          {d.venueTitle}
        </p>
      )}
      {d.address && (
        <p
          data-a="up"
          className={cx(st.m4, "mx-auto text-center")}
          style={vars({
            marginTop: U(10),
            width: U(330),
            minHeight: U(48),
            fontSize: U(16),
            lineHeight: `${U(24)}`,
            color: "rgba(255,255,255,.85)",
            overflowWrap: "anywhere",
            "--d": "0.22s",
          })}
        >
          {d.address}
        </p>
      )}
      <div
        data-a="up"
        className="relative mx-auto flex"
        style={vars({
          marginTop: U(46),
          width: U(342),
          gap: U(12),
          "--d": "0.3s",
        })}
      >
        <a
          href={linkable ? d.mapUrl : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(st.m7, st.btnWhite)}
          style={{
            flex: "1 1 0",
            minWidth: 0,
            height: U(56),
            padding: `0 ${U(10)}`,
            fontSize: U(16),
            borderRadius: U(28),
          }}
        >
          {btn(t("Xaritada ochish"))}
        </a>
        <a
          href={linkable ? d.taxi : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(st.m7, st.btnLine)}
          style={{
            flex: "1 1 0",
            minWidth: 0,
            height: U(56),
            padding: `0 ${U(10)}`,
            fontSize: U(16),
            borderWidth: U(1.2),
            borderRadius: U(28),
          }}
        >
          {btn(t("Yo‘nalish"))}
        </a>
      </div>
    </Sec>
  );
}

/* ═════════════ 07 · Dress-kod (ixtiyoriy — o‘chirilsa joy qolmaydi): oq «tabletka» — turi (yashil kursiv) va izoh ═════════════ */
function Dress({ d, z }: { d: D; z: number }) {
  if (!d.dressNote && !d.dressTitle) return null;
  return (
    <Sec z={z} bg="green" colStyle={{ paddingTop: U(30), paddingBottom: U(76) }}>
      <div
        data-a="rise"
        className={cx(st.dressCard, "relative mx-auto flex flex-col items-center text-center")}
        style={{
          width: U(342),
          minHeight: U(142),
          padding: `${U(30)} ${U(44)}`,
          gap: U(10),
          // Figma: 170 (342×194 kartada 97 ga qisqaradi — «tabletka»); uzun izohda ham burchaklar matnga tegmaydi
          borderRadius: U(97),
          justifyContent: "center",
        }}
      >
        {d.dressTitle && (
          <p
            className={st.cgi}
            style={{
              height: U(46),
              fontSize: U(38),
              lineHeight: `${U(46)}`,
              color: GREEN,
              whiteSpace: "nowrap",
            }}
          >
            <Fit base={38} max={254} deps={d.dressTitle}>
              {d.dressTitle}
            </Fit>
          </p>
        )}
        {d.dressNote && (
          <p
            className={st.m4}
            style={{
              width: "100%",
              fontSize: U(17),
              lineHeight: 1.5,
              color: INK,
              overflowWrap: "anywhere",
            }}
          >
            {d.dressNote}
          </p>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 08 · Anketa — javob («Kelaman» bosilsa tugma yashil bilan to‘ladi va kichik gul barglari sochiladi) ═════════════ */
const PETALS = [
  [-1, -0.9, -40],
  [-0.55, -1.25, 25],
  [0.1, -1.35, -15],
  [0.65, -1.15, 40],
  [1.05, -0.7, -30],
  [-0.95, 0.35, 55],
  [0.95, 0.4, -50],
] as const;
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
  const [burst, setBurst] = useState(0);
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
        body: JSON.stringify({
          name: name.trim(),
          status,
          count: status === "coming" ? count : 0,
          wish: wish.trim() || null,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        editToken?: string;
      };
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
    <p
      className={cx(st.m6, st.lbl)}
      style={{
        marginTop: U(mt),
        height: U(19),
        fontSize: U(14),
        lineHeight: `${U(19)}`,
      }}
    >
      {s}
    </p>
  );
  const sub = d.rsvpUntil ? t("Iltimos, {date} javob bering", { date: d.rsvpUntil }) : t(d.we ? "Javobingizni kutamiz" : "Javobingizni kutaman");
  const pick = (s: RsvpStatus) => {
    setStatus(s);
    if (s === "coming") setBurst((n) => n + 1);
  };
  return (
    <Sec z={z} bg="white" id="gulshan-javob" colStyle={{ paddingTop: U(100), paddingBottom: U(50) }}>
      <Seam x={145} y={-50} s={100} />
      <h2
        data-a="up"
        className={cx(st.cgi, "mx-auto text-center")}
        style={vars({
          width: U(342),
          fontSize: U(42),
          lineHeight: `${U(51)}`,
          color: GREEN,
          overflowWrap: "anywhere",
          "--d": "0.05s",
        })}
      >
        {t("Kelasizmi?")}
      </h2>
      <p
        data-a="up"
        className={cx(st.m4, "mx-auto text-center")}
        style={vars({
          marginTop: U(11),
          width: U(342),
          minHeight: U(22),
          fontSize: U(16),
          lineHeight: `${U(22)}`,
          color: MUTED,
          overflowWrap: "anywhere",
          "--d": "0.12s",
        })}
      >
        {sub}
      </p>
      <div
        data-a="rise"
        className={cx(st.card, "relative mx-auto")}
        style={vars({
          marginTop: U(26),
          width: U(342),
          padding: `${U(24)} ${U(22)} ${U(58)}`,
          borderRadius: U(28),
          "--d": "0.2s",
        })}
      >
        {sent ? (
          <div
            key="thanks"
            className={cx(st.thanks, "relative flex flex-col items-center text-center")}
            style={{
              padding: `${U(40)} ${U(6)} ${U(10)}`,
              gap: U(16),
              minHeight: U(480),
            }}
          >
            <div className="relative" style={{ width: U(120), height: U(120) }}>
              <Img src={`${P}/gul.webp`} className={st.thanksGul} />
            </div>
            <p
              className={st.cgi}
              style={{
                fontSize: U(sent === "not_coming" ? 36 : 30),
                lineHeight: 1.25,
                color: GREEN,
                overflowWrap: "anywhere",
              }}
            >
              {sent === "not_coming" ? t("Rahmat!") : t("Rahmat! Joyingiz band qilindi")}
            </p>
            <p
              className={st.m4}
              style={{
                fontSize: U(17),
                color: MUTED,
                lineHeight: 1.5,
                overflowWrap: "anywhere",
              }}
            >
              {sent === "not_coming"
                ? t("Javobingiz uchun rahmat!")
                : t("{name} — {count} kishi. Javobingiz yetkazildi.", {
                    name: name.trim() || t("Javobingiz"),
                    count,
                  })}
            </p>
            <button
              type="button"
              onClick={() => setSent(null)}
              className={st.m6}
              style={{
                fontSize: U(16),
                color: GREEN,
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              {t("Javobni o‘zgartirish")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="relative flex flex-col items-stretch">
            {label(t("Ismingiz"), 0)}
            <label
              className={st.field}
              style={{
                marginTop: U(5),
                height: U(54),
                padding: `0 ${U(16)}`,
                borderRadius: U(16),
              }}
            >
              <input
                className={cx(st.m4, st.input)}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder={t("Ism va familiya")}
                aria-label={t("Ismingiz")}
                style={{ fontSize: U(17), lineHeight: `${U(23)}` }}
              />
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
                  className={cx(st.m7, st.choice)}
                  style={{
                    flex: "1 1 0",
                    padding: `${U(4)} ${U(6)}`,
                    minHeight: U(54),
                    fontSize: U(16),
                    borderWidth: U(1.2),
                    borderRadius: U(27),
                  }}
                >
                  <span style={{ overflowWrap: "anywhere" }}>{t(l)}</span>
                  {s === "coming" && burst > 0 && (
                    <span key={burst} aria-hidden className={st.petals}>
                      {PETALS.map(([px, py, r], i) => (
                        <span key={i} className={st.petal} style={vars({ "--px": px, "--py": py, "--pr": `${r}deg`, "--pd": `${i * 0.03}s` })} />
                      ))}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {status === "coming" && (
              <>
                {label(t("Necha kishi bo‘lasiz?"), 22)}
                <div
                  className={cx(st.counter, "justify-between")}
                  style={{
                    marginTop: U(5),
                    height: U(54),
                    padding: `0 ${U(8)}`,
                    borderRadius: U(27),
                  }}
                >
                  <button
                    type="button"
                    className={cx(st.m7, st.step)}
                    disabled={count <= 1}
                    onClick={() => setCount((n) => Math.max(1, n - 1))}
                    aria-label={t("Kamaytirish")}
                    style={{ width: U(40), height: U(40), fontSize: U(22) }}
                  >
                    −
                  </button>
                  <span className={st.cg6} style={{ fontSize: U(28), lineHeight: 1.2, color: INK }} aria-live="polite">
                    {count}
                  </span>
                  <button
                    type="button"
                    className={cx(st.m7, st.step)}
                    disabled={count >= 20}
                    onClick={() => setCount((n) => Math.min(20, n + 1))}
                    aria-label={t("Ko‘paytirish")}
                    style={{ width: U(40), height: U(40), fontSize: U(22) }}
                  >
                    +
                  </button>
                </div>
              </>
            )}
            {label(t("Tabrik va tilaklaringiz"), 24)}
            <label
              className={st.field}
              style={{
                marginTop: U(5),
                height: U(130),
                padding: U(16),
                borderRadius: U(16),
                alignItems: "stretch",
              }}
            >
              <textarea
                className={cx(st.m4, st.input)}
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                maxLength={500}
                placeholder={t("Yozing…")}
                aria-label={t("Tabrik va tilaklaringiz")}
                style={{
                  fontSize: U(17),
                  lineHeight: `${U(23)}`,
                  height: "100%",
                }}
              />
            </label>
            {err && (
              <p className={st.m4} style={{ marginTop: U(12), color: "#c2410c", fontSize: U(15) }}>
                {err}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className={cx(st.m7, st.submit)}
              style={{
                marginTop: U(26),
                minHeight: U(56),
                padding: `${U(8)} ${U(12)}`,
                fontSize: U(16),
                borderRadius: U(28),
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? t("Yuborilmoqda…") : t("Yuborish")}
            </button>
          </form>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 09 · Final — gul to‘dasi ochiladi (0.6 → 1, 8° → 0), «Sizni kutamiz!», kichik medalyon halqasi chiziladi va «55»,
 * oila nomi (scroll bilan: --fc 0 … 1 = Figma kadri; sahifa oxirigacha albatta tugaydi) ═════════════ */
function Final({ d, z, wide, still, onSeen }: { d: D; z: number; wide: boolean; still: boolean; onSeen: () => void }) {
  const t = useT();
  const ref = useRef<HTMLElement>(null);
  const onP = useCallback(
    (_p: number, r: DOMRect) => {
      const el = ref.current;
      if (!el) return;
      const vh = window.innerHeight || 800;
      // bo‘lim pasti ekran pastiga yetganda (yoki sahifa oxirida) tugaydi, 0.9 ekran oldin boshlanadi
      const y = window.scrollY;
      const top = r.top + y;
      const max = document.documentElement.scrollHeight - vh;
      const s1 = Math.max(1, Math.min(top + r.height - vh, max));
      const s0 = s1 - vh * 0.9;
      const f = seg(y, s0, s1);
      el.style.setProperty("--fc", f.toFixed(4));
      if (f > 0.5) onSeen();
    },
    [onSeen],
  );
  useScrollProgress(ref, onP, !still);
  const title = t(d.we ? "Sizni kutamiz!" : "Sizni kutaman!");
  return (
    <Sec
      secRef={ref}
      z={z}
      bg="green"
      className={st.finalWrap}
      style={still ? vars({ "--fc": 1 }) : undefined}
      colStyle={{ height: U(820) }}
      outer={
        <Side wide={wide}>
          <div className={st.fSide} style={vars({ "--fk": 0 })}>
            <Deco kind="gul" x={80} y={330} w={300} op={0.9} unit={C} />
          </div>
          <div className={st.fSide} style={vars({ "--fk": 1 })}>
            <Deco kind="gul" x={1060} y={410} w={300} op={0.9} unit={C} />
          </div>
        </Side>
      }
    >
      <div className={st.fGul} style={{ left: U(35), top: U(90), width: U(320), height: U(320) }}>
        <Img src={`${P}/gul.webp`} />
      </div>
      <p
        className={cx(st.cgi, st.fUp, "absolute inset-x-0 text-center")}
        style={vars({
          top: U(450),
          height: U(56),
          fontSize: U(46),
          lineHeight: `${U(56)}`,
          color: "#fff",
          whiteSpace: "nowrap",
          "--fk": 0,
        })}
      >
        <Fit base={46} max={342} deps={title}>
          {title}
        </Fit>
      </p>
      <div className="absolute" style={{ left: U(145), top: U(540), width: U(100), height: U(100) }}>
        <Rings size={100} inner={84} className={st.fRings} />
        {d.big && (
          <p
            className={cx(st.cg6, st.fUp, "absolute inset-x-0 text-center")}
            style={vars({ top: U(26), height: U(48), fontSize: U(40), lineHeight: `${U(48)}`, color: GOLD, whiteSpace: "nowrap", "--fk": 1 })}
          >
            <Fit base={40} max={76} deps={d.big}>
              {d.big}
            </Fit>
          </p>
        )}
      </div>
      {d.family && (
        <p
          className={cx(st.m5, st.fUp, "absolute inset-x-0 text-center")}
          style={vars({
            top: U(700),
            height: U(22),
            fontSize: U(16),
            lineHeight: `${U(22)}`,
            color: BLUSH,
            whiteSpace: "nowrap",
            "--fk": 2,
          })}
        >
          <Fit base={16} max={342} deps={d.family}>
            {d.family}
          </Fit>
        </p>
      )}
    </Sec>
  );
}

/* ═════════════ Musiqa tugmasi — Figma «Gulshan / Musiqa tugmasi»: oq doira (52), oltin hoshiya 1.5, 4 ta yashil chiziq beatga mos;
 * o‘chirilgan — chiziqlar kalta (4 px) ═════════════ */
const BARS = [10, 18, 13, 20];
function GulshanMusic({ m, wide, embedded }: { m: ReturnType<typeof useMusic>; wide: boolean; embedded: boolean }) {
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
type Key = "hero" | "taklif" | "gallery" | "timer" | "program" | "venue" | "dress" | "rsvp" | "final";

export function GulshanSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const loaded = usePreload([`${P}/gul.webp`, d.portrait, wide ? `${P}/shox.webp` : ""].filter(Boolean), [`${P}/shox.webp`, ...d.gallery, d.hall].filter(Boolean), withGate, wide ? "l" : "m");
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

  const shown: Key[] = (["hero", "taklif", "gallery", "timer", "program", "venue", "dress", "rsvp", "final"] as Key[]).filter((k) =>
    k === "gallery"
      ? d.gallery.length > 0
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
      <div className={st.page} style={vars({ "--u": colU, "--pu": colU })}>
        <GulshanMusic m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/muhr.svg`} />}
        <div className={st.flow}>
          {withGate && (loaded ? <Gate d={d} wide={wide} onStart={() => music.play(true)} /> : <div className={st.gateHold} />)}
          {embedded && <Gate d={d} wide={wide} still onStart={() => {}} />}
          <Hero d={d} z={z("hero")} wide={wide} />
          <Taklif d={d} z={z("taklif")} wide={wide} />
          <Gallery d={d} z={z("gallery")} wide={wide} />
          <Timer d={d} z={z("timer")} />
          <Program d={d} z={z("program")} wide={wide} />
          <Venue d={d} z={z("venue")} linkable={linkable} />
          <Dress d={d} z={z("dress")} />
          {data.rsvpEnabled && <Rsvp d={d} slug={data.slug} mode={mode} z={z("rsvp")} />}
          <Final d={d} z={z("final")} wide={wide} still={embedded} onSeen={onFinal} />
        </div>
        <footer className={cx(st.footer, "flex items-start justify-center")} style={{ height: U(120), paddingTop: U(50) }}>
          <p
            className={cx(st.m5, "text-center")}
            style={{
              fontSize: U(14),
              lineHeight: `${U(19)}`,
              color: "rgba(255,255,255,.55)",
            }}
          >
            <a href="https://shohnoma.uz">{t("shohnoma.uz orqali yaratilgan")}</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
