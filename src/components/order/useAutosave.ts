"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * O‘zgargan maydonlarni yig‘ib, `delay` ms dan so‘ng PATCH /api/orders/:id ga yuboradi.
 * flush() — darhol yuborish (keyingi bosqichga o‘tishdan oldin).
 *
 * `draft` — buyurtma to‘ldirilayotganda: server noto‘g‘ri/to‘liq bo‘lmagan maydonni xato bilan qaytarmaydi,
 * uni `skipped` ro‘yxatida aytadi, qolganini saqlaydi (majburiy maydonlar faqat «Davom etish»da tekshiriladi).
 * dirty() — serverga yetib bormagan o‘zgarish bormi (kutilayotgan, yuborilayotgan, xato yoki o‘tkazib yuborilgan).
 * discard() — saqlanmagan o‘zgarishlardan voz kechish («Saqlamasdan chiqish»): sahifadan ketishda ham yuborilmaydi.
 * hold()/resume() — chiqish oynasi ochiq turganda avtosaqlash kutib turadi.
 */
export function useAutosave(orderId: string, { delay = 700, draft = false }: { delay?: number; draft?: boolean } = {}) {
  const pending = useRef<Record<string, unknown>>({});
  const skipped = useRef<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<Promise<boolean> | null>(null);
  const failed = useRef(false);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  const payload = useCallback((body: Record<string, unknown>) => JSON.stringify(draft ? { ...body, _draft: true } : body), [draft]);

  const send = useCallback(async (): Promise<boolean> => {
    if (inflight.current) await inflight.current;
    const body = pending.current;
    if (!Object.keys(body).length) return !failed.current;
    pending.current = {};
    setState("saving");
    const p = (async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: payload(body),
        });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; skipped?: string[] };
        if (!res.ok || data.ok === false) throw new Error(data.error || "Saqlanmadi");
        const miss = new Set(data.skipped ?? []);
        for (const k of Object.keys(body)) {
          if (miss.has(k)) skipped.current.add(k);
          else skipped.current.delete(k);
        }
        failed.current = false;
        setState("saved");
        setError(null);
        return true;
      } catch (e) {
        // keyingi urinishda qayta yuborish uchun qaytarib qo‘yamiz
        pending.current = { ...body, ...pending.current };
        failed.current = true;
        setState("error");
        setError((e as Error).message);
        return false;
      }
    })();
    inflight.current = p;
    const ok = await p;
    inflight.current = null;
    return ok;
  }, [orderId, payload]);

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

  const dirty = useCallback(
    () => Object.keys(pending.current).length > 0 || !!inflight.current || failed.current || skipped.current.size > 0,
    [],
  );

  /** Kutilayotgan yuborishni to‘xtatib turish (chiqish oynasi ochiq — foydalanuvchi qaror qilguncha), resume() — davom */
  const hold = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const resume = useCallback(() => {
    if (!Object.keys(pending.current).length) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void send(), delay);
  }, [send, delay]);

  const discard = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    pending.current = {};
    skipped.current.clear();
    failed.current = false;
  }, []);

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
        body: payload(body),
        keepalive: true,
      });
    };
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      onHide(); // sayt ichida boshqa sahifaga o‘tilganda ham yo‘qolmasin
    };
  }, [orderId, payload]);

  return { queue, flush, dirty, discard, hold, resume, state, error };
}
