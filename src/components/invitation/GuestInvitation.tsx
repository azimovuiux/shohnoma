"use client";

import Link from "@/components/LocalLink";
import { useEffect, useState } from "react";
import { LocaleProvider, tr, useLocale } from "@/lib/i18n";
import { PageLoading, useApi, useFirstSegment } from "@/lib/client";
import type { Invitation } from "@/lib/types";
import { getTemplate } from "@/lib/templates";
import { star8Path } from "@/lib/ornament";
import { InvitationSite } from "./InvitationSite";
import { inviteLang, toInvitationData } from "./data";

type PublicResponse = { ok: boolean; invitation: Invitation; templateSlug: string; archived: boolean };

function Shell({ title, text, names }: { title: string; text: string; names?: string }) {
  const lang = useLocale();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg-base px-6 text-center">
      <svg viewBox="0 0 200 200" className="size-40" aria-hidden>
        <path d={star8Path(100, 100, 92)} fill="none" stroke="var(--color-gold)" strokeOpacity="0.5" />
        <path d={star8Path(100, 100, 12)} fill="var(--color-gold)" />
      </svg>
      {names && <p className="mt-6 font-script text-[40px] leading-tight text-maroon">{names}</p>}
      <h1 className="mt-2 font-cormorant text-[32px] font-light text-ink">{tr(lang, title)}</h1>
      <p className="t-body-m mt-3 max-w-[360px] text-ink-2">{tr(lang, text)}</p>
      <Link href="/" className="btn btn-secondary mt-8">
        Shohnoma.uz
      </Link>
    </main>
  );
}

/** /<slug>/ — mehmon ko‘radigan taklifnoma (ma’lumot brauzerda yuklanadi) */
export function GuestInvitation() {
  const slug = useFirstSegment();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const valid = !!slug && /^[a-z0-9][a-z0-9-]{1,79}$/.test(slug);
  const { data, error } = useApi<PublicResponse>(valid ? `/api/i/${slug}` : null);
  const template = data ? getTemplate(data.templateSlug) : undefined;
  const lang = inviteLang(data?.invitation.extra, useLocale());

  useEffect(() => {
    if (!template) return;
    const meta = document.querySelector('meta[name="theme-color"]') ?? document.head.appendChild(Object.assign(document.createElement("meta"), { name: "theme-color" }));
    meta.setAttribute("content", template.theme.bg[0]);
    if (data) {
      const names = [data.invitation.personA, data.invitation.personB].filter(Boolean).join(" & ");
      document.title = tr(lang, "{names} — taklifnoma", { names });
    }
  }, [template, data, lang]);

  if (!mounted) return <PageLoading className="min-h-dvh" />;
  if (!valid || error || (data && !template))
    return (
      <Shell
        title="Taklifnoma topilmadi"
        text="Havola eskirgan yoki xato yozilgan bo‘lishi mumkin. Taklifnomani yuborgan odamdan havolani qayta so‘rang."
      />
    );
  if (!data || !template) return <PageLoading className="min-h-dvh" />;
  if (data.archived)
    return (
      <LocaleProvider locale={lang}>
        <Shell
          names={[data.invitation.personA, data.invitation.personB].filter(Boolean).join(" & ")}
          title="Bu taklifnoma arxivlangan"
          text="Marosim o‘tib ketgan, shuning uchun sahifa endi faol emas. Ishtirokingiz uchun rahmat!"
        />
      </LocaleProvider>
    );
  return <InvitationSite template={template} data={toInvitationData(data.invitation)} mode="live" />;
}
