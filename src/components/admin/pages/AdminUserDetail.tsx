"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useApi, useMe } from "@/lib/client";
import type { Invitation, Order } from "@/lib/types";
import { Field, Input, StatusBadge, Textarea, Toggle, api, useToast } from "@/components/ui";
import { ArrowLeft, ExportSquare } from "@/components/icons";
import { formatPhoneDisplay, orderStatusView, splitDate } from "@/lib/display";
import { formatPrice } from "@/lib/format";
import { getTemplate } from "@/lib/templates";
import { useTemplates } from "@/lib/useTemplates";
import { PhoneFrame } from "@/components/mockups/Devices";
import { InvitationScreen } from "@/components/mockups/InvitationScreen";
import { StatusSelect } from "../StatusSelect";
import { AdminError, AdminLoading, AdminRefreshProvider, fmtDateTime } from "../shared";
import { userTitle, type AdminUser } from "./AdminUsers";

type Row = { order: Order; invitation: Invitation };
type Resp = { user: AdminUser; orders: Row[]; favorites: string[] };

function Card({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-panel border border-line bg-bg-base p-5 lg:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-[24px] font-light text-ink">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

const orderStatuses = ["draft", "pending_payment", "p2p_review", "p2p_rejected", "payment_failed", "paid", "active", "archived"] as const;

export function AdminUserDetail() {
  const id = useSearchParams().get("id");
  const { data, loading, error, reload } = useApi<Resp>(id ? `/api/admin/users/${id}` : null);
  if (!id) return <AdminError message="Foydalanuvchi tanlanmagan" onRetry={() => history.back()} />;
  if (loading && !data) return <AdminLoading />;
  if (!data) return <AdminError message={error?.message} onRetry={() => reload()} />;
  const u = data.user;

  return (
    <>
      <Link href="/admin/foydalanuvchilar/" className="mb-4 inline-flex items-center gap-2 t-nav text-ink-2 hover:text-maroon">
        <ArrowLeft size={16} /> Foydalanuvchilar
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-full bg-gold-soft font-serif text-[26px] text-maroon">
            {userTitle(u).replace(/[^\p{L}\d]/gu, "").slice(0, 1).toUpperCase() || "?"}
          </span>
          <div>
            <h1 className="font-serif text-[34px] font-light leading-none text-ink">{userTitle(u)}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 t-body-s text-ink-2">
              {u.isAdmin && <StatusBadge tone="maroon">Admin</StatusBadge>}
              {u.isBlocked && <StatusBadge tone="danger">Bloklangan</StatusBadge>}
              <span>Ro‘yxatdan o‘tgan: {fmtDateTime(u.createdAt)}</span>
              {u.lastSeen && <span>· Oxirgi kirish: {fmtDateTime(u.lastSeen)}</span>}
            </div>
          </div>
        </div>
        <Actions u={u} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="flex flex-col gap-6">
          <Enroll user={u} onDone={() => reload(true)} />
          <Orders rows={data.orders} reload={() => reload(true)} />
        </div>
        <div className="flex flex-col gap-6">
          <Profile u={u} onSaved={() => reload(true)} />
          <Access u={u} onSaved={() => reload(true)} />
          {data.favorites.length > 0 && (
            <Card title="Sevimlilar">
              <div className="flex flex-wrap gap-2">
                {data.favorites.map((s) => (
                  <span key={s} className="rounded-full bg-bg-soft px-3 py-1.5 t-body-s text-ink">
                    {getTemplate(s)?.name ?? s}
                  </span>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Actions({ u }: { u: AdminUser }) {
  const toast = useToast();
  const router = useRouter();
  const { me } = useMe();
  const self = me?.user?.id === u.id;
  const impersonate = async () => {
    if (!confirm(`${userTitle(u)} sifatida kirasizmi? Admin sessiyangiz yopiladi — qaytish uchun qayta kirasiz.`)) return;
    try {
      await api(`/api/admin/users/${u.id}/impersonate`, { method: "POST" });
      window.location.href = "/kabinet/";
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };
  const remove = async () => {
    if (!confirm(`${userTitle(u)} o‘chirilsinmi? Buyurtmalari saqlanadi, lekin egasiz qoladi.`)) return;
    try {
      await api(`/api/admin/users/${u.id}`, { method: "DELETE" });
      toast("Foydalanuvchi o‘chirildi");
      router.push("/admin/foydalanuvchilar/");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };
  if (self) return <span className="t-body-s text-ink-2">Bu — sizning hisobingiz</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {u.phone && (
        <a href={`tel:${u.phone}`} className="btn btn-secondary btn-sm">
          Qo‘ng‘iroq
        </a>
      )}
      {u.telegramUser && (
        <a href={`https://t.me/${u.telegramUser.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
          Telegram
        </a>
      )}
      <button type="button" onClick={impersonate} disabled={u.isBlocked} className="btn btn-secondary btn-sm">
        Uning nomidan kirish
      </button>
      <button type="button" onClick={remove} className="btn btn-sm border border-danger/40 text-danger hover:bg-[var(--danger-bg)]">
        O‘chirish
      </button>
    </div>
  );
}

function Profile({ u, onSaved }: { u: AdminUser; onSaved: () => void }) {
  const toast = useToast();
  const [v, setV] = useState({ name: u.name ?? "", phone: u.phone ?? "", telegramUser: u.telegramUser ?? "", note: u.note ?? "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => setV({ name: u.name ?? "", phone: u.phone ?? "", telegramUser: u.telegramUser ?? "", note: u.note ?? "" }), [u]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/api/admin/users/${u.id}`, { method: "PATCH", json: v });
      toast("Saqlandi");
      onSaved();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title="Ma’lumotlar">
      <form onSubmit={save} className="flex flex-col gap-4">
        <Field label="Ism">
          <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telefon">
            <Input value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} inputMode="tel" />
          </Field>
          <Field label="Telegram" hint={u.telegramId ? "Bot orqali ulangan" : undefined}>
            <Input value={v.telegramUser} onChange={(e) => setV({ ...v, telegramUser: e.target.value })} placeholder="@username" />
          </Field>
        </div>
        <Field label="Izoh (faqat adminlar ko‘radi)">
          <Textarea value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} />
        </Field>
        <button type="submit" disabled={busy} className="btn btn-primary btn-sm w-fit">
          {busy ? "Saqlanmoqda…" : "Saqlash"}
        </button>
      </form>
    </Card>
  );
}

function Access({ u, onSaved }: { u: AdminUser; onSaved: () => void }) {
  const toast = useToast();
  const { me } = useMe();
  const self = me?.user?.id === u.id;
  const [login, setLogin] = useState(u.login ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setLogin(u.login ?? ""), [u.login]);
  const patch = async (body: Record<string, unknown>, msg: string) => {
    setBusy(true);
    try {
      await api(`/api/admin/users/${u.id}`, { method: "PATCH", json: body });
      toast(msg);
      setPassword("");
      onSaved();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title="Huquqlar va kirish">
      <label className="flex items-center justify-between gap-3 t-body-m text-ink">
        <span>
          Admin huquqi
          <span className="block t-body-s text-ink-2">Admin panelga to‘liq kirish</span>
        </span>
        <Toggle checked={u.isAdmin} onChange={(x) => !self && !busy && patch({ isAdmin: x }, x ? "Admin huquqi berildi" : "Admin huquqi olindi")} label="Admin" />
      </label>
      <label className="flex items-center justify-between gap-3 t-body-m text-ink">
        <span>
          Bloklash
          <span className="block t-body-s text-ink-2">Saytga kira olmaydi, sessiyalari yopiladi</span>
        </span>
        <Toggle checked={u.isBlocked} onChange={(x) => !self && !busy && patch({ isBlocked: x }, x ? "Bloklandi" : "Blokdan chiqarildi")} label="Bloklash" />
      </label>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          patch({ login, ...(password ? { password } : {}) }, "Kirish ma’lumotlari saqlandi");
        }}
        className="flex flex-col gap-3 border-t border-line pt-4"
      >
        <p className="t-body-s text-ink-2">
          Login va parol — <b>/kirish/admin/</b> sahifasidan kirish uchun{u.hasPassword ? " (parol o‘rnatilgan)" : ""}.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Login">
            <Input value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="off" />
          </Field>
          <Field label={u.hasPassword ? "Yangi parol" : "Parol"}>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="kamida 8 belgi" />
          </Field>
        </div>
        <button type="submit" disabled={busy} className="btn btn-secondary btn-sm w-fit">
          Saqlash
        </button>
      </form>
    </Card>
  );
}

function Enroll({ user, onDone }: { user: AdminUser; onDone: () => void }) {
  const templates = useTemplates();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ templateSlug: "", personA: "", personB: "", date: "", venueName: "", amount: "", activate: true });
  const [busy, setBusy] = useState(false);
  const t = templates.find((x) => x.slug === v.templateSlug);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/api/admin/users/${user.id}/enroll`, { method: "POST", json: v });
      toast(v.activate ? "Shablon biriktirildi va faollashtirildi" : "Shablon biriktirildi (qoralama)");
      setOpen(false);
      setV({ templateSlug: "", personA: "", personB: "", date: "", venueName: "", amount: "", activate: true });
      onDone();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card
      title="Shablon biriktirish"
      right={
        !open && (
          <button type="button" onClick={() => setOpen(true)} className="btn btn-primary btn-sm">
            + Shablon berish
          </button>
        )
      }
    >
      {!open ? (
        <p className="t-body-s text-ink-2">Foydalanuvchiga istalgan shablonni biriktiring — to‘lovsiz faollashtirish yoki qoralama sifatida ochib berish mumkin. Taklifnoma uning kabinetida paydo bo‘ladi.</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid max-h-[340px] grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-4 lg:grid-cols-6">
            {templates.map((x) => (
              <button
                key={x.slug}
                type="button"
                onClick={() => setV({ ...v, templateSlug: x.slug, amount: String(x.price) })}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-colors ${v.templateSlug === x.slug ? "border-maroon bg-maroon/[0.04]" : "border-line hover:border-maroon/50"}`}
              >
                <PhoneFrame className="w-[64px]">
                  <InvitationScreen t={x} />
                </PhoneFrame>
                <span className="line-clamp-2 text-center text-[11px] leading-tight text-ink">{x.name}</span>
              </button>
            ))}
          </div>
          {t && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="1-ism">
                  <Input value={v.personA} onChange={(e) => setV({ ...v, personA: e.target.value })} placeholder={t.sample.a} />
                </Field>
                <Field label="2-ism">
                  <Input value={v.personB} onChange={(e) => setV({ ...v, personB: e.target.value })} placeholder={t.sample.b ?? ""} />
                </Field>
                <Field label="Sana va vaqt">
                  <Input type="datetime-local" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} />
                </Field>
                <Field label="To‘yxona">
                  <Input value={v.venueName} onChange={(e) => setV({ ...v, venueName: e.target.value })} placeholder={t.sample.venue} />
                </Field>
                <Field label="Summa (so‘m)" hint="0 — bepul (sovg‘a)">
                  <Input type="number" min={0} value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} />
                </Field>
                <label className="flex items-center justify-between gap-3 self-end rounded-input bg-bg-soft px-4 py-3 t-body-m text-ink">
                  Darhol faollashtirish
                  <Toggle checked={v.activate} onChange={(x) => setV({ ...v, activate: x })} label="Faollashtirish" />
                </label>
              </div>
              <p className="t-body-s text-ink-2">Qolgan ma’lumotlarni (rasmlar, dastur, xarita) foydalanuvchi o‘z kabinetida yoki siz «Kabinetda ochish» orqali to‘ldirasiz.</p>
            </>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={busy || !t} className="btn btn-primary btn-sm">
              {busy ? "Saqlanmoqda…" : "Biriktirish"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary btn-sm">
              Bekor qilish
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}

function Orders({ rows, reload }: { rows: Row[]; reload: () => void }) {
  return (
    <Card title={`Buyurtmalar (${rows.length})`}>
      {rows.length === 0 ? (
        <p className="t-body-s text-ink-2">Hali buyurtma yo‘q</p>
      ) : (
        <AdminRefreshProvider value={reload}>
          <ul className="divide-y divide-line">
            {rows.map(({ order, invitation: inv }) => {
              const v = orderStatusView[order.status];
              const d = splitDate(inv.date);
              const live = order.status === "active" || order.status === "paid";
              return (
                <li key={order.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5">
                  <div className="min-w-[180px] flex-1">
                    <p className="t-title text-ink">
                      {order.code} · {getTemplate(order.templateSlug)?.name ?? order.templateSlug}
                    </p>
                    <p className="t-body-s text-ink-2">
                      {[inv.personA, inv.personB].filter(Boolean).join(" & ") || "Ismlar kiritilmagan"}
                      {d ? ` · ${d.day}` : ""} · {formatPrice(order.amount)}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <StatusBadge tone={v.tone}>{v.label}</StatusBadge>
                    <StatusSelect
                      endpoint={`/api/admin/orders/${order.id}`}
                      value={order.status}
                      options={orderStatuses.map((s) => ({ value: s, label: orderStatusView[s].label }))}
                      confirmFor={["archived", "active", "paid", "draft"]}
                    />
                  </div>
                  <div className="flex flex-col items-start gap-1 t-body-s">
                    {live && (
                      <a href={`/${inv.slug}/`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-maroon hover:underline">
                        /{inv.slug} <ExportSquare size={13} />
                      </a>
                    )}
                    <Link href={`/kabinet/t/${inv.id}/`} className="text-ink-2 hover:text-maroon">
                      Kabinetda ochish
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </AdminRefreshProvider>
      )}
    </Card>
  );
}
