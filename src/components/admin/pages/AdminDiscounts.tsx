"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/client";
import { Field, Input, Segment, Toggle, api, confirmDialog, useCopy, useToast } from "@/components/ui";
import { Copy, Trash } from "@/components/icons";
import { DateField } from "@/components/order/pickers";
import { formatPrice } from "@/lib/format";
import { AdminError, AdminLoading, AdminTitle, Empty } from "../shared";

type Discount = { percent: number; until: string | null };
type Promo = { id: string; code: string; kind: "percent" | "fixed"; value: number; maxUses: number | null; used: number; expiresAt: string | null; active: boolean; note: string | null; createdAt: string };

const today = () => new Date().toISOString().slice(0, 10);
const digits = (s: string) => s.replace(/\D/g, "");
const spaced = (s: string) => digits(s).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const promoValue = (p: Pick<Promo, "kind" | "value">) => (p.kind === "percent" ? `−${p.value}%` : `−${formatPrice(p.value)}`);
const dmy = (iso: string) => iso.split("-").reverse().join(".");

/** Admin → Chegirmalar: barcha shablonlarga umumiy chegirma va promokodlar */
export function AdminDiscounts() {
  return (
    <>
      <AdminTitle title="Chegirmalar" sub="Umumiy chegirma barcha shablon narxlariga qo‘llanadi. Promokodni mijoz to‘lov sahifasida kiritadi." />
      <GlobalDiscount />
      <Promos />
    </>
  );
}

