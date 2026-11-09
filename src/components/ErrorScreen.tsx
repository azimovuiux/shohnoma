"use client";

import { useEffect, useState } from "react";

/**
 * Kutilmagan xato (ko‘pincha yangi deploydan keyin eski sahifa yangi fayllarni topa olmaganda):
 * bir marta avtomatik qayta yuklaymiz; takrorlansa — oq ekran o‘rniga tushunarli xabar va tugma.
 */
export function ErrorScreen({ error, reset }: { error: Error & { digest?: string }; reset?: () => void }) {
  const [show, setShow] = useState(false);
  const lc = typeof location !== "undefined" ? (location.pathname.match(/^\/(ru|en)(\/|$)/)?.[1] ?? "uz") : "uz";
  const ru = lc === "ru";
  const en = lc === "en";
  useEffect(() => {
    console.error(error);
    const k = "sh_err_reload";
    const last = Number(sessionStorage.getItem(k) || 0);
    if (Date.now() - last > 60_000) {
      sessionStorage.setItem(k, String(Date.now()));
      location.reload();
      return;
    }
    setShow(true);
  }, [error]);
  if (!show) return null;
  return (
    <div style={{ minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center", fontFamily: "inherit" }}>
      <p style={{ fontSize: 20, color: "#2b1d1a" }}>{ru ? "Что-то пошло не так" : en ? "Something went wrong" : "Nimadir xato ketdi"}</p>
      <p style={{ fontSize: 15, color: "#6b5d58", maxWidth: 420 }}>
        {ru ? "Пожалуйста, обновите страницу." : en ? "Please reload the page." : "Iltimos, sahifani yangilang."}
      </p>
      <button
        type="button"
        onClick={() => (reset ? (sessionStorage.removeItem("sh_err_reload"), location.reload()) : location.reload())}
        style={{ padding: "12px 22px", borderRadius: 999, background: "#6e1f2a", color: "#fff", fontSize: 15, border: 0, cursor: "pointer" }}
      >
        {ru ? "Обновить страницу" : en ? "Reload page" : "Sahifani yangilash"}
      </button>
    </div>
  );
}
