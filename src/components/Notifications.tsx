"use client";

/**
 * Saytdagi bildirishnomalar (taklifnoma egasi uchun): sarlavhadagi qo‘ng‘iroqcha, panel, toast.
 * Ma’lumot: GET /api/me/notifications(?after=<id>) — har ~45 soniyada (tab ko‘rinmasa to‘xtaydi).
 * Boshqa sahifalar bilan aloqa — window hodisalari:
 *   NOTIF_NEW_EVENT  (detail: Notif[]) — yangi bildirishnoma keldi (Mehmonlar sahifasi ro‘yxatni yangilaydi)
 *   NOTIF_SYNC_EVENT — bildirishnomalar boshqa joyda o‘qildi (qo‘ng‘iroqcha qayta yuklanadi)
 */
import Link from "@/components/LocalLink";
import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  Clock,
  CloseCircle,
  Eye,
  Notification,
  TickCircle,
  Warning2,
  WalletCheck,
} from "@/components/icons";
import { Modal } from "@/components/ui";
import { apiGet, ApiError } from "@/lib/client";
import { relativeTime, rsvpView } from "@/lib/display";
import { ding, primeAudio } from "@/lib/ding";
import { useLocale, useT } from "@/lib/i18n";
import type { RsvpStatus } from "@/lib/types";

export type NotifKind =
  | "rsvp_new"
  | "rsvp_edit"
  | "guest_open"
  | "pay_ok"
  | "pay_reject";
export type Notif = {
  id: number;
  kind: NotifKind;
  invitationId: string | null;
  orderId: string | null;
  invitation: string | null;
  refId: string | null;
  data: {
    name?: string;
    status?: RsvpStatus;
    count?: number;
    wish?: string | null;
    sg?: string | null;
    code?: string;
    amount?: number;
    reason?: string;
  };
  createdAt: string;
  read: boolean;
};

export const NOTIF_NEW_EVENT = "shohnoma:notif-new";
export const NOTIF_SYNC_EVENT = "shohnoma:notif-sync";

const POLL_MS = 45_000;
const TOAST_MS = 7_000;
const isRsvp = (k: NotifKind) => k === "rsvp_new" || k === "rsvp_edit";

/** Mehmonlar sahifasi javoblarni o‘qilgan deb belgilaganda — qo‘ng‘iroqcha ham yangilanadi */
export async function markInvitationNotifsRead(
  invitationId: string,
  kinds: NotifKind[],
) {
  try {
    await fetch("/api/me/notifications/read", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId, kinds }),
    });
    window.dispatchEvent(new Event(NOTIF_SYNC_EVENT));
  } catch {
    /* tarmoq xatosi — keyingi safar */
  }
}

type Resp = { ok: boolean; items: Notif[]; unread: number; last: number };

/** Yangi kelganlar ro‘yxat boshiga; shu javob haqidagi eski (o‘qilmagan) yozuv server tomonda almashtirilgan — bu yerda ham olib tashlanadi */
function merge(prev: Notif[], fresh: Notif[]) {
  const ids = new Set(fresh.map((n) => n.id));
  const refs = new Set(
    fresh.filter((n) => isRsvp(n.kind) && n.refId).map((n) => n.refId),
  );
  const rest = prev.filter(
    (n) => !ids.has(n.id) && !(isRsvp(n.kind) && !n.read && refs.has(n.refId)),
  );
  return [...fresh, ...rest].sort((a, b) => b.id - a.id).slice(0, 30);
}

