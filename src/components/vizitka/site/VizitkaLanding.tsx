"use client";

import { useEffect, useState } from "react";
import Link from "@/components/LocalLink";
import { useT } from "@/lib/i18n";
import {
  Add,
  ArrowDown,
  ArrowRight,
  Chart,
  Edit,
  Gallery,
  Global,
  Minus,
  Personalcard,
  PlayCircle,
  Scan,
  Send2,
  UserAdd,
  WalletCheck,
} from "@/components/icons";
import { TelegramIcon } from "@/components/TelegramIcon";
import { site } from "@/lib/site";
import { qrDataUrl } from "@/lib/qr";
import { CARD_DESIGNS } from "@/lib/cards";
import { CARD_PAGES } from "@/lib/cardTypes";
import { SectionTitle } from "@/components/home/SectionTitle";
import { CardPhoneShot } from "./shared";
import { DesignCard } from "./DesignCard";


const features = [
  { icon: Scan, title: "QR kod", text: "Har bir vizitkaga QR kod beriladi. Uni qog‘oz vizitkaga, stol ustidagi tablichkaga yoki taqdimot slaydiga qo‘ying — telefon kamerasi bilan skanerlash kifoya." },
  { icon: UserAdd, title: "Kontaktni bir bosishda saqlash", text: "«Kontaktni saqlash» tugmasi ismingiz, telefoningiz, emailingiz va suratingizni telefonning kontaktlar ro‘yxatiga qo‘shadi (.vcf fayl). Raqamni qo‘lda yozish shart emas." },
  { icon: Send2, title: "Murojaat formasi", text: "Sahifani ochgan odam ismi va raqamini qoldirishi mumkin. Murojaat kabinetingizga tushadi va sizga darhol xabar keladi." },
  { icon: Global, title: "Uch tilda", text: "Matnni o‘zbek, rus va ingliz tilida kiritasiz. Sahifani ochgan odam UZ / RU / EN tugmasi bilan o‘ziga qulay tilni tanlaydi." },
  { icon: Chart, title: "Ko‘rishlar soni", text: "Kabinetda vizitkangiz necha marta ochilgani, kontakt necha marta saqlangani va kimlar murojaat qoldirgani ko‘rinib turadi." },
  { icon: Edit, title: "Istalgan payt tahrirlash", text: "Lavozim yoki raqam o‘zgardimi? Kabinetdan o‘zgartirasiz — havola va QR kod o‘sha-o‘sha qoladi, qayta chop etish kerak emas." },
];

const steps = [
  { icon: Gallery, title: "Dizaynni tanlang", text: "Ikki tayyor dizayndan o‘zingizga mosini tanlang." },
  { icon: Edit, title: "Ma’lumotlarni kiriting", text: "Suratingiz, lavozim, telefon, ijtimoiy tarmoqlar va havolalar." },
  { icon: WalletCheck, title: "To‘lov qiling", text: "Bir martalik to‘lov — oylik obuna yo‘q." },
  { icon: Personalcard, title: "Havola va QR kodni oling", text: "shohnoma.uz/v/ismingiz — Telegram, Instagram va qog‘oz vizitkangizga." },
];

const included = [
  "Shaxsiy havola: shohnoma.uz/v/ismingiz",
  "QR kod (PNG va SVG)",
  "Kontaktni saqlash (.vcf)",
  "Murojaat formasi va bildirishnomalar",
  "O‘zbek, rus va ingliz tillari",
  "Ko‘rishlar statistikasi",
  "Istalgan payt tahrirlash",
];

const faqs = [
  { q: "Har oy to‘lash kerakmi?", a: "Yo‘q. To‘lov bir marta qilinadi, vizitka muddatsiz ishlaydi. Obuna ham, yashirin to‘lov ham yo‘q." },
  { q: "Qog‘oz vizitkam bor. Bu nima uchun kerak?", a: "Qog‘oz vizitka tez yo‘qoladi va unga ko‘p narsa sig‘maydi. Raqamli vizitkada ijtimoiy tarmoqlar, kompaniyalar, havolalar va murojaat formasi bor. Eng yaxshisi — ikkalasi: qog‘oz vizitkaga shu sahifaning QR kodini chop eting." },
  { q: "Suhbatdoshim biror ilova o‘rnatishi kerakmi?", a: "Yo‘q. Vizitka oddiy sayt sahifasi: istalgan telefonda brauzerda ochiladi. Kontakt esa telefonning o‘z kontaktlar ilovasiga saqlanadi." },
  { q: "Ma’lumotlarni keyin o‘zgartira olamanmi?", a: "Ha, kabinetdan istalgan payt. Havola va QR kod o‘zgarmaydi, shuning uchun avval tarqatgan QR kodlaringiz ishlashda davom etadi." },
  { q: "Matnni uch tilda yozish shartmi?", a: "Yo‘q. Faqat o‘zbekchasi majburiy. Ruscha yoki inglizcha bo‘sh qolsa, o‘sha tilda ham o‘zbekcha matn ko‘rsatiladi." },
];

