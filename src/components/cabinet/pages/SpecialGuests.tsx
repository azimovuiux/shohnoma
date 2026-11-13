"use client";

/**
 * «Maxsus mehmonlar» tabi (Mehmonlar javobi sahifasida, ?tab=maxsus).
 * Har mehmonga shaxsiy havola /<slug>/?g=<token>: taklifnoma «Hurmatli {ism}» deb ochiladi (shablon o‘zgarmaydi),
 * ega har mehmon bo‘yicha ochgan-ochmaganini (qachon, necha marta), javobini va tilagini ko‘radi.
 * Qo‘shish/tahrirlash — faqat faol (to‘langan) taklifnomada; arxivda faqat ko‘rish.
 */
import Link from "@/components/LocalLink";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Add, ArrowDown, ArrowLeft2, ArrowRight2, Copy, Edit2, ExportSquare, Eye, More, People, TickCircle, Trash, UserTick } from "@/components/icons";
import { Field, Input, Modal, Segment, StatusBadge, Textarea, api, confirmDialog, inputClass, useCopy, useToast, type Tone } from "@/components/ui";
import { ShareInvite } from "@/components/share/ShareInvite";
import { useApi } from "@/lib/client";
import { initials, rsvpView } from "@/lib/display";
import { star8Path } from "@/lib/ornament";
import { useLocale, useT } from "@/lib/i18n";
import { isPaidStatus, type SpecialGuest } from "@/lib/types";
import { GuestSearch } from "../GuestSearch";
import { relTime, useInvitationData, useSiteUrl } from "../data";
import { csvDict, downloadCsvTranslated } from "../csv";

type Resp = { ok: boolean; list: SpecialGuest[]; max: number; editable: boolean };
type Filter = "all" | "unopened" | "opened" | "coming" | "not_coming";
const FILTERS: Filter[] = ["all", "unopened", "opened", "coming", "not_coming"];
const FILTER_LABEL: Record<Filter, string> = { all: "Barchasi", unopened: "Ochmagan", opened: "Ochgan, javobsiz", coming: "Keladi", not_coming: "Kelmaydi" };
const PER = 10;
const NAME_MAX = 40;
/** Bundan uzun murojaat ba’zi shablonlarda (bir qatorga sig‘diriladigan sarlavhalar) mayda chiqadi */
const NAME_SOFT = 34;
const LONG_HINT = "Uzun murojaat ba’zi shablonlarda mayda chiqadi — qisqaroq yozgan ma’qul (masalan, «Karimovlar oilasi»)";

const match = (g: SpecialGuest, f: Filter) =>
  f === "all"
    ? true
    : f === "unopened"
      ? g.openCount === 0 && !g.response
      : f === "opened"
        ? g.openCount > 0 && !g.response
        : g.response?.status === f;

/** Ro‘yxat matnidan ismlar: har qatorga bittasi (vergul/nuqtali vergul bilan ham), takrorlarsiz */
function parseNames(text: string) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[\n;]+/)) {
    const n = raw.replace(/^\s*(\d+[.)]|[-–•*])\s*/, "").replace(/\s+/g, " ").trim();
    if (!n || seen.has(n.toLowerCase())) continue;
    seen.add(n.toLowerCase());
    out.push(n);
  }
  return out;
}

/** Javob holati nishoni: Keladi · 3 kishi / Aniq emas / Kela olmaydi */
function AnswerBadge({ g }: { g: SpecialGuest }) {
  const t = useT();
  const r = g.response;
  if (!r) return <span className="t-body-s text-ink-2">—</span>;
  const label = r.status === "coming" ? `${t("Keladi")} · ${t("{n} kishi", { n: r.count })}` : r.status === "maybe" ? t("Aniq emas") : t("Kela olmaydi");
  return <StatusBadge tone={rsvpView[r.status].tone as Tone}>{label}</StatusBadge>;
}

