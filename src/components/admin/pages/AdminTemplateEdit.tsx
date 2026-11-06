"use client";

import { useMusicTracks, usePreviewPlayer } from "@/lib/music";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { apiGet } from "@/lib/client";
import { builtinTemplates, ceremonyLabel, colorLabel, styleLabel, type Ceremony, type Style, type Template, type TemplateTheme } from "@/lib/templates";
import { Field, Input, Textarea, Toggle, api, useToast } from "@/components/ui";
import { ArrowLeft, DocumentUpload, Pause, Play, Trash } from "@/components/icons";
import { LaptopFrame, PhoneFrame } from "@/components/mockups/Devices";
import { InvitationScreen } from "@/components/mockups/InvitationScreen";
import { InvitationDesktop } from "@/components/mockups/InvitationDesktop";
import { AdminError, AdminLoading, AdminTitle } from "../shared";
import { ZipUpload } from "../ZipUpload";
import type { AdminTemplate } from "./AdminTemplates";

const selectClass =
  "h-12 w-full rounded-input border border-line bg-bg-base px-4 t-body-m text-ink outline-none transition-colors focus:border-maroon/55";

function blank(): Template {
  const b = builtinTemplates[0];
  return {
    number: 0,
    slug: "",
    name: "",
    ceremony: "nikoh",
    style: "klassik",
    priceOld: 199000,
    price: 149000,
    featured: false,
    description: "",
    palette: [...b.palette],
    sample: { ...b.sample },
    theme: { ...b.theme, bg: [...b.theme.bg] as [string, string] },
    base: b.slug,
    images: {},
    active: true,
  };
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[‘’ʻʼ'`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-panel border border-line bg-bg-base p-5">
      <h2 className="font-serif text-[22px] font-light text-ink">{title}</h2>
      {children}
    </section>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <span className="flex items-center gap-2">
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"} onChange={(e) => onChange(e.target.value)} className="h-12 w-12 shrink-0 cursor-pointer rounded-input border border-line bg-bg-base p-1" />
        <Input value={value} onChange={(e) => onChange(e.target.value.trim())} maxLength={7} className="font-mono" />
      </span>
    </Field>
  );
}

