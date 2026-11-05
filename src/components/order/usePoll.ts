"use client";

import { useEffect, useRef } from "react";

export type StatusResponse = { ok: boolean; status: string; slug: string; payment: { provider: string; status: string; note: string | null } | null };

/** /api/orders/:id/status ni har `ms` da so‘raydi; onData false qaytarsa — to‘xtaydi */
export function usePollStatus(orderId: string, onData: (d: StatusResponse) => boolean | void, ms = 3000, enabled = true) {
  const cb = useRef(onData);
  cb.current = onData;
  useEffect(() => {
    if (!enabled) return;
    let stop = false;
    let t: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/status`, { cache: "no-store" });
        if (res.ok) {
          const d = (await res.json()) as StatusResponse;
          if (cb.current(d) === false) stop = true;
        }
      } catch {}
      if (!stop) t = setTimeout(tick, document.hidden ? ms * 3 : ms);
    };
    t = setTimeout(tick, 800);
    return () => {
      stop = true;
      clearTimeout(t);
    };
  }, [orderId, ms, enabled]);
}
