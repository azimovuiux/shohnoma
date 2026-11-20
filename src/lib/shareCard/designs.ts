/**
 * Har shablon uchun ulashish kartasi dizayni (1080×1440 koordinatalarida).
 * Fon — public/templates/<slug>/share-bg.webp: shablonning birinchi ekrani matnsiz (scripts/qa/share-bg.cjs).
 * Matn joylari, shriftlar va ranglar namuna sahifasidagi joylashuvdan olingan (scripts/qa/out/share-<slug>.json).
 */
import type { PhotoSpec, Stack, TextStyle } from "./engine";

export type Design = {
  /** fon ostidagi rang (fon yuklanmasa) */
  fill: string;
  /** fon rasmi bor (share-bg.webp) */
  bg: boolean;
  photo?: PhotoSpec;
  /** sana ko‘rinishi: dots — «12 · 09 · 2026 · 17:00», long — «12-sentabr 2026, 17:00» */
  date: "dots" | "long";
  /** ismlar orasidagi so‘z: & yoki va (tarjima qilinadi) */
  amp?: "&" | "va";
  /** fon ustidan qo‘shimcha soya (matn o‘qilishi uchun): y0→y1 gradient */
  shade?: { y0: number; y1: number; from: string; to: string }[];
  stacks: Stack[];
};

const P = (slug: string) => `/templates/${slug}`;
const f = {
  playfair: '"sc-playfair", Georgia, serif',
  cormorant: '"sc-cormorant", Georgia, serif',
  jost: '"sc-jost", system-ui, sans-serif',
  manrope: '"sc-manrope", system-ui, sans-serif',
  onest: '"sc-onest", system-ui, sans-serif',
  mono: '"sc-mono", ui-monospace, monospace',
  golos: '"sc-golos", system-ui, sans-serif',
  montserrat: '"sc-montserrat", system-ui, sans-serif',
  lora: '"sc-lora", Georgia, serif',
  prata: '"sc-prata", Georgia, serif',
  gloock: '"sc-gloock", "sc-prata", Georgia, serif',
  forum: '"sc-forum", Georgia, serif',
  bodoni: '"sc-bodoni", "sc-playfair", Georgia, serif',
  bodoniS: '"sc-bodoni-s", "sc-playfair", Georgia, serif',
  yeseva: '"sc-yeseva", "sc-playfair", Georgia, serif',
  nunito: '"sc-nunito", system-ui, sans-serif',
  philosopher: '"sc-philosopher", "sc-playfair", Georgia, serif',
  tenor: '"sc-tenor", "sc-manrope", system-ui, sans-serif',
  unbounded: '"sc-unbounded", "sc-manrope", system-ui, sans-serif',
  ssec: '"sc-ssec", "sc-sofia", system-ui, sans-serif',
  sofia: '"sc-sofia", "sc-manrope", system-ui, sans-serif',
};
/** Malika: atlas burmalari ustidagi matn o‘qilishi uchun krem nur */
const GLOW = { color: "rgba(255,249,247,.95)", blur: 22 };
const st = (family: string, size: number, color: string, o: Partial<TextStyle> = {}): TextStyle => ({ family, size, color, ...o });

