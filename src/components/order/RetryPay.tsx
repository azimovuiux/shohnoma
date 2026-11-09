"use client";

import { useState } from "react";
import { useLocalRouter } from "@/lib/useLocalRouter";
import { useT } from "@/lib/i18n";
import { ArrowRight } from "@/components/icons";
import { PAY_URL_KEY, type Provider } from "./PayChoice";

/** 14 — "Qayta urinish": o‘sha usul bilan to‘lovni qayta boshlash */
export function RetryPay({ orderId, provider }: { orderId: string; provider: Provider }) {
  const router = useLocalRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retry = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || "To‘lovni boshlab bo‘lmadi");
      if (data.url.startsWith("/")) return router.push(data.url);
      sessionStorage.setItem(PAY_URL_KEY(orderId), data.url);
      router.push(`/buyurtma/${orderId}/tolov/jarayonda/?usul=${provider}&ochish=1`);
    } catch (e) {
      setError(t((e as Error).message));
      setBusy(false);
    }
  };
  return (
    <>
      <button type="button" onClick={retry} disabled={busy} className="btn btn-primary">
        {busy ? t("Kuting…") : t("Qayta urinish")} <ArrowRight size={16} />
      </button>
      {error && (
        <p role="alert" className="t-body-s text-danger sm:order-last sm:w-full">
          {error}
        </p>
      )}
    </>
  );
}
