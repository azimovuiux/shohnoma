import { OrdersPage } from "@/components/cabinet/pages/OrdersPage";

export const metadata = { title: "Faol taklifnomalar", robots: { index: false } };

export default function Page() {
  return <OrdersPage kind="active" />;
}
