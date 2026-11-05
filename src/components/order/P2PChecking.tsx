"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "@/components/icons";
import { TelegramIcon } from "@/components/TelegramIcon";
import { site } from "@/lib/site";
import { StatusScreen, Timeline, OrderLine } from "./StatusScreen";
import { usePollStatus } from "./usePoll";

/** 13 — Chek tekshirilmoqda (holat avtomatik yangilanadi) */
export function P2PChecking({
  orderId,
  sentAt,
  line,
  amount,
  loggedIn,
}: {
  orderId: string;
  sentAt: string;
  line: string;
  amount: string;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [rejected, setRejected] = useState<string | null>(null);
  const base = `/buyurtma/${orderId}`;

  usePollStatus(
    orderId,
    (d) => {
      if (d.status === "active" || d.status === "paid") {
        router.replace(`${base}/tolov/p2p/tasdiqlandi/`);
        return false;
      }
      if (d.status === "p2p_rejected") {
        setRejected(d.payment?.note || "Chek ma’lumotlari mos kelmadi");
        return false;
      }
    },
    10_000,
  );

  if (rejected)
    return (
      <StatusScreen kind="error" title="Chek qabul qilinmadi" text={`Sabab: ${rejected}. To‘g‘ri chekni qayta yuboring yoki Telegramda yozing.`}>
        <OrderLine left={line} amount={amount} />
        <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
          <Link href={`${base}/tolov/p2p/`} className="btn btn-primary">
            Chekni qayta yuborish <ArrowRight size={16} />
          </Link>
          <a href={site.telegram} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
            <TelegramIcon size={16} /> Telegramda yozish
          </a>
        </div>
      </StatusScreen>
    );

  return (
    <StatusScreen
      kind="waiting"
      title="To‘lovingiz tekshirilmoqda"
      text="Chekingizni oldik. Odatda 15 daqiqa ichida tasdiqlaymiz — sahifani yopsangiz ham bo‘ladi, havola SMS orqali keladi."
    >
      <Timeline
        items={[
          { title: "Chek yuborildi", sub: sentAt, state: "done" },
          { title: "To‘lov tekshirilmoqda", sub: "Taxminan 15 daqiqa", state: "active" },
          { title: "Taklifnoma ishga tushadi", sub: "Havola SMS va Telegramda", state: "todo" },
        ]}
      />
      <OrderLine left={line} amount={amount} />
      <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
        <Link href={loggedIn ? "/kabinet/" : `/kirish/?next=${encodeURIComponent("/kabinet/")}`} className="btn btn-primary">
          Buyurtmalarimga o‘tish <ArrowRight size={16} />
        </Link>
        <a href={site.telegram} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
          <TelegramIcon size={16} /> Telegramda yozish
        </a>
      </div>
    </StatusScreen>
  );
}
