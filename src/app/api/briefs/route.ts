import { z } from "zod";
import { fail, json, rateLimited, clientIp } from "@/server/http";
import { notifyAdmin } from "@/server/telegram";
import { normalizePhone } from "@/server/auth";
import { saveUpload } from "@/server/storage";
import { db, briefs } from "@/server/db";
import { newId } from "@/server/ids";
import { env } from "@/server/env";

const schema = z.object({
  ceremony: z.enum(["nikoh", "fotiha", "sunnat", "tugilgan-kun", "boshqa"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  guestCount: z.coerce.number().int().min(0).max(5000).optional(),
  styles: z.array(z.string().max(40)).max(10).default([]),
  colors: z.array(z.string().max(40)).max(12).default([]),
  ideas: z.string().max(3000).optional(),
  budget: z.string().max(20),
  name: z.string().trim().min(1, "Ismingizni kiriting").max(120),
  phone: z.string(),
  contactVia: z.enum(["telegram", "call", "sms"]),
});

/** 17 — Maxsus dizayn brifi (multipart: data=JSON, files=rasmlar) */
export async function POST(req: Request) {
  if (rateLimited(`brief:${await clientIp()}`, 5)) return fail("Juda ko‘p urinish", 429);
  const fd = await req.formData();
  if (fd.get("website")) return json({ ok: true });
  const p = schema.safeParse(JSON.parse(String(fd.get("data") ?? "{}")));
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Ma’lumot noto‘g‘ri", 422);
  const phone = normalizePhone(p.data.phone);
  if (!phone) return fail("Telefon raqam to‘liq emas", 422);
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 10);
  const refs: string[] = [];
  try {
    for (const f of files) refs.push(await saveUpload(f, "briefs"));
  } catch (e) {
    return fail((e as Error).message, 422);
  }
  const id = newId();
  await db.insert(briefs).values({
    id,
    ceremony: p.data.ceremony,
    date: p.data.date || null,
    guestCount: p.data.guestCount ?? null,
    styles: p.data.styles,
    colors: p.data.colors,
    ideas: p.data.ideas ?? null,
    references: refs,
    budget: p.data.budget,
    name: p.data.name,
    phone,
    contactVia: p.data.contactVia,
  });
  await notifyAdmin(`🎨 Yangi brif: ${p.data.name} · ${phone}\nByudjet: ${p.data.budget} · Rasmlar: ${refs.length}\n${env.siteUrl}/admin/briflar`);
  return json({ ok: true });
}
