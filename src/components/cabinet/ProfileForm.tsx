"use client";

import { useMe } from "@/lib/client";
import { useState } from "react";
import { TickCircle } from "@/components/icons";
import { TelegramIcon } from "@/components/TelegramIcon";
import { Field, Input, Toggle, api, useToast } from "@/components/ui";
import { formatPhoneDisplay, initials } from "@/lib/display";
import { TelegramLogin } from "./TelegramLogin";
import { useLogout } from "./CabinetNav";

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
      toast("Saqlandi");
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
      toast("Saqlandi");
    } catch (err) {
      setN((s) => ({ ...s, [key]: !v }));
      toast((err as Error).message, "error");
    }
  };

  const okBadge = (t: string) => (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px]" style={{ color: "var(--color-success)", background: "var(--success-bg)" }}>
      <TickCircle size={13} /> {t}
    </span>
  );

  return (
    <>
      <form onSubmit={save} className={card}>
        <p className="text-[15px] font-semibold leading-[1.35] text-ink">Shaxsiy ma’lumotlar</p>
        <div className="flex items-center gap-4">
          <span className="flex size-16 items-center justify-center rounded-full bg-maroon font-serif text-[28px] font-medium text-ink-inverse">{initials(name || "S")}</span>
          <div className="flex flex-col gap-0.5">
            <span className="font-serif text-[24px] font-medium leading-[1.2] text-ink">{name || "Ismingizni kiriting"}</span>
            <span className="t-body-s text-ink-2">Mijoz: {user.since}dan</span>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Ism va familiya">
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Masalan, Jasur Toshmatov" maxLength={120} />
          </Field>
          <Field label="Telefon">
            <span className="flex h-12 items-center justify-between gap-2 rounded-input border border-line bg-bg-soft px-4 t-body-m text-ink">
              {user.phone ? formatPhoneDisplay(user.phone) : "—"}
              {user.phone && okBadge("Tasdiqlangan")}
            </span>
          </Field>
          <Field label="Telegram" className="md:col-span-2">
            {user.telegramId ? (
              <span className="flex h-12 items-center justify-between gap-2 rounded-input border border-line bg-bg-soft px-4 t-body-m text-ink">
                <span className="inline-flex items-center gap-2">
                  <TelegramIcon size={16} /> {user.telegramUser ?? "Telegram akkaunt"}
                </span>
                {okBadge("Ulangan")}
              </span>
            ) : (
              <div className="max-w-[360px]">
                <TelegramLogin label="Telegramni ulash" onDone={() => (toast("Telegram ulandi"), reload())} />
              </div>
            )}
          </Field>
        </div>
        <div>
          <button type="submit" disabled={saving || name === (user.name ?? "")} className="btn btn-primary">
            {saving ? "Saqlanmoqda…" : "Saqlash"}
          </button>
        </div>
      </form>

      <section className={card}>
        <p className="text-[15px] font-semibold leading-[1.35] text-ink">Bildirishnomalar</p>
        <div className="flex flex-col divide-y divide-line">
          {(
            [
              ["notifyRsvpTelegram", "Mehmon javob qoldirganda", "Telegram"],
              ["notifyRsvpSms", "Mehmon javob qoldirganda", "SMS"],
              ["notifyDayBefore", "To‘yga 1 kun qolganda eslatma", "Telegram"],
            ] as const
          ).map(([key, title, ch]) => (
            <div key={key} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
              <div className="flex flex-col">
                <span className="t-title text-ink">{title}</span>
                <span className="t-body-s text-ink-2">
                  {ch}
                  {ch === "Telegram" && !user.telegramId ? " · avval Telegramni ulang" : ""}
                </span>
              </div>
              <Toggle checked={n[key]} onChange={(v) => setNotify(key, v)} label={`${title} — ${ch}`} />
            </div>
          ))}
        </div>
      </section>

      <ProfileLogout onLogout={logout} />
    </>
  );
}

function ProfileLogout({ onLogout }: { onLogout: () => void }) {
  return (
    <div>
      <button type="button" onClick={onLogout} className="t-nav text-ink-2 hover:text-maroon">
        Akkauntdan chiqish
      </button>
    </div>
  );
}
