import { InvitationShell } from "@/components/cabinet/InvitationShell";

/** Statik eksport: bitta "_" qobiq; haqiqiy id brauzerda URL'dan o‘qiladi (.htaccess) */
export function generateStaticParams() {
  return [{ invitationId: "_" }];
}
export const dynamicParams = false;

export default function InvitationLayout({ children }: { children: React.ReactNode }) {
  return <InvitationShell>{children}</InvitationShell>;
}
