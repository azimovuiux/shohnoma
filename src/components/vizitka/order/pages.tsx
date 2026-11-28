"use client";

/**
 * Vizitka buyurtma oqimi sahifalari (statik eksport, brauzerda): malumot → korib-chiqish → tolov → (jarayonda | sandbox) →
 * qabul-qilindi | xato → tayyor. To‘lov Rahmat orqali; PAYMENTS_SANDBOX=1 bo‘lsa test to‘lov sahifasi ham bor.
 */
import { useVT } from "./vt";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "@/components/LocalLink";
import { useLocalRouter } from "@/lib/useLocalRouter";
import { lpath, useLocale } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { PageLoading, useConfig, useMe } from "@/lib/client";
import { api, useCopy } from "@/components/ui";
import { ArrowDown, ArrowRight, Call, Card, CloseCircle, Copy, Edit, EmptyWallet, ExportSquare, MessageQuestion, MoneySend, Scan, Send2, TickCircle } from "@/components/icons";
import { InfoCard, OrderLine, StatusScreen } from "@/components/order/StatusScreen";
import { FlowColumns, MobileActions } from "@/components/order/FlowTop";
import { MobileBar } from "@/components/order/OrderSummary";
import { SectionTitle } from "@/components/order/fields";
import { tashkentStamp } from "@/components/order/time";
import { site } from "@/lib/site";
import { downloadQr, qrDataUrl } from "@/lib/qr";
import { CARD_API, CARD_PAGES, loc, type CardLang, type CardPayResponse, type CardPromoResponse, type CardStatusResponse } from "@/lib/cardTypes";
import { CardFlowGate, CardTop, cardEditReturn, cardIndexTarget, type CardCtx } from "./gate";
import { CardForm, PHOTO_LABELS, pickContent } from "./CardForm";
import { LaptopPreview, PhonePreview } from "./Preview";

const PAY_URL_KEY = (id: string) => `shohnoma:cardpay:${id}`;
const origin = () => (typeof window !== "undefined" ? window.location.origin : "https://shohnoma.uz");

/* /vizitka/buyurtma/<id>/ → malumot */
export function CardOrderIndexClient() {
  return <CardFlowGate step="other" guard={({ raw }) => cardIndexTarget(raw)}>{() => null}</CardFlowGate>;
}

/* 1 — Ma’lumotlar */
export function CardFormPageClient() {
  const t = useVT();
  return (
    <CardFlowGate step="malumot">
      {(c) => {
        const edit = cardEditReturn(c);
        return (
          <>
            <CardTop
              back={edit ? { href: edit.href, label: t(edit.label) } : { href: CARD_PAGES.design(c.design.slug), label: t("Dizaynga qaytish") }}
              step={edit ? undefined : "malumot"}
              title={t(edit ? "Vizitkani tahrirlash" : "Vizitka ma’lumotlari")}
              sub={t(edit ? "O‘zgarishlar saqlangach vizitkangizda darhol ko‘rinadi." : "Matnlarni kiriting — o‘ng tomonda vizitkangiz qanday chiqishini ko‘rasiz.")}
            />
            <CardForm ctx={c} edit={edit} />
          </>
        );
      }}
    </CardFlowGate>
  );
}

