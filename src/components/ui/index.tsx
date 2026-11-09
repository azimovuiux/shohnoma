"use client";

/**
 * Umumiy UI primitivlari (spec §5.5–5.6, §5.12). Barcha sahifalar shularni ishlatadi.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Add, CloseCircle, Minus, TickCircle } from "@/components/icons";
import { currentLocale, tr } from "@/lib/i18n";

/* ── Field / Input ── */

export function Field({
  label,
  required,
  hint,
  error,
  children,
  className = "",
}: {
  label?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-[7px] ${className}`}>
      {label && (
        <span className="t-body-s text-ink-2">
          {label}
          {required && <span className="text-maroon"> *</span>}
        </span>
      )}
      {children}
      {error ? <span className="t-body-s text-danger">{error}</span> : hint ? <span className="t-body-s text-ink-2">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "h-12 w-full rounded-input border border-line bg-bg-base px-4 t-body-m text-ink outline-none transition-colors placeholder:text-ink-2/80 focus:border-maroon/55 aria-[invalid=true]:border-danger";

export function Input({ className = "", ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={`${inputClass} ${className}`} />;
}

export function Textarea({ className = "", ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={`${inputClass} h-auto min-h-28 resize-y py-3 ${className}`} />;
}

/** +998 prefiksli telefon; qiymat — 9 ta raqam (formatlangan) */
export function PhoneInput({
  value,
  onChange,
  invalid,
  autoFocus,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  autoFocus?: boolean;
  id?: string;
}) {
  return (
    <span
      className={`flex h-12 items-center gap-2.5 rounded-input border bg-bg-base px-4 focus-within:border-maroon/55 ${invalid ? "border-danger" : "border-line"}`}
    >
      <span className="t-body-m text-ink">+998</span>
      <span className="h-[18px] w-px bg-line" />
      <input
        id={id}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(formatPhone9(e.target.value))}
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="90 123 45 67"
        aria-invalid={invalid}
        className="h-full w-full bg-transparent t-body-m text-ink outline-none placeholder:text-ink-2/80"
      />
    </span>
  );
}

export function formatPhone9(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("998") && d.length > 9) d = d.slice(3);
  d = d.slice(0, 9);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(" ");
}
export const phoneDigits = (v: string) => v.replace(/\D/g, "");
/** "+998901234567" → "90 123 45 67" */
export const phoneToLocal = (p?: string | null) => (p ? formatPhone9(p.replace(/^\+?998/, "")) : "");

/* ── Toggle / Segment / Stepper ── */

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${checked ? "bg-maroon" : "bg-[#D9CFC0]"}`}
    >
      <span className={`absolute top-[3px] size-[18px] rounded-full bg-white shadow-soft transition-[left] ${checked ? "left-[19px]" : "left-[3px]"}`} />
    </button>
  );
}

export function Segment<T extends string>({
  value,
  options,
  onChange,
  tone = "light",
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  tone?: "light" | "maroon";
}) {
  return (
    <div className="flex rounded-full bg-bg-soft p-1" role="radiogroup">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-4 t-nav transition-colors ${
              active ? (tone === "maroon" ? "bg-maroon text-ink-inverse" : "bg-bg-base text-maroon shadow-soft") : "text-ink-2"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Stepper({ value, onChange, min = 1, max = 10 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Kamaytirish" className="icon-btn !size-[38px] disabled:opacity-40">
        <Minus size={16} />
      </button>
      <span className="w-8 text-center font-serif text-[24px] font-medium text-ink" aria-live="polite">
        {value}
      </span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Ko‘paytirish" className="icon-btn !size-[38px] disabled:opacity-40">
        <Add size={16} />
      </button>
    </div>
  );
}

/* ── Status belgilari (spec §4.1 holat ranglari) ── */

export type Tone = "success" | "pending" | "muted" | "danger" | "maroon";
const toneStyle: Record<Tone, React.CSSProperties> = {
  success: { color: "var(--color-success)", background: "var(--success-bg)" },
  pending: { color: "var(--color-pending)", background: "var(--pending-bg)" },
  muted: { color: "var(--color-muted)", background: "var(--muted-bg)" },
  danger: { color: "var(--color-danger)", background: "var(--danger-bg)" },
  maroon: { color: "var(--color-ink-inverse)", background: "var(--color-maroon)" },
};
export function StatusBadge({ tone, children, dot = false }: { tone: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] leading-[1.3]" style={toneStyle[tone]}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ── Toast ── */

type ToastItem = { id: number; text: string; tone: "success" | "error" };
const ToastCtx = createContext<(text: string, tone?: ToastItem["tone"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const push = useCallback((text: string, tone: ToastItem["tone"] = "success") => {
    const id = ++seq.current;
    setItems((l) => [...l, { id, text, tone }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 2500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex flex-col items-center gap-2 px-5 lg:bottom-10">
        {items.map((t) => (
          <div key={t.id} className="flex items-center gap-2.5 rounded-2xl border border-line bg-bg-base px-4 py-3 t-body-m text-ink shadow-menu animate-[fade-in_.2s]">
            {t.tone === "success" ? <TickCircle size={18} color="var(--color-success)" /> : <CloseCircle size={18} color="var(--color-danger)" />}
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ── Modal / bottom sheet ── */

export function Modal({
  open,
  onClose,
  label,
  children,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>("a[href],button:not([disabled]),input,select,textarea");
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) {
          e.preventDefault();
          f[f.length - 1].focus();
        } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
          e.preventDefault();
          f[0].focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 animate-[fade-in_.2s] sm:items-center sm:p-6" onClick={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-[24px] bg-bg-base outline-none animate-[sheet-up_.28s_ease-out] sm:max-w-[500px] sm:rounded-[24px] sm:animate-none ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

/* ── API yordamchisi ── */

export async function api<T = Record<string, unknown>>(url: string, init?: RequestInit & { json?: unknown }) {
  const res = await fetch(url, {
    ...init,
    headers: init?.json !== undefined ? { "Content-Type": "application/json", ...(init?.headers ?? {}) } : init?.headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const data = (await res.json().catch(() => ({}))) as T & { ok?: boolean; error?: string };
  if (!res.ok || data.ok === false) throw new Error(tr(currentLocale(), data.error || "Xatolik yuz berdi. Qayta urinib ko‘ring."));
  return data;
}

/** Nusxalash + toast */
export function useCopy() {
  const toast = useToast();
  return async (text: string, msg = "Havola nusxalandi") => {
    try {
      await navigator.clipboard.writeText(text);
      toast(msg);
    } catch {
      toast("Nusxalab bo‘lmadi", "error");
    }
  };
}
