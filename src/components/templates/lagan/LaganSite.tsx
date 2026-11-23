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
import { DRESS_TEXT, LAGAN_DEMO, LAGAN_DEMO_EN, LAGAN_DEMO_RU, MSG_BRIDE, MSG_GROOM, MSG_PLAIN, P, SUB_BRIDE, SUB_GROOM, SUB_PLAIN } from "./data";
import st from "./lagan.module.css";

/* ── Birliklar ──
 * U — joriy `--u`. Bo‘limlarda — kontent ustuni (Figma mobil 390 koordinatalari; laptopda ustun = mobil × 1.2, ya’ni 468px / 1440 —
 * Figma «Kontent ustuni (mobil ×1.2)»). C — laptop kanvasi (1440) birligi: yon laganlar.
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

/* Ranglar (Figma «25 · Lagan — Assets»): kobalt, firuza, oxra, sut, muz, siyoh */
const COBALT = "#1E4FA3";
const TEAL = "#2BA3B8";
const OCHRE = "#D9A441";
const MILK = "#F7F9FC";
const INK = "#13224A";

/** Server yaratadigan standart taklif matni (php/api/lib/orders.php DEFAULT_MESSAGE) — har qaysi tilda */
const SERVER_DEFAULT = "Aziz mehmonlar! Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.";
const isServerDefault = (m: string) => (["uz", "ru", "en"] as Locale[]).some((l) => tr(l, SERVER_DEFAULT).trim() === m.trim());

