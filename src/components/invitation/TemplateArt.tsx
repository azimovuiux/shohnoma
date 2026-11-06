/**
 * Shablon bezaklari — Figma "Assets" (32:138) rasmlari. Har bir shablon hero'si uchun joylashuv
 * konteynerga nisbatan foizda (telefon mokapi, laptop ko‘rinishi va mehmon sayti hero'sida bir xil ishlaydi).
 */
import type { CSSProperties } from "react";

type Piece = { src: string; style: CSSProperties; flip?: boolean; rotate?: number; cover?: boolean };

/** Generik dizayn bezaklari (slug bo‘yicha). Hozircha bo‘sh — har bir yangi shablon o‘z komponentiga ega */
const art: Record<string, { phone: Piece[]; desktop: Piece[] }> = {};

export const hasTemplateArt = (slug: string) => slug in art;

export function TemplateArt({ slug, variant = "phone" }: { slug: string; variant?: "phone" | "desktop" }) {
  const pieces = art[slug]?.[variant];
  if (!pieces) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => {
        const transform = [p.flip ? "scaleX(-1)" : "", p.rotate ? `rotate(${p.rotate}deg)` : ""].filter(Boolean).join(" ") || undefined;
        return p.cover ? (
          <div key={i} className="absolute bg-cover bg-center" style={{ ...p.style, backgroundImage: `url(${p.src})`, transform }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={p.src} alt="" loading="lazy" draggable={false} className="absolute h-auto select-none" style={{ ...p.style, transform }} />
        );
      })}
    </div>
  );
}
