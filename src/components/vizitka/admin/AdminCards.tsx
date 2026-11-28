"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApi } from "@/lib/client";
import type { OrderStatus } from "@/lib/types";
import { AdminError, AdminLoading, AdminRefreshProvider, AdminTitle, Empty, fmtDateTime } from "@/components/admin/shared";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { useReloadCounts } from "@/components/admin/AdminShell";
import { DeleteOrder, PriceEdit, orderStatuses, priceEditable, statusLabel } from "@/components/admin/orderBits";
import { StatusBadge } from "@/components/ui";
import { ExportSquare, SearchNormal1 } from "@/components/icons";
import { formatPhoneDisplay } from "@/lib/display";
import { formatPrice } from "@/lib/format";
import { CARD_DESIGNS, cardDesign } from "@/lib/cards";
import { CARD_API, CARD_PAGES, loc, type AdminCardsResponse } from "@/lib/cardTypes";
import { cardStatusView, isCardLive } from "../site/shared";
import { CardThumb } from "../cabinet/CardsPage";

/** Ro‘yxat filtri: guruhlar + aniq holatlar */
const FILTERS: [string, string][] = [["paid", "To‘langan (faol)"], ["unpaid", "To‘lanmagan"], ...orderStatuses.map((s) => [s, statusLabel[s]] as [string, string])];

