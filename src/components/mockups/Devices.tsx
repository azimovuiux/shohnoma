import type { ReactNode } from "react";

/**
 * Qurilma mokaplari. O‘lchamlar tashqi konteyner kengligiga nisbatan (container query: cqw),
 * shuning uchun mokap har qanday kenglikda bir xil proporsiyada chiqadi.
 * Figma: telefon 300×627, ramka 9px (3%), burchak 42px (14%); laptop ekrani 16:10, ramka #1d1d1f.
 */

export function PhoneFrame({
  children,
  className = "",
  dark = false,
  style,
  reveal,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  /** status bar oq bo‘lsin (to‘q fonli shablonlar) */
  dark?: boolean;
  style?: React.CSSProperties;
  /** paydo bo‘lish animatsiyasi (data-reveal qiymati) */
  reveal?: string;
  delay?: number;
}) {
  const positioned = /\b(absolute|fixed|sticky)\b/.test(className);
  return (
    <div
      className={`${positioned ? "" : "relative"} ${className}`}
      style={{ ...style, containerType: "inline-size", ...(reveal ? { ["--d" as string]: `${delay}ms` } : {}) }}
      {...(reveal ? { "data-reveal": reveal } : {})}
    >
      <div
        className="relative aspect-[300/627] w-full bg-[#1d1d1f]"
        style={{
          padding: "2.6cqw",
          borderRadius: "13.5cqw",
          boxShadow: "0 0 0 0.5cqw #3a3a3d inset, 0 6cqw 10cqw -4cqw rgba(31,13,13,.28)",
        }}
      >
        {/* yon tugmalar */}
        <span aria-hidden className="absolute -left-[0.9cqw] top-[22%] h-[7%] w-[1cqw] rounded-l-sm bg-[#2b2b2e]" />
        <span aria-hidden className="absolute -right-[0.9cqw] top-[27%] h-[11%] w-[1cqw] rounded-r-sm bg-[#2b2b2e]" />
        <div className="relative size-full overflow-hidden bg-white" style={{ borderRadius: "11cqw", containerType: "inline-size" }}>
          {children}
          <div aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex h-[12cqw] items-center justify-between px-[9cqw] ${dark ? "text-white" : "text-ink"}`}>
            <span className="text-[3.6cqw] font-semibold leading-none">9:41</span>
            <span className="flex items-center gap-[1cqw]">
              <span className="flex items-end gap-[0.5cqw]">
                {[1.2, 1.8, 2.4, 3].map((h) => (
                  <span key={h} className="w-[0.8cqw] rounded-[0.3cqw] bg-current" style={{ height: `${h}cqw` }} />
                ))}
              </span>
              <span className="ml-[0.6cqw] flex h-[3cqw] w-[5.6cqw] items-center rounded-[0.9cqw] border-[0.35cqw] border-current/70 p-[0.4cqw]">
                <span className="h-full w-[75%] rounded-[0.4cqw] bg-current" />
              </span>
            </span>
          </div>
          <span aria-hidden className="pointer-events-none absolute left-1/2 top-[3cqw] z-20 h-[7.4cqw] w-[26cqw] -translate-x-1/2 rounded-full bg-black" />
        </div>
      </div>
    </div>
  );
}

/** Laptop mokapi: ekran (16:10) + yupqa asos */
export function LaptopFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`} style={{ containerType: "inline-size" }}>
      <div className="mx-auto w-[84%]">
        <div
          className="bg-[#1d1d1f]"
          style={{ padding: "1.3cqw 1.3cqw 1.9cqw", borderRadius: "2.6cqw 2.6cqw 0.6cqw 0.6cqw", boxShadow: "0 0 0 0.25cqw #3a3a3d inset" }}
        >
          <div className="relative aspect-[16/10] overflow-hidden bg-white" style={{ borderRadius: "0.5cqw", containerType: "inline-size" }}>
            {children}
          </div>
        </div>
      </div>
      {/* asos */}
      <div className="relative h-[2.4cqw] w-full rounded-b-[1.6cqw] bg-gradient-to-b from-[#e4e1db] via-[#cfcac2] to-[#a8a39a] shadow-[0_1.2cqw_2cqw_-1cqw_rgba(31,13,13,0.3)]">
        <span aria-hidden className="absolute left-1/2 top-0 h-[0.9cqw] w-[13%] -translate-x-1/2 rounded-b-[0.8cqw] bg-[#b9b4ab]" />
      </div>
    </div>
  );
}