/** Ochilish holati: «Ochilmagan» yoki «Ochgan · 2 marta» (vaqt bilan) */
function OpenState({ g, compact = false }: { g: SpecialGuest; compact?: boolean }) {
  const t = useT();
  const locale = useLocale();
  if (!g.openCount)
    return (
      <span className="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border border-line px-2.5 py-[3px] text-[12px] leading-[1.3] text-ink-2">
        {t("Ochilmagan")}
      </span>
    );
  return (
    <span className={`flex min-w-0 ${compact ? "items-center gap-1.5" : "flex-col gap-0.5"}`}>
      <span className="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full bg-gold-soft px-2.5 py-1 text-[12px] leading-[1.3] text-maroon">
        <Eye size={13} /> {g.openCount > 1 ? t("Ochgan · {n} marta", { n: g.openCount }) : t("Ochgan")}
      </span>
      {g.lastOpenedAt && <span className="whitespace-nowrap text-[11px] text-ink-2">{relTime(locale, g.lastOpenedAt)}</span>}
    </span>
  );
}

/** Tilak: 2 qatorgacha, bosilsa to‘liq */
function Wish({ text, big = false }: { text: string | null | undefined; big?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  if (!text) return <span className="t-body-s text-ink-2">—</span>;
  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      title={open ? undefined : t("To‘liq ko‘rish")}
      className={`block w-full text-left font-serif italic leading-[1.35] text-ink [overflow-wrap:anywhere] ${big ? "text-[16px]" : "text-[15px]"} ${open ? "" : "line-clamp-2"}`}
    >
      “{text}”
    </button>
  );
}

/** Qator amallari menyusi: tahrirlash, o‘chirish */
function RowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("keydown", k);
    };
  }, [open]);
  const item = "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left t-body-m transition-colors hover:bg-bg-soft";
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={t("Boshqa amallar")} aria-expanded={open} aria-haspopup="menu" className="icon-btn !size-9">
        <More size={16} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+6px)] z-30 flex w-44 flex-col gap-0.5 rounded-2xl border border-line bg-bg-base p-1.5 shadow-menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className={`${item} text-ink`}
          >
            <Edit2 size={16} /> {t("Tahrirlash")}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className={`${item} text-danger`}
          >
            <Trash size={16} /> {t("O‘chirish")}
          </button>
        </div>
      )}
    </div>
  );
}

