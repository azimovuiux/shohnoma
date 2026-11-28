// Vizitka ulashish rasmlari (1200×630) → public/og/
//   vizitka.png        — /vizitka/ katalogi (ikki dizayn portreti + «Ism — lavozim» namunasi)
//   <dizayn>.png       — php/card.php zaxira rasmi: mijoz portreti yo‘q bo‘lsa (shaxssiz, faqat dizayn ranglari)
// Mijoz vizitkasining asosiy og:image — uning o‘z portreti, og:title — «Ism — lavozim» (php/card.php).
// Ishga tushirish: node --experimental-strip-types scripts/og-vizitka.mts (natija commit qilinadi; build’ga kirmaydi)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createElement as h, type ReactElement } from "react";
import { ImageResponse } from "next/og.js";
import sharp from "sharp";
import { CARD_DESIGNS, CARD_DEMO } from "../src/lib/cards.ts";
import { loc } from "../src/lib/cardTypes.ts";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "public", "og");
mkdirSync(out, { recursive: true });

const font = (pkg: string, file: string) => readFileSync(path.join(root, "node_modules", "@fontsource", pkg, "files", file));
const fonts = [
  { name: "Serif", data: font("instrument-serif", "instrument-serif-latin-400-normal.woff"), weight: 400 as const, style: "normal" as const },
  { name: "Serif", data: font("instrument-serif", "instrument-serif-latin-400-italic.woff"), weight: 400 as const, style: "italic" as const },
  { name: "Sans", data: font("instrument-sans", "instrument-sans-latin-500-normal.woff"), weight: 500 as const, style: "normal" as const },
];
/** webp → jpeg data URL (satori webp o‘qimaydi) */
const jpeg = async (file: string, w: number, hgt: number) =>
  `data:image/jpeg;base64,${(await sharp(path.join(root, "public", file)).resize(w, hgt, { fit: "cover", position: "top" }).jpeg({ quality: 86 }).toBuffer()).toString("base64")}`;
const logo = `data:image/svg+xml;base64,${readFileSync(path.join(root, "public", "logo.svg")).toString("base64")}`;

const save = async (name: string, el: ReactElement) => {
  const res = new ImageResponse(el, { width: 1200, height: 630, fonts });
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(path.join(out, name), buf);
  console.log(`og/${name} ${(buf.length / 1024).toFixed(0)} KB`);
};

/* ── Katalog: krem fon, chapda matn, o‘ngda ikki portret-karta ── */
const [noir, lumen] = CARD_DESIGNS;
const card = async (slug: string, dark: boolean, bg: string, x: number, y: number, rot: number) => {
  const c = CARD_DEMO[slug as keyof typeof CARD_DEMO];
  const img = await jpeg(`/vizitka/${slug.replace(/^v-/, "")}/portret.webp`, 300, 330);
  return h(
    "div",
    { style: { position: "absolute", left: x, top: y, width: 300, height: 450, display: "flex", flexDirection: "column", borderRadius: 26, overflow: "hidden", background: bg, transform: `rotate(${rot}deg)`, boxShadow: "0 30px 60px -30px rgba(38,20,10,0.55)" } },
    h("img", { src: img, width: 300, height: 330, style: { objectFit: "cover" } }),
    h(
      "div",
      { style: { display: "flex", flexDirection: "column", padding: "16px 20px", color: dark ? "#F2EDE4" : "#2A211C" } },
      h("span", { style: { fontFamily: "Serif", fontSize: 34, lineHeight: 1 } }, c.fullName),
      h("span", { style: { fontFamily: "Sans", fontSize: 15, marginTop: 8, opacity: 0.7 } }, loc(c.position, "uz")),
    ),
  );
};
await save(
  "vizitka.png",
  h(
    "div",
    { style: { width: "100%", height: "100%", display: "flex", position: "relative", background: "#F7F1E7", fontFamily: "Serif" } },
    h("div", { style: { position: "absolute", left: 640, top: 70, width: 500, height: 520, borderRadius: "250px 250px 32px 32px", background: "#F1E6D1", display: "flex" } }),
    await card(noir.slug, true, noir.palette[0], 650, 92, -5),
    await card(lumen.slug, false, "#FFFFFF", 850, 132, 5),
    h("img", { src: logo, width: 207, height: 50, style: { position: "absolute", left: 80, top: 64 } }),
    h(
      "div",
      { style: { position: "absolute", left: 80, top: 190, display: "flex", flexDirection: "column", letterSpacing: "-0.02em" } },
      h("span", { style: { fontSize: 84, lineHeight: 0.98, color: "#1B1813" } }, "Raqamli vizitka —"),
      h("span", { style: { fontSize: 84, lineHeight: 1.05, color: "#6B2436", fontStyle: "italic" } }, "bitta havolada"),
    ),
    h("span", { style: { position: "absolute", left: 80, top: 420, width: 500, fontFamily: "Sans", fontSize: 24, lineHeight: 1.4, color: "#6E6458" } }, "QR kod · kontaktni saqlash · uch til"),
    h("span", { style: { position: "absolute", left: 80, top: 500, fontFamily: "Sans", fontSize: 22, color: "#6B2436" } }, "shohnoma.uz/vizitka"),
  ),
);

/* ── Dizayn zaxira rasmi (portretsiz): dizayn ranglari, ramka, «Vizitka» ── */
for (const d of CARD_DESIGNS) {
  const [bg, bg2, accent, ink] = d.palette;
  await save(
    `${d.slug}.png`,
    h(
      "div",
      { style: { width: "100%", height: "100%", display: "flex", position: "relative", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${bg}, ${bg2})`, fontFamily: "Serif" } },
      h("div", { style: { position: "absolute", top: 36, left: 36, right: 36, bottom: 36, border: `1.5px solid ${accent}`, opacity: 0.6, borderRadius: 24, display: "flex" } }),
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: d.dark ? ink : "#2A211C" } },
        h("span", { style: { fontFamily: "Sans", fontSize: 22, letterSpacing: 8, color: accent } }, "RAQAMLI VIZITKA"),
        h("span", { style: { fontSize: 120, lineHeight: 1.05, marginTop: 18, fontStyle: "italic" } }, "Kontaktni saqlang"),
        h("span", { style: { fontFamily: "Sans", fontSize: 24, marginTop: 30, opacity: 0.7 } }, "shohnoma.uz"),
      ),
    ),
  );
}
