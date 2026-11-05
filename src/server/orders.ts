import "server-only";
import { and, eq, like, sql } from "drizzle-orm";
import { db, orders, invitations, payments, users, type Order, type Invitation, type User, type PayProvider } from "./db";
import { newId } from "./ids";
import { getGuestToken, getUser, formatPhone } from "./auth";
import { getTemplate, ceremonyLabel, type Ceremony } from "@/lib/templates";
import { sendSms } from "./sms";
import { notifyAdmin, notifyUser } from "./telegram";
import { env } from "./env";
import { formatPrice } from "@/lib/format";

export const DEFAULT_MESSAGE = "Aziz mehmonlar! Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.";

export const DEFAULT_PROGRAM: Record<Ceremony, { time: string; title: string }[]> = {
  nikoh: [
    { time: "17:00", title: "Mehmonlarni kutib olish" },
    { time: "18:00", title: "Nikoh marosimi" },
    { time: "19:30", title: "Bazm va tabriklar" },
    { time: "22:00", title: "Kelin-kuyov raqsi" },
  ],
  fotiha: [
    { time: "16:00", title: "Mehmonlarni kutib olish" },
    { time: "16:30", title: "Fotiha marosimi" },
    { time: "18:00", title: "Dasturxon va tabriklar" },
  ],
  sunnat: [
    { time: "10:00", title: "Mehmonlarni kutib olish" },
    { time: "11:00", title: "Osh va tabriklar" },
    { time: "13:00", title: "Bazm" },
  ],
  "tugilgan-kun": [
    { time: "19:00", title: "Mehmonlarni kutib olish" },
    { time: "19:30", title: "Tabriklar va tort" },
    { time: "21:00", title: "Bazm" },
  ],
};

/* ── Slug ── */

