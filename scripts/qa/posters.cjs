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
 * Riviera: birinchi kadr — yopiq darvoza-karta (Figma 00, `--o:0`); -long da hero (`openWrap`) ochiq holatda, final (`--fc:1`) va
 * «Kadrlar» portreti (`--pc:1`, parallaks 0) Figma holatida.
 * Ertak: birinchi kadr — yopiq ertak kitobi (Figma 00, `--o:0`); -long da hero (`openWrap`) ochiq (parallaks 0), punktir yo‘l
 * to‘liq chizilgan (`--dp:1`), final tungi sahna (`--fc:1`); yulduz miltillashi va quyosh «nafasi» to‘xtatiladi.
 * Farmon: birinchi kadr — o‘ralgan farmon (Figma 00, `--o:0`); -long da hero (`openWrap`) ochiq farmon, kun tartibi chizig‘i to‘la
 * (`--dp:1`), final (`--fc:1`) Figma holatida; taymer sakkizburchaklarining aylanishi to‘xtatiladi, 00/01 chok rombi kesilmaydi.
 * Sandiq: birinchi kadr — yopiq sandiq (Figma 00, `--o:0`); -long da hero (`openWrap`) ochiq sandiq va shahzoda surati (`--o:1`),
 * final (`--fc:1`) — ochiq sandiq Figma holatida; nur «nafasi» to‘xtatiladi.
 * Sovg‘a: birinchi kadr — bantli yopiq sovg‘a qutisi (Figma 00, `--o:0`); -long da hero (`openWrap`, `--o:1`) — shar raqamlar, portret,
 * ism; final (`--fc:1`) — sharlar va bant Figma holatida.
 * Malika: birinchi kadr — yopiq atlas pardalar, gerb va tiara (Figma 00, `--o:0`); -long da hero (`openWrap`, `--o:1`) — portret va ism,
 * final (`--fc:1`) — pardalar Figma holatida; yaltiroq, yorug‘lik «nafasi», yurak urishi va play pulsatsiyasi to‘xtatiladi.
 * Sham: birinchi kadr — qorong‘ida yonib turgan sham (Figma 00, `--o:0`; olov tebranishi va nur «nafasi» to‘xtatiladi); -long da hero
 * (`openWrap`, `--o:1`) — katta yosh raqami, surat va ism; final (`--fc:1`) — shamlar yongan, konfetti Figma holatida; chok konfettisi parallakssiz.
 * Koinot: birinchi kadr — start maydonidagi raketa, sanoq halqasida «3» (Figma 00, `--o:0`; yulduz miltillashi to‘xtatiladi); -long da hero
 * (`openWrap`, `--o:1`) — illyuminatorda surat, ism va yosh; final (`--fc:1`) — raketa va kosmonavt Figma holatida; parallaks 0, suzish to‘xtatiladi.
 * Marvarid: birinchi kadr — atlas lenta va bant bilan bog‘langan pushti sahna (Figma 00, `--o:0`; marvarid yaltirog‘i yashiriladi);
 * -long da hero oddiy bo‘lim (sticky emas), final (`--fc:1`) — sham yongan, marvarid shoda Figma holatida; parallaks 0, suzish to‘xtatiladi.
 * Bilet: birinchi kadr — sahna nuri, tirqishdan chiqib turgan chipta (Figma 00, `--o:0`); -long da hero chipta yirtilmagan (`--tear:0`),
 * final (`--fc:1`) — chipta qoldig‘i Figma holatida; suzish, yaltiroq va nur pulsatsiyasi to‘xtatiladi.
 * Taqvim: birinchi kadr — qorong‘ida shisha plitkalar va lime «18 fevral» plitkasi (Figma 00, `--o:0`; nur pulsatsiyasi to‘xtatiladi);
 * -long da hero — kalendar to‘ri yig‘ilgan, tadbir plitkalari ochilgan; final (`--fc:1`) — ikki sana plitkasi yongan (Figma holati).
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
const HIDE = 'a[href*="/buyurtma/"],a[href*="/shablonlar/"],button[aria-label]{display:none!important}form button[aria-label]{display:flex!important}' + (slug === "muhr" || slug === "kalit" || slug === "riviera" || slug === "ertak" || slug === "farmon" || slug === "sandiq" || slug === "sovga" || slug === "malika" || slug === "sham" || slug === "koinot" || slug === "marvarid" || slug === "bilet" || slug === "taqvim" ? "" : '[class*="gateWrap"]{--o:1!important}');
(async () => {
  const b = await chromium.launch();
  for (const [lang, pre] of [["uz", ""], ["ru", "/ru"], ["en", "/en"]]) {
    const tag = lang === "uz" ? slug : `${slug}-${lang}`;
    for (const [kind, W, H, dpr, HH, UW] of [["phone", 390, 845, 600 / 390, +hhM, 390], ["laptop", 1440, 900, 1280 / 1440, +hhL, +lw]]) {
      const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dpr });
      const p = await ctx.newPage();
      // Malika: pleyer kartasi Figma holatida (1:12 / 3:45, to‘xtatilgan) — musiqa fayli yuklanmaydi
      if (slug === "malika") await p.route("**/files/music/**", (r) => r.abort());
      await p.goto(`${base}${pre}/namuna/${slug}/`, { waitUntil: "networkidle" });
      await p.addStyleTag({ content: HIDE });
      await p.waitForTimeout(4200);
      await p.addStyleTag({ content: '[class*="digit"]{animation:none!important}' });
      if (slug === "sham") { await p.addStyleTag({ content: '[class*="_flick"],[class*="_gGlow"]{animation:none!important}' }); await p.waitForTimeout(200); }
      if (slug === "koinot") { await p.addStyleTag({ content: '[class*="_tw"],[class*="_bob"],[class*="_wave"],[class*="_spin"]{animation:none!important}' }); await p.waitForTimeout(200); }
      if (slug === "marvarid") { await p.addStyleTag({ content: '[class*="_shine"]{display:none!important}[class*="_float"],[class*="_flick"]{animation:none!important}' }); await p.waitForTimeout(200); }
      if (slug === "bilet") { await p.addStyleTag({ content: '[class*="_float"],[class*="_pulse"],[class*="_ga_"]{animation:none!important}' }); await p.waitForTimeout(200); }
      if (slug === "taqvim") { await p.addStyleTag({ content: '[class*="_gHalo"]{animation:none!important}' }); await p.waitForTimeout(200); }
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
      await p.addStyleTag({ content: `[class*="gateWrap"]{height:${H}px!important;margin-bottom:0!important;--k:0px!important;--q:0!important;--gy:0px!important;--u:${u}!important}[class*="_gate__"]{position:relative!important;height:${H}px!important;transform:none!important}[class*="finalDoor"],[class*="finalFlap"]{transform:none!important;opacity:1!important}[class*="openWrap"]{--o:1!important}[class*="openSpacer"]{display:none!important}` + (slug === "kalit" ? '[class*="gateWrap"]{--o:0!important;--sh:1!important;--sp:1!important}[class*="finalWrap"]{--fc:1!important}[data-v]{--v:1!important}[data-f]{--f:1!important}' : slug === "lino" ? '[class*="finalWrap"]{--fc:1!important}' : slug === "kumush" ? '[class*="finalWrap"]{--fc:1!important}[class*="filmWrap"]{--k:1!important}' : slug === "riviera" ? '[class*="finalWrap"]{--fc:1!important}[data-pc]{--pc:1!important;--py:0px!important}[class*="openWrap"]>*{position:relative!important}' : slug === "ertak" ? '[class*="finalWrap"]{--fc:1!important}[data-path]{--dp:1!important}[class*="openWrap"]>*{position:relative!important;--hs:0px!important}[class*="fStar"] img,[class*="ring"]{animation:none!important}' : slug === "farmon" ? '[class*="finalWrap"]{--fc:1!important}[data-path]{--dp:1!important}[class*="openWrap"]>*{position:relative!important}[class*="_gate__"]{overflow:visible!important}[class*="_spin__"]{animation:none!important}' : slug === "sandiq" ? '[class*="finalWrap"]{--fc:1!important}[class*="openWrap"]>*{position:relative!important}[class*="_glow__"]{animation:none!important}' : slug === "sovga" ? '[class*="finalWrap"]{--fc:1!important}[class*="openWrap"]>*{position:relative!important}' : slug === "malika" ? '[class*="finalWrap"]{--fc:1!important}[class*="openWrap"]>*{position:relative!important}[class*="_shine"],[class*="_breath"],[class*="_play_"]::after,[data-a="heart"]{animation:none!important}button[class*="_play_"][aria-label]{display:block!important}[class*="_pauseIco_"]{opacity:0!important}[class*="_playIco_"]{opacity:1!important}' : slug === "sham" ? '[class*="finalWrap"]{--fc:1!important}[class*="openWrap"]>*{position:relative!important}[data-px]{--py:0px!important}[class*="_flick"],[class*="_gGlow"],[class*="_breath"]{animation:none!important}' : slug === "koinot" ? '[class*="finalWrap"]{--fc:1!important}[class*="openWrap"]>*{position:relative!important}[data-px]{--py:0px!important;--pr:0deg!important}[class*="_tw"],[class*="_bob"],[class*="_wave"],[class*="_spin"],[class*="_flick"]{animation:none!important}' : slug === "marvarid" ? '[class*="finalWrap"]{--fc:1!important}[data-px]{--py:0px!important}[class*="_shine"]{display:none!important}[class*="_float"],[class*="_flick"]{animation:none!important}' : slug === "bilet" ? '[class*="finalWrap"]{--fc:1!important}[class*="gateWrap"]{--o:0!important;--tp:0!important;--tf:0!important;--df:0!important;--sg:0!important}[class*="_tStub"]{--tear:0!important}[class*="_float"],[class*="_pulse"],[class*="_ga_"]{animation:none!important}' : slug === "taqvim" ? '[class*="finalWrap"]{--fc:1!important}[class*="gateWrap"]{--o:0!important;--ex:0!important;--w:0!important;--dk:1!important}[class*="_gHalo"]{animation:none!important}' : "") });
      await p.waitForTimeout(800);
      await p.screenshot({ path: `${OUT}/${tag}-${kind}-long.png`, fullPage: true });
      console.log(tag, kind, "ok");
      await ctx.close();
    }
  }
  await b.close();
})();
