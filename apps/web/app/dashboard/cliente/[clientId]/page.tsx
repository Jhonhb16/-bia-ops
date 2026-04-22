import { notFound } from "next/navigation";
import { ClientPortal } from "@/components/client/ClientPortal";
import { getClientDashboard } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export default async function ClientDashboardPage({ params }: { params: { clientId: string } }) {
  const dashboard = await getClientDashboard(params.clientId);
  if (!dashboard) notFound();
  return <ClientPortal dashboard={dashboard} />;
}
