import type { Metadata, Viewport } from "next";
import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import "@fontsource/instrument-serif/latin-ext-400.css";
import "@fontsource/instrument-serif/latin-ext-400-italic.css";
import "@fontsource/instrument-sans/latin-400.css";
import "@fontsource/instrument-sans/latin-500.css";
import "@fontsource/instrument-sans/latin-600.css";
import "@fontsource/instrument-sans/latin-700.css";
import "@fontsource/instrument-sans/latin-ext-400.css";
import "@fontsource/instrument-sans/latin-ext-500.css";
import "@fontsource/instrument-sans/latin-ext-600.css";
import "@fontsource/cormorant-garamond/latin-300.css";
import "@fontsource/cormorant-garamond/latin-300-italic.css";
import "@fontsource/cormorant-garamond/latin-400.css";
import "@fontsource/cormorant-garamond/latin-400-italic.css";
import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/cormorant-garamond/latin-600.css";
import "@fontsource/cormorant-garamond/latin-ext-300.css";
import "@fontsource/cormorant-garamond/latin-ext-300-italic.css";
import "@fontsource/cormorant-garamond/latin-ext-500.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-ext-400.css";
import "@fontsource/inter/latin-ext-500.css";
import "@fontsource/inter/latin-ext-600.css";
import "@fontsource/pinyon-script/latin-400.css";
import "@fontsource/cinzel/latin-400.css";
import "lenis/dist/lenis.css";
import "./globals.css";
import { ToastProvider } from "@/components/ui";
import { MeProvider } from "@/lib/client";
import { RevealObserver } from "@/components/RevealObserver";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Tracker } from "@/components/Tracker";

export const metadata: Metadata = {
  metadataBase: new URL("https://shohnoma.uz"),
  title: {
    default: "Shohnoma — to‘yingiz uchun shohona taklifnoma sayti",
    template: "%s · Shohnoma",
  },
  description:
    "Tayyor dizaynni tanlang, ma’lumotlaringizni kiriting va to‘lovdan so‘ng mehmonlarga yuboriladigan tayyor sayt havolasini oling. Nikoh, fotiha, sunnat to‘yi va tug‘ilgan kun uchun.",
  /* Tizim mavzusiga mos: yorug‘da to‘q bordo, qorong‘ida oq belgi (SVG ichida prefers-color-scheme; PNG — SVG’ni qo‘llamaydigan brauzerlar uchun) */
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon-light-32.png", sizes: "32x32", type: "image/png", media: "(prefers-color-scheme: light)" },
      { url: "/favicon-dark-32.png", sizes: "32x32", type: "image/png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    siteName: "Shohnoma",
    locale: "uz_UZ",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFDF9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js');if(/^\\/ru(\\/|$)/.test(location.pathname))document.documentElement.lang='ru'" }} />
        {/* Admin boshqaradigan shablonlar ro‘yxati — React'dan oldin yuklanadi (window.__SHOHNOMA_TEMPLATES__) */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/api/templates.js" />
      </head>
      <body className="min-h-dvh">
        <MeProvider>
          <ToastProvider>{children}</ToastProvider>
          <RevealObserver />
          <SmoothScroll />
          <Tracker />
        </MeProvider>
      </body>
    </html>
  );
}
