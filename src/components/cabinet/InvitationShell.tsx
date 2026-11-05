"use client";

import type { ReactNode } from "react";
import { isPaidStatus } from "@/lib/types";
import { InvitationNav } from "./InvitationNav";
import { InvitationProvider, NotFoundBox, useInvitationData, useSiteUrl, type SwitcherItem } from "./data";

const wrap = "mx-auto flex max-w-[1440px] flex-col gap-6 px-5 pb-20 pt-6 lg:flex-row lg:gap-10 lg:px-[120px] lg:pb-[100px] lg:pt-10";

function toItem(x: SwitcherItem) {
  const [a, b] = x.names ? x.names.split(" & ") : [x.personA ?? "", x.personB ?? null];
  return { id: x.id, personA: a ?? "", personB: b ?? null, date: x.date, venueName: x.venueName ?? "", status: x.status, templateSlug: x.templateSlug };
}

function Inner({ children }: { children: ReactNode }) {
  const { data } = useInvitationData();
  const siteUrl = useSiteUrl();
  const { order, invitation: inv, stats, switcher } = data;
  const current = {
    id: inv.id,
    personA: inv.personA,
    personB: inv.personB,
    date: inv.date,
    venueName: inv.venueName,
    status: order.status,
    templateSlug: order.templateSlug,
  };
  return (
    <div className={wrap}>
      <InvitationNav
        current={current}
        others={(switcher ?? []).filter((x) => x.id !== inv.id).map(toItem)}
        responses={stats.responses}
        siteUrl={`${siteUrl}/${inv.slug}/`}
        paid={isPaidStatus(order.status)}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-5">{children}</div>
    </div>
  );
}

/** /kabinet/t/<id>/... qobig‘i: kirish + taklifnoma ma’lumoti + chap panel */
export function InvitationShell({ children }: { children: ReactNode }) {
  return (
    <InvitationProvider
      fallback={
        <div className={wrap}>
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <NotFoundBox />
          </div>
        </div>
      }
    >
      <Inner>{children}</Inner>
    </InvitationProvider>
  );
}
