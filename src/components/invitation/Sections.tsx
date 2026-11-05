"use client";

import { useEffect, useRef, useState } from "react";
import { Location } from "@/components/icons";
import { star8Path } from "@/lib/ornament";
import { splitDate, tashkentDate, monthsUz } from "@/lib/display";
import type { InvitationData } from "./types";
import { s, type Palette } from "./theme";

export function mapHref(d: Pick<InvitationData, "mapUrl" | "venueName" | "address">) {
  if (d.mapUrl) return d.mapUrl;
  return `https://yandex.uz/maps/?text=${encodeURIComponent([d.venueName, d.address].filter(Boolean).join(", "))}`;
}

function ScriptTitle({ children, color, font }: { children: React.ReactNode; color: string; font: string }) {
  return <h2 style={{ fontFamily: font, fontSize: font.includes("cinzel") ? s(30) : s(48), color, lineHeight: 1.2, letterSpacing: font.includes("cinzel") ? "0.08em" : undefined }}>{children}</h2>;
}

/* ── Sanoq ── */

function parts(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(t / 86400), Math.floor((t % 86400) / 3600), Math.floor((t % 3600) / 60), t % 60];
}

export function Countdown({ date, p }: { date: string; p: Palette }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(date)) return null;
  const target = tashkentDate(date).getTime();
  const left = now === null ? null : target - now;
  const v = left === null ? null : parts(left);
  const labels = ["kun", "soat", "daqiqa", "soniya"];
  return (
    <section className="text-center" style={{ background: `linear-gradient(to bottom, ${p.deep}, ${p.deep2})`, padding: `${s(36)} ${s(24)} ${s(48)}` }} aria-label="To‘yga qadar">
      <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: s(26), color: p.onDeep }}>
        {left !== null && left <= 0 ? "Baxtli kun keldi!" : "To‘yga qadar"}
      </p>
      <div className="mx-auto grid grid-cols-4" style={{ gap: s(10), marginTop: s(20), maxWidth: s(300) }} role="timer" aria-live="off">
        {labels.map((l, i) => (
          <div
            key={l}
            className="flex flex-col items-center justify-center"
            style={{ height: s(76), borderRadius: s(12), background: "rgba(255,255,255,.06)", border: `1px solid color-mix(in srgb, ${p.accentDeep} 50%, transparent)` }}
          >
            <span style={{ fontFamily: "var(--font-serif)", fontWeight: 500, fontSize: s(30), lineHeight: 1, color: p.accentDeep }}>
              {v ? String(v[i]).padStart(2, "0") : "··"}
            </span>
            <span style={{ fontSize: s(9), fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: p.onDeep, opacity: 0.7, marginTop: s(8) }}>{l}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Dastur ── */

export function Program({ items, p }: { items: InvitationData["program"]; p: Palette }) {
  if (!items.length) return null;
  return (
    <section className="flex flex-col items-center" style={{ background: p.paper, padding: `${s(30)} ${s(32)} ${s(40)}` }}>
      <ScriptTitle color={p.heading} font={p.script}>
        Dastur
      </ScriptTitle>
      <ol className="relative w-full" style={{ marginTop: s(28), maxWidth: s(300) }}>
        <span className="absolute" style={{ left: s(76), top: s(8), bottom: s(8), width: 1, background: `color-mix(in srgb, ${p.accent} 50%, transparent)` }} aria-hidden />
        {items.map((it) => (
          <li key={`${it.time}-${it.title}`} className="relative flex items-baseline" style={{ gap: s(32), padding: `${s(14)} 0` }}>
            <span style={{ fontFamily: "var(--font-cinzel)", fontSize: s(14), color: p.heading, width: s(54), flexShrink: 0 }}>{it.time}</span>
            <span className="absolute rounded-full" style={{ left: `calc(${s(76)} - ${s(4)})`, top: s(22), width: s(9), height: s(9), background: p.accent }} aria-hidden />
            <span style={{ fontFamily: "var(--font-serif)", fontSize: s(18), color: p.text, lineHeight: 1.25 }}>{it.title}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ── Manzil ── */

function MapArt({ p }: { p: Palette }) {
  return (
    <svg viewBox="0 0 312 160" className="block w-full" style={{ borderRadius: s(14) }} aria-hidden>
      <rect width="312" height="160" fill="#e9e3d6" />
      <g fill="#f7f3ea">
        {[
          [8, 8, 70, 40],
          [90, 8, 60, 40],
          [162, 8, 80, 40],
          [254, 8, 50, 40],
          [8, 60, 50, 46],
          [70, 60, 90, 46],
          [172, 60, 60, 46],
          [244, 60, 60, 46],
          [8, 118, 80, 34],
          [100, 118, 70, 34],
          [182, 118, 122, 34],
        ].map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} rx="3" />
        ))}
      </g>
      <rect x="182" y="118" width="40" height="34" rx="3" fill="#cfe0c4" />
      <path d="M0 52 H312 M0 112 H312 M84 0 V160 M166 0 V160 M238 0 V160" stroke="#fff" strokeWidth="5" />
      <path d="M0 140 C 80 120, 140 150, 312 96" stroke="#f1d9a8" strokeWidth="6" fill="none" />
      <g transform="translate(156 46)">
        <path d="M0 40 C -14 22, -20 14, -20 2 A20 20 0 0 1 20 2 C 20 14, 14 22, 0 40 Z" fill={p.heading} />
        <circle cx="0" cy="2" r="7" fill="#fff" />
      </g>
    </svg>
  );
}

export function Venue({ d, p, linkable }: { d: InvitationData; p: Palette; linkable: boolean }) {
  if (!d.venueName && !d.address) return null;
  return (
    <section className="flex flex-col items-center text-center" style={{ background: p.paper, padding: `${s(8)} ${s(24)} ${s(40)}` }}>
      <svg viewBox="0 0 40 40" style={{ width: s(12), height: s(12) }} aria-hidden>
        <path d={star8Path(20, 20, 20)} fill={p.accent} />
      </svg>
      <div style={{ marginTop: s(8) }}>
        <ScriptTitle color={p.heading} font={p.script}>
          Manzil
        </ScriptTitle>
      </div>
      <div className="w-full" style={{ marginTop: s(20), maxWidth: s(312) }}>
        <MapArt p={p} />
      </div>
      <p style={{ fontFamily: "var(--font-cinzel)", fontSize: s(15), letterSpacing: "0.08em", color: p.text, marginTop: s(20), textTransform: "uppercase" }}>{d.venueName}</p>
      {d.address && <p style={{ fontSize: s(12), color: p.text, opacity: 0.75, marginTop: s(6) }}>{d.address}</p>}
      <a
        href={linkable ? mapHref(d) : undefined}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center rounded-full font-semibold"
        style={{ background: p.heading, color: "#fff", fontSize: s(12), padding: `${s(13)} ${s(22)}`, marginTop: s(18), gap: s(8) }}
      >
        <Location size={14} /> Xaritada ochish
      </a>
    </section>
  );
}

/* ── Galereya ── */

export function Gallery({ photos, p, onOpen }: { photos: string[]; p: Palette; onOpen: (i: number) => void }) {
  if (!photos.length) return null;
  return (
    <section style={{ background: p.paper, padding: `${s(8)} 0 ${s(40)}` }}>
      <div className="text-center">
        <h2 style={{ fontFamily: p.script, fontSize: p.script.includes("cinzel") ? s(28) : s(44), color: p.heading, lineHeight: 1.2 }}>Lahzalar</h2>
      </div>
      <div className="flex snap-x snap-mandatory overflow-x-auto" style={{ gap: s(10), padding: `${s(20)} ${s(24)} ${s(4)}`, scrollbarWidth: "none" }}>
        {photos.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => onOpen(i)}
            className="shrink-0 snap-center overflow-hidden"
            style={{ width: photos.length === 1 ? "100%" : s(220), aspectRatio: "3/4", borderRadius: s(14), border: `1px solid color-mix(in srgb, ${p.accent} 40%, transparent)` }}
            aria-label={`Suratni kattalashtirish (${i + 1})`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" loading="lazy" className="size-full object-cover" />
          </button>
        ))}
      </div>
    </section>
  );
}

/* ── Javob ── */

export function RsvpBlock({
  d,
  p,
  answered,
  onAnswer,
  onEdit,
}: {
  d: InvitationData;
  p: Palette;
  answered: { name: string } | null;
  onAnswer: (status: "coming" | "not_coming") => void;
  onEdit: () => void;
}) {
  if (!d.rsvpEnabled) return null;
  const dl = d.rsvpDeadline ? splitDate(d.rsvpDeadline) : null;
  const deadline = dl ? `${Number(dl.iso.slice(8, 10))}-${monthsUz[Number(dl.iso.slice(5, 7)) - 1]}gacha` : null;
  return (
    <section className="flex flex-col items-center text-center" style={{ background: `linear-gradient(to bottom, ${p.deep2}, ${p.deep})`, padding: `${s(40)} ${s(24)} ${s(48)}` }}>
      <h2 style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: s(32), color: p.onDeep }}>Kelasizmi?</h2>
      <p style={{ fontFamily: "var(--font-serif)", fontSize: s(16), color: p.onDeep, opacity: 0.85, maxWidth: s(260), marginTop: s(12), lineHeight: 1.35 }}>
        {deadline ? `Iltimos, ${deadline} javob bering — joyni oldindan tayyorlaymiz.` : "Iltimos, javob bering — joyni oldindan tayyorlaymiz."}
      </p>
      {answered ? (
        <div className="flex flex-col items-center" style={{ marginTop: s(24), gap: s(10) }}>
          <p style={{ fontSize: s(13), color: p.onDeep, opacity: 0.9 }}>Rahmat, {answered.name}! Javobingiz qabul qilingan.</p>
          <button type="button" onClick={onEdit} className="rounded-full font-semibold" style={{ border: `1px solid ${p.onDeep}`, color: p.onDeep, fontSize: s(12), padding: `${s(12)} ${s(22)}` }}>
            Javobni o‘zgartirish
          </button>
        </div>
      ) : (
        <div className="grid w-full grid-cols-2" style={{ gap: s(12), marginTop: s(28), maxWidth: s(292) }}>
          <button type="button" onClick={() => onAnswer("coming")} className="rounded-full font-semibold" style={{ background: p.accentDeep, color: p.deep, fontSize: s(12), padding: `${s(13)} ${s(10)}` }}>
            Boraman
          </button>
          <button
            type="button"
            onClick={() => onAnswer("not_coming")}
            className="rounded-full font-semibold"
            style={{ border: `1px solid ${p.onDeep}`, color: p.onDeep, fontSize: s(12), padding: `${s(13)} ${s(10)}` }}
          >
            Kela olmayman
          </button>
        </div>
      )}
    </section>
  );
}

/* ── Yakun ── */

export function Closing({ d, p }: { d: InvitationData; p: Palette }) {
  const sd = splitDate(d.date);
  return (
    <footer className="flex flex-col items-center text-center" style={{ background: p.deep, padding: `${s(36)} ${s(24)} ${s(40)}` }}>
      <p style={{ fontFamily: p.script, fontSize: p.script.includes("cinzel") ? s(24) : s(38), color: p.accentDeep, lineHeight: 1.2 }}>{[d.personA, d.personB].filter(Boolean).join(" & ")}</p>
      {sd && <p style={{ fontFamily: "var(--font-cinzel)", fontSize: s(12), letterSpacing: "0.22em", color: p.onDeep, opacity: 0.7, marginTop: s(14) }}>{sd.dots}</p>}
      <a href="/" className="opacity-50 hover:opacity-80" style={{ fontSize: s(10), color: p.onDeep, marginTop: s(24), letterSpacing: "0.08em" }}>
        shohnoma.uz
      </a>
    </footer>
  );
}

/** Bo‘lim ko‘rinishga kirganda yumshoq paydo bo‘lishi */
export function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return setSeen(true);
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && (setSeen(true), io.disconnect()), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}
