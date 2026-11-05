import type { Metadata, Viewport } from "next";
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

export const metadata: Metadata = {
  metadataBase: new URL("https://shohnoma.uz"),
  title: {
    default: "Shohnoma — to‘yingiz uchun shohona taklifnoma sayti",
    template: "%s · Shohnoma",
  },
  description:
    "Tayyor dizaynni tanlang, ma’lumotlaringizni kiriting va to‘lovdan so‘ng mehmonlarga yuboriladigan tayyor sayt havolasini oling. Nikoh, fotiha, sunnat to‘yi va tug‘ilgan kun uchun.",
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
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        {/* Admin boshqaradigan shablonlar ro‘yxati — React'dan oldin yuklanadi (window.__SHOHNOMA_TEMPLATES__) */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/api/templates.js" />
      </head>
      <body className="min-h-dvh">
        <MeProvider>
          <ToastProvider>{children}</ToastProvider>
          <RevealObserver />
          <SmoothScroll />
        </MeProvider>
      </body>
    </html>
  );
}
