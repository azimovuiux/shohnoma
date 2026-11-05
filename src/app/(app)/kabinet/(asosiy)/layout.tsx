import { CabinetShell } from "@/components/cabinet/CabinetNav";

export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  return <CabinetShell>{children}</CabinetShell>;
}
