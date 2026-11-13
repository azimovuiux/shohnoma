"use client";

/**
 * Buyurtma oqimidan adashib chiqib ketmaslik (mijoz talabi):
 * - to‘ldirish bosqichlarida (marosim → tafsilotlar → ko‘rib chiqish → to‘lov tanlash) oqimdan tashqariga olib ketadigan
 *   har qanday ichki havola (logotip, footer, «Orqaga» 1-bosqichda…) — tasdiqlash oynasi;
 * - brauzer «orqaga» (mobil swipe-back ham — popstate): bosqichlar orasida oldingi bosqichga xavfsiz o‘tadi,
 *   1-bosqichda oqimdan chiqishdan oldin so‘raydi;
 * - sahifani yopish/yangilash — faqat saqlanmagan o‘zgarish bo‘lsa (beforeunload);
 * - «Qoralamani saqlash» va «Chiqish» (FlowHeader) shu yerdan boshqariladi.
 * Oqim ichidagi o‘tishlar, FlowGate avtomatik yo‘naltirishlari va to‘lov provayderiga o‘tish so‘ralmaydi.
 * Kabinetdan tahrirlash rejimida (?qaytish=kabinet) — faqat saqlanmagan o‘zgarish bo‘lsa so‘raladi.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Modal, useToast } from "@/components/ui";
import { lpath, useLocale, useT } from "@/lib/i18n";

export type FlowStep = 1 | 2 | 3 | 4;
const STEP_SEG: Record<FlowStep, string> = { 1: "marosim", 2: "tafsilotlar", 3: "korib-chiqish", 4: "tolov" };

/** Joriy sahifa: to‘ldirish bosqichi (fill) yoki kabinetdan tahrirlash (edit) */
export type FlowPage = { kind: "fill" | "edit"; orderId: string; step: FlowStep | null; templateSlug: string };
/** Formaning saqlovchisi (useAutosave ustida) */
export type FlowSaver = { flush: () => Promise<boolean>; dirty: () => boolean; discard: () => void; hold?: () => void; resume?: () => void };

type Target = { type: "href"; href: string } | { type: "back" } | { type: "exit" } | { type: "reload"; href: string };
type Ask = { target: Target; dirty: boolean };

type Api = {
  page: FlowPage | null;
  saving: boolean;
  setPage: (p: FlowPage | null) => void;
  setSaver: (s: FlowSaver | null) => void;
  saveDraft: () => Promise<boolean>;
  exit: () => void;
  /** To‘liq qayta yuklanadigan, lekin oqimda qoladigan o‘tish (til almashtirish): avval saqlab, keyin o‘tadi */
  reloadTo: (href: string) => void;
  /** Oqim ichida boshqa bosqichga: avval kutilayotgan o‘zgarishlarni yuborib, keyin `fn` */
  flushThen: (fn: () => void) => void;
};

const noop = async () => true;
const Ctx = createContext<Api>({
  page: null,
  saving: false,
  setPage: () => {},
  setSaver: () => {},
  saveDraft: noop,
  exit: () => {},
  reloadTo: (href) => {
    window.location.href = href;
  },
  flushThen: (fn) => fn(),
});
export const useFlowGuard = () => useContext(Ctx);

const FLOW_RE = /^(?:\/(?:ru|en))?\/buyurtma\/([^/]+)\//;
const orderOfPath = (path: string) => path.match(FLOW_RE)?.[1] ?? null;

type NavEntry = { url: string | null; index: number };
type NavLike = { currentEntry: NavEntry | null; entries: () => NavEntry[] };
/** Navigation API (Chromium, yangi Safari/Firefox) — tarixdagi oldingi yozuvlar manzili; bo‘lmasa null */
function navApi(): NavLike | null {
  const n = (window as unknown as { navigation?: NavLike }).navigation;
  return n && typeof n.entries === "function" && n.currentEntry ? n : null;
}
const pathOf = (url: string | null) => {
  try {
    return url ? new URL(url).pathname : null;
  } catch {
    return null;
  }
};
const SENTINEL = "__fg";

/** Sahifani oqim sahifasi sifatida ro‘yxatga oladi (FlowGate ichidan) */
export function useFlowPage(p: FlowPage | null) {
  const { setPage } = useFlowGuard();
  const key = p ? `${p.kind}|${p.orderId}|${p.step}|${p.templateSlug}` : "";
  useEffect(() => {
    if (!p) return;
    setPage(p);
    return () => setPage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setPage]);
}

/** Forma saqlovchisini ro‘yxatga oladi */
export function useFlowSaver(s: FlowSaver) {
  const { setSaver } = useFlowGuard();
  const ref = useRef(s);
  ref.current = s;
  useEffect(() => {
    setSaver({
      flush: () => ref.current.flush(),
      dirty: () => ref.current.dirty(),
      discard: () => ref.current.discard(),
      hold: () => ref.current.hold?.(),
      resume: () => ref.current.resume?.(),
    });
    return () => setSaver(null);
  }, [setSaver]);
}

