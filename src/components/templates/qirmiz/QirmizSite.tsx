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
import { CLOSE, DRESS_TEXT, LEAD, MSG, MSG_NO_YEAR, P, QIRMIZ_DEMO, QIRMIZ_DEMO_EN, QIRMIZ_DEMO_RU, type QirmizItem } from "./data";
import st from "./qirmiz.module.css";

/* ── Birliklar ──
 * U — joriy `--u`. Bo‘limlarda — kontent ustuni (Figma mobil 390 koordinatalari; laptopda ustun = mobil × 1.2, ya’ni 468px / 1440 —
 * Figma «Kontent ustuni (mobil ×1.2)»). C — laptop kanvasi (1440) birligi: yon bezaklar (gulchambar, Shchelkunchik, sovg‘a, sharlar,
 * padub shoxi). Ochilish (00 · Hero) — o‘z sahnasi: Figma hero kadri (mobil 390×900, laptop 1440×1080) bir ekranga sig‘adi va pastki
 * chetga bog‘lanadi (`--su`); sahna ichidagi ustun qutisida `--u = --su × S` (laptopda S = 1.2, ustun 486 dan) — Figma bilan aynan. */
const U = (n: number) => `calc(var(--u) * ${+n.toFixed(3)})`;
const SU = (n: number) => `calc(var(--su) * ${+n.toFixed(3)})`;
const C = (n: number) => `calc(100cqw / 1440 * ${+n.toFixed(3)})`;
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const vars = (o: Record<string, string | number | undefined>) => o as CSSProperties;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const COL_M = "calc(100cqw / 390)";
const COL_L = "calc(100cqw / 1440 * 1.2)";

/* Ranglar (Figma «30 · Qirmiz — Assets») */
const BROWN = "#853d21";
const OCHRE = "#997538";
const GOLD = "#c9a35c";

/** Server yaratadigan standart taklif matni (php/api/lib/orders.php DEFAULT_MESSAGE) — har qaysi tilda */
const SERVER_DEFAULT = "Aziz mehmonlar! Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.";
const isServerDefault = (m: string) => (["uz", "ru", "en"] as Locale[]).some((l) => tr(l, SERVER_DEFAULT).trim() === m.trim());

