"use client";

/** Buyurtma oqimi sahifalarining brauzer tomonidagi qismi (statik eksport). Har biri FlowGate ichida. */
import Link from "next/link";
import { ArrowDown, ArrowRight, Call, Card, EmptyWallet, MessageQuestion, MoneySend } from "@/components/icons";
import { PageLoading, useConfig, useMe } from "@/lib/client";
import { isPaidStatus } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { site } from "@/lib/site";
import { FlowGate, providerLabel } from "./FlowGate";
import { FlowTop } from "./FlowTop";
import { MarosimForm } from "./MarosimForm";
import { TafsilotlarForm } from "./TafsilotlarForm";
import { ReviewView } from "./ReviewView";
import { PayChoice, type Provider } from "./PayChoice";
import { Processing } from "./Processing";
import { ReadyView } from "./ReadyView";
import { P2PTransfer } from "./P2PTransfer";
import { P2PChecking } from "./P2PChecking";
import { StatusScreen, InfoCard, OrderLine, Timeline } from "./StatusScreen";
import { RetryPay } from "./RetryPay";
import { Sandbox } from "./Sandbox";
import { PrintButton } from "./PrintButton";
import { tashkentStamp } from "./time";
import { namesOf } from "./labels";
import { Star8 } from "@/components/Ornament";

const siteUrlFallback = typeof window !== "undefined" ? window.location.origin : "https://shohnoma.uz";

/* 02 */
export function MarosimPageClient() {
  return (
    <FlowGate step="marosim">
      {({ order, template, editing }) => (
        <>
          <FlowTop
            back={
              editing
                ? { href: `/kabinet/t/${order.invitationId}/`, label: "Taklifnomaga qaytish" }
                : { href: `/shablonlar/${template.slug}/`, label: "Shablonga qaytish" }
            }
            step={editing ? undefined : 1}
            title={editing ? "Ma’lumotlarni tahrirlash" : "Baxtli kuningiz"}
            sub="Ismlar, sana va manzilni kiriting — o‘ng tomonda taklifnoma qanday chiqishini ko‘rasiz."
            subMobile="Ismlar, sana va manzilni kiriting."
          />
          <MarosimForm order={order} template={template} editing={editing} />
        </>
      )}
    </FlowGate>
  );
}

/* 03 */
export function TafsilotlarPageClient() {
  return (
    <FlowGate step="tafsilotlar">
      {({ order, template, editing }) => (
        <>
          <FlowTop
            back={
              editing
                ? { href: `/kabinet/t/${order.invitationId}/`, label: "Taklifnomaga qaytish" }
                : { href: `/buyurtma/${order.id}/marosim/`, label: "Ma’lumotlarga qaytish" }
            }
            step={editing ? undefined : 2}
            title={editing ? "Tafsilotlarni tahrirlash" : "Sizga xos tafsilotlar"}
            sub="Taklifnomani shaxsiylashtiring va bog‘lanish ma’lumotlarini qoldiring."
          />
          <TafsilotlarForm order={order} template={template} editing={editing} />
        </>
      )}
    </FlowGate>
  );
}

/* 04 */
export function ReviewPageClient() {
  return (
    <FlowGate step="korib-chiqish">
      {({ order, template }) => (
        <>
          <FlowTop
            back={{ href: `/buyurtma/${order.id}/tafsilotlar/`, label: "Tafsilotlarga qaytish" }}
            step={3}
            title="Saytingiz shunday ko‘rinadi"
            sub="Laptop va telefonda ko‘rib chiqing — biror narsani o‘zgartirish kerak bo‘lsa, qalamchani bosing."
            subMobile="Biror narsani o‘zgartirish kerak bo‘lsa, qalamchani bosing."
          />
          <ReviewView order={order} template={template} />
        </>
      )}
    </FlowGate>
  );
}

