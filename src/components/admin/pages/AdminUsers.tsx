"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/lib/client";
import { Field, Input, Modal, StatusBadge, Toggle, api, useToast } from "@/components/ui";
import { Add, SearchNormal1 } from "@/components/icons";
import { formatPhoneDisplay } from "@/lib/display";
import { formatPrice } from "@/lib/format";
import { AdminError, AdminLoading, AdminTitle, Empty, fmtDateTime } from "../shared";

export type AdminUser = {
  id: string;
  name: string | null;
  phone: string | null;
  telegramId: string | null;
  telegramUser: string | null;
  isAdmin: boolean;
  isBlocked: boolean;
  login: string | null;
  hasPassword: boolean;
  note: string | null;
  orders: number;
  activeOrders: number;
  spent: number;
  lastSeen: string | null;
  createdAt: string;
};

const roles = [
  { value: "", label: "Barchasi" },
  { value: "customers", label: "Xaridorlar" },
  { value: "admin", label: "Adminlar" },
  { value: "blocked", label: "Bloklanganlar" },
];

export const userTitle = (u: Pick<AdminUser, "name" | "phone" | "telegramUser" | "login">) =>
  u.name || formatPhoneDisplay(u.phone) || u.telegramUser || u.login || "Nomsiz";

export function AdminUsers() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => (setQuery(q.trim()), setPage(1)), 300);
    return () => window.clearTimeout(t);
  }, [q]);
  const url = `/api/admin/users?${new URLSearchParams({ q: query, role, page: String(page) })}`;
  const { data, loading, error, reload } = useApi<{ total: number; items: AdminUser[] }>(url);

  return (
    <>
      <AdminTitle
        title="Foydalanuvchilar"
        sub={data ? `Jami ${data.total} ta` : undefined}
        right={
          <button type="button" onClick={() => setCreating(true)} className="btn btn-primary btn-sm">
            <Add size={16} /> Yangi foydalanuvchi
          </button>
        }
      />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="flex h-11 flex-1 items-center gap-2.5 rounded-full border border-line bg-bg-base px-4 focus-within:border-maroon/55">
          <SearchNormal1 size={17} className="text-ink-2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ism, telefon, @username yoki login" className="h-full flex-1 bg-transparent t-body-m outline-none" />
        </label>
        <div className="flex gap-1.5 overflow-x-auto">
          {roles.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => (setRole(r.value), setPage(1))}
              className={`shrink-0 rounded-full border px-4 py-2 t-nav transition-colors ${role === r.value ? "border-maroon bg-maroon text-ink-inverse" : "border-line text-ink hover:border-maroon"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <AdminLoading />
      ) : !data ? (
        <AdminError message={error?.message} onRetry={() => reload()} />
      ) : data.items.length === 0 ? (
        <Empty>Foydalanuvchi topilmadi</Empty>
      ) : (
        <div className="overflow-x-auto rounded-panel border border-line">
          <table className="w-full min-w-[820px] text-left [&_td:first-child]:whitespace-nowrap">
            <thead className="bg-bg-soft t-body-s text-ink-2">
              <tr>
                <th className="px-4 py-3 font-medium">Foydalanuvchi</th>
                <th className="px-4 py-3 font-medium">Aloqa</th>
                <th className="px-4 py-3 font-medium">Buyurtmalar</th>
                <th className="px-4 py-3 font-medium">To‘lagan</th>
                <th className="px-4 py-3 font-medium">Ro‘yxatdan o‘tgan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.items.map((u) => (
                <tr key={u.id} className={`transition-colors hover:bg-bg-soft/60 ${u.isBlocked ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/foydalanuvchilar/k/?id=${u.id}`} className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold-soft t-nav text-maroon">
                        {userTitle(u).replace(/[^\p{L}\d]/gu, "").slice(0, 1).toUpperCase() || "?"}
                      </span>
                      <span className="flex flex-col">
                        <span className="t-title text-ink hover:text-maroon">{userTitle(u)}</span>
                        <span className="flex gap-1.5">
                          {u.isAdmin && <StatusBadge tone="maroon">Admin</StatusBadge>}
                          {u.isBlocked && <StatusBadge tone="danger">Bloklangan</StatusBadge>}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 t-body-s text-ink-2">
                    <div>{formatPhoneDisplay(u.phone) || "—"}</div>
                    <div>{u.telegramUser || (u.telegramId ? "Telegram ulangan" : "")}</div>
                  </td>
                  <td className="px-4 py-3 t-body-m text-ink">
                    {u.orders}
                    {u.activeOrders > 0 && <span className="t-body-s text-success"> · {u.activeOrders} faol</span>}
                  </td>
                  <td className="px-4 py-3 t-body-m text-ink">{u.spent ? formatPrice(u.spent) : "—"}</td>
                  <td className="px-4 py-3 t-body-s text-ink-2">{fmtDateTime(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.total > 40 && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn btn-secondary btn-sm">
            ← Oldingi
          </button>
          <span className="t-body-s text-ink-2">
            {page} / {Math.ceil(data.total / 40)}
          </span>
          <button type="button" disabled={page * 40 >= data.total} onClick={() => setPage(page + 1)} className="btn btn-secondary btn-sm">
            Keyingi →
          </button>
        </div>
      )}
      <CreateUser open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

function CreateUser({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState({ name: "", phone: "", telegramUser: "", isAdmin: false, login: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await api<{ user: AdminUser }>("/api/admin/users", { method: "POST", json: v });
      toast("Foydalanuvchi qo‘shildi");
      router.push(`/admin/foydalanuvchilar/k/?id=${r.user.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} label="Yangi foydalanuvchi" className="max-w-[520px]">
      <form onSubmit={submit} className="flex flex-col gap-4 p-6">
        <h2 className="font-serif text-[28px] font-light text-ink">Yangi foydalanuvchi</h2>
        <Field label="Ism">
          <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} autoFocus />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telefon" hint="+998 90 123 45 67">
            <Input value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} inputMode="tel" />
          </Field>
          <Field label="Telegram username" hint="Telegram orqali kirganda shu hisobga ulanadi (telefon bo‘yicha)">
            <Input value={v.telegramUser} onChange={(e) => setV({ ...v, telegramUser: e.target.value })} placeholder="@username" />
          </Field>
        </div>
        <label className="flex items-center justify-between gap-3 rounded-input bg-bg-soft px-4 py-3 t-body-m text-ink">
          Admin huquqi <Toggle checked={v.isAdmin} onChange={(x) => setV({ ...v, isAdmin: x })} label="Admin" />
        </label>
        {v.isAdmin && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Login (admin panel uchun)">
              <Input value={v.login} onChange={(e) => setV({ ...v, login: e.target.value })} autoComplete="off" />
            </Field>
            <Field label="Parol (kamida 8 belgi)">
              <Input type="password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} autoComplete="new-password" />
            </Field>
          </div>
        )}
        {error && <p className="t-body-s text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
            Bekor qilish
          </button>
          <button type="submit" disabled={busy} className="btn btn-primary btn-sm">
            {busy ? "Saqlanmoqda…" : "Qo‘shish"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
