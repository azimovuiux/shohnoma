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
import { DRESS_TEXT, MSG, P, POYEZD_DEMO, POYEZD_DEMO_EN, POYEZD_DEMO_RU, type PoyezdItem } from "./data";
import { SNOW, type Dot } from "./snow";
import st from "./poyezd.module.css";

/* ── Birliklar ──
 * U — joriy `--u`. Bo‘limlarda — kontent ustuni (Figma mobil 390 koordinatalari; laptopda ustun = mobil × 1.2, ya’ni 468px / 1440 —
 * Figma «Kontent ustuni (mobil ×1.2)»). C — laptop kanvasi (1440) birligi: yon bezaklar (uychalar, archalar, osma vagon, qor tepaliklari).
 * Ochilish (00) — hero’ning o‘zi (mobil 390×1040, laptop 1440×1248): sahna bir ekranga sig‘adi va pastki chetga bog‘lanadi;
 * laptopda ustun elementlari = mobil koordinata × 1.2 + 486 (Figma bilan aynan). PU — sahifa birligi (sahnadagi keyingi bo‘lim nusxasi). */
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
const DAY_MS = 86400_000;
const isoOf = (d: Date) => d.toISOString().slice(0, 10);

/* Ranglar (Figma «32 · Ertak — Assets») */
const NAVY = "#2B4087";
const DEEP = "#172452";
const GOLD = "#D9B26B";
const INK = "#1A2447";
const MUTED = "#6B7894";

/** Server yaratadigan standart taklif matni (php/api/lib/orders.php DEFAULT_MESSAGE) — har qaysi tilda */
const SERVER_DEFAULT = "Aziz mehmonlar! Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.";
const isServerDefault = (m: string) => (["uz", "ru", "en"] as Locale[]).some((l) => tr(l, SERVER_DEFAULT).trim() === m.trim());

function useData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO = lang === "ru" ? POYEZD_DEMO_RU : lang === "en" ? POYEZD_DEMO_EN : POYEZD_DEMO;
  const ex = (data.extra ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof ex[k] === "string" ? (ex[k] as string).trim() : typeof ex[k] === "number" ? String(ex[k]) : "");
  const sd = splitDate(data.date);
  const guest = useGuestName();
  return useMemo(() => {
    const cw = calendarWords(lang);
    const exProgram = Array.isArray(ex.program) ? (ex.program as PoyezdItem[]).filter((p) => p?.time && p?.title) : [];
    const exHigh = Array.isArray(ex.highlights)
      ? (ex.highlights as { text?: unknown }[]).map((h) => (typeof h?.text === "string" ? h.text.trim() : "")).filter(Boolean)
      : [];
    const raw = (data.photos ?? []) as (string | null | undefined)[];
    const date = sd ? new Date(`${sd.iso}T12:00:00Z`) : null;
    // korporativ: personA — tadbir nomi, personB — kompaniya (namunadagi nomlar tarjima qilinadi, mijozniki — yo‘q)
    const event = ((demo ? t(data.personA) : data.personA) || "").trim();
    const org = ((demo ? t(data.personB ?? "") : data.personB) || "").trim();
    const time = sd?.time ?? "";
    const m = date ? date.getUTCMonth() : 0;
    const day = date ? date.getUTCDate() : 0;
    const wd = date ? cw.weekday[date.getUTCDay()] : "";
    // «28-dekabr» / «28 декабря» / «28 December»
    const dayMonth = date ? (lang === "uz" ? `${day}-${cw.monthsAfterDay[m]}` : `${day} ${cw.monthsAfterDay[m]}`) : "";
    // taklif kartasi: «28-dekabr, dushanba» / «28 декабря, понедельник» / «Monday, 28 December»
    const dayLong = date ? (lang === "en" ? `${wd}, ${dayMonth}` : `${dayMonth}, ${wd.toLocaleLowerCase(lang)}`) : "";
    const program = (demo ? DEMO.program : exProgram.length ? exProgram : ((data.program ?? []) as PoyezdItem[])).slice(0, 8);
    const msgRaw = (demo ? "" : data.message || "").trim();
    const custom =
      msgRaw && !isServerDefault(msgRaw)
        ? msgRaw
            .replace(
              /^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Muhtaram mehmonlar!|Hurmatli mehmonlar!|Hurmatli hamkasblar!|Qadrli hamkasblar!|Aziz hamkasblar!|Hurmatli hamkorlar!|Дорогие гости!|Уважаемые гости!|Дорогие коллеги!|Уважаемые коллеги!|Dear guests!|Dear colleagues!)\s*/,
              "",
            )
            .trim()
        : "";
    const venueTitle = ((demo ? t(data.venueName) : data.venueName) || "").trim();
    const address = ((demo ? DEMO.address : data.address) || "").trim();
    const coords = coordsFrom(data.mapUrl);
    // javob muddati — namunada sanadan 8 kun oldin (Figma: «20-dekabrgacha» — 28-dekabr uchun)
    const deadline = demo && date ? isoOf(new Date(date.getTime() - 8 * DAY_MS)) : data.rsvpDeadline;
    // shahar: manzilning birinchi bo‘lagi (qisqa bo‘lsa) — «soat 18:00 · Toshkent»
    const city0 = address.split(",")[0]?.replace(/^(г\.|город)\s*/i, "").replace(/\s+(shahri|sh\.|tumani|viloyati)$/i, "").trim() ?? "";
    const city = demo ? DEMO.city : city0.length <= 18 && !/\d/.test(city0) ? city0 : "";
    const code = str("dressCode") || (demo ? DEMO.dressCode : "");
    const dressNote = str("dressNote") || (DRESS_TEXT[code] ? t(DRESS_TEXT[code]) : "");
    // Suratlar (PHOTO_SLOTS.poyezd): 0 — «Jamoa surati» (bo‘lmasa — bo‘lim yo‘qoladi), 1–3 — «Bir yillik lahzalar» (bo‘lmasa — bo‘lim
    // yo‘qoladi), 4 — «Manzil» (bo‘lmasa — shablonning bazm zali)
    const slot = (i: number) => (demo ? "" : (raw[i] as string) || "");
    const gallery = demo ? [`${P}/lahza1.webp`, `${P}/lahza2.webp`, `${P}/lahza3.webp`] : [slot(1), slot(2), slot(3)].filter(Boolean);
    const dateLine = [dayMonth, time ? t("soat {time}", { time }) : ""].filter(Boolean).join(" · ");
    return {
      event,
      org,
      /** hero sarlavhasi: 2 qator (birinchisi kursiv) — Figma «Qishki / ertak» */
      titleRows: titleRows(event),
      /** hero: «Lumen Group yil yakuni bazmi» */
      tagline: str("tagline") || (org ? t("{org} yil yakuni bazmi", { org }) : t("Yil yakuni bazmi")),
      /** hero pilyulasi va taymer ostida: «28-dekabr · soat 18:00» */
      dateLine,
      dayLong,
      /** taklif kartasi 2-qatori: «soat 18:00 · Toshkent» */
      timeCity: [time ? t("soat {time}", { time }) : "", city].filter(Boolean).join(" · "),
      highlights: (demo ? DEMO.highlights : exHigh).slice(0, 3),
      message: custom || t(MSG),
      /** imzo: «Lumen Group rahbariyati» */
      sign: str("sign") || (org ? t("{org} rahbariyati", { org }) : ""),
      /** final: «Lumen Group jamoasi» */
      team: org ? t("{org} jamoasi", { org }) : "",
      time,
      hasDate: !!date,
      iso: sd?.iso ?? "",
      target: data.date ? tashkentDate(data.date).getTime() : null,
      guest,
      venueTitle,
      address,
      hasPlace: !!(venueTitle || address || data.mapUrl),
      mapUrl: data.mapUrl || (coords ? `https://yandex.uz/maps/?pt=${coords.lon},${coords.lat}&z=16` : `https://yandex.uz/maps/?text=${encodeURIComponent([venueTitle, address].filter(Boolean).join(", "))}`),
      taxi: coords
        ? `https://3.redirect.appmetrica.yandex.com/route?end-lat=${coords.lat}&end-lon=${coords.lon}&appmetrica_tracking_id=1178268795219780156`
        : `https://yandex.uz/maps/?rtext=~${encodeURIComponent([address, venueTitle].filter(Boolean).join(", "))}&rtt=taxi`,
      program,
      gallery,
      team1: demo ? `${P}/jamoa.webp` : slot(0),
      dressTitle: DRESS_TEXT[code] || str("dressCode") ? t(code) : "",
      dressNote,
      hall: slot(4) || `${P}/zal.webp`,
      rsvpUntil: untilPhrase(deadline, lang),
      calTitle: event || t("Yangi yil bazmi"),
      musicUrl: musicSrc(template, data),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, data, demo, guest, lang, t]);
}
type D = ReturnType<typeof useData>;

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
/** Hero sarlavhasi: bir so‘z — bir qator; aks holda — ikki teng qator */
function titleRows(text: string): string[] {
  if (!text) return [];
  return split2(text) ?? [text];
}

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
 * Scroll bilan bog‘liq yengil parallaks (faqat `translate`): `data-px` — bezak ekran markazidan masofaga qarab ±`data-pm` px siljiydi
 * (Figma «Motion»: qatlamlar har xil tezlikda). Osilgan/turgan bezaklar o‘z-o‘zidan tebranmaydi.
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
        if (r.bottom < -300 || r.top > vh + 300) return;
        const dist = r.top + r.height / 2 - vh / 2;
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

