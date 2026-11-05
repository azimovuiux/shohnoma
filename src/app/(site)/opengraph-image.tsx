import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { star8Path } from "@/lib/ornament";

export const runtime = "nodejs";
export const alt = "Shohnoma — to‘yingiz uchun shohona taklifnoma sayti";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const font = (pkg: string, file: string) => readFile(path.join(process.cwd(), "node_modules", "@fontsource", pkg, "files", file));

export default async function OgImage() {
  const [light, italic, semibold, inter] = await Promise.all([
    font("cormorant-garamond", "cormorant-garamond-latin-300-normal.woff"),
    font("cormorant-garamond", "cormorant-garamond-latin-300-italic.woff"),
    font("cormorant-garamond", "cormorant-garamond-latin-600-normal.woff"),
    font("inter", "inter-latin-500-normal.woff"),
  ]);
  const star = (r: number) => `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r * 2} ${r * 2}"><path d="${star8Path(r, r, r - 1)}" fill="none" stroke="#AD7F3C" stroke-opacity="0.45"/><path d="${star8Path(r, r, r * 0.82)}" fill="none" stroke="#AD7F3C" stroke-opacity="0.25"/></svg>`,
  )}`;
  const solid = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path d="${star8Path(20, 20, 20)}" fill="#AD7F3C"/></svg>`)}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#FFFDF9", position: "relative", fontFamily: "Cormorant" }}>
        <div style={{ position: "absolute", right: -40, top: 40, width: 560, height: 700, borderRadius: "280px 280px 0 0", background: "linear-gradient(180deg, #7A2335, #5A1828)", display: "flex" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={star(150)} width={300} height={300} style={{ position: "absolute", right: 90, top: 150, opacity: 0.9 }} alt="" />
        <div style={{ display: "flex", flexDirection: "column", padding: "72px 80px", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={solid} width={30} height={30} alt="" />
            <span style={{ fontSize: 40, fontWeight: 600, color: "#1B1813", letterSpacing: 1 }}>Shohnoma</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 78, fontWeight: 300, color: "#1B1813", lineHeight: 1 }}>To‘yingiz uchun</span>
            <span style={{ fontSize: 150, fontWeight: 300, fontStyle: "italic", color: "#6B2436", lineHeight: 0.95 }}>shohona</span>
            <span style={{ fontSize: 78, fontWeight: 300, color: "#1B1813", lineHeight: 1 }}>taklifnoma sayti</span>
          </div>
          <span style={{ fontFamily: "Inter", fontSize: 24, color: "#7A7265" }}>Nikoh · Fotiha · Sunnat to‘yi · Tug‘ilgan kun — shohnoma.uz</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Cormorant", data: light, weight: 300, style: "normal" },
        { name: "Cormorant", data: italic, weight: 300, style: "italic" },
        { name: "Cormorant", data: semibold, weight: 600, style: "normal" },
        { name: "Inter", data: inter, weight: 500, style: "normal" },
      ],
    },
  );
}
