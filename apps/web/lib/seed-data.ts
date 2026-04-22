import type {
  ActionLog,
  Alert,
  Campaign,
  ChatMessage,
  Client,
  Creative,
  MetricDaily,
  OnboardingChecklist,
  Report,
  RevenueTracking,
  User
} from "@bia-ops/shared";

const now = new Date();
const iso = (daysAgo: number, hour = 9) => {
  const date = new Date(now);
  date.setDate(now.getDate() - daysAgo);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

export function createSeedState() {
  const users: User[] = [
    {
      id: "user-ceo",
      email: "mario@biaagency.com",
      role: "ceo",
      full_name: "Mario Hernandez",
      whatsapp_number: "+573000000001",
      created_at: iso(120)
    },
    {
      id: "user-expert",
      email: "expert@biaagency.com",
      role: "expert",
      full_name: "Equipo de performance",
      telegram_chat_id: "demo-expert-chat",
      whatsapp_number: "+573000000002",
      created_at: iso(90)
    },
    {
      id: "user-demo-fit",
      email: "operaciones@fitandgo.co",
      role: "client",
      full_name: "Valentina Rojas",
      created_at: iso(31)
    }
  ];

  const clients: Client[] = [
    {
      id: "demo-fit",
      created_at: iso(31),
      hotmart_order_id: "HOT-10421",
      plan_type: "escalado",
      plan_price: 650,
      billing_date: iso(31),
      next_billing_date: iso(-1),
      health_status: "green",
      onboarding_step: 7,
      assigned_expert_id: "user-expert",
      user_id: "user-demo-fit",
      access_token: "fit-and-go",
      status: "active",
      business_name: "Fit&Go Colombia",
      contact_name: "Valentina Rojas",
      email: "operaciones@fitandgo.co",
      whatsapp: "+573014441122",
      country: "Colombia",
      website: "https://fitandgo.co",
      business_type: "E-commerce",
      category: "Suplementos fitness",
      product_description: "Proteinas, creatinas y snacks saludables para deportistas urbanos.",
      ideal_client: "Hombres y mujeres de 22 a 38 anos que entrenan 3+ veces por semana.",
      monthly_sales_range: "$25,000 - $40,000",
      monthly_ad_spend_range: "$7,000 - $10,000",
      active_platforms: ["meta", "google", "tiktok"],
      current_roas: 4.8,
      main_goal: "Escalar ventas sin romper rentabilidad.",
      time_horizon: "90 dias",
      main_problem: "Los creativos ganadores se fatigan rapido.",
      has_stock: true,
      has_meta_access: true,
      has_google_access: true,
      has_analytics: true,
      has_shopify: true,
      has_pixel: true,
      has_conversion_data: true,
      has_catalog: true,
      has_creative_assets: true,
      previous_agency_experience: "Trabajo con una agencia local durante 6 meses.",
      how_found_us: "Recomendacion de Bianca",
      additional_notes: "Priorizar bundles de creatina y proteina.",
      meta_ad_account_id: "act_293001",
      last_meta_sync: iso(0, 8)
    },
    {
      id: "demo-luna",
      created_at: iso(18),
      hotmart_order_id: "HOT-10478",
      plan_type: "sprint",
      plan_price: 280,
      billing_date: iso(18),
      next_billing_date: iso(-12),
      health_status: "yellow",
      onboarding_step: 6,
      assigned_expert_id: "user-expert",
      access_token: "luna-demo",
      status: "active",
      business_name: "Luna Botanica",
      contact_name: "Camila Torres",
      email: "hola@lunabotanica.ec",
      whatsapp: "+593991112233",
      country: "Ecuador",
      website: "https://lunabotanica.ec",
      business_type: "E-commerce",
      category: "Cosmetica natural",
      product_description: "Rutinas de skincare natural para piel sensible.",
      ideal_client: "Mujeres de 25 a 45 anos interesadas en belleza limpia.",
      monthly_sales_range: "$8,000 - $14,000",
      monthly_ad_spend_range: "$1,500 - $2,000",
      active_platforms: ["meta"],
      current_roas: 2.7,
      main_goal: "Subir ventas de kits mensuales.",
      time_horizon: "60 dias",
      main_problem: "Muchos clics, pocas compras.",
      has_stock: true,
      has_meta_access: true,
      has_google_access: false,
      has_analytics: true,
      has_shopify: false,
      has_pixel: true,
      has_conversion_data: true,
      has_catalog: true,
      has_creative_assets: false,
      previous_agency_experience: "Nunca ha trabajado con agencia.",
      how_found_us: "Instagram de Bianca",
      meta_ad_account_id: "act_293002",
      last_meta_sync: iso(0, 8)
    },
    {
      id: "demo-casa",
      created_at: iso(42),
      hotmart_order_id: "HOT-10381",
      plan_type: "sprint",
      plan_price: 280,
      billing_date: iso(42),
      next_billing_date: iso(-18),
      health_status: "red",
      onboarding_step: 6,
      assigned_expert_id: "user-expert",
      access_token: "casa-norte",
      status: "active",
      business_name: "Casa Norte",
      contact_name: "Andres Molina",
      email: "ventas@casanorte.mx",
      whatsapp: "+525511112222",
      country: "Mexico",
      website: "https://casanorte.mx",
      business_type: "E-commerce",
      category: "Decoracion hogar",
      product_description: "Lamparas, mesas auxiliares y decoracion minimalista.",
      ideal_client: "Parejas jovenes amoblando su primer apartamento.",
      monthly_sales_range: "$12,000 - $18,000",
      monthly_ad_spend_range: "$2,000 - $2,500",
      active_platforms: ["meta"],
      current_roas: 1.8,
      main_goal: "Recuperar rentabilidad en campanas de catalogo.",
      time_horizon: "45 dias",
      main_problem: "Costo por compra subio y el ticket promedio bajo.",
      has_stock: true,
      has_meta_access: true,
      has_google_access: false,
      has_analytics: true,
      has_shopify: true,
      has_pixel: true,
      has_conversion_data: true,
      has_catalog: true,
      has_creative_assets: true,
      previous_agency_experience: "Dos freelancers anteriores.",
      how_found_us: "Referido",
      meta_ad_account_id: "act_293003",
      last_meta_sync: iso(0, 8)
    },
    {
      id: "demo-nova",
      created_at: iso(7),
      hotmart_order_id: "HOT-10516",
      plan_type: "enterprise",
      plan_price: 1200,
      billing_date: iso(7),
      next_billing_date: iso(-23),
      health_status: "yellow",
      onboarding_step: 4,
      assigned_expert_id: "user-expert",
      access_token: "nova-lab",
      status: "onboarding",
      business_name: "Nova Lab",
      contact_name: "Sofia Herrera",
      email: "growth@novalab.us",
      whatsapp: "+17865550123",
      country: "Estados Unidos",
      website: "https://novalab.us",
      business_type: "DTC",
      category: "Biohacking",
      product_description: "Suplementos premium para foco, sueno y energia.",
      ideal_client: "Profesionales de alto rendimiento entre 30 y 48 anos.",
      monthly_sales_range: "$60,000 - $90,000",
      monthly_ad_spend_range: "$15,000+",
      active_platforms: ["meta", "google", "tiktok"],
      current_roas: 3.2,
      main_goal: "Preparar expansion omnicanal.",
      time_horizon: "120 dias",
      main_problem: "Medicion inconsistente entre plataformas.",
      has_stock: true,
      has_meta_access: true,
      has_google_access: true,
      has_analytics: true,
      has_shopify: true,
      has_pixel: true,
      has_conversion_data: true,
      has_catalog: false,
      has_creative_assets: true,
      previous_agency_experience: "Agencia internacional con poca velocidad creativa.",
      how_found_us: "LinkedIn",
      additional_notes: "Cliente sensible a reporting ejecutivo."
    },
    {
      id: "demo-palma",
      created_at: iso(3),
      hotmart_order_id: "HOT-10540",
      plan_type: "sprint",
      plan_price: 280,
      billing_date: iso(3),
      next_billing_date: iso(-27),
      health_status: "yellow",
      onboarding_step: 2,
      assigned_expert_id: "user-expert",
      access_token: "palma-studio",
      status: "onboarding",
      business_name: "Palma Studio",
      contact_name: "Lucia Vera",
      email: "lucia@palmastudio.pe",
      whatsapp: "+51991112233",
      country: "Peru",
      website: "https://palmastudio.pe",
      business_type: "E-commerce",
      category: "Ropa resort",
      product_description: "Vestidos y sets de lino para clima calido.",
      ideal_client: "Mujeres de 24 a 40 anos que viajan y compran moda premium.",
      monthly_sales_range: "$5,000 - $8,000",
      monthly_ad_spend_range: "$900 - $1,400",
      active_platforms: ["meta"],
      current_roas: 0,
      main_goal: "Lanzar primera estructura rentable.",
      time_horizon: "30 dias",
      main_problem: "No sabe que creativos usar.",
      has_stock: true,
      has_meta_access: true,
      has_google_access: false,
      has_analytics: false,
      has_shopify: true,
      has_pixel: false,
      has_conversion_data: false,
      has_catalog: false,
      has_creative_assets: true,
      previous_agency_experience: "Sin experiencia previa.",
      how_found_us: "TikTok"
    }
  ];

  const campaigns: Campaign[] = clients
    .filter((client) => client.onboarding_step >= 6)
    .flatMap((client, index) => [
      {
        id: `${client.id}-meta-scale`,
        client_id: client.id,
        campaign_name: `Meta | ${client.business_name} | Conversiones`,
        platform: "meta",
        status: index === 2 ? "learning" : "active",
        objective: "Ventas",
        daily_budget: client.plan_type === "sprint" ? 65 : 260,
        monthly_budget: client.plan_type === "sprint" ? 2000 : 8000,
        start_date: iso(20 - index),
        created_at: iso(21 - index)
      }
    ]);

  const metrics_daily: MetricDaily[] = campaigns.flatMap((campaign, campaignIndex) =>
    Array.from({ length: 30 }, (_, offset) => {
      const day = 29 - offset;
      const baseRoas = campaign.client_id === "demo-casa" ? 1.9 : campaign.client_id === "demo-luna" ? 2.8 : 4.4;
      const trend = campaign.client_id === "demo-casa" ? -0.028 * offset : 0.012 * offset;
      const roas = Math.max(1.1, Number((baseRoas + trend + (offset % 4) * 0.08).toFixed(2)));
      const spend = campaign.daily_budget * (0.82 + (offset % 5) * 0.04);
      const conversions = Math.max(3, Math.round((spend * roas) / (campaign.client_id === "demo-fit" ? 48 : 72)));
      const clicks = Math.round(spend * (campaign.client_id === "demo-casa" ? 9 : 14));
      const impressions = clicks * (campaign.client_id === "demo-casa" ? 88 : 70);
      return {
        id: `${campaign.id}-${day}`,
        client_id: campaign.client_id,
        campaign_id: campaign.id,
        date: iso(day, 6),
        spend: Number(spend.toFixed(2)),
        impressions,
        reach: Math.round(impressions / (1.35 + campaignIndex * 0.2)),
        clicks,
        ctr: Number(((clicks / impressions) * 100).toFixed(2)),
        cpm: Number(((spend / impressions) * 1000).toFixed(2)),
        cpc: Number((spend / clicks).toFixed(2)),
        roas,
        cpa: Number((spend / conversions).toFixed(2)),
        conversions,
        revenue_generated: Number((spend * roas).toFixed(2)),
        frequency: Number((1.7 + (offset % 7) * 0.38 + (campaign.client_id === "demo-luna" ? 0.8 : 0)).toFixed(2)),
        quality_ranking: offset % 6 === 0 ? "Promedio" : "Superior al promedio"
      };
    })
  );

  const alerts: Alert[] = [
    {
      id: "alert-casa-roas",
      client_id: "demo-casa",
      created_at: iso(2, 10),
      severity: "red",
      alert_type: "roas_drop",
      metric_affected: "Retorno",
      current_value: 1.8,
      benchmark_value: 3.1,
      threshold_exceeded: "-42% vs promedio de 7 dias",
      suggested_action: "Revisar segmentacion, pausar conjuntos con costo alto y rotar creativos de catalogo.",
      status: "active"
    },
    {
      id: "alert-luna-frequency",
      client_id: "demo-luna",
      created_at: iso(1, 13),
      severity: "yellow",
      alert_type: "frequency",
      metric_affected: "Frecuencia",
      current_value: 4.1,
      benchmark_value: 3.5,
      threshold_exceeded: "+17% sobre limite operativo",
      suggested_action: "Generar nuevos angulos en 100ads y reemplazar los dos anuncios con fatiga.",
      status: "active"
    },
    {
      id: "alert-palma-onboarding",
      client_id: "demo-palma",
      created_at: iso(0, 9),
      severity: "yellow",
      alert_type: "no_action",
      metric_affected: "Onboarding",
      current_value: 3,
      benchmark_value: 2,
      threshold_exceeded: "3 dias sin avance",
      suggested_action: "Confirmar pixel y catalogo con la clienta para desbloquear la estructura inicial.",
      status: "active"
    }
  ];

  const creatives: Creative[] = [
    {
      id: "creative-fit-1",
      client_id: "demo-fit",
      campaign_id: "demo-fit-meta-scale",
      name: "Bundle Creatina | Prueba social",
      thumbnail_url: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=640&q=80",
      spend: 920,
      roas: 6.1,
      conversions: 118,
      status: "winner"
    },
    {
      id: "creative-fit-2",
      client_id: "demo-fit",
      campaign_id: "demo-fit-meta-scale",
      name: "Snack proteico | Objecion precio",
      thumbnail_url: "https://images.unsplash.com/photo-1550345332-09e3ac987658?auto=format&fit=crop&w=640&q=80",
      spend: 640,
      roas: 4.9,
      conversions: 74,
      status: "winner"
    },
    {
      id: "creative-luna-1",
      client_id: "demo-luna",
      campaign_id: "demo-luna-meta-scale",
      name: "Rutina piel sensible | Antes y despues",
      thumbnail_url: "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=640&q=80",
      spend: 310,
      roas: 3.2,
      conversions: 28,
      status: "watch"
    },
    {
      id: "creative-casa-1",
      client_id: "demo-casa",
      campaign_id: "demo-casa-meta-scale",
      name: "Lampara nordica | Catalogo dinamico",
      thumbnail_url: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=640&q=80",
      spend: 540,
      roas: 1.4,
      conversions: 16,
      status: "loser"
    }
  ];

  const action_log: ActionLog[] = [
    {
      id: "act-fit-1",
      client_id: "demo-fit",
      expert_id: "user-expert",
      created_at: iso(0, 11),
      action_type: "Optimizacion",
      description: "Se aumento presupuesto 18% en el conjunto ganador de bundle creatina.",
      before_state: { daily_budget: 220 },
      after_state: { daily_budget: 260 }
    },
    {
      id: "act-luna-1",
      client_id: "demo-luna",
      expert_id: "user-expert",
      created_at: iso(2, 16),
      action_type: "Creativos",
      description: "Se pausaron anuncios con frecuencia alta y se prepararon nuevos angulos para 100ads.",
      alert_id: "alert-luna-frequency"
    },
    {
      id: "act-casa-1",
      client_id: "demo-casa",
      expert_id: "user-expert",
      created_at: iso(6, 12),
      action_type: "Revision",
      description: "Se reviso catalogo y se detectaron productos con margen bajo empujando el costo.",
      before_state: { roas: 2.4 },
      after_state: { roas: 2.1 }
    }
  ];

  const onboarding_checklist: OnboardingChecklist[] = clients.map((client) => ({
    id: `onboarding-${client.id}`,
    client_id: client.id,
    step_1_briefing: client.onboarding_step >= 1,
    step_1_briefing_at: client.onboarding_step >= 1 ? iso(Math.max(1, 31 - client.onboarding_step)) : undefined,
    step_2_meta_access: client.onboarding_step >= 2,
    step_2_meta_access_at: client.onboarding_step >= 2 ? iso(Math.max(1, 29 - client.onboarding_step)) : undefined,
    step_3_campaign_built: client.onboarding_step >= 3,
    step_3_campaign_built_at: client.onboarding_step >= 3 ? iso(Math.max(1, 27 - client.onboarding_step)) : undefined,
    step_4_creatives_uploaded: client.onboarding_step >= 4,
    step_4_creatives_uploaded_at: client.onboarding_step >= 4 ? iso(Math.max(1, 26 - client.onboarding_step)) : undefined,
    step_5_pixel_verified: client.onboarding_step >= 5,
    step_5_pixel_verified_at: client.onboarding_step >= 5 ? iso(Math.max(1, 25 - client.onboarding_step)) : undefined,
    step_6_campaign_live: client.onboarding_step >= 6,
    step_6_campaign_live_at: client.onboarding_step >= 6 ? iso(Math.max(1, 24 - client.onboarding_step)) : undefined,
    step_7_first_report_sent: client.onboarding_step >= 7,
    step_7_first_report_sent_at: client.onboarding_step >= 7 ? iso(5) : undefined
  }));

  const reports: Report[] = [
    {
      id: "report-fit-apr",
      client_id: "demo-fit",
      created_at: iso(5),
      period_start: iso(19),
      period_end: iso(5),
      report_type: "biweekly",
      total_spend: 3820,
      avg_roas: 4.8,
      total_reach: 182000,
      total_impressions: 291000,
      top_creatives: creatives.filter((creative) => creative.client_id === "demo-fit"),
      recommendations: "Mantener escala gradual y abrir test de UGC para evitar fatiga en 10 dias.",
      pdf_url: "/reportes/demo-fit-apr.pdf",
      sent_at: iso(5),
      sent_to_email: "operaciones@fitandgo.co"
    }
  ];

  const chat_messages: ChatMessage[] = [
    {
      id: "chat-1",
      client_id: "demo-fit",
      created_at: iso(1, 15),
      role: "client",
      content: "Veo mas ventas esta semana. El presupuesto actual aguanta para escalar?",
      escalated_to_expert: false
    },
    {
      id: "chat-2",
      client_id: "demo-fit",
      created_at: iso(1, 15),
      role: "ai",
      content:
        "Si. Esta semana por cada $1 invertido recuperaste $4.80 y el conjunto principal mantiene costo estable. El equipo ya subio presupuesto de forma gradual para no forzar el aprendizaje.",
      escalated_to_expert: false
    }
  ];

  const revenue_tracking: RevenueTracking[] = [
    {
      id: "rev-2026-04",
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      gross_revenue: 2690,
      hotmart_fee: 269,
      bianca_commission: 847.35,
      tools_cost: 191,
      expert_salary: 1200,
      net_mario: 182.65,
      total_clients: clients.length,
      new_clients: 2,
      churned_clients: 0,
      retention_rate: 0.96
    }
  ];

  return {
    users,
    clients,
    campaigns,
    metrics_daily,
    alerts,
    creatives,
    action_log,
    onboarding_checklist,
    reports,
    chat_messages,
    revenue_tracking
  };
}
