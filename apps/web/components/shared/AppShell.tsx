import Link from "next/link";
import Image from "next/image";
import type { UserRole } from "@bia-ops/shared";
import { LiveClock } from "./LiveClock";
import { AutoRefresh } from "./AutoRefresh";
import { Icon } from "./Icon";
import { Search } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  active?: boolean;
  badge?: number;
}

interface NavGroup {
  group: string;
  href?: never;
  label?: never;
  icon?: never;
  active?: never;
  badge?: never;
}

type NavEntry = NavItem | NavGroup;

interface AppShellProps {
  title: string;
  subtitle: string;
  role: UserRole;
  userName: string;
  navItems: NavEntry[];
  children: React.ReactNode;
}

export function AppShell({ title, subtitle, role, userName, navItems, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <nav className="nav-stack">
          {navItems.map((item, i) => {
            if ("group" in item && item.group) {
              return <span key={i} className="nav-group">{item.group}</span>;
            }
            const navItem = item as NavItem;
            return (
              <Link key={navItem.href} className={`nav-link ${navItem.active ? "active" : ""}`} href={navItem.href}>
                <span className="nav-label">
                  <Icon name={navItem.icon} size={16} />
                  {navItem.label}
                </span>
                {typeof navItem.badge === "number" && navItem.badge > 0 ? (
                  <span className="badge red">{navItem.badge}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="sf-avatar">{initials(userName)}</div>
          <div className="sf-info">
            <span className="sf-name">{userName}</span>
            <span className="sf-role">{roleLabel(role)}</span>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <AutoRefresh />
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <span>Bia Ops</span>
            <span style={{ color: "var(--fg-faint)" }}>/</span>
            <span className="here">{title}</span>
          </div>
          <div className="topbar-search">
            <Search size={14} color="var(--fg-dim)" />
            <input placeholder="Buscar campanas, clientes…" readOnly />
            <span className="topbar-kbd">⌘K</span>
          </div>
          <div className="topbar-actions">
            <LiveClock />
            <button className="icon-button" title="Notificaciones" type="button">
              <Icon name="notifications" size={15} />
              <span className="notification-dot" />
            </button>
            <span className="badge purple">{roleLabel(role)}</span>
            <div className="avatar" title={userName}>{initials(userName)}</div>
            <form action="/api/auth/logout" method="post">
              <button className="icon-button" title="Cerrar sesion" type="submit">
                <Icon name="logout" size={15} />
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
      <Image src="/assets/logo-bia.png" alt="Bia" width={28} height={28} style={{ borderRadius: 6 }} />
      <div className="logo-text">
        <strong>BIA OPS</strong>
        <span>Marketing operations</span>
      </div>
    </div>
  );
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
