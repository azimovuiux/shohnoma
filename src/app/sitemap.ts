import type { MetadataRoute } from "next";
import { builtinTemplates as templates } from "@/lib/templates";
import { CARD_DESIGNS } from "@/lib/cards";

export const dynamic = "force-static";

/** Har bir sahifa uch tilda (uz, ru, en) — hreflang bilan */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.SITE_URL ?? "https://shohnoma.uz").replace(/\/$/, "");
  const now = new Date();
  const pages: { path: string; freq: "weekly" | "monthly" | "yearly"; priority: number }[] = [
    { path: "/", freq: "weekly", priority: 1 },
    { path: "/shablonlar/", freq: "weekly", priority: 0.9 },
    ...templates.map((t) => ({ path: `/shablonlar/${t.slug}/`, freq: "monthly" as const, priority: 0.8 })),
    { path: "/vizitka/", freq: "weekly", priority: 0.8 },
    ...CARD_DESIGNS.filter((d) => d.active).map((d) => ({ path: `/vizitka/${d.slug}/`, freq: "monthly" as const, priority: 0.7 })),
    { path: "/maxsus-dizayn/", freq: "monthly", priority: 0.6 },
    { path: "/aloqa/", freq: "monthly", priority: 0.5 },
    { path: "/shartlar/", freq: "yearly", priority: 0.2 },
    { path: "/maxfiylik/", freq: "yearly", priority: 0.2 },
  ];
  const href = (lang: "" | "/ru" | "/en", path: string) => `${base}${lang}${path}`;
  return pages.flatMap((p) =>
    (["", "/ru", "/en"] as const).map((lang) => ({
      url: href(lang, p.path),
      lastModified: now,
      changeFrequency: p.freq,
      priority: lang ? Math.round(p.priority * 0.9 * 10) / 10 : p.priority,
      alternates: { languages: { uz: href("", p.path), ru: href("/ru", p.path), en: href("/en", p.path), "x-default": href("", p.path) } },
    })),
  );
}
