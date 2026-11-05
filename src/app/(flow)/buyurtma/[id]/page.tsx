import { redirect } from "next/navigation";

export default async function OrderIndex({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/buyurtma/${(await params).id}/marosim`);
}
