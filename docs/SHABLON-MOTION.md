# Shohnoma — taklifnoma shablonlari: yo‘riqnoma va animatsiya rejasi

> Bu hujjat — **yo‘riqnoma**, qat’iy qoida emas. Asosiy manba — Figma dizayni (`D0wt4iM9V6ym59nF6npes7` → **Templates** `223:4528`).
> Animatsiya raqamlari boshlang‘ich nuqta: amalda sinab ko‘rib, yaxshiroq variant tanlanadi. Maqsad — silliq, sifatli, “wow” tajriba.

## 1. Umumiy qoidalar
- Har bir yangi shablon oldingisidan yaxshiroq; kompozitsiya markaz o‘qida muvozanatda, bo‘m-bo‘sh emas.
- **Eyebrow yo‘q**, to‘ldiruvchi matn yo‘q, “bosing / scroll qiling” kabi UI-ko‘rsatmalar yo‘q (harakat yo‘l ko‘rsatadi).
- Script (qo‘lyozma) shriftlar yo‘q; shriftlar lotin + kirill. Mobilda asosiy matn ≥ 16–17px.
- Rasmlar faqat **Normal blend** (multiply/screen yo‘q). Fonni kesish kerak bo‘lgan rasmlar Assets doskasida alohida komponent.
- Bo‘limlar orasida **gradient/fade yo‘q** — qattiq chegara, chokni ko‘prik-bezak yopadi (gulchambar, bant, bulut, chipta qirqimi…).
- Soyalarni kesadigan clip content yo‘q.
- Dress-kod: kiyim turi realistik rasmlar bilan — Ixtiyoriy / Klassik / Kechki rasmiy / Milliy. Dress-kod, Taymer, Hikoya/Lahzalar — ixtiyoriy (o‘chirilsa joy qolmaydi).
- **Musiqa tugmasi** har shablonda majburiy: o‘ng yuqorida fixed (mobil 16px, laptop 28–32px); birinchi o‘zaro ta’sirda 0→60% 2s; holat `localStorage`da.
- Mobil (390) asosiy; laptop (1440) — o‘z kompozitsiyasi, kontent ~1000–1120px ichida.

## 2. Motion tizimi
| Parametr | Tavsiya |
|---|---|
| Silliq scroll | Lenis (lerp ≈ 0.08) |
| Asosiy ease | `cubic-bezier(0.22, 1, 0.36, 1)` |
| 3D eshik/qopqoq | `cubic-bezier(0.65, 0, 0.35, 1)` |
| Kirish | 0.8–1.6s |
| Matn reveal | mask yoki blur 8–10px → 0, stagger 0.03–0.08s |
| Sticky sahnalar | 1.2–1.8 ekran |
| Parallaks | orqa 0.15–0.2x … old 1.2–1.5x |
| Laptop | kursor parallaksi (±4…±24px), magnetik elementlar |
| Accessibility | `prefers-reduced-motion` — faqat opacity |

Tamoyillar: rasm matndan oldin chiqadi; har sahna boshida ochiladi, oxirida yopiladi; `transform`/`opacity` bilan animatsiya; webp/avif, lazy-load.

## 3. Shablonlar
| Shablon | Konsepsiya | Shriftlar | Mobil | Laptop | Assets |
|---|---|---|---|---|---|
| 01 Anor | milliy, baxmal va oltin, maktub | Playfair Display + Jost | `250:4528` | `254:4560` | `224:4540` (Dress-kod `240:4661`) |
| 02 Zumrad | Samarqand bog‘i, damask, parda | Cormorant Garamond + Manrope | `264:4606` | `267:4653` | `263:4621` |
| 03 Parvoz | Yevropa, “Baxt reysi”, bording-pass | Playfair Display + Onest + JetBrains Mono | `282:4717` | `290:4795` | `280:4717` |
| 04 Shato | fransuz qasri bog‘i, akvarel, darvoza | Cormorant Garamond + Golos Text | `299:4873` | `303:4942` | `294:4888` |

Har bir bo‘limning batafsil motion rejasi Figma’dagi “Motion — …” kartalarida.

## 4. Kodda (Anor namunasi)
- Komponent: `src/components/templates/anor/` — `AnorSite.tsx` (bo‘limlar), `anor.module.css` (harakat), `hooks.ts`, `data.ts`.
- `InvitationSite` dizayn asosi (`base`/slug) bo‘yicha maxsus komponentni tanlaydi (`designSlug === "anor"`).
- Qo‘shimcha maydonlar shablonning `fields` sxemasida (`src/lib/templates.ts`) — buyurtma formasi shulardan avtomatik quriladi.
- Mehmon ismi: havolaga `?m=Ism` qo‘shiladi (kabinetda “Mehmon uchun shaxsiy havola”).
- Assetlar: `public/templates/<slug>/` (webp).

## 5. Ochiq g‘oyalar
Ovoz dizayni (muhr, eshik), haptics (`navigator.vibrate(10)` — Anor’da bor), cinemagraph, WebGL bulut/gulbarg, kun/tun rejimi, performance rejimi, promo-video.
