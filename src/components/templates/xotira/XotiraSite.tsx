"use client";

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
import { DRESS_TEXT, MSG, MSG_DEMO, P, SUB_DEMO, XOTIRA_DEMO, XOTIRA_DEMO_EN, XOTIRA_DEMO_RU, type LifeItem, type XotiraItem } from "./data";
import st from "./xotira.module.css";

/* ── Birliklar ──
 * U — joriy `--u`. Bo‘limlarda — kontent ustuni (Figma mobil 390 koordinatalari; laptopda ustun = mobil × 1.2, ya’ni 468px / 1440 —
 * Figma «Kontent ustuni (mobil ×1.2)»). C — laptop kanvasi (1440) birligi: yon muhrlar.
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

/* Ranglar (Figma «27 · Xotira — Assets») */
const BORDO = "#5A1E2A";
const INK = "#1F1C1C";
const MUTED = "#736E6E";

/* ═════════════ Yosh ═════════════ */
/** «70» → 70 (1…120); bo‘lmasa 0 */
function parseAge(raw: string) {
  const n = Math.round(Number(String(raw).replace(/[^\d.]/g, "")));
  return raw.trim() && Number.isFinite(n) && n >= 1 && n <= 120 ? n : 0;
}
/** Yubiley — 20 dan katta va 5 ga karrali yosh (25, 30, …, 70, 75 …): «yubiley» so‘zi; aks holda — «tug‘ilgan kun» */
const isJubilee = (n: number) => n >= 20 && n % 5 === 0;

/** Server yaratadigan standart taklif matni (php/api/lib/orders.php DEFAULT_MESSAGE) — har qaysi tilda */
const SERVER_DEFAULT = "Aziz mehmonlar! Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.";
const isServerDefault = (m: string) => (["uz", "ru", "en"] as Locale[]).some((l) => tr(l, SERVER_DEFAULT).trim() === m.trim());

type Row = { year: string; text: string; src: string };

