"use client";

import { Add, Trash } from "@/components/icons";
import type { FieldSpec, TemplateField } from "@/lib/templates";
import { SectionTitle, flowInput } from "./fields";

type Row = Record<string, string>;
export type Extra = Record<string, string | Row[]>;

/** Ro‘yxat qatorlari to‘liqmi (majburiy ustunlar to‘ldirilgan) — serverga faqat shunda yuboriladi */
export function extraReady(fields: TemplateField[], v: Extra) {
  return fields.every((f) => f.type !== "list" || ((v[f.key] as Row[] | undefined) ?? []).every((r) => Object.entries(f.item).every(([k, s]) => !s.required || (r[k] ?? "").trim())));
}

/** Majburiy qo‘shimcha maydonlar xatolari */
export function extraErrors(fields: TemplateField[], v: Extra): Record<string, string> {
  const e: Record<string, string> = {};
  for (const f of fields) {
    if (f.type === "list") {
      const rows = (v[f.key] as Row[] | undefined) ?? [];
      if (f.min > 0 && rows.length < f.min) e[f.key] = `Kamida ${f.min} ta qator qo‘shing`;
      else if (!extraReady([f], v)) e[f.key] = "Barcha majburiy ustunlarni to‘ldiring";
    } else if (f.required && !String(v[f.key] ?? "").trim()) e[f.key] = "To‘ldiring";
  }
  return e;
}

function Input({ spec, value, onChange, label }: { spec: FieldSpec; value: string; onChange: (v: string) => void; label: string }) {
  const common = { "aria-label": label, value, placeholder: spec.placeholder, onChange: (e: { target: { value: string } }) => onChange(e.target.value) };
  if (spec.type === "textarea") return <textarea {...common} rows={3} maxLength={spec.max ?? 1000} className={`${flowInput} !h-auto py-3`} />;
  if (spec.type === "select")
    return (
      <select {...common} className={flowInput}>
        <option value="">Tanlang</option>
        {(spec.options ?? []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  const type = spec.type === "time" ? "time" : spec.type === "date" ? "date" : spec.type === "number" ? "number" : "text";
  return <input {...common} type={type} maxLength={spec.max ?? 160} className={flowInput} />;
}

/** HTML shablon `fields` sxemasidan avtomatik qurilgan forma bloklari */
export function ExtraFields({ fields, value, onChange, errors = {} }: { fields: TemplateField[]; value: Extra; onChange: (v: Extra) => void; errors?: Record<string, string> }) {
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
              <SectionTitle>{f.label}</SectionTitle>
              {rows.map((r, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className={`grid flex-1 gap-2 ${cols.length > 2 ? "sm:grid-cols-[110px_1fr_1fr]" : cols.length === 2 ? "sm:grid-cols-[110px_1fr]" : ""}`}>
                    {cols.map(([k, s]) => (
                      <Input
                        key={k}
                        spec={s}
                        label={s.label}
                        value={r[k] ?? ""}
                        onChange={(v) => set(f.key, rows.map((x, j) => (j === i ? { ...x, [k]: v } : x)))}
                      />
                    ))}
                  </div>
                  <button type="button" aria-label="O‘chirish" onClick={() => set(f.key, rows.filter((_, j) => j !== i))} className="icon-btn mt-1.5 shrink-0">
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
                  <Add size={16} /> Qator qo‘shish
                </button>
              )}
              <p className="t-body-s text-ink-2">
                {cols.map(([, s]) => s.label + (s.required ? " *" : "")).join(" · ")} — ko‘pi bilan {f.max} ta
              </p>
              {err && <p className="t-body-s text-danger">{err}</p>}
            </div>
          );
        }
        return (
          <label key={f.key} id={`extra-${f.key}`} className="flex scroll-mt-28 flex-col gap-2">
            <span className="text-[13px] font-semibold leading-[1.35] text-ink">
              {f.label}
              {f.required && <span className="text-maroon"> *</span>}
            </span>
            <Input spec={f} label={f.label} value={String(value[f.key] ?? "")} onChange={(v) => set(f.key, v)} />
            {err ? <span className="t-body-s text-danger">{err}</span> : f.hint ? <span className="t-body-s text-ink-2">{f.hint}</span> : null}
          </label>
        );
      })}
    </>
  );
}
