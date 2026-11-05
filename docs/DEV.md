# Shohnoma — dasturchi qo‘llanmasi

To‘liq texnik topshiriq — loyiha egasidan (TZ). Figma fayli: `D0wt4iM9V6ym59nF6npes7` (sahifa node'lari TZ §3 va §16 da).

## Stek

- Next.js 15 App Router + TypeScript, React 19, Tailwind CSS v4 (tokenlar `src/app/globals.css` → `@theme`)
- MariaDB/MySQL + Drizzle ORM (`src/server/db/schema.ts`), migratsiyalar `drizzle/` (`npm run db:generate`)
- Plesk (Passenger) — `server.js` ishga tushganda migratsiyalarni bajaradi, keyin Next serverini ochadi

## Qoidalar

- **Ranglar/shriftlar faqat tokenlardan**: `bg-bg-base`, `bg-bg-soft`, `text-ink`, `text-ink-2`, `text-ink-inverse`, `bg-maroon`, `bg-maroon-deep`, `text-gold`, `bg-gold-soft`, `border-line`, `text-success`, `text-pending`, `text-danger`; holat fonlari `var(--success-bg)` va h.k.
  Tipografiya utility'lari: `t-display-card`, `t-body-l|m|s`, `t-nav`, `t-button`, `t-title`, `t-annotation`, `font-serif`, `font-script` (Pinyon), `font-cinzel`.
  Tugmalar: `btn btn-primary`, `btn btn-secondary`, `btn-sm`, `icon-btn`. Radiuslar: `rounded-card` (22), `rounded-panel` (20), `rounded-input` (14).
- **Ikonlar**: faqat `@/components/icons` dan (Iconsax Linear, `currentColor`). Telegram — `@/components/TelegramIcon`.
- **UI primitivlar**: `@/components/ui` — `Field`, `Input`, `Textarea`, `PhoneInput` (+998, qiymat "90 123 45 67"), `Toggle`, `Segment`, `Stepper`, `StatusBadge`, `Modal` (mobilda pastdan sheet), `useToast`, `useCopy`, `api()` (fetch + xato matni).
- **Formatlar**: `@/lib/display` (`splitDate`, `daysUntil`, `formatPhoneDisplay`, `relativeTime`, `orderStatusView`, `rsvpView`, `initials`), `@/lib/format` (`formatPrice` → "149 000 so‘m").
- **Mokaplar**: `@/components/mockups/Devices` (`PhoneFrame`, `LaptopFrame`), `InvitationScreen`, `InvitationDesktop`; `DevicePreview` va `isDarkTheme` — `@/components/TemplateCard`.
- **Matn**: o‘zbekcha lotin; `o‘`, `g‘` uchun `‘` (U+2018), tutuq belgisi `’` (U+2019). UI'da texnik so‘zlar yo‘q (URL, slug, RSVP, OTP → havola, kod, mehmonlar javobi).
- Mobil 390 / desktop 1440. Kontent kengligi 1200 (`max-w-[1440px] px-5 lg:px-[120px]`).
- Server komponentlar ma’lumotni to‘g‘ridan-to‘g‘ri `@/server/*` dan oladi; client komponentlar API'ga `api()` bilan murojaat qiladi.
- `"use client"` modulidan server komponentga **ma’lumot** (massiv/obyekt) import qilmang — faqat komponentlar.

## Server modullari

| Modul | Nima beradi |
|---|---|
| `@/server/auth` | `getUser()`, `requireUser(next)`, `requireAdmin()`, `normalizePhone`, `formatPhone` |
| `@/server/orders` | `getOwnedOrder(id)` → `{order, invitation, owner}` yoki `null`; `isPaidStatus`, `DEFAULT_MESSAGE` |
| `@/server/order-update` | `missingFields(invitation)` — 02/03 to‘liqligini tekshirish |
| `@/server/invitations` | `getPublicInvitation(slug)`, `countView`, `invitationStats(id)` → `{coming, maybe, notComing, total, responses}`, `guestList(id, {status,q,limit,offset})` |
| `@/server/payments` | `enabledProviders()`, `latestPayment(orderId)`, `providerLabel`, `pendingP2p()` |
| `@/server/env` | `env.p2pCard`, `env.p2pHolder`, `env.p2pBank`, `env.siteUrl`, `env.tgBotUsername`, `env.paymentsSandbox` |
| `@/server/db` | Drizzle `db` va jadvallar: `users, orders, invitations, guestResponses, payments, favorites, briefs, leads` |

`invitation.date` — `"2026-09-12T18:00"` (Toshkent vaqti). `orders.status`: `draft | pending_payment | payment_processing | p2p_review | p2p_rejected | payment_failed | paid | active | archived`. Taklifnoma faqat `paid/active` da ommaga ochiq.

## API

| Metod | Yo‘l | Body → Javob |
|---|---|---|
| POST | `/api/auth/otp` | `{phone}` → `{ok, phone, devCode?}` (devCode faqat SMS sozlanmagan dev'da) / `{ok:false, error, retryIn?}` |
| POST | `/api/auth/verify` | `{phone, code}` → `{ok}` (sessiya cookie) |
| POST | `/api/auth/telegram` | Telegram Login Widget ma’lumoti → `{ok}` |
| POST | `/api/auth/logout` | → `{ok}` |
| POST | `/api/orders` | `{templateSlug}` → `{ok, id}` (kirmagan bo‘lsa brauzer cookie bilan bog‘lanadi) |
| GET/PATCH | `/api/orders/:id` | PATCH: `{ceremony, personA, personB, day:"2026-09-12", time:"18:00", venueName, address, mapUrl, message, program:[{time,title}], rsvpEnabled, rsvpDeadline, musicEnabled, contactPhone, contactTg, slug, templateSlug}` (qisman) → `{ok, invitation}` |
| POST/DELETE | `/api/orders/:id/photos` | multipart `file` → `{ok, url, photos}` / `{url}` → `{ok, photos}` (≤10 ta, ≤8 MB) |
| POST | `/api/orders/:id/pay` | `{provider: payme|click|google_pay|p2p}` → `{ok, url}` (shu URL'ga o‘ting) |
| POST | `/api/orders/:id/p2p-receipt` | multipart `file` → `{ok}` |
| GET | `/api/orders/:id/status` | → `{ok, status, slug, payment:{provider,status,note}}` (polling) |
| POST | `/api/orders/:id/sandbox` | `{result: success|fail, provider}` → `{ok, url}` (faqat PAYMENTS_SANDBOX=1) |
| GET/PATCH | `/api/me` | `{name, notifyRsvpTelegram, notifyRsvpSms, notifyDayBefore}` |
| GET/POST/DELETE | `/api/me/favorites` | `{slug}` yoki `{slugs:[]}` |
| GET | `/api/invitations/:id/guests` | CSV yuklab olish |
| GET | `/api/invitations/:id/qr?format=png|svg&download` | QR kod |
| POST | `/api/i/:slug/rsvp` | `{name, status: coming|maybe|not_coming, count, wish}` → `{ok, editToken, count}` |
| GET/PATCH | `/api/i/:slug/rsvp/:token` | javobni olish / o‘zgartirish |
| GET | `/api/i/:slug/calendar` | `.ics` |
| POST | `/api/briefs` | multipart: `data` (JSON), `files[]` |
| POST | `/api/leads` | bosh sahifa formasi |
| POST | `/api/admin/payments/:id` | `{action: approve|reject, note}` |
| PATCH | `/api/admin/orders/:id`, `/api/admin/briefs/:id`, `/api/admin/leads/:id` | `{status}` |

## Lokal ishga tushirish

```bash
# MariaDB: CREATE DATABASE shohnoma; .env.local da DATABASE_URL
npm install
npm run db:migrate
npm run dev
```
`.env.local` da `PAYMENTS_SANDBOX=1` bo‘lsa, Payme/Click o‘rniga ichki test sahifasi ochiladi.
