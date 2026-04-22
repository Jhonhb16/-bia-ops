import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import { alertsRouter } from "../apps/api/src/routes/alerts/run-daily.ts";
import { healthRouter } from "../apps/api/src/routes/health.ts";
import { reportsRouter } from "../apps/api/src/routes/reports/generate.ts";
import { hotmartWebhookRouter } from "../apps/api/src/routes/webhooks/hotmart.ts";
import { onboardingWebhookRouter } from "../apps/api/src/routes/webhooks/onboarding.ts";

async function withApiServer(run: (baseUrl: string) => Promise<void>) {
  const app = express();
  app.use(express.json());
  app.use("/health", healthRouter);
  app.use("/webhooks/hotmart", hotmartWebhookRouter);
  app.use("/webhooks/onboarding", onboardingWebhookRouter);
  app.use("/alerts", alertsRouter);
  app.use("/reports", reportsRouter);

  const server = await new Promise<import("node:http").Server>((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    throw new Error("No se pudo abrir un puerto de prueba para la API");
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

export async function runApiTests() {
  await withApiServer(async (baseUrl) => {
    const healthResponse = await fetch(`${baseUrl}/health`);
    assert.equal(healthResponse.status, 200);
    const healthJson = (await healthResponse.json()) as {
      ok: boolean;
      mensaje: string;
      data: {
        status: string;
        snapshot: { healthy: boolean; clients: number; activeClients: number };
      };
    };
    assert.equal(healthJson.ok, true);
    assert.equal(healthJson.mensaje, "API operativa");
    assert.equal(healthJson.data.status, "healthy");
    assert.equal(healthJson.data.snapshot.healthy, true);
    assert.ok(healthJson.data.snapshot.clients >= 1);
    assert.ok(healthJson.data.snapshot.activeClients >= 1);

    const clientId = `test-client-${randomUUID()}`;
    const orderId = `HOT-${randomUUID().slice(0, 8).toUpperCase()}`;

    const hotmartResponse = await fetch(`${baseUrl}/webhooks/hotmart`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        order_id: orderId,
        buyer_email: "test@biaops.local",
        buyer_name: "Test Client",
        product_name: "Programa BIA OPS",
        value: 3200,
        currency: "USD",
        client_id: clientId,
        access_token: "local-token"
      })
    });

    assert.equal(hotmartResponse.status, 200);
    const hotmartJson = (await hotmartResponse.json()) as {
      ok: boolean;
      mensaje: string;
      data: { client_id: string; hotmart_order_id: string; onboarding_step: number; status: string };
    };
    assert.equal(hotmartJson.ok, true);
    assert.equal(hotmartJson.mensaje, "Webhook de Hotmart procesado correctamente");
    assert.equal(hotmartJson.data.client_id, clientId);
    assert.equal(hotmartJson.data.hotmart_order_id, orderId);
    assert.equal(hotmartJson.data.onboarding_step, 1);
    assert.equal(hotmartJson.data.status, "pending_onboarding");

    const onboardingResponse = await fetch(`${baseUrl}/webhooks/onboarding`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        step: 5,
        completed: true,
        notes: "Meta access and creative pack ready",
        expert_id: "user-expert"
      })
    });

    assert.equal(onboardingResponse.status, 200);
    const onboardingJson = (await onboardingResponse.json()) as {
      ok: boolean;
      mensaje: string;
      data: { client_id: string; onboarding_step: number; status: string; health_status: string; progress: number };
    };
    assert.equal(onboardingJson.ok, true);
    assert.equal(onboardingJson.mensaje, "Onboarding actualizado");
    assert.equal(onboardingJson.data.client_id, clientId);
    assert.equal(onboardingJson.data.onboarding_step, 5);
    assert.equal(onboardingJson.data.status, "onboarding");
    assert.equal(onboardingJson.data.health_status, "green");
    assert.equal(onboardingJson.data.progress, 5);
  });
}

