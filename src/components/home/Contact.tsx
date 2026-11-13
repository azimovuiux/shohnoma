"use client";

import { useState } from "react";
import { ArrowDown2, ArrowRight, Call, Instagram, Send2, TickCircle, Whatsapp } from "@/components/icons";
import { TelegramIcon } from "@/components/TelegramIcon";
import { ceremonyLabel, type Ceremony } from "@/lib/templates";
import { site } from "@/lib/site";
import { useT } from "@/lib/i18n";

const channels = [
  { icon: <TelegramIcon size={20} />, name: "Telegram", action: "Yozish", href: site.telegram },
  { icon: <Whatsapp size={20} />, name: "WhatsApp", action: "Yozish", href: site.whatsapp },
  { icon: <Instagram size={20} />, name: "Instagram", action: "Sahifamiz", href: site.instagram },
  { icon: <Call size={20} />, name: "Qo‘ng‘iroq", action: "Qo‘ng‘iroq qilish", href: site.phoneHref },
];

type ReplyVia = "telegram" | "call" | "whatsapp";
const replyLabel: Record<ReplyVia, string> = { telegram: "Telegram", call: "Qo‘ng‘iroq", whatsapp: "WhatsApp" };

const inputCls =
  "w-full rounded-xl border border-line bg-bg-base px-4 py-3.5 t-body-m text-ink outline-none placeholder:text-ink-2 focus:border-maroon/55";

export function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 9);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return parts.join(" ");
}

export function Contact() {
  const t = useT();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [ceremony, setCeremony] = useState<Ceremony | "">("");
  const [message, setMessage] = useState("");
  const [replyVia, setReplyVia] = useState<ReplyVia>("telegram");
  const [hp, setHp] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!name.trim()) errs.name = t("Ismingizni kiriting");
    if (phone.replace(/\D/g, "").length !== 9) errs.phone = t("Telefon raqam to‘liq emas");
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setState("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone: `+998${phone.replace(/\D/g, "")}`, ceremony, message, replyVia, website: hp }),
      });
      setState(res.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  };

  return (
    <section id="aloqa" className="scroll-mt-20 bg-bg-base px-5 pb-20 pt-20 lg:px-10 xl:px-[120px] lg:pb-[130px] lg:pt-[120px]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-12 lg:flex-row lg:gap-16">
        <div data-reveal="stagger" className="flex flex-col gap-7 lg:w-[520px] lg:shrink-0">
          <h2 data-split className="flex flex-col font-serif font-light">
            <span className="-mb-1 text-[36px] leading-[1.04] text-ink lg:text-[52px]">{t("Savol yoki")}</span>
            <em className="text-[42px] italic leading-none text-maroon lg:text-[64px]">{t("fikringiz bormi?")}</em>
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4">
            {channels.map((c) => (
              <li key={c.name}>
                <a
                  href={c.href}
                  target={c.href.startsWith("http") || c.href.startsWith("/api/") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="flex h-full flex-col gap-4 rounded-[18px] border border-line p-4 transition-colors hover:bg-bg-soft sm:p-[22px]"
                >
                  <span className="flex size-11 items-center justify-center rounded-full bg-maroon text-ink-inverse">{c.icon}</span>
                  <span className="flex flex-col gap-1">
                    <span className="text-[15px] font-semibold leading-[1.35] text-ink">{t(c.name)}</span>
                    <span className="inline-flex items-center gap-1.5 t-body-s text-ink-2">
                      {t(c.action)} <ArrowRight size={13} />
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <form data-reveal="up" style={{ ["--d" as string]: "180ms" }} onSubmit={submit} noValidate className="flex flex-1 flex-col gap-5 rounded-[24px] bg-bg-soft p-6 sm:p-10">
          {state === "sent" ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
              <span className="flex size-16 items-center justify-center rounded-full" style={{ background: "var(--success-bg)", color: "var(--color-success)" }}>
                <TickCircle size={30} />
              </span>
              <p className="font-serif text-[28px] font-medium text-ink">{t("Rahmat, xabaringiz yetib keldi!")}</p>
              <p className="t-body-m max-w-[360px] text-ink-2">{t(`Tez orada ${replyLabel[replyVia].toLowerCase()} orqali bog‘lanamiz.`)}</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <p className="font-serif text-[28px] font-medium leading-[1.2] text-ink">{t("Xabar qoldiring")}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="t-body-s text-ink-2">{t("Ismingiz")}</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    placeholder={t("Masalan, Madina")}
                    aria-invalid={!!errors.name}
                    className={`${inputCls} ${errors.name ? "!border-danger" : ""}`}
                  />
                  {errors.name && <span className="t-body-s text-danger">{errors.name}</span>}
                </label>
                <label className="flex flex-col gap-2">
                  <span className="t-body-s text-ink-2">{t("Telefon raqam")}</span>
                  <span
                    className={`flex items-center gap-2.5 rounded-xl border bg-bg-base px-4 focus-within:border-maroon/55 ${
                      errors.phone ? "border-danger" : "border-line"
                    }`}
                  >
                    <span className="t-body-m text-ink">+998</span>
                    <span className="h-[18px] w-px bg-line" />
                    <input
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="90 123 45 67"
                      aria-invalid={!!errors.phone}
                      className="w-full bg-transparent py-3.5 t-body-m text-ink outline-none placeholder:text-ink-2"
                    />
                  </span>
                  {errors.phone && <span className="t-body-s text-danger">{errors.phone}</span>}
                </label>
              </div>
              <label className="flex flex-col gap-2">
                <span className="t-body-s text-ink-2">{t("Marosim turi")}</span>
                <span className="relative">
                  <select value={ceremony} onChange={(e) => setCeremony(e.target.value as Ceremony | "")} className={`${inputCls} appearance-none pr-10`}>
                    <option value="">{t("Tanlang")}</option>
                    {(Object.keys(ceremonyLabel) as Ceremony[]).map((c) => (
                      <option key={c} value={c}>
                        {t(ceremonyLabel[c])}
                      </option>
                    ))}
                  </select>
                  <ArrowDown2 size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-2" />
                </span>
              </label>
              <label className="flex flex-col gap-2">
                <span className="t-body-s text-ink-2">{t("Fikr yoki savolingiz")}</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder={t("Qanday taklifnoma xohlaysiz? Istaklaringizni yozing…")}
                  className={`${inputCls} h-28 resize-none`}
                />
              </label>
              {/* honeypot */}
              <input value={hp} onChange={(e) => setHp(e.target.value)} name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="w-full t-body-s text-ink-2 sm:w-auto">{t("Qanday javob beraylik?")}</span>
                {(Object.keys(replyLabel) as ReplyVia[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={replyVia === r}
                    onClick={() => setReplyVia(r)}
                    className={`rounded-full px-3.5 py-2 text-[12px] font-medium ${
                      replyVia === r ? "bg-maroon text-ink-inverse" : "border border-line bg-bg-base text-ink"
                    }`}
                  >
                    {t(replyLabel[r])}
                  </button>
                ))}
              </div>
              <button type="submit" disabled={state === "sending"} className="btn btn-primary w-full">
                {state === "sending" ? t("Yuborilmoqda…") : t("Yuborish")} <Send2 size={16} />
              </button>
              {state === "error" && (
                <p className="t-body-s text-danger">
                  {t("Xabar yuborilmadi. Iltimos, qayta urinib ko‘ring yoki Telegramda yozing.")}
                </p>
              )}
            </>
          )}
        </form>
      </div>
    </section>
  );
}
