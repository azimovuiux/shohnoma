import { Suspense } from "react";
import { AdminCardDetail } from "@/components/vizitka/admin/AdminCardDetail";

export default function Page() {
  return (
    <Suspense>
      <AdminCardDetail />
    </Suspense>
  );
}
