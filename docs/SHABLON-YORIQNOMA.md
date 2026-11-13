# Shohnoma — shablon yo‘riqnomasi (v1)

Bu hujjat Shohnoma.uz uchun **taklifnoma shablonini** qanday tayyorlashni tushuntiradi.
Shablon — bitta ZIP fayl. Admin uni **Admin → Shablonlar → Yuklash** orqali yuklaydi, tizim tekshiradi,
namunali ko‘rinishini ko‘rsatadi va katalogga qo‘shadi.

> **Yuklash:** Admin → Shablonlar → «HTML shablon yuklash (ZIP)». Namuna paket: `/sh/starter-kit.zip`
> (manba — `docs/shablon-namuna/oq-gul/`). Yangi shablon yashirin holda qo‘shiladi: narxni tekshirib,
> «Saytda ko‘rinadi» ni yoqing. Yangilash — shablon tahrir sahifasidagi «Yangi versiya (ZIP)».

**Asosiy qoida: dizayn — dizaynerniki, funksiya — tizimniki.**
Siz HTML/CSS bilan ko‘rinishni yasaysiz; mehmon javobi, sanoq, xarita, musiqa, galereya kabi
ishlaydigan qismlarni tizim beradi — siz ularni tayyor teg (`<sh-…>`) bilan joyiga qo‘yasiz.

---

## 1. Paket tuzilishi

```
mening-shablonim.zip
├── template.json          ← majburiy: shablon ma’lumotlari va maydonlar
├── index.html             ← majburiy: dizayn (belgilar bilan)
├── style.css              ← majburiy: barcha uslublar
├── assets/                ← ixtiyoriy: rasmlar, shriftlar, musiqa
│   ├── bg.webp
│   ├── flowers.webp
│   ├── font.woff2
│   └── music.mp3
├── preview-phone.webp     ← ixtiyoriy (bo‘lmasa katalogda jonli ko‘rinish chiqadi), 600×1300
└── preview-laptop.webp    ← ixtiyoriy (bo‘lmasa katalogda jonli ko‘rinish chiqadi), 1280×800
```

Cheklovlar:

| Narsa | Cheklov |
|---|---|
| ZIP hajmi | ≤ 15 MB |
| Bitta rasm | ≤ 1.5 MB, WEBP/PNG/JPG/SVG (WEBP tavsiya) |
| Shrift | WOFF2, ≤ 300 KB har biri |
| Musiqa | MP3, ≤ 4 MB, 2–4 daqiqa |
| Fayl nomlari | faqat lotin kichik harf, raqam, `-` `_` `.` |
| Yo‘llar | faqat nisbiy: `assets/bg.webp` (`http://…` va `/…` taqiqlanadi) |

---

## 2. `template.json`

```json
{
  "format": 1,
  "slug": "oltin-bog",
  "name": "Oltin bog‘",
  "ceremony": "nikoh",
  "style": "klassik",
  "color": "oltin",
  "price": 149000,
  "priceOld": 199000,
  "description": "Krem fonda oltin naqshlar va bog‘ gullari. Nafis va tantanali.",
  "palette": ["#f6efe4", "#c9a25e", "#4a1826"],
  "fonts": {
    "title": "Pinyon Script",
    "body": "Cormorant Garamond"
  },
  "sample": {
    "personA": "Jasur",
    "personB": "Madina",
    "date": "2026-09-12T18:00",
    "venueName": "Oqsaroy to‘yxonasi",
    "address": "Toshkent, Yunusobod tumani, Amir Temur ko‘chasi 15",
    "message": "Hayotimizning eng baxtli kunida yonimizda bo‘lishingizni istaymiz.",
    "program": [
      { "time": "18:00", "title": "Mehmonlarni kutib olish", "duration": "30 daqiqa" },
      { "time": "18:30", "title": "Nikoh marosimi", "duration": "1 soat" },
      { "time": "19:30", "title": "Tantanali kechki ziyofat" }
    ]
  },
  "fields": [
    {
      "key": "program",
      "type": "list",
      "label": "Marosim dasturi",
      "min": 1,
      "max": 12,
      "item": {
        "time":     { "type": "time", "label": "Vaqt", "required": true },
        "title":    { "type": "text", "label": "Nomi", "required": true, "max": 60 },
        "duration": { "type": "text", "label": "Davomiyligi", "max": 20 }
      }
    },
    { "key": "dressCode", "type": "text", "label": "Kiyinish uslubi", "max": 80 },
    {
      "key": "parents",
      "type": "list",
      "label": "Ota-onalar",
      "max": 4,
      "item": { "name": { "type": "text", "label": "Ism", "required": true } }
    }
  ]
}
```