export const DESIGNS: Record<string, Design> = {
  /* Anor: bordo baxmal, gulchambarlar, qo‘lda muhrli maktub — ismlar «Sizga maktub bor» o‘rnida */
  anor: {
    fill: "#5e1522",
    bg: true,
    date: "long",
    stacks: [
      {
        y: 470,
        anchor: "center",
        w: 900,
        maxH: 620,
        items: [
          { k: "guest", s: st(f.jost, 44, "rgba(251,246,238,.88)", { maxLines: 2, min: 32 }) },
          { k: "kicker", s: st(f.jost, 34, "#e8d3a8", { weight: 500, upper: true, ls: 0.16, min: 24 }), gap: 18 },
          { k: "names", mode: "two", s: st(f.playfair, 176, "#fbf6ee", { italic: true, min: 104, lh: 1.04 }), gap: 34 },
          { k: "date", s: st(f.jost, 44, "rgba(251,246,238,.9)", { min: 30 }), gap: 40 },
          { k: "venue", s: st(f.jost, 40, "rgba(251,246,238,.8)", { maxLines: 2, min: 28 }), gap: 8 },
        ],
      },
    ],
  },

  /* Zumrad: ochiq yashil konvert, karta ichida ismlar; polaroid — mijoz surati (bo‘lmasa — qo‘llar) */
  zumrad: {
    fill: "#f4efe4",
    bg: true,
    date: "dots",
    photo: { cx: 832, cy: 1261, w: 366, h: 416, rot: 7, fallback: `${P("zumrad")}/foto-qollar.webp` },
    stacks: [
      {
        y: 548,
        anchor: "center",
        w: 420,
        maxH: 440,
        items: [
          { k: "guest", s: st(f.cormorant, 40, "#123c2e", { italic: true, weight: 500, maxLines: 2, min: 28 }) },
          { k: "kicker", s: st(f.manrope, 38, "#123c2e", { min: 26 }), gap: 12 },
          { k: "names", mode: "two", s: st(f.cormorant, 128, "#1e2a24", { italic: true, weight: 500, min: 76, lh: 0.98 }), gap: 18 },
          { k: "date", s: st(f.cormorant, 58, "#123c2e", { weight: 500, ls: 0.01, min: 40 }), gap: 18 },
          { k: "venue", s: st(f.manrope, 30, "rgba(18,60,46,.85)", { maxLines: 2, min: 22 }), gap: 6 },
        ],
      },
    ],
  },

  /* Parvoz: osmon, samolyot; ismlar tepada, pastda — joy va taklif */
  parvoz: {
    fill: "#a9c3e2",
    bg: true,
    date: "dots",
    stacks: [
      {
        y: 150,
        anchor: "top",
        w: 940,
        maxH: 600,
        items: [
          { k: "names", mode: "stack", s: st(f.playfair, 190, "#1c2b45", { min: 110, lh: 1.0 }), amp: st(f.playfair, 92, "#c9664a", { italic: true, lh: 0.95 }) },
          { k: "date", s: st(f.mono, 30, "rgba(28,43,69,.88)", { weight: 500, ls: 0.12, min: 22 }), gap: 36 },
        ],
      },
      {
        y: 1170,
        anchor: "center",
        w: 860,
        maxH: 300,
        items: [
          { k: "guest", s: st(f.playfair, 52, "#1c2b45", { italic: true, maxLines: 2, min: 36 }) },
          { k: "kicker", s: st(f.onest, 30, "rgba(28,43,69,.82)", { weight: 600, upper: true, ls: 0.18, min: 22 }), gap: 20 },
          { k: "venue", s: st(f.onest, 42, "#1c2b45", { weight: 500, maxLines: 2, min: 30 }), gap: 14 },
        ],
      },
    ],
  },

  /* Shato: gulli oltin ark — hamma matn ark ichida */
  shato: {
    fill: "#cfe0ee",
    bg: true,
    date: "dots",
    stacks: [
      {
        y: 745,
        anchor: "center",
        w: 300,
        maxH: 660,
        items: [
          { k: "guest", s: st(f.cormorant, 40, "#4a3f36", { italic: true, weight: 500, maxLines: 2, min: 28 }) },
          { k: "kicker", s: st(f.golos, 22, "rgba(74,63,54,.85)", { upper: true, ls: 0.18, min: 16 }), gap: 16 },
          { k: "names", mode: "stack", s: st(f.cormorant, 106, "#4a3f36", { italic: true, weight: 500, min: 60, lh: 1.0 }), amp: st(f.cormorant, 66, "#b08d57", { italic: true, weight: 500, lh: 0.9 }), gap: 26 },
          { k: "date", s: st(f.golos, 25, "#4a3f36", { ls: 0.11, min: 18 }), gap: 34 },
          { k: "venue", s: st(f.cormorant, 38, "#4a3f36", { italic: true, weight: 500, maxLines: 2, min: 28 }), gap: 10 },
        ],
      },
    ],
  },

  /* Savsan: yashil fon, ark shaklidagi karta va konvert — matn karta ichida */
  savsan: {
    fill: "#9fb08c",
    bg: true,
    date: "dots",
    stacks: [
      {
        y: 455,
        anchor: "center",
        w: 300,
        maxH: 580,
        items: [
          { k: "guest", s: st(f.lora, 36, "#56684a", { italic: true, maxLines: 2, min: 26 }) },
          { k: "kicker", s: st(f.montserrat, 22, "#6f8160", { weight: 500, upper: true, ls: 0.2, min: 16 }), gap: 14 },
          { k: "names", mode: "stack", s: st(f.prata, 92, "#3f4a37", { min: 54, lh: 1.08 }), amp: st(f.lora, 64, "#a8884a", { italic: true, lh: 0.95 }), gap: 22 },
          { k: "date", s: st(f.montserrat, 24, "#6d6656", { weight: 500, ls: 0.16, min: 18 }), gap: 30 },
          { k: "venue", s: st(f.lora, 34, "#56684a", { italic: true, maxLines: 2, min: 24 }), gap: 10 },
        ],
      },
    ],
  },

  /* Muhr: bordo charm konvert va muhr — ismlar muhr ostida, mehmon ismi tepada */
  muhr: {
    fill: "#4a1420",
    bg: true,
    date: "dots",
    stacks: [
      {
        y: 330,
        anchor: "center",
        w: 780,
        items: [{ k: "guest", s: st(f.playfair, 52, "rgba(247,241,232,.92)", { italic: true, maxLines: 2, min: 36 }) }],
      },
      {
        y: 1135,
        anchor: "center",
        w: 860,
        maxH: 450,
        items: [
          { k: "kicker", s: st(f.montserrat, 26, "#c9a06b", { weight: 500, upper: true, ls: 0.2, min: 18 }) },
          { k: "names", mode: "line", s: st(f.playfair, 92, "#f7f1e8", { min: 66, lh: 1.12 }), gap: 24 },
          { k: "date", s: st(f.montserrat, 26, "#c9a06b", { ls: 0.14, min: 18 }), gap: 28 },
          { k: "venue", s: st(f.playfair, 38, "rgba(247,241,232,.85)", { italic: true, maxLines: 2, min: 28 }), gap: 12 },
        ],
      },
    ],
  },

  /* Kalit: qorong‘i fon, kalit teshigi ortida mijoz surati (bo‘lmasa — kutubxona nuri) */
  kalit: {
    fill: "#140e0a",
    bg: true,
    date: "dots",
    amp: "va",
    photo: { cx: 540, cy: 715, w: 576, h: 1024, fallback: `${P("kalit")}/library.webp` },
    stacks: [
      {
        y: 56,
        anchor: "top",
        w: 900,
        maxH: 340,
        items: [
          { k: "kicker", s: st(f.montserrat, 22, "#c8a46a", { weight: 300, upper: true, ls: 0.24, min: 16 }) },
          { k: "names", mode: "stack", s: st(f.cormorant, 99, "#efe4d2", { weight: 300, min: 62, lh: 1.0 }), amp: st(f.cormorant, 48, "#c8a46a", { italic: true, lh: 1.0 }), gap: 20 },
        ],
      },
      {
        y: 1160,
        anchor: "top",
        w: 860,
        maxH: 250,
        items: [
          { k: "guest", s: st(f.cormorant, 40, "#efe4d2", { italic: true, maxLines: 2, min: 28 }) },
          { k: "date", s: st(f.montserrat, 24, "#c8a46a", { weight: 300, ls: 0.2, min: 18 }), gap: 22 },
          { k: "venue", s: st(f.cormorant, 38, "rgba(239,228,210,.86)", { italic: true, maxLines: 2, min: 26 }), gap: 12 },
        ],
      },
    ],
  },

  /* Sayohat: chizma osmon, haykal va motoroller — matn osmonda */
  sayohat: {
    fill: "#9fc3ea",
    bg: true,
    date: "dots",
    stacks: [
      {
        y: 110,
        anchor: "top",
        w: 940,
        maxH: 350,
        items: [
          { k: "guest", s: st(f.cormorant, 44, "#22324d", { italic: true, weight: 500, maxLines: 2, min: 30 }) },
          { k: "kicker", s: st(f.montserrat, 22, "rgba(34,50,77,.82)", { weight: 500, upper: true, ls: 0.2, min: 16 }), gap: 12 },
          { k: "names", mode: "line", s: st(f.cormorant, 96, "#22324d", { italic: true, weight: 500, min: 70, lh: 1.04 }), gap: 10 },
          { k: "date", s: st(f.montserrat, 26, "#22324d", { weight: 500, ls: 0.12, min: 18 }), gap: 18 },
          { k: "venue", s: st(f.cormorant, 40, "#22324d", { italic: true, weight: 500, maxLines: 2, min: 28 }), gap: 6 },
        ],
      },
    ],
  },

  /* Lino: jurnal muqovasi — tepada surat (mijozniki yoki guldasta), pastda krem maydonda ismlar */
  lino: {
    fill: "#f1ebe1",
    bg: true,
    date: "long",
    photo: { cx: 540, cy: 424, w: 1080, h: 922, pos: [0.5, 0.35], fallback: `${P("lino")}/bouquet.webp` },
    stacks: [
      {
        y: 1150,
        anchor: "center",
        w: 940,
        maxH: 470,
        items: [
          { k: "guest", s: st(f.onest, 26, "#857c6d", { maxLines: 2, min: 20 }) },
          { k: "kicker", s: st(f.onest, 22, "#857c6d", { weight: 500, upper: true, ls: 0.2, min: 16 }), gap: 12 },
          { k: "names", mode: "two", s: st(f.gloock, 109, "#2b2620", { min: 70, lh: 1.0 }), gap: 20 },
          { k: "rule", w: 80, h: 2, color: "rgba(133,124,109,.6)", gap: 30 },
          { k: "date", s: st(f.onest, 26, "#857c6d", { ls: 0.04, min: 20 }), gap: 30 },
          { k: "venue", s: st(f.onest, 26, "#857c6d", { maxLines: 2, min: 20 }), gap: 6 },
        ],
      },
    ],
  },

  /* Kumush: oq-qora to‘liq surat (mijozniki yoki qo‘llar) — Forum harflari */
  kumush: {
    fill: "#1c1c1c",
    bg: true,
    date: "dots",
    photo: { cx: 540, cy: 720, w: 1080, h: 1440, gray: true, fallback: `${P("kumush")}/hands.webp` },
    shade: [
      { y0: 0, y1: 520, from: "rgba(0,0,0,.42)", to: "rgba(0,0,0,0)" },
      { y0: 860, y1: 1440, from: "rgba(0,0,0,0)", to: "rgba(0,0,0,.82)" },
    ],
    stacks: [
      {
        y: 110,
        anchor: "top",
        w: 900,
        maxH: 380,
        items: [
          {
            k: "names",
            mode: "stack",
            s: st(f.forum, 92, "#ffffff", { upper: true, ls: 0.18, min: 58, lh: 1.08, shadow: { color: "rgba(0,0,0,.35)", blur: 18 } }),
            amp: st(f.forum, 46, "#ffffff", { lh: 1.0, shadow: { color: "rgba(0,0,0,.35)", blur: 14 } }),
          },
        ],
      },
      {
        y: 1370,
        anchor: "bottom",
        w: 880,
        maxH: 300,
        items: [
          { k: "guest", s: st(f.montserrat, 30, "rgba(255,255,255,.92)", { weight: 300, maxLines: 2, min: 22, shadow: { color: "rgba(0,0,0,.5)", blur: 14 } }) },
          { k: "kicker", s: st(f.montserrat, 22, "rgba(255,255,255,.9)", { weight: 400, upper: true, ls: 0.24, min: 16, shadow: { color: "rgba(0,0,0,.5)", blur: 12 } }), gap: 16 },
          { k: "venue", s: st(f.forum, 36, "#ffffff", { maxLines: 2, min: 26, shadow: { color: "rgba(0,0,0,.5)", blur: 14 } }), gap: 14 },
          { k: "date", s: st(f.montserrat, 24, "#ffffff", { ls: 0.3, min: 18, shadow: { color: "rgba(0,0,0,.5)", blur: 12 } }), gap: 22 },
        ],
      },
    ],
  },

  /* Riviera: krem karta-darvoza, oltin muhr — ismlar muhr ustida, sana ostida */
  riviera: {
    fill: "#f6f1e8",
    bg: true,
    date: "dots",
    stacks: [
      {
        y: 448,
        anchor: "center",
        w: 760,
        maxH: 440,
        items: [
          { k: "guest", s: st(f.bodoni, 36, "#7a736a", { italic: true, weight: 500, maxLines: 2, min: 26 }) },
          { k: "names", mode: "stack", s: st(f.bodoniS, 84, "#121212", { weight: 500, min: 56, lh: 1.14 }), amp: st(f.bodoni, 58, "#a8895a", { italic: true, lh: 1.0 }), gap: 22 },
        ],
      },
      {
        y: 975,
        anchor: "top",
        w: 760,
        maxH: 200,
        items: [
          { k: "date", s: st(f.jost, 26, "#121212", { ls: 0.16, min: 18 }) },
          { k: "venue", s: st(f.jost, 22, "#7a736a", { upper: true, ls: 0.14, maxLines: 2, min: 16 }), gap: 20 },
        ],
      },
      { y: 1266, anchor: "top", w: 700, items: [{ k: "kicker", s: st(f.jost, 22, "#7a736a", { min: 16 }) }] },
    ],
  },

  /* Ertak (sunnat): yopiq ertak kitobi — muqovada taklif turi (oltin), bola ismi, joy; yulduzchalar ostida sana; mehmon — kitob ustida */
  ertak: {
    fill: "#e9d8be",
    bg: true,
    date: "dots",
    stacks: [
      { y: 104, anchor: "center", w: 940, maxH: 160, items: [{ k: "guest", s: st(f.yeseva, 48, "#1e5c63", { maxLines: 2, min: 32, lh: 1.2 }) }] },
      {
        x: 548,
        y: 860,
        anchor: "center",
        w: 340,
        maxH: 200,
        items: [
          { k: "kicker", s: st(f.nunito, 28, "#e9b44c", { weight: 700, ls: 0.06, min: 18 }) },
          { k: "names", mode: "two", s: st(f.yeseva, 88, "#fbf3e6", { min: 50, lh: 1.16 }), gap: 18 },
        ],
      },
      { x: 548, y: 1002, anchor: "center", w: 330, maxH: 92, items: [{ k: "venue", s: st(f.nunito, 26, "rgba(251,243,230,.85)", { weight: 600, maxLines: 2, min: 19, lh: 1.3 }) }] },
      { x: 548, y: 1138, anchor: "center", w: 330, items: [{ k: "date", s: st(f.nunito, 28, "#e9b44c", { weight: 700, ls: 0.16, min: 18 }) }] },
    ],
  },

  /* Farmon (sunnat): o‘ralgan farmon (Figma 00) — toj va o‘ram fonda; mehmon — toj bilan o‘ram orasida;
   * pastda taklif turi (oltin kursiv), bola ismi (fil suyagi), ajratgich (fonda), sana (oltin), joy */
  farmon: {
    fill: "#0f3b33",
    bg: true,
    date: "dots",
    stacks: [
      { y: 478, anchor: "center", w: 640, maxH: 170, items: [{ k: "guest", s: st(f.playfair, 50, "#f5efe3", { italic: true, maxLines: 2, min: 34, lh: 1.2 }) }] },
      // taklif turi + ism — bitta ustun, pastki cheti ajratgich (fonda) ustida: ism 2 qatorga bo‘linsa, ustun yuqoriga o‘sadi (ustma-ust tushmaydi)
      {
        y: 1113,
        anchor: "bottom",
        w: 660,
        maxH: 270,
        items: [
          { k: "kicker", s: st(f.playfair, 38, "#c8a25a", { italic: true, min: 26, lh: 1.2 }) },
          { k: "names", mode: "two", s: st(f.playfair, 78, "#f5efe3", { min: 52, lh: 1.15 }), gap: 4 },
        ],
      },
      { y: 1213, anchor: "center", w: 560, items: [{ k: "date", s: st(f.manrope, 24, "#c8a25a", { weight: 600, ls: 0.28, min: 18 }) }] },
      { y: 1258, anchor: "top", w: 400, maxH: 80, items: [{ k: "venue", s: st(f.manrope, 26, "rgba(245,239,227,.8)", { maxLines: 2, min: 19, lh: 1.3 }) }] },
    ],
  },

  /* Sandiq (sunnat): anor rang fon, xon-atlas chiziqlari, iliq nur va yopiq sandiq (Figma 00) — ajratgich fonda;
   * mehmon — eng tepada; taklif turi (za’faron kursiv) + bola ismi (krem) — ajratgich ustida (ism 2 qatorga bo‘linsa — yuqoriga o‘sadi);
   * sanadan keyin joy — sandiq ostida */
  sandiq: {
    fill: "#7a1e2c",
    bg: true,
    date: "dots",
    stacks: [
      { y: 108, anchor: "center", w: 470, maxH: 140, items: [{ k: "guest", s: st(f.philosopher, 44, "#faf4ea", { italic: true, maxLines: 2, min: 30, lh: 1.15 }) }] },
      {
        y: 350,
        anchor: "bottom",
        w: 470,
        maxH: 215,
        items: [
          { k: "kicker", s: st(f.philosopher, 42, "#e0a23b", { italic: true, min: 28, lh: 1.15 }) },
          { k: "names", mode: "two", s: st(f.philosopher, 96, "#faf4ea", { weight: 700, min: 58, lh: 1.08 }), gap: 2 },
        ],
      },
      { y: 1102, anchor: "center", w: 470, items: [{ k: "date", s: st(f.manrope, 28, "#faf4ea", { weight: 600, ls: 0.24, min: 18 }) }] },
      { y: 1150, anchor: "top", w: 460, maxH: 100, items: [{ k: "venue", s: st(f.philosopher, 36, "rgba(250,244,234,.85)", { italic: true, maxLines: 2, min: 26, lh: 1.2 }) }] },
    ],
  },

  /* Sovg‘a (tug‘ilgan kun): pudra fonda atlas bantli sovg‘a qutisi va kumush uchqunlar (Figma 00) — fonda;
   * mehmon — eng tepada; taklif turi (Tenor Sans) + ism (Cormorant kursiv, berry) — quti ustida (ism 2 qatorga bo‘linsa — yuqoriga o‘sadi);
   * sana va joy — quti ostida */
  sovga: {
    fill: "#f3d9da",
    bg: true,
    date: "dots",
    stacks: [
      { y: 104, anchor: "center", w: 820, maxH: 120, items: [{ k: "guest", s: st(f.cormorant, 46, "#5b1a2e", { italic: true, weight: 500, maxLines: 2, min: 32, lh: 1.15 }) }] },
      {
        y: 566,
        anchor: "bottom",
        w: 860,
        maxH: 360,
        items: [
          { k: "kicker", s: st(f.tenor, 36, "#1c1416", { ls: 0.04, min: 26, lh: 1.2 }) },
          { k: "names", mode: "two", s: st(f.cormorant, 132, "#5b1a2e", { italic: true, weight: 500, min: 76, lh: 1.05 }), gap: 6 },
        ],
      },
      { y: 1190, anchor: "center", w: 820, items: [{ k: "date", s: st(f.manrope, 30, "#5b1a2e", { weight: 600, ls: 0.24, min: 20 }) }] },
      { y: 1236, anchor: "top", w: 820, maxH: 110, items: [{ k: "venue", s: st(f.cormorant, 42, "#8a7476", { italic: true, weight: 500, maxLines: 2, min: 30, lh: 1.15 }) }] },
    ],
  },

  /* Malika (tug‘ilgan kun): yopiq atlas pardalar, yorug‘lik, marvarid gerb va tiara (Figma 00) — fonda;
   * mehmon — eng tepada; ism (Cormorant kursiv) — gerb ichida (2 qatorga bo‘linsa — gerb ichida kichrayadi);
   * taklif turi, sana va joy — gerb ostida, yorug‘lik ustida */
  malika: {
    fill: "#efd0d4",
    bg: true,
    date: "dots",
    stacks: [
      { y: 112, anchor: "center", w: 860, maxH: 130, items: [{ k: "guest", s: st(f.cormorant, 48, "#8c4a57", { italic: true, weight: 500, maxLines: 2, min: 34, lh: 1.15, shadow: GLOW }) }] },
      { y: 668, anchor: "center", w: 218, maxH: 270, items: [{ k: "names", mode: "two", s: st(f.cormorant, 88, "#8c4a57", { italic: true, weight: 500, min: 42, lh: 1.05 }) }] },
      {
        y: 975,
        anchor: "top",
        w: 860,
        maxH: 340,
        items: [
          { k: "kicker", s: st(f.cormorant, 54, "#3a2a2e", { italic: true, min: 36, lh: 1.15, shadow: GLOW }) },
          { k: "date", s: st(f.manrope, 30, "#8c4a57", { weight: 600, ls: 0.24, min: 20, shadow: GLOW }), gap: 28 },
          { k: "venue", s: st(f.cormorant, 42, "#8c4a57", { italic: true, weight: 500, maxLines: 2, min: 30, lh: 1.15, shadow: GLOW }), gap: 16 },
        ],
      },
    ],
  },

  /* Sham (universal tug‘ilgan kun): tungi ko‘k radial fon, sham nuri va yonib turgan oltin sham (Figma 00) — fonda;
   * mehmon — eng tepada; taklif turi (Lora kursiv, oltin) + ism (Unbounded, sut rang) — sham ustida, nur ichida
   * (ism 2 qatorga bo‘linsa — pastga, sham olovigacha o‘sadi); sana (oltin, keng harf oralig‘i) va joy — sham ostida */
  sham: {
    fill: "#1f253b",
    bg: true,
    date: "dots",
    stacks: [
      { y: 92, anchor: "center", w: 900, maxH: 120, items: [{ k: "guest", s: st(f.lora, 44, "#e3c891", { italic: true, maxLines: 2, min: 30, lh: 1.2 }) }] },
      {
        y: 168,
        anchor: "top",
        w: 900,
        maxH: 400,
        items: [
          { k: "kicker", s: st(f.lora, 46, "#e3c891", { italic: true, min: 32, lh: 1.25 }) },
          { k: "names", mode: "two", s: st(f.unbounded, 84, "#fbf7f0", { weight: 500, min: 46, lh: 1.15 }), gap: 18 },
        ],
      },
      {
        y: 1150,
        anchor: "top",
        w: 900,
        maxH: 230,
        items: [
          { k: "date", s: st(f.manrope, 30, "#e3c891", { weight: 600, ls: 0.22, min: 20 }) },
          { k: "venue", s: st(f.lora, 40, "rgba(251,247,240,.85)", { italic: true, maxLines: 2, min: 28, lh: 1.2 }), gap: 22 },
        ],
      },
    ],
  },

  /* Koinot (o‘g‘il bola tug‘ilgan kuni): tungi osmon, yulduzlar, start nuri, raketa va uchish tutuni (Figma 00) — fonda
   * (sanoq halqasi va oy olib tashlangan — matn uchun joy); mehmon — eng tepada; taklif turi (Manrope, to‘q sariq),
   * ism (Unbounded Black, sut rang; uzun bo‘lsa — 2 qator), sana va joy — raketa burnidan yuqorida */
  koinot: {
    fill: "#0e1733",
    bg: true,
    date: "long",
    stacks: [
      { y: 74, anchor: "center", w: 900, maxH: 110, items: [{ k: "guest", s: st(f.manrope, 38, "#f6e7a8", { weight: 600, maxLines: 2, min: 28, lh: 1.2 }) }] },
      {
        y: 150,
        anchor: "top",
        w: 940,
        maxH: 420,
        items: [
          { k: "kicker", s: st(f.manrope, 36, "#ff7a3d", { weight: 600, ls: 0.02, min: 26, lh: 1.2 }) },
          { k: "names", mode: "two", s: st(f.unbounded, 112, "#fff4e2", { weight: 900, min: 58, lh: 1.12 }), gap: 18 },
          { k: "date", s: st(f.manrope, 34, "#fff4e2", { weight: 600, ls: 0.04, min: 24 }), gap: 26 },
          { k: "venue", s: st(f.manrope, 32, "rgba(255,244,226,.78)", { maxLines: 2, min: 24, lh: 1.25 }), gap: 12 },
        ],
      },
    ],
  },

  /* Marvarid (qizlar tug‘ilgan kuni): pudra-pushti fon, tepada marvarid shoda, atlas lenta va bant (Figma 00) — fonda;
   * mehmon — shoda ichida; taklif turi (Manrope) va ism (Playfair Display Italic, gilos-qizil; uzun bo‘lsa — 2 qator) — sahifadagi
   * ism o‘rnida, bant ustida; sana (qizil) va joy — lenta ostida, sahifadagi sana o‘rnida */
  marvarid: {
    fill: "#f6d6da",
    bg: true,
    date: "long",
    stacks: [
      { y: 150, anchor: "center", w: 470, maxH: 130, items: [{ k: "guest", s: st(f.manrope, 36, "#2a1a1f", { weight: 600, maxLines: 2, min: 26, lh: 1.22 }) }] },
      {
        y: 430,
        anchor: "top",
        w: 920,
        maxH: 190,
        items: [
          { k: "kicker", s: st(f.manrope, 34, "#2a1a1f", { weight: 600, ls: 0.02, min: 24, lh: 1.2 }) },
          { k: "names", mode: "two", s: st(f.playfair, 116, "#b5162b", { italic: true, min: 60, lh: 1.08 }), gap: 6 },
        ],
      },
      {
        y: 1090,
        anchor: "top",
        w: 900,
        maxH: 270,
        items: [
          { k: "date", s: st(f.manrope, 38, "#b5162b", { weight: 600, ls: 0.03, min: 26 }) },
          { k: "venue", s: st(f.manrope, 34, "rgba(42,26,31,.82)", { maxLines: 2, min: 24, lh: 1.25 }), gap: 18 },
        ],
      },
    ],
  },

  /* Bilet (korporativ tadbir): sahna nuri, tirqishdan chiqib turgan oq chipta (yozuvsiz), ko‘k tirqish chizig‘i (Figma 00) — fonda;
   * mehmon — sahna tepasida (kompaniya nomi o‘rnida); chipta ichida — taklif turi, kompaniya (Sofia Sans Extra Condensed, ko‘k) va
   * tadbir nomi (shtrix-kod ostida, chok teshiklaridan yuqorida — uzun nom kichrayadi yoki 2 qatorga bo‘linadi); sana va joy —
   * tirqish ostida, sahifadagi sana o‘rnida */
  bilet: {
    fill: "#050a2e",
    bg: true,
    date: "dots",
    stacks: [
      { y: 262, anchor: "center", w: 880, maxH: 290, items: [{ k: "guest", s: st(f.sofia, 46, "#ffffff", { weight: 600, maxLines: 2, min: 30, lh: 1.2 }) }] },
      {
        y: 768,
        anchor: "center",
        w: 500,
        maxH: 380,
        items: [
          { k: "kicker", s: st(f.sofia, 28, "#6b759e", { weight: 600, upper: true, ls: 0.12, min: 20, lh: 1.2 }) },
          { k: "org", s: st(f.ssec, 112, "#1f3bff", { weight: 900, upper: true, maxLines: 2, min: 58, lh: 0.95 }), gap: 18 },
          { k: "names", mode: "two", s: st(f.sofia, 40, "#050a2e", { weight: 600, min: 26, lh: 1.18 }), gap: 18 },
        ],
      },
      {
        y: 1110,
        anchor: "top",
        w: 900,
        maxH: 270,
        items: [
          { k: "date", s: st(f.ssec, 54, "#ffffff", { weight: 800, ls: 0.06, min: 36 }) },
          { k: "venue", s: st(f.sofia, 34, "rgba(255,255,255,.75)", { weight: 500, maxLines: 2, min: 24, lh: 1.25 }), gap: 18 },
        ],
      },
    ],
  },
  /* Taqvim (forum / korporativ): qorong‘i fon, lime nur, shisha plitkalar va ochilishdagidek kattalashgan lime panel (Figma 00) — fonda;
   * mehmon — panel tepasida (shisha plitkalardan yuqorida); panel ichida — taklif turi, kompaniya va tadbir nomi (to‘q matn);
   * sana (lime) va joy — panel ostida. Uzun nom kichrayadi yoki 2 qatorga bo‘linadi; matn bezakka tegmaydi (ustun chegaralari) */
  taqvim: {
    fill: "#0a1214",
    bg: true,
    date: "long",
    stacks: [
      { y: 140, anchor: "center", w: 880, maxH: 210, items: [{ k: "guest", s: st(f.manrope, 46, "#f4f7f6", { weight: 600, maxLines: 2, min: 30, lh: 1.2 }) }] },
      {
        y: 697,
        anchor: "center",
        w: 470,
        maxH: 620,
        items: [
          { k: "kicker", s: st(f.manrope, 28, "rgba(15,20,23,.62)", { weight: 600, ls: 0.02, min: 20, lh: 1.25 }) },
          { k: "org", s: st(f.manrope, 76, "#0f1417", { weight: 600, ls: -0.03, maxLines: 2, min: 44, lh: 1.08 }), gap: 26 },
          { k: "names", mode: "two", s: st(f.manrope, 40, "#0f1417", { weight: 400, min: 26, lh: 1.2 }), gap: 22 },
        ],
      },
      {
        y: 1124,
        anchor: "top",
        w: 900,
        maxH: 270,
        items: [
          { k: "date", s: st(f.manrope, 46, "#e4ff3a", { weight: 600, min: 32 }) },
          { k: "venue", s: st(f.manrope, 34, "rgba(244,247,246,.75)", { maxLines: 2, min: 24, lh: 1.25 }), gap: 16 },
        ],
      },
    ],
  },
};
