"use client";

import { createContext, useContext, type ReactNode } from "react";

export function AdminTitle({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-serif text-[32px] font-light leading-none text-ink lg:text-[40px]">{title}</h1>
        {sub && <p className="t-body-m mt-2 text-ink-2">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function StatCard({ label, value, hint, tone = "ink" }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "ink" | "maroon" | "success" | "pending" }) {
  const color = { ink: "text-ink", maroon: "text-maroon", success: "text-success", pending: "text-pending" }[tone];
  return (
    <div className="flex flex-col gap-1.5 rounded-panel border border-line bg-bg-base p-5">
      <span className="t-body-s text-ink-2">{label}</span>
      <span className={`font-serif text-[34px] font-medium leading-none ${color}`}>{value}</span>
      {hint && <span className="t-body-s text-ink-2">{hint}</span>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-panel border border-dashed border-line bg-bg-soft px-6 py-14 text-center t-body-m text-ink-2">{children}</div>;
}

/** Toshkent vaqti bo‘yicha ko‘rsatish */
export function fmtDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  const ms = typeof d === "string" ? new Date(d).getTime() : d.getTime();
  if (isNaN(ms)) return "—";
  const t = new Date(ms + 5 * 3600_000).toISOString();
  return `${t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)} ${t.slice(11, 16)}`;
}

/** Admin sahifalarida o‘zgarishdan keyin ro‘yxat va tab hisoblagichlarini yangilash */
const RefreshCtx = createContext<() => void>(() => {});
export const AdminRefreshProvider = RefreshCtx.Provider;
export const useAdminRefresh = () => useContext(RefreshCtx);

export function AdminLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" aria-busy="true">
      <span className="size-8 animate-spin rounded-full border-2 border-line border-t-maroon" />
    </div>
  );
}

export function AdminError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-panel border border-line px-6 py-12 text-center">
      <p className="t-body-m text-ink-2">{message ?? "Ma’lumotni yuklab bo‘lmadi"}</p>
      <button type="button" onClick={onRetry} className="btn btn-secondary btn-sm">
        Qayta urinish
      </button>
    </div>
  );
}
