/**
 * Katalog posterlari: node scripts/qa/posters.cjs <slug> <HH_mobil> <HH_laptop> [baseUrl]
 * Natija: scripts/qa/out/<slug>*.png → keyin: python3 scripts/qa/posters-webp.py <slug>
 * Gate (ochilish) birinchi kadri; *-long — hero tepada, keyin butun sahifa (final eshiklar yopiq).
 * [laptopW] — laptop gate birligining kanvas eni (Savsan: ustun = mobil × 1.45 → 1440 / 1.45 = 993.103, HH_laptop = 860).
 * Savsan konverti: `--o:1` — ochilgan holat (Figma kadri); Muhr’da qo‘llanmaydi (uning birinchi kadri — yopiq konvert).
 * Muhr: birinchi kadr — yopiq konvert (Figma hero); -long da 01-bo‘lim (`openWrap`) ochiq holatda, sticky oralig‘i (`openSpacer`) olib tashlanadi.
 * Kalit: birinchi kadr — kalit teshigi (Figma hero, `--o:0`); -long da scroll bilan bog‘langan holatlar Figma kadriga keltiriladi
 * (tirqish/kapsulalar `--v:1`, titrlar `--f:1`, final teshik `--fc:1`).
 * Lino: birinchi kadr — jurnal muqovasi (`--o:1` — surat Figma masshtabida); -long da final (`--fc:1`) Figma holatida.
 * Kumush: birinchi kadr — oq-qora hero (`--o:1`); -long da plyonka lentasi (`--k:1`) va final (`--fc:1`) Figma holatida.
 * Sayohat (gorizontal scroll): birinchi kadr — 01 · Start; -long — har bekat (ekran) alohida suratga olinib, tepadan pastga
 * ketma-ket tikiladi (katalog kartasi uzun rasmni vertikal aylantiradi — gorizontal tasma u yerda ko‘rinmaydi).
 */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const [slug, hhM = "860", hhL = "920", base = "http://localhost:8091", lw = "1440"] = process.argv.slice(2);
if (!slug) throw new Error("slug kerak");
const OUT = path.join(__dirname, "out");
fs.mkdirSync(OUT, { recursive: true });
const HIDE = 'a[href*="/buyurtma/"],a[href*="/shablonlar/"],button[aria-label]{display:none!important}form button[aria-label]{display:flex!important}' + (slug === "muhr" || slug === "kalit" ? "" : '[class*="gateWrap"]{--o:1!important}');
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
      if (slug === "sayohat") {
        const n = await p.evaluate(() => +(document.querySelector("[data-stops]")?.getAttribute("data-stops") || 1));
        const shots = [];
        for (let k = 0; k < n; k++) {
          await p.evaluate((k) => scrollTo(0, k * innerHeight), k);
          await p.waitForTimeout(k ? 2000 : 600);
          shots.push((await p.screenshot()).toString("base64"));
        }
        await p.setContent(`<html><body style="margin:0;background:#c7dbf0">${shots.map((x) => `<img src="data:image/png;base64,${x}" style="display:block;width:${W}px;height:${H}px">`).join("")}</body></html>`);
        await p.waitForTimeout(300);
        await p.screenshot({ path: `${OUT}/${tag}-${kind}-long.png`, fullPage: true });
        console.log(tag, kind, "ok");
        await ctx.close();
        continue;
      }
      const total = await p.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < total; y += Math.round(H * 0.5)) { await p.evaluate((v) => scrollTo(0, v), y); await p.waitForTimeout(150); }
      await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(1500);
      await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(1500);
      const u = `min(calc(100cqw / ${UW}), calc(${H}px / ${HH}))`;
      await p.addStyleTag({ content: `[class*="gateWrap"]{height:${H}px!important;margin-bottom:0!important;--k:0px!important;--q:0!important;--gy:0px!important;--u:${u}!important}[class*="_gate__"]{position:relative!important;height:${H}px!important;transform:none!important}[class*="finalDoor"],[class*="finalFlap"]{transform:none!important;opacity:1!important}[class*="openWrap"]{--o:1!important}[class*="openSpacer"]{display:none!important}` + (slug === "kalit" ? '[class*="gateWrap"]{--o:0!important;--sh:1!important;--sp:1!important}[class*="finalWrap"]{--fc:1!important}[data-v]{--v:1!important}[data-f]{--f:1!important}' : slug === "lino" ? '[class*="finalWrap"]{--fc:1!important}' : slug === "kumush" ? '[class*="finalWrap"]{--fc:1!important}[class*="filmWrap"]{--k:1!important}' : "") });
      await p.waitForTimeout(800);
      await p.screenshot({ path: `${OUT}/${tag}-${kind}-long.png`, fullPage: true });
      console.log(tag, kind, "ok");
      await ctx.close();
    }
  }
  await b.close();
})();
