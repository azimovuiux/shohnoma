"use client";

import type { ReactNode } from "react";
import { inputClass } from "@/components/ui";

/** Figma'dagi forma maydoni: sarlavha Inter SemiBold 14, input radius 10 */
export function FlowField({
  label,
  required,
  error,
  hint,
  children,
  className = "",
  htmlFor,
}: {
  label: ReactNode;
  required?: boolean;
  error?: string | null;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-2 ${className}`}>
      <label htmlFor={htmlFor} className="t-title text-ink">
        {label}
        {required && " *"}
      </label>
      {children}
      {error ? (
        <span role="alert" className="t-body-s text-danger">
          {error}
        </span>
      ) : hint ? (
        <span className="t-body-s text-ink-2">{hint}</span>
      ) : null}
    </div>
  );
}

export const flowInput = `${inputClass} !h-[52px] !rounded-[10px] !px-3.5`;

/** Ichida ikonka bo‘lgan input o‘rami */
export function IconInput({ icon, children, invalid }: { icon: ReactNode; children: ReactNode; invalid?: boolean }) {
  return (
    <span
      className={`relative flex h-[52px] items-center rounded-[10px] border bg-bg-base pr-3.5 transition-colors focus-within:border-maroon/55 ${
        invalid ? "border-danger" : "border-line"
      }`}
    >
      {children}
      <span className="pointer-events-none shrink-0 text-ink-2">{icon}</span>
    </span>
  );
}
export const bareInput = "h-full min-w-0 flex-1 bg-transparent px-3.5 t-body-m text-ink outline-none placeholder:text-ink-2/80";

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="font-serif text-[24px] font-normal leading-[1.2] text-ink lg:text-[26px]">{children}</h2>;
}
