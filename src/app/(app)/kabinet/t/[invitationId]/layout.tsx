import { requireUser } from "@/server/auth";
import { getUserInvitation, invitationSwitcherList } from "@/server/cabinet";
import { isPaidStatus } from "@/server/orders";
import { env } from "@/server/env";
import { InvitationNav } from "@/components/cabinet/InvitationNav";

export default async function InvitationLayout({ children, params }: { children: React.ReactNode; params: Promise<{ invitationId: string }> }) {
  const { invitationId } = await params;
  const user = await requireUser(`/kabinet/t/${invitationId}`);
  const { order, invitation, stats } = await getUserInvitation(invitationId, user);
  const all = await invitationSwitcherList(order.userId ?? user.id);
  const toItem = (x: { id: string; personA: string; personB: string | null; date: string; status: string; templateSlug: string }, venue = "") => ({ ...x, venueName: venue });
  const current = toItem({ id: invitation.id, personA: invitation.personA, personB: invitation.personB, date: invitation.date, status: order.status, templateSlug: order.templateSlug }, invitation.venueName);
  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 pb-20 pt-6 lg:flex-row lg:gap-10 lg:px-[120px] lg:pb-[100px] lg:pt-10">
      <InvitationNav
        current={current}
        others={all.filter((x) => x.id !== invitation.id).map((x) => toItem(x))}
        responses={stats.responses}
        siteUrl={`${env.siteUrl}/${invitation.slug}`}
        paid={isPaidStatus(order.status)}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-5">{children}</div>
    </div>
  );
}
