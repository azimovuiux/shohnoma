import { CabinetShell } from "@/components/cabinet/CabinetNav";

/** Statik eksport: bitta "_" qobiq; haqiqiy id brauzerda URL'dan o‘qiladi (.htaccess: kabinet/v/<id>/ → kabinet/v/_/) */
export function generateStaticParams() {
  return [{ id: "_" }];
}
export const dynamicParams = false;

export default function CardLayout({ children }: { children: React.ReactNode }) {
  return <CabinetShell>{children}</CabinetShell>;
}