export function AdminCards() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const sp = useSearchParams();
  const router = useRouter();
  const reloadCounts = useReloadCounts();
  const status = FILTERS.some(([k]) => k === sp.get("status")) ? (sp.get("status") as string) : "";
  const design = cardDesign(sp.get("design") ?? "") ? (sp.get("design") as string) : "";
  const q = (sp.get("q") ?? "").trim();
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const qs = (over: Record<string, string | number | undefined> = {}) => {
    const s = new URLSearchParams();
    const v = { q, status, design, page: page > 1 ? page : undefined, ...over };
    for (const [k, x] of Object.entries(v)) if (x !== undefined && x !== "" && !(k === "page" && Number(x) <= 1)) s.set(k, String(x));
    return s.toString();
  };
  const { data, loading, error, reload } = useApi<AdminCardsResponse>(`${CARD_API.admin}?${qs({ page })}`);
  const rows = data?.cards ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;
  const go = (over: Record<string, string | number | undefined>) => {
    const s = qs(over);
    router.push(`${CARD_PAGES.admin}${s ? `?${s}` : ""}`);
  };

  return (
    <>
      <AdminTitle title="Vizitkalar" sub={`${total} ta vizitka`} />
      <form
        className="mb-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          go({ q: String(f.get("q") ?? "").trim(), status: String(f.get("status") ?? ""), design: String(f.get("design") ?? ""), page: undefined });
        }}
      >
        <label className="relative flex min-w-[220px] flex-1 items-center">
          <SearchNormal1 size={16} className="pointer-events-none absolute left-3.5 text-ink-2" />
          <input key={q} name="q" defaultValue={q} placeholder="Kod, ism, telefon, email yoki havola" className="h-11 w-full rounded-full border border-line bg-bg-base pl-10 pr-4 t-body-m text-ink outline-none focus:border-maroon/55" />
        </label>
        <select key={`s${status}`} name="status" defaultValue={status} className="h-11 rounded-full border border-line bg-bg-base px-4 t-body-m text-ink outline-none">
          <option value="">Barcha holatlar</option>
          {FILTERS.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <select key={`d${design}`} name="design" defaultValue={design} className="h-11 rounded-full border border-line bg-bg-base px-4 t-body-m text-ink outline-none">
          <option value="">Barcha dizaynlar</option>
          {CARD_DESIGNS.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary btn-sm">
          Qidirish
        </button>
        {(q || status || design) && (
          <button type="button" onClick={() => router.push(CARD_PAGES.admin)} className="btn btn-secondary btn-sm">
            Tozalash
          </button>
        )}
      </form>

      {loading && !data ? (
        <AdminLoading />
      ) : error && !data ? (
        <AdminError message={error.message} onRetry={() => reload()} />
      ) : rows.length === 0 ? (
        <Empty>Hech narsa topilmadi</Empty>
      ) : (
        <AdminRefreshProvider value={() => (reload(true), reloadCounts())}>
          <div className="overflow-x-auto rounded-panel border border-line">
            <table className="w-full min-w-[1120px] text-left [&_td:first-child]:whitespace-nowrap">
              <thead className="bg-bg-soft t-annotation text-ink-2">
                <tr>
                  {["Kod", "Vizitka", "Dizayn", "Holat", "Summa", "Tushum", "Statistika", "Yaratilgan", "Egasi", ""].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((c) => {
                  const v = cardStatusView[c.status];
                  const live = isCardLive(c.status) || c.status === "archived";
                  const detail = `${CARD_PAGES.admin}b/?id=${c.id}`;
                  const phone = c.ownerPhone || c.phone;
                  return (
                    <tr key={c.id} className="align-middle t-body-m text-ink">
                      <td className="px-4 py-3 font-semibold">
                        <Link href={detail} className="text-maroon hover:underline">
                          {c.code}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <CardThumb c={c} className="w-10 !rounded-[8px] [&>span]:hidden" />
                          <div className="flex min-w-0 max-w-[220px] flex-col">
                            <span className="truncate font-medium">{c.fullName || "—"}</span>
                            <span className="truncate t-body-s text-ink-2">{loc(c.position, "uz") || "—"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{cardDesign(c.design)?.name ?? c.design}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1.5">
                          <StatusBadge tone={v.tone}>{v.label}</StatusBadge>
                          <StatusSelect
                            endpoint={`/api/admin/orders/${c.id}`}
                            value={c.status}
                            options={orderStatuses.map((s) => ({ value: s, label: statusLabel[s] }))}
                            confirmFor={["archived", "active", "paid", "draft"]}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <PriceEdit orderId={c.id} initial={c.amount} editable={priceEditable(c.status as OrderStatus)} />
                        {c.promoCode && <span className="block t-body-s text-ink-2">promo: {c.promoCode}</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{live ? formatPrice(c.income || c.amount) : "—"}</td>
                      <td className="px-4 py-3 t-body-s whitespace-nowrap text-ink-2">
                        {live ? (
                          <>
                            {c.views} ko‘rish · {c.vcfDownloads} .vcf
                            <br />
                            {c.leadsTotal} murojaat{c.leadsNew > 0 && <span className="text-maroon"> · {c.leadsNew} yangi</span>}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 t-body-s text-ink-2 whitespace-nowrap">{fmtDateTime(c.createdAt)}</td>
                      <td className="px-4 py-3 t-body-s whitespace-nowrap">
                        {c.userId ? (
                          <Link href={`/admin/foydalanuvchilar/k/?id=${c.userId}`} className="hover:text-maroon">
                            {c.ownerName || (phone ? formatPhoneDisplay(phone) : "—")}
                          </Link>
                        ) : (
                          c.ownerName || "—"
                        )}
                        {phone && (
                          <a href={`tel:${phone}`} className="block text-ink-2 hover:text-maroon">
                            {formatPhoneDisplay(phone)}
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1 t-body-s">
                          {isCardLive(c.status) && (
                            <a href={CARD_PAGES.public(c.slug)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-maroon hover:underline">
                              /v/{c.slug} <ExportSquare size={13} />
                            </a>
                          )}
                          <Link href={detail} className="font-medium text-maroon hover:underline">
                            Batafsil →
                          </Link>
                          <DeleteOrder id={c.id} code={c.code} paid={live} onDone={() => (reload(true), reloadCounts())} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AdminRefreshProvider>
      )}

      {pages > 1 && (
        <div className="mt-5 flex items-center justify-between t-body-s text-ink-2">
          <span>
            {total} tadan {(page - 1) * 30 + 1}–{Math.min(total, page * 30)}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`${CARD_PAGES.admin}?${qs({ page: page - 1 })}`} className="btn btn-secondary btn-sm">
                Oldingi
              </Link>
            )}
            {page < pages && (
              <Link href={`${CARD_PAGES.admin}?${qs({ page: page + 1 })}`} className="btn btn-secondary btn-sm">
                Keyingi
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
