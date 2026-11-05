"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CloseCircle, Messages, Send2 } from "@/components/icons";
import { Field, Input, PhoneInput, api, phoneDigits } from "@/components/ui";
import { useMe } from "@/lib/client";
import { site } from "@/lib/site";
import { ding, primeAudio } from "@/lib/ding";
import { TelegramIcon } from "./TelegramIcon";

type Msg = { id: number; sender: "user" | "admin" | "bot"; text: string; createdAt: string; pending?: boolean };
type Session = { id: string; name: string; phone: string };
type ChatResp = { session: Session | null; messages: Msg[] };

const time = (iso: string) => new Date(iso).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tashkent" });
const SEEN_KEY = "sh_chat_seen";

/** Suzuvchi chat — har sahifada, o‘ng pastda. Ism + telefon → yozishma (admin panel va Telegram bot orqali javob) */
export function FloatingContact() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [unread, setUnread] = useState(0);
  const lastId = useRef(0);

  const merge = useCallback((list: Msg[]) => {
    if (!list.length) return;
    lastId.current = Math.max(lastId.current, ...list.map((m) => m.id));
    setMsgs((prev) => {
      const ids = new Set(prev.filter((m) => !m.pending).map((m) => m.id));
      const fresh = list.filter((m) => !ids.has(m.id));
      if (!fresh.length) return prev;
      // optimistik (pending) xabarlarni serverdagi nusxasi bilan almashtiramiz
      const pendingTexts = new Set(fresh.filter((m) => m.sender === "user").map((m) => m.text));
      return [...prev.filter((m) => !(m.pending && pendingTexts.has(m.text))), ...fresh];
    });
  }, []);

  const poll = useCallback(async () => {
    try {
      const first = lastId.current === 0;
      const r = await api<ChatResp>(`/api/chat?after=${lastId.current}`);
      setSession(r.session);
      merge(r.messages);
      if (!first && r.messages.some((m) => m.sender === "admin")) ding();
      return r.messages;
    } catch {
      return [];
    }
  }, [merge]);

  useEffect(() => primeAudio(), []);

  // Birinchi yuklash: oldingi chat bormi
  useEffect(() => {
    poll().then((m) => {
      const seen = Number(localStorage.getItem(SEEN_KEY) || 0);
      setUnread(m.filter((x) => x.sender === "admin" && x.id > seen).length);
    });
  }, [poll]);

  // Ochiq: har 4 soniyada; yopiq va chat bor: har 30 soniyada (yangi javob belgisi uchun)
  useEffect(() => {
    if (!session) return;
    const id = window.setInterval(async () => {
      if (document.hidden) return;
      const m = await poll();
      if (!open) setUnread((u) => u + m.filter((x) => x.sender === "admin").length);
    }, open ? 4000 : 30000);
    return () => window.clearInterval(id);
  }, [session, open, poll]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      localStorage.setItem(SEEN_KEY, String(lastId.current));
    }
  }, [open, msgs]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Chat"
          className="fixed inset-0 z-[70] flex flex-col bg-bg-base animate-[fade-in_.2s] sm:inset-auto sm:bottom-24 sm:right-5 sm:h-[min(600px,calc(100dvh-140px))] sm:w-[380px] sm:rounded-[22px] sm:border sm:border-line sm:shadow-[0_24px_60px_-20px_rgba(38,20,10,0.35)] lg:bottom-[104px] lg:right-8"
        >
          <header className="flex items-center gap-3 bg-maroon sm:rounded-t-[22px] px-5 py-4 text-ink-inverse">
            <span className="relative flex size-10 items-center justify-center rounded-full bg-ink-inverse/12">
              <Messages size={20} />
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-maroon bg-[#5fd38d]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="t-title">Shohnoma</p>
              <p className="t-body-s opacity-75">Odatda bir necha daqiqada javob beramiz</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="flex size-9 items-center justify-center rounded-full hover:bg-ink-inverse/10" aria-label="Yopish">
              <CloseCircle size={22} />
            </button>
          </header>
          {session === undefined ? (
            <div className="flex flex-1 items-center justify-center t-body-s text-ink-2">Yuklanmoqda…</div>
          ) : session ? (
            <Conversation msgs={msgs} onSend={(m) => setMsgs((p) => [...p, m])} onSent={poll} onLost={() => setSession(null)} />
          ) : (
            <StartForm
              onStarted={async (s) => {
                setSession(s);
                await poll();
              }}
            />
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Chatni yopish" : "Savolingiz bormi? Yozing"}
        aria-expanded={open}
        className={`group fixed bottom-5 right-5 z-[71] items-center gap-2.5 lg:bottom-8 lg:right-8 ${open ? "hidden sm:flex" : "flex"}`}
      >
        {!open && (
          <span className="hidden rounded-full border border-line bg-bg-base px-4 py-2.5 text-[13px] font-medium leading-none text-ink shadow-[0_4px_6px_rgba(26,13,10,0.08)] lg:block">
            Savolingiz bormi? Yozing
          </span>
        )}
        <span className="relative flex size-14 items-center justify-center rounded-full bg-maroon text-ink-inverse shadow-float transition-transform group-hover:-translate-y-0.5">
          {open ? <CloseCircle size={24} /> : <Messages size={22} />}
          {unread > 0 && !open && (
            <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full border-2 border-bg-base bg-gold text-[11px] font-semibold leading-none text-ink-inverse">
              {unread}
            </span>
          )}
        </span>
      </button>
    </>
  );
}

function StartForm({ onStarted }: { onStarted: (s: Session) => void }) {
  const { me } = useMe();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const u = me?.user;
    if (u?.name) setName((n) => n || u.name || "");
    if (u?.phone) setPhone((p) => p || u.phone!.replace(/^\+998/, "").replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, "$1 $2 $3 $4"));
  }, [me]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setError("Ismingizni kiriting");
    if (phoneDigits(phone).length !== 9) return setError("Telefon raqamni to‘liq kiriting");
    setError(null);
    setBusy(true);
    try {
      const r = await api<{ session: Session }>("/api/chat/start", {
        method: "POST",
        json: { name: name.trim(), phone: `+998${phoneDigits(phone)}`, text: text.trim(), page: location.pathname },
      });
      onStarted(r.session);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
      <div className="rounded-[16px] bg-bg-soft p-4">
        <p className="t-title text-ink">Assalomu alaykum! 👋</p>
        <p className="t-body-s mt-1 text-ink-2">Ismingiz va raqamingizni qoldiring — savolingizga shu yerda javob beramiz.</p>
      </div>
      <Field label="Ismingiz" required>
        <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} autoFocus />
      </Field>
      <Field label="Telefon raqam" required>
        <PhoneInput value={phone} onChange={setPhone} />
      </Field>
      <Field label="Savolingiz (ixtiyoriy)">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={2000}
          className="w-full resize-none rounded-input border border-line bg-bg-base px-4 py-3 t-body-m text-ink outline-none focus:border-maroon/55"
        />
      </Field>
      {error && <p className="t-body-s text-danger">{error}</p>}
      <button type="submit" disabled={busy} className="btn btn-primary w-full">
        {busy ? "Yuborilmoqda…" : "Chatni boshlash"}
      </button>
      <a href={site.telegram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 t-body-s text-ink-2 hover:text-maroon">
        <TelegramIcon size={15} /> yoki Telegramda yozing
      </a>
    </form>
  );
}

