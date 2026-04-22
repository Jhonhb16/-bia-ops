import { Router } from "express";
import { onboardingWebhookSchema } from "../../lib/schemas.js";
import { requireConfiguredSecret } from "../../lib/security.js";
import { store } from "../../lib/store.js";

export const onboardingWebhookRouter = Router();

onboardingWebhookRouter.use(
  requireConfiguredSecret(
    () =>
      process.env.ONBOARDING_WEBHOOK_SECRET ??
      process.env.INTERNAL_API_SECRET ??
      process.env.API_INTERNAL_SECRET ??
      process.env.API_SECRET ??
      process.env.INTERNAL_SECRET,
    {
    label: "webhook de onboarding",
    headerNames: ["x-onboarding-webhook-secret", "x-webhook-secret", "authorization"]
    }
  )
);

onboardingWebhookRouter.post("/", (req, res) => {
  const parsed = onboardingWebhookSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      mensaje: "El payload de onboarding no es válido",
      errores: parsed.error.flatten()
    });
  }

  const result = store.registerOnboarding(
    parsed.data.client_id,
    parsed.data.step,
    parsed.data.completed,
    parsed.data.notes,
    parsed.data.expert_id
  );

  return res.status(200).json({
    ok: true,
    mensaje: "Onboarding actualizado",
    data: {
      client_id: result.client.id,
      onboarding_step: result.client.onboarding_step,
      status: result.client.status,
      health_status: result.client.health_status,
      progress: result.progress
    }
  });
});
