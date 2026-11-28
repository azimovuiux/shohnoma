"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApi, useMe } from "@/lib/client";
import type { Payment } from "@/lib/types";
import { AdminError, AdminLoading, AdminRefreshProvider, Empty, fmtDateTime } from "@/components/admin/shared";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { useReloadCounts } from "@/components/admin/AdminShell";
import { DeleteOrder, IncomeEdit, PriceEdit, orderStatuses, priceEditable, statusLabel } from "@/components/admin/orderBits";
import { StatusBadge } from "@/components/ui";
import { ArrowLeft, Edit, ExportSquare } from "@/components/icons";
import { formatPrice } from "@/lib/format";
import { formatPhoneDisplay } from "@/lib/display";
import { cardDesign } from "@/lib/cards";
import { CARD_API, CARD_LANGS, CARD_PAGES, type AdminCardResponse, type Localized } from "@/lib/cardTypes";
import { cardStatusView, isCardLive } from "../site/shared";
import { LeadItem } from "../cabinet/CardManagePage";
import { cardFlowStart } from "../site/OrderCardButton";

const providerLabel: Record<string, string> = { payme: "Payme", click: "Click", rahmat: "Rahmat", google_pay: "Google Pay", p2p: "Boshqa usul" };
const payStatus: Record<Payment["status"], { label: string; tone: "success" | "pending" | "danger" | "muted" }> = {
  created: { label: "Yaratilgan", tone: "muted" },
  processing: { label: "Jarayonda", tone: "pending" },
  paid: { label: "To‘langan", tone: "success" },
  failed: { label: "O‘tmadi", tone: "danger" },
  cancelled: { label: "Bekor qilingan", tone: "muted" },
  review: { label: "Chek tekshirilmoqda", tone: "pending" },
  rejected: { label: "Rad etilgan", tone: "danger" },
};

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-panel border border-line bg-bg-base p-4 sm:p-5">
      <h2 className="mb-3 font-serif text-[22px] font-light text-ink">{title}</h2>
      {children}
    </section>
  );
}
function Rows({ children }: { children: ReactNode }) {
  return <dl className="flex flex-col divide-y divide-line">{children}</dl>;
}
function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(96px,34%)_minmax(0,1fr)] gap-3 py-2 first:pt-0 last:pb-0">
      <dt className="t-body-s text-ink-2">{k}</dt>
      <dd className="min-w-0 break-words t-body-m text-ink">{children}</dd>
    </div>
  );
}
/** Ko‘p tilli matn: uz / ru / en qatorlari */
function L({ v }: { v: Localized | null | undefined }) {
  const parts = CARD_LANGS.map((l) => [l, v?.[l]?.trim()] as const).filter(([, s]) => s);
  if (!parts.length) return <>—</>;
  return (
    <span className="flex flex-col gap-0.5">
      {parts.map(([l, s]) => (
        <span key={l}>
          <span className="mr-1.5 text-[11px] font-semibold uppercase text-ink-2">{l}</span>
          {s}
        </span>
      ))}
    </span>
  );
}

