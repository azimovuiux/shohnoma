"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown2, ArrowLeft2, ArrowRight2, Calendar, Clock, TickCircle } from "@/components/icons";
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

/* ── Sana: kk/oo/yyyy (brauzer tilidan qat’i nazar) + ochiladigan kalendar ── */
const MONTHS_UZ = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
const MONTHS_RU = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const WD_UZ = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
const WD_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WD_EN = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const pad2 = (n: number) => String(n).padStart(2, "0");
const isoToDmy = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");
function dmyToIso(s: string): string {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return "";
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return "";
  return `${y}-${pad2(mo)}-${pad2(d)}`;
}

export function DateField({
  value,
  onChange,
  id,
  invalid,
  min,
  label = "Sana",
  locale = "uz",
}: {
  value: string;
  onChange: (iso: string) => void;
  id?: string;
  invalid?: boolean;
  min?: string;
  label?: string;
  locale?: "uz" | "ru" | "en";
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(isoToDmy(value));
  useEffect(() => setText(isoToDmy(value)), [value]);
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  const base = value || min || new Date().toISOString().slice(0, 10);
  const [view, setView] = useState({ y: Number(base.slice(0, 4)), m: Number(base.slice(5, 7)) - 1 });
  useEffect(() => {
    if (open) setView({ y: Number(base.slice(0, 4)), m: Number(base.slice(5, 7)) - 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const months = locale === "ru" ? MONTHS_RU : locale === "en" ? MONTHS_EN : MONTHS_UZ;
  const wd = locale === "ru" ? WD_RU : locale === "en" ? WD_EN : WD_UZ;
  const first = new Date(Date.UTC(view.y, view.m, 1));
  const lead = (first.getUTCDay() + 6) % 7; // dushanbadan
  const days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const today = new Date().toISOString().slice(0, 10);
  const shift = (d: number) => setView((v) => ({ y: v.y + Math.floor((v.m + d) / 12), m: (((v.m + d) % 12) + 12) % 12 }));

  return (
    <div ref={ref} className="relative w-full" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setOpen(false)}>
      <div className={shell(invalid, open)}>
        <input
          id={id}
          value={text}
          inputMode="numeric"
          autoComplete="off"
          placeholder={locale === "ru" ? "дд/мм/гггг" : locale === "en" ? "dd/mm/yyyy" : "kk/oo/yyyy"}
          aria-label={label}
          aria-invalid={invalid || undefined}
          maxLength={10}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "").slice(0, 8);
            const t = [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join("/");
            setText(t);
            const iso = dmyToIso(t);
            if (iso && (!min || iso >= min)) onChange(iso);
          }}
          onBlur={() => setText(isoToDmy(value))}
          className="h-full min-w-0 flex-1 bg-transparent px-3.5 t-body-m tabular-nums text-ink outline-none placeholder:text-ink-2/80"
        />
        <button type="button" tabIndex={-1} aria-label={label} onClick={() => setOpen((x) => !x)} className="flex h-full shrink-0 items-center pr-3.5 text-ink-2">
          <Calendar size={18} />
        </button>
      </div>
      {open && (
        <div className={`${panel} w-[296px] p-3`} role="dialog" aria-label={label} onMouseDown={(e) => e.preventDefault()}>
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => shift(-1)} className="flex size-8 items-center justify-center rounded-full text-ink hover:bg-bg-soft" aria-label="‹">
              <ArrowLeft2 size={16} />
            </button>
            <span className="t-title text-ink">
              {months[view.m]} {view.y}
            </span>
            <button type="button" onClick={() => shift(1)} className="flex size-8 items-center justify-center rounded-full text-ink hover:bg-bg-soft" aria-label="›">
              <ArrowRight2 size={16} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {wd.map((w) => (
              <span key={w} className="py-1 text-[11px] font-medium uppercase text-ink-2">
                {w}
              </span>
            ))}
            {cells.map((d, i) => {
              if (d === null) return <span key={`e${i}`} />;
              const iso = `${view.y}-${pad2(view.m + 1)}-${pad2(d)}`;
              const off = !!min && iso < min;
              const sel = iso === value;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={off}
                  onClick={() => {
                    onChange(iso);
                    setText(isoToDmy(iso));
                    setOpen(false);
                  }}
                  className={`h-9 rounded-[8px] text-[14px] tabular-nums transition-colors disabled:opacity-30 ${
                    sel ? "bg-maroon font-semibold text-ink-inverse" : iso === today ? "font-semibold text-maroon hover:bg-bg-soft" : "text-ink hover:bg-bg-soft"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
