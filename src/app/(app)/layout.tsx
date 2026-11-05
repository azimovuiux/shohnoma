import { Header } from "@/components/Header";
import { FooterCompact } from "@/components/Footer";
import { FloatingContact } from "@/components/FloatingContact";
import { getHeaderUser } from "@/server/header";

/** Kirish va kabinet sahifalari: header + qisqa footer */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getHeaderUser();
  return (
    <>
      <Header user={user} />
      <main className="min-h-[70vh]">{children}</main>
      <FooterCompact />
      <FloatingContact />
    </>
  );
}
