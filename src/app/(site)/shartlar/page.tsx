import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = { title: "Foydalanish shartlari", description: "Shohnoma taklifnoma saytlari xizmatidan foydalanish shartlari." };

export default function TermsPage() {
  return (
    <LegalPage title="Foydalanish" italic="shartlari" updated="5 noyabr 2026">
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
    </LegalPage>
  );
}
