import type { ReactNode } from "react";

/**
 * Telefon mokapi — qora ramka, tekis turadi (qiyshaytirilmaydi) — spec §5.8.
 * Kenglik tashqaridan beriladi (className / style), nisbat 9:19.5.
 */
export function PhoneFrame({
  children,
  className = "",
  dark = false,
  style,
}: {
  children: ReactNode;
  className?: string;
  /** status bar matni oq bo‘lsin (to‘q fonli shablonlar) */
  dark?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`${/\b(absolute|fixed)\b/.test(className) ? "" : "relative"} aspect-[300/627] rounded-[14%/6.7%] bg-gradient-to-b from-[#2e2d30] to-[#121214] p-[3.1%] shadow-[0_8px_10px_rgba(31,13,13,0.16)] ${className}`}
      style={style}
    >
      <div className="relative size-full overflow-hidden rounded-[11.7%/5.4%]" style={{ containerType: "inline-size" }}>
        {children}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-[9%] pt-[4.5%]">
          <span className={`text-[3.9cqw] font-semibold ${dark ? "text-white" : "text-ink"}`}>9:41</span>
          <span className="absolute left-1/2 top-[3%] h-[8.3cqw] w-[29cqw] -translate-x-1/2 rounded-full bg-black" />
          <span className={`flex items-end gap-[0.8cqw] ${dark ? "text-white" : "text-ink"}`} aria-hidden>
            {[1.4, 2.2, 3, 3.8].map((h) => (
              <span key={h} className="w-[0.9cqw] rounded-sm bg-current" style={{ height: `${h}cqw` }} />
            ))}
            <span className="ml-[1cqw] h-[3.6cqw] w-[6.6cqw] rounded-[1cqw] border border-current p-[0.4cqw]">
              <span className="block size-full rounded-[0.5cqw] bg-current" />
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

/** Laptop mokapi */
export function LaptopFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="mx-auto w-[86%] rounded-t-[2.2cqw] bg-[#1d1d1f] p-[1.4%] pb-[2%]" style={{ containerType: "inline-size" }}>
        <div className="aspect-[16/10] overflow-hidden rounded-[0.6cqw] bg-white">{children}</div>
      </div>
      <div className="relative h-[3.2%] min-h-2 rounded-b-[40%_100%] bg-gradient-to-b from-[#d9d6d0] to-[#a9a59d]">
        <span className="absolute left-1/2 top-0 h-1/2 w-[14%] -translate-x-1/2 rounded-b-md bg-[#bfbab1]" />
      </div>
    </div>
  );
}
