import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = { title: "Maxfiylik siyosati", description: "Shohnoma shaxsiy ma’lumotlarni qanday yig‘adi, saqlaydi va himoya qiladi." };

export default function PrivacyPage() {
  return (
    <LegalPage title="Maxfiylik" italic="siyosati" updated="5 noyabr 2026">
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
          <li>Kirish kodi, to‘lov tasdig‘i, yangi mehmon javobi va eslatmalarni SMS yoki Telegram orqali yuborish.</li>
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
          Sayt HTTPS orqali ishlaydi, kirish bir martalik SMS kod yoki Telegram orqali amalga oshiriladi, ma’lumotlar bazasiga kirish cheklangan.
        </p>
      </section>
      <section>
        <h2>6. Huquqlaringiz</h2>
        <p>
          Siz o‘z ma’lumotlaringizni ko‘rish, tuzatish yoki o‘chirishni talab qilishingiz mumkin. Buning uchun Telegram yoki telefon orqali murojaat qiling — 3
          ish kuni ichida javob beramiz.
        </p>
      </section>
    </LegalPage>
  );
}
