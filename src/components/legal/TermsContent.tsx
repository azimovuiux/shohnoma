"use client";

import Link from "@/components/LocalLink";
import { useLocale } from "@/lib/i18n";

/** Foydalanish shartlari matni — o‘zbekcha va ruscha to‘liq matn */
export function TermsContent() {
  const locale = useLocale();
  if (locale === "ru")
    return (
      <>
        <section>
          <h2>1. Общие положения</h2>
          <p>
            Настоящие условия определяют порядок использования сервиса создания сайтов-приглашений, предоставляемого через сайт shohnoma.uz (далее —
            «Shohnoma», «мы»). Оформляя заказ или совершая оплату, вы соглашаетесь с настоящими условиями и{" "}
            <Link href="/maxfiylik/" className="text-maroon hover:underline">
              Политикой конфиденциальности
            </Link>
            .
          </p>
        </section>
        <section>
          <h2>2. Описание сервиса</h2>
          <ul>
            <li>Клиент выбирает готовый шаблон, вводит данные о торжестве (имена, дату, адрес, текст, фотографии) и совершает оплату.</li>
            <li>После подтверждения оплаты выдаётся персональная ссылка для гостей (например, shohnoma.uz/jasur-madina) и QR-код.</li>
            <li>Гости открывают приглашение по ссылке и могут оставить ответ «Приду / Не смогу прийти».</li>
            <li>Услуга индивидуального дизайна согласовывается отдельно на основе брифа; бриф бесплатный, оплата производится после утверждения эскиза.</li>
          </ul>
        </section>
        <section>
          <h2>3. Цены и оплата</h2>
          <ul>
            <li>Цены на сайте указаны в сумах. Акционные цены действуют в течение указанного срока.</li>
            <li>Оплата принимается через Payme, Click, Google Pay или переводом с карты на карту (P2P).</li>
            <li>При P2P-переводе необходимо указать код заказа в комментарии к платежу и загрузить чек. Чек обычно проверяется в течение 15 минут в рабочее время.</li>
            <li>Сайт-приглашение становится общедоступным после подтверждения оплаты.</li>
          </ul>
        </section>
        <section>
          <h2>4. Возврат</h2>
          <p>
            До запуска сайта-приглашения можно отменить заказ и запросить возврат оплаты. После запуска сайта и отправки ссылки гостям услуга
            считается оказанной. Если техническая неисправность возникла по нашей вине и не была устранена, оплата возвращается. Обращения
            принимаются в Telegram или по телефону.
          </p>
        </section>
        <section>
          <h2>5. Обязанности клиента</h2>
          <ul>
            <li>Клиент несёт ответственность за достоверность введённых данных и наличие прав на загруженные фотографии.</li>
            <li>Запрещается размещать противоправный, оскорбительный или нарушающий права третьих лиц контент — такие сайты могут быть закрыты без предупреждения.</li>
            <li>Список ответов гостей следует использовать только для организации торжества.</li>
          </ul>
        </section>
        <section>
          <h2>6. Срок действия сайта</h2>
          <p>
            Сайт-приглашение остаётся открытым не менее 3 месяцев после дня торжества, после чего может быть перенесён в архив. Архивный сайт закрывается для
            гостей, а данные сохраняются в личном кабинете клиента.
          </p>
        </section>
        <section>
          <h2>7. Ограничение ответственности</h2>
          <p>
            Мы принимаем все меры для бесперебойной работы сайта, однако не несём ответственности за сбои у интернет-провайдеров, платёжных систем или
            сторонних сервисов. Размер нашей ответственности не превышает суммы, уплаченной за заказ.
          </p>
        </section>
        <section>
          <h2>8. Изменения</h2>
          <p>Условия могут обновляться. Новая редакция вступает в силу со дня её публикации на сайте; к оплаченным заказам применяются прежние условия.</p>
        </section>
      </>
    );
  if (locale === "en")
    return (
      <>
        <section>
          <h2>1. General provisions</h2>
          <p>
            These terms set out how to use the invitation website creation service provided through the shohnoma.uz website (hereinafter —
            “Shohnoma”, “we”). By placing an order or making a payment, you agree to these terms and the{" "}
            <Link href="/maxfiylik/" className="text-maroon hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>
        <section>
          <h2>2. Description of the service</h2>
          <ul>
            <li>The customer chooses a ready-made template, enters the celebration details (names, date, venue, text, photos) and makes a payment.</li>
            <li>Once the payment is confirmed, the customer receives a personal link to send to guests (for example, shohnoma.uz/jasur-madina) and a QR code.</li>
            <li>Guests open the invitation via the link and can leave a reply: “Joyfully accept / Regretfully decline”.</li>
            <li>The custom design service is agreed separately based on a brief; the brief is free, and payment is made after the sketch is approved.</li>
          </ul>
        </section>
        <section>
          <h2>3. Prices and payment</h2>
          <ul>
            <li>Prices on the website are shown in Uzbek soums. Promotional prices apply for the period stated.</li>
            <li>Payment is accepted via Payme, Click, Google Pay or card-to-card (P2P) transfer.</li>
            <li>For a P2P transfer, you must write the order code in the payment comment and upload the receipt. Receipts are usually checked within 15 minutes during working hours.</li>
            <li>The invitation website becomes publicly available once the payment is confirmed.</li>
          </ul>
        </section>
        <section>
          <h2>4. Refunds</h2>
          <p>
            Before the invitation website is launched, you can cancel the order and request a refund. Once the website has been launched and the link
            has been sent to guests, the service is considered provided. If a technical fault occurs through our fault and is not fixed, the payment is
            refunded. Requests are accepted via Telegram or by phone.
          </p>
        </section>
        <section>
          <h2>5. Customer obligations</h2>
          <ul>
            <li>The customer is responsible for the accuracy of the information entered and for having the rights to the uploaded photos.</li>
            <li>Posting unlawful or offensive content, or content that violates the rights of third parties, is prohibited — such websites may be closed without warning.</li>
            <li>The list of guest replies may be used only for organising the celebration.</li>
          </ul>
        </section>
        <section>
          <h2>6. Website validity period</h2>
          <p>
            The invitation website stays open for at least 3 months after the day of the celebration, after which it may be archived. An archived website
            is closed to guests, while the data remains saved in the customer’s account.
          </p>
        </section>
        <section>
          <h2>7. Limitation of liability</h2>
          <p>
            We take all measures to keep the website running without interruption, but we are not liable for failures on the part of internet providers,
            payment systems or third-party services. Our liability does not exceed the amount paid for the order.
          </p>
        </section>
        <section>
          <h2>8. Changes</h2>
          <p>These terms may be updated. A new version takes effect from the day it is published on the website; previous terms apply to orders already paid for.</p>
        </section>
      </>
    );
  return (
    <>
      <section>
        <h2>1. Umumiy qoidalar</h2>
        <p>
          Ushbu shartlar shohnoma.uz sayti (keyingi o‘rinlarda — «Shohnoma», «biz») orqali taqdim etiladigan taklifnoma-sayt yaratish xizmatidan
          foydalanish tartibini belgilaydi. Buyurtma berish yoki to‘lovni amalga oshirish orqali siz ushbu shartlarga va{" "}
          <Link href="/maxfiylik/" className="text-maroon hover:underline">
            Maxfiylik siyosatiga
          </Link>{" "}
          rozilik bildirasiz.
        </p>
      </section>
      <section>
        <h2>2. Xizmat tavsifi</h2>
        <ul>
          <li>Mijoz tayyor shablonni tanlaydi, marosim ma’lumotlarini (ismlar, sana, manzil, matn, suratlar) kiritadi va to‘lovni amalga oshiradi.</li>
          <li>To‘lov tasdiqlangach, mehmonlarga yuboriladigan shaxsiy havola (masalan, shohnoma.uz/jasur-madina) va QR kod beriladi.</li>
          <li>Mehmonlar havola orqali taklifnomani ochadi va «Boraman / Kela olmayman» javobini qoldirishi mumkin.</li>
          <li>Maxsus dizayn xizmati brif asosida alohida kelishiladi; brif bepul, to‘lov eskiz tasdiqlangandan keyin amalga oshiriladi.</li>
        </ul>
      </section>
      <section>
        <h2>3. Narx va to‘lov</h2>
        <ul>
          <li>Narxlar saytda so‘mda ko‘rsatilgan. Aksiya narxlari ko‘rsatilgan muddat davomida amal qiladi.</li>
          <li>To‘lov Payme, Click, Google Pay yoki kartadan kartaga (P2P) o‘tkazma orqali qabul qilinadi.</li>
          <li>P2P o‘tkazmada to‘lov izohiga buyurtma kodini yozish va chekni yuklash talab etiladi. Chek odatda 15 daqiqa ichida, ish vaqtida tekshiriladi.</li>
          <li>Taklifnoma sayti to‘lov tasdiqlangandan so‘ng ommaga ochiladi.</li>
        </ul>
      </section>
      <section>
        <h2>4. Qaytarish</h2>
        <p>
          Taklifnoma sayti ishga tushirilgunga qadar buyurtmani bekor qilish va to‘lovni qaytarishni so‘rash mumkin. Sayt ishga tushirilgach va havola
          mehmonlarga yuborilgach, xizmat ko‘rsatilgan hisoblanadi. Texnik nosozlik bizning aybimiz bilan yuz bergan va bartaraf etilmagan hollarda to‘lov
          qaytariladi. Murojaatlar Telegram yoki telefon orqali qabul qilinadi.
        </p>
      </section>
      <section>
        <h2>5. Mijozning majburiyatlari</h2>
        <ul>
          <li>Kiritilgan ma’lumotlarning to‘g‘riligi va yuklangan suratlarga bo‘lgan huquq uchun mijoz javobgar.</li>
          <li>Qonunga zid, haqoratli yoki uchinchi shaxslar huquqlarini buzuvchi kontent joylashtirish taqiqlanadi — bunday saytlar ogohlantirishsiz yopilishi mumkin.</li>
          <li>Mehmonlar javoblari ro‘yxatidan faqat marosimni tashkil etish maqsadida foydalanish lozim.</li>
        </ul>
      </section>
      <section>
        <h2>6. Saytning amal qilish muddati</h2>
        <p>
          Taklifnoma sayti marosim kunidan keyin kamida 3 oy davomida ochiq turadi, so‘ngra arxivlanishi mumkin. Arxivlangan sayt mehmonlar uchun yopiladi,
          ma’lumotlar esa mijoz kabinetida saqlanadi.
        </p>
      </section>
      <section>
        <h2>7. Javobgarlikni cheklash</h2>
        <p>
          Biz saytning uzluksiz ishlashi uchun barcha choralarni ko‘ramiz, biroq internet provayderlari, to‘lov tizimlari yoki uchinchi tomon xizmatlaridagi
          nosozliklar uchun javobgar emasmiz. Javobgarligimiz miqdori buyurtma uchun to‘langan summadan oshmaydi.
        </p>
      </section>
      <section>
        <h2>8. O‘zgartirishlar</h2>
        <p>Shartlar yangilanishi mumkin. Yangi tahrir saytda e’lon qilingan kundan boshlab amal qiladi; to‘langan buyurtmalarga avvalgi shartlar qo‘llanadi.</p>
      </section>
    </>
  );
}
