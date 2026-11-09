"use client";

import Link from "@/components/LocalLink";
import { PageLoading, useApi } from "@/lib/client";
import { isPaidStatus, type Invitation, type Order, type Payment, type Stats } from "@/lib/types";
import { useSiteUrl } from "../data";
import { Add, ArrowRight, Clock, Edit, Gallery, Profile2User, SearchNormal1, Trash } from "@/components/icons";
import { StatusBadge, api, confirmDialog, useToast } from "@/components/ui";
import { useMemo, useState } from "react";
import type { OrderStatus } from "@/lib/types";
import { InvitationThumb } from "../InvitationThumb";
import { LiveDevices } from "@/components/order/LiveDevices";
import { toFlowOrder } from "@/components/order/FlowGate";
import { CopyLink, ShareButton } from "../LinkActions";
import { getTemplate, ceremonyLabel, type Ceremony } from "@/lib/templates";
import { orderStatusView, splitDate } from "@/lib/display";
import { useT } from "@/lib/i18n";

const names = (a: string, b: string | null) => [a, b].filter(Boolean).join(" & ");

type Item = { order: Order; invitation: Invitation; stats: Stats; payment: Payment | null };

/** Filtr guruhlari */
type Group = "all" | "active" | "unpaid" | "archived";
const groupOf = (s: OrderStatus): Exclude<Group, "all"> =>
  s === "paid" || s === "active" ? "active" : s === "archived" ? "archived" : "unpaid";
const GROUPS: [Group, string][] = [
  ["all", "Barchasi"],
  ["active", "Faol"],
  ["unpaid", "To‘lov kutilmoqda"],
  ["archived", "Arxiv"],
];
/** Mijoz o‘chira oladigan holatlar (to‘lanmagan, tekshiruvda emas) */
const DELETABLE: OrderStatus[] = ["draft", "pending_payment", "payment_failed", "p2p_rejected"];

