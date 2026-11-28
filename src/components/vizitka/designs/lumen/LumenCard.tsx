"use client";

import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource/cormorant-garamond/600.css";

/**
 * «Link sahifa — Biznes ayol» (Lumen) — Figma: mobil 570:12661 (390), laptop 572:12709 (1440), assets 568:12666,
 * motion 573:12617. Bo‘limlar: Hero, Kirish + asosiy harakat, Ijtimoiy tarmoqlar (bento), Havolalar, Kontaktni saqlash
 * (3D aylanuvchi karta), Footer; mobilda suzuvchi «Saqlash» tugmasi. Laptopda chap ustun (profil) yopishqoq.
 * Wallet tugmalari o‘rnida — «QR kod» va «Ulashish» (foydalanuvchi qarori: Wallet yo‘q).
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { loc, type CardLang, type CardSocial, type CardLink } from "@/lib/cardTypes";
import { Icon, socialIcon, type IconName } from "../shared/icons";
import { ct, LANG_LABEL } from "../shared/labels";
import {
  CountText,
  cx,
  DEMO_BOOK,
  Fit,
  fmtPhone,
  hostOf,
  initials,
  isTouch,
  photoOf,
  reducedMotion,
  splitName,
  telHref,
  tgHandle,
  tgHref,
  useFitLines,
  useReveal,
  useCanvas,
  waHref,
  type CardViewProps,
} from "../shared/runtime";
import st from "./lumen.module.css";

const LANGS: CardLang[] = ["uz", "ru", "en"];
const KIND_LABEL: Record<string, string> = {
  instagram: "Instagram",
  telegram: "Telegram",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  youtube: "YouTube",
  tiktok: "TikTok",
  x: "X",
  whatsapp: "WhatsApp",
  website: "Veb-sayt",
};
const BLOCK_KINDS = new Set(["linkedin", "telegram", "x", "whatsapp"]);

type Social = CardSocial & { _i: number };

function chunk<T>(a: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n));
  return out;
}

export function LumenCard({ card, lang, onLang, mode, actions }: CardViewProps) {
  const root = useRef<HTMLDivElement>(null);
  const { wide, unit } = useCanvas(root);
  const still = mode === "preview";
  const L = (v: Parameters<typeof loc>[0]) => loc(v, lang);
  const T = (s: string) => ct(s, lang);
  const [fade, setFade] = useState(0);
  const [loaded, setLoaded] = useState(still);
  const [saved, setSaved] = useState(false);
  const [floatOn, setFloatOn] = useState(false);
  const [forceFloat, setForceFloat] = useState(false);
  const [vcardBusy, setVcardBusy] = useState(false);

  useReveal(root, still, `${wide}|${lang}|${card.socials.length}|${card.links.length}`);
  useEffect(() => {
    if (still) return;
    const t = setTimeout(() => setLoaded(true), 40);
    return () => clearTimeout(t);
  }, [still]);

  const portrait = photoOf(card, 0, "v-lumen", mode);
  const gallery = [1, 2, 3].map((i) => photoOf(card, i, "v-lumen", mode)).filter(Boolean);
  const cover = photoOf(card, 2, "v-lumen", mode);
  const name = splitName(card.fullName);
  const bio = L(card.bio) || [L(card.position), L(card.company)].filter(Boolean).join(", ");
  const role = [L(card.position), L(card.company)].filter(Boolean).join(", ");
  const wa = card.whatsapp || card.phone;

  /* ── Ijtimoiy tarmoqlar: bento guruhlari ── */
  const groups = useMemo(() => {
    const list: Social[] = card.socials.filter((s) => s.url).map((s, i) => ({ ...s, _i: i }));
    const tg = tgHandle(card.telegram);
    if (tg && !list.some((s) => s.kind === "telegram")) list.push({ kind: "telegram", url: tgHref(card.telegram), handle: tg, _i: list.length });
    const insta = list.find((s) => s.kind === "instagram");
    const video = list.find((s) => s.kind === "youtube");
    const blocks = list.filter((s) => s !== insta && s !== video && BLOCK_KINDS.has(s.kind));
    const pills = list.filter((s) => s !== insta && s !== video && !BLOCK_KINDS.has(s.kind));
    return { insta, video, blocks, pills, any: list.length > 0 };
  }, [card.socials, card.telegram]);

  /* ── Havolalar (veb-sayt havolalarda bo‘lmasa — oxiriga qo‘shiladi) ── */
  const links = useMemo(() => {
    const out: CardLink[] = card.links.filter((l) => l.url && loc(l.title, "uz"));
    if (card.website && !out.some((l) => hostOf(l.url) === hostOf(card.website))) {
      out.push({ title: { uz: hostOf(card.website) }, subtitle: { uz: "" }, url: card.website, icon: "globe" });
    }
    return out;
  }, [card.links, card.website]);

  const nameRef = useRef<HTMLHeadingElement>(null);
  useFitLines(nameRef, wide ? 84 : 68, wide ? 440 : 350, `${card.fullName}|${wide}`);

  /* ── Suzuvchi tugma: asosiy tugma ko‘rinmay qolganda chiqadi, sahifa oxirida yashirinadi ── */
  const mainBtn = useRef<HTMLButtonElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const floatRef = useRef<HTMLButtonElement>(null);
  const floatBox = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (wide || still) return setFloatOn(false);
    let raf = 0;
    const check = () => {
      raf = 0;
      const b = mainBtn.current?.getBoundingClientRect();
      const f = footerRef.current?.getBoundingClientRect();
      const vh = window.innerHeight;
      setFloatOn(!!b && b.bottom < 0 && !!f && f.top > vh - 20);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, [wide, still]);

  /* ── 3D egilish: kursor (laptop) yoki giroskop (telefon) ── */
  useTilt(root, !still);

  const setLang = (l: CardLang) => {
    if (l === lang) return;
    setFade((f) => f + 1);
    onLang(l);
  };

  /** «Telefonga saqlash»: karta suzuvchi tugmaga «uchib» kiradi, belgi ✓ ga aylanadi, .vcf yuklanadi */
  const cardRef = useRef<HTMLDivElement>(null);
  const save = (fly: boolean) => {
    if (vcardBusy) return;
    actions.save();
    setVcardBusy(true);
    const src = cardRef.current;
    const box = floatBox.current;
    const btn = floatRef.current;
    if (fly && !wide && !still && src && box && btn && !reducedMotion() && typeof src.animate === "function") {
      // suzuvchi tugma sahifa oxirida yashirin bo‘lsa ham — uchish paytida ko‘rsatiladi
      setForceFloat(true);
      const a = src.getBoundingClientRect();
      // fixed element: offset* transformni hisobga olmaydi → tugmaning yakuniy (ko‘ringan) joyi
      const bx = box.offsetLeft - box.offsetWidth / 2 + btn.offsetLeft + btn.offsetWidth / 2;
      const by = box.offsetTop + btn.offsetTop + btn.offsetHeight / 2;
      const ghost = src.cloneNode(true) as HTMLElement;
      Object.assign(ghost.style, { position: "fixed", left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`, margin: "0", zIndex: "60", pointerEvents: "none", transformOrigin: "50% 50%" });
      root.current?.querySelector(`.${st.page}`)?.appendChild(ghost);
      const dx = bx - (a.left + a.width / 2);
      const dy = by - (a.top + a.height / 2);
      const anim = ghost.animate(
        [
          { transform: "translate(0,0) scale(1)", opacity: 1 },
          { transform: `translate(${dx * 0.45}px, ${dy * 0.35}px) scale(0.5)`, opacity: 1, offset: 0.5 },
          { transform: `translate(${dx}px, ${dy}px) scale(0.06)`, opacity: 0.2 },
        ],
        { duration: 820, delay: 120, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "backwards" },
      );
      anim.onfinish = () => {
        ghost.remove();
        setSaved(true);
      };
    } else {
      setSaved(true);
    }
    setTimeout(() => {
      setSaved(false);
      setVcardBusy(false);
      setForceFloat(false);
    }, 3200);
  };

  const quick = [
    card.phone && { k: "phone", icon: "phone" as IconName, href: telHref(card.phone), label: T("Qo‘ng‘iroq") },
    wa && { k: "wa", icon: "whatsapp" as IconName, href: waHref(wa), label: T("WhatsApp") },
    card.email && { k: "mail", icon: "mail" as IconName, href: `mailto:${card.email}`, label: T("Email") },
  ].filter(Boolean) as { k: string; icon: IconName; href: string; label: string }[];

  const style = {} as CSSProperties;
  let tileNo = 0;
  const td = () => ({ "--d": `${(tileNo++ % 4) * 0.07}s` }) as CSSProperties;

  /* ── Plitkalar ── */
  const titleOf = (s: Social) => L(s.title) || s.handle || T(KIND_LABEL[s.kind] ?? s.kind);
  const noteOf = (s: Social, short = false) => {
    const n = L(s.note);
    return short ? n.split(" · ")[0] : n;
  };

  const instaTile = (s: Social, full: boolean) => (
    <div className={cx(st.cell, st.cellInsta, full && st.cellFull)} data-a="tile" style={td()} key="insta">
      <div className={cx(st.tile, st.insta, gallery.length === 0 && st.instaNoPosts)} data-tilt>
        <div className={st.instaHead}>
          <span className={st.instaIcon} data-par>
            <Icon name="instagram" size={wide ? "calc(var(--u) * 23.04)" : "calc(var(--u) * 21.12)"} />
          </span>
          <a className={st.instaText} href={s.url} target="_blank" rel="noopener noreferrer">
            <span className={st.instaHandle}>{s.handle || "Instagram"}</span>
            {noteOf(s) && (
              <span className={st.instaNote}>
                <Counted text={noteOf(s)} still={still} />
              </span>
            )}
          </a>
          <a className={st.follow} href={s.url} target="_blank" rel="noopener noreferrer">
            {T("Obuna")}
          </a>
        </div>
        {gallery.length > 0 && <Posts photos={gallery} wide={wide} still={still} />}
      </div>
    </div>
  );

  const blockTile = (s: Social, i: number, full = false) => (
    <div className={cx(st.cell, st.cellBlock, full && st.cellFull)} data-a="tile" style={td()} key={`b${s._i}`}>
      <a className={cx(st.tile, st.block, i % 2 ? st.blockAccent : st.blockDark)} href={s.url} target="_blank" rel="noopener noreferrer" data-tilt>
        <span className={st.blockTop}>
          <span data-par>
            <Icon name={socialIcon(s.kind)} size={wide ? "calc(var(--u) * 28)" : "calc(var(--u) * 26)"} />
          </span>
          <Icon name="arrow" size={wide ? "calc(var(--u) * 20)" : "calc(var(--u) * 18)"} className={st.arrow} />
        </span>
        <span className={st.blockText}>
          <span className={st.blockTitle}>{titleOf(s)}</span>
          {noteOf(s) && (
            <span className={st.blockNote}>
              <Counted text={noteOf(s, !wide)} still={still} />
            </span>
          )}
        </span>
      </a>
    </div>
  );

  const videoTile = (s: Social, full: boolean) => (
    <div className={cx(st.cell, st.cellVideo, full && st.cellFull)} data-a="tile" style={td()} key="video">
      <a className={cx(st.tile, st.video, !cover && st.videoNoCover)} href={s.url} target="_blank" rel="noopener noreferrer" data-tilt>
        {cover && (
          <span className={st.cover}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" loading="lazy" decoding="async" draggable={false} />
            <span className={st.play} data-par>
              <Icon name="play" size={"calc(var(--u) * 22)"} />
            </span>
          </span>
        )}
        <span className={st.videoText}>
          <span className={st.videoIcon}>
            <Icon name="youtube" size={wide ? "calc(var(--u) * 21.12)" : "calc(var(--u) * 19.2)"} />
          </span>
          <span className={st.videoMeta}>
            <span className={st.videoTitle}>{titleOf(s)}</span>
            {noteOf(s) && (
              <span className={st.videoNote}>
                <Counted text={noteOf(s)} still={still} />
              </span>
            )}
          </span>
        </span>
      </a>
    </div>
  );

  const pillTile = (s: Social, full = false) => (
    <div className={cx(st.cell, st.cellPill, full && st.cellFull)} data-a="tile" style={td()} key={`p${s._i}`}>
      <a className={cx(st.tile, st.pill)} href={s.url} target="_blank" rel="noopener noreferrer" data-tilt>
        <span className={st.pillIcon} data-par>
          <Icon name={socialIcon(s.kind)} size={wide ? "calc(var(--u) * 21.12)" : "calc(var(--u) * 19.2)"} />
        </span>
        <span className={st.pillLabel}>{s.handle || T(KIND_LABEL[s.kind] ?? s.kind)}</span>
        {wide && <Icon name="arrow" size={"calc(var(--u) * 18)"} className={st.arrowDark} />}
      </a>
    </div>
  );

  const bento: ReactNode[] = [];
  const { insta, video, blocks, pills } = groups;
  if (wide) {
    let bi = 0;
    if (insta) {
      const side = blocks.slice(0, 2);
      bi = side.length;
      bento.push(
        <div className={cx(st.bRow, st.bRow1, gallery.length > 0 && st.bRow1Posts)} key="r1">
          {instaTile(insta, side.length === 0)}
          {side.length > 0 && <div className={st.bCol}>{side.map((b, i) => blockTile(b, i))}</div>}
        </div>,
      );
    }
    chunk(blocks.slice(bi), 2).forEach((row, r) =>
      bento.push(
        <div className={cx(st.bRow, st.bRowBlocks)} key={`rb${r}`}>
          {row.map((b, i) => blockTile(b, bi + r * 2 + i))}
        </div>,
      ),
    );
    let pi = 0;
    if (video) {
      const side = pills.slice(0, 2);
      pi = side.length;
      bento.push(
        <div className={cx(st.bRow, st.bRow2)} key="r2">
          {videoTile(video, side.length === 0)}
          {side.length > 0 && <div className={cx(st.bCol, st.bColPills)}>{side.map((p) => pillTile(p))}</div>}
        </div>,
      );
    }
    chunk(pills.slice(pi), 3).forEach((row, r) =>
      bento.push(
        <div className={cx(st.bRow, st.bRowPills)} key={`rp${r}`}>
          {row.map((p) => pillTile(p))}
        </div>,
      ),
    );
  } else {
    if (insta) bento.push(instaTile(insta, true));
    chunk(blocks, 2).forEach((row, r) =>
      bento.push(
        <div className={st.bRow} key={`rb${r}`}>
          {row.map((b, i) => blockTile(b, r * 2 + i, row.length === 1))}
        </div>,
      ),
    );
    if (video) bento.push(videoTile(video, true));
    chunk(pills, 2).forEach((row, r) =>
      bento.push(
        <div className={st.bRow} key={`rp${r}`}>
          {row.map((p) => pillTile(p, row.length === 1))}
        </div>,
      ),
    );
  }

  const linkIcon = (l: CardLink, i: number) => {
    const ic = l.icon ?? "arrow";
    if (ic === "book" && mode === "demo" && !card.photos.length)
      return (
        <span className={cx(st.linkIcon, st.linkIconPhoto)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={DEMO_BOOK} alt="" loading="lazy" decoding="async" draggable={false} />
        </span>
      );
    return (
      <span className={cx(st.linkIcon, i === 0 ? st.linkIconAccent : ic === "book" ? st.linkIconSand : st.linkIconSoft)}>
        <Icon name={ic === "arrow" ? "link" : ic} size={wide ? "calc(var(--u) * 28)" : "calc(var(--u) * 24)"} />
      </span>
    );
  };

  const saveIcon = (size: number) => (
    <span className={cx(st.saveIcon, saved && st.saveIconOn)} style={{ width: `calc(var(--u) * ${size})`, height: `calc(var(--u) * ${size})` }} aria-hidden>
      <Icon name="download" size="100%" className={st.saveDl} />
      <Icon name="check" size="100%" className={st.saveOk} />
    </span>
  );

  /* ── Profil (mobil: hero + kirish; laptop: chap yopishqoq ustun) ── */
  const nameEl = (
    <h1 ref={nameRef} className={st.name}>
      {name.map((n, li) => (
        <span key={li} className={st.nameRow}>
          <span data-fit-line className={st.nameLine}>
            {Array.from(n).map((ch, ci) =>
              ch === " " ? (
                " "
              ) : (
                <span key={ci} className={st.ch} style={{ transitionDelay: `${0.45 + (li * 8 + ci) * 0.025}s` }}>
                  {ch}
                </span>
              ),
            )}
          </span>
        </span>
      ))}
    </h1>
  );

  const actionsEl = (
    <>
      {bio && <p className={st.bio}>{bio}</p>}
      <button ref={mainBtn} type="button" className={st.mainBtn} onClick={() => save(false)}>
        {saveIcon(19)}
        {T(saved ? "Saqlandi" : "Kontaktni saqlash")}
      </button>
      {quick.length > 0 && (
        <div className={st.quick}>
          {quick.map((q) => (
            <a key={q.k} className={st.quickBtn} href={q.href} target={q.k === "wa" ? "_blank" : undefined} rel="noopener noreferrer">
              <Icon name={q.icon} size={"calc(var(--u) * 19)"} />
              <span>{q.label}</span>
            </a>
          ))}
        </div>
      )}
    </>
  );

  const portraitEl = portrait ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={st.portraitImg} src={portrait} alt="" decoding="async" fetchPriority="high" draggable={false} />
  ) : (
    <span className={st.portraitMono}>{initials(card.fullName)}</span>
  );

  const topBar = (
    <div className={st.top}>
      <span className={st.mono}>{initials(card.fullName)}</span>
      <div className={st.topRight}>
        <div className={st.lang} role="group" aria-label={T("Til")}>
          {LANGS.map((l) => (
            <button key={l} type="button" className={cx(st.langBtn, l === lang && st.langOn)} aria-pressed={l === lang} onClick={() => setLang(l)}>
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>
        <button type="button" className={st.shareBtn} onClick={actions.share} aria-label={T("Ulashish")}>
          <Icon name="share" size={wide ? "calc(var(--u) * 19)" : "calc(var(--u) * 18)"} />
        </button>
      </div>
    </div>
  );

  /* ── Kontaktni saqlash bloki ── */
  const contactCard = (
    <div className={st.flipWrap} data-a="flip">
      <div className={st.flip}>
        <div ref={cardRef} className={st.vcard}>
          <span className={st.vcMono}>{initials(card.fullName)}</span>
          <Fit base={wide ? 28 : 30} max={wide ? 282 : 302} deps={`${card.fullName}|${wide}`} className={st.vcName}>
            {card.fullName || " "}
          </Fit>
          {role && <span className={st.vcRole}>{role}</span>}
          <span className={st.vcLines}>
            {card.phone && <span>{fmtPhone(card.phone)}</span>}
            {card.email && <span>{card.email}</span>}
          </span>
        </div>
        <div className={st.vcardBack} aria-hidden>
          <span>{initials(card.fullName)}</span>
        </div>
      </div>
    </div>
  );
  const saveBtns = (
    <div className={st.saveBtns}>
      <button type="button" className={st.saveBtn} onClick={() => save(true)}>
        {saveIcon(19)}
        {T(saved ? "Saqlandi" : "Telefonga saqlash")}
      </button>
      <div className={st.extra}>
        <button type="button" className={st.extraBtn} onClick={actions.qr}>
          <Icon name="qr" size={"calc(var(--u) * 17)"} />
          {T("QR kod")}
        </button>
        <button type="button" className={st.extraBtn} onClick={actions.share}>
          <Icon name="share" size={"calc(var(--u) * 17)"} />
          {T("Ulashish")}
        </button>
      </div>
    </div>
  );

  const socialsEl = groups.any && (
    <section className={st.socials}>
      <h2 className={st.h2} data-a="up">
        {T("Ijtimoiy tarmoqlar")}
      </h2>
      {bento}
    </section>
  );

  const linksEl = links.length > 0 && (
    <section className={st.links}>
      <h2 className={st.h2} data-a="up">
        {T("Havolalar")}
      </h2>
      <div className={st.linkList} style={{ "--cols": Math.min(3, links.length) } as CSSProperties}>
        {links.map((l, i) => (
          <div key={i} className={st.cell} data-a="tile" style={td()}>
            <a className={cx(st.link, i === 0 && st.linkDark)} href={l.url} target="_blank" rel="noopener noreferrer">
              <span className={st.linkTop}>
                {linkIcon(l, i)}
                {wide && <Icon name="arrow" size={"calc(var(--u) * 20)"} className={st.linkArrow} />}
              </span>
              <span className={st.linkText}>
                <span className={st.linkTitle}>{L(l.title)}</span>
                {L(l.subtitle) && <span className={st.linkSub}>{L(l.subtitle)}</span>}
              </span>
              {!wide && <Icon name="arrow" size={"calc(var(--u) * 18)"} className={st.linkArrow} />}
            </a>
          </div>
        ))}
      </div>
    </section>
  );

  const saveEl = (
    <section className={st.save}>
      {wide ? (
        <div className={st.saveBox} data-a="up">
          {contactCard}
          <div className={st.saveText}>
            <h2 className={st.saveTitle}>{T("Kontaktimni saqlang")}</h2>
            <p className={st.saveDesc}>{T("Telefon, email va ijtimoiy tarmoqlar bitta kontakt kartada saqlanadi.")}</p>
            {saveBtns}
          </div>
        </div>
      ) : (
        <>
          <h2 className={st.h2} data-a="up">
            {T("Kontaktimni saqlang")}
          </h2>
          {contactCard}
          <div data-a="up">{saveBtns}</div>
        </>
      )}
    </section>
  );

  const footer = (
    <footer ref={footerRef} className={st.footer}>
      <div data-a="foot">
        <Fit base={wide ? 150 : 52} max={wide ? 1280 : 350} deps={`${card.fullName}|${wide}`} className={st.footName}>
          {card.fullName || " "}
        </Fit>
      </div>
    </footer>
  );

  return (
    <div ref={root} className={cx(st.root, wide && st.wide, still && st.still)} style={style} lang={lang}>
      <div style={{ "--u": unit } as CSSProperties} className={cx(st.page, loaded && st.pageIn, fade % 2 ? st.fadeA : fade ? st.fadeB : "")}>
        {wide ? (
          <>
            {topBar}
            <div className={st.main}>
              <aside className={st.profile}>
                <div className={cx(st.portrait, !portrait && st.portraitEmpty)}>
                  <div className={st.portraitClip}>{portraitEl}</div>
                </div>
                {nameEl}
                {actionsEl}
              </aside>
              <div className={st.content}>
                {socialsEl}
                {linksEl}
                {saveEl}
              </div>
            </div>
            {footer}
          </>
        ) : (
          <>
            <section className={cx(st.hero, !portrait && st.heroNoPhoto)}>
              <div className={st.heroPhoto} aria-hidden>
                <div className={st.portraitClip}>{portraitEl}</div>
              </div>
              <div className={st.heroShade} aria-hidden />
              {topBar}
              {nameEl}
            </section>
            <section className={st.intro}>{actionsEl}</section>
            {socialsEl}
            {linksEl}
            {saveEl}
            {footer}
          </>
        )}

        {!wide && (
          <div ref={floatBox} className={cx(st.float, (floatOn || forceFloat) && st.floatOn)} aria-hidden={!floatOn && !forceFloat}>
            <span className={st.floatName}>{card.fullName}</span>
            <button ref={floatRef} type="button" className={st.floatBtn} onClick={() => save(false)} tabIndex={floatOn || forceFloat ? 0 : -1}>
              {saveIcon(17)}
              {T(saved ? "Saqlandi" : "Saqlash")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Obunachi sonlari plitka ko‘ringanda 0 dan sanab chiqadi */
function Counted({ text, still }: { text: string; still: boolean }) {
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
      <CountText text={text} run={run} still={still} ms={1400} />
    </span>
  );
}

/** Instagram postlari: har 3 soniyada o‘rin almashadi (crossfade + yengil Ken Burns) */
function Posts({ photos, wide, still }: { photos: string[]; wide: boolean; still: boolean }) {
  const [tick, setTick] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (still || photos.length < 2 || reducedMotion()) return;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    if (ref.current) io.observe(ref.current);
    const id = setInterval(() => {
      if (visible && !document.hidden) setTick((t) => t + 1);
    }, 3000);
    return () => {
      clearInterval(id);
      io.disconnect();
    };
  }, [still, photos.length]);
  // Figma: mobil — [daftar, sahna, ofis] qatorda; laptop — katta [sahna] + ustun [daftar, ofis]
  const order = wide && photos.length >= 2 ? [1, 0, 2].filter((i) => i < photos.length) : photos.map((_, i) => i);
  const slot = (k: number, cls?: string) => (
    <span key={k} className={cx(st.post, cls)}>
      {photos.map((p, j) => {
        const on = (order[k] + tick) % photos.length === j;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={j} src={p} alt="" loading="lazy" decoding="async" draggable={false} className={cx(st.postImg, on && st.postOn)} />
        );
      })}
    </span>
  );
  if (wide)
    return (
      <div ref={ref} className={st.posts}>
        {slot(0, st.postBig)}
        {order.length > 1 && <span className={st.postCol}>{order.slice(1).map((_, i) => slot(i + 1))}</span>}
      </div>
    );
  return (
    <div ref={ref} className={st.posts}>
      {order.map((_, k) => slot(k))}
    </div>
  );
}

/**
 * Plitka 3D egiladi (±6°), ichidagi ikonka ([data-par]) parallaksda siljiydi.
 * Kompyuter — kursor; telefon — giroskop (ruxsat so‘ramaydigan qurilmalarda).
 */
function useTilt(root: React.RefObject<HTMLDivElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = root.current;
    if (!el || !enabled || reducedMotion()) return;
    const set = (t: HTMLElement, rx: number, ry: number) => {
      t.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
      t.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
      t.style.setProperty("--px", `${(ry * 0.7).toFixed(2)}px`);
      t.style.setProperty("--py", `${(rx * -0.7).toFixed(2)}px`);
    };
    if (!isTouch()) {
      let cur: HTMLElement | null = null;
      const move = (e: PointerEvent) => {
        const t = (e.target as HTMLElement).closest?.<HTMLElement>("[data-tilt]") ?? null;
        if (cur && cur !== t) set(cur, 0, 0);
        cur = t;
        if (!t) return;
        const r = t.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        set(t, -y * 12, x * 12);
      };
      const leave = () => {
        if (cur) set(cur, 0, 0);
        cur = null;
      };
      el.addEventListener("pointermove", move, { passive: true });
      el.addEventListener("pointerleave", leave);
      return () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
      };
    }
    // Telefon: giroskop (iOS ruxsat so‘raydi — u yerda effekt yo‘q, sahifa o‘zgarishsiz)
    let raf = 0;
    let gx = 0;
    let gy = 0;
    let base: { b: number; g: number } | null = null;
    const apply = () => {
      raf = 0;
      el.querySelectorAll<HTMLElement>("[data-tilt]").forEach((t) => set(t, gy, gx));
    };
    const on = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      base ??= { b: e.beta, g: e.gamma };
      gx = Math.max(-1, Math.min(1, (e.gamma - base.g) / 25)) * 4;
      gy = Math.max(-1, Math.min(1, (e.beta - base.b) / 25)) * -4;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener("deviceorientation", on, { passive: true });
    return () => {
      window.removeEventListener("deviceorientation", on);
      cancelAnimationFrame(raf);
    };
  }, [root, enabled]);
}

export default LumenCard;
