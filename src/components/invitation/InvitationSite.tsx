"use client";

import type { InvitationSiteProps } from "./types";

/** VAQTINCHALIK: to‘liq taklifnoma sayti alohida bosqichda yoziladi (spec §7). */
export function InvitationSite({ template, data }: InvitationSiteProps) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-2 p-6 text-center" style={{ background: template.theme.bg[0], color: template.theme.ink }}>
      <p className="font-script text-4xl">
        {data.personA}
        {data.personB ? ` & ${data.personB}` : ""}
      </p>
      <p>{data.date}</p>
    </div>
  );
}
