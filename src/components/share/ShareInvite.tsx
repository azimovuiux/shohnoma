"use client";

/**
 * «Ulashish» — taklifnomani shablon uslubidagi 3:4 rasm + qisqa matn + havola bilan ulashish.
 *
 *   <ShareInvite target={{ invitationId, templateSlug, invitation, url, guest }} />
 *
 * Mobil (navigator.canShare({files})): tizim oynasi orqali JPEG rasm (photo) + ostida matn va havola.
 * Desktop / fayl ulashib bo‘lmasa: Telegram, WhatsApp havolalari — havola oldindan ko‘rinishida xuddi shu rasm
 * chiqadi (rasm serverga yuklanadi → php/invite.php og:image). Qo‘shimcha: rasmni yuklab olish, havolani nusxalash.
 * Shaxsiy havola (?m=Ism) va keyingi «maxsus mehmonlar» uchun — `guest` (kartada va matnda «Hurmatli …»).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Export, Import, Refresh, Send2, Whatsapp } from "@/components/icons";
import { TelegramIcon } from "@/components/TelegramIcon";
import { Modal, useCopy, useToast } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { designSlug, type Ceremony, type Template } from "@/lib/templates";
import { useTemplate } from "@/lib/useTemplates";
import type { Invitation } from "@/lib/types";
import { inviteLang } from "@/components/invitation/data";
import { hasShareDesign, renderShareCard, shareCaption, shareCardHash, shareFileName, type ShareCardInput } from "@/lib/shareCard";
import { DESIGNS } from "@/lib/shareCard/designs";

export type ShareInvitation = Pick<Invitation, "slug" | "ceremony" | "personA" | "personB" | "date" | "venueName" | "photos" | "extra" | "shareHash">;

export type ShareTarget = {
  invitationId: string;
  templateSlug: string;
  invitation: ShareInvitation;
  /** Ulashiladigan havola (shaxsiy bo‘lsa — ?m=… bilan) */
  url: string;
  /** Mehmon ismi (shaxsiy havola) */
  guest?: string | null;
};

const CEREMONIES: Ceremony[] = ["nikoh", "fotiha", "sunnat", "tugilgan-kun"];

/** Taklifnoma → karta ma’lumoti (taklifnoma tilida) */
export function cardInput(tpl: Template | undefined, templateSlug: string, inv: ShareInvitation, guest?: string | null): ShareCardInput {
  const design = tpl ? designSlug(tpl) : templateSlug;
  const withPhoto = hasShareDesign(design) && !!DESIGNS[design].photo;
  return {
    design,
    theme: tpl?.theme,
    lang: inviteLang(inv.extra, "uz"),
    ceremony: (CEREMONIES as string[]).includes(inv.ceremony) ? (inv.ceremony as Ceremony) : "nikoh",
    personA: inv.personA,
    personB: inv.personB,
    date: inv.date,
    venue: inv.venueName,
    photo: withPhoto ? (inv.photos ?? []).find(Boolean) ?? null : null,
    guest: guest?.trim() || null,
  };
}

/** Rasmni serverga yuklash (og:image). Shaxsiy kartalar shu sessiyada bir marta yuklanadi */
export async function uploadShareCard(invitationId: string, blob: Blob, hash: string, guest?: string | null): Promise<boolean> {
  const memo = `sh_share_${invitationId}_${hash}`;
  try {
    if (sessionStorage.getItem(memo)) return true;
  } catch {}
  const fd = new FormData();
  fd.append("file", new File([blob], "card.jpg", { type: "image/jpeg" }));
  fd.append("hash", hash);
  if (guest) fd.append("guest", guest);
  try {
    const res = await fetch(`/api/invitations/${encodeURIComponent(invitationId)}/share-image`, { method: "POST", body: fd, credentials: "same-origin" });
    const ok = res.ok && ((await res.json().catch(() => ({}))) as { ok?: boolean }).ok !== false;
    if (ok)
      try {
        sessionStorage.setItem(memo, "1");
      } catch {}
    return ok;
  } catch {
    return false;
  }
}

