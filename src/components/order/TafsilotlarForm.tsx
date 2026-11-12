"use client";

import { useMemo, useRef, useState } from "react";
import { useLocalRouter } from "@/lib/useLocalRouter";
import { useT } from "@/lib/i18n";
import { ArrowRight, CloseCircle, GalleryAdd } from "@/components/icons";
import { PhoneInput, Toggle, phoneDigits, phoneToLocal, useToast } from "@/components/ui";
import { photoSlots, type Template } from "@/lib/templates";
import { FlowField, flowInput, SectionTitle } from "./fields";
import { OrderSummary, MobileBar, MobileTemplateCard } from "./OrderSummary";
import { FlowColumns } from "./FlowTop";
import { useAutosave } from "./useAutosave";
import { liveTemplate, dayTime } from "./live";
import { namesOf } from "./labels";
import type { FlowOrder } from "./types";
import { SaveIndicator } from "./SaveIndicator";
import { MusicPicker } from "./MusicPicker";
import { LivePreviewButton } from "./LiveDevices";

export function TafsilotlarForm({ order, template, editing }: { order: FlowOrder; template: Template; editing: boolean }) {
  const router = useLocalRouter();
  const t = useT();
  const toast = useToast();
  const [o, setO] = useState(order);
  const [phone, setPhone] = useState(phoneToLocal(order.contactPhone));
  const [errors, setErrors] = useState<{ phone?: string; message?: string }>({});
  const [busy, setBusy] = useState(false);
  const { queue, flush, state, error: saveError } = useAutosave(order.id);
  const live = useMemo(() => liveTemplate(template, o), [template, o]);
  const slots = photoSlots(template);

  const set = <K extends keyof FlowOrder>(k: K, v: FlowOrder[K]) => {
    setO((p) => ({ ...p, [k]: v }));
    queue({ [k]: v });
  };

  const onPhone = (v: string) => {
    setPhone(v);
    setErrors((e) => ({ ...e, phone: undefined }));
    if (phoneDigits(v).length === 9) queue({ contactPhone: `+998${phoneDigits(v)}` });
  };

  const [slotBusy, setSlotBusy] = useState<number | null>(null);
  const slotRef = useRef<HTMLInputElement>(null);
  const pendingSlot = useRef(0);
  /** Bitta aniq joyga surat: band bo‘lsa — almashtiriladi, bo‘sh bo‘lsa — keyingi joyga qo‘shiladi */
  const uploadSlot = async (file: File | undefined, slot: number) => {
    if (!file) return;
    await flush();
    setSlotBusy(slot);
    try {
      const fd = new FormData();
      fd.set("file", file);
      if (slot < o.photos.length) fd.set("slot", String(slot));
      const res = await fetch(`/api/orders/${order.id}/photos`, { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; photos?: string[]; error?: string };
      if (!res.ok || !data.photos) throw new Error(data.error || "Surat yuklanmadi");
      setO((p) => ({ ...p, photos: data.photos! }));
    } catch (e) {
      toast(t((e as Error).message), "error");
    } finally {
      setSlotBusy(null);
      if (slotRef.current) slotRef.current.value = "";
    }
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
    <button type="button" onClick={next} disabled={busy || slotBusy !== null} className="btn btn-primary w-full">
      {editing ? t("Saqlash") : t("Tekshirishga o‘tish")} <ArrowRight size={16} />
    </button>
  );

  const toggles: { key: "rsvpEnabled" | "musicEnabled"; title: string }[] = [
    { key: "rsvpEnabled", title: "Mehmonlar javobi" },
    { key: "musicEnabled", title: "Fon musiqasi" },
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

        <FlowField label={t("Taklif matni")} error={errors.message} htmlFor="f-msg">
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

        <div className="flex flex-col gap-3">
          {/* Suratsiz dizayn (Sayohat) — «Suratlar» sarlavhasi va bo‘sh ro‘yxat ko‘rsatilmaydi, faqat jonli ko‘rinish tugmasi */}
          {slots.length > 0 && <SectionTitle>{t("Suratlar")}</SectionTitle>}
          <input
            ref={slotRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            hidden
            onChange={(e) => uploadSlot(e.target.files?.[0], pendingSlot.current)}
          />
          <ul className={slots.length ? "grid grid-cols-2 gap-3 sm:grid-cols-4" : "hidden"}>
            {slots.map((sl, i) => {
              const src = o.photos[i];
              const next = i === o.photos.length; // keyingi bo‘sh joy
              const locked = !src && i > o.photos.length;
              const busyHere = slotBusy === i;
              const pick = () => {
                if (locked || slotBusy !== null) return;
                pendingSlot.current = src ? i : o.photos.length;
                slotRef.current?.click();
              };
              return (
                <li key={i} className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={pick}
                    disabled={locked || slotBusy !== null}
                    aria-label={`${t(sl.title)} — ${src ? t("Almashtirish") : t("Surat qo‘shish")}`}
                    className={`group relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-xl border transition-colors ${
                      src ? "border-line" : next ? "border-dashed border-maroon/50 bg-bg-soft hover:bg-gold-soft/50" : "border-dashed border-line bg-bg-soft opacity-60"
                    }`}
                  >
                    {src ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="size-full object-cover" />
                        <span className="absolute inset-x-2 bottom-2 rounded-full bg-bg-base/90 py-1.5 text-center t-body-s font-medium text-ink opacity-0 transition-opacity group-hover:opacity-100 max-lg:opacity-100">
                          {t("Almashtirish")}
                        </span>
                      </>
                    ) : busyHere || (next && slotBusy === o.photos.length) ? (
                      <span className="size-7 animate-spin rounded-full border-2 border-gold-soft border-t-maroon" />
                    ) : (
                      <span className={`flex flex-col items-center gap-1.5 ${next ? "text-maroon" : "text-ink-2"}`}>
                        <GalleryAdd size={22} />
                        <span className="t-body-s font-medium">{next ? t("Surat qo‘shish") : t("Avval oldingisini qo‘shing")}</span>
                      </span>
                    )}
                    <span className="absolute left-2 top-2 flex size-6 items-center justify-center rounded-full bg-maroon text-[12px] font-semibold text-ink-inverse">{i + 1}</span>
                    {src && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          removePhoto(src);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), removePhoto(src))}
                        aria-label={t("Suratni o‘chirish")}
                        className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-bg-base/90 text-ink"
                      >
                        <CloseCircle size={16} />
                      </span>
                    )}
                  </button>
                  <span className="t-body-s font-semibold leading-tight text-ink">{t(sl.title)}</span>
                  <span className="-mt-1 text-[12px] leading-tight text-ink-2">{t(sl.where)}</span>
                </li>
              );
            })}
          </ul>
          <LivePreviewButton template={template} order={o} className="btn btn-secondary w-full sm:w-fit" />
        </div>

        <div className="flex flex-col gap-3">
          <SectionTitle>{t("Taklifnoma imkoniyatlari")}</SectionTitle>
          {toggles.map((tg) => (
            <div key={tg.key} className="flex items-center gap-4 rounded-xl bg-bg-soft px-[13px] py-4">
              <div className="flex flex-1 flex-col gap-1">
                <p className="t-title text-ink">{t(tg.title)}</p>
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
          <FlowField label={t("Telegram foydalanuvchi nomi")} htmlFor="f-tg">
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
