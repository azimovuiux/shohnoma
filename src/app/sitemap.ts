import type { MetadataRoute } from "next";
import { builtinTemplates as templates } from "@/lib/templates";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.SITE_URL ?? "https://shohnoma.uz").replace(/\/$/, "");
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/shablonlar/`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    ...templates.map((t) => ({ url: `${base}/shablonlar/${t.slug}/`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: `${base}/maxsus-dizayn/`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/shartlar/`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/maxfiylik/`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
