"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, api } from "@/components/ui";
import { DocumentUpload } from "@/components/icons";

type Result = { template: { slug: string; name: string }; warnings: string[]; updated: boolean };

/** HTML shablon ZIP yuklash oynasi. replace — mavjud HTML shablonni yangi versiyaga almashtirish */
export function ZipUpload({ open, onClose, replace, onDone }: { open: boolean; onClose: () => void; replace?: string; onDone?: () => void }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [drag, setDrag] = useState(false);

  const reset = () => {
    setFile(null);
    setErrors([]);
    setResult(null);
    if (input.current) input.current.value = "";
  };
  const close = () => {
    reset();
    onClose();
  };
  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setErrors([]);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api<Result>(`/api/admin/templates-zip${replace ? `?replace=${encodeURIComponent(replace)}` : ""}`, { method: "POST", body: fd });
      setResult(r);
      onDone?.();
    } catch (e) {
      setErrors((e as Error).message.split("\n").filter(Boolean));
    } finally {
      setBusy(false);
    }
  };
  const pick = (f: File | undefined) => {
    if (!f) return;
    setErrors(f.name.toLowerCase().endsWith(".zip") ? [] : ["Faqat .zip fayl yuklang"]);
    setFile(f.name.toLowerCase().endsWith(".zip") ? f : null);
    setResult(null);
  };

  return (
    <Modal open={open} onClose={close} label="HTML shablon yuklash" className="sm:max-w-[560px]">
      <div className="flex flex-col gap-5 p-6">
        <div>
          <h2 className="font-serif text-[28px] font-light text-ink">{replace ? "Yangi versiya yuklash" : "HTML shablon yuklash"}</h2>
          <p className="t-body-s mt-1 text-ink-2">
            ZIP ichida: <code>template.json</code>, <code>index.html</code>, <code>style.css</code>, <code>assets/</code>.{" "}
            <a href="/sh/starter-kit.zip" className="text-maroon underline" download>
              Namuna ZIP (starter kit)
            </a>{" "}
            — yo‘riqnoma va AI prompti loyihaning <code>docs/</code> papkasida.
          </p>
        </div>

        {result ? (
          <div className="flex flex-col gap-3">
            <p className="rounded-[14px] p-4 t-body-m" style={{ color: "var(--color-success)", background: "var(--success-bg)" }}>
              ✓ «{result.template.name}» {result.updated ? "yangilandi" : "qo‘shildi"}.{" "}
              {!result.updated && "U hozircha yashirin — narxni tekshirib, «Saytda ko‘rinadi» ni yoqing."}
            </p>
            {result.warnings.length > 0 && (
              <div className="rounded-[14px] p-4 t-body-s" style={{ color: "var(--color-pending)", background: "var(--pending-bg)" }}>
                <p className="mb-1 font-semibold">Ogohlantirishlar (avtomatik tuzatildi):</p>
                <ul className="list-disc pl-5">
                  {result.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <a href={`/namuna/${result.template.slug}/`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                Namunani ochish
              </a>
              {!replace && (
                <button type="button" onClick={() => router.push(`/admin/shablonlar/tahrir/?slug=${result.template.slug}`)} className="btn btn-primary btn-sm">
                  Sozlash
                </button>
              )}
              {replace && (
                <button type="button" onClick={close} className="btn btn-primary btn-sm">
                  Yopish
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => input.current?.click()}
              onDragOver={(e) => (e.preventDefault(), setDrag(true))}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                pick(e.dataTransfer.files[0]);
              }}
              className={`flex flex-col items-center gap-2 rounded-[18px] border-2 border-dashed px-6 py-10 text-center transition-colors ${
                drag ? "border-maroon bg-maroon/[0.04]" : "border-line hover:border-maroon/50"
              }`}
            >
              <DocumentUpload size={28} className="text-maroon" />
              <span className="t-title text-ink">{file ? file.name : "ZIP faylni tanlang yoki shu yerga tashlang"}</span>
              <span className="t-body-s text-ink-2">{file ? `${(file.size / 1024).toFixed(0)} KB` : "15 MB gacha"}</span>
            </button>
            <input ref={input} type="file" accept=".zip,application/zip" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
            {errors.length > 0 && (
              <div className="rounded-[14px] p-4 t-body-s" style={{ color: "var(--color-danger)", background: "var(--danger-bg)" }}>
                <p className="mb-1 font-semibold">Yuklab bo‘lmadi — tuzating va qayta yuklang:</p>
                <ul className="list-disc pl-5">
                  {errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={close} className="btn btn-secondary btn-sm">
                Bekor qilish
              </button>
              <button type="button" onClick={upload} disabled={!file || busy} className="btn btn-primary btn-sm">
                {busy ? "Tekshirilmoqda…" : "Yuklash"}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
