import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPublicInvitation } from "@/server/invitations";
import { getTemplate, ceremonyLabel, type Ceremony } from "@/lib/templates";
import { splitDate } from "@/lib/display";

export const runtime = "nodejs";
export const alt = "Taklifnoma";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fontDir = (pkg: string) => path.join(process.cwd(), "node_modules", "@fontsource", pkg, "files");

async function loadFont(pkg: string, file: string) {
  try {
    return await readFile(path.join(fontDir(pkg), file));
  } catch {
    return null;
  }
}

/** 8 burchakli yulduz (SVG yo‘li) */
function star(cx: number, cy: number, r: number) {
  let d = "";
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI / 8) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.72 : r;
    d += `${i ? "L" : "M"}${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)} `;
  }
  return d + "Z";
}

function luminance(hex: string) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const row = /^[a-z0-9-]{2,80}$/.test(slug) ? await getPublicInvitation(slug).catch(() => null) : null;
  const t = row ? getTemplate(row.order.templateSlug) : getTemplate("bordo-maktub");
  const th = t!.theme;
  const inv = row?.invitation;
  const names = inv ? [inv.personA, inv.personB].filter(Boolean).join(" & ") : "Shohnoma";
  const sd = inv ? splitDate(inv.date) : null;
  const dark = luminance(th.bg[0]) < 128;
  const ink = th.ink;
  const accent = th.accent;

  const [pinyon, pinyonExt, cinzel, cormorant, cormorantExt, inter] = await Promise.all([
    loadFont("pinyon-script", "pinyon-script-latin-400-normal.woff"),
    loadFont("pinyon-script", "pinyon-script-latin-ext-400-normal.woff"),
    loadFont("cinzel", "cinzel-latin-400-normal.woff"),
    loadFont("cormorant-garamond", "cormorant-garamond-latin-400-italic.woff"),
    loadFont("cormorant-garamond", "cormorant-garamond-latin-ext-400-italic.woff"),
    loadFont("inter", "inter-latin-400-normal.woff"),
  ]);
  const fonts = [
    pinyon && { name: "Pinyon", data: pinyon, weight: 400 as const, style: "normal" as const },
    pinyonExt && { name: "Pinyon", data: pinyonExt, weight: 400 as const, style: "normal" as const },
    cinzel && { name: "Cinzel", data: cinzel, weight: 400 as const, style: "normal" as const },
    cormorant && { name: "Cormorant", data: cormorant, weight: 400 as const, style: "italic" as const },
    cormorantExt && { name: "Cormorant", data: cormorantExt, weight: 400 as const, style: "italic" as const },
    inter && { name: "Inter", data: inter, weight: 400 as const, style: "normal" as const },
  ].filter(Boolean) as { name: string; data: Buffer; weight: 400; style: "normal" | "italic" }[];

  const scriptFont = th.script === "cinzel" ? "Cinzel" : th.script === "cormorant" ? "Cormorant" : "Pinyon";
  const ceremony = inv ? ceremonyLabel[inv.ceremony as Ceremony] ?? "Taklifnoma" : "Taklifnoma";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${th.bg[0]}, ${th.bg[1]})`,
          position: "relative",
          fontFamily: "Inter",
        }}
      >
        <div style={{ position: "absolute", top: 28, left: 28, right: 28, bottom: 28, border: `2px solid ${accent}`, opacity: 0.55, display: "flex" }} />
        <div style={{ position: "absolute", top: 40, left: 40, right: 40, bottom: 40, border: `1px solid ${accent}`, opacity: 0.3, display: "flex" }} />
        <svg width="70" height="70" viewBox="0 0 80 80" style={{ position: "absolute", top: 70, left: 80 }}>
          <path d={star(40, 40, 36)} fill="none" stroke={accent} strokeWidth="2" />
        </svg>
        <svg width="70" height="70" viewBox="0 0 80 80" style={{ position: "absolute", bottom: 70, right: 80 }}>
          <path d={star(40, 40, 36)} fill="none" stroke={accent} strokeWidth="2" />
        </svg>
        <div style={{ fontFamily: "Cormorant", fontStyle: "italic", fontSize: 40, color: dark ? th.soft : th.soft, display: "flex" }}>{ceremony}</div>
        <div
          style={{
            fontFamily: scriptFont,
            fontSize: scriptFont === "Cinzel" ? 86 : names.length > 18 ? 110 : 130,
            color: accent,
            lineHeight: 1.15,
            marginTop: 6,
            textAlign: "center",
            maxWidth: 1040,
            display: "flex",
            letterSpacing: scriptFont === "Cinzel" ? 4 : 0,
          }}
        >
          {names}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 22 }}>
          <div style={{ width: 90, height: 2, background: accent, opacity: 0.6, display: "flex" }} />
          <svg width="20" height="20" viewBox="0 0 40 40">
            <path d={star(20, 20, 20)} fill={accent} />
          </svg>
          <div style={{ width: 90, height: 2, background: accent, opacity: 0.6, display: "flex" }} />
        </div>
        {sd && <div style={{ fontFamily: "Cinzel", fontSize: 40, color: ink, letterSpacing: 6, marginTop: 26, display: "flex" }}>{sd.long}</div>}
        {inv?.venueName && (
          <div style={{ fontSize: 28, color: ink, opacity: 0.75, marginTop: 14, display: "flex" }}>
            {[inv.venueName, sd?.time].filter(Boolean).join("  ·  ")}
          </div>
        )}
        <div style={{ position: "absolute", bottom: 56, fontSize: 20, color: ink, opacity: 0.5, letterSpacing: 3, display: "flex" }}>shohnoma.uz</div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
