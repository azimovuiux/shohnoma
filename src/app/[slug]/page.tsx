import type { Metadata } from "next";
import { GuestInvitation } from "@/components/invitation/GuestInvitation";

/**
 * Mehmon taklifnomasi — statik qobiq (faqat "_" uchun yaratiladi → /_/index.html).
 * Apache /<slug>/ so‘rovlarini php/invite.php ga beradi: u shu qobiqqa OG meta qo‘shib qaytaradi.
 * Taklifnoma ma’lumoti brauzerda GET /api/i/<slug> dan olinadi.
 */
export const dynamicParams = false;
export function generateStaticParams() {
  return [{ slug: "_" }];
}

export const metadata: Metadata = {
  title: { absolute: "Taklifnoma — Shohnoma" },
  robots: { index: false, follow: false },
};

export default function InvitationPage() {
  return <GuestInvitation />;
}
