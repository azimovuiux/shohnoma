"use client";

import { TickCircle } from "@/components/icons";
import type { SaveState } from "./useAutosave";
import { useT } from "@/lib/i18n";

export function SaveIndicator({ state, error, compact = false }: { state: SaveState; error: string | null; compact?: boolean }) {
  const t = useT();
  if (state === "idle") return null;
  if (state === "error")
    return (
      <p role="alert" className="text-center t-body-s text-danger">
        {t("{error} — qayta urinib ko‘ramiz", { error: t(error || "Saqlanmadi") })}
      </p>
    );
  if (compact && state === "saved") return null;
  return (
    <p className="inline-flex items-center justify-center gap-1.5 t-body-s text-ink-2" aria-live="polite">
      {state === "saving" ? (
        t("Saqlanmoqda…")
      ) : (
        <>
          <TickCircle size={14} color="var(--color-success)" /> {t("Ma’lumotlar saqlandi")}
        </>
      )}
    </p>
  );
}
