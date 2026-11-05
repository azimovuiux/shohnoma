import type { Template } from "@/lib/templates";

/** 360px (Figma mobil) asosidagi o‘lchamni konteyner kengligiga moslash, 1.2 baravardan oshirmasdan */
export const s = (px: number) => `min(${+(px * 1.2).toFixed(2)}px, ${+((px / 360) * 100).toFixed(3)}cqw)`;

export type HeroVariant = "envelope" | "arch" | "seal" | "ticket" | "gate" | "eastern" | "crown";

export const heroVariant: Record<string, HeroVariant> = {
  "bordo-maktub": "envelope",
  "yashil-muhr": "seal",
  "oltin-ravoq": "arch",
  "baxt-reysi": "ticket",
  "zaytun-maktub": "seal",
  qirolicha: "crown",
  "moviy-abr": "eastern",
  "sharq-oqshomi": "eastern",
  "qizil-atirgul": "arch",
  "oltin-darvoza": "gate",
  "lola-bog": "arch",
  "bahor-bogi": "arch",
};

function luminance(hex: string) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export interface Palette {
  dark: boolean;
  /** hero foni */
  heroBg: string;
  /** to‘q bo‘limlar (sanoq, javob, yakun) */
  deep: string;
  deep2: string;
  /** och "qog‘oz" bo‘limlar (dastur, manzil, galereya) */
  paper: string;
  /** qog‘oz ustidagi sarlavha */
  heading: string;
  /** qog‘oz ustidagi matn */
  text: string;
  /** to‘q fon ustidagi matn */
  onDeep: string;
  accent: string;
  /** hero ustidagi matn */
  heroInk: string;
  heroSoft: string;
  script: string;
}

export function paletteOf(t: Template): Palette {
  const th = t.theme;
  const dark = luminance(th.bg[0]) < 128;
  const script = th.script === "pinyon" ? "var(--font-script)" : th.script === "cinzel" ? "var(--font-cinzel)" : "var(--font-serif)";
  if (dark) {
    return {
      dark,
      heroBg: `linear-gradient(to bottom, ${th.bg[0]}, ${th.bg[1]})`,
      deep: th.bg[1],
      deep2: th.bg[0],
      paper: "#f5ede0",
      heading: th.bg[0],
      text: `color-mix(in srgb, ${th.bg[1]} 80%, #3a2a2a)`,
      onDeep: th.ink,
      accent: th.accent,
      heroInk: th.ink,
      heroSoft: th.soft,
      script,
    };
  }
  return {
    dark,
    heroBg: `linear-gradient(to bottom, ${th.bg[0]}, ${th.bg[1]})`,
    deep: `color-mix(in srgb, ${th.ink} 88%, black)`,
    deep2: th.ink,
    paper: th.bg[0],
    heading: th.ink,
    text: `color-mix(in srgb, ${th.ink} 82%, #2a2a2a)`,
    onDeep: th.bg[0],
    accent: th.accent,
    heroInk: th.ink,
    heroSoft: th.soft,
    script,
  };
}

/** Bosh harflar: "Jasur" + "Madina" → "JM" */
export const monogram = (a: string, b?: string | null) => `${(a || "?")[0] ?? ""}${b?.[0] ?? ""}`.toUpperCase();

export const namesOf = (a: string, b?: string | null) => (b ? `${a} & ${b}` : a);
