import type { Metadata } from "next";
export { default, generateStaticParams } from "@/app/maqolalar/[slug]/page";
export const dynamicParams = false;
export const metadata: Metadata = { title: "Статья", description: null, alternates: {}, openGraph: null, twitter: null };
