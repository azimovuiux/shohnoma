import type { ReactNode } from "react";

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
export function fmtDateTime(d: Date | null | undefined) {
  if (!d) return "—";
  const t = new Date(d.getTime() + 5 * 3600_000).toISOString();
  return `${t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)} ${t.slice(11, 16)}`;
}
