"use client";

import { useEffect, useRef, useState } from "react";
import { TelegramIcon } from "@/components/TelegramIcon";
import { api, useToast } from "@/components/ui";
import { site } from "@/lib/site";
import { useConfig } from "@/lib/client";

type TgUser = Record<string, string | number>;
declare global {
  interface Window {
    __shohnomaTgAuth?: (u: TgUser) => void;
  }
}


/**
 * Telegram Login Widget. Rasmiy vidjet ko‘rinmas holda tugma ustida turadi — tashqi ko‘rinish dizayndagidek.
 * Bot sozlanmagan bo‘lsa, tugma o‘chiq ko‘rinishda va Telegram chatiga havola beriladi.
 */
export function TelegramLogin({ next, label = "Telegram orqali kirish", onDone }: { next?: string; label?: string; onDone?: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const { data: cfg, loading: cfgLoading } = useConfig();
  // Bot nomi: API sozlamasi (.env TELEGRAM_BOT_USERNAME) yoki build paytidagi qiymat
  const BOT = cfg?.telegramBot || process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "";
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!BOT || !box.current) return;
    window.__shohnomaTgAuth = async (u) => {
      setBusy(true);
      try {
        await api("/api/auth/telegram", { method: "POST", json: Object.fromEntries(Object.entries(u).map(([k, v]) => [k, String(v)])) });
        if (onDone) onDone();
        else window.location.replace(next || "/kabinet/");
      } catch (e) {
        toast((e as Error).message, "error");
      } finally {
        setBusy(false);
      }
    };
    const s = document.createElement("script");
    s.src = "https://telegram.org/js/telegram-widget.js?22";
    s.async = true;
    s.setAttribute("data-telegram-login", BOT);
    s.setAttribute("data-size", "large");
    s.setAttribute("data-radius", "999");
    s.setAttribute("data-request-access", "write");
    s.setAttribute("data-onauth", "__shohnomaTgAuth(user)");
    const el = box.current;
    el.innerHTML = "";
    el.appendChild(s);
    // Vidjet iframe'ini butun tugma o‘lchamiga cho‘zish
    const fit = () => {
      const f = el.querySelector("iframe");
      if (!f || !f.offsetWidth) return;
      f.style.transformOrigin = "0 0";
      f.style.position = "absolute";
      f.style.left = "0";
      f.style.top = "0";
      f.style.transform = `scale(${el.clientWidth / f.offsetWidth}, ${el.clientHeight / f.offsetHeight})`;
    };
    const mo = new MutationObserver(() => {
      const f = el.querySelector("iframe");
      if (f) f.addEventListener("load", fit);
      fit();
    });
    mo.observe(el, { childList: true, subtree: true });
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => {
      mo.disconnect();
      ro.disconnect();
    };
  }, [BOT, next, onDone, toast]);

  if (!BOT && cfgLoading) return <span className="btn btn-secondary w-full opacity-60" aria-hidden>{label}</span>;
  if (!BOT) {
    return (
      <div className="flex w-full flex-col gap-2">
        <button type="button" disabled className="btn btn-secondary w-full">
          <TelegramIcon size={18} /> {label}
        </button>
        <p className="t-body-s text-ink-2">
          Telegram orqali kirish tez orada ishga tushadi. Savollar bo‘lsa —{" "}
          <a href={site.telegram} target="_blank" rel="noopener noreferrer" className="text-maroon underline">
            Telegramda yozing
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <span className="btn btn-secondary pointer-events-none w-full" aria-hidden>
        <TelegramIcon size={18} /> {busy ? "Kirilmoqda…" : label}
      </span>
      {/* Rasmiy vidjet iframe'i — shaffof, butun tugmani qoplaydi */}
      <div ref={box} className="absolute inset-0 overflow-hidden rounded-full opacity-[0.011]" aria-label={label} />
    </div>
  );
}
