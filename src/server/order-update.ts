import "server-only";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, invitations, type Invitation } from "./db";
import { normalizePhone } from "./auth";
import { isPaidStatus, slugify, uniqueSlug, type OrderBundle } from "./orders";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Vaqt noto‘g‘ri");

export const invitationPatch = z
  .object({
    ceremony: z.enum(["nikoh", "fotiha", "sunnat", "tugilgan-kun"]),
    personA: z.string().trim().max(80),
    personB: z.string().trim().max(80).nullable(),
    /** 2026-09-12 */
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Sanani kiriting"),
    time,
    venueName: z.string().trim().max(160),
    address: z.string().trim().max(200),
    mapUrl: z
      .string()
      .trim()
      .max(500)
      .refine((v) => !v || /^https?:\/\//.test(v), "Havola https:// bilan boshlansin")
      .nullable(),
    message: z.string().trim().max(1000),
    program: z.array(z.object({ time, title: z.string().trim().min(1).max(120) })).max(12),
    photos: z.array(z.string().regex(/^\/files\/photos\/[a-z0-9]+\.[a-z]+$/)).max(10),
    rsvpEnabled: z.boolean(),
    rsvpDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    musicEnabled: z.boolean(),
    contactPhone: z.string().nullable(),
    contactTg: z
      .string()
      .trim()
      .max(64)
      .transform((v) => (v ? `@${v.replace(/^@+/, "")}` : v))
      .nullable(),
    slug: z.string().trim().max(60),
  })
  .partial();

export type InvitationPatch = z.infer<typeof invitationPatch>;

export async function applyInvitationPatch(b: OrderBundle, input: unknown) {
  const parsed = invitationPatch.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Ma’lumot noto‘g‘ri" };
  const p = parsed.data;
  const set: Partial<Invitation> = {};

  if (p.ceremony) set.ceremony = p.ceremony;
  if (p.personA !== undefined) set.personA = p.personA;
  if (p.personB !== undefined) set.personB = p.personB || null;
  if (p.day !== undefined || p.time !== undefined) {
    const [d0, t0] = (b.invitation.date || "T").split("T");
    set.date = `${p.day ?? d0}T${p.time ?? (t0 || "18:00")}`;
  }
  if (p.venueName !== undefined) set.venueName = p.venueName;
  if (p.address !== undefined) set.address = p.address;
  if (p.mapUrl !== undefined) set.mapUrl = p.mapUrl || null;
  if (p.message !== undefined) set.message = p.message;
  if (p.program !== undefined) set.program = p.program;
  if (p.photos !== undefined) set.photos = p.photos;
  if (p.rsvpEnabled !== undefined) set.rsvpEnabled = p.rsvpEnabled;
  if (p.rsvpDeadline !== undefined) set.rsvpDeadline = p.rsvpDeadline;
  if (p.musicEnabled !== undefined) set.musicEnabled = p.musicEnabled;
  if (p.contactTg !== undefined) set.contactTg = p.contactTg || null;
  if (p.contactPhone !== undefined) {
    if (p.contactPhone) {
      const n = normalizePhone(p.contactPhone);
      if (!n) return { ok: false as const, error: "Telefon raqam to‘liq emas" };
      set.contactPhone = n;
    } else set.contactPhone = null;
  }
  if (p.slug !== undefined) {
    if (!isPaidStatus(b.order.status)) return { ok: false as const, error: "Havola manzili to‘lovdan so‘ng beriladi" };
    const s = slugify(p.slug);
    if (s.length < 3) return { ok: false as const, error: "Havola kamida 3 ta belgidan iborat bo‘lsin" };
    const unique = await uniqueSlug(s, b.invitation.id);
    if (unique !== s) return { ok: false as const, error: `Bu manzil band. Masalan: ${unique}` };
    set.slug = s;
  }

  if (Object.keys(set).length) await db.update(invitations).set(set).where(eq(invitations.id, b.invitation.id));
  const [inv] = await db.select().from(invitations).where(eq(invitations.id, b.invitation.id));
  return { ok: true as const, invitation: inv };
}

/** 02/03 bosqichlarini tugatish uchun majburiy maydonlar */
export function missingFields(inv: Invitation) {
  const m: string[] = [];
  if (!inv.personA) m.push("personA");
  if ((inv.ceremony === "nikoh" || inv.ceremony === "fotiha") && !inv.personB) m.push("personB");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(inv.date)) m.push("date");
  if (!inv.venueName) m.push("venueName");
  if (!inv.address) m.push("address");
  return m;
}
