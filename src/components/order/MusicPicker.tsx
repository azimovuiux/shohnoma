"use client";

import { Pause, Play, TickCircle } from "@/components/icons";
import { fmtDuration, useMusicTracks, usePreviewPlayer } from "@/lib/music";

/** Fon musiqasini kutubxonadan tanlash. value = null — shablonning standart musiqasi */
export function MusicPicker({ value, defaultId, onChange }: { value: string | null; defaultId?: string | null; onChange: (id: string | null) => void }) {
  const tracks = useMusicTracks();
  const player = usePreviewPlayer();
  if (!tracks) return <div className="h-16 animate-pulse rounded-xl bg-bg-soft" aria-busy="true" />;
  if (!tracks.length) return null;

  const current = value ?? defaultId ?? null;
  const sorted = defaultId ? [...tracks].sort((a, b) => Number(b.id === defaultId) - Number(a.id === defaultId)) : tracks;

  return (
    <div role="radiogroup" aria-label="Fon musiqasi" className="flex max-h-[340px] flex-col gap-1.5 overflow-y-auto rounded-xl bg-bg-soft p-1.5">
      {sorted.map((t) => {
        const active = current === t.id;
        const isPlaying = player.playing === t.id;
        return (
          <div
            key={t.id}
            className={`flex items-center gap-3 rounded-[10px] px-2.5 py-2 transition-colors ${active ? "bg-bg-base shadow-soft" : "hover:bg-bg-base/60"}`}
          >
            <button
              type="button"
              onClick={() => player.toggle(t.id, t.url)}
              aria-label={isPlaying ? `«${t.title}» — to‘xtatish` : `«${t.title}» — tinglash`}
              className={`flex size-9 shrink-0 items-center justify-center rounded-full ${isPlaying ? "bg-maroon text-ink-inverse" : "border border-line bg-bg-base text-maroon"}`}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(t.id === defaultId ? null : t.id)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[14px] font-semibold leading-[1.35] text-ink">{t.title}</span>
                <span className="truncate t-body-s text-ink-2">
                  {[t.artist, fmtDuration(t.duration), t.id === defaultId ? "shablon uchun tavsiya" : ""].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className={`flex size-5 shrink-0 items-center justify-center rounded-full ${active ? "text-maroon" : "border border-line"}`}>
                {active && <TickCircle size={20} />}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
