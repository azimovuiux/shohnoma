"use client";

import { useLocale } from "@/lib/i18n";

/** Maxfiylik siyosati matni — o‘zbekcha va ruscha to‘liq matn */
export function PrivacyContent() {
  const locale = useLocale();
  if (locale === "ru")
    return (
      <>
        <section>
          <p>
            Shohnoma уважает ваши персональные данные и использует их <strong>только для приглашения</strong>. Данные обрабатываются в соответствии с
            Законом Республики Узбекистан «О персональных данных».
          </p>
        </section>
        <section>
          <h2>1. Какие данные мы собираем</h2>
          <ul>
            <li>
              <strong>От клиента:</strong> номер телефона, имя, имя пользователя в Telegram (по желанию).
            </li>
            <li>
              <strong>Для приглашения:</strong> имена, дата и место торжества, текст приглашения, фотографии, программа.
            </li>
            <li>
              <strong>От гостей:</strong> имя, количество человек, ответ и пожелание (по желанию).
            </li>
            <li>
              <strong>По оплате:</strong> сумма заказа, способ оплаты, фото чека P2P. Данные карт у нас не хранятся — их обрабатывают Payme или
              Click.
            </li>
            <li>
              <strong>Технические:</strong> количество открытий приглашения (простой счётчик), cookie для сессии входа.
            </li>
          </ul>
        </section>
        <section>
          <h2>2. Как мы используем данные</h2>
          <ul>
            <li>Создание сайта-приглашения и его показ гостям.</li>
            <li>Подтверждение входа, подтверждение оплаты, отправка уведомлений о новых ответах гостей и напоминаний по SMS или в Telegram.</li>
            <li>Учёт заказов и оплат, ответы на обращения.</li>
          </ul>
          <p>Мы не продаём и не передаём ваши данные третьим лицам в рекламных целях.</p>
        </section>
        <section>
          <h2>3. Кто видит данные</h2>
          <ul>
            <li>Сайт-приглашение открыт для всех, у кого есть ссылка; в поисковых системах он не индексируется.</li>
            <li>Ответы и пожелания гостей видит только владелец приглашения (клиент) в своём личном кабинете.</li>
            <li>Сотрудники Shohnoma обращаются к данным только для проверки оплаты и оказания поддержки.</li>
            <li>SMS-сервис (Eskiz.uz), Telegram и платёжные системы получают только данные, необходимые для выполнения своих функций.</li>
          </ul>
        </section>
        <section>
          <h2>4. Срок хранения</h2>
          <p>
            Приглашение и ответы гостей хранятся 12 месяцев после торжества, затем удаляются или обезличиваются. Записи об оплатах хранятся
            в течение срока, установленного законодательством. Вы можете попросить удалить аккаунт и данные раньше.
          </p>
        </section>
        <section>
          <h2>5. Защита</h2>
          <p>
            Сайт работает по HTTPS, вход подтверждается только через Telegram-бот, доступ к базе данных ограничен.
          </p>
        </section>
        <section>
          <h2>6. Ваши права</h2>
          <p>
            Вы вправе потребовать просмотр, исправление или удаление своих данных. Для этого обратитесь к нам в Telegram или по телефону — мы ответим
            в течение 3 рабочих дней.
          </p>
        </section>
      </>
    );
  if (locale === "en")
    return (
      <>
        <section>
          <p>
            Shohnoma respects your personal data and uses it <strong>only for your invitation</strong>. Data is processed in accordance with the Law
            of the Republic of Uzbekistan “On Personal Data”.
          </p>
        </section>
        <section>
          <h2>1. What data we collect</h2>
          <ul>
            <li>
              <strong>From the customer:</strong> phone number, name, Telegram username (optional).
            </li>
            <li>
              <strong>For the invitation:</strong> names, date and venue of the celebration, invitation text, photos, programme.
            </li>
            <li>
              <strong>From guests:</strong> name, number of people, reply and wishes (optional).
            </li>
            <li>
              <strong>Payment data:</strong> order amount, payment method, photo of the P2P receipt. We do not store card details — they are processed
              by Payme or Click.
            </li>
            <li>
              <strong>Technical:</strong> number of times the invitation is opened (a simple counter), a cookie for the login session.
            </li>
          </ul>
        </section>
        <section>
          <h2>2. How we use the data</h2>
          <ul>
            <li>Creating the invitation website and showing it to guests.</li>
            <li>Confirming logins and payments, and sending notifications about new guest replies and reminders by SMS or Telegram.</li>
            <li>Keeping records of orders and payments, and responding to enquiries.</li>
          </ul>
          <p>We do not sell or share your data with third parties for advertising purposes.</p>
        </section>
        <section>
          <h2>3. Who can see the data</h2>
          <ul>
            <li>The invitation website is open to anyone who has the link; it is not indexed by search engines.</li>
            <li>Guests’ replies and wishes are visible only to the invitation owner (the customer) in their account.</li>
            <li>Shohnoma staff access the data only to verify payments and provide support.</li>
            <li>The SMS service (Eskiz.uz), Telegram and payment systems receive only the data they need to perform their function.</li>
          </ul>
        </section>
        <section>
          <h2>4. Retention period</h2>
          <p>
            The invitation and guests’ replies are kept for 12 months after the celebration and are then deleted or anonymised. Payment records are kept
            for the period required by law. You can ask us to delete your account and data earlier.
          </p>
        </section>
        <section>
          <h2>5. Security</h2>
          <p>
            The website runs over HTTPS, logins are confirmed only through the Telegram bot, and access to the database is restricted.
          </p>
        </section>
        <section>
          <h2>6. Your rights</h2>
          <p>
            You have the right to request to view, correct or delete your data. To do so, contact us via Telegram or by phone — we will reply within 3
            working days.
          </p>
        </section>
      </>
    );
  return (
    <>
      <section>
        <p>
          Shohnoma shaxsiy ma’lumotlaringizni hurmat qiladi va ulardan <strong>faqat taklifnoma uchun</strong> foydalanadi. Ma’lumotlar O‘zbekiston
          Respublikasining «Shaxsga doir ma’lumotlar to‘g‘risida»gi qonuniga muvofiq qayta ishlanadi.
        </p>
      </section>
      <section>
        <h2>1. Qanday ma’lumotlarni yig‘amiz</h2>
        <ul>
          <li>
            <strong>Mijozdan:</strong> telefon raqam, ism, Telegram foydalanuvchi nomi (ixtiyoriy).
          </li>
          <li>
            <strong>Taklifnoma uchun:</strong> ismlar, marosim sanasi va manzili, taklif matni, suratlar, dastur.
          </li>
          <li>
            <strong>Mehmonlardan:</strong> ism, kishi soni, javob va tilak (ixtiyoriy).
          </li>
          <li>
            <strong>To‘lov bo‘yicha:</strong> buyurtma summasi, to‘lov usuli, P2P chek rasmi. Karta ma’lumotlari bizda saqlanmaydi — ular Payme yoki Click
            tomonidan qayta ishlanadi.
          </li>
          <li>
            <strong>Texnik:</strong> taklifnoma ochilishlar soni (oddiy hisoblagich), kirish sessiyasi uchun cookie.
          </li>
        </ul>
      </section>
      <section>
        <h2>2. Ma’lumotlardan qanday foydalanamiz</h2>
        <ul>
          <li>Taklifnoma saytini yaratish va mehmonlarga ko‘rsatish.</li>
          <li>Kirishni tasdiqlash, to‘lov tasdig‘i, yangi mehmon javobi va eslatmalarni SMS yoki Telegram orqali yuborish.</li>
          <li>Buyurtma va to‘lovlarni hisobga olish, murojaatlarga javob berish.</li>
        </ul>
        <p>Ma’lumotlaringizni reklama maqsadida uchinchi shaxslarga sotmaymiz va bermaymiz.</p>
      </section>
      <section>
        <h2>3. Kim ko‘radi</h2>
        <ul>
          <li>Taklifnoma sayti havolani olgan har kim uchun ochiq; qidiruv tizimlarida indekslanmaydi.</li>
          <li>Mehmonlar javoblari va tilaklarini faqat taklifnoma egasi (mijoz) o‘z kabinetida ko‘radi.</li>
          <li>Shohnoma xodimlari ma’lumotlarga faqat to‘lovni tekshirish va yordam ko‘rsatish uchun murojaat qiladi.</li>
          <li>SMS (Eskiz.uz), Telegram va to‘lov tizimlari faqat o‘z vazifasi uchun zarur ma’lumotni oladi.</li>
        </ul>
      </section>
      <section>
        <h2>4. Saqlash muddati</h2>
        <p>
          Taklifnoma va mehmonlar javoblari marosimdan keyin 12 oy davomida saqlanadi, so‘ngra o‘chiriladi yoki anonimlashtiriladi. To‘lov yozuvlari
          qonunchilikda belgilangan muddat davomida saqlanadi. Akkauntni va ma’lumotlarni oldinroq o‘chirishni so‘rashingiz mumkin.
        </p>
      </section>
      <section>
        <h2>5. Himoya</h2>
        <p>
          Sayt HTTPS orqali ishlaydi, kirish faqat Telegram bot orqali tasdiqlanadi, ma’lumotlar bazasiga kirish cheklangan.
        </p>
      </section>
      <section>
        <h2>6. Huquqlaringiz</h2>
        <p>
          Siz o‘z ma’lumotlaringizni ko‘rish, tuzatish yoki o‘chirishni talab qilishingiz mumkin. Buning uchun Telegram yoki telefon orqali murojaat qiling — 3
          ish kuni ichida javob beramiz.
        </p>
      </section>
    </>
  );
}
