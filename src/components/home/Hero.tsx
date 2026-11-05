import Link from "next/link";
import { ArrowRight, Card, Link2, Mobile, Music } from "@/components/icons";
import { TelegramIcon } from "@/components/TelegramIcon";
import { Star8 } from "@/components/Ornament";
import { PhoneFrame } from "@/components/mockups/Devices";
import { InvitationScreen } from "@/components/mockups/InvitationScreen";
import { HeroFlowers, HeroFlowersMobile } from "@/components/home/Flowers";
import { getTemplate } from "@/lib/templates";
import { star8Path } from "@/lib/ornament";
import { site } from "@/lib/site";

/** Bordo kamar ichidagi 8-yulduz naqshi (Figma 75:4879) */
function ArchPattern() {
  const cell = 56;
  return (
    <svg viewBox="0 0 440 620" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <clipPath id="hero-arch">
          <path d="M0 620 V220 A220 220 0 0 1 440 220 V620 Z" />
        </clipPath>
        <pattern id="hero-girih" width={cell} height={cell} patternUnits="userSpaceOnUse" x="10" y="6">
          <path d={star8Path(cell / 2, cell / 2, 13)} fill="none" stroke="#c9a25e" strokeWidth="0.8" />
        </pattern>
        <linearGradient id="hero-arch-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a2335" />
          <stop offset="1" stopColor="#5a1828" />
        </linearGradient>
      </defs>
      <g clipPath="url(#hero-arch)">
        <rect width="440" height="620" fill="url(#hero-arch-fill)" />
        <rect width="440" height="620" fill="url(#hero-girih)" opacity="0.28" />
      </g>
    </svg>
  );
}

function HandArrow({ d, className, viewBox }: { d: string; className: string; viewBox: string }) {
  return (
    <svg viewBox={viewBox} className={className} fill="none" aria-hidden>
      <path d={d} stroke="var(--color-gold)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Hero() {
  const bordo = getTemplate("bordo-maktub")!;
  const ravoq = getTemplate("oltin-ravoq")!;

  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto grid max-w-[1440px] gap-12 px-5 pb-16 pt-10 lg:block lg:h-[900px] lg:px-[120px] lg:pb-0 lg:pt-[160px]">
        {/* Matn */}
        <div data-reveal="up" className="relative z-10 flex flex-col items-start">
          <h1 className="flex flex-col font-serif font-light text-ink">
            <span className="text-[44px] leading-none tracking-[-0.01em] sm:text-[60px] lg:text-[84px]">To‘yingiz uchun</span>
            <em className="text-[96px] italic leading-[0.86] tracking-[-0.01em] text-maroon sm:text-[130px] lg:text-[176px]">shohona</em>
            <span className="text-[44px] leading-none tracking-[-0.01em] sm:text-[60px] lg:text-[84px]">taklifnoma sayti</span>
          </h1>
          <p className="t-body-l mt-7 max-w-[470px] text-ink-2">
            Tayyor dizaynni tanlang, ma’lumotlaringizni kiriting va to‘lovdan so‘ng mehmonlarga yuboriladigan tayyor sayt
            havolasini oling.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/#shablonlar" className="btn btn-primary">
              Shablonlarni ko‘rish <ArrowRight size={16} />
            </Link>
            <a href={site.telegram} target="_blank" rel="noopener noreferrer" className="btn border border-line-dark text-ink hover:bg-bg-soft">
              <TelegramIcon size={17} /> Telegramda yozish
            </a>
          </div>
          <ul className="mt-11 flex flex-col gap-3 t-body-s text-ink-2 sm:flex-row sm:flex-wrap sm:gap-7">
            <li className="flex items-center gap-2">
              <Mobile size={16} color="var(--color-gold)" /> Telefon uchun moslangan
            </li>
            <li className="flex items-center gap-2">
              <Link2 size={16} color="var(--color-gold)" /> Bitta havola — barcha mehmonlarga
            </li>
            <li className="flex items-center gap-2">
              <Card size={16} color="var(--color-gold)" /> Payme, Click, Google Pay, P2P
            </li>
          </ul>
        </div>

        {/* Vizual — desktopda absolut koordinatalar (Figma 1440×900) */}
        <div data-reveal="up" style={{ ["--d" as string]: "180ms" }} className="relative mx-auto aspect-[560/760] w-full max-w-[420px] lg:absolute lg:left-[calc(50%+70px)] lg:top-[96px] lg:mx-0 lg:w-[560px] lg:max-w-none">
          {/* koordinatalar 790..1350 × 96..856 → foiz */}
          <div className="absolute left-[10.7%] top-[2.6%] h-[81.6%] w-[78.6%]">
            <svg viewBox="0 0 440 620" className="absolute left-[6.8%] -top-[4.8%] size-full" aria-hidden>
              <path d="M0.5 620 V220 A219.5 219.5 0 0 1 439.5 220 V620" fill="none" stroke="var(--color-gold)" strokeOpacity="0.5" />
            </svg>
            <ArchPattern />
          </div>

          <HeroFlowersMobile />

          <PhoneFrame dark className="absolute left-[17.9%] top-[7.1%] z-[2] w-[53.5%]">
            <InvitationScreen t={bordo} />
          </PhoneFrame>
          <PhoneFrame className="absolute left-[55.4%] top-[17.9%] z-[1] w-[42.5%]">
            <InvitationScreen t={ravoq} />
          </PhoneFrame>

          <Star8 size={40} className="absolute left-0 top-0" />
          <Star8 size={14} className="absolute right-[1%] top-[13%]" />
          <Star8 size={10} className="absolute left-[0.4%] top-[78.2%]" />

          <span className="absolute right-[1%] top-[2.1%] hidden items-center gap-2 t-annotation text-maroon sm:flex">
            <Music size={15} /> Fon musiqasi
          </span>
          <HandArrow
            viewBox="0 0 48 136"
            className="absolute right-[4.6%] top-[5%] hidden h-[17.9%] w-[8.6%] sm:block"
            d="M26 3 C 44 30, 40 80, 28 128 M20 118 L28 130 L36 119"
          />
        </div>
        <HeroFlowers />
      </div>
    </section>
  );
}
