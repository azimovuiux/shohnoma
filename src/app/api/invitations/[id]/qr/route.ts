import QRCode from "qrcode";
import { eq } from "drizzle-orm";
import { fail } from "@/server/http";
import { getUser } from "@/server/auth";
import { db, invitations, orders } from "@/server/db";
import { env } from "@/server/env";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await getUser();
  if (!u) return fail("Kirilmagan", 401);
  const [row] = await db
    .select({ inv: invitations, order: orders })
    .from(invitations)
    .innerJoin(orders, eq(orders.id, invitations.orderId))
    .where(eq(invitations.id, (await params).id));
  if (!row || (row.order.userId !== u.id && !u.isAdmin)) return fail("Topilmadi", 404);
  const url = `${env.siteUrl}/${row.inv.slug}`;
  const format = new URL(req.url).searchParams.get("format");
  const download = new URL(req.url).searchParams.has("download");
  const opts = { margin: 2, color: { dark: "#1B1813", light: "#FFFFFF" } };
  if (format === "svg") {
    const svg = await QRCode.toString(url, { ...opts, type: "svg" });
    return new Response(svg, {
      headers: { "Content-Type": "image/svg+xml", ...(download ? { "Content-Disposition": `attachment; filename="qr-${row.inv.slug}.svg"` } : {}) },
    });
  }
  const png = await QRCode.toBuffer(url, { ...opts, type: "png", width: 1024 });
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", ...(download ? { "Content-Disposition": `attachment; filename="qr-${row.inv.slug}.png"` } : {}) },
  });
}
