"use client";

import { useEffect, useState } from "react";
import { api, Field, Input, Toggle, useToast } from "@/components/ui";
import { Add, ArrowDown2, ArrowUp2, CloseCircle } from "@/components/icons";
import { SocialIcon } from "@/components/SocialIcon";
import { SOCIAL_TYPES, phoneDisplay, type SocialConfig, type SocialLink, type SocialType } from "@/lib/social";

type Row = SocialLink & { _k: number };
let seq = 0;

/**
 * Ijtimoiy tarmoqlar va aloqa: sarlavha (mobil menyu), footer, bosh sahifadagi «Aloqa» bo‘limi, huquqiy sahifalar.
 * «@nom», telefon raqami yoki to‘liq havola kiritiladi — server to‘liq havolaga aylantiradi va tekshiradi.
 */
export function AdminSocialCard() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [phone, setPhone] = useState("");
  const [hours, setHours] = useState({ uz: "", ru: "", en: "" });
  const [hideBot, setHideBot] = useState(false);
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const apply = (s: SocialConfig) => {
    const r = s.links.map((l) => ({ ...l, _k: ++seq }));
    setRows(r);
    setPhone(s.phone ? phoneDisplay(s.phone) : "");
    setHours({ uz: s.workHours ?? "", ru: s.workHoursRu ?? "", en: s.workHoursEn ?? "" });
    setHideBot(!!s.hideTelegramBot);
    setSaved(JSON.stringify([s.links, s.phone ? phoneDisplay(s.phone) : "", s.workHours, s.workHoursRu ?? "", s.workHoursEn ?? "", !!s.hideTelegramBot]));
  };
  useEffect(() => {
    api<{ social: SocialConfig }>("/api/admin/social")
      .then((r) => apply(r.social))
      .catch((e) => setErr((e as Error).message));
  }, []);

  if (err) return <p className="t-body-s text-danger">{err}</p>;
  if (!rows) return <p className="t-body-s text-ink-2">Yuklanmoqda…</p>;

  const current = JSON.stringify([rows.map(({ _k, ...l }) => l), phone.trim(), hours.uz, hours.ru, hours.en, hideBot]);
  const dirty = current !== saved;
  const used = new Set(rows.map((r) => r.type));
  const add = (type: SocialType) => setRows([...rows, { type, url: "", label: "", _k: ++seq }]);
  const set = (k: number, p: Partial<Row>) => setRows(rows.map((r) => (r._k === k ? { ...r, ...p } : r)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    setRows(next);
  };

  const save = async () => {
    setBusy(true);
    try {
      const r = await api<{ social: SocialConfig }>("/api/admin/social", {
        method: "PUT",
        json: {
          links: rows.filter((x) => x.url.trim()).map(({ _k, ...l }) => l),
          phone: phone.trim(),
          workHours: hours.uz,
          workHoursRu: hours.ru,
          workHoursEn: hours.en,
          hideTelegramBot: hideBot,
        },
      });
      apply(r.social);
      toast("Saqlandi — saytda darhol ko‘rinadi");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-5 rounded-panel border border-line bg-bg-base p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-serif text-[24px] font-light text-ink">Ijtimoiy tarmoqlar va aloqa</h2>
          <p className="t-body-s mt-1 text-ink-2">
            Sarlavha (mobil menyu), footer, bosh sahifadagi «Aloqa» bo‘limi va huquqiy sahifalarda chiqadi. Tartibi — shu ro‘yxat tartibi. «@nom», telefon yoki to‘liq havola yozing — tekshirib, to‘liq havolaga aylantiriladi.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {dirty && (
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => api<{ social: SocialConfig }>("/api/admin/social").then((r) => apply(r.social))}>
              Bekor qilish
            </button>
          )}
          <button type="button" className="btn btn-primary btn-sm" disabled={busy || !dirty} onClick={save}>
            {busy ? "Saqlanmoqda…" : "Saqlash"}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-card bg-bg-soft px-4 py-3">
        <span className="flex min-w-0 items-center gap-3 t-body-m text-ink">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg-base text-maroon">
            <SocialIcon type="bot" size={17} />
          </span>
          <span className="min-w-0">
            Support Telegram bot <span className="block t-body-s text-ink-2">Doim ishlaydi (chat, «Telegram orqali» tugmalari). Ikonkalar qatorida ko‘rsatish:</span>
          </span>
        </span>
        <Toggle checked={!hideBot} onChange={(v) => setHideBot(!v)} label="Support botni ko‘rsatish" />
      </div>

      {rows.length > 0 && (
        <ol className="flex flex-col gap-2.5">
          {rows.map((r, i) => {
            const meta = SOCIAL_TYPES.find((x) => x.type === r.type);
            return (
              <li key={r._k} className="flex flex-col gap-2 rounded-card border border-line p-3 sm:flex-row sm:items-center">
                <span className="flex items-center gap-2.5 sm:w-[170px] sm:shrink-0">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg-soft text-maroon">
                    <SocialIcon type={r.type} size={17} />
                  </span>
                  <span className="t-body-m font-medium text-ink">{meta?.name ?? r.type}</span>
                </span>
                <Input
                  value={r.url}
                  onChange={(e) => set(r._k, { url: e.target.value })}
                  placeholder={meta?.placeholder}
                  aria-label={`${meta?.name ?? r.type} havolasi`}
                  className="min-w-0 flex-1"
                />
                <div className="flex shrink-0 items-center justify-end">
                  <IconBtn label="Yuqoriga" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp2 size={16} />
                  </IconBtn>
                  <IconBtn label="Pastga" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown2 size={16} />
                  </IconBtn>
                  <IconBtn label="O‘chirish" danger onClick={() => setRows(rows.filter((x) => x._k !== r._k))}>
                    <CloseCircle size={17} />
                  </IconBtn>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div>
        <p className="mb-2 t-body-s font-medium text-ink">Tarmoq qo‘shish</p>
        <div className="flex flex-wrap gap-2">
          {SOCIAL_TYPES.map((x) => (
            <button
              key={x.type}
              type="button"
              disabled={rows.length >= 12}
              onClick={() => add(x.type)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 t-body-s transition-colors hover:bg-bg-soft disabled:opacity-40 ${used.has(x.type) ? "border-line text-ink-2" : "border-line-dark text-ink"}`}
            >
              <SocialIcon type={x.type} size={15} /> {x.name} <Add size={14} className="text-maroon" />
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
        <Field label="Telefon (qo‘ng‘iroq uchun)" hint="Bo‘sh qolsa — qo‘ng‘iroq tugmalari chiqmaydi">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" inputMode="tel" />
        </Field>
        <Field label="Ish vaqti" hint="Mobil menyu va to‘lov sahifasida">
          <Input value={hours.uz} onChange={(e) => setHours({ ...hours, uz: e.target.value })} placeholder="Har kuni 9:00 – 21:00" maxLength={60} />
        </Field>
        <Field label="Ish vaqti (ruscha)" hint="Bo‘sh qolsa — avtomatik tarjima yoki o‘zbekchasi">
          <Input value={hours.ru} onChange={(e) => setHours({ ...hours, ru: e.target.value })} placeholder="Ежедневно 9:00 – 21:00" maxLength={60} />
        </Field>
        <Field label="Ish vaqti (inglizcha)">
          <Input value={hours.en} onChange={(e) => setHours({ ...hours, en: e.target.value })} placeholder="Daily 9:00 – 21:00" maxLength={60} />
        </Field>
      </div>
    </section>
  );
}

function IconBtn({ label, disabled, danger, onClick, children }: { label: string; disabled?: boolean; danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex size-9 items-center justify-center rounded-full hover:bg-bg-soft disabled:opacity-30 ${danger ? "text-[#b3261e]" : "text-ink-2"}`}
    >
      {children}
    </button>
  );
}
