"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Calendar, CloseCircle, Location, Clock, Edit2 } from "@/components/icons";
import { Modal, Stepper } from "@/components/ui";
import { splitDate, tashkentDate } from "@/lib/display";
import { star8Path } from "@/lib/ornament";
import type { InvitationData } from "./types";
import { mapHref } from "./Sections";
import { monogram, namesOf, s, type Palette } from "./theme";
import st from "./invitation.module.css";

export type RsvpStatus = "coming" | "maybe" | "not_coming";
export type RsvpAnswer = { name: string; status: RsvpStatus; count: number; wish: string };

const storageKey = (slug: string) => `shohnoma:rsvp:${slug}`;
export function loadSavedRsvp(slug: string): { token: string; name: string } | null {
  try {
    const v = JSON.parse(localStorage.getItem(storageKey(slug)) || "null");
    return v?.token ? v : null;
  } catch {
    return null;
  }
}
const saveRsvp = (slug: string, token: string, name: string) => {
  try {
    localStorage.setItem(storageKey(slug), JSON.stringify({ token, name }));
  } catch {}
};

/** Embedded (telefon mokapi ichida) — konteyner ichida absolut qatlam; aks holda umumiy Modal */
export function Layer({ embedded, open, onClose, label, children, dark = false }: { embedded?: boolean; open: boolean; onClose: () => void; label: string; children: ReactNode; dark?: boolean }) {
  if (!open) return null;
  if (!embedded) {
    return (
      <Modal open onClose={onClose} label={label} className={dark ? "!bg-transparent" : ""}>
        {children}
      </Modal>
    );
  }
  return (
    <div className={`${st.fade} absolute inset-0 z-50 flex items-end bg-black/45`} onClick={onClose}>
      <div role="dialog" aria-label={label} onClick={(e) => e.stopPropagation()} className={`${st.sheet} max-h-full w-full overflow-y-auto rounded-t-[20px] ${dark ? "" : "bg-bg-base"}`}>
        {children}
      </div>
    </div>
  );
}

const statusOptions: { value: RsvpStatus; label: string }[] = [
  { value: "coming", label: "Boraman" },
  { value: "maybe", label: "Hali aniq emas" },
  { value: "not_coming", label: "Kela olmayman" },
];

