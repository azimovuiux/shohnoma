"use client";

import { useEffect, useRef, useState } from "react";

/** Musiqa kutubxonasidagi trek (admin yuklaydi, barcha shablonlar uchun umumiy) */
export interface Track {
  id: string;
  title: string;
  artist: string | null;
  duration: number | null;
  url: string;
  active: boolean;
  size?: number;
  used?: number;
}

export const trackUrl = (id: string) => `/files/music/${id}.mp3`;

/** Taklifnomada chalinadigan trek: mijoz tanlagani, bo‘lmasa shablonning standarti */
export const musicSrc = (t: { musicId?: string | null }, d: { musicTrack?: string | null }) =>
  d.musicTrack ? trackUrl(d.musicTrack) : t.musicId ? trackUrl(t.musicId) : null;

export const fmtDuration = (s: number | null | undefined) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "");

/** Faol treklar ro‘yxati (buyurtma formasi va admin shablon tahriri uchun) */
export function useMusicTracks() {
  const [tracks, setTracks] = useState<Track[] | null>(null);
  useEffect(() => {
    let off = false;
    fetch("/api/music")
      .then((r) => r.json())
      .then((d: { tracks?: Track[] }) => !off && setTracks(d.tracks ?? []))
      .catch(() => !off && setTracks([]));
    return () => {
      off = true;
    };
  }, []);
  return tracks;
}

/** Ro‘yxatda tinglab ko‘rish: bir vaqtda bitta trek */
export function usePreviewPlayer() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => () => audio.current?.pause(), []);
  const toggle = (id: string, url: string) => {
    if (!audio.current) {
      audio.current = new Audio();
      audio.current.addEventListener("ended", () => setPlaying(null));
    }
    const a = audio.current;
    if (playing === id) {
      a.pause();
      setPlaying(null);
      return;
    }
    a.src = url;
    a.currentTime = 0;
    a.volume = 0.8;
    a.play().then(() => setPlaying(id)).catch(() => setPlaying(null));
  };
  const stop = () => {
    audio.current?.pause();
    setPlaying(null);
  };
  return { playing, toggle, stop };
}

/** Faylning davomiyligi (soniya) — yuklashdan oldin brauzerda o‘lchanadi */
export function audioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(isFinite(a.duration) ? a.duration : null);
    };
    a.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    a.src = url;
  });
}