/* ═════════════ Bezaklar ═════════════ */
type Unit = (n: number) => string;
/** Kesilgan rasm (Figma qutisi aynan: x, y, eni, bo‘yi; `object-fit: cover` — Figma «Fill») */
function Art({
  name,
  x,
  y,
  w,
  h,
  unit = U,
  a,
  d = 0,
  px,
  className,
  inner,
  eager,
  children,
}: {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  unit?: Unit;
  a?: string;
  d?: number;
  px?: boolean;
  className?: string;
  inner?: string;
  eager?: boolean;
  children?: ReactNode;
}) {
  const pxAttr = px ? { "data-px": "", "data-pk": "0.05", "data-pm": "18" } : {};
  return (
    <div aria-hidden data-a={a} className={cx(st.art, className)} style={vars({ left: unit(x), top: unit(y), width: unit(w), height: unit(h), "--d": `${d}s` })}>
      <div className={cx(st.artMove, inner)} {...pxAttr}>
        <Img src={`${P}/${name}.webp`} eager={eager} />
        {children}
      </div>
    </div>
  );
}

/** Oltin archa chiroqlari — sekin miltillaydi (archa qutisiga nisbatan, %) */
const LIGHTS: [number, number, number][] = [
  [50, 24, 0],
  [43, 36, 1.1],
  [58, 40, 0.5],
  [36, 52, 1.7],
  [52, 54, 0.8],
  [64, 57, 2.2],
  [31, 67, 1.4],
  [47, 69, 0.3],
  [67, 71, 1.9],
];
function Lights() {
  return (
    <span aria-hidden className={st.lights}>
      {LIGHTS.map(([x, y, dl], i) => (
        <span key={i} className={st.light} style={vars({ left: `${x}%`, top: `${y}%`, "--ld": `${dl}s` })} />
      ))}
    </span>
  );
}

/** Qor zarralari (Figma vektor nuqtalari) — kontent ustuni (`U`) yoki laptop kanvasi (`C`) koordinatalarida */
function Snow({ dots, unit = U, className }: { dots: Dot[]; unit?: Unit; className?: string }) {
  return (
    <div aria-hidden className={cx(st.snow, className)}>
      {dots.map(([x, y, s, o], i) => (
        <span key={i} style={{ left: unit(x), top: unit(y), width: unit(s), height: unit(s), opacity: o }} />
      ))}
    </div>
  );
}

/** To‘rt qirrali oltin yulduz (Figma «Yulduz») */
function Star({ x, y, s, unit = U, a = "star", d = 0, className }: { x: number; y: number; s: number; unit?: Unit; a?: string; d?: number; className?: string }) {
  return (
    <svg
      aria-hidden
      data-a={a || undefined}
      viewBox="0 0 16 16"
      className={cx(st.star, className)}
      style={vars({ left: unit(x), top: unit(y), width: unit(s), height: unit(s), "--d": `${d}s` })}
    >
      <path d="M8 0L9.13137 6.86863L16 8L9.13137 9.13137L8 16L6.86863 9.13137L0 8L6.86863 6.86863L8 0Z" />
    </svg>
  );
}

/** Osma yo‘l arqoni — ikki uchi orasidagi ingichka oq chiziq (Figma: 1.2, oq 70%) */
function Rope({ x1, y1, x2, y2, unit = U, className, ext = 0 }: { x1: number; y1: number; x2: number; y2: number; unit?: Unit; className?: string; ext?: number }) {
  // ext — arqon ikki uchidan shuncha (uzunlikka nisbatan) davom etadi: keng ekranda sahna ekrandan tor bo‘lsa ham uzilib qolmaydi
  if (ext) {
    const dx = (x2 - x1) * ext;
    const dy = (y2 - y1) * ext;
    x1 -= dx;
    y1 -= dy;
    x2 += dx;
    y2 += dy;
  }
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return (
    <div
      aria-hidden
      className={cx(st.rope, className)}
      style={{ left: unit(x1), top: unit(y1 - 0.6), width: unit(len), height: unit(1.2), transform: `rotate(${ang.toFixed(3)}deg)` }}
    />
  );
}

