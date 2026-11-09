"use client";

import { useMemo, useRef, useState } from "react";
import { useLocalRouter } from "@/lib/useLocalRouter";
import { useLocale, useT } from "@/lib/i18n";
import { ArrowRight, CloseCircle, Copy, DocumentText, Gallery, Timer1 } from "@/components/icons";
import { useCopy } from "@/components/ui";
import { formatPrice } from "@/lib/format";
import { star8Path } from "@/lib/ornament";
import type { Template } from "@/lib/templates";
import { OrderSummary, MobileBar, MobileTemplateCard } from "./OrderSummary";
import { FlowColumns } from "./FlowTop";
import { SectionTitle } from "./fields";
import { liveTemplate, dayTime } from "./live";
import { namesOf } from "./labels";
import type { FlowOrder } from "./types";

export type P2PCard = { card: string; holder: string; bank: string };

function BankCard({ c }: { c: P2PCard }) {
  return (
    <div className="relative aspect-[250/150] w-full max-w-[300px] overflow-hidden rounded-[14px] bg-gradient-to-br from-[#7a2335] to-[#4b1220] p-[7%] text-ink-inverse shadow-[0_12px_24px_-10px_rgba(75,18,32,0.45)] sm:w-[250px]">
      <svg viewBox="0 0 120 120" className="absolute -right-6 -top-4 size-[60%] opacity-30" aria-hidden>
        <path d={star8Path(60, 60, 56)} fill="none" stroke="#d9b97a" />
        <path d={star8Path(60, 60, 40)} fill="none" stroke="#d9b97a" />
      </svg>
      <span className="block h-[17%] w-[12%] rounded-[4px] bg-gradient-to-br from-[#e8c98a] to-[#b8935a]" />
      <p className="mt-[11%] font-serif tracking-[0.08em]" style={{ fontSize: "clamp(15px, 5vw, 19px)" }}>
        {c.card}
      </p>
      <div className="mt-[9%] flex items-end justify-between text-[10px] font-medium uppercase tracking-[0.12em]">
        <span>{c.holder}</span>
        <span className="text-[11px]">{c.bank}</span>
      </div>
    </div>
  );
}

