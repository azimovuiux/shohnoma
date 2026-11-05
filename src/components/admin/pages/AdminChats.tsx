"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet } from "@/lib/client";
import { api, useToast } from "@/components/ui";
import { Send2 } from "@/components/icons";
import { formatPhoneDisplay } from "@/lib/display";
import { AdminTitle, Empty, fmtDateTime } from "../shared";
import { useReloadCounts } from "../AdminShell";

type Item = { id: string; name: string; phone: string; page: string | null; status: string; unread: number; lastAt: string; lastText: string | null };
type Msg = { id: number; sender: "user" | "admin" | "bot"; text: string; createdAt: string };

export function AdminChats() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [tg, setTg] = useState<boolean | null>(null);
  const reloadCounts = useReloadCounts();

  const loadList = useCallback(async () => {
    try {
      const r = await apiGet<{ items: Item[] }>("/api/admin/chats");
      setItems(r.items);
    } catch {
      /* keyingi so‘rovda */
    }
  }, []);

  useEffect(() => {
    loadList();
    apiGet<{ configured: boolean }>("/api/admin/telegram/status").then((r) => setTg(r.configured)).catch(() => setTg(false));
    const id = window.setInterval(() => !document.hidden && loadList(), 5000);
    return () => window.clearInterval(id);
  }, [loadList]);

  const current = items?.find((i) => i.id === active) ?? null;

  return (
    <>
      <AdminTitle
        title="Chatlar"
        sub="Saytdagi chat orqali yozgan mijozlar. Javobingiz mijozning ekranida darhol chiqadi."
        right={
          tg === false ? (
            <Link href="/admin/sozlamalar/" className="btn btn-secondary btn-sm">
              Telegram botni ulash
            </Link>
          ) : null
        }
      />
      {items === null ? (
        <p className="t-body-m text-ink-2">Yuklanmoqda…</p>
      ) : items.length === 0 ? (
        <Empty>Hali chat yo‘q</Empty>
      ) : (
        <div className="grid min-h-[560px] overflow-hidden rounded-panel border border-line lg:grid-cols-[340px_1fr]">
          <ul className={`max-h-[70vh] divide-y divide-line overflow-y-auto border-line lg:border-r ${active ? "hidden lg:block" : ""}`}>
            {items.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => setActive(i.id)}
                  className={`flex w-full flex-col gap-1 px-4 py-3.5 text-left transition-colors hover:bg-bg-soft ${active === i.id ? "bg-bg-soft" : ""}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate t-title text-ink">{i.name}</span>
                    {i.unread > 0 && <span className="rounded-full bg-maroon px-1.5 py-0.5 text-[11px] font-semibold leading-none text-ink-inverse">{i.unread}</span>}
                  </span>
                  <span className="t-body-s text-ink-2">{formatPhoneDisplay(i.phone)} · {fmtDateTime(i.lastAt)}</span>
                  {i.lastText && <span className="truncate t-body-s text-ink-2">{i.lastText}</span>}
                </button>
              </li>
            ))}
          </ul>
          {current ? (
            <Thread key={current.id} item={current} onBack={() => setActive(null)} onRead={() => (loadList(), reloadCounts())} />
          ) : (
            <div className="hidden items-center justify-center t-body-m text-ink-2 lg:flex">Chapdan chatni tanlang</div>
          )}
        </div>
      )}
    </>
  );
}

function Thread({ item, onBack, onRead }: { item: Item; onBack: () => void; onRead: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const last = useRef(0);
  const box = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const r = await apiGet<{ messages: Msg[] }>(`/api/admin/chats/${item.id}?after=${last.current}`);
      if (r.messages.length) {
        last.current = r.messages[r.messages.length - 1].id;
        setMsgs((p) => [...p, ...r.messages.filter((m) => !p.some((x) => x.id === m.id))]);
      }
    } catch {
      /* */
    }
  }, [item.id]);

  useEffect(() => {
    load().then(onRead);
    const id = window.setInterval(() => !document.hidden && load(), 3000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    try {
      await api(`/api/admin/chats/${item.id}`, { method: "POST", json: { text: t } });
      setText("");
      await load();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex max-h-[70vh] min-h-[560px] flex-col">
      <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
        <button type="button" onClick={onBack} className="t-nav text-maroon lg:hidden">
          ←
        </button>
        <div className="min-w-0 flex-1">
          <p className="t-title text-ink">{item.name}</p>
          <p className="t-body-s text-ink-2">
            <a href={`tel:${item.phone}`} className="hover:text-maroon">
              {formatPhoneDisplay(item.phone)}
            </a>
            {item.page && <> · {item.page}</>}
          </p>
        </div>
      </div>
      <div ref={box} className="flex flex-1 flex-col gap-2.5 overflow-y-auto bg-bg-soft/50 px-5 py-5">
        {msgs.map((m) => {
          const mine = m.sender !== "user";
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[75%] whitespace-pre-wrap break-words rounded-[16px] px-4 py-2.5 t-body-m ${
                  m.sender === "admin" ? "bg-maroon text-ink-inverse" : m.sender === "bot" ? "bg-gold-soft text-ink" : "border border-line bg-bg-base text-ink"
                }`}
              >
                {m.text}
              </div>
              <span className="mt-1 text-[11px] text-ink-2">
                {m.sender === "bot" ? "Avtomatik · " : ""}
                {fmtDateTime(m.createdAt)}
              </span>
            </div>
          );
        })}
      </div>
      <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) send(e);
          }}
          rows={2}
          placeholder="Javob yozing… (Enter — yuborish, Shift+Enter — yangi qator)"
          className="flex-1 resize-none rounded-[14px] border border-line bg-bg-base px-4 py-2.5 t-body-m text-ink outline-none focus:border-maroon/55"
        />
        <button type="submit" disabled={busy || !text.trim()} className="btn btn-primary !px-5">
          <Send2 size={16} /> Yuborish
        </button>
      </form>
    </div>
  );
}
