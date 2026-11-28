"use client";

/**
 * Vizitka formasi bloklari: til tablari (UZ | RU | EN), ko‘p tilli maydon, ro‘yxat muharriri, rasm o‘rinlari.
 * Ko‘p tilli maydonda faqat tanlangan tilning qiymati tahrirlanadi; RU/EN bo‘sh bo‘lsa — kartada o‘zbekchasi chiqadi.
 */
import { useRef, useState, type ReactNode } from "react";
import { Add, ArrowDown2, Gallery, Trash } from "@/components/icons";
import { PhoneInput, Toggle, formatPhone9, phoneToLocal } from "@/components/ui";
import { SelectField } from "@/components/order/pickers";
import { flowInput } from "@/components/order/fields";
import { useT } from "@/lib/i18n";
import { CARD_LANGS, type CardLang, type Localized } from "@/lib/cardTypes";
import type { CardFieldSpec } from "@/lib/cards";

export const LANG_NAME: Record<CardLang, string> = { uz: "O‘zbekcha", ru: "Ruscha", en: "Inglizcha" };
const LANG_SHORT: Record<CardLang, string> = { uz: "UZ", ru: "RU", en: "EN" };

/** Til tablari: qaysi tilda matn kiritilayotgani; nuqta — shu tilda biror matn bor */
export function LangTabs({ lang, onLang, filled }: { lang: CardLang; onLang: (l: CardLang) => void; filled: Record<CardLang, number> }) {
  const t = useT();
  return (
    <div className="flex flex-col gap-2">
      <div role="tablist" aria-label={t("Matn tili")} className="inline-flex w-full rounded-full border border-line bg-bg-soft p-1 sm:w-fit">
        {CARD_LANGS.map((l) => (
          <button
            key={l}
            type="button"
            role="tab"
            aria-selected={lang === l}
            onClick={() => onLang(l)}
            className={`relative flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-4 t-nav transition-colors sm:flex-none sm:px-5 ${lang === l ? "bg-bg-base text-ink shadow-soft" : "text-ink-2 hover:text-ink"}`}
          >
            <span className="font-semibold">{LANG_SHORT[l]}</span>
            <span className="hidden sm:inline">· {t(LANG_NAME[l])}</span>
            {l !== "uz" && filled[l] > 0 && <span className="size-1.5 rounded-full bg-success" aria-label={t("to‘ldirilgan")} />}
          </button>
        ))}
      </div>
      <p className="t-body-s text-ink-2">
        {lang === "uz"
          ? t("Asosiy til — o‘zbekcha (majburiy). Ruscha va inglizcha matnlar ixtiyoriy: bo‘sh qolsa, vizitkada o‘zbekchasi ko‘rsatiladi.")
          : t("{lang} matnlar ixtiyoriy — bo‘sh maydon o‘rnida o‘zbekchasi ko‘rsatiladi. Ism, telefon va havolalar barcha tillarda bir xil.", { lang: t(LANG_NAME[lang]) })}
      </p>
    </div>
  );
}

/** Sarlavha + maydon + xato/izoh */
export function CField({ id, label, required, hint, error, children, langBadge }: { id: string; label: string; required?: boolean; hint?: string; error?: string | null; children: ReactNode; langBadge?: CardLang }) {
  const t = useT();
  return (
    <div id={id} className="flex min-w-0 scroll-mt-32 flex-col gap-2">
      <label htmlFor={`${id}-i`} className="flex items-center gap-2 text-[13px] font-semibold leading-[1.35] text-ink">
        <span>
          {t(label)}
          {required && <span className="text-maroon"> *</span>}
        </span>
        {langBadge && <span className="rounded-full bg-bg-soft px-2 py-0.5 text-[11px] font-semibold tracking-[0.04em] text-ink-2">{LANG_SHORT[langBadge]}</span>}
      </label>
      {children}
      {error ? (
        <span role="alert" className="t-body-s text-danger">
          {t(error)}
        </span>
      ) : hint ? (
        <span className="t-body-s text-ink-2">{t(hint)}</span>
      ) : null}
    </div>
  );
}

const LINK_ICON_LABEL: Record<string, string> = { arrow: "Havola", calendar: "Kalendar", book: "Kitob", globe: "Sayt", download: "Yuklab olish", pin: "Manzil" };
const SOCIAL_LABEL: Record<string, string> = { instagram: "Instagram", telegram: "Telegram", linkedin: "LinkedIn", facebook: "Facebook", youtube: "YouTube", tiktok: "TikTok", x: "X (Twitter)", whatsapp: "WhatsApp", website: "Veb-sayt" };

