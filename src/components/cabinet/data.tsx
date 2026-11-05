"use client";

/**
 * Kabinet sahifalari uchun ma’lumot (statik eksport, PHP API).
 * /kabinet/t/<id>/... — id URL'dan o‘qiladi (Apache /kabinet/t/_/... qobig‘ini beradi).
 */
import Link from "next/link";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ArrowLeft } from "@/components/icons";
import { PageLoading, useApi, useConfig, useRequireUser, useRouteParam } from "@/lib/client";
import type { Guest, Invitation, Order, Payment, Stats } from "@/lib/types";

export const providerLabel: Record<string, string> = { payme: "Payme", click: "Click", google_pay: "Google Pay", p2p: "P2P o‘tkazma" };

/** Sayt manzili (havolalar uchun): API config → brauzer manzili */
export function useSiteUrl() {
  const { data } = useConfig();
  const [origin, setOrigin] = useState("https://shohnoma.uz");
  useEffect(() => setOrigin(window.location.origin), []);
  return (data?.siteUrl || origin).replace(/\/$/, "");
}

export type SwitcherItem = { id: string; names?: string; personA?: string; personB?: string | null; date: string; status: string; templateSlug: string; venueName?: string };

export type InvitationBundle = {
  order: Order;
  invitation: Invitation;
  stats: Stats;
  recent: Guest[];
  payments: Payment[];
  switcher: SwitcherItem[];
};

const InvCtx = createContext<{ data: InvitationBundle; reload: (silent?: boolean) => Promise<void> } | null>(null);

export function useInvitationData() {
  const v = useContext(InvCtx);
  if (!v) throw new Error("InvitationProvider yo‘q");
  return v;
}

export function NotFoundBox({ text = "Taklifnoma topilmadi" }: { text?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-line px-6 py-16 text-center">
      <p className="font-serif text-[30px] font-light text-ink">{text}</p>
      <p className="t-body-m max-w-[380px] text-ink-2">Havola noto‘g‘ri yoki bu taklifnoma boshqa akkauntga tegishli.</p>
      <Link href="/kabinet/" className="btn btn-primary">
        <ArrowLeft size={16} /> Buyurtmalarim
      </Link>
    </div>
  );
}

/** Taklifnoma ichidagi sahifalar uchun: kirishni tekshiradi, /api/invitations/:id ni bir marta yuklaydi */
export function InvitationProvider({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const { user, loading: authLoading } = useRequireUser();
  const { value: id, ready } = useRouteParam("t");
  const { data, error, loading, reload } = useApi<InvitationBundle & { ok: boolean }>(user && id ? `/api/invitations/${encodeURIComponent(id)}` : null);

  if (authLoading || !ready || (id && loading && !data)) return <PageLoading />;
  if (!id || error || !data) return <>{fallback ?? <NotFoundBox />}</>;
  return <InvCtx.Provider value={{ data, reload }}>{children}</InvCtx.Provider>;
}

export const invTitle = (inv: Pick<Invitation, "personA" | "personB">) => [inv.personA, inv.personB].filter(Boolean).join(" & ") || "Yangi taklifnoma";

/** ISO UTC → "12.09.2026" (Toshkent) */
export function dayTk(iso: string | null | undefined) {
  if (!iso) return "";
  const t = new Date(new Date(iso).getTime() + 5 * 3600_000).toISOString();
  return `${t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)}`;
}
/** ISO UTC → "12.09.2026, 18:00" (Toshkent) */
export function dateTimeTk(iso: string | null | undefined) {
  if (!iso) return "";
  const t = new Date(new Date(iso).getTime() + 5 * 3600_000).toISOString();
  return `${t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)}, ${t.slice(11, 16)}`;
}