export async function runApiSecurityContractTests() {
  const originalHotmartSecret = process.env.HOTMART_WEBHOOK_SECRET;
  const originalInternalSecret = process.env.INTERNAL_API_SECRET;

  try {
    delete process.env.HOTMART_WEBHOOK_SECRET;
    delete process.env.INTERNAL_API_SECRET;

    await withApiServer(async (baseUrl) => {
      const hotmartPayload = buildHotmartPayload();

      const localHotmart = await fetch(`${baseUrl}/webhooks/hotmart`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(hotmartPayload)
      });
      assert.equal(localHotmart.status, 200);

      const localAlertRun = await fetch(`${baseUrl}/alerts/run-daily`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });
      assert.equal(localAlertRun.status, 200);

      const localReport = await fetch(`${baseUrl}/reports/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client_id: "client-alpha",
          report_type: "custom"
        })
      });
      assert.equal(localReport.status, 200);
    });

    process.env.HOTMART_WEBHOOK_SECRET = "hotmart-test-secret";
    process.env.INTERNAL_API_SECRET = "internal-test-secret";

    await withApiServer(async (baseUrl) => {
      const hotmartPayload = buildHotmartPayload();

      const wrongSecretResponse = await fetch(`${baseUrl}/webhooks/hotmart`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-webhook-secret": "wrong-secret"
        },
        body: JSON.stringify(hotmartPayload)
      });
      assert.equal(wrongSecretResponse.status, 401);

      const correctSecretResponse = await fetch(`${baseUrl}/webhooks/hotmart`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-webhook-secret": process.env.HOTMART_WEBHOOK_SECRET
        },
        body: JSON.stringify({
          ...hotmartPayload,
          order_id: `HOT-${randomUUID().slice(0, 8).toUpperCase()}`
        })
      });
      assert.equal(correctSecretResponse.status, 200);

      const wrongAlertSecret = await fetch(`${baseUrl}/alerts/run-daily`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-secret": "wrong-secret"
        },
        body: JSON.stringify({})
      });
      assert.equal(wrongAlertSecret.status, 401);

      const wrongReportSecret = await fetch(`${baseUrl}/reports/generate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-secret": "wrong-secret"
        },
        body: JSON.stringify({
          client_id: "client-alpha",
          report_type: "custom"
        })
      });
      assert.equal(wrongReportSecret.status, 401);

      const okAlertSecret = await fetch(`${baseUrl}/alerts/run-daily`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-secret": process.env.INTERNAL_API_SECRET
        },
        body: JSON.stringify({})
      });
      assert.equal(okAlertSecret.status, 200);

      const okReportSecret = await fetch(`${baseUrl}/reports/generate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-secret": process.env.INTERNAL_API_SECRET
        },
        body: JSON.stringify({
          client_id: "client-alpha",
          report_type: "custom"
        })
      });
      assert.equal(okReportSecret.status, 200);
    });
  } finally {
    if (originalHotmartSecret === undefined) {
      delete process.env.HOTMART_WEBHOOK_SECRET;
    } else {
      process.env.HOTMART_WEBHOOK_SECRET = originalHotmartSecret;
    }

    if (originalInternalSecret === undefined) {
      delete process.env.INTERNAL_API_SECRET;
    } else {
      process.env.INTERNAL_API_SECRET = originalInternalSecret;
    }
  }
}

export function runEnvAliasContractTests() {
  const envModulePath = require.resolve("../apps/api/src/config/env.ts");
  const originalEnableCron = process.env.ENABLE_CRON;
  const originalEnableCronJobs = process.env.ENABLE_CRON_JOBS;

  try {
    delete require.cache[envModulePath];
    process.env.ENABLE_CRON = "true";
    delete process.env.ENABLE_CRON_JOBS;

    const cronAliasEnv = require(envModulePath) as { env: { ENABLE_CRON_JOBS: boolean } };
    assert.equal(cronAliasEnv.env.ENABLE_CRON_JOBS, true);
  } finally {
    delete require.cache[envModulePath];
    if (originalEnableCron === undefined) {
      delete process.env.ENABLE_CRON;
    } else {
      process.env.ENABLE_CRON = originalEnableCron;
    }

    if (originalEnableCronJobs === undefined) {
      delete process.env.ENABLE_CRON_JOBS;
    } else {
      process.env.ENABLE_CRON_JOBS = originalEnableCronJobs;
    }
  }
}

function buildHotmartPayload() {
  return {
    order_id: `HOT-${randomUUID().slice(0, 8).toUpperCase()}`,
    buyer_email: "secure@biaops.local",
    buyer_name: "Secure Client",
    product_name: "Programa BIA OPS",
    value: 3200,
    currency: "USD"
  };
}
