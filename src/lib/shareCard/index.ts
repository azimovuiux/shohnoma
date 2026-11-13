/**
 * Ulashish kartasi (3:4, 1080×1440 JPEG) — shablon uslubida ismlar, marosim, sana va joy.
 * Brauzerda canvas bilan chiziladi; Telegram/WhatsApp’ga rasm (photo) sifatida yuboriladi
 * va serverga yuklanib, taklifnoma havolasining og:image’i bo‘ladi (php/invite.php).
 *
 *   const blob = await renderShareCard(input)    // JPEG
 *   shareCaption(input, url)                       // rasm ostidagi qisqa matn + havola
 *   shareCardHash(input)                           // ma’lumot o‘zgarganini bilish (server rasmi bilan solishtirish)
 *
 * Qayta ishlatish: shaxsiy havolalar (?m=Ism) va «maxsus mehmonlar» — `guest` maydoni bilan.
 */
import { tr, type Locale } from "@/lib/i18n";
import { monthsEn, monthsRu, monthsUz, splitDate } from "@/lib/display";
import type { Ceremony, TemplateTheme } from "@/lib/templates";
import { tplImgVersions } from "@/lib/tplImgVersions";
import { star8Path } from "@/lib/ornament";
import { DESIGNS, type Design } from "./designs";
import { H, W, drawPhoto, drawStack, fontNeeds, loadImage, type Stack, type Texts } from "./engine";
import { loadFonts } from "./fonts";

/** Dizayn yoki chizish usuli o‘zgarsa — oshiriladi (serverdagi eski rasmlar qayta yaratiladi) */
export const SHARE_CARD_VERSION = 2;
export const SHARE_CARD_SIZE = { width: W, height: H };

export type ShareCardInput = {
  /** Dizayn (shablonning designSlug’i). Maxsus dizayni yo‘q shablon — umumiy karta (theme bilan) */
  design: string;
  theme?: TemplateTheme;
  /** Taklifnoma tili (inviteLang) */
  lang: Locale;
  ceremony: Ceremony;
  personA: string;
  personB?: string | null;
  /** "2026-09-12T17:00" */
  date?: string | null;
  venue?: string | null;
  /** Mijozning asosiy surati (photos[0]) */
  photo?: string | null;
  /** Shaxsiy havola: «Hurmatli …» */
  guest?: string | null;
};

const KICKER: Record<Ceremony, string> = {
  nikoh: "Nikoh to‘yiga taklif",
  fotiha: "Fotiha to‘yiga taklif",
  sunnat: "Sunnat to‘yiga taklif",
  "tugilgan-kun": "Tug‘ilgan kunga taklif",
};
const PHRASE: Record<Ceremony, string> = {
  nikoh: "nikoh to‘yiga taklif qilamiz",
  fotiha: "fotiha to‘yiga taklif qilamiz",
  sunnat: "sunnat to‘yiga taklif qilamiz",
  "tugilgan-kun": "tug‘ilgan kunga taklif qilamiz",
};

export const hasShareDesign = (design: string) => design in DESIGNS;

const clean = (s: string | null | undefined, max = 80) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** «12-sentabr 2026» / «12 сентября 2026» / «12 September 2026» */
function longDate(iso: string, lang: Locale) {
  const [y, m, d] = iso.split("-").map(Number);
  if (lang === "ru") return `${d} ${monthsRu[m - 1]} ${y}`;
  if (lang === "en") return `${d} ${monthsEn[m - 1]} ${y}`;
  return `${d}-${monthsUz[m - 1]} ${y}`;
}

function dateLine(input: ShareCardInput, fmt: "dots" | "long") {
  const sd = splitDate(input.date);
  if (!sd) return "";
  if (fmt === "dots") return [sd.dots, sd.time].filter(Boolean).join(" · ");
  return [longDate(sd.iso, input.lang), sd.time].filter(Boolean).join(", ");
}

export function cardTexts(input: ShareCardInput, design?: Design): Texts {
  const lang = input.lang;
  const b = clean(input.personB, 60);
  const amp = design?.amp === "va" ? tr(lang, "{a} va {b}", { a: "", b: "" }).trim() || "&" : "&";
  const guest = clean(input.guest, 80);
  return {
    guest: guest ? tr(lang, "Hurmatli {guest}", { guest }) : "",
    kicker: tr(lang, KICKER[input.ceremony] ?? KICKER.nikoh),
    a: clean(input.personA, 60),
    b,
    amp,
    date: dateLine(input, design?.date ?? "long"),
    venue: clean(input.venue, 70),
  };
}

/** Rasm ostidagi matn (Telegram/WhatsApp): 2–3 qator + havola, taklifnoma tilida */
export function shareCaption(input: ShareCardInput, url: string): string {
  const t = cardTexts(input);
  const names = [t.a, t.b].filter(Boolean).join(" & ");
  const first = `${names} — ${tr(input.lang, PHRASE[input.ceremony] ?? PHRASE.nikoh)} 💌`;
  const meta = [dateLine(input, "long"), t.venue].filter(Boolean).join(" · ");
  return [t.guest ? `${t.guest}!` : "", first, meta, url].filter(Boolean).join("\n");
}

const bgUrl = (slug: string) => {
  const v = tplImgVersions[`${slug}/share-bg.webp`];
  return `/templates/${slug}/share-bg.webp${v ? `?v=${v}` : ""}`;
};

