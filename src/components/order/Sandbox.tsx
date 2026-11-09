"use client";

import { useState } from "react";
import { useLocalRouter } from "@/lib/useLocalRouter";
import { useT } from "@/lib/i18n";
import { CloseCircle, TickCircle } from "@/components/icons";

/** Faqat PAYMENTS_SANDBOX=1: haqiqiy provayder o‘rniga test to‘lov */
export function Sandbox({ orderId, provider }: { orderId: string; provider: string }) {
  const router = useLocalRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const run = async (result: "success" | "fail") => {
    setBusy(true);
    const res = await fetch(`/api/orders/${orderId}/sandbox`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result, provider }),
    });
    const data = (await res.json()) as { url?: string };
    router.replace(data.url ?? `/buyurtma/${orderId}/tolov/`);
  };
  return (
    <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
      <button type="button" disabled={busy} onClick={() => run("success")} className="btn btn-primary">
        <TickCircle size={16} /> {t("To‘lov muvaffaqiyatli")}
      </button>
      <button type="button" disabled={busy} onClick={() => run("fail")} className="btn btn-secondary">
        <CloseCircle size={16} /> {t("To‘lov o‘tmadi")}
      </button>
    </div>
  );
}
