"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CloseCircle, Music } from "@/components/icons";
import { useToast } from "@/components/ui";
import { ceremonyLabel, designSlug } from "@/lib/templates";
import { splitDate } from "@/lib/display";
import { musicSrc } from "@/lib/music";
import { star8Path } from "@/lib/ornament";
import { LocaleProvider, useLocale, useT } from "@/lib/i18n";
import type { InvitationData, InvitationSiteProps } from "./types";
import { inviteLang } from "./data";
import { TemplateArt } from "./TemplateArt";
import { paletteOf, s } from "./theme";
import { Divider, HeroArt, heroShowsTitle } from "./Heroes";
import { Closing, Countdown, Gallery, Program, RsvpBlock, Venue } from "./Sections";
import { Layer, RsvpForm, ThankYou, fetchSavedAnswer, loadSavedRsvp, useSavedAnswer, type RsvpAnswer, type RsvpStatus } from "./Rsvp";
import st from "./invitation.module.css";
import { AnorSite } from "@/components/templates/anor/AnorSite";
import { ZumradSite } from "@/components/templates/zumrad/ZumradSite";
import { ParvozSite } from "@/components/templates/parvoz/ParvozSite";
import { ShatoSite } from "@/components/templates/shato/ShatoSite";
import { SavsanSite } from "@/components/templates/savsan/SavsanSite";
import { MuhrSite } from "@/components/templates/muhr/MuhrSite";
import { KalitSite } from "@/components/templates/kalit/KalitSite";

/* ── Fon musiqasi: avtomatik yoqilmaydi; trek bo‘lmasa tugma ko‘rinmaydi ── */
function useMusic(url: string | null, enabled: boolean) {
  const src = enabled ? url : null;
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => audio.current?.pause(), [src]);

  const play = useCallback(async () => {
    if (!src) return;
    if (!audio.current) {
      audio.current = new Audio(src);
      audio.current.loop = true;
      audio.current.volume = 0.55;
      audio.current.onpause = () => setPlaying(false);
      audio.current.onplay = () => setPlaying(true);
    }
    try {
      await audio.current.play();
    } catch {}
  }, [src]);
  const toggle = () => (playing ? audio.current?.pause() : play());
  return { available: !!src, playing, play, toggle };
}

/**
 * Shablon dizayniga qarab: maxsus (kodda yozilgan) dizayn yoki umumiy sahifa.
 * Taklifnoma tili — mijoz tanlagan `extra.lang` (bo‘lmasa sahifa tili); ichidagi hamma komponent useT() bilan shu tilda.
 */
/** Kodda yozilgan dizaynlar — yangi shablon qo‘shilganda shu ro‘yxatga ham qo‘shiladi */
const CUSTOM = ["anor", "zumrad", "parvoz", "shato", "savsan", "muhr", "kalit"] as const;

export function InvitationSite(props: InvitationSiteProps) {
  const lang = inviteLang(props.data.extra, useLocale());
  const ds = designSlug(props.template);
  // Umumiy (rangli) sahifa faqat eski, admin yaratgan shablonlar uchun — ularda `base` boshqa dizaynga ishora qiladi.
  // Kod tanimagan yangi shablon (deploy paytida eski sahifa ochiq qolgan) — noto‘g‘ri dizayn ko‘rsatilmaydi, sahifa yangilanadi.
  const stale = !CUSTOM.includes(ds as (typeof CUSTOM)[number]) && props.template.kind !== "html" && (!props.template.base || props.template.base === props.template.slug);
  return (
    <LocaleProvider locale={lang}>
      {ds === "anor" ? (
        <AnorSite {...props} />
      ) : ds === "zumrad" ? (
        <ZumradSite {...props} />
      ) : ds === "parvoz" ? (
        <ParvozSite {...props} />
      ) : ds === "shato" ? (
        <ShatoSite {...props} />
      ) : ds === "savsan" ? (
        <SavsanSite {...props} />
      ) : ds === "muhr" ? (
        <MuhrSite {...props} />
      ) : ds === "kalit" ? (
        <KalitSite {...props} />
      ) : stale ? (
        <StaleReload slug={props.template.slug} />
      ) : (
        <GenericSite {...props} />
      )}
    </LocaleProvider>
  );
}

