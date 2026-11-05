# shohnoma.uz

O‘zbek marosimlari uchun premium taklifnoma-saytlar do‘koni. Dizayn: Figma **Shohnoma-uz** (`D0wt4iM9V6ym59nF6npes7`).

> `main` branch Plesk orqali avtomatik deploy qilinadi. Next.js versiyasi hozircha `feat/nextjs-site` branchida.

## Texnologiyalar

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4 — dizayn tokenlari `src/app/globals.css` (`@theme`)
- Shriftlar `@fontsource` orqali (Cormorant Garamond, Inter, Pinyon Script, Cinzel) — tashqi CDN kerak emas
- Ikonlar: Iconsax Linear (`src/components/icons.tsx` orqali — React 19 uchun `currentColor` bilan o‘ralgan)

## Ishga tushirish

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

`.env.example` dan `.env.local` yarating (Telegram bot — "Xabar qoldiring" formasi uchun; sozlanmasa xabarlar server logiga yoziladi).

## Tuzilma

```
src/app/(site)/page.tsx              Bosh sahifa v3 (Figma 132:16919 / 132:20890)
src/app/(site)/shablonlar/           Katalog (filtr URL'da), tezkor ko‘rish, mobil filtr
src/app/(site)/shablonlar/[slug]/    Shablon sahifasi (01)
src/app/not-found.tsx                404 (18)
src/app/api/leads/route.ts           "Xabar qoldiring" → Telegram
src/components/home/*                Bosh sahifa bo‘limlari
src/components/mockups/*             Telefon/laptop mokaplari va shablon ko‘rinishlari (HTML/CSS)
src/lib/templates.ts                 12 ta shablon (narxlar — namuna)
```

## Figma'dan eksport qilinishi kerak bo‘lgan assetlar

Hozir rasm o‘rnida vaqtinchalik bej joylar (`<Photo>`), gullar esa SVG bilan chizilgan. Eksport qilib qo‘ying:

| Asset | Figma | Qayerga |
|---|---|---|
| Gul kaskadi (fonsiz) | `137:19917` | `public/flowers/cascade.webp` → `components/home/Flowers.tsx` |
| Hikoya 1–3, Individual buyurtma, Imkoniyatlar rasmlari | Assets `32:138` | `public/images/*.webp` → `<Photo src>` |