/** Bitta qiymat (spec turi bo‘yicha). Ko‘p tilli bo‘lsa — joriy til qiymati, placeholder sifatida o‘zbekchasi. */
export function SpecInput({ id, spec, value, onChange, lang, invalid }: { id: string; spec: CardFieldSpec; value: unknown; onChange: (v: unknown) => void; lang: CardLang; invalid?: boolean }) {
  const t = useT();
  if (spec.localized) {
    const v = (value as Localized | undefined) ?? { uz: "" };
    const cur = v[lang] ?? "";
    const ph = lang !== "uz" && v.uz ? v.uz : spec.placeholder ? t(spec.placeholder) : undefined;
    const set = (s: string) => onChange({ ...v, [lang]: s });
    const common = { id: `${id}-i`, value: cur, placeholder: ph, maxLength: spec.max ?? 160, "aria-invalid": invalid || undefined, onChange: (e: { target: { value: string } }) => set(e.target.value), lang };
    if (spec.type === "textarea") return <textarea {...common} rows={3} className={`${flowInput} !h-auto resize-y py-3`} />;
    return <input {...common} type="text" className={flowInput} />;
  }
  const s = typeof value === "string" ? value : "";
  if (spec.type === "select") {
    const labels = spec.options?.every((o) => o in SOCIAL_LABEL) ? SOCIAL_LABEL : LINK_ICON_LABEL;
    return <SelectField id={`${id}-i`} label={t(spec.label)} value={s} onChange={(x) => onChange(x)} invalid={invalid} options={(spec.options ?? []).map((o) => ({ value: o, label: t(labels[o] ?? o) }))} />;
  }
  if (spec.type === "tel")
    return <PhoneInput id={`${id}-i`} value={phoneToLocal(s)} invalid={invalid} onChange={(x) => onChange(x ? `+998${formatPhone9(x).replace(/\D/g, "")}` : "")} />;
  if (spec.type === "textarea")
    return <textarea id={`${id}-i`} value={s} maxLength={spec.max ?? 1000} rows={3} placeholder={spec.placeholder ? t(spec.placeholder) : undefined} aria-invalid={invalid || undefined} onChange={(e) => onChange(e.target.value)} className={`${flowInput} !h-auto resize-y py-3`} />;
  const type = spec.type === "email" ? "email" : spec.type === "url" ? "url" : "text";
  return (
    <input
      id={`${id}-i`}
      type={type}
      inputMode={spec.type === "email" ? "email" : spec.type === "url" ? "url" : undefined}
      autoCapitalize={spec.type === "email" || spec.type === "url" ? "off" : undefined}
      value={s}
      maxLength={spec.max ?? 160}
      placeholder={spec.placeholder ? t(spec.placeholder) : spec.type === "url" ? "https://" : undefined}
      aria-invalid={invalid || undefined}
      onChange={(e) => onChange(e.target.value)}
      className={flowInput}
    />
  );
}

type Row = Record<string, unknown>;