/** 15 — Javob qoldirish formasi */
export function RsvpForm({
  d,
  p,
  initial,
  mode,
  editToken,
  onDone,
  onClose,
}: {
  d: InvitationData;
  p: Palette;
  initial: Partial<RsvpAnswer>;
  mode: "live" | "preview" | "demo";
  editToken?: string | null;
  onDone: (a: RsvpAnswer) => void;
  onClose: () => void;
}) {
  const [a, setA] = useState<RsvpAnswer>({ name: "", status: "coming", count: 1, wish: "", ...initial });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sd = splitDate(d.date);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!a.name.trim()) return setErr("Ismingizni kiriting");
    setErr(null);
    if (mode !== "live") return onDone(a); // preview/demo: hech narsa yuborilmaydi
    setBusy(true);
    try {
      const body = JSON.stringify({ name: a.name.trim(), status: a.status, count: a.count, wish: a.wish.trim() || null });
      const res = await fetch(editToken ? `/api/i/${d.slug}/rsvp/${editToken}` : `/api/i/${d.slug}/rsvp`, {
        method: editToken ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; editToken?: string };
      if (!res.ok || !j.ok) throw new Error(j.error || "Javob yuborilmadi. Qayta urinib ko‘ring.");
      saveRsvp(d.slug, editToken ?? j.editToken!, a.name.trim());
      onDone(a);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const who = d.ceremony === "nikoh" || d.ceremony === "fotiha" ? "kelin-kuyov" : "taklif qiluvchi";

  return (
    <form onSubmit={submit} className="relative flex flex-col gap-5 px-6 pb-7 pt-6 text-left" style={{ background: "#fffdf9" }} noValidate>
      <button type="button" onClick={onClose} aria-label="Yopish" className="absolute right-4 top-4 text-ink-2 hover:text-ink">
        <CloseCircle size={24} />
      </button>
      <div className="flex flex-col items-center gap-1 pr-2 text-center">
        <span style={{ fontFamily: p.script, fontSize: p.script.includes("cinzel") ? 22 : 34, color: p.heading, lineHeight: 1.15 }}>{namesOf(d.personA, d.personB)}</span>
        <span className="font-cormorant text-[20px] text-ink">Javobingizni qoldiring</span>
        <span className="t-body-s text-ink-2">{[sd?.day, d.venueName].filter(Boolean).join(" · ")}</span>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-full bg-bg-soft p-1" role="radiogroup" aria-label="Javob">
        {statusOptions.map((o) => {
          const on = a.status === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setA({ ...a, status: o.value })}
              className="h-10 rounded-full px-1 text-[12px] font-medium transition-colors"
              style={on ? { background: p.heading, color: "#fff" } : { color: "var(--color-ink-2)" }}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      <label className="flex flex-col gap-[7px]">
        <span className="t-body-s text-ink-2">
          Ismingiz <span style={{ color: p.heading }}>*</span>
        </span>
        <input
          value={a.name}
          onChange={(e) => setA({ ...a, name: e.target.value })}
          autoComplete="name"
          placeholder="Masalan, Dilnoza"
          aria-invalid={!!err && !a.name.trim()}
          className="h-12 w-full rounded-input border border-line bg-white px-4 t-body-m text-ink outline-none focus:border-maroon/55 aria-[invalid=true]:border-danger"
        />
      </label>

      {a.status !== "not_coming" && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="t-title text-ink">Necha kishi bo‘lasiz?</span>
            <span className="t-body-s text-ink-2">O‘zingiz bilan birga</span>
          </div>
          <Stepper value={a.count} onChange={(count) => setA({ ...a, count })} min={1} max={10} />
        </div>
      )}

      <label className="flex flex-col gap-[7px]">
        <span className="t-body-s text-ink-2">Tilagingiz (ixtiyoriy)</span>
        <textarea
          value={a.wish}
          onChange={(e) => setA({ ...a, wish: e.target.value })}
          rows={3}
          maxLength={1000}
          placeholder="Baxtli bo‘linglar!"
          className="w-full resize-none rounded-input border border-line bg-white px-4 py-3 t-body-m text-ink outline-none focus:border-maroon/55"
        />
      </label>

      {err && <p className="t-body-s text-danger">{err}</p>}

      <button type="submit" disabled={busy} className="btn w-full text-white" style={{ background: p.heading }}>
        {busy ? "Yuborilmoqda…" : editToken ? "Javobni yangilash" : "Javobni yuborish"}
      </button>
      <p className="text-center t-body-s text-ink-2">Javobingizni faqat {who} ko‘radi</p>
    </form>
  );
}

/* ── 16 — Rahmat ekrani ── */

const dative = (n: string) => `${n}${/k$/i.test(n) ? "ka" : /q$/i.test(n) ? "qa" : "ga"}`;

function gcalUrl(d: InvitationData) {
  const start = tashkentDate(d.date);
  const end = new Date(start.getTime() + 4 * 3600_000);
  const f = (x: Date) => x.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `${namesOf(d.personA, d.personB)} — taklifnoma`,
    dates: `${f(start)}/${f(end)}`,
    location: [d.venueName, d.address].filter(Boolean).join(", "),
    details: typeof window !== "undefined" ? window.location.href : "",
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export function ThankYou({
  d,
  p,
  answer,
  live,
  onBack,
  onEdit,
}: {
  d: InvitationData;
  p: Palette;
  answer: RsvpAnswer;
  live: boolean;
  onBack: () => void;
  onEdit: () => void;
}) {
  const [cal, setCal] = useState(false);
  const sd = splitDate(d.date);
  const hosts = d.personB ? `${d.personA} va ${dative(d.personB)}` : dative(d.personA);
  const line =
    answer.status === "coming"
      ? `Javobingiz ${hosts} yetkazildi. Sizni ${answer.count} kishi bo‘lib kutamiz.`
      : answer.status === "maybe"
        ? `Javobingiz ${hosts} yetkazildi. Imkon topsangiz, sizni kutib qolamiz.`
        : `Javobingiz ${hosts} yetkazildi. Tilagingiz uchun rahmat!`;
  const btn = "flex h-12 w-full items-center justify-center gap-2 rounded-full text-[13px] font-semibold";

  return (
    <div className="flex min-h-full flex-col items-center px-6 pb-8 pt-10 text-center" style={{ background: `linear-gradient(to bottom, ${p.deep2}, ${p.deep})`, color: p.onDeep }}>
      <div
        className="flex items-center justify-center rounded-full"
        style={{ width: 64, height: 64, background: "radial-gradient(circle at 35% 30%, #f0d48f, #c9a25e 55%, #9a7444)", boxShadow: "0 3px 8px rgba(0,0,0,.3)", fontFamily: "var(--font-cinzel)", color: "#6e4a1a", fontSize: 16 }}
      >
        {monogram(d.personA, d.personB)}
      </div>
      <h2 style={{ fontFamily: p.script, fontSize: p.script.includes("cinzel") ? 28 : 46, color: p.accentDeep, marginTop: 18, lineHeight: 1.15 }}>Rahmat, {answer.name}!</h2>
      <p className="max-w-[300px] font-cormorant text-[17px] leading-[1.4]" style={{ opacity: 0.9, marginTop: 10 }}>
        {line}
      </p>

      <div className="mt-7 flex w-full max-w-[340px] flex-col gap-3 rounded-[18px] p-5 text-left" style={{ background: "rgba(255,255,255,.07)", border: `1px solid color-mix(in srgb, ${p.accentDeep} 45%, transparent)` }}>
        <span className="flex items-center gap-3 text-[14px]">
          <Calendar size={18} color={p.accentDeep} /> {sd?.long}
        </span>
        <span className="flex items-center gap-3 text-[14px]">
          <Clock size={18} color={p.accentDeep} /> {sd?.time}
        </span>
        <span className="flex items-start gap-3 text-[14px]">
          <Location size={18} color={p.accentDeep} />
          <span>
            {d.venueName}
            {d.address && <span className="block text-[12px] opacity-70">{d.address}</span>}
          </span>
        </span>
      </div>

      <div className="mt-6 flex w-full max-w-[340px] flex-col gap-2.5">
        <div className="relative">
          <button type="button" onClick={() => setCal((v) => !v)} className={btn} style={{ background: p.accentDeep, color: p.deep }} aria-expanded={cal}>
            <Calendar size={16} /> Taqvimga qo‘shish
          </button>
          {cal && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <a href={live ? `/api/i/${d.slug}/calendar` : undefined} className="rounded-full py-2.5 text-[12px] font-medium" style={{ border: `1px solid ${p.onDeep}` }}>
                iPhone / Outlook
              </a>
              <a href={live ? gcalUrl(d) : undefined} target="_blank" rel="noopener noreferrer" className="rounded-full py-2.5 text-[12px] font-medium" style={{ border: `1px solid ${p.onDeep}` }}>
                Google Calendar
              </a>
            </div>
          )}
        </div>
        <a href={live ? mapHref(d) : undefined} target="_blank" rel="noopener noreferrer" className={btn} style={{ border: `1px solid ${p.onDeep}` }}>
          <Location size={16} /> Xaritada ochish
        </a>
        <button type="button" onClick={onBack} className={btn} style={{ border: `1px solid color-mix(in srgb, ${p.onDeep} 40%, transparent)` }}>
          Taklifnomaga qaytish
        </button>
        <button type="button" onClick={onEdit} className="mt-1 inline-flex items-center justify-center gap-1.5 text-[13px] underline-offset-4 hover:underline" style={{ opacity: 0.8 }}>
          <Edit2 size={14} /> Javobni o‘zgartirish
        </button>
      </div>
      <svg viewBox="0 0 40 40" className="mt-8 size-3" aria-hidden>
        <path d={star8Path(20, 20, 20)} fill={p.accent} />
      </svg>
    </div>
  );
}

/** Saqlangan javobni olish (Javobni o‘zgartirish uchun) */
export function useSavedAnswer(slug: string, enabled: boolean) {
  const [saved, setSaved] = useState<{ token: string; name: string } | null>(null);
  useEffect(() => {
    if (enabled) setSaved(loadSavedRsvp(slug));
  }, [slug, enabled]);
  return [saved, setSaved] as const;
}

export async function fetchSavedAnswer(slug: string, token: string): Promise<RsvpAnswer | null> {
  try {
    const res = await fetch(`/api/i/${slug}/rsvp/${token}`);
    const j = (await res.json()) as { ok?: boolean; response?: { name: string; status: RsvpStatus; count: number; wish: string | null } };
    if (!j.ok || !j.response) return null;
    return { ...j.response, wish: j.response.wish ?? "" };
  } catch {
    return null;
  }
}
