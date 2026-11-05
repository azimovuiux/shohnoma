"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CloseCircle, Music } from "@/components/icons";
import { useToast } from "@/components/ui";
import { ceremonyLabel } from "@/lib/templates";
import { splitDate } from "@/lib/display";
import { star8Path } from "@/lib/ornament";
import type { InvitationSiteProps } from "./types";
import { paletteOf, s } from "./theme";
import { Divider, HeroArt, heroShowsTitle } from "./Heroes";
import { Closing, Countdown, Gallery, Program, RsvpBlock, Venue } from "./Sections";
import { Layer, RsvpForm, ThankYou, fetchSavedAnswer, loadSavedRsvp, useSavedAnswer, type RsvpAnswer, type RsvpStatus } from "./Rsvp";
import st from "./invitation.module.css";

/* ── Fon musiqasi: avtomatik yoqilmaydi; fayl bo‘lmasa tugma ko‘rinmaydi ── */
function useMusic(slug: string, enabled: boolean) {
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    (async () => {
      for (const url of [`/music/${slug}.mp3`, "/music/default.mp3"]) {
        try {
          const r = await fetch(url, { method: "HEAD" });
          if (r.ok && (r.headers.get("content-type") ?? "").includes("audio")) {
            if (alive) setSrc(url);
            return;
          }
        } catch {}
      }
    })();
    return () => {
      alive = false;
      audio.current?.pause();
    };
  }, [slug, enabled]);

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

export function InvitationSite({ template, data, mode, embedded = false }: InvitationSiteProps) {
  const p = useMemo(() => paletteOf(template), [template]);
  const live = mode === "live";
  const toast = useToast();
  const music = useMusic(template.slug, data.musicEnabled && mode !== "preview");
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
      toast("Avvalgi javob topilmadi — qayta yuboring", "error");
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
              aria-label={music.playing ? "Musiqani to‘xtatish" : "Musiqani yoqish"}
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
        <span className="pointer-events-none absolute" style={{ inset: s(14), border: `1px solid color-mix(in srgb, ${p.accent} 45%, transparent)` }} aria-hidden />
        <span className="pointer-events-none absolute" style={{ inset: s(20), border: `0.5px solid color-mix(in srgb, ${p.accent} 25%, transparent)` }} aria-hidden />

        {heroShowsTitle(template.slug) ? (
          <>
            <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: s(18), color: p.heroSoft }}>{ceremonyLabel[data.ceremony]}</p>
            <h1 style={{ fontFamily: "var(--font-script)", fontSize: s(56), color: p.accent, lineHeight: 1.25 }}>Taklifnoma</h1>
          </>
        ) : (
          <h1 className="sr-only">
            {ceremonyLabel[data.ceremony]} taklifnomasi — {[data.personA, data.personB].filter(Boolean).join(" & ")}
          </h1>
        )}
        {sd && <p style={{ fontFamily: "var(--font-cinzel)", fontSize: s(13), letterSpacing: "0.22em", color: p.heroInk, marginTop: s(4) }}>{sd.dots}</p>}

        <div style={{ marginTop: s(heroShowsTitle(template.slug) ? 24 : 28) }}>
          <HeroArt template={template} data={data} palette={p} />
        </div>

        <div style={{ marginTop: s(30) }}>
          <Divider color={p.accent} />
        </div>
        <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: s(24), color: p.heroInk, marginTop: s(12) }}>Aziz mehmonlar!</p>
        {data.message && (
          <p style={{ fontFamily: "var(--font-serif)", fontSize: s(15), lineHeight: 1.35, color: p.heroInk, opacity: 0.85, maxWidth: s(260), marginTop: s(10), whiteSpace: "pre-line" }}>
            {data.message.replace(/^Aziz mehmonlar!\s*/, "")}
          </p>
        )}
        <button
          type="button"
          onClick={open}
          className={`rounded-full ${opened ? "" : st.pulse}`}
          style={{ border: `1px solid ${p.accent}`, color: p.accent, fontFamily: "var(--font-cinzel)", fontSize: s(11), letterSpacing: "0.14em", padding: `${s(13)} ${s(26)}`, marginTop: s(30) }}
        >
          Taklifnomani ochish
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
      <Layer embedded={embedded} open={form.open} onClose={() => setForm({ open: false, initial: {}, token: null })} label="Javobingizni qoldiring">
        <RsvpForm d={data} p={p} initial={form.initial} mode={mode} editToken={form.token} onDone={done} onClose={() => setForm({ open: false, initial: {}, token: null })} />
      </Layer>

      {/* 16 — rahmat */}
      {thanks && (
        <div className={`${st.fade} ${embedded ? "absolute" : "fixed"} inset-0 z-[60] overflow-y-auto`} style={{ background: p.deep }} role="dialog" aria-label="Rahmat">
          <div className="mx-auto min-h-full" style={{ maxWidth: embedded ? undefined : 480 }}>
            <ThankYou d={data} p={p} answer={thanks} live={live} onBack={() => setThanks(null)} onEdit={editAnswer} />
          </div>
        </div>
      )}

      {/* surat ko‘ruvchi */}
      {photo !== null && data.photos[photo] && (
        <div className={`${st.fade} ${embedded ? "absolute" : "fixed"} inset-0 z-[60] flex items-center justify-center bg-black/90 p-4`} onClick={() => setPhoto(null)} role="dialog" aria-label="Surat">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.photos[photo]} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
          <button type="button" onClick={() => setPhoto(null)} aria-label="Yopish" className="absolute right-4 top-4 text-white">
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
