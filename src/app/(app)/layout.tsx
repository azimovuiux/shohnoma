import { Header } from "@/components/Header";
import { FooterCompact } from "@/components/Footer";
import { FloatingContact } from "@/components/FloatingContact";

/** Kirish va kabinet sahifalari: header + qisqa footer */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header variant="app" />
      <main className="min-h-[70vh]">{children}</main>
      <FooterCompact />
      {/* Mobilda suzuvchi tugma kabinet tugmalarini yopmasin — chat burger va hisob menyusidagi «Yordam»dan ochiladi */}
      <FloatingContact launcher="desktop" />
    </>
  );
}
