/**
 * Ulashish kartasi — canvas chizuvchi (1080×1440).
 * Matn bloklari «ustun» (stack) ichida joylashadi: yo‘q maydon (joy, sana, mehmon) — blok ham, oralig‘i ham yo‘qoladi.
 * Uzun matn: avval kichrayadi (min gacha), keyin 2 qatorga bo‘linadi, hech qachon kesilmaydi.
 */

export const W = 1080;
export const H = 1440;

export type TextStyle = {
  /** CSS font-family ro‘yxati, masalan '"sc-playfair", Georgia, serif' */
  family: string;
  weight?: number;
  italic?: boolean;
  size: number;
  /** kichrayish chegarasi (shundan keyin 2 qatorga bo‘linadi) */
  min?: number;
  color: string;
  /** harf oralig‘i, em */
  ls?: number;
  upper?: boolean;
  /** qator balandligi (size ga nisbatan) */
  lh?: number;
  maxLines?: 1 | 2;
  shadow?: { color: string; blur: number; y?: number };
};

export type Item =
  | { k: "guest" | "kicker" | "date" | "venue"; s: TextStyle; gap?: number }
  | { k: "text"; text: string; s: TextStyle; gap?: number }
  | {
      k: "names";
      s: TextStyle;
      /** & / va qatori uslubi (stack rejimi) */
      amp?: TextStyle;
      /** stack — A / & / B; two — A / & B; line — «A & B» (sig‘masa — two) */
      mode: "stack" | "two" | "line";
      gap?: number;
      /** qatorlar orasidagi qo‘shimcha oraliq */
      lineGap?: number;
    }
  | { k: "rule"; w: number; h?: number; color: string; gap?: number };

export type Stack = {
  /** markaz x */
  x?: number;
  w: number;
  y: number;
  anchor: "top" | "center" | "bottom";
  /** ustunning eng katta balandligi — oshsa, hamma o‘lcham proporsional kichrayadi */
  maxH?: number;
  items: Item[];
};

export type PhotoSpec = {
  cx: number;
  cy: number;
  w: number;
  h: number;
  rot?: number;
  /** object-position (0..1) */
  pos?: [number, number];
  gray?: boolean;
  /** mijoz surati yo‘q bo‘lsa — shablonning yuzsiz rasmi */
  fallback: string;
};

export type Texts = {
  guest: string;
  kicker: string;
  a: string;
  b: string;
  /** "&" yoki "va" / "и" */
  amp: string;
  date: string;
  venue: string;
};

type Line = { text: string; s: TextStyle; size: number; gap: number; h: number } | { rule: true; w: number; h: number; color: string; gap: number };

export const fontStr = (s: TextStyle, size = s.size) => `${s.italic ? "italic " : ""}${s.weight ?? 400} ${Math.round(size * 100) / 100}px ${s.family}`;
const chars = (t: string) => Array.from(t);
const prep = (s: TextStyle, t: string) => (s.upper ? t.toLocaleUpperCase() : t);

function measure(ctx: CanvasRenderingContext2D, text: string, s: TextStyle, size: number) {
  ctx.font = fontStr(s, size);
  const ls = (s.ls ?? 0) * size;
  if (!ls) return ctx.measureText(text).width;
  const cs = chars(text);
  return cs.reduce((w, c) => w + ctx.measureText(c).width, 0) + ls * Math.max(0, cs.length - 1);
}

/** Kenglikka sig‘adigan o‘lcham (size dan katta emas) */
function fitSize(ctx: CanvasRenderingContext2D, text: string, s: TextStyle, size: number, w: number) {
  const m = measure(ctx, text, s, size);
  return m <= w ? size : size * (w / m) * 0.995;
}

/** Matnni 2 qatorga eng teng bo‘lish (bo‘sh joy bo‘yicha) */
function split2(ctx: CanvasRenderingContext2D, text: string, s: TextStyle, size: number): [string, string] | null {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;
  let best: [string, string] | null = null;
  let bw = Infinity;
  for (let i = 1; i < words.length; i++) {
    const l1 = words.slice(0, i).join(" ");
    const l2 = words.slice(i).join(" ");
    const m = Math.max(measure(ctx, l1, s, size), measure(ctx, l2, s, size));
    if (m < bw) {
      bw = m;
      best = [l1, l2];
    }
  }
  return best;
}

