/** Dumaloq bayroqlar (20px) */
export function FlagUZ({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden className="rounded-full">
      <clipPath id="fuz"><circle cx="10" cy="10" r="10" /></clipPath>
      <g clipPath="url(#fuz)">
        <rect width="20" height="7" fill="#1EB5E8" />
        <rect y="6.4" width="20" height="0.6" fill="#CE1126" />
        <rect y="7" width="20" height="6" fill="#fff" />
        <rect y="13" width="20" height="0.6" fill="#CE1126" />
        <rect y="13.6" width="20" height="6.4" fill="#1EB53A" />
        <circle cx="5" cy="3.5" r="2" fill="#fff" />
        <circle cx="5.7" cy="3.5" r="1.7" fill="#1EB5E8" />
      </g>
    </svg>
  );
}

export function FlagRU({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden className="rounded-full">
      <clipPath id="fru"><circle cx="10" cy="10" r="10" /></clipPath>
      <g clipPath="url(#fru)">
        <rect width="20" height="6.7" fill="#fff" />
        <rect y="6.7" width="20" height="6.6" fill="#0039A6" />
        <rect y="13.3" width="20" height="6.7" fill="#D52B1E" />
      </g>
    </svg>
  );
}

export function FlagGB({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden className="rounded-full">
      <clipPath id="fgb"><circle cx="10" cy="10" r="10" /></clipPath>
      <g clipPath="url(#fgb)">
        <rect width="20" height="20" fill="#012169" />
        <path d="M-2 -2 L22 22 M22 -2 L-2 22" stroke="#fff" strokeWidth="4" />
        <path d="M-2 -2 L22 22 M22 -2 L-2 22" stroke="#C8102E" strokeWidth="1.6" />
        <path d="M10 -2 V22 M-2 10 H22" stroke="#fff" strokeWidth="6" />
        <path d="M10 -2 V22 M-2 10 H22" stroke="#C8102E" strokeWidth="3.4" />
      </g>
    </svg>
  );
}