function Conversation({ msgs, onSend, onSent, onLost }: { msgs: Msg[]; onSend: (m: Msg) => void; onSent: () => void; onLost: () => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);
  useEffect(() => input.current?.focus(), []);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    setError(null);
    onSend({ id: Date.now(), sender: "user", text: t, createdAt: new Date().toISOString(), pending: true });
    try {
      await api("/api/chat/messages", { method: "POST", json: { text: t } });
      onSent();
    } catch (e) {
      const m = (e as Error).message;
      setError(m);
      if (/topilmadi/.test(m)) onLost();
    }
  };

  return (
    <>
      <div ref={list} className="flex flex-1 flex-col gap-2.5 overflow-y-auto bg-bg-soft/60 px-4 py-5" aria-live="polite">
        {msgs.map((m) => {
          const mine = m.sender === "user";
          return (
            <div key={`${m.id}-${m.pending ? "p" : "s"}`} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              {!mine && <span className="mb-1 px-1 t-body-s text-ink-2">{m.sender === "bot" ? "Shohnoma" : "Menejer"}</span>}
              <div
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-[18px] px-4 py-2.5 t-body-m ${
                  mine ? "rounded-br-[6px] bg-maroon text-ink-inverse" : "rounded-bl-[6px] border border-line bg-bg-base text-ink"
                } ${m.pending ? "opacity-70" : ""}`}
              >
                {m.text}
              </div>
              <span className="mt-1 px-1 text-[11px] text-ink-2">{m.pending ? "yuborilmoqda…" : time(m.createdAt)}</span>
            </div>
          );
        })}
      </div>
      {error && <p className="px-4 pt-2 t-body-s text-danger">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-end gap-2 border-t border-line p-3"
      >
        <textarea
          ref={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Xabar yozing…"
          aria-label="Xabar"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-[14px] border border-line bg-bg-base px-4 py-2.5 t-body-m text-ink outline-none focus:border-maroon/55"
        />
        <button type="submit" disabled={!text.trim()} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-maroon text-ink-inverse transition-opacity disabled:opacity-40" aria-label="Yuborish">
          <Send2 size={18} />
        </button>
      </form>
    </>
  );
}