/** Sahifa kodi eskirgan: bir marta keshsiz qayta yuklaymiz; takrorlansa — tugma bilan xabar (noto‘g‘ri dizayn emas) */
function StaleReload({ slug }: { slug: string }) {
  const t = useT();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const k = `sh_stale_${slug}`;
    const last = Number(sessionStorage.getItem(k) || 0);
    if (Date.now() - last > 120_000) {
      sessionStorage.setItem(k, String(Date.now()));
      const u = new URL(location.href);
      u.searchParams.set("_r", String(Date.now()));
      location.replace(u.toString());
    } else setFailed(true);
  }, [slug]);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg-base px-6 text-center">
      {failed ? (
        <>
          <p className="t-body-m text-ink-2">{t("Iltimos, sahifani yangilang.")}</p>
          <button type="button" className="btn btn-primary" onClick={() => location.reload()}>
            {t("Sahifani yangilash")}
          </button>
        </>
      ) : (
        <span className="size-10 animate-spin rounded-full border-2 border-gold-soft border-t-maroon" aria-label={t("Taklifnoma yuklanmoqda")} />
      )}
    </div>
  );
}

/** Namuna (demo) matnlarini tarjima qilish — mijoz ma’lumotiga tegilmaydi */
function useDemoData(data: InvitationData, demo: boolean): InvitationData {
  const t = useT();
  return useMemo(
    () =>
      demo
        ? {
            ...data,
            personA: t(data.personA),
            personB: data.personB && t(data.personB),
            venueName: t(data.venueName),
            address: t(data.address),
            message: data.message && t(data.message),
            program: data.program.map((x) => ({ ...x, title: t(x.title) })),
          }
        : data,
    [data, demo, t],
  );
}