### Qiymatlar

| Maydon | Qiymatlar |
|---|---|
| `ceremony` | `nikoh` · `fotiha` · `sunnat` · `tugilgan-kun` |
| `style` | `klassik` · `minimal` · `romantik` · `zamonaviy` · `milliy` |
| `color` | `bordo` · `yashil` · `oltin` · `krem` · `moviy` · `qizil` · `pushti` (katalog filtri uchun) |
| `slug` | lotin kichik harf, raqam, `-`; 3–60 belgi; takrorlanmas |
| `price`, `priceOld` | so‘mda, butun son (admin keyin o‘zgartirishi mumkin) |
| `sample` | katalog ko‘rinishi va namuna sahifasida chiqadigan ma’lumotlar |

---

## 3. Maydonlar: majburiy va qo‘shimcha

### 3.1. Majburiy maydonlar (har shablonda bor, `fields` ga yozilmaydi)

Bular mijozning buyurtma formasida doim so‘raladi. Kabinet, havola va xabarnomalar shularga tayanadi.

| Belgi | Ma’nosi | Misol |
|---|---|---|
| `{{personA}}` | 1-ism | Jasur |
| `{{personB}}` | 2-ism (sunnat/tug‘ilgan kunda bo‘sh bo‘lishi mumkin) | Madina |
| `{{names}}` | tayyor birikma | Jasur & Madina |
| `{{initials}}` | bosh harflar | J M |
| `{{date}}` | sana, to‘liq | 12 sentabr 2026 |
| `{{dateShort}}` | sana, nuqtali | 12 · 09 · 2026 |
| `{{day}}` `{{month}}` `{{monthName}}` `{{year}}` `{{weekday}}` | sana qismlari | 12 · 09 · sentabr · 2026 · shanba |
| `{{time}}` | boshlanish vaqti | 18:00 |
| `{{venueName}}` | to‘yxona nomi | Oqsaroy to‘yxonasi |
| `{{address}}` | manzil | Toshkent, Yunusobod… |
| `{{message}}` | taklif matni | Hayotimizning eng baxtli… |
| `{{ceremonyLabel}}` | marosim nomi | Nikoh to‘yi |
| `{{invitePhrase}}` | marosimga mos ibora | sizni to‘yimizga taklif qiladi |

### 3.2. Qo‘shimcha maydonlar (`fields` da e’lon qilinadi)

Har shablon o‘ziga kerakli maydonlarni qo‘shadi — **buyurtma formasi shu ro‘yxatdan avtomatik quriladi.**
Bitta shablonda dastur 3 qator, boshqasida 12 qator va «davomiyligi» ustuni bilan bo‘lishi mumkin.

| `type` | Formada | Shablonda |
|---|---|---|
| `text` | bir qatorli matn | `{{dressCode}}` |
| `textarea` | ko‘p qatorli matn | `{{story}}` (qatorlar `<br>` ga aylanadi) |
| `time` | vaqt tanlash | `{{afterParty}}` |
| `date` | sana tanlash | `{{engagementDate}}` |
| `number` | son | `{{guestsLimit}}` |
| `select` | ro‘yxatdan tanlash (`"options": ["…","…"]`) | `{{theme}}` |
| `list` | qo‘shiladigan qatorlar (`item` ichida ustunlar) | `{{#each program}}…{{/each}}` |

Maydon sozlamalari: `label` (majburiy), `required`, `max` (belgi soni yoki `list` uchun qator soni),
`min`, `placeholder`, `hint`, `default`.

Kalit (`key`) nomlari: lotin, camelCase, takrorlanmas. Majburiy maydon nomlarini (`personA`, `date`, …)
qayta e’lon qilmang.

---

## 4. `index.html` — belgilar sintaksisi

Faqat `<body>` ichidagi qism yoziladi (`<html>`, `<head>`, `<script>` yo‘q — ularni tizim qo‘yadi).

