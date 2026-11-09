"use client";

import { useT } from "@/lib/i18n";

/** "Tayyor *dizaynlar*" uslubidagi sarlavha: Light 52 + Light Italic 64 (maroon) */
export function SectionTitle({
  plain,
  italic,
  stacked = false,
  light = false,
  className = "",
  as: Tag = "h2",
}: {
  plain: string;
  italic: string;
  stacked?: boolean;
  light?: boolean;
  className?: string;
  as?: "h1" | "h2";
}) {
  const t = useT();
  return (
    <Tag
      className={`flex font-serif font-light ${
        stacked ? "flex-col" : "flex-wrap items-baseline gap-x-3.5"
      } ${light ? "text-ink-inverse" : "text-ink"} ${className}`}
    >
      <span className={`text-[36px] leading-[1.04] tracking-[-0.005em] lg:text-[52px] ${stacked ? "-mb-1" : ""}`}>{t(plain)}</span>
      <em className={`text-[42px] italic leading-none tracking-[-0.01em] lg:text-[64px] ${light ? "text-[#e2c48c]" : "text-maroon"}`}>
        {t(italic)}
      </em>
    </Tag>
  );
}
