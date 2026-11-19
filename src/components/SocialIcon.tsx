import type { ChannelKind } from "@/lib/social";
import { Call, Facebook, Global, Instagram, Sms, Whatsapp, Youtube } from "@/components/icons";
import { TelegramIcon } from "./TelegramIcon";

/** Ijtimoiy tarmoq ikonkasi (iconsax’da yo‘qlari — TikTok, X, LinkedIn — chiziqli SVG) */
export function SocialIcon({ type, size = 18 }: { type: ChannelKind; size?: number }) {
  switch (type) {
    case "phone":
      return <Call size={size} />;
    case "bot":
    case "telegram":
      return <TelegramIcon size={size} />;
    case "instagram":
      return <Instagram size={size} />;
    case "whatsapp":
      return <Whatsapp size={size} />;
    case "facebook":
      return <Facebook size={size} />;
    case "youtube":
      return <Youtube size={size} />;
    case "email":
      return <Sms size={size} />;
    case "website":
      return <Global size={size} />;
    case "tiktok":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M14 3c.4 2.6 2.2 4.4 5 4.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "x":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 4l16 16M20 4 4 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "linkedin":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 10.5V16M8 7.8v.2M12 16v-3.2c0-1.4 1-2.3 2.2-2.3s2 .9 2 2.3V16M12 10.5V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
  }
}
