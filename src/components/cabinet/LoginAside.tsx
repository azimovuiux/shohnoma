"use client";

import { Photo } from "@/components/home/Photo";
import { useT } from "@/lib/i18n";

/** /kirish/ sahifasidagi chap rasm va izoh (desktop) */
export function LoginAside() {
  const t = useT();
  return (
    <div className="relative hidden h-[760px] w-[640px] shrink-0 overflow-hidden rounded-[28px] lg:block">
      <Photo alt={t("Krem taklifnoma kartalari, oltin muhr va pero")} src="/images/custom-design.webp" tone="cream" className="absolute inset-0" />
      <div className="absolute bottom-[34px] left-7 flex flex-col gap-1.5 rounded-[18px] bg-bg-base/92 px-5 py-4">
        <p className="t-title text-ink">{t("Hammasi bir joyda")}</p>
        <p className="t-body-s text-ink-2">{t("Buyurtma, havola, QR kod va mehmonlar javobi")}</p>
      </div>
    </div>
  );
}
