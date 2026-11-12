/**
 * Katalog posterlari: node scripts/qa/posters.cjs <slug> <HH_mobil> <HH_laptop> [baseUrl]
 * Natija: scripts/qa/out/<slug>*.png → keyin: python3 scripts/qa/posters-webp.py <slug>
 * Gate (ochilish) birinchi kadri; *-long — hero tepada, keyin butun sahifa (final eshiklar yopiq).
 * [laptopW] — laptop gate birligining kanvas eni (Savsan: ustun = mobil × 1.45 → 1440 / 1.45 = 993.103, HH_laptop = 860).
 * Savsan konverti: `--o:1` — ochilgan holat (Figma kadri); Muhr’da qo‘llanmaydi (uning birinchi kadri — yopiq konvert).
 * Muhr: birinchi kadr — yopiq konvert (Figma hero); -long da 01-bo‘lim (`openWrap`) ochiq holatda, sticky oralig‘i (`openSpacer`) olib tashlanadi.
 */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const [slug, hhM = "860", hhL = "920", base = "http://localhost:8091", lw = "1440"] = process.argv.slice(2);
if (!slug) throw new Error("slug kerak");
const OUT = path.join(__dirname, "out");
fs.mkdirSync(OUT, { recursive: true });
const HIDE = 'a[href*="/buyurtma/"],a[href*="/shablonlar/"],button[aria-label]{display:none!important}form button[aria-label]{display:flex!important}' + (slug === "muhr" ? "" : '[class*="gateWrap"]{--o:1!important}');
(async () => {
  const b = await chromium.launch();
  for (const [lang, pre] of [["uz", ""], ["ru", "/ru"], ["en", "/en"]]) {
    const tag = lang === "uz" ? slug : `${slug}-${lang}`;
    for (const [kind, W, H, dpr, HH, UW] of [["phone", 390, 845, 600 / 390, +hhM, 390], ["laptop", 1440, 900, 1280 / 1440, +hhL, +lw]]) {
      const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dpr });
      const p = await ctx.newPage();
      await p.goto(`${base}${pre}/namuna/${slug}/`, { waitUntil: "networkidle" });
      await p.addStyleTag({ content: HIDE });
      await p.waitForTimeout(4200);
      await p.addStyleTag({ content: '[class*="digit"]{animation:none!important}' });
      await p.screenshot({ path: `${OUT}/${tag}-${kind}.png` });
      const total = await p.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < total; y += Math.round(H * 0.5)) { await p.evaluate((v) => scrollTo(0, v), y); await p.waitForTimeout(150); }
      await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(1500);
      await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(1500);
      const u = `min(calc(100cqw / ${UW}), calc(${H}px / ${HH}))`;
      await p.addStyleTag({ content: `[class*="gateWrap"]{height:${H}px!important;margin-bottom:0!important;--k:0px!important;--q:0!important;--gy:0px!important;--u:${u}!important}[class*="_gate__"]{position:relative!important;height:${H}px!important;transform:none!important}[class*="finalDoor"],[class*="finalFlap"]{transform:none!important;opacity:1!important}[class*="openWrap"]{--o:1!important}[class*="openSpacer"]{display:none!important}` });
      await p.waitForTimeout(800);
      await p.screenshot({ path: `${OUT}/${tag}-${kind}-long.png`, fullPage: true });
      console.log(tag, kind, "ok");
      await ctx.close();
    }
  }
  await b.close();
})();