function ImageField({ label, hint, value, kind, onChange }: { label: string; hint: string; value?: string; kind: "phone" | "laptop"; onChange: (v: string | undefined) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const upload = async (f: File) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await api<{ url: string }>(`/api/admin/templates-image?kind=${kind}`, { method: "POST", body: fd });
      onChange(r.url);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <span className="t-body-s text-ink-2">{label}</span>
      <div className="flex items-center gap-3">
        <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-bg-soft ${kind === "phone" ? "h-24 w-12" : "h-16 w-24"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {value ? <img src={value} alt="" className="size-full object-cover object-top" /> : <span className="t-body-s text-ink-2">—</span>}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="btn btn-secondary btn-sm !px-4 !py-2.5">
              <DocumentUpload size={15} /> {busy ? "Yuklanmoqda…" : value ? "Almashtirish" : "Yuklash"}
            </button>
            {value && (
              <button type="button" onClick={() => onChange(undefined)} className="icon-btn !h-9 !w-9 text-danger" aria-label="Rasmni olib tashlash">
                <Trash size={15} />
              </button>
            )}
          </div>
          <span className="t-body-s text-ink-2">{hint}</span>
        </div>
      </div>
      <input ref={ref} type="file" accept="image/webp,image/png,image/jpeg" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
    </div>
  );
}

export function AdminTemplateEdit() {
  const sp = useSearchParams();
  const editSlug = sp.get("slug");
  const router = useRouter();
  const toast = useToast();
  const [t, setT] = useState<Template | null>(editSlug ? null : blank());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [zipOpen, setZipOpen] = useState(false);
  const zipDone = useRef(false);

  useEffect(() => {
    if (!editSlug) return;
    apiGet<{ templates: AdminTemplate[] }>("/api/admin/templates")
      .then((r) => {
        const found = r.templates.find((x) => x.slug === editSlug);
        if (found) setT({ ...found, images: found.images ?? {}, base: found.base ?? found.slug });
        else setLoadError("Shablon topilmadi");
      })
      .catch((e) => setLoadError((e as Error).message));
  }, [editSlug]);

  if (loadError) return <AdminError message={loadError} onRetry={() => location.reload()} />;
  if (!t) return <AdminLoading />;

  const set = (patch: Partial<Template>) => setT((p) => (p ? { ...p, ...patch } : p));
  const setTheme = (patch: Partial<TemplateTheme>) => setT((p) => (p ? { ...p, theme: { ...p.theme, ...patch } } : p));
  const setSample = (patch: Partial<Template["sample"]>) => setT((p) => (p ? { ...p, sample: { ...p.sample, ...patch } } : p));
  const isNew = !editSlug;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body = { ...t, number: t.number || undefined };
      if (isNew) await api("/api/admin/templates", { method: "POST", json: body });
      else await api(`/api/admin/templates/${t.slug}`, { method: "PUT", json: body });
      toast(isNew ? "Shablon qo‘shildi" : "Saqlandi");
      router.push("/admin/shablonlar/");
    } catch (err) {
      setError((err as Error).message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  // Ko‘rinish: rasm yuklangan bo‘lsa — rasm, aks holda tanlangan dizayn asosida chizma
  const preview: Template = { ...t, slug: t.slug || "yangi", isLive: false };

  return (
    <form onSubmit={save} noValidate>
      <Link href="/admin/shablonlar/" className="mb-4 inline-flex items-center gap-2 t-nav text-ink-2 hover:text-maroon">
        <ArrowLeft size={16} /> Shablonlar
      </Link>
      <AdminTitle
        title={isNew ? "Yangi shablon" : t.name || "Shablon"}
        sub={isNew ? "Ma’lumotlarni to‘ldiring va saqlang — shablon katalogda darhol paydo bo‘ladi." : `/shablonlar/${t.slug}/`}
        right={
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? "Saqlanmoqda…" : "Saqlash"}
          </button>
        }
      />
      {error && <p className="mb-5 rounded-input bg-[var(--danger-bg)] px-4 py-3 t-body-m text-danger">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6">
          <Section title="Asosiy">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nomi" required>
                <Input
                  value={t.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    set(isNew && !slugTouched ? { name, slug: slugify(name) } : { name });
                  }}
                  maxLength={80}
                />
              </Field>
              <Field label="Slug (havola)" required hint={isNew ? `shohnoma.uz/shablonlar/${t.slug || "…"}/` : "Slug o‘zgartirilmaydi"}>
                <Input
                  value={t.slug}
                  disabled={!isNew}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set({ slug: slugify(e.target.value) });
                  }}
                  maxLength={62}
                />
              </Field>
              <Field label="Marosim">
                <select className={selectClass} value={t.ceremony} onChange={(e) => set({ ceremony: e.target.value as Ceremony })}>
                  {Object.entries(ceremonyLabel).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Uslub">
                <select className={selectClass} value={t.style} onChange={(e) => set({ style: e.target.value as Style })}>
                  {Object.entries(styleLabel).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Narx (so‘m)" required>
                <Input type="number" inputMode="numeric" min={1000} step={1000} value={t.price || ""} onChange={(e) => set({ price: Number(e.target.value) })} />
              </Field>
              <Field label="Eski narx (chizilgan, ixtiyoriy)">
                <Input type="number" inputMode="numeric" min={0} step={1000} value={t.priceOld || ""} onChange={(e) => set({ priceOld: Number(e.target.value) })} />
              </Field>
              <Field label="Tartib raqami" hint="Kichik raqam — katalogda oldinroq">
                <Input type="number" inputMode="numeric" value={t.number || ""} onChange={(e) => set({ number: Number(e.target.value) })} />
              </Field>
              <div className="flex flex-col justify-end gap-3 pb-1">
                <label className="flex items-center justify-between gap-3 t-body-m text-ink">
                  Saytda ko‘rinadi <Toggle checked={t.active !== false} onChange={(v) => set({ active: v })} label="Faol" />
                </label>
                <label className="flex items-center justify-between gap-3 t-body-m text-ink">
                  Bosh sahifada <Toggle checked={t.featured} onChange={(v) => set({ featured: v })} label="Bosh sahifada" />
                </label>
              </div>
            </div>
            <Field label="Tavsif">
              <Textarea value={t.description} onChange={(e) => set({ description: e.target.value })} maxLength={400} />
            </Field>
          </Section>

          {t.kind === "html" && (
            <Section title="HTML shablon">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-gold-soft px-3 py-1 t-nav text-maroon">Versiya {t.version}</span>
                <a href={`/namuna/${t.slug}/`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                  Namunani ochish
                </a>
                <button type="button" onClick={() => setZipOpen(true)} className="btn btn-secondary btn-sm">
                  <DocumentUpload size={15} /> Yangi versiya (ZIP)
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <p className="t-body-s text-ink-2">Mijoz buyurtma formasida qo‘shimcha ravishda to‘ldiradigan maydonlar:</p>
                {(t.fields ?? []).length === 0 ? (
                  <p className="t-body-s text-ink-2">— yo‘q (faqat asosiy maydonlar)</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {(t.fields ?? []).map((f) => (
                      <li key={f.key} className="rounded-xl bg-bg-soft px-3 py-2 t-body-s text-ink">
                        <b>{f.label}</b> <span className="text-ink-2">({f.type === "list" ? `ro‘yxat, ${f.max} tagacha: ${Object.values(f.item).map((x) => x.label).join(", ")}` : f.type}{"required" in f && f.required ? ", majburiy" : ""})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Field label="Rang guruhi (katalog filtri)">
                <select className={selectClass} value={t.theme.color} onChange={(e) => setTheme({ color: e.target.value as TemplateTheme["color"] })}>
                  {Object.entries(colorLabel).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <ZipUpload open={zipOpen} onClose={() => (setZipOpen(false), zipDone.current && location.reload())} replace={t.slug} onDone={() => (zipDone.current = true)} />
            </Section>
          )}

          {t.kind !== "html" && (
          <Section title="Dizayn">
            <Field label="Dizayn asosi" hint="Mehmon sahifasidagi bezaklar, kirish bloki va musiqa shu dizayndan olinadi; ranglar quyidagidan.">
              <select className={selectClass} value={t.base ?? ""} onChange={(e) => set({ base: e.target.value })}>
                {builtinTemplates.map((b) => (
                  <option key={b.slug} value={b.slug}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField label="Fon (yuqori)" value={t.theme.bg[0]} onChange={(v) => setTheme({ bg: [v, t.theme.bg[1]] })} />
              <ColorField label="Fon (pastki)" value={t.theme.bg[1]} onChange={(v) => setTheme({ bg: [t.theme.bg[0], v] })} />
              <ColorField label="Asosiy matn" value={t.theme.ink} onChange={(v) => setTheme({ ink: v })} />
              <ColorField label="Urg‘u (ismlar, tugma)" value={t.theme.accent} onChange={(v) => setTheme({ accent: v })} />
              <ColorField label="Ikkilamchi matn" value={t.theme.soft} onChange={(v) => setTheme({ soft: v })} />
              <Field label="Sarlavha shrifti">
                <select className={selectClass} value={t.theme.script} onChange={(e) => setTheme({ script: e.target.value as TemplateTheme["script"] })}>
                  <option value="pinyon">Pinyon Script (yozma)</option>
                  <option value="cinzel">Cinzel (bosma, klassik)</option>
                  <option value="cormorant">Cormorant (nafis serif)</option>
                </select>
              </Field>
              <Field label="Rang guruhi (katalog filtri)">
                <select className={selectClass} value={t.theme.color} onChange={(e) => setTheme({ color: e.target.value as TemplateTheme["color"] })}>
                  {Object.entries(colorLabel).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex flex-col gap-2">
              <span className="t-body-s text-ink-2">Kartadagi rang nuqtalari</span>
              <div className="flex flex-wrap gap-3">
                {[0, 1, 2].map((i) => (
                  <input
                    key={i}
                    type="color"
                    value={t.palette[i] ?? "#ffffff"}
                    onChange={(e) => {
                      const p = [...t.palette];
                      p[i] = e.target.value;
                      set({ palette: p.map((c) => c ?? "#ffffff") });
                    }}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-bg-base p-1"
                    aria-label={`Palitra ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </Section>

          )}

          <Section title="Standart musiqa">
            <p className="t-body-s text-ink-2">
              Mijoz musiqa tanlamasa — shu trek chalinadi; buyurtma formasida ro‘yxat boshida «tavsiya» bo‘lib turadi. Treklar <a href="/admin/musiqa/" className="text-maroon underline">Musiqa</a> bo‘limida.
            </p>
            <DefaultMusic value={t.musicId ?? null} onChange={(id) => set({ musicId: id })} />
          </Section>

          <Section title="Mokap rasmlari">
            <p className="t-body-s text-ink-2">Katalog kartasida telefon va laptop ichida ko‘rinadi. Yuklanmasa — tanlangan ranglar bilan avtomatik chiziladi.</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <ImageField label="Telefon ekrani" hint="Tavsiya: 600×1300, WEBP/PNG/JPG" kind="phone" value={t.images?.phone} onChange={(v) => set({ images: { ...t.images, phone: v } })} />
              <ImageField label="Laptop ekrani" hint="Tavsiya: 1280×800" kind="laptop" value={t.images?.laptop} onChange={(v) => set({ images: { ...t.images, laptop: v } })} />
            </div>
          </Section>

          {t.kind !== "html" && (
          <Section title="Namuna ma’lumotlar">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="1-ism">
                <Input value={t.sample.a} onChange={(e) => setSample({ a: e.target.value })} maxLength={40} />
              </Field>
              <Field label="2-ism (bo‘lmasa bo‘sh)">
                <Input value={t.sample.b ?? ""} onChange={(e) => setSample({ b: e.target.value || undefined })} maxLength={40} />
              </Field>
              <Field label="Sana" hint="Masalan: 12 · 09 · 2026">
                <Input value={t.sample.date} onChange={(e) => setSample({ date: e.target.value })} maxLength={30} />
              </Field>
              <Field label="Vaqt">
                <Input value={t.sample.time} onChange={(e) => setSample({ time: e.target.value })} maxLength={10} />
              </Field>
              <Field label="Joy" className="sm:col-span-2">
                <Input value={t.sample.venue} onChange={(e) => setSample({ venue: e.target.value })} maxLength={80} />
              </Field>
            </div>
          </Section>
          )}
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-[140px] lg:self-start">
          <div className="flex flex-col items-center gap-5 rounded-panel bg-bg-soft p-6">
            <span className="t-annotation text-ink-2">Ko‘rinishi</span>
            <LaptopFrame className="w-full">
              <InvitationDesktop t={preview} />
            </LaptopFrame>
            <PhoneFrame className="w-[170px]">
              <InvitationScreen t={preview} />
            </PhoneFrame>
          </div>
          {!isNew && (
            <a href={`/namuna/${t.slug}/`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary w-full">
              Jonli namunani ochish
            </a>
          )}
          <button type="submit" disabled={saving} className="btn btn-primary w-full">
            {saving ? "Saqlanmoqda…" : "Saqlash"}
          </button>
        </aside>
      </div>
    </form>
  );
}

function DefaultMusic({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const tracks = useMusicTracks();
  const player = usePreviewPlayer();
  if (!tracks) return <div className="h-12 animate-pulse rounded-input bg-bg-soft" />;
  if (!tracks.length) return <p className="t-body-s text-ink-2">Kutubxonada hali musiqa yo‘q.</p>;
  const cur = tracks.find((x) => x.id === value);
  return (
    <div className="flex items-center gap-2">
      <select className={selectClass} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Musiqasiz</option>
        {tracks.map((x) => (
          <option key={x.id} value={x.id}>
            {x.title}
            {x.artist ? ` — ${x.artist}` : ""}
          </option>
        ))}
      </select>
      {cur && (
        <button type="button" onClick={() => player.toggle(cur.id, cur.url)} className="icon-btn shrink-0" aria-label="Tinglash">
          {player.playing === cur.id ? <Pause size={16} /> : <Play size={16} />}
        </button>
      )}
    </div>
  );
}
