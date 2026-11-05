"use client";

import { useApi } from "@/lib/client";
import type { Brief } from "@/lib/types";
import { formatPhoneDisplay } from "@/lib/display";
import { AdminError, AdminLoading, AdminRefreshProvider, AdminTitle, Empty, fmtDateTime } from "../shared";
import { BriefList, type BriefRow } from "../BriefList";
import { useReloadCounts } from "../AdminShell";

export function AdminBriefs() {
  const { data, loading, error, reload } = useApi<{ ok: boolean; items: Brief[] }>("/api/admin/briefs");
  const reloadCounts = useReloadCounts();
  if (loading && !data) return <AdminLoading />;
  if (!data) return <AdminError message={error?.message} onRetry={() => reload()} />;
  const rows: BriefRow[] = data.items.map((b) => ({
    id: b.id,
    ceremony: b.ceremony,
    date: b.date,
    guestCount: b.guestCount,
    styles: b.styles ?? [],
    colors: b.colors ?? [],
    ideas: b.ideas,
    references: b.references ?? [],
    budget: b.budget,
    name: b.name,
    phone: b.phone,
    phoneDisplay: formatPhoneDisplay(b.phone),
    contactVia: b.contactVia,
    status: b.status,
    created: fmtDateTime(b.createdAt),
  }));
  return (
    <AdminRefreshProvider value={() => (reload(true), reloadCounts())}>
      <AdminTitle title="Briflar" sub="Maxsus dizayn so‘rovlari" />
      {rows.length ? <BriefList rows={rows} /> : <Empty>Hali brif yo‘q</Empty>}
    </AdminRefreshProvider>
  );
}