export function useNotifications(userId: string | null) {
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<Notif[]>([]);
  const last = useRef(0);
  const lastPoll = useRef(0);
  const busy = useRef(false);
  const stopped = useRef(false);
  const inited = useRef(false);

  const storeKey = userId ? `shohnoma:notif-last:${userId}` : "";

  const announce = useCallback((fresh: Notif[]) => {
    const unseen = fresh.filter((n) => !n.read);
    if (!unseen.length) return;
    setToasts((t) =>
      [...unseen, ...t.filter((x) => !unseen.some((u) => u.id === x.id))].slice(
        0,
        4,
      ),
    );
    window.dispatchEvent(new CustomEvent(NOTIF_NEW_EVENT, { detail: unseen }));
    // Ovoz — faqat foydalanuvchi sahifa bilan o‘zaro ta’sir qilgan bo‘lsa (brauzer siyosati)
    const ua = (
      navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }
    ).userActivation;
    if (ua?.hasBeenActive) ding();
  }, []);

  /** full=true — oxirgi 30 tasi (o‘qilgan holatlari bilan); aks holda faqat oxirgi id dan keyingilari */
  const load = useCallback(
    async (full: boolean) => {
      if (!userId || busy.current || stopped.current) return;
      busy.current = true;
      lastPoll.current = Date.now();
      try {
        const r = await apiGet<Resp>(
          `/api/me/notifications${full || !last.current ? "" : `?after=${last.current}`}`,
        );
        setUnread(r.unread);
        const first = !inited.current;
        if (full || first) setItems(r.items);
        else if (r.items.length) setItems((p) => merge(p, r.items));
        // Toast: keyingi so‘rovlarda — yangi kelganlar; birinchi yuklashda — faqat shu brauzer sessiyasida
        // oxirgi ko‘rilgandan keyin kelganlari (sahifa almashganda/yangilanganda). Yangi sessiyada — toast yo‘q.
        let seen: number | null = last.current;
        if (first) {
          const v = sessionStorage.getItem(storeKey);
          seen = v === null ? null : Number(v) || 0;
        }
        if (seen !== null && r.last > seen)
          announce(r.items.filter((n) => n.id > seen!));
        last.current = Math.max(last.current, r.last);
        sessionStorage.setItem(storeKey, String(last.current));
        inited.current = true;
        setReady(true);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) stopped.current = true;
      } finally {
        busy.current = false;
      }
    },
    [userId, storeKey, announce],
  );

  // Boshlang‘ich yuklash va davriy so‘rov (tab yashirin bo‘lsa — so‘ralmaydi; qaytganda darhol)
  useEffect(() => {
    if (!userId) {
      setItems([]);
      setUnread(0);
      setReady(false);
      last.current = 0;
      inited.current = false;
      stopped.current = false;
      return;
    }
    primeAudio();
    void load(false);
    const tick = setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastPoll.current >= POLL_MS - 1000
      )
        void load(false);
    }, 5_000);
    const onVis = () =>
      document.visibilityState === "visible" &&
      Date.now() - lastPoll.current > 15_000 &&
      void load(false);
    const onSync = () => void load(true);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener(NOTIF_SYNC_EVENT, onSync);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener(NOTIF_SYNC_EVENT, onSync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Panel ochilganda — o‘qilgan holatlarni ham yangilab olamiz
  useEffect(() => {
    if (open) void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const post = async (body: object) => {
    try {
      const r = await fetch("/api/me/notifications/read", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = (await r.json().catch(() => null)) as {
        unread?: number;
      } | null;
      if (typeof d?.unread === "number") setUnread(d.unread);
    } catch {
      /* */
    }
  };
  const markRead = (id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    if (items.some((n) => n.id === id && !n.read))
      setUnread((u) => Math.max(0, u - 1));
    setItems((l) => l.map((n) => (n.id === id ? { ...n, read: true } : n)));
    void post({ id });
  };
  const markAll = () => {
    setItems((l) => l.map((n) => ({ ...n, read: true })));
    setUnread(0);
    setToasts([]);
    void post({ all: true });
  };
  const dismissToast = (id: number) =>
    setToasts((t) => t.filter((x) => x.id !== id));

  return {
    enabled: !!userId,
    items,
    unread,
    ready,
    open,
    setOpen,
    toasts,
    markRead,
    markAll,
    dismissToast,
  };
}

export type NotifState = ReturnType<typeof useNotifications>;

/* ── Ko‘rinish ── */

export function notifHref(n: Notif): string {
  const inv = n.invitationId ? `/kabinet/t/${n.invitationId}` : null;
  if (n.kind === "pay_reject")
    return n.orderId ? `/buyurtma/${n.orderId}/tolov/` : "/kabinet/tolovlar/";
  if (!inv) return "/kabinet/";
  if (n.kind === "pay_ok") return `${inv}/`;
  if (n.kind === "guest_open" || n.data.sg)
    return `${inv}/mehmonlar/?tab=maxsus`;
  return `${inv}/mehmonlar/`;
}

const toneColor = {
  success: "var(--color-success)",
  pending: "var(--color-pending)",
  danger: "var(--color-danger)",
  decline: "var(--color-decline)",
} as const;
const toneBg = {
  success: "var(--success-bg)",
  pending: "var(--pending-bg)",
  danger: "var(--danger-bg)",
  decline: "var(--decline-bg)",
} as const;

function NotifIcon({ n, size = 36 }: { n: Notif; size?: number }) {
  let tone: keyof typeof toneColor | "gold" = "success";
  let icon: ReactNode = <TickCircle size={18} />;
  if (isRsvp(n.kind)) {
    const s = n.data.status ?? "coming";
    tone = rsvpView[s].tone;
    icon =
      s === "coming" ? (
        <TickCircle size={18} />
      ) : s === "maybe" ? (
        <Clock size={18} />
      ) : (
        <CloseCircle size={18} />
      );
  } else if (n.kind === "guest_open") {
    tone = "gold";
    icon = <Eye size={18} />;
  } else if (n.kind === "pay_ok") {
    icon = <WalletCheck size={18} />;
  } else {
    tone = "danger";
    icon = <Warning2 size={18} />;
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        color: tone === "gold" ? "var(--color-gold-deep)" : toneColor[tone],
        background: tone === "gold" ? "var(--color-gold-soft)" : toneBg[tone],
      }}
    >
      {icon}
    </span>
  );
}

/** «{name} taklifnomani ochdi» kabi tarjimada {name} o‘rniga qalin ism */
function rich(tpl: string, name: ReactNode) {
  const parts = tpl.split("{name}");
  return parts.map((p, i) => (
    <Fragment key={i}>
      {p}
      {i < parts.length - 1 && name}
    </Fragment>
  ));
}

function Who({ n }: { n: Notif }) {
  const t = useT();
  const { sg, name } = n.data;
  if (!sg) return <b className="font-semibold text-ink">{name}</b>;
  const differs =
    !!name && name.trim().toLowerCase() !== sg.trim().toLowerCase();
  return (
    <b className="font-semibold text-ink">
      <span className="text-gold" aria-label={t("Maxsus mehmon")}>
        ★{" "}
      </span>
      {sg}
      {differs && <span className="font-normal text-ink-2"> ({name})</span>}
    </b>
  );
}

/** Kabinetdagi filtr chiplari bilan bir xil qisqa holatlar (ranglar — rsvpView) */
const statusLabel: Record<RsvpStatus, string> = {
  coming: "bildirishnoma::Boraman",
  maybe: "Aniq emas",
  not_coming: "Kela olmaydi",
};

function NotifText({ n }: { n: Notif }) {
  const t = useT();
  if (isRsvp(n.kind)) {
    const s = n.data.status ?? "coming";
    const label = t(statusLabel[s]);
    const c = n.data.count ?? 1;
    // «Boraman, 2 kishi»; «Aniq emas» — 1 dan ko‘p bo‘lsa; «Kela olmaydi» — sonsiz
    const count =
      s === "coming" || (s === "maybe" && c > 1)
        ? `, ${c === 1 ? t("1 kishi") : t("{n} kishi", { n: c })}`
        : "";
    return (
      <>
        <Who n={n} /> —{" "}
        <span
          className="font-medium"
          style={{ color: toneColor[rsvpView[s].tone] }}
        >
          {label}
          {count}
        </span>
      </>
    );
  }
  if (n.kind === "guest_open")
    return <>{rich(t("{name} taklifnomani ochdi"), <Who n={n} />)}</>;
  if (n.kind === "pay_ok")
    return (
      <b className="font-semibold text-ink">
        {t("To‘lov tasdiqlandi — taklifnoma faol")}
      </b>
    );
  return <b className="font-semibold text-ink">{t("Chek qabul qilinmadi")}</b>;
}

function NotifMeta({ n }: { n: Notif }) {
  const t = useT();
  const locale = useLocale();
  const bits = [
    n.kind === "rsvp_edit" ? t("Javob o‘zgartirildi") : null,
    n.invitation,
    (n.kind === "pay_ok" || n.kind === "pay_reject") && n.data.code
      ? `№ ${n.data.code}`
      : null,
    relativeTime(n.createdAt, locale),
  ].filter(Boolean);
  return <span className="t-body-s text-ink-2">{bits.join(" · ")}</span>;
}

function NotifRow({ n, onOpen }: { n: Notif; onOpen: (n: Notif) => void }) {
  const t = useT();
  const sub = isRsvp(n.kind)
    ? n.data.wish
    : n.kind === "pay_reject"
      ? t(n.data.reason || "Chek ma’lumotlari mos kelmadi")
      : null;
  return (
    <Link
      href={notifHref(n)}
      onClick={() => onOpen(n)}
      className={`group relative flex items-start gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-bg-soft ${n.read ? "" : "bg-gold-soft/45"}`}
    >
      <NotifIcon n={n} />
      <span className="flex min-w-0 flex-1 flex-col gap-1 pr-3">
        <span className="text-[13.5px] leading-[1.4] text-ink">
          <NotifText n={n} />
        </span>
        {sub && (
          <span
            className={`line-clamp-2 ${isRsvp(n.kind) ? "font-serif text-[15px] italic leading-[1.3] text-ink" : "t-body-s text-ink-2"}`}
          >
            {isRsvp(n.kind) ? `“${sub}”` : sub}
          </span>
        )}
        <NotifMeta n={n} />
      </span>
      {!n.read && (
        <span
          aria-label={t("Yangi")}
          className="absolute right-3 top-4 size-2 rounded-full bg-maroon"
        />
      )}
    </Link>
  );
}

function Empty() {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-gold-soft text-gold-deep">
        <Notification size={26} />
      </span>
      <p className="font-serif text-[22px] font-medium leading-[1.2] text-ink">
        {t("Hozircha bildirishnoma yo‘q")}
      </p>
      <p className="max-w-[300px] t-body-s text-ink-2">
        {t(
          "Mehmonlar javob berganda yoki maxsus mehmon taklifnomani ochganda shu yerda ko‘rasiz.",
        )}
      </p>
    </div>
  );
}