/** Kiritilgan ma’lumotlar ro‘yxati (ko‘rib chiqish) */
function Summary({ c, lang }: { c: CardCtx; lang: CardLang }) {
  const t = useVT();
  const card = c.raw.card;
  const L = (v: Parameters<typeof loc>[0]) => loc(v, lang);
  const rows: [string, string][] = [
    ["Ism va familiya", card.fullName],
    ["Lavozim", L(card.position)],
    ["Kompaniya", L(card.company)],
    ["Telefon", card.phone],
    ["WhatsApp", card.whatsapp],
    ["Email", card.email],
    ["Telegram", card.telegram],
    ["Veb-sayt", card.website],
  ];
  if (c.design.sections.includes("address")) rows.push(["Manzil", L(card.address)]);
  const lists: [string, number][] = [];
  const s = c.design.sections;
  if (s.includes("directions")) lists.push(["Hamkorlik yo‘nalishlari", card.directions.length]);
  if (s.includes("stats")) lists.push(["Raqamlar", card.stats.length]);
  if (s.includes("companies")) lists.push(["Kompaniyalar", card.companies.length]);
  if (s.includes("socials")) lists.push(["Ijtimoiy tarmoqlar", card.socials.length]);
  if (s.includes("links")) lists.push(["Havolalar", card.links.length]);
  const langs = (["ru", "en"] as CardLang[]).filter((l) => !!card.position[l] || !!card.bio[l]);
  return (
    <div className="flex flex-col gap-4">
      <dl className="divide-y divide-line rounded-panel bg-bg-soft px-4">
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-4 py-3">
              <dt className="shrink-0 t-body-s text-ink-2">{t(k)}</dt>
              <dd className="min-w-0 break-words text-right text-[13px] font-semibold text-ink">{v}</dd>
            </div>
          ))}
        <div className="flex items-start justify-between gap-4 py-3">
          <dt className="t-body-s text-ink-2">{t("Rasmlar")}</dt>
          <dd className="text-right text-[13px] font-semibold text-ink">
            {card.photos.length} / {(PHOTO_LABELS[c.design.slug] ?? []).length || c.design.photoSlots}
          </dd>
        </div>
        {lists.map(([k, n]) => (
          <div key={k} className="flex items-start justify-between gap-4 py-3">
            <dt className="t-body-s text-ink-2">{t(k)}</dt>
            <dd className="text-right text-[13px] font-semibold text-ink">{n ? t("{n} ta", { n }) : "—"}</dd>
          </div>
        ))}
        <div className="flex items-start justify-between gap-4 py-3">
          <dt className="t-body-s text-ink-2">{t("Tillar")}</dt>
          <dd className="text-right text-[13px] font-semibold text-ink">{["UZ", ...langs.map((l) => l.toUpperCase())].join(" · ")}</dd>
        </div>
      </dl>
      <p className="t-body-s text-ink-2">{t("Vizitka manzili to‘lovdan so‘ng ismingizdan yasaladi (masalan, shohnoma.uz/v/aziz-karimov/). Uni kabinetda o‘zgartirish mumkin.")}</p>
    </div>
  );
}

