/**
 * Brauzerda vCard 3.0 (.vcf) — faqat namuna va buyurtma preview uchun (haqiqiy vizitkada server /api/c/<slug>/vcard beradi).
 */
import { loc, type CardContent, type CardLang } from "@/lib/cardTypes";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

export function buildVcard(c: CardContent, lang: CardLang, url?: string): string {
  const [first = "", ...rest] = c.fullName.trim().split(/\s+/);
  const last = rest.join(" ");
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:${esc(last)};${esc(first)};;;`, `FN:${esc(c.fullName)}`];
  const org = loc(c.company, lang);
  const title = loc(c.position, lang);
  if (org) lines.push(`ORG:${esc(org)}`);
  if (title) lines.push(`TITLE:${esc(title)}`);
  if (c.phone) lines.push(`TEL;TYPE=CELL:${c.phone}`);
  if (c.email) lines.push(`EMAIL;TYPE=INTERNET:${c.email}`);
  if (c.website) lines.push(`URL:${c.website}`);
  if (url) lines.push(`URL:${url}`);
  const addr = loc(c.address, lang);
  if (addr) lines.push(`ADR;TYPE=WORK:;;${esc(addr)};;;;`);
  const bio = loc(c.bio, lang);
  if (bio) lines.push(`NOTE:${esc(bio)}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

export function downloadVcard(c: CardContent, lang: CardLang, url?: string) {
  const blob = new Blob([buildVcard(c, lang, url)], { type: "text/vcard;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href, download: `${(c.fullName || "kontakt").replace(/[^\p{L}\p{N}]+/gu, "-")}.vcf` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1500);
}

/** Server .vcf manzilini yuklab olish (sahifadan chiqmasdan) */
export function downloadUrl(href: string) {
  const a = Object.assign(document.createElement("a"), { href, download: "" });
  document.body.appendChild(a);
  a.click();
  a.remove();
}
