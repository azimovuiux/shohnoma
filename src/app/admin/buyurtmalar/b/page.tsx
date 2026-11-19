import { Suspense } from "react";
import { AdminOrderDetail } from "@/components/admin/pages/AdminOrderDetail";

export default function Page() {
  return (
    <Suspense>
      <AdminOrderDetail />
    </Suspense>
  );
}
