import { Suspense } from "react";
import { AdminLoginForm } from "@/components/cabinet/AdminLoginForm";

export const metadata = { title: "Admin kirish", robots: { index: false } };

export default function AdminLoginPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[1440px] items-center justify-center px-5 py-16">
      <Suspense>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
