"use client";

import type { Template } from "@/lib/templates";
import { ceremonyLabel, designSlug } from "@/lib/templates";
import { star8Path } from "@/lib/ornament";
import { useT } from "@/lib/i18n";
import { TemplateArt } from "@/components/invitation/TemplateArt";
import { HtmlFrame } from "./HtmlFrame";

/** Laptop ekranidagi shablon hero'si (1280×800 asosida, cqw bilan masshtablanadi) */
const u = (px: number) => `${((px / 1280) * 100).toFixed(3)}cqw`;


export function InvitationDesktop({ t }: { t: Template }) {
  const tt = useT();
  const img = !t.isLive ? t.images?.laptop : undefined;
  if (t.kind === "html" && !img) return <HtmlFrame src={t.previewUrl ?? `/api/tpl/${t.slug}/preview?v=${t.version ?? 1}`} baseWidth={1280} />;
  if (img) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={img}
        alt=""
        draggable={false}
        loading="lazy"
        decoding="async"
        className="block size-full select-none object-cover object-top"
        style={{ background: t.theme.bg[0] }}
      />
    );
  }
  const { theme } = t;
  const family =
    theme.script === "pinyon" ? "var(--font-script)" : theme.script === "cinzel" ? "var(--font-cinzel)" : "var(--font-cormorant)";
  return (
    <div
      className="relative size-full overflow-hidden"
      style={{ containerType: "inline-size", background: `linear-gradient(135deg, ${theme.bg[0]}, ${theme.bg[1]})` }}
    >
      <TemplateArt slug={designSlug(t)} variant="desktop" />
      <div className="absolute" style={{ inset: u(28), border: `1px solid ${theme.accent}`, opacity: 0.45 }} />
      <svg className="absolute" style={{ left: u(80), top: u(80), width: u(60), height: u(60) }} viewBox="0 0 40 40" aria-hidden>
        <path d={star8Path(20, 20, 19)} fill="none" stroke={theme.accent} strokeWidth="1" />
      </svg>
      <svg className="absolute" style={{ right: u(80), bottom: u(80), width: u(60), height: u(60) }} viewBox="0 0 40 40" aria-hidden>
        <path d={star8Path(20, 20, 19)} fill="none" stroke={theme.accent} strokeWidth="1" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span style={{ fontFamily: "var(--font-cormorant)", fontStyle: "italic", fontSize: u(30), color: theme.soft }}>
          {tt(ceremonyLabel[t.ceremony])}
        </span>
        <span
          style={{
            fontFamily: family,
            fontSize: theme.script === "cinzel" ? u(70) : u(110),
            lineHeight: 1.15,
            color: theme.accent,
            letterSpacing: theme.script === "cinzel" ? "0.05em" : undefined,
          }}
        >
          {t.sample.a}
          {t.sample.b ? ` & ${t.sample.b}` : ""}
        </span>
        <span style={{ fontFamily: "var(--font-cinzel)", fontSize: u(22), color: theme.ink, letterSpacing: "0.25em", marginTop: u(18) }}>
          {t.sample.date}
        </span>
        <span style={{ fontSize: u(15), color: theme.ink, opacity: 0.7, letterSpacing: "0.12em", marginTop: u(14), textTransform: "uppercase" }}>
          {tt(t.sample.venue)} · {t.sample.time}
        </span>
        <span
          className="rounded-full"
          style={{
            border: `1px solid ${theme.accent}`,
            color: theme.accent,
            fontFamily: "var(--font-cinzel)",
            fontSize: u(15),
            letterSpacing: "0.14em",
            padding: `${u(18)} ${u(38)}`,
            marginTop: u(44),
          }}
        >
          {tt("Taklifnomani ochish")}
        </span>
      </div>
    </div>
  );
}
