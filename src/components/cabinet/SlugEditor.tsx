"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Link2 } from "@/components/icons";
import { api, useToast } from "@/components/ui";

/** Havola manzili (slug) — faqat to‘langan taklifnoma uchun */
export function SlugEditor({ orderId, slug, host, enabled }: { orderId: string; slug: string; host: string; enabled: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState(enabled ? slug : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/api/orders/${orderId}`, { method: "PATCH", json: { slug: value } });
      toast("Havola saqlandi");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form id="havola" onSubmit={save} className="flex scroll-mt-28 flex-col gap-4 rounded-card border border-line bg-bg-base p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-gold-soft text-maroon">
          <Link2 size={18} />
        </span>
        <div className="flex flex-col">
          <p className="text-[15px] font-semibold leading-[1.35] text-ink">Havola manzili</p>
          <p className="t-body-s text-ink-2">Mehmonlarga yuboriladigan sayt manzili</p>
        </div>
      </div>
      {enabled ? (
        <>
          <label className="flex flex-col gap-2">
            <span
              className={`flex h-12 items-center rounded-input border bg-bg-base pl-4 focus-within:border-maroon/55 ${error ? "border-danger" : "border-line"}`}
            >
              <span className="shrink-0 t-body-m text-ink-2">{host}/</span>
              <input
                value={value}
                onChange={(e) => (setValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")), setError(null))}
                aria-label="Havola manzili"
                aria-invalid={!!error}
                maxLength={60}
                className="h-full min-w-0 flex-1 bg-transparent pr-4 t-body-m text-ink outline-none"
              />
            </span>
            {error ? (
              <span className="t-body-s text-danger">{error}</span>
            ) : (
              <span className="t-body-s text-ink-2">Faqat lotin harflari, raqamlar va “-”. Eski havola o‘zgartirilgach ishlamay qoladi — yangi havolani mehmonlarga qayta yuboring.</span>
            )}
          </label>
          <div>
            <button type="submit" disabled={busy || value === slug || value.length < 3} className="btn btn-primary">
              {busy ? "Saqlanmoqda…" : "Saqlash"}
            </button>
          </div>
        </>
      ) : (
        <p className="t-body-m text-ink-2">Havola manzili to‘lov tasdiqlangach beriladi va shu yerda o‘zgartiriladi.</p>
      )}
    </form>
  );
}
