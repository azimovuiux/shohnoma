"use client";

import { useState } from "react";
import { CloseCircle, Call } from "@/components/icons";
import { TelegramIcon } from "@/components/TelegramIcon";
import { StatusBadge, type Tone } from "@/components/ui";
import { StatusSelect } from "./StatusSelect";

export type BriefRow = {
  id: string;
  ceremony: string;
  date: string | null;
  guestCount: number | null;
  styles: string[];
  colors: string[];
  ideas: string | null;
  references: string[];
  budget: string;
  name: string;
  phone: string;
  phoneDisplay: string;
  contactVia: string;
  status: string;
  created: string;
};

export const briefStatus: { value: string; label: string; tone: Tone }[] = [
  { value: "new", label: "Yangi", tone: "maroon" },
  { value: "contacted", label: "Bog‘lanildi", tone: "pending" },
  { value: "in_progress", label: "Ishlanmoqda", tone: "pending" },
  { value: "done", label: "Bajarildi", tone: "success" },
  { value: "rejected", label: "Bekor", tone: "muted" },
];

const ceremonyLabel: Record<string, string> = {
  nikoh: "Nikoh to‘yi",
  fotiha: "Fotiha",
  sunnat: "Sunnat to‘yi",
  "tugilgan-kun": "Tug‘ilgan kun",
  boshqa: "Boshqa",
};
const viaLabel: Record<string, string> = { telegram: "Telegram", call: "Qo‘ng‘iroq", sms: "SMS" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-line py-3">
      <span className="t-body-s text-ink-2">{label}</span>
      <div className="t-body-m text-ink">{children}</div>
    </div>
  );
}

export function BriefList({ rows }: { rows: BriefRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = rows.find((r) => r.id === openId) ?? null;
  return (
    <>
      <ul className="divide-y divide-line rounded-panel border border-line">
        {rows.map((r) => {
          const st = briefStatus.find((s) => s.value === r.status) ?? briefStatus[0];
          return (
            <li key={r.id}>
              <button type="button" onClick={() => setOpenId(r.id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 text-left hover:bg-bg-soft">
                <span className="min-w-[160px] flex-1 t-title text-ink">{r.name}</span>
                <span className="t-body-s text-ink-2">{ceremonyLabel[r.ceremony] ?? r.ceremony}</span>
                <span className="t-body-s text-ink-2">{r.budget}</span>
                <span className="t-body-s text-ink">{r.phoneDisplay}</span>
                <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                <span className="w-32 text-right t-body-s text-ink-2">{r.created}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-black/40 animate-[fade-in_.2s]" onClick={() => setOpenId(null)}>
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={`Brif — ${open.name}`}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-[520px] flex-col overflow-y-auto bg-bg-base p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-serif text-[30px] font-light leading-none text-ink">{open.name}</p>
                <p className="mt-1 t-body-s text-ink-2">{open.created}</p>
              </div>
              <button type="button" onClick={() => setOpenId(null)} aria-label="Yopish" className="text-ink-2 hover:text-ink">
                <CloseCircle size={24} />
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StatusSelect endpoint={`/api/admin/briefs/${open.id}`} value={open.status} options={briefStatus} />
              <a href={`tel:${open.phone}`} className="btn btn-secondary btn-sm">
                <Call size={15} /> {open.phoneDisplay}
              </a>
              <a href={`https://t.me/${open.phone.replace("+", "")}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                <TelegramIcon size={15} /> Telegram
              </a>
            </div>
            <div className="mt-4">
              <Row label="Marosim">
                {ceremonyLabel[open.ceremony] ?? open.ceremony}
                {open.date ? ` · ${open.date.split("-").reverse().join(".")}` : ""}
                {open.guestCount ? ` · ${open.guestCount} kishi` : ""}
              </Row>
              <Row label="Uslub">{open.styles.length ? open.styles.join(", ") : "—"}</Row>
              <Row label="Ranglar">
                {open.colors.length ? (
                  <span className="flex flex-wrap gap-2">
                    {open.colors.map((c) => (
                      <span key={c} className="inline-flex items-center gap-1.5 t-body-s">
                        <span className="size-5 rounded-full border border-line" style={{ background: c }} /> {c}
                      </span>
                    ))}
                  </span>
                ) : (
                  "—"
                )}
              </Row>
              <Row label="G‘oyalar">
                <span className="whitespace-pre-wrap">{open.ideas || "—"}</span>
              </Row>
              <Row label="Byudjet">{open.budget}</Row>
              <Row label="Bog‘lanish">{viaLabel[open.contactVia] ?? open.contactVia}</Row>
              <Row label={`Namuna rasmlar (${open.references.length})`}>
                {open.references.length ? (
                  <span className="grid grid-cols-3 gap-2">
                    {open.references.map((u) => (
                      <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-line">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={u} alt="Namuna" className="aspect-square w-full object-cover" />
                      </a>
                    ))}
                  </span>
                ) : (
                  "—"
                )}
              </Row>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
