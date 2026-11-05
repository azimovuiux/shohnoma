import { Gallery } from "@/components/icons";

/**
 * Rasm joyi. Figma "Assets" taxtasidagi (32:138) rasmlar eksport qilinib `public/images/` ga
 * qo‘yilgach, `src` beriladi. Hozircha — iliq bej fonli vaqtinchalik joy.
 */
export function Photo({
  src,
  alt,
  className = "",
  style,
  tone = "warm",
}: {
  src?: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  tone?: "warm" | "rose" | "cream";
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} style={style} />;
  }
  const bg = {
    warm: "linear-gradient(160deg, #e9dcc8 0%, #d9c3a5 55%, #c8ab88 100%)",
    rose: "linear-gradient(160deg, #f1e1d8 0%, #e2c4b6 60%, #cfa894 100%)",
    cream: "linear-gradient(160deg, #f6efe4 0%, #e8dccb 60%, #d8c6ad 100%)",
  }[tone];
  return (
    <div role="img" aria-label={alt} className={`flex items-center justify-center ${className}`} style={{ background: bg, ...style }}>
      <Gallery size={22} color="rgba(255,255,255,.75)" />
    </div>
  );
}
