/**
 * Shablon bezaklari — Figma "Assets" (32:138) rasmlari. Har bir shablon hero'si uchun joylashuv
 * konteynerga nisbatan foizda (telefon mokapi, laptop ko‘rinishi va mehmon sayti hero'sida bir xil ishlaydi).
 */
import type { CSSProperties } from "react";

type Piece = { src: string; style: CSSProperties; flip?: boolean; rotate?: number; cover?: boolean };

const art: Record<string, { phone: Piece[]; desktop: Piece[] }> = {
  "oltin-ravoq": {
    phone: [
      { src: "/images/roses.webp", style: { left: "-8%", top: "2%", width: "50%" } },
      { src: "/images/roses.webp", style: { right: "-10%", top: "42%", width: "44%" }, rotate: 20, flip: true },
    ],
    desktop: [
      { src: "/images/roses.webp", style: { left: "-3%", top: "-6%", width: "26%" } },
      { src: "/images/roses.webp", style: { right: "-4%", bottom: "-8%", width: "24%" }, rotate: 160 },
    ],
  },
  "qizil-atirgul": {
    phone: [
      { src: "/images/roses-red.webp", style: { left: "-12%", top: "1%", width: "52%" } },
      { src: "/images/roses-red.webp", style: { right: "-12%", top: "44%", width: "44%" }, rotate: 150 },
    ],
    desktop: [
      { src: "/images/roses-red.webp", style: { left: "-4%", top: "-8%", width: "26%" } },
      { src: "/images/roses-red.webp", style: { right: "-4%", bottom: "-10%", width: "24%" }, rotate: 170 },
    ],
  },
  "bahor-bogi": {
    phone: [
      { src: "/images/bouquet.webp", style: { left: "-14%", top: "0%", width: "54%" } },
      { src: "/images/bouquet.webp", style: { right: "-14%", top: "40%", width: "46%" }, flip: true },
    ],
    desktop: [
      { src: "/images/bouquet.webp", style: { left: "-4%", top: "-6%", width: "25%" } },
      { src: "/images/bouquet.webp", style: { right: "-4%", bottom: "-8%", width: "23%" }, flip: true },
    ],
  },
  qirolicha: {
    phone: [{ src: "/images/roses.webp", style: { right: "-10%", top: "38%", width: "42%" }, flip: true }],
    desktop: [{ src: "/images/roses.webp", style: { right: "-3%", bottom: "-8%", width: "24%" }, flip: true }],
  },
  "lola-bog": {
    phone: [
      { src: "/images/garland.webp", style: { left: "-6%", top: "3%", width: "112%" } },
      { src: "/images/garland.webp", style: { left: "-6%", top: "46%", width: "112%" }, rotate: 180 },
    ],
    desktop: [
      { src: "/images/garland.webp", style: { left: "18%", top: "-4%", width: "64%" } },
      { src: "/images/garland.webp", style: { left: "18%", bottom: "-6%", width: "64%" }, rotate: 180 },
    ],
  },
  "zaytun-maktub": {
    phone: [{ src: "/images/lily.webp", style: { right: "-8%", top: "4%", width: "40%" } }],
    desktop: [
      { src: "/images/lily.webp", style: { right: "4%", top: "8%", width: "14%" } },
      { src: "/images/lily.webp", style: { left: "4%", bottom: "6%", width: "12%" }, rotate: 180 },
    ],
  },
  "yashil-muhr": {
    phone: [{ src: "/images/lily.webp", style: { left: "-6%", top: "6%", width: "34%" }, flip: true }],
    desktop: [{ src: "/images/lily.webp", style: { left: "5%", top: "10%", width: "13%" }, flip: true }],
  },
  "oltin-darvoza": {
    phone: [{ src: "/images/gate.webp", style: { left: "8%", top: "6%", width: "84%", opacity: 0.85 } }],
    desktop: [{ src: "/images/gate.webp", style: { left: "34%", top: "4%", width: "32%", opacity: 0.35 } }],
  },
  "moviy-abr": {
    phone: [
      { src: "/images/ikat.webp", style: { left: 0, top: 0, width: "100%", height: "9%", opacity: 0.9 }, cover: true },
      { src: "/images/ikat.webp", style: { left: 0, top: "52%", width: "100%", height: "4%", opacity: 0.9 }, cover: true },
    ],
    desktop: [
      { src: "/images/ikat.webp", style: { left: 0, top: 0, width: "100%", height: "8%", opacity: 0.9 }, cover: true },
      { src: "/images/ikat.webp", style: { left: 0, bottom: 0, width: "100%", height: "8%", opacity: 0.9 }, cover: true },
    ],
  },
  "baxt-reysi": {
    phone: [{ src: "/images/sky-plane.webp", style: { left: 0, top: 0, width: "100%", height: "58%", opacity: 0.55 }, cover: true }],
    desktop: [{ src: "/images/sky.webp", style: { left: 0, top: 0, width: "100%", height: "100%", opacity: 0.35 }, cover: true }],
  },
};

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
