import Link from "next/link";
import type { UserRole } from "@bia-ops/shared";
import { LiveClock } from "./LiveClock";
import { AutoRefresh } from "./AutoRefresh";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  active?: boolean;
  badge?: number;
}

interface AppShellProps {
  title: string;
  subtitle: string;
  role: UserRole;
  userName: string;
  navItems: NavItem[];
  children: React.ReactNode;
}

export function AppShell({ title, subtitle, role, userName, navItems, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <nav className="nav-stack">
          {navItems.map((item) => (
            <Link key={item.href} className={`nav-link ${item.active ? "active" : ""}`} href={item.href}>
              <span className="nav-label">
                <span className="material-symbols-outlined">{item.icon}</span>
                {item.label}
              </span>
              {typeof item.badge === "number" && item.badge > 0 ? <span className="badge red">{item.badge}</span> : null}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="main-area">
        <AutoRefresh />
        <header className="topbar">
          <div className="topbar-title">
            <h1 className="page-title">{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="avatar-row">
            <LiveClock />
            <button className="icon-button" title="Notificaciones" type="button">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <span className="badge purple">{roleLabel(role)}</span>
            <div className="avatar" title={userName}>
              {initials(userName)}
            </div>
            <form action="/api/auth/logout" method="post">
              <button className="icon-button" title="Cerrar sesion" type="submit">
                <span className="material-symbols-outlined">logout</span>
              </button>
            </form>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}

export function Logo() {
  return (
    <div className="logo">
      <div className="logo-mark">B</div>
      <div className="logo-text">
        <strong>BIA OPS</strong>
        <span>Marketing operations</span>
      </div>
    </div>
  );
}

export function Icon({ name }: { name: string }) {
  return <span className="material-symbols-outlined">{name}</span>;
}

function roleLabel(role: UserRole) {
  if (role === "ceo") return "CEO";
  if (role === "expert") return "Experto";
  return "Cliente";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
