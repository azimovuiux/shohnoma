import type { Ceremony } from "@/lib/templates";

/** Buyurtma oqimi sahifalariga uzatiladigan (serializable) ma’lumot */
export interface FlowOrder {
  id: string;
  code: string;
  status: string;
  amount: number;
  promoCode?: string | null;
  promoDiscount?: number;
  templateSlug: string;
  invitationId: string;
  slug: string;
  ceremony: Ceremony;
  personA: string;
  personB: string;
  /** 2026-09-12 */
  day: string;
  /** 18:00 */
  time: string;
  venueName: string;
  address: string;
  mapUrl: string;
  message: string;
  program: { time: string; title: string }[];
  photos: string[];
  rsvpEnabled: boolean;
  rsvpDeadline: string | null;
  musicEnabled: boolean;
  musicTrack: string | null;
  /** +998901234567 */
  contactPhone: string;
  contactTg: string;
  /** HTML shablonning qo‘shimcha maydonlari */
  extra: Record<string, unknown>;
}
