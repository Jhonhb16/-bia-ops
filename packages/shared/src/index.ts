export type UserRole = "ceo" | "expert" | "client";
export type PlanType = "sprint" | "escalado" | "enterprise";
export type HealthStatus = "green" | "yellow" | "red";
export type Platform = "meta" | "google" | "tiktok";
export type CampaignStatus = "active" | "paused" | "learning" | "ended";
export type AlertSeverity = "red" | "yellow";
export type AlertStatus = "active" | "resolved" | "escalated";
export type AlertType =
  | "roas_drop"
  | "cpa_spike"
  | "frequency"
  | "budget_exhausted"
  | "account_inactive"
  | "ctr_drop"
  | "no_action";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  avatar_url?: string;
  telegram_chat_id?: string;
  whatsapp_number?: string;
  created_at: string;
}

export interface Client {
  id: string;
  created_at: string;
  hotmart_order_id?: string;
  plan_type: PlanType;
  plan_price: number;
  billing_date: string;
  next_billing_date: string;
  health_status: HealthStatus;
  onboarding_step: number;
  assigned_expert_id?: string;
  user_id?: string;
  access_token: string;
  status: "pending_onboarding" | "onboarding" | "active" | "paused" | "churned";
  business_name: string;
  contact_name: string;
  email: string;
  whatsapp: string;
  country: string;
  website?: string;
  business_type: string;
  category: string;
  product_description: string;
  ideal_client: string;
  monthly_sales_range: string;
  monthly_ad_spend_range: string;
  active_platforms: Platform[];
  current_roas: number;
  main_goal: string;
  time_horizon: string;
  main_problem: string;
  has_stock: boolean;
  has_meta_access: boolean;
  has_google_access: boolean;
  has_analytics: boolean;
  has_shopify: boolean;
  has_pixel: boolean;
  has_conversion_data: boolean;
  has_catalog: boolean;
  has_creative_assets: boolean;
  previous_agency_experience: string;
  how_found_us: string;
  additional_notes?: string;
  meta_ad_account_id?: string;
  meta_access_token?: string;
  last_meta_sync?: string;
}

export interface Campaign {
  id: string;
  client_id: string;
  campaign_name: string;
  platform: Platform;
  status: CampaignStatus;
  objective: string;
  daily_budget: number;
  monthly_budget: number;
  start_date: string;
  created_at: string;
}

export interface MetricDaily {
  id: string;
  client_id: string;
  campaign_id?: string;
  date: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpc: number;
  roas: number;
  cpa: number;
  conversions: number;
  revenue_generated: number;
  frequency: number;
  quality_ranking?: string;
}

export interface Alert {
  id: string;
  client_id: string;
  created_at: string;
  resolved_at?: string;
  severity: AlertSeverity;
  alert_type: AlertType;
  metric_affected: string;
  current_value: number;
  benchmark_value: number;
  threshold_exceeded: string;
  suggested_action: string;
  expert_notes?: string;
  status: AlertStatus;
  resolved_by?: string;
}

export interface ActionLog {
  id: string;
  client_id: string;
  expert_id: string;
  created_at: string;
  action_type: string;
  description: string;
  before_state?: Record<string, unknown>;
  after_state?: Record<string, unknown>;
  alert_id?: string;
}

export interface Report {
  id: string;
  client_id: string;
  created_at: string;
  period_start: string;
  period_end: string;
  report_type: "biweekly" | "monthly" | "custom";
  total_spend: number;
  avg_roas: number;
  total_reach: number;
  total_impressions: number;
  top_creatives: Creative[];
  recommendations: string;
  pdf_url?: string;
  sent_at?: string;
  sent_to_email?: string;
}

export interface Creative {
  id: string;
  client_id: string;
  campaign_id: string;
  name: string;
  thumbnail_url: string;
  spend: number;
  roas: number;
  conversions: number;
  status: "winner" | "watch" | "loser";
}

export interface ChatMessage {
  id: string;
  client_id: string;
  created_at: string;
  role: "client" | "ai" | "expert";
  content: string;
  escalated_to_expert: boolean;
  expert_notified_at?: string;
  meta_context_snapshot?: Record<string, unknown>;
}

export interface OnboardingChecklist {
  id: string;
  client_id: string;
  step_1_briefing: boolean;
  step_1_briefing_at?: string;
  step_2_meta_access: boolean;
  step_2_meta_access_at?: string;
  step_3_campaign_built: boolean;
  step_3_campaign_built_at?: string;
  step_4_creatives_uploaded: boolean;
  step_4_creatives_uploaded_at?: string;
  step_5_pixel_verified: boolean;
  step_5_pixel_verified_at?: string;
  step_6_campaign_live: boolean;
  step_6_campaign_live_at?: string;
  step_7_first_report_sent: boolean;
  step_7_first_report_sent_at?: string;
}

export interface RevenueTracking {
  id: string;
  month: number;
  year: number;
  gross_revenue: number;
  hotmart_fee: number;
  bianca_commission: number;
  tools_cost: number;
  expert_salary: number;
  net_mario: number;
  total_clients: number;
  new_clients: number;
  churned_clients: number;
  retention_rate: number;
}

export const PLAN_LABELS: Record<PlanType, string> = {
  sprint: "Sprint",
  escalado: "Escalado",
  enterprise: "Enterprise"
};

export const PLAN_BUDGET_CAPS: Record<PlanType, number> = {
  sprint: 2000,
  escalado: 8000,
  enterprise: 20000
};

export const HEALTH_LABELS: Record<HealthStatus, string> = {
  green: "Saludable",
  yellow: "Atención",
  red: "Crítico"
};

export const ALERT_LABELS: Record<AlertType, string> = {
  roas_drop: "Caída de retorno",
  cpa_spike: "Costo por venta alto",
  frequency: "Frecuencia alta",
  budget_exhausted: "Presupuesto agotado",
  account_inactive: "Cuenta inactiva",
  ctr_drop: "Clics en caída",
  no_action: "Sin acción reciente"
};

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "percent",
    maximumFractionDigits: 1
  }).format(value);
}

export function daysBetween(from: string, to = new Date().toISOString()): number {
  const diff = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

export function calculateRevenue(clients: Client[], toolsCost = 191, expertSalary = 1200) {
  const activeClients = clients.filter((client) => client.status === "active" || client.status === "onboarding");
  const grossRevenue = activeClients.reduce((sum, client) => sum + client.plan_price, 0);
  const hotmartFee = grossRevenue * 0.1;
  const afterHotmart = grossRevenue - hotmartFee;
  const biancaCommission = afterHotmart * 0.35;
  const netMario = afterHotmart - biancaCommission - toolsCost - expertSalary;

  return {
    grossRevenue,
    hotmartFee,
    biancaCommission,
    toolsCost,
    expertSalary,
    netMario,
    activeClients: activeClients.length
  };
}

export function onboardingProgress(checklist: OnboardingChecklist): number {
  const steps = [
    checklist.step_1_briefing,
    checklist.step_2_meta_access,
    checklist.step_3_campaign_built,
    checklist.step_4_creatives_uploaded,
    checklist.step_5_pixel_verified,
    checklist.step_6_campaign_live,
    checklist.step_7_first_report_sent
  ];
  return steps.filter(Boolean).length;
}