```html
<main class="invite">
  <section class="hero" data-sh-reveal="fade">
    <p class="ceremony">{{ceremonyLabel}}</p>
    <h1 class="names">{{personA}}{{#if personB}} <span>&amp;</span> {{personB}}{{/if}}</h1>
    <p class="date">{{dateShort}} · {{time}}</p>
    <sh-open class="open-btn">Taklifnomani ochish</sh-open>
  </section>

  <section class="message" data-sh-reveal="up">
    <p>Aziz mehmonlar!</p>
    <p>{{message}}</p>
  </section>

  <section class="countdown" data-sh-reveal="up">
    <sh-countdown></sh-countdown>
  </section>

  {{#if program}}
  <section class="program" data-sh-reveal="up">
    <h2>Marosim dasturi</h2>
    <ol>
      {{#each program}}
      <li>
        <b>{{time}}</b> {{title}}
        {{#if duration}}<small>· {{duration}}</small>{{/if}}
      </li>
      {{/each}}
    </ol>
  </section>
  {{/if}}

  {{#if dressCode}}
  <p class="dress">Kiyinish uslubi: {{dressCode}}</p>
  {{/if}}

  <section class="place" data-sh-reveal="up">
    <h2>{{venueName}}</h2>
    <p>{{address}}</p>
    <sh-map></sh-map>
  </section>

  <sh-gallery></sh-gallery>
  <sh-rsvp></sh-rsvp>
  <sh-music src="assets/music.mp3"></sh-music>
</main>
```

### Sintaksis qoidalari

| Yozuv | Ma’nosi |
|---|---|
| `{{key}}` | qiymat (HTML xavfsiz holda qo‘yiladi) |
| `{{#if key}} … {{/if}}` | qiymat bo‘lsa ko‘rsatish |
| `{{#if key}} … {{else}} … {{/if}}` | aks holda |
| `{{#unless key}} … {{/unless}}` | qiymat bo‘lmasa ko‘rsatish |
| `{{#each list}} … {{/each}}` | ro‘yxat qatorlari; ichida ustun nomlari: `{{time}}`, `{{title}}` |
| `{{@index}}` `{{@number}}` | qator tartibi (0 dan / 1 dan) |
| `{{@first}}` `{{@last}}` | birinchi/oxirgi qatorda `true` |

Boshqa hech qanday kod yo‘q: funksiya, hisob-kitob, tashqi chaqiruv — taqiqlanadi.

---

## 5. Tizim teglari (`<sh-…>`)

Ishlaydigan qismlar. Ichki tuzilishi tizimniki — siz faqat **o‘rnini** belgilaysiz va CSS bilan
**ko‘rinishini** o‘zgartirasiz (teg o‘zgaruvchilari orqali).

| Teg | Vazifasi | Majburiy |
|---|---|---|
| `<sh-rsvp>` | Mehmon javobi formasi (boraman / aniq emas / kela olmayman, kishi soni, tilak) | **ha** |
| `<sh-countdown>` | To‘yga qadar kun/soat/daqiqa | yo‘q |
| `<sh-map>` | Xarita va «Yo‘nalish» tugmalari (Yandex/Google) | yo‘q |
| `<sh-gallery>` | Mijoz yuklagan rasmlar (rasm bo‘lmasa — ko‘rinmaydi) | yo‘q |
| `<sh-music src="assets/…">` | Fon musiqasi tugmasi (mijoz o‘chirib qo‘yishi mumkin) | yo‘q |
| `<sh-open>` | Kirish ekrani tugmasi: bosilganda sahifa ochiladi (`.sh-opened` klassi qo‘shiladi) | yo‘q |
| `<sh-calendar>` | «Kalendarga qo‘shish» tugmasi | yo‘q |
| `<sh-share>` | «Havolani ulashish» tugmasi | yo‘q |
| `<sh-guest>Hurmatli {name}!</sh-guest>` | Shaxsiy murojaat: mehmon havolasi (maxsus mehmon `?g=` yoki `?m=Ism`) bilan ochilganda `{name}` o‘rniga ismi; ism bo‘lmasa ko‘rinmaydi | yo‘q |

### Teglarni bezash

Har teg CSS o‘zgaruvchilarini o‘qiydi — ularni `:root` yoki teg ustida bering:

