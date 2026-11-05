"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ArrowRight, Calendar, CloseCircle, Clock, Edit, Gallery, Link2, Location, Music, Timer1, TickCircle } from "@/components/icons";
import { StatusBadge } from "@/components/ui";
import { InvitationHeader, invTitle } from "../InvitationHeader";
import { InvitationThumb } from "../InvitationThumb";
import { CopyLink, ShareRow } from "../LinkActions";
import { isPaidStatus } from "@/lib/types";
import { useInvitationData, useSiteUrl } from "../data";
import { daysUntil, initials, relativeTime, rsvpView } from "@/lib/display";

/** QR kod — brauzerda yaratiladi (SVG ko‘rinish, PNG/SVG yuklab olish) */
function QrBlock({ url, slug }: { url: string; slug: string }) {
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
        <span role="img" aria-label="Taklifnoma QR kodi" className="block size-24 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <span className="block size-24 rounded-lg bg-bg-soft" />
      )}
      <button type="button" onClick={png} className="text-[12px] font-medium text-maroon hover:underline">
        QR kodni yuklash
      </button>
      <button type="button" onClick={svgDl} className="text-[11px] text-ink-2 hover:text-maroon">
        SVG (bosma uchun)
      </button>
    </div>
  );
}

export function OverviewPage() {
  const { data } = useInvitationData();
  const siteUrl = useSiteUrl();
  const { order, invitation: inv, stats } = data;
  const paid = isPaidStatus(order.status);
  const recent = { list: (data.recent ?? []).slice(0, 4) };
  const url = `${siteUrl}/${inv.slug}/`;
  const days = daysUntil(inv.date);
  const flow = (step: "marosim" | "tafsilotlar") => `/buyurtma/${order.id}/${step}/?qaytish=kabinet`;

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
    { icon: <Link2 size={16} />, label: "Havola manzili", href: `/kabinet/t/${inv.id}/tahrirlash/#havola` },
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
            {paid && <QrBlock url={url} slug={inv.slug} />}
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
          <Link href={`/kabinet/t/${inv.id}/mehmonlar/`} className="inline-flex items-center gap-1 text-[12px] font-medium text-maroon hover:underline">
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