function useData({ template, data, mode }: Pick<InvitationSiteProps, "template" | "data" | "mode">) {
  const demo = mode === "demo";
  const t = useT();
  const lang = useLocale();
  const DEMO = lang === "ru" ? LAGAN_DEMO_RU : lang === "en" ? LAGAN_DEMO_EN : LAGAN_DEMO;
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
    // marosim: nikoh (asosiy) yoki fotiha — matndagi «nikoh to‘yi» / «fotiha to‘yi» (Tong bilan umumiy kalitlar)
    const kind = t(data.ceremony === "fotiha" ? "tong::fotiha to‘yi" : "tong::nikoh to‘yi");
    const Kind = kind.charAt(0).toLocaleUpperCase(lang) + kind.slice(1);
    // taklif kim nomidan: kelin tomoni (Figma namunasi) yoki kuyov tomoni (tanlanmasa — Tong/Qozon’dagidek kuyov tomoni)
    const bride = (demo ? DEMO.side : str("side")) === "Kelin tomoni";
    const names = inviteNames(a, b, "nikoh");
    const time = sd?.time ?? "";
    const program = (demo ? DEMO.program : exProgram.length ? exProgram : ((data.program ?? []) as ProgramItem[])) as ProgramItem[];
    const raw = (demo ? "" : data.message || "").trim();
    const custom =
      raw && !isServerDefault(raw)
        ? raw.replace(/^\s*(Aziz mehmonlar!|Qadrli mehmonlar!|Muhtaram mehmonlar!|Assalomu alaykum!|Дорогие гости!|Dear guests!)\s*/, "").trim()
        : "";
    // matnlarda — faqat ism (familiyasiz): «Qizimiz Nilufarning …»
    const first = (s: string) => s.split(/\s+/)[0] || "";
    const subName = bride ? first(b) || first(a) : first(a) || first(b);
    const message = custom || (subName ? t(bride && first(b) ? MSG_BRIDE : MSG_GROOM, { name: subName, kind }) : t(MSG_PLAIN, { kind, Kind }));
    const sub = subName ? t(bride && first(b) ? SUB_BRIDE : SUB_GROOM, { name: subName, kind }) : t(SUB_PLAIN, { kind, Kind });
    const code = str("dressCode") || (demo ? DEMO.dressCode : "");
    const dressNote = str("dressNote") || (DRESS_TEXT[code] ? t(DRESS_TEXT[code]) : "");
    const venueTitle = ((demo ? t(data.venueName) : data.venueName) || "").trim();
    const address = ((demo ? DEMO.address : data.address) || "").trim();
    const coords = coordsFrom(data.mapUrl);
    const m = date ? date.getUTCMonth() : 0;
    const year = date ? date.getUTCFullYear() : 0;
    const day = date ? date.getUTCDate() : 0;
    // namunada javob muddati — Figma’dagidek sanadan 4 kun oldin («24-dekabrgacha» — 28-dekabr uchun)
    const deadline = demo && sd ? new Date(Date.UTC(year, m, day - 4)).toISOString().slice(0, 10) : data.rsvpDeadline;
    const wd = date ? cw.weekday[date.getUTCDay()] : "";
    // «28-dekabr» / «28 декабря» / «28 December»
    const dayMonth = date ? (lang === "uz" ? `${day}-${cw.monthsAfterDay[m]}` : `${day} ${cw.monthsAfterDay[m]}`) : "";
    // hero: «28-dekabr, yakshanba · 06:00» / «28 декабря, воскресенье · 06:00» / «Sunday, 28 December · 06:00»
    const heroDay = date ? (lang === "en" ? `${wd}, ${dayMonth}` : `${dayMonth}, ${wd.toLocaleLowerCase(lang)}`) : "";
    // mijoz suratlari: 1–3 — «Dasturxon» galereyasi, 4 — «Manzil»; bo‘sh slot o‘rnida shablonning surati
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
      heroDate: [heroDay, time].filter(Boolean).join(" · "),
      /** «28-dekabr · soat 06:00» */
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
      gallery: [own[0] || `${P}/rishton.webp`, own[1] || `${P}/choynak.webp`, own[2] || `${P}/non.webp`],
      hall: own[3] || `${P}/dasturxon.webp`,
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

/** Yon laganlar — skrollda sekin parallaks (`--py`, ±40px). Faqat `translate` — paydo bo‘lish va aylanish bilan to‘qnashmaydi */
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
const RING24 = Array.from({ length: 24 }, (_, i) => i);
const RING12 = Array.from({ length: 12 }, (_, i) => i);

/**
 * Naqshli lagan (Figma «Lagan / Naqshli lagan (vektor)», 400×400) — har halqa alohida qatlam:
 * tashqi (asos, kobalt va firuza halqalar, 24 barg), o‘rta (12 kobalt barg, oxra nuqtalar), ichki (yulduz va oxra markaz).
 * `s` — Figma’dagi nusxa o‘lchami (mobil birlikda): Figma nusxani kichraytirganda chiziq qalinligi o‘zgarmaydi (kobalt 10, qolganlari 3,
 * ichki chiziq) — shuning uchun halqalar radiusi va qalinligi shu o‘lchamdan hisoblanadi. `s` yo‘q — asl vektor mutanosib (yon bezaklar).
 * `paint` — tashqi barglar birin-ketin «bo‘yaladi» (stagger 30 ms); `turn` — tashqi halqa sekin aylanadi, o‘rta halqa teskari.
 */
function LaganSvg({ s, paint, turn }: { s?: number; paint?: boolean; turn?: boolean }) {
  const k = s ? 400 / s : 1;
  const f = (n: number) => +n.toFixed(3);
  return (
    <svg viewBox="0 0 400 400" aria-hidden className={st.svg} focusable="false">
      <g className={cx(st.g, turn && st.turnO)}>
        <circle cx="200" cy="200" r={f(200 - 2 * k)} fill={MILK} />
        <circle cx="200" cy="200" r={f(200 - 5 * k)} fill="none" stroke={COBALT} strokeWidth={f(10 * k)} />
        <circle cx="200" cy="200" r={f(186 - 1.5 * k)} fill="none" stroke={TEAL} strokeWidth={f(3 * k)} />
        {RING24.map((i) => (
          <ellipse key={i} cx="200" cy="34" rx="8" ry="17" transform={`rotate(${i * 15} 200 200)`} fill={i % 2 ? TEAL : COBALT} className={paint ? st.pt : undefined} style={paint ? vars({ "--i": i }) : undefined} />
        ))}
      </g>
      <g className={cx(st.g, turn && st.turnM)}>
        <circle cx="200" cy="200" r={f(150 - 1.5 * k)} fill={MILK} stroke={COBALT} strokeWidth={f(3 * k)} />
        {RING12.map((j) => (
          <ellipse key={j} cx="200" cy="82" rx="13" ry="30" transform={`rotate(${15 + j * 30} 200 200)`} fill={COBALT} fillOpacity="0.9" className={paint ? st.pm : undefined} style={paint ? vars({ "--i": j }) : undefined} />
        ))}
        {RING12.map((j) => (
          <circle key={j} cx="200" cy="70" r="4" transform={`rotate(${j * 30} 200 200)`} fill={OCHRE} />
        ))}
      </g>
      <g className={cx(st.g, turn && st.turnO)}>
        <circle cx="200" cy="200" r={f(85 - 1.5 * k)} fill={MILK} stroke={TEAL} strokeWidth={f(3 * k)} />
        <path d="M200 145L211.576 172.053L238.891 161.109L227.947 188.424L255 200L227.947 211.576L238.891 238.891L211.576 227.947L200 255L188.424 227.947L161.109 238.891L172.053 211.576L145 200L172.053 188.424L161.109 161.109L188.424 172.053L200 145Z" fill={COBALT} />
        <circle cx="200" cy="200" r="20" fill={OCHRE} />
      </g>
    </svg>
  );
}

/**
 * Lagan bezagi: tashqi qavat — joy, shaffoflik va parallaks (`data-px`), o‘rta — paydo bo‘lish (`data-a`), ichki — sekin aylanish.
 */
function Lagan({ box, unit, op = 1, d = 0, px, pk, className, still, slow, fixed }: { box: readonly [number, number, number]; unit: Pos; op?: number; d?: number; px?: boolean; pk?: number; className?: string; still?: boolean; slow?: boolean; fixed?: boolean }) {
  const [x, y, s] = box;
  return (
    <div aria-hidden data-px={px ? "" : undefined} data-pk={pk} className={cx(st.art, className)} style={{ left: unit(x), top: unit(y), width: unit(s), height: unit(s), opacity: op }}>
      <div data-a="pop" className={st.fill} style={vars({ "--d": `${d}s` })}>
        <div className={cx(st.fill, !still && (slow ? st.spinSlow : st.spin))}>
          <LaganSvg s={fixed ? s : undefined} />
        </div>
      </div>
    </div>
  );
}

/**
 * Koshin chiziq (Figma «Lagan / Koshin chiziq»): kobalt va firuza romblar — to‘liq kenglikda, sekin gorizontal siljiydi (marquee).
 * `y` — bo‘lim tepasidan (ustun birligida), `dir` — siljish yo‘nalishi.
 */
function Koshin({ top, h, period = U(57.2), dir = 1, still, className }: { top: string; h: string; period?: string; dir?: 1 | -1; still?: boolean; className?: string }) {
  return (
    <div aria-hidden className={cx(st.koshin, className)} style={vars({ top, height: h, "--kp": period })}>
      <div className={cx(st.kTrack, !still && (dir > 0 ? st.kRight : st.kLeft))} />
    </div>
  );
}

/* ═════════════ 00 · Ochilish — lagan aylanib keladi (faqat scroll bilan, --o: 0…1) ═════════════
 * Yuklanganda (bosishsiz): oq fonda lagan kichik holatdan aylanib kattalashadi (scale 0.4 → 1, rotate −180° → 0, 1.4 s), tashqi
 * halqadagi barglar birin-ketin «bo‘yaladi» (stagger 30 ms), koshin chiziqlar markazdan chiziladi, sarlavha sokin chiqadi.
 * Scroll (rAF lerp): yozuvlar so‘nadi, koshin chiziqlar chetga suriladi, lagan aylanib ekranni to‘ldirguncha kattalashadi va
 * ekran o‘rtasiga keladi, fon kobaltga o‘tadi (fon qatlami — orqasida kontent yo‘q, «sharpa» bo‘lmaydi), lagan markaziga osh
 * tortiladi. Ochilish tugagach sahna odatdagidek yuqoriga ketadi va kobalt hero (01) ostidan chiqadi (qattiq chok, bir xil rang). */
const GATE = {
  m: { W: 390, H: 844, S: 1, OX: 0, K: 1.75 },
  l: { W: 1440, H: 1013, S: 1.2, OX: 486, K: 3 },
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
  const { W, H, S, OX, K } = G;
  const pageU = wide ? CANVAS_L : COL_M;
  // ustun koordinatalari (mobil 390) → sahna; laptopda × 1.2 + 486
  const X = (x: number) => `calc(50% + ${U(OX + S * x - W / 2)})`;
  const Y = (y: number) => `calc(100% - ${U(H - S * y)})`;
  const Z = (n: number) => U(S * n);
  return (
    <div
      ref={wrap}
      className={cx(st.gateWrap, still && st.still)}
      style={vars(still ? { "--u": pageU, "--o": 0, height: U(H) } : { "--u": `min(${pageU}, calc(100svh / ${H}))` })}
    >
      <div className={st.gate} aria-label={t("Taklifnoma")} style={still ? { position: "relative", height: "100%" } : undefined}>
        <div aria-hidden className={st.gBg} />
        {/* kobalt fon — faqat fon qatlami (orqasida kontent yo‘q) */}
        <div aria-hidden className={st.gCobalt} />
        <Koshin top={Y(40)} h={Z(28)} period={Z(57.2)} dir={-1} still={still} className={cx(st.gKoshin, st.gKoshinTop)} />
        <Koshin top={Y(776)} h={Z(28)} period={Z(57.2)} still={still} className={cx(st.gKoshin, st.gKoshinBot)} />
        {/* yozuvlar — scroll boshida so‘nadi (yuklanishdagi kirish animatsiyasi ichki elementlarda) */}
        <div className={cx(st.gText, "absolute inset-0")}>
          <h1 className={cx(st.pr, st.gIn, "absolute text-center")} style={vars({ left: X(24), width: Z(342), top: Y(540), height: Z(60), lineHeight: `${Z(60)}`, fontSize: Z(44), color: COBALT, whiteSpace: "nowrap", "--gd": "0.55s" })}>
            <Fit base={44 * S} max={342 * S} deps={t("Nahorgi osh")}>
              {t("Nahorgi osh")}
            </Fit>
          </h1>
          {d.signer && (
            <p className={cx(st.mr6, st.gIn, "absolute text-center")} style={vars({ left: X(24), width: Z(342), top: Y(606), fontSize: Z(16), lineHeight: `${Z(22)}`, color: TEAL, overflowWrap: "anywhere", "--gd": "0.75s" })}>
              {d.signer}
            </p>
          )}
        </div>
        {/* lagan: ekran o‘rtasiga suriladi (--gm), kattalashadi va aylanadi; markazga osh tortiladi */}
        <div aria-hidden className={st.gMove} style={vars({ "--gm": `calc(${U(H - S * 340)} - 50%)` })}>
          <div className={st.gScale} style={vars({ left: X(45), top: Y(190), width: Z(300), height: Z(300), "--k": K })}>
            <div className={st.gTurn}>
              <div className={st.gLoad}>
                <LaganSvg s={300} paint={!still} />
              </div>
            </div>
            <div className={st.gOsh}>
              <Img src={`${P}/osh.webp`} className={st.cover} eager />
            </div>
          </div>
        </div>
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

/** Sarlavha (Prata, markazda, 360 da sig‘adi) */
function Title({ text, color = COBALT, d = 0, size = 38, h = 51, style }: { text: string; color?: string; d?: number; size?: number; h?: number; style?: CSSProperties }) {
  return (
    <p data-a="up" className={cx(st.pr, "text-center")} style={vars({ height: U(h), fontSize: U(size), lineHeight: `${U(h)}`, color, whiteSpace: "nowrap", "--d": `${d}s`, ...(style as Record<string, string>) })}>
      <Fit base={size} max={342} deps={text}>
        {text}
      </Fit>
    </p>
  );
}

/* ═════════════ 01 · Hero — katta lagan doimiy sekin aylanadi (60 s), markazidagi osh surati aylanmaydi, o‘rta halqa teskari
 * tomonga aylanadi; lagan va osh aylanib kattalashib chiqadi, yozuvlar pastdan ═════════════ */
function Hero({ d, z, wide, still }: { d: D; z: number; wide: boolean; still: boolean }) {
  const t = useT();
  return (
    <Sec
      z={z}
      bg="cobalt"
      colStyle={{ height: U(920) }}
      outer={
        <Side wide={wide}>
          <Lagan box={[90, 320, 300]} unit={C} op={0.35} px pk={0.12} d={0.2} still={still} slow />
          <Lagan box={[1050, 520, 300]} unit={C} op={0.35} px pk={0.12} d={0.3} still={still} slow />
        </Side>
      }
    >
      <div data-a="spinIn" className={cx(st.art)} style={vars({ left: U(15), top: U(90), width: U(360), height: U(360), "--d": "0.05s" })}>
        <LaganSvg s={360} turn={!still} />
      </div>
      <div data-a="zoom" className={cx(st.osh, "absolute")} style={vars({ left: U(120), top: U(195), width: U(150), height: U(150), "--d": "0.35s" })}>
        <Img src={`${P}/osh.webp`} className={st.cover} />
      </div>
      <div className="absolute" style={{ left: U(24), width: U(342), top: U(500) }}>
        <Title text={t("Nahorgi osh")} color={MILK} size={50} h={68} d={0.15} />
      </div>
      {d.heroDate && (
        <p data-a="up" className={cx(st.mr6, "absolute text-center")} style={vars({ left: U(24), width: U(342), top: U(580), height: U(25), fontSize: U(18), lineHeight: `${U(25)}`, color: OCHRE, whiteSpace: "nowrap", "--d": "0.25s" })}>
          <Fit base={18} max={342} deps={d.heroDate}>
            {d.heroDate}
          </Fit>
        </p>
      )}
      <p data-a="up" className={cx(st.mr, st.clamp3, "absolute text-center")} style={vars({ left: U(40), width: U(310), top: U(630), fontSize: U(17), lineHeight: `${U(25.5)}`, color: MILK, "--d": "0.35s" })}>
        {d.sub}
      </p>
      {/* chok ustidagi lagan (01/02) */}
      <Lagan box={[135, 800, 120]} unit={U} className={st.seam} d={0.2} still={still} fixed />
    </Sec>
  );
}

/* ═════════════ 02 · Taklif — «Aziz mehmon!» (maxsus mehmon bo‘lsa — «Hurmatli …!»), matn, «Hurmat bilan,» va imzo; chokda koshin chiziq ═════════════ */
function Taklif({ d, z, still }: { d: D; z: number; still: boolean }) {
  const t = useT();
  const hello = d.guest ? guestHello(t, "Hurmatli {guest}!", d.guest) : t("Aziz mehmon!");
  return (
    <Sec z={z} bg="milk" colStyle={{ paddingTop: U(110), paddingBottom: U(168.8) }} outer={<Koshin top={`calc(100% - ${U(40)})`} h={U(28)} still={still} />}>
      <div data-a="up" className={cx(st.pr, "relative text-center")} style={vars({ color: COBALT, "--d": "0.05s" })}>
        <NameLines text={hello} base={36} max={342} lh={49} two={30} twoLh={40} />
      </div>
      <p
        data-a="up"
        className={cx(st.mr, "relative mx-auto text-center")}
        style={vars({ marginTop: U(31), width: U(330), fontSize: U(18), lineHeight: `${U(28.8)}`, color: INK, overflowWrap: "anywhere", whiteSpace: "pre-line", "--d": "0.12s" })}
      >
        {d.message}
      </p>
      {d.signer && (
        <div data-a="up" className={cx(st.mr6, "relative mx-auto text-center")} style={vars({ marginTop: U(85), width: U(342), fontSize: U(18), lineHeight: `${U(26.1)}`, color: COBALT, overflowWrap: "anywhere", "--d": "0.2s" })}>
          <p>{t("Hurmat bilan,")}</p>
          <p>{d.signer}</p>
        </div>
      )}
    </Sec>
  );
}

/* ═════════════ 03 · Dasturxon — galereya (katta surat va ikkita kichik; mijoz suratlari, bo‘lmasa — shablonniki) ═════════════ */
function Gallery({ d, z }: { d: D; z: number }) {
  const t = useT();
  const boxes = [
    [24, 170, 342, 256],
    [24, 436, 166, 236],
    [200, 436, 166, 236],
  ] as const;
  return (
    <Sec z={z} bg="ice" colStyle={{ height: U(760) }}>
      <div className="absolute inset-x-0" style={{ top: U(90) }}>
        <Title text={t("Dasturxon")} />
      </div>
      {boxes.map(([x, y, w, h], i) => (
        <div key={i} data-a="zoom" className={cx(st.photo, "absolute")} style={vars({ left: U(x), top: U(y), width: U(w), height: U(h), borderRadius: U(24), "--d": `${0.1 + i * 0.14}s` })}>
          <Img src={d.gallery[i]} className={st.zoomImg} />
        </div>
      ))}
    </Sec>
  );
}

/* ═════════════ 04 · Oshgacha — taymer: raqamlar mini laganlar ichida; qiymat har o‘zgarganda mini lagan 15° buriladi ═════════════ */
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

/** Mini lagan: qiymat har o‘zgarganda 15° buriladi (burilishlar soni yig‘iladi — orqaga aylanmaydi) */
function MiniLagan({ value, still }: { value: number; still: boolean }) {
  const prev = useRef(value);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    setN((k) => k + 1);
  }, [value]);
  return (
    <div className={cx(st.fill, st.mini)} style={{ transform: still ? undefined : `rotate(${n * 15}deg)` }}>
      <LaganSvg s={78} />
    </div>
  );
}

function Osh({ d, z, wide, still }: { d: D; z: number; wide: boolean; still: boolean }) {
  const t = useT();
  const units = timerUnits(useLocale());
  const c = useCountdown(d.target);
  const [ref, inView] = useInView<HTMLDivElement>(0.3, true);
  if (!d.hasDate || !c) return null;
  const vals = [c.d, c.h, c.m, c.s];
  return (
    <Sec
      z={z}
      bg="ice"
      colStyle={{ height: U(620) }}
      outer={
        <Side wide={wide}>
          <Lagan box={[170, 160, 200]} unit={C} op={0.25} px pk={0.12} d={0.1} still={still} slow />
          <Lagan box={[1070, 260, 200]} unit={C} op={0.25} px pk={0.12} d={0.2} still={still} slow />
        </Side>
      }
    >
      <div className="absolute inset-x-0" style={{ top: U(90) }}>
        <Title text={t("Oshgacha")} />
      </div>
      <div ref={ref}>
        {vals.map((v, i) => (
          <div key={i} data-a="spinIn" className="absolute" style={vars({ left: U(24 + i * 87), top: U(180), width: U(78), height: U(78), "--d": `${0.12 + i * 0.1}s` })}>
            <MiniLagan value={v} still={still} />
            <span aria-hidden className={st.disc} style={{ left: U(9), top: U(9), width: U(60), height: U(60) }} />
            <p className={cx(st.pr, "absolute inset-x-0 text-center")} style={{ top: U(14.5), height: U(34), fontSize: U(28), lineHeight: `${U(34)}`, color: COBALT, whiteSpace: "nowrap" }}>
              <Fit base={28} max={54} deps={String(vals[0]).length}>
                <Digits value={v} run={inView} len={i === 0 ? Math.max(2, String(vals[0]).length) : 2} i={i} />
              </Fit>
            </p>
            <p className={cx(st.mr6, "absolute inset-x-0 text-center")} style={{ top: U(47.5), height: U(18), fontSize: U(13), lineHeight: `${U(18)}`, color: INK, whiteSpace: "nowrap" }}>
              {/* oq doira ichida qoladi (uzun «minutes», «секунд» — kichrayadi, kobalt halqaga chiqmaydi) */}
              <Fit base={13} max={42} deps={units[i]}>
                {units[i]}
              </Fit>
            </p>
          </div>
        ))}
      </div>
      {d.oshLine && (
        <p data-a="up" className={cx(st.mr6, "absolute inset-x-0 text-center")} style={vars({ top: U(310), height: U(23), fontSize: U(17), lineHeight: `${U(23)}`, color: INK, whiteSpace: "nowrap", "--d": "0.25s" })}>
          <Fit base={17} max={342} deps={d.oshLine}>
            {d.oshLine}
          </Fit>
        </p>
      )}
      <div data-a="up" className="absolute inset-x-0 flex justify-center" style={vars({ top: U(360), "--d": "0.32s" })}>
        <button
          type="button"
          className={cx(st.mr7, st.btnCobalt)}
          style={{ minWidth: U(250), height: U(56), padding: `0 ${U(24)}`, fontSize: U(16), borderRadius: U(28) }}
          onClick={() =>
            downloadIcs({
              title: d.calTitle,
              startLocal: `${d.iso}T${d.time || "06:00"}`,
              location: [d.venueTitle, d.address].filter(Boolean).join(", "),
              slug: "lagan",
            })
          }
        >
          {t("Kalendarga qo‘shish")}
        </button>
      </div>
    </Sec>
  );
}

/* ═════════════ 05 · Tong tartibi — qatorlar o‘ngdan siljib kiradi (stagger 0.12 s); chokda koshin chiziq ═════════════ */
function Program({ d, z, still }: { d: D; z: number; still: boolean }) {
  const t = useT();
  const items = d.program.slice(0, 8);
  if (!items.length) return null;
  return (
    <Sec z={z} bg="milk" colStyle={{ paddingTop: U(90), paddingBottom: U(78) }} outer={<Koshin top={U(-14)} h={U(28)} dir={-1} still={still} className={st.seam} />}>
      <Title text={t("Tong tartibi")} size={36} h={49} />
      <div className="relative mx-auto flex flex-col" style={{ marginTop: U(31), width: U(342), gap: U(16) }}>
        {items.map((it, i) => (
          <div key={i} data-a="right" className={cx(st.row, "flex items-center")} style={vars({ minHeight: U(76), borderRadius: U(38), padding: `${U(10)} ${U(20)} ${U(10)} ${U(24)}`, "--d": `${0.08 + i * 0.12}s` })}>
            <p className={cx(st.pr, "shrink-0")} style={{ width: U(94), fontSize: U(26), lineHeight: `${U(35)}`, color: COBALT, whiteSpace: "nowrap" }}>
              {it.time}
            </p>
            <p className={cx(st.mr6, st.clamp2)} style={{ minWidth: 0, flex: "1 1 auto", fontSize: U(16), lineHeight: `${U(22)}`, color: INK }}>
              {it.title}
            </p>
          </div>
        ))}
      </div>
    </Sec>
  );
}

/* ═════════════ 06 · Manzil — surat (mijozning 4-surati; bo‘lmasa — dasturxon), joy nomi, manzil, xarita va yo‘nalish ═════════════ */
function Venue({ d, z, wide, still, linkable }: { d: D; z: number; wide: boolean; still: boolean; linkable: boolean }) {
  const t = useT();
  if (!d.hasPlace) return null;
  return (
    <Sec
      z={z}
      bg="cobalt"
      colStyle={{ paddingTop: U(90), paddingBottom: U(104) }}
      outer={
        <Side wide={wide}>
          <Lagan box={[110, 500, 260]} unit={C} op={0.25} px pk={0.12} d={0.1} still={still} slow />
          <Lagan box={[1080, 260, 260]} unit={C} op={0.25} px pk={0.12} d={0.2} still={still} slow />
        </Side>
      }
    >
      <Title text={t("Manzil")} color={MILK} />
      <div data-a="zoom" className={cx(st.photo, st.photoInk, "relative mx-auto")} style={vars({ marginTop: U(25), width: U(342), height: U(228), borderRadius: U(24), "--d": "0.1s" })}>
        <Img src={d.hall} className={st.zoomImg} />
      </div>
      {d.venueTitle && (
        <p data-a="up" className={cx(st.pr, "mx-auto text-center")} style={vars({ marginTop: U(26), width: U(342), minHeight: U(35), fontSize: U(26), lineHeight: `${U(35)}`, color: MILK, overflowWrap: "anywhere", "--d": "0.15s" })}>
          {d.venueTitle}
        </p>
      )}
      {d.address && (
        <p data-a="up" className={cx(st.mr, "mx-auto text-center")} style={vars({ marginTop: U(11), width: U(330), minHeight: U(48), fontSize: U(16), lineHeight: `${U(24)}`, color: MILK, overflowWrap: "anywhere", "--d": "0.22s" })}>
          {d.address}
        </p>
      )}
      <div data-a="up" className="relative mx-auto flex" style={vars({ marginTop: U(46), width: U(342), gap: U(12), "--d": "0.3s" })}>
        <a href={linkable ? d.mapUrl : undefined} target="_blank" rel="noopener noreferrer" className={cx(st.mr7, st.btnMilk)} style={{ flex: "1 1 0", minWidth: 0, height: U(56), padding: `0 ${U(8)}`, fontSize: U(16), borderRadius: U(28) }}>
          {t("Xaritada ochish")}
        </a>
        <a href={linkable ? d.taxi : undefined} target="_blank" rel="noopener noreferrer" className={cx(st.mr7, st.btnLineMilk)} style={{ flex: "1 1 0", minWidth: 0, height: U(56), padding: `0 ${U(8)}`, fontSize: U(16), borderWidth: U(1.5), borderRadius: U(28) }}>
          {t("Yo‘nalish")}
        </a>
      </div>
    </Sec>
  );
}

/* ═════════════ 07 · Dress-kod (ixtiyoriy — o‘chirilsa joy qolmaydi): sut rang karta — turi va izoh ═════════════ */
function Dress({ d, z }: { d: D; z: number }) {
  if (!d.dressNote && !d.dressTitle) return null;
  return (
    <Sec z={z} bg="cobalt" colStyle={{ paddingTop: U(30), paddingBottom: U(82.5) }}>
      <div data-a="rise" className={cx(st.card, "relative mx-auto flex flex-col items-center text-center")} style={{ width: U(342), padding: `${U(28)} ${U(26)}`, gap: U(10), borderRadius: U(24), borderWidth: U(2) }}>
        {d.dressTitle && (
          <p className={st.pr} style={{ height: U(41), fontSize: U(30), lineHeight: `${U(41)}`, color: COBALT, whiteSpace: "nowrap" }}>
            <Fit base={30} max={286} deps={d.dressTitle}>
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

/* ═════════════ 08 · Anketa — «Kelaman» bosilsa kichik lagan aylanib ✓ ga aylanadi ═════════════ */
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
  const [spin, setSpin] = useState(0);
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
    if (s === "coming") setSpin((n) => n + 1);
  };
  return (
    <Sec z={z} bg="milk" id="lagan-javob" colStyle={{ paddingTop: U(100), paddingBottom: U(50) }}>
      {/* chok ustidagi lagan (07/08) */}
      <Lagan box={[135, -60, 120]} unit={U} className={st.seam} still={still} fixed />
      <h2 data-a="up" className={cx(st.pr, "mx-auto text-center")} style={vars({ width: U(342), fontSize: U(38), lineHeight: `${U(51)}`, color: COBALT, overflowWrap: "anywhere", "--d": "0.05s" })}>
        {t("Kelasizmi?")}
      </h2>
      <p data-a="up" className={cx(st.mr, "mx-auto text-center")} style={vars({ marginTop: U(5), width: U(342), minHeight: U(22), fontSize: U(16), lineHeight: `${U(22)}`, color: INK, overflowWrap: "anywhere", "--d": "0.12s" })}>
        {sub}
      </p>
      <div data-a="rise" className={cx(st.form, "relative mx-auto")} style={vars({ marginTop: U(32), width: U(342), padding: `${U(24)} ${U(22)} ${U(58)}`, borderRadius: U(28), "--d": "0.2s" })}>
        {sent ? (
          <div key="thanks" className={cx(st.thanks, "relative flex flex-col items-center text-center")} style={{ padding: `${U(48)} ${U(6)} ${U(10)}`, gap: U(16), minHeight: U(480) }}>
            <div aria-hidden className={cx("relative", !still && st.thanksLagan)} style={{ width: U(110), height: U(110) }}>
              <LaganSvg s={110} />
            </div>
            <p className={st.pr} style={{ fontSize: U(sent === "not_coming" ? 32 : 28), lineHeight: 1.25, color: COBALT, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Rahmat!") : t("Rahmat! Joyingiz band qilindi")}
            </p>
            <p className={st.mr} style={{ fontSize: U(17), color: INK, lineHeight: 1.5, overflowWrap: "anywhere" }}>
              {sent === "not_coming" ? t("Javobingiz uchun rahmat!") : t("{name} — {count} kishi. Javobingiz yetkazildi.", { name: name.trim() || t("Javobingiz"), count })}
            </p>
            <button type="button" onClick={() => setSent(null)} className={st.mr6} style={{ fontSize: U(16), color: COBALT, textDecoration: "underline", textUnderlineOffset: 3 }}>
              {t("Javobni o‘zgartirish")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="relative flex flex-col items-stretch">
            {label(t("Ismingiz"), 0)}
            <label className={st.field} style={{ marginTop: U(5), height: U(54), padding: `0 ${U(16)}`, borderRadius: U(16) }}>
              <input className={cx(st.mr, st.input)} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={t("Ism va familiya")} aria-label={t("Ismingiz")} style={{ fontSize: U(17) }} />
            </label>
            {label(t("Kelasizmi?"), 22)}
            <div className="flex w-full" role="radiogroup" aria-label={t("Kelasizmi?")} style={{ marginTop: U(5), gap: U(8) }}>
              {(
                [
                  ["coming", "Kelaman"],
                  ["not_coming", "Kela olmayman"],
                ] as const
              ).map(([s, l]) => {
                const mark = s === "coming" && status === "coming" && spin > 0;
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={status === s}
                    onClick={() => pick(s)}
                    className={cx(st.mr7, st.choice)}
                    style={{ padding: `${U(4)} ${mark ? U(10) : U(4)} ${U(4)} ${mark ? U(34) : U(4)}`, minHeight: U(54), fontSize: U(16), borderWidth: U(1.5), borderRadius: U(27) }}
                  >
                    {mark && (
                      <span key={spin} aria-hidden className={st.mark} style={{ left: U(10), width: U(22), height: U(22), marginTop: U(-11) }}>
                        <span className={st.markLagan}>
                          <LaganSvg />
                        </span>
                        <svg viewBox="0 0 22 22" className={st.markCheck}>
                          <circle cx="11" cy="11" r="11" fill={MILK} />
                          <path d="M6.2 11.4l3.2 3.1 6.4-6.8" fill="none" stroke={COBALT} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
                        </svg>
                      </span>
                    )}
                    <span style={{ overflowWrap: "anywhere" }}>{t(l)}</span>
                  </button>
                );
              })}
            </div>
            {status === "coming" && (
              <>
                {label(t("Necha kishi bo‘lasiz?"), 22)}
                <div className={cx(st.field, "justify-between")} style={{ marginTop: U(5), height: U(54), padding: `0 ${U(6)}`, borderRadius: U(27) }}>
                  <button type="button" className={cx(st.mr7, st.step)} disabled={count <= 1} onClick={() => setCount((n) => Math.max(1, n - 1))} aria-label={t("Kamaytirish")} style={{ width: U(42), height: U(42), fontSize: U(22) }}>
                    −
                  </button>
                  <span className={st.pr} style={{ fontSize: U(26), lineHeight: 1.2, color: INK }} aria-live="polite">
                    {count}
                  </span>
                  <button type="button" className={cx(st.mr7, st.step)} disabled={count >= 20} onClick={() => setCount((n) => Math.min(20, n + 1))} aria-label={t("Ko‘paytirish")} style={{ width: U(42), height: U(42), fontSize: U(22) }}>
                    +
                  </button>
                </div>
              </>
            )}
            {label(t("Tilaklaringiz"), 24)}
            <label className={st.field} style={{ marginTop: U(5), height: U(130), padding: `${U(16)} ${U(16)}`, borderRadius: U(16), alignItems: "flex-start" }}>
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

/* ═════════════ 09 · Final — «Dasturxonimiz sizni kutadi!», lagan aylanib kattalashadi, oxra markaz yonib turadi
 * (scroll bilan: --fc 0 … 1 = Figma kadri; sahifa oxirigacha albatta tugaydi); pastda koshin chiziq ═════════════ */
function Final({ d, z, wide, still, onSeen }: { d: D; z: number; wide: boolean; still: boolean; onSeen: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const sec = useRef<HTMLElement>(null);
  const onP = useCallback(
    (_p: number, r: DOMRect) => {
      const el = ref.current;
      if (!el) return;
      const vh = window.innerHeight || 800;
      // sahna ekranning 85% iga kirganda boshlanadi va 0.7 ekran skrollda tugaydi — sahifa oxiri undan oldin kelsa, oxirida tugaydi
      const y = window.scrollY;
      const top = r.top + y + r.height * 0.3;
      const max = document.documentElement.scrollHeight - vh;
      const s0 = Math.min(top - vh * 0.85, max - 1);
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
      bg="cobalt"
      secRef={sec}
      colStyle={{ height: U(800) }}
      outer={
        <>
          <Side wide={wide}>
            <Lagan box={[120, 300, 280]} unit={C} op={0.3} px pk={0.12} d={0.1} still={still} slow />
            <Lagan box={[1040, 420, 280]} unit={C} op={0.3} px pk={0.12} d={0.2} still={still} slow />
          </Side>
          <Koshin top={`calc(100% - ${U(40)})`} h={U(28)} dir={-1} still={still} />
        </>
      }
    >
      <h2 data-a="up" className={cx(st.pr, "absolute text-center")} style={vars({ left: U(24), width: U(342), top: U(110), fontSize: U(40), lineHeight: `${U(48)}`, color: MILK, overflowWrap: "anywhere", textWrap: "balance", "--d": "0.1s" })}>
        {t("Dasturxonimiz sizni kutadi!")}
      </h2>
      <div ref={ref} className={cx(st.finalWrap, "absolute")} style={vars({ left: U(65), top: U(280), width: U(260), height: U(260), ...(still ? { "--fc": 1 } : {}) })}>
        <div className={cx(st.fill, st.fLagan)}>
          <LaganSvg s={260} />
          {/* oxra markaz yonib turadi (harakatsiz kadrda — yo‘q, Figma bilan bir xil) */}
          <span aria-hidden className={st.fGlow}>
            {!still && <span className={st.fGlowIn} />}
          </span>
        </div>
      </div>
      {d.signer && (
        <p data-a="up" className={cx(st.mr6, "absolute text-center")} style={vars({ left: U(24), width: U(342), top: U(620), fontSize: U(16), lineHeight: `${U(22)}`, color: OCHRE, overflowWrap: "anywhere", "--d": "0.3s" })}>
          {d.signer}
        </p>
      )}
    </Sec>
  );
}

/* ═════════════ Musiqa tugmasi — Figma «Lagan / Musiqa tugmasi»: sut rang doira (52), kobalt halqa, 4 ta kobalt chiziq ritmda;
 * o‘chirilgan — chiziqlar past (4px) ═════════════ */
const BARS = [10, 18, 13, 20];
function LaganMusic({ m, wide, embedded }: { m: ReturnType<typeof useMusic>; wide: boolean; embedded: boolean }) {
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

export function LaganSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const wide = useWide(root);
  const d = useData({ template, data, mode });
  const withGate = !embedded;
  const music = useMusic(d.musicUrl, data.slug, data.musicEnabled && !embedded);
  const loaded = usePreload([`${P}/lagan.svg`, `${P}/osh.webp`, `${P}/koshin.svg`], [...d.gallery, d.hall], withGate, wide ? "l" : "m");
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
        <LaganMusic m={music} wide={wide} embedded={embedded} />
        {withGate && !loaderGone && <Loader done={loaded} seal={`${P}/lagan.svg`} />}
        <div className={st.flow}>
          {withGate && (loaded ? <Gate d={d} wide={wide} onStart={() => music.play(true)} /> : <div className={st.gateHold} />)}
          {embedded && <Gate d={d} wide={wide} still onStart={() => {}} />}
          <Hero d={d} z={z("hero")} wide={wide} still={embedded} />
          <Taklif d={d} z={z("taklif")} still={embedded} />
          <Gallery d={d} z={z("gallery")} />
          <Osh d={d} z={z("osh")} wide={wide} still={embedded} />
          <Program d={d} z={z("program")} still={embedded} />
          <Venue d={d} z={z("venue")} wide={wide} still={embedded} linkable={linkable} />
          <Dress d={d} z={z("dress")} />
          {data.rsvpEnabled && <Rsvp d={d} slug={data.slug} mode={mode} z={z("rsvp")} still={embedded} />}
          <Final d={d} z={z("final")} wide={wide} still={embedded} onSeen={onFinal} />
        </div>
        <footer className={cx(st.footer, "flex items-start justify-center")} style={{ height: U(120), paddingTop: U(50) }}>
          <p className={cx(st.mr5, "text-center")} style={{ fontSize: U(14), lineHeight: `${U(19)}`, color: "rgba(247,249,252,.55)" }}>
            <a href="https://shohnoma.uz">{t("shohnoma.uz orqali yaratilgan")}</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