```css
:root {
  --sh-accent: #c9a25e;        /* tugmalar, urg‘u */
  --sh-ink: #4a1826;           /* asosiy matn */
  --sh-soft: #8a6a55;          /* ikkilamchi matn */
  --sh-surface: #fffaf1;       /* kartalar foni */
  --sh-line: rgba(201,162,94,.4);
  --sh-radius: 18px;
  --sh-font-title: "Pinyon Script", cursive;
  --sh-font-body: "Cormorant Garamond", serif;
}
sh-rsvp { --sh-surface: #fff; }   /* faqat shu blok uchun */
```

Teg ichidagi elementlarga ham klass orqali yetish mumkin: `.sh-rsvp__button`, `.sh-countdown__num`,
`.sh-countdown__label`, `.sh-map__frame`, `.sh-gallery__item` va h.k. (to‘liq ro‘yxat — starter kit’da).

---

## 6. CSS va animatsiya

- Barcha uslublar **`style.css`** da. Inline `style="…"` mumkin, lekin `url()` faqat `assets/…` ga.
- Shriftlar: `@font-face { src: url("assets/font.woff2"); }` yoki tizimdagi tayyor shriftlar:
  `Cormorant Garamond`, `Pinyon Script`, `Cinzel`, `Inter` (yuklash shart emas).
- **Mobil birinchi:** asosiy dizayn 360–430 px kenglik uchun; laptop uchun `@media (min-width: 1024px)`.
- `100vh` o‘rniga `100dvh` ishlating (telefon brauzerlarida to‘g‘ri chiqadi).
- Animatsiya — faqat CSS. Paydo bo‘lish uchun tayyor atributlar:

| Atribut | Effekt |
|---|---|
| `data-sh-reveal="up"` | pastdan chiqadi |
| `data-sh-reveal="fade"` | xira holatdan paydo bo‘ladi |
| `data-sh-reveal="scale"` | kichikdan kattalashadi |
| `data-sh-reveal="left"` / `"right"` | yondan kiradi |
| `data-sh-delay="300"` | kechikish, ms |

Element ekranga kirganda tizim `.sh-in` klassini qo‘shadi — o‘z animatsiyangizni shunga bog‘lashingiz mumkin:
```css
.flower { transform: scale(.8); opacity: 0; transition: 1.2s cubic-bezier(.2,1,.3,1); }
.flower.sh-in { transform: none; opacity: 1; }
```
- Kirish ekrani (`<sh-open>`) bosilgach `<body>` ga `.sh-opened` qo‘shiladi:
```css
.envelope { transition: transform 1s; }
.sh-opened .envelope { transform: translateY(-100%); }
```
- `prefers-reduced-motion` uchun tizim animatsiyalarni o‘zi o‘chiradi.

---

## 7. Taqiqlar (yuklashda avtomatik olib tashlanadi yoki rad etiladi)

- `<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>` (formalar — faqat `<sh-rsvp>`)
- `on…=""` atributlari (`onclick`, `onload`, …), `javascript:` havolalar
- Tashqi manbalar: `http(s)://…` dagi rasm/shrift/CSS (Google Fonts ham — shriftni `assets/` ga qo‘ying)
- `@import` (tashqi), `position: fixed` bilan butun ekranni yopish (tizim tugmalarini to‘sib qo‘yadi)
- Mijoz matni uchun belgisiz qattiq yozilgan ismlar/sanalar (masalan `<h1>Jasur & Madina</h1>`) —
  ular **har doim** `{{…}}` belgisi bilan bo‘lishi kerak

---

## 8. Yuklashda tekshiruv

Tizim ZIP’ni ochib quyidagilarni tekshiradi va xatoni aniq ko‘rsatadi:

1. `template.json`, `index.html`, `style.css` bor va o‘qiladi
2. `template.json` sxemaga mos (marosim, uslub, maydon turlari, slug band emas)
3. Majburiy belgilar bor: `{{personA}}`, `{{date}}` yoki `{{dateShort}}`, `{{venueName}}`, `<sh-rsvp>`
4. HTML’dagi har `{{key}}` yoki majburiy ro‘yxatda, yoki `fields` da e’lon qilingan
5. `{{#each x}}` dagi `x` — `list` turidagi maydon; ichidagi ustunlar `item` da bor
6. `assets/` dagi fayllar havolalari to‘g‘ri, hajmlar cheklovdan oshmagan
7. Taqiqlangan narsalar yo‘q (7-bo‘lim)

