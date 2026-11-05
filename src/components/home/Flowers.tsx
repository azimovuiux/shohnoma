/**
 * Gul kaskadi (Figma 137:19917, 980×551).
 * Hozircha SVG bilan chizilgan vaqtinchalik variant. Figma'dan fonsiz PNG/WebP eksport qilingach
 * `public/flowers/cascade.webp` ga qo‘yib, <FlowerArt/> o‘rniga <img> ishlatiladi.
 * Asl rasm: chap tomonda zich atirgullar, o‘ngga ingichka poya va barglar cho‘ziladi.
 * Oynadagi nusxa — scaleX(-1).
 */

type Bloom = { x: number; y: number; r: number; hue: "rose" | "blush" | "cream" | "white" };

const blooms: Bloom[] = [
  { x: 230, y: 300, r: 92, hue: "blush" },
  { x: 110, y: 360, r: 70, hue: "cream" },
  { x: 345, y: 360, r: 74, hue: "rose" },
  { x: 205, y: 430, r: 58, hue: "white" },
  { x: 455, y: 320, r: 52, hue: "cream" },
  { x: 560, y: 290, r: 38, hue: "blush" },
  { x: 40, y: 260, r: 44, hue: "white" },
  { x: 670, y: 260, r: 26, hue: "white" },
  { x: 790, y: 236, r: 18, hue: "blush" },
];

const palette = {
  rose: ["#d48d8f", "#e3a7a5", "#efc4bd", "#f8e1da"],
  blush: ["#e9b4a8", "#f1c9bd", "#f7ddd3", "#fcefe8"],
  cream: ["#eadbc0", "#f2e6d1", "#f8f0e2", "#fffaf2"],
  white: ["#ece7df", "#f4f0ea", "#faf8f4", "#ffffff"],
};

function Petals({ x, y, r, hue }: Bloom) {
  const c = palette[hue];
  const rings = [1, 0.78, 0.55, 0.32];
  return (
    <g transform={`translate(${x} ${y})`}>
      {rings.map((k, ri) => {
        const n = 7 - ri;
        return Array.from({ length: n }, (_, i) => (
          <ellipse
            key={`${ri}-${i}`}
            cx={0}
            cy={-r * k * 0.5}
            rx={r * k * 0.46}
            ry={r * k * 0.56}
            fill={c[ri]}
            stroke="rgba(120,70,60,.14)"
            strokeWidth="0.8"
            transform={`rotate(${(360 / n) * i + ri * 23})`}
          />
        ));
      })}
      <circle r={r * 0.1} fill="#d8b98a" opacity="0.7" />
    </g>
  );
}

function Leaf({ x, y, a, s = 1, tone = "#93a383" }: { x: number; y: number; a: number; s?: number; tone?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`}>
      <path d="M0 0 C 20 -16, 58 -14, 82 0 C 58 14, 20 16, 0 0 Z" fill={tone} opacity="0.85" />
      <path d="M3 0 L78 0" stroke="#6f8460" strokeWidth="0.9" opacity="0.7" />
    </g>
  );
}

export function FlowerArt({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 980 551" className={className} style={style} aria-hidden preserveAspectRatio="xMidYMid meet">
      {/* poyalar */}
      <path d="M300 340 C 480 300, 640 250, 960 210" stroke="#7d8f6c" strokeWidth="2" fill="none" />
      <path d="M380 380 C 560 370, 700 330, 900 300" stroke="#7d8f6c" strokeWidth="1.5" fill="none" />
      <path d="M260 420 C 420 470, 600 470, 760 430" stroke="#7d8f6c" strokeWidth="1.2" fill="none" />
      {/* barglar */}
      <Leaf x={120} y={250} a={210} s={1.3} />
      <Leaf x={300} y={230} a={-60} s={1.1} tone="#a3b394" />
      <Leaf x={420} y={420} a={30} s={1.2} />
      <Leaf x={600} y={300} a={-20} s={0.9} tone="#a3b394" />
      <Leaf x={720} y={262} a={-150} s={0.8} />
      <Leaf x={820} y={232} a={-10} s={0.7} tone="#a3b394" />
      <Leaf x={690} y={440} a={20} s={0.7} />
      <Leaf x={60} y={430} a={160} s={1.1} tone="#a3b394" />
      <Leaf x={520} y={350} a={60} s={0.8} />
      {blooms.map((b, i) => (
        <Petals key={i} {...b} />
      ))}
      {/* mayda kurtaklar */}
      {[
        [880, 208, 7],
        [930, 214, 5],
        [850, 300, 6],
        [760, 430, 6],
        [620, 450, 7],
        [520, 250, 6],
      ].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="#f7ddd3" stroke="rgba(120,70,60,.18)" />
      ))}
    </svg>
  );
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
