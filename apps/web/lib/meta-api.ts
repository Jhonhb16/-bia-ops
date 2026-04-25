import type { Campaign, MetricDaily } from "@bia-ops/shared";
import { getClientDashboard } from "./data-store";

const GRAPH_VERSION = "v20.0";

export interface MetaSyncResult {
  campaigns: Campaign[];
  metrics: MetricDaily[];
  mode: "live" | "demo";
}

export async function syncMetaClient(clientId: string): Promise<MetaSyncResult> {
  const dashboard = await getClientDashboard(clientId);
  if (!dashboard) throw new Error("Cliente no encontrado");

  if (!dashboard.client.meta_ad_account_id || !dashboard.client.meta_access_token) {
    return {
      campaigns: dashboard.campaigns,
      metrics: dashboard.metrics.slice(-7),
      mode: "demo"
    };
  }

  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${dashboard.client.meta_ad_account_id}/insights`);
  url.searchParams.set("fields", "spend,impressions,reach,clicks,ctr,cpm,cpc,frequency,actions,action_values");
  url.searchParams.set("date_preset", "today");
  url.searchParams.set("access_token", dashboard.client.meta_access_token);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Meta Ads API respondio ${response.status}`);
  }

  type MetaInsightRow = {
    date_start?: string;
    spend?: string;
    impressions?: string;
    reach?: string;
    clicks?: string;
    ctr?: string;
    cpm?: string;
    cpc?: string;
    frequency?: string;
    actions?: Array<{ action_type: string; value: string }>;
    action_values?: Array<{ action_type: string; value: string }>;
  };

  const json = (await response.json()) as { data?: MetaInsightRow[] };
  const today = new Date().toISOString().slice(0, 10);

  const parsed: MetricDaily[] = (json.data ?? []).map((row) => {
    const spend = Number(row.spend ?? 0);
    const conversions = Number(
      row.actions?.find((a) => a.action_type === "purchase")?.value ?? 0
    );
    const revenue = Number(
      row.action_values?.find((a) => a.action_type === "purchase")?.value ?? 0
    );
    return {
      id: `meta-${row.date_start ?? today}-${clientId}`,
      client_id: clientId,
      date: row.date_start ?? today,
      spend,
      impressions: Number(row.impressions ?? 0),
      reach: Number(row.reach ?? 0),
      clicks: Number(row.clicks ?? 0),
      ctr: Number(row.ctr ?? 0),
      cpm: Number(row.cpm ?? 0),
      cpc: Number(row.cpc ?? 0),
      roas: spend > 0 ? revenue / spend : 0,
      cpa: conversions > 0 ? spend / conversions : 0,
      conversions,
      revenue_generated: revenue,
      frequency: Number(row.frequency ?? 0)
    };
  });

  return {
    campaigns: dashboard.campaigns,
    metrics: parsed.length > 0 ? parsed : dashboard.metrics.slice(-1),
    mode: "live"
  };
}
