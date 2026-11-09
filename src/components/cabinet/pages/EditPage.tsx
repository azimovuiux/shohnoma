"use client";

import Link from "@/components/LocalLink";
import { isPaidStatus } from "@/lib/types";
import { useInvitationData, useSiteUrl } from "../data";
import { ArrowRight, Calendar, Edit, Gallery, Location, Music, Profile2User, User } from "@/components/icons";
import { InvitationHeader } from "../InvitationHeader";
import { SlugEditor } from "../SlugEditor";
import { splitDate } from "@/lib/display";
import { useT } from "@/lib/i18n";

export function EditPage() {
  const t = useT();
  const { data, reload } = useInvitationData();
  const siteUrl = useSiteUrl();
  const { order, invitation: inv } = data;
  const d = splitDate(inv.date);
  const locked = order.status === "archived";
  const flow = (step: string) => `/buyurtma/${order.id}/${step}/?qaytish=kabinet`;

  const sections = [
    {
      href: flow("marosim"),
      title: t("Marosim ma’lumotlari"),
      desc: t("Ismlar, sana va vaqt, marosim joyi va manzil"),
      rows: [
        { icon: <User size={16} />, v: [inv.personA, inv.personB].filter(Boolean).join(" & ") || "—" },
        { icon: <Calendar size={16} />, v: d ? `${d.day}${d.time ? `, ${d.time}` : ""}` : "—" },
        { icon: <Location size={16} />, v: [inv.venueName, inv.address].filter(Boolean).join(", ") || "—" },
      ],
    },
    {
      href: flow("tafsilotlar"),
      title: t("Tafsilotlar"),
      desc: t("Taklif matni, suratlar, imkoniyatlar va aloqa"),
      rows: [
        { icon: <Edit size={16} />, v: inv.message ? `“${inv.message.slice(0, 70)}${inv.message.length > 70 ? "…" : ""}”` : "—" },
        { icon: <Gallery size={16} />, v: t("{n} ta surat", { n: (inv.photos ?? []).length }) },
        { icon: <Profile2User size={16} />, v: `${t("Mehmonlar javobi")}: ${inv.rsvpEnabled ? t("yoqilgan") : t("o‘chirilgan")}` },
        { icon: <Music size={16} />, v: `${t("Fon musiqasi")}: ${inv.musicEnabled ? t("yoqilgan") : t("o‘chirilgan")}` },
      ],
    },
  ];

  return (
    <>
      <InvitationHeader order={order} invitation={inv} title={t("Tahrirlash")} />
      <div className="grid gap-4 xl:grid-cols-2">
        {sections.map((s) => (
          <section key={s.title} className="flex flex-col gap-4 rounded-card border border-line bg-bg-base p-5">
            <div className="flex flex-col gap-1">
              <p className="text-[15px] font-semibold leading-[1.35] text-ink">{s.title}</p>
              <p className="t-body-s text-ink-2">{s.desc}</p>
            </div>
            <ul className="flex flex-col gap-2">
              {s.rows.map((r, i) => (
                <li key={i} className="flex items-start gap-2.5 rounded-xl bg-bg-soft px-3 py-2.5 t-body-m text-ink">
                  <span className="mt-0.5 text-gold">{r.icon}</span>
                  <span className="min-w-0 break-words">{r.v}</span>
                </li>
              ))}
            </ul>
            {locked ? (
              <span className="t-body-s text-ink-2">{t("Arxivlangan taklifnomani tahrirlab bo‘lmaydi")}</span>
            ) : (
              <Link href={s.href} className="btn btn-secondary w-fit !py-3">
                <Edit size={16} /> {t("Tahrirlash")} <ArrowRight size={15} />
              </Link>
            )}
          </section>
        ))}
      </div>
      <SlugEditor key={inv.slug} orderId={order.id} slug={inv.slug} host={siteUrl.replace(/^https?:\/\//, "")} enabled={isPaidStatus(order.status)} onSaved={() => reload(true)} />
    </>
  );
}