/** Namunaning QR kodi — skanerlansa jonli namuna ochiladi */
function DemoQr({ className = "" }: { className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void qrDataUrl(`${window.location.origin}${CARD_PAGES.demo(CARD_DESIGNS[0].slug)}`, 320).then((u) => alive && setSrc(u));
    return () => {
      alive = false;
    };
  }, []);
  return (
    <span className={`block aspect-square overflow-hidden rounded-[10px] bg-white ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img src={src} alt="" className="size-full" />}
    </span>
  );
}

function Hero() {
  const t = useT();
  const [noir, lumen] = [CARD_DESIGNS[0], CARD_DESIGNS[1] ?? CARD_DESIGNS[0]];
  return (
    <section className="relative overflow-hidden bg-bg-base px-5 pb-16 pt-10 lg:px-10 xl:px-[120px] lg:pb-24 lg:pt-16">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
        <div data-reveal="stagger" className="flex min-w-0 flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-gold-soft px-3.5 py-1.5 t-nav text-maroon">
            <Personalcard size={15} /> {t("Raqamli vizitka")}
          </span>
          <h1 className="flex flex-col font-serif font-light text-ink">
            <span className="text-[40px] leading-[1.02] tracking-[-0.01em] sm:text-[52px] lg:text-[64px]">{t("Bitta havolada —")}</span>
            <em className="text-[44px] italic leading-[1.02] tracking-[-0.01em] text-maroon sm:text-[58px] lg:text-[72px]">{t("butun vizitkangiz")}</em>
          </h1>
          <p className="t-body-l max-w-[520px] text-ink-2">
            {t("Ism, lavozim, telefon, ijtimoiy tarmoqlar va kompaniyangiz — bitta chiroyli sahifada. Uchrashuvda QR kodni ko‘rsatasiz, suhbatdoshingiz kontaktingizni bir bosishda telefoniga saqlaydi.")}
          </p>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <a href="#dizaynlar" className="btn btn-primary">
              {t("Dizaynni tanlash")} <ArrowDown size={16} />
            </a>
            <Link href={CARD_PAGES.demo(noir.slug)} className="btn btn-secondary">
              <PlayCircle size={16} /> {t("Namunani ko‘rish")}
            </Link>
          </div>
        </div>

        {/* Ikki dizayn telefon ekranida + namuna QR kodi */}
        <div data-reveal="up" className="relative mx-auto h-[440px] w-full max-w-[420px] sm:h-[520px] sm:max-w-[480px] lg:h-[560px]">
          <div className="absolute inset-x-[6%] bottom-[4%] top-[10%] rounded-[44%_44%_28px_28px] bg-gold-soft/70" aria-hidden />
          <CardPhoneShot d={noir} className="absolute left-[4%] top-[2%] w-[47%] -rotate-[4deg]" />
          <CardPhoneShot d={lumen} className="absolute right-[4%] top-[12%] w-[47%] rotate-[4deg]" />
          <div className="absolute bottom-[2%] left-1/2 flex w-[230px] -translate-x-1/2 items-center gap-3 rounded-[18px] border border-line bg-bg-base p-2.5 shadow-[0_14px_28px_-16px_rgba(38,20,10,0.35)] max-[359px]:w-[210px]">
            <DemoQr className="w-[64px] shrink-0" />
            <span className="flex min-w-0 flex-col gap-1">
              <span className="t-title text-ink">{t("Skanerlang")}</span>
              <span className="t-body-s text-ink-2">{t("Telefoningizda namuna ochiladi")}</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const t = useT();
  return (
    <section id="imkoniyatlar" className="scroll-mt-20 bg-bg-base px-5 py-20 lg:px-10 xl:px-[120px] lg:py-[110px]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-12 lg:gap-16">
        <div data-reveal="stagger" className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <SectionTitle plain="Vizitkada" italic="nimalar bor" />
          <p className="t-body-l max-w-[460px] text-ink-2">{t("Bu oddiy sayt sahifasi: ilova o‘rnatish ham, ro‘yxatdan o‘tish ham shart emas. Havolani yuborasiz yoki QR kodni ko‘rsatasiz — tamom.")}</p>
        </div>
        <ul data-reveal="stagger" style={{ ["--d" as string]: "120ms" }} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <li key={f.title} className="flex flex-col gap-4 rounded-card bg-bg-soft p-6 lg:p-7">
                <span className="flex size-12 items-center justify-center rounded-full bg-gold-soft text-maroon">
                  <Icon size={22} />
                </span>
                <h3 className="t-display-card text-ink">{t(f.title)}</h3>
                <p className="t-body-m text-ink-2">{t(f.text)}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function Steps() {
  const t = useT();
  return (
    <section id="qanday-ishlaydi" className="scroll-mt-20 bg-bg-soft px-5 py-20 lg:px-10 xl:px-[120px] lg:py-[110px]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-12 lg:gap-16">
        <div data-reveal="stagger">
          <SectionTitle plain="Qanday" italic="ishlaydi" />
        </div>
        <ol data-reveal="stagger" style={{ ["--d" as string]: "120ms" }} className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.title} className="flex gap-5 xl:flex-col xl:gap-6">
                <span className="relative flex size-14 shrink-0 items-center justify-center rounded-full border border-line text-maroon">
                  <Icon size={22} />
                  <span className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-maroon text-[11px] font-semibold text-ink-inverse">{i + 1}</span>
                </span>
                <div className="flex flex-col gap-2">
                  <h3 className="t-display-card text-ink">{t(s.title)}</h3>
                  <p className="t-body-m text-ink-2">{t(s.text)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function Designs() {
  const t = useT();
  const list = CARD_DESIGNS.filter((d) => d.active);
  return (
    <section id="dizaynlar" className="scroll-mt-20 bg-bg-soft px-5 py-20 lg:px-10 xl:px-[120px] lg:py-[110px]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-12">
        <div data-reveal="stagger" className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <SectionTitle plain="Vizitka" italic="dizaynlari" />
          <p className="t-body-l max-w-[460px] text-ink-2">{t("Ikkala dizayn ham telefon va kompyuterda chiroyli ochiladi. Bosib ko‘ring — namuna jonli ishlaydi.")}</p>
        </div>
        <div className="grid gap-x-6 gap-y-10 md:grid-cols-2">
          {list.map((d, i) => (
            <DesignCard key={d.slug} d={d} reveal delay={i * 120} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Questions() {
  const [open, setOpen] = useState(0);
  const t = useT();
  return (
    <section id="savollar" className="scroll-mt-20 bg-bg-base px-5 py-20 lg:px-10 xl:px-[120px] lg:py-[110px]">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 lg:flex-row lg:gap-20">
        <div data-reveal="stagger" className="flex shrink-0 flex-col gap-[22px] lg:w-[400px]">
          <SectionTitle plain="Ko‘p so‘raladigan" italic="savollar" stacked />
          <a href={site.telegram} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-2 t-nav text-maroon hover:underline">
            <TelegramIcon size={16} /> {t("Telegramda savol berish")} <ArrowRight size={14} />
          </a>
        </div>
        <div data-reveal="stagger" style={{ ["--d" as string]: "200ms" }} className="flex-1 border-t border-line">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="border-b border-line">
                <h3>
                  <button type="button" aria-expanded={isOpen} aria-controls={`vfaq-${i}`} onClick={() => setOpen(isOpen ? -1 : i)} className="group flex w-full items-center gap-6 py-[22px] text-left">
                    <span className="flex-1 text-[16px] font-semibold leading-[1.35] text-ink transition-colors group-hover:text-maroon">{t(f.q)}</span>
                    <span className={`flex size-[34px] shrink-0 items-center justify-center rounded-full transition-colors ${isOpen ? "bg-maroon text-ink-inverse" : "border border-line text-ink group-hover:border-maroon group-hover:text-maroon"}`}>
                      {isOpen ? <Minus size={16} /> : <Add size={16} />}
                    </span>
                  </button>
                </h3>
                <div id={`vfaq-${i}`} hidden={!isOpen} className="t-body-m -mt-1 max-w-[620px] pb-[22px] text-ink-2">
                  {t(f.a)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** /vizitka/ — raqamli vizitka mahsuloti sahifasi */
export function VizitkaLanding() {
  return (
    <>
      <Hero />
      <Designs />
      <Features />
      <Steps />
      <Questions />
    </>
  );
}
