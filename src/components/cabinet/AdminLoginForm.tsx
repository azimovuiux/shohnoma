"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight } from "@/components/icons";
import { Star8 } from "@/components/Ornament";
import { Field, Input, api } from "@/components/ui";
import { PageLoading, useMe } from "@/lib/client";
import { safeNext } from "./LoginForm";

export function AdminLoginForm() {
  const sp = useSearchParams();
  const next = safeNext(sp.get("next") ?? "/admin/");
  const { me, loading } = useMe();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && me?.user?.isAdmin) window.location.replace(next);
  }, [loading, me, next]);
  if (loading || me?.user?.isAdmin) return <PageLoading className="flex-1" />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login.trim() || !password) return setError("Login va parolni kiriting");
    setError(null);
    setBusy(true);
    try {
      await api("/api/auth/password", { method: "POST", json: { login, password } });
      window.location.replace(next);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex w-full max-w-[400px] flex-col gap-6 rounded-card border border-line bg-bg-base p-8 shadow-soft">
      <div className="flex flex-col items-center gap-3 text-center">
        <Star8 size={22} />
        <h1 className="font-serif text-[34px] font-light leading-none text-ink">
          Admin <em className="italic text-maroon">kirish</em>
        </h1>
        <p className="t-body-s text-ink-2">Boshqaruv paneli uchun login va parol</p>
      </div>
      <Field label="Login">
        <Input value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" autoCapitalize="none" autoFocus />
      </Field>
      <Field label="Parol" error={error}>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" aria-invalid={!!error} />
      </Field>
      <button type="submit" disabled={busy} className="btn btn-primary w-full">
        {busy ? "Tekshirilmoqda…" : "Kirish"} <ArrowRight size={16} />
      </button>
    </form>
  );
}
