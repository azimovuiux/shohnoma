"use client";

/**
 * Oddiy WYSIWYG muharrir (maqolalar uchun): sarlavha H2/H3, qalin, kursiv, ro‘yxatlar, iqtibos, havola, rasm.
 * contentEditable + execCommand — barcha brauzerlarda ishlaydi, kutubxonasiz. Natija HTML; server uni baribir
 * allowlist bilan tozalaydi (php/api/lib/articles.php), shu yerda esa joylashtirilgan (paste) matn soddalashtiriladi.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Modal, api, inputClass, useToast } from "@/components/ui";

type Cmd = { label: ReactNode; title: string; run: () => void; active?: () => boolean };

const ALLOWED = new Set(["P", "H2", "H3", "H4", "STRONG", "B", "EM", "I", "UL", "OL", "LI", "BLOCKQUOTE", "A", "IMG", "BR", "FIGURE", "FIGCAPTION", "HR"]);
const DROP = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "META", "LINK", "TITLE", "NOSCRIPT", "SVG", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "FORM"]);

/** Joylashtirilgan HTML’ni soddalashtirish: faqat ruxsat etilgan teglar, atributlarsiz (href/src/alt dan tashqari) */
function cleanPasted(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const walk = (node: Node, out: Document): Node[] => {
    const res: Node[] = [];
    node.childNodes.forEach((c) => {
      if (c.nodeType === Node.TEXT_NODE) {
        res.push(out.createTextNode(c.textContent ?? ""));
        return;
      }
      if (!(c instanceof Element)) return;
      let tag = c.tagName;
      if (DROP.has(tag)) return;
      if (tag === "H1") tag = "H2";
      if (tag === "H5" || tag === "H6") tag = "H4";
      if (tag === "DIV" || tag === "SECTION" || tag === "ARTICLE") tag = "P";
      const kids = walk(c, out);
      if (!ALLOWED.has(tag)) {
        res.push(...kids);
        return;
      }
      const el = out.createElement(tag);
      if (tag === "A") {
        const href = c.getAttribute("href") ?? "";
        if (/^(https?:|mailto:|tel:|\/|#)/i.test(href)) el.setAttribute("href", href);
      }
      if (tag === "IMG") {
        const src = c.getAttribute("src") ?? "";
        if (!/^(https:\/\/|\/)/.test(src)) return;
        el.setAttribute("src", src);
        el.setAttribute("alt", c.getAttribute("alt") ?? "");
      }
      kids.forEach((k) => el.appendChild(k));
      res.push(el);
    });
    return res;
  };
  const out = document.implementation.createHTMLDocument("");
  const box = out.createElement("div");
  walk(doc.body, out).forEach((n) => box.appendChild(n));
  return box.innerHTML;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function RichEditor({ value, onChange, imageAlt = "" }: { value: string; onChange: (html: string) => void; imageAlt?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef<string | null>(null);
  const savedRange = useRef<Range | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [source, setSource] = useState(false);
  const [, force] = useState(0);
  const [link, setLink] = useState<{ open: boolean; url: string }>({ open: false, url: "" });
  const [uploading, setUploading] = useState(false);

  // Tashqaridan kelgan qiymat (yuklanish, HTML rejimidan qaytish) — faqat o‘zimiz yozmagan bo‘lsa DOM’ga qo‘yamiz
  useEffect(() => {
    const el = ref.current;
    if (!el || source) return;
    if (value !== last.current) {
      el.innerHTML = value;
      last.current = value;
    }
  }, [value, source]);

  useEffect(() => {
    try {
      document.execCommand("defaultParagraphSeparator", false, "p");
    } catch {
      /* eski brauzer */
    }
    const onSel = () => force((n) => n + 1);
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  const emit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const html = el.innerHTML;
    last.current = html;
    onChange(html);
  }, [onChange]);

  const focus = () => ref.current?.focus();
  const exec = (cmd: string, arg?: string) => {
    focus();
    document.execCommand(cmd, false, arg);
    emit();
  };
  const block = (tag: string) => {
    const cur = String(document.queryCommandValue("formatBlock") || "").toLowerCase();
    exec("formatBlock", cur === tag ? "p" : tag);
  };
  const inEditor = () => {
    const sel = window.getSelection();
    return !!(sel && sel.rangeCount && ref.current?.contains(sel.anchorNode));
  };
  const isBlock = (tag: string) => inEditor() && String(document.queryCommandValue("formatBlock") || "").toLowerCase() === tag;
  const state = (cmd: string) => {
    try {
      return inEditor() && document.queryCommandState(cmd);
    } catch {
      return false;
    }
  };

  const saveRange = () => {
    const sel = window.getSelection();
    savedRange.current = sel && sel.rangeCount && ref.current?.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null;
  };
  const restoreRange = () => {
    focus();
    const r = savedRange.current;
    if (!r) return;
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
  };

  const openLink = () => {
    saveRange();
    const sel = window.getSelection();
    const a = sel?.anchorNode?.parentElement?.closest("a");
    setLink({ open: true, url: a?.getAttribute("href") ?? "" });
  };
  const applyLink = () => {
    const url = link.url.trim();
    setLink({ open: false, url: "" });
    restoreRange();
    if (!url) {
      exec("unlink");
      return;
    }
    if (!/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(url)) {
      toast("Havola https://, / yoki mailto: bilan boshlansin", "error");
      return;
    }
    const sel = window.getSelection();
    if (sel && sel.isCollapsed) exec("insertHTML", `<a href="${esc(url)}">${esc(url)}</a>`);
    else exec("createLink", url);
  };

  const uploadImage = async (f: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await api<{ url: string; width?: number; height?: number }>("/api/admin/articles-image", { method: "POST", body: fd });
      restoreRange();
      const size = r.width && r.height ? ` width="${r.width}" height="${r.height}"` : "";
      exec("insertHTML", `<p><img src="${esc(r.url)}" alt="${esc(imageAlt)}"${size}></p><p><br></p>`);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const cmds: (Cmd | "sep")[] = [
    { label: "Matn", title: "Oddiy paragraf", run: () => exec("formatBlock", "p"), active: () => isBlock("p") },
    { label: "H2", title: "Bo‘lim sarlavhasi (mundarijaga tushadi)", run: () => block("h2"), active: () => isBlock("h2") },
    { label: "H3", title: "Kichik sarlavha", run: () => block("h3"), active: () => isBlock("h3") },
    "sep",
    { label: <b>B</b>, title: "Qalin (Ctrl+B)", run: () => exec("bold"), active: () => state("bold") },
    { label: <i className="font-serif text-[17px]">I</i>, title: "Kursiv (Ctrl+I)", run: () => exec("italic"), active: () => state("italic") },
    "sep",
    { label: "• Ro‘yxat", title: "Belgili ro‘yxat", run: () => exec("insertUnorderedList"), active: () => state("insertUnorderedList") },
    { label: "1. Ro‘yxat", title: "Raqamli ro‘yxat", run: () => exec("insertOrderedList"), active: () => state("insertOrderedList") },
    { label: "❝ Iqtibos", title: "Iqtibos", run: () => block("blockquote"), active: () => isBlock("blockquote") },
    "sep",
    { label: "Havola", title: "Havola qo‘yish / olib tashlash", run: openLink },
    { label: uploading ? "Yuklanmoqda…" : "Rasm", title: "Rasm qo‘yish (JPG, PNG, WEBP)", run: () => (saveRange(), fileRef.current?.click()) },
    { label: "Tozalash", title: "Belgilangan matn formatini olib tashlash", run: () => exec("removeFormat") },
    "sep",
    { label: "↶", title: "Bekor qilish (Ctrl+Z)", run: () => exec("undo") },
    { label: "↷", title: "Qaytarish (Ctrl+Shift+Z)", run: () => exec("redo") },
  ];

  return (
    <div className="overflow-hidden rounded-input border border-line bg-bg-base focus-within:border-maroon/55">
      <div className="flex flex-wrap items-center gap-1 border-b border-line bg-bg-soft/95 p-1.5 backdrop-blur">
        {!source &&
          cmds.map((c, i) =>
            c === "sep" ? (
              <span key={i} className="mx-0.5 h-5 w-px bg-line" aria-hidden />
            ) : (
              <button
                key={i}
                type="button"
                title={c.title}
                aria-label={c.title}
                aria-pressed={c.active ? c.active() : undefined}
                onMouseDown={(e) => e.preventDefault()}
                onClick={c.run}
                className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 t-nav transition-colors ${
                  c.active?.() ? "bg-maroon text-ink-inverse" : "text-ink hover:bg-bg-base"
                }`}
              >
                {c.label}
              </button>
            ),
          )}
        <button
          type="button"
          onClick={() => {
            last.current = null; // rejim almashganda muharrir DOM’i qiymatdan qayta to‘ldirilsin
            setSource((v) => !v);
          }}
          className={`ml-auto inline-flex h-8 items-center rounded-lg px-2.5 t-nav transition-colors ${source ? "bg-maroon text-ink-inverse" : "text-ink-2 hover:bg-bg-base"}`}
          title="HTML kodini ko‘rish / tahrirlash"
        >
          {"</>"} HTML
        </button>
      </div>
      {source ? (
        <textarea
          value={value}
          onChange={(e) => {
            last.current = null;
            onChange(e.target.value);
          }}
          spellCheck={false}
          className="block min-h-[480px] w-full resize-y bg-bg-base p-5 font-mono text-[13px] leading-relaxed text-ink outline-none"
        />
      ) : (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Maqola matni"
          data-placeholder="Maqola matnini shu yerga yozing. Bo‘limlarni H2 sarlavha bilan boshlang."
          onInput={emit}
          onBlur={emit}
          onPaste={(e) => {
            e.preventDefault();
            const html = e.clipboardData.getData("text/html");
            const text = e.clipboardData.getData("text/plain");
            const clean = html
              ? cleanPasted(html)
              : text
                  .split(/\n{2,}/)
                  .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
                  .join("");
            document.execCommand("insertHTML", false, clean);
            emit();
          }}
          className="sh-prose min-h-[480px] px-5 py-5 outline-none sm:px-7 [&:empty]:before:text-ink-2/70 [&:empty]:before:content-[attr(data-placeholder)]"
        />
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
      <Modal open={link.open} onClose={() => setLink({ open: false, url: "" })} label="Havola">
        <form
          className="flex flex-col gap-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            applyLink();
          }}
        >
          <p className="font-serif text-[26px] font-light text-ink">Havola</p>
          <label className="flex flex-col gap-1.5">
            <span className="t-body-s text-ink-2">Manzil: https://…, /shablonlar/ yoki mailto:… Bo‘sh qoldirsangiz — havola olib tashlanadi.</span>
            <input autoFocus value={link.url} onChange={(e) => setLink((l) => ({ ...l, url: e.target.value }))} className={inputClass} placeholder="https://" />
          </label>
          <div className="flex justify-end gap-2.5">
            <button type="button" className="btn btn-secondary" onClick={() => setLink({ open: false, url: "" })}>
              Bekor qilish
            </button>
            <button type="submit" className="btn btn-primary">
              Qo‘llash
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
