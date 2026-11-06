"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Copy, Edit, ExportSquare, Eye, Instagram, Link2, Mobile, Monitor, Profile2User, ReceiptText, Scan, Send2, TickCircle, Whatsapp } from "@/components/icons";
import { TelegramIcon } from "@/components/TelegramIcon";
import { useCopy } from "@/components/ui";
import { LaptopFrame, PhoneFrame } from "@/components/mockups/Devices";
import { InvitationDesktop } from "@/components/mockups/InvitationDesktop";
import { InvitationScreen } from "@/components/mockups/InvitationScreen";
import { isDarkTheme } from "@/components/TemplateCard";
import type { Template } from "@/lib/templates";
import { liveTemplate } from "./live";
import { namesOf } from "./labels";
import { downloadQr } from "@/lib/qr";
import type { FlowOrder } from "./types";

export function ReadyView({
  order,
  template,
  url,
  providerName,
  loggedIn,
}: {
  order: FlowOrder;
  template: Template;
  url: string;
  providerName: string;
  loggedIn: boolean;
}) {
  const copy = useCopy();
  const [device, setDevice] = useState<"laptop" | "phone">("laptop");
  const live = useMemo(() => liveTemplate(template, order), [template, order]);
  const host = url.replace(/^https?:\/\//, "");
  const names = namesOf(order);
  const shareText = `${names} — taklifnoma. Sizni to‘yimizda kutamiz!`;

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${names} — taklifnoma`, text: shareText, url });
      } catch {}
    } else copy(url);
  };

  const shareBtn = "flex h-11 items-center justify-center gap-2 rounded-full border border-line-dark/30 t-nav text-ink transition-colors hover:bg-bg-soft";

  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-6 lg:px-10 xl:px-[120px] lg:pb-24 lg:pt-9">
      <Link href="/" className="inline-flex items-center gap-2 t-nav text-ink-2 hover:text-maroon">
        <ArrowLeft size={16} /> Bosh sahifaga
      </Link>

      <div className="mt-6 flex flex-col-reverse gap-10 lg:mt-8 lg:flex-row lg:items-center lg:gap-10 xl:gap-16">
        {/* Ko‘rinish */}
        <div className="flex flex-col items-center gap-5 rounded-[24px] bg-gradient-to-b from-[#f4ece0] to-bg-soft px-4 pb-6 pt-5 lg:w-[56%] lg:shrink-0 lg:px-0 xl:w-[634px]">
          <div className="inline-flex rounded-full bg-bg-base p-1 shadow-soft" role="tablist" aria-label="Ko‘rinish">
            {(
              [
                ["laptop", "Laptop", <Monitor key="m" size={16} />],
                ["phone", "Telefon", <Mobile key="p" size={16} />],
              ] as const
            ).map(([k, l, icon]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={device === k}
                onClick={() => setDevice(k)}
                className={`inline-flex h-9 items-center gap-2 rounded-full px-4 t-nav ${device === k ? "bg-maroon text-ink-inverse" : "text-ink"}`}
              >
                {icon} {l}
              </button>
            ))}
          </div>
          {device === "laptop" ? (
            <div className="relative w-full max-w-[600px] pb-[6%]">
              <LaptopFrame className="w-[92%]">
                <InvitationDesktop t={live} />
              </LaptopFrame>
              <PhoneFrame dark={isDarkTheme(template)} className="absolute bottom-0 right-[2%] w-[23%]">
                <InvitationScreen t={live} />
              </PhoneFrame>
            </div>
          ) : (
            <PhoneFrame dark={isDarkTheme(template)} className="w-[230px]">
              <InvitationScreen t={live} />
            </PhoneFrame>
          )}
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 t-body-s text-ink-2 hover:text-maroon">
            <ExportSquare size={14} /> {host} — mehmonlar shunday ko‘radi
          </a>
        </div>

        {/* Ma’lumot */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex items-center gap-3.5 rounded-panel bg-bg-soft px-3.5 py-3">
            <span className="flex size-[34px] items-center justify-center rounded-full bg-success text-white">
              <TickCircle size={18} />
            </span>
            <div className="flex flex-col">
              <span className="t-title text-ink">To‘lov tasdiqlandi</span>
              <span className="t-body-s text-ink-2">
                Buyurtma № {order.code} · {providerName}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h1 className="font-serif font-light leading-[1.04] text-ink">
              <span className="block text-[40px] lg:text-[52px]">Taklifnomangiz</span>
              <em className="block text-[48px] italic text-maroon lg:text-[64px]">tayyor!</em>
            </h1>
            <p className="t-body-m text-ink-2">Baxtli kuningizni yaqinlaringiz bilan ulashing.</p>
          </div>

          <div className="flex flex-col gap-2.5">
            <p className="t-title text-ink">Sizning taklifnoma havolangiz</p>
            <div className="flex items-center gap-2 rounded-full border border-line bg-bg-base py-1.5 pl-4 pr-1.5">
              <Link2 size={16} color="var(--color-maroon)" />
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-maroon">{host}</span>
              <button type="button" onClick={() => copy(url)} className="btn btn-primary btn-sm shrink-0 !px-4 !py-2.5">
                <Copy size={16} /> Nusxalash
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 t-body-s">
              <button
                type="button"
                onClick={() => downloadQr(url, "png", `qr-${order.slug}`)}
                className="inline-flex w-fit items-center gap-2 text-maroon hover:underline"
              >
                <Scan size={15} /> QR kodni yuklab olish (bosma taklifnoma uchun)
              </button>
              <button type="button" onClick={() => downloadQr(url, "svg", `qr-${order.slug}`)} className="text-ink-2 hover:text-maroon hover:underline">
                SVG
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <p className="t-title text-ink">Ulashish</p>
            <div className="grid grid-cols-2 gap-2.5">
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={shareBtn}
              >
                <TelegramIcon size={16} /> Telegram
              </a>
              <button
                type="button"
                onClick={async () => {
                  await copy(url, "Havola nusxalandi — Instagram’da ulashing");
                  if (/Android|iPhone|iPad/i.test(navigator.userAgent)) window.location.href = "instagram://story-camera";
                }}
                className={shareBtn}
              >
                <Instagram size={16} /> Instagram
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`} target="_blank" rel="noopener noreferrer" className={shareBtn}>
                <Whatsapp size={16} /> WhatsApp
              </a>
              <a href={url} target="_blank" rel="noopener noreferrer" className={shareBtn}>
                <Eye size={16} /> Saytni ochish
              </a>
            </div>
            <button type="button" onClick={share} className="inline-flex w-fit items-center gap-2 t-body-s text-ink-2 hover:text-maroon sm:hidden">
              <Send2 size={15} /> Boshqa ilova orqali ulashish
            </button>
          </div>

          <div className="h-px bg-line" />

          <div className="flex flex-col gap-4">
            <h2 className="font-serif text-[26px] font-normal text-ink">Endi nima qilaman?</h2>
            {[
              [<Send2 key="1" size={18} />, "Havolani yuboring", "Telegram, Instagram yoki WhatsApp orqali"],
              [<Profile2User key="2" size={18} />, "Javoblarni kuzating", "Kim kelishini buyurtma sahifasida ko‘rasiz"],
              [<Edit key="3" size={18} />, "Kerak bo‘lsa tahrirlang", "Sana, manzil yoki matnni o‘zgartirish mumkin"],
            ].map(([icon, t, s]) => (
              <div key={t as string} className="flex items-center gap-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-maroon">{icon}</span>
                <span className="flex flex-col">
                  <span className="t-title text-ink">{t}</span>
                  <span className="t-body-s text-ink-2">{s}</span>
                </span>
              </div>
            ))}
            <Link
              href={loggedIn ? `/kabinet/t/${order.invitationId}/` : `/kirish/?next=${encodeURIComponent(`/kabinet/t/${order.invitationId}/`)}`}
              className="btn btn-secondary mt-1 w-full"
            >
              <ReceiptText size={17} /> Buyurtmani boshqarish
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
