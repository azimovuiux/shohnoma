"use client";

import { Copy } from "@/components/icons";
import { useCopy } from "@/components/ui";
import { useT } from "@/lib/i18n";

/** "shohnoma.uz/jasur-madina" + nusxalash. Ulashish — src/components/share/ShareInvite */
export function CopyLink({ url, className = "" }: { url: string; className?: string }) {
  const t = useT();
  const copy = useCopy();
  const shown = url.replace(/^https?:\/\//, "");
  return (
    <button type="button" onClick={() => copy(url, t("Havola nusxalandi"))} className={`group inline-flex min-w-0 items-center gap-2 text-left ${className}`} aria-label={t("Havolani nusxalash")}>
      <span className="truncate text-[13px] font-medium leading-none text-maroon">{shown}</span>
      <Copy size={15} className="shrink-0 text-ink-2 group-hover:text-maroon" />
    </button>
  );
}
