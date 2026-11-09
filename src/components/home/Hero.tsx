"use client";

import Link from "@/components/LocalLink";
import "@fontsource/great-vibes/cyrillic-400.css";
import "@fontsource/great-vibes/latin-400.css";
import { useLocale, useT } from "@/lib/i18n";
import type { CSSProperties, ReactNode } from "react";
import { ArrowRight } from "@/components/icons";
import { site } from "@/lib/site";

/*
 * Bosh sahifa hero (Figma 208:17210, 1440×900).
 * O‘ng kompozitsiya — «sahna»: Figma’dagi x 560…1440 oralig‘i (880×900). Barcha o‘lchamlar cqw da,
 * shuning uchun desktopda aynan Figma’dagidek, telefonda esa ekran eniga masshtablanadi.
 */
const STAGE_X = 560;
const u = (px: number) => `${((px / 880) * 100).toFixed(4)}cqw`;

/** Figma relativeTransform [[a,c,tx],[b,d,ty]] bo‘yicha joylashtirilgan qatlam */
function Layer({
  t,
  w,
  h,
  z,
  ri,
  delay = 0,
  className = "",
  blend,
  style,
  children,
}: {
  t: [[number, number, number], [number, number, number]];
  w: number;
  h: number;
  z?: number;
  ri?: string;
  delay?: number;
  className?: string;
  /** mix-blend-mode — transformli tashqi qatlamga qo‘yiladi (aks holda izolyatsiyada ishlamaydi) */
  blend?: CSSProperties["mixBlendMode"];
  style?: CSSProperties;
  children: ReactNode;
}) {
  const [[a, c, tx], [b, d, ty]] = t;
  return (
    <div
      className="absolute origin-top-left"
      style={{ left: u(tx - STAGE_X), top: u(ty), width: u(w), height: u(h), transform: `matrix(${a},${b},${c},${d},0,0)`, zIndex: z, mixBlendMode: blend }}
    >
      <div data-ri={ri} className={`size-full ${className}`} style={{ ...style, ["--rd" as string]: `${delay}ms` }}>
        {children}
      </div>
    </div>
  );
}

function Img({ src, className = "", fit = "cover" }: { src: string; className?: string; fit?: "cover" | "contain" }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" draggable={false} className={`block size-full select-none ${fit === "cover" ? "object-cover" : "object-contain"} ${className}`} />;
}

/** Qog‘oz taklifnoma (Figma «Qog‘oz taklifnoma», 420×580) */
/** Qo‘lyozma so‘zlar: Pinyon Script’da kirill harflari yo‘q — ruschada Great Vibes */
const SCRIPT_RU = "font-['Great_Vibes',cursive]";

function Paper() {
  const t = useT();
  const ru = useLocale() === "ru";
  const script = ru ? SCRIPT_RU : "font-script";
  return (
    <div className="flex size-full items-center justify-center border border-[#e9dcc6] bg-[#fffdf8] shadow-[0_30px_60px_rgba(77,46,26,0.2)]" style={{ paddingInline: u(40) }}>
      <div className="flex w-full flex-col items-center border border-[#d9b97a]/70 text-center" style={{ height: u(398), paddingTop: u(44), gap: u(6) }}>
        <span className="font-cormorant font-light italic leading-tight text-gold" style={{ fontSize: u(22) }}>
          {t("Nikoh to‘yi")}
        </span>
        <span className={`${script} whitespace-nowrap leading-[1.15] text-maroon`} style={{ fontSize: u(ru ? 50 : 62) }}>
          {ru ? "Приглашение" : "Taklifnoma"}
        </span>
        <span className="bg-[#d9b97a]" style={{ width: u(56), height: 1 }} />
        <span className={`${script} leading-[1.1] text-ink`} style={{ fontSize: u(46) }}>
          {ru ? "Жасур" : "Jasur"}
        </span>
        <span className="font-cormorant font-light italic leading-tight text-gold" style={{ fontSize: u(20) }}>
          {t("va")}
        </span>
        <span className={`${script} leading-[1.1] text-ink`} style={{ fontSize: u(46) }}>
          {ru ? "Мадина" : "Madina"}
        </span>
        <span className="font-cinzel text-maroon" style={{ fontSize: u(15), letterSpacing: "0.22em" }}>
          12 · 09 · 2026
        </span>
        <span className="font-cormorant font-light text-ink-2" style={{ fontSize: u(17) }}>
          {t("Toshkent, «Oqsaroy» to‘yxonasi")}
        </span>
      </div>
    </div>
  );
}