/** Ism va izohni tahrirlash oynasi */
function EditDialog({ guest, invitationId, onClose, onSaved }: { guest: SpecialGuest; invitationId: string; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const toast = useToast();
  const [name, setName] = useState(guest.name);
  const [note, setNote] = useState(guest.note ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErr(t("Mehmon ismini yozing"));
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/invitations/${encodeURIComponent(invitationId)}/special-guests/${guest.id}`, { method: "PATCH", json: { name: name.trim(), note: note.trim() } });
      toast(t("Saqlandi"));
      onSaved();
      onClose();
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} label={t("Mehmonni tahrirlash")}>
      <form onSubmit={save} className="flex flex-col gap-5 p-5 sm:p-6">
        <p className="font-serif text-[26px] font-medium leading-[1.15] text-ink">{t("Mehmonni tahrirlash")}</p>
        <Field
          label={t("Murojaat (taklifnomada shunday chiqadi)")}
          hint={name.trim().length > NAME_SOFT ? t(LONG_HINT) : t("«Hurmatli {name}»", { name: name.trim() || "…" })}
          error={err}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={NAME_MAX} autoFocus aria-invalid={!!err} />
        </Field>
        <Field label={t("Izoh (faqat sizga ko‘rinadi)")}>
          <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={t("Masalan: kelin tomondan")} />
        </Field>
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            {t("Bekor qilish")}
          </button>
          <button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-50">
            {busy ? t("Saqlanmoqda…") : t("Saqlash")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Mehmon qo‘shish: bitta ism yoki ro‘yxat (har qatorga bitta) */
function AddGuests({ invitationId, count, max, onAdded }: { invitationId: string; count: number; max: number; onAdded: () => void }) {
  const t = useT();
  const toast = useToast();
  const [mode, setMode] = useState<"one" | "list">("one");
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const names = mode === "one" ? (name.trim() ? [name.trim()] : []) : parseNames(text);
  const tooLong = names.find((n) => n.length > NAME_MAX);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!names.length) return setErr(t("Mehmon ismini yozing"));
    if (tooLong) return setErr(t("Ism juda uzun (ko‘pi bilan 40 belgi)"));
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ added: SpecialGuest[]; skipped: number }>(`/api/invitations/${encodeURIComponent(invitationId)}/special-guests`, { method: "POST", json: { names } });
      const msg = r.added.length ? t("{n} ta mehmon qo‘shildi", { n: r.added.length }) : t("Bu mehmonlar ro‘yxatda bor");
      toast(r.skipped && r.added.length ? `${msg} · ${t("{n} tasi avval qo‘shilgan", { n: r.skipped })}` : msg, r.added.length ? "success" : "error");
      if (r.added.length) {
        setName("");
        setText("");
        onAdded();
      }
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="flex flex-col gap-4 rounded-card border border-line bg-bg-base p-4 lg:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-[15px] font-semibold leading-[1.35] text-ink">{t("Mehmon qo‘shish")}</p>
          <p className="t-body-s text-ink-2">{t("Har biriga shaxsiy havola: taklifnoma «Hurmatli …» deb ochiladi")}</p>
        </div>
        <div className="w-full sm:w-[260px]">
          <Segment
            value={mode}
            onChange={(v) => {
              setMode(v);
              setErr(null);
            }}
            options={[
              { value: "one", label: t("Bitta") },
              { value: "list", label: t("Ro‘yxat bilan") },
            ]}
          />
        </div>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-2.5" noValidate>
        {mode === "one" ? (
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={NAME_MAX}
              placeholder={t("Masalan: Dilshod aka")}
              aria-label={t("Mehmon ismi")}
              aria-invalid={!!err}
              className={`${inputClass} min-w-0 !rounded-full sm:flex-1`}
            />
            <button type="submit" disabled={busy || !names.length} className="btn btn-primary shrink-0 disabled:opacity-50">
              <Add size={16} /> {t("Qo‘shish")}
            </button>
          </div>
        ) : (
          <>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder={t("Har qatorga bitta ism:\nDilshod aka\nKarimovlar oilasi\nMalika opa")}
              aria-label={t("Mehmonlar ro‘yxati")}
              aria-invalid={!!err}
            />
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <span className="t-body-s text-ink-2">{t("{n} ta ism", { n: names.length })}</span>
              <button type="submit" disabled={busy || !names.length} className="btn btn-primary disabled:opacity-50">
                <Add size={16} /> {names.length > 1 ? t("{n} ta mehmonni qo‘shish", { n: names.length }) : t("Qo‘shish")}
              </button>
            </div>
          </>
        )}
        {err ? <p className="t-body-s text-danger">{err}</p> : names.some((n) => n.length > NAME_SOFT) && <p className="t-body-s text-pending">{t(LONG_HINT)}</p>}
        <p className="text-[12px] text-ink-2">{t("{n} / {max} ta mehmon", { n: count, max })}</p>
      </form>
    </section>
  );
}

/** Avval shu brauzerda yaratilgan «?m=Ism» havolalarini maxsus mehmonlarga ko‘chirish taklifi */
function LegacyImport({ slug, invitationId, onDone }: { slug: string; invitationId: string; onDone: () => void }) {
  const t = useT();
  const toast = useToast();
  const key = `sh_guests_${slug}`;
  const [names, setNames] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    try {
      const l = JSON.parse(localStorage.getItem(key) || "[]");
      if (Array.isArray(l)) setNames(l.filter((x): x is string => typeof x === "string" && !!x.trim()));
    } catch {}
  }, [key]);
  if (!names.length) return null;
  const forget = () => {
    try {
      localStorage.removeItem(key);
    } catch {}
    setNames([]);
  };
  const run = async () => {
    setBusy(true);
    try {
      const r = await api<{ added: SpecialGuest[] }>(`/api/invitations/${encodeURIComponent(invitationId)}/special-guests`, { method: "POST", json: { names: names.map((n) => n.slice(0, NAME_MAX)) } });
      toast(t("{n} ta mehmon qo‘shildi", { n: r.added.length }));
      forget();
      onDone();
    } catch (x) {
      toast((x as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-3 rounded-card bg-gold-soft/60 p-4 sm:flex-row sm:items-center lg:p-5">
      <p className="min-w-0 flex-1 t-body-m text-ink">
        {t("Bu brauzerda avval yaratilgan {n} ta shaxsiy havola bor. Ularni shu ro‘yxatga qo‘shsangiz, kim ochganini va javobini ko‘rasiz (eski havolalar ham ishlayveradi).", { n: names.length })}
      </p>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={forget} className="btn btn-secondary btn-sm">
          {t("Kerak emas")}
        </button>
        <button type="button" onClick={run} disabled={busy} className="btn btn-primary btn-sm disabled:opacity-50">
          {t("Qo‘shish")}
        </button>
      </div>
    </div>
  );
}

export function SpecialGuests() {
  return (
    <Suspense>
      <SpecialGuestsInner />
    </Suspense>
  );
}

function SpecialGuestsInner() {
  const t = useT();
  const locale = useLocale();
  const copy = useCopy();
  const toast = useToast();
  const params = useSearchParams();
  const siteUrl = useSiteUrl();
  const { data: bundle, reload: reloadBundle } = useInvitationData();
  const { order, invitation: inv } = bundle;
  const paid = isPaidStatus(order.status);
  const archived = order.status === "archived";
  const res = useApi<Resp>(paid || archived ? `/api/invitations/${encodeURIComponent(inv.id)}/special-guests` : null);
  const list = useMemo(() => res.data?.list ?? [], [res.data]);
  const editable = paid && (res.data?.editable ?? true);
  const [editing, setEditing] = useState<SpecialGuest | null>(null);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(PER * 2);

  const f = FILTERS.includes(params.get("f") as Filter) ? (params.get("f") as Filter) : "all";
  const q = (params.get("q") ?? "").trim().toLowerCase().slice(0, 60);
  useEffect(() => {
    setPage(1);
    setMore(PER * 2);
  }, [f, q]);

  const refresh = () => {
    res.reload(true);
    reloadBundle(true);
  };
  const link = (g: SpecialGuest) => `${siteUrl}/${inv.slug}/?g=${g.token}`;
  const remove = async (g: SpecialGuest) => {
    const ok = await confirmDialog({
      title: t("«{name}» o‘chirilsinmi?", { name: g.name }),
      text: t("Shaxsiy havolasi ishlamay qoladi (taklifnoma umumiy ko‘rinishda ochiladi). Javobi bo‘lsa, «Barcha javoblar»da qoladi."),
      ok: t("O‘chirish"),
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/invitations/${encodeURIComponent(inv.id)}/special-guests/${g.id}`, { method: "DELETE" });
      toast(t("O‘chirildi"));
      refresh();
    } catch (x) {
      toast((x as Error).message, "error");
    }
  };

  if (!paid && !archived)
    return (
      <section className="flex flex-col items-center gap-3 rounded-card border border-line px-6 py-14 text-center">
        <Ornament />
        <p className="font-serif text-[26px] font-light text-ink">{t("Maxsus mehmonlar")}</p>
        <p className="t-body-m max-w-[420px] text-ink-2">{t("Mehmonlarga ism bilan shaxsiy havola to‘lov tasdiqlangach ochiladi.")}</p>
      </section>
    );

  const sum = {
    total: list.length,
    opened: list.filter((g) => g.openCount > 0 || g.response).length,
    answered: list.filter((g) => g.response).length,
    people: list.reduce((n, g) => n + (g.response?.status === "coming" ? g.response.count : 0), 0),
  };
  const counts: Record<Filter, number> = { all: list.length, unopened: 0, opened: 0, coming: 0, not_coming: 0 };
  list.forEach((g) => FILTERS.slice(1).forEach((k) => match(g, k) && counts[k]++));
  const shown = list.filter((g) => match(g, f) && (!q || g.name.toLowerCase().includes(q) || (g.response?.name ?? "").toLowerCase().includes(q) || (g.note ?? "").toLowerCase().includes(q)));
  const pages = Math.max(1, Math.ceil(shown.length / PER));
  const pg = Math.min(page, pages);
  const deskList = shown.slice((pg - 1) * PER, pg * PER);
  const mobList = shown.slice(0, more);
  const from = shown.length ? (pg - 1) * PER + 1 : 0;
  const to = Math.min(shown.length, pg * PER);

  const cards = [
    { icon: <People size={16} />, label: t("Maxsus mehmonlar"), value: String(sum.total), color: "text-maroon" },
    { icon: <Eye size={16} />, label: t("Ochgan"), value: String(sum.opened), color: "text-gold" },
    { icon: <TickCircle size={16} />, label: t("Javob bergan"), value: String(sum.answered), color: "text-success" },
    { icon: <UserTick size={16} />, label: t("Keladi"), value: t("{n} kishi", { n: sum.people }), color: "text-success" },
  ];
  const chipHref = (k: Filter) => {
    const n = new URLSearchParams({ tab: "maxsus" });
    if (k !== "all") n.set("f", k);
    if (q) n.set("q", params.get("q") ?? "");
    return `?${n}`;
  };
  const csvUrl = `/api/invitations/${encodeURIComponent(inv.id)}/special-guests-csv`;

  /** Qator amallari: desktop — ikonkalar; mobil — «Ulashish» tugmasi + ikonkalar (360 da ham sig‘adi) */
  const actions = (g: SpecialGuest, mobile = false) =>
    archived ? null : (
      <div className={`flex items-center ${mobile ? "gap-2" : "justify-end gap-1.5"}`}>
        {mobile && (
          <ShareInvite
            label={t("Ulashish")}
            target={{ invitationId: inv.id, templateSlug: order.templateSlug, invitation: inv, url: link(g), guest: g.name }}
            className="btn btn-primary btn-sm min-w-0 flex-1 !px-3"
          />
        )}
        <button
          type="button"
          onClick={() => copy(link(g), t("Shaxsiy havola nusxalandi"))}
          aria-label={t("Havolani nusxalash")}
          title={t("Havolani nusxalash")}
          className="icon-btn !size-9 shrink-0"
        >
          <Copy size={16} />
        </button>
        {!mobile && (
          <ShareInvite
            variant="icon"
            label={t("Shaxsiy taklifnomani ulashish")}
            target={{ invitationId: inv.id, templateSlug: order.templateSlug, invitation: inv, url: link(g), guest: g.name }}
            className="icon-btn !size-9"
          />
        )}
        <a href={link(g)} target="_blank" rel="noopener noreferrer" aria-label={t("Ochib ko‘rish")} title={t("Ochib ko‘rish")} className="icon-btn !size-9 shrink-0">
          <ExportSquare size={16} />
        </a>
        {editable && <RowMenu onEdit={() => setEditing(g)} onDelete={() => remove(g)} />}
      </div>
    );

  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((s) => (
          <div key={s.label} className="flex flex-col gap-2.5 rounded-card bg-bg-soft p-4 lg:p-5">
            <span className="flex items-center gap-2 t-body-s text-ink-2">
              <span className={s.color}>{s.icon}</span> {s.label}
            </span>
            <span className="font-serif text-[26px] font-medium leading-[1.2] text-ink lg:text-[30px]">{s.value}</span>
          </div>
        ))}
      </div>

      {archived && <p className="rounded-card bg-bg-soft px-4 py-3 t-body-m text-ink-2">{t("Taklifnoma arxivlangan — ro‘yxatni faqat ko‘rish mumkin.")}</p>}
      {editable && <LegacyImport slug={inv.slug} invitationId={inv.id} onDone={refresh} />}
      {editable && <AddGuests invitationId={inv.id} count={list.length} max={res.data?.max ?? 1000} onAdded={refresh} />}

      <section className="flex flex-col gap-4 rounded-card border border-line bg-bg-base p-4 lg:p-5">
        {list.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
              {FILTERS.map((k) => {
                const active = k === f;
                return (
                  <Link
                    key={k}
                    href={chipHref(k)}
                    scroll={false}
                    aria-current={active ? "true" : undefined}
                    className={`inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-full px-4 t-nav transition-colors ${active ? "bg-maroon text-ink-inverse" : "bg-bg-soft text-ink hover:bg-gold-soft"}`}
                  >
                    {t(FILTER_LABEL[k])} <span className="text-[12px] opacity-70">{counts[k]}</span>
                  </Link>
                );
              })}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Suspense>
                <GuestSearch />
              </Suspense>
              <a
                href={csvUrl}
                onClick={
                  locale !== "uz"
                    ? (e) => {
                        e.preventDefault();
                        const prefix: [string, string] = ["maxsus-mehmonlar-", locale === "ru" ? "osobye-gosti-" : "special-guests-"];
                        downloadCsvTranslated(csvUrl, `${prefix[1]}${inv.slug}.csv`, csvDict(locale, 1, prefix)).catch(() => (window.location.href = csvUrl));
                      }
                    : undefined
                }
                className="btn btn-secondary btn-sm shrink-0 !py-3"
              >
                <ArrowDown size={16} /> {t("Ro‘yxatni yuklab olish")}
              </a>
            </div>
          </div>
        )}

        {res.loading && !res.data ? (
          <p className="py-8 text-center t-body-m text-ink-2">{t("Yuklanmoqda…")}</p>
        ) : res.error ? (
          <p className="py-8 text-center t-body-m text-danger">{res.error.message}</p>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <Ornament />
            <p className="font-serif text-[26px] font-light leading-[1.15] text-ink">{t("Hali maxsus mehmonlar yo‘q")}</p>
            <p className="t-body-m max-w-[440px] text-ink-2">
              {editable
                ? t("Ism qo‘shing — har biriga shaxsiy havola tayyor bo‘ladi. Kim ochganini, javobi va tilagini shu yerda ko‘rasiz.")
                : t("Bu taklifnomada maxsus mehmonlar qo‘shilmagan.")}
            </p>
          </div>
        ) : shown.length === 0 ? (
          <p className="border-t border-line py-8 text-center t-body-m text-ink-2">{t("Hech narsa topilmadi")}</p>
        ) : (
          <>
            {/* Desktop jadval */}
            <div className="hidden lg:block">
              <table className="w-full table-fixed text-left">
                <thead>
                  <tr className="border-y border-line t-annotation text-ink-2">
                    <th className="w-[25%] py-3 font-medium">{t("Mehmon")}</th>
                    <th className="w-[16%] py-3 font-medium">{t("Ochganmi")}</th>
                    <th className="w-[18%] py-3 font-medium">{t("Javob")}</th>
                    <th className="py-3 font-medium">{t("Tilak")}</th>
                    <th className={`${archived ? "w-0" : editable ? "w-[176px]" : "w-[136px]"} py-3`}>
                      <span className="sr-only">{t("Amallar")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deskList.map((g) => (
                    <tr key={g.id} className="border-b border-line align-middle">
                      <td className="py-3 pr-3">
                        <span className="flex items-center gap-3">
                          <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-gold-soft text-[12px] font-semibold text-maroon">{initials(g.name)}</span>
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-[13px] font-semibold text-ink" title={g.name}>
                              {g.name}
                            </span>
                            {(g.note || (g.response && g.response.name !== g.name)) && (
                              <span className="truncate text-[11px] text-ink-2" title={[g.note, g.response?.name].filter(Boolean).join(" · ")}>
                                {[g.note, g.response && g.response.name !== g.name ? t("javobda: {name}", { name: g.response.name }) : null].filter(Boolean).join(" · ")}
                              </span>
                            )}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <OpenState g={g} />
                      </td>
                      <td className="py-3 pr-3">
                        <AnswerBadge g={g} />
                      </td>
                      <td className="py-3 pr-4">
                        <Wish text={g.response?.wish} />
                      </td>
                      <td className="py-3">{actions(g)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between pt-4">
                <span className="t-body-s text-ink-2">{t("{total} ta mehmondan {from}–{to} ko‘rsatilmoqda", { total: shown.length, from, to })}</span>
                {pages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button type="button" aria-label={t("Oldingi")} disabled={pg <= 1} onClick={() => setPage(pg - 1)} className="icon-btn !size-9 disabled:pointer-events-none disabled:opacity-40">
                      <ArrowLeft2 size={15} />
                    </button>
                    {Array.from({ length: pages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === pages || Math.abs(p - pg) <= 1)
                      .map((p, i, arr) => (
                        <span key={p} className="flex items-center gap-1.5">
                          {i > 0 && p - arr[i - 1] > 1 && <span className="t-body-s text-ink-2">…</span>}
                          <button
                            type="button"
                            onClick={() => setPage(p)}
                            aria-current={p === pg ? "page" : undefined}
                            className={`flex size-9 items-center justify-center rounded-full t-nav ${p === pg ? "bg-maroon text-ink-inverse" : "text-ink hover:bg-bg-soft"}`}
                          >
                            {p}
                          </button>
                        </span>
                      ))}
                    <button type="button" aria-label={t("Keyingi")} disabled={pg >= pages} onClick={() => setPage(pg + 1)} className="icon-btn !size-9 disabled:pointer-events-none disabled:opacity-40">
                      <ArrowRight2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobil kartalar */}
            <div className="flex flex-col gap-2.5 lg:hidden">
              {mobList.map((g) => (
                <div key={g.id} className="flex flex-col gap-3 rounded-2xl bg-bg-soft p-3.5">
                  <div className="flex items-start gap-3">
                    <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-bg-base text-[12px] font-semibold text-maroon">{initials(g.name)}</span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[14px] font-semibold leading-[1.3] text-ink [overflow-wrap:anywhere]">{g.name}</span>
                      {(g.note || (g.response && g.response.name !== g.name)) && (
                        <span className="text-[11px] text-ink-2 [overflow-wrap:anywhere]">
                          {[g.note, g.response && g.response.name !== g.name ? t("javobda: {name}", { name: g.response.name }) : null].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </span>
                    {g.response && <AnswerBadge g={g} />}
                  </div>
                  <OpenState g={g} compact />
                  {g.response?.wish && <Wish text={g.response.wish} big />}
                  {actions(g, true)}
                </div>
              ))}
              {shown.length > mobList.length && (
                <button type="button" onClick={() => setMore((n) => n + PER * 2)} className="btn btn-secondary w-full">
                  {t("Yana ko‘rsatish")} ({shown.length - mobList.length})
                </button>
              )}
            </div>
          </>
        )}
      </section>

      {editing && <EditDialog guest={editing} invitationId={inv.id} onClose={() => setEditing(null)} onSaved={refresh} />}
    </>
  );
}

function Ornament() {
  return (
    <svg viewBox="0 0 120 120" className="size-20" aria-hidden>
      <path d={star8Path(60, 60, 56)} fill="none" stroke="var(--color-gold)" strokeOpacity="0.55" />
      <path d={star8Path(60, 60, 34)} fill="none" stroke="var(--color-gold)" strokeOpacity="0.35" />
      <path d={star8Path(60, 60, 9)} fill="var(--color-gold)" />
    </svg>
  );
}
