"use client";

import { Photo } from "@/components/home/Photo";
import { useT } from "@/lib/i18n";

/** /kirish/ sahifasidagi chap rasm va izoh (desktop) */
export function LoginAside() {
  const t = useT();
  return (
    <div className="relative hidden h-[760px] w-[640px] shrink-0 overflow-hidden rounded-[28px] lg:block">
      <Photo alt={t("Krem taklifnoma kartalari, oltin muhr va pero")} src="/images/custom-design.webp" tone="cream" className="absolute inset-0" />
    </div>
  );
}
