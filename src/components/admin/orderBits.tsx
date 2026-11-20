"use client";

import { useState } from "react";
import type { OrderStatus } from "@/lib/types";
import { Toggle, api, confirmDialog, useToast } from "@/components/ui";
import { Edit, Trash } from "@/components/icons";
import { formatPrice } from "@/lib/format";

/** Admin: buyurtma holatlari, narx/musiqa/o‘chirish boshqaruvlari (ro‘yxat va buyurtma sahifasi uchun umumiy) */
export const orderStatuses: OrderStatus[] = ["draft", "pending_payment", "payment_processing", "p2p_review", "p2p_rejected", "payment_failed", "paid", "active", "archived"];

export const statusLabel: Record<OrderStatus, string> = {
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

/** To‘lanmagan buyurtma — narxni o‘zgartirish mumkin */
export const priceEditable = (s: OrderStatus) => ["draft", "pending_payment", "payment_failed", "p2p_rejected"].includes(s);

/** Taklifnomaning fon musiqasini yoqish/o‘chirish (mijoz ham kabinetida o‘zgartira oladi) */
/** Narx: to‘lanmagan buyurtmada bosib o‘zgartiriladi */
export function PriceEdit({ orderId, initial, editable }: { orderId: string; initial: number; editable: boolean }) {
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

/**
 * Tushum — haqiqiy kelib tushgan pul (narxdan farqli). Qo‘lda faollashtirilgan / test buyurtmalarda 0.
 * Tuzatish faqat super admin uchun.
 */
export function IncomeEdit({ orderId, initial, editable }: { orderId: string; initial: number; editable: boolean }) {
  const toast = useToast();
  const [income, setIncome] = useState(initial);
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState(String(initial));
  const [busy, setBusy] = useState(false);
  const shown = <span className={income === 0 ? "text-ink-2" : ""}>{formatPrice(income)}</span>;
  if (!editable) return shown;
  if (!edit)
    return (
      <button type="button" onClick={() => (setVal(String(income)), setEdit(true))} className="group inline-flex items-center gap-1.5 hover:text-maroon" title="Tushumni tuzatish">
        {shown} <Edit size={14} className="opacity-50 group-hover:opacity-100" />
      </button>
    );
  const save = async (n: number) => {
    if (n === income) return setEdit(false);
    if (!(await confirmDialog({ title: "Tushumni tuzatasizmi?", text: `${formatPrice(income)} → ${formatPrice(n)}. Hisobotdagi tushum shunga qarab o‘zgaradi.`, ok: "Tuzatish" }))) return;
    setBusy(true);
    try {
      await api(`/api/admin/orders/${orderId}`, { method: "PATCH", json: { income: n } });
      setIncome(n);
      setEdit(false);
      toast("Tushum tuzatildi");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      className={`flex flex-wrap items-center gap-1.5 ${busy ? "pointer-events-none opacity-60" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        void save(Number(val.replace(/\D/g, "") || 0));
      }}
    >
      <input
        autoFocus
        inputMode="numeric"
        value={val.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setEdit(false)}
        aria-label="Tushum (so‘m)"
        className="h-9 w-[110px] rounded-lg border border-line bg-bg-base px-2.5 text-[14px] outline-none focus:border-maroon"
      />
      <button type="submit" className="btn btn-primary !h-9 !px-3 !py-0 text-[13px]">Saqlash</button>
      {income !== 0 && (
        <button type="button" onClick={() => void save(0)} className="btn btn-secondary !h-9 !px-3 !py-0 text-[13px]">0 qilish</button>
      )}
      <button type="button" onClick={() => setEdit(false)} className="px-1 text-[13px] text-ink-2 hover:text-ink">Bekor</button>
    </form>
  );
}

export function MusicToggle({ orderId, initial }: { orderId: string; initial: boolean }) {
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
export function DeleteOrder({ id, code, paid, onDone }: { id: string; code: string; paid: boolean; onDone: () => void }) {
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
