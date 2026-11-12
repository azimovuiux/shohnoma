import { designSlug, type Template } from "@/lib/templates";
import type { FlowOrder } from "./types";

/** Mokap uchun: shablon namunasini forma ma’lumotlari bilan almashtirish */
export const hasCustomDesign = (t: Template) => ["anor", "zumrad", "parvoz", "shato", "savsan", "muhr", "kalit", "sayohat"].includes(designSlug(t));

export function liveTemplate(t: Template, o: Pick<FlowOrder, "personA" | "personB" | "day" | "time" | "venueName" | "ceremony"> & Partial<Pick<FlowOrder, "id" | "address" | "message" | "extra" | "program" | "photos">>): Template {
  const [y, m, d] = (o.day || "").split("-");
  // HTML shablon: server mijoz ma’lumotlari bilan chizadi; ma’lumot o‘zgarsa — manzil ham o‘zgaradi (iframe qayta yuklanadi)
  const sig = JSON.stringify([o.personA, o.personB, o.day, o.time, o.venueName, o.address, o.message, o.extra, o.program, o.photos, o.ceremony]);
  let hsh = 0;
  for (let i = 0; i < sig.length; i++) hsh = (hsh * 31 + sig.charCodeAt(i)) | 0;
  return {
    ...t,
    // Maxsus dizaynli shablon (Anor) mokapda o‘z rasmi bilan ko‘rinadi — jonli ko‘rinish «Ko‘rib chiqish»da
    isLive: !hasCustomDesign(t),
    previewUrl: t.kind === "html" && o.id ? `/api/orders/${o.id}/preview?h=${(hsh >>> 0).toString(36)}` : undefined,
    ceremony: o.ceremony,
    sample: {
      a: o.personA || t.sample.a,
      b: o.ceremony === "nikoh" || o.ceremony === "fotiha" ? o.personB || t.sample.b : undefined,
      date: y && m && d ? `${d} · ${m} · ${y}` : t.sample.date,
      venue: o.venueName || t.sample.venue,
      time: o.time || t.sample.time,
    },
  };
}

/** "2026-09-12" + "18:00" → "12.09.2026 · 18:00" */
export function dayTime(day: string, time: string) {
  const [y, m, d] = (day || "").split("-");
  const date = y && m && d ? `${d}.${m}.${y}` : "";
  return [date, time].filter(Boolean).join(" · ");
}
