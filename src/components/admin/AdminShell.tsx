"use client";

import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ding, primeAudio } from "@/lib/ding";
import { ExportSquare, LogoutCurve } from "@/components/icons";
import { PageLoading, useApi, useRequireUser } from "@/lib/client";
import { formatPhoneDisplay } from "@/lib/display";
import { AdminNav } from "./AdminNav";

type Counts = { ok: boolean; pendingP2p: number; newBriefs: number; newLeads: number; unreadChats?: number };
const CountsCtx = createContext<() => void>(() => {});
/** Tab hisoblagichlarini yangilash (mutatsiyadan keyin) */
export const useReloadCounts = () => useContext(CountsCtx);

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, loading } = useRequireUser(true);
  const counts = useApi<Counts>(user ? "/api/admin/counts" : null);
  const path = usePathname();
  const prevUnread = useRef<number | null>(null);
  useEffect(() => primeAudio(), []);
  // Hisoblagichlar har 15 soniyada yangilanadi; yangi chat xabari kelsa — ovoz (Chatlar sahifasida u o‘zi chaladi)
  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => !document.hidden && counts.reload(true), 15000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  useEffect(() => {
    const n = counts.data?.unreadChats;
    if (n === undefined) return;
    if (prevUnread.current !== null && n > prevUnread.current && !path.startsWith("/admin/chatlar")) ding();
    prevUnread.current = n;
  }, [counts.data?.unreadChats, path]);
  if (loading || !user) return <PageLoading className="min-h-dvh" />;
  const c = counts.data;
  return (
    <CountsCtx.Provider value={() => counts.reload(true)}>
      <div className="min-h-dvh bg-bg-base">
        <header className="sticky top-0 z-30 border-b border-line bg-bg-base/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-1 px-5 pt-3 lg:px-10">
            <div className="flex items-center justify-between gap-4">
              <Link href="/admin/" className="inline-flex items-center gap-2 text-ink">
                <LogoMark className="h-8 w-auto" />
                <span className="rounded-full bg-bg-soft px-2 py-0.5 t-body-s text-ink-2">admin</span>
              </Link>
              <div className="flex items-center gap-3 t-body-s text-ink-2 sm:gap-4">
                <span className="hidden sm:inline">{user.name || formatPhoneDisplay(user.phone) || user.telegramUser}</span>
                <Link href="/" aria-label="Saytga qaytish" className="inline-flex items-center gap-1.5 t-nav text-ink hover:text-maroon">
                  <span className="hidden sm:inline">Saytga qaytish</span> <ExportSquare size={15} />
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" });
                    window.location.replace("/kirish/admin/");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 t-nav text-ink transition-colors hover:border-maroon hover:text-maroon"
                >
                  <LogoutCurve size={15} /> Chiqish
                </button>
              </div>
            </div>
            <AdminNav counts={{ p2p: c?.pendingP2p ?? 0, briefs: c?.newBriefs ?? 0, leads: c?.newLeads ?? 0, chats: c?.unreadChats ?? 0 }} />
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10">{children}</main>
      </div>
    </CountsCtx.Provider>
  );
}
