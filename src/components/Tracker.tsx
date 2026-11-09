"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useConfig } from "@/lib/client";

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

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Google Analytics 4 — admin sozlamalarida Measurement ID kiritilgan bo‘lsa (sahifa o‘tishlarini GA o‘zi kuzatadi) */
function loadGa(id: string) {
  if (window.gtag || !/^G-[A-Z0-9]{4,16}$/.test(id)) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", id);
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}

export function Tracker() {
  const path = usePathname();
  const first = useRef(true);
  const { data: cfg } = useConfig();
  useEffect(() => {
    if (cfg?.gaId && !location.pathname.startsWith("/admin") && window.top === window.self) loadGa(cfg.gaId);
  }, [cfg?.gaId]);

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