/** Qor tepaliklari (Figma vektor): [x, y, eni, bo‘yi, rang]; oxirida pastki oq to‘rtburchak */
type Hill = [number, number, number, number, string];
const HILLS_M: Hill[] = [
  [-195, 840, 507, 240, "#CCDBF5"],
  [78, 850, 468, 230, "#CCDBF5"],
  [-117, 890, 585, 230, "#EDF2FC"],
  [-97.5, 930, 624, 200, "#FFFFFF"],
];
const HILLS_L: Hill[] = [
  [-216, 1008, 1152, 300, "#CCDBF5"],
  [604.8, 1018, 1080, 290, "#CCDBF5"],
  [-144, 1078, 1296, 260, "#EDF2FC"],
  [504, 1073, 1152, 250, "#EDF2FC"],
  [-216, 1128, 1872, 230, "#FFFFFF"],
];
function Hills({ list, dy = 0, unit = U, ext, rectY, rectH, rectW, className }: { list: Hill[]; dy?: number; unit?: Unit; ext?: boolean; rectY: number; rectH: number; rectW: number; className?: string }) {
  return (
    <div aria-hidden className={cx(st.hills, className)}>
      {/* keng ekranlarda (sahna ekrandan tor bo‘lsa) chetlar ham qor bilan to‘lsin — Figma kadridan tashqarida */}
      {ext && (
        <>
          <span style={{ left: unit(list[0][0] - list[0][2] * 0.8), top: unit(list[0][1] + dy + 10), width: unit(list[0][2]), height: unit(list[0][3]), background: list[0][4] }} />
          <span style={{ left: unit(rectW - list[0][0] - list[0][2] * 0.2), top: unit(list[0][1] + dy + 14), width: unit(list[0][2]), height: unit(list[0][3]), background: list[0][4] }} />
        </>
      )}
      {list.map(([x, y, w, h, c], i) => (
        <span key={i} style={{ left: unit(x), top: unit(y + dy), width: unit(w), height: unit(h), background: c }} />
      ))}
      <i style={{ top: unit(rectY + dy), height: unit(rectH) }} />
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

/** Oltin gradient matn (Figma: #F7E5BD → #D9B26B, yuqoridan pastga) */
function Gold({ children, shimmer, className }: { children: ReactNode; shimmer?: boolean; className?: string }) {
  return <span className={cx(st.gold, shimmer && st.shimmer, className)}>{children}</span>;
}

/* ═════════════ 00 · Ochilish = Hero — qishki ertak qishlog‘i (faqat scroll bilan, --o: 0…1) ═════════════
 * Figma «Motion — 32 · Ertak» 1–3. Yuklanganda (bosishsiz): qor zarralari sekin yog‘adi (3 qatlam, juda yengil; reduced-motion — yo‘q),
 * «Qishki ertak» oltin harflari ustidan yorug‘lik bir marta o‘tadi (2.5 s), sana pilyulasi kattalashib chiqadi, osma vagon arqon bo‘ylab
 * o‘ngdan suzib kelib to‘xtaydi, uychalar va archalar ko‘tariladi, oltin archa chiroqlari sekin miltillaydi. Oxirgi holat = Figma 00 kadri.
 * Scroll: sahna (bir ekranga sig‘gan hero) to‘xtab turadi, qishloq 4 qatlam parallaks bilan ko‘tariladi — osmon gradienti, qor tepaliklari
 * va oltin archa scroll bilan aynan bir tezlikda (1.0), archalar 0.85, sarlavha va sana 0.8, uychalar 0.7, osma yo‘l 0.55, yulduzlar 0.4 (uychalar
 * tepaliklar ortiga «cho‘kadi»); osma vagon arqon bo‘ylab chapga suzadi. Tepaliklar ostidan keyingi bo‘lim (01, sahnadan yuqori qatlamda)
 * scroll bilan birga chiqadi va o‘yinchoq poyezd chapdan chok ustiga kirib keladi. Chok doim bir joyda (lerp yo‘q — tepaliklar scrollga
 * «yopishgan»), o = 1 da hero to‘liq yuqoriga chiqib ketgan — sahna odatdagidek ketadi. «Sharpa» yo‘q: hech narsa yarim shaffof fon
 * orqasidan ko‘rinmaydi. */
const GATE = {
  m: { W: 390, H: 1040, S: 1, OX: 0 },
  l: { W: 1440, H: 1248, S: 1.2, OX: 486 },
} as const;
/** yog‘ayotgan qor: [chap %, o‘lcham px, davomiylik s, kechikish s, yon siljish px, shaffoflik] — 3 qatlam (kichik/sekin … katta/tez) */
const FALL: [number, number, number, number, number, number][] = [
  [3, 2, 24, -4, 10, 0.55],
  [9, 3, 18, -11, -12, 0.7],
  [15, 4, 14, -6, 8, 0.8],
  [22, 2, 23, -15, -8, 0.5],
  [28, 3, 17, -2, 12, 0.7],
  [35, 2, 25, -19, 6, 0.55],
  [41, 4, 13, -9, -10, 0.8],
  [47, 2, 22, -6, 8, 0.5],
  [53, 3, 19, -13, -12, 0.65],
  [60, 2, 24, -1, 10, 0.55],
  [66, 4, 15, -12, -6, 0.75],
  [72, 3, 18, -7, 12, 0.65],
  [78, 2, 23, -17, -8, 0.5],
  [84, 4, 14, -3, 8, 0.8],
  [90, 3, 20, -10, -12, 0.65],
  [96, 2, 22, -5, 6, 0.55],
  [18, 3, 21, -20, 8, 0.6],
  [57, 2, 26, -22, -6, 0.5],
];
function Fall() {
  return (
    <div aria-hidden className={st.fall}>
      {FALL.map(([x, s, du, dl, sw, o], i) => (
        <span key={i} style={vars({ left: `${x}%`, width: s, height: s, "--fd": `${du}s`, "--fdl": `${dl}s`, "--sw": `${sw}px`, "--fo": o })} />
      ))}
    </div>
  );
}

/** Hero sarlavhasi (Old Standard, 72, oltin): 1-qator kursiv, 2-qator to‘g‘ri — Figma «Qishki» / «ertak» */
function HeroTitle({ rows, Z, X, Y, S }: { rows: string[]; Z: (n: number) => string; X: (x: number) => string; Y: (y: number) => string; S: number }) {
  const box = useRef<HTMLDivElement>(null);
  // ikkala qator bir xil o‘lchamda: eng uzun qator 342 ga sig‘maguncha hammasi birga kichrayadi
  useIso(() => {
    const el = box.current;
    if (!el || !rows.length) return;
    const measure = () => {
      el.style.fontSize = Z(72);
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (!px) return;
      const u = px / 72;
      const w = Math.max(...Array.from(el.querySelectorAll<HTMLElement>("[data-row]")).map((x) => x.offsetWidth));
      const k = w > 342 * S * u ? (342 * S * u) / w : 1;
      el.style.fontSize = U(+(72 * S * k).toFixed(3));
      // kichraygan qatorlar bir-biriga yaqinlashadi (blok markazi — Figma’dagi joyida)
      el.style.setProperty("--tk", k.toFixed(4));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [rows.join("|"), S]);
  if (!rows.length) return null;
  const tops = rows.length === 2 ? [90, 170] : [130];
  return (
    <div ref={box} className="absolute inset-0" style={{ fontSize: Z(72) }}>
      {rows.map((r, i) => (
        <p
          key={i}
          className={cx(i === 0 ? st.osi : st.os, st.hTitle, "absolute text-center")}
          style={{
            left: X(24),
            width: Z(342),
            top: rows.length === 2 ? `calc(${Y(tops[i])} ${i ? "-" : "+"} ${Z(40)} * (1 - var(--tk, 1)))` : Y(tops[i]),
            height: Z(72),
            fontSize: "inherit",
            lineHeight: `${Z(72)}`,
            whiteSpace: "nowrap",
          }}
        >
          <span className={cx(st.gIn, "block")} style={vars({ "--gd": `${0.2 + i * 0.18}s` })}>
            <span data-row className="inline-block whitespace-nowrap">
              <Gold shimmer>{r}</Gold>
            </span>
          </span>
        </p>
      ))}
    </div>
  );
}

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
    const flow = el.parentElement;
    const apply = (o: number) => {
      el.style.setProperty("--o", o.toFixed(4));
      // o‘yinchoq poyezd (keyingi bo‘limda) shu qiymat bilan chapdan kirib keladi
      flow?.style.setProperty("--go", o.toFixed(4));
      if (!started && o > 0.004) {
        started = true;
        cb.current();
      }
    };
    // lerp yo‘q: tepaliklar va keyingi bo‘lim chok bo‘ylab doim aynan ulanib turadi
    const loop = () => {
      raf = 0;
      cur = target;
      apply(cur);
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
      flow?.style.removeProperty("--go");
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
  // sahna ichidagi «ustun» va «kanvas» qutilari: chap yuqori burchagi = Figma kadri (0, 0). Ustun ichida `--u` = sahna birligi × S
  const G1 = (n: number) => `calc(var(--g) * ${+n.toFixed(3)})`;
  const colBox: CSSProperties = { left: `calc(50% + ${G1(OX - W / 2)})`, top: `calc(100% - ${G1(H)})`, width: G1(S * 390), height: G1(H) };
  const canBox: CSSProperties = { left: `calc(50% + ${G1(-W / 2)})`, top: `calc(100% - ${G1(H)})`, width: G1(W), height: G1(H) };
  const col = (children: ReactNode) => (
    <div className="absolute" style={vars({ ...colBox, "--u": S === 1 ? "var(--g)" : `calc(var(--g) * ${S})` })}>
      {children}
    </div>
  );
  const can = (children: ReactNode) => (
    <div className="absolute" style={canBox}>
      {children}
    </div>
  );
  const layer = (k: number, children: ReactNode, className?: string) => (
    <div className={cx(st.layer, className)} style={vars({ "--k": k })}>
      {children}
    </div>
  );
  const unit = still ? pageU : `min(${pageU}, calc(100svh / ${H}))`;
  return (
    <div ref={wrap} className={cx(st.gateWrap, still && st.still)} style={vars(still ? { "--u": unit, "--g": unit, "--o": 0, "--lift": H, height: U(H), marginBottom: 0 } : { "--u": unit, "--g": unit, "--lift": H })}>
      <div className={st.gate} aria-label={t("Taklifnoma")} style={still ? { position: "relative", height: "100%" } : undefined}>
        {/* 1.0 — osmon: Figma kadri bo‘yicha gradient (pastga bog‘langan); baland ekranda tepada fon rangi davom etadi */}
        {layer(1, <div aria-hidden className={st.gSky} style={vars({ "--hh": U(H) })} />)}
        {!still && <Fall />}
        {/* 0.4 — yulduzlar, qor zarralari */}
        {layer(
          0.4,
          <>
            {wide &&
              can(
                <>
                  <Snow dots={SNOW.hero.side} />
                  {/* kanvasdan tashqarida (juda keng ekranlarda) — o‘sha nuqtalar yon tomonlarda takrorlanadi */}
                  <Snow dots={SNOW.hero.side} className={st.snowL} />
                  <Snow dots={SNOW.hero.side} className={st.snowR} />
                  {(
                    [
                      [120, 90, 18],
                      [1300, 110, 22],
                      [420, 300, 12],
                      [1050, 260, 14],
                      [1380, 420, 12],
                      [60, 460, 12],
                    ] as const
                  ).map(([x, y, s], i) => (
                    <Star key={i} x={x} y={y} s={s} a="" className={st.gStar} />
                  ))}
                </>,
              )}
            {col(
              <>
                <Snow dots={SNOW.hero.col} />
                {!wide && (
                  <>
                    {/* Figma kadridan tashqarida (sahna ekrandan tor bo‘lsa) — o‘sha nuqtalar yon tomonlarda takrorlanadi */}
                    <Snow dots={SNOW.hero.col} className={st.snowL} />
                    <Snow dots={SNOW.hero.col} className={st.snowR} />
                  </>
                )}
                {(
                  [
                    [40, 60, 16],
                    [330, 90, 22],
                    [300, 250, 12],
                    [60, 300, 12],
                    [210, 30, 10],
                  ] as const
                ).map(([x, y, s], i) => (
                  <Star key={i} x={x} y={y} s={s} a="" className={st.gStar} />
                ))}
              </>,
            )}
          </>,
        )}
        {/* 0.8 — sarlavha, sana, qisqa izoh (oltin archa 1.0 tezlikda ham ularga yetib kelmaydi — rasm matn ustiga tushmaydi) */}
        {layer(
          0.8,
          <>
            <HeroTitle rows={d.titleRows} Z={Z} X={X} Y={Y} S={S} />
            {d.dateLine && (
              <div className="absolute flex justify-center" style={{ left: X(0), width: Z(390), top: Y(272) }}>
                <p
                  className={cx(st.r6, st.pill, st.gPop)}
                  style={{ height: Z(45), padding: `0 ${Z(26)}`, borderRadius: Z(30), fontSize: Z(18), lineHeight: `${Z(45)}`, maxWidth: Z(342), whiteSpace: "nowrap" }}
                >
                  <Fit base={18 * S} max={290 * S} deps={d.dateLine}>
                    {d.dateLine}
                  </Fit>
                </p>
              </div>
            )}
            {d.tagline && (
              <p className={cx(st.r5, st.clamp2, "absolute text-center")} style={{ left: X(24), width: Z(342), top: Y(334), fontSize: Z(17), lineHeight: `${Z(20)}`, color: "#fff" }}>
                <span className={cx(st.gIn, "block")} style={vars({ "--gd": "0.9s" })}>
                  {d.tagline}
                </span>
              </p>
            )}
          </>,
        )}
        {/* 0.55 — osma yo‘l: arqon va vagon (vagon yuklanganda o‘ngdan suzib keladi, scrollda arqon bo‘ylab chapga suzadi) */}
        {layer(
          0.55,
          wide
            ? can(
                <>
                  <Rope x1={-104.92} y1={764.95} x2={1544.92} y2={352.32} ext={1} />
                  <div className={st.gCar} style={vars({ "--cx": U(-90), "--cy": U(22.5) })}>
                    <Art name="vagon" x={1105} y={375} w={150} h={150} inner={st.gCarIn} eager />
                  </div>
                </>,
              )
            : col(
                <>
                  <Rope x1={-57.42} y1={533.48} x2={447.42} y2={406.52} ext={1.5} />
                  <div className={st.gCar} style={vars({ "--cx": U(-70), "--cy": U(17.6) })}>
                    <Art name="vagon" x={252} y={422} w={96} h={96} inner={st.gCarIn} eager />
                  </div>
                </>,
              ),
        )}
        {/* 0.7 — uychalar */}
        {layer(
          0.7,
          <>
            {wide &&
              can(
                <>
                  <Art name="uycha" x={130} y={738.5} w={220} h={183} inner={st.gRise} eager />
                  <Art name="uycha" x={1090} y={750} w={240} h={200} inner={cx(st.gRise, st.gD2)} eager />
                </>,
              )}
            {col(
              <>
                <Art name="uycha" x={-3} y={636} w={130} h={108} inner={cx(st.gRise, st.gD1)} eager />
                <Art name="uycha" x={285} y={654} w={110} h={92} inner={cx(st.gRise, st.gD3)} eager />
              </>,
            )}
          </>,
        )}
        {/* 0.85 — archalar (mobil: hammasi; laptop: yon archalar — ustun archalari Figma’dagidek tepaliklar ustida) */}
        {layer(
          0.85,
          wide
            ? can(
                <>
                  <Art name="archalar" x={-70} y={863.5} w={380} h={253} inner={st.gRise} eager />
                  <Art name="archalar" x={1140} y={873.5} w={380} h={253} inner={cx(st.gRise, st.gD2)} eager />
                  <Art name="archalar" x={280} y={926.5} w={280} h={187} inner={cx(st.gRise, st.gD1)} eager />
                  <Art name="archalar" x={890} y={936.5} w={280} h={187} inner={cx(st.gRise, st.gD3)} eager />
                </>,
              )
            : col(
                <>
                  <Art name="archalar" x={-60} y={733.5} w={200} h={133} inner={cx(st.gRise, st.gD1)} eager />
                  <Art name="archalar" x={260} y={743.5} w={200} h={133} inner={cx(st.gRise, st.gD2)} eager />
                </>,
              ),
        )}
        {/* 1.0 — qor tepaliklari (pastki oq chiziq — sahna eni bo‘ylab; ostidan keyingi bo‘lim chiqadi) */}
        {layer(1, wide ? can(<Hills list={HILLS_L} rectY={1168} rectH={80} rectW={1440} ext />) : col(<Hills list={HILLS_M} rectY={970} rectH={70} rectW={390} ext />))}
        {wide &&
          layer(
            0.85,
            col(
              <>
                <Art name="archalar" x={-60} y={733.5} w={200} h={133} inner={cx(st.gRise, st.gD1)} eager />
                <Art name="archalar" x={260} y={743.5} w={200} h={133} inner={cx(st.gRise, st.gD2)} eager />
              </>,
            ),
          )}
        {/* 1.0 — oltin archa (chiroqlari sekin miltillaydi) */}
        {layer(
          1,
          col(
            <Art name="archa" x={85} y={603.5} w={220} h={283} inner={st.gTree} eager>
              {!still && <Lights />}
            </Art>,
          ),
        )}
      </div>
    </div>
  );
}

/* ═════════════ Bo‘lim qobig‘i ═════════════ */
type Bg = "white" | "navy" | "deep" | "ice" | "sky";
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

/** Sarlavha (Old Standard Italic, markazda, 360 da sig‘adi); `gold` — oltin gradient */
function Title({ text, size = 40, h = 49, color = NAVY, gold, d = 0, style }: { text: string; size?: number; h?: number; color?: string; gold?: boolean; d?: number; style?: CSSProperties }) {
  return (
    <p
      data-a="up"
      className={cx(st.osi, "text-center")}
      style={vars({ height: U(h), fontSize: U(size), lineHeight: `${U(h)}`, color: gold ? undefined : color, whiteSpace: "nowrap", "--d": `${d}s`, ...(style as Record<string, string>) })}
    >
      <Fit base={size} max={342} deps={text}>
        {gold ? <Gold>{text}</Gold> : text}
      </Fit>
    </p>
  );
}

/** Ikki qatorli sarlavha (Figma: «Bir yillik / lahzalar», «Sizni / kutamiz!») — qatorlar teng bo‘linadi, har qator sig‘masa kichrayadi */
function TwoRows({ text, size, lh, gold, color, className, rowClass }: { text: string; size: number; lh: number; gold?: boolean; color?: string; className?: string; rowClass?: string }) {
  const rows = split2(text) ?? [text];
  return (
    <div className={cx(st.osi, "text-center", className)} style={{ color: gold ? undefined : color }}>
      {rows.map((r, i) => (
        <span key={i} className={cx("block", rowClass)} style={vars({ height: U(lh), fontSize: U(size), lineHeight: `${U(lh)}`, whiteSpace: "nowrap", "--fk": i })}>
          <Fit base={size} max={342} deps={r}>
            {gold ? <Gold>{r}</Gold> : r}
          </Fit>
        </span>
      ))}
    </div>
  );
}

/* ═════════════ 01 · Taklif — chok ustida o‘yinchoq poyezd; murojaat (mehmon ismi bilan), matn, «kecha mazmuni», sana kartasi, imzo ═════════════ */
function Taklif({ d, z }: { d: D; z: number }) {
  const t = useT();
  const hello = d.guest ? guestHello(t, "Hurmatli {guest}!", d.guest) : t("Hurmatli hamkasblar!");
  const hl = d.highlights;
  return (
    <Sec z={z} bg="white" colStyle={{ paddingTop: U(140), paddingBottom: U(d.sign ? 169 : 120) }}>
      {/* o‘yinchoq poyezd — chok ustida (yarmi hero ustida; ochilishda sahnadagi nusxasi bilan aynan bir joyda) */}
      <div aria-hidden className={st.seamTrain} style={{ left: U(30), top: U(-69), width: U(330), height: U(138) }}>
        <Img src={`${P}/poyezd.webp`} />
      </div>
      <h2
        data-a="up"
        className={cx(st.osi, "relative mx-auto text-center")}
        style={vars({
          width: U(342),
          minHeight: U(84),
          fontSize: U(40),
          lineHeight: `${U(42)}`,
          color: NAVY,
          overflowWrap: "anywhere",
          textWrap: "balance",
          "--d": "0.05s",
        })}
      >
        {hello}
      </h2>
      <p
        data-a="up"
        className={cx(st.r4, "relative mx-auto text-center")}
        style={vars({
          marginTop: U(38),
          width: U(330),
          minHeight: U(87),
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
      {hl.length > 0 &&
        (hl.join("").length <= 40 ? (
          <div data-a="up" className="relative flex justify-center" style={vars({ marginTop: U(91), height: U(18), "--d": "0.18s" })}>
            <Fit base={15} max={351} deps={hl.join("|")} className={st.r6} style={{ color: NAVY, lineHeight: `${U(18)}` }}>
              {hl.map((h, i) => (
                <span key={i}>
                  {i > 0 && <span aria-hidden className={st.hlBar} style={{ width: U(1.5), height: U(16), margin: `0 ${U(12)}` }} />}
                  {h}
                </span>
              ))}
            </Fit>
          </div>
        ) : (
          // uzun bandlar — bir qatorga sig‘maydi (juda kichrayib ketadi): har biri alohida qatorda, oralarida oltin chiziqcha
          <div data-a="up" className={cx(st.r6, "relative mx-auto flex flex-col items-center text-center")} style={vars({ marginTop: U(70), width: U(342), gap: U(8), color: NAVY, "--d": "0.18s" })}>
            {hl.map((h, i) => (
              <p key={i} className="flex flex-col items-center" style={{ fontSize: U(15), lineHeight: `${U(20)}`, overflowWrap: "anywhere", gap: U(8) }}>
                {i > 0 && <span aria-hidden className={st.hlBar} style={{ width: U(16), height: U(1.5) }} />}
                {h}
              </p>
            ))}
          </div>
        ))}
      {d.dayLong && (
        <div
          data-a="rise"
          className={cx(st.dateCard, "relative mx-auto flex flex-col items-center justify-center text-center")}
          style={vars({ marginTop: U(hl.length ? 52 : 70), width: U(342), height: U(110), borderRadius: U(24), gap: U(13), "--d": "0.24s" })}
        >
          <p className={st.os} style={{ height: U(27), fontSize: U(22), lineHeight: `${U(27)}`, color: NAVY, whiteSpace: "nowrap" }}>
            <Fit base={22} max={310} deps={d.dayLong}>
              {d.dayLong}
            </Fit>
          </p>
          {d.timeCity && (
            <p className={st.r5} style={{ height: U(19), fontSize: U(16), lineHeight: `${U(19)}`, color: MUTED, whiteSpace: "nowrap" }}>
              <Fit base={16} max={310} deps={d.timeCity}>
                {d.timeCity}
              </Fit>
            </p>
          )}
        </div>
      )}
      {d.sign && (
        <p
          data-a="up"
          className={cx(st.r6, "relative mx-auto text-center")}
          style={vars({ marginTop: U(50), width: U(342), minHeight: U(21), fontSize: U(18), lineHeight: `${U(21)}`, color: NAVY, overflowWrap: "anywhere", "--d": "0.3s" })}
        >
          {d.sign}
        </p>
      )}
    </Sec>
  );
}

/* ═════════════ 02 · Jamoa surati — oltin ramka chizig‘i chiziladi, surat ramka ichida pastdan ko‘tariladi (surat bo‘lmasa — bo‘lim yo‘q) ═════════════ */
function Team({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  if (!d.team1) return null;
  return (
    <Sec
      z={z}
      bg="navy"
      colStyle={{ height: U(720) }}
      outer={
        <Side wide={wide}>
          <Snow dots={SNOW.team.side} unit={C} />
          <Star x={200} y={140} s={20} unit={C} />
          <Star x={1240} y={240} s={16} unit={C} d={0.2} />
          <Art name="archalar" x={80} y={620} w={300} h={200} unit={C} a="rise" px />
        </Side>
      }
    >
      <Snow dots={SNOW.team.col} />
      <svg aria-hidden data-a="frame" viewBox="0 0 330 462" className={cx(st.svg, st.frame)} style={{ left: U(30), top: U(94), width: U(330), height: U(462) }}>
        <rect x="0.6" y="0.6" width="328.8" height="460.8" rx="33.4" pathLength={1} />
      </svg>
      <div data-a="photo" className={st.photo} style={vars({ left: U(42), top: U(106), width: U(306), height: U(438), borderRadius: U(26), "--d": "0.25s" })}>
        <Img src={d.team1} className={st.teamImg} />
      </div>
      <Star x={330} y={70} s={20} d={0.5} />
      <Star x={30} y={560} s={14} d={0.7} />
      <Art name="archalar" x={255} y={583.5} w={170} h={113} a="rise" d={0.4} />
    </Sec>
  );
}

/* ═════════════ 03 · Kecha dasturi — oq kartalar 100 ms navbat bilan pastdan chiqadi ═════════════ */
function Program({ d, z }: { d: D; z: number }) {
  const t = useT();
  const items = d.program.slice(0, 8);
  if (!items.length) return null;
  return (
    <Sec z={z} bg="ice" colStyle={{ paddingTop: U(90), paddingBottom: U(126) }}>
      <Title text={t("Kecha dasturi")} />
      <div className="relative mx-auto flex flex-col" style={{ marginTop: U(31), width: U(342), gap: U(16) }}>
        {items.map((it, i) => (
          <div
            key={i}
            data-a="up"
            className={cx(st.pRow, "relative flex items-center")}
            style={vars({ minHeight: U(96), padding: `${U(18)} ${U(24)}`, borderRadius: U(24), "--d": `${0.1 + i * 0.1}s` })}
          >
            <p className={cx(st.os, st.ptime)} style={{ width: U(94), height: U(35), fontSize: U(28), lineHeight: `${U(35)}`, color: GOLD }}>
              <Fit base={28} max={86} deps={it.time}>
                {it.time}
              </Fit>
            </p>
            <p className={cx(st.r6, st.clamp2, "min-w-0 flex-1")} style={{ fontSize: U(17), lineHeight: `${U(20)}`, color: INK }}>
              {it.title}
            </p>
          </div>
        ))}
      </div>
    </Sec>
  );
}

/* ═════════════ 04 · Bir yillik lahzalar — galereya: har surat pastdan ko‘tariladi, ichki maska yuqoridan pastga ochiladi (120 ms navbat).
 * Suratlar bo‘lmasa — bo‘lim yo‘qoladi; 1 ta — katta; 2 ta — ikkita tik; 3 ta — Figma ═════════════ */
function Gallery({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const list = d.gallery;
  if (!list.length) return null;
  const big = list.length !== 2 ? list[0] : null;
  const small = list.length === 2 ? list : list.slice(1);
  const photo = (src: string, w: number, h: number, i: number, tall?: boolean) => (
    <div data-a="gal" className={st.gal} style={vars({ width: U(w), height: U(h), borderRadius: U(26), "--d": `${0.08 + i * 0.12}s` })}>
      <Img src={src} className={cx(st.galImg, tall && st.galImgT)} />
    </div>
  );
  return (
    <Sec
      z={z}
      bg="deep"
      colStyle={{ paddingTop: U(90), paddingBottom: U(158) }}
      outer={
        <Side wide={wide}>
          <Snow dots={SNOW.gal.side} unit={C} />
          <Star x={180} y={200} s={18} unit={C} />
          <Star x={1260} y={700} s={16} unit={C} d={0.2} />
          <Star x={1200} y={160} s={12} unit={C} d={0.35} />
        </Side>
      }
    >
      <Snow dots={SNOW.gal.col} />
      <div data-a="up">
        <TwoRows text={t("Bir yillik lahzalar")} size={40} lh={42} gold />
      </div>
      <div className="relative mx-auto" style={{ marginTop: U(46), width: U(342) }}>
        {big && photo(big, 342, 256, 0)}
        {small.length > 0 && (
          <div className="flex" style={{ marginTop: big ? U(16) : 0, gap: U(10) }}>
            {small.map((s, i) => (
              <div key={i}>{photo(s, 166, 250, i + 1, true)}</div>
            ))}
          </div>
        )}
      </div>
      <Star x={330} y={180} s={18} d={0.4} />
      <Star x={30} y={780} s={14} d={0.6} />
    </Sec>
  );
}

/* ═════════════ 05 · Bazmgacha — taymer: muzli plitkalar, raqamlar har soniyada almashadi; kalendarga qo‘shish ═════════════ */
/**
 * Raqamlar doim 2 xonali («05»). Sanoq tugagach o‘zgargan raqam yuqoridan varaqlanadi (rotateX −70° → 0, shaffofliksiz):
 * oldingi «0» o‘chib qoladigan bironta kadr yo‘q (pozitsiya bo‘yicha kalit; yangi raqam faqat o‘zgarganda almashadi).
 */
function Digits({ value, run, len, i, cls }: { value: number; run: boolean; len: number; i: number; cls?: string }) {
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
          <span key={dg} className={cx(cls, live && st.tick)}>
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
      bg="sky"
      colStyle={{ height: U(620) }}
      outer={
        <Side wide={wide}>
          <Snow dots={SNOW.timer.side} unit={C} />
          <Star x={200} y={180} s={16} unit={C} />
          <Art name="vagon" x={1135} y={225} w={150} h={150} unit={C} a="glide" px />
        </Side>
      }
    >
      <Snow dots={SNOW.timer.col} />
      <div className="absolute inset-x-0" style={{ top: U(90) }}>
        <Title text={t("Bazmgacha")} color="#fff" />
      </div>
      <div ref={ref} className="absolute flex" style={{ left: U(24), top: U(176), width: U(339), height: U(100), gap: U(9) }}>
        {vals.map((v, i) => (
          <div
            key={i}
            data-a="tile"
            className={st.tile}
            style={vars({ width: U(78), height: U(100), borderRadius: U(20), borderWidth: U(1), "--d": `${0.1 + i * 0.12}s` })}
          >
            <p className={cx(st.os, "absolute inset-x-0 text-center")} style={{ top: U(15), height: U(42), fontSize: U(34), lineHeight: `${U(42)}`, whiteSpace: "nowrap" }}>
              <Fit base={34} max={68} deps={String(vals[0]).length}>
                {/* oltin gradient — har raqamning o‘zida (varaqlanayotgan raqam ham ko‘rinib turadi) */}
                <Digits value={v} run={inView} len={i === 0 ? Math.max(2, String(vals[0]).length) : 2} i={i} cls={st.gold} />
              </Fit>
            </p>
            <p className={cx(st.r5, "absolute inset-x-0 text-center")} style={{ top: U(67), height: U(16), fontSize: U(13), lineHeight: `${U(16)}`, color: "rgba(255,255,255,.85)", whiteSpace: "nowrap" }}>
              <Fit base={13} max={68} deps={units[i]}>
                {units[i]}
              </Fit>
            </p>
          </div>
        ))}
      </div>
      {d.dateLine && (
        <p
          data-a="up"
          className={cx(st.r6, "absolute inset-x-0 text-center")}
          style={vars({ top: U(316), height: U(21), fontSize: U(18), lineHeight: `${U(21)}`, color: "#fff", whiteSpace: "nowrap", "--d": "0.25s" })}
        >
          <Fit base={18} max={342} deps={d.dateLine}>
            {d.dateLine}
          </Fit>
        </p>
      )}
      <div data-a="up" className="absolute inset-x-0 flex justify-center" style={vars({ top: U(366), "--d": "0.35s" })}>
        <button
          type="button"
          className={cx(st.r6, st.btnWhite)}
          style={{ minWidth: U(250), maxWidth: U(342), height: U(56), padding: `0 ${U(22)}`, fontSize: U(16), borderRadius: U(28) }}
          onClick={() =>
            downloadIcs({
              title: d.calTitle,
              startLocal: `${d.iso}T${d.time || "18:00"}`,
              location: [d.venueTitle, d.address].filter(Boolean).join(", "),
              slug: "poyezd",
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

/* ═════════════ 06 · Manzil — chok ustida osma vagon; surat (mijozning 5-surati; bo‘lmasa — bazm zali) sekin 1.05 → 1, joy nomi, manzil,
 * xarita va yo‘nalish ═════════════ */
function Venue({ d, z, linkable }: { d: D; z: number; linkable: boolean }) {
  const t = useT();
  if (!d.hasPlace) return null;
  const btn = (s: string) => (
    <Fit base={16} max={140} deps={s}>
      {s}
    </Fit>
  );
  return (
    <Sec z={z} bg="white" colStyle={{ paddingTop: U(100), paddingBottom: U(164) }}>
      <Art name="vagon" x={285} y={-65} w={90} h={90} a="glide" className={st.seamCar} />
      <Title text={t("Manzil")} />
      <div
        data-a="zoom"
        className="relative mx-auto overflow-hidden"
        style={vars({ marginTop: U(27), width: U(342), height: U(236), borderRadius: U(26), background: DEEP, "--d": "0.1s" })}
      >
        <Img src={d.hall} className={st.zoomImg} />
      </div>
      {d.venueTitle && (
        <p
          data-a="up"
          className={cx(st.r7, "mx-auto text-center")}
          style={vars({ marginTop: U(28), width: U(342), minHeight: U(26), fontSize: U(22), lineHeight: `${U(26)}`, color: INK, overflowWrap: "anywhere", textWrap: "balance", "--d": "0.15s" })}
        >
          {d.venueTitle}
        </p>
      )}
      {d.address && (
        <p
          data-a="up"
          className={cx(st.r4, "mx-auto text-center")}
          style={vars({ marginTop: U(16), width: U(330), minHeight: U(48), fontSize: U(16), lineHeight: `${U(24)}`, color: MUTED, overflowWrap: "anywhere", "--d": "0.22s" })}
        >
          {d.address}
        </p>
      )}
      <div data-a="up" className="relative mx-auto flex" style={vars({ marginTop: U(50), width: U(342), gap: U(12), "--d": "0.3s" })}>
        <a
          href={linkable ? d.mapUrl : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(st.r6, st.btnNavy)}
          style={{ flex: "1 1 0", minWidth: 0, height: U(56), padding: `0 ${U(10)}`, fontSize: U(16), borderRadius: U(28) }}
        >
          {btn(t("Xaritada ochish"))}
        </a>
        <a
          href={linkable ? d.taxi : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(st.r6, st.btnLine)}
          style={{ flex: "1 1 0", minWidth: 0, height: U(56), padding: `0 ${U(10)}`, fontSize: U(16), borderWidth: U(1.4), borderRadius: U(28) }}
        >
          {btn(t("Yo‘nalish"))}
        </a>
      </div>
    </Sec>
  );
}

/* ═════════════ 07 · Dress-kod (ixtiyoriy — o‘chirilsa joy qolmaydi): oq karta — turi (Old Standard kursiv) va izoh ═════════════ */
function Dress({ d, z }: { d: D; z: number }) {
  if (!d.dressNote && !d.dressTitle) return null;
  return (
    <Sec z={z} bg="navy" colStyle={{ paddingTop: U(40), paddingBottom: U(92) }}>
      <div
        data-a="rise"
        className={cx(st.dressCard, "relative mx-auto flex flex-col items-center justify-center text-center")}
        style={{ width: U(342), minHeight: U(168), padding: `${U(32)} ${U(30)}`, gap: U(12), borderRadius: U(28) }}
      >
        {d.dressTitle && (
          <p className={st.osi} style={{ height: U(41), fontSize: U(32), lineHeight: `${U(41)}`, color: NAVY, whiteSpace: "nowrap" }}>
            <Fit base={32} max={282} deps={d.dressTitle}>
              {d.dressTitle}
            </Fit>
          </p>
        )}
        {d.dressNote && (
          <p className={st.r4} style={{ width: "100%", fontSize: U(17), lineHeight: 1.5, color: INK, overflowWrap: "anywhere" }}>
            {d.dressNote}
          </p>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 08 · Anketa — javob («Kelaman» bosilsa tugma to‘ladi va oltin uchqunlar sochiladi) ═════════════ */
const SPARKS = [
  [-1, -0.9],
  [-0.55, -1.25],
  [0.1, -1.35],
  [0.65, -1.15],
  [1.05, -0.7],
  [-0.95, 0.35],
  [0.95, 0.4],
] as const;
function Rsvp({ d, slug, mode, z }: { d: D; slug: string; mode: InvitationSiteProps["mode"]; z: number }) {
  const t = useT();
  const live = mode === "live";
  const [name, setName] = useState("");
  const [status, setStatus] = useState<RsvpStatus>("coming");
  const [count, setCount] = useState(1);
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
    <p className={cx(st.r7, st.lbl)} style={{ marginTop: U(mt), height: U(16), fontSize: U(14), lineHeight: `${U(16)}` }}>
      {s}
    </p>
  );
  const sub = d.rsvpUntil ? t("Iltimos, {date} javob bering", { date: d.rsvpUntil }) : t("Javobingizni kutamiz");
  const pick = (s: RsvpStatus) => {
    setStatus(s);
    if (s === "coming") setBurst((n) => n + 1);
  };
  return (
    <Sec z={z} bg="white" id="poyezd-javob" colStyle={{ paddingTop: U(100), paddingBottom: U(96) }}>
      <h2
        data-a="up"
        className={cx(st.osi, "mx-auto text-center")}
        style={vars({ width: U(342), minHeight: U(52), fontSize: U(42), lineHeight: `${U(52)}`, color: NAVY, overflowWrap: "anywhere", "--d": "0.05s" })}
      >
        {t("Kelasizmi?")}
      </h2>
      <p
        data-a="up"
        className={cx(st.r4, "mx-auto text-center")}
        style={vars({ marginTop: U(12), width: U(342), minHeight: U(19), fontSize: U(16), lineHeight: `${U(19)}`, color: MUTED, overflowWrap: "anywhere", "--d": "0.12s" })}
      >
        {sub}
      </p>
      <div
        data-a="rise"
        className={cx(st.card, "relative mx-auto")}
        style={vars({ marginTop: U(31), width: U(342), padding: `${U(24)} ${U(22)} ${U(62)}`, borderRadius: U(28), "--d": "0.2s" })}
      >
        {sent ? (
          <div key="thanks" className={cx(st.thanks, "relative flex flex-col items-center text-center")} style={{ padding: `${U(30)} ${U(6)} ${U(10)}`, gap: U(16), minHeight: U(480) }}>
            <div className="relative" style={{ width: U(120), height: U(154) }}>
              <Img src={`${P}/archa.webp`} className={st.thanksTree} />
            </div>
            <p className={st.osi} style={{ fontSize: U(sent === "not_coming" ? 36 : 30), lineHeight: 1.25, color: NAVY, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Rahmat!") : t("Rahmat! Joyingiz band qilindi")}
            </p>
            <p className={st.r4} style={{ fontSize: U(17), color: MUTED, lineHeight: 1.5, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Javobingiz uchun rahmat!") : t("{name} — {count} kishi. Javobingiz yetkazildi.", { name: name.trim() || t("Javobingiz"), count })}
            </p>
            <button type="button" onClick={() => setSent(null)} className={st.r6} style={{ fontSize: U(16), color: NAVY, textDecoration: "underline", textUnderlineOffset: 3 }}>
              {t("Javobni o‘zgartirish")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="relative flex flex-col items-stretch">
            {label(t("Ismingiz"), 0)}
            <label className={st.field} style={{ marginTop: U(8), height: U(54), padding: `0 ${U(16)}`, borderRadius: U(16) }}>
              <input
                className={cx(st.r4, st.input)}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder={t("Ism va familiya")}
                aria-label={t("Ismingiz")}
                style={{ fontSize: U(17), lineHeight: `${U(22)}` }}
              />
            </label>
            {label(t("Kelasizmi?"), 22)}
            <div className="flex w-full" role="radiogroup" aria-label={t("Kelasizmi?")} style={{ marginTop: U(8), gap: U(8) }}>
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
                  className={cx(st.r6, st.choice)}
                  style={{ flex: "1 1 0", padding: `${U(4)} ${U(6)}`, minHeight: U(54), fontSize: U(16), borderWidth: U(1.4), borderRadius: U(27) }}
                >
                  <span style={{ overflowWrap: "anywhere" }}>{t(l)}</span>
                  {s === "coming" && burst > 0 && (
                    <span key={burst} aria-hidden className={st.sparks}>
                      {SPARKS.map(([px, py], i) => (
                        <span key={i} className={st.spark} style={vars({ "--px": px, "--py": py, "--pd": `${i * 0.03}s` })} />
                      ))}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {status === "coming" && (
              <>
                {label(t("Necha kishi bo‘lasiz?"), 22)}
                <div className={cx(st.counter, "justify-between")} style={{ marginTop: U(8), height: U(54), padding: `0 ${U(8)}`, borderRadius: U(27) }}>
                  <button
                    type="button"
                    className={cx(st.r7, st.step)}
                    disabled={count <= 1}
                    onClick={() => setCount((n) => Math.max(1, n - 1))}
                    aria-label={t("Kamaytirish")}
                    style={{ width: U(40), height: U(40), fontSize: U(22) }}
                  >
                    −
                  </button>
                  <span className={st.os} style={{ fontSize: U(28), lineHeight: 1.2, color: INK }} aria-live="polite">
                    {count}
                  </span>
                  <button
                    type="button"
                    className={cx(st.r7, st.step)}
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
            {label(t("Tilaklaringiz"), 24)}
            <label className={st.field} style={{ marginTop: U(8), height: U(130), padding: U(16), borderRadius: U(16), alignItems: "stretch" }}>
              <textarea
                className={cx(st.r4, st.input)}
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                maxLength={500}
                placeholder={t("Yozing…")}
                aria-label={t("Tilaklaringiz")}
                style={{ fontSize: U(17), lineHeight: `${U(22)}`, height: "100%" }}
              />
            </label>
            {err && (
              <p className={st.r4} style={{ marginTop: U(12), color: "#c2410c", fontSize: U(15) }}>
                {err}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className={cx(st.r6, st.submit)}
              style={{ marginTop: U(32), minHeight: U(56), padding: `${U(8)} ${U(12)}`, fontSize: U(16), borderRadius: U(28), opacity: busy ? 0.7 : 1 }}
            >
              {busy ? t("Yuborilmoqda…") : t("Yuborish")}
            </button>
          </form>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 09 · Final — scroll bilan (--fc: 0 … 1 = Figma kadri; sahifa oxirigacha albatta tugaydi): «Sizni kutamiz!» va jamoa nomi
 * pastdan chiqadi, osma vagon arqon bo‘ylab chapdan o‘ngga suzib keladi, uychalar va archalar ko‘tariladi, oltin archa o‘sadi,
 * o‘yinchoq poyezd archa oldidan chapdan kirib keladi ═════════════ */
const HILLS_FM: Hill[] = HILLS_M;
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
  return (
    <Sec
      secRef={ref}
      z={z}
      bg="sky"
      className={st.finalWrap}
      style={still ? vars({ "--fc": 1 }) : undefined}
      colStyle={{ height: U(980) }}
      outer={
        <Side wide={wide}>
          <Snow dots={SNOW.final.side} unit={C} />
          {(
            [
              [160, 90, 18],
              [1280, 120, 22],
              [400, 280, 12],
              [1100, 320, 12],
            ] as const
          ).map(([x, y, s], i) => (
            <Star key={i} x={x} y={y} s={s} unit={C} a="" />
          ))}
          <Rope x1={-111.28} y1={322.59} x2={1551.86} y2={677.41} unit={C} />
          <div className={st.fCar} style={vars({ "--cx": C(-420), "--cy": C(-89.6), "--fk": 0 })}>
            <Art name="vagon" x={1110} y={550} w={140} h={140} unit={C} />
          </div>
          <div className={st.fRise} style={vars({ "--fk": 1 })}>
            <Art name="uycha" x={140} y={728.5} w={220} h={183} unit={C} />
          </div>
          <div className={st.fRise} style={vars({ "--fk": 2 })}>
            <Art name="uycha" x={1105} y={734} w={230} h={192} unit={C} />
          </div>
          <div className={st.fRise} style={vars({ "--fk": 2 })}>
            <Art name="archalar" x={-70} y={853.5} w={380} h={253} unit={C} />
            <Art name="archalar" x={1140} y={858.5} w={380} h={253} unit={C} />
          </div>
          <div className={st.fRise} style={vars({ "--fk": 3 })}>
            <Art name="archalar" x={290} y={916.5} w={280} h={187} unit={C} />
            <Art name="archalar" x={880} y={921.5} w={280} h={187} unit={C} />
          </div>
          <Hills list={HILLS_L} dy={-72} unit={C} rectY={1168} rectH={80} rectW={1440} />
        </Side>
      }
    >
      <Snow dots={SNOW.final.col} />
      {(
        [
          [40, 60, 14],
          [340, 80, 20],
          [200, 30, 10],
          [320, 300, 12],
        ] as const
      ).map(([x, y, s], i) => (
        <Star key={i} x={x} y={y} s={s} a="" />
      ))}
      <div className={cx(st.fUp, "absolute inset-x-0")} style={vars({ top: U(110), "--fk": 0 })}>
        <TwoRows text={t("Sizni kutamiz!")} size={64} lh={64} gold />
      </div>
      {d.team && (
        <p
          className={cx(st.r6, st.fUp, st.clamp2, "absolute mx-auto text-center")}
          style={vars({ left: U(24), width: U(342), top: U(270), fontSize: U(18), lineHeight: `${U(21)}`, color: "#fff", textWrap: "balance", "--fk": 1 })}
        >
          {d.team}
        </p>
      )}
      {!wide && (
        <>
          <Rope x1={-59.19} y1={365.36} x2={449.69} y2={474.64} />
          <div className={st.fCar} style={vars({ "--cx": U(-260), "--cy": U(-55.9), "--fk": 0 })}>
            <Art name="vagon" x={45} y={355} w={90} h={90} />
          </div>
        </>
      )}
      <div className={st.fRise} style={vars({ "--fk": 1 })}>
        <Art name="uycha" x={260} y={640} w={120} h={100} />
      </div>
      {wide ? (
        <>
          <div className={st.fRise} style={vars({ "--fk": 2 })}>
            <Art name="archalar" x={-50} y={736.5} w={220} h={147} />
          </div>
          <div className={st.fRise} style={vars({ "--fk": 3 })}>
            <Art name="archalar" x={260} y={770} w={180} h={120} />
          </div>
        </>
      ) : (
        <>
          <div className={st.fRise} style={vars({ "--fk": 2 })}>
            <Art name="archalar" x={-50} y={736.5} w={220} h={147} />
          </div>
          <div className={st.fRise} style={vars({ "--fk": 3 })}>
            <Art name="archalar" x={260} y={770} w={180} h={120} />
          </div>
          <Hills list={HILLS_FM} dy={-60} rectY={970} rectH={70} rectW={390} />
        </>
      )}
      <div className={st.fTree}>
        <Art name="archa" x={90} y={651.5} w={200} h={257}>
          {!still && <Lights />}
        </Art>
      </div>
      <div className={st.fTrain}>
        <Art name="poyezd" x={50} y={837.5} w={300} h={125} />
      </div>
    </Sec>
  );
}

/* ═════════════ Musiqa tugmasi — Figma «Ertak / Musiqa tugmasi (fixed)»: oq doira (52), oltin hoshiya 1.5, 4 ta ko‘k chiziq beatga mos;
 * o‘chirilgan — chiziqlar kalta (4 px) ═════════════ */
const BARS = [10, 18, 13, 20];
function PoyezdMusic({ m, wide, embedded }: { m: ReturnType<typeof useMusic>; wide: boolean; embedded: boolean }) {
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
type Key = "taklif" | "team" | "program" | "gallery" | "timer" | "venue" | "dress" | "rsvp" | "final";

export function PoyezdSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const loaded = usePreload(
    [`${P}/archa.webp`, `${P}/uycha.webp`, `${P}/archalar.webp`, `${P}/vagon.webp`, `${P}/poyezd.webp`],
    [d.team1, ...d.gallery, d.hall].filter(Boolean),
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

  const shown: Key[] = (["taklif", "team", "program", "gallery", "timer", "venue", "dress", "rsvp", "final"] as Key[]).filter((k) =>
    k === "team"
      ? !!d.team1
      : k === "gallery"
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
      <div className={st.page} style={vars({ "--u": colU })}>
        <PoyezdMusic m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/vagon.webp`} />}
        <div className={st.flow}>
          {withGate && (loaded ? <Gate d={d} wide={wide} onStart={() => music.play(true)} /> : <div className={st.gateHold} />)}
          {embedded && <Gate d={d} wide={wide} still onStart={() => {}} />}
          <Taklif d={d} z={21} />
          <Team d={d} z={z("team")} wide={wide} />
          <Program d={d} z={z("program")} />
          <Gallery d={d} z={z("gallery")} wide={wide} />
          <Timer d={d} z={z("timer")} wide={wide} />
          <Venue d={d} z={z("venue")} linkable={linkable} />
          <Dress d={d} z={z("dress")} />
          {data.rsvpEnabled && <Rsvp d={d} slug={data.slug} mode={mode} z={z("rsvp")} />}
          <Final d={d} z={z("final")} wide={wide} still={embedded} onSeen={onFinal} />
        </div>
        <footer className={cx(st.footer, "flex items-start justify-center")} style={{ height: U(120), paddingTop: U(50) }}>
          <p className={cx(st.r5, "text-center")} style={{ fontSize: U(14), lineHeight: `${U(16)}`, color: "rgba(255,255,255,.55)" }}>
            <a href="https://shohnoma.uz">{t("shohnoma.uz orqali yaratilgan")}</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
