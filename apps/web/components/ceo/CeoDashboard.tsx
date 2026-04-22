"use client";

import { useMemo, useState } from "react";
import { formatCurrency, formatPercent, PLAN_LABELS, type HealthStatus, type PlanType } from "@bia-ops/shared";
import type { getCeoDashboard } from "@/lib/data-store";
import { MetricCard } from "@/components/shared/MetricCard";
import { MiniChart } from "@/components/shared/MiniChart";
import { ConfigPanel } from "./ConfigPanel";

type CeoData = Awaited<ReturnType<typeof getCeoDashboard>>;
type SortKey = "roas" | "spend" | "health";

export function CeoDashboard({ data }: { data: CeoData }) {
  const [plan, setPlan] = useState<PlanType | "all">("all");
  const [health, setHealth] = useState<HealthStatus | "all">("all");
  const [sort, setSort] = useState<SortKey>("health");

  const filteredClients = useMemo(() => {
    return data.healthCards
      .filter((item) => plan === "all" || item.client.plan_type === plan)
      .filter((item) => health === "all" || item.client.health_status === health)
      .sort((a, b) => {
        if (sort === "roas") return (b.latestMetric?.roas ?? 0) - (a.latestMetric?.roas ?? 0);
        if (sort === "spend") return b.monthSpend - a.monthSpend;
        return healthWeight(b.client.health_status) - healthWeight(a.client.health_status);
      });
  }, [data.healthCards, health, plan, sort]);

  const sprintCount = data.activeClients.filter((client) => client.plan_type === "sprint").length;
  const escaladoCount = data.activeClients.filter((client) => client.plan_type === "escalado").length;
  const enterpriseCount = data.activeClients.filter((client) => client.plan_type === "enterprise").length;
  const redAlerts = data.activeAlerts.filter((alert) => alert.severity === "red").length;

  return (
    <div className="grid" style={{ gap: 18 }}>
      <section className="grid metric-grid">
        <MetricCard label="Ingresos mensuales recurrentes" value={formatCurrency(data.revenue.grossRevenue)} sub="+12% vs mes anterior" />
        <MetricCard
          label="Clientes activos"
          value={String(data.revenue.activeClients)}
          sub={`${sprintCount} Sprint · ${escaladoCount} Escalado · ${enterpriseCount} Enterprise`}
          accent="blue"
        />
        <MetricCard label="Tu ganancia neta" value={formatCurrency(data.revenue.netMario)} sub="Despues de comisiones, herramientas y experto" accent="green" />
        <MetricCard label="Retencion" value={formatPercent(data.retention)} sub={`${redAlerts} cuentas con riesgo critico`} accent={redAlerts ? "red" : "green"} />
      </section>

      <section className="grid two-col">
        <div className="card card-pad" id="ingresos">
          <div className="section-title">
            <div>
              <div className="label">Tendencia financiera</div>
              <h2>MRR y ganancia neta Mario</h2>
            </div>
            <div className="badge purple">6 meses</div>
          </div>
          <MiniChart series={data.revenueSeries} />
        </div>

        <div className="card card-pad">
          <div className="section-title">
            <div>
              <div className="label">Distribucion de ingresos</div>
              <h2>Mes actual</h2>
            </div>
            <span className="badge">Dia 5: Bianca</span>
          </div>
          <RevenueBar label="Tu parte" value={data.revenue.netMario} max={data.revenue.grossRevenue} color="#22c55e" />
          <RevenueBar label="Bianca" value={data.revenue.biancaCommission} max={data.revenue.grossRevenue} color="#a855f7" />
          <RevenueBar label="Hotmart" value={data.revenue.hotmartFee} max={data.revenue.grossRevenue} color="#f59e0b" />
          <RevenueBar label="Costos" value={data.revenue.toolsCost + data.revenue.expertSalary} max={data.revenue.grossRevenue} color="#3b82f6" />
          <p className="small">Bruto: {formatCurrency(data.revenue.grossRevenue)} · Herramientas: {formatCurrency(data.revenue.toolsCost)} · Experto: {formatCurrency(data.revenue.expertSalary)}</p>
        </div>
      </section>

      <section className="card card-pad" id="clientes">
        <div className="section-title">
          <div>
            <div className="label">Salud de cuentas</div>
            <h2>{filteredClients.length} clientes visibles</h2>
          </div>
          <div className="avatar-row">
            <select className="select" value={plan} onChange={(event) => setPlan(event.target.value as PlanType | "all")}>
              <option value="all">Todos los planes</option>
              <option value="sprint">Sprint</option>
              <option value="escalado">Escalado</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <select className="select" value={health} onChange={(event) => setHealth(event.target.value as HealthStatus | "all")}>
              <option value="all">Toda salud</option>
              <option value="green">Saludable</option>
              <option value="yellow">Atencion</option>
              <option value="red">Critico</option>
            </select>
            <select className="select" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
              <option value="health">Ordenar por salud</option>
              <option value="roas">Ordenar por retorno</option>
              <option value="spend">Ordenar por gasto</option>
            </select>
          </div>
        </div>
        <div className="client-card-grid">
          {filteredClients.map((item) => (
            <article key={item.client.id} className={`card client-health-card ${item.client.health_status}`}>
              <div className="split">
                <strong>{item.client.business_name}</strong>
                <span className={`health-dot ${item.client.health_status === "green" ? "" : item.client.health_status}`} />
              </div>
              <div className="avatar-row" style={{ margin: "10px 0" }}>
                <span className="badge purple">{PLAN_LABELS[item.client.plan_type]}</span>
                <span className="badge">{item.client.country}</span>
              </div>
              <div className="metric-value" style={{ fontSize: 28 }}>
                x{(item.latestMetric?.roas ?? item.client.current_roas).toFixed(1)}
              </div>
              <p className="small">Gasto mes: {formatCurrency(item.monthSpend)} · {item.daysActive} dias activo</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid two-col">
        <div className="card card-pad">
          <div className="section-title">
            <div>
              <div className="label">Retencion y churn</div>
              <h2>Riesgo operativo</h2>
            </div>
            <span className="badge green">{formatPercent(data.retention)}</span>
          </div>
          <table className="table">
            <tbody>
              <tr>
                <td>Renovaron este mes</td>
                <td>{data.activeClients.length}/{data.activeClients.length}</td>
              </tr>
              <tr>
                <td>Clientes perdidos</td>
                <td>0</td>
              </tr>
              <tr>
                <td>Cuentas en rojo</td>
                <td>{data.healthCards.filter((item) => item.client.health_status === "red").length}</td>
              </tr>
              <tr>
                <td>Vida promedio</td>
                <td>5.8 meses</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card card-pad" id="equipo">
          <div className="section-title">
            <div>
              <div className="label">Equipo</div>
              <h2>Performance del experto</h2>
            </div>
            <span className="badge purple">Semana actual</span>
          </div>
          <table className="table">
            <tbody>
              <tr>
                <td>Alertas resueltas</td>
                <td>{data.actionsThisWeek.filter((action) => action.alert_id).length}/{data.activeAlerts.length + data.actionsThisWeek.length}</td>
              </tr>
              <tr>
                <td>Tiempo promedio respuesta</td>
                <td>3.2 horas</td>
              </tr>
              <tr>
                <td>Clientes sin accion +5 dias</td>
                <td>{data.healthCards.filter((item) => !data.actionsThisWeek.some((action) => action.client_id === item.client.id)).length}</td>
              </tr>
              <tr>
                <td>Acciones registradas</td>
                <td>{data.actionsThisWeek.length}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid two-col">
        <div className="card card-pad">
          <div className="section-title">
            <div>
              <div className="label">Planes</div>
              <h2>Ingresos por plan</h2>
            </div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Clientes</th>
                <th>Precio</th>
                <th>Subtotal</th>
                <th>% total</th>
              </tr>
            </thead>
            <tbody>
              {data.planBreakdown.map((row) => (
                <tr key={row.plan}>
                  <td>{PLAN_LABELS[row.plan as PlanType]}</td>
                  <td>{row.clients}</td>
                  <td>{typeof row.price === "number" ? formatCurrency(row.price) : "custom"}</td>
                  <td>{formatCurrency(row.subtotal)}</td>
                  <td>{formatPercent(row.percent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card card-pad">
          <div className="section-title">
            <div>
              <div className="label">Nuevos clientes</div>
              <h2>Ultimos ingresos</h2>
            </div>
          </div>
          <div className="grid">
            {data.newClients.map((client) => (
              <div key={client.id} className="alert-card">
                <div className="split">
                  <strong>{client.business_name}</strong>
                  <span className="badge purple">{PLAN_LABELS[client.plan_type]}</span>
                </div>
                <p className="small">{client.country} · {client.category} · hace {Math.max(1, Math.round((Date.now() - new Date(client.created_at).getTime()) / 86_400_000))} dias</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ConfigPanel />
    </div>
  );
}

function RevenueBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="bar-row">
      <span>{label}</span>
      <span className="bar-track">
        <span className="bar-fill" style={{ width: `${Math.max(4, (value / max) * 100)}%`, background: color }} />
      </span>
      <strong>{formatCurrency(value)}</strong>
    </div>
  );
}

function healthWeight(health: HealthStatus) {
  if (health === "red") return 3;
  if (health === "yellow") return 2;
  return 1;
}
