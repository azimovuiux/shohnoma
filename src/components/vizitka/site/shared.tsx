"use client";

/**
 * «Vizitka» katalogi, kabinet va admin uchun umumiy qismlar (agent C):
 * posterlar manzili, qurilma mokapidagi ko‘rinish, holat yorliqlari.
 * Posterlar: scripts/qa/posters-vizitka.cjs → public/vizitka/posters/<slug>[-ru|-en]-<phone|laptop>[-long].webp
 */
import { useLocale } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import type { OrderStatus } from "@/lib/types";
import type { CardDesign } from "@/lib/cards";
import { GirihPattern } from "@/components/Ornament";
import { LaptopFrame, PhoneFrame } from "@/components/mockups/Devices";
import { ScrollShot, useShotActive } from "@/components/mockups/ScrollShot";

export type PosterKind = "phone" | "laptop";

/** Katalog posteri (birinchi ekran) va butun sahifaning uzun rasmi */
export function cardPoster(slug: string, kind: PosterKind, locale: Locale = "uz", long = false) {
  return `/vizitka/posters/${slug}${locale === "uz" ? "" : `-${locale}`}-${kind}${long ? "-long" : ""}.webp`;
}

/** Dizayn portreti (poster tayyor bo‘lmasa yoki kichik ko‘rinishlar uchun) */
export const cardPortrait = (slug: string) => `/vizitka/${slug.replace(/^v-/, "")}/portret.webp`;

/** Telefon ekranida poster; `active` bo‘lsa butun sahifa sekin pastga suriladi */
export function CardPhoneShot({ d, active = false, warm = false, className = "" }: { d: CardDesign; active?: boolean; warm?: boolean; className?: string }) {
  const locale = useLocale();
  return (
    <PhoneFrame dark={d.dark} className={className}>
      <div className="absolute inset-0" style={{ background: d.palette[0] }}>
        <ScrollShot poster={cardPoster(d.slug, "phone", locale)} long={cardPoster(d.slug, "phone", locale, true)} active={active} warm={warm} speed={0.9} />
      </div>
    </PhoneFrame>
  );
}

/** Katalog kartasidagi sahna: girih fonida laptop + telefon (taklifnoma katalogidagi DevicePreview bilan bir xil o‘lcham) */
export function CardDevicePreview({ d, className = "" }: { d: CardDesign; className?: string }) {
  const shot = useShotActive<HTMLDivElement>();
  const locale = useLocale();
  return (
    <div ref={shot.ref} className={`relative aspect-[560/380] overflow-hidden rounded-[18px] bg-gradient-to-b from-[#efe4d3] to-[#f8f3eb] ${className}`}>
      <GirihPattern id={`girih-${d.slug}`} cell={62} color="#c9a25e" opacity={0.22} className="absolute inset-0" />
      <div className="absolute left-[0.7%] top-[12.6%] w-[89.3%]">
        <LaptopFrame className="w-full">
          <div className="absolute inset-0" style={{ background: d.palette[0] }}>
            <ScrollShot poster={cardPoster(d.slug, "laptop", locale)} long={cardPoster(d.slug, "laptop", locale, true)} active={shot.active} warm={shot.warm} />
          </div>
        </LaptopFrame>
      </div>
      <CardPhoneShot d={d} active={shot.active} warm={shot.warm} className="absolute left-[72.1%] top-[21.6%] w-[23.6%]" />
    </div>
  );
}

/** Vizitka buyurtmasi holati (taklifnomadagi «sayt ochiq» o‘rniga «vizitka ochiq») */
export const cardStatusView: Record<OrderStatus, { label: string; tone: "success" | "pending" | "muted" | "danger" }> = {
  draft: { label: "Qoralama · to‘lov kutilmoqda", tone: "pending" },
  pending_payment: { label: "Qoralama · to‘lov kutilmoqda", tone: "pending" },
  payment_processing: { label: "To‘lov jarayonida", tone: "pending" },
  p2p_review: { label: "Chek tekshirilmoqda", tone: "pending" },
  p2p_rejected: { label: "Chek qabul qilinmadi", tone: "danger" },
  payment_failed: { label: "To‘lov o‘tmadi", tone: "danger" },
  paid: { label: "Faol · vizitka ochiq", tone: "success" },
  active: { label: "Faol · vizitka ochiq", tone: "success" },
  archived: { label: "Arxivlangan", tone: "muted" },
};

export const isCardLive = (s: OrderStatus) => s === "paid" || s === "active";
