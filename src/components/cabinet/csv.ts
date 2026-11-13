"use client";

/**
 * CSV (server o‘zbekcha beradi) — ruscha/inglizcha sarlavha va javob nomlari bilan qayta yozish.
 * statusCol — javob ustuni (0 dan); qo‘shtirnoqli maydonlar (mehmon matni) o‘zgarmaydi.
 */
export type CsvDict = { headers: Record<string, string>; statuses: Record<string, string>; statusCol: number; prefix: [string, string] };
const CSV_HEAD: Record<"ru" | "en", Record<string, string>> = {
  ru: { Mehmon: "Гость", Kishi: "Кол-во", Javob: "Ответ", Tilak: "Пожелание", Vaqt: "Время", Holat: "Статус", Ochgan: "Открыл", "Necha marta": "Сколько раз", "Javobdagi ism": "Имя в ответе", Izoh: "Заметка", Havola: "Ссылка" },
  en: { Mehmon: "Guest", Kishi: "People", Javob: "Answer", Tilak: "Wish", Vaqt: "Time", Holat: "Status", Ochgan: "Opened", "Necha marta": "Times opened", "Javobdagi ism": "Name in answer", Izoh: "Note", Havola: "Link" },
};
const CSV_STATUS: Record<"ru" | "en", Record<string, string>> = {
  ru: { Boraman: "Приду", "Hali aniq emas": "Пока не знаю", "Kela olmayman": "Не смогу прийти", Ochilmagan: "Не открыл", "Ochgan — javob yo‘q": "Открыл — без ответа" },
  en: { Boraman: "Coming", "Hali aniq emas": "Not sure yet", "Kela olmayman": "Can’t come", Ochilmagan: "Not opened", "Ochgan — javob yo‘q": "Opened — no answer" },
};
export const csvDict = (locale: "ru" | "en", statusCol: number, prefix: [string, string]): CsvDict => ({ headers: CSV_HEAD[locale], statuses: CSV_STATUS[locale], statusCol, prefix });

function csvTranslate(text: string, d: CsvDict) {
  // Excel UTF-8 ni to‘g‘ri o‘qishi uchun BOM (res.text() uni olib tashlaydi)
  const src = text.replace(/^\uFEFF/, "");
  let out = "\uFEFF";
  let field = "";
  let quoted = false;
  let col = 0;
  let row = 0;
  const flush = () => {
    const plain = !field.startsWith('"');
    if (plain && row === 0 && d.headers[field]) field = d.headers[field];
    else if (plain && row > 0 && col === d.statusCol && d.statuses[field]) field = d.statuses[field];
    out += field;
    field = "";
  };
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      field += c;
      if (c === '"') {
        if (src[i + 1] === '"') field += src[++i];
        else quoted = false;
      }
    } else if (c === '"') {
      field += c;
      quoted = true;
    } else if (c === ";") {
      flush();
      out += c;
      col++;
    } else if (c === "\r" || c === "\n") {
      flush();
      out += c;
      if (c === "\n" || src[i + 1] !== "\n") {
        row++;
        col = 0;
      }
    } else field += c;
  }
  flush();
  return out;
}

export async function downloadCsvTranslated(url: string, filename: string, d: CsvDict) {
  const res = await fetch(url);
  if (!res.ok) throw new Error();
  const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? filename;
  const blob = new Blob([csvTranslate(await res.text(), d)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name.replace(d.prefix[0], d.prefix[1]);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
