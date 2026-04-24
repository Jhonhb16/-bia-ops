"use client";

import { useMemo, useState } from "react";
import {
  PLAN_BUDGET_CAPS,
  PLAN_LABELS,
  daysBetween,
  formatCurrency,
  formatCompact,
  onboardingProgress,
  type ChatMessage,
  type MetricDaily,
  type Campaign
} from "@bia-ops/shared";
import type { getClientDashboard } from "@/lib/data-store";
import { MiniChart } from "@/components/shared/MiniChart";
import { MetricCard } from "@/components/shared/MetricCard";
import { Icon } from "@/components/shared/Icon";

type ClientDashboard = NonNullable<Awaited<ReturnType<typeof getClientDashboard>>>;
type TabKey = "metricas" | "briefing" | "onboarding" | "acciones" | "herramientas" | "chat";

const tabs: { key: TabKey; label: string }[] = [
  { key: "metricas", label: "Metricas en tiempo real" },
  { key: "briefing", label: "Briefing" },
  { key: "onboarding", label: "Onboarding" },
  { key: "acciones", label: "Historial" },
  { key: "herramientas", label: "Herramientas" },
  { key: "chat", label: "Chat" }
];

export function ExpertClientProfile({ dashboard }: { dashboard: ClientDashboard }) {
  const [activeTab, setActiveTab] = useState<TabKey>("metricas");
  const [messages, setMessages] = useState(dashboard.messages);
  const [message, setMessage] = useState("");
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncToast, setSyncToast] = useState<{ text: string; ok: boolean } | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<MetricDaily[]>(dashboard.metrics);
  const [liveCampaigns, setLiveCampaigns] = useState<Campaign[]>(dashboard.campaigns);
  const [onboarding, setOnboarding] = useState(dashboard.onboarding);
  const [stepLoading, setStepLoading] = useState<number | null>(null);

  const latest = liveMetrics.at(-1) ?? dashboard.latestMetric;
  const progress = onboarding ? onboardingProgress(onboarding) : 0;
  const winners = dashboard.creatives.filter((creative) => creative.status !== "loser").sort((a, b) => b.roas - a.roas).slice(0, 3);
  const losers = dashboard.creatives.filter((creative) => creative.status === "loser" || creative.roas < 2.2).sort((a, b) => a.roas - b.roas).slice(0, 3);
  const roasSeries = useMemo(
    () =>
      liveMetrics.slice(-30).map((metric) => ({
        label: new Date(metric.date).toLocaleDateString("es-CO", { day: "2-digit" }),
        value: metric.roas
      })),
    [liveMetrics]
  );

  async function handleMetaSync() {
    setSyncLoading(true);
    setSyncToast(null);
    try {
      const response = await fetch("/api/meta/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: dashboard.client.id })
      });
      const data = (await response.json()) as { ok: boolean; error?: string; metrics?: MetricDaily[]; campaigns?: Campaign[] };
      if (data.ok) {
        if (data.metrics) setLiveMetrics(data.metrics);
        if (data.campaigns) setLiveCampaigns(data.campaigns);
        setSyncToast({ text: "Sincronizacion completada", ok: true });
      } else {
        setSyncToast({ text: data.error ?? "Error al sincronizar", ok: false });
      }
    } catch {
      setSyncToast({ text: "Error de conexion", ok: false });
    } finally {
      setSyncLoading(false);
      setTimeout(() => setSyncToast(null), 3500);
    }
  }

  async function markStep(step: number) {
    if (stepLoading !== null) return;
    setStepLoading(step);
    try {
      const response = await fetch(`/api/onboarding/${dashboard.client.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step })
      });
      const data = (await response.json()) as { ok: boolean };
      if (data.ok && onboarding) {
        const col = `step_${step}_${stepKey(step)}` as keyof typeof onboarding;
        const atCol = `${col}_at` as keyof typeof onboarding;
        setOnboarding({ ...onboarding, [col]: true, [atCol]: new Date().toISOString() });
      }
    } finally {
      setStepLoading(null);
    }
  }

  async function sendExpertMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) return;
    const response = await fetch(`/api/chat/${dashboard.client.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message.trim() })
    });
    const data = (await response.json()) as { ok: boolean; messages?: ChatMessage[] };
    if (data.ok && data.messages) {
      setMessages(data.messages);
      setMessage("");
    }
  }

  return (
    <div className="grid" style={{ gap: 18 }}>
      {syncToast ? (
        <div
          style={{
            position: "fixed",
            bottom: 28,
            right: 28,
            zIndex: 9999,
            background: syncToast.ok ? "#166534" : "#7f1d1d",
            border: `1px solid ${syncToast.ok ? "#22c55e" : "#ef4444"}`,
            color: "#fff",
            borderRadius: 10,
            padding: "12px 20px",
            fontWeight: 600,
            fontSize: 14,
            boxShadow: "0 4px 24px #0008"
          }}
        >
          {syncToast.text}
        </div>
      ) : null}
      <div className="card">
        <div className="tabs">
          {tabs.map((tab) => (
            <button key={tab.key} className={`tab ${activeTab === tab.key ? "active" : ""}`} type="button" onClick={() => setActiveTab(tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="card-pad">
          {activeTab === "metricas" ? (
            <div className="grid" style={{ gap: 18 }}>
              <div className="section-title">
                <div>
                  <div className="label">Metricas publicitarias</div>
                  <h2>Rendimiento Meta Ads</h2>
                </div>
                <button
                  className="ghost-button"
                  type="button"
                  disabled={syncLoading}
                  onClick={handleMetaSync}
                  style={{ opacity: syncLoading ? 0.6 : 1 }}
                >
                  {syncLoading ? (
                    <Icon name="refresh" size={16} className="spin" />
                  ) : (
                    <Icon name="sync" size={16} />
                  )}
                  {syncLoading ? "Sincronizando..." : "Sincronizar ahora"}
                </button>
              </div>
              <section className="grid metric-grid">
                <MetricCard label="Retorno actual" value={`x${(latest?.roas ?? dashboard.client.current_roas).toFixed(1)}`} sub="Benchmark operativo x3.5" accent={(latest?.roas ?? 0) >= 3 ? "green" : "amber"} />
                <MetricCard label="Costo por venta" value={formatCurrency(latest?.cpa ?? 0)} sub="CPA registrado en ultima lectura" accent="blue" />
                <MetricCard label="Gasto hoy" value={formatCurrency(latest?.spend ?? 0)} sub={`Mes: ${formatCurrency(dashboard.monthSpend)}`} />
                <MetricCard label="Frecuencia" value={(latest?.frequency ?? 0).toFixed(1)} sub="Rotar creativos al superar 3.5" accent={(latest?.frequency ?? 0) > 3.5 ? "amber" : "green"} />
              </section>

              <section className="grid two-col">
                <div className="card card-pad" style={{ boxShadow: "none" }}>
                  <div className="section-title">
                    <div>
                      <div className="label">Ultimos 30 dias</div>
                      <h2>Retorno diario</h2>
                    </div>
                  </div>
                  <MiniChart series={roasSeries} />
                </div>
                <div className="card card-pad" style={{ boxShadow: "none" }}>
                  <div className="section-title">
                    <div>
                      <div className="label">Cuenta</div>
                      <h2>Estructura activa</h2>
                    </div>
                    <span className="badge purple">{PLAN_LABELS[dashboard.client.plan_type]}</span>
                  </div>
                  <table className="table">
                    <tbody>
                      <tr><td>Presupuesto mensual</td><td>{formatCurrency(PLAN_BUDGET_CAPS[dashboard.client.plan_type])}</td></tr>
                      <tr><td>Alcance</td><td>{formatCompact(latest?.reach ?? 0)}</td></tr>
                      <tr><td>Impresiones</td><td>{formatCompact(latest?.impressions ?? 0)}</td></tr>
                      <tr><td>Clics</td><td>{formatCompact(latest?.clicks ?? 0)}</td></tr>
                      <tr><td>Conversiones</td><td>{latest?.conversions ?? 0}</td></tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="grid two-col">
                <CreativeList title="Top anuncios ganadores" creatives={winners} badge="Ganador" />
                <CreativeList title="Peores anuncios" creatives={losers} badge="Bajo rendimiento" />
              </section>

              <section className="card card-pad" style={{ boxShadow: "none" }}>
                <div className="section-title">
                  <div>
                    <div className="label">Campanas</div>
                    <h2>Activas y en aprendizaje</h2>
                  </div>
                </div>
                <table className="table">
                  <thead>
                    <tr><th>Campana</th><th>Plataforma</th><th>Estado</th><th>Objetivo</th><th>Diario</th><th>Mensual</th></tr>
                  </thead>
                  <tbody>
                    {liveCampaigns.map((campaign) => (
                      <tr key={campaign.id}>
                        <td>{campaign.campaign_name}</td>
                        <td>{campaign.platform}</td>
                        <td><span className="badge green">{campaign.status}</span></td>
                        <td>{campaign.objective}</td>
                        <td>{formatCurrency(campaign.daily_budget)}</td>
                        <td>{formatCurrency(campaign.monthly_budget)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          ) : null}

          {activeTab === "briefing" ? (
            <div className="grid two-col">
              <BriefingBlock title="Datos basicos" rows={[["Negocio", dashboard.client.business_name], ["Contacto", dashboard.client.contact_name], ["Email", dashboard.client.email], ["WhatsApp", dashboard.client.whatsapp], ["Pais", dashboard.client.country], ["Web", dashboard.client.website ?? "Sin web"]]} />
              <BriefingBlock title="El negocio" rows={[["Tipo", dashboard.client.business_type], ["Categoria", dashboard.client.category], ["Producto", dashboard.client.product_description], ["Cliente ideal", dashboard.client.ideal_client]]} />
              <BriefingBlock title="Situacion actual" rows={[["Ventas mensuales", dashboard.client.monthly_sales_range], ["Inversion pauta", dashboard.client.monthly_ad_spend_range], ["Plataformas", dashboard.client.active_platforms.join(", ")], ["Retorno actual", `x${dashboard.client.current_roas}`]]} />
              <BriefingBlock title="Objetivos" rows={[["Objetivo", dashboard.client.main_goal], ["Horizonte", dashboard.client.time_horizon], ["Problema", dashboard.client.main_problem], ["Stock", dashboard.client.has_stock ? "Si" : "No"]]} />
              <BriefingBlock title="Accesos" rows={[["Meta", yesNo(dashboard.client.has_meta_access)], ["Google", yesNo(dashboard.client.has_google_access)], ["Analytics", yesNo(dashboard.client.has_analytics)], ["Shopify", yesNo(dashboard.client.has_shopify)], ["Pixel", yesNo(dashboard.client.has_pixel)], ["Catalogo", yesNo(dashboard.client.has_catalog)], ["Creativos", yesNo(dashboard.client.has_creative_assets)]]} />
              <div className="card card-pad" style={{ boxShadow: "none" }}>
                <div className="section-title">
                  <h2>Notas</h2>
                  <button className="ghost-button" type="button"><Icon name="edit" size={15} />Editar</button>
                </div>
                <p className="muted">{dashboard.client.additional_notes ?? "Sin notas adicionales."}</p>
              </div>
            </div>
          ) : null}

          {activeTab === "onboarding" && onboarding ? (
            <div className="grid" style={{ maxWidth: 860 }}>
              <div className="split">
                <div>
                  <div className="label">Progreso</div>
                  <h2>{progress}/7 pasos completos</h2>
                </div>
                <span className="badge purple">{Math.round((progress / 7) * 100)}%</span>
              </div>
              <div className="progress"><span style={{ width: `${(progress / 7) * 100}%` }} /></div>
              <StepRow step={1} done={onboarding.step_1_briefing} label="Paso 1: Briefing recibido" at={onboarding.step_1_briefing_at} onMark={markStep} loading={stepLoading === 1} />
              <StepRow step={2} done={onboarding.step_2_meta_access} label="Paso 2: Acceso Meta Business concedido" at={onboarding.step_2_meta_access_at} onMark={markStep} loading={stepLoading === 2} />
              <StepRow step={3} done={onboarding.step_3_campaign_built} label="Paso 3: Estructura de campana creada con SaleADS" at={onboarding.step_3_campaign_built_at} onMark={markStep} loading={stepLoading === 3} />
              <StepRow step={4} done={onboarding.step_4_creatives_uploaded} label="Paso 4: Creativos subidos desde 100ads" at={onboarding.step_4_creatives_uploaded_at} onMark={markStep} loading={stepLoading === 4} />
              <StepRow step={5} done={onboarding.step_5_pixel_verified} label="Paso 5: Pixel verificado" at={onboarding.step_5_pixel_verified_at} onMark={markStep} loading={stepLoading === 5} />
              <StepRow step={6} done={onboarding.step_6_campaign_live} label="Paso 6: Primera campana activa" at={onboarding.step_6_campaign_live_at} onMark={markStep} loading={stepLoading === 6} />
              <StepRow step={7} done={onboarding.step_7_first_report_sent} label="Paso 7: Primer reporte enviado" at={onboarding.step_7_first_report_sent_at} onMark={markStep} loading={stepLoading === 7} />
            </div>
          ) : null}

          {activeTab === "acciones" ? (
            <div className="grid">
              <div className="section-title">
                <div>
                  <div className="label">Historial</div>
                  <h2>Acciones registradas</h2>
                </div>
                <button className="ghost-button" type="button"><Icon name="download" size={15} />CSV</button>
              </div>
              <table className="table">
                <thead>
                  <tr><th>Fecha</th><th>Tipo</th><th>Descripcion</th><th>Alerta</th></tr>
                </thead>
                <tbody>
                  {dashboard.actions.map((action) => (
                    <tr key={action.id}>
                      <td>{new Date(action.created_at).toLocaleString("es-CO")}</td>
                      <td><span className="badge purple">{action.action_type}</span></td>
                      <td>{action.description}</td>
                      <td>{action.alert_id ? "Vinculada" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {activeTab === "herramientas" ? (
            <div className="grid two-col">
              <ToolChecklist
                icon="rocket_launch"
                title="Crear Campana con SaleADS"
                url="https://saleads.ai"
                items={[
                  "Acceder a SaleADS",
                  "Liberar slot de cliente anterior si es necesario",
                  "Crear cliente nuevo respetando el limite de 3 slots",
                  `Seleccionar plantilla para nicho: ${dashboard.client.category}`,
                  `Completar oferta: ${dashboard.client.product_description}`,
                  "Generar estructura en menos de 5 minutos",
                  "Revisar conjuntos y anuncios generados",
                  "Publicar en Meta Business Manager",
                  "Marcar paso 3 del onboarding como completo"
                ]}
              />
              <ToolChecklist
                icon="palette"
                title="Generar Creativos con 100ads"
                url="https://cienads.com"
                items={[
                  "Acceder a 100ads",
                  `Crear proyecto para ${dashboard.client.business_name}`,
                  `Cargar producto: ${dashboard.client.product_description}`,
                  `Cargar cliente ideal: ${dashboard.client.ideal_client}`,
                  "Seleccionar angulos: dolor, deseo, objecion, transformacion, urgencia",
                  "Generar pack de 50-100 creativos",
                  "Seleccionar los 5-10 mejores",
                  "Descargar formato Meta Ads",
                  "Marcar paso 4 del onboarding como completo"
                ]}
              />
            </div>
          ) : null}

          {activeTab === "chat" ? (
            <div className="grid two-col">
              <div className="card card-pad" style={{ boxShadow: "none" }}>
                <div className="section-title">
                  <div>
                    <div className="label">Conversacion</div>
                    <h2>Chat con cliente</h2>
                  </div>
                  {messages.some((item) => item.escalated_to_expert) ? <span className="badge yellow">Escalado</span> : null}
                </div>
                <div className="chat-list">
                  {messages.map((item) => (
                    <div key={item.id} className={`bubble ${item.role === "client" ? "client" : ""}`}>
                      <div className="label">{item.role === "client" ? "Cliente" : item.role === "expert" ? "Experto" : "BIA AI"}</div>
                      {item.content}
                    </div>
                  ))}
                </div>
                <form className="avatar-row" onSubmit={sendExpertMessage} style={{ marginTop: 14 }}>
                  <input className="input" placeholder="Responder al cliente" value={message} onChange={(event) => setMessage(event.target.value)} />
                  <button className="button" type="submit"><Icon name="send" size={15} /></button>
                </form>
              </div>
              <div className="card card-pad" style={{ boxShadow: "none" }}>
                <div className="label">Contexto actual</div>
                <table className="table">
                  <tbody>
                    <tr><td>Retorno</td><td>x{(latest?.roas ?? 0).toFixed(1)}</td></tr>
                    <tr><td>Gasto mes</td><td>{formatCurrency(dashboard.monthSpend)}</td></tr>
                    <tr><td>Frecuencia</td><td>{(latest?.frequency ?? 0).toFixed(1)}</td></tr>
                    <tr><td>Ultima accion</td><td>{dashboard.lastAction?.description ?? "Sin accion registrada"}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CreativeList({ title, creatives, badge }: { title: string; creatives: ClientDashboard["creatives"]; badge: string }) {
  return (
    <div className="card card-pad" style={{ boxShadow: "none" }}>
      <div className="section-title">
        <h2>{title}</h2>
      </div>
      <div className="ad-scroll">
        {creatives.map((creative) => (
          <article key={creative.id} className="card">
            <img className="ad-thumb" src={creative.thumbnail_url} alt={creative.name} />
            <div className="card-pad">
              <span className={creative.status === "loser" ? "badge red" : "badge green"}>{badge}</span>
              <strong style={{ display: "block", marginTop: 10 }}>{creative.name}</strong>
              <p className="small">Retorno x{creative.roas.toFixed(1)} · {formatCurrency(creative.spend)} · {creative.conversions} ventas</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function BriefingBlock({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="card card-pad" style={{ boxShadow: "none" }}>
      <div className="section-title"><h2>{title}</h2></div>
      <table className="table">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}><td>{label}</td><td>{value}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StepRow({ step, done, label, at, onMark, loading }: { step: number; done: boolean; label: string; at?: string | null; onMark: (step: number) => void; loading: boolean }) {
  return (
    <div className="alert-card">
      <div className="split">
        <strong>{label}</strong>
        <div className="avatar-row">
          {!done ? (
            <button
              type="button"
              className="ghost-button"
              disabled={loading}
              onClick={() => onMark(step)}
              style={{ fontSize: 13, opacity: loading ? 0.6 : 1 }}
            >
              {loading ? (
                <Icon name="refresh" size={16} className="spin" />
              ) : (
                <Icon name="check_circle" size={16} />
              )}
              Marcar completo
            </button>
          ) : null}
          <span className={done ? "badge green" : "badge"}>{done ? "Completo" : "Pendiente"}</span>
        </div>
      </div>
      <p className="small">{at ? new Date(at).toLocaleString("es-CO") : "Sin fecha registrada"}</p>
    </div>
  );
}

function stepKey(step: number): string {
  const keys: Record<number, string> = {
    1: "briefing", 2: "meta_access", 3: "campaign_built",
    4: "creatives_uploaded", 5: "pixel_verified", 6: "campaign_live", 7: "first_report_sent"
  };
  return keys[step] ?? "";
}

function ToolChecklist({ icon, title, url, items }: { icon: string; title: string; url: string; items: string[] }) {
  return (
    <div className="card card-pad" style={{ boxShadow: "none" }}>
      <div className="section-title">
        <div className="avatar-row">
          <Icon name={icon} size={18} />
          <h2>{title}</h2>
        </div>
        <a className="button" href={url} target="_blank" rel="noreferrer">Abrir</a>
      </div>
      <div className="grid">
        {items.map((item, index) => (
          <div className="split" key={item}>
            <span>{index + 1}. {item}</span>
            <span className="badge">Paso</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function yesNo(value: boolean) {
  return value ? "Si" : "No";
}
