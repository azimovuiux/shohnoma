"use client";

import { useEffect } from "react";
import { PageLoading } from "@/lib/client";

export function RedirectToLogin() {
  useEffect(() => {
    const next = new URLSearchParams(location.search).get("next");
    window.location.replace(`/kirish/${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  }, []);
  return <PageLoading className="flex-1" />;
}