/** Qo‘ldagi telefon ekrani (Figma «Ekran — Bordo maktub», 188.55×394) */
function PhoneScreen() {
  const t = useT();
  const ru = useLocale() === "ru";
  return (
    <div
      className="absolute flex flex-col items-center bg-maroon text-center"
      style={{ left: u(176.74), top: u(59), width: u(188.55), height: u(394), borderRadius: u(26), paddingTop: u(30), paddingInline: u(12), gap: u(5) }}
    >
      <span className="font-cormorant font-light italic leading-tight text-[#d9b97a]" style={{ fontSize: u(13) }}>
        {t("Nikoh to‘yi")}
      </span>
      <span className={`${ru ? SCRIPT_RU : "font-script"} leading-[1.2] text-[#fbf7f1]`} style={{ fontSize: u(22) }}>
        {ru ? "Жасур & Мадина" : "Jasur & Madina"}
      </span>
      <span className="font-cinzel text-[#d9b97a]" style={{ fontSize: u(9), letterSpacing: "0.18em" }}>
        12 · 09 · 2026
      </span>
      <span className="overflow-hidden" style={{ width: u(160), height: u(132), borderRadius: u(10) }}>
        <Img src="/images/couple.webp" />
      </span>
      <span className="flex" style={{ gap: u(6) }}>
        {[
          ["12", "kun"],
          ["08", "soat"],
          ["45", "daqiqa"],
        ].map(([n, l]) => (
          <span key={l} className="flex flex-col items-center bg-white/10 font-inter text-[#fbf7f1]" style={{ borderRadius: u(8), paddingBlock: u(5), paddingInline: u(8) }}>
            <span className="font-semibold leading-tight" style={{ fontSize: u(12) }}>
              {n}
            </span>
            <span className="leading-tight opacity-80" style={{ fontSize: u(8) }}>
              {t(l)}
            </span>
          </span>
        ))}
      </span>
      <span className="bg-[#d9b97a] font-inter font-semibold text-maroon" style={{ fontSize: u(10), borderRadius: u(20), paddingBlock: u(7), paddingInline: u(16) }}>
        {t("Javob qoldirish")}
      </span>
    </div>
  );
}

/* So‘zana 1440 dan keng ekranlarda kanvasdan chiqib qoladi — o‘ng chetini yumshoq so‘ndiramiz (1440 da bu qism ko‘rinmaydi) */
const sozanaFade: CSSProperties = {
  maskImage: "linear-gradient(to right, #000 62%, transparent 96%)",
  WebkitMaskImage: "linear-gradient(to right, #000 62%, transparent 96%)",
};

/** O‘ng kompozitsiya — Figma qatlamlari tartibida */
function Stage() {
  return (
    <div data-reveal="group" className="relative size-full bg-[#f7f1e7]" style={{ containerType: "inline-size" }}>
      <Layer t={[[0.4872, -0.8733, 779.79], [0.8733, 0.4872, 450]]} w={445.93} h={595.21} ri="fade" delay={500}>
        <Img src="/images/hero/lenta.webp" />
      </Layer>
      <Layer t={[[1, 0, 640], [0, 1, -40]]} w={720} h={405} ri="fade" delay={100}>
        <Img src="/images/hero/barglar.webp" />
      </Layer>
      <Layer t={[[0.9703, 0.2419, 1200], [-0.2419, 0.9703, -150]]} w={380} h={380} ri="fade" delay={300} blend="multiply" style={sozanaFade}>
        <Img src="/images/hero/sozana.webp" />
      </Layer>
      <Layer t={[[0.9962, 0.0872, 800], [-0.0872, 0.9962, 120]]} w={420} h={580} ri="up" delay={200}>
        <Paper />
      </Layer>
      <Layer t={[[0.9848, 0.1736, 812.48], [-0.1736, 0.9848, 136.65]]} w={122.38} h={144.66} ri="pop" delay={900}>
        <Img src="/images/hero/marka.webp" />
      </Layer>
      <Layer t={[[0.9945, -0.1045, 572.12], [0.1045, 0.9945, 601.84]]} w={705.09} h={396.61} ri="up" delay={600}>
        <Img src="/images/hero/gul-shoxcha.webp" />
      </Layer>
      <Layer t={[[0.9945, 0.1045, 960], [-0.1045, 0.9945, 250]]} w={540} h={720} ri="right" delay={450}>
        <div className="relative size-full">
          <Img src="/images/hero/qol-telefon.webp" />
          <PhoneScreen />
        </div>
      </Layer>
    </div>
  );
}