function PanelBody({ s, onClose }: { s: NotifState; onClose: () => void }) {
  const t = useT();
  const openItem = (n: Notif) => {
    if (!n.read) s.markRead(n.id);
    onClose();
  };
  if (!s.ready)
    return (
      <p className="py-10 text-center t-body-m text-ink-2">
        {t("Yuklanmoqda…")}
      </p>
    );
  if (!s.items.length) return <Empty />;
  return (
    <div className="flex flex-col gap-0.5">
      {s.items.map((n) => (
        <NotifRow key={n.id} n={n} onOpen={openItem} />
      ))}
    </div>
  );
}

function BellButton({
  s,
  compact,
  onClick,
}: {
  s: NotifState;
  compact?: boolean;
  onClick: () => void;
}) {
  const t = useT();
  const n = s.unread;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={s.open}
      aria-label={
        n
          ? `${t("Bildirishnomalar")} — ${t("{n} ta o‘qilmagan", { n })}`
          : t("Bildirishnomalar")
      }
      className={`icon-btn relative ${compact ? "!h-10 !w-10" : ""} ${s.open ? "!border-maroon !text-maroon" : ""}`}
    >
      <Notification size={compact ? 19 : 18} />
      {n > 0 && (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-maroon px-1 text-[10.5px] font-semibold leading-none tabular-nums text-ink-inverse ring-2 ring-bg-base"
        >
          {n > 99 ? "99+" : n}
        </span>
      )}
    </button>
  );
}

