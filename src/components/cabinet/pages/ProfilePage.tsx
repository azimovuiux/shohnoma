"use client";

import Link from "@/components/LocalLink";
import { Receipt2 } from "@/components/icons";
import { PageLoading, useApi, useMe } from "@/lib/client";
import { isPaidStatus, type Invitation, type Order, type Payment } from "@/lib/types";
import { getTemplate } from "@/lib/templates";
import { formatPrice } from "@/lib/format";
import { monthsUz } from "@/lib/display";
import { ProfileForm } from "../ProfileForm";
import { dayTk, invTitle, providerLabel } from "../data";
import { useLocale, useT } from "@/lib/i18n";

const monthsRuGen = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

type Row = { payment: Payment | null; order: Order; invitation: Invitation };

/** 24 — Profil */
export function ProfilePage() {
  const t = useT();
  const locale = useLocale();
  const { me } = useMe();
  const user = me?.user;
  const { data, loading } = useApi<{ ok: boolean; items: Row[] }>("/api/me/payments");
  if (!user) return <PageLoading />;
  const c = new Date(new Date(user.createdAt).getTime() + 5 * 3600_000);
  const since = isNaN(c.getTime())
    ? ""
    : locale === "ru"
      ? `${monthsRuGen[c.getUTCMonth()]} ${c.getUTCFullYear()} г.`
      : `${c.getUTCFullYear()}-yil ${monthsUz[c.getUTCMonth()]}`;
  const history = data?.items ?? [];

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-serif text-[34px] font-light leading-[1.04] tracking-[-0.005em] text-ink lg:text-[44px]">{t("Profil")}</h1>
        <p className="t-body-m text-ink-2">{t("Shaxsiy ma’lumotlar, bildirishnomalar va to‘lovlar tarixi")}</p>
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
      <section className="flex flex-col gap-2 rounded-card border border-line bg-bg-base p-5 lg:p-6">
        <p className="pb-2 text-[15px] font-semibold leading-[1.35] text-ink">{t("To‘lovlar tarixi")}</p>
        {loading && !data ? (
          <p className="t-body-m text-ink-2">{t("Yuklanmoqda…")}</p>
        ) : history.length === 0 ? (
          <p className="t-body-m text-ink-2">{t("Hali to‘lovlar yo‘q.")}</p>
        ) : (
          history.map(({ order, invitation: inv, payment }) => {
            const paid = isPaidStatus(order.status) && payment && payment.status === "paid";
            const tpl = getTemplate(order.templateSlug);
            const receipt = payment?.receiptUrl ?? `/buyurtma/${order.id}/tolov/qabul-qilindi/`;
            return (
              <div key={`${order.id}-${payment?.id ?? "x"}`} className="flex flex-wrap items-center gap-3 border-t border-line py-3.5 first:border-t-0">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-maroon">
                  <Receipt2 size={18} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate t-title text-ink">{invTitle(inv, t)}</span>
                  <span className="t-body-s text-ink-2">
                    {[tpl?.name, paid ? t(providerLabel[payment!.provider] ?? "") : null, dayTk(payment?.paidAt ?? order.createdAt)].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <span className="font-serif text-[20px] font-medium text-ink">{formatPrice(order.amount, true, locale)}</span>
                {paid ? (
                  <Link href={receipt} target={payment!.receiptUrl ? "_blank" : undefined} className="t-nav text-maroon hover:underline">
                    {t("Chek")}
                  </Link>
                ) : (
                  <span className="t-body-s text-pending">{t("To‘lanmagan")}</span>
                )}
              </div>
            );
          })
        )}
      </section>
    </>
  );
}