export function Hero() {
  const t = useT();
  const locale = useLocale();
  return (
    <section className="relative overflow-hidden bg-[#f7f1e7]">
      {/* lg+: butun kompozitsiya 1440×900 Figma kanvasi, ekran eniga proporsional (cqw) masshtablanadi */}
      <div className="relative mx-auto max-w-[1440px] lg:aspect-[1440/900] lg:[container-type:inline-size]">
        {/* Matn */}
        <div data-reveal="stagger" className="relative z-10 flex flex-col items-start px-5 pt-10 lg:absolute lg:left-[8.3333%] lg:top-[23.4444%] lg:w-[48.6111%] lg:px-0 lg:pt-0">
          {/* Ruscha satrlar uzunroq — sarlavha shrifti kichikroq, har satr bitta qatorda qoladi */}
          <h1
            data-split
            className={`flex flex-col font-serif font-normal leading-[0.9] tracking-[-0.02em] text-ink ${
              locale === "ru" ? "text-[42px] sm:text-[60px] lg:text-[4.75cqw] lg:[&>*]:whitespace-nowrap" : "text-[48px] sm:text-[72px] lg:text-[7.0833cqw]"
            }`}
          >
            <span>{t("Har bir to‘y —")}</span>
            <span>{t("o‘z hikoyasi.")}</span>
            <em className="italic text-maroon">{t("Taklifnomasi ham.")}</em>
          </h1>
          <p className="mt-[26px] max-w-[460px] font-sans text-[16px] leading-[1.6] text-ink-2 lg:mt-[1.8cqw] lg:max-w-[max(400px,31.94cqw)] lg:text-[max(15px,1.25cqw)]">
            {t("Tayyor dizayn asosida 2 daqiqada yaratiladigan taklifnoma sayti. Bitta havolada — vaqt, xarita, musiqa va mehmonlar javobi.")}
          </p>
          <div className="mt-9 flex flex-wrap gap-3 lg:mt-[max(24px,2.5cqw)]">
            <Link href="/#shablonlar" className="btn btn-primary">
              {t("Shablonlarni ko‘rish")} <ArrowRight size={16} />
            </Link>
            <a href={site.telegram} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              {t("Telegramda yozish")}
            </a>
          </div>
        </div>

        {/* Anor — chap pastda (faqat desktop) */}
        <div
          className="absolute left-[4.8611%] top-[81.6667%] hidden h-[15.1389cqw] w-[20.1389%] origin-top-left mix-blend-multiply lg:block"
          style={{ transform: "matrix(0.9976,0.0698,-0.0698,0.9976,0,0)" }}
        >
          <div data-reveal="fade" style={{ ["--d" as string]: "700ms" }} className="size-full">
            <Img src="/images/hero/anor.webp" />
          </div>
        </div>

        {/* O‘ng kompozitsiya: desktopda Figma koordinatalarida, telefonda ekran eniga */}
        <div className="relative mt-6 aspect-[880/900] w-full lg:absolute lg:left-[38.8889%] lg:top-0 lg:mt-0 lg:h-full lg:w-[61.1111%] lg:aspect-auto">
          <Stage />
        </div>
      </div>
    </section>
  );
}