function useData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO = lang === "ru" ? XOTIRA_DEMO_RU : lang === "en" ? XOTIRA_DEMO_EN : XOTIRA_DEMO;
  const ex = (data.extra ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof ex[k] === "string" ? (ex[k] as string).trim() : typeof ex[k] === "number" ? String(ex[k]) : "");
  const sd = splitDate(data.date);
  const guest = useGuestName();
  return useMemo(() => {
    const cw = calendarWords(lang);
    const exProgram = Array.isArray(ex.program) ? (ex.program as XotiraItem[]).filter((p) => p?.time && p?.title) : [];
    const exLife = Array.isArray(ex.life)
      ? (ex.life as LifeItem[])
          .map((x) => ({
            year: String(x?.year ?? "").trim(),
            text: String(x?.text ?? "").trim(),
          }))
          .filter((x) => x.year || x.text)
      : [];
    const photos = (data.photos ?? []).filter(Boolean) as string[];
    const raw = (data.photos ?? []) as (string | null | undefined)[];
    const date = sd ? new Date(`${sd.iso}T12:00:00Z`) : null;
    // namunadagi ism tarjima qilinadi (mijoz ma’lumoti — o‘zgarishsiz)
    const a = ((demo ? t(data.personA) : data.personA) || "").trim();
    // taklif qiluvchi (ixtiyoriy: masalan, «Yusupovlar oilasi»): bo‘lsa — matnlar «biz» nomidan; bo‘lmasa — yubilyarning o‘zi nomidan
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
    const program = (demo ? DEMO.program : exProgram.length ? exProgram : ((data.program ?? []) as XotiraItem[])) as XotiraItem[];
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
    // namunada javob muddati — Figma’dagidek sanadan 7 kun oldin («15-martgacha» — 22-mart uchun)
    const deadline = demo && sd ? new Date(Date.UTC(year, m, day - 7)).toISOString().slice(0, 10) : data.rsvpDeadline;
    const wd = date ? cw.weekday[date.getUTCDay()] : "";
    // «22-mart» / «22 марта» / «22 March»
    const dayMonth = date ? (lang === "uz" ? `${day}-${cw.monthsAfterDay[m]}` : `${day} ${cw.monthsAfterDay[m]}`) : "";
    // hero: «22-mart, dushanba» / «22 марта, понедельник» / «Monday, 22 March»
    const heroDay = date ? (lang === "en" ? `${wd}, ${dayMonth}` : `${dayMonth}, ${wd.toLocaleLowerCase(lang)}`) : "";
    // Suratlar (PHOTO_SLOTS.xotira): 0 — portret, 1–4 — «Yillar» (tartib bo‘yicha), 5 — «Manzil», 6 — final (katta oila).
    // Bo‘sh slot: portret — kulrang panel; yillar — suratsiz qator; manzil — shablonning bayram zali; final — suratsiz kompozitsiya
    const slot = (i: number) => (demo ? "" : (raw[i] as string) || "");
    const lifeList = (demo ? DEMO.life : exLife).slice(0, 4);
    const yearSrc = demo ? [`${P}/yil1.webp`, `${P}/yil2.webp`, `${P}/yil3.webp`, `${P}/yil4.webp`] : [slot(1), slot(2), slot(3), slot(4)];
    const n = Math.max(
      lifeList.length,
      yearSrc.reduce((k, s, i) => (s ? i + 1 : k), 0),
    );
    const rows: Row[] = Array.from({ length: n }, (_, i) => ({
      year: lifeList[i]?.year ?? "",
      text: lifeList[i]?.text ?? "",
      src: yearSrc[i] || "",
    }));
    // ochilishdagi taxlam (pastdan yuqoriga): mijozning «Yillar» suratlari (bo‘lmasa — oila surati, portret); qolgani — bo‘sh surat qog‘ozi (yili bilan)
    const pool = demo ? yearSrc.slice(0, 3) : [...yearSrc, slot(6), slot(0)].filter(Boolean).slice(0, 3);
    // suratlar yuqoridagi o‘rinlarga (eng ko‘rinadigan), xronologik tartibda; bo‘sh qog‘ozlar — pastda
    const stack = [0, 1, 2].map((i) => ({ src: pool[i - (3 - pool.length)] || "", year: lifeList[i]?.year ?? "" }));
    return {
      a,
      we,
      host,
      age,
      jub,
      /** katta bordo raqam: yosh, bo‘lmasa — ismning birinchi harfi */
      big: age ? String(age) : mono,
      /** ochilishdagi raqam ostidagi so‘z */
      gateWord: t(jub ? "xotira::yillik yubiley" : age ? "xotira::yoshlik tug‘ilgan kun" : "xotira::tug‘ilgan kun"),
      /** hero: «Onamizning 70 yillik yubileyi» (namuna) / «70 yillik yubiley» / «7 yoshlik tug‘ilgan kun» / «Tug‘ilgan kun» */
      ageSub: demo ? t(SUB_DEMO, av) : t(jub ? "{age} yillik yubiley" : age ? "{age} yoshlik tug‘ilgan kun" : "Tug‘ilgan kun", av),
      heroDay,
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
      rows,
      stack,
      dressTitle: DRESS_TEXT[code] || str("dressCode") ? t(code) : "",
      dressNote,
      portrait: demo ? `${P}/portret.webp` : slot(0) || "",
      hall: slot(5) || `${P}/zal.webp`,
      fam: demo ? `${P}/oila.webp` : slot(6) || "",
      photos,
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

/** «Yillar» suratlari — rom ichida yengil parallaks (0.9x: `--py`, ±12px) va yon muhrlar (±24px). Faqat `translate`. */
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
        const k = +(x.dataset.pk || 0.05);
        const mx = +(x.dataset.pm || 12);
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
  align = "center",
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
  align?: "center" | "left";
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
    <div className={className} style={{ textAlign: align, ...style }}>
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

/* ═════════════ «70» muhri (Figma «Xotira / 70 muhr», 96×96): bordo doira, oq punktir halqa, ichida yosh (Spectral Light Italic) ═════════════ */
function Seal({ text, size = 96, className, style, stamp, unit = U }: { text: string; size?: number; className?: string; style?: CSSProperties; stamp?: boolean; unit?: (n: number) => string }) {
  return (
    <div aria-hidden className={cx(st.seal, stamp && st.stamp, className)} style={{ width: unit(size), height: unit(size), ...style }}>
      <svg viewBox="0 0 96 96" className={st.svg}>
        <circle cx="48" cy="48" r="48" fill={BORDO} />
        <circle cx="48" cy="48" r="41.6" fill="none" stroke="rgba(255,255,255,.72)" strokeWidth="0.8" strokeDasharray="2.6 2.4" />
      </svg>
      {text && (
        <p
          className={cx(st.sli, "absolute inset-0 flex items-center justify-center")}
          style={{
            fontSize: unit(size * 0.4167),
            lineHeight: 1,
            color: "#fff",
            whiteSpace: "nowrap",
          }}
        >
          <Fit base={size * 0.4167} max={size * 0.66} unit={unit} deps={`${text}|${size}`} style={{ paddingTop: "0.06em" }}>
            {text}
          </Fit>
        </p>
      )}
    </div>
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

/* ═════════════ Hero tarkibi — bo‘limda va ochilish sahnasida (nusxa) bir xil chiziladi ═════════════
 * Figma: portret 342×440 (24, 40), katta «70» (o‘ngda, portret ustida), ism (Spectral Regular, chapda), «… yillik yubiley» (bordo),
 * chiziq, sana va vaqt. `copy` — ochilish sahnasidagi nusxa: portret va «70» o‘rnida sahnaning o‘zgaruvchan elementlari turadi. */
function Portrait({ d }: { d: D }) {
  return (
    <div className={st.pFrame}>
      {d.portrait ? (
        <Img src={d.portrait} eager className={st.pImg} />
      ) : (
        <div className={st.pEmpty}>
          <svg viewBox="0 0 96 96" className={st.pRing} aria-hidden>
            <circle cx="48" cy="48" r="46" fill="none" stroke={BORDO} strokeOpacity=".35" strokeWidth="0.6" strokeDasharray="2.6 2.4" />
          </svg>
        </div>
      )}
    </div>
  );
}
function BigNum({ d }: { d: D }) {
  if (!d.big) return null;
  return (
    <p
      className={cx(st.sli, "absolute")}
      style={{
        right: 0,
        top: U(400),
        height: U(200),
        fontSize: U(200),
        lineHeight: 1,
        color: BORDO,
        whiteSpace: "nowrap",
        letterSpacing: "-0.04em",
      }}
    >
      {d.big}
    </p>
  );
}
function HeroBody({ d, copy, wide }: { d: D; copy?: boolean; wide: boolean }) {
  return (
    <>
      {!copy && (
        <div className="absolute" style={{ left: U(24), top: U(40), width: U(342), height: U(440) }}>
          <Portrait d={d} />
        </div>
      )}
      {!copy && <BigNum d={d} />}
      <div className="relative" style={{ marginLeft: U(24), width: U(342) }}>
        {d.a && (
          <h1 className={cx(st.sr, st.cName, "relative")} style={{ color: INK }}>
            <NameLines text={d.a} base={38} max={342} lh={42} two={30} twoLh={34} letters align="left" />
          </h1>
        )}
        <p
          className={cx(st.g5, st.cSub, "relative")}
          style={{
            marginTop: U(d.a ? 10 : 0),
            height: U(22),
            fontSize: U(18),
            lineHeight: `${U(22)}`,
            color: BORDO,
            whiteSpace: "nowrap",
          }}
        >
          <Fit base={18} max={342} deps={d.ageSub}>
            {d.ageSub}
          </Fit>
        </p>
        <span aria-hidden className={cx(st.hRule, st.cRule)} style={{ marginTop: U(30), width: U(342), height: U(1) }} />
        {(d.heroDay || d.time) && (
          <div
            className={cx(st.g6, st.cDate, "relative flex items-start justify-between")}
            style={{
              marginTop: U(21),
              height: U(20),
              fontSize: U(17),
              lineHeight: `${U(20)}`,
              color: INK,
            }}
          >
            <span className="whitespace-nowrap">
              <Fit base={17} max={d.time ? 230 : 342} deps={d.heroDay}>
                {d.heroDay}
              </Fit>
            </span>
            {d.time && <span className="whitespace-nowrap">{d.time}</span>}
          </div>
        )}
      </div>
      {copy && wide && (
        <div className={cx(st.cSide, "absolute")} style={{ left: `calc(${C(1100)} - 50cqw + ${PU(195)})`, top: C(700) }}>
          <Seal text={d.big} size={130} unit={C} />
        </div>
      )}
    </>
  );
}

/* ═════════════ 00 · Ochilish — suratlar taxlami (faqat scroll bilan, --o: 0…1) ═════════════
 * Yuklanganda (bosishsiz): kulrang fonda eski suratlar birin-ketin «tashlanadi» va taxlam bo‘ladi (y −40 → 0, ±3° → 0, stagger 0.25 s,
 * yumshoq spring), keyin «70» chapdan o‘ngga yoziladi va «yillik yubiley» chiqadi.
 * Scroll (rAF lerp): pastki ikki surat ikki tomonga uchib ketadi (0…0.5), «yillik yubiley» so‘nadi (0…0.2); yuqoridagi surat oq
 * hoshiyasini yo‘qotib kattalashadi va hero portreti joyiga keladi (0.08…0.78), ichida portret pastdan ochiladi (0.3…0.62);
 * «70» kattalashib portretning o‘ng pastiga suriladi (0.15…0.85); fon kulrangdan oqqa (0.35…0.8); ism harfma-harf, qator, chiziq
 * va sana chiqadi (0.62…1). o = 1 da sahna hero (01) bilan aynan bir xil — sahna yashiriladi va ostidagi hero davom etadi
 * (chok ham, «sharpa» ham yo‘q: o‘tishda hech narsa yarim shaffof fon orqasidan ko‘rinmaydi). */
const GATE = {
  m: { W: 390, H: 844, S: 1, OX: 0, FX: 340 },
  l: { W: 1440, H: 1013, S: 1.2, OX: 486, FX: 800 },
} as const;
/** taxlam (Figma 00): pastdan yuqoriga; `f` — scrollda uchib ketish yo‘nalishi, `r` — yuklanishdagi burilish */
const STACK = [
  { x: 40, y: 200, f: [-1, -0.45, -14], r: -3 },
  { x: 100, y: 290, f: [1, -0.25, 12], r: 3 },
  { x: 60, y: 380, f: [0, 0, 0], r: -2 },
] as const;

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
  const { W, H, S, OX, FX } = G;
  const pageU = wide ? CANVAS_L : COL_M;
  // ustun koordinatalari (mobil 390) → sahna; laptopda × 1.2 + 486
  const X = (x: number) => `calc(50% + ${U(OX + S * x - W / 2)})`;
  const Y = (y: number) => `calc(100% - ${U(H - S * y)})`;
  const Z = (n: number) => U(S * n);
  return (
    <div ref={wrap} className={cx(st.gateWrap, still && st.still)} style={vars(still ? { "--u": pageU, "--o": 0, height: U(H), marginBottom: 0 } : { "--u": `min(${pageU}, calc(100svh / ${H}))` })}>
      <div className={st.gate} aria-label={t("Taklifnoma")} style={still ? { position: "relative", height: "100%" } : undefined}>
        <div aria-hidden className={st.gWhite} />
        <div aria-hidden className={st.gBg} />
        {/* hero nusxasi (sahifa ustuni birligida, tepaga bog‘langan): ism, qator, chiziq, sana — oxirida chiqadi */}
        {!still && (
          <div aria-hidden className={st.copy} style={{ width: PU(390), left: `calc(50% - ${PU(195)})` }}>
            <div className="relative" style={vars({ "--u": "var(--pu)", paddingTop: U(620) })}>
              <HeroBody d={d} copy wide={wide} />
            </div>
          </div>
        )}
        {/* suratlar taxlami: pastdagi ikkitasi uchib ketadi, yuqoridagisi — portretga aylanadi */}
        {STACK.map((s, i) => {
          const ph = d.stack[i];
          const top = i === 2;
          const frame = (
            <div className={cx(st.sFrame, top && st.sFrameTop)} style={vars({ "--pad": Z(8), borderRadius: Z(2) })}>
              <div className={st.sIn}>
                {ph.src ? (
                  <Img src={ph.src} eager className={st.sImg} />
                ) : (
                  <div className={cx(st.sBlank, !top && st.sBlankUp)}>
                    {ph.year && (
                      <span className={st.sli} style={{ fontSize: Z(34), color: BORDO, opacity: 0.4 }}>
                        {ph.year}
                      </span>
                    )}
                  </div>
                )}
                {top && (
                  <div className={st.sPortrait}>
                    <div className={st.sPortraitIn}>
                      <Portrait d={d} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
          return top ? (
            <div
              key={i}
              className={st.morph}
              style={vars({
                "--ax": X(s.x),
                "--ay": Y(s.y),
                "--aw": Z(250),
                "--ah": Z(175),
                "--bx": `calc(50% + ${PU(24 - 195)})`,
                "--by": PU(40),
                "--bw": PU(342),
                "--bh": PU(440),
              })}
            >
              <div
                className={st.throw}
                style={vars({
                  "--td": `${0.15 + i * 0.25}s`,
                  "--tr": `${s.r}deg`,
                })}
              >
                {frame}
              </div>
            </div>
          ) : (
            <div
              key={i}
              className={st.fly}
              style={vars({
                left: X(s.x),
                top: Y(s.y),
                width: Z(250),
                height: Z(175),
                "--fx": `calc(${s.f[0]} * (50cqw + ${Z(300)}))`,
                "--fy": Z(FX * s.f[1]),
                "--fr": `${s.f[2]}deg`,
              })}
            >
              <div
                className={st.throw}
                style={vars({
                  "--td": `${0.15 + i * 0.25}s`,
                  "--tr": `${s.r}deg`,
                })}
              >
                {frame}
              </div>
            </div>
          );
        })}
        {/* «70» — taxlam ostida yoziladi; scrollda kattalashib hero’dagi o‘rniga (portretning o‘ng pasti) suriladi */}
        {d.big && (
          <p
            className={cx(st.sli, st.gNum)}
            style={vars({
              "--n0x": "50%",
              "--n0y": Y(635),
              "--n0f": Z(110),
              "--n1x": `calc(50% + ${PU(195)})`,
              "--n1y": PU(500),
              "--n1f": PU(200),
              color: BORDO,
            })}
          >
            <span className={st.gNumIn}>{d.big}</span>
          </p>
        )}
        <p
          className={cx(st.g5, st.gWord, "absolute text-center")}
          style={{
            left: X(24),
            width: Z(342),
            top: Y(700),
            height: Z(24),
            fontSize: Z(20),
            lineHeight: `${Z(24)}`,
            color: INK,
            whiteSpace: "nowrap",
          }}
        >
          <span className={cx(st.gIn, "block")} style={vars({ "--gd": "1.9s" })}>
            <Fit base={20 * S} max={342 * S} deps={d.gateWord}>
              {d.gateWord}
            </Fit>
          </span>
        </p>
      </div>
    </div>
  );
}

/* ═════════════ Bo‘lim qobig‘i ═════════════ */
type Bg = "white" | "grey" | "bordo" | "coal";
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
}: {
  children: ReactNode;
  z: number;
  bg: Bg;
  colStyle?: CSSProperties;
  id?: string;
  outer?: ReactNode;
  className?: string;
  secRef?: React.Ref<HTMLElement>;
}) {
  return (
    <section ref={secRef} id={id} className={cx(st.sec, st[bg], className)} style={{ zIndex: z }}>
      {outer}
      <div className={st.col} style={{ width: U(390), ...colStyle }}>
        {children}
      </div>
    </section>
  );
}

/** Sarlavha (Spectral Light Italic, markazda, 360 da sig‘adi) */
function Title({ text, size = 40, h = 61, color = BORDO, d = 0, style }: { text: string; size?: number; h?: number; color?: string; d?: number; style?: CSSProperties }) {
  return (
    <p
      data-a="up"
      className={cx(st.sli, "text-center")}
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

/** Chok ustidagi «70» muhri — bo‘lim tepasida (yarmi oldingi bo‘lim ustida) */
function SeamSeal({ d, stampKey }: { d: D; stampKey?: number }) {
  return (
    <div data-a="seal" className={cx(st.seam, "absolute")} style={{ left: U(147), top: U(-48), width: U(96), height: U(96) }}>
      <Seal key={stampKey ?? 0} text={d.big} stamp={!!stampKey} />
    </div>
  );
}

/* ═════════════ 01 · Hero — portret, katta «70», ism, «… yillik yubiley», sana. Ochilish sahnasi shu holatga keladi
 * (portret 1.08 → 1, «70» ko‘tariladi, ism harfma-harf) — bo‘limning o‘zi harakatsiz (sahna yashirilganda aynan shu ko‘rinadi) ═════════════ */
function Hero({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  return (
    <Sec
      z={z}
      bg="white"
      colStyle={{ paddingTop: U(620), paddingBottom: U(194) }}
      outer={
        <Side wide={wide}>
          <div
            className="absolute"
            style={{
              left: C(1100),
              top: C(700),
              width: C(130),
              height: C(130),
            }}
          >
            <Seal text={d.big} size={130} unit={C} />
          </div>
        </Side>
      }
    >
      <HeroBody d={d} wide={wide} />
    </Sec>
  );
}

/* ═════════════ 02 · Taklif — murojaat (mehmon ismi bilan), matn, «Hurmat bilan,» va imzo (bordo kursiv) ═════════════ */
function Taklif({ d, z }: { d: D; z: number }) {
  const t = useT();
  const hello = d.guest ? guestHello(t, "Hurmatli {guest}!", d.guest) : t("Aziz mehmonlar!");
  return (
    <Sec z={z} bg="grey" colStyle={{ paddingTop: U(110), paddingBottom: U(150) }}>
      <SeamSeal d={d} />
      <div data-a="up" className={cx(st.sli, "relative text-center")} style={vars({ color: BORDO, "--d": "0.05s" })}>
        <NameLines text={hello} base={40} max={342} lh={61} two={30} twoLh={44} />
      </div>
      <p
        data-a="up"
        className={cx(st.g4, "relative mx-auto text-center")}
        style={vars({
          marginTop: U(19),
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
          className={cx(st.sli, "relative mx-auto text-center")}
          style={vars({
            marginTop: U(105),
            width: U(342),
            fontSize: U(18),
            lineHeight: `${U(25.2)}`,
            color: BORDO,
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

/* ═════════════ 03 · Yillar — surat xronologiyasi: har surat skrollda qora-oqdan rangliga o‘tadi (0.8 s), yengil parallaks (0.9x),
 * yil oldingi yildan sanab chiqadi (1956 → 2026). Surat bo‘lmasa — qator suratsiz (yil va voqea) ═════════════ */
function Year({ text, from, run }: { text: string; from: number; run: boolean }) {
  const n = /^\d{3,4}$/.test(text) ? +text : 0;
  const start = n && from && from < n && n - from <= 120 ? from : n - 30;
  const c = useCountUp(n - start, run && !!n, 1400);
  return <>{n ? String(start + c.value) : text}</>;
}
function YearRow({ r, prev, i }: { r: Row; prev: number; i: number }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.35, true);
  return (
    <div ref={ref} className="relative" style={{ height: U(r.src ? 360 : 106) }}>
      {r.src && (
        <div
          data-a="photo"
          className={st.yPhoto}
          style={vars({
            width: U(342),
            height: U(240),
            borderRadius: U(2),
            "--d": "0.05s",
          })}
        >
          <div data-px="" data-pk="0.05" data-pm="12" className={st.yPar}>
            <Img src={r.src} className={st.yImg} />
            <Img src={r.src} className={cx(st.yImg, st.yGray)} />
          </div>
        </div>
      )}
      <div className="absolute inset-x-0" style={{ top: U(r.src ? 254 : 0) }}>
        {r.year && (
          <p
            data-a="left"
            className={cx(st.sl, "absolute")}
            style={vars({
              left: 0,
              top: 0,
              width: U(150),
              height: U(44),
              fontSize: U(44),
              lineHeight: 1,
              color: INK,
              whiteSpace: "nowrap",
              "--d": `${0.15 + i * 0.02}s`,
            })}
          >
            <Fit base={44} max={r.text ? 150 : 342} deps={r.year}>
              <Year text={r.year} from={prev} run={inView} />
            </Fit>
          </p>
        )}
        {r.text && (
          <p
            data-a="right"
            className={cx(st.g5, st.clamp2, "absolute text-right")}
            style={vars({
              right: 0,
              top: U(r.year ? 12 : 0),
              width: U(r.year ? 196 : 342),
              fontSize: U(16),
              lineHeight: `${U(22.4)}`,
              color: MUTED,
              "--d": "0.3s",
            })}
          >
            {r.text}
          </p>
        )}
      </div>
    </div>
  );
}
function Years({ d, z }: { d: D; z: number }) {
  const t = useT();
  const rows = d.rows;
  if (!rows.length) return null;
  return (
    <Sec z={z} bg="white" colStyle={{ paddingTop: U(90), paddingBottom: U(20) }}>
      <Title text={t("Yillar")} size={44} h={67} />
      <div className="relative mx-auto" style={{ marginTop: U(23), width: U(342) }}>
        {rows.map((r, i) => (
          <YearRow key={i} r={r} i={i} prev={i ? +(/^\d{3,4}$/.test(rows[i - 1].year) ? rows[i - 1].year : 0) : 0} />
        ))}
      </div>
    </Sec>
  );
}

/* ═════════════ 04 · Yubileygacha — taymer (raqamlar varaqlanadi), sana va soat, kalendarga qo‘shish ═════════════ */
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
    <Sec z={z} bg="bordo" colStyle={{ height: U(560) }}>
      <SeamSeal d={d} />
      <div className="absolute inset-x-0" style={{ top: U(100) }}>
        <Title text={d.timerTitle} color="#fff" />
      </div>
      <div
        ref={ref}
        className="absolute flex"
        style={{
          left: U(24),
          top: U(190),
          width: U(339),
          height: U(96),
          gap: U(9),
        }}
      >
        {vals.map((v, i) => (
          <div
            key={i}
            data-a="flip"
            className={cx(st.tcell, "relative")}
            style={vars({
              width: U(78),
              height: U(96),
              borderWidth: U(1),
              borderRadius: U(4),
              "--d": `${0.1 + i * 0.1}s`,
            })}
          >
            <p
              className={cx(st.sl, "absolute inset-x-0 text-center")}
              style={{
                top: U(15),
                height: U(52),
                fontSize: U(34),
                lineHeight: `${U(52)}`,
                color: "#fff",
                whiteSpace: "nowrap",
              }}
            >
              <Fit base={34} max={70} deps={String(vals[0]).length}>
                <Digits value={v} run={inView} len={i === 0 ? Math.max(2, String(vals[0]).length) : 2} i={i} />
              </Fit>
            </p>
            <p
              className={cx(st.g5, "absolute inset-x-0 text-center")}
              style={{
                top: U(61),
                height: U(16),
                fontSize: U(13),
                lineHeight: `${U(16)}`,
                color: "rgba(255,255,255,.8)",
                whiteSpace: "nowrap",
              }}
            >
              <Fit base={13} max={72} deps={units[i]}>
                {units[i]}
              </Fit>
            </p>
          </div>
        ))}
      </div>
      {d.dateLine && (
        <p
          data-a="up"
          className={cx(st.g5, "absolute inset-x-0 text-center")}
          style={vars({
            top: U(320),
            height: U(20),
            fontSize: U(17),
            lineHeight: `${U(20)}`,
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
      <div data-a="up" className="absolute inset-x-0 flex justify-center" style={vars({ top: U(370), "--d": "0.35s" })}>
        <button
          type="button"
          className={cx(st.g6, st.btnWhite)}
          style={{
            minWidth: U(250),
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
              slug: "xotira",
            })
          }
        >
          {t("Kalendarga qo‘shish")}
        </button>
      </div>
    </Sec>
  );
}

/* ═════════════ 05 · Kecha dasturi — ajratuvchi chiziqlar chiziladi, qatorlar navbat bilan chapdan kiradi ═════════════ */
function Program({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const items = d.program.slice(0, 8);
  if (!items.length) return null;
  return (
    <Sec
      z={z}
      bg="white"
      colStyle={{ paddingTop: U(90), paddingBottom: U(60) }}
      outer={
        <Side wide={wide}>
          <div
            data-a="seal"
            className="absolute"
            style={{
              left: C(180),
              top: C(240),
              width: C(110),
              height: C(110),
              opacity: 0.9,
            }}
          >
            <Seal text={d.big} size={110} unit={C} />
          </div>
        </Side>
      }
    >
      <Title text={t("Kecha dasturi")} />
      <div className="relative mx-auto" style={{ marginTop: U(25), width: U(342) }}>
        {items.map((it, i) => (
          <div
            key={i}
            className="relative flex"
            style={{
              minHeight: U(96),
              padding: `${U(22)} 0 ${U(16)}`,
              gap: U(16),
            }}
          >
            <span data-a="rule" className={st.rule} style={vars({ height: U(1), "--d": `${0.1 + i * 0.12}s` })} />
            <p
              data-a="left"
              className={cx(st.sl, st.ptime)}
              style={vars({
                width: U(90),
                height: U(46),
                fontSize: U(30),
                lineHeight: `${U(46)}`,
                color: BORDO,
                "--d": `${0.15 + i * 0.12}s`,
              })}
            >
              <Fit base={30} max={90} deps={it.time}>
                {it.time}
              </Fit>
            </p>
            <p
              data-a="left"
              className={cx(st.g5, st.clamp2, "min-w-0 flex-1 self-start")}
              style={vars({
                marginTop: U(8),
                fontSize: U(16),
                lineHeight: `${U(21.6)}`,
                color: INK,
                "--d": `${0.2 + i * 0.12}s`,
              })}
            >
              {it.title}
            </p>
          </div>
        ))}
      </div>
    </Sec>
  );
}

/* ═════════════ 06 · Manzil — surat (mijozning 6-surati; bo‘lmasa — bayram zali), joy nomi, manzil, xarita va yo‘nalish ═════════════ */
function Venue({ d, z, linkable }: { d: D; z: number; linkable: boolean }) {
  const t = useT();
  if (!d.hasPlace) return null;
  const btn = (s: string) => (
    <Fit base={16} max={140} deps={s}>
      {s}
    </Fit>
  );
  return (
    <Sec z={z} bg="coal" colStyle={{ paddingTop: U(90), paddingBottom: U(104) }}>
      <Title text={t("Manzil")} color="#fff" />
      <div
        data-a="zoom"
        className="relative mx-auto overflow-hidden"
        style={vars({
          marginTop: U(15),
          width: U(342),
          height: U(228),
          borderRadius: U(4),
          background: "#2a2626",
          "--d": "0.1s",
        })}
      >
        <Img src={d.hall} className={st.zoomImg} />
      </div>
      {d.venueTitle && (
        <p
          data-a="up"
          className={cx(st.sr, "mx-auto text-center")}
          style={vars({
            marginTop: U(26),
            width: U(342),
            minHeight: U(43),
            fontSize: U(28),
            lineHeight: `${U(43)}`,
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
          className={cx(st.g4, "mx-auto text-center")}
          style={vars({
            marginTop: U(3),
            width: U(330),
            minHeight: U(24),
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
          className={cx(st.g6, st.btnWhite)}
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
          className={cx(st.g6, st.btnLine)}
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

/* ═════════════ 07 · Dress-kod (ixtiyoriy — o‘chirilsa joy qolmaydi): oq karta — turi (bordo kursiv) va izoh ═════════════ */
function Dress({ d, z }: { d: D; z: number }) {
  if (!d.dressNote && !d.dressTitle) return null;
  return (
    <Sec z={z} bg="coal" colStyle={{ paddingTop: U(30), paddingBottom: U(71) }}>
      <div
        data-a="rise"
        className={cx(st.dressCard, "relative mx-auto flex flex-col items-center text-center")}
        style={{
          width: U(342),
          padding: `${U(28)} ${U(26)}`,
          gap: U(10),
          borderRadius: U(4),
        }}
      >
        {d.dressTitle && (
          <p
            className={st.sli}
            style={{
              height: U(55),
              fontSize: U(36),
              lineHeight: `${U(55)}`,
              color: BORDO,
              whiteSpace: "nowrap",
            }}
          >
            <Fit base={36} max={290} deps={d.dressTitle}>
              {d.dressTitle}
            </Fit>
          </p>
        )}
        {d.dressNote && (
          <p
            className={st.g4}
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

/* ═════════════ 08 · Anketa — javob («Kelaman» bosilsa «70» muhri bosilgandek tushadi: scale 1.3 → 1) ═════════════ */
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
  const [stamp, setStamp] = useState(0);
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
      className={cx(st.g6, st.lbl)}
      style={{
        marginTop: U(mt),
        height: U(17),
        fontSize: U(14),
        lineHeight: `${U(17)}`,
      }}
    >
      {s}
    </p>
  );
  const sub = d.rsvpUntil ? t("Iltimos, {date} javob bering", { date: d.rsvpUntil }) : t(d.we ? "Javobingizni kutamiz" : "Javobingizni kutaman");
  const pick = (s: RsvpStatus) => {
    setStatus(s);
    if (s === "coming") setStamp((n) => n + 1);
  };
  return (
    <Sec z={z} bg="grey" id="xotira-javob" colStyle={{ paddingTop: U(100), paddingBottom: U(50) }}>
      <SeamSeal d={d} stampKey={stamp} />
      <h2
        data-a="up"
        className={cx(st.sli, "mx-auto text-center")}
        style={vars({
          width: U(342),
          fontSize: U(40),
          lineHeight: `${U(61)}`,
          color: BORDO,
          overflowWrap: "anywhere",
          "--d": "0.05s",
        })}
      >
        {t("Kelasizmi?")}
      </h2>
      <p
        data-a="up"
        className={cx(st.g4, "mx-auto text-center")}
        style={vars({
          marginTop: U(-1),
          width: U(342),
          minHeight: U(19),
          fontSize: U(16),
          lineHeight: `${U(19)}`,
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
          marginTop: U(31),
          width: U(342),
          padding: `${U(24)} ${U(22)} ${U(58)}`,
          borderRadius: U(6),
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
            <Seal text={d.big} stamp />
            <p
              className={st.sli}
              style={{
                fontSize: U(sent === "not_coming" ? 34 : 28),
                lineHeight: 1.3,
                color: BORDO,
                overflowWrap: "anywhere",
              }}
            >
              {sent === "not_coming" ? t("Rahmat!") : t("Rahmat! Joyingiz band qilindi")}
            </p>
            <p
              className={st.g4}
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
              className={st.g6}
              style={{
                fontSize: U(16),
                color: BORDO,
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
                marginTop: U(7),
                height: U(54),
                padding: `0 ${U(16)}`,
                borderRadius: U(4),
              }}
            >
              <input
                className={cx(st.g4, st.input)}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder={t("Ism va familiya")}
                aria-label={t("Ismingiz")}
                style={{ fontSize: U(17), lineHeight: `${U(22)}` }}
              />
            </label>
            {label(t("Kelasizmi?"), 22)}
            <div className="flex w-full" role="radiogroup" aria-label={t("Kelasizmi?")} style={{ marginTop: U(7), gap: U(8) }}>
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
                  className={cx(st.g6, st.choice)}
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
                </button>
              ))}
            </div>
            {status === "coming" && (
              <>
                {label(t("Necha kishi bo‘lasiz?"), 22)}
                <div
                  className={cx(st.counter, "justify-between")}
                  style={{
                    marginTop: U(7),
                    height: U(54),
                    padding: `0 ${U(8)}`,
                    borderRadius: U(27),
                  }}
                >
                  <button
                    type="button"
                    className={cx(st.g6, st.step)}
                    disabled={count <= 1}
                    onClick={() => setCount((n) => Math.max(1, n - 1))}
                    aria-label={t("Kamaytirish")}
                    style={{ width: U(40), height: U(40), fontSize: U(22) }}
                  >
                    −
                  </button>
                  <span className={st.sl} style={{ fontSize: U(28), lineHeight: 1.3, color: INK }} aria-live="polite">
                    {count}
                  </span>
                  <button
                    type="button"
                    className={cx(st.g6, st.step)}
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
            {label(t("Tabrik va xotiralaringiz"), 24)}
            <label
              className={st.field}
              style={{
                marginTop: U(7),
                height: U(130),
                padding: U(16),
                borderRadius: U(4),
                alignItems: "stretch",
              }}
            >
              <textarea
                className={cx(st.g4, st.input)}
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                maxLength={500}
                placeholder={t("Yozing…")}
                aria-label={t("Tabrik va xotiralaringiz")}
                style={{
                  fontSize: U(17),
                  lineHeight: `${U(23)}`,
                  height: "100%",
                }}
              />
            </label>
            {err && (
              <p className={st.g4} style={{ marginTop: U(12), color: "#c2410c", fontSize: U(15) }}>
                {err}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className={cx(st.g6, st.submit)}
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

/* ═════════════ 09 · Final — katta oila surati to‘liq ekranda sekin uzoqlashadi (Ken Burns: 1.12 → 1), matn pastdan chiqadi
 * (scroll bilan: --fc 0 … 1 = Figma kadri; sahifa oxirigacha albatta tugaydi). Oila surati bo‘lmasa — ko‘mir fonda «70» muhri ═════════════ */
function Final({ d, z, still, onSeen }: { d: D; z: number; still: boolean; onSeen: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const sec = useRef<HTMLElement>(null);
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
  useScrollProgress(sec, onP, !still);
  const title = t(d.we ? "Sizni kutamiz!" : "Sizni kutaman!");
  const H = d.fam ? 844 : 520;
  const ty = d.fam ? 640 : 300;
  return (
    <section ref={sec} className={cx(st.sec, st.coal, st.fin)} style={{ zIndex: z }}>
      <div ref={ref} className={st.finalWrap} style={vars({ height: U(H), ...(still ? { "--fc": 1 } : {}) })}>
        {d.fam && (
          <>
            <div className={st.fPhoto}>
              <Img src={d.fam} className={st.fImg} />
            </div>
            <div aria-hidden className={st.fShade} />
          </>
        )}
        <div className={st.col} style={{ width: U(390), height: "100%" }}>
          {!d.fam && (
            <div
              className={cx(st.fSeal, "absolute")}
              style={{
                left: U(139),
                top: U(120),
                width: U(112),
                height: U(112),
              }}
            >
              <Seal text={d.big} size={112} />
            </div>
          )}
          <p
            className={cx(st.sli, st.fUp, "absolute inset-x-0 text-center")}
            style={vars({
              top: U(ty),
              height: U(67),
              fontSize: U(44),
              lineHeight: `${U(67)}`,
              color: "#fff",
              whiteSpace: "nowrap",
              "--fk": 0,
            })}
          >
            <Fit base={44} max={342} deps={title}>
              {title}
            </Fit>
          </p>
          {d.family && (
            <p
              className={cx(st.g5, st.fUp, "absolute inset-x-0 text-center")}
              style={vars({
                top: U(ty + 72),
                height: U(19),
                fontSize: U(16),
                lineHeight: `${U(19)}`,
                color: "rgba(255,255,255,.85)",
                whiteSpace: "nowrap",
                "--fk": 1,
              })}
            >
              <Fit base={16} max={342} deps={d.family}>
                {d.family}
              </Fit>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ═════════════ Musiqa tugmasi — Figma «Xotira / Musiqa tugmasi»: bordo doira (52), 4 ta oq chiziq ritmda;
 * o‘chirilgan — chiziqlar kalta (4 px) ═════════════ */
const BARS = [10, 18, 13, 20];
function XotiraMusic({ m, wide, embedded }: { m: ReturnType<typeof useMusic>; wide: boolean; embedded: boolean }) {
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
type Key = "hero" | "taklif" | "years" | "timer" | "program" | "venue" | "dress" | "rsvp" | "final";

export function XotiraSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const loaded = usePreload([...d.stack.map((s) => s.src), d.portrait].filter(Boolean), [...d.rows.map((r) => r.src), d.hall, d.fam].filter(Boolean), withGate, wide ? "l" : "m");
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

  const shown: Key[] = (["hero", "taklif", "years", "timer", "program", "venue", "dress", "rsvp", "final"] as Key[]).filter((k) =>
    k === "years"
      ? d.rows.length > 0
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
        <XotiraMusic m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/muhr.svg`} />}
        <div className={st.flow}>
          {withGate && (loaded ? <Gate d={d} wide={wide} onStart={() => music.play(true)} /> : <div className={st.gateHold} />)}
          {embedded && <Gate d={d} wide={wide} still onStart={() => {}} />}
          <Hero d={d} z={z("hero")} wide={wide} />
          <Taklif d={d} z={z("taklif")} />
          <Years d={d} z={z("years")} />
          <Timer d={d} z={z("timer")} />
          <Program d={d} z={z("program")} wide={wide} />
          <Venue d={d} z={z("venue")} linkable={linkable} />
          <Dress d={d} z={z("dress")} />
          {data.rsvpEnabled && <Rsvp d={d} slug={data.slug} mode={mode} z={z("rsvp")} />}
          <Final d={d} z={z("final")} still={embedded} onSeen={onFinal} />
        </div>
        <footer className={cx(st.footer, "flex items-start justify-center")} style={{ height: U(120), paddingTop: U(50) }}>
          <p
            className={cx(st.g5, "text-center")}
            style={{
              fontSize: U(14),
              lineHeight: `${U(17)}`,
              color: "rgba(255,255,255,.5)",
            }}
          >
            <a href="https://shohnoma.uz">{t("shohnoma.uz orqali yaratilgan")}</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
