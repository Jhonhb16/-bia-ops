import assert from "node:assert/strict";
import { calculateRevenue, onboardingProgress, type Client, type OnboardingChecklist } from "@bia-ops/shared/src/index.ts";

export function runSharedTests() {
  const clients: Client[] = [
    {
      id: "client-active",
      created_at: "2026-04-01T00:00:00.000Z",
      plan_type: "escalado",
      plan_price: 5000,
      billing_date: "2026-04-01T00:00:00.000Z",
      next_billing_date: "2026-05-01T00:00:00.000Z",
      health_status: "green",
      onboarding_step: 7,
      access_token: "active-token",
      status: "active",
      business_name: "Active Client",
      contact_name: "Ana",
      email: "ana@example.com",
      whatsapp: "+573000000000",
      country: "Colombia",
      business_type: "E-commerce",
      category: "Beauty",
      product_description: "Dermocosmetics",
      ideal_client: "Mujeres adultas",
      monthly_sales_range: "USD 10k - 20k",
      monthly_ad_spend_range: "USD 2k - 4k",
      active_platforms: ["meta"],
      current_roas: 2.4,
      main_goal: "Escalar",
      time_horizon: "90 dias",
      main_problem: "Sin problema",
      has_stock: true,
      has_meta_access: true,
      has_google_access: false,
      has_analytics: true,
      has_shopify: true,
      has_pixel: true,
      has_conversion_data: true,
      has_catalog: true,
      has_creative_assets: true,
      previous_agency_experience: "Si",
      how_found_us: "Referido"
    },
    {
      id: "client-onboarding",
      created_at: "2026-04-02T00:00:00.000Z",
      plan_type: "sprint",
      plan_price: 2000,
      billing_date: "2026-04-02T00:00:00.000Z",
      next_billing_date: "2026-05-02T00:00:00.000Z",
      health_status: "yellow",
      onboarding_step: 3,
      access_token: "onboarding-token",
      status: "onboarding",
      business_name: "Onboarding Client",
      contact_name: "Luis",
      email: "luis@example.com",
      whatsapp: "+573111111111",
      country: "Mexico",
      business_type: "Servicios",
      category: "Educacion",
      product_description: "Cursos",
      ideal_client: "Profesionales",
      monthly_sales_range: "USD 5k - 10k",
      monthly_ad_spend_range: "USD 1k - 2k",
      active_platforms: ["meta", "google"],
      current_roas: 1.6,
      main_goal: "Arrancar",
      time_horizon: "30 dias",
      main_problem: "Falta de estructura",
      has_stock: true,
      has_meta_access: false,
      has_google_access: false,
      has_analytics: true,
      has_shopify: false,
      has_pixel: false,
      has_conversion_data: false,
      has_catalog: false,
      has_creative_assets: false,
      previous_agency_experience: "No",
      how_found_us: "Hotmart"
    },
    {
      id: "client-paused",
      created_at: "2026-04-03T00:00:00.000Z",
      plan_type: "enterprise",
      plan_price: 12000,
      billing_date: "2026-04-03T00:00:00.000Z",
      next_billing_date: "2026-05-03T00:00:00.000Z",
      health_status: "red",
      onboarding_step: 1,
      access_token: "paused-token",
      status: "paused",
      business_name: "Paused Client",
      contact_name: "Maria",
      email: "maria@example.com",
      whatsapp: "+573222222222",
      country: "Chile",
      business_type: "DTC",
      category: "Food",
      product_description: "Supplements",
      ideal_client: "Consumidores recurrentes",
      monthly_sales_range: "USD 20k - 50k",
      monthly_ad_spend_range: "USD 5k - 12k",
      active_platforms: ["meta"],
      current_roas: 0.9,
      main_goal: "Mantener",
      time_horizon: "60 dias",
      main_problem: "Baja rentabilidad",
      has_stock: true,
      has_meta_access: true,
      has_google_access: true,
      has_analytics: true,
      has_shopify: true,
      has_pixel: true,
      has_conversion_data: true,
      has_catalog: true,
      has_creative_assets: true,
      previous_agency_experience: "Si",
      how_found_us: "LinkedIn"
    }
  ];

  const result = calculateRevenue(clients, 100, 200);

  assert.equal(result.activeClients, 2);
  assert.equal(result.grossRevenue, 7000);
  assert.equal(result.hotmartFee, 700);
  assert.equal(result.biancaCommission, 2205);
  assert.equal(result.toolsCost, 100);
  assert.equal(result.expertSalary, 200);
  assert.equal(result.netMario, 3795);

  const checklist: OnboardingChecklist = {
    id: "onboarding-test",
    client_id: "client-test",
    step_1_briefing: true,
    step_1_briefing_at: "2026-04-01T00:00:00.000Z",
    step_2_meta_access: false,
    step_3_campaign_built: true,
    step_4_creatives_uploaded: true,
    step_5_pixel_verified: false,
    step_6_campaign_live: true,
    step_7_first_report_sent: false
  };

  assert.equal(onboardingProgress(checklist), 4);
}
