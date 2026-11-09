"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown2, Clock, TickCircle } from "@/components/icons";
import { useT } from "@/lib/i18n";

/** Tashqariga bosilganda / Esc — yopiladi */
function useDismiss<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => ref.current && !ref.current.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

const panel = "absolute left-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-[14px] border border-line bg-bg-base shadow-[0_18px_40px_-18px_rgba(38,20,10,0.35)]";
const shell = (invalid?: boolean, open?: boolean) =>
  `relative flex h-[52px] w-full items-center rounded-[10px] border bg-bg-base transition-colors ${
    invalid ? "border-danger" : open ? "border-maroon/55" : "border-line"
  }`;

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

/** "1730" / "17:3" / "9:5" → "17:30" kabi; noto‘g‘ri bo‘lsa — "" */
function normalizeTime(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 4);
  if (!d) return "";
  const h = d.length <= 2 ? d : d.length === 3 ? d.slice(0, 1) : d.slice(0, 2);
  const m = d.length <= 2 ? "00" : d.slice(h.length).padEnd(2, "0");
  const hh = Number(h);
  const mm = Number(m);
  if (hh > 23 || mm > 59) return "";
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/**
 * 24 soatlik vaqt maydoni (AM/PM yo‘q): yozib kiritish yoki ochiladigan ro‘yxatdan soat va daqiqani tanlash.
 * Qiymat formati — "HH:MM".
 */
export function TimeField({
  value,
  onChange,
  id,
  invalid,
  label = "Vaqt",
  compact = false,
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  invalid?: boolean;
  label?: string;
  compact?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  const [h, m] = value ? value.split(":") : ["", ""];
  const hourCol = useRef<HTMLDivElement>(null);
  const minCol = useRef<HTMLDivElement>(null);

  // Ochilganda tanlangan qiymat ko‘rinadigan joyga suriladi
  useEffect(() => {
    if (!open) return;
    for (const col of [hourCol.current, minCol.current]) col?.querySelector<HTMLElement>("[aria-selected=true]")?.scrollIntoView({ block: "center" });
  }, [open]);

  const commit = (raw: string) => {
    const v = normalizeTime(raw);
    if (v) onChange(v);
    setText(v || value);
  };
  const pick = (nh: string, nm: string) => {
    const v = `${nh}:${nm}`;
    setText(v);
    onChange(v);
  };

  return (
    <div
      ref={ref}
      className={`relative ${compact ? "w-[112px] shrink-0" : "w-full"}`}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setOpen(false)}
    >
      <div className={shell(invalid, open)}>
        <input
          id={id}
          value={text}
          inputMode="numeric"
          autoComplete="off"
          placeholder="--:--"
          aria-label={t(label)}
          aria-invalid={invalid || undefined}
          maxLength={5}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            let t = e.target.value.replace(/[^\d:]/g, "");
            if (/^\d{3,4}$/.test(t)) t = `${t.slice(0, 2)}:${t.slice(2)}`;
            setText(t);
            if (/^\d{2}:\d{2}$/.test(t) && normalizeTime(t)) onChange(normalizeTime(t));
          }}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commit(text);
              setOpen(false);
            }
          }}
          className={`h-full min-w-0 flex-1 bg-transparent t-body-m tabular-nums text-ink outline-none placeholder:text-ink-2/80 ${compact ? "pl-3" : "px-3.5"}`}
        />
        <button type="button" tabIndex={-1} aria-label={t("Vaqtni tanlash")} onClick={() => setOpen((x) => !x)} className={`flex h-full shrink-0 items-center text-ink-2 ${compact ? "pr-2.5" : "pr-3.5"}`}>
          <Clock size={18} />
        </button>
      </div>
      {open && (
        <div className={`${panel} flex w-[176px] p-1.5`} role="dialog" aria-label={t("Vaqtni tanlash")}>
          {[
            { ref: hourCol, items: HOURS, cur: h, on: (x: string) => pick(x, m || "00"), title: "Soat" },
            { ref: minCol, items: MINUTES.includes(m) || !m ? MINUTES : [...MINUTES, m].sort(), cur: m, on: (x: string) => pick(h || "18", x), title: "Daqiqa" },
          ].map((c) => (
            <div key={c.title} className="flex flex-1 flex-col">
              <span className="px-2 pb-1 pt-1 text-center text-[11px] font-medium uppercase tracking-[0.06em] text-ink-2">{t(c.title)}</span>
              <div ref={c.ref} role="listbox" aria-label={t(c.title)} className="no-scrollbar flex h-[216px] flex-col gap-0.5 overflow-y-auto overscroll-contain">
                {c.items.map((x) => (
                  <button
                    key={x}
                    type="button"
                    role="option"
                    aria-selected={x === c.cur}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => c.on(x)}
                    className={`mx-1 shrink-0 rounded-[8px] py-2 text-center text-[15px] tabular-nums transition-colors ${
                      x === c.cur ? "bg-maroon font-semibold text-ink-inverse" : "text-ink hover:bg-bg-soft"
                    }`}
                  >
                    {x}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Maxsus ochiladigan ro‘yxat (brauzerning standart <select> o‘rniga) */
export function SelectField<T extends string>({
  value,
  onChange,
  options,
  id,
  invalid,
  label,
  placeholder = "Tanlang",
  icon,
}: {
  value: T | "";
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  id?: string;
  invalid?: boolean;
  label?: string;
  placeholder?: string;
  icon?: ReactNode;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  const current = options.find((o) => o.value === value);
  const choose = (v: T) => {
    onChange(v);
    setOpen(false);
  };
  useEffect(() => {
    if (open) setActive(Math.max(0, options.findIndex((o) => o.value === value)));
  }, [open, options, value]);

  return (
    <div ref={ref} className="relative w-full" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setOpen(false)}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        aria-invalid={invalid || undefined}
        onClick={() => setOpen((x) => !x)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!open) return setOpen(true);
            setActive((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
          } else if ((e.key === "Enter" || e.key === " ") && open && active >= 0) {
            e.preventDefault();
            choose(options[active].value);
          }
        }}
        className={`${shell(invalid, open)} gap-2.5 px-3.5 text-left`}
      >
        {icon && <span className="shrink-0 text-ink-2">{icon}</span>}
        <span className={`min-w-0 flex-1 truncate t-body-m ${current ? "text-ink" : "text-ink-2/80"}`}>{current?.label ?? t(placeholder)}</span>
        <ArrowDown2 size={18} className={`shrink-0 text-ink-2 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul role="listbox" aria-label={label} onMouseDown={(e) => e.preventDefault()} className={`${panel} no-scrollbar max-h-[280px] w-full overflow-y-auto p-1.5`}>
          {options.map((o, i) => {
            const sel = o.value === value;
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={sel}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(o.value)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-[8px] px-3 py-2.5 t-body-m transition-colors ${
                  i === active ? "bg-bg-soft" : ""
                } ${sel ? "font-semibold text-maroon" : "text-ink"}`}
              >
                {o.label}
                {sel && <TickCircle size={16} className="shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
