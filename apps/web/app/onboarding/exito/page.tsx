import Link from "next/link";
import { Logo } from "@/components/shared/AppShell";

export default function OnboardingSuccessPage() {
  return (
    <main className="login-page">
      <section className="login-panel" style={{ gridTemplateColumns: "1fr" }}>
        <div className="login-brand" style={{ minHeight: 520 }}>
          <Logo />
          <div>
            <div className="eyebrow muted">Briefing recibido</div>
            <h1 className="page-title" style={{ marginTop: 12 }}>
              Tu informacion ya esta en BIA OPS.
            </h1>
            <p className="muted" style={{ maxWidth: 650, lineHeight: 1.7 }}>
              El equipo revisara tus accesos, preparara la estructura de campana y te avisara por WhatsApp cuando tus anuncios esten listos para salir en vivo.
            </p>
          </div>
          <div className="avatar-row">
            <Link className="button" href="/auth/login">
              <span className="material-symbols-outlined">login</span>
              Ir al acceso
            </Link>
            <span className="badge purple">Bia Agency</span>
          </div>
        </div>
      </section>
    </main>
  );
}
