import type { Template } from "@/lib/templates";
import { ceremonyLabel, designSlug } from "@/lib/templates";
import { star8Path } from "@/lib/ornament";
import type { InvitationData } from "./types";
import { heroVariant, monogram, namesOf, s, type Palette } from "./theme";
import st from "./invitation.module.css";

export const invitePhrase: Record<InvitationData["ceremony"], string> = {
  nikoh: "sizni to‘yimizga taklif qiladi",
  fotiha: "sizni fotiha to‘yimizga taklif qiladi",
  sunnat: "sunnat to‘yi munosabati bilan sizni taklif qilamiz",
  "tugilgan-kun": "sizni tug‘ilgan kunimga taklif qilaman",
};

function Star({ size, color, outline = false }: { size: string; color: string; outline?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" style={{ width: size, height: size }} aria-hidden>
      <path d={star8Path(20, 20, outline ? 18.5 : 20)} fill={outline ? "none" : color} stroke={outline ? color : undefined} strokeWidth={outline ? 1 : undefined} />
    </svg>
  );
}

export function Divider({ color }: { color: string }) {
  return (
    <div className="flex items-center justify-center" style={{ gap: s(8) }} aria-hidden>
      <span style={{ width: s(56), height: 1, background: color, opacity: 0.6 }} />
      <Star size={s(12)} color={color} />
      <span style={{ width: s(56), height: 1, background: color, opacity: 0.6 }} />
    </div>
  );
}

/* ── Variantlar ── */

function Envelope({ d, p }: { d: InvitationData; p: Palette }) {
  return (
    <div className="relative mx-auto" style={{ width: s(260), height: s(250) }}>
      <div className="absolute inset-x-0 bottom-0" style={{ height: s(168), background: "#5a1625", borderRadius: s(4) }} />
      <div
        className={`${st.envCard} absolute flex flex-col items-center text-center`}
        style={{
          left: s(16),
          right: s(16),
          top: s(20),
          height: s(176),
          background: "#f5ede0",
          borderRadius: s(3),
          boxShadow: "0 4px 10px rgba(26,13,10,.16)",
          paddingTop: s(20),
        }}
      >
        <span style={{ fontFamily: p.script, fontSize: d.personB ? s(30) : s(36), color: "#6b2436", lineHeight: 1.15 }}>{namesOf(d.personA, d.personB)}</span>
        <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: s(14), color: "#8a6a55", marginTop: s(6), padding: `0 ${s(10)}` }}>
          {invitePhrase[d.ceremony]}
        </span>
      </div>
      <svg className="absolute inset-x-0 bottom-0" viewBox="0 0 260 168" style={{ width: "100%", height: s(168) }} aria-hidden>
        <path d="M0 0 L130 92 L260 0 V168 H0 Z" fill="#7a2335" />
        <path d="M0 168 L130 78 L260 168 Z" fill="#8a2a3e" />
      </svg>
      <div
        className={`${st.envSeal} absolute flex items-center justify-center rounded-full`}
        style={{
          left: "50%",
          marginLeft: `calc(${s(56)} / -2)`,
          top: s(156),
          width: s(56),
          height: s(56),
          background: "radial-gradient(circle at 35% 30%, #f0d48f, #c9a25e 55%, #9a7444)",
          boxShadow: "0 3px 6px rgba(0,0,0,.28)",
          fontFamily: "var(--font-cinzel)",
          fontSize: s(13),
          color: "#6e4a1a",
          letterSpacing: "0.06em",
        }}
      >
        {monogram(d.personA, d.personB)}
      </div>
    </div>
  );
}

