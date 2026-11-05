"use client";

import { useApi } from "@/lib/client";
import type { Lead } from "@/lib/types";
import { AdminError, AdminLoading, AdminRefreshProvider, AdminTitle, Empty, fmtDateTime } from "../shared";
import { StatusSelect } from "../StatusSelect";
import { useReloadCounts } from "../AdminShell";
import { formatPhoneDisplay } from "@/lib/display";
import { ceremonyLabel, type Ceremony } from "@/lib/templates";

const via: Record<string, string> = { telegram: "Telegram", call: "Qo‘ng‘iroq", whatsapp: "WhatsApp", sms: "SMS" };
const statuses = [
  { value: "new", label: "Yangi" },
  { value: "contacted", label: "Bog‘lanildi" },
  { value: "done", label: "Yopildi" },
];

export function AdminLeads() {
  const { data, loading, error, reload } = useApi<{ ok: boolean; items: Lead[] }>("/api/admin/leads");
  const reloadCounts = useReloadCounts();
  if (loading && !data) return <AdminLoading />;
  if (!data) return <AdminError message={error?.message} onRetry={() => reload()} />;
  const list = data.items;
  return (
    <AdminRefreshProvider value={() => (reload(true), reloadCounts())}>
      <AdminTitle title="Xabarlar" sub="Bosh sahifadagi “Xabar qoldiring” formasi" />
      {list.length === 0 ? (
        <Empty>Hali xabar yo‘q</Empty>
      ) : (
        <ul className="divide-y divide-line rounded-panel border border-line">
          {list.map((l) => (
            <li key={l.id} className={`flex flex-col gap-2 px-5 py-4 ${l.status === "new" ? "bg-maroon/[0.03]" : ""}`}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="min-w-[140px] flex-1 t-title text-ink">{l.name}</span>
                <a href={`tel:${l.phone}`} className="t-body-m text-ink hover:text-maroon">
                  {formatPhoneDisplay(l.phone)}
                </a>
                <span className="t-body-s text-ink-2">{ceremonyLabel[l.ceremony as Ceremony] ?? "—"}</span>
                <span className="t-body-s text-ink-2">Javob: {via[l.replyVia] ?? l.replyVia}</span>
                <StatusSelect endpoint={`/api/admin/leads/${l.id}`} value={l.status} options={statuses} />
                <span className="w-32 text-right t-body-s text-ink-2">{fmtDateTime(l.createdAt)}</span>
              </div>
              {l.message && <p className="whitespace-pre-wrap t-body-m text-ink-2">{l.message}</p>}
            </li>
          ))}
        </ul>
      )}
    </AdminRefreshProvider>
  );
}
