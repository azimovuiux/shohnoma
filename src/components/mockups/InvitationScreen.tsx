import type { Template } from "@/lib/templates";
import { ceremonyLabel } from "@/lib/templates";
import { star8Path } from "@/lib/ornament";
import { TemplateArt } from "@/components/invitation/TemplateArt";

/** 280px kenglikdagi Figma o‘lchamini konteyner kengligiga moslash (cqw) */
const u = (px: number) => `${((px / 280) * 100).toFixed(3)}cqw`;

const scriptFamily = {
  pinyon: "var(--font-script)",
  cinzel: "var(--font-cinzel)",
  cormorant: "var(--font-serif)",
} as const;

function Divider({ color }: { color: string }) {
  return (
    <div className="flex items-center justify-center" style={{ gap: u(6) }}>
      <span style={{ width: u(44), height: 1, background: color, opacity: 0.6 }} />
      <svg viewBox="0 0 40 40" style={{ width: u(9), height: u(9) }} aria-hidden>
        <path d={star8Path(20, 20, 20)} fill={color} />
      </svg>
      <span style={{ width: u(44), height: 1, background: color, opacity: 0.6 }} />
    </div>
  );
}

/** Bordo maktub — konvert, muhr (Figma 33:131) */
function Envelope({ t }: { t: Template }) {
  const initials = `${t.sample.a[0]}${t.sample.b?.[0] ?? ""}`;
  return (
    <div className="relative mx-auto" style={{ width: u(203), height: u(195) }}>
      <div className="absolute inset-x-0 bottom-0" style={{ height: u(131), background: "#5a1625", borderRadius: u(3) }} />
      <div
        className="absolute flex flex-col items-center"
        style={{
          left: u(12.5),
          right: u(12.5),
          top: u(15.6),
          height: u(137),
          background: "#f5ede0",
          borderRadius: u(2.3),
          boxShadow: "0 3px 8px rgba(26,13,10,.16)",
          paddingTop: u(14),
        }}
      >
        <span style={{ fontFamily: "var(--font-script)", fontSize: u(23.4), color: "#6b2436", lineHeight: 1.2 }}>
          {t.sample.a}{t.sample.b ? <> &amp; {t.sample.b}</> : null}
        </span>
        <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: u(10.9), color: "#8a6a55" }}>
          sizni to‘yimizga taklif qiladi
        </span>
      </div>
      <svg className="absolute inset-x-0 bottom-0" viewBox="0 0 203 131" style={{ width: "100%", height: u(131) }} aria-hidden>
        <path d="M0 0 L101.5 70 L203 0 V131 H0 Z" fill="#7a2335" />
        <path d="M0 131 L101.5 60 L203 131 Z" fill="#8a2a3e" />
      </svg>
      <div
        className="absolute flex items-center justify-center rounded-full"
        style={{
          left: "50%",
          transform: "translateX(-50%)",
          top: u(122),
          width: u(44),
          height: u(44),
          background: "radial-gradient(circle at 35% 30%, #f0d48f, #c9a25e 55%, #9a7444)",
          boxShadow: "0 2px 4px rgba(0,0,0,.25)",
          fontFamily: "var(--font-cinzel)",
          fontSize: u(10.1),
          color: "#6e4a1a",
          letterSpacing: "0.06em",
        }}
      >
        {initials}
      </div>
    </div>
  );
}

