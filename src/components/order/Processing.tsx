"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, MoneySend } from "@/components/icons";
import { formatPrice } from "@/lib/format";
import { StatusScreen, InfoCard } from "./StatusScreen";
import { usePollStatus } from "./usePoll";
import { PAY_URL_KEY, type Provider } from "./PayChoice";

const names: Record<string, { name: string; to: string; open: string }> = {
  payme: { name: "Payme", to: "Payme’ga", open: "Payme’ni ochish" },
  click: { name: "Click", to: "Click’ka", open: "Click’ni ochish" },
  google_pay: { name: "Google Pay", to: "Google Pay’ga", open: "Google Pay’ni ochish" },
};

/** 20 — To‘lov jarayonida: provayderga o‘tish va qaytgach holatni kutish */
export function Processing({
  orderId,
  provider,
  autoOpen,
  code,
  templateName,
  amount,
}: {
  orderId: string;
  provider: Provider;
  autoOpen: boolean;
  code: string;
  templateName: string;
  amount: number;
}) {
  const router = useRouter();
  const n = names[provider] ?? names.payme;
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [waitedLong, setWaitedLong] = useState(false);
  const opened = useRef(false);
  const base = `/buyurtma/${orderId}`;

  const open = async () => {
    setError(null);
    setOpening(true);
    let url = sessionStorage.getItem(PAY_URL_KEY(orderId));
    if (!url) {
      try {
        const res = await fetch(`/api/orders/${orderId}/pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider }),
        });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) throw new Error(data.error || "To‘lov sahifasi ochilmadi");
        url = data.url;
      } catch (e) {
        setError((e as Error).message);
        setOpening(false);
        return;
      }
    }
    sessionStorage.removeItem(PAY_URL_KEY(orderId));
    window.location.href = url;
  };

  useEffect(() => {
    if (!autoOpen || opened.current) return;
    opened.current = true;
    // keyingi qaytishda yana ochilmasligi uchun parametrni olib tashlaymiz
    window.history.replaceState(null, "", `${base}/tolov/jarayonda?usul=${provider}`);
    const t = setTimeout(open, 1400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setWaitedLong(true), 45_000);
    return () => clearTimeout(t);
  }, []);

  usePollStatus(orderId, (d) => {
    if (d.status === "active" || d.status === "paid") {
      router.replace(`${base}/tolov/qabul-qilindi/`);
      return false;
    }
    if (d.status === "payment_failed") {
      router.replace(`${base}/tolov/xato/`);
      return false;
    }
  });

  const step = (label: string, active: boolean) => (
    <span className={`rounded-full px-3 py-1.5 t-body-s ${active ? "bg-[var(--danger-bg)] font-medium text-maroon" : "bg-bg-soft text-ink-2"}`}>{label}</span>
  );

  return (
    <StatusScreen
      kind="progress"
      icon={<MoneySend size={30} />}
      title={`${n.to} o‘tmoqdasiz`}
      text={`To‘lovni ${n.name} sahifasida yakunlang. Tugagach, avtomatik shu yerga qaytasiz — sahifani yopmang.`}
    >
      <div className="flex items-center gap-2.5 text-ink-2">
        {step("Shohnoma", false)}
        <ArrowRight size={14} />
        {step(n.name, true)}
        <ArrowRight size={14} />
        {step("Tayyor", false)}
      </div>
      <InfoCard
        rows={[
          ["Buyurtma", `№ ${code} · ${templateName}`],
          ["To‘lanadigan summa", <span key="a" className="font-serif text-[22px] font-medium text-maroon">{formatPrice(amount)}</span>],
        ]}
      />
      <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
        <button type="button" onClick={open} disabled={opening && autoOpen && !error} className="btn btn-primary">
          {n.open} <ArrowRight size={16} />
        </button>
        <Link href={`${base}/tolov/`} className="btn btn-secondary">
          {waitedLong ? "Boshqa usulni tanlash" : "Bekor qilish"}
        </Link>
      </div>
      {error && (
        <p role="alert" className="t-body-s text-danger">
          {error}
        </p>
      )}
      <p className="t-body-s text-ink-2">
        {waitedLong
          ? "To‘lov hali tasdiqlanmadi. To‘lagan bo‘lsangiz, biroz kuting — sahifa o‘zi yangilanadi."
          : `Sahifa ochilmadimi? «${n.open}» tugmasini bosing`}
      </p>
    </StatusScreen>
  );
}
