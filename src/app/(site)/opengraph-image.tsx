import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-static";
export const alt = "Shohnoma — har bir to‘y o‘z hikoyasi, taklifnomasi ham";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const root = process.cwd();
const font = (pkg: string, file: string) => readFile(path.join(root, "node_modules", "@fontsource", pkg, "files", file));
const dataUrl = async (file: string, mime: string) => `data:${mime};base64,${(await readFile(path.join(root, file))).toString("base64")}`;

/** Bosh sahifa OG — hero uslubida: krem fon, Instrument Serif, ravoq ichida kelin-kuyov surati va gul shoxchasi */
export default async function OgImage() {
  const [serif, serifItalic, sans, couple, bouquet, logo] = await Promise.all([
    font("instrument-serif", "instrument-serif-latin-400-normal.woff"),
    font("instrument-serif", "instrument-serif-latin-400-italic.woff"),
    font("instrument-sans", "instrument-sans-latin-500-normal.woff"),
    dataUrl("src/og-assets/couple.jpg", "image/jpeg"),
    dataUrl("src/og-assets/bouquet.png", "image/png"),
    dataUrl("public/logo.svg", "image/svg+xml"),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#F7F1E7", position: "relative", fontFamily: "Instrument Serif" }}>
        {/* Ravoq: ingichka oltin ramka + surat */}
        <div style={{ position: "absolute", left: 696, top: 46, width: 440, height: 620, borderRadius: "220px 220px 0 0", border: "1.5px solid rgba(173,127,60,0.55)", display: "flex" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={couple} width={440} height={590} alt="" style={{ position: "absolute", left: 712, top: 62, borderRadius: "220px 220px 0 0", objectFit: "cover" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bouquet} width={560} height={315} alt="" style={{ position: "absolute", left: 560, top: 400, transform: "rotate(-6deg)" }} />

        <div style={{ position: "absolute", left: 80, top: 64, display: "flex" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={207} height={50} alt="" />
        </div>
        <div style={{ position: "absolute", left: 80, top: 176, display: "flex", flexDirection: "column", letterSpacing: "-0.02em" }}>
          <span style={{ fontSize: 84, lineHeight: 0.95, color: "#1B1813" }}>Har bir to‘y —</span>
          <span style={{ fontSize: 84, lineHeight: 0.95, color: "#1B1813" }}>o‘z hikoyasi.</span>
          <span style={{ fontSize: 84, lineHeight: 1.05, color: "#6B2436", fontStyle: "italic" }}>Taklifnomasi ham.</span>
        </div>
        <span style={{ position: "absolute", left: 80, top: 476, fontFamily: "Instrument Sans", fontSize: 24, color: "#6E6458" }}>
          Taklifnoma sayti — 2 daqiqada · shohnoma.uz
        </span>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Instrument Serif", data: serif, weight: 400, style: "normal" },
        { name: "Instrument Serif", data: serifItalic, weight: 400, style: "italic" },
        { name: "Instrument Sans", data: sans, weight: 500, style: "normal" },
      ],
    },
  );
}
