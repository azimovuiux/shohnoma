import type { NextConfig } from "next";

/**
 * Statik eksport: `npm run build` → out/ (HTML/JS/CSS). Server qismi — PHP (php/api).
 * Plesk hostingida Node.js shart emas. Yig‘ish: scripts/assemble.sh → dist/ → `deploy` branch.
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
