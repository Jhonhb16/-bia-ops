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

  return {
    campaigns: dashboard.campaigns,
    metrics: dashboard.metrics.slice(-1),
    mode: "live"
  };
}
