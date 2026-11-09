"use client";

import Link from "@/components/LocalLink";
import { Receipt2 } from "@/components/icons";
import { PageLoading, useMe } from "@/lib/client";
import { monthsUz } from "@/lib/display";
import { ProfileForm } from "../ProfileForm";
import { useLocale, useT } from "@/lib/i18n";

const monthsRuGen = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

/** 24 — Profil */
export function ProfilePage() {
  const t = useT();
  const locale = useLocale();
  const { me } = useMe();
  const user = me?.user;
  if (!user) return <PageLoading />;
  const c = new Date(new Date(user.createdAt).getTime() + 5 * 3600_000);
  const since = isNaN(c.getTime())
    ? ""
    : locale === "ru"
      ? `${monthsRuGen[c.getUTCMonth()]} ${c.getUTCFullYear()} г.`
      : locale === "en"
        ? c.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
      : `${c.getUTCFullYear()}-yil ${monthsUz[c.getUTCMonth()]}`;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-serif text-[34px] font-light leading-[1.04] tracking-[-0.005em] text-ink lg:text-[44px]">{t("Profil")}</h1>
      </div>
      <ProfileForm
        key={user.id + (user.telegramId ?? "")}
        user={{
          name: user.name,
          phone: user.phone,
          telegramUser: user.telegramUser,
          telegramId: user.telegramId,
          since,
          notifyRsvpTelegram: user.notifyRsvpTelegram,
          notifyRsvpSms: user.notifyRsvpSms,
          notifyDayBefore: user.notifyDayBefore,
        }}
      />
      <Link href="/kabinet/tolovlar/" className="flex items-center gap-3 rounded-card border border-line bg-bg-base p-5 transition-colors hover:bg-bg-soft lg:p-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-maroon">
          <Receipt2 size={18} />
        </span>
        <span className="flex-1 text-[15px] font-semibold leading-[1.35] text-ink">{t("To‘lovlar tarixi")}</span>
        <span className="t-nav text-maroon">{t("Ko‘rish")} →</span>
      </Link>
    </>
  );
}
