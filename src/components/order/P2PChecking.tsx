"use client";

import Link from "@/components/LocalLink";
import { useState } from "react";
import { useLocalRouter } from "@/lib/useLocalRouter";
import { useLpath, useT } from "@/lib/i18n";
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
  const router = useLocalRouter();
  const t = useT();
  const lp = useLpath();
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
        setRejected(d.payment?.note || t("Chek ma’lumotlari mos kelmadi"));
        return false;
      }
    },
    10_000,
  );

  if (rejected)
    return (
      <StatusScreen
        kind="error"
        title={t("Chek qabul qilinmadi")}
        text={t("Sabab: {reason}. To‘g‘ri chekni qayta yuboring yoki Telegramda yozing.", { reason: t(rejected) })}
      >
        <OrderLine left={line} amount={amount} />
        <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
          <Link href={`${base}/tolov/p2p/`} className="btn btn-primary">
            {t("Chekni qayta yuborish")} <ArrowRight size={16} />
          </Link>
          <a href={site.telegram} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
            <TelegramIcon size={16} /> {t("Telegramda yozish")}
          </a>
        </div>
      </StatusScreen>
    );

  return (
    <StatusScreen
      kind="waiting"
      title={t("To‘lovingiz tekshirilmoqda")}
      text={t("Chekingizni oldik. Sahifani yopsangiz ham bo‘ladi.")}
    >
      <Timeline
        items={[
          { title: t("Chek yuborildi"), sub: sentAt, state: "done" },
          { title: t("To‘lov tekshirilmoqda"), sub: t("Taxminan 15 daqiqa"), state: "active" },
          { title: t("Taklifnoma ishga tushadi"), sub: t("Havola kabinetda va Telegramda"), state: "todo" },
        ]}
      />
      <OrderLine left={line} amount={amount} />
      <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
        <Link href={loggedIn ? "/kabinet/" : `/kirish/?next=${encodeURIComponent(lp("/kabinet/"))}`} className="btn btn-primary">
          {t("Buyurtmalarimga o‘tish")} <ArrowRight size={16} />
        </Link>
        <a href={site.telegram} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
          <TelegramIcon size={16} /> {t("Telegramda yozish")}
        </a>
      </div>
    </StatusScreen>
  );
}