function MarkAll({ s, className = "" }: { s: NotifState; className?: string }) {
  const t = useT();
  if (!s.unread) return null;
  return (
    <button
      type="button"
      onClick={s.markAll}
      className={`t-body-s font-medium text-maroon hover:underline ${className}`}
    >
      {t("Hammasini o‘qilgan deb belgilash")}
    </button>
  );
}

/** Desktop: qo‘ng‘iroqcha + ochiladigan panel */
export function NotificationBellDesktop({ s }: { s: NotifState }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const { open, setOpen } = s;
  useEffect(() => {
    // mobil kenglikda panel — pastdan oyna (NotificationBellMobile), bu yerdagi yashirin nusxa uni yopmasin
    if (!open || !window.matchMedia("(min-width: 1024px)").matches) return;
    const onDoc = (e: MouseEvent) =>
      ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);
  return (
    <div ref={ref} className="relative">
      <BellButton s={s} onClick={() => setOpen(!open)} />
      {open && (
        <div
          role="dialog"
          aria-label={t("Bildirishnomalar")}
          className="absolute right-0 top-[calc(100%+8px)] z-50 flex max-h-[min(600px,calc(100dvh-120px))] w-[400px] flex-col overflow-hidden rounded-2xl border border-line bg-bg-base shadow-menu animate-[fade-in_.15s]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
            <p className="font-serif text-[22px] font-medium leading-none text-ink">
              {t("Bildirishnomalar")}
            </p>
            <MarkAll s={s} />
          </div>
          <div className="overflow-y-auto overscroll-contain p-1.5">
            <PanelBody s={s} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Mobil: qo‘ng‘iroqcha + pastdan chiqadigan oyna */
export function NotificationBellMobile({ s }: { s: NotifState }) {
  const t = useT();
  const { setOpen } = s;
  const close = useCallback(() => setOpen(false), [setOpen]);
  // Panel holati desktop bilan umumiy — oyna faqat mobil kenglikda ochiladi
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023.98px)");
    const on = () => setMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return (
    <>
      <BellButton s={s} compact onClick={() => setOpen(true)} />
      {/* Sarlavha transform’li — fixed oyna unga emas, sahifaga nisbatan turishi uchun body’ga */}
      {mobile &&
        createPortal(
          <Modal
            open={s.open && mobile}
            onClose={close}
            label={t("Bildirishnomalar")}
            className="flex flex-col !overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 pb-3.5 pt-4">
              <p className="font-serif text-[26px] font-medium leading-none text-ink">
                {t("Bildirishnomalar")}
              </p>
              <button
                type="button"
                onClick={close}
                className="icon-btn !h-10 !w-10"
                aria-label={t("Yopish")}
              >
                <CloseCircle size={20} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
              <PanelBody s={s} onClose={close} />
            </div>
            {s.unread > 0 && (
              <div className="border-t border-line px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
                <button
                  type="button"
                  onClick={s.markAll}
                  className="btn btn-secondary w-full !py-3"
                >
                  <TickCircle size={18} />{" "}
                  {t("Hammasini o‘qilgan deb belgilash")}
                </button>
              </div>
            )}
          </Modal>,
          document.body,
        )}
    </>
  );
}

/** Yangi bildirishnoma kelganda — sarlavha ostida qisqa karta (bosilsa tegishli sahifaga) */
export function NotificationToasts({ s }: { s: NotifState }) {
  const t = useT();
  const { toasts, dismissToast, markRead, setOpen } = s;
  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((n) =>
      setTimeout(() => dismissToast(n.id), TOAST_MS),
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toasts.map((n) => n.id).join(",")]);
  if (!toasts.length) return null;
  const many = toasts.length > 2;
  const shown = many ? [] : toasts;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 top-[78px] z-[75] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-5 sm:w-[380px] lg:right-10 lg:top-[96px] xl:right-[120px]"
    >
      {many && (
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-line bg-bg-base p-3 shadow-menu animate-[fade-in_.2s]">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-deep">
            <Notification size={18} />
          </span>
          <button
            type="button"
            onClick={() => {
              toasts.forEach((n) => dismissToast(n.id));
              setOpen(true);
            }}
            className="flex-1 text-left text-[13.5px] font-semibold text-ink"
          >
            {t("{n} ta yangi bildirishnoma", { n: toasts.length })}
          </button>
          <button
            type="button"
            onClick={() => toasts.forEach((n) => dismissToast(n.id))}
            className="text-ink-2 hover:text-maroon"
            aria-label={t("Yopish")}
          >
            <CloseCircle size={18} />
          </button>
        </div>
      )}
      {shown.map((n) => (
        <div
          key={n.id}
          className="pointer-events-auto relative flex items-start gap-3 rounded-2xl border border-line bg-bg-base p-3 pr-9 shadow-menu animate-[fade-in_.2s]"
        >
          <NotifIcon n={n} />
          <Link
            href={notifHref(n)}
            onClick={() => markRead(n.id)}
            className="flex min-w-0 flex-1 flex-col gap-1"
          >
            <span className="text-[13.5px] leading-[1.4] text-ink">
              <NotifText n={n} />
            </span>
            <NotifMeta n={n} />
          </Link>
          <button
            type="button"
            onClick={() => dismissToast(n.id)}
            className="absolute right-2.5 top-2.5 text-ink-2 hover:text-maroon"
            aria-label={t("Yopish")}
          >
            <CloseCircle size={18} />
          </button>
        </div>
      ))}
    </div>
  );
}
