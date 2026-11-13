"use client";

import Link from "@/components/LocalLink";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ArrowRight, Calendar, CloseCircle, Clock, Edit, Gallery, Link2, Location, Music, Star1, Timer1, TickCircle } from "@/components/icons";
import { StatusBadge } from "@/components/ui";
import { InvitationHeader } from "../InvitationHeader";
import { InvitationThumb } from "../InvitationThumb";
import { CopyLink } from "../LinkActions";
import { ShareInvite, useShareCardSync } from "@/components/share/ShareInvite";
import { isPaidStatus } from "@/lib/types";
import { relTime, useInvitationData, useSiteUrl } from "../data";
import { daysUntil, initials, rsvpView } from "@/lib/display";
import { useLocale, useT } from "@/lib/i18n";

/**
 * Shaxsiy havolalar endi «Maxsus mehmonlar» tabida (server: kim ochgani va javobi kuzatiladi).
 * Avval shu brauzerda yaratilgan ?m=Ism havolalari ishlayveradi — tabda ularni ro‘yxatga ko‘chirish taklif qilinadi.
 */
function SpecialGuestsLink({ invitationId, total, opened }: { invitationId: string; total: number; opened: number }) {
  const t = useT();
  return (
    <Link
      href={`/kabinet/t/${invitationId}/mehmonlar/?tab=maxsus`}
      className="group flex items-center gap-3 rounded-xl border border-line px-3.5 py-3 transition-colors hover:border-maroon/40 hover:bg-bg-soft"
    >
      <span className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-gold-soft text-maroon">
        <Star1 size={17} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="t-body-m font-semibold text-ink">{t("Maxsus mehmonlar")}</span>
        <span className="text-[12px] text-ink-2">
          {total ? t("{n} ta mehmon · {m} tasi ochgan", { n: total, m: opened }) : t("Ism bilan shaxsiy havola — kim ochganini va javobini ko‘rasiz")}
        </span>
      </span>
      <ArrowRight size={16} className="shrink-0 text-ink-2 transition-transform group-hover:translate-x-0.5 group-hover:text-maroon" />
    </Link>
  );
}

/** QR kod — brauzerda yaratiladi (SVG ko‘rinish, PNG/SVG yuklab olish) */
function QrBlock({ url, slug }: { url: string; slug: string }) {
  const t = useT();
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toString(url, { margin: 2, color: { dark: "#1B1813", light: "#FFFFFF" }, type: "svg" })
      .then(setSvg)
      .catch(() => setSvg(null));
  }, [url]);
  const download = (href: string, name: string) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const png = () =>
    QRCode.toDataURL(url, { margin: 2, color: { dark: "#1B1813", light: "#FFFFFF" }, width: 1024 }).then((d) => download(d, `qr-${slug}.png`));
  const svgDl = () => svg && download(URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })), `qr-${slug}.svg`);
  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      {svg ? (
        <span role="img" aria-label={t("Taklifnoma QR kodi")} className="block size-24 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <span className="block size-24 rounded-lg bg-bg-soft" />
      )}
      <button type="button" onClick={png} className="text-[12px] font-medium text-maroon hover:underline">
        {t("QR kodni yuklash")}
      </button>
      <button type="button" onClick={svgDl} className="text-[11px] text-ink-2 hover:text-maroon">
        {t("SVG (bosma uchun)")}
      </button>
    </div>
  );
}

