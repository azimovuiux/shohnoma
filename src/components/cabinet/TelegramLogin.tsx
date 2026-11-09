"use client";

import { useEffect, useRef, useState } from "react";
import { TelegramIcon } from "@/components/TelegramIcon";
import { api, useToast } from "@/components/ui";
import { site } from "@/lib/site";
import { useConfig } from "@/lib/client";
import { lpath, useLocale, useT } from "@/lib/i18n";

type Status = "idle" | "waiting" | "opened" | "expired";

/**
 * Telegram orqali kirish / ro‘yxatdan o‘tish — bot orqali.
 * Tugma → Telegram ochiladi → botda «📱 Raqamni yuborish» → sayt o‘zi kiradi (holat har 2 soniyada tekshiriladi).
 * Kabinetda (onDone bilan) — joriy hisobga Telegramni ulaydi.
 */
export function TelegramLogin({ next, label: rawLabel = "Telegram orqali kirish", onDone }: { next?: string; label?: string; onDone?: () => void }) {
  const t = useT();
  const locale = useLocale();
  const label = t(rawLabel);
  const { data: cfg, loading: cfgLoading } = useConfig();
  const toast = useToast();
  const [status, setStatus] = useState<Status>("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => void (timer.current && window.clearInterval(timer.current)), []);

  const poll = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = window.setInterval(async () => {
      try {
        const r = await api<{ status: string }>("/api/auth/tg/status");
        if (r.status === "done") {
          window.clearInterval(timer.current!);
          if (onDone) {
            setStatus("idle");
            onDone();
          } else window.location.replace(lpath(locale, next || "/kabinet/"));
        } else if (r.status === "expired" || r.status === "none") {
          window.clearInterval(timer.current!);
          setStatus("expired");
        } else setStatus(r.status as Status);
      } catch {
        /* tarmoq — keyingi urinish */
      }
    }, 2000);
  };

  const start = async () => {
    setBusy(true);
    // Safari/iOS popup blokini chetlab o‘tish: oynani darhol ochib, keyin manzil beramiz
    const win = window.open("", "_blank");
    try {
      const r = await api<{ url: string }>("/api/auth/tg/start", { method: "POST" });
      setUrl(r.url);
      if (win) win.location.href = r.url;
      else window.location.href = r.url;
      setStatus("waiting");
      poll();
    } catch (e) {
      win?.close();
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  if (cfgLoading && !cfg) return <span className="btn btn-secondary w-full opacity-60" aria-hidden>{label}</span>;
  if (!cfg?.telegramBot) {
    return (
      <div className="flex w-full flex-col gap-2">
        <button type="button" disabled className="btn btn-secondary w-full">
          <TelegramIcon size={18} /> {label}
        </button>
        <p className="t-body-s text-ink-2">
          {t("Telegram orqali kirish tez orada ishga tushadi. Savollar bo‘lsa —")}{" "}
          <a href={site.telegram} target="_blank" rel="noopener noreferrer" className="text-maroon underline">
            {t("Telegramda yozing")}
          </a>
          .
        </p>
      </div>
    );
  }

  if (status === "waiting" || status === "opened") {
    return (
      <div className="flex w-full flex-col gap-3 rounded-[16px] border border-[#2AABEE]/40 bg-[#2AABEE]/[0.06] p-4">
        <div className="flex items-center gap-3">
          <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-[#2AABEE] text-white">
            <TelegramIcon size={20} />
            <span className="absolute inset-0 animate-ping rounded-full bg-[#2AABEE]/30" />
          </span>
          <div className="flex flex-col">
            <span className="t-title text-ink">{status === "opened" ? t("Botda raqamingizni yuboring") : t("Telegram ochildi")}</span>
            <span className="t-body-s text-ink-2">
              {status === "opened" ? t("«📱 Raqamni yuborish» tugmasini bosing — sayt o‘zi kiradi.") : t("Botda «Start» tugmasini bosing.")}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-sm flex-1 bg-[#2AABEE] text-white hover:bg-[#229ED9]">
              {t("Telegramni ochish")}
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              if (timer.current) window.clearInterval(timer.current);
              setStatus("idle");
            }}
            className="btn btn-secondary btn-sm"
          >
            {t("Bekor qilish")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <button type="button" onClick={start} disabled={busy} className="btn w-full bg-[#2AABEE] text-white hover:bg-[#229ED9]">
        <TelegramIcon size={18} /> {busy ? t("Ochilmoqda…") : label}
      </button>
      {status === "expired" && <p className="t-body-s text-danger">{t("Vaqt tugadi. Qayta urinib ko‘ring.")}</p>}
    </div>
  );
}