/* 05 */
export function PayPageClient() {
  const cfg = useConfig();
  return (
    <FlowGate step="tolov">
      {({ order, template }) =>
        !cfg.data ? (
          <PageLoading />
        ) : (
          <>
            <FlowTop
              back={{ href: `/buyurtma/${order.id}/korib-chiqish/`, label: "Tekshiruvga qaytish" }}
              step={4}
              title="So‘nggi qadam"
              sub="Qulay to‘lov usulini tanlang."
            />
            <PayChoice order={order} template={template} providers={cfg.data.providers as Provider[]} />
          </>
        )
      }
    </FlowGate>
  );
}

/* 20 */
export function ProcessingPageClient() {
  return (
    <FlowGate
      step="other"
      guard={({ raw, base, search }) => {
        if (isPaidStatus(raw.order.status)) return `${base}/tolov/qabul-qilindi/`;
        if (raw.order.status === "payment_failed" && !search.get("ochish")) return `${base}/tolov/xato/`;
        const usul = search.get("usul") ?? raw.payment?.provider;
        if (usul === "p2p") return `${base}/tolov/p2p/`;
        return null;
      }}
    >
      {({ order, template, raw, search }) => {
        const u = search.get("usul") ?? "";
        const usul = (["payme", "click", "google_pay"].includes(u) ? u : raw.payment?.provider ?? "payme") as Provider;
        return (
          <Processing
            orderId={order.id}
            provider={usul}
            autoOpen={search.get("ochish") === "1"}
            code={order.code}
            templateName={template.name}
            amount={order.amount}
          />
        );
      }}
    </FlowGate>
  );
}

/* 21 */
export function PaidPageClient() {
  return (
    <FlowGate step="other" guard={({ raw, base }) => (isPaidStatus(raw.order.status) ? null : `${base}/tolov/jarayonda/`)}>
      {({ order, raw, base }) => {
        const p = raw.payment;
        return (
          <StatusScreen kind="success" title="To‘lov qabul qilindi" text="Rahmat! Taklifnomangiz ishga tushdi — havola va QR kod tayyor.">
            <InfoCard
              rows={[
                ["To‘langan summa", <span key="s" className="font-serif text-[22px] font-medium text-maroon">{formatPrice(order.amount)}</span>],
                ["Usul", p ? providerLabel[p.provider] : "—"],
                ["Buyurtma", `№ ${order.code}`],
                ["Sana", tashkentStamp(raw.order.paidAt ?? p?.paidAt ?? new Date(), "full")],
              ]}
            />
            <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
              <Link href={`${base}/tayyor/`} className="btn btn-primary">
                Taklifnomamni ko‘rish <ArrowRight size={16} />
              </Link>
              <Link href={`${base}/tolov/chek/`} className="btn btn-secondary">
                <ArrowDown size={16} /> Chekni yuklab olish
              </Link>
            </div>
          </StatusScreen>
        );
      }}
    </FlowGate>
  );
}

/* 14 */
export function FailedPageClient() {
  const tips = [
    [<EmptyWallet key="1" size={16} />, "Kartada yetarli mablag‘ borligini tekshiring"],
    [<Call key="2" size={16} />, "SMS kodni to‘g‘ri kiritganingizga ishonch hosil qiling"],
    [<Card key="3" size={16} />, "Boshqa karta yoki to‘lov usulini tanlang"],
  ] as const;
  return (
    <FlowGate step="other" guard={({ raw, base }) => (isPaidStatus(raw.order.status) ? `${base}/tayyor/` : null)}>
      {({ order, template, raw, base }) => {
        const p = raw.payment;
        const provider = (p && p.provider !== "p2p" ? p.provider : "payme") as Provider;
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
              <Link href={`${base}/tolov/`} className="btn btn-secondary">
                <Card size={16} /> Boshqa usulni tanlash
              </Link>
            </div>
            <a href={site.telegram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 t-body-s text-maroon hover:underline">
              <MessageQuestion size={15} /> Yordam kerakmi? Telegramda yozing
            </a>
          </StatusScreen>
        );
      }}
    </FlowGate>
  );
}

