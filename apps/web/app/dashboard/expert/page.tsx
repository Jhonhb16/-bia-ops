import { AppShell } from "@/components/shared/AppShell";
import { ExpertWorkspace } from "@/components/expert/ExpertWorkspace";
import { getSession } from "@/lib/auth";
import { getExpertDashboard, getUserById } from "@/lib/data-store";

export default async function ExpertPage() {
  const session = getSession();
  const user = session ? getUserById(session.userId) : null;
  const data = await getExpertDashboard();
  const redCount = data.alerts.filter((alert) => alert.severity === "red").length;

  return (
    <AppShell
      title="Bandeja de trabajo"
      subtitle="Alertas, clientes, onboarding y reportes operativos."
      role="expert"
      userName={user?.full_name ?? "Equipo de performance"}
      navItems={[
        { href: "/dashboard/expert#alertas", label: "Alertas", icon: "emergency_home", active: true, badge: redCount },
        { href: "/dashboard/expert#clientes", label: "Clientes", icon: "groups" },
        { href: "/dashboard/expert#onboarding", label: "Onboarding", icon: "checklist" },
        { href: "/dashboard/expert#herramientas", label: "Herramientas", icon: "build" },
        { href: "/dashboard/expert#reportes", label: "Reportes", icon: "lab_profile" }
      ]}
    >
      <ExpertWorkspace data={data} />
    </AppShell>
  );
}
