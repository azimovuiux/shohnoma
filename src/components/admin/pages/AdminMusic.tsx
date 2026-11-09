"use client";

import { useEffect, useRef, useState } from "react";
import { apiGet } from "@/lib/client";
import { api, confirmDialog, useToast } from "@/components/ui";
import { DocumentUpload, Music, Pause, Play, Trash } from "@/components/icons";
import { audioDuration, fmtDuration, usePreviewPlayer, type Track } from "@/lib/music";
import { AdminError, AdminLoading, AdminTitle, Empty } from "../shared";

const MAX_MB = 15;

/** Musiqa kutubxonasi — barcha shablonlar uchun umumiy. Mijoz buyurtmada shu ro‘yxatdan tanlaydi. */
export function AdminMusic() {
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const player = usePreviewPlayer();

  const load = () =>
    apiGet<{ tracks: Track[] }>("/api/admin/music")
      .then((d) => setTracks(d.tracks))
      .catch((e) => setErr((e as Error).message));
  useEffect(() => {
    load();
  }, []);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const f of Array.from(files)) {
      if (!/\.mp3$/i.test(f.name)) {
        toast(`${f.name}: faqat MP3`, "error");
        continue;
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        toast(`${f.name}: ${MAX_MB} MB dan katta`, "error");
        continue;
      }
      setUploading((u) => [...u, f.name]);
      try {
        const fd = new FormData();
        fd.append("file", f);
        fd.append("title", f.name.replace(/\.mp3$/i, "").replace(/[_]+/g, " ").trim());
        const d = await audioDuration(f);
        if (d) fd.append("duration", String(d));
        const r = await api<{ track: Track }>("/api/admin/music", { method: "POST", body: fd });
        setTracks((t) => [...(t ?? []), { ...r.track, used: 0 }]);
      } catch (e) {
        toast(`${f.name}: ${(e as Error).message}`, "error");
      } finally {
        setUploading((u) => u.filter((x) => x !== f.name));
      }
    }
    if (input.current) input.current.value = "";
  };

  const patch = async (id: string, p: Partial<Pick<Track, "title" | "artist" | "active">>) => {
    try {
      const r = await api<{ track: Track }>(`/api/admin/music/${id}`, { method: "PATCH", json: p });
      setTracks((t) => t?.map((x) => (x.id === id ? { ...x, ...r.track } : x)) ?? null);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  const remove = async (t: Track) => {
    const note = t.used ? `${t.used} ta taklifnoma shu musiqani tanlagan — ular shablonning standart musiqasiga o‘tadi.` : "";
    if (!(await confirmDialog({ title: `«${t.title}» o‘chirilsinmi?`, text: note || undefined, ok: "O‘chirish", danger: true }))) return;
    try {
      await api(`/api/admin/music/${t.id}`, { method: "DELETE" });
      if (player.playing === t.id) player.stop();
      setTracks((x) => x?.filter((y) => y.id !== t.id) ?? null);
      toast("O‘chirildi");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  if (err) return <AdminError message={err} onRetry={() => (setErr(null), load())} />;
  if (!tracks) return <AdminLoading />;

  return (
    <>
      <AdminTitle
        title="Musiqa"
        sub="Barcha shablonlar uchun umumiy kutubxona. Mijoz taklifnomani sozlayotganda shu ro‘yxatdan tanlaydi; har bir shablonning standart musiqasi — Shablonlar bo‘limida."
        right={
          <button type="button" onClick={() => input.current?.click()} className="btn btn-primary btn-sm w-fit">
            <DocumentUpload size={16} /> MP3 yuklash
          </button>
        }
      />
      <input ref={input} type="file" accept=".mp3,audio/mpeg" multiple hidden onChange={(e) => upload(e.target.files)} />

      {uploading.length > 0 && (
        <div className="mb-4 flex flex-col gap-2">
          {uploading.map((n) => (
            <div key={n} className="flex items-center gap-3 rounded-xl bg-bg-soft px-4 py-3 t-body-s text-ink-2">
              <span className="size-4 animate-spin rounded-full border-2 border-line border-t-maroon" /> {n} yuklanmoqda…
            </div>
          ))}
        </div>
      )}

      {tracks.length === 0 ? (
        <Empty>
          Hali musiqa yo‘q. MP3 fayllarni yuklang (har biri {MAX_MB} MB gacha) — bir nechtasini birdan tanlash mumkin.
        </Empty>
      ) : (
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-panel border border-line">
          {tracks.map((t) => (
            <li key={t.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap ${t.active ? "" : "bg-bg-soft/60"}`}>
              <button
                type="button"
                onClick={() => player.toggle(t.id, t.url)}
                aria-label={player.playing === t.id ? "To‘xtatish" : "Tinglash"}
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-maroon text-ink-inverse"
              >
                {player.playing === t.id ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:gap-2">
                <input
                  defaultValue={t.title}
                  aria-label="Nomi"
                  onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== t.title && patch(t.id, { title: e.target.value.trim() })}
                  className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 t-body-m font-semibold text-ink hover:border-line focus:border-maroon focus:outline-none"
                />
                <input
                  defaultValue={t.artist ?? ""}
                  placeholder="Ijrochi"
                  aria-label="Ijrochi"
                  onBlur={(e) => e.target.value.trim() !== (t.artist ?? "") && patch(t.id, { artist: e.target.value.trim() })}
                  className="min-w-0 rounded-lg border border-transparent bg-transparent px-2 py-1.5 t-body-s text-ink-2 hover:border-line focus:border-maroon focus:outline-none sm:w-[200px]"
                />
              </div>
              <span className="w-12 shrink-0 text-right t-body-s tabular-nums text-ink-2">{fmtDuration(t.duration)}</span>
              {!!t.used && (
                <span className="shrink-0 rounded-full bg-bg-soft px-2.5 py-1 text-[11px] text-ink-2" title="Shu musiqani tanlagan taklifnomalar">
                  <Music size={11} className="mr-1 inline" />
                  {t.used}
                </span>
              )}
              <label className="flex shrink-0 cursor-pointer items-center gap-2 t-body-s text-ink-2">
                <input type="checkbox" checked={t.active} onChange={(e) => patch(t.id, { active: e.target.checked })} className="size-4 accent-[var(--color-maroon)]" />
                Ro‘yxatda
              </label>
              <button type="button" onClick={() => remove(t)} aria-label="O‘chirish" className="icon-btn shrink-0">
                <Trash size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
