import { star8Path } from "@/lib/ornament";

/** To‘ldirilgan 8 burchakli yulduz — logotip yonida, ajratgichlarda */
export function Star8({
  size = 14,
  color = "var(--color-gold)",
  className,
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden>
      <path d={star8Path(20, 20, 20, 0.72)} fill={color} />
    </svg>
  );
}

/** Kontur yulduz */
export function Star8Outline({
  size = 40,
  color = "var(--color-gold)",
  strokeWidth = 1,
  className,
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden>
      <path d={star8Path(20, 20, 19, 0.72)} fill="none" stroke={color} strokeWidth={strokeWidth} />
    </svg>
  );
}

/** Girih naqshi — takrorlanuvchi 8-yulduz konturi (SVG pattern) */
export function GirihPattern({
  id,
  cell = 64,
  color = "var(--color-gold)",
  opacity = 0.35,
  className,
}: {
  id: string;
  cell?: number;
  color?: string;
  opacity?: number;
  className?: string;
}) {
  const r = cell * 0.3;
  return (
    <svg className={className} width="100%" height="100%" aria-hidden>
      <defs>
        <pattern id={id} width={cell} height={cell} patternUnits="userSpaceOnUse">
          <path d={star8Path(cell / 2, cell / 2, r)} fill="none" stroke={color} strokeWidth={1} />
          <path d={star8Path(0, 0, r * 0.45)} fill="none" stroke={color} strokeWidth={1} />
          <path d={star8Path(cell, 0, r * 0.45)} fill="none" stroke={color} strokeWidth={1} />
          <path d={star8Path(0, cell, r * 0.45)} fill="none" stroke={color} strokeWidth={1} />
          <path d={star8Path(cell, cell, r * 0.45)} fill="none" stroke={color} strokeWidth={1} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} opacity={opacity} />
    </svg>
  );
}
