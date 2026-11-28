"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
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
import { AYOZ_DEMO, AYOZ_DEMO_EN, AYOZ_DEMO_RU, DRESS_TEXT, MSG_NOYEAR, MSG_YEAR, P } from "./data";
import st from "./ayoz.module.css";

/* ── Birliklar ──
 * U — joriy `--u`. Bo‘limlarda — kontent ustuni (Figma mobil 390 koordinatalari; laptopda ustun = mobil × 1.2, ya’ni 468px / 1440 —
 * Figma «Kontent ustuni (mobil ×1.2)»). C — laptop kanvasi (1440) birligi: yon bezaklar (yulduzlar, archalar, qor tepaliklari).
 * Ochilish (00 — Figma’da hero kadrining o‘zi: mobil 390×920, laptop 1440×1104): sahna bir ekranga sig‘adi va pastki chetga
 * bog‘lanadi; laptopda ustun elementlari = mobil koordinata × 1.2 + 486 (Figma bilan aynan). PU — sahifa ustuni birligi (chok
 * ustidagi shisha shar — keyingi bo‘lim bilan aynan ulanadi). */
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

/* Ranglar (Figma «31 · Ayoz — Assets»): tun #241052 → #7a5bc7, binafsha #3b2185, to‘q #2a1660, nilufar #f3f0fb, atirgul #e0245e */
const PURPLE = "#3b2185";
const ROSE = "#e0245e";
const INK = "#241a42";
const MUTED = "#736b8c";
const SOFT = "#cfc3ee";
const LILAC = "#f3f0fb";
const GOLD = "#ffd98a";

/** Server yaratadigan standart taklif matni (php/api/lib/orders.php DEFAULT_MESSAGE) — har qaysi tilda */
const SERVER_DEFAULT = "Aziz mehmonlar! Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.";
const isServerDefault = (m: string) => (["uz", "ru", "en"] as Locale[]).some((l) => tr(l, SERVER_DEFAULT).trim() === m.trim());
const DAY_MS = 86400_000;