/* 2 — Ko‘rib chiqish */
export function CardReviewPageClient() {
  const t = useVT();
  const locale = useLocale();
  const router = useLocalRouter();
  const [lang, setLang] = useState<CardLang>(locale);
  const [device, setDevice] = useState<"phone" | "laptop">("phone");
  return (
    <CardFlowGate step="korib-chiqish">
      {(c) => {
        const card = pickContent(c.raw.card);
        const go = () => router.push(`${c.base}tolov/`);
        const button = (
          <button type="button" onClick={go} className="btn btn-primary w-full">
            {t("To‘lovga o‘tish")} <ArrowRight size={16} />
          </button>
        );
        return (
          <>
            <CardTop back={{ href: `${c.base}malumot/`, label: t("Ma’lumotlarga qaytish") }} step="korib-chiqish" title={t("Ko‘rib chiqish")} sub={t("Hammasi to‘g‘rimi? Kerak bo‘lsa, ma’lumotlarga qaytib tuzating.")} />
            <FlowColumns
              aside={
                <div className="flex flex-col gap-5 rounded-[24px] bg-bg-soft p-6">
                  <div className="flex items-end justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-serif text-[26px] font-medium leading-[1.2] text-ink">{c.design.name}</span>
                      <span className="t-body-s text-ink-2">№ {c.raw.order.code}</span>
                    </div>
                    <span className="font-serif text-[28px] font-medium text-maroon">{formatPrice(c.raw.order.amount, true, locale)}</span>
                  </div>
                  <p className="t-body-s text-ink-2">{t("To‘lov bir marta — vizitka muddatsiz ishlaydi.")}</p>
                  {button}
                  <Link href={`${c.base}malumot/`} className="btn btn-secondary w-full">
                    <Edit size={16} /> {t("Tahrirlash")}
                  </Link>
                </div>
              }
            >
              <div className="flex flex-col gap-8">
                <div className="flex flex-col items-center gap-5 rounded-[24px] bg-gradient-to-b from-[#f4ece0] to-bg-soft px-4 pb-6 pt-5">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <div className="inline-flex rounded-full bg-bg-base p-1 shadow-soft" role="tablist">
                      {(["phone", "laptop"] as const).map((d) => (
                        <button key={d} type="button" role="tab" aria-selected={device === d} onClick={() => setDevice(d)} className={`h-9 rounded-full px-4 t-nav ${device === d ? "bg-maroon text-ink-inverse" : "text-ink-2"}`}>
                          {t(d === "phone" ? "Telefon" : "Laptop")}
                        </button>
                      ))}
                    </div>
                    <div className="inline-flex rounded-full bg-bg-base p-1 shadow-soft" role="tablist" aria-label={t("Matn tili")}>
                      {(["uz", "ru", "en"] as CardLang[]).map((l) => (
                        <button key={l} type="button" role="tab" aria-selected={lang === l} onClick={() => setLang(l)} className={`h-9 rounded-full px-3.5 t-nav ${lang === l ? "bg-ink text-ink-inverse" : "text-ink-2"}`}>
                          {l.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  {device === "phone" ? (
                    <div className="w-full max-w-[300px]">
                      <PhonePreview design={c.design.slug} card={card} lang={lang} onLang={setLang} />
                    </div>
                  ) : (
                    <div className="w-full max-w-[640px]">
                      <LaptopPreview design={c.design.slug} card={card} lang={lang} onLang={setLang} />
                    </div>
                  )}
                </div>
                <section className="flex flex-col gap-4">
                  <SectionTitle>{t("Ma’lumotlar")}</SectionTitle>
                  <Summary c={c} lang={lang} />
                </section>
              </div>
              <MobileBar>
                <MobileActions back={`${c.base}malumot/`}>{button}</MobileActions>
              </MobileBar>
            </FlowColumns>
          </>
        );
      }}
    </CardFlowGate>
  );
}

type PromoState = { amount: number; code: string | null; discount: number };

function PromoBox({ id, state, onChange }: { id: string; state: PromoState; onChange: (s: PromoState) => void }) {
  const t = useVT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const apply = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await api<CardPromoResponse>(CARD_API.promo(id), { method: "POST", json: { code } });
      onChange({ amount: r.amount, code: r.promoCode ?? code, discount: r.promoDiscount ?? 0 });
      setCode("");
      setOpen(false);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      const r = await api<CardPromoResponse>(CARD_API.promo(id), { method: "DELETE" });
      onChange({ amount: r.amount, code: null, discount: 0 });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (state.code)
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-success/40 bg-success/5 px-4 py-3">
        <span className="flex items-center gap-2 t-body-m text-ink">
          <TickCircle size={18} color="var(--color-success)" />
          {t("Promokod {code} qo‘llandi: −{sum}", { code: state.code, sum: formatPrice(state.discount, true, locale) })}
        </span>
        <button type="button" disabled={busy} onClick={remove} className="t-body-s text-ink-2 hover:text-maroon">
          {t("Olib tashlash")}
        </button>
      </div>
    );
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="w-fit t-body-m font-medium text-maroon hover:underline">
        {t("Promokodingiz bormi?")}
      </button>
    );
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.trim()) void apply();
      }}
    >
      <div className="flex gap-2">
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40))}
          placeholder={t("Promokod")}
          aria-label={t("Promokod")}
          autoComplete="off"
          className="h-[52px] min-w-0 flex-1 rounded-xl border border-line bg-bg-base px-4 font-mono text-[16px] tracking-[0.06em] text-ink outline-none focus:border-maroon"
        />
        <button type="submit" disabled={busy || !code.trim()} className="btn btn-secondary !h-[52px] shrink-0">
          {busy ? t("Kuting…") : t("Qo‘llash")}
        </button>
      </div>
      {err && (
        <p role="alert" className="t-body-s text-danger">
          {t(err)}
        </p>
      )}
    </form>
  );
}

