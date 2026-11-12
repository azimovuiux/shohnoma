# Shablon yasash — qat’iy qoidalar (Anor → Shato tajribasidan)

Bu ro‘yxat mijozning barcha e’tirozlaridan yig‘ilgan. Har bir band — bir marta aytilgan va qayta aytilmasligi kerak bo‘lgan talab.
Yangi shablon **bitta yurishda** tugatiladi: yasash → Figma bilan o‘lchab solishtirish → barcha o‘lchamlarda test → posterlar → deploy.
Yarim tayyor ishni «tayyor» deb topshirma; tekshirilmagan narsani ochiq ayt.

## 0. Manba va tartib
- **Figma — asosiy manba.** Fayl `D0wt4iM9V6ym59nF6npes7`, sahifa Templates `223:4528`. Har shablon uchun: Mobil (390), Laptop (1440), Assets, Dress-kod kartasi, Musiqa tugmasi, «Motion — …» kartalari, «Nazorat · NN» ro‘yxati.
- Avval **hamma** «Motion» kartalarini va «Nazorat» ro‘yxatini o‘qi, keyin kod yoz.
- Har bo‘limning **x, y, width, height** qiymatlarini `get_design_context`/metadata’dan ol. Taxmin qilma (Shato’da hero 920 o‘rniga 1020 qilingan edi — xato).
- Figma’dagi elementni (muhr, bezak, matn) o‘zboshimchalik bilan olib tashlama yoki almashtirma — Motion kartasi boshqacha desa ham, oxirgi (statik) holat Figma kadri bilan bir xil bo‘lsin. Faqat matn ustma-ust tushsa yoki qoidaga zid bo‘lsa o‘zgartir va hisobotda ayt.
- Namuna kod: eng yangi shablon (`src/components/templates/shato/`, `parvoz/`). Umumiy: `templates/shared/{hooks.ts,runtime.tsx,shared.module.css}`.

## 1. O‘lcham va moslashuv
- Birlik: `--u` — mobil `calc(100cqw / 390)`, laptop `calc(100cqw / 1440)`; laptop = konteyner ≥ 960 (`useWide`). Hamma o‘lcham `U(n)` orqali.
- 360 / 390 / 412 / 768 / 1024 / 1280 / 1440 / 1920 / 2560 da: hech narsa kesilmaydi, gorizontal scroll yo‘q, yon tomonda bo‘sh oq tasma yo‘q (fon to‘liq kenglikda).
- **Bo‘lim balandliklari demo ma’lumot bilan Figma’ga teng (±6px).** Har bo‘limni o‘lchab, jadval bilan solishtir (§9).
- Bezak keyingi/oldingi bo‘limga kirib tursa (Figma’da manfiy `y`), aynan shunday qil. Rasm rasm ustiga tushishi mumkin; **matn hech qachon** rasm yoki matn ustiga tushmaydi.

## 2. Ochilish (gate / hero)
- **Bosib ochish yo‘q.** Scroll bilan, rAF lerp (Parvoz/Shato `Gate`). Wrapper ≈ 2.3 ekran, keyingi bo‘lim `--gy` bilan chocksiz ulanadi — bo‘sh ekran/tasma qolmaydi.
- Sahna **bir ekranga sig‘adi**: `--u: min(calc(100cqw / W), calc(100svh / HH))`, bunda `HH` = Figma’dagi hero kadr balandligi.
- Sahna **pastki chetga bog‘lanadi**: `Y(y) = calc(100% - U(HH - y))` (baland ekranda tepada fon ko‘payadi).
- Figma’da keyingi bo‘limning bezagi hero pastini yopsa (masalan, butalar), uni gate ichida ham **sahifa birligida** (`calc(100cqw / W * n)`) chiz — ulanishda aynan ustma-ust tushadi.
- `withGate = !embedded` — yangi tabdagi preview ham ochilishni ko‘rsatadi. Embedded (buyurtma/kabinet mokapi): **harakatsiz birinchi kadr**, scroll tinglovchisiz, `--u: calc(100cqw / W)`, balandlik `U(HH)`, `marginBottom: 0`.
- `usePreload` + `Loader`; musiqa faqat `!embedded`.
- **Eshik/qopqoq/tabaqa rasmlari:** rasmning yo‘nalishini ko‘zing bilan tekshir (lo‘la qaysi tomonda, ark shaklining baland tomoni o‘rtadami). Ochilish — haqiqiy 3D `rotateY` (lo‘la atrofida, perspective 1400, ease `cubic-bezier(.65,0,.35,1)`), oxirgi holat Figma’dagi ochiq holatga o‘xshasin. Yopiladigan final ham shu qoidaga bo‘ysunadi.
- **«Sharpa» yo‘q:** ochilishda ichki kontent (karta) fon orqasidan yarim shaffof ko‘rinib turmasin — fonning so‘nishi qisqa bo‘lsin (≤ 0.06 `--o`) va kontent ochilgan teshikdan ko‘rinadigan paytga to‘g‘ri kelsin (Muhr’da 0.38→0.55 uzoq so‘nish xunuk «sharpa» berdi).

