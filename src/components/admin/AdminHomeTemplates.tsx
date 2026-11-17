"use client";

import { useEffect, useMemo, useState } from "react";
import { HOME_MAX, ceremonyNames, type Template } from "@/lib/templates";
import { api, useToast } from "@/components/ui";
import { Add, ArrowDown2, ArrowUp2, CloseCircle, Home2 } from "@/components/icons";

/**
 * Bosh sahifa: qaysi shablonlar (ko‘pi bilan HOME_MAX ta) va qaysi tartibda chiqadi.
 * O‘zgarishlar «Saqlash» bosilgandan keyin saytda darhol ko‘rinadi (/api/templates.js).
 */
export function AdminHomeTemplates({ templates, home, onSaved }: { templates: Template[]; home: string[]; onSaved: () => void }) {
  const toast = useToast();
  const [draft, setDraft] = useState<string[]>(home);
  const [busy, setBusy] = useState(false);
  useEffect(() => setDraft(home), [home]);

  const by = useMemo(() => new Map(templates.map((t) => [t.slug, t])), [templates]);
  const chosen = draft.map((s) => by.get(s)).filter((t): t is Template => !!t);
  const rest = templates.filter((t) => t.active !== false && !draft.includes(t.slug));
  const hidden = templates.filter((t) => t.active === false).length;
  const dirty = draft.join(",") !== home.join(",");
  const full = draft.length >= HOME_MAX;

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= draft.length) return;
    const next = [...draft];
    [next[i], next[j]] = [next[j], next[i]];
    setDraft(next);
  };

  const save = async () => {
    setBusy(true);
    try {
      await api("/api/admin/templates-home", { method: "PUT", json: { slugs: draft } });
      toast("Bosh sahifa saqlandi");
      onSaved();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-10 rounded-panel border border-line bg-bg-base p-3 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-serif text-[26px] font-light text-ink">
            <Home2 size={22} className="text-gold" /> Bosh sahifa
          </h2>
          <p className="t-body-s text-ink-2">
            «Tayyor dizaynlar» bo‘limida chiqadigan shablonlar va ularning tartibi — ko‘pi bilan {HOME_MAX} ta. Qolganlari «Barcha shablonlar» sahifasida.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {dirty && (
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => setDraft(home)}>
              Bekor qilish
            </button>
          )}
          <button type="button" className="btn btn-primary btn-sm" disabled={busy || !dirty} onClick={save}>
            {busy ? "Saqlanmoqda…" : "Saqlash"}
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <p className="mb-2 t-body-s font-medium text-ink">
            Tanlangan: {chosen.length} / {HOME_MAX}
          </p>
          {chosen.length === 0 ? (
            <p className="rounded-card border border-dashed border-line px-4 py-6 text-center t-body-s text-ink-2">
              Hali tanlanmagan — o‘ngdagi ro‘yxatdan qo‘shing.
            </p>
          ) : (
            <ol className="divide-y divide-line overflow-hidden rounded-card border border-line">
              {chosen.map((t, i) => (
                <li key={t.slug} className="flex items-center gap-2 px-2 py-2.5 sm:gap-3 sm:px-3">
                  <span className="w-5 shrink-0 text-center font-serif text-[20px] text-gold sm:w-6">{i + 1}</span>
                  <Thumb t={t} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate t-title text-ink">
                      <span className="mr-1 t-body-s text-ink-2">#{t.number}</span>
                      {t.name}
                    </p>
                    <p className="truncate t-body-s text-ink-2">{ceremonyNames(t)}</p>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <IconBtn label="Yuqoriga" disabled={busy || i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp2 size={16} />
                    </IconBtn>
                    <IconBtn label="Pastga" disabled={busy || i === chosen.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDown2 size={16} />
                    </IconBtn>
                    <IconBtn label="Bosh sahifadan olib tashlash" disabled={busy} danger onClick={() => setDraft(draft.filter((s) => s !== t.slug))}>
                      <CloseCircle size={17} />
                    </IconBtn>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="min-w-0">
          <p className="mb-2 t-body-s font-medium text-ink">
            Qo‘shish uchun {full && <span className="font-normal text-ink-2">— {HOME_MAX} ta to‘ldi, avval birini olib tashlang</span>}
          </p>
          {rest.length === 0 ? (
            <p className="t-body-s text-ink-2">Barcha faol shablonlar tanlangan.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {rest.map((t) => (
                <li key={t.slug}>
                  <button
                    type="button"
                    disabled={busy || full}
                    onClick={() => setDraft([...draft, t.slug])}
                    className="flex w-full items-center gap-3 rounded-card border border-line px-3 py-2 text-left transition-colors hover:bg-bg-soft disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Thumb t={t} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate t-body-m text-ink">
                        <span className="mr-1 t-body-s text-ink-2">#{t.number}</span>
                        {t.name}
                      </span>
                      <span className="block truncate t-body-s text-ink-2">{ceremonyNames(t)}</span>
                    </span>
                    <Add size={18} className="shrink-0 text-maroon" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {hidden > 0 && <p className="mt-3 t-body-s text-ink-2">Saytda yashirilgan {hidden} ta shablon bu yerda ko‘rinmaydi.</p>}
        </div>
      </div>
    </section>
  );
}

function Thumb({ t }: { t: Template }) {
  const src = t.images?.phone;
  return (
    <span className="block h-[46px] w-[26px] shrink-0 overflow-hidden rounded-[6px] bg-bg-soft sm:h-[52px] sm:w-[30px]">
      {src && <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover object-top" />}
    </span>
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
      className={`flex size-9 shrink-0 items-center justify-center rounded-full sm:size-10 hover:bg-bg-soft disabled:opacity-30 ${danger ? "text-[#b3261e]" : "text-ink-2"}`}
    >
      {children}
    </button>
  );
}