export function OverviewPage() {
  const t = useT();
  const locale = useLocale();
  const { data } = useInvitationData();
  const siteUrl = useSiteUrl();
  const { order, invitation: inv, stats } = data;
  const paid = isPaidStatus(order.status);
  const recent = { list: (data.recent ?? []).slice(0, 4) };
  const url = `${siteUrl}/${inv.slug}/`;
  const days = daysUntil(inv.date);
  // og:image (ulashish kartasi) eskirgan bo‘lsa — orqa fonda yangilanadi
  useShareCardSync(paid ? { invitationId: inv.id, templateSlug: order.templateSlug, invitation: inv } : null);
  const flow = (step: "marosim" | "tafsilotlar") => `/buyurtma/${order.id}/${step}/?qaytish=kabinet`;

  const statCards = [
    { icon: <Timer1 size={16} />, label: t("To‘yga qadar"), value: days === null ? "—" : days === 0 ? t("Bugun") : t("{n} kun", { n: days }), color: "text-gold" },
    { icon: <TickCircle size={16} />, label: t("Boraman"), value: t("{n} kishi", { n: stats.coming }), color: "text-success" },
    { icon: <Clock size={16} />, label: t("Aniq emas"), value: String(stats.maybe), color: "text-gold" },
    { icon: <CloseCircle size={16} />, label: t("Kela olmaydi"), value: String(stats.notComing), color: "text-danger" },
  ];
  const quick = [
    { icon: <Edit size={16} />, label: t("Ismlar va matn"), href: flow("marosim") },
    { icon: <Calendar size={16} />, label: t("Sana va dastur"), href: flow("marosim") },
    { icon: <Location size={16} />, label: t("Manzil"), href: flow("marosim") },
    { icon: <Gallery size={16} />, label: t("Suratlar"), href: flow("tafsilotlar") },
    { icon: <Music size={16} />, label: t("Musiqa"), href: flow("tafsilotlar") },
    { icon: <Link2 size={16} />, label: t("Havola manzili"), href: `/kabinet/t/${inv.id}/tahrirlash/#havola` },
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
          <p className="text-[15px] font-semibold leading-[1.35] text-ink">{t("Taklifnoma havolasi")}</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <InvitationThumb templateSlug={order.templateSlug} inv={inv} className="hidden w-[94px] sm:block" />
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              {paid ? (
                <>
                  <div className="flex flex-col gap-2">
                    <p className="t-body-s font-semibold text-ink">{t("Umumiy havola")}</p>
                    <div className="flex items-center gap-2 rounded-xl bg-bg-soft px-3 py-2.5">
                      <Link2 size={15} className="shrink-0 text-ink-2" />
                      <CopyLink url={url} className="min-w-0 flex-1 justify-between" />
                    </div>
                    <ShareInvite
                      target={{ invitationId: inv.id, templateSlug: order.templateSlug, invitation: inv, url }}
                      label={t("Taklifnomani ulashish")}
                      className="btn btn-primary btn-sm w-full sm:w-fit"
                    />
                  </div>
                  <div className="mt-2 flex flex-col gap-2 border-t border-line pt-4">
                    <p className="t-body-s font-semibold text-ink">{t("Shaxsiy havola — mehmon ismi bilan")}</p>
                    <p className="-mt-1 text-[12px] text-ink-2">{t("Mehmon ismi bilan ochiladi")}</p>
                    <SpecialGuestsLink invitationId={inv.id} total={data.special?.total ?? 0} opened={data.special?.opened ?? 0} />
                  </div>
                </>
              ) : (
                <p className="t-body-m text-ink-2">{t("Havola to‘lovdan keyin beriladi.")}</p>
              )}
            </div>
            {paid && <QrBlock url={url} slug={inv.slug} />}
          </div>
        </section>

        <section className="flex flex-col gap-3.5 rounded-card border border-line bg-bg-base p-5 xl:w-[380px]">
          <p className="text-[15px] font-semibold leading-[1.35] text-ink">{t("Tezkor tahrirlash")}</p>
          <div className="grid grid-cols-3 gap-2.5">
            {quick.map((q) => (
              <Link key={q.label} href={q.href} className="flex flex-col gap-2.5 rounded-[14px] bg-bg-soft p-3.5 transition-colors hover:bg-gold-soft">
                <span className="flex size-[34px] items-center justify-center rounded-full bg-bg-base text-maroon">{q.icon}</span>
                <span className="text-[13px] font-semibold leading-[1.35] text-ink [overflow-wrap:anywhere] hyphens-auto">{q.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-1 rounded-card border border-line bg-bg-base p-5">
        <div className="flex items-center justify-between pb-2">
          <p className="text-[15px] font-semibold leading-[1.35] text-ink">{t("So‘nggi javoblar")}</p>
          <Link href={`/kabinet/t/${inv.id}/mehmonlar/`} className="inline-flex items-center gap-1 text-[12px] font-medium text-maroon hover:underline">
            {t("Barchasi")} <ArrowRight size={13} />
          </Link>
        </div>
        {recent.list.length === 0 ? (
          <p className="border-t border-line py-4 t-body-m text-ink-2">
            {t("Hali javoblar yo‘q")}
          </p>
        ) : (
          recent.list.map((g) => {
            const v = rsvpView[g.status];
            return (
              <div key={g.id} className="flex items-center gap-3 border-t border-line py-2.5">
                <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-gold-soft text-[12px] font-semibold text-maroon">{initials(g.name)}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{g.name}</span>
                <StatusBadge tone={v.tone}>{g.status === "coming" ? `${t(v.label)} · ${t("{n} kishi", { n: g.count })}` : t(v.label)}</StatusBadge>
                <span className="hidden w-[90px] text-right text-[11px] text-ink-2 sm:block">{relTime(locale, g.createdAt)}</span>
              </div>
            );
          })
        )}
      </section>
    </>
  );
}
