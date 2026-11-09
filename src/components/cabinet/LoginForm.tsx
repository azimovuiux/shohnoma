"use client";

import Link from "@/components/LocalLink";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { PageLoading, useMe } from "@/lib/client";
import { TelegramIcon } from "@/components/TelegramIcon";
import { TelegramLogin } from "./TelegramLogin";
import { lpath, useLocale, useT } from "@/lib/i18n";

/** /kirish/ dagi `next` qiymati — faqat sayt ichidagi yo‘l */
export function safeNext(n?: string | null) {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/kabinet/";
}

/** /kirish/ sahifasi: kirgan foydalanuvchi darrov `next` ga o‘tadi */
export function LoginPageClient() {
  const sp = useSearchParams();
  const locale = useLocale();
  const next = lpath(locale, safeNext(sp.get("next")));
  const { me, loading } = useMe();
  useEffect(() => {
    if (!loading && me?.user) window.location.replace(next);
  }, [loading, me, next]);
  if (loading || me?.user) return <PageLoading className="flex-1" />;
  return <LoginForm next={next} />;
}

export function LoginForm({ next }: { next: string }) {
  const t = useT();
  const locale = useLocale();
  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-col gap-[22px] py-6 lg:mx-0">
      <span className="flex size-[52px] items-center justify-center rounded-full bg-[#2AABEE]/10 text-[#2AABEE]">
        <TelegramIcon size={24} />
      </span>
      <div className="flex flex-col gap-2.5">
        <h1 className="font-serif text-[34px] font-light leading-[1.04] tracking-[-0.005em] text-ink lg:text-[44px]">{t("Kirish yoki ro‘yxatdan o‘tish")}</h1>
        <p className="t-body-m text-ink-2">
          {t("Buyurtmalaringiz, havolangiz va mehmonlar javobi shu yerda. Telegram orqali bir bosishda kiring — hisob avtomatik ochiladi.")}
        </p>
      </div>
      <ol className="flex flex-col gap-2.5 rounded-[16px] bg-bg-soft p-4 t-body-s text-ink-2">
        {["Pastdagi tugmani bosing — Telegram ochiladi", "Botda «Start» tugmasini bosing", "«📱 Raqamni yuborish» — va sayt o‘zi kiradi"].map((s, i) => (
          <li key={s} className="flex items-center gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-bg-base t-nav text-maroon">{i + 1}</span>
            {t(s)}
          </li>
        ))}
      </ol>
      <TelegramLogin next={next} />
      {locale === "ru" ? (
        <p className="t-body-s text-ink-2">
          Входя, вы соглашаетесь с{" "}
          <Link href="/shartlar/" className="underline hover:text-maroon">
            условиями использования
          </Link>{" "}
          и{" "}
          <Link href="/maxfiylik/" className="underline hover:text-maroon">
            политикой конфиденциальности
          </Link>
          .
        </p>
      ) : (
        <p className="t-body-s text-ink-2">
          Kirish orqali{" "}
          <Link href="/shartlar/" className="underline hover:text-maroon">
            foydalanish shartlari
          </Link>{" "}
          va{" "}
          <Link href="/maxfiylik/" className="underline hover:text-maroon">
            maxfiylik siyosatiga
          </Link>{" "}
          rozilik bildirasiz.
        </p>
      )}
    </div>
  );
}
