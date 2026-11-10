"use client";

import Link from "next/link";
import { useState } from "react";
import { useApi } from "@/lib/client";
import { ceremonyNames, styleLabel, type Template } from "@/lib/templates";
import { formatPrice } from "@/lib/format";
import { Toggle, api, confirmDialog, useToast } from "@/components/ui";
import { Edit, Eye, Trash } from "@/components/icons";
import { PhoneFrame } from "@/components/mockups/Devices";
import { InvitationScreen } from "@/components/mockups/InvitationScreen";
import { AdminError, AdminLoading, AdminTitle, Empty } from "../shared";

export type AdminTemplate = Template & { orders: number };

export function AdminTemplates() {
  const { data, loading, error, reload } = useApi<{ ok: boolean; templates: AdminTemplate[] }>("/api/admin/templates");
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  if (loading && !data) return <AdminLoading />;
  if (!data) return <AdminError message={error?.message} onRetry={() => reload()} />;
  const list = data.templates;

  const patch = async (t: AdminTemplate, body: Record<string, unknown>, msg: string) => {
    setBusy(t.slug);
    try {
      await api(`/api/admin/templates/${t.slug}`, { method: "PATCH", json: body });
      toast(msg);
      await reload(true);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };
  const remove = async (t: AdminTemplate) => {
    if (!(await confirmDialog({ title: `“${t.name}” shablonini butunlay o‘chirasizmi?`, ok: "O‘chirish", danger: true }))) return;
    setBusy(t.slug);
    try {
      await api(`/api/admin/templates/${t.slug}`, { method: "DELETE" });
      toast("Shablon o‘chirildi");
      await reload(true);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <AdminTitle
        title="Shablonlar"
        sub={`${list.filter((t) => t.active).length} ta faol, jami ${list.length} ta. O‘zgarishlar saytda darhol ko‘rinadi.`}
      />
      {list.length === 0 ? (
        <Empty>Hali shablon yo‘q</Empty>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => (
            <li key={t.slug} className={`flex gap-4 rounded-panel border border-line bg-bg-base p-4 ${t.active ? "" : "opacity-60"}`}>
              <PhoneFrame className="w-[92px] shrink-0">
                <InvitationScreen t={t} />
              </PhoneFrame>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-serif text-[22px] font-medium leading-tight text-ink">
                    <span className="mr-1.5 t-body-s text-ink-2">#{t.number}</span>
                    {t.name}
                  </p>
                </div>
                <p className="t-body-s text-ink-2">
                  {ceremonyNames(t)} · {styleLabel[t.style]}
                  {t.kind === "html" && <span className="ml-1.5 rounded-full bg-gold-soft px-2 py-0.5 text-[11px] text-maroon">HTML v{t.version}</span>}
                </p>
                <p className="t-title text-maroon">
                  {formatPrice(t.price)}
                  {t.priceOld > t.price && <s className="ml-2 t-body-s font-normal text-ink-2">{formatPrice(t.priceOld)}</s>}
                </p>
                <p className="t-body-s text-ink-2">{t.orders} ta buyurtma</p>
                <div className="mt-auto flex flex-col gap-2 pt-2">
                  <label className="flex items-center justify-between gap-2 t-body-s text-ink">
                    Saytda ko‘rinadi
                    <Toggle checked={!!t.active} onChange={(v) => busy !== t.slug && patch(t, { active: v }, v ? "Shablon yoqildi" : "Shablon yashirildi")} label="Faol" />
                  </label>
                  <label className="flex items-center justify-between gap-2 t-body-s text-ink">
                    Bosh sahifada
                    <Toggle checked={!!t.featured} onChange={(v) => busy !== t.slug && patch(t, { featured: v }, "Saqlandi")} label="Bosh sahifada" />
                  </label>
                  <div className="flex items-center gap-1.5 pt-1">
                    <Link href={`/admin/shablonlar/tahrir/?slug=${t.slug}`} className="btn btn-secondary btn-sm flex-1 !px-3 !py-2.5">
                      <Edit size={15} /> Tahrirlash
                    </Link>
                    <a href={`/namuna/${t.slug}/`} target="_blank" rel="noopener noreferrer" className="icon-btn !h-9 !w-9" aria-label="Namunani ko‘rish">
                      <Eye size={16} />
                    </a>
                    <button type="button" onClick={() => remove(t)} disabled={busy === t.slug} className="icon-btn !h-9 !w-9 text-danger" aria-label="O‘chirish">
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