function Arch({ d, p, t }: { d: InvitationData; p: Palette; t: Template }) {
  const bloom = t.palette[3] ?? t.palette[1] ?? p.accent;
  return (
    <div className="relative mx-auto" style={{ width: s(250), height: s(330) }}>
      <svg viewBox="0 0 250 330" className={`${st.archGlow} absolute inset-0 size-full`} aria-hidden>
        <path d="M6 330 V124 A119 119 0 0 1 244 124 V330" fill="none" stroke={p.accent} strokeWidth="1.2" />
        <path d="M14 330 V126 A111 111 0 0 1 236 126 V330" fill="none" stroke={p.accent} strokeWidth="0.6" opacity="0.6" />
      </svg>
      <div className="absolute inset-x-0 flex flex-col items-center text-center" style={{ top: s(96) }}>
        <Star size={s(12)} color={p.accent} />
        <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: s(14), color: p.accent, marginTop: s(10) }}>
          {ceremonyLabel[d.ceremony]} taklifnomasi
        </span>
        <span style={{ fontFamily: p.script, fontSize: d.personB ? s(40) : s(46), lineHeight: 1.1, color: p.heroSoft, marginTop: s(10) }}>
          {d.personA}
          {d.personB && (
            <>
              <br />
              &amp; {d.personB}
            </>
          )}
        </span>
      </div>
    </div>
  );
}

