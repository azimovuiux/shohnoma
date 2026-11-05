import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FloatingContact } from "@/components/FloatingContact";
import { getHeaderUser } from "@/server/header";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getHeaderUser();
  return (
    <>
      <Header user={user} />
      <main>{children}</main>
      <Footer />
      <FloatingContact />
    </>
  );
}
