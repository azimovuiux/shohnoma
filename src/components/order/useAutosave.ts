"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * O‘zgargan maydonlarni yig‘ib, `delay` ms dan so‘ng PATCH /api/orders/:id ga yuboradi.
 * flush() — darhol yuborish (keyingi bosqichga o‘tishdan oldin).
 */
export function useAutosave(orderId: string, delay = 700) {
  const pending = useRef<Record<string, unknown>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<Promise<boolean> | null>(null);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async (): Promise<boolean> => {
    if (inflight.current) await inflight.current;
    const body = pending.current;
    if (!Object.keys(body).length) return true;
    pending.current = {};
    setState("saving");
    const p = (async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!res.ok || data.ok === false) throw new Error(data.error || "Saqlanmadi");
        setState("saved");
        setError(null);
        return true;
      } catch (e) {
        // keyingi urinishda qayta yuborish uchun qaytarib qo‘yamiz
        pending.current = { ...body, ...pending.current };
        setState("error");
        setError((e as Error).message);
        return false;
      }
    })();
    inflight.current = p;
    const ok = await p;
    inflight.current = null;
    return ok;
  }, [orderId]);

  const queue = useCallback(
    (patch: Record<string, unknown>) => {
      pending.current = { ...pending.current, ...patch };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void send(), delay);
    },
    [send, delay],
  );

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    return send();
  }, [send]);

  // sahifadan chiqishda saqlanmagan o‘zgarishlarni yuborish
  useEffect(() => {
    const onHide = () => {
      if (!Object.keys(pending.current).length) return;
      if (timer.current) clearTimeout(timer.current);
      const body = pending.current;
      pending.current = {};
      void fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      });
    };
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      onHide(); // sayt ichida boshqa sahifaga o‘tilganda ham yo‘qolmasin
    };
  }, [orderId, send]);

  return { queue, flush, state, error };
}
