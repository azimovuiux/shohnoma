import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/server/auth";
import { db, payments, briefs, leads } from "@/server/db";
import { Star8 } from "@/components/Ornament";
import { AdminNav } from "@/components/admin/AdminNav";
import { ExportSquare } from "@/components/icons";
import { formatPhoneDisplay } from "@/lib/display";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [[p2p], [b], [l]] = await Promise.all([
    db.select({ n: sql<number>`COUNT(*)` }).from(payments).where(and(eq(payments.provider, "p2p"), eq(payments.status, "review"))),
    db.select({ n: sql<number>`COUNT(*)` }).from(briefs).where(eq(briefs.status, "new")),
    db.select({ n: sql<number>`COUNT(*)` }).from(leads).where(eq(leads.status, "new")),
  ]);
  return (
    <div className="min-h-dvh bg-bg-base">
      <header className="sticky top-0 z-30 border-b border-line bg-bg-base/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-1 px-5 pt-3 lg:px-10">
          <div className="flex items-center justify-between gap-4">
            <Link href="/admin" className="inline-flex items-center gap-2 text-ink">
              <Star8 size={16} />
              <span className="t-logo !text-[22px]">Shohnoma</span>
              <span className="rounded-full bg-bg-soft px-2 py-0.5 t-body-s text-ink-2">admin</span>
            </Link>
            <div className="flex items-center gap-4 t-body-s text-ink-2">
              <span className="hidden sm:inline">{admin.name || formatPhoneDisplay(admin.phone) || admin.telegramUser}</span>
              <Link href="/" className="inline-flex items-center gap-1.5 t-nav text-ink hover:text-maroon">
                Saytga qaytish <ExportSquare size={15} />
              </Link>
            </div>
          </div>
          <AdminNav counts={{ p2p: Number(p2p.n), briefs: Number(b.n), leads: Number(l.n) }} />
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10">{children}</main>
    </div>
  );
}