So‘ng `sample` ma’lumotlari bilan namuna sahifasi ochiladi (`/namuna/<slug>/`), katalog kartasida jonli ko‘rinish chiqadi.
Admin narxni tasdiqlab **«Faol»** qiladi.

---

## 9. Sifat ro‘yxati (yuklashdan oldin)

- [ ] Uzun ismlar sig‘adi: «Muhammadamin & Nilufarxon» bir-ikki qatorda chiroyli chiqadi
- [ ] `personB` bo‘sh bo‘lsa ham dizayn buzilmaydi (sunnat to‘yi, tug‘ilgan kun)
- [ ] Dastur 1 qatorda ham, 12 qatorda ham yaxshi ko‘rinadi
- [ ] Rasmlar 0 ta yoki 20 ta bo‘lsa ham joylashuv buzilmaydi
- [ ] 360 px telefonda gorizontal scroll yo‘q
- [ ] Matn va fon kontrasti yetarli (oq fonda och-oltin matn emas)
- [ ] Barcha rasmlar WEBP, umumiy hajm ≤ 5 MB (tez ochilishi uchun)
- [ ] O‘zbek lotin harflari to‘g‘ri: **o‘ g‘** — `‘` (U+2018) belgisi, `'` emas
- [ ] `<sh-rsvp>` sahifa oxiriga yaqin, aniq ko‘rinadigan joyda

---

## 10. Misol: minimal to‘liq shablon

`template.json`
```json
{
  "format": 1,
  "slug": "oq-gul",
  "name": "Oq gul",
  "ceremony": "nikoh",
  "style": "minimal",
  "color": "krem",
  "price": 99000,
  "description": "Oq fon, yupqa chiziqlar va bitta gul. Sodda va nafis.",
  "palette": ["#ffffff", "#c9a25e", "#2b2620"],
  "sample": { "personA": "Aziz", "personB": "Lola", "date": "2026-10-03T17:00", "venueName": "Navro‘z saroyi", "address": "Samarqand sh., Registon ko‘chasi 1" },
  "fields": [
    { "key": "program", "type": "list", "label": "Dastur", "max": 6,
      "item": { "time": { "type": "time", "label": "Vaqt", "required": true }, "title": { "type": "text", "label": "Nomi", "required": true } } }
  ]
}
```

`index.html`
```html
<main class="card">
  <img class="flower" src="assets/flower.webp" alt="" data-sh-reveal="scale">
  <p class="label" data-sh-reveal="fade">{{ceremonyLabel}}</p>
  <h1 data-sh-reveal="up">{{names}}</h1>
  <p class="date" data-sh-reveal="up" data-sh-delay="150">{{dateShort}} · {{time}}</p>
  <p class="msg" data-sh-reveal="up" data-sh-delay="250">{{message}}</p>
  <sh-countdown></sh-countdown>
  {{#if program}}<ol class="program">{{#each program}}<li><b>{{time}}</b> {{title}}</li>{{/each}}</ol>{{/if}}
  <h2>{{venueName}}</h2><p>{{address}}</p>
  <sh-map></sh-map>
  <sh-gallery></sh-gallery>
  <sh-rsvp></sh-rsvp>
</main>
```

`style.css`
```css
:root { --sh-accent:#c9a25e; --sh-ink:#2b2620; --sh-soft:#8a8170; --sh-surface:#faf8f4; --sh-font-title:"Cormorant Garamond",serif; }
body { margin:0; background:#fff; color:var(--sh-ink); font-family:"Cormorant Garamond",serif; }
.card { max-width:480px; margin:0 auto; padding:56px 24px; text-align:center; }
.flower { width:120px; }
.label { letter-spacing:.2em; text-transform:uppercase; font-size:12px; color:var(--sh-soft); }
h1 { font-weight:300; font-size:44px; line-height:1.1; margin:12px 0; }
.date { font-size:18px; letter-spacing:.12em; }
.program { list-style:none; padding:0; } .program li { padding:8px 0; border-bottom:1px solid #eee; }
@media (min-width:1024px){ .card{ max-width:640px; } h1{ font-size:64px; } }
```
