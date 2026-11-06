"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import st from "./shared.module.css";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ═════════════ Oldindan yuklash ═════════════ */
export const loadImg = (src: string) =>
  new Promise<void>((res) => {
    const im = new Image();
    im.decoding = "async";
    im.onload = () => (im.decode ? im.decode().catch(() => {}).then(() => res()) : res());
    im.onerror = () => res();
    im.src = src;
  });

/**
 * Birinchi ekran rasmlari yuklanguncha — yuklovchi (ready=false);
 * keyin qolgan rasmlar orqa fonda navbat bilan yuklanadi (scrollda kechikmasin).
 */
export function usePreload(critical: string[], rest: string[], enabled: boolean, key: string) {
  const [ready, setReady] = useState(!enabled);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const timeout = new Promise<void>((r) => setTimeout(r, 7000));
    Promise.race([Promise.all(critical.map(loadImg)), timeout]).then(async () => {
      if (!alive) return;
      setReady(true);
      for (const src of [...new Set(rest.filter(Boolean))]) {
        if (!alive) return;
        await loadImg(src);
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);
  return ready;
}

/** Yuklovchi: shablon rangidagi fon va muhr pulsi (yozuvsiz) */
export function Loader({ done, seal }: { done: boolean; seal: string }) {
  return (
    <div className={cx(st.loader, done && st.loaderDone)} aria-hidden={done} role="status" aria-label="Taklifnoma yuklanmoqda">
      <span className={st.loaderRing} />
      <span className={st.loaderSeal}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={seal} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </span>
    </div>
  );
}

/* ═════════════ Musiqa ═════════════ */
export function useMusic(url: string | null, slug: string, enabled: boolean) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const fade = useRef(0);
  const key = `shohnoma:music:${slug}`;
  const ramp = (to: number, ms: number, then?: () => void) => {
    const a = audio.current;
    if (!a) return;
    cancelAnimationFrame(fade.current);
    const from = a.volume;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k < 1) fade.current = requestAnimationFrame(step);
      else then?.();
    };
    fade.current = requestAnimationFrame(step);
  };
  useEffect(
    () => () => {
      audio.current?.pause();
      cancelAnimationFrame(fade.current);
    },
    [],
  );
  const play = useCallback(
    (fromGate = false) => {
      if (!url || !enabled) return;
      if (fromGate) {
        try {
          if (localStorage.getItem(key) === "off") return;
        } catch {}
      }
      if (!audio.current) {
        audio.current = new Audio(url);
        audio.current.loop = true;
        audio.current.volume = 0;
        audio.current.onplay = () => setPlaying(true);
        audio.current.onpause = () => setPlaying(false);
      }
      audio.current.play().then(() => ramp(0.6, 2000)).catch(() => {});
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url, enabled, key],
  );
  const toggle = () => {
    const a = audio.current;
    if (a && !a.paused) {
      ramp(0, 600, () => a.pause());
      setPlaying(false);
      try {
        localStorage.setItem(key, "off");
      } catch {}
    } else {
      try {
        localStorage.removeItem(key);
      } catch {}
      play();
    }
  };
  const dim = useCallback(() => {
    const a = audio.current;
    if (a && !a.paused) ramp(a.volume * 0.8, 3000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { available: !!url && enabled, playing, play, toggle, dim };
}

export function MusicButton({ m, wide, embedded }: { m: ReturnType<typeof useMusic>; wide: boolean; embedded: boolean }) {
  if (!m.available) return null;
  const size = wide ? 60 : 52;
  const btn = (
    <button
      type="button"
      onClick={m.toggle}
      aria-label={m.playing ? "Musiqani o‘chirish" : "Musiqani yoqish"}
      aria-pressed={m.playing}
      className={cx(st.music, embedded && st.musicEmbedded, m.playing && st.playing)}
      style={{ width: size, height: size, right: wide ? 32 : 16, top: wide ? 28 : 16 }}
    >
      <svg viewBox="0 0 24 24" width={wide ? 24 : 22} height={wide ? 24 : 22} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <g className={st.note}>
          <path d="M9 18V6l10-2v12" />
          <circle cx="6.5" cy="18" r="2.5" />
          <circle cx="16.5" cy="16" r="2.5" />
        </g>
        <path d="M4 4l16 16" className={st.strike} />
      </svg>
    </button>
  );
  return embedded ? <div style={{ position: "sticky", top: 0, height: 0, zIndex: 70 }}>{btn}</div> : btn;
}

