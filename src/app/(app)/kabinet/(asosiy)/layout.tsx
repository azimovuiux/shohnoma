import { requireUser } from "@/server/auth";
import { cabinetCounts } from "@/server/cabinet";
import { CabinetNav } from "@/components/cabinet/CabinetNav";

export default async function CabinetLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/kabinet");
  const counts = await cabinetCounts(user.id);
  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 pb-20 pt-6 lg:flex-row lg:gap-10 lg:px-[120px] lg:pb-[100px] lg:pt-10">
      <CabinetNav name={user.name} phone={user.phone} telegramUser={user.telegramUser} {...counts} />
      <div className="flex min-w-0 flex-1 flex-col gap-5">{children}</div>
    </div>
  );
}