export function P2PTransfer({
  order,
  template,
  card,
  rejectedNote,
}: {
  order: FlowOrder;
  template: Template;
  card: P2PCard;
  rejectedNote?: string | null;
}) {
  const router = useLocalRouter();
  const t = useT();
  const locale = useLocale();
  const copy = useCopy();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const live = useMemo(() => liveTemplate(template, order), [template, order]);

  const pick = (f: File | undefined | null) => {
    setError(null);
    if (!f) return;
    if (!/^image\/|^application\/pdf$/.test(f.type)) return setError(t("Faqat rasm yoki PDF yuklang"));
    if (f.size > 8 * 1024 * 1024) return setError(t("Fayl hajmi 8 MB dan oshmasin"));
    setFile(f);
    setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  };

  const send = async () => {
    if (!file) {
      setError(t("Avval chek rasmini yuklang"));
      input.current?.click();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch(`/api/orders/${order.id}/p2p-receipt`, { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "Chek yuborilmadi");
      router.push(`/buyurtma/${order.id}/tolov/p2p/tekshirilmoqda/`);
      router.refresh();
    } catch (e) {
      setError(t((e as Error).message));
      setBusy(false);
    }
  };

  const rows: [string, React.ReactNode, string | null][] = [
    ["Karta raqami", card.card, card.card.replace(/\s/g, "")],
    ["Qabul qiluvchi", card.holder.replace(/\b(\p{L})(\p{L}*)/gu, (_, a: string, b: string) => a + b.toLowerCase()), null],
    ["O‘tkaziladigan summa", <span key="s" className="font-serif text-[22px] font-medium text-maroon">{formatPrice(order.amount, true, locale)}</span>, String(order.amount)],
    ["Izohga yozing", order.code, order.code],
  ];

  const button = (
    <button type="button" onClick={send} disabled={busy} className="btn btn-primary w-full">
      {busy ? t("Yuborilmoqda…") : t("Chekni yubordim")} <ArrowRight size={16} />
    </button>
  );
  const err = error && (
    <p role="alert" className="text-center t-body-s text-danger">
      {error}
    </p>
  );

  return (
    <FlowColumns
      aside={
        <OrderSummary
          template={template}
          live={live}
          order={order}
          amount={order.amount}
          rows={[
            ["Buyurtma", `№ ${order.code}`],
            ["Ismlar", namesOf(order)],
            ["Sana", dayTime(order.day, order.time)],
          ]}
          action={
            <>
              {button}
              {err}
            </>
          }
        />
      }
    >
      <div className="flex flex-col gap-8">
        <MobileTemplateCard template={template} live={live} order={order} />
        {rejectedNote && (
          <div role="alert" className="rounded-xl px-4 py-3.5 t-body-m" style={{ background: "var(--danger-bg)", color: "var(--color-danger)" }}>
            <b className="font-semibold">{t("Oldingi chek qabul qilinmadi:")}</b> {t(rejectedNote)}. {t("Iltimos, to‘g‘ri chekni qayta yuboring.")}
          </div>
        )}
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <BankCard c={card} />
          <dl className="w-full flex-1 divide-y divide-line">
            {rows.map(([l, v, c]) => (
              <div key={l} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex flex-col">
                  <dt className="t-body-s text-ink-2">{t(l)}</dt>
                  <dd className="text-[15px] font-semibold text-ink">{v}</dd>
                </div>
                {c && (
                  <button
                    type="button"
                    onClick={() => copy(c, t("{l} nusxalandi", { l: t(l) }))}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-bg-soft px-3 py-1.5 t-body-s font-medium text-maroon hover:bg-gold-soft"
                  >
                    <Copy size={14} /> {t("Nusxa")}
                  </button>
                )}
              </div>
            ))}
          </dl>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            pick(e.dataTransfer.files?.[0]);
          }}
          className={`relative flex flex-col items-center gap-2 rounded-panel border border-dashed px-5 py-8 text-center transition-colors ${
            drag ? "border-maroon bg-gold-soft/60" : "border-gold/55 bg-bg-soft"
          }`}
        >
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            hidden
            onChange={(e) => pick(e.target.files?.[0])}
          />
          {file ? (
            <>
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt={t("Chek")} className="max-h-48 rounded-xl object-contain shadow-soft" />
              ) : (
                <span className="flex size-12 items-center justify-center rounded-full bg-bg-base text-maroon">
                  <DocumentText size={22} />
                </span>
              )}
              <p className="t-title text-ink">{file.name}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => input.current?.click()} className="btn btn-secondary btn-sm">
                  {t("Boshqa fayl")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                  aria-label={t("Faylni olib tashlash")}
                  className="icon-btn"
                >
                  <CloseCircle size={18} />
                </button>
              </div>
            </>
          ) : (
            <button type="button" onClick={() => input.current?.click()} className="flex flex-col items-center gap-2">
              <span className="flex size-12 items-center justify-center rounded-full bg-bg-base text-maroon shadow-soft">
                <Gallery size={22} />
              </span>
              <span className="t-title text-ink">{t("Chek rasmini yuklang")}</span>
              <span className="t-body-s text-ink-2">{t("Rasm yoki skrinshot")}</span>
            </button>
          )}
        </div>
        <p className="flex items-center gap-2 t-body-s text-ink-2">
          <span className="text-gold">
            <Timer1 size={16} />
          </span>
          {t("Odatda 15 daqiqada tasdiqlanadi.")}
        </p>
      </div>
      <MobileBar>
        {button}
        {err}
      </MobileBar>
    </FlowColumns>
  );
}