function GenericSite({ template, data: raw, mode, embedded = false }: InvitationSiteProps) {
  const t = useT();
  const lang = useLocale();
  const data = useDemoData(raw, mode === "demo");
  const p = useMemo(() => paletteOf(template), [template]);
  const live = mode === "live";
  const toast = useToast();
  const music = useMusic(musicSrc(template, data), data.musicEnabled && mode !== "preview");
  const [opened, setOpened] = useState(false);
  const [form, setForm] = useState<{ open: boolean; initial: Partial<RsvpAnswer>; token: string | null }>({ open: false, initial: {}, token: null });
  const [thanks, setThanks] = useState<RsvpAnswer | null>(null);
  const [photo, setPhoto] = useState<number | null>(null);
  const [saved, setSaved] = useSavedAnswer(data.slug, live);
  const countdownRef = useRef<HTMLDivElement>(null);
  const sd = splitDate(data.date);

  const open = () => {
    setOpened(true);
    if (mode !== "preview") music.play();
    if (!embedded) {
      const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
      setTimeout(() => countdownRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }), reduce ? 0 : 950);
    }
  };

  const answer = (status: RsvpStatus) => setForm({ open: true, initial: { status }, token: null });

  const editAnswer = async () => {
    if (!live || !saved) {
      setThanks(null);
      setForm((f) => ({ open: true, initial: thanks ?? f.initial, token: null }));
      return;
    }
    const prev = await fetchSavedAnswer(data.slug, saved.token);
    setThanks(null);
    if (!prev) {
      toast(t("Avvalgi javob topilmadi — qayta yuboring"), "error");
      return setForm({ open: true, initial: {}, token: null });
    }
    setForm({ open: true, initial: prev, token: saved.token });
  };

  const done = (a: RsvpAnswer) => {
    setForm({ open: false, initial: {}, token: null });
    setThanks(a);
    if (live) setSaved(loadSavedRsvp(data.slug));
  };

  /* ── Sahifa ── */
  const page = (
    <div className={`${st.root} mx-auto w-full`} style={{ maxWidth: embedded ? undefined : 480, background: p.deep }}>
      {/* musiqa tugmasi — yopishqoq */}
      {music.available && (
        <div className="pointer-events-none sticky top-0 z-30 h-0">
          <div className="flex justify-end" style={{ padding: `${s(26)} ${s(26)} 0` }}>
            <button
              type="button"
              onClick={music.toggle}
              aria-label={music.playing ? t("Musiqani to‘xtatish") : t("Musiqani yoqish")}
              aria-pressed={music.playing}
              className="pointer-events-auto flex items-center justify-center rounded-full backdrop-blur"
              style={{ width: 38, height: 38, background: "rgba(253,249,242,.9)", border: `1px solid color-mix(in srgb, ${p.accent} 60%, transparent)`, color: p.heading }}
            >
              {music.playing ? (
                <span className={`${st.eq} flex h-3.5 items-end gap-[2px]`} aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="block h-full w-[3px] origin-bottom rounded-sm" style={{ background: p.heading }} />
                  ))}
                </span>
              ) : (
                <Music size={17} />
              )}
            </button>
          </div>
        </div>
      )}

      {/* 1 — Hero */}
      <header className={`relative flex flex-col items-center text-center ${opened ? st.opened : ""}`} style={{ background: p.heroBg, minHeight: s(780), padding: `${s(70)} ${s(30)} ${s(56)}` }}>
        <TemplateArt slug={designSlug(template)} />
        <span className="pointer-events-none absolute" style={{ inset: s(14), border: `1px solid color-mix(in srgb, ${p.accent} 45%, transparent)` }} aria-hidden />
        <span className="pointer-events-none absolute" style={{ inset: s(20), border: `0.5px solid color-mix(in srgb, ${p.accent} 25%, transparent)` }} aria-hidden />

        {heroShowsTitle(designSlug(template)) ? (
          <>
            <p style={{ fontFamily: "var(--font-cormorant)", fontStyle: "italic", fontSize: s(18), color: p.heroSoft }}>{t(ceremonyLabel[data.ceremony])}</p>
            <h1 style={{ fontFamily: "var(--font-script)", fontSize: s(56), color: p.accent, lineHeight: 1.25 }}>{t("Taklifnoma")}</h1>
          </>
        ) : (
          <h1 className="sr-only">
            {t(`${ceremonyLabel[data.ceremony]} taklifnomasi`)} — {[data.personA, data.personB].filter(Boolean).join(" & ")}
          </h1>
        )}
        {sd && <p style={{ fontFamily: "var(--font-cinzel)", fontSize: s(13), letterSpacing: "0.22em", color: p.heroInk, marginTop: s(4) }}>{sd.dots}</p>}

        <div style={{ marginTop: s(heroShowsTitle(designSlug(template)) ? 24 : 28) }}>
          <HeroArt template={template} data={data} palette={p} />
        </div>

        <div style={{ marginTop: s(30) }}>
          <Divider color={p.accent} />
        </div>
        <p style={{ fontFamily: "var(--font-cormorant)", fontStyle: "italic", fontSize: s(24), color: p.heroInk, marginTop: s(12) }}>{t("Aziz mehmonlar!")}</p>
        {data.message && (
          <p style={{ fontFamily: "var(--font-cormorant)", fontSize: s(15), lineHeight: 1.35, color: p.heroInk, opacity: 0.85, maxWidth: s(260), marginTop: s(10), whiteSpace: "pre-line" }}>
            {lang === "ru" ? data.message.replace(/^(Aziz mehmonlar!|Дорогие гости!)\s*/, "") : data.message.replace(/^Aziz mehmonlar!\s*/, "")}
          </p>
        )}
        <button
          type="button"
          onClick={open}
          className={`rounded-full ${opened ? "" : st.pulse}`}
          style={{ border: `1px solid ${p.accent}`, color: p.accent, fontFamily: "var(--font-cinzel)", fontSize: s(11), letterSpacing: "0.14em", padding: `${s(13)} ${s(26)}`, marginTop: s(30) }}
        >
          {t("Taklifnomani ochish")}
        </button>
        <p style={{ fontSize: s(11), letterSpacing: "0.06em", color: p.heroInk, opacity: 0.6, marginTop: s(28) }}>
          {[data.venueName, sd?.time].filter(Boolean).join("  ·  ")}
        </p>
      </header>

      <div ref={countdownRef} style={{ scrollMarginTop: 0 }}>
        <Countdown date={data.date} p={p} />
      </div>
      <Program items={data.program} p={p} />
      <Venue d={data} p={p} linkable={mode !== "preview"} />
      <Gallery photos={data.photos} p={p} onOpen={setPhoto} />
      <RsvpBlock d={data} p={p} answered={live && saved ? { name: saved.name } : null} onAnswer={answer} onEdit={editAnswer} />
      <Closing d={data} p={p} />

      {/* 15 — forma */}
      <Layer embedded={embedded} open={form.open} onClose={() => setForm({ open: false, initial: {}, token: null })} label={t("Javobingizni qoldiring")}>
        <RsvpForm d={data} p={p} initial={form.initial} mode={mode} editToken={form.token} onDone={done} onClose={() => setForm({ open: false, initial: {}, token: null })} />
      </Layer>

      {/* 16 — rahmat */}
      {thanks && (
        <div className={`${st.fade} ${embedded ? "absolute" : "fixed"} inset-0 z-[60] overflow-y-auto`} style={{ background: p.deep }} role="dialog" aria-label={t("Rahmat")}>
          <div className="mx-auto min-h-full" style={{ maxWidth: embedded ? undefined : 480 }}>
            <ThankYou d={data} p={p} answer={thanks} live={live} onBack={() => setThanks(null)} onEdit={editAnswer} />
          </div>
        </div>
      )}

      {/* surat ko‘ruvchi */}
      {photo !== null && data.photos[photo] && (
        <div className={`${st.fade} ${embedded ? "absolute" : "fixed"} inset-0 z-[60] flex items-center justify-center bg-black/90 p-4`} onClick={() => setPhoto(null)} role="dialog" aria-label={t("Surat")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.photos[photo]} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
          <button type="button" onClick={() => setPhoto(null)} aria-label={t("Yopish")} className="absolute right-4 top-4 text-white">
            <CloseCircle size={28} />
          </button>
        </div>
      )}
    </div>
  );

  if (embedded) return <div className="relative min-h-full">{page}</div>;

  /* Desktop: markazdagi ustun + naqshli fon */
  return (
    <div className="relative min-h-dvh" style={{ background: p.backdrop }}>
      <svg className="pointer-events-none fixed inset-0 hidden h-full w-full md:block" aria-hidden>
        <defs>
          <pattern id="inv-girih" width="72" height="72" patternUnits="userSpaceOnUse">
            <path d={star8Path(36, 36, 20)} fill="none" stroke={p.accent} strokeWidth="1" />
            <path d={star8Path(0, 0, 9)} fill="none" stroke={p.accent} strokeWidth="1" />
            <path d={star8Path(72, 0, 9)} fill="none" stroke={p.accent} strokeWidth="1" />
            <path d={star8Path(0, 72, 9)} fill="none" stroke={p.accent} strokeWidth="1" />
            <path d={star8Path(72, 72, 9)} fill="none" stroke={p.accent} strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#inv-girih)" opacity="0.12" />
      </svg>
      <div className="relative md:py-10">
        <div
          className="mx-auto md:max-w-[480px] md:overflow-clip md:rounded-[28px] md:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] md:outline md:outline-1 md:outline-offset-[10px]"
          style={{ outlineColor: `color-mix(in srgb, ${p.accent} 35%, transparent)` }}
        >
          {page}
        </div>
      </div>
    </div>
  );
}