## 3. Animatsiya
- Paydo bo‘lish **har element uchun alohida** (`useReveal`: scroll’da rect tekshiruvi + sahifa oxirida qolganlarning hammasi ochiladi). Butun bo‘lim birdan chiqmaydi. Ekrandan yon tomonga chiqib turgan bezaklar ham ochilishi shart.
- Dinamik, lekin sokin: stagger, blur→0, y-siljish, chizilish. Faqat `transform`/`opacity`, 60fps; `prefers-reduced-motion`.
- Osilib turgan bezaklar (girlyanda, bant, liliya) **tebranmaydi/titramaydi**.
- `mix-blend-mode: multiply` kesilgan rasmlarda **yo‘q**.

## 4. Matn
- Oddiy, tushunarli so‘zlar. Metafora faqat ochilishda bir marta; keyin real nomlar: Sana, Vaqt, Manzil, Kun tartibi, Dress-kod, Javob…
- Eyebrow, «01 ·» kabi bezak raqamlari, uzun tushuntirishlar, AI-uslubidagi to‘ldiruvchi matn — **yo‘q**.
- Figma’dagi qisqa oddiy matnni (masalan, dress-kod ostidagi bir qator) **tashlab ketma**. Almashtirsang — hisobotda ayt.
- Sarlavhalar 360 da sig‘adi (`Fit`), uzun matnlar 2 qatorga qisqartiriladi (`clamp2`). Ruscha/inglizcha uzunroq — tekshir.
- **Old-style raqamlar** (Cormorant va h.k.: 3,4,5,7,9 pastga tushadi): `overflow:hidden` + `line-height:1` bo‘lsa, `padding: .12em 0 .3em; margin: -.12em 0 -.3em`.

## 5. Dinamik ma’lumot hech qachon buzmaydi
- Dastur 0..8 band, uzun nom/izoh; ixtiyoriy bo‘limlar (dress-kod, hikoya, suratlar, iqtibos) bo‘sh bo‘lsa toza yo‘qoladi; 0–3+ surat; ikkinchi ism yo‘q (tug‘ilgan kun); uzun ism/manzil; `rsvpEnabled=false`.
- Ixtiyoriy bo‘lim olib tashlansa, qo‘shni bo‘lim bezagi matn ustiga tushmasin (OVER/ROOM «tail» mexanizmi).

## 6. Funksiyalar (Parvoz/Shato’dan nusxa)
- Sanoq: `useCountUp`/raqam-raqam (miltillamaydi), birliklar `timerUnits(lang)`.
- Musiqa: `useMusic`/`MusicButton`, birinchi teginishda; standart trek `musicSrc(template, data)`.
- Javob formasi: `/api/i/<slug>/rsvp` POST/PATCH, rahmat holati, «javobni o‘zgartirish».
- `?m=Ism` — shaxsiy murojaat.
- 3 til: hamma mehmon matni `useT()` orqali; `src/lib/i18n/{ru,en}/invite.ts` (kalit = aniq o‘zbekcha matn). Sana: «12-sentabr» / «12 сентября» / «12 September». Demo: `X_DEMO`, `X_DEMO_RU`, `X_DEMO_EN`; demo ismlar faqat demo rejimda tarjima qilinadi, mijoz ma’lumoti hech qachon.

## 7. Ro‘yxatga qo‘shish
- `src/lib/templates.ts`: yozuv (raqam, slug, nom, `ceremony` — taklifnoma turi, `ceremonies` — kategoriya sluglari, uslub, narx 199000/249000, palitra/tema, `description`/`Ru`/`En` — oddiy til, `fields`), `PHOTO_SLOTS[slug]`.
- `src/components/order/live.ts` → `hasCustomDesign`; `src/components/invitation/InvitationSite.tsx` → `CUSTOM` ro‘yxati va `designSlug === "<slug>"`.
- Assetlar: `public/templates/<slug>/` — Figma’dan yuklab, Pillow bilan webp, uzun tomoni ≤1600, q≈82, alfa saqlanadi. «FONINI OLIB TASHLANG» deb belgilanganlar — fonsiz.

