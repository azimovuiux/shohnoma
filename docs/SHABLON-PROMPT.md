# Shohnoma — shablon yaratish uchun prompt

Bu promptni Claude (yoki boshqa AI) ga bering. `[…]` ichidagilarni o‘zingizning g‘oyangiz bilan almashtiring.
Agar Figma maket bo‘lsa — skrinshotini yoki havolasini ham qo‘shing. Natija: yuklashga tayyor ZIP tarkibi.

---

## Prompt (nusxalang)

```
Sen Shohnoma.uz uchun to‘y taklifnomasi sayti shablonini yaratadigan dizayner-frontendchisan.
Natija — mobil telefonda ochiladigan premium, nafis bitta sahifali taklifnoma.

## Shablon g‘oyasi
- Nomi: [masalan: Oltin bog‘]
- Slug: [masalan: oltin-bog]
- Marosim: [nikoh | fotiha | sunnat | tugilgan-kun]
- Uslub: [klassik | minimal | romantik | zamonaviy | milliy]
- Rang guruhi: [bordo | yashil | oltin | krem | moviy | qizil | pushti]
- Kayfiyat va tasvir: [masalan: krem fon, oltin ingichka naqshlar, burchaklarda atirgul shoxlari,
  o‘zbek girih naqshi nozik fon sifatida, kirish ekranida muhrli konvert ochiladi]
- Ranglar: [masalan: fon #f6efe4, urg‘u #c9a25e, matn #4a1826]
- Sarlavha shrifti: [Pinyon Script | Cinzel | Cormorant Garamond]
- Qo‘shimcha bo‘limlar: [masalan: dastur (vaqt, nomi, davomiyligi, 12 tagacha), kiyinish uslubi,
  ota-onalar ismlari]
- Narx: [149000] so‘m

## Qat’iy texnik qoidalar (Shohnoma shablon formati v1)

1. Natija 3 ta fayl: `template.json`, `index.html`, `style.css`. Rasmlar kerak bo‘lsa — `assets/`
   papkasidagi fayl nomlarini ishlat va oxirida har biri uchun aniq tavsif ber (o‘lcham, nima tasvirlangan,
   shaffof fonmi). Rasm o‘rniga iloji boricha inline SVG va CSS (gradient, naqsh) ishlat.

2. `index.html` — faqat <body> ichidagi kontent. <html>, <head>, <script>, <style>, <iframe>, <form>,
   on…="" atributlari, tashqi http(s) havolalar, Google Fonts — TAQIQLANADI.

3. Mijoz ma’lumotlari faqat belgilar bilan, hech qachon qattiq yozilmaydi:
   {{personA}} {{personB}} {{names}} {{initials}} {{date}} {{dateShort}} {{day}} {{month}}
   {{monthName}} {{year}} {{weekday}} {{time}} {{venueName}} {{address}} {{message}}
   {{ceremonyLabel}} {{invitePhrase}}
   Shartlar: {{#if key}}…{{else}}…{{/if}}, {{#unless key}}…{{/unless}}
   Ro‘yxat: {{#each program}}…{{time}} {{title}}…{{/each}}, ichida {{@number}}, {{@first}}, {{@last}}
   personB bo‘sh bo‘lishi mumkin — {{#if personB}} bilan o‘ra.

4. Ishlaydigan qismlar — faqat tizim teglari (ichini yozma, faqat joyiga qo‘y):
   <sh-open>Taklifnomani ochish</sh-open>  — kirish ekrani tugmasi; bosilganda body ga .sh-opened
   <sh-countdown></sh-countdown>             — sanoq
   <sh-map></sh-map>                         — xarita
   <sh-gallery></sh-gallery>                 — mijoz rasmlari
   <sh-rsvp></sh-rsvp>                       — MAJBURIY, mehmon javobi formasi
   <sh-music src="assets/music.mp3"></sh-music>, <sh-calendar></sh-calendar>, <sh-share></sh-share>
   Ularni faqat CSS o‘zgaruvchilari bilan bezat:
   --sh-accent --sh-ink --sh-soft --sh-surface --sh-line --sh-radius --sh-font-title --sh-font-body

5. Animatsiya faqat CSS. Paydo bo‘lish: data-sh-reveal="up|fade|scale|left|right",
   kechikish data-sh-delay="ms". Ekranga kirganda elementga .sh-in qo‘shiladi — o‘z effektlaringni
   shunga bog‘lashing mumkin. Kirish ekrani ochilishi: .sh-opened .selector { … }.
   Animatsiyalar silliq bo‘lsin: faqat transform va opacity, 0.8–1.6s, cubic-bezier(.2,1,.3,1).

6. Mobil birinchi (360–430 px), laptop uchun @media (min-width:1024px). 100vh o‘rniga 100dvh.
   360 px da gorizontal scroll bo‘lmasin. Uzun ismlar («Muhammadamin & Nilufarxon») sig‘sin.
   Dastur 1 qatordan 12 qatorgacha, galereya 0 dan 20 rasmgacha bo‘lganda ham dizayn buzilmasin.

7. Shriftlar: faqat Cormorant Garamond, Pinyon Script, Cinzel, Inter (tizimda bor) yoki
   @font-face { src:url("assets/…woff2") }.

8. Til — o‘zbek lotin. O‘ va g‘ uchun ‘ (U+2018) belgisi: «to‘y», «bog‘», «qo‘shiq».
   Matnlar samimiy va hurmatli: «Aziz mehmonlar!», «Sizni kutib qolamiz».

9. `template.json` sxemasi:
{
  "format": 1, "slug": "...", "name": "...", "ceremony": "...", "style": "...", "color": "...",
  "price": 0, "priceOld": 0, "description": "1–2 gap",
  "palette": ["#...", "#...", "#..."],
  "fonts": { "title": "...", "body": "..." },
  "sample": { "personA": "...", "personB": "...", "date": "YYYY-MM-DDTHH:MM", "venueName": "...",
              "address": "...", "message": "...", "program": [ {…} ] },
  "fields": [
    { "key": "program", "type": "list", "label": "Marosim dasturi", "min": 1, "max": 12,
      "item": { "time": {"type":"time","label":"Vaqt","required":true},
                "title": {"type":"text","label":"Nomi","required":true,"max":60},
                "duration": {"type":"text","label":"Davomiyligi","max":20} } },
    { "key": "dressCode", "type": "text", "label": "Kiyinish uslubi", "max": 80 }
  ]
}
   Maydon turlari: text, textarea, time, date, number, select (options bilan), list (item bilan).
   HTML dagi har bir qo‘shimcha {{key}} va {{#each key}} albatta `fields` da e’lon qilingan bo‘lsin.

## Sahifa tarkibi (tartib tavsiya)
1. Kirish ekrani (to‘liq ekran): marosim nomi, ismlar, sana, <sh-open>
2. Taklif matni: «Aziz mehmonlar!» + {{message}}
3. Sana va vaqt bloki + <sh-countdown>
4. Dastur ({{#each program}}), qo‘shimcha maydonlar
5. Joy: {{venueName}}, {{address}}, <sh-map>
6. <sh-gallery>
7. <sh-rsvp>
8. Yakun: minnatdorchilik, ismlar, <sh-music>

## Natija formati
- ```json template.json```, ```html index.html```, ```css style.css``` — to‘liq, qisqartirmasdan
- So‘ng: `assets/` uchun kerakli fayllar ro‘yxati (nomi, o‘lchami, tavsifi)
- So‘ng: o‘z-o‘zini tekshiruv — yo‘riqnomaning 9-bo‘limidagi sifat ro‘yxati bo‘yicha har bandga ✅/❌
```

---

## Maslahatlar

- **Figma’dan:** promptga «Figma maketiga aynan mos qil» deb, maket skrinshotini (telefon va laptop)
  qo‘shing. Rasmlarni Figma’dan WEBP qilib eksport qilib, `assets/` ga o‘zingiz qo‘yasiz.
- **Bir nechta variant:** «Shu g‘oyadan 3 xil kirish ekrani varianti ber» — so‘ng eng yoqqanini
  to‘liq qilishni so‘rang.
- **Tuzatish:** yuklashda tizim xato ko‘rsatsa (masalan «`{{dressCode}}` fields da yo‘q»),
  xato matnini AI’ga yuboring: «Shu xatoni tuzat, qolganini o‘zgartirma».
- **ZIP qilish:** `template.json`, `index.html`, `style.css` va `assets/` papkani bitta papkaga qo‘yib,
  papka *ichidagi* fayllarni belgilab ZIP qiling (papkaning o‘zini emas).
- To‘liq qoidalar: `docs/SHABLON-YORIQNOMA.md`.
