"use client";

import { Pause, Play, TickCircle } from "@/components/icons";
import { fmtDuration, useMusicTracks, usePreviewPlayer } from "@/lib/music";
import { useT } from "@/lib/i18n";

/** Fon musiqasini kutubxonadan tanlash. value = null — shablonning standart musiqasi */
export function MusicPicker({ value, defaultId, onChange }: { value: string | null; defaultId?: string | null; onChange: (id: string | null) => void }) {
  const t = useT();
  const tracks = useMusicTracks();
  const player = usePreviewPlayer();
  if (!tracks) return <div className="h-16 animate-pulse rounded-xl bg-bg-soft" aria-busy="true" />;
  if (!tracks.length) return null;

  const current = value ?? defaultId ?? null;
  const sorted = defaultId ? [...tracks].sort((a, b) => Number(b.id === defaultId) - Number(a.id === defaultId)) : tracks;

  return (
    <div role="radiogroup" aria-label={t("Fon musiqasi")} className="flex max-h-[340px] flex-col gap-1.5 overflow-y-auto rounded-xl bg-bg-soft p-1.5">
      {sorted.map((tr) => {
        const active = current === tr.id;
        const isPlaying = player.playing === tr.id;
        return (
          <div
            key={tr.id}
            className={`flex items-center gap-3 rounded-[10px] px-2.5 py-2 transition-colors ${active ? "bg-bg-base shadow-soft" : "hover:bg-bg-base/60"}`}
          >
            <button
              type="button"
              onClick={() => player.toggle(tr.id, tr.url)}
              aria-label={isPlaying ? t("«{title}» — to‘xtatish", { title: tr.title }) : t("«{title}» — tinglash", { title: tr.title })}
              className={`flex size-9 shrink-0 items-center justify-center rounded-full ${isPlaying ? "bg-maroon text-ink-inverse" : "border border-line bg-bg-base text-maroon"}`}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(tr.id === defaultId ? null : tr.id)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[14px] font-semibold leading-[1.35] text-ink">{tr.title}</span>
                <span className="truncate t-body-s text-ink-2">
                  {[tr.artist, fmtDuration(tr.duration), tr.id === defaultId ? t("shablon uchun tavsiya") : ""].filter(Boolean).join(" · ")}
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
