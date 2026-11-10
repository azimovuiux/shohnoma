"use client";

import { useEffect, useMemo, useState } from "react";
import { setCategories, type Category } from "@/lib/categories";
import { CATEGORY_ICONS, CategoryIcon } from "@/lib/categoryIcons";
import { ceremonyLabel, type Ceremony, type Template } from "@/lib/templates";
import { Field, Input, Modal, api, confirmDialog, useToast } from "@/components/ui";
import { Add, Edit, SearchNormal1, Trash } from "@/components/icons";

const kinds = Object.keys(ceremonyLabel) as Ceremony[];
const kindHint: Record<Ceremony, string> = {
  nikoh: "ikki ism (kelin-kuyov)",
  fotiha: "ikki ism",
  sunnat: "bitta ism",
  "tugilgan-kun": "bitta ism",
};
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[‘’ʻʼ'`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);

const blank: Category = { slug: "", name: "", nameRu: "", nameEn: "", icon: "Star1", kind: "nikoh" };

/** Kategoriyalar: katalog filtrlari (nomi uz/ru/en, ikonka, taklifnoma turi) */
export function AdminCategories({ templates }: { templates: Template[] }) {
  const toast = useToast();
  const [list, setList] = useState<Category[] | null>(null);
  const [edit, setEdit] = useState<{ c: Category; index: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ categories: Category[] }>("/api/admin/categories")
      .then((r) => setList(r.categories))
      .catch((e) => toast((e as Error).message, "error"));
  }, [toast]);

  const used = (slug: string) => templates.filter((t) => (t.ceremonies?.length ? t.ceremonies : [t.ceremony]).includes(slug)).length;

  const save = async (next: Category[], msg: string) => {
    setBusy(true);
    try {
      const r = await api<{ categories: Category[] }>("/api/admin/categories", { method: "PUT", json: { categories: next } });
      setList(r.categories);
      setCategories(r.categories);
      toast(msg);
      return true;
    } catch (e) {
      toast((e as Error).message, "error");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: Category) => {
    if (!list) return;
    const n = used(c.slug);
    const ok = await confirmDialog({
      title: `“${c.name}” kategoriyasini o‘chirasizmi?`,
      text: n ? `${n} ta shablonda belgilangan — ulardan olib tashlanadi.` : undefined,
      ok: "O‘chirish",
      danger: true,
    });
    if (ok) await save(list.filter((x) => x.slug !== c.slug), "Kategoriya o‘chirildi");
  };

  const move = (i: number, d: -1 | 1) => {
    if (!list) return;
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    void save(next, "Tartib saqlandi");
  };

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-[28px] font-light text-ink">Kategoriyalar</h2>
          <p className="t-body-s text-ink-2">Saytdagi filtrlar. Nomi, ikonkasi va tartibi shu yerda o‘zgaradi.</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" disabled={!list || busy} onClick={() => setEdit({ c: { ...blank }, index: -1 })}>
          <Add size={16} /> Kategoriya qo‘shish
        </button>
      </div>
      {!list ? (
        <p className="mt-6 t-body-s text-ink-2">Yuklanmoqda…</p>
      ) : (
        <ul className="mt-5 divide-y divide-line overflow-hidden rounded-panel border border-line bg-bg-base">
          {list.map((c, i) => (
            <li key={c.slug} className="flex items-center gap-3 px-4 py-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-soft text-gold">
                <CategoryIcon name={c.icon} size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate t-title text-ink">
                  {c.name} {c.builtin && <span className="ml-1 rounded-full bg-bg-soft px-2 py-0.5 text-[11px] text-ink-2">standart</span>}
                </p>
                <p className="truncate t-body-s text-ink-2">
                  {[c.nameRu, c.nameEn].filter(Boolean).join(" · ") || "—"} · {used(c.slug)} ta shablon · forma: {kindHint[c.kind]}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" aria-label="Yuqoriga" disabled={busy || i === 0} onClick={() => move(i, -1)} className="flex size-9 items-center justify-center rounded-full text-ink-2 hover:bg-bg-soft disabled:opacity-30">
                  ↑
                </button>
                <button type="button" aria-label="Pastga" disabled={busy || i === list.length - 1} onClick={() => move(i, 1)} className="flex size-9 items-center justify-center rounded-full text-ink-2 hover:bg-bg-soft disabled:opacity-30">
                  ↓
                </button>
                <button type="button" aria-label="Tahrirlash" disabled={busy} onClick={() => setEdit({ c: { ...c }, index: i })} className="flex size-9 items-center justify-center rounded-full text-ink hover:bg-bg-soft">
                  <Edit size={16} />
                </button>
                {!c.builtin && (
                  <button type="button" aria-label="O‘chirish" disabled={busy} onClick={() => remove(c)} className="flex size-9 items-center justify-center rounded-full text-[#b3261e] hover:bg-bg-soft">
                    <Trash size={16} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {edit && list && (
        <CategoryEditor
          value={edit.c}
          isNew={edit.index < 0}
          busy={busy}
          taken={list.filter((_, i) => i !== edit.index).map((x) => x.slug)}
          onClose={() => setEdit(null)}
          onSave={async (c) => {
            const next = edit.index < 0 ? [...list, c] : list.map((x, i) => (i === edit.index ? c : x));
            if (await save(next, edit.index < 0 ? "Kategoriya qo‘shildi" : "Saqlandi")) setEdit(null);
          }}
        />
      )}
    </section>
  );
}

function CategoryEditor({
  value,
  isNew,
  busy,
  taken,
  onClose,
  onSave,
}: {
  value: Category;
  isNew: boolean;
  busy: boolean;
  taken: string[];
  onClose: () => void;
  onSave: (c: Category) => void;
}) {
  const [c, setC] = useState<Category>(value);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [q, setQ] = useState("");
  const set = (p: Partial<Category>) => setC((x) => ({ ...x, ...p }));
  const icons = useMemo(() => Object.keys(CATEGORY_ICONS).filter((n) => n.toLowerCase().includes(q.trim().toLowerCase())), [q]);
  const err = !c.name.trim() ? "Nomini kiriting" : !/^[a-z0-9][a-z0-9-]{1,29}$/.test(c.slug) ? "Slug: kamida 2 ta lotin harfi/raqam" : taken.includes(c.slug) ? "Bu slug band" : null;

  return (
    <Modal open onClose={onClose} label={isNew ? "Yangi kategoriya" : "Kategoriyani tahrirlash"} className="sm:max-w-[640px]">
      <div className="flex max-h-[88dvh] flex-col gap-5 overflow-y-auto p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-bg-soft text-gold">
            <CategoryIcon name={c.icon} size={24} />
          </span>
          <p className="font-serif text-[26px] font-light text-ink">{isNew ? "Yangi kategoriya" : c.name || "Kategoriya"}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nomi (o‘zbekcha)" required>
            <Input
              value={c.name}
              maxLength={40}
              onChange={(e) => set({ name: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })}
              placeholder="Masalan: Yubiley"
            />
          </Field>
          <Field label="Slug (havolada)" hint={value.builtin ? "Standart — o‘zgarmaydi" : `/shablonlar/?marosim=${c.slug || "…"}`}>
            <Input
              value={c.slug}
              disabled={!!value.builtin}
              maxLength={30}
              onChange={(e) => {
                setSlugTouched(true);
                set({ slug: slugify(e.target.value) });
              }}
            />
          </Field>
          <Field label="Nomi (ruscha)">
            <Input value={c.nameRu ?? ""} maxLength={40} onChange={(e) => set({ nameRu: e.target.value })} placeholder="Юбилей" />
          </Field>
          <Field label="Nomi (inglizcha)">
            <Input value={c.nameEn ?? ""} maxLength={40} onChange={(e) => set({ nameEn: e.target.value })} placeholder="Anniversary" />
          </Field>
        </div>
        {!value.builtin && (
          <Field group label="Buyurtma formasi" hint="Buyurtmada nechta ism so‘raladi va taklifnoma matni qaysi turda bo‘ladi">
            <div className="flex flex-wrap gap-2">
              {kinds.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={c.kind === k}
                  onClick={() => set({ kind: k })}
                  className={`rounded-full border px-3.5 py-2 t-body-s transition-colors ${c.kind === k ? "border-maroon bg-maroon text-ink-inverse" : "border-line text-ink hover:bg-bg-soft"}`}
                >
                  {ceremonyLabel[k]} — {kindHint[k]}
                </button>
              ))}
            </div>
          </Field>
        )}
        <Field group label="Ikonka">
          <div className="flex flex-col gap-3">
            <label className="relative flex items-center">
              <SearchNormal1 size={16} className="pointer-events-none absolute left-3.5 text-ink-2" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Qidirish (inglizcha: heart, star, cake…)" className="pl-10" />
            </label>
            <div className="grid max-h-[232px] grid-cols-7 gap-1.5 overflow-y-auto rounded-card border border-line p-2 sm:grid-cols-9">
              {icons.map((n) => (
                <button
                  key={n}
                  type="button"
                  title={n}
                  aria-label={n}
                  aria-pressed={c.icon === n}
                  onClick={() => set({ icon: n })}
                  className={`flex aspect-square items-center justify-center rounded-[10px] transition-colors ${c.icon === n ? "bg-maroon text-ink-inverse" : "text-ink hover:bg-bg-soft"}`}
                >
                  <CategoryIcon name={n} size={20} />
                </button>
              ))}
              {!icons.length && <p className="col-span-full py-6 text-center t-body-s text-ink-2">Topilmadi</p>}
            </div>
          </div>
        </Field>
        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
          <p className="t-body-s text-[#b3261e]">{err}</p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Bekor qilish
            </button>
            <button type="button" className="btn btn-primary" disabled={!!err || busy} onClick={() => onSave({ ...c, name: c.name.trim(), nameRu: c.nameRu?.trim(), nameEn: c.nameEn?.trim() })}>
              Saqlash
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
