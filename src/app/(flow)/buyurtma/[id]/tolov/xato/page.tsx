import Link from "next/link";
import { redirect } from "next/navigation";
import { Call, Card, EmptyWallet, MessageQuestion } from "@/components/icons";
import { loadFlow } from "../../_lib/load";
import { StatusScreen, OrderLine } from "@/components/order/StatusScreen";
import { RetryPay } from "@/components/order/RetryPay";
import { isPaidStatus } from "@/server/orders";
import { latestPayment } from "@/server/payments";
import { formatPrice } from "@/lib/format";
import type { Provider } from "@/components/order/PayChoice";
import { site } from "@/lib/site";

export const metadata = { title: "To‘lov o‘tmadi" };

export default async function FailedPage({ params }: { params: Promise<{ id: string }> }) {
  const { order, template, b } = await loadFlow((await params).id, "other");
  const base = `/buyurtma/${order.id}`;
  if (isPaidStatus(b.order.status)) redirect(`${base}/tayyor`);
  const p = await latestPayment(order.id);
  const provider = (p && p.provider !== "p2p" ? p.provider : "payme") as Provider;
  const tips = [
    [<EmptyWallet key="1" size={16} />, "Kartada yetarli mablag‘ borligini tekshiring"],
    [<Call key="2" size={16} />, "SMS kodni to‘g‘ri kiritganingizga ishonch hosil qiling"],
    [<Card key="3" size={16} />, "Boshqa karta yoki to‘lov usulini tanlang"],
  ] as const;
  return (
    <StatusScreen
      kind="error"
      title="To‘lov o‘tmadi"
      text="Kartadan pul yechilmadi. Kiritgan ma’lumotlaringiz saqlangan — qayta urinib ko‘ring yoki boshqa usulni tanlang."
    >
      <div className="w-full max-w-[520px] rounded-panel bg-bg-soft p-5 text-left">
        <p className="t-title text-ink">Nima qilish mumkin</p>
        <ul className="mt-3 flex flex-col gap-3">
          {tips.map(([icon, text]) => (
            <li key={text} className="flex items-center gap-3 t-body-m text-ink">
              <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-bg-base text-maroon">{icon}</span>
              {text}
            </li>
          ))}
        </ul>
      </div>
      <OrderLine left={`№ ${order.code} · ${template.name}`} amount={formatPrice(order.amount)} />
      <div className="flex w-full flex-col flex-wrap justify-center gap-2.5 sm:w-auto sm:flex-row">
        <RetryPay orderId={order.id} provider={provider} />
        <Link href={`${base}/tolov`} className="btn btn-secondary">
          <Card size={16} /> Boshqa usulni tanlash
        </Link>
      </div>
      <a href={site.telegram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 t-body-s text-maroon hover:underline">
        <MessageQuestion size={15} /> Yordam kerakmi? Telegramda yozing
      </a>
    </StatusScreen>
  );
}
