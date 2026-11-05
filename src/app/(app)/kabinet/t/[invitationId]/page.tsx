import Link from "next/link";
import { requireUser } from "@/server/auth";
import { getUserInvitation } from "@/server/cabinet";
import { guestList } from "@/server/invitations";
import { isPaidStatus } from "@/server/orders";
import { env } from "@/server/env";
import { ArrowRight, Calendar, CloseCircle, Clock, Edit, Gallery, Link2, Location, Music, Timer1, TickCircle } from "@/components/icons";
import { StatusBadge } from "@/components/ui";
import { InvitationHeader, invTitle } from "@/components/cabinet/InvitationHeader";
import { InvitationThumb } from "@/components/cabinet/InvitationThumb";
import { CopyLink, ShareRow } from "@/components/cabinet/LinkActions";
import { daysUntil, initials, relativeTime, rsvpView } from "@/lib/display";

export const metadata = { title: "Taklifnoma", robots: { index: false } };

export default async function InvitationOverview({ params }: { params: Promise<{ invitationId: string }> }) {
  const { invitationId } = await params;
  const user = await requireUser(`/kabinet/t/${invitationId}`);
  const { order, invitation: inv, stats } = await getUserInvitation(invitationId, user);
  const paid = isPaidStatus(order.status);
  const recent = await guestList(inv.id, { limit: 4 });
  const url = `${env.siteUrl}/${inv.slug}`;
  const days = daysUntil(inv.date);
  const flow = (step: "marosim" | "tafsilotlar") => `/buyurtma/${order.id}/${step}?qaytish=kabinet`;

  const statCards = [
    { icon: <Timer1 size={16} />, label: "To‘yga qadar", value: days === null ? "—" : days === 0 ? "Bugun" : `${days} kun`, color: "text-gold" },
    { icon: <TickCircle size={16} />, label: "Boraman", value: `${stats.coming} kishi`, color: "text-success" },
    { icon: <Clock size={16} />, label: "Aniq emas", value: String(stats.maybe), color: "text-gold" },
    { icon: <CloseCircle size={16} />, label: "Kela olmaydi", value: String(stats.notComing), color: "text-muted" },
  ];
  const quick = [
    { icon: <Edit size={16} />, label: "Ismlar va matn", href: flow("marosim") },
    { icon: <Calendar size={16} />, label: "Sana va dastur", href: flow("marosim") },
    { icon: <Location size={16} />, label: "Manzil", href: flow("marosim") },
    { icon: <Gallery size={16} />, label: "Suratlar", href: flow("tafsilotlar") },
    { icon: <Music size={16} />, label: "Musiqa", href: flow("tafsilotlar") },
    { icon: <Link2 size={16} />, label: "Havola manzili", href: `/kabinet/t/${inv.id}/tahrirlash#havola` },
  ];

  return (
    <>
      <InvitationHeader order={order} invitation={inv} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="flex flex-col gap-2.5 rounded-card bg-bg-soft p-4 lg:p-5">
            <span className="flex items-center gap-2 t-body-s text-ink-2">
              <span className={s.color}>{s.icon}</span> {s.label}
            </span>
            <span className="font-serif text-[26px] font-medium leading-[1.2] text-ink lg:text-[30px]">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 xl:flex-row">
        <section className="flex min-w-0 flex-1 flex-col gap-4 rounded-card border border-line bg-bg-base p-5">
          <p className="text-[15px] font-semibold leading-[1.35] text-ink">Taklifnoma havolasi</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <InvitationThumb templateSlug={order.templateSlug} inv={inv} className="hidden w-[94px] sm:block" />
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              {paid ? (
                <>
                  <div className="flex items-center gap-2 rounded-xl bg-bg-soft px-3 py-2.5">
                    <Link2 size={15} className="shrink-0 text-ink-2" />
                    <CopyLink url={url} className="min-w-0 flex-1 justify-between" />
                  </div>
                  <ShareRow url={url} title={`${invTitle(inv)} — taklifnoma`} />
                </>
              ) : (
                <p className="t-body-m text-ink-2">Havola to‘lov tasdiqlangach beriladi.</p>
              )}
            </div>
            {paid && (
              <div className="flex shrink-0 flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/invitations/${inv.id}/qr?format=svg`} alt="Taklifnoma QR kodi" width={96} height={96} className="size-24" />
                <a href={`/api/invitations/${inv.id}/qr?format=png&download`} className="text-[12px] font-medium text-maroon hover:underline">
                  QR kodni yuklash
                </a>
                <a href={`/api/invitations/${inv.id}/qr?format=svg&download`} className="text-[11px] text-ink-2 hover:text-maroon">
                  SVG (bosma uchun)
                </a>
              </div>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-3.5 rounded-card border border-line bg-bg-base p-5 xl:w-[380px]">
          <p className="text-[15px] font-semibold leading-[1.35] text-ink">Tezkor tahrirlash</p>
          <div className="grid grid-cols-3 gap-2.5">
            {quick.map((q) => (
              <Link key={q.label} href={q.href} className="flex flex-col gap-2.5 rounded-[14px] bg-bg-soft p-3.5 transition-colors hover:bg-gold-soft">
                <span className="flex size-[34px] items-center justify-center rounded-full bg-bg-base text-maroon">{q.icon}</span>
                <span className="text-[13px] font-semibold leading-[1.35] text-ink">{q.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-1 rounded-card border border-line bg-bg-base p-5">
        <div className="flex items-center justify-between pb-2">
          <p className="text-[15px] font-semibold leading-[1.35] text-ink">So‘nggi javoblar</p>
          <Link href={`/kabinet/t/${inv.id}/mehmonlar`} className="inline-flex items-center gap-1 text-[12px] font-medium text-maroon hover:underline">
            Barchasi <ArrowRight size={13} />
          </Link>
        </div>
        {recent.list.length === 0 ? (
          <p className="border-t border-line py-4 t-body-m text-ink-2">
            {paid ? "Hali javoblar yo‘q. Havolani mehmonlarga yuboring — javoblar shu yerda ko‘rinadi." : "Sayt ochilgach, mehmonlar javobi shu yerda ko‘rinadi."}
          </p>
        ) : (
          recent.list.map((g) => {
            const v = rsvpView[g.status];
            return (
              <div key={g.id} className="flex items-center gap-3 border-t border-line py-2.5">
                <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-gold-soft text-[12px] font-semibold text-maroon">{initials(g.name)}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{g.name}</span>
                <StatusBadge tone={v.tone}>{g.status === "coming" ? `${v.label} · ${g.count} kishi` : v.label}</StatusBadge>
                <span className="hidden w-[90px] text-right text-[11px] text-ink-2 sm:block">{relativeTime(g.createdAt)}</span>
              </div>
            );
          })
        )}
      </section>
    </>
  );
}
