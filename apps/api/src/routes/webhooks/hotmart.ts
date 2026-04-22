import { Router } from "express";
import { hotmartWebhookSchema } from "../../lib/schemas.js";
import { requireConfiguredSecret } from "../../lib/security.js";
import { store } from "../../lib/store.js";
import { sendWelcomeEmail } from "../../lib/email.js";

export const hotmartWebhookRouter = Router();

hotmartWebhookRouter.use(
  requireConfiguredSecret(() => process.env.HOTMART_WEBHOOK_SECRET, {
    label: "webhook de Hotmart",
    headerNames: ["x-hotmart-webhook-secret", "x-webhook-secret", "authorization"]
  })
);

hotmartWebhookRouter.post("/", (req, res) => {
  const parsed = hotmartWebhookSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      mensaje: "El payload de Hotmart no es válido",
      errores: parsed.error.flatten()
    });
  }

  const value = parsed.data;
  const productName = value.product_name ?? value.product;
  const result = store.registerHotmart({
    orderId: value.order_id ?? value.transaction ?? "sin-order-id",
    email: value.buyer_email ?? value.email ?? "sin-email@local",
    ...(value.buyer_name ? { buyerName: value.buyer_name } : {}),
    ...(productName ? { productName } : {}),
    ...(value.value !== undefined ? { value: value.value } : {}),
    ...(value.currency ? { currency: value.currency } : {}),
    ...(value.status ? { status: value.status } : {}),
    ...(value.client_id ? { clientId: value.client_id } : {}),
    ...(value.access_token ? { accessToken: value.access_token } : {})
  });

  const clientEmail = result.client.email;
  if (clientEmail && clientEmail !== "sin-email@local") {
    const dashboardUrl = process.env.DASHBOARD_URL ?? process.env.EXTERNAL_BASE_URL ?? "https://biaagency.co/dashboard";
    sendWelcomeEmail({
      to: clientEmail,
      clientName: result.client.contact_name,
      businessName: result.client.business_name,
      plan: result.client.plan_type,
      accessLink: `${dashboardUrl}?token=${result.client.access_token}`
    }).catch((err: unknown) => {
      console.error("[email] Error enviando bienvenida:", err instanceof Error ? err.message : err);
    });
  }

  return res.status(200).json({
    ok: true,
    mensaje: "Webhook de Hotmart procesado correctamente",
    data: {
      client_id: result.client.id,
      hotmart_order_id: result.client.hotmart_order_id,
      onboarding_step: result.client.onboarding_step,
      status: result.client.status,
      action_id: result.action.id
    }
  });
});