function useData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO = lang === "ru" ? AYOZ_DEMO_RU : lang === "en" ? AYOZ_DEMO_EN : AYOZ_DEMO;
  const ex = (data.extra ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof ex[k] === "string" ? (ex[k] as string).trim() : typeof ex[k] === "number" ? String(ex[k]) : "");
  const sd = splitDate(data.date);
  // namunada umumiy murojaat («Hurmatli hamkasblar!» — Figma); ?g= / ?m= bo‘lsa — o‘sha mehmon
  const guest = useGuestName();
  return useMemo(() => {
    const cw = calendarWords(lang);
    const exProgram = Array.isArray(ex.program) ? (ex.program as ProgramItem[]).filter((p) => p?.time && p?.title) : [];
    const raw = (data.photos ?? []) as (string | null | undefined)[];
    const slot = (i: number) => (demo ? "" : (raw[i] as string) || "");
    const date = sd ? new Date(`${sd.iso}T12:00:00Z`) : null;
    // korporativ: personA — tadbir nomi, personB — kompaniya (namunadagi nomlar tarjima qilinadi, mijozniki — yo‘q)
    const event = ((demo ? t(data.personA) : data.personA) || "").trim();
    const org = ((demo ? t(data.personB ?? "") : data.personB) || "").trim();
    // kutib olinadigan yil: oktabr–dekabrdagi bazm — keyingi yil (30-dekabr 2026 → 2027), yanvardagi — shu yil
    const year = date ? date.getUTCFullYear() + (date.getUTCMonth() >= 9 ? 1 : 0) : 0;
    const msgRaw = (demo ? "" : data.message || "").trim();
    const custom =
      msgRaw && !isServerDefault(msgRaw)
        ? msgRaw.replace(/^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Muhtaram mehmonlar!|Hurmatli mehmonlar!|Дорогие гости!|Уважаемые гости!|Dear guests!)\s*/, "").trim()
        : "";
    const message = custom || (year ? t(MSG_YEAR, { year }) : t(MSG_NOYEAR));
    const program = (demo ? DEMO.program : exProgram.length ? exProgram : ((data.program ?? []) as ProgramItem[])).slice(0, 8);
    const venueTitle = ((demo ? t(data.venueName) : data.venueName) || "").trim();
    const address = ((demo ? DEMO.address : data.address) || "").trim();
    const coords = coordsFrom(data.mapUrl);
    const m = date ? date.getUTCMonth() : 0;
    const day = date ? date.getUTCDate() : 0;
    // javob muddati — namunada sanadan 8 kun oldin (Figma: 30-dekabr → «22-dekabrgacha»)
    const deadline = demo && date ? new Date(date.getTime() - 8 * DAY_MS).toISOString().slice(0, 10) : data.rsvpDeadline;
    const dayMonth = date ? (lang === "uz" ? `${day}-${cw.monthsAfterDay[m]}` : `${day} ${cw.monthsAfterDay[m]}`) : "";
    const wd = date ? cw.weekday[date.getUTCDay()] : "";
    const time = sd?.time ?? "";
    // shahar: manzilning birinchi bo‘lagi (qisqa bo‘lsa)
    const city0 = address.split(",")[0]?.replace(/^(г\.|город)\s*/i, "").replace(/\s+(shahri|sh\.|tumani|viloyati)$/i, "").trim() ?? "";
    const city = demo ? DEMO.city : city0.length <= 18 && !/\d/.test(city0) ? city0 : "";
    const code = str("dressCode") || (demo ? DEMO.dressCode : "");
    const dressNote = str("dressNote") || (DRESS_TEXT[code] ? t(DRESS_TEXT[code]) : "");
    // Suratlar (PHOTO_SLOTS.ayoz; buyurtmada ketma-ket yuklanadi — muhimlari oldinda): 0 — jamoa surati, 1–3 — «Bir yillik lahzalar»,
    // 4 — «Manzil», 5 — logotip (shar ichida). Bo‘sh slot: jamoa / lahzalar — bo‘lim yo‘qoladi; manzil — shablonning bazm zali;
    // logotip — kompaniya nomi
    const gallery = demo ? [`${P}/lahza1.webp`, `${P}/lahza2.webp`, `${P}/lahza3.webp`] : [slot(1), slot(2), slot(3)].filter(Boolean);
    const words = org.split(/\s+/).filter(Boolean);
    // shar ichidagi yozuv (logotip o‘rni): kompaniya nomining birinchi so‘zi («Orion Soft» → «Orion»); kompaniya yo‘q bo‘lsa — yil
    const logoText = org ? (words.length > 1 && Array.from(words[0].replace(/[«»"“”]/g, "")).length >= 3 ? words[0].replace(/[«»"“”]/g, "") : org) : year ? String(year) : "";
    return {
      event,
      org,
      title: event || t("Yangi yil bazmi"),
      /** «Orion Soft jamoasi» — hero va final */
      crew: org ? t("{org} jamoasi", { org }) : "",
      logo: slot(5),
      logoText,
      guest,
      message,
      /** imzo: «Orion Soft rahbariyati» */
      sign: str("sign") || (org ? t("{org} rahbariyati", { org }) : ""),
      hasDate: !!date,
      iso: sd?.iso ?? "",
      time,
      target: data.date ? tashkentDate(data.date).getTime() : null,
      dayMonth,
      weekday: lang === "en" ? wd : wd.toLocaleLowerCase(lang),
      timeLabel: time ? t("soat {time}", { time }) : "",
      city,
      dateLine: [dayMonth, time ? t("soat {time}", { time }) : ""].filter(Boolean).join(" · "),
      venueTitle,
      address,
      hasPlace: !!(venueTitle || address || data.mapUrl),
      mapUrl: data.mapUrl || (coords ? `https://yandex.uz/maps/?pt=${coords.lon},${coords.lat}&z=16` : `https://yandex.uz/maps/?text=${encodeURIComponent([venueTitle, address].filter(Boolean).join(", "))}`),
      taxi: coords
        ? `https://3.redirect.appmetrica.yandex.com/route?end-lat=${coords.lat}&end-lon=${coords.lon}&appmetrica_tracking_id=1178268795219780156`
        : `https://yandex.uz/maps/?rtext=~${encodeURIComponent([address, venueTitle].filter(Boolean).join(", "))}&rtt=taxi`,
      program,
      gallery,
      teamPhoto: demo ? `${P}/jamoa.webp` : slot(0),
      hall: slot(4) || `${P}/zal.webp`,
      dressTitle: DRESS_TEXT[code] || str("dressCode") ? t(code) : "",
      dressNote,
      rsvpUntil: untilPhrase(deadline, lang),
      calTitle: [event, org].filter(Boolean).join(" — ") || t("Yangi yil bazmi"),
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

/** Shisha shar ichidagi qor scroll bilan aylanadi: `data-pr` — ekran markazidan masofaga qarab `--br` (faqat rotate) */
function useSpin(root: React.RefObject<HTMLDivElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = root.current;
    if (!el || !enabled) return;
    if (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const vh = window.innerHeight || 800;
      el.querySelectorAll<HTMLElement>("[data-pr]").forEach((x) => {
        const r = x.getBoundingClientRect();
        if (r.bottom < -300 || r.top > vh + 300) return;
        const k = Math.max(-1.5, Math.min(1.5, (r.top + r.height / 2 - vh / 2) / vh));
        x.style.setProperty("--br", `${(k * 140).toFixed(1)}deg`);
      });
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    tick();
    document.addEventListener("scroll", on, { capture: true, passive: true });
    window.addEventListener("resize", on);
    return () => {
      document.removeEventListener("scroll", on, { capture: true });
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
    // shrift kech yuklansa (swap) — qayta o‘lchanadi
    document.fonts?.addEventListener?.("loadingdone", measure);
    return () => {
      ro.disconnect();
      document.fonts?.removeEventListener?.("loadingdone", measure);
    };
  }, [base, max, deps]);
  return (
    <span ref={ref} className={cx("inline-block whitespace-nowrap", className)} style={style}>
      {children}
    </span>
  );
}

/**
 * Qutiga sig‘adigan matn: odatdagidek qatorlarga bo‘linadi, sig‘masa — shrift kichrayadi (base → min).
 * Hero sarlavhasi («Yangi yil / bazmi» — Figma: 2 qator, 64, qatorlar oralig‘i 1).
 */
function FitBox({ children, deps, base, min, w, h, lh, className, style }: { children: ReactNode; deps: unknown; base: number; min: number; w: number; h: number; lh: number; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null);
  useIso(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      let size = base;
      el.style.fontSize = U(size);
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (!px) return;
      const u = px / base;
      for (let i = 0; i < 40 && size > min && (el.offsetHeight > h * u * 1.06 + 2 || el.scrollWidth > w * u + 2); i++) {
        size = Math.max(min, size * 0.94);
        el.style.fontSize = U(+size.toFixed(2));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (el.parentElement) ro.observe(el.parentElement);
    document.fonts?.ready.then(measure).catch(() => {});
    // shrift kech yuklansa (swap) — qayta o‘lchanadi
    document.fonts?.addEventListener?.("loadingdone", measure);
    return () => {
      ro.disconnect();
      document.fonts?.removeEventListener?.("loadingdone", measure);
    };
  }, [deps, base, min, w, h]);
  return (
    <span ref={ref} className={cx("block", className)} style={{ width: U(w), lineHeight: lh, overflowWrap: "anywhere", ...style }}>
      {children}
    </span>
  );
}

/** Harfma-harf (ochilishda pastdan chiqadi): so‘zlar bo‘linmaydi, `--li` — harf tartibi */
function Letters({ text }: { text: string }) {
  let i = 0;
  return (
    <>
      {text.split(/(\s+)/).map((w, k) =>
        /^\s*$/.test(w) ? (
          w ? " " : null
        ) : (
          <span key={k} className={st.word}>
            {Array.from(w).map((ch, j) => (
              <span key={j} className={st.letter} style={vars({ "--li": i++ })}>
                {ch}
              </span>
            ))}
          </span>
        ),
      )}
    </>
  );
}

/* ═════════════ Bezaklar (Figma: «Yulduz», «Archa (vektor)», «Qor tepaliklari (vektor)», «Shisha shar + logotip (vektor)») ═════════════ */
const STAR_PATH = "M11 0L12.7112 9.2888L22 11L12.7112 12.7112L11 22L9.2888 12.7112L0 11L9.2888 9.2888L11 0Z";
/** [x, y, o‘lcham, tur]: tur — w (oq), g (oltin), p (binafsha — och fonda) */
type StarT = [number, number, number, ("w" | "g" | "p")?];
/** Figma shaffofligi o‘lchamga qarab (katta — yorqinroq) */
const starOp = (w: number, k: string) => (k === "g" ? 1 : k === "p" ? (w >= 16 ? 1 : 0.8) : w >= 18 ? 0.9 : w >= 14 ? 0.8 : w >= 12 ? 0.7 : 0.6);
function StarSvg({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 22 22" className={st.svg} aria-hidden>
      <path d={STAR_PATH} fill={fill} />
    </svg>
  );
}
/**
 * Bo‘lim yulduzlari (Figma joyida). `h` — Figma bo‘lim balandligi: pastki yarmidagilar bo‘lim pastidan joylanadi (ixtiyoriy
 * qatorlar kamaysa ham bo‘lim chetida qoladi). `unit` — ustun (U) yoki laptop kanvasi (C).
 */
function Stars({ list, h, unit = U, a = "star" }: { list: StarT[]; h: number; unit?: (n: number) => string; a?: string }) {
  return (
    <>
      {list.map(([x, y, w, k = "w"], i) => (
        <span
          key={i}
          aria-hidden
          data-a={a}
          className={st.star}
          style={vars({
            left: unit(x),
            ...(y > h / 2 ? { bottom: unit(h - y - w) } : { top: unit(y) }),
            width: unit(w),
            height: unit(w),
            opacity: starOp(w, k),
            "--d": `${(0.05 + (i % 5) * 0.12).toFixed(2)}s`,
          })}
        >
          <StarSvg fill={k === "g" ? GOLD : k === "p" ? PURPLE : "#fff"} />
        </span>
      ))}
    </>
  );
}

/** Archa (vektor): 3 ta uchburchak, #2a1660 85% — barcha archalar bir xil nisbatda (146.88 × 208.08) */
const TREE_R = 208.08 / 146.88;

/** Laptop yon bezaklari (1440 kanvas, bo‘lim tepasidan) */
function Side({ wide, children }: { wide: boolean; children: ReactNode }) {
  if (!wide) return null;
  return (
    <div aria-hidden className={st.sideLayer}>
      {children}
    </div>
  );
}

/**
 * Shisha shar + logotip (Figma «Ayoz / Shisha shar + logotip (vektor)», 160 × 200): qizil bant, kumush qopqoq, binafsha shisha,
 * ichida qor tepaligi va yaltiroq. Logotip o‘rni — mijozning 6-surati (logotip), bo‘lmasa kompaniya nomi (Yeseva, atirgul rang).
 * Ichidagi mayda qor zarralari scroll bilan aylanadi (`--br`).
 */
function Ball({ d, unit, s = 1 }: { d: D; unit: (n: number) => string; s?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <div className="absolute inset-0" data-pr="">
      <svg viewBox="0 0 160 200" className={st.svg} aria-hidden>
        <defs>
          <linearGradient id={`c${id}`} x1="0" x2="1">
            <stop offset="0" stopColor="#999eb2" />
            <stop offset=".5" stopColor="#f5f5fc" />
            <stop offset="1" stopColor="#8c91a8" />
          </linearGradient>
          <clipPath id={`g${id}`}>
            <circle cx="80" cy="114" r="78.75" />
          </clipPath>
        </defs>
        <ellipse cx="63" cy="12" rx="17" ry="9" fill={ROSE} transform="rotate(22 63 12)" />
        <ellipse cx="97" cy="12" rx="17" ry="9" fill={ROSE} transform="rotate(-22 97 12)" />
        <circle cx="80" cy="12" r="7" fill="#b30f40" />
        <rect x="65" y="20" width="30" height="14" rx="3" fill={`url(#c${id})`} />
        <circle cx="80" cy="114" r="78.75" fill="#9e85e5" fillOpacity=".22" />
        <g clipPath={`url(#g${id})`}>
          <ellipse cx="77.5" cy="192.5" rx="110" ry="45" fill="#fff" />
          <g className={st.flakes}>
            {[
              [42, 92, 1.6],
              [118, 86, 1.3],
              [96, 58, 1.1],
              [58, 132, 1.2],
              [124, 124, 1.5],
              [74, 72, 1],
            ].map(([x, y, r], i) => (
              <circle key={i} cx={x} cy={y} r={r} fill="#fff" fillOpacity=".75" />
            ))}
          </g>
          <ellipse cx="41.5" cy="67.5" rx="21" ry="10" fill="#fff" fillOpacity=".55" transform="rotate(-32 41.5 67.5)" />
        </g>
        <circle cx="80" cy="114" r="78.75" stroke="#a88feb" strokeWidth="2.5" fill="none" />
      </svg>
      {d.logo ? (
        <div className="absolute" style={{ left: "21%", width: "58%", top: "36%", height: "31%" }}>
          <Img src={d.logo} className={st.logoImg} />
        </div>
      ) : (
        d.logoText && (
          <p className={cx(st.ys, "absolute inset-x-0 text-center")} style={{ top: "45.4%", height: unit(39 * s), lineHeight: unit(39 * s), fontSize: unit(34 * s), color: ROSE, whiteSpace: "nowrap" }}>
            <Fit base={34 * s} max={124 * s} deps={d.logoText} unit={unit}>
              {d.logoText}
            </Fit>
          </p>
        )
      )}
    </div>
  );
}

/* ═════════════ 00 · Ochilish — sehrli tun (Figma hero kadri; faqat scroll bilan) ═════════════
 * Yuklanganda (bosishsiz): yulduzlar navbat bilan miltillab yonadi, Ayoz bobo chanasi chapdan uchib kiradi (3 s, ease-in-out) va
 * ortidan oltin uchqunlar qoladi, sarlavha harflari pastdan chiqadi, shisha shar qordan 30 birlik ko‘tariladi; qor sekin yog‘adi.
 * Scroll (rAF lerp, --q: 0…1): chana o‘ngga-yuqoriga uchib uzoqlashadi (kichrayadi), sarlavha biroz ko‘tariladi; sahna 0.3 ekrandan
 * keyin keyingi bo‘limga yopishib yuqoriga ketadi (--gy) — yulduzlar 0.7x, archalar 0.88x, qor tepaliklari 1x (3 qatlam parallaks).
 * Hech narsa yarim shaffof fon orqasidan ko‘rinmaydi («sharpa» yo‘q). Chok ustidagi shisha shar — sahifa birligida (keyingi bo‘lim
 * bilan aynan ulanadi). Mokap/poster: harakatsiz Figma kadri. */
const GATE = {
  m: { W: 390, H: 920, S: 1, OX: 0 },
  l: { W: 1440, H: 1104, S: 1.2, OX: 486 },
} as const;

/** Figma mobil 00 (ustun koordinatalari) */
const HERO_STARS: StarT[] = [
  [40, 80, 14],
  [320, 60, 18],
  [200, 40, 10],
  [90, 250, 10],
  [340, 240, 14],
  [30, 420, 12],
  [360, 420, 10],
  [260, 140, 8],
  [150, 120, 8],
  [300, 330, 22, "g"],
];
/** Figma laptop 00 — yon yulduzlar (kanvas) */
const HERO_SIDE_STARS: StarT[] = [
  [80, 90, 16],
  [260, 60, 12],
  [420, 180, 10],
  [140, 330, 12],
  [1040, 80, 16],
  [1220, 150, 12],
  [1360, 60, 10],
  [1300, 360, 14],
  [1100, 300, 10],
  [360, 440, 10],
  [1150, 220, 22, "g"],
  [300, 260, 18, "g"],
];
/** [x, y, eni] — mobil archalar (ustun) */
const HERO_TREES: [number, number, number][] = [
  [-31.2, 626.6, 122.4],
  [36.8, 667.6, 86.4],
  [281.6, 596.2, 136.8],
  [260.4, 687.8, 79.2],
];
const HERO_SIDE_TREES: [number, number, number][] = [
  [12, 694, 216],
  [170.8, 765.6, 158.4],
  [318.8, 836.6, 122.4],
  [1008, 796, 144],
  [1102, 684, 216],
  [1270.8, 780.6, 158.4],
];
/** [x, y, w, h, rang] — qor tepaliklari */
type Hill = [number, number, number, number, string];
const HILLS_M: Hill[] = [
  [-175.5, 750, 546, 260, SOFT],
  [-78, 790, 624, 240, "#fff"],
  [58.5, 770, 507, 220, LILAC],
  [-117, 820, 624, 200, "#fff"],
];
const HILLS_L: Hill[] = [
  [-144, 904, 1152, 300, SOFT],
  [648, 894, 1008, 280, SOFT],
  [-216, 954, 1296, 260, "#fff"],
  [504, 944, 1152, 250, LILAC],
  [-144, 994, 1728, 220, "#fff"],
];
/** Uchqun izi (chana ichki qutisida 330 × 220): [x, y, o‘lcham] */
const SPARKS: [number, number, number][] = [
  [30, 140, 9],
  [22, 156, 6],
  [36, 126, 7],
  [18, 146, 8],
  [28, 162, 5],
  [40, 134, 6],
  [24, 150, 9],
  [34, 158, 6],
  [20, 132, 7],
  [30, 148, 5],
  [26, 140, 8],
  [38, 152, 6],
  [22, 128, 6],
  [32, 144, 7],
];
/** Qor zarralari: [left %, o‘lcham, davomiylik s, kechikish s, yon siljish] */
const FLAKES: [number, number, number, number, number][] = [
  [6, 3, 13, -2, 18],
  [14, 2, 11, -7, -12],
  [23, 4, 15, -4, 22],
  [31, 2.5, 12, -10, -16],
  [39, 3, 14, -1, 14],
  [47, 2, 10, -6, -10],
  [55, 3.5, 16, -12, 20],
  [63, 2.5, 12, -3, -18],
  [71, 3, 13, -9, 12],
  [79, 2, 11, -5, -14],
  [87, 4, 15, -8, 16],
  [94, 2.5, 12, -11, -10],
  [10, 2, 14, -13, 10],
  [51, 2, 13, -14, -8],
  [83, 3, 16, -15, 8],
];

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
    let H = window.innerHeight;
    let started = false;
    const read = () => {
      const r = el.getBoundingClientRect();
      H = (el.firstElementChild as HTMLElement | null)?.offsetHeight || window.innerHeight;
      target = Math.min(Math.max(0, -r.top), H * 0.6);
      // sahna pastki cheti keyingi bo‘limga yopishib ketadi (lerp’siz — tirqish ochilmaydi)
      const shift = Math.min(H, Math.max(0, 2 * H - r.bottom));
      el.style.setProperty("--gy", `${Math.round(shift)}px`);
      el.style.pointerEvents = shift > H * 0.6 ? "none" : "";
    };
    const apply = (k: number) => {
      el.style.setProperty("--q", clamp01(k / (H * 0.6)).toFixed(4));
      if (!started && k > 4) {
        started = true;
        cb.current();
      }
    };
    const loop = () => {
      cur += (target - cur) * 0.12;
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

  const G = wide ? GATE.l : GATE.m;
  const { W, H, S, OX } = G;
  const colU = wide ? COL_L : COL_M;
  const pageU = wide ? CANVAS_L : COL_M;
  // ustun koordinatalari (mobil 390) → sahna; laptopda × 1.2 + 486. XC/YC — kanvas koordinatalari (laptop yon bezaklari)
  const X = (x: number) => `calc(50% + ${U(OX + S * x - W / 2)})`;
  const Y = (y: number) => `calc(100% - ${U(H - S * y)})`;
  const Z = (n: number) => U(S * n);
  const XC = (x: number) => `calc(50% + ${U(x - W / 2)})`;
  const YC = (y: number) => `calc(100% - ${U(H - y)})`;
  // qor tepaliklari: gorizontal birlik --hx ≥ --u (keng ekranda ham chetlar ochilib qolmaydi)
  const HXp = (x: number) => `calc(50% + var(--hx) * ${+(x - W / 2).toFixed(2)})`;
  const HW = (w: number) => `calc(var(--hx) * ${w})`;
  const hx = `max(var(--u), calc(100cqw / ${wide ? 1800 : 700}))`;
  const tree = (x: number, y: number, w: number, side: boolean, i: number) => (
    <div key={`${side ? "s" : "c"}${i}`} className="absolute" style={{ left: side ? XC(x) : X(x), top: side ? YC(y) : Y(y), width: side ? U(w) : Z(w), height: side ? U(w * TREE_R) : Z(w * TREE_R) }}>
      <Img src={`${P}/archa.svg`} eager />
    </div>
  );
  const house = (x: number, y: number, w: number, h: number, side: boolean) => (
    <div className="absolute" style={{ left: side ? XC(x) : X(x), top: side ? YC(y) : Y(y), width: side ? U(w) : Z(w), height: side ? U(h) : Z(h) }}>
      <Img src={`${P}/uycha.webp`} eager />
    </div>
  );
  const hills = (list: Hill[], rectY: number) => (
    <div className={st.gHills}>
      {list.map(([x, y, w, h, c], i) => (
        <span key={i} className={st.hill} style={{ left: HXp(x), top: YC(y), width: HW(w), height: U(h), background: c }} />
      ))}
      <span className={st.hillBase} style={{ top: YC(rectY) }} />
    </div>
  );
  const star = ([x, y, w, k = "w"]: StarT, i: number, side: boolean) => (
    <span
      key={`${side ? "s" : "c"}${i}`}
      aria-hidden
      className={st.gStar}
      style={vars({
        left: side ? XC(x) : X(x),
        top: side ? YC(y) : Y(y),
        width: side ? U(w) : Z(w),
        height: side ? U(w) : Z(w),
        "--op": starOp(w, k),
        "--td": `${(0.3 + ((i * 0.37) % 2.4)).toFixed(2)}s`,
        "--tt": `${(2.6 + ((i * 0.53) % 1.8)).toFixed(2)}s`,
      })}
    >
      <span className={st.tw}>
        <StarSvg fill={k === "g" ? GOLD : "#fff"} />
      </span>
    </span>
  );
  return (
    <div
      ref={wrap}
      className={cx(st.gateWrap, still && st.still)}
      style={vars(
        still
          ? { "--u": pageU, "--pu": colU, "--hx": hx, "--s": S, "--q": 0, "--gy": "0px", height: U(H), marginBottom: 0 }
          : { "--u": `min(${pageU}, calc(100svh / ${H}))`, "--pu": colU, "--hx": hx, "--s": S },
      )}
    >
      <div className={st.gate} aria-label={t("Taklifnoma")} style={still ? { position: "relative", height: "100%" } : undefined}>
        <div className={st.gClip} style={{ background: `linear-gradient(#fff, #fff) bottom / 100% ${U(40)} no-repeat, linear-gradient(180deg, #241052 0, #241052 calc(100% - ${U(H)}), #7a5bc7 100%)` }}>
          {/* yulduzlar — orqa qatlam (0.7x) */}
          <div className={st.gSky}>
            {wide && HERO_SIDE_STARS.map((s, i) => star(s, i, true))}
            {HERO_STARS.map((s, i) => star(s, i + 12, false))}
          </div>
          {/* qor sekin yog‘adi (juda yengil; reduced-motion va mokapda yo‘q) */}
          {!still && (
            <div className={st.fall} aria-hidden>
              {FLAKES.map(([l, s, tt, dl, dx], i) => (
                <span key={i} className={st.flake} style={vars({ left: `${l}%`, width: U(s), height: U(s), "--ft": `${tt}s`, "--fd": `${dl}s`, "--fx": U(dx) })} />
              ))}
            </div>
          )}
          {/* laptop: yon archalar, uycha va keng qor tepaliklari (Figma 00 — kontent ustunidan oldin) */}
          {wide && (
            <>
              <div className={st.gTrees}>
                {HERO_SIDE_TREES.map(([x, y, w], i) => tree(x, y, w, true, i))}
                {house(980, 880, 180, 138, true)}
              </div>
              {hills(HILLS_L, 1034)}
            </>
          )}
          <div className={cx(st.gTitle, "absolute flex items-end justify-center")} style={{ left: X(24), width: Z(342), top: Y(120), height: Z(128) }}>
            <h1 className={cx(st.ys, "text-center")} style={{ color: "#fff" }}>
              <FitBox deps={d.title} base={64 * S} min={30 * S} w={342 * S} h={128 * S} lh={1}>
                <Letters text={d.title} />
              </FitBox>
            </h1>
          </div>
          {d.crew && (
            <div className={cx(st.n6, st.gTitle, "absolute text-center")} style={{ left: X(24), width: Z(342), top: Y(262), color: SOFT }}>
              <span className={cx(st.gIn, "block")} style={vars({ "--gd": "1.3s" })}>
                <FitBox deps={d.crew} base={18 * S} min={13 * S} w={342 * S} h={50 * S} lh={25 / 18}>
                  {d.crew}
                </FitBox>
              </span>
            </div>
          )}
          {/* ustun archalari va uycha: mobilda qor tepaliklari ortida (0.88x), laptopda — ular ustida (Figma tartibi) */}
          <div className={wide ? undefined : st.gTrees} style={wide ? { position: "absolute", inset: 0 } : undefined}>
            {HERO_TREES.map(([x, y, w], i) => tree(x, y, w, false, i))}
            {house(50, 714, 120, 92, false)}
          </div>
          {/* Ayoz bobo chanasi — Figma: 330 × 220, −6°, markaz (205, 520) */}
          <div className={st.gSleigh} style={{ left: X(40), top: Y(410), width: Z(330), height: Z(220) }}>
            <div className={st.gFly}>
              <div className={st.gRot}>
                {!still &&
                  SPARKS.map(([x, y, s], i) => (
                    <span key={i} className={st.spark} style={vars({ left: Z(x), top: Z(y), width: Z(s), height: Z(s), "--sd": `${(0.7 + i * 0.17).toFixed(2)}s` })}>
                      <StarSvg fill={GOLD} />
                    </span>
                  ))}
                <Img src={`${P}/chana.webp`} eager className={st.contain} />
              </div>
            </div>
          </div>
          {!wide && hills(HILLS_M, 860)}
        </div>
        {/* chok ustidagi shisha shar (Figma 01: 115, −150; 160 × 200) — sahifa birligida, pastki chetdan */}
        <div className={st.gBall} style={{ left: `calc(50% + ${PU(115 - 195)})`, top: `calc(100% - ${PU(150)})`, width: PU(160), height: PU(200) }}>
          <div className={st.gBallIn}>
            <Ball d={d} unit={PU} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════ Bo‘lim qobig‘i ═════════════ */
type Bg = "white" | "lilac" | "purple" | "deep" | "night";
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

/** Sarlavha (Yeseva One, markazda, 360 da sig‘adi) */
function Title({ text, size = 38, h = 44, color = PURPLE, d = 0, style }: { text: string; size?: number; h?: number; color?: string; d?: number; style?: CSSProperties }) {
  return (
    <p
      data-a="up"
      className={cx(st.ys, "text-center")}
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
 * Ikki qatorli sarlavha (Figma: «Hurmatli / hamkasblar!», «Bir yillik / lahzalar» — Yeseva 38, qatorlar oralig‘i 1.05): matn ikki teng
 * qatorga bo‘linadi, har qator sig‘masa kichrayadi (balandlik doim 80 — bo‘lim balandligi o‘zgarmaydi); bitta so‘z — bitta qator.
 */
function Title2({ text, color, d = 0 }: { text: string; color: string; d?: number }) {
  const rows = split2(text) ?? [text];
  return (
    <div data-a="up" className={cx(st.ys, "mx-auto flex flex-col justify-center text-center")} style={vars({ width: U(342), height: U(80), color, "--d": `${d}s` })}>
      {rows.map((r, i) => (
        <span key={i} className="block" style={{ height: U(39.9), lineHeight: `${U(39.9)}`, fontSize: U(38), whiteSpace: "nowrap" }}>
          <Fit base={38} max={342} deps={r}>
            {r}
          </Fit>
        </span>
      ))}
    </div>
  );
}

/* ═════════════ 01 · Taklif — murojaat (maxsus mehmon ismi bilan), matn, sana va vaqt «tabletkasi», imzo ═════════════ */
function Taklif({ d, z }: { d: D; z: number }) {
  const t = useT();
  const hello = d.guest ? guestHello(t, "Hurmatli {guest}!", d.guest) : t("Hurmatli hamkasblar!");
  return (
    <Sec z={z} bg="white" colStyle={{ paddingTop: U(150), paddingBottom: U(175) }}>
      <Title2 text={hello} color={PURPLE} d={0.05} />
      <p
        data-a="up"
        className={cx(st.n4, "relative mx-auto text-center")}
        style={vars({
          marginTop: U(40),
          width: U(330),
          minHeight: U(115.2),
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
      {d.hasDate && (
        <div data-a="rise" className={cx(st.pill, "relative mx-auto")} style={vars({ marginTop: U(84), width: U(342), height: U(96), borderRadius: U(48), "--d": "0.2s" })}>
          <div className="absolute" style={{ left: U(30), top: U(22), width: U(125) }}>
            <p className={st.n7} style={{ height: U(27), fontSize: U(20), lineHeight: `${U(27)}`, color: PURPLE, whiteSpace: "nowrap" }}>
              <Fit base={20} max={125} deps={d.dayMonth}>
                {d.dayMonth}
              </Fit>
            </p>
            <p className={st.n4} style={{ marginTop: U(3), height: U(20), fontSize: U(15), lineHeight: `${U(20)}`, color: MUTED, whiteSpace: "nowrap" }}>
              <Fit base={15} max={125} deps={d.weekday}>
                {d.weekday}
              </Fit>
            </p>
          </div>
          <span aria-hidden className="absolute rounded-full" style={{ left: U(167), top: U(44), width: U(8), height: U(8), background: ROSE }} />
          <div className="absolute text-right" style={{ right: U(30), top: U(22), width: U(125) }}>
            {d.timeLabel && (
              <p className={st.n7} style={{ height: U(27), fontSize: U(20), lineHeight: `${U(27)}`, color: PURPLE, whiteSpace: "nowrap" }}>
                <Fit base={20} max={125} deps={d.timeLabel}>
                  {d.timeLabel}
                </Fit>
              </p>
            )}
            {d.city && (
              <p className={st.n4} style={{ marginTop: U(d.timeLabel ? 3 : 15), height: U(20), fontSize: U(15), lineHeight: `${U(20)}`, color: MUTED, whiteSpace: "nowrap" }}>
                <Fit base={15} max={125} deps={d.city}>
                  {d.city}
                </Fit>
              </p>
            )}
          </div>
        </div>
      )}
      {d.sign && (
        <p
          data-a="up"
          className={cx(st.n6, "relative mx-auto text-center")}
          style={vars({ marginTop: U(d.hasDate ? 54 : 70), width: U(342), minHeight: U(25), fontSize: U(18), lineHeight: `${U(25)}`, color: PURPLE, overflowWrap: "anywhere", "--d": "0.28s" })}
        >
          {d.sign}
        </p>
      )}
    </Sec>
  );
}

/* ═════════════ 02 · Jamoa surati — arka maska bilan pastdan yuqoriga ochiladi; ingichka arka chizig‘i. Surat bo‘lmasa — bo‘lim yo‘q ═════════════ */
function Team({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  if (!d.teamPhoto) return null;
  return (
    <Sec
      z={z}
      bg="purple"
      colStyle={{ height: U(640) }}
      outer={
        <Side wide={wide}>
          <Stars
            unit={C}
            h={768}
            list={[
              [160, 140, 18],
              [300, 480, 12],
              [1150, 200, 16],
              [1280, 560, 12],
            ]}
          />
        </Side>
      }
    >
      <span data-a="line" aria-hidden className={st.archLine} style={{ left: U(37), top: U(92), width: U(316), height: U(436), borderWidth: U(1.2), borderRadius: `${U(158)} ${U(158)} ${U(30)} ${U(30)}` }} />
      <div data-a="arch" className={st.arch} style={vars({ left: U(45), top: U(100), width: U(300), height: U(420), borderRadius: `${U(150)} ${U(150)} ${U(24)} ${U(24)}`, "--d": "0.1s" })}>
        <div className={st.archIn}>
          <Img src={d.teamPhoto} />
        </div>
      </div>
      <Stars
        h={640}
        list={[
          [30, 120, 16],
          [340, 180, 20],
          [350, 560, 12],
          [20, 500, 10],
          [60, 590, 18, "g"],
        ]}
      />
    </Sec>
  );
}

/* ═════════════ 03 · Kecha dasturi — oq «tabletka» qatorlar o‘ngdan navbat bilan kiradi (stagger 100 ms) ═════════════ */
function Program({ d, z }: { d: D; z: number }) {
  const t = useT();
  const items = d.program;
  if (!items.length) return null;
  return (
    <Sec z={z} bg="lilac" colStyle={{ paddingTop: U(90), paddingBottom: U(126) }}>
      <Title text={t("Kecha dasturi")} />
      <div className="relative mx-auto flex flex-col" style={{ marginTop: U(36), width: U(342), gap: U(16) }}>
        {items.map((it, i) => (
          <div
            key={i}
            data-a="right"
            className={cx(st.pRow, "relative flex items-center")}
            style={vars({ minHeight: U(92), padding: `${U(16)} ${U(8)} ${U(16)} ${U(28)}`, borderRadius: U(46), "--d": `${0.1 + i * 0.1}s` })}
          >
            <p className={cx(st.ys, "flex-none")} style={{ width: U(90), height: U(30), fontSize: U(26), lineHeight: `${U(30)}`, color: ROSE, whiteSpace: "nowrap" }}>
              <Fit base={26} max={84} deps={it.time}>
                {it.time}
              </Fit>
            </p>
            <p className={cx(st.n6, st.clamp2, "min-w-0 flex-1")} style={{ fontSize: U(17), lineHeight: `${U(23)}`, color: INK }}>
              {it.title}
            </p>
          </div>
        ))}
      </div>
      <Stars
        h={820}
        list={[
          [330, 60, 18, "p"],
          [40, 70, 12, "p"],
        ]}
      />
    </Sec>
  );
}

/* ═════════════ 04 · Bir yillik lahzalar — galereya: har surat pastdan 40 birlik ko‘tariladi, maska yuqoridan pastga ochiladi
 * (120 ms stagger). Suratlar bo‘lmasa — bo‘lim yo‘qoladi; 1 ta — katta; 2 ta — ikkita ark; 3 ta — Figma ═════════════ */
function Gallery({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const list = d.gallery;
  if (!list.length) return null;
  const big = list.length !== 2 ? list[0] : null;
  const small = list.length === 2 ? list : list.slice(1);
  return (
    <Sec
      z={z}
      bg="deep"
      colStyle={{ paddingTop: U(90), paddingBottom: U(158) }}
      outer={
        <Side wide={wide}>
          <Stars
            unit={C}
            h={1080}
            list={[
              [160, 140, 18],
              [300, 620, 12],
              [1150, 240, 16],
              [1280, 760, 12],
              [240, 400, 20, "g"],
            ]}
          />
        </Side>
      }
    >
      <Title2 text={t("Bir yillik lahzalar")} color="#fff" />
      <div className="relative mx-auto" style={{ marginTop: U(50), width: U(342) }}>
        {big && (
          <div data-a="gal" className={st.gal} style={vars({ width: U(342), height: U(256), borderRadius: U(24), "--d": "0.08s" })}>
            <Img src={big} className={st.galImg} />
          </div>
        )}
        {small.length > 0 && (
          <div className="flex" style={{ marginTop: big ? U(16) : 0, gap: U(10) }}>
            {small.map((s, i) => (
              <div key={i} data-a="gal" className={st.gal} style={vars({ width: U(166), height: U(250), borderRadius: `${U(83)} ${U(83)} ${U(20)} ${U(20)}`, "--d": `${0.2 + i * 0.12}s` })}>
                <Img src={s} className={st.galImg} />
              </div>
            ))}
          </div>
        )}
      </div>
      <Stars
        h={900}
        list={[
          [30, 50, 14],
          [340, 80, 18],
          [350, 780, 12],
          [40, 800, 16],
          [190, 820, 10],
          [320, 190, 16, "g"],
        ]}
      />
    </Sec>
  );
}

/* ═════════════ 05 · Bazmgacha — taymer: shisha sharlar navbat bilan tushib keladi (tebranmaydi), raqamlar har soniyada almashadi ═════════════ */
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
      bg="night"
      colStyle={{ height: U(640) }}
      outer={
        <Side wide={wide}>
          <Stars
            unit={C}
            h={768}
            list={[
              [160, 120, 16],
              [320, 500, 12],
              [1150, 200, 16],
              [1290, 560, 12],
            ]}
          />
        </Side>
      }
    >
      <div className="absolute inset-x-0" style={{ top: U(90) }}>
        <Title text={t("Bazmgacha")} color="#fff" />
      </div>
      <div ref={ref} className="absolute" style={{ left: 0, top: U(176), width: U(390), height: U(120) }}>
        {vals.map((v, i) => {
          const x = 24 + i * 88;
          return (
            <div key={i} data-a="drop" className="absolute" style={vars({ left: U(x - 5), top: 0, width: U(88), height: U(120), "--d": `${0.1 + i * 0.12}s` })}>
              <span aria-hidden className={st.tCap} style={{ left: U(36), top: 0, width: U(16), height: U(10), borderRadius: U(2) }} />
              <span aria-hidden className={st.tBall} style={{ left: U(5), top: U(10), width: U(78), height: U(78), borderWidth: U(1.5) }} />
              <span aria-hidden className={st.tShine} style={{ left: U(5 + 21 - 9), top: U(10 + 18 - 5), width: U(18), height: U(10) }} />
              <p className={cx(st.ys, "absolute text-center")} style={{ left: U(5), width: U(78), top: U(30), height: U(35), fontSize: U(30), lineHeight: `${U(35)}`, color: "#fff", whiteSpace: "nowrap" }}>
                <Fit base={30} max={66} deps={String(vals[0]).length}>
                  <Digits value={v} run={inView} len={i === 0 ? Math.max(2, String(vals[0]).length) : 2} i={i} />
                </Fit>
              </p>
              <p className={cx(st.n6, "absolute inset-x-0 text-center")} style={{ top: U(100), height: U(19), fontSize: U(14), lineHeight: `${U(19)}`, color: SOFT, whiteSpace: "nowrap" }}>
                <Fit base={14} max={86} deps={units[i]}>
                  {units[i]}
                </Fit>
              </p>
            </div>
          );
        })}
      </div>
      {d.dateLine && (
        <p
          data-a="up"
          className={cx(st.n7, "absolute inset-x-0 text-center")}
          style={vars({ top: U(336), height: U(25), fontSize: U(18), lineHeight: `${U(25)}`, color: "#fff", whiteSpace: "nowrap", "--d": "0.25s" })}
        >
          <Fit base={18} max={342} deps={d.dateLine}>
            {d.dateLine}
          </Fit>
        </p>
      )}
      <div data-a="up" className="absolute inset-x-0 flex justify-center" style={vars({ top: U(386), "--d": "0.35s" })}>
        <button
          type="button"
          className={cx(st.n7, st.btnWhite)}
          style={{ minWidth: U(250), maxWidth: U(342), height: U(56), padding: `0 ${U(22)}`, fontSize: U(16), borderRadius: U(28) }}
          onClick={() =>
            downloadIcs({
              title: d.calTitle,
              startLocal: `${d.iso}T${d.time || "18:00"}`,
              location: [d.venueTitle, d.address].filter(Boolean).join(", "),
              slug: "ayoz",
            })
          }
        >
          <Fit base={16} max={298} deps={t("Kalendarga qo‘shish")}>
            {t("Kalendarga qo‘shish")}
          </Fit>
        </button>
      </div>
      <Stars
        h={640}
        list={[
          [30, 60, 14],
          [340, 40, 12],
          [350, 520, 16],
          [40, 540, 12],
        ]}
      />
    </Sec>
  );
}

/* ═════════════ 06 · Manzil — surat (mijozning 5-surati; bo‘lmasa — bazm zali) sekin 1.05 → 1, joy nomi, manzil, xarita va yo‘nalish ═════════════ */
function Venue({ d, z, linkable }: { d: D; z: number; linkable: boolean }) {
  const t = useT();
  if (!d.hasPlace) return null;
  const btn = (s: string) => (
    <Fit base={16} max={140} deps={s}>
      {s}
    </Fit>
  );
  return (
    <Sec z={z} bg="white" colStyle={{ paddingTop: U(90), paddingBottom: U(154) }}>
      <Title text={t("Manzil")} />
      <div data-a="zoom" className="relative mx-auto overflow-hidden" style={vars({ marginTop: U(32), width: U(342), height: U(236), borderRadius: U(24), background: "#2a1660", "--d": "0.1s" })}>
        <Img src={d.hall} className={st.zoomImg} />
      </div>
      {d.venueTitle && (
        <p
          data-a="up"
          className={cx(st.n7, "mx-auto text-center")}
          style={vars({ marginTop: U(28), width: U(342), minHeight: U(30), fontSize: U(22), lineHeight: `${U(30)}`, color: INK, overflowWrap: "anywhere", textWrap: "balance", "--d": "0.15s" })}
        >
          {d.venueTitle}
        </p>
      )}
      {d.address && (
        <p
          data-a="up"
          className={cx(st.n4, "mx-auto text-center")}
          style={vars({ marginTop: U(12), width: U(330), minHeight: U(48), fontSize: U(16), lineHeight: `${U(24)}`, color: MUTED, overflowWrap: "anywhere", "--d": "0.22s" })}
        >
          {d.address}
        </p>
      )}
      <div data-a="up" className="relative mx-auto flex" style={vars({ marginTop: U(50), width: U(342), gap: U(12), "--d": "0.3s" })}>
        <a
          href={linkable ? d.mapUrl : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(st.n7, st.btnPurple)}
          style={{ flex: "1 1 0", minWidth: 0, height: U(56), padding: `0 ${U(10)}`, fontSize: U(16), borderRadius: U(28) }}
        >
          {btn(t("Xaritada ochish"))}
        </a>
        <a
          href={linkable ? d.taxi : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(st.n7, st.btnLine)}
          style={{ flex: "1 1 0", minWidth: 0, height: U(56), padding: `0 ${U(10)}`, fontSize: U(16), borderWidth: U(1.4), borderRadius: U(28) }}
        >
          {btn(t("Yo‘nalish"))}
        </a>
      </div>
    </Sec>
  );
}

/* ═════════════ 07 · Dress-kod (ixtiyoriy — o‘chirilsa joy qolmaydi): oq karta — turi (Yeseva, binafsha) va izoh ═════════════ */
function Dress({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  if (!d.dressNote && !d.dressTitle) return null;
  return (
    <Sec
      z={z}
      bg="purple"
      colStyle={{ paddingTop: U(40), paddingBottom: U(97) }}
      outer={
        <Side wide={wide}>
          <Stars
            unit={C}
            h={360}
            list={[
              [200, 80, 14],
              [1240, 220, 14],
            ]}
          />
        </Side>
      }
    >
      <div data-a="rise" className={cx(st.dressCard, "relative mx-auto flex flex-col items-center text-center")} style={{ width: U(342), minHeight: U(163), padding: `${U(32)} ${U(30)}`, gap: U(12), borderRadius: U(28), justifyContent: "center" }}>
        {d.dressTitle && (
          <p className={st.ys} style={{ height: U(35), fontSize: U(30), lineHeight: `${U(35)}`, color: PURPLE, whiteSpace: "nowrap" }}>
            <Fit base={30} max={282} deps={d.dressTitle}>
              {d.dressTitle}
            </Fit>
          </p>
        )}
        {d.dressNote && (
          <p className={st.n4} style={{ width: "100%", fontSize: U(17), lineHeight: 1.5, color: INK, overflowWrap: "anywhere" }}>
            {d.dressNote}
          </p>
        )}
      </div>
      <Stars
        h={300}
        list={[
          [340, 20, 14],
          [30, 250, 12],
        ]}
      />
    </Sec>
  );
}

/* ═════════════ 08 · Anketa — javob (Kelaman / Kela olmayman; kela olmasa — soni so‘ralmaydi, count 0) ═════════════ */
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
    <p className={cx(st.n7, st.lbl)} style={{ marginTop: U(mt), height: U(19), fontSize: U(14), lineHeight: `${U(19)}` }}>
      {s}
    </p>
  );
  const sub = d.rsvpUntil ? t("Iltimos, {date} javob bering", { date: d.rsvpUntil }) : t("Javobingizni kutamiz");
  return (
    <Sec z={z} bg="white" id="ayoz-javob" colStyle={{ paddingTop: U(100), paddingBottom: U(96) }}>
      <h2 data-a="up" className={cx(st.ys, "mx-auto text-center")} style={vars({ width: U(342), fontSize: U(40), lineHeight: `${U(46)}`, color: PURPLE, overflowWrap: "anywhere", "--d": "0.05s" })}>
        {t("Kelasizmi?")}
      </h2>
      <p
        data-a="up"
        className={cx(st.n4, "mx-auto text-center")}
        style={vars({ marginTop: U(16), width: U(342), minHeight: U(22), fontSize: U(16), lineHeight: `${U(22)}`, color: MUTED, overflowWrap: "anywhere", "--d": "0.12s" })}
      >
        {sub}
      </p>
      <div data-a="rise" className={cx(st.card, "relative mx-auto")} style={vars({ marginTop: U(30), width: U(342), padding: `${U(24)} ${U(22)} ${U(62)}`, borderRadius: U(28), "--d": "0.2s" })}>
        {sent ? (
          <div key="thanks" className={cx(st.thanks, "relative flex flex-col items-center text-center")} style={{ padding: `${U(40)} ${U(6)} ${U(10)}`, gap: U(16), minHeight: U(480) }}>
            <div className={cx(st.thanksBall, "relative")} style={{ width: U(96), height: U(120) }}>
              <Img src={`${P}/shar.svg`} className={st.contain} />
            </div>
            <p className={st.ys} style={{ fontSize: U(sent === "not_coming" ? 34 : 28), lineHeight: 1.25, color: PURPLE, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Rahmat!") : t("Rahmat! Joyingiz band qilindi")}
            </p>
            <p className={st.n4} style={{ fontSize: U(17), color: MUTED, lineHeight: 1.5, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Javobingiz uchun rahmat!") : t("{name} — {count} kishi. Javobingiz yetkazildi.", { name: name.trim() || t("Javobingiz"), count })}
            </p>
            <button type="button" onClick={() => setSent(null)} className={st.n7} style={{ fontSize: U(16), color: PURPLE, textDecoration: "underline", textUnderlineOffset: 3 }}>
              {t("Javobni o‘zgartirish")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="relative flex flex-col items-stretch">
            {label(t("Ismingiz"), 0)}
            <label className={st.field} style={{ marginTop: U(5), height: U(54), padding: `0 ${U(16)}`, borderRadius: U(16) }}>
              <input
                className={cx(st.n4, st.input)}
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
                  onClick={() => setStatus(s)}
                  className={cx(st.n7, st.choice)}
                  style={{ flex: "1 1 0", padding: `${U(4)} ${U(6)}`, minHeight: U(54), fontSize: U(16), borderWidth: U(1.4), borderRadius: U(27) }}
                >
                  <span style={{ overflowWrap: "anywhere" }}>{t(l)}</span>
                </button>
              ))}
            </div>
            {status === "coming" && (
              <>
                {label(t("Necha kishi bo‘lasiz?"), 22)}
                <div className={cx(st.counter, "justify-between")} style={{ marginTop: U(5), height: U(54), padding: `0 ${U(8)}`, borderRadius: U(27) }}>
                  <button
                    type="button"
                    className={cx(st.n7, st.step)}
                    disabled={count <= 1}
                    onClick={() => setCount((n) => Math.max(1, n - 1))}
                    aria-label={t("Kamaytirish")}
                    style={{ width: U(40), height: U(40), fontSize: U(22) }}
                  >
                    −
                  </button>
                  <span className={st.ys} style={{ fontSize: U(26), lineHeight: 1.2, color: INK }} aria-live="polite">
                    {count}
                  </span>
                  <button
                    type="button"
                    className={cx(st.n7, st.step)}
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
            <label className={st.field} style={{ marginTop: U(5), height: U(130), padding: U(16), borderRadius: U(16), alignItems: "stretch" }}>
              <textarea
                className={cx(st.n4, st.input)}
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                maxLength={500}
                placeholder={t("Yozing…")}
                aria-label={t("Tilaklaringiz")}
                style={{ fontSize: U(17), lineHeight: `${U(23)}`, height: "100%" }}
              />
            </label>
            {err && (
              <p className={st.n4} style={{ marginTop: U(12), color: "#c2410c", fontSize: U(15) }}>
                {err}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className={cx(st.n7, st.submit)}
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

/* ═════════════ 09 · Final — chana uzoqlashib kichrayadi, katta shisha shar qorga «tushadi», yulduzlar porlaydi, «Ko‘rishguncha!»
 * va jamoa (scroll bilan: --fc 0 … 1 = Figma kadri; sahifa oxirigacha albatta tugaydi) ═════════════ */
const FINAL_STARS: StarT[] = [
  [40, 60, 14],
  [330, 90, 18],
  [200, 40, 10],
  [60, 330, 10],
  // Figma: 350, 300 — «Ko‘rishguncha!» undov belgisi ustiga tushadi; matnga tegmasligi uchun 38 birlik yuqoriga ko‘tarildi
  [352, 262, 12],
  [90, 420, 18, "g"],
];
const FINAL_SIDE_STARS: StarT[] = [
  [80, 90, 16],
  [260, 60, 12],
  [420, 180, 10],
  [140, 330, 12],
  [1040, 80, 16],
  [1220, 150, 12],
  [1360, 60, 10],
  [1300, 360, 14],
  [1100, 300, 10],
  [360, 440, 10],
  [1200, 300, 22, "g"],
];
const FINAL_TREES: [number, number, number][] = [
  [-24.8, 636.4, 129.6],
  [278, 606, 144],
  [256.8, 697.6, 86.4],
];
const FINAL_SIDE_TREES: [number, number, number][] = [
  [19.2, 704.4, 201.6],
  [188, 781, 144],
  [1020.8, 770.6, 158.4],
  [1124.8, 658.6, 230.4],
  [1298, 796, 144],
];

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
  const title = t("Ko‘rishguncha!");
  const star = (list: StarT[], unit: (n: number) => string) =>
    list.map(([x, y, w, k = "w"], i) => (
      <span key={i} aria-hidden className={st.fStar} style={vars({ left: unit(x), top: unit(y), width: unit(w), height: unit(w), "--op": starOp(w, k), "--fk": (i % 6) * 0.06 })}>
        <StarSvg fill={k === "g" ? GOLD : "#fff"} />
      </span>
    ));
  const tree = (x: number, y: number, w: number, unit: (n: number) => string, i: number) => (
    <div key={i} className="absolute" style={{ left: unit(x), top: unit(y), width: unit(w), height: unit(w * TREE_R) }}>
      <Img src={`${P}/archa.svg`} />
    </div>
  );
  const hills = (list: Hill[], rectY: number, unit: (n: number) => string) => (
    <>
      {list.map(([x, y, w, h, c], i) => (
        <span key={i} className={st.hill} style={{ left: unit(x), top: unit(y), width: unit(w), height: unit(h), background: c }} />
      ))}
      <span className={st.hillBase} style={{ top: unit(rectY), bottom: "auto", height: unit(80) }} />
    </>
  );
  return (
    <Sec
      secRef={ref}
      z={z}
      bg="night"
      className={st.finalWrap}
      style={still ? vars({ "--fc": 1 }) : undefined}
      colStyle={{ height: U(940) }}
      outer={
        <Side wide={wide}>
          {star(FINAL_SIDE_STARS, C)}
          {FINAL_SIDE_TREES.map(([x, y, w], i) => tree(x, y, w, C, i))}
          {hills(
            HILLS_L.map(([x, y, w, h, c]) => [x, y + 24, w, h, c] as Hill),
            1058,
            C,
          )}
        </Side>
      }
    >
      {star(FINAL_STARS, U)}
      {/* Ayoz bobo chanasi uzoqlashadi — Figma: 220 × 146.7, −10°, markaz (270, 150) */}
      <div className={st.fSleigh} style={{ left: U(160), top: U(76.67), width: U(220), height: U(146.67) }}>
        <div className={st.fRot}>
          <Img src={`${P}/chana.webp`} className={st.contain} />
        </div>
      </div>
      <p className={cx(st.ys, st.fUp, "absolute inset-x-0 text-center")} style={vars({ top: U(300), height: U(51), fontSize: U(44), lineHeight: `${U(51)}`, color: "#fff", whiteSpace: "nowrap", "--fk": 0 })}>
        <Fit base={44} max={342} deps={title}>
          {title}
        </Fit>
      </p>
      {d.crew && (
        <div className={cx(st.n6, st.fUp, "absolute inset-x-0 flex justify-center text-center")} style={vars({ top: U(370), color: SOFT, "--fk": 1 })}>
          <FitBox deps={d.crew} base={18} min={13} w={342} h={50} lh={25 / 18}>
            {d.crew}
          </FitBox>
        </div>
      )}
      {FINAL_TREES.map(([x, y, w], i) => tree(x, y, w, U, i))}
      {!wide &&
        hills(
          HILLS_M.map(([x, y, w, h, c]) => [x, y + 20, w, h, c] as Hill),
          880,
          U,
        )}
      {/* katta shisha shar qorga «tushadi» (Figma: 95, 600; 200 × 250) */}
      <div className={st.fBall} style={{ left: U(95), top: U(600), width: U(200), height: U(250) }}>
        <Ball d={d} unit={U} s={1.25} />
      </div>
    </Sec>
  );
}

/* ═════════════ Musiqa tugmasi — Figma «Ayoz / Musiqa tugmasi (fixed)»: oq doira 52, 4 ta chiziq (binafsha, atirgul) beatga mos
 * sakraydi; o‘chirilgan — chiziqlar kalta (4 px) ═════════════ */
const BARS: [number, string][] = [
  [10, PURPLE],
  [18, PURPLE],
  [13, ROSE],
  [20, PURPLE],
];
function AyozMusic({ m, wide, embedded }: { m: ReturnType<typeof useMusic>; wide: boolean; embedded: boolean }) {
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
      {BARS.map(([h, c], i) => (
        <span key={i} className={st.bar} style={vars({ "--h": `${h}px`, "--i": i, background: c })} />
      ))}
    </button>
  );
  return embedded ? <div style={{ position: "sticky", top: 0, height: 0, zIndex: 70 }}>{btn}</div> : btn;
}

/* ═════════════ Sahifa ═════════════ */
type Key = "taklif" | "team" | "program" | "gallery" | "timer" | "venue" | "dress" | "rsvp" | "final";

export function AyozSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const loaded = usePreload(
    [`${P}/chana.webp`, `${P}/archa.svg`, `${P}/uycha.webp`, d.logo].filter(Boolean),
    [d.teamPhoto, ...d.gallery, d.hall, `${P}/shar.svg`].filter(Boolean),
    withGate,
    wide ? "l" : "m",
  );
  useReveal(root, loaded, embedded);
  useSpin(root, loaded && !embedded);
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
      ? !!d.teamPhoto
      : k === "program"
        ? d.program.length > 0
        : k === "gallery"
          ? d.gallery.length > 0
          : k === "timer"
            ? d.hasDate
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
        <AyozMusic m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/shar.svg`} />}
        <div className={st.flow}>
          {withGate && (loaded ? <Gate d={d} wide={wide} onStart={() => music.play(true)} /> : <div className={st.gateHold} />)}
          {embedded && <Gate d={d} wide={wide} still onStart={() => {}} />}
          <Taklif d={d} z={z("taklif")} />
          <Team d={d} z={z("team")} wide={wide} />
          <Program d={d} z={z("program")} />
          <Gallery d={d} z={z("gallery")} wide={wide} />
          <Timer d={d} z={z("timer")} wide={wide} />
          <Venue d={d} z={z("venue")} linkable={linkable} />
          <Dress d={d} z={z("dress")} wide={wide} />
          {data.rsvpEnabled && <Rsvp d={d} slug={data.slug} mode={mode} z={z("rsvp")} />}
          <Final d={d} z={z("final")} wide={wide} still={embedded} onSeen={onFinal} />
        </div>
        <footer className={cx(st.footer, "flex items-start justify-center")} style={{ height: U(120), paddingTop: U(50) }}>
          <p className={cx(st.n6, "text-center")} style={{ fontSize: U(14), lineHeight: `${U(19)}`, color: "rgba(255,255,255,.55)" }}>
            <a href="https://shohnoma.uz">{t("shohnoma.uz orqali yaratilgan")}</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