/** Bitta matn bloki → qatorlar (kichrayish / 2 qator) */
function textLines(ctx: CanvasRenderingContext2D, raw: string, s: TextStyle, w: number, gap: number, k: number): Line[] {
  const text = prep(s, raw);
  const size = s.size * k;
  const min = (s.min ?? s.size * 0.7) * k;
  const lh = s.lh ?? 1.2;
  let f = fitSize(ctx, text, s, size, w);
  if (f >= min || (s.maxLines ?? 1) < 2) return [{ text, s, size: f, gap, h: f * lh }];
  const two = split2(ctx, text, s, size);
  if (!two) return [{ text, s, size: f, gap, h: f * lh }];
  f = Math.min(fitSize(ctx, two[0], s, size, w), fitSize(ctx, two[1], s, size, w));
  return [
    { text: two[0], s, size: f, gap, h: f * lh },
    { text: two[1], s, size: f, gap: 0, h: f * lh },
  ];
}

/** Ism uchun: sig‘sa bir qator, aks holda (min dan kichik bo‘lsa) ikki qator */
function nameRows(ctx: CanvasRenderingContext2D, text: string, s: TextStyle, w: number, k: number): { rows: string[]; size: number } {
  const size = s.size * k;
  const min = (s.min ?? s.size * 0.6) * k;
  const f = fitSize(ctx, text, s, size, w);
  if (f >= min) return { rows: [text], size: f };
  const two = split2(ctx, text, s, size);
  if (!two) return { rows: [text], size: f };
  return { rows: two, size: Math.min(fitSize(ctx, two[0], s, size, w), fitSize(ctx, two[1], s, size, w)) };
}

function namesLines(ctx: CanvasRenderingContext2D, it: Extract<Item, { k: "names" }>, t: Texts, w: number, gap: number, k: number): Line[] {
  const s = it.s;
  const lh = s.lh ?? 1.1;
  const lg = (it.lineGap ?? 0) * k;
  const A = prep(s, t.a);
  const B = prep(s, t.b);
  const amp = t.amp;
  const out: Line[] = [];
  const push = (text: string, st: TextStyle, size: number, g: number) => out.push({ text, s: st, size, gap: g, h: size * (st.lh ?? lh) });
  if (!B) {
    const r = nameRows(ctx, A, s, w, k);
    r.rows.forEach((x, i) => push(x, s, r.size, i ? lg : gap));
    return out;
  }
  if (it.mode === "line") {
    const one = `${A} ${amp} ${B}`;
    const f = fitSize(ctx, one, s, s.size * k, w);
    if (f >= (s.min ?? s.size * 0.6) * k) {
      push(one, s, f, gap);
      return out;
    }
  }
  if (it.mode === "stack") {
    const ra = nameRows(ctx, A, s, w, k);
    const rb = nameRows(ctx, B, s, w, k);
    const size = Math.min(ra.size, rb.size);
    const as = it.amp ?? s;
    ra.rows.forEach((x, i) => push(x, s, size, i ? lg : gap));
    push(prep(as, amp), as, as.size * k * Math.min(1, size / (s.size * k) + 0.25), lg);
    rb.rows.forEach((x) => push(x, s, size, lg));
    return out;
  }
  // two (yoki sig‘magan line): «A» / «& B»
  const ra = nameRows(ctx, A, s, w, k);
  const rb = nameRows(ctx, `${amp} ${B}`, s, w, k);
  const size = Math.min(ra.size, rb.size);
  ra.rows.forEach((x, i) => push(x, s, size, i ? lg : gap));
  rb.rows.forEach((x) => push(x, s, size, lg));
  return out;
}

function layout(ctx: CanvasRenderingContext2D, st: Stack, t: Texts, k: number): Line[] {
  const lines: Line[] = [];
  let first = true;
  for (const it of st.items) {
    const gap = first ? 0 : (it.gap ?? 0) * k;
    if (it.k === "rule") {
      if (first) continue;
      lines.push({ rule: true, w: it.w * k, h: (it.h ?? 2) * k, color: it.color, gap });
      continue;
    }
    if (it.k === "names") {
      if (!t.a) continue;
      lines.push(...namesLines(ctx, it, t, st.w, gap, k));
      first = false;
      continue;
    }
    const text = it.k === "text" ? it.text : t[it.k];
    if (!text) continue;
    lines.push(...textLines(ctx, text, it.s, st.w, gap, k));
    first = false;
  }
  // oxirgi chiziq (rule) yolg‘iz qolmasin
  while (lines.length && "rule" in lines[lines.length - 1]) lines.pop();
  return lines;
}

const total = (ls: Line[]) => ls.reduce((s, l) => s + l.gap + l.h, 0);

