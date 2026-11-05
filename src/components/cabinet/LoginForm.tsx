"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Mobile } from "@/components/icons";
import { PhoneInput, api, phoneDigits, phoneToLocal } from "@/components/ui";
import { TelegramLogin } from "./TelegramLogin";

export function LoginForm({ next, initialPhone }: { next: string; initialPhone?: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState(phoneToLocal(initialPhone));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneDigits(phone).length !== 9) return setError("Telefon raqam to‘liq emas");
    setError(null);
    setBusy(true);
    try {
      const r = await api<{ phone: string; devCode?: string }>("/api/auth/otp", { method: "POST", json: { phone: `+998${phoneDigits(phone)}` } });
      const q = new URLSearchParams({ tel: r.phone, next });
      if (r.devCode) q.set("dev", r.devCode);
      router.push(`/kirish/kod?${q}`);
    } catch (err) {
      const m = (err as Error).message;
      // Yaqinda kod yuborilgan bo‘lsa — kod sahifasiga o‘tkazamiz
      if (/kuting/.test(m)) router.push(`/kirish/kod?${new URLSearchParams({ tel: `+998${phoneDigits(phone)}`, next, wait: "1" })}`);
      else setError(m);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="mx-auto flex w-full max-w-[420px] flex-col gap-[22px] py-6 lg:mx-0">
      <span className="flex size-[52px] items-center justify-center rounded-full bg-gold-soft text-maroon">
        <Mobile size={22} />
      </span>
      <div className="flex flex-col gap-2.5">
        <h1 className="font-serif text-[34px] font-light leading-[1.04] tracking-[-0.005em] text-ink lg:text-[44px]">Kabinetga kirish</h1>
        <p className="t-body-m text-ink-2">
          Buyurtmalaringiz, havolangiz va mehmonlar javobi shu yerda. Telefon raqamingizni kiriting — SMS kod yuboramiz.
        </p>
      </div>
      <label className="flex flex-col gap-2" htmlFor="login-phone">
        <span className="text-[13px] font-semibold leading-[1.35] text-ink">Telefon raqamingiz</span>
        <PhoneInput id="login-phone" value={phone} onChange={(v) => (setPhone(v), setError(null))} invalid={!!error} autoFocus />
        {error && <span className="t-body-s text-danger">{error}</span>}
      </label>
      <button type="submit" disabled={busy} className="btn btn-primary w-full">
        {busy ? "Yuborilmoqda…" : "Kod olish"} <ArrowRight size={16} />
      </button>
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="t-body-s text-ink-2">yoki</span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <TelegramLogin next={next} />
      <p className="t-body-s text-ink-2">
        Kirish orqali{" "}
        <Link href="/shartlar" className="underline hover:text-maroon">
          foydalanish shartlari
        </Link>{" "}
        va{" "}
        <Link href="/maxfiylik" className="underline hover:text-maroon">
          maxfiylik siyosatiga
        </Link>{" "}
        rozilik bildirasiz.
      </p>
    </form>
  );
}
