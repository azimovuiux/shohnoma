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
const ALL = ["anor", "zumrad", "parvoz", "shato", "savsan", "muhr", "kalit", "sayohat", "lino", "kumush", "riviera", "ertak", "farmon", "sandiq", "sovga", "malika", "sham", "koinot", "marvarid", "bilet", "taqvim", "sammit", "tong", "qozon", "lagan", "oltin", "xotira", "gulshan", "archa"];
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
  /* Ertak: yopiq ertak kitobi — muqovadagi yozuvlar kartada chiziladi (yulduzchalar fonda qoladi) */
  ertak: { css: `nextjs-portal{display:none!important}` },
  /* Farmon: o‘ralgan farmon (Figma 00) — toj, o‘ram, burchaklar fonda; «Shahzoda …ning» / «sunnat to‘yi» / sana kartada chiziladi */
  farmon: { css: `nextjs-portal{display:none!important}` },
  /* Sandiq: yopiq sandiq (Figma 00) — atlas chiziqlari, iliq nur (nafas animatsiyasi to‘xtatiladi), sandiq va ajratgich fonda;
   * «…ning» / «sunnat to‘yi» / sana / oila kartada chiziladi */
  sandiq: { css: `nextjs-portal{display:none!important}[class*="_glow__"]{animation:none!important;opacity:1!important}` },
  /* Sovg‘a: pudra fonda atlas bantli sovg‘a qutisi va kumush uchqunlar (Figma 00); «…ning» / «tug‘ilgan kuni» / sana kartada chiziladi */
  sovga: { css: `nextjs-portal{display:none!important}` },
  /* Malika: yopiq atlas pardalar, yorug‘lik, marvarid gerb va tiara (Figma 00; yaltiroq va «nafas» to‘xtatiladi);
   * ism (gerb ichida) / taklif turi / sana / joy kartada chiziladi */
  malika: { css: `nextjs-portal{display:none!important}[class*="_shine"]{display:none!important}[class*="_breath"]{animation:none!important}` },
  /* Sham: tungi ko‘k fon, sham nuri va yonib turgan sham (Figma 00; olov tebranishi va nur «nafasi» to‘xtatiladi);
   * «Yaqinda kimdir» o‘rnida taklif turi, yosh qatori o‘rnida ism, pastki qator o‘rnida sana va joy — kartada chiziladi */
  sham: { css: `nextjs-portal{display:none!important}[class*="_flick"],[class*="_gGlow"]{animation:none!important}` },
  /* Koinot: tungi osmon, yulduzlar (miltillash to‘xtatiladi), start nuri, raketa va uchish tutuni (Figma 00); sanoq halqasi va oy
   * yashiriladi — ularning o‘rnida kartada mehmon / taklif turi / ism / sana / joy chiziladi */
  koinot: { css: `nextjs-portal{display:none!important}[class*="_tw"]{animation:none!important}[class*="_count"],[class*="_gIn"][class*="_art"]{display:none!important}` },
  /* Marvarid: pudra-pushti fon, tepada marvarid shoda, atlas lenta va bant (Figma 00; shoda yaltirog‘i olib tashlanadi);
   * mehmon (shoda ichida) / taklif turi / ism (ism o‘rnida) / sana va joy (sana o‘rnida) — kartada chiziladi */
  marvarid: { css: `nextjs-portal{display:none!important}[class*="_shine"]{display:none!important}` },
  /* Bilet: sahna nuri, tirqishdan chiqib turgan chipta (yozuvlarsiz: gradientli «a» ham yashiriladi), ko‘k tirqish chizig‘i (Figma 00);
   * mehmon (kompaniya nomi o‘rnida) / taklif turi, kompaniya, tadbir (chipta ichida) / sana va joy (tirqish ostida) — kartada chiziladi */
  bilet: { css: `nextjs-portal{display:none!important}[class*="_ga_"]{background:none!important}[class*="_gScan"],[class*="_tDiv"]{display:none!important}` },
  /* Taqvim: qorong‘i fon, lime nur, shisha plitkalar va lime plitka (Figma 00) — plitka ochilish harakatidagidek kattalashtirilgan panel
   * (--ex 0.4; nur pulsatsiyasi to‘xtatiladi): mehmon (panel tepasida) / taklif turi, kompaniya, tadbir (panel ichida) / sana va joy (panel ostida) — kartada */
  taqvim: { css: `nextjs-portal{display:none!important}[class*="gateWrap"]{--ex:0.4!important}[class*="_gHalo"]{display:none!important}` },
  /* Sammit: to‘r, uchqunlar, xrom tanga va «12 mart» shisha katagi (Figma 00); qizil shisha chapga-pastga suriladi (kartada matn ustuniga
   * tegmasin): mehmon (tanga tepasida) / sana (shisha katak ichida) / taklif turi, tadbir, kompaniya, joy (katak ostida) — kartada */
  /* Tong: tungi osmon, yulduzlar (miltillash to‘xtatiladi), ufq chizig‘i, ufqdan bosh ko‘targan quyosh va yer (Figma 00):
   * mehmon (osmon tepasida) / taklif turi va ismlar (osmonda, quyosh nuridan yuqorida) / sana va joy (yerda, sarlavha o‘rnida) — kartada */
  tong: { css: `nextjs-portal{display:none!important}[class*="_tw"]{animation:none!important}` },
  /* Qozon: qorong‘i ko‘mir fon, qopqoqli qozon va chokdagi guruch donlari (Figma 00); bug‘ yashiriladi — uning o‘rnida kartada
   * mehmon / taklif turi / bola ismi / sana va joy chiziladi (matn qopqoq va qozonga tegmaydi) */
  qozon: { css: `nextjs-portal{display:none!important}[class*="_gSteam"]{display:none!important}` },
  /* Lagan: oq fonda naqshli lagan va ikki koshin chiziq (Figma 00; marquee to‘xtatiladi) — mehmon va taklif turi lagandan yuqorida,
   * ismlar, sana va joy lagandan pastda chiziladi (matn lagan va koshin chiziqlarga tegmaydi) */
  lagan: { css: `nextjs-portal{display:none!important}[class*="_kTrack"],[class*="_spin"]{animation:none!important}` },
  /* Oltin: qorong‘ida oltin halqa (Figma 00); «60» / «yubiley» / oila nomi yashiriladi (yosh mijozga qarab o‘zgaradi), barglar burchaklarga
   * suriladi — kartada mehmon (tepada), taklif turi (halqa ustida), ism (halqa ichida), sana va joy (halqa ostida) chiziladi */
  oltin: { css: `nextjs-portal{display:none!important}[class*="_gNum"],[class*="_gFam"]{display:none!important}[data-leaf="a"]{translate:calc(var(--u)*-126) calc(var(--u)*83)}[data-leaf="b"]{translate:calc(var(--u)*127) calc(var(--u)*213)}` },
  /* Xotira: kulrang fonda uchta oq rom taxlami (Figma 00) — namuna suratlari o‘rnida bo‘sh surat qog‘ozi (mijozga begona suratlar
   * chiqmaydi); «70» va «yillik yubiley» yashiriladi — kartada mehmon, taklif turi (taxlam ustida), ism (yuqoridagi rom ichida),
   * sana va joy (taxlam ostida) chiziladi */
  xotira: { css: `nextjs-portal{display:none!important}[class*="_sImg"]{visibility:hidden!important}[class*="_sIn"]{background:linear-gradient(160deg,#f6f6f7 0%,#e6e6e9 100%)!important}[class*="_gNum"],[class*="_gWord"],[class*="_copy"]{display:none!important}` },
  /* Gulshan: zumrad fonda gul to‘dasi (Figma 00); medalyon, «55» va «yubiley» yashiriladi (yosh mijozga qarab o‘zgaradi, uzun ism
   * medalyonga sig‘maydi) — kartada mehmon (tepada), taklif turi va ism (gul ostida), oltin chiziq o‘rnida sana va joy chiziladi */
  gulshan: { css: `nextjs-portal{display:none!important}[class*="_morph"],[class*="_gNum"],[class*="_gWord"]{display:none!important}` },
  /* Archa: to‘q ko‘k fonda ipda osilgan sharlar va qor uchqunlari (Figma 00); yog‘ayotgan qor zarralari, pastdagi hero ipi va o‘rtadagi
   * uchta qor uchquni yashiriladi (matn ustidan o‘tmasin) — kartada mehmon, taklif turi, tadbir nomi, kompaniya, sana va joy chiziladi */
  archa: { css: `nextjs-portal{display:none!important}[class*="_fall_"]{display:none!important}[class*="_gate__"]>span.absolute,[class*="_gate__"]>[class*="_gSnow"]:nth-child(4),[class*="_gate__"]>[class*="_gSnow"]:nth-child(5),[class*="_gate__"]>[class*="_gSnow"]:nth-child(6){display:none!important}` },
  sammit: { css: `nextjs-portal{display:none!important}[class*="_gFlyL"]>img{transform:translate(calc(var(--u)*-200),calc(var(--u)*40))!important}` },
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
