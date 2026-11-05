// Har bir shablon uchun ulashish rasmi (1200×630) → public/og/<slug>.png
// php/invite.php mehmon taklifnomasi uchun og:image sifatida shu rasmni beradi.
// Ishga tushirish: node --experimental-strip-types scripts/og.mts (npm run build ichida)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createElement as h, type ReactElement } from "react";
import { ImageResponse } from "next/og.js";
import { templates } from "../src/lib/templates.ts";
import { star8Path } from "../src/lib/ornament.ts";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "public", "og");
mkdirSync(out, { recursive: true });

const font = (pkg: string, file: string) => {
  try {
    return readFileSync(path.join(root, "node_modules", "@fontsource", pkg, "files", file));
  } catch {
    return null;
  }
};
const fonts = [
  { name: "Cormorant", data: font("cormorant-garamond", "cormorant-garamond-latin-300-normal.woff"), weight: 300 as const, style: "normal" as const },
  { name: "Cormorant", data: font("cormorant-garamond", "cormorant-garamond-latin-300-italic.woff"), weight: 300 as const, style: "italic" as const },
  { name: "Pinyon", data: font("pinyon-script", "pinyon-script-latin-400-normal.woff"), weight: 400 as const, style: "normal" as const },
  { name: "Cinzel", data: font("cinzel", "cinzel-latin-400-normal.woff"), weight: 400 as const, style: "normal" as const },
  { name: "Inter", data: font("inter", "inter-latin-500-normal.woff"), weight: 500 as const, style: "normal" as const },
].filter((f) => f.data) as { name: string; data: Buffer; weight: 300 | 400 | 500; style: "normal" | "italic" }[];
const has = (n: string) => fonts.some((f) => f.name === n);

const ceremonyLabel: Record<string, string> = {
  nikoh: "Nikoh to‘yi",
  fotiha: "Fotiha to‘yi",
  sunnat: "Sunnat to‘yi",
  "tugilgan-kun": "Tug‘ilgan kun",
};

const starUri = (color: string, r: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${star8Path(50, 50, r)}" fill="none" stroke="${color}" stroke-width="1.2"/></svg>`,
  )}`;

for (const t of templates) {
  const th = t.theme;
  const script = th.script === "pinyon" && has("Pinyon") ? "Pinyon" : th.script === "cinzel" && has("Cinzel") ? "Cinzel" : "Cormorant";
  const el: ReactElement = h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${th.bg[0]}, ${th.bg[1]})`,
        fontFamily: has("Cormorant") ? "Cormorant" : undefined,
      },
    },
    h("div", { style: { position: "absolute", top: 28, left: 28, right: 28, bottom: 28, border: `2px solid ${th.accent}`, opacity: 0.5, display: "flex" } }),
    h("div", { style: { position: "absolute", top: 38, left: 38, right: 38, bottom: 38, border: `1px solid ${th.accent}`, opacity: 0.3, display: "flex" } }),
    h("img", { src: starUri(th.accent, 46), width: 120, height: 120, style: { position: "absolute", top: 70, left: 80, opacity: 0.7 } }),
    h("img", { src: starUri(th.accent, 46), width: 120, height: 120, style: { position: "absolute", bottom: 70, right: 80, opacity: 0.7 } }),
    h(
      "div",
      { style: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" } },
      h("div", { style: { fontSize: 40, fontStyle: "italic", color: th.soft, display: "flex" } }, ceremonyLabel[t.ceremony] ?? "Marosim"),
      h(
        "div",
        { style: { fontFamily: script, fontSize: script === "Cinzel" ? 88 : 130, color: th.accent, lineHeight: 1.15, marginTop: 6, display: "flex" } },
        "Taklifnoma",
      ),
      h(
        "div",
        { style: { fontFamily: has("Inter") ? "Inter" : undefined, fontSize: 24, letterSpacing: 6, color: th.ink, opacity: 0.75, marginTop: 34, display: "flex" } },
        "SIZNI KUTAMIZ  ·  SHOHNOMA.UZ",
      ),
    ),
  );
  const res = new ImageResponse(el, { width: 1200, height: 630, fonts });
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(path.join(out, `${t.slug}.png`), buf);
  console.log(`og/${t.slug}.png ${(buf.length / 1024).toFixed(0)} KB`);
}