/* 3 — To‘lov */
export function CardPayPageClient() {
  const t = useVT();
  const locale = useLocale();
  const router = useLocalRouter();
  const cfg = useConfig();
  const [promo, setPromo] = useState<PromoState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <CardFlowGate step="tolov">
      {(c) => {
        if (!cfg.data) return <PageLoading />;
        const p = cfg.data.providers.includes("rahmat") ? "rahmat" : null;
        const o = c.raw.order;
        const st = promo ?? { amount: o.amount, code: o.promoCode, discount: o.promoDiscount };
        const pay = async () => {
          if (!p) return;
          setBusy(true);
          setError(null);
          try {
            const r = await api<CardPayResponse>(CARD_API.pay(c.id), { method: "POST", json: { provider: p } });
            if (r.url.startsWith("/")) {
              router.push(r.url);
              return;
            }
            sessionStorage.setItem(PAY_URL_KEY(c.id), r.url);
            router.push(`${c.base}tolov/jarayonda/?usul=${p}&ochish=1`);
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        };
        const button = (
          <button type="button" onClick={pay} disabled={busy || !p} className="btn btn-primary w-full disabled:opacity-50">
            {busy ? t("Kuting…") : p ? t("To‘lash") : t("To‘lov vaqtincha mavjud emas")} {p && !busy && <ArrowRight size={16} />}
          </button>
        );
        const sandbox = cfg.data.sandbox && (
          <Link href={`${c.base}tolov/sandbox/?usul=rahmat`} className="btn btn-secondary w-full">
            {t("Test to‘lov (sinov rejimi)")}
          </Link>
        );
        const err = error && (
          <p role="alert" className="text-center t-body-s text-danger">
            {t(error)}
          </p>
        );
        return (
          <>
            <CardTop back={{ href: `${c.base}korib-chiqish/`, label: t("Tekshiruvga qaytish") }} step="tolov" title={t("To‘lov")} />
            <FlowColumns
              aside={
                <div className="flex flex-col gap-5 rounded-[24px] bg-bg-soft p-6">
                  <div className="mx-auto w-full max-w-[220px]">
                    <PhonePreview design={c.design.slug} card={pickContent(c.raw.card)} lang={locale} onLang={() => {}} />
                  </div>
                  <dl className="flex flex-col gap-3">
                    {(
                      [
                        ["Buyurtma", `№ ${o.code}`],
                        ["Dizayn", c.design.name],
                        ["Vizitka", c.raw.card.fullName],
                        ...(st.code ? ([[t("Promokod {code}", { code: st.code }), `−${formatPrice(st.discount, true, locale)}`]] as [string, string][]) : []),
                      ] as [string, string][]
                    ).map(([l, v]) => (
                      <div key={l} className="flex items-start justify-between gap-4">
                        <dt className="t-body-s text-ink-2">{t(l)}</dt>
                        <dd className="text-right text-[13px] font-semibold text-ink">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="h-px bg-line" />
                  <div className="flex items-center justify-between">
                    <span className="t-title text-ink">{t("Jami")}</span>
                    <span className="font-serif text-[28px] font-medium text-maroon">{formatPrice(st.amount, true, locale)}</span>
                  </div>
                  {button}
                  {sandbox}
                  {err}
                </div>
              }
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-bg-soft px-4 py-3 lg:hidden">
                  <span className="t-body-m text-ink">
                    {c.design.name} · № {o.code}
                  </span>
                  <span className="font-serif text-[22px] font-medium text-maroon">{formatPrice(st.amount, true, locale)}</span>
                </div>
                <div className="flex items-center gap-3.5 rounded-xl border border-line bg-bg-base px-4 py-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/pay/rahmat.svg" alt="Rahmat" width={86} height={18} className="h-[18px] w-auto shrink-0" />
                  <span className="t-body-s text-ink-2">
                    {p ? t("Uzcard, Humo, Visa kartasi yoki Payme, Click, Uzum ilovasi orqali — xavfsiz to‘lov sahifasida.") : t("Onlayn to‘lov vaqtincha ishlamayapti. Birozdan so‘ng urinib ko‘ring yoki biz bilan bog‘laning.")}
                  </span>
                </div>
                <p className="t-body-s text-ink-2">{t("To‘lov bir marta — vizitka muddatsiz ishlaydi.")}</p>
                <PromoBox id={c.id} state={st} onChange={setPromo} />
                <div className="lg:hidden">{sandbox}</div>
              </div>
              <MobileBar>
                <MobileActions back={`${c.base}korib-chiqish/`}>{button}</MobileActions>
                {err}
              </MobileBar>
            </FlowColumns>
          </>
        );
      }}
    </CardFlowGate>
  );
}

/** /api/cards/:id/status ni so‘rab turadi; onData false qaytarsa — to‘xtaydi */
function useCardPoll(id: string, onData: (d: CardStatusResponse) => boolean | void, ms = 3000) {
  const cb = useRef(onData);
  cb.current = onData;
  useEffect(() => {
    let stop = false;
    let tm: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const res = await fetch(CARD_API.status(id), { cache: "no-store" });
        if (res.ok && cb.current((await res.json()) as CardStatusResponse) === false) stop = true;
      } catch {}
      if (!stop) tm = setTimeout(tick, document.hidden ? ms * 3 : ms);
    };
    tm = setTimeout(tick, 800);
    return () => {
      stop = true;
      clearTimeout(tm);
    };
  }, [id, ms]);
}

/* To‘lov jarayonida: Rahmat sahifasiga o‘tish va qaytgach holatni kutish */
export function CardProcessingPageClient() {
  return (
    <CardFlowGate step="other" guard={({ raw }) => (raw.order.status === "active" || raw.order.status === "paid" ? CARD_PAGES.paySuccess(raw.order.id) : null)}>
      {(c) => <Processing c={c} />}
    </CardFlowGate>
  );
}

function Processing({ c }: { c: CardCtx }) {
  const t = useVT();
  const locale = useLocale();
  const router = useLocalRouter();
  const [error, setError] = useState<string | null>(null);
  const [waitedLong, setWaitedLong] = useState(false);
  const opened = useRef(false);
  const auto = c.search.get("ochish") === "1";
  const open = async () => {
    setError(null);
    let url = sessionStorage.getItem(PAY_URL_KEY(c.id));
    if (!url) {
      try {
        url = (await api<CardPayResponse>(CARD_API.pay(c.id), { method: "POST", json: { provider: "rahmat" } })).url;
      } catch (e) {
        setError((e as Error).message);
        return;
      }
    }
    sessionStorage.removeItem(PAY_URL_KEY(c.id));
    if (url.startsWith("/")) router.push(url);
    else window.location.href = url;
  };
  useEffect(() => {
    if (!auto || opened.current) return;
    opened.current = true;
    window.history.replaceState(null, "", lpath(locale, `${c.base}tolov/jarayonda/?usul=rahmat`));
    const tm = setTimeout(open, 1400);
    return () => clearTimeout(tm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const tm = setTimeout(() => setWaitedLong(true), 45_000);
    return () => clearTimeout(tm);
  }, []);
  useCardPoll(c.id, (d) => {
    if (d.status === "active" || d.status === "paid") {
      router.replace(CARD_PAGES.paySuccess(c.id));
      return false;
    }
    if (d.status === "payment_failed") {
      router.replace(CARD_PAGES.payFail(c.id));
      return false;
    }
  });
  return (
    <StatusScreen kind="progress" icon={<MoneySend size={30} />} title={t("Rahmat’ga o‘tmoqdasiz")} text={t("To‘lovni {name} sahifasida yakunlang. Bu sahifani yopmang.", { name: "Rahmat" })}>
      <InfoCard
        rows={[
          [t("Buyurtma"), `№ ${c.raw.order.code} · ${c.design.name}`],
          [t("To‘lanadigan summa"), <span key="a" className="font-serif text-[22px] font-medium text-maroon">{formatPrice(c.raw.order.amount, true, locale)}</span>],
        ]}
      />
      <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
        <button type="button" onClick={open} className="btn btn-primary">
          {t("Rahmat’ni ochish")} <ArrowRight size={16} />
        </button>
        <Link href={`${c.base}tolov/`} className="btn btn-secondary">
          {waitedLong ? t("To‘lov sahifasiga qaytish") : t("Bekor qilish")}
        </Link>
      </div>
      {error && (
        <p role="alert" className="t-body-s text-danger">
          {t(error)}
        </p>
      )}
      <p className="t-body-s text-ink-2">{waitedLong ? t("To‘lov hali tasdiqlanmadi. To‘lagan bo‘lsangiz, biroz kuting — sahifa o‘zi yangilanadi.") : t("Sahifa ochilmadimi? «{button}» tugmasini bosing", { button: t("Rahmat’ni ochish") })}</p>
    </StatusScreen>
  );
}

/* Test to‘lov (PAYMENTS_SANDBOX=1) */
export function CardSandboxPageClient() {
  const t = useVT();
  const locale = useLocale();
  const router = useLocalRouter();
  const cfg = useConfig();
  const [busy, setBusy] = useState(false);
  if (cfg.loading) return <PageLoading />;
  if (!cfg.data?.sandbox)
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-[480px] flex-col items-center justify-center gap-4 px-5 text-center">
        <p className="font-serif text-[30px] font-light text-ink">{t("Sahifa topilmadi")}</p>
        <Link href="/" className="btn btn-secondary">
          {t("Bosh sahifa")}
        </Link>
      </div>
    );
  return (
    <CardFlowGate step="other" guard={({ raw }) => (raw.order.status === "active" || raw.order.status === "paid" ? CARD_PAGES.ready(raw.order.id) : null)}>
      {(c) => {
        const run = async (result: "success" | "fail") => {
          setBusy(true);
          try {
            const r = await api<{ url?: string }>(CARD_API.sandbox(c.id), { method: "POST", json: { result, provider: c.search.get("usul") ?? "rahmat" } });
            router.replace(r.url ?? `${c.base}tolov/`);
          } catch {
            setBusy(false);
          }
        };
        return (
          <StatusScreen kind="progress" icon={<MoneySend size={30} />} title={t("Test to‘lov")} text={t("Bu sahifa faqat sinov rejimida ko‘rinadi — haqiqiy provayder o‘rniga natijani tanlang.")}>
            <InfoCard rows={[[t("Buyurtma"), `№ ${c.raw.order.code}`], [t("Usul"), c.search.get("usul") ?? "rahmat"], [t("Summa"), formatPrice(c.raw.order.amount, true, locale)]]} />
            <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
              <button type="button" disabled={busy} onClick={() => run("success")} className="btn btn-primary">
                <TickCircle size={16} /> {t("To‘lov muvaffaqiyatli")}
              </button>
              <button type="button" disabled={busy} onClick={() => run("fail")} className="btn btn-secondary">
                <CloseCircle size={16} /> {t("To‘lov o‘tmadi")}
              </button>
            </div>
          </StatusScreen>
        );
      }}
    </CardFlowGate>
  );
}

const publicUrl = (slug: string) => `${origin()}${CARD_PAGES.public(slug)}`;

/* To‘lov qabul qilindi */
export function CardPaidPageClient() {
  const t = useVT();
  const locale = useLocale();
  return (
    <CardFlowGate step="other" guard={({ raw }) => (raw.order.status === "active" || raw.order.status === "paid" ? null : CARD_PAGES.payProcessing(raw.order.id))}>
      {(c) => {
        const p = c.raw.payment;
        return (
          <StatusScreen kind="success" title={t("To‘lov qabul qilindi")} text={t("Vizitkangiz ishga tushdi.")}>
            <InfoCard
              rows={[
                [t("To‘langan summa"), <span key="s" className="font-serif text-[22px] font-medium text-maroon">{formatPrice(c.raw.order.amount, true, locale)}</span>],
                [t("Usul"), p ? (p.provider === "rahmat" ? "Rahmat" : p.provider) : "—"],
                [t("Buyurtma"), `№ ${c.raw.order.code}`],
                [t("Sana"), tashkentStamp(c.raw.order.paidAt ?? p?.paidAt ?? new Date(), "full", locale)],
              ]}
            />
            <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
              <Link href={CARD_PAGES.ready(c.id)} className="btn btn-primary">
                {t("Vizitkamni ko‘rish")} <ArrowRight size={16} />
              </Link>
              <a href={publicUrl(c.raw.card.slug)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                <ExportSquare size={16} /> {t("Yangi oynada ochish")}
              </a>
            </div>
          </StatusScreen>
        );
      }}
    </CardFlowGate>
  );
}

/* To‘lov o‘tmadi */
export function CardFailedPageClient() {
  const t = useVT();
  const locale = useLocale();
  const tips = [
    [<EmptyWallet key="1" size={16} />, "Kartada yetarli mablag‘ borligini tekshiring"],
    [<Call key="2" size={16} />, "SMS kodni to‘g‘ri kiritganingizga ishonch hosil qiling"],
    [<Card key="3" size={16} />, "Boshqa karta yoki to‘lov usulini tanlang"],
  ] as const;
  return (
    <CardFlowGate step="other" guard={({ raw }) => (raw.order.status === "active" || raw.order.status === "paid" ? CARD_PAGES.ready(raw.order.id) : null)}>
      {(c) => (
        <StatusScreen kind="error" title={t("To‘lov o‘tmadi")} text={t("Kartadan pul yechilmadi.")}>
          <div className="w-full max-w-[520px] rounded-panel bg-bg-soft p-5 text-left">
            <p className="t-title text-ink">{t("Nima qilish mumkin")}</p>
            <ul className="mt-3 flex flex-col gap-3">
              {tips.map(([icon, text]) => (
                <li key={text} className="flex items-center gap-3 t-body-m text-ink">
                  <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-bg-base text-maroon">{icon}</span>
                  {t(text)}
                </li>
              ))}
            </ul>
          </div>
          <OrderLine left={`№ ${c.raw.order.code} · ${c.design.name}`} amount={formatPrice(c.raw.order.amount, true, locale)} />
          <Link href={`${c.base}tolov/`} className="btn btn-primary">
            <Card size={16} /> {t("Qayta to‘lash")}
          </Link>
          <a href={site.telegram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 t-body-s text-maroon hover:underline">
            <MessageQuestion size={15} /> {t("Yordam kerakmi? Telegramda yozing")}
          </a>
        </StatusScreen>
      )}
    </CardFlowGate>
  );
}

/* Tayyor: havola, QR, ulashish, kabinet */
export function CardReadyPageClient() {
  return <CardFlowGate step="tayyor">{(c) => <Ready c={c} />}</CardFlowGate>;
}

function Ready({ c }: { c: CardCtx }) {
  const t = useVT();
  const locale = useLocale();
  const copy = useCopy();
  const { me } = useMe();
  const url = publicUrl(c.raw.card.slug);
  const host = url.replace(/^https?:\/\//, "");
  const [qr, setQr] = useState<string | null>(null);
  const [lang, setLang] = useState<CardLang>(locale);
  useEffect(() => {
    qrDataUrl(url, 640).then(setQr).catch(() => {});
  }, [url]);
  const card = useMemo(() => pickContent(c.raw.card), [c.raw.card]);
  const file = `vizitka-${c.raw.card.slug}`;
  const share = () => {
    if (typeof navigator.share === "function") navigator.share({ title: c.raw.card.fullName, url }).catch(() => {});
    else void copy(url);
  };
  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-6 lg:px-10 lg:pb-24 lg:pt-9 xl:px-[120px]">
      <div className="flex flex-col-reverse gap-10 lg:flex-row lg:items-start lg:gap-16">
        <div className="flex flex-col items-center gap-4 rounded-[24px] bg-gradient-to-b from-[#f4ece0] to-bg-soft px-4 pb-6 pt-5 lg:w-[420px] lg:shrink-0">
          <div className="w-full max-w-[300px]">
            <PhonePreview design={c.design.slug} card={card} lang={lang} onLang={setLang} />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 t-body-s font-medium text-success">
            <TickCircle size={16} /> {t("To‘langan")}
          </span>
          <h1 className="font-serif text-[38px] font-light leading-[1.05] text-ink lg:text-[52px]">{t("Vizitkangiz tayyor")}</h1>
          <p className="t-body-l text-ink-2">{t("Havolani mijoz va hamkorlarga yuboring yoki QR kodni chop eting — vizitka telefonda darrov ochiladi.")}</p>
          <div className="flex flex-col gap-2.5 rounded-[20px] border border-line bg-bg-base p-4">
            <span className="t-annotation text-ink-2">{t("Vizitka manzili")}</span>
            <div className="flex flex-wrap items-center gap-2">
              <a href={url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-serif text-[22px] text-maroon hover:underline">
                {host}
              </a>
              <button type="button" onClick={() => copy(url)} className="btn btn-secondary btn-sm">
                <Copy size={15} /> {t("Nusxa olish")}
              </button>
            </div>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              <ExportSquare size={16} /> {t("Vizitkani ochish")}
            </a>
            <button type="button" onClick={share} className="btn btn-secondary">
              <Send2 size={16} /> {t("Ulashish")}
            </button>
            <a href={`${CARD_API.vcard(c.raw.card.slug)}?lang=${lang}`} className="btn btn-secondary">
              <ArrowDown size={16} /> {t("Kontaktni yuklab olish (.vcf)")}
            </a>
            {me?.user && (
              <Link href={CARD_PAGES.cabinetCard(c.id)} className="btn btn-secondary">
                <Edit size={16} /> {t("Kabinetda boshqarish")}
              </Link>
            )}
          </div>
          <div className="flex flex-col items-start gap-4 rounded-[20px] bg-bg-soft p-4 sm:flex-row sm:items-center">
            <div className="size-[132px] shrink-0 overflow-hidden rounded-[14px] bg-white p-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {qr ? <img src={qr} alt="QR" className="size-full" /> : <span className="block size-full animate-pulse bg-bg-soft" />}
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="inline-flex items-center gap-2 t-title text-ink">
                <Scan size={18} /> {t("QR kod")}
              </span>
              <span className="t-body-s text-ink-2">{t("Vizitka qog‘oz kartaga, stol tablichkasiga yoki bannerga chop etish uchun.")}</span>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => downloadQr(url, "png", file)} className="btn btn-secondary btn-sm">
                  PNG
                </button>
                <button type="button" onClick={() => downloadQr(url, "svg", file)} className="btn btn-secondary btn-sm">
                  SVG
                </button>
              </div>
            </div>
          </div>
          <p className="t-body-s text-ink-2">
            {t("Buyurtma")} № {c.raw.order.code} · {c.design.name}
          </p>
        </div>
      </div>
    </div>
  );
}
