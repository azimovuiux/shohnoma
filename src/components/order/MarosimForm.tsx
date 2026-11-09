"use client";

import { useMemo, useState } from "react";
import { useLocalRouter } from "@/lib/useLocalRouter";
import { useLocale, useT } from "@/lib/i18n";
import { Add, ArrowRight, CloseCircle, Location, Trash } from "@/components/icons";
import { ceremonyLabel, type Ceremony, type Template } from "@/lib/templates";
import { FlowField, IconInput, bareInput, flowInput, SectionTitle } from "./fields";
import { OrderSummary, MobileBar, MobileTemplateCard } from "./OrderSummary";
import { FlowColumns } from "./FlowTop";
import { useAutosave } from "./useAutosave";
import { liveTemplate, dayTime } from "./live";
import { namesOf, needsPersonB, personLabels } from "./labels";
import type { FlowOrder } from "./types";
import { SaveIndicator } from "./SaveIndicator";
import { DateField, SelectField, TimeField } from "./pickers";
import { ExtraFields, extraErrors, extraReady, type Extra } from "./ExtraFields";

const ceremonies = (Object.keys(ceremonyLabel) as Ceremony[]).filter((c) => c in ceremonyLabel);

/** Taklifnoma (mehmonlar ko‘radigan sayt) tili — extra.lang da saqlanadi */
type InviteLang = "uz" | "ru";
const inviteLangs: { value: InviteLang; label: string }[] = [
  { value: "uz", label: "O‘zbekcha" },
  { value: "ru", label: "Русский" },
];

type Errors = Partial<Record<"personA" | "personB" | "day" | "time" | "venueName" | "address" | "mapUrl", string>>;

