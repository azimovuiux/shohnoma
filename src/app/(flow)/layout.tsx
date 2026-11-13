import { Header } from "@/components/Header";
import { FooterCompact } from "@/components/Footer";
import { FloatingContact } from "@/components/FloatingContact";
import { FlowGuardProvider } from "@/components/order/FlowGuard";
import { FlowChrome } from "@/components/order/FlowHeader";

export const metadata = { robots: { index: false, follow: false } };

export default function FlowLayout({ children }: { children: React.ReactNode }) {
  return (
    <FlowGuardProvider>
      {/* To‘ldirish bosqichlarida — ixcham oqim sarlavhasi (Qoralamani saqlash / Chiqish), qolganida — sayt sarlavhasi */}
      <FlowChrome appHeader={<Header variant="app" />} />
      <main className="min-h-[60vh]">{children}</main>
      <FooterCompact />
      {/* Mobilda suzuvchi tugma pastki panel tugmalarini yopmasin — chat oqim sarlavhasidagi «Yordam»dan ochiladi */}
      <FloatingContact launcher="desktop" />
    </FlowGuardProvider>
  );
}
