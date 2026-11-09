"use client";

import { useMemo, useRef, useState } from "react";
import { useLocalRouter } from "@/lib/useLocalRouter";
import { useT } from "@/lib/i18n";
import { ArrowRight, CloseCircle, GalleryAdd, Gallery } from "@/components/icons";
import { PhoneInput, Toggle, phoneDigits, phoneToLocal, useToast } from "@/components/ui";
import type { Template } from "@/lib/templates";
import { FlowField, flowInput, SectionTitle } from "./fields";
import { OrderSummary, MobileBar, MobileTemplateCard } from "./OrderSummary";
import { FlowColumns } from "./FlowTop";
import { useAutosave } from "./useAutosave";
import { liveTemplate, dayTime } from "./live";
import { namesOf } from "./labels";
import type { FlowOrder } from "./types";
import { SaveIndicator } from "./SaveIndicator";
import { MusicPicker } from "./MusicPicker";

const MAX_PHOTOS = 10;

export function TafsilotlarForm({ order, template, editing }: { order: FlowOrder; template: Template; editing: boolean }) {
  const router = useLocalRouter();
  const t = useT();
  const toast = useToast();
  const [o, setO] = useState(order);
  const [phone, setPhone] = useState(phoneToLocal(order.contactPhone));
  const [errors, setErrors] = useState<{ phone?: string; message?: string }>({});
  const [uploading, setUploading] = useState(0);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { queue, flush, state, error: saveError } = useAutosave(order.id);
  const live = useMemo(() => liveTemplate(template, o), [template, o]);

  const set = <K extends keyof FlowOrder>(k: K, v: FlowOrder[K]) => {
    setO((p) => ({ ...p, [k]: v }));
    queue({ [k]: v });
  };

  const onPhone = (v: string) => {
    setPhone(v);
    setErrors((e) => ({ ...e, phone: undefined }));
    if (phoneDigits(v).length === 9) queue({ contactPhone: `+998${phoneDigits(v)}` });
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, MAX_PHOTOS - o.photos.length);
    if (!list.length) {
      toast(t("Ko‘pi bilan {n} ta surat", { n: MAX_PHOTOS }), "error");
      return;
    }
    await flush();
    for (const f of list) {
      setUploading((n) => n + 1);
      try {
        const fd = new FormData();
        fd.set("file", f);
        const res = await fetch(`/api/orders/${order.id}/photos`, { method: "POST", body: fd });
        const data = (await res.json()) as { ok?: boolean; photos?: string[]; error?: string };
        if (!res.ok || !data.photos) throw new Error(data.error || "Surat yuklanmadi");
        setO((p) => ({ ...p, photos: data.photos! }));
      } catch (e) {
        toast(t((e as Error).message), "error");
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const removePhoto = async (url: string) => {
    setO((p) => ({ ...p, photos: p.photos.filter((x) => x !== url) }));
    const res = await fetch(`/api/orders/${order.id}/photos`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) toast(t("Surat o‘chirilmadi"), "error");
  };

  const next = async () => {
    const e: typeof errors = {};
    if (phoneDigits(phone).length !== 9) e.phone = phone ? t("Telefon raqam to‘liq emas") : t("Telefon raqamingizni kiriting");
    if (!o.message.trim()) e.message = t("Taklif matnini kiriting");
    setErrors(e);
    if (Object.keys(e).length) {
      document.querySelector("[aria-invalid=true]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    queue({ contactPhone: `+998${phoneDigits(phone)}` });
    setBusy(true);
    const ok = await flush();
    setBusy(false);
    if (!ok) return;
    router.push(editing ? `/kabinet/t/${order.invitationId}/` : `/buyurtma/${order.id}/korib-chiqish/`);
    router.refresh();
  };

  const button = (
    <button type="button" onClick={next} disabled={busy || uploading > 0} className="btn btn-primary w-full">
      {editing ? t("Saqlash") : t("Tekshirishga o‘tish")} <ArrowRight size={16} />
    </button>
  );

  const toggles: { key: "rsvpEnabled" | "musicEnabled"; title: string; text: string }[] = [
    { key: "rsvpEnabled", title: "Mehmonlar javobi", text: "Mehmonlar ishtirokini tasdiqlashi mumkin." },
    { key: "musicEnabled", title: "Fon musiqasi", text: "Ro‘yxatdan o‘zingizga yoqqan kuyni tanlang." },
  ];

  return (
    <FlowColumns
      aside={
        <OrderSummary
          template={template}
          live={live}
          order={o}
          amount={o.amount}
          rows={[
            ["Ismlar", namesOf(o)],
            ["Sana", dayTime(o.day, o.time)],
            ["Joy", o.venueName],
            ["Mehmonlar javobi", o.rsvpEnabled ? t("Yoqilgan") : t("O‘chirilgan")],
            ["Fon musiqasi", o.musicEnabled ? t("Yoqilgan") : t("O‘chirilgan")],
          ]}
          action={button}
          extra={<SaveIndicator state={state} error={saveError} />}
        />
      }
    >
      <div className="flex flex-col gap-[26px]">
        <MobileTemplateCard template={template} live={live} order={o} />

        <FlowField label={t("Taklif matni")} error={errors.message} hint={t("Tayyor matnni o‘zingizga moslab o‘zgartirishingiz mumkin.")} htmlFor="f-msg">
          <textarea
            id="f-msg"
            value={o.message}
            onChange={(e) => {
              set("message", e.target.value);
              setErrors((x) => ({ ...x, message: undefined }));
            }}
            rows={3}
            maxLength={1000}
            aria-invalid={!!errors.message}
            className={`${flowInput} !h-auto min-h-[52px] resize-y py-3.5`}
          />
        </FlowField>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gold/55 bg-bg-soft px-5 py-6 text-center">
            <span className="text-gold">
              <Gallery size={24} />
            </span>
            <p className="t-title text-ink">{t("Suratlaringizni qo‘shing")}</p>
            <p className="t-body-s text-ink-2">
              {t("Ixtiyoriy · telefoningizdagi suratlardan tanlang")}{o.photos.length ? ` · ${o.photos.length} / ${MAX_PHOTOS}` : ""}
            </p>
            {o.photos.length > 0 && (
              <ul className="mt-2 grid w-full grid-cols-4 gap-2 sm:grid-cols-5">
                {o.photos.map((p) => (
                  <li key={p} className="group relative aspect-square overflow-hidden rounded-xl bg-bg-base">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p} alt="" className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(p)}
                      aria-label={t("Suratni o‘chirish")}
                      className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-bg-base/90 text-ink"
                    >
                      <CloseCircle size={16} />
                    </button>
                  </li>
                ))}
                {Array.from({ length: uploading }).map((_, i) => (
                  <li key={`u${i}`} className="flex aspect-square items-center justify-center rounded-xl bg-bg-base">
                    <span className="size-6 animate-spin rounded-full border-2 border-gold-soft border-t-maroon" />
                  </li>
                ))}
              </ul>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple hidden onChange={(e) => upload(e.target.files)} />
            {o.photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading > 0}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-full border border-line bg-bg-base px-4 py-3 t-button text-ink hover:bg-white disabled:opacity-60"
              >
                {uploading > 0 ? t("Yuklanmoqda…") : o.photos.length ? (<><GalleryAdd size={16} /> {t("Yana qo‘shish")}</>) : t("Surat tanlash")}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <SectionTitle>{t("Taklifnoma imkoniyatlari")}</SectionTitle>
          {toggles.map((tg) => (
            <div key={tg.key} className="flex items-center gap-4 rounded-xl bg-bg-soft px-[13px] py-4">
              <div className="flex flex-1 flex-col gap-1">
                <p className="t-title text-ink">{t(tg.title)}</p>
                <p className="t-body-s text-ink-2">{t(tg.text)}</p>
              </div>
              <Toggle checked={o[tg.key]} onChange={(v) => set(tg.key, v)} label={t(tg.title)} />
            </div>
          ))}
          {o.musicEnabled && <MusicPicker value={o.musicTrack} defaultId={template.musicId || template.musicFallback} onChange={(id) => set("musicTrack", id)} />}
        </div>

        <div className="flex flex-col gap-4">
          <SectionTitle>{t("Siz bilan bog‘lanish")}</SectionTitle>
          <FlowField label={t("Telefon raqamingiz")} required error={errors.phone} htmlFor="f-phone">
            <PhoneInput id="f-phone" value={phone} onChange={onPhone} invalid={!!errors.phone} />
          </FlowField>
          <FlowField label={t("Telegram foydalanuvchi nomi")} hint={t("Buyurtma haqidagi xabarlarni shu raqamga yuboramiz.")} htmlFor="f-tg">
            <input
              id="f-tg"
              value={o.contactTg}
              onChange={(e) => set("contactTg", e.target.value.replace(/\s/g, ""))}
              placeholder={t("@foydalanuvchi")}
              autoComplete="off"
              maxLength={64}
              className={flowInput}
            />
          </FlowField>
        </div>
      </div>

      <MobileBar>
        {button}
        <SaveIndicator state={state} error={saveError} compact />
      </MobileBar>
    </FlowColumns>
  );
}
