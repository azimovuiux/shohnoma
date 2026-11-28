"use client";

/**
 * 1-bosqich «Ma’lumotlar»: vizitka matnlari (UZ | RU | EN tablari), rasmlar, aloqa, dizayn bo‘limlari (ro‘yxatlar).
 * Har o‘zgarish ~0.9 s dan keyin qoralama sifatida saqlanadi (PATCH _draft). «Davom etish» — qat’iy tekshiruv.
 * O‘ng tomonda (mobilda — «Ko‘rish» oynasida) vizitkaning o‘zi telefon ramkasida, joriy tab tilida.
 */
import { useVT } from "./vt";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalRouter } from "@/lib/useLocalRouter";
import { useLocale } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { ArrowRight, Eye, TickCircle } from "@/components/icons";
import { Modal } from "@/components/ui";
import { FlowColumns, MobileActions } from "@/components/order/FlowTop";
import { MobileBar } from "@/components/order/OrderSummary";
import { SectionTitle } from "@/components/order/fields";
import { CARD_API, CARD_LANGS, type CardContent, type CardLang, type CardPatchResponse, type CardPhotoResponse, type Localized } from "@/lib/cardTypes";
import { CARD_FIELDS, type CardField, type CardFieldSpec, type CardSectionKey } from "@/lib/cards";
import type { CardCtx } from "./gate";
import { CField, LangTabs, ListEditor, PhotoSlots, SpecInput, ToggleRow } from "./fields";
import { PhonePreview } from "./Preview";

const CONTENT_KEYS: (keyof CardContent)[] = ["fullName", "position", "company", "bio", "phone", "whatsapp", "email", "telegram", "website", "address", "mapUrl", "photos", "logo", "leadForm", "directions", "stats", "companies", "socials", "links"];
const LIST_KEYS: CardSectionKey[] = ["directions", "stats", "companies", "socials", "links"];

export const PHOTO_LABELS: Record<string, string[]> = {
  "v-noir": ["Portret", "Kompaniya surati"],
  "v-lumen": ["Portret", "Instagram post 1", "Post 2 · video muqovasi", "Instagram post 3"],
};

export function pickContent(c: CardContent): CardContent {
  const out = {} as Record<string, unknown>;
  for (const k of CONTENT_KEYS) out[k] = (c as unknown as Record<string, unknown>)[k];
  return out as unknown as CardContent;
}

const spec = (k: keyof CardContent): (CardFieldSpec & { key: keyof CardContent }) | undefined => {
  const f: CardField | undefined = CARD_FIELDS.find((x) => x.key === k);
  return f && f.type !== "list" ? (f as CardFieldSpec & { key: keyof CardContent }) : undefined;
};

/** Katta rasmni brauzerda kichraytirish (uzun tomoni 2400 px, JPEG) — tezroq yuklanadi. HEIC — o‘zgarishsiz. */
async function prepare(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 1.5 * 1024 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
    const cv = Object.assign(document.createElement("canvas"), { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) });
    cv.getContext("2d")!.drawImage(bmp, 0, 0, cv.width, cv.height);
    const blob = await new Promise<Blob | null>((r) => cv.toBlob(r, "image/jpeg", 0.88));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

type SaveState = "idle" | "saving" | "saved" | "error";