/** /admin/vizitkalar/b/?id=<buyurtma id yoki kod> */
export function AdminCardDetail() {
  const sp = useSearchParams();
  const router = useRouter();
  const id = (sp.get("id") ?? "").trim();
  const reloadCounts = useReloadCounts();
  const { me } = useMe();
  const { data, loading, error, reload } = useApi<AdminCardResponse>(id ? CARD_API.adminCard(id) : null);
  const refresh = () => (reload(true), reloadCounts());

  if (!id) return <Empty>Vizitka tanlanmagan</Empty>;
  if (loading && !data) return <AdminLoading />;
  if (!data) return <AdminError message={error?.message} onRetry={() => reload()} />;

  const { order, card, owner, payments, leads } = data;
  const d = cardDesign(card.design);
  const v = cardStatusView[order.status];
  const live = isCardLive(order.status);
  const paidLike = live || order.status === "archived";

  return (
    <AdminRefreshProvider value={refresh}>
      <Link href={CARD_PAGES.admin} className="mb-4 inline-flex items-center gap-1.5 t-body-s text-ink-2 hover:text-maroon">
        <ArrowLeft size={15} /> Barcha vizitkalar
      </Link>

      <div className="flex flex-col gap-4 rounded-panel border border-line bg-bg-base p-4 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {card.photos[0] && <img src={card.photos[0]} alt="" className="h-[88px] w-[66px] shrink-0 rounded-[12px] object-cover" />}
          <div className="min-w-0">
            <p className="t-body-s text-ink-2">
              Vizitka <b className="font-semibold text-ink">{order.code}</b> · {d?.name ?? card.design}
            </p>
            <h1 className="mt-1 break-words font-serif text-[30px] font-light leading-tight text-ink sm:text-[36px]">{card.fullName || "Ism kiritilmagan"}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge tone={v.tone}>{v.label}</StatusBadge>
              {card.position?.uz && <span className="t-body-s text-ink-2">{card.position.uz}</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Link href={cardFlowStart(order.id)} className="btn btn-primary btn-sm">
            <Edit size={15} /> Tahrirlash
          </Link>
          {live && (
            <a href={CARD_PAGES.public(card.slug)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
              Vizitkani ochish <ExportSquare size={14} />
            </a>
          )}
          {live && (
            <a href={CARD_API.vcard(card.slug)} className="btn btn-secondary btn-sm">
              .vcf
            </a>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card title="Vizitka ma’lumotlari">
            <Rows>
              <Row k="Havola">{live ? <a href={CARD_PAGES.public(card.slug)} target="_blank" rel="noopener noreferrer" className="text-maroon hover:underline">/v/{card.slug}</a> : <span className="text-ink-2">/v/{card.slug} (to‘lovdan keyin)</span>}</Row>
              <Row k="Lavozim"><L v={card.position} /></Row>
              <Row k="Kompaniya"><L v={card.company} /></Row>
              <Row k="Qisqa tavsif"><L v={card.bio} /></Row>
              <Row k="Telefon">{card.phone ? <a href={`tel:${card.phone}`} className="hover:text-maroon">{formatPhoneDisplay(card.phone)}</a> : "—"}</Row>
              {card.whatsapp && <Row k="WhatsApp">{formatPhoneDisplay(card.whatsapp)}</Row>}
              <Row k="Email">{card.email || "—"}</Row>
              <Row k="Telegram">{card.telegram || "—"}</Row>
              <Row k="Veb-sayt">{card.website ? <a href={card.website} target="_blank" rel="noopener noreferrer" className="break-all text-maroon hover:underline">{card.website}</a> : "—"}</Row>
              <Row k="Manzil"><L v={card.address} /></Row>
              <Row k="Bo‘limlar">
                {[
                  card.directions.length && `${card.directions.length} yo‘nalish`,
                  card.stats.length && `${card.stats.length} raqam`,
                  card.companies.length && `${card.companies.length} kompaniya`,
                  card.socials.length && `${card.socials.length} ijtimoiy tarmoq`,
                  card.links.length && `${card.links.length} havola`,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </Row>
              <Row k="Murojaat formasi">{card.leadForm ? "Yoqilgan" : "O‘chirilgan"}</Row>
            </Rows>
            {card.photos.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {card.photos.map((p) => (
                  <a key={p} href={p} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p} alt="" className="h-20 w-16 rounded-[10px] object-cover ring-1 ring-line" />
                  </a>
                ))}
              </div>
            )}
          </Card>

          <Card title={`Murojaatlar (${leads.length})`}>
            {leads.length === 0 ? (
              <p className="t-body-s text-ink-2">Murojaat yo‘q.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {leads.map((l) => (
                  <LeadItem key={l.id} lead={l} />
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card title="Buyurtma">
            <Rows>
              <Row k="Holat">
                <StatusSelect
                  endpoint={`/api/admin/orders/${order.id}`}
                  value={order.status}
                  options={orderStatuses.map((s) => ({ value: s, label: statusLabel[s] }))}
                  confirmFor={["archived", "active", "paid", "draft"]}
                />
              </Row>
              <Row k="Summa">
                <PriceEdit key={order.amount} orderId={order.id} initial={order.amount} editable={priceEditable(order.status)} />
              </Row>
              {paidLike && (
                <Row k="Tushum">
                  <IncomeEdit key={`${order.id}-${order.income}`} orderId={order.id} initial={order.income || order.amount} editable={!!me?.user?.isSuperadmin} />
                  {!me?.user?.isSuperadmin && <span className="ml-1.5 t-body-s text-ink-2">(tuzatish — super admin)</span>}
                </Row>
              )}
              {order.promoCode && (
                <Row k="Promokod">
                  {order.promoCode} · −{formatPrice(order.promoDiscount ?? 0)}
                </Row>
              )}
              <Row k="Yaratilgan">{fmtDateTime(order.createdAt)}</Row>
              <Row k="To‘langan">{order.paidAt ? fmtDateTime(order.paidAt) : "—"}</Row>
              <Row k="Yangilangan">{fmtDateTime(card.updatedAt)}</Row>
              <Row k="Ko‘rishlar">{card.views}</Row>
              <Row k="Kontakt saqlangan">{card.vcfDownloads}</Row>
            </Rows>
            {!paidLike && <p className="mt-3 t-body-s text-ink-2">Qo‘lda faollashtirish: holatni «To‘langan» ga o‘zgartiring — vizitka ochiladi va egasiga xabar boradi.</p>}
          </Card>

          <Card title="Egasi">
            {owner ? (
              <Rows>
                <Row k="Ism">
                  <Link href={`/admin/foydalanuvchilar/k/?id=${owner.id}`} className="text-maroon hover:underline">
                    {owner.name || "—"}
                  </Link>
                </Row>
                <Row k="Telefon">{owner.phone ? <a href={`tel:${owner.phone}`} className="hover:text-maroon">{formatPhoneDisplay(owner.phone)}</a> : "—"}</Row>
                {owner.telegramUser && <Row k="Telegram">@{owner.telegramUser.replace(/^@/, "")}</Row>}
              </Rows>
            ) : (
              <p className="t-body-s text-ink-2">Mehmon buyurtmasi (akkauntsiz).</p>
            )}
          </Card>

          <Card title={`To‘lovlar (${payments.length})`}>
            {payments.length === 0 ? (
              <p className="t-body-s text-ink-2">To‘lov urinishi yo‘q.</p>
            ) : (
              <ul className="divide-y divide-line">
                {payments.map((p) => (
                  <li key={p.id} className="flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="t-body-m text-ink">
                        {providerLabel[p.provider] ?? p.provider} · {formatPrice(p.amount)}
                      </span>
                      <StatusBadge tone={payStatus[p.status]?.tone ?? "muted"}>{payStatus[p.status]?.label ?? p.status}</StatusBadge>
                    </div>
                    <span className="t-body-s text-ink-2">
                      {fmtDateTime(p.createdAt)}
                      {p.paidAt ? ` · to‘langan ${fmtDateTime(p.paidAt)}` : ""}
                    </span>
                    {p.receiptUrl && (
                      <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" className="t-body-s text-maroon hover:underline">
                        Chekni ko‘rish
                      </a>
                    )}
                    {p.reviewNote && <span className="t-body-s text-danger">{p.reviewNote}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Xavfli amallar">
            <p className="mb-2 t-body-s text-ink-2">Buyurtma, vizitka, murojaatlar va to‘lov yozuvlari butunlay o‘chadi.</p>
            <DeleteOrder id={order.id} code={order.code} paid={paidLike} onDone={() => (reloadCounts(), router.push(CARD_PAGES.admin))} />
          </Card>
        </div>
      </div>
    </AdminRefreshProvider>
  );
}