## 8. Posterlar (katalog kartasi)
- `<slug>-phone.webp` 600×1300 (390×845, dpr 600/390), `<slug>-laptop.webp` 1280×800 (1440×900 dan) — birinchi ekran; `a[href*="/buyurtma/"],a[href*="/shablonlar/"]`, orqaga va musiqa tugmalari yashiriladi.
- `-long` (300 / 960 kenglik, q≈64): **hero bilan boshlanadi**, keyin qolgan sahifa; final eshiklari yopiq holatda.
- `-ru-` va `-en-` to‘plamlari `/ru/namuna/<slug>/`, `/en/namuna/<slug>/` dan. Skript: `node scripts/qa/posters.cjs <slug> <HH_mobil> <HH_laptop>` → `python3 scripts/qa/posters-webp.py <slug>`.

## 9. Test protokoli (o‘zing qilasan, natijani o‘zing ko‘rasan)
1. Xizmatlar ko‘pincha o‘chib qoladi: `pgrep apache2 || apache2ctl start`, `pgrep mysqld || (mysqld_safe --user=mysql &)`.
2. Build: `npx tsc --noEmit -p . && npm run dist && rsync -a --delete --exclude .env --exclude uploads --exclude storage dist/ /var/www/shohnoma/`. Tez iteratsiya: `npx next dev -p 3005` (build oldidan to‘xtat).
3. **Figma solishtiruvi:** `get_screenshot` (to‘liq kadr, `maxDimension` = asl balandlik) mobil va laptop; bizniki — viewport `W×HH`, gate `HH` ga majburlangan, butun sahifa. 1100px tasmalarga bo‘lib yonma-yon qo‘y va **har birini ko‘r**. Bo‘lim balandliklari jadvali: Figma vs DOM.
4. Gate: 7 o‘lcham × scroll 0 / 0.5 / 1 / 1.3 / 1.6 ekran kadrlari.
5. Avtomatik tekshiruv: gorizontal overflow, viewport’dan chiqqan matn, matn-matn ustma-ust tushishi — uz/ru/en, 360/412/1024/1920.
6. Jonli og‘ir ma’lumot: DB `shohnoma_e2e`, `mysql --default-character-set=utf8mb4` (aks holda harflar buziladi), test buyurtma `lvnh89g91q908ue5s9fdp0dq` / `bekzod-malika`; keyin **asliga qaytar**.
7. Mokap (embedded): admin cookie `sh_session=admtok123456789`, qoralama `owknwvrpj1b918kskthw472q` → `/buyurtma/<id>/marosim/` da ochilishning birinchi kadri ko‘rinsin; keyin asliga qaytar.
8. Sahifa xatolari (`pageerror`, hydration #418) — nol.

## 10. Deploy
- Commit oldidan `git status` — barcha o‘zgargan va **yangi** fayllar qo‘shilganini tekshir (`php/api/lib/templates.json` gitignore’da — qo‘shilmaydi).
- Commit izi: `Co-Authored-By` va `Claude-Session` qatorlari. `main` ga ff-merge, `main` va `feat/nextjs-site` ni push, `origin/deploy` da «Deploy <sha>» chiqquncha kut. Foydalanuvchi Plesk’da «Получить сейчас» bosadi.

## 11. Saytning umumiy qoidalari
- Bitta xato aytilsa — xuddi shunday xatolarni **hamma joyda** tuzat.
- Ish sahifalarida header’da landing havolalari yo‘q; tasdiqlash — `confirmDialog` (brauzer `confirm` emas); tugmalar guruhi `Field group` ichida.
- Brauzerda `window`dan o‘qiladigan ro‘yxatlar (shablonlar, kategoriyalar) — `useSyncExternalStore` bilan (hydration xatosi bo‘lmasin).
- Maxfiy kalitlar faqat server `.env` yoki Admin → Sozlamalar’da; chatda so‘ralmaydi, commit qilinmaydi.
- Foydalanuvchi bilan o‘zbekcha, qisqa va aniq; tekshirilmagan narsani «tekshirilmadi» deb ayt.
