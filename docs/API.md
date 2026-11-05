# Shohnoma API (PHP) — shartnoma

Frontend — statik Next.js eksport (`output: "export"`), barcha ma’lumotni brauzerda shu API'dan oladi.
Backend — `php/api/` (PHP 8.2+, PDO MariaDB). Router: `php/api/index.php`, marshrutlar `php/api/routes/*.php`
(`route('GET', '/orders/:id', fn($p) => ...)`), yordamchilar `php/api/lib/*.php`.

**Umumiy qoidalar**
- Barcha javoblar JSON: `{ ok: true, ... }` yoki `{ ok: false, error: "o‘zbekcha matn" }` + HTTP status.
- Maydon nomlari **camelCase** (DB'dagi snake_case → camelCase). Vaqtlar ISO UTC (`"2026-11-05T07:00:00Z"`).
- Sessiya — `sh_session` httpOnly cookie; kirmagan buyurtmachi — `sh_guest` cookie.
- Pul — butun so‘m (`149000`). Payme'da tiyin (×100).
- Sanalar: `invitation.date` = `"2026-09-12T18:00"` (Toshkent vaqti, satr).

## Obyektlar

```ts
User        { id, phone, name, telegramId, telegramUser, isAdmin, notifyRsvpTelegram, notifyRsvpSms, notifyDayBefore, createdAt }
Order       { id, code, seq, userId, templateSlug, status, amount, paidAt, createdAt, updatedAt }
            // status: draft|pending_payment|payment_processing|p2p_review|p2p_rejected|payment_failed|paid|active|archived
Invitation  { id, orderId, slug, ceremony, personA, personB, date, venueName, address, mapUrl, message,
              program: {time,title}[], photos: string[], rsvpEnabled, rsvpDeadline, musicEnabled,
              contactPhone, contactTg, views, createdAt }
Payment     { id, orderId, provider: payme|click|google_pay|p2p, amount, status: created|processing|paid|failed|cancelled|review|rejected,
              receiptUrl, reviewNote, createdAt, paidAt }
Guest       { id, invitationId, name, status: coming|maybe|not_coming, count, wish, createdAt, updatedAt }   // editToken hech qachon chiqmaydi
Stats       { coming, maybe, notComing, total, responses }   // coming/maybe/notComing — kishi soni yig‘indisi
Brief       { id, ceremony, date, guestCount, styles[], colors[], ideas, references[], budget, name, phone, contactVia, status, createdAt }
Lead        { id, name, phone, ceremony, message, replyVia, status, createdAt }
```

## Umumiy

| Metod | Yo‘l | Javob |
|---|---|---|
| GET | `/api/config` | `{ok, providers: PayProvider[], p2p:{card,holder,bank}, telegramBot: string|null, sandbox: bool, siteUrl}` |
| GET | `/api/me` | `{ok, user: User|null, counts: {orders, favorites}}` (kirmagan bo‘lsa ham 200, `user:null`) |
| PATCH | `/api/me` | `{name?, notifyRsvpTelegram?, notifyRsvpSms?, notifyDayBefore?}` → `{ok}` |
| GET | `/api/me/orders` | `{ok, items: {order, invitation, stats, payment: Payment|null}[]}` (yangilari birinchi) |
| GET | `/api/me/payments` | `{ok, items: {payment, order, invitation}[]}` |
| GET/POST/DELETE | `/api/me/favorites` | GET → `{ok, slugs: string[]|null}` (null = kirilmagan); POST `{slug}` yoki `{slugs:[]}`; DELETE `{slug}` |

## Kirish

| POST | `/api/auth/otp` | `{phone}` → `{ok, phone, devCode?}` / 429 `{ok:false, error, retryIn?}` |
| POST | `/api/auth/verify` | `{phone, code}` → `{ok}` |
| POST | `/api/auth/telegram` | Telegram Login Widget ma’lumoti → `{ok, linked?}` |
| POST | `/api/auth/logout` | `{ok}` |

## Buyurtma

| Metod | Yo‘l | |
|---|---|---|
| POST | `/api/orders` | `{templateSlug}` → `{ok, id}` |
| GET | `/api/orders/:id` | `{ok, order, invitation, payment: Payment|null, missing: string[]}` — egasi (user yoki guest cookie) yoki admin; aks holda 404. `missing` — 02 ning to‘ldirilmagan maydonlari (`personA, personB, date, venueName, address`) |
| PATCH | `/api/orders/:id` | qisman: `{templateSlug?, ceremony?, personA?, personB?, day?:"YYYY-MM-DD", time?:"HH:MM", venueName?, address?, mapUrl?, message?, program?, rsvpEnabled?, rsvpDeadline?, musicEnabled?, contactPhone?, contactTg?, slug?}` → `{ok, invitation}` / 422 `{error}` |
| POST | `/api/orders/:id/photos` | multipart `file` → `{ok, url, photos}` (≤10 ta, ≤8 MB, jpg/png/webp/heic) |
| DELETE | `/api/orders/:id/photos` | `{url}` → `{ok, photos}` |
| POST | `/api/orders/:id/pay` | `{provider}` → `{ok, url}` |
| POST | `/api/orders/:id/p2p-receipt` | multipart `file` (rasm yoki pdf) → `{ok}` |
| GET | `/api/orders/:id/status` | `{ok, status, slug, payment: {provider,status,note}|null}` |
| POST | `/api/orders/:id/sandbox` | `{result: success|fail, provider}` → `{ok, url}` (faqat `PAYMENTS_SANDBOX=1`) |

## To‘lov provayderlari (server→server)

| POST | `/api/payme` | Payme Merchant API JSON-RPC (Basic `Paycom:PAYME_KEY`) |
| POST | `/api/click/prepare`, `/api/click/complete` | Click SHOP API (form-urlencoded) |

## Kabinet — taklifnoma

| GET | `/api/invitations/:id` | `{ok, order, invitation, stats, recent: Guest[] (5 ta), payments: Payment[], switcher: {id, names, date, status, templateSlug}[]}` — egasi yoki admin |
| GET | `/api/invitations/:id/responses?status=&q=&page=1&per=8` | `{ok, total, list: Guest[], stats, views, wishes: Guest[] (oxirgi 3 ta tilakli)}` |
| GET | `/api/invitations/:id/guests` | CSV yuklab olish (BOM, `;`) |

QR kod brauzerda yaratiladi (`qrcode` paketi) — server endpointi yo‘q.

## Mehmon (ommaviy)

| GET | `/api/i/:slug` | `{ok, invitation, templateSlug, archived}` — faqat paid/active/archived; ko‘rishlar soni +1 |
| POST | `/api/i/:slug/rsvp` | `{name, status, count, wish?, website?}` → `{ok, editToken, count}` |
| GET/PATCH | `/api/i/:slug/rsvp/:token` | `{ok, response:{name,status,count,wish}}` / `{ok}` |
| GET | `/api/i/:slug/calendar` | `.ics` |

## Formalar

| POST | `/api/briefs` | multipart: `data` (JSON) + `files[]` → `{ok}` |
| POST | `/api/leads` | `{name, phone, ceremony, message, replyVia, website?}` → `{ok}` |

## Admin (isAdmin)

| GET | `/api/admin/dashboard` | `{ok, todayOrders, todayPaid, monthRevenue, monthPaidCount, activeInvitations, pendingP2p, newBriefs, newLeads, recent: {order, invitation}[]}` |
| GET | `/api/admin/orders?q=&status=&page=` | `{ok, total, items: {order, invitation, owner: {phone,name}|null}[]}` (30 tadan) |
| PATCH | `/api/admin/orders/:id` | `{status}` |
| GET | `/api/admin/payments` | `{ok, pending: {payment, order, invitation}[], recent: {...}[]}` |
| POST | `/api/admin/payments/:id` | `{action: approve|reject, note}` |
| GET | `/api/admin/briefs` · PATCH `/api/admin/briefs/:id` | `{ok, items: Brief[]}` · `{status}` |
| GET | `/api/admin/leads` · PATCH `/api/admin/leads/:id` | `{ok, items: Lead[]}` · `{status}` |
| GET | `/api/admin/counts` | `{ok, pendingP2p, newBriefs, newLeads}` |

## Boshqa

| GET | `/files/<dir>/<name>` | yuklangan fayl (`STORAGE_DIR/uploads`) |
| GET | `/api/cron/reminders?secret=` | kunlik eslatma |
