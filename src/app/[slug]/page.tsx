import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicInvitation, countView } from "@/server/invitations";
import { getTemplate } from "@/lib/templates";
import { splitDate } from "@/lib/display";
import { star8Path } from "@/lib/ornament";
import { InvitationSite } from "@/components/invitation/InvitationSite";
import { toInvitationData } from "@/components/invitation/data";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const SLUG_RE = /^[a-z0-9-]{2,80}$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) return {};
  const row = await getPublicInvitation(slug);
  if (!row) return { title: "Taklifnoma topilmadi", robots: { index: false } };
  const inv = row.invitation;
  const names = [inv.personA, inv.personB].filter(Boolean).join(" & ");
  const sd = splitDate(inv.date);
  const title = `${names} — taklifnoma`;
  const description = [sd?.long, inv.venueName].filter(Boolean).join(", ");
  return {
    title: { absolute: title },
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "website", locale: "uz_UZ", siteName: "Shohnoma" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export async function generateViewport({ params }: Props): Promise<Viewport> {
  const { slug } = await params;
  const row = SLUG_RE.test(slug) ? await getPublicInvitation(slug) : null;
  const t = row ? getTemplate(row.order.templateSlug) : null;
  return { themeColor: t?.theme.bg[0] ?? "#FFFDF9" };
}

function Archived({ names }: { names: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg-base px-6 text-center">
      <svg viewBox="0 0 200 200" className="size-40" aria-hidden>
        <path d={star8Path(100, 100, 92)} fill="none" stroke="var(--color-gold)" strokeOpacity="0.5" />
        <path d={star8Path(100, 100, 12)} fill="var(--color-gold)" />
      </svg>
      <p className="mt-6 font-script text-[40px] leading-tight text-maroon">{names}</p>
      <h1 className="mt-2 font-serif text-[32px] font-light text-ink">Bu taklifnoma arxivlangan</h1>
      <p className="t-body-m mt-3 max-w-[360px] text-ink-2">Marosim o‘tib ketgan, shuning uchun sahifa endi faol emas. Ishtirokingiz uchun rahmat!</p>
      <Link href="/" className="btn btn-secondary mt-8">
        Shohnoma.uz
      </Link>
    </main>
  );
}

export default async function InvitationPage({ params }: Props) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) notFound();
  const row = await getPublicInvitation(slug);
  if (!row) notFound();
  const template = getTemplate(row.order.templateSlug);
  if (!template) notFound();
  if (row.order.status === "archived") return <Archived names={[row.invitation.personA, row.invitation.personB].filter(Boolean).join(" & ")} />;
  await countView(row.invitation.id).catch(() => undefined);
  return <InvitationSite template={template} data={toInvitationData(row.invitation)} mode="live" />;
}
