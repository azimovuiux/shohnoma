"use client";

import Link from "next/link";
import { forwardRef, type ComponentProps } from "react";
import { useLocale, lpath } from "@/lib/i18n";

/** next/link o‘rniga: ichki havolalarga joriy til prefiksini (/ru) o‘zi qo‘shadi */
const LocalLink = forwardRef<HTMLAnchorElement, ComponentProps<typeof Link>>(function LocalLink({ href, ...rest }, ref) {
  const locale = useLocale();
  const h = typeof href === "string" ? lpath(locale, href) : href.pathname ? { ...href, pathname: lpath(locale, href.pathname) } : href;
  return <Link ref={ref} href={h} {...rest} />;
});
export default LocalLink;
