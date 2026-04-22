import { randomUUID } from "node:crypto";
import {
  calculateRevenue,
  type ActionLog,
  type Alert,
  type AlertSeverity,
  type AlertType,
  type Campaign,
  type Client,
  type Creative,
  type HealthStatus,
  type MetricDaily,
  type PlanType,
  type Report
} from "@bia-ops/shared";

type HotmartEvent = {
  orderId: string;
  email: string;
  buyerName?: string;
  productName?: string;
  value?: number;
  currency?: string;
  status?: string;
  clientId?: string;
  accessToken?: string;
};

type AlertInput = {
  clientIds?: string[];
  severity?: AlertSeverity;
};

type ReportInput = {
  clientId: string;
  periodStart?: string;
  periodEnd?: string;
  reportType: "biweekly" | "monthly" | "custom";
};

type MetaSyncResult = {
  client: Client;
  metricsWindowDays: number;
  syncedAt: string;
  summary: {
    spend: number;
    impressions: number;
    clicks: number;
    roas: number;
    cpa: number;
  };
};

export type DailyRunResult = {
  processedClients: number;
  alertsCreated: number;
  alerts: Alert[];
};

const nowIso = () => new Date().toISOString();
const addDays = (date: string, days: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy.toISOString();
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

class LocalBiaStore {
  private readonly clients = new Map<string, Client>();
  private readonly campaigns = new Map<string, Campaign[]>();
  private readonly metrics = new Map<string, MetricDaily[]>();
  private readonly alerts = new Map<string, Alert[]>();
  private readonly reports = new Map<string, Report[]>();
  private readonly actions: ActionLog[] = [];

  constructor() {
    this.seed();
  }

  private seed() {
    const clientAlpha = this.createClient({
      id: "client-alpha",
      business_name: "Alpha Growth Studio",
      contact_name: "Mariana Lopez",
      email: "mariana@alpha.example",
      whatsapp: "+573001112233",
      country: "Colombia",
      business_type: "Servicios",
      category: "Marketing",
      product_description: "Servicios de performance para marcas DTC",
      ideal_client: "E-commerce con ticket medio",
      monthly_sales_range: "USD 15k - 50k",
      monthly_ad_spend_range: "USD 2k - 8k",
      active_platforms: ["meta", "google"],
      current_roas: 2.3,
      main_goal: "Escalar con rentabilidad",
      time_horizon: "90 días",
      main_problem: "Falta de estructura de optimización",
      has_stock: true,
      has_meta_access: true,
      has_google_access: true,
      has_analytics: true,
      has_shopify: true,
      has_pixel: true,
      has_conversion_data: true,
      has_catalog: true,
      has_creative_assets: true,
      previous_agency_experience: "Sí",
      how_found_us: "Referido",
      plan_type: "escalado",
      plan_price: 5000,
      health_status: "green",
      status: "active",
      onboarding_step: 7
    });

    const clientBravo = this.createClient({
      id: "client-bravo",
      business_name: "Bravo Labs",
      contact_name: "Sofia Torres",
      email: "sofia@bravo.example",
      whatsapp: "+573004445556",
      country: "México",
      business_type: "E-commerce",
      category: "Suplementos",
      product_description: "Suplementos de bienestar",
      ideal_client: "Compradores recurrentes",
      monthly_sales_range: "USD 8k - 20k",
      monthly_ad_spend_range: "USD 1k - 3k",
      active_platforms: ["meta"],
      current_roas: 0.96,
      main_goal: "Corregir campaña principal",
      time_horizon: "30 días",
      main_problem: "CPA alto",
      has_stock: true,
      has_meta_access: false,
      has_google_access: false,
      has_analytics: true,
      has_shopify: false,
      has_pixel: false,
      has_conversion_data: false,
      has_catalog: false,
      has_creative_assets: true,
      previous_agency_experience: "No",
      how_found_us: "Hotmart",
      plan_type: "sprint",
      plan_price: 2000,
      health_status: "yellow",
      status: "onboarding",
      onboarding_step: 3
    });

    this.campaigns.set(clientAlpha.id, [
      {
        id: randomUUID(),
        client_id: clientAlpha.id,
        campaign_name: "Prospección principal",
        platform: "meta",
        status: "active",
        objective: "Ventas",
        daily_budget: 180,
        monthly_budget: 5400,
        start_date: addDays(nowIso(), -21),
        created_at: nowIso()
      },
      {
        id: randomUUID(),
        client_id: clientAlpha.id,
        campaign_name: "Retargeting",
        platform: "meta",
        status: "learning",
        objective: "Conversiones",
        daily_budget: 80,
        monthly_budget: 2400,
        start_date: addDays(nowIso(), -12),
        created_at: nowIso()
      }
    ]);

    this.campaigns.set(clientBravo.id, [
      {
        id: randomUUID(),
        client_id: clientBravo.id,
        campaign_name: "Escala controlada",
        platform: "meta",
        status: "paused",
        objective: "Ventas",
        daily_budget: 90,
        monthly_budget: 2700,
        start_date: addDays(nowIso(), -14),
        created_at: nowIso()
      }
    ]);

    this.metrics.set(clientAlpha.id, this.buildMetricSeries(clientAlpha.id, 2.3));
    this.metrics.set(clientBravo.id, this.buildMetricSeries(clientBravo.id, 0.96));
    this.clients.set(clientAlpha.id, clientAlpha);
    this.clients.set(clientBravo.id, clientBravo);
  }

  private buildMetricSeries(clientId: string, baselineRoas: number): MetricDaily[] {
    const today = new Date();
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (13 - index));
      const dayFactor = 1 + ((index % 4) - 1.5) * 0.08;
      const roas = clamp(Number((baselineRoas * dayFactor).toFixed(2)), 0.4, 6);
      const spend = clamp(Number((120 + index * 11 + (baselineRoas < 1.2 ? 35 : 0)).toFixed(2)), 60, 800);
      const conversions = Math.max(0, Math.round(spend / (baselineRoas < 1 ? 120 : 85)));
      const revenue_generated = Number((spend * roas).toFixed(2));

      return {
        id: randomUUID(),
        client_id: clientId,
        date: date.toISOString(),
        spend,
        impressions: Math.round(spend * 55),
        reach: Math.round(spend * 24),
        clicks: Math.max(0, Math.round(spend * 2.4)),
        ctr: Number((0.018 + index * 0.0004).toFixed(4)),
        cpm: Number((12 + index * 0.25).toFixed(2)),
        cpc: Number((0.9 + index * 0.03).toFixed(2)),
        roas,
        cpa: Number((spend / Math.max(1, conversions)).toFixed(2)),
        conversions,
        revenue_generated,
        frequency: Number((1.8 + (index % 3) * 0.35).toFixed(2))
      };
    });
  }

  private createClient(partial: Partial<Client> & { id?: string; email: string; business_name: string; contact_name: string }) {
    const id = partial.id ?? randomUUID();
    const created_at = nowIso();
    const client: Client = {
      id,
      created_at,
      plan_type: partial.plan_type ?? "sprint",
      plan_price: partial.plan_price ?? 2000,
      billing_date: partial.billing_date ?? created_at,
      next_billing_date: partial.next_billing_date ?? addDays(created_at, 30),
      health_status: partial.health_status ?? "yellow",
      onboarding_step: partial.onboarding_step ?? 1,
      access_token: partial.access_token ?? randomUUID().replaceAll("-", ""),
      status: partial.status ?? "pending_onboarding",
      business_name: partial.business_name,
      contact_name: partial.contact_name,
      email: partial.email,
      whatsapp: partial.whatsapp ?? "",
      country: partial.country ?? "Colombia",
      business_type: partial.business_type ?? "Servicios",
      category: partial.category ?? "General",
      product_description: partial.product_description ?? "Producto o servicio",
      ideal_client: partial.ideal_client ?? "Empresas",
      monthly_sales_range: partial.monthly_sales_range ?? "USD 0 - 10k",
      monthly_ad_spend_range: partial.monthly_ad_spend_range ?? "USD 0 - 1k",
      active_platforms: partial.active_platforms ?? ["meta"],
      current_roas: partial.current_roas ?? 1,
      main_goal: partial.main_goal ?? "Aumentar ventas",
      time_horizon: partial.time_horizon ?? "90 días",
      main_problem: partial.main_problem ?? "Sin definir",
      has_stock: partial.has_stock ?? true,
      has_meta_access: partial.has_meta_access ?? false,
      has_google_access: partial.has_google_access ?? false,
      has_analytics: partial.has_analytics ?? false,
      has_shopify: partial.has_shopify ?? false,
      has_pixel: partial.has_pixel ?? false,
      has_conversion_data: partial.has_conversion_data ?? false,
      has_catalog: partial.has_catalog ?? false,
      has_creative_assets: partial.has_creative_assets ?? false,
      previous_agency_experience: partial.previous_agency_experience ?? "No",
      how_found_us: partial.how_found_us ?? "No definido",
      ...(partial.additional_notes !== undefined ? { additional_notes: partial.additional_notes } : {}),
      ...(partial.meta_ad_account_id !== undefined ? { meta_ad_account_id: partial.meta_ad_account_id } : {}),
      ...(partial.meta_access_token !== undefined ? { meta_access_token: partial.meta_access_token } : {}),
      ...(partial.last_meta_sync !== undefined ? { last_meta_sync: partial.last_meta_sync } : {}),
      ...(partial.assigned_expert_id !== undefined ? { assigned_expert_id: partial.assigned_expert_id } : {}),
      ...(partial.user_id !== undefined ? { user_id: partial.user_id } : {}),
      ...(partial.hotmart_order_id !== undefined ? { hotmart_order_id: partial.hotmart_order_id } : {})
    };

    this.clients.set(id, client);
    if (!this.campaigns.has(id)) this.campaigns.set(id, []);
    if (!this.metrics.has(id)) this.metrics.set(id, this.buildMetricSeries(id, client.current_roas));
    return client;
  }

  private latestMetric(clientId: string) {
    const series = this.metrics.get(clientId) ?? [];
    return series.at(-1);
  }

  private clientAlerts(clientId: string) {
    return this.alerts.get(clientId) ?? [];
  }

  listClients() {
    return Array.from(this.clients.values());
  }

  getClient(clientId: string) {
    return this.clients.get(clientId);
  }

  requireClient(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error(`No existe el cliente ${clientId}`);
    }
    return client;
  }

  upsertClient(client: Client) {
    this.clients.set(client.id, client);
    return client;
  }

  ensureHotmartClient(input: HotmartEvent) {
    const existing = input.clientId ? this.clients.get(input.clientId) : undefined;
    if (existing) {
      const updated = {
        ...existing,
        hotmart_order_id: input.orderId,
        email: input.email ?? existing.email,
        business_name: input.productName ? `${input.productName} - ${existing.business_name}` : existing.business_name,
        status: existing.status === "churned" ? "onboarding" : existing.status,
        access_token: input.accessToken ?? existing.access_token
      } satisfies Client;
      return this.upsertClient(updated);
    }

    const suffix = input.orderId.slice(-6).toUpperCase();
    return this.createClient({
      id: input.clientId ?? `client-${suffix.toLowerCase()}`,
      business_name: input.productName ? `${input.productName}` : `Cliente ${suffix}`,
      contact_name: input.buyerName ?? input.email.split("@")[0] ?? "Cliente",
      email: input.email,
      whatsapp: "",
      country: "Colombia",
      business_type: "Infoproducto",
      category: input.productName ?? "Hotmart",
      product_description: input.productName ?? "Compra registrada desde Hotmart",
      ideal_client: "Lead recién convertido",
      monthly_sales_range: "USD 0 - 10k",
      monthly_ad_spend_range: "USD 0 - 1k",
      active_platforms: ["meta"],
      current_roas: 1,
      main_goal: "Arrancar onboarding",
      time_horizon: "30 días",
      main_problem: "Implementación inicial",
      has_stock: true,
      has_meta_access: false,
      has_google_access: false,
      has_analytics: false,
      has_shopify: false,
      has_pixel: false,
      has_conversion_data: false,
      has_catalog: false,
      has_creative_assets: false,
      previous_agency_experience: "No",
      how_found_us: "Hotmart",
      plan_type: "sprint" as PlanType,
      plan_price: input.value ?? 2000,
      health_status: "yellow" as HealthStatus,
      status: "pending_onboarding",
      onboarding_step: 1,
      hotmart_order_id: input.orderId,
      ...(input.accessToken ? { access_token: input.accessToken } : {})
    });
  }

  registerHotmart(input: HotmartEvent) {
    const existedBefore = input.clientId ? this.clients.has(input.clientId) : false;
    const client = this.ensureHotmartClient(input);
    const action: ActionLog = {
      id: randomUUID(),
      client_id: client.id,
      expert_id: client.assigned_expert_id ?? "system",
      created_at: nowIso(),
      action_type: "hotmart_webhook",
      description: `Compra registrada para ${client.business_name}`,
      after_state: {
        orderId: input.orderId,
        email: input.email,
        value: input.value ?? client.plan_price
      }
    };

    this.actions.push(action);
    return {
      client,
      action,
      created: !existedBefore
    };
  }

  registerOnboarding(clientId: string, step: number, completed = true, notes?: string, expertId?: string) {
    const client = this.requireClient(clientId);
    const onboardingStep = Math.max(client.onboarding_step, step);
    const status = onboardingStep >= 6 ? "active" : "onboarding";
    const healthStatus: HealthStatus = onboardingStep >= 5 ? "green" : onboardingStep >= 3 ? "yellow" : "red";
    const updated: Client = {
      ...client,
      onboarding_step: onboardingStep,
      status,
      health_status: healthStatus,
      ...(expertId ?? client.assigned_expert_id ? { assigned_expert_id: expertId ?? client.assigned_expert_id } : {}),
      ...(notes
        ? {
            additional_notes: [client.additional_notes, notes].filter(Boolean).join(" | ")
          }
        : {})
    };

    this.upsertClient(updated);
    this.actions.push({
      id: randomUUID(),
      client_id: clientId,
      expert_id: expertId ?? "system",
      created_at: nowIso(),
      action_type: "onboarding_update",
      description: `Paso ${step} marcado como ${completed ? "completado" : "pendiente"}`,
      after_state: { onboarding_step: onboardingStep, status }
    });

    return {
      client: updated,
      progress: onboardingStep,
      completed
    };
  }

  syncMeta(clientId: string, metricsWindowDays: number, adAccountId?: string, accessToken?: string): MetaSyncResult {
    const client = this.requireClient(clientId);
    const metrics = this.metrics.get(clientId) ?? [];
    const windowMetrics = metrics.slice(-metricsWindowDays);
    const summary = windowMetrics.reduce(
      (acc, metric) => {
        acc.spend += metric.spend;
        acc.impressions += metric.impressions;
        acc.clicks += metric.clicks;
        acc.roas += metric.roas;
        acc.cpa += metric.cpa;
        return acc;
      },
      { spend: 0, impressions: 0, clicks: 0, roas: 0, cpa: 0 }
    );

    const count = Math.max(1, windowMetrics.length);
    const updated: Client = {
      ...client,
      ...(adAccountId ?? client.meta_ad_account_id ? { meta_ad_account_id: adAccountId ?? client.meta_ad_account_id } : {}),
      ...(accessToken ?? client.meta_access_token ? { meta_access_token: accessToken ?? client.meta_access_token } : {}),
      last_meta_sync: nowIso(),
      health_status: summary.roas / count >= 1.2 ? "green" : "yellow"
    };

    this.upsertClient(updated);
    this.actions.push({
      id: randomUUID(),
      client_id: clientId,
      expert_id: client.assigned_expert_id ?? "system",
      created_at: nowIso(),
      action_type: "meta_sync",
      description: `Sincronización local de Meta para ${client.business_name}`,
      after_state: {
        metricsWindowDays,
        summary
      }
    });

    return {
      client: updated,
      metricsWindowDays,
      syncedAt: updated.last_meta_sync ?? nowIso(),
      summary: {
        spend: Number(summary.spend.toFixed(2)),
        impressions: Math.round(summary.impressions),
        clicks: Math.round(summary.clicks),
        roas: Number((summary.roas / count).toFixed(2)),
        cpa: Number((summary.cpa / count).toFixed(2))
      }
    };
  }

  runDailyAlerts(input: AlertInput = {}): DailyRunResult {
    const clients = input.clientIds
      ? input.clientIds.map((clientId) => this.clients.get(clientId)).filter((client): client is Client => Boolean(client))
      : this.listClients();

    const alerts: Alert[] = [];

    for (const client of clients) {
      const latest = this.latestMetric(client.id);
      const existingToday = this.clientAlerts(client.id).filter((alert) => alert.created_at.slice(0, 10) === nowIso().slice(0, 10));
      const makeAlert = (alertType: AlertType, severity: AlertSeverity, metricAffected: string, currentValue: number, benchmarkValue: number, suggestedAction: string) => {
        if (input.severity && severity !== input.severity) {
          return;
        }

        if (existingToday.some((alert) => alert.alert_type === alertType)) {
          return;
        }

        const alert: Alert = {
          id: randomUUID(),
          client_id: client.id,
          created_at: nowIso(),
          severity,
          alert_type: alertType,
          metric_affected: metricAffected,
          current_value: currentValue,
          benchmark_value: benchmarkValue,
          threshold_exceeded: `${metricAffected} fuera de umbral`,
          suggested_action: suggestedAction,
          status: "active"
        };
        const clientAlerts = this.alerts.get(client.id) ?? [];
        clientAlerts.push(alert);
        this.alerts.set(client.id, clientAlerts);
        alerts.push(alert);
      };

      if (!client.has_meta_access) {
        makeAlert("account_inactive", "yellow", "Meta access", 0, 1, "Validar acceso a Meta Ads y restablecer permisos.");
      }

      if (latest && latest.roas < 1.2) {
        makeAlert(
          "roas_drop",
          latest.roas < 1 ? "red" : "yellow",
          "ROAS",
          latest.roas,
          1.5,
          "Reducir inversión, revisar oferta y aislar conjuntos de anuncios de bajo rendimiento."
        );
      }

      if (latest && latest.frequency > 2.7) {
        makeAlert("frequency", "yellow", "Frequency", latest.frequency, 2.4, "Rotar creatividades y ampliar audiencias.");
      }

      if (latest && latest.cpa > client.plan_price * 0.08) {
        makeAlert("cpa_spike", "yellow", "CPA", latest.cpa, client.plan_price * 0.05, "Optimizar segmentación y revisar la calidad del evento.");
      }
    }

    return {
      processedClients: clients.length,
      alertsCreated: alerts.length,
      alerts
    };
  }

  generateReport(input: ReportInput) {
    const client = this.requireClient(input.clientId);
    const metrics = this.metrics.get(client.id) ?? [];
    const periodStart = input.periodStart ? new Date(input.periodStart) : new Date(Date.now() - 13 * 86_400_000);
    const periodEnd = input.periodEnd ? new Date(input.periodEnd) : new Date();
    const slice = metrics.filter((metric) => {
      const metricDate = new Date(metric.date);
      return metricDate >= periodStart && metricDate <= periodEnd;
    });

    const selectedMetrics = slice.length > 0 ? slice : metrics.slice(-7);
    const totals = selectedMetrics.reduce(
      (acc, metric) => {
        acc.spend += metric.spend;
        acc.reach += metric.reach;
        acc.impressions += metric.impressions;
        acc.roas += metric.roas;
        acc.revenue += metric.revenue_generated;
        acc.conversions += metric.conversions;
        return acc;
      },
      { spend: 0, reach: 0, impressions: 0, roas: 0, revenue: 0, conversions: 0 }
    );

    const campaigns = this.campaigns.get(client.id) ?? [];
    const avgRoas = selectedMetrics.length > 0 ? totals.roas / selectedMetrics.length : client.current_roas;
    const topCreatives: Creative[] = campaigns.slice(0, 3).map((campaign, index) => ({
      id: randomUUID(),
      client_id: client.id,
      campaign_id: campaign.id,
      name: `${campaign.campaign_name} - Creativo ${index + 1}`,
      thumbnail_url: `${this.safeBaseUrl()}/placeholder/${client.id}/${campaign.id}`,
      spend: Number((totals.spend / Math.max(1, campaigns.length)).toFixed(2)),
      roas: Number((avgRoas * (1 + index * 0.1)).toFixed(2)),
      conversions: Math.max(0, Math.round(totals.conversions / Math.max(1, campaigns.length))),
      status: avgRoas >= 2 ? "winner" : avgRoas >= 1.2 ? "watch" : "loser"
    }));

    const recommendations = this.buildRecommendations(avgRoas, client, selectedMetrics.length);
    const report: Report = {
      id: randomUUID(),
      client_id: client.id,
      created_at: nowIso(),
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      report_type: input.reportType,
      total_spend: Number(totals.spend.toFixed(2)),
      avg_roas: Number(avgRoas.toFixed(2)),
      total_reach: Math.round(totals.reach),
      total_impressions: Math.round(totals.impressions),
      top_creatives: topCreatives,
      recommendations,
      pdf_url: `${this.safeBaseUrl()}/reports/${client.id}/${Date.now()}.pdf`
    };

    const clientReports = this.reports.get(client.id) ?? [];
    clientReports.push(report);
    this.reports.set(client.id, clientReports);

    return {
      report,
      revenue: calculateRevenue(Array.from(this.clients.values())),
      meta: {
        metrics_count: selectedMetrics.length,
        campaigns_count: campaigns.length
      }
    };
  }

  private safeBaseUrl() {
    return process.env.EXTERNAL_BASE_URL ?? `http://127.0.0.1:${process.env.API_PORT ?? process.env.PORT ?? "4000"}`;
  }

  private buildRecommendations(avgRoas: number, client: Client, metricCount: number) {
    const recommendations: string[] = [];

    if (avgRoas < 1.2) {
      recommendations.push("Pausar los anuncios de menor rendimiento y rehacer los ángulos creativos.");
    } else if (avgRoas < 2) {
      recommendations.push("Escalar solo los conjuntos con mejor CTR y revisar el CPA por audiencia.");
    } else {
      recommendations.push("Mantener el presupuesto principal y duplicar la mejor combinación creativa.");
    }

    if (!client.has_pixel || !client.has_conversion_data) {
      recommendations.push("Completar la medición antes de subir presupuesto.");
    }

    if (metricCount < 5) {
      recommendations.push("Ampliar la ventana de datos para confirmar tendencia.");
    }

    return recommendations.join(" ");
  }

  getClientActions(clientId: string): ActionLog[] {
    return this.actions.filter((a) => a.client_id === clientId);
  }

  updateReportPdfUrl(reportId: string, clientId: string, pdfUrl: string): void {
    const clientReports = this.reports.get(clientId);
    if (!clientReports) return;
    const idx = clientReports.findIndex((r) => r.id === reportId);
    if (idx === -1) return;
    const report = clientReports[idx];
    if (!report) return;
    clientReports[idx] = { ...report, pdf_url: pdfUrl };
    this.reports.set(clientId, clientReports);
  }

  getHealthSnapshot() {
    const clients = this.listClients();
    const activeClients = clients.filter((client) => client.status === "active" || client.status === "onboarding");
    const metricCount = Array.from(this.metrics.values()).reduce((count, list) => count + list.length, 0);
    const alertCount = Array.from(this.alerts.values()).reduce((count, list) => count + list.length, 0);
    return {
      clients: clients.length,
      activeClients: activeClients.length,
      metricCount,
      alertCount,
      reportCount: Array.from(this.reports.values()).reduce((count, list) => count + list.length, 0),
      revenue: calculateRevenue(clients),
      healthy: activeClients.length > 0
    };
  }
}

export const store = new LocalBiaStore();
