"use client";

/**
 * Vizitka QR / ulashish oynasi: QR kod (src/lib/qr.ts), havolani nusxalash, PNG/SVG yuklab olish, tizim «Ulashish» menyusi.
 * Rang — dizaynga mos (dark: Noir, light: Lumen). Yorliqlar karta tilida.
 */
import { useEffect, useState } from "react";
import type { CardLang } from "@/lib/cardTypes";
import { downloadQr, qrDataUrl } from "@/lib/qr";
import { Icon } from "./icons";
import { ct } from "./labels";
import { copyText } from "./runtime";

export function ShareSheet({ open, onClose, url, name, lang, dark }: { open: boolean; onClose: () => void; url: string; name: string; lang: CardLang; dark: boolean }) {
  const T = (s: string) => ct(s, lang);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    qrDataUrl(url, 720).then((d) => alive && setQr(d)).catch(() => {});
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      alive = false;
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, url, onClose]);

  if (!open) return null;
  const file = `vizitka-${(name || "qr").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-")}`;
  const c = dark
    ? { panel: "bg-[#141312] text-[#eee9e1] border border-[#2a2826]", mute: "text-[#85817a]", btn: "border border-[rgba(238,233,225,0.25)] hover:border-[rgba(238,233,225,0.6)]", main: "bg-[#eee9e1] text-[#0b0b0a]", field: "bg-[#0b0b0a] border border-[#2a2826]" }
    : { panel: "bg-[#fbf8f4] text-[#231c18] border border-[#e2d9ce]", mute: "text-[#8c8178]", btn: "border border-[rgba(35,28,24,0.18)] hover:bg-[#f3eee7]", main: "bg-[#231c18] text-[#f8f4ee]", field: "bg-[#f3eee7] border border-[#e2d9ce]" };

  const copy = async () => {
    if (await copyText(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={T("QR kod")} className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-3 backdrop-blur-[3px] sm:items-center" onClick={onClose}>
      <div className={`relative w-full max-w-[380px] rounded-[28px] p-5 shadow-2xl ${c.panel} animate-[vzIn_.35s_cubic-bezier(.22,1,.36,1)]`} onClick={(e) => e.stopPropagation()} style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
        <style>{"@keyframes vzIn{from{opacity:0;transform:translateY(16px) scale(.98)}}"}</style>
        <button type="button" onClick={onClose} aria-label={T("Yopish")} className={`absolute right-3 top-3 flex size-10 items-center justify-center rounded-full ${c.mute} hover:opacity-80`}>
          <Icon name="close" size={18} />
        </button>
        <p className="pr-10 text-[17px] font-semibold leading-tight">{name}</p>
        <p className={`mt-1 text-[13px] leading-snug ${c.mute}`}>{T("Kamerani QR kodga qarating — vizitka telefonda ochiladi.")}</p>
        <div className="mx-auto mt-4 aspect-square w-full max-w-[260px] overflow-hidden rounded-[20px] bg-white p-2">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR" className="block size-full" />
          ) : (
            <div className="size-full animate-pulse rounded-[14px] bg-black/5" />
          )}
        </div>
        <button type="button" onClick={copy} className={`mt-4 flex h-11 w-full items-center gap-2 rounded-[14px] px-3 text-left text-[13px] ${c.field}`}>
          <span className="min-w-0 flex-1 truncate">{url.replace(/^https?:\/\//, "")}</span>
          <span className={`shrink-0 text-[12px] font-medium ${c.mute}`}>{copied ? T("Havola nusxalandi") : T("Havolani nusxalash")}</span>
        </button>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => downloadQr(url, "png", file)} className={`flex h-11 items-center justify-center gap-2 rounded-full text-[13px] font-medium ${c.btn}`}>
            <Icon name="download" size={15} /> {T("PNG yuklab olish")}
          </button>
          <button type="button" onClick={() => downloadQr(url, "svg", file)} className={`flex h-11 items-center justify-center gap-2 rounded-full text-[13px] font-medium ${c.btn}`}>
            <Icon name="download" size={15} /> {T("SVG yuklab olish")}
          </button>
        </div>
        {canShare && (
          <button
            type="button"
            onClick={() => navigator.share({ title: name, url }).catch(() => {})}
            className={`mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14px] font-medium ${c.main}`}
          >
            <Icon name="share" size={16} /> {T("Ulashish")}
          </button>
        )}
      </div>
    </div>
  );
}
