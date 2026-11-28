"use client";

/**
 * «Editorial Noir» — Figma: mobil 552:13115 (390), laptop 559:12639 (1440), assets 545:12620.
 * Bo‘limlar: Hero (portret + ism), Hamkorlik yo‘nalishlari, Raqamlar, Kompaniyalar (akkordeon), Kontakt qoldiring (lead),
 * Kontaktlar, Footer; mobilda pastda yopishqoq panel. O‘lchamlar `--u` (mobil 390 / laptop 1440 kanvas).
 * Wallet tugmalari o‘rnida — «QR kod» va «Ulashish» (foydalanuvchi qarori: Wallet yo‘q).
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { loc, type CardLang } from "@/lib/cardTypes";
import { Icon } from "../shared/icons";
import { ct, LANG_LABEL, LEAD_ERROR_KEYS } from "../shared/labels";
import {
  CountText,
  copyText,
  cx,
  Fit,
  FitCell,
  fmtPhone,
  initials,
  mapHref,
  photoOf,
  reducedMotion,
  splitName,
  telHref,
  tgHandle,
  tgHref,
  useFitLines,
  useReveal,
  useToast,
  useCanvas,
  waHref,
  hostOf,
  type CardViewProps,
} from "../shared/runtime";
import st from "./noir.module.css";

const LANGS: CardLang[] = ["uz", "ru", "en"];
const PURPOSES = ["Investitsiya", "Hamkorlik", "Boshqa"];

function chunk<T>(a: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n));
  return out;
}

/** «$40M+» → katta qism + kichik «+» (Figma: Literata 48 + Geologica 26) */
function StatValue({ v }: { v: string }) {
  const m = v.match(/^(.*?)([+%]+)$/);
  if (!m) return <>{v}</>;
  return (
    <>
      {m[1]}
      <span className={st.statPlus}>{m[2]}</span>
    </>
  );
}