/** Ravoq (arch) — Oltin ravoq va boshqa ochiq fonli shablonlar uchun */
function ArchNames({ t, family }: { t: Template; family: string }) {
  const { theme } = t;
  return (
    <div className="relative mx-auto" style={{ width: u(224), height: u(342) }}>
      <svg viewBox="0 0 224 342" className="absolute inset-0 size-full" aria-hidden>
        <path d="M4 342 V112 A108 108 0 0 1 220 112 V342" fill="none" stroke={theme.accent} strokeWidth="1" />
        <path d="M11 342 V114 A101 101 0 0 1 213 114 V342" fill="none" stroke={theme.accent} strokeWidth="0.6" opacity="0.6" />
      </svg>
      <div className="absolute inset-x-0 flex flex-col items-center text-center" style={{ top: u(76) }}>
        <svg viewBox="0 0 40 40" style={{ width: u(11), height: u(11), marginBottom: u(10) }} aria-hidden>
          <path d={star8Path(20, 20, 20)} fill={theme.accent} />
        </svg>
        <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: u(12.4), color: theme.accent }}>
          {ceremonyLabel[t.ceremony]} taklifnomasi
        </span>
        <span
          style={{
            fontFamily: family,
            fontSize: theme.script === "cinzel" ? u(24) : u(35),
            lineHeight: 1.15,
            color: theme.soft,
            marginTop: u(8),
            letterSpacing: theme.script === "cinzel" ? "0.06em" : undefined,
          }}
        >
          {t.sample.a}
          {t.sample.b && (
            <>
              <br />
              &amp; {t.sample.b}
            </>
          )}
        </span>
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 500,
            fontSize: u(15.5),
            color: theme.ink,
            letterSpacing: "0.08em",
            marginTop: u(16),
          }}
        >
          {t.sample.date.replace(/ · /g, "  |  ")}
        </span>
        <span
          style={{ fontSize: u(7.8), color: theme.accent, letterSpacing: "0.14em", textTransform: "uppercase", marginTop: u(8) }}
        >
          {t.sample.venue} · {t.sample.time}
        </span>
      </div>
    </div>
  );
}

export function InvitationScreen({ t }: { t: Template }) {
  const { theme } = t;
  const family = scriptFamily[theme.script];
  const isEnvelope = t.slug === "bordo-maktub";

  return (
    <div
      className="relative size-full overflow-hidden"
      style={{ containerType: "inline-size", background: `linear-gradient(to bottom, ${theme.bg[0]}, ${theme.bg[1]})` }}
    >
      {isEnvelope ? (
        <>
          <div className="absolute" style={{ inset: u(11), border: `1px solid rgba(217,185,122,.45)` }} />
          <div className="absolute" style={{ inset: u(15.6), border: `1px solid rgba(217,185,122,.25)` }} />
        </>
      ) : null}

      <TemplateArt slug={t.slug} />
      <div className="relative flex h-full flex-col items-center text-center" style={{ paddingTop: isEnvelope ? u(54) : u(40) }}>
        {isEnvelope ? (
          <>
            <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: u(14), color: theme.soft }}>
              {ceremonyLabel[t.ceremony]}
            </span>
            <span style={{ fontFamily: family, fontSize: u(43.7), color: theme.accent, lineHeight: 1.25 }}>Taklifnoma</span>
            <span style={{ fontFamily: "var(--font-cinzel)", fontSize: u(10.1), color: theme.ink, letterSpacing: "0.22em" }}>
              {t.sample.date}
            </span>
            <div style={{ marginTop: u(12) }}>
              <Envelope t={t} />
            </div>
            <div style={{ marginTop: u(18) }}>
              <Divider color={theme.accent} />
            </div>
          </>
        ) : (
          <ArchNames t={t} family={family} />
        )}

        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: isEnvelope ? u(18.7) : u(17),
            color: theme.ink,
            marginTop: isEnvelope ? u(10) : u(24),
          }}
        >
          Aziz mehmonlar!
        </span>
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: u(11.7),
            lineHeight: 1.3,
            color: theme.ink,
            opacity: 0.8,
            width: u(195),
            marginTop: u(6),
          }}
        >
          Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.
        </span>
        <span
          className="rounded-full"
          style={{
            border: `1px solid ${theme.accent}`,
            color: theme.accent,
            fontFamily: "var(--font-cinzel)",
            fontSize: u(8.6),
            letterSpacing: "0.14em",
            padding: `${u(10)} ${u(20)}`,
            marginTop: u(22),
          }}
        >
          Taklifnomani ochish
        </span>
        {isEnvelope && (
          <span style={{ fontSize: u(8.6), color: theme.ink, opacity: 0.6, letterSpacing: "0.06em", marginTop: u(22) }}>
            {t.sample.venue} · {t.sample.time}
          </span>
        )}
      </div>
    </div>
  );
}