function useData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO = lang === "ru" ? QIRMIZ_DEMO_RU : lang === "en" ? QIRMIZ_DEMO_EN : QIRMIZ_DEMO;
  const ex = (data.extra ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof ex[k] === "string" ? (ex[k] as string).trim() : typeof ex[k] === "number" ? String(ex[k]) : "");
  const sd = splitDate(data.date);
  const guest = useGuestName();
  return useMemo(() => {
    const cw = calendarWords(lang);
    const exProgram = Array.isArray(ex.program) ? (ex.program as QirmizItem[]).filter((p) => p?.time && p?.title) : [];
    const raw = (data.photos ?? []) as (string | null | undefined)[];
    const date = sd ? new Date(`${sd.iso}T12:00:00Z`) : null;
    // korporativ: personA — tadbir nomi, personB — kompaniya / tashkilotchi (namunadagi nomlar tarjima qilinadi, mijozniki — yo‘q)
    const event = ((demo ? DEMO.event : data.personA) || "").trim();
    const org = ((demo ? t(data.personB ?? "") : data.personB) || "").trim();
    const code = str("dressCode") || (demo ? DEMO.dressCode : "");
    const dressNote = str("dressNote") || (DRESS_TEXT[code] ? t(DRESS_TEXT[code]) : "");
    const time = sd?.time ?? "";
    const program = (demo ? DEMO.program : exProgram.length ? exProgram : ((data.program ?? []) as QirmizItem[])) as QirmizItem[];
    const m = date ? date.getUTCMonth() : 0;
    const year = date ? date.getUTCFullYear() : 0;
    const day = date ? date.getUTCDate() : 0;
    // kutib olinadigan yil: yilning ikkinchi yarmidagi bazm — keyingi yil (27-dekabr 2026 → «2027»), boshida — o‘sha yil
    const newYear = date ? (m >= 6 ? year + 1 : year) : 0;
    const msgRaw = (demo ? "" : data.message || "").trim();
    const custom =
      msgRaw && !isServerDefault(msgRaw)
        ? msgRaw.replace(/^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Muhtaram mehmonlar!|Hurmatli mehmonlar!|Дорогие гости!|Уважаемые гости!|Dear guests!)\s*/, "").trim()
        : "";
    const message = custom || (newYear ? t(MSG, { year: newYear }) : t(MSG_NO_YEAR));
    const venueTitle = ((demo ? DEMO.venue : data.venueName) || "").trim();
    const address = ((demo ? DEMO.address : data.address) || "").trim();
    const coords = coordsFrom(data.mapUrl);
    // namunada javob muddati — Figma’dagidek sanadan 7 kun oldin («20-dekabrgacha» — 27-dekabr uchun)
    const deadline = demo && sd ? new Date(Date.UTC(year, m, day - 7)).toISOString().slice(0, 10) : data.rsvpDeadline;
    const wd = date ? cw.weekday[date.getUTCDay()] : "";
    // «27-dekabr» / «27 декабря» / «27 December»
    const dayMonth = date ? (lang === "uz" ? `${day}-${cw.monthsAfterDay[m]}` : `${day} ${cw.monthsAfterDay[m]}`) : "";
    const at = time ? t("soat {time}", { time }) : "";
    // shahar: manzilning birinchi bo‘lagi (qisqa bo‘lsa)
    const city0 = address.split(",")[0]?.replace(/^(г\.|город)\s*/i, "").replace(/\s+(shahri|sh\.|tumani|viloyati)$/i, "").trim() ?? "";
    const city = demo ? DEMO.city : city0.length <= 16 ? city0 : "";
    // Suratlar (PHOTO_SLOTS.qirmiz): 0 — jamoa surati, 1–3 — «Bir yillik lahzalar», 4 — «Manzil».
    // Bo‘sh slot: jamoa — bosma kartochkada yil va sovg‘a qutisi; lahzalar — bo‘lim yo‘qoladi; manzil — shablonning bazm zali
    const slot = (i: number) => (demo ? "" : (raw[i] as string) || "");
    const gallery = demo ? [`${P}/galereya1.webp`, `${P}/galereya2.webp`, `${P}/galereya3.webp`] : [slot(1), slot(2), slot(3)].filter(Boolean);
    return {
      event,
      org,
      lead: str("lead") || t(LEAD),
      close: t(CLOSE),
      /** «Atlas Group jamoasi» (kompaniya bo‘lmasa — bo‘sh) */
      sign: org ? t("{org} jamoasi", { org }) : "",
      dayMonth,
      weekday: lang === "en" ? wd : wd.toLocaleLowerCase(lang),
      at,
      city,
      dateLine: [dayMonth, at].filter(Boolean).join(" · "),
      newYear,
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
      gallery,
      dressTitle: DRESS_TEXT[code] || str("dressCode") ? t(code) : "",
      dressNote,
      team: demo ? `${P}/jamoa.webp` : slot(0),
      hall: slot(4) || `${P}/zal.webp`,
      rsvpUntil: untilPhrase(deadline, lang),
      calTitle: event || t("qirmiz::Yil yakuni bazmi"),
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
 * Bezaklar parallaksi (Figma «Motion»: «scroll bilan parallax 0.8») — `data-px`: ekran markazidan masofaga qarab 0.2 × masofa
 * (±28 px gacha), faqat `translate`.
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
        x.style.setProperty("--py", `${Math.max(-28, Math.min(28, dist * -0.2)).toFixed(1)}px`);
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

/** Uzun matn bir qatorga sig‘masa — shrift kichrayadi (kesilmaydi, toshmaydi) */
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

/**
 * Ikki qatorli sarlavha (Figma: «Yil yakuni / bazmi», «Hurmatli / hamkasblar!», «Bir yillik / lahzalar», «Sizni / kutamiz!» — ikki
 * alohida qator): matn so‘zlar bo‘yicha ikki teng qatorga bo‘linadi (bitta so‘z — bitta qator, blok markazida), har qator sig‘masa
 * kichrayadi. `letters` — har harf alohida span (`--li`): ochilishda harfma-harf chiqadi.
 */
function Lines2({ text, size, lh, max, letters, three, className, style }: { text: string; size: number; lh: number; max: number; letters?: boolean; three?: number; className?: string; style?: CSSProperties }) {
  const two = split2(text);
  // juda uzun (2 qatorda eng uzun qator `three` belgidan oshsa) — uch qator, shrift 0.68, blok balandligi o‘zgarmaydi
  const tri = three && two && Math.max(two[0].length, two[1].length) > three ? split3(text) : null;
  const rows = tri ?? two ?? [text];
  const fs = tri ? size * 0.68 : size;
  const l = tri ? (lh * 2) / 3 : lh;
  let idx = 0;
  return (
    <div className={cx("flex flex-col items-center justify-center text-center", className)} style={{ height: U(lh * 2), ...style }}>
      {rows.map((r, i) => (
        <span key={i} className="block" style={{ height: U(l), lineHeight: U(l), fontSize: U(fs), whiteSpace: "nowrap" }}>
          <Fit base={fs} max={max} deps={r}>
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

/** Matnni 3 qatorga eng teng bo‘lish */
function split3(text: string): [string, string, string] | null {
  const w = text.trim().split(/\s+/);
  if (w.length < 3) return null;
  let best: [string, string, string] | null = null;
  let bw = Infinity;
  for (let i = 1; i < w.length - 1; i++)
    for (let j = i + 1; j < w.length; j++) {
      const r: [string, string, string] = [w.slice(0, i).join(" "), w.slice(i, j).join(" "), w.slice(j).join(" ")];
      const m = Math.max(...r.map((x) => x.length));
      if (m < bw) {
        bw = m;
        best = r;
      }
    }
  return best;
}

/* ═════════════ Bezaklar (Figma «Qirmiz / Qatlam · …»; fonlari kesilgan, Normal blend) ═════════════
 * Figma o‘lchami va burilishi aynan: (cx, cy) — bezak markazi, `w×h` — burilmagan o‘lcham, `rot` — burilish (CSS: musbat — soat
 * millari bo‘yicha). `hc` — bo‘lim balandligi (shu birlikda): berilsa, markaz bo‘lim balandligiga nisbatan foizda (laptop yon bezaklari
 * bo‘lim qisqarsa ham keyingi bo‘limga o‘tib ketmaydi). `a` — paydo bo‘lish turi, `px` — parallaks. */
type Kind = "gulchambar" | "shchelkunchik" | "sovga" | "sharlar" | "padub";
type DecoP = {
  kind: Kind;
  cx: number;
  cy: number;
  w: number;
  h?: number;
  rot?: number;
  unit?: (n: number) => string;
  hc?: number;
  a?: string;
  d?: number;
  px?: boolean;
  className?: string;
  eager?: boolean;
  glow?: boolean;
  style?: CSSProperties;
};
function Deco({ kind, cx: x, cy, w, h: h0, rot = 0, unit = U, hc, a, d = 0, px, className, eager, glow, style }: DecoP) {
  const h = h0 ?? w;
  return (
    <div
      aria-hidden
      data-a={a}
      className={cx(st.deco, className)}
      style={vars({
        left: unit(x - w / 2),
        top: hc ? `calc(${+((cy / hc) * 100).toFixed(3)}% - ${unit(h / 2)})` : unit(cy - h / 2),
        width: unit(w),
        height: unit(h),
        "--d": `${d}s`,
        ...(style as Record<string, string>),
      })}
    >
      <div className={st.decoMove} {...(px ? { "data-px": "" } : {})}>
        <div className={st.decoRot} style={{ transform: rot ? `rotate(${rot}deg)` : undefined }}>
          <Img src={`${P}/${kind}.webp`} eager={eager} />
          {glow && <Glow />}
        </div>
      </div>
    </div>
  );
}

/** Gulchambar chiroqlari — ikki guruh (chiroq1/2: rasmning yorqin nuqtalaridan olingan iliq nur), navbat bilan sekin miltillaydi */
function Glow({ className }: { className?: string }) {
  return (
    <span className={cx(st.glow, className)} aria-hidden>
      <Img src={`${P}/chiroq1.webp`} className={st.tw1} />
      <Img src={`${P}/chiroq2.webp`} className={st.tw2} />
    </span>
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

/** Oltin «bezak chiziq» (Figma: 64 + romb 7 (45°) + 64; kenglik 148) — `y` — ramka tepasi (romb qutisi) */
function Rule({ x, y, a, d = 0, className, style }: { x: number; y: number; a?: string; d?: number; className?: string; style?: CSSProperties }) {
  return (
    <div aria-hidden data-a={a} className={cx(st.rule, className)} style={vars({ left: U(x), top: U(y), width: U(148), height: U(9.9), "--d": `${d}s`, ...(style as Record<string, string>) })}>
      <span className={st.ruleL} style={{ top: U(4.45), width: U(64), height: U(1) }} />
      <span className={st.ruleR} style={{ top: U(4.45), width: U(64), height: U(1) }} />
      <span className={st.ruleD} style={{ left: U(70.5), top: U(1.45), width: U(7), height: U(7) }} />
    </div>
  );
}

/**
 * Bosma surat (oq ramka, 12 hoshiya, soya): (cx, cy) — markaz, `w×h` — ramka, `ph` — surat balandligi, `rot` — Figma burilishi.
 * `a="drop"` — stol ustiga tashlangandek tushadi (`--dr` qo‘shimcha burilish, 1.1 → 1), soya bilan.
 */
function Print({ cx: x, cy, w, h, ph, rot, src, d = 0, dr = 4, eager, children, className }: { cx: number; cy: number; w: number; h: number; ph: number; rot: number; src?: string; d?: number; dr?: number; eager?: boolean; children?: ReactNode; className?: string }) {
  return (
    <div className={cx("absolute", className)} style={{ left: U(x - w / 2), top: U(cy - h / 2), width: U(w), height: U(h), transform: rot ? `rotate(${rot}deg)` : undefined }}>
      <div data-a="drop" className={st.print} style={vars({ "--d": `${d}s`, "--dr": `${dr}deg`, borderRadius: U(2) })}>
        <div className={st.printPhoto} style={{ left: U(12), top: U(12), width: U(w - 24), height: U(ph) }}>
          {src ? <Img src={src} eager={eager} /> : children}
        </div>
      </div>
    </div>
  );
}

/* ═════════════ 00 · Hero — taklif kartasi (ochilish; faqat scroll bilan, --o: 0…1) ═════════════
 * Yuklanganda (bosishsiz, Figma «Motion — 30 · Qirmiz» 1): qizil fon ustida gulchambar yuqoridan sirpanib tushadi (chiroqlari sekin
 * miltillaydi — loop), oq qog‘oz karta pastdan chiqadi (60 px pastda, 2° burilgan), sarlavha harflari fade-up, oltin chiziq chiziladi,
 * qisqa matn chiqadi. Scroll (rAF lerp, 0.9 ekran): karta 60 px ko‘tarilib 2° burilishdan tekislanadi (0…0.45); sana, vertikal chiziq,
 * vaqt, «Sizning ishtirokingiz…» va imzo navbat bilan chiqadi (0.14…0.66); bezaklar (Shchelkunchik, sovg‘a, oltin sharlar; laptopda
 * yon bezaklar) chetdan kirib keladi (0.3…0.92, Motion 2). o = 1 — Figma hero kadri aynan. Keyin sahna pastki cheti bilan keyingi
 * bo‘limga yopishib (`--gy`) yuqoriga chiqib ketadi; bezaklar 0.8 tezlikda (parallaks). Figma’da 01-bo‘limning chokdagi gulchambari
 * hero pastini yopadi — sahnada ham sahifa birligida chiziladi (ulanishda aynan ustma-ust tushadi). */
const GATE = {
  // EXT — yuqori gulchambar davomi (kadrdan tashqarida; gulchambar rasmining ko‘rinadigan eni: mobil 438, laptop 522)
  m: { W: 390, HH: 900, S: 1, OX: 0, EXT: [-916, -478, 398, 836] },
  l: { W: 1440, HH: 1080, S: 1.2, OX: 486, EXT: [-1064, -542, 1422, 1944] },
} as const;
/** sahna yopishib turadigan scroll (ekran) */
const STUCK = 0.9;

function HeroCard({ d, gate }: { d: D; gate: boolean }) {
  // sahna ichida — scroll bilan chiqadigan qatorlar (`gUp`, `--k`); embedded/bo‘limda — o‘z joyida
  const up = (k: number) => (gate ? { className: st.gUp, style: vars({ "--k": k }) } : { className: "", style: {} });
  const u0 = up(0);
  const u1 = up(1);
  const u2 = up(2);
  const u3 = up(3);
  return (
    <div className={st.card} style={{ left: U(36), top: U(170), width: U(318), height: U(610), borderRadius: U(4) }}>
      {d.event && (
        <h1 className={cx(st.orn, "absolute")} style={{ left: U(20), width: U(278), top: U(58), color: BROWN }}>
          <Lines2 text={d.event} size={54} lh={54} max={278} three={17} letters={gate} className={st.hTitle} />
        </h1>
      )}
      <Rule x={85} y={183.55} className={gate ? st.gRule : undefined} />
      <p className={cx(st.m4, st.gLead, "absolute text-center")} style={{ left: U(26), top: U(216), width: U(266), fontSize: U(17), lineHeight: 1.55, color: BROWN, overflowWrap: "anywhere" }}>
        {d.lead}
      </p>
      {d.hasDate && (
        <>
          <div className={cx("absolute text-center", u0.className)} style={{ left: U(20), top: U(390), width: U(130), ...u0.style }}>
            <p className={st.m6} style={{ height: U(24), fontSize: U(20), lineHeight: U(24), color: BROWN, whiteSpace: "nowrap" }}>
              <Fit base={20} max={136} deps={d.dayMonth}>
                {d.dayMonth}
              </Fit>
            </p>
            <p className={st.m5} style={{ marginTop: U(6), height: U(17), fontSize: U(14), lineHeight: U(17), color: OCHRE, whiteSpace: "nowrap" }}>
              <Fit base={14} max={136} deps={d.weekday}>
                {d.weekday}
              </Fit>
            </p>
          </div>
          {d.at && (
            <>
              <span className={cx(st.vRule, gate && st.gVRule)} style={vars({ left: U(159), top: U(390), width: U(1), height: U(52), "--k": 0 })} />
              <div className={cx("absolute text-center", u1.className)} style={{ left: U(168), top: U(390), width: U(130), ...u1.style }}>
                <p className={st.m6} style={{ height: U(24), fontSize: U(20), lineHeight: U(24), color: BROWN, whiteSpace: "nowrap" }}>
                  <Fit base={20} max={136} deps={d.at}>
                    {d.at}
                  </Fit>
                </p>
                {d.city && (
                  <p className={st.m5} style={{ marginTop: U(6), height: U(17), fontSize: U(14), lineHeight: U(17), color: OCHRE, whiteSpace: "nowrap" }}>
                    <Fit base={14} max={136} deps={d.city}>
                      {d.city}
                    </Fit>
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}
      <p className={cx(st.m5, "absolute text-center", u2.className)} style={{ left: U(26), top: U(486), width: U(266), fontSize: U(16), lineHeight: 1.5, color: BROWN, ...u2.style }}>
        {d.close}
      </p>
      {d.sign && (
        <p
          className={cx(st.m6, st.clamp3, "absolute text-center", u3.className)}
          style={{ left: U(20), top: U(548), width: U(278), fontSize: U(d.sign.length > 50 ? 14 : d.sign.length > 30 ? 15 : 17), lineHeight: U(d.sign.length > 50 ? 19 : 21), color: OCHRE, textWrap: "balance", ...u3.style }}
        >
          {d.sign}
        </p>
      )}
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
      const H = (el.firstElementChild as HTMLElement | null)?.offsetHeight || window.innerHeight;
      const span = Math.max(1, r.height - 2 * H);
      target = clamp01(-r.top / span);
      // sahna pastki cheti keyingi bo‘limga yopishib ketadi (lerp’siz — tirqish ochilmaydi)
      const gy = Math.min(H, Math.max(0, -r.top - span));
      el.style.setProperty("--gy", `${gy.toFixed(1)}px`);
      el.style.pointerEvents = gy > H * 0.6 ? "none" : "";
    };
    const apply = (o: number) => {
      el.style.setProperty("--o", o.toFixed(4));
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
  const { W, HH, S, OX, EXT } = G;
  const canvas = `calc(100cqw / ${W})`;
  const pu = wide ? COL_L : COL_M;
  // kanvas qutisi (laptop yon bezaklari) va ustun qutisi — sahna pastki chetiga bog‘langan
  const box = (x: number, w: number): CSSProperties => ({ position: "absolute", left: `calc(50% + ${SU(x - W / 2)})`, bottom: 0, width: SU(w), height: SU(HH) });
  // gulchambar qatori ekran eniga to‘lishi uchun (ekran sahnadan keng bo‘lsa) — ikki chetda davomi; laptopda Figma yon gulchambarlari
  const tiles: number[] = [...EXT, ...(wide ? [-20, 900] : [])];
  const gw = wide ? 560 : 470;
  const gh = wide ? 234 : 196;
  const gy0 = wide ? -67 : -58;
  return (
    <div
      ref={wrap}
      className={cx(st.gateWrap, still && st.still)}
      style={vars(still ? { "--su": canvas, "--o": 1, height: SU(HH), marginBottom: 0 } : { "--su": `min(${canvas}, calc(100svh / ${HH}))`, height: `calc(100svh * ${2 + STUCK})` })}
    >
      <div className={st.gate} aria-label={t("Taklifnoma")} style={still ? { position: "relative", height: "100%", transform: "none" } : undefined}>
        {/* yuqori gulchambar: ekran chetlarigacha davomi (Figma kadridan tashqarida) */}
        <div style={box(0, W)}>
          {tiles.map((x, i) => (
            <div key={i} className={st.gGar} style={{ position: "absolute", left: SU(x), top: SU(gy0), width: SU(gw), height: SU(gh) }}>
              <Img src={`${P}/gulchambar.webp`} eager />
              <Glow />
            </div>
          ))}
          {/* laptop yon bezaklari (Figma 00): Shchelkunchik (−6°), sovg‘a (8°), oltin sharlar — chetdan kirib keladi */}
          {wide && (
            <div style={vars({ "--u": "var(--su)" })}>
              <div className={st.gIn} style={vars({ "--k": 0, "--fx": -420, "--fy": 40, "--fr": "-10deg" })}>
                <Deco kind="shchelkunchik" cx={230} cy={620} w={220} h={352} rot={-6} eager />
              </div>
              <div className={st.gIn} style={vars({ "--k": 1, "--fx": 420, "--fy": -60, "--fr": "25deg" })}>
                <Deco kind="sovga" cx={1210} cy={560} w={260} rot={8} eager />
              </div>
              <div className={st.gIn} style={vars({ "--k": 2, "--fx": 380, "--fy": 120, "--fr": "20deg" })}>
                <Deco kind="sharlar" cx={1250} cy={900} w={200} eager />
              </div>
            </div>
          )}
        </div>
        {/* ustun: Figma mobil koordinatalari (laptopda × 1.2) */}
        <div style={{ ...box(OX, 390 * S), ...vars({ "--u": `calc(var(--su) * ${S})` }) }}>
          <div className={st.gGar} style={{ position: "absolute", left: U(-40), top: U(-58), width: U(470), height: U(196) }}>
            <Img src={`${P}/gulchambar.webp`} eager />
            <Glow />
          </div>
          <div className={st.gCard}>
            <div className={st.gCardIn}>
              <HeroCard d={d} gate={!still} />
            </div>
          </div>
          <div className={st.gIn} style={vars({ "--k": 0, "--fx": -80, "--fy": 40, "--fr": "-16deg" })}>
            <Deco kind="shchelkunchik" cx={28} cy={800} w={120} h={192} rot={-6} eager />
          </div>
          <div className={st.gIn} style={vars({ "--k": 1, "--fx": 80, "--fy": -50, "--fr": "40deg" })}>
            <Deco kind="sovga" cx={350} cy={165} w={110} rot={10} eager />
          </div>
          <div className={st.gIn} style={vars({ "--k": 2, "--fx": 70, "--fy": 70, "--fr": "24deg" })}>
            <Deco kind="sharlar" cx={330} cy={820} w={130} eager />
          </div>
        </div>
        {/* 01-bo‘limning chokdagi gulchambari (Figma: hero pastini yopadi) — sahifa birligida, sahna pastki chetidan */}
        <div className={st.gNext} style={vars({ "--u": pu })}>
          <div className="absolute" style={{ left: `calc(50% + ${U(-235)})`, top: `calc(100% + ${U(-98)})`, width: U(470), height: U(196), transform: "rotate(180deg)" }}>
            <Img src={`${P}/gulchambar.webp`} eager />
          </div>
          {wide &&
            [-20, 900].map((x) => (
              <div key={x} className="absolute" style={{ left: `calc(50% + ${C(x - 720)})`, top: `calc(100% - ${C(117)})`, width: C(560), height: C(234), transform: "rotate(180deg)" }}>
                <Img src={`${P}/gulchambar.webp`} eager />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

/* ═════════════ Bo‘lim qobig‘i ═════════════ */
/** Bo‘lim: to‘liq enli qizil fon (Figma radial gradient #b81a26 → #a3141f) + markazda kontent ustuni (mobil 390 birlik; laptopda × 1.2).
 * `outer` — ustundan tashqaridagi bezaklar */
function Sec({ children, z, colStyle, id, outer, className, secRef, style }: { children: ReactNode; z: number; colStyle?: CSSProperties; id?: string; outer?: ReactNode; className?: string; secRef?: React.Ref<HTMLElement>; style?: CSSProperties }) {
  return (
    <section ref={secRef} id={id} className={cx(st.sec, className)} style={{ zIndex: z, ...style }}>
      {outer}
      <div className={st.col} style={{ width: U(390), ...colStyle }}>
        {children}
      </div>
    </section>
  );
}

/** Oq sarlavha (ikki qator, Oranienbaum 40 / 1.05) */
function Title2({ text, top, d = 0 }: { text: string; top?: number; d?: number }) {
  return (
    <div data-a="up" className={cx(st.orn, top != null && "absolute inset-x-0")} style={vars({ top: top != null ? U(top) : undefined, color: "#fff", "--d": `${d}s` })}>
      <Lines2 text={text} size={40} lh={42} max={342} />
    </div>
  );
}

/** Bir qatorli sarlavha (Oranienbaum, markazda, sig‘masa kichrayadi) */
function Title({ text, size, h, color = "#fff", d = 0, style }: { text: string; size: number; h: number; color?: string; d?: number; style?: CSSProperties }) {
  return (
    <p data-a="up" className={cx(st.orn, "text-center")} style={vars({ height: U(h), fontSize: U(size), lineHeight: U(h), color, whiteSpace: "nowrap", "--d": `${d}s`, ...(style as Record<string, string>) })}>
      <Fit base={size} max={330} deps={text}>
        {text}
      </Fit>
    </p>
  );
}

/* ═════════════ 01 · Hamkasblarga — murojaat (mehmon ismi bilan), jamoa surati (bosma rasm: −8° dan −3° ga aylanib, soya bilan
 * «tushadi»), padub shoxi, matn ═════════════ */
function Team({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const hello = d.guest ? guestHello(t, "Hurmatli {guest}!", d.guest) : t("qirmiz::Hurmatli hamkasblar!");
  return (
    <Sec
      z={z}
      colStyle={{ paddingTop: U(690), paddingBottom: U(101.2) }}
      outer={
        <Side wide={wide}>
          <Deco kind="gulchambar" cx={260} cy={0} w={560} h={234} rot={180} unit={C} />
          <Deco kind="gulchambar" cx={1180} cy={0} w={560} h={234} rot={180} unit={C} />
          <Deco kind="padub" cx={250} cy={320} w={200} rot={-12} unit={C} hc={1080} a="edgeL" px />
          <Deco kind="sharlar" cx={1210} cy={620} w={220} unit={C} hc={1080} a="edgeR" d={0.1} px />
        </Side>
      }
    >
      <Deco kind="gulchambar" cx={195} cy={0} w={470} h={196} rot={180} className={st.seam} />
      <div data-a="up" className={cx(st.orn, "absolute inset-x-0")} style={vars({ top: U(140), color: "#fff", "--d": "0.05s" })}>
        <Lines2 text={hello} size={40} lh={42} max={342} />
      </div>
      <Print cx={195} cy={470} w={314} h={378} ph={330} rot={-3} dr={-5} src={d.team || undefined} d={0.15}>
        <div className={st.postcard}>
          <div className={st.postGift} style={{ width: U(150), height: U(150) }}>
            <Img src={`${P}/sovga.webp`} />
          </div>
          {d.newYear > 0 && (
            <p className={st.orn} style={{ marginTop: U(6), fontSize: U(76), lineHeight: 1, color: GOLD }}>
              {d.newYear}
            </p>
          )}
        </div>
      </Print>
      <Deco kind="padub" cx={62} cy={300} w={120} rot={-15} a="pop" d={0.5} px />
      <p
        data-a="up"
        className={cx(st.m4, "relative mx-auto text-center")}
        style={vars({ width: U(330), minHeight: U(108.8), fontSize: U(17), lineHeight: 1.6, color: "rgba(255,255,255,.92)", overflowWrap: "anywhere", whiteSpace: "pre-line", "--d": "0.1s" })}
      >
        {d.message}
      </p>
    </Sec>
  );
}

/* ═════════════ 02 · Kecha dasturi — oq karta; qatorlar 100 ms stagger bilan chiqadi, oltin chiziq chapdan chiziladi ═════════════ */
function Program({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const items = d.program.slice(0, 8);
  if (!items.length) return null;
  const n = items.length;
  return (
    <Sec
      z={z}
      colStyle={{ paddingTop: U(70), paddingBottom: U(70) }}
      outer={
        <Side wide={wide}>
          <Deco kind="sovga" cx={240} cy={560} w={260} rot={-8} unit={C} hc={936} a="edgeL" px />
          <Deco kind="padub" cx={1200} cy={320} w={200} rot={15} unit={C} hc={936} a="edgeR" d={0.1} px />
        </Side>
      }
    >
      {/* karta: 150 (sarlavha, chiziq) + qatorlar (har biri ≥ 92; uzun nom 3 qatorgacha — qator o‘sadi) + 30 */}
      <div data-a="card" className={cx(st.card, st.flowCard, "mx-auto")} style={{ width: U(342), padding: `${U(150)} ${U(28)} ${U(30)}`, borderRadius: U(4) }}>
        <div className="absolute inset-x-0" style={{ top: U(44) }}>
          <Title text={t("Kecha dasturi")} size={38} h={44} color={BROWN} d={0.15} />
        </div>
        <Rule x={97} y={99.55} a="rule" d={0.3} />
        {items.map((it, i) => (
          <div key={i} data-a="row" className="relative" style={vars({ minHeight: U(92), padding: `${U(8)} 0 ${U(40)} ${U(90)}`, "--d": `${0.35 + i * 0.1}s` })}>
            <p className={cx(st.orn, st.pTime, "absolute")} style={{ left: 0, top: 0, height: U(35), fontSize: U(30), lineHeight: U(35), color: OCHRE }}>
              <Fit base={30} max={84} deps={it.time}>
                {it.time}
              </Fit>
            </p>
            <p className={cx(st.m6, st.clamp3)} style={{ fontSize: U(17), lineHeight: U(22), color: BROWN }}>
              {it.title}
            </p>
            {i < n - 1 && <span className={st.pLine} style={{ bottom: U(21), height: U(1) }} />}
          </div>
        ))}
        <Deco kind="sharlar" cx={326} cy={-20} w={110} a="pop" d={0.2} px />
        <Deco kind="padub" cx={20} cy={0} w={110} rot={20} a="pop" d={0.4} px style={{ top: `calc(100% - ${U(65)})` }} />
      </div>
    </Sec>
  );
}

/* ═════════════ 03 · Bir yillik lahzalar — 3 ta bosma rasm stol ustiga tashlangandek navbat bilan tushadi (rotate + 1.1 → 1).
 * Suratlar bo‘lmasa — bo‘lim yo‘qoladi; 1 ta — katta; 2 ta — ikkita kichik; 3 ta — Figma ═════════════ */
function Gallery({ d, z, wide }: { d: D; z: number; wide: boolean }) {
  const t = useT();
  const list = d.gallery;
  if (!list.length) return null;
  const n = list.length;
  // 1 ta: faqat katta surat (bo‘lim 640); 2 ta: ikki kichik surat 290 yuqorida (650); 3 ta: Figma (940)
  const h = n === 1 ? 640 : n === 2 ? 650 : 940;
  const sh = n === 2 ? -290 : 0;
  return (
    <Sec
      z={z}
      colStyle={{ height: U(h) }}
      outer={
        <Side wide={wide}>
          <Deco kind="sharlar" cx={230} cy={320} w={220} unit={C} hc={1128} a="edgeL" px />
          <Deco kind="padub" cx={1220} cy={760} w={200} rot={-10} unit={C} hc={1128} a="edgeR" d={0.1} px />
        </Side>
      }
    >
      <Title2 text={t("qirmiz::Bir yillik lahzalar")} top={80} />
      {n !== 2 && <Print cx={195} cy={360} w={324} h={268} ph={220} rot={-3} dr={-6} src={list[0]} d={0.1} />}
      {n >= 2 && (
        <>
          <Print cx={115} cy={660 + sh} w={184} h={258} ph={210} rot={5} dr={8} src={list[n === 2 ? 0 : 1]} d={0.25} />
          <Print cx={280} cy={690 + sh} w={184} h={258} ph={210} rot={-4} dr={-8} src={list[n === 2 ? 1 : 2]} d={0.4} />
        </>
      )}
      <Deco kind="sovga" cx={350} cy={n === 1 ? 560 : 860 + sh} w={130} rot={-8} a="pop" d={0.55} px />
    </Sec>
  );
}

/* ═════════════ 04 · Bazmgacha — taymer: raqamlar har soniyada pastdan yangilanadi; kalendarga qo‘shish ═════════════ */
/**
 * Raqamlar doim 2 xonali («05»). Sanoq tugagach o‘zgargan raqam pastdan ko‘tariladi (translateY 0.42em → 0, shaffofliksiz, kesilmaydi):
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
          <span key={dg} className={live ? st.digitTick : undefined}>
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
  const X = [10, 90.5, 171, 251.5];
  return (
    <Sec
      z={z}
      colStyle={{ height: U(580) }}
      outer={
        <Side wide={wide}>
          <Deco kind="padub" cx={250} cy={330} w={180} rot={-10} unit={C} hc={696} a="edgeL" px />
          <Deco kind="sharlar" cx={1200} cy={360} w={180} unit={C} hc={696} a="edgeR" d={0.1} px />
        </Side>
      }
    >
      <div ref={ref} data-a="card" className={st.card} style={{ left: U(24), top: U(80), width: U(342), height: U(400), borderRadius: U(4) }}>
        <div className="absolute inset-x-0" style={{ top: U(44) }}>
          <Title text={t("qirmiz::Bazmgacha")} size={36} h={42} color={BROWN} d={0.15} />
        </div>
        <Rule x={97} y={99.55} a="rule" d={0.3} />
        {vals.map((v, i) => (
          <div key={i} data-a="cell" className="absolute" style={vars({ left: U(X[i]), top: U(140), width: U(80), height: U(76), "--d": `${0.3 + i * 0.12}s` })}>
            <p className={cx(st.orn, "text-center")} style={{ height: U(51), fontSize: U(44), lineHeight: U(51), color: BROWN, whiteSpace: "nowrap" }}>
              <Fit base={44} max={78} deps={String(vals[0]).length}>
                <Digits value={v} run={inView} len={i === 0 ? Math.max(2, String(vals[0]).length) : 2} i={i} />
              </Fit>
            </p>
            <p className={cx(st.m5, "text-center")} style={{ marginTop: U(7), height: U(16), fontSize: U(13), lineHeight: U(16), color: OCHRE, whiteSpace: "nowrap" }}>
              <Fit base={13} max={78} deps={units[i]}>
                {units[i]}
              </Fit>
            </p>
          </div>
        ))}
        {[90, 170.5, 251].map((x, i) => (
          <span key={i} data-a="vline" className={st.tLine} style={vars({ left: U(x), top: U(148), width: U(1), height: U(60), "--d": `${0.4 + i * 0.12}s` })} />
        ))}
        {d.dateLine && (
          <p data-a="up" className={cx(st.m6, "absolute inset-x-0 text-center")} style={vars({ top: U(252), height: U(21), fontSize: U(17), lineHeight: U(21), color: BROWN, whiteSpace: "nowrap", "--d": "0.5s" })}>
            <Fit base={17} max={310} deps={d.dateLine}>
              {d.dateLine}
            </Fit>
          </p>
        )}
        <div data-a="up" className="absolute inset-x-0 flex justify-center" style={vars({ top: U(300), "--d": "0.6s" })}>
          <button
            type="button"
            className={cx(st.m6, st.btnRed)}
            style={{ minWidth: U(250), maxWidth: U(310), height: U(56), padding: `0 ${U(20)}`, fontSize: U(16), borderRadius: U(28) }}
            onClick={() =>
              downloadIcs({
                title: d.calTitle,
                startLocal: `${d.iso}T${d.time || "18:00"}`,
                location: [d.venueTitle, d.address].filter(Boolean).join(", "),
                slug: "qirmiz",
              })
            }
          >
            <Fit base={16} max={270} deps={t("Kalendarga qo‘shish")}>
              {t("Kalendarga qo‘shish")}
            </Fit>
          </button>
        </div>
      </div>
    </Sec>
  );
}

/* ═════════════ 05 · Manzil — bosma ramkada bazm zali surati (mijozning 5-surati; bo‘lmasa — shablonniki), joy nomi, manzil,
 * xarita va yo‘nalish ═════════════ */
function Venue({ d, z, wide, linkable }: { d: D; z: number; wide: boolean; linkable: boolean }) {
  const t = useT();
  if (!d.hasPlace) return null;
  const btn = (s: string) => (
    <Fit base={16} max={150} deps={s}>
      {s}
    </Fit>
  );
  return (
    <Sec
      z={z}
      colStyle={{ paddingTop: U(110), paddingBottom: U(164) }}
      outer={
        <Side wide={wide}>
          <Deco kind="shchelkunchik" cx={230} cy={560} w={200} h={320} rot={-6} unit={C} hc={1032} a="edgeL" px />
          <Deco kind="sovga" cx={1210} cy={600} w={240} rot={10} unit={C} hc={1032} a="edgeR" d={0.1} px />
        </Side>
      }
    >
      <Deco kind="padub" cx={330} cy={-10} w={120} rot={30} a="pop" className={st.seam} px />
      <Title text={t("Manzil")} size={40} h={46} />
      <div data-a="card" className={cx(st.print, st.printFlat, "relative mx-auto")} style={vars({ marginTop: U(40), width: U(342), height: U(268), borderRadius: U(2), "--d": "0.1s" })}>
        <div className={st.printPhoto} style={{ left: U(12), top: U(12), width: U(318), height: U(220) }}>
          <Img src={d.hall} className={st.zoomImg} />
        </div>
      </div>
      {d.venueTitle && (
        <p
          data-a="up"
          className={cx(st.m6, "mx-auto text-center")}
          style={vars({ marginTop: U(36), width: U(342), minHeight: U(29), fontSize: U(24), lineHeight: 1.2, color: "#fff", overflowWrap: "anywhere", textWrap: "balance", "--d": "0.15s" })}
        >
          {d.venueTitle}
        </p>
      )}
      {d.address && (
        <p
          data-a="up"
          className={cx(st.m4, "mx-auto text-center")}
          style={vars({ marginTop: U(d.venueTitle ? 15 : 36), width: U(330), minHeight: U(48), fontSize: U(16), lineHeight: 1.5, color: "rgba(255,255,255,.85)", overflowWrap: "anywhere", "--d": "0.22s" })}
        >
          {d.address}
        </p>
      )}
      <div data-a="up" className="relative mx-auto flex" style={vars({ marginTop: U(48), width: U(342), gap: U(12), "--d": "0.3s" })}>
        <a
          href={linkable ? d.mapUrl : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(st.m6, st.btnWhite)}
          style={{ flex: "1 1 0", minWidth: 0, height: U(56), padding: `0 ${U(8)}`, fontSize: U(16), borderRadius: U(28) }}
        >
          {btn(t("Xaritada ochish"))}
        </a>
        <a
          href={linkable ? d.taxi : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={cx(st.m6, st.btnLine)}
          style={{ flex: "1 1 0", minWidth: 0, height: U(56), padding: `0 ${U(8)}`, fontSize: U(16), borderWidth: U(1.4), borderRadius: U(28) }}
        >
          {btn(t("Yo‘nalish"))}
        </a>
      </div>
    </Sec>
  );
}

/* ═════════════ 06 · Dress-kod (ixtiyoriy — o‘chirilsa joy qolmaydi): oq karta — turi (Oranienbaum) va izoh ═════════════ */
function Dress({ d, z }: { d: D; z: number }) {
  if (!d.dressNote && !d.dressTitle) return null;
  return (
    <Sec z={z} colStyle={{ paddingTop: U(40), paddingBottom: U(119) }}>
      <div
        data-a="card"
        className={cx(st.card, st.flowCard, "relative mx-auto flex flex-col items-center text-center")}
        style={{ width: U(342), minHeight: U(171), padding: `${U(34)} ${U(30)}`, gap: U(12), borderRadius: U(4), justifyContent: "center" }}
      >
        {d.dressTitle && (
          <p className={st.orn} style={{ height: U(41), fontSize: U(34), lineHeight: U(41), color: BROWN, whiteSpace: "nowrap" }}>
            <Fit base={34} max={282} deps={d.dressTitle}>
              {d.dressTitle}
            </Fit>
          </p>
        )}
        {d.dressNote && (
          <p className={st.m4} style={{ width: "100%", fontSize: U(17), lineHeight: 1.5, color: BROWN, overflowWrap: "anywhere" }}>
            {d.dressNote}
          </p>
        )}
      </div>
    </Sec>
  );
}

/* ═════════════ 07 · Anketa — javob («Kelaman» bosilganda karta ustida oltin uchqunlar sochiladi) ═════════════ */
const SPARKS = [
  [-1.1, -1.0, 0],
  [-0.6, -1.5, 1],
  [0.05, -1.7, 0],
  [0.7, -1.4, 1],
  [1.15, -0.9, 0],
  [-1.3, 0.1, 1],
  [1.35, 0.15, 1],
  [-0.85, 0.9, 0],
  [0.9, 0.95, 0],
  [-0.2, 1.2, 1],
] as const;
function Rsvp({ d, slug, mode, z, wide }: { d: D; slug: string; mode: InvitationSiteProps["mode"]; z: number; wide: boolean }) {
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
    <p className={cx(st.m6, st.lbl)} style={{ marginTop: U(mt), height: U(17), fontSize: U(14), lineHeight: U(17) }}>
      {s}
    </p>
  );
  const sub = d.rsvpUntil ? t("Iltimos, {date} javob bering", { date: d.rsvpUntil }) : t("Javobingizni kutamiz");
  const pick = (s: RsvpStatus) => {
    setStatus(s);
    if (s === "coming") setBurst((n) => n + 1);
  };
  return (
    <Sec
      z={z}
      id="qirmiz-javob"
      colStyle={{ paddingTop: U(70), paddingBottom: U(90) }}
      outer={
        <Side wide={wide}>
          <Deco kind="sharlar" cx={240} cy={640} w={220} unit={C} hc={1176} a="edgeL" px />
          <Deco kind="padub" cx={1200} cy={420} w={200} rot={12} unit={C} hc={1176} a="edgeR" d={0.1} px />
        </Side>
      }
    >
      <div data-a="card" className={cx(st.card, st.flowCard, "relative mx-auto")} style={{ width: U(342), padding: `0 ${U(24)} ${U(84)}`, borderRadius: U(4) }}>
        <h2 className={cx(st.orn, "text-center")} style={{ paddingTop: U(46), height: U(92), fontSize: U(40), lineHeight: U(46), color: BROWN, whiteSpace: "nowrap" }}>
          <Fit base={40} max={330} deps={t("Kelasizmi?")}>
            {t("Kelasizmi?")}
          </Fit>
        </h2>
        <div className="relative" style={{ height: U(32) }}>
          <Rule x={73} y={7.55} a="rule" d={0.3} />
        </div>
        <p className={cx(st.m4, "text-center")} style={{ margin: `0 ${U(-24)}`, minHeight: U(18), fontSize: U(15), lineHeight: U(18), color: OCHRE, overflowWrap: "anywhere" }}>
          {sub}
        </p>
        {sent ? (
          <div key="thanks" className={cx(st.thanks, "relative flex flex-col items-center justify-center text-center")} style={{ marginTop: U(38), padding: `0 0 ${U(30)}`, gap: U(16), minHeight: U(556) }}>
            <div className="relative" style={{ width: U(130), height: U(130) }}>
              <Img src={`${P}/${sent === "not_coming" ? "padub" : "sovga"}.webp`} className={st.thanksImg} />
            </div>
            <p className={st.orn} style={{ fontSize: U(sent === "not_coming" ? 36 : 30), lineHeight: 1.2, color: BROWN, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Rahmat!") : t("Rahmat! Joyingiz band qilindi")}
            </p>
            <p className={st.m4} style={{ fontSize: U(17), color: OCHRE, lineHeight: 1.5, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Javobingiz uchun rahmat!") : t("{name} — {count} kishi. Javobingiz yetkazildi.", { name: name.trim() || t("Javobingiz"), count })}
            </p>
            <button type="button" onClick={() => setSent(null)} className={st.m6} style={{ fontSize: U(16), color: "#a3141f", textDecoration: "underline", textUnderlineOffset: 3 }}>
              {t("Javobni o‘zgartirish")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="relative flex flex-col items-stretch" style={{ marginTop: U(38) }}>
            {label(t("Ismingiz"), 0)}
            <label className={st.field} style={{ marginTop: U(7), height: U(54), padding: `0 ${U(15)}`, borderRadius: U(12) }}>
              <input
                className={cx(st.m4, st.input)}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder={t("Ism va familiya")}
                aria-label={t("Ismingiz")}
                style={{ fontSize: U(16), lineHeight: U(20) }}
              />
            </label>
            {label(t("Kelasizmi?"), 24)}
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
                  className={cx(st.m6, st.choice)}
                  style={{ flex: "1 1 0", padding: `${U(4)} ${U(6)}`, minHeight: U(54), fontSize: U(16), borderWidth: U(1.4), borderRadius: U(27) }}
                >
                  <span style={{ overflowWrap: "anywhere" }}>{t(l)}</span>
                  {s === "coming" && burst > 0 && (
                    <span key={burst} aria-hidden className={st.sparks}>
                      {SPARKS.map(([px, py, k], i) => (
                        <span key={i} className={cx(st.spark, k === 1 && st.sparkDot)} style={vars({ "--sx": px, "--sy": py, "--sd": `${i * 0.025}s` })} />
                      ))}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {status === "coming" && (
              <>
                {label(t("Necha kishi bo‘lasiz?"), 24)}
                <div className={cx(st.counter, "justify-between")} style={{ marginTop: U(7), height: U(54), padding: `0 ${U(8)}`, borderRadius: U(27) }}>
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
                  <span className={st.orn} style={{ fontSize: U(28), lineHeight: 1.15, color: BROWN }} aria-live="polite">
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
            {label(t("Tilaklaringiz"), 24)}
            <label className={st.field} style={{ marginTop: U(7), height: U(140), padding: U(15), borderRadius: U(12), alignItems: "stretch" }}>
              <textarea
                className={cx(st.m4, st.input)}
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                maxLength={500}
                placeholder={t("Yozing…")}
                aria-label={t("Tilaklaringiz")}
                style={{ fontSize: U(16), lineHeight: U(21), height: "100%" }}
              />
            </label>
            {err && (
              <p className={st.m4} style={{ marginTop: U(12), color: "#a3141f", fontSize: U(15) }}>
                {err}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className={cx(st.m6, st.btnRed)}
              style={{ marginTop: U(30), minHeight: U(56), padding: `${U(8)} ${U(12)}`, fontSize: U(16), borderRadius: U(28), opacity: busy ? 0.7 : 1 }}
            >
              {busy ? t("Yuborilmoqda…") : t("Yuborish")}
            </button>
          </form>
        )}
      </div>
      <Deco kind="sovga" cx={350} cy={40} w={110} rot={12} a="pop" d={0.3} className={st.seam} px />
    </Sec>
  );
}

/* ═════════════ 08 · Final — «Sizni kutamiz!», oltin chiziq, kompaniya; bezaklar chetdan kiradi, pastki gulchambar chiroqlari yonadi
 * (scroll bilan: --fc 0 … 1 = Figma kadri; sahifa oxirigacha albatta tugaydi) ═════════════ */
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
  const title = t("Sizni kutamiz!");
  const sign = d.sign || d.event;
  return (
    <Sec
      secRef={ref}
      z={z}
      className={st.finalWrap}
      style={still ? vars({ "--fc": 1 }) : undefined}
      colStyle={{ height: U(880) }}
      outer={
        <Side wide={wide}>
          <Deco kind="gulchambar" cx={260} cy={0} w={560} h={234} rot={180} unit={C} />
          <Deco kind="gulchambar" cx={1180} cy={0} w={560} h={234} rot={180} unit={C} />
          <div className={st.fIn} style={vars({ "--k": 0, "--fx": -320, "--fy": 0, "--fr": "-20deg" })}>
            <Deco kind="sovga" cx={250} cy={520} w={260} rot={-8} unit={C} hc={1056} />
          </div>
          <div className={st.fIn} style={vars({ "--k": 1, "--fx": 320, "--fy": 0, "--fr": "20deg" })}>
            <Deco kind="sharlar" cx={1200} cy={560} w={200} unit={C} hc={1056} />
          </div>
          <Deco kind="gulchambar" cx={260} cy={940} w={560} h={234} unit={C} hc={1056} glow className={st.fLights} />
          <Deco kind="gulchambar" cx={1180} cy={940} w={560} h={234} unit={C} hc={1056} glow className={st.fLights} />
        </Side>
      }
    >
      <Deco kind="gulchambar" cx={195} cy={0} w={470} h={196} rot={180} className={st.seam} />
      <div className={st.fIn} style={vars({ "--k": 0, "--fx": -150, "--fy": 20, "--fr": "-14deg" })}>
        <Deco kind="shchelkunchik" cx={40} cy={640} w={130} h={208} rot={-6} />
      </div>
      <div className={cx(st.orn, "absolute inset-x-0")} style={{ top: U(300), color: "#fff" }}>
        {(split2(title) ?? [title]).map((r, i) => (
          <p key={i} className={cx(st.fUp, "text-center")} style={vars({ height: U(52), fontSize: U(52), lineHeight: U(52), whiteSpace: "nowrap", "--k": i })}>
            <Fit base={52} max={342} deps={r}>
              {r}
            </Fit>
          </p>
        ))}
      </div>
      <Rule x={121} y={431.55} className={st.fRule} />
      {sign && (
        <p className={cx(st.m6, st.fUp, st.clamp3, "absolute text-center")} style={vars({ left: U(24), width: U(342), top: U(466), fontSize: U(18), lineHeight: U(22), color: GOLD, textWrap: "balance", "--k": 3 })}>
          {sign}
        </p>
      )}
      <div className={st.fIn} style={vars({ "--k": 1, "--fx": 140, "--fy": 30, "--fr": "18deg" })}>
        <Deco kind="sharlar" cx={320} cy={600} w={140} />
      </div>
      <Deco kind="gulchambar" cx={195} cy={780} w={470} h={196} glow className={st.fLights} />
    </Sec>
  );
}

/* ═════════════ Musiqa tugmasi — Figma «Qirmiz / Musiqa tugmasi (fixed)»: oq doira (52), oltin hoshiya 1.5, 4 ta qizil chiziq beatga
 * mos sakraydi; o‘chirilgan — chiziqlar kalta (4 px) ═════════════ */
const BARS = [10, 18, 13, 20];
function QirmizMusic({ m, wide, embedded }: { m: ReturnType<typeof useMusic>; wide: boolean; embedded: boolean }) {
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
type Key = "team" | "program" | "gallery" | "timer" | "venue" | "dress" | "rsvp" | "final";

export function QirmizSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const loaded = usePreload(
    [`${P}/gulchambar.webp`, `${P}/shchelkunchik.webp`, `${P}/sovga.webp`, `${P}/sharlar.webp`],
    [`${P}/chiroq1.webp`, `${P}/chiroq2.webp`, `${P}/padub.webp`, d.team, ...d.gallery, d.hall].filter(Boolean),
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

  const shown: Key[] = (["team", "program", "gallery", "timer", "venue", "dress", "rsvp", "final"] as Key[]).filter((k) =>
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
      <div className={st.page} style={vars({ "--u": colU })}>
        <QirmizMusic m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/muhr.svg`} />}
        <div className={st.flow}>
          {withGate && (loaded ? <Gate d={d} wide={wide} onStart={() => music.play(true)} /> : <div className={st.gateHold} />)}
          {embedded && <Gate d={d} wide={wide} still onStart={() => {}} />}
          <Team d={d} z={z("team")} wide={wide} />
          <Program d={d} z={z("program")} wide={wide} />
          <Gallery d={d} z={z("gallery")} wide={wide} />
          <Timer d={d} z={z("timer")} wide={wide} />
          <Venue d={d} z={z("venue")} wide={wide} linkable={linkable} />
          <Dress d={d} z={z("dress")} />
          {data.rsvpEnabled && <Rsvp d={d} slug={data.slug} mode={mode} z={z("rsvp")} wide={wide} />}
          <Final d={d} z={z("final")} wide={wide} still={embedded} onSeen={onFinal} />
        </div>
        <footer className={cx(st.footer, "flex items-start justify-center")} style={{ height: U(120), paddingTop: U(50) }}>
          <p className={cx(st.m5, "text-center")} style={{ fontSize: U(14), lineHeight: U(17), color: "rgba(255,255,255,.55)" }}>
            <a href="https://shohnoma.uz">{t("shohnoma.uz orqali yaratilgan")}</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