function drawLine(ctx: CanvasRenderingContext2D, l: Extract<Line, { text: string }>, cx: number, top: number) {
  const s = l.s;
  ctx.font = fontStr(s, l.size);
  ctx.fillStyle = s.color;
  ctx.textBaseline = "alphabetic";
  const m = ctx.measureText("HgЙ");
  const asc = m.fontBoundingBoxAscent || l.size * 0.9;
  const desc = m.fontBoundingBoxDescent || l.size * 0.25;
  const base = top + (l.h - (asc + desc)) / 2 + asc;
  ctx.save();
  if (s.shadow) {
    ctx.shadowColor = s.shadow.color;
    ctx.shadowBlur = s.shadow.blur;
    ctx.shadowOffsetY = s.shadow.y ?? 0;
  }
  const ls = (s.ls ?? 0) * l.size;
  if (!ls) {
    ctx.textAlign = "center";
    ctx.fillText(l.text, cx, base);
  } else {
    ctx.textAlign = "left";
    const cs = chars(l.text);
    const ws = cs.map((c) => ctx.measureText(c).width);
    let x = cx - (ws.reduce((a, b) => a + b, 0) + ls * (cs.length - 1)) / 2;
    cs.forEach((c, i) => {
      ctx.fillText(c, x, base);
      x += ws[i] + ls;
    });
  }
  ctx.restore();
}

export function drawStack(ctx: CanvasRenderingContext2D, st: Stack, t: Texts) {
  let k = 1;
  let lines = layout(ctx, st, t, k);
  if (st.maxH) {
    for (let i = 0; i < 4 && total(lines) > st.maxH; i++) {
      k *= (st.maxH / total(lines)) * 0.995;
      lines = layout(ctx, st, t, k);
    }
  }
  const h = total(lines);
  let y = st.anchor === "top" ? st.y : st.anchor === "bottom" ? st.y - h : st.y - h / 2;
  const cx = st.x ?? W / 2;
  for (const l of lines) {
    y += l.gap;
    if ("rule" in l) {
      ctx.fillStyle = l.color;
      ctx.fillRect(cx - l.w / 2, y + (l.h - Math.max(1, l.h)) / 2, l.w, Math.max(1, l.h));
    } else drawLine(ctx, l, cx, y);
    y += l.h;
  }
}

/** Stacklardagi barcha shrift+matn juftlari (oldindan yuklash uchun) */
export function fontNeeds(stacks: Stack[], t: Texts): { font: string; text: string }[] {
  const out: { font: string; text: string }[] = [];
  const all = [t.guest, t.kicker, t.a, t.b, t.amp, t.date, t.venue].join(" ");
  for (const st of stacks)
    for (const it of st.items) {
      if (it.k === "rule") continue;
      const text = it.k === "names" ? `${t.a} ${t.b} ${t.amp}` : it.k === "text" ? it.text : t[it.k];
      const up = (s: TextStyle, x: string) => (s.upper ? x.toLocaleUpperCase() : x);
      out.push({ font: fontStr(it.s, 40), text: up(it.s, text || all) });
      if (it.k === "names" && it.amp) out.push({ font: fontStr(it.amp, 40), text: t.amp });
    }
  return out;
}

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.decoding = "async";
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
}

/** Surat: object-fit cover, burilish, ixtiyoriy oq-qora */
export function drawPhoto(ctx: CanvasRenderingContext2D, im: HTMLImageElement, p: PhotoSpec) {
  const [px, py] = p.pos ?? [0.5, 0.5];
  const sc = Math.max(p.w / im.naturalWidth, p.h / im.naturalHeight);
  const dw = im.naturalWidth * sc;
  const dh = im.naturalHeight * sc;
  let src: CanvasImageSource = im;
  if (p.gray) {
    // ctx.filter Safari’da yo‘q — piksel bilan
    const c = document.createElement("canvas");
    c.width = Math.round(p.w);
    c.height = Math.round(p.h);
    const g = c.getContext("2d")!;
    g.drawImage(im, (p.w - dw) * px, (p.h - dh) * py, dw, dh);
    try {
      const d = g.getImageData(0, 0, c.width, c.height);
      const a = d.data;
      for (let i = 0; i < a.length; i += 4) {
        const v = 0.2126 * a[i] + 0.7152 * a[i + 1] + 0.0722 * a[i + 2];
        a[i] = a[i + 1] = a[i + 2] = v;
      }
      g.putImageData(d, 0, 0);
    } catch {
      /* tainted — rangli qoladi */
    }
    src = c;
  }
  ctx.save();
  ctx.translate(p.cx, p.cy);
  if (p.rot) ctx.rotate((p.rot * Math.PI) / 180);
  ctx.beginPath();
  ctx.rect(-p.w / 2, -p.h / 2, p.w, p.h);
  ctx.clip();
  if (src === im) ctx.drawImage(im, -p.w / 2 + (p.w - dw) * px, -p.h / 2 + (p.h - dh) * py, dw, dh);
  else ctx.drawImage(src, -p.w / 2, -p.h / 2, p.w, p.h);
  ctx.restore();
}
