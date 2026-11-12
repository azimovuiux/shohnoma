import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.SITE_URL ?? "https://shohnoma.uz").replace(/\/$/, "");
  return {
    // shaxsiy sahifalar — uchala tilda ham (ru/en nusxalari /ru/..., /en/... da)
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api", "/admin", "/files", ...["", "/ru", "/en"].flatMap((l) => [`${l}/kabinet`, `${l}/buyurtma`, `${l}/kirish`])],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
