# Plesk'ga deploy qilish

Sayt — Next.js (Node.js) ilovasi + MariaDB. Plesk Git `main` branchni `/shohnoma.uz` papkasiga tortadi, keyin
qo‘shimcha buyruqlar build qiladi va ilovani qayta ishga tushiradi.

## 1. Node.js ni yoqish (bir marta)

Plesk → **Websites & Domains → shohnoma.uz → Node.js**:

| Sozlama | Qiymat |
|---|---|
| Node.js Version | **22.x** (kamida 20) |
| Package Manager | npm |
| Document Root | `/shohnoma.uz/public` |
| Application Mode | `production` |
| Application Root | `/shohnoma.uz` |
| Application Startup File | `server.js` |

"Enable Node.js" tugmasini bosing.

> Agar Plesk'da "Node.js" bo‘limi bo‘lmasa — hosting provayderdan Node.js extension'ni yoqishni so‘rang.

## 2. Ma’lumotlar bazasi (bir marta)

Plesk → **Databases → Add Database**: nomi `shohnoma`, turi MariaDB/MySQL, yangi foydalanuvchi va parol.
Jadval va migratsiyalar ilova ishga tushganda **avtomatik** yaratiladi (`server.js`).

## 3. `.env` fayli (bir marta, gitga qo‘shilmaydi)

Plesk → **Files** → `/shohnoma.uz/.env` faylini yarating (namuna: `.env.example`). Kamida:

```
DATABASE_URL=mysql://DB_USER:DB_PAROL@localhost:3306/shohnoma
SITE_URL=https://shohnoma.uz
SESSION_SECRET=<uzun tasodifiy satr>
ADMIN_PHONES=+99890XXXXXXX
UPLOAD_DIR=../shohnoma-storage/uploads
```

`UPLOAD_DIR` deploy papkasidan tashqarida bo‘lsin — yuklangan suratlar va cheklar har deployda saqlanib qoladi.
Parolda `@ : / ?` kabi belgilar bo‘lsa, ularni URL-kodlang (masalan `@` → `%40`).

## 4. Git — qo‘shimcha deploy buyruqlari (bir marta)

Plesk → **Git → shohnoma.git → Repository Settings**:

- Deployment mode: **Automatic**, branch: `main`, path: `/shohnoma.uz`
- ✅ **Enable additional deployment actions**:

```bash
export PATH=/opt/plesk/node/22/bin:$PATH
npm ci --include=dev --no-audit --no-fund
npm run build
mkdir -p tmp && touch tmp/restart.txt
```

Har `main` ga push → Plesk kodni tortadi → build → Passenger ilovani qayta yuklaydi.
Birinchi marta Node.js sahifasida **Restart App** tugmasini ham bosing.

> Build uchun ~1.5 GB RAM kerak. Server kichik bo‘lsa va build xotira yetmay to‘xtasa, `NODE_OPTIONS=--max-old-space-size=1536`
> qo‘shing yoki provayderdan xotira limitini oshirishni so‘rang.

## 5. To‘lov tizimlari

**Payme** (business.paycom.uz → kassa sozlamalari):
- Endpoint URL: `https://shohnoma.uz/api/payme`
- Hisob parametri: `order_id` (buyurtma kodi, masalan `SH-00124`)
- `.env`: `PAYME_MERCHANT_ID`, `PAYME_KEY` (test paytida test kalit va `PAYME_TEST=1`)

**Click** (merchant.click.uz → servis sozlamalari):
- Prepare URL: `https://shohnoma.uz/api/click/prepare`
- Complete URL: `https://shohnoma.uz/api/click/complete`
- `.env`: `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_MERCHANT_USER_ID`, `CLICK_SECRET_KEY`

**P2P**: `.env` da `P2P_CARD`, `P2P_HOLDER`, `P2P_BANK`. Cheklar admin panelda tasdiqlanadi: `https://shohnoma.uz/admin/tolovlar`.

Payme/Click kalitlari kiritilmaguncha bu usullar to‘lov sahifasida ko‘rinmaydi (P2P doim bor).

## 6. SMS va Telegram

- **Eskiz.uz**: `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`, `ESKIZ_FROM`. Sozlanmasa kirish kodi yuborilmaydi (faqat server logida).
- **Telegram bot** (@BotFather):
  - `TELEGRAM_BOT_TOKEN`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` (masalan `shohnoma_bot`)
  - BotFather → `/setdomain` → `shohnoma.uz` (Telegram orqali kirish uchun)
  - `TELEGRAM_ADMIN_CHAT_ID` — admin guruh id (botni guruhga qo‘shib, id ni oling)

`NEXT_PUBLIC_*` o‘zgaruvchilar build paytida o‘qiladi — o‘zgartirgandan so‘ng qayta deploy qiling.

## 7. Kunlik eslatma (ixtiyoriy)

Plesk → **Scheduled Tasks → Add Task** → "Fetch a URL", har kuni 10:00:
`https://shohnoma.uz/api/cron/reminders?secret=<CRON_SECRET>`

## 8. Admin

`ADMIN_PHONES` dagi raqam bilan `/kirish` orqali kiring → header'dagi "Kabinet" menyusida **Admin panel** chiqadi.

## Tekshirish

- `https://shohnoma.uz` ochiladi
- Plesk → Node.js → **Logs**: `[shohnoma] migratsiyalar bajarildi`, `[shohnoma] tayyor`
- Xato bo‘lsa: Logs'dagi birinchi qizil qatorni tekshiring (ko‘pincha `DATABASE_URL` yoki build qilinmagan `.next`)
