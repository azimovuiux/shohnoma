"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/ui";
import { useT } from "@/lib/i18n";

/** Buyurtma to‘ldirilayotgan sahifalar (/ru/ bilan ham): /buyurtma/<id>/, marosim, tafsilotlar, ko‘rib chiqish */
const WORK = /^(\/ru)?\/buyurtma\/[^/]+\/(marosim\/|tafsilotlar\/|korib-chiqish\/)?$/;
const flowOf = (path: string) => path.match(/^(\/ru)?\/buyurtma\/[^/]+\//)?.[0] ?? null;

/**
 * Buyurtma ustida ishlayotganda boshqa sahifaga olib ketadigan havola bosilsa — tasdiqlash so‘raladi.
 * Shu buyurtma bosqichlari orasidagi o‘tishlar, yangi oynada ochiladigan va tashqi havolalar so‘ralmaydi.
 */
export function LeaveGuard() {
  const t = useT();
  const [to, setTo] = useState<string | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const here = location.pathname;
      if (!WORK.test(here)) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.dataset.noGuard !== undefined) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === here) return; // shu sahifadagi #langar
      if (flowOf(url.pathname) && flowOf(url.pathname) === flowOf(here)) return; // shu buyurtma bosqichlari
      e.preventDefault();
      e.stopPropagation();
      setTo(url.pathname + url.search + url.hash);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const close = useCallback(() => setTo(null), []);
  return (
    <Modal open={!!to} onClose={close} label={t("Sahifadan chiqasizmi?")}>
      <div className="flex flex-col gap-4 p-6">
        <p className="font-serif text-[28px] font-light leading-[1.1] text-ink">{t("Sahifadan chiqasizmi?")}</p>
        <p className="t-body-m text-ink-2">{t("Ma’lumotlar saqlanadi — kabinetdan davom ettirasiz.")}</p>
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-secondary" onClick={() => to && (location.href = to)}>
            {t("Ha, chiqish")}
          </button>
          <button type="button" className="btn btn-primary" onClick={close} autoFocus>
            {t("Davom ettirish")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
