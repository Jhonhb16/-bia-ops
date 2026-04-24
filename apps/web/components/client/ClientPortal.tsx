"use client";

import { useMemo, useState } from "react";
import { PLAN_BUDGET_CAPS, PLAN_LABELS, formatCurrency, formatCompact, type ChatMessage } from "@bia-ops/shared";
import type { getClientDashboard } from "@/lib/data-store";
import { Icon } from "@/components/shared/Icon";

type ClientDashboard = NonNullable<Awaited<ReturnType<typeof getClientDashboard>>>;
type MobileTab = "inicio" | "anuncios" | "reportes" | "chat";

const quickQuestions = [
  "Por que bajaron mis ventas?",
  "Mi presupuesto es suficiente?",
  "Cuando vere mas resultados?",
  "Que anuncio funciona mejor?"
];

export function ClientPortal({ dashboard }: { dashboard: ClientDashboard }) {
  const [tab, setTab] = useState<MobileTab>("inicio");
  const [messages, setMessages] = useState(dashboard.messages);
  const [message, setMessage] = useState("");
  const latest = dashboard.latestMetric;
  const previous = dashboard.previousMetric;
  const isActive = dashboard.onboarding?.step_6_campaign_live;
  const returnPerDollar = latest?.roas ?? dashboard.client.current_roas;
  const returnChange = previous?.roas ? ((returnPerDollar - previous.roas) / previous.roas) * 100 : 0;
  const budgetCap = PLAN_BUDGET_CAPS[dashboard.client.plan_type];
  const winners = dashboard.creatives.filter((creative) => creative.status !== "loser").sort((a, b) => b.roas - a.roas);

  const periodComparison = useMemo(
    () => [
      ["Retorno por $1", `$${returnPerDollar.toFixed(2)}`, previous ? `$${previous.roas.toFixed(2)}` : "Sin dato"],
      ["Inversion", formatCurrency(latest?.spend ?? 0), previous ? formatCurrency(previous.spend) : "Sin dato"],
      ["Personas alcanzadas", formatCompact(latest?.reach ?? 0), previous ? formatCompact(previous.reach) : "Sin dato"],
      ["Ventas estimadas", String(latest?.conversions ?? 0), previous ? String(previous.conversions) : "Sin dato"]
    ],
    [latest, previous, returnPerDollar]
  );

  async function send(content = message) {
    if (!content.trim()) return;
    const response = await fetch(`/api/chat/${dashboard.client.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim() })
    });
    const data = (await response.json()) as { ok: boolean; messages?: ChatMessage[] };
    if (data.ok && data.messages) {
      setMessages(data.messages);
      setMessage("");
      setTab("chat");
    }
  }

  return (
    <main className="mobile-client">
      <header className="mobile-topbar">
        <div className="logo" style={{ margin: 0, padding: 0 }}>
          <div className="logo-mark">B</div>
          <div className="logo-text">
            <strong>BIA OPS</strong>
            <span>{dashboard.client.business_name}</span>
          </div>
        </div>
        <span className={`badge ${dashboard.client.health_status === "green" ? "green" : dashboard.client.health_status === "red" ? "red" : "yellow"}`}>
          {dashboard.client.health_status === "green" ? "Activa" : dashboard.client.health_status === "red" ? "Accion" : "Atencion"}
        </span>
      </header>

      <section className="mobile-content">
        {tab === "inicio" ? (
          isActive ? (
            <div className="grid" style={{ gap: 14 }}>
              <div className="card card-pad" style={{ borderColor: statusColor(dashboard.client.health_status) }}>
                <div className="split">
                  <div>
                    <div className="label">Estado de campana</div>
                    <h1 style={{ margin: "8px 0 6px", fontSize: 26 }}>
                      {dashboard.client.health_status === "green"
                        ? "Tu campana esta activa y optimizando"
                        : dashboard.client.health_status === "yellow"
                          ? "Tu cuenta necesita atencion"
                          : "Accion requerida en tu cuenta"}
                    </h1>
                  </div>
                  <Icon name="monitoring" size={22} />
                </div>
                <p className="small">
                  Ultima actualizacion: hace pocos minutos. Ultima accion del equipo: {dashboard.lastAction?.description ?? "revision operativa registrada"}.
                </p>
              </div>

              <div className="grid">
                <ClientMetric title="Por cada $1 invertido recuperaste" value={`$${returnPerDollar.toFixed(2)}`} sub={`${returnChange >= 0 ? "Subio" : "Bajo"} ${Math.abs(returnChange).toFixed(1)}% vs periodo anterior`} />
                <ClientMetric
                  title="Invertiste este mes"
                  value={`${formatCurrency(dashboard.monthSpend)} de ${formatCurrency(budgetCap)}`}
                  sub={`${Math.min(100, Math.round((dashboard.monthSpend / budgetCap) * 100))}% del presupuesto usado`}
                  progress={(dashboard.monthSpend / budgetCap) * 100}
                />
                <ClientMetric title="Llegaste a" value={`${formatCompact(latest?.reach ?? 0)} personas`} sub={`${formatCompact(latest?.impressions ?? 0)} vistas registradas`} />
                <ClientMetric title="Ventas estimadas generadas" value={String(latest?.conversions ?? 0)} sub="Basado en conversiones registradas" />
              </div>

              <div className="card card-pad">
                <div className="section-title">
                  <div>
                    <div className="label">Anuncios</div>
                    <h2>Tus anuncios que mas venden</h2>
                  </div>
                </div>
                <div className="ad-scroll">
                  {winners.map((creative) => (
                    <article className="card" key={creative.id}>
                      <img className="ad-thumb" src={creative.thumbnail_url} alt={creative.name} />
                      <div className="card-pad">
                        <span className="badge green">Ganador</span>
                        <p className="small">Invertido: {formatCurrency(creative.spend)}</p>
                        <strong>Retorno: x{creative.roas.toFixed(1)}</strong>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="card card-pad">
                <div className="section-title"><h2>Este periodo vs el anterior</h2></div>
                <table className="table">
                  <thead><tr><th>Metrica</th><th>Actual</th><th>Anterior</th></tr></thead>
                  <tbody>
                    {periodComparison.map(([label, current, old]) => (
                      <tr key={label}><td>{label}</td><td>{current}</td><td>{old}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card card-pad">
                <div className="section-title"><h2>Facturacion</h2></div>
                <table className="table">
                  <tbody>
                    <tr><td>Plan actual</td><td>{PLAN_LABELS[dashboard.client.plan_type]}</td></tr>
                    <tr><td>Proximo cobro</td><td>{new Date(dashboard.client.next_billing_date).toLocaleDateString("es-CO")}</td></tr>
                    <tr><td>Monto</td><td>{formatCurrency(dashboard.client.plan_price)}</td></tr>
                  </tbody>
                </table>
                <a className="button" style={{ width: "100%", marginTop: 14 }} href={`https://wa.me/${dashboard.client.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                  <Icon name="upgrade" size={16} />
                  Mejorar mi plan
                </a>
              </div>
            </div>
          ) : (
            <BuildingState dashboard={dashboard} />
          )
        ) : null}

        {tab === "anuncios" ? (
          <div className="grid">
            <div className="section-title"><h1 style={{ margin: 0 }}>Anuncios activos</h1></div>
            {dashboard.creatives.map((creative) => (
              <article key={creative.id} className="card">
                <img className="ad-thumb" src={creative.thumbnail_url} alt={creative.name} />
                <div className="card-pad">
                  <div className="split">
                    <strong>{creative.name}</strong>
                    <span className={creative.status === "winner" ? "badge green" : creative.status === "loser" ? "badge red" : "badge yellow"}>
                      {creative.status === "winner" ? "Ganador" : creative.status === "loser" ? "Revisar" : "En prueba"}
                    </span>
                  </div>
                  <p className="small">Invertido {formatCurrency(creative.spend)} · retorno x{creative.roas.toFixed(1)} · {creative.conversions} ventas</p>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {tab === "reportes" ? (
          <div className="grid">
            <div className="section-title"><h1 style={{ margin: 0 }}>Reportes</h1></div>
            {dashboard.reports.length === 0 ? <div className="empty-state">Tu primer reporte aparecera aqui cuando termine el primer periodo.</div> : null}
            {dashboard.reports.map((report) => (
              <article className="card card-pad" key={report.id}>
                <div className="split">
                  <strong>{new Date(report.period_start).toLocaleDateString("es-CO")} - {new Date(report.period_end).toLocaleDateString("es-CO")}</strong>
                  <span className="badge green">Enviado</span>
                </div>
                <p className="small">Gasto total: {formatCurrency(report.total_spend)} · retorno promedio x{report.avg_roas.toFixed(1)} · alcance {formatCompact(report.total_reach)}</p>
                <div className="avatar-row">
                  <a className="ghost-button" href={report.pdf_url ?? "#"}>Ver reporte</a>
                  <a className="button" href={report.pdf_url ?? "#"}>Descargar PDF</a>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {tab === "chat" ? (
          <div className="grid">
            <div>
              <h1 style={{ margin: 0 }}>Pregunta sobre tus campanas</h1>
              <p className="muted">Responde con datos reales de tu cuenta.</p>
            </div>
            <div className="avatar-row" style={{ flexWrap: "wrap" }}>
              {quickQuestions.map((question) => (
                <button key={question} className="ghost-button" type="button" onClick={() => send(question)}>
                  {question}
                </button>
              ))}
            </div>
            <div className="chat-list">
              {messages.map((item) => (
                <div key={item.id} className={`bubble ${item.role === "client" ? "client" : ""}`}>
                  <div className="label">{item.role === "client" ? "Tu" : item.role === "expert" ? "Equipo Bia" : "BIA AI"}</div>
                  {item.content}
                </div>
              ))}
            </div>
            <form className="avatar-row" onSubmit={(event) => { event.preventDefault(); void send(); }}>
              <input className="input" placeholder="Escribe tu pregunta..." value={message} onChange={(event) => setMessage(event.target.value)} />
              <button className="button" type="submit"><Icon name="send" size={15} /></button>
            </form>
            <p className="small">Responde en segundos. Si requiere accion humana, avisamos al gestor.</p>
          </div>
        ) : null}
      </section>

      <nav className="bottom-nav">
        <NavButton tab="inicio" active={tab} setTab={setTab} icon="home" label="Inicio" />
        <NavButton tab="anuncios" active={tab} setTab={setTab} icon="ads_click" label="Anuncios" />
        <NavButton tab="reportes" active={tab} setTab={setTab} icon="lab_profile" label="Reportes" />
        <NavButton tab="chat" active={tab} setTab={setTab} icon="chat" label="Chat" />
      </nav>
    </main>
  );
}

function ClientMetric({ title, value, sub, progress }: { title: string; value: string; sub: string; progress?: number }) {
  return (
    <div className="card card-pad">
      <div className="label">{title}</div>
      <div className="metric-value" style={{ fontSize: 30 }}>{value}</div>
      {typeof progress === "number" ? <div className="progress"><span style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></div> : null}
      <p className="small">{sub}</p>
    </div>
  );
}

function BuildingState({ dashboard }: { dashboard: ClientDashboard }) {
  const steps = [
    ["Recibimos tu informacion", true],
    ["Revisando tu cuenta", (dashboard.onboarding?.step_2_meta_access ?? false)],
    ["Construyendo tu estructura", (dashboard.onboarding?.step_3_campaign_built ?? false)],
    ["Tus anuncios salen en vivo", (dashboard.onboarding?.step_6_campaign_live ?? false)],
    ["Comienza la optimizacion", false]
  ] as const;

  return (
    <div className="grid">
      <div className="card card-pad">
        <div className="label">Configuracion inicial</div>
        <h1 style={{ margin: "8px 0" }}>Estamos preparando tus campanas</h1>
        <p className="muted">Estamos configurando todo para que tus campanas salgan en los proximos dias. Te avisamos por WhatsApp cuando esten activas.</p>
      </div>
      {steps.map(([label, done], index) => (
        <div className="alert-card" key={label}>
          <div className="split">
            <strong>{label}</strong>
            <span className={done ? "badge green" : index === dashboard.client.onboarding_step ? "badge yellow" : "badge"}>{done ? "Listo" : index === dashboard.client.onboarding_step ? "En proceso" : "Pendiente"}</span>
          </div>
        </div>
      ))}
      <a className="button" href={`https://wa.me/${dashboard.client.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
        Hablar con el equipo
      </a>
    </div>
  );
}

function NavButton({ tab, active, setTab, icon, label }: { tab: MobileTab; active: MobileTab; setTab: (tab: MobileTab) => void; icon: string; label: string }) {
  return (
    <button className={active === tab ? "active" : ""} type="button" onClick={() => setTab(tab)}>
      <Icon name={icon} size={18} />
      <div>{label}</div>
    </button>
  );
}

function statusColor(status: string) {
  if (status === "red") return "#ef4444";
  if (status === "yellow") return "#f59e0b";
  return "#22c55e";
}