export function OrdersPage() {
  const tr = useT();
  const siteUrl = useSiteUrl();
  const toast = useToast();
  const { data, loading, error, reload } = useApi<{ ok: boolean; items: Item[] }>("/api/me/orders");
  const [group, setGroup] = useState<Group>("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  if (loading && !data) return <PageLoading />;
  if (error || !data)
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-line px-6 py-12 text-center">
        <p className="t-body-m text-ink-2">{error?.message ?? tr("Ma’lumotni yuklab bo‘lmadi")}</p>
        <button type="button" onClick={() => reload()} className="btn btn-secondary btn-sm">
          {tr("Qayta urinish")}
        </button>
      </div>
    );
  const all = data.items;
  const count = (g: Group) => (g === "all" ? all.length : all.filter((x) => groupOf(x.order.status) === g).length);
  const needle = q.trim().toLowerCase();
  const list = all.filter(
    (x) =>
      (group === "all" || groupOf(x.order.status) === group) &&
      (!needle || [x.invitation.personA, x.invitation.personB, x.order.code, x.invitation.slug, getTemplate(x.order.templateSlug)?.name].some((v) => v?.toLowerCase().includes(needle))),
  );
  const remove = async (order: Order, title: string) => {
    if (!(await confirmDialog({ title: tr("Buyurtmani o‘chirasizmi?"), text: tr("«{name}» buyurtmasi butunlay o‘chiriladi. Kiritilgan ma’lumotlar qaytarilmaydi.", { name: title }), ok: tr("O‘chirish"), danger: true }))) return;
    setBusy(order.id);
    try {
      await api(`/api/me/orders/${order.id}`, { method: "DELETE" });
      toast(tr("Buyurtma o‘chirildi"));
      await reload(true);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-[34px] font-light leading-[1.04] tracking-[-0.005em] text-ink lg:text-[44px]">{tr("Buyurtmalarim")}</h1>
          <p className="t-body-m text-ink-2">{tr("{n} ta taklifnoma", { n: all.length })}</p>
        </div>
        <Link href="/shablonlar/" className="btn btn-primary !py-[13px] !px-[22px]">
          <Add size={16} /> {tr("Yangi taklifnoma")}
        </Link>
      </div>

      {all.length > 1 && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:px-0" role="tablist" aria-label={tr("Filtr")}>
            {GROUPS.map(([g, l]) => (
              <button
                key={g}
                type="button"
                role="tab"
                aria-selected={group === g}
                onClick={() => setGroup(g)}
                className={`inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-full px-4 t-nav transition-colors ${group === g ? "bg-maroon text-ink-inverse" : "bg-bg-soft text-ink hover:bg-gold-soft"}`}
              >
                {tr(l)} <span className={group === g ? "opacity-80" : "text-ink-2"}>{count(g)}</span>
              </button>
            ))}
          </div>
          <label className="flex h-[42px] items-center gap-2 rounded-full border border-line bg-bg-base px-4 lg:w-[280px]">
            <SearchNormal1 size={16} className="shrink-0 text-ink-2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Ism yoki kod bo‘yicha qidirish")} className="min-w-0 flex-1 bg-transparent t-body-s text-ink outline-none placeholder:text-ink-2" />
          </label>
        </div>
      )}

      {all.length > 0 && list.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-6 py-10 text-center t-body-m text-ink-2">{tr("Bu filtr bo‘yicha buyurtma topilmadi")}</p>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-card border border-line px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-gold-soft text-maroon">
            <Gallery size={24} />
          </span>
          <p className="font-serif text-[30px] font-light text-ink">{tr("Hali taklifnoma yo‘q")}</p>
          <p className="t-body-m max-w-[380px] text-ink-2">{tr("Yoqqan dizaynni tanlang, ma’lumotlaringizni kiriting — taklifnomangiz bir necha daqiqada tayyor.")}</p>
          <Link href="/shablonlar/" className="btn btn-primary">
            {tr("Shablonlarni ko‘rish")} <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        list.map(({ order, invitation: inv, stats, payment }) => {
          const t = getTemplate(order.templateSlug);
          const d = splitDate(inv.date);
          const paid = isPaidStatus(order.status);
          const view = orderStatusView[order.status];
          const url = `${siteUrl}/${inv.slug}/`;
          const title = names(inv.personA, inv.personB) || tr("Yangi taklifnoma");
          const meta = [t?.name, tr(ceremonyLabel[inv.ceremony as Ceremony] ?? ""), d ? `${d.day}${paid && d.time ? `, ${d.time}` : ""}` : null].filter(Boolean).join(" · ");
          return (
            <article key={order.id} className="flex flex-col gap-5 rounded-card border border-line bg-bg-base p-4 sm:flex-row sm:gap-6 sm:p-5">
              <div className="flex flex-col gap-4 sm:contents">
                <OrderMockup order={order} inv={inv} payment={payment} />
                <div className="flex min-w-0 flex-1 flex-col items-start gap-2.5">
                  <StatusBadge tone={view.tone} dot>
                    {tr(view.label)}
                  </StatusBadge>
                  <h2 className="font-serif text-[24px] font-medium leading-[1.2] text-ink sm:text-[28px]">{title}</h2>
                  <p className="text-[13px] leading-[1.5] text-ink-2">{meta}</p>
                  {paid ? (
                    <>
                      <CopyLink url={url} className="max-w-full" />
                      <div className="flex flex-wrap gap-2">
                        {[
                          [stats.coming, tr("boraman")],
                          [stats.maybe, tr("aniq emas")],
                          [stats.notComing, tr("kela olmaydi")],
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
                      <Clock size={15} /> {tr("Ma’lumotlar saqlangan — to‘lovdan so‘ng sayt ochiladi")}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex w-full shrink-0 flex-col gap-2.5 sm:w-[256px]">
                {paid ? (
                  <>
                    <Link href={`/kabinet/t/${inv.id}/`} className="btn btn-primary w-full !py-[13px]">
                      {tr("Boshqarish")} <ArrowRight size={16} />
                    </Link>
                    <div className="flex gap-2">
                      <Link href={`/kabinet/t/${inv.id}/mehmonlar/`} className="btn btn-secondary flex-1 !px-3.5 !py-[13px]">
                        <Profile2User size={16} /> {tr("Mehmonlar javobi")} · {stats.responses}
                      </Link>
                      <ShareButton url={url} title={title} />
                    </div>
                  </>
                ) : order.status === "p2p_review" ? (
                  <Link href={`/buyurtma/${order.id}/tolov/p2p/tekshirilmoqda/`} className="btn btn-secondary w-full !py-[13px]">
                    <Clock size={16} /> {tr("Holatni ko‘rish")}
                  </Link>
                ) : order.status === "archived" ? (
                  <Link href={`/kabinet/t/${inv.id}/`} className="btn btn-secondary w-full !py-[13px]">
                    {tr("Ko‘rish")}
                  </Link>
                ) : (
                  <>
                    <Link href={`/buyurtma/${order.id}/tolov/`} className="btn btn-primary w-full !py-[13px]">
                      <span className="sm:hidden">{tr("To‘lash")}</span>
                      <span className="hidden sm:inline">{tr("To‘lovni davom ettirish")}</span> <ArrowRight size={16} />
                    </Link>
                    <Link href={`/buyurtma/${order.id}/marosim/?qaytish=kabinet`} className="btn btn-secondary w-full !py-[13px]">
                      <Edit size={16} /> {tr("Tahrirlash")}
                    </Link>
                  </>
                )}
                {DELETABLE.includes(order.status) && (
                  <button
                    type="button"
                    disabled={busy === order.id}
                    onClick={() => remove(order, title)}
                    className="inline-flex items-center justify-center gap-1.5 self-center py-1 t-body-s text-ink-2 transition-colors hover:text-danger disabled:opacity-50"
                  >
                    <Trash size={15} /> {busy === order.id ? tr("O‘chirilmoqda…") : tr("O‘chirish")}
                  </button>
                )}
              </div>
            </article>
          );
        })
      )}
    </>
  );
}

/** Kartadagi ko‘rinish: buyurtma sahifasidagi kabi laptop + telefon, mijozning o‘z ma’lumotlari bilan */
function OrderMockup({ order, inv, payment }: { order: Order; inv: Invitation; payment: Payment | null }) {
  const tpl = getTemplate(order.templateSlug);
  const fo = useMemo(() => toFlowOrder({ ok: true, order, invitation: inv, payment, missing: [] }), [order, inv, payment]);
  if (!tpl) return <InvitationThumb templateSlug={order.templateSlug} inv={inv} className="w-[88px] sm:w-[112px]" />;
  return (
    <div className="w-full shrink-0 sm:w-[280px] lg:w-[320px]">
      <LiveDevices template={tpl} live={tpl} order={fo} />
    </div>
  );
}