export function MarosimForm({ order, template, editing }: { order: FlowOrder; template: Template; editing: boolean }) {
  const router = useLocalRouter();
  const t = useT();
  const locale = useLocale();
  // Til tanlanmagan bo‘lsa: yangi buyurtmada — sayt tili; mavjud taklifnomani tahrirlashda — o‘zbekcha (hozirgi ko‘rinishi)
  const langMissing = order.extra?.lang !== "uz" && order.extra?.lang !== "ru";
  const [o, setO] = useState<FlowOrder>(() =>
    langMissing ? { ...order, extra: { ...(order.extra ?? {}), lang: editing ? "uz" : locale } } : order,
  );
  const [errors, setErrors] = useState<Errors>({});
  const [extraErr, setExtraErr] = useState<Record<string, string>>({});
  const fields = template.fields ?? [];
  const hasOwnProgram = fields.some((f) => f.key === "program");
  const setExtra = (v: Extra) => {
    setO((p) => ({ ...p, extra: v }));
    setExtraErr({});
    if (extraReady(fields, v)) queue({ extra: v });
  };
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
    if (!o.personA.trim()) e.personA = t("Ismni kiriting");
    if (needsPersonB(o.ceremony) && !o.personB.trim()) e.personB = t("Ismni kiriting");
    if (!o.day) e.day = t("Sanani kiriting");
    if (!o.time) e.time = t("Vaqtni kiriting");
    if (!o.venueName.trim()) e.venueName = t("Marosim joyini kiriting");
    if (!o.address.trim()) e.address = t("Manzilni kiriting");
    if (o.mapUrl && !/^https?:\/\//.test(o.mapUrl)) e.mapUrl = t("Havola https:// bilan boshlansin");
    setErrors(e);
    const xe = extraErrors(fields, o.extra as Extra, t);
    setExtraErr(xe);
    return Object.keys(e).length === 0 && Object.keys(xe).length === 0;
  };

  const next = async () => {
    if (!validate()) {
      document.querySelector("[aria-invalid=true]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    // standart til hali saqlanmagan bo‘lsa — hozir saqlaymiz
    if (langMissing) queue({ extra: o.extra });
    setBusy(true);
    const ok = await flush();
    setBusy(false);
    if (!ok) return;
    router.push(editing ? `/kabinet/t/${order.invitationId}/` : `/buyurtma/${order.id}/tafsilotlar/`);
    router.refresh();
  };

  const program = o.program;
  const setProgram = (p: FlowOrder["program"]) => {
    setO((x) => ({ ...x, program: p }));
    if (p.every((i) => /^\d{2}:\d{2}$/.test(i.time) && i.title.trim())) queue({ program: p });
  };

  const actionLabel = editing ? t("Saqlash") : t("Davom etish");
  const lang: InviteLang = o.extra?.lang === "ru" ? "ru" : "uz";
  const setLang = (v: InviteLang) => {
    const x = { ...(o.extra as Extra), lang: v };
    setO((p) => ({ ...p, extra: x }));
    if (extraReady(fields, x)) queue({ extra: x });
  };
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
          order={o}
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
        <MobileTemplateCard template={template} live={live} order={o} />

        <FlowField label={t("Marosim turi")} required htmlFor="f-ceremony">
          <SelectField
            id="f-ceremony"
            label={t("Marosim turi")}
            value={o.ceremony}
            onChange={(v) => set("ceremony", v)}
            options={ceremonies.map((c) => ({ value: c, label: t(ceremonyLabel[c]) }))}
          />
        </FlowField>

        <FlowField label={t("Taklifnoma tili")} htmlFor="f-lang">
          <SelectField id="f-lang" label={t("Taklifnoma tili")} value={lang} onChange={setLang} options={inviteLangs} />
        </FlowField>

        <div className="grid grid-cols-2 gap-3">
          <FlowField label={t(labels.a)} required error={errors.personA} htmlFor="f-a" className={labels.b ? "" : "col-span-2"}>
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
            <FlowField label={t(labels.b)} required={!labels.bOptional} error={errors.personB} htmlFor="f-b">
              <input
                id="f-b"
                value={o.personB}
                onChange={(e) => set("personB", e.target.value)}
                placeholder={o.ceremony === "sunnat" ? t("Jamshid va Nodira") : "Madina"}
                autoComplete="off"
                maxLength={80}
                aria-invalid={!!errors.personB}
                className={flowInput}
              />
            </FlowField>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FlowField label={t("Sana")} required error={errors.day} htmlFor="f-day">
            <DateField
              id="f-day"
              value={o.day}
              min={new Date().toISOString().slice(0, 10)}
              invalid={!!errors.day}
              label={t("Sana")}
              locale={locale}
              onChange={(v) => set("day", v, { day: v, time: o.time || "18:00" })}
            />
          </FlowField>
          <FlowField label={t("Boshlanishi")} required error={errors.time} htmlFor="f-time">
            <TimeField
              id="f-time"
              value={o.time}
              invalid={!!errors.time}
              label={t("Boshlanish vaqti")}
              onChange={(v) => set("time", v, o.day ? { day: o.day, time: v } : { time: v })}
            />
          </FlowField>
        </div>

        <FlowField label={t("Marosim joyi")} required error={errors.venueName} htmlFor="f-venue">
          <IconInput icon={<Location size={18} />} invalid={!!errors.venueName}>
            <input
              id="f-venue"
              value={o.venueName}
              onChange={(e) => set("venueName", e.target.value)}
              placeholder={t("Oqsaroy to‘yxonasi")}
              maxLength={160}
              aria-invalid={!!errors.venueName}
              className={bareInput}
            />
          </IconInput>
        </FlowField>

        <FlowField label={t("Manzil")} required error={errors.address} htmlFor="f-address">
          <input
            id="f-address"
            value={o.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder={t("Toshkent shahri")}
            maxLength={200}
            aria-invalid={!!errors.address}
            className={flowInput}
          />
        </FlowField>

        <div className="flex flex-col gap-2 rounded-xl bg-bg-soft p-4">
          <p className="t-title text-ink">{t("Xaritadagi havola")}</p>
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
                  aria-label={t("Xarita havolasi")}
                  className={`${flowInput} !h-12 !rounded-full`}
                />
                <button
                  type="button"
                  aria-label={t("Havolani olib tashlash")}
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
              <Add size={18} /> {t("Xarita havolasini qo‘shish")}
            </button>
          )}
        </div>

        {fields.length > 0 && <ExtraFields fields={fields} value={o.extra as Extra} onChange={setExtra} errors={extraErr} />}

        {editing && !hasOwnProgram && (
          <div id="dastur" className="flex scroll-mt-28 flex-col gap-4">
            <SectionTitle>{t("Marosim dasturi")}</SectionTitle>
            {program.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <TimeField compact value={p.time} onChange={(v) => setProgram(program.map((x, j) => (j === i ? { ...x, time: v } : x)))} />
                <input
                  value={p.title}
                  aria-label={t("Bosqich nomi")}
                  maxLength={120}
                  onChange={(e) => setProgram(program.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                  className={flowInput}
                />
                <button type="button" aria-label={t("O‘chirish")} onClick={() => setProgram(program.filter((_, j) => j !== i))} className="icon-btn shrink-0">
                  <Trash size={16} />
                </button>
              </div>
            ))}
            {program.length < 12 && (
              <button
                type="button"
                onClick={() => setProgram([...program, { time: "20:00", title: t("Bazm") }])}
                className="flex w-fit items-center gap-2 rounded-full border border-line px-4 py-2.5 t-nav text-ink hover:bg-bg-soft"
              >
                <Add size={16} /> {t("Bosqich qo‘shish")}
              </button>
            )}
          </div>
        )}
      </div>

      <MobileBar>
        {button}
        <SaveIndicator state={state} error={saveError} compact />
      </MobileBar>
    </FlowColumns>
  );
}
