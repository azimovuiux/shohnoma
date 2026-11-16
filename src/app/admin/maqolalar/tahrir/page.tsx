import { Suspense } from "react";
import { AdminArticleEdit } from "@/components/admin/pages/AdminArticleEdit";

export default function Page() {
  return (
    <Suspense>
      <AdminArticleEdit />
    </Suspense>
  );
}
