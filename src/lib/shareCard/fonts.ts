/**
 * Ulashish kartasi shriftlari — canvas’da chizishdan oldin FontFace orqali yuklanadi.
 * Oila nomlari «sc-» bilan boshlanadi (sahifadagi shablon CSS’idagi @font-face bilan to‘qnashmasin).
 * Fayllar: shablonning o‘z papkasi (public/templates/<slug>/fonts) yoki public/share/fonts (@fontsource nusxasi).
 */

const LATIN = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const LATIN_EXT = "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF";
const CYRILLIC = "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116";

type Sub = "latin" | "latin-ext" | "cyrillic";
const RANGE: Record<Sub, string> = { latin: LATIN, "latin-ext": LATIN_EXT, cyrillic: CYRILLIC };

type Face = { family: string; weight: number | string; style: "normal" | "italic"; files: [Sub, string][] };

/** dir + "<prefix>-<sub>-<suffix>.woff2" */
const subs = (dir: string, prefix: string, suffix: string, list: Sub[] = ["latin", "latin-ext", "cyrillic"]): [Sub, string][] =>
  list.map((s) => [s, `${dir}/${prefix}-${s}-${suffix}.woff2`]);

const S = "/share/fonts";
const T = (slug: string) => `/templates/${slug}/fonts`;

const FACES: Face[] = [
  // Riviera ismlari: statik Bodoni Moda 500 (opsz 11 — ingichka chiziqlar kichik o‘lchamda ham ko‘rinadi); kirill — Playfair
  {
    family: "sc-bodoni-s",
    weight: 500,
    style: "normal",
    files: [
      ["latin", `${S}/bodoni-moda-latin-500-normal.woff2`],
      ["latin-ext", `${S}/bodoni-moda-latin-ext-500-normal.woff2`],
      ["cyrillic", `${S}/playfair-display-cyrillic-400-normal.woff2`],
    ],
  },
  { family: "sc-playfair", weight: 400, style: "normal", files: subs(S, "playfair-display", "400-normal") },
  { family: "sc-playfair", weight: 400, style: "italic", files: subs(S, "playfair-display", "400-italic") },
  { family: "sc-cormorant", weight: 300, style: "normal", files: subs(S, "cormorant-garamond", "300-normal") },
  { family: "sc-cormorant", weight: 400, style: "italic", files: subs(S, "cormorant-garamond", "400-italic") },
  { family: "sc-cormorant", weight: 500, style: "normal", files: subs(S, "cormorant-garamond", "500-normal") },
  { family: "sc-cormorant", weight: 500, style: "italic", files: subs(S, "cormorant-garamond", "500-italic") },
  { family: "sc-jost", weight: 400, style: "normal", files: subs(S, "jost", "400-normal") },
  { family: "sc-jost", weight: 500, style: "normal", files: subs(S, "jost", "500-normal") },
  { family: "sc-manrope", weight: 400, style: "normal", files: subs(S, "manrope", "400-normal") },
  { family: "sc-manrope", weight: 600, style: "normal", files: subs(S, "manrope", "600-normal") },
  { family: "sc-pinyon", weight: 400, style: "normal", files: subs(S, "pinyon-script", "400-normal", ["latin", "latin-ext"]) },
  { family: "sc-cinzel", weight: 400, style: "normal", files: subs(S, "cinzel", "400-normal", ["latin", "latin-ext"]) },
  { family: "sc-onest", weight: 400, style: "normal", files: subs(T("parvoz"), "onest", "400-normal") },
  { family: "sc-onest", weight: 500, style: "normal", files: subs(T("parvoz"), "onest", "500-normal") },
  { family: "sc-onest", weight: 600, style: "normal", files: subs(T("parvoz"), "onest", "600-normal") },
  { family: "sc-mono", weight: 500, style: "normal", files: subs(T("parvoz"), "jetbrains-mono", "500-normal") },
  { family: "sc-golos", weight: 400, style: "normal", files: subs(T("shato"), "golos-text", "400-normal") },
  { family: "sc-golos", weight: 500, style: "normal", files: subs(T("shato"), "golos-text", "500-normal") },
  { family: "sc-montserrat", weight: 300, style: "normal", files: subs(T("kalit"), "montserrat", "300-normal") },
  { family: "sc-montserrat", weight: 400, style: "normal", files: subs(T("savsan"), "montserrat", "400-normal") },
  { family: "sc-montserrat", weight: 500, style: "normal", files: subs(T("savsan"), "montserrat", "500-normal") },
  { family: "sc-lora", weight: 400, style: "italic", files: subs(T("savsan"), "lora", "400-italic") },
  { family: "sc-prata", weight: 400, style: "normal", files: subs(T("savsan"), "prata", "400-normal", ["latin", "cyrillic"]) },
  // Gloock’da kirill yo‘q — shablondagi kabi Prata kirilli (lino.module.css)
  { family: "sc-gloock", weight: 400, style: "normal", files: [...subs(T("lino"), "gloock", "400-normal", ["latin", "latin-ext"]), ["cyrillic", `${T("savsan")}/prata-cyrillic-400-normal.woff2`]] },
  { family: "sc-forum", weight: 400, style: "normal", files: subs(T("kumush"), "forum", "400-normal") },
  // Bodoni Moda’da kirill yo‘q — riviera.module.css dagi kabi Playfair Display
  {
    family: "sc-bodoni",
    weight: "400 900",
    style: "normal",
    files: [
      ["latin", `${T("riviera")}/bodoni-moda-latin-opsz-normal.woff2`],
      ["latin-ext", `${T("riviera")}/bodoni-moda-latin-ext-opsz-normal.woff2`],
      ["cyrillic", `${T("riviera")}/playfair-display-cyrillic-400-normal.woff2`],
    ],
  },
  {
    family: "sc-bodoni",
    weight: "400 900",
    style: "italic",
    files: [
      ["latin", `${T("riviera")}/bodoni-moda-latin-opsz-italic.woff2`],
      ["latin-ext", `${T("riviera")}/bodoni-moda-latin-ext-opsz-italic.woff2`],
      ["cyrillic", `${T("riviera")}/playfair-display-cyrillic-400-italic.woff2`],
    ],
  },
];

let registered = false;
/** Barcha yuzlarni hujjatga qo‘shadi (fayl hali yuklanmaydi — faqat kerak bo‘lganda) */
function register() {
  if (registered || typeof document === "undefined" || !("fonts" in document)) return;
  registered = true;
  for (const f of FACES)
    for (const [sub, url] of f.files) {
      try {
        document.fonts.add(new FontFace(f.family, `url(${url}) format("woff2")`, { weight: String(f.weight), style: f.style, unicodeRange: RANGE[sub], display: "block" }));
      } catch {
        /* eski brauzer — tizim shrifti bilan chiziladi */
      }
    }
}

/** Kartadagi har bir shrift + matn uchun kerakli fayllarni yuklaydi (vaqt chegarasi bilan) */
export async function loadFonts(list: { font: string; text: string }[], timeoutMs = 6000): Promise<void> {
  register();
  if (typeof document === "undefined" || !("fonts" in document)) return;
  const all = Promise.all(list.map(({ font, text }) => document.fonts.load(font, text || "A").catch(() => [])));
  await Promise.race([all, new Promise((r) => setTimeout(r, timeoutMs))]);
}
