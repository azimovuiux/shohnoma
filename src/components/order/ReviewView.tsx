"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown2, ArrowRight, Edit, Mobile, Monitor, TickCircle } from "@/components/icons";
import { LaptopFrame, PhoneFrame } from "@/components/mockups/Devices";
import { InvitationDesktop } from "@/components/mockups/InvitationDesktop";
import { InvitationSite } from "@/components/invitation/InvitationSite";
import { isDarkTheme } from "@/components/TemplateCard";
import { formatPhoneDisplay } from "@/lib/display";
import type { Template } from "@/lib/templates";
import { OrderSummary, MobileBar, MobileTemplateCard } from "./OrderSummary";
import { FlowColumns } from "./FlowTop";
import { SectionTitle } from "./fields";
import { liveTemplate, dayTime } from "./live";
import { namesOf } from "./labels";
import { toInvitationData } from "./toInvitationData";
import type { FlowOrder } from "./types";

function DeviceSwitch({ value, onChange }: { value: "laptop" | "phone"; onChange: (v: "laptop" | "phone") => void }) {
  return (
    <div className="inline-flex rounded-full border border-line bg-bg-base p-1" role="tablist" aria-label="Ko‘rinish">
      {(
        [
          ["laptop", "Laptop", <Monitor key="m" size={17} />],
          ["phone", "Telefon", <Mobile key="p" size={17} />],
        ] as const
      ).map(([k, l, icon]) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={value === k}
          onClick={() => onChange(k)}
          className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-[14px] font-medium transition-colors ${
            value === k ? "bg-maroon text-ink-inverse" : "text-ink"
          }`}
        >
          {icon} {l}
        </button>
      ))}
    </div>
  );
}

/** Telefon ichida to‘liq sahifa — pastga suriladi */
function PhonePreview({ order, template, className }: { order: FlowOrder; template: Template; className: string }) {
  return (
    <PhoneFrame dark={isDarkTheme(template)} className={className}>
      <div className="h-full overflow-y-auto overscroll-contain [scrollbar-width:none]" tabIndex={0} aria-label="Taklifnoma ko‘rinishi — pastga suring">
        <InvitationSite template={template} data={toInvitationData(order)} mode="preview" embedded />
      </div>
    </PhoneFrame>
  );
}

export function ReviewView({ order, template }: { order: FlowOrder; template: Template }) {
  const router = useRouter();
  const [device, setDevice] = useState<"laptop" | "phone">("laptop");
  const [agree, setAgree] = useState(false);
  const [agreeError, setAgreeError] = useState(false);
  const live = useMemo(() => liveTemplate(template, order), [template, order]);
  const base = `/buyurtma/${order.id}`;

  const go = () => {
    if (!agree) {
      setAgreeError(true);
      return;
    }
    router.push(`${base}/tolov`);
  };

  const checks: [string, string, string][] = [
    ["Ismlar", namesOf(order), `${base}/marosim`],
    ["Sana va vaqt", dayTime(order.day, order.time), `${base}/marosim`],
    ["Manzil", order.venueName, `${base}/marosim`],
    ["Aloqa", formatPhoneDisplay(order.contactPhone), `${base}/tafsilotlar`],
    ["Mehmonlar javobi", order.rsvpEnabled ? "Yoqilgan" : "O‘chirilgan", `${base}/tafsilotlar`],
    ["Fon musiqasi", order.musicEnabled ? "Yoqilgan" : "O‘chirilgan", `${base}/tafsilotlar`],
  ];

  const agreeBox = (
    <label className="flex cursor-pointer items-start gap-2.5 t-body-s text-ink-2">
      <input
        type="checkbox"
        checked={agree}
        onChange={(e) => {
          setAgree(e.target.checked);
          setAgreeError(false);
        }}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={`mt-px flex size-[18px] shrink-0 items-center justify-center rounded-full border transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-gold ${
          agree ? "border-maroon bg-maroon text-ink-inverse" : agreeError ? "border-danger" : "border-maroon"
        }`}
      >
        {agree && <TickCircle size={14} />}
      </span>
      <span>
        <Link href="/shartlar" target="_blank" className="underline-offset-2 hover:underline">
          Foydalanish shartlari
        </Link>{" "}
        va{" "}
        <Link href="/maxfiylik" target="_blank" className="underline-offset-2 hover:underline">
          maxfiylik siyosatiga
        </Link>{" "}
        roziman.
        {agreeError && <span className="block text-danger">Davom etish uchun rozilik belgisini qo‘ying</span>}
      </span>
    </label>
  );

  const button = (
    <button type="button" onClick={go} className="btn btn-primary w-full">
      To‘lovga o‘tish <ArrowRight size={16} />
    </button>
  );

  return (
    <FlowColumns
      aside={
        <OrderSummary
          template={template}
          live={live}
          amount={order.amount}
          rows={[
            ["Ismlar", namesOf(order)],
            ["Sana", dayTime(order.day, order.time)],
            ["Joy", order.venueName],
            ["Aloqa", formatPhoneDisplay(order.contactPhone)],
          ]}
          extra={agreeBox}
          action={button}
        />
      }
    >
      <div className="flex flex-col gap-6">
        <MobileTemplateCard template={template} live={live} />
        <div className="hidden lg:block">
          <DeviceSwitch value={device} onChange={setDevice} />
        </div>

        {/* Desktop sahna */}
        <div className="relative hidden overflow-hidden rounded-[24px] bg-bg-soft lg:block">
          {device === "laptop" ? (
            <div className="flex h-[640px] items-center justify-center px-10">
              <LaptopFrame className="w-full max-w-[680px]">
                <InvitationDesktop t={live} />
              </LaptopFrame>
            </div>
          ) : (
            <div className="flex h-[640px] flex-col items-center justify-center gap-4 py-8">
              <PhonePreview order={order} template={template} className="w-[262px]" />
              <p className="inline-flex items-center gap-2 t-body-s text-ink-2">
                <ArrowDown2 size={14} /> Telefonda pastga surib, butun saytni ko‘ring
              </p>
            </div>
          )}
        </div>

        {/* Mobil — to‘liq sahifa telefon ichida */}
        <div className="flex flex-col items-center gap-3 rounded-[24px] bg-bg-soft px-4 py-6 lg:hidden">
          <PhonePreview order={order} template={template} className="w-[250px]" />
          <p className="inline-flex items-center gap-2 t-body-s text-ink-2">
            <ArrowDown2 size={14} /> Pastga surib, butun saytni ko‘ring
          </p>
        </div>

        <SectionTitle>Hammasi to‘g‘rimi?</SectionTitle>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {checks.map(([l, v, href]) => (
            <li key={l} className="flex items-center gap-3 rounded-xl bg-bg-soft px-[13px] py-3">
              <TickCircle size={20} color="var(--color-gold)" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="t-body-s text-ink-2">{l}</span>
                <span className="truncate text-[14px] font-semibold text-ink">{v || "—"}</span>
              </div>
              <Link href={href} aria-label={`${l} — tahrirlash`} className="text-maroon hover:opacity-80">
                <Edit size={20} />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <MobileBar>
        {agreeBox}
        {button}
      </MobileBar>
    </FlowColumns>
  );
}
