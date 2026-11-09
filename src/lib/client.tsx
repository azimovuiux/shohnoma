"use client";

/**
 * Statik eksport uchun brauzer tomonidagi ma’lumot olish yordamchilari.
 * Sahifalar server komponent emas — ma’lumotni /api (PHP) dan shu hook'lar bilan oladi.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { User, Order, Invitation, Payment, Guest, Stats } from "./types";
import { currentLocale, lpath, tr } from "@/lib/i18n";

export type { User, Order, Invitation, Payment, Guest, Stats };

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", headers: { Accept: "application/json" } });
  const data = (await res.json().catch(() => ({}))) as T & { ok?: boolean; error?: string };
  if (!res.ok || data.ok === false) throw new ApiError(tr(currentLocale(), data.error || "Xatolik yuz berdi"), res.status);
  return data;
}

/** GET so‘rov: {data, error, loading, reload}. url=null bo‘lsa so‘rov yuborilmaydi. */
export function useApi<T>(url: string | null) {
  const [state, setState] = useState<{ data: T | null; error: ApiError | null; loading: boolean }>({ data: null, error: null, loading: !!url });
  const seq = useRef(0);
  const load = useCallback(
    async (silent = false) => {
      if (!url) return;
      const n = ++seq.current;
      if (!silent) setState((s) => ({ ...s, loading: true }));
      try {
        const data = await apiGet<T>(url);
        if (n === seq.current) setState({ data, error: null, loading: false });
      } catch (e) {
        if (n === seq.current) setState((s) => ({ data: silent ? s.data : null, error: e as ApiError, loading: false }));
      }
    },
    [url],
  );
  useEffect(() => {
    load();
  }, [load]);
  return { ...state, reload: load };
}

/**
 * Dinamik yo‘l parametri. Statik eksportda /buyurtma/_/marosim/ qobig‘i barcha id'lar uchun ishlatiladi
 * (.htaccess), shuning uchun haqiqiy qiymat URL'dan o‘qiladi.
 * routeParam("buyurtma") → "/buyurtma/<id>/..." dagi <id>; routeParam("t") → "/kabinet/t/<id>/..."
 */
export function routeParam(after: string): string | null {
  if (typeof window === "undefined") return null;
  const parts = window.location.pathname.split("/").filter(Boolean);
  const i = parts.indexOf(after);
  const v = i >= 0 ? parts[i + 1] : undefined;
  return v && v !== "_" ? decodeURIComponent(v) : null;
}

export function useRouteParam(after: string) {
  const [v, setV] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setV(routeParam(after));
    setReady(true);
  }, [after]);
  return { value: v, ready };
}

/** Birinchi yo‘l segmenti (mehmon taklifnomasi: /jasur-madina/) */
export function useFirstSegment() {
  const [v, setV] = useState<string | null>(null);
  useEffect(() => {
    const s = window.location.pathname.split("/").filter(Boolean)[0];
    setV(s && s !== "_" ? decodeURIComponent(s) : null);
  }, []);
  return v;
}

/* ── Joriy foydalanuvchi ── */

export type Me = { user: User | null; counts: { orders: number; favorites: number } };
const MeCtx = createContext<{ me: Me | null; loading: boolean; reload: () => Promise<void> }>({ me: null, loading: true, reload: async () => {} });

export function MeProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    try {
      const r = await apiGet<Me & { ok: boolean }>("/api/me");
      setMe({ user: r.user, counts: r.counts });
    } catch {
      setMe({ user: null, counts: { orders: 0, favorites: 0 } });
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  return <MeCtx.Provider value={{ me, loading, reload }}>{children}</MeCtx.Provider>;
}

export const useMe = () => useContext(MeCtx);

/** Kirish talab qilinadigan sahifalar: kirilmagan bo‘lsa /kirish/?next=... ga */
export function useRequireUser(admin = false) {
  const { me, loading } = useMe();
  useEffect(() => {
    if (loading || !me) return;
    if (!me.user) {
      const next = window.location.pathname + window.location.search;
      window.location.replace(admin ? `/kirish/admin/?next=${encodeURIComponent(next)}` : lpath(currentLocale(), `/kirish/?next=${encodeURIComponent(next)}`));
    } else if (admin && !me.user.isAdmin) {
      window.location.replace("/");
    }
  }, [me, loading, admin]);
  const ok = !!me?.user && (!admin || me.user.isAdmin);
  return { user: ok ? me!.user : null, loading: loading || !ok };
}

/* ── Sayt sozlamalari ── */

export type SiteConfig = {
  providers: ("payme" | "click" | "google_pay" | "p2p")[];
  p2p: { card: string; holder: string; bank: string };
  telegramBot: string | null;
  gaId?: string | null;
  sandbox: boolean;
  siteUrl: string;
};
export function useConfig() {
  return useApi<SiteConfig & { ok: boolean }>("/api/config");
}

/** Sahifa yuklanayotganda — yengil skelet */
export function PageLoading({ className = "" }: { className?: string }) {
  return (
    <div className={`flex min-h-[50vh] items-center justify-center ${className}`} aria-busy="true" aria-live="polite">
      <span className="size-8 animate-spin rounded-full border-2 border-line border-t-maroon" />
      <span className="sr-only">Yuklanmoqda…</span>
    </div>
  );
}
