"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { apiGet } from "@/lib/client";
import { Field, Input, api, confirmDialog, useToast } from "@/components/ui";
import { TelegramIcon } from "@/components/TelegramIcon";
import { TickCircle } from "@/components/icons";
import { AdminError, AdminLoading, AdminTitle } from "../shared";

type Item = { set: boolean; value?: string | null; hint?: string | null; source: "admin" | "env" | null };
type Resp = {
  settings: Record<string, Item>;
  telegram: { bot: string | null; adminLinked: boolean; adminChatIsGroup?: boolean; webhook: string; webhookOk?: boolean; webhookError?: string | null };
};

function Card({ title, sub, children }: { title: string; sub?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5 rounded-panel border border-line bg-bg-base p-6">
      <div>
        <h2 className="font-serif text-[24px] font-light text-ink">{title}</h2>
        {sub && <p className="t-body-s mt-1 text-ink-2">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

function Status({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span
      className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 t-body-s"
      style={ok ? { color: "var(--color-success)", background: "var(--success-bg)" } : { color: "var(--color-pending)", background: "var(--pending-bg)" }}
    >
      {ok && <TickCircle size={14} />} {children}
    </span>
  );
}

export function AdminSettings() {
  const [data, setData] = useState<Resp | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const toast = useToast();

  const load = () =>
    apiGet<Resp>("/api/admin/settings")
      .then(setData)
      .catch((e) => setErr((e as Error).message));
  useEffect(() => {
    load();
  }, []);

  if (err) return <AdminError message={err} onRetry={() => (setErr(null), load())} />;
  if (!data) return <AdminLoading />;

  const save = async (patch: Record<string, string>, msg = "Saqlandi") => {
    const r = await api<Resp>("/api/admin/settings", { method: "PUT", json: patch });
    setData(r);
    toast(msg);
  };

  return (
    <>
      <AdminTitle title="Sozlamalar" sub="Telegram bot va to‘lov ma’lumotlari. O‘zgarishlar darhol kuchga kiradi — serverdagi faylga tegish shart emas." />
      <div className="grid gap-6 xl:grid-cols-2">
        <TelegramCard data={data} save={save} reload={load} />
        <div className="flex flex-col gap-6">
          <FieldsCard
            title="P2P o‘tkazma (karta)"
            sub="Mijoz to‘lov sahifasida ko‘radigan karta."
            fields={[
              ["P2P_CARD", "Karta raqami", "8600 1234 5678 9012"],
              ["P2P_HOLDER", "Karta egasi", "ISM FAMILIYA"],
              ["P2P_BANK", "Bank / tizim", "UZCARD"],
            ]}
            data={data}
            save={save}
          />
          <FieldsCard
            title="Google Analytics"
            sub="Google Tag Manager ID (GTM-XXXXXXX) yoki GA4 Measurement ID (G-XXXXXXXXXX). Kiritilsa — sayt sahifalarida ishlay boshlaydi (admin paneldan tashqari). Bo‘sh qoldirilsa — o‘chadi."
            fields={[["GA_MEASUREMENT_ID", "GTM yoki GA4 ID", "GTM-XXXXXXX"]]}
            data={data}
            save={save}
          />
          <FieldsCard
            title="Payme"
            sub="Payme Business kabinetidagi kassa ma’lumotlari. Ikkalasi to‘ldirilsa — Payme to‘lov usuli yoqiladi."
            fields={[
              ["PAYME_MERCHANT_ID", "Merchant ID", ""],
              ["PAYME_KEY", "Kalit (key)", ""],
            ]}
            data={data}
            save={save}
          />
          <FieldsCard
            title="Click"
            sub="Click merchant kabinetidagi ma’lumotlar. Hammasi to‘ldirilsa — Click to‘lov usuli yoqiladi."
            fields={[
              ["CLICK_SERVICE_ID", "Service ID", ""],
              ["CLICK_MERCHANT_ID", "Merchant ID", ""],
              ["CLICK_MERCHANT_USER_ID", "Merchant user ID", ""],
              ["CLICK_SECRET_KEY", "Secret key", ""],
            ]}
            data={data}
            save={save}
          />
        </div>
      </div>
    </>
  );
}

function TelegramCard({ data, save, reload }: { data: Resp; save: (p: Record<string, string>, m?: string) => Promise<void>; reload: () => void }) {
  const toast = useToast();
  const tok = data.settings.TELEGRAM_BOT_TOKEN;
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [command, setCommand] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  useEffect(() => () => void (timer.current && window.clearInterval(timer.current)), []);
  useEffect(() => {
    if (data.telegram.adminLinked && waiting) {
      setWaiting(false);
      if (timer.current) window.clearInterval(timer.current);
      toast("Telegram ulandi");
    }
  }, [data.telegram.adminLinked, waiting, toast]);

  const saveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await save({ TELEGRAM_BOT_TOKEN: token.trim() }, "Bot ulandi");
      setToken("");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const link = async (group = false) => {
    const win = window.open("", "_blank");
    try {
      const r = await api<{ url: string; groupUrl: string; command: string }>("/api/admin/telegram/link", { method: "POST" });
      setCommand(group ? r.command : null);
      const target = group ? r.groupUrl : r.url;
      if (win) win.location.href = target;
      else window.location.href = target;
      setWaiting(true);
      if (timer.current) window.clearInterval(timer.current);
      timer.current = window.setInterval(reload, 2500);
      window.setTimeout(() => timer.current && window.clearInterval(timer.current), 600000);
    } catch (e) {
      win?.close();
      toast((e as Error).message, "error");
    }
  };

  const disconnect = async () => {
    if (!(await confirmDialog({ title: "Botni o‘chirasizmi?", text: "Telegram orqali kirish va xabarnomalar to‘xtaydi.", ok: "O‘chirish", danger: true }))) return;
    try {
      await save({ TELEGRAM_BOT_TOKEN: "", TELEGRAM_ADMIN_CHAT_ID: "" }, "Bot o‘chirildi");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };

  return (
    <Card title="Telegram bot" sub="Mijozlar shu bot orqali saytga kiradi. Chat xabarlari, buyurtmalar va to‘lovlar haqidagi xabarlar sizga shu botdan keladi.">
      <ol className="flex flex-col gap-5">
        <li className="flex gap-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-maroon t-nav text-ink-inverse">1</span>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <p className="t-title text-ink">Bot tokeni</p>
            {tok.set && data.telegram.bot ? (
              <div className="flex flex-wrap items-center gap-3">
                <Status ok>
                  <a href={`https://t.me/${data.telegram.bot}`} target="_blank" rel="noopener noreferrer" className="underline">
                    @{data.telegram.bot}
                  </a>
                </Status>
                <span className="t-body-s text-ink-2">token {tok.hint}{tok.source === "env" ? " (.env faylidan)" : ""}</span>
              </div>
            ) : (
              <p className="t-body-s text-ink-2">
                Telegramda{" "}
                <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-maroon underline">
                  @BotFather
                </a>{" "}
                → <b>/newbot</b> → bot nomi va username (masalan <i>shohnoma_uz_bot</i>). BotFather bergan tokenni shu yerga qo‘ying.
              </p>
            )}
            <form onSubmit={saveToken} className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={tok.set ? "Yangi token (almashtirish uchun)" : "123456789:AAH…"}
                className="font-mono"
                autoComplete="off"
              />
              <button type="submit" disabled={busy || token.trim().length < 20} className="btn btn-primary shrink-0">
                {busy ? "Tekshirilmoqda…" : "Saqlash"}
              </button>
            </form>
          </div>
        </li>
        <li className="flex gap-4">
          <span className={`flex size-8 shrink-0 items-center justify-center rounded-full t-nav ${tok.set ? "bg-maroon text-ink-inverse" : "bg-bg-soft text-ink-2"}`}>2</span>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <p className="t-title text-ink">Xabarlar sizga kelsin</p>
            <p className="t-body-s text-ink-2">
              <b>Shaxsiy:</b> tugmani bosing — Telegram ochiladi, botda «Start» ni bosing. <br />
              <b>Guruh</b> (bir nechta menejer uchun): «Guruhga ulash» → guruhni tanlang → bot guruhga qo‘shiladi va ulanadi. Guruhdagi istalgan a’zo mijoz xabariga Reply qilib javob bera oladi.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {data.telegram.adminLinked && <Status ok>{data.telegram.adminChatIsGroup ? "Guruh ulangan" : "Shaxsiy chat ulangan"}</Status>}
              {waiting && !data.telegram.adminLinked && <Status ok={false}>Botda «Start» ni bosing…</Status>}
              <button type="button" onClick={() => link(false)} disabled={!tok.set} className="btn btn-sm bg-[#2AABEE] text-white hover:bg-[#229ED9]">
                <TelegramIcon size={16} /> {data.telegram.adminLinked ? "Shaxsiy chatga ulash" : "Telegramni ulash"}
              </button>
              <button type="button" onClick={() => link(true)} disabled={!tok.set} className="btn btn-secondary btn-sm">
                Guruhga ulash
              </button>
            </div>
            {command && !data.telegram.adminLinked && (
              <div className="flex flex-col gap-2 rounded-[14px] bg-bg-soft p-4">
                <p className="t-body-s text-ink">
                  Bot guruhda allaqachon bo‘lsa yoki Telegram guruh tanlashni ko‘rsatmasa — shu buyruqni nusxalab, <b>guruhga yozing</b> (10 daqiqa amal qiladi):
                </p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-bg-base px-3 py-2 font-mono text-[13px] text-ink">{command}</code>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(command).then(() => toast("Nusxalandi"))}
                    className="btn btn-secondary btn-sm shrink-0"
                  >
                    Nusxalash
                  </button>
                </div>
              </div>
            )}
          </div>
        </li>
      </ol>
      {tok.set && data.telegram.bot && (
        <p className="t-body-s">
          {data.telegram.webhookOk ? (
            <span className="text-success">✓ Bot sayt bilan bog‘langan</span>
          ) : (
            <span className="text-danger">Bot sayt bilan bog‘lanmagan — tokenni qayta saqlang</span>
          )}
          {data.telegram.webhookError && <span className="text-danger"> · Telegram xatosi: {data.telegram.webhookError}</span>}
        </p>
      )}
      {tok.set && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <span className="t-body-s text-ink-2">Mijozlar saytda «Telegram orqali kirish» tugmasi bilan kiradi.</span>
          {tok.source === "admin" && (
            <button type="button" onClick={disconnect} className="t-body-s text-danger hover:underline">
              Botni o‘chirish
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

function FieldsCard({
  title,
  sub,
  fields,
  data,
  save,
}: {
  title: string;
  sub: string;
  fields: [string, string, string][];
  data: Resp;
  save: (p: Record<string, string>, m?: string) => Promise<void>;
}) {
  const toast = useToast();
  const init = () => Object.fromEntries(fields.map(([k]) => [k, data.settings[k]?.value ?? ""]));
  const [vals, setVals] = useState<Record<string, string>>(init);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      // maxfiy maydonlar: bo‘sh qoldirilsa — o‘zgarmaydi
      const patch = Object.fromEntries(Object.entries(vals).filter(([k, v]) => !("hint" in (data.settings[k] ?? {})) || v.trim() !== ""));
      await save(patch);
      setVals((v) => Object.fromEntries(Object.entries(v).map(([k, x]) => [k, "hint" in (data.settings[k] ?? {}) ? "" : x])));
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title={title} sub={sub}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(([k, label, ph]) => {
            const it = data.settings[k];
            const secret = it && "hint" in it;
            return (
              <Field key={k} label={label} hint={secret && it.set ? `Saqlangan: ${it.hint}. Almashtirish uchun yangisini yozing.` : it?.source === "env" ? ".env faylidan" : undefined}>
                <Input
                  value={vals[k] ?? ""}
                  onChange={(e) => setVals({ ...vals, [k]: e.target.value })}
                  placeholder={secret && it.set ? "••••••••" : ph}
                  type={secret ? "password" : "text"}
                  autoComplete="off"
                />
              </Field>
            );
          })}
        </div>
        <button type="submit" disabled={busy} className="btn btn-secondary btn-sm w-fit">
          {busy ? "Saqlanmoqda…" : "Saqlash"}
        </button>
      </form>
    </Card>
  );
}
