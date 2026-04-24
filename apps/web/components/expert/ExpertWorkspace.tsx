"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ALERT_LABELS,
  PLAN_BUDGET_CAPS,
  PLAN_LABELS,
  daysBetween,
  formatCurrency,
  onboardingProgress,
  type Alert,
  type HealthStatus,
  type PlanType
} from "@bia-ops/shared";
import type { getExpertDashboard } from "@/lib/data-store";
import { MetricCard } from "@/components/shared/MetricCard";
import { AddClientModal } from "@/components/expert/AddClientModal";
import { Icon } from "@/components/shared/Icon";

type ExpertData = Awaited<ReturnType<typeof getExpertDashboard>>;

export function ExpertWorkspace({ data }: { data: ExpertData }) {
  const router = useRouter();
  const [alerts, setAlerts] = useState(data.alerts);
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState<PlanType | "all">("all");
  const [health, setHealth] = useState<HealthStatus | "all">("all");
  const [showAddClient, setShowAddClient] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const clientRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.clients
      .filter((row) => !term || row.client.business_name.toLowerCase().includes(term))
      .filter((row) => plan === "all" || row.client.plan_type === plan)
      .filter((row) => health === "all" || row.client.health_status === health)
      .sort((a, b) => b.activeAlerts.length - a.activeAlerts.length || (a.latestMetric?.roas ?? 0) - (b.latestMetric?.roas ?? 0));
  }, [data.clients, health, plan, search]);

  const redAlerts = alerts.filter((alert) => alert.severity === "red").length;
  const yellowAlerts = alerts.filter((alert) => alert.severity === "yellow").length;
  const onboardingStuck = data.clients.filter((row) => row.onboarding && row.client.status === "onboarding" && daysBetween(row.client.created_at) > 3);

  async function resolve(alert: Alert) {
    const response = await fetch(`/api/alerts/${alert.id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note })
    });

    if (response.ok) {
      setAlerts((current) => current.filter((item) => item.id !== alert.id));
      setSelectedAlert(null);
      setNote("");
    }
  }

  function handleClientCreated(name: string) {
    setSuccessToast(`Cliente ${name} agregado correctamente`);
    setTimeout(() => setSuccessToast(null), 3500);
    router.refresh();
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      {showAddClient ? (
        <AddClientModal onClose={() => setShowAddClient(false)} onCreated={handleClientCreated} />
      ) : null}
      {successToast ? (
        <div
          style={{
            position: "fixed",
            bottom: 28,
            right: 28,
            zIndex: 9999,
            background: "#166534",
            border: "1px solid #22c55e",
            color: "#fff",
            borderRadius: 10,
            padding: "12px 20px",
            fontWeight: 600,
            fontSize: 14,
            boxShadow: "0 4px 24px #0008"
          }}
        >
          {successToast}
        </div>
      ) : null}
      <section className="grid metric-grid">
        <MetricCard label="Criticas activas" value={String(redAlerts)} sub="Requieren accion hoy" accent={redAlerts ? "red" : "green"} />
        <MetricCard label="En atencion" value={String(yellowAlerts)} sub="Fatiga, presupuesto u onboarding" accent="amber" />
        <MetricCard label="Resueltas hoy" value={String(data.resolvedToday)} sub="Con accion registrada" accent="green" />
        <MetricCard label="Clientes sin avance" value={String(onboardingStuck.length)} sub="Onboarding detenido +3 dias" accent={onboardingStuck.length ? "amber" : "green"} />
      </section>

      <section className="grid two-col" id="alertas">
        <div className="card card-pad">
          <div className="section-title">
            <div>
              <div className="label">Alertas ordenadas por severidad</div>
              <h2>Trabajo de hoy</h2>
            </div>
            <span className="badge purple">{new Date().toLocaleDateString("es-CO", { dateStyle: "medium" })}</span>
          </div>

          <div className="grid">
            {alerts.length === 0 ? <div className="empty-state">No hay alertas activas.</div> : null}
            {alerts.map((alert) => {
              const row = data.clients.find((item) => item.client.id === alert.client_id);
              return (
                <article key={alert.id} className={`alert-card ${alert.severity === "red" ? "red" : ""}`}>
                  <div className="split">
                    <div>
                      <span className={`badge ${alert.severity === "red" ? "red" : "yellow"}`}>{alert.severity === "red" ? "Critico" : "Atencion"}</span>
                      <h3 style={{ margin: "10px 0 0" }}>{row?.client.business_name ?? "Cliente"} · {ALERT_LABELS[alert.alert_type]}</h3>
                    </div>
                    <span className="badge purple">{row ? PLAN_LABELS[row.client.plan_type] : "Plan"}</span>
                  </div>
                  <p className="muted" style={{ margin: 0 }}>
                    {alert.metric_affected}: actual {alert.current_value} vs benchmark {alert.benchmark_value}. {alert.threshold_exceeded}.
                  </p>
                  <div className="card card-pad" style={{ background: "#101010", boxShadow: "none" }}>
                    <div className="label">Accion sugerida</div>
                    <p style={{ marginBottom: 0 }}>{alert.suggested_action}</p>
                  </div>

                  {selectedAlert === alert.id ? (
                    <div className="grid">
                      <textarea className="textarea" placeholder="Que accion tomaste?" value={note} onChange={(event) => setNote(event.target.value)} />
                      <div className="avatar-row">
                        <button className="button" type="button" disabled={!note.trim()} onClick={() => resolve(alert)}>
                          <Icon name="check" size={16} />
                          Guardar y resolver
                        </button>
                        <button className="ghost-button" type="button" onClick={() => setSelectedAlert(null)}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="avatar-row">
                      <button className="button" type="button" onClick={() => setSelectedAlert(alert.id)}>
                        <Icon name="task_alt" size={16} />
                        Marcar resuelto
                      </button>
                      <button className="ghost-button" type="button">
                        <Icon name="escalator_warning" size={16} />
                        Escalar al CEO
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>

        <aside className="card card-pad">
          <div className="section-title">
            <div>
              <div className="label">Prioridad</div>
              <h2>Cuentas sensibles</h2>
            </div>
          </div>
          <div className="grid">
            {data.clients
              .filter((row) => row.client.health_status !== "green")
              .map((row) => (
                <Link href={`/dashboard/expert/clientes/${row.client.id}`} key={row.client.id} className="alert-card">
                  <div className="split">
                    <strong>{row.client.business_name}</strong>
                    <span className={`badge ${row.client.health_status === "red" ? "red" : "yellow"}`}>{row.client.health_status === "red" ? "Critico" : "Atencion"}</span>
                  </div>
                  <p className="small">Retorno x{(row.latestMetric?.roas ?? row.client.current_roas).toFixed(1)} · {row.activeAlerts.length} alertas · ultima accion hace {row.lastAction ? daysBetween(row.lastAction.created_at) : 99} dias</p>
                </Link>
              ))}
          </div>
        </aside>
      </section>

      <section className="card card-pad" id="clientes">
        <div className="section-title">
          <div>
            <div className="label">Clientes</div>
            <h2>Control operativo</h2>
          </div>
          <div className="avatar-row">
            <input className="input" placeholder="Buscar cliente" value={search} onChange={(event) => setSearch(event.target.value)} />
            <select className="select" value={plan} onChange={(event) => setPlan(event.target.value as PlanType | "all")}>
              <option value="all">Plan</option>
              <option value="sprint">Sprint</option>
              <option value="escalado">Escalado</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <select className="select" value={health} onChange={(event) => setHealth(event.target.value as HealthStatus | "all")}>
              <option value="all">Salud</option>
              <option value="green">Saludable</option>
              <option value="yellow">Atencion</option>
              <option value="red">Critico</option>
            </select>
            <button className="button" type="button" onClick={() => setShowAddClient(true)}>
              <Icon name="person_add" size={16} />
              Agregar cliente
            </button>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Retorno</th>
              <th>Costo venta</th>
              <th>Gasto mes</th>
              <th>Alertas</th>
              <th>Ultima accion</th>
              <th>Salud</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientRows.map((row) => (
              <tr key={row.client.id}>
                <td>
                  <strong>{row.client.business_name}</strong>
                  <div className="small">{row.client.country} · {PLAN_LABELS[row.client.plan_type]}</div>
                </td>
                <td style={{ color: roasColor(row.latestMetric?.roas ?? row.client.current_roas) }}>x{(row.latestMetric?.roas ?? row.client.current_roas).toFixed(1)}</td>
                <td>{formatCurrency(row.latestMetric?.cpa ?? 0)}</td>
                <td>
                  {formatCurrency(row.monthSpend)} / {formatCurrency(PLAN_BUDGET_CAPS[row.client.plan_type])}
                </td>
                <td><span className={row.activeAlerts.length ? "badge red" : "badge green"}>{row.activeAlerts.length}</span></td>
                <td>{row.lastAction ? `hace ${daysBetween(row.lastAction.created_at)} dias` : "Sin registro"}</td>
                <td><span className={`badge ${row.client.health_status === "green" ? "green" : row.client.health_status === "red" ? "red" : "yellow"}`}>{row.client.health_status}</span></td>
                <td>
                  <Link className="ghost-button" href={`/dashboard/expert/clientes/${row.client.id}`}>
                    <Icon name="arrow_forward" size={16} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid two-col" id="onboarding">
        <div className="card card-pad">
          <div className="section-title">
            <div>
              <div className="label">Onboarding</div>
              <h2>Clientes en configuracion</h2>
            </div>
          </div>
          <div className="grid">
            {data.clients
              .filter((row) => row.onboarding && row.client.onboarding_step < 7)
              .map((row) => {
                const progress = row.onboarding ? onboardingProgress(row.onboarding) : 0;
                return (
                  <Link key={row.client.id} href={`/dashboard/expert/clientes/${row.client.id}`} className="alert-card">
                    <div className="split">
                      <strong>{row.client.business_name}</strong>
                      <span className={`badge ${daysBetween(row.client.created_at) > 7 ? "red" : daysBetween(row.client.created_at) > 3 ? "yellow" : "purple"}`}>
                        {daysBetween(row.client.created_at)} dias
                      </span>
                    </div>
                    <div className="progress"><span style={{ width: `${(progress / 7) * 100}%` }} /></div>
                    <p className="small">{progress}/7 pasos completos</p>
                  </Link>
                );
              })}
          </div>
        </div>

        <div className="card card-pad" id="reportes">
          <div className="section-title">
            <div>
              <div className="label">Reportes</div>
              <h2>Generacion manual</h2>
            </div>
            <button className="button" type="button">
              <Icon name="picture_as_pdf" size={16} />
              Generar
            </button>
          </div>
          <table className="table">
            <tbody>
              <tr>
                <td>Programacion automatica</td>
                <td>Cada 14 dias</td>
              </tr>
              <tr>
                <td>Estado Resend</td>
                <td>Listo al configurar API key</td>
              </tr>
              <tr>
                <td>PDF</td>
                <td>Plantilla Bia Agency</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function roasColor(roas: number) {
  if (roas >= 3) return "#22c55e";
  if (roas >= 2) return "#f59e0b";
  return "#ef4444";
}
