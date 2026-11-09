"use client";

import { DateField } from "@/components/order/pickers";

import Link from "@/components/LocalLink";
import { currentLocale, useT } from "@/lib/i18n";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Add,
  ArrowLeft,
  Brush,
  Call,
  CloseCircle,
  DocumentText,
  Gallery,
  Home2,
  Messages,
  Send2,
  TickCircle,
} from "@/components/icons";
import { TelegramIcon } from "@/components/TelegramIcon";
import { Field, Input, PhoneInput, Textarea, phoneDigits } from "@/components/ui";
import { star8Path } from "@/lib/ornament";
import { site } from "@/lib/site";

type Ceremony = "nikoh" | "fotiha" | "sunnat" | "tugilgan-kun" | "boshqa";
type ContactVia = "telegram" | "call" | "sms";

const ceremonies: { value: Ceremony; label: string }[] = [
  { value: "nikoh", label: "Nikoh to‘yi" },
  { value: "fotiha", label: "Fotiha" },
  { value: "sunnat", label: "Sunnat to‘yi" },
  { value: "tugilgan-kun", label: "Tug‘ilgan kun" },
  { value: "boshqa", label: "Boshqa" },
];

const styles = [
  { value: "klassik-bordo", label: "Klassik bordo" },
  { value: "yashil-muhr", label: "Yashil muhr" },
  { value: "moviy-osmon", label: "Moviy osmon" },
  { value: "gulli-bahor", label: "Gulli bahor" },
];

const colors = [
  { value: "#6B2436", label: "Bordo" },
  { value: "#2F4A3A", label: "To‘q yashil" },
  { value: "#2E4766", label: "To‘q ko‘k" },
  { value: "#C9A25E", label: "Oltin" },
  { value: "#E8D9C4", label: "Krem" },
  { value: "#F2C9C2", label: "Pushti" },
];

const budgets = ["300–500 ming", "500 ming – 1 mln", "1 mln dan yuqori", "Maslahat kerak"];

const contactOptions: { value: ContactVia; label: string }[] = [
  { value: "telegram", label: "Telegram" },
  { value: "call", label: "Qo‘ng‘iroq" },
];

const MAX_FILES = 10;

function Chip({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 t-nav transition-colors ${
        active ? "bg-maroon text-ink-inverse" : "border border-line bg-bg-base text-ink hover:bg-bg-soft"
      }`}
    >
      {children}
    </button>
  );
}

function Section({ title, hint, error, children, id }: { title: string; hint?: string; error?: string; children: ReactNode; id?: string }) {
  const t = useT();
  return (
    <section id={id} className="flex scroll-mt-28 flex-col gap-3.5">
      <h2 className="text-[15px] font-semibold leading-[1.35] text-ink">{t(title)}</h2>
      {hint && <p className="t-body-s text-ink-2">{t(hint)}</p>}
      {children}
      {error && <p className="t-body-s text-danger">{error}</p>}
    </section>
  );
}

/** Uslub kartasi — namuna rasmi (public/images/brief/<value>.webp) */
function StyleCard({ label, value, active, onClick }: { label: string; value: string; active: boolean; onClick: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex flex-col gap-2 rounded-2xl p-2 pb-2.5 text-left transition-colors ${
        active ? "border-[1.5px] border-maroon/60 bg-maroon/[0.06]" : "border border-line bg-bg-base hover:bg-bg-soft"
      }`}
    >
      <span className="relative block aspect-[156/164] w-full overflow-hidden rounded-[10px] bg-bg-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/images/brief/${value}.webp`} alt="" className="absolute inset-0 size-full object-cover" />
      </span>
      <span className="flex items-center justify-between px-0.5">
        <span className="text-[12px] font-semibold leading-[1.35] text-ink">{t(label)}</span>
        {active && <TickCircle size={16} color="var(--color-maroon)" />}
      </span>
    </button>
  );
}

