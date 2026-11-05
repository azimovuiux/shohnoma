"use client";

import { useAdminRefresh } from "./shared";
import { useState } from "react";
import { api, useToast } from "@/components/ui";

/** Holatni o‘zgartirish (PATCH) — buyurtma / brif / xabar */
export function StatusSelect({
  endpoint,
  value,
  options,
  confirmFor = [],
}: {
  endpoint: string;
  value: string;
  options: { value: string; label: string }[];
  confirmFor?: string[];
}) {
  const refresh = useAdminRefresh();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <select
      value={value}
      disabled={busy}
      aria-label="Holatni o‘zgartirish"
      onChange={async (e) => {
        const next = e.target.value;
        const label = options.find((o) => o.value === next)?.label ?? next;
        if (confirmFor.includes(next) && !window.confirm(`Holatni “${label}” ga o‘zgartirasizmi?`)) return;
        setBusy(true);
        try {
          await api(endpoint, { method: "PATCH", json: { status: next } });
          toast("Saqlandi");
          refresh();
        } catch (err) {
          toast((err as Error).message, "error");
        } finally {
          setBusy(false);
        }
      }}
      className="h-9 rounded-full border border-line bg-bg-base px-3 t-body-s text-ink outline-none focus:border-maroon/55 disabled:opacity-50"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
