import { AppShell } from "@/components/shared/AppShell";
import { CeoDashboard } from "@/components/ceo/CeoDashboard";
import { getSession } from "@/lib/auth";
import { getCeoDashboard, getUserById } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export default async function CeoPage() {
  const session = getSession();
  const user = session ? getUserById(session.userId) : null;
  const data = await getCeoDashboard();

  return (
    <AppShell
      title="Vista CEO"
      subtitle="Crecimiento, ingresos, salud de cuentas y retencion."
      role="ceo"
      userName={user?.full_name ?? "Mario Hernandez"}
      navItems={[
        { href: "/dashboard/ceo", label: "Inicio", icon: "dashboard", active: true },
        { href: "/dashboard/ceo#clientes", label: "Clientes", icon: "groups" },
        { href: "/dashboard/ceo#ingresos", label: "Ingresos", icon: "payments" },
        { href: "/dashboard/ceo#equipo", label: "Equipo", icon: "engineering" },
        { href: "/api/export/clients", label: "Reportes", icon: "download" },
        { href: "/dashboard/ceo#config", label: "Configuracion", icon: "settings" }
      ]}
    >
      <CeoDashboard data={data} />
    </AppShell>
  );
}
