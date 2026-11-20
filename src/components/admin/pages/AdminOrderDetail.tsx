"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApi, useMe } from "@/lib/client";
import type { Guest, Invitation, Order, Payment } from "@/lib/types";
import { AdminError, AdminLoading, AdminRefreshProvider, Empty, fmtDateTime } from "../shared";
import { StatusSelect } from "../StatusSelect";
import { useReloadCounts } from "../AdminShell";
import { DeleteOrder, IncomeEdit, MusicToggle, PriceEdit, orderStatuses, priceEditable, statusLabel } from "../orderBits";
import { StatusBadge, api, confirmDialog, useToast } from "@/components/ui";
import { ArrowLeft, Edit, ExportSquare, People, SearchNormal1 } from "@/components/icons";
import { formatPrice } from "@/lib/format";
import { formatPhoneDisplay, inviteNames, orderStatusView, rsvpView, splitDate } from "@/lib/display";
import { ceremonyLabel, getTemplate, type Ceremony, type TemplateField } from "@/lib/templates";

type Owner = {
  id: string;
  name: string | null;
  phone: string | null;
  telegramUser?: string | null;
  login?: string | null;
  isAdmin?: boolean;
  isBlocked?: boolean;
  orders?: number;
  lastSeen?: string | null;
};
type Stats = { coming: number; maybe: number; notComing: number; total: number; responses: number };
type Detail = {
  ok: boolean;
  order: Order & { priceLocked?: boolean; income?: number | null };
  invitation: Invitation | null;
  owner: Owner | null;
  contactPhone: string | null;
  payments: Payment[];
  stats: Stats | null;
  guests: Guest[];
  special: { name: string; opens: number; openedAt: string | null }[];
};

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

