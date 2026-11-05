import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.SITE_URL ?? "https://shohnoma.uz").replace(/\/$/, "");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/kabinet", "/admin", "/buyurtma", "/api", "/kirish", "/files"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
