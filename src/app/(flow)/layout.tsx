import { Header } from "@/components/Header";
import { FooterCompact } from "@/components/Footer";
import { FloatingContact } from "@/components/FloatingContact";
import { getHeaderUser } from "@/server/header";

export const metadata = { robots: { index: false, follow: false } };

export default async function FlowLayout({ children }: { children: React.ReactNode }) {
  const user = await getHeaderUser();
  return (
    <>
      <Header user={user} />
      <main className="min-h-[60vh]">{children}</main>
      <FooterCompact />
      {/* Mobilda pastki panelda yordam havolasi bor — suzuvchi tugma tugmani yopmasin */}
      <div className="hidden lg:block">
        <FloatingContact />
      </div>
    </>
  );
}
