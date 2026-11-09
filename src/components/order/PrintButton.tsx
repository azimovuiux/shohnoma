"use client";

import { Printer } from "@/components/icons";
import { useT } from "@/lib/i18n";

export function PrintButton() {
  const t = useT();
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-primary">
      <Printer size={16} /> {t("Chop etish yoki PDF saqlash")}
    </button>
  );
}
