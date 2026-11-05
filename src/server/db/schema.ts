import {
  mysqlTable,
  varchar,
  int,
  boolean,
  datetime,
  text,
  json,
  mysqlEnum,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

const id = (name = "id") => varchar(name, { length: 32 });
const now = (name: string) => datetime(name, { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`);

export const ceremonies = ["nikoh", "fotiha", "sunnat", "tugilgan-kun", "boshqa"] as const;

export const users = mysqlTable("users", {
  id: id().primaryKey(),
  phone: varchar("phone", { length: 16 }).unique(), // +998901234567
  name: varchar("name", { length: 120 }),
  telegramId: varchar("telegram_id", { length: 32 }).unique(),
  telegramUser: varchar("telegram_user", { length: 64 }),
  locale: varchar("locale", { length: 4 }).notNull().default("uz"),
  isAdmin: boolean("is_admin").notNull().default(false),
  notifyRsvpTelegram: boolean("notify_rsvp_telegram").notNull().default(true),
  notifyRsvpSms: boolean("notify_rsvp_sms").notNull().default(false),
  notifyDayBefore: boolean("notify_day_before").notNull().default(true),
  createdAt: now("created_at"),
});

export const sessions = mysqlTable("sessions", {
  id: varchar("id", { length: 64 }).primaryKey(), // sha256(token)
  userId: id("user_id").notNull(),
  expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
  createdAt: now("created_at"),
});

export const otpCodes = mysqlTable(
  "otp_codes",
  {
    id: id().primaryKey(),
    phone: varchar("phone", { length: 16 }).notNull(),
    codeHash: varchar("code_hash", { length: 64 }).notNull(),
    attempts: int("attempts").notNull().default(0),
    expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
    usedAt: datetime("used_at", { mode: "date" }),
    createdAt: now("created_at"),
  },
  (t) => [index("otp_phone_idx").on(t.phone)],
);

export const orderStatuses = [
  "draft",
  "pending_payment",
  "payment_processing",
  "p2p_review",
  "p2p_rejected",
  "payment_failed",
  "paid",
  "active",
  "archived",
] as const;

export const orders = mysqlTable(
  "orders",
  {
    id: id().primaryKey(),
    code: varchar("code", { length: 16 }).notNull().unique(), // SH-00124
    seq: int("seq").notNull().unique(),
    userId: id("user_id"),
    templateSlug: varchar("template_slug", { length: 64 }).notNull(),
    status: mysqlEnum("status", orderStatuses).notNull().default("draft"),
    amount: int("amount").notNull(), // so‘m
    /** egasi kirmagan bo‘lsa — brauzer tokeni (cookie) bilan bog‘lanadi */
    guestToken: varchar("guest_token", { length: 64 }),
    paidAt: datetime("paid_at", { mode: "date" }),
    createdAt: now("created_at"),
    updatedAt: datetime("updated_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => new Date()),
  },
  (t) => [index("orders_user_idx").on(t.userId)],
);

export type ProgramItem = { time: string; title: string };

export const invitations = mysqlTable("invitations", {
  id: id().primaryKey(),
  orderId: id("order_id").notNull().unique(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  ceremony: mysqlEnum("ceremony", ceremonies).notNull(),
  personA: varchar("person_a", { length: 80 }).notNull().default(""),
  personB: varchar("person_b", { length: 80 }),
  /** ISO lokal sana-vaqt (Asia/Tashkent), masalan 2026-09-12T18:00 */
  date: varchar("date", { length: 16 }).notNull().default(""),
  venueName: varchar("venue_name", { length: 160 }).notNull().default(""),
  address: varchar("address", { length: 200 }).notNull().default(""),
  mapUrl: varchar("map_url", { length: 500 }),
  message: text("message"),
  program: json("program").$type<ProgramItem[]>(),
  photos: json("photos").$type<string[]>(),
  rsvpEnabled: boolean("rsvp_enabled").notNull().default(true),
  rsvpDeadline: varchar("rsvp_deadline", { length: 10 }),
  musicEnabled: boolean("music_enabled").notNull().default(true),
  contactPhone: varchar("contact_phone", { length: 16 }),
  contactTg: varchar("contact_tg", { length: 64 }),
  views: int("views").notNull().default(0),
  dayBeforeSentAt: datetime("day_before_sent_at", { mode: "date" }),
  createdAt: now("created_at"),
});

export const rsvpStatuses = ["coming", "maybe", "not_coming"] as const;

export const guestResponses = mysqlTable(
  "guest_responses",
  {
    id: id().primaryKey(),
    invitationId: id("invitation_id").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    status: mysqlEnum("status", rsvpStatuses).notNull(),
    count: int("count").notNull().default(1),
    wish: text("wish"),
    editToken: varchar("edit_token", { length: 48 }).notNull().unique(),
    createdAt: now("created_at"),
    updatedAt: datetime("updated_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => new Date()),
  },
  (t) => [index("guest_inv_idx").on(t.invitationId)],
);

export const payProviders = ["payme", "click", "google_pay", "p2p"] as const;
export const paymentStatuses = ["created", "processing", "paid", "failed", "cancelled", "review", "rejected"] as const;

export const payments = mysqlTable(
  "payments",
  {
    id: id().primaryKey(),
    orderId: id("order_id").notNull(),
    provider: mysqlEnum("provider", payProviders).notNull(),
    amount: int("amount").notNull(), // so‘m
    status: mysqlEnum("status", paymentStatuses).notNull().default("created"),
    externalId: varchar("external_id", { length: 64 }),
    /** Payme: create_time/perform_time/cancel_time (ms), reason; Click: ids */
    meta: json("meta").$type<Record<string, unknown>>(),
    receiptUrl: varchar("receipt_url", { length: 300 }),
    reviewNote: varchar("review_note", { length: 300 }),
    reviewedBy: id("reviewed_by"),
    createdAt: now("created_at"),
    paidAt: datetime("paid_at", { mode: "date" }),
  },
  (t) => [index("pay_order_idx").on(t.orderId), uniqueIndex("pay_ext_idx").on(t.provider, t.externalId)],
);

export const favorites = mysqlTable(
  "favorites",
  {
    userId: id("user_id").notNull(),
    templateSlug: varchar("template_slug", { length: 64 }).notNull(),
    createdAt: now("created_at"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.templateSlug] })],
);

export const briefs = mysqlTable("briefs", {
  id: id().primaryKey(),
  ceremony: mysqlEnum("ceremony", ceremonies).notNull(),
  date: varchar("date", { length: 10 }),
  guestCount: int("guest_count"),
  styles: json("styles").$type<string[]>(),
  colors: json("colors").$type<string[]>(),
  ideas: text("ideas"),
  references: json("references").$type<string[]>(),
  budget: varchar("budget", { length: 20 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 16 }).notNull(),
  contactVia: varchar("contact_via", { length: 16 }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("new"),
  createdAt: now("created_at"),
});

export const leads = mysqlTable("leads", {
  id: id().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 16 }).notNull(),
  ceremony: varchar("ceremony", { length: 20 }),
  message: text("message"),
  replyVia: varchar("reply_via", { length: 16 }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("new"),
  createdAt: now("created_at"),
});

export type User = typeof users.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type GuestResponse = typeof guestResponses.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Brief = typeof briefs.$inferSelect;
export type OrderStatus = (typeof orderStatuses)[number];
export type RsvpStatus = (typeof rsvpStatuses)[number];
export type PayProvider = (typeof payProviders)[number];
