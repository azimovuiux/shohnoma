"use client";

import { useCallback } from "react";
import { useT } from "@/lib/i18n";

/**
 * Vizitka formasi tarjimasi: taklifnomada boshqa ma’noda ishlatiladigan so‘zlar «vz::» konteksti bilan
 * (masalan, «Manzil» — taklifnomada «Venue / Адрес места», vizitkada «Address»), umumiy lug‘atni buzmaslik uchun.
 */
const VZ_CTX = new Set(["Manzil", "Yo‘nalish"]);

export function useVT() {
  const t = useT();
  return useCallback((s: string, vars?: Record<string, string | number>) => t(VZ_CTX.has(s) ? `vz::${s}` : s, vars), [t]);
}
