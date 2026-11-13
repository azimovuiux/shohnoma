/** API obyektlari (docs/API.md) — frontend va PHP o‘rtasidagi shartnoma */

export type OrderStatus =
  | "draft"
  | "pending_payment"
  | "payment_processing"
  | "p2p_review"
  | "p2p_rejected"
  | "payment_failed"
  | "paid"
  | "active"
  | "archived";
export type RsvpStatus = "coming" | "maybe" | "not_coming";
export type PayProvider = "payme" | "click" | "google_pay" | "p2p";
export type CeremonyKey = "nikoh" | "fotiha" | "sunnat" | "tugilgan-kun";

export interface User {
  id: string;
  phone: string | null;
  name: string | null;
  telegramId: string | null;
  telegramUser: string | null;
  isAdmin: boolean;
  notifyRsvpTelegram: boolean;
  notifyRsvpSms: boolean;
  notifyDayBefore: boolean;
  createdAt: string;
}

export interface Order {
  id: string;
  code: string;
  seq: number;
  userId: string | null;
  templateSlug: string;
  status: OrderStatus;
  amount: number;
  promoCode?: string | null;
  promoDiscount?: number;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Invitation {
  id: string;
  orderId: string;
  slug: string;
  ceremony: CeremonyKey;
  personA: string;
  personB: string | null;
  date: string;
  venueName: string;
  address: string;
  mapUrl: string | null;
  message: string | null;
  program: { time: string; title: string }[];
  photos: string[];
  rsvpEnabled: boolean;
  rsvpDeadline: string | null;
  musicEnabled: boolean;
  /** Kutubxonadan tanlangan trek (yo‘q bo‘lsa — shablon standarti) */
  musicTrack?: string | null;
  contactPhone: string | null;
  contactTg: string | null;
  extra?: Record<string, unknown>;
  views: number;
  /** Serverdagi ulashish kartasi (og:image) xeshi — src/lib/shareCard */
  shareHash?: string | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  provider: PayProvider;
  amount: number;
  status: "created" | "processing" | "paid" | "failed" | "cancelled" | "review" | "rejected";
  receiptUrl: string | null;
  reviewNote: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface Guest {
  id: string;
  invitationId: string;
  name: string;
  status: RsvpStatus;
  count: number;
  wish: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Maxsus mehmon: ism bilan shaxsiy havola (/<slug>/?g=<token>), ochilishi va javobi */
export interface SpecialGuest {
  id: string;
  name: string;
  note: string | null;
  token: string;
  openCount: number;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
  createdAt: string;
  response: { name: string; status: RsvpStatus; count: number; wish: string | null; at: string } | null;
}

export interface Stats {
  coming: number;
  maybe: number;
  notComing: number;
  total: number;
  responses: number;
  /** javoblar soni holat bo‘yicha (filtr chiplari uchun); coming/maybe/notComing — kishilar soni */
  responsesBy?: { coming: number; maybe: number; notComing: number };
}

export interface Brief {
  id: string;
  ceremony: string;
  date: string | null;
  guestCount: number | null;
  styles: string[];
  colors: string[];
  ideas: string | null;
  references: string[];
  budget: string;
  name: string;
  phone: string;
  contactVia: string;
  status: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  ceremony: string | null;
  message: string | null;
  replyVia: string;
  status: string;
  createdAt: string;
}

export const isPaidStatus = (s: OrderStatus) => s === "paid" || s === "active";
