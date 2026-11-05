import { Suspense } from "react";
import { AdminTemplateEdit } from "@/components/admin/pages/AdminTemplateEdit";

export default function Page() {
  return (
    <Suspense>
      <AdminTemplateEdit />
    </Suspense>
  );
}
