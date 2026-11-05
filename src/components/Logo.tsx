import Link from "next/link";
import { Star8 } from "./Ornament";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 text-ink ${className}`} aria-label="Shohnoma — bosh sahifa">
      <Star8 size={18} />
      <span className="t-logo">Shohnoma</span>
    </Link>
  );
}
