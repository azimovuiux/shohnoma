"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/** /buyurtma/<shablon>/marosim → qoralama yaratib, /buyurtma/<id>/marosim ga o‘tadi */
export function CreateDraft({ templateSlug, name }: { templateSlug: string; name: string }) {
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateSlug }),
      });
      const data = (await res.json()) as { ok?: boolean; id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error || "Buyurtma yaratilmadi");
      // Yangi id — to‘liq sahifa yuklanadi (statik qobiq id'ni URL'dan o‘qiydi)
      window.location.replace(`/buyurtma/${data.id}/marosim/`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-[480px] flex-col items-center justify-center gap-5 px-5 py-20 text-center">
      {error ? (
        <>
          <p className="font-serif text-[32px] font-light text-ink">Buyurtma ochilmadi</p>
          <p className="t-body-m text-ink-2">{error}</p>
          <div className="flex gap-3">
            <button type="button" onClick={run} className="btn btn-primary">
              Qayta urinish
            </button>
            <Link href="/shablonlar/" className="btn btn-secondary">
              Shablonlar
            </Link>
          </div>
        </>
      ) : (
        <>
          <span className="size-12 animate-spin rounded-full border-2 border-gold-soft border-t-maroon" aria-hidden />
          <p className="t-body-m text-ink-2">«{name}» shabloni bilan buyurtma tayyorlanmoqda…</p>
        </>
      )}
    </div>
  );
}
