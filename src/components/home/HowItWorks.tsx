import { Card, CardPos, Edit, Gallery, MoneySend, Mobile, Send2, WalletCheck } from "@/components/icons";
import { SectionTitle } from "./SectionTitle";

const steps = [
  { icon: <Gallery size={24} />, title: "Dizaynni tanlang", text: "Marosimingizga mos tayyor shablonni tanlang." },
  { icon: <Edit size={24} />, title: "Ma’lumotlarni kiriting", text: "Ismlar, sana, vaqt, manzil va rasmlarni qo‘shing." },
  { icon: <Card size={24} />, title: "To‘lovni amalga oshiring", text: "Payme, Click, Google Pay yoki P2P o‘tkazma orqali." },
  { icon: <Send2 size={24} />, title: "Havolani ulashing", text: "Tayyor sayt havolasini Telegram va Instagramda yuboring." },
];

const methods = [
  { icon: <Card size={16} />, label: "Payme" },
  { icon: <CardPos size={16} />, label: "Click" },
  { icon: <Mobile size={16} />, label: "Google Pay" },
  { icon: <MoneySend size={16} />, label: "P2P o‘tkazma" },
];

/** Mehrob shaklidagi ikonka foni (64×80) */
function ArchIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative flex h-20 w-16 shrink-0 items-end justify-center pb-[18px] text-maroon">
      <svg viewBox="0 0 64 80" className="absolute inset-0 size-full" aria-hidden>
        <path d="M0 80 V34 C0 16 14 6 32 0 C50 6 64 16 64 34 V80 Z" fill="var(--color-gold-soft)" />
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}

function Connector() {
  return (
    <svg viewBox="0 0 200 30" className="absolute left-[84px] top-[26px] hidden h-[30px] w-[200px] xl:block" fill="none" aria-hidden>
      <path d="M2 26 C 60 4, 140 4, 192 20" stroke="var(--color-gold)" strokeDasharray="4 4" strokeLinecap="round" />
      <path d="M186 14 L193 20.5 L184 23" stroke="var(--color-gold)" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HowItWorks() {
  return (
    <section id="qanday-ishlaydi" className="scroll-mt-20 bg-bg-base px-5 py-20 lg:px-[120px] lg:py-[120px]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-14 lg:gap-[72px]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle plain="Qanday" italic="ishlaydi" />
          <p className="t-body-m max-w-[400px] text-ink-2 lg:text-right">Buyurtmadan tayyor havolagacha — to‘rt oddiy qadam.</p>
        </div>

        <ol className="grid gap-10 sm:grid-cols-2 xl:grid-cols-4 xl:gap-0">
          {steps.map((s, i) => (
            <li key={s.title} className="relative flex gap-5 xl:flex-col xl:gap-7">
              <ArchIcon>{s.icon}</ArchIcon>
              {i < steps.length - 1 && <Connector />}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-baseline gap-2.5">
                  <span className="font-serif text-[26px] font-light italic leading-none text-gold">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="t-display-card text-ink">{s.title}</h3>
                </div>
                <p className="t-body-m max-w-[250px] text-ink-2">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex flex-col gap-6 rounded-panel bg-bg-soft p-6 lg:flex-row lg:items-center lg:justify-between lg:px-9 lg:py-7">
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gold-soft text-maroon">
              <WalletCheck size={22} />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-[15px] font-semibold leading-[1.35] text-ink">To‘lov usullari</p>
              <p className="t-body-s text-ink-2">To‘lov tasdiqlangach, tayyor sayt havolasi sizga yuboriladi.</p>
            </div>
          </div>
          <ul className="flex flex-wrap gap-2.5">
            {methods.map((m) => (
              <li key={m.label} className="flex items-center gap-2 rounded-xl border border-line bg-bg-base px-[18px] py-3 t-nav text-ink">
                <span className="text-gold">{m.icon}</span>
                {m.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
