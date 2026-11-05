import type { Template } from "@/lib/templates";

/** Mehmon ko‘radigan taklifnoma sayti uchun ma’lumot (DB'dagi invitation'dan yoki namuna) */
export interface InvitationData {
  slug: string;
  ceremony: "nikoh" | "fotiha" | "sunnat" | "tugilgan-kun";
  personA: string;
  personB: string | null;
  /** "2026-09-12T18:00" (Toshkent) */
  date: string;
  venueName: string;
  address: string;
  mapUrl: string | null;
  message: string | null;
  program: { time: string; title: string }[];
  photos: string[];
  rsvpEnabled: boolean;
  /** "2026-09-01" */
  rsvpDeadline: string | null;
  musicEnabled: boolean;
}

export interface InvitationSiteProps {
  template: Template;
  data: InvitationData;
  /**
   * "live" — haqiqiy mehmon sahifasi (javob yuboriladi);
   * "preview" — buyurtma 04 / kabinet ko‘rinishi (javob tugmalari bosiladi, lekin hech narsa yuborilmaydi);
   * "demo" — shablon namunasi.
   */
  mode: "live" | "preview" | "demo";
  /** preview rejimida telefon mokapi ichida ko‘rsatish uchun (fixed elementlar o‘rniga absolute) */
  embedded?: boolean;
}