export function NoirCard({ card, lang, onLang, mode, actions }: CardViewProps) {
  const root = useRef<HTMLDivElement>(null);
  const { wide, unit } = useCanvas(root);
  const still = mode === "preview";
  const L = (v: Parameters<typeof loc>[0]) => loc(v, lang);
  const T = (s: string) => ct(s, lang);
  const toast = useToast();
  const [saved, setSaved] = useState(false);
  const [fade, setFade] = useState(0);
  const [loaded, setLoaded] = useState(still);

  useReveal(root, still, `${wide}|${lang}|${card.directions.length}|${card.companies.length}|${card.stats.length}`);
  useEffect(() => {
    if (still) return;
    const t = setTimeout(() => setLoaded(true), 40);
    return () => clearTimeout(t);
  }, [still]);

  const portrait = photoOf(card, 0, "v-noir", mode);
  const office = photoOf(card, 1, "v-noir", mode);
  const name = splitName(card.fullName);
  const bio = L(card.bio) || [L(card.position), L(card.company)].filter(Boolean).join(", ");
  const phone = card.phone;
  const wa = card.whatsapp || card.phone;
  const tg = tgHandle(card.telegram);
  const address = L(card.address);
  const map = mapHref(address, card.mapUrl);

  const nameRef = useRef<HTMLDivElement>(null);
  useFitLines(nameRef, wide ? 168 : 78, wide ? 672 : 346, `${card.fullName}|${wide}`);

  // Mobil: portret skroll bilan sekin siljiydi (parallaks 0.15x), laptop: kursor bilan ±10px
  const photoRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = photoRef.current;
    if (!el || still || reducedMotion()) return;
    let raf = 0;
    let px = 0;
    let py = 0;
    const apply = () => {
      raf = 0;
      const sy = Math.min(window.scrollY, 900) * (wide ? 0.08 : 0.15);
      el.style.transform = `translate3d(${px.toFixed(2)}px, ${(sy + py).toFixed(2)}px, 0)`;
    };
    const req = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onMove = (e: PointerEvent) => {
      if (!wide) return;
      px = ((e.clientX / window.innerWidth) * 2 - 1) * -10;
      py = ((e.clientY / window.innerHeight) * 2 - 1) * -6;
      req();
    };
    window.addEventListener("scroll", req, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", req);
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [wide, still]);

  const setLang = (l: CardLang) => {
    if (l === lang) return;
    setFade((f) => f + 1);
    onLang(l);
  };

  const save = () => {
    actions.save();
    setSaved(true);
    setTimeout(() => setSaved(false), 2600);
  };

  const copy = async (s: string) => {
    if (await copyText(s)) toast.show(T("Nusxa olindi"));
  };

  /* ── Kontaktlar ro‘yxati ── */
  type Row = { key: string; text: string; href?: string; icon: "copy" | "arrow"; copy?: string; external?: boolean };
  const contacts: Row[] = [];
  if (phone) contacts.push({ key: "phone", text: fmtPhone(phone), href: telHref(phone), icon: "copy", copy: fmtPhone(phone) });
  if (card.email) contacts.push({ key: "email", text: card.email, href: `mailto:${card.email}`, icon: "copy", copy: card.email });
  if (tg) contacts.push({ key: "tg", text: tg, href: tgHref(card.telegram), icon: "arrow", external: true });
  if (address) contacts.push({ key: "addr", text: address, href: map || undefined, icon: "arrow", external: true });
  if (card.website) contacts.push({ key: "web", text: hostOf(card.website), href: card.website, icon: "arrow", external: true });

  const showDirections = card.directions.some((d) => L(d.title));
  const stats = card.stats.filter((s) => s.value);
  const showStats = stats.length > 0;
  const statCols = wide ? (stats.length <= 4 ? stats.length : 3) : 2;
  const companies = card.companies.filter((c) => c.name);
  const [open, setOpen] = useState(0);

  const quick = useMemo(
    () =>
      [
        phone && { k: "phone", icon: "phone", href: telHref(phone), label: T("Qo‘ng‘iroq") },
        tg && { k: "tg", icon: "telegram", href: tgHref(card.telegram), label: "Telegram" },
        wa && { k: "wa", icon: "whatsapp", href: waHref(wa), label: "WhatsApp" },
        card.email && { k: "mail", icon: "mail", href: `mailto:${card.email}`, label: "Email" },
      ].filter(Boolean) as { k: string; icon: string; href: string; label: string }[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phone, tg, wa, card.email, card.telegram, lang],
  );

  const style = { "--d0": loaded ? "1" : "0" } as CSSProperties;

  return (
    <div ref={root} className={cx(st.root, wide && st.wide, still && st.still)} style={style} lang={lang}>
      <div style={{ "--u": unit } as CSSProperties} className={cx(st.page, fade % 2 ? st.fadeA : fade ? st.fadeB : "")}>
        {/* ── 01 Hero ── */}
        <section className={cx(st.hero, loaded && st.heroIn, !portrait && st.heroNoPhoto)}>
          <div className={st.photoWrap} aria-hidden>
            <div ref={photoRef} className={st.photoMove}>
              {portrait ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={st.photo} src={portrait} alt="" draggable={false} decoding="async" fetchPriority="high" />
              ) : (
                <span className={st.photoMono}>{initials(card.fullName)}</span>
              )}
            </div>
          </div>
          {wide && <div className={st.shadeLeft} aria-hidden />}
          <div className={st.shadeBottom} aria-hidden />

          <div className={st.top}>
            <span className={st.mono}>{initials(card.fullName)}</span>
            <LangPill lang={lang} onLang={setLang} T={T} />
          </div>

          <div className={st.heroBody}>
            <h1 ref={nameRef} className={st.name}>
              {name.map((n, i) => (
                <span key={i} className={st.nameMask}>
                  <span data-fit-line className={st.nameLine} style={{ transitionDelay: `${0.35 + i * 0.12}s` }}>
                    {n}
                  </span>
                </span>
              ))}
            </h1>
            <div className={st.heroText}>
              {bio && <p className={st.bio}>{bio}</p>}
              {wide && (
                <div className={st.heroBtns}>
                  <button type="button" className={st.saveBig} onClick={save}>
                    <SaveIcon saved={saved} size={19} />
                    {T(saved ? "Saqlandi" : "Kontaktni saqlash")}
                  </button>
                  {quick.map((q) => (
                    <a key={q.k} className={st.circle} href={q.href} target={q.k === "phone" || q.k === "mail" ? undefined : "_blank"} rel="noopener noreferrer" aria-label={q.label}>
                      <Icon name={q.icon} size={"calc(var(--u) * 21)"} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── 02 Hamkorlik yo‘nalishlari ── */}
        {showDirections && (
          <section className={cx(st.sec, st.dirs)}>
            <div className={st.left}>
              <h2 className={st.h2} data-a="up">
                {T("Qanday birga ishlashimiz mumkin")}
              </h2>
            </div>
            <div className={st.right}>
              {card.directions
                .filter((d) => L(d.title))
                .map((d, i) => (
                  <div key={i} className={cx(st.dir, st.rule, i === 0 && st.ruleTop)} data-a="row" style={{ "--d": `${i * 0.08}s` } as CSSProperties}>
                    <div className={st.dirText}>
                      <p className={st.dirTitle}>{L(d.title)}</p>
                      {L(d.text) && <p className={st.dirSub}>{L(d.text)}</p>}
                    </div>
                    <Icon name="arrow" size={wide ? "calc(var(--u) * 24)" : "calc(var(--u) * 20)"} className={st.dirArrow} />
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* ── 03 Raqamlar ── */}
        {showStats && (
          <section className={cx(st.stats, !showDirections && st.statsFirst)}>
            {chunk(stats, statCols).map((row, r) => (
              <div key={r} className={cx(st.statRow, st.rule, r === 0 && wide && st.ruleTop)} data-a="row" style={{ "--d": `${r * 0.1}s` } as CSSProperties}>
                {row.map((s, i) => (
                  <div key={i} className={cx(st.stat, i > 0 && st.statNext)} style={{ "--d": `${r * 0.1 + i * 0.08}s` } as CSSProperties}>
                    <p className={st.statValue}>
                      <FitCell base={wide ? 80 : 48} final={<StatValue v={s.value} />}>
                        <StatCount v={s.value} still={still} />
                      </FitCell>
                    </p>
                    {L(s.label) && <p className={st.statLabel}>{L(s.label)}</p>}
                  </div>
                ))}
                {/* bo‘sh katak — ustunlar teng qolsin */}
                {Array.from({ length: statCols - row.length }).map((_, i) => (
                  <div key={`e${i}`} className={cx(st.stat, st.statNext, st.statEmpty)} aria-hidden />
                ))}
              </div>
            ))}
          </section>
        )}

        {/* ── 04 Kompaniyalar ── */}
        {companies.length > 0 && (
          <section className={cx(st.sec, st.comps)}>
            {wide && (
              <div className={st.left}>
                <h2 className={st.h2} data-a="up">
                  {T("Kompaniyalar")}
                </h2>
              </div>
            )}
            <div className={st.right}>
              {companies.map((c, i) => {
                const isOpen = open === i;
                const img = i === 0 ? office : "";
                const text = L(c.text);
                const body = !!(img || text);
                const period = L(c.period);
                return (
                  <div key={i} className={cx(st.comp, st.rule, i === 0 && st.ruleTop, isOpen && body && st.compOpen)} data-a="row" style={{ "--d": `${i * 0.08}s` } as CSSProperties}>
                    <button
                      type="button"
                      className={st.compHead}
                      onClick={() => body && setOpen(isOpen ? -1 : i)}
                      aria-expanded={body ? isOpen : undefined}
                      disabled={!body}
                    >
                      <span className={st.compNameWrap}>
                        <span className={st.compName}>{c.name}</span>
                        {period && <span className={st.compPeriod}>{period}</span>}
                      </span>
                      {body && (
                        <span className={st.compSign} aria-hidden>
                          <span className={st.signH} />
                          <span className={st.signV} />
                        </span>
                      )}
                    </button>
                    {body && (
                      <div className={st.compBody} aria-hidden={!isOpen}>
                        <div className={st.compInner}>
                          {img && (
                            <div className={st.compPhoto}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img} alt="" loading="lazy" decoding="async" draggable={false} />
                            </div>
                          )}
                          {text && <p className={st.compText}>{text}</p>}
                          {c.url && (
                            <a className={st.compLink} href={c.url} target="_blank" rel="noopener noreferrer" tabIndex={isOpen ? 0 : -1}>
                              {hostOf(c.url)} <Icon name="arrow" size={"calc(var(--u) * 16)"} />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 05 Kontakt qoldiring ── */}
        {card.leadForm && <Lead T={T} wide={wide} actions={actions} still={still} />}

        {/* ── 06 Kontaktlar ── */}
        <section className={cx(st.sec, st.contacts, !card.leadForm && st.contactsRule)}>
          {wide && (
            <div className={st.left}>
              <h2 className={st.h2} data-a="up">
                {T("Kontaktlar")}
              </h2>
            </div>
          )}
          <div className={st.right}>
            <div className={st.cList}>
              {(wide ? chunk(contacts, 2) : contacts.map((c) => [c])).map((row, r) => (
                <div key={r} className={cx(st.cRow, st.rule, r === 0 && st.ruleTop)} data-a="row" style={{ "--d": `${r * 0.08}s` } as CSSProperties}>
                  {row.map((c, i) => (
                    <div key={c.key} className={cx(st.cCell, i > 0 && st.cCellNext, row.length === 1 && wide && st.cCellFull)}>
                      {c.href ? (
                        <a className={st.cText} href={c.href} target={c.external ? "_blank" : undefined} rel="noopener noreferrer">
                          {c.text}
                        </a>
                      ) : (
                        <span className={st.cText}>{c.text}</span>
                      )}
                      {c.icon === "copy" ? (
                        <button type="button" className={st.cIcon} onClick={() => copy(c.copy ?? c.text)} aria-label={T("Nusxa olindi")}>
                          <Icon name="copy" size={wide ? "calc(var(--u) * 20)" : "calc(var(--u) * 18)"} />
                        </button>
                      ) : (
                        <span className={st.cIcon} aria-hidden>
                          <Icon name="arrow" size={wide ? "calc(var(--u) * 20)" : "calc(var(--u) * 18)"} />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className={st.extra} data-a="up">
              <button type="button" className={st.extraBtn} onClick={actions.qr}>
                <Icon name="qr" size={wide ? "calc(var(--u) * 17)" : "calc(var(--u) * 15)"} />
                {T("QR kod")}
              </button>
              <button type="button" className={st.extraBtn} onClick={actions.share}>
                <Icon name="share" size={wide ? "calc(var(--u) * 17)" : "calc(var(--u) * 15)"} />
                {T("Ulashish")}
              </button>
            </div>
          </div>
        </section>

        {/* ── 07 Footer ── */}
        <footer className={st.footer}>
          <div data-a="foot">
            <Fit base={wide ? 190 : 44} max={wide ? 1312 : 342} deps={`${card.fullName}|${wide}`} className={st.footName}>
              {card.fullName || " "}
            </Fit>
          </div>
        </footer>

        {/* Mobil: pastki yopishqoq panel */}
        {!wide && (
          <div className={cx(st.dock, loaded && st.dockIn)}>
            {quick.map((q) => (
              <a key={q.k} className={st.dockBtn} href={q.href} target={q.k === "phone" || q.k === "mail" ? undefined : "_blank"} rel="noopener noreferrer" aria-label={q.label}>
                <Icon name={q.icon} size={"calc(var(--u) * 20)"} />
              </a>
            ))}
            <button type="button" className={st.dockSave} onClick={save}>
              <SaveIcon saved={saved} size={17} />
              {T(saved ? "Saqlandi" : "Saqlash")}
            </button>
          </div>
        )}

        <div className={cx(st.toast, toast.msg && st.toastOn)} role="status" aria-live="polite">
          {toast.msg}
        </div>
      </div>
    </div>
  );
}

function StatCount({ v, still }: { v: string; still: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [run, setRun] = useState(false);
  useEffect(() => {
    const el = ref.current?.closest("[data-a]");
    if (!el || still) return;
    if (el.hasAttribute("data-in")) return setRun(true);
    const mo = new MutationObserver(() => el.hasAttribute("data-in") && setRun(true));
    mo.observe(el, { attributes: true, attributeFilter: ["data-in"] });
    return () => mo.disconnect();
  }, [still]);
  return (
    <span ref={ref}>
      <CountText text={v} run={run} still={still} render={(s) => <StatValue v={s} />} />
    </span>
  );
}

function SaveIcon({ saved, size }: { saved: boolean; size: number }) {
  return (
    <span className={cx(st.saveIcon, saved && st.saveIconOn)} style={{ width: `calc(var(--u) * ${size})`, height: `calc(var(--u) * ${size})` }} aria-hidden>
      <Icon name="download" size="100%" className={st.saveDl} />
      <Icon name="check" size="100%" className={st.saveOk} />
    </span>
  );
}

function LangPill({ lang, onLang, T }: { lang: CardLang; onLang: (l: CardLang) => void; T: (s: string) => string }) {
  return (
    <div className={st.lang} role="group" aria-label={T("Til")}>
      {LANGS.map((l) => (
        <button key={l} type="button" className={cx(st.langBtn, l === lang && st.langOn)} aria-pressed={l === lang} onClick={() => onLang(l)}>
          {LANG_LABEL[l]}
        </button>
      ))}
    </div>
  );
}

function Lead({ T, wide, actions, still }: { T: (s: string) => string; wide: boolean; actions: CardViewProps["actions"]; still: boolean }) {
  const [f, setF] = useState({ name: "", company: "", contact: "", website: "" });
  const [purpose, setPurpose] = useState(0);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (still) return;
    if (!f.name.trim() || f.contact.trim().length < 5) {
      setErr(T("Ism va telefon yoki emailni kiriting"));
      return;
    }
    setErr(null);
    setState("busy");
    try {
      await actions.lead?.({ name: f.name.trim(), company: f.company.trim() || undefined, contact: f.contact.trim(), purpose: T(PURPOSES[purpose]), website: f.website });
      setState("done");
    } catch (e) {
      // actions.lead yorliq kalitini tashlaydi (labels.ts → leadErrorKey); noma’lum xato — umumiy matn
      const m = (e as Error).message;
      setErr(T(LEAD_ERROR_KEYS.includes(m) ? m : "Yuborib bo‘lmadi. Qayta urinib ko‘ring."));
      setState("idle");
    }
  };

  const field = (k: "name" | "company" | "contact", ph: string, type = "text", auto?: string) => (
    <label className={st.field}>
      <input
        className={st.input}
        type={type}
        value={f[k]}
        placeholder={T(ph)}
        aria-label={T(ph)}
        autoComplete={auto}
        maxLength={k === "contact" ? 120 : k === "company" ? 120 : 80}
        onChange={(e) => setF({ ...f, [k]: e.target.value })}
        readOnly={still}
        tabIndex={still ? -1 : undefined}
      />
    </label>
  );

  return (
    <section className={cx(st.sec, st.lead)} id="kontakt">
      <div className={cx(st.left, st.leadLeft)}>
        <h2 className={st.h2} data-a="up">
          {T("Siz ham kontakt qoldiring")}
        </h2>
        <p className={st.leadText} data-a="up" style={{ "--d": "0.08s" } as CSSProperties}>
          {T("Ma’lumotlaringiz to‘g‘ridan-to‘g‘ri menga keladi. 24 soat ichida o‘zim bog‘lanaman.")}
        </p>
      </div>
      <div className={st.right}>
        {state === "done" ? (
          <div className={st.leadDone} role="status">
            <span className={st.leadDoneIcon}>
              <Icon name="check" size="100%" />
            </span>
            <p className={st.leadDoneTitle}>{T("Rahmat! Ma’lumotlaringiz yuborildi.")}</p>
            <p className={st.leadDoneText}>{T("Tez orada bog‘lanaman.")}</p>
            <button
              type="button"
              className={st.leadAgain}
              onClick={() => {
                setF({ name: "", company: "", contact: "", website: "" });
                setState("idle");
              }}
            >
              {T("Yana yuborish")}
            </button>
          </div>
        ) : (
          <form className={st.form} onSubmit={submit} noValidate data-a="up" style={{ "--d": "0.12s" } as CSSProperties}>
            {wide ? (
              <>
                <div className={st.fieldRow}>
                  {field("name", "Ismingiz", "text", "name")}
                  {field("company", "Kompaniya va lavozim", "text", "organization")}
                </div>
                {field("contact", "Telefon yoki email", "text", "tel")}
              </>
            ) : (
              <>
                {field("name", "Ismingiz", "text", "name")}
                {field("company", "Kompaniya va lavozim", "text", "organization")}
                {field("contact", "Telefon yoki email", "text", "tel")}
              </>
            )}
            {/* honeypot — odam ko‘rmaydi */}
            <input className={st.hp} tabIndex={-1} autoComplete="off" aria-hidden value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} name="website" />
            <div className={st.chips} role="radiogroup">
              {PURPOSES.map((p, i) => (
                <button key={p} type="button" role="radio" aria-checked={purpose === i} className={cx(st.chip, purpose === i && st.chipOn)} onClick={() => setPurpose(i)}>
                  {T(p)}
                </button>
              ))}
            </div>
            {err && (
              <p className={st.leadErr} role="alert">
                {err}
              </p>
            )}
            <button type="submit" className={st.send} disabled={state === "busy"}>
              <Icon name="arrow" size={wide ? "calc(var(--u) * 19)" : "calc(var(--u) * 18)"} />
              {T(state === "busy" ? "Yuborilmoqda…" : "Yuborish")}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

export default NoirCard;