/**
 * Orqa fonda: serverdagi asosiy karta eskirgan bo‘lsa (ma’lumot tahrirlangan) — yangisini chizib yuklaydi.
 * Shunda havola nusxalab ulashilganda ham og:image dolzarb bo‘ladi.
 */
export function useShareCardSync(target: Omit<ShareTarget, "url" | "guest"> | null) {
  const tpl = useTemplate(target?.templateSlug);
  const input = useMemo(() => (target ? cardInput(tpl, target.templateSlug, target.invitation) : null), [tpl, target]);
  const hash = input ? shareCardHash(input) : null;
  const id = target?.invitationId;
  const stale = !!target && hash !== (target.invitation.shareHash ?? null);
  useEffect(() => {
    if (!input || !hash || !id || !stale) return;
    let alive = true;
    const timer = window.setTimeout(async () => {
      try {
        const blob = await renderShareCard(input);
        if (alive) await uploadShareCard(id, blob, hash);
      } catch {}
    }, 1500);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, id, stale]);
}

type Card = { blob: Blob; url: string; file: File; hash: string };

function ShareSheet({ target, open, onClose }: { target: ShareTarget; open: boolean; onClose: () => void }) {
  const t = useT();
  const copy = useCopy();
  const toast = useToast();
  const tpl = useTemplate(target.templateSlug);
  const input = useMemo(() => cardInput(tpl, target.templateSlug, target.invitation, target.guest), [tpl, target]);
  const caption = useMemo(() => shareCaption(input, target.url), [input, target.url]);
  /** Telegram havolasi url’ni o‘zi qo‘shadi — matnda takrorlanmasin */
  const captionNoUrl = useMemo(() => caption.split("\n").filter((l) => l !== target.url).join("\n"), [caption, target.url]);
  const [card, setCard] = useState<Card | null>(null);
  const [error, setError] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [canFiles, setCanFiles] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const urlRef = useRef<string | null>(null);
  const hash = shareCardHash(input);
  const latest = useRef({ input, target });
  latest.current = { input, target };

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setError(false);
    setUploaded(false);
    const { input, target } = latest.current;
    renderShareCard(input)
      .then((blob) => {
        if (!alive) return;
        const file = new File([blob], shareFileName(target.invitation.slug, target.guest), { type: "image/jpeg" });
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setCard({ blob, url, file, hash });
        try {
          setCanFiles(!!navigator.canShare?.({ files: [file] }));
        } catch {
          setCanFiles(false);
        }
        // og:image: asosiy karta faqat o‘zgargan bo‘lsa yuklanadi
        const need = target.guest ? true : hash !== (target.invitation.shareHash ?? null);
        const up = need ? uploadShareCard(target.invitationId, blob, hash, target.guest) : Promise.resolve(true);
        // juda sekin tarmoqda tugmalarni ushlab turmaymiz
        Promise.race([up, new Promise((r) => setTimeout(r, 8000))]).then(() => alive && setUploaded(true));
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [open, hash, attempt]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const shareFiles = async () => {
    if (!card) return;
    try {
      await navigator.share({ files: [card.file], text: caption });
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") toast(t("Ulashib bo‘lmadi. Telegram yoki WhatsApp tugmasidan foydalaning."), "error");
    }
  };
  const shareLink = async () => {
    try {
      await navigator.share({ text: captionNoUrl, url: target.url });
    } catch {}
  };
  const download = () => {
    if (!card) return;
    const a = document.createElement("a");
    a.href = card.url;
    a.download = card.file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const ready = !!card && uploaded;
  const tg = `https://t.me/share/url?url=${encodeURIComponent(target.url)}&text=${encodeURIComponent(captionNoUrl)}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(caption)}`;
  const linkCls = (on: boolean) =>
    `flex h-12 items-center justify-center gap-2 rounded-full border border-line-dark/30 t-nav text-ink transition-colors hover:bg-bg-soft ${on ? "" : "pointer-events-none opacity-50"}`;
  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <Modal open={open} onClose={onClose} label={t("Taklifnomani ulashish")} className="sm:max-w-[760px]">
      <div className="flex flex-col gap-5 p-5 sm:grid sm:grid-cols-[280px_1fr] sm:gap-6 sm:p-6">
        <div className="mx-auto w-[min(50vw,230px)] sm:w-full">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[14px] bg-bg-soft shadow-soft ring-1 ring-line">
            {card ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.url} alt={t("Ulashish kartasi")} className="block size-full object-cover" />
            ) : error ? (
              <div className="flex size-full flex-col items-center justify-center gap-3 p-4 text-center">
                <p className="t-body-s text-ink-2">{t("Rasmni tayyorlab bo‘lmadi")}</p>
                <button type="button" onClick={() => setAttempt((n) => n + 1)} className="btn btn-secondary btn-sm">
                  <Refresh size={15} /> {t("Qayta urinish")}
                </button>
              </div>
            ) : (
              <div className="flex size-full items-center justify-center">
                <span className="size-8 animate-spin rounded-full border-2 border-line border-t-maroon" aria-label={t("Rasm tayyorlanmoqda…")} />
              </div>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="font-serif text-[26px] font-medium leading-[1.15] text-ink">{target.guest ? t("Shaxsiy taklifnoma") : t("Taklifnomani ulashish")}</p>
            <p className="t-body-s text-ink-2">{t("Rasm ostida shu matn va havola boradi")}</p>
          </div>
          <p className="whitespace-pre-line rounded-xl bg-bg-soft px-3.5 py-3 text-[13px] leading-[1.5] text-ink [overflow-wrap:anywhere]">{caption}</p>

          {canFiles && (
            <button type="button" onClick={shareFiles} disabled={!card} className="btn btn-primary w-full !py-[13px] disabled:opacity-50">
              <Send2 size={16} /> {t("Rasm bilan ulashish")}
            </button>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            <a href={tg} target="_blank" rel="noopener noreferrer" className={linkCls(ready)} aria-disabled={!ready}>
              <TelegramIcon size={16} /> Telegram
            </a>
            <a href={wa} target="_blank" rel="noopener noreferrer" className={linkCls(ready)} aria-disabled={!ready}>
              <Whatsapp size={16} /> WhatsApp
            </a>
            <button type="button" onClick={download} disabled={!card} className={linkCls(!!card)}>
              <Import size={16} /> {t("Rasmni yuklab olish")}
            </button>
            <button type="button" onClick={() => copy(target.url, t("Havola nusxalandi"))} className={linkCls(true)}>
              <Copy size={16} /> {t("Havolani nusxalash")}
            </button>
          </div>
          {!canFiles && hasNativeShare && (
            <button type="button" onClick={shareLink} className="inline-flex w-fit items-center gap-2 t-body-s text-ink-2 hover:text-maroon">
              <Export size={15} /> {t("Boshqa ilova orqali ulashish")}
            </button>
          )}
          {!ready && card && <p className="text-[12px] text-ink-2">{t("Havola rasmi tayyorlanmoqda…")}</p>}
        </div>
      </div>
    </Modal>
  );
}

/** Ulashish tugmasi + oyna. variant: button — matnli tugma, icon — dumaloq ikonka */
export function ShareInvite({
  target,
  variant = "button",
  label,
  className,
}: {
  target: ShareTarget;
  variant?: "button" | "icon";
  label?: string;
  className?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      {variant === "icon" ? (
        <button type="button" aria-label={label ?? t("Ulashish")} title={label ?? t("Ulashish")} onClick={() => setOpen(true)} className={className ?? "icon-btn !size-11"}>
          <Send2 size={16} />
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={className ?? "btn btn-primary"}>
          <Send2 size={16} /> {label ?? t("Ulashish")}
        </button>
      )}
      {open && <ShareSheet target={target} open={open} onClose={close} />}
    </>
  );
}
