"use client";

import Link from "next/link";
import { useMe } from "@/lib/client";

/**
 * Admin boshqa foydalanuvchining (yoki egasiz) buyurtmasini kabinet/tahrirlash sahifasida ochganda —
 * kimniki ekani va admin paneldagi buyurtmaga qaytish havolasi. Mijozning o‘ziga ko‘rinmaydi.
 */
export function AdminViewBanner({ orderId, code, userId }: { orderId: string; code: string; userId: string | null }) {
  const { me } = useMe();
  if (!me?.user?.isAdmin || userId === me.user.id) return null;
  return (
    <div className="border-b border-gold/40 bg-gold-soft">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-5 py-2.5 t-body-s text-ink lg:px-10 xl:px-[120px]">
        <span>
          <b className="font-semibold">Admin rejimi:</b> {code} — {userId ? "boshqa foydalanuvchining buyurtmasi" : "egasiz (mehmon) buyurtma"}. O‘zgarishlar mijoz taklifnomasiga yoziladi.
        </span>
        <Link href={`/admin/buyurtmalar/b/?id=${orderId}`} className="font-medium text-maroon hover:underline">
          ← Admin paneldagi buyurtmaga qaytish
        </Link>
      </div>
    </div>
  );
}
