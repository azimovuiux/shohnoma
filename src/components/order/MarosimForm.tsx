"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Add, ArrowDown2, ArrowRight, Calendar, Clock, CloseCircle, Location, Trash } from "@/components/icons";
import { ceremonyLabel, type Ceremony, type Template } from "@/lib/templates";
import { FlowField, IconInput, bareInput, flowInput, SectionTitle } from "./fields";
import { OrderSummary, MobileBar, MobileTemplateCard } from "./OrderSummary";
import { FlowColumns } from "./FlowTop";
import { useAutosave } from "./useAutosave";
import { liveTemplate, dayTime } from "./live";
import { namesOf, needsPersonB, personLabels } from "./labels";
import type { FlowOrder } from "./types";
import { SaveIndicator } from "./SaveIndicator";

const ceremonies = (Object.keys(ceremonyLabel) as Ceremony[]).filter((c) => c in ceremonyLabel);

type Errors = Partial<Record<"personA" | "personB" | "day" | "time" | "venueName" | "address" | "mapUrl", string>>;

export function MarosimForm({ order, template, editing }: { order: FlowOrder; template: Template; editing: boolean }) {
  const router = useRouter();
  const [o, setO] = useState(order);
  const [errors, setErrors] = useState<Errors>({});
  const [showMap, setShowMap] = useState(!!order.mapUrl);
  const [busy, setBusy] = useState(false);
  const { queue, flush, state, error: saveError } = useAutosave(order.id);
  const labels = personLabels(o.ceremony);
  const live = useMemo(() => liveTemplate(template, o), [template, o]);

  const set = <K extends keyof FlowOrder>(k: K, v: FlowOrder[K], patch?: Record<string, unknown>) => {
    setO((p) => ({ ...p, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
    queue(patch ?? { [k]: v });
  };

  const validate = () => {
    const e: Errors = {};
    if (!o.personA.trim()) e.personA = o.ceremony === "tugilgan-kun" ? "Ismni kiriting" : "Ismni kiriting";
    if (needsPersonB(o.ceremony) && !o.personB.trim()) e.personB = "Ismni kiriting";
    if (!o.day) e.day = "Sanani kiriting";
    if (!o.time) e.time = "Vaqtni kiriting";
    if (!o.venueName.trim()) e.venueName = "Marosim joyini kiriting";
    if (!o.address.trim()) e.address = "Manzilni kiriting";
    if (o.mapUrl && !/^https?:\/\//.test(o.mapUrl)) e.mapUrl = "Havola https:// bilan boshlansin";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = async () => {
    if (!validate()) {
      document.querySelector("[aria-invalid=true]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusy(true);
    const ok = await flush();
    setBusy(false);
    if (!ok) return;
    router.push(editing ? `/kabinet/t/${order.invitationId}` : `/buyurtma/${order.id}/tafsilotlar`);
    router.refresh();
  };

  const program = o.program;
  const setProgram = (p: FlowOrder["program"]) => {
    setO((x) => ({ ...x, program: p }));
    if (p.every((i) => /^\d{2}:\d{2}$/.test(i.time) && i.title.trim())) queue({ program: p });
  };

  const actionLabel = editing ? "Saqlash" : "Davom etish";
  const button = (
    <button type="button" onClick={next} disabled={busy} className="btn btn-primary w-full">
      {actionLabel} <ArrowRight size={16} />
    </button>
  );

  return (
    <FlowColumns
      aside={
        <OrderSummary
          template={template}
          live={live}
          amount={o.amount}
          rows={[
            ["Ismlar", namesOf(o)],
            ["Sana", dayTime(o.day, o.time)],
            ["Joy", o.venueName],
          ]}
          action={button}
          extra={<SaveIndicator state={state} error={saveError} />}
        />
      }
    >
      <div className="flex flex-col gap-[26px]">
        <MobileTemplateCard template={template} live={live} />

        <FlowField label="Marosim turi" required htmlFor="f-ceremony">
          <span className="relative">
            <select
              id="f-ceremony"
              value={o.ceremony}
              onChange={(e) => set("ceremony", e.target.value as Ceremony)}
              className={`${flowInput} appearance-none pr-10`}
            >
              {ceremonies.map((c) => (
                <option key={c} value={c}>
                  {ceremonyLabel[c]}
                </option>
              ))}
            </select>
            <ArrowDown2 size={18} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-2" />
          </span>
        </FlowField>

        <div className="grid grid-cols-2 gap-3">
          <FlowField label={labels.a} required error={errors.personA} htmlFor="f-a" className={labels.b ? "" : "col-span-2"}>
            <input
              id="f-a"
              value={o.personA}
              onChange={(e) => set("personA", e.target.value)}
              placeholder={o.ceremony === "sunnat" ? "Muhammadali" : o.ceremony === "tugilgan-kun" ? "Sevara" : "Jasur"}
              autoComplete="off"
              maxLength={80}
              aria-invalid={!!errors.personA}
              className={flowInput}
            />
          </FlowField>
          {labels.b && (
            <FlowField label={labels.b} required={!labels.bOptional} error={errors.personB} htmlFor="f-b">
              <input
                id="f-b"
                value={o.personB}
                onChange={(e) => set("personB", e.target.value)}
                placeholder={o.ceremony === "sunnat" ? "Jamshid va Nodira" : "Madina"}
                autoComplete="off"
                maxLength={80}
                aria-invalid={!!errors.personB}
                className={flowInput}
              />
            </FlowField>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FlowField label="Sana" required error={errors.day} htmlFor="f-day">
            <IconInput icon={<Calendar size={18} />} invalid={!!errors.day}>
              <input
                id="f-day"
                type="date"
                value={o.day}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => set("day", e.target.value, { day: e.target.value, time: o.time || "18:00" })}
                aria-invalid={!!errors.day}
                className={`${bareInput} [&::-webkit-calendar-picker-indicator]:opacity-0`}
              />
            </IconInput>
          </FlowField>
          <FlowField label="Boshlanishi" required error={errors.time} htmlFor="f-time">
            <IconInput icon={<Clock size={18} />} invalid={!!errors.time}>
              <input
                id="f-time"
                type="time"
                value={o.time}
                onChange={(e) => set("time", e.target.value, o.day ? { day: o.day, time: e.target.value } : { time: e.target.value })}
                aria-invalid={!!errors.time}
                className={`${bareInput} [&::-webkit-calendar-picker-indicator]:opacity-0`}
              />
            </IconInput>
          </FlowField>
        </div>

        <FlowField label="Marosim joyi" required error={errors.venueName} htmlFor="f-venue">
          <IconInput icon={<Location size={18} />} invalid={!!errors.venueName}>
            <input
              id="f-venue"
              value={o.venueName}
              onChange={(e) => set("venueName", e.target.value)}
              placeholder="Oqsaroy to‘yxonasi"
              maxLength={160}
              aria-invalid={!!errors.venueName}
              className={bareInput}
            />
          </IconInput>
        </FlowField>

        <FlowField label="Manzil" required error={errors.address} htmlFor="f-address">
          <input
            id="f-address"
            value={o.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Toshkent shahri"
            maxLength={200}
            aria-invalid={!!errors.address}
            className={flowInput}
          />
        </FlowField>

        <div className="flex flex-col gap-2 rounded-xl bg-bg-soft p-4">
          <p className="t-title text-ink">Xaritadagi havola</p>
          <p className="t-body-s text-ink-2">Mehmonlar manzilni oson topishi uchun xarita havolasini qo‘shing.</p>
          {showMap ? (
            <div className="flex flex-col gap-1.5">
              <span className="flex items-center gap-2">
                <input
                  value={o.mapUrl}
                  onChange={(e) => set("mapUrl", e.target.value, { mapUrl: e.target.value || null })}
                  placeholder="https://yandex.uz/maps/…"
                  inputMode="url"
                  autoFocus={!order.mapUrl}
                  aria-invalid={!!errors.mapUrl}
                  aria-label="Xarita havolasi"
                  className={`${flowInput} !h-12 !rounded-full`}
                />
                <button
                  type="button"
                  aria-label="Havolani olib tashlash"
                  onClick={() => {
                    set("mapUrl", "", { mapUrl: null });
                    setShowMap(false);
                  }}
                  className="text-ink-2 hover:text-ink"
                >
                  <CloseCircle size={22} />
                </button>
              </span>
              {errors.mapUrl && <span className="t-body-s text-danger">{errors.mapUrl}</span>}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowMap(true)}
              className="flex items-center gap-2 rounded-full border border-line bg-bg-base p-3 text-left t-nav text-ink hover:bg-white"
            >
              <Add size={18} /> Xarita havolasini qo‘shish
            </button>
          )}
        </div>

        {editing && (
          <div id="dastur" className="flex scroll-mt-28 flex-col gap-4">
            <SectionTitle>Marosim dasturi</SectionTitle>
            {program.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="time"
                  value={p.time}
                  aria-label="Vaqt"
                  onChange={(e) => setProgram(program.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))}
                  className={`${flowInput} !w-[110px] shrink-0`}
                />
                <input
                  value={p.title}
                  aria-label="Bosqich nomi"
                  maxLength={120}
                  onChange={(e) => setProgram(program.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                  className={flowInput}
                />
                <button type="button" aria-label="O‘chirish" onClick={() => setProgram(program.filter((_, j) => j !== i))} className="icon-btn shrink-0">
                  <Trash size={16} />
                </button>
              </div>
            ))}
            {program.length < 12 && (
              <button
                type="button"
                onClick={() => setProgram([...program, { time: "20:00", title: "Bazm" }])}
                className="flex w-fit items-center gap-2 rounded-full border border-line px-4 py-2.5 t-nav text-ink hover:bg-bg-soft"
              >
                <Add size={16} /> Bosqich qo‘shish
              </button>
            )}
          </div>
        )}

        <p className="t-body-s text-ink-2">* To‘ldirilishi shart bo‘lgan maydonlar</p>
      </div>

      <MobileBar>
        {button}
        <SaveIndicator state={state} error={saveError} compact />
      </MobileBar>
    </FlowColumns>
  );
}
