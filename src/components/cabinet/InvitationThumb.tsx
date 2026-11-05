import { getTemplate, type Template } from "@/lib/templates";
import { PhoneFrame } from "@/components/mockups/Devices";
import { InvitationScreen } from "@/components/mockups/InvitationScreen";
import { splitDate } from "@/lib/display";

type Inv = { personA: string; personB: string | null; date: string; venueName: string };

function isDark(t: Template) {
  const hex = t.theme.bg[0].replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

/** Shablon + mijoz ma’lumotlari bilan kichik telefon ko‘rinishi */
export function invitationTemplate(slug: string, inv: Inv): Template | null {
  const t = getTemplate(slug);
  if (!t) return null;
  const d = splitDate(inv.date);
  return {
    ...t,
    sample: {
      a: inv.personA || t.sample.a,
      b: inv.personA ? inv.personB ?? undefined : t.sample.b,
      date: d?.dots ?? t.sample.date,
      venue: inv.venueName || t.sample.venue,
      time: d?.time || t.sample.time,
    },
  };
}

export function InvitationThumb({ templateSlug, inv, className = "w-[112px]" }: { templateSlug: string; inv: Inv; className?: string }) {
  const t = invitationTemplate(templateSlug, inv);
  if (!t) return null;
  return (
    <PhoneFrame dark={isDark(t)} className={`shrink-0 ${className}`}>
      <InvitationScreen t={t} />
    </PhoneFrame>
  );
}