function HowItWorksPanel({ sending, onSubmit }: { sending: boolean; onSubmit?: () => void }) {
  const t = useT();
  const steps = [
    { icon: <DocumentText size={16} />, title: "Brif yuborasiz", text: "2–3 daqiqa" },
    { icon: <Messages size={16} />, title: "Dizayner bog‘lanadi", text: "24 soat ichida" },
    { icon: <Brush size={16} />, title: "Eskizni ko‘rasiz", text: "2–3 kun, 2 marta tuzatish" },
    { icon: <TickCircle size={16} />, title: "Sayt tayyor", text: "Havola va QR kod" },
  ];
  return (
    <div className="flex flex-col gap-5 rounded-[24px] bg-bg-soft p-6">
      <div className="flex flex-col gap-4">
        <p className="font-serif text-[22px] font-medium leading-[1.2] text-ink">{t("Qanday ishlaydi")}</p>
        <ol className="flex flex-col gap-4">
          {steps.map((s) => (
            <li key={s.title} className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg-base text-maroon">{s.icon}</span>
              <span className="flex flex-col gap-0.5">
                <span className="text-[13px] font-semibold leading-[1.35] text-ink">{t(s.title)}</span>
                <span className="text-[11px] leading-[1.5] text-ink-2">{t(s.text)}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="flex items-center justify-between border-t border-line pt-3.5">
          <span className="text-[13px] leading-[1.6] text-ink-2">{t("Maxsus dizayn")}</span>
          <span className="font-serif text-[22px] font-medium leading-[1.2] text-maroon">{t("490 000 so‘mdan")}</span>
        </div>
      </div>
      {onSubmit && (
        <button type="button" onClick={onSubmit} disabled={sending} className="btn btn-primary w-full !py-[13px]">
          <Send2 size={16} /> {sending ? t("Yuborilmoqda…") : t("Brifni yuborish")}
        </button>
      )}
      <div className="flex gap-2">
        <a href={site.telegram} target="_blank" rel="noopener noreferrer" className="btn btn-secondary flex-1 !px-3 !py-[13px]">
          <TelegramIcon size={16} /> Telegram
        </a>
        <a href={site.phoneHref} className="btn btn-secondary flex-1 !px-3 !py-[13px]">
          <Call size={16} /> {t("Qo‘ng‘iroq")}
        </a>
      </div>
      <p className="t-body-s text-ink-2">{t("Brif bepul.")}</p>
    </div>
  );
}

function Success({ name, via }: { name: string; via: ContactVia }) {
  const t = useT();
  const viaText = { telegram: "Telegram orqali yozamiz", call: "qo‘ng‘iroq qilamiz", sms: "SMS yuboramiz" }[via];
  return (
    <div className="mx-auto flex max-w-[560px] flex-col items-center px-5 py-16 text-center lg:py-24">
      <div className="relative flex size-[140px] items-center justify-center">
        <svg viewBox="0 0 140 140" className="absolute inset-0 size-full" aria-hidden>
          <path d={star8Path(70, 70, 68)} fill="none" stroke="var(--color-gold)" strokeOpacity="0.45" />
          <path d={star8Path(70, 70, 58)} fill="none" stroke="var(--color-gold)" strokeOpacity="0.25" />
        </svg>
        <span className="flex size-[72px] items-center justify-center rounded-full bg-success text-white">
          <TickCircle size={34} />
        </span>
      </div>
      <h1 className="mt-8 font-serif text-[38px] font-light leading-[1.05] text-ink lg:text-[52px]">
        {t("Brifingiz")} <em className="italic text-maroon">{t("qabul qilindi")}</em>
      </h1>
      <p className="t-body-l mt-4 text-ink-2">
        {t("Rahmat")}
        {name ? `, ${name}` : ""}! {t("24 soat ichida {via}.", { via: t(viaText) })}
      </p>
      <div className="mt-8 flex w-full flex-col gap-2.5 sm:flex-row">
        <a href={site.telegram} target="_blank" rel="noopener noreferrer" className="btn btn-primary flex-1">
          <TelegramIcon size={16} /> {t("Telegramda yozish")}
        </a>
        <Link href="/" className="btn btn-secondary flex-1">
          <Home2 size={16} /> {t("Bosh sahifa")}
        </Link>
      </div>
    </div>
  );
}

function Thumb({ file }: { file: File }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt={file.name} className="size-full object-cover" /> : null;
}

type Errors = Partial<Record<"ceremony" | "budget" | "name" | "phone" | "files" | "form", string>>;

export function BriefForm() {
  const t = useT();
  const [ceremony, setCeremony] = useState<Ceremony | "">("");
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState("");
  const [chosenStyles, setChosenStyles] = useState<string[]>([]);
  const [chosenColors, setChosenColors] = useState<string[]>([]);
  const [customColor, setCustomColor] = useState<string | null>(null);
  const [ideas, setIdeas] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [budget, setBudget] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [via, setVia] = useState<ContactVia>("telegram");
  const [hp, setHp] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const colorInput = useRef<HTMLInputElement>(null);

  const toggle = (list: string[], v: string, set: (l: string[]) => void) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const ok: File[] = [];
    let err = "";
    for (const f of Array.from(list)) {
      if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(f.type)) err = t("Faqat rasm (JPG, PNG, WEBP) yuklang");
      else if (f.size > 8 * 1024 * 1024) err = t("Har bir rasm 8 MB dan oshmasin");
      else ok.push(f);
    }
    const next = [...files, ...ok].slice(0, MAX_FILES);
    if (files.length + ok.length > MAX_FILES) err = t("Ko‘pi bilan {n} ta rasm", { n: MAX_FILES });
    setFiles(next);
    setErrors((e) => ({ ...e, files: err || undefined }));
  };

  const submit = async () => {
    const e: Errors = {};
    if (!ceremony) e.ceremony = t("Marosim turini tanlang");
    if (!budget) e.budget = t("Taxminiy byudjetni tanlang");
    if (!name.trim()) e.name = t("Ismingizni kiriting");
    if (phoneDigits(phone).length !== 9) e.phone = t("Telefon raqam to‘liq emas");
    setErrors(e);
    if (Object.keys(e).length) {
      const first = e.ceremony ? "brif-01" : e.budget ? "brif-05" : "brif-06";
      document.getElementById(first)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setSending(true);
    try {
      const fd = new FormData();
      fd.set(
        "data",
        JSON.stringify({
          ceremony,
          date: date || "",
          guestCount: guests ? Number(guests.replace(/\D/g, "")) || undefined : undefined,
          styles: chosenStyles,
          colors: [...chosenColors, ...(customColor ? [customColor] : [])],
          ideas: ideas.trim() || undefined,
          budget,
          name: name.trim(),
          phone: `+998${phoneDigits(phone)}`,
          contactVia: via,
        }),
      );
      if (hp) fd.set("website", hp);
      files.forEach((f) => fd.append("files[]", f));
      const res = await fetch("/api/briefs", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) throw new Error(t(data.error || "Brif yuborilmadi. Qayta urinib ko‘ring."));
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setErrors({ form: (err as Error).message });
    } finally {
      setSending(false);
    }
  };

  if (done) return <Success name={name.trim()} via={via} />;

  return (
    <div className="mx-auto max-w-[1440px] px-5 lg:px-10 xl:px-[120px]">
      <div className="flex flex-col gap-7 pb-2 pt-8 lg:pt-9">
        <Link href="/" className="inline-flex w-fit items-center gap-2 t-nav text-ink-2 hover:text-maroon">
          <ArrowLeft size={16} /> {t("Bosh sahifa")}
        </Link>
        <div className="flex flex-col gap-2.5">
          <h1 className="font-serif text-[34px] font-light leading-[1.04] tracking-[-0.005em] text-ink lg:text-[52px]">{t("O‘zingizga xos taklifnoma")}</h1>
        </div>
      </div>

      <div className="flex flex-col gap-12 pb-24 pt-8 lg:flex-row lg:items-start lg:gap-10 xl:gap-[72px]">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex min-w-0 flex-col gap-10 lg:flex-1 xl:w-[720px] xl:flex-none"
        >
          <Section id="brif-01" title="Qaysi marosim?" error={errors.ceremony}>
            <div className="flex flex-wrap gap-2">
              {ceremonies.map((c) => (
                <Chip key={c.value} active={ceremony === c.value} onClick={() => setCeremony(c.value)}>
                  {t(c.label)}
                </Chip>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("Sana")}>
                <DateField value={date} onChange={setDate} min={new Date().toISOString().slice(0, 10)} locale={currentLocale()} />
              </Field>
              <Field label={t("Taxminiy mehmonlar soni")}>
                <Input inputMode="numeric" placeholder={t("300 kishi")} value={guests} onChange={(e) => setGuests(e.target.value.replace(/[^\d]/g, "").slice(0, 4))} />
              </Field>
            </div>
          </Section>

          <Section title="Qaysi uslub yoqadi?" hint="Bir nechtasini tanlash mumkin">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {styles.map((s) => (
                <StyleCard
                  key={s.value}
                  label={s.label}
                  value={s.value}
                  active={chosenStyles.includes(s.label)}
                  onClick={() => toggle(chosenStyles, s.label, setChosenStyles)}
                />
              ))}
            </div>
          </Section>

          <Section title="Ranglar">
            <div className="flex flex-wrap items-center gap-2.5">
              {colors.map((c) => {
                const active = chosenColors.includes(c.value);
                return (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={active}
                    aria-label={t(c.label)}
                    title={t(c.label)}
                    onClick={() => toggle(chosenColors, c.value, setChosenColors)}
                    className={`flex size-[38px] items-center justify-center rounded-full transition-shadow ${active ? "ring-[1.5px] ring-maroon ring-offset-2 ring-offset-bg-base" : ""}`}
                  >
                    <span className="size-[30px] rounded-full border border-black/5" style={{ background: c.value }} />
                  </button>
                );
              })}
              {customColor ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line py-1.5 pl-1.5 pr-2.5 text-[12px] font-medium text-ink">
                  <span className="size-6 rounded-full border border-black/5" style={{ background: customColor }} />
                  {customColor.toUpperCase()}
                  <button type="button" onClick={() => setCustomColor(null)} aria-label={t("O‘chirish")} className="text-ink-2 hover:text-ink">
                    <CloseCircle size={14} />
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => colorInput.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-[9px] text-[12px] font-medium text-ink hover:bg-bg-soft"
                >
                  <Add size={14} /> {t("Boshqa")}
                </button>
              )}
              <input ref={colorInput} type="color" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => setCustomColor(e.target.value)} />
            </div>
          </Section>

          <Section title="G‘oyalaringiz" error={errors.files}>
            <Textarea
              value={ideas}
              onChange={(e) => setIdeas(e.target.value)}
              maxLength={3000}
              placeholder={t("Masalan: oq-oltin ranglar, bog‘da o‘tadigan kechki to‘y, musiqa — «Yor-yor»…")}
              className="!min-h-[104px]"
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={files.length >= MAX_FILES}
              className="flex w-full items-center gap-3.5 rounded-2xl border-[1.2px] border-dashed border-gold/55 bg-bg-soft p-[18px] text-left transition-colors hover:bg-[#f2ece2] disabled:opacity-60"
            >
              <span className="flex size-[42px] shrink-0 items-center justify-center rounded-full bg-bg-base text-maroon">
                <Gallery size={18} />
              </span>
              <span className="flex flex-col gap-[3px]">
                <span className="text-[13px] font-semibold leading-[1.35] text-ink">{t("Yoqqan rasm yoki taklifnomalarni yuklang")}</span>
                <span className="t-body-s text-ink-2">
                  {t("10 tagacha rasm")}
                  {files.length ? ` · ${t("{n} ta tanlandi", { n: files.length })}` : ""}
                </span>
              </span>
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {files.length > 0 && (
              <ul className="flex flex-wrap gap-2.5">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="relative size-[72px] overflow-hidden rounded-xl border border-line bg-bg-soft">
                    <Thumb file={f} />
                    <button
                      type="button"
                      onClick={() => setFiles(files.filter((_, j) => j !== i))}
                      aria-label={t("Rasmni olib tashlash")}
                      className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-bg-base/90 text-ink"
                    >
                      <CloseCircle size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section id="brif-05" title="Taxminiy byudjet" error={errors.budget}>
            <div className="flex flex-wrap gap-2">
              {budgets.map((b) => (
                <Chip key={b} active={budget === b} onClick={() => setBudget(b)}>
                  {t(b)}
                </Chip>
              ))}
            </div>
          </Section>

          <Section id="brif-06" title="Siz bilan qanday bog‘lanamiz?">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("Ismingiz")} error={errors.name}>
                <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder={t("Madina")} aria-invalid={!!errors.name} maxLength={120} />
              </Field>
              <Field label={t("Telefon")} error={errors.phone}>
                <PhoneInput value={phone} onChange={setPhone} invalid={!!errors.phone} />
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              {contactOptions.map((c) => (
                <Chip key={c.value} active={via === c.value} onClick={() => setVia(c.value)}>
                  {t(c.label)}
                </Chip>
              ))}
            </div>
          </Section>

          {/* honeypot */}
          <input value={hp} onChange={(e) => setHp(e.target.value)} name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

          {errors.form && (
            <p role="alert" className="rounded-xl px-4 py-3 t-body-m text-danger" style={{ background: "var(--danger-bg)" }}>
              {errors.form}
            </p>
          )}

          {/* Mobil: yuborish tugmasi forma ostida */}
          <div className="flex flex-col gap-3 lg:hidden">
            <button type="submit" disabled={sending} className="btn btn-primary w-full">
              <Send2 size={16} /> {sending ? t("Yuborilmoqda…") : t("Brifni yuborish")}
            </button>
          </div>
        </form>

        <aside className="lg:sticky lg:top-[110px] lg:w-[300px] lg:shrink-0 xl:w-auto xl:flex-1">
          <div className="hidden lg:block">
            <HowItWorksPanel sending={sending} onSubmit={submit} />
          </div>
          <div className="lg:hidden">
            <HowItWorksPanel sending={sending} />
          </div>
        </aside>
      </div>
    </div>
  );
}

