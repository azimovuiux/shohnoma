"use client";

import { Add, Trash } from "@/components/icons";
import { DateField, SelectField, TimeField } from "./pickers";
import type { FieldSpec, TemplateField } from "@/lib/templates";
import { SectionTitle, flowInput } from "./fields";
import { tr, useT } from "@/lib/i18n";

type T = (s: string, vars?: Record<string, string | number>) => string;
const uzT: T = (s, vars) => tr("uz", s, vars);

type Row = Record<string, string>;
export type Extra = Record<string, string | Row[]>;

/** Ro‘yxat qatorlari to‘liqmi (majburiy ustunlar to‘ldirilgan) — serverga faqat shunda yuboriladi.
 *  Faqat shablon `fields` sxemasidagi kalitlar tekshiriladi — `lang` kabi tizim kalitlari e’tiborga olinmaydi. */
export function extraReady(fields: TemplateField[], v: Extra) {
  return fields.every((f) => f.type !== "list" || ((v[f.key] as Row[] | undefined) ?? []).every((r) => Object.entries(f.item).every(([k, s]) => !s.required || (r[k] ?? "").trim())));
}

/** Majburiy qo‘shimcha maydonlar xatolari */
export function extraErrors(fields: TemplateField[], v: Extra, t: T = uzT): Record<string, string> {
  const e: Record<string, string> = {};
  for (const f of fields) {
    if (f.type === "list") {
      const rows = (v[f.key] as Row[] | undefined) ?? [];
      if (f.min > 0 && rows.length < f.min) e[f.key] = t("Kamida {n} ta qator qo‘shing", { n: f.min });
      else if (!extraReady([f], v)) e[f.key] = t("Barcha majburiy ustunlarni to‘ldiring");
    } else if (f.required && !String(v[f.key] ?? "").trim()) e[f.key] = t("To‘ldiring");
  }
  return e;
}

function Input({ spec, value, onChange, label }: { spec: FieldSpec; value: string; onChange: (v: string) => void; label: string }) {
  const t = useT();
  const common = { "aria-label": label, value, placeholder: spec.placeholder ? t(spec.placeholder) : undefined, onChange: (e: { target: { value: string } }) => onChange(e.target.value) };
  if (spec.type === "textarea") return <textarea {...common} rows={3} maxLength={spec.max ?? 1000} className={`${flowInput} !h-auto py-3`} />;
  if (spec.type === "select")
    return <SelectField label={label} value={value} onChange={onChange} options={(spec.options ?? []).map((o) => ({ value: o, label: t(o) }))} />;
  if (spec.type === "time") return <TimeField label={label} value={value} onChange={onChange} />;
  if (spec.type === "date") return <DateField label={label} value={value} onChange={onChange} />;
  const type = spec.type === "number" ? "number" : "text";
  return <input {...common} type={type} maxLength={spec.max ?? 160} className={flowInput} />;
}

/** HTML shablon `fields` sxemasidan avtomatik qurilgan forma bloklari */
export function ExtraFields({ fields, value, onChange, errors = {} }: { fields: TemplateField[]; value: Extra; onChange: (v: Extra) => void; errors?: Record<string, string> }) {
  const t = useT();
  if (!fields.length) return null;
  const set = (k: string, v: string | Row[]) => onChange({ ...value, [k]: v });
  return (
    <>
      {fields.map((f) => {
        const err = errors[f.key];
        if (f.type === "list") {
          const rows = (value[f.key] as Row[] | undefined) ?? [];
          const cols = Object.entries(f.item);
          const blank = Object.fromEntries(cols.map(([k]) => [k, ""]));
          return (
            <div key={f.key} id={`extra-${f.key}`} className="flex scroll-mt-28 flex-col gap-3" aria-invalid={!!err}>
              <SectionTitle>{t(f.label)}</SectionTitle>
              {rows.map((r, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className={`grid flex-1 gap-2 ${cols.length > 2 ? "sm:grid-cols-[124px_1fr_1fr]" : cols.length === 2 ? "sm:grid-cols-[124px_1fr]" : ""}`}>
                    {cols.map(([k, s]) => (
                      <Input
                        key={k}
                        spec={s}
                        label={t(s.label)}
                        value={r[k] ?? ""}
                        onChange={(v) => set(f.key, rows.map((x, j) => (j === i ? { ...x, [k]: v } : x)))}
                      />
                    ))}
                  </div>
                  <button type="button" aria-label={t("O‘chirish")} onClick={() => set(f.key, rows.filter((_, j) => j !== i))} className="icon-btn mt-1.5 shrink-0">
                    <Trash size={16} />
                  </button>
                </div>
              ))}
              {rows.length < f.max && (
                <button
                  type="button"
                  onClick={() => set(f.key, [...rows, blank])}
                  className="flex w-fit items-center gap-2 rounded-full border border-line px-4 py-2.5 t-nav text-ink hover:bg-bg-soft"
                >
                  <Add size={16} /> {t("Qator qo‘shish")}
                </button>
              )}
              <p className="t-body-s text-ink-2">
                {cols.map(([, s]) => t(s.label) + (s.required ? " *" : "")).join(" · ")} — {t("ko‘pi bilan {n} ta", { n: f.max })}
              </p>
              {err && <p className="t-body-s text-danger">{err}</p>}
            </div>
          );
        }
        return (
          <label key={f.key} id={`extra-${f.key}`} className="flex scroll-mt-28 flex-col gap-2">
            <span className="text-[13px] font-semibold leading-[1.35] text-ink">
              {t(f.label)}
              {f.required && <span className="text-maroon"> *</span>}
            </span>
            <Input spec={f} label={t(f.label)} value={String(value[f.key] ?? "")} onChange={(v) => set(f.key, v)} />
            {err ? <span className="t-body-s text-danger">{err}</span> : f.hint ? <span className="t-body-s text-ink-2">{t(f.hint)}</span> : null}
          </label>
        );
      })}
    </>
  );
}
