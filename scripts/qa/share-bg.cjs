/**
 * Ulashish kartasi foni (3:4, 1080×1440): node scripts/qa/share-bg.cjs [slug ...] [--base=http://localhost:8091]
 * Shablonning namuna sahifasi (/namuna/<slug>/) 540×720 (dpr 2) oynada ochiladi, birinchi kadr (ochilish sahnasi)
 * matnsiz suratga olinadi: yozuvlar, sayt tugmalari, musiqa tugmasi yashiriladi — ismlar, sana va h.k. kartada
 * brauzer canvas’ida (src/lib/shareCard) mijoz ma’lumoti bilan chiziladi.
 * Mijoz surati turadigan shablonlarda (kalit, lino, kumush, zumrad) surat o‘rni ikki marta — qora va oq rasm bilan
 * olinadi; scripts/qa/share-bg.py ikkalasidan alfa (shaffof teshik) hisoblaydi → kartada surat fon ostida chiziladi.
 * Natija: scripts/qa/out/share-<slug>-{a,b,ref}.png + share-<slug>.json → python3 scripts/qa/share-bg.py
 */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const args = process.argv.slice(2);
const base = (args.find((a) => a.startsWith("--base=")) || "--base=http://localhost:8091").slice(7);
const ALL = ["anor", "zumrad", "parvoz", "shato", "savsan", "muhr", "kalit", "sayohat", "lino", "kumush", "riviera"];
const slugs = args.filter((a) => !a.startsWith("--"));
const OUT = path.join(__dirname, "out");
fs.mkdirSync(OUT, { recursive: true });

/** Sayt elementlari (orqaga, «Shu shablonni ishlatish», musiqa) — har doim yashiriladi */
const UI = `.fixed.inset-x-0.bottom-0,button[aria-label]{display:none!important}`;
/** Matnlar — faqat fon kadrida */
const NOTEXT = `body *{color:transparent!important;text-shadow:none!important;-webkit-text-stroke:0!important}`;
/** Har shablon: qo‘shimcha CSS, surat elementi (photo — selektor, rot — burilish) */
const CFG = {
  anor: {},
  /* Zumrad: ochilish sahnasidan keyingi «muqova» (ochiq konvert, karta, polaroid) — scroll bilan ochiladi */
  zumrad: { next: 60, photo: { sel: '[class*="polaroid"] img', rot: 7 } },
  parvoz: { css: `[class*="btnNavy"]{display:none!important}` },
  shato: {},
  savsan: { css: `[class*="gateWrap"]{--o:1!important}` },
  muhr: {},
  kalit: { photo: { sel: 'img[src*="kalit/couple"]' } },
  sayohat: {},
  lino: { css: `[class*="gLine"]{display:none!important}`, photo: { sel: '[class*="gImg"]' } },
  kumush: { css: `[class*="gLine"]{display:none!important}`, photo: { sel: '[class*="gImg"]' } },
  riviera: {},
};
const px = (c) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="${c}"/></svg>`)}`;

(async () => {
  const b = await chromium.launch();
  for (const slug of slugs.length ? slugs : ALL) {
    const cfg = CFG[slug] || {};
    const ctx = await b.newContext({ viewport: { width: 540, height: 720 }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    await p.goto(`${base}/namuna/${slug}/`, { waitUntil: "networkidle" });
    await p.addStyleTag({ content: UI + (cfg.css || "") });
    if (cfg.next != null) {
      const top = await p.evaluate(() => document.querySelector('[class*="gateWrap"]').nextElementSibling.getBoundingClientRect().top + scrollY);
      for (let y = 0; y <= top; y += 200) { await p.evaluate((v) => scrollTo(0, v), y); await p.waitForTimeout(150); }
      await p.evaluate((v) => scrollTo(0, v), top + cfg.next);
    }
    await p.waitForTimeout(4500);
    // Namuna matnlari joylashuvi (kartadagi matn bloklarini joylash uchun ma’lumot)
    const texts = await p.evaluate(() =>
      [...document.querySelectorAll("body *")]
        .filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
        .map((el) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return { text: el.textContent.trim().slice(0, 60), x: r.x, y: r.y, w: r.width, h: r.height, font: s.fontFamily, size: s.fontSize, color: s.color, ls: s.letterSpacing };
        })
        .filter((t) => t.y < 720 && t.y + t.h > 0 && t.w > 1 && t.x < 540 && t.x + t.w > 0),
    );
    await p.screenshot({ path: `${OUT}/share-${slug}-ref.png` });
    await p.addStyleTag({ content: NOTEXT });
    let photo = null;
    if (cfg.photo) {
      photo = await p.evaluate(({ sel, rot }) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        el.setAttribute("data-share-photo", "");
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        // burilgan bo‘lsa — markaz bbox’dan, o‘lcham element o‘zidan
        return { cx: r.x + r.width / 2, cy: r.y + r.height / 2, w: el.offsetWidth, h: el.offsetHeight, rot: rot || 0, fit: s.objectFit, pos: s.objectPosition, filter: s.filter };
      }, cfg.photo);
      if (!photo) throw new Error(`${slug}: surat elementi topilmadi (${cfg.photo.sel})`);
      for (const [tag, c] of [["a", "#000"], ["b", "#fff"]]) {
        await p.evaluate(({ src }) => {
          const el = document.querySelector("[data-share-photo]");
          el.removeAttribute("srcset");
          el.src = src;
        }, { src: px(c) });
        await p.waitForTimeout(400);
        await p.screenshot({ path: `${OUT}/share-${slug}-${tag}.png` });
      }
    } else {
      await p.waitForTimeout(300);
      await p.screenshot({ path: `${OUT}/share-${slug}-a.png` });
    }
    fs.writeFileSync(`${OUT}/share-${slug}.json`, JSON.stringify({ slug, scale: 2, photo, texts }, null, 1));
    console.log(slug, photo ? `photo ${Math.round(photo.cx)},${Math.round(photo.cy)} ${photo.w}×${photo.h}` : "", texts.length, "texts");
    await ctx.close();
  }
  await b.close();
})();
