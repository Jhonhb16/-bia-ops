import {
  ALERT_LABELS,
  PLAN_BUDGET_CAPS,
  calculateRevenue,
  daysBetween,
  onboardingProgress,
  type ActionLog,
  type Alert,
  type Campaign,
  type ChatMessage,
  type Client,
  type HealthStatus,
  type MetricDaily,
  type OnboardingChecklist,
  type Report,
  type RevenueTracking
} from "@bia-ops/shared";
import { getSupabaseAdminClient } from "./supabase";
import { createSeedState } from "./seed-data";

// ---------------------------------------------------------------------------
// Demo fallback (active when Supabase env vars are not configured)
// ---------------------------------------------------------------------------

type BiaState = ReturnType<typeof createSeedState>;

const globalForStore = globalThis as typeof globalThis & {
  __biaOpsState?: BiaState;
};

function isDemo(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function getDemoState(): BiaState {
  if (!globalForStore.__biaOpsState) {
    globalForStore.__biaOpsState = createSeedState();
  }
  return globalForStore.__biaOpsState;
}

// ---------------------------------------------------------------------------
// Helper to assert admin client is available
// ---------------------------------------------------------------------------

function requireAdmin() {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabase admin client not configured");
  return client;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CEOStats {
  grossRevenue: number;
  hotmartFee: number;
  biancaCommission: number;
  toolsCost: number;
  expertSalary: number;
  netMario: number;
  activeClients: number;
  retention: number;
}

// ---------------------------------------------------------------------------
// Client operations
// ---------------------------------------------------------------------------

export async function getClients(): Promise<Client[]> {
  if (isDemo()) return getDemoState().clients;

  const supabase = requireAdmin();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapClient);
}

export async function getClientById(id: string): Promise<Client | null> {
  if (isDemo()) return getDemoState().clients.find((c) => c.id === id) ?? null;

  const supabase = requireAdmin();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return mapClient(data);
}

export async function createClient(data: Partial<Client>): Promise<Client> {
  if (isDemo()) {
    const state = getDemoState();
    const client = { ...data } as Client;
    state.clients.push(client);
    return client;
  }

  const supabase = requireAdmin();
  const { data: created, error } = await supabase
    .from("clients")
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapClient(created);
}

export async function updateClient(id: string, data: Partial<Client>): Promise<void> {
  if (isDemo()) {
    const state = getDemoState();
    const index = state.clients.findIndex((c) => c.id === id);
    if (index !== -1) state.clients[index] = { ...state.clients[index], ...data };
    return;
  }

  const supabase = requireAdmin();
  const { error } = await supabase
    .from("clients")
    .update(data)
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Alert operations
// ---------------------------------------------------------------------------

export async function getAlerts(filters?: { status?: string; clientId?: string }): Promise<Alert[]> {
  if (isDemo()) {
    let alerts = getDemoState().alerts;
    if (filters?.status) alerts = alerts.filter((a) => a.status === filters.status);
    if (filters?.clientId) alerts = alerts.filter((a) => a.client_id === filters.clientId);
    return alerts;
  }

  const supabase = requireAdmin();
  let query = supabase.from("alerts").select("*").order("created_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.clientId) query = query.eq("client_id", filters.clientId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapAlert);
}

export async function resolveAlert(alertId: string, expertId: string, notes: string): Promise<Alert | null> {
  if (isDemo()) {
    const state = getDemoState();
    const alert = state.alerts.find((a) => a.id === alertId);
    if (!alert) return null;
    alert.status = "resolved";
    alert.resolved_at = new Date().toISOString();
    alert.resolved_by = expertId;
    alert.expert_notes = notes;

    const client = state.clients.find((c) => c.id === alert.client_id);
    if (client) {
      const activeAlerts = state.alerts.filter((a) => a.client_id === client.id && a.status === "active");
      client.health_status = activeAlerts.some((a) => a.severity === "red")
        ? "red"
        : activeAlerts.length > 0
          ? "yellow"
          : "green";
    }

    state.action_log.unshift({
      id: `act-${Date.now()}`,
      client_id: alert.client_id,
      expert_id: expertId,
      created_at: new Date().toISOString(),
      action_type: ALERT_LABELS[alert.alert_type],
      description: notes,
      alert_id: alert.id,
      before_state: { status: "active", current_value: alert.current_value },
      after_state: { status: "resolved" }
    });
    return alert;
  }

  const supabase = requireAdmin();
  const now = new Date().toISOString();

  const { data: alertData, error: fetchError } = await supabase
    .from("alerts")
    .select("*")
    .eq("id", alertId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const { error: updateError } = await supabase
    .from("alerts")
    .update({
      status: "resolved",
      resolved_at: now,
      resolved_by: expertId,
      expert_notes: notes
    })
    .eq("id", alertId);

  if (updateError) throw new Error(updateError.message);

  await supabase.from("action_logs").insert({
    client_id: alertData.client_id,
    expert_id: expertId,
    action_type: ALERT_LABELS[alertData.alert_type as keyof typeof ALERT_LABELS] ?? alertData.alert_type,
    description: notes,
    alert_id: alertId,
    before_state: { status: "active" },
    after_state: { status: "resolved" }
  });

  const { data: remaining } = await supabase
    .from("alerts")
    .select("severity")
    .eq("client_id", alertData.client_id)
    .eq("status", "active");

  const health: HealthStatus = (remaining ?? []).some((a) => a.severity === "red")
    ? "red"
    : (remaining ?? []).length > 0
      ? "yellow"
      : "green";

  await supabase.from("clients").update({ health_status: health }).eq("id", alertData.client_id);

  return mapAlert({
    ...(alertData as Record<string, unknown>),
    status: "resolved",
    resolved_at: now,
    resolved_by: expertId,
    expert_notes: notes
  });
}

// ---------------------------------------------------------------------------
// Action log operations
// ---------------------------------------------------------------------------

export async function logAction(action: ActionLog): Promise<void> {
  if (isDemo()) {
    getDemoState().action_log.unshift(action);
    return;
  }

  const supabase = requireAdmin();
  const { error } = await supabase.from("action_logs").insert({
    client_id: action.client_id,
    expert_id: action.expert_id,
    action_type: action.action_type,
    description: action.description,
    before_state: action.before_state ?? null,
    after_state: action.after_state ?? null,
    alert_id: action.alert_id ?? null
  });

  if (error) throw new Error(error.message);
}

export async function getActionLog(clientId: string): Promise<ActionLog[]> {
  if (isDemo()) {
    return getDemoState().action_log.filter((a) => a.client_id === clientId);
  }

  const supabase = requireAdmin();
  const { data, error } = await supabase
    .from("action_logs")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapActionLog);
}

// ---------------------------------------------------------------------------
// CEO stats
// ---------------------------------------------------------------------------

export async function getCEOStats(): Promise<CEOStats> {
  if (isDemo()) {
    const state = getDemoState();
    const rev = calculateRevenue(state.clients);
    const retention = state.revenue_tracking.at(-1)?.retention_rate ?? 0.94;
    return { ...rev, retention };
  }

  const supabase = requireAdmin();
  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("plan_price, status");

  if (clientsError) throw new Error(clientsError.message);

  const activeClients = (clients ?? []).filter((client) => client.status === "active" || client.status === "onboarding");
  const grossRevenue = activeClients.reduce((sum, client) => sum + Number(client.plan_price), 0);
  const hotmartFee = grossRevenue * 0.1;
  const afterHotmart = grossRevenue - hotmartFee;
  const biancaCommission = afterHotmart * 0.35;
  const toolsCost = 191;
  const expertSalary = 1200;
  const netMario = afterHotmart - biancaCommission - toolsCost - expertSalary;
  const rev = {
    grossRevenue,
    hotmartFee,
    biancaCommission,
    toolsCost,
    expertSalary,
    netMario,
    activeClients: activeClients.length
  };

  const { data: revData } = await supabase
    .from("revenue_tracking")
    .select("retention_rate")
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { ...rev, retention: revData?.retention_rate ?? 0 };
}

// ---------------------------------------------------------------------------
// Revenue tracking
// ---------------------------------------------------------------------------

export async function getRevenueTracking(): Promise<RevenueTracking[]> {
  if (isDemo()) return getDemoState().revenue_tracking;

  const supabase = requireAdmin();
  const { data, error } = await supabase
    .from("revenue_tracking")
    .select("*")
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as RevenueTracking[];
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export async function updateOnboardingStep(clientId: string, step: number): Promise<void> {
  if (isDemo()) {
    const state = getDemoState();
    const item = state.onboarding_checklist.find((i) => i.client_id === clientId);
    if (item) {
      const col = stepColumnName(step) as keyof OnboardingChecklist;
      const atCol = `${col}_at` as keyof OnboardingChecklist;
      const writable = item as unknown as Record<string, unknown>;
      writable[col as string] = true;
      writable[atCol as string] = new Date().toISOString();
    }

    const client = state.clients.find((c) => c.id === clientId);
    if (client && step > client.onboarding_step) {
      client.onboarding_step = step;
    }
    return;
  }

  const supabase = requireAdmin();
  const stepCol = stepColumnName(step);
  const stepAtCol = `${stepCol}_at`;
  const now = new Date().toISOString();

  await supabase
    .from("onboarding_checklists")
    .upsert(
      { client_id: clientId, [stepCol]: true, [stepAtCol]: now },
      { onConflict: "client_id" }
    );

  const { data: existing } = await supabase
    .from("clients")
    .select("onboarding_step")
    .eq("id", clientId)
    .single();

  if (existing && step > (existing.onboarding_step ?? 0)) {
    await supabase.from("clients").update({ onboarding_step: step }).eq("id", clientId);
  }
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export async function getClientMetrics(clientId: string, days: number): Promise<MetricDaily[]> {
  if (isDemo()) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return getDemoState()
      .metrics_daily.filter((m) => m.client_id === clientId && new Date(m.date) >= cutoff)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  const supabase = requireAdmin();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const { data, error } = await supabase
    .from("metric_daily")
    .select("*")
    .eq("client_id", clientId)
    .gte("date", cutoff.toISOString().slice(0, 10))
    .order("date", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as MetricDaily[];
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function getReports(clientId?: string): Promise<Report[]> {
  if (isDemo()) {
    const reports = getDemoState().reports;
    return clientId ? reports.filter((r) => r.client_id === clientId) : reports;
  }

  const supabase = requireAdmin();
  let query = supabase
    .from("reports")
    .select("*, report_top_creatives(sort_order, creative_id, name, thumbnail_url, spend, roas, conversions, status)")
    .order("period_start", { ascending: false });

  if (clientId) query = query.eq("client_id", clientId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapReport);
}

// ---------------------------------------------------------------------------
// Legacy synchronous helpers preserved for existing call-sites
// ---------------------------------------------------------------------------

export function getUserByEmail(email: string) {
  return getDemoState().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function getUserById(id: string) {
  return getDemoState().users.find((u) => u.id === id);
}

export function getClientByToken(token: string) {
  return getDemoState().clients.find((c) => c.access_token === token);
}

export function getClient(clientId: string) {
  return getDemoState().clients.find((c) => c.id === clientId);
}

export function getLatestMetric(clientId: string): MetricDaily | null {
  return (
    getDemoState()
      .metrics_daily.filter((m) => m.client_id === clientId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] ?? null
  );
}

export function getClientMonthSpend(clientId: string): number {
  const today = new Date();
  return getDemoState()
    .metrics_daily.filter((m) => {
      const d = new Date(m.date);
      return (
        m.client_id === clientId &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    })
    .reduce((sum, m) => sum + m.spend, 0);
}

export async function getClientDashboard(clientId: string) {
  if (isDemo()) {
    const state = getDemoState();
    const client = getClient(clientId);
    if (!client) return null;
    const metrics = state.metrics_daily
      .filter((m) => m.client_id === clientId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const latestMetric = metrics.at(-1) ?? null;
    const previousMetric = metrics.at(-8) ?? metrics.at(0) ?? null;
    const monthSpend = getClientMonthSpend(clientId);
    const budgetCap = PLAN_BUDGET_CAPS[client.plan_type];
    const lastAction =
      state.action_log
        .filter((a) => a.client_id === clientId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null;
    return {
      client, metrics, latestMetric, previousMetric, monthSpend, budgetCap, lastAction,
      campaigns: state.campaigns.filter((c) => c.client_id === clientId),
      creatives: state.creatives.filter((c) => c.client_id === clientId),
      alerts: state.alerts.filter((a) => a.client_id === clientId && a.status !== "resolved"),
      reports: state.reports.filter((r) => r.client_id === clientId),
      onboarding: state.onboarding_checklist.find((i) => i.client_id === clientId) ?? null,
      actions: state.action_log.filter((a) => a.client_id === clientId),
      messages: state.chat_messages.filter((m) => m.client_id === clientId)
    };
  }

  const supabase = requireAdmin();
  const [clientRes, metricsRes, alertsRes, reportsRes, onboardingRes, actionsRes, messagesRes, campaignsRes] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", clientId).single(),
      supabase.from("metric_daily").select("*").eq("client_id", clientId).order("date", { ascending: true }),
      supabase.from("alerts").select("*").eq("client_id", clientId).neq("status", "resolved"),
      supabase.from("reports").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("onboarding_checklists").select("*").eq("client_id", clientId).single(),
      supabase.from("action_logs").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("chat_messages").select("*").eq("client_id", clientId).order("created_at", { ascending: true }),
      supabase.from("campaigns").select("*").eq("client_id", clientId)
    ]);

  if (clientRes.error || !clientRes.data) return null;

  const client = mapClient(clientRes.data as Record<string, unknown>);
  const metrics = (metricsRes.data ?? []) as MetricDaily[];
  const latestMetric = metrics.at(-1) ?? null;
  const previousMetric = metrics.at(-8) ?? metrics.at(0) ?? null;
  const budgetCap = PLAN_BUDGET_CAPS[client.plan_type];
  const actions = (actionsRes.data ?? []) as ActionLog[];

  return {
    client,
    metrics,
    latestMetric,
    previousMetric,
    monthSpend: 0,
    budgetCap,
    lastAction: actions[0] ?? null,
    campaigns: (campaignsRes.data ?? []) as Campaign[],
    creatives: [],
    alerts: (alertsRes.data ?? []).map(mapAlert),
    reports: (reportsRes.data ?? []) as Report[],
    onboarding: (onboardingRes.data ?? null) as OnboardingChecklist | null,
    actions,
    messages: (messagesRes.data ?? []) as ChatMessage[]
  };
}

export async function getCeoDashboard() {
  if (!isDemo()) {
    const supabase = requireAdmin();
    const [clientsRes, alertsRes, actionsRes, revenueRes, onboardingRes] = await Promise.all([
      supabase.from("clients").select("*").order("created_at", { ascending: false }),
      supabase.from("alerts").select("*").eq("status", "active"),
      supabase.from("action_logs").select("*").order("created_at", { ascending: false }),
      supabase.from("revenue_tracking").select("*").order("year", { ascending: false }).order("month", { ascending: false }),
      supabase.from("onboarding_checklists").select("*")
    ]);

    const allClients = (clientsRes.data ?? []).map(mapClient);
    const activeClients = allClients.filter((c) => c.status === "active" || c.status === "onboarding");
    const grossRevenue = activeClients.reduce((sum, c) => sum + c.plan_price, 0);
    const hotmartFee = grossRevenue * 0.1;
    const afterHotmart = grossRevenue - hotmartFee;
    const biancaCommission = afterHotmart * 0.35;
    const toolsCost = 191;
    const expertSalary = 1200;
    const netMario = afterHotmart - biancaCommission - toolsCost - expertSalary;
    const revenue = { grossRevenue, hotmartFee, biancaCommission, toolsCost, expertSalary, netMario, activeClients: activeClients.length };

    const planBreakdown = ["sprint", "escalado", "enterprise"].map((plan) => {
      const planClients = activeClients.filter((c) => c.plan_type === plan);
      const subtotal = planClients.reduce((sum, c) => sum + c.plan_price, 0);
      return {
        plan,
        clients: planClients.length,
        price: plan === "sprint" ? 280 : plan === "escalado" ? 650 : "custom",
        subtotal,
        percent: grossRevenue > 0 ? subtotal / grossRevenue : 0
      };
    });

    const healthCards = activeClients.map((client) => ({
      client,
      latestMetric: null,
      monthSpend: 0,
      activeAlerts: (alertsRes.data ?? []).filter((a) => a.client_id === client.id).length,
      daysActive: daysBetween(client.created_at)
    }));

    const latestRevenue = (revenueRes.data ?? [])[0];
    const revenueSeries = Array.from({ length: 6 }, (_, index) => {
      const scale = 0.72 + index * 0.07;
      return {
        label: new Date(new Date().getFullYear(), new Date().getMonth() - (5 - index), 1).toLocaleDateString("es-CO", { month: "short" }),
        gross: Math.round(grossRevenue * scale),
        net: Math.round(netMario * scale)
      };
    });

    const allActions = (actionsRes.data ?? []).map(mapActionLog);

    return {
      revenue,
      activeClients,
      planBreakdown,
      healthCards,
      revenueSeries,
      activeAlerts: (alertsRes.data ?? []).map(mapAlert),
      newClients: allClients.filter((c) => daysBetween(c.created_at) <= 10).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      retention: latestRevenue?.retention_rate ?? 0,
      actionsThisWeek: allActions.filter((a) => daysBetween(a.created_at) <= 7),
      onboarding: (onboardingRes.data ?? []) as OnboardingChecklist[]
    };
  }

  const state = getDemoState();
  const revenue = calculateRevenue(state.clients);
  const activeClients = state.clients.filter((c) => c.status === "active" || c.status === "onboarding");
  const planBreakdown = ["sprint", "escalado", "enterprise"].map((plan) => {
    const clients = activeClients.filter((c) => c.plan_type === plan);
    const subtotal = clients.reduce((sum, c) => sum + c.plan_price, 0);
    return {
      plan,
      clients: clients.length,
      price: plan === "sprint" ? 280 : plan === "escalado" ? 650 : "custom",
      subtotal,
      percent: revenue.grossRevenue > 0 ? subtotal / revenue.grossRevenue : 0
    };
  });

  const healthCards = activeClients.map((client) => {
    const latestMetric = getLatestMetric(client.id);
    return {
      client,
      latestMetric,
      monthSpend: getClientMonthSpend(client.id),
      activeAlerts: state.alerts.filter((a) => a.client_id === client.id && a.status === "active").length,
      daysActive: daysBetween(client.created_at)
    };
  });

  const revenueSeries = Array.from({ length: 6 }, (_, index) => {
    const scale = 0.72 + index * 0.07;
    return {
      label: new Date(new Date().getFullYear(), new Date().getMonth() - (5 - index), 1).toLocaleDateString("es-CO", {
        month: "short"
      }),
      gross: Math.round(revenue.grossRevenue * scale),
      net: Math.round(revenue.netMario * scale)
    };
  });

  return {
    revenue,
    activeClients,
    planBreakdown,
    healthCards,
    revenueSeries,
    activeAlerts: state.alerts.filter((a) => a.status === "active"),
    newClients: state.clients
      .filter((c) => daysBetween(c.created_at) <= 10)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    retention: state.revenue_tracking.at(-1)?.retention_rate ?? 0.94,
    actionsThisWeek: state.action_log.filter((a) => daysBetween(a.created_at) <= 7),
    onboarding: state.onboarding_checklist
  };
}

export async function getExpertDashboard() {
  if (isDemo()) {
    const state = getDemoState();
    const clients = state.clients.map((client) => {
      const latestMetric = getLatestMetric(client.id);
      const activeAlerts = state.alerts.filter((a) => a.client_id === client.id && a.status === "active");
      const lastAction =
        state.action_log
          .filter((a) => a.client_id === client.id)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null;
      return {
        client,
        latestMetric,
        monthSpend: getClientMonthSpend(client.id),
        activeAlerts,
        lastAction,
        onboarding: state.onboarding_checklist.find((i) => i.client_id === client.id) ?? null
      };
    });
    return {
      clients,
      alerts: state.alerts
        .filter((a) => a.status !== "resolved")
        .sort((a, b) =>
          severityWeight(b.severity) - severityWeight(a.severity) ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
      resolvedToday: state.alerts.filter(
        (a) => a.status === "resolved" && a.resolved_at && daysBetween(a.resolved_at) === 0
      ).length,
      actions: state.action_log,
      onboarding: state.onboarding_checklist
    };
  }

  // Supabase path
  const supabase = requireAdmin();
  const [clientsRes, alertsRes, onboardingRes] = await Promise.all([
    supabase.from("clients").select("*").order("created_at", { ascending: false }),
    supabase.from("alerts").select("*").neq("status", "resolved").order("created_at", { ascending: false }),
    supabase.from("onboarding_checklists").select("*")
  ]);

  const allClients = (clientsRes.data ?? []).map(mapClient);
  const allAlerts = (alertsRes.data ?? []).map(mapAlert);
  const allOnboarding = (onboardingRes.data ?? []) as OnboardingChecklist[];

  const clients = allClients.map((client) => {
    const activeAlerts = allAlerts.filter((a) => a.client_id === client.id);
    const onboarding = allOnboarding.find((o) => o.client_id === client.id) ?? null;
    return {
      client,
      latestMetric: null,
      monthSpend: 0,
      activeAlerts,
      lastAction: null,
      onboarding
    };
  });

  return {
    clients,
    alerts: allAlerts.sort((a, b) =>
      severityWeight(b.severity) - severityWeight(a.severity) ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
    resolvedToday: 0,
    actions: [],
    onboarding: allOnboarding
  };
}

export function addChatMessage(clientId: string, content: string): ChatMessage[] {
  const state = getDemoState();
  const client = getClient(clientId);
  if (!client) return [];
  const latestMetric = getLatestMetric(clientId);
  const shouldEscalate = shouldEscalateMessage(content);
  const clientMessage: ChatMessage = {
    id: `chat-${Date.now()}-client`,
    client_id: clientId,
    created_at: new Date().toISOString(),
    role: "client",
    content,
    escalated_to_expert: shouldEscalate,
    meta_context_snapshot: latestMetric ? { ...latestMetric } : undefined
  };
  const aiMessage: ChatMessage = {
    id: `chat-${Date.now()}-ai`,
    client_id: clientId,
    created_at: new Date().toISOString(),
    role: "ai",
    content: buildAiReply(client, latestMetric, content, shouldEscalate),
    escalated_to_expert: shouldEscalate,
    expert_notified_at: shouldEscalate ? new Date().toISOString() : undefined,
    meta_context_snapshot: latestMetric ? { ...latestMetric } : undefined
  };
  state.chat_messages.push(clientMessage, aiMessage);

  if (shouldEscalate) {
    state.alerts.unshift({
      id: `alert-chat-${Date.now()}`,
      client_id: clientId,
      created_at: new Date().toISOString(),
      severity: "yellow",
      alert_type: "no_action",
      metric_affected: "Chat del cliente",
      current_value: 1,
      benchmark_value: 0,
      threshold_exceeded: "Pregunta requiere accion humana",
      suggested_action: `Responder conversacion del cliente: ${content.slice(0, 120)}`,
      status: "active"
    });
  }

  return state.chat_messages.filter((m) => m.client_id === clientId);
}

export function addExpertChatMessage(clientId: string, content: string, expertId: string): ChatMessage[] {
  const state = getDemoState();
  state.chat_messages.push({
    id: `chat-${Date.now()}-expert`,
    client_id: clientId,
    created_at: new Date().toISOString(),
    role: "expert",
    content,
    escalated_to_expert: false
  });
  state.action_log.unshift({
    id: `act-chat-${Date.now()}`,
    client_id: clientId,
    expert_id: expertId,
    created_at: new Date().toISOString(),
    action_type: "Respuesta cliente",
    description: `Se respondio el chat del cliente: ${content.slice(0, 140)}`
  });
  return state.chat_messages.filter((m) => m.client_id === clientId);
}

export async function getCsvClients(): Promise<string> {
  const expertDash = await getExpertDashboard();
  const rows = [
    ["Cliente", "Plan", "Pais", "Estado", "Salud", "ROAS", "Gasto mes", "Alertas activas"],
    ...expertDash.clients.map((row) => [
      row.client.business_name,
      row.client.plan_type,
      row.client.country,
      row.client.status,
      row.client.health_status,
      row.latestMetric?.roas.toString() ?? "0",
      row.monthSpend.toFixed(2),
      row.activeAlerts.length.toString()
    ])
  ];
  return rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
}

export function syncMetaMetrics(clientId: string, result: import("./meta-api").MetaSyncResult): { campaigns: import("@bia-ops/shared").Campaign[]; metrics: MetricDaily[] } {
  const state = getDemoState();
  const client = state.clients.find((c) => c.id === clientId);
  if (client) {
    client.last_meta_sync = new Date().toISOString();
    for (const metric of result.metrics) {
      if (!state.metrics_daily.find((m) => m.id === metric.id)) {
        state.metrics_daily.push(metric);
      }
    }
    for (const campaign of result.campaigns) {
      if (!state.campaigns.find((c) => c.id === campaign.id)) {
        state.campaigns.push(campaign);
      }
    }
  }
  return {
    campaigns: state.campaigns.filter((c) => c.client_id === clientId),
    metrics: state.metrics_daily
      .filter((m) => m.client_id === clientId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30)
  };
}

export interface ClientFormData {
  business_name: string;
  contact_name: string;
  email: string;
  whatsapp: string;
  country: string;
  plan_type: import("@bia-ops/shared").PlanType;
  plan_price: number;
  business_type: string;
  category: string;
  active_platforms: import("@bia-ops/shared").Platform[];
  meta_ad_account_id?: string;
  additional_notes?: string;
  // Extended briefing fields (from intake form)
  website?: string;
  product_description?: string;
  ideal_client?: string;
  monthly_sales_range?: string;
  monthly_ad_spend_range?: string;
  current_roas?: number;
  main_goal?: string;
  time_horizon?: string;
  main_problem?: string;
  has_stock?: boolean;
  has_meta_access?: boolean;
  has_google_access?: boolean;
  has_analytics?: boolean;
  has_shopify?: boolean;
  has_pixel?: boolean;
  has_conversion_data?: boolean;
  has_catalog?: boolean;
  has_creative_assets?: boolean;
  previous_agency_experience?: string;
  how_found_us?: string;
  briefing_complete?: boolean;
}

export async function addClient(data: ClientFormData): Promise<{ client: Client; onboarding: OnboardingChecklist }> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const client: Client = {
    id,
    created_at: now,
    plan_type: data.plan_type,
    plan_price: data.plan_price,
    billing_date: now,
    next_billing_date: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    health_status: "green",
    onboarding_step: 0,
    access_token: `tok-${id}-${Math.random().toString(36).slice(2)}`,
    status: "onboarding",
    business_name: data.business_name,
    contact_name: data.contact_name,
    email: data.email,
    whatsapp: data.whatsapp,
    country: data.country,
    business_type: data.business_type,
    category: data.category,
    product_description: data.product_description ?? "",
    ideal_client: data.ideal_client ?? "",
    monthly_sales_range: data.monthly_sales_range ?? "",
    monthly_ad_spend_range: data.monthly_ad_spend_range ?? "",
    active_platforms: data.active_platforms,
    current_roas: data.current_roas ?? 0,
    main_goal: data.main_goal ?? "",
    time_horizon: data.time_horizon ?? "",
    main_problem: data.main_problem ?? "",
    has_stock: data.has_stock ?? false,
    has_meta_access: data.has_meta_access ?? false,
    has_google_access: data.has_google_access ?? false,
    has_analytics: data.has_analytics ?? false,
    has_shopify: data.has_shopify ?? false,
    has_pixel: data.has_pixel ?? false,
    has_conversion_data: data.has_conversion_data ?? false,
    has_catalog: data.has_catalog ?? false,
    has_creative_assets: data.has_creative_assets ?? false,
    previous_agency_experience: data.previous_agency_experience ?? "",
    how_found_us: data.how_found_us ?? "manual",
    additional_notes: data.additional_notes,
    meta_ad_account_id: data.meta_ad_account_id,
    website: data.website
  };

  const onboarding: OnboardingChecklist = {
    id: `onb-${id}`,
    client_id: id,
    step_1_briefing: data.briefing_complete ?? false,
    step_1_briefing_at: data.briefing_complete ? now : undefined,
    step_2_meta_access: false,
    step_3_campaign_built: false,
    step_4_creatives_uploaded: false,
    step_5_pixel_verified: false,
    step_6_campaign_live: false,
    step_7_first_report_sent: false
  };

  if (isDemo()) {
    const state = getDemoState();
    state.clients.push(client);
    state.onboarding_checklist.push(onboarding);
    return { client, onboarding };
  }

  const supabase = requireAdmin();
  const { data: created, error } = await supabase
    .from("clients")
    .insert({
      id,
      plan_type: data.plan_type,
      plan_price: data.plan_price,
      billing_date: now,
      next_billing_date: client.next_billing_date,
      health_status: "green",
      onboarding_step: data.briefing_complete ? 1 : 0,
      status: "onboarding",
      business_name: data.business_name,
      contact_name: data.contact_name,
      email: data.email,
      whatsapp: data.whatsapp,
      country: data.country,
      business_type: data.business_type,
      category: data.category,
      product_description: data.product_description ?? "",
      ideal_client: data.ideal_client ?? "",
      monthly_sales_range: data.monthly_sales_range ?? "",
      monthly_ad_spend_range: data.monthly_ad_spend_range ?? "",
      current_roas: data.current_roas ?? 0,
      main_goal: data.main_goal ?? "",
      time_horizon: data.time_horizon ?? "",
      main_problem: data.main_problem ?? "",
      has_stock: data.has_stock ?? false,
      has_meta_access: data.has_meta_access ?? false,
      has_google_access: data.has_google_access ?? false,
      has_analytics: data.has_analytics ?? false,
      has_shopify: data.has_shopify ?? false,
      has_pixel: data.has_pixel ?? false,
      has_conversion_data: data.has_conversion_data ?? false,
      has_catalog: data.has_catalog ?? false,
      has_creative_assets: data.has_creative_assets ?? false,
      previous_agency_experience: data.previous_agency_experience ?? "",
      active_platforms: data.active_platforms,
      how_found_us: data.how_found_us ?? "manual",
      additional_notes: data.additional_notes ?? null,
      meta_ad_account_id: data.meta_ad_account_id ?? null,
      website: data.website ?? null
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await supabase.from("onboarding_checklists").insert({
    client_id: id,
    step_1_briefing: data.briefing_complete ?? false,
    step_1_briefing_at: data.briefing_complete ? now : null
  });

  const { data: tokenRows } = await supabase.rpc("create_client_access_token", { p_client_id: id });
  const rawToken = (tokenRows as Array<{ raw_token: string }> | null)?.[0]?.raw_token ?? "";

  const mappedClient = mapClient(created as Record<string, unknown>);
  mappedClient.access_token = rawToken;

  return { client: mappedClient, onboarding };
}

export function onboardingRows(items: OnboardingChecklist[]) {
  return items.map((item) => {
    const client = getClient(item.client_id);
    const progress = onboardingProgress(item);
    return {
      item,
      client,
      progress,
      pendingStep: nextOnboardingStep(item)
    };
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function severityWeight(severity: "red" | "yellow") {
  return severity === "red" ? 2 : 1;
}

function shouldEscalateMessage(content: string) {
  const normalized = content.toLowerCase();
  return [
    "cancelar",
    "quiero salir",
    "no funciona",
    "decepcionado",
    "dinero perdido",
    "devuelven",
    "quiero hablar",
    "cambiar estrategia",
    "bajaron mis ventas"
  ].some((keyword) => normalized.includes(keyword));
}

function buildAiReply(client: Client, latestMetric: MetricDaily | null, content: string, escalated: boolean) {
  if (escalated) {
    return "Esta es una buena pregunta y merece atencion personalizada. Ya le avise a tu gestor con el contexto de tu cuenta para que revise que accion tomar y te responda pronto.";
  }

  const roas = latestMetric?.roas ?? client.current_roas;
  const spend = latestMetric?.spend ?? 0;
  const frequency = latestMetric?.frequency ?? 0;
  const conversions = latestMetric?.conversions ?? 0;
  const mentionsBudget =
    content.toLowerCase().includes("presupuesto") || content.toLowerCase().includes("invertir");

  if (mentionsBudget) {
    return `Tu presupuesto va controlado. En la ultima lectura invertiste $${Math.round(spend).toLocaleString("es-CO")} y por cada $1 recuperaste $${roas.toFixed(2)}. Si ese retorno se mantiene, el equipo puede seguir escalando de forma gradual sin forzar la cuenta.`;
  }

  return `Ahora mismo tu cuenta esta generando un retorno de $${roas.toFixed(2)} por cada $1 invertido, con ${conversions} ventas estimadas en la ultima lectura. La frecuencia esta en ${frequency.toFixed(1)}, asi que el equipo la sigue mirando para rotar anuncios antes de que se fatigue la audiencia.`;
}

function nextOnboardingStep(item: OnboardingChecklist) {
  if (!item.step_1_briefing) return "Briefing pendiente";
  if (!item.step_2_meta_access) return "Acceso Meta";
  if (!item.step_3_campaign_built) return "Campana SaleADS";
  if (!item.step_4_creatives_uploaded) return "Creativos 100ads";
  if (!item.step_5_pixel_verified) return "Pixel";
  if (!item.step_6_campaign_live) return "Campana activa";
  if (!item.step_7_first_report_sent) return "Primer reporte";
  return "Completo";
}

function stepColumnName(step: number): string {
  const names: Record<number, string> = {
    1: "step_1_briefing",
    2: "step_2_meta_access",
    3: "step_3_campaign_built",
    4: "step_4_creatives_uploaded",
    5: "step_5_pixel_verified",
    6: "step_6_campaign_live",
    7: "step_7_first_report_sent"
  };
  return names[step] ?? `step_${step}`;
}

// ---------------------------------------------------------------------------
// Row mappers (Supabase → shared types)
// ---------------------------------------------------------------------------

function mapClient(row: Record<string, unknown>): Client {
  return {
    id: row.id as string,
    created_at: row.created_at as string,
    hotmart_order_id: row.hotmart_order_id as string | undefined,
    plan_type: row.plan_type as Client["plan_type"],
    plan_price: Number(row.plan_price),
    billing_date: row.billing_date as string,
    next_billing_date: row.next_billing_date as string,
    health_status: row.health_status as HealthStatus,
    onboarding_step: Number(row.onboarding_step),
    assigned_expert_id: row.assigned_expert_id as string | undefined,
    user_id: row.user_id as string | undefined,
    access_token: (row.primary_access_token_id ?? "") as string,
    status: row.status as Client["status"],
    business_name: row.business_name as string,
    contact_name: row.contact_name as string,
    email: row.email as string,
    whatsapp: row.whatsapp as string,
    country: row.country as string,
    website: row.website as string | undefined,
    business_type: row.business_type as string,
    category: row.category as string,
    product_description: row.product_description as string,
    ideal_client: row.ideal_client as string,
    monthly_sales_range: row.monthly_sales_range as string,
    monthly_ad_spend_range: row.monthly_ad_spend_range as string,
    active_platforms: (row.active_platforms as Client["active_platforms"]) ?? [],
    current_roas: Number(row.current_roas),
    main_goal: row.main_goal as string,
    time_horizon: row.time_horizon as string,
    main_problem: row.main_problem as string,
    has_stock: Boolean(row.has_stock),
    has_meta_access: Boolean(row.has_meta_access),
    has_google_access: Boolean(row.has_google_access),
    has_analytics: Boolean(row.has_analytics),
    has_shopify: Boolean(row.has_shopify),
    has_pixel: Boolean(row.has_pixel),
    has_conversion_data: Boolean(row.has_conversion_data),
    has_catalog: Boolean(row.has_catalog),
    has_creative_assets: Boolean(row.has_creative_assets),
    previous_agency_experience: row.previous_agency_experience as string,
    how_found_us: row.how_found_us as string,
    additional_notes: row.additional_notes as string | undefined,
    meta_ad_account_id: row.meta_ad_account_id as string | undefined,
    meta_access_token: row.meta_access_token as string | undefined,
    last_meta_sync: row.last_meta_sync as string | undefined
  };
}

function mapAlert(row: Record<string, unknown>): Alert {
  return {
    id: row.id as string,
    client_id: row.client_id as string,
    created_at: row.created_at as string,
    resolved_at: row.resolved_at as string | undefined,
    severity: row.severity as Alert["severity"],
    alert_type: row.alert_type as Alert["alert_type"],
    metric_affected: row.metric_affected as string,
    current_value: Number(row.current_value),
    benchmark_value: Number(row.benchmark_value),
    threshold_exceeded: row.threshold_exceeded as string,
    suggested_action: row.suggested_action as string,
    expert_notes: row.expert_notes as string | undefined,
    status: row.status as Alert["status"],
    resolved_by: row.resolved_by as string | undefined
  };
}

function mapActionLog(row: Record<string, unknown>): ActionLog {
  return {
    id: row.id as string,
    client_id: row.client_id as string,
    expert_id: row.expert_id as string,
    created_at: row.created_at as string,
    action_type: row.action_type as string,
    description: row.description as string,
    before_state: row.before_state as Record<string, unknown> | undefined,
    after_state: row.after_state as Record<string, unknown> | undefined,
    alert_id: row.alert_id as string | undefined
  };
}

function mapReport(row: Record<string, unknown>): Report {
  const topCreatives = ((row.report_top_creatives as unknown[]) ?? []).map((tc: unknown) => {
    const t = tc as Record<string, unknown>;
    return {
      id: (t.creative_id ?? "") as string,
      client_id: row.client_id as string,
      campaign_id: "",
      name: t.name as string,
      thumbnail_url: t.thumbnail_url as string,
      spend: Number(t.spend),
      roas: Number(t.roas),
      conversions: Number(t.conversions),
      status: t.status as "winner" | "watch" | "loser"
    };
  });

  return {
    id: row.id as string,
    client_id: row.client_id as string,
    created_at: row.created_at as string,
    period_start: row.period_start as string,
    period_end: row.period_end as string,
    report_type: row.report_type as Report["report_type"],
    total_spend: Number(row.total_spend),
    avg_roas: Number(row.avg_roas),
    total_reach: Number(row.total_reach),
    total_impressions: Number(row.total_impressions),
    top_creatives: topCreatives,
    recommendations: row.recommendations as string,
    pdf_url: row.pdf_url as string | undefined,
    sent_at: row.sent_at as string | undefined,
    sent_to_email: row.sent_to_email as string | undefined
  };
}
