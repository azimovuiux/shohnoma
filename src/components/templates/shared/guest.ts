"use client";

/**
 * Shaxsiy murojaat («Hurmatli {ism}») — barcha shablonlar uchun bitta manba.
 *
 *   const guest = useGuestName(demo ? DEMO.guest : "");
 *
 * Tartib: ?g=<token> (maxsus mehmon; ism serverdan — GuestInvitation /api/i/<slug>?g= javobidan oldindan yoziladi)
 * → ?m=Ism (eski shaxsiy havola) → fallback (namuna). Ism yo‘q bo‘lsa — "" (shablon avvalgidek umumiy murojaat qiladi).
 */
import { useEffect, useState } from "react";

const TOKEN_RE = /^[a-z0-9]{10}$/;
let resolved: { token: string; name: string } | null = null;

/** GuestInvitation: serverdan kelgan maxsus mehmon (shablon chizilishidan oldin) */
export function setInviteGuest(g: { token: string; name: string } | null) {
  resolved = g;
}

/** Joriy manzildagi maxsus mehmon tokeni (?g=) — javobni bog‘lash va alohida saqlash uchun */
export function inviteGuestToken(): string | null {
  if (typeof window === "undefined") return null;
  const g = new URLSearchParams(window.location.search).get("g");
  return g && TOKEN_RE.test(g) ? g : null;
}

/** Shaxsiy murojaat uchun ism (maks. 80 belgi) */
export function guestNameNow(fallback = ""): string {
  if (typeof window === "undefined") return fallback;
  const token = inviteGuestToken();
  if (token && resolved?.token === token && resolved.name) return resolved.name.slice(0, 80);
  const m = new URLSearchParams(window.location.search).get("m");
  return m ? m.slice(0, 80) : fallback;
}

/** Shablonlar uchun hook: birinchi chizishda "" (gidratatsiya mos keladi), keyin ism */
export function useGuestName(fallback = ""): string {
  const [guest, setGuest] = useState("");
  useEffect(() => {
    setGuest(guestNameNow(fallback));
  }, [fallback]);
  return guest;
}