/* 12 */
export function P2PPageClient() {
  const cfg = useConfig();
  return (
    <FlowGate step="tolov" guard={({ raw, base }) => (raw.order.status === "p2p_review" ? `${base}/tolov/p2p/tekshirilmoqda/` : null)}>
      {({ order, template, raw }) => {
        if (!cfg.data) return <PageLoading />;
        const last = raw.payment;
        const rejected = raw.order.status === "p2p_rejected" && last?.provider === "p2p" ? last.reviewNote ?? "Chek ma’lumotlari mos kelmadi" : null;
        return (
          <>
            <FlowTop
              back={{ href: `/buyurtma/${order.id}/tolov/`, label: "To‘lov usuliga qaytish" }}
              step={4}
              title="Kartaga o‘tkazma"
              sub="Istalgan bank ilovasidan o‘tkazing va chekni yuboring."
            />
            <P2PTransfer order={order} template={template} card={cfg.data.p2p} rejectedNote={rejected} />
          </>
        );
      }}
    </FlowGate>
  );
}

/* 13 */
export function CheckingPageClient() {
  const { me } = useMe();
  return (
    <FlowGate
      step="other"
      guard={({ raw, base }) => {
        if (isPaidStatus(raw.order.status)) return `${base}/tolov/p2p/tasdiqlandi/`;
        if (raw.order.status !== "p2p_review" && raw.order.status !== "p2p_rejected") return `${base}/tolov/`;
        return null;
      }}
    >
      {({ order, template, raw }) => (
        <P2PChecking
          orderId={order.id}
          sentAt={tashkentStamp(raw.payment?.createdAt)}
          line={`№ ${order.code} · ${template.name}`}
          amount={formatPrice(order.amount)}
          loggedIn={!!me?.user}
        />
      )}
    </FlowGate>
  );
}

