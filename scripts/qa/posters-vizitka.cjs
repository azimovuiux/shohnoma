/**
 * Vizitka katalog posterlari: node scripts/qa/posters-vizitka.cjs [slug|all] [baseUrl]
 *   slug    — v-noir | v-lumen | all (standart: all)
 *   baseUrl — namuna sahifasi ochiladigan server (standart: http://localhost:3142 — `npx next dev -p 3142`)
 * Har dizayn × til (uz/ru/en) × qurilma (telefon 390×845, laptop 1440×900):
 *   public/vizitka/posters/<slug>[-ru|-en]-<phone|laptop>.webp       — birinchi ekran (600×1300 / 1280×800)
 *   public/vizitka/posters/<slug>[-ru|-en]-<phone|laptop>-long.webp  — butun sahifa (eni 300 / 960)
 * Sahifa: /vizitka/namuna/<slug>/?embed=1 (yuqori «Namuna» paneli yo‘q). Uzun rasmda `position: fixed` elementlar
 * (pastki panel, suzuvchi tugma) yashiriladi — aks holda sahifa o‘rtasida qolib ketadi.
 * Taklifnoma posterlari — scripts/qa/posters.cjs (bu skript unga tegmaydi).
 */
const { chromium } = require("playwright");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const [which = "all", base = "http://localhost:3142"] = process.argv.slice(2);
const SLUGS = which === "all" ? ["v-noir", "v-lumen"] : [which];
const OUT = path.join(__dirname, "..", "..", "public", "vizitka", "posters");
fs.mkdirSync(OUT, { recursive: true });

const DEVICES = [
  // nom, viewport eni, balandligi, poster o‘lchami, uzun rasm eni
  ["phone", 390, 845, [600, 1300], 300],
  ["laptop", 1440, 900, [1280, 800], 960],
];

(async () => {
  const b = await chromium.launch();
  for (const slug of SLUGS)
    for (const [lang, pre] of [["uz", ""], ["ru", "/ru"], ["en", "/en"]]) {
      const tag = lang === "uz" ? slug : `${slug}-${lang}`;
      for (const [kind, W, H, [pw, ph], lw] of DEVICES) {
        const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: kind === "phone" ? 2 : 1 });
        const p = await ctx.newPage();
        const errors = [];
        p.on("pageerror", (e) => errors.push(e.message));
        await p.goto(`${base}${pre}/vizitka/namuna/${slug}/?embed=1`, { waitUntil: "networkidle" });
        await p.evaluate(() => document.fonts.ready);
        // `next dev` indikatori (shadow DOM) posterga tushmasin
        await p.addStyleTag({ content: "nextjs-portal{display:none!important}" });
        await p.waitForTimeout(3500); // birinchi ekran animatsiyalari tugasin
        const first = await p.screenshot();
        await sharp(first).resize(pw, ph, { fit: "cover", position: "top" }).webp({ quality: 82, effort: 6 }).toFile(path.join(OUT, `${tag}-${kind}.webp`));

        // Butun sahifa: pastgacha aylantirib barcha bo‘limlarni ochamiz, keyin tepaga qaytamiz
        const total = await p.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < total; y += Math.round(H * 0.5)) {
          await p.evaluate((v) => scrollTo(0, v), y);
          await p.waitForTimeout(160);
        }
        await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
        await p.waitForTimeout(1500);
        await p.evaluate(() => scrollTo(0, 0));
        await p.waitForTimeout(1200);
        await p.evaluate(() => {
          for (const el of document.querySelectorAll("body *")) {
            const s = getComputedStyle(el);
            if (s.position === "fixed") el.style.setProperty("display", "none", "important");
          }
        });
        await p.addStyleTag({ content: "*,*::before,*::after{animation-play-state:paused!important}" });
        await p.waitForTimeout(400);
        const long = await p.screenshot({ fullPage: true });
        await sharp(long).resize({ width: lw }).webp({ quality: 64, effort: 6 }).toFile(path.join(OUT, `${tag}-${kind}-long.webp`));
        console.log(tag, kind, "ok", errors.length ? `pageerrors: ${errors.join(" | ")}` : "");
        await ctx.close();
      }
    }
  await b.close();
})();
