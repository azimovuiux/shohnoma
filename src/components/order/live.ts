import type { Template } from "@/lib/templates";
import type { FlowOrder } from "./types";

/** Mokap uchun: shablon namunasini forma ma’lumotlari bilan almashtirish */
export function liveTemplate(t: Template, o: Pick<FlowOrder, "personA" | "personB" | "day" | "time" | "venueName" | "ceremony">): Template {
  const [y, m, d] = (o.day || "").split("-");
  return {
    ...t,
    isLive: true,
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