function Seal({ d, p, t }: { d: InvitationData; p: Palette; t: Template }) {
  const wax = t.palette[0];
  return (
    <div className="relative mx-auto flex flex-col items-center" style={{ width: s(264), paddingTop: s(8) }}>
      <div
        className="relative flex w-full flex-col items-center text-center"
        style={{
          background: "#fffdf7",
          border: `1px solid color-mix(in srgb, ${p.accent} 45%, transparent)`,
          borderRadius: s(4),
          padding: `${s(54)} ${s(18)} ${s(28)}`,
          boxShadow: "0 6px 18px rgba(40,30,10,.10)",
        }}
      >
        <span style={{ fontFamily: p.script, fontSize: d.personB ? s(34) : s(40), color: p.heroInk, lineHeight: 1.15 }}>{namesOf(d.personA, d.personB)}</span>
        <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: s(14), color: p.heroSoft, marginTop: s(8) }}>{invitePhrase[d.ceremony]}</span>
      </div>
      <div className="absolute flex" style={{ top: `calc(${s(8)} - ${s(34)})`, width: s(72), height: s(72) }}>
        {[st.sealHalfL, st.sealHalfR].map((cls, i) => (
          <div
            key={i}
            className={cls}
            style={{
              width: "50%",
              height: "100%",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              className="absolute flex items-center justify-center rounded-full"
              style={{
                width: s(72),
                height: s(72),
                left: i ? `calc(${s(72)} / -2)` : 0,
                background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${wax} 60%, white), ${wax} 60%, color-mix(in srgb, ${wax} 70%, black))`,
                boxShadow: "0 3px 8px rgba(0,0,0,.25)",
                color: "rgba(255,255,255,.85)",
                fontFamily: "var(--font-cinzel)",
                fontSize: s(18),
              }}
            >
              {monogram(d.personA, d.personB)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Ticket({ d, p }: { d: InvitationData; p: Palette }) {
  const [, mo, dd] = (d.date.match(/^(\d{4})-(\d{2})-(\d{2})/) ?? []).slice(0, 4);
  const time = d.date.slice(11, 16);
  const cell = (label: string, value: string) => (
    <div className="flex flex-col" style={{ gap: s(2) }}>
      <span style={{ fontSize: s(8), letterSpacing: "0.14em", color: p.heroSoft, textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-cinzel)", fontSize: s(13), color: p.heroInk }}>{value}</span>
    </div>
  );
  return (
    <div className="relative mx-auto flex" style={{ width: s(290), filter: "drop-shadow(0 6px 14px rgba(20,30,60,.14))" }}>
      <div
        className="flex flex-1 flex-col"
        style={{
          background: "#fffdf8",
          borderRadius: `${s(14)} 0 0 ${s(14)}`,
          padding: s(18),
          gap: s(14),
          borderRight: `2px dashed color-mix(in srgb, ${p.accent} 60%, transparent)`,
        }}
      >
        <div className="flex items-center justify-between">
          <span style={{ fontFamily: "var(--font-cinzel)", fontSize: s(12), letterSpacing: "0.2em", color: p.accent }}>BAXT REYSI</span>
          <svg viewBox="0 0 24 24" style={{ width: s(18), height: s(18) }} fill={p.heroInk} aria-hidden>
            <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
          </svg>
        </div>
        <div className="flex items-end justify-between" style={{ gap: s(8) }}>
          <div className="flex min-w-0 flex-col">
            <span style={{ fontSize: s(8), letterSpacing: "0.14em", color: p.heroSoft }}>YO‘LOVCHI</span>
            <span style={{ fontFamily: p.script, fontSize: s(26), color: p.heroInk, lineHeight: 1.1 }}>{d.personA}</span>
          </div>
          {d.personB && (
            <>
              <span style={{ color: p.accent, fontSize: s(16), paddingBottom: s(6) }}>✈</span>
              <div className="flex min-w-0 flex-col items-end">
                <span style={{ fontSize: s(8), letterSpacing: "0.14em", color: p.heroSoft }}>YO‘LOVCHI</span>
                <span style={{ fontFamily: p.script, fontSize: s(26), color: p.heroInk, lineHeight: 1.1 }}>{d.personB}</span>
              </div>
            </>
          )}
        </div>
        <div className="grid grid-cols-3" style={{ gap: s(8) }}>
          {cell("Sana", dd && mo ? `${dd}.${mo}` : "—")}
          {cell("Vaqt", time || "—")}
          {cell("O‘rin", "VIP")}
        </div>
      </div>
      <div
        className={`${st.ticketStub} flex flex-col items-center justify-between`}
        style={{ width: s(70), background: "#fffdf8", borderRadius: `0 ${s(14)} ${s(14)} 0`, padding: `${s(18)} ${s(8)}` }}
      >
        <span style={{ fontFamily: "var(--font-cinzel)", fontSize: s(18), color: p.accent }}>{monogram(d.personA, d.personB)}</span>
        <svg viewBox="0 0 40 60" style={{ width: s(34), height: s(52) }} aria-hidden>
          {Array.from({ length: 14 }, (_, i) => (
            <rect key={i} x={i * 2.8} y="0" width={i % 3 ? 1.2 : 2} height="60" fill={p.heroInk} opacity="0.75" />
          ))}
        </svg>
      </div>
    </div>
  );
}

function Gate({ d, p }: { d: InvitationData; p: Palette }) {
  const lattice = (
    <svg viewBox="0 0 100 200" className="absolute inset-0 size-full" preserveAspectRatio="none" aria-hidden>
      <rect x="4" y="4" width="92" height="192" fill="none" stroke={p.accent} strokeWidth="1.2" />
      {[40, 100, 160].map((y) => (
        <path key={y} d={star8Path(50, y, 18)} fill="none" stroke={p.accent} strokeWidth="1" />
      ))}
      <path d="M4 70 H96 M4 130 H96" stroke={p.accent} strokeWidth="0.6" opacity="0.6" />
    </svg>
  );
  return (
    <div className="relative mx-auto" style={{ width: s(240), height: s(300) }}>
      <svg viewBox="0 0 240 300" className="absolute inset-0 size-full" aria-hidden>
        <path d="M0 300 V110 A120 110 0 0 1 240 110 V300" fill="none" stroke={p.accent} strokeWidth="1.4" />
      </svg>
      <div
        className="absolute flex flex-col items-center justify-center text-center"
        style={{ inset: `${s(18)} ${s(14)} 0`, borderRadius: `${s(110)} ${s(110)} 0 0`, background: `radial-gradient(circle at 50% 40%, color-mix(in srgb, ${p.accent} 22%, transparent), transparent 70%)` }}
      >
        <span style={{ fontFamily: p.script, fontSize: d.personB ? s(28) : s(34), color: p.accent, lineHeight: 1.15, letterSpacing: "0.04em" }}>
          {d.personA}
          {d.personB && (
            <>
              <br />
              &amp; {d.personB}
            </>
          )}
        </span>
        <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: s(13), color: p.heroSoft, marginTop: s(10), padding: `0 ${s(12)}` }}>
          {invitePhrase[d.ceremony]}
        </span>
      </div>
      <div className="absolute flex overflow-hidden" style={{ inset: `${s(18)} ${s(14)} 0`, borderRadius: `${s(110)} ${s(110)} 0 0` }} aria-hidden>
        {[st.doorL, st.doorR].map((cls, i) => (
          <div key={i} className={`${st.door} ${cls} relative h-full w-1/2`} style={{ background: "linear-gradient(to bottom, #2b261e, #15120d)" }}>
            {lattice}
          </div>
        ))}
      </div>
    </div>
  );
}

function Eastern({ d, p }: { d: InvitationData; p: Palette }) {
  return (
    <div className="relative mx-auto flex items-center justify-center" style={{ width: s(270), height: s(270) }}>
      <svg viewBox="0 0 200 200" className={`${st.spin} absolute inset-0 size-full`} aria-hidden>
        <path d={star8Path(100, 100, 98)} fill="none" stroke={p.accent} strokeWidth="1" />
        <path d={star8Path(100, 100, 86)} fill="none" stroke={p.accent} strokeWidth="0.6" opacity="0.6" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (Math.PI / 4) * i;
          return <path key={i} d={star8Path(100 + Math.cos(a) * 92, 100 + Math.sin(a) * 92, 8)} fill={p.accent} opacity="0.75" />;
        })}
      </svg>
      <div className="relative flex flex-col items-center text-center" style={{ maxWidth: s(170) }}>
        <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: s(14), color: p.heroSoft }}>{ceremonyLabel[d.ceremony]}</span>
        <span style={{ fontFamily: p.script, fontSize: s(d.personB ? 22 : 26), color: p.accent, letterSpacing: "0.06em", lineHeight: 1.25, marginTop: s(6) }}>
          {namesOf(d.personA, d.personB)}
        </span>
      </div>
    </div>
  );
}

function Crown({ d, p }: { d: InvitationData; p: Palette }) {
  return (
    <div className="relative mx-auto flex flex-col items-center text-center" style={{ width: s(270) }}>
      <svg viewBox="0 0 120 70" className={st.crown} style={{ width: s(110) }} aria-hidden>
        <path d="M10 60 L4 18 L32 40 L60 6 L88 40 L116 18 L110 60 Z" fill="none" stroke={p.accent} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M12 66 H108" stroke={p.accent} strokeWidth="2.4" strokeLinecap="round" />
        {[
          [4, 18],
          [60, 6],
          [116, 18],
        ].map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r="4" fill={p.accent} />
        ))}
      </svg>
      <span style={{ fontFamily: p.script, fontSize: s(54), color: p.heroInk, lineHeight: 1.15, marginTop: s(8) }}>{namesOf(d.personA, d.personB)}</span>
      <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: s(15), color: p.heroSoft, marginTop: s(6) }}>{invitePhrase[d.ceremony]}</span>
      {/* konfetti */}
      <svg viewBox="0 0 270 160" className="pointer-events-none absolute inset-x-0 top-0 w-full" aria-hidden>
        {[
          [20, 30, "#e8c4c4"],
          [250, 40, "#b8875a"],
          [40, 120, "#b8875a"],
          [230, 130, "#e8c4c4"],
          [70, 12, "#c9a25e"],
          [205, 10, "#e8c4c4"],
        ].map(([x, y, c], i) => (
          <circle key={i} cx={x as number} cy={y as number} r={i % 2 ? 3 : 4} fill={c as string} />
        ))}
      </svg>
    </div>
  );
}

/** Hero san’ati — shablonga qarab */
export function HeroArt({ template, data, palette }: { template: Template; data: InvitationData; palette: Palette }) {
  switch (heroVariant[designSlug(template)] ?? "arch") {
    case "envelope":
      return <Envelope d={data} p={palette} />;
    case "seal":
      return <Seal d={data} p={palette} t={template} />;
    case "ticket":
      return <Ticket d={data} p={palette} />;
    case "gate":
      return <Gate d={data} p={palette} />;
    case "eastern":
      return <Eastern d={data} p={palette} />;
    case "crown":
      return <Crown d={data} p={palette} />;
    default:
      return <Arch d={data} p={palette} t={template} />;
  }
}

/** Hero'da yuqori "Taklifnoma" sarlavhasi kerakmi (arch/gate/eastern'da ismlar o‘zi markazda) */
export const heroShowsTitle = (slug: string) => {
  const v = heroVariant[slug] ?? "arch";
  return v === "envelope" || v === "seal" || v === "ticket" || v === "crown";
};
