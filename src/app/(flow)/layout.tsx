import { Header } from "@/components/Header";
import { FooterCompact } from "@/components/Footer";
import { FloatingContact } from "@/components/FloatingContact";
import { LeaveGuard } from "@/components/order/LeaveGuard";

export const metadata = { robots: { index: false, follow: false } };

export default function FlowLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header variant="app" />
      <main className="min-h-[60vh]">{children}</main>
      <FooterCompact />
      <LeaveGuard />
      {/* Mobilda pastki panelda yordam havolasi bor — suzuvchi tugma tugmani yopmasin */}
      <div className="hidden lg:block">
        <FloatingContact />
      </div>
    </>
  );
}
