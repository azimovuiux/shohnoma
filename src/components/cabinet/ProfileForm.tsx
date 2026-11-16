"use client";

import { useMe } from "@/lib/client";
import { useState } from "react";
import { Card, LogoutCurve, TickCircle } from "@/components/icons";
import Link from "@/components/LocalLink";
import { TelegramIcon } from "@/components/TelegramIcon";
import { Field, Input, Toggle, api, useToast } from "@/components/ui";
import { formatPhoneDisplay } from "@/lib/display";
import { TelegramLogin } from "./TelegramLogin";
import { AccountAvatar, LogoutButton, accountTitle, useLogout } from "@/components/Account";
import { useT } from "@/lib/i18n";

type U = {
  name: string | null;
  phone: string | null;
  telegramUser: string | null;
  telegramId: string | null;
  since: string;
  notifyRsvpTelegram: boolean;
  notifyRsvpSms: boolean;
  notifyDayBefore: boolean;
};

const card = "flex flex-col gap-5 rounded-card border border-line bg-bg-base p-5 lg:p-6";

export function ProfileForm({ user }: { user: U }) {
  const t = useT();
  const toast = useToast();
  const { reload } = useMe();
  const logout = useLogout();
  const [name, setName] = useState(user.name ?? "");
  const [saving, setSaving] = useState(false);
  const [n, setN] = useState({ notifyRsvpTelegram: user.notifyRsvpTelegram, notifyRsvpSms: user.notifyRsvpSms, notifyDayBefore: user.notifyDayBefore });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/me", { method: "PATCH", json: { name } });
      toast(t("Saqlandi"));
      reload();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const setNotify = async (key: keyof typeof n, v: boolean) => {
    setN((s) => ({ ...s, [key]: v }));
    try {
      await api("/api/me", { method: "PATCH", json: { [key]: v } });
      toast(t("Saqlandi"));
    } catch (err) {
      setN((s) => ({ ...s, [key]: !v }));
      toast((err as Error).message, "error");
    }
  };

  const okBadge = (label: string) => (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px]" style={{ color: "var(--color-success)", background: "var(--success-bg)" }}>
      <TickCircle size={13} /> {label}
    </span>
  );

  return (
    <>
      <form onSubmit={save} className={card}>
        <p className="text-[15px] font-semibold leading-[1.35] text-ink">{t("Shaxsiy ma’lumotlar")}</p>
        <div className="flex items-center gap-4">
          <AccountAvatar name={name} size={64} serif />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate font-serif text-[24px] font-medium leading-[1.2] text-ink">
              {accountTitle({ name: name.trim() || null, phone: user.phone, telegramUser: user.telegramUser }, t)}
            </span>
            <span className="t-body-s text-ink-2">{t("Mijoz: {since}dan", { since: user.since })}</span>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("Ism va familiya")}>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder={t("Masalan, Jasur Toshmatov")} maxLength={120} />
          </Field>
          <Field label={t("Telefon")}>
            <span className="flex h-12 items-center justify-between gap-2 rounded-input border border-line bg-bg-soft px-4 t-body-m text-ink">
              {user.phone ? formatPhoneDisplay(user.phone) : "—"}
              {user.phone && okBadge(t("Tasdiqlangan"))}
            </span>
          </Field>
          <Field label="Telegram" className="md:col-span-2">
            {user.telegramId ? (
              <span className="flex h-12 items-center justify-between gap-2 rounded-input border border-line bg-bg-soft px-4 t-body-m text-ink">
                <span className="inline-flex items-center gap-2">
                  <TelegramIcon size={16} /> {user.telegramUser ?? t("Telegram akkaunt")}
                </span>
                {okBadge(t("Ulangan"))}
              </span>
            ) : (
              <div className="max-w-[360px]">
                <TelegramLogin label="Telegramni ulash" onDone={() => (toast(t("Telegram ulandi")), reload())} />
              </div>
            )}
          </Field>
        </div>
        {/* Holat aniq: o‘zgarish bo‘lmasa — «Saqlangan», bo‘lsa — Saqlash / Bekor qilish */}
        {name === (user.name ?? "") && !saving ? (
          <p className="inline-flex min-h-12 items-center gap-2 t-body-s text-ink-2">
            {user.name ? <TickCircle size={16} className="text-success" /> : null}
            {user.name ? t("Ma’lumotlar saqlangan") : t("Ism kiritilmagan — yuqoriga yozing")}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            <button type="submit" disabled={saving} className="btn btn-primary max-sm:flex-1">
              <TickCircle size={16} /> {saving ? t("Saqlanmoqda…") : t("Saqlash")}
            </button>
            <button type="button" disabled={saving} onClick={() => setName(user.name ?? "")} className="btn btn-secondary max-sm:flex-1">
              {t("Bekor qilish")}
            </button>
          </div>
        )}
      </form>

      <section className={card}>
        <p className="text-[15px] font-semibold leading-[1.35] text-ink">{t("Bildirishnomalar")}</p>
        <div className="flex flex-col divide-y divide-line">
          {(
            [
              ["notifyRsvpTelegram", "Mehmon javob qoldirganda", "Telegram"],
              ["notifyDayBefore", "To‘yga 1 kun qolganda eslatma", "Telegram"],
            ] as const
          ).map(([key, title, ch]) => (
            <div key={key} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
              <div className="flex flex-col">
                <span className="t-title text-ink">{t(title)}</span>
                <span className="t-body-s text-ink-2">
                  {ch}
                  {ch === "Telegram" && !user.telegramId ? t(" · avval Telegramni ulang") : ""}
                </span>
              </div>
              <Toggle checked={n[key]} onChange={(v) => setNotify(key, v)} label={`${t(title)} — ${ch}`} />
            </div>
          ))}
        </div>
      </section>

      <Link href="/kabinet/tolovlar/" className="flex min-h-[64px] items-center gap-3 rounded-card border border-line bg-bg-base p-5 transition-colors hover:bg-bg-soft lg:p-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-maroon">
          <Card size={18} />
        </span>
        <span className="flex-1 text-[15px] font-semibold leading-[1.35] text-ink">{t("To‘lovlar tarixi")}</span>
        <span className="t-nav text-maroon">{t("Ko‘rish")} →</span>
      </Link>

      {/* Chiqish — sahifa oxirida alohida, aniq tugma (tasdiqlash oynasi bilan) */}
      <section className={`${card} !gap-4`}>
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--decline-bg)] text-decline">
            <LogoutCurve size={18} />
          </span>
          <div className="flex flex-col gap-0.5">
            <p className="text-[15px] font-semibold leading-[1.35] text-ink">{t("Akkauntdan chiqish")}</p>
            <p className="t-body-s text-ink-2">{t("Bu qurilmada hisobdan chiqasiz. Buyurtmalar va taklifnomalar saqlanib qoladi.")}</p>
          </div>
        </div>
        <LogoutButton onClick={logout} label="Chiqish" className="w-full sm:w-auto sm:self-start" />
      </section>
    </>
  );
}