/** edit — to‘langan vizitkani tahrirlash: «Saqlash» qat’iy tekshiruvdan so‘ng edit.href ga qaytadi (kabinet yoki «tayyor») */
export function CardForm({ ctx, edit = null }: { ctx: CardCtx; edit?: { href: string; label: string } | null }) {
  const t = useVT();
  const locale = useLocale();
  const router = useLocalRouter();
  const { design, id } = ctx;
  const [v, setV] = useState<CardContent>(() => pickContent(ctx.raw.card));
  const [lang, setLang] = useState<CardLang>("uz");
  const [missing, setMissing] = useState<string[]>([]);
  const [save, setSave] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const dirty = useRef(new Set<keyof CardContent>());
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(v);
  latest.current = v;
  const inflight = useRef<Promise<boolean> | null>(null);

  const has = (s: CardSectionKey) => design.sections.includes(s);

  const flush = useCallback(async (): Promise<boolean> => {
    clearTimeout(timer.current);
    if (inflight.current) await inflight.current;
    const keys = [...dirty.current];
    if (!keys.length) return true;
    dirty.current.clear();
    const body: Record<string, unknown> = { _draft: true };
    for (const k of keys) body[k] = latest.current[k];
    setSave("saving");
    const p = (async () => {
      try {
        const res = await fetch(CARD_API.card(id), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const data = (await res.json().catch(() => ({}))) as Partial<CardPatchResponse> & { error?: string };
        if (!res.ok) throw new Error(data.error || "Saqlanmadi");
        setSave("saved");
        return true;
      } catch {
        keys.forEach((k) => dirty.current.add(k));
        setSave("error");
        timer.current = setTimeout(() => void flush(), 4000);
        return false;
      } finally {
        inflight.current = null;
      }
    })();
    inflight.current = p;
    return p;
  }, [id]);

  // To‘langan vizitkada avtosaqlash yo‘q (chala/bo‘sh maydon jonli vizitkaga tushmasin) — faqat «Saqlash» (qat’iy tekshiruv)
  const autosave = !edit;
  const set = <K extends keyof CardContent>(k: K, val: CardContent[K]) => {
    setV((s) => ({ ...s, [k]: val }));
    dirty.current.add(k);
    if (!autosave) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 900);
  };

  // sahifadan chiqishda saqlanmagan o‘zgarish qolmasin
  useEffect(() => {
    const onHide = () => {
      if (!autosave || !dirty.current.size) return;
      const body: Record<string, unknown> = { _draft: true };
      for (const k of dirty.current) body[k] = latest.current[k];
      dirty.current.clear();
      void fetch(CARD_API.card(id), { method: "PATCH", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
    };
    const onBefore = (e: BeforeUnloadEvent) => {
      if (dirty.current.size || inflight.current) {
        if (autosave) void flush();
        e.preventDefault();
      }
    };
    // tahrirlash rejimi: saqlanmagan o‘zgarish bilan sayt ichidagi havolaga o‘tishdan oldin so‘raladi
    const onClick = (e: MouseEvent) => {
      if (autosave || !dirty.current.size || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      if (!window.confirm(t("Saqlanmagan o‘zgarishlar bor") + ". " + t("Sahifadan chiqasizmi?"))) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBefore);
    window.addEventListener("pagehide", onHide);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBefore);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("click", onClick, true);
      clearTimeout(timer.current);
    };
  }, [id, flush, autosave, t]);

  const errs = useMemo(() => new Set(missing), [missing]);
  const topErr = (k: string) => (errs.has(k) ? "To‘ldiring" : null);

  /* Rasmlar */
  const upload = async (file: File, slot: number) => {
    const fd = new FormData();
    fd.append("file", await prepare(file), file.name.replace(/\.(png|webp)$/i, ".jpg"));
    if (slot < latest.current.photos.length) fd.append("slot", String(slot));
    const res = await fetch(CARD_API.photos(id), { method: "POST", body: fd });
    const data = (await res.json().catch(() => ({}))) as Partial<CardPhotoResponse> & { error?: string };
    if (!res.ok || !data.photos) throw new Error(data.error || "Rasm yuklanmadi");
    setV((s) => ({ ...s, photos: data.photos!, logo: data.logo ?? s.logo }));
  };
  const removePhoto = async (url: string) => {
    const res = await fetch(CARD_API.photos(id), { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
    const data = (await res.json().catch(() => ({}))) as { photos?: string[]; error?: string };
    if (res.ok && data.photos) setV((s) => ({ ...s, photos: data.photos! }));
  };

  /* Davom etish: qoralamani yuborib, qat’iy tekshiruv */
  const next = async () => {
    setBusy(true);
    setError(null);
    try {
      if (autosave) await flush();
      const body: Record<string, unknown> = {};
      for (const k of CONTENT_KEYS) if (k !== "photos" && k !== "logo") body[k] = latest.current[k];
      const res = await fetch(CARD_API.card(id), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as Partial<CardPatchResponse> & { error?: string };
      if (!res.ok) throw new Error(data.error || "Saqlanmadi");
      const m = data.missing ?? [];
      setMissing(m);
      if (!autosave) dirty.current.clear();
      if (m.length) {
        setLang("uz");
        setError("Belgilangan maydonlarni to‘ldiring");
        const first = m[0].split(".");
        setTimeout(() => document.getElementById(first.length > 1 ? `f-${first[0]}-${first[1]}-${first[2]}` : `f-${first[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
        return;
      }
      router.push(edit ? edit.href : `${ctx.base}korib-chiqish/`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /* Tablarda: shu tilda to‘ldirilgan ko‘p tilli maydonlar soni */
  const filled = useMemo(() => {
    const n: Record<CardLang, number> = { uz: 0, ru: 0, en: 0 };
    const visit = (x: unknown) => {
      if (x && typeof x === "object" && !Array.isArray(x) && "uz" in (x as object)) {
        for (const l of CARD_LANGS) if (((x as Localized)[l] ?? "").trim()) n[l]++;
      } else if (Array.isArray(x)) x.forEach((r) => r && typeof r === "object" && Object.values(r).forEach(visit));
    };
    Object.values(v).forEach(visit);
    return n;
  }, [v]);

  const field = (k: keyof CardContent) => {
    const s = spec(k);
    if (!s || s.type === "image" || s.type === "toggle") return null;
    return (
      <CField key={k} id={`f-${k}`} label={s.label} required={s.required && (!s.localized || lang === "uz")} hint={s.hint} error={topErr(k)} langBadge={s.localized ? lang : undefined}>
        <SpecInput id={`f-${k}`} spec={s} value={v[k]} lang={lang} invalid={errs.has(k)} onChange={(x) => set(k, x as never)} />
      </CField>
    );
  };

  const button = (
    <button type="button" onClick={next} disabled={busy} className="btn btn-primary w-full disabled:opacity-60">
      {busy ? t("Kuting…") : t(edit ? "Saqlash" : "Davom etish")} {!busy && !edit && <ArrowRight size={16} />}
    </button>
  );
  const saveLine =
    save === "saving" ? (
      <p className="t-body-s text-ink-2">{t("Saqlanmoqda…")}</p>
    ) : save === "saved" ? (
      <p className="inline-flex items-center gap-1.5 t-body-s text-ink-2">
        <TickCircle size={14} color="var(--color-success)" /> {t("Ma’lumotlar saqlandi")}
      </p>
    ) : save === "error" ? (
      <p className="t-body-s text-danger">{t("Saqlanmadi — qayta urinib ko‘ramiz")}</p>
    ) : null;
  const err = error && (
    <p role="alert" className="t-body-s text-danger">
      {t(error)}
    </p>
  );

  return (
    <FlowColumns
      aside={
        <div className="flex flex-col gap-5 rounded-[24px] bg-bg-soft p-6">
          {/* sticky ustun ekranga sig‘sin: telefon kengligi ekran balandligiga qarab (pastki narx/tugma doim ko‘rinadi) */}
          <div className="mx-auto w-full" style={{ maxWidth: "clamp(200px, calc((100vh - 400px) * 0.5), 290px)" }}>
            <PhonePreview design={design.slug} card={v} lang={lang} onLang={setLang} />
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="font-serif text-[26px] font-medium leading-[1.2] text-ink">{design.name}</span>
              <span className="t-body-s text-ink-2">{edit ? `shohnoma.uz/v/${ctx.raw.card.slug}/` : t("Raqamli vizitka · bir martalik to‘lov")}</span>
            </div>
            {!edit && <span className="font-serif text-[24px] font-medium text-maroon">{formatPrice(ctx.raw.order.amount, true, locale)}</span>}
          </div>
          {button}
          {err}
          <div className="flex justify-center">{saveLine}</div>
        </div>
      }
    >
      <div className="flex flex-col gap-9">
        {/* til tablari yopishqoq: sayt sarlavhasi ko‘ringanda uning ostida turadi (--hdr-offset) */}
        <div className="sticky z-10 -mx-5 bg-bg-base/95 px-5 py-3 backdrop-blur transition-[top] duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:mx-0 lg:px-0" style={{ top: "var(--hdr-offset, 0px)" }}>
          <LangTabs lang={lang} onLang={setLang} filled={filled} />
        </div>

        <section className="flex flex-col gap-4">
          <SectionTitle>{t("Asosiy ma’lumotlar")}</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            {field("fullName")}
            {field("position")}
            {field("company")}
          </div>
          {field("bio")}
        </section>

        <section className="flex flex-col gap-4" id="f-photos">
          <SectionTitle>{t("Rasmlar")}</SectionTitle>
          <PhotoSlots labels={PHOTO_LABELS[design.slug] ?? Array.from({ length: design.photoSlots }, (_, i) => (i ? `Rasm ${i + 1}` : "Portret"))} photos={v.photos} onUpload={upload} onRemove={removePhoto} />
        </section>

        <section className="flex flex-col gap-4">
          <SectionTitle>{t("Aloqa")}</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            {field("phone")}
            {field("whatsapp")}
            {field("email")}
            {field("telegram")}
            <div className="sm:col-span-2">{field("website")}</div>
          </div>
        </section>

        {has("address") && (
          <section className="flex flex-col gap-4">
            <SectionTitle>{t("Manzil")}</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              {field("address")}
              {field("mapUrl")}
            </div>
          </section>
        )}

        {LIST_KEYS.filter(has).map((k) => {
          const s = CARD_FIELDS.find((f) => f.key === k);
          if (!s || s.type !== "list") return null;
          return (
            <section key={k} className="flex flex-col gap-4">
              <SectionTitle>{t(s.label)}</SectionTitle>
              <ListEditor
                id={`f-${k}`}
                label={s.label}
                hint={s.hint}
                item={s.item}
                max={s.max}
                lang={lang}
                rows={v[k as keyof CardContent] as unknown as Record<string, unknown>[]}
                onChange={(rows) => set(k as keyof CardContent, rows as never)}
                errors={errs}
              />
            </section>
          );
        })}

        {has("leadForm") && (
          <section className="flex flex-col gap-4">
            <SectionTitle>{t("Mehmonlardan murojaat")}</SectionTitle>
            <ToggleRow label={spec("leadForm")?.label ?? "«Kontakt qoldiring» formasi"} hint={spec("leadForm")?.hint} checked={v.leadForm} onChange={(x) => set("leadForm", x)} />
          </section>
        )}

        <div className="hidden items-center justify-between gap-4 border-t border-line pt-6 lg:flex">
          {saveLine ?? <span />}
          <div className="flex w-[300px] flex-col gap-2">
            {button}
            {err}
          </div>
        </div>
      </div>

      <MobileBar>
        <MobileActions back={edit ? edit.href : `/vizitka/${design.slug}/`}>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPreview(true)} className="btn btn-secondary shrink-0 !px-4" aria-label={t("Ko‘rish")}>
              <Eye size={16} /> {t("Ko‘rish")}
            </button>
            <div className="min-w-0 flex-1">{button}</div>
          </div>
        </MobileActions>
        {err}
      </MobileBar>

      <Modal open={preview} onClose={() => setPreview(false)} label={t("Ko‘rish")} className="!max-w-[420px] bg-bg-soft p-4">
        <div className="mx-auto w-full max-w-[330px]">
          <PhonePreview design={design.slug} card={v} lang={lang} onLang={setLang} />
        </div>
        <button type="button" onClick={() => setPreview(false)} className="btn btn-secondary mt-4 w-full">
          {t("Yopish")}
        </button>
      </Modal>
    </FlowColumns>
  );
}