/** Ro‘yxat (yo‘nalishlar, raqamlar, kompaniyalar, tarmoqlar, havolalar): qo‘shish, o‘chirish, tartibni almashtirish */
export function ListEditor({
  id,
  label,
  hint,
  item,
  rows,
  max,
  lang,
  onChange,
  errors,
}: {
  id: string;
  label: string;
  hint?: string;
  item: Record<string, CardFieldSpec>;
  rows: Row[];
  max: number;
  lang: CardLang;
  onChange: (rows: Row[]) => void;
  errors: Set<string>;
}) {
  const t = useT();
  const blank = (): Row => Object.fromEntries(Object.entries(item).map(([k, s]) => [k, s.localized ? { uz: "", ru: "", en: "" } : s.type === "select" ? (s.options?.[0] ?? "") : ""]));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const next = rows.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const cols = Object.entries(item);
  return (
    <div id={id} className="flex scroll-mt-32 flex-col gap-3">
      {rows.map((r, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-[16px] border border-line bg-bg-base p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="t-annotation text-ink-2">
              {t(label)} · {i + 1}
            </span>
            <span className="flex items-center gap-1">
              <button type="button" className="icon-btn !size-9" aria-label={t("Yuqoriga")} disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowDown2 size={15} className="rotate-180" />
              </button>
              <button type="button" className="icon-btn !size-9" aria-label={t("Pastga")} disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown2 size={15} />
              </button>
              <button type="button" className="icon-btn !size-9" aria-label={t("O‘chirish")} onClick={() => onChange(rows.filter((_, j) => j !== i))}>
                <Trash size={15} />
              </button>
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {cols.map(([k, s]) => {
              const fid = `${id}-${i}-${k}`;
              const err = errors.has(`${id.replace(/^f-/, "")}.${i}.${k}`);
              return (
                <div key={k} className={s.type === "textarea" || (s.localized && s.type !== "text") || cols.length === 1 ? "sm:col-span-2" : ""}>
                  <CField id={fid} label={s.label} required={s.required && (!s.localized || lang === "uz")} hint={s.hint} error={err ? "To‘ldiring" : null} langBadge={s.localized ? lang : undefined}>
                    <SpecInput id={fid} spec={s} value={r[k]} lang={lang} invalid={err} onChange={(v) => onChange(rows.map((x, j) => (j === i ? { ...x, [k]: v } : x)))} />
                  </CField>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {rows.length < max ? (
        <button type="button" onClick={() => onChange([...rows, blank()])} className="flex w-fit items-center gap-2 rounded-full border border-line px-4 py-2.5 t-nav text-ink hover:bg-bg-soft">
          <Add size={16} /> {t("Qo‘shish")}
        </button>
      ) : null}
      <p className="t-body-s text-ink-2">
        {hint ? `${t(hint)} · ` : ""}
        {t("Ko‘pi bilan {n} ta", { n: max })}
      </p>
    </div>
  );
}

/** Rasm o‘rinlari: yuklash, almashtirish, o‘chirish (POST/DELETE /api/cards/:id/photos) */
export function PhotoSlots({ labels, photos, onUpload, onRemove }: { labels: string[]; photos: string[]; onUpload: (file: File, slot: number) => Promise<void>; onRemove: (url: string) => Promise<void> }) {
  const t = useT();
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const target = useRef(0);
  const pick = (slot: number) => {
    target.current = slot;
    input.current?.click();
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setErr(null);
    setBusy(target.current);
    try {
      await onUpload(f, target.current);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <div className={`grid gap-3 ${labels.length > 2 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
        {labels.map((label, i) => {
          // bo‘sh o‘rinlar faqat ketma-ket to‘ldiriladi (serverda rasmlar ro‘yxat tartibida)
          const url = photos[i];
          const enabled = !!url || i <= photos.length;
          return (
            <div key={i} className="flex min-w-0 flex-col gap-1.5">
              <button
                type="button"
                disabled={!enabled || busy !== null}
                onClick={() => pick(Math.min(i, photos.length))}
                className={`group relative aspect-[4/5] w-full overflow-hidden rounded-[14px] border ${url ? "border-line" : "border-dashed border-ink-2/40 bg-bg-soft"} disabled:opacity-50`}
                aria-label={url ? t("Rasmni almashtirish") : t("Rasm yuklash")}
              >
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="" className="absolute inset-0 size-full object-cover" />
                ) : (
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-2 text-center text-ink-2">
                    <Gallery size={22} />
                    <span className="t-body-s">{t("Rasm yuklash")}</span>
                  </span>
                )}
                {url && <span className="absolute inset-x-0 bottom-0 bg-black/45 py-1.5 text-center text-[12px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">{t("Almashtirish")}</span>}
                {busy === i && (
                  <span className="absolute inset-0 flex items-center justify-center bg-white/70">
                    <span className="size-6 animate-spin rounded-full border-2 border-maroon border-t-transparent" />
                  </span>
                )}
              </button>
              <div className="flex items-center justify-between gap-1">
                <span className="min-w-0 truncate t-body-s text-ink-2" title={t(label)}>
                  {t(label)}
                </span>
                {url && (
                  <button type="button" onClick={() => onRemove(url)} className="shrink-0 text-ink-2 hover:text-danger" aria-label={t("O‘chirish")}>
                    <Trash size={15} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {err && (
        <p role="alert" className="t-body-s text-danger">
          {t(err)}
        </p>
      )}
      <p className="t-body-s text-ink-2">{t("JPG, PNG, WEBP yoki HEIC, 8 MB gacha. Portret — yuzingiz aniq ko‘rinadigan, vertikal surat.")}</p>
    </div>
  );
}

export function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const t = useT();
  return (
    <div className="flex items-start justify-between gap-4 rounded-[16px] border border-line bg-bg-base p-4">
      <div className="flex flex-col gap-1">
        <span className="text-[14px] font-semibold text-ink">{t(label)}</span>
        {hint && <span className="t-body-s text-ink-2">{t(hint)}</span>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={t(label)} />
    </div>
  );
}