const translit: Record<string, string> = { "‘": "", "’": "", "'": "", "`": "", ʻ: "", ʼ: "", "&": "-" };
export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[‘’'`ʻʼ&]/g, (c) => translit[c] ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Bosh sahifa va tizim yo‘llari bilan to‘qnashmasligi uchun */
const RESERVED = new Set([
  "shablonlar",
  "buyurtma",
  "kirish",
  "kabinet",
  "admin",
  "api",
  "maxsus-dizayn",
  "files",
  "i",
  "ru",
  "uz",
  "_next",
  "robots-txt",
  "sitemap-xml",
  "favicon-ico",
  "shartlar",
  "maxfiylik",
  "tolov",
]);

export async function uniqueSlug(base: string, exceptInvitationId?: string) {
  let root = slugify(base) || "taklifnoma";
  if (RESERVED.has(root)) root = `${root}-toy`;
  const taken = new Set(
    (await db.select({ slug: invitations.slug, id: invitations.id }).from(invitations).where(like(invitations.slug, `${root}%`)))
      .filter((r) => r.id !== exceptInvitationId)
      .map((r) => r.slug),
  );
  if (!taken.has(root)) return root;
  for (let i = 2; ; i++) if (!taken.has(`${root}-${i}`)) return `${root}-${i}`;
}

export function slugBase(inv: Pick<Invitation, "personA" | "personB">) {
  return [inv.personA, inv.personB].filter(Boolean).join("-");
}

/* ── Yaratish va kirish huquqi ── */

export async function createDraftOrder(templateSlug: string) {
  const t = getTemplate(templateSlug);
  if (!t) throw new Error("Shablon topilmadi");
  const user = await getUser();
  const guestToken = user ? null : await getGuestToken(true);
  for (let attempt = 0; attempt < 5; attempt++) {
    const [{ next }] = (await db.select({ next: sql<number>`COALESCE(MAX(${orders.seq}), 123) + 1` }).from(orders)) as { next: number }[];
    const id = newId();
    try {
      await db.insert(orders).values({
        id,
        seq: Number(next),
        code: `SH-${String(next).padStart(5, "0")}`,
        userId: user?.id ?? null,
        guestToken,
        templateSlug,
        amount: t.price,
        status: "draft",
      });
      await db.insert(invitations).values({
        id: newId(),
        orderId: id,
        slug: `qoralama-${id.slice(0, 10)}`,
        ceremony: t.ceremony,
        message: DEFAULT_MESSAGE,
        program: DEFAULT_PROGRAM[t.ceremony],
        photos: [],
        contactPhone: user?.phone ?? null,
        contactTg: user?.telegramUser ?? null,
      });
      return id;
    } catch (e) {
      if (String(e).includes("Duplicate") && attempt < 4) continue;
      throw e;
    }
  }
  throw new Error("Buyurtma yaratilmadi");
}

export type OrderBundle = { order: Order; invitation: Invitation; owner: User | null };

export async function loadOrder(orderId: string): Promise<OrderBundle | null> {
  const rows = await db
    .select({ order: orders, invitation: invitations, owner: users })
    .from(orders)
    .innerJoin(invitations, eq(invitations.orderId, orders.id))
    .leftJoin(users, eq(users.id, orders.userId))
    .where(eq(orders.id, orderId))
    .limit(1);
  return rows[0] ?? null;
}

/** Joriy foydalanuvchi (yoki brauzer tokeni) shu buyurtmaga egami? */
export async function getOwnedOrder(orderId: string): Promise<OrderBundle | null> {
  const b = await loadOrder(orderId);
  if (!b) return null;
  const user = await getUser();
  if (user && (b.order.userId === user.id || user.isAdmin)) return b;
  const guest = await getGuestToken();
  if (!b.order.userId && guest && b.order.guestToken === guest) return b;
  return null;
}

export const isEditableStatus = (s: Order["status"]) => s !== "archived";
export const isPaidStatus = (s: Order["status"]) => s === "paid" || s === "active";

/* ── To‘lov tasdiqlandi ── */

export async function markOrderPaid(orderId: string, provider: PayProvider, paymentId?: string) {
  const b = await loadOrder(orderId);
  if (!b) return;
  if (isPaidStatus(b.order.status)) return;
  const now = new Date();

  // Haqiqiy havola manzilini berish
  let slug = b.invitation.slug;
  if (slug.startsWith("qoralama-")) slug = await uniqueSlug(slugBase(b.invitation), b.invitation.id);

  await db.update(orders).set({ status: "active", paidAt: now }).where(eq(orders.id, orderId));
  await db.update(invitations).set({ slug }).where(eq(invitations.id, b.invitation.id));
  if (paymentId) await db.update(payments).set({ status: "paid", paidAt: now }).where(eq(payments.id, paymentId));

  // Mijoz akkaunti yo‘q bo‘lsa — buyurtmadagi telefon bilan yaratiladi (spec §6.8)
  let owner = b.owner;
  if (!owner && b.invitation.contactPhone) {
    const { findOrCreateUserByPhone } = await import("./auth");
    owner = await findOrCreateUserByPhone(b.invitation.contactPhone);
    await db.update(orders).set({ userId: owner.id }).where(eq(orders.id, orderId));
  }

  const link = `${env.siteUrl.replace(/^https?:\/\//, "")}/${slug}`;
  const text = `Taklifnomangiz tayyor: ${link}`;
  const phone = owner?.phone ?? b.invitation.contactPhone;
  if (phone) await sendSms(phone, `Shohnoma: ${text}`).catch(() => false);
  await notifyUser(owner?.telegramId, `✅ To‘lov qabul qilindi. ${text}`);
  const t = getTemplate(b.order.templateSlug);
  await notifyAdmin(
    `💳 To‘lov: ${b.order.code} · ${formatPrice(b.order.amount)} · ${provider.toUpperCase()}\n${t?.name ?? b.order.templateSlug} · ${
      ceremonyLabel[b.invitation.ceremony as Ceremony] ?? ""
    }\n${formatPhone(phone)}\n${link}`,
  );
}

export async function setOrderStatus(orderId: string, status: Order["status"]) {
  await db.update(orders).set({ status }).where(and(eq(orders.id, orderId)));
}
