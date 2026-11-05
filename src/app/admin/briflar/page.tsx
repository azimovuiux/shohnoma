import { desc } from "drizzle-orm";
import { db, briefs } from "@/server/db";
import { AdminTitle, Empty, fmtDateTime } from "@/components/admin/shared";
import { BriefList, type BriefRow } from "@/components/admin/BriefList";
import { formatPhoneDisplay } from "@/lib/display";

export default async function AdminBriefs() {
  const list = await db.select().from(briefs).orderBy(desc(briefs.createdAt)).limit(200);
  const rows: BriefRow[] = list.map((b) => ({
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
    <>
      <AdminTitle title="Briflar" sub="Maxsus dizayn so‘rovlari" />
      {rows.length ? <BriefList rows={rows} /> : <Empty>Hali brif yo‘q</Empty>}
    </>
  );
}
