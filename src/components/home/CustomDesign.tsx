import Link from "next/link";
import { AddCircle, Brush, Calendar, DocumentText, Gallery, TickCircle, Wallet } from "@/components/icons";
import { TelegramIcon } from "@/components/TelegramIcon";
import { Star8 } from "@/components/Ornament";
import { Photo } from "./Photo";
import { site } from "@/lib/site";

/** Mehrob (ogee) kamar shakli — 440×560 */
const archPath = "M0 560 V210 C0 120 80 60 160 30 C190 18 210 8 220 0 C230 8 250 18 280 30 C360 60 440 120 440 210 V560 Z";

export function CustomDesign() {
  return (
    <section className="bg-bg-base px-5 py-20 lg:px-[120px] lg:py-[130px]">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-14 lg:flex-row lg:gap-[100px]">
        <div className="relative aspect-[520/620] w-full max-w-[520px] shrink-0">
          <svg viewBox="0 0 440 560" className="absolute left-[8.5%] top-0 h-[90.3%] w-[84.6%]" fill="none" aria-hidden>
            <path d={archPath} stroke="var(--color-gold)" />
          </svg>
          <div className="absolute left-0 top-[5.5%] h-[90.3%] w-[84.6%]" style={{ clipPath: `path("${archPath}")` }}>
            <Photo alt="Krem taklifnoma kartalari, oltin muhr va pero" className="size-full" tone="cream" />
          </div>
          <Star8 size={32} className="absolute left-[86.9%] top-[1%]" />
          <Star8 size={12} className="absolute left-[90.4%] top-[11.9%]" />

          <div className="absolute right-0 top-[64.5%] flex w-[244px] flex-col gap-3.5 rounded-[18px] border border-line bg-bg-base px-[22px] pb-[22px] pt-5 shadow-[0_8px_10px_rgba(31,15,10,0.10)] sm:left-[57%] sm:right-auto">
            <div className="flex items-center gap-2.5 t-title text-ink">
              <DocumentText size={18} /> Individual brif
            </div>
            <ul className="flex flex-col gap-2 t-body-s">
              <li className="flex items-center gap-2 text-ink">
                <TickCircle size={16} color="var(--color-gold)" /> Uslub va ranglar
              </li>
              <li className="flex items-center gap-2 text-ink">
                <TickCircle size={16} color="var(--color-gold)" /> Marosim tafsilotlari
              </li>
              <li className="flex items-center gap-2 text-ink-2">
                <AddCircle size={16} /> Rasmlar va matnlar
              </li>
            </ul>
            <span className="h-1 overflow-hidden rounded-sm bg-gold-soft">
              <span className="block h-full w-2/3 bg-gold" />
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-7">
          <h2 className="flex flex-col font-serif font-light">
            <span className="-mb-1 text-[36px] leading-[1.04] text-ink lg:text-[52px]">O‘zingizga xos</span>
            <em className="text-[42px] italic leading-none text-maroon lg:text-[64px]">dizayn kerakmi?</em>
          </h2>
          <p className="t-body-l max-w-[500px] text-ink-2">
            Qisqa brifni to‘ldiring: uslub, ranglar va marosim tafsilotlarini bilib olib, faqat siz uchun taklifnoma
            tayyorlaymiz.
          </p>
          <ul className="grid max-w-[540px] gap-4 sm:grid-cols-2">
            {[
              [<Brush key="b" size={18} />, "Uslub va ranglar"],
              [<Calendar key="c" size={18} />, "Sana, vaqt va manzil"],
              [<Gallery key="g" size={18} />, "Rasmlar va matnlar"],
              [<Wallet key="w" size={18} />, "Muddat va byudjet"],
            ].map(([icon, label]) => (
              <li key={label as string} className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-maroon">{icon}</span>
                <span className="t-title text-ink">{label}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-[22px]">
            <Link href="/maxsus-dizayn/" className="btn btn-primary">
              <DocumentText size={17} /> Brifni to‘ldirish
            </Link>
            <a href={site.telegram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 t-nav text-maroon hover:underline">
              <TelegramIcon size={16} /> yoki Telegramda yozing
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
