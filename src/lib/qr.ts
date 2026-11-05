"use client";

/** QR kod brauzerda yaratiladi (server endpointi yo‘q) — `qrcode` paketi. */
import QRCode from "qrcode";

const opts = { margin: 2, color: { dark: "#1B1813", light: "#FFFFFF" } };

export async function qrDataUrl(text: string, width = 1024) {
  return QRCode.toDataURL(text, { ...opts, width });
}

export async function qrSvg(text: string) {
  return QRCode.toString(text, { ...opts, type: "svg" });
}

function save(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** QR kodni PNG yoki SVG fayl sifatida yuklab olish */
export async function downloadQr(text: string, format: "png" | "svg", name: string) {
  if (format === "png") {
    save(await qrDataUrl(text), `${name}.png`);
    return;
  }
  const blob = new Blob([await qrSvg(text)], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  save(url, `${name}.svg`);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
