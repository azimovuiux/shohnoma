"use client";

import { Printer } from "@/components/icons";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-primary">
      <Printer size={16} /> Chop etish yoki PDF saqlash
    </button>
  );
}
