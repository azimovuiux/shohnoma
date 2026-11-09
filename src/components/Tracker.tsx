"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** Saytga tashrif statistikasi (o‘zimizning /api/track): sahifa ochilishi + har 30 soniyada «onlayn» signal */
function visitorId() {
  try {
    let v = localStorage.getItem("sh_vid");
    if (!v || !/^[a-z0-9]{8,40}$/.test(v)) {
      v = (crypto.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 32);
      localStorage.setItem("sh_vid", v);
    }
    return v;
  } catch {
    return null;
  }
}

function send(url: string, data: unknown) {
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), keepalive: true, credentials: "same-origin" }).catch(() => {});
}

export function Tracker() {
  const path = usePathname();
  const first = useRef(true);

  useEffect(() => {
    // taklifnoma /<slug>/ umumiy qobiqdan (/_/) ochiladi — haqiqiy manzil location’da
    const real = location.pathname;
    if (!path || real.startsWith("/admin") || window.top !== window.self || navigator.webdriver) return;
    const vid = visitorId();
    if (!vid) return;
    const sp = new URLSearchParams(location.search);
    send("/api/track", {
      vid,
      path: real,
      // tashqi manba faqat saytga birinchi kirishda (keyingi o‘tishlar — sayt ichida)
      ref: first.current ? document.referrer : "",
      utm: first.current ? { source: sp.get("utm_source") ?? "", medium: sp.get("utm_medium") ?? "", campaign: sp.get("utm_campaign") ?? "" } : {},
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      lang: navigator.language,
    });
    first.current = false;
    const ping = () => document.visibilityState === "visible" && send("/api/track/ping", { vid, path: real });
    const t = window.setInterval(ping, 30000);
    document.addEventListener("visibilitychange", ping);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", ping);
    };
  }, [path]);

  return null;
}
