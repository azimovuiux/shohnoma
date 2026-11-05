"use client";

import { Copy, Export, Instagram, Send2, Whatsapp } from "@/components/icons";
import { TelegramIcon } from "@/components/TelegramIcon";
import { useCopy, useToast } from "@/components/ui";

/** "shohnoma.uz/jasur-madina" + nusxalash */
export function CopyLink({ url, className = "" }: { url: string; className?: string }) {
  const copy = useCopy();
  const shown = url.replace(/^https?:\/\//, "");
  return (
    <button type="button" onClick={() => copy(url)} className={`group inline-flex min-w-0 items-center gap-2 text-left ${className}`} aria-label="Havolani nusxalash">
      <span className="truncate text-[13px] font-medium leading-none text-maroon">{shown}</span>
      <Copy size={15} className="shrink-0 text-ink-2 group-hover:text-maroon" />
    </button>
  );
}

/** Umumiy ulashish (navigator.share), bo‘lmasa nusxalash */
export function ShareButton({ url, title, className = "icon-btn !size-11" }: { url: string; title: string; className?: string }) {
  const copy = useCopy();
  return (
    <button
      type="button"
      aria-label="Ulashish"
      className={className}
      onClick={async () => {
        if (navigator.share) {
          try {
            await navigator.share({ title, url });
            return;
          } catch {
            return;
          }
        }
        copy(url);
      }}
    >
      <Send2 size={16} />
    </button>
  );
}

export function ShareRow({ url, title }: { url: string; title: string }) {
  const copy = useCopy();
  const toast = useToast();
  const text = encodeURIComponent(`${title}\n${url}`);
  const cls = "icon-btn !size-[38px]";
  return (
    <div className="flex gap-2">
      <a className={cls} aria-label="Telegram" target="_blank" rel="noopener noreferrer" href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`}>
        <TelegramIcon size={16} />
      </a>
      <button
        type="button"
        className={cls}
        aria-label="Instagram"
        onClick={async () => {
          await copy(url, "Havola nusxalandi — Instagram'da joylashtiring");
          void toast;
        }}
      >
        <Instagram size={16} />
      </button>
      <a className={cls} aria-label="WhatsApp" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${text}`}>
        <Whatsapp size={16} />
      </a>
      <button
        type="button"
        className={cls}
        aria-label="Ulashish"
        onClick={async () => {
          if (navigator.share) {
            try {
              await navigator.share({ title, url });
            } catch {}
          } else copy(url);
        }}
      >
        <Export size={16} />
      </button>
    </div>
  );
}
