"use client";

import { useEffect, useState } from "react";
import { Calendar, Colorfilter, Gallery, Location, Mobile, Music, Profile2User, Timer1 } from "@/components/icons";
import { GirihPattern } from "@/components/Ornament";
import { PhoneFrame } from "@/components/mockups/Devices";
import { Photo } from "./Photo";
import { useT } from "@/lib/i18n";

const left = [
  { icon: <Timer1 size={22} />, title: "To‘yga qadar sanoq", text: "Kun, soat va daqiqalar jonli hisoblanadi" },
  { icon: <Calendar size={22} />, title: "Marosim dasturi", text: "Har bir bosqich o‘z vaqti bilan" },
  { icon: <Location size={22} />, title: "Manzil va xarita", text: "Bir bosishda yo‘l ko‘rsatiladi" },
  { icon: <Profile2User size={22} />, title: "Mehmonlar javobi", text: "Kim kelishini oldindan bilasiz" },
];
const right = [
  { icon: <Gallery size={22} />, title: "Fotogalereya", text: "Eng chiroyli suratlaringiz uchun" },
  { icon: <Music size={22} />, title: "Fon musiqasi", text: "O‘zingiz tanlagan kuy yangraydi" },
  { icon: <Colorfilter size={22} />, title: "Kiyinish uslubi", text: "Mehmonlar uchun ranglar palitrasi" },
  { icon: <Mobile size={22} />, title: "Ilovasiz ochiladi", text: "Har qanday telefonda, havola orqali" },
];

function Feature({ f, side, i = 0 }: { f: (typeof left)[number]; side: "left" | "right"; i?: number }) {
  const t = useT();
  return (
    <li className={`relative flex items-center gap-[18px] ${side === "left" ? "lg:flex-row-reverse lg:text-right" : ""}`}>
      <span className="flex size-[52px] shrink-0 items-center justify-center rounded-full border border-[rgba(226,196,140,0.45)] bg-maroon-deep text-[#e2c48c]">
        {f.icon}
      </span>
      <span className="flex flex-col gap-1.5 text-ink-inverse">
        <span className="text-[15px] font-semibold leading-[1.35]">{t(f.title)}</span>
        <span className="t-body-s opacity-70">{t(f.text)}</span>
      </span>
      <span
        aria-hidden
        className={`absolute top-1/2 hidden h-0 w-[35px] border-t-2 border-dashed border-[#e2c48c]/50 lg:block ${
          side === "left" ? "-right-[35px]" : "-left-[35px]"
        }`}
      />
    </li>
  );
}

/** To‘yga qadar sanoq — jonli */
function Countdown() {
  const target = new Date("2026-09-12T18:00:00+05:00").getTime();
  const [now, setNow] = useState<number | null>(null);
  const t = useT();
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  // Namuna sana o‘tib ketgan bo‘lsa, Figma'dagi qiymatlar ko‘rsatiladi
  let v = [12, 8, 45, 30];
  if (now !== null && target > now) {
    const s = Math.floor((target - now) / 1000);
    v = [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
  }
  return (
    <div className="flex justify-center gap-[2.6cqw]">
      {["Kun", "Soat", "Daqiqa", "Soniya"].map((l, i) => (
        <div key={l} className="flex h-[17cqw] w-[17.8cqw] flex-col items-center justify-center rounded-[3.2cqw] border border-[#e8dcc6] bg-white/85">
          <span className="font-serif text-[7cqw] font-medium leading-none text-[#7a5a33]">{String(v[i]).padStart(2, "0")}</span>
          <span className="mt-[0.8cqw] text-[2.4cqw] font-medium uppercase tracking-[0.1em] text-[#9a7444]">{t(l)}</span>
        </div>
      ))}
    </div>
  );
}

function InnerPage() {
  const tt = useT();
  return (
    <div className="flex size-full flex-col items-center bg-gradient-to-b from-[#faf4ea] to-[#f1e3d0] px-[7cqw] pt-[14cqw] text-center">
      <div className="relative h-[72cqw] w-[68cqw] overflow-hidden rounded-t-full border border-[#c9a25e]/70 p-[1.5cqw]">
        <Photo alt={tt("Kelin va kuyov")} src="/images/couple.webp" className="size-full rounded-t-full" tone="rose" />
      </div>
      <p className="mt-[3cqw] font-script text-[8.3cqw] leading-tight text-[#8a6538]">Bekzod &amp; Malika</p>
      <p className="mb-[2.5cqw] font-serif text-[4.5cqw] italic text-[#9a7444]">{tt("To‘yga qadar")}</p>
      <Countdown />
      <p className="mt-[5cqw] font-serif text-[6.1cqw] italic text-[#7a5a33]">{tt("Dastur")}</p>
      <ul className="mt-[2cqw] flex w-full flex-col gap-[2.6cqw] border-l border-[rgba(184,146,90,0.5)] pl-[4cqw] text-left">
        {[
          ["17:00", "Mehmonlarni kutib olish"],
          ["18:00", "Nikoh marosimi"],
          ["20:00", "Bazm va raqslar"],
        ].map(([t, e]) => (
          <li key={t} className="relative flex items-baseline gap-[3cqw]">
            <span className="absolute -left-[5.3cqw] top-[1.3cqw] size-[2.4cqw] rounded-full bg-[#c9a25e]" />
            <span className="text-[3.2cqw] font-semibold text-[#7a5a33]">{t}</span>
            <span className="font-serif text-[4.5cqw] text-[#6e5a44]">{tt(e)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Features() {
  const t = useT();
  return (
    <section id="imkoniyatlar" className="relative scroll-mt-20 overflow-hidden bg-maroon px-5 py-20 lg:px-10 xl:px-[120px] lg:py-[120px]">
      <GirihPattern id="g-features" cell={72} color="#e2c48c" opacity={0.1} className="absolute inset-0" />

      <div className="relative mx-auto flex max-w-[1200px] flex-col items-center gap-14 lg:gap-[72px]">
        <div data-reveal="stagger" className="flex max-w-[725px] flex-col items-center gap-4 text-center">
          <h2 className="flex flex-wrap items-baseline justify-center gap-x-3.5 font-serif font-light text-ink-inverse">
            <span className="text-[36px] leading-[1.04] lg:text-[52px]">{t("Har bir taklifnomada")}</span>
            <em className="text-[42px] italic leading-none text-[#e2c48c] lg:text-[64px]">{t("nimalar bor?")}</em>
          </h2>
          <p className="t-body-m text-ink-inverse/80">{t("Mehmonlaringizga kerak bo‘ladigan hamma narsa — bitta sahifada.")}</p>
        </div>

        <div className="grid w-full items-center gap-10 lg:grid-cols-[1fr_330px_1fr] lg:gap-[35px]">
          <ul data-reveal="stagger" style={{ ["--d" as string]: "300ms" }} className="order-2 flex flex-col gap-8 lg:order-1 lg:gap-[108px]">
            {left.map((f, i) => (
              <Feature key={f.title} f={f} side="left" i={i} />
            ))}
          </ul>
          <PhoneFrame className="order-1 mx-auto w-[280px] lg:order-2 lg:w-[330px]" reveal="up" delay={100}>
            <InnerPage />
          </PhoneFrame>
          <ul data-reveal="stagger" style={{ ["--d" as string]: "450ms" }} className="order-3 flex flex-col gap-8 lg:gap-[108px]">
            {right.map((f, i) => (
              <Feature key={f.title} f={f} side="right" i={i} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
