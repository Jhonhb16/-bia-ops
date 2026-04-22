import { notFound } from "next/navigation";
import { AppShell } from "@/components/shared/AppShell";
import { ExpertClientProfile } from "@/components/expert/ExpertClientProfile";
import { getSession } from "@/lib/auth";
import { getClientDashboard, getExpertDashboard, getUserById } from "@/lib/data-store";

export default async function ExpertClientPage({ params }: { params: { clientId: string } }) {
  const session = getSession();
  const user = session ? getUserById(session.userId) : null;
  const [dashboard, expert] = await Promise.all([
    getClientDashboard(params.clientId),
    getExpertDashboard()
  ]);
  if (!dashboard) notFound();

  return (
    <AppShell
      title={dashboard.client.business_name}
      subtitle={`${dashboard.client.country} · ${dashboard.client.category} · plan ${dashboard.client.plan_type}`}
      role="expert"
      userName={user?.full_name ?? "Equipo de performance"}
      navItems={[
        { href: "/dashboard/expert#alertas", label: "Alertas", icon: "emergency_home", badge: expert.alerts.filter((alert) => alert.severity === "red").length },
        { href: "/dashboard/expert#clientes", label: "Clientes", icon: "groups", active: true },
        { href: "/dashboard/expert#onboarding", label: "Onboarding", icon: "checklist" },
        { href: "/dashboard/expert#herramientas", label: "Herramientas", icon: "build" },
        { href: "/dashboard/expert#reportes", label: "Reportes", icon: "lab_profile" }
      ]}
    >
      <ExpertClientProfile dashboard={dashboard} />
    </AppShell>
  );
}
