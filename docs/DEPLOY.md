# Plesk'ga deploy (PHP hosting, Node.js shart emas)

Sayt ikki qismdan iborat:
- **Frontend** — statik HTML/JS/CSS (Next.js eksport). GitHub Actions yig‘adi.
- **Backend** — PHP 8.2 (`api/`) + MariaDB.

`main` ga push → GitHub Actions saytni yig‘adi → tayyor fayllarni **`deploy`** branchiga qo‘yadi → Plesk shu branchni tortadi.

## 1. GitHub (bir marta)

- Repo → **Settings → Actions → General**: Actions yoqilgan bo‘lsin; *Workflow permissions* → **Read and write permissions** → Save.
- `main` ga birinchi push'dan so‘ng **Actions** sahifasida "Build & deploy branch" yashil bo‘lishi va `deploy` branch paydo bo‘lishi kerak.
- (ixtiyoriy) Telegram orqali kirish uchun: **Settings → Secrets and variables → Actions → Variables** → `TELEGRAM_BOT_USERNAME` = botning username'i.

## 2. Plesk → Git (bir marta)

shohnoma.uz → **Git** → repozitoriya sozlamalari:
- Repository URL: `https://github.com/azimovuiux/shohnoma.git`
- **Branch: `deploy`**
- Deployment path: `/shohnoma.uz`
- Deployment mode: Automatic
- Qo‘shimcha deploy buyruqlari **kerak emas** (bo‘sh qoldiring).

"Pull Updates" / "Deploy now" bosing. Har push'da avtomatik tortish uchun Plesk'dagi **Webhook URL** ni GitHub → Settings → Webhooks ga qo‘shing (Content type: `application/json`, faqat push).

## 3. `.env` (bir marta, gitga qo‘shilmaydi)

`/shohnoma.uz/.env` (Plesk → Files). Kamida:

```
DATABASE_URL=mysql://tilirut_shohnoma_admin:PAROL@localhost:3306/tilirut_shohnoma
SITE_URL=https://shohnoma.uz
SESSION_SECRET=<uzun tasodifiy satr>
ADMIN_PHONES=+99890XXXXXXX
```

Paroldagi `@` → `%40`, `&` → `%26`. Jadvallar birinchi so‘rovda avtomatik yaratiladi.
Yuklangan rasm va cheklar `/var/www/vhosts/tilirus.uz/shohnoma-storage/` da saqlanadi (deploy ularni o‘chirmaydi). Boshqa joy kerak bo‘lsa — `STORAGE_DIR=`.

`.env` va boshqa maxfiy fayllar `.htaccess` orqali brauzerdan yopilgan.

## 4. PHP sozlamalari

shohnoma.uz → **PHP** (Hosting settings):
- Versiya **8.2** yoki yangiroq, ishlov berish: *FPM application served by Apache* (yoki FastCGI by Apache) — `.htaccess` ishlashi uchun Apache kerak
- `upload_max_filesize = 10M`, `post_max_size = 12M`
- Kengaytmalar: `pdo_mysql`, `curl`, `fileinfo`, `mbstring` (odatda yoqilgan)

## 5. SSL

**SSL/TLS-сертификаты → Let’s Encrypt** → shohnoma.uz va www.shohnoma.uz. Sayt avtomatik https ga yo‘naltiradi.

## 6. To‘lov, SMS, Telegram

`.env` ga kalitlarni yozing (namuna: `.env.example`):
- **Payme**: `PAYME_MERCHANT_ID`, `PAYME_KEY` — kassada endpoint: `https://shohnoma.uz/api/payme`
- **Click**: `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_MERCHANT_USER_ID`, `CLICK_SECRET_KEY` — Prepare: `https://shohnoma.uz/api/click/prepare`, Complete: `https://shohnoma.uz/api/click/complete`
- **P2P**: `P2P_CARD`, `P2P_HOLDER`, `P2P_BANK`
- **Eskiz.uz** (SMS kod): `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`, `ESKIZ_FROM`
- **Telegram**: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID` (+ BotFather → `/setdomain` → shohnoma.uz)

`.env` o‘zgarishi darhol kuchga kiradi (PHP — qayta ishga tushirish shart emas).

## 7. Kunlik eslatma (ixtiyoriy)

**Планировщик задач** → "Получить URL", har kuni: `https://shohnoma.uz/api/cron/reminders?secret=<CRON_SECRET>`

## Tekshirish

- `https://shohnoma.uz/` — bosh sahifa
- `https://shohnoma.uz/api/config` — JSON chiqishi kerak (`{"ok":true,...}`). Xato bo‘lsa — matnida sabab (ko‘pincha `DATABASE_URL`).
- Plesk → **Журналы** — PHP xatolari `[shohnoma]` bilan boshlanadi.