export function FlowGuardProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const toast = useToast();
  const locale = useLocale();
  const router = useRouter();
  const [page, setPageState] = useState<FlowPage | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [saving, setSaving] = useState(false);
  const pageRef = useRef<FlowPage | null>(null);
  const saverRef = useRef<FlowSaver | null>(null);
  const leaving = useRef(false); // tasdiqlangan chiqish — boshqa hech narsa ushlamasin
  const armed = useRef(false); // joriy tarix yozuvi — biz qo‘ygan «to‘siq» nusxa

  const setPage = useCallback((p: FlowPage | null) => {
    pageRef.current = p;
    setPageState(p);
    if (p) leaving.current = false;
  }, []);
  const setSaver = useCallback((s: FlowSaver | null) => {
    saverRef.current = s;
  }, []);
  const isDirty = () => !!saverRef.current?.dirty();

  const exitHref = () => lpath(locale, "/kabinet/");
  const backFallback = (p: FlowPage) => lpath(locale, p.kind === "edit" ? "/kabinet/" : `/shablonlar/${p.templateSlug}/`);
  const stepHref = (p: FlowPage, s: FlowStep) => lpath(locale, `/buyurtma/${p.orderId}/${STEP_SEG[s]}/`);

  /** Tarixga joriy sahifaning nusxasini qo‘yish: brauzer «orqaga» avval shu nusxaga qaytadi — sahifa almashmaydi, biz qaror qilamiz */
  const arm = useCallback(() => {
    if (armed.current || leaving.current) return;
    const st = (window.history.state ?? {}) as Record<string, unknown>;
    if (st[SENTINEL]) {
      armed.current = true;
      return;
    }
    window.history.pushState({ ...st, [SENTINEL]: 1 }, "", window.location.href);
    armed.current = true;
  }, []);

  const go = useCallback(
    (target: Target) => {
      const p = pageRef.current;
      leaving.current = true;
      setAsk(null);
      if (target.type === "href") return router.push(target.href);
      if (target.type === "reload") {
        window.location.href = target.href;
        return;
      }
      if (target.type === "exit") return router.push(exitHref());
      // «orqaga»: tarixdagi oqimdan tashqaridagi eng yaqin sahifaga (Navigation API), bo‘lmasa — shablon sahifasiga
      const nav = navApi();
      if (nav && p) {
        const cur = nav.currentEntry!.index;
        const list = nav.entries();
        for (let i = cur - 1; i >= 0; i--) {
          const path = pathOf(list[i]?.url ?? null);
          if (path && orderOfPath(path) !== p.orderId) {
            window.history.go(i - cur);
            return;
          }
        }
      }
      router.push(p ? backFallback(p) : exitHref());
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, locale],
  );

  // oyna ochiq turganda avtosaqlash kutadi: «Saqlamasdan chiqish» rostdan ham saqlamasin
  const open = useCallback((target: Target) => {
    saverRef.current?.hold?.();
    setAsk({ target, dirty: isDirty() });
  }, []);

  const saveDraft = useCallback(async () => {
    if (!pageRef.current) return false;
    setSaving(true);
    const ok = saverRef.current ? await saverRef.current.flush() : true;
    setSaving(false);
    if (!ok) {
      toast(t("Qoralama saqlanmadi — internet aloqasini tekshirib, qayta urinib ko‘ring"), "error");
      return false;
    }
    toast(isDirty() ? t("Qoralama saqlandi. Chala kiritilgan maydonlar saqlanmadi.") : t("Qoralama saqlandi — kabinetdan davom ettirasiz"));
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, toast]);

  const exit = useCallback(() => (pageRef.current ? open({ type: "exit" }) : go({ type: "exit" })), [open, go]);

  const reloadTo = useCallback(
    async (href: string) => {
      if (!pageRef.current) {
        window.location.href = href;
        return;
      }
      const ok = saverRef.current ? await saverRef.current.flush() : true;
      if (ok && !isDirty()) return go({ type: "reload", href });
      open({ type: "reload", href });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [go, open],
  );

  const flushThen = useCallback((fn: () => void) => {
    const f = saverRef.current?.flush();
    if (f) void f.finally(fn);
    else fn();
  }, []);

  /* 1. Ichki havolalar */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const p = pageRef.current;
      if (!p || leaving.current) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download") || a.dataset.noGuard !== undefined) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return; // tashqi, tel:, mailto:
      if (url.pathname === window.location.pathname && (url.hash || url.search === window.location.search)) return; // shu sahifa
      if (orderOfPath(url.pathname) === p.orderId) return; // shu buyurtma bosqichlari / to‘lov sahifalari
      if (p.kind === "edit" && !isDirty()) return;
      e.preventDefault();
      e.stopPropagation();
      open({ type: "href", href: url.pathname + url.search + url.hash });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* 2. Brauzer «orqaga» / swipe-back — faqat to‘ldirish bosqichlarida */
  useEffect(() => {
    if (!page || page.kind !== "fill" || !page.step) return;
    armed.current = false;
    // Chrome foydalanuvchi harakatisiz qo‘shilgan tarix yozuvini «orqaga»da tashlab ketadi — shuning uchun
    // to‘siq faqat sahifa bilan ishlay boshlangach (bosish/klaviatura) qo‘yiladi; undan oldin yo‘qotiladigan narsa yo‘q.
    const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    const onAct = () => arm();
    if (!ua || ua.hasBeenActive) arm();
    else {
      window.addEventListener("pointerdown", onAct, { once: true, capture: true });
      window.addEventListener("keydown", onAct, { once: true, capture: true });
    }
    const here = window.location.pathname;
    const onPop = () => {
      if (leaving.current) return;
      const wasArmed = armed.current;
      armed.current = false;
      // to‘siq olib tashlandi, sahifa o‘zgarmadi — foydalanuvchi «orqaga» bosdi
      if (!wasArmed || window.location.pathname !== here) return;
      const p = pageRef.current;
      if (!p || !p.step) return;
      if (p.step > 1) {
        const prev = stepHref(p, (p.step - 1) as FlowStep);
        const nav = navApi();
        const before = nav ? pathOf(nav.entries()[nav.currentEntry!.index - 1]?.url ?? null) : null;
        // tabiiy tarix: oldingi bosqich; aks holda (masalan kabinetdan 3-bosqichga kirilgan) — baribir oldingi bosqichga
        flushThen(() => (before === new URL(prev, window.location.href).pathname ? window.history.back() : router.replace(prev)));
        return;
      }
      arm();
      open({ type: "back" });
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("pointerdown", onAct, { capture: true });
      window.removeEventListener("keydown", onAct, { capture: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, arm, open, router, flushThen]);

  /* 3. Yopish / yangilash — faqat saqlanmagan o‘zgarish bo‘lsa */
  useEffect(() => {
    const onBefore = (e: BeforeUnloadEvent) => {
      if (leaving.current || !pageRef.current || !isDirty()) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, []);

  const api = useMemo<Api>(
    () => ({ page, saving, setPage, setSaver, saveDraft, exit, reloadTo, flushThen }),
    [page, saving, setPage, setSaver, saveDraft, exit, reloadTo, flushThen],
  );

  const close = useCallback(() => {
    setAsk(null);
    saverRef.current?.resume?.();
  }, []);
  const saveAndGo = async () => {
    if (!ask) return;
    const target = ask.target;
    setSaving(true);
    const ok = saverRef.current ? await saverRef.current.flush() : true;
    setSaving(false);
    if (!ok) {
      toast(t("Qoralama saqlanmadi — internet aloqasini tekshirib, qayta urinib ko‘ring"), "error");
      return;
    }
    if (target.type !== "reload") toast(t("Qoralama saqlandi — kabinetdan davom ettirasiz"));
    go(target);
  };
  const discardAndGo = () => {
    if (!ask) return;
    saverRef.current?.discard();
    go(ask.target);
  };

  const fill = page?.kind === "fill";
  const title = ask?.target.type === "reload" ? t("Saqlanmagan o‘zgarishlar bor") : fill ? t("Buyurtmadan chiqasizmi?") : t("Sahifadan chiqasizmi?");
  const text =
    !fill || ask?.target.type === "reload"
      ? t("Oxirgi o‘zgarishlar hali saqlanmagan.")
      : ask?.dirty
        ? t("Oxirgi o‘zgarishlar hali saqlanmagan. Qoralamani saqlab chiqsangiz, kabinetdagi «Buyurtmalarim» bo‘limidan istalgan payt davom ettirasiz.")
        : t("Kiritgan ma’lumotlaringiz qoralama sifatida saqlanadi — kabinetdagi «Buyurtmalarim» bo‘limidan istalgan payt davom ettirasiz.");
  const primary = ask?.target.type === "reload" ? t("Saqlab davom etish") : fill ? t("Qoralamani saqlab chiqish") : t("Saqlab chiqish");

  return (
    <Ctx.Provider value={api}>
      {children}
      <Modal open={!!ask} onClose={close} label={title}>
        <div className="flex flex-col gap-4 p-6">
          <p className="font-serif text-[28px] font-light leading-[1.1] text-ink">{title}</p>
          <p className="t-body-m text-ink-2">{text}</p>
          <div className="flex flex-col gap-2.5 pt-1">
            <button type="button" className="btn btn-primary w-full" onClick={saveAndGo} disabled={saving} data-flow-action="save-exit">
              {saving ? t("Saqlanmoqda…") : primary}
            </button>
            {ask?.dirty && (
              <button type="button" className="btn btn-secondary w-full" onClick={discardAndGo} data-flow-action="discard-exit">
                {ask.target.type === "reload" ? t("Saqlamasdan davom etish") : t("Saqlamasdan chiqish")}
              </button>
            )}
            <button type="button" className="btn w-full text-ink-2 hover:text-maroon" onClick={close} autoFocus data-flow-action="stay">
              {fill ? t("To‘ldirishni davom ettirish") : t("Davom ettirish")}
            </button>
          </div>
        </div>
      </Modal>
    </Ctx.Provider>
  );
}
