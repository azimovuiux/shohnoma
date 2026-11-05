import Link from "next/link";
import { requireUser } from "@/server/auth";
import { listUserOrders } from "@/server/cabinet";
import { env } from "@/server/env";
import { isPaidStatus } from "@/server/orders";
import { Add, ArrowRight, Clock, Edit, Gallery, Profile2User } from "@/components/icons";
import { StatusBadge } from "@/components/ui";
import { InvitationThumb } from "@/components/cabinet/InvitationThumb";
import { CopyLink, ShareButton } from "@/components/cabinet/LinkActions";
import { getTemplate, ceremonyLabel, type Ceremony } from "@/lib/templates";
import { orderStatusView, splitDate } from "@/lib/display";

export const metadata = { title: "Buyurtmalarim", robots: { index: false } };

const names = (a: string, b: string | null) => [a, b].filter(Boolean).join(" & ") || "Yangi taklifnoma";

export default async function OrdersPage() {
  const user = await requireUser("/kabinet");
  const list = await listUserOrders(user.id);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-[34px] font-light leading-[1.04] tracking-[-0.005em] text-ink lg:text-[44px]">Buyurtmalarim</h1>
          <p className="t-body-m text-ink-2">{list.length} ta taklifnoma</p>
        </div>
        <Link href="/shablonlar" className="btn btn-primary !py-[13px] !px-[22px]">
          <Add size={16} /> Yangi taklifnoma
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-card border border-line px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-gold-soft text-maroon">
            <Gallery size={24} />
          </span>
          <p className="font-serif text-[30px] font-light text-ink">Hali taklifnoma yo‘q</p>
          <p className="t-body-m max-w-[380px] text-ink-2">Yoqqan dizaynni tanlang, ma’lumotlaringizni kiriting — taklifnomangiz bir necha daqiqada tayyor.</p>
          <Link href="/shablonlar" className="btn btn-primary">
            Shablonlarni ko‘rish <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        list.map(({ order, invitation: inv, stats }) => {
          const t = getTemplate(order.templateSlug);
          const d = splitDate(inv.date);
          const paid = isPaidStatus(order.status);
          const view = orderStatusView[order.status];
          const url = `${env.siteUrl}/${inv.slug}`;
          const title = names(inv.personA, inv.personB);
          const meta = [t?.name, ceremonyLabel[inv.ceremony as Ceremony], d ? `${d.day}${paid && d.time ? `, ${d.time}` : ""}` : null].filter(Boolean).join(" · ");
          return (
            <article key={order.id} className="flex flex-col gap-5 rounded-card border border-line bg-bg-base p-4 sm:flex-row sm:gap-6 sm:p-5">
              <div className="flex gap-4 sm:contents">
                <InvitationThumb templateSlug={order.templateSlug} inv={inv} className="w-[88px] sm:w-[112px]" />
                <div className="flex min-w-0 flex-1 flex-col items-start gap-2.5">
                  <StatusBadge tone={view.tone} dot>
                    {view.label}
                  </StatusBadge>
                  <h2 className="font-serif text-[24px] font-medium leading-[1.2] text-ink sm:text-[28px]">{title}</h2>
                  <p className="text-[13px] leading-[1.5] text-ink-2">{meta}</p>
                  {paid ? (
                    <>
                      <CopyLink url={url} className="max-w-full" />
                      <div className="flex flex-wrap gap-2">
                        {[
                          [stats.coming, "boraman"],
                          [stats.maybe, "aniq emas"],
                          [stats.notComing, "kela olmaydi"],
                        ].map(([n, l]) => (
                          <span key={l as string} className="flex items-baseline gap-1.5 rounded-[10px] bg-bg-soft px-2.5 py-1.5">
                            <span className="t-title text-ink">{n}</span>
                            <span className="text-[11px] text-ink-2">{l}</span>
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="flex items-center gap-2 t-body-s text-pending">
                      <Clock size={15} /> Ma’lumotlar saqlangan — to‘lovdan so‘ng sayt ochiladi
                    </p>
                  )}
                </div>
              </div>
              <div className="flex w-full shrink-0 flex-col gap-2.5 sm:w-[256px]">
                {paid ? (
                  <>
                    <Link href={`/kabinet/t/${inv.id}`} className="btn btn-primary w-full !py-[13px]">
                      Boshqarish <ArrowRight size={16} />
                    </Link>
                    <div className="flex gap-2">
                      <Link href={`/kabinet/t/${inv.id}/mehmonlar`} className="btn btn-secondary flex-1 !px-3.5 !py-[13px]">
                        <Profile2User size={16} /> Mehmonlar javobi · {stats.responses}
                      </Link>
                      <ShareButton url={url} title={title} />
                    </div>
                  </>
                ) : order.status === "p2p_review" ? (
                  <Link href={`/buyurtma/${order.id}/tolov/p2p/tekshirilmoqda`} className="btn btn-secondary w-full !py-[13px]">
                    <Clock size={16} /> Holatni ko‘rish
                  </Link>
                ) : order.status === "archived" ? (
                  <Link href={`/kabinet/t/${inv.id}`} className="btn btn-secondary w-full !py-[13px]">
                    Ko‘rish
                  </Link>
                ) : (
                  <>
                    <Link href={`/buyurtma/${order.id}/tolov`} className="btn btn-primary w-full !py-[13px]">
                      <span className="sm:hidden">To‘lash</span>
                      <span className="hidden sm:inline">To‘lovni davom ettirish</span> <ArrowRight size={16} />
                    </Link>
                    <Link href={`/buyurtma/${order.id}/marosim?qaytish=kabinet`} className="btn btn-secondary w-full !py-[13px]">
                      <Edit size={16} /> Tahrirlash
                    </Link>
                  </>
                )}
              </div>
            </article>
          );
        })
      )}
    </>
  );
}