/** Karta mazmuni xeshi (12 belgi) — server rasmi bilan solishtirish va og:image ?v= uchun */
export function shareCardHash(input: ShareCardInput): string {
  const d = DESIGNS[input.design];
  const sig = JSON.stringify([
    SHARE_CARD_VERSION,
    input.design,
    d ? tplImgVersions[`${input.design}/share-bg.webp`] ?? "" : input.theme ?? null,
    input.lang,
    input.ceremony,
    clean(input.personA),
    clean(input.personB),
    input.date ?? "",
    clean(input.venue, 70),
    d?.photo ? input.photo ?? "" : "",
    clean(input.guest),
  ]);
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < sig.length; i++) {
    const c = sig.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) ^ (h2 >>> 13);
  }
  return ((h1 >>> 0).toString(36) + (h2 >>> 0).toString(36)).padEnd(12, "0").slice(0, 12);
}

/* ═════════ Umumiy karta (maxsus dizayni yo‘q shablonlar: admin yuklagan HTML va h.k.) ═════════ */
const SCRIPT: Record<TemplateTheme["script"], { family: string; italic?: boolean; upper?: boolean; ls?: number; size: number }> = {
  pinyon: { family: '"sc-pinyon", "sc-cormorant", Georgia, serif', size: 150 },
  cinzel: { family: '"sc-cinzel", "sc-cormorant", Georgia, serif', upper: true, ls: 0.06, size: 104 },
  cormorant: { family: '"sc-cormorant", Georgia, serif', italic: true, size: 140 },
};
const DEFAULT_THEME: TemplateTheme = { bg: ["#7a1e2c", "#4a0f1a"], ink: "#f3ece0", accent: "#c9a25e", soft: "#e8d3a8", script: "cormorant", color: "bordo" };

function genericStacks(th: TemplateTheme): Stack[] {
  const sc = SCRIPT[th.script] ?? SCRIPT.cormorant;
  const cg = '"sc-cormorant", Georgia, serif';
  const jost = '"sc-jost", system-ui, sans-serif';
  return [
    {
      y: 790,
      anchor: "center",
      w: 820,
      maxH: 860,
      items: [
        { k: "guest", s: { family: cg, italic: true, weight: 500, size: 46, color: th.soft, maxLines: 2, min: 32 } },
        { k: "kicker", s: { family: jost, weight: 500, size: 26, color: th.accent, upper: true, ls: 0.22, min: 18 }, gap: 22 },
        {
          k: "names",
          mode: "stack",
          s: { family: sc.family, italic: sc.italic, weight: sc.italic ? 500 : 400, upper: sc.upper, ls: sc.ls, size: sc.size, min: sc.size * 0.58, color: th.ink, lh: 1.1 },
          amp: { family: cg, italic: true, weight: 500, size: 70, color: th.accent, lh: 0.95 },
          gap: 34,
        },
        { k: "rule", w: 90, h: 2, color: th.accent, gap: 40 },
        { k: "date", s: { family: jost, size: 34, color: th.ink, ls: 0.1, min: 24 }, gap: 40 },
        { k: "venue", s: { family: cg, italic: true, weight: 500, size: 42, color: th.soft, maxLines: 2, min: 30 }, gap: 12 },
      ],
    },
  ];
}

function drawGenericBg(ctx: CanvasRenderingContext2D, th: TemplateTheme) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, th.bg[0]);
  g.addColorStop(1, th.bg[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const r = ctx.createRadialGradient(W / 2, 360, 40, W / 2, 360, 900);
  r.addColorStop(0, "rgba(255,255,255,.12)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = th.accent;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 48, W - 96, H - 96);
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(64, 64, W - 128, H - 128);
  ctx.globalAlpha = 1;
  // girih yulduzi (sayt bezagi) — tepada va pastda
  for (const [y, rr] of [
    [250, 54],
    [H - 190, 26],
  ] as const) {
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 2;
    ctx.stroke(new Path2D(star8Path(W / 2, y, rr)));
    ctx.stroke(new Path2D(star8Path(W / 2, y, rr * 0.55)));
  }
}

/** Kartani chizadi → JPEG Blob */
export async function renderShareCard(input: ShareCardInput, quality = 0.9): Promise<Blob> {
  const design = DESIGNS[input.design];
  const th = input.theme ?? DEFAULT_THEME;
  const texts = cardTexts(input, design ?? { fill: th.bg[1], bg: false, date: "long", stacks: [] });
  const stacks = design ? design.stacks : genericStacks(th);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");

  const photoSrc = design?.photo ? clean(input.photo, 500) || design.photo.fallback : null;
  const [bg, photo] = await Promise.all([
    design?.bg ? loadImage(bgUrl(input.design)) : Promise.resolve(null),
    photoSrc ? loadImage(photoSrc).then((im) => im ?? (design?.photo && photoSrc !== design.photo.fallback ? loadImage(design.photo.fallback) : null)) : Promise.resolve(null),
    loadFonts(fontNeeds(stacks, texts)),
  ]);

  if (design) {
    ctx.fillStyle = design.fill;
    ctx.fillRect(0, 0, W, H);
    if (photo && design.photo) drawPhoto(ctx, photo, design.photo);
    if (bg) ctx.drawImage(bg, 0, 0, W, H);
    for (const sh of design.shade ?? []) {
      const g = ctx.createLinearGradient(0, sh.y0, 0, sh.y1);
      g.addColorStop(0, sh.from);
      g.addColorStop(1, sh.to);
      ctx.fillStyle = g;
      ctx.fillRect(0, sh.y0, W, sh.y1 - sh.y0);
    }
  } else drawGenericBg(ctx, th);

  for (const s of stacks) drawStack(ctx, s, texts);

  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/jpeg", quality));
}

/** Fayl nomi: «jasur-madina.jpg» (Telegram/WhatsApp rasm sifatida qabul qiladi) */
export function shareFileName(slug: string, guest?: string | null) {
  const g = clean(guest)
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  return `${slug || "taklifnoma"}${g ? `-${g}` : ""}.jpg`;
}