export function AdminOrderDetail() {
  const sp = useSearchParams();
  const id = (sp.get("id") ?? "").trim();
  const reloadCounts = useReloadCounts();
  const { me } = useMe();
  const { data, loading, error, reload } = useApi<Detail>(id ? `/api/admin/orders/${encodeURIComponent(id)}` : null);
  const refresh = () => (reload(true), reloadCounts());

  if (!id) return <Empty>Buyurtma tanlanmagan</Empty>;
  if (loading && !data) return <AdminLoading />;
  if (!data) return <AdminError message={error?.message} onRetry={() => reload()} />;

  const { order, invitation: inv, owner, payments, stats, guests, special } = data;
  const tpl = getTemplate(order.templateSlug);
  const v = orderStatusView[order.status];
  const live = order.status === "active" || order.status === "paid" || order.status === "archived";
  const names = inv ? inviteNames(inv.personA, inv.personB, inv.ceremony, true) : "";

  return (
    <AdminRefreshProvider value={refresh}>
      <Link href="/admin/buyurtmalar/" className="mb-4 inline-flex items-center gap-1.5 t-body-s text-ink-2 hover:text-maroon">
        <ArrowLeft size={15} /> Barcha buyurtmalar
      </Link>

      {/* Sarlavha va asosiy amallar */}
      <div className="flex flex-col gap-4 rounded-panel border border-line bg-bg-base p-4 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="t-body-s text-ink-2">
            Buyurtma <b className="font-semibold text-ink">{order.code}</b> · {tpl?.name ?? order.templateSlug}
          </p>
          <h1 className="mt-1 break-words font-serif text-[30px] font-light leading-tight text-ink sm:text-[36px]">{names || "Ism kiritilmagan"}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge tone={v.tone}>{v.label}</StatusBadge>
            {inv && <span className="t-body-s text-ink-2">{ceremonyLabel[inv.ceremony as Ceremony] ?? inv.ceremony}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {inv && (
            <Link href={`/kabinet/t/${inv.id}/tahrirlash/`} className="btn btn-primary btn-sm">
              <Edit size={15} /> Taklifnomani tahrirlash
            </Link>
          )}
          {inv && live && (
            <a href={`/${inv.slug}/`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
              Saytni ochish <ExportSquare size={14} />
            </a>
          )}
          {inv && !live && (
            <Link href={`/kabinet/t/${inv.id}/`} className="btn btn-secondary btn-sm">
              Ko‘rinishini ochish
            </Link>
          )}
          {inv && (
            <Link href={`/kabinet/t/${inv.id}/mehmonlar/`} className="btn btn-secondary btn-sm">
              <People size={15} /> Mehmonlar
            </Link>
          )}
        </div>
      </div>

      {!tpl && (
        <p className="mt-4 rounded-card border border-gold/40 bg-gold-soft px-4 py-3 t-body-s text-ink">
          Bu buyurtmaning shabloni (<b>{order.templateSlug}</b>) saytdan o‘chirilgan — tahrirlash sahifasi ochilmaydi. Ma’lumotlar quyida to‘liq ko‘rinadi.
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          {inv ? <InvitationCard inv={inv} tplFields={tpl?.fields ?? []} /> : <Empty>Taklifnoma topilmadi</Empty>}
          <GuestsCard stats={stats} guests={guests} special={special} invId={inv?.id ?? null} />
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
                {order.priceLocked && <span className="ml-1.5 t-body-s text-ink-2">(admin o‘rnatgan)</span>}
              </Row>
              {["paid", "active", "archived"].includes(order.status) && (
                <Row k="Tushum">
                  <IncomeEdit key={`${order.id}-${order.income}`} orderId={order.id} initial={order.income ?? order.amount} editable={!!me?.user?.isSuperadmin} />
                  {!me?.user?.isSuperadmin && <span className="ml-1.5 t-body-s text-ink-2">(tuzatish — super admin)</span>}
                </Row>
              )}
              {order.promoCode && (
                <Row k="Promokod">
                  {order.promoCode} · −{formatPrice(order.promoDiscount ?? 0)}
                </Row>
              )}
              {inv && (
                <Row k="Fon musiqasi">
                  <MusicToggle orderId={order.id} initial={inv.musicEnabled} />
                </Row>
              )}
              <Row k="Yaratilgan">{fmtDateTime(order.createdAt)}</Row>
              <Row k="To‘langan">{order.paidAt ? fmtDateTime(order.paidAt) : "—"}</Row>
              <Row k="Yangilangan">{fmtDateTime(order.updatedAt)}</Row>
              {inv && <Row k="Ko‘rishlar">{inv.views}</Row>}
            </Rows>
          </Card>

          <OwnerCard orderId={order.id} owner={owner} contactPhone={data.contactPhone} onDone={refresh} />

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
            <p className="mb-2 t-body-s text-ink-2">Buyurtma, taklifnoma, mehmon javoblari va to‘lov yozuvlari butunlay o‘chadi.</p>
            <DeleteOrderAndBack id={order.id} code={order.code} paid={live} />
          </Card>
        </div>
      </div>
    </AdminRefreshProvider>
  );
}

function DeleteOrderAndBack({ id, code, paid }: { id: string; code: string; paid: boolean }) {
  const router = useRouter();
  const reloadCounts = useReloadCounts();
  return <DeleteOrder id={id} code={code} paid={paid} onDone={() => (reloadCounts(), router.push("/admin/buyurtmalar/"))} />;
}

/* ── Taklifnoma ma’lumotlari ── */
function InvitationCard({ inv, tplFields }: { inv: Invitation; tplFields: TemplateField[] }) {
  const d = splitDate(inv.date);
  const extra = (inv.extra ?? {}) as Record<string, unknown>;
  const known = new Set(tplFields.map((f) => f.key));
  const extraRows: { label: string; value: ReactNode }[] = [];
  for (const f of tplFields) {
    const val = extra[f.key];
    if (val == null || val === "" || (Array.isArray(val) && !val.length)) continue;
    extraRows.push({ label: f.label, value: renderValue(val, f) });
  }
  for (const [k, val] of Object.entries(extra)) {
    if (known.has(k) || val == null || val === "" || (Array.isArray(val) && !val.length)) continue;
    extraRows.push({ label: k, value: renderValue(val) });
  }
  return (
    <Card
      title="Taklifnoma"
      right={
        <Link href={`/kabinet/t/${inv.id}/tahrirlash/`} className="inline-flex items-center gap-1 t-body-s text-maroon hover:underline">
          <Edit size={14} /> Tahrirlash
        </Link>
      }
    >
      <Rows>
        <Row k="Havola">
          <span className="break-all">/{inv.slug}</span>
        </Row>
        <Row k="Ism(lar)">{[inv.personA, inv.personB].filter(Boolean).join(" · ") || "—"}</Row>
        <Row k="Sana va vaqt">{d ? `${d.long}${d.time ? ` · ${d.time}` : ""}` : inv.date || "—"}</Row>
        <Row k="Joy">{inv.venueName || "—"}</Row>
        <Row k="Manzil">{inv.address || "—"}</Row>
        <Row k="Xarita">
          {inv.mapUrl ? (
            <a href={inv.mapUrl} target="_blank" rel="noopener noreferrer" className="break-all text-maroon hover:underline">
              {inv.mapUrl}
            </a>
          ) : (
            "—"
          )}
        </Row>
        <Row k="Mehmonlar javobi">{inv.rsvpEnabled ? `Yoqilgan${inv.rsvpDeadline ? ` · ${inv.rsvpDeadline} gacha` : ""}` : "O‘chirilgan"}</Row>
        <Row k="Aloqa">
          {[inv.contactPhone && formatPhoneDisplay(inv.contactPhone), inv.contactTg].filter(Boolean).join(" · ") || "—"}
        </Row>
      </Rows>

      {inv.message && (
        <div className="mt-4">
          <p className="mb-1 t-annotation text-ink-2">Taklif matni</p>
          <p className="whitespace-pre-line rounded-card bg-bg-soft px-4 py-3 t-body-m text-ink">{inv.message}</p>
        </div>
      )}

      {inv.program?.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 t-annotation text-ink-2">Kun tartibi</p>
          <ul className="divide-y divide-line rounded-card border border-line">
            {inv.program.map((p, i) => (
              <li key={i} className="flex gap-3 px-4 py-2 t-body-m">
                <span className="w-14 shrink-0 font-medium text-maroon">{p.time}</span>
                <span className="min-w-0 break-words text-ink">{p.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {extraRows.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 t-annotation text-ink-2">Shablon maydonlari</p>
          <Rows>
            {extraRows.map((r, i) => (
              <Row key={i} k={r.label}>
                {r.value}
              </Row>
            ))}
          </Rows>
        </div>
      )}

      {inv.photos?.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 t-annotation text-ink-2">Suratlar ({inv.photos.length})</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {inv.photos.map((src, i) => (
              <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="block aspect-[3/4] overflow-hidden rounded-[10px] bg-bg-soft">
                <img src={src} alt={`Surat ${i + 1}`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function renderValue(val: unknown, f?: TemplateField): ReactNode {
  if (Array.isArray(val)) {
    return (
      <ul className="flex flex-col gap-1">
        {val.map((it, i) => (
          <li key={i} className="break-words">
            {typeof it === "object" && it
              ? Object.entries(it as Record<string, unknown>)
                  .filter(([, x]) => x != null && x !== "")
                  .map(([k, x]) => {
                    const label = f && f.type === "list" ? f.item[k]?.label : undefined;
                    return `${label ?? k}: ${String(x)}`;
                  })
                  .join(" · ")
              : String(it)}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof val === "boolean") return val ? "Ha" : "Yo‘q";
  if (typeof val === "object") return <code className="break-all text-[12px]">{JSON.stringify(val)}</code>;
  return <span className="whitespace-pre-line break-words">{String(val)}</span>;
}

/* ── Mehmonlar ── */
function GuestsCard({ stats, guests, special, invId }: { stats: Stats | null; guests: Guest[]; special: Detail["special"]; invId: string | null }) {
  const opened = special.filter((s) => s.opens > 0).length;
  return (
    <Card
      title={`Mehmonlar javobi (${stats?.responses ?? 0})`}
      right={
        invId ? (
          <Link href={`/kabinet/t/${invId}/mehmonlar/`} className="t-body-s text-maroon hover:underline">
            Batafsil
          </Link>
        ) : null
      }
    >
      {stats && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Mini label="Keladi" value={stats.coming} tone="text-success" />
          <Mini label="Aniq emas" value={stats.maybe} tone="text-pending" />
          <Mini label="Kela olmaydi" value={stats.notComing} tone="text-decline" />
          <Mini label="Maxsus mehmon" value={special.length ? `${opened}/${special.length}` : "0"} hint={special.length ? "ochgan / jami" : undefined} />
        </div>
      )}
      {guests.length === 0 ? (
        <p className="t-body-s text-ink-2">Hali javob yo‘q.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left t-body-s">
            <thead className="text-ink-2">
              <tr>
                {["Ism", "Javob", "Kishi", "Tilak", "Sana"].map((h) => (
                  <th key={h} className="py-2 pr-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {guests.map((g) => {
                const r = rsvpView[g.status];
                return (
                  <tr key={g.id} className="align-top text-ink">
                    <td className="py-2 pr-3 font-medium">{g.name}</td>
                    <td className="py-2 pr-3">
                      <StatusBadge tone={r.tone}>{r.label}</StatusBadge>
                    </td>
                    <td className="py-2 pr-3">{g.status === "not_coming" ? "—" : g.count}</td>
                    <td className="max-w-[260px] py-2 pr-3 break-words text-ink-2">{g.wish || "—"}</td>
                    <td className="whitespace-nowrap py-2 text-ink-2">{fmtDateTime(g.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function Mini({ label, value, tone = "text-ink", hint }: { label: string; value: ReactNode; tone?: string; hint?: string }) {
  return (
    <div className="rounded-card bg-bg-soft px-3 py-2.5">
      <p className={`font-serif text-[24px] leading-none ${tone}`}>{value}</p>
      <p className="mt-1 t-body-s text-ink-2">{label}</p>
      {hint && <p className="t-body-s text-[11px] text-ink-2">{hint}</p>}
    </div>
  );
}

/* ── Egasi: ko‘rish va boshqa foydalanuvchiga o‘tkazish ── */
function OwnerCard({ orderId, owner, contactPhone, onDone }: { orderId: string; owner: Owner | null; contactPhone: string | null; onDone: () => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Owner[] | null>(null);
  const [busy, setBusy] = useState(false);

  const search = async () => {
    if (!q.trim()) return;
    setBusy(true);
    try {
      const r = await api<{ items: Owner[] }>(`/api/admin/users?q=${encodeURIComponent(q.trim())}`);
      setFound(r.items.slice(0, 8));
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const assign = async (u: Owner) => {
    const who = u.name || formatPhoneDisplay(u.phone) || u.telegramUser || u.login || u.id;
    if (!(await confirmDialog({ title: "Buyurtma egasini almashtirasizmi?", text: `Buyurtma «${who}» kabinetiga o‘tadi.`, ok: "O‘tkazish" }))) return;
    setBusy(true);
    try {
      await api(`/api/admin/orders/${orderId}/owner`, { method: "POST", json: { userId: u.id } });
      toast("Egasi almashtirildi");
      setOpen(false);
      setFound(null);
      setQ("");
      onDone();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="Mijoz"
      right={
        <button type="button" onClick={() => setOpen((x) => !x)} className="t-body-s text-maroon hover:underline">
          {open ? "Yopish" : owner ? "Almashtirish" : "Biriktirish"}
        </button>
      }
    >
      {owner ? (
        <Rows>
          <Row k="Ism">{owner.name || "—"}</Row>
          <Row k="Telefon">{owner.phone ? <a href={`tel:${owner.phone}`} className="hover:text-maroon">{formatPhoneDisplay(owner.phone)}</a> : "—"}</Row>
          {owner.telegramUser && <Row k="Telegram">@{owner.telegramUser.replace(/^@/, "")}</Row>}
          {owner.login && <Row k="Login">{owner.login}</Row>}
          <Row k="Buyurtmalari">{owner.orders ?? "—"}</Row>
          <Row k="Oxirgi kirish">{owner.lastSeen ? fmtDateTime(owner.lastSeen) : "—"}</Row>
          <Row k="">
            <Link href={`/admin/foydalanuvchilar/k/?id=${owner.id}`} className="text-maroon hover:underline">
              Foydalanuvchi sahifasi →
            </Link>
          </Row>
        </Rows>
      ) : (
        <p className="t-body-s text-ink-2">
          Hisobga bog‘lanmagan (mehmon sifatida yaratilgan).
          {contactPhone ? <> Aloqa: {formatPhoneDisplay(contactPhone)}</> : null}
        </p>
      )}

      {open && (
        <div className="mt-4 border-t border-line pt-4">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void search();
            }}
          >
            <label className="relative flex min-w-0 flex-1 items-center">
              <SearchNormal1 size={15} className="pointer-events-none absolute left-3 text-ink-2" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Telefon, ism yoki Telegram"
                className="h-10 w-full rounded-full border border-line bg-bg-base pl-9 pr-3 t-body-s text-ink outline-none focus:border-maroon/55"
              />
            </label>
            <button type="submit" disabled={busy} className="btn btn-secondary btn-sm">
              Qidirish
            </button>
          </form>
          {found && (
            <ul className="mt-2 divide-y divide-line">
              {found.length === 0 && <li className="py-2 t-body-s text-ink-2">Topilmadi</li>}
              {found.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="min-w-0 truncate t-body-s text-ink">
                    {u.name || "—"} · {formatPhoneDisplay(u.phone) || u.telegramUser || u.login}
                  </span>
                  <button type="button" disabled={busy || u.id === owner?.id} onClick={() => assign(u)} className="shrink-0 t-body-s text-maroon hover:underline disabled:opacity-40">
                    {u.id === owner?.id ? "Joriy" : "Tanlash"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

/* ── Kichik yordamchilar ── */
function Card({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-panel border border-line bg-bg-base p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-serif text-[22px] font-light text-ink">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}
function Rows({ children }: { children: ReactNode }) {
  return <dl className="flex flex-col divide-y divide-line">{children}</dl>;
}
function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(96px,38%)_minmax(0,1fr)] gap-3 py-2 first:pt-0 last:pb-0">
      <dt className="t-body-s text-ink-2">{k}</dt>
      <dd className="min-w-0 t-body-m text-ink">{children}</dd>
    </div>
  );
}
