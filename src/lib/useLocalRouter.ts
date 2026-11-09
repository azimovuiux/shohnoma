"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { lpath, useLocale } from "@/lib/i18n";

/** useRouter o‘rniga: push/replace/prefetch manzillariga til prefiksini qo‘shadi */
export function useLocalRouter() {
  const r = useRouter();
  const locale = useLocale();
  return useMemo(
    () => ({
      ...r,
      push: (href: string, o?: Parameters<typeof r.push>[1]) => r.push(lpath(locale, href), o),
      replace: (href: string, o?: Parameters<typeof r.replace>[1]) => r.replace(lpath(locale, href), o),
      prefetch: (href: string) => r.prefetch(lpath(locale, href)),
    }),
    [r, locale],
  );
}
