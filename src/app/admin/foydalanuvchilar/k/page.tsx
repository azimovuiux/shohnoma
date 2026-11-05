import { Suspense } from "react";
import { AdminUserDetail } from "@/components/admin/pages/AdminUserDetail";

export default function Page() {
  return (
    <Suspense>
      <AdminUserDetail />
    </Suspense>
  );
}
