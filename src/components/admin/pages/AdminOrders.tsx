"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApi } from "@/lib/client";
import type { Invitation, Order, OrderStatus } from "@/lib/types";
import { AdminError, AdminLoading, AdminRefreshProvider, AdminTitle, Empty, fmtDateTime } from "../shared";
import { StatusSelect } from "../StatusSelect";
import { useReloadCounts } from "../AdminShell";
import { StatusBadge, Toggle, api, confirmDialog, useToast } from "@/components/ui";
import { Edit, ExportSquare, SearchNormal1, Trash } from "@/components/icons";
import { formatPrice } from "@/lib/format";
import { formatPhoneDisplay, orderStatusView, splitDate } from "@/lib/display";
import { getTemplate } from "@/lib/templates";
import { useTemplates } from "@/lib/useTemplates";

const PAGE = 30;
const orderStatuses: OrderStatus[] = ["draft", "pending_payment", "payment_processing", "p2p_review", "p2p_rejected", "payment_failed", "paid", "active", "archived"];
type Row = { order: Order; invitation: Invitation; owner: { phone: string | null; name: string | null; telegramUser?: string | null } | null };

const statusLabel: Record<OrderStatus, string> = {
  draft: "Qoralama",
  pending_payment: "To‘lov kutilmoqda",
  payment_processing: "To‘lov jarayonida",
  p2p_review: "Chek tekshirilmoqda",
  p2p_rejected: "Chek rad etilgan",
  payment_failed: "To‘lov o‘tmadi",
  paid: "To‘langan",
  active: "Faol",
  archived: "Arxiv",
};

export function AdminOrders() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <OrdersInner />
    </Suspense>
  );
}

function OrdersInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const reloadCounts = useReloadCounts();
  const status = orderStatuses.includes(sp.get("status") as OrderStatus) ? (sp.get("status") as OrderStatus) : undefined;
  const q = (sp.get("q") ?? "").trim();
  const tpl = (sp.get("tpl") ?? "").trim();
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const api = new URLSearchParams({ page: String(page) });
  if (status) api.set("status", status);
  if (q) api.set("q", q);
  if (tpl) api.set("tpl", tpl);
  const tplList = useTemplates();
  const { data, loading, error, reload } = useApi<{ ok: boolean; total: number; items: Row[] }>(`/api/admin/orders?${api}`);
  const rows = (data?.items ?? []).map((r) => ({ order: r.order, inv: r.invitation, owner: r.owner }));
  const n = data?.total ?? 0;
  const total = Number(n);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (p: number) => {
    const s = new URLSearchParams();
    if (status) s.set("status", status);
    if (q) s.set("q", q);
    if (tpl) s.set("tpl", tpl);
    if (p > 1) s.set("page", String(p));
    return `/admin/buyurtmalar/${s.toString() ? `?${s}` : ""}`;
  };

  return (
    <>
      <AdminTitle title="Buyurtmalar" sub={`${total} ta buyurtma`} />
      <form
        className="mb-5 flex flex-col gap-2.5 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const s = new URLSearchParams();
          const fq = String(f.get("q") ?? "").trim();
          const fs = String(f.get("status") ?? "");
          const ft = String(f.get("tpl") ?? "");
          if (fq) s.set("q", fq);
          if (fs) s.set("status", fs);
          if (ft) s.set("tpl", ft);
          router.push(`/admin/buyurtmalar/${s.toString() ? `?${s}` : ""}`);
        }}
      >
        <label className="relative flex flex-1 items-center">
          <SearchNormal1 size={16} className="pointer-events-none absolute left-3.5 text-ink-2" />
          <input
            key={q}
            name="q"
            defaultValue={q}
            placeholder="Kod (SH-00124), telefon, havola yoki ism"
            className="h-11 w-full rounded-full border border-line bg-bg-base pl-10 pr-4 t-body-m text-ink outline-none focus:border-maroon/55"
          />
        </label>
        <select key={status ?? ""} name="status" defaultValue={status ?? ""} className="h-11 rounded-full border border-line bg-bg-base px-4 t-body-m text-ink outline-none">
          <option value="">Barcha holatlar</option>
          {orderStatuses.map((s) => (
            <option key={s} value={s}>
              {statusLabel[s]}
            </option>
          ))}
        </select>
        <select key={`t${tpl}`} name="tpl" defaultValue={tpl} className="h-11 rounded-full border border-line bg-bg-base px-4 t-body-m text-ink outline-none">
          <option value="">Barcha shablonlar</option>
          {tplList.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary btn-sm">
          Qidirish
        </button>
        {(q || status || tpl) && (
          <button type="button" onClick={() => router.push("/admin/buyurtmalar/")} className="btn btn-secondary btn-sm">
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
          <table className="w-full min-w-[1080px] text-left [&_td:first-child]:whitespace-nowrap">
            <thead className="bg-bg-soft t-annotation text-ink-2">
              <tr>
                {["Kod", "Shablon", "Ismlar", "Marosim sanasi", "Holat", "Musiqa", "Summa", "Yaratilgan", "Telefon", ""].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ order, inv, owner }) => {
                const v = orderStatusView[order.status];
                const d = splitDate(inv.date);
                const phone = owner?.phone ?? inv.contactPhone;
                const live = order.status === "active" || order.status === "paid" || order.status === "archived";
                return (
                  <tr key={order.id} className="align-middle t-body-m text-ink">
                    <td className="px-4 py-3 font-semibold">{order.code}</td>
                    <td className="px-4 py-3">{getTemplate(order.templateSlug)?.name ?? order.templateSlug}</td>
                    <td className="max-w-[200px] truncate px-4 py-3">{[inv.personA, inv.personB].filter(Boolean).join(" & ") || "—"}</td>
                    <td className="px-4 py-3 t-body-s">{d ? `${d.day} ${d.time}` : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1.5">
                        <StatusBadge tone={v.tone}>{v.label}</StatusBadge>
                        <StatusSelect
                          endpoint={`/api/admin/orders/${order.id}`}
                          value={order.status}
                          options={orderStatuses.map((s) => ({ value: s, label: statusLabel[s] }))}
                          confirmFor={["archived", "active", "paid", "draft"]}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <MusicToggle orderId={order.id} initial={inv.musicEnabled} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <PriceEdit orderId={order.id} initial={order.amount} editable={["draft", "pending_payment", "payment_failed", "p2p_rejected"].includes(order.status)} />
                    </td>
                    <td className="px-4 py-3 t-body-s text-ink-2 whitespace-nowrap">{fmtDateTime(order.createdAt)}</td>
                    <td className="px-4 py-3 t-body-s whitespace-nowrap">
                      {phone ? <a href={`tel:${phone}`} className="hover:text-maroon">{formatPhoneDisplay(phone)}</a> : owner?.telegramUser ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1 t-body-s">
                        {live && (
                          <a href={`/${inv.slug}/`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-maroon hover:underline">
                            /{inv.slug} <ExportSquare size={13} />
                          </a>
                        )}
                        <Link href={`/kabinet/t/${inv.id}/`} className="text-ink-2 hover:text-maroon">
                          Kabinetda ochish
                        </Link>
                        <DeleteOrder id={order.id} code={order.code} paid={live} onDone={() => (reload(true), reloadCounts())} />
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
            {total} tadan {(page - 1) * PAGE + 1}–{Math.min(total, page * PAGE)}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={qs(page - 1)} className="btn btn-secondary btn-sm">
                Oldingi
              </Link>
            )}
            {page < pages && (
              <Link href={qs(page + 1)} className="btn btn-secondary btn-sm">
                Keyingi
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** Taklifnomaning fon musiqasini yoqish/o‘chirish (mijoz ham kabinetida o‘zgartira oladi) */
/** Narx: to‘lanmagan buyurtmada bosib o‘zgartiriladi */
function PriceEdit({ orderId, initial, editable }: { orderId: string; initial: number; editable: boolean }) {
  const toast = useToast();
  const [amount, setAmount] = useState(initial);
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState(String(initial));
  const [busy, setBusy] = useState(false);
  if (!editable) return <>{formatPrice(amount)}</>;
  if (!edit)
    return (
      <button type="button" onClick={() => (setVal(String(amount)), setEdit(true))} className="group inline-flex items-center gap-1.5 hover:text-maroon" title="Narxni o‘zgartirish">
        {formatPrice(amount)} <Edit size={14} className="opacity-50 group-hover:opacity-100" />
      </button>
    );
  const save = async () => {
    const n = Number(val.replace(/\D/g, ""));
    if (n === amount) return setEdit(false);
    if (!(await confirmDialog({ title: "Narxni o‘zgartirasizmi?", text: `${formatPrice(amount)} → ${formatPrice(n)}. Mijoz yangi narxni to‘laydi.`, ok: "O‘zgartirish" }))) return;
    setBusy(true);
    try {
      await api(`/api/admin/orders/${orderId}`, { method: "PATCH", json: { amount: n } });
      setAmount(n);
      setEdit(false);
      toast("Narx o‘zgartirildi");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      className={`flex items-center gap-1.5 ${busy ? "pointer-events-none opacity-60" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <input
        autoFocus
        inputMode="numeric"
        value={val.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setEdit(false)}
        aria-label="Yangi narx (so‘m)"
        className="h-9 w-[110px] rounded-lg border border-line bg-bg-base px-2.5 text-[14px] outline-none focus:border-maroon"
      />
      <button type="submit" className="btn btn-primary !h-9 !px-3 !py-0 text-[13px]">Saqlash</button>
      <button type="button" onClick={() => setEdit(false)} className="px-1 text-[13px] text-ink-2 hover:text-ink">Bekor</button>
    </form>
  );
}

function MusicToggle({ orderId, initial }: { orderId: string; initial: boolean }) {
  const toast = useToast();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const change = async (v: boolean) => {
    setBusy(true);
    setOn(v);
    try {
      await api(`/api/admin/orders/${orderId}`, { method: "PATCH", json: { musicEnabled: v } });
      toast(v ? "Musiqa yoqildi" : "Musiqa o‘chirildi");
    } catch (e) {
      setOn(!v);
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <span className={busy ? "pointer-events-none opacity-60" : ""}>
      <Toggle checked={on} onChange={change} label="Fon musiqasi" />
    </span>
  );
}

/** Buyurtmani butunlay o‘chirish (taklifnoma, mehmon javoblari, to‘lov yozuvlari bilan) */
function DeleteOrder({ id, code, paid, onDone }: { id: string; code: string; paid: boolean; onDone: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    const warn = paid ? "DIQQAT: bu to‘langan taklifnoma — mehmonlardagi havola ishlamay qoladi, to‘lov yozuvi ham o‘chadi." : "";
    if (!(await confirmDialog({ title: `${code} buyurtmasi butunlay o‘chirilsinmi?`, text: warn || "Taklifnoma, mehmon javoblari va to‘lov yozuvlari ham o‘chadi.", ok: "O‘chirish", danger: true, typeToConfirm: paid ? code : undefined }))) return;
    setBusy(true);
    try {
      await api(`/api/admin/orders/${id}`, { method: "DELETE" });
      toast(`${code} o‘chirildi`);
      onDone();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" onClick={run} disabled={busy} className="inline-flex items-center gap-1 text-ink-2 hover:text-danger disabled:opacity-50">
      <Trash size={13} /> {busy ? "O‘chirilmoqda…" : "O‘chirish"}
    </button>
  );
}
