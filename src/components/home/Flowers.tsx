/** Figma "Gul kaskadi" (137:19917) — fonsiz WebP. Asl rasm: zich gullar chapda, poyalar o‘ngga. */
export function FlowerArt({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/images/flowers-cascade.webp" alt="" aria-hidden draggable={false} className={`select-none object-contain ${className}`} style={style} />;
}

/** Hero: telefonlar ostidan ikki yonga ochiladigan gullar (spec §9.1) */
export function HeroFlowers() {
  return (
    <>
      {/* Desktop — Figma koordinatalari (1440 kenglikda): chap 400×225 @ (680,679) oynada; o‘ng 370×208 @ (1070,686) */}
      <div className="pointer-events-none absolute left-[680px] top-[679px] z-[1] hidden h-[225px] w-[400px] lg:block">
        <div className="hero-petals-left size-full">
          <FlowerArt className="size-full -scale-x-100" />
        </div>
      </div>
      <div className="pointer-events-none absolute left-[1070px] top-[686px] z-[1] hidden h-[208px] w-[370px] lg:block">
        <div className="hero-petals-right-plain size-full">
          <FlowerArt className="size-full" />
        </div>
      </div>
    </>
  );
}

/** Mobil hero gullari — vizual blok ichida */
export function HeroFlowersMobile() {
  return (
    <>
      <div className="pointer-events-none absolute -left-[38%] top-[76%] z-[1] h-[22%] w-[77%] lg:hidden">
        <div className="hero-petals-left size-full">
          <FlowerArt className="size-full -scale-x-100" />
        </div>
      </div>
      <div className="pointer-events-none absolute left-[50%] top-[77%] z-[1] h-[21%] w-[74%] lg:hidden">
        <div className="hero-petals-right-plain size-full">
          <FlowerArt className="size-full" />
        </div>
      </div>
    </>
  );
}

/** Yakuniy so‘z bo‘limi: gullar ochilib, matn chiqadi (spec §9.2) */
export function FinaleFlowers() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className="absolute left-[-400px] top-[24px] h-[315px] w-[560px] lg:left-[calc(50%-1240px)] lg:top-[135px] lg:h-[551px] lg:w-[980px]">
        <div className="finale-petals-left size-full">
          <FlowerArt className="size-full" />
        </div>
      </div>
      <div className="absolute left-[230px] top-[24px] h-[315px] w-[560px] lg:left-[calc(50%+260px)] lg:top-[135px] lg:h-[551px] lg:w-[980px]">
        <div className="finale-petals-right-plain size-full">
          <FlowerArt className="size-full -scale-x-100" />
        </div>
      </div>
    </div>
  );
}