/* 22 */
export function ApprovedPageClient() {
  const { me } = useMe();
  const cfg = useConfig();
  return (
    <FlowGate step="other" guard={({ raw, base }) => (isPaidStatus(raw.order.status) ? null : `${base}/tolov/p2p/tekshirilmoqda/`)}>
      {({ order, template, raw, base }) => {
        const p = raw.payment;
        const host = (cfg.data?.siteUrl ?? siteUrlFallback).replace(/^https?:\/\//, "").replace(/\/$/, "");
        return (
          <StatusScreen
            kind="success"
            title="Chekingiz tasdiqlandi"
            text="O‘tkazmangiz qabul qilindi. Taklifnomangiz ishga tushdi, havola SMS orqali ham yuborildi."
          >
            <Timeline
              items={[
                { title: "Chek yuborildi", sub: tashkentStamp(p?.createdAt), state: "done" },
                { title: "To‘lov tasdiqlandi", sub: tashkentStamp(p?.paidAt ?? raw.order.paidAt), state: "done" },
                { title: "Taklifnoma ishga tushdi", sub: `${host}/${order.slug}`, state: "done" },
              ]}
            />
            <OrderLine left={`№ ${order.code} · ${p ? providerLabel[p.provider] : template.name}`} amount={formatPrice(order.amount)} />
            <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
              <Link href={`${base}/tayyor/`} className="btn btn-primary">
                Taklifnomamni ko‘rish <ArrowRight size={16} />
              </Link>
              <Link href={me?.user ? "/kabinet/" : "/kirish/?next=%2Fkabinet%2F"} className="btn btn-secondary">
                Buyurtmalarimga o‘tish
              </Link>
            </div>
          </StatusScreen>
        );
      }}
    </FlowGate>
  );
}

/* 06 */
export function ReadyPageClient() {
  const { me } = useMe();
  const cfg = useConfig();
  return (
    <FlowGate
      step="other"
      guard={({ raw, base }) => {
        const s = raw.order.status;
        if (isPaidStatus(s)) return null;
        if (s === "p2p_review") return `${base}/tolov/p2p/tekshirilmoqda/`;
        if (s === "archived") return "/kabinet/";
        return `${base}/marosim/`;
      }}
    >
      {({ order, template, raw }) => (
        <ReadyView
          order={order}
          template={template}
          url={`${(cfg.data?.siteUrl ?? siteUrlFallback).replace(/\/$/, "")}/${order.slug}/`}
          providerName={raw.payment ? providerLabel[raw.payment.provider] : "To‘langan"}
          loggedIn={!!me?.user}
        />
      )}
    </FlowGate>
  );
}

/* Chek (chop etish) */
export function ReceiptPageClient() {
  return (
    <FlowGate step="other" guard={({ raw, base }) => (isPaidStatus(raw.order.status) ? null : `${base}/tolov/`)}>
      {({ order, template, raw }) => {
        const p = raw.payment;
        const rows: [string, string][] = [
          ["Buyurtma", `№ ${order.code}`],
          ["Xizmat", `Taklifnoma sayti — «${template.name}»`],
          ["Taklifnoma", namesOf(order)],
          ["To‘lov usuli", p ? providerLabel[p.provider] : "—"],
          ["Sana", tashkentStamp(raw.order.paidAt ?? p?.paidAt, "full")],
          ["To‘lov raqami", p?.id ?? "—"],
        ];
        return (
          <section className="mx-auto max-w-[560px] px-5 py-12 print:py-0">
            <div className="rounded-panel border border-line bg-bg-base p-8 print:border-0">
              <div className="flex items-center gap-2">
                <Star8 size={18} />
                <span className="t-logo">Shohnoma</span>
              </div>
              <h1 className="mt-6 font-serif text-[32px] font-light text-ink">To‘lov cheki</h1>
              <dl className="mt-6 divide-y divide-line">
                {rows.map(([l, v]) => (
                  <div key={l} className="flex justify-between gap-4 py-3">
                    <dt className="t-body-s text-ink-2">{l}</dt>
                    <dd className="text-right text-[13px] font-semibold text-ink">{v}</dd>
                  </div>
                ))}
                <div className="flex items-center justify-between py-4">
                  <dt className="t-title text-ink">Jami to‘langan</dt>
                  <dd className="font-serif text-[28px] font-medium text-maroon">{formatPrice(p?.amount ?? order.amount)}</dd>
                </div>
              </dl>
              <p className="mt-4 t-body-s text-ink-2">shohnoma.uz{order.slug ? ` · shohnoma.uz/${order.slug}` : ""}</p>
            </div>
            <div className="mt-6 flex justify-center print:hidden">
              <PrintButton />
            </div>
          </section>
        );
      }}
    </FlowGate>
  );
}

/* Test to‘lov (PAYMENTS_SANDBOX=1) */
export function SandboxPageClient() {
  const cfg = useConfig();
  if (cfg.loading) return <PageLoading />;
  if (!cfg.data?.sandbox)
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-[480px] flex-col items-center justify-center gap-4 px-5 text-center">
        <p className="font-serif text-[30px] font-light text-ink">Sahifa topilmadi</p>
        <Link href="/" className="btn btn-secondary">
          Bosh sahifa
        </Link>
      </div>
    );
  return (
    <FlowGate step="other">
      {({ order, search }) => {
        const usul = search.get("usul") ?? "payme";
        return (
          <StatusScreen
            kind="progress"
            icon={<MoneySend size={30} />}
            title="Test to‘lov"
            text="Bu sahifa faqat sinov rejimida ko‘rinadi — haqiqiy provayder o‘rniga natijani tanlang."
          >
            <InfoCard rows={[["Buyurtma", `№ ${order.code}`], ["Usul", usul], ["Summa", formatPrice(order.amount)]]} />
            <Sandbox orderId={order.id} provider={usul} />
          </StatusScreen>
        );
      }}
    </FlowGate>
  );
}

/* /buyurtma/<id>/ → marosim */
export function OrderIndexClient() {
  return <FlowGate step="other" guard={({ base }) => `${base}/marosim/`}>{() => null}</FlowGate>;
}
