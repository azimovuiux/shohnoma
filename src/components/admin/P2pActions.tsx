"use client";

import { useAdminRefresh } from "./shared";
import { useState } from "react";
import { api, Field, Modal, Textarea, useToast } from "@/components/ui";
import { CloseCircle, TickCircle } from "@/components/icons";

const reasons = ["Summa mos kelmadi", "Izohda buyurtma kodi yo‘q", "Chek o‘qilmaydi", "To‘lov kartaga tushmadi"];

export function P2pActions({ paymentId, code }: { paymentId: string; code: string }) {
  const refresh = useAdminRefresh();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  const act = async (action: "approve" | "reject") => {
    setBusy(true);
    try {
      await api(`/api/admin/payments/${paymentId}`, { method: "POST", json: { action, note: action === "reject" ? note : undefined } });
      toast(action === "approve" ? `${code} tasdiqlandi — taklifnoma ochildi` : `${code} rad etildi`);
      setRejecting(false);
      refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => window.confirm(`${code}: to‘lov kartaga tushganini tasdiqlaysizmi?`) && act("approve")}
          className="btn btn-sm flex-1 bg-success text-white hover:opacity-90"
        >
          <TickCircle size={16} /> Tasdiqlash
        </button>
        <button type="button" disabled={busy} onClick={() => setRejecting(true)} className="btn btn-secondary btn-sm flex-1">
          <CloseCircle size={16} /> Rad etish
        </button>
      </div>
      <Modal open={rejecting} onClose={() => setRejecting(false)} label="Chekni rad etish">
        <div className="flex flex-col gap-4 p-6">
          <p className="font-serif text-[26px] font-light text-ink">Chekni rad etish · {code}</p>
          <div className="flex flex-wrap gap-2">
            {reasons.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setNote(r)}
                className={`rounded-full px-3 py-1.5 t-body-s ${note === r ? "bg-maroon text-ink-inverse" : "border border-line text-ink"}`}
              >
                {r}
              </button>
            ))}
          </div>
          <Field label="Sabab (mijozga SMS va Telegram orqali yuboriladi)">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
          </Field>
          <div className="flex gap-2">
            <button type="button" onClick={() => setRejecting(false)} className="btn btn-secondary flex-1">
              Bekor qilish
            </button>
            <button type="button" disabled={busy || !note.trim()} onClick={() => act("reject")} className="btn btn-primary flex-1">
              Rad etish
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
