import Link from "next/link";
import { requireUser } from "@/server/auth";
import { userPaymentHistory } from "@/server/cabinet";
import { providerLabel } from "@/server/payments";
import { isPaidStatus } from "@/server/orders";
import { ProfileForm } from "@/components/cabinet/ProfileForm";
import { Receipt2 } from "@/components/icons";
import { getTemplate } from "@/lib/templates";
import { formatPrice } from "@/lib/format";
import { monthsUz } from "@/lib/display";

export const metadata = { title: "Profil", robots: { index: false } };

const day = (d: Date) => {
  const t = new Date(d.getTime() + 5 * 3600_000).toISOString();
  return `${t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)}`;
};

export default async function ProfilePage() {
  const user = await requireUser("/kabinet/profil");
  const history = await userPaymentHistory(user.id);
  const c = new Date(user.createdAt.getTime() + 5 * 3600_000);
  const since = `${c.getUTCFullYear()}-yil ${monthsUz[c.getUTCMonth()]}`;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-serif text-[34px] font-light leading-[1.04] tracking-[-0.005em] text-ink lg:text-[44px]">Profil</h1>
        <p className="t-body-m text-ink-2">Shaxsiy ma’lumotlar, bildirishnomalar va to‘lovlar tarixi</p>
      </div>
      <ProfileForm
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
        <p className="pb-2 text-[15px] font-semibold leading-[1.35] text-ink">To‘lovlar tarixi</p>
        {history.length === 0 ? (
          <p className="t-body-m text-ink-2">Hali to‘lovlar yo‘q.</p>
        ) : (
          history.map(({ order, invitation: inv, payment }) => {
            const paid = isPaidStatus(order.status) && payment;
            const t = getTemplate(order.templateSlug);
            const title = [inv.personA, inv.personB].filter(Boolean).join(" & ") || "Yangi taklifnoma";
            const receipt = payment?.receiptUrl ?? `/buyurtma/${order.id}/tolov/qabul-qilindi`;
            return (
              <div key={`${order.id}-${payment?.id ?? "x"}`} className="flex flex-wrap items-center gap-3 border-t border-line py-3.5 first:border-t-0">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-maroon">
                  <Receipt2 size={18} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate t-title text-ink">{title}</span>
                  <span className="t-body-s text-ink-2">
                    {[t?.name, paid ? providerLabel[payment.provider] : null, day(payment?.paidAt ?? order.createdAt)].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <span className="font-serif text-[20px] font-medium text-ink">{formatPrice(order.amount)}</span>
                {paid ? (
                  <Link href={receipt} target={payment.receiptUrl ? "_blank" : undefined} className="t-nav text-maroon hover:underline">
                    Chek
                  </Link>
                ) : (
                  <span className="t-body-s text-pending">To‘lanmagan</span>
                )}
              </div>
            );
          })
        )}
      </section>
    </>
  );
}
