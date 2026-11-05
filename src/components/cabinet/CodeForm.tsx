"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PageLoading, useMe } from "@/lib/client";
import { safeNext } from "./LoginForm";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Sms } from "@/components/icons";
import { api, useToast } from "@/components/ui";
import { formatPhoneDisplay } from "@/lib/display";

const LEN = 6;

function normalizePhone(raw: string | null) {
  const d = (raw ?? "").replace(/\D/g, "");
  const n = d.length === 9 ? `998${d}` : d;
  return /^998\d{9}$/.test(n) ? `+${n}` : null;
}

/** /kirish/kod/ sahifasi */
export function CodePageClient() {
  const sp = useSearchParams();
  const next = safeNext(sp.get("next"));
  const phone = normalizePhone(sp.get("tel"));
  const { me, loading } = useMe();
  useEffect(() => {
    if (loading) return;
    if (me?.user) window.location.replace(next);
    else if (!phone) window.location.replace(`/kirish/?next=${encodeURIComponent(next)}`);
  }, [loading, me, next, phone]);
  if (loading || me?.user || !phone) return <PageLoading className="flex-1" />;
  return <CodeForm phone={phone} next={next} devCode={sp.get("dev") ?? undefined} waitFirst={sp.get("wait") === "1"} />;
}

export function CodeForm({ phone, next, devCode, waitFirst }: { phone: string; next: string; devCode?: string; waitFirst?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(waitFirst ? 60 : 45);
  const [hint, setHint] = useState(devCode);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const verify = async (code: string) => {
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/verify", { method: "POST", json: { phone, code } });
      // To‘liq yuklash — header va kabinet yangi sessiya bilan ochiladi
      window.location.replace(next);
    } catch (e) {
      setError((e as Error).message);
      setDigits(Array(LEN).fill(""));
      refs.current[0]?.focus();
      setBusy(false);
    }
  };

  const setAt = (i: number, raw: string) => {
    const v = raw.replace(/\D/g, "");
    if (v.length > 1) return fill(v, i);
    const d = [...digits];
    d[i] = v;
    setDigits(d);
    setError(null);
    if (v && i < LEN - 1) refs.current[i + 1]?.focus();
    if (d.every(Boolean)) verify(d.join(""));
  };

  const fill = (v: string, from = 0) => {
    const d = [...digits];
    for (let k = 0; k < v.length && from + k < LEN; k++) d[from + k] = v[k];
    setDigits(d);
    const last = Math.min(LEN - 1, from + v.length);
    refs.current[last]?.focus();
    if (d.every(Boolean)) verify(d.join(""));
  };

  const resend = async () => {
    try {
      const r = await api<{ devCode?: string }>("/api/auth/otp", { method: "POST", json: { phone } });
      setHint(r.devCode);
      setLeft(60);
      toast("Kod qayta yuborildi");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  return (
    <form
      className="flex w-full max-w-[420px] flex-col gap-[22px]"
      onSubmit={(e) => {
        e.preventDefault();
        if (digits.every(Boolean)) verify(digits.join(""));
        else setError("Kodni to‘liq kiriting");
      }}
    >
      <span className="flex size-[52px] items-center justify-center rounded-full bg-gold-soft text-maroon">
        <Sms size={22} />
      </span>
      <div className="flex flex-col gap-2.5">
        <h1 className="font-serif text-[34px] font-light leading-[1.04] tracking-[-0.005em] text-ink lg:text-[44px]">Kodni kiriting</h1>
        <p className="t-body-m text-ink-2">
          <span className="font-medium text-ink">{formatPhoneDisplay(phone)}</span> raqamiga 6 xonali kod yubordik.
        </p>
      </div>

      {hint && (
        <p className="rounded-xl px-3.5 py-2.5 t-body-s" style={{ background: "var(--pending-bg)", color: "var(--color-pending)" }}>
          Sinov rejimi: SMS yuborilmadi. Kod — <b>{hint}</b>
        </p>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex justify-between gap-2" role="group" aria-label="SMS kod">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={d}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={i === 0 ? LEN : 1}
              aria-label={`${i + 1}-raqam`}
              aria-invalid={!!error}
              disabled={busy}
              onChange={(e) => setAt(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
                if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
                if (e.key === "ArrowRight" && i < LEN - 1) refs.current[i + 1]?.focus();
              }}
              onPaste={(e) => {
                e.preventDefault();
                fill(e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LEN), 0);
              }}
              className={`h-14 w-full min-w-0 rounded-input border bg-bg-base text-center font-serif text-[26px] font-medium text-ink outline-none transition-colors focus:border-maroon ${
                error ? "border-danger" : d ? "border-maroon/55" : "border-line"
              }`}
            />
          ))}
        </div>
        {error && <span className="t-body-s text-danger">{error}</span>}
      </div>

      <div className="flex items-center justify-between t-body-s">
        {left > 0 ? (
          <span className="text-ink-2">
            Qayta yuborish {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
          </span>
        ) : (
          <button type="button" onClick={resend} className="t-nav text-maroon hover:underline">
            Kodni qayta yuborish
          </button>
        )}
        <button
          type="button"
          onClick={() => router.push(`/kirish/?${new URLSearchParams({ tel: phone, next })}`)}
          className="inline-flex items-center gap-1.5 t-nav text-ink-2 hover:text-maroon"
        >
          <ArrowLeft size={14} /> Raqamni o‘zgartirish
        </button>
      </div>

      <button type="submit" disabled={busy} className="btn btn-primary w-full">
        {busy ? "Tekshirilmoqda…" : "Tasdiqlash"} <ArrowRight size={16} />
      </button>
    </form>
  );
}
