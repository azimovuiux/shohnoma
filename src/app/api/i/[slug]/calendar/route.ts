import { getPublicInvitation } from "@/server/invitations";
import { ceremonyLabel, type Ceremony } from "@/lib/templates";
import { env } from "@/server/env";

const esc = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
/** "2026-09-12T18:00" (Toshkent, UTC+5) → 20260912T130000Z */
function toUtc(local: string, plusHours = 0) {
  const d = new Date(`${local}:00+05:00`);
  d.setHours(d.getHours() + plusHours);
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const row = await getPublicInvitation((await params).slug);
  if (!row || !row.invitation.date) return new Response("Not found", { status: 404 });
  const inv = row.invitation;
  const names = [inv.personA, inv.personB].filter(Boolean).join(" & ");
  const title = `${names} — ${ceremonyLabel[inv.ceremony as Ceremony] ?? "Marosim"}`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Shohnoma//UZ",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${inv.id}@shohnoma.uz`,
    `DTSTAMP:${toUtc(new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 16))}`,
    `DTSTART:${toUtc(inv.date)}`,
    `DTEND:${toUtc(inv.date, 4)}`,
    `SUMMARY:${esc(title)}`,
    `LOCATION:${esc([inv.venueName, inv.address].filter(Boolean).join(", "))}`,
    `DESCRIPTION:${esc(`Taklifnoma: ${env.siteUrl}/${inv.slug}`)}`,
    `URL:${env.siteUrl}/${inv.slug}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT3H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return new Response(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${inv.slug}.ics"` },
  });
}
