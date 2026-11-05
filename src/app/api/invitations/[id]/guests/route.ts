import { asc, eq } from "drizzle-orm";
import { fail } from "@/server/http";
import { getUser } from "@/server/auth";
import { db, invitations, orders, guestResponses } from "@/server/db";

const statusLabel = { coming: "Boraman", maybe: "Hali aniq emas", not_coming: "Kela olmayman" } as const;
const esc = (v: string | number | null) => {
  const s = String(v ?? "");
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Mehmonlar ro‘yxati — CSV (Excel'da to‘g‘ri ochilishi uchun BOM va ";" ajratgich) */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await getUser();
  if (!u) return fail("Kirilmagan", 401);
  const id = (await params).id;
  const [row] = await db.select({ inv: invitations, order: orders }).from(invitations).innerJoin(orders, eq(orders.id, invitations.orderId)).where(eq(invitations.id, id));
  if (!row || (row.order.userId !== u.id && !u.isAdmin)) return fail("Topilmadi", 404);
  const list = await db.select().from(guestResponses).where(eq(guestResponses.invitationId, id)).orderBy(asc(guestResponses.createdAt));
  const lines = [
    ["Mehmon", "Kishi", "Javob", "Tilak", "Vaqt"].join(";"),
    ...list.map((g) =>
      [g.name, g.count, statusLabel[g.status], g.wish ?? "", g.createdAt.toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })].map(esc).join(";"),
    ),
  ];
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mehmonlar-${row.inv.slug}.csv"`,
    },
  });
}