function GlobalDiscount() {
  const toast = useToast();
  const [d, setD] = useState<Discount | null>(null);
  const [active, setActive] = useState(0);
  const [pct, setPct] = useState("");
  const [until, setUntil] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    apiGet<{ discount: Discount; activePercent: number }>("/api/admin/discount")
      .then((r) => {
        setD(r.discount);
        setActive(r.activePercent);
        setPct(r.discount.percent ? String(r.discount.percent) : "");
        setUntil(r.discount.until ?? "");
      })
      .catch((e) => setErr((e as Error).message));
  }, []);
  const save = async (percent: number, u: string) => {
    if (percent > 0 && !(await confirmDialog({ title: `Barcha shablonlarga ${percent}% chegirma qo‘llansinmi?`, text: u ? `${dmy(u)} kuni oxirigacha amal qiladi. Katalogda eski narx chizilgan holda ko‘rinadi.` : "Muddatsiz — o‘zingiz o‘chirmaguningizcha amal qiladi. Katalogda eski narx chizilgan holda ko‘rinadi.", ok: "Qo‘llash" }))) return;
    setBusy(true);
    try {
      const r = await api<{ discount: Discount; activePercent: number }>("/api/admin/discount", { method: "PUT", json: { percent, until: u } });
      setD(r.discount);
      setActive(r.activePercent);
      setPct(r.discount.percent ? String(r.discount.percent) : "");
      setUntil(r.discount.until ?? "");
      toast(percent ? "Chegirma qo‘llandi" : "Chegirma o‘chirildi");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  if (err) return <AdminError message={err} onRetry={() => location.reload()} />;
  if (!d) return <AdminLoading />;
  const n = Number(digits(pct)) || 0;
  return (
    <section className="flex flex-col gap-4 rounded-card border border-line bg-bg-base p-5 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="t-title text-ink">Umumiy chegirma</h2>
          <p className="t-body-s text-ink-2">
            {active ? `Hozir amalda: −${active}%${d.until ? ` (${dmy(d.until)} gacha)` : ""}` : d.percent ? `Muddati tugagan (${d.until ? dmy(d.until) : ""})` : "Hozir chegirma yo‘q"}
          </p>
        </div>
        {d.percent > 0 && (
          <button type="button" disabled={busy} onClick={() => save(0, "")} className="btn btn-secondary btn-sm">
            Chegirmani o‘chirish
          </button>
        )}
      </div>
      <form
        className="grid items-end gap-3 sm:grid-cols-[160px_220px_max-content]"
        onSubmit={(e) => {
          e.preventDefault();
          if (n < 1 || n > 90) return toast("Chegirma 1% dan 90% gacha bo‘lishi kerak", "error");
          void save(n, until);
        }}
      >
        <Field label="Chegirma, %">
          <Input inputMode="numeric" value={pct} onChange={(e) => setPct(digits(e.target.value).slice(0, 2))} placeholder="Masalan, 20" />
        </Field>
        <div className="flex flex-col gap-[7px]">
          <span className="t-body-s text-ink-2">Amal qilish muddati (ixtiyoriy)</span>
          <DateField value={until} onChange={setUntil} min={today()} label="Muddat" />
        </div>
        <button type="submit" disabled={busy || !n} className="btn btn-primary">
          {d.percent ? "Yangilash" : "Qo‘llash"}
        </button>
      </form>
      {until && (
        <button type="button" onClick={() => setUntil("")} className="w-fit t-body-s text-ink-2 hover:text-maroon">
          Muddatni olib tashlash
        </button>
      )}
    </section>
  );
}

function Promos() {
  const toast = useToast();
  const copy = useCopy();
  const [list, setList] = useState<Promo[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<"gen" | "own">("gen");
  const [kind, setKind] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("");
  const [count, setCount] = useState("1");
  const [prefix, setPrefix] = useState("");
  const [code, setCode] = useState("");
  const [maxUses, setMaxUses] = useState("1");
  const [exp, setExp] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState<string[]>([]);
  const [q, setQ] = useState("");

  const load = () =>
    apiGet<{ promos: Promo[] }>("/api/admin/promos")
      .then((r) => setList(r.promos))
      .catch((e) => setErr((e as Error).message));
  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    const v = Number(digits(value));
    if (kind === "percent" ? v < 1 || v > 90 : v < 1000) return toast(kind === "percent" ? "Foiz 1 dan 90 gacha" : "Summa kamida 1 000 so‘m", "error");
    setBusy(true);
    try {
      const r = await api<{ codes: string[] }>("/api/admin/promos", {
        method: "POST",
        json: { kind, value: v, maxUses: maxUses ? Number(maxUses) : null, expiresAt: exp, note, ...(mode === "own" ? { code } : { count: Number(count) || 1, prefix }) },
      });
      setFresh(r.codes);
      setCode("");
      toast(r.codes.length > 1 ? `${r.codes.length} ta promokod yaratildi` : `Promokod yaratildi: ${r.codes[0]}`);
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (p: Promo, active: boolean) => {
    setList((l) => l?.map((x) => (x.id === p.id ? { ...x, active } : x)) ?? null);
    try {
      await api(`/api/admin/promos/${p.id}`, { method: "PATCH", json: { active } });
    } catch (e) {
      setList((l) => l?.map((x) => (x.id === p.id ? { ...x, active: !active } : x)) ?? null);
      toast((e as Error).message, "error");
    }
  };
  const remove = async (p: Promo) => {
    if (!(await confirmDialog({ title: `${p.code} promokodi o‘chirilsinmi?`, text: p.used ? `U ${p.used} marta ishlatilgan. Avval qo‘llangan buyurtmalardagi chegirma saqlanadi.` : undefined, ok: "O‘chirish", danger: true }))) return;
    try {
      await api(`/api/admin/promos/${p.id}`, { method: "DELETE" });
      setList((l) => l?.filter((x) => x.id !== p.id) ?? null);
      toast("Promokod o‘chirildi");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };
  const shown = useMemo(() => {
    const n = q.trim().toUpperCase();
    return (list ?? []).filter((p) => !n || p.code.includes(n) || (p.note ?? "").toUpperCase().includes(n));
  }, [list, q]);
  const status = (p: Promo) =>
    !p.active ? "O‘chirilgan" : p.expiresAt && p.expiresAt < today() ? "Muddati tugagan" : p.maxUses !== null && p.used >= p.maxUses ? "Limit tugagan" : "Faol";

  return (
    <section className="flex flex-col gap-5 rounded-card border border-line bg-bg-base p-5 lg:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="t-title text-ink">Promokodlar</h2>
        <p className="t-body-s text-ink-2">Mijoz to‘lov sahifasida promokodni kiritadi — chegirma buyurtma narxidan ayriladi (umumiy chegirmadan keyin).</p>
      </div>

      <form
        className="flex flex-col gap-4 rounded-panel bg-bg-soft p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <div className="flex flex-wrap gap-3">
          <Segment value={mode} onChange={setMode} options={[{ value: "gen", label: "Generatsiya" }, { value: "own", label: "O‘z kodim" }]} />
          <Segment value={kind} onChange={setKind} options={[{ value: "percent", label: "Foiz" }, { value: "fixed", label: "Summa" }]} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={kind === "percent" ? "Chegirma, %" : "Chegirma, so‘m"}>
            <Input inputMode="numeric" value={kind === "percent" ? value : spaced(value)} onChange={(e) => setValue(digits(e.target.value).slice(0, kind === "percent" ? 2 : 8))} placeholder={kind === "percent" ? "10" : "20 000"} required />
          </Field>
          {mode === "gen" ? (
            <>
              <Field label="Nechta kod">
                <Input inputMode="numeric" value={count} onChange={(e) => setCount(digits(e.target.value).slice(0, 3))} />
              </Field>
              <Field label="Old qo‘shimcha (ixtiyoriy)">
                <Input value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))} placeholder="TOY" />
              </Field>
            </>
          ) : (
            <Field label="Kod">
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40))} placeholder="BAHOR2026" required />
            </Field>
          )}
          <Field label="Har bir kod necha marta (bo‘sh — cheksiz)">
            <Input inputMode="numeric" value={maxUses} onChange={(e) => setMaxUses(digits(e.target.value).slice(0, 5))} placeholder="cheksiz" />
          </Field>
          <div className="flex flex-col gap-[7px]">
            <span className="t-body-s text-ink-2">Amal qilish muddati (ixtiyoriy)</span>
            <DateField value={exp} onChange={setExp} min={today()} label="Muddat" />
          </div>
          <Field label="Izoh (ixtiyoriy)">
            <Input value={note} onChange={(e) => setNote(e.target.value.slice(0, 190))} placeholder="Masalan, Instagram aksiyasi" />
          </Field>
        </div>
        <button type="submit" disabled={busy} className="btn btn-primary w-full sm:w-fit">
          {busy ? "Yaratilmoqda…" : mode === "gen" ? "Promokod generatsiya qilish" : "Promokod yaratish"}
        </button>
        {fresh.length > 0 && (
          <div className="flex flex-col gap-2 rounded-xl border border-line bg-bg-base p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="t-body-s text-ink-2">Yangi kodlar ({fresh.length})</span>
              <button type="button" onClick={() => copy(fresh.join("\n"), "Kodlar nusxalandi")} className="inline-flex items-center gap-1.5 t-body-s font-medium text-maroon hover:underline">
                <Copy size={14} /> Hammasini nusxalash
              </button>
            </div>
            <p className="max-h-32 overflow-y-auto font-mono text-[14px] leading-[1.6] text-ink">{fresh.join("  ·  ")}</p>
          </div>
        )}
      </form>

      {err ? (
        <AdminError message={err} onRetry={load} />
      ) : !list ? (
        <AdminLoading />
      ) : list.length === 0 ? (
        <Empty>Hali promokod yo‘q</Empty>
      ) : (
        <>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kod yoki izoh bo‘yicha qidirish" className="sm:max-w-[360px]" />
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-bg-soft t-body-s text-ink-2">
                <tr>
                  {["Kod", "Chegirma", "Ishlatilgan", "Muddat", "Holat", "Izoh", ""].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line t-body-m text-ink">
                {shown.map((p) => (
                  <tr key={p.id} className={p.active ? "" : "text-ink-2"}>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => copy(p.code, "Kod nusxalandi")} className="inline-flex items-center gap-1.5 font-mono font-semibold hover:text-maroon" title="Nusxalash">
                        {p.code} <Copy size={13} className="opacity-50" />
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{promoValue(p)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.used} / {p.maxUses ?? "∞"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap t-body-s">{p.expiresAt ? dmy(p.expiresAt) : "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap t-body-s">{status(p)}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 t-body-s text-ink-2">{p.note ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <Toggle checked={p.active} onChange={(v) => toggle(p, v)} label="Faol" />
                        <button type="button" onClick={() => remove(p)} aria-label={`${p.code} ni o‘chirish`} className="text-ink-2 hover:text-danger">
                          <Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
